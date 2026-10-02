import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight redirect guard at the edge. This is a UX convenience only —
 * it checks for the mere presence of the session cookie, not its validity
 * or role, because jose's JWT verification needs the Node.js runtime and
 * middleware runs on the Edge runtime. Every actual authorization decision
 * (role checks included) is enforced again, authoritatively, in
 * requireSession()/requireRole() inside each API route and server
 * component — this middleware must never be the only gate.
 */

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ticketgate_session";
const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(COOKIE_NAME);
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
