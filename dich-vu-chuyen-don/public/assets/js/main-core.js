(function (window) {
  if (window.FastGoCore) return;

  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const currentPathLower = currentPath.toLowerCase();
  const inPublicDir = currentPathLower.includes("/public/");
  const projectMarker = "/dich-vu-chuyen-don/";
  const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
  const projectBase =
    projectMarkerIndex !== -1
      ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
      : "./";
  const publicBase = `${projectBase}public/`;
  const assetsBase = `${publicBase}assets/`;
  const apiBasePath = projectBase;

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

  function toApiUrl(path) {
    if (!path) return path;
    if (/^(?:[a-z]+:)?\/\//i.test(path) || String(path).startsWith("/")) return path;
    return joinUrl(apiBasePath, path);
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
    return text
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

  function getPricingMultiplierEntries(serviceData) {
    const pricingStructure = getPricingStandardStructure(serviceData);
    const surchargeGroups = pricingStructure?.phu_phi;

    if (surchargeGroups) {
      return ["khung_gio", "thoi_tiet"]
        .flatMap((groupKey) => (Array.isArray(surchargeGroups[groupKey]) ? surchargeGroups[groupKey] : []))
        .map((item) => ({
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

  window.FastGoCore = {
    inPublicDir,
    projectBase,
    publicBase,
    assetsBase,
    apiBasePath,
    toProjectUrl,
    toPublicUrl,
    toAssetsUrl,
    toApiUrl,
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
})(window);
