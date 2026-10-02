"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function IntegrationSettingsPage() {
  const [activeProvider, setActiveProvider] = useState("");
  const [budpayConfigured, setBudpayConfigured] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((res) => res.json())
      .then((data) => {
        setActiveProvider(data.activeProvider);
        setBudpayConfigured(data.budpay?.isActive ?? false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "budpay", apiKey, secretKey, baseUrl, isActive: true }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-xl font-semibold text-gate-text">BudPay integration</h1>
      <p className="mb-6 text-sm text-gate-textMuted">
        Currently active provider: <StatusBadge tone={activeProvider === "BudPay" ? "success" : "warning"}>{activeProvider}</StatusBadge>
      </p>

      <div className="mb-6 rounded-lg border border-warning/30 bg-warning-bg p-4 text-sm text-gate-text">
        Saving credentials here stores them encrypted, but the BudPay integration itself will not go live until
        BudPay's real API endpoints and request/response format have been confirmed. Until then the app continues
        to use the development mock ticket provider. See the integration README for what's needed.
      </div>

      <form onSubmit={save} className="space-y-3 rounded-xl border border-gate-border bg-gate-surface p-6">
        <input
          required
          placeholder="BudPay Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success"
        />
        <input
          required
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success"
        />
        <input
          required
          type="password"
          placeholder="Secret Key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-3 py-2.5 text-gate-text outline-none focus:border-success"
        />
        <button disabled={saving} className="w-full rounded-lg bg-success py-2.5 font-semibold text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save configuration"}
        </button>
        {saved && <p className="text-sm text-success">Configuration saved.</p>}
      </form>
    </div>
  );
}
