/**
 * HỆ THỐNG QUẢN LÝ CLB TAEKWONDO KIÊN LƯƠNG - PHIÊN BẢN CUỐI CÙNG (ULTIMATE) 2026
 * Đầy đủ: Enter Search, Nút PDF/Video, Fix Năm sinh, Bảo mật tối giản, Full Hội viên.
 */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzF4YvnCbgVjo49bkPvV4zmnJUyTupg8JHDch2sxDcWXor3W6SiAKU03aGpW823Q4CMKg/exec";

// --- 1. TIỆN ÍCH DỮ LIỆU (GIỮ NGUYÊN & TỐI ƯU) ---
const cleanKey = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, "");
};

const getDriveId = (url) => {
  if (!url || typeof url !== "string") return "";
  const regExp = /(?:id=|\/d\/|folderview\?id=)([\w-]+)/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : "";
};

// Sửa lỗi năm sinh: Ép kiểu chuỗi và bóc tách chuẩn 4 số
const formatYearOnly = (val) => {
  if (!val || val === "---" || val === "") return "---";
  const strVal = val.toString();
  const match = strVal.match(/\d{4}/);
  return match ? match[0] : strVal;
};

const formatFullDate = (val) => {
  if (!val || val === "---" || val === "") return "---";
  let d = new Date(val);
  return !isNaN(d.getTime())
    ? `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`
    : val.toString();
};

const convertDriveLink = (url) => {
  const id = getDriveId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url;
};

async function fetchData(tabName) {
  try {
    const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(tabName)}`);
    const data = await res.json();
    return data.map((item) => {
      let newItem = {};
      for (let key in item) newItem[cleanKey(key)] = item[key];
      return newItem;
    });
  } catch (e) {
    return [];
  }
}

// --- 2. HIỆU ỨNG GIAO DIỆN (GIỮ NGUYÊN) ---
function runTypewriter() {
  const textElement = document.getElementById("typewriter-text");
  if (!textElement) return;
  const phrases = [
    "CHÀO MỪNG BẠN ĐẾN VỚI TAEKWONDO KIÊN LƯƠNG",
    "NƠI NUÔI DƯỠNG ĐAM MÊ VÕ THUẬT",
    "KỶ LUẬT VÀ RÈN LUYỆN BẢN LĨNH",
  ];
  let pIdx = 0,
    cIdx = 0,
    isDeleting = false;
  function type() {
    const current = phrases[pIdx];
    textElement.textContent = isDeleting
      ? current.substring(0, cIdx - 1)
      : current.substring(0, cIdx + 1);
    cIdx = isDeleting ? cIdx - 1 : cIdx + 1;
    let speed = isDeleting ? 50 : 100;
    if (!isDeleting && cIdx === current.length) {
      isDeleting = true;
      speed = 2000;
    } else if (isDeleting && cIdx === 0) {
      isDeleting = false;
      pIdx = (pIdx + 1) % phrases.length;
      speed = 500;
    }
    setTimeout(type, speed);
  }
  type();
}

// --- 3. BẢN TIN VÕ ĐƯỜNG (FULL PDF + YOUTUBE + NÚT BẤM) ---
async function loadNews() {
  const container = document.getElementById("news-dynamic-section");
  if (!container) return;
  container.innerHTML = '<div class="taichi"></div>';
  const data = await fetchData("Thông báo");
  const sortedData = data.reverse();

  container.innerHTML = `
        <h3 class="section-title">📢 BẢN TIN <span>VÕ ĐƯỜNG</span></h3>
        <div id="news-grid-latest" class="grid"></div>
        <div id="more-news-btn-container" style="text-align:center; margin-top: 30px;">
          <button class="btn-search" style="background:var(--gray); color:var(--blue); border:1px solid var(--blue); padding:10px 25px;" onclick="toggleOldNews()">📂 XEM TIN CŨ HƠN</button>
        </div>
        <div id="news-grid-old" class="grid" style="display:none; margin-top: 25px; border-top: 2px dashed var(--border); padding-top: 25px;"></div>
    `;

  const latestGrid = document.getElementById("news-grid-latest");
  const oldGrid = document.getElementById("news-grid-old");
  const LOGO_BG =
    "https://placehold.co/600x400/eeeeee/red?text=TAEKWONDO+KIEN+LUONG";

  sortedData.forEach((news, index) => {
    const newsObj = {
      t: news.tieude || "Thông báo",
      d: formatFullDate(news.ngaydang || news.ngay),
      s: news.sapo || "",
      c: (news.noidung || "").replace(/\n/g, "<br>"),
      i: news.linkanh ? convertDriveLink(news.linkanh) : LOGO_BG,
      cap: news.chuthichanh || "",
      vid: news.linkvideo || "",
      pdf: news.linkfile || "",
    };
    const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(newsObj))));
    const cardHTML = `<div class="card"><div style="width:100%; height:180px; overflow:hidden; border-radius:8px 8px 0 0;"><img src="${newsObj.i}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${LOGO_BG}'"></div><div style="padding:15px;"><small style="color:var(--text-muted);">📅 ${newsObj.d}</small><h4 style="color:var(--blue); margin:10px 0; height:45px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${newsObj.t}</h4><button class="btn-search" style="width:100%;" onclick="showFullNews('${dataStr}')">XEM CHI TIẾT</button></div></div>`;
    if (index < 3) latestGrid.innerHTML += cardHTML;
    else oldGrid.innerHTML += cardHTML;
  });
}

