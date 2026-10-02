/**
 * MockTicketProvider — DEVELOPMENT / TESTING ONLY.
 * ---------------------------------------------------------------------------
 * This is a fixed, in-memory stand-in for BudPay's ticketing system so the
 * rest of TicketGate (scanner, check-in transaction, offline sync) can be
 * built and tested before real BudPay credentials/docs exist.
 *
 * It must NEVER be used in production. `getTicketProvider()` refuses to
 * return this provider unless USE_MOCK_TICKET_PROVIDER=true, and the admin
 * settings UI must visibly flag when a non-BudPay provider is active.
 */

import type {
  AuthoritativeTicket,
  TicketLookupResult,
  TicketProvider,
} from "../ticket-provider";

// Fixed dataset covering every scenario named in the spec's test-case list.
const MOCK_TICKETS: Record<string, AuthoritativeTicket & { providerCheckedIn: boolean }> = {
  TKT6AADE8AEA15A2: {
    ticketCode: "TKT6AADE8AEA15A2",
    externalTicketId: "ext_6aade8aea15a2",
    category: "Early Bird",
    customerName: "Ayotunde Ayotunde",
    customerEmail: "ayotunde@example.com",
    amount: 7300,
    quantity: 1,
    orderReference: "EVT-LB0CUTWK9O8Q",
    paymentStatus: "SUCCESSFUL",
    providerCheckedIn: false,
  },
  TKT7XYZ123456789: {
    ticketCode: "TKT7XYZ123456789",
    externalTicketId: "ext_7xyz123456789",
    category: "Regular",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    amount: 12000,
    quantity: 1,
    orderReference: "EVT-AB12CD34EF56",
    paymentStatus: "SUCCESSFUL",
    providerCheckedIn: true, // already used — exercises the duplicate path
  },
  TKTPENDINGPAY001: {
    ticketCode: "TKTPENDINGPAY001",
    category: "VIP",
    customerName: "Chidi Okafor",
    customerEmail: "chidi@example.com",
    amount: 25000,
    quantity: 1,
    orderReference: "EVT-PENDING0001",
    paymentStatus: "PENDING",
    providerCheckedIn: false,
  },
  TKTFAILEDPAY0001: {
    ticketCode: "TKTFAILEDPAY0001",
    category: "Regular",
    customerName: "Blessing Eze",
    customerEmail: "blessing@example.com",
    amount: 12000,
    quantity: 1,
    orderReference: "EVT-FAILED00001",
    paymentStatus: "FAILED",
    providerCheckedIn: false,
  },
  TKTCANCELLED0001: {
    ticketCode: "TKTCANCELLED0001",
    category: "Regular",
    customerName: "Segun Bello",
    customerEmail: "segun@example.com",
    amount: 12000,
    quantity: 1,
    orderReference: "EVT-CANCEL00001",
    paymentStatus: "CANCELLED",
    providerCheckedIn: false,
  },
};

function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));
}

export class MockTicketProvider implements TicketProvider {
  readonly name = "Mock Provider (development only)";

  async getTicket(ticketCode: string): Promise<TicketLookupResult> {
    await simulateLatency();
    const record = MOCK_TICKETS[ticketCode.trim().toUpperCase()];
    if (!record) {
      return { found: false, reason: "NOT_FOUND" };
    }
    return { found: true, ticket: { ...record, raw: record } };
  }

  async getTicketStatus(ticketCode: string) {
    const result = await this.getTicket(ticketCode);
    if (!result.found) return { found: false as const };
    return {
      found: true as const,
      paymentStatus: result.ticket.paymentStatus,
      providerCheckedIn: result.ticket.providerCheckedIn,
    };
  }

  async markTicketAsCheckedIn(ticketCode: string) {
    const record = MOCK_TICKETS[ticketCode.trim().toUpperCase()];
    if (record) record.providerCheckedIn = true;
    return { acknowledged: true, message: "Mock provider updated in-memory state." };
  }
}
