import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { offlineDB } from "@/lib/offline/db";
import { verifyTicketOffline } from "@/lib/offline/policy";

const policy = { allowOfflineCheckIn: true, requireLocalTicketCache: true };
const base = {
  ticketCode: "TKT1", eventId: "e1", category: "Regular", customerName: "A",
  amount: 1, orderReference: "O", paymentStatus: "SUCCESSFUL" as const,
  ticketStatus: "UNUSED" as const, cachedAt: 0,
};

beforeEach(async () => { await offlineDB.ticketCache.clear(); });

describe("7. offline scan", () => {
  it("valid cached ticket is provisionally valid", async () => {
    await offlineDB.ticketCache.put(base);
    expect((await verifyTicketOffline("TKT1", "e1", policy)).verdict).toBe("VALID_PROVISIONAL");
  });
  it("unknown ticket is never treated as valid", async () => {
    expect((await verifyTicketOffline("NOPE", "e1", policy)).verdict).toBe("CANNOT_VERIFY_OFFLINE");
  });
  it("respects disabled policy", async () => {
    await offlineDB.ticketCache.put(base);
    const r = await verifyTicketOffline("TKT1", "e1", { ...policy, allowOfflineCheckIn: false });
    expect(r.verdict).toBe("OFFLINE_CHECKIN_DISABLED");
  });
  it("cached pending payment is ineligible", async () => {
    await offlineDB.ticketCache.put({ ...base, paymentStatus: "PENDING" });
    expect((await verifyTicketOffline("TKT1", "e1", policy)).verdict).toBe("PAYMENT_INELIGIBLE_PROVISIONAL");
  });
});
