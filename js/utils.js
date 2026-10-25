/* =====================================================================
   TIỆN ÍCH DÙNG CHUNG
   ===================================================================== */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escape mọi dữ liệu trước khi đưa vào HTML (chống XSS) */
export const esc = (v) => (v === null || v === undefined ? "" : String(v)).replace(/[&<>"']/g, (c) => ESC[c]);
export const str = (v) => (v === null || v === undefined ? "" : String(v)).trim();
export const orDash = (v) => (str(v) ? esc(str(v)) : "—");
export const multiline = (v) => esc(str(v)).replace(/\r?\n/g, "<br>");

/** Bỏ dấu, chữ thường, chỉ giữ a-z0-9 */
export const norm = (s) =>
  !s
    ? ""
    : String(s)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

export const slug = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function safeUrl(url) {
  try {
    const u = new URL(str(url));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

/* ---------------- Ngày giờ ---------------- */
export const pad = (n) => String(n).padStart(2, "0");

export function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  const s = str(val);
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); // dd/mm/yyyy
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); // yyyy-mm-dd → giờ địa phương
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function formatDate(val) {
  const d = toDate(val);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : str(val);
}

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
export const weekday = (d) => WEEKDAYS[d.getDay()];

/** "17:30" → [17, 30] */
export function parseTime(t) {
  const m = str(t).match(/(\d{1,2})[:hH.](\d{2})?/);
  return m ? [Math.min(23, +m[1]), Math.min(59, +(m[2] || 0))] : null;
}

/* ---------------- Số, tiền, SĐT ---------------- */
export const toNumber = (v) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const money = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export function normalizePhone(v) {
  let p = String(v || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length === 11) p = "0" + p.slice(2);
  p = p.replace(/\D/g, "");
  if (p.length === 9 && !p.startsWith("0")) p = "0" + p; // Sheets hay làm mất số 0 đầu
  return p;
}
export const PHONE_RE = /^(0[35789]\d{8}|02\d{9})$/;

/* ---------------- Danh sách trong 1 ô ---------------- */
export const splitList = (s) =>
  str(s)
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
export const splitCaptions = (s) => {
  const t = str(s);
  return (t.includes("\n") ? t.split(/\r?\n/) : t.split(",")).map((x) => x.trim());
};

/* ---------------- Google Drive & YouTube ---------------- */
export function driveId(url) {
  const m = str(url).match(/(?:\/d\/|[?&]id=)([\w-]{10,})/);
  return m ? m[1] : "";
}
/** Ảnh Drive → link thumbnail đúng kích thước (nhẹ hơn ảnh gốc rất nhiều) */
export function img(url, width = 800) {
  const id = driveId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
  return safeUrl(url);
}
/**
 * Ảnh theo màn hình (H3): trả về thuộc tính src + srcset + sizes.
 * Điện thoại tự tải ảnh nhỏ, máy tính / màn hình nét tải ảnh lớn hơn.
 */
export function imgAttrs(url, sizes = "100vw", widths = [400, 800, 1200]) {
  const id = driveId(url);
  if (!id) {
    const u = safeUrl(url);
    return u ? `src="${esc(u)}"` : "";
  }
  const at = (w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
  const set = widths.map((w) => `${at(w)} ${w}w`).join(", ");
  return `src="${esc(at(widths[Math.min(1, widths.length - 1)]))}" srcset="${esc(set)}" sizes="${esc(sizes)}"`;
}
/** Ảnh xem toàn màn hình: chọn cỡ vừa đủ nét theo màn hình đang dùng */
export function fullImg(url) {
  const need = Math.min(2000, Math.ceil((window.innerWidth * (window.devicePixelRatio || 1)) / 400) * 400);
  return img(url, Math.max(800, need));
}

export function youtubeId(url) {
  const s = str(url);
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  return m ? m[1] : "";
}

/* ---------------- Khác ---------------- */
export function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const store = {
  get(k, fallback = null) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* hết dung lượng / chế độ ẩn danh */
    }
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* bỏ qua */
    }
  },
};

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Bản đồ màu đai mặc định khi tab Lộ trình đai không ghi mã màu */
const BELT_COLORS = {
  trang: "#f8fafc", vang: "#facc15", xanhla: "#16a34a", xanhlacay: "#16a34a", xanh: "#2563eb",
  xanhduong: "#2563eb", xanhdatroi: "#38bdf8", do: "#dc2626", nau: "#92400e", den: "#111827",
  cam: "#f97316", tim: "#7c3aed", hong: "#ec4899", dodenh: "#dc2626",
};
export function beltColor(name, hex) {
  if (/^#[0-9a-f]{3,8}$/i.test(str(hex))) return str(hex);
  const n = norm(name);
  const key = Object.keys(BELT_COLORS)
    .sort((a, b) => b.length - a.length)
    .find((k) => n.includes(k));
  return key ? BELT_COLORS[key] : "#94a3b8";
}
