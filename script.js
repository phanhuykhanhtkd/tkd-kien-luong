const API_URL =
  "https://script.google.com/macros/s/AKfycbzF4YvnCbgVjo49bkPvV4zmnJUyTupg8JHDch2sxDcWXor3W6SiAKU03aGpW823Q4CMKg/exec";
const systemCache = {};

// --- 1. TIỆN ÍCH ---
const cleanKey = (str) =>
  !str
    ? ""
    : str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "");

const formatFullDate = (val) => {
  if (!val || val === "---") return "---";
  let d = new Date(val);
  return !isNaN(d.getTime())
    ? `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`
    : val.toString();
};

const getDriveId = (url) => {
  const regExp = /(?:id=|\/d\/|folderview\?id=)([\w-]+)/;
  const match = (url || "").match(regExp);
  return match ? match[1] : "";
};

// --- 2. BẢO MẬT & KHÓA 8 TIẾNG ---
function isSystemLocked() {
  const lockUntil = localStorage.getItem("tkd_lock_time");
  if (lockUntil && new Date().getTime() < lockUntil) {
    const remainMs = lockUntil - new Date().getTime();
    const h = Math.floor(remainMs / 3600000);
    const m = Math.floor((remainMs % 3600000) / 60000);
    alert(
      `🔒 Hệ thống đang khóa bảo mật.\nVui lòng quay lại sau: ${h} giờ ${m} phút.`
    );
    return true;
  }
  return false;
}

// --- 3. TẢI DỮ LIỆU ---
async function fetchData(tabName, containerId) {
  const el = document.getElementById(containerId);
  const grid = el ? el.querySelector(".grid") || el : null;
  if (grid) grid.innerHTML = '<div class="taichi"></div>';
  if (systemCache[tabName]) return systemCache[tabName];
  try {
    const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(tabName)}`);
    const data = await res.json();
    const cleaned = data.map((item) => {
      let newItem = {};
      for (let key in item) newItem[cleanKey(key)] = item[key];
      return newItem;
    });
    systemCache[tabName] = cleaned;
    return cleaned;
  } catch (e) {
    return [];
  }
}

// --- 4. GIÁ TRỊ CỐT LÕI (NÚT XEM TIẾP) ---
function toggleReadMore(btn) {
  const p = btn.previousElementSibling;
  if (p) {
    p.classList.toggle("content-collapsed");
    p.classList.toggle("content-expanded");
    btn.innerText = p.classList.contains("content-collapsed")
      ? "Xem tiếp..."
      : "Thu gọn";
  }
}

// --- 5. BẢN TIN VÕ ĐƯỜNG (PHONG CÁCH BÁO ĐIỆN TỬ - PHIÊN BẢN HOÀN HẢO) ---

async function loadNews(showAll = false) {
  const container = document.getElementById("news-dynamic-section");
  if (!container) return;

  // Hiển thị trạng thái đang tải
  container.innerHTML =
    '<div style="text-align:center; padding:20px; color:var(--text-muted);">Đang tải bản tin...</div>';

  const data = await fetchData("Thông báo", "news-dynamic-section");
  if (!data || data.length === 0) {
    container.innerHTML =
      '<p style="text-align:center;">Chưa có thông báo nào.</p>';
    return;
  }

  const sortedData = [...data].reverse(); // Bài mới nhất lên đầu
  const displayData = showAll ? sortedData : sortedData.slice(0, 2); // Chỉ hiện 2 bài đầu nếu không bấm "Xem cũ"

  let html = `<h3 class="section-title" style="text-align:left; margin-bottom:20px;">📰 TIN TỨC <span>VÕ ĐƯỜNG</span></h3>`;
  html += `<div style="display: flex; flex-direction: column; gap: 15px;">`;

  displayData.forEach((news) => {
    // Xử lý lấy ảnh đầu tiên làm Thumbnail
    const imgList = (news.linkanh || "")
      .split(/[\n,]/)
      .filter((l) => l.trim() !== "");
    const firstImgId =
      imgList.length > 0 ? getDriveId(imgList[0].trim()) : null;
    const thumb = firstImgId
      ? `https://drive.google.com/thumbnail?id=${firstImgId}&sz=w400`
      : null;

    // Tự động nhận diện nhãn (Badge)
    let badges = "";
    if (news.linkvideo)
      badges += `<span style="background:#ff0000; color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:5px; font-weight:bold;">🎥 VIDEO</span>`;
    if (news.linkfile)
      badges += `<span style="background:#007bff; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">📄 TÀI LIỆU</span>`;

    const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(news))));

    html += `
      <div class="news-item-card" style="display: flex; gap: 12px; background: var(--card-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border); cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.03);" onclick="showFullNews('${dataStr}')">
          ${
            thumb
              ? `<img src="${thumb}" style="width: 90px; height: 90px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">`
              : ""
          }
          <div style="flex-grow: 1;">
              <div style="margin-bottom: 5px;">${badges}</div>
              <h4 style="margin: 0 0 5px 0; color: var(--blue); font-size: 1.05rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${
                news.tieude
              }</h4>
              <small style="color: var(--text-muted); font-size: 12px;">📅 ${formatFullDate(
                news.ngay
              )}</small>
          </div>
      </div>`;
  });

  html += `</div>`;

  // Nút xem tin cũ hơn
  if (!showAll && sortedData.length > 2) {
    html += `
    <div style="text-align: center; margin-top: 20px;">
        <button class="btn-search" style="background: white; color: var(--blue); border: 2px solid var(--blue); width: auto; padding: 8px 25px; border-radius: 20px; font-weight: bold; cursor: pointer;" onclick="loadNews(true)">
            XEM CÁC BẢN TIN CŨ HƠN
        </button>
    </div>`;
  }

  container.innerHTML = html;
}

