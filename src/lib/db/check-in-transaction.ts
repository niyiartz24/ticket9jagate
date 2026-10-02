/**
 * The atomic check-in operation.
 * ---------------------------------------------------------------------------
 * This is the one function that is allowed to change a ticket's checked-in
 * state. Both /api/tickets/check-in (online) and /api/sync (offline queue
 * replay) call through this, so duplicate-prevention logic exists in
 * exactly one place.
 *
 * Correctness under concurrency:
 *   Two staff devices scanning the same physical ticket at the same instant
 *   must never both succeed. We rely on Postgres row-level locking via
 *   `SELECT ... FOR UPDATE` inside a serializable-enough transaction, plus
 *   the unique constraint on Ticket.ticketCode as a hard backstop. The
 *   "already checked in" branch and the "success" branch are mutually
 *   exclusive within the same transaction — there is no window where both
 *   could read ticketStatus = UNUSED.
 */

import { prisma } from "./client";
import { recordAudit } from "./audit";
import type { Ticket, PaymentStatus } from "@prisma/client";

export interface CheckInRequest {
  ticketCode: string;
  eventId: string;
  staffId: string;
  scannedAt: Date;
  deviceId?: string;
  /** Idempotency key from the offline queue; undefined for live online scans. */
  clientScanId?: string;
  /** Admin override for a payment-ineligible ticket. Requires ADMIN role — enforced by the caller. */
  adminOverride?: { adminId: string; reason: string };
}

export type CheckInOutcome =
  | { outcome: "SUCCESS"; ticket: Ticket }
  | { outcome: "DUPLICATE"; checkedInAt: Date; checkedInByName: string }
  | { outcome: "INVALID" }
  | { outcome: "PAYMENT_INELIGIBLE"; paymentStatus: PaymentStatus }
  | { outcome: "SYNC_CONFLICT_REJECTED"; checkedInAt: Date; checkedInByName: string };

const ELIGIBLE_PAYMENT_STATUSES: PaymentStatus[] = ["SUCCESSFUL"];

export async function runCheckIn(req: CheckInRequest): Promise<CheckInOutcome> {
  return prisma.$transaction(async (tx) => {
    // Idempotency: if this exact client scan was already synced, return its
    // recorded outcome rather than re-processing (safe retry of a queued
    // offline scan after a flaky network response).
    if (req.clientScanId) {
      const existing = await tx.checkIn.findUnique({
        where: { clientScanId: req.clientScanId },
        include: { ticket: { include: { checkedInBy: true } } },
      });
      if (existing) {
        return outcomeFromExistingCheckIn(existing);
      }
    }

    // Lock the ticket row for the duration of this transaction.
    const tickets = await tx.$queryRaw<
      Array<{ id: string; ticketStatus: string; paymentStatus: PaymentStatus; checkedInAt: Date | null; checkedInById: string | null }>
    >`SELECT id, "ticketStatus", "paymentStatus", "checkedInAt", "checkedInById"
       FROM "Ticket" WHERE "ticketCode" = ${req.ticketCode} AND "eventId" = ${req.eventId}
       FOR UPDATE`;

    const lockedTicket = tickets[0];

    if (!lockedTicket) {
      await tx.checkIn.create({
        data: {
          eventId: req.eventId,
          staffId: req.staffId,
          ticketCode: req.ticketCode,
          status: "INVALID",
          scannedAt: req.scannedAt,
          deviceId: req.deviceId,
          clientScanId: req.clientScanId,
        },
      });
      return { outcome: "INVALID" };
    }

    if (lockedTicket.ticketStatus === "CHECKED_IN") {
      const checkedInByUser = lockedTicket.checkedInById
        ? await tx.user.findUnique({ where: { id: lockedTicket.checkedInById } })
        : null;

      await tx.checkIn.create({
        data: {
          ticketId: lockedTicket.id,
          eventId: req.eventId,
          staffId: req.staffId,
          ticketCode: req.ticketCode,
          status: req.clientScanId ? "SYNC_CONFLICT_REJECTED" : "DUPLICATE",
          scannedAt: req.scannedAt,
          deviceId: req.deviceId,
          clientScanId: req.clientScanId,
        },
      });

      return {
        outcome: req.clientScanId ? "SYNC_CONFLICT_REJECTED" : "DUPLICATE",
        checkedInAt: lockedTicket.checkedInAt!,
        checkedInByName: checkedInByUser?.name ?? "Unknown staff",
      };
    }

    const isEligible =
      ELIGIBLE_PAYMENT_STATUSES.includes(lockedTicket.paymentStatus) || !!req.adminOverride;

    if (!isEligible) {
      await tx.checkIn.create({
        data: {
          ticketId: lockedTicket.id,
          eventId: req.eventId,
          staffId: req.staffId,
          ticketCode: req.ticketCode,
          status: "PAYMENT_INELIGIBLE",
          scannedAt: req.scannedAt,
          deviceId: req.deviceId,
          clientScanId: req.clientScanId,
        },
      });
      return { outcome: "PAYMENT_INELIGIBLE", paymentStatus: lockedTicket.paymentStatus };
    }

    const updated = await tx.ticket.update({
      where: { id: lockedTicket.id },
      data: {
        ticketStatus: "CHECKED_IN",
        checkedInAt: req.scannedAt,
        checkedInById: req.staffId,
      },
    });

    await tx.checkIn.create({
      data: {
        ticketId: lockedTicket.id,
        eventId: req.eventId,
        staffId: req.staffId,
        ticketCode: req.ticketCode,
        status: req.adminOverride ? "ADMIN_OVERRIDE" : "SUCCESS",
        scannedAt: req.scannedAt,
        deviceId: req.deviceId,
        clientScanId: req.clientScanId,
      },
    });

    if (req.adminOverride) {
      await recordAudit({
        userId: req.adminOverride.adminId,
        action: "TICKET_CHECK_IN_OVERRIDE",
        entity: "Ticket",
        entityId: updated.id,
        metadata: { reason: req.adminOverride.reason, ticketCode: req.ticketCode },
      });
    }

    return { outcome: "SUCCESS", ticket: updated };
  });
}

function outcomeFromExistingCheckIn(
  existing: Awaited<ReturnType<typeof prisma.checkIn.findUnique>> & {
    ticket: (Awaited<ReturnType<typeof prisma.ticket.findUnique>> & {
      checkedInBy: Awaited<ReturnType<typeof prisma.user.findUnique>> | null;
    }) | null;
  }
): CheckInOutcome {
  if (!existing) return { outcome: "INVALID" };
  switch (existing.status) {
    case "SUCCESS":
    case "ADMIN_OVERRIDE":
      return { outcome: "SUCCESS", ticket: existing.ticket! };
    case "DUPLICATE":
      return {
        outcome: "DUPLICATE",
        checkedInAt: existing.ticket?.checkedInAt ?? existing.scannedAt,
        checkedInByName: existing.ticket?.checkedInBy?.name ?? "Unknown staff",
      };
    case "SYNC_CONFLICT_REJECTED":
      return {
        outcome: "SYNC_CONFLICT_REJECTED",
        checkedInAt: existing.ticket?.checkedInAt ?? existing.scannedAt,
        checkedInByName: existing.ticket?.checkedInBy?.name ?? "Unknown staff",
      };
    case "PAYMENT_INELIGIBLE":
      return { outcome: "PAYMENT_INELIGIBLE", paymentStatus: existing.ticket?.paymentStatus ?? "UNKNOWN" };
    default:
      return { outcome: "INVALID" };
  }
}
