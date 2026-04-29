(function (window, document) {
  "use strict";

  if (window.__ghnServiceContentInitDone) return;
  window.__ghnServiceContentInitDone = true;

  const SECTION_TABLE = "noi_dung_trang_giao_hang";
  const SERVICE_TABLE = "noi_dung_trang_giao_hang_dich_vu";
  const PAGE_SLUG = "dich-vu-giao-hang";
  const EXPORT_API_URL = "../api/service_content_export.php";
  const bootstrap = window.__GHN_SERVICE_CONTENT_BOOTSTRAP__ || {};
  const client = window.GHNAdminPricingKrudClient || {};

  const state = {
    heroId: 0,
    servicesSectionId: 0,
    hero: {
      badge_label: "",
      title: "",
      description: "",
    },
    servicesSection: {
      title: "",
      description: "",
    },
    services: [],
    editingServiceId: 0,
    busy: false,
  };

  const refs = {
    runtime: document.getElementById("service-content-runtime"),
    summary: document.getElementById("service-content-summary"),
    tableBody: document.getElementById("service-content-table-body"),
    createBtn: document.getElementById("service-content-create-btn"),
    resetBtn: document.getElementById("service-content-reset-btn"),
    heroForm: document.getElementById("service-content-hero-form"),
    heroSaveBtn: document.getElementById("service-content-hero-save-btn"),
    sectionForm: document.getElementById("service-content-section-form"),
    sectionSaveBtn: document.getElementById("service-content-section-save-btn"),
    serviceForm: document.getElementById("service-content-service-form"),
    serviceSaveBtn: document.getElementById("service-content-save-btn"),
    serviceFormTitle: document.getElementById("service-content-form-title"),
  };

  function getRequiredFn(name, label) {
    const fn = typeof client[name] === "function" ? client[name]() : null;
    if (!fn) {
      throw new Error(`Không tìm thấy helper KRUD: ${label}.`);
    }
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

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dich-vu";
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isVisible(value) {
    return String(value) !== "0";
  }

  function isMissingTableError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return (
      message.includes("không tồn tại") ||
      message.includes("does not exist") ||
      message.includes("not found") ||
      (message.includes("table") && message.includes("exist"))
    );
  }

  function showRuntimeMessage(type, message, durationMs = 8000) {
    if (!refs.runtime) return;
    refs.runtime.className = `pricing-alert service-content-runtime pricing-alert--${type}`;
    refs.runtime.innerHTML = `<i class="fa-solid ${
      type === "success" ? "fa-circle-check" : type === "warning" ? "fa-triangle-exclamation" : "fa-circle-exclamation"
    }"></i> ${escapeHtml(message)}`;
    refs.runtime.style.display = "block";
    window.clearTimeout(showRuntimeMessage._timer);
    if (durationMs > 0) {
      showRuntimeMessage._timer = window.setTimeout(() => {
        refs.runtime.style.display = "none";
      }, durationMs);
    }
  }

  function hideRuntimeMessage() {
    if (!refs.runtime) return;
    refs.runtime.style.display = "none";
    refs.runtime.innerHTML = "";
  }

  function setBusy(isBusy) {
    state.busy = isBusy;
    document.querySelectorAll("button, input, textarea, select").forEach((node) => {
      if (node.closest(".profile-menu")) return;
      node.disabled = isBusy;
    });
  }

  async function listTable(table, where = [], sort = { id: "asc" }, limit = 500) {
    const listFn = getRequiredFn("getListFn", "list");
    const response = await listFn({ table, where, sort, page: 1, limit });
    assertKrudOk(response);
    return extractRows(response);
  }

  async function listTableSafe(table, where = [], sort = { id: "asc" }, limit = 500) {
    try {
      return await listTable(table, where, sort, limit);
    } catch (error) {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    }
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

  function makeSectionPayload(sectionKey, input) {
    return {
      page_slug: PAGE_SLUG,
      section_key: sectionKey,
      badge_label: normalizeText(input.badge_label || ""),
      title: normalizeText(input.title || ""),
      description: normalizeText(input.description || ""),
      updated_at: nowIso(),
    };
  }

  function createUniqueServiceKey(name, excludeId = 0) {
    const base = slugify(name);
    let nextKey = base;
    let counter = 2;
    while (
      state.services.some(
        (service) =>
          Number(service.id || 0) !== Number(excludeId || 0) &&
          String(service.service_key || "") === nextKey,
      )
    ) {
      nextKey = `${base}-${counter}`;
      counter += 1;
    }
    return nextKey;
  }

  function makeServicePayload(input, existing = null) {
    const name = normalizeText(input.ten);
    if (!name) {
      throw new Error("Tên dịch vụ không được để trống.");
    }

    return {
      page_slug: PAGE_SLUG,
      service_key: existing?.service_key || createUniqueServiceKey(name, existing?.id || 0),
      is_visible: String(input.is_visible) === "0" ? "0" : "1",
      ten: name,
      bieutuong: normalizeText(input.bieutuong),
      khauhieu: normalizeText(input.khauhieu),
      phamvi: normalizeText(input.phamvi),
      uutien: normalizeText(input.uutien),
      phuhopcho: normalizeText(input.phuhopcho),
      mota: normalizeText(input.mota),
      updated_at: nowIso(),
    };
  }

  function publicHeroPayload() {
    return {
      badge_label: normalizeText(state.hero.badge_label),
      title: normalizeText(state.hero.title),
      description: normalizeText(state.hero.description),
    };
  }

  function publicServicesSectionPayload() {
    return {
      title: normalizeText(state.servicesSection.title),
      description: normalizeText(state.servicesSection.description),
    };
  }

  function publicServicesPayload() {
    return state.services
      .slice()
      .sort((left, right) => Number(left.id || 0) - Number(right.id || 0))
      .map((service) => ({
        service_key: normalizeText(service.service_key),
        is_visible: String(service.is_visible) === "0" ? "0" : "1",
        ten: normalizeText(service.ten),
        bieutuong: normalizeText(service.bieutuong),
        khauhieu: normalizeText(service.khauhieu),
        phamvi: normalizeText(service.phamvi),
        uutien: normalizeText(service.uutien),
        phuhopcho: normalizeText(service.phuhopcho),
        mota: normalizeText(service.mota),
      }));
  }

  async function exportPublicJson() {
    const response = await fetch(EXPORT_API_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        page_slug: PAGE_SLUG,
        hero: publicHeroPayload(),
        services_section: publicServicesSectionPayload(),
        services: publicServicesPayload(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(String(payload.message || "Export JSON public thất bại."));
    }
    return payload;
  }

  function setHeroFormValues() {
    if (!refs.heroForm) return;
    refs.heroForm.elements.namedItem("badge_label").value = state.hero.badge_label || "";
    refs.heroForm.elements.namedItem("title").value = state.hero.title || "";
    refs.heroForm.elements.namedItem("description").value = state.hero.description || "";
  }

  function setServicesSectionFormValues() {
    if (!refs.sectionForm) return;
    refs.sectionForm.elements.namedItem("title").value = state.servicesSection.title || "";
    refs.sectionForm.elements.namedItem("description").value = state.servicesSection.description || "";
  }

  function setServiceForm(service = null) {
    if (!refs.serviceForm) return;
    refs.serviceForm.reset();
    state.editingServiceId = Number(service?.id || 0);
    refs.serviceForm.elements.namedItem("bieutuong").value = service?.bieutuong || "";
    refs.serviceForm.elements.namedItem("is_visible").value = String(service?.is_visible) === "0" ? "0" : "1";
    refs.serviceForm.elements.namedItem("ten").value = service?.ten || "";
    refs.serviceForm.elements.namedItem("khauhieu").value = service?.khauhieu || "";
    refs.serviceForm.elements.namedItem("phamvi").value = service?.phamvi || "";
    refs.serviceForm.elements.namedItem("uutien").value = service?.uutien || "";
    refs.serviceForm.elements.namedItem("phuhopcho").value = service?.phuhopcho || "";
    refs.serviceForm.elements.namedItem("mota").value = service?.mota || "";
    refs.serviceFormTitle.textContent = service ? `Sửa dịch vụ: ${service.ten}` : "Thêm dịch vụ";
  }

  function renderServicesTable() {
    if (!refs.tableBody || !refs.summary) return;

    refs.summary.textContent = `Có ${state.services.length} gói dịch vụ trong hệ thống.`;

    if (!state.services.length) {
      refs.tableBody.innerHTML = '<tr><td colspan="3" class="users-empty">Chưa có gói dịch vụ nào.</td></tr>';
      return;
    }

    refs.tableBody.innerHTML = state.services
      .slice()
      .sort((left, right) => Number(left.id || 0) - Number(right.id || 0))
      .map((service) => {
        const visible = isVisible(service.is_visible);
        return `
          <tr data-service-id="${escapeHtml(service.id)}">
            <td data-label="Dịch vụ">
              <div class="service-row-copy">
                <div class="service-row-title">
                  <span>${escapeHtml(service.bieutuong || "📦")}</span>
                  <strong>${escapeHtml(service.ten || "(Chưa có tên)")}</strong>
                </div>
                <small>${escapeHtml(service.khauhieu || "")}</small>
                <small>Phạm vi: ${escapeHtml(service.phamvi || "--")}</small>
              </div>
            </td>
            <td data-label="Trạng thái">
              <span class="service-status-pill ${visible ? "is-visible" : "is-hidden"}">
                <i class="fa-solid ${visible ? "fa-eye" : "fa-eye-slash"}"></i>
                ${visible ? "Đang hiển thị" : "Đang ẩn"}
              </span>
            </td>
            <td data-label="Thao tác">
              <div class="service-row-actions">
                <button type="button" class="btn-secondary" data-service-action="edit" title="Sửa">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn-secondary" data-service-action="toggle" title="Ẩn/hiện">
                  <i class="fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}"></i>
                </button>
                <button type="button" class="btn-secondary" data-service-action="delete" title="Xóa" style="color:#dc2626;">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function syncState(sectionRows, serviceRows) {
    const heroRow = sectionRows.find((row) => String(row.section_key || "") === "hero") || null;
    const servicesSectionRow =
      sectionRows.find((row) => String(row.section_key || "") === "services_section") || null;

    state.heroId = Number(heroRow?.id || 0);
    state.servicesSectionId = Number(servicesSectionRow?.id || 0);
    state.hero = {
      badge_label: normalizeText(heroRow?.badge_label || bootstrap?.hero?.badge_label || ""),
      title: normalizeText(heroRow?.title || bootstrap?.hero?.title || ""),
      description: normalizeText(heroRow?.description || bootstrap?.hero?.description || ""),
    };
    state.servicesSection = {
      title: normalizeText(servicesSectionRow?.title || bootstrap?.services_section?.title || ""),
      description: normalizeText(
        servicesSectionRow?.description || bootstrap?.services_section?.description || "",
      ),
    };
    state.services = serviceRows
      .slice()
      .sort((left, right) => Number(left.id || 0) - Number(right.id || 0))
      .map((row) => ({
        id: Number(row.id || 0),
        service_key: normalizeText(row.service_key),
        is_visible: String(row.is_visible) === "0" ? "0" : "1",
        ten: normalizeText(row.ten),
        bieutuong: normalizeText(row.bieutuong),
        khauhieu: normalizeText(row.khauhieu),
        phamvi: normalizeText(row.phamvi),
        uutien: normalizeText(row.uutien),
        phuhopcho: normalizeText(row.phuhopcho),
        mota: normalizeText(row.mota),
      }));
  }

  async function ensureBootstrapData(sectionRows, serviceRows) {
    let inserted = false;

    if (!sectionRows.some((row) => String(row.section_key || "") === "hero")) {
      await insertTable(SECTION_TABLE, makeSectionPayload("hero", bootstrap.hero || {}));
      inserted = true;
    }

    if (!sectionRows.some((row) => String(row.section_key || "") === "services_section")) {
      await insertTable(
        SECTION_TABLE,
        makeSectionPayload("services_section", bootstrap.services_section || {}),
      );
      inserted = true;
    }

    if (!serviceRows.length && Array.isArray(bootstrap.services) && bootstrap.services.length) {
      for (const service of bootstrap.services) {
        await insertTable(SERVICE_TABLE, {
          page_slug: PAGE_SLUG,
          service_key: normalizeText(service.service_key || slugify(service.ten || "")),
          is_visible: String(service.is_visible) === "0" ? "0" : "1",
          ten: normalizeText(service.ten),
          bieutuong: normalizeText(service.bieutuong),
          khauhieu: normalizeText(service.khauhieu),
          phamvi: normalizeText(service.phamvi),
          uutien: normalizeText(service.uutien),
          phuhopcho: normalizeText(service.phuhopcho),
          mota: normalizeText(service.mota),
          updated_at: nowIso(),
        });
      }
      inserted = true;
    }

    return inserted;
  }

  async function loadContent(options = {}) {
    const silent = options.silent === true;
    if (!silent) {
      showRuntimeMessage("success", "Đang tải dữ liệu nội dung dịch vụ...", 0);
    }

    const sectionRows = await listTableSafe(
      SECTION_TABLE,
      [{ field: "page_slug", operator: "=", value: PAGE_SLUG }],
      { id: "asc" },
      50,
    );
    const serviceRows = await listTableSafe(
      SERVICE_TABLE,
      [{ field: "page_slug", operator: "=", value: PAGE_SLUG }],
      { id: "asc" },
      200,
    );

    const inserted = await ensureBootstrapData(sectionRows, serviceRows);
    const nextSectionRows = inserted
      ? await listTableSafe(
          SECTION_TABLE,
          [{ field: "page_slug", operator: "=", value: PAGE_SLUG }],
          { id: "asc" },
          50,
        )
      : sectionRows;
    const nextServiceRows = inserted
      ? await listTableSafe(
          SERVICE_TABLE,
          [{ field: "page_slug", operator: "=", value: PAGE_SLUG }],
          { id: "asc" },
          200,
        )
      : serviceRows;

    syncState(nextSectionRows, nextServiceRows);
    setHeroFormValues();
    setServicesSectionFormValues();
    renderServicesTable();

    if (inserted) {
      try {
        await exportPublicJson();
        showRuntimeMessage("success", "Đã bootstrap dữ liệu nội dung dịch vụ và export JSON public.");
      } catch (error) {
        showRuntimeMessage(
          "warning",
          `Đã bootstrap dữ liệu KRUD nhưng export JSON public thất bại: ${error.message}`,
          0,
        );
      }
      return;
    }

    if (!silent) {
      hideRuntimeMessage();
    }
  }

  async function runKrudThenExport(actionLabel, krudOperation, afterSuccess = null) {
    setBusy(true);
    try {
      try {
        await krudOperation();
      } catch (error) {
        showRuntimeMessage("error", `${actionLabel} thất bại ở bước KRUD: ${error.message}`, 0);
        return;
      }

      await loadContent({ silent: true });

      try {
        await exportPublicJson();
        showRuntimeMessage("success", `${actionLabel} thành công. JSON public đã được cập nhật.`);
      } catch (error) {
        showRuntimeMessage(
          "warning",
          `${actionLabel} đã lưu KRUD nhưng export JSON public thất bại: ${error.message}`,
          0,
        );
      }

      if (typeof afterSuccess === "function") {
        afterSuccess();
      }
    } finally {
      setBusy(false);
    }
  }

  function readHeroForm() {
    return {
      badge_label: refs.heroForm.elements.namedItem("badge_label").value,
      title: refs.heroForm.elements.namedItem("title").value,
      description: refs.heroForm.elements.namedItem("description").value,
    };
  }

  function readServicesSectionForm() {
    return {
      title: refs.sectionForm.elements.namedItem("title").value,
      description: refs.sectionForm.elements.namedItem("description").value,
    };
  }

  function readServiceForm() {
    return {
      bieutuong: refs.serviceForm.elements.namedItem("bieutuong").value,
      is_visible: refs.serviceForm.elements.namedItem("is_visible").value,
      ten: refs.serviceForm.elements.namedItem("ten").value,
      khauhieu: refs.serviceForm.elements.namedItem("khauhieu").value,
      phamvi: refs.serviceForm.elements.namedItem("phamvi").value,
      uutien: refs.serviceForm.elements.namedItem("uutien").value,
      phuhopcho: refs.serviceForm.elements.namedItem("phuhopcho").value,
      mota: refs.serviceForm.elements.namedItem("mota").value,
    };
  }

  async function saveHero(event) {
    event.preventDefault();
    const payload = makeSectionPayload("hero", readHeroForm());
    await runKrudThenExport("Lưu Hero", async () => {
      if (state.heroId > 0) {
        await updateTable(SECTION_TABLE, state.heroId, payload);
      } else {
        await insertTable(SECTION_TABLE, payload);
      }
    });
  }

  async function saveServicesSection(event) {
    event.preventDefault();
    const payload = makeSectionPayload("services_section", readServicesSectionForm());
    await runKrudThenExport("Lưu khối dịch vụ", async () => {
      if (state.servicesSectionId > 0) {
        await updateTable(SECTION_TABLE, state.servicesSectionId, payload);
      } else {
        await insertTable(SECTION_TABLE, payload);
      }
    });
  }

  async function saveService(event) {
    event.preventDefault();
    const existing =
      state.services.find((service) => Number(service.id || 0) === Number(state.editingServiceId || 0)) || null;
    const payload = makeServicePayload(readServiceForm(), existing);
    await runKrudThenExport(
      existing ? `Lưu dịch vụ ${existing.ten}` : "Thêm dịch vụ",
      async () => {
        if (existing) {
          await updateTable(SERVICE_TABLE, existing.id, payload);
        } else {
          await insertTable(SERVICE_TABLE, payload);
        }
      },
      () => setServiceForm(),
    );
  }

  async function toggleService(service) {
    const payload = makeServicePayload(
      {
        ...service,
        is_visible: isVisible(service.is_visible) ? "0" : "1",
      },
      service,
    );
    await runKrudThenExport(
      isVisible(service.is_visible) ? `Ẩn dịch vụ ${service.ten}` : `Hiện dịch vụ ${service.ten}`,
      async () => {
        await updateTable(SERVICE_TABLE, service.id, payload);
      },
    );
  }

  async function removeService(service) {
    if (!window.confirm(`Xóa dịch vụ "${service.ten}"?`)) {
      return;
    }

    await runKrudThenExport(
      `Xóa dịch vụ ${service.ten}`,
      async () => {
        await deleteTable(SERVICE_TABLE, service.id);
      },
      () => {
        if (Number(state.editingServiceId || 0) === Number(service.id || 0)) {
          setServiceForm();
        }
      },
    );
  }

  function findServiceFromEvent(event) {
    const row = event.target.closest("[data-service-id]");
    if (!row) return null;
    const id = Number(row.dataset.serviceId || 0);
    return state.services.find((service) => Number(service.id || 0) === id) || null;
  }

  function bindEvents() {
    refs.heroForm.addEventListener("submit", (event) => {
      saveHero(event).catch((error) => showRuntimeMessage("error", error.message || "Không lưu được Hero.", 0));
    });

    refs.sectionForm.addEventListener("submit", (event) => {
      saveServicesSection(event).catch((error) =>
        showRuntimeMessage("error", error.message || "Không lưu được khối dịch vụ.", 0),
      );
    });

    refs.serviceForm.addEventListener("submit", (event) => {
      saveService(event).catch((error) =>
        showRuntimeMessage("error", error.message || "Không lưu được dịch vụ.", 0),
      );
    });

    refs.createBtn.addEventListener("click", () => {
      setServiceForm();
      refs.serviceForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    refs.resetBtn.addEventListener("click", () => setServiceForm());

    refs.tableBody.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-service-action]");
      if (!actionButton) return;
      const service = findServiceFromEvent(event);
      if (!service) return;

      if (actionButton.dataset.serviceAction === "edit") {
        setServiceForm(service);
        refs.serviceForm.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (actionButton.dataset.serviceAction === "toggle") {
        toggleService(service).catch((error) =>
          showRuntimeMessage("error", error.message || "Không cập nhật được trạng thái dịch vụ.", 0),
        );
        return;
      }

      if (actionButton.dataset.serviceAction === "delete") {
        removeService(service).catch((error) =>
          showRuntimeMessage("error", error.message || "Không xóa được dịch vụ.", 0),
        );
      }
    });
  }

  async function init() {
    if (!refs.heroForm || !refs.sectionForm || !refs.serviceForm || !refs.tableBody) {
      console.error("Thiếu DOM bắt buộc cho trang quản lý nội dung dịch vụ.");
      return;
    }

    try {
      getRequiredFn("getListFn", "list");
      getRequiredFn("getInsertFn", "insert");
      getRequiredFn("getUpdateFn", "update");
      getRequiredFn("getDeleteFn", "delete");
    } catch (error) {
      showRuntimeMessage("error", error.message || "Không tải được KRUD helper.", 0);
      return;
    }

    bindEvents();
    setServiceForm();

    try {
      await loadContent();
    } catch (error) {
      showRuntimeMessage("error", error.message || "Không tải được dữ liệu nội dung dịch vụ.", 0);
      refs.tableBody.innerHTML =
        '<tr><td colspan="3" class="users-empty">Không tải được dữ liệu nội dung dịch vụ.</td></tr>';
    }
  }

  init();
})(window, document);
