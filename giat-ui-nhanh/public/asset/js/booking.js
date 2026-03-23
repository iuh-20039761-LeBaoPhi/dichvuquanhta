const BOOKING_MODAL_SOURCE = "dat-dich-vu.html";
const BOOKING_MODAL_STYLE_ID = "bookingModalInlineStyles";
const BOOKING_MODAL_EMBED_FIX_STYLE_ID = "bookingModalEmbedFixStyles";
let bookingModalLoadPromise = null;

function injectBookingModalStyles(doc) {
  if (document.getElementById(BOOKING_MODAL_STYLE_ID)) {
    return;
  }

  const styleNodes = Array.from(doc.querySelectorAll("style")).filter((node) =>
    /#bookingModal|#bookingConfirmModal/.test(node.textContent || ""),
  );

  if (!styleNodes.length) {
    return;
  }

  const styleTag = document.createElement("style");
  styleTag.id = BOOKING_MODAL_STYLE_ID;
  styleTag.textContent = styleNodes
    .map((node) => node.textContent || "")
    .join("\n");

  document.head.appendChild(styleTag);
}

function injectBookingModalEmbedFixStyles() {
  if (document.getElementById(BOOKING_MODAL_EMBED_FIX_STYLE_ID)) {
    return;
  }

  const styleTag = document.createElement("style");
  styleTag.id = BOOKING_MODAL_EMBED_FIX_STYLE_ID;
  styleTag.textContent = `
    #modalContainer #bookingModal.modal {
      display: none !important;
      position: fixed !important;
      inset: 0 !important;
      z-index: 2005 !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      background: transparent !important;
    }

    #modalContainer #bookingModal.modal.show {
      display: block !important;
    }

    #modalContainer #bookingModal.fade {
      opacity: 0 !important;
    }

    #modalContainer #bookingModal.fade.show {
      opacity: 1 !important;
    }
  `;

  document.head.appendChild(styleTag);
}

function extractBookingModalMarkup(rawHtml) {
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(rawHtml, "text/html");

  const bookingModal = parsedDoc.getElementById("bookingModal");
  const bookingConfirmModal = parsedDoc.getElementById("bookingConfirmModal");

  if (!bookingModal) {
    return { html: rawHtml, doc: parsedDoc };
  }

  const html = [bookingModal.outerHTML, bookingConfirmModal?.outerHTML || ""]
    .join("\n")
    .trim();

  return { html, doc: parsedDoc };
}

function ensureBookingModalLoaded(container = null) {
  if (document.getElementById("bookingModal")) {
    initBookingModal();
    return Promise.resolve();
  }

  if (bookingModalLoadPromise) {
    return bookingModalLoadPromise;
  }

  bookingModalLoadPromise = fetch(BOOKING_MODAL_SOURCE)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Không thể tải nội dung modal đặt dịch vụ");
      }

      return res.text();
    })
    .then((rawHtml) => {
      const { html, doc } = extractBookingModalMarkup(rawHtml);
      injectBookingModalStyles(doc);
      injectBookingModalEmbedFixStyles();

      const target =
        container ||
        document.getElementById("modalContainer") ||
        document.body.appendChild(document.createElement("div"));

      if (!target.id) {
        target.id = "modalContainer";
      }

      target.innerHTML = html;
      initBookingModal();
    })
    .catch((error) => {
      bookingModalLoadPromise = null;
      throw error;
    });

  return bookingModalLoadPromise;
}

window.BookingModalManager = window.BookingModalManager || {};
window.BookingModalManager.mount = function (
  containerSelector = "#modalContainer",
) {
  const container =
    typeof containerSelector === "string"
      ? document.querySelector(containerSelector)
      : containerSelector;

  return ensureBookingModalLoaded(container || null);
};

