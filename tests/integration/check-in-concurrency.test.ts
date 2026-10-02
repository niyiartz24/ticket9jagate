/**
 * Requires a real Postgres (DATABASE_URL pointing at a disposable test DB
 * with migrations applied). Run: npm run test:integration
 */
import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db/client";
import { runCheckIn } from "@/lib/db/check-in-transaction";
import { randomUUID } from "crypto";

let eventId = "", staffA = "", staffB = "";

async function makeTicket(code: string, paymentStatus: "SUCCESSFUL" | "PENDING" = "SUCCESSFUL") {
  await prisma.ticket.create({
    data: { ticketCode: code, eventId, category: "R", customerName: "T", customerEmail: "t@x.com",
      amount: 1, orderReference: "O", paymentStatus },
  });
}

beforeAll(async () => {
  const ev = await prisma.event.create({ data: { name: "IT", venue: "V", eventDate: new Date(), status: "ACTIVE" } });
  eventId = ev.id;
  const a = await prisma.user.create({ data: { name: "A", email: `a${randomUUID()}@t.io`, passwordHash: "x", role: "STAFF" } });
  const b = await prisma.user.create({ data: { name: "B", email: `b${randomUUID()}@t.io`, passwordHash: "x", role: "STAFF" } });
  staffA = a.id; staffB = b.id;
});

describe("6. duplicate simultaneous check-in", () => {
  it("exactly one of two concurrent check-ins succeeds", async () => {
    const code = `TKTRACE${Date.now()}`;
    await makeTicket(code);
    const mk = (staffId: string) => runCheckIn({ ticketCode: code, eventId, staffId, scannedAt: new Date() });
    const results = await Promise.all([mk(staffA), mk(staffB)]);
    expect(results.filter((r) => r.outcome === "SUCCESS")).toHaveLength(1);
    expect(results.filter((r) => r.outcome === "DUPLICATE")).toHaveLength(1);
  });
});

describe("payment eligibility", () => {
  it("rejects pending payment", async () => {
    const code = `TKTPEND${Date.now()}`;
    await makeTicket(code, "PENDING");
    const r = await runCheckIn({ ticketCode: code, eventId, staffId: staffA, scannedAt: new Date() });
    expect(r.outcome).toBe("PAYMENT_INELIGIBLE");
  });
});

describe("8. sync conflict", () => {
  it("second offline sync of same ticket is rejected as conflict; retry is idempotent", async () => {
    const code = `TKTSYNC${Date.now()}`;
    await makeTicket(code);
    const idA = randomUUID(), idB = randomUUID();
    const first = await runCheckIn({ ticketCode: code, eventId, staffId: staffA, scannedAt: new Date(), clientScanId: idA });
    const second = await runCheckIn({ ticketCode: code, eventId, staffId: staffB, scannedAt: new Date(), clientScanId: idB });
    const retry = await runCheckIn({ ticketCode: code, eventId, staffId: staffB, scannedAt: new Date(), clientScanId: idB });
    expect(first.outcome).toBe("SUCCESS");
    expect(second.outcome).toBe("SYNC_CONFLICT_REJECTED");
    expect(retry.outcome).toBe("SYNC_CONFLICT_REJECTED");
  });
});
