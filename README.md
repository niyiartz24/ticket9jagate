# TicketGate

A production-oriented PWA for event gate staff to scan, verify, and check in
tickets. Tickets themselves are issued by **BudPay** — this application does
not generate tickets. It scans the QR/barcode BudPay printed on the ticket,
extracts the ticket code, and verifies it against an authoritative source
before allowing check-in.

## Status of the BudPay integration

**Not yet connected.** The exact BudPay ticket-verification API (endpoints,
auth scheme, payload shape) has not been supplied. The app currently runs
against `MockTicketProvider`, a fixed in-memory dataset used for development
only (see `src/lib/integrations/mock/mock-provider.ts`).

The integration is built as a swappable adapter so this can change without
touching the scanner, the check-in transaction, or the offline sync logic:

- `src/lib/integrations/ticket-provider.ts` — the interface every provider implements
- `src/lib/integrations/budpay/budpay-provider.ts` — the real adapter, currently a structural stub that throws a clear error rather than fabricating a response
- `src/lib/integrations/budpay/README.md` — the exact list of information needed from BudPay/the client before this can be implemented
- `src/lib/integrations/provider-factory.ts` — the single place that decides which provider is active, based on environment variables

Once BudPay's API details are confirmed, only `budpay-provider.ts` needs
real implementation — nothing else in the app changes.

## Getting started

```bash
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET, CONFIG_ENCRYPTION_KEY at minimum

npm install
npm run db:migrate   # creates the schema
npm run db:seed      # creates a sample admin, staff, event, and two mock tickets
npm run dev
```

Seeded accounts (change immediately in a real deployment):
- Admin: `admin@ticketgate.local` / `ChangeMe123!`
- Staff: `staff@ticketgate.local` / `ChangeMe123!`

With `USE_MOCK_TICKET_PROVIDER=true` (the default until BudPay is
configured), scanning or manually entering `TKT6AADE8AEA15A2` or
`TKT7XYZ123456789` exercises the full verify → check-in flow end to end.

## Architecture at a glance

```
Scanner PWA (camera / manual entry)
        ↓
POST /api/tickets/verify        — read-only lookup, upserts local cache
POST /api/tickets/check-in      — the only path that mutates check-in state
        ↓
runCheckIn() (src/lib/db/check-in-transaction.ts)
        ↓ single atomic Postgres transaction, row-locked
Ticket + CheckIn tables (system of record for duplicate prevention)
```

- **Auth**: signed JWT in an httpOnly cookie (`src/lib/auth/session.ts`). Role
  and identity are only ever read server-side — never trusted from the client.
- **Duplicate prevention**: enforced inside a single database transaction
  with row-level locking (`SELECT ... FOR UPDATE`), not just in the UI.
- **Offline mode**: `src/lib/offline/` — Dexie/IndexedDB caches ticket data
  and queues scans locally. Queued scans are replayed through the *same*
  `runCheckIn()` transaction once connectivity returns (`/api/sync`), so
  there is exactly one code path that can mark a ticket checked-in, online
  or offline. An unrecognized ticket code is never treated as valid just
  because the network is down.
- **PWA**: `public/manifest.json` + `public/sw.js`. The service worker
  explicitly never caches anything under `/api/` — ticket verification
  results must never be served stale.

## What still needs real-world configuration before production

1. BudPay API details (see `src/lib/integrations/budpay/README.md`).
2. Real values for `AUTH_SECRET` and `CONFIG_ENCRYPTION_KEY` (see
   `.env.example` for how to generate them).
3. Replace the generated placeholder icons in `public/icons/` with branded artwork.
4. A production Postgres instance and `DATABASE_URL`.
5. Deleting or changing the seeded demo accounts.

## Tests

```bash
npm test                    # unit tests: ticket-code parsing, mock provider scenarios, offline policy
npm run test:integration    # needs a disposable Postgres (DATABASE_URL): concurrent check-in race,
                            # payment eligibility, offline sync conflict + idempotent retry
```

## Known limitations to resolve before go-live

- **Event binding of tickets.** `/api/tickets/verify` currently creates a missing local ticket under the
  event being scanned. That is acceptable for the mock provider, but with real BudPay data the provider
  response must identify which event a ticket belongs to, so a ticket for event A can never be attached
  to event B. Add that mapping when implementing `BudPayTicketProvider`.
- **Rate limiter** is in-memory (single instance). Use a shared store if you run multiple instances.
- **No CSRF token layer.** Cookies are SameSite=Lax and all mutations are JSON POST/PATCH/PUT; add
  explicit CSRF tokens if you later accept cross-site embedding or form posts.
- **Not yet compiled or run.** This code was written without network access, so `npm install`,
  `tsc`, and the test suites have not been executed. Expect a round of small type/lint fixes on first build.

## Project structure

```
prisma/schema.prisma            Database schema
src/app/api/                    API routes (auth, tickets, events, staff, sync, admin)
src/app/(pages)/                Staff pages: /login /events /scanner /history /profile
src/app/admin/                  Admin dashboard and management pages
src/lib/auth/                   Session, password hashing, rate limiting
src/lib/db/                     Prisma client, audit logging, the check-in transaction
src/lib/integrations/           TicketProvider interface + mock/BudPay implementations
src/lib/offline/                IndexedDB cache, offline policy, sync manager
src/lib/validation/             Zod schemas for every API input
src/components/scanner/         Camera scanner, result panels, manual entry, recent scans
```
