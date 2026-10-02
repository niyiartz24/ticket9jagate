import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";

export async function GET() {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalTickets,
    checkedIn,
    invalidScans,
    duplicateScans,
    todaysScans,
    activeStaff,
    activeEvents,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { ticketStatus: "CHECKED_IN" } }),
    prisma.checkIn.count({ where: { status: "INVALID" } }),
    prisma.checkIn.count({ where: { status: { in: ["DUPLICATE", "SYNC_CONFLICT_REJECTED"] } } }),
    prisma.checkIn.count({ where: { scannedAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { role: "STAFF", isActive: true } }),
    prisma.event.count({ where: { status: "ACTIVE" } }),
  ]);

  const remaining = totalTickets - checkedIn;
  const checkInRate = totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0;

  return NextResponse.json({
    totalTickets,
    checkedIn,
    remaining,
    checkInRate: Number(checkInRate.toFixed(2)),
    invalidScans,
    duplicateScans,
    todaysScans,
    activeStaff,
    activeEvents,
  });
}
