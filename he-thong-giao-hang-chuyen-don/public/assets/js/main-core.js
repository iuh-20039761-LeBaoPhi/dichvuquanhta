(function (window) {
  if (window.FastGoCore) return;

  const inPublicDir = window.location.pathname
    .toLowerCase()
    .includes("/public/");
  const apiBasePath =
    typeof window.apiBasePath === "string"
      ? window.apiBasePath
      : inPublicDir
        ? ""
        : "public/";

  const districtGroups = {
    inner: [
      "Quận 1",
      "Quận 3",
      "Quận 4",
      "Quận 5",
      "Quận 6",
      "Quận 10",
      "Quận 11",
      "Phú Nhuận",
      "Bình Thạnh",
      "Gò Vấp",
      "Tân Bình",
      "Tân Phú",
    ],
    outer: [
      "Quận 2",
      "Quận 7",
      "Quận 8",
      "Quận 9",
      "Quận 12",
      "Thủ Đức",
      "Bình Tân",
      "Hóc Môn",
      "Bình Chánh",
      "Nhà Bè",
      "Củ Chi",
      "Cần Giờ",
    ],
  };

  const allDistricts = [...districtGroups.inner, ...districtGroups.outer];
  let orderShippingBound = false;

  function toApiUrl(path) {
    if (!path) return path;
    if (/^(?:[a-z]+:)?\/\//i.test(path)) return path;
    return `${apiBasePath}${path}`;
  }

  function isMovingType(typeKey) {
    if (
      window.serviceHelper &&
      typeof window.serviceHelper.isMovingService === "function"
    ) {
      return window.serviceHelper.isMovingService(typeKey);
    }
    return String(typeKey || "").startsWith("moving_");
  }

  function checkDistrict(address, group) {
    if (!address) return false;
    return group.some((d) => address.toLowerCase().includes(d.toLowerCase()));
  }

  function detectDomesticZone(address) {
    if (!address) return "outside";
    if (checkDistrict(address, districtGroups.inner)) return "inner";
    if (checkDistrict(address, districtGroups.outer)) return "outer";
    return "outside";
  }

  function resolveDomesticArea(pickupAddr, deliveryAddr) {
    const fromZone = detectDomesticZone(pickupAddr);
    const toZone = detectDomesticZone(deliveryAddr);

    if (fromZone === "outside" || toZone === "outside") return "lien-tinh";
    if (fromZone === "inner" && toZone === "inner") return "noi-thanh";
    return "ngoai-thanh";
  }

  function mapServiceLevelByArea(serviceType, areaKey) {
    const normalized = String(serviceType || "")
      .trim()
      .toLowerCase();
    if (normalized === "slow") return "slow";
    if (normalized === "standard") return "standard";
    if (normalized === "fast") return "fast";
    if (normalized === "express") return "express";
    if (normalized === "bulk") return "slow";
    return null;
  }

  function isInternationalServiceType(typeKey) {
    const normalized = String(typeKey || "")
      .trim()
      .toLowerCase();
    return normalized === "intl_economy" || normalized === "intl_express";
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
    const servicesData = window.servicesData || [];

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
    const intlCountry = String(extras.intlCountry || "").trim();
    const intlProvince = String(extras.intlProvince || "").trim();
    const isIntlService = isInternationalServiceType(normalizedServiceType);

    if (isMovingType(normalizedServiceType)) {
      return {
        isContactPrice: true,
        serviceName: "Dịch vụ chuyển dọn",
      };
    }

    if (
      isIntlService &&
      typeof window.calculateInternationalQuote === "function" &&
      intlCountry
    ) {
      try {
        const intlResult = window.calculateInternationalQuote({
          country: intlCountry,
          province: intlProvince,
          itemType,
          weight: toPositiveNumber(weight, 0),
          quantity,
          length,
          width,
          height,
          insuranceValue,
        });
        const serviceQuote = Array.isArray(intlResult?.services)
          ? intlResult.services.find(
              (svc) =>
                String(svc?.serviceType || "")
                  .trim()
                  .toLowerCase() === normalizedServiceType,
            )
          : null;

        if (serviceQuote) {
          const breakdown = serviceQuote.breakdown || {};
          return {
            basePrice: toPositiveNumber(breakdown.basePrice, 0),
            weightFee: toPositiveNumber(breakdown.weightFee, 0),
            goodsFee: toPositiveNumber(
              breakdown.goodsAdjustedFee ?? breakdown.goodsFee,
              0,
            ),
            codFee: 0,
            insuranceFee: toPositiveNumber(breakdown.insuranceFee, 0),
            regionFee: 0,
            total: toPositiveNumber(serviceQuote.total, 0),
            vehicle:
              serviceQuote.vehicleSuggestion || "Máy bay + xe tải chặng cuối",
            serviceName: serviceQuote.serviceName || "Dịch vụ quốc tế",
            isContactPrice: false,
            areaKey: intlResult.zoneKey || "",
            levelKey: normalizedServiceType,
            estimate: serviceQuote.estimate || "",
            pricingSource: "quote-international",
            quantity: intlResult.quantity || quantity,
            billableWeight: toPositiveNumber(intlResult.billableWeight, 0),
          };
        }
      } catch (err) {
        console.error("calculateInternationalQuote failed", err);
      }
    }

    const service = servicesData.find(
      (s) => s.type_key === normalizedServiceType,
    );
    if (service) {
      serviceName = service.name;
      if (service.base_price == 0) {
        isContactPrice = true;
      } else {
        basePrice = parseFloat(service.base_price);
      }
    } else {
      if (normalizedServiceType === "slow") basePrice = 20000;
      else if (normalizedServiceType === "standard") basePrice = 30000;
      else if (normalizedServiceType === "fast") basePrice = 40000;
      else if (normalizedServiceType === "express") basePrice = 50000;
      else if (normalizedServiceType === "intl_economy")
        serviceName = "Tiêu chuẩn quốc tế";
      else if (normalizedServiceType === "intl_express")
        serviceName = "Chuyển phát nhanh quốc tế";
    }

    if (isContactPrice) {
      return { isContactPrice: true, serviceName };
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
    const areaKey = resolveDomesticArea(pickupAddr, deliveryAddr);
    const levelKey = mapServiceLevelByArea(normalizedServiceType, areaKey);

    if (
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

    if (pickupAddr && deliveryAddr) {
      const isFromOuter = checkDistrict(pickupAddr, districtGroups.outer);
      const isToOuter = checkDistrict(deliveryAddr, districtGroups.outer);

      if (isFromOuter && isToOuter) regionFee = 20000;
      else if (isFromOuter || isToOuter) regionFee = 15000;
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
      isContactPrice: false,
      pricingSource: "legacy",
      quantity,
    };
  }

  function calculateOrderShipping() {
    const pickupInput = document.getElementById("pickup-addr");
    const deliveryInput = document.getElementById("delivery-addr");
    const serviceSelect = document.getElementById("order-service-type");
    const pricePreview = document.getElementById("price-preview");
    const feeDisplay = document.getElementById("shipping-fee-display");
    const feeInput = document.getElementById("shipping-fee-input");

    if (
      !pickupInput ||
      !deliveryInput ||
      !serviceSelect ||
      !pricePreview ||
      !feeDisplay ||
      !feeInput
    ) {
      return;
    }

    const pickupVal = pickupInput.value;
    const deliveryVal = deliveryInput.value;
    const serviceType = serviceSelect.value;
    if (!String(serviceType || "").trim()) {
      pricePreview.style.display = "none";
      feeInput.value = 0;
      return;
    }
    const weightInput = document.getElementById("weight");
    const codInput = document.getElementById("cod_amount");
    const weight = weightInput ? weightInput.value || 0 : 0;
    const codAmount = codInput ? codInput.value || 0 : 0;
    const deliveryForm = document.getElementById("create-order-form");
    const quantity =
      deliveryForm?.querySelector("[name='quantity']")?.value || "1";
    const length =
      deliveryForm?.querySelector("[name='length']")?.value || "0";
    const width = deliveryForm?.querySelector("[name='width']")?.value || "0";
    const height =
      deliveryForm?.querySelector("[name='height']")?.value || "0";
    const insuranceValue =
      deliveryForm?.querySelector("[name='insurance_value']")?.value || "0";
    const itemType =
      deliveryForm?.querySelector("[name='item_type']")?.value || "";
    const packageType =
      deliveryForm?.querySelector("[name='package_type']")?.value || "";
    const fromCity =
      deliveryForm?.querySelector("[name='pickup_city']")?.value || "";
    const fromDistrict =
      deliveryForm?.querySelector("[name='pickup_district']")?.value || "";
    const toCity =
      deliveryForm?.querySelector("[name='delivery_city']")?.value || "";
    const toDistrict =
      deliveryForm?.querySelector("[name='delivery_district']")?.value || "";
    const intlCountry =
      deliveryForm?.querySelector("[name='intl_country']")?.value || "";
    const intlProvince =
      deliveryForm?.querySelector("[name='intl_province']")?.value || "";
    const isIntlService = isInternationalServiceType(serviceType);

    if (pickupVal.length > 5 && deliveryVal.length > 5) {
      if (isIntlService && !intlCountry) {
        pricePreview.style.display = "none";
        feeInput.value = 0;
        return;
      }
      const feeDetails = getShippingFeeDetails(
        serviceType,
        weight,
        codAmount,
        pickupVal,
        deliveryVal,
        {
          quantity,
          length,
          width,
          height,
          insuranceValue,
          itemType,
          packageType,
          fromCity,
          fromDistrict,
          toCity,
          toDistrict,
          intlCountry,
          intlProvince,
        },
      );

      if (feeDetails.isContactPrice) {
        pricePreview.style.display = "block";
        feeDisplay.innerText = "Liên hệ";
        feeInput.value = 0;
        return;
      }

      pricePreview.style.display = "block";
      feeDisplay.innerText = feeDetails.total.toLocaleString();
      feeInput.value = feeDetails.total;
    } else {
      pricePreview.style.display = "none";
      feeInput.value = 0;
    }
  }

  function bindOrderShippingInputs() {
    if (orderShippingBound) return;

    const deliveryForm = document.getElementById("create-order-form");
    const baseInputs = [
      document.getElementById("pickup-addr"),
      document.getElementById("delivery-addr"),
      document.getElementById("order-service-type"),
      document.getElementById("weight"),
      document.getElementById("cod_amount"),
      document.getElementById("pickup-city"),
      document.getElementById("pickup-district"),
      document.getElementById("delivery-city"),
      document.getElementById("delivery-district"),
      document.getElementById("delivery-intl-country"),
      document.getElementById("delivery-intl-province"),
    ];
    const extraInputs = deliveryForm
      ? [
          "quantity",
          "length",
          "width",
          "height",
          "insurance_value",
          "item_type",
          "package_type",
          "pickup_city",
          "pickup_district",
          "delivery_city",
          "delivery_district",
          "intl_country",
          "intl_province",
        ].map((name) => deliveryForm.querySelector(`[name="${name}"]`))
      : [];

    const orderInputs = [...baseInputs, ...extraInputs].filter(Boolean);

    if (!orderInputs.length) return;

    orderInputs.forEach((input) => {
      input.addEventListener("input", calculateOrderShipping);
      input.addEventListener("change", calculateOrderShipping);
    });
    calculateOrderShipping();
    orderShippingBound = true;
  }

  window.FastGoCore = {
    inPublicDir,
    apiBasePath,
    districtGroups,
    allDistricts,
    toApiUrl,
    isMovingType,
    checkDistrict,
    detectDomesticZone,
    resolveDomesticArea,
    mapServiceLevelByArea,
    isInternationalServiceType,
    getDomesticPricingData,
    getDomesticCalculator,
    showFieldError,
    clearFieldError,
    escapeHtml,
    getShippingFeeDetails,
    calculateOrderShipping,
    bindOrderShippingInputs,
  };

  window.getShippingFeeDetails = getShippingFeeDetails;
  window.calculateOrderShipping = calculateOrderShipping;
})(window);
