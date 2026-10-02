import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";

/**
 * Snapshot of an event's tickets + offline policy for the scanner to store
 * in IndexedDB. Only events the staff member is assigned to are served.
 * Deliberately omits customer email and raw provider data.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  if (session.role === "STAFF") {
    const assigned = await prisma.staffEvent.findUnique({
      where: { staffId_eventId: { staffId: session.userId, eventId: params.id } },
    });
    if (!assigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { offlinePolicy: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const tickets = await prisma.ticket.findMany({
    where: { eventId: params.id },
    select: {
      ticketCode: true, eventId: true, category: true, customerName: true,
      amount: true, orderReference: true, paymentStatus: true, ticketStatus: true,
    },
  });

  return NextResponse.json({
    offlinePolicy: event.offlinePolicy,
    tickets: tickets.map((t) => ({ ...t, amount: Number(t.amount), cachedAt: Date.now() })),
  });
}