function showFullNews(encoded) {
  const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));

  // 1. GHÉP CẶP ẢNH VÀ CHÚ THÍCH (THEO THỨ TỰ)
  const imgList = (data.linkanh || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const capList = (data.chuthichanh || "").split(/[\n,]/).map((s) => s.trim());

  let mediaGallery = "";
  imgList.forEach((url, idx) => {
    const caption = capList[idx] || "";
    mediaGallery += `
      <div style="margin-bottom: 20px; text-align: center;">
        <img src="https://drive.google.com/thumbnail?id=${getDriveId(
          url
        )}&sz=w1000" style="width: 100%; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        ${
          caption
            ? `<em style="display: block; margin-top: 8px; font-size: 0.95rem; color: #555; border-left: 3px solid var(--red); padding-left: 10px; font-style: italic;">${caption}</em>`
            : ""
        }
      </div>`;
  });

  // 2. XỬ LÝ VIDEO YOUTUBE (NHIỀU LINK)
  const vidList = (data.linkvideo || "")
    .split(/[\n,]/)
    .filter((l) => l.trim() !== "");
  let videoSection = vidList
    .map((l) => {
      const vId = l.split("v=")[1]?.split("&")[0] || l.split("/").pop();
      return `<div style="margin-bottom:15px; border-radius:10px; overflow:hidden;"><iframe src="https://www.youtube.com/embed/${vId}" style="width:100%; height:220px; border:none;" allowfullscreen></iframe></div>`;
    })
    .join("");

  // 3. XỬ LÝ FILE TÀI LIỆU (NHIỀU LINK)
  const pdfList = (data.linkfile || "")
    .split(/[\n,]/)
    .filter((l) => l.trim() !== "");
  let fileSection =
    pdfList.length > 0
      ? `<div style="background: #f0f7ff; padding: 15px; border-radius: 10px; border: 1px dashed #007bff; margin-top: 20px;"><p style="font-weight: bold; color: #007bff; margin-bottom: 10px;">📄 TÀI LIỆU CHI TIẾT:</p>`
      : "";
  fileSection += pdfList
    .map(
      (l, i) =>
        `<a href="${l}" target="_blank" class="btn-search" style="display:block; text-align:center; background:#007bff; color:white; text-decoration:none; margin-bottom:8px; font-size:14px;">XEM FILE PDF ${
          i + 1
        }</a>`
    )
    .join("");
  if (pdfList.length > 0) fileSection += `</div>`;

  const shareUrl = window.location.href;

  const articleHTML = `
    <div style="text-align: left; max-height: 80vh; overflow-y: auto; padding-right: 8px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <p style="color: var(--red); font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Thông báo võ đường</p>
        <h2 style="font-size: 1.6rem; color: var(--blue); line-height: 1.3; margin-bottom: 10px;">${
          data.tieude
        }</h2>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">📅 Ngày đăng: ${formatFullDate(
          data.ngay
        )} | 🏛️ CLB TAEKWONDO KIÊN LƯƠNG</p>
        
        <div style="line-height: 1.7; font-size: 1.05rem; color: #333;">
            <p style="font-weight: bold; font-size: 1.15rem; margin-bottom: 20px; color: #000;">${
              data.sapo || ""
            }</p>
            <div style="margin-bottom: 25px;">${(data.noidung || "").replace(
              /\n/g,
              "<br>"
            )}</div>
        </div>

        <div class="article-gallery">${mediaGallery}</div>
        
        <div class="article-videos">${videoSection}</div>
        
        ${fileSection}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: bold;">CHIA SẺ BÀI VIẾT:</span>
            <div style="display: flex; gap: 8px;">
                <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  shareUrl
                )}')" style="background:#3b5998; color:white; border:none; padding:6px 15px; border-radius:5px; cursor:pointer; font-size:12px;">Facebook</button>
                <button onclick="copyToClipboard('${shareUrl}')" style="background:#444; color:white; border:none; padding:6px 15px; border-radius:5px; cursor:pointer; font-size:12px;">Copy Link</button>
            </div>
        </div>
    </div>`;

  openModal("CHI TIẾT BẢN TIN", articleHTML);
}

