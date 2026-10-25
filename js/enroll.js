/* =====================================================================
   GHI DANH "3 BƯỚC – 60 GIÂY"
   B1 Chọn cơ sở (+ học thử / chính thức) → B2 Thông tin → B3 Xác nhận
   Sau khi gửi: Mã đơn + mã QR VietQR có sẵn số tiền & nội dung CK.
   ===================================================================== */
import { CONFIG } from "./config.js";
import { $, $$, esc, str, norm, money, toNumber, normalizePhone, PHONE_RE, toDate, uid, store, img, pad } from "./utils.js";
import { post } from "./api.js";
import { toast, copyText } from "./ui.js";

const DRAFT_KEY = "tkd_enroll_draft";
const LAST_KEY = "tkd_last_enroll";
const NAME_RE = /^[\p{L}][\p{L}\s'.-]{1,59}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STEP_LABEL = ["", "Chọn cơ sở", "Thông tin võ sinh", "Xác nhận"];

const S = { clubs: [], step: 1, type: "official", club: -1, submitting: false, result: null, pendingClub: null };

const f = (id) => $("#" + id);
const val = (id) => str(f(id)?.value);

/* ------------------------------ Bước 1 ------------------------------ */
function renderClubs() {
  const box = f("en-clubs");
  if (!S.clubs.length) {
    box.innerHTML = `<div class="skel skel-club"></div><div class="skel skel-club"></div>`;
    return;
  }
  box.innerHTML = S.clubs
    .map(
      (c, i) => `<label class="club-opt">
        <input type="radio" name="en-club" value="${i}" ${S.club === i ? "checked" : ""}>
        <span class="club-card">
          <span class="club-name">${esc(c.name)}</span>
          ${str(c.detail) ? `<span class="club-detail">${esc(c.detail)}</span>` : ""}
          ${str(c.hlv) ? `<span class="club-hlv">HLV: ${esc(c.hlv)}</span>` : ""}
          <span class="club-fee">${toNumber(c.fee) ? money(toNumber(c.fee)) : "Liên hệ"}</span>
          <span class="club-check" aria-hidden="true"></span>
        </span>
      </label>`,
    )
    .join("");
}

export function setClubs(clubs = []) {
  const prevName = S.clubs[S.club]?.name;
  S.clubs = clubs;
  if (prevName) S.club = clubs.findIndex((c) => c.name === prevName);
  if (S.pendingClub !== null && clubs[S.pendingClub]) {
    S.club = S.pendingClub;
    S.pendingClub = null;
  }
  renderClubs();
}

export function preselectClub(i) {
  if (S.clubs[i]) {
    S.club = i;
    renderClubs();
  } else S.pendingClub = i;
  if (S.step !== 1 && !S.result) showStep(1);
}

/* ------------------------------ Điều hướng bước ------------------------------ */
function setError(el, msg) {
  const field = el.closest(".field, .fieldset");
  const box = field && $(".field-error", field);
  if (box) box.textContent = msg;
  el.setAttribute("aria-invalid", msg ? "true" : "false");
}

function validDob(v) {
  const d = toDate(v);
  if (!d) return false;
  const age = (Date.now() - d) / (365.25 * 864e5);
  return age >= 3 && age <= 80;
}

function validate(step) {
  let ok = true;
  const check = (id, test, msg) => {
    const el = f(id);
    const good = test(str(el.value));
    setError(el, good ? "" : msg);
    if (!good && ok) {
      ok = false;
      el.focus({ preventScroll: false });
    }
  };
  if (step === 1) {
    const good = S.club >= 0 && S.clubs[S.club];
    f("en-club-error").textContent = good ? "" : "Vui lòng chọn một cơ sở.";
    if (!good) ok = false;
  }
  if (step === 2) {
    check("en-sName", (v) => NAME_RE.test(v), "Nhập họ tên võ sinh (chỉ gồm chữ).");
    check("en-sDOB", validDob, "Ngày sinh chưa hợp lệ (từ 3 tuổi trở lên).");
    check("en-height", (v) => !v || (Number(v) >= 60 && Number(v) <= 220), "Chiều cao tính bằng cm, VD: 125.");
    check("en-pName", (v) => NAME_RE.test(v), "Nhập họ tên phụ huynh.");
    check("en-phone", (v) => PHONE_RE.test(normalizePhone(v)), "SĐT chưa đúng (VD: 0912345678).");
    check("en-email", (v) => !v || EMAIL_RE.test(v), "Email chưa đúng định dạng.");
  }
  if (step === 3) {
    const c = f("en-consent");
    setError(c, c.checked ? "" : "Vui lòng đồng ý để gửi đăng ký.");
    if (!c.checked && ok) {
      ok = false;
      c.focus();
    }
  }
  return ok;
}

function showStep(step) {
  S.step = step;
  $$(".en-step").forEach((p) => (p.hidden = p.dataset.step !== String(step)));
  $$(".en-dot").forEach((d, i) => {
    d.classList.toggle("active", i + 1 === step);
    d.classList.toggle("done", i + 1 < step);
  });
  f("en-progress").style.setProperty("--pn", String((step - 1) / 2));
  f("en-step-label").textContent = `Bước ${step}/3 · ${STEP_LABEL[step]}`;
  if (step === 3) renderSummary();
  f("enroll").scrollIntoView({ behavior: "smooth", block: "start" });
}

export function goStep(step) {
  step = Math.max(1, Math.min(3, step));
  if (step > S.step) for (let s = S.step; s < step; s++) if (!validate(s)) return;
  showStep(step);
}

/* ------------------------------ Bước 3 ------------------------------ */
function suggestSize(club) {
  const h = Number(val("en-height"));
  const sizes = (club.sizes || []).map((s) => str(s)).filter(Boolean);
  if (!h || !sizes.length) return "";
  const g = CONFIG.SIZE_GUIDE.find((x) => h >= x.min && h < x.max);
  if (g && sizes.includes(g.size)) return g.size;
  return "";
}

function totals() {
  const club = S.clubs[S.club];
  if (!club || S.type === "trial") return { fee: 0, size: 0, total: 0 };
  const fee = toNumber(club.fee);
  const size = val("en-size") ? toNumber(club.sizePrice) : 0;
  return { fee, size, total: fee + size };
}

function renderSummary() {
  const club = S.clubs[S.club];
  if (!club) return;
  const trial = S.type === "trial";
  f("en-official").hidden = trial;
  const sizeSel = f("en-size");
  const keep = sizeSel.value;
  const sizes = (club.sizes || []).map((s) => str(s)).filter(Boolean);
  const sp = toNumber(club.sizePrice);
  sizeSel.innerHTML =
    `<option value="">Không mua / để HLV tư vấn</option>` +
    sizes.map((s) => `<option value="${esc(s)}">Size ${esc(s)}${sp ? ` (+${money(sp)})` : ""}</option>`).join("");
  const suggested = suggestSize(club);
  sizeSel.value = sizes.includes(keep) ? keep : suggested;
  f("en-size-hint").textContent = suggested ? `Gợi ý theo chiều cao ${val("en-height")}cm: size ${suggested}` : sizes.length ? "Nhập chiều cao ở bước 2 để được gợi ý size." : "";
  f("en-size-field").hidden = !sizes.length;
  updateSummary();
}

function updateSummary() {
  const club = S.clubs[S.club];
  if (!club) return;
  const t = totals();
  const trial = S.type === "trial";
  f("en-summary").innerHTML = `
    <div class="sum-row"><span>Hình thức</span><strong>${trial ? "Học thử miễn phí" : "Đăng ký chính thức"}</strong></div>
    <div class="sum-row"><span>Cơ sở</span><strong>${esc(club.name)}</strong></div>
    <div class="sum-row"><span>Võ sinh</span><strong>${esc(val("en-sName"))}</strong></div>
    ${
      trial
        ? ""
        : `<div class="sum-sep"></div>
           <div class="sum-row"><span>Học phí</span><span>${money(t.fee)}</span></div>
           ${t.size ? `<div class="sum-row"><span>Võ phục size ${esc(val("en-size"))}</span><span>${money(t.size)}</span></div>` : ""}
           <div class="sum-row sum-total"><span>Tổng cộng</span><strong>${money(t.total)}</strong></div>`
    }`;
  f("en-submit").textContent = trial ? "Gửi đăng ký học thử" : "Xác nhận đăng ký";
}

/* ------------------------------ Gửi đơn ------------------------------ */
async function submit(e) {
  e.preventDefault();
  if (S.submitting) return;
  for (const s of [1, 2, 3]) {
    if (!validate(s)) {
      if (s !== S.step) {
        showStep(s);
        validate(s);
      }
      return;
    }
  }
  const club = S.clubs[S.club];
  const phone = normalizePhone(val("en-phone"));
  const studentName = val("en-sName");
  const alertBox = f("en-alert");
  alertBox.hidden = true;

  if (val("en-website")) return showSuccess({ orderId: "—", total: 0, type: S.type }, club); // bot

  const fp = norm(studentName) + "_" + phone + "_" + S.type;
  const last = store.get(LAST_KEY);
  if (last && last.fp === fp && Date.now() - last.t < CONFIG.DUPLICATE_WINDOW) {
    alertBox.textContent = `Võ sinh này vừa được đăng ký thành công (mã ${last.orderId}). Bạn không cần gửi lại.`;
    alertBox.hidden = false;
    return;
  }

  const btn = f("en-submit");
  S.submitting = true;
  btn.disabled = true;
  btn.classList.add("loading");
  f("en-sending").hidden = false;
  const t = totals();
  try {
    const res = await post({
      action: "enroll",
      submissionId: S.submissionId || (S.submissionId = uid()),
      type: S.type,
      clubName: club.name,
      studentName,
      studentDOB: val("en-sDOB"),
      height: val("en-height"),
      parentName: val("en-pName"),
      parentPhone: phone,
      parentEmail: val("en-email"),
      sizeDo: S.type === "trial" ? "" : val("en-size"),
      payMethod: f("en-pay-cash").checked ? "cash" : "transfer",
      totalMoney: String(t.total), // chỉ để tham khảo – máy chủ tự tính lại
      website: "",
    });
    if (res.status !== "success") throw new Error(res.message || "Máy chủ chưa xác nhận đơn.");
    store.set(LAST_KEY, { fp, t: Date.now(), orderId: res.orderId });
    store.del(DRAFT_KEY);
    S.submissionId = null;
    showSuccess(res, club);
  } catch (err) {
    alertBox.textContent =
      (err.name === "AbortError" ? "Mạng chậm, quá thời gian chờ." : err.message || "Lỗi kết nối.") +
      " Vui lòng thử lại – đơn sẽ không bị trùng.";
    alertBox.hidden = false;
  } finally {
    S.submitting = false;
    btn.disabled = false;
    btn.classList.remove("loading");
    f("en-sending").hidden = true;
  }
}

function bankCode(club) {
  if (str(club.bankCode)) return str(club.bankCode).toLowerCase();
  const n = norm(club.bank);
  const key = Object.keys(CONFIG.BANK_CODES)
    .sort((a, b) => b.length - a.length)
    .find((k) => n.includes(k));
  return key ? CONFIG.BANK_CODES[key] : "";
}

function vietQr(club, amount, note) {
  const code = bankCode(club);
  const stk = str(club.stk).replace(/\s/g, "");
  if (code && /^\d{4,20}$/.test(stk)) {
    const p = new URLSearchParams({ amount: String(amount), addInfo: note });
    if (str(club.accountName)) p.set("accountName", str(club.accountName));
    return `https://img.vietqr.io/image/${encodeURIComponent(code)}-${stk}-compact2.png?${p}`;
  }
  return img(club.qr, 600); // ảnh QR tĩnh cũ
}

function showSuccess(res, club) {
  S.result = res;
  f("en-form").hidden = true;
  f("en-head").hidden = true;
  const box = f("en-success");
  box.hidden = false;
  const trial = res.type === "trial";
  const transfer = !trial && res.payMethod !== "cash" && res.total > 0;
  const note = res.orderId;
  const qr = transfer ? vietQr(club, res.total, note) : "";

  box.innerHTML = `
    <div class="ok-badge" aria-hidden="true">✓</div>
    <h3>${trial ? "Đã nhận đăng ký học thử!" : "Đăng ký thành công!"}</h3>
    <p class="muted">Võ sinh <strong>${esc(val("en-sName"))}</strong> · ${esc(club.name)}</p>
    <button type="button" class="order-id" data-action="copy" data-copy="${esc(res.orderId)}" data-label="mã đơn">
      <small>Mã đơn</small><strong>${esc(res.orderId)}</strong><span aria-hidden="true">⧉</span>
    </button>
    ${
      transfer
        ? `<div class="pay-card">
            <p class="pay-title">Quét mã để chuyển khoản</p>
            ${qr ? `<img class="pay-qr" src="${esc(qr)}" alt="Mã QR chuyển khoản ${esc(money(res.total))}" width="260" height="260">` : ""}
            <dl class="kv kv-compact">
              ${str(club.bank) ? `<div><dt>Ngân hàng</dt><dd>${esc(club.bank)}</dd></div>` : ""}
              ${str(club.stk) ? `<div><dt>Số tài khoản</dt><dd><button type="button" class="link-copy" data-action="copy" data-copy="${esc(str(club.stk))}" data-label="số tài khoản">${esc(club.stk)} ⧉</button></dd></div>` : ""}
              ${str(club.accountName) ? `<div><dt>Chủ tài khoản</dt><dd>${esc(club.accountName)}</dd></div>` : ""}
              <div><dt>Số tiền</dt><dd><strong class="text-red">${money(res.total)}</strong></dd></div>
              <div><dt>Nội dung</dt><dd><button type="button" class="link-copy" data-action="copy" data-copy="${esc(note)}" data-label="nội dung">${esc(note)} ⧉</button></dd></div>
            </dl>
            <p class="small muted">Mã QR đã điền sẵn số tiền và nội dung. Sau khi chuyển, bạn có thể gửi ảnh bill (không bắt buộc).</p>
            <label class="btn btn-outline btn-block file-btn">
              <input type="file" id="en-bill" accept="image/*" hidden>
              📤 Gửi ảnh bill chuyển khoản
            </label>
            <p id="en-bill-status" class="small" aria-live="polite"></p>
          </div>`
        : `<p class="note-box">${
            trial
              ? "HLV phụ trách sẽ gọi điện để hẹn buổi học thử phù hợp. Buổi học thử hoàn toàn miễn phí."
              : `Vui lòng đóng học phí <strong>${money(res.total)}</strong> khi đến lớp và báo mã đơn cho HLV.`
          }</p>`
    }
    <p class="small muted">${val("en-email") ? "Email xác nhận đã được gửi tới " + esc(val("en-email")) + ". " : ""}HLV sẽ liên hệ qua số ${esc(normalizePhone(val("en-phone")))}.</p>
    <div class="btn-row">
      <button type="button" class="btn btn-primary" data-action="enroll-again">+ Đăng ký thêm con</button>
      <a class="btn btn-ghost" href="#/">Về trang chủ</a>
    </div>`;
  f("en-bill")?.addEventListener("change", (e) => uploadBill(e.target));
  f("enroll").scrollIntoView({ behavior: "smooth", block: "start" });
}

function compress(file, maxSide = 1600, q = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, maxSide / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", q).split(",")[1]);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh. Hãy chụp màn hình bill rồi gửi lại."));
    };
    im.src = url;
  });
}