function showFullNews(encodedData) {
  const data = JSON.parse(decodeURIComponent(escape(atob(encodedData))));
  let mediaHTML = "";

  // 1. XỬ LÝ ẢNH MINH HỌA - Đảm bảo cân đối và đẹp
  let imageHTML = "";
  if (data.i && !data.i.includes("placehold.co")) {
    imageHTML = `
            <div class="news-image-container">
                <img src="${
                  data.i
                }" class="news-main-img" onerror="this.style.display='none'">
                ${
                  data.cap
                    ? `<p class="news-image-caption"> ${data.cap}</p>`
                    : ""
                }
            </div>`;
  }

  // 2. XỬ LÝ VIDEO
  if (data.vid) {
    let videoId = "";
    if (data.vid.includes("v="))
      videoId = data.vid.split("v=")[1].split("&")[0];
    else if (data.vid.includes("youtu.be/"))
      videoId = data.vid.split("youtu.be/")[1].split("?")[0];
    if (videoId) {
      mediaHTML += `
                <div class="news-media-box">
                    <div class="media-label">🎥 VIDEO NỔI BẬT</div>
                    <div class="video-wrapper">
                        <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
                    </div>
                    <div style="text-align:center;"><a href="${data.vid}" target="_blank" class="btn-modern-red">XEM TRÊN YOUTUBE</a></div>
                </div>`;
    }
  }

  // 3. XỬ LÝ PDF
  if (data.pdf) {
    const pdfId = getDriveId(data.pdf);
    if (pdfId) {
      mediaHTML += `
                <div class="news-media-box">
                    <div class="media-label">📄 TÀI LIỆU CÔNG VĂN</div>
                    <div class="pdf-wrapper">
                        <iframe src="https://drive.google.com/file/d/${pdfId}/preview"></iframe>
                    </div>
                    <div style="text-align:center;"><a href="https://drive.google.com/file/d/${pdfId}/view" target="_blank" class="btn-modern-blue">MỞ TOÀN MÀN HÌNH</a></div>
                </div>`;
    }
  }

  const articleHTML = `
    <style>
        .news-detail-container { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.8; }
        .news-meta { color: #888; font-size: 13px; margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 8px; }
        .news-header-title { font-size: 24px; font-weight: 800; color: #b30000; line-height: 1.4; margin-bottom: 15px; }
        
        /* Cấu trúc Sapo */
        .news-sapo { font-size: 17px; font-weight: 700; color: #444; margin-bottom: 20px; line-height: 1.6; border-left: 4px solid #b30000; padding: 10px 15px; background: #f9f9f9; }

        /* Tối ưu hiển thị ảnh cân đối */
        .news-image-container { margin: 20px 0; text-align: center; }
        .news-main-img { 
            width: 100%; 
            max-height: 400px; /* Giới hạn chiều cao để không choán màn hình */
            object-fit: contain; /* Giữ nguyên tỷ lệ ảnh, không bị méo hay mất chi tiết */
            border-radius: 8px; 
            background: #eee; /* Nền xám nhẹ nếu ảnh chưa tải kịp */
        }
        .news-image-caption { font-size: 14px; color: #777; margin-top: 8px; font-style: italic; }

        .news-body { font-size: 16.5px; text-align: justify; white-space: pre-line; margin-bottom: 30px; }

        .news-media-box { background: #f4f4f4; border-radius: 12px; padding: 15px; margin-top: 25px; border: 1px solid #eee; }
        .media-label { font-weight: 700; font-size: 12px; color: #999; margin-bottom: 12px; text-align: center; letter-spacing: 1px; }
        .video-wrapper, .pdf-wrapper { position: relative; width: 100%; height: 0; overflow: hidden; border-radius: 6px; background: #000; margin-bottom: 15px; }
        .video-wrapper { padding-bottom: 56.25%; }
        .pdf-wrapper { padding-bottom: 120%; }
        .video-wrapper iframe, .pdf-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }

        .btn-modern-red, .btn-modern-blue { display: inline-block; padding: 10px 20px; border-radius: 4px; font-weight: 700; text-decoration: none; font-size: 12px; }
        .btn-modern-red { background: #cc0000; color: #fff; }
        .btn-modern-blue { background: #0056b3; color: #fff; }
    </style>
    
    <div class="news-detail-container">
        <div class="news-meta">📅 ${data.d} | Taekwondo Kiên Lương</div>
        <h1 class="news-header-title">${data.t}</h1>
        <div class="news-sapo">${
          data.s ||
          "Thông báo từ Ban huấn luyện Câu lạc bộ võ thuật Taekwondo Kiên Lương."
        }</div>
        
        ${imageHTML}

        <div class="news-body">${data.c}</div>
        
        ${mediaHTML}
        <div style="height: 20px;"></div>
    </div>`;

  openModal("", articleHTML);
}

