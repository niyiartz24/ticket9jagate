import Dexie, { type Table } from "dexie";

/**
 * Local (per-device) offline store. Two tables:
 *
 *  - `ticketCache`: a snapshot of tickets for the currently selected event,
 *    synced down while online so the scanner can still function offline.
 *    This is NOT the source of truth — it's a local mirror used only when
 *    the server is unreachable, subject to the event's offline policy.
 *
 *  - `scanQueue`: scans recorded while offline (or while a live request
 *    failed), waiting to be replayed against /api/sync once connectivity
 *    returns. Each entry carries a `clientScanId` (UUID) generated at scan
 *    time, which the server uses as an idempotency key.
 */

export interface CachedTicket {
  ticketCode: string;
  eventId: string;
  category: string;
  customerName: string;
  amount: number;
  orderReference: string;
  paymentStatus: "SUCCESSFUL" | "PENDING" | "FAILED" | "CANCELLED" | "UNKNOWN";
  ticketStatus: "UNUSED" | "CHECKED_IN" | "VOID";
  cachedAt: number;
}

export interface QueuedScan {
  clientScanId: string; // primary key
  ticketCode: string;
  eventId: string;
  scannedAt: string; // ISO
  deviceId: string;
  localResult: "SUCCESS" | "DUPLICATE" | "INVALID" | "PAYMENT_INELIGIBLE";
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "REJECTED";
  syncedOutcome?: string;
}

class TicketGateOfflineDB extends Dexie {
  ticketCache!: Table<CachedTicket, string>;
  scanQueue!: Table<QueuedScan, string>;

  constructor() {
    super("ticketgate-offline");
    this.version(1).stores({
      ticketCache: "ticketCode, eventId, ticketStatus",
      scanQueue: "clientScanId, eventId, syncStatus, scannedAt",
    });
  }
}

export const offlineDB = new TicketGateOfflineDB();
