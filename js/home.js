/* =====================================================================
   TRANG CHỦ: tin tức, video, album ảnh, lộ trình đai, hỏi đáp
   ===================================================================== */
import { CONFIG } from "./config.js";
import {
  $, esc, str, multiline, formatDate, toDate, splitList, splitCaptions, img, imgAttrs, fullImg, youtubeId, safeUrl, slug, norm, beltColor,
} from "./utils.js";
import { openSheet, openLightbox, stateBox, skeleton } from "./ui.js";

const st = { news: [], newsAll: false, videos: [], videosAll: false, albums: [], albumsAll: false, photos: [], belts: [] };

/* =========================== TIN TỨC =========================== */
function prepareNews(rows = []) {
  const used = new Set();
  return rows
    .filter((r) => str(r.tieude))
    .map((n, i) => ({ n, i, t: toDate(n.ngay)?.getTime() ?? null }))
    // Mới nhất lên đầu: theo ngày đăng; tin không có ngày → theo vị trí dòng (dòng dưới = mới hơn)
    .sort((a, b) => (a.t !== null && b.t !== null && a.t !== b.t ? b.t - a.t : b.i - a.i))
    .map(({ n }) => n)
    .map((n) => {
      let s = slug(n.tieude) || "tin";
      const d = str(n.ngay).replace(/\D/g, "").slice(0, 8);
      if (d) s += "-" + d;
      while (used.has(s)) s += "-1";
      used.add(s);
      return { ...n, _slug: s, _imgs: splitList(n.linkanh), _vids: splitList(n.linkvideo).map(youtubeId).filter(Boolean) };
    });
}

function renderNews() {
  const box = $("#news-list");
  if (!st.news.length) return stateBox(box, "empty", "Chưa có bản tin nào.");
  const list = st.newsAll ? st.news : st.news.slice(0, CONFIG.NEWS_PREVIEW);
  box.innerHTML =
    list
      .map((n, i) => {
        const lead = false; // giữ kiểu danh sách tin như giao diện cũ
        const thumb = n._imgs.length ? img(n._imgs[0], lead ? 900 : 400) : "";
        const tags = [
          n._imgs.length ? `<span class="tag">🖼️ ẢNH${n._imgs.length > 1 ? " " + n._imgs.length : ""}</span>` : "",
          n._vids.length ? `<span class="tag tag-red">🎥 VIDEO</span>` : "",
          splitList(n.linkfile).length ? `<span class="tag tag-blue">📄 TÀI LIỆU</span>` : "",
        ].join("");
        return `
        <button type="button" class="news-card ${lead ? "news-card-lead" : ""}" data-action="news" data-index="${i}">
          <span class="news-thumb">${thumb ? `<img ${imgAttrs(n._imgs[0], "96px", [200, 400])} alt="" loading="lazy" decoding="async">` : `<span class="news-thumb-ph" aria-hidden="true">🥋</span>`}</span>
          <span class="news-body">
            <span class="news-date">📅 ${esc(formatDate(n.ngay))}</span>
            <span class="news-title">${esc(n.tieude)}</span>
            ${str(n.sapo) && lead ? `<span class="news-sapo">${esc(n.sapo)}</span>` : ""}
            ${tags ? `<span class="news-tags">${tags}</span>` : ""}
          </span>
        </button>`;
      })
      .join("") +
    (st.news.length > CONFIG.NEWS_PREVIEW
      ? `<button type="button" class="btn btn-ghost btn-block" data-action="toggle-more" data-list="news">${st.newsAll ? "Thu gọn ↑" : `Xem thêm ${st.news.length - CONFIG.NEWS_PREVIEW} bản tin ↓`}</button>`
      : "");
}

/** Chia nội dung thành các đoạn văn (dòng trống hoặc xuống dòng = đoạn mới) */
function paragraphs(text) {
  const t = str(text);
  if (!t) return "";
  const parts = t.includes("\n\n") ? t.split(/\n\s*\n/) : t.split(/\r?\n/);
  return parts
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => `<p>${multiline(x)}</p>`)
    .join("");
}

