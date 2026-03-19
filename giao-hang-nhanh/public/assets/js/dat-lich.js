/**
 * dat-lich.js — Logic điều khiển Form đặt đơn 5 bước
 * Sử dụng payload chuẩn hóa tiếng Việt không dấu
 * - loai_hang, ten_hang, can_nang, chieu_dai, chieu_rong, chieu_cao
 * - gia_tri_khai_bao, phi_thu_ho, khoang_cach_km
 */

// ========== STATE ==========
let map, markerPickup, markerDelivery;
let khoang_cach_km = 0;
let selectedService = null;
let reorderContext = null;
let orderItems = [
  { loai_hang: '', ten_hang: '', so_luong: 1, gia_tri_khai_bao: 0, can_nang: 1.0, chieu_dai: 15, chieu_rong: 10, chieu_cao: 10 }
];

function resolveOrderFormConfigUrl() {
  if (typeof window === "undefined") return "assets/data/form-dat-hang.json";
  const inPublicDir = window.location.pathname.toLowerCase().includes("/public/");
  const basePath =
    typeof window.apiBasePath === "string"
      ? window.apiBasePath
      : inPublicDir
        ? ""
        : "public/";
  return `${basePath}assets/data/form-dat-hang.json`;
}

function loadOrderFormConfigSync() {
  const fallback = {
    loaihang: [
      { key: "thuong", label: "Hàng thông thường" },
      { key: "gia-tri-cao", label: "Hàng giá trị cao" },
      { key: "de-vo", label: "Hàng dễ vỡ" },
      { key: "mui-hoi", label: "Hàng có mùi hôi" },
      { key: "chat-long", label: "Hàng chất lỏng" },
      { key: "pin-lithium", label: "Hàng có pin Lithium" },
      { key: "dong-lanh", label: "Hàng đông lạnh" },
      { key: "cong-kenh", label: "Hàng cồng kềnh" },
    ],
    tenhangtheoloai: {},
    loaixe: [
      { key: "auto", label: "Để hệ thống tự đề xuất" },
      { key: "xe_may", label: "Xe máy" },
      { key: "xe_loi", label: "Xe lôi / xe ba gác" },
      { key: "xe_ban_tai", label: "Xe bán tải / xe van" },
      { key: "xe_tai", label: "Xe tải nhẹ" },
    ],
    khunggiolayhang: [],
    khunggionhanhang: [],
    huongdankhaibao:
      "Hang co gia tri khai bao tren 1.000.000d se tinh phi bao hiem 0,5%, toi thieu 5.000d.",
  };

  if (typeof XMLHttpRequest === "undefined") return fallback;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", resolveOrderFormConfigUrl(), false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      return Object.assign(fallback, JSON.parse(xhr.responseText));
    }
  } catch (error) {
    console.error("Không tải được cấu hình form đặt hàng:", error);
  }
  return fallback;
}

const ORDER_FORM_CONFIG = loadOrderFormConfigSync();
const ITEM_TYPES = Array.isArray(ORDER_FORM_CONFIG.loaihang)
  ? ORDER_FORM_CONFIG.loaihang
  : [];
const ITEM_NAMES_BY_TYPE = ORDER_FORM_CONFIG.tenhangtheoloai || {};
const ITEM_TYPE_LABELS = ITEM_TYPES.reduce((acc, item) => {
  if (item && item.key) acc[item.key] = item.label || item.key;
  return acc;
}, {});
const VEHICLE_OPTIONS = Array.isArray(ORDER_FORM_CONFIG.loaixe)
  ? ORDER_FORM_CONFIG.loaixe
  : [];
const PICKUP_SLOT_OPTIONS = Array.isArray(ORDER_FORM_CONFIG.khunggiolayhang)
  ? ORDER_FORM_CONFIG.khunggiolayhang
  : [];
const DELIVERY_SLOT_OPTIONS = Array.isArray(ORDER_FORM_CONFIG.khunggionhanhang)
  ? ORDER_FORM_CONFIG.khunggionhanhang
  : [];
