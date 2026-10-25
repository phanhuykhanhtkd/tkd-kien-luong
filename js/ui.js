/* =====================================================================
   THÀNH PHẦN GIAO DIỆN: hộp thoại (bottom sheet), xem ảnh, thông báo
   - Nút "Quay lại" của điện thoại sẽ ĐÓNG hộp thoại thay vì rời trang.
   - Vuốt xuống để đóng hộp thoại, vuốt ngang để chuyển ảnh.
   ===================================================================== */
import { $, $$, esc, reducedMotion } from "./utils.js";

/* ---------------- Khoá cuộn trang (ổn định cả trên iPhone) ---------------- */
let lockCount = 0;
let savedY = 0;
function lockScroll() {
  if (lockCount++ > 0) return;
  savedY = window.scrollY;
  document.body.style.top = `-${savedY}px`;
  document.body.classList.add("scroll-locked");
}
function unlockScroll() {
  if (--lockCount > 0) return;
  lockCount = 0;
  document.body.classList.remove("scroll-locked");
  document.body.style.top = "";
  window.scrollTo(0, savedY);
}

/* ---------------- Ngăn xếp lớp phủ + lịch sử trình duyệt ---------------- */
const stack = [];
let closing = false;

function pushOverlay(entry) {
  stack.push(entry);
  history.pushState({ overlay: stack.length }, "");
}
function closeTop() {
  const top = stack.pop();
  if (top) top.close();
}
window.addEventListener("popstate", () => {
  closing = false;
  if (stack.length) closeTop();
});
/** Đóng lớp trên cùng (đi qua history để nút Back luôn đồng bộ) */
export function requestClose() {
  if (!stack.length || closing) return;
  closing = true;
  history.back();
  setTimeout(() => {
    // một số trình duyệt nhúng (Zalo, Facebook) đôi khi không bắn popstate
    if (closing) {
      closing = false;
      closeTop();
    }
  }, 400);
}
/** Đóng tất cả lớp phủ mà không đụng tới lịch sử (dùng khi chuyển trang) */
export function closeAllOverlays() {
  while (stack.length) closeTop();
}
export const hasOverlay = () => stack.length > 0;

/* ---------------- Hộp thoại (bottom sheet trên điện thoại) ---------------- */
const sheet = () => $("#sheet");
let lastFocus = null;

export function openSheet(title, html, { wide = false } = {}) {
  const el = sheet();
  const already = el.classList.contains("open");
  $("#sheet-title").textContent = title;
  const body = $("#sheet-body");
  body.innerHTML = html;
  body.scrollTop = 0;
  el.querySelector(".sheet-panel").classList.toggle("sheet-wide", wide);
  el.querySelector(".sheet-panel").classList.remove("sheet-full");
  if (already) return; // thay nội dung, không mở thêm lớp
  lastFocus = document.activeElement;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("open"));
  lockScroll();
  pushOverlay({ close: closeSheetNow });
  setTimeout(() => $(".sheet-close", el)?.focus({ preventScroll: true }), 50);
}

function closeSheetNow() {
  const el = sheet();
  el.classList.remove("open");
  const done = () => {
    if (el.classList.contains("open")) return;
    el.hidden = true;
    $("#sheet-body").innerHTML = ""; // dừng video đang phát
  };
  reducedMotion() ? done() : setTimeout(done, 260);
  unlockScroll();
  lastFocus?.focus?.({ preventScroll: true });
}

/* Vuốt xuống ở phần đầu hộp thoại để đóng */
function initSheetDrag() {
  const panel = $("#sheet .sheet-panel");
  const handle = $("#sheet .sheet-head");
  let startY = 0;
  let dy = 0;
  let dragging = false;
  handle.addEventListener(
    "touchstart",
    (e) => {
      dragging = true;
      startY = e.touches[0].clientY;
      dy = 0;
      panel.style.transition = "none";
    },
    { passive: true },
  );
  handle.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      panel.style.transform = `translateY(${dy}px)`;
    },
    { passive: true },
  );
  handle.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "";
    panel.style.transform = "";
    if (dy > 90) requestClose();
  });
}

/* ---------------- Xem ảnh toàn màn hình ---------------- */
const lb = { items: [], index: 0, open: false };

export function openLightbox(items, index = 0) {
  lb.items = items;
  lb.index = index;
  const el = $("#lightbox");
  renderLightbox();
  if (lb.open) return;
  lb.open = true;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("open"));
  lockScroll();
  pushOverlay({ close: closeLightboxNow });
  setTimeout(() => $(".lb-close", el)?.focus({ preventScroll: true }), 50);
}

