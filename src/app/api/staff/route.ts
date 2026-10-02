import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";
import { createStaffSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/db/audit";

export async function GET() {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "desc" },
    include: { staffEvents: { include: { event: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({
    staff: staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      isActive: s.isActive,
      createdAt: s.createdAt,
      events: s.staffEvents.map((se) => se.event),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff data." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);

  const staff = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: "STAFF",
      staffEvents: parsed.data.eventIds
        ? { create: parsed.data.eventIds.map((eventId) => ({ eventId })) }
        : undefined,
    },
  });

  await recordAudit({ userId: session.userId, action: "STAFF_CREATED", entity: "User", entityId: staff.id });

  return NextResponse.json({ staff: { id: staff.id, name: staff.name, email: staff.email } }, { status: 201 });
}
