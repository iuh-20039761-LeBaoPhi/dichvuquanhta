(function (window) {
  if (window.GiaoHangNhanhCore) return;

  const inPublicDir = window.location.pathname
    .toLowerCase()
    .includes("/public/");

  function resolveProjectBasePath() {
    const path = String(window.location.pathname || "").replace(/\\/g, "/");
    const marker = "/giao-hang-nhanh/";
    const markerIndex = path.toLowerCase().lastIndexOf(marker);
    if (markerIndex !== -1) {
      return path.slice(0, markerIndex + marker.length);
    }

    const publicIndex = path.toLowerCase().lastIndexOf("/public/");
    if (publicIndex !== -1) {
      return path.slice(0, publicIndex + 1);
    }

    const lastSlash = path.lastIndexOf("/");
    return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : "./";
  }

  const projectBasePath = resolveProjectBasePath();
  const publicBasePath = `${projectBasePath}public/`;
  const parentBasePath = projectBasePath.replace(
    /(?:dich-vu\/van-tai-logistics\/)?giao-hang-nhanh\/?$/i,
    "",
  );
  const apiBasePath =
    typeof window.apiBasePath === "string"
      ? window.apiBasePath
      : publicBasePath;

  function showToast(message, type = "info") {
    let container = document.getElementById("ghn-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "ghn-toast-container";
      container.style.cssText =
        "position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const colors = {
      success: { bg: "#d4edda", border: "#c3e6cb", color: "#155724" },
      error: { bg: "#f8d7da", border: "#f5c6cb", color: "#721c24" },
      info: { bg: "#d1ecf1", border: "#bee5eb", color: "#0c5460" },
      warning: { bg: "#fff3cd", border: "#ffeeba", color: "#856404" },
    };
    const style = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${style.bg};
      color: ${style.color};
      border: 1px solid ${style.border};
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 250px;
      max-width: 400px;
      animation: ghnFadeIn 0.3s ease-out;
      font-weight: 500;
      font-family: inherit;
    `;
    toast.innerHTML = message;

    if (!document.getElementById("ghn-toast-style")) {
      const styleTag = document.createElement("style");
      styleTag.id = "ghn-toast-style";
      styleTag.innerHTML = `
        @keyframes ghnFadeIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
        @keyframes ghnFadeOut { from { opacity:1; transform: translateX(0); } to { opacity:0; transform: translateX(20px); } }
      `;
      document.head.appendChild(styleTag);
    }

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "ghnFadeOut 0.3s ease-in forwards";
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) container.remove();
      }, 300);
    }, 4000);
  }

  function resolveDomesticArea(pickupAddr, deliveryAddr, extras = {}) {
    const fCity = String(extras.fromCity || "").trim();
    const tCity = String(extras.toCity || "").trim();

    if (fCity && tCity) {
      return fCity !== tCity ? "lien-tinh" : "noi-thanh";
    }

    if (!pickupAddr || !deliveryAddr) return "lien-tinh";
    return "lien-tinh";
  }

  function mapServiceLevelByArea(serviceType, areaKey) {
    const normalized = String(serviceType || "")
      .trim()
      .toLowerCase();
    if (normalized === "standard") return "standard";
    if (normalized === "fast") return "fast";
    if (normalized === "express") return "express";
    if (normalized === "instant") return "instant";
    return null;
  }

  function getDomesticPricingData() {
    if (window.SHIPPING_DATA && typeof window.SHIPPING_DATA === "object") {
      return window.SHIPPING_DATA;
    }
    if (typeof SHIPPING_DATA !== "undefined" && SHIPPING_DATA) {
      return SHIPPING_DATA;
    }
    return null;
  }

  function getDomesticCalculator() {
    if (typeof window.calculateShipping === "function") {
      return window.calculateShipping;
    }
    if (typeof calculateShipping === "function") {
      return calculateShipping;
    }
    return null;
  }

  function showFieldError(input, message) {
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
    input.classList.remove("input-error");
    const errorSpan = input.parentNode.querySelector(".field-error-msg");
    if (errorSpan) {
      errorSpan.remove();
    }
  }

  function escapeHtml(text) {
    if (text == null) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePhone(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function normalizeServiceType(value) {
    const normalized = normalizeText(value).toLowerCase();
    const map = {
      giao_ngay_lap_tuc: "instant",
      giao_hoa_toc: "express",
      giao_nhanh: "fast",
      giao_tieu_chuan: "standard",
    };
    return map[normalized] || normalized;
  }

  function getServiceLabel(serviceType, fallbackLabel = "") {
    if (normalizeText(fallbackLabel)) return fallbackLabel;
    const normalized = normalizeServiceType(serviceType);
    if (normalized === "instant") return "Giao ngay lập tức";
    if (normalized === "express") return "Giao hàng hỏa tốc";
    if (normalized === "fast") return "Giao hàng nhanh";
    if (normalized === "standard") return "Giao hàng tiêu chuẩn";
    return "--";
  }

  function getPaymentMethodLabel(value, fallback = "") {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return normalizeText(fallback) || "--";
    if (["tien_mat", "cash"].includes(normalized)) return "Tiền mặt";
    if (
      ["chuyen_khoan", "bank", "bank_transfer", "transfer"].includes(normalized)
    ) {
      return "Chuyển khoản";
    }
    return fallback || value;
  }

  function getPaymentStatusLabel(value, fallback = "Chưa hoàn tất") {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return fallback;
    if (["paid", "completed", "done"].includes(normalized)) {
      return "Đã hoàn tất";
    }
    if (["unpaid", "pending", "processing"].includes(normalized)) {
      return "Chưa hoàn tất";
    }
    return value || fallback;
  }

  function getFeePayerLabel(value) {
    return normalizeText(value).toLowerCase() === "nhan"
      ? "Người nhận"
      : "Người gửi";
  }

  function getStatusLabel(value) {
    const rawStatus =
      value && typeof value === "object"
        ? value.status || value.status_label || ""
        : value;
    const normalized = normalizeText(rawStatus).toLowerCase();
    if (["completed", "delivered", "success"].includes(normalized)) {
      return "Hoàn tất";
    }
    if (["shipping", "in_transit"].includes(normalized)) {
      return "Đang giao";
    }
    if (["cancelled", "canceled"].includes(normalized)) {
      return "Đã hủy";
    }
    if (["accepted", "assigned"].includes(normalized)) {
      return "Đã nhận đơn";
    }
    return "Chờ xử lý";
  }

  function getKrudListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    return null;
  }

  function extractRows(payload, depth = 0) {
    if (depth > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      if (!(key in payload)) continue;
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, depth + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function toPositiveNumber(value, fallback = 0) {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  function toPositiveInteger(value, fallback = 1) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
  }

  function normalizeDeliveryItemType(itemType, packageType) {
    const fromItemType = String(itemType || "")
      .trim()
      .toLowerCase();
    if (fromItemType) return fromItemType;

    const normalizedPackage = String(packageType || "")
      .trim()
      .toLowerCase();
    const packageMap = {
      document: "thuong",
      food: "dong-lanh",
      clothes: "thuong",
      electronic: "gia-tri-cao",
      other: "thuong",
    };
    return packageMap[normalizedPackage] || "thuong";
  }

  function getServiceQuoteFromDomesticCalculator(serviceType, payload) {
    if (typeof window.calculateDomesticQuote !== "function") return null;
    if (!payload.fromCity || !payload.toCity) return null;

    try {
      const result = window.calculateDomesticQuote(payload);
      if (!result || !Array.isArray(result.services)) return null;

      const serviceKey = String(serviceType || "")
        .trim()
        .toLowerCase();
      const serviceQuote = result.services.find(
        (svc) =>
          String(svc?.serviceType || "")
            .trim()
            .toLowerCase() === serviceKey,
      );

      if (!serviceQuote) return null;
      return { result, serviceQuote };
    } catch (err) {
      console.error("calculateDomesticQuote failed", err);
      return null;
    }
  }

  function getShippingFeeDetails(
    serviceType,
    weight,
    codAmount,
    pickupAddr = "",
    deliveryAddr = "",
    extraParams = {},
  ) {
    const config = window.pricingConfig || {
      weight_free: 2,
      weight_price: 5000,
      cod_min: 5000,
    };

    let basePrice = 0;
    let weightFee = 0;
    let codFee = 0;
    let regionFee = 0;
    let isContactPrice = false;
    let vehicle = "Xe máy";
    let serviceName = "Không xác định";
    const normalizedServiceType = String(serviceType || "")
      .trim()
      .toLowerCase();
    const extras =
      extraParams && typeof extraParams === "object" ? extraParams : {};
    const quantity = toPositiveInteger(extras.quantity, 1);
    const length = toPositiveNumber(extras.length, 0);
    const width = toPositiveNumber(extras.width, 0);
    const height = toPositiveNumber(extras.height, 0);
    const insuranceValue = toPositiveNumber(extras.insuranceValue, 0);
    const itemType = normalizeDeliveryItemType(
      extras.itemType,
      extras.packageType,
    );
    const fromCity = String(extras.fromCity || "").trim();
    const fromDistrict = String(extras.fromDistrict || "").trim();
    const toCity = String(extras.toCity || "").trim();
    const toDistrict = String(extras.toDistrict || "").trim();
    const quoteDomestic =
      (window.QUOTE_SHIPPING_DATA && window.QUOTE_SHIPPING_DATA.domestic) || {};
    const instantDistance = quoteDomestic.distanceConfig || {};
    const localServiceMap = {
      standard: { name: "Giao tiêu chuẩn", basePrice: 30000 },
      fast: { name: "Giao nhanh", basePrice: 40000 },
      express: { name: "Giao hỏa tốc", basePrice: 50000 },
      instant: {
        name: "Giao ngay lập tức",
        basePrice: toPositiveNumber(instantDistance.base_price, 65000) || 65000,
      },
    };

    const localService = localServiceMap[normalizedServiceType];
    if (localService) {
      serviceName = localService.name;
      basePrice = localService.basePrice;
    }

    const quoteMatch = getServiceQuoteFromDomesticCalculator(
      normalizedServiceType,
      {
        fromCity,
        fromDistrict,
        toCity,
        toDistrict,
        itemType,
        weight: toPositiveNumber(weight, 0),
        quantity,
        length,
        width,
        height,
        codValue: toPositiveNumber(codAmount, 0),
        insuranceValue,
      },
    );
    if (quoteMatch) {
      const breakdown = quoteMatch.serviceQuote.breakdown || {};
      return {
        basePrice: toPositiveNumber(
          breakdown.tong_gia_van_chuyen ?? breakdown.basePrice,
          0,
        ),
        tong_gia_van_chuyen: toPositiveNumber(
          breakdown.tong_gia_van_chuyen ?? breakdown.basePrice,
          0,
        ),
        weightFee: toPositiveNumber(breakdown.weightFee, 0),
        goodsFee: toPositiveNumber(
          breakdown.goodsFee ?? breakdown.goodsAdjustedFee,
          0,
        ),
        codFee: toPositiveNumber(breakdown.codFee, 0),
        insuranceFee: toPositiveNumber(breakdown.insuranceFee, 0),
        regionFee: 0,
        total: toPositiveNumber(quoteMatch.serviceQuote.total, 0),
        vehicle: quoteMatch.serviceQuote.vehicleSuggestion || vehicle,
        serviceName: quoteMatch.serviceQuote.serviceName || serviceName,
        isContactPrice: false,
        areaKey: quoteMatch.result.zoneKey || "",
        levelKey: normalizedServiceType,
        estimate: quoteMatch.serviceQuote.estimate || "",
        pricingSource: "quote-domestic",
        quantity: quoteMatch.result.quantity || quantity,
        billableWeight: toPositiveNumber(quoteMatch.result.billableWeight, 0),
      };
    }

    const domesticData = getDomesticPricingData();
    const domesticCalculator = getDomesticCalculator();
    const areaKey = resolveDomesticArea(pickupAddr, deliveryAddr, extras);
    const levelKey = mapServiceLevelByArea(normalizedServiceType, areaKey);
    const canUseAreaFallback = normalizedServiceType !== "instant";

    if (
      canUseAreaFallback &&
      domesticData &&
      domesticCalculator &&
      levelKey &&
      domesticData[areaKey] &&
      domesticData[areaKey][levelKey]
    ) {
      const w = Math.max(parseFloat(weight) || 0, 0);
      const cod = Math.max(parseFloat(codAmount) || 0, 0);
      const ins = Math.max(insuranceValue, 0);
      const domesticResult = domesticCalculator(
        areaKey,
        levelKey,
        w,
        length,
        width,
        height,
        cod,
        ins,
      );
      const areaConfig = domesticData[areaKey][levelKey];
      const domesticBase = parseFloat(areaConfig.base || 0) * quantity;
      const domesticShipFee = parseFloat(domesticResult.shipFee || 0) * quantity;
      const domesticAddon = parseFloat(domesticResult.addonFee || 0);
      const domesticTotal = domesticShipFee + domesticAddon;

      return {
        basePrice: domesticBase,
        tong_gia_van_chuyen: domesticBase,
        weightFee: Math.max(domesticShipFee - domesticBase, 0),
        codFee: domesticAddon,
        regionFee: 0,
        total: parseFloat(domesticTotal || 0),
        vehicle,
        serviceName,
        isContactPrice: false,
        areaKey,
        levelKey,
        estimate: domesticResult.estimate || "",
        pricingSource: "pricing-data",
        quantity,
      };
    }

    const w = parseFloat(weight) || 0;
    if (w > config.weight_free) {
      weightFee = Math.ceil(w - config.weight_free) * config.weight_price;
    }

    const cod = parseFloat(codAmount) || 0;
    if (cod > 0) {
      codFee = Math.max(parseFloat(config.cod_min), cod * 0.01);
    }

    const scaledBase = basePrice * quantity;
    const scaledWeight = weightFee * quantity;
    const total = scaledBase + scaledWeight + codFee + regionFee;

    return {
      basePrice: scaledBase,
      tong_gia_van_chuyen: scaledBase,
      weightFee: scaledWeight,
      codFee,
      regionFee,
      total,
      vehicle,
      serviceName,
      isContactPrice: isContactPrice && total === 0,
      pricingSource: "legacy",
      quantity,
    };
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function formatCurrency(value) {
    return `${formatNumber(value)}đ`;
  }

  function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateOnly(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function getCurrentPathWithSearch() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function appendAuthParamsToUrl(urlStr, session = null) {
    if (!urlStr) return urlStr;
    const authSession = session || window.GiaoHangNhanhLocalAuth?.getSession();
    if (!authSession || !authSession.username || !authSession.password) return urlStr;
    
    try {
      const url = new URL(urlStr, window.location.href);
      url.searchParams.set("username", authSession.username);
      url.searchParams.set("password", authSession.password);
      return url.toString();
    } catch {
      return urlStr;
    }
  }

  function buildSharedAuthUrl(pageName, options = {}) {
    const normalizedPage = String(pageName || "dang-nhap.html").replace(/^\.?\//, "");
    const target = new URL(`${parentBasePath}public/${normalizedPage}`, window.location.origin);
    target.searchParams.set("service", "giaohangnhanh");
    if (options.redirect) {
      target.searchParams.set("redirect", String(options.redirect));
    }
    return target.toString();
  }

  function buildLoginRedirect(loginUrl = buildSharedAuthUrl("dang-nhap.html")) {
    const target = getCurrentPathWithSearch();
    const url = new URL(String(loginUrl || buildSharedAuthUrl("dang-nhap.html")), window.location.origin);
    url.searchParams.set("redirect", target);
    if (!url.searchParams.has("service")) {
      url.searchParams.set("service", "giaohangnhanh");
    }
    return url.toString();
  }

  function getPortalRoutes(portalType) {
    const type = normalizeText(portalType).toLowerCase();
    const sharedLoginUrl = buildSharedAuthUrl("dang-nhap.html");

    if (type === "shipper") {
      return {
        home: "../../index.html",
        login: sharedLoginUrl,
        logout: sharedLoginUrl,
        dashboard: "dashboard-giaohang.html",
        orders: "don-hang-giaohang.html",
        detail: "chi-tiet-don-hang-giaohang.html",
        profile: "ho-so-giaohang.html",
      };
    }

    return {
      login: sharedLoginUrl,
      logout: sharedLoginUrl,
      booking: "../../dat-lich-giao-hang-nhanh.html",
      dashboard: "dashboard-giaohang.html",
      orders: "lich-su-don-hang-giaohang.html",
      detail: "chi-tiet-don-hang-giaohang.html",
      profile: "ho-so-giaohang.html",
    };
  }

  function getPortalLoginRedirect(portalType) {
    const routes = getPortalRoutes(portalType);
    return buildLoginRedirect(routes.login);
  }

  function bindPortalLogoutActions(root, options = {}) {
    if (!root || root.dataset.portalLogoutBound === "1") return;

    const selector = String(options.selector || "[data-local-logout]").trim() || "[data-local-logout]";
    const redirectUrl = String(options.redirectUrl || `${projectBasePath}dang-nhap.html`).trim();
    const auth = options.localAuth || window.GiaoHangNhanhLocalAuth || null;

    root.dataset.portalLogoutBound = "1";
    root.addEventListener("click", function (event) {
      const trigger = event.target.closest(selector);
      if (!trigger || !root.contains(trigger)) return;

      event.preventDefault();

      if (auth && typeof auth.logout === "function") {
        auth.logout(redirectUrl);
        return;
      }

      if (auth && typeof auth.clearSession === "function") {
        auth.clearSession();
      } else {
        window.localStorage.removeItem("ghn-auth-session");
        document.dispatchEvent(
          new CustomEvent("ghn:auth-changed", {
            detail: {
              session: null,
            },
          }),
        );
      }

      window.location.href = redirectUrl;
    });
  }

  function createStatusBadge(status, label) {
    return `<span class="customer-status-badge status-${escapeHtml(status || "")}">${escapeHtml(label || status || "--")}</span>`;
  }

  function renderLoading(message = "Đang tải dữ liệu...") {
    const root = document.getElementById("shipper-page-content") || document.getElementById("customer-page-content");
    if (!root) return;
    root.innerHTML = `
      <div class="customer-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function renderError(error, message = "Đã có lỗi xảy ra khi tải dữ liệu.") {
    const root = document.getElementById("shipper-page-content") || document.getElementById("customer-page-content");
    if (!root) return;
    console.error("Portal Error:", error);
    root.innerHTML = `
      <div class="customer-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${escapeHtml(message)}</p>
        <small>${escapeHtml(error?.message || String(error))}</small>
        <button class="customer-btn customer-btn-primary" onclick="window.location.reload()">Thử lại</button>
      </div>
    `;
  }

  async function apiRequest(action, options = {}) {
    if (typeof window.requestLocalData === "function") {
      return window.requestLocalData(action, options);
    }
    throw new Error("Hệ thống dữ liệu (requestLocalData) chưa được khởi tạo.");
  }

  function getDriveUploadProxyUrl() {
    const override = String(window.GHN_DRIVE_UPLOAD_PROXY_URL || "").trim();
    if (override) return override;
    return new URL(
      "upload_to_drive.php",
      `${window.location.origin}${publicBasePath}`,
    ).toString();
  }

  function getDriveFileUrls(fileId) {
    const normalizedId = normalizeText(fileId || "");
    if (!normalizedId) {
      return {
        url: "",
        downloadUrl: "",
        viewUrl: "",
        thumbnailUrl: "",
      };
    }

    const encodedId = encodeURIComponent(normalizedId);
    return {
      url: `https://drive.google.com/uc?export=download&id=${encodedId}`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${encodedId}`,
      viewUrl: `https://drive.google.com/file/d/${encodedId}/view`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${encodedId}&sz=w2000`,
    };
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
    if (!(fileObj instanceof File)) {
      throw new Error("Không có file hợp lệ để tải lên Drive.");
    }

    const formData = new FormData();
    formData.append("file", fileObj, fileObj.name || "media");
    formData.append("name", options.name || fileObj.name || "media");

    const response = await fetch(getDriveUploadProxyUrl(), {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.message || "Không thể tải file lên Google Drive.",
      );
    }

    const fileId = normalizeText(payload.fileId || "");
    const urls = getDriveFileUrls(fileId);

    return {
      id: fileId,
      fileId,
      name: normalizeText(payload.name || fileObj.name || "Tệp đính kèm"),
      extension: getFileExtension(payload.name || fileObj.name, payload.type || fileObj.type),
      url: urls.url,
      download_url: urls.downloadUrl,
      view_url: urls.viewUrl,
      thumbnail_url: urls.thumbnailUrl,
      type: normalizeText(payload.type || fileObj.type || ""),
      created_at: new Date().toISOString(),
    };
  }

  async function uploadFilesToDrive(files, options = {}) {
    const list = Array.from(files || []).filter((file) => file instanceof File);
    if (!list.length) return [];

    const uploads = [];
    for (const file of list) {
      uploads.push(await uploadFileToDrive(file, options));
    }
    return uploads;
  }

  window.GiaoHangNhanhCore = {
    inPublicDir,
    apiBasePath,
    projectBasePath,
    parentBasePath,
    publicBasePath,
    resolveDomesticArea,
    mapServiceLevelByArea,
    getDomesticPricingData,
    getDomesticCalculator,
    showFieldError,
    clearFieldError,
    escapeHtml,
    normalizeText,
    normalizePhone,
    showToast,
    getShippingFeeDetails,
    formatNumber,
    formatCurrency,
    formatDateTime,
    formatDateOnly,
    appendAuthParamsToUrl,
    getCurrentPathWithSearch,
    buildSharedAuthUrl,
    buildLoginRedirect,
    getSharedLoginUrl: (options = {}) =>
      buildSharedAuthUrl("dang-nhap.html", options),
    getSharedRegisterUrl: (options = {}) =>
      buildSharedAuthUrl("dang-ky.html", options),
    getPortalRoutes,
    getPortalLoginRedirect,
    bindPortalLogoutActions,
    extractRows,
    getKrudListFn,
    getStatusLabel,
    normalizeServiceType,
    getServiceLabel,
    getPaymentMethodLabel,
    getPaymentStatusLabel,
    getFeePayerLabel,
    createStatusBadge,
    renderLoading,
    renderError,
    apiRequest,
    getDriveUploadProxyUrl,
    getDriveFileUrls,
    uploadFileToDrive,
    uploadFilesToDrive,
  };

  window.getShippingFeeDetails = getShippingFeeDetails;
})(window);
