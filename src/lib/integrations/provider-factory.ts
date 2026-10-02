import type { TicketProvider } from "./ticket-provider";
import { MockTicketProvider } from "./mock/mock-provider";
import { BudPayTicketProvider } from "./budpay/budpay-provider";

let cached: TicketProvider | null = null;

/**
 * The only place in the app that decides which TicketProvider is active.
 * Everything else (API routes, check-in transaction) calls this and works
 * against the TicketProvider interface only.
 */
export function getTicketProvider(): TicketProvider {
  if (cached) return cached;

  const useMock =
    process.env.USE_MOCK_TICKET_PROVIDER === "true" ||
    !process.env.BUDPAY_API_KEY ||
    !process.env.BUDPAY_SECRET_KEY ||
    !process.env.BUDPAY_BASE_URL;

  if (useMock) {
    if (process.env.NODE_ENV === "production") {
      // Loud, not silent: production must never quietly serve mock tickets.
      // eslint-disable-next-line no-console
      console.warn(
        "[TicketGate] WARNING: running with MockTicketProvider in production. " +
          "Configure BUDPAY_API_KEY / BUDPAY_SECRET_KEY / BUDPAY_BASE_URL and " +
          "set USE_MOCK_TICKET_PROVIDER=false before going live."
      );
    }
    cached = new MockTicketProvider();
    return cached;
  }

  cached = new BudPayTicketProvider();
  return cached;
}

/** Exposed for the admin integrations settings page. */
export function getActiveProviderName(): string {
  return getTicketProvider().name;
}