// --- 4. TRA CỨU HỘI VIÊN (FULL INFO + ENTER) ---
async function searchHV() {
  const input = document.getElementById("hv-input").value.trim().toLowerCase();
  const resDiv = document.getElementById("hv-result");
  if (!input) return alert("Vui lòng nhập tên võ sinh!");
  resDiv.innerHTML = '<div class="taichi"></div>';
  const data = await fetchData("Thành viên");
  const results = data.filter((hv) =>
    (hv.hovaten || "").toString().toLowerCase().includes(input)
  );
  resDiv.innerHTML =
    results.length > 0
      ? ""
      : '<p style="text-align:center; padding:20px; color:var(--red); font-weight:bold;">❌ KHÔNG TÌM THẤY DỮ LIỆU</p>';

  results.forEach((found) => {
    const maHV = found.mahv || found.mahoivien || "---";
    const toChuc =
      found.tochucthanhvien || found.tochuc || found.donvi || "---";
    resDiv.innerHTML += `
      <div class="martial-id-card" style="max-width: 450px; margin: 25px auto; border: 1px solid var(--border); border-top: 6px solid var(--red); border-radius: 12px; background: white; box-shadow: 0 10px 30px var(--shadow); overflow: hidden; animation: fadeIn 0.5s;">
        <div style="background: var(--gray); padding: 12px 20px; display: flex; justify-content: space-between; align-items:center;">
          <span style="font-weight: 700; color: var(--blue);">🆔 Mã hội viên: ${maHV}</span>
          <button onclick="copyToClipboard('${maHV}')" style="background:var(--red); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:11px;">COPY</button>
        </div>
        <div style="padding: 20px; text-align: left;">
          <p>👤 <strong>Họ tên:</strong> <span style="color:var(--red); text-transform:uppercase; font-weight:bold;">${
            found.hovaten
          }</span></p>
          <p>📅 <strong>Ngày sinh:</strong> ${formatFullDate(
            found.namsinh || found.ngaysinh
          )}</p>
          <p>🏢 <strong>Mã CLB:</strong> ${found.maclb || "---"}</p>
          <p>🌍 <strong>Tổ chức:</strong> ${toChuc}</p>
        </div>
      </div>`;
  });
}

