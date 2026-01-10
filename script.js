/**
 * HỆ THỐNG QUẢN LÝ CLB TAEKWONDO KIÊN LƯƠNG - PHIÊN BẢN TỐI ƯU 2026
 * Đầy đủ: Phân loại tin tức, Hỗ trợ Video/PDF, HLV phụ trách Khu tập
 */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzF4YvnCbgVjo49bkPvV4zmnJUyTupg8JHDch2sxDcWXor3W6SiAKU03aGpW823Q4CMKg/exec";

// --- 1. TIỆN ÍCH HỆ THỐNG ---
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

const formatFullDate = (val) => {
  if (!val || val === "---" || val === "") return "---";
  let d = new Date(val);
  return !isNaN(d.getTime())
    ? `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`
    : val.toString();
};

const formatYearOnly = (val) => {
  if (!val || val === "---" || val === "") return "---";
  let d = new Date(val);
  if (!isNaN(d.getTime())) return d.getFullYear();
  const match = val.toString().match(/\d{4}/);
  return match ? match[0] : val;
};

const convertDriveLink = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return "";
  if (url.includes("drive.google.com")) {
    let id = "";
    if (url.includes("/d/")) id = url.split("/d/")[1].split("/")[0];
    else if (url.includes("id=")) id = url.split("id=")[1].split("&")[0];
    return id ? `https://lh3.googleusercontent.com/d/$${id}` : url;
  }
  return url;
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

// --- 2. HIỆU ỨNG GIAO DIỆN ---
function runTypewriter() {
  const textElement = document.getElementById("typewriter-text");
  const phrases = [
    "CHÀO MỪNG BẠN ĐẾN VỚI TAEKWONDO KIÊN LƯƠNG",
    "NƠI NUÔI DƯỠNG ĐAM MÊ VÕ THUẬT",
    "KỶ LUẬT VÀ RÈN LUYỆN BẢN LĨNH",
  ];
  let phraseIndex = 0,
    charIndex = 0,
    isDeleting = false;
  function type() {
    if (!textElement) return;
    const current = phrases[phraseIndex];
    textElement.textContent = isDeleting
      ? current.substring(0, charIndex - 1)
      : current.substring(0, charIndex + 1);
    charIndex = isDeleting ? charIndex - 1 : charIndex + 1;
    let speed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === current.length) {
      isDeleting = true;
      speed = 2000;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      speed = 500;
    }
    setTimeout(type, speed);
  }
  type();
}

