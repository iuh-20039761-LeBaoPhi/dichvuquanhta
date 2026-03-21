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

function resolveBookingApiUrl(path = "dat-lich-ajax.php") {
  if (typeof window === "undefined") return path;
  if (window.GiaoHangNhanhCore?.toApiUrl) {
    return window.GiaoHangNhanhCore.toApiUrl(path);
  }

  const normalized = String(path || "").replace(/^\.?\//, "");
  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const marker = "/giao-hang-nhanh/";
  const markerIndex = currentPath.toLowerCase().lastIndexOf(marker);
  if (markerIndex !== -1) {
    const projectBasePath = currentPath.slice(0, markerIndex + marker.length);
    return new URL(`public/${normalized}`, `${window.location.origin}${projectBasePath}`).toString();
  }

  return new URL(normalized, window.location.href).toString();
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

function getProjectRelativeCurrentUrl() {
  if (typeof window === "undefined") return "";
  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const marker = "/giao-hang-nhanh/";
  const markerIndex = currentPath.toLowerCase().lastIndexOf(marker);
  const relativePath =
    markerIndex !== -1
      ? currentPath.slice(markerIndex + marker.length)
      : currentPath.replace(/^\/+/, "");
  return `${relativePath}${window.location.search || ""}${window.location.hash || ""}`;
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

function savePendingBookingDraft(payload = buildPayload()) {
  if (!canUseSessionStorage()) return false;
  try {
    const draft = {
      saved_at: Date.now(),
      current_step: getCurrentStep(),
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
      "Hang co gia tri khai bao tren 1.000.000d se tinh phi bao hiem 0,5%, toi thieu 5.000d.",
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
const DELIVERY_SLOT_OPTIONS = Array.isArray(ORDER_FORM_CONFIG.khunggionhanhang)
  ? ORDER_FORM_CONFIG.khunggionhanhang
  : [];
const DECLARED_VALUE_HELP =
  ORDER_FORM_CONFIG.huongdankhaibao ||
  "Hang co gia tri khai bao tren 1.000.000d se tinh phi bao hiem 0,5%, toi thieu 5.000d.";
const DEFAULT_URGENT_CONDITION = {
  key: "macdinh",
  label: "Bình thường",
};

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  weatherQuoteState = createDefaultWeatherQuoteState();
  initMap();
  initAddressSearch("search-pickup", "sug-pickup", "pickup");
  initAddressSearch("search-delivery", "sug-delivery", "delivery");
  initPickupSlotOptions();
  initUrgentConditionOptions();
  initDeliverySlotOptions();
  initVehicleOptions();
  initDeliveryModeControls();

  renderItems();
  document.getElementById("btn-add-item").addEventListener("click", addItem);
  document.getElementById("cod-value").addEventListener("input", () => {
    renderItems();
    if (getCurrentStep() >= 3) renderServiceCards();
  });

  // Default date = today
  const today = formatDateValue(getCurrentDateTime());
  document.getElementById("pickup-date").value = today;
  document.getElementById("delivery-date").value = today;
  syncDesiredDeliveryWindow();
  updateDesiredDeliveryHint();
  updateScheduleTimingPanel();
  document.getElementById("vehicle-choice").addEventListener("change", () => {
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("pickup-date").addEventListener("change", () => {
    syncDesiredDeliveryWindow();
    updateScheduleTimingPanel();
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("pickup-slot").addEventListener("change", () => {
    syncDesiredDeliveryWindow();
    syncUrgentConditionVisibility(selectedService && selectedService.serviceType);
    updateScheduleTimingPanel();
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("delivery-date").addEventListener("change", () => {
    syncDesiredDeliveryWindow();
    updateScheduleTimingPanel();
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("delivery-slot").addEventListener("change", () => {
    syncDesiredDeliveryWindow();
    syncUrgentConditionVisibility(selectedService && selectedService.serviceType);
    updateScheduleTimingPanel();
    if (getCurrentStep() >= 3) renderServiceCards();
  });

  document
    .getElementById("btn-1-to-2")
    .addEventListener("click", () => validateStep1() && goToStep(2));
  document.getElementById("btn-2-to-3").addEventListener("click", () => {
    if (validateStep2()) {
      renderServiceCards();
      goToStep(3);
    }
  });
  document.getElementById("btn-3-to-4").addEventListener("click", () => {
    if (validateStep3()) {
      goToStep(4);
    }
  });
  document.getElementById("btn-4-to-5").addEventListener("click", () => {
    if (validateStep4()) {
      prepareReview();
      goToStep(5);
    }
  });

  // Make indicators clickable for already completed steps
  document.querySelectorAll(".step-item").forEach((item, idx) => {
    item.addEventListener("click", () => {
      const step = idx + 1;
      const currentStep = getCurrentStep();
      if (step < currentStep) {
        goToStep(step);
      } else if (step > currentStep) {
        // Try to jump forward: must validate all steps in between
        let ok = true;
        for (let s = currentStep; s < step; s++) {
          if (s === 1 && !validateStep1()) {
            ok = false;
            break;
          }
          if (s === 2 && !validateStep2()) {
            ok = false;
            break;
          }
          if (s === 3 && !validateStep3()) {
            ok = false;
            break;
          }
          if (s === 4 && !validateStep4()) {
            ok = false;
            break;
          }
        }
        if (ok) {
          if (step === 3) renderServiceCards();
          if (step === 5) prepareReview();
          goToStep(step);
        }
      }
    });
    item.style.cursor = "pointer";
  });

  (async () => {
    await initCustomerPrefill();
    await initReorderPrefill();
    await restorePendingBookingDraft();
  })();
  setDeliveryMode("scheduled", { render: false });
});

function getCurrentStep() {
  for (let i = 1; i <= 5; i++) {
    if (document.getElementById(`step-${i}`).classList.contains("active"))
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
      "OpenWeatherMap sẽ được dùng nếu đã cấu hình API key. Nếu chưa có dữ liệu, điều phối sẽ xác nhận khi cần.",
    source: "fallback",
    checkedAt: "",
    effectiveAt: "",
    isFallback: true,
  };
}

function getDeliveryMode() {
  return deliveryMode || "scheduled";
}

function initDeliveryModeControls() {
  document
    .querySelectorAll("#delivery-mode-group .option-btn[data-mode]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        setDeliveryMode(button.dataset.mode || "scheduled");
      });
    });
}

function setDeliveryMode(mode, options = {}) {
  const nextMode = mode === "instant" ? "instant" : "scheduled";
  const shouldRender = options.render !== false;
  deliveryMode = nextMode;

  const hiddenInput = document.getElementById("delivery-mode-val");
  if (hiddenInput) hiddenInput.value = nextMode;

  document
    .querySelectorAll("#delivery-mode-group .option-btn[data-mode]")
    .forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === nextMode);
    });

  const scheduledFlow = document.getElementById("scheduled-flow");
  const instantFlow = document.getElementById("instant-flow");
  if (scheduledFlow) scheduledFlow.classList.toggle("is-hidden", nextMode !== "scheduled");
  if (instantFlow) instantFlow.classList.toggle("is-hidden", nextMode !== "instant");

  if (nextMode === "instant") {
    applyImmediateScheduleDefaults();
    requestWeatherQuote();
  } else {
    weatherQuoteState = createDefaultWeatherQuoteState();
  }

  const currentType = selectedService && selectedService.serviceType;
  if (
    currentType &&
    ((nextMode === "scheduled" && currentType === "instant") ||
      (nextMode === "instant" && currentType !== "instant"))
  ) {
    selectedService = null;
  }

  syncDesiredDeliveryWindow();
  updateDesiredDeliveryHint();
  updateScheduleTimingPanel();
  updateInstantRealtimePanel();
  syncUrgentConditionVisibility(selectedService && selectedService.serviceType);

  if (shouldRender && getCurrentStep() >= 3) {
    renderServiceCards();
  }
}

function getPickupSlotOptions() {
  return PICKUP_SLOT_OPTIONS;
}

function getDeliverySlotOptions() {
  return DELIVERY_SLOT_OPTIONS;
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

function parseEstimateToHours(estimateText) {
  const text = String(estimateText || "")
    .trim()
    .toLowerCase();
  if (!text) return { minHours: 0, maxHours: 0 };
  const rangeMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(phút|phut|p|giờ|gio|h|ngày|ngay|d)/i,
  );
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(",", "."));
    const max = parseFloat(rangeMatch[2].replace(",", "."));
    const multiplier = /ngày|ngay|d/i.test(rangeMatch[3])
      ? 24
      : /phút|phut|p/i.test(rangeMatch[3])
        ? 1 / 60
        : 1;
    return { minHours: min * multiplier, maxHours: max * multiplier };
  }
  const singleMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(phút|phut|p|giờ|gio|h|ngày|ngay|d)/i,
  );
  if (singleMatch) {
    const value = parseFloat(singleMatch[1].replace(",", "."));
    const multiplier = /ngày|ngay|d/i.test(singleMatch[2])
      ? 24
      : /phút|phut|p/i.test(singleMatch[2])
        ? 1 / 60
        : 1;
    return { minHours: value * multiplier, maxHours: value * multiplier };
  }
  return { minHours: 0, maxHours: 0 };
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

function findDeliverySlotByMinuteTarget(targetMinutes) {
  const options = getDeliverySlotOptions();
  if (!options.length) return null;
  return (
    options.find((slot) => timeTextToMinutes(slot.end) >= targetMinutes) ||
    options[options.length - 1]
  );
}

function applyImmediateScheduleDefaults() {
  const now = getCurrentDateTime();
  const pickupDateInput = document.getElementById("pickup-date");
  const pickupSlotSelect = document.getElementById("pickup-slot");
  const deliveryDateInput = document.getElementById("delivery-date");
  const deliverySlotSelect = document.getElementById("delivery-slot");
  const instantWindow = getInstantPricingWindow(now);

  if (pickupDateInput) pickupDateInput.value = formatDateValue(now);
  if (pickupSlotSelect && instantWindow) pickupSlotSelect.value = instantWindow.key;
  if (deliveryDateInput) deliveryDateInput.value = formatDateValue(now);

  const defaultDeliveryTargetMinutes = now.getHours() * 60 + now.getMinutes() + 120;
  const deliverySlot = findDeliverySlotByMinuteTarget(defaultDeliveryTargetMinutes);
  if (deliverySlotSelect && deliverySlot) {
    deliverySlotSelect.value = deliverySlot.key;
  }
}

function formatScheduleDuration(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes || 0));
  const days = Math.floor(safeMinutes / 1440);
  const hours = Math.floor((safeMinutes % 1440) / 60);
  const minutes = safeMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} ngày`);
  if (hours) parts.push(`${hours} giờ`);
  if (minutes || !parts.length) parts.push(`${minutes} phút`);
  return parts.join(" ");
}

function getScheduleTimingInfo() {
  if (getDeliveryMode() !== "scheduled") return null;
  const pickupDate = document.getElementById("pickup-date")?.value || "";
  const deliveryDate = document.getElementById("delivery-date")?.value || "";
  const pickupSlot = getSelectedPickupSlot();
  const deliverySlot = getSelectedDeliverySlot();
  if (!pickupDate || !deliveryDate || !pickupSlot || !deliverySlot) return null;

  const pickupAt = new Date(`${pickupDate}T${pickupSlot.start}`);
  const deliveryAt = new Date(`${deliveryDate}T${deliverySlot.end}`);
  if (
    Number.isNaN(pickupAt.getTime()) ||
    Number.isNaN(deliveryAt.getTime()) ||
    deliveryAt < pickupAt
  ) {
    return null;
  }

  const totalMinutes = Math.round(
    (deliveryAt.getTime() - pickupAt.getTime()) / (60 * 1000),
  );
  return {
    pickupAt,
    deliveryAt,
    totalMinutes,
    durationText: formatScheduleDuration(totalMinutes),
  };
}

function updateScheduleTimingPanel() {
  const panel = document.getElementById("turnaround-panel");
  const display = document.getElementById("turnaround-display");
  const hint = document.getElementById("turnaround-hint");
  if (!panel || !display || !hint) return;

  if (getDeliveryMode() !== "scheduled") {
    panel.classList.add("is-hidden");
    return;
  }

  const info = getScheduleTimingInfo();
  if (!info) {
    panel.classList.add("is-hidden");
    display.textContent = "—";
    hint.textContent =
      "Hệ thống tính từ đầu khung lấy hàng đến cuối khung nhận mong muốn để đối chiếu thời gian giao dự kiến.";
    return;
  }
  display.textContent = info.durationText;
  hint.textContent =
    "Khoảng này được dùng để đối chiếu thời gian giao dự kiến; hệ thống sẽ vô hiệu hóa các gói không thể giao kịp mốc nhận mong muốn.";
  panel.classList.remove("is-hidden");
}

function initPickupSlotOptions() {
  const select = document.getElementById("pickup-slot");
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

function initDeliverySlotOptions() {
  const select = document.getElementById("delivery-slot");
  if (!select) return;
  const options = getDeliverySlotOptions();
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
  const select = document.getElementById("vehicle-choice");
  if (!select || !VEHICLE_OPTIONS.length) return;
  select.innerHTML = VEHICLE_OPTIONS.map((option, index) => {
    const selectedAttr = index === 0 ? " selected" : "";
    return `<option value="${option.key}"${selectedAttr}>${option.label}</option>`;
  }).join("");
}

function getSelectedPickupSlot() {
  const select = document.getElementById("pickup-slot");
  if (!select) return null;
  const options = getPickupSlotOptions();
  const selected = options.find((slot) => slot.key === select.value);
  return selected || null;
}

function getSelectedDeliverySlot() {
  const select = document.getElementById("delivery-slot");
  if (!select) return null;
  const options = getDeliverySlotOptions();
  const selected = options.find((slot) => slot.key === select.value);
  return selected || null;
}

function getSelectedUrgentCondition() {
  if (getDeliveryMode() !== "instant") return DEFAULT_URGENT_CONDITION;
  return {
    key: weatherQuoteState?.conditionKey || "macdinh",
    label: weatherQuoteState?.conditionLabel || "Thời tiết bình thường",
  };
}

function syncUrgentConditionVisibility(serviceType) {
  const panel = document.getElementById("weather-surcharge-panel");
  if (!panel) return;
  const isInstantMode = getDeliveryMode() === "instant";
  panel.classList.toggle("is-hidden", !isInstantMode);
  updateWeatherSurchargePanel(serviceType);
}

function updateWeatherSurchargePanel(serviceType) {
  const desc = document.getElementById("weather-surcharge-desc");
  const badge = document.getElementById("weather-surcharge-badge");
  const meta = document.getElementById("weather-surcharge-meta");
  const hint = document.getElementById("weather-surcharge-hint");
  if (!desc || !badge || !meta || !hint) return;

  if (getDeliveryMode() !== "instant") {
    desc.textContent =
      "Phần phụ phí thời tiết chỉ mở khi bạn dùng Giao Ngay Lập Tức.";
    badge.textContent = "Không áp dụng";
    badge.className = "weather-surcharge-badge is-muted";
    meta.textContent =
      "Đặt lịch thường không tự cộng phụ phí thời tiết ở bước báo giá.";
    hint.textContent =
      "Giá đang hiển thị là tham khảo. Nếu có phát sinh điều kiện đặc biệt ngoài thực tế, điều phối sẽ xác nhận riêng.";
    return;
  }

  if (weatherQuoteState?.isLoading) {
    desc.textContent =
      "Hệ thống đang kiểm tra thời tiết tại điểm lấy hàng theo thời gian hiện tại.";
    badge.textContent = "Đang kiểm tra";
    badge.className = "weather-surcharge-badge";
    meta.textContent =
      "Đang lấy dữ liệu OpenWeatherMap để xác định phụ phí thời tiết.";
    hint.textContent =
      "Khách hàng không cần chọn tay. Nếu chưa có kết quả, giá đang tạm tính theo điều kiện bình thường và chỉ mang tính tham khảo.";
    return;
  }

  const conditionLabel =
    weatherQuoteState?.conditionLabel || "Chưa phát sinh phụ phí thời tiết";
  const sourceLabel =
    weatherQuoteState?.source === "openweather_forecast"
      ? "Dữ liệu dự báo thời tiết"
      : weatherQuoteState?.source === "openweather_current"
        ? "Dữ liệu thời tiết hiện tại"
        : "Dữ liệu tạm tính nội bộ";
  const hasSurcharge =
    weatherQuoteState &&
    weatherQuoteState.conditionKey &&
    weatherQuoteState.conditionKey !== "macdinh";
  const isFallback = !!weatherQuoteState?.isFallback;
  const conditionFee = Number(selectedService?.breakdown?.conditionFee || 0);

  desc.textContent =
    serviceType && isInstantService(serviceType)
      ? hasSurcharge
        ? `${conditionLabel}. Phụ phí thời tiết đang cộng thêm ${formatMoneyVnd(conditionFee)}.`
        : `${conditionLabel}. Hiện chưa phát sinh phụ phí thời tiết.`
      : `Khi bạn chọn Giao Ngay Lập Tức, hệ thống sẽ tự xác định phụ phí thời tiết.`;
  badge.textContent = hasSurcharge
    ? `+${formatMoneyVnd(conditionFee)}`
    : formatMoneyVnd(0);
  badge.className = `weather-surcharge-badge${
    isFallback ? " is-muted" : hasSurcharge ? " is-warning" : ""
  }`;
  meta.textContent = `${sourceLabel}${
    weatherQuoteState?.checkedAt
      ? ` | Cập nhật: ${weatherQuoteState.checkedAt}`
      : ""
  }`;
  hint.textContent =
    weatherQuoteState?.note ||
    "Khách hàng không cần chọn tay. Nếu hệ thống chưa lấy được dữ liệu, điều phối sẽ xác nhận khi cần. Giá hiện tại là giá tham khảo.";
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
      response.note ||
      "Khách hàng không cần chọn tay. Điều phối sẽ xác nhận khi điều kiện thực tế thay đổi.",
    source: response.source || "fallback",
    checkedAt: response.checked_at || "",
    effectiveAt: response.effective_at || "",
    isFallback: response.is_fallback !== false,
  };
}

async function readJsonResponseSafe(response) {
  const rawText = await response.text();
  if (!String(rawText || "").trim()) {
    if (response.status === 405) {
      throw new Error(
        "Máy chủ đang chặn phương thức gửi đơn này (405). Kiểm tra lại endpoint đặt lịch có đang trỏ đúng file PHP trong thư mục public hay không.",
      );
    }
    throw new Error(
      response.status >= 400
        ? `Máy chủ trả về lỗi ${response.status} nhưng không gửi nội dung JSON.`
        : "Máy chủ trả về phản hồi rỗng, không đọc được dữ liệu JSON.",
    );
  }
  try {
    return JSON.parse(rawText);
  } catch (error) {
    const preview = String(rawText || "").trim().slice(0, 80);
    throw new Error(
      preview.startsWith("<")
        ? `Máy chủ đang trả về trang HTML thay vì dữ liệu JSON${
            response.status === 405
              ? " do endpoint hiện tại không nhận đúng method."
              : ""
          }`
        : `Phản hồi từ máy chủ không đúng định dạng JSON${
            response.status >= 400 ? ` (HTTP ${response.status})` : ""
          }.`,
    );
  }
}

function buildWeatherRequestKey() {
  const pickupPoint = markerPickup?.getLatLng?.();
  if (!pickupPoint) return "";
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  return `${pickupPoint.lat.toFixed(3)}:${pickupPoint.lng.toFixed(3)}:${bucket}`;
}

async function requestWeatherQuote(force = false) {
  if (getDeliveryMode() !== "instant") {
    weatherQuoteState = createDefaultWeatherQuoteState();
    updateWeatherSurchargePanel();
    return;
  }

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

  const pickupAt = getCurrentDateTime().toISOString();
  const url = new URL(
    resolveBookingApiUrl("dat-lich-ajax.php"),
    window.location.href,
  );
  url.searchParams.set("action", "weather_quote");
  url.searchParams.set("lat", pickupPoint.lat);
  url.searchParams.set("lng", pickupPoint.lng);
  url.searchParams.set("mode", "instant");
  url.searchParams.set("pickup_at", pickupAt);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    const result = await readJsonResponseSafe(response);
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể lấy dữ liệu thời tiết.");
    }
    weatherQuoteState = {
      ...normalizeWeatherQuoteResponse(result.data || {}),
      requestKey,
    };
  } catch (error) {
    weatherQuoteState = {
      ...createDefaultWeatherQuoteState(),
      status: "ready",
      requestKey,
      note:
        error.message ||
        "Không lấy được dữ liệu thời tiết. Hệ thống đang tạm tính theo điều kiện bình thường.",
      conditionLabel: "Chưa phát sinh phụ phí thời tiết",
      summary: "Hệ thống đang tạm tính theo thời tiết bình thường",
      isFallback: true,
    };
  }

  updateWeatherSurchargePanel(selectedService && selectedService.serviceType);
  if (getCurrentStep() >= 3) {
    renderServiceCards({ skipWeatherFetch: true });
  }
}

function findDeliverySlotForPickup(pickupSlot) {
  const pickupStartMinutes = timeTextToMinutes(pickupSlot && pickupSlot.start);
  const options = getDeliverySlotOptions();
  if (pickupStartMinutes < 0 || !options.length) return null;
  return (
    options.find(
      (slot) => timeTextToMinutes(slot && slot.end) > pickupStartMinutes,
    ) ||
    options[options.length - 1] ||
    null
  );
}

function syncDesiredDeliveryWindow() {
  const pickupDateInput = document.getElementById("pickup-date");
  const deliveryDateInput = document.getElementById("delivery-date");
  const deliverySlotSelect = document.getElementById("delivery-slot");
  const isInstant = getDeliveryMode() === "instant";
  let hasChanged = false;

  if (!pickupDateInput || !deliveryDateInput || !deliverySlotSelect) {
    updateDesiredDeliveryHint();
    return hasChanged;
  }

  if (!deliveryDateInput.value && pickupDateInput.value) {
    deliveryDateInput.value = pickupDateInput.value;
    hasChanged = true;
  }

  if (isInstant && pickupDateInput.value && deliveryDateInput.value !== pickupDateInput.value) {
    deliveryDateInput.value = pickupDateInput.value;
    hasChanged = true;
  }

  deliveryDateInput.disabled = false;
  deliveryDateInput.title = isInstant
    ? "Giao Ngay Lập Tức dùng mốc điều phối realtime."
    : "";

  const pickupSlot = getSelectedPickupSlot();
  const deliverySlot = getSelectedDeliverySlot();
  const pickupStartMinutes = timeTextToMinutes(pickupSlot && pickupSlot.start);
  const deliveryEndMinutes = timeTextToMinutes(deliverySlot && deliverySlot.end);

  if (
    pickupStartMinutes >= 0 &&
    (deliveryEndMinutes < 0 || deliveryEndMinutes <= pickupStartMinutes)
  ) {
    const fallbackSlot = findDeliverySlotForPickup(pickupSlot);
    if (fallbackSlot && deliverySlotSelect.value !== fallbackSlot.key) {
      deliverySlotSelect.value = fallbackSlot.key;
      hasChanged = true;
    }
  }

  updateDesiredDeliveryHint();
  updateScheduleTimingPanel();
  return hasChanged;
}

function updateDesiredDeliveryHint() {
  const hint = document.getElementById("delivery-target-hint");
  if (!hint) return;
  const isInstant = getDeliveryMode() === "instant";
  hint.textContent = isInstant
    ? "Giao Ngay Lập Tức không dùng lịch hẹn dài dòng. Hệ thống sẽ lấy mốc hiện tại để tính thời gian giao dự kiến."
    : "Đây là mốc người nhận muốn nhận hàng, không phải thời điểm giao chắc chắn. Hệ thống dùng mốc này để đối chiếu thời gian giao dự kiến của từng gói.";
}

// ========== UI HELPERS ==========
function showError(step, message) {
  const errBox = document.getElementById(`error-step-${step}`);
  if (errBox) {
    errBox.querySelector(".error-text").textContent = message;
    errBox.style.display = "block";
    errBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearError(step) {
  const errBox = document.getElementById(`error-step-${step}`);
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

// ========== MAP ==========
function initMap() {
  map = L.map("map").setView([10.762622, 106.660172], 12);
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
    reverseGeocode(markerPickup.getLatLng(), "search-pickup");
    recalculateDistance();
  });
  markerDelivery.on("dragend", () => {
    reverseGeocode(markerDelivery.getLatLng(), "search-delivery");
    recalculateDistance();
  });

  recalculateDistance();
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
  if (getCurrentStep() >= 3) {
    if (getDeliveryMode() === "instant") {
      requestWeatherQuote(true);
    }
    renderServiceCards();
  }
}

function showDistance() {
  const badge = document.getElementById("distance-badge");
  document.getElementById("distance-km").textContent =
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
            markerType === "pickup" ? "search-pickup" : "search-delivery";
          document.getElementById(inputId).value = item.display_name;
          sugBox.style.display = "none";
          if (markerType === "pickup")
            markerPickup.setLatLng([item.lat, item.lon]);
          else markerDelivery.setLatLng([item.lat, item.lon]);
          map.panTo([item.lat, item.lon]);
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
    selectOption(groupId, button);
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
  const imageInput = document.getElementById("image-upload");
  const videoInput = document.getElementById("video-upload");
  const imageMeta = document.getElementById("image-upload-meta");
  const videoMeta = document.getElementById("video-upload-meta");
  const imagePreview = document.getElementById("preview-image");
  const videoPreview = document.getElementById("preview-video");
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
  renderReviewUploads();
}

async function applyStoredDraftMarkers(payload) {
  const pickupLat = Number(payload.pickup_lat || 0);
  const pickupLng = Number(payload.pickup_lng || 0);
  const deliveryLat = Number(payload.delivery_lat || 0);
  const deliveryLng = Number(payload.delivery_lng || 0);
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

  const pickupAddress = String(payload.search_pickup || "").trim();
  const deliveryAddress = String(payload.search_delivery || "").trim();
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
  document.getElementById("sender-name").value = payload.sender_name || "";
  document.getElementById("sender-phone").value = payload.sender_phone || "";
  document.getElementById("receiver-name").value = payload.receiver_name || "";
  document.getElementById("receiver-phone").value = payload.receiver_phone || "";
  document.getElementById("search-pickup").value = payload.search_pickup || "";
  document.getElementById("search-delivery").value =
    payload.search_delivery || "";
  document.getElementById("notes").value = payload.notes || "";
  document.getElementById("cod-value").value =
    parseFloat(payload.cod_value) || 0;

  setOptionGroupValue("payer-group", payload.fee_payer || "gui");
  setOptionGroupValue(
    "payment-group",
    payload.payment_method || "tien_mat",
  );

  orderItems = normalizeReorderItems(payload.items);
  renderItems();

  const preferredMode =
    payload.delivery_mode ||
    (payload.service === "instant" ? "instant" : "scheduled");
  setDeliveryMode(preferredMode, { render: false });

  const pickupDateInput = document.getElementById("pickup-date");
  const pickupSlotSelect = document.getElementById("pickup-slot");
  const deliveryDateInput = document.getElementById("delivery-date");
  const deliverySlotSelect = document.getElementById("delivery-slot");
  const vehicleSelect = document.getElementById("vehicle-choice");

  if (pickupDateInput && payload.pickup_date) {
    pickupDateInput.value = payload.pickup_date;
  }
  if (pickupSlotSelect && payload.pickup_slot) {
    pickupSlotSelect.value = payload.pickup_slot;
  }
  if (deliveryDateInput && payload.delivery_date) {
    deliveryDateInput.value = payload.delivery_date;
  }
  if (deliverySlotSelect && payload.delivery_slot) {
    deliverySlotSelect.value = payload.delivery_slot;
  }
  if (vehicleSelect && payload.vehicle) {
    vehicleSelect.value = Array.from(vehicleSelect.options).some(
      (option) => option.value === payload.vehicle,
    )
      ? payload.vehicle
      : "auto";
  }

  await applyStoredDraftMarkers(payload);

  selectedService = payload.service ? { serviceType: payload.service } : null;
  if (payload.service) {
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
    prepareReview();
    goToStep(5);
  } else if (targetStep >= 4) {
    goToStep(4);
  } else if (targetStep >= 3) {
    goToStep(3);
  } else if (targetStep >= 2) {
    goToStep(2);
  } else {
    goToStep(1);
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
  document.getElementById("search-pickup").value = data.pickup_address || "";
  document.getElementById("search-delivery").value =
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

  document.getElementById("sender-name").value = data.sender_name || "";
  document.getElementById("sender-phone").value = data.sender_phone || "";
  document.getElementById("receiver-name").value = data.receiver_name || "";
  document.getElementById("receiver-phone").value = data.receiver_phone || "";
  document.getElementById("notes").value = data.notes || "";
  document.getElementById("cod-value").value = parseFloat(data.cod_value) || 0;

  const vehicleChoice = document.getElementById("vehicle-choice");
  if (vehicleChoice) {
    vehicleChoice.value = Array.from(vehicleChoice.options).some(
      (option) => option.value === data.vehicle,
    )
      ? data.vehicle
      : "auto";
  }

  setOptionGroupValue("payer-group", data.fee_payer || "gui");
  setOptionGroupValue("payment-group", data.payment_method || "tien_mat");

  orderItems = normalizeReorderItems(data.items);
  renderItems();

  if (data.service_type) {
    selectedService = { serviceType: data.service_type };
    setDeliveryMode(
      data.service_type === "instant" ? "instant" : "scheduled",
      { render: false },
    );
  }

  await applyReorderAddresses(data);
  if (data.service_type) {
    renderServiceCards();
  }
  markReorderMode(data.source_order_code || `#${data.source_order_id || ""}`);
}

async function initReorderPrefill() {
  const reorderId = getQueryParam("reorder_id");
  if (!reorderId) return;

  try {
    const response = await fetch(
      `${resolveBookingApiUrl("dat-lich-ajax.php")}?reorder_id=${encodeURIComponent(reorderId)}`,
    );
    const result = await readJsonResponseSafe(response);
    if (!response.ok || !result.success || !result.data) {
      throw new Error(
        result.message || "Không thể tải dữ liệu đơn cần đặt lại.",
      );
    }
    await applyReorderPrefill(result.data);
  } catch (error) {
    console.error(error);
    showError(1, error.message || "Không thể tải dữ liệu đơn cũ để đặt lại.");
  }
}

function applyCustomerPrefill(data) {
  if (!data || typeof data !== "object") return;

  const senderNameInput = document.getElementById("sender-name");
  const senderPhoneInput = document.getElementById("sender-phone");
  const pickupInput = document.getElementById("search-pickup");

  if (senderNameInput && !senderNameInput.value.trim() && data.sender_name) {
    senderNameInput.value = data.sender_name;
  }
  if (senderPhoneInput && !senderPhoneInput.value.trim() && data.sender_phone) {
    senderPhoneInput.value = data.sender_phone;
  }
  if (pickupInput && !pickupInput.value.trim() && data.pickup_address) {
    pickupInput.value = data.pickup_address;
  }
}

async function initCustomerPrefill() {
  if (getQueryParam("reorder_id")) return;

  try {
    const response = await fetch(
      `${resolveBookingApiUrl("dat-lich-ajax.php")}?action=prefill`,
      {
        credentials: "same-origin",
      },
    );

    if (response.status === 401) return;

    const result = await readJsonResponseSafe(response);
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Không thể tải thông tin người gửi.");
    }

    applyCustomerPrefill(result.data);
  } catch (error) {
    console.warn("Không tự điền được thông tin khách hàng:", error);
  }
}