window.BookingModalManager.open = function (serviceId = null) {
  return ensureBookingModalLoaded().then(() => {
    const bookingModal = document.getElementById("bookingModal");
    if (!bookingModal) return;

    bootstrap.Modal.getOrCreateInstance(bookingModal).show();

    if (serviceId != null) {
      const serviceSelect = document.getElementById("serviceContact");
      if (serviceSelect) {
        const normalized = String(serviceId);
        const hasOption = Array.from(serviceSelect.options).some(
          (opt) => String(opt.value) === normalized,
        );

        if (hasOption) {
          serviceSelect.value = normalized;
          serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          bookingModal.dataset.pendingServiceId = normalized;
        }
      }
    }
  });
};

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
        addr.dataset.lat = String(lat);
        addr.dataset.lng = String(lng);
        addr.dataset.coordAddress = addr.value;
        if (addr.value) {
          marker.bindPopup(`<small>${addr.value}</small>`).openPopup();
        }

        addr.dispatchEvent(new Event("input", { bubbles: true }));
        addr.dispatchEvent(new Event("change", { bubbles: true }));
      })
      .catch(() => {
        addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";
        addr.value = `Vĩ độ ${lat.toFixed(6)}, Kinh độ ${lng.toFixed(6)}`;
        addr.dataset.lat = String(lat);
        addr.dataset.lng = String(lng);
        addr.dataset.coordAddress = addr.value;
        addr.dispatchEvent(new Event("input", { bubbles: true }));
        addr.dispatchEvent(new Event("change", { bubbles: true }));
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
  const modalContainer = document.getElementById("modalContainer");
  const bookingModal = document.getElementById("bookingModal");

  if (bookingModal) {
    initBookingModal();
    return;
  }

  if (modalContainer) {
    ensureBookingModalLoaded(modalContainer).catch((err) => {
      console.error(err);
      initBookingModal();
    });
    return;
  }

  initBookingModal();
});

