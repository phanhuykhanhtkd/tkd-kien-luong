/* =====================================================================
   SERVICE WORKER – giúp web mở nhanh như ứng dụng và xem được khi mạng yếu.
   Mỗi lần sửa CSS/JS, tăng số VERSION lên 1 để điện thoại tải bản mới.
   ===================================================================== */
const VERSION = "v7";
const CACHE = `tkd-${VERSION}`;
const CORE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/config.js",
  "/js/utils.js",
  "/js/api.js",
  "/js/ui.js",
  "/js/home.js",
  "/js/events.js",
  "/js/clubs.js",
  "/js/lookup.js",
  "/js/enroll.js",
  "/assets/logo-96.png",
  "/assets/cover-900.webp",
  "/icons/icon-192.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Apps Script, Google, YouTube: để trình duyệt tự xử lý

  // Trang HTML: ưu tiên mạng (luôn có bản mới nhất), mất mạng thì dùng bản lưu
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // CSS, JS, ảnh: dùng bản lưu ngay, đồng thời cập nhật ngầm
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