function renderLightbox() {
  const it = lb.items[lb.index];
  if (!it) return;
  const el = $("#lightbox");
  const imgEl = $(".lb-img", el);
  imgEl.classList.add("loading");
  imgEl.onload = () => imgEl.classList.remove("loading");
  imgEl.src = it.full;
  imgEl.alt = it.cap || "Hình ảnh hoạt động";
  $(".lb-cap", el).textContent = it.cap || "";
  $(".lb-count", el).textContent = lb.items.length > 1 ? `${lb.index + 1} / ${lb.items.length}` : "";
  $$(".lb-nav", el).forEach((b) => (b.hidden = lb.items.length < 2));
  // tải trước ảnh kế bên cho mượt
  [lb.index + 1, lb.index - 1].forEach((i) => {
    const n = lb.items[(i + lb.items.length) % lb.items.length];
    if (n) new Image().src = n.full;
  });
}

export function lightboxStep(d) {
  if (lb.items.length < 2) return;
  lb.index = (lb.index + d + lb.items.length) % lb.items.length;
  renderLightbox();
}

function closeLightboxNow() {
  const el = $("#lightbox");
  lb.open = false;
  el.classList.remove("open");
  setTimeout(() => {
    if (!lb.open) {
      el.hidden = true;
      $(".lb-img", el).removeAttribute("src");
    }
  }, 220);
  unlockScroll();
}

function initLightboxSwipe() {
  const el = $("#lightbox");
  let x0 = 0;
  let y0 = 0;
  el.addEventListener(
    "touchstart",
    (e) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    },
    { passive: true },
  );
  el.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) lightboxStep(dx < 0 ? 1 : -1);
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx)) requestClose();
  });
}

/* ---------------- Thông báo nhỏ (toast) ---------------- */
let toastTimer;
export function toast(msg, type = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast toast-${type}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

export async function copyText(text, label = "") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast(`✓ Đã sao chép${label ? " " + label : ""}`);
}

/* ---------------- Khung trạng thái dùng chung ---------------- */
export function skeleton(n = 3, type = "card") {
  return Array.from({ length: n }, () => `<div class="skel skel-${type}" aria-hidden="true"></div>`).join("");
}

export function stateBox(el, type, msg, retry) {
  if (!el) return;
  const icon = { empty: "🔍", error: "⚠️", info: "💡" }[type] || "💡";
  el.innerHTML = `<div class="state state-${type}">
      <div class="state-icon" aria-hidden="true">${icon}</div>
      <p>${esc(msg)}</p>
      ${retry ? '<button type="button" class="btn btn-outline btn-sm js-retry">Thử lại</button>' : ""}
    </div>`;
  if (retry) $(".js-retry", el).addEventListener("click", retry);
}

/* ---------------- Hiệu ứng hiện dần khi cuộn (G2) ---------------- */
const REVEAL_SEL = [
  ".section-title", ".section-intro", ".value-card", ".mosaic-item", ".more-photos", ".video-card",
  ".news-card", ".teaser", ".belt-item", ".faq-item", ".cta-banner", ".loc-card", ".person",
  ".ev-card", ".ev-hero", ".profile", ".enroll-widget", ".album-card", ".search",
].join(",");

function initReveal() {
  if (reducedMotion() || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("rv-on");
  const io = new IntersectionObserver(
    (entries) => {
      let k = 0;
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.style.setProperty("--rv-d", `${Math.min(k++ * 70, 350)}ms`);
        el.classList.add("in");
        io.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
  );
  const scan = (root) => {
    if (!(root instanceof Element)) return;
    const list = root.matches?.(REVEAL_SEL) ? [root] : [];
    list.push(...root.querySelectorAll(REVEAL_SEL));
    list.forEach((el) => {
      if (el.classList.contains("rv")) return;
      el.classList.add("rv");
      io.observe(el);
    });
  };
  scan(document.body);
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan))).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* ---------------- Thanh tiến trình trên cùng khi đang tải dữ liệu ---------------- */
function initTopbar() {
  const bar = $("#topbar");
  if (!bar) return;
  let t;
  document.addEventListener("net", (e) => {
    clearTimeout(t);
    if (e.detail.busy) {
      bar.classList.remove("done");
      bar.classList.add("run");
    } else {
      bar.classList.add("done");
      t = setTimeout(() => bar.classList.remove("run", "done"), 450);
    }
  });
}

/* ---------------- Khởi tạo ---------------- */
export function initUI() {
  initReveal();
  initTopbar();
  initSheetDrag();
  initLightboxSwipe();

  $("#sheet").addEventListener("click", (e) => {
    if (e.target.id === "sheet") requestClose(); // bấm nền tối
  });

  document.addEventListener("keydown", (e) => {
    if (!stack.length) return;
    if (e.key === "Escape") return requestClose();
    if (lb.open && e.key === "ArrowRight") return lightboxStep(1);
    if (lb.open && e.key === "ArrowLeft") return lightboxStep(-1);
    if (e.key === "Tab") {
      const root = lb.open ? $("#lightbox") : $("#sheet");
      const items = $$("button, a[href], input, select, textarea, iframe, [tabindex]:not([tabindex='-1'])", root).filter(
        (x) => x.offsetParent !== null && !x.disabled,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