function initBookingModal() {
  const bookingModal = document.getElementById("bookingModal");
  if (bookingModal && bookingModal.dataset.bookingInitDone === "true") {
    return;
  }

  if (bookingModal) {
    bookingModal.dataset.bookingInitDone = "true";
    if (bookingModal.dataset.pendingServiceId && !pendingQuickServiceId) {
      pendingQuickServiceId = bookingModal.dataset.pendingServiceId;
    }
    if (bookingModal.dataset.pendingServiceId) {
      delete bookingModal.dataset.pendingServiceId;
    }
  }

  const serviceSelect = document.getElementById("serviceContact");
  const transportOptionSelect = document.getElementById("transportOption");
  const workItemsList = document.getElementById("workItemsList");
  const chemicalsList = document.getElementById("chemicalsList");
  const workItemsGroup = workItemsList?.closest(".form-group");
  const chemicalsGroup = chemicalsList?.closest(".form-group");
  const bookingModalEl = document.getElementById("bookingModal");

  const kgBox = document.getElementById("kgBox");
  const pairBox = document.getElementById("pairBox");

  const kgInput = document.getElementById("kg");
  const pairInput = document.getElementById("pair");
  const quantityInput = document.getElementById("quantityContact");
  const bookingForm = document.getElementById("contactForm");

  const priceInput = document.getElementById("priceContact");
  const shipInput = document.getElementById("ship");
  const shippingSurchargeInput = document.getElementById("shippingSurcharge");
  const totalInput = document.getElementById("total");
  const addressInput = document.getElementById("addressInput");

  // ❗ nếu chưa load xong modal thì thoát
  if (!serviceSelect) return;

  let transportFee = 0;
  shipInput.value = transportFee.toLocaleString("vi-VN");

  function parseIntegerLike(value) {
    const normalized = String(value == null ? "" : value).replace(/\D/g, "");
    return Number(normalized || 0);
  }

  function setShippingSurchargeDisplay(value) {
    const rawValue = Math.max(0, Math.round(Number(value) || 0));
    if (!shippingSurchargeInput) return;

    shippingSurchargeInput.type = "text";
    shippingSurchargeInput.inputMode = "numeric";
    shippingSurchargeInput.readOnly = true;
    shippingSurchargeInput.dataset.rawValue = String(rawValue);
    shippingSurchargeInput.value = rawValue.toLocaleString("vi-VN");
  }

  if (shippingSurchargeInput) {
    setShippingSurchargeDisplay(0);
  }

  let services = [];
  let providerLocation = null;
  let latestDistanceKm = null;
  let latestDistanceSource = null;
  let transportCalcToken = 0;
  let addressCalcTimer = null;

  function ensureShippingDistanceNoteElement() {
    if (!shippingSurchargeInput) return null;

    let noteEl = document.getElementById("shippingDistanceNote");
    if (noteEl) return noteEl;

    noteEl = document.createElement("small");
    noteEl.id = "shippingDistanceNote";
    noteEl.className = "text-muted d-block mt-1";
    noteEl.textContent = "";

    shippingSurchargeInput.insertAdjacentElement("afterend", noteEl);
    return noteEl;
  }

  const shippingDistanceNoteEl = ensureShippingDistanceNoteElement();

  function setShippingDistanceDisplay(distanceKm, source = null) {
    if (!shippingDistanceNoteEl) return;

    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      shippingDistanceNoteEl.textContent = "";
      return;
    }

    const suffix =
      source === "fallback"
        ? " (ước tính theo tọa độ)"
        : " (quãng đường thực tế)";

    shippingDistanceNoteEl.textContent = `Quãng đường: ${distanceKm.toFixed(1)} km${suffix}`;
  }

  function isValidCoordinate(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function haversineDistanceKm(from, to) {
    const R = 6371;
    const toRad = (deg) => (Number(deg) * Math.PI) / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getCachedCustomerCoords() {
    if (!addressInput) return null;

    const currentAddress = String(addressInput.value || "").trim();
    const coordAddress = String(addressInput.dataset.coordAddress || "").trim();
    const lat = Number(addressInput.dataset.lat);
    const lng = Number(addressInput.dataset.lng);

    if (!currentAddress || !coordAddress || currentAddress !== coordAddress) {
      return null;
    }

    if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
      return null;
    }

    return { lat, lng };
  }

  async function geocodeAddress(address) {
    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(address)}`;
    const res = await fetch(endpoint, {
      headers: { "Accept-Language": "vi" },
    });

    if (!res.ok) {
      throw new Error("Không thể geocode địa chỉ khách hàng");
    }

    const data = await res.json();
    const first = data && data[0];

    if (!first) {
      throw new Error("Không tìm thấy tọa độ từ địa chỉ đã nhập");
    }

    return {
      lat: Number(first.lat),
      lng: Number(first.lon),
    };
  }

  async function getRoadDistanceKm(from, to) {
    const endpoint = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false&steps=false`;
    const res = await fetch(endpoint);

    if (!res.ok) {
      throw new Error("Không thể lấy quãng đường thực tế");
    }

    const data = await res.json();
    const route = data?.routes?.[0];

    if (!route || typeof route.distance !== "number") {
      throw new Error("Không có dữ liệu tuyến đường");
    }

    return route.distance / 1000;
  }

  async function recalculateRoadDistance(force = false) {
    const addressText = (addressInput?.value || "").trim();

    if (!addressText) {
      latestDistanceKm = null;
      latestDistanceSource = null;
      calculate();
      return;
    }

    const token = ++transportCalcToken;

    try {
      if (
        !providerLocation ||
        !isValidCoordinate(providerLocation.lat) ||
        !isValidCoordinate(providerLocation.lng)
      ) {
        throw new Error("Thiếu tọa độ nhà cung cấp");
      }

      const customerCoords =
        getCachedCustomerCoords() || (await geocodeAddress(addressText));
      let distanceKm;

      try {
        distanceKm = await getRoadDistanceKm(providerLocation, customerCoords);
        latestDistanceSource = "road";
      } catch (_routeError) {
        distanceKm = haversineDistanceKm(providerLocation, customerCoords);
        latestDistanceSource = "fallback";
      }

      if (token !== transportCalcToken && !force) {
        return;
      }

      latestDistanceKm = distanceKm;
    } catch (error) {
      if (token !== transportCalcToken && !force) {
        return;
      }

      latestDistanceKm = null;
      latestDistanceSource = null;
      console.error(error);
    } finally {
      if (token === transportCalcToken || force) {
        calculate();
      }
    }
  }

  function scheduleRecalculateRoadDistance(delay = 700) {
    if (addressCalcTimer) {
      clearTimeout(addressCalcTimer);
    }

    addressCalcTimer = setTimeout(() => {
      recalculateRoadDistance();
    }, delay);
  }

  function toggleServiceOptionGroups(visible) {
    if (workItemsGroup) {
      workItemsGroup.style.display = visible ? "block" : "none";
    }
    if (chemicalsGroup) {
      chemicalsGroup.style.display = visible ? "block" : "none";
    }
  }

  toggleServiceOptionGroups(false);

  function renderCheckboxList(container, items, name) {
    if (!container) return;

    if (!items || !items.length) {
      container.innerHTML =
        '<span class="text-muted small">Không có dữ liệu.</span>';
      return;
    }

    let html = "";
    items.forEach((item, index) => {
      const value = String(item);
      const inputId = `${name}_${index}`;
      html += `
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="${inputId}" name="${name}" value="${value}" checked>
          <label class="form-check-label" for="${inputId}">${value}</label>
        </div>
      `;
    });

    container.innerHTML = html;
  }

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
      const servicesData = Array.isArray(data)
        ? data
        : Array.isArray(data?.services)
          ? data.services
          : [];

      if (data && !Array.isArray(data)) {
        providerLocation = {
          lat: Number(data?.provider?.lat),
          lng: Number(data?.provider?.lng),
          address: data?.provider?.address || "",
        };
      }

      services = servicesData.filter((s) => s.price_unit !== "combo");

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

      recalculateRoadDistance(true);
    });

  if (bookingModalEl && !bookingModalEl.dataset.quickServiceSyncLoaded) {
    bookingModalEl.dataset.quickServiceSyncLoaded = "true";
    bookingModalEl.addEventListener("shown.bs.modal", function () {
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
      transportOptionSelect.innerHTML =
        '<option value="">Chọn hình thức nhận / giao</option>';
      renderCheckboxList(workItemsList, [], "work_items");
      renderCheckboxList(chemicalsList, [], "support_chemicals");
      toggleServiceOptionGroups(false);

      kgInput.value = "";
      pairInput.value = "";

      kgBox.style.display = "block";
      pairBox.style.display = "none";

      priceInput.value = "";
      shipInput.value = "";
      totalInput.value = "";
      if (shippingSurchargeInput) {
        setShippingSurchargeDisplay(0);
      }
      setShippingDistanceDisplay(null);
      if (quantityInput) quantityInput.value = "1";
      return;
    }

    transportOptionSelect.innerHTML =
      '<option value="">Chọn hình thức nhận / giao</option>';

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    (service.transport_options || []).forEach((transportOption) => {
      const option = document.createElement("option");
      option.value = transportOption.name;
      option.textContent = `${transportOption.name} (${Number(
        transportOption.price || 0,
      ).toLocaleString("vi-VN")} VND)`;
      option.dataset.price = Number(transportOption.price || 0);
      transportOptionSelect.appendChild(option);
    });

    if (transportOptionSelect.options.length > 1) {
      transportOptionSelect.selectedIndex = 1;
    }

    transportFee = Number(
      transportOptionSelect.options[transportOptionSelect.selectedIndex]
        ?.dataset.price || 0,
    );

    const servicePrice = Number(service.price || 0);
    priceInput.value = servicePrice.toLocaleString("vi-VN");
    renderCheckboxList(workItemsList, service.work_items || [], "work_items");
    renderCheckboxList(
      chemicalsList,
      service.support_chemicals || [],
      "support_chemicals",
    );
    toggleServiceOptionGroups(true);

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

  /* CHỌN HÌNH THỨC NHẬN/GIAO */
  transportOptionSelect.addEventListener("change", function () {
    const option = this.options[this.selectedIndex];

    if (!option.value) {
      shipInput.value = "";
      totalInput.value = "";
      if (shippingSurchargeInput) {
        setShippingSurchargeDisplay(0);
      }
      return;
    }

    transportFee = Number(option.dataset.price || 0);

    calculate();
  });

  /* TÍNH TIỀN */
  function calculate() {
    const service = services.find((s) => String(s.id) === serviceSelect.value);
    if (!service) return;

    const price = Number(service.price || 0);

    let quantity = 1;

    if (kgBox.style.display === "block") quantity = Number(kgInput.value);
    if (pairBox.style.display === "block") quantity = Number(pairInput.value);

    if (quantityInput) {
      const normalizedQuantity =
        Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      quantityInput.value = String(normalizedQuantity);
    }

    const totalWeight =
      Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    const selectedWorkItemCount = bookingForm
      ? bookingForm.querySelectorAll('input[name="work_items"]:checked').length
      : 0;
    const workItemMultiplier =
      selectedWorkItemCount > 0 ? selectedWorkItemCount : 1;

    const isKgUnit = kgBox.style.display === "block";
    const baseServiceAmount = isKgUnit
      ? price + Math.max(0, totalWeight - 1) * 10000
      : price * totalWeight;
    const serviceAmount = baseServiceAmount * workItemMultiplier;

    priceInput.value = Math.round(serviceAmount).toLocaleString("vi-VN");
    const distanceKm =
      Number.isFinite(latestDistanceKm) && latestDistanceKm > 0
        ? latestDistanceKm
        : 0;
    setShippingDistanceDisplay(distanceKm, latestDistanceSource);
    const selectedTransportName = String(
      transportOptionSelect.options[transportOptionSelect.selectedIndex]
        ?.value || "",
    )
      .toLowerCase()
      .trim();
    const extraTransportFee =
      totalWeight >= 50 && selectedTransportName !== "tự lấy" ? 5000 : 0;
    const effectiveTransportFee = transportFee + extraTransportFee;
    const shippingSurcharge =
      distanceKm > 0
        ? (distanceKm * effectiveTransportFee * (totalWeight / 20)) / 4
        : 0;
    const normalizedShippingSurcharge = Math.round(shippingSurcharge);

    shipInput.value = effectiveTransportFee.toLocaleString("vi-VN");
    if (shippingSurchargeInput) {
      setShippingSurchargeDisplay(normalizedShippingSurcharge);
    }

    const total =
      Math.round(serviceAmount) +
      effectiveTransportFee +
      normalizedShippingSurcharge;
    totalInput.value = total.toLocaleString("vi-VN");
  }

  kgInput.addEventListener("input", calculate);
  pairInput.addEventListener("input", calculate);

  if (workItemsList && !workItemsList.dataset.priceSyncBound) {
    workItemsList.dataset.priceSyncBound = "true";
    workItemsList.addEventListener("change", function (event) {
      if (event.target && event.target.name === "work_items") {
        calculate();
      }
    });
  }

  if (addressInput) {
    addressInput.addEventListener("input", function () {
      if (addressInput.dataset.coordAddress !== (addressInput.value || "")) {
        delete addressInput.dataset.lat;
        delete addressInput.dataset.lng;
        delete addressInput.dataset.coordAddress;
      }
      scheduleRecalculateRoadDistance();
    });
    addressInput.addEventListener("change", function () {
      scheduleRecalculateRoadDistance(200);
    });
    addressInput.addEventListener("blur", function () {
      scheduleRecalculateRoadDistance(0);
    });
  }

  initMediaUpload();
  mapPickerInit();

  initBookingConfirmFlow();
}

function initMediaUpload() {
  const form = document.getElementById("contactForm");
  const imageBtn = document.getElementById("capturePhotoBtn");
  const videoBtn = document.getElementById("recordVideoBtn");
  const imageInput = document.getElementById("imageUploadInput");
  const videoInput = document.getElementById("videoUploadInput");
  const imageList = document.getElementById("imagePreviewList");
  const videoList = document.getElementById("videoPreviewList");
  const imageEmpty = document.getElementById("imageEmptyState");
  const videoEmpty = document.getElementById("videoEmptyState");

  if (
    !form ||
    !imageBtn ||
    !videoBtn ||
    !imageInput ||
    !videoInput ||
    !imageList ||
    !videoList ||
    !imageEmpty ||
    !videoEmpty
  ) {
    return;
  }

  if (form.dataset.mediaUploadBound === "true") {
    return;
  }
  form.dataset.mediaUploadBound = "true";

  const mediaState = {
    imageUrls: [],
    videoUrls: [],
  };

  function revokeUrls(type) {
    const key = type === "image" ? "imageUrls" : "videoUrls";
    mediaState[key].forEach((url) => URL.revokeObjectURL(url));
    mediaState[key] = [];
  }

  function toggleEmptyState(type, isEmpty) {
    const emptyEl = type === "image" ? imageEmpty : videoEmpty;
    const listEl = type === "image" ? imageList : videoList;

    emptyEl.style.display = isEmpty ? "flex" : "none";
    listEl.style.display = isEmpty ? "none" : "flex";
  }

  function createItem(name, previewNode) {
    const item = document.createElement("div");
    item.className = "media-item";

    const nameEl = document.createElement("div");
    nameEl.className = "media-name";
    nameEl.title = name;
    nameEl.textContent = name;

    item.appendChild(previewNode);
    item.appendChild(nameEl);
    return item;
  }

  function renderImages(fileList) {
    revokeUrls("image");
    imageList.innerHTML = "";

    const files = Array.from(fileList || []);
    if (!files.length) {
      toggleEmptyState("image", true);
      return;
    }

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      mediaState.imageUrls.push(url);

      const img = document.createElement("img");
      img.className = "media-thumb";
      img.alt = file.name || "Ảnh đã chọn";
      img.src = url;

      imageList.appendChild(createItem(file.name || "image", img));
    });

    toggleEmptyState("image", false);
  }

  function renderVideos(fileList) {
    revokeUrls("video");
    videoList.innerHTML = "";

    const files = Array.from(fileList || []);
    if (!files.length) {
      toggleEmptyState("video", true);
      return;
    }

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      mediaState.videoUrls.push(url);

      const video = document.createElement("video");
      video.className = "media-thumb";
      video.src = url;
      video.controls = true;
      video.preload = "metadata";

      videoList.appendChild(createItem(file.name || "video", video));
    });

    toggleEmptyState("video", false);
  }

  imageBtn.addEventListener("click", function () {
    imageInput.value = "";
    imageInput.click();
  });

  videoBtn.addEventListener("click", function () {
    videoInput.value = "";
    videoInput.click();
  });

  imageInput.addEventListener("change", function () {
    renderImages(imageInput.files);
  });

  videoInput.addEventListener("change", function () {
    renderVideos(videoInput.files);
  });

  form.addEventListener("reset", function () {
    revokeUrls("image");
    revokeUrls("video");
    imageList.innerHTML = "";
    videoList.innerHTML = "";
    toggleEmptyState("image", true);
    toggleEmptyState("video", true);
  });

  toggleEmptyState("image", true);
  toggleEmptyState("video", true);
}

