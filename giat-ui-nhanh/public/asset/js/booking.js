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

let pendingQuickServiceId = null;

document.addEventListener("DOMContentLoaded", function () {
  fetch("public/component/booking_modal.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("modalContainer").innerHTML = data;

      initBookingModal();
    });
});

function initBookingModal() {
  const serviceSelect = document.getElementById("serviceContact");
  const subServiceSelect = document.getElementById("subService");
  const bookingModal = document.getElementById("bookingModal");

  const kgBox = document.getElementById("kgBox");
  const pairBox = document.getElementById("pairBox");

  const kgInput = document.getElementById("kg");
  const pairInput = document.getElementById("pair");
  const quantityInput = document.getElementById("quantityContact");

  const priceInput = document.getElementById("priceContact");
  const shipInput = document.getElementById("ship");
  const totalInput = document.getElementById("total");

  // ❗ nếu chưa load xong modal thì thoát
  if (!serviceSelect) return;

  const transportFee = 20000;
  shipInput.value = transportFee.toLocaleString("vi-VN");

  let services = [];

  function applyQuickServiceSelection(serviceId) {
    if (!serviceId || !serviceSelect) return false;

    const target = String(serviceId);
    const hasOption = Array.from(serviceSelect.options).some(
      (opt) => String(opt.value) === target,
    );

    if (!hasOption) return false;

    serviceSelect.value = target;
    serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  if (document.body.dataset.quickBookingBound !== "true") {
    document.body.dataset.quickBookingBound = "true";

    document.addEventListener("click", function (e) {
      const triggerBtn = e.target.closest("[data-service-id]");
      if (!triggerBtn) return;

      const serviceId = triggerBtn.dataset.serviceId;
      if (!serviceId) return;

      pendingQuickServiceId = serviceId;

      const modalEl = document.getElementById("bookingModal");
      if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }
    });
  }

  /* LOAD JSON */
  fetch("public/services.json")
    .then((res) => res.json())
    .then((data) => {
      services = data.filter((s) => s.price_unit !== "combo");

      services.forEach((service) => {
        const option = document.createElement("option");

        option.value = service.id;
        option.textContent = service.service_name;
        option.dataset.unit = service.price_unit;

        serviceSelect.appendChild(option);
      });

      if (pendingQuickServiceId) {
        if (applyQuickServiceSelection(pendingQuickServiceId)) {
          pendingQuickServiceId = null;
        }
      }
    });

  if (bookingModal && !bookingModal.dataset.quickServiceSyncLoaded) {
    bookingModal.dataset.quickServiceSyncLoaded = "true";
    bookingModal.addEventListener("shown.bs.modal", function () {
      if (!pendingQuickServiceId) return;

      if (applyQuickServiceSelection(pendingQuickServiceId)) {
        pendingQuickServiceId = null;
      }
    });
  }

  /* CHỌN SERVICE */
  serviceSelect.addEventListener("change", function () {
    const serviceId = Number(this.value);

    if (!serviceId) {
      subServiceSelect.innerHTML =
        '<option value="">Chọn loại dịch vụ</option>';

      kgInput.value = "";
      pairInput.value = "";

      kgBox.style.display = "block";
      pairBox.style.display = "none";

      priceInput.value = "";
      totalInput.value = "";
      if (quantityInput) quantityInput.value = "1";
      return;
    }

    subServiceSelect.innerHTML = '<option value="">Chọn loại dịch vụ</option>';

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    service.sub_services.forEach((sub) => {
      const option = document.createElement("option");

      option.value = sub.id;
      option.textContent = sub.name;
      option.dataset.price = sub.price;

      subServiceSelect.appendChild(option);
    });

    const unit = service.price_unit;

    kgInput.value = 1;
    pairInput.value = 1;

    kgBox.style.display = "none";
    pairBox.style.display = "none";

    if (unit === "kg") kgBox.style.display = "block";
    if (unit === "pair") pairBox.style.display = "block";

    if (quantityInput) {
      quantityInput.value =
        unit === "pair"
          ? String(pairInput.value || 1)
          : String(kgInput.value || 1);
    }

    calculate();
  });

  /* CHỌN SUB SERVICE */
  subServiceSelect.addEventListener("change", function () {
    const option = this.options[this.selectedIndex];

    if (!option.value) {
      priceInput.value = "";
      totalInput.value = "";
      return;
    }

    const price = Number(option.dataset.price);
    priceInput.value = price.toLocaleString("vi-VN");

    calculate();
  });

  /* TÍNH TIỀN */
  function calculate() {
    const subOption = subServiceSelect.options[subServiceSelect.selectedIndex];

    if (!subOption.dataset.price) return;

    const price = Number(subOption.dataset.price);

    let quantity = 1;

    if (kgBox.style.display === "block") quantity = Number(kgInput.value);
    if (pairBox.style.display === "block") quantity = Number(pairInput.value);

    if (quantityInput) {
      const normalizedQuantity =
        Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      quantityInput.value = String(normalizedQuantity);
    }

    const total = price * quantity + transportFee;
    totalInput.value = total.toLocaleString("vi-VN");
  }

  kgInput.addEventListener("input", calculate);
  pairInput.addEventListener("input", calculate);

  mapPickerInit();

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

  initBookingConfirmFlow();
}