const DECLARED_VALUE_HELP =
  ORDER_FORM_CONFIG.huongdankhaibao ||
  "Hang co gia tri khai bao tren 1.000.000d se tinh phi bao hiem 0,5%, toi thieu 5.000d.";

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initAddressSearch("search-pickup",   "sug-pickup",   "pickup");
  initAddressSearch("search-delivery", "sug-delivery", "delivery");
  initPickupSlotOptions();
  initDeliverySlotOptions();
  initVehicleOptions();

  renderItems();
  document.getElementById("btn-add-item").addEventListener("click", addItem);
  document.getElementById("cod-value").addEventListener("input", () => {
    renderItems();
    if (getCurrentStep() >= 3) renderServiceCards();
  });

  // Default date = today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("pickup-date").value = today;
  document.getElementById("delivery-date").value = today;
  document.getElementById("vehicle-choice").addEventListener("change", () => {
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("pickup-date").addEventListener("change", () => {
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("pickup-slot").addEventListener("change", () => {
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("delivery-date").addEventListener("change", () => {
    if (getCurrentStep() >= 3) renderServiceCards();
  });
  document.getElementById("delivery-slot").addEventListener("change", () => {
    if (getCurrentStep() >= 3) renderServiceCards();
  });

  document.getElementById("btn-1-to-2").addEventListener("click", () => validateStep1() && goToStep(2));
  document.getElementById("btn-2-to-3").addEventListener("click", () => {
    if (validateStep2()) {
      renderServiceCards();
      goToStep(3);
    }
  });
  document.getElementById("btn-3-to-4").addEventListener("click", () => {
    if (validateStep3()) {
      goToStep(4);
    }
  });
  document.getElementById("btn-4-to-5").addEventListener("click", () => {
    if (validateStep4()) {
      prepareReview();
      goToStep(5);
    }
  });

  // Make indicators clickable for already completed steps
  document.querySelectorAll(".step-item").forEach((item, idx) => {
    item.addEventListener("click", () => {
      const step = idx + 1;
      const currentStep = getCurrentStep();
      if (step < currentStep) {
        goToStep(step);
      } else if (step > currentStep) {
        // Try to jump forward: must validate all steps in between
        let ok = true;
        for (let s = currentStep; s < step; s++) {
          if (s === 1 && !validateStep1()) { ok = false; break; }
          if (s === 2 && !validateStep2()) { ok = false; break; }
          if (s === 3 && !validateStep3()) { ok = false; break; }
          if (s === 4 && !validateStep4()) { ok = false; break; }
        }
        if (ok) {
          if (step === 3) renderServiceCards();
          if (step === 5) prepareReview();
          goToStep(step);
        }
      }
    });
    item.style.cursor = "pointer";
  });

  initReorderPrefill();
});

function getCurrentStep() {
  for (let i = 1; i <= 5; i++) {
    if (document.getElementById(`step-${i}`).classList.contains("active")) return i;
  }
  return 1;
}

function getPickupSlotOptions() {
  return PICKUP_SLOT_OPTIONS;
}

function getDeliverySlotOptions() {
  return DELIVERY_SLOT_OPTIONS;
}

function initPickupSlotOptions() {
  const select = document.getElementById("pickup-slot");
  if (!select) return;
  const options = getPickupSlotOptions();
  if (!options.length) return;
  select.innerHTML = options
    .map((slot, index) => {
      const selectedAttr = index === 0 ? " selected" : "";
      const note = slot.ghichu ? ` - ${slot.ghichu}` : "";
      return `<option value="${slot.key}" data-start="${slot.start}" data-end="${slot.end}"${selectedAttr}>${slot.label}${note}</option>`;
    })
    .join("");
}

function initDeliverySlotOptions() {
  const select = document.getElementById("delivery-slot");
  if (!select) return;
  const options = getDeliverySlotOptions();
  if (!options.length) return;
  select.innerHTML = options
    .map((slot, index) => {
      const selectedAttr = index === 0 ? " selected" : "";
      return `<option value="${slot.key}" data-start="${slot.start}" data-end="${slot.end}"${selectedAttr}>${slot.label}</option>`;
    })
    .join("");
}

function initVehicleOptions() {
  const select = document.getElementById("vehicle-choice");
  if (!select || !VEHICLE_OPTIONS.length) return;
  select.innerHTML = VEHICLE_OPTIONS
    .map((option, index) => {
      const selectedAttr = index === 0 ? " selected" : "";
      return `<option value="${option.key}"${selectedAttr}>${option.label}</option>`;
    })
    .join("");
}

function getSelectedPickupSlot() {
  const select = document.getElementById("pickup-slot");
  if (!select) return null;
  const options = getPickupSlotOptions();
  const selected = options.find((slot) => slot.key === select.value);
  return selected || null;
}

function getSelectedDeliverySlot() {
  const select = document.getElementById("delivery-slot");
  if (!select) return null;
  const options = getDeliverySlotOptions();
  const selected = options.find((slot) => slot.key === select.value);
  return selected || null;
}

// ========== UI HELPERS ==========
function showError(step, message) {
  const errBox = document.getElementById(`error-step-${step}`);
  if (errBox) {
    errBox.querySelector(".error-text").textContent = message;
    errBox.style.display = "block";
    errBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearError(step) {
  const errBox = document.getElementById(`error-step-${step}`);
  if (errBox) errBox.style.display = "none";
}

function isValidPhone(phone) {
  const re = /^(0[3|5|7|8|9])+([0-9]{8})\b/g;
  return re.test(phone.trim());
}

function isDateInPast(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(dateStr);
  return selected < today;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ========== MAP ==========
function initMap() {
  map = L.map('map').setView([10.762622, 106.660172], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const iconBlue = new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25,41], iconAnchor: [12,41], popupAnchor:[1,-34], shadowSize:[41,41]
  });
  const iconRed = new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25,41], iconAnchor: [12,41], popupAnchor:[1,-34], shadowSize:[41,41]
  });

  markerPickup   = L.marker([10.7769, 106.7009], { draggable: true, icon: iconBlue }).addTo(map).bindPopup("📍 Lấy hàng");
  markerDelivery = L.marker([10.7500, 106.6500], { draggable: true, icon: iconRed  }).addTo(map).bindPopup("🏁 Giao hàng");

  markerPickup.on('dragend', () => {
    reverseGeocode(markerPickup.getLatLng(), "search-pickup");
    recalculateDistance();
  });
  markerDelivery.on('dragend', () => {
    reverseGeocode(markerDelivery.getLatLng(), "search-delivery");
    recalculateDistance();
  });

  recalculateDistance();
}

async function recalculateDistance() {
  const a = markerPickup.getLatLng();
  const b = markerDelivery.getLatLng();
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.routes && data.routes[0] && data.routes[0].distance) {
      khoang_cach_km = data.routes[0].distance / 1000;
    } else {
      throw new Error("No route");
    }
  } catch (error) {
    khoang_cach_km = a.distanceTo(b) / 1000;
  }
  showDistance();
}

function showDistance() {
  const badge = document.getElementById("distance-badge");
  document.getElementById("distance-km").textContent = khoang_cach_km.toFixed(2);
  badge.style.display = "inline-flex";
}

