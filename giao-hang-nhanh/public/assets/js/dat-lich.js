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
let orderItems = [
  { loai_hang: 'thuong', ten_hang: '', can_nang: 1.0, chieu_dai: 15, chieu_rong: 10, chieu_cao: 10, gia_tri_khai_bao: 0 }
];

// Danh sách tên hàng theo loại (giống form tính cước nhanh trên index.html)
const ITEM_NAMES_BY_TYPE = {
  thuong:       ["Quần áo/vải vóc", "Giày dép/túi xách", "Sách vở/văn phòng phẩm", "Đồ chơi nhựa", "Đồ gia dụng nhựa/inox", "Phụ kiện điện tử đơn giản"],
  'gia-tri-cao':["Điện thoại/máy tính bảng", "Laptop/máy ảnh", "Đồng hồ thông minh/tai nghe cao cấp", "Mỹ phẩm chính hãng", "Nước hoa", "Trang sức/đá quý"],
  'de-vo':      ["Đồ gốm sứ/chén dĩa", "Bình thủy tinh", "Màn hình TV/máy tính", "Gương soi", "Tượng đá/đồ thủ công mỹ nghệ", "Đèn trang trí"],
  'mui-hoi':    ["Mắm tôm/nước mắm đặc biệt", "Sầu riêng/chôm chôm", "Hải sản mắm", "Thực phẩm lên men", "Phân bón", "Hóa chất"],
  'chat-long':  ["Dầu ăn/nước mắm", "Mật ong/rượu vang", "Sữa nước/đồ uống đóng chai", "Sơn/dung môi", "Dầu nhớt"],
  'pin-lithium':["Sạc dự phòng", "Pin xe máy điện", "Xe điện", "Quạt tích điện", "Đèn pin"],
  'dong-lanh':  ["Thịt/cá/hải sản tươi sống", "Thực phẩm đông lạnh", "Rau củ/trái cây tươi", "Vaccine", "Dược phẩm bảo quản lạnh"],
  'cong-kenh':  ["Sofa/tủ quần áo/giường gỗ", "Lốp xe tải", "Máy móc công trình", "Bồn nước inox", "Cuộn cáp điện"],
};

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initAddressSearch("search-pickup",   "sug-pickup",   "pickup");
  initAddressSearch("search-delivery", "sug-delivery", "delivery");

  renderItems();
  document.getElementById("btn-add-item").addEventListener("click", addItem);
  document.getElementById("cod-value").addEventListener("input", () => renderItems());

  // Default date = today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("pickup-date").value = today;

  document.getElementById("btn-1-to-2").addEventListener("click", () => validateStep1() && goToStep(2));
  document.getElementById("btn-2-to-3").addEventListener("click", () => validateStep2() && goToStep(3));
  document.getElementById("btn-3-to-4").addEventListener("click", () => {
    if (validateStep3()) {
      renderServiceCards();
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
          if (step === 4) renderServiceCards();
          if (step === 5) prepareReview();
          goToStep(step);
        }
      }
    });
    item.style.cursor = "pointer";
  });
});

