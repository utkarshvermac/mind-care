// MindCare offline app-shell service worker.
//
// Goal (see NEW_FEATURES.md "Offline resilience"): if the connection drops
// briefly, the app should still *load* — without live data — instead of
// showing the browser's offline error page. This is not a full precaching
// solution (Next.js's hashed build assets aren't known ahead of time here),
// so the strategy is deliberately simple:
//
//   - Never touch API calls (anything to the backend) — those should fail
//     normally so the app's own "offline" UI states (already built into
//     each screen) can take over.
//   - For same-origin page navigations and static assets, use a
//     network-first strategy and stash a copy of whatever succeeds. If the
//     network fails, serve the most recent cached copy of that request, or
//     fall back to the cached shell page as a last resort.

const CACHE_NAME = "mindcare-shell-v1"
const SHELL_URL = "/dashboard"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(["/", SHELL_URL, "/manifest.json", "/icon.svg"]))
      .catch(() => {
        /* best-effort — an offline-first install shouldn't block activation */
      }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (isApiRequest(url)) return // let API calls hit the network directly and fail normally if offline

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const shell = await caches.match(SHELL_URL)
        if (shell) return shell
        return caches.match("/")
      }),
  )
})
