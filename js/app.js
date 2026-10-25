/* =====================================================================
   ĐIỀU PHỐI CHÍNH: định tuyến, sự kiện, giao diện sáng/tối, PWA
   ===================================================================== */
import { $, $$, store } from "./utils.js";
import { CONFIG } from "./config.js";
import { loadPublic, onPublicData, getPublic } from "./api.js";
import {
  initUI, requestClose, closeAllOverlays, hasOverlay, lightboxStep, copyText, toast, openSheet,
} from "./ui.js";
import {
  renderHome, homeSkeleton, homeError, openNews, openNewsImage, openNewsBySlug, playVideo, toggleMore,
  openAlbum, openPhoto, showBelt, openPreviewPhoto, openAlbumList,
} from "./home.js";
import { renderEvents, eventsLoading, eventsError, downloadIcs } from "./events.js";
import { renderClubs, switchTeamTab, clubsLoading, clubsError } from "./clubs.js";
import { runLookup, switchProfileTab } from "./lookup.js";
import { initEnroll, setClubs, preselectClub, handleEnrollAction, applyDraftClub } from "./enroll.js";

/* ============================ ĐỊNH TUYẾN ============================ */
const ROUTES = {
  "": { view: "home", nav: "home", title: "Taekwondo Kiên Lương" },
  "tra-cuu": { view: "lookup", nav: "lookup", title: "Tra cứu hội viên" },
  lich: { view: "events", nav: "events", title: "Lịch sự kiện" },
  "co-so": { view: "clubs", nav: "clubs", title: "Cơ sở tập luyện" },
  hlv: { view: "clubs", nav: "clubs", title: "Hội đồng chuyên môn", anchor: "#team" },
  "dang-ky": { view: "enroll", nav: "enroll", title: "Ghi danh nhập học" },
};
let pendingNews = null;
let currentView = "";

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { parts, params: new URLSearchParams(query) };
}

