/**
 * A scanned QR code might be a bare ticket code (`TKT6AADE8AEA15A2`) or a
 * URL that embeds the code as a path segment or query parameter, depending
 * on how a given event's tickets were generated. This function normalizes
 * both cases into a candidate ticket code — it does NOT validate it against
 * any authoritative source. That happens server-side, always.
 */
export function extractTicketCode(rawScanValue: string): string | null {
  const trimmed = rawScanValue.trim();
  if (!trimmed) return null;

  // Case 1: looks like a bare ticket code already.
  const bareCodeMatch = trimmed.match(/^([A-Za-z0-9\-_]{4,64})$/);
  if (bareCodeMatch) return bareCodeMatch[1].toUpperCase();

  // Case 2: a URL — check query params and path segments for a
  // ticket-code-shaped token, preferring an explicit `ticket`/`code` param.
  try {
    const url = new URL(trimmed);
    const paramCandidate =
      url.searchParams.get("ticket") ||
      url.searchParams.get("code") ||
      url.searchParams.get("ticketCode");
    if (paramCandidate && /^[A-Za-z0-9\-_]{4,64}$/.test(paramCandidate)) {
      return paramCandidate.toUpperCase();
    }

    const segments = url.pathname.split("/").filter(Boolean);
    for (const segment of segments.reverse()) {
      if (/^TKT[A-Za-z0-9\-_]{4,64}$/i.test(segment)) {
        return segment.toUpperCase();
      }
    }
  } catch {
    // Not a URL — fall through.
  }

  // Case 3: last resort — pull the first TKT-prefixed token out of any
  // free-form string (covers barcodes that encode the code with extra
  // surrounding data).
  const embeddedMatch = trimmed.match(/TKT[A-Za-z0-9\-_]{4,64}/i);
  if (embeddedMatch) return embeddedMatch[0].toUpperCase();

  return null;
}
