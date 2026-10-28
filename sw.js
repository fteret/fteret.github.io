const CACHE = "live-web-v2";
const SHELL = ["./", "./manifest.webmanifest", "./live-mark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("live-web-") && key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const root = new URL(self.registration.scope);
  if (url.origin !== root.origin || url.search) return;
  const path = url.pathname.slice(root.pathname.length);
  if (!url.pathname.startsWith(root.pathname)) return;
  const navigation = event.request.mode === "navigate" && (path === "" || path === "index.html");
  const asset = path.startsWith("assets/") || ["manifest.webmanifest", "live-mark.svg"].includes(path);
  if (!navigation && !asset) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic" && !response.redirected && !/no-store|private/i.test(response.headers.get("Cache-Control") || "")) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        const response = await cache.match(event.request);
        return response || (navigation && await cache.match("./")) || Response.error();
      })
  );
});