function initBookingConfirmFlow() {
  const form = document.querySelector(".contactForm");
  const bookingModalEl = document.getElementById("bookingModal");
  const confirmModalEl = document.getElementById("bookingConfirmModal");

  if (!form || !bookingModalEl || !confirmModalEl) return;
  if (form.dataset.confirmFlowBound === "true") return;
  form.dataset.confirmFlowBound = "true";

  function normalizeValue(value) {
    if (value == null) return "-";
    const text = String(value).trim();
    return text || "-";
  }

  function collectBookingData() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const serviceSelect = document.getElementById("serviceContact");
    const subServiceSelect = document.getElementById("subService");
    const kgInput = document.getElementById("kg");
    const pairInput = document.getElementById("pair");
    const kgBox = document.getElementById("kgBox");
    const pairBox = document.getElementById("pairBox");

    const serviceText =
      serviceSelect?.options[serviceSelect.selectedIndex]?.text;
    const subServiceText =
      subServiceSelect?.options[subServiceSelect.selectedIndex]?.text;

    const isKgVisible = kgBox && getComputedStyle(kgBox).display !== "none";
    const isPairVisible =
      pairBox && getComputedStyle(pairBox).display !== "none";

    let quantity = "";
    if (isKgVisible && kgInput?.value) quantity = `${kgInput.value} kg`;
    if (isPairVisible && pairInput?.value) quantity = `${pairInput.value} đôi`;

    data.service_name =
      serviceText && serviceText !== "Chọn dịch vụ" ? serviceText : "";
    data.sub_service =
      subServiceText && subServiceText !== "Chọn loại dịch vụ"
        ? subServiceText
        : "";
    data.quantity = quantity;
    data.price = document.getElementById("priceContact")?.value || "";
    data.ship = document.getElementById("ship")?.value || "";
    data.total = document.getElementById("total")?.value || "";

    return {
      data,
      preview: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        service: data.service_name,
        subService: data.sub_service,
        quantity: data.quantity,
        price: data.price,
        ship: data.ship,
        total: data.total,
        message: data.message,
      },
    };
  }

  function renderConfirmModal(preview) {
    const fields = {
      confirmName: preview.name,
      confirmPhone: preview.phone,
      confirmAddress: preview.address,
      confirmService: preview.service,
      confirmSubService: preview.subService,
      confirmQuantity: preview.quantity,
      confirmPrice: preview.price,
      confirmShip: preview.ship,
      confirmTotal: preview.total,
      confirmMessage: preview.message,
    };

    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = normalizeValue(value);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const { preview } = collectBookingData();
    renderConfirmModal(preview);

    bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
  });

  function backToBooking() {
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
    bootstrap.Modal.getOrCreateInstance(bookingModalEl).show();
  }

  const backBtn = document.getElementById("confirmBackBtn");
  const closeBtn = document.getElementById("confirmCloseBtn");
  const confirmBtn = document.getElementById("confirmSubmitBtn");

  if (backBtn) {
    backBtn.addEventListener("click", backToBooking);
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", backToBooking);
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

function initBookingCombo() {
  const form = document.querySelector(".contactFormCombo");
  const comboModalEl = document.getElementById("myModal");
  const comboConfirmModalEl = document.getElementById("comboConfirmModal");
  const serviceSelect = document.getElementById("service");
  const priceInput = document.getElementById("price");

  if (
    !form ||
    !comboModalEl ||
    !comboConfirmModalEl ||
    !serviceSelect ||
    !priceInput
  )
    return;

  // Tránh bind trùng sự kiện nếu hàm bị gọi lại
  if (serviceSelect.dataset.comboBound !== "true") {
    serviceSelect.dataset.comboBound = "true";

    serviceSelect.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];

      if (!selectedOption || !selectedOption.value) {
        priceInput.value = "";
        return;
      }

      const selectedPrice = Number(selectedOption.dataset.price || 0);
      priceInput.value = Number.isFinite(selectedPrice) ? selectedPrice : "";
    });
  }

  // Xóa option cũ (giữ lại option mặc định) để tránh bị lặp
  serviceSelect.innerHTML = '<option value="">Chọn gói dịch vụ</option>';
  priceInput.value = "";

  Promise.all([
    fetch("public/services.json").then((res) => res.json()),
    fetch("public/discount.json").then((res) => res.json()),
  ])
    .then(([servicesData, discounts]) => {
      function isDiscountActive(discount) {
        const today = new Date();
        const start = new Date(discount.start_date);
        const end = new Date(discount.end_date);
        return today >= start && today <= end;
      }

      function getDiscount(serviceId) {
        return discounts.find(
          (d) => Number(d.service_id) === Number(serviceId),
        );
      }

      // Lọc combo
      const services = servicesData.filter(
        (service) => service.price_unit === "combo",
      );

      services.forEach((service) => {
        const price = service.sub_services[0].price;

        // 🔥 lấy discount
        const discount = getDiscount(service.id);

        let finalPrice = price;
        let label = "";

        if (discount && isDiscountActive(discount)) {
          finalPrice = price - (price * discount.discount_percent) / 100;
          label = ` (${discount.label})`;
        }

        const option = document.createElement("option");

        option.value = service.id;

        // Hiển thị tên gói kèm nhãn khuyến mãi (nếu có)
        option.textContent = service.service_name;

        // Lưu giá cuối cùng để khi chọn option sẽ cập nhật đúng vào input giá
        option.dataset.price = finalPrice;

        option.dataset.originalPrice = price; // nếu cần
        option.dataset.unit = service.price_unit;

        serviceSelect.appendChild(option);
      });

      // Nếu có sẵn lựa chọn (ví dụ trình duyệt giữ state), đồng bộ lại giá
      if (serviceSelect.value) {
        serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })
    .catch((err) => console.log(err));

  initComboConfirmFlow(form, comboModalEl, comboConfirmModalEl);

  const autoFillBtn = document.getElementById("autoFillBtnCombo");
  if (autoFillBtn) {
    autoFillBtn.addEventListener("click", function () {
      const customer = this.dataset.customer;
      const phone = this.dataset.phone;
      const address = this.dataset.address;

      document.getElementById("name").value = customer;
      document.getElementById("phone").value = phone;
      document.getElementById("address").value = address;
    });
  }
}