function route() {
  if (hasOverlay()) closeAllOverlays();
  const { parts, params } = parseHash();
  let key = parts[0] || "";

  if (key === "tin" && parts[1]) {
    pendingNews = parts[1];
    key = "";
  }
  const r = ROUTES[key] || ROUTES[""];
  const changed = r.view !== currentView;
  const first = currentView === "";
  currentView = r.view;

  $$(".view").forEach((v) => (v.hidden = v.dataset.view !== r.view));
  $$("[data-route]").forEach((a) => {
    const on = a.dataset.route === r.nav;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = r.nav === "home" ? "Taekwondo Kiên Lương – Cổng thông tin CLB võ thuật" : `${r.title} · Taekwondo Kiên Lương`;

  // Chuyển trang: lên đầu trang; có điểm neo (VD #/hlv) thì cuộn tới đó
  const target = r.anchor ? $(r.anchor) : null;
  if (target) setTimeout(() => target.scrollIntoView({ behavior: first ? "auto" : "smooth", block: "start" }), first ? 300 : 30);
  else if (changed && !first) window.scrollTo(0, 0);

  if (r.nav === "enroll") {
    if (params.has("clb")) preselectClub(Number(params.get("clb")));
    if (params.get("type") === "trial") handleEnrollAction("en-type", { dataset: { type: "trial" } });
  }
  tryOpenPendingNews();
}

function tryOpenPendingNews() {
  if (!pendingNews || !getPublic()) return;
  const s = pendingNews;
  pendingNews = null;
  if (!openNewsBySlug(s)) toast("Bản tin không còn tồn tại", "error");
}

/* ============================ HÀNH ĐỘNG ============================ */
const ACTIONS = {
  news: (el) => openNews(+el.dataset.index),
  "news-img": (el) => openNewsImage(+el.dataset.news, +el.dataset.index),
  "play-video": (el) => playVideo(el),
  "toggle-more": (el) => toggleMore(el.dataset.list),
  album: (el) => openAlbum(+el.dataset.index),
  photo: (el) => openPhoto(+el.dataset.album, +el.dataset.index),
  "preview-photo": (el) => openPreviewPhoto(+el.dataset.index),
  "all-albums": () => openAlbumList(),
  belt: (el) => showBelt(+el.dataset.index),
  copy: (el) => copyText(el.dataset.copy, el.dataset.label || ""),
  share: (el) => navigator.share?.({ title: el.dataset.title, url: el.dataset.url }).catch(() => {}),
  "share-fb": (el) =>
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(el.dataset.url)}`, "_blank", "noopener,width=600,height=520"),
  ptab: (el) => switchProfileTab(el),
  "team-tab": (el) => switchTeamTab(el),
  ics: (el) => downloadIcs(+el.dataset.index),
  theme: () => toggleTheme(),
  "back-to-top": () => window.scrollTo({ top: 0, behavior: "smooth" }),
  close: () => requestClose(),
  "lb-prev": () => lightboxStep(-1),
  "lb-next": () => lightboxStep(1),
  "read-more": (el) => {
    const p = el.previousElementSibling;
    const open = p.classList.toggle("expanded");
    el.textContent = open ? "Thu gọn" : "Đọc tiếp";
    el.setAttribute("aria-expanded", String(open));
  },
  install: () => promptInstall(),
};
["en-type", "en-step", "en-email-toggle", "enroll-again", "size-guide"].forEach(
  (a) => (ACTIONS[a] = (el) => handleEnrollAction(a, el)),
);

function bindEvents() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.action];
    if (!fn) return;
    if (el.tagName === "A") e.preventDefault();
    fn(el, e);
  });

  $("#lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#lookup-input").value;
    $("#lookup-input").blur(); // ẩn bàn phím điện thoại để thấy kết quả
    runLookup(q);
  });

  window.addEventListener("hashchange", route);

  // Nút lên đầu trang + thu gọn header khi cuộn
  const top = $("#back-to-top");
  const header = $(".header");
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        top.classList.toggle("show", y > 500);
        header.classList.toggle("scrolled", y > 8);
        ticking = false;
      });
    },
    { passive: true },
  );
}

/* ============================ CHỮ CHẠY (giữ như bản cũ) ============================ */
function runTypewriter() {
  const el = $("#typewriter-text");
  if (!el) return;
  const phrases = [
    "CHÀO MỪNG BẠN ĐẾN TAEKWONDO KIÊN LƯƠNG",
    "NƠI NUÔI DƯỠNG ĐAM MÊ VÕ THUẬT",
    "NƠI RÈN Ý CHÍ - KỶ LUẬT - SỨC KHỎE - PHÁT TRIỂN",
  ];
  // Chạy liên tục, không dừng (kể cả khi máy tắt hiệu ứng chuyển động)
  let p = 0;
  let c = 0;
  let del = false;
  (function type() {
    const full = phrases[p];
    c += del ? -1 : 1;
    el.textContent = full.substring(0, c);
    let speed = del ? 35 : 75;
    if (!del && c === full.length) {
      del = true;
      speed = 1600;
    } else if (del && c === 0) {
      del = false;
      p = (p + 1) % phrases.length;
      speed = 350;
    }
    setTimeout(type, speed);
  })();
}

function hideLoader() {
  $("#loading-screen")?.classList.add("loader-hidden");
}

/* ============================ GIAO DIỆN SÁNG / TỐI ============================ */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $("#theme-toggle").setAttribute("aria-label", t === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối");
  $('meta[name="theme-color"]').setAttribute("content", t === "dark" ? "#121212" : "#0b3c5d");
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  store.set("tkd_theme", next);
}
function initTheme() {
  const saved = store.get("tkd_theme");
  applyTheme(saved === "dark" || saved === "light" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

/* ============================ CÀI ĐẶT ỨNG DỤNG (PWA) ============================ */
let installEvent = null;
function initPwa() {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    $$(".install-btn").forEach((b) => (b.hidden = false));
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    $$(".install-btn").forEach((b) => (b.hidden = true));
    toast("Đã cài ứng dụng Taekwondo Kiên Lương");
  });
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !standalone) $$(".install-btn").forEach((b) => (b.hidden = false));
}
async function promptInstall() {
  if (installEvent) {
    installEvent.prompt();
    await installEvent.userChoice.catch(() => {});
    installEvent = null;
    return;
  }
  openSheet(
    "Cài ứng dụng lên điện thoại",
    `<ol class="steps">
      <li>Mở trang này bằng <strong>Safari</strong> (iPhone) hoặc <strong>Chrome</strong> (Android).</li>
      <li>Bấm nút <strong>Chia sẻ</strong> <span aria-hidden="true">⎙</span> (iPhone) hoặc menu <strong>⋮</strong> (Android).</li>
      <li>Chọn <strong>“Thêm vào MH chính”</strong> / <strong>“Cài đặt ứng dụng”</strong>.</li>
    </ol>
    <p class="small muted">Biểu tượng võ đường sẽ xuất hiện trên màn hình chính, mở nhanh như một ứng dụng.</p>`,
  );
}

/* ============================ DỮ LIỆU ============================ */
function loadAll() {
  loadPublic().catch(() => {
    if (getPublic()) return toast("Đang hiển thị dữ liệu đã lưu – chưa cập nhật được bản mới", "error");
    homeError(loadAll);
    eventsError(loadAll);
    clubsError(loadAll);
  });
}

/* ============================ KHỞI ĐỘNG ============================ */
function testBanner() {
  if (CONFIG.MOI_TRUONG !== "thu") return;
  const b = document.createElement("div");
  b.className = "test-banner";
  b.textContent = CONFIG.CHUA_DAN_URL_THU
    ? "⚠️ BẢN THỬ – chưa dán URL_THU trong js/config.js"
    : "BẢN THỬ NGHIỆM – dữ liệu từ Sheet bản sao";
  document.body.prepend(b);
}

function init() {
  testBanner();
  initTheme();
  initUI();
  bindEvents();
  initEnroll();
  initPwa();
  $("#year").textContent = new Date().getFullYear();

  homeSkeleton();
  eventsLoading();
  clubsLoading();

  onPublicData((data) => {
    renderHome(data);
    renderEvents(data);
    renderClubs(data);
    setClubs(data.clubs || []);
    applyDraftClub();
    tryOpenPendingNews();
  });

  runTypewriter();
  route();
  loadAll();
  document.documentElement.classList.add("ready");
  // Màn hình chờ: tắt ngay khi nội dung sẵn sàng (tối thiểu 0,6 giây cho mượt, tối đa 2,5 giây)
  const t0 = Date.now();
  onPublicData(() => setTimeout(hideLoader, Math.max(0, 600 - (Date.now() - t0))));
  setTimeout(hideLoader, 2500);
}

init();
