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
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
    const instantMeta = (quoteDomestic.services || {}).instant || {};
    const instantDistance = quoteDomestic.distanceConfig || {};
    const localServiceMap = {
      standard: { name: "Giao tiêu chuẩn", basePrice: 30000 },
      fast: { name: "Giao nhanh", basePrice: 40000 },
      express: { name: "Giao hỏa tốc", basePrice: 50000 },
      instant: {
        name: "Giao ngay lập tức",
        basePrice:
          toPositiveNumber(instantDistance.base_price, 0) *
            Math.max(toPositiveNumber(instantMeta.serviceMultiplier, 1), 1) ||
          65000,
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
        basePrice: toPositiveNumber(breakdown.basePrice, 0),
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

  window.GiaoHangNhanhCore = {
    inPublicDir,
    apiBasePath,
    projectBasePath,
    publicBasePath,
    resolveDomesticArea,
    mapServiceLevelByArea,
    getDomesticPricingData,
    getDomesticCalculator,
    showFieldError,
    clearFieldError,
    escapeHtml,
    showToast,
    getShippingFeeDetails,
  };

  window.getShippingFeeDetails = getShippingFeeDetails;
})(window);
