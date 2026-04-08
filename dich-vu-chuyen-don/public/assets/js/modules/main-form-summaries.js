(function (window) {
  if (window.FastGoFormSummaries) return;

  // Gom toàn bộ logic format và render phần tóm tắt để main-forms bớt ôm việc.
  let formLogicPromise = null;

  function loadFormLogic(core) {
    if (!formLogicPromise) {
      formLogicPromise = fetch(core.toPublicUrl("assets/js/data/logic-form-dat-lich.json"))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Cannot load form logic: ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          console.error("Cannot load form logic for summaries:", error);
          return { summary_config: {} };
        });
    }

    return formLogicPromise;
  }

  function joinSurveyParts(parts, fallback) {
    const filtered = parts
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    return filtered.length ? filtered.join(" • ") : fallback;
  }

  function applyValueTransform(value, transform) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (transform === "lowercase") return text.toLowerCase();
    return text;
  }

  function readSummaryPartValue(scope, item, deps) {
    const { getSelectedLabel, getCheckedLabel, getCheckedLabels } = deps;
    const kind = String(item?.kind || "").trim();
    const selector = String(item?.selector || "").trim();
    if (!kind || !selector) return "";

    if (kind === "selected_label") {
      return getSelectedLabel(scope.querySelector(selector));
    }

    if (kind === "checked_label") {
      return getCheckedLabel(scope, selector);
    }

    if (kind === "checkbox_labels") {
      const labels = getCheckedLabels(scope, selector);
      const limit = Number(item?.limit || 0);
      return (limit > 0 ? labels.slice(0, limit) : labels).join(", ");
    }

    return String(scope.querySelector(selector)?.value || "").trim();
  }

  function formatConfiguredSummaryParts(scope, items, deps, fallback = "Chưa có") {
    const parts = (Array.isArray(items) ? items : [])
      .map((item) => {
        const rawValue = readSummaryPartValue(scope, item, deps);
        const value = applyValueTransform(rawValue, item?.transform);
        if (!value) return "";
        return `${String(item?.prefix || "")}${value}${String(item?.suffix || "")}`;
      })
      .filter(Boolean);

    return joinSurveyParts(parts, fallback);
  }

  function formatBookingDeploymentDetail(scope, serviceValue, deps, summaryConfig) {
    const normalized = deps.normalizeService(serviceValue);
    const items = summaryConfig?.deployment_detail?.[normalized] || [];
    return formatConfiguredSummaryParts(scope, items, deps);
  }

  function formatBookingServiceDetail(scope, serviceValue, deps, summaryConfig) {
    const normalized = deps.normalizeService(serviceValue);
    const items = summaryConfig?.booking_service_detail?.[normalized] || [];
    return formatConfiguredSummaryParts(scope, items, deps);
  }

  function formatBookingDistance(scope, deps) {
    const { calculateDistanceKm } = deps;
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

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return "Chưa xác định";
    }

    const km = calculateDistanceKm(fromLat, fromLng, toLat, toLng);
    return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
  }

  function formatBookingConditionDetail(scope, deps) {
    const { getCheckedLabelsFromSelectors } = deps;
    const labels = getCheckedLabelsFromSelectors(scope, [
      "[data-nhom-chip='dieu_kien_dat_lich'] input[type='checkbox']",
      "[data-nhom-chip='dieu_kien_tiep_can'] input[type='checkbox']",
      "[data-booking-condition-group] input[type='checkbox']",
    ]);
    return labels.length ? labels.join(", ") : "Chưa có";
  }

  function getBookingNoteValue(scope, deps) {
    const { queryFirst } = deps;
    const noteField = queryFirst(scope, [
      "#ghi-chu-dat-lich",
      "#ghi-chu-booking",
      "#ghi-chu",
      "textarea[name='ghi_chu']",
      "[data-truong-ghi-chu-dat-lich]",
    ]);
    return String(noteField?.value || "").trim();
  }

  function getBookingSummaryTarget(scope, key, deps) {
    const { queryFirst } = deps;
    const summaryBox = scope.querySelector("[data-tom-tat-dat-lich]");
    if (!summaryBox) return null;

    return queryFirst(summaryBox, [
      `[data-tom-tat-dat-lich='${key}']`,
      `[data-summary-booking='${key}']`,
      `[data-summary='${key}']`,
    ]);
  }

  function shouldHideEmptyBookingValue(value) {
    const text = String(value || "").trim();
    return !text || text === "Không có" || text === "Chưa có" || text === "0 tệp";
  }

  function updateBookingSummaryEmptyState(target, value) {
    const row = target?.closest("[data-hide-empty]");
    if (!row) return;
    row.hidden = shouldHideEmptyBookingValue(value);
  }

  function updateBookingSummarySectionVisibility(summaryBox) {
    summaryBox.querySelectorAll("[data-hide-when-empty]").forEach((section) => {
      const hasVisibleRows = Array.from(
        section.querySelectorAll(".muc-xac-nhan-dat-lich"),
      ).some((row) => !row.hidden);
      const hasVisibleMedia = !section.querySelector("[data-media-dat-lich-luoi]")?.hidden;
      section.hidden = !hasVisibleRows && !hasVisibleMedia;
    });
  }

  // Render tóm tắt đặt lịch để bước xác nhận và sidebar luôn đồng bộ.
  async function renderBookingSummary(scope, deps) {
    const {
      core,
      getSelectedLabel,
      countFiles,
      formatBookingSchedule,
      getBookingPricingTimeLabel,
      getBookingVehicleLabel,
    } = deps;
    const formLogic = await loadFormLogic(core);
    const summaryConfig = formLogic?.summary_config || {};
    const summaryBox = scope.querySelector("[data-tom-tat-dat-lich]");
    if (!summaryBox) return;

    const serviceSelect = scope.querySelector("#loai-dich-vu-dat-lich");
    const contactInput = scope.querySelector("#ho-ten-dat-lich");
    const phoneInput = scope.querySelector("#so-dien-thoai-dat-lich");
    const companyInput = scope.querySelector("#ten-cong-ty-dat-lich");
    const fromInput = scope.querySelector("#dia-chi-di-dat-lich");
    const toInput = scope.querySelector("#dia-chi-den-dat-lich");
    const weatherSelect = scope.querySelector("#thoi-tiet-du-kien-dat-lich");
    const pricingTimeInput = scope.querySelector("[data-khung-gio-tinh-gia]");
    const surveyCheckbox = scope.querySelector("#can-khao-sat-truoc-dat-lich");
    const serviceValue = serviceSelect?.value || "";
    const fromText = String(fromInput?.value || "").trim();
    const toText = String(toInput?.value || "").trim();
    const noteText = getBookingNoteValue(scope, deps);

    const routeText =
      fromText && toText
        ? `${fromText} → ${toText}`
        : fromText || toText || "Chưa nhập";

    const values = {
      nguoi_lien_he: String(contactInput?.value || "").trim() || "Chưa nhập",
      so_dien_thoai: String(phoneInput?.value || "").trim() || "Chưa nhập",
      don_vi: String(companyInput?.value || "").trim() || "Không có",
      dich_vu: serviceSelect?.value
        ? getSelectedLabel(serviceSelect)
        : "Chưa chọn",
      khao_sat_truoc: surveyCheckbox?.checked ? "Có" : "Không",
      lo_trinh: routeText,
      lich_thuc_hien: formatBookingSchedule(scope),
      khoang_cach: formatBookingDistance(scope, deps),
      loai_xe: getBookingVehicleLabel(scope, serviceValue),
      khung_gio_tinh_gia:
        getBookingPricingTimeLabel(pricingTimeInput?.value || "") || "Chưa chọn",
      thoi_tiet: getSelectedLabel(weatherSelect) || "Chưa chọn",
      dieu_kien: formatBookingConditionDetail(scope, deps),
      chi_tiet: formatBookingServiceDetail(
        scope,
        serviceValue,
        deps,
        summaryConfig,
      ),
      ghi_chu: noteText || "Chưa có",
      tep_dinh_kem: `${countFiles(
        scope,
        "#tep-anh-dat-lich, #tep-video-dat-lich",
      )} tệp`,
    };

    Object.entries(values).forEach(([key, value]) => {
      const target = getBookingSummaryTarget(scope, key, deps);
      if (!target) return;
      target.textContent = value;
      updateBookingSummaryEmptyState(target, value);
    });

    updateBookingSummarySectionVisibility(summaryBox);
  }

  window.FastGoFormSummaries = {
    renderBookingSummary,
  };
})(window);
