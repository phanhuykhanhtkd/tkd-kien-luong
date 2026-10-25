/* =====================================================================
   CẤU HÌNH CHUNG – chỉ cần sửa file này khi đổi thông số
   ===================================================================== */

// ▼▼▼ URL Apps Script của Sheet THẬT (giữ nguyên) ▼▼▼
const URL_THAT =
  "https://script.google.com/macros/s/AKfycbwQym74KwYsmt9uZBrByJ0WChGKkCHgiHV4mqwpa9TdZPK2WCuS9aF6Pp1Nvrsk3b0H/exec";

// ▼▼▼ URL Apps Script của Sheet BẢN SAO (thử nghiệm) – DÁN URL CỦA BẠN VÀO GIỮA HAI DẤU NGOẶC KÉP ▼▼▼
const URL_THU = "DAN_URL_THU_VAO_DAY";

// Web thật (taekwondokienluong.info) tự dùng URL_THAT; mọi nơi khác (máy tính, link .netlify.app) dùng URL_THU
const LA_WEB_THAT = /(^|\.)taekwondokienluong\.info$/.test(location.hostname);

export const CONFIG = {
  API_URL: LA_WEB_THAT ? URL_THAT : URL_THU,
  MOI_TRUONG: LA_WEB_THAT ? "that" : "thu",
  CHUA_DAN_URL_THU: !LA_WEB_THAT && !URL_THU.startsWith("https://"),

  REQUEST_TIMEOUT: 25000, // Apps Script "ngủ" lâu có thể mất 5–8 giây để thức dậy
  SUBMIT_TIMEOUT: 45000,

  NEWS_PREVIEW: 2,
  VIDEO_PREVIEW: 2,
  ALBUM_PREVIEW: 4,
  LOOKUP_MIN_CHARS: 3,

  BILL_MAX_MB: 10,
  DUPLICATE_WINDOW: 10 * 60 * 1000,

  // Bảng gợi ý size võ phục theo chiều cao (cm). Sửa cho khớp size thực tế của CLB.
  SIZE_GUIDE: [
    { size: "S", min: 0, max: 120 },
    { size: "M", min: 120, max: 130 },
    { size: "L", min: 130, max: 140 },
    { size: "XL", min: 140, max: 150 },
    { size: "XXL", min: 150, max: 999 },
  ],

  // Mã ngân hàng VietQR đoán từ tên ngân hàng (khi tab CauHinhCLB chưa có cột "Mã NH VietQR")
  BANK_CODES: {
    vietcombank: "vcb", vcb: "vcb", vietinbank: "icb", bidv: "bidv", agribank: "vba",
    mbbank: "mb", mb: "mb", quandoi: "mb", techcombank: "tcb", tcb: "tcb", acb: "acb",
    vpbank: "vpb", tpbank: "tpb", sacombank: "stb", vib: "vib", shb: "shb", hdbank: "hdb",
    ocb: "ocb", msb: "msb", seabank: "seab", eximbank: "eib", lpbank: "lpb", lienviet: "lpb",
    kienlong: "klb", kienlongbank: "klb", namabank: "nab", baovietbank: "bvb", abbank: "abb",
    pvcombank: "pvcb", scb: "scb", vietabank: "vab", ncb: "ncb", bacabank: "bab",
  },

  CONTACT_PHONE: "", // SĐT hotline chung (tuỳ chọn), VD: "0912345678"
};
