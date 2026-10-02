"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface EventItem {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError("Unable to load events. Check your connection."));
  }, []);

  return (
    <main className="min-h-screen bg-gate-bg px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-xl font-semibold text-gate-text">Select an event</h1>
        <p className="mb-6 text-sm text-gate-textMuted">Choose the event you're checking guests in for.</p>

        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        {!events && !error && <p className="text-sm text-gate-textMuted">Loading…</p>}

        {events?.length === 0 && (
          <p className="text-sm text-gate-textMuted">
            You have not been assigned to any active events yet. Contact an administrator.
          </p>
        )}

        <ul className="space-y-2">
          {events?.map((event) => (
            <li key={event.id}>
              <button
                onClick={() => router.push(`/scanner?eventId=${event.id}`)}
                className="w-full rounded-lg border border-gate-border bg-gate-surface p-4 text-left hover:border-success/40"
              >
                <p className="font-medium text-gate-text">{event.name}</p>
                <p className="text-sm text-gate-textMuted">
                  {event.venue} · {format(new Date(event.eventDate), "PP")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
