"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

interface EventItem {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  status: string;
  _count: { tickets: number; staffEvents: number };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data.events ?? []));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gate-text">Events</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white"
        >
          Create Event
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gate-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gate-surface text-gate-textMuted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Venue</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tickets</th>
              <th className="px-4 py-3 font-medium">Staff</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-gate-border hover:bg-gate-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${event.id}`} className="text-gate-text hover:underline">
                    {event.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gate-textMuted">{event.venue}</td>
                <td className="px-4 py-3 text-gate-textMuted">{format(new Date(event.eventDate), "PP")}</td>
                <td className="px-4 py-3 text-gate-textMuted">{event.status}</td>
                <td className="px-4 py-3 text-gate-textMuted">{event._count.tickets}</td>
                <td className="px-4 py-3 text-gate-textMuted">{event._count.staffEvents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, venue, eventDate: new Date(eventDate).toISOString(), status: "ACTIVE" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Unable to create event.");
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-gate-border bg-gate-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-gate-text">Create event</h2>
        <div className="space-y-3">
          <input
            required
            placeholder="Event name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success"
          />
          <input
            required
            placeholder="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success"
          />
          <input
            required
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success"
          />
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gate-border py-2.5 text-gate-text">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-success py-2.5 font-semibold text-white disabled:opacity-60">
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
