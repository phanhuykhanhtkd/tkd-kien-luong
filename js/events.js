/* =====================================================================
   LỊCH SỰ KIỆN: thi thăng cấp, giải đấu, sự kiện CLB
   Tab Sheet "Lịch": Ngày | Giờ | Tên sự kiện | Loại | Địa điểm | Mô tả | Link
   ===================================================================== */
import { $, esc, str, multiline, toDate, parseTime, pad, weekday, norm, safeUrl } from "./utils.js";
import { stateBox, toast } from "./ui.js";

let events = [];
let timer = null;

function prepare(rows = []) {
  return rows
    .map((r, i) => {
      const d = toDate(r.ngay);
      if (!d || !str(r.tensukien)) return null;
      const times = str(r.gio).split(/[-–~]| đến /).map(parseTime).filter(Boolean);
      const start = new Date(d);
      let end;
      const allDay = !times.length;
      if (allDay) {
        end = new Date(d);
        end.setDate(end.getDate() + 1);
      } else {
        start.setHours(times[0][0], times[0][1], 0, 0);
        end = new Date(start);
        if (times[1]) end.setHours(times[1][0], times[1][1], 0, 0);
        else end.setHours(end.getHours() + 2);
      }
      const t = norm(r.loai);
      const kind = t.includes("thangcap") || t.includes("thi") ? "exam" : t.includes("giai") ? "tour" : "event";
      return { i, raw: r, start, end, allDay, kind };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

const KIND_LABEL = { exam: "Thi thăng cấp", tour: "Giải đấu", event: "Sự kiện" };

function dateBlock(e) {
  return `<div class="ev-date ev-${e.kind}">
      <span class="ev-day">${pad(e.start.getDate())}</span>
      <span class="ev-month">Th${e.start.getMonth() + 1}</span>
    </div>`;
}

function timeText(e) {
  const t = e.allDay ? "Cả ngày" : `${pad(e.start.getHours())}:${pad(e.start.getMinutes())}`;
  return `${weekday(e.start)}, ${pad(e.start.getDate())}/${pad(e.start.getMonth() + 1)}/${e.start.getFullYear()} · ${t}`;
}

function eventCard(e, past = false) {
  const r = e.raw;
  const link = safeUrl(r.link);
  return `<article class="ev-card ${past ? "ev-past" : ""}">
      ${dateBlock(e)}
      <div class="ev-body">
        <span class="chip chip-${e.kind}">${esc(str(r.loai) || KIND_LABEL[e.kind])}</span>
        <h3 class="ev-title">${esc(r.tensukien)}</h3>
        <p class="ev-meta">🕒 ${esc(timeText(e))}</p>
        ${str(r.diadiem) ? `<p class="ev-meta">📍 ${esc(r.diadiem)}</p>` : ""}
        ${str(r.mota) ? `<p class="ev-desc">${multiline(r.mota)}</p>` : ""}
        ${
          past
            ? ""
            : `<div class="ev-actions">
                <a class="btn btn-ghost btn-sm" href="${esc(gcalUrl(e))}" target="_blank" rel="noopener noreferrer">+ Google Lịch</a>
                <button type="button" class="btn btn-ghost btn-sm" data-action="ics" data-index="${e.i}">+ Lịch điện thoại</button>
                ${link ? `<a class="btn btn-ghost btn-sm" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Chi tiết</a>` : ""}
              </div>`
        }
      </div>
    </article>`;
}

function countdown(e) {
  const ms = e.start - Date.now();
  if (ms <= 0) return `<span class="cd-live">Đang diễn ra</span>`;
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return `<span class="cd"><b>${d}</b><small>ngày</small></span><span class="cd"><b>${h}</b><small>giờ</small></span><span class="cd"><b>${m}</b><small>phút</small></span>`;
}

function upcoming() {
  const now = new Date();
  return events.filter((e) => e.end > now);
}

export function renderEvents(data) {
  events = prepare(data.events);
  const box = $("#events-list");
  const up = upcoming();
  const past = events.filter((e) => !up.includes(e)).reverse();

  if (!events.length) {
    stateBox(box, "info", "Chưa có lịch sự kiện. Các kỳ thi thăng cấp và giải đấu sẽ được cập nhật tại đây.");
  } else {
    const next = up[0];
    box.innerHTML = `
      ${
        next
          ? `<div class="ev-hero ev-${next.kind}">
              <p class="ev-hero-label">Sự kiện sắp tới</p>
              <h3>${esc(next.raw.tensukien)}</h3>
              <p class="ev-hero-meta">${esc(timeText(next))}${str(next.raw.diadiem) ? " · " + esc(next.raw.diadiem) : ""}</p>
              <div class="cd-row" id="cd-main">${countdown(next)}</div>
            </div>`
          : ""
      }
      ${up.length ? `<h3 class="sub-title">Sắp diễn ra (${up.length})</h3>${up.map((e) => eventCard(e)).join("")}` : `<p class="muted">Hiện chưa có sự kiện sắp tới.</p>`}
      ${
        past.length
          ? `<details class="past-wrap"><summary>Đã diễn ra (${past.length})</summary>${past.map((e) => eventCard(e, true)).join("")}</details>`
          : ""
      }`;
  }
  renderHomeTeaser(up[0]);

  clearInterval(timer);
  if (up[0]) {
    timer = setInterval(() => {
      const el = $("#cd-main");
      if (el) el.innerHTML = countdown(up[0]);
      const t = $("#home-event .cd-row");
      if (t) t.innerHTML = countdown(up[0]);
    }, 30000);
  }
}

function renderHomeTeaser(next) {
  const el = $("#home-event");
  if (!next) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `<a class="teaser ev-${next.kind}" href="#/lich">
      ${dateBlock(next)}
      <span class="teaser-body">
        <span class="teaser-label">Sắp diễn ra · ${esc(KIND_LABEL[next.kind])}</span>
        <span class="teaser-title">${esc(next.raw.tensukien)}</span>
        <span class="cd-row cd-sm">${countdown(next)}</span>
      </span>
      <span class="teaser-arrow" aria-hidden="true">›</span>
    </a>`;
}

/* ---------------- Thêm vào lịch ---------------- */
function stamp(d, allDay) {
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return allDay ? ymd : `${ymd}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function gcalUrl(e) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: str(e.raw.tensukien),
    dates: `${stamp(e.start, e.allDay)}/${stamp(e.end, e.allDay)}`,
    ctz: "Asia/Ho_Chi_Minh",
    details: [str(e.raw.mota), "CLB Taekwondo Kiên Lương"].filter(Boolean).join("\n"),
    location: str(e.raw.diadiem),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function downloadIcs(index) {
  const e = events.find((x) => x.i === index);
  if (!e) return;
  const escIcs = (s) => str(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const dt = (d) => (e.allDay ? `;VALUE=DATE:${stamp(d, true)}` : `;TZID=Asia/Ho_Chi_Minh:${stamp(d, false)}`);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taekwondo Kien Luong//VI",
    "BEGIN:VEVENT",
    `UID:tkd-${e.i}-${stamp(e.start, false)}@taekwondokienluong.info`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART${dt(e.start)}`,
    `DTEND${dt(e.end)}`,
    `SUMMARY:${escIcs(e.raw.tensukien)}`,
    `LOCATION:${escIcs(e.raw.diadiem)}`,
    `DESCRIPTION:${escIcs(e.raw.mota)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Nhắc lịch Taekwondo",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${norm(e.raw.tensukien).slice(0, 30) || "su-kien"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast("Đã tạo lịch nhắc – mở file để thêm vào điện thoại");
}

export function eventsLoading() {
  $("#events-list").innerHTML = `<div class="skel skel-hero"></div><div class="skel skel-card"></div><div class="skel skel-card"></div>`;
}
export function eventsError(retry) {
  if (!events.length) stateBox($("#events-list"), "error", "Không tải được lịch. Vui lòng kiểm tra mạng.", retry);
}
