import { offlineDB } from "./db";
import type { OfflinePolicy } from "./policy";

const POLICY_KEY = (eventId: string) => `ticketgate_offline_policy_${eventId}`;

export async function downloadOfflineCache(eventId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/offline-cache`);
  if (!res.ok) return;
  const { tickets, offlinePolicy } = await res.json();

  await offlineDB.transaction("rw", offlineDB.ticketCache, async () => {
    await offlineDB.ticketCache.where("eventId").equals(eventId).delete();
    await offlineDB.ticketCache.bulkPut(tickets);
  });
  localStorage.setItem(POLICY_KEY(eventId), JSON.stringify(offlinePolicy));
}

export function getCachedOfflinePolicy(eventId: string): OfflinePolicy {
  try {
    const raw = localStorage.getItem(POLICY_KEY(eventId));
    if (raw) return JSON.parse(raw) as OfflinePolicy;
  } catch {}
  // Conservative default when no policy was ever downloaded.
  return { allowOfflineCheckIn: false, requireLocalTicketCache: true };
}
