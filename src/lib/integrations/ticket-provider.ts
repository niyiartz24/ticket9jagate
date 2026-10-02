/**
 * TicketProvider
 * ---------------------------------------------------------------------------
 * This is the single abstraction the rest of the application talks to when
 * it needs authoritative ticket data. Nothing outside `lib/integrations/`
 * should know whether tickets come from BudPay, a mock dataset, or some
 * future provider — they all implement this interface.
 *
 * Why this exists:
 *   The QR code on a ticket only carries a ticket code. That code is NOT
 *   proof of anything by itself — it must be checked against whatever
 *   system actually sold and tracks the ticket (BudPay). This interface is
 *   the seam where that check happens, entirely server-side.
 *
 * Swapping providers:
 *   `getTicketProvider()` in `./provider-factory.ts` is the only place that
 *   decides which implementation is active, based on environment
 *   configuration. Call sites never `new BudPayTicketProvider()` directly.
 */

export type PaymentStatus =
  | "SUCCESSFUL"
  | "PENDING"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN";

export interface AuthoritativeTicket {
  ticketCode: string;
  externalTicketId?: string;
  category: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  quantity: number;
  orderReference: string;
  paymentStatus: PaymentStatus;
  /**
   * Whether the authoritative source itself considers the ticket already
   * used. Distinct from our own database's TicketStatus — this is what the
   * provider told us, which we then reconcile with our local record.
   */
  providerCheckedIn: boolean;
  /** Raw provider payload, retained for audit/debugging. Never shown to end users. */
  raw?: unknown;
}

export type TicketLookupResult =
  | { found: true; ticket: AuthoritativeTicket }
  | { found: false; reason: "NOT_FOUND" | "PROVIDER_ERROR"; message?: string };

export interface TicketProvider {
  /** Human-readable provider name, for logs and admin UI. */
  readonly name: string;

  /**
   * Fetch the authoritative record for a ticket code. Does not mutate
   * anything. Used by /api/tickets/verify and manual entry.
   */
  getTicket(ticketCode: string): Promise<TicketLookupResult>;

  /**
   * A lighter-weight status check, when the full ticket payload isn't
   * needed (e.g. periodic background reconciliation). Providers that can't
   * offer a cheaper path may just delegate to getTicket internally.
   */
  getTicketStatus(
    ticketCode: string
  ): Promise<{ found: true; paymentStatus: PaymentStatus; providerCheckedIn: boolean } | { found: false }>;

  /**
   * Inform the authoritative source that a ticket has been checked in, if
   * and only if that source is the system of record for check-in state.
   *
   * IMPORTANT: TicketGate's own database is the system of record for
   * check-in state within our check-in transaction (see
   * lib/db/check-in-transaction.ts) — this call is for keeping BudPay's
   * side in sync where such an API exists, not a prerequisite for our own
   * duplicate-prevention logic. If BudPay has no such endpoint yet, this
   * is a documented no-op (see BudPayTicketProvider).
   */
  markTicketAsCheckedIn(
    ticketCode: string,
    context: { staffId: string; eventId: string; checkedInAt: Date }
  ): Promise<{ acknowledged: boolean; message?: string }>;
}