function getCurrentStep() {
  for (let i = 1; i <= 5; i++) {
    if (document.getElementById(`step-${i}`).classList.contains("active")) return i;
  }
  return 1;
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

function recalculateDistance() {
  const a = markerPickup.getLatLng();
  const b = markerDelivery.getLatLng();
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
  fetch(url)
    .then(r => r.json())
    .then(d => {
      khoang_cach_km = d.routes[0].distance / 1000;
      showDistance();
    })
    .catch(() => {
      khoang_cach_km = a.distanceTo(b) / 1000;
      showDistance();
    });
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

// ========== ITEMS ==========
function addItem() {
  orderItems.push({ loai_hang: 'thuong', ten_hang: '', can_nang: 1.0, chieu_dai: 15, chieu_rong: 10, chieu_cao: 10, gia_tri_khai_bao: 0 });
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
  orderItems[idx][field] = (field === 'loai_hang' || field === 'ten_hang') ? val : (parseFloat(val) || 0);
  updateWeightDisplay();
}

function renderItems() {
  const container = document.getElementById("items-list");
  container.innerHTML = "";
  orderItems.forEach((item, idx) => {
    const names = ITEM_NAMES_BY_TYPE[item.loai_hang] || [];
    const nameOpts = names.map(n => `<option value="${n}" ${item.ten_hang===n?'selected':''}>${n}</option>`).join('');
    const div = document.createElement("div");
    div.className = "item-row";
    div.innerHTML = `
      <div class="item-row-num">Món hàng #${idx+1}</div>
      <button class="item-delete-btn" onclick="removeItem(${idx})" title="Xóa"><i class="fas fa-times"></i></button>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Loại hàng</label>
          <select class="form-control" onchange="handleLoaiHangChange(${idx}, this.value)">
            <option value="thuong"       ${item.loai_hang==='thuong'?'selected':''}>Hàng thông thường</option>
            <option value="gia-tri-cao"  ${item.loai_hang==='gia-tri-cao'?'selected':''}>Hàng giá trị cao</option>
            <option value="de-vo"        ${item.loai_hang==='de-vo'?'selected':''}>Hàng dễ vỡ</option>
            <option value="mui-hoi"      ${item.loai_hang==='mui-hoi'?'selected':''}>Hàng có mùi hôi</option>
            <option value="chat-long"    ${item.loai_hang==='chat-long'?'selected':''}>Hàng chất lỏng</option>
            <option value="pin-lithium"  ${item.loai_hang==='pin-lithium'?'selected':''}>Điện tử (Pin Lithium)</option>
            <option value="dong-lanh"    ${item.loai_hang==='dong-lanh'?'selected':''}>Hàng đông lạnh</option>
            <option value="cong-kenh"    ${item.loai_hang==='cong-kenh'?'selected':''}>Hàng cồng kềnh</option>
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Tên hàng cụ thể</label>
          <select class="form-control" onchange="updateItemField(${idx}, 'ten_hang', this.value)">
            <option value="">Chọn tên hàng...</option>
            ${nameOpts}
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Cân nặng (kg)</label>
          <input type="number" class="form-control" step="0.1" value="${item.can_nang}" onchange="updateItemField(${idx},'can_nang',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Khai báo giá trị (₫)</label>
          <input type="number" class="form-control" placeholder="0" value="${item.gia_tri_khai_bao}" onchange="updateItemField(${idx},'gia_tri_khai_bao',this.value)" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
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
    totalAct += it.can_nang;
    totalVol += (it.chieu_dai * it.chieu_rong * it.chieu_cao) / 6000;
  });
  const billable = Math.max(totalAct, totalVol);
  document.getElementById("total-weight-display").textContent = `${billable.toFixed(1)} kg`;
}

function buildQuotePayload() {
  let totalCanNang = 0, totalKhaiGia = 0;
  let maxDai = 0, maxRong = 0, tongCao = 0;
  orderItems.forEach(it => {
    totalCanNang  += it.can_nang;
    totalKhaiGia  += it.gia_tri_khai_bao;
    maxDai  = Math.max(maxDai,  it.chieu_dai);
    maxRong = Math.max(maxRong, it.chieu_rong);
    tongCao += it.chieu_cao;
  });
  return {
    khoang_cach_km:   khoang_cach_km,
    loai_hang:        orderItems[0].loai_hang,
    ten_hang:         orderItems[0].ten_hang,
    can_nang:         totalCanNang,
    chieu_dai:        maxDai,
    chieu_rong:       maxRong,
    chieu_cao:        tongCao,
    so_luong:         orderItems.length,
    gia_tri_khai_bao: totalKhaiGia,
    phi_thu_ho:       parseFloat(document.getElementById("cod-value").value) || 0,
  };
}

// ========== SERVICE CARDS ==========
function renderServiceCards() {
  const container = document.getElementById("service-list");
  const btn5 = document.getElementById("btn-4-to-5");

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

  container.innerHTML = "";
  result.services.forEach(svc => {
    const bd = svc.breakdown || {};
    const card = document.createElement("div");
    card.className = "service-card" + (selectedService && selectedService.serviceType === svc.serviceType ? " selected" : "");
    card.innerHTML = `
      <div class="service-card-top">
        <div class="service-name"><i class="fas fa-truck-fast"></i> ${svc.serviceName}</div>
        <div class="service-price">${svc.total.toLocaleString()} ₫</div>
      </div>
      <div style="display: flex; gap: 15px; margin-top: 8px;">
        <div class="service-eta"><i class="far fa-clock"></i> ${svc.estimate}</div>
        <div class="service-eta" style="color: #16a34a; font-weight: 700;">
          <i class="fas fa-shipping-fast"></i> Phương tiện: ${svc.vehicleSuggestion || 'Xe máy'}
        </div>
      </div>
      <div class="service-breakdown">
        <div class="breakdown-row"><span>Cước cơ bản</span><span>${(bd.basePrice||0).toLocaleString()} ₫</span></div>
        <div class="breakdown-row"><span>Phí cân nặng</span><span>${(bd.weightFee||0).toLocaleString()} ₫</span></div>
        ${(bd.goodsFee||0)>0 ? `<div class="breakdown-row"><span>Phụ phí loại hàng</span><span>${bd.goodsFee.toLocaleString()} ₫</span></div>` : ''}
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
    if (!it.ten_hang) {
      showError(2, `Vui lòng chọn hoặc nhập tên cho món hàng thứ ${i+1}.`);
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

  // Logic: Check if slot is in the past for TODAY
  if (pDateVal === todayDate) {
    const now = new Date();
    const currentHour = now.getHours();
    // Ex: "08:00 - 10:00" -> end hour is 10
    const parts = pSlot.split(" - ");
    const endHour = parseInt(parts[1].split(":")[0]);
    
    if (currentHour >= endHour) {
      showError(3, `Khung giờ ${pSlot} của ngày hôm nay đã trôi qua. Vui lòng chọn khung giờ khác.`);
      return false;
    }
  }
  return true;
}

function validateStep4() {
  clearError(4);
  if (!selectedService) {
    showError(4, "Vui lòng chọn một gói cước vận chuyển.");
    return false;
  }
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
        <div style="font-weight: 800; color: #1e293b; font-size: 14px;">${it.ten_hang || 'Hàng hóa #' + (idx+1)}</div>
        <div style="font-size: 12px; color: #64748b;">
          Loại: <strong>${it.loai_hang}</strong> • Nặng: <strong>${it.can_nang}kg</strong> • Khai giá: <strong>${it.gia_tri_khai_bao.toLocaleString()}₫</strong>
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
  const pSlot = document.getElementById("pickup-slot").value;
  document.getElementById("rv-pickup-time").textContent = `${pDate} | ${pSlot}`;
  document.getElementById("rv-eta").textContent = selectedService.estimate;

  // Giá & Phương tiện (Phần 4: Phương tiện)
  const bd = selectedService.breakdown || {};
  const rvPrice = document.getElementById("rv-price-breakdown");
  rvPrice.innerHTML = `
    <div class="rv-row"><span class="rv-label">Gói dịch vụ:</span><span class="rv-val" style="color:#ff7a00; font-weight:800;">${selectedService.serviceName}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện gợi ý:</span><span class="rv-val">${selectedService.vehicleSuggestion || 'Xe máy'}</span></div>
    <div class="rv-row"><span class="rv-label">Cước cơ bản:</span><span class="rv-val">${(bd.basePrice||0).toLocaleString()} ₫</span></div>
    <div class="rv-row"><span class="rv-label">Phí cân nặng:</span><span class="rv-val">${(bd.weightFee||0).toLocaleString()} ₫</span></div>
    ${(bd.goodsFee||0)>0 ? `<div class="rv-row"><span class="rv-label">Phụ phí loại hàng:</span><span class="rv-val">${bd.goodsFee.toLocaleString()} ₫</span></div>` : ''}
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
function previewFile() {
  const file = document.getElementById("file-upload").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById("preview-image");
    img.src = e.target.result;
    img.style.display = "block";
  };
  reader.readAsDataURL(file);
}

// ========== SUBMIT ==========
async function submitOrder() {
  const btn = document.querySelector(".btn-next.orange");
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
    sender_name:      document.getElementById("sender-name").value,
    sender_phone:     document.getElementById("sender-phone").value,
    receiver_name:    document.getElementById("receiver-name").value,
    receiver_phone:   document.getElementById("receiver-phone").value,
    search_pickup:    document.getElementById("search-pickup").value,
    search_delivery:  document.getElementById("search-delivery").value,
    pickup_date:      document.getElementById("pickup-date").value,
    pickup_slot:      document.getElementById("pickup-slot").value,
    notes:            document.getElementById("notes").value,
    cod_value:        parseFloat(document.getElementById("cod-value").value) || 0,
    payment_method:   document.getElementById("payment-val").value,
    fee_payer:        document.getElementById("payer-val").value,
    service:          selectedService.type_key,
    vehicle:          selectedService.vehicleSuggestion,
    total_fee:        selectedService.total,
    khoang_cach_km:   khoang_cach_km,
    items:            orderItems
  };
}