async function uploadBill(input) {
  const file = input.files[0];
  const st = f("en-bill-status");
  if (!file) return;
  if (!file.type.startsWith("image/")) return (st.textContent = "❌ Vui lòng chọn file ảnh.");
  if (file.size > CONFIG.BILL_MAX_MB * 1048576) return (st.textContent = `❌ Ảnh quá lớn (tối đa ${CONFIG.BILL_MAX_MB}MB).`);
  st.textContent = "⏳ Đang gửi ảnh bill…";
  input.disabled = true;
  try {
    const billData = await compress(file);
    const res = await post({ action: "bill", orderId: S.result.orderId, parentPhone: normalizePhone(val("en-phone")), billData });
    if (res.status !== "success") throw new Error(res.message);
    st.textContent = "✅ Đã gửi bill. Cảm ơn phụ huynh!";
    input.closest("label").hidden = true;
  } catch (err) {
    st.textContent = "❌ " + (err.message || "Gửi chưa được, vui lòng thử lại.");
    input.disabled = false;
    input.value = "";
  }
}

export function enrollAgain() {
  // giữ thông tin phụ huynh + cơ sở, xoá thông tin võ sinh
  ["en-sName", "en-sDOB", "en-height"].forEach((id) => (f(id).value = ""));
  f("en-consent").checked = false;
  S.result = null;
  f("en-success").hidden = true;
  f("en-form").hidden = false;
  f("en-head").hidden = false;
  showStep(2);
  f("en-sName").focus();
}

