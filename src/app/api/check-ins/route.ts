import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";
import { scanHistoryQuerySchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

/** Admin-facing scan history with filters, search and pagination. */
export async function GET(req: NextRequest) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = scanHistoryQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid query." }, { status: 400 });

  const { eventId, staffId, status, from, to, search, page, pageSize } = parsed.data;

  const where: Prisma.CheckInWhereInput = {
    ...(eventId && { eventId }),
    ...(staffId && { staffId }),
    ...(status && { status: status as any }),
    ...(from || to
      ? { scannedAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } }
      : {}),
    ...(search && {
      OR: [
        { ticketCode: { contains: search, mode: "insensitive" } },
        { ticket: { customerName: { contains: search, mode: "insensitive" } } },
        { ticket: { customerEmail: { contains: search, mode: "insensitive" } } },
        { ticket: { orderReference: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [total, checkIns] = await Promise.all([
    prisma.checkIn.count({ where }),
    prisma.checkIn.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        ticket: { select: { customerName: true, category: true, orderReference: true } },
        event: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    checkIns: checkIns.map((c) => ({
      id: c.id,
      ticketCode: c.ticketCode,
      customerName: c.ticket?.customerName ?? null,
      category: c.ticket?.category ?? null,
      event: c.event.name,
      status: c.status,
      staff: c.staff.name,
      scannedAt: c.scannedAt,
    })),
  });
}
