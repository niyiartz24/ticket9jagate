import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession, requireRole } from "@/lib/auth/session";
import { createEventSchema } from "@/lib/validation/schemas";
import { recordAudit } from "@/lib/db/audit";

/** STAFF see only events they're assigned to; ADMIN see all. */
export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  if (session.role === "ADMIN") {
    const events = await prisma.event.findMany({
      orderBy: { eventDate: "desc" },
      include: { _count: { select: { tickets: true, staffEvents: true } } },
    });
    return NextResponse.json({ events });
  }

  const events = await prisma.event.findMany({
    where: { staffEvents: { some: { staffId: session.userId } }, status: "ACTIVE" },
    orderBy: { eventDate: "desc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event data." }, { status: 400 });

  const event = await prisma.event.create({
    data: { ...parsed.data, eventDate: new Date(parsed.data.eventDate) },
  });

  await recordAudit({ userId: session.userId, action: "EVENT_CREATED", entity: "Event", entityId: event.id });

  return NextResponse.json({ event }, { status: 201 });
}