// --- 6. TRA CỨU HỘI VIÊN (ĐÃ KHỚP TÊN CỘT CỦA BẠN) ---
async function searchHV() {
  const val = document.getElementById("hv-input").value.trim().toLowerCase();
  const resDiv = document.getElementById("hv-result");
  if (!val) return alert("Vui lòng nhập tên!");
  const data = await fetchData("Thành viên", "hv-result");
  const results = data.filter((d) =>
    (d.hovaten || "").toLowerCase().includes(val)
  );
  if (!results.length) return (resDiv.innerHTML = "❌ Không tìm thấy võ sinh.");

  let html = `<div class="grid">`;
  results.forEach((item) => {
    html += `
      <div class="card" style="text-align:left; border-top:6px solid var(--red);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:10px; margin-bottom:10px;">
              <span style="font-weight:bold; color:var(--blue);">🆔 Mã hội viên: ${
                item.mahoivien || "---"
              }</span>
              <button class="btn-search" style="padding:5px 10px; font-size:10px;" onclick="copyToClipboard('${
                item.mahoivien
              }')">SAO CHÉP</button>
          </div>
          <p>👤 <b>Họ tên:</b> ${item.hovaten}</p>
          <p>📅 <b>Năm sinh:</b> ${formatFullDate(item.namsinh)}</p>
          <p>🚻 <b>Giới tính:</b> ${item.gioitinh || "---"}</p>
          <p>🏢 <b>Mã CLB:</b> ${item.maclb || "---"}</p>
          <p>🌍 <b>Tổ chức:</b> ${item.tochucthanhvien || "---"}</p>
      </div>`;
  });
  resDiv.innerHTML = html + `</div>`;
}

// --- 7. TRA CỨU THÀNH TÍCH & THĂNG CẤP (TINH CHỈNH MÀU SẮC & NÚT BẤM) ---

// Hai hàm này giúp nút bấm và phím Enter hoạt động chính xác
async function searchAchieve() {
  await performSecureSearch(
    "achieve",
    "achieve-input",
    "achieve-result",
    "Thành tích"
  );
}
async function searchPromo() {
  await performSecureSearch(
    "promo",
    "promo-input",
    "promo-result",
    "Thăng cấp"
  );
}