function handleHVEnter(e) {
  if (e.key === "Enter") searchHV();
}

// --- 5. HLV & XÁC THỰC (GỌN NHẸ + ENTER + FIX NĂM SINH) ---
async function loadCoaches() {
  const grid = document.querySelector("#coaches .grid");
  if (!grid) return;
  grid.innerHTML = '<div class="taichi"></div>';
  const data = await fetchData("HLV");
  grid.innerHTML = "";
  data.forEach((hlv) => {
    const hlvData = btoa(unescape(encodeURIComponent(JSON.stringify(hlv))));
    grid.innerHTML += `<div class="card"><h3 style="color:var(--blue);">🥋 ${
      hlv.hovaten
    }</h3><p>🎖️ Chức vụ: ${
      hlv.chucvu || "---"
    }</p><button class="btn-search" style="width:100%; margin-top:10px;" onclick="askHLVPassword('${hlvData}')">HỒ SƠ</button></div>`;
  });
}

function askHLVPassword(encodedData) {
  const authHTML = `
    <div style="text-align:center; padding: 20px;">
      <div style="font-size: 50px; margin-bottom: 15px;">🔒</div>
      <h3 style="color:var(--blue); margin-bottom: 10px;">XÁC THỰC BẢO MẬT</h3>
      <p style="font-size: 14px; color: #555; margin-bottom: 20px;">Vui lòng nhập mật khẩu</p>
      <input type="password" id="hlv-pass-input" placeholder="********" onkeypress="handleHLVEnter(event, '${encodedData}')"
             style="width: 100%; max-width: 250px; padding: 12px; border: 2px solid var(--border); border-radius: 8px; text-align: center; font-size: 18px; margin-bottom: 20px; outline:none;">
      <div id="auth-loading" style="display:none; margin-bottom: 20px;"><div class="taichi" style="width:40px; height:40px; margin: 0 auto;"></div></div>
      <button id="auth-btn" class="btn-search" style="width: 100%; max-width: 250px;" onclick="verifyHLV('${encodedData}')">XÁC NHẬN</button>
    </div>`;
  openModal("BẢO MẬT", authHTML);
  setTimeout(() => document.getElementById("hlv-pass-input")?.focus(), 500);
}

function handleHLVEnter(e, data) {
  if (e.key === "Enter") verifyHLV(data);
}

function verifyHLV(encodedData) {
  const hlv = JSON.parse(decodeURIComponent(escape(atob(encodedData))));
  const inputPass = document.getElementById("hlv-pass-input").value.trim();
  const loading = document.getElementById("auth-loading");
  const btn = document.getElementById("auth-btn");

  if (!inputPass) return alert("Vui lòng nhập mật khẩu!");
  btn.style.display = "none";
  loading.style.display = "block";

  setTimeout(() => {
    const correctPass = hlv.sodienthoai
      ? hlv.sodienthoai.toString().trim()
      : "";
    if (inputPass === correctPass) {
      const detailHTML = `<div style="text-align:left; line-height: 2.2; padding: 5px;">
          <p>👤 <strong>Họ tên:</strong> <span style="color:var(--red); font-weight:bold; text-transform:uppercase;">${
            hlv.hovaten
          }</span></p>
          <p>🎂 <strong>Năm sinh:</strong> ${formatYearOnly(hlv.namsinh)}</p>
          <p>🏅 <strong>Cấp đẳng:</strong> ${hlv.capdang || "---"}</p>
          <p>🎖️ <strong>Chức vụ:</strong> ${hlv.chucvu || "---"}</p>
          <p>📍 <strong>Địa chỉ:</strong> ${hlv.diachi || "---"}</p>
          <p>📞 <strong>Liên hệ:</strong> <a href="tel:${
            hlv.sodienthoai
          }" style="color:var(--blue); font-weight:bold;">${
        hlv.sodienthoai
      }</a></p>
        </div>`;
      openModal(`<h2>🥋THÔNG TIN CHI TIẾT</h2>`, detailHTML);
    } else {
      loading.style.display = "none";
      btn.style.display = "block";
      alert("❌ Mật khẩu không chính xác!");
    }
  }, 800);
}