/* ------------------------------ Lưu nháp ------------------------------ */
const DRAFT_FIELDS = ["en-sName", "en-sDOB", "en-height", "en-pName", "en-phone", "en-email"];
function saveDraft() {
  const d = { type: S.type, club: S.clubs[S.club]?.name || "" };
  DRAFT_FIELDS.forEach((id) => (d[id] = f(id).value));
  store.set(DRAFT_KEY, d);
}
function restoreDraft() {
  const d = store.get(DRAFT_KEY);
  if (!d) return;
  DRAFT_FIELDS.forEach((id) => {
    if (d[id]) f(id).value = d[id];
  });
  if (d.type === "trial") setType("trial");
  if (d.club) S.draftClub = d.club;
  if (d["en-email"]) f("en-email-wrap").hidden = false;
}

function setType(type) {
  S.type = type;
  $$("[data-action='en-type']").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === type)));
  f("en-type-note").textContent =
    type === "trial" ? "Buổi học thử miễn phí – HLV sẽ gọi hẹn lịch. Không cần thanh toán." : "Đăng ký nhập học, đóng học phí bằng chuyển khoản hoặc tại lớp.";
}

/* ------------------------------ Khởi tạo ------------------------------ */
export function initEnroll() {
  const now = new Date();
  f("en-sDOB").max = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  f("en-sDOB").min = `${now.getFullYear() - 80}-01-01`;

  restoreDraft();
  renderClubs();

  f("en-form").addEventListener("submit", submit);
  f("en-clubs").addEventListener("change", (e) => {
    if (e.target.name === "en-club") {
      S.club = Number(e.target.value);
      f("en-club-error").textContent = "";
      saveDraft();
    }
  });
  f("en-form").addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") setError(e.target, "");
    if (DRAFT_FIELDS.includes(e.target.id)) saveDraft();
  });
  f("en-size").addEventListener("change", updateSummary);
  f("en-phone").addEventListener("blur", (e) => {
    const p = normalizePhone(e.target.value);
    if (PHONE_RE.test(p)) e.target.value = p;
  });
  setType(S.type);
}