async function performSecureSearch(type, inputId, resultId, sheetName) {
  const val = document.getElementById(inputId).value.trim().toLowerCase();
  const resDiv = document.getElementById(resultId);
  if (!val) return alert("Vui lòng nhập tên!");

  const data = await fetchData(sheetName, resultId);
  const results = data.filter((d) =>
    (d.hovaten || "").toLowerCase().includes(val)
  );
  if (!results.length)
    return (resDiv.innerHTML = "❌ Không tìm thấy thông tin.");

  let html = `<div class="grid">`;

  // Lưu kết quả vào biến tạm để hàm openSecureByIndex truy xuất an toàn
  window.currentSearchResults = results;

  results.forEach((item, index) => {
    let icon = "📜";
    let cardStyle = "border-top: 5px solid var(--blue);";

    if (type === "achieve") {
      // Chuẩn hóa nội dung cột huy chương để so sánh màu sắc
      const hcRaw = (item.huychuong || "").toLowerCase();
      const hc = hcRaw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");

      if (hc.includes("vang") || hc.includes("hcv")) {
        icon = "🏆";
        cardStyle =
          "border: 2px solid #FFD700; background: linear-gradient(145deg, #ffffff, #fffdf0); box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);";
      } else if (hc.includes("bac") || hc.includes("hcb")) {
        icon = "🥈";
        cardStyle =
          "border: 2px solid #A9A9A9; background: linear-gradient(145deg, #ffffff, #f5f5f5); box-shadow: 0 4px 12px rgba(169, 169, 169, 0.3);";
      } else if (hc.includes("dong") || hc.includes("hcd")) {
        icon = "🥉";
        cardStyle =
          "border: 2px solid #CD7F32; background: linear-gradient(145deg, #ffffff, #fdf8f5); box-shadow: 0 4px 12px rgba(205, 127, 50, 0.3);";
      } else {
        icon = "🏅";
        cardStyle = "border-top: 5px solid var(--red);";
      }
    } else {
      // Giao diện cho mục Thăng cấp
      cardStyle = "border-top: 5px solid #28a745; background: #fafffa;";
    }

    // HTML ĐÃ ẨN NĂM SINH - Nút bấm dùng INDEX để cực kỳ nhạy
    html += `
        <div class="card" style="text-align:center; ${cardStyle} padding: 25px; border-radius: 15px; position: relative;">
            <div style="font-size:60px; margin-bottom:10px;">${icon}</div>
            <h3 style="color:var(--blue); margin-bottom:15px; font-size: 1.2rem;">${item.hovaten}</h3>
            <button class="btn-search" style="width:100%; border-radius: 8px; font-weight: bold; cursor: pointer;" 
                    onclick="openSecureByIndex(${index}, '${type}')">
                CHI TIẾT
            </button>
        </div>`;
  });
  resDiv.innerHTML = html + `</div>`;
}

// Hàm xử lý mở bảo mật an toàn bằng index
function openSecureByIndex(index, type) {
  if (!window.currentSearchResults || !window.currentSearchResults[index])
    return;
  const item = window.currentSearchResults[index];
  const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(item))));
  askSecurity(dataStr, type);
}
// --- 8. XÁC MINH BẢO MẬT & KHÓA 8 GIỜ ---
let failCount = 0;
function askSecurity(encoded, type) {
  if (isSystemLocked()) return;
  const label =
    type === "achieve" || type === "promo"
      ? "Vui lòng nhập mật khẩu"
      : "Vui lòng nhập mật khẩu";
  openModal(
    "🔒 BẢO MẬT HỆ THỐNG",
    `
    <div style="text-align:center;">
        <p style="margin-bottom:15px;">${label}</p>
        <input type="password" id="pass-input" placeholder="*********" style="width:100%; padding:15px; text-align:center; font-size:24px; border:2px solid var(--border); border-radius:10px; margin-bottom:20px; background:var(--gray); color:var(--text);">
        <button class="btn-search" style="width:100%;" onclick="verifySecure('${encoded}', '${type}')">XÁC NHẬN</button>
    </div>`
  );
}

