"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

export type ScanVerdict =
  | { type: "VALID"; ticketCode: string; ticket: TicketSummary }
  | { type: "DUPLICATE"; ticketCode: string; ticket?: TicketSummary; checkedInAt: string }
  | { type: "PAYMENT_INELIGIBLE"; ticketCode: string; ticket?: TicketSummary; paymentStatus: string }
  | { type: "INVALID"; ticketCode?: string }
  | { type: "CHECKED_IN_SUCCESS"; ticketCode: string; customerName: string; category: string; checkedInAt: string; staffName: string }
  | { type: "NETWORK_ERROR" }
  | { type: "OFFLINE_QUEUED"; ticketCode: string };

export interface TicketSummary {
  category: string;
  customerName: string;
  amount: number;
  orderReference: string;
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function ResultPanel({
  verdict,
  onCheckIn,
  onScanNext,
  checkingIn,
}: {
  verdict: ScanVerdict;
  onCheckIn: () => void;
  onScanNext: () => void;
  checkingIn: boolean;
}) {
  switch (verdict.type) {
    case "VALID":
      return (
        <div className="flex h-full flex-col rounded-xl border border-success/30 bg-success-bg p-6">
          <StatusBadge tone="success">Valid ticket</StatusBadge>
          <div className="mt-4 space-y-1">
            <p className="text-2xl font-semibold text-gate-text">{verdict.ticket.customerName}</p>
            <p className="text-gate-textMuted">{verdict.ticket.category}</p>
            <p className="text-xl font-medium text-gate-text">{formatNaira(verdict.ticket.amount)}</p>
          </div>
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Ticket Code" value={verdict.ticketCode} mono />
            <Row label="Order" value={verdict.ticket.orderReference} mono />
            <Row label="Payment" value="Successful" />
          </dl>
          <div className="mt-auto pt-6">
            <button
              onClick={onCheckIn}
              disabled={checkingIn}
              className="w-full rounded-lg bg-success py-4 text-lg font-semibold text-white transition-opacity disabled:opacity-60"
            >
              {checkingIn ? "Checking in…" : "Check In"}
            </button>
          </div>
        </div>
      );

    case "CHECKED_IN_SUCCESS":
      return (
        <div className="flex h-full flex-col rounded-xl border border-success/30 bg-success-bg p-6">
          <StatusBadge tone="success">Check-in successful</StatusBadge>
          <dl className="mt-6 space-y-3 text-sm">
            <Row label="Customer" value={verdict.customerName} />
            <Row label="Ticket" value={verdict.ticketCode} mono />
            <Row label="Category" value={verdict.category} />
            <Row label="Checked in" value={format(new Date(verdict.checkedInAt), "PPp")} />
            <Row label="Staff" value={verdict.staffName} />
          </dl>
          <div className="mt-auto pt-6">
            <button
              onClick={onScanNext}
              className="w-full rounded-lg bg-gate-surfaceRaised py-4 text-lg font-semibold text-gate-text hover:bg-gate-border"
            >
              Scan Next Ticket
            </button>
          </div>
        </div>
      );

    case "DUPLICATE":
      return (
        <div className="flex h-full flex-col rounded-xl border border-warning/30 bg-warning-bg p-6">
          <StatusBadge tone="warning">Already checked in</StatusBadge>
          <p className="mt-4 text-gate-text">This ticket has already been used.</p>
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Ticket" value={verdict.ticketCode} mono />
            <Row label="Checked in" value={format(new Date(verdict.checkedInAt), "p")} />
          </dl>
          <div className="mt-auto pt-6">
            <button onClick={onScanNext} className="w-full rounded-lg bg-gate-surfaceRaised py-4 font-semibold text-gate-text hover:bg-gate-border">
              Scan Next Ticket
            </button>
          </div>
        </div>
      );

    case "PAYMENT_INELIGIBLE":
      return (
        <div className="flex h-full flex-col rounded-xl border border-warning/30 bg-warning-bg p-6">
          <StatusBadge tone="warning">Payment not confirmed</StatusBadge>
          <p className="mt-4 text-gate-text">
            This ticket's payment status is <span className="font-medium">{verdict.paymentStatus}</span> and is
            not eligible for check-in. An administrator can override this if needed.
          </p>
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Ticket" value={verdict.ticketCode} mono />
          </dl>
          <div className="mt-auto pt-6">
            <button onClick={onScanNext} className="w-full rounded-lg bg-gate-surfaceRaised py-4 font-semibold text-gate-text hover:bg-gate-border">
              Scan Next Ticket
            </button>
          </div>
        </div>
      );

    case "OFFLINE_QUEUED":
      return (
        <div className="flex h-full flex-col rounded-xl border border-warning/30 bg-warning-bg p-6">
          <StatusBadge tone="warning">Queued — offline</StatusBadge>
          <p className="mt-4 text-gate-text">
            No connection right now. This scan has been recorded locally and will be verified with the
            server once you're back online.
          </p>
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Ticket" value={verdict.ticketCode} mono />
          </dl>
          <div className="mt-auto pt-6">
            <button onClick={onScanNext} className="w-full rounded-lg bg-gate-surfaceRaised py-4 font-semibold text-gate-text hover:bg-gate-border">
              Scan Next Ticket
            </button>
          </div>
        </div>
      );

    case "NETWORK_ERROR":
      return (
        <div className="flex h-full flex-col rounded-xl border border-danger/30 bg-danger-bg p-6">
          <StatusBadge tone="danger">Connection error</StatusBadge>
          <p className="mt-4 text-gate-text">Unable to connect. Your scan has not yet been verified.</p>
          <div className="mt-auto pt-6">
            <button onClick={onScanNext} className="w-full rounded-lg bg-gate-surfaceRaised py-4 font-semibold text-gate-text hover:bg-gate-border">
              Try Again
            </button>
          </div>
        </div>
      );

    case "INVALID":
    default:
      return (
        <div className="flex h-full flex-col rounded-xl border border-danger/30 bg-danger-bg p-6">
          <StatusBadge tone="danger">Invalid ticket</StatusBadge>
          <p className="mt-4 text-gate-text">The scanned ticket could not be verified.</p>
          {verdict.type === "INVALID" && verdict.ticketCode && (
            <dl className="mt-6 space-y-2 text-sm">
              <Row label="Ticket code" value={verdict.ticketCode} mono />
            </dl>
          )}
          <div className="mt-auto pt-6">
            <button onClick={onScanNext} className="w-full rounded-lg bg-gate-surfaceRaised py-4 font-semibold text-gate-text hover:bg-gate-border">
              Scan Next Ticket
            </button>
          </div>
        </div>
      );
  }
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <dt className="text-gate-textMuted">{label}</dt>
      <dd className={mono ? "font-mono text-gate-text" : "text-gate-text"}>{value}</dd>
    </div>
  );
}
