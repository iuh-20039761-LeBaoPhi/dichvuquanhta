/**
 * dat-lich/core.js
 * State và helper nền của form đặt lịch.
 * - Quản lý state form, item list, config, format, DOM helper
 * - Cung cấp helper KRUD cho tạo đơn và đồng bộ mã đơn hệ thống
 * - Giữ draft tạm trong sessionStorage để resume sau đăng nhập
 *
 * Liên quan trực tiếp:
 * - dat-lich.js: bootstrap, nạp file này đầu tiên
 * - dat-lich/map-reorder.js: dùng state và helper prefill / reorder
 * - dat-lich/pricing.js: đọc orderItems, khoang_cach_km, selectedService
 * - dat-lich/flow-submit.js: build payload và submit đơn qua KRUD / Google Sheet
 */

// ========== STATE ==========
let map, markerPickup, markerDelivery;
let khoang_cach_km = 0;
let selectedService = null;
let deliveryMode = "scheduled";
let reorderContext = null;
let weatherQuoteState = null;
let reviewUploadObjectUrls = [];
let isResolvingPickupLocation = false;
let recalculateDistanceRequestToken = 0;
const BOOKING_DRAFT_STORAGE_KEY = "ghn_booking_login_resume_v1";
const BOOKING_DRAFT_TTL_MS = 6 * 60 * 60 * 1000;
let orderItems = [
  {
    loai_hang: "",
    ten_hang: "",
    so_luong: 1,
    gia_tri_khai_bao: 0,
    can_nang: 1.0,
    chieu_dai: 15,
    chieu_rong: 10,
    chieu_cao: 10,
  },
];

function resolveOrderFormConfigUrl() {
  if (typeof window === "undefined") return "public/data/form-dat-hang.json";
  if (window.GiaoHangNhanhCore?.publicBasePath) {
    return `${window.GiaoHangNhanhCore.publicBasePath}data/form-dat-hang.json`;
  }

  const path = String(window.location.pathname || "").replace(/\\/g, "/");
  const marker = "/giao-hang-nhanh/";
  const markerIndex = path.toLowerCase().lastIndexOf(marker);
  const projectBasePath =
    markerIndex !== -1 ? path.slice(0, markerIndex + marker.length) : "/";
  return `${projectBasePath}public/data/form-dat-hang.json`;
}

function getProjectBasePath() {
  if (typeof window === "undefined") return "/";
  const currentPath = String(window.location.pathname || "").replace(
    /\\/g,
    "/",
  );
  const marker = "/giao-hang-nhanh/";
  const markerIndex = currentPath.toLowerCase().lastIndexOf(marker);
  return markerIndex !== -1
    ? currentPath.slice(0, markerIndex + marker.length)
    : "/";
}

function resolveProjectHtmlUrl(path) {
  if (typeof window === "undefined") return String(path || "");
  const normalized = String(path || "").replace(/^\.?\//, "");
  return new URL(
    normalized,
    `${window.location.origin}${getProjectBasePath()}`,
  ).toString();
}

function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Không đọc được dữ liệu local:", error);
    return fallback;
  }
}

function writeLocalJson(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Không lưu được dữ liệu local:", error);
    return false;
  }
}

function getLocalSession() {
  if (window.GiaoHangNhanhLocalAuth?.getSession) {
    return window.GiaoHangNhanhLocalAuth.getSession();
  }
  return readLocalJson("ghn-auth-session", null);
}

function syncBookingLoginState() {
  const session = getLocalSession();
  if (typeof window !== "undefined") {
    window.isLoggedIn = !!session;
  }
  return session;
}

function buildPaymentMethodLabel(value) {
  return String(value || "").toLowerCase() === "chuyen_khoan"
    ? "Chuyển khoản"
    : "Tiền mặt";
}

function buildFeePayerLabel(value) {
  return String(value || "").toLowerCase() === "nhan"
    ? "Người nhận"
    : "Người gửi";
}

function formatOrderDateCode(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatOrderDateCode(new Date());
  }
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function isSystemOrderCode(value) {
  return /^GHN-\d{8}-\d{7}$/i.test(String(value || "").trim());
}

function formatSystemOrderCode(orderId, createdAt = new Date()) {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) return "";
  return `GHN-${formatOrderDateCode(createdAt)}-${String(Math.trunc(Math.abs(numericId))).padStart(7, "0")}`;
}

function getBookingCrudInsertFn() {
  if (typeof window.crud === "function") {
    return (tableName, data) => window.crud("insert", tableName, data);
  }

  if (typeof window.krud === "function") {
    return (tableName, data) => window.krud("insert", tableName, data);
  }

  return null;
}

function getBookingCrudUpdateFn() {
  if (typeof window.crud === "function") {
    return (tableName, data, id) => window.crud("update", tableName, data, id);
  }

  if (typeof window.krud === "function") {
    return (tableName, data, id) => window.krud("update", tableName, data, id);
  }

  return null;
}

function getBookingCrudListFn() {
  if (typeof window.krudList === "function") {
    return (payload) => window.krudList(payload);
  }

  if (typeof window.crud === "function") {
    return (payload) => {
      const options = {
        ...payload,
        p: payload.page || payload.p || 1,
        limit: payload.limit || 100,
      };
      delete options.table;
      delete options.page;
      return window.crud("list", payload.table, options);
    };
  }

  if (typeof window.krud === "function") {
    return (payload) => {
      const options = {
        ...payload,
        p: payload.page || payload.p || 1,
        limit: payload.limit || 100,
      };
      delete options.table;
      delete options.page;
      return window.krud("list", payload.table, options);
    };
  }

  return null;
}

