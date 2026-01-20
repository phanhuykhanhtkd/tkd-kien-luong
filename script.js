const API_URL =
  "https://script.google.com/macros/s/AKfycbwQym74KwYsmt9uZBrByJ0WChGKkCHgiHV4mqwpa9TdZPK2WCuS9aF6Pp1Nvrsk3b0H/exec";
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
        d.getMonth() + 1,
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
      `🔒 Hệ thống đang khóa bảo mật.\nVui lòng quay lại sau: ${h} giờ ${m} phút.`,
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

async function loadNews(showAll = false) {
  const container = document.getElementById("news-dynamic-section");
  if (!container) return;

  container.innerHTML =
    '<div style="text-align:center; padding:20px; color:var(--text-muted);">Đang tải bản tin...</div>';

  const data = await fetchData("Thông báo", "news-dynamic-section");
  if (!data || data.length === 0) {
    container.innerHTML =
      '<p style="text-align:center;">Chưa có thông báo nào.</p>';
    return;
  }

  const sortedData = [...data].reverse();
  // Mặc định hiện 2 tin, nếu nhấn xem thêm thì hiện hết
  const displayData = showAll ? sortedData : sortedData.slice(0, 2);

  let html = `<h3 class="section-title" style="text-align:left; margin-bottom:20px;">📰 TIN TỨC <span>VÕ ĐƯỜNG</span></h3>`;
  html += `<div style="display: flex; flex-direction: column; gap: 15px;">`;

  displayData.forEach((news) => {
    const imgList = (news.linkanh || "")
      .split(/[\n,]/)
      .filter((l) => l.trim() !== "");
    const firstImgId =
      imgList.length > 0 ? getDriveId(imgList[0].trim()) : null;
    const thumb = firstImgId
      ? `https://drive.google.com/thumbnail?id=${firstImgId}&sz=w400`
      : null;

    // --- KHÔI PHỤC LOGIC NHẬN DIỆN ICON (BADGES) ---
    let badges = "";
    if (news.linkanh && news.linkanh.trim() !== "") {
      badges += `<span style="background:#4caf50; color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:5px; font-weight:bold;">🖼️ ẢNH</span>`;
    }
    if (news.linkvideo && news.linkvideo.trim() !== "") {
      badges += `<span style="background:#ff0000; color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:5px; font-weight:bold;">🎥 VIDEO</span>`;
    }
    if (news.linkfile && news.linkfile.trim() !== "") {
      badges += `<span style="background:#007bff; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">📄 TÀI LIỆU</span>`;
    }

    const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(news))));

    html += `
      <div class="news-item-card" style="display: flex; gap: 12px; background: var(--card-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border); cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.03);" onclick="showFullNews('${dataStr}')">
          ${thumb ? `<img src="${thumb}" style="width: 90px; height: 90px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">` : ""}
          <div style="flex-grow: 1;">
              <div style="margin-bottom: 5px;">${badges}</div>
              <h4 style="margin: 0 0 5px 0; color: var(--blue); font-size: 1.05rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${news.tieude}</h4>
              <small style="color: var(--text-muted); font-size: 12px;">📅 ${formatFullDate(news.ngay)}</small>
          </div>
      </div>`;
  });
  html += `</div>`;

  // Xử lý Nút Xem thêm / Thu gọn
  if (sortedData.length > 2) {
    if (!showAll) {
      html += `
      <div style="text-align: center; margin-top: 20px;">
          <button class="btn-search" style="background: white; color: var(--blue); border: 2px solid var(--blue); width: auto; padding: 8px 25px; border-radius: 20px; font-weight: bold; cursor: pointer;" onclick="loadNews(true)">XEM CÁC BẢN TIN CŨ HƠN ↓</button>
      </div>`;
    } else {
      html += `
      <div style="text-align: center; margin-top: 20px;">
          <button class="btn-search" style="background: #f4f4f4; color: #444; border: 2px solid #ccc; width: auto; padding: 8px 25px; border-radius: 20px; font-weight: bold; cursor: pointer;" onclick="loadNews(false); document.getElementById('news').scrollIntoView({behavior:'smooth'});">THU GỌN BẢN TIN ↑</button>
      </div>`;
    }
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
          url,
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
        }</a>`,
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
          data.ngay,
        )} | 🏛️ CLB TAEKWONDO KIÊN LƯƠNG</p>
        
        <div style="line-height: 1.7; font-size: 1.05rem; color: #333;">
            <p style="font-weight: bold; font-size: 1.15rem; margin-bottom: 20px; color: #000;">${
              data.sapo || ""
            }</p>
            <div style="margin-bottom: 25px;">${(data.noidung || "").replace(
              /\n/g,
              "<br>",
            )}</div>
        </div>

        <div class="article-gallery">${mediaGallery}</div>
        
        <div class="article-videos">${videoSection}</div>
        
        ${fileSection}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: bold;">CHIA SẺ BÀI VIẾT:</span>
            <div style="display: flex; gap: 8px;">
                <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  shareUrl,
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
    (d.hovaten || "").toLowerCase().includes(val),
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

async function searchAchieve() {
  await performSecureSearch(
    "achieve",
    "achieve-input",
    "achieve-result",
    "Thành tích",
  );
}
async function searchPromo() {
  await performSecureSearch(
    "promo",
    "promo-input",
    "promo-result",
    "Thăng cấp",
  );
}

async function performSecureSearch(type, inputId, resultId, sheetName) {
  const val = document.getElementById(inputId).value.trim().toLowerCase();
  const resDiv = document.getElementById(resultId);
  if (!val) return alert("Vui lòng nhập tên!");

  const data = await fetchData(sheetName, resultId);
  const results = data.filter((d) =>
    (d.hovaten || "").toLowerCase().includes(val),
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

  // NẾU LÀ THÀNH TÍCH HOẶC KẾT QUẢ THI -> HIỆN THẲNG LUÔN
  if (type === "achieve" || type === "promo") {
    showDirectDetail(encoded, type);
    return;
  }

  // NẾU LÀ BAN HUẤN LUYỆN -> VẪN HIỆN Ô NHẬP MẬT KHẨU
  openModal(
    "🔒 BẢO MẬT HỆ THỐNG",
    `
    <div style="text-align:center;">
        <p style="margin-bottom:15px;">Vui lòng nhập mật khẩu để xem hồ sơ HLV</p>
        <input type="password" id="pass-input" placeholder="*********" style="width:100%; padding:15px; text-align:center; font-size:24px; border:2px solid var(--border); border-radius:10px; margin-bottom:20px; background:var(--gray); color:var(--text);">
        <button class="btn-search" style="width:100%;" onclick="verifySecure('${encoded}', '${type}')">XÁC NHẬN</button>
    </div>`,
  );
}

// Hàm bổ trợ hiển thị trực tiếp cho VĐV và Kết quả thi
function showDirectDetail(encoded, type) {
  const p = JSON.parse(decodeURIComponent(escape(atob(encoded))));
  let content = `<div style="text-align:left; line-height:2.2; font-size:16px;">`;
  let title = "CHI TIẾT";

  if (type === "achieve") {
    title = "THÀNH TÍCH VĐV";
    content += `<p>🏆 <b>Huy chương:</b> <span style="color:var(--red); font-weight:bold;">${p.huychuong}</span></p><p>🥋 <b>Cấp đai:</b> ${p.capdai}</p><p>📌 <b>Giải đấu:</b> ${p.tengiaidau}</p><p>📝 <b>Nội dung:</b> ${p.noidung}</p><p>📅 <b>Năm:</b> ${p.namdatgiai}</p>`;
  } else if (type === "promo") {
    title = "KẾT QUẢ THĂNG CẤP";
    content += `<p>✅ <b>Kết quả:</b> <span style="color:green; font-weight:bold;">${p.ketqua}</span></p><p>🥋 <b>Dự thi:</b> ${p.duthimaydang}</p><p>🏟️ <b>Kỳ thi:</b> ${p.tenkythi}</p><p>🏢 <b>Đơn vị:</b> ${p.donvitochuc}</p>`;
  }
  openModal(title, content + `</div>`);
}

function verifySecure(encoded, type) {
  const p = JSON.parse(decodeURIComponent(escape(atob(encoded))));
  const input = document.getElementById("pass-input").value;

  // Mật khẩu cho HLV/BGK vẫn là Số điện thoại
  const pass = p.sodienthoai?.toString();

  if (input === pass) {
    failCount = 0;
    let content = `<div style="text-align:left; line-height:2.2; font-size:16px;">`;
    content += `<p>👤 <b>Họ tên:</b> ${p.hovaten}</p><p>🏅 <b>Cấp đẳng:</b> ${p.capdang}</p><p>💼 <b>Chức vụ:</b> ${p.chucvu}</p><p>📞 <b>SĐT:</b> ${p.sodienthoai}</p><p>📍 <b>Địa chỉ:</b> ${p.diachi || "---"}</p>`;
    openModal("HỒ SƠ BAN HUẤN LUYỆN", content + `</div>`);
  } else {
    failCount++;
    if (failCount >= 5) {
      localStorage.setItem("tkd_lock_time", new Date().getTime() + 28800000);
      alert("❌ BẠN ĐÃ NHẬP SAI 5 LẦN. HỆ THỐNG SẼ KHÓA 8 GIỜ.");
      closeModal();
    } else alert(`Sai mật khẩu! Còn ${5 - failCount} lần thử.`);
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
    </div>`,
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
      document.querySelector(".sub-menu-btn.active"),
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
  document.getElementById("modal-header").innerHTML =
    `<h2 style="color:var(--red); text-align:center;">${h}</h2>`;
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

