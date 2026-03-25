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
      ? serviceData.cau_truc_gia_chuan || null
      : null;
  }

  function getPricingVehicleEntries(serviceData) {
    const standardStructure = getPricingStandardStructure(serviceData);
    const standardVehicles =
      standardStructure?.chi_phi_co_ban?.cuoc_xe?.loai_xe;

    if (Array.isArray(standardVehicles) && standardVehicles.length) {
      return standardVehicles.map((item) => ({
        slug: String(item?.slug || "").trim(),
        ten_hien_thi: String(item?.ten || "").trim(),
        gia_co_ban: Number(item?.gia_co_ban || 0),
        km_co_ban: Number(item?.km_mien_phi || 0),
        gia_moi_km_tiep: Number(item?.gia_km_vuot || 0),
        tai_trong_kg: Number(item?.tai_trong_xe_kg || 0),
        dung_tich_m3: Number(item?.dung_tich_xe_m3 || 0),
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

  function getPricingCalculationItems(serviceData) {
    const standardStructure = getPricingStandardStructure(serviceData);
    const standardItems =
      standardStructure?.chi_phi_dich_vu?.hang_muc_tinh_toan;

    if (Array.isArray(standardItems) && standardItems.length) {
      return standardItems.map((item) => ({
        slug: String(item?.slug || "").trim(),
        ten: String(item?.ten || "").trim(),
        don_vi: String(item?.don_vi || "").trim(),
        don_gia: Number(item?.don_gia || 0),
        nguon_hien_thi_slug: String(item?.nguon_hien_thi_slug || "").trim(),
      }));
    }
    return [];
  }

  function getPricingFixedFeeEntries(serviceData) {
    const standardStructure = getPricingStandardStructure(serviceData);
    const fixedStructure = standardStructure?.phu_phi_co_dinh;

    if (fixedStructure) {
      const items = [];

      if (fixedStructure.the_tich?.don_gia_moi_buoc) {
        items.push({
          title: "Thể tích vượt ngưỡng",
          value: `${formatCurrencyVnd(fixedStructure.the_tich.don_gia_moi_buoc)} / ${fixedStructure.the_tich.don_vi || "m³"}`,
          note: `Tính gộp toàn đơn, vượt ${fixedStructure.the_tich.nguong_mien_phi}${fixedStructure.the_tich.don_vi || "m³"} theo bước ${fixedStructure.the_tich.buoc_nhay}${fixedStructure.the_tich.don_vi || "m³"}`,
        });
      }

      if (fixedStructure.trong_luong?.don_gia_moi_buoc) {
        items.push({
          title: "Trọng lượng vượt ngưỡng",
          value: `${formatCurrencyVnd(fixedStructure.trong_luong.don_gia_moi_buoc)} / ${fixedStructure.trong_luong.buoc_nhay || 1}${fixedStructure.trong_luong.don_vi || "kg"}`,
          note: `Tính gộp toàn đơn, vượt ${fixedStructure.trong_luong.nguong_mien_phi}${fixedStructure.trong_luong.don_vi || "kg"} theo bước ${fixedStructure.trong_luong.buoc_nhay}${fixedStructure.trong_luong.don_vi || "kg"}`,
        });
      }

      if (Array.isArray(fixedStructure.tinh_chat_do_dac)) {
        fixedStructure.tinh_chat_do_dac.forEach((item) => {
          const amount = Number(item?.don_gia || 0);
          if (!Number.isFinite(amount) || amount <= 0) return;
          items.push({
            title: String(item?.ten || "").trim(),
            value: `${formatCurrencyVnd(amount)}${item?.don_vi ? ` / ${item.don_vi}` : ""}`,
            note:
              item?.ap_dung === "theo_mon"
                ? "Áp dụng theo số món, thiếu số lượng thì mặc định 1 món."
                : "Áp dụng theo cấu hình của đơn hàng.",
          });
        });
      }

      return items;
    }
    return [];
  }

  function formatMultiplierValue(item) {
    const multiplier = Number(item?.he_so);
    if (Number.isFinite(multiplier) && multiplier > 0) {
      return `x${multiplier.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}`;
    }

    const referenceValue = Number(item?.tham_chieu_du_lieu_cu?.gia_tri || 0);
    if (Number.isFinite(referenceValue) && referenceValue > 0) {
      return formatCurrencyVnd(referenceValue);
    }

    return "0";
  }

  function getPricingMultiplierEntries(serviceData) {
    const standardStructure = getPricingStandardStructure(serviceData);
    const multiplierStructure = standardStructure?.he_so;

    if (multiplierStructure) {
      return ["khung_gio", "thoi_tiet"]
        .flatMap((groupKey) => (Array.isArray(multiplierStructure[groupKey]) ? multiplierStructure[groupKey] : []))
        .map((item) => ({
          title: String(item?.ten || "").trim(),
          value: formatMultiplierValue(item),
          note:
            Number(item?.he_so) > 0
              ? "Áp dụng như hệ số nhân trên tổng trước đó."
              : "Áp dụng như phụ phí cố định đã chốt trong bảng giá.",
        }));
    }
    return [];
  }

  function getPricingStartingPrice(serviceData) {
    const values = getPricingVehicleEntries(serviceData)
      .map((item) => Number(item?.gia_co_ban || 0))
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
    getPricingCalculationItems,
    getPricingFixedFeeEntries,
    getPricingMultiplierEntries,
    getPricingStartingPrice,
  };
})(window);