function extractCrudRows(payload, depth = 0) {
  if (depth > 4 || payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
  for (const key of candidateKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    const nested = extractCrudRows(value, depth + 1);
    if (nested.length) return nested;
  }

  return [];
}

function parseCrudJsonSafe(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getReorderIdentifierCandidates(row) {
  return [
    row?.ma_don_hang_noi_bo,
    row?.ma_don_hang,
    row?.order_code,
    row?.id,
    formatSystemOrderCode(
      row?.id,
      row?.created_at || row?.created_date || new Date(),
    ),
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);
}

function mapKrudRowToReorderData(row) {
  if (!row || typeof row !== "object") return null;
  const parsedItems = parseCrudJsonSafe(
    row.mat_hang_json || row.items_json,
    [],
  );
  const fallbackOrderCode =
    String(
      row.ma_don_hang_noi_bo || row.ma_don_hang || row.order_code || "",
    ).trim() ||
    formatSystemOrderCode(
      row.id,
      row.created_at || row.created_date || new Date(),
    ) ||
    String(row.id || "").trim();

  return {
    source_order_id: row.id || null,
    source_order_code: fallbackOrderCode,
    nguoi_gui_ho_ten: row.ho_ten_nguoi_gui || "",
    nguoi_gui_so_dien_thoai: row.so_dien_thoai_nguoi_gui || "",
    nguoi_nhan_ho_ten: row.ho_ten_nguoi_nhan || "",
    nguoi_nhan_so_dien_thoai: row.so_dien_thoai_nguoi_nhan || "",
    dia_chi_lay_hang: row.dia_chi_lay_hang || "",
    dia_chi_giao_hang: row.dia_chi_giao_hang || "",
    ghi_chu_tai_xe: row.ghi_chu || "",
    gia_tri_thu_ho_cod: Number(row.gia_tri_thu_ho_cod || 0),
    phuong_thuc_thanh_toan: row.phuong_thuc_thanh_toan || "tien_mat",
    nguoi_tra_cuoc: row.nguoi_tra_cuoc || "gui",
    dich_vu: row.dich_vu || row.loai_dich_vu || "",
    service_type: row.loai_dich_vu || row.dich_vu || "",
    ten_dich_vu: row.ten_dich_vu || "",
    phuong_tien: row.phuong_tien || "",
    ten_phuong_tien: row.ten_phuong_tien || "",
    ngay_lay_hang: row.ngay_lay_hang || "",
    khung_gio_lay_hang: row.khung_gio_lay_hang || "",
    ten_khung_gio_lay_hang: row.ten_khung_gio_lay_hang || "",
    du_kien_giao_hang: row.du_kien_giao_hang || "",
    khoang_cach_km: Number(row.khoang_cach_km || 0),
    mat_hang: Array.isArray(parsedItems) ? parsedItems : [],
    items: Array.isArray(parsedItems) ? parsedItems : [],
  };
}

async function fetchReorderDataFromCrud(identifier) {
  const listFn = getBookingCrudListFn();
  const normalizedIdentifier = String(identifier || "")
    .trim()
    .toUpperCase();
  if (!listFn || !normalizedIdentifier) return null;

  const exactFilters = [
    { field: "ma_don_hang_noi_bo", operator: "=", value: normalizedIdentifier },
    { field: "ma_don_hang", operator: "=", value: normalizedIdentifier },
    { field: "order_code", operator: "=", value: normalizedIdentifier },
  ];
  if (/^\d+$/.test(normalizedIdentifier)) {
    exactFilters.unshift({
      field: "id",
      operator: "=",
      value: Number(normalizedIdentifier),
    });
  }

  for (const where of exactFilters) {
    try {
      const response = await listFn({
        table: "giaohangnhanh_dat_lich",
        where: [where],
        page: 1,
        limit: 20,
      });
      const matchedRow = extractCrudRows(response).find((row) =>
        getReorderIdentifierCandidates(row).includes(normalizedIdentifier),
      );
      if (matchedRow) {
        return mapKrudRowToReorderData(matchedRow);
      }
    } catch (error) {
      // Fallback to paginated scan below when where is unsupported.
    }
  }

  const pageSize = 500;
  for (let page = 1; page <= 5; page += 1) {
    const response = await listFn({
      table: "giaohangnhanh_dat_lich",
      sort: { id: "desc" },
      page,
      limit: pageSize,
    });
    const rows = extractCrudRows(response);
    const matchedRow = rows.find((row) =>
      getReorderIdentifierCandidates(row).includes(normalizedIdentifier),
    );
    if (matchedRow) {
      return mapKrudRowToReorderData(matchedRow);
    }
    if (rows.length < pageSize) break;
  }

  return null;
}

function tinh_tong_so_kien_hang(items) {
  if (!Array.isArray(items) || !items.length) return 0;

  return items.reduce((tong, item) => {
    const soLuong = Math.max(1, parseInt(item?.so_luong, 10) || 1);
    return tong + soLuong;
  }, 0);
}

function tinh_tong_can_nang_hang(items) {
  if (!Array.isArray(items) || !items.length) return 0;

  const tong = items.reduce((giaTri, item) => {
    const soLuong = Math.max(1, parseInt(item?.so_luong, 10) || 1);
    const canNang = Math.max(0, parseFloat(item?.can_nang) || 0);
    return giaTri + canNang * soLuong;
  }, 0);

  return Number(tong.toFixed(2));
}

function tao_tom_tat_mat_hang(items) {
  if (!Array.isArray(items) || !items.length) return "";

  const nhanHang = [];
  items.forEach((item) => {
    const tenHang = String(item?.ten_hang || "").trim();
    const loaiHang = String(item?.loai_hang || "").trim();
    const tenHienThi = tenHang || loaiHang;
    if (tenHienThi && !nhanHang.includes(tenHienThi)) {
      nhanHang.push(tenHienThi);
    }
  });

  if (!nhanHang.length) {
    return `Tổng ${tinh_tong_so_kien_hang(items)} kiện hàng`;
  }

  const danhSachRutGon = nhanHang.slice(0, 3).join(", ");
  if (nhanHang.length <= 3) {
    return danhSachRutGon;
  }

  return `${danhSachRutGon} và ${nhanHang.length - 3} loại khác`;
}

function buildCrudBookingInsertPayload(payload) {
  const session = getLocalSession();
  const createdAt = new Date().toISOString();
  const serviceType = getInternalServiceType(payload.dich_vu);
  const chiTietGiaCuoc =
    payload.chi_tiet_gia_cuoc && typeof payload.chi_tiet_gia_cuoc === "object"
      ? payload.chi_tiet_gia_cuoc
      : {};
  const tongGiaVanChuyen = Number(chiTietGiaCuoc.tong_gia_van_chuyen || 0);
  const phuPhiLoaiHang = Number(chiTietGiaCuoc.phu_phi_loai_hang || 0);
  const phuPhiKhungGio = Number(chiTietGiaCuoc.phu_phi_khung_gio || 0);
  const phuPhiThoiTiet = Number(chiTietGiaCuoc.phu_phi_thoi_tiet || 0);
  const dieuChinhTheoXe = Number(chiTietGiaCuoc.dieu_chinh_theo_xe || 0);
  const phiCod = Number(chiTietGiaCuoc.phi_cod || 0);
  const phiBaoHiem = Number(chiTietGiaCuoc.phi_bao_hiem || 0);
  const danhSachMatHang = Array.isArray(payload.mat_hang)
    ? payload.mat_hang
    : [];
  const tongSoKienHang = tinh_tong_so_kien_hang(danhSachMatHang);
  const tongCanNangKg = tinh_tong_can_nang_hang(danhSachMatHang);
  const tomTatMatHang = tao_tom_tat_mat_hang(danhSachMatHang);
  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments
    : [];

  return {
    ma_don_hang_noi_bo: "",
    ma_don_hang: "",
    order_code: "",
    ho_ten_nguoi_gui: payload.nguoi_gui_ho_ten || "",
    so_dien_thoai_nguoi_gui: payload.nguoi_gui_so_dien_thoai || "",
    ho_ten_nguoi_nhan: payload.nguoi_nhan_ho_ten || "",
    so_dien_thoai_nguoi_nhan: payload.nguoi_nhan_so_dien_thoai || "",
    dia_chi_lay_hang: payload.dia_chi_lay_hang || "",
    dia_chi_giao_hang: payload.dia_chi_giao_hang || "",
    ngay_lay_hang: payload.ngay_lay_hang || "",
    khung_gio_lay_hang: payload.khung_gio_lay_hang || "",
    ten_khung_gio_lay_hang: payload.ten_khung_gio_lay_hang || "",
    du_kien_giao_hang: payload.du_kien_giao_hang || "",
    vi_do_lay_hang: Number(payload.vi_do_lay_hang || 0),
    kinh_do_lay_hang: Number(payload.kinh_do_lay_hang || 0),
    vi_do_giao_hang: Number(payload.vi_do_giao_hang || 0),
    kinh_do_giao_hang: Number(payload.kinh_do_giao_hang || 0),
    dich_vu: payload.dich_vu || "",
    ten_dich_vu: payload.ten_dich_vu || "",
    loai_dich_vu: serviceType || "",
    phuong_tien: payload.phuong_tien || "",
    ten_phuong_tien: payload.ten_phuong_tien || "",
    tong_cuoc: Number(payload.tong_cuoc || 0),
    tong_gia_van_chuyen: tongGiaVanChuyen,
    phu_phi_loai_hang: phuPhiLoaiHang,
    phu_phi_khung_gio: phuPhiKhungGio,
    phu_phi_thoi_tiet: phuPhiThoiTiet,
    dieu_chinh_theo_xe: dieuChinhTheoXe,
    phi_cod: phiCod,
    phi_bao_hiem: phiBaoHiem,
    tong_phu_phi:
      phuPhiLoaiHang +
      phuPhiKhungGio +
      phuPhiThoiTiet +
      dieuChinhTheoXe +
      phiCod +
      phiBaoHiem,
    tong_so_kien_hang: tongSoKienHang,
    tong_can_nang_kg: tongCanNangKg,
    tom_tat_mat_hang: tomTatMatHang,
    gia_tri_thu_ho_cod: Number(payload.gia_tri_thu_ho_cod || 0),
    phuong_thuc_thanh_toan: payload.phuong_thuc_thanh_toan || "",
    nguoi_tra_cuoc: payload.nguoi_tra_cuoc || "",
    ghi_chu: payload.ghi_chu_tai_xe || "",
    khoang_cach_km: Number(payload.khoang_cach_km || 0),
    trang_thai: "moi_tao",
    created_at: createdAt,
    updated_at: createdAt,
    customer_id: session?.id || "",
    customer_username: session?.username || "",
    mat_hang_json: JSON.stringify(danhSachMatHang),
    chi_tiet_gia_cuoc_json: JSON.stringify(payload.chi_tiet_gia_cuoc || {}),
    attachments_json: JSON.stringify(attachments),
    attachments: JSON.stringify(attachments),
  };
}

async function insertBookingWithCrud(payload) {
  const insertFn = getBookingCrudInsertFn();
  if (!insertFn) {
    throw new Error(
      "Không tìm thấy hàm crud/krud trên trang đặt lịch. Kiểm tra lại script krud.js.",
    );
  }

  return insertFn(
    "giaohangnhanh_dat_lich",
    buildCrudBookingInsertPayload(payload),
  );
}

async function syncCrudOrderCode(recordId, orderCode, createdAt = new Date()) {
  const updateFn = getBookingCrudUpdateFn();
  const normalizedId = String(recordId || "").trim();
  const normalizedCode =
    String(orderCode || "").trim() ||
    formatSystemOrderCode(normalizedId, createdAt);

  if (!updateFn || !normalizedId || !normalizedCode) {
    return false;
  }

  try {
    await updateFn(
      "giaohangnhanh_dat_lich",
      {
        id: normalizedId,
        ma_don_hang_noi_bo: normalizedCode,
        ma_don_hang: normalizedCode,
        order_code: normalizedCode,
        updated_at:
          createdAt instanceof Date
            ? createdAt.toISOString()
            : String(createdAt || "").trim(),
      },
      normalizedId,
    );
    return true;
  } catch (error) {
    console.warn("Không thể ghi ngược mã đơn GHN vào bản ghi KRUD:", error);
    return false;
  }
}

async function syncCrudBookingAttachments(
  recordId,
  attachments = [],
  updatedAt = new Date().toISOString(),
) {
  const updateFn = getBookingCrudUpdateFn();
  const normalizedId = String(recordId || "").trim();
  if (!updateFn || !normalizedId) {
    return false;
  }

  const safeAttachments = (Array.isArray(attachments) ? attachments : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || item.fileId || "").trim(),
      name: String(item.name || "Tệp đính kèm").trim(),
      extension: String(item.extension || "").trim(),
      url: String(item.url || item.download_url || item.view_url || "").trim(),
      download_url: String(item.download_url || "").trim(),
      view_url: String(item.view_url || "").trim(),
      thumbnail_url: String(item.thumbnail_url || "").trim(),
      type: String(item.type || "").trim(),
      created_at: String(item.created_at || "").trim(),
    }))
    .filter((item) => item.url);

  try {
    await updateFn(
      "giaohangnhanh_dat_lich",
      {
        id: normalizedId,
        attachments_json: JSON.stringify(safeAttachments),
        attachments: JSON.stringify(safeAttachments),
        updated_at:
          updatedAt instanceof Date
            ? updatedAt.toISOString()
            : String(updatedAt || "").trim() || new Date().toISOString(),
      },
      normalizedId,
    );
    return true;
  } catch (error) {
    console.warn("Không thể ghi media booking vào KRUD:", error);
    return false;
  }
}

