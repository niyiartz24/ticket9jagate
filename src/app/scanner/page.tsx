"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CameraScanner } from "@/components/scanner/camera-scanner";
import { ManualEntry } from "@/components/scanner/manual-entry";
import { ResultPanel, type ScanVerdict } from "@/components/scanner/result-panel";
import { RecentScans, type RecentScan } from "@/components/scanner/recent-scans";
import { NetworkStatus } from "@/components/scanner/network-status";
import { offlineDB } from "@/lib/offline/db";
import { verifyTicketOffline, markCachedTicketCheckedIn } from "@/lib/offline/policy";
import { registerServiceWorker } from "@/lib/register-sw";
import { downloadOfflineCache, getCachedOfflinePolicy } from "@/lib/offline/cache-download";

function ScannerScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");

  const [eventName, setEventName] = useState<string>("");
  const [verdict, setVerdict] = useState<ScanVerdict | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [deviceId] = useState(() => getOrCreateDeviceId());

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!eventId) {
      router.replace("/events");
      return;
    }
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((data) => setEventName(data.event?.name ?? ""))
      .catch(() => {});
    refreshRecentScans(eventId).then(setRecentScans);
    downloadOfflineCache(eventId).catch(() => {});
  }, [eventId, router]);

  const handleScan = useCallback(
    async (rawScanValue: string) => {
      if (!eventId) return;

      try {
        const res = await fetch("/api/tickets/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawScanValue, eventId }),
        });

        if (!res.ok) {
          setVerdict({ type: "NETWORK_ERROR" });
          return;
        }

        const data = await res.json();

        if (data.verdict === "VALID") {
          setVerdict({ type: "VALID", ticketCode: data.ticketCode, ticket: data.ticket });
        } else if (data.verdict === "DUPLICATE") {
          setVerdict({
            type: "DUPLICATE",
            ticketCode: data.ticketCode,
            ticket: data.ticket,
            checkedInAt: data.checkedInAt,
          });
        } else if (data.verdict === "PAYMENT_INELIGIBLE") {
          setVerdict({
            type: "PAYMENT_INELIGIBLE",
            ticketCode: data.ticketCode,
            ticket: data.ticket,
            paymentStatus: data.ticket?.paymentStatus ?? "UNKNOWN",
          });
        } else {
          setVerdict({ type: "INVALID", ticketCode: data.ticketCode });
        }
      } catch {
        // Network unreachable — fall back to local offline policy rather
        // than silently treating the ticket as valid.
        await handleOfflineScan(rawScanValue, eventId, deviceId, setVerdict);
      }
    },
    [eventId, deviceId]
  );

  async function handleCheckIn() {
    if (!verdict || verdict.type !== "VALID" || !eventId) return;
    setCheckingIn(true);

    try {
      const res = await fetch("/api/tickets/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketCode: verdict.ticketCode,
          eventId,
          scannedAt: new Date().toISOString(),
          deviceId,
        }),
      });
      const data = await res.json();

      if (data.outcome === "SUCCESS") {
        setVerdict({
          type: "CHECKED_IN_SUCCESS",
          ticketCode: data.ticket.ticketCode,
          customerName: data.ticket.customerName,
          category: data.ticket.category,
          checkedInAt: data.ticket.checkedInAt,
          staffName: "You",
        });
        refreshRecentScans(eventId).then(setRecentScans);
      } else if (data.outcome === "DUPLICATE" || data.outcome === "SYNC_CONFLICT_REJECTED") {
        setVerdict({ type: "DUPLICATE", ticketCode: verdict.ticketCode, checkedInAt: data.checkedInAt });
      } else if (data.outcome === "PAYMENT_INELIGIBLE") {
        setVerdict({ type: "PAYMENT_INELIGIBLE", ticketCode: verdict.ticketCode, paymentStatus: data.paymentStatus });
      } else {
        setVerdict({ type: "INVALID", ticketCode: verdict.ticketCode });
      }
    } catch {
      setVerdict({ type: "NETWORK_ERROR" });
    } finally {
      setCheckingIn(false);
    }
  }

  function scanNext() {
    setVerdict(null);
  }

  return (
    <main className="flex h-screen flex-col bg-gate-bg p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gate-text">TicketGate</p>
          <p className="text-xs text-gate-textMuted">{eventName || "…"}</p>
        </div>
        <NetworkStatus />
      </header>

      <div className="min-h-0 flex-1">
        {verdict ? (
          <ResultPanel verdict={verdict} onCheckIn={handleCheckIn} onScanNext={scanNext} checkingIn={checkingIn} />
        ) : (
          <CameraScanner onScan={handleScan} onManualEntry={() => setShowManualEntry(true)} paused={false} />
        )}
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto">
        <RecentScans scans={recentScans} />
      </div>

      {showManualEntry && (
        <ManualEntry
          onClose={() => setShowManualEntry(false)}
          onSubmit={(code) => {
            setShowManualEntry(false);
            handleScan(code);
          }}
        />
      )}
    </main>
  );
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const key = "ticketgate_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function refreshRecentScans(eventId: string): Promise<RecentScan[]> {
  try {
    const res = await fetch(`/api/check-ins/recent?eventId=${eventId}`);
    const data = await res.json();
    return data.scans ?? [];
  } catch {
    return [];
  }
}

async function handleOfflineScan(
  rawScanValue: string,
  eventId: string,
  deviceId: string,
  setVerdict: (v: ScanVerdict) => void
) {
  const { extractTicketCode } = await import("@/lib/ticket-code");
  const ticketCode = extractTicketCode(rawScanValue);
  if (!ticketCode) {
    setVerdict({ type: "INVALID" });
    return;
  }

  const offlineResult = await verifyTicketOffline(ticketCode, eventId, getCachedOfflinePolicy(eventId));

  if (offlineResult.verdict === "CANNOT_VERIFY_OFFLINE" || offlineResult.verdict === "OFFLINE_CHECKIN_DISABLED") {
    setVerdict({ type: "NETWORK_ERROR" });
    return;
  }

  if (offlineResult.verdict === "DUPLICATE_PROVISIONAL") {
    setVerdict({ type: "DUPLICATE", ticketCode, checkedInAt: new Date().toISOString() });
    return;
  }

  if (offlineResult.verdict === "PAYMENT_INELIGIBLE_PROVISIONAL") {
    setVerdict({ type: "PAYMENT_INELIGIBLE", ticketCode, paymentStatus: offlineResult.ticket.paymentStatus });
    return;
  }

  // VALID_PROVISIONAL — queue the scan locally; the server has final say
  // once connectivity returns.
  const clientScanId = crypto.randomUUID();
  await offlineDB.scanQueue.add({
    clientScanId,
    ticketCode,
    eventId,
    scannedAt: new Date().toISOString(),
    deviceId,
    localResult: "SUCCESS",
    syncStatus: "PENDING",
  });
  await markCachedTicketCheckedIn(ticketCode);

  setVerdict({ type: "OFFLINE_QUEUED", ticketCode });
}

export default function ScannerPage() {
  return (
    <Suspense fallback={null}>
      <ScannerScreen />
    </Suspense>
  );
}
