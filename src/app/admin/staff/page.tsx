"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

interface StaffItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  events: Array<{ id: string; name: string }>;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data.staff ?? []));
  }

  useEffect(load, []);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gate-text">Staff</h1>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white">
          Add Staff
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gate-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gate-surface text-gate-textMuted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Events</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-gate-border hover:bg-gate-surface">
                <td className="px-4 py-3 text-gate-text">{s.name}</td>
                <td className="px-4 py-3 text-gate-textMuted">{s.email}</td>
                <td className="px-4 py-3 text-gate-textMuted">{s.events.map((e) => e.name).join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Disabled"}</StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(s.id, s.isActive)} className="text-sm text-gate-textMuted hover:text-gate-text hover:underline">
                    {s.isActive ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateStaffModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Unable to create staff account.");
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
        <h2 className="mb-4 text-lg font-semibold text-gate-text">Add staff</h2>
        <div className="space-y-3">
          <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success" />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success" />
          <input required type="password" placeholder="Temporary password (min 10 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success" />
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gate-border py-2.5 text-gate-text">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-success py-2.5 font-semibold text-white disabled:opacity-60">
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