// ========== ITEMS ==========
function addItem() {
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
  renderItems();
}

function removeItem(idx) {
  if (orderItems.length <= 1) return;
  orderItems.splice(idx, 1);
  renderItems();
}

function handleLoaiHangChange(idx, val) {
  orderItems[idx].loai_hang = val;
  orderItems[idx].ten_hang = "";
  renderItems();
}

function updateItemField(idx, field, val) {
  if (field === "loai_hang" || field === "ten_hang") {
    orderItems[idx][field] = val;
  } else if (field === "so_luong") {
    orderItems[idx][field] = Math.max(1, parseInt(val, 10) || 1);
  } else {
    orderItems[idx][field] = parseFloat(val) || 0;
  }
  updateWeightDisplay();
}

function renderItems() {
  const container = document.getElementById("items-list");
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
    div.innerHTML = `
      <div class="item-row-num">Món hàng #${idx + 1}</div>
      <button class="item-delete-btn" onclick="removeItem(${idx})" title="Xóa"><i class="fas fa-times"></i></button>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Loại hàng</label>
          <select class="form-control" onchange="handleLoaiHangChange(${idx}, this.value)">
            <option value="">Chọn loại hàng...</option>
            ${typeOptions}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Tên hàng cụ thể</label>
          <select class="form-control" onchange="updateItemField(${idx}, 'ten_hang', this.value)" ${isTypeChosen ? "" : "disabled"}>
            <option value="">${isTypeChosen ? "Chọn tên hàng..." : "Chọn loại hàng trước"}</option>
            ${nameOpts}
          </select>
        </div>
      </div>
      <div class="item-grid item-grid-2">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">
            Khai báo giá trị (₫)
            <span class="field-help" tabindex="0" aria-label="${DECLARED_VALUE_HELP}">
              i
              <span class="field-help__tooltip">${DECLARED_VALUE_HELP}</span>
            </span>
          </label>
          <input type="number" class="form-control" placeholder="0" value="${item.gia_tri_khai_bao}" onchange="updateItemField(${idx},'gia_tri_khai_bao',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Số lượng</label>
          <input type="number" class="form-control" min="1" step="1" value="${item.so_luong || 1}" onchange="updateItemField(${idx},'so_luong',this.value)" />
        </div>
      </div>
      <div class="item-grid item-grid-4">
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cân nặng / kiện (kg)</label>
          <input type="number" class="form-control" step="0.1" value="${item.can_nang}" onchange="updateItemField(${idx},'can_nang',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Dài (cm)</label>
          <input type="number" class="form-control" value="${item.chieu_dai}" onchange="updateItemField(${idx},'chieu_dai',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Rộng (cm)</label>
          <input type="number" class="form-control" value="${item.chieu_rong}" onchange="updateItemField(${idx},'chieu_rong',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cao (cm)</label>
          <input type="number" class="form-control" value="${item.chieu_cao}" onchange="updateItemField(${idx},'chieu_cao',this.value)" />
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  updateWeightDisplay();
}

function updateWeightDisplay() {
  let totalAct = 0,
    totalVol = 0;
  orderItems.forEach((it) => {
    totalAct += it.can_nang * (it.so_luong || 1);
    totalVol +=
      ((it.chieu_dai * it.chieu_rong * it.chieu_cao) / 6000) *
      (it.so_luong || 1);
  });
  const billable = Math.max(totalAct, totalVol);
  document.getElementById("total-weight-display").textContent =
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

function buildQuotePayload() {
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
  const deliverySlot = isInstantMode
    ? findDeliverySlotByMinuteTarget(
        currentDate.getHours() * 60 + currentDate.getMinutes() + 120,
      )
    : getSelectedDeliverySlot();
  const urgentCondition = getSelectedUrgentCondition();
  const scheduleInfo = getScheduleTimingInfo();
  const pickupPoint = markerPickup?.getLatLng?.() || null;
  const deliveryPoint = markerDelivery?.getLatLng?.() || null;
  const pickupDateValue = isInstantMode
    ? formatDateValue(currentDate)
    : document.getElementById("pickup-date").value || "";
  const deliveryDateValue = isInstantMode
    ? formatDateValue(currentDate)
    : document.getElementById("delivery-date").value || "";
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
    phi_thu_ho: parseFloat(document.getElementById("cod-value").value) || 0,
    loai_xe: document.getElementById("vehicle-choice").value || "auto",
    che_do_giao_hang: getDeliveryMode(),
    pickup_lat: pickupPoint ? Number(pickupPoint.lat) : 0,
    pickup_lng: pickupPoint ? Number(pickupPoint.lng) : 0,
    delivery_lat: deliveryPoint ? Number(deliveryPoint.lat) : 0,
    delivery_lng: deliveryPoint ? Number(deliveryPoint.lng) : 0,
    ngay_lay_hang: pickupDateValue,
    khung_gio_lay_hang: (pickupSlot && pickupSlot.key) || document.getElementById("pickup-slot").value || "",
    ten_khung_gio_lay_hang: (pickupSlot && pickupSlot.label) || "",
    gio_bat_dau_lay_hang: (pickupSlot && pickupSlot.start) || "",
    gio_ket_thuc_lay_hang: (pickupSlot && pickupSlot.end) || "",
    phi_khung_gio:
      (pickupSlot && pickupSlot.phicodinh) || 0,
    he_so_khung_gio:
      (pickupSlot && pickupSlot.heso) || 1,
    ngay_nhan_mong_muon: deliveryDateValue,
    khung_gio_nhan_hang: (deliverySlot && deliverySlot.key) || document.getElementById("delivery-slot").value || "",
    ten_khung_gio_nhan_hang: (deliverySlot && deliverySlot.label) || "",
    gio_bat_dau_nhan_hang: (deliverySlot && deliverySlot.start) || "",
    gio_ket_thuc_nhan_hang: (deliverySlot && deliverySlot.end) || "",
    thoi_gian_xu_ly_phut:
      isInstantMode
        ? 0
        : (scheduleInfo && scheduleInfo.totalMinutes) || 0,
    ten_thoi_gian_xu_ly:
      isInstantMode
        ? "Điều phối realtime"
        : (scheduleInfo && scheduleInfo.durationText) || "",
    dieu_kien_dich_vu:
      (urgentCondition && urgentCondition.key) || "macdinh",
    ten_dieu_kien_dich_vu:
      (urgentCondition && urgentCondition.label) || "Bình thường",
  };
}

function getDesiredDeliveryStatus(estimateText) {
  if (getDeliveryMode() !== "scheduled") return "";
  const deliveryDate = document.getElementById("delivery-date").value;
  const deliverySlot = getSelectedDeliverySlot();
  const pickupDate = document.getElementById("pickup-date").value;
  const pickupSlot = getSelectedPickupSlot();
  if (!deliveryDate || !deliverySlot || !pickupDate || !pickupSlot) return "";

  const pickupStart = pickupSlot.start;
  const pickupAt = new Date(`${pickupDate}T${pickupStart}`);
  const deadlineAt = new Date(`${deliveryDate}T${deliverySlot.end}`);
  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(deadlineAt.getTime()))
    return "";

  const parsed = parseEstimateToHours(estimateText);
  if (!parsed.maxHours) return "";

  const latestExpected = new Date(
    pickupAt.getTime() + parsed.maxHours * 60 * 60 * 1000,
  );
  if (latestExpected <= deadlineAt) {
    return `<div class="service-deadline-badge good"><i class="fas fa-check-circle"></i> Thời gian dự kiến hiện tại có thể kịp mốc bạn mong muốn</div>`;
  }
  return `<div class="service-deadline-badge warn"><i class="fas fa-hourglass-half"></i> Thời gian dự kiến hiện tại có thể không kịp mốc bạn mong muốn</div>`;
}

function getScheduledServiceAssessment(service) {
  const scheduleInfo = getScheduleTimingInfo();
  if (!scheduleInfo || !service) {
    return {
      fits: true,
      reason: "",
      shouldStorageNote: false,
      scheduleInfo,
    };
  }
  const parsed = parseEstimateToHours(service.estimate);
  if (!parsed.maxHours) {
    return {
      fits: true,
      reason: "",
      shouldStorageNote: false,
      scheduleInfo,
    };
  }
  const requestedHours = scheduleInfo.totalMinutes / 60;
  const fits = requestedHours >= parsed.maxHours;
  const shouldStorageNote = fits && requestedHours > Math.max(parsed.maxHours + 24, parsed.maxHours * 2);
  return {
    fits,
    reason: fits
      ? ""
      : `Thời gian dự kiến ${service.estimate} không kịp mốc bạn cần nhận trong ${scheduleInfo.durationText}.`,
    shouldStorageNote,
    scheduleInfo,
  };
}

function updateStorageNote(services = []) {
  const panel = document.getElementById("storage-note-panel");
  const text = document.getElementById("storage-note-text");
  if (!panel || !text) return;
  if (getDeliveryMode() !== "scheduled") {
    panel.classList.add("is-hidden");
    return;
  }
  const shouldShow = services.some(
    (service) => getScheduledServiceAssessment(service).shouldStorageNote,
  );
  if (!shouldShow) {
    panel.classList.add("is-hidden");
    return;
  }
  text.textContent =
    "Mốc nhận đang cách khá xa thời điểm lấy hàng. Hệ thống vẫn cho đặt các gói phù hợp và có thể lưu kho để giao đúng ngày khách chờ.";
  panel.classList.remove("is-hidden");
}

function updateInstantRealtimePanel(service = selectedService) {
  const driverStatus = document.getElementById("instant-driver-status");
  const pickupStatus = document.getElementById("instant-pickup-status");
  const pickupNote = document.getElementById("instant-pickup-note");
  const deliveryStatus = document.getElementById("instant-delivery-status");
  const deliveryNote = document.getElementById("instant-delivery-note");
  if (!driverStatus || !pickupStatus || !pickupNote || !deliveryStatus || !deliveryNote) {
    return;
  }

  if (getDeliveryMode() !== "instant") return;

  const now = getCurrentDateTime();
  pickupStatus.textContent = `Ngay bây giờ (${now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })})`;
  pickupNote.textContent =
    "Hệ thống dùng thời điểm hiện tại để tính thời gian giao dự kiến realtime và phụ phí giờ đêm nếu có.";
  deliveryStatus.textContent =
    service && service.estimate
      ? `Dự kiến giao trong: ${service.estimate}`
      : "Đang tính thời gian giao dự kiến";
  const weatherFee = Number(service?.breakdown?.conditionFee || 0);
  deliveryNote.textContent =
    weatherQuoteState?.isLoading
      ? "Đang đồng bộ thời tiết và tìm tài xế gần nhất."
      : weatherQuoteState?.conditionKey &&
          weatherQuoteState.conditionKey !== "macdinh"
        ? `Đã áp dụng ${weatherQuoteState.conditionLabel}: +${formatMoneyVnd(weatherFee)}.`
        : "Phụ phí thời tiết sẽ tự động cập nhật nếu có phát sinh.";
  driverStatus.innerHTML = `<i class="fas fa-satellite-dish"></i><span>${
    weatherQuoteState?.isLoading
      ? "Đang đồng bộ thời tiết và tìm tài xế"
      : "Đang tìm tài xế gần nhất"
  }</span>`;
}

function getInstantTimeFeeLabel(service) {
  const slotLabel =
    service?.timeSurchargeLabel ||
    service?.breakdown?.timeSurchargeLabel ||
    getInstantPricingWindow(getCurrentDateTime())?.label ||
    "Khung thời gian hiện tại";
  return `Phụ phí thời gian (${slotLabel})`;
}

function getInstantWeatherFeeLabel(service) {
  const conditionLabel =
    weatherQuoteState?.conditionLabel ||
    service?.breakdown?.conditionSurchargeLabel ||
    service?.serviceConditionLabel ||
    "Thời tiết bình thường";
  return `Phụ phí thời tiết (${conditionLabel})`;
}

// ========== SERVICE CARDS ==========
function renderServiceCards(options = {}) {
  const container = document.getElementById("service-list");
  const btn5 = document.getElementById("btn-4-to-5");
  const etaPanel = document.getElementById("eta-panel");
  const isInstantMode = getDeliveryMode() === "instant";
  etaPanel.classList.add("is-hidden");
  document.getElementById("eta-display").textContent = "—";
  updateInstantRealtimePanel();

  if (typeof window.calculateDomesticQuote !== "function") {
    container.innerHTML = `<div style="color:#ef4444;">Không tải được dữ liệu bảng giá.</div>`;
    return;
  }
  if (khoang_cach_km <= 0) {
    container.innerHTML = `<div style="color:#ef4444;">Chưa có khoảng cách. Vui lòng chọn địa chỉ ở Bước 1.</div>`;
    return;
  }

  container.innerHTML = `<div class="quote-loading"><i class="fas fa-spinner fa-spin"></i> Đang tính cước phí...</div>`;

  if (isInstantMode && !options.skipWeatherFetch) {
    requestWeatherQuote();
  }

  const payload = buildQuotePayload();
  const result = window.calculateDomesticQuote(payload);
  const scheduleInfo = getScheduleTimingInfo();

  if (!result || !result.services || result.services.length === 0) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp.</div>`;
    return;
  }

  const filteredServices = result.services.filter((svc) =>
    isInstantMode
      ? svc.serviceType === "instant"
      : ["standard", "fast", "express"].includes(svc.serviceType),
  );

  if (!filteredServices.length) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp với chế độ giao hàng đang chọn.</div>`;
    selectedService = null;
    btn5.disabled = true;
    return;
  }

  if (selectedService) {
    const matchedService = filteredServices.find(
      (svc) => svc.serviceType === selectedService.serviceType,
    );
    selectedService = matchedService || null;
  } else if (isInstantMode) {
    selectedService = filteredServices[0] || null;
  }
  syncDesiredDeliveryWindow();
  updateDesiredDeliveryHint();
  updateStorageNote(filteredServices);
  syncUrgentConditionVisibility(selectedService && selectedService.serviceType);
  btn5.disabled = !selectedService;
  if (selectedService) {
    document.getElementById("eta-display").textContent =
      selectedService.estimate;
    etaPanel.classList.remove("is-hidden");
  }

  container.innerHTML = `
    <div class="service-mode-summary">
      <strong>${
        isInstantMode
          ? "Giao Ngay Lập Tức: đang báo giá theo chế độ realtime"
          : "Các gói cước phù hợp với mốc thời gian bạn vừa chọn"
      }</strong>
      <span>${
        isInstantMode
          ? "Khung giờ được khóa theo thời điểm hiện tại. Hệ thống tự cộng phụ phí thời gian và phụ phí thời tiết nếu có. Mức giá đang hiển thị là giá tham khảo trước khi tạo đơn."
          : "Gói nào không thể giao kịp sẽ bị vô hiệu hóa. Nếu khách nhận quá xa ngày lấy, hệ thống sẽ báo khả năng lưu kho. Giá trên form là giá tham khảo trước khi điều phối."
      }</span>
    </div>
  `;

  filteredServices.forEach((svc) => {
    const bd = svc.breakdown || {};
    const assessment = isInstantMode
      ? { fits: true, reason: "", shouldStorageNote: false }
      : getScheduledServiceAssessment(svc);
    const isDisabled = !assessment.fits;
    if (isDisabled && selectedService?.serviceType === svc.serviceType) {
      selectedService = null;
    }
    const deadlineHint = isInstantMode
      ? `<div class="service-deadline-badge good"><i class="fas fa-signal"></i> Thời gian giao dự kiến sẽ cập nhật ngay khi hệ thống điều phối</div>`
      : getDesiredDeliveryStatus(svc.estimate);
    const serviceNote = isInstantMode
      ? weatherQuoteState?.summary ||
        "Hệ thống đang tạm tính theo điều kiện thời tiết bình thường."
      : isDisabled
        ? assessment.reason
        : assessment.shouldStorageNote
          ? "Khách nhận khá xa ngày lấy hàng. Gói này vẫn nhận đơn và có thể lưu kho để giao đúng hẹn."
          : "Gói này có thể đáp ứng mốc thời gian hiện tại.";
    const card = document.createElement("div");
    card.className =
      "service-card" +
      (selectedService && selectedService.serviceType === svc.serviceType
        ? " selected"
        : "") +
      (isDisabled ? " is-disabled" : "");
    card.innerHTML = `
      <div class="service-card-top">
        <div class="service-name"><i class="fas fa-truck-fast"></i> ${svc.serviceName}</div>
        <div class="service-price">${svc.total.toLocaleString()} ₫</div>
      </div>
      <div style="display: flex; gap: 15px; margin-top: 8px; flex-wrap: wrap;">
        <div class="service-eta"><i class="far fa-clock"></i> Thời gian giao dự kiến: ${svc.estimate}</div>
        ${
          !isInstantMode && scheduleInfo
            ? `<div class="service-eta" style="color: #9a3412; font-weight: 700;"><i class="fas fa-stopwatch"></i> Từ lấy đến giao: ${scheduleInfo.durationText}</div>`
            : ""
        }
        <div class="service-eta" style="color: #16a34a; font-weight: 700;">
          <i class="fas fa-shipping-fast"></i> Gợi ý: ${svc.vehicleSuggestion || "Xe máy"}
        </div>
        <div class="service-eta" style="color: #0a2a66; font-weight: 700;">
          <i class="fas fa-truck-ramp-box"></i> Đang tính giá: ${svc.selectedVehicleLabel || svc.vehicleSuggestion || "Xe máy"}${svc.vehicleMultiplier > 1 ? ` (x${svc.vehicleMultiplier})` : ""}
        </div>
      </div>
      ${deadlineHint}
      <div class="service-card-note">${serviceNote}</div>
      <div class="service-breakdown">
        <div class="breakdown-row"><span>Cước cơ bản</span><span>${(bd.basePrice || 0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí trọng lượng vượt mức</span><span>${(bd.overweightFee || 0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí thể tích</span><span>${(bd.volumeFee || 0).toLocaleString()} ₫</span></div>
        ${(bd.goodsFee || 0) > 0 ? `<div class="breakdown-row"><span>Phụ phí loại hàng</span><span>${bd.goodsFee.toLocaleString()} ₫</span></div>` : ""}
        ${
          isInstantMode
            ? `<div class="breakdown-row"><span>${getInstantTimeFeeLabel(svc)}</span><span>${formatMoneyVnd(bd.timeFee || 0)}</span></div>`
            : (bd.timeFee || 0) > 0
              ? `<div class="breakdown-row"><span>Phí khung giờ (${svc.serviceName})</span><span>${bd.timeFee.toLocaleString()} ₫</span></div>`
              : ""
        }
        ${
          isInstantMode
            ? `<div class="breakdown-row"><span>${getInstantWeatherFeeLabel(svc)}</span><span>${formatMoneyVnd(bd.conditionFee || 0)}</span></div>`
            : (bd.conditionFee || 0) > 0
              ? `<div class="breakdown-row"><span>Phụ phí điều kiện thực tế</span><span>${bd.conditionFee.toLocaleString()} ₫</span></div>`
              : ""
        }
        ${(bd.vehicleFee || 0) > 0 ? `<div class="breakdown-row"><span>Điều chỉnh theo xe</span><span>${bd.vehicleFee.toLocaleString()} ₫</span></div>` : ""}
        ${(bd.codFee || 0) > 0 ? `<div class="breakdown-row"><span>Phí COD</span><span>${bd.codFee.toLocaleString()} ₫</span></div>` : ""}
        ${(bd.insuranceFee || 0) > 0 ? `<div class="breakdown-row"><span>Phí bảo hiểm</span><span>${bd.insuranceFee.toLocaleString()} ₫</span></div>` : ""}
        <div class="breakdown-row"><span>Tổng</span><span>${svc.total.toLocaleString()} ₫</span></div>
      </div>
    `;
    if (isDisabled) {
      container.appendChild(card);
      return;
    }
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".service-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedService = svc;
      const scheduleChanged = syncDesiredDeliveryWindow();
      updateDesiredDeliveryHint();
      syncUrgentConditionVisibility(svc.serviceType);
      updateInstantRealtimePanel(svc);
      if (scheduleChanged) {
        renderServiceCards();
        return;
      }
      btn5.disabled = false;
      // Cập nhật ETA ở bước 3
      document.getElementById("eta-display").textContent = svc.estimate;
      etaPanel.classList.remove("is-hidden");
    });
    container.appendChild(card);
  });

  btn5.disabled = !selectedService;
  updateInstantRealtimePanel(selectedService);
}

// ========== STEP NAVIGATION ==========
function selectOption(groupId, btn) {
  document
    .querySelectorAll(`#${groupId} .option-btn`)
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const inputId = groupId === "payer-group" ? "payer-val" : "payment-val";
  document.getElementById(inputId).value = btn.dataset.val;
}

function goToStep(step) {
  if (step < 1 || step > 5) return;
  for (let i = 1; i <= 5; i++) {
    clearError(i);
    document.getElementById(`step-${i}`).classList.toggle("active", i === step);
    const ind = document.getElementById(`ind-${i}`);
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

function validateStep1() {
  clearError(1);
  const fields = [
    ["sender-name", "Họ tên người gửi"],
    ["sender-phone", "Số điện thoại người gửi"],
    ["receiver-name", "Họ tên người nhận"],
    ["receiver-phone", "Số điện thoại người nhận"],
    ["search-pickup", "Địa chỉ lấy hàng"],
    ["search-delivery", "Địa chỉ giao hàng"],
  ];
  for (const [id, label] of fields) {
    const val = document.getElementById(id).value.trim();
    if (!val) {
      showError(1, `Vui lòng điền: ${label}`);
      document.getElementById(id).focus();
      return false;
    }
    if (id.includes("phone") && !isValidPhone(val)) {
      showError(
        1,
        `${label} không đúng định dạng (10 số, bắt đầu bằng 03, 05, 07, 08, 09).`,
      );
      document.getElementById(id).focus();
      return false;
    }
  }
  if (!khoang_cach_km || khoang_cach_km <= 0) {
    showError(
      1,
      "Vui lòng xác định vị trí trên bản đồ bằng cách tìm kiếm địa chỉ hoặc kéo ghim.",
    );
    return false;
  }
  if (
    document.getElementById("search-pickup").value ===
    document.getElementById("search-delivery").value
  ) {
    showError(
      1,
      "Địa chỉ lấy hàng và địa chỉ giao hàng không được trùng nhau.",
    );
    return false;
  }
  return true;
}

function validateStep2() {
  clearError(2);
  if (orderItems.length === 0) {
    showError(2, "Vui lòng thêm ít nhất một món hàng.");
    return false;
  }
  for (let i = 0; i < orderItems.length; i++) {
    const it = orderItems[i];
    if (!it.loai_hang) {
      showError(2, `Vui lòng chọn loại hàng cho món hàng thứ ${i + 1}.`);
      return false;
    }
    if (!it.ten_hang) {
      showError(2, `Vui lòng chọn hoặc nhập tên cho món hàng thứ ${i + 1}.`);
      return false;
    }
    if ((it.so_luong || 0) <= 0) {
      showError(2, `Số lượng món hàng thứ ${i + 1} phải từ 1 trở lên.`);
      return false;
    }
    if (it.can_nang <= 0 || it.can_nang > 1000) {
      showError(
        2,
        `Trọng lượng món hàng thứ ${i + 1} phải từ 0.1kg đến 1000kg.`,
      );
      return false;
    }
    if (it.chieu_dai <= 0 || it.chieu_rong <= 0 || it.chieu_cao <= 0) {
      showError(2, `Kích thước món hàng thứ ${i + 1} phải > 0.`);
      return false;
    }
    if (it.gia_tri_khai_bao < 0) {
      showError(2, `Giá trị khai báo món hàng thứ ${i + 1} không được âm.`);
      return false;
    }
  }
  return true;
}

function validateStep3() {
  clearError(3);
  if (getDeliveryMode() === "instant") {
    if (!selectedService || selectedService.serviceType !== "instant") {
      showError(3, "Vui lòng chọn gói Giao Ngay Lập Tức để tiếp tục.");
      return false;
    }
    return true;
  }

  const pDateVal = document.getElementById("pickup-date").value;
  if (!pDateVal) {
    showError(3, "Vui lòng chọn ngày lấy hàng.");
    return false;
  }

  const todayDate = formatDateValue(getCurrentDateTime());
  if (pDateVal < todayDate) {
    showError(3, "Ngày lấy hàng không được ở trong quá khứ.");
    return false;
  }

  const pSlot = document.getElementById("pickup-slot").value;
  if (!pSlot) {
    showError(3, "Vui lòng chọn khung giờ lấy hàng.");
    return false;
  }
  const pickupSlot = getSelectedPickupSlot();
  if (!pickupSlot) {
    showError(3, "Khung giờ lấy hàng không hợp lệ. Vui lòng chọn lại.");
    return false;
  }
  const deliveryDate = document.getElementById("delivery-date").value;
  if (!deliveryDate) {
    showError(3, "Vui lòng chọn ngày nhận mong muốn.");
    return false;
  }
  const deliverySlot = getSelectedDeliverySlot();
  if (!deliverySlot) {
    showError(3, "Vui lòng chọn khung giờ nhận mong muốn.");
    return false;
  }
  const pickupCompare = new Date(`${pDateVal}T${pickupSlot.start}`);
  const deliveryCompare = new Date(`${deliveryDate}T${deliverySlot.end}`);
  if (
    !Number.isNaN(pickupCompare.getTime()) &&
    !Number.isNaN(deliveryCompare.getTime()) &&
    deliveryCompare < pickupCompare
  ) {
    showError(
      3,
      "Mốc nhận mong muốn phải sau thời điểm lấy hàng.",
    );
    return false;
  }

  // Logic: Check if slot is in the past for TODAY
  if (pDateVal === todayDate) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = timeTextToMinutes(pickupSlot.end || "");

    if (endMinutes >= 0 && currentMinutes >= endMinutes) {
      showError(
        3,
        `Khung giờ ${pickupSlot.label} của ngày hôm nay đã trôi qua. Vui lòng chọn khung giờ khác.`,
      );
      return false;
    }
  }
  if (!selectedService) {
    showError(3, "Vui lòng chọn một gói cước vận chuyển.");
    return false;
  }
  if (!getScheduledServiceAssessment(selectedService).fits) {
    showError(
      3,
      "Gói cước đang chọn không kịp mốc nhận mong muốn. Vui lòng chọn gói khác.",
    );
    return false;
  }
  return true;
}

function validateStep4() {
  clearError(4);
  return true;
}

// ========== REVIEW ==========
function prepareReview() {
  if (!selectedService) return;
  const payload = buildPayload();

  document.getElementById("rv-sender").textContent =
    `${document.getElementById("sender-name").value} — ${document.getElementById("sender-phone").value}`;
  document.getElementById("rv-receiver").textContent =
    `${document.getElementById("receiver-name").value} — ${document.getElementById("receiver-phone").value}`;
  document.getElementById("rv-pickup-addr").textContent =
    document.getElementById("search-pickup").value || "—";
  document.getElementById("rv-delivery-addr").textContent =
    document.getElementById("search-delivery").value || "—";
  document.getElementById("rv-distance").textContent =
    `${khoang_cach_km.toFixed(2)} km`;

  // Items List (Phần 5: Hiển thị hàng hóa rõ ràng)
  const list = document.getElementById("rv-items-container");
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

  document.getElementById("rv-cod").textContent = payload.phi_thu_ho
    ? `${payload.phi_thu_ho.toLocaleString()} ₫`
    : "Không có";
  document.getElementById("rv-notes").textContent =
    document.getElementById("notes").value || "Không có";
  renderReviewUploads();

  // Lịch trình (Phần 3: Thời gian và khoảng thời gian)
  const pDate = document.getElementById("pickup-date").value;
  const pSlot = getSelectedPickupSlot();
  const urgentCondition = getSelectedUrgentCondition();
  const scheduleInfo = getScheduleTimingInfo();
  if (getDeliveryMode() === "instant") {
    document.getElementById("rv-pickup-time").textContent = "Ngay bây giờ";
    document.getElementById("rv-delivery-deadline").textContent =
      "Giao ngay sau khi lấy xong";
  } else {
    document.getElementById("rv-pickup-time").textContent =
      `${pDate} | ${(pSlot && pSlot.label) || "—"}`;
    const deliveryDate = document.getElementById("delivery-date").value;
    const deliverySlot = getSelectedDeliverySlot();
    document.getElementById("rv-delivery-deadline").textContent =
      `${deliveryDate || "—"} | ${(deliverySlot && deliverySlot.label) || "—"}`;
  }
  document.getElementById("rv-eta").textContent = selectedService.estimate;

  // Giá & Phương tiện (Phần 4: Phương tiện)
  const bd = selectedService.breakdown || {};
  const rvPrice = document.getElementById("rv-price-breakdown");
  rvPrice.innerHTML = `
    <div class="rv-row"><span class="rv-label">Gói dịch vụ:</span><span class="rv-val" style="color:#ff7a00; font-weight:800;">${selectedService.serviceName}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện gợi ý:</span><span class="rv-val">${selectedService.vehicleSuggestion || "Xe máy"}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện đang tính giá:</span><span class="rv-val">${selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion || "Xe máy"}</span></div>
    ${scheduleInfo ? `<div class="rv-row"><span class="rv-label">Từ lấy đến giao:</span><span class="rv-val">${scheduleInfo.durationText}</span></div>` : ""}
    ${selectedService.serviceType === "instant" ? `<div class="rv-row"><span class="rv-label">Điều kiện thời tiết đang áp dụng:</span><span class="rv-val">${selectedService.serviceConditionLabel || (urgentCondition && urgentCondition.label) || "Thời tiết bình thường"}</span></div>` : ""}
    <div class="rv-row"><span class="rv-label">Cước cơ bản:</span><span class="rv-val">${(bd.basePrice || 0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí trọng lượng vượt mức:</span><span class="rv-val">${(bd.overweightFee || 0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí thể tích:</span><span class="rv-val">${(bd.volumeFee || 0).toLocaleString()} ₫</span></div>
    ${(bd.goodsFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phụ phí loại hàng:</span><span class="rv-val">${bd.goodsFee.toLocaleString()} ₫</span></div>` : ""}
    ${selectedService.serviceType === "instant" ? `<div class="rv-row"><span class="rv-label">${getInstantTimeFeeLabel(selectedService)}:</span><span class="rv-val">${formatMoneyVnd(bd.timeFee || 0)}</span></div>` : (bd.timeFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phí khung giờ:</span><span class="rv-val">${bd.timeFee.toLocaleString()} ₫</span></div>` : ""}
    ${selectedService.serviceType === "instant" ? `<div class="rv-row"><span class="rv-label">${getInstantWeatherFeeLabel(selectedService)}:</span><span class="rv-val">${formatMoneyVnd(bd.conditionFee || 0)}</span></div>` : (bd.conditionFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phụ phí điều kiện thực tế:</span><span class="rv-val">${bd.conditionFee.toLocaleString()} ₫</span></div>` : ""}
    ${(bd.vehicleFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Điều chỉnh theo xe:</span><span class="rv-val">${bd.vehicleFee.toLocaleString()} ₫</span></div>` : ""}
    ${(bd.codFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phí COD:</span><span class="rv-val">${bd.codFee.toLocaleString()} ₫</span></div>` : ""}
    ${(bd.insuranceFee || 0) > 0 ? `<div class="rv-row"><span class="rv-label">Phí bảo hiểm:</span><span class="rv-val">${bd.insuranceFee.toLocaleString()} ₫</span></div>` : ""}
    <div class="rv-row" style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
      <span class="rv-label">Người trả cước:</span><span class="rv-val">${document.getElementById("payer-val").value === "gui" ? "Người gửi" : "Người nhận"}</span>
    </div>
    <div class="rv-row"><span class="rv-label">Thanh toán:</span><span class="rv-val">${document.getElementById("payment-val").value === "tien_mat" ? "Tiền mặt" : "Chuyển khoản"}</span></div>
  `;
  document.getElementById("rv-total").textContent =
    `${selectedService.total.toLocaleString()} ₫`;
}

// ========== UPLOAD ==========
function getSelectedUploadFiles() {
  return [
    {
      type: "image",
      file: document.getElementById("image-upload")?.files?.[0] || null,
    },
    {
      type: "video",
      file: document.getElementById("video-upload")?.files?.[0] || null,
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

function renderReviewUploads() {
  const host = document.getElementById("rv-upload-list");
  const empty = document.getElementById("rv-upload-empty");
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

function previewUpload(type) {
  const inputId = type === "video" ? "video-upload" : "image-upload";
  const previewId = type === "video" ? "preview-video" : "preview-image";
  const metaId = type === "video" ? "video-upload-meta" : "image-upload-meta";
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

  if (getCurrentStep() >= 5) {
    renderReviewUploads();
  }
}

// ========== SUBMIT ==========
async function submitOrder() {
  const btn = document.getElementById("btn-submit-order");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý...`;

  const payload = buildPayload();
  clearError(5);

  try {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    getSelectedUploadFiles().forEach((entry) => {
      formData.append("goods_media[]", entry.file, entry.file.name);
    });

    const response = await fetch(resolveBookingApiUrl("dat-lich-ajax.php"), {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const result = await readJsonResponseSafe(response);
    if (result.success) {
      clearPendingBookingDraft();
      // Thành công: Hiển thị thông báo ngay trên form và chuyển hướng sau 2s
      const container = document.getElementById("step-5");
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px;">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2 style="color: #1e293b; font-weight: 800; margin-bottom: 12px;">Đặt đơn hàng thành công!</h2>
          <p style="color: #64748b; margin-bottom: 32px;">Mã đơn hàng: <strong style="color: #0a2a66;">${result.order_code || "GHN-XXXX"}</strong>. Đang chuyển về trang quản lý đơn hàng...</p>
        </div>
      `;
      setTimeout(() => {
        const nextUrl =
          window.GiaoHangNhanhCore &&
          typeof window.GiaoHangNhanhCore.toApiUrl === "function"
            ? window.GiaoHangNhanhCore.toApiUrl("khach-hang/dashboard.html")
            : "../khach-hang/dashboard.html";
        window.location.href = nextUrl;
      }, 2500);
    } else if (response.status === 401) {
      savePendingBookingDraft(payload);
      showError(
        5,
        "Bạn cần đăng nhập để hoàn tất đặt đơn. Hệ thống đang chuyển sang trang đăng nhập và sẽ giữ lại thông tin bạn vừa nhập.",
      );
      setTimeout(() => {
        const redirectTarget = getProjectRelativeCurrentUrl();
        const loginUrl = resolveProjectHtmlUrl(
          `dang-nhap.html?redirect=${encodeURIComponent(redirectTarget)}`,
        );
        window.location.href = loginUrl;
      }, 500);
    } else {
      showError(5, "Lỗi: " + result.message);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (error) {
    console.error(error);
    showError(
      5,
      error.message ||
        "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng kiểm tra kết nối mạng.",
    );
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function buildPayload() {
  const scheduleInfo = getScheduleTimingInfo();
  const quotePayload = buildQuotePayload();
  return {
    reorder_id:
      reorderContext && reorderContext.source_order_id
        ? reorderContext.source_order_id
        : null,
    sender_name: document.getElementById("sender-name").value,
    sender_phone: document.getElementById("sender-phone").value,
    receiver_name: document.getElementById("receiver-name").value,
    receiver_phone: document.getElementById("receiver-phone").value,
    delivery_mode: getDeliveryMode(),
    search_pickup: document.getElementById("search-pickup").value,
    search_delivery: document.getElementById("search-delivery").value,
    pickup_date: quotePayload.ngay_lay_hang || "",
    pickup_slot: quotePayload.khung_gio_lay_hang || "",
    pickup_slot_label: quotePayload.ten_khung_gio_lay_hang || "",
    delivery_date: quotePayload.ngay_nhan_mong_muon || "",
    delivery_slot: quotePayload.khung_gio_nhan_hang || "",
    delivery_slot_label: quotePayload.ten_khung_gio_nhan_hang || "",
    turnaround_minutes:
      getDeliveryMode() === "instant"
        ? 0
        : (scheduleInfo && scheduleInfo.totalMinutes) || 0,
    turnaround_label:
      getDeliveryMode() === "instant"
        ? "Điều phối realtime"
        : (scheduleInfo && scheduleInfo.durationText) || "",
    notes: document.getElementById("notes").value,
    cod_value: parseFloat(document.getElementById("cod-value").value) || 0,
    payment_method: document.getElementById("payment-val").value,
    fee_payer: document.getElementById("payer-val").value,
    service: selectedService.serviceType,
    service_name: selectedService.serviceName,
    estimated_eta: selectedService.estimate,
    vehicle: selectedService.selectedVehicleKey || "",
    vehicle_label:
      selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion,
    vehicle_suggestion: selectedService.vehicleSuggestion || "",
    total_fee: selectedService.total,
    pricing_breakdown: selectedService.breakdown || {},
    pickup_lat: quotePayload.pickup_lat || 0,
    pickup_lng: quotePayload.pickup_lng || 0,
    delivery_lat: quotePayload.delivery_lat || 0,
    delivery_lng: quotePayload.delivery_lng || 0,
    service_condition_key:
      selectedService.serviceConditionKey ||
      (getSelectedUrgentCondition() && getSelectedUrgentCondition().key) ||
      "macdinh",
    service_condition_label:
      selectedService.serviceConditionLabel ||
      (getSelectedUrgentCondition() && getSelectedUrgentCondition().label) ||
      "Bình thường",
    weather_source: weatherQuoteState?.source || "",
    weather_note: weatherQuoteState?.note || "",
    khoang_cach_km: khoang_cach_km,
    items: orderItems,
  };
}
