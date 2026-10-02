import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";
import { recordAudit } from "@/lib/db/audit";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(req: NextRequest) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eventId = req.nextUrl.searchParams.get("eventId") ?? undefined;

  const checkIns = await prisma.checkIn.findMany({
    where: { ...(eventId && { eventId }), status: { in: ["SUCCESS", "ADMIN_OVERRIDE"] } },
    orderBy: { scannedAt: "asc" },
    include: {
      ticket: true,
      event: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  const header = [
    "Ticket Code", "Customer Name", "Customer Email", "Category", "Amount",
    "Order Reference", "Event", "Check-in Status", "Checked-in Time", "Staff",
  ];

  const rows = checkIns.map((c) => [
    c.ticketCode,
    c.ticket?.customerName,
    c.ticket?.customerEmail,
    c.ticket?.category,
    c.ticket?.amount ? Number(c.ticket.amount).toFixed(2) : "",
    c.ticket?.orderReference,
    c.event.name,
    c.status,
    c.scannedAt.toISOString(),
    c.staff.name,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  await recordAudit({ userId: session.userId, action: "CHECK_INS_EXPORTED", entity: "CheckIn", metadata: { eventId } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ticketgate-check-ins-${Date.now()}.csv"`,
    },
  });
}