// --- 6. KHU TẬP, MODAL & ĐIỀU HƯỚNG (GIỮ NGUYÊN) ---
async function loadLocations() {
  const grid = document.querySelector("#locations .grid");
  if (!grid) return;
  grid.innerHTML = '<div class="taichi"></div>';
  const data = await fetchData("KHU TẬP");
  grid.innerHTML = "";
  data.forEach((loc) => {
    grid.innerHTML += `<div class="card"><h3 style="color:var(--red);">📍 ${loc.khuvuc}</h3><p><strong>🏠 Đơn vị:</strong> ${loc.tencaulacbo}</p><p><strong>🥋 HLV:</strong> ${loc.huanluyenvienphutrach}</p><button class="btn-search" style="width:100%; margin-top:10px; background:var(--blue);" onclick="showLocDetail(\`${loc.khuvuc}\`, \`${loc.tencaulacbo}\`, \`${loc.huanluyenvienphutrach}\`, \`${loc.thoigian}\`, \`${loc.sodienthoai}\`)">CHI TIẾT</button></div>`;
  });
}

function showLocDetail(kv, clb, hlv, tg, sdt) {
  openModal(
    `<h2>📍 THÔNG TIN ĐIỂM TẬP</h2>`,
    `<div style="text-align:left; line-height: 1.8;"><p>🚩 <strong>Khu vực:</strong> ${kv}</p><p>🏠 <strong>Đơn vị:</strong> ${clb}</p><p>🥋 <strong>HLV:</strong> ${hlv}</p><p>⏰ <strong>Thời gian:</strong> ${tg}</p><p>📞 <strong>SĐT:</strong> ${sdt}</p></div>`
  );
}

function openModal(h, b) {
  document.getElementById("modal-header").innerHTML = h;
  document.getElementById("modal-body").innerHTML = b;
  document.getElementById("infoModal").style.display = "flex";
}
function closeModal() {
  document.getElementById("infoModal").style.display = "none";
}

function toggleSection(id) {
  document.getElementById("home-content").style.display = "none";
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById(id).style.display = "block";
  if (id === "coaches") loadCoaches();
  if (id === "locations") loadLocations();
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("active-item"));
  document.getElementById("nav-" + id)?.classList.add("active-item");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  document.getElementById("home-content").style.display = "block";
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("active-item"));
  document.getElementById("nav-home")?.classList.add("active-item");
  loadNews();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleOldNews() {
  const old = document.getElementById("news-grid-old");
  const btn = document.querySelector("#more-news-btn-container button");
  const isOpen = old.style.display === "grid";
  old.style.display = isOpen ? "none" : "grid";
  btn.innerHTML = isOpen ? "📂 XEM CÁC TIN CŨ HƠN" : "⬆️ THU GỌN TIN CŨ";
}

function copyToClipboard(t) {
  navigator.clipboard.writeText(t).then(() => alert("✅ Đã sao chép: " + t));
}

window.onload = () => {
  runTypewriter();
  showHome();
  const hvInput = document.getElementById("hv-input");
  if (hvInput) hvInput.addEventListener("keypress", handleHVEnter);

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn)
    themeBtn.onclick = () => {
      const next =
        document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      document.getElementById("theme-icon").innerText =
        next === "dark" ? "☀️" : "🌙";
    };
};
