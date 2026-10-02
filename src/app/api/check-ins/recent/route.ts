import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required." }, { status: 400 });

  const where =
    session.role === "STAFF"
      ? { eventId, staffId: session.userId }
      : { eventId };

  const scans = await prisma.checkIn.findMany({
    where,
    orderBy: { scannedAt: "desc" },
    take: 15,
    include: { ticket: { select: { customerName: true, category: true } } },
  });

  return NextResponse.json({
    scans: scans.map((s) => ({
      id: s.id,
      ticketCode: s.ticketCode,
      status: s.status,
      scannedAt: s.scannedAt,
      customerName: s.ticket?.customerName ?? null,
    })),
  });
}
