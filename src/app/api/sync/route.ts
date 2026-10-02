import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";
import { syncBatchSchema } from "@/lib/validation/schemas";
import { runCheckIn } from "@/lib/db/check-in-transaction";
import { recordAudit } from "@/lib/db/audit";

/**
 * Replays a batch of scans that were queued while a device was offline.
 *
 * Every scan is replayed through the exact same `runCheckIn` transaction
 * used for live online check-ins — there is no separate "offline path" in
 * the database layer. This is what guarantees that if two devices queued a
 * check-in for the same physical ticket while both offline, only the one
 * whose queued scan reaches the server first (by scannedAt, enforced by row
 * locking at commit time) succeeds; the second is resolved as
 * SYNC_CONFLICT_REJECTED, distinct from an ordinary duplicate scan so staff
 * and admins can see it was a sync-time conflict rather than a repeat scan
 * of an already-known-used ticket.
 *
 * `clientScanId` (a UUID generated on-device at scan time) makes each
 * queued item idempotent: retrying a batch after a dropped connection never
 * double-processes a scan.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = syncBatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync batch." }, { status: 400 });

  // Process oldest scan first so ordering reflects when they actually happened.
  const scans = [...parsed.data.scans].sort(
    (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
  );

  const results = [];
  for (const scan of scans) {
    if (session.role === "STAFF") {
      const assigned = await prisma.staffEvent.findUnique({
        where: { staffId_eventId: { staffId: session.userId, eventId: scan.eventId } },
      });
      if (!assigned) {
        results.push({ clientScanId: scan.clientScanId, outcome: "REJECTED_NOT_ASSIGNED" });
        continue;
      }
    }

    const outcome = await runCheckIn({
      ticketCode: scan.ticketCode,
      eventId: scan.eventId,
      staffId: session.userId,
      scannedAt: new Date(scan.scannedAt),
      deviceId: scan.deviceId,
      clientScanId: scan.clientScanId,
    });

    await recordAudit({
      userId: session.userId,
      action: `OFFLINE_SYNC_${outcome.outcome}`,
      entity: "Ticket",
      metadata: { ticketCode: scan.ticketCode, eventId: scan.eventId, clientScanId: scan.clientScanId },
    });

    results.push({ clientScanId: scan.clientScanId, outcome: outcome.outcome });
  }

  return NextResponse.json({ results });
}
