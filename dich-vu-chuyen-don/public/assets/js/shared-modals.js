(function () {
  const core = window.FastGoCore;
  if (!core) return;
  const basePath = core.apiBasePath;

  const partialUrl = `${basePath}assets/partials/shared-modals.html`;
  const movingModalId = "booking-modal-moving";
  let initialized = false;
  let loadingPromise = null;

  function ensureModalMarkup() {
    if (document.getElementById(movingModalId)) {
      initModalBindings();
      return Promise.resolve(true);
    }
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(partialUrl)
      .then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then((html) => {
        if (html.trim()) {
          document.body.insertAdjacentHTML("beforeend", html);
          initModalBindings();
          return true;
        }
        return false;
      })
      .catch((err) => {
        console.error("Cannot load shared modals:", err);
        loadingPromise = null;
        return false;
      });

    return loadingPromise;
  }

  function getModal(kind) {
    if (kind === "moving") return document.getElementById(movingModalId);
    return null;
  }

  function isVisible(modal) {
    return !!modal && modal.style.display === "block";
  }

  function syncBodyScrollState() {
    const movingModal = getModal("moving");
    const anyOpen = isVisible(movingModal);
    document.body.style.overflow = anyOpen ? "hidden" : "auto";
  }

  function openModal(kind) {
    const modal = getModal(kind);
    if (!modal) return;
    modal.style.display = "block";
    syncBodyScrollState();
  }

  function closeModal(kind) {
    const modal = getModal(kind);
    if (!modal) return;
    modal.style.display = "none";
    syncBodyScrollState();
  }

  function getSurveyModal() {
    return document.getElementById('survey-modal');
  }

  function openSurveyModalUI() {
    const modal = getSurveyModal();
    if (!modal) return;
    modal.style.display = "flex";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
  }

  function closeSurveyModalUI() {
    const modal = getSurveyModal();
    if (!modal) return;
    modal.style.display = "none";
    modal.classList.add('hidden');
    syncBodyScrollState();
  }

  function closeAllModals() {
    closeModal("moving");
    closeSurveyModalUI();
  }

  function setSelectOptions(selectEl, options, placeholder) {
    if (!selectEl) return;
    const list = Array.isArray(options) ? options : [];
    selectEl.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder || "Vui lòng chọn";
    selectEl.appendChild(placeholderOption);

    list.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    });
  }

  function normalizeLocationKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function toUniqueSortedLocations(list) {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((item) => {
      const label = String(item || "").trim();
      if (!label) return;
      const key = normalizeLocationKey(label);
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, "vi", { sensitivity: "base" }),
    );
  }

  function getRouteLocationSource() {
    const quoteData =
      window.QUOTE_SHIPPING_DATA &&
      typeof window.QUOTE_SHIPPING_DATA === "object"
        ? window.QUOTE_SHIPPING_DATA
        : {};
    const rawCityMap =
      quoteData.cities && typeof quoteData.cities === "object"
        ? quoteData.cities
        : {};
    const domesticData =
      quoteData.domestic && typeof quoteData.domestic === "object"
        ? quoteData.domestic
        : {};
    const cityOptions = toUniqueSortedLocations(
      Array.isArray(domesticData.cityOptions) ? domesticData.cityOptions : [],
    );
    const cityNames = Object.keys(rawCityMap);
    const fallbackCities = [
      "TP Hồ Chí Minh",
      "Hà Nội",
      "Đà Nẵng",
      "Cần Thơ",
      "Hải Phòng",
    ];
    const cities = cityOptions.length
      ? cityOptions
      : cityNames.length
        ? cityNames
        : fallbackCities;

    const cityMap = {};
    cities.forEach((city) => {
      cityMap[city] = Array.isArray(rawCityMap[city]) ? rawCityMap[city] : [];
    });
    return { cityMap, cities };
  }

  function initAddressAutocomplete() {
    const datalistId = "booking-address-suggestions";
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      document.body.appendChild(datalist);
    }

    const { cityMap, cities } = getRouteLocationSource();
    const suggestions = new Set([
      "Số nhà ..., Quận 1, TP Hồ Chí Minh",
      "Số nhà ..., Quận Cầu Giấy, Hà Nội",
      "Số nhà ..., Quận Hải Châu, Đà Nẵng",
    ]);

    const sortedCities = toUniqueSortedLocations(cities);
    let districtOptionCount = 0;
    const maxDistrictOptions = 320;

    sortedCities.forEach((city) => {
      suggestions.add(city);
      const districts = toUniqueSortedLocations(cityMap[city] || []);
      districts.forEach((district) => {
        if (districtOptionCount >= maxDistrictOptions) return;
        suggestions.add(`${district}, ${city}`);
        suggestions.add(`Số nhà ..., ${district}, ${city}`);
        districtOptionCount += 1;
      });
    });

    const optionList = Array.from(suggestions).filter(Boolean).slice(0, 700);
    datalist.innerHTML = "";
    optionList.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      datalist.appendChild(option);
    });

    ["pickup-addr-moving", "delivery-addr-moving"]
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .forEach((input) => {
        input.setAttribute("list", datalistId);
        input.setAttribute("autocomplete", "street-address");
      });
  }

  function bindCityDistrictFields(
    citySelect,
    districtSelect,
    cityPlaceholder,
    districtPlaceholder,
    cities,
    cityMap,
  ) {
    if (!citySelect || !districtSelect) return;

    const currentCity = citySelect.value;
    setSelectOptions(citySelect, cities, cityPlaceholder);
    if (currentCity && cities.includes(currentCity)) {
      citySelect.value = currentCity;
    }

    const applyDistrict = () => {
      const city = citySelect.value;
      const districts = Array.isArray(cityMap[city]) ? cityMap[city] : [];
      const previousDistrict = districtSelect.value;
      setSelectOptions(districtSelect, districts, districtPlaceholder);
      districtSelect.disabled = districts.length === 0;
      if (previousDistrict && districts.includes(previousDistrict)) {
        districtSelect.value = previousDistrict;
      }
    };

    citySelect.addEventListener("change", applyDistrict);
    applyDistrict();
  }

  function initCorporateSection(checkboxId, fieldsId) {
    const checkbox = document.getElementById(checkboxId);
    const fields = document.getElementById(fieldsId);
    if (!checkbox || !fields) return;

    const applyState = () => {
      fields.style.display = checkbox.checked ? "block" : "none";
    };

    checkbox.addEventListener("change", applyState);
    applyState();
  }

  function toggleMovingPanelInputs(panel, isActive) {
    if (!panel) return;
    const controls = panel.querySelectorAll("input, select, textarea");
    controls.forEach((control) => {
      if (!control.dataset.wasRequired) {
        control.dataset.wasRequired = control.required ? "true" : "false";
      }
      control.required = isActive && control.dataset.wasRequired === "true";
      control.disabled = !isActive;
    });
  }

  function syncMovingOtherServiceFields() {
    const toggles = document.querySelectorAll(
      ".moving-other-service-checkbox[data-target]",
    );
    toggles.forEach((toggle) => {
      const targetId = String(toggle.dataset.target || "").trim();
      const targetInput = targetId ? document.getElementById(targetId) : null;
      if (!targetInput) return;

      const enabled = !toggle.disabled && toggle.checked;
      targetInput.disabled = !enabled;
      if (!enabled) targetInput.value = "";
    });
  }

  function initMovingOtherServiceFields() {
    const toggles = document.querySelectorAll(
      ".moving-other-service-checkbox[data-target]",
    );
    toggles.forEach((toggle) => {
      if (toggle.dataset.bound === "true") return;
      toggle.dataset.bound = "true";
      toggle.addEventListener("change", syncMovingOtherServiceFields);
    });
    syncMovingOtherServiceFields();
  }

  function initMovingServiceDetails() {
    const serviceSelect = document.getElementById("order-service-type-moving");
    if (!serviceSelect) return;

    const details = Array.from(
      document.querySelectorAll(".moving-detail[data-moving-service]"),
    );
    const applyState = () => {
      const selected = String(serviceSelect.value || "")
        .trim()
        .toLowerCase();
      details.forEach((block) => {
        const key = String(block.dataset.movingService || "").toLowerCase();
        const isActive = key === selected;
        block.style.display = isActive ? "block" : "none";
        toggleMovingPanelInputs(block, isActive);
      });
      syncMovingOtherServiceFields();
    };

    serviceSelect.addEventListener("change", applyState);
    applyState();
  }

  function initMovingRouteFields() {
    const pickupCity = document.getElementById("pickup-city-moving");
    const pickupDistrict = document.getElementById("pickup-district-moving");
    const deliveryCity = document.getElementById("delivery-city-moving");
    const deliveryDistrict = document.getElementById(
      "delivery-district-moving",
    );

    if (!pickupCity || !pickupDistrict || !deliveryCity || !deliveryDistrict)
      return;

    const { cityMap, cities } = getRouteLocationSource();

    bindCityDistrictFields(
      pickupCity,
      pickupDistrict,
      "Chọn tỉnh/thành phố lấy hàng",
      "Chọn quận/huyện lấy hàng",
      cities,
      cityMap,
    );
    bindCityDistrictFields(
      deliveryCity,
      deliveryDistrict,
      "Chọn tỉnh/thành phố giao hàng",
      "Chọn quận/huyện giao hàng",
      cities,
      cityMap,
    );
  }

  function initBookingTriggerButtons() {
    const triggers = document.querySelectorAll("[data-open-booking]");
    triggers.forEach((trigger) => {
      if (trigger.dataset.bookingBound === "true") return;
      trigger.dataset.bookingBound = "true";
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        window.openBookingModal(trigger.dataset.openBooking || "");
      });
    });
  }

  function initModalBindings() {
    if (initialized) return;
    const movingModal = getModal("moving");
    if (!movingModal) return;

    initialized = true;

    initCorporateSection(
      "is_corporate_checkbox_moving",
      "corporate-fields-moving",
    );
    initMovingOtherServiceFields();
    initMovingServiceDetails();
    initBookingTriggerButtons();
    initAddressAutocomplete();
    initMovingRouteFields();

    window.addEventListener("click", function (event) {
      if (event.target === movingModal) closeModal("moving");
      
      const surveyModal = getSurveyModal();
      if (event.target === surveyModal) closeSurveyModalUI();
    });

    const closeSurveyBtn = document.getElementById('close-survey-modal');
    if (closeSurveyBtn) {
      closeSurveyBtn.addEventListener('click', closeSurveyModalUI);
    }
  }

  window.openBookingModal = async function (serviceType) {
    const loaded = await ensureModalMarkup();
    if (!loaded) return;

    const normalized = String(serviceType || "")
      .trim()
      .toLowerCase();
    closeAllModals();

    const movingSelect = document.getElementById("order-service-type-moving");
    if (
      movingSelect &&
      normalized &&
      ["moving_house", "moving_office", "moving_warehouse"].includes(normalized)
    ) {
      movingSelect.value = normalized;
      movingSelect.dispatchEvent(new Event("change"));
    }
    openModal("moving");
  };

  window.closeBookingModal = function (modalType) {
    if (modalType === "moving") {
      closeModal("moving");
      return;
    }
    closeAllModals();
  };

  window.openSurveyModal = function(serviceType) {
    closeAllModals();
    const select = document.getElementById('survey-service-type');
    if (select && serviceType) {
      select.value = serviceType;
    }
    openSurveyModalUI();
  };

  window.closeSurveyModal = function() {
    closeSurveyModalUI();
  };

  ensureModalMarkup();

  document.addEventListener("DOMContentLoaded", function () {
    ensureModalMarkup().then(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("open_booking") === "true") {
        window.openBookingModal(urlParams.get("service") || "");
      }
    });
  });
})();
