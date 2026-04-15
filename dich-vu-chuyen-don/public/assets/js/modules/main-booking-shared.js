import { getKrudUpdateFn } from "./api/krud-client.js";
import core from "./core/app-core.js";

const bookingCrudTableName = "dich_vu_chuyen_don_dat_lich";
const SERVICE_LABEL_MAP = {
  chuyen_nha: "Chuyển nhà trọn gói",
  moving_house: "Chuyển nhà trọn gói",
  chuyen_van_phong: "Chuyển văn phòng công ty",
  moving_office: "Chuyển văn phòng công ty",
  chuyen_kho_bai: "Chuyển kho bãi",
  moving_warehouse: "Chuyển kho bãi",
};
const SCHEDULE_TIME_LABEL_MAP = {
  sang: "Sáng 08:00 - 11:30",
  chieu: "Chiều 13:30 - 17:00",
  toi: "Tối 17:00 - 21:00",
  dem: "Đêm 21:00 - 06:00",
  buoi_sang: "Buổi sáng",
  buoi_toi: "Buổi tối",
  ban_dem: "Ban đêm",
  can_xac_nhan: "Chờ xác nhận",
  binh_thuong: "Ban ngày",
  cuoi_tuan: "Cuối tuần",
};
const DEFAULT_VEHICLE_LABEL_MAP = {
  xe_may_cho_hang: "Xe máy chở hàng",
  ba_gac_may: "Ba gác máy",
  xe_van_500kg: "Xe tải 500kg",
  xe_tai_750kg: "Xe tải 750kg",
  xe_tai_1_tan: "Xe tải 1 tấn",
  xe_tai_1_5_tan: "Xe tải 1.5 tấn",
  xe_tai_2_5_tan: "Xe tải 2 tấn",
  xe_tai_3_5_tan: "Xe tải 3.5 tấn",
  xe_tai_5_tan: "Xe tải 5 tấn",
  xe_tai_7_5_tan: "Xe tải 8 tấn",
  xe_tai_15_tan: "Xe tải 15 tấn",
  dau_keo_container: "Đầu kéo container",
};
const WEATHER_LABEL_MAP = {
  binh_thuong: "Bình thường",
  troi_mua: "Trời mưa",
};
let vehicleLabelMap = { ...DEFAULT_VEHICLE_LABEL_MAP };
let bookingVehicleLabelMapPromise = null;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function toLookupKey(value) {
  return normalizeText(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function getBookingServiceLabel(value) {
  const rawValue = normalizeText(value);
  if (!rawValue) return "";
  return SERVICE_LABEL_MAP[toLookupKey(rawValue)] || rawValue;
}

function getBookingScheduleTimeLabel(value) {
  const rawValue = normalizeText(value);
  if (!rawValue) return "";
  return SCHEDULE_TIME_LABEL_MAP[toLookupKey(rawValue)] || rawValue;
}

function getBookingVehicleLabel(value) {
  const rawValue = normalizeText(value);
  if (!rawValue) return "";
  return vehicleLabelMap[toLookupKey(rawValue)] || rawValue;
}

function getBookingWeatherLabel(value) {
  const rawValue = normalizeText(value);
  if (!rawValue) return "";
  return WEATHER_LABEL_MAP[toLookupKey(rawValue)] || rawValue;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  const rawValue = normalizeText(value);
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function parseNumber(value) {
  if (value == null || value === "") return 0;
  const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBookingDateOnly(value) {
  const rawValue = normalizeText(value);
  if (!rawValue) return "";
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatBookingScheduleLabel(dateValue, timeValue) {
  const dateText = formatBookingDateOnly(dateValue);
  const timeText = getBookingScheduleTimeLabel(timeValue);
  if (dateText && timeText) return `${dateText} • ${timeText}`;
  return dateText || timeText || "";
}

function normalizeBookingPricingBreakdown(value) {
  return parseJsonArray(value)
    .map((item, index, list) => {
      if (!item || typeof item !== "object") return null;

      const label = normalizeText(item.label || item.title || "");
      const amount = normalizeText(item.amount || item.value || "");
      const detail = normalizeText(item.detail || item.note || "");
      const amountValue = parseNumber(
        item.amount_value || item.amount || item.value || 0,
      );
      const isTotal =
        item.is_total === true ||
        /tong/i.test(label) ||
        (index === list.length - 1 && amountValue > 0);

      if (!label && !amount && !detail) return null;

      return {
        label: label || `Hạng mục ${index + 1}`,
        amount,
        amount_value: amountValue,
        detail,
        is_total: isTotal,
      };
    })
    .filter(Boolean);
}

function getBookingPricingSortRank(item) {
  if (item?.is_total) return 999;

  const label = normalizeText(item?.label || "").toLowerCase();
  if (!label) return 80;
  if (/dich vu|goi|co ban|van chuyen/.test(label)) return 10;
  if (/khoang cach|so km|quang duong/.test(label)) return 20;
  if (/loai xe|xe tai|xe/.test(label)) return 30;
  if (/mua|thoi tiet/.test(label)) return 40;
  if (/cuoi tuan|thu bay|chu nhat/.test(label)) return 50;
  return 60;
}

function getRenderableBookingPricingRows(value, options = {}) {
  const breakdown = Array.isArray(value)
    ? value.filter(Boolean)
    : normalizeBookingPricingBreakdown(value);
  const includeTotals = options?.includeTotals === true;
  const excludeLabelPatterns = Array.isArray(options?.excludeLabelPatterns)
    ? options.excludeLabelPatterns.filter((pattern) => pattern instanceof RegExp)
    : [];

  return breakdown
    .map((item, index) => ({ ...item, index }))
    .sort((left, right) => {
      const rankDiff = getBookingPricingSortRank(left) - getBookingPricingSortRank(right);
      return rankDiff !== 0 ? rankDiff : left.index - right.index;
    })
    .filter((item) => includeTotals || !item.is_total)
    .filter((item) => {
      const label = normalizeText(item?.label || "").toLowerCase();
      return !excludeLabelPatterns.some((pattern) => pattern.test(label));
    })
    .map(({ index, ...item }) => item);
}

function buildBookingVehicleLabelMapFromPricingData(pricingData) {
  const nextMap = { ...DEFAULT_VEHICLE_LABEL_MAP };
  const services = Array.isArray(pricingData) ? pricingData : [];

  services.forEach((serviceData) => {
    const vehicleEntries =
      typeof core.getPricingVehicleEntries === "function"
        ? core.getPricingVehicleEntries(serviceData)
        : [];

    vehicleEntries.forEach((entry) => {
      const slug = toLookupKey(entry?.slug || "");
      const label = normalizeText(entry?.ten_hien_thi || entry?.ten || "");
      if (!slug || !label) return;
      nextMap[slug] = label;
    });
  });

  return nextMap;
}

function setBookingVehicleLabelMap(nextMap) {
  const mergedMap = { ...DEFAULT_VEHICLE_LABEL_MAP };

  if (nextMap && typeof nextMap === "object") {
    Object.entries(nextMap).forEach(([key, value]) => {
      const normalizedKey = toLookupKey(key);
      const normalizedValue = normalizeText(value);
      if (!normalizedKey || !normalizedValue) return;
      mergedMap[normalizedKey] = normalizedValue;
    });
  }

  vehicleLabelMap = mergedMap;
  return vehicleLabelMap;
}

async function ensureBookingVehicleLabelMapLoaded() {
  if (bookingVehicleLabelMapPromise) {
    return bookingVehicleLabelMapPromise;
  }

  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return vehicleLabelMap;
  }

  bookingVehicleLabelMapPromise = fetch(
    typeof core.toPublicUrl === "function"
      ? core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json")
      : "assets/js/data/bang-gia-minh-bach.json",
    {
      method: "GET",
      credentials: "same-origin",
    },
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Cannot load vehicle labels: ${response.status}`);
      }
      return response.json();
    })
    .then((pricingData) =>
      setBookingVehicleLabelMap(
        buildBookingVehicleLabelMapFromPricingData(pricingData),
      ),
    )
    .catch((error) => {
      console.error("Cannot load booking vehicle label map:", error);
      return vehicleLabelMap;
    });

  return bookingVehicleLabelMapPromise;
}

async function updateBookingRow(orderId, payload = {}, options = {}) {
  const rowId = normalizeText(orderId);
  if (!rowId) {
    throw new Error("Thiếu id đơn hàng để cập nhật.");
  }

  const updateFn = getKrudUpdateFn();
  if (!updateFn) {
    throw new Error("Không tìm thấy API KRUD để cập nhật đơn hàng.");
  }

  const tableName =
    normalizeText(options?.table || bookingCrudTableName) ||
    bookingCrudTableName;
  const result = await Promise.resolve(
    updateFn(tableName, {
      ...(payload && typeof payload === "object" ? payload : {}),
      id: rowId,
    }, rowId),
  );

  if (
    result &&
    typeof result === "object" &&
    (result.success === false || result.error)
  ) {
    throw new Error(
      normalizeText(result.error || result.message || "") ||
        "Không thể cập nhật đơn hàng.",
    );
  }

  return result;
}

function buildBookingLifecyclePatch(order, action, payload = {}, options = {}) {
  const now = new Date().toISOString();
  const currentOrder = order && typeof order === "object" ? order : {};
  const nextPayload =
    payload && typeof payload === "object" ? { ...payload } : {};
  const actor =
    options?.actor && typeof options.actor === "object" ? options.actor : {};
  nextPayload.updated_at = normalizeText(nextPayload.updated_at || "") || now;

  const actorId = normalizeText(actor.id || "");
  const actorPhone = normalizeText(actor.phone || "");
  const actorName = normalizeText(actor.name || "");

  function applyProviderOwnershipPatch() {
    if (actorId) {
      nextPayload.provider_id = actorId;
      nextPayload.accepted_by_id = actorId;
    }
    if (actorPhone) {
      nextPayload.provider_phone = actorPhone;
      nextPayload.accepted_by_phone = actorPhone;
    }
    if (actorName) {
      nextPayload.provider_name = actorName;
      nextPayload.accepted_by_name = actorName;
    }
  }

  if (action === "accept") {
    nextPayload.trang_thai = "dang_xu_ly";
    nextPayload.accepted_at = now;
    applyProviderOwnershipPatch();
    return nextPayload;
  }

  if (action === "start") {
    nextPayload.trang_thai = "dang_xu_ly";
    nextPayload.started_at = now;
    if (!normalizeText(currentOrder.accepted_at || "")) {
      nextPayload.accepted_at = now;
    }
    applyProviderOwnershipPatch();
    return nextPayload;
  }

  if (action === "complete") {
    nextPayload.trang_thai = "da_xac_nhan";
    nextPayload.completed_at = now;
    if (!normalizeText(currentOrder.accepted_at || "")) {
      nextPayload.accepted_at = now;
    }
    if (!normalizeText(currentOrder.started_at || "")) {
      nextPayload.started_at = now;
    }
    applyProviderOwnershipPatch();
  }

  return nextPayload;
}

const bookingSharedModule = {
  bookingCrudTableName,
  buildBookingLifecyclePatch,
  formatBookingDateOnly,
  formatBookingScheduleLabel,
  buildBookingVehicleLabelMapFromPricingData,
  ensureBookingVehicleLabelMapLoaded,
  getRenderableBookingPricingRows,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
  getBookingVehicleLabel,
  getBookingWeatherLabel,
  normalizeBookingPricingBreakdown,
  setBookingVehicleLabelMap,
  updateBookingRow,
};

if (typeof window !== "undefined") {
  window.FastGoBookingShared = bookingSharedModule;
}

export {
  bookingCrudTableName,
  buildBookingLifecyclePatch,
  buildBookingVehicleLabelMapFromPricingData,
  ensureBookingVehicleLabelMapLoaded,
  formatBookingDateOnly,
  formatBookingScheduleLabel,
  getRenderableBookingPricingRows,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
  getBookingVehicleLabel,
  getBookingWeatherLabel,
  normalizeBookingPricingBreakdown,
  setBookingVehicleLabelMap,
  updateBookingRow,
};
export default bookingSharedModule;
