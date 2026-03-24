const BOOKING_MODAL_SOURCE = "dat-dich-vu.html";
const BOOKING_MODAL_STYLE_ID = "bookingModalInlineStyles";
const BOOKING_MODAL_EMBED_FIX_STYLE_ID = "bookingModalEmbedFixStyles";
const BOOKING_GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbzGk9VOSebrVPRhBtXpOZyBpXaYZpzbvPD3hQ5oQ7uIGnn2HXBv2bBqJ6ouOpZ3g_kENA/exec";
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
      const serviceSelect = document.getElementById("serviceSelect");
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
    if (map) {
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map);
      map.panTo([lat, lng]);
    }

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
          addr.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }

        addr.value = buildDetailedAddress(data.address, data.display_name);
        addr.dispatchEvent(new Event("change", { bubbles: true }));
        if (addr.value && marker) {
          marker.bindPopup(`<small>${addr.value}</small>`).openPopup();
        }
      })
      .catch(() => {
        addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";
        addr.value = `Vĩ độ ${lat.toFixed(6)}, Kinh độ ${lng.toFixed(6)}`;
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
                if (map) {
                  map.setView([lat, lng], 16);
                }
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
  }

  // ===== ELEMENT =====
  const serviceSelect = document.getElementById("serviceSelect");
  const vehicleType = document.getElementById("vehicleType");
  const brandSelect = document.getElementById("brandSelect");
  const itemSelect = document.getElementById("itemSelect");
  const customItemInputWrapper = document.getElementById(
    "customItemInputWrapper",
  );
  const customItemInput = document.getElementById("customItemInput");
  const datetimeInput = document.querySelector(
    '#bookingForm input[type="datetime-local"]',
  );

  const priceInput = document.getElementById("price-contact");
  const transportInput = document.getElementById("transport-fee");
  const surveyInput = document.getElementById("survey-fee");
  const totalInput = document.getElementById("total-price");
  const addressInput = document.getElementById("addressInput");
  const estimateServicePrice = document.getElementById("estimateServicePrice");
  const estimateTransportFee = document.getElementById("estimateTransportFee");
  const estimateTempTotal = document.getElementById("estimateTempTotal");
  const estimateTransportOnly = document.getElementById(
    "estimateTransportOnly",
  );
  const estimateSurveyOnly = document.getElementById("estimateSurveyOnly");
  const estimateNoFixTotal = document.getElementById("estimateNoFixTotal");
  const estimateSummaryBlock = document.getElementById("estimateSummaryBlock");

  let servicesData = [];
  let providerLocation = null;
  let transportPerKm = 0;
  let transportMinFee = 0;
  let transportMaxFee = 0;
  let latestDistanceKm = null;
  let transportFeeValue = 0;
  let transportCalcToken = 0;
  let addressCalcTimer = null;
  let pendingServiceId = bookingModal?.dataset.pendingServiceId || null;
  if (bookingModal && bookingModal.dataset.pendingServiceId) {
    delete bookingModal.dataset.pendingServiceId;
  }

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
        if (bookingModal) {
          bookingModal.dataset.pendingServiceId = String(serviceId);
        }
      }
    });
  }

  function toggleCustomItemInput(force = null) {
    if (!itemSelect || !customItemInputWrapper || !customItemInput) return;

    const useCustom =
      force == null
        ? String(itemSelect.value || "") === "__other__"
        : Boolean(force);

    customItemInputWrapper.classList.toggle("d-none", !useCustom);
    customItemInput.required = useCustom;

    if (!useCustom) {
      customItemInput.value = "";
    }
  }

  function getCurrentDateTimeLocalValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function fillCurrentDateTime() {
    if (!datetimeInput) return;
    datetimeInput.value = getCurrentDateTimeLocalValue();
  }

  function ensureOtherModelOption() {
    if (!itemSelect) return;

    const hasOtherOption = Array.from(itemSelect.options).some(
      (option) => String(option.value) === "__other__",
    );

    if (hasOtherOption) return;

    const otherOption = document.createElement("option");
    otherOption.value = "__other__";
    otherOption.textContent = "Khác (nhập mẫu xe)";
    itemSelect.appendChild(otherOption);
  }

  // ===== PHÍ =====
  let vehicleTypesData = [];

  function getSelectedServicePrice() {
    if (!serviceSelect || !serviceSelect.value) return 0;
    const service = servicesData.find(
      (s) => String(s.id) === serviceSelect.value,
    );
    return Number(service?.service_price || 0);
  }

  function getDistanceThresholdKm() {
    return Number(transportPerKm || 0);
  }

  function getTransportMinFee() {
    return Number(transportMinFee || 0);
  }

  function getTransportMaxFee() {
    return Number(transportMaxFee || 0);
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function formatCurrencyVND(value) {
    return `${formatCurrency(value)}đ`;
  }

  function calculateTransportFeeByThreshold(distanceKm) {
    const thresholdKm = getDistanceThresholdKm();
    const minFee = getTransportMinFee();
    const maxFee = getTransportMaxFee();
    const perKmIncrease = 5000;
    const billableKm = Math.max(0, Math.ceil(Number(distanceKm || 0)));

    if (!Number.isFinite(distanceKm)) {
      return minFee;
    }

    if (thresholdKm > 0 && distanceKm < thresholdKm) {
      return minFee + billableKm * perKmIncrease;
    }

    const baseFee = maxFee > 0 ? maxFee : minFee;
    return baseFee + billableKm * perKmIncrease;
  }

  function updateTotalPrice() {
    const servicePrice = getSelectedServicePrice();
    const surveyFee = getCurrentSurveyFee();
    const transportFee = Number(transportFeeValue || 0);
    const total = servicePrice + surveyFee + transportFee;
    const noFixTotal = surveyFee + transportFee;

    if (priceInput) {
      priceInput.value = servicePrice > 0 ? formatCurrency(servicePrice) : "";
    }

    if (surveyInput) {
      surveyInput.value = surveyFee > 0 ? formatCurrency(surveyFee) : "";
    }

    if (totalInput) {
      totalInput.value = total > 0 ? formatCurrency(total) : "";
    }

    if (estimateServicePrice) {
      estimateServicePrice.textContent =
        servicePrice > 0 ? formatCurrencyVND(servicePrice) : "-";
    }

    if (estimateTransportOnly) {
      estimateTransportOnly.textContent =
        transportFee > 0 ? formatCurrencyVND(transportFee) : "-";
    }

    if (estimateSurveyOnly) {
      estimateSurveyOnly.textContent =
        surveyFee > 0 ? formatCurrencyVND(surveyFee) : "-";
    }

    if (estimateNoFixTotal) {
      estimateNoFixTotal.textContent =
        noFixTotal > 0 ? formatCurrencyVND(noFixTotal) : "-";
    }

    if (estimateTempTotal) {
      estimateTempTotal.textContent =
        total > 0 ? formatCurrencyVND(total) : "-";
    }
  }

  function updateEstimateVisibility() {
    if (!estimateSummaryBlock || !serviceSelect) return;

    if (String(serviceSelect.value || "").trim()) {
      estimateSummaryBlock.classList.remove("d-none");
    } else {
      estimateSummaryBlock.classList.add("d-none");
    }
  }

  function setTransportFeeDisplay(value, opts = {}) {
    const { pending = false, suffix = "", displayText = "" } = opts;

    if (!transportInput) return;

    if (pending) {
      transportInput.value = "Đang tính...";
      if (estimateTransportFee) {
        estimateTransportFee.textContent = "Đang tính...";
      }
      return;
    }

    if (displayText) {
      transportInput.value = displayText;
      if (estimateTransportFee) {
        estimateTransportFee.textContent = displayText;
      }
      return;
    }

    if (value == null || Number.isNaN(Number(value))) {
      transportInput.value = "";
      return;
    }

    const rendered = `${formatCurrency(value)}${suffix ? ` (${suffix})` : ""}`;
    transportInput.value = rendered;

    if (estimateTransportFee) {
      let suffixText = "";
      if (suffix) {
        suffixText = /km$/i.test(suffix.trim())
          ? ` (~${suffix.trim()})`
          : ` (${suffix.trim()})`;
      }

      estimateTransportFee.textContent =
        value > 0 ? `${formatCurrencyVND(value)}${suffixText}` : "-";
    }
  }

  function isValidCoordinate(value) {
    return typeof value === "number" && Number.isFinite(value);
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

  async function recalculateTransportFee(force = false) {
    const addressText = (addressInput?.value || "").trim();

    const minFee = getTransportMinFee();

    if (!addressText) {
      latestDistanceKm = null;
      transportFeeValue = minFee;
      setTransportFeeDisplay(null, {
        displayText: "Nhập địa chỉ để tính giá",
      });
      updateTotalPrice();
      return;
    }

    const token = ++transportCalcToken;
    setTransportFeeDisplay(null, { pending: true });

    try {
      if (
        !providerLocation ||
        !isValidCoordinate(providerLocation.lat) ||
        !isValidCoordinate(providerLocation.lng)
      ) {
        throw new Error("Thiếu tọa độ nhà cung cấp");
      }

      const customerCoords = await geocodeAddress(addressText);
      const distanceKm = await getRoadDistanceKm(
        providerLocation,
        customerCoords,
      );

      if (token !== transportCalcToken && !force) {
        return;
      }

      latestDistanceKm = distanceKm;
      const calculated = calculateTransportFeeByThreshold(distanceKm);
      transportFeeValue = calculated;
      setTransportFeeDisplay(calculated, {
        suffix: `${distanceKm.toFixed(1)} km`,
      });
    } catch (error) {
      if (token !== transportCalcToken && !force) {
        return;
      }

      latestDistanceKm = null;
      transportFeeValue = minFee;
      setTransportFeeDisplay(minFee, { suffix: "ước tính" });
      console.error(error);
    } finally {
      if (token === transportCalcToken || force) {
        updateTotalPrice();
      }
    }
  }

  function scheduleRecalculateTransportFee(delay = 700) {
    if (addressCalcTimer) {
      clearTimeout(addressCalcTimer);
    }

    addressCalcTimer = setTimeout(() => {
      recalculateTransportFee();
    }, delay);
  }

  function getSurveyFeeByVehicleType(type) {
    const vehicleType = vehicleTypesData.find((v) => v.type === type);
    return vehicleType?.survey_fees || 0;
  }

  function getCurrentSurveyFee() {
    if (!vehicleType || !vehicleType.value) return 0;
    return getSurveyFeeByVehicleType(vehicleType.value);
  }

  // ===== INIT HIỂN THỊ =====
  setTransportFeeDisplay(null);
  updateEstimateVisibility();

  // ===== LOAD DATA =====
  fetch("public/services.json")
    .then((res) => res.json())
    .then((data) => {
      servicesData = data.services || [];
      vehicleTypesData = data.vehicles || [];
      providerLocation = {
        lat: Number(data.provider?.lat),
        lng: Number(data.provider?.lng),
        address: data.provider?.address || "",
      };
      transportPerKm = Number(data.provider?.per_km || 0);
      transportMinFee = Number(data.provider?.min_fee || 0);
      transportMaxFee = Number(data.provider?.max_fee || 0);

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
        if (bookingModal) {
          delete bookingModal.dataset.pendingServiceId;
        }
      }

      recalculateTransportFee(true);
    })
    .catch((err) => console.error("Lỗi load JSON:", err));

  // ===== SERVICE =====
  if (serviceSelect) {
    serviceSelect.addEventListener("change", function () {
      updateEstimateVisibility();
      resetSelect(vehicleType, "Chọn loại xe");
      resetSelect(brandSelect, "Chọn hãng");
      resetSelect(itemSelect, "Chọn mẫu xe");
      ensureOtherModelOption();
      toggleCustomItemInput(false);
      clearPrice();
      recalculateTransportFee();

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
      resetSelect(itemSelect, "Chọn mẫu xe");
      ensureOtherModelOption();
      toggleCustomItemInput(false);
      clearPrice();

      // Cập nhật survey fee
      if (surveyInput) {
        surveyInput.value = getCurrentSurveyFee().toLocaleString("vi-VN");
      }

      recalculateTransportFee();

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
      resetSelect(itemSelect, "Chọn mẫu xe");
      toggleCustomItemInput(false);
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

      ensureOtherModelOption();
    });
  }

  // ===== ITEM =====
  if (itemSelect) {
    itemSelect.addEventListener("change", function () {
      const option = this.options[this.selectedIndex];

      toggleCustomItemInput();

      if (!option || !option.value) {
        clearPrice();
        return;
      }

      updateTotalPrice();
    });
  }

  if (customItemInput) {
    customItemInput.addEventListener("input", function () {
      if (String(itemSelect?.value || "") !== "__other__") return;
      updateTotalPrice();
    });
  }

  if (addressInput) {
    addressInput.addEventListener("input", function () {
      scheduleRecalculateTransportFee();
    });

    addressInput.addEventListener("change", function () {
      scheduleRecalculateTransportFee(150);
    });
  }

  initMediaUpload();
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
      scheduleRecalculateTransportFee(150);
    });
  }

  bindQuickBookingButtons();
  ensureOtherModelOption();
  toggleCustomItemInput(false);
  fillCurrentDateTime();

  if (bookingModal && bookingModal.dataset.dateTimeAutofillBound !== "true") {
    bookingModal.dataset.dateTimeAutofillBound = "true";
    bookingModal.addEventListener("shown.bs.modal", function () {
      fillCurrentDateTime();
    });
  }

  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm && bookingForm.dataset.customItemResetBound !== "true") {
    bookingForm.dataset.customItemResetBound = "true";
    bookingForm.addEventListener("reset", function () {
      setTimeout(() => {
        ensureOtherModelOption();
        toggleCustomItemInput(false);
      }, 0);
    });
  }

  initBookingConfirmFlow();
}

