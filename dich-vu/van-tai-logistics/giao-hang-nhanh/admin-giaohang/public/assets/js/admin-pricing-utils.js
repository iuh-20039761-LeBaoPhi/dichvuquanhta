(function (window) {
  const SERVICE_TYPE_TO_JSON_KEY = {
    standard: "tieuchuan",
    fast: "nhanh",
    express: "hoatoc",
    instant: "laptuc",
  };
  const SERVICE_DISPLAY_ORDER = ["instant", "express", "fast", "standard"];

  function slugify(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (normalized) return normalized;
    let hash = 0;
    const source = String(value || "");
    for (let i = 0; i < source.length; i += 1) {
      hash = (hash << 5) - hash + source.charCodeAt(i);
      hash |= 0;
    }
    return `key-${Math.abs(hash)}`;
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function formatDecimal(value, precision = 3) {
    return Number(toNumber(value, 0).toFixed(precision));
  }

  function sanitizePriceKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatMoneyPreview(value) {
    return `${new Intl.NumberFormat("vi-VN").format(Math.round(toNumber(value, 0)))}đ`;
  }

  function formatPercent(value) {
    return `${(toNumber(value, 0) * 100).toFixed(2)}%`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clonePricingData(pricingData) {
    return JSON.parse(JSON.stringify(pricingData || {}));
  }

  function getServiceLabelsByType(pricingData) {
    const services = pricingData?.BAOGIACHITIET?.noidia?.dichvu || {};
    return Object.fromEntries(
      Object.entries(SERVICE_TYPE_TO_JSON_KEY).map(([serviceType, jsonKey]) => [
        serviceType,
        String(services?.[jsonKey]?.ten || jsonKey).trim(),
      ]),
    );
  }

  function replaceServiceNameForType(text, serviceType, labels) {
    const label = String(labels?.[serviceType] || "").trim();
    if (!text || !label) return text;
    const aliasPatterns = {
      standard: [/Gói\s+Tiêu\s+chuẩn/gi, /Tiêu\s+Chuẩn/gi, /Tiêu\s+chuẩn/gi],
      fast: [/Gói\s+Nhanh/gi, /Giao\s+Nhanh/gi, /Giao\s+nhanh/gi],
      express: [/Gói\s+Hỏa\s+tốc/gi, /Hỏa\s*Tốc/gi, /Hỏa\s*tốc/gi],
      instant: [
        /Giao\s+hàng\s+ngay\s+lập\s+tức/gi,
        /Giao\s+Ngay\s+Lập\s+Tức/gi,
        /Giao\s+ngay\s+lập\s+tức/gi,
        /Giao\s+Ngay/gi,
        /Giao\s+ngay/gi,
        /Ngay\s+lập\s+tức/gi,
      ],
    };
    const sourceText = String(text);
    for (const pattern of aliasPatterns[serviceType] || []) {
      const replacedText = sourceText.replace(pattern, label);
      if (replacedText !== sourceText) return replacedText;
    }
    return sourceText;
  }

  function replaceKnownServiceNames(text, labels) {
    return ["instant", "express", "fast", "standard"].reduce(
      (nextText, serviceType) => replaceServiceNameForType(nextText, serviceType, labels),
      String(text || ""),
    );
  }

  function buildSyncedExampleTitle(rawTitle, serviceType, labels) {
    const label = String(labels?.[serviceType] || serviceType || "Dịch vụ").trim();
    const title = String(rawTitle || "").trim();
    if (!title) return `Ví dụ: ${label}`;
    const prefixMatch = title.match(/^(Ví dụ(?:\s+\d+)?\s*:)\s*/i);
    if (prefixMatch) return `${prefixMatch[1]} ${label}`;
    return replaceServiceNameForType(title, serviceType, labels);
  }

  function normalizePricingDisplayLabels(pricingData) {
    if (!pricingData || typeof pricingData !== "object") return pricingData;
    const labels = getServiceLabelsByType(pricingData);

    if (Array.isArray(pricingData.so_sanh_dich_vu)) {
      pricingData.so_sanh_dich_vu.forEach((item) => {
        const serviceType = String(item?.service_type || "").trim();
        if (serviceType && labels[serviceType]) {
          item.goi = labels[serviceType];
        }
      });
    }

    if (Array.isArray(pricingData.vi_du_hoan_chinh)) {
      pricingData.vi_du_hoan_chinh.forEach((example) => {
        const serviceType = String(example?.service_type || "").trim();
        if (!serviceType) return;
        example.title = buildSyncedExampleTitle(example.title, serviceType, labels);
        if (example.summary) {
          example.summary = replaceKnownServiceNames(example.summary, labels);
        }
      });
    }

    const pricingContent = pricingData.noi_dung_bang_gia || {};
    const serviceScenario =
      pricingContent?.phu_phi_dich_vu?.thoi_gian_thoi_tiet?.vi_du;
    if (serviceScenario?.title && serviceScenario?.service_type) {
      serviceScenario.title = replaceServiceNameForType(
        serviceScenario.title,
        serviceScenario.service_type,
        labels,
      );
    }

    const finalNotes = pricingContent?.vi_du_hoan_chinh?.ghi_chu;
    if (Array.isArray(finalNotes)) {
      const orderedLabels = SERVICE_DISPLAY_ORDER
        .map((serviceType) => labels[serviceType])
        .filter(Boolean)
        .join(" → ");
      pricingContent.vi_du_hoan_chinh.ghi_chu = finalNotes.map((note) => {
        const text = String(note || "");
        if (text.includes("4 ví dụ") && text.includes("→") && orderedLabels) {
          return `<strong>4 ví dụ trên</strong> lần lượt đi theo đúng thứ tự: <strong>${orderedLabels}</strong>, để bạn đối chiếu nhanh từ gói khẩn cấp nhất đến gói tiết kiệm nhất. Đây vẫn là giá tham khảo để bạn ra quyết định nhanh trước khi tạo đơn.`;
        }
        return replaceKnownServiceNames(text, labels);
      });
    }

    return pricingData;
  }

  function stripKrudMeta(pricingData) {
    const cloned = clonePricingData(pricingData);
    normalizePricingDisplayLabels(cloned);
    if (cloned && typeof cloned === "object") {
      delete cloned._krud_meta;
    }
    return cloned;
  }

  function isValidTimeText(value) {
    return /^\d{2}:\d{2}$/.test(String(value || "").trim());
  }

  window.GHNAdminPricingUtils = {
    slugify,
    toNumber,
    formatDecimal,
    sanitizePriceKey,
    formatMoneyPreview,
    formatPercent,
    escapeHtml,
    clonePricingData,
    normalizePricingDisplayLabels,
    stripKrudMeta,
    isValidTimeText,
  };
})(window);
