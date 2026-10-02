import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";
import { checkInSchema } from "@/lib/validation/schemas";
import { runCheckIn } from "@/lib/db/check-in-transaction";
import { recordAudit } from "@/lib/db/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid check-in request." }, { status: 400 });
  }

  const { ticketCode, eventId, scannedAt, deviceId, clientScanId, adminOverrideReason } = parsed.data;

  if (session.role === "STAFF") {
    const assigned = await prisma.staffEvent.findUnique({
      where: { staffId_eventId: { staffId: session.userId, eventId } },
    });
    if (!assigned) {
      return NextResponse.json({ error: "You are not assigned to this event." }, { status: 403 });
    }
  }

  if (adminOverrideReason && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can override payment eligibility." }, { status: 403 });
  }

  const result = await runCheckIn({
    ticketCode,
    eventId,
    staffId: session.userId,
    scannedAt: new Date(scannedAt),
    deviceId,
    clientScanId,
    adminOverride: adminOverrideReason
      ? { adminId: session.userId, reason: adminOverrideReason }
      : undefined,
  });

  await recordAudit({
    userId: session.userId,
    action: `TICKET_CHECK_IN_${result.outcome}`,
    entity: "Ticket",
    metadata: { ticketCode, eventId },
  });

  switch (result.outcome) {
    case "SUCCESS":
      return NextResponse.json({
        outcome: "SUCCESS",
        ticket: {
          ticketCode: result.ticket.ticketCode,
          customerName: result.ticket.customerName,
          category: result.ticket.category,
          checkedInAt: result.ticket.checkedInAt,
        },
      });
    case "DUPLICATE":
    case "SYNC_CONFLICT_REJECTED":
      return NextResponse.json({
        outcome: result.outcome,
        message: "This ticket has already been checked in.",
        checkedInAt: result.checkedInAt,
        checkedInByName: result.checkedInByName,
      });
    case "PAYMENT_INELIGIBLE":
      return NextResponse.json({
        outcome: "PAYMENT_INELIGIBLE",
        message: "This ticket's payment is not eligible for check-in.",
        paymentStatus: result.paymentStatus,
      });
    case "INVALID":
    default:
      return NextResponse.json({
        outcome: "INVALID",
        message: "This ticket could not be verified.",
      });
  }
}
