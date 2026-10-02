// TicketGate service worker
// ---------------------------------------------------------------------------
// Caches only the static application shell. Anything under /api/ — most
// importantly /api/tickets/verify and /api/tickets/check-in — is NEVER
// cached: a stale cached "VALID" verification response would be a serious
// security bug. Those requests always go to the network, and offline
// availability for scanning is instead handled by the app's own IndexedDB
// layer (see src/lib/offline/), not by the service worker.

const SHELL_CACHE = "ticketgate-shell-v1";
const SHELL_ASSETS = ["/scanner", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls — always hit the network so verification and
  // check-in results are never served from a cache.
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).catch(() => caches.match("/scanner"))
    )
  );
});