// --- 3. BẢN TIN VÕ ĐƯỜNG (PHÂN LOẠI MỚI/CŨ) ---
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
      <button class="btn-search" style="background:var(--gray); color:var(--blue); border:1px solid var(--blue); padding:10px 25px;" onclick="toggleOldNews()">
        📂 XEM CÁC TIN CŨ HƠN
      </button>
    </div>
    <div id="news-grid-old" class="grid" style="display:none; margin-top: 25px; border-top: 2px dashed var(--border); padding-top: 25px;"></div>
  `;

  const latestGrid = document.getElementById("news-grid-latest");
  const oldGrid = document.getElementById("news-grid-old");
  const LOGO_PLACEHOLDER =
    "https://placehold.co/600x400/eeeeee/red?text=TAEKWONDO+KIEN+LUONG";

  sortedData.forEach((news, index) => {
    const title = news.tieude || "Thông báo";
    const date = formatFullDate(news.ngay);
    const img = news.linkanh
      ? convertDriveLink(news.linkanh)
      : LOGO_PLACEHOLDER;
    const fileLink = news.linkfile || "";
    const content = (news.noidung || "").replace(/\n/g, "<br>");

    const cardHTML = `
      <div class="card">
        <div style="width:100%; height:180px; overflow:hidden; border-radius:8px 8px 0 0; background:#f5f5f5;">
          <img src="${img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${LOGO_PLACEHOLDER}'">
        </div>
        <div style="padding:15px;">
          <small style="color:var(--text-muted);">📅 ${date}</small>
          <h4 style="color:var(--blue); margin:10px 0; height:45px; overflow:hidden;">${title}</h4>
          <button class="btn-search" style="width:100%;" onclick="showFullNews(\`${title}\`, \`${date}\`, \`${content}\`, \`${img}\`, \`${fileLink}\`)">XEM CHI TIẾT</button>
        </div>
      </div>`;

    if (index < 3) latestGrid.innerHTML += cardHTML;
    else oldGrid.innerHTML += cardHTML;
  });

  if (sortedData.length <= 3)
    document.getElementById("more-news-btn-container").style.display = "none";
}

function toggleOldNews() {
  const oldGrid = document.getElementById("news-grid-old");
  const btn = document.querySelector("#more-news-btn-container button");
  if (oldGrid.style.display === "none") {
    oldGrid.style.display = "grid";
    btn.innerHTML = "⬆️ THU GỌN TIN CŨ";
    oldGrid.scrollIntoView({ behavior: "smooth" });
  } else {
    oldGrid.style.display = "none";
    btn.innerHTML = "📂 XEM CÁC TIN CŨ HƠN";
    window.scrollTo({
      top: document.getElementById("news-dynamic-section").offsetTop,
      behavior: "smooth",
    });
  }
}

function showFullNews(t, d, c, i, f) {
  let fileButton = "";
  if (f && f.trim() !== "" && f !== "undefined") {
    const isVideo = f.includes("youtube.com") || f.includes("youtu.be");
    const btnText = isVideo ? "📹 XEM VIDEO CLIP" : "📄 XEM VĂN BẢN (PDF)";
    const btnColor = isVideo ? "#e62117" : "#2196F3";
    fileButton = `<div style="margin-top:20px; text-align:center;"><a href="${f}" target="_blank" style="display:inline-block; background:${btnColor}; color:white; padding:12px 25px; border-radius:5px; text-decoration:none; font-weight:bold;">${btnText}</a></div>`;
  }
  openModal(
    `<h2 style="color:var(--red);">${t}</h2><small>📅 ${d}</small>`,
    `<img src="${i}" style="width:100%; border-radius:8px; margin:15px 0;"><p style="text-align:justify; line-height:1.6;">${c}</p>${fileButton}`
  );
}

// --- 4. TRA CỨU HỘI VIÊN ---
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
    resDiv.innerHTML += `
      <div class="martial-id-card" style="max-width: 450px; margin: 25px auto; border: 1px solid var(--border); border-top: 6px solid var(--red); border-radius: 12px; background: var(--card-bg); box-shadow: 0 10px 30px var(--shadow); overflow: hidden;">
        <div style="background: var(--gray); padding: 12px 20px; display: flex; justify-content: space-between;">
          <span style="font-weight: 700; color: var(--blue);">🆔 Mã hội viên: ${maHV}</span>
          <button onclick="copyToClipboard('${maHV}')" style="background:var(--red); color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">COPY</button>
        </div>
        <div style="padding: 20px; text-align: left;">
          <p>👤 <strong>Họ tên:</strong> <span style="color:var(--red); text-transform:uppercase;">${
            found.hovaten
          }</span></p>
          <p>📅 <strong>Ngày sinh:</strong> ${formatFullDate(
            found.namsinh || found.ngaysinh
          )}</p>
          <p>🏢 <strong>Mã CLB:</strong> ${found.maclb || "---"}</p>
          <p>🌍 <strong>Tổ chức:</strong> ${found.tochucthanhvien || "---"}</p>
        </div>
      </div>`;
  });
}

// --- 5. HLV & KHU TẬP (CẬP NHẬT HLV PHỤ TRÁCH) ---
async function loadCoaches() {
  const grid = document.querySelector("#coaches .grid");
  if (!grid) return;
  grid.innerHTML = '<div class="taichi"></div>';
  const data = await fetchData("HLV");
  grid.innerHTML = "";

  data.forEach((hlv) => {
    // Lấy số điện thoại từ cột "Số điện thoại"
    const sdt = hlv.sodienthoai || "";

    grid.innerHTML += `
      <div class="card">
        <h3 style="color:var(--blue);">🥋 ${hlv.hovaten}</h3>
        <p>🎖️ Chức vụ: ${hlv.chucvu || "---"}</p>
        <button class="btn-search" style="width:100%; margin-top:10px;" 
          onclick="showHLVDetail(\`${hlv.hovaten}\`, \`${hlv.namsinh}\`, \`${
      hlv.capdang
    }\`, \`${hlv.chucvu}\`, \`${hlv.diachi}\`, \`${sdt}\`)">
          HỒ SƠ CHI TIẾT
        </button>
      </div>`;
  });
}

