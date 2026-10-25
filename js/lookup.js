/* =====================================================================
   TRA CỨU HỒ SƠ VÕ SINH (hợp nhất: thông tin + thành tích + thăng cấp)
   Tìm kiếm thực hiện trên máy chủ → danh sách hội viên không bao giờ
   bị tải nguyên về điện thoại người xem.
   ===================================================================== */
import { CONFIG } from "./config.js";
import { $, $$, esc, str, norm, orDash } from "./utils.js";
import { lookup } from "./api.js";
import { stateBox } from "./ui.js";

let lastQuery = "";

function medal(hc) {
  const n = norm(hc);
  if (n.includes("vang") || n.includes("hcv")) return ["🥇", "gold"];
  if (n.includes("bac") || n.includes("hcb")) return ["🥈", "silver"];
  if (n.includes("dong") || n.includes("hcd")) return ["🥉", "bronze"];
  return ["🏅", "other"];
}
const failed = (v) => /khong|truot|rot|fail/.test(norm(v));

/** Dòng thông tin có icon – giống phong cách bản cũ */
const row = (icon, label, value) =>
  `<div><dt><span class="kv-ico" aria-hidden="true">${icon}</span>${label}</dt><dd>${value}</dd></div>`;

function achievementList(list) {
  if (!list.length) return `<p class="empty-note">🏅 Chưa có thành tích được ghi nhận.</p>`;
  return `<ul class="rec-list">${list
    .map((a) => {
      const [icon, cls] = medal(a.huychuong);
      return `<li class="rec-card rec-${cls}">
          <div class="rec-head"><span class="rec-medal" aria-hidden="true">${icon}</span><strong>${orDash(a.huychuong)}</strong></div>
          <dl class="kv kv-compact">
            ${row("📌", "Giải đấu", orDash(a.tengiaidau))}
            ${str(a.noidung) ? row("📝", "Nội dung", esc(a.noidung)) : ""}
            ${str(a.capdai) ? row("🥋", "Cấp đai", esc(a.capdai)) : ""}
            ${str(a.namdatgiai) ? row("📅", "Năm", esc(a.namdatgiai)) : ""}
          </dl>
        </li>`;
    })
    .join("")}</ul>`;
}

function promotionList(list) {
  if (!list.length) return `<p class="empty-note">📜 Chưa có kết quả thăng cấp được ghi nhận.</p>`;
  return `<ul class="rec-list">${list
    .map((p) => {
      const fail = failed(p.ketqua);
      return `<li class="rec-card ${fail ? "rec-fail" : "rec-pass"}">
          <div class="rec-head"><span class="rec-medal" aria-hidden="true">${fail ? "📝" : "🎖️"}</span><strong>${orDash(p.duthimaydang)}</strong>
            <span class="badge ${fail ? "badge-fail" : "badge-pass"}">${fail ? "" : "✅ "}${orDash(p.ketqua)}</span></div>
          <dl class="kv kv-compact">
            ${row("🏟️", "Kỳ thi", orDash(p.tenkythi))}
            ${str(p.donvitochuc) ? row("🏢", "Đơn vị tổ chức", esc(p.donvitochuc)) : ""}
          </dl>
        </li>`;
    })
    .join("")}</ul>`;
}

