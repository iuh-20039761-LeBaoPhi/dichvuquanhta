(function (window, document) {
  const config = window.GHNAdminPricing || {};
  if (!config.pageUrl || !config.exportUrl) return;

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
    save_service_fees: [
      "ghn_cau_hinh_phi_dich_vu",
      "ghn_khung_gio_dich_vu",
      "ghn_dieu_kien_giao",
    ],
    add_service_time: ["ghn_cau_hinh_phi_dich_vu", "ghn_khung_gio_dich_vu"],
    delete_service_time: ["ghn_cau_hinh_phi_dich_vu", "ghn_khung_gio_dich_vu"],
    add_weather: ["ghn_cau_hinh_phi_dich_vu", "ghn_dieu_kien_giao"],
    delete_weather: ["ghn_cau_hinh_phi_dich_vu", "ghn_dieu_kien_giao"],
    save_cod_insurance: ["ghn_cau_hinh_tai_chinh"],
    save_vehicles: ["ghn_phuong_tien"],
    add_vehicle: ["ghn_phuong_tien"],
    delete_vehicle: ["ghn_phuong_tien"],
    save_vehicle_row: ["ghn_phuong_tien"],
    save_goods_fees: ["ghn_loai_hang"],
    add_goods_fee: ["ghn_loai_hang"],
    delete_goods_fee: ["ghn_loai_hang"],
    save_goods_fee_row: ["ghn_loai_hang"],
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

  function serializePricingData(value) {
    return JSON.stringify(value ?? null);
  }

  function showAlert(type, message) {
    const container = document.querySelector(".admin-container");
    if (!container) return;

    let existing = container.querySelector(".pricing-alert--runtime");
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "pricing-alert pricing-alert--runtime";
      const header = container.querySelector(".page-header");
      if (header) {
        header.insertAdjacentElement("afterend", existing);
      } else {
        container.prepend(existing);
      }
    }

    existing.className = `pricing-alert pricing-alert--runtime pricing-alert--${type}`;
    existing.textContent = message;
  }

  function showProgress(message) {
    pendingProgressMessage = message;
    if (progressTimer) return;
    progressTimer = window.setTimeout(() => {
      progressTimer = 0;
      showAlert("success", pendingProgressMessage);
    }, 120);
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

  function activateSection(root, id, syncHash = true) {
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

  async function refreshPricingShell(preferredSectionId = "") {
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

    if (!nextShell || !currentShell) {
      throw new Error("Không tìm thấy khối pricing-shell để cập nhật giao diện.");
    }

    document.body.classList.remove("pricing-modal-open");
    currentShell.replaceWith(nextShell);
    activeVersionId = Number(nextShell.dataset.activeVersionId || activeVersionId || 0);
    initPricingUi(document, preferredSectionId || getActiveSectionId(parsed));
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

    Object.entries(serviceFeeConfig.thoigian || {}).forEach(([slotKey, slotConfig], index) => {
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

  async function persistPricingViaKrud(pricingData, action) {
    const current = activeVersionId > 0 ? { metaId: 0, versionId: activeVersionId } : await getActiveVersionInfo();
    const versionId = current.versionId > 0 ? current.versionId : await createPricingVersion();
    const rows = buildPersistenceRows(pricingData, versionId);
    const targetTables =
      current.versionId > 0 && PARTIAL_ACTION_TABLES[action]
        ? PARTIAL_ACTION_TABLES[action]
        : Object.keys(rows);
    const tables = targetTables
      .map((table) => [table, rows[table] || []])
      .filter(([, tableRows]) => Array.isArray(tableRows));
    const currentTotals = await Promise.all(
      tables.map(async ([table]) => {
        const listed = await listTable(
          table,
          [{ field: "pricing_version_id", operator: "=", value: versionId }],
          { id: "asc" },
          500,
        );
        return listed.length;
      }),
    );
    const totalRows =
      current.versionId > 0
        ? tables.reduce((sum, [, tableRows], index) => {
            return sum + Math.max(tableRows.length, currentTotals[index] || 0);
          }, 0)
        : tables.reduce((sum, [, tableRows]) => sum + tableRows.length, 0);
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

    showProgress("Đang export pricing-data.json...");
    await fetch(config.exportUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pricingData }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      if (!payload.verified) {
        throw new Error("pricing-data.json chưa được xác minh sau khi export.");
      }
    });

    if (current.versionId <= 0) {
      showProgress("Đang kích hoạt phiên bản bảng giá mới...");
      await updateTable("ghn_pricing_versions", versionId, {
        status: "active",
        note: "",
      });
      await setActiveVersion(versionId, current);
      activeVersionId = versionId;
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
    if (confirmMessage && !window.confirm(confirmMessage)) {
      clearPendingFormState(form);
      return;
    }
    toggleSubmitting(form, true);
    showAlert("success", "Đang kiểm tra dữ liệu và đồng bộ lên KRUD...");

    try {
      showProgress("Đang kiểm tra dữ liệu biểu mẫu...");
      const action = String(formData.get("action") || "").trim();
      if (!action) {
        throw new Error("Thiếu action của biểu mẫu bảng giá.");
      }
      const pricingData = await previewPricingUpdate(formData);
      if (serializePricingData(pricingData) === serializePricingData(currentPricingSnapshot)) {
        throw new Error("Không phát hiện thay đổi nào để lưu.");
      }
      const activeSectionId = getActiveSectionId(document);
      const versionId = await persistPricingViaKrud(pricingData, action);
      currentPricingSnapshot = pricingData;
      showProgress("Đang cập nhật giao diện bảng giá...");
      await refreshPricingShell(activeSectionId);
      if (progressTimer) {
        window.clearTimeout(progressTimer);
        progressTimer = 0;
      }
      clearPendingFormState(form);
      showAlert(
        "success",
        `Đã lưu bảng giá. Phiên bản active hiện tại: #${versionId}.`,
      );
    } catch (error) {
      if (progressTimer) {
        window.clearTimeout(progressTimer);
        progressTimer = 0;
      }
      showAlert("error", error instanceof Error ? error.message : "Không lưu được bảng giá.");
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

      shell.querySelectorAll("[data-pricing-tab]").forEach((tab) => {
        tab.addEventListener("click", (event) => {
          event.preventDefault();
          activateSection(root, tab.dataset.pricingTab || "");
        });
      });

      shell.querySelectorAll("[data-open-modal]").forEach((button) => {
        button.addEventListener("click", () => {
          openModal(root, button.dataset.openModal || "");
        });
      });

      shell.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => {
          closeModal(button.closest("[data-modal]"));
        });
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