async function loadLocations() {
  const grid = document.querySelector("#locations .grid");
  if (!grid) return;
  grid.innerHTML = '<div class="taichi"></div>';
  const data = await fetchData("KHU TẬP");
  grid.innerHTML = "";
  data.forEach((loc) => {
    const hlvPhuTrach = loc.huanluyenvienphutrach || "Đang cập nhật";
    grid.innerHTML += `
      <div class="card">
        <h3 style="color:var(--red);">📍 ${loc.khuvuc || "Khu vực"}</h3>
        <p><strong>🏠 Đơn vị:</strong> ${loc.tencaulacbo || "CLB"}</p>
        <p style="color: var(--blue);"><strong>🥋 HLV:</strong> ${hlvPhuTrach}</p>
        <button class="btn-search" style="width:100%; margin-top:10px; background:var(--blue);" onclick="showLocDetail(\`${
          loc.khuvuc
        }\`, \`${loc.tencaulacbo}\`, \`${hlvPhuTrach}\`, \`${
      loc.thoigian
    }\`, \`${loc.sodienthoai}\`)">CHI TIẾT</button>
      </div>`;
  });
}

function showLocDetail(kv, clb, hlv, tg, sdt) {
  openModal(
    `<h2>📍 THÔNG TIN ĐIỂM TẬP</h2>`,
    `<div style="text-align:left;"><p><strong>🚩 Khu vực:</strong> ${kv}</p><p><strong>🏠 Đơn vị:</strong> ${clb}</p><p><strong>🥋 HLV phụ trách:</strong> <span style="color:var(--red); font-weight:bold;">${hlv}</span></p><p><strong>⏰ Thời gian:</strong> ${tg}</p><p><strong>📞 SĐT:</strong> <a href="tel:${sdt}">${sdt}</a></p></div>`
  );
}

function showHLVDetail(ten, ns, cap, chuc, dc, sdt) {
  let phoneHTML = sdt
    ? `<p><strong>📞 Số điện thoại:</strong> <a href="tel:${sdt}" style="color:var(--blue); font-weight:bold; text-decoration:none;">${sdt}</a></p>`
    : "";

  openModal(
    `<h2>🥋 HỒ SƠ HUẤN LUYỆN VIÊN</h2>`,
    `<div style="text-align:left; line-height: 1.8;">
        <p><strong>👤 Họ tên:</strong> <span style="color:var(--red); font-weight:bold; text-transform:uppercase;">${ten}</span></p>
        <p><strong>🎂 Năm sinh:</strong> ${formatYearOnly(ns)}</p>
        <p><strong>🏅 Cấp đẳng:</strong> ${cap}</p>
        <p><strong>🎖️ Chức vụ:</strong> ${chuc}</p>
        <p><strong>📍 Địa chỉ:</strong> ${dc || "---"}</p>
        ${phoneHTML}
     </div>`
  );
}

// --- 6. MODAL & ĐIỀU HƯỚNG ---
function openModal(h, b) {
  document.getElementById("modal-header").innerHTML = h;
  document.getElementById("modal-body").innerHTML = b;
  document.getElementById("infoModal").style.display = "flex";
}
function closeModal() {
  document.getElementById("infoModal").style.display = "none";
}

function toggleSection(id) {
  const home = document.getElementById("home-content");
  if (home) home.style.display = "none";
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  const target = document.getElementById(id);
  if (target) target.style.display = "block";
  if (id === "coaches") loadCoaches();
  if (id === "locations") loadLocations();
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("active-item"));
  const btn = document.getElementById("nav-" + id);
  if (btn) btn.classList.add("active-item");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  const home = document.getElementById("home-content");
  if (home) home.style.display = "block";
  document
    .querySelectorAll(".content-section")
    .forEach((s) => (s.style.display = "none"));
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("active-item"));
  const btn = document.getElementById("nav-home");
  if (btn) btn.classList.add("active-item");
  loadNews();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function copyToClipboard(t) {
  navigator.clipboard.writeText(t).then(() => alert("✅ Đã sao chép: " + t));
}

// --- 7. KHỞI CHẠY ---
window.onload = () => {
  runTypewriter();
  showHome();
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.onclick = () => {
      const next =
        document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      document.getElementById("theme-icon").innerText =
        next === "dark" ? "☀️" : "🌙";
    };
  }
  const hvInput = document.getElementById("hv-input");
  if (hvInput)
    hvInput.onkeypress = (e) => {
      if (e.key === "Enter") searchHV();
    };
};
