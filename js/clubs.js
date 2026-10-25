/* =====================================================================
   CƠ SỞ TẬP LUYỆN + ĐỘI NGŨ CHUYÊN MÔN
   ===================================================================== */
import { $, $$, esc, str, multiline, norm, normalizePhone, safeUrl, img } from "./utils.js";
import { stateBox } from "./ui.js";

let locations = [];
let clubs = [];

/** Tìm CLB (trong CauHinhCLB) khớp với một cơ sở → để bấm "Đăng ký tại đây" */
function matchClub(loc) {
  const a = norm(loc.tencaulacbo);
  const b = norm(loc.khuvuc);
  return clubs.findIndex((c) => {
    const n = norm(c.name);
    return n && (n === a || (a && (n.includes(a) || a.includes(n))) || (b && n.includes(b)));
  });
}

function locationCard(loc, i) {
  const tel = normalizePhone(loc.sodienthoai);
  const map = safeUrl(loc.linkbando || loc.bando || loc.googlemaps);
  const ci = matchClub(loc);
  return `<article class="loc-card">
      <div class="loc-head">
        <span class="loc-pin" aria-hidden="true">📍</span>
        <div>
          <h3>${esc(str(loc.khuvuc) || str(loc.tencaulacbo))}</h3>
        </div>
      </div>
      <dl class="kv kv-compact">
        ${str(loc.tencaulacbo) ? `<div><dt><span class="kv-ico" aria-hidden="true">🏠</span>Câu lạc bộ</dt><dd>${esc(loc.tencaulacbo)}</dd></div>` : ""}
        ${str(loc.huanluyenvienphutrach) ? `<div><dt><span class="kv-ico" aria-hidden="true">👤</span>HLV phụ trách</dt><dd>${esc(loc.huanluyenvienphutrach)}</dd></div>` : ""}
        ${str(loc.thoigian) ? `<div><dt><span class="kv-ico" aria-hidden="true">⏰</span>Thời gian tập</dt><dd>${multiline(loc.thoigian)}</dd></div>` : ""}
        ${tel ? `<div><dt><span class="kv-ico" aria-hidden="true">📞</span>Số điện thoại</dt><dd><a href="tel:${esc(tel)}"><strong>${esc(tel)}</strong></a></dd></div>` : ""}
      </dl>
      <div class="loc-actions">
        ${tel ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(tel)}">📞 Gọi</a><a class="btn btn-ghost btn-sm" href="https://zalo.me/${esc(tel)}" target="_blank" rel="noopener noreferrer">💬 Zalo</a>` : ""}
        ${map ? `<a class="btn btn-ghost btn-sm" href="${esc(map)}" target="_blank" rel="noopener noreferrer">🗺 Chỉ đường</a>` : ""}
        <a class="btn btn-primary btn-sm" href="#/dang-ky${ci >= 0 ? "?clb=" + ci : ""}">Đăng ký</a>
      </div>
    </article>`;
}

function personCard(p) {
  const photo = img(p.anh, 200);
  const initial = esc(str(p.hovaten).split(" ").pop()?.[0] || "?");
  return `<article class="person">
      <span class="person-avatar">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async">` : initial}</span>
      <span class="person-body">
        <strong>${esc(p.hovaten)}</strong>
        <span class="muted small">🎖️ ${esc(str(p.chucvu) || "Thành viên")}</span>
        ${str(p.capdang) ? `<span class="rank rank-sm">🥋 ${esc(p.capdang)}</span>` : ""}
        ${str(p.gioithieu) ? `<span class="person-bio">${esc(p.gioithieu)}</span>` : ""}
      </span>
    </article>`;
}

export function renderClubs(data) {
  locations = (data.locations || []).filter((l) => str(l.khuvuc) || str(l.tencaulacbo));
  clubs = data.clubs || [];
  const box = $("#loc-list");
  if (!locations.length) stateBox(box, "empty", "Chưa có thông tin cơ sở tập luyện.");
  else box.innerHTML = locations.map(locationCard).join("");

  const coaches = (data.coaches || []).filter((p) => str(p.hovaten));
  const judges = (data.judges || []).filter((p) => str(p.hovaten));
  $("#team-coaches").innerHTML = coaches.length ? coaches.map(personCard).join("") : `<p class="muted">Chưa có dữ liệu.</p>`;
  $("#team-judges").innerHTML = judges.length ? judges.map(personCard).join("") : `<p class="muted">Chưa có dữ liệu.</p>`;
  $("#team").hidden = !coaches.length && !judges.length;
}

export function switchTeamTab(btn) {
  $$("#team .seg-btn").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
  $("#team-coaches").hidden = btn.dataset.target !== "team-coaches";
  $("#team-judges").hidden = btn.dataset.target !== "team-judges";
}

export function clubsLoading() {
  $("#loc-list").innerHTML = `<div class="skel skel-card"></div><div class="skel skel-card"></div>`;
}
export function clubsError(retry) {
  if (!locations.length) stateBox($("#loc-list"), "error", "Không tải được danh sách cơ sở.", retry);
}
