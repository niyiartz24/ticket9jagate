"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, X, Clock } from "lucide-react";

export interface RecentScan {
  id: string;
  ticketCode: string;
  customerName: string | null;
  status: string;
  scannedAt: string;
}

export function RecentScans({ scans }: { scans: RecentScan[] }) {
  if (scans.length === 0) {
    return <p className="text-sm text-gate-textMuted">No scans yet for this event.</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-gate-textMuted">Recent scans</h3>
      <ul className="space-y-1.5">
        {scans.map((scan) => (
          <li key={scan.id} className="flex items-center justify-between rounded-lg bg-gate-surface px-3 py-2 text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <Icon status={scan.status} />
              <div className="min-w-0">
                <p className="truncate font-mono text-gate-text">{scan.ticketCode}</p>
                {scan.customerName && <p className="truncate text-xs text-gate-textMuted">{scan.customerName}</p>}
              </div>
            </div>
            <span className="shrink-0 text-xs text-gate-textMuted">
              {formatDistanceToNow(new Date(scan.scannedAt), { addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Icon({ status }: { status: string }) {
  if (status === "SUCCESS" || status === "ADMIN_OVERRIDE") return <Check size={16} className="shrink-0 text-success" />;
  if (status === "DUPLICATE" || status === "SYNC_CONFLICT_REJECTED" || status === "PAYMENT_INELIGIBLE")
    return <Clock size={16} className="shrink-0 text-warning" />;
  return <X size={16} className="shrink-0 text-danger" />;
}
