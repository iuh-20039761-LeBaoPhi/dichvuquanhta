(function () {
  const inPublicDir = window.location.pathname.toLowerCase().includes("/public/");
  const basePath =
    typeof window.apiBasePath === "string"
      ? window.apiBasePath
      : inPublicDir
        ? ""
        : "public/";

  if (typeof window.apiBasePath !== "string") {
    window.apiBasePath = basePath;
  }
  if (typeof window.isLoggedIn !== "boolean") {
    window.isLoggedIn = false;
  }
  if (!Array.isArray(window.servicesData)) {
    window.servicesData = [
      { id: 1, name: "Giao chậm", type_key: "slow", base_price: 20000.0 },
      { id: 2, name: "Giao tiêu chuẩn", type_key: "standard", base_price: 30000.0 },
      { id: 3, name: "Giao nhanh", type_key: "fast", base_price: 40000.0 },
      { id: 4, name: "Giao hỏa tốc", type_key: "express", base_price: 50000.0 },
    ];
  }
  if (!window.pricingConfig || typeof window.pricingConfig !== "object") {
    window.pricingConfig = { weight_free: 2, weight_price: 5000, cod_min: 5000 };
  }

  const partialUrl = `${basePath}assets/partials/shared-modals.html`;
  const deliveryModalId = "booking-modal-delivery";
  const movingModalId = "booking-modal-moving";
  let initialized = false;
  const deliveryItemOptionsByType = {
    thuong: [
      "Quần áo/vải vóc",
      "Giày dép/túi xách",
      "Sách vở/văn phòng phẩm",
      "Đồ chơi nhựa",
      "Đồ gia dụng nhựa/inox",
      "Phụ kiện điện tử đơn giản",
    ],
    "gia-tri-cao": [
      "Điện thoại/máy tính bảng",
      "Laptop/máy ảnh",
      "Đồng hồ thông minh/tai nghe cao cấp",
      "Mỹ phẩm chính hãng",
      "Nước hoa",
      "Trang sức/đá quý",
    ],
    "de-vo": [
      "Đồ gốm sứ/chén dĩa",
      "Bình thủy tinh",
      "Màn hình TV/máy tính",
      "Gương soi",
      "Tượng đá/đồ thủ công mỹ nghệ",
      "Đèn trang trí/đèn chùm",
    ],
    "chat-long": [
      "Dầu ăn/nước mắm",
      "Mật ong/rượu vang",
      "Sữa nước/đồ uống đóng chai",
      "Hóa chất công nghiệp/sơn/dung môi",
      "Dầu nhớt",
      "Nước hoa",
    ],
    "pin-lithium": [
      "Sạc dự phòng",
      "Pin xe máy điện",
      "Xe điện",
      "Quạt tích điện",
      "Đèn pin",
    ],
    "dong-lanh": [
      "Thịt/cá/hải sản tươi sống",
      "Thực phẩm đông lạnh",
      "Rau củ/trái cây tươi",
      "Vaccine cần bảo quản lạnh",
      "Dược phẩm cần bảo quản lạnh",
    ],
    "cong-kenh": [
      "Sofa/tủ quần áo/giường gỗ",
      "Lốp xe tải",
      "Máy móc công trình",
      "Bồn nước inox",
      "Cuộn cáp điện lớn",
    ],
  };

  function isMovingType(typeKey) {
    if (
      window.serviceHelper &&
      typeof window.serviceHelper.isMovingService === "function"
    ) {
      return window.serviceHelper.isMovingService(typeKey);
    }
    return String(typeKey || "").startsWith("moving_");
  }

  function isDeliveryType(typeKey) {
    const value = String(typeKey || "").trim().toLowerCase();
    return [
      "slow",
      "standard",
      "fast",
      "express",
      "intl_economy",
      "intl_express",
    ].includes(value);
  }

  function isInternationalDeliveryType(typeKey) {
    const value = String(typeKey || "").trim().toLowerCase();
    return ["intl_economy", "intl_express"].includes(value);
  }

  function ensureModalStyles() {
    // Styles are centralized in public/assets/css/components/modal.css.
  }

  function ensureModalMarkup() {
    const hasDelivery = !!document.getElementById(deliveryModalId);
    const hasMoving = !!document.getElementById(movingModalId);
    if (hasDelivery && hasMoving) return true;

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", partialUrl, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText.trim()) {
        ensureModalStyles();
        document.body.insertAdjacentHTML("beforeend", xhr.responseText);
        return true;
      }
      console.error("Cannot load shared modals:", partialUrl, xhr.status);
    } catch (err) {
      console.error("Cannot load shared modals:", err);
    }
    return false;
  }

  function getModal(kind) {
    if (kind === "delivery") return document.getElementById(deliveryModalId);
    if (kind === "moving") return document.getElementById(movingModalId);
    return null;
  }

  function isVisible(modal) {
    return !!modal && modal.style.display === "block";
  }

  function syncBodyScrollState() {
    const deliveryModal = getModal("delivery");
    const movingModal = getModal("moving");
    const anyOpen = isVisible(deliveryModal) || isVisible(movingModal);
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

  function closeAllModals() {
    closeModal("delivery");
    closeModal("moving");
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

  function initDeliveryItemFields() {
    const itemType = document.getElementById("delivery-item-type");
    const itemName = document.getElementById("delivery-item-name");
    if (!itemType || !itemName) return;

    const applyState = () => {
      const key = String(itemType.value || "").trim().toLowerCase();
      const options = deliveryItemOptionsByType[key] || [];
      setSelectOptions(itemName, options, "Chọn tên hàng");
      itemName.disabled = options.length === 0;
      if (options.length === 0) {
        setSelectOptions(itemName, [], "Chọn nhóm hàng trước");
      }
    };

    itemType.addEventListener("change", applyState);
    applyState();
  }

  function getRouteLocationSource() {
    const quoteData =
      window.QUOTE_SHIPPING_DATA && typeof window.QUOTE_SHIPPING_DATA === "object"
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

    const optionList = Array.from(suggestions)
      .filter(Boolean)
      .slice(0, 700);
    datalist.innerHTML = "";
    optionList.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      datalist.appendChild(option);
    });

    [
      "pickup-addr",
      "delivery-addr",
      "pickup-addr-moving",
      "delivery-addr-moving",
    ]
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

  function initDeliveryRouteFields() {
    const pickupCity = document.getElementById("pickup-city");
    const pickupDistrict = document.getElementById("pickup-district");
    const deliveryCity = document.getElementById("delivery-city");
    const deliveryDistrict = document.getElementById("delivery-district");

    if (!pickupCity || !pickupDistrict || !deliveryCity || !deliveryDistrict) return;

    const { cityMap, cities } = getRouteLocationSource();

    bindCityDistrictFields(
      pickupCity,
      pickupDistrict,
      "Chọn tỉnh/thành phố gửi",
      "Chọn quận/huyện gửi",
      cities,
      cityMap,
    );
    bindCityDistrictFields(
      deliveryCity,
      deliveryDistrict,
      "Chọn tỉnh/thành phố nhận",
      "Chọn quận/huyện nhận",
      cities,
      cityMap,
    );
  }

  function initInternationalDestinationFields() {
    const countrySelect = document.getElementById("delivery-intl-country");
    const provinceSelect = document.getElementById("delivery-intl-province");
    if (!countrySelect || !provinceSelect) return;

    const quoteData =
      window.QUOTE_SHIPPING_DATA && typeof window.QUOTE_SHIPPING_DATA === "object"
        ? window.QUOTE_SHIPPING_DATA
        : {};
    const intlData =
      quoteData.international && typeof quoteData.international === "object"
        ? quoteData.international
        : {};
    const countries = toUniqueSortedLocations(
      Array.isArray(intlData.countries) ? intlData.countries : [],
    );
    const destinationRegions =
      intlData.destinationRegions && typeof intlData.destinationRegions === "object"
        ? intlData.destinationRegions
        : {};
    const countryZoneMap =
      intlData.countryZoneMap && typeof intlData.countryZoneMap === "object"
        ? intlData.countryZoneMap
        : {};
    const regionCountries = toUniqueSortedLocations(Object.keys(destinationRegions));
    const zoneCountries = toUniqueSortedLocations(Object.keys(countryZoneMap));

    // Chỉ giữ quốc gia đồng nhất giữa danh sách hiển thị + vùng đến + zone tính giá.
    const regionSet = new Set(regionCountries.map(normalizeLocationKey));
    const zoneSet = new Set(zoneCountries.map(normalizeLocationKey));
    const countryOptions = countries.filter(
      (c) =>
        regionSet.has(normalizeLocationKey(c)) &&
        zoneSet.has(normalizeLocationKey(c)),
    );

    setSelectOptions(countrySelect, countryOptions, "Chọn quốc gia nhận");
    setSelectOptions(provinceSelect, [], "Chọn tỉnh/thành phố nhận");
    provinceSelect.disabled = true;

    const applyRegions = () => {
      const country = countrySelect.value;
      const regions = toUniqueSortedLocations(
        Array.isArray(destinationRegions[country])
          ? destinationRegions[country]
          : [],
      );
      setSelectOptions(provinceSelect, regions, "Chọn tỉnh/thành phố nhận");
      provinceSelect.disabled = regions.length === 0;
    };

    countrySelect.addEventListener("change", applyRegions);
    applyRegions();
  }

  function initDeliveryServiceMode() {
    const serviceSelect = document.getElementById("order-service-type");
    if (!serviceSelect) return;

    const deliveryCityGroup = document.getElementById("delivery-domestic-city-group");
    const deliveryDistrictGroup = document.getElementById(
      "delivery-domestic-district-group",
    );
    const intlCountryGroup = document.getElementById("delivery-intl-country-group");
    const intlProvinceGroup = document.getElementById("delivery-intl-province-group");
    const intlCountrySelect = document.getElementById("delivery-intl-country");
    const codField = document.getElementById("cod-field-group");
    const codInput = document.getElementById("cod_amount");

    const applyState = () => {
      const isIntl = isInternationalDeliveryType(serviceSelect.value);
      if (deliveryCityGroup) deliveryCityGroup.style.display = isIntl ? "none" : "";
      if (deliveryDistrictGroup) {
        deliveryDistrictGroup.style.display = isIntl ? "none" : "";
      }
      if (intlCountryGroup) intlCountryGroup.style.display = isIntl ? "block" : "none";
      if (intlProvinceGroup) intlProvinceGroup.style.display = isIntl ? "block" : "none";
      if (intlCountrySelect) {
        intlCountrySelect.required = isIntl;
      }
      if (codField) codField.style.display = isIntl ? "none" : "";
      if (codInput) {
        if (isIntl) {
          codInput.value = "0";
          codInput.disabled = true;
        } else {
          codInput.disabled = false;
        }
      }
    };

    serviceSelect.addEventListener("change", applyState);
    applyState();
  }

  function initMovingRouteFields() {
    const pickupCity = document.getElementById("pickup-city-moving");
    const pickupDistrict = document.getElementById("pickup-district-moving");
    const deliveryCity = document.getElementById("delivery-city-moving");
    const deliveryDistrict = document.getElementById("delivery-district-moving");

    if (!pickupCity || !pickupDistrict || !deliveryCity || !deliveryDistrict) return;

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

  function initDeliveryDimensionsToggle() {
    const toggle = document.getElementById("toggle-delivery-dimensions");
    const group = document.getElementById("modal-dimensions-group");
    if (!toggle || !group) return;

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      group.style.display = "grid";
      toggle.style.display = "none";
    });
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
      const selected = String(serviceSelect.value || "").trim().toLowerCase();
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

  function ensureCoreBindings() {
    if (
      window.FastGoCore &&
      typeof window.FastGoCore.bindOrderShippingInputs === "function"
    ) {
      window.FastGoCore.bindOrderShippingInputs();
    }
  }

  function initModalBindings() {
    if (initialized) return;
    initialized = true;

    initCorporateSection(
      "is_corporate_checkbox_delivery",
      "corporate-fields-delivery",
    );
    initCorporateSection(
      "is_corporate_checkbox_moving",
      "corporate-fields-moving",
    );
    initDeliveryDimensionsToggle();
    initMovingOtherServiceFields();
    initMovingServiceDetails();
    initBookingTriggerButtons();
    initAddressAutocomplete();
    initDeliveryItemFields();
    initDeliveryRouteFields();
    initInternationalDestinationFields();
    initDeliveryServiceMode();
    initMovingRouteFields();
    ensureCoreBindings();

    window.addEventListener("click", function (event) {
      const deliveryModal = getModal("delivery");
      const movingModal = getModal("moving");
      if (event.target === deliveryModal) closeModal("delivery");
      if (event.target === movingModal) closeModal("moving");
    });
  }

  window.openBookingModal = function (serviceType) {
    if (!ensureModalMarkup()) return;
    initModalBindings();

    const normalized = String(serviceType || "").trim().toLowerCase();
    const openingMoving = isMovingType(normalized);
    closeAllModals();

    if (openingMoving) {
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
      return;
    }

    const deliverySelect = document.getElementById("order-service-type");
    if (deliverySelect && isDeliveryType(normalized)) {
      deliverySelect.value = normalized;
      deliverySelect.dispatchEvent(new Event("change"));
    }
    openModal("delivery");
  };

  window.closeBookingModal = function (modalType) {
    if (modalType === "delivery") {
      closeModal("delivery");
      return;
    }
    if (modalType === "moving") {
      closeModal("moving");
      return;
    }
    closeAllModals();
  };

  if (ensureModalMarkup()) initModalBindings();

  document.addEventListener("DOMContentLoaded", function () {
    if (ensureModalMarkup()) initModalBindings();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("open_booking") === "true") {
      window.openBookingModal(urlParams.get("service") || "");
    }
  });
})();