function initBookingConfirmFlow() {
  const form = document.querySelector(".contactForm");
  const bookingModalEl = document.getElementById("bookingModal");
  const confirmModalEl = document.getElementById("bookingConfirmModal");
  const imageInput = document.getElementById("imageUploadInput");
  const videoInput = document.getElementById("videoUploadInput");
  const confirmImages = document.getElementById("confirmImages");
  const confirmVideos = document.getElementById("confirmVideos");
  const confirmMediaUrls = [];

  function parseIntegerLike(value) {
    const normalized = String(value == null ? "" : value).replace(/\D/g, "");
    return Number(normalized || 0);
  }

  if (!form || !bookingModalEl || !confirmModalEl) return;
  if (form.dataset.confirmFlowBound === "true") return;
  form.dataset.confirmFlowBound = "true";
  const isEmbeddedMode = Boolean(bookingModalEl.closest("#modalContainer"));

  function showBookingStep() {
    if (isEmbeddedMode) {
      bootstrap.Modal.getOrCreateInstance(bookingModalEl).show();
      return;
    }

    bookingModalEl.style.display = "block";
    bookingModalEl.classList.add("show");
    bookingModalEl.setAttribute("aria-hidden", "false");
  }

  function hideBookingStep() {
    if (isEmbeddedMode) {
      bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();
      return;
    }

    bookingModalEl.style.display = "none";
    bookingModalEl.classList.remove("show");
    bookingModalEl.setAttribute("aria-hidden", "true");
  }

  function normalizeValue(value) {
    if (value == null) return "-";
    const text = String(value).trim();
    return text || "-";
  }

  function clearConfirmMedia() {
    confirmMediaUrls.forEach((url) => URL.revokeObjectURL(url));
    confirmMediaUrls.length = 0;

    if (confirmImages) {
      confirmImages.innerHTML = '<span class="confirm-media-empty">-</span>';
    }
    if (confirmVideos) {
      confirmVideos.innerHTML = '<span class="confirm-media-empty">-</span>';
    }
  }

  function createConfirmMediaItem(fileName, previewNode) {
    const item = document.createElement("div");
    item.className = "confirm-media-item";

    const nameEl = document.createElement("div");
    nameEl.className = "confirm-media-name";
    nameEl.title = fileName;
    nameEl.textContent = fileName;

    item.appendChild(previewNode);
    item.appendChild(nameEl);
    return item;
  }

  function renderConfirmFileList(container, files, type) {
    if (!container) return;

    container.innerHTML = "";
    const list = Array.from(files || []);

    if (!list.length) {
      container.innerHTML = '<span class="confirm-media-empty">-</span>';
      return;
    }

    list.forEach((file) => {
      const url = URL.createObjectURL(file);
      confirmMediaUrls.push(url);

      let previewNode;
      if (type === "image") {
        previewNode = document.createElement("img");
        previewNode.alt = file.name || "Ảnh";
      } else {
        previewNode = document.createElement("video");
        previewNode.controls = true;
        previewNode.preload = "metadata";
      }

      previewNode.className = "confirm-media-thumb";
      previewNode.src = url;
      container.appendChild(
        createConfirmMediaItem(file.name || type, previewNode),
      );
    });
  }

  function renderConfirmMedia() {
    clearConfirmMedia();
    renderConfirmFileList(confirmImages, imageInput?.files, "image");
    renderConfirmFileList(confirmVideos, videoInput?.files, "video");
  }

  function collectBookingData() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const serviceSelect = document.getElementById("serviceContact");
    const transportOptionSelect = document.getElementById("transportOption");
    const kgInput = document.getElementById("kg");
    const pairInput = document.getElementById("pair");
    const kgBox = document.getElementById("kgBox");
    const pairBox = document.getElementById("pairBox");

    const serviceText =
      serviceSelect?.options[serviceSelect.selectedIndex]?.text;
    const transportOptionText =
      transportOptionSelect?.options[transportOptionSelect.selectedIndex]?.text;

    const isKgVisible = kgBox && getComputedStyle(kgBox).display !== "none";
    const isPairVisible =
      pairBox && getComputedStyle(pairBox).display !== "none";

    const selectedWorkItems = Array.from(
      form.querySelectorAll('input[name="work_items"]:checked'),
    ).map((el) => el.value);
    const selectedChemicals = Array.from(
      form.querySelectorAll('input[name="support_chemicals"]:checked'),
    ).map((el) => el.value);

    let quantity = "";
    if (isKgVisible && kgInput?.value) quantity = `${kgInput.value} kg`;
    if (isPairVisible && pairInput?.value) quantity = `${pairInput.value} đôi`;

    data.service_name =
      serviceText && serviceText !== "Chọn dịch vụ" ? serviceText : "";
    data.sub_service =
      transportOptionText &&
      transportOptionText !== "Chọn hình thức nhận / giao"
        ? transportOptionText
        : "";
    data.quantity = quantity;
    data.price = document.getElementById("priceContact")?.value || "";
    data.ship = document.getElementById("ship")?.value || "";
    const shippingSurchargeEl = document.getElementById("shippingSurcharge");
    const rawShippingSurcharge = parseIntegerLike(
      shippingSurchargeEl?.dataset.rawValue ||
        shippingSurchargeEl?.value ||
        "0",
    );
    data.shipping_surcharge = String(rawShippingSurcharge);
    data.total = document.getElementById("total")?.value || "";
    data.work_items = selectedWorkItems.join(", ");
    data.support_chemicals = selectedChemicals.join(", ");

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
        shippingSurcharge: rawShippingSurcharge.toLocaleString("vi-VN"),
        total: data.total,
        workItems: data.work_items,
        chemicals: data.support_chemicals,
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
      confirmShippingSurcharge: preview.shippingSurcharge,
      confirmTotal: preview.total,
      confirmWorkItems: preview.workItems,
      confirmChemicals: preview.chemicals,
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
    renderConfirmMedia();

    hideBookingStep();
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
  });

  function backToBooking() {
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
    showBookingStep();
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

  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
      hideBookingStep();

      alert(
        "Cảm ơn bạn đã đặt dịch vụ! Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.",
      );

      form.reset();
      clearConfirmMedia();

      if (!isEmbeddedMode) {
        showBookingStep();
      }
    });
  }

  if (!confirmModalEl.dataset.mediaCleanupBound) {
    confirmModalEl.dataset.mediaCleanupBound = "true";
    confirmModalEl.addEventListener("hidden.bs.modal", function () {
      clearConfirmMedia();
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