export function handleEnrollAction(action, el) {
  if (action === "en-type") {
    setType(el.dataset.type);
    saveDraft();
    if (S.step === 3) renderSummary();
  }
  if (action === "en-step") goStep(Number(el.dataset.step));
  if (action === "en-email-toggle") {
    f("en-email-wrap").hidden = false;
    el.hidden = true;
    f("en-email").focus();
  }
  if (action === "enroll-again") enrollAgain();
  if (action === "size-guide") {
    const range = (g) => (!g.min ? `dưới ${g.max} cm` : g.max >= 999 ? `từ ${g.min} cm` : `${g.min} – ${g.max} cm`);
    const rows = CONFIG.SIZE_GUIDE.map((g) => `<tr><td>${esc(g.size)}</td><td>${range(g)}</td></tr>`).join("");
    import("./ui.js").then(({ openSheet }) =>
      openSheet("Bảng size võ phục", `<table class="size-table"><thead><tr><th>Size</th><th>Chiều cao</th></tr></thead><tbody>${rows}</tbody></table><p class="small muted">Chưa chắc chắn? Chọn "để HLV tư vấn", HLV sẽ đo size trực tiếp.</p>`),
    );
  }
}

/** Khi dữ liệu CLB về: khôi phục CLB trong bản nháp */
export function applyDraftClub() {
  if (S.draftClub && S.club < 0) {
    const i = S.clubs.findIndex((c) => c.name === S.draftClub);
    if (i >= 0) {
      S.club = i;
      renderClubs();
    }
  }
}
