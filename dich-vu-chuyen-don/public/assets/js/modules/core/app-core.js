const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
const currentPathLower = currentPath.toLowerCase();
const inPublicDir = currentPathLower.includes("/public/");
const projectMarker = "/dich-vu-chuyen-don/";
const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
const projectBase =
  projectMarkerIndex !== -1
    ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
    : "./";
const parentBase = projectBase.replace(/dich-vu-chuyen-don\/?$/i, "");
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

function getOrderIdentifierFromUrl() {
  return String(getCurrentSearchParams().get("madonhang") || "").trim();
}

function getUrlAuthCredentials() {
  const params = getCurrentSearchParams();
  return {
    username: String(params.get("username") || "").trim(),
    password: String(params.get("password") || "").trim(),
  };
}

function readCookie(name) {
  const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(document.cookie || "").match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1] || "") : "";
}

function getCookieAuthCredentials() {
  return {
    username: String(readCookie("dvqt_u") || "").trim(),
    password: String(readCookie("dvqt_p") || "").trim(),
  };
}

function getOrderDetailAccessCredentials(credentials = {}) {
  const explicitUsername = String(credentials?.username || "").trim();
  const explicitPassword = String(credentials?.password || "").trim();
  if (explicitUsername && explicitPassword) {
    return {
      username: explicitUsername,
      password: explicitPassword,
    };
  }

  const urlCredentials = getUrlAuthCredentials();
  if (urlCredentials.username && urlCredentials.password) {
    return urlCredentials;
  }

  const cookieCredentials = getCookieAuthCredentials();
  if (cookieCredentials.username && cookieCredentials.password) {
    return cookieCredentials;
  }

  return {
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
  if (access.username && access.password) {
    targetUrl.searchParams.set("username", access.username);
    targetUrl.searchParams.set("password", access.password);
  } else {
    targetUrl.searchParams.delete("username");
    targetUrl.searchParams.delete("password");
  }

  return targetUrl.toString();
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
    username,
    password,
  });

  if (access.username && access.password) {
    targetUrl.searchParams.set("username", access.username);
    targetUrl.searchParams.set("password", access.password);
  } else {
    targetUrl.searchParams.delete("username");
    targetUrl.searchParams.delete("password");
  }

  if (targetUrl.toString() !== window.location.href) {
    window.history.replaceState(window.history.state, "", targetUrl.toString());
  }
}

function buildSharedAuthUrl(path, params = {}) {
  const url = new URL(toParentPublicUrl(path), window.location.href);
  url.searchParams.set("service", sharedAuthService);

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
  const values = getPricingVehicleEntries(serviceData)
    .map((item) => Number(item?.gia_moi_km || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : 0;
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
  getCurrentRelativeUrl,
  getCurrentSearchParams,
  getOrderIdentifierFromUrl,
  getSharedLoginUrl,
  getSharedRegisterUrl,
  getUrlAuthCredentials,
  getCookieAuthCredentials,
  getOrderDetailAccessCredentials,
  buildOrderDetailUrl,
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
  getPricingStartingPrice,
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
  toAssetsUrl,
  getCurrentRelativeUrl,
  getSharedLoginUrl,
  getSharedRegisterUrl,
  toProjectUrl,
  toPublicUrl,
  toParentPublicUrl,
};