async function loadGallery(showAll = false) {
  const container = document.getElementById("gallery-container");
  if (!container) return;

  const data = await fetchData("Hình ảnh");
  if (!data || data.length === 0) return;

  const sortedData = [...data].reverse();
  const displayData = showAll ? sortedData : sortedData.slice(0, 4);

  let html = `<div class="gallery-grid">`;
  displayData.forEach((item) => {
    const rawUrl = item["Link"] || item["Link ảnh"] || item["link"];
    const url = formatImageUrl(rawUrl);
    let cap = (
      item["Caption"] ||
      item["Chú thích"] ||
      item["caption"] ||
      ""
    ).trim();
    if (url) {
      html += `
            <div class="gallery-card">
                <div class="gallery-img-wrapper">
                    <img src="${url}" onclick="openModal('CHI TIẾT', '<img src=\\'${url}\\' style=\\'width:100%; border-radius:10px;\\'>')" loading="lazy">
                </div>
                ${cap && cap.toLowerCase() !== "caption" ? `<div class="media-caption">${cap}</div>` : ""}
            </div>`;
    }
  });
  html += `</div>`;

  if (sortedData.length > 4) {
    if (!showAll) {
      html += `<div style="text-align:center; width:100%"><button class="btn-search" style="margin:20px auto; width:200px;" onclick="loadGallery(true)">XEM THÊM ẢNH ↓</button></div>`;
    } else {
      // ĐOẠN SỬA LỖI: Kiểm tra ID trước khi cuộn
      html += `<div style="text-align:center; width:100%"><button class="btn-search" style="margin:20px auto; width:200px; background:#666; color:white;" 
                onclick="loadGallery(false); 
                const section = document.getElementById('activities') || document.querySelector('.activities') || document.querySelector('section');
                if(section) section.scrollIntoView({behavior:'smooth'});">THU GỌN ẢNH ↑</button></div>`;
    }
  }
  container.innerHTML = html;
}
// Thêm từ khóa async ở đầu hàm để xử lý đợi dữ liệu từ Sheet
async function loadVideos(showAll = false) {
  const container = document.getElementById("video-container");
  if (!container) return;

  // Hiển thị trạng thái đang tải (Loading nhẹ)
  container.innerHTML =
    '<div class="taichi-loader" style="width:40px; height:40px;"></div>';

  const data = await fetchData("Video");

  // 1. KIỂM TRA DỮ LIỆU: Nếu không có dữ liệu hoặc lỗi
  if (!data || data.length === 0 || data.error) {
    const parentSection = container.closest("section"); // Tìm section bao ngoài
    if (parentSection) {
      parentSection.style.display = "none"; // THÊM DÒNG NÀY: Ẩn toàn bộ khu vực video
    }
    return;
  }

  // 2. NẾU CÓ DỮ LIỆU: Hiện lại section
  const parentSection = container.closest("section");
  if (parentSection) {
    parentSection.style.display = "block"; // THÊM DÒNG NÀY: Hiện lại nếu có dữ liệu
  }

  const sortedData = [...data].reverse();
  const displayData = showAll ? sortedData : sortedData.slice(0, 2);

  let html = `<div class="video-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 25px;">`;

  displayData.forEach((item) => {
    const linkKey = Object.keys(item).find((k) =>
      cleanKey(k).includes("linkyoutube"),
    );
    const link = (item[linkKey] || "").trim();
    let vId = "";
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = link.match(regExp);
    if (match && match[2].length === 11) vId = match[2];

    const capKey = Object.keys(item).find((k) => cleanKey(k) === "caption");
    let cap =
      (item[capKey] || "").trim() || "Video hoạt động CLB Taekwondo Kiên Lương";

    if (vId) {
      html += `
        <div class="video-card" style="background: var(--card-bg); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow);">
          <div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; background: #000;">
            <iframe src="https://www.youtube.com/embed/${vId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
          </div>
          <div style="padding: 15px; border-top: 1px solid var(--border);">
            <p style="font-size: 14px; color: var(--text); font-style: italic; margin-bottom: 12px; line-height: 1.5; min-height: 42px;">"${cap}"</p>
            <a href="https://www.youtube.com/watch?v=${vId}" target="_blank" 
               style="display: inline-flex; align-items: center; gap: 8px; color: #ff0000; text-decoration: none; font-weight: bold; font-size: 13px;">
               <span style="font-size: 18px;">🔴</span> Xem trên YouTube
            </a>
          </div>
        </div>`;
    }
  });
  html += `</div>`;

  if (sortedData.length > 2) {
    if (!showAll) {
      html += `<div style="text-align:center; width: 100%;"><button class="btn-search" onclick="loadVideos(true)" style="margin-top:30px; width: 220px;">XEM THÊM VIDEO ↓</button></div>`;
    } else {
      html += `<div style="text-align:center; width: 100%;"><button class="btn-search" onclick="loadVideos(false); const target = document.getElementById('activities') || document.querySelector('section'); if(target) target.scrollIntoView({behavior:'smooth'});" style="margin-top:30px; width: 220px; background:#666; color:white;">THU GỌN VIDEO ↑</button></div>`;
    }
  }

  container.innerHTML = html;
}
document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
  loadVideos();
});