// ========== ADDRESS SEARCH ==========
function initAddressSearch(inputId, sugId, markerType) {
  const input  = document.getElementById(inputId);
  const sugBox = document.getElementById(sugId);
  let timer;

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { sugBox.style.display = "none"; return; }
    timer = setTimeout(() => fetchNominatim(q, sugBox, markerType), 500);
  });
  document.addEventListener("click", e => { if (e.target !== input) sugBox.style.display = "none"; });
}

function fetchNominatim(query, sugBox, markerType) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=6`)
    .then(r => r.json())
    .then(data => {
      sugBox.innerHTML = "";
      if (!data.length) { sugBox.style.display = "none"; return; }
      data.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        const parts = item.display_name.split(",");
        div.innerHTML = `<i class="fas fa-map-pin" style="color:#94a3b8;margin-top:3px;"></i>
          <div><span class="s-main">${parts[0]}</span><span class="s-sub">${parts.slice(1).join(",").trim()}</span></div>`;
        div.addEventListener("click", () => {
          const inputId = markerType === "pickup" ? "search-pickup" : "search-delivery";
          document.getElementById(inputId).value = item.display_name;
          sugBox.style.display = "none";
          if (markerType === "pickup") markerPickup.setLatLng([item.lat, item.lon]);
          else                          markerDelivery.setLatLng([item.lat, item.lon]);
          map.panTo([item.lat, item.lon]);
          recalculateDistance();
        });
        sugBox.appendChild(div);
      });
      sugBox.style.display = "block";
    });
}

function reverseGeocode(latlng, inputId) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
    .then(r => r.json())
    .then(d => { if (d.display_name) document.getElementById(inputId).value = d.display_name; });
}

function getQueryParam(name) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

async function resolveAddressToLatLng(address) {
  const query = String(address || "").trim();
  if (!query) return null;

  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=1`);
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) {
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

function setOptionGroupValue(groupId, value) {
  const button = document.querySelector(`#${groupId} .option-btn[data-val="${value}"]`);
  if (button) {
    selectOption(groupId, button);
  }
}

function normalizeReorderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return [{ loai_hang: '', ten_hang: '', so_luong: 1, gia_tri_khai_bao: 0, can_nang: 1, chieu_dai: 15, chieu_rong: 10, chieu_cao: 10 }];
  }

  return items.map((item) => ({
    loai_hang: item.loai_hang || 'thuong',
    ten_hang: item.ten_hang || '',
    so_luong: Math.max(1, parseInt(item.so_luong, 10) || 1),
    gia_tri_khai_bao: parseFloat(item.gia_tri_khai_bao) || 0,
    can_nang: Math.max(0.1, parseFloat(item.can_nang) || 0.1),
    chieu_dai: Math.max(0, parseFloat(item.chieu_dai) || 0),
    chieu_rong: Math.max(0, parseFloat(item.chieu_rong) || 0),
    chieu_cao: Math.max(0, parseFloat(item.chieu_cao) || 0),
  }));
}

function markReorderMode(orderCode) {
  const container = document.querySelector(".booking-container");
  if (!container || document.getElementById("reorder-banner")) return;

  const banner = document.createElement("div");
  banner.id = "reorder-banner";
  banner.style.cssText = "margin-bottom:18px;padding:14px 16px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-weight:700;";
  banner.innerHTML = `<i class="fas fa-rotate-right"></i> Đang đặt lại từ đơn <strong>${escapeHtml(orderCode || "")}</strong>. Bạn có thể chỉnh lại trước khi gửi.`;
  container.insertBefore(banner, container.firstChild);
}

async function applyReorderAddresses(data) {
  document.getElementById("search-pickup").value = data.pickup_address || "";
  document.getElementById("search-delivery").value = data.delivery_address || "";

  const [pickupPoint, deliveryPoint] = await Promise.all([
    resolveAddressToLatLng(data.pickup_address).catch(() => null),
    resolveAddressToLatLng(data.delivery_address).catch(() => null),
  ]);

  if (pickupPoint) {
    markerPickup.setLatLng([pickupPoint.lat, pickupPoint.lng]);
  }
  if (deliveryPoint) {
    markerDelivery.setLatLng([deliveryPoint.lat, deliveryPoint.lng]);
  }

  if (pickupPoint && deliveryPoint) {
    map.fitBounds([
      [pickupPoint.lat, pickupPoint.lng],
      [deliveryPoint.lat, deliveryPoint.lng],
    ], { padding: [40, 40] });
  } else if (pickupPoint || deliveryPoint) {
    const point = pickupPoint || deliveryPoint;
    map.panTo([point.lat, point.lng]);
  }

  await recalculateDistance();
}

async function applyReorderPrefill(data) {
  reorderContext = {
    source_order_id: data.source_order_id || null,
    source_order_code: data.source_order_code || "",
  };

  document.getElementById("sender-name").value = data.sender_name || "";
  document.getElementById("sender-phone").value = data.sender_phone || "";
  document.getElementById("receiver-name").value = data.receiver_name || "";
  document.getElementById("receiver-phone").value = data.receiver_phone || "";
  document.getElementById("notes").value = data.notes || "";
  document.getElementById("cod-value").value = parseFloat(data.cod_value) || 0;

  const vehicleChoice = document.getElementById("vehicle-choice");
  if (vehicleChoice) {
    vehicleChoice.value = Array.from(vehicleChoice.options).some((option) => option.value === data.vehicle) ? data.vehicle : "auto";
  }

  setOptionGroupValue("payer-group", data.fee_payer || "gui");
  setOptionGroupValue("payment-group", data.payment_method || "tien_mat");

  orderItems = normalizeReorderItems(data.items);
  renderItems();

  if (data.service_type) {
    selectedService = { serviceType: data.service_type };
  }

  await applyReorderAddresses(data);
  if (data.service_type) {
    renderServiceCards();
  }
  markReorderMode(data.source_order_code || `#${data.source_order_id || ""}`);
}