function extractCrudInsertOrderIdentifier(result) {
  if (!result || typeof result !== "object") return "";

  return String(
    result.id ||
      result.insertId ||
      result.insert_id ||
      result.record_id ||
      result.data?.id ||
      result.data?.insertId ||
      result.result?.id ||
      result.result?.insertId ||
      result.order_code ||
      result.data?.order_code ||
      result.result?.order_code ||
      "",
  ).trim();
}

function extractCrudInsertOrderMeta(result) {
  if (!result || typeof result !== "object") {
    return { id: "", order_code: "", created_at: "" };
  }

  return {
    id: extractCrudInsertOrderIdentifier(result),
    order_code: String(
      result.order_code ||
        result.ma_don_hang ||
        result.data?.order_code ||
        result.data?.ma_don_hang ||
        result.result?.order_code ||
        result.result?.ma_don_hang ||
        "",
    ).trim(),
    created_at: String(
      result.created_at ||
        result.data?.created_at ||
        result.result?.created_at ||
        "",
    ).trim(),
  };
}

function resolveSystemOrderCodeFromResult(
  result,
  fallbackCreatedAt = new Date(),
) {
  const meta = extractCrudInsertOrderMeta(result);
  if (isSystemOrderCode(meta.order_code)) {
    return meta.order_code.toUpperCase();
  }
  return formatSystemOrderCode(meta.id, meta.created_at || fallbackCreatedAt);
}

function canUseSessionStorage() {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    const probeKey = "__ghn_booking_draft_probe__";
    window.sessionStorage.setItem(probeKey, "1");
    window.sessionStorage.removeItem(probeKey);
    return true;
  } catch (error) {
    return false;
  }
}

function savePendingBookingDraft(payload = tao_du_lieu_gui()) {
  if (!canUseSessionStorage()) return false;
  try {
    const draft = {
      saved_at: Date.now(),
      current_step: lay_buoc_hien_tai(),
      payload,
      had_uploads: getSelectedUploadFiles().length > 0,
    };
    window.sessionStorage.setItem(
      BOOKING_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
    return true;
  } catch (error) {
    console.warn(
      "Không thể lưu nháp đơn hàng để tiếp tục sau đăng nhập:",
      error,
    );
    return false;
  }
}

function loadPendingBookingDraft() {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object" || !draft.payload) {
      window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
      return null;
    }
    const savedAt = Number(draft.saved_at || 0);
    if (!savedAt || Date.now() - savedAt > BOOKING_DRAFT_TTL_MS) {
      window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
      return null;
    }
    return draft;
  } catch (error) {
    console.warn("Không thể đọc nháp đơn hàng đã lưu:", error);
    try {
      window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
    } catch (removeError) {
      console.warn("Không thể xóa nháp đơn hỏng:", removeError);
    }
    return null;
  }
}

function clearPendingBookingDraft() {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn("Không thể xóa nháp đơn hàng:", error);
  }
}

