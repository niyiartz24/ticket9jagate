import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession, requireRole } from "@/lib/auth/session";
import { updateEventSchema } from "@/lib/validation/schemas";
import { recordAudit } from "@/lib/db/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { staffEvents: { include: { staff: { select: { id: true, name: true, email: true } } } } },
  });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const [total, checkedIn] = await Promise.all([
    prisma.ticket.count({ where: { eventId: event.id } }),
    prisma.ticket.count({ where: { eventId: event.id, ticketStatus: "CHECKED_IN" } }),
  ]);

  return NextResponse.json({
    event,
    stats: { total, checkedIn, remaining: total - checkedIn },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event data." }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.eventDate) data.eventDate = new Date(parsed.data.eventDate);

  const event = await prisma.event.update({ where: { id: params.id }, data });

  await recordAudit({ userId: session.userId, action: "EVENT_UPDATED", entity: "Event", entityId: event.id, metadata: data as any });

  return NextResponse.json({ event });
}
