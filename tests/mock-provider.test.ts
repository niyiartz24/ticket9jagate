import { describe, it, expect } from "vitest";
import { MockTicketProvider } from "@/lib/integrations/mock/mock-provider";

const provider = new MockTicketProvider();

describe("MockTicketProvider scenarios", () => {
  it("1. valid ticket", async () => {
    const r = await provider.getTicket("TKT6AADE8AEA15A2");
    expect(r.found && r.ticket.paymentStatus).toBe("SUCCESSFUL");
  });
  it("2. invalid ticket", async () => {
    expect((await provider.getTicket("TKTDOESNOTEXIST")).found).toBe(false);
  });
  it("3. already-used ticket", async () => {
    const r = await provider.getTicket("TKT7XYZ123456789");
    expect(r.found && r.ticket.providerCheckedIn).toBe(true);
  });
  it("4. pending payment", async () => {
    const r = await provider.getTicket("TKTPENDINGPAY001");
    expect(r.found && r.ticket.paymentStatus).toBe("PENDING");
  });
  it("5. failed payment", async () => {
    const r = await provider.getTicket("TKTFAILEDPAY0001");
    expect(r.found && r.ticket.paymentStatus).toBe("FAILED");
  });
});
