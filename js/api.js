/* =====================================================================
   KẾT NỐI APPS SCRIPT
   - Dữ liệu công khai: 1 lần gọi duy nhất, hiển thị ngay từ bản lưu
     trên máy rồi lặng lẽ cập nhật bản mới (stale-while-revalidate).
   - Tra cứu & gửi đơn: gọi trực tiếp, có thời gian chờ tối đa.
   ===================================================================== */
import { CONFIG } from "./config.js";
import { store } from "./utils.js";

const CACHE_KEY = "tkd_public_v3";

let pending = 0;
function netState(delta) {
  pending = Math.max(0, pending + delta);
  document.dispatchEvent(new CustomEvent("net", { detail: { busy: pending > 0 } }));
}

async function request(url, options = {}, timeout = CONFIG.REQUEST_TIMEOUT) {
  netState(1);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
    netState(-1);
  }
}

const listeners = new Set();
let current = null;
let inflight = null;

/** Đăng ký nhận dữ liệu; được gọi lại mỗi khi có bản mới */
export function onPublicData(fn) {
  listeners.add(fn);
  if (current) fn(current, { fromCache: true });
}

function emit(data, meta) {
  current = data;
  listeners.forEach((fn) => {
    try {
      fn(data, meta);
    } catch (e) {
      console.error(e);
    }
  });
}

export function getPublic() {
  return current;
}

/** Tải dữ liệu công khai. Trả về Promise của bản mới nhất từ máy chủ. */
export function loadPublic() {
  if (!current) {
    const cached = store.get(CACHE_KEY);
    if (cached?.data) emit(cached.data, { fromCache: true, savedAt: cached.t });
  }
  if (inflight) return inflight;
  inflight = request(`${CONFIG.API_URL}?action=public`)
    .then((data) => {
      if (!data || typeof data !== "object" || data.error) throw new Error(data?.error || "Dữ liệu không hợp lệ");
      const sig = (d) => (d ? JSON.stringify({ ...d, updatedAt: 0 }) : "");
      const changed = sig(data) !== sig(current);
      store.set(CACHE_KEY, { t: Date.now(), data });
      if (changed) emit(data, { fromCache: false });
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function lookup(q) {
  return request(`${CONFIG.API_URL}?action=lookup&q=${encodeURIComponent(q)}`);
}

export function post(payload) {
  return request(
    CONFIG.API_URL,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // tránh CORS preflight với Apps Script
      body: JSON.stringify(payload),
    },
    CONFIG.SUBMIT_TIMEOUT,
  );
}