function showBookingStatusNotice(message, tone = "info") {
  const container = document.querySelector(".booking-container");
  if (!container) return;

  const oldNotice = document.getElementById("booking-status-notice");
  if (oldNotice) oldNotice.remove();

  const notice = document.createElement("div");
  notice.id = "booking-status-notice";
  const palette =
    tone === "warn"
      ? {
          background: "#fff7ed",
          border: "#fdba74",
          color: "#9a3412",
        }
      : {
          background: "#eff6ff",
          border: "#bfdbfe",
          color: "#1d4ed8",
        };
  notice.style.cssText = `margin-bottom:18px;padding:14px 16px;border-radius:14px;background:${palette.background};border:1px solid ${palette.border};color:${palette.color};font-weight:700;`;
  notice.innerHTML = `<i class="fas fa-circle-info"></i> ${escapeHtml(message)}`;
  container.insertBefore(notice, container.firstChild);
}

function formatMoneyVnd(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} ₫`;
}

function loadOrderFormConfigSync() {
  const fallback = {
    loaihang: [
      { key: "thuong", label: "Hàng thông thường" },
      { key: "gia-tri-cao", label: "Hàng giá trị cao" },
      { key: "de-vo", label: "Hàng dễ vỡ" },
      { key: "mui-hoi", label: "Hàng có mùi hôi" },
      { key: "chat-long", label: "Hàng chất lỏng" },
      { key: "pin-lithium", label: "Hàng có pin Lithium" },
      { key: "dong-lanh", label: "Hàng đông lạnh" },
      { key: "cong-kenh", label: "Hàng cồng kềnh" },
    ],
    loaixe: [
      { key: "auto", label: "Để hệ thống tự đề xuất" },
      { key: "xe_may", label: "Xe máy trọng lượng ≤ 50kg" },
      { key: "xe_4_banh_nho", label: "Xe 4 bánh nhỏ ≤ 500kg" },
      { key: "xe_4_banh_vua", label: "Xe 4 bánh vừa ≤ 1200kg" },
      { key: "xe_4_banh_lon", label: "Xe tải ≤ 3500kg" },
    ],
    khunggiolayhang: [],
    khunggionhanhang: [],
    huongdankhaibao:
      "Hàng có giá trị khai báo trên 1.000.000đ sẽ tính phí bảo hiểm 0,5%, tối thiểu 5.000đ.",
  };

  if (typeof XMLHttpRequest === "undefined") return fallback;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", resolveOrderFormConfigUrl(), false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      return Object.assign(fallback, JSON.parse(xhr.responseText));
    }
  } catch (error) {
    console.error("Không tải được cấu hình form đặt hàng:", error);
  }
  return fallback;
}

const ORDER_FORM_CONFIG = loadOrderFormConfigSync();
const ACTIVE_PRICING_VERSION_META_KEY = "active_pricing_version_id";
let ITEM_TYPES = [];
let ITEM_TYPE_LABELS = {};
let itemTypesLoadState = "idle";
let itemTypesLoadMessage = "";

function normalizeItemTypeOption(item) {
  if (!item || typeof item !== "object") return null;

  const key = String(
    item.item_type_key || item.key || item.loai_hang || item.type_key || "",
  ).trim();
  if (!key) return null;

  const label = String(
    item.item_type_label ||
      item.label ||
      item.ten_loai_hang ||
      item.name ||
      key,
  ).trim();

  return {
    key,
    label: label || key,
    sort_order: Number(item.sort_order || 0),
  };
}

function normalizeItemTypeOptions(items) {
  const unique = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeItemTypeOption(item);
    if (!normalized || unique.has(normalized.key)) return;
    unique.set(normalized.key, normalized);
  });

  return Array.from(unique.values()).sort((left, right) => {
    const leftOrder = Number(left.sort_order || 0);
    const rightOrder = Number(right.sort_order || 0);
    if (leftOrder || rightOrder) return leftOrder - rightOrder;
    return left.label.localeCompare(right.label, "vi");
  });
}

function buildItemTypeLabels(items) {
  return normalizeItemTypeOptions(items).reduce((acc, item) => {
    acc[item.key] = item.label || item.key;
    return acc;
  }, {});
}

function setItemTypeOptions(items) {
  ITEM_TYPES = normalizeItemTypeOptions(items);
  ITEM_TYPE_LABELS = buildItemTypeLabels(ITEM_TYPES);
}

async function getActivePricingVersionIdFromCrud() {
  const listFn = getBookingCrudListFn();
  if (!listFn) return 0;

  try {
    const metaResponse = await listFn({
      table: "ghn_pricing_meta",
      where: [
        {
          field: "meta_key",
          operator: "=",
          value: ACTIVE_PRICING_VERSION_META_KEY,
        },
      ],
      sort: { id: "desc" },
      page: 1,
      limit: 1,
    });
    const metaRow = extractCrudRows(metaResponse)[0];
    const metaVersionId = Number(metaRow?.meta_value || 0);
    if (metaVersionId > 0) return metaVersionId;
  } catch (error) {
    console.warn("Không đọc được active pricing meta từ KRUD:", error);
  }

  try {
    const versionResponse = await listFn({
      table: "ghn_pricing_versions",
      where: [{ field: "status", operator: "=", value: "active" }],
      sort: { id: "desc" },
      page: 1,
      limit: 1,
    });
    const versionRow = extractCrudRows(versionResponse)[0];
    return Number(versionRow?.id || 0);
  } catch (error) {
    console.warn("Không đọc được active pricing version từ KRUD:", error);
    return 0;
  }
}

async function loadItemTypesFromDatabase() {
  const listFn = getBookingCrudListFn();
  if (!listFn) {
    throw new Error("Không tìm thấy hàm KRUD để tải loại hàng.");
  }

  const activeVersionId = await getActivePricingVersionIdFromCrud();
  if (activeVersionId <= 0) {
    throw new Error("Chưa có active pricing version để tải loại hàng.");
  }

  const response = await listFn({
    table: "ghn_loai_hang",
    where: [
      {
        field: "pricing_version_id",
        operator: "=",
        value: activeVersionId,
      },
    ],
    sort: { sort_order: "asc", id: "asc" },
    page: 1,
    limit: 500,
  });

  return normalizeItemTypeOptions(extractCrudRows(response));
}

async function initItemTypeOptionsFromDatabase() {
  itemTypesLoadState = "loading";
  itemTypesLoadMessage = "Đang tải loại hàng...";
  if (typeof hien_thi_danh_sach_hang_hoa === "function") {
    hien_thi_danh_sach_hang_hoa();
  }

  try {
    const nextTypes = await loadItemTypesFromDatabase();
    if (!nextTypes.length) {
      throw new Error("Bảng ghn_loai_hang chưa có dữ liệu loại hàng.");
    }
    setItemTypeOptions(nextTypes);
    itemTypesLoadState = "ready";
    itemTypesLoadMessage = "";
  } catch (error) {
    itemTypesLoadState = "error";
    itemTypesLoadMessage =
      error?.message || "Không tải được loại hàng từ cơ sở dữ liệu.";
    console.warn("Không tải được loại hàng từ cơ sở dữ liệu:", error);
  }

  if (typeof hien_thi_danh_sach_hang_hoa === "function") {
    hien_thi_danh_sach_hang_hoa();
  }
}

setItemTypeOptions(
  Array.isArray(ORDER_FORM_CONFIG.loaihang) ? ORDER_FORM_CONFIG.loaihang : [],
);
const VEHICLE_OPTIONS = Array.isArray(ORDER_FORM_CONFIG.loaixe)
  ? ORDER_FORM_CONFIG.loaixe
  : [];
const PICKUP_SLOT_OPTIONS = Array.isArray(ORDER_FORM_CONFIG.khunggiolayhang)
  ? ORDER_FORM_CONFIG.khunggiolayhang
  : [];
const DEFAULT_DECLARED_VALUE_HELP =
  "Hàng có giá trị khai báo trên 1.000.000đ sẽ tính phí bảo hiểm 0,5%, tối thiểu 5.000đ.";
const DECLARED_VALUE_HELP_SOURCE = String(
  ORDER_FORM_CONFIG.huongdankhaibao || "",
).trim();
const DECLARED_VALUE_HELP =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    DECLARED_VALUE_HELP_SOURCE,
  )
    ? DECLARED_VALUE_HELP_SOURCE
    : DEFAULT_DECLARED_VALUE_HELP;
const DEFAULT_URGENT_CONDITION = {
  key: "macdinh",
  label: "Bình thường",
};

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  weatherQuoteState = createDefaultWeatherQuoteState();
  initMap();
  initAddressSearch("dia_chi_lay_hang", "goi_y_dia_chi_lay_hang", "pickup");
  initAddressSearch("dia_chi_giao_hang", "goi_y_dia_chi_giao_hang", "delivery");
  initGeolocationButton();
  initPickupSlotOptions();
  initUrgentConditionOptions();
  initVehicleOptions();
  initPackageChoiceControls();
  setDeliveryMode(
    document.getElementById("goi_cuoc")?.value === "instant"
      ? "instant"
      : "scheduled",
    { render: false },
  );

  hien_thi_danh_sach_hang_hoa();
  initItemTypeOptionsFromDatabase();
  bindInfoToggleInteractions();
  document
    .getElementById("btn_them_hang_hoa")
    .addEventListener("click", them_hang_hoa);
  document
    .getElementById("gia_tri_thu_ho_cod")
    .addEventListener("input", () => {
      hien_thi_danh_sach_hang_hoa();
      if (lay_buoc_hien_tai() >= 3) renderServiceCards();
    });

  // Default date = today
  const today = formatDateValue(getCurrentDateTime());
  document.getElementById("ngay_lay_hang").value = today;
  document
    .getElementById("phuong_tien_giao_hang")
    .addEventListener("change", () => {
      if (lay_buoc_hien_tai() >= 3) renderServiceCards();
    });
  document.getElementById("ngay_lay_hang").addEventListener("change", () => {
    if (lay_buoc_hien_tai() >= 3) renderServiceCards();
  });
  document
    .getElementById("khung_gio_lay_hang")
    .addEventListener("input", () => {
      syncUrgentConditionVisibility(
        selectedService && selectedService.serviceType,
      );
      if (lay_buoc_hien_tai() >= 3) renderServiceCards();
    });
  document
    .getElementById("btn_buoc_1_sang_2")
    .addEventListener("click", () => xac_thuc_buoc_1() && chuyen_den_buoc(2));
  document.getElementById("btn_buoc_2_sang_3").addEventListener("click", () => {
    if (xac_thuc_buoc_2()) {
      renderServiceCards();
      chuyen_den_buoc(3);
    }
  });
  document.getElementById("btn_buoc_3_sang_4").addEventListener("click", () => {
    if (xac_thuc_buoc_3()) {
      chuyen_den_buoc(4);
    }
  });
  document.getElementById("btn_buoc_4_sang_5").addEventListener("click", () => {
    if (xac_thuc_buoc_4()) {
      chuan_bi_xac_nhan();
      chuyen_den_buoc(5);
    }
  });

  // Make indicators clickable for already completed steps
  document.querySelectorAll(".step-item").forEach((item, idx) => {
    item.addEventListener("click", () => {
      const step = idx + 1;
      const currentStep = lay_buoc_hien_tai();
      if (step < currentStep) {
        chuyen_den_buoc(step);
      } else if (step > currentStep) {
        // Try to jump forward: must validate all steps in between
        let ok = true;
        for (let s = currentStep; s < step; s++) {
          if (s === 1 && !xac_thuc_buoc_1()) {
            ok = false;
            break;
          }
          if (s === 2 && !xac_thuc_buoc_2()) {
            ok = false;
            break;
          }
          if (s === 3 && !xac_thuc_buoc_3()) {
            ok = false;
            break;
          }
          if (s === 4 && !xac_thuc_buoc_4()) {
            ok = false;
            break;
          }
        }
        if (ok) {
          if (step === 3) renderServiceCards();
          if (step === 5) {
            chuan_bi_xac_nhan();
          }
          chuyen_den_buoc(step);
        }
      }
    });
    item.style.cursor = "pointer";
  });

  (async () => {
    await initCustomerPrefill();
    await initReorderPrefill();
    await restorePendingBookingDraft();
    if (shouldAutoResolvePickupLocation()) {
      requestPickupCurrentLocation({ showError: false, silent: true });
    }
  })();
});

function lay_buoc_hien_tai() {
  for (let i = 1; i <= 5; i++) {
    if (document.getElementById(`buoc_${i}`).classList.contains("active"))
      return i;
  }
  return 1;
}

function createDefaultWeatherQuoteState() {
  return {
    status: "idle",
    requestKey: "",
    isLoading: false,
    conditionKey: "macdinh",
    conditionLabel: "Chưa phát sinh phụ phí thời tiết",
    summary: "Hệ thống đang tạm tính theo thời tiết bình thường",
    note: "Hệ thống sẽ tự kiểm tra thời tiết tại điểm lấy hàng để tính phụ phí nếu có. Nếu chưa lấy được dữ liệu, điều phối sẽ kiểm tra lại trước khi chốt đơn.",
    source: "fallback",
    checkedAt: "",
    effectiveAt: "",
    isFallback: true,
  };
}

function getFriendlyWeatherFallbackNote() {
  return "Hiện chưa lấy được dữ liệu thời tiết tự động. Hệ thống đang tạm tính phụ phí thời tiết theo mức bình thường; điều phối sẽ kiểm tra lại trước khi chốt đơn.";
}

function sanitizeWeatherUserNote(message) {
  const raw = String(message || "").trim();
  if (!raw) return getFriendlyWeatherFallbackNote();

  const normalized = raw.toLowerCase();
  const hasTechnicalDetail =
    normalized.includes("html") ||
    normalized.includes("json") ||
    normalized.includes("endpoint") ||
    normalized.includes("http") ||
    normalized.includes("405") ||
    normalized.includes("phương thức") ||
    normalized.includes("máy chủ");

  return hasTechnicalDetail ? getFriendlyWeatherFallbackNote() : raw;
}

function getDeliveryMode() {
  return deliveryMode || "scheduled";
}

function setPackageChoiceValue(serviceType) {
  const select = document.getElementById("goi_cuoc");
  const normalized = String(serviceType || "")
    .trim()
    .toLowerCase();
  if (!select || !normalized) return false;

  const hasOption = Array.from(select.options).some(
    (option) => option.value === normalized,
  );
  if (!hasOption) return false;

  select.value = normalized;
  return true;
}

function initPackageChoiceControls() {
  const select = document.getElementById("goi_cuoc");
  if (!select) return;
  select.addEventListener("change", () => {
    const val = select.value;
    const mode = val === "instant" ? "instant" : "scheduled";
    setDeliveryMode(mode, { render: false });
    if (lay_buoc_hien_tai() >= 3) renderServiceCards();
  });
}

function setDeliveryMode(mode, options = {}) {
  const nextMode = mode === "instant" ? "instant" : "scheduled";
  const shouldRender = options.render !== false;
  deliveryMode = nextMode;

  if (nextMode === "instant") {
    applyImmediateScheduleDefaults();
  }
  syncScheduleModeUI();

  const currentType = selectedService && selectedService.serviceType;
  if (
    currentType &&
    ((nextMode === "scheduled" && currentType === "instant") ||
      (nextMode === "instant" && currentType !== "instant"))
  ) {
    selectedService = null;
  }

  syncUrgentConditionVisibility(selectedService && selectedService.serviceType);

  if (shouldRender && lay_buoc_hien_tai() >= 3) {
    renderServiceCards();
  }
}

function getPickupSlotOptions() {
  return PICKUP_SLOT_OPTIONS;
}

function timeTextToMinutes(timeText) {
  const [hour, minute] = String(timeText || "")
    .split(":")
    .map((value) => parseInt(value, 10));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
  return hour * 60 + minute;
}

function formatTimeValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function normalizePickupSlotText(value) {
  return String(value || "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPickupSlotInputMask(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (digits.length <= 6) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)} - ${digits.slice(4)}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)} - ${digits.slice(4, 6)}:${digits.slice(6)}`;
}