async function initReorderPrefill() {
  const reorderId = getQueryParam("reorder_id");
  if (!reorderId) return;

  try {
    const response = await fetch(`dat-lich-ajax.php?reorder_id=${encodeURIComponent(reorderId)}`);
    const result = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Không thể tải dữ liệu đơn cần đặt lại.");
    }
    await applyReorderPrefill(result.data);
  } catch (error) {
    console.error(error);
    showError(1, error.message || "Không thể tải dữ liệu đơn cũ để đặt lại.");
  }
}

// ========== ITEMS ==========
function addItem() {
  orderItems.push({ loai_hang: '', ten_hang: '', so_luong: 1, gia_tri_khai_bao: 0, can_nang: 1.0, chieu_dai: 15, chieu_rong: 10, chieu_cao: 10 });
  renderItems();
}

function removeItem(idx) {
  if (orderItems.length <= 1) return;
  orderItems.splice(idx, 1);
  renderItems();
}

function handleLoaiHangChange(idx, val) {
  orderItems[idx].loai_hang = val;
  orderItems[idx].ten_hang  = '';
  renderItems();
}

function updateItemField(idx, field, val) {
  if (field === 'loai_hang' || field === 'ten_hang') {
    orderItems[idx][field] = val;
  } else if (field === 'so_luong') {
    orderItems[idx][field] = Math.max(1, parseInt(val, 10) || 1);
  } else {
    orderItems[idx][field] = parseFloat(val) || 0;
  }
  updateWeightDisplay();
}

