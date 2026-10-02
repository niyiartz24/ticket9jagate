import { prisma } from "@/lib/db/client";
import { MetricCard } from "@/components/ui/metric-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalTickets, checkedIn, invalidScans, duplicateScans, todaysScans, activeStaff, activeEvents] =
    await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { ticketStatus: "CHECKED_IN" } }),
      prisma.checkIn.count({ where: { status: "INVALID" } }),
      prisma.checkIn.count({ where: { status: { in: ["DUPLICATE", "SYNC_CONFLICT_REJECTED"] } } }),
      prisma.checkIn.count({ where: { scannedAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { role: "STAFF", isActive: true } }),
      prisma.event.count({ where: { status: "ACTIVE" } }),
    ]);

  const remaining = totalTickets - checkedIn;
  const checkInRate = totalTickets > 0 ? ((checkedIn / totalTickets) * 100).toFixed(2) : "0.00";

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gate-text">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Tickets" value={totalTickets.toLocaleString()} />
        <MetricCard label="Checked In" value={checkedIn.toLocaleString()} tone="success" />
        <MetricCard label="Remaining" value={remaining.toLocaleString()} />
        <MetricCard label="Check-in Rate" value={`${checkInRate}%`} />
        <MetricCard label="Today's Scans" value={todaysScans.toLocaleString()} />
        <MetricCard label="Invalid Scans" value={invalidScans.toLocaleString()} tone="danger" />
        <MetricCard label="Duplicate Scans" value={duplicateScans.toLocaleString()} tone="warning" />
        <MetricCard label="Active Staff" value={activeStaff.toLocaleString()} />
        <MetricCard label="Active Events" value={activeEvents.toLocaleString()} />
      </div>
    </div>
  );
}
