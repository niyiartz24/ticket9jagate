# BudPay Integration — Information Needed Before Go-Live

`BudPayTicketProvider` (`./budpay-provider.ts`) is a structural stub. It
throws `BudPayNotConfiguredError` on every call because the following has
not yet been confirmed. Send this list to BudPay / the client's technical
contact before implementing the real calls.

## Required from BudPay

1. **Base URL** for the ticketing/order API (production and, ideally, a
   sandbox/test environment).
2. **Authentication scheme** — API key header, Bearer token, HMAC request
   signing, or something else. Which header names are expected.
3. **Ticket/order lookup endpoint**: given a ticket code (e.g.
   `TKT6AADE8AEA15A2`), what request retrieves the order? Exact path,
   method, query/body shape, and a sample response payload.
4. **Payment status field(s)** in that response, and the exact set of
   possible values (their "successful"/"pending"/"failed"/"cancelled"
   equivalents) so `mapBudPayResponseToAuthoritativeTicket` can translate
   them accurately.
5. **Check-in / "mark used" endpoint**, if one exists. If BudPay has no
   concept of check-in state, confirm that explicitly so
   `markTicketAsCheckedIn` can be implemented as a documented no-op rather
   than a guess.
6. **Rate limits** and recommended retry/backoff behavior.
7. **Ticket code uniqueness scope** — unique per merchant account, or
   globally unique across BudPay?
8. **Webhook support**, if any, for payment status changes after a ticket
   is issued (useful for keeping local ticket caches fresh for offline
   mode, but not required for v1).

## What's already built and won't need to change

- `TicketProvider` interface (`../ticket-provider.ts`) — the contract this
  class must satisfy.
- `getTicketProvider()` (`../provider-factory.ts`) — selects this class
  automatically once `BUDPAY_API_KEY`, `BUDPAY_SECRET_KEY`, and
  `BUDPAY_BASE_URL` are set and `USE_MOCK_TICKET_PROVIDER` is not `true`.
- The check-in transaction (`src/lib/db/check-in-transaction.ts`) — treats
  TicketGate's own Postgres database as the system of record for
  duplicate-check-in prevention, independent of whatever BudPay does or
  doesn't track.
- The scanner UI and offline sync — both depend only on the
  `TicketProvider` interface and TicketGate's own `/api/tickets/*` routes,
  never on BudPay directly.

## What to implement once the above is confirmed

In `budpay-provider.ts`, replace the three `TODO(BudPay integration)`
blocks with real `fetch` calls, and add a `mapBudPayResponseToAuthoritativeTicket`
helper in this folder to translate BudPay's response shape into
`AuthoritativeTicket`. No other file in the application needs to change.
