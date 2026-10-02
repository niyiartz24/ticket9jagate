import { offlineDB } from "./db";

export type SyncStatus = "IDLE" | "SYNCING" | "SYNC_COMPLETE" | "SYNC_ERROR";

/**
 * Drains the local scan queue against /api/sync. Safe to call repeatedly
 * (e.g. on every 'online' event and on an interval) — already-synced items
 * are skipped, and the server treats each clientScanId idempotently, so a
 * retried batch never double-applies a check-in.
 */
export async function syncQueuedScans(
  onStatusChange?: (status: SyncStatus) => void
): Promise<void> {
  const pending = await offlineDB.scanQueue.where("syncStatus").equals("PENDING").toArray();
  if (pending.length === 0) return;

  onStatusChange?.("SYNCING");

  try {
    await offlineDB.scanQueue.bulkPut(pending.map((s) => ({ ...s, syncStatus: "SYNCING" as const })));

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scans: pending.map((s) => ({
          clientScanId: s.clientScanId,
          ticketCode: s.ticketCode,
          eventId: s.eventId,
          scannedAt: s.scannedAt,
          deviceId: s.deviceId,
          localResult: s.localResult,
        })),
      }),
    });

    if (!res.ok) throw new Error("Sync request failed");

    const { results } = (await res.json()) as {
      results: Array<{ clientScanId: string; outcome: string }>;
    };

    await Promise.all(
      results.map((r) =>
        offlineDB.scanQueue.update(r.clientScanId, {
          syncStatus: "SYNCED",
          syncedOutcome: r.outcome,
        })
      )
    );

    onStatusChange?.("SYNC_COMPLETE");
  } catch {
    // Leave items as SYNCING → reset to PENDING so the next attempt retries them.
    await offlineDB.scanQueue.bulkPut(pending.map((s) => ({ ...s, syncStatus: "PENDING" as const })));
    onStatusChange?.("SYNC_ERROR");
  }
}

export function registerAutoSync(onStatusChange?: (status: SyncStatus) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => void syncQueuedScans(onStatusChange);
  window.addEventListener("online", handler);
  const interval = setInterval(handler, 30_000);

  // Attempt once immediately in case we're already online with a backlog.
  if (navigator.onLine) handler();

  return () => {
    window.removeEventListener("online", handler);
    clearInterval(interval);
  };
}
