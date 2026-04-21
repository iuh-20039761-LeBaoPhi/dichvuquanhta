(function (window, document) {
  const config = window.GHNAdminPricing || {};
  if (!config.pageUrl || !config.exportUrl) return;
  const pricingUtils = window.GHNAdminPricingUtils || null;
  if (!pricingUtils) {
    console.error("Thiếu admin-pricing-utils.js trước admin-pricing-krud.js.");
    return;
  }
  const {
    slugify,
    toNumber,
    formatDecimal,
    sanitizePriceKey,
    formatMoneyPreview,
    formatPercent,
    clonePricingData,
    normalizePricingDisplayLabels,
    stripKrudMeta,
    isValidTimeText,
  } = pricingUtils;

  const SERVICE_ORDER = {
    tieuchuan: 10,
    nhanh: 20,
    hoatoc: 30,
    laptuc: 40,
  };
  const REGION_ORDER = {
    cung_quan: 10,
    noi_thanh: 20,
    lien_tinh: 30,
  };
  const REGION_BASE_KEY = {
    cung_quan: "cungquan",
    noi_thanh: "khacquan",
    lien_tinh: "lientinh",
  };
  const CHUNK_KEYS = [
    "vi_du_tinh_phi",
    "noi_dung_bang_gia",
    "vi_du_hoan_chinh",
    "so_sanh_dich_vu",
  ];
  const ACTIVE_VERSION_META_KEY = "active_pricing_version_id";
  const PARTIAL_ACTION_TABLES = {
    save_services: ["ghn_goi_dich_vu", "ghn_gia_goi_theo_vung"],
    save_instant_service: ["ghn_goi_dich_vu", "ghn_cau_hinh_khoang_cach"],
    add_service_time: ["ghn_khung_gio_dich_vu"],
    save_service_time_row: ["ghn_khung_gio_dich_vu"],
    delete_service_time: ["ghn_khung_gio_dich_vu"],
    add_weather: ["ghn_dieu_kien_giao"],
    save_weather_row: ["ghn_dieu_kien_giao"],
    delete_weather: ["ghn_dieu_kien_giao"],
    save_cod_insurance: ["ghn_cau_hinh_tai_chinh"],
    add_vehicle: ["ghn_phuong_tien"],
    delete_vehicle: ["ghn_phuong_tien"],
    save_vehicle_row: ["ghn_phuong_tien"],
    add_goods_fee: ["ghn_loai_hang"],
    delete_goods_fee: ["ghn_loai_hang"],
    save_goods_fee_row: ["ghn_loai_hang"],
  };
  const ACTION_SECTION_IDS = {
    save_services: "section-vung",
    save_instant_service: "section-instant",
    add_service_time: "section-service-fee",
    save_service_time_row: "section-service-fee",
    delete_service_time: "section-service-fee",
    add_weather: "section-service-fee",
    save_weather_row: "section-service-fee",
    delete_weather: "section-service-fee",
    save_cod_insurance: "section-cod",
    add_vehicle: "section-vehicle",
    delete_vehicle: "section-vehicle",
    save_vehicle_row: "section-vehicle",
    add_goods_fee: "section-goods",
    delete_goods_fee: "section-goods",
    save_goods_fee_row: "section-goods",
  };
  const TABLE_KEY_FIELDS = {
    ghn_vung_giao_hang: ["region_key"],
    ghn_goi_dich_vu: ["service_key"],
    ghn_gia_goi_theo_vung: ["service_key", "region_key"],
    ghn_loai_hang: ["item_type_key"],
    ghn_cau_hinh_phi_dich_vu: ["config_key"],
    ghn_khung_gio_dich_vu: ["slot_key"],
    ghn_dieu_kien_giao: ["condition_key"],
    ghn_phuong_tien: ["vehicle_key"],
    ghn_cau_hinh_khoang_cach: ["config_key"],
    ghn_cau_hinh_tai_chinh: ["finance_key"],
    ghn_thanh_pho: ["city_key"],
    ghn_quan_huyen: ["city_key", "district_name"],
    ghn_goi_y_phuong_tien: ["suggestion_key"],
    ghn_pricing_chunks: ["chunk_key"],
  };
  let currentPricingSnapshot = config.currentPricingData || null;
  let activeVersionId = Number(config.activeVersionId || 0);
  let progressTimer = 0;
  let pendingProgressMessage = "";
  let progressContainer = null;
  let progressToast = null;

  function getInsertFn() {
    if (typeof window.crud === "function") {
      return (tableName, data) => window.crud("insert", tableName, data);
    }
    if (typeof window.krud === "function") {
      return (tableName, data) => window.krud("insert", tableName, data);
    }
    return null;
  }

  function getUpdateFn() {
    if (typeof window.crud === "function") {
      return (tableName, data, id) => window.crud("update", tableName, data, id);
    }
    if (typeof window.krud === "function") {
      return (tableName, data, id) => window.krud("update", tableName, data, id);
    }
    return null;
  }

  function getListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }
    if (typeof window.crud === "function") {
      return (payload) => {
        const options = {
          ...payload,
          p: payload.page || payload.p || 1,
          limit: payload.limit || 100,
        };
        delete options.table;
        delete options.page;
        return window.crud("list", payload.table, options);
      };
    }
    if (typeof window.krud === "function") {
      return (payload) => {
        const options = {
          ...payload,
          p: payload.page || payload.p || 1,
          limit: payload.limit || 100,
        };
        delete options.table;
        delete options.page;
        return window.krud("list", payload.table, options);
      };
    }
    return null;
  }

  function getDeleteFn() {
    if (typeof window.crud === "function") {
      return (tableName, id) => window.crud("delete", tableName, { id });
    }
    if (typeof window.krud === "function") {
      return (tableName, id) => window.krud("delete", tableName, { id });
    }
    return null;
  }

  function extractRows(payload, depth = 0) {
    if (depth > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, depth + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function readNonNegativeFormNumber(formData, fieldName, fallback, label) {
    const value = Math.round(toNumber(formData.get(fieldName), fallback));
    if (value < 0) {
      throw new Error(`${label} không được âm.`);
    }
    return value;
  }

  function readFormString(formData, fieldName, fallback = "") {
    return String(
      formData.has(fieldName) ? formData.get(fieldName) : fallback,
    ).trim();
  }

  function applyDirectFormUpdate(action, formData, basePricingData) {
    const pricingData = clonePricingData(basePricingData);
    const domestic = pricingData?.BAOGIACHITIET?.noidia || {};
    const serviceFeeConfig = domestic?.phidichvu?.giaongaylaptuc || {};

    if (action === "save_services") {
      const serviceKey = extractBracketKey(formData, "services");
      const serviceConfig = domestic?.dichvu?.[serviceKey];
      if (!serviceKey || !serviceConfig) {
        throw new Error("Không tìm thấy gói dịch vụ cần cập nhật.");
      }

      const nextLabel = String(formData.get(`services[${serviceKey}][ten]`) || serviceConfig.ten || "").trim();
      if (!nextLabel) {
        throw new Error("Tên hiển thị của gói dịch vụ không được để trống.");
      }

      serviceConfig.ten = nextLabel;
      serviceConfig.coban = {
        ...(serviceConfig.coban || {}),
        cungquan: readNonNegativeFormNumber(
          formData,
          `services[${serviceKey}][cungquan]`,
          serviceConfig?.coban?.cungquan || 0,
          `Giá cùng quận của ${nextLabel}`,
        ),
        khacquan: readNonNegativeFormNumber(
          formData,
          `services[${serviceKey}][khacquan]`,
          serviceConfig?.coban?.khacquan || 0,
          `Giá nội thành của ${nextLabel}`,
        ),
        lientinh: readNonNegativeFormNumber(
          formData,
          `services[${serviceKey}][lientinh]`,
          serviceConfig?.coban?.lientinh || 0,
          `Giá liên tỉnh của ${nextLabel}`,
        ),
      };
      serviceConfig.buoctiep = readNonNegativeFormNumber(
        formData,
        `services[${serviceKey}][buoctiep]`,
        serviceConfig?.buoctiep || 0,
        `Giá bước tiếp của ${nextLabel}`,
      );
      serviceConfig.thoigian = {
        ...(serviceConfig.thoigian || {}),
        cung_quan: readFormString(
          formData,
          `services[${serviceKey}][thoigian][cung_quan]`,
          serviceConfig?.thoigian?.cung_quan || "",
        ),
        noi_thanh: readFormString(
          formData,
          `services[${serviceKey}][thoigian][noi_thanh]`,
          serviceConfig?.thoigian?.noi_thanh || "",
        ),
        lien_tinh: readFormString(
          formData,
          `services[${serviceKey}][thoigian][lien_tinh]`,
          serviceConfig?.thoigian?.lien_tinh || "",
        ),
      };
      delete serviceConfig.heso_dichvu;
      return pricingData;
    }

    if (action === "save_instant_service") {
      const serviceConfig = domestic?.dichvu?.laptuc || {};
      const distanceConfig = domestic?.cauhinh_khoangcach || {};
      const nextLabel = String(formData.get("instant_service[ten]") || serviceConfig.ten || "Giao ngay").trim();
      const nearPrice = Math.round(toNumber(formData.get("instant_distance[gia_xe_may_gan]"), distanceConfig.gia_xe_may_gan || 6500));
      const farThreshold = Number(toNumber(formData.get("instant_distance[nguong_xe_may_xa]"), distanceConfig.nguong_xe_may_xa || 20).toFixed(1));
      const farPrice = Math.round(toNumber(formData.get("instant_distance[gia_xe_may_xa]"), distanceConfig.gia_xe_may_xa || 5000));

      if (!nextLabel) {
        throw new Error("Tên hiển thị của Giao ngay không được để trống.");
      }
      if (nearPrice <= 0 || farPrice <= 0) {
        throw new Error("Đơn giá xe máy phải lớn hơn 0.");
      }
      if (farThreshold <= 0) {
        throw new Error("Ngưỡng bắt đầu giá đường dài phải lớn hơn 0.");
      }
      if (farPrice > nearPrice) {
        throw new Error("Đơn giá sau ngưỡng xa không nên lớn hơn đơn giá gần.");
      }

      serviceConfig.ten = nextLabel;
      delete serviceConfig.heso_dichvu;
      distanceConfig.gia_xe_may_gan = nearPrice;
      distanceConfig.nguong_xe_may_xa = farThreshold;
      distanceConfig.gia_xe_may_xa = farPrice;
      return pricingData;
    }

    if (action === "save_service_time_row") {
      const originalKey = sanitizePriceKey(formData.get("original_time_key"));
      const timeRows = serviceFeeConfig?.thoigian || {};
      const timeConfig = timeRows[originalKey];
      if (!originalKey || !timeConfig) {
        throw new Error("Không tìm thấy khung giờ cần cập nhật.");
      }

      const nextKey = sanitizePriceKey(formData.get("time_row[key]") || originalKey);
      const nextLabel = String(formData.get("time_row[ten]") || timeConfig.ten || nextKey).trim();
      const start = String(formData.get("time_row[batdau]") || timeConfig.batdau || "00:00").trim();
      const end = String(formData.get("time_row[ketthuc]") || timeConfig.ketthuc || "23:59").trim();
      const fixedFee = Math.round(toNumber(formData.get("time_row[phicodinh]"), timeConfig.phicodinh || 0));
      const factor = Number(toNumber(formData.get("time_row[heso]"), timeConfig.heso || 1).toFixed(3));

      if (!nextKey || !nextLabel) {
        throw new Error("Mã và tên khung giờ không được để trống.");
      }
      if (nextKey !== originalKey) {
        throw new Error("Đổi mã khung giờ cần đi qua luồng refresh đầy đủ.");
      }
      if (!isValidTimeText(start) || !isValidTimeText(end)) {
        throw new Error("Giờ bắt đầu và kết thúc không hợp lệ.");
      }
      if (factor < 1) {
        throw new Error("Hệ số phải từ 1 trở lên.");
      }

      timeRows[originalKey] = {
        ...timeConfig,
        ten: nextLabel,
        batdau: start,
        ketthuc: end,
        phicodinh: fixedFee,
        heso: factor,
      };
      return pricingData;
    }

    if (action === "save_weather_row") {
      const originalKey = sanitizePriceKey(formData.get("original_weather_key"));
      const weatherRows = serviceFeeConfig?.thoitiet || {};
      const weatherConfig = weatherRows[originalKey];
      if (!originalKey || !weatherConfig) {
        throw new Error("Không tìm thấy điều kiện giao cần cập nhật.");
      }

      const nextKey = sanitizePriceKey(formData.get("weather_row[key]") || originalKey);
      const nextLabel = String(formData.get("weather_row[ten]") || weatherConfig.ten || nextKey).trim();
      const fixedFee = Math.round(toNumber(formData.get("weather_row[phicodinh]"), weatherConfig.phicodinh || 0));
      const factor = Number(toNumber(formData.get("weather_row[heso]"), weatherConfig.heso || 1).toFixed(3));

      if (!nextKey || !nextLabel) {
        throw new Error("Mã và tên điều kiện không được để trống.");
      }
      if (nextKey !== originalKey) {
        throw new Error("Đổi mã điều kiện cần đi qua luồng refresh đầy đủ.");
      }
      if (factor < 1) {
        throw new Error("Hệ số phải từ 1 trở lên.");
      }

      weatherRows[originalKey] = {
        ...weatherConfig,
        ten: nextLabel,
        phicodinh: fixedFee,
        heso: factor,
      };
      return pricingData;
    }

    if (action === "save_cod_insurance") {
      const feeConfig = pricingData?.BANGGIA?.phuthu || {};
      const codRate = Number(toNumber(formData.get("cod_insurance[cod_kieu]"), feeConfig?.thuho?.kieu || 0).toFixed(4));
      const insuranceRate = Number(toNumber(formData.get("cod_insurance[insurance_kieu]"), feeConfig?.baohiem?.kieu || 0).toFixed(4));

      if (codRate < 0 || codRate > 1 || insuranceRate < 0 || insuranceRate > 1) {
        throw new Error("Tỷ lệ COD và bảo hiểm phải nằm trong khoảng từ 0 đến 1.");
      }

      feeConfig.thuho = {
        ...(feeConfig.thuho || {}),
        nguong: Math.round(toNumber(formData.get("cod_insurance[cod_nguong]"), feeConfig?.thuho?.nguong || 0)),
        kieu: codRate,
        toithieu: Math.round(toNumber(formData.get("cod_insurance[cod_toithieu]"), feeConfig?.thuho?.toithieu || 0)),
      };
      feeConfig.baohiem = {
        ...(feeConfig.baohiem || {}),
        nguong: Math.round(toNumber(formData.get("cod_insurance[insurance_nguong]"), feeConfig?.baohiem?.nguong || 0)),
        kieu: insuranceRate,
        toithieu: Math.round(toNumber(formData.get("cod_insurance[insurance_toithieu]"), feeConfig?.baohiem?.toithieu || 0)),
      };
      pricingData.BANGGIA.phuthu = feeConfig;
      return pricingData;
    }

    if (action === "save_vehicle_row") {
      const originalKey = String(formData.get("original_vehicle_key") || "").trim();
      const vehicles = pricingData?.phuong_tien || [];
      const vehicle = vehicles.find((item) => String(item?.key || "") === originalKey);
      if (!originalKey || !vehicle) {
        throw new Error("Không tìm thấy phương tiện cần cập nhật.");
      }

      const nextKey = String(formData.get("vehicle_row[key]") || originalKey).trim();
      const nextLabel = String(formData.get("vehicle_row[label]") || vehicle.label || nextKey).trim();
      const weight = Number(toNumber(formData.get("vehicle_row[trong_luong_toi_da]"), vehicle.trong_luong_toi_da || 0).toFixed(2));
      const basePrice = Math.round(toNumber(formData.get("vehicle_row[gia_co_ban]"), vehicle.gia_co_ban || 0));
      const factor = Number(toNumber(formData.get("vehicle_row[he_so_xe]"), vehicle.he_so_xe || 1).toFixed(2));
      const minFee = Math.round(toNumber(formData.get("vehicle_row[phi_toi_thieu]"), vehicle.phi_toi_thieu || 0));
      const description = String(formData.get("vehicle_row[description]") || vehicle.description || "").trim();

      if (!nextKey) {
        throw new Error("Mã phương tiện không được để trống.");
      }
      if (!nextLabel) {
        throw new Error("Tên hiển thị phương tiện không được để trống.");
      }
      if (nextKey !== originalKey) {
        throw new Error("Đổi mã phương tiện cần đi qua luồng refresh đầy đủ.");
      }
      if (factor < 1) {
        throw new Error("Hệ số xe phải từ 1 trở lên.");
      }
      if (basePrice <= 0 || minFee < 0 || weight <= 0) {
        throw new Error("Giá cơ bản, phí tối thiểu và tải trọng tối đa của phương tiện phải hợp lệ.");
      }

      Object.assign(vehicle, {
        key: nextKey,
        label: nextLabel,
        he_so_xe: factor,
        gia_co_ban: basePrice,
        phi_toi_thieu: minFee,
        trong_luong_toi_da: weight,
        description,
      });
      return pricingData;
    }

    if (action === "save_goods_fee_row") {
      const originalKey = sanitizePriceKey(formData.get("original_goods_key"));
      const goodsFees = domestic?.philoaihang || {};
      const goodsLabels = domestic?.tenloaihang || {};
      const goodsDescriptions = domestic?.motaloaihang || {};
      const goodsMultipliers = domestic?.hesoloaihang || {};
      if (!originalKey || !(originalKey in goodsFees)) {
        throw new Error("Không tìm thấy loại hàng cần cập nhật.");
      }

      const nextKey = sanitizePriceKey(formData.get("goods_row[key]") || originalKey);
      const nextLabel = String(formData.get("goods_row[label]") || goodsLabels[originalKey] || nextKey).trim();
      const nextFee = Math.round(toNumber(formData.get("goods_row[fee]"), goodsFees[originalKey] || 0));
      const nextFactor = Number(toNumber(formData.get("goods_row[he_so]"), goodsMultipliers[originalKey] || 1).toFixed(3));
      const nextDescription = String(formData.get("goods_row[description]") || goodsDescriptions[originalKey] || "").trim();

      if (!nextKey) {
        throw new Error("Mã loại hàng không được để trống.");
      }
      if (!nextLabel) {
        throw new Error("Tên hiển thị của loại hàng không được để trống.");
      }
      if (nextKey !== originalKey) {
        throw new Error("Đổi mã loại hàng cần đi qua luồng refresh đầy đủ.");
      }
      if (nextFactor < 1) {
        throw new Error("Hệ số loại hàng phải từ 1 trở lên.");
      }

      goodsFees[originalKey] = nextFee;
      goodsLabels[originalKey] = nextLabel;
      goodsDescriptions[originalKey] = nextDescription;
      goodsMultipliers[originalKey] = nextFactor;
      return pricingData;
    }

    throw new Error("Action này chưa hỗ trợ bypass ajax_preview.");
  }

  function timeTextToMinutes(value) {
    const normalized = String(value || "").trim();
    const match = normalized.match(/^(\d{2}):(\d{2})$/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function serializePricingData(value) {
    if (Array.isArray(value)) {
      return `[${value.map((item) => serializePricingData(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${serializePricingData(value[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value ?? null);
  }

  function checksumText(value) {
    const source = String(value || "");
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function setSyncStatus(status, message) {
    const panel = document.querySelector("[data-pricing-sync-panel]");
    const statusNode = document.querySelector("[data-pricing-sync-status]");
    if (!panel || !statusNode) return;

    panel.classList.remove("is-checking", "is-synced", "is-mismatch", "is-error");
    if (status) {
      panel.classList.add(`is-${status}`);
    }
    statusNode.textContent = message;
  }

  async function fetchPublicPricingJson() {
    if (!config.publicPricingJsonUrl) {
      throw new Error("Thiếu publicPricingJsonUrl để kiểm tra JSON cache public.");
    }

    const separator = config.publicPricingJsonUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${config.publicPricingJsonUrl}${separator}_ts=${Date.now()}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Không đọc được pricing-data.json public (HTTP ${response.status}).`);
    }

    return response.json();
  }

  async function checkPublicJsonSync() {
    const button = document.querySelector("[data-pricing-sync-check]");
    const previousText = button ? button.innerHTML : "";
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra';
    }
    setSyncStatus("checking", "Đang đọc JSON cache public/data/pricing-data.json và so sánh với active KRUD...");

    try {
      const publicPricingData = await fetchPublicPricingJson();
      const krudPayload = stripKrudMeta(currentPricingSnapshot);
      const publicPayload = stripKrudMeta(publicPricingData);
      const krudSerialized = serializePricingData(krudPayload);
      const publicSerialized = serializePricingData(publicPayload);
      const krudChecksum = checksumText(krudSerialized);
      const publicChecksum = checksumText(publicSerialized);
      const versionText = activeVersionId > 0 ? `KRUD active #${activeVersionId}` : "KRUD chưa có active version";

      if (krudSerialized === publicSerialized) {
        setSyncStatus(
          "synced",
          `${versionText}. JSON cache public đang khớp dữ liệu. Checksum ${publicChecksum}.`,
        );
        showAlert("success", "JSON cache public đang khớp với dữ liệu active KRUD.");
        return true;
      }

      setSyncStatus(
        "mismatch",
        `${versionText} đang lệch với JSON cache public. KRUD ${krudChecksum}, JSON ${publicChecksum}. Bấm Export lại JSON để public nhận dữ liệu active KRUD.`,
      );
      showAlert(
        "warning",
        "JSON cache public đang lệch dữ liệu active KRUD. Bấm Export lại JSON để đồng bộ.",
        { durationMs: 12000 },
      );
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không kiểm tra được đồng bộ JSON cache public.";
      setSyncStatus("error", message);
      showAlert("error", message);
      return false;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = previousText;
      }
    }
  }

  async function exportActivePricingJson() {
    const button = document.querySelector("[data-pricing-sync-export]");
    const checkButton = document.querySelector("[data-pricing-sync-check]");
    const previousText = button ? button.innerHTML : "";

    if (!currentPricingSnapshot) {
      const message = "Không có dữ liệu active KRUD để export JSON.";
      setSyncStatus("error", message);
      showAlert("error", message);
      return false;
    }

    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang export';
    }
    if (checkButton) {
      checkButton.disabled = true;
    }
    setSyncStatus("checking", "Đang export lại JSON cache public/data/pricing-data.json từ active KRUD...");

    try {
      normalizePricingDisplayLabels(currentPricingSnapshot);
      await exportPricingDataFile(activeVersionId);
      setSyncStatus(
        "synced",
        `KRUD active #${activeVersionId || "?"}. Đã export lại JSON cache pricing-data.json từ dữ liệu active KRUD.`,
      );
      showAlert("success", "Đã export lại JSON cache pricing-data.json từ active KRUD.");
      await checkPublicJsonSync();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export lại JSON cache public thất bại.";
      setSyncStatus("error", message);
      showAlert("error", message, { durationMs: 12000 });
      return false;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = previousText;
      }
      if (checkButton) {
        checkButton.disabled = false;
      }
    }
  }

  function extractBracketKey(formData, prefix) {
    for (const [name] of formData.entries()) {
      if (name.startsWith(`${prefix}[`)) {
        const matched = name.match(/\[([^\]]+)\]/);
        if (matched) return matched[1];
      }
    }
    return "";
  }

  function findPricingRow(rowType, rowKey = "") {
    const selector = rowKey
      ? `[data-pricing-row="${rowType}"][data-row-key="${rowKey}"]`
      : `[data-pricing-row="${rowType}"]`;
    return document.querySelector(selector);
  }

  function getVehicleIconClass(key) {
    const normalized = String(key || "").toLowerCase();
    if (normalized.includes("motorcycle") || normalized.includes("xe_may")) {
      return "fa-motorcycle";
    }
    if (normalized.includes("truck") || normalized.includes("xe_tai")) {
      return "fa-truck";
    }
    if (normalized.includes("van") || normalized.includes("xe_ban_tai")) {
      return "fa-truck-front";
    }
    if (normalized.includes("three_wheeler") || normalized.includes("ba_banh")) {
      return "fa-motorcycle";
    }
    return "fa-truck-pickup";
  }

  function keepsSameRowKey(formData, originalName, nextName, normalize = sanitizePriceKey) {
    const originalKey = normalize(formData.get(originalName));
    const nextKey = normalize(formData.get(nextName) || originalKey);
    return originalKey !== "" && originalKey === nextKey;
  }

  function keepsSameServiceTimeRange(formData) {
    const originalKey = sanitizePriceKey(formData.get("original_time_key"));
    const nextKey = sanitizePriceKey(formData.get("time_row[key]") || originalKey);
    if (!originalKey || originalKey !== nextKey) return false;

    const currentTime =
      currentPricingSnapshot?.BAOGIACHITIET?.noidia?.phidichvu?.giaongaylaptuc?.thoigian?.[
        originalKey
      ] || null;
    if (!currentTime) return false;

    return (
      String(formData.get("time_row[batdau]") || currentTime.batdau || "") ===
        String(currentTime.batdau || "") &&
      String(formData.get("time_row[ketthuc]") || currentTime.ketthuc || "") ===
        String(currentTime.ketthuc || "")
    );
  }

  function patchServiceRow(pricingData, serviceKey) {
    const row = findPricingRow("service", serviceKey);
    const service =
      pricingData?.BAOGIACHITIET?.noidia?.dichvu?.[serviceKey] || null;
    const regionLabels = pricingData?.BAOGIACHITIET?.noidia?.tenvung || {};
    if (!row || !service) return false;

    row.children[1].textContent = String(service.ten || serviceKey);
    row.children[2].querySelector(".pricing-value").textContent = formatMoneyPreview(
      service?.coban?.cungquan || 0,
    );
    row.children[3].querySelector(".pricing-value").textContent = formatMoneyPreview(
      service?.coban?.khacquan || 0,
    );
    row.children[4].querySelector(".pricing-value").textContent = formatMoneyPreview(
      service?.coban?.lientinh || 0,
    );
    row.children[5].querySelector(".pricing-value").textContent = formatMoneyPreview(
      service?.buoctiep || 0,
    );
    return true;
  }

  function patchInstantRow(pricingData) {
    const row = findPricingRow("instant");
    const domestic = pricingData?.BAOGIACHITIET?.noidia || {};
    const service = domestic?.dichvu?.laptuc || {};
    const distance = domestic?.cauhinh_khoangcach || {};
    if (!row) return false;

    row.children[0].textContent = String(service.ten || "Giao ngay");
    row.children[1].querySelector(".pricing-value").textContent = formatMoneyPreview(
      distance.gia_xe_may_gan || 0,
    );
    row.children[2].textContent = `${distance.nguong_xe_may_xa || 0} km`;
    row.children[3].querySelector(".pricing-value").textContent = formatMoneyPreview(
      distance.gia_xe_may_xa || 0,
    );
    return true;
  }

  function patchServiceTimeRow(pricingData, timeKey) {
    const row = findPricingRow("service-time", timeKey);
    const timeConfig =
      pricingData?.BAOGIACHITIET?.noidia?.phidichvu?.giaongaylaptuc?.thoigian?.[timeKey] || null;
    if (!row || !timeConfig) return false;

    row.children[0].textContent = String(timeConfig.ten || timeKey);
    row.children[1].textContent = String(timeConfig.batdau || "");
    row.children[2].textContent = String(timeConfig.ketthuc || "");
    row.children[3].querySelector(".pricing-value").textContent = formatMoneyPreview(
      timeConfig.phicodinh || 0,
    );
    row.children[4].textContent = String(timeConfig.heso ?? 1);
    return true;
  }

  function patchWeatherRow(pricingData, weatherKey) {
    const row = findPricingRow("weather", weatherKey);
    const weatherConfig =
      pricingData?.BAOGIACHITIET?.noidia?.phidichvu?.giaongaylaptuc?.thoitiet?.[weatherKey] ||
      null;
    if (!row || !weatherConfig) return false;

    row.children[0].textContent = String(weatherConfig.ten || weatherKey);
    row.children[1].querySelector(".pricing-value").textContent = formatMoneyPreview(
      weatherConfig.phicodinh || 0,
    );
    row.children[2].textContent = String(weatherConfig.heso ?? 1);
    return true;
  }

  function patchCodRows(pricingData) {
    const feeConfig = pricingData?.BANGGIA?.phuthu || {};
    const codRow = findPricingRow("cod", "thuho");
    const insuranceRow = findPricingRow("cod", "baohiem");
    if (!codRow || !insuranceRow) return false;

    codRow.children[1].querySelector(".pricing-value").textContent = formatMoneyPreview(
      feeConfig?.thuho?.nguong || 0,
    );
    codRow.children[2].textContent = formatPercent(feeConfig?.thuho?.kieu || 0);
    codRow.children[3].querySelector(".pricing-value").textContent = formatMoneyPreview(
      feeConfig?.thuho?.toithieu || 0,
    );

    insuranceRow.children[1].querySelector(".pricing-value").textContent =
      formatMoneyPreview(feeConfig?.baohiem?.nguong || 0);
    insuranceRow.children[2].textContent = formatPercent(feeConfig?.baohiem?.kieu || 0);
    insuranceRow.children[3].querySelector(".pricing-value").textContent =
      formatMoneyPreview(feeConfig?.baohiem?.toithieu || 0);
    return true;
  }

  function patchVehicleRow(pricingData, vehicleKey) {
    const row = findPricingRow("vehicle", vehicleKey);
    const vehicle = (pricingData?.phuong_tien || []).find((item) => item?.key === vehicleKey);
    if (!row || !vehicle) return false;

    const perKm = Math.round(toNumber(vehicle.gia_co_ban, 0) * toNumber(vehicle.he_so_xe, 1));
    const icon = row.querySelector(".vehicle-icon i");
    if (icon) {
      icon.className = `fa-solid ${getVehicleIconClass(vehicleKey)}`;
    }
    const labelNode = row.querySelector('[data-cell="label"]');
    const keyNode = row.querySelector('[data-cell="key"]');
    const weightNode = row.querySelector('[data-cell="weight"]');
    const perKmNode = row.querySelector('[data-cell="per-km"]');
    const minFeeNode = row.querySelector('[data-cell="min-fee"]');

    if (labelNode) labelNode.textContent = String(vehicle.label || vehicleKey);
    if (keyNode) keyNode.textContent = String(vehicleKey);
    if (weightNode) weightNode.textContent = String(vehicle.trong_luong_toi_da ?? 0);
    if (perKmNode) perKmNode.textContent = formatMoneyPreview(perKm);
    if (minFeeNode) minFeeNode.textContent = formatMoneyPreview(vehicle.phi_toi_thieu || 0);
    return true;
  }

  function patchGoodsRow(pricingData, goodsKey) {
    const row = findPricingRow("goods", goodsKey);
    const domestic = pricingData?.BAOGIACHITIET?.noidia || {};
    if (!row || !(goodsKey in (domestic?.philoaihang || {}))) return false;

    row.children[0].querySelector("strong").textContent = String(goodsKey);
    row.children[1].textContent = String(domestic?.tenloaihang?.[goodsKey] || goodsKey);
    row.children[2].querySelector(".pricing-value").textContent = formatMoneyPreview(
      domestic?.philoaihang?.[goodsKey] || 0,
    );
    row.children[3].textContent = String(domestic?.hesoloaihang?.[goodsKey] ?? 1);
    return true;
  }

  const DIRECT_ACTION_RULES = {
    save_services: {
      key: (formData) => extractBracketKey(formData, "services"),
      canDirect: (formData, rule) => Boolean(rule.key(formData)),
      patch: patchServiceRow,
    },
    save_instant_service: {
      canDirect: () => true,
      patch: patchInstantRow,
    },
    save_cod_insurance: {
      canDirect: () => true,
      patch: patchCodRows,
    },
    save_service_time_row: {
      key: (formData) => sanitizePriceKey(formData.get("original_time_key")),
      canDirect: keepsSameServiceTimeRange,
      patch: patchServiceTimeRow,
    },
    save_weather_row: {
      key: (formData) => sanitizePriceKey(formData.get("original_weather_key")),
      canDirect: (formData) =>
        keepsSameRowKey(formData, "original_weather_key", "weather_row[key]"),
      patch: patchWeatherRow,
    },
    save_vehicle_row: {
      key: (formData) => String(formData.get("original_vehicle_key") || "").trim(),
      canDirect: (formData) =>
        keepsSameRowKey(
          formData,
          "original_vehicle_key",
          "vehicle_row[key]",
          (value) => String(value || "").trim(),
        ),
      patch: patchVehicleRow,
    },
    save_goods_fee_row: {
      key: (formData) => sanitizePriceKey(formData.get("original_goods_key")),
      canDirect: (formData) =>
        keepsSameRowKey(formData, "original_goods_key", "goods_row[key]"),
      patch: patchGoodsRow,
    },
  };

  function canPatchDomDirectly(action, formData) {
    const rule = DIRECT_ACTION_RULES[action];
    return Boolean(rule?.canDirect?.(formData, rule));
  }

  function patchDomAfterSave(action, formData, pricingData) {
    const rule = DIRECT_ACTION_RULES[action];
    if (!rule) return false;
    if (!rule.key) return rule.patch(pricingData);

    const rowKey = rule.key(formData);
    return rowKey ? rule.patch(pricingData, rowKey) : false;
  }

  function canPersistRowLevel(action, formData) {
    if (activeVersionId <= 0) return false;
    return canPatchDomDirectly(action, formData);
  }

  function showAlert(type, message, options = {}) {
    const durationMs = Number(options.durationMs || 0);
    if (!durationMs && window.core && typeof window.core.notify === "function") {
      window.core.notify(message, type);
      return;
    }
    if (durationMs > 0) {
      let container = document.querySelector(".core-toast-container");
      if (!container) {
        container = document.createElement("div");
        container.className = "core-toast-container";
        document.body.appendChild(container);
      }

      const iconByType = {
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info",
        success: "fa-check-circle",
      };
      const toast = document.createElement("div");
      toast.className = `core-toast ${type}`;

      const icon = document.createElement("div");
      icon.className = "core-toast-icon";
      icon.innerHTML = `<i class="fa-solid ${iconByType[type] || iconByType.success}"></i>`;

      const content = document.createElement("div");
      content.className = "core-toast-message";
      content.textContent = message;

      toast.append(icon, content);
      container.appendChild(toast);
      setTimeout(() => toast.classList.add("show"), 10);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
      }, durationMs);
      return;
    }
    // Fallback nếu core chưa load
    console.log(`[Pricing Alert ${type}]: ${message}`);
  }

  function showProgress(message) {
    if (!progressContainer) {
      progressContainer = document.querySelector(".core-toast-container");
      if (!progressContainer) {
        progressContainer = document.createElement("div");
        progressContainer.className = "core-toast-container";
        document.body.appendChild(progressContainer);
      }
    }

    if (!progressToast) {
      progressToast = document.createElement("div");
      progressToast.className = "core-toast info";
      progressToast.innerHTML = `
        <div class="core-toast-icon"><i class="fa-solid fa-circle-info"></i></div>
        <div class="core-toast-message"></div>
      `;
      progressContainer.appendChild(progressToast);
      window.setTimeout(() => {
        progressToast?.classList.add("show");
      }, 10);
    }

    const messageNode = progressToast.querySelector(".core-toast-message");
    if (messageNode) {
      messageNode.textContent = message;
    }
  }

  function hideProgress() {
    if (!progressToast) return;
    progressToast.classList.remove("show");
    const toastToRemove = progressToast;
    progressToast = null;
    window.setTimeout(() => {
      toastToRemove.remove();
      if (
        progressContainer &&
        !progressContainer.querySelector(".core-toast")
      ) {
        progressContainer.remove();
        progressContainer = null;
      }
    }, 300);
  }

  function clearPendingFormState(form) {
    if (!(form instanceof HTMLFormElement)) return;
    delete form.dataset.pendingAction;
    delete form.dataset.pendingConfirmMessage;
    const deleteKeyInput = form.querySelector('input[name="delete_key"]');
    if (deleteKeyInput instanceof HTMLInputElement) {
      deleteKeyInput.value = "";
    }
  }

  function getPricingShell(root = document) {
    return root.querySelector(".pricing-shell");
  }

  function getActiveSectionId(root = document) {
    const shell = getPricingShell(root);
    if (!shell) return "";
    const activeTab = shell.querySelector("[data-pricing-tab].is-active");
    if (activeTab?.dataset?.pricingTab) {
      return activeTab.dataset.pricingTab;
    }
    return String(window.location.hash || "").replace(/^#/, "");
  }



  function activateSection(root, id, syncHash = true, expandActive = false) {
    const shell = getPricingShell(root);
    if (!shell) return;
    const tabs = Array.from(shell.querySelectorAll("[data-pricing-tab]"));
    const sections = Array.from(shell.querySelectorAll(".pricing-card[id]"));
    if (!tabs.length || !sections.length) return;

    const targetId = sections.some((section) => section.id === id) ? id : sections[0].id;
    sections.forEach((section) => {
      const active = section.id === targetId;
      section.hidden = !active;
      section.classList.toggle("is-active", active);
    });

    tabs.forEach((tab) => {
      const active = tab.dataset.pricingTab === targetId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-current", active ? "page" : "false");
    });

    if (syncHash) {
      window.history.replaceState({}, "", `#${targetId}`);
    }
  }

  function closeAllModals(root = document) {
    const shell = getPricingShell(root);
    if (!shell) return;
    shell.querySelectorAll("[data-modal]").forEach((modal) => {
      modal.hidden = true;
    });
    document.body.classList.remove("pricing-modal-open");
  }

  function openModal(root, id) {
    const shell = getPricingShell(root);
    if (!shell) return;
    const modal = shell.querySelector(`[data-modal="${id}"]`);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("pricing-modal-open");
  }

  function closeModal(modal) {
    const target = modal instanceof Element ? modal : null;
    if (!target) return;
    target.hidden = true;
    if (!document.querySelector('[data-modal]:not([hidden])')) {
      document.body.classList.remove("pricing-modal-open");
    }
  }

  function chunkArray(list, size) {
    const result = [];
    for (let i = 0; i < list.length; i += size) {
      result.push(list.slice(i, i + size));
    }
    return result;
  }

  async function runWithConcurrency(tasks, limit) {
    const results = [];
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (index < tasks.length) {
        const current = index;
        index += 1;
        results[current] = await tasks[current]();
      }
    });
    await Promise.all(workers);
    return results;
  }

  function toggleSubmitting(form, isSubmitting) {
    form.querySelectorAll("button, input, select, textarea").forEach((field) => {
      if (
        field instanceof HTMLInputElement &&
        field.type &&
        field.type.toLowerCase() === "hidden"
      ) {
        return;
      }
      if (isSubmitting) {
        field.dataset.prevDisabled = field.disabled ? "1" : "0";
        field.disabled = true;
      } else if (field.dataset.prevDisabled === "0") {
        field.disabled = false;
      }
    });
  }

  async function previewPricingUpdate(formData) {
    formData.append("ajax_preview", "1");

    const response = await fetch(config.pageUrl, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
    return payload.pricingData;
  }

  async function refreshPricingSection(action, preferredSectionId = "") {
    const response = await fetch(`${config.pageUrl}?_ts=${Date.now()}`, {
      credentials: "same-origin",
      headers: {
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Không tải lại được giao diện bảng giá (HTTP ${response.status}).`);
    }

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const nextShell = getPricingShell(parsed);
    const currentShell = getPricingShell(document);
    const nextSectionId = ACTION_SECTION_IDS[action] || preferredSectionId || getActiveSectionId(document);

    if (!nextShell || !currentShell) {
      throw new Error("Không tìm thấy khối pricing-shell để cập nhật giao diện.");
    }

    activeVersionId = Number(nextShell.dataset.activeVersionId || activeVersionId || 0);

    const currentSection = currentShell.querySelector(`#${nextSectionId}`);
    const nextSection = nextShell.querySelector(`#${nextSectionId}`);
    if (!currentSection || !nextSection) {
      throw new Error(`Không tìm thấy section ${nextSectionId} để cập nhật.`);
    }

    const currentModalGroup = currentShell.querySelector(
      `[data-pricing-modal-group="${nextSectionId}"]`,
    );
    const nextModalGroup = nextShell.querySelector(
      `[data-pricing-modal-group="${nextSectionId}"]`,
    );

    closeAllModals(document);
    currentSection.replaceWith(nextSection);
    if (currentModalGroup && nextModalGroup) {
      currentModalGroup.replaceWith(nextModalGroup);
    }

    initPricingUi(document, preferredSectionId || nextSectionId);
    bindPricingForms(document);
  }

  async function listTable(table, where = [], sort = { id: "desc" }, limit = 200) {
    const listFn = getListFn();
    if (!listFn) throw new Error("Không tìm thấy krud.js hoặc hàm list KRUD.");
    const response = await listFn({ table, where, sort, page: 1, limit });
    return extractRows(response);
  }

  async function insertTable(table, data) {
    const insertFn = getInsertFn();
    if (!insertFn) throw new Error("Không tìm thấy krud.js hoặc hàm insert KRUD.");
    const response = await insertFn(table, data);
    const id =
      Number(
        response?.id ||
          response?.insertId ||
          response?.insert_id ||
          response?.data?.id ||
          response?.data?.insertId ||
          0,
      ) || 0;
    return { response, id };
  }

  async function updateTable(table, id, data) {
    const updateFn = getUpdateFn();
    if (!updateFn) throw new Error("Không tìm thấy krud.js hoặc hàm update KRUD.");
    return updateFn(table, data, id);
  }

  async function deleteTable(table, id) {
    const deleteFn = getDeleteFn();
    if (!deleteFn) throw new Error("Không tìm thấy krud.js hoặc hàm delete KRUD.");
    return deleteFn(table, id);
  }

  function buildVersionWhere(versionId, extraWhere = []) {
    return [
      { field: "pricing_version_id", operator: "=", value: versionId },
      ...extraWhere,
    ];
  }

  async function findVersionRow(table, versionId, extraWhere = []) {
    const rows = await listTable(table, buildVersionWhere(versionId, extraWhere), { id: "asc" }, 20);
    return rows[0] || null;
  }

  async function upsertVersionRow(table, versionId, extraWhere, data) {
    const payload = { pricing_version_id: versionId, ...data };
    const existing = await findVersionRow(table, versionId, extraWhere);
    if (existing?.id) {
      await updateTable(table, Number(existing.id), payload);
      return Number(existing.id);
    }

    const inserted = await insertTable(table, payload);
    return Number(inserted.id || 0);
  }

  function getKrudMeta(pricingData) {
    return pricingData?._krud_meta || {};
  }

  async function updateOrInsertVersionRowById(
    table,
    versionId,
    recordId,
    extraWhere,
    data,
  ) {
    const payload = { pricing_version_id: versionId, ...data };
    if (Number(recordId) > 0) {
      await updateTable(table, Number(recordId), payload);
      return Number(recordId);
    }

    return upsertVersionRow(table, versionId, extraWhere, data);
  }

  async function exportPricingDataFile(versionId = activeVersionId) {
    const exportVersionId = Number(versionId || 0);
    if (exportVersionId <= 0) {
      throw new Error("Thiếu KRUD versionId để export pricing-data.json.");
    }
    await fetch(config.exportUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ versionId: exportVersionId }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      if (!payload.verified) {
        throw new Error("pricing-data.json chưa được xác minh sau khi export.");
      }
    });
  }

  function createPartialExportError(error) {
    const detail = error instanceof Error ? error.message : String(error || "").trim();
    const message = [
      "KRUD đã lưu thành công, nhưng export JSON cache pricing-data.json thất bại.",
      "Public có thể chưa nhận bảng giá mới từ cache.",
      detail ? `Chi tiết: ${detail}` : "",
    ].filter(Boolean).join(" ");
    const partialError = new Error(message);
    partialError.partialSave = true;
    partialError.originalError = error;
    return partialError;
  }

  async function persistPricingRowLevel(pricingData, action, formData, versionId) {
    const domestic = pricingData?.BAOGIACHITIET?.noidia || {};
    const serviceFeeConfig = domestic?.phidichvu?.giaongaylaptuc || {};
    const krudMeta = getKrudMeta(pricingData);

    if (action === "save_services") {
      const serviceKey = extractBracketKey(formData, "services");
      const serviceConfig = domestic?.dichvu?.[serviceKey];
      if (!serviceKey || !serviceConfig) return false;

      showProgress("Đang cập nhật gói dịch vụ lên KRUD...");
      krudMeta.service_ids = krudMeta.service_ids || {};
      krudMeta.service_price_ids = krudMeta.service_price_ids || {};
      krudMeta.service_ids[serviceKey] = await updateOrInsertVersionRowById(
        "ghn_goi_dich_vu",
        versionId,
        krudMeta?.service_ids?.[serviceKey] || 0,
        [{ field: "service_key", operator: "=", value: serviceKey }],
        {
          service_key: serviceKey,
          service_label: String(serviceConfig?.ten || serviceKey),
          applies_service_fee: serviceConfig?.ap_dung_phi_dich_vu ? 1 : 0,
          sort_order: SERVICE_ORDER[serviceKey] || 999,
        },
      );

      await Promise.all(
        Object.entries(REGION_ORDER).map(async ([regionKey]) => {
          const baseKey = REGION_BASE_KEY[regionKey] || regionKey;
          const rowId = await updateOrInsertVersionRowById(
            "ghn_gia_goi_theo_vung",
            versionId,
            krudMeta?.service_price_ids?.[serviceKey]?.[regionKey] || 0,
            [
              { field: "service_key", operator: "=", value: serviceKey },
              { field: "region_key", operator: "=", value: regionKey },
            ],
            {
              service_key: serviceKey,
              region_key: regionKey,
              base_price: Math.round(toNumber(serviceConfig?.coban?.[baseKey], 0)),
              next_step_price: Math.round(toNumber(serviceConfig?.buoctiep, 0)),
              eta_text: String(serviceConfig?.thoigian?.[regionKey] || ""),
            },
          );
          krudMeta.service_price_ids[serviceKey] = krudMeta.service_price_ids[serviceKey] || {};
          krudMeta.service_price_ids[serviceKey][regionKey] = rowId;
        }),
      );

      return true;
    }

    if (action === "save_instant_service") {
      const serviceConfig = domestic?.dichvu?.laptuc || {};
      const distanceConfig = domestic?.cauhinh_khoangcach || {};

      showProgress("Đang cập nhật Giao ngay lên KRUD...");
      krudMeta.service_ids = krudMeta.service_ids || {};
      await Promise.all([
        updateOrInsertVersionRowById(
          "ghn_goi_dich_vu",
          versionId,
          krudMeta?.service_ids?.laptuc || 0,
          [{ field: "service_key", operator: "=", value: "laptuc" }],
          {
            service_key: "laptuc",
            service_label: String(serviceConfig?.ten || "Giao ngay"),
            applies_service_fee: serviceConfig?.ap_dung_phi_dich_vu ? 1 : 0,
            sort_order: SERVICE_ORDER.laptuc || 40,
          },
        ),
        updateOrInsertVersionRowById(
          "ghn_cau_hinh_khoang_cach",
          versionId,
          krudMeta?.distance_config_id || 0,
          [{ field: "config_key", operator: "=", value: "default" }],
          {
            config_key: "default",
            motorbike_near_price: Math.round(toNumber(distanceConfig?.gia_xe_may_gan, 0)),
            motorbike_far_threshold: formatDecimal(
              distanceConfig?.nguong_xe_may_xa ?? 0,
              2,
            ),
            motorbike_far_price: Math.round(toNumber(distanceConfig?.gia_xe_may_xa, 0)),
            free_weight: formatDecimal(distanceConfig?.can_mien_phi ?? 0, 2),
            volume_divisor: Math.round(toNumber(distanceConfig?.he_so_the_tich, 6000)),
            vat_included: distanceConfig?.da_gom_vat ? 1 : 0,
          },
        ),
      ]).then(([serviceId, distanceId]) => {
        krudMeta.service_ids.laptuc = serviceId;
        krudMeta.distance_config_id = distanceId;
      });

      return true;
    }

    if (action === "save_service_time_row") {
      const slotKey = sanitizePriceKey(formData.get("original_time_key"));
      const slotConfig = serviceFeeConfig?.thoigian?.[slotKey];
      if (!slotKey || !slotConfig) return false;

      showProgress("Đang cập nhật khung giờ lên KRUD...");
      krudMeta.time_ids = krudMeta.time_ids || {};
      krudMeta.time_ids[slotKey] = await updateOrInsertVersionRowById(
        "ghn_khung_gio_dich_vu",
        versionId,
        krudMeta?.time_ids?.[slotKey] || 0,
        [{ field: "slot_key", operator: "=", value: slotKey }],
        {
          slot_key: slotKey,
          slot_label: String(slotConfig?.ten || slotKey),
          start_time: String(slotConfig?.batdau || "00:00"),
          end_time: String(slotConfig?.ketthuc || "23:59"),
          fixed_fee: Math.round(toNumber(slotConfig?.phicodinh, 0)),
          multiplier: formatDecimal(slotConfig?.heso ?? 1, 3),
          sort_order:
            Object.keys(serviceFeeConfig?.thoigian || {}).indexOf(slotKey) >= 0
              ? (Object.keys(serviceFeeConfig?.thoigian || {}).indexOf(slotKey) + 1) * 10
              : 999,
        },
      );

      return true;
    }

    if (action === "save_weather_row") {
      const conditionKey = sanitizePriceKey(formData.get("original_weather_key"));
      const weatherConfig = serviceFeeConfig?.thoitiet?.[conditionKey];
      if (!conditionKey || !weatherConfig) return false;

      showProgress("Đang cập nhật điều kiện giao lên KRUD...");
      krudMeta.condition_ids = krudMeta.condition_ids || {};
      krudMeta.condition_ids[conditionKey] = await updateOrInsertVersionRowById(
        "ghn_dieu_kien_giao",
        versionId,
        krudMeta?.condition_ids?.[conditionKey] || 0,
        [{ field: "condition_key", operator: "=", value: conditionKey }],
        {
          condition_key: conditionKey,
          condition_label: String(weatherConfig?.ten || conditionKey),
          fixed_fee: Math.round(toNumber(weatherConfig?.phicodinh, 0)),
          multiplier: formatDecimal(weatherConfig?.heso ?? 1, 3),
          sort_order:
            Object.keys(serviceFeeConfig?.thoitiet || {}).indexOf(conditionKey) >= 0
              ? (Object.keys(serviceFeeConfig?.thoitiet || {}).indexOf(conditionKey) + 1) * 10
              : 999,
        },
      );

      return true;
    }

    if (action === "save_cod_insurance") {
      const feeConfig = pricingData?.BANGGIA?.phuthu || {};

      showProgress("Đang cập nhật COD và bảo hiểm lên KRUD...");
      krudMeta.financial_ids = krudMeta.financial_ids || {};
      await Promise.all(
        ["thuho", "baohiem"].map((financeKey) =>
          updateOrInsertVersionRowById(
            "ghn_cau_hinh_tai_chinh",
            versionId,
            krudMeta?.financial_ids?.[financeKey] || 0,
            [{ field: "finance_key", operator: "=", value: financeKey }],
            {
              finance_key: financeKey,
              free_threshold: Math.round(toNumber(feeConfig?.[financeKey]?.nguong, 0)),
              rate_value: Number(toNumber(feeConfig?.[financeKey]?.kieu, 0).toFixed(4)),
              minimum_fee: Math.round(toNumber(feeConfig?.[financeKey]?.toithieu, 0)),
            },
          ),
        ).then((rowId) => {
          krudMeta.financial_ids[financeKey] = rowId;
        }),
      );

      return true;
    }

    if (action === "save_vehicle_row") {
      const vehicleKey = String(formData.get("original_vehicle_key") || "").trim();
      const vehicle = (pricingData?.phuong_tien || []).find((item) => item?.key === vehicleKey);
      if (!vehicleKey || !vehicle) return false;

      showProgress("Đang cập nhật phương tiện lên KRUD...");
      krudMeta.vehicle_ids = krudMeta.vehicle_ids || {};
      krudMeta.vehicle_ids[vehicleKey] = await updateOrInsertVersionRowById(
        "ghn_phuong_tien",
        versionId,
        krudMeta?.vehicle_ids?.[vehicleKey] || 0,
        [{ field: "vehicle_key", operator: "=", value: vehicleKey }],
        {
          vehicle_key: vehicleKey,
          vehicle_label: String(vehicle?.label || vehicleKey),
          vehicle_factor: formatDecimal(vehicle?.he_so_xe ?? 1, 3),
          base_price: Math.round(toNumber(vehicle?.gia_co_ban, 0)),
          minimum_fee: Math.round(toNumber(vehicle?.phi_toi_thieu, 0)),
          max_weight: formatDecimal(vehicle?.trong_luong_toi_da ?? 0, 2),
          description_text: String(vehicle?.description || ""),
          sort_order:
            (pricingData?.phuong_tien || []).findIndex((item) => item?.key === vehicleKey) >= 0
              ? ((pricingData?.phuong_tien || []).findIndex((item) => item?.key === vehicleKey) +
                  1) *
                10
              : 999,
        },
      );

      return true;
    }

    if (action === "save_goods_fee_row") {
      const goodsKey = sanitizePriceKey(formData.get("original_goods_key"));
      if (!goodsKey || !(goodsKey in (domestic?.philoaihang || {}))) return false;

      const goodsKeys = Array.from(
        new Set([
          ...Object.keys(domestic?.philoaihang || {}),
          ...Object.keys(domestic?.tenloaihang || {}),
          ...Object.keys(domestic?.motaloaihang || {}),
          ...Object.keys(domestic?.hesoloaihang || {}),
        ]),
      );

      showProgress("Đang cập nhật loại hàng lên KRUD...");
      krudMeta.goods_ids = krudMeta.goods_ids || {};
      krudMeta.goods_ids[goodsKey] = await updateOrInsertVersionRowById(
        "ghn_loai_hang",
        versionId,
        krudMeta?.goods_ids?.[goodsKey] || 0,
        [{ field: "item_type_key", operator: "=", value: goodsKey }],
        {
          item_type_key: goodsKey,
          item_type_label: String(domestic?.tenloaihang?.[goodsKey] || goodsKey),
          fee_amount: Math.round(toNumber(domestic?.philoaihang?.[goodsKey], 0)),
          multiplier: formatDecimal(domestic?.hesoloaihang?.[goodsKey] ?? 1, 3),
          description_text: String(domestic?.motaloaihang?.[goodsKey] || ""),
          sort_order:
            goodsKeys.indexOf(goodsKey) >= 0 ? (goodsKeys.indexOf(goodsKey) + 1) * 10 : 999,
        },
      );

      return true;
    }

    return false;
  }

  async function getActiveVersionInfo() {
    const metaRows = await listTable(
      "ghn_pricing_meta",
      [{ field: "meta_key", operator: "=", value: ACTIVE_VERSION_META_KEY }],
      { id: "desc" },
      1,
    );
    if (!metaRows.length) {
      return { metaId: 0, versionId: 0 };
    }
    return {
      metaId: Number(metaRows[0].id || 0),
      versionId: Number(metaRows[0].meta_value || 0),
    };
  }

  async function setActiveVersion(versionId, currentMeta = null) {
    const metaInfo = currentMeta || (await getActiveVersionInfo());
    if (metaInfo.metaId > 0) {
      await updateTable("ghn_pricing_meta", metaInfo.metaId, {
        meta_value: String(versionId),
      });
      return;
    }

    await insertTable("ghn_pricing_meta", {
      meta_key: ACTIVE_VERSION_META_KEY,
      meta_value: String(versionId),
    });
  }

  async function createPricingVersion() {
    const versionCode = `pricing-${Date.now()}`;
    const result = await insertTable("ghn_pricing_versions", {
      version_code: versionCode,
      status: "draft",
      source_key: "admin_pricing_js",
      created_by: String(config.username || "admin"),
      note: "",
    });
    if (!result.id) {
      throw new Error("Không tạo được phiên bản pricing mới trên KRUD.");
    }
    return result.id;
  }

  function buildRowKey(table, row) {
    const keyFields = TABLE_KEY_FIELDS[table] || [];
    return keyFields.map((field) => String(row?.[field] ?? "")).join("::");
  }

  function normalizeComparableRow(row) {
    const next = { ...row };
    delete next.id;
    delete next.created_at;
    delete next.updated_at;
    delete next.tao_luc;
    delete next.cap_nhat_luc;
    return next;
  }

  function buildPersistenceRows(pricingData, versionId) {
    const domestic = pricingData?.BAOGIACHITIET?.noidia || {};
    const services = domestic.dichvu || {};
    const serviceFeeConfig = (domestic.phidichvu || {}).giaongaylaptuc || {};
    const regions = domestic.tenvung || {};
    const goodsFees = domestic.philoaihang || {};
    const goodsLabels = domestic.tenloaihang || {};
    const goodsDescriptions = domestic.motaloaihang || {};
    const goodsMultipliers = domestic.hesoloaihang || {};

    const rows = {
      ghn_vung_giao_hang: [],
      ghn_goi_dich_vu: [],
      ghn_gia_goi_theo_vung: [],
      ghn_loai_hang: [],
      ghn_cau_hinh_phi_dich_vu: [],
      ghn_khung_gio_dich_vu: [],
      ghn_dieu_kien_giao: [],
      ghn_phuong_tien: [],
      ghn_cau_hinh_khoang_cach: [],
      ghn_cau_hinh_tai_chinh: [],
      ghn_thanh_pho: [],
      ghn_quan_huyen: [],
      ghn_goi_y_phuong_tien: [],
      ghn_pricing_chunks: [],
    };

    Object.entries(REGION_ORDER).forEach(([regionKey, sortOrder]) => {
      rows.ghn_vung_giao_hang.push({
        pricing_version_id: versionId,
        region_key: regionKey,
        region_label: String(regions[regionKey] || regionKey),
        sort_order: sortOrder,
      });
    });

    Object.entries(services).forEach(([serviceKey, serviceConfig]) => {
      rows.ghn_goi_dich_vu.push({
        pricing_version_id: versionId,
        service_key: serviceKey,
        service_label: String(serviceConfig?.ten || serviceKey),
        applies_service_fee: serviceConfig?.ap_dung_phi_dich_vu ? 1 : 0,
        sort_order: SERVICE_ORDER[serviceKey] || 999,
      });

      Object.entries(REGION_ORDER).forEach(([regionKey]) => {
        const baseKey = REGION_BASE_KEY[regionKey] || regionKey;
        rows.ghn_gia_goi_theo_vung.push({
          pricing_version_id: versionId,
          service_key: serviceKey,
          region_key: regionKey,
          base_price: Math.round(toNumber(serviceConfig?.coban?.[baseKey], 0)),
          next_step_price: Math.round(toNumber(serviceConfig?.buoctiep, 0)),
          eta_text: String(serviceConfig?.thoigian?.[regionKey] || ""),
        });
      });
    });

    const goodsKeys = Array.from(
      new Set([
        ...Object.keys(goodsFees),
        ...Object.keys(goodsLabels),
        ...Object.keys(goodsDescriptions),
        ...Object.keys(goodsMultipliers),
      ]),
    );
    goodsKeys.forEach((goodsKey, index) => {
      rows.ghn_loai_hang.push({
        pricing_version_id: versionId,
        item_type_key: goodsKey,
        item_type_label: String(goodsLabels[goodsKey] || goodsKey),
        fee_amount: Math.round(toNumber(goodsFees[goodsKey], 0)),
        multiplier: formatDecimal(goodsMultipliers[goodsKey] ?? 1, 3),
        description_text: String(goodsDescriptions[goodsKey] || ""),
        sort_order: (index + 1) * 10,
      });
    });

    rows.ghn_cau_hinh_phi_dich_vu.push({
      pricing_version_id: versionId,
      config_key: "giaongaylaptuc",
      note_text: String(serviceFeeConfig.ghichu || ""),
    });

    Object.entries(serviceFeeConfig.thoigian || {})
      .sort(([, leftConfig], [, rightConfig]) => {
        const startDiff =
          timeTextToMinutes(leftConfig?.batdau) - timeTextToMinutes(rightConfig?.batdau);
        if (startDiff !== 0) return startDiff;

        return (
          timeTextToMinutes(leftConfig?.ketthuc) - timeTextToMinutes(rightConfig?.ketthuc)
        );
      })
      .forEach(([slotKey, slotConfig], index) => {
      rows.ghn_khung_gio_dich_vu.push({
        pricing_version_id: versionId,
        slot_key: slotKey,
        slot_label: String(slotConfig?.ten || slotKey),
        start_time: String(slotConfig?.batdau || "00:00"),
        end_time: String(slotConfig?.ketthuc || "23:59"),
        fixed_fee: Math.round(toNumber(slotConfig?.phicodinh, 0)),
        multiplier: formatDecimal(slotConfig?.heso ?? 1, 3),
        sort_order: (index + 1) * 10,
      });
      });

    Object.entries(serviceFeeConfig.thoitiet || {}).forEach(
      ([conditionKey, conditionConfig], index) => {
        rows.ghn_dieu_kien_giao.push({
          pricing_version_id: versionId,
          condition_key: conditionKey,
          condition_label: String(conditionConfig?.ten || conditionKey),
          fixed_fee: Math.round(toNumber(conditionConfig?.phicodinh, 0)),
          multiplier: formatDecimal(conditionConfig?.heso ?? 1, 3),
          sort_order: (index + 1) * 10,
        });
      },
    );

    (pricingData.phuong_tien || []).forEach((vehicle, index) => {
      rows.ghn_phuong_tien.push({
        pricing_version_id: versionId,
        vehicle_key: String(vehicle?.key || ""),
        vehicle_label: String(vehicle?.label || ""),
        vehicle_factor: formatDecimal(vehicle?.he_so_xe ?? 1, 3),
        base_price: Math.round(toNumber(vehicle?.gia_co_ban, 0)),
        minimum_fee: Math.round(toNumber(vehicle?.phi_toi_thieu, 0)),
        max_weight: formatDecimal(vehicle?.trong_luong_toi_da ?? 0, 2),
        description_text: String(vehicle?.description || ""),
        sort_order: (index + 1) * 10,
      });
    });

    rows.ghn_cau_hinh_khoang_cach.push({
      pricing_version_id: versionId,
      config_key: "default",
      motorbike_near_price: Math.round(toNumber(domestic?.cauhinh_khoangcach?.gia_xe_may_gan, 0)),
      motorbike_far_threshold: formatDecimal(
        domestic?.cauhinh_khoangcach?.nguong_xe_may_xa ?? 0,
        2,
      ),
      motorbike_far_price: Math.round(toNumber(domestic?.cauhinh_khoangcach?.gia_xe_may_xa, 0)),
      free_weight: formatDecimal(domestic?.cauhinh_khoangcach?.can_mien_phi ?? 0, 2),
      volume_divisor: Math.round(
        toNumber(domestic?.cauhinh_khoangcach?.he_so_the_tich, 6000),
      ),
      vat_included: domestic?.cauhinh_khoangcach?.da_gom_vat ? 1 : 0,
    });

    ["thuho", "baohiem"].forEach((financeKey) => {
      const finance = pricingData?.BANGGIA?.phuthu?.[financeKey] || {};
      rows.ghn_cau_hinh_tai_chinh.push({
        pricing_version_id: versionId,
        finance_key: financeKey,
        free_threshold: Math.round(toNumber(finance.nguong, 0)),
        rate_value: Number(toNumber(finance.kieu, 0).toFixed(4)),
        minimum_fee: Math.round(toNumber(finance.toithieu, 0)),
      });
    });

    Object.entries(pricingData?.BAOGIACHITIET?.thanhpho || {}).forEach(
      ([cityName, districts], cityIndex) => {
        const cityKey = slugify(cityName);
        rows.ghn_thanh_pho.push({
          pricing_version_id: versionId,
          city_key: cityKey,
          city_name: cityName,
          sort_order: (cityIndex + 1) * 10,
        });

        (districts || []).forEach((districtName, districtIndex) => {
          rows.ghn_quan_huyen.push({
            pricing_version_id: versionId,
            city_key: cityKey,
            district_name: String(districtName),
            sort_order: (districtIndex + 1) * 10,
          });
        });
      },
    );

    Object.entries(domestic.goi_y_phuong_tien || {}).forEach(
      ([suggestionKey, suggestionText], index) => {
        rows.ghn_goi_y_phuong_tien.push({
          pricing_version_id: versionId,
          suggestion_key: suggestionKey,
          suggestion_text: String(suggestionText),
          sort_order: (index + 1) * 10,
        });
      },
    );

    CHUNK_KEYS.forEach((chunkKey, index) => {
      if (!(chunkKey in pricingData)) return;
      rows.ghn_pricing_chunks.push({
        pricing_version_id: versionId,
        chunk_key: chunkKey,
        chunk_json: JSON.stringify(pricingData[chunkKey], null, 2),
        sort_order: (index + 1) * 10,
      });
    });

    return rows;
  }

  async function insertRows(table, rows, progress) {
    const chunks = chunkArray(rows, 20);

    for (const batch of chunks) {
      const tasks = batch.map((row) => () => insertTable(table, row));
      await runWithConcurrency(tasks, 4);
      if (progress) {
        progress(batch.length);
      }
    }
  }

  async function syncTableRows(table, versionId, desiredRows, progress) {
    const existingRows = await listTable(
      table,
      [{ field: "pricing_version_id", operator: "=", value: versionId }],
      { id: "asc" },
      500,
    );

    const existingByKey = new Map(
      existingRows.map((row) => [buildRowKey(table, row), row]).filter(([key]) => key !== ""),
    );
    const desiredByKey = new Map(
      desiredRows.map((row) => [buildRowKey(table, row), row]).filter(([key]) => key !== ""),
    );

    const inserts = [];
    const updates = [];
    const deletes = [];

    for (const row of desiredRows) {
      const key = buildRowKey(table, row);
      const existing = existingByKey.get(key);
      if (!existing) {
        inserts.push(row);
        continue;
      }

      const nextRow = normalizeComparableRow(row);
      const currentRow = normalizeComparableRow(existing);
      if (serializePricingData(nextRow) !== serializePricingData(currentRow)) {
        updates.push({ id: Number(existing.id || 0), data: row });
      }
    }

    for (const row of existingRows) {
      const key = buildRowKey(table, row);
      if (key && !desiredByKey.has(key)) {
        deletes.push(Number(row.id || 0));
      }
    }

    const insertTasks = inserts.map((row) => async () => {
      await insertTable(table, row);
      if (progress) progress(1);
    });
    const updateTasks = updates.map((row) => async () => {
      await updateTable(table, row.id, row.data);
      if (progress) progress(1);
    });
    const deleteTasks = deletes.map((id) => async () => {
      await deleteTable(table, id);
      if (progress) progress(1);
    });

    await runWithConcurrency(deleteTasks, 4);
    await runWithConcurrency(updateTasks, 4);
    await runWithConcurrency(insertTasks, 4);
  }

  async function persistPricingViaKrud(pricingData, action, formData) {
    const current =
      activeVersionId > 0 ? { metaId: 0, versionId: activeVersionId } : await getActiveVersionInfo();
    const versionId = current.versionId > 0 ? current.versionId : await createPricingVersion();

    if (canPersistRowLevel(action, formData)) {
      const persisted = await persistPricingRowLevel(pricingData, action, formData, versionId);
      if (persisted) {
        showProgress("Đang export pricing-data.json...");
        try {
          await exportPricingDataFile(versionId);
        } catch (error) {
          throw createPartialExportError(error);
        }
        return versionId;
      }
    }

    const rows = buildPersistenceRows(pricingData, versionId);
    const targetTables =
      current.versionId > 0 && PARTIAL_ACTION_TABLES[action]
        ? PARTIAL_ACTION_TABLES[action]
        : Object.keys(rows);
    const tables = targetTables
      .map((table) => [table, rows[table] || []])
      .filter(([, tableRows]) => Array.isArray(tableRows));
    const totalRows = tables.reduce((sum, [, tableRows]) => sum + tableRows.length, 0);
    let doneRows = 0;
    const updateProgress = () => {
      const nextDone = Math.min(doneRows, totalRows);
      const percent = totalRows > 0 ? Math.round((nextDone / totalRows) * 100) : 0;
      showProgress(`Đang đồng bộ lên KRUD... ${nextDone}/${totalRows} (${percent}%)`);
    };

    const tableTasks = tables.map(([table, tableRows], index) => async () => {
      if (current.versionId > 0) {
        await syncTableRows(table, versionId, tableRows, (delta) => {
          doneRows += delta;
          updateProgress();
        });
        return;
      }

      await insertRows(table, tableRows, (insertedDelta) => {
        doneRows += insertedDelta;
        updateProgress();
      });
    });

    updateProgress();
    await runWithConcurrency(tableTasks, 3);
    doneRows = totalRows;
    updateProgress();

    if (current.versionId <= 0) {
      showProgress("Đang kích hoạt phiên bản bảng giá mới...");
      await updateTable("ghn_pricing_versions", versionId, {
        status: "active",
        note: "",
      });
      await setActiveVersion(versionId, current);
      activeVersionId = versionId;
    }

    showProgress("Đang export pricing-data.json...");
    try {
      await exportPricingDataFile(versionId);
    } catch (error) {
      throw createPartialExportError(error);
    }
    return versionId;
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (event.defaultPrevented) return;

    event.preventDefault();
    const formData = new FormData(form);
    const pendingAction = String(form.dataset.pendingAction || "").trim();
    if (pendingAction) {
      formData.set("action", pendingAction);
    }
    const confirmMessage = String(form.dataset.pendingConfirmMessage || form.dataset.confirmMessage || "").trim();
    if (confirmMessage) {
      if (window.core && typeof window.core.confirm === "function") {
        const confirmed = await window.core.confirm({
          title: "Xác nhận lưu thay đổi",
          message: confirmMessage,
          type: confirmMessage.toLowerCase().includes("xóa") ? "danger" : "primary"
        });
        if (!confirmed) {
          clearPendingFormState(form);
          return;
        }
      } else if (!window.confirm(confirmMessage)) {
        clearPendingFormState(form);
        return;
      }
    }
    toggleSubmitting(form, true);
    showAlert("success", "Đang kiểm tra dữ liệu và đồng bộ lên KRUD...");

    try {
      if (config.canEdit === false) {
        throw new Error("KRUD là nguồn chính, JSON chỉ là cache/export nên không thể lưu khi KRUD chưa sẵn sàng.");
      }
      showProgress("Đang kiểm tra dữ liệu biểu mẫu...");
      const action = String(formData.get("action") || "").trim();
      if (!action) {
        throw new Error("Thiếu action của biểu mẫu bảng giá.");
      }
      const pricingData = canPersistRowLevel(action, formData)
        ? applyDirectFormUpdate(action, formData, currentPricingSnapshot)
        : await previewPricingUpdate(formData);
      normalizePricingDisplayLabels(pricingData);
      if (serializePricingData(pricingData) === serializePricingData(currentPricingSnapshot)) {
        throw new Error("Không phát hiện thay đổi nào để lưu.");
      }
      const activeSectionId = getActiveSectionId(document);
      const versionId = await persistPricingViaKrud(pricingData, action, formData);
      const patchedDirectly = canPatchDomDirectly(action, formData) &&
        patchDomAfterSave(action, formData, pricingData);
      currentPricingSnapshot = pricingData;
      showProgress("Đang cập nhật giao diện bảng giá...");
      if (patchedDirectly) {
        closeAllModals(document);
        initPricingUi(document, activeSectionId);
      } else {
        await refreshPricingSection(action, activeSectionId);
      }
      if (progressTimer) {
        window.clearTimeout(progressTimer);
        progressTimer = 0;
      }
      hideProgress();
      toggleSubmitting(form, false);
      clearPendingFormState(form);
      setSyncStatus(
        "synced",
        `KRUD active #${versionId}. Vừa export JSON cache pricing-data.json thành công từ KRUD.`,
      );
      showAlert(
        "success",
        `Đã lưu bảng giá. Phiên bản active hiện tại: #${versionId}.`,
      );
    } catch (error) {
      if (progressTimer) {
        window.clearTimeout(progressTimer);
        progressTimer = 0;
      }
      hideProgress();
      const isPartialSave = Boolean(error && error.partialSave);
      showAlert(
        isPartialSave ? "warning" : "error",
        error instanceof Error ? error.message : "Không lưu được bảng giá.",
        isPartialSave ? { durationMs: 12000 } : {},
      );
      toggleSubmitting(form, false);
      clearPendingFormState(form);
    }
  }

  function bindPricingForms(root = document) {
    root.querySelectorAll('form[method="post"]').forEach((form) => {
      if (form.dataset.pricingSubmitBound === "1") return;
      form.dataset.pricingSubmitBound = "1";
      form.dataset.confirmMessage = form.dataset.confirmMessage || "";
      form.addEventListener("submit", handleSubmit);
    });
  }

  function bindPricingActionButtons(root = document) {
    root.querySelectorAll("[data-pricing-action]").forEach((button) => {
      if (button.dataset.pricingActionBound === "1") return;
      button.dataset.pricingActionBound = "1";
      button.addEventListener("click", () => {
        if (!(button instanceof HTMLButtonElement)) return;
        const form = button.closest("form");
        if (!(form instanceof HTMLFormElement)) return;

        const actionInput = form.querySelector('input[name="action"]');
        if (!(actionInput instanceof HTMLInputElement)) return;

        const action = String(button.dataset.pricingAction || "").trim();
        if (!action) return;

        form.dataset.pendingAction = action;
        form.dataset.pendingConfirmMessage =
          String(button.dataset.confirmMessage || form.dataset.confirmMessage || "").trim();

        const deleteKeyInput = form.querySelector('input[name="delete_key"]');
        if (deleteKeyInput instanceof HTMLInputElement) {
          deleteKeyInput.value = String(button.dataset.deleteKey || "");
        }

        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
          return;
        }

        form.submit();
      });
    });
  }

  function initPricingUi(root = document, preferredSectionId = "") {
    const shell = getPricingShell(root);
    if (!shell) return;

    if (shell.dataset.pricingUiBound !== "1") {
      shell.dataset.pricingUiBound = "1";

      shell.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;

        const tab = target.closest("[data-pricing-tab]");
        if (tab && shell.contains(tab)) {
          event.preventDefault();
          activateSection(root, tab.dataset.pricingTab || "", true, true);
          return;
        }



        const openButton = target.closest("[data-open-modal]");
        if (openButton && shell.contains(openButton)) {
          openModal(root, openButton.dataset.openModal || "");
          return;
        }

        const closeButton = target.closest("[data-close-modal]");
        if (closeButton && shell.contains(closeButton)) {
          closeModal(closeButton.closest("[data-modal]"));
          return;
        }

        if (target.closest("[data-pricing-sync-check]")) {
          checkPublicJsonSync();
          return;
        }

        if (target.closest("[data-pricing-sync-export]")) {
          exportActivePricingJson();
        }
      });
    }

    activateSection(root, preferredSectionId || getActiveSectionId(root), false);
    bindPricingActionButtons(root);
  }

  function init() {
    bindPricingForms(document);
    initPricingUi(document);

    if (!window.__ghnPricingEscapeBound) {
      window.__ghnPricingEscapeBound = true;
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeAllModals(document);
        }
      });
    }

    if (!getInsertFn() || !getListFn()) {
      showAlert(
        "error",
        "Không tải được krud.js. Trang sẽ không lưu được bảng giá cho tới khi script KRUD sẵn sàng.",
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
