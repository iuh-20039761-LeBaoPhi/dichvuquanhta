(function () {
  const core = window.FastGoCore;
  if (!core) return;
  const basePath = core.apiBasePath;

  const partialUrl = `${basePath}assets/partials/shared-modals.html`;
  const movingModalId = "booking-modal-moving";
  let initialized = false;
  let loadingPromise = null;
  let mapInstances = {}; // Lưu trữ instance của bản đồ Leaflet
  let bookingMarkerIcons = null;
  const surveyFileLimit = 8;
  const surveyMaxFileSize = 15 * 1024 * 1024;

  function setSurveyCoordinates(lat, lng) {
    const latInput = document.getElementById("survey-lat");
    const lngInput = document.getElementById("survey-lng");
    if (latInput) latInput.value = lat || "";
    if (lngInput) lngInput.value = lng || "";
  }

  function initSurveyDateInput() {
    const dateInput = document.getElementById("moving-survey-date");
    if (!dateInput) return;
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - timezoneOffset)
      .toISOString()
      .slice(0, 10);
    dateInput.min = localDate;
  }

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
    
    // Tự động khởi tạo và căn chỉnh bản đồ khi mở modal
    if (kind === 'moving') {
       setTimeout(() => initMap('booking-map'), 200);
    }
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
    initSurveyDateInput();
    
    // Tự động khởi tạo bản đồ Survey
    setTimeout(() => initMap('survey-map'), 200);
  }

  function closeSurveyModalUI() {
    const modal = getSurveyModal();
    if (!modal) return;
    modal.style.display = "none";
    modal.classList.add('hidden');
    syncBodyScrollState();
  }

  function toggleSurveyServiceDetails() {
    const sel = document.getElementById('survey-service-type');
    if (!sel) return;
    const val = sel.value;
    const blocks = document.querySelectorAll('.survey-subform');
    blocks.forEach((b) => {
      b.style.display = 'none';
      b.querySelectorAll('input, select, textarea').forEach((input) => {
        if (input.dataset.wasRequired === undefined) {
          input.dataset.wasRequired = input.required ? 'true' : 'false';
        }
        input.required = false;
        input.disabled = true;
      });
    });

    const active = document.getElementById('survey-detail-' + val);
    if (active) {
      active.style.display = 'block';
      active.querySelectorAll('input, select, textarea').forEach((input) => {
        if (input.dataset.wasRequired === 'true') {
          input.required = true;
        }
        input.disabled = false;
      });
    }
  }

  function initSurveyServiceDetails() {
    const serviceSelect = document.getElementById('survey-service-type');
    if (!serviceSelect) return;
    if (serviceSelect.dataset.bound === 'true') {
      toggleSurveyServiceDetails();
      return;
    }
    serviceSelect.dataset.bound = 'true';
    serviceSelect.addEventListener('change', toggleSurveyServiceDetails);
    toggleSurveyServiceDetails();
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

  function getBookingMarkerIcons() {
    if (bookingMarkerIcons) return bookingMarkerIcons;
    bookingMarkerIcons = {
      pickup: L.icon({
        iconUrl:
          "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      delivery: L.icon({
        iconUrl:
          "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      default: null,
    };
    return bookingMarkerIcons;
  }

  function setMovingDistanceKm(value) {
    const input = document.getElementById("moving-distance");
    if (!input) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    input.value = num.toFixed(2);
  }

  function recalculateMovingDistance(instance) {
    if (!instance) return;
    const pickup = instance.markers["pickup-addr-moving"];
    const delivery = instance.markers["delivery-addr-moving"];
    if (!pickup || !delivery) return;

    const a = pickup.getLatLng();
    const b = delivery.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.routes && d.routes[0] && d.routes[0].distance) {
          setMovingDistanceKm(d.routes[0].distance / 1000);
          return;
        }
        setMovingDistanceKm(a.distanceTo(b) / 1000);
      })
      .catch(() => {
        setMovingDistanceKm(a.distanceTo(b) / 1000);
      });
  }

  function updateBookingRouteLine(instance) {
    if (!instance) return;
    const pickup = instance.markers["pickup-addr-moving"];
    const delivery = instance.markers["delivery-addr-moving"];
    if (!pickup || !delivery) return;

    const latlngs = [pickup.getLatLng(), delivery.getLatLng()];
    if (instance.routeLine) {
      instance.routeLine.setLatLngs(latlngs);
    } else {
      instance.routeLine = L.polyline(latlngs, {
        color: "#1b4332",
        weight: 3,
        opacity: 0.8,
        dashArray: "6 6",
      }).addTo(instance.map);
    }
    instance.map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    recalculateMovingDistance(instance);
  }

  window.updateMapMarker = function(inputId, coords, display_name) {
    if (!window.L) return;
    
    // Tìm map container cha hoặc map liên quan
    let mapId = inputId === 'survey-address-input' ? 'survey-map' : 'booking-map';
    const instance = mapInstances[mapId];
    if (!instance) return;

    const { map, markers } = instance;
    
    // Xóa marker cũ nếu có
    if (markers[inputId]) {
      map.removeLayer(markers[inputId]);
    }

    const iconSet = mapId === "booking-map" ? getBookingMarkerIcons() : null;
    const markerType =
      inputId === "pickup-addr-moving"
        ? "pickup"
        : inputId === "delivery-addr-moving"
          ? "delivery"
          : "default";

    // Icon chuẩn từ UNPKG để tránh lỗi mất icon khi dùng Leaflet mặc định
    const defaultIcon =
      iconSet && iconSet[markerType]
        ? iconSet[markerType]
        : L.icon({
            iconUrl:
              "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl:
              "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          });

    const marker = L.marker(coords, { icon: defaultIcon, draggable: true }).addTo(map);
    markers[inputId] = marker;
    if (inputId === "survey-address-input") {
      setSurveyCoordinates(coords[0], coords[1]);
    }
    
    if (display_name) {
      marker.bindPopup(display_name).openPopup();
    } else if (mapId === "booking-map") {
      marker.bindPopup(
        inputId === "pickup-addr-moving" ? "📍 Lấy hàng" : "🏁 Giao hàng",
      );
    }
    
    if (mapId === "booking-map") {
      updateBookingRouteLine(instance);
      if (!instance.routeLine) {
        map.flyTo(coords, 16);
      }
    } else {
      map.flyTo(coords, 16);
    }
    
    // Tự động lấy địa chỉ khi kéo ghim (Reverse Geocoding)
    marker.on('dragend', function() {
       const pos = marker.getLatLng();
       if (inputId === "survey-address-input") {
         setSurveyCoordinates(pos.lat, pos.lng);
       }
       fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`)
         .then(r => r.json())
         .then(result => {
           if (result && result.display_name) {
             const input = document.getElementById(inputId);
             if (input) input.value = result.display_name;
             marker.bindPopup(result.display_name).openPopup();
           }
         })
         .catch(err => console.error("Reverse Geocoding Error:", err));
       if (mapId === "booking-map") {
         updateBookingRouteLine(instance);
       }
    });
  }

  function initMap(mapId) {
    if (!window.L) return;
    const el = document.getElementById(mapId);
    if (!el || mapInstances[mapId]) return;

    const map = L.map(mapId).setView([10.7769, 106.7009], 13); // Center TP.HCM
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapInstances[mapId] = {
      map: map,
      markers: {}
    };
    
    // Fix issue map bị xám khi khởi tạo trong hidden element (modal)
    setTimeout(() => {
      map.invalidateSize();
      // Thêm ghim mặc định tại tâm
      if (mapId === 'survey-map') {
        window.updateMapMarker('survey-address-input', [10.7769, 106.7009]);
        return;
      }
      const base = [10.7769, 106.7009];
      window.updateMapMarker('pickup-addr-moving', base, "📍 Lấy hàng");
      window.updateMapMarker(
        'delivery-addr-moving',
        [base[0] + 0.003, base[1] + 0.003],
        "🏁 Giao hàng",
      );
    }, 400);
  }

  function initAddressAutocomplete() {
    const ids = ["pickup-addr-moving", "delivery-addr-moving", "booking-address-start-input", "booking-address-end-input", "survey-address-input"];
    ids.forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;

      // Tạo box gợi ý nếu chưa có
      let sugBox = document.getElementById(id + "-sug");
      if (!sugBox) {
        sugBox = document.createElement("div");
        sugBox.id = id + "-sug";
        sugBox.className = "suggestions-box-dynamic";
        input.parentNode.style.position = "relative";
        input.parentNode.appendChild(sugBox);
      }

      let timer;
      input.addEventListener("input", () => {
        clearTimeout(timer);
        const q = input.value.trim();
        if (id === "survey-address-input") {
          setSurveyCoordinates("", "");
        }
        if (q.length < 3) { sugBox.style.display = "none"; return; }
        timer = setTimeout(() => {
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=vn&limit=5`)
            .then(r => r.json())
            .then(data => {
              sugBox.innerHTML = "";
              if (!data.length) { sugBox.style.display = "none"; return; }
              data.forEach(item => {
                const div = document.createElement("div");
                div.className = "suggestion-item-dynamic";
                div.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${item.display_name}</span>`;
                div.addEventListener("click", () => {
                  input.value = item.display_name;
                  sugBox.style.display = "none";
                  // Nếu có bản đồ, cập nhật vị trí ở đây (L.marker...)
                  if (typeof window.updateMapMarker === 'function') {
                    window.updateMapMarker(id, [item.lat, item.lon]);
                  }
                });
                sugBox.appendChild(div);
              });
              sugBox.style.display = "block";
            });
        }, 500);
      });

      document.addEventListener("click", e => {
        if (e.target !== input) sugBox.style.display = "none";
      });
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

  // Đã xóa phần xử lý doanh nghiệp theo yêu cầu.

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

    // Đã bỏ initCorporateSection theo yêu cầu.
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

    initSurveyServiceDetails();
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
    if (typeof window.resetSurveyForm === "function") {
      window.resetSurveyForm();
    }
    const select = document.getElementById('survey-service-type');
    if (select && serviceType) {
      select.value = serviceType;
    }
    initSurveyServiceDetails();
    openSurveyModalUI();
  };

  window.closeSurveyModal = function() {
    closeSurveyModalUI();
  };

  window.handleFileSelect = function (input) {
    const previewGrid = input.parentNode.querySelector(".file-preview-grid");
    if (!previewGrid) return;
    const existingFiles = Array.isArray(input._managedFiles)
      ? input._managedFiles
      : [];
    core.clearFieldError(input);

    const mergedFiles = [...existingFiles];
    const seenKeys = new Set(
      mergedFiles.map((file) =>
        [file.name, file.size, file.lastModified, file.type].join("::"),
      ),
    );

    Array.from(input.files || []).forEach((file) => {
      const fileKey = [
        file.name,
        file.size,
        file.lastModified,
        file.type,
      ].join("::");
      if (seenKeys.has(fileKey)) return;
      if (file.size > surveyMaxFileSize) {
        core.showFieldError(
          input,
          `Tệp "${file.name}" vượt quá 15MB.`,
        );
        return;
      }
      if (mergedFiles.length >= surveyFileLimit) {
        core.showFieldError(
          input,
          `Chỉ được tải tối đa ${surveyFileLimit} tệp.`,
        );
        return;
      }
      seenKeys.add(fileKey);
      mergedFiles.push(file);
    });

    input._managedFiles = mergedFiles;
    const dataTransfer = new DataTransfer();
    mergedFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
    previewGrid.innerHTML = "";

    mergedFiles.forEach((file, index) => {
      const reader = new FileReader();
      const isVideo = file.type.startsWith("video/");

      reader.onload = function (e) {
        const item = document.createElement("div");
        item.className = "preview-item";

        if (isVideo) {
          item.innerHTML = `
            <video src="${e.target.result}" muted></video>
            <button type="button" class="remove-file" aria-label="Xóa tệp">&times;</button>
          `;
        } else {
          item.innerHTML = `
            <img src="${e.target.result}" alt="preview">
            <button type="button" class="remove-file" aria-label="Xóa tệp">&times;</button>
          `;
        }

        item.querySelector(".remove-file").addEventListener("click", (ev) => {
          ev.stopPropagation();
          const nextFiles = (input._managedFiles || []).filter(
            (_, fileIndex) => fileIndex !== index,
          );
          input._managedFiles = nextFiles;
          const nextTransfer = new DataTransfer();
          nextFiles.forEach((managedFile) => nextTransfer.items.add(managedFile));
          input.files = nextTransfer.files;
          previewGrid.innerHTML = "";
          window.handleFileSelect(input);
        });

        previewGrid.appendChild(item);
      };

      reader.readAsDataURL(file);
    });
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
