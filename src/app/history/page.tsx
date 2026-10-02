"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";

interface EventItem {
  id: string;
  name: string;
}

interface ScanRow {
  id: string;
  ticketCode: string;
  status: string;
  scannedAt: string;
  customerName: string | null;
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  SUCCESS: "success",
  DUPLICATE: "warning",
  PAYMENT_INELIGIBLE: "warning",
  INVALID: "danger",
};

export default function StaffHistoryPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [scans, setScans] = useState<ScanRow[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? []);
        if (data.events?.[0]) setEventId(data.events[0].id);
      });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/check-ins/recent?eventId=${eventId}`)
      .then((res) => res.json())
      .then((data) => setScans(data.scans ?? []));
  }, [eventId]);

  return (
    <main className="min-h-screen bg-gate-bg px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-4 text-xl font-semibold text-gate-text">Your scan history</h1>

        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gate-border bg-gate-surface px-3 py-2.5 text-gate-text"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>

        <ul className="space-y-2">
          {scans.map((scan) => (
            <li key={scan.id} className="flex items-center justify-between rounded-lg border border-gate-border bg-gate-surface px-4 py-3 text-sm">
              <div>
                <p className="font-mono text-gate-text">{scan.ticketCode}</p>
                {scan.customerName && <p className="text-xs text-gate-textMuted">{scan.customerName}</p>}
              </div>
              <div className="text-right">
                <StatusBadge tone={STATUS_TONE[scan.status] ?? "neutral"}>{scan.status}</StatusBadge>
                <p className="mt-1 text-xs text-gate-textMuted">{format(new Date(scan.scannedAt), "p")}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