const MY_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwQym74KwYsmt9uZBrByJ0WChGKkCHgiHV4mqwpa9TdZPK2WCuS9aF6Pp1Nvrsk3b0H/exec";

let ENROLL_CLBS = [];
let spamCounter = 0;
let currentStep = 1;

// --- 1. ĐIỀU HƯỚNG BƯỚC (NEW) ---
function goToStep(step) {
  // Chỉ kiểm tra khi muốn từ bước 1 sang bước 2
  if (step === 2 && currentStep === 1) {
    const sName = document.getElementById("inp-sName").value.trim();
    const pPhone = document.getElementById("inp-pPhone").value.trim();

    // Regex kiểm tra số điện thoại Việt Nam chuẩn 10 số
    const phoneRegex = /^(03|05|07|08|09|02[0-9])\d{8}$/;

    if (!sName) {
      alert("Vui lòng nhập họ tên Võ sinh!");
      document.getElementById("inp-sName").focus();
      return;
    }

    if (!pPhone) {
      alert("Số điện thoại là bắt buộc để Thầy liên hệ!");
      document.getElementById("inp-pPhone").focus();
      return;
    }

    if (!phoneRegex.test(pPhone)) {
      alert(
        "Số điện thoại không hợp lệ! Vui lòng nhập đủ 10 số (VD: 0912345678)",
      );
      document.getElementById("inp-pPhone").focus();
      return;
    }
  }

  // Nếu vượt qua kiểm tra hoặc ở các bước khác thì mới thực hiện chuyển bước
  document
    .querySelectorAll(".step-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${step}`).classList.add("active");

  updateStepper(step);
  currentStep = step;
}

function updateStepper(step) {
  document.querySelectorAll(".stepper-item").forEach((item, index) => {
    if (index + 1 <= step) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
  const statusText = [
    "",
    "Thông tin võ sinh",
    "Chọn lớp tập luyện",
    "Hoàn tất đăng ký",
  ];
  document.getElementById("status-text").innerText = statusText[step];
}

// --- 2. THU GỌN / MỞ RỘNG FORM (ENHANCED) ---
function toggleEnrollForm() {
  const content = document.getElementById("enroll-content");
  const btnToggle = document.getElementById("btn-toggle-view");

  if (content.classList.contains("enroll-content-show")) {
    content.classList.replace("enroll-content-show", "enroll-content-hidden");
    btnToggle.innerText = "+";
  } else {
    content.classList.replace("enroll-content-hidden", "enroll-content-show");
    btnToggle.innerText = "−";
    if (ENROLL_CLBS.length === 0) fetchEnrollmentData();
  }
}

function toggleQR() {
  const qrArea = document.getElementById("qr-area");
  qrArea.style.display = qrArea.style.display === "block" ? "none" : "block";
}

// --- 3. KIỂM TRA KHÓA HỆ THỐNG (GIỮ NGUYÊN LOGIC CỦA BẠN) ---
function checkSystemLock() {
  const lockUntil = localStorage.getItem("system_lock_time");
  const btn = document.getElementById("btn-enroll-submit");
  if (!btn) return false;

  if (lockUntil && Date.now() < parseInt(lockUntil)) {
    const remain = parseInt(lockUntil) - Date.now();
    const h = Math.floor(remain / 3600000);
    const m = Math.ceil((remain % 3600000) / 60000);
    btn.disabled = true;
    btn.innerText = `🔒 Tạm khóa (${h}h ${m}p)`;
    btn.style.filter = "grayscale(1)";
    return true;
  }

  if (btn.disabled && btn.innerText.includes("Tạm khóa")) {
    btn.disabled = false;
    btn.innerText = "XÁC NHẬN GỬI ĐƠN 🥋";
    btn.style.filter = "none";
  }
  return false;
}

// --- 4. TẢI DỮ LIỆU CLB (GIỮ NGUYÊN) ---
async function fetchEnrollmentData() {
  const clbSelect = document.getElementById("sel-CLB");
  if (!clbSelect) return;
  try {
    const res = await fetch(MY_WEB_APP_URL);
    const data = await res.json();
    ENROLL_CLBS = data.clubs || [];
    clbSelect.innerHTML =
      '<option value="" disabled selected>-- Chọn Câu lạc bộ --</option>';
    ENROLL_CLBS.forEach((c) => {
      clbSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
  } catch (e) {
    console.error("Lỗi tải CLB:", e);
  }
}

// --- 5. XỬ LÝ CHỌN CLB & GIÁ (GIỮ NGUYÊN ID CỦA BẠN) ---
function onClubChange() {
  const clbVal = document.getElementById("sel-CLB").value;
  const clb = ENROLL_CLBS.find((x) => x.name === clbVal);
  if (clb) {
    document.getElementById("info-card-display").style.display = "block";
    document.getElementById("txt-bank-info").innerText =
      (clb.bank || "") + " - STK: " + (clb.stk || "");
    const qrImg = document.getElementById("img-qr-code");
    if (qrImg) {
      qrImg.src = clb.qr || "";
    }

    const sizeSelect = document.getElementById("sel-Size");
    sizeSelect.innerHTML = '<option value="">-- Chọn Size võ phục --</option>';
    if (clb.sizes && clb.sizes.length > 0) {
      clb.sizes.forEach((s) => {
        if (s.trim()) {
          sizeSelect.innerHTML += `<option value="${s.trim()}">Size: ${s.trim()} (+${Number(
            clb.sizePrice,
          ).toLocaleString()}đ)</option>`;
        }
      });
    }
    onPriceUpdate();
  }
}

function onPriceUpdate() {
  const clbVal = document.getElementById("sel-CLB").value;
  const clb = ENROLL_CLBS.find((x) => x.name === clbVal);
  const sizeVal = document.getElementById("sel-Size").value;
  let total = clb ? parseInt(clb.fee) : 0;
  if (sizeVal) total += parseInt(clb.sizePrice || 0);
  document.getElementById("final-amount").innerText = total.toLocaleString();
}

// --- 6. NÉN ẢNH (GIỮ NGUYÊN CÔNG THỨC CỦA BẠN) ---
async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width,
          height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
      };
    };
  });
}