function initComboConfirmFlow(form, comboModalEl, comboConfirmModalEl) {
  if (!form || !comboModalEl || !comboConfirmModalEl) return;
  if (form.dataset.comboConfirmBound === "true") return;
  form.dataset.comboConfirmBound = "true";

  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");
  const addressInput = document.getElementById("address");
  const serviceSelect = document.getElementById("service");
  const priceInput = document.getElementById("price");
  const quantityInput = document.getElementById("quantity");
  const messageInput = document.getElementById("message");

  const backBtn = document.getElementById("comboConfirmBackBtn");
  const closeBtn = document.getElementById("comboConfirmCloseBtn");
  const confirmBtn = document.getElementById("comboConfirmSubmitBtn");

  function normalize(value) {
    if (value == null) return "-";
    const text = String(value).trim();
    return text || "-";
  }

  function renderComboSummary() {
    const selectedService =
      serviceSelect?.options[serviceSelect.selectedIndex]?.textContent || "";

    const summary = {
      comboConfirmName: nameInput?.value,
      comboConfirmPhone: phoneInput?.value,
      comboConfirmAddress: addressInput?.value,
      comboConfirmService: selectedService,
      comboConfirmPrice: priceInput?.value
        ? `${Number(priceInput.value).toLocaleString("vi-VN")} VNĐ`
        : "",
      comboConfirmQuantity: quantityInput?.value + " Gói",
      comboConfirmMessage: messageInput?.value,
    };

    Object.entries(summary).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = normalize(value);
    });
  }

  function backToComboForm() {
    bootstrap.Modal.getOrCreateInstance(comboConfirmModalEl).hide();
    bootstrap.Modal.getOrCreateInstance(comboModalEl).show();
  }

  form.addEventListener("submit", function (e) {
    if (form.dataset.comboConfirmed === "true") {
      form.dataset.comboConfirmed = "false";
      return;
    }

    e.preventDefault();
    renderComboSummary();

    bootstrap.Modal.getOrCreateInstance(comboModalEl).hide();
    bootstrap.Modal.getOrCreateInstance(comboConfirmModalEl).show();
  });

  if (backBtn) backBtn.addEventListener("click", backToComboForm);
  if (closeBtn) closeBtn.addEventListener("click", backToComboForm);
}

document.addEventListener("DOMContentLoaded", function () {
  fetch("public/component/booking_combo.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("bookingCombo").innerHTML = data;

      initBookingCombo();
    });
});
