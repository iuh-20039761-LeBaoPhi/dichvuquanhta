const mapPicker = (() => {
  const HCM = [10.7769, 106.7009];
  let map = null;
  let marker = null;
  let leafletPromise = null;

  function getFirstElementById(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function getAddressInput() {
    return getFirstElementById(["addressInput", "address"]);
  }

  function uniqueNonEmpty(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (!item) return false;
      const normalized = String(item).trim();
      if (!normalized) return false;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildDetailedAddress(address, displayName) {
    if (!address) return displayName || "";

    const parts = uniqueNonEmpty([
      address.house_number,
      address.road || address.pedestrian || address.footway || address.path,
      address.hamlet || address.allotments || address.city_block,
      address.suburb || address.neighbourhood || address.quarter,
      address.city_district || address.district || address.borough,
      address.city || address.town || address.village || address.municipality,
      address.state_district,
      address.state,
      address.postcode,
      address.country,
    ]);

    if (parts.length >= 3) return parts.join(", ");
    return displayName || parts.join(", ");
  }

  function ensureLeaflet() {
    if (window.L && typeof window.L.map === "function") {
      return Promise.resolve();
    }

    if (leafletPromise) {
      return leafletPromise;
    }

    leafletPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[data-map-picker="leaflet"]',
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không tải được Leaflet")),
          { once: true },
        );
        return;
      }

      if (!document.querySelector('link[data-map-picker="leaflet"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        css.crossOrigin = "";
        css.setAttribute("data-map-picker", "leaflet");
        document.head.appendChild(css);
      }

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.async = true;
      script.setAttribute("data-map-picker", "leaflet");
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Không tải được Leaflet"));
      document.head.appendChild(script);
    });

    return leafletPromise;
  }

  function init() {
    if (map) {
      map.invalidateSize();
      return Promise.resolve();
    }

    return ensureLeaflet().then(() => {
      const mapEl = getFirstElementById(["osmMap", "mapPickerEl"]);
      if (!mapEl) return;

      map = L.map(mapEl).setView(HCM, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", function (e) {
        pick(e.latlng.lat, e.latlng.lng);
      });
    });
  }

  function pick(lat, lng) {
    if (!map) return;

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    map.panTo([lat, lng]);

    const addr = getAddressInput();
    if (!addr) return;

    addr.placeholder = "Đang tải địa chỉ...";
    addr.value = "";

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&namedetails=1`,
      {
        headers: { "Accept-Language": "vi" },
      },
    )
      .then((r) => r.json())
      .then((data) => {
        addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";

        if (!data || !data.address) {
          addr.value = (data && data.display_name) || "";
          return;
        }

        addr.value = buildDetailedAddress(data.address, data.display_name);
        if (addr.value) {
          marker.bindPopup(`<small>${addr.value}</small>`).openPopup();
        }
      })
      .catch(() => {
        addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";
        addr.value = `Vĩ độ ${lat.toFixed(6)}, Kinh độ ${lng.toFixed(6)}`;
      });
  }

  function toggle() {
    const box = getFirstElementById(["osmMapWrapper", "mapPickerBox"]);
    const btn = document.getElementById("toggleMapBtn");
    if (!box || !btn) return;

    const opening = box.style.display === "none" || box.style.display === "";
    box.style.display = opening ? "block" : "none";

    if (opening) {
      btn.innerHTML = '<i class="fas fa-times me-1"></i> Đóng bản đồ';
      btn.classList.add("active");
      setTimeout(() => {
        init().then(() => {
          if (map) map.invalidateSize();
        });
      }, 50);
    } else {
      btn.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i> Mở bản đồ';
      btn.classList.remove("active");
    }
  }

  function gps() {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }

    const addr = getAddressInput();
    if (!addr) return;

    const origPlaceholder = addr.placeholder;
    addr.placeholder = "Đang xác định vị trí...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const box = getFirstElementById(["osmMapWrapper", "mapPickerBox"]);
        if (box && (box.style.display === "none" || box.style.display === "")) {
          toggle();
        }

        setTimeout(
          () => {
            if (!map) {
              init().then(() => {
                if (!map) return;
                map.setView([lat, lng], 16);
                pick(lat, lng);
              });
              return;
            }

            map.setView([lat, lng], 16);
            pick(lat, lng);
          },
          map ? 0 : 350,
        );
      },
      (err) => {
        addr.placeholder = origPlaceholder;
        if (err.code === 1) {
          alert(
            "Vui lòng cho phép truy cập vị trí trong trình duyệt để sử dụng tính năng này.",
          );
        } else {
          alert(
            "Không thể xác định vị trí. Vui lòng thử lại hoặc nhập địa chỉ thủ công.",
          );
        }
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function refresh() {
    if (map) {
      map.invalidateSize();
      return;
    }
    init();
  }

  return { toggle, gps, refresh };
})();

document.addEventListener("DOMContentLoaded", function () {
  const modalContainer = document.getElementById("modalContainer");

  if (!modalContainer) {
    initBookingModal();
    return;
  }

  fetch("public/component/booking_modal.html")
    .then((res) => res.text())
    .then((data) => {
      modalContainer.innerHTML = data;
      initBookingModal();
    })
    .catch(() => {
      initBookingModal();
    });
});

function initBookingModal() {
  // ===== ELEMENT =====
  const serviceSelect = document.getElementById("serviceSelect");
  const vehicleType = document.getElementById("vehicleType");
  const brandSelect = document.getElementById("brandSelect");
  const itemSelect = document.getElementById("itemSelect");

  const priceInput = document.getElementById("price-contact");
  const transportInput = document.getElementById("transport-fee");
  const surveyInput = document.getElementById("survey-fee");
  const totalInput = document.getElementById("total-price");

  // const locateBtn = document.getElementById("locateBtn");
  // const addressInput = document.getElementById("addressInput");

  let servicesData = [];
  let pendingServiceId = null;

  function applyServiceSelection(serviceId) {
    if (!serviceSelect || !serviceId) return false;

    const targetValue = String(serviceId);
    const hasOption = Array.from(serviceSelect.options).some(
      (opt) => String(opt.value) === targetValue,
    );

    if (!hasOption) return false;

    serviceSelect.value = targetValue;
    serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function bindQuickBookingButtons() {
    if (document.body.dataset.quickBookingBound === "true") return;
    document.body.dataset.quickBookingBound = "true";

    document.addEventListener("click", function (e) {
      const triggerBtn = e.target.closest('[data-booking-service-btn="true"]');
      if (!triggerBtn) return;

      e.preventDefault();

      const serviceId = triggerBtn.dataset.id;
      if (!serviceId) return;

      const bookingModal = document.getElementById("bookingModal");
      if (bookingModal) {
        bootstrap.Modal.getOrCreateInstance(bookingModal).show();
      }

      const applied = applyServiceSelection(serviceId);
      if (!applied) {
        pendingServiceId = serviceId;
      }
    });
  }

  // ===== PHÍ =====
  const minTransport = 40000;
  const maxTransport = 60000;
  let vehicleTypesData = [];

  function getSurveyFeeByVehicleType(type) {
    const vehicleType = vehicleTypesData.find((v) => v.type === type);
    return vehicleType?.survey_fees || 0;
  }

  function getCurrentSurveyFee() {
    if (!vehicleType || !vehicleType.value) return 0;
    return getSurveyFeeByVehicleType(vehicleType.value);
  }

  // ===== INIT HIỂN THỊ =====
  if (transportInput) {
    transportInput.value =
      minTransport.toLocaleString("vi-VN") +
      " - " +
      maxTransport.toLocaleString("vi-VN");
  }

  // ===== LOAD DATA =====
  fetch("public/services.json")
    .then((res) => res.json())
    .then((data) => {
      servicesData = data.services || [];
      vehicleTypesData = data.vehicles || [];

      if (!serviceSelect) return;

      servicesData.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.id;
        option.textContent = service.name;
        serviceSelect.appendChild(option);
      });

      if (pendingServiceId) {
        applyServiceSelection(pendingServiceId);
        pendingServiceId = null;
      }
    })
    .catch((err) => console.error("Lỗi load JSON:", err));

  // ===== SERVICE =====
  if (serviceSelect) {
    serviceSelect.addEventListener("change", function () {
      resetSelect(vehicleType, "Chọn loại xe");
      resetSelect(brandSelect, "Chọn hãng");
      resetSelect(itemSelect, "Chọn phụ tùng / sửa chữa");
      clearPrice();

      // Hiển thị danh sách loại xe từ vehicleTypesData
      if (!vehicleType) return;

      vehicleTypesData.forEach((vehicle) => {
        const option = document.createElement("option");
        option.value = vehicle.type;
        option.textContent = vehicle.type;
        vehicleType.appendChild(option);
      });
    });
  }

  // ===== VEHICLE TYPE =====
  if (vehicleType) {
    vehicleType.addEventListener("change", function () {
      resetSelect(brandSelect, "Chọn hãng");
      resetSelect(itemSelect, "Chọn phụ tùng / sửa chữa");
      clearPrice();

      // Cập nhật survey fee
      if (surveyInput) {
        surveyInput.value = getCurrentSurveyFee().toLocaleString("vi-VN");
      }

      // Hiển thị danh sách hãng xe của loại xe được chọn
      const selectedVehicleType = vehicleTypesData.find(
        (v) => v.type === this.value,
      );
      if (!selectedVehicleType) return;

      const brands = selectedVehicleType.brands || [];
      brands.forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.name;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
      });
    });
  }

  // ===== BRAND =====
  if (brandSelect) {
    brandSelect.addEventListener("change", function () {
      resetSelect(itemSelect, "Chọn phụ tùng / sửa chữa");
      clearPrice();

      // Tìm loại xe được chọn
      const selectedVehicleType = vehicleTypesData.find(
        (v) => v.type === (vehicleType && vehicleType.value),
      );
      if (!selectedVehicleType) return;

      // Tìm hãng được chọn
      const selectedBrand = selectedVehicleType.brands.find(
        (b) => b.name === this.value,
      );
      if (!selectedBrand) return;

      // Hiển thị danh sách mẫu xe của hãng được chọn
      const models = selectedBrand.models || [];
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.vehicle_name || model.name;
        itemSelect.appendChild(option);
      });
    });
  }

  // ===== ITEM =====
  if (itemSelect) {
    itemSelect.addEventListener("change", function () {
      const option = this.options[this.selectedIndex];

      if (!option || !option.value) {
        clearPrice();
        return;
      }

      const service = servicesData.find((s) => s.id == serviceSelect.value);
      const servicePrice = Number(service?.service_price || 0);
      const surveyFee = getCurrentSurveyFee();

      const totalMin = servicePrice + minTransport + surveyFee;
      const totalMax = servicePrice + maxTransport + surveyFee;

      if (priceInput) {
        priceInput.value = servicePrice.toLocaleString("vi-VN");
      }

      if (surveyInput) {
        surveyInput.value = surveyFee.toLocaleString("vi-VN");
      }

      if (totalInput) {
        totalInput.value =
          totalMin.toLocaleString("vi-VN") +
          " - " +
          totalMax.toLocaleString("vi-VN");
      }
    });
  }

  mapPickerInit();
  // ===== HELPER =====
  function resetSelect(select, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
  }

  function clearPrice() {
    if (priceInput) priceInput.value = "";
    if (totalInput) totalInput.value = "";
  }
  const autoFillBtn = document.getElementById("autoFillBtn");
  if (autoFillBtn) {
    autoFillBtn.addEventListener("click", function () {
      const customer = this.dataset.customer;
      const phone = this.dataset.phone;
      const address = this.dataset.address;

      document.getElementById("nameCustomer").value = customer;
      document.getElementById("phoneCustomer").value = phone;
      document.getElementById("addressInput").value = address;
    });
  }

  bindQuickBookingButtons();

  initBookingConfirmFlow();
}

function initBookingConfirmFlow() {
  const form = document.getElementById("bookingForm");
  const bookingModalEl = document.getElementById("bookingModal");
  const confirmModalEl = document.getElementById("bookingConfirmModal");

  if (!form || !bookingModalEl || !confirmModalEl) return;
  if (form.dataset.confirmFlowBound === "true") return;
  form.dataset.confirmFlowBound = "true";

  const serviceSelect = document.getElementById("serviceSelect");
  const vehicleType = document.getElementById("vehicleType");
  const brandSelect = document.getElementById("brandSelect");
  const itemSelect = document.getElementById("itemSelect");
  const addressInput = document.getElementById("addressInput");

  const priceInput = document.getElementById("price-contact");
  const surveyInput = document.getElementById("survey-fee");
  const transportInput = document.getElementById("transport-fee");
  const totalInput = document.getElementById("total-price");

  const datetimeInput = form.querySelector('input[type="datetime-local"]');
  const noteInput = form.querySelector("textarea");

  function normalizeValue(value) {
    if (value == null) return "-";
    const text = String(value).trim();
    return text || "-";
  }

  function selectedText(select) {
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    if (!option) return "";
    const value = String(option.value || "").trim();
    if (!value) return "";
    return option.textContent || "";
  }

  function renderSummary() {
    const summary = {
      confirmName: document.getElementById("nameCustomer")?.value,
      confirmPhone: document.getElementById("phoneCustomer")?.value,
      confirmService: selectedText(serviceSelect),
      confirmVehicleType: selectedText(vehicleType),
      confirmBrand: selectedText(brandSelect),
      confirmItem: selectedText(itemSelect),
      confirmDatetime: datetimeInput?.value,
      confirmAddress: addressInput?.value,
      confirmPrice: priceInput?.value,
      confirmSurvey: surveyInput?.value,
      confirmTransport: transportInput?.value,
      confirmTotal: totalInput?.value,
      confirmNote: noteInput?.value,
    };

    Object.entries(summary).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = normalizeValue(value);
    });
  }

  function backToBookingModal() {
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
    bootstrap.Modal.getOrCreateInstance(bookingModalEl).show();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    renderSummary();

    bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
  });

  const backBtn = document.getElementById("confirmBackBtn");
  const closeBtn = document.getElementById("confirmCloseBtn");
  const confirmBtn = document.getElementById("confirmSubmitBtn");

  if (backBtn) {
    backBtn.addEventListener("click", backToBookingModal);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", backToBookingModal);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
      bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();

      alert(
        "Cảm ơn bạn đã đặt dịch vụ! Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.",
      );

      form.reset();
    });
  }
}

function mapPickerInit() {
  const locateBtn = document.getElementById("locateBtn");
  const toggleMapBtn = document.getElementById("toggleMapBtn");
  const bookingModal = document.getElementById("bookingModal");

  if (locateBtn && !locateBtn.dataset.loaded) {
    locateBtn.dataset.loaded = "true";

    locateBtn.addEventListener("click", function () {
      locateBtn.disabled = true;
      locateBtn.innerHTML = "Đang lấy vị trí...";

      try {
        mapPicker.gps();
      } finally {
        setTimeout(() => {
          locateBtn.disabled = false;
          locateBtn.innerHTML =
            '<i class="fas fa-location-arrow"></i> Vị trí hiện tại';
        }, 500);
      }
    });
  }

  if (toggleMapBtn && !toggleMapBtn.dataset.loaded) {
    toggleMapBtn.dataset.loaded = "true";
    toggleMapBtn.addEventListener("click", function () {
      mapPicker.toggle();
    });
  }

  if (bookingModal && !bookingModal.dataset.mapSyncLoaded) {
    bookingModal.dataset.mapSyncLoaded = "true";
    bookingModal.addEventListener("shown.bs.modal", function () {
      setTimeout(() => mapPicker.refresh(), 80);
    });
  }
}
// document.addEventListener("DOMContentLoaded", function () {
//   const locateBtn = document.getElementById("locateBtn");
//   const addressInput = document.getElementById("addressInput");
//   if (locateBtn) {
//     locateBtn.addEventListener("click", function () {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           function (position) {
//             const lat = position.coords.latitude;
//             const lng = position.coords.longitude;
//             // use Nominatim reverse geocoding
//             fetch(
//               `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
//             )
//               .then((res) => res.json())
//               .then((data) => {
//                 if (data && data.display_name) {
//                   addressInput.value = data.display_name;
//                 } else {
//                   alert("Không thể xác định địa chỉ");
//                 }
//               })
//               .catch((e) => console.error(e));
//           },
//           function (err) {
//             alert("Không thể lấy vị trí: " + err.message);
//           },
//         );
//       } else {
//         alert("Trình duyệt không hỗ trợ định vị");
//       }
//     });
//   }
// });
