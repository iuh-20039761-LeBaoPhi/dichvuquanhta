(function (window, document) {
  "use strict";

  if (window.__ghnPricingSupportInitDone) return;
  window.__ghnPricingSupportInitDone = true;

  const config = window.GHNAdminPricingSupport || {};
  const client = window.GHNAdminPricingKrudClient || {};
  const ACTIVE_VERSION_META_KEY = "active_pricing_version_id";
  const REGION_DEFAULTS = [
    { region_key: "cung_quan", region_label: "Nội quận/huyện", sort_order: 10 },
    { region_key: "noi_thanh", region_label: "Nội thành", sort_order: 20 },
    { region_key: "lien_tinh", region_label: "Liên tỉnh", sort_order: 30 },
  ];

  const state = {
    activeVersionId: Number(config.activeVersionId || 0),
    metaId: 0,
    regions: [],
    cities: [],
    districts: [],
    versions: [],
    districtFilter: "",
    busy: false,
  };

  const dom = {
    message: document.getElementById("pricing-support-message"),
    refresh: document.getElementById("pricing-support-refresh"),
    cityForm: document.getElementById("support-city-form"),
    districtForm: document.getElementById("support-district-form"),
    regionForm: document.getElementById("support-region-form"),
    cityRows: document.getElementById("support-city-rows"),
    districtRows: document.getElementById("support-district-rows"),
    regionRows: document.getElementById("support-region-rows"),
    versionRows: document.getElementById("support-version-rows"),
    districtFilter: document.getElementById("support-district-filter"),
  };

  function getRequiredFn(name, label) {
    const fn = typeof client[name] === "function" ? client[name]() : null;
    if (!fn) throw new Error(`Không tìm thấy helper KRUD: ${label}.`);
    return fn;
  }

  function extractRows(payload) {
    if (typeof client.extractRows === "function") {
      return client.extractRows(payload);
    }
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  }

  function assertKrudOk(response) {
    if (!response || typeof response !== "object") return;
    if (response.success === false || response.status === "error" || response.error) {
      throw new Error(String(response.message || response.error || "KRUD trả lỗi không rõ."));
    }
  }

  async function listTable(table, where = [], sort = { id: "asc" }, limit = 500) {
    const listFn = getRequiredFn("getListFn", "list");
    const response = await listFn({ table, where, sort, page: 1, limit });
    assertKrudOk(response);
    return extractRows(response);
  }

  async function insertTable(table, data) {
    const insertFn = getRequiredFn("getInsertFn", "insert");
    const response = await insertFn(table, data);
    assertKrudOk(response);
    return response;
  }

  async function updateTable(table, id, data) {
    const updateFn = getRequiredFn("getUpdateFn", "update");
    const response = await updateFn(table, data, Number(id));
    assertKrudOk(response);
    return response;
  }

  async function deleteTable(table, id) {
    const deleteFn = getRequiredFn("getDeleteFn", "delete");
    const response = await deleteFn(table, Number(id));
    assertKrudOk(response);
    return response;
  }

  function showMessage(type, message, durationMs = 7200) {
    if (!dom.message) return;
    dom.message.className = `pricing-support-message is-${type}`;
    dom.message.textContent = message;
    dom.message.hidden = false;
    window.clearTimeout(showMessage._timer);
    if (durationMs > 0) {
      showMessage._timer = window.setTimeout(() => {
        dom.message.hidden = true;
      }, durationMs);
    }
  }

  function setBusy(isBusy) {
    state.busy = isBusy;
    document.querySelectorAll("button, input, select").forEach((node) => {
      if (node.closest(".profile-menu")) return;
      node.disabled = isBusy;
    });
  }

  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function sortedByOrder(rows, key = "sort_order") {
    return [...rows].sort((left, right) => {
      const orderDiff = asNumber(left[key], 999) - asNumber(right[key], 999);
      if (orderDiff !== 0) return orderDiff;
      return String(left.id || "").localeCompare(String(right.id || ""));
    });
  }

  function cityName(cityKey) {
    return state.cities.find((city) => String(city.city_key) === String(cityKey))?.city_name || cityKey;
  }

  function versionWhere(extra = []) {
    return [
      { field: "pricing_version_id", operator: "=", value: state.activeVersionId },
      ...extra,
    ];
  }

  function requireActiveVersion() {
    if (Number(state.activeVersionId) <= 0) {
      throw new Error("Chưa có pricing version active. Hãy lưu bảng giá chính trước.");
    }
  }

  async function getActiveVersionInfo() {
    const rows = await listTable(
      "ghn_pricing_meta",
      [{ field: "meta_key", operator: "=", value: ACTIVE_VERSION_META_KEY }],
      { id: "desc" },
      1,
    );
    const meta = rows[0] || {};
    return {
      metaId: Number(meta.id || 0),
      versionId: Number(meta.meta_value || 0),
    };
  }

  async function exportPricing(versionId = state.activeVersionId) {
    const response = await fetch(config.exportUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ versionId: Number(versionId) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(String(payload.message || "Export pricing-data.json thất bại."));
    }
    return payload;
  }

  async function runKrudThenExport(
    actionLabel,
    krudOperation,
    exportVersionId = state.activeVersionId,
    refreshAfterSave = loadAll,
  ) {
    setBusy(true);
    try {
      try {
        await krudOperation();
      } catch (error) {
        showMessage("error", `${actionLabel} thất bại ở bước KRUD/DB: ${error.message}`, 0);
        return;
      }

      try {
        await exportPricing(exportVersionId);
        showMessage("success", `${actionLabel} thành công. Public JSON đã được cập nhật.`);
      } catch (error) {
        showMessage(
          "warning",
          `${actionLabel} đã lưu KRUD, nhưng export pricing-data.json thất bại. Public có thể chưa nhận dữ liệu mới. Chi tiết: ${error.message}`,
          0,
        );
      }

      if (typeof refreshAfterSave === "function") {
        await refreshAfterSave();
      }
    } finally {
      setBusy(false);
    }
  }

  function fillSelect(select, includeAllOption = false) {
    if (!select) return;
    const currentValue = select.value;
    const options = [];
    if (includeAllOption) {
      options.push('<option value="">Tất cả thành phố</option>');
    }
    sortedByOrder(state.cities)
      .filter((city) => city.city_key)
      .forEach((city) => {
        options.push(
          `<option value="${escapeHtml(city.city_key)}">${escapeHtml(city.city_name || city.city_key)}</option>`,
        );
      });
    select.innerHTML = options.join("");
    if ([...select.options].some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  }

  function renderCities() {
    if (!dom.cityRows) return;
    const rows = sortedByOrder(state.cities);
    if (!rows.length) {
      dom.cityRows.innerHTML = '<tr><td colspan="4" class="pricing-support-empty">Chưa có thành phố cho version active.</td></tr>';
      return;
    }
    dom.cityRows.innerHTML = rows
      .map((city) => {
        const districtCount = state.districts.filter(
          (district) => String(district.city_key) === String(city.city_key),
        ).length;
        return `
          <tr>
            <td data-label="Mã"><strong>${escapeHtml(city.city_key)}</strong></td>
            <td data-label="Tên">${escapeHtml(city.city_name || "")}<br><small>${districtCount} quận/huyện</small></td>
            <td data-label="Thứ tự">${escapeHtml(city.sort_order ?? "")}</td>
            <td data-label="Thao tác">
              <div class="pricing-support-row-actions">
                <button type="button" class="pricing-support-icon-btn" title="Sửa" data-action="edit-city" data-id="${escapeHtml(city.id)}"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="pricing-support-icon-btn is-danger" title="Xóa" data-action="delete-city" data-id="${escapeHtml(city.id)}"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderDistricts() {
    if (!dom.districtRows) return;
    const rows = sortedByOrder(state.districts).filter((district) => {
      return !state.districtFilter || String(district.city_key) === state.districtFilter;
    });
    if (!rows.length) {
      dom.districtRows.innerHTML = '<tr><td colspan="4" class="pricing-support-empty">Không có quận/huyện phù hợp.</td></tr>';
      return;
    }
    dom.districtRows.innerHTML = rows
      .map((district) => `
        <tr>
          <td data-label="Thành phố">${escapeHtml(cityName(district.city_key))}</td>
          <td data-label="Quận/huyện"><strong>${escapeHtml(district.district_name || "")}</strong></td>
          <td data-label="Thứ tự">${escapeHtml(district.sort_order ?? "")}</td>
          <td data-label="Thao tác">
            <div class="pricing-support-row-actions">
              <button type="button" class="pricing-support-icon-btn" title="Sửa" data-action="edit-district" data-id="${escapeHtml(district.id)}"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="pricing-support-icon-btn is-danger" title="Xóa" data-action="delete-district" data-id="${escapeHtml(district.id)}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  }

  function renderRegions() {
    if (!dom.regionRows) return;
    const merged = REGION_DEFAULTS.map((fallback) => ({
      ...fallback,
      ...(state.regions.find((region) => region.region_key === fallback.region_key) || {}),
    }));
    dom.regionRows.innerHTML = merged
      .map((region) => `
        <tr>
          <td data-label="Mã"><strong>${escapeHtml(region.region_key)}</strong></td>
          <td data-label="Nhãn">${escapeHtml(region.region_label || "")}</td>
          <td data-label="Thao tác">
            <div class="pricing-support-row-actions">
              <button type="button" class="pricing-support-icon-btn" title="Sửa" data-action="edit-region" data-key="${escapeHtml(region.region_key)}"><i class="fa-solid fa-pen"></i></button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  }

  function renderVersions() {
    if (!dom.versionRows) return;
    const rows = [...state.versions].sort((left, right) => Number(right.id || 0) - Number(left.id || 0));
    if (!rows.length) {
      dom.versionRows.innerHTML = '<tr><td colspan="4" class="pricing-support-empty">Chưa có phiên bản bảng giá.</td></tr>';
      return;
    }
    dom.versionRows.innerHTML = rows
      .map((version) => {
        const versionId = Number(version.id || 0);
        const isActive = versionId === Number(state.activeVersionId);
        const status = isActive ? "active" : String(version.status || "draft");
        const statusClass = status === "active" ? "is-active" : status === "draft" ? "is-draft" : "is-other";
        const actionButton = isActive
          ? `<button type="button" class="btn-secondary" data-action="export-version" data-id="${versionId}"><i class="fa-solid fa-file-export"></i> Export</button>`
          : `<button type="button" class="btn-primary" data-action="activate-version" data-id="${versionId}"><i class="fa-solid fa-rotate-left"></i> Kích hoạt</button>`;
        return `
          <tr>
            <td data-label="ID"><strong>#${versionId}</strong></td>
            <td data-label="Mã phiên bản">${escapeHtml(version.version_code || "")}<br><small>${escapeHtml(version.created_by || "")}</small></td>
            <td data-label="Trạng thái"><span class="pricing-support-status ${statusClass}">${escapeHtml(status)}</span></td>
            <td data-label="Thao tác"><div class="pricing-support-row-actions">${actionButton}</div></td>
          </tr>
        `;
      })
      .join("");
  }

  function renderAll() {
    fillSelect(dom.districtForm?.elements.city_key, false);
    fillSelect(dom.districtFilter, true);
    renderCities();
    renderDistricts();
    renderRegions();
    renderVersions();
  }

  async function loadAll() {
    showMessage("info", "Đang tải dữ liệu phụ trợ bảng giá...", 0);
    const metaInfo = await getActiveVersionInfo().catch(() => ({
      metaId: 0,
      versionId: Number(config.activeVersionId || 0),
    }));
    state.metaId = metaInfo.metaId;
    state.activeVersionId = metaInfo.versionId || Number(config.activeVersionId || 0);

    const shouldLoadVersions = Boolean(dom.versionRows);
    const versionsPromise = shouldLoadVersions
      ? listTable("ghn_pricing_versions", [], { id: "desc" }, 200)
      : Promise.resolve([]);
    if (state.activeVersionId > 0) {
      const [versions, regions, cities, districts] = await Promise.all([
        versionsPromise,
        listTable("ghn_vung_giao_hang", versionWhere(), { sort_order: "asc" }, 50),
        listTable("ghn_thanh_pho", versionWhere(), { sort_order: "asc" }, 500),
        listTable("ghn_quan_huyen", versionWhere(), { sort_order: "asc" }, 500),
      ]);
      state.versions = versions;
      state.regions = regions;
      state.cities = cities;
      state.districts = districts;
    } else {
      state.versions = await versionsPromise;
      state.regions = [];
      state.cities = [];
      state.districts = [];
    }

    renderAll();
    if (dom.message) dom.message.hidden = true;
  }

  async function reloadCities() {
    if (state.activeVersionId <= 0) {
      state.cities = [];
    } else {
      state.cities = await listTable("ghn_thanh_pho", versionWhere(), { sort_order: "asc" }, 500);
    }
    fillSelect(dom.districtForm?.elements.city_key, false);
    fillSelect(dom.districtFilter, true);
    renderCities();
    renderDistricts();
  }

  async function reloadDistricts() {
    if (state.activeVersionId <= 0) {
      state.districts = [];
    } else {
      state.districts = await listTable("ghn_quan_huyen", versionWhere(), { sort_order: "asc" }, 500);
    }
    renderCities();
    renderDistricts();
  }

  async function reloadRegions() {
    if (state.activeVersionId <= 0) {
      state.regions = [];
    } else {
      state.regions = await listTable("ghn_vung_giao_hang", versionWhere(), { sort_order: "asc" }, 50);
    }
    renderRegions();
  }

  async function reloadVersions() {
    state.versions = dom.versionRows
      ? await listTable("ghn_pricing_versions", [], { id: "desc" }, 200)
      : [];
    renderVersions();
  }

  function resetCityForm() {
    dom.cityForm?.reset();
    if (dom.cityForm) {
      dom.cityForm.elements.id.value = "";
      dom.cityForm.elements.city_key.value = "";
      dom.cityForm.elements.sort_order.value = String((state.cities.length + 1) * 10);
    }
  }

  function resetDistrictForm() {
    dom.districtForm?.reset();
    if (dom.districtForm) {
      dom.districtForm.elements.id.value = "";
      dom.districtForm.elements.sort_order.value = String((state.districts.length + 1) * 10);
    }
  }

  function resetRegionForm() {
    dom.regionForm?.reset();
    if (dom.regionForm) {
      dom.regionForm.elements.id.value = "";
      dom.regionForm.elements.region_key.value = "";
      dom.regionForm.elements.sort_order.value = "";
    }
  }

  function validateUniqueCity(cityKey, currentId) {
    const exists = state.cities.some(
      (city) => String(city.city_key) === cityKey && Number(city.id) !== Number(currentId || 0),
    );
    if (exists) throw new Error("Mã thành phố đã tồn tại trong version active.");
  }

  function validateUniqueDistrict(cityKey, districtName, currentId) {
    const normalizedName = String(districtName).trim().toLowerCase();
    const exists = state.districts.some((district) => {
      return (
        String(district.city_key) === cityKey &&
        String(district.district_name || "").trim().toLowerCase() === normalizedName &&
        Number(district.id) !== Number(currentId || 0)
      );
    });
    if (exists) throw new Error("Quận/huyện này đã tồn tại trong thành phố đã chọn.");
  }

  async function saveCity(event) {
    event.preventDefault();
    requireActiveVersion();
    const form = event.currentTarget;
    const id = Number(form.elements.id.value || 0);
    const cityNameValue = form.elements.city_name.value.trim();
    if (!cityNameValue) throw new Error("Vui lòng nhập tên thành phố.");
    const cityKey = id ? form.elements.city_key.value.trim() : slugify(cityNameValue);
    if (!cityKey) throw new Error("Không tạo được mã thành phố.");
    validateUniqueCity(cityKey, id);
    const payload = {
      pricing_version_id: state.activeVersionId,
      city_key: cityKey,
      city_name: cityNameValue,
      sort_order: Math.max(0, Math.round(asNumber(form.elements.sort_order.value, 0))),
    };
    await runKrudThenExport(
      id ? "Cập nhật thành phố" : "Thêm thành phố",
      async () => {
        if (id) await updateTable("ghn_thanh_pho", id, payload);
        else await insertTable("ghn_thanh_pho", payload);
      },
      state.activeVersionId,
      reloadCities,
    );
    resetCityForm();
  }

  async function saveDistrict(event) {
    event.preventDefault();
    requireActiveVersion();
    const form = event.currentTarget;
    const id = Number(form.elements.id.value || 0);
    const cityKey = form.elements.city_key.value.trim();
    const districtNameValue = form.elements.district_name.value.trim();
    if (!cityKey) throw new Error("Vui lòng chọn thành phố.");
    if (!districtNameValue) throw new Error("Vui lòng nhập tên quận/huyện.");
    validateUniqueDistrict(cityKey, districtNameValue, id);
    const payload = {
      pricing_version_id: state.activeVersionId,
      city_key: cityKey,
      district_name: districtNameValue,
      sort_order: Math.max(0, Math.round(asNumber(form.elements.sort_order.value, 0))),
    };
    await runKrudThenExport(
      id ? "Cập nhật quận huyện" : "Thêm quận huyện",
      async () => {
        if (id) await updateTable("ghn_quan_huyen", id, payload);
        else await insertTable("ghn_quan_huyen", payload);
      },
      state.activeVersionId,
      reloadDistricts,
    );
    resetDistrictForm();
  }

  async function saveRegion(event) {
    event.preventDefault();
    requireActiveVersion();
    const form = event.currentTarget;
    const id = Number(form.elements.id.value || 0);
    const regionKey = form.elements.region_key.value.trim();
    const regionLabel = form.elements.region_label.value.trim();
    if (!regionKey) throw new Error("Vui lòng chọn vùng cần sửa.");
    if (!regionLabel) throw new Error("Vui lòng nhập nhãn vùng.");
    const payload = {
      pricing_version_id: state.activeVersionId,
      region_key: regionKey,
      region_label: regionLabel,
      sort_order: Math.max(0, Math.round(asNumber(form.elements.sort_order.value, 0))),
    };
    await runKrudThenExport(
      "Cập nhật vùng giao hàng",
      async () => {
        if (id) await updateTable("ghn_vung_giao_hang", id, payload);
        else await insertTable("ghn_vung_giao_hang", payload);
      },
      state.activeVersionId,
      reloadRegions,
    );
    resetRegionForm();
  }

  async function deleteCity(id) {
    const city = state.cities.find((item) => Number(item.id) === Number(id));
    if (!city) return;
    const districtCount = state.districts.filter(
      (district) => String(district.city_key) === String(city.city_key),
    ).length;
    if (districtCount > 0) {
      showMessage("warning", "Thành phố này còn quận/huyện. Xóa quận/huyện trước rồi mới xóa thành phố.", 0);
      return;
    }
    if (!window.confirm(`Xóa thành phố "${city.city_name}"?`)) return;
    await runKrudThenExport(
      "Xóa thành phố",
      () => deleteTable("ghn_thanh_pho", id),
      state.activeVersionId,
      reloadCities,
    );
  }

  async function deleteDistrict(id) {
    const district = state.districts.find((item) => Number(item.id) === Number(id));
    if (!district) return;
    if (!window.confirm(`Xóa quận/huyện "${district.district_name}"?`)) return;
    await runKrudThenExport(
      "Xóa quận huyện",
      () => deleteTable("ghn_quan_huyen", id),
      state.activeVersionId,
      reloadDistricts,
    );
  }

  async function activateVersion(id) {
    const nextVersionId = Number(id || 0);
    if (nextVersionId <= 0) return;
    if (!window.confirm(`Kích hoạt pricing version #${nextVersionId} và export JSON public?`)) return;
    await runKrudThenExport(
      `Kích hoạt phiên bản #${nextVersionId}`,
      async () => {
        const metaInfo = await getActiveVersionInfo();
        if (metaInfo.metaId > 0) {
          await updateTable("ghn_pricing_meta", metaInfo.metaId, { meta_value: String(nextVersionId) });
        } else {
          await insertTable("ghn_pricing_meta", {
            meta_key: ACTIVE_VERSION_META_KEY,
            meta_value: String(nextVersionId),
          });
        }
        if (metaInfo.versionId > 0 && metaInfo.versionId !== nextVersionId) {
          await updateTable("ghn_pricing_versions", metaInfo.versionId, { status: "draft" });
        }
        await updateTable("ghn_pricing_versions", nextVersionId, { status: "active" });
        state.activeVersionId = nextVersionId;
      },
      nextVersionId,
      loadAll,
    );
  }

  async function exportVersion(id) {
    const versionId = Number(id || 0);
    if (versionId <= 0) return;
    setBusy(true);
    try {
      await exportPricing(versionId);
      showMessage("success", `Đã export JSON public từ phiên bản #${versionId}.`);
    } catch (error) {
      showMessage("error", `Export JSON thất bại: ${error.message}`, 0);
    } finally {
      setBusy(false);
    }
  }

  function editCity(id) {
    const city = state.cities.find((item) => Number(item.id) === Number(id));
    if (!city || !dom.cityForm) return;
    dom.cityForm.elements.id.value = city.id || "";
    dom.cityForm.elements.city_key.value = city.city_key || "";
    dom.cityForm.elements.city_name.value = city.city_name || "";
    dom.cityForm.elements.sort_order.value = city.sort_order ?? "";
    dom.cityForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function editDistrict(id) {
    const district = state.districts.find((item) => Number(item.id) === Number(id));
    if (!district || !dom.districtForm) return;
    dom.districtForm.elements.id.value = district.id || "";
    dom.districtForm.elements.city_key.value = district.city_key || "";
    dom.districtForm.elements.district_name.value = district.district_name || "";
    dom.districtForm.elements.sort_order.value = district.sort_order ?? "";
    dom.districtForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function editRegion(regionKey) {
    const fallback = REGION_DEFAULTS.find((region) => region.region_key === regionKey) || {};
    const region = state.regions.find((item) => item.region_key === regionKey) || fallback;
    if (!dom.regionForm) return;
    dom.regionForm.elements.id.value = region.id || "";
    dom.regionForm.elements.region_key.value = region.region_key || "";
    dom.regionForm.elements.region_label.value = region.region_label || "";
    dom.regionForm.elements.sort_order.value = region.sort_order ?? "";
    dom.regionForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function bindEvents() {
    dom.refresh?.addEventListener("click", async () => {
      setBusy(true);
      try {
        await loadAll();
      } catch (error) {
        showMessage("error", `Không tải được dữ liệu: ${error.message}`, 0);
      } finally {
        setBusy(false);
      }
    });

    dom.cityForm?.addEventListener("input", (event) => {
      if (event.target.name === "city_name" && !dom.cityForm.elements.id.value) {
        dom.cityForm.elements.city_key.value = slugify(event.target.value);
      }
    });

    dom.cityForm?.addEventListener("submit", (event) => {
      saveCity(event).catch((error) => showMessage("error", error.message, 0));
    });
    dom.districtForm?.addEventListener("submit", (event) => {
      saveDistrict(event).catch((error) => showMessage("error", error.message, 0));
    });
    dom.regionForm?.addEventListener("submit", (event) => {
      saveRegion(event).catch((error) => showMessage("error", error.message, 0));
    });

    dom.districtFilter?.addEventListener("change", () => {
      state.districtFilter = dom.districtFilter.value;
      renderDistricts();
    });

    document.querySelectorAll("[data-reset-form]").forEach((button) => {
      button.addEventListener("click", () => {
        const formId = button.dataset.resetForm;
        if (formId === "support-city-form") resetCityForm();
        if (formId === "support-district-form") resetDistrictForm();
        if (formId === "support-region-form") resetRegionForm();
      });
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || state.busy) return;
      const id = Number(button.dataset.id || 0);
      const action = button.dataset.action;
      if (action === "edit-city") editCity(id);
      if (action === "delete-city") deleteCity(id).catch((error) => showMessage("error", error.message, 0));
      if (action === "edit-district") editDistrict(id);
      if (action === "delete-district") deleteDistrict(id).catch((error) => showMessage("error", error.message, 0));
      if (action === "edit-region") editRegion(button.dataset.key || "");
      if (action === "activate-version") activateVersion(id).catch((error) => showMessage("error", error.message, 0));
      if (action === "export-version") exportVersion(id);
    });
  }

  async function init() {
    bindEvents();
    resetCityForm();
    resetDistrictForm();
    resetRegionForm();
    setBusy(true);
    try {
      await loadAll();
    } catch (error) {
      showMessage("error", `Không tải được dữ liệu phụ trợ bảng giá: ${error.message}`, 0);
    } finally {
      setBusy(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
