import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";
import { updateStaffSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/db/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof parsed.data.isActive === "boolean") data.isActive = parsed.data.isActive;
  if (parsed.data.newPassword) data.passwordHash = await hashPassword(parsed.data.newPassword);

  const staff = await prisma.$transaction(async (tx) => {
    const updated = Object.keys(data).length
      ? await tx.user.update({ where: { id: params.id }, data })
      : await tx.user.findUniqueOrThrow({ where: { id: params.id } });

    if (parsed.data.eventIds) {
      await tx.staffEvent.deleteMany({ where: { staffId: params.id } });
      await tx.staffEvent.createMany({
        data: parsed.data.eventIds.map((eventId) => ({ staffId: params.id, eventId })),
      });
    }

    return updated;
  });

  await recordAudit({
    userId: session.userId,
    action: parsed.data.isActive === false ? "STAFF_DISABLED" : "STAFF_UPDATED",
    entity: "User",
    entityId: staff.id,
  });

  return NextResponse.json({ staff: { id: staff.id, name: staff.name, isActive: staff.isActive } });
}