function verifySecure(encoded, type) {
  const p = JSON.parse(decodeURIComponent(escape(atob(encoded))));
  const input = document.getElementById("pass-input").value;
  // Năm sinh lấy 4 số cuối (năm) làm mật khẩu cho Thành tích/Thăng cấp
  const pass =
    type === "achieve" || type === "promo"
      ? formatFullDate(p.namsinh).split("/").pop()
      : p.sodienthoai?.toString();

  if (input === pass) {
    failCount = 0;
    let content = `<div style="text-align:left; line-height:2.2; font-size:16px;">`;
    if (type === "hlv" || type === "bgk") {
      content += `<p>👤 <b>Họ tên:</b> ${p.hovaten}</p><p>🏅 <b>Cấp đẳng:</b> ${
        p.capdang
      }</p><p>💼 <b>Chức vụ:</b> ${p.chucvu}</p><p>📞 <b>SĐT:</b> ${
        p.sodienthoai
      }</p><p>📍 <b>Địa chỉ:</b> ${p.diachi || "---"}</p>`;
    } else if (type === "achieve") {
      content += `<p>🏆 <b>Huy chương:</b> <span style="color:var(--red); font-weight:bold;">${p.huychuong}</span></p><p>🥋 <b>Cấp đai:</b> ${p.capdai}</p><p>📌 <b>Giải đấu:</b> ${p.tengiaidau}</p><p>📝 <b>Nội dung:</b> ${p.noidung}</p><p>📅 <b>Năm:</b> ${p.namdatgiai}</p>`;
    } else if (type === "promo") {
      content += `<p>✅ <b>Kết quả:</b> <span style="color:green; font-weight:bold;">${p.ketqua}</span></p><p>🥋 <b>Dự thi:</b> ${p.duthimaydang}</p><p>🏟️ <b>Kỳ thi:</b> ${p.tenkythi}</p><p>🏢 <b>Đơn vị:</b> ${p.donvitochuc}</p>`;
    }
    openModal("HỒ SƠ ĐẦY ĐỦ", content + `</div>`);
  } else {
    failCount++;
    if (failCount >= 5) {
      localStorage.setItem("tkd_lock_time", new Date().getTime() + 28800000);
      alert("❌ BẠN ĐÃ NHẬP SAI 5 LẦN. HỆ THỐNG SẼ KHÓA 8 GIỜ.");
      closeModal();
    } else alert(`Sai thông tin xác minh! Còn ${5 - failCount} lần thử.`);
  }
}

// --- 9. KHU TẬP (CHỈ HIỆN KHU VỰC VÀ CLB Ở NGOÀI) ---
async function loadLocations() {
  const grid = document.querySelector("#locations .grid");
  const data = await fetchData("KHU TẬP", "locations");
  if (!grid) return;
  grid.innerHTML = "";
  data.forEach((loc) => {
    const locStr = btoa(unescape(encodeURIComponent(JSON.stringify(loc))));
    grid.innerHTML += `
      <div class="card" style="text-align:center; border-top:5px solid var(--blue);">
          <h3 style="color:var(--blue); margin-bottom:10px;">📍 ${loc.khuvuc}</h3>
          <p style="font-weight:bold; margin-bottom:15px;">🏠 CLB: ${loc.tencaulacbo}</p>
          <button class="btn-search" style="width:100%;" onclick="showLocDetail('${locStr}')">XEM CHI TIẾT</button>
      </div>`;
  });
}

function showLocDetail(encoded) {
  const loc = JSON.parse(decodeURIComponent(escape(atob(encoded))));
  openModal(
    "Chi Tiết Địa Điểm",
    `
    <div style="text-align:left; line-height:2.5; font-size:16px;">
      <p>📍 <b>Khu vực:</b> ${loc.khuvuc}</p>
      <p>🏠 <b>Tên câu lạc bộ:</b> ${loc.tencaulacbo}</p>
      <p>👤 <b>Huấn luyện viên:</b> ${loc.huanluyenvienphutrach}</p>
      <p>⏰ <b>Thời gian tập:</b> ${loc.thoigian}</p>
      <p>📞 <b>Số điện thoại:</b> <a href="tel:${loc.sodienthoai}" style="color:var(--blue); text-decoration:none; font-weight:bold;">${loc.sodienthoai}</a></p>
    </div>`
  );
}

// --- 10. ĐIỀU HƯỚNG VÀ KHỞI TẠO ---
function toggleSection(id) {
  document.getElementById("home-content").style.display = "none";
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  const target = document.getElementById(id);
  if (target) target.style.display = "block";
  document
    .querySelectorAll(".menu-item")
    .forEach((i) => i.classList.remove("active-item"));
  document.getElementById("nav-" + id)?.classList.add("active-item");
  if (id === "coaches")
    showSubContent(
      "coach-list",
      document.querySelector(".sub-menu-btn.active")
    );
  if (id === "locations") loadLocations();
  window.scrollTo(0, 0);
}

