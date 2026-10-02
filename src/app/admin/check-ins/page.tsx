"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";

interface CheckInRow {
  id: string;
  ticketCode: string;
  customerName: string | null;
  category: string | null;
  event: string;
  status: string;
  staff: string;
  scannedAt: string;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  SUCCESS: "success",
  ADMIN_OVERRIDE: "success",
  DUPLICATE: "warning",
  SYNC_CONFLICT_REJECTED: "warning",
  PAYMENT_INELIGIBLE: "warning",
  INVALID: "danger",
};

export default function AdminCheckInsPage() {
  const [rows, setRows] = useState<CheckInRow[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/check-ins?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.checkIns ?? []);
        setTotal(data.total ?? 0);
      });
  }, [search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gate-text">Scan history</h1>
        <a href="/api/check-ins/export" className="rounded-lg border border-gate-border px-4 py-2 text-sm text-gate-text hover:bg-gate-surface">
          Export CSV
        </a>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search ticket code, customer name, email, or order reference"
        className="mb-4 w-full max-w-md rounded-lg border border-gate-border bg-gate-surface px-3 py-2.5 text-sm text-gate-text outline-none focus:border-success"
      />

      <div className="overflow-x-auto rounded-xl border border-gate-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gate-surface text-gate-textMuted">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket Code</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gate-border hover:bg-gate-surface">
                <td className="px-4 py-3 font-mono text-gate-text">{row.ticketCode}</td>
                <td className="px-4 py-3 text-gate-textMuted">{row.customerName ?? "—"}</td>
                <td className="px-4 py-3 text-gate-textMuted">{row.category ?? "—"}</td>
                <td className="px-4 py-3 text-gate-textMuted">{row.event}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-gate-textMuted">{row.staff}</td>
                <td className="px-4 py-3 text-gate-textMuted">{format(new Date(row.scannedAt), "Pp")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gate-textMuted">{total.toLocaleString()} total records</p>
    </div>
  );
}