function readingTime(n) {
  const words = [n.tieude, n.sapo, n.noidung].map(str).join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function figure(newsIndex, url, i, cap, alt, big = false) {
  const src = img(url, big ? 1200 : 1000);
  if (!src) return "";
  return `<figure class="art-fig${big ? " art-cover" : ""}">
      <button type="button" class="art-img" data-action="news-img" data-news="${newsIndex}" data-index="${i}" aria-label="Phóng to ảnh">
        <img ${imgAttrs(url, "(min-width: 760px) 720px, 100vw", [400, 800, 1200])} alt="${esc(cap || alt)}" loading="${big ? "eager" : "lazy"}" decoding="async">
        <span class="zoom-hint" aria-hidden="true">⤢</span>
      </button>
      ${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}
    </figure>`;
}

export function openNews(index) {
  const n = st.news[index];
  if (!n) return;
  const caps = splitCaptions(n.chuthichanh);
  const cover = n._imgs.length ? figure(index, n._imgs[0], 0, caps[0], n.tieude, true) : "";
  const rest = n._imgs.slice(1).map((u, k) => figure(index, u, k + 1, caps[k + 1], n.tieude)).join("");
  const vids = n._vids.map((id) => `<div class="video-box">${videoFacade(id, n.tieude)}</div>`).join("");
  const files = splitList(n.linkfile).map(safeUrl).filter(Boolean);
  const fileHTML = files.length
    ? `<aside class="art-files">
        <p class="art-files-title">📄 TÀI LIỆU ĐÍNH KÈM</p>
        ${files
          .map(
            (u, i) => `<a class="art-file" href="${esc(u)}" target="_blank" rel="noopener noreferrer">
              <span class="art-file-ico" aria-hidden="true">📄</span>
              <span>Tài liệu chi tiết${files.length > 1 ? " " + (i + 1) : ""}<small>Bấm để xem / tải về</small></span>
              <span aria-hidden="true">›</span></a>`,
          )
          .join("")}
      </aside>`
    : "";
  const url = `${location.origin}${location.pathname}#/tin/${n._slug}`;
  const others = st.news
    .map((x, i) => ({ x, i }))
    .filter(({ i }) => i !== index)
    .slice(0, 3);

  openSheet(
    "📰 Bản tin võ đường",
    `<article class="article">
      <p class="art-kicker">THÔNG BÁO VÕ ĐƯỜNG</p>
      <h1 class="art-title">${esc(n.tieude)}</h1>
      <div class="art-meta">
        <span>📅 ${esc(formatDate(n.ngay))}</span>
        <span>🏛️ CLB Taekwondo Kiên Lương</span>
        <span>⏱️ ${readingTime(n)} phút đọc</span>
      </div>
      ${str(n.sapo) ? `<p class="art-sapo">${multiline(n.sapo)}</p>` : ""}
      ${cover}
      ${str(n.noidung) ? `<div class="art-text">${paragraphs(n.noidung)}</div>` : ""}
      ${rest ? `<div class="art-gallery">${rest}</div>` : ""}
      ${vids ? `<div class="art-videos"><p class="art-section">🎥 VIDEO</p>${vids}</div>` : ""}
      ${fileHTML}
      <div class="art-share">
        <span class="art-share-label">CHIA SẺ BÀI VIẾT</span>
        <div class="art-share-btns">
          ${navigator.share ? `<button type="button" class="share-btn share-native" data-action="share" data-url="${esc(url)}" data-title="${esc(n.tieude)}">📤 Chia sẻ</button>` : ""}
          <button type="button" class="share-btn share-fb" data-action="share-fb" data-url="${esc(url)}">Facebook</button>
          <button type="button" class="share-btn share-copy" data-action="copy" data-copy="${esc(url)}" data-label="link bài viết">🔗 Sao chép link</button>
        </div>
      </div>
      ${
        others.length
          ? `<section class="art-more">
              <h2 class="art-more-title">TIN <span>KHÁC</span></h2>
              ${others
                .map(({ x, i }) => {
                  const t = x._imgs.length ? img(x._imgs[0], 300) : "";
                  return `<button type="button" class="more-item" data-action="news" data-index="${i}">
                    <span class="more-thumb">${t ? `<img ${imgAttrs(x._imgs[0], "84px", [200, 400])} alt="" loading="lazy">` : "🥋"}</span>
                    <span class="more-body"><span class="more-t">${esc(x.tieude)}</span><small>📅 ${esc(formatDate(x.ngay))}</small></span>
                  </button>`;
                })
                .join("")}
            </section>`
          : ""
      }
    </article>`,
    { wide: true },
  );
  $("#sheet .sheet-panel").classList.add("sheet-full");
  $("#sheet-body").scrollTop = 0;
}

export function openNewsImage(newsIndex, imgIndex) {
  const n = st.news[newsIndex];
  if (!n) return;
  const caps = splitCaptions(n.chuthichanh);
  openLightbox(
    n._imgs.map((u, i) => ({ full: fullImg(u), cap: caps[i] || "" })),
    imgIndex,
  );
}

export function openNewsBySlug(s) {
  const i = st.news.findIndex((n) => n._slug === s);
  if (i >= 0) openNews(i);
  return i >= 0;
}

/* =========================== VIDEO =========================== */
export function videoFacade(id, title = "Video") {
  return `<button type="button" class="video-facade" data-action="play-video" data-id="${esc(id)}" aria-label="Phát video: ${esc(title)}">
      <img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy" decoding="async">
      <span class="play-btn" aria-hidden="true"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 12.9.1 24 .1 24s0 11.1 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35.1 67.9 24 67.9 24s0-11.1-1.4-16.3z" fill="#e00"/><path d="M27 34V14l18 10z" fill="#fff"/></svg></span>
    </button>`;
}

export function playVideo(btn) {
  const id = btn.dataset.id;
  if (!/^[\w-]{11}$/.test(id)) return;
  btn.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}

function renderVideos() {
  const sec = $("#videos");
  sec.hidden = !st.videos.length;
  if (!st.videos.length) return;
  const list = st.videosAll ? st.videos : st.videos.slice(0, CONFIG.VIDEO_PREVIEW);
  $("#video-list").innerHTML =
    list
      .map(
        (v) => `<article class="video-card">
          <div class="video-box">${videoFacade(v.id, v.cap)}</div>
          <div class="video-body">
            <p class="video-cap">“${esc(v.cap)}”</p>
            <a class="yt-link" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener noreferrer">🔴 Xem trên YouTube</a>
          </div>
        </article>`,
      )
      .join("") +
    (st.videos.length > CONFIG.VIDEO_PREVIEW
      ? `<button type="button" class="btn btn-ghost btn-block span-all" data-action="toggle-more" data-list="videos">${st.videosAll ? "Thu gọn ↑" : `Xem thêm ${st.videos.length - CONFIG.VIDEO_PREVIEW} video ↓`}</button>`
      : "");
}

/* =========================== ALBUM ẢNH =========================== */
function prepareAlbums(rows = []) {
  const map = new Map();
  rows
    .slice()
    .reverse()
    .forEach((r) => {
      const raw = r.link || r.linkanh || r.url || r.anh;
      const thumb = img(raw, 500);
      if (!thumb) return;
      let cap = str(r.caption || r.chuthich);
      if (cap.toLowerCase() === "caption") cap = "";
      const name = str(r.album) || "Hoạt động câu lạc bộ";
      const key = norm(name);
      if (!map.has(key)) map.set(key, { name, date: str(r.ngay), photos: [] });
      map.get(key).photos.push({ raw, thumb, full: fullImg(raw), cap });
    });
  return [...map.values()];
}

/** Trang chủ: hiện sẵn 3 ảnh mới nhất + nút xem tất cả album */
function renderAlbums() {
  const sec = $("#albums");
  st.photos = st.albums.flatMap((a) => a.photos).slice(0, 3);
  sec.hidden = !st.photos.length;
  if (!st.photos.length) return;
  const total = st.albums.reduce((n, a) => n + a.photos.length, 0);
  $("#album-list").innerHTML = `
    <div class="photo-mosaic n${st.photos.length}">
      ${st.photos
        .map(
          (p, i) => `<button type="button" class="mosaic-item" data-action="preview-photo" data-index="${i}" aria-label="Xem ảnh${p.cap ? ": " + esc(p.cap) : ""}">
            <img ${i === 0 ? imgAttrs(p.raw, "(min-width: 760px) 640px, 100vw", [400, 800, 1200]) : imgAttrs(p.raw, "(min-width: 760px) 320px, 50vw", [300, 600])} alt="${esc(p.cap)}" loading="lazy" decoding="async">
          </button>`,
        )
        .join("")}
    </div>
    <button type="button" class="btn btn-outline btn-block more-photos" data-action="all-albums">
      Xem tất cả hình ảnh <span class="muted">(${total} ảnh · ${st.albums.length} album)</span> ›
    </button>`;
}

export function openPreviewPhoto(i) {
  if (st.photos.length) openLightbox(st.photos, i);
}

export function openAlbumList() {
  openSheet(
    "Hình ảnh hoạt động",
    `<div class="album-grid">${st.albums
      .map(
        (a, i) => `<button type="button" class="album-card" data-action="album" data-index="${i}">
          <span class="album-cover">
            <img ${imgAttrs(a.photos[0].raw, "(min-width: 600px) 260px, 50vw", [300, 600])} alt="" loading="lazy" decoding="async">
            <span class="album-count">📷 ${a.photos.length}</span>
          </span>
          <span class="media-caption">${esc(a.name)}${a.date ? `<small>${esc(formatDate(a.date))}</small>` : ""}</span>
        </button>`,
      )
      .join("")}</div>`,
    { wide: true },
  );
}

export function openAlbum(index) {
  const a = st.albums[index];
  if (!a) return;
  openSheet(
    a.name,
    `<p class="muted small">${a.photos.length} ảnh${a.date ? " · " + esc(formatDate(a.date)) : ""} — chạm để xem lớn, vuốt để chuyển ảnh</p>
     <div class="photo-grid">${a.photos
       .map(
         (p, i) => `<button type="button" class="photo" data-action="photo" data-album="${index}" data-index="${i}" aria-label="Xem ảnh ${i + 1}">
            <img ${imgAttrs(p.raw, "(min-width: 600px) 200px, 33vw", [200, 400])} alt="${esc(p.cap)}" loading="lazy" decoding="async"></button>`,
       )
       .join("")}</div>`,
    { wide: true },
  );
}

export function openPhoto(albumIndex, i) {
  const a = st.albums[albumIndex];
  if (a) openLightbox(a.photos, i);
}

/* =========================== LỘ TRÌNH ĐAI =========================== */
function renderBelts(rows = []) {
  st.belts = rows.filter((r) => str(r.cap) || str(r.maudai));
  const sec = $("#belts");
  sec.hidden = !st.belts.length;
  if (!st.belts.length) return;
  $("#belt-track").innerHTML = st.belts
    .map((b) => {
      const color = beltColor(b.maudai, b.mamau);
      return `<div class="belt-item reveal">
          <span class="belt-graphic" style="--belt:${esc(color)}" aria-hidden="true"><span class="belt-knot"></span></span>
          <span class="belt-cap">${esc(b.cap)}</span>
          <span class="belt-name">${esc(b.maudai)}</span>
        </div>`;
    })
    .join("");
}

/** Giữ lại để tương thích – lộ trình đai không còn phần chi tiết */
export function showBelt() {}

/* =========================== HỎI ĐÁP =========================== */
function renderFaq(rows = []) {
  const list = rows
    .filter((r) => str(r.cauhoi) && str(r.traloi))
    .sort((a, b) => (Number(a.thutu) || 999) - (Number(b.thutu) || 999));
  const sec = $("#faq");
  sec.hidden = !list.length;
  if (!list.length) return;
  $("#faq-list").innerHTML = list
    .map((f) => `<details class="faq-item"><summary>${esc(f.cauhoi)}</summary><div class="faq-a">${multiline(f.traloi)}</div></details>`)
    .join("");
}

/* =========================== ĐIỀU PHỐI =========================== */
export function homeSkeleton() {
  $("#news-list").innerHTML = skeleton(3, "news");
  $("#album-list").innerHTML = `<div class="photo-mosaic n3">${skeleton(3, "photo")}</div>`;
}

export function homeError(retry) {
  if (!st.news.length) stateBox($("#news-list"), "error", "Không tải được dữ liệu. Vui lòng kiểm tra mạng.", retry);
  if (!st.albums.length) $("#albums").hidden = true;
}

export function renderHome(data) {
  st.news = prepareNews(data.news);
  st.videos = (data.videos || [])
    .map((r) => {
      const key = Object.keys(r).find((k) => k.includes("youtube") || k === "link" || k === "linkvideo");
      return { id: youtubeId(r[key]), cap: str(r.caption || r.chuthich) || "Video hoạt động CLB Taekwondo Kiên Lương" };
    })
    .filter((v) => v.id)
    .reverse();
  st.albums = prepareAlbums(data.gallery);
  renderNews();
  renderVideos();
  renderAlbums();
  renderBelts(data.belts);
  renderFaq(data.faq);
}

export function toggleMore(list) {
  const map = { news: ["newsAll", renderNews, "#news"], videos: ["videosAll", renderVideos, "#videos"], albums: ["albumsAll", renderAlbums, "#albums"] };
  const m = map[list];
  if (!m) return;
  st[m[0]] = !st[m[0]];
  m[1]();
  if (!st[m[0]]) $(m[2]).scrollIntoView({ behavior: "smooth", block: "start" });
}
