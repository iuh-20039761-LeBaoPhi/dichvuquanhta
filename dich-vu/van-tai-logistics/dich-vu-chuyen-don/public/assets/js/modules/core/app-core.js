import { readStoredAccess } from "../store/auth-session-store.js";

const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
const currentPathLower = currentPath.toLowerCase();
const inPublicDir = currentPathLower.includes("/public/");
const projectMarker = "/dich-vu-chuyen-don/";
const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
const projectBase =
  projectMarkerIndex !== -1
    ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
    : "./";
const parentBase = projectBase.replace(
  /(?:dich-vu\/van-tai-logistics\/)?dich-vu-chuyen-don\/?$/i,
  "",
);
const publicBase = `${projectBase}public/`;
const assetsBase = `${publicBase}assets/`;
const sharedAuthService = "chuyendon";

function toParentPublicUrl(path) {
  if (!path) return path;
  if (/^(?:[a-z]+:)?\/\//i.test(path) || String(path).startsWith("/")) return path;
  return `${parentBase}public/${String(path).replace(/^\.?\//, "")}`;
}

function joinUrl(base, path) {
  if (!path) return base;
  return `${base}${String(path).replace(/^\.?\//, "")}`;
}

function toProjectUrl(path) {
  if (!path) return path;
  if (/^(?:[a-z]+:)?\/\//i.test(path) || String(path).startsWith("/")) return path;
  return joinUrl(projectBase, path);
}

function toPublicUrl(path) {
  if (!path) return path;
  if (/^(?:[a-z]+:)?\/\//i.test(path) || String(path).startsWith("/")) return path;
  return joinUrl(publicBase, path);
}

function getDriveUploadProxyUrl(fileName = "public/upload_to_drive.php") {
  const normalizedFileName = String(fileName || "public/upload_to_drive.php").trim();
  if (!normalizedFileName) {
    throw new Error("Thiếu tên file upload proxy.");
  }

  const overrideMap =
    window.DICH_VU_CHUYEN_DON_DRIVE_UPLOAD_PROXY_URLS &&
    typeof window.DICH_VU_CHUYEN_DON_DRIVE_UPLOAD_PROXY_URLS === "object"
      ? window.DICH_VU_CHUYEN_DON_DRIVE_UPLOAD_PROXY_URLS
      : null;
  const override =
    String(
      (overrideMap && overrideMap[normalizedFileName]) ||
        (normalizedFileName === "public/upload_to_drive.php"
          ? window.DICH_VU_CHUYEN_DON_DRIVE_UPLOAD_PROXY_URL
          : ""),
    ).trim();
  if (override) return override;
  return new URL(
    toProjectUrl(normalizedFileName),
    window.location.origin,
  ).toString();
}

function getUploadSettingsUrl() {
  const override = String(window.DICH_VU_CHUYEN_DON_UPLOAD_SETTINGS_URL || "").trim();
  if (override) return override;
  return new URL(
    toProjectUrl("public/upload_settings.php"),
    window.location.origin,
  ).toString();
}

const DEFAULT_MAX_UPLOAD_MB = 25;
let uploadSettingsPromise = null;

function formatUploadLimitText(maxUploadMb) {
  const normalized = Number(maxUploadMb || DEFAULT_MAX_UPLOAD_MB);
  return `${normalized.toLocaleString("vi-VN")} MB`;
}

async function loadUploadSettings(forceReload = false) {
  if (!forceReload && uploadSettingsPromise) {
    return uploadSettingsPromise;
  }

  uploadSettingsPromise = fetch(getUploadSettingsUrl(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => {
      const maxUploadMb = Math.max(
        1,
        Number(payload?.data?.settings?.max_upload_mb || DEFAULT_MAX_UPLOAD_MB),
      );
      return {
        maxUploadMb,
        maxUploadBytes: Math.round(maxUploadMb * 1024 * 1024),
      };
    })
    .catch((error) => {
      console.warn("Không thể tải cấu hình upload, dùng mặc định:", error);
      return {
        maxUploadMb: DEFAULT_MAX_UPLOAD_MB,
        maxUploadBytes: DEFAULT_MAX_UPLOAD_MB * 1024 * 1024,
      };
    });

  return uploadSettingsPromise;
}

async function validateDriveUploadFile(fileObj) {
  if (!(fileObj instanceof File)) {
    throw new Error("Không có file hợp lệ để tải lên Google Drive.");
  }

  const settings = await loadUploadSettings();
  const maxUploadBytes = Number(settings?.maxUploadBytes || 0);
  if (maxUploadBytes > 0 && Number(fileObj.size || 0) > maxUploadBytes) {
    throw new Error(
      `File "${fileObj.name || "không rõ tên"}" vượt quá dung lượng cho phép (${formatUploadLimitText(settings.maxUploadMb)}).`,
    );
  }
}

function getDriveFileIdFromUrl(value) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";

  const idParamMatch = normalizedValue.match(/[?&]id=([^&#]+)/i);
  if (idParamMatch?.[1]) {
    return decodeURIComponent(idParamMatch[1]);
  }

  const filePathMatch = normalizedValue.match(/\/file\/d\/([^/?#]+)/i);
  if (filePathMatch?.[1]) {
    return decodeURIComponent(filePathMatch[1]);
  }

  return "";
}

function isDriveFileId(value) {
  return /^[A-Za-z0-9_-]{20,}$/.test(String(value || "").trim());
}

function getDriveFileUrls(fileId) {
  const normalizedId = String(fileId || "").trim();
  if (!normalizedId) {
    return {
      url: "",
      downloadUrl: "",
      viewUrl: "",
      thumbnailUrl: "",
    };
  }

  const encodedId = encodeURIComponent(normalizedId);
  const directUrl = `https://lh3.googleusercontent.com/u/0/d/${encodedId}`;

  return {
    url: directUrl,
    downloadUrl: directUrl,
    viewUrl: `https://drive.google.com/file/d/${encodedId}/view`,
    thumbnailUrl: directUrl,
  };
}

function getDriveResolvedUrls(value) {
  const normalizedValue = String(value || "").trim();
  const fileId = getDriveFileIdFromUrl(normalizedValue) ||
    (isDriveFileId(normalizedValue) ? normalizedValue : "");
  if (!fileId) {
    return {
      fileId: "",
      url: normalizedValue,
      downloadUrl: normalizedValue,
      viewUrl: normalizedValue,
      thumbnailUrl: normalizedValue,
    };
  }

  return {
    fileId,
    ...getDriveFileUrls(fileId),
  };
}

function toAssetsUrl(path) {
  if (!path) return path;
  if (/^(?:[a-z]+:)?\/\//i.test(path) || String(path).startsWith("/")) return path;
  const cleanedPath = String(path).replace(/^\.?\//, "").replace(/^assets\//, "");
  return joinUrl(assetsBase, cleanedPath);
}

function getCurrentRelativeUrl() {
  return `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`;
}

function getCurrentSearchParams() {
  return new URLSearchParams(window.location.search || "");
}

const URL_AUTH_QUERY_KEYS = Object.freeze([
  "username",
  "sodienthoai",
  "password",
  "pass",
]);

function getOrderIdentifierFromUrl() {
  return String(getCurrentSearchParams().get("madonhang") || "").trim();
}

function getUrlAuthCredentials() {
  const params = getCurrentSearchParams();
  const loginIdentifier = String(params.get("sodienthoai") || "").trim();
  const password = String(params.get("password") || "").trim();
  return {
    loginIdentifier,
    username: loginIdentifier,
    password,
  };
}

function cleanUrlAuthCredentials() {
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
    console.error("Cannot clean auth credentials from URL:", error);
  }
}

function readCookie(name) {
  const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(document.cookie || "").match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1] || "") : "";
}

function getCookieAuthCredentials() {
  const loginIdentifier = String(readCookie("dvqt_u") || "").trim();
  const password = String(readCookie("dvqt_p") || "").trim();
  return {
    loginIdentifier,
    username: loginIdentifier,
    password,
  };
}

function getStoredAuthCredentials() {
  const storedAccess =
    typeof readStoredAccess === "function" ? readStoredAccess() : {};
  const loginIdentifier = String(
    storedAccess?.loginIdentifier || storedAccess?.username || "",
  ).trim();
  const password = String(storedAccess?.password || "").trim();
  return {
    loginIdentifier,
    username: loginIdentifier,
    password,
  };
}

function getOrderDetailAccessCredentials(credentials = {}) {
  const explicitUsername = String(
    credentials?.loginIdentifier ||
      credentials?.username ||
      credentials?.sodienthoai ||
      "",
  ).trim();
  const explicitPassword = String(
    credentials?.password || "",
  ).trim();
  const urlCredentials = getUrlAuthCredentials();
  const cookieCredentials = getCookieAuthCredentials();
  const storedCredentials = getStoredAuthCredentials();

  const resolvedUsername =
    explicitUsername ||
    urlCredentials.username ||
    cookieCredentials.username ||
    storedCredentials.username ||
    "";
  const resolvedPassword =
    explicitPassword ||
    urlCredentials.password ||
    cookieCredentials.password ||
    storedCredentials.password ||
    "";

  if (resolvedUsername && resolvedPassword) {
    return {
      loginIdentifier: resolvedUsername,
      username: resolvedUsername,
      password: resolvedPassword,
    };
  }

  return {
    loginIdentifier: "",
    username: "",
    password: "",
  };
}

function buildOrderDetailUrl(path, orderCode, credentials = {}) {
  const targetUrl = new URL(
    toProjectUrl(path || window.location.pathname || ""),
    window.location.href,
  );
  const normalizedOrderCode = String(orderCode || "").trim();
  if (normalizedOrderCode) {
    targetUrl.searchParams.set("madonhang", normalizedOrderCode);
  }

  const access = getOrderDetailAccessCredentials(credentials);
  URL_AUTH_QUERY_KEYS.forEach((key) => {
    targetUrl.searchParams.delete(key);
  });
  if (access.loginIdentifier && access.password) {
    targetUrl.searchParams.set("sodienthoai", access.loginIdentifier);
    targetUrl.searchParams.set("password", access.password);
  }

  return targetUrl.toString();
}

function appendAuthParamsToUrl(urlStr, credentials = {}) {
  if (!urlStr) return urlStr;

  try {
    const url = new URL(urlStr, window.location.href);
    const access = getOrderDetailAccessCredentials(credentials);
    URL_AUTH_QUERY_KEYS.forEach((key) => {
      url.searchParams.delete(key);
    });
    if (access.loginIdentifier && access.password) {
      url.searchParams.set("sodienthoai", access.loginIdentifier);
      url.searchParams.set("password", access.password);
    }
    return url.toString();
  } catch (e) {
    return urlStr;
  }
}

function syncOrderDetailUrl({ orderCode, path, username, password } = {}) {
  const normalizedOrderCode = String(orderCode || "").trim();
  if (
    !normalizedOrderCode ||
    !window.history ||
    typeof window.history.replaceState !== "function"
  ) {
    return;
  }

  const targetUrl = new URL(
    path || window.location.pathname || "",
    window.location.href,
  );

  targetUrl.searchParams.set("madonhang", normalizedOrderCode);

  const access = getOrderDetailAccessCredentials({
    loginIdentifier: username,
    username,
    password,
  });
  URL_AUTH_QUERY_KEYS.forEach((key) => {
    targetUrl.searchParams.delete(key);
  });
  if (access.loginIdentifier && access.password) {
    targetUrl.searchParams.set("sodienthoai", access.loginIdentifier);
    targetUrl.searchParams.set("password", access.password);
  }

  if (targetUrl.toString() !== window.location.href) {
    window.history.replaceState(window.history.state, "", targetUrl.toString());
  }
}

function buildSharedAuthUrl(path, params = {}) {
  const url = new URL(toParentPublicUrl(path), window.location.href);
  url.searchParams.set("service", sharedAuthService);
  url.searchParams.set("redirect", toProjectUrl("index.html"));

  Object.entries(params || {}).forEach(([key, value]) => {
    const normalizedValue = String(value ?? "").trim();
    if (!key || !normalizedValue) return;
    url.searchParams.set(key, normalizedValue);
  });

  return url.toString();
}

function getSharedLoginUrl(params = {}) {
  return buildSharedAuthUrl("dang-nhap.html", params);
}

function getSharedRegisterUrl(params = {}) {
  return buildSharedAuthUrl("dang-ky.html", params);
}

function showFieldError(input, message) {
  if (!input) return;
  input.classList.add("input-error");
  let errorSpan = input.parentNode.querySelector(".field-error-msg");
  if (!errorSpan) {
    errorSpan = document.createElement("span");
    errorSpan.className = "field-error-msg";
    input.parentNode.appendChild(errorSpan);
  }
  errorSpan.innerText = message;
}

function clearFieldError(input) {
  if (!input) return;
  input.classList.remove("input-error");
  const errorSpan = input.parentNode.querySelector(".field-error-msg");
  if (errorSpan) {
    errorSpan.remove();
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrencyVnd(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function getFileExtension(fileName, mimeType = "") {
  const normalizedName = String(fileName || "").trim();
  if (normalizedName.includes(".")) {
    return normalizedName.split(".").pop().toLowerCase();
  }

  const normalizedMime = String(mimeType || "").toLowerCase();
  if (normalizedMime.startsWith("image/")) {
    return normalizedMime.replace("image/", "") || "jpg";
  }
  if (normalizedMime.startsWith("video/")) {
    return normalizedMime.replace("video/", "") || "mp4";
  }
  return "";
}

async function uploadFileToDrive(fileObj, options = {}) {
  await validateDriveUploadFile(fileObj);

  const formData = new FormData();
  formData.append("file", fileObj, fileObj.name || "media");
  formData.append("name", options.name || fileObj.name || "media");
  if (options.uploadKind) {
    formData.append("upload_kind", String(options.uploadKind).trim());
  }

  const response = await fetch(
    getDriveUploadProxyUrl(options.proxyFile || "public/upload_to_drive.php"),
    {
    method: "POST",
    body: formData,
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Không thể tải file lên Google Drive.");
  }

  const fileId = String(payload.fileId || "").trim();
  const urls = getDriveFileUrls(fileId);

  return {
    id: fileId,
    fileId,
    name: String(payload.name || fileObj.name || "Tệp đính kèm").trim(),
    extension: getFileExtension(
      payload.name || fileObj.name,
      payload.type || fileObj.type,
    ),
    url: urls.url,
    download_url: urls.downloadUrl,
    view_url: urls.viewUrl,
    thumbnail_url: urls.thumbnailUrl,
    type: String(payload.type || fileObj.type || "").trim(),
    created_at: new Date().toISOString(),
  };
}

async function uploadFilesToDrive(files, options = {}) {
  const list = Array.from(files || []).filter((file) => file instanceof File);
  if (!list.length) return [];

  const uploadedItems = [];
  for (let index = 0; index < list.length; index += 1) {
    const file = list[index];
    const nextOptions = { ...options };
    if (typeof options.nameBuilder === "function") {
      const builtName = options.nameBuilder(file, index);
      if (String(builtName || "").trim()) {
        nextOptions.name = builtName;
      }
    }
    uploadedItems.push(
      await uploadFileToDrive(file, {
        ...nextOptions,
        name: nextOptions.name || file.name,
      }),
    );
  }

  return uploadedItems;
}

function getPricingStandardStructure(serviceData) {
  return serviceData && typeof serviceData === "object"
    ? serviceData.bang_gia || null
    : null;
}

function getPricingVehicleEntries(serviceData) {
  const pricingStructure = getPricingStandardStructure(serviceData);
  const vehicleItems = pricingStructure?.loai_xe;

  if (Array.isArray(vehicleItems) && vehicleItems.length) {
    return vehicleItems.map((item) => ({
      slug: String(item?.slug || "").trim(),
      ten_hien_thi: String(item?.ten || "").trim(),
      gia_mo_cua: Number(item?.gia_mo_cua || 0),
      pham_vi_mo_cua_km: Number(item?.pham_vi_mo_cua_km || 0),
      bang_gia_km: Array.isArray(item?.bang_gia_km)
        ? item.bang_gia_km
            .map((band) => ({
              tu_km: Number(band?.tu_km || 0),
              den_km:
                band?.den_km === null || band?.den_km === ""
                  ? null
                  : Number(band?.den_km || 0),
              don_gia: Number(band?.don_gia || 0),
            }))
            .filter(
              (band) =>
                Number.isFinite(band.tu_km) &&
                band.tu_km > 0 &&
                Number.isFinite(band.don_gia) &&
                band.don_gia > 0,
            )
        : [],
      gia_moi_km: Number(item?.gia_moi_km || 0),
      gia_moi_km_duong_dai: Number(item?.gia_moi_km_duong_dai || 0),
      phi_toi_thieu: Number(item?.phi_toi_thieu || 0),
      nguong_km_giam_gia: Number(item?.nguong_km_giam_gia || 20),
      ty_le_giam_gia_duong_dai: Number(item?.ty_le_giam_gia_duong_dai || 0),
    }));
  }
  return [];
}

function getPricingDisplayItems(serviceData) {
  return Array.isArray(serviceData?.hang_muc_bao_gia)
    ? serviceData.hang_muc_bao_gia.map((item) => ({
        slug: String(item?.slug || "").trim(),
        ten: String(item?.ten || "").trim(),
        khoang_gia: String(item?.khoang_gia || "").trim(),
        don_vi: String(item?.don_vi || "").trim(),
        ghi_chu: String(item?.ghi_chu || "").trim(),
        hinh_anh: String(item?.hinh_anh || "").trim(),
        icon_svg: String(item?.icon_svg || "").trim(),
      }))
    : [];
}

function getPricingCheckboxItems(serviceData) {
  const pricingStructure = getPricingStandardStructure(serviceData);
  const checkboxItems = pricingStructure?.phu_phi?.checkbox;

  if (Array.isArray(checkboxItems) && checkboxItems.length) {
    return checkboxItems.map((item) => ({
      slug: String(item?.slug || "").trim(),
      ten: String(item?.ten || "").trim(),
      don_gia: Number(item?.don_gia || 0),
      nguon_hien_thi_slug: String(item?.nguon_hien_thi_slug || "").trim(),
    }));
  }
  return [];
}

const PRICING_MULTIPLIER_ORDER = {
  buoi_toi: 1,
  ban_dem: 2,
  troi_mua: 3,
  cuoi_tuan: 4,
};

function getPricingMultiplierEntries(serviceData) {
  const pricingStructure = getPricingStandardStructure(serviceData);
  const surchargeGroups = pricingStructure?.phu_phi;

  if (surchargeGroups) {
    return ["khung_gio", "thoi_tiet"]
      .flatMap((groupKey) => (Array.isArray(surchargeGroups[groupKey]) ? surchargeGroups[groupKey] : []))
      .sort((left, right) => {
        const leftOrder =
          PRICING_MULTIPLIER_ORDER[String(left?.slug || "").trim()] || 999;
        const rightOrder =
          PRICING_MULTIPLIER_ORDER[String(right?.slug || "").trim()] || 999;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return String(left?.ten || "").localeCompare(String(right?.ten || "").trim(), "vi");
      })
      .map((item) => ({
        slug: String(item?.slug || "").trim(),
        title: String(item?.ten || "").trim(),
        value: formatCurrencyVnd(item?.don_gia || 0),
        note: "Áp dụng như phụ phí cố định trong bảng giá.",
      }));
  }
  return [];
}

function getPricingStartingPrice(serviceData) {
  const entries = getPricingVehicleEntries(serviceData);
  const openingValues = entries
    .map((item) => Number(item?.gia_mo_cua || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (openingValues.length) {
    return Math.min(...openingValues);
  }

  const values = entries
    .map((item) => Number(item?.gia_moi_km || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : 0;
}

function getPricingOpeningKm(serviceData) {
  const entries = getPricingVehicleEntries(serviceData);
  const openingKm = entries
    .map((item) => Number(item?.pham_vi_mo_cua_km || 0))
    .find((value) => Number.isFinite(value) && value > 0);

  return openingKm || 5;
}

function getPricingSummaryText(serviceData) {
  const openingKm = getPricingOpeningKm(serviceData);
  return `Tổng tiền tham khảo = giá mở cửa ${openingKm}km đầu theo loại xe + cước phát sinh theo từng dải km + phụ phí khảo sát, thời gian và thời tiết nếu có. Các hạng mục hỗ trợ khác chỉ dùng để điều phối.`;
}

function getPricingSummaryParts(serviceData) {
  const openingKm = getPricingOpeningKm(serviceData);
  const parts = [
    `Giá mở cửa ${openingKm}km đầu`,
    "Dải km phát sinh",
  ];
  const seenParts = new Set(parts);
  const surveyItem = getPricingCheckboxItems(serviceData).find(
    (item) => String(item?.slug || "").trim() === "khao_sat_truoc",
  );

  if (surveyItem?.ten && !seenParts.has(surveyItem.ten)) {
    parts.push(surveyItem.ten);
    seenParts.add(surveyItem.ten);
  }

  getPricingMultiplierEntries(serviceData)
    .slice(0, 2)
    .forEach((item) => {
      const title = String(item?.title || "").trim();
      if (!title || seenParts.has(title)) return;
      parts.push(title);
      seenParts.add(title);
    });

  return parts;
}

const core = {
  inPublicDir,
  projectBase,
  parentBase,
  publicBase,
  assetsBase,
  toProjectUrl,
  toPublicUrl,
  toParentPublicUrl,
  toAssetsUrl,
  getDriveUploadProxyUrl,
  getDriveFileIdFromUrl,
  getDriveFileUrls,
  getDriveResolvedUrls,
  uploadFileToDrive,
  uploadFilesToDrive,
  getCurrentRelativeUrl,
  getCurrentSearchParams,
  getOrderIdentifierFromUrl,
  getSharedLoginUrl,
  getSharedRegisterUrl,
  getUrlAuthCredentials,
  cleanUrlAuthCredentials,
  getCookieAuthCredentials,
  getOrderDetailAccessCredentials,
  buildOrderDetailUrl,
  appendAuthParamsToUrl,
  syncOrderDetailUrl,
  showFieldError,
  clearFieldError,
  escapeHtml,
  formatCurrencyVnd,
  getPricingStandardStructure,
  getPricingVehicleEntries,
  getPricingDisplayItems,
  getPricingCheckboxItems,
  getPricingMultiplierEntries,
  getPricingSummaryParts,
  getPricingSummaryText,
  getPricingStartingPrice,
  
  /**
   * Hiển thị thông báo Toast hiện đại
   */
  notify: (message, type = "success") => {
    let container = document.querySelector(".core-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "core-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `core-toast ${type}`;
    
    let icon = "fa-check-circle";
    if (type === "error") icon = "fa-circle-xmark";
    if (type === "warning") icon = "fa-triangle-exclamation";

    toast.innerHTML = `
      <div class="core-toast-icon"><i class="fa-solid ${icon}"></i></div>
      <div class="core-toast-message">${message}</div>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  },

  /**
   * Hiển thị Modal xác nhận cao cấp (Promise-based)
   */
  confirm: (options = {}) => {
    return new Promise((resolve) => {
      const { 
        title = "Xác nhận", 
        message = "Bạn có chắc chắn muốn thực hiện hành động này?",
        confirmText = "Xác nhận",
        cancelText = "Hủy bỏ",
        type = "primary" // primary, danger
      } = options;

      const overlay = document.createElement("div");
      overlay.className = "core-modal-overlay";
      
      overlay.innerHTML = `
        <div class="core-modal-card">
          <div class="core-modal-icon ${type === "danger" ? "danger" : ""}">
            <i class="fa-solid ${type === "danger" ? "fa-trash-can" : "fa-circle-question"}"></i>
          </div>
          <div class="core-modal-title">${title}</div>
          <div class="core-modal-body">${message}</div>
          <div class="core-modal-footer">
            <button class="core-modal-btn core-modal-btn-secondary" data-action="cancel">${cancelText}</button>
            <button class="core-modal-btn core-modal-btn-${type === "danger" ? "danger" : "primary"}" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      
      // Animation
      setTimeout(() => overlay.classList.add("show"), 10);

      const handleAction = (val) => {
        overlay.classList.remove("show");
        setTimeout(() => {
          overlay.remove();
          resolve(val);
        }, 300);
      };

      overlay.querySelector('[data-action="confirm"]').onclick = () => handleAction(true);
      overlay.querySelector('[data-action="cancel"]').onclick = () => handleAction(false);
      overlay.onclick = (e) => { if (e.target === overlay) handleAction(false); };
    });
  }
};

export default core;
export {
  assetsBase,
  clearFieldError,
  escapeHtml,
  formatCurrencyVnd,
  getCurrentSearchParams,
  getOrderIdentifierFromUrl,
  getPricingCheckboxItems,
  getPricingDisplayItems,
  getPricingMultiplierEntries,
  getPricingSummaryParts,
  getPricingSummaryText,
  getPricingStandardStructure,
  getPricingStartingPrice,
  getPricingVehicleEntries,
  getUrlAuthCredentials,
  getCookieAuthCredentials,
  getOrderDetailAccessCredentials,
  inPublicDir,
  projectBase,
  parentBase,
  publicBase,
  showFieldError,
  syncOrderDetailUrl,
  buildOrderDetailUrl,
  appendAuthParamsToUrl,
  toAssetsUrl,
  getCurrentRelativeUrl,
  getSharedLoginUrl,
  getSharedRegisterUrl,
  cleanUrlAuthCredentials,
  toProjectUrl,
  toPublicUrl,
  toParentPublicUrl,
  getDriveUploadProxyUrl,
  getDriveFileIdFromUrl,
  getDriveFileUrls,
  getDriveResolvedUrls,
  uploadFileToDrive,
  uploadFilesToDrive,
};