function renderItems() {
  const container = document.getElementById("items-list");
  container.innerHTML = "";
  orderItems.forEach((item, idx) => {
    const names = ITEM_NAMES_BY_TYPE[item.loai_hang] || [];
    const hasCustomName = item.ten_hang && !names.includes(item.ten_hang);
    const nameOpts = [
      hasCustomName ? `<option value="${escapeHtml(item.ten_hang)}" selected>${escapeHtml(item.ten_hang)}</option>` : "",
      ...names.map(n => `<option value="${escapeHtml(n)}" ${item.ten_hang===n?'selected':''}>${escapeHtml(n)}</option>`),
    ].join('');
    const typeOptions = ITEM_TYPES.map((type) => `
      <option value="${escapeHtml(type.key)}" ${item.loai_hang===type.key?'selected':''}>${escapeHtml(type.label)}</option>
    `).join("");
    const isTypeChosen = Boolean(item.loai_hang);
    const div = document.createElement("div");
    div.className = "item-row";
    div.innerHTML = `
      <div class="item-row-num">Món hàng #${idx+1}</div>
      <button class="item-delete-btn" onclick="removeItem(${idx})" title="Xóa"><i class="fas fa-times"></i></button>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Loại hàng</label>
          <select class="form-control" onchange="handleLoaiHangChange(${idx}, this.value)">
            <option value="">Chọn loại hàng...</option>
            ${typeOptions}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Tên hàng cụ thể</label>
          <select class="form-control" onchange="updateItemField(${idx}, 'ten_hang', this.value)" ${isTypeChosen ? '' : 'disabled'}>
            <option value="">${isTypeChosen ? 'Chọn tên hàng...' : 'Chọn loại hàng trước'}</option>
            ${nameOpts}
          </select>
        </div>
      </div>
      <div class="item-grid item-grid-2">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">
            Khai báo giá trị (₫)
            <span class="field-help" tabindex="0" aria-label="${DECLARED_VALUE_HELP}">
              i
              <span class="field-help__tooltip">${DECLARED_VALUE_HELP}</span>
            </span>
          </label>
          <input type="number" class="form-control" placeholder="0" value="${item.gia_tri_khai_bao}" onchange="updateItemField(${idx},'gia_tri_khai_bao',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Số lượng</label>
          <input type="number" class="form-control" min="1" step="1" value="${item.so_luong || 1}" onchange="updateItemField(${idx},'so_luong',this.value)" />
        </div>
      </div>
      <div class="item-grid item-grid-4">
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cân nặng / kiện (kg)</label>
          <input type="number" class="form-control" step="0.1" value="${item.can_nang}" onchange="updateItemField(${idx},'can_nang',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Dài (cm)</label>
          <input type="number" class="form-control" value="${item.chieu_dai}" onchange="updateItemField(${idx},'chieu_dai',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Rộng (cm)</label>
          <input type="number" class="form-control" value="${item.chieu_rong}" onchange="updateItemField(${idx},'chieu_rong',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cao (cm)</label>
          <input type="number" class="form-control" value="${item.chieu_cao}" onchange="updateItemField(${idx},'chieu_cao',this.value)" />
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  updateWeightDisplay();
}

function updateWeightDisplay() {
  let totalAct = 0, totalVol = 0;
  orderItems.forEach(it => {
    totalAct += it.can_nang * (it.so_luong || 1);
    totalVol += ((it.chieu_dai * it.chieu_rong * it.chieu_cao) / 6000) * (it.so_luong || 1);
  });
  const billable = Math.max(totalAct, totalVol);
  document.getElementById("total-weight-display").textContent = `${billable.toFixed(1)} kg`;
}

function getPrimaryItemMeta() {
  const priority = [
    "cong-kenh",
    "dong-lanh",
    "pin-lithium",
    "chat-long",
    "mui-hoi",
    "de-vo",
    "gia-tri-cao",
    "thuong",
  ];
  for (const type of priority) {
    const found = orderItems.find((item) => item.loai_hang === type);
    if (found) return found;
  }
  const firstSelected = orderItems.find((item) => item.loai_hang);
  return firstSelected || orderItems[0] || { loai_hang: "thuong", ten_hang: "" };
}

function buildQuotePayload() {
  let totalCanNang = 0, totalKhaiGia = 0;
  let maxDai = 0, maxRong = 0, tongCao = 0, tongSoLuong = 0;
  orderItems.forEach(it => {
    const itemQty = Math.max(1, parseInt(it.so_luong, 10) || 1);
    totalCanNang  += it.can_nang * itemQty;
    totalKhaiGia  += it.gia_tri_khai_bao * itemQty;
    maxDai  = Math.max(maxDai,  it.chieu_dai);
    maxRong = Math.max(maxRong, it.chieu_rong);
    tongCao += it.chieu_cao * itemQty;
    tongSoLuong += itemQty;
  });
  const primaryItem = getPrimaryItemMeta();
  return {
    khoang_cach_km:   khoang_cach_km,
    loai_hang:        primaryItem.loai_hang,
    ten_hang:         primaryItem.ten_hang,
    can_nang:         totalCanNang,
    chieu_dai:        maxDai,
    chieu_rong:       maxRong,
    chieu_cao:        tongCao,
    so_luong:         tongSoLuong,
    gia_tri_khai_bao: totalKhaiGia,
    phi_thu_ho:       parseFloat(document.getElementById("cod-value").value) || 0,
    loai_xe:          document.getElementById("vehicle-choice").value || "auto",
    khung_gio_lay_hang: document.getElementById("pickup-slot").value || "",
    ten_khung_gio_lay_hang: (getSelectedPickupSlot() && getSelectedPickupSlot().label) || "",
    phi_khung_gio: (getSelectedPickupSlot() && getSelectedPickupSlot().phicodinh) || 0,
    he_so_khung_gio: (getSelectedPickupSlot() && getSelectedPickupSlot().heso) || 1,
  };
}

function parseEstimateToHours(estimateText) {
  const text = String(estimateText || "").trim().toLowerCase();
  if (!text) return { minHours: 0, maxHours: 0 };
  const rangeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(giờ|gio|h|ngày|ngay|d)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(",", "."));
    const max = parseFloat(rangeMatch[2].replace(",", "."));
    const multiplier = /ngày|ngay|d/i.test(rangeMatch[3]) ? 24 : 1;
    return { minHours: min * multiplier, maxHours: max * multiplier };
  }
  const singleMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(giờ|gio|h|ngày|ngay|d)/i);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1].replace(",", "."));
    const multiplier = /ngày|ngay|d/i.test(singleMatch[2]) ? 24 : 1;
    return { minHours: value * multiplier, maxHours: value * multiplier };
  }
  return { minHours: 0, maxHours: 0 };
}

function getDesiredDeliveryStatus(estimateText) {
  const deliveryDate = document.getElementById("delivery-date").value;
  const deliverySlot = getSelectedDeliverySlot();
  const pickupDate = document.getElementById("pickup-date").value;
  const pickupSlot = getSelectedPickupSlot();
  if (!deliveryDate || !deliverySlot || !pickupDate || !pickupSlot) return "";

  const pickupStart = pickupSlot.start;
  const pickupAt = new Date(`${pickupDate}T${pickupStart}`);
  const deadlineAt = new Date(`${deliveryDate}T${deliverySlot.end}`);
  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(deadlineAt.getTime())) return "";

  const parsed = parseEstimateToHours(estimateText);
  if (!parsed.maxHours) return "";

  const latestExpected = new Date(pickupAt.getTime() + parsed.maxHours * 60 * 60 * 1000);
  if (latestExpected <= deadlineAt) {
    return `<div class="service-deadline-badge good"><i class="fas fa-check-circle"></i> Có thể kịp mốc bạn mong muốn</div>`;
  }
  return `<div class="service-deadline-badge warn"><i class="fas fa-hourglass-half"></i> Có thể không kịp mốc bạn mong muốn</div>`;
}

// ========== SERVICE CARDS ==========
function renderServiceCards() {
  const container = document.getElementById("service-list");
  const btn5 = document.getElementById("btn-4-to-5");
  const etaPanel = document.getElementById("eta-panel");
  etaPanel.classList.add("is-hidden");
  document.getElementById("eta-display").textContent = "—";

  if (typeof window.calculateDomesticQuote !== "function") {
    container.innerHTML = `<div style="color:#ef4444;">Không tải được dữ liệu bảng giá.</div>`;
    return;
  }
  if (khoang_cach_km <= 0) {
    container.innerHTML = `<div style="color:#ef4444;">Chưa có khoảng cách. Vui lòng chọn địa chỉ ở Bước 1.</div>`;
    return;
  }

  container.innerHTML = `<div class="quote-loading"><i class="fas fa-spinner fa-spin"></i> Đang tính cước phí...</div>`;
  
  const payload = buildQuotePayload();
  const result  = window.calculateDomesticQuote(payload);
  
  if (!result || !result.services || result.services.length === 0) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp.</div>`;
    return;
  }

  if (selectedService) {
    const matchedService = result.services.find((svc) => svc.serviceType === selectedService.serviceType);
    selectedService = matchedService || null;
  }
  btn5.disabled = !selectedService;
  if (selectedService) {
    document.getElementById("eta-display").textContent = selectedService.estimate;
    etaPanel.classList.remove("is-hidden");
  }

  container.innerHTML = "";
  result.services.forEach(svc => {
    const bd = svc.breakdown || {};
    const deadlineHint = getDesiredDeliveryStatus(svc.estimate);
    const card = document.createElement("div");
    card.className = "service-card" + (selectedService && selectedService.serviceType === svc.serviceType ? " selected" : "");
    card.innerHTML = `
      <div class="service-card-top">
        <div class="service-name"><i class="fas fa-truck-fast"></i> ${svc.serviceName}</div>
        <div class="service-price">${svc.total.toLocaleString()} ₫</div>
      </div>
      <div style="display: flex; gap: 15px; margin-top: 8px; flex-wrap: wrap;">
        <div class="service-eta"><i class="far fa-clock"></i> ${svc.estimate}</div>
        <div class="service-eta" style="color: #16a34a; font-weight: 700;">
          <i class="fas fa-shipping-fast"></i> Gợi ý: ${svc.vehicleSuggestion || 'Xe máy'}
        </div>
        <div class="service-eta" style="color: #0a2a66; font-weight: 700;">
          <i class="fas fa-truck-ramp-box"></i> Đang tính giá: ${svc.selectedVehicleLabel || svc.vehicleSuggestion || 'Xe máy'}${svc.vehicleMultiplier > 1 ? ` (x${svc.vehicleMultiplier})` : ""}
        </div>
      </div>
      ${deadlineHint}
      <div class="service-breakdown">
        <div class="breakdown-row"><span>Cước cơ bản</span><span>${(bd.basePrice||0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí trọng lượng vượt mức</span><span>${(bd.overweightFee||0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí thể tích</span><span>${(bd.volumeFee||0).toLocaleString()} ₫</span></div>
        ${(bd.goodsFee||0)>0 ? `<div class="breakdown-row"><span>Phụ phí loại hàng</span><span>${bd.goodsFee.toLocaleString()} ₫</span></div>` : ''}
        ${(bd.timeFee||0)>0 ? `<div class="breakdown-row"><span>Phụ phí khung giờ lấy hàng</span><span>${bd.timeFee.toLocaleString()} ₫</span></div>` : ''}
        ${(bd.vehicleFee||0)>0 ? `<div class="breakdown-row"><span>Điều chỉnh theo xe</span><span>${bd.vehicleFee.toLocaleString()} ₫</span></div>` : ''}
        ${(bd.codFee||0)>0   ? `<div class="breakdown-row"><span>Phí COD</span><span>${bd.codFee.toLocaleString()} ₫</span></div>` : ''}
        ${(bd.insuranceFee||0)>0 ? `<div class="breakdown-row"><span>Phí bảo hiểm</span><span>${bd.insuranceFee.toLocaleString()} ₫</span></div>` : ''}
        <div class="breakdown-row"><span>Tổng</span><span>${svc.total.toLocaleString()} ₫</span></div>
      </div>
    `;
    card.addEventListener("click", () => {
      document.querySelectorAll(".service-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedService = svc;
      btn5.disabled = false;
      // Cập nhật ETA ở bước 3
      document.getElementById("eta-display").textContent = svc.estimate;
      etaPanel.classList.remove("is-hidden");
    });
    container.appendChild(card);
  });
}

// ========== STEP NAVIGATION ==========
function selectOption(groupId, btn) {
  document.querySelectorAll(`#${groupId} .option-btn`).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const inputId = groupId === 'payer-group' ? 'payer-val' : 'payment-val';
  document.getElementById(inputId).value = btn.dataset.val;
}

function goToStep(step) {
  if (step < 1 || step > 5) return;
  for (let i = 1; i <= 5; i++) {
    clearError(i);
    document.getElementById(`step-${i}`).classList.toggle("active", i === step);
    const ind = document.getElementById(`ind-${i}`);
    ind.className = "step-item" + (i < step ? " completed" : i === step ? " active" : "");
    if (i < step) {
      ind.querySelector(".step-circle").innerHTML = "✓";
    } else {
      ind.querySelector(".step-circle").textContent = i;
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateStep1() {
  clearError(1);
  const fields = [
    ["sender-name",   "Họ tên người gửi"],
    ["sender-phone",  "Số điện thoại người gửi"],
    ["receiver-name", "Họ tên người nhận"],
    ["receiver-phone","Số điện thoại người nhận"],
    ["search-pickup",  "Địa chỉ lấy hàng"],
    ["search-delivery","Địa chỉ giao hàng"],
  ];
  for (const [id, label] of fields) {
    const val = document.getElementById(id).value.trim();
    if (!val) {
      showError(1, `Vui lòng điền: ${label}`);
      document.getElementById(id).focus();
      return false;
    }
    if (id.includes("phone") && !isValidPhone(val)) {
      showError(1, `${label} không đúng định dạng (10 số, bắt đầu bằng 03, 05, 07, 08, 09).`);
      document.getElementById(id).focus();
      return false;
    }
  }
  if (!khoang_cach_km || khoang_cach_km <= 0) {
    showError(1, "Vui lòng xác định vị trí trên bản đồ bằng cách tìm kiếm địa chỉ hoặc kéo ghim.");
    return false;
  }
  if (document.getElementById("search-pickup").value === document.getElementById("search-delivery").value) {
    showError(1, "Địa chỉ lấy hàng và địa chỉ giao hàng không được trùng nhau.");
    return false;
  }
  return true;
}

function validateStep2() {
  clearError(2);
  if (orderItems.length === 0) {
    showError(2, "Vui lòng thêm ít nhất một món hàng.");
    return false;
  }
  for (let i = 0; i < orderItems.length; i++) {
    const it = orderItems[i];
    if (!it.loai_hang) {
      showError(2, `Vui lòng chọn loại hàng cho món hàng thứ ${i+1}.`);
      return false;
    }
    if (!it.ten_hang) {
      showError(2, `Vui lòng chọn hoặc nhập tên cho món hàng thứ ${i+1}.`);
      return false;
    }
    if ((it.so_luong || 0) <= 0) {
      showError(2, `Số lượng món hàng thứ ${i+1} phải từ 1 trở lên.`);
      return false;
    }
    if (it.can_nang <= 0 || it.can_nang > 1000) {
      showError(2, `Trọng lượng món hàng thứ ${i+1} phải từ 0.1kg đến 1000kg.`);
      return false;
    }
    if (it.chieu_dai <= 0 || it.chieu_rong <= 0 || it.chieu_cao <= 0) {
      showError(2, `Kích thước món hàng thứ ${i+1} phải > 0.`);
      return false;
    }
    if (it.gia_tri_khai_bao < 0) {
      showError(2, `Giá trị khai báo món hàng thứ ${i+1} không được âm.`);
      return false;
    }
  }
  return true;
}

function validateStep3() {
  clearError(3);
  const pDateVal = document.getElementById("pickup-date").value;
  if (!pDateVal) {
    showError(3, "Vui lòng chọn ngày lấy hàng.");
    return false;
  }
  
  const todayDate = new Date().toISOString().split('T')[0];
  if (pDateVal < todayDate) {
    showError(3, "Ngày lấy hàng không được ở trong quá khứ.");
    return false;
  }

  const pSlot = document.getElementById("pickup-slot").value;
  if (!pSlot) {
    showError(3, "Vui lòng chọn khung giờ lấy hàng.");
    return false;
  }
  const pickupSlot = getSelectedPickupSlot();
  if (!pickupSlot) {
    showError(3, "Khung giờ lấy hàng không hợp lệ. Vui lòng chọn lại.");
    return false;
  }
  const deliveryDate = document.getElementById("delivery-date").value;
  if (!deliveryDate) {
    showError(3, "Vui lòng chọn ngày nhận mong muốn.");
    return false;
  }
  const deliverySlot = getSelectedDeliverySlot();
  if (!deliverySlot) {
    showError(3, "Vui lòng chọn khung giờ nhận mong muốn.");
    return false;
  }
  const pickupCompare = new Date(`${pDateVal}T${pickupSlot.start}`);
  const deliveryCompare = new Date(`${deliveryDate}T${deliverySlot.end}`);
  if (!Number.isNaN(pickupCompare.getTime()) && !Number.isNaN(deliveryCompare.getTime()) && deliveryCompare < pickupCompare) {
    showError(3, "Thời gian mong muốn người nhận nhận hàng phải sau thời gian lấy hàng.");
    return false;
  }

  // Logic: Check if slot is in the past for TODAY
  if (pDateVal === todayDate) {
    const now = new Date();
    const currentHour = now.getHours();
    const endHour = parseInt(String(pickupSlot.end || "").split(":")[0], 10);
    
    if (currentHour >= endHour) {
      showError(3, `Khung giờ ${pickupSlot.label} của ngày hôm nay đã trôi qua. Vui lòng chọn khung giờ khác.`);
      return false;
    }
  }
  if (!selectedService) {
    showError(3, "Vui lòng chọn một gói cước vận chuyển.");
    return false;
  }
  return true;
}

function validateStep4() {
  clearError(4);
  return true;
}

// ========== REVIEW ==========
function prepareReview() {
  if (!selectedService) return;
  const payload = buildPayload();

  document.getElementById("rv-sender").textContent = `${document.getElementById("sender-name").value} — ${document.getElementById("sender-phone").value}`;
  document.getElementById("rv-receiver").textContent = `${document.getElementById("receiver-name").value} — ${document.getElementById("receiver-phone").value}`;
  document.getElementById("rv-pickup-addr").textContent   = document.getElementById("search-pickup").value   || "—";
  document.getElementById("rv-delivery-addr").textContent = document.getElementById("search-delivery").value || "—";
  document.getElementById("rv-distance").textContent = `${khoang_cach_km.toFixed(2)} km`;

  // Items List (Phần 5: Hiển thị hàng hóa rõ ràng)
  const list = document.getElementById("rv-items-container");
  list.innerHTML = "";
  orderItems.forEach((it, idx) => {
    const div = document.createElement("div");
    div.style.cssText = "background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;";
    div.innerHTML = `
      <div style="width: 40px; height: 40px; background: #f0f9ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #0a2a66;">
        <i class="fas fa-box"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 800; color: #1e293b; font-size: 14px;">${escapeHtml(it.ten_hang || ('Hàng hóa #' + (idx+1)))}</div>
        <div style="font-size: 12px; color: #64748b;">
          Loại: <strong>${escapeHtml(ITEM_TYPE_LABELS[it.loai_hang] || it.loai_hang)}</strong> • Số lượng: <strong>${it.so_luong || 1}</strong> • Nặng: <strong>${it.can_nang}kg/kiện</strong> • Khai giá: <strong>${it.gia_tri_khai_bao.toLocaleString()}₫</strong>
        </div>
      </div>
      <div style="font-size: 11px; color: #94a3b8; text-align: right;">
        Kích thước:<br>${it.chieu_dai}x${it.chieu_rong}x${it.chieu_cao}cm
      </div>
    `;
    list.appendChild(div);
  });

  document.getElementById("rv-cod").textContent   = payload.phi_thu_ho ? `${payload.phi_thu_ho.toLocaleString()} ₫` : "Không có";
  document.getElementById("rv-notes").textContent = document.getElementById("notes").value || "Không có";

  // Lịch trình (Phần 3: Thời gian và khoảng thời gian)
  const pDate = document.getElementById("pickup-date").value;
  const pSlot = getSelectedPickupSlot();
  document.getElementById("rv-pickup-time").textContent = `${pDate} | ${(pSlot && pSlot.label) || "—"}`;
  const deliveryDate = document.getElementById("delivery-date").value;
  const deliverySlot = getSelectedDeliverySlot();
  document.getElementById("rv-delivery-deadline").textContent = `${deliveryDate || "—"} | ${(deliverySlot && deliverySlot.label) || "—"}`;
  document.getElementById("rv-eta").textContent = selectedService.estimate;

  // Giá & Phương tiện (Phần 4: Phương tiện)
  const bd = selectedService.breakdown || {};
  const rvPrice = document.getElementById("rv-price-breakdown");
  rvPrice.innerHTML = `
    <div class="rv-row"><span class="rv-label">Gói dịch vụ:</span><span class="rv-val" style="color:#ff7a00; font-weight:800;">${selectedService.serviceName}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện gợi ý:</span><span class="rv-val">${selectedService.vehicleSuggestion || 'Xe máy'}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện đang tính giá:</span><span class="rv-val">${selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion || 'Xe máy'}</span></div>
    <div class="rv-row"><span class="rv-label">Cước cơ bản:</span><span class="rv-val">${(bd.basePrice||0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí trọng lượng vượt mức:</span><span class="rv-val">${(bd.overweightFee||0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí thể tích:</span><span class="rv-val">${(bd.volumeFee||0).toLocaleString()} ₫</span></div>
    ${(bd.goodsFee||0)>0 ? `<div class="rv-row"><span class="rv-label">Phụ phí loại hàng:</span><span class="rv-val">${bd.goodsFee.toLocaleString()} ₫</span></div>` : ''}
    ${(bd.timeFee||0)>0 ? `<div class="rv-row"><span class="rv-label">Phụ phí khung giờ lấy hàng:</span><span class="rv-val">${bd.timeFee.toLocaleString()} ₫</span></div>` : ''}
    ${(bd.vehicleFee||0)>0 ? `<div class="rv-row"><span class="rv-label">Điều chỉnh theo xe:</span><span class="rv-val">${bd.vehicleFee.toLocaleString()} ₫</span></div>` : ''}
    ${(bd.codFee||0)>0   ? `<div class="rv-row"><span class="rv-label">Phí COD:</span><span class="rv-val">${bd.codFee.toLocaleString()} ₫</span></div>` : ''}
    ${(bd.insuranceFee||0)>0 ? `<div class="rv-row"><span class="rv-label">Phí bảo hiểm:</span><span class="rv-val">${bd.insuranceFee.toLocaleString()} ₫</span></div>` : ''}
    <div class="rv-row" style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
      <span class="rv-label">Người trả cước:</span><span class="rv-val">${document.getElementById("payer-val").value === 'gui' ? 'Người gửi' : 'Người nhận'}</span>
    </div>
    <div class="rv-row"><span class="rv-label">Thanh toán:</span><span class="rv-val">${document.getElementById("payment-val").value === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}</span></div>
  `;
  document.getElementById("rv-total").textContent = `${selectedService.total.toLocaleString()} ₫`;
}

// ========== UPLOAD ==========
function previewUpload(type) {
  const inputId = type === "video" ? "video-upload" : "image-upload";
  const previewId = type === "video" ? "preview-video" : "preview-image";
  const metaId = type === "video" ? "video-upload-meta" : "image-upload-meta";
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const preview = document.getElementById(previewId);
  document.getElementById(metaId).textContent = `${file.name} • ${Math.round(file.size / 1024)} KB`;

  if (type === "video") {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    preview.src = e.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

// ========== SUBMIT ==========
async function submitOrder() {
  const btn = document.getElementById("btn-submit-order");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý...`;

  const payload = buildPayload();
  clearError(5);

  try {
    const response = await fetch("dat-lich-ajax.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      // Thành công: Hiển thị thông báo ngay trên form và chuyển hướng sau 2s
      const container = document.getElementById("step-5");
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px;">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2 style="color: #1e293b; font-weight: 800; margin-bottom: 12px;">Đặt đơn hàng thành công!</h2>
          <p style="color: #64748b; margin-bottom: 32px;">Mã đơn hàng: <strong style="color: #0a2a66;">${result.order_code || 'GHN-XXXX'}</strong>. Đang chuyển về trang quản lý đơn hàng...</p>
        </div>
      `;
      setTimeout(() => {
        window.location.href = "dashboard.php";
      }, 2500);
    } else {
      showError(5, "Lỗi: " + result.message);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (error) {
    console.error(error);
    showError(5, "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng kiểm tra kết nối mạng.");
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function buildPayload() {
  return {
    reorder_id:       reorderContext && reorderContext.source_order_id ? reorderContext.source_order_id : null,
    sender_name:      document.getElementById("sender-name").value,
    sender_phone:     document.getElementById("sender-phone").value,
    receiver_name:    document.getElementById("receiver-name").value,
    receiver_phone:   document.getElementById("receiver-phone").value,
    search_pickup:    document.getElementById("search-pickup").value,
    search_delivery:  document.getElementById("search-delivery").value,
    pickup_date:      document.getElementById("pickup-date").value,
    pickup_slot:      document.getElementById("pickup-slot").value,
    pickup_slot_label: (getSelectedPickupSlot() && getSelectedPickupSlot().label) || "",
    delivery_date:    document.getElementById("delivery-date").value,
    delivery_slot:    document.getElementById("delivery-slot").value,
    delivery_slot_label: (getSelectedDeliverySlot() && getSelectedDeliverySlot().label) || "",
    notes:            document.getElementById("notes").value,
    cod_value:        parseFloat(document.getElementById("cod-value").value) || 0,
    payment_method:   document.getElementById("payment-val").value,
    fee_payer:        document.getElementById("payer-val").value,
    service:          selectedService.serviceType,
    vehicle:          selectedService.selectedVehicleKey || "",
    vehicle_label:    selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion,
    total_fee:        selectedService.total,
    khoang_cach_km:   khoang_cach_km,
    items:            orderItems
  };
}
