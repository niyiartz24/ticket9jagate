import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";
import { ticketCodeSchema } from "@/lib/validation/schemas";

export async function GET(_req: Request, { params }: { params: { ticketCode: string } }) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = ticketCodeSchema.safeParse(params.ticketCode);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticket code." }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { ticketCode: parsed.data },
    include: {
      event: { select: { id: true, name: true } },
      checkedInBy: { select: { id: true, name: true } },
      checkIns: { orderBy: { scannedAt: "desc" }, take: 20, include: { staff: { select: { name: true } } } },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json({ ticket });
}
