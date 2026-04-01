/**
 * dat-lich.js — Logic điều khiển Form đặt đơn 5 bước
 * Sử dụng payload chuẩn hóa tiếng Việt không dấu
 * - loai_hang, ten_hang, can_nang, chieu_dai, chieu_rong, chieu_cao
 * - gia_tri_khai_bao, phi_thu_ho, khoang_cach_km
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
const BOOKING_DRAFT_STORAGE_KEY = "ghn_booking_login_resume_v1";
const BOOKING_DRAFT_TTL_MS = 6 * 60 * 60 * 1000;
const LOCAL_CUSTOMER_ORDER_STORAGE_KEY = "ghn-customer-orders";
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
  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const marker = "/giao-hang-nhanh/";
  const markerIndex = currentPath.toLowerCase().lastIndexOf(marker);
  return markerIndex !== -1 ? currentPath.slice(0, markerIndex + marker.length) : "/";
}

function resolveProjectHtmlUrl(path) {
  if (typeof window === "undefined") return String(path || "");
  const normalized = String(path || "").replace(/^\.?\//, "");
  return new URL(normalized, `${window.location.origin}${getProjectBasePath()}`).toString();
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

function getLocalCustomerOrders() {
  const orders = readLocalJson(LOCAL_CUSTOMER_ORDER_STORAGE_KEY, []);
  return Array.isArray(orders) ? orders : [];
}

function normalizeStorageOrderId(value) {
  return String(value || "").trim().toUpperCase();
}

function persistLocalCustomerOrder(detail) {
  const current = getLocalCustomerOrders();
  const nextId = normalizeStorageOrderId(
    detail?.order?.id || detail?.order?.order_code,
  );
  const filtered = current.filter((item) => {
    const itemId = normalizeStorageOrderId(
      item?.order?.id || item?.order?.order_code,
    );
    return itemId !== nextId;
  });
  filtered.unshift(detail);
  return writeLocalJson(LOCAL_CUSTOMER_ORDER_STORAGE_KEY, filtered);
}

function getLocalOrderDetailById(orderId) {
  const normalizedId = normalizeStorageOrderId(orderId);
  return (
    getLocalCustomerOrders().find((item) => {
      const itemId = normalizeStorageOrderId(
        item?.order?.id || item?.order?.order_code,
      );
      return itemId === normalizedId;
    }) || null
  );
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

function buildGeneratedOrderCode() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `GHN-${datePart}-${suffix}`;
}

function getSelectedUploadMeta() {
  return getSelectedUploadFiles().map((entry, index) => {
    const name = String(entry?.file?.name || `tep-${index + 1}`);
    const extension = name.includes(".")
      ? name.split(".").pop().toLowerCase()
      : "";
    return {
      id: `${Date.now()}-${index}`,
      name,
      extension,
      url: "",
      created_at: new Date().toISOString(),
    };
  });
}

function mapStoredDetailToReorderData(detail) {
  if (!detail || typeof detail !== "object") return null;
  const order = detail.order || {};
  return {
    source_order_id: order.id || order.order_code || "",
    source_order_code: order.order_code || order.id || "",
    sender_name: order.sender_name || "",
    sender_phone: order.sender_phone || "",
    receiver_name: order.receiver_name || "",
    receiver_phone: order.receiver_phone || "",
    search_pickup: order.pickup_address || "",
    search_delivery: order.delivery_address || "",
    pickup_address: order.pickup_address || "",
    delivery_address: order.delivery_address || "",
    pickup_date:
      order.service_meta?.pickup_date || order.pickup_date || order.ngay_lay_hang || "",
    pickup_slot:
      order.service_meta?.pickup_slot || order.pickup_slot || order.khung_gio_lay_hang || "",
    pickup_slot_label:
      order.service_meta?.pickup_slot_label ||
      order.pickup_slot_label ||
      order.ten_khung_gio_lay_hang ||
      "",
    notes: order.clean_note || order.notes || "",
    cod_value: order.cod_amount || order.cod_value || 0,
    payment_method: order.payment_method || "tien_mat",
    fee_payer: order.fee_payer || "gui",
    service_type: order.service_type || "",
    service_name: order.service_label || order.service_name || "",
    estimated_eta:
      order.service_meta?.estimated_eta || order.estimated_delivery || "",
    vehicle: order.vehicle_type || order.vehicle || "",
    vehicle_label:
      order.service_meta?.vehicle_label || order.vehicle_label || order.vehicle_type || "",
    khoang_cach_km:
      order.service_meta?.distance_km || order.khoang_cach_km || 0,
    items: Array.isArray(detail.items) ? detail.items : [],
  };
}

function buildLocalOrderDetail(payload, orderCode = buildGeneratedOrderCode()) {
  const session = getLocalSession();
  const now = new Date().toISOString();
  const pricingBreakdown = chuan_hoa_chi_tiet_gia_cuoc_da_luu(
    payload.chi_tiet_gia_cuoc || {},
  );
  const serviceType = getInternalServiceType(payload.dich_vu);
  const uploadedMeta = getSelectedUploadMeta();

  return {
    status: "success",
    order: {
      id: orderCode,
      order_code: orderCode,
      created_at: now,
      pickup_time: payload.ngay_lay_hang || "",
      pickup_date: payload.ngay_lay_hang || "",
      pickup_slot: payload.khung_gio_lay_hang || "",
      pickup_slot_label: payload.ten_khung_gio_lay_hang || "",
      status: "pending",
      status_label: "Chờ xử lý",
      sender_name: payload.nguoi_gui_ho_ten || "",
      sender_phone: payload.nguoi_gui_so_dien_thoai || "",
      receiver_name: payload.nguoi_nhan_ho_ten || "",
      receiver_phone: payload.nguoi_nhan_so_dien_thoai || "",
      pickup_address: payload.dia_chi_lay_hang || "",
      delivery_address: payload.dia_chi_giao_hang || "",
      service_type: serviceType,
      service_name: payload.ten_dich_vu || "",
      service_label: payload.ten_dich_vu || "",
      vehicle_type: payload.ten_phuong_tien || payload.phuong_tien || "",
      vehicle_label: payload.ten_phuong_tien || payload.phuong_tien || "",
      payment_method: payload.phuong_thuc_thanh_toan || "tien_mat",
      payment_method_label: buildPaymentMethodLabel(
        payload.phuong_thuc_thanh_toan,
      ),
      fee_payer: payload.nguoi_tra_cuoc || "gui",
      payer_label: buildFeePayerLabel(payload.nguoi_tra_cuoc),
      cod_amount: Number(payload.gia_tri_thu_ho_cod || 0),
      total_fee: Number(payload.tong_cuoc || 0),
      shipping_fee: Number(payload.tong_cuoc || 0),
      notes: payload.ghi_chu_tai_xe || "",
      clean_note: payload.ghi_chu_tai_xe || "",
      estimated_delivery: payload.du_kien_giao_hang || "",
      payment_status_label: "Chưa hoàn tất",
      khoang_cach_km: Number(payload.khoang_cach_km || 0),
      fee_breakdown: pricingBreakdown,
      pricing_breakdown: pricingBreakdown,
      service_meta: {
        pickup_date: payload.ngay_lay_hang || "",
        pickup_slot: payload.khung_gio_lay_hang || "",
        pickup_slot_label: payload.ten_khung_gio_lay_hang || "",
        estimated_eta: payload.du_kien_giao_hang || "",
        vehicle_label: payload.ten_phuong_tien || payload.phuong_tien || "",
        distance_km: Number(payload.khoang_cach_km || 0),
        payer_label: buildFeePayerLabel(payload.nguoi_tra_cuoc),
        payment_method_label: buildPaymentMethodLabel(
          payload.phuong_thuc_thanh_toan,
        ),
      },
    },
    provider: {
      attachments: uploadedMeta,
      shipper_reports: [],
      feedback_media: [],
    },
    customer: {
      id: session?.id || "",
      username: session?.username || "",
      fullname: session?.fullname || payload.nguoi_gui_ho_ten || "",
      phone: session?.phone || payload.nguoi_gui_so_dien_thoai || "",
      email: session?.email || "",
    },
    items: Array.isArray(payload.mat_hang) ? payload.mat_hang : [],
    logs: [
      {
        old_status_label: "Mới tạo",
        new_status_label: "Chờ xử lý",
        created_at: now,
        note: "Đơn hàng đã được tạo thành công.",
      },
    ],
  };
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

function buildCrudBookingInsertPayload(
  payload,
  orderCode = buildGeneratedOrderCode(),
) {
  const session = getLocalSession();
  const createdAt = new Date().toISOString();
  const serviceType = getInternalServiceType(payload.dich_vu);

  return {
    ma_don_hang_noi_bo: orderCode,
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
    dich_vu: payload.dich_vu || "",
    ten_dich_vu: payload.ten_dich_vu || "",
    loai_dich_vu: serviceType || "",
    phuong_tien: payload.phuong_tien || "",
    ten_phuong_tien: payload.ten_phuong_tien || "",
    tong_cuoc: Number(payload.tong_cuoc || 0),
    gia_tri_thu_ho_cod: Number(payload.gia_tri_thu_ho_cod || 0),
    phuong_thuc_thanh_toan: payload.phuong_thuc_thanh_toan || "",
    nguoi_tra_cuoc: payload.nguoi_tra_cuoc || "",
    ghi_chu: payload.ghi_chu_tai_xe || "",
    khoang_cach_km: Number(payload.khoang_cach_km || 0),
    trang_thai: "moi_tao",
    created_at: createdAt,
    customer_id: session?.id || "",
    customer_username: session?.username || "",
    mat_hang_json: JSON.stringify(Array.isArray(payload.mat_hang) ? payload.mat_hang : []),
    chi_tiet_gia_cuoc_json: JSON.stringify(payload.chi_tiet_gia_cuoc || {}),
  };
}

async function insertBookingWithCrud(payload, orderCode) {
  const insertFn = getBookingCrudInsertFn();
  if (!insertFn) {
    throw new Error(
      "Không tìm thấy hàm crud/krud trên trang đặt lịch. Kiểm tra lại script krud.js.",
    );
  }

  return insertFn(
    "giaohangnhanh_dat_lich",
    buildCrudBookingInsertPayload(payload, orderCode),
  );
}

function extractCrudInsertOrderIdentifier(result) {
  if (!result || typeof result !== "object") return "";

  return String(
    result.order_code ||
      result.id ||
      result.insertId ||
      result.insert_id ||
      result.record_id ||
      result.data?.order_code ||
      result.data?.id ||
      result.data?.insertId ||
      result.result?.order_code ||
      result.result?.id ||
      result.result?.insertId ||
      "",
  ).trim();
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
    console.warn("Không thể lưu nháp đơn hàng để tiếp tục sau đăng nhập:", error);
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
    if (
      !savedAt ||
      Date.now() - savedAt > BOOKING_DRAFT_TTL_MS
    ) {
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
    tenhangtheoloai: {},
    loaixe: [
      { key: "auto", label: "Để hệ thống tự đề xuất" },
      { key: "xe_may", label: "Xe máy" },
      { key: "xe_loi", label: "Xe lôi / xe ba gác" },
      { key: "xe_ban_tai", label: "Xe bán tải / xe van" },
      { key: "xe_tai", label: "Xe tải nhẹ" },
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
const ITEM_TYPES = Array.isArray(ORDER_FORM_CONFIG.loaihang)
  ? ORDER_FORM_CONFIG.loaihang
  : [];
const ITEM_NAMES_BY_TYPE = ORDER_FORM_CONFIG.tenhangtheoloai || {};
const ITEM_TYPE_LABELS = ITEM_TYPES.reduce((acc, item) => {
  if (item && item.key) acc[item.key] = item.label || item.key;
  return acc;
}, {});
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

  hien_thi_danh_sach_hang_hoa();
  bindInfoToggleInteractions();
  document
    .getElementById("btn_them_hang_hoa")
    .addEventListener("click", them_hang_hoa);
  document.getElementById("gia_tri_thu_ho_cod").addEventListener("input", () => {
    hien_thi_danh_sach_hang_hoa();
    if (lay_buoc_hien_tai() >= 3) renderServiceCards();
  });

  // Default date = today
  const today = formatDateValue(getCurrentDateTime());
  document.getElementById("ngay_lay_hang").value = today;
  document.getElementById("phuong_tien_giao_hang").addEventListener("change", () => {
    if (lay_buoc_hien_tai() >= 3) renderServiceCards();
  });
  document.getElementById("ngay_lay_hang").addEventListener("change", () => {
    if (lay_buoc_hien_tai() >= 3) renderServiceCards();
  });
  document.getElementById("khung_gio_lay_hang").addEventListener("change", () => {
    syncUrgentConditionVisibility(selectedService && selectedService.serviceType);
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
          if (step === 5) chuan_bi_xac_nhan();
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
  setDeliveryMode("scheduled", { render: false });
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
    note:
      "Hệ thống sẽ tự kiểm tra thời tiết tại điểm lấy hàng để tính phụ phí nếu có. Nếu chưa lấy được dữ liệu, điều phối sẽ kiểm tra lại trước khi chốt đơn.",
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

  const scheduledFlow = document.getElementById("luong_lich_hen");
  if (scheduledFlow) scheduledFlow.classList.remove("is-hidden");

  if (nextMode === "instant") {
    applyImmediateScheduleDefaults();
  }
  requestWeatherQuote();

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

function isInstantService(serviceType) {
  return (
    String(serviceType || "")
      .trim()
      .toLowerCase() === "instant"
  );
}

function timeTextToMinutes(timeText) {
  const [hour, minute] = String(timeText || "")
    .split(":")
    .map((value) => parseInt(value, 10));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
  return hour * 60 + minute;
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
        start: rule.start,
        end: rule.end,
        phicodinh: rule.fixedFee || 0,
        heso: rule.multiplier || 1,
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
  const pickupSlotSelect = document.getElementById("khung_gio_lay_hang");
  const instantWindow = getInstantPricingWindow(now);

  if (pickupDateInput) pickupDateInput.value = formatDateValue(now);
  if (pickupSlotSelect && instantWindow) pickupSlotSelect.value = instantWindow.key;
}

function initPickupSlotOptions() {
  const select = document.getElementById("khung_gio_lay_hang");
  if (!select) return;
  const options = getPickupSlotOptions();
  if (!options.length) return;
  select.innerHTML = options
    .map((slot, index) => {
      const selectedAttr = index === 0 ? " selected" : "";
      return `<option value="${slot.key}" data-start="${slot.start}" data-end="${slot.end}"${selectedAttr}>${slot.label}</option>`;
    })
    .join("");
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

function getSelectedPickupSlot() {
  const select = document.getElementById("khung_gio_lay_hang");
  if (!select) return null;
  const options = getPickupSlotOptions();
  const selected = options.find((slot) => slot.key === select.value);
  return selected || null;
}

function getPickupAtDateTime() {
  const pickupDateValue = document.getElementById("ngay_lay_hang")?.value || "";
  const pickupSlot = getSelectedPickupSlot();

  if (pickupDateValue && pickupSlot?.start) {
    const pickupAt = new Date(`${pickupDateValue}T${pickupSlot.start}`);
    if (!Number.isNaN(pickupAt.getTime())) {
      return pickupAt;
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

function normalizeWeatherQuoteResponse(payload) {
  const response = payload && typeof payload === "object" ? payload : {};
  return {
    status: "ready",
    requestKey: weatherQuoteState?.requestKey || "",
    isLoading: false,
    conditionKey: response.condition_key || "macdinh",
    conditionLabel:
      response.condition_label || "Chưa phát sinh phụ phí thời tiết",
    summary:
      response.summary || "Hệ thống đang tạm tính theo thời tiết bình thường",
    note:
      sanitizeWeatherUserNote(response.note) ||
      "Khách hàng không cần chọn tay. Điều phối sẽ xác nhận khi điều kiện thực tế thay đổi.",
    source: response.source || "fallback",
    checkedAt: response.checked_at || "",
    effectiveAt: response.effective_at || "",
    isFallback: response.is_fallback !== false,
  };
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
  const diffDays = Math.max(0, Math.ceil((pickupTime - now) / (24 * 60 * 60 * 1000)));
  return Math.min(Math.max(diffDays + 2, 3), 16);
}

function findClosestOpenMeteoHourlyIndex(hourlyTimes, pickupAt) {
  if (!Array.isArray(hourlyTimes) || !hourlyTimes.length || !(pickupAt instanceof Date)) {
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
  url.searchParams.set("forecast_days", String(getOpenMeteoForecastDays(pickupAt)));
  url.searchParams.set(
    "current",
    [
      "weather_code",
      "precipitation",
      "rain",
      "showers",
      "wind_speed_10m",
    ].join(","),
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
      throw new Error(`Không thể lấy dữ liệu thời tiết (HTTP ${response.status}).`);
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

function isDateInPast(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(dateStr);
  return selected < today;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInfoToggleMarkup(content, label = "Xem chi tiết", extraClass = "") {
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
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
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
function initMap() {
  map = L.map("ban_do_giao_hang").setView([10.762622, 106.660172], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const iconBlue = new L.Icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  const iconRed = new L.Icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  markerPickup = L.marker([10.7769, 106.7009], {
    draggable: true,
    icon: iconBlue,
  })
    .addTo(map)
    .bindPopup("📍 Điểm lấy hàng")
    .bindTooltip("<div>Lấy hàng</div>", {
      permanent: true,
      direction: "top",
      offset: [0, -30],
      className: "map-marker-tooltip map-marker-tooltip--pickup",
    });
  markerDelivery = L.marker([10.75, 106.65], { draggable: true, icon: iconRed })
    .addTo(map)
    .bindPopup("🏁 Điểm giao hàng")
    .bindTooltip("<div>Giao hàng</div>", {
      permanent: true,
      direction: "top",
      offset: [0, -30],
      className: "map-marker-tooltip map-marker-tooltip--delivery",
    });

  markerPickup.on("dragend", () => {
    reverseGeocode(markerPickup.getLatLng(), "dia_chi_lay_hang");
    recalculateDistance();
  });
  markerDelivery.on("dragend", () => {
    reverseGeocode(markerDelivery.getLatLng(), "dia_chi_giao_hang");
    recalculateDistance();
  });

  recalculateDistance();
}

function initGeolocationButton() {
  const btn = document.getElementById("btn_lay_vi_tri_hien_tai");
  if (!btn) return;

  btn.addEventListener("click", () => {
    requestPickupCurrentLocation({ showError: true, silent: false });
  });
}

function setGeolocationButtonLoading(isLoading) {
  const btn = document.getElementById("btn_lay_vi_tri_hien_tai");
  if (!btn) return;
  if (!btn.dataset.originalHtml) {
    btn.dataset.originalHtml = btn.innerHTML;
  }
  btn.innerHTML = isLoading
    ? `<i class="fas fa-spinner fa-spin" style="margin-right: 6px;"></i> Đang lấy...`
    : btn.dataset.originalHtml;
  btn.disabled = isLoading;
}

function requestPickupCurrentLocation(options = {}) {
  const showError = options.showError !== false;
  const silent = options.silent === true;

  if (isResolvingPickupLocation) return;

  if (!navigator.geolocation) {
    if (showError) {
      showErrorMessage(
        "Trình duyệt của thiết bị không hỗ trợ lấy vị trí, vui lòng nhập thủ công.",
      );
    }
    return;
  }

  xoa_loi(1);
  isResolvingPickupLocation = true;
  setGeolocationButtonLoading(true);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (markerPickup) {
        markerPickup.setLatLng([lat, lng]);
      }
      adjustMapBounds();
      reverseGeocode({ lat, lng }, "dia_chi_lay_hang");
      recalculateDistance();
      isResolvingPickupLocation = false;
      setGeolocationButtonLoading(false);
    },
    (error) => {
      console.warn("Lỗi lấy vị trí: ", error);
      if (!silent && showError) {
        showErrorMessage(
          "Thiết bị đã chặn quyền truy cập vị trí. Vui lòng cấp quyền hoặc bấm nút lấy vị trí hiện tại để thử lại.",
        );
      }
      isResolvingPickupLocation = false;
      setGeolocationButtonLoading(false);
    },
    { timeout: 10000 },
  );
}

function showErrorMessage(message) {
  hien_thi_loi(1, message);
}

function shouldAutoResolvePickupLocation() {
  if (getQueryParam("reorder_id")) return false;
  const pickupInput = document.getElementById("dia_chi_lay_hang");
  return !String(pickupInput?.value || "").trim();
}

function adjustMapBounds() {
  if (markerPickup && markerDelivery && map) {
    const group = new L.featureGroup([markerPickup, markerDelivery]);
    map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
  }
}

async function recalculateDistance() {
  const a = markerPickup.getLatLng();
  const b = markerDelivery.getLatLng();
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.routes && data.routes[0] && data.routes[0].distance) {
      khoang_cach_km = data.routes[0].distance / 1000;
    } else {
      throw new Error("No route");
    }
  } catch (error) {
    khoang_cach_km = a.distanceTo(b) / 1000;
  }
  showDistance();
  if (lay_buoc_hien_tai() >= 3) {
    if (getDeliveryMode() === "instant") {
      requestWeatherQuote(true);
    }
    renderServiceCards();
  }
}

function showDistance() {
  const badge = document.getElementById("thong_tin_khoang_cach");
  document.getElementById("gia_tri_khoang_cach_km").textContent =
    khoang_cach_km.toFixed(2);
  badge.style.display = "inline-flex";
}

// ========== ADDRESS SEARCH ==========
function initAddressSearch(inputId, sugId, markerType) {
  const input = document.getElementById(inputId);
  const sugBox = document.getElementById(sugId);
  let timer;

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) {
      sugBox.style.display = "none";
      return;
    }
    timer = setTimeout(() => fetchNominatim(q, sugBox, markerType), 500);
  });
  document.addEventListener("click", (e) => {
    if (e.target !== input) sugBox.style.display = "none";
  });
}

function fetchNominatim(query, sugBox, markerType) {
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=6`,
  )
    .then((r) => r.json())
    .then((data) => {
      sugBox.innerHTML = "";
      if (!data.length) {
        sugBox.style.display = "none";
        return;
      }
      data.forEach((item) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        const parts = item.display_name.split(",");
        div.innerHTML = `<i class="fas fa-map-pin" style="color:#94a3b8;margin-top:3px;"></i>
          <div><span class="s-main">${parts[0]}</span><span class="s-sub">${parts.slice(1).join(",").trim()}</span></div>`;
        div.addEventListener("click", () => {
          const inputId =
            markerType === "pickup" ? "dia_chi_lay_hang" : "dia_chi_giao_hang";
          document.getElementById(inputId).value = item.display_name;
          sugBox.style.display = "none";
          if (markerType === "pickup")
            markerPickup.setLatLng([item.lat, item.lon]);
          else markerDelivery.setLatLng([item.lat, item.lon]);
          adjustMapBounds();
          recalculateDistance();
        });
        sugBox.appendChild(div);
      });
      sugBox.style.display = "block";
    });
}

function reverseGeocode(latlng, inputId) {
  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
  )
    .then((r) => r.json())
    .then((d) => {
      if (d.display_name)
        document.getElementById(inputId).value = d.display_name;
    });
}

function getQueryParam(name) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

async function resolveAddressToLatLng(address) {
  const query = String(address || "").trim();
  if (!query) return null;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=1`,
  );
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) {
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

function setOptionGroupValue(groupId, value) {
  const button = document.querySelector(
    `#${groupId} .option-btn[data-val="${value}"]`,
  );
  if (button) {
    chon_tuy_chon(groupId, button);
  }
}

function normalizeReorderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return [
      {
        loai_hang: "",
        ten_hang: "",
        so_luong: 1,
        gia_tri_khai_bao: 0,
        can_nang: 1,
        chieu_dai: 15,
        chieu_rong: 10,
        chieu_cao: 10,
      },
    ];
  }

  return items.map((item) => ({
    loai_hang: item.loai_hang || "thuong",
    ten_hang: item.ten_hang || "",
    so_luong: Math.max(1, parseInt(item.so_luong, 10) || 1),
    gia_tri_khai_bao: parseFloat(item.gia_tri_khai_bao) || 0,
    can_nang: Math.max(0.1, parseFloat(item.can_nang) || 0.1),
    chieu_dai: Math.max(0, parseFloat(item.chieu_dai) || 0),
    chieu_rong: Math.max(0, parseFloat(item.chieu_rong) || 0),
    chieu_cao: Math.max(0, parseFloat(item.chieu_cao) || 0),
  }));
}

function markReorderMode(orderCode) {
  const container = document.querySelector(".booking-container");
  if (!container || document.getElementById("reorder-banner")) return;

  const banner = document.createElement("div");
  banner.id = "reorder-banner";
  banner.style.cssText =
    "margin-bottom:18px;padding:14px 16px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-weight:700;";
  banner.innerHTML = `<i class="fas fa-rotate-right"></i> Đang đặt lại từ đơn <strong>${escapeHtml(orderCode || "")}</strong>. Bạn có thể chỉnh lại trước khi gửi.`;
  container.insertBefore(banner, container.firstChild);
}

function resetUploadsAfterDraftRestore(hadUploads) {
  const imageInput = document.getElementById("hinh_anh_hang_hoa");
  const videoInput = document.getElementById("video_hang_hoa");
  const imageMeta = document.getElementById("thong_tin_tai_len_anh");
  const videoMeta = document.getElementById("thong_tin_tai_len_video");
  const imagePreview = document.getElementById("xem_truoc_anh_hang_hoa");
  const videoPreview = document.getElementById("xem_truoc_video_hang_hoa");
  const restoreMessage = hadUploads
    ? "Media cũ không thể tự khôi phục sau khi đăng nhập. Vui lòng chọn lại."
    : "Chưa có tệp nào được chọn.";

  if (imageInput) imageInput.value = "";
  if (videoInput) videoInput.value = "";
  if (imageMeta) imageMeta.textContent = restoreMessage;
  if (videoMeta) videoMeta.textContent = restoreMessage;
  if (imagePreview) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
  if (videoPreview) {
    videoPreview.removeAttribute("src");
    videoPreview.load();
    videoPreview.style.display = "none";
  }
  hien_thi_tai_len_xac_nhan();
}

async function applyStoredDraftMarkers(payload) {
  const pickupLat = Number(
    payload.vi_do_lay_hang || payload.pickup_lat || 0,
  );
  const pickupLng = Number(
    payload.kinh_do_lay_hang || payload.pickup_lng || 0,
  );
  const deliveryLat = Number(
    payload.vi_do_giao_hang || payload.delivery_lat || 0,
  );
  const deliveryLng = Number(
    payload.kinh_do_giao_hang || payload.delivery_lng || 0,
  );
  const hasPickupPoint = pickupLat && pickupLng;
  const hasDeliveryPoint = deliveryLat && deliveryLng;

  if (hasPickupPoint) {
    markerPickup.setLatLng([pickupLat, pickupLng]);
  }
  if (hasDeliveryPoint) {
    markerDelivery.setLatLng([deliveryLat, deliveryLng]);
  }

  if (hasPickupPoint && hasDeliveryPoint) {
    map.fitBounds(
      [
        [pickupLat, pickupLng],
        [deliveryLat, deliveryLng],
      ],
      { padding: [40, 40] },
    );
    await recalculateDistance();
    return;
  }

  const pickupAddress = String(
    payload.dia_chi_lay_hang || payload.search_pickup || "",
  ).trim();
  const deliveryAddress = String(
    payload.dia_chi_giao_hang || payload.search_delivery || "",
  ).trim();
  if (pickupAddress && deliveryAddress) {
    await applyReorderAddresses({
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
    });
  }
}

async function restorePendingBookingDraft() {
  const draft = loadPendingBookingDraft();
  if (!draft || !draft.payload) return false;

  const payload = draft.payload;
  document.getElementById("nguoi_gui_ho_ten").value =
    payload.nguoi_gui_ho_ten || payload.sender_name || "";
  document.getElementById("nguoi_gui_so_dien_thoai").value =
    payload.nguoi_gui_so_dien_thoai || payload.sender_phone || "";
  document.getElementById("nguoi_nhan_ho_ten").value =
    payload.nguoi_nhan_ho_ten || payload.receiver_name || "";
  document.getElementById("nguoi_nhan_so_dien_thoai").value =
    payload.nguoi_nhan_so_dien_thoai || payload.receiver_phone || "";
  document.getElementById("dia_chi_lay_hang").value =
    payload.dia_chi_lay_hang || payload.search_pickup || "";
  document.getElementById("dia_chi_giao_hang").value =
    payload.dia_chi_giao_hang || payload.search_delivery || "";
  document.getElementById("ghi_chu_tai_xe").value =
    payload.ghi_chu_tai_xe || payload.notes || "";
  document.getElementById("gia_tri_thu_ho_cod").value =
    parseFloat(payload.gia_tri_thu_ho_cod || payload.cod_value) || 0;

  setOptionGroupValue(
    "nhom_nguoi_tra_cuoc",
    payload.nguoi_tra_cuoc || payload.fee_payer || "gui",
  );
  setOptionGroupValue(
    "nhom_phuong_thuc_thanh_toan",
    payload.phuong_thuc_thanh_toan || payload.payment_method || "tien_mat",
  );

  orderItems = normalizeReorderItems(payload.mat_hang || payload.items);
  hien_thi_danh_sach_hang_hoa();

  const dichVuNoiBo = getInternalServiceType(
    payload.dich_vu || payload.service || "",
  );
  const preferredMode =
    dichVuNoiBo === "instant" ? "instant" : "scheduled";
  setDeliveryMode(preferredMode, { render: false });

  const pickupDateInput = document.getElementById("ngay_lay_hang");
  const pickupSlotSelect = document.getElementById("khung_gio_lay_hang");
  const vehicleSelect = document.getElementById("phuong_tien_giao_hang");

  const ngayLayHang = payload.ngay_lay_hang || payload.pickup_date || "";
  const khungGioLayHang =
    payload.khung_gio_lay_hang || payload.pickup_slot || "";
  const phuongTien = payload.phuong_tien || payload.vehicle || "";

  if (pickupDateInput && ngayLayHang) {
    pickupDateInput.value = ngayLayHang;
  }
  if (pickupSlotSelect && khungGioLayHang) {
    pickupSlotSelect.value = khungGioLayHang;
  }
  if (vehicleSelect && phuongTien) {
    vehicleSelect.value = Array.from(vehicleSelect.options).some(
      (option) => option.value === phuongTien,
    )
      ? phuongTien
      : "auto";
  }

  await applyStoredDraftMarkers(payload);

  selectedService = dichVuNoiBo ? { serviceType: dichVuNoiBo } : null;
  if (dichVuNoiBo) {
    renderServiceCards();
  }

  const requestedStep = Math.max(
    1,
    Math.min(5, parseInt(draft.current_step, 10) || 5),
  );
  let targetStep = requestedStep;
  if (requestedStep >= 4 && !selectedService) {
    targetStep = 3;
  }

  if (targetStep >= 5 && selectedService) {
    chuan_bi_xac_nhan();
    chuyen_den_buoc(5);
  } else if (targetStep >= 4) {
    chuyen_den_buoc(4);
  } else if (targetStep >= 3) {
    chuyen_den_buoc(3);
  } else if (targetStep >= 2) {
    chuyen_den_buoc(2);
  } else {
    chuyen_den_buoc(1);
  }

  resetUploadsAfterDraftRestore(draft.had_uploads);
  showBookingStatusNotice(
    draft.had_uploads
      ? "Đã khôi phục lại thông tin đơn hàng sau khi đăng nhập. Ảnh/video cần chọn lại trước khi xác nhận."
      : "Đã khôi phục lại thông tin đơn hàng sau khi đăng nhập. Bạn có thể kiểm tra và xác nhận tiếp.",
    draft.had_uploads ? "warn" : "info",
  );
  return true;
}

async function applyReorderAddresses(data) {
  document.getElementById("dia_chi_lay_hang").value = data.pickup_address || "";
  document.getElementById("dia_chi_giao_hang").value =
    data.delivery_address || "";

  const [pickupPoint, deliveryPoint] = await Promise.all([
    resolveAddressToLatLng(data.pickup_address).catch(() => null),
    resolveAddressToLatLng(data.delivery_address).catch(() => null),
  ]);

  if (pickupPoint) {
    markerPickup.setLatLng([pickupPoint.lat, pickupPoint.lng]);
  }
  if (deliveryPoint) {
    markerDelivery.setLatLng([deliveryPoint.lat, deliveryPoint.lng]);
  }

  if (pickupPoint && deliveryPoint) {
    map.fitBounds(
      [
        [pickupPoint.lat, pickupPoint.lng],
        [deliveryPoint.lat, deliveryPoint.lng],
      ],
      { padding: [40, 40] },
    );
  } else if (pickupPoint || deliveryPoint) {
    const point = pickupPoint || deliveryPoint;
    map.panTo([point.lat, point.lng]);
  }

  await recalculateDistance();
}

async function applyReorderPrefill(data) {
  reorderContext = {
    source_order_id: data.source_order_id || null,
    source_order_code: data.source_order_code || "",
  };

  document.getElementById("nguoi_gui_ho_ten").value =
    data.nguoi_gui_ho_ten || data.sender_name || "";
  document.getElementById("nguoi_gui_so_dien_thoai").value =
    data.nguoi_gui_so_dien_thoai || data.sender_phone || "";
  document.getElementById("nguoi_nhan_ho_ten").value =
    data.nguoi_nhan_ho_ten || data.receiver_name || "";
  document.getElementById("nguoi_nhan_so_dien_thoai").value =
    data.nguoi_nhan_so_dien_thoai || data.receiver_phone || "";
  document.getElementById("ghi_chu_tai_xe").value =
    data.ghi_chu_tai_xe || data.notes || "";
  document.getElementById("gia_tri_thu_ho_cod").value =
    parseFloat(data.gia_tri_thu_ho_cod || data.cod_value) || 0;

  const vehicleChoice = document.getElementById("phuong_tien_giao_hang");
  if (vehicleChoice) {
    const phuongTien = data.phuong_tien || data.vehicle || "";
    vehicleChoice.value = Array.from(vehicleChoice.options).some(
      (option) => option.value === phuongTien,
    )
      ? phuongTien
      : "auto";
  }

  setOptionGroupValue(
    "nhom_nguoi_tra_cuoc",
    data.nguoi_tra_cuoc || data.fee_payer || "gui",
  );
  setOptionGroupValue(
    "nhom_phuong_thuc_thanh_toan",
    data.phuong_thuc_thanh_toan || data.payment_method || "tien_mat",
  );

  orderItems = normalizeReorderItems(data.mat_hang || data.items);
  hien_thi_danh_sach_hang_hoa();

  if (data.dich_vu || data.service_type) {
    const internalServiceType = getInternalServiceType(
      data.dich_vu || data.service_type,
    );
    selectedService = { serviceType: internalServiceType };
    setDeliveryMode(
      internalServiceType === "instant" ? "instant" : "scheduled",
      { render: false },
    );
  }

  await applyReorderAddresses(data);
  if (data.dich_vu || data.service_type) {
    renderServiceCards();
  }
  markReorderMode(data.source_order_code || `#${data.source_order_id || ""}`);
}

async function initReorderPrefill() {
  const reorderId = getQueryParam("reorder_id");
  if (!reorderId) return;

  try {
    const storedDetail = getLocalOrderDetailById(reorderId);
    if (!storedDetail) {
      throw new Error("Không tìm thấy dữ liệu đơn cần đặt lại trong local.");
    }
    const reorderData = mapStoredDetailToReorderData(storedDetail);
    if (!reorderData) {
      throw new Error("Dữ liệu đơn cần đặt lại không hợp lệ.");
    }
    await applyReorderPrefill(reorderData);
  } catch (error) {
    console.warn("Không thể tải dữ liệu đặt lại:", error);
    hien_thi_loi(1, error.message || "Không thể tải dữ liệu đơn cũ để đặt lại.");
  }
}

function applyCustomerPrefill(data) {
  if (!data || typeof data !== "object") return;

  const senderNameInput = document.getElementById("nguoi_gui_ho_ten");
  const senderPhoneInput = document.getElementById("nguoi_gui_so_dien_thoai");
  const pickupInput = document.getElementById("dia_chi_lay_hang");

  if (senderNameInput && !senderNameInput.value.trim()) {
    senderNameInput.value = data.nguoi_gui_ho_ten || data.sender_name || "";
  }
  if (senderPhoneInput && !senderPhoneInput.value.trim()) {
    senderPhoneInput.value =
      data.nguoi_gui_so_dien_thoai || data.sender_phone || "";
  }
  if (pickupInput && !pickupInput.value.trim()) {
    pickupInput.value = data.dia_chi_lay_hang || data.pickup_address || "";
  }
}

async function initCustomerPrefill() {
  if (getQueryParam("reorder_id")) return;

  try {
    const session = getLocalSession();
    if (!session) return;
    applyCustomerPrefill({
      nguoi_gui_ho_ten: session.fullname || "",
      nguoi_gui_so_dien_thoai: session.phone || "",
    });
  } catch (error) {
    console.warn("Không tự điền được thông tin khách hàng:", error);
  }
}

// ========== ITEMS ==========
function them_hang_hoa() {
  orderItems.push({
    loai_hang: "",
    ten_hang: "",
    so_luong: 1,
    gia_tri_khai_bao: 0,
    can_nang: 1.0,
    chieu_dai: 15,
    chieu_rong: 10,
    chieu_cao: 10,
  });
  hien_thi_danh_sach_hang_hoa();
}

function xoa_hang_hoa(idx) {
  if (orderItems.length <= 1) return;
  orderItems.splice(idx, 1);
  hien_thi_danh_sach_hang_hoa();
}

function xu_ly_thay_doi_loai_hang(idx, val) {
  orderItems[idx].loai_hang = val;
  orderItems[idx].ten_hang = "";
  hien_thi_danh_sach_hang_hoa();
}

function cap_nhat_truong_hang_hoa(idx, field, val) {
  if (field === "loai_hang" || field === "ten_hang") {
    orderItems[idx][field] = val;
  } else if (field === "so_luong") {
    orderItems[idx][field] = Math.max(1, parseInt(val, 10) || 1);
  } else {
    orderItems[idx][field] = parseFloat(val) || 0;
  }
  cap_nhat_tong_can_nang();
}

function hien_thi_danh_sach_hang_hoa() {
  const container = document.getElementById("danh_sach_hang_hoa");
  container.innerHTML = "";
  orderItems.forEach((item, idx) => {
    const names = ITEM_NAMES_BY_TYPE[item.loai_hang] || [];
    const hasCustomName = item.ten_hang && !names.includes(item.ten_hang);
    const nameOpts = [
      hasCustomName
        ? `<option value="${escapeHtml(item.ten_hang)}" selected>${escapeHtml(item.ten_hang)}</option>`
        : "",
      ...names.map(
        (n) =>
          `<option value="${escapeHtml(n)}" ${item.ten_hang === n ? "selected" : ""}>${escapeHtml(n)}</option>`,
      ),
    ].join("");
    const typeOptions = ITEM_TYPES.map(
      (type) => `
      <option value="${escapeHtml(type.key)}" ${item.loai_hang === type.key ? "selected" : ""}>${escapeHtml(type.label)}</option>
    `,
    ).join("");
    const isTypeChosen = Boolean(item.loai_hang);
    const div = document.createElement("div");
    div.className = "item-row";
    div.dataset.itemIndex = String(idx);
    div.innerHTML = `
      <div class="item-row-num">Món hàng #${idx + 1}</div>
      <button class="item-delete-btn" onclick="xoa_hang_hoa(${idx})" title="Xóa"><i class="fas fa-times"></i></button>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Loại hàng</label>
          <select class="form-control loai_hang" name="mat_hang[${idx}][loai_hang]" onchange="xu_ly_thay_doi_loai_hang(${idx}, this.value)">
            <option value="">Chọn loại hàng...</option>
            ${typeOptions}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Tên hàng cụ thể</label>
          <select class="form-control ten_hang" name="mat_hang[${idx}][ten_hang]" onchange="cap_nhat_truong_hang_hoa(${idx}, 'ten_hang', this.value)" ${isTypeChosen ? "" : "disabled"}>
            <option value="">${isTypeChosen ? "Chọn tên hàng..." : "Chọn loại hàng trước"}</option>
            ${nameOpts}
          </select>
        </div>
      </div>
      <div class="item-grid item-grid-2">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">
            Khai báo giá trị (₫)
            ${buildInfoToggleMarkup(
              DECLARED_VALUE_HELP,
              "Giải thích khai báo giá trị",
              "field-help",
            )}
          </label>
          <input type="number" class="form-control gia_tri_khai_bao" name="mat_hang[${idx}][gia_tri_khai_bao]" value="${item.gia_tri_khai_bao}" onchange="cap_nhat_truong_hang_hoa(${idx},'gia_tri_khai_bao',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Số lượng</label>
          <input type="number" class="form-control so_luong" name="mat_hang[${idx}][so_luong]" min="1" step="1" value="${item.so_luong || 1}" onchange="cap_nhat_truong_hang_hoa(${idx},'so_luong',this.value)" />
        </div>
      </div>
      <div class="item-grid item-grid-4">
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cân nặng / kiện (kg)</label>
          <input type="number" class="form-control can_nang" name="mat_hang[${idx}][can_nang]" step="0.1" value="${item.can_nang}" onchange="cap_nhat_truong_hang_hoa(${idx},'can_nang',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Dài (cm)</label>
          <input type="number" class="form-control chieu_dai" name="mat_hang[${idx}][chieu_dai]" value="${item.chieu_dai}" onchange="cap_nhat_truong_hang_hoa(${idx},'chieu_dai',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Rộng (cm)</label>
          <input type="number" class="form-control chieu_rong" name="mat_hang[${idx}][chieu_rong]" value="${item.chieu_rong}" onchange="cap_nhat_truong_hang_hoa(${idx},'chieu_rong',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cao (cm)</label>
          <input type="number" class="form-control chieu_cao" name="mat_hang[${idx}][chieu_cao]" value="${item.chieu_cao}" onchange="cap_nhat_truong_hang_hoa(${idx},'chieu_cao',this.value)" />
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  cap_nhat_tong_can_nang();
  bindInfoToggleInteractions(container);
}

function cap_nhat_tong_can_nang() {
  let totalAct = 0,
    totalVol = 0;
  orderItems.forEach((it) => {
    totalAct += it.can_nang * (it.so_luong || 1);
    totalVol +=
      ((it.chieu_dai * it.chieu_rong * it.chieu_cao) / 6000) *
      (it.so_luong || 1);
  });
  const billable = Math.max(totalAct, totalVol);
  document.getElementById("hien_thi_tong_can_nang").textContent =
    `${billable.toFixed(1)} kg`;
}

function getPrimaryItemMeta() {
  const priority = [
    "cong-kenh",
    "dong-lanh",
    "pin-lithium",
    "chat-long",
    "mui-hoi",
    "de-vo",
    "gia-tri-cao",
    "thuong",
  ];
  for (const type of priority) {
    const found = orderItems.find((item) => item.loai_hang === type);
    if (found) return found;
  }
  const firstSelected = orderItems.find((item) => item.loai_hang);
  return (
    firstSelected || orderItems[0] || { loai_hang: "thuong", ten_hang: "" }
  );
}

function tao_du_lieu_tinh_cuoc() {
  let totalCanNang = 0,
    totalKhaiGia = 0;
  let maxDai = 0,
    maxRong = 0,
    tongCao = 0,
    tongSoLuong = 0;
  orderItems.forEach((it) => {
    const itemQty = Math.max(1, parseInt(it.so_luong, 10) || 1);
    totalCanNang += it.can_nang * itemQty;
    totalKhaiGia += it.gia_tri_khai_bao * itemQty;
    maxDai = Math.max(maxDai, it.chieu_dai);
    maxRong = Math.max(maxRong, it.chieu_rong);
    tongCao += it.chieu_cao * itemQty;
    tongSoLuong += itemQty;
  });
  const primaryItem = getPrimaryItemMeta();
  const isInstantMode = getDeliveryMode() === "instant";
  const currentDate = getCurrentDateTime();
  const instantWindow = isInstantMode ? getInstantPricingWindow(currentDate) : null;
  const pickupSlot = isInstantMode ? instantWindow : getSelectedPickupSlot();
  const urgentCondition = getSelectedUrgentCondition();
  const pickupPoint = markerPickup?.getLatLng?.() || null;
  const deliveryPoint = markerDelivery?.getLatLng?.() || null;
  const pickupDateValue = isInstantMode
    ? formatDateValue(currentDate)
    : document.getElementById("ngay_lay_hang").value || "";
  return {
    khoang_cach_km: khoang_cach_km,
    loai_hang: primaryItem.loai_hang,
    ten_hang: primaryItem.ten_hang,
    can_nang: totalCanNang,
    chieu_dai: maxDai,
    chieu_rong: maxRong,
    chieu_cao: tongCao,
    so_luong: tongSoLuong,
    gia_tri_khai_bao: totalKhaiGia,
    phi_thu_ho: parseFloat(document.getElementById("gia_tri_thu_ho_cod").value) || 0,
    loai_xe: document.getElementById("phuong_tien_giao_hang").value || "auto",
    che_do_giao_hang: getDeliveryMode(),
    pickup_lat: pickupPoint ? Number(pickupPoint.lat) : 0,
    pickup_lng: pickupPoint ? Number(pickupPoint.lng) : 0,
    delivery_lat: deliveryPoint ? Number(deliveryPoint.lat) : 0,
    delivery_lng: deliveryPoint ? Number(deliveryPoint.lng) : 0,
    ngay_lay_hang: pickupDateValue,
    khung_gio_lay_hang: (pickupSlot && pickupSlot.key) || document.getElementById("khung_gio_lay_hang").value || "",
    ten_khung_gio_lay_hang: (pickupSlot && pickupSlot.label) || "",
    gio_bat_dau_lay_hang: (pickupSlot && pickupSlot.start) || "",
    gio_ket_thuc_lay_hang: (pickupSlot && pickupSlot.end) || "",
    phi_khung_gio:
      (pickupSlot && pickupSlot.phicodinh) || 0,
    he_so_khung_gio:
      (pickupSlot && pickupSlot.heso) || 1,
    ngay_nhan_mong_muon: "",
    khung_gio_nhan_hang: "",
    ten_khung_gio_nhan_hang: "",
    gio_bat_dau_nhan_hang: "",
    gio_ket_thuc_nhan_hang: "",
    thoi_gian_xu_ly_phut: 0,
    ten_thoi_gian_xu_ly: isInstantMode ? "Điều phối realtime" : "",
    dieu_kien_dich_vu:
      (urgentCondition && urgentCondition.key) || "macdinh",
    ten_dieu_kien_dich_vu:
      (urgentCondition && urgentCondition.label) || "Bình thường",
  };
}

function updateStorageNote(services = []) {
  const panel = document.getElementById("bang_goi_y_luu_kho");
  if (!panel) return;
  panel.classList.add("is-hidden");
}

function getInstantTimeFeeLabel(service) {
  return "Phụ phí khung giờ";
}

function getInstantWeatherFeeLabel(service) {
  return "Phụ phí thời tiết";
}

// ========== SERVICE CARDS ==========
function renderServiceCards(options = {}) {
  const container = document.getElementById("danh_sach_dich_vu");
  const btn5 = document.getElementById("btn_buoc_4_sang_5");
  const etaPanel = document.getElementById("bang_thoi_gian_giao_du_kien");
  const isInstantMode = getDeliveryMode() === "instant";
  etaPanel.classList.add("is-hidden");
  document.getElementById("hien_thi_thoi_gian_giao_du_kien").textContent = "—";

  if (typeof window.calculateDomesticQuote !== "function") {
    container.innerHTML = `<div style="color:#ef4444;">Không tải được dữ liệu bảng giá.</div>`;
    return;
  }
  if (khoang_cach_km <= 0) {
    container.innerHTML = `<div style="color:#ef4444;">Chưa có khoảng cách. Vui lòng chọn địa chỉ ở Bước 1.</div>`;
    return;
  }

  container.innerHTML = `<div class="quote-loading"><i class="fas fa-spinner fa-spin"></i> Đang tính cước phí...</div>`;

  if (!options.skipWeatherFetch) {
    requestWeatherQuote();
  }

  const payload = tao_du_lieu_tinh_cuoc();
  const result = window.calculateDomesticQuote(payload);

  if (!result || !result.services || result.services.length === 0) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp.</div>`;
    return;
  }

  // Lấy gói cước được chọn từ Select Box
    const packageChoice = document.getElementById("goi_cuoc");
  const chosenType = packageChoice ? packageChoice.value : null;

  const filteredServices = result.services.filter((svc) =>
    isInstantMode
      ? svc.serviceType === "instant"
      : svc.serviceType === chosenType,
  );

  if (!filteredServices.length) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp với lựa chọn hiện tại.</div>`;
    selectedService = null;
    btn5.disabled = true;
    return;
  }

  // Luôn chọn đúng gói tương ứng với Select Box
  selectedService = filteredServices[0];
  updateStorageNote();
  syncUrgentConditionVisibility(selectedService && selectedService.serviceType);
  btn5.disabled = !selectedService;
  if (selectedService) {
    const pDate = document.getElementById("ngay_lay_hang").value;
    const pSlotObj = getSelectedPickupSlot();
    selectedService.estimate = calculateDynamicETA(
      pDate,
      pSlotObj ? pSlotObj.label : "",
      selectedService.serviceType
    );

    document.getElementById("hien_thi_thoi_gian_giao_du_kien").textContent =
      selectedService.estimate;
    etaPanel.classList.remove("is-hidden");
  }

  container.innerHTML = "";

  filteredServices.forEach((svc) => {
    const bd = svc.breakdown || {};
    const card = document.createElement("div");
    card.className =
      "service-card" +
      (selectedService && selectedService.serviceType === svc.serviceType
        ? " selected"
        : "");
    card.innerHTML = `
      <div class="service-card-top">
        <div class="service-name"><i class="fas fa-truck-fast"></i> ${svc.serviceName}</div>
        <div class="service-price">${svc.total.toLocaleString()} ₫</div>
      </div>
      <div class="service-card-meta">
        <div class="service-eta"><i class="far fa-clock"></i> Thời gian giao dự kiến: ${svc.estimate}</div>
        <div class="service-eta" style="color: #16a34a; font-weight: 700;">
          <i class="fas fa-shipping-fast"></i>
          <span>Gợi ý: ${svc.vehicleSuggestion || "Xe máy"}</span>
        </div>
        <div class="service-eta" style="color: #0a2a66; font-weight: 700;">
          <i class="fas fa-truck-ramp-box"></i> Đang tính giá: ${svc.selectedVehicleLabel || svc.vehicleSuggestion || "Xe máy"}${svc.vehicleMultiplier > 1 ? ` (x${svc.vehicleMultiplier})` : ""}
        </div>
      </div>
      <div class="service-breakdown">
        <div class="breakdown-row"><span>Phí vận chuyển</span><span>${(bd.basePrice || 0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí trọng lượng vượt mức</span><span>${(bd.overweightFee || 0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí thể tích</span><span>${(bd.volumeFee || 0).toLocaleString()} ₫</span></div>
        ${(bd.goodsFee || 0) > 0 ? `<div class="breakdown-row"><span>Phụ phí loại hàng</span><span>${bd.goodsFee.toLocaleString()} ₫</span></div>` : ""}
         <div class="breakdown-row">
           <span>${getInstantTimeFeeLabel(svc)}</span>
           <span>${formatMoneyVnd(bd.timeFee || 0)}</span>
         </div>
         <div class="breakdown-row">
           <span>${getInstantWeatherFeeLabel(svc)}</span>
           <span>${formatMoneyVnd(bd.conditionFee || 0)}</span>
         </div>
        ${(bd.vehicleFee || 0) > 0 ? `<div class="breakdown-row"><span>Điều chỉnh theo xe</span><span>${bd.vehicleFee.toLocaleString()} ₫</span></div>` : ""}
        ${(bd.codFee || 0) > 0 ? `<div class="breakdown-row"><span>Phí COD</span><span>${bd.codFee.toLocaleString()} ₫</span></div>` : ""}
        ${(bd.insuranceFee || 0) > 0 ? `<div class="breakdown-row"><span>Phí bảo hiểm</span><span>${bd.insuranceFee.toLocaleString()} ₫</span></div>` : ""}
        <div class="breakdown-row"><span>Tổng</span><span>${svc.total.toLocaleString()} ₫</span></div>
      </div>
    `;
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".service-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedService = svc;
      syncUrgentConditionVisibility(svc.serviceType);
      btn5.disabled = false;
      // Cập nhật ETA ở bước 3
      document.getElementById("hien_thi_thoi_gian_giao_du_kien").textContent = svc.estimate;
      etaPanel.classList.remove("is-hidden");
    });
    container.appendChild(card);
  });

  btn5.disabled = !selectedService;
  bindInfoToggleInteractions(container);
}

// ========== STEP NAVIGATION ==========
function chon_tuy_chon(groupId, btn) {
  document
    .querySelectorAll(`#${groupId} .option-btn`)
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const inputId =
    groupId === "nhom_nguoi_tra_cuoc" ? "nguoi_tra_cuoc" : "phuong_thuc_thanh_toan";
  document.getElementById(inputId).value = btn.dataset.val;
}

function chuyen_den_buoc(step) {
  if (step < 1 || step > 5) return;
  for (let i = 1; i <= 5; i++) {
    xoa_loi(i);
    document.getElementById(`buoc_${i}`).classList.toggle("active", i === step);
    const ind = document.getElementById(`chi_bao_buoc_${i}`);
    ind.className =
      "step-item" + (i < step ? " completed" : i === step ? " active" : "");
    if (i < step) {
      ind.querySelector(".step-circle").innerHTML = "✓";
    } else {
      ind.querySelector(".step-circle").textContent = i;
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function xac_thuc_buoc_1() {
  xoa_loi(1);
  const fields = [
    ["nguoi_gui_ho_ten", "Họ tên người gửi"],
    ["nguoi_gui_so_dien_thoai", "Số điện thoại người gửi"],
    ["nguoi_nhan_ho_ten", "Họ tên người nhận"],
    ["nguoi_nhan_so_dien_thoai", "Số điện thoại người nhận"],
    ["dia_chi_lay_hang", "Địa chỉ lấy hàng"],
    ["dia_chi_giao_hang", "Địa chỉ giao hàng"],
  ];
  for (const [id, label] of fields) {
    const val = document.getElementById(id).value.trim();
    if (!val) {
      hien_thi_loi(1, `Vui lòng điền: ${label}`);
      document.getElementById(id).focus();
      return false;
    }
    if (id.includes("so_dien_thoai") && !isValidPhone(val)) {
      hien_thi_loi(
        1,
        `${label} không đúng định dạng (10 số, bắt đầu bằng 03, 05, 07, 08, 09).`,
      );
      document.getElementById(id).focus();
      return false;
    }
  }
  if (!khoang_cach_km || khoang_cach_km <= 0) {
    hien_thi_loi(
      1,
      "Vui lòng xác định vị trí trên bản đồ bằng cách tìm kiếm địa chỉ hoặc kéo ghim.",
    );
    return false;
  }
  if (
    document.getElementById("dia_chi_lay_hang").value ===
    document.getElementById("dia_chi_giao_hang").value
  ) {
    hien_thi_loi(
      1,
      "Địa chỉ lấy hàng và địa chỉ giao hàng không được trùng nhau.",
    );
    return false;
  }
  return true;
}

function xac_thuc_buoc_2() {
  xoa_loi(2);
  if (orderItems.length === 0) {
    hien_thi_loi(2, "Vui lòng thêm ít nhất một món hàng.");
    return false;
  }
  for (let i = 0; i < orderItems.length; i++) {
    const it = orderItems[i];
    if (!it.loai_hang) {
      hien_thi_loi(2, `Vui lòng chọn loại hàng cho món hàng thứ ${i + 1}.`);
      return false;
    }
    if (!it.ten_hang) {
      hien_thi_loi(2, `Vui lòng chọn hoặc nhập tên cho món hàng thứ ${i + 1}.`);
      return false;
    }
    if ((it.so_luong || 0) <= 0) {
      hien_thi_loi(2, `Số lượng món hàng thứ ${i + 1} phải từ 1 trở lên.`);
      return false;
    }
    if (it.can_nang <= 0 || it.can_nang > 1000) {
      hien_thi_loi(
        2,
        `Trọng lượng món hàng thứ ${i + 1} phải từ 0.1kg đến 1000kg.`,
      );
      return false;
    }
    if (it.chieu_dai <= 0 || it.chieu_rong <= 0 || it.chieu_cao <= 0) {
      hien_thi_loi(2, `Kích thước món hàng thứ ${i + 1} phải > 0.`);
      return false;
    }
    if (it.gia_tri_khai_bao < 0) {
      hien_thi_loi(2, `Giá trị khai báo món hàng thứ ${i + 1} không được âm.`);
      return false;
    }
  }
  return true;
}

function xac_thuc_buoc_3() {
  xoa_loi(3);
  if (getDeliveryMode() === "instant") {
    if (!selectedService || selectedService.serviceType !== "instant") {
      hien_thi_loi(3, "Vui lòng chọn gói Giao Ngay Lập Tức để tiếp tục.");
      return false;
    }
    return true;
  }

  const pDateVal = document.getElementById("ngay_lay_hang").value;
  if (!pDateVal) {
    hien_thi_loi(3, "Vui lòng chọn ngày lấy hàng.");
    return false;
  }

  const todayDate = formatDateValue(getCurrentDateTime());
  if (pDateVal < todayDate) {
    hien_thi_loi(3, "Ngày lấy hàng không được ở trong quá khứ.");
    return false;
  }

  const pSlot = document.getElementById("khung_gio_lay_hang").value;
  if (!pSlot) {
    hien_thi_loi(3, "Vui lòng chọn khung giờ lấy hàng.");
    return false;
  }
  const pickupSlot = getSelectedPickupSlot();
  if (!pickupSlot) {
    hien_thi_loi(3, "Khung giờ lấy hàng không hợp lệ. Vui lòng chọn lại.");
    return false;
  }

  // Logic: Check if slot is in the past for TODAY
  if (pDateVal === todayDate) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = timeTextToMinutes(pickupSlot.end || "");

    if (endMinutes >= 0 && currentMinutes >= endMinutes) {
      hien_thi_loi(
        3,
        `Khung giờ ${pickupSlot.label} của ngày hôm nay đã trôi qua. Vui lòng chọn khung giờ khác.`,
      );
      return false;
    }
  }
  if (!selectedService) {
    hien_thi_loi(3, "Vui lòng chọn một gói cước vận chuyển.");
    return false;
  }
  return true;
}

function xac_thuc_buoc_4() {
  xoa_loi(4);
  return true;
}

// ========== FORMATTING ==========
function calculateDynamicETA(pickupDateStr, pickupSlotStr, serviceType) {
  if (!pickupDateStr) return "Chưa xác định ngày lấy hàng";
  
  const pickupAt = new Date(`${pickupDateStr}T12:00:00`);
  if (isNaN(pickupAt.getTime())) return "Chưa xác định ngày lấy hàng";

  if (serviceType === "instant") {
    return `Giao trong vòng 2 tiếng kể từ khung giờ lấy hàng ${pickupSlotStr || "đã chọn"}`;
  } else if (serviceType === "express") {
    const d1 = new Date(pickupAt); d1.setDate(d1.getDate() + 2);
    const d2 = new Date(pickupAt); d2.setDate(d2.getDate() + 3);
    return `Từ ngày ${formatDateToDDMMYYYY(d1.toISOString().split('T')[0])} đến ${formatDateToDDMMYYYY(d2.toISOString().split('T')[0])}`;
  } else if (serviceType === "fast") {
    const d1 = new Date(pickupAt); d1.setDate(d1.getDate() + 4);
    const d2 = new Date(pickupAt); d2.setDate(d2.getDate() + 5);
    return `Từ ngày ${formatDateToDDMMYYYY(d1.toISOString().split('T')[0])} đến ${formatDateToDDMMYYYY(d2.toISOString().split('T')[0])}`;
  } else {
    const d1 = new Date(pickupAt); d1.setDate(d1.getDate() + 7);
    return `Dự kiến giao ngày ${formatDateToDDMMYYYY(d1.toISOString().split('T')[0])}`;
  }
}

function formatDateToDDMMYYYY(dateString) {
  if (!dateString) return "—";
  const parts = String(dateString).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

// ========== REVIEW ==========
function chuan_bi_xac_nhan() {
  if (!selectedService) return;
  const payload = tao_du_lieu_gui();

  document.getElementById("xac_nhan_nguoi_gui").textContent =
    `${document.getElementById("nguoi_gui_ho_ten").value} — ${document.getElementById("nguoi_gui_so_dien_thoai").value}`;
  document.getElementById("xac_nhan_nguoi_nhan").textContent =
    `${document.getElementById("nguoi_nhan_ho_ten").value} — ${document.getElementById("nguoi_nhan_so_dien_thoai").value}`;
  document.getElementById("xac_nhan_dia_chi_lay_hang").textContent =
    document.getElementById("dia_chi_lay_hang").value || "—";
  document.getElementById("xac_nhan_dia_chi_giao_hang").textContent =
    document.getElementById("dia_chi_giao_hang").value || "—";
  document.getElementById("xac_nhan_khoang_cach").textContent =
    `${khoang_cach_km.toFixed(2)} km`;

  // Items List (Phần 5: Hiển thị hàng hóa rõ ràng)
  const list = document.getElementById("xac_nhan_danh_sach_hang_hoa");
  list.innerHTML = "";
  orderItems.forEach((it, idx) => {
    const div = document.createElement("div");
    div.style.cssText =
      "background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;";
    div.innerHTML = `
      <div style="width: 40px; height: 40px; background: #f0f9ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #0a2a66;">
        <i class="fas fa-box"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 800; color: #1e293b; font-size: 14px;">${escapeHtml(it.ten_hang || "Hàng hóa #" + (idx + 1))}</div>
        <div style="font-size: 12px; color: #64748b;">
          Loại: <strong>${escapeHtml(ITEM_TYPE_LABELS[it.loai_hang] || it.loai_hang)}</strong> • Số lượng: <strong>${it.so_luong || 1}</strong> • Nặng: <strong>${it.can_nang}kg/kiện</strong> • Khai giá: <strong>${it.gia_tri_khai_bao.toLocaleString()}₫</strong>
        </div>
      </div>
      <div style="font-size: 11px; color: #94a3b8; text-align: right;">
        Kích thước:<br>${it.chieu_dai}x${it.chieu_rong}x${it.chieu_cao}cm
      </div>
    `;
    list.appendChild(div);
  });

  document.getElementById("xac_nhan_gia_tri_thu_ho_cod").textContent = payload.gia_tri_thu_ho_cod
    ? `${payload.gia_tri_thu_ho_cod.toLocaleString()} ₫`
    : "Không có";
  document.getElementById("xac_nhan_ghi_chu_tai_xe").textContent =
    document.getElementById("ghi_chu_tai_xe").value || "Không có";
  hien_thi_tai_len_xac_nhan();

  // Lịch trình (Phần 3: Thời gian và khoảng thời gian)
  const pDate = document.getElementById("ngay_lay_hang").value;
  const pSlot = getSelectedPickupSlot();
  const urgentCondition = getSelectedUrgentCondition();
  document.getElementById("xac_nhan_thoi_gian_lay_hang").textContent =
    `${formatDateToDDMMYYYY(pDate)} | ${(pSlot && pSlot.label) || "—"}`;
  document.getElementById("xac_nhan_thoi_gian_giao_du_kien").textContent = selectedService.estimate;

  // Giá & Phương tiện (Phần 4: Phương tiện)
  const bd = selectedService.breakdown || {};
  const rvPrice = document.getElementById("xac_nhan_chi_tiet_gia");
  rvPrice.innerHTML = `
    <div class="rv-row"><span class="rv-label">Gói dịch vụ:</span><span class="rv-val" style="color:#ff7a00; font-weight:800;">${selectedService.serviceName}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện gợi ý:</span><span class="rv-val">${selectedService.vehicleSuggestion || "Xe máy"}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện đang tính giá:</span><span class="rv-val">${selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion || "Xe máy"}</span></div>
    <div class="rv-row"><span class="rv-label">Điều kiện giao đang áp dụng:</span><span class="rv-val">${selectedService.serviceConditionLabel || (urgentCondition && urgentCondition.label) || "Điều kiện bình thường"}</span></div>
    <div class="rv-row"><span class="rv-label">Phí vận chuyển:</span><span class="rv-val">${(bd.basePrice || 0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí trọng lượng vượt mức:</span><span class="rv-val">${(bd.overweightFee || 0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí thể tích:</span><span class="rv-val">${(bd.volumeFee || 0).toLocaleString()} ₫</span></div>
    ${(bd.goodsFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phụ phí loại hàng:</span><span class="rv-val">${bd.goodsFee.toLocaleString()} ₫</span></div>` : ""}
    <div class="rv-row"><span class="rv-label">Phụ phí khung giờ:</span><span class="rv-val">${formatMoneyVnd(bd.timeFee || 0)}</span></div>
    <div class="rv-row"><span class="rv-label">Phụ phí thời tiết:</span><span class="rv-val">${formatMoneyVnd(bd.conditionFee || 0)}</span></div>
    ${(bd.vehicleFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Điều chỉnh theo xe:</span><span class="rv-val">${bd.vehicleFee.toLocaleString()} ₫</span></div>` : ""}
    ${(bd.codFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phí COD:</span><span class="rv-val">${bd.codFee.toLocaleString()} ₫</span></div>` : ""}
    ${(bd.insuranceFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phí bảo hiểm:</span><span class="rv-val">${bd.insuranceFee.toLocaleString()} ₫</span></div>` : ""}
    <div class="rv-row" style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
      <span class="rv-label">Người trả cước:</span><span class="rv-val">${document.getElementById("nguoi_tra_cuoc").value === "gui" ? "Người gửi" : "Người nhận"}</span>
    </div>
    <div class="rv-row"><span class="rv-label">Thanh toán:</span><span class="rv-val">${document.getElementById("phuong_thuc_thanh_toan").value === "tien_mat" ? "Tiền mặt" : "Chuyển khoản"}</span></div>
  `;
  document.getElementById("xac_nhan_tong_thanh_toan").textContent =
    `${selectedService.total.toLocaleString()} ₫`;
}

// ========== UPLOAD ==========
function getSelectedUploadFiles() {
  return [
    {
      type: "image",
      file: document.getElementById("hinh_anh_hang_hoa")?.files?.[0] || null,
    },
    {
      type: "video",
      file: document.getElementById("video_hang_hoa")?.files?.[0] || null,
    },
  ].filter((entry) => entry.file);
}

function clearReviewUploadObjectUrls() {
  reviewUploadObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Không thể giải phóng URL tạm của media:", error);
    }
  });
  reviewUploadObjectUrls = [];
}

function hien_thi_tai_len_xac_nhan() {
  const host = document.getElementById("xac_nhan_danh_sach_media");
  const empty = document.getElementById("xac_nhan_media_trong");
  if (!host || !empty) return;

  clearReviewUploadObjectUrls();
  host.innerHTML = "";

  const uploads = getSelectedUploadFiles();
  if (!uploads.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  uploads.forEach((entry) => {
    const objectUrl = URL.createObjectURL(entry.file);
    reviewUploadObjectUrls.push(objectUrl);

    const card = document.createElement("article");
    card.className = "review-upload-card";
    card.innerHTML =
      entry.type === "video"
        ? `
          <video class="review-upload-thumb" controls preload="metadata" src="${objectUrl}"></video>
          <div class="review-upload-meta">
            <strong>${escapeHtml(entry.file.name)}</strong>
            <span>Video • ${Math.round(entry.file.size / 1024)} KB</span>
          </div>
        `
        : `
          <img class="review-upload-thumb" src="${objectUrl}" alt="${escapeHtml(entry.file.name)}" />
          <div class="review-upload-meta">
            <strong>${escapeHtml(entry.file.name)}</strong>
            <span>Ảnh • ${Math.round(entry.file.size / 1024)} KB</span>
          </div>
        `;
    host.appendChild(card);
  });
}

function renderSubmitSuccessState(orderCode, messageHtml) {
  clearPendingBookingDraft();
  const isLoggedIn = !!window.isLoggedIn;
  const secondaryAction = isLoggedIn
    ? `
      <a
        href="${resolveProjectHtmlUrl("public/khach-hang/dashboard.html")}"
        class="btn-secondary"
        style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:180px;"
      >Vào trang quản lý</a>
    `
    : `
      <a
        href="${resolveProjectHtmlUrl("tra-don-hang.html")}"
        class="btn-secondary"
        style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:180px;"
      >Tra cứu đơn hàng</a>
    `;

  const container = document.getElementById("buoc_5");
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px;">
        <i class="fas fa-check-circle"></i>
      </div>
      <h2 style="color: #1e293b; font-weight: 800; margin-bottom: 12px;">Đặt đơn hàng thành công!</h2>
      <p style="color: #64748b; margin-bottom: 16px;">Mã đơn hàng: <strong style="color: #0a2a66;">${orderCode || "GHN-XXXX"}</strong>.</p>
      <p style="color: #64748b; margin-bottom: 32px;">${messageHtml}</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a
          href="${resolveProjectHtmlUrl("dat-lich-giao-hang-nhanh.html")}"
          class="btn-primary"
          style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:180px;"
        >Tạo đơn mới</a>
        ${secondaryAction}
      </div>
    </div>
  `;
}

function getServiceStorageValue(serviceType) {
  const normalized = String(serviceType || "").toLowerCase();
  if (normalized === "instant") return "giao_ngay_lap_tuc";
  if (normalized === "express") return "giao_hoa_toc";
  if (normalized === "fast") return "giao_nhanh";
  if (normalized === "standard") return "giao_tieu_chuan";
  return normalized;
}

function getInternalServiceType(serviceValue) {
  const normalized = String(serviceValue || "").toLowerCase();
  if (normalized === "giao_ngay_lap_tuc") return "instant";
  if (normalized === "giao_hoa_toc") return "express";
  if (normalized === "giao_nhanh") return "fast";
  if (normalized === "giao_tieu_chuan") return "standard";
  return normalized;
}

function getWeatherSourceStorageValue(source) {
  const normalized = String(source || "").toLowerCase();
  if (!normalized) return "";
  if (normalized === "fallback") return "du_lieu_tam_tinh";
  if (normalized === "openmeteo_hourly") return "du_lieu_thoi_tiet_theo_gio";
  if (normalized === "openmeteo_current") return "du_lieu_thoi_tiet_hien_tai";
  if (normalized === "openweather_forecast") return "du_lieu_du_bao_thoi_tiet";
  if (normalized === "openweather_current") return "du_lieu_thoi_tiet_hien_tai";
  if (normalized.startsWith("du_lieu_")) return normalized;
  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function tao_chi_tiet_gia_cuoc_de_luu_tru(breakdown = {}) {
  return {
    gia_co_ban: Number(breakdown.basePrice || 0),
    phu_phi_qua_can: Number(breakdown.overweightFee || 0),
    phi_the_tich: Number(breakdown.volumeFee || 0),
    phi_trong_luong: Number(breakdown.weightFee || 0),
    phu_phi_loai_hang: Number(breakdown.goodsFee || 0),
    phu_phi_khung_gio: Number(breakdown.timeFee || 0),
    phu_phi_thoi_tiet: Number(breakdown.conditionFee || 0),
    phu_phi_dich_vu: Number(breakdown.serviceFee || 0),
    ma_khung_gio: String(breakdown.timeSurchargeKey || ""),
    ten_khung_gio: String(breakdown.timeSurchargeLabel || ""),
    ma_dieu_kien_thoi_tiet: String(breakdown.conditionSurchargeKey || ""),
    ten_dieu_kien_thoi_tiet: String(breakdown.conditionSurchargeLabel || ""),
    phi_cod: Number(breakdown.codFee || 0),
    phi_bao_hiem: Number(breakdown.insuranceFee || 0),
    dieu_chinh_theo_xe: Number(breakdown.vehicleFee || 0),
    can_nang_thuc_te: Number(breakdown.actualWeight || 0),
    can_nang_quy_doi: Number(breakdown.volumetricWeight || 0),
    can_nang_tinh_cuoc: Number(breakdown.billableWeight || 0),
    can_nang_tinh_cuoc_moi_kien: Number(
      breakdown.billableWeightPerPackage || 0,
    ),
    phi_khoi_luong_kich_thuoc: Number(breakdown.weightSizeFee || 0),
    tong_phu_phi_loai_hang: Number(breakdown.goodsGroupFee || 0),
    tong_phu_phi_dich_vu: Number(breakdown.serviceGroupFee || 0),
    da_bao_gom_phi_khung_gio: Boolean(breakdown.includesTimeFee),
    da_bao_gom_dieu_chinh_theo_xe: Boolean(breakdown.includesVehicleFee),
  };
}

function chuan_hoa_chi_tiet_gia_cuoc_da_luu(chiTiet = {}) {
  return {
    basePrice: Number(chiTiet.gia_co_ban || 0),
    overweightFee: Number(chiTiet.phu_phi_qua_can || 0),
    volumeFee: Number(chiTiet.phi_the_tich || 0),
    weightFee: Number(chiTiet.phi_trong_luong || 0),
    goodsFee: Number(chiTiet.phu_phi_loai_hang || 0),
    timeFee: Number(chiTiet.phu_phi_khung_gio || 0),
    conditionFee: Number(chiTiet.phu_phi_thoi_tiet || 0),
    serviceFee: Number(chiTiet.phu_phi_dich_vu || 0),
    timeSurchargeKey: String(chiTiet.ma_khung_gio || ""),
    timeSurchargeLabel: String(chiTiet.ten_khung_gio || ""),
    conditionSurchargeKey: String(chiTiet.ma_dieu_kien_thoi_tiet || ""),
    conditionSurchargeLabel: String(chiTiet.ten_dieu_kien_thoi_tiet || ""),
    codFee: Number(chiTiet.phi_cod || 0),
    insuranceFee: Number(chiTiet.phi_bao_hiem || 0),
    vehicleFee: Number(chiTiet.dieu_chinh_theo_xe || 0),
    actualWeight: Number(chiTiet.can_nang_thuc_te || 0),
    volumetricWeight: Number(chiTiet.can_nang_quy_doi || 0),
    billableWeight: Number(chiTiet.can_nang_tinh_cuoc || 0),
    billableWeightPerPackage: Number(
      chiTiet.can_nang_tinh_cuoc_moi_kien || 0,
    ),
    weightSizeFee: Number(chiTiet.phi_khoi_luong_kich_thuoc || 0),
    goodsGroupFee: Number(chiTiet.tong_phu_phi_loai_hang || 0),
    serviceGroupFee: Number(chiTiet.tong_phu_phi_dich_vu || 0),
    includesTimeFee: Boolean(chiTiet.da_bao_gom_phi_khung_gio),
    includesVehicleFee: Boolean(chiTiet.da_bao_gom_dieu_chinh_theo_xe),
  };
}

function xem_truoc_tai_len(type) {
  const inputId = type === "video" ? "video_hang_hoa" : "hinh_anh_hang_hoa";
  const previewId = type === "video" ? "xem_truoc_video_hang_hoa" : "xem_truoc_anh_hang_hoa";
  const metaId = type === "video" ? "thong_tin_tai_len_video" : "thong_tin_tai_len_anh";
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const preview = document.getElementById(previewId);
  document.getElementById(metaId).textContent =
    `${file.name} • ${Math.round(file.size / 1024)} KB`;

  if (type === "video") {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);

  if (lay_buoc_hien_tai() >= 5) {
    hien_thi_tai_len_xac_nhan();
  }
}

// ========== SUBMIT ==========
async function gui_don_hang() {
  const btn = document.getElementById("btn_gui_don_hang");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý...`;

  const payload = tao_du_lieu_gui();
  const internalOrderCode = buildGeneratedOrderCode();
  xoa_loi(5);

  try {
    const crudResult = await insertBookingWithCrud(payload, internalOrderCode);
    const localDetail = buildLocalOrderDetail(payload, internalOrderCode);
    const returnedRecordId = extractCrudInsertOrderIdentifier(crudResult);
    if (returnedRecordId) {
      localDetail.order.remote_id = returnedRecordId;
    }
    const savedLocally = persistLocalCustomerOrder(localDetail);
    if (!savedLocally) {
      console.warn(
        "Không thể lưu bản sao đơn hàng vào bộ nhớ tạm của trình duyệt sau khi tạo đơn.",
      );
    }

    renderSubmitSuccessState(
      localDetail.order.order_code || internalOrderCode || "GHN-XXXX",
      !!window.isLoggedIn
        ? "Đơn hàng đã được tạo thành công. Bạn có thể theo dõi đơn ngay trong tài khoản của mình."
        : "Đơn hàng đã được tạo thành công. Hãy lưu lại mã đơn để tra cứu sau.",
    );
  } catch (error) {
    console.error(error);
    hien_thi_loi(
      5,
      error.message ||
        "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.",
    );
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function tao_du_lieu_gui() {
  const quotePayload = tao_du_lieu_tinh_cuoc();
  const serviceType = selectedService.serviceType;
  const chiTietGiaCuoc = tao_chi_tiet_gia_cuoc_de_luu_tru(
    selectedService.breakdown || {},
  );
  const nguoi_gui_ho_ten = document.getElementById("nguoi_gui_ho_ten").value;
  const nguoi_gui_so_dien_thoai = document.getElementById("nguoi_gui_so_dien_thoai").value;
  const nguoi_nhan_ho_ten = document.getElementById("nguoi_nhan_ho_ten").value;
  const nguoi_nhan_so_dien_thoai = document.getElementById("nguoi_nhan_so_dien_thoai").value;
  const dia_chi_lay_hang = document.getElementById("dia_chi_lay_hang").value;
  const dia_chi_giao_hang = document.getElementById("dia_chi_giao_hang").value;
  const ghi_chu_tai_xe = document.getElementById("ghi_chu_tai_xe").value;
  const gia_tri_thu_ho_cod =
    parseFloat(document.getElementById("gia_tri_thu_ho_cod").value) || 0;
  const phuong_thuc_thanh_toan =
    document.getElementById("phuong_thuc_thanh_toan").value;
  const nguoi_tra_cuoc = document.getElementById("nguoi_tra_cuoc").value;
  return {
    nguoi_gui_ho_ten,
    nguoi_gui_so_dien_thoai,
    nguoi_nhan_ho_ten,
    nguoi_nhan_so_dien_thoai,
    dia_chi_lay_hang,
    dia_chi_giao_hang,
    ngay_lay_hang: quotePayload.ngay_lay_hang || "",
    khung_gio_lay_hang: quotePayload.khung_gio_lay_hang || "",
    ten_khung_gio_lay_hang: quotePayload.ten_khung_gio_lay_hang || "",
    du_kien_giao_hang: selectedService.estimate,
    ghi_chu_tai_xe,
    gia_tri_thu_ho_cod,
    phuong_thuc_thanh_toan,
    nguoi_tra_cuoc,
    dich_vu: getServiceStorageValue(serviceType),
    ten_dich_vu: selectedService.serviceName,
    phuong_tien: selectedService.selectedVehicleKey || "",
    ten_phuong_tien:
      selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion,
    tong_cuoc: selectedService.total,
    chi_tiet_gia_cuoc: chiTietGiaCuoc,
    vi_do_lay_hang: quotePayload.pickup_lat || 0,
    kinh_do_lay_hang: quotePayload.pickup_lng || 0,
    vi_do_giao_hang: quotePayload.delivery_lat || 0,
    kinh_do_giao_hang: quotePayload.delivery_lng || 0,
    khoang_cach_km: khoang_cach_km,
    mat_hang: orderItems,
  };
}
