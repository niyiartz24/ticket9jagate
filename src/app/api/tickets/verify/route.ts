import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";
import { verifyTicketSchema } from "@/lib/validation/schemas";
import { extractTicketCode } from "@/lib/ticket-code";
import { getTicketProvider } from "@/lib/integrations/provider-factory";
import { recordAudit } from "@/lib/db/audit";
import { checkRateLimit } from "@/lib/auth/rate-limit";

/**
 * Verification never trusts the QR contents alone. It:
 *   1. Extracts a candidate ticket code from whatever the camera read.
 *   2. Confirms the staff member is assigned to the claimed event.
 *   3. Looks up (or refreshes) the ticket against the authoritative
 *      provider, upserting a local cache row for offline use.
 *   4. Returns a verdict — it does NOT check the ticket in. That is a
 *      separate, explicit action (/api/tickets/check-in).
 */
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const rate = checkRateLimit(`verify:${session.userId}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many scans. Slow down and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifyTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scan data." }, { status: 400 });
  }

  const { rawScanValue, eventId } = parsed.data;

  if (session.role === "STAFF") {
    const assigned = await prisma.staffEvent.findUnique({
      where: { staffId_eventId: { staffId: session.userId, eventId } },
    });
    if (!assigned) {
      return NextResponse.json({ error: "You are not assigned to this event." }, { status: 403 });
    }
  }

  const ticketCode = extractTicketCode(rawScanValue);
  if (!ticketCode) {
    return NextResponse.json({ verdict: "INVALID", message: "This ticket could not be verified." });
  }

  const provider = getTicketProvider();
  const lookup = await provider.getTicket(ticketCode);

  if (!lookup.found) {
    await recordAudit({
      userId: session.userId,
      action: "TICKET_VERIFY_INVALID",
      entity: "Ticket",
      metadata: { ticketCode, eventId },
    });
    return NextResponse.json({
      verdict: "INVALID",
      ticketCode,
      message: "This ticket could not be verified.",
    });
  }

  const authoritative = lookup.ticket;

  // Upsert local cache row so offline mode has current data for this ticket.
  const localTicket = await prisma.ticket.upsert({
    where: { ticketCode },
    create: {
      ticketCode,
      externalTicketId: authoritative.externalTicketId,
      eventId,
      category: authoritative.category,
      customerName: authoritative.customerName,
      customerEmail: authoritative.customerEmail,
      amount: authoritative.amount,
      quantity: authoritative.quantity,
      orderReference: authoritative.orderReference,
      paymentStatus: authoritative.paymentStatus,
      ticketStatus: authoritative.providerCheckedIn ? "CHECKED_IN" : "UNUSED",
      lastSyncedAt: new Date(),
      rawProviderData: authoritative.raw as any,
    },
    update: {
      category: authoritative.category,
      customerName: authoritative.customerName,
      customerEmail: authoritative.customerEmail,
      amount: authoritative.amount,
      quantity: authoritative.quantity,
      orderReference: authoritative.orderReference,
      paymentStatus: authoritative.paymentStatus,
      lastSyncedAt: new Date(),
      rawProviderData: authoritative.raw as any,
      // Do not downgrade ticketStatus here — our own check-in transaction
      // is the sole writer of CHECKED_IN state to avoid racing with it.
    },
  });

  await recordAudit({
    userId: session.userId,
    action: "TICKET_VERIFY",
    entity: "Ticket",
    entityId: localTicket.id,
    metadata: { ticketCode, eventId },
  });

  if (localTicket.eventId !== eventId) {
    return NextResponse.json({
      verdict: "INVALID",
      ticketCode,
      message: "This ticket does not belong to the selected event.",
    });
  }

  if (localTicket.ticketStatus === "CHECKED_IN") {
    return NextResponse.json({
      verdict: "DUPLICATE",
      ticketCode,
      ticket: serializeTicket(localTicket),
      checkedInAt: localTicket.checkedInAt,
    });
  }

  if (localTicket.paymentStatus !== "SUCCESSFUL") {
    return NextResponse.json({
      verdict: "PAYMENT_INELIGIBLE",
      ticketCode,
      ticket: serializeTicket(localTicket),
    });
  }

  return NextResponse.json({
    verdict: "VALID",
    ticketCode,
    ticket: serializeTicket(localTicket),
  });
}

function serializeTicket(t: Awaited<ReturnType<typeof prisma.ticket.upsert>>) {
  return {
    ticketCode: t.ticketCode,
    category: t.category,
    customerName: t.customerName,
    amount: Number(t.amount),
    quantity: t.quantity,
    orderReference: t.orderReference,
    paymentStatus: t.paymentStatus,
  };
}