function showSubContent(contentId, btn) {
  if (!btn) return;
  btn.parentElement
    .querySelectorAll(".sub-menu-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  btn
    .closest(".container")
    .querySelectorAll(".sub-content")
    .forEach((c) => (c.style.display = "none"));
  document.getElementById(contentId).style.display = "block";
  if (contentId === "coach-list") loadPeople("HLV", "coach-list", "hlv");
  if (contentId === "judge-list")
    loadPeople("Ban giám khảo", "judge-list", "bgk");
}

async function loadPeople(sheetName, containerId, type) {
  const grid = document.querySelector(`#${containerId} .grid`);
  const data = await fetchData(sheetName, containerId);
  if (!grid) return;
  grid.innerHTML = "";
  data.forEach((p) => {
    const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
    grid.innerHTML += `
      <div class="card" style="text-align:center;">
          <div style="font-size:40px;">🥋</div>
          <h3 style="color:var(--blue);">${p.hovaten}</h3>
          <p>🎖️ ${p.chucvu || "Thành viên"}</p>
          <button class="btn-search" style="width:100%; margin-top:10px;" onclick="askSecurity('${dataStr}', '${type}')">XEM HỒ SƠ</button>
      </div>`;
  });
}

function openModal(h, b) {
  document.getElementById(
    "modal-header"
  ).innerHTML = `<h2 style="color:var(--red); text-align:center;">${h}</h2>`;
  document.getElementById("modal-body").innerHTML = b;
  document.getElementById("infoModal").style.display = "flex";
}
function closeModal() {
  document.getElementById("infoModal").style.display = "none";
  document.getElementById("modal-body").innerHTML = "";
}
function copyToClipboard(t) {
  navigator.clipboard.writeText(t).then(() => alert("✅ Đã sao chép: " + t));
}

function showHome() {
  document.getElementById("home-content").style.display = "block";
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  document
    .querySelectorAll(".menu-item")
    .forEach((i) => i.classList.remove("active-item"));
  document.getElementById("nav-home").classList.add("active-item");
  loadNews();
}

window.onload = () => {
  runTypewriter();
  showHome();

  // Khởi tạo nút Theme
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.onclick = () => {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      document.body.setAttribute("data-theme", isDark ? "light" : "dark");
      document.getElementById("theme-icon").innerText = isDark ? "🌙" : "☀️";
    };
  }

  // Lắng nghe phím Enter cho các ô nhập liệu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const act = document.activeElement.id;
      if (act === "hv-input") searchHV();
      if (act === "achieve-input") searchAchieve();
      if (act === "promo-input") searchPromo();
      if (act === "pass-input")
        document.querySelector("#infoModal .btn-search")?.click();
    }
  });
};

function runTypewriter() {
  const textElement = document.getElementById("typewriter-text");
  const phrases = [
    "CHÀO MỪNG BẠN ĐẾN TAEKWONDO KIÊN LƯƠNG",
    "NƠI NUÔI DƯỠNG ĐAM MÊ VÕ THUẬT",
    "NƠI RÈN Ý CHÍ - KỶ LUẬT - SỨC KHỎE - PHÁT TRIỂN",
  ];
  let pIdx = 0,
    cIdx = 0,
    isDel = false;
  function type() {
    if (!textElement) return;
    const full = phrases[pIdx];
    textElement.textContent = isDel
      ? full.substring(0, cIdx - 1)
      : full.substring(0, cIdx + 1);
    cIdx = isDel ? cIdx - 1 : cIdx + 1;
    let speed = isDel ? 30 : 80;
    if (!isDel && cIdx === full.length) {
      isDel = true;
      speed = 3000;
    } else if (isDel && cIdx === 0) {
      isDel = false;
      pIdx = (pIdx + 1) % phrases.length;
      speed = 500;
    }
    setTimeout(type, speed);
  }
  type();
}

// ================================================================
// HỆ THỐNG HIỂN THỊ HÌNH ẢNH & VIDEO - BẢN HOÀN HẢO 2026
// ================================================================

/**
 * 1. Hàm xử lý link ảnh: Chấp nhận mọi loại link Drive và ảnh trực tiếp
 */
function formatImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  url = url.trim();
  if (url.includes("drive.google.com")) {
    let id = "";
    try {
      // Regex bóc tách ID mạnh mẽ nhất cho Google Drive
      const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
      id = match ? match[1] : "";
      if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    } catch (e) {
      return "";
    }
  }
  return url.startsWith("http") ? url : "";
}