function applyPickupSlotInputMask(input) {
  if (!input) return;
  const maskedValue = formatPickupSlotInputMask(input.value);
  if (input.value !== maskedValue) {
    input.value = maskedValue;
  }
}

function initPickupSlotInputMask(input) {
  if (!input || input.dataset.maskBound === "true") return;
  input.dataset.maskBound = "true";
  input.maxLength = 13;

  input.addEventListener("beforeinput", (event) => {
    if (
      event.data &&
      !/^\d+$/.test(event.data) &&
      event.inputType !== "insertFromPaste"
    ) {
      event.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    applyPickupSlotInputMask(input);
  });

  input.addEventListener("blur", () => {
    applyPickupSlotInputMask(input);
  });
}

function parsePickupSlotInput(value) {
  const normalized = normalizePickupSlotText(value);
  const match = normalized.match(
    /^([01][0-9]|2[0-3]):([0-5][0-9])\s*-\s*([01][0-9]|2[0-3]):([0-5][0-9])$/,
  );
  if (!match) return null;
  const start = `${match[1]}:${match[2]}`;
  const end = `${match[3]}:${match[4]}`;
  return {
    key: `${start} - ${end}`,
    label: `${start} - ${end}`,
    start,
    end,
  };
}

function getDefaultPickupSlot(date = getCurrentDateTime()) {
  const startAt = new Date(date);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  const start = formatTimeValue(startAt);
  const end = formatTimeValue(endAt);
  return {
    key: `${start} - ${end}`,
    label: `${start} - ${end}`,
    start,
    end,
  };
}

function buildDateAtTime(dateValue, timeText) {
  const minutes = timeTextToMinutes(timeText);
  const parts = String(dateValue || "")
    .split("-")
    .map((value) => parseInt(value, 10));
  if (
    minutes < 0 ||
    parts.length !== 3 ||
    parts.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(
    year,
    month - 1,
    day,
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );
}

function getPickupSlotDateRange(dateValue, pickupSlot) {
  const startAt = buildDateAtTime(dateValue, pickupSlot?.start);
  const endAt = buildDateAtTime(dateValue, pickupSlot?.end);
  if (
    !startAt ||
    !endAt ||
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime())
  ) {
    return null;
  }
  if (endAt <= startAt) {
    endAt.setDate(endAt.getDate() + 1);
  }
  return { startAt, endAt };
}

function formatDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentDateTime() {
  return new Date();
}

function getInstantPricingWindow(date = getCurrentDateTime()) {
  if (typeof window.getDomesticInstantTimeConfig === "function") {
    const rule = window.getDomesticInstantTimeConfig(date);
    if (rule) {
      return {
        key: rule.key,
        label: rule.label,
        start: rule.start || rule.batdau,
        end: rule.end || rule.ketthuc,
        phicodinh: rule.fixedFee || rule.phicodinh || 0,
        heso: rule.multiplier || rule.heso || 1,
      };
    }
  }
  return {
    key: "dem_22_06",
    label: "Đêm khuya 22:00 - 06:00",
    start: "22:00",
    end: "06:00",
    phicodinh: 30000,
    heso: 1.18,
  };
}

function applyImmediateScheduleDefaults() {
  const now = getCurrentDateTime();
  const pickupDateInput = document.getElementById("ngay_lay_hang");
  const pickupSlotInput = document.getElementById("khung_gio_lay_hang");
  const defaultSlot = getDefaultPickupSlot(now);

  if (pickupDateInput) pickupDateInput.value = formatDateValue(now);
  if (pickupSlotInput) pickupSlotInput.value = defaultSlot.label;
}

function syncScheduleModeUI() {
  const isInstantMode = getDeliveryMode() === "instant";
  const packageHint = document.getElementById("goi_y_goi_cuoc");

  if (packageHint) {
    const instantWindow = isInstantMode
      ? getInstantPricingWindow(getCurrentDateTime())
      : null;
    packageHint.textContent = isInstantMode
      ? instantWindow
        ? "Mặc định lấy hàng trong 1 giờ tới. Bạn có thể chỉnh lại nếu cần."
        : "Mặc định lấy hàng trong 1 giờ tới. Bạn có thể chỉnh lại nếu cần."
      : "Thời gian nhận hàng sẽ do hệ thống phân bổ theo lộ trình (khoảng vài ngày).";
  }
}

function initPickupSlotOptions() {
  const input = document.getElementById("khung_gio_lay_hang");
  if (!input) return;
  initPickupSlotInputMask(input);
  if (input.value.trim()) {
    applyPickupSlotInputMask(input);
    return;
  }
  input.value = getDefaultPickupSlot(getCurrentDateTime()).label;
}

function initUrgentConditionOptions() {
  updateWeatherSurchargePanel();
}

function initVehicleOptions() {
  const select = document.getElementById("phuong_tien_giao_hang");
  if (!select || !VEHICLE_OPTIONS.length) return;
  select.innerHTML = VEHICLE_OPTIONS.map((option, index) => {
    const selectedAttr = index === 0 ? " selected" : "";
    return `<option value="${option.key}"${selectedAttr}>${option.label}</option>`;
  }).join("");
}

function findPickupSlotOptionByValue(value) {
  const normalizedValue = normalizePickupSlotText(value);
  if (!normalizedValue) return null;
  return (
    getPickupSlotOptions().find(
      (slot) =>
        slot.key === normalizedValue ||
        normalizePickupSlotText(slot.label) === normalizedValue,
    ) || null
  );
}

function findPricingPickupSlotByStart(startTimeText) {
  const startMinutes = timeTextToMinutes(startTimeText);
  if (startMinutes < 0) return null;

  return (
    getPickupSlotOptions().find((slot) => {
      const slotStartMinutes = timeTextToMinutes(slot.start);
      const slotEndMinutes = timeTextToMinutes(slot.end);
      if (slotStartMinutes < 0 || slotEndMinutes < 0) return false;
      if (slotEndMinutes <= slotStartMinutes) return false;
      return (
        startMinutes >= slotStartMinutes && startMinutes < slotEndMinutes
      );
    }) || null
  );
}

function resolvePickupSlot(value = null) {
  const input = document.getElementById("khung_gio_lay_hang");
  const rawInputValue =
    value == null ? input?.value || "" : String(value || "");
  const normalizedValue = normalizePickupSlotText(rawInputValue);
  if (!normalizedValue) return null;

  const matchedOption = findPickupSlotOptionByValue(normalizedValue);
  const enteredSlot = matchedOption || parsePickupSlotInput(normalizedValue);
  if (!enteredSlot) return null;

  const enteredStartMinutes = timeTextToMinutes(enteredSlot.start);
  const enteredEndMinutes = timeTextToMinutes(enteredSlot.end);
  if (enteredStartMinutes < 0 || enteredEndMinutes < 0) return null;
  if (enteredEndMinutes <= enteredStartMinutes) return null;

  const pricingSlot =
    matchedOption || findPricingPickupSlotByStart(enteredSlot.start);
  if (!pricingSlot) return null;

  return {
    rawLabel: normalizePickupSlotText(enteredSlot.label),
    enteredStart: enteredSlot.start,
    enteredEnd: enteredSlot.end,
    pricingSlotKey: pricingSlot.key || "",
    pricingSlotLabel: pricingSlot.label || "",
    pricingSlotStart: pricingSlot.start || "",
    pricingSlotEnd: pricingSlot.end || "",
    pricingFixedFee: pricingSlot.phicodinh || 0,
    pricingMultiplier: pricingSlot.heso || 1,
    pricingSlot,
  };
}

function getSelectedPickupSlot() {
  return resolvePickupSlot()?.pricingSlot || null;
}

function getPickupAtDateTime() {
  const pickupDateValue = document.getElementById("ngay_lay_hang")?.value || "";
  const resolvedPickupSlot = resolvePickupSlot();

  if (pickupDateValue && resolvedPickupSlot?.enteredStart) {
    const pickupRange = getPickupSlotDateRange(pickupDateValue, {
      start: resolvedPickupSlot.enteredStart,
      end: resolvedPickupSlot.enteredEnd,
    });
    if (pickupRange?.startAt) {
      return pickupRange.startAt;
    }
  }

  return getCurrentDateTime();
}

function getSelectedUrgentCondition() {
  return {
    key: weatherQuoteState?.conditionKey || "macdinh",
    label: weatherQuoteState?.conditionLabel || DEFAULT_URGENT_CONDITION.label,
  };
}

function syncUrgentConditionVisibility(serviceType) {
  const panel = document.getElementById("bang_phu_phi_thoi_tiet");
  if (!panel) return;
  panel.classList.remove("is-hidden");
  updateWeatherSurchargePanel(serviceType);
}

function updateWeatherSurchargePanel(serviceType) {
  const desc = document.getElementById("mo_ta_phu_phi_thoi_tiet");
  const badge = document.getElementById("huy_hieu_phu_phi_thoi_tiet");
  const meta = document.getElementById("thong_tin_phu_phi_thoi_tiet");
  const hint = document.getElementById("goi_y_phu_phi_thoi_tiet");
  if (!desc || !badge || !meta || !hint) return;
  const serviceLabels = {
    instant: "Giao ngay lập tức",
    express: "Giao hàng hỏa tốc",
    fast: "Giao hàng nhanh",
    standard: "Giao hàng tiêu chuẩn",
  };
  const pickupAt = getPickupAtDateTime();
  const serviceLabel = serviceLabels[serviceType] || "gói đang chọn";

  if (weatherQuoteState?.isLoading) {
    desc.textContent = "";
    badge.textContent = "Đang kiểm tra";
    badge.className = "weather-surcharge-badge";
    meta.textContent = "";
    hint.textContent =
      "Hệ thống đang gọi API thời tiết theo điểm lấy hàng và khung giờ đã chọn để xác định phụ phí. Trong lúc chờ kết quả, mức hiển thị đang là tạm tính.";
    return;
  }

  const conditionLabel =
    weatherQuoteState?.conditionLabel || "Chưa phát sinh phụ phí thời tiết";
  const sourceLabel =
    weatherQuoteState?.source === "openmeteo_hourly" ||
    weatherQuoteState?.source === "openweather_forecast"
      ? "Dữ liệu dự báo thời tiết"
      : weatherQuoteState?.source === "openmeteo_current" ||
          weatherQuoteState?.source === "openweather_current"
        ? "Dữ liệu thời tiết hiện tại"
        : "Dữ liệu tạm tính nội bộ";
  const hasSurcharge =
    weatherQuoteState &&
    weatherQuoteState.conditionKey &&
    weatherQuoteState.conditionKey !== "macdinh";
  const isFallback = !!weatherQuoteState?.isFallback;
  const conditionFee = Number(selectedService?.breakdown?.conditionFee || 0);
  const updatedAt = weatherQuoteState?.checkedAt
    ? ` Cập nhật: ${weatherQuoteState.checkedAt}.`
    : "";
  const pickupAtText = pickupAt
    ? ` Mốc lấy hàng: ${pickupAt.toLocaleString("vi-VN")}.`
    : "";

  desc.textContent = "";
  badge.textContent = hasSurcharge
    ? formatMoneyVnd(conditionFee)
    : formatMoneyVnd(0);
  badge.className = `weather-surcharge-badge${
    isFallback ? " is-muted" : hasSurcharge ? " is-warning" : ""
  }`;
  meta.textContent = "";
  hint.textContent =
    weatherQuoteState?.note ||
    (serviceType
      ? hasSurcharge
        ? `${sourceLabel} đã xác nhận ${conditionLabel.toLowerCase()}. ${serviceLabel} đang cộng ${formatMoneyVnd(conditionFee)} phụ phí thời tiết.${updatedAt}${pickupAtText}`
        : `${sourceLabel} hiện chưa ghi nhận phụ phí thời tiết cho ${serviceLabel}. Mức đang áp dụng là ${formatMoneyVnd(0)}.${updatedAt}${pickupAtText}`
      : `Phụ phí thời tiết sẽ tự cập nhật theo gói bạn chọn sau khi hệ thống kiểm tra dữ liệu thời tiết.${updatedAt}${pickupAtText}`);
}

function buildWeatherRequestKey() {
  const pickupPoint = markerPickup?.getLatLng?.();
  if (!pickupPoint) return "";
  const pickupAt = getPickupAtDateTime();
  return `${pickupPoint.lat.toFixed(3)}:${pickupPoint.lng.toFixed(3)}:${formatDateValue(pickupAt)}:${pickupAt.getHours()}:${pickupAt.getMinutes()}`;
}

function getOpenMeteoForecastDays(pickupAt) {
  const pickupTime = pickupAt instanceof Date ? pickupAt.getTime() : Date.now();
  const now = Date.now();
  const diffDays = Math.max(
    0,
    Math.ceil((pickupTime - now) / (24 * 60 * 60 * 1000)),
  );
  return Math.min(Math.max(diffDays + 2, 3), 16);
}

function findClosestOpenMeteoHourlyIndex(hourlyTimes, pickupAt) {
  if (
    !Array.isArray(hourlyTimes) ||
    !hourlyTimes.length ||
    !(pickupAt instanceof Date)
  ) {
    return -1;
  }

  const pickupTime = pickupAt.getTime();
  let closestIndex = -1;
  let closestDiff = Number.POSITIVE_INFINITY;

  hourlyTimes.forEach((timeText, index) => {
    const rowTime = new Date(timeText);
    if (Number.isNaN(rowTime.getTime())) return;
    const diff = Math.abs(rowTime.getTime() - pickupTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function mapOpenMeteoWeatherCondition(bucket = {}) {
  const weatherCode = Number(bucket.weather_code ?? 0);
  const precipitation = Number(bucket.precipitation ?? 0);
  const rain = Number(bucket.rain ?? 0);
  const showers = Number(bucket.showers ?? 0);
  const snowfall = Number(bucket.snowfall ?? 0);
  const windSpeed = Number(bucket.wind_speed_10m ?? 0);
  const thunderstormCodes = [95, 96, 99];
  const heavyRainCodes = [65, 67, 82];
  const lightRainCodes = [51, 53, 55, 56, 57, 61, 63, 66, 80, 81];
  const snowCodes = [71, 73, 75, 77, 85, 86];

  if (
    thunderstormCodes.includes(weatherCode) ||
    heavyRainCodes.includes(weatherCode) ||
    snowCodes.includes(weatherCode) ||
    precipitation >= 3 ||
    rain >= 3 ||
    showers >= 3 ||
    snowfall >= 1 ||
    windSpeed >= 36
  ) {
    return {
      condition_key: "muato",
      condition_label: "Mưa lớn / thời tiết xấu",
      summary: "Đã cộng phụ phí thời tiết xấu",
    };
  }

  if (
    lightRainCodes.includes(weatherCode) ||
    precipitation > 0 ||
    rain > 0 ||
    showers > 0
  ) {
    return {
      condition_key: "muanhe",
      condition_label: "Mưa nhẹ / đường đông",
      summary: "Đã cộng phụ phí mưa nhẹ",
    };
  }

  return {
    condition_key: "macdinh",
    condition_label: "Thời tiết bình thường",
    summary: "Chưa phát sinh phụ phí thời tiết",
  };
}

function normalizeOpenMeteoWeatherQuote(payload, pickupAt) {
  const current = payload?.current || {};
  const hourly = payload?.hourly || {};
  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
  const hourlyIndex = findClosestOpenMeteoHourlyIndex(hourlyTimes, pickupAt);
  const hasHourly = hourlyIndex >= 0;
  const bucket = hasHourly
    ? {
        weather_code: hourly.weather_code?.[hourlyIndex],
        precipitation: hourly.precipitation?.[hourlyIndex],
        rain: hourly.rain?.[hourlyIndex],
        showers: hourly.showers?.[hourlyIndex],
        snowfall: hourly.snowfall?.[hourlyIndex],
        wind_speed_10m: hourly.wind_speed_10m?.[hourlyIndex],
      }
    : current;
  const mapped = mapOpenMeteoWeatherCondition(bucket);
  const source = hasHourly ? "openmeteo_hourly" : "openmeteo_current";
  const pickupText =
    pickupAt instanceof Date && !Number.isNaN(pickupAt.getTime())
      ? pickupAt.toLocaleString("vi-VN")
      : "";

  return {
    status: "ready",
    requestKey: weatherQuoteState?.requestKey || "",
    isLoading: false,
    conditionKey: mapped.condition_key,
    conditionLabel: mapped.condition_label,
    summary: mapped.summary,
    note:
      mapped.condition_key === "macdinh"
        ? `Hệ thống đã kiểm tra thời tiết tại điểm lấy hàng. Hiện chưa cần cộng phụ phí thời tiết${pickupText ? ` cho mốc ${pickupText}` : ""}.`
        : `Hệ thống đã kiểm tra thời tiết tại điểm lấy hàng và xác nhận ${mapped.condition_label.toLowerCase()}${pickupText ? ` cho mốc ${pickupText}` : ""}. Phụ phí thời tiết đã được cộng tự động.`,
    source,
    checkedAt: new Date().toLocaleString("vi-VN"),
    effectiveAt: pickupText,
    isFallback: false,
  };
}

async function requestWeatherQuote(force = false) {
  const pickupPoint = markerPickup?.getLatLng?.();
  if (!pickupPoint) {
    weatherQuoteState = {
      ...createDefaultWeatherQuoteState(),
      status: "ready",
      note: "Không xác định được điểm lấy hàng để kiểm tra thời tiết.",
      conditionLabel: "Chưa có dữ liệu thời tiết",
      summary: "Thiếu tọa độ điểm lấy hàng",
    };
    updateWeatherSurchargePanel();
    return;
  }

  const requestKey = buildWeatherRequestKey();
  if (
    !force &&
    weatherQuoteState &&
    weatherQuoteState.requestKey === requestKey &&
    (weatherQuoteState.isLoading || weatherQuoteState.status === "ready")
  ) {
    updateWeatherSurchargePanel(selectedService && selectedService.serviceType);
    return;
  }

  weatherQuoteState = {
    ...createDefaultWeatherQuoteState(),
    requestKey,
    status: "loading",
    isLoading: true,
  };
  updateWeatherSurchargePanel(selectedService && selectedService.serviceType);

  const pickupAt = getPickupAtDateTime();
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", pickupPoint.lat);
  url.searchParams.set("longitude", pickupPoint.lng);
  url.searchParams.set("timezone", "Asia/Bangkok");
  url.searchParams.set(
    "forecast_days",
    String(getOpenMeteoForecastDays(pickupAt)),
  );
  url.searchParams.set(
    "current",
    ["weather_code", "precipitation", "rain", "showers", "wind_speed_10m"].join(
      ",",
    ),
  );
  url.searchParams.set(
    "hourly",
    [
      "weather_code",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "wind_speed_10m",
    ].join(","),
  );

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Không thể lấy dữ liệu thời tiết (HTTP ${response.status}).`,
      );
    }
    const result = await response.json();
    weatherQuoteState = {
      ...normalizeOpenMeteoWeatherQuote(result, pickupAt),
      requestKey,
    };
  } catch (error) {
    console.warn("Không lấy được dữ liệu thời tiết:", error);
    weatherQuoteState = {
      ...createDefaultWeatherQuoteState(),
      status: "ready",
      requestKey,
      note: sanitizeWeatherUserNote(error.message),
      conditionLabel: "Chưa phát sinh phụ phí thời tiết",
      summary: "Hệ thống đang tạm tính phụ phí thời tiết theo mức bình thường",
      isFallback: true,
    };
  }

  updateWeatherSurchargePanel(selectedService && selectedService.serviceType);
  if (lay_buoc_hien_tai() >= 3) {
    renderServiceCards({ skipWeatherFetch: true });
  }
}

// ========== UI HELPERS ==========
function hien_thi_loi(step, message) {
  const errBox = document.getElementById(`loi_buoc_${step}`);
  if (errBox) {
    errBox.querySelector(".error-text").textContent = message;
    errBox.style.display = "block";
    errBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function xoa_loi(step) {
  const errBox = document.getElementById(`loi_buoc_${step}`);
  if (errBox) errBox.style.display = "none";
}

function isValidPhone(phone) {
  const re = /^(0[3|5|7|8|9])+([0-9]{8})\b/g;
  return re.test(phone.trim());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInfoToggleMarkup(
  content,
  label = "Xem chi tiết",
  extraClass = "",
) {
  const classes = ["info-toggle", "info-toggle--inline", extraClass]
    .filter(Boolean)
    .join(" ");
  return `
    <details class="${classes}">
      <summary class="info-toggle__button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">i</summary>
      <div class="info-toggle__content">${escapeHtml(content)}</div>
    </details>
  `;
}

function updateInfoTogglePlacement(toggle) {
  if (!toggle || typeof window === "undefined") return;

  const content = toggle.querySelector(".info-toggle__content");
  if (!content) return;

  if (window.innerWidth > 640) {
    delete toggle.dataset.mobileAlign;
    return;
  }

  toggle.dataset.mobileAlign = "center";

  window.requestAnimationFrame(() => {
    const rect = content.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const safeEdge = 12;

    if (rect.left < safeEdge) {
      toggle.dataset.mobileAlign = "left";
      return;
    }

    if (rect.right > viewportWidth - safeEdge) {
      toggle.dataset.mobileAlign = "right";
      return;
    }

    toggle.dataset.mobileAlign = "center";
  });
}

function bindInfoToggleInteractions(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll(".info-toggle").forEach((toggle) => {
    if (toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const summary = toggle.querySelector("summary");
    if (summary) {
      summary.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    toggle.addEventListener("toggle", () => {
      if (toggle.open) {
        updateInfoTogglePlacement(toggle);
        return;
      }
      delete toggle.dataset.mobileAlign;
    });
  });
}

// ========== MAP ==========