function profileCard(m, idx) {
  const isMember = "mahoivien" in m || "capdang" in m;
  const ach = m.achievements || [];
  const pro = m.promotions || [];
  const code = str(m.mahoivien);
  const id = `p${idx}`;
  return `<article class="profile">
      <header class="profile-head">
        <div class="avatar" aria-hidden="true">${esc(str(m.hovaten).split(" ").pop()?.[0] || "?")}</div>
        <div class="profile-id">
          <h3>${orDash(m.hovaten)}</h3>
          ${isMember ? `<p class="profile-meta">${str(m.capdang) ? `<span class="rank">${esc(m.capdang)}</span>` : ""}${code ? `<button type="button" class="code-pill" data-action="copy" data-copy="${esc(code)}" data-label="mã hội viên" aria-label="Sao chép mã ${esc(code)}">${esc(code)} <span aria-hidden="true">⧉</span></button>` : ""}</p>` : `<p class="muted small">Có thành tích / kết quả thi</p>`}
        </div>
      </header>
      <div class="tabs" role="tablist">
        ${isMember ? `<button type="button" role="tab" class="tab" aria-selected="true" data-action="ptab" data-target="${id}-info">🆔 Thông tin</button>` : ""}
        <button type="button" role="tab" class="tab" aria-selected="${!isMember}" data-action="ptab" data-target="${id}-ach">🏆 Thành tích <span class="count">${ach.length}</span></button>
        <button type="button" role="tab" class="tab" aria-selected="false" data-action="ptab" data-target="${id}-pro">📜 Thăng cấp <span class="count">${pro.length}</span></button>
      </div>
      ${
        isMember
          ? `<div class="tab-panel" id="${id}-info"><dl class="kv">
              ${row("🆔", "Mã hội viên", `<strong class="text-blue">${orDash(code)}</strong>`)}
              ${row("👤", "Họ và tên", `<strong class="text-red upper">${orDash(m.hovaten)}</strong>`)}
              ${row("🚻", "Giới tính", orDash(m.gioitinh))}
              ${row("📅", "Năm sinh", orDash(m.ngaysinh))}
              ${row("🥋", "Cấp/Đẳng", `<strong class="text-amber">${orDash(m.capdang)}</strong>`)}
              ${row("🏢", "Mã CLB", `<strong class="text-blue">${orDash(m.maclb)}</strong>`)}
              ${row("🏛️", "Đơn vị", orDash(m.donvi))}
            </dl></div>`
          : ""
      }
      <div class="tab-panel" id="${id}-ach" ${isMember ? "hidden" : ""}>${achievementList(ach)}</div>
      <div class="tab-panel" id="${id}-pro" hidden>${promotionList(pro)}</div>
    </article>`;
}

export async function runLookup(q) {
  const box = $("#lookup-result");
  q = str(q);
  if (norm(q).length < CONFIG.LOOKUP_MIN_CHARS) {
    return stateBox(box, "info", `Nhập ít nhất ${CONFIG.LOOKUP_MIN_CHARS} ký tự của họ tên, hoặc mã hội viên đầy đủ.`);
  }
  lastQuery = q;
  const MSG = ["Đang tra cứu hồ sơ võ sinh…", "Đang tìm thành tích thi đấu…", "Đang tổng hợp kết quả thăng cấp…"];
  box.innerHTML = `<div class="searching" role="status">
      <div class="taichi-loader sm" aria-hidden="true"></div>
      <p class="searching-text">${MSG[0]}</p>
      <div class="searching-dots" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
    <div class="skel skel-profile"></div>`;
  let m = 0;
  const ticker = setInterval(() => {
    const el = $(".searching-text", box);
    if (el) el.textContent = MSG[++m % MSG.length];
  }, 1100);
  const btn = $("#lookup-form button[type=submit]");
  btn.disabled = true;
  btn.classList.add("loading");
  try {
    const res = await lookup(q);
    if (q !== lastQuery) return; // người dùng đã tìm từ khác
    if (res.error) return stateBox(box, "info", res.error);
    const all = [...(res.members || []), ...(res.others || [])];
    if (!all.length) return stateBox(box, "empty", `Không tìm thấy kết quả cho “${q}”. Thử nhập họ tên đầy đủ có dấu hoặc mã hội viên.`);
    box.innerHTML =
      `<p class="result-note">${res.total > (res.members || []).length ? `Tìm thấy ${res.total} hội viên, đang hiện ${res.members.length}. Nhập họ tên đầy đủ hơn để thu hẹp.` : `Tìm thấy ${all.length} kết quả`}</p>` +
      all.map(profileCard).join("");
  } catch {
    stateBox(box, "error", "Không kết nối được máy chủ. Vui lòng thử lại.", () => runLookup(q));
  } finally {
    clearInterval(ticker);
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

export function switchProfileTab(btn) {
  const card = btn.closest(".profile");
  $$(".tab", card).forEach((t) => t.setAttribute("aria-selected", String(t === btn)));
  $$(".tab-panel", card).forEach((p) => (p.hidden = p.id !== btn.dataset.target));
}
