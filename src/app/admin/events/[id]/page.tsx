"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { MetricCard } from "@/components/ui/metric-card";

interface EventDetail {
  event: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    status: string;
    staffEvents: Array<{ staff: { id: string; name: string; email: string } }>;
  };
  stats: { total: number; checkedIn: number; remaining: number };
}

export default function AdminEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<EventDetail | null>(null);

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, [params.id]);

  if (!data) return <p className="text-gate-textMuted">Loading…</p>;

  const { event, stats } = data;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gate-text">{event.name}</h1>
      <p className="mt-1 text-sm text-gate-textMuted">
        {event.venue} · {format(new Date(event.eventDate), "PPp")} · {event.status}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <MetricCard label="Total Tickets" value={stats.total} />
        <MetricCard label="Checked In" value={stats.checkedIn} tone="success" />
        <MetricCard label="Remaining" value={stats.remaining} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gate-text">Staff assigned</h2>
        {event.staffEvents.length === 0 ? (
          <p className="text-sm text-gate-textMuted">No staff assigned to this event yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {event.staffEvents.map(({ staff }) => (
              <li key={staff.id} className="rounded-lg border border-gate-border bg-gate-surface px-4 py-2.5 text-sm">
                <span className="text-gate-text">{staff.name}</span>{" "}
                <span className="text-gate-textMuted">— {staff.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