function initMediaUpload() {
  const form = document.getElementById("bookingForm");
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
  const form = document.getElementById("bookingForm");
  const bookingModalEl = document.getElementById("bookingModal");
  const confirmModalEl = document.getElementById("bookingConfirmModal");
  const imageInput = document.getElementById("imageUploadInput");
  const videoInput = document.getElementById("videoUploadInput");
  const confirmImages = document.getElementById("confirmImages");
  const confirmVideos = document.getElementById("confirmVideos");
  const confirmMediaUrls = [];
  const ORDER_CODE_PREFIX = "SXLD";
  const ORDER_CODE_STORE_KEY = "sua_xe_luu_dong_order_codes";
  const ORDER_CODE_TTL_MS = 24 * 60 * 60 * 1000;
  let currentOrderCode = "";

  function normalizeStoredOrderCodes(payload) {
    const now = Date.now();

    if (!Array.isArray(payload)) return [];

    const normalized = payload
      .map((item) => {
        if (typeof item === "string") {
          return { code: item, createdAt: now };
        }

        if (item && typeof item.code === "string") {
          const createdAt = Number(item.createdAt || 0);
          return {
            code: item.code,
            createdAt:
              Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now,
          };
        }

        return null;
      })
      .filter(Boolean)
      .filter((item) => now - item.createdAt < ORDER_CODE_TTL_MS);

    const deduped = new Map();
    normalized.forEach((item) => {
      deduped.set(item.code, item);
    });

    return Array.from(deduped.values());
  }

  function readStoredOrderCodeEntries() {
    try {
      const raw = localStorage.getItem(ORDER_CODE_STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const cleaned = normalizeStoredOrderCodes(parsed);
      localStorage.setItem(ORDER_CODE_STORE_KEY, JSON.stringify(cleaned));
      return cleaned;
    } catch (_err) {
      return [];
    }
  }

  function getStoredOrderCodes() {
    return readStoredOrderCodeEntries().map((item) => item.code);
  }

  function saveOrderCode(orderCode) {
    if (!orderCode) return;

    const existingEntries = readStoredOrderCodeEntries();
    if (existingEntries.some((item) => item.code === orderCode)) return;

    existingEntries.push({
      code: orderCode,
      createdAt: Date.now(),
    });

    const trimmed = existingEntries.slice(-3000);
    try {
      localStorage.setItem(ORDER_CODE_STORE_KEY, JSON.stringify(trimmed));
    } catch (_err) {
      // Ignore localStorage failure (private mode / quota exceeded).
    }
  }

  function createRandomOrderCode() {
    const numberPart = String(Math.floor(Math.random() * 10000)).padStart(
      4,
      "0",
    );
    return `${ORDER_CODE_PREFIX}${numberPart}`;
  }

  function generateUniqueOrderCode() {
    const existingCodes = new Set(getStoredOrderCodes());

    for (let i = 0; i < 200; i += 1) {
      const candidate = createRandomOrderCode();
      if (!existingCodes.has(candidate)) {
        saveOrderCode(candidate);
        return candidate;
      }
    }

    const fallback = `${ORDER_CODE_PREFIX}${Date.now().toString().slice(-4)}`;
    saveOrderCode(fallback);
    return fallback;
  }

  if (!form || !bookingModalEl || !confirmModalEl) return;
  if (form.dataset.confirmFlowBound === "true") return;
  form.dataset.confirmFlowBound = "true";

  const serviceSelect = document.getElementById("serviceSelect");
  const vehicleType = document.getElementById("vehicleType");
  const brandSelect = document.getElementById("brandSelect");
  const itemSelect = document.getElementById("itemSelect");
  const customItemInput = document.getElementById("customItemInput");
  const addressInput = document.getElementById("addressInput");

  const priceInput = document.getElementById("price-contact");
  const surveyInput = document.getElementById("survey-fee");
  const transportInput = document.getElementById("transport-fee");
  const totalInput = document.getElementById("total-price");

  const datetimeInput = form.querySelector('input[type="datetime-local"]');
  const noteInput = form.querySelector("textarea");
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

  function selectedText(select) {
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    if (!option) return "";
    const value = String(option.value || "").trim();
    if (!value) return "";
    return option.textContent || "";
  }

  function selectedItemText() {
    const selectedValue = String(itemSelect?.value || "").trim();
    if (!selectedValue) return "";

    if (selectedValue === "__other__") {
      return String(customItemInput?.value || "").trim();
    }

    return selectedText(itemSelect);
  }

  function moneyOnlyText(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    // Keep only the amount part, remove any trailing notes like "(11.5 km)".
    return text.split("(")[0].trim();
  }

  function renderSummary() {
    if (!currentOrderCode) {
      currentOrderCode = generateUniqueOrderCode();
    }

    form.dataset.orderCode = currentOrderCode;

    const summary = {
      confirmName: document.getElementById("nameCustomer")?.value,
      confirmPhone: document.getElementById("phoneCustomer")?.value,
      confirmOrderCode: currentOrderCode,
      confirmService: selectedText(serviceSelect),
      confirmVehicleType: selectedText(vehicleType),
      confirmBrand: selectedText(brandSelect),
      confirmItem: selectedItemText(),
      confirmDatetime: datetimeInput?.value,
      confirmAddress: addressInput?.value,
      confirmPrice: priceInput?.value,
      confirmSurvey: surveyInput?.value,
      confirmTransport: moneyOnlyText(transportInput?.value),
      confirmTotal: totalInput?.value,
      confirmNote: noteInput?.value,
    };

    Object.entries(summary).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = normalizeValue(value);
    });
  }

  function collectBookingData() {
    if (!currentOrderCode) {
      currentOrderCode = generateUniqueOrderCode();
    }

    const transportFee = moneyOnlyText(transportInput?.value);
    const payload = {
      service_group: "sua-xe-luu-dong",
      name: document.getElementById("nameCustomer")?.value || "",
      phone: document.getElementById("phoneCustomer")?.value || "",
      order_code: currentOrderCode,
      service_name: selectedText(serviceSelect),
      vehicle_type: selectedText(vehicleType),
      brand: selectedText(brandSelect),
      item: selectedItemText(),
      booking_time: datetimeInput?.value || "",
      address: addressInput?.value || "",
      price: priceInput?.value || "",
      survey_fee: surveyInput?.value || "",
      transport_fee: transportFee,
      ship: transportFee,
      total: totalInput?.value || "",
      message: noteInput?.value || "",
    };

    return payload;
  }

  function parseJsonSafe(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  function handleConfirmSubmit() {
    const payload = collectBookingData();
    const originalText = confirmBtn.textContent;

    if (!BOOKING_GOOGLE_SHEET_API) {
      alert("Chưa cấu hình BOOKING_GOOGLE_SHEET_API để lưu dữ liệu.");
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Đang gửi...";

    fetch(BOOKING_GOOGLE_SHEET_API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        return response.text().then((raw) => {
          const result = parseJsonSafe(raw);
          if (!response.ok || !result || result.success !== true) {
            const serverMessage =
              (result && result.error) || raw || "Gửi dữ liệu thất bại";
            throw new Error(`HTTP ${response.status}: ${serverMessage}`);
          }
        });
      })
      .then(() => {
        bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
        hideBookingStep();

        alert(
          `Cảm ơn bạn đã đặt dịch vụ! Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.\nMã đơn hàng của bạn: ${payload.order_code}`,
        );

        form.reset();
        clearConfirmMedia();
        currentOrderCode = "";
        delete form.dataset.orderCode;

        if (!isEmbeddedMode) {
          showBookingStep();
        }
      })
      .catch((err) => {
        console.error("Lỗi gửi dữ liệu sửa xe:", err);
        alert("Không thể lưu dữ liệu đặt lịch. Vui lòng thử lại.");
      })
      .finally(() => {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      });
  }

  function backToBookingModal() {
    bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
    showBookingStep();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    renderSummary();
    renderConfirmMedia();

    hideBookingStep();
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
    confirmBtn.addEventListener("click", handleConfirmSubmit);
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
