import {
  extractRows,
  getKrudListFn,
  getKrudUpdateFn,
} from "./api/krud-client.js";
import core from "./core/app-core.js";
import {
  ensureBookingVehicleLabelMapLoaded,
  formatBookingScheduleLabel,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
  getBookingVehicleLabel,
  getBookingWeatherLabel,
  normalizeBookingPricingBreakdown as normalizeSharedBookingPricingBreakdown,
  updateBookingRow,
} from "./main-booking-shared.js";
import {
  isCancelledBookingStatus,
  isConfirmedBookingStatus,
  isProcessingBookingStatus,
  validateCustomerCancelBooking,
  validateCustomerFeedbackBooking,
} from "./main-booking-actions.js";
import {
  notifyAuthSessionChanged,
  clearStoredAuthSession,
  readStoredAccess,
  readStoredIdentity,
  readStoredRole,
  safeParse,
  saveStoredAccess,
  saveStoredIdentity,
  storageKeys,
  writeStoredRole,
} from "./store/auth-session-store.js";

const customerPortalStoreModule = (function (window) {
  const bookingCrudTableName = "dich_vu_chuyen_don_dat_lich";
  const dvqtUserTable = "nguoidung";
  const movingServiceId = "12";
  const krudScriptUrl = "https://api.dvqt.vn/js/krud.js";
  const providerVehiclesStorageKey = "fastgo-moving-provider-vehicles";
  const providerOrderVehiclesStorageKey = "fastgo-moving-provider-order-vehicles";
  const AUTO_CANCEL_PENDING_MINUTES = 120;
  const AUTO_CANCEL_PENDING_MS = AUTO_CANCEL_PENDING_MINUTES * 60 * 1000;
  const AUTO_CANCEL_SWEEP_COOLDOWN_MS = 60 * 1000;
  const DEFAULT_PROVIDER_VEHICLE_LABEL_MAP = Object.freeze({
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
  });
  let krudScriptPromise = null;
  let autoCancelSweepPromise = null;
  let authRowsPromise = null;
  let lastAutoCancelSweepAt = 0;
  let providerVehicleCatalogPromise = null;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeLowerText(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function readStorageJson(key, fallback) {
    try {
      return safeParse(window.localStorage.getItem(key), fallback);
    } catch (error) {
      console.error("Cannot read moving portal storage payload:", error);
      return fallback;
    }
  }

  function writeStorageJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Cannot write moving portal storage payload:", error);
      return false;
    }
  }

  function normalizeVehicleKey(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function normalizeVehicleStatus(value) {
    const normalized = normalizeLowerText(value);
    if (["tam_ngung", "inactive", "disabled", "paused", "off"].includes(normalized)) {
      return "tam_ngung";
    }
    return "hoat_dong";
  }

  function normalizeLicensePlate(value) {
    return normalizeText(value).toUpperCase();
  }

  function toFlag(value) {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return value > 0 ? 1 : 0;
    const normalized = normalizeLowerText(value);
    return ["1", "true", "yes", "on", "mac_dinh", "default"].includes(normalized)
      ? 1
      : 0;
  }

  function getProviderVehicleLabel(value) {
    const normalizedKey = normalizeVehicleKey(value);
    return (
      DEFAULT_PROVIDER_VEHICLE_LABEL_MAP[normalizedKey] ||
      normalizeText(value) ||
      "Chưa cập nhật"
    );
  }

  function buildLocalProviderVehicleId() {
    return `mv_local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function isLegacyLocalProviderVehicleId(value) {
    return /^mv_/i.test(normalizeText(value));
  }

  function getProviderVehicleRecordKey(value) {
    if (value && typeof value === "object") {
      return normalizeText(
        value.id ||
          value.local_id ||
          value.local_key ||
          value.vehicle_local_id ||
          value.vehicle_key ||
          "",
      );
    }
    return normalizeText(value);
  }

  function mapProviderVehicleRecord(row) {
    if (!row || typeof row !== "object") return null;
    const loaiXe = normalizeVehicleKey(
      row.loai_xe || row.vehicle_type || row.loai_phuong_tien || "",
    );
    const tenHienThi = normalizeText(
      row.ten_hien_thi || row.vehicle_name || row.name || getProviderVehicleLabel(loaiXe),
    );
    const rawId = normalizeText(row.id || row.remote_id || "");
    const localId = normalizeText(
      row.local_id || row.local_key || row.vehicle_local_id || "",
    );
    const mappedId = isLegacyLocalProviderVehicleId(rawId) ? "" : rawId;
    const mappedLocalId = localId || (mappedId ? "" : rawId) || buildLocalProviderVehicleId();
    return {
      ...row,
      id: mappedId,
      local_id: mappedLocalId,
      provider_id: normalizeText(row.provider_id || row.user_id || row.shipper_id || ""),
      loai_xe: loaiXe,
      loai_xe_label: getProviderVehicleLabel(loaiXe),
      ten_hien_thi: tenHienThi,
      bien_so: normalizeLicensePlate(row.bien_so || row.license_plate || ""),
      trang_thai: normalizeVehicleStatus(row.trang_thai || row.status || ""),
      la_mac_dinh: toFlag(row.la_mac_dinh || row.is_default || row.mac_dinh),
      ghi_chu: normalizeText(row.ghi_chu || row.note || ""),
      created_at: normalizeText(row.created_at || row.created_date || ""),
      updated_at: normalizeText(row.updated_at || ""),
    };
  }

  function sortProviderVehicles(list) {
    return (Array.isArray(list) ? list : [])
      .slice()
      .sort((left, right) => {
        const defaultDelta = Number(right.la_mac_dinh || 0) - Number(left.la_mac_dinh || 0);
        if (defaultDelta !== 0) return defaultDelta;
        const activeDelta =
          (left.trang_thai === "hoat_dong" ? 0 : 1) -
          (right.trang_thai === "hoat_dong" ? 0 : 1);
        if (activeDelta !== 0) return activeDelta;
        const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
        const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
        if (rightTime !== leftTime) return rightTime - leftTime;
        return getProviderVehicleRecordKey(right).localeCompare(getProviderVehicleRecordKey(left));
      });
  }

  function readProviderVehicleState() {
    const state = readStorageJson(providerVehiclesStorageKey, {});
    return state && typeof state === "object" ? state : {};
  }

  function writeProviderVehicleState(state) {
    return writeStorageJson(providerVehiclesStorageKey, state && typeof state === "object" ? state : {});
  }

  function readProviderOrderVehicleState() {
    const state = readStorageJson(providerOrderVehiclesStorageKey, {});
    return state && typeof state === "object" ? state : {};
  }

  function writeProviderOrderVehicleState(state) {
    return writeStorageJson(
      providerOrderVehiclesStorageKey,
      state && typeof state === "object" ? state : {},
    );
  }

  function buildProviderOrderVehicleAssignmentKey(providerId, orderCode) {
    const normalizedProviderId = normalizeText(providerId);
    const normalizedOrderCode = normalizeText(orderCode).toLowerCase();
    return `${normalizedProviderId}::${normalizedOrderCode}`;
  }

  function pickPrimaryProviderVehicle(vehicles) {
    return sortProviderVehicles(vehicles)[0] || null;
  }

  async function listProviderVehicleCatalog() {
    if (providerVehicleCatalogPromise) return providerVehicleCatalogPromise;

    const fallbackCatalog = Object.entries(DEFAULT_PROVIDER_VEHICLE_LABEL_MAP).map(
      ([key, label]) => ({
        key,
        label,
      }),
    );

    providerVehicleCatalogPromise = (async () => {
      try {
        const url =
          typeof core.toPublicUrl === "function"
            ? core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json")
            : "assets/js/data/bang-gia-minh-bach.json";
        const response = await window.fetch(url, {
          method: "GET",
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`Cannot load moving vehicle catalog: ${response.status}`);
        }
        const pricingData = await response.json();
        const sourceList = Array.isArray(pricingData) ? pricingData : [];
        const seen = new Set();
        const catalog = [];

        sourceList.forEach((serviceData) => {
          const entries =
            typeof core.getPricingVehicleEntries === "function"
              ? core.getPricingVehicleEntries(serviceData)
              : [];
          entries.forEach((entry) => {
            const key = normalizeVehicleKey(entry?.slug || "");
            const label = normalizeText(entry?.ten_hien_thi || entry?.ten || "");
            if (!key || !label || seen.has(key)) return;
            seen.add(key);
            catalog.push({ key, label });
          });
        });

        return catalog.length ? catalog : fallbackCatalog;
      } catch (error) {
        console.error("Cannot load moving provider vehicle catalog:", error);
        return fallbackCatalog;
      }
    })();

    return providerVehicleCatalogPromise;
  }

  function listProviderVehicles(providerId = "") {
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    if (!normalizedProviderId) return [];
    const state = readProviderVehicleState();
    const vehicles = Array.isArray(state[normalizedProviderId]) ? state[normalizedProviderId] : [];
    return sortProviderVehicles(vehicles.map(mapProviderVehicleRecord).filter(Boolean));
  }

  function saveProviderVehicles(providerId, vehicles) {
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    if (!normalizedProviderId) return [];
    const nextVehicles = sortProviderVehicles(
      (Array.isArray(vehicles) ? vehicles : []).map(mapProviderVehicleRecord).filter(Boolean),
    );
    const state = readProviderVehicleState();
    state[normalizedProviderId] = nextVehicles;
    writeProviderVehicleState(state);
    return nextVehicles;
  }

  function clearProviderVehicleAssignmentsForVehicle(providerId, vehicleId) {
    const normalizedProviderId = normalizeText(providerId);
    const normalizedVehicleId = getProviderVehicleRecordKey(vehicleId);
    if (!normalizedProviderId || !normalizedVehicleId) return;
    const state = readProviderOrderVehicleState();
    let changed = false;
    Object.entries(state).forEach(([key, value]) => {
      if (
        key.startsWith(`${normalizedProviderId}::`) &&
        getProviderVehicleRecordKey(value) === normalizedVehicleId
      ) {
        delete state[key];
        changed = true;
      }
    });
    if (changed) {
      writeProviderOrderVehicleState(state);
    }
  }

  async function syncPrimaryProviderVehicle(providerId, vehicles = null) {
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    const nextVehicles = Array.isArray(vehicles)
      ? sortProviderVehicles(vehicles)
      : listProviderVehicles(normalizedProviderId);
    const primaryVehicle = pickPrimaryProviderVehicle(nextVehicles);
    const currentIdentity = readIdentity();

    if (
      currentIdentity &&
      normalizeText(currentIdentity.id || "") === normalizedProviderId
    ) {
      saveIdentity({
        ...currentIdentity,
        loai_phuong_tien: primaryVehicle?.loai_xe || "",
      });
    }

    if (!normalizedProviderId) return primaryVehicle;

    try {
      await ensureKrudRuntime();
      const updateFn = getKrudUpdateFn();
      const tableName = getAuthTableName("nha-cung-cap");
      if (updateFn && tableName) {
        await Promise.resolve(
          updateFn(
            tableName,
            {
              id: normalizedProviderId,
              loai_phuong_tien: primaryVehicle?.loai_xe || "",
              updated_at: new Date().toISOString(),
            },
            normalizedProviderId,
          ),
        );
      }
    } catch (error) {
      console.warn("Cannot sync moving provider primary vehicle to KRUD:", error);
    }

    return primaryVehicle;
  }

  function enforceProviderVehicleDefaults(providerId, preferredVehicleId = "") {
    const normalizedProviderId = normalizeText(providerId);
    if (!normalizedProviderId) return [];
    const vehicles = listProviderVehicles(normalizedProviderId);
    if (!vehicles.length) return [];

    let primaryVehicle = vehicles.find(
      (item) => getProviderVehicleRecordKey(item) === getProviderVehicleRecordKey(preferredVehicleId),
    );
    if (!primaryVehicle) {
      primaryVehicle =
        vehicles.find((item) => Number(item.la_mac_dinh || 0) === 1) ||
        pickPrimaryProviderVehicle(vehicles);
    }
    if (!primaryVehicle) return vehicles;

    return saveProviderVehicles(
      normalizedProviderId,
      vehicles.map((item) => ({
        ...item,
        la_mac_dinh:
          getProviderVehicleRecordKey(item) === getProviderVehicleRecordKey(primaryVehicle) ? 1 : 0,
      })),
    );
  }

  async function createProviderVehicle(providerId, payload = {}) {
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    if (!normalizedProviderId) {
      throw new Error("Thiếu mã NCC để thêm xe.");
    }

    const loaiXe = normalizeVehicleKey(
      payload.loai_xe || payload.vehicle_type || payload.loai_phuong_tien || "",
    );
    const tenHienThi = normalizeText(payload.ten_hien_thi || payload.vehicle_name || "");
    const bienSo = normalizeLicensePlate(payload.bien_so || payload.license_plate || "");
    if (!loaiXe || !tenHienThi || !bienSo) {
      throw new Error("Vui lòng nhập tên gợi nhớ, biển số và loại xe.");
    }

    const currentVehicles = listProviderVehicles(normalizedProviderId);
    if (currentVehicles.some((item) => normalizeLicensePlate(item.bien_so) === bienSo)) {
      throw new Error("Biển số xe này đã tồn tại trong danh sách của NCC.");
    }

    const createdAt = new Date().toISOString();
    const shouldBeDefault = toFlag(payload.la_mac_dinh) === 1 || currentVehicles.length === 0;
    const insertedVehicle = mapProviderVehicleRecord({
      local_id: buildLocalProviderVehicleId(),
      provider_id: normalizedProviderId,
      loai_xe: loaiXe,
      ten_hien_thi: tenHienThi,
      bien_so: bienSo,
      trang_thai: normalizeVehicleStatus(payload.trang_thai),
      la_mac_dinh: shouldBeDefault ? 1 : 0,
      ghi_chu: normalizeText(payload.ghi_chu || ""),
      created_at: createdAt,
      updated_at: createdAt,
    });

    let nextVehicles = saveProviderVehicles(normalizedProviderId, [
      ...currentVehicles,
      insertedVehicle,
    ]);
    if (shouldBeDefault) {
      nextVehicles = enforceProviderVehicleDefaults(
        normalizedProviderId,
        getProviderVehicleRecordKey(insertedVehicle),
      );
    }
    const primaryVehicle = await syncPrimaryProviderVehicle(normalizedProviderId, nextVehicles);

    const insertedVehicleKey = getProviderVehicleRecordKey(insertedVehicle);
    return {
      status: "success",
      vehicle:
        nextVehicles.find((item) => getProviderVehicleRecordKey(item) === insertedVehicleKey) ||
        insertedVehicle,
      vehicles: nextVehicles,
      primary_vehicle: primaryVehicle,
    };
  }

  async function updateProviderVehicle(vehicleId, providerId, patch = {}) {
    const normalizedVehicleId = getProviderVehicleRecordKey(vehicleId);
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    if (!normalizedVehicleId || !normalizedProviderId) {
      throw new Error("Thiếu mã xe hoặc mã NCC để cập nhật.");
    }

    const vehicles = listProviderVehicles(normalizedProviderId);
    const existingVehicle = vehicles.find(
      (item) => getProviderVehicleRecordKey(item) === normalizedVehicleId,
    );
    if (!existingVehicle) {
      throw new Error("Không tìm thấy xe để cập nhật.");
    }

    const loaiXe = normalizeVehicleKey(
      patch.loai_xe || patch.vehicle_type || patch.loai_phuong_tien || existingVehicle.loai_xe,
    );
    const tenHienThi = normalizeText(
      patch.ten_hien_thi || patch.vehicle_name || existingVehicle.ten_hien_thi,
    );
    const bienSo = normalizeLicensePlate(
      Object.prototype.hasOwnProperty.call(patch, "bien_so") ||
        Object.prototype.hasOwnProperty.call(patch, "license_plate")
        ? patch.bien_so || patch.license_plate || ""
        : existingVehicle.bien_so,
    );
    if (!loaiXe || !tenHienThi || !bienSo) {
      throw new Error("Vui lòng nhập tên gợi nhớ, biển số và loại xe.");
    }
    if (
      vehicles.some(
        (item) =>
          getProviderVehicleRecordKey(item) !== normalizedVehicleId &&
          normalizeLicensePlate(item.bien_so) === bienSo,
      )
    ) {
      throw new Error("Biển số xe này đã tồn tại trong danh sách của NCC.");
    }

    let nextVehicles = saveProviderVehicles(
      normalizedProviderId,
      vehicles.map((item) =>
        getProviderVehicleRecordKey(item) !== normalizedVehicleId
          ? item
          : {
              ...item,
              loai_xe: loaiXe,
              ten_hien_thi: tenHienThi,
              bien_so: bienSo,
              trang_thai: Object.prototype.hasOwnProperty.call(patch, "trang_thai")
                ? normalizeVehicleStatus(patch.trang_thai)
                : existingVehicle.trang_thai,
              la_mac_dinh: Object.prototype.hasOwnProperty.call(patch, "la_mac_dinh")
                ? toFlag(patch.la_mac_dinh)
                : Number(existingVehicle.la_mac_dinh || 0),
              ghi_chu: Object.prototype.hasOwnProperty.call(patch, "ghi_chu")
                ? normalizeText(patch.ghi_chu || "")
                : existingVehicle.ghi_chu,
              updated_at: new Date().toISOString(),
            },
      ),
    );

    const preferredVehicleId =
      Object.prototype.hasOwnProperty.call(patch, "la_mac_dinh") &&
      toFlag(patch.la_mac_dinh) === 1
        ? normalizedVehicleId
        : "";
    nextVehicles = enforceProviderVehicleDefaults(normalizedProviderId, preferredVehicleId);
    const primaryVehicle = await syncPrimaryProviderVehicle(normalizedProviderId, nextVehicles);

    return {
      status: "success",
      vehicle:
        nextVehicles.find((item) => getProviderVehicleRecordKey(item) === normalizedVehicleId) || null,
      vehicles: nextVehicles,
      primary_vehicle: primaryVehicle,
    };
  }

  async function deleteProviderVehicle(vehicleId, providerId) {
    const normalizedVehicleId = getProviderVehicleRecordKey(vehicleId);
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    if (!normalizedVehicleId || !normalizedProviderId) {
      throw new Error("Thiếu mã xe hoặc mã NCC để xóa.");
    }

    const vehicles = listProviderVehicles(normalizedProviderId);
    const nextVehicles = saveProviderVehicles(
      normalizedProviderId,
      vehicles.filter((item) => getProviderVehicleRecordKey(item) !== normalizedVehicleId),
    );
    clearProviderVehicleAssignmentsForVehicle(normalizedProviderId, normalizedVehicleId);
    const enforcedVehicles = enforceProviderVehicleDefaults(normalizedProviderId);
    const primaryVehicle = await syncPrimaryProviderVehicle(
      normalizedProviderId,
      enforcedVehicles.length ? enforcedVehicles : nextVehicles,
    );

    return {
      status: "success",
      vehicles: enforcedVehicles.length ? enforcedVehicles : nextVehicles,
      primary_vehicle: primaryVehicle,
    };
  }

  function getProviderOrderVehicleAssignment(providerId, orderCode) {
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    const normalizedOrderCode = normalizeText(orderCode);
    if (!normalizedProviderId || !normalizedOrderCode) return null;
    const state = readProviderOrderVehicleState();
    const key = buildProviderOrderVehicleAssignmentKey(
      normalizedProviderId,
      normalizedOrderCode,
    );
    const assignment = state[key];
    return assignment && typeof assignment === "object"
      ? mapProviderVehicleRecord({
          ...assignment,
          provider_id: normalizedProviderId,
        })
      : null;
  }

  function saveProviderOrderVehicleAssignment(providerId, orderCode, vehicle) {
    const normalizedProviderId =
      normalizeText(providerId) || normalizeText(readIdentity()?.id || "");
    const normalizedOrderCode = normalizeText(orderCode);
    const mappedVehicle = mapProviderVehicleRecord({
      ...(vehicle && typeof vehicle === "object" ? vehicle : {}),
      provider_id: normalizedProviderId,
    });
    const vehicleKey = getProviderVehicleRecordKey(mappedVehicle);
    if (!normalizedProviderId || !normalizedOrderCode || !vehicleKey) {
      return null;
    }

    const state = readProviderOrderVehicleState();
    const key = buildProviderOrderVehicleAssignmentKey(
      normalizedProviderId,
      normalizedOrderCode,
    );
    state[key] = {
      id: mappedVehicle.id,
      local_id: mappedVehicle.local_id,
      vehicle_key: vehicleKey,
      provider_id: normalizedProviderId,
      loai_xe: mappedVehicle.loai_xe,
      ten_hien_thi: mappedVehicle.ten_hien_thi,
      bien_so: mappedVehicle.bien_so,
      trang_thai: mappedVehicle.trang_thai,
      la_mac_dinh: mappedVehicle.la_mac_dinh,
      ghi_chu: mappedVehicle.ghi_chu,
      updated_at: new Date().toISOString(),
    };
    writeProviderOrderVehicleState(state);
    return mapProviderVehicleRecord(state[key]);
  }

  function splitServiceIds(value) {
    return String(value || "")
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function hasMovingServiceId(value) {
    return splitServiceIds(value).includes(movingServiceId);
  }

  function hasProviderCapability(source) {
    if (source && typeof source === "object") {
      return hasMovingServiceId(source.id_dichvu || "0");
    }

    return hasMovingServiceId(source);
  }

  const providedServiceLabelMap = Object.freeze({
    [movingServiceId]: "Dịch Vụ Chuyển Dọn",
  });

  function getProvidedServiceLabels(source) {
    const serviceIds = splitServiceIds(
      source && typeof source === "object" ? source.id_dichvu || "0" : source,
    );

    return serviceIds
      .map((serviceId) => providedServiceLabelMap[serviceId] || "")
      .filter(Boolean);
  }

  function readCookie(name) {
    const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(document.cookie || "").match(
      new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1] || "") : "";
  }

  function ensureKrudRuntime() {
    if (getKrudListFn()) {
      return Promise.resolve(true);
    }

    if (krudScriptPromise) {
      return krudScriptPromise;
    }

    krudScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${krudScriptUrl}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không thể nạp KRUD runtime.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = krudScriptUrl;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () =>
        reject(new Error("Không thể nạp KRUD runtime."));
      document.head.appendChild(script);
    }).finally(() => {
      krudScriptPromise = null;
    });

    return krudScriptPromise;
  }

  function resolveRoleFromProfile(profile) {
    const serviceIds = splitServiceIds(profile?.id_dichvu || "0");
    if (hasMovingServiceId(profile?.id_dichvu)) {
      return "nha-cung-cap";
    }

    const hasExplicitOtherService = serviceIds.some(
      (serviceId) => serviceId && serviceId !== "0",
    );
    if (hasExplicitOtherService) {
      return "khach-hang";
    }

    const normalizedRole = normalizeLowerText(profile?.role || profile?.vaitro || "");
    if (["nha-cung-cap", "doi-tac", "provider"].includes(normalizedRole)) {
      return "nha-cung-cap";
    }

    return "khach-hang";
  }

  function parseNumber(value) {
    if (value == null || value === "") return 0;
    const normalized = String(value)
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseDateMs(value) {
    const normalized = normalizeText(value);
    if (!normalized) return 0;

    const timestamp = new Date(normalized).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function extractTimeTokens(value) {
    return Array.from(
      String(value || "").matchAll(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g),
    ).map((match) => {
      const hour = Number(match[1] || 0);
      const minute = Number(match[2] || 0);
      const second = Number(match[3] || 0);
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
    });
  }

  function buildLocalDateTimeMs(dateValue, timeValue) {
    const dateText = normalizeText(dateValue).slice(0, 10);
    const timeText = normalizeText(timeValue);
    if (!dateText || !timeText) return 0;
    const timestamp = new Date(`${dateText}T${timeText}`).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function resolveBookingScheduleStartMs(row) {
    const source = row && typeof row === "object" ? row : {};
    const scheduleDate = normalizeText(source?.ngay_thuc_hien || "");
    if (!scheduleDate) return 0;

    const slotTokens = extractTimeTokens(
      source?.ten_khung_gio_thuc_hien || source?.khung_gio_thuc_hien || "",
    );
    if (slotTokens.length) {
      const scheduledAt = buildLocalDateTimeMs(scheduleDate, slotTokens[0]);
      if (scheduledAt) return scheduledAt;
    }

    return buildLocalDateTimeMs(scheduleDate, "00:00:00");
  }

  function formatRequestDateCode(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function formatSystemRequestCode(recordId, createdAt) {
    const numericId = Number(recordId);
    if (!Number.isFinite(numericId) || numericId <= 0) return "";
    const dateCode = formatRequestDateCode(createdAt || new Date());
    if (!dateCode) return "";
    return `CDL-${dateCode}-${String(Math.trunc(Math.abs(numericId))).padStart(7, "0")}`;
  }

  function resolveBookingRowCode(row) {
    const explicitCode = normalizeText(
      row?.ma_yeu_cau_noi_bo ||
        row?.ma_don_hang_noi_bo ||
        row?.order_code ||
        "",
    );
    if (explicitCode) return explicitCode;

    const fallbackSystemCode = formatSystemRequestCode(
      row?.id || row?.remote_id || "",
      row?.created_at || row?.created_date || "",
    );
    if (fallbackSystemCode) return fallbackSystemCode;

    return normalizeText(row?.id || row?.remote_id || "");
  }

  function getBookingRowLookupKeys(row) {
    return [
      resolveBookingRowCode(row),
      row?.ma_yeu_cau_noi_bo,
      row?.ma_don_hang_noi_bo,
      row?.order_code,
      row?.id,
      row?.remote_id,
    ]
      .map((value) => normalizeLowerText(value))
      .filter(Boolean);
  }

  function matchesBookingCode(row, code) {
    const normalizedCode = normalizeLowerText(code);
    if (!normalizedCode) return false;
    return getBookingRowLookupKeys(row).includes(normalizedCode);
  }

  function normalizeBookingReference(reference) {
    if (reference && typeof reference === "object") {
      return {
        id: normalizeText(reference.id || reference.remote_id || ""),
        code: normalizeText(reference.code || ""),
      };
    }

    return {
      id: "",
      code: normalizeText(reference || ""),
    };
  }

  function splitPipeValues(value) {
    return String(value || "")
      .split("|")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function joinPipeValues(values) {
    return (Array.isArray(values) ? values : [])
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join(" | ");
  }

  function parseJsonObject(value) {
    const parsed = safeParse(value, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }

  function parseJsonArray(value) {
    const parsed = safeParse(value, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function toLabelFromKey(key) {
    return String(key || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function isTruthyFlag(value) {
    if (value === true || value === 1) return true;
    const text = normalizeLowerText(value);
    return ["1", "true", "co", "có", "yes"].includes(text);
  }

  function containsSurveyFirstMarker(value) {
    const list = Array.isArray(value) ? value : splitPipeValues(value);
    return list.some((item) =>
      normalizeLowerText(item).includes("cần khảo sát trước"),
    );
  }

  function resolveSurveyFirstFlag(source) {
    if (!source || typeof source !== "object") return false;

    const formPayload =
      source.form_payload && typeof source.form_payload === "object"
        ? source.form_payload
        : parseJsonObject(source.du_lieu_form_json);

    return (
      isTruthyFlag(source.survey_first) ||
      isTruthyFlag(source.can_khao_sat_truoc) ||
      isTruthyFlag(formPayload.can_khao_sat_truoc) ||
      containsSurveyFirstMarker(
        source.service_details || source.chi_tiet_dich_vu,
      ) ||
      normalizeLowerText(source.type) === "khao-sat"
    );
  }

  const bookingFormFieldLabels = {
    loai_dich_vu: "Loại dịch vụ",
    can_khao_sat_truoc: "Khảo sát trước",
    ho_ten: "Người liên hệ",
    so_dien_thoai: "Số điện thoại",
    ten_cong_ty: "Tên công ty / đơn vị",
    dia_chi_di: "Địa chỉ điểm đi",
    dia_chi_den: "Địa chỉ điểm đến",
    ngay_thuc_hien: "Ngày thực hiện",
    khung_gio_thuc_hien: "Khung giờ thực hiện",
    khung_gio_tinh_gia: "Khung giờ tính giá",
    thoi_tiet_du_kien: "Thời tiết dự kiến",
    loai_xe: "Loại xe",
    ghi_chu: "Ghi chú",
    co_thang_may_diem_di: "Điểm đi có thang máy",
    co_thang_may_diem_den: "Điểm đến có thang máy",
    xe_tai_do_xa_diem_di: "Xe tải đỗ xa ở điểm đi",
    duong_cam_tai: "Đường cấm tải / giới hạn xe",
    co_thang_bo_hep: "Cầu thang bộ hẹp",
    can_trung_chuyen: "Cần trung chuyển",
    can_thao_lap_noi_that: "Cần tháo lắp",
    can_dong_goi_do_dac: "Cần đóng gói",
    co_do_gia_tri_cao: "Có đồ giá trị cao",
    co_do_de_vo: "Có đồ dễ vỡ",
    co_do_cong_kenh: "Có đồ cồng kềnh",
    can_dong_goi_ho_so: "Cần đóng gói hồ sơ",
    can_bao_mat_tai_lieu: "Bảo mật tài liệu",
    can_di_doi_server: "Di dời server / thiết bị IT",
    can_thao_lap_noi_that_van_phong: "Cần tháo lắp nội thất",
    co_thiet_bi_nang_van_phong: "Có thiết bị nặng",
    can_thuc_hien_cuoi_tuan: "Cần làm cuối tuần",
    can_luan_chuyen_pallet: "Cần luân chuyển pallet",
    can_xe_nang_dat_lich: "Cần xe nâng",
    can_xe_cau_dat_lich: "Cần xe cẩu",
    can_gia_co_hang_hoa: "Cần gia cố hàng hóa",
    co_hang_de_vo_kho_bai: "Có hàng dễ vỡ",
    co_hang_cong_kenh_kho_bai: "Có hàng cồng kềnh",
    co_hang_gia_tri_cao_kho_bai: "Có hàng giá trị cao",
    can_kiem_ke_hang_hoa: "Kiểm kê trước và sau chuyển",
  };

  function normalizeBookingFormRows(value) {
    const ignoredKeys = new Set([
      "vi_tri_diem_di_lat",
      "vi_tri_diem_di_lng",
      "vi_tri_diem_den_lat",
      "vi_tri_diem_den_lng",
    ]);

    return Object.entries(parseJsonObject(value))
      .filter(([key, rawValue]) => {
        if (ignoredKeys.has(key)) return false;
        return String(rawValue || "").trim() !== "";
      })
      .map(([key, rawValue]) => ({
        key,
        label: bookingFormFieldLabels[key] || toLabelFromKey(key),
        value:
          String(rawValue || "").trim() === "1"
            ? "Có"
            : normalizeText(rawValue),
      }))
      .filter((item) => item.value);
  }

  function normalizeHistoryItem(item) {
    const statusMeta = getBookingDisplayStatus(item, {
      includeExpiredPending: false,
    });
    const surveyFirst = resolveSurveyFirstFlag(item);

    return {
      code: normalizeText(item?.code || ""),
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: normalizeText(item?.title || ""),
      service_label: normalizeText(item?.service_label || ""),
      status_class: statusMeta.status_class,
      status_text: statusMeta.status_text,
      status_badge_class: statusMeta.badge_class,
      summary: normalizeText(item?.summary || ""),
      meta: normalizeText(item?.meta || ""),
      from_address: normalizeText(item?.from_address || ""),
      to_address: normalizeText(item?.to_address || ""),
      created_at: normalizeText(item?.created_at || new Date().toISOString()),
      schedule_label: normalizeText(item?.schedule_label || ""),
      estimated_amount: Number(item?.estimated_amount || 0),
      contact_name: normalizeText(item?.contact_name || ""),
      contact_phone: normalizeText(item?.contact_phone || ""),
      provider_name: normalizeText(item?.provider_name || ""),
      provider_phone: normalizeText(item?.provider_phone || ""),
      provider_address: normalizeText(item?.provider_address || ""),
      note: normalizeText(item?.note || ""),
      survey_first: surveyFirst,
      source: normalizeText(item?.source || "krud"),
      remote_id: normalizeText(item?.remote_id || item?.id || ""),
    };
  }

  function sortByCreatedAt(items) {
    return items.sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }

  function readIdentity() {
    const identity = readStoredIdentity();
    return identity && typeof identity === "object" ? identity : {};
  }

  function saveIdentity(payload) {
    return saveStoredIdentity(payload);
  }

  function syncStoredAccessFromCookies() {
    const loginIdentifier = normalizeText(readCookie("dvqt_u"));
    const password = String(readCookie("dvqt_p") || "").trim();
    if (!loginIdentifier || !password) return null;
    return saveStoredAccess({ loginIdentifier, password });
  }

  function syncStoredAccessFromCurrentUrl() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const loginIdentifier = normalizeText(params.get("sodienthoai") || "");
      const password = String(params.get("password") || "").trim();
      if (!loginIdentifier || !password) return null;
      return saveStoredAccess({ loginIdentifier, password });
    } catch (error) {
      console.error("Cannot sync auth access from current URL:", error);
      return null;
    }
  }

  const URL_AUTH_QUERY_KEYS = Object.freeze([
    "username",
    "sodienthoai",
    "password",
    "pass",
  ]);

  function cleanCurrentUrlAuthParams() {
    if (
      !window.history ||
      typeof window.history.replaceState !== "function"
    ) {
      return;
    }

    try {
      const cleanUrl = new URL(window.location.href);
      URL_AUTH_QUERY_KEYS.forEach((key) => {
        cleanUrl.searchParams.delete(key);
      });

      if (cleanUrl.toString() !== window.location.href) {
        window.history.replaceState(window.history.state, "", cleanUrl.toString());
      }
    } catch (error) {
      console.error("Cannot clean moving auth params from URL:", error);
    }
  }

  function hasCurrentUrlAuthParams() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return URL_AUTH_QUERY_KEYS.some((key) => params.has(key));
    } catch (error) {
      return false;
    }
  }

  function hasAccessCredentials(access) {
    return !!(
      normalizeText(
        access?.loginIdentifier || access?.username || access?.sodienthoai || "",
      ) &&
      String(access?.password || "").trim()
    );
  }

  function getAccessLoginIdentifier(access) {
    return normalizeText(
      access?.loginIdentifier || access?.username || access?.sodienthoai || "",
    );
  }

  function resolveCustomerBookingOwnership(row) {
    return {
      id: normalizeText(
        row?.customer_id || row?.booking_owner_id || row?.owner_customer_id || "",
      ),
      loginIdentifier: normalizeLowerText(
        row?.customer_username ||
          row?.customer_login_identifier ||
          row?.booking_owner_login ||
          row?.owner_customer_login ||
          "",
      ),
      phone: normalizePhone(row?.so_dien_thoai || row?.phone || ""),
    };
  }

  function getCurrentProviderActor(profile, access) {
    const identity =
      profile && typeof profile === "object" ? profile : readIdentity();
    const currentAccess =
      access && typeof access === "object" ? access : readStoredAccess();

    return {
      id: normalizeText(identity?.id || ""),
      loginIdentifier: normalizeLowerText(
        getAccessLoginIdentifier(currentAccess),
      ),
      phone: normalizePhone(identity?.sodienthoai || ""),
      name: normalizeText(
        identity?.hovaten || identity?.sodienthoai || "Nhà cung cấp",
      ),
    };
  }

  function isRowAssignedToProvider(row, actor = getCurrentProviderActor()) {
    const providerId = normalizeText(row?.provider_id || "");
    return !!(providerId && actor?.id && providerId === actor.id);
  }

  function canProviderAccessBookingRow(row, actor = getCurrentProviderActor()) {
    const providerId = normalizeText(row?.provider_id || "");
    if (!providerId) return true;
    return !!(actor?.id && providerId === actor.id);
  }

  function isRowOwnedByProviderActor(row, actor = getCurrentProviderActor()) {
    const customerOwner = resolveCustomerBookingOwnership(row);
    const providerActor =
      actor && typeof actor === "object" ? actor : getCurrentProviderActor();

    return !!(
      (customerOwner.id &&
        providerActor.id &&
        customerOwner.id === providerActor.id) ||
      (customerOwner.loginIdentifier &&
        providerActor.loginIdentifier &&
        customerOwner.loginIdentifier === providerActor.loginIdentifier) ||
      (customerOwner.phone &&
        providerActor.phone &&
        customerOwner.phone === providerActor.phone)
    );
  }

  function syncIdentityFromProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return readIdentity();
    }

    const nextRole = resolveRoleFromProfile(profile);
    writeStoredRole(nextRole);

    return saveIdentity({
      id: normalizeText(profile.id || ""),
      hovaten: normalizeText(profile.hovaten || ""),
      email: normalizeText(profile.email || ""),
      sodienthoai: normalizeText(profile.sodienthoai || ""),
      diachi: normalizeText(
        profile.diachi || profile.dia_chi || profile.address || "",
      ),
      id_dichvu: normalizeText(profile.id_dichvu || "0"),
      role: nextRole,
      trangthai: normalizeText(profile.trangthai || ""),
      link_avatar: normalizeText(profile.link_avatar || ""),
      link_cccd_truoc: normalizeText(profile.link_cccd_truoc || ""),
      link_cccd_sau: normalizeText(profile.link_cccd_sau || ""),
      ten_cong_ty: normalizeText(
        profile.ten_cong_ty || profile.company_name || "",
      ),
      ma_so_thue: normalizeText(
        profile.ma_so_thue || profile.tax_code || "",
      ),
      dia_chi_doanh_nghiep: normalizeText(
        profile.dia_chi_doanh_nghiep || profile.diachidonvi || "",
      ),
      loai_phuong_tien: normalizeText(
        profile.loai_phuong_tien || profile.vehicle_type || "",
      ),
    });
  }

  function getSavedRole() {
    try {
      const role = String(readStoredRole() || "")
        .trim()
        .toLowerCase();
      if (role === "doi-tac") return "nha-cung-cap";
      return role;
    } catch (error) {
      console.error("Cannot access saved role:", error);
      return "";
    }
  }

  function getDisplayName(identity) {
    const role = hasProviderCapability(identity)
      ? "nha-cung-cap"
      : getSavedRole();
    return (
      normalizeText(identity?.hovaten || "") ||
      normalizeText(identity?.sodienthoai || "") ||
      (role === "nha-cung-cap" ? "nhà cung cấp" : "khách hàng")
    );
  }

  function getBookingDisplayStatus(source, options = {}) {
    const row = source && typeof source === "object" ? source : {};
    const statusClass = normalizeLowerText(
      row?.status_class || row?.statusClass || "",
    );
    const statusText = normalizeLowerText(
      row?.status_text || row?.statusText || row?.status_label || "",
    );
    const rawStatus = normalizeLowerText(row?.trang_thai || row?.status || "");
    const acceptedAt = normalizeText(row?.accepted_at || row?.acceptedAt || "");
    const startedAt = normalizeText(row?.started_at || row?.startedAt || "");
    const completedAt = normalizeText(row?.completed_at || row?.completedAt || "");
    const cancelledAt = normalizeText(row?.cancelled_at || row?.cancelledAt || "");
    const includeExpiredPending = options?.includeExpiredPending !== false;
    const expiredPending =
      includeExpiredPending && isExpiredPendingBookingRow(row, options?.nowMs);

    if (
      cancelledAt ||
      expiredPending ||
      isCancelledBookingStatus(rawStatus) ||
      statusClass === "da-huy" ||
      statusClass === "cancelled" ||
      statusText === "đã hủy"
    ) {
      return {
        key: "cancelled",
        status_class: "da-huy",
        status_text: "Đã hủy",
        badge_class: "cancelled",
      };
    }

    if (
      completedAt ||
      ["completed", "delivered", "success", "da_xac_nhan", "xac_nhan"].includes(
        rawStatus,
      ) ||
      statusClass === "da-hoan-thanh" ||
      statusClass === "completed" ||
      statusClass === "xac-nhan" ||
      ["đã hoàn thành", "hoàn thành", "đã xác nhận"].includes(statusText)
    ) {
      return {
        key: "completed",
        status_class: "da-hoan-thanh",
        status_text: "Đã hoàn thành",
        badge_class: "completed",
      };
    }

    if (
      startedAt ||
      ["dang_trien_khai", "shipping", "started", "in_progress"].includes(
        rawStatus,
      ) ||
      statusClass === "dang-trien-khai" ||
      ["đang triển khai", "bắt đầu triển khai"].includes(statusText)
    ) {
      return {
        key: "shipping",
        status_class: "dang-trien-khai",
        status_text: "Đang triển khai",
        badge_class: "shipping",
      };
    }

    if (
      acceptedAt ||
      [
        "accepted",
        "receiving",
        "assigned",
        "da_nhan",
        "dang_xu_ly",
        "processing",
        "dang_dieu_phoi",
        "da_chot_lich",
      ].includes(rawStatus) ||
      statusClass === "da-nhan" ||
      statusClass === "dang-xu-ly" ||
      ["đã nhận đơn", "đang xử lý"].includes(statusText)
    ) {
      return {
        key: "accepted",
        status_class: "da-nhan",
        status_text: "Đã nhận đơn",
        badge_class: "accepted",
      };
    }

    return {
      key: "pending",
      status_class: "moi",
      status_text: "Mới tiếp nhận",
      badge_class: "pending",
    };
  }

  function getDashboardStats(items) {
    const list = Array.isArray(items) ? items : [];
    const counts = {
      pending_count: 0,
      accepted_count: 0,
      shipping_count: 0,
      completed_count: 0,
      cancelled_count: 0,
    };

    list.forEach((item) => {
      const statusMeta = getBookingDisplayStatus(item);
      if (statusMeta.key === "accepted") {
        counts.accepted_count += 1;
        return;
      }
      if (statusMeta.key === "shipping") {
        counts.shipping_count += 1;
        return;
      }
      if (statusMeta.key === "completed") {
        counts.completed_count += 1;
        return;
      }
      if (statusMeta.key === "cancelled") {
        counts.cancelled_count += 1;
        return;
      }
      counts.pending_count += 1;
    });

    const activeCount =
      counts.pending_count + counts.accepted_count + counts.shipping_count;
    const surveyCount = list.filter((item) => item.survey_first).length;
    return {
      total: list.length,
      open_count: activeCount,
      active_count: activeCount,
      confirmed_count: counts.completed_count,
      survey_count: surveyCount,
      ...counts,
    };
  }

  function clearAuthSession() {
    clearStoredAuthSession();
  }

  function normalizeAuthProfileRow(row) {
    if (!row || typeof row !== "object") return null;

    return {
      id: normalizeText(row.id || ""),
      role: resolveRoleFromProfile(row),
      hovaten: normalizeText(row.hovaten || ""),
      email: normalizeText(row.email || "").toLowerCase(),
      sodienthoai: normalizeText(row.sodienthoai || ""),
      diachi: normalizeText(row.diachi || row.dia_chi || row.address || ""),
      dia_chi: normalizeText(row.diachi || row.dia_chi || row.address || ""),
      id_dichvu: normalizeText(row.id_dichvu || "0"),
      trangthai: normalizeText(row.trangthai || "active"),
      link_avatar: normalizeText(row.link_avatar || row.avatar_link || ""),
      link_cccd_truoc: normalizeText(
        row.link_cccd_truoc || row.cccd_front_link || "",
      ),
      link_cccd_sau: normalizeText(
        row.link_cccd_sau || row.cccd_back_link || "",
      ),
      ten_cong_ty: normalizeText(row.ten_cong_ty || row.company_name || ""),
      ma_so_thue: normalizeText(row.ma_so_thue || row.tax_code || ""),
      loai_phuong_tien: normalizeText(
        row.loai_phuong_tien || row.vehicle_type || "",
      ),
    };
  }

  async function loadAuthRows() {
    if (authRowsPromise) {
      return authRowsPromise;
    }

    authRowsPromise = (async () => {
      let listFn = getKrudListFn();
      if (!listFn) {
        await ensureKrudRuntime();
        listFn = getKrudListFn();
      }
      if (!listFn) return [];

      const limit = 200;
      const maxPages = 5;
      const rows = [];

      for (let page = 1; page <= maxPages; page += 1) {
        let response;

        try {
          response = await Promise.resolve(
            listFn({
              table: dvqtUserTable,
              page,
              limit,
              sort: {
                id: "desc",
              },
            }),
          );
        } catch (error) {
          console.error("Cannot load auth rows from KRUD:", error);
          break;
        }

        const pageRows = extractRows(response);
        if (!pageRows.length) break;

        rows.push(...pageRows);
        if (pageRows.length < limit) break;
      }

      return rows;
    })().finally(() => {
      authRowsPromise = null;
    });

    return authRowsPromise;
  }

  function getProviderFallbackAddress(profileRow) {
    const region = normalizeText(
      profileRow?.region ||
        profileRow?.diachi ||
        profileRow?.dia_chi ||
        profileRow?.address ||
        "",
    );
    return region || "";
  }

  async function findProviderProfileForBooking(row) {
    const providerId = normalizeText(row?.provider_id || "");
    if (!providerId) return null;

    const rows = await loadAuthRows();
    return (
      rows.find((item) => {
        const rowId = normalizeText(item?.id || "");
        return providerId && rowId === providerId;
      }) || null
    );
  }

  async function hydrateAuthSessionFromDvqtCookie() {
    const urlAccess = syncStoredAccessFromCurrentUrl();
    if (hasAccessCredentials(urlAccess)) {
      const urlIdentity = await autoAuthFromUrlCredentials(urlAccess);
      if (urlIdentity) return urlIdentity;
      clearAuthSession();
      return null;
    }

    syncStoredAccessFromCookies();

    const identity = readIdentity();
    const hasLocalIdentity =
      normalizeText(identity?.id || "") ||
      normalizeText(identity?.sodienthoai || "");

    if (hasLocalIdentity) {
      return identity;
    }

    const cookiePhone = normalizePhone(readCookie("dvqt_u"));
    if (!cookiePhone) return null;

    let listFn = getKrudListFn();
    if (!listFn) {
      try {
        await ensureKrudRuntime();
      } catch (error) {
        console.error("Cannot prepare KRUD runtime for auth bootstrap:", error);
        return null;
      }
      listFn = getKrudListFn();
    }
    if (!listFn) return null;

    const limit = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: dvqtUserTable,
            page,
            limit,
            sort: {
              id: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot hydrate auth session from DVQT cookie:", error);
        return null;
      }

      const rows = extractRows(response);
      if (!rows.length) break;

      const matchedRow =
        rows.find((row) => {
          const rowPhone = normalizePhone(row.sodienthoai || "");
          return rowPhone && rowPhone === cookiePhone;
        }) || null;

      if (matchedRow) {
        return syncIdentityFromProfile(normalizeAuthProfileRow(matchedRow));
      }

      if (rows.length < limit) break;
    }

    return null;
  }

  async function bootstrapAuthSession() {
    const urlAccess = syncStoredAccessFromCurrentUrl();
    if (hasAccessCredentials(urlAccess)) {
      const urlIdentity = await autoAuthFromUrlCredentials(urlAccess);
      if (urlIdentity) {
        notifyAuthSessionChanged();
        return urlIdentity;
      }
      clearAuthSession();
      return null;
    }

    const cookiePhone = normalizePhone(readCookie("dvqt_u"));
    syncStoredAccessFromCookies();
    if (!cookiePhone) return null;

    const identity = readIdentity();
    const hasLocalIdentity =
      normalizeText(identity?.id || "") ||
      normalizeText(identity?.sodienthoai || "");

    if (hasLocalIdentity) {
      notifyAuthSessionChanged();
      return identity;
    }

    const hydratedIdentity = await hydrateAuthSessionFromDvqtCookie();
    if (hydratedIdentity) {
      notifyAuthSessionChanged();
    }
    return hydratedIdentity;
  }

  function normalizeLoginIdentifier(value) {
    return normalizePhone(value);
  }

  function matchesUrlLoginIdentifier(row, loginIdentifier) {
    const normalizedIdentifier = normalizeLoginIdentifier(loginIdentifier);
    if (!normalizedIdentifier) return false;

    const rowPhone = normalizePhone(row?.sodienthoai || "");
    return rowPhone && rowPhone === normalizedIdentifier;
  }

  async function autoAuthFromUrlCredentials(credentials = {}) {
    const loginIdentifier = normalizeText(
      credentials?.loginIdentifier ||
        credentials?.username ||
        credentials?.sodienthoai ||
        "",
    );
    const password = String(credentials?.password || "").trim();

    if (!loginIdentifier || !password) return null;

    let listFn = getKrudListFn();
    if (!listFn) {
      try {
        await ensureKrudRuntime();
      } catch (error) {
        console.error("Cannot prepare KRUD runtime for URL auth:", error);
        return null;
      }
      listFn = getKrudListFn();
    }
    if (!listFn) return null;

    const limit = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: dvqtUserTable,
            page,
            limit,
            sort: {
              id: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load URL auth profiles from KRUD:", error);
        return null;
      }

      const rows = extractRows(response);
      if (!rows.length) break;

      const matchedRow =
        rows.find((row) => {
          const storedPassword = String(row?.matkhau || "").trim();
          return (
            storedPassword &&
            storedPassword === password &&
            matchesUrlLoginIdentifier(row, loginIdentifier)
          );
        }) || null;

      if (matchedRow) {
        saveStoredAccess({
          loginIdentifier,
          password,
        });
        return syncIdentityFromProfile(normalizeAuthProfileRow(matchedRow));
      }

      if (rows.length < limit) break;
    }

    return null;
  }

  async function fetchCurrentAuthProfileFromKrud() {
    const currentIdentity = readIdentity();
    let listFn = getKrudListFn();
    if (!listFn) {
      try {
        await ensureKrudRuntime();
      } catch (error) {
        console.error("Cannot prepare KRUD runtime for current auth profile:", error);
        return null;
      }
      listFn = getKrudListFn();
    }
    const tableName = getAuthTableName(getSavedRole() || "khach-hang");
    const localId = normalizeText(currentIdentity.id || "");
    const localPhone = normalizePhone(currentIdentity.sodienthoai || "");

    if (!localId && !localPhone) return null;
    if (!listFn || !tableName) return null;

    const limit = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: tableName,
            page,
            limit,
            sort: {
              id: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load current auth profile from KRUD:", error);
        break;
      }

      const rows = extractRows(response);
      if (!rows.length) break;

      const matchedRow =
        rows.find((row) => {
          const rowId = normalizeText(row.id || "");
          const rowPhone = normalizePhone(row.sodienthoai || "");

          return (
            (localId && rowId === localId) ||
            (localPhone && rowPhone === localPhone)
          );
        }) || null;

      if (matchedRow) {
        return syncIdentityFromProfile(normalizeAuthProfileRow(matchedRow));
      }

      if (rows.length < limit) break;
    }

    return null;
  }

  async function requireVerifiedProfile() {
    await hydrateAuthSessionFromDvqtCookie();
    const profile = await fetchCurrentAuthProfileFromKrud();
    if (profile) return profile;

    clearAuthSession();
    throw new Error("Không tìm thấy tài khoản hiện tại trong bảng nguoidung.");
  }

  function getAuthTableName(role) {
    return dvqtUserTable;
  }

  function formatDateLabel(dateValue, timeValue) {
    return formatBookingScheduleLabel(dateValue, timeValue);
  }

  function isPendingBookingRow(row) {
    const rawStatus = normalizeLowerText(row?.trang_thai || row?.status || "");
    if (!rawStatus) return true;

    return (
      !isCancelledBookingStatus(rawStatus) &&
      !isConfirmedBookingStatus(rawStatus) &&
      !isProcessingBookingStatus(rawStatus)
    );
  }

  function isExpiredPendingBookingRow(row, nowMs = Date.now()) {
    if (!row || typeof row !== "object") return false;
    if (!normalizeText(row?.id || "")) return false;
    if (!isPendingBookingRow(row)) return false;

    if (
      normalizeText(row?.accepted_at || "") ||
      normalizeText(row?.started_at || "") ||
      normalizeText(row?.completed_at || "") ||
      normalizeText(row?.cancelled_at || "")
    ) {
      return false;
    }

    const createdMs = parseDateMs(row?.created_at || row?.created_date || "");
    if (!createdMs) return false;

    return nowMs - createdMs >= AUTO_CANCEL_PENDING_MS;
  }

  async function updateBookingAsCancelled(rawRow, cancelledAt, cancelReason = "") {
    const rowId = normalizeText(rawRow?.id || "");
    if (!rowId) return false;
    const resolvedCancelReason =
      normalizeText(cancelReason) || "Khách hàng chủ động hủy yêu cầu chuyển dọn.";

    const statusPayload = {
      trang_thai: "da_huy",
      ly_do_huy: resolvedCancelReason,
      cancel_reason: resolvedCancelReason,
      updated_at: cancelledAt,
    };
    const milestonePayload = {
      ...statusPayload,
      cancelled_at: cancelledAt,
    };

    try {
      await updateBookingRow(rowId, statusPayload, {
        table: bookingCrudTableName,
      });
    } catch (error) {
      throw new Error(
        error?.message || "Không thể cập nhật trạng thái hủy cho đơn hàng.",
      );
    }

    try {
      await updateBookingRow(
        rowId,
        milestonePayload,
        {
          table: bookingCrudTableName,
        },
      );
    } catch (error) {
      console.warn(
        "Cannot persist cancelled_at for booking, keeping trang_thai only:",
        error,
      );
    }

    return true;
  }

  async function autoCancelExpiredBookings(options = {}) {
    const force = options?.force === true;
    const nowMs = Date.now();

    if (!force && nowMs - lastAutoCancelSweepAt < AUTO_CANCEL_SWEEP_COOLDOWN_MS) {
      return { updatedCount: 0, skipped: true };
    }

    if (autoCancelSweepPromise) {
      return autoCancelSweepPromise;
    }

    autoCancelSweepPromise = (async () => {
      const listFn = getKrudListFn();
      if (!listFn) {
        lastAutoCancelSweepAt = Date.now();
        return { updatedCount: 0, skipped: true };
      }

      const limit = 200;
      const maxPages = 10;
      const expiredRows = [];

      for (let page = 1; page <= maxPages; page += 1) {
        let response;

        try {
          response = await Promise.resolve(
            listFn({
              table: bookingCrudTableName,
              page,
              limit,
              sort: {
                created_at: "desc",
              },
            }),
          );
        } catch (error) {
          console.error("Cannot scan booking rows for auto cancel:", error);
          break;
        }

        const pageRows = extractRows(response);
        if (!pageRows.length) break;

        expiredRows.push(
          ...pageRows.filter((row) => isExpiredPendingBookingRow(row, nowMs)),
        );
        if (pageRows.length < limit) break;
      }

      let updatedCount = 0;
      const cancelledAt = new Date(nowMs).toISOString();

      for (const row of expiredRows) {
        try {
          await updateBookingAsCancelled(row, cancelledAt);
          updatedCount += 1;
        } catch (error) {
          console.error("Cannot auto cancel expired booking:", error);
        }
      }

      lastAutoCancelSweepAt = Date.now();
      return { updatedCount, skipped: false };
    })().finally(() => {
      autoCancelSweepPromise = null;
    });

    return autoCancelSweepPromise;
  }

  function getBookingStatusMeta(row) {
    return getBookingDisplayStatus(row);
  }

  function buildBookingSummary(row, statusText, surveyFirst) {
    if (statusText === "Đã hoàn thành") {
      return surveyFirst
        ? "Yêu cầu có khảo sát trước đã được triển khai và hoàn thành trên hệ thống."
        : "Yêu cầu đặt lịch đã được triển khai và hoàn thành trên hệ thống.";
    }

    if (statusText === "Đang triển khai") {
      return surveyFirst
        ? "Nhà cung cấp đang triển khai công việc sau bước nhận đơn và khảo sát."
        : "Nhà cung cấp đang triển khai công việc theo phương án xe và tuyến đường đã chốt.";
    }

    if (statusText === "Đã nhận đơn") {
      return surveyFirst
        ? "Nhà cung cấp đã nhận đơn và đang chuẩn bị bước khảo sát hoặc triển khai thực tế."
        : "Nhà cung cấp đã nhận đơn và đang chuẩn bị triển khai thực tế.";
    }

    if (statusText === "Đã hủy") {
      return "Yêu cầu đặt lịch đã được đánh dấu hủy trên hệ thống và được giữ lại trong lịch sử theo dõi.";
    }

    return surveyFirst
      ? "Yêu cầu đặt lịch có khảo sát trước đã được lưu lên hệ thống và sẵn sàng cho bước điều phối tiếp theo."
      : "Yêu cầu đặt lịch đã được lưu lên hệ thống và sẵn sàng cho bước điều phối tiếp theo.";
  }

  function mapKrudBookingToHistoryItem(row) {
    const statusMeta = getBookingStatusMeta(row);
    const surveyFirst = resolveSurveyFirstFlag(row);
    const code = resolveBookingRowCode(row);
    const serviceLabel = getBookingServiceLabel(
      row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn",
    );
    const vehicleLabel = getBookingVehicleLabel(
      row?.loai_xe || row?.ten_loai_xe || "",
    );
    const contactName = normalizeText(row?.ho_ten || row?.contact_name || "");
    const contactPhone = normalizeText(row?.so_dien_thoai || row?.phone || "");

    return normalizeHistoryItem({
      code,
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: `Đặt lịch ${serviceLabel || "chuyển dọn"}`,
      service_label: serviceLabel,
      status_class: statusMeta.status_class,
      status_text: statusMeta.status_text,
      summary: buildBookingSummary(row, statusMeta.status_text, surveyFirst),
      meta: surveyFirst
        ? "Đã đánh dấu cần khảo sát trước khi triển khai."
        : normalizeText(row?.ten_cong_ty || row?.ghi_chu || ""),
      from_address: normalizeText(row?.dia_chi_di || ""),
      to_address: normalizeText(row?.dia_chi_den || ""),
      created_at: normalizeText(
        row?.created_at || row?.created_date || new Date().toISOString(),
      ),
      schedule_label: formatDateLabel(
        row?.ngay_thuc_hien,
        row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien,
      ),
      estimated_amount: Number(row?.tong_tam_tinh || 0),
      contact_name: contactName,
      contact_phone: contactPhone,
      provider_name: "",
      provider_phone: "",
      provider_address: "",
      note: normalizeText(row?.ghi_chu || ""),
      survey_first: surveyFirst,
      source: "krud",
      remote_id: normalizeText(row?.id || ""),
    });
  }

  function normalizeBookingInvoiceDetail(rawRow, requestItem) {
    const row = rawRow && typeof rawRow === "object" ? rawRow : {};
    const fallbackRequest = requestItem
      ? normalizeHistoryItem(requestItem)
      : null;
    const mappedRequest =
      row && Object.keys(row).length
        ? mapKrudBookingToHistoryItem(row)
        : fallbackRequest;
    const request =
      mappedRequest && fallbackRequest
        ? {
            ...fallbackRequest,
            ...mappedRequest,
            summary: normalizeText(
              mappedRequest.summary || fallbackRequest.summary || "",
            ),
            meta: normalizeText(
              mappedRequest.meta || fallbackRequest.meta || "",
            ),
            note: normalizeText(
              mappedRequest.note || fallbackRequest.note || "",
            ),
          }
        : mappedRequest || fallbackRequest;
    const formRows = normalizeBookingFormRows(row?.du_lieu_form_json);
    const pricingBreakdown = normalizeSharedBookingPricingBreakdown(
      row?.pricing_breakdown_json,
    );

    return {
      code: normalizeText(
        resolveBookingRowCode(row) || request?.code || row?.id || "",
      ),
      remote_id: normalizeText(row?.id || request?.remote_id || ""),
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: normalizeText(
        request?.title || "Hóa đơn chi tiết đặt lịch chuyển dọn",
      ),
      service_label: normalizeText(
        getBookingServiceLabel(
          row?.ten_dich_vu ||
            request?.service_label ||
            row?.loai_dich_vu ||
            "Chuyển dọn",
        ),
      ),
      status_class: normalizeText(request?.status_class || "moi") || "moi",
      status_text:
        normalizeText(request?.status_text || "Mới tiếp nhận") ||
        "Mới tiếp nhận",
      summary: normalizeText(request?.summary || ""),
      created_at: normalizeText(
        row?.created_at || row?.created_date || request?.created_at || "",
      ),
      schedule_label: normalizeText(
        request?.schedule_label ||
          formatDateLabel(
            row?.ngay_thuc_hien,
            row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien,
          ) ||
          "",
      ),
      estimated_amount: Number(
        row?.tong_tam_tinh || request?.estimated_amount || 0,
      ),
      contact_name: normalizeText(row?.ho_ten || request?.contact_name || ""),
      contact_phone: normalizeText(
        row?.so_dien_thoai || request?.contact_phone || "",
      ),
      customer_email: normalizeText(row?.customer_email || ""),
      company_name: normalizeText(row?.ten_cong_ty || ""),
      from_address: normalizeText(
        row?.dia_chi_di || request?.from_address || "",
      ),
      to_address: normalizeText(row?.dia_chi_den || request?.to_address || ""),
      schedule_date: normalizeText(row?.ngay_thuc_hien || ""),
      schedule_time: normalizeText(
        getBookingScheduleTimeLabel(
          row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien || "",
        ),
      ),
      weather_label: normalizeText(
        getBookingWeatherLabel(
          row?.ten_thoi_tiet_du_kien || row?.thoi_tiet_du_kien || "",
        ),
      ),
      vehicle_label: normalizeText(
        getBookingVehicleLabel(row?.loai_xe || row?.ten_loai_xe || ""),
      ),
      distance_km: parseNumber(row?.khoang_cach_km || 0),
      access_conditions: splitPipeValues(row?.dieu_kien_tiep_can),
      service_details: splitPipeValues(row?.chi_tiet_dich_vu),
      note: normalizeText(row?.ghi_chu || request?.note || ""),
      meta: normalizeText(request?.meta || ""),
      pricing_breakdown: pricingBreakdown,
      booking_image_attachments: splitPipeValues(row?.anh_dinh_kem),
      booking_video_attachments: splitPipeValues(row?.video_dinh_kem),
      image_attachments: splitPipeValues(row?.anh_dinh_kem),
      video_attachments: splitPipeValues(row?.video_dinh_kem),
      customer_feedback_image_attachments: splitPipeValues(
        row?.customer_feedback_anh_dinh_kem ||
          row?.customer_feedback_image_attachments,
      ),
      customer_feedback_video_attachments: splitPipeValues(
        row?.customer_feedback_video_dinh_kem ||
          row?.customer_feedback_video_attachments,
      ),
      provider_report_image_attachments: splitPipeValues(
        row?.provider_report_anh_dinh_kem ||
          row?.provider_note_anh_dinh_kem ||
          row?.provider_report_image_attachments,
      ),
      provider_report_video_attachments: splitPipeValues(
        row?.provider_report_video_dinh_kem ||
          row?.provider_note_video_dinh_kem ||
          row?.provider_report_video_attachments,
      ),
      provider_note: normalizeText(row?.provider_note || ""),
      provider_name: "",
      provider_phone: "",
      provider_address: "",
      accepted_at: normalizeText(row?.accepted_at || ""),
      started_at: normalizeText(row?.started_at || ""),
      completed_at: normalizeText(row?.completed_at || ""),
      cancelled_at: normalizeText(row?.cancelled_at || ""),
      customer_feedback: normalizeText(row?.customer_feedback || ""),
      customer_rating: parseNumber(row?.customer_rating || 0),
      form_rows: formRows,
      form_payload: parseJsonObject(row?.du_lieu_form_json),
      source: normalizeText(request?.source || "krud"),
      request,
      raw_row: row,
    };
  }

  function isRowOwnedByIdentity(
    row,
    identity = readIdentity(),
    access = readStoredAccess(),
  ) {
    const customerOwner = resolveCustomerBookingOwnership(row);
    const identityId = normalizeText(identity?.id || "");
    const accessLoginIdentifier = normalizeLowerText(
      getAccessLoginIdentifier(access),
    );
    const identityPhone = normalizePhone(identity?.sodienthoai || "");

    return !!(
      (customerOwner.id && identityId && customerOwner.id === identityId) ||
      (customerOwner.loginIdentifier &&
        accessLoginIdentifier &&
        customerOwner.loginIdentifier === accessLoginIdentifier) ||
      (customerOwner.phone &&
        identityPhone &&
        customerOwner.phone === identityPhone)
    );
  }

  function mergeHistoryItems(items) {
    const unique = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
      const normalized = normalizeHistoryItem(item);
      if (!normalized.code) return;

      const key = normalizeLowerText(normalized.code);
      const current = unique.get(key);
      if (!current || normalized.source === "krud") {
        unique.set(key, normalized);
      }
    });

    return sortByCreatedAt(Array.from(unique.values()));
  }

  async function fetchKrudBookingItems(identity) {
    await ensureBookingVehicleLabelMapLoaded();
    const listFn = getKrudListFn();
    if (!listFn) return [];

    const profile =
      identity && typeof identity === "object" ? identity : readIdentity();
    const access = readStoredAccess();
    const hasLookupIdentity =
      normalizeText(profile?.id || "") ||
      getAccessLoginIdentifier(access) ||
      normalizeText(profile?.sodienthoai || "");
    if (!hasLookupIdentity) return [];

    const limit = 200;
    const maxPages = 10;
    const rows = [];

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: bookingCrudTableName,
            page,
            limit,
            sort: {
              created_at: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load booking records from KRUD:", error);
        break;
      }

      const pageRows = extractRows(response);
      if (!pageRows.length) break;

      rows.push(
        ...pageRows.filter((row) => isRowOwnedByIdentity(row, profile, access)),
      );
      if (pageRows.length < limit) break;
    }

    return mergeHistoryItems(
      rows.map(mapKrudBookingToHistoryItem),
    );
  }

  async function findKrudBookingRow(reference, identity) {
    await autoCancelExpiredBookings();
    const listFn = getKrudListFn();
    if (!listFn) return null;

    const bookingRef = normalizeBookingReference(reference);
    const normalizedCode = normalizeLowerText(bookingRef.code);
    const normalizedId = normalizeText(bookingRef.id);
    if (!normalizedId && !normalizedCode) return null;

    const profile =
      identity && typeof identity === "object" ? identity : readIdentity();
    const access = readStoredAccess();
    const hasLookupIdentity =
      normalizeText(profile?.id || "") ||
      getAccessLoginIdentifier(access) ||
      normalizeText(profile?.sodienthoai || "");
    if (!hasLookupIdentity) return null;

    const limit = 200;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: bookingCrudTableName,
            page,
            limit,
            sort: {
              created_at: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load booking detail from KRUD:", error);
        return null;
      }

      const pageRows = extractRows(response);
      if (!pageRows.length) break;

      const matchedRow = pageRows.find((row) => {
        const rowId = normalizeText(row?.id || row?.remote_id || "");
        return (
          isRowOwnedByIdentity(row, profile, access) &&
          ((normalizedId && rowId === normalizedId) ||
            (normalizedCode && matchesBookingCode(row, normalizedCode)))
        );
      });

      if (matchedRow) {
        return matchedRow;
      }

      if (pageRows.length < limit) break;
    }

    return null;
  }

  async function getAllHistoryItems(profile) {
    await autoCancelExpiredBookings();
    const identity =
      profile && typeof profile === "object"
        ? syncIdentityFromProfile(profile)
        : await requireVerifiedProfile();
    const krudBookingItems = await fetchKrudBookingItems(identity);
    return mergeHistoryItems(krudBookingItems);
  }

  async function fetchProfile() {
    const profile = await requireVerifiedProfile();
    return profile || null;
  }

  async function fetchDashboard() {
    const profile = await requireVerifiedProfile();
    const items = await getAllHistoryItems(profile);
    return {
      profile,
      stats: getDashboardStats(items),
      recent_requests: items.slice(0, 3),
    };
  }

  async function fetchHistory() {
    const profile = await requireVerifiedProfile();
    return {
      profile,
      history: await getAllHistoryItems(profile),
    };
  }

  async function fetchDetail(code) {
    const profile = await requireVerifiedProfile();
    const normalizedCode = normalizeLowerText(code);
    const history = await getAllHistoryItems(profile);
    return {
      profile,
      request:
        history.find(
          (item) => normalizeLowerText(item.code) === normalizedCode,
        ) || null,
    };
  }

  async function fetchBookingInvoiceDetail(code) {
    const profile = await requireVerifiedProfile();
    await ensureBookingVehicleLabelMapLoaded();
    const rawRow = await findKrudBookingRow(code, profile);
    const providerProfile = rawRow
      ? await findProviderProfileForBooking(rawRow)
      : null;
    const invoice = rawRow ? normalizeBookingInvoiceDetail(rawRow, null) : null;

    if (!invoice) {
      return {
        profile,
        request: null,
        invoice: null,
      };
    }

    const providerName = normalizeText(
      invoice.provider_name ||
        providerProfile?.hovaten ||
        providerProfile?.name ||
        "",
    );
    const providerPhone = normalizeText(
      invoice.provider_phone ||
        providerProfile?.sodienthoai ||
        providerProfile?.phone ||
        "",
    );
    const providerAddress = normalizeText(
      invoice.provider_address || getProviderFallbackAddress(providerProfile),
    );
    const hydratedInvoice = {
      ...invoice,
      provider_name: providerName,
      provider_phone: providerPhone,
      provider_address: providerAddress || "Chưa cập nhật",
    };

    return {
      profile,
      request: hydratedInvoice.request || null,
      invoice: hydratedInvoice,
    };
  }

  async function cancelBooking(reference, options = {}) {
    const bookingRef = normalizeBookingReference(reference);
    if (!bookingRef.id && !bookingRef.code) {
      throw new Error("Thiếu mã yêu cầu để hủy đơn.");
    }

    const profile = syncIdentityFromProfile(readIdentity());
    const rawRow = await findKrudBookingRow(bookingRef, profile);
    if (!rawRow || !normalizeText(rawRow.id || "")) {
      throw new Error("Không tìm thấy yêu cầu phù hợp để hủy.");
    }

    const scheduleStartMs = resolveBookingScheduleStartMs(rawRow);
    const nowMs = Date.now();
    try {
      validateCustomerCancelBooking(rawRow, {
        scheduleStartMs,
        nowMs,
      });
    } catch (error) {
      throw error;
    }

    const updatedAt = new Date().toISOString();
    const cancelReason =
      normalizeText(options?.cancel_reason || options?.reason || "") ||
      "Khách hàng chủ động hủy yêu cầu chuyển dọn.";
    await ensureBookingVehicleLabelMapLoaded();

    await updateBookingAsCancelled(rawRow, updatedAt, cancelReason);
    const patchedRow = {
      ...rawRow,
      trang_thai: "da_huy",
      ly_do_huy: cancelReason,
      cancel_reason: cancelReason,
      cancelled_at: updatedAt,
      updated_at: updatedAt,
    };
    const patchedInvoice = normalizeBookingInvoiceDetail(patchedRow, null);

    try {
      const refreshed = await fetchBookingInvoiceDetail({
        id: normalizeText(rawRow?.id || ""),
        code: resolveBookingRowCode(rawRow),
      });
      if (normalizeLowerText(refreshed?.invoice?.status_class || "") === "da-huy") {
        return refreshed;
      }
    } catch (error) {}

    return {
      profile,
      request: patchedInvoice.request || null,
      invoice: patchedInvoice,
    };
  }

  async function saveBookingFeedback(reference, payload) {
    const bookingRef = normalizeBookingReference(reference);
    if (!bookingRef.id && !bookingRef.code) {
      throw new Error("Thiếu mã yêu cầu để lưu đánh giá.");
    }

    const profile = syncIdentityFromProfile(readIdentity());
    const rawRow = await findKrudBookingRow(bookingRef, profile);
    if (!rawRow || !normalizeText(rawRow.id || "")) {
      throw new Error("Không tìm thấy yêu cầu phù hợp để lưu đánh giá.");
    }

    validateCustomerFeedbackBooking(rawRow);

    const rawRating = Number(payload?.customer_rating || 0);
    const customerRating = Number.isFinite(rawRating)
      ? Math.min(5, Math.max(0, Math.round(rawRating)))
      : 0;
    const nextFeedbackImageAttachments = Array.isArray(
      payload?.customer_feedback_image_attachments,
    )
      ? payload.customer_feedback_image_attachments
      : splitPipeValues(
          rawRow?.customer_feedback_anh_dinh_kem ||
            rawRow?.customer_feedback_image_attachments,
        );
    const nextFeedbackVideoAttachments = Array.isArray(
      payload?.customer_feedback_video_attachments,
    )
      ? payload.customer_feedback_video_attachments
      : splitPipeValues(
          rawRow?.customer_feedback_video_dinh_kem ||
            rawRow?.customer_feedback_video_attachments,
        );

    await updateBookingRow(
      rawRow.id,
      {
        id: rawRow.id,
        customer_feedback: normalizeText(payload?.customer_feedback || ""),
        customer_rating: customerRating,
        customer_feedback_anh_dinh_kem: joinPipeValues(
          nextFeedbackImageAttachments,
        ),
        customer_feedback_video_dinh_kem: joinPipeValues(
          nextFeedbackVideoAttachments,
        ),
        updated_at: new Date().toISOString(),
      },
      {
        table: bookingCrudTableName,
      },
    );

    return fetchBookingInvoiceDetail({
      id: normalizeText(rawRow?.id || ""),
      code: resolveBookingRowCode(rawRow),
    });
  }

  async function updateProfile(payload) {
    const currentIdentity = readIdentity();
    const mediaPayload = {};
    const warnings = [];
    const avatarFile = payload?.avatar_file;
    const cccdFrontFile = payload?.cccd_front_file;
    const cccdBackFile = payload?.cccd_back_file;
    const safeToken = (value, fallback = "unknown") =>
      String(value == null ? "" : value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || fallback;
    const padNumber = (value) => String(value).padStart(2, "0");
    const timestamp = (() => {
      const now = new Date();
      return (
        now.getFullYear() +
        padNumber(now.getMonth() + 1) +
        padNumber(now.getDate()) +
        "_" +
        padNumber(now.getHours()) +
        padNumber(now.getMinutes()) +
        padNumber(now.getSeconds())
      );
    })();
    const savedRole = getSavedRole() || "khach-hang";
    const profileRole = savedRole === "nha-cung-cap" ? "provider" : "customer";
    const profileRef = safeToken(
      currentIdentity.id ||
        payload?.sodienthoai ||
        currentIdentity.sodienthoai ||
        "guest",
      "guest",
    );
    const buildProfileFileName = (file, assetType) => {
      const originalName = String(file?.name || "").trim();
      const extMatch = originalName.match(/(\.[a-z0-9]+)$/i);
      const extension = extMatch ? extMatch[1].toLowerCase() : "";
      return `profile_chuyendon_${profileRole}_${profileRef}_${assetType}_${timestamp}${extension}`;
    };

    if (avatarFile instanceof File && avatarFile.size) {
      try {
        const uploadedAvatar = await core.uploadFileToDrive(avatarFile, {
          name: buildProfileFileName(avatarFile, "avatar"),
          proxyFile:
            savedRole === "nha-cung-cap"
              ? "nha-cung-cap/upload.php"
              : "khach-hang/upload.php",
          uploadKind: "avatar",
        });
        mediaPayload.link_avatar = normalizeText(
          uploadedAvatar?.fileId || uploadedAvatar?.id || "",
        );
      } catch (error) {
        console.error("Cannot upload profile avatar to Drive:", error);
        warnings.push("Ảnh đại diện chưa được tải lên Google Drive.");
      }
    }

    if (cccdFrontFile instanceof File && cccdFrontFile.size) {
      try {
        const uploadedFront = await core.uploadFileToDrive(cccdFrontFile, {
          name: buildProfileFileName(cccdFrontFile, "cccd_front"),
          proxyFile:
            savedRole === "nha-cung-cap"
              ? "nha-cung-cap/upload.php"
              : "khach-hang/upload.php",
          uploadKind: "cccd",
        });
        mediaPayload.link_cccd_truoc = normalizeText(
          uploadedFront?.fileId || uploadedFront?.id || "",
        );
      } catch (error) {
        console.error("Cannot upload front ID card to Drive:", error);
        warnings.push("CCCD mặt trước chưa được tải lên Google Drive.");
      }
    }

    if (cccdBackFile instanceof File && cccdBackFile.size) {
      try {
        const uploadedBack = await core.uploadFileToDrive(cccdBackFile, {
          name: buildProfileFileName(cccdBackFile, "cccd_back"),
          proxyFile:
            savedRole === "nha-cung-cap"
              ? "nha-cung-cap/upload.php"
              : "khach-hang/upload.php",
          uploadKind: "cccd",
        });
        mediaPayload.link_cccd_sau = normalizeText(
          uploadedBack?.fileId || uploadedBack?.id || "",
        );
      } catch (error) {
        console.error("Cannot upload back ID card to Drive:", error);
        warnings.push("CCCD mặt sau chưa được tải lên Google Drive.");
      }
    }

    const nextProfilePayload = {
      ...currentIdentity,
      ...(payload && typeof payload === "object"
        ? {
            ...payload,
            sodienthoai: currentIdentity.sodienthoai || "",
          }
        : {}),
      ...mediaPayload,
    };
    const updateFn = getKrudUpdateFn();
    const tableName = getAuthTableName(getSavedRole() || "khach-hang");
    const remoteId = normalizeText(currentIdentity.id || "");

    if (!updateFn || !tableName || !remoteId) {
      throw new Error(
        "Không tìm thấy thông tin tài khoản KRUD hiện tại để cập nhật hồ sơ.",
      );
    }

    try {
      await Promise.resolve(
        updateFn(tableName, {
          id: remoteId,
          hovaten: normalizeText(
            nextProfilePayload.hovaten || currentIdentity.hovaten || "",
          ),
          email: normalizeText(
            nextProfilePayload.email || currentIdentity.email || "",
          ).toLowerCase(),
          sodienthoai: normalizeText(currentIdentity.sodienthoai || ""),
          diachi: normalizeText(
            nextProfilePayload.diachi ||
              nextProfilePayload.dia_chi ||
              currentIdentity.diachi ||
              "",
          ),
          ten_cong_ty: normalizeText(
            nextProfilePayload.ten_cong_ty ||
              nextProfilePayload.company_name ||
              currentIdentity.ten_cong_ty ||
              "",
          ),
          ma_so_thue: normalizeText(
            nextProfilePayload.ma_so_thue ||
              nextProfilePayload.tax_code ||
              currentIdentity.ma_so_thue ||
              "",
          ),
          dia_chi_doanh_nghiep: normalizeText(
            nextProfilePayload.dia_chi_doanh_nghiep ||
              nextProfilePayload.diachidonvi ||
              currentIdentity.dia_chi_doanh_nghiep ||
              "",
          ),
          loai_phuong_tien: normalizeText(
            nextProfilePayload.loai_phuong_tien ||
              nextProfilePayload.vehicle_type ||
              currentIdentity.loai_phuong_tien ||
              "",
          ),
          link_avatar: normalizeText(
            nextProfilePayload.link_avatar || currentIdentity.link_avatar || "",
          ),
          link_cccd_truoc: normalizeText(
            nextProfilePayload.link_cccd_truoc ||
              currentIdentity.link_cccd_truoc ||
              "",
          ),
          link_cccd_sau: normalizeText(
            nextProfilePayload.link_cccd_sau ||
              currentIdentity.link_cccd_sau ||
              "",
          ),
          updated_at: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error("Cannot update profile in KRUD:", error);
      const uploadedMediaBeforeKrudError = Object.keys(mediaPayload).length > 0;
      throw new Error(
        uploadedMediaBeforeKrudError
          ? "Ảnh hồ sơ/CCCD có thể đã tải lên Google Drive, nhưng hồ sơ chưa cập nhật hệ thống."
          : error?.message || "Không thể cập nhật hồ sơ vào hệ thống.",
      );
    }

    const nextProfile = syncIdentityFromProfile(nextProfilePayload);
    return {
      ...nextProfile,
      warning: warnings.join(" "),
    };
  }

  async function changePassword(payload) {
    const currentPassword = String(payload?.current_password || "");
    const newPassword = String(payload?.new_password || "");
    const confirmPassword = String(payload?.confirm_password || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error("Vui lòng nhập đủ ba trường mật khẩu.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận chưa khớp.");
    }

    const identity = readIdentity();
    const remoteId = normalizeText(identity.id || "");
    const tableName = getAuthTableName(getSavedRole() || "khach-hang");
    const listFn = getKrudListFn();
    const updateFn = getKrudUpdateFn();

    if (!remoteId || !tableName || !listFn || !updateFn) {
      throw new Error(
        "Không tìm thấy thông tin tài khoản KRUD hiện tại để đổi mật khẩu.",
      );
    }

    const response = await Promise.resolve(
      listFn({
        table: tableName,
        page: 1,
        limit: 1,
        where: {
          id: remoteId,
        },
      }),
    );
    const currentRow = extractRows(response)[0] || null;
    const storedPassword = String(currentRow?.matkhau || "");

    if (storedPassword && storedPassword !== currentPassword) {
      throw new Error("Mật khẩu hiện tại chưa đúng.");
    }

    await Promise.resolve(
      updateFn(tableName, {
        id: remoteId,
        matkhau: newPassword,
        updated_at: new Date().toISOString(),
      }),
    );

    const storedAccess = readStoredAccess();
    const nextLoginIdentifier = normalizeText(
      storedAccess.loginIdentifier ||
        storedAccess.username ||
        identity.sodienthoai ||
        readCookie("dvqt_u") ||
        "",
    );
    if (nextLoginIdentifier) {
      saveStoredAccess({
        loginIdentifier: nextLoginIdentifier,
        password: newPassword,
      });
    }

    return { status: "success" };
  }

  return {
    storageKeys,
    bookingCrudTableName,
    bootstrapAuthSession,
    autoAuthFromUrlCredentials,
    readIdentity,
    saveIdentity,
    syncIdentityFromProfile,
    getSavedRole,
    hasProviderCapability,
    getProvidedServiceLabels,
    normalizeVehicleKey,
    getProviderVehicleLabel,
    getProviderVehicleRecordKey,
    listProviderVehicleCatalog,
    listProviderVehicles,
    createProviderVehicle,
    updateProviderVehicle,
    deleteProviderVehicle,
    pickPrimaryProviderVehicle,
    getProviderOrderVehicleAssignment,
    saveProviderOrderVehicleAssignment,
    resolveCustomerBookingOwnership,
    getCurrentProviderActor,
    isRowAssignedToProvider,
    canProviderAccessBookingRow,
    isRowOwnedByProviderActor,
    getDisplayName,
    getBookingDisplayStatus,
    getDashboardStats,
    resolveBookingRowCode,
    matchesBookingCode,
    fetchProfile,
    fetchDashboard,
    fetchHistory,
    fetchDetail,
    fetchBookingInvoiceDetail,
    cancelBooking,
    saveBookingFeedback,
    updateProfile,
    changePassword,
    autoCancelExpiredBookings,
    isExpiredPendingBookingRow,
    bookingAutoCancelMinutes: AUTO_CANCEL_PENDING_MINUTES,
    clearAuthSession,
  };
})(window);

if (typeof window !== "undefined" && !window.__fastGoAuthBootstrapStarted) {
  window.__fastGoAuthBootstrapStarted = true;

  Promise.resolve().then(() =>
    customerPortalStoreModule.bootstrapAuthSession?.().catch((error) => {
      console.error("Cannot bootstrap moving auth session:", error);
    }),
  );
}

export const {
  autoAuthFromUrlCredentials,
  bootstrapAuthSession,
  bookingCrudTableName,
  changePassword,
  clearAuthSession,
  fetchBookingInvoiceDetail,
  fetchDashboard,
  fetchDetail,
  fetchHistory,
  fetchProfile,
  getBookingDisplayStatus,
  getDashboardStats,
  getDisplayName,
  getSavedRole,
  getProvidedServiceLabels,
  createProviderVehicle,
  deleteProviderVehicle,
  getCurrentProviderActor,
  getProviderOrderVehicleAssignment,
  getProviderVehicleLabel,
  getProviderVehicleRecordKey,
  hasProviderCapability,
  isExpiredPendingBookingRow,
  isRowAssignedToProvider,
  listProviderVehicleCatalog,
  listProviderVehicles,
  canProviderAccessBookingRow,
  isRowOwnedByProviderActor,
  matchesBookingCode,
  normalizeVehicleKey,
  pickPrimaryProviderVehicle,
  readIdentity,
  resolveCustomerBookingOwnership,
  resolveBookingRowCode,
  saveProviderOrderVehicleAssignment,
  saveIdentity,
  storageKeys: portalStorageKeys,
  syncIdentityFromProfile,
  updateProviderVehicle,
  updateProfile,
  cancelBooking,
  saveBookingFeedback,
  autoCancelExpiredBookings,
  bookingAutoCancelMinutes,
} = customerPortalStoreModule;

export { customerPortalStoreModule as customerPortalStore };
export default customerPortalStoreModule;