/**
 * 2. Hàm tải Hình ảnh: Tự động ẩn phần trắng nếu không có chú thích
 */
async function loadGallery(showAll = false) {
  const container = document.getElementById("gallery-container");
  const section = container?.closest("section");
  if (!container || !section) return;

  // Lấy dữ liệu từ Sheet "Hình ảnh"
  const data = await fetchData("Hình ảnh");
  if (!data || data.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const sortedData = [...data].reverse();
  const displayData = showAll ? sortedData : sortedData.slice(0, 4);

  let html = `<div class="gallery-grid">`;
  displayData.forEach((item) => {
    // Tìm link từ nhiều tên cột dự phòng (Ưu tiên: Link -> Link ảnh -> link)
    const rawUrl = item["Link"] || item["Link ảnh"] || item["link"];
    const url = formatImageUrl(rawUrl);

    // Tìm chú thích từ nhiều tên cột dự phòng (Ưu tiên: Caption -> Chú thích -> caption)
    let cap = (
      item["Caption"] ||
      item["Chú thích"] ||
      item["caption"] ||
      ""
    ).trim();

    // Điều kiện hiển thị chú thích: Không được trùng với tiêu đề cột
    const hasContent =
      cap !== "" &&
      cap.toLowerCase() !== "caption" &&
      cap.toLowerCase() !== "chú thích" &&
      cap.toLowerCase() !== "link";

    if (url) {
      html += `
            <div class="gallery-card ${hasContent ? "has-caption" : ""}">
                <div class="gallery-img-wrapper">
                    <img src="${url}" 
                         onclick="openModal('CHI TIẾT', '<img src=\\'${url}\\' style=\\'width:100%; border-radius:10px;\\'>${
        hasContent
          ? `<p style=\\'margin-top:15px; font-weight:bold; color:#d32f2f; text-align:center;\\'>${cap}</p>`
          : ""
      }')" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/400?text=Lỗi+Link+Ảnh'">
                </div>
                ${hasContent ? `<div class="media-caption">${cap}</div>` : ""}
            </div>`;
    }
  });
  html += `</div>`;

  if (!showAll && sortedData.length > 4) {
    html += `<div style="text-align:center; width:100%"><button class="btn-search" style="margin:20px auto; width:200px;" onclick="loadGallery(true)">XEM THÊM ẢNH</button></div>`;
  }
  container.innerHTML = html;
}

/**
 * 3. Hàm tải Video: Đồng bộ bố cục với phần Hình ảnh
 */
async function loadVideos(showAll = false) {
  const container = document.getElementById("video-container");
  const section = container?.closest("section");
  if (!container || !section) return;

  const data = await fetchData("Video");
  if (!data || data.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const sortedData = [...data].reverse();
  const displayData = showAll ? sortedData : sortedData.slice(0, 2);

  let html = `<div class="video-grid">`;
  displayData.forEach((item) => {
    const link = item["Link YouTube"] || item["link"] || "";
    let vId = "";
    if (link.includes("v=")) {
      vId = link.split("v=")[1].split("&")[0];
    } else {
      vId = link.split("/").pop().split("?")[0];
    }

    let cap = (item["Caption"] || item["Chú thích"] || "").trim();
    const hasContent =
      cap !== "" &&
      cap.toLowerCase() !== "caption" &&
      cap.toLowerCase() !== "chú thích";

    if (vId) {
      html += `
            <div class="video-card ${hasContent ? "has-caption" : ""}">
                <div class="video-wrapper">
                    <iframe src="https://www.youtube.com/embed/${vId}" allowfullscreen></iframe>
                </div>
                ${hasContent ? `<div class="media-caption">${cap}</div>` : ""}
            </div>`;
    }
  });
  html += `</div>`;

  if (!showAll && sortedData.length > 2) {
    html += `<div style="text-align:center; width:100%"><button class="btn-search" style="margin:25px auto; width:200px; background:#fff; color:#004693; border:1px solid #004693;" onclick="loadVideos(true)">XEM THÊM VIDEO</button></div>`;
  }
  container.innerHTML = html;
}

/**
 * 4. Khởi chạy khi trang tải xong
 */
document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
  loadVideos();
});
