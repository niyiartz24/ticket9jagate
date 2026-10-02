/**
 * BudPayTicketProvider
 * ---------------------------------------------------------------------------
 * ⚠️ NOT YET FUNCTIONAL — INTEGRATION PENDING CLIENT-SUPPLIED DETAILS.
 *
 * This file intentionally does NOT call any BudPay endpoint. As of this
 * build, TicketGate has not been given:
 *
 *   1. The exact BudPay API base URL for ticket/order lookups.
 *   2. The authentication scheme (API key header? Bearer token? HMAC-signed
 *      request?) and where BUDPAY_API_KEY / BUDPAY_SECRET_KEY apply.
 *   3. The exact endpoint(s) and payload shape for:
 *        - looking up a ticket/order by ticket code,
 *        - reading payment/order status,
 *        - (if it exists) marking a ticket as checked in on BudPay's side.
 *   4. Rate limits and retry/backoff guidance.
 *   5. Whether ticket codes are globally unique across all BudPay merchants
 *      or scoped to this merchant account only.
 *
 * Until BudPay's actual API documentation and credentials are provided by
 * the client, every method below throws `BudPayNotConfiguredError` so that
 * a misconfigured production deployment fails loudly instead of silently
 * treating unverified tickets as valid. `getTicketProvider()` will not
 * select this class unless BUDPAY_API_KEY / BUDPAY_BASE_URL are present —
 * see ./README.md for the full integration checklist to hand to BudPay or
 * the client's technical contact.
 *
 * WHEN REAL DETAILS ARRIVE:
 *   Implement the three fetch calls in the marked TODO blocks below. Keep
 *   the public shape of TicketProvider unchanged so nothing else in the
 *   app needs to change — the scanner, check-in transaction, and offline
 *   sync logic all depend only on the interface, not on this class.
 */

import type {
  PaymentStatus,
  TicketLookupResult,
  TicketProvider,
} from "../ticket-provider";

export class BudPayNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(
      `BudPay integration is not configured. Missing: ${missing.join(
        ", "
      )}. See src/lib/integrations/budpay/README.md.`
    );
    this.name = "BudPayNotConfiguredError";
  }
}

interface BudPayConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

function loadConfig(): BudPayConfig {
  const apiKey = process.env.BUDPAY_API_KEY ?? "";
  const secretKey = process.env.BUDPAY_SECRET_KEY ?? "";
  const baseUrl = process.env.BUDPAY_BASE_URL ?? "";

  const missing: string[] = [];
  if (!apiKey) missing.push("BUDPAY_API_KEY");
  if (!secretKey) missing.push("BUDPAY_SECRET_KEY");
  if (!baseUrl) missing.push("BUDPAY_BASE_URL");
  if (missing.length > 0) throw new BudPayNotConfiguredError(missing);

  return { apiKey, secretKey, baseUrl };
}

export class BudPayTicketProvider implements TicketProvider {
  readonly name = "BudPay";
  private config: BudPayConfig;

  constructor() {
    // Throws BudPayNotConfiguredError if env vars are absent — intentional.
    this.config = loadConfig();
  }

  async getTicket(_ticketCode: string): Promise<TicketLookupResult> {
    // TODO(BudPay integration): replace with the real lookup endpoint once
    // confirmed, e.g.:
    //
    //   const res = await fetch(`${this.config.baseUrl}/<real-path>`, {
    //     headers: { Authorization: `Bearer ${this.config.apiKey}` },
    //   });
    //   const data = await res.json();
    //   if (!res.ok) return { found: false, reason: "PROVIDER_ERROR", message: ... };
    //   return { found: true, ticket: mapBudPayResponseToAuthoritativeTicket(data) };
    //
    // Do not guess at this shape — confirm against real BudPay docs first.
    throw new BudPayNotConfiguredError([
      "BudPay ticket-lookup endpoint (not yet confirmed)",
    ]);
  }

  async getTicketStatus(
    _ticketCode: string
  ): Promise<{ found: true; paymentStatus: PaymentStatus; providerCheckedIn: boolean } | { found: false }> {
    // TODO(BudPay integration): implement once a lighter-weight status
    // endpoint is confirmed, or delegate to getTicket().
    throw new BudPayNotConfiguredError([
      "BudPay ticket-status endpoint (not yet confirmed)",
    ]);
  }

  async markTicketAsCheckedIn(
    _ticketCode: string,
    _context: { staffId: string; eventId: string; checkedInAt: Date }
  ): Promise<{ acknowledged: boolean; message?: string }> {
    // TODO(BudPay integration): BudPay may or may not expose a "mark used"
    // endpoint. TicketGate's own database is the system of record for
    // check-in state regardless (see lib/db/check-in-transaction.ts), so
    // if BudPay has no such endpoint this can remain a documented no-op:
    //   return { acknowledged: false, message: "BudPay has no check-in callback endpoint." };
    throw new BudPayNotConfiguredError([
      "BudPay check-in callback endpoint (existence not yet confirmed)",
    ]);
  }
}
