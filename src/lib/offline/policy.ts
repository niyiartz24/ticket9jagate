import { offlineDB, type CachedTicket } from "./db";

/**
 * Offline verification policy.
 * ---------------------------------------------------------------------------
 * A ticket code being well-formed, or even present in the local cache, is
 * NOT the same thing as it being verified. This module implements the
 * *local, provisional* check that runs only when the network is
 * unreachable, governed by the event's `offlinePolicy` (admin-configurable,
 * stored in Event.offlinePolicy).
 *
 * Every offline result is provisional: it is queued and re-validated by the
 * server's authoritative check-in transaction the moment connectivity
 * returns (see /api/sync). A ticket that was never synced to this device
 * cannot be verified offline at all — it is reported as "cannot verify
 * offline," not treated as valid or invalid.
 */

export interface OfflinePolicy {
  allowOfflineCheckIn: boolean;
  requireLocalTicketCache: boolean;
}

export type OfflineVerdict =
  | { verdict: "VALID_PROVISIONAL"; ticket: CachedTicket }
  | { verdict: "DUPLICATE_PROVISIONAL"; ticket: CachedTicket }
  | { verdict: "PAYMENT_INELIGIBLE_PROVISIONAL"; ticket: CachedTicket }
  | { verdict: "CANNOT_VERIFY_OFFLINE" }
  | { verdict: "OFFLINE_CHECKIN_DISABLED" };

export async function verifyTicketOffline(
  ticketCode: string,
  eventId: string,
  policy: OfflinePolicy
): Promise<OfflineVerdict> {
  if (!policy.allowOfflineCheckIn) {
    return { verdict: "OFFLINE_CHECKIN_DISABLED" };
  }

  const cached = await offlineDB.ticketCache.get(ticketCode);

  if (!cached || cached.eventId !== eventId) {
    // No local record — we cannot respond either way. This is the safe
    // default: never treat an unrecognized code as valid just because the
    // network is down.
    return { verdict: "CANNOT_VERIFY_OFFLINE" };
  }

  if (cached.ticketStatus === "CHECKED_IN") {
    return { verdict: "DUPLICATE_PROVISIONAL", ticket: cached };
  }

  if (cached.paymentStatus !== "SUCCESSFUL") {
    return { verdict: "PAYMENT_INELIGIBLE_PROVISIONAL", ticket: cached };
  }

  return { verdict: "VALID_PROVISIONAL", ticket: cached };
}

/** Optimistically mark the local cache entry checked-in after a provisional offline check-in. */
export async function markCachedTicketCheckedIn(ticketCode: string) {
  await offlineDB.ticketCache.update(ticketCode, { ticketStatus: "CHECKED_IN" });
}
