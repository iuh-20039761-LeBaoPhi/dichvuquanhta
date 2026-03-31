(function (window, document) {
  if (window.__fastGoFormsInitDone) return;
  window.__fastGoFormsInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;
  // Hai module này được tách ra để main-forms chỉ còn vai trò điều phối UI chính.
  const bookingPricingModule = window.FastGoBookingPricing || null;
  const bookingMapModule = window.FastGoBookingMap || null;
  const bookingWizardModule = window.FastGoBookingWizard || null;
  const surveyMapModule = window.FastGoSurveyMap || null;
  const requestHistoryModule = window.FastGoFormRequestHistory || null;
  const formSummariesModule = window.FastGoFormSummaries || null;
  const formMediaModule = window.FastGoFormMedia || null;
  const surveyFormsModule = window.FastGoSurveyForms || null;
  const bookingFormsModule = window.FastGoBookingForms || null;

  const partialPaths = {
    "khao-sat": core.toPublicUrl("assets/partials/bieu-mau/form-khao-sat.html"),
    "dat-lich": core.toPublicUrl("assets/partials/bieu-mau/form-dat-lich.html"),
  };

  const SERVICE_ALIAS_MAP = {
    chuyen_nha: "chuyen_nha",
    "chuyen-nha": "chuyen_nha",
    moving_house: "chuyen_nha",
    chuyen_van_phong: "chuyen_van_phong",
    "chuyen-van-phong": "chuyen_van_phong",
    moving_office: "chuyen_van_phong",
    chuyen_kho_bai: "chuyen_kho_bai",
    "chuyen-kho-bai": "chuyen_kho_bai",
    moving_warehouse: "chuyen_kho_bai",
  };

  const SERVICE_PRICING_ID_MAP = {
    chuyen_nha: "moving_house",
    chuyen_van_phong: "moving_office",
    chuyen_kho_bai: "moving_warehouse",
  };

  const PRICING_DATA_SERVICE_ID_MAP = {
    chuyen_nha: "moving_house",
    chuyen_van_phong: "moving_office",
    chuyen_kho_bai: "moving_warehouse",
    moving_house: "moving_house",
    moving_office: "moving_office",
    moving_warehouse: "moving_warehouse",
  };

  const bookingVehicleOptions = {
    chuyen_nha: {
      defaultValue: "xe_van_500kg",
      options: [
        { value: "xe_van_500kg", label: "Xe Van 500kg" },
        { value: "xe_tai_1_5_tan", label: "Xe Tải 1.5 Tấn" },
        { value: "xe_tai_2_5_tan", label: "Xe Tải 2.5 Tấn" },
      ],
    },
    chuyen_van_phong: {
      defaultValue: "xe_van_500kg",
      options: [
        { value: "xe_van_500kg", label: "Xe Van 500kg (VP)" },
        { value: "xe_tai_1_5_tan", label: "Xe Tải 1.5 Tấn (VP)" },
        { value: "xe_tai_2_5_tan", label: "Xe Tải 2.5 Tấn (VP)" },
      ],
    },
    chuyen_kho_bai: {
      defaultValue: "xe_tai_1_5_tan",
      options: [
        { value: "xe_tai_1_5_tan", label: "Xe Tải 1.5 Tấn (Kho)" },
        { value: "xe_tai_2_5_tan", label: "Xe Tải 2.5 Tấn (Kho)" },
        { value: "xe_tai_5_tan", label: "Xe Tải 5 Tấn (Kho)" },
      ],
    },
  };

  let pricingReferencePromise = null;
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function loadPartial(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return xhr.responseText.trim();
      }
    } catch (error) {
      console.error("Cannot load form partial:", url, error);
    }
    return "";
  }

  function loadPricingReference() {
    if (!pricingReferencePromise) {
      pricingReferencePromise = fetch(
        core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json"),
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Cannot load pricing reference: ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          console.error("Cannot load pricing reference:", error);
          return [];
        });
    }

    return pricingReferencePromise;
  }

  function normalizeService(rawValue) {
    const value = String(rawValue || "").trim().toLowerCase();
    return SERVICE_ALIAS_MAP[value] || "";
  }

  function getPricingServiceId(rawValue) {
    const normalized = normalizeService(rawValue);
    return SERVICE_PRICING_ID_MAP[normalized] || "";
  }

  function normalizePricingDataServiceId(rawValue) {
    const value = String(rawValue || "").trim().toLowerCase();
    return PRICING_DATA_SERVICE_ID_MAP[value] || "";
  }

  function getSelectedLabel(select) {
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    return option ? String(option.textContent || "").trim() : "";
  }

  function getCheckedLabel(scope, selector) {
    const input = scope.querySelector(`${selector}:checked`);
    if (!input) return "";
    const label = input.closest("label");
    return label ? String(label.textContent || "").trim() : "";
  }

  function getCheckedLabels(scope, selector) {
    return Array.from(scope.querySelectorAll(`${selector}:checked`))
      .map((input) => {
        const label = input.closest("label");
        return label ? String(label.textContent || "").trim() : "";
      })
      .filter(Boolean);
  }

  function queryFirst(scope, selectors) {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorList) {
      const node = scope.querySelector(selector);
      if (node) return node;
    }

    return null;
  }

  function getCheckedLabelsFromSelectors(scope, selectors) {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    const labels = [];
    const seen = new Set();

    selectorList.forEach((selector) => {
      getCheckedLabels(scope, selector).forEach((label) => {
        if (seen.has(label)) return;
        seen.add(label);
        labels.push(label);
      });
    });

    return labels;
  }

  function countChecked(scope, selector) {
    return scope.querySelectorAll(`${selector}:checked`).length;
  }

  function countFiles(scope, selector) {
    return Array.from(scope.querySelectorAll(selector)).reduce((total, input) => {
      return total + (input.files ? input.files.length : 0);
    }, 0);
  }

  function mapBookingPricingTimeSlot(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    if (
      value === "buoi_toi" ||
      value === "ban_dem" ||
      value === "can_xac_nhan" ||
      value === "binh_thuong" ||
      value === "cuoi_tuan"
    ) {
      return value;
    }
    if (value === "toi") return "buoi_toi";
    if (value === "dem") return "ban_dem";
    if (value === "linh_dong") return "can_xac_nhan";
    return "binh_thuong";
  }

  function getBookingPricingTimeLabel(rawValue) {
    const mapped = mapBookingPricingTimeSlot(rawValue);
    if (!mapped) return "Chưa chọn";
    if (mapped === "buoi_toi") return "Buổi tối";
    if (mapped === "ban_dem") return "Ban đêm";
    if (mapped === "cuoi_tuan") return "Cuối tuần";
    if (mapped === "can_xac_nhan") return "Chờ xác nhận";
    return "Ban ngày";
  }

  function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  function updateSpecialItemField(scope) {
    const trigger = scope.querySelector("[data-bat-khac]");
    const target = scope.querySelector("[data-khoi-hang-muc-khac]");
    const input = target ? target.querySelector("input") : null;
    if (!trigger || !target) return;

    const shouldShow = !!trigger.checked;
    target.hidden = !shouldShow;
    target.classList.toggle("is-hidden", !shouldShow);

    if (!shouldShow && input) {
      input.value = "";
    }
  }

  function getFormSummaryDeps() {
    return {
      core,
      queryFirst,
      getSelectedLabel,
      getCheckedLabel,
      getCheckedLabels,
      getCheckedLabelsFromSelectors,
      countChecked,
      countFiles,
      normalizeService,
      calculateDistanceKm,
      formatSurveySchedule,
      formatBookingSchedule,
      getBookingPricingTimeLabel,
      getBookingVehicleLabel,
    };
  }

  function getBookingPricingDeps() {
    return {
      core,
      loadPricingReference,
      getPricingServiceId,
      normalizePricingDataServiceId,
      normalizeService,
      resolveBookingVehicleEntry,
      getBookingDistanceKmValue,
      getBookingNumericValue,
      isBookingChecked,
      getCheckedLabelsFromSelectors,
      getBookingPricingTimeLabel,
    };
  }

  function getBookingMapDeps() {
    return {
      renderFormSummaries,
      renderBookingPricing,
      getSelectedLabel,
      calculateDistanceKm,
    };
  }

  function clearFieldErrorState(input) {
    if (!input || !input.classList.contains("input-error")) return;

    input.classList.remove("input-error");
    input.removeAttribute("aria-invalid");

    const errorId = input.getAttribute("data-error-id");
    if (errorId) {
      const describedBy = String(input.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => token !== errorId);
      if (describedBy.length) {
        input.setAttribute("aria-describedby", describedBy.join(" "));
      } else {
        input.removeAttribute("aria-describedby");
      }
      input.removeAttribute("data-error-id");
    }

    const group = input.closest(".nhom-truong") || input.parentElement;
    const msg = group?.querySelector(".field-error-msg");
    if (msg) msg.remove();
  }

  function syncBookingUi(scope) {
    syncPhoneFieldValidity(scope);
    syncBookingPricingTimeSlot(scope);
    renderBookingMapPreview(scope);
    renderFormSummaries(scope);
    renderBookingMediaReview(scope);
    renderBookingPricing(scope);
    refreshBookingWeather(scope);
  }

  function syncSurveyUi(scope, options = {}) {
    syncPhoneFieldValidity(scope);
    if (options.includeSpecialField) {
      updateSpecialItemField(scope);
    }
    renderSurveyMapPreview(scope);
    renderFormSummaries(scope);
  }

  function getBookingWizardDeps() {
    return {
      isVisibleFormField,
      isValidVietnamesePhone,
      renderFormSummaries,
      renderBookingMediaReview,
      renderBookingPricing,
    };
  }

  function getSurveyFormDeps() {
    return {
      syncSurveyUi,
      syncPhoneFieldValidity,
      updateSpecialItemField,
      initSurveyMap,
    };
  }

  function getBookingFormDeps() {
    return {
      clearFieldErrorState,
      syncBookingUi,
      initBookingMap,
      syncBookingExecutionDateLimits,
      syncBookingVehicleOptions,
      initBookingStepWizard,
    };
  }

  // Wrapper cho module map của form khảo sát.
  function renderSurveyMapPreview(scope) {
    if (!surveyMapModule?.renderSurveyMapPreview) return;
    return surveyMapModule.renderSurveyMapPreview(scope);
  }

  // Wrapper cho module map/forecast của form đặt lịch.
  function syncBookingExecutionDateLimits(scope) {
    if (!bookingMapModule?.syncBookingExecutionDateLimits) return;
    return bookingMapModule.syncBookingExecutionDateLimits(scope);
  }

  // Wrapper cho module map/forecast của form đặt lịch.
  async function refreshBookingWeather(scope) {
    if (!bookingMapModule?.refreshBookingWeather) return;
    return bookingMapModule.refreshBookingWeather(scope, {
      renderFormSummaries,
      renderBookingPricing,
      getSelectedLabel,
    });
  }

  // Wrapper cho module map của form khảo sát.
  function initSurveyMap(scope) {
    if (!surveyMapModule?.initSurveyMap) return;
    return surveyMapModule.initSurveyMap(scope, {
      renderFormSummaries,
    });
  }

  // Wrapper cho module map của form đặt lịch.
  function renderBookingMapPreview(scope) {
    if (!bookingMapModule?.renderBookingMapPreview) return;
    return bookingMapModule.renderBookingMapPreview(scope);
  }

  // Wrapper cho module map của form đặt lịch.
  function initBookingMap(scope) {
    if (!bookingMapModule?.initBookingMap) return;
    return bookingMapModule.initBookingMap(scope, getBookingMapDeps());
  }

  function formatDateTimeSummary(dateValue, timeValue, timeLabel) {
    const rawDateText = String(dateValue || "").trim();
    const dateText = /^\d{4}-\d{2}-\d{2}$/.test(rawDateText)
      ? rawDateText.split("-").reverse().join("-")
      : rawDateText;
    const hasTime = !!String(timeValue || "").trim();
    const timeText = String(timeLabel || "").trim();

    if (dateText && hasTime) {
      return `${dateText} • ${timeText}`;
    }

    if (dateText) return dateText;
    if (hasTime) return timeText;
    return "Chưa chọn";
  }

  function formatSurveySchedule(scope) {
    const dateInput = scope.querySelector("#ngay-khao-sat");
    const timeSelect = scope.querySelector("#khung-gio-khao-sat");
    const dateValue = String(dateInput?.value || "").trim();
    const timeLabel = getSelectedLabel(timeSelect);
    return formatDateTimeSummary(dateValue, timeSelect?.value, timeLabel);
  }

  function formatBookingSchedule(scope) {
    const dateInput = scope.querySelector("#ngay-thuc-hien-dat-lich");
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const dateValue = String(dateInput?.value || "").trim();
    const timeLabel = getSelectedLabel(timeSelect);
    return formatDateTimeSummary(dateValue, timeSelect?.value, timeLabel);
  }

  function syncBookingVehicleOptions(scope, serviceValue) {
    const select = scope.querySelector("#loai-xe-dat-lich");
    if (!select) return;

    const normalized = normalizeService(serviceValue);
    const config = bookingVehicleOptions[normalized];
    const previousValue = String(select.value || "").trim();

    if (!config) {
      select.innerHTML = '<option value="">Chọn dịch vụ để chọn loại xe</option>';
      select.value = "";
      return;
    }

    select.innerHTML = [
      '<option value="">Chọn loại xe phù hợp</option>',
      ...config.options.map(
        (item) => `<option value="${item.value}">${item.label}</option>`,
      ),
    ].join("");

    if (config.options.some((item) => item.value === previousValue)) {
      select.value = previousValue;
    } else {
      select.value = config.defaultValue;
    }
  }

  function getBookingVehicleConfig(serviceValue) {
    return bookingVehicleOptions[normalizeService(serviceValue)] || null;
  }

  function resolveBookingVehicleEntry(scope, serviceValue, vehicleEntries) {
    const select = queryFirst(scope, [
      "#loai-xe-dat-lich",
      "select[name='loai_xe']",
      "[data-truong-loai-xe-dat-lich]",
    ]);
    const entries = Array.isArray(vehicleEntries) ? vehicleEntries : [];
    const currentValue = String(select?.value || "").trim();
    const currentEntry = entries.find(
      (item) => String(item?.slug || "").trim() === currentValue,
    );

    if (currentEntry) {
      return currentEntry;
    }

    const config = getBookingVehicleConfig(serviceValue);
    const fallbackValue =
      config?.defaultValue ||
      String(entries[0]?.slug || "").trim();
    const fallbackEntry = entries.find(
      (item) => String(item?.slug || "").trim() === fallbackValue,
    );

    if (select && fallbackValue) {
      const optionExists = Array.from(select.options).some(
        (option) => String(option.value || "").trim() === fallbackValue,
      );

      if (!optionExists && config) {
        syncBookingVehicleOptions(scope, serviceValue);
      }

      const hasResolvedOption = Array.from(select.options).some(
        (option) => String(option.value || "").trim() === fallbackValue,
      );

      if (!hasResolvedOption) {
        const option = document.createElement("option");
        option.value = fallbackValue;
        option.textContent =
          config?.options.find((item) => item.value === fallbackValue)?.label ||
          fallbackEntry?.ten_hien_thi ||
          fallbackValue;
        select.appendChild(option);
      }

      select.value = fallbackValue;
    }

    return fallbackEntry || null;
  }

  function getBookingVehicleLabel(scope, serviceValue) {
    const select = queryFirst(scope, [
      "#loai-xe-dat-lich",
      "select[name='loai_xe']",
      "[data-truong-loai-xe-dat-lich]",
    ]);
    const selectedLabel = getSelectedLabel(select);
    if (selectedLabel) return selectedLabel;

    const config = getBookingVehicleConfig(serviceValue);
    return (
      config?.options.find((item) => item.value === config.defaultValue)?.label ||
      "Chưa chọn"
    );
  }

  function syncBookingPricingTimeSlot(scope) {
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const hiddenInput = scope.querySelector("[data-khung-gio-tinh-gia]");
    if (!timeSelect || !hiddenInput) return;

    hiddenInput.value = mapBookingPricingTimeSlot(timeSelect.value);
  }

  function renderBookingMediaReview(scope) {
    if (!formMediaModule?.renderBookingMediaReview) return;
    return formMediaModule.renderBookingMediaReview(core, scope);
  }

  function parseBookingNumber(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return 0;

    let cleaned = raw.replace(/\s+/g, "").replace(/[^\d.,-]/g, "");
    if (!cleaned) return 0;

    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/,/g, ".");
    } else {
      const dotMatches = cleaned.match(/\./g) || [];
      if (dotMatches.length > 1) {
        cleaned = cleaned.replace(/\./g, "");
      }
    }

    const value = Number(cleaned);
    return Number.isFinite(value) ? value : 0;
  }

  function getBookingNumericValue(scope, selector) {
    const value = parseBookingNumber(scope.querySelector(selector)?.value || "");
    return value > 0 ? value : 0;
  }

  function isBookingChecked(scope, selector) {
    return !!scope.querySelector(`${selector}:checked`);
  }

  function getBookingDistanceKmValue(scope) {
    const fromLat = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_di_lat']")?.value || 0,
    );
    const fromLng = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_di_lng']")?.value || 0,
    );
    const toLat = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_den_lat']")?.value || 0,
    );
    const toLng = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_den_lng']")?.value || 0,
    );

    if (!fromLat || !fromLng || !toLat || !toLng) return 0;
    return calculateDistanceKm(fromLat, fromLng, toLat, toLng);
  }

  // Wrapper mỏng để giữ nguyên các điểm gọi cũ trong file này.
  async function renderBookingPricing(scope) {
    if (!bookingPricingModule?.render) return;
    return bookingPricingModule.render(scope, getBookingPricingDeps());
  }

  function renderSurveySummary(scope) {
    if (!formSummariesModule?.renderSurveySummary) return;
    return formSummariesModule.renderSurveySummary(scope, getFormSummaryDeps());
  }

  function renderBookingSummary(scope) {
    if (!formSummariesModule?.renderBookingSummary) return;
    return formSummariesModule.renderBookingSummary(scope, getFormSummaryDeps());
  }

  function renderFormSummaries(scope) {
    renderSurveySummary(scope);
    renderBookingSummary(scope);
  }

  function resetFieldValue(field) {
    field.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.matches("input[type='checkbox'], input[type='radio']")) {
        input.checked = false;
        return;
      }

      if (input.tagName === "SELECT") {
        input.selectedIndex = 0;
        return;
      }

      input.value = "";
    });
  }

  function buildServiceContextHref(baseHref, serviceValue) {
    const href = String(baseHref || "").trim();
    if (!href) return "";

    const [beforeHash, hashPart] = href.split("#");
    const [pathPart, queryPart] = beforeHash.split("?");
    const params = new URLSearchParams(queryPart || "");
    const normalized = normalizeService(serviceValue);

    if (normalized) {
      params.set("dich-vu", normalized);
    } else {
      params.delete("dich-vu");
    }

    const query = params.toString();
    return `${pathPart}${query ? `?${query}` : ""}${hashPart ? `#${hashPart}` : ""}`;
  }

  function syncServiceContextLinks(serviceValue) {
    document.querySelectorAll("[data-giu-dich-vu]").forEach((link) => {
      const baseHref =
        link.getAttribute("data-base-href") ||
        link.getAttribute("data-giu-dich-vu") ||
        link.getAttribute("href") ||
        "";
      if (!baseHref) return;

      if (!link.hasAttribute("data-base-href")) {
        link.setAttribute("data-base-href", baseHref);
      }

      link.setAttribute("href", buildServiceContextHref(baseHref, serviceValue));
    });
  }

  function isVisibleFormField(field) {
    return !field.disabled && !field.hidden && !field.closest("[hidden]");
  }

  function normalizePhoneValue(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function isValidVietnamesePhone(value) {
    return /^(0|\+84)[0-9]{9}$/.test(normalizePhoneValue(value));
  }

  function syncPhoneFieldValidity(scope) {
    scope.querySelectorAll("input[type='tel']").forEach((field) => {
      if (!isVisibleFormField(field)) {
        field.setCustomValidity("");
        return;
      }

      const value = String(field.value || "").trim();
      if (!value) {
        field.setCustomValidity("");
        return;
      }

      field.setCustomValidity(
        isValidVietnamesePhone(value)
          ? ""
          : "Số điện thoại không hợp lệ (cần đủ 10 số).",
      );
    });
  }

  // Đồng bộ toàn bộ UI phụ thuộc vào loại dịch vụ đang chọn: field, label, giá và summary.
  function applyServiceState(scope, serviceValue) {
    const normalized = normalizeService(serviceValue);
    const emptyPanel = scope.querySelector("[data-khoi-mac-dinh]");
    const companyLabel = scope.querySelector("[data-nhan-cong-ty-dat-lich]");

    if (companyLabel) {
      companyLabel.textContent =
        normalized === "chuyen_van_phong"
          ? "Tên công ty"
          : normalized === "chuyen_kho_bai"
            ? "Tên kho hoặc đơn vị vận hành"
            : "Tên công ty hoặc đơn vị";
    }

    scope.querySelectorAll("[data-khoi-dich-vu]").forEach((panel) => {
      const shouldShow =
        normalized && panel.getAttribute("data-khoi-dich-vu") === normalized;
      panel.hidden = !shouldShow;
      panel.classList.toggle("is-hidden", !shouldShow);
    });

    if (emptyPanel) {
      emptyPanel.hidden = !!normalized;
    }

    scope.querySelectorAll("[data-hien-theo-dich-vu]").forEach((field) => {
      const allowed = String(
        field.getAttribute("data-hien-theo-dich-vu") || "",
      )
        .split(",")
        .map((value) => normalizeService(value))
        .filter(Boolean);
      const shouldShow = !!normalized && allowed.includes(normalized);

      field.hidden = !shouldShow;
      field.classList.toggle("is-hidden", !shouldShow);

      if (!shouldShow) {
        resetFieldValue(field);
      }
    });

    syncBookingVehicleOptions(scope, normalized);
    syncBookingPricingTimeSlot(scope);
    renderFormSummaries(scope);
    renderBookingPricing(scope);
    syncServiceContextLinks(normalized);

    if (scope.__bookingMapState?.map) {
      const refreshMapLayout = function () {
        scope.__bookingMapState.map.invalidateSize();
        scope.__bookingMapState.updateMapBounds?.();
      };

      refreshMapLayout();
      window.requestAnimationFrame(refreshMapLayout);
      window.setTimeout(refreshMapLayout, 120);
    }
  }

  function initServiceSelect(scope) {
    const select = scope.querySelector("[data-truong-dich-vu]");
    if (!select) return;

    const params = new URLSearchParams(window.location.search);
    const initialValue = normalizeService(params.get("dich-vu"));
    if (initialValue) {
      select.value = initialValue;
    }

    syncServiceContextLinks(select.value);
    applyServiceState(scope, select.value);
    select.addEventListener("change", function () {
      applyServiceState(scope, select.value);
    });
  }

  function initFileInputs(scope) {
    if (!formMediaModule?.initFileInputs) return;
    return formMediaModule.initFileInputs(core, scope);
  }

  function initInfoToggles(scope) {
    const detailsList = Array.from(scope.querySelectorAll(".goi-y-thong-tin"));
    if (!detailsList.length) return;

    detailsList.forEach((details) => {
      details.addEventListener("toggle", function () {
        if (!details.open) return;

        detailsList.forEach((other) => {
          if (other !== details) {
            other.open = false;
          }
        });
      });
    });
  }

  function initSurveyFormUi(scope) {
    if (!surveyFormsModule?.init) return;
    return surveyFormsModule.init(scope, getSurveyFormDeps());
  }

  function initBookingStepWizard(scope) {
    if (!bookingWizardModule?.init) return;
    return bookingWizardModule.init(scope, getBookingWizardDeps());
  }

  function initBookingFormUi(scope) {
    if (!bookingFormsModule?.init) return;
    return bookingFormsModule.init(scope, getBookingFormDeps());
  }

  // Chặn submit thật ở bản demo hiện tại và hiển thị trạng thái hoàn thiện của biểu mẫu.
  function initFormNotice(scope, formType) {
    const form = scope.querySelector("form[data-loai-bieu-mau]");
    const notice = scope.querySelector("[data-thong-bao-bieu-mau]");
    if (!form || !notice) return;
    const submitButton = form.querySelector("[data-nut-gui-bieu-mau]") || form.querySelector("button[type='submit']");
    const defaultSubmitLabel = String(submitButton?.textContent || "").trim() || "Gửi";

    function syncSubmitState(isSubmitting, label) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = label || defaultSubmitLabel;
      submitButton.setAttribute("aria-disabled", isSubmitting ? "true" : "false");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      syncPhoneFieldValidity(scope);
      if (!form.reportValidity()) return;

      syncSubmitState(true, "Đang ghi nhận...");
      notice.hidden = false;
      notice.classList.remove("is-success", "is-error");
      notice.classList.add("is-pending");
      notice.textContent =
        formType === "khao-sat"
          ? "Hệ thống đang rà lại dữ liệu khảo sát bạn vừa nhập."
          : "Hệ thống đang rà lại thông tin đặt lịch và các hạng mục bạn vừa chọn.";
      notice.scrollIntoView({ behavior: "smooth", block: "nearest" });

      window.setTimeout(async function () {
        const portalStore = window.FastGoCustomerPortalStore || null;
        const historyPayload = requestHistoryModule?.buildPayload
          ? requestHistoryModule.buildPayload({ scope, formType, portalStore })
          : null;

        if (historyPayload && requestHistoryModule?.persistPayload) {
          await requestHistoryModule.persistPayload(historyPayload, portalStore);
        }

        notice.classList.remove("is-pending", "is-error");
        notice.classList.add("is-success");
        notice.textContent =
          formType === "khao-sat"
            ? "Biểu mẫu khảo sát demo đã được ghi nhận. Chức năng gửi yêu cầu chính thức đang được hoàn thiện, nhưng nội dung bạn vừa nhập đã sẵn sàng để đội ngũ dùng tiếp."
            : "Biểu mẫu đặt lịch demo đã được ghi nhận. Giá tạm tính và các thông tin điều phối đang bám theo dữ liệu bạn vừa nhập; chức năng gửi yêu cầu chính thức đang được hoàn thiện.";
        syncSubmitState(false, defaultSubmitLabel);
      }, 900);
    });
  }

  function initFormHost(host) {
    const formType = host.getAttribute("data-bieu-mau-trang");
    const partialPath = partialPaths[formType];
    if (!formType || !partialPath) return;

    const html = loadPartial(partialPath);
    if (!html) return;

    host.innerHTML = html;
    initInfoToggles(host);
    initServiceSelect(host);
    initFileInputs(host);
    initSurveyFormUi(host);
    initBookingFormUi(host);
    initFormNotice(host, formType);
  }

  onReady(function () {
    document.querySelectorAll("[data-bieu-mau-trang]").forEach(initFormHost);
  });
})(window, document);
