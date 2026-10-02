"use client";

import { useState } from "react";

export function ManualEntry({
  onSubmit,
  onClose,
}: {
  onSubmit: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-sm rounded-t-xl border border-gate-border bg-gate-surface p-6 sm:rounded-xl">
        <h2 className="text-lg font-semibold text-gate-text">Enter ticket code manually</h2>
        <p className="mt-1 text-sm text-gate-textMuted">
          Use this if the QR code is damaged, the camera fails, or the customer only has the code.
        </p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TKT6AADE8AEA15A2"
          className="mt-4 w-full rounded-lg border border-gate-border bg-gate-surfaceRaised px-4 py-3 font-mono text-gate-text outline-none focus:border-success"
        />
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gate-border py-3 text-gate-text hover:bg-gate-surfaceRaised"
          >
            Cancel
          </button>
          <button
            onClick={() => code.trim() && onSubmit(code.trim())}
            disabled={!code.trim()}
            className="flex-1 rounded-lg bg-success py-3 font-semibold text-white disabled:opacity-50"
          >
            Verify Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
