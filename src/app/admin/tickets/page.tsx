"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

interface TicketDetail {
  ticketCode: string;
  category: string;
  customerName: string;
  customerEmail: string;
  amount: string;
  orderReference: string;
  paymentStatus: string;
  ticketStatus: string;
  checkedInAt: string | null;
  event: { name: string };
  checkedInBy: { name: string } | null;
}

export default function AdminTicketsPage() {
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTicket(null);
    try {
      const res = await fetch(`/api/tickets/${code.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ticket not found.");
        return;
      }
      setTicket(data.ticket);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gate-text">Ticket search</h1>

      <form onSubmit={search} className="mb-6 flex max-w-md gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="TKT6AADE8AEA15A2"
          className="flex-1 rounded-lg border border-gate-border bg-gate-surface px-3 py-2.5 font-mono text-gate-text outline-none focus:border-success"
        />
        <button disabled={loading} className="rounded-lg bg-success px-4 py-2.5 font-semibold text-white disabled:opacity-60">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      {ticket && (
        <div className="max-w-lg rounded-xl border border-gate-border bg-gate-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-gate-text">{ticket.customerName}</p>
            <StatusBadge tone={ticket.ticketStatus === "CHECKED_IN" ? "success" : "neutral"}>
              {ticket.ticketStatus === "CHECKED_IN" ? "Checked in" : "Unused"}
            </StatusBadge>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Ticket Code" value={ticket.ticketCode} mono />
            <Row label="Category" value={ticket.category} />
            <Row label="Amount" value={`₦${Number(ticket.amount).toLocaleString()}`} />
            <Row label="Order Reference" value={ticket.orderReference} mono />
            <Row label="Payment Status" value={ticket.paymentStatus} />
            <Row label="Event" value={ticket.event.name} />
            {ticket.checkedInAt && <Row label="Checked in" value={format(new Date(ticket.checkedInAt), "PPp")} />}
            {ticket.checkedInBy && <Row label="Staff" value={ticket.checkedInBy.name} />}
          </dl>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gate-border pb-2">
      <dt className="text-gate-textMuted">{label}</dt>
      <dd className={mono ? "font-mono text-gate-text" : "text-gate-text"}>{value}</dd>
    </div>
  );
}