function updateFileName(input) {
  const status = document.getElementById("upload-status");
  if (input.files[0]) {
    status.innerText = "✅ Đã chọn: " + input.files[0].name;
    status.style.color = "#004693";
  }
}

// --- 7. GỬI FORM ---
const form = document.getElementById("pro-martial-form");
if (form) {
  form.onsubmit = async function (e) {
    e.preventDefault();
    if (checkSystemLock()) return;

    const btn = document.getElementById("btn-enroll-submit");
    btn.disabled = true;
    btn.innerText = "⏳ ĐANG GỬI HỒ SƠ...";

    try {
      const fileInp = document.getElementById("inp-bill");
      let base64 = fileInp.files[0]
        ? await compressImage(fileInp.files[0])
        : "";

      const payload = {
        parentName: document.getElementById("inp-pName").value,
        studentName: document.getElementById("inp-sName").value,
        studentDOB: document.getElementById("inp-sDOB").value,
        parentPhone: document.getElementById("inp-pPhone").value,
        parentEmail: document.getElementById("inp-pEmail").value,
        clubName: document.getElementById("sel-CLB").value,
        sizeDo: document.getElementById("sel-Size").value || "HLV tư vấn size",
        totalMoney: document
          .getElementById("final-amount")
          .innerText.replace(/,/g, ""),
        billData: base64,
      };

      const response = await fetch(MY_WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await response.text();

      if (result.includes("Success")) {
        alert(
          "🎉 Chúc mừng! Câu lạc bộ võ thuật Taekwondo Kiên Lương đã xác nhận đăng kí từ phụ huynh. Hẹn sớm gặp gia đình mình!",
        );
        location.reload();
      } else {
        throw new Error("Server Error");
      }
    } catch (err) {
      spamCounter++;
      if (spamCounter >= 3) {
        localStorage.setItem(
          "system_lock_time",
          Date.now() + 8 * 60 * 60 * 1000,
        );
        checkSystemLock();
      }
      alert("⚠️ Lỗi kết nối! Vui lòng thử lại hoặc gọi trực tiếp cho Thầy.");
      btn.disabled = false;
      btn.innerText = "XÁC NHẬN GỬI ĐƠN 🥋";
    }
  };
}

// Khởi tạo
setInterval(checkSystemLock, 1000);
checkSystemLock();
fetchEnrollmentData();

function showSection(id) {
  // Ẩn tất cả các mục
  document.querySelectorAll(".content-section").forEach((s) => {
    s.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) {
    target.style.display = "block"; // Hiện mục được chọn

    // Cuộn màn hình nhẹ nhàng đến vị trí vừa chèn
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Tự động load dữ liệu cho mục đó
  if (id === "coach-section") loadCoaches();
  if (id === "location-section") loadLocations();
  if (id === "news-dynamic-section") loadNews();
}

// --- XỬ LÝ MÀN HÌNH LOADING ---
window.addEventListener("load", function () {
  const loader = document.getElementById("loading-screen");

  // Đợi thêm một chút (khoảng 0.5 giây) để tạo cảm giác mượt mà
  setTimeout(() => {
    loader.classList.add("loader-hidden");
  }, 500);
});

// Bạn cũng có thể gọi hàm này khi chuyển đổi Section để tạo hiệu ứng load giả
function triggerLoading() {
  const loader = document.getElementById("loading-screen");
  loader.classList.remove("loader-hidden");
  setTimeout(() => {
    loader.classList.add("loader-hidden");
  }, 400);
}
