/**
 * dat-lich/pricing.js
 * Chịu trách nhiệm cho toàn bộ phần giá trong form đặt lịch:
 * - thu thập payload tính cước từ UI
 * - gọi calculator calculateDomesticQuote(...)
 * - render card gói cước, tạm tính và breakdown 5 loại phí
 *
 * Liên quan trực tiếp:
 * - dat-lich/core.js: cung cấp state, item list, khoảng cách và helper DOM
 * - pricing-data/core.js: cung cấp calculator calculateDomesticQuote(...)
 * - dat-lich/flow-submit.js: dùng kết quả quote để review và gửi đơn
 */
function them_hang_hoa() {
  orderItems.push({
    loai_hang: "",
    ten_hang: "",
    so_luong: 1,
    gia_tri_khai_bao: 0,
    can_nang: 1.0,
    chieu_dai: 15,
    chieu_rong: 10,
    chieu_cao: 10,
  });
  hien_thi_danh_sach_hang_hoa();
}

function xoa_hang_hoa(idx) {
  if (orderItems.length <= 1) return;
  orderItems.splice(idx, 1);
  hien_thi_danh_sach_hang_hoa();
}

function xu_ly_thay_doi_loai_hang(idx, val) {
  orderItems[idx].loai_hang = val;
  hien_thi_danh_sach_hang_hoa();
}

function cap_nhat_truong_hang_hoa(idx, field, val) {
  if (field === "loai_hang" || field === "ten_hang") {
    orderItems[idx][field] = val;
  } else if (field === "so_luong") {
    orderItems[idx][field] = Math.max(1, parseInt(val, 10) || 1);
  } else {
    orderItems[idx][field] = parseFloat(val) || 0;
  }
  cap_nhat_tong_can_nang();
}

function hien_thi_danh_sach_hang_hoa() {
  const container = document.getElementById("danh_sach_hang_hoa");
  container.innerHTML = "";
  orderItems.forEach((item, idx) => {
    const typeOptions = ITEM_TYPES.map(
      (type) => `
      <option value="${escapeHtml(type.key)}" ${item.loai_hang === type.key ? "selected" : ""}>${escapeHtml(type.label)}</option>
    `,
    ).join("");
    const isTypeKnown = ITEM_TYPES.some((type) => type.key === item.loai_hang);
    const currentTypeOption =
      item.loai_hang && !isTypeKnown
        ? `<option value="${escapeHtml(item.loai_hang)}" selected>${escapeHtml(
            ITEM_TYPE_LABELS[item.loai_hang] || item.loai_hang,
          )}</option>`
        : "";
    const typePlaceholder =
      itemTypesLoadState === "loading" && !ITEM_TYPES.length
        ? "Đang tải loại hàng..."
        : "Chọn loại hàng...";
    const typeDisabled =
      itemTypesLoadState === "loading" && !ITEM_TYPES.length ? "disabled" : "";
    const div = document.createElement("div");
    div.className = "item-row";
    div.dataset.itemIndex = String(idx);
    div.innerHTML = `
      <div class="item-row-num">Kiện hàng #${idx + 1}</div>
      <button class="item-delete-btn" onclick="xoa_hang_hoa(${idx})" title="Xóa"><i class="fas fa-times"></i></button>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Loại hàng</label>
          <select class="form-control loai_hang" name="mat_hang[${idx}][loai_hang]" onchange="xu_ly_thay_doi_loai_hang(${idx}, this.value)" ${typeDisabled}>
            <option value="">${escapeHtml(typePlaceholder)}</option>
            ${currentTypeOption}${typeOptions}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Tên hàng cụ thể</label>
          <input type="text" class="form-control ten_hang" name="mat_hang[${idx}][ten_hang]" value="${escapeHtml(item.ten_hang || "")}" placeholder="Nhập tên hàng cụ thể" oninput="cap_nhat_truong_hang_hoa(${idx}, 'ten_hang', this.value)" />
        </div>
      </div>
      <div class="item-grid item-grid-declared">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">
            Khai giá dòng hàng (₫)
            ${buildInfoToggleMarkup(
              DECLARED_VALUE_HELP,
              "Giải thích khai báo giá trị",
              "field-help",
            )}
          </label>
          <input type="number" class="form-control gia_tri_khai_bao" name="mat_hang[${idx}][gia_tri_khai_bao]" value="${item.gia_tri_khai_bao}" onchange="cap_nhat_truong_hang_hoa(${idx},'gia_tri_khai_bao',this.value)" />
        </div>
      </div>
      <div class="item-grid item-grid-quantity-weight">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px;">Số lượng kiện</label>
          <input type="number" class="form-control so_luong" name="mat_hang[${idx}][so_luong]" min="1" step="1" value="${item.so_luong || 1}" onchange="cap_nhat_truong_hang_hoa(${idx},'so_luong',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cân nặng mỗi kiện (kg)</label>
          <input type="number" class="form-control can_nang" name="mat_hang[${idx}][can_nang]" step="0.1" value="${item.can_nang}" onchange="cap_nhat_truong_hang_hoa(${idx},'can_nang',this.value)" />
        </div>
      </div>
      <div class="item-grid item-grid-dimensions">
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Dài (cm)</label>
          <input type="number" class="form-control chieu_dai" name="mat_hang[${idx}][chieu_dai]" value="${item.chieu_dai}" onchange="cap_nhat_truong_hang_hoa(${idx},'chieu_dai',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Rộng (cm)</label>
          <input type="number" class="form-control chieu_rong" name="mat_hang[${idx}][chieu_rong]" value="${item.chieu_rong}" onchange="cap_nhat_truong_hang_hoa(${idx},'chieu_rong',this.value)" />
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;">Cao (cm)</label>
          <input type="number" class="form-control chieu_cao" name="mat_hang[${idx}][chieu_cao]" value="${item.chieu_cao}" onchange="cap_nhat_truong_hang_hoa(${idx},'chieu_cao',this.value)" />
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  cap_nhat_tong_can_nang();
  bindInfoToggleInteractions(container);
}

function cap_nhat_tong_can_nang() {
  let totalAct = 0;
  orderItems.forEach((it) => {
    totalAct += it.can_nang * (it.so_luong || 1);
  });
  document.getElementById("hien_thi_tong_can_nang").textContent =
    `${totalAct.toFixed(1)} kg`;
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
  const normalizeType =
    typeof window.normalizeItemTypeKey === "function"
      ? window.normalizeItemTypeKey
      : (value) => String(value || "").trim().toLowerCase();
  for (const type of priority) {
    const found = orderItems.find(
      (item) => normalizeType(item.loai_hang) === type,
    );
    if (found) return found;
  }
  const firstSelected = orderItems.find((item) => item.loai_hang);
  return (
    firstSelected || orderItems[0] || { loai_hang: "thuong", ten_hang: "" }
  );
}

function tao_du_lieu_tinh_cuoc() {
  let totalCanNang = 0,
    totalKhaiGia = 0;
  let maxDai = 0,
    maxRong = 0,
    maxCao = 0,
    tongSoLuong = 0;
  orderItems.forEach((it) => {
    const itemQty = Math.max(1, parseInt(it.so_luong, 10) || 1);
    totalCanNang += it.can_nang * itemQty;
    totalKhaiGia += it.gia_tri_khai_bao;
    maxDai = Math.max(maxDai, it.chieu_dai);
    maxRong = Math.max(maxRong, it.chieu_rong);
    maxCao = Math.max(maxCao, it.chieu_cao);
    tongSoLuong += itemQty;
  });
  const primaryItem = getPrimaryItemMeta();
  const isInstantMode = getDeliveryMode() === "instant";
  const currentDate = getCurrentDateTime();
  const instantWindow = isInstantMode ? getInstantPricingWindow(currentDate) : null;
  const selectedPickupSlot = getSelectedPickupSlot();
  const pickupSlot = selectedPickupSlot || instantWindow;
  const urgentCondition = getSelectedUrgentCondition();
  const pickupPoint = markerPickup?.getLatLng?.() || null;
  const deliveryPoint = markerDelivery?.getLatLng?.() || null;
  const pickupDateInput = document.getElementById("ngay_lay_hang");
  const pickupDateValue =
    pickupDateInput?.value || (isInstantMode ? formatDateValue(currentDate) : "");
  return {
    khoang_cach_km: khoang_cach_km,
    loai_hang: primaryItem.loai_hang,
    ten_hang: primaryItem.ten_hang,
    mat_hang: orderItems.map((item) => ({
      loai_hang: item.loai_hang,
      ten_hang: item.ten_hang,
      so_luong: Math.max(1, parseInt(item.so_luong, 10) || 1),
      gia_tri_khai_bao: parseFloat(item.gia_tri_khai_bao) || 0,
      can_nang: parseFloat(item.can_nang) || 0,
      chieu_dai: parseFloat(item.chieu_dai) || 0,
      chieu_rong: parseFloat(item.chieu_rong) || 0,
      chieu_cao: parseFloat(item.chieu_cao) || 0,
    })),
    can_nang: totalCanNang,
    tong_can_nang: totalCanNang,
    chieu_dai: maxDai,
    chieu_rong: maxRong,
    chieu_cao: maxCao,
    so_luong: tongSoLuong,
    gia_tri_khai_bao: totalKhaiGia,
    phi_thu_ho: parseFloat(document.getElementById("gia_tri_thu_ho_cod").value) || 0,
    loai_xe: document.getElementById("phuong_tien_giao_hang").value || "auto",
    che_do_giao_hang: getDeliveryMode(),
    pickup_lat: pickupPoint ? Number(pickupPoint.lat) : 0,
    pickup_lng: pickupPoint ? Number(pickupPoint.lng) : 0,
    delivery_lat: deliveryPoint ? Number(deliveryPoint.lat) : 0,
    delivery_lng: deliveryPoint ? Number(deliveryPoint.lng) : 0,
    ngay_lay_hang: pickupDateValue,
    khung_gio_lay_hang: (pickupSlot && pickupSlot.key) || document.getElementById("khung_gio_lay_hang").value || "",
    ten_khung_gio_lay_hang: (pickupSlot && pickupSlot.label) || "",
    gio_bat_dau_lay_hang: (pickupSlot && pickupSlot.start) || "",
    gio_ket_thuc_lay_hang: (pickupSlot && pickupSlot.end) || "",
    phi_khung_gio:
      (pickupSlot && pickupSlot.phicodinh) || 0,
    he_so_khung_gio:
      (pickupSlot && pickupSlot.heso) || 1,
    ngay_nhan_mong_muon: "",
    khung_gio_nhan_hang: "",
    ten_khung_gio_nhan_hang: "",
    gio_bat_dau_nhan_hang: "",
    gio_ket_thuc_nhan_hang: "",
    thoi_gian_xu_ly_phut: 0,
    ten_thoi_gian_xu_ly: isInstantMode ? "Điều phối realtime" : "",
    dieu_kien_dich_vu:
      (urgentCondition && urgentCondition.key) || "macdinh",
    ten_dieu_kien_dich_vu:
      (urgentCondition && urgentCondition.label) || "Bình thường",
  };
}

function lay_kiem_tra_hang_hoa_xe_may_hien_tai() {
  const thongTinHang = tao_du_lieu_tinh_cuoc();
  if (typeof window.kiem_tra_hang_hoa_xe_may !== "function") {
    return {
      hop_le: true,
      ly_do: "",
      gioi_han: {},
    };
  }
  return window.kiem_tra_hang_hoa_xe_may({
    trong_luong_hang: thongTinHang.can_nang,
    chieu_dai: thongTinHang.chieu_dai,
    chieu_rong: thongTinHang.chieu_rong,
    chieu_cao: thongTinHang.chieu_cao,
  });
}

function updateStorageNote(services = []) {
  const panel = document.getElementById("bang_goi_y_luu_kho");
  if (!panel) return;
  panel.classList.add("is-hidden");
}

function tao_html_cac_dong_phi_hien_thi(
  chi_tiet_gia = {},
  ten_lop_dong,
  ten_lop_nhan,
  ten_lop_gia_tri,
) {
  const dongGia = [
    {
      nhan: "Phí vận chuyển",
      gia_tri: lay_tong_gia_van_chuyen(chi_tiet_gia),
    },
    {
      nhan: "Phụ phí loại hàng",
      gia_tri: Number(chi_tiet_gia.goodsFee || 0),
    },
    {
      nhan: "Phụ phí khung giờ",
      gia_tri: Number(chi_tiet_gia.timeFee || 0),
    },
    {
      nhan: "Phụ phí thời tiết",
      gia_tri: Number(chi_tiet_gia.conditionFee || 0),
    },
    {
      nhan: "Điều chỉnh theo xe",
      gia_tri: Number(chi_tiet_gia.vehicleFee || 0),
    },
  ];
  const phiCod = Number(chi_tiet_gia.codFee || 0);
  const phiBaoHiem = Number(chi_tiet_gia.insuranceFee || 0);

  if (phiCod > 0) {
    dongGia.push({
      nhan: "Phí COD",
      gia_tri: phiCod,
    });
  }
  if (phiBaoHiem > 0) {
    dongGia.push({
      nhan: "Phí bảo hiểm",
      gia_tri: phiBaoHiem,
    });
  }

  return dongGia
    .map(
      (dong) =>
        `<div class="${ten_lop_dong}"><span class="${ten_lop_nhan}">${dong.nhan}</span><span class="${ten_lop_gia_tri}">${formatMoneyVnd(dong.gia_tri)}</span></div>`,
    )
    .join("");
}

function lay_tong_gia_van_chuyen(chi_tiet_gia = {}) {
  return Number(
    chi_tiet_gia.tong_gia_van_chuyen ?? chi_tiet_gia.basePrice ?? 0,
  );
}

function lay_dich_vu_tam_tinh_buoc_1() {
  if (typeof window.calculateDomesticQuote !== "function") return null;
  if (!khoang_cach_km || khoang_cach_km <= 0) return null;

  try {
    const result = window.calculateDomesticQuote(tao_du_lieu_tinh_cuoc());
    const services = Array.isArray(result?.services) ? result.services : [];
    if (!services.length) return null;

    const isInstantMode = getDeliveryMode() === "instant";
    const packageChoice = document.getElementById("goi_cuoc");
    const chosenType = packageChoice ? packageChoice.value : null;

    return (
      services.find((svc) =>
        isInstantMode
          ? svc.serviceType === "instant"
          : svc.serviceType === chosenType,
      ) ||
      services[0] ||
      null
    );
  } catch (error) {
    console.warn("Không thể tính tạm cước ở bước 1:", error);
    return null;
  }
}

function cap_nhat_hien_thi_tam_tinh_buoc_1(dichVu = null) {
  const amountNode = document.getElementById("gia_tri_tam_tinh_theo_km");
  const wrapNode = document.getElementById("thong_tin_tam_tinh_theo_km");
  if (!amountNode || !wrapNode) return;
  if (!khoang_cach_km || khoang_cach_km <= 0) {
    amountNode.textContent = "";
    wrapNode.style.display = "none";
    return;
  }

  const activeService = dichVu || lay_dich_vu_tam_tinh_buoc_1() || selectedService;
  const distanceFee = lay_tong_gia_van_chuyen(activeService?.breakdown || activeService);
  const displayAmount =
    distanceFee > 0 ? distanceFee : Number(activeService?.total || 0);

  if (displayAmount > 0) {
    amountNode.textContent = formatMoneyVnd(displayAmount);
    wrapNode.style.display = "inline";
    return;
  }

  amountNode.textContent = "";
  wrapNode.style.display = "none";
}

// ========== SERVICE CARDS ==========
function renderServiceCards(options = {}) {
  const container = document.getElementById("danh_sach_dich_vu");
  const btn5 = document.getElementById("btn_buoc_4_sang_5");
  const etaPanel = document.getElementById("bang_thoi_gian_giao_du_kien");
  const isInstantMode = getDeliveryMode() === "instant";
  etaPanel.classList.add("is-hidden");
  document.getElementById("hien_thi_thoi_gian_giao_du_kien").textContent = "—";

  if (typeof window.calculateDomesticQuote !== "function") {
    container.innerHTML = `<div style="color:#ef4444;">Không tải được dữ liệu bảng giá.</div>`;
    return;
  }
  if (khoang_cach_km <= 0) {
    selectedService = null;
    btn5.disabled = true;
    updateStorageNote();
    cap_nhat_hien_thi_tam_tinh_buoc_1(null);
    container.innerHTML = `<div style="color:#ef4444;">Chưa có khoảng cách. Vui lòng chọn địa chỉ ở Bước 1.</div>`;
    return;
  }

  container.innerHTML = `<div class="quote-loading"><i class="fas fa-spinner fa-spin"></i> Đang tính cước phí...</div>`;

  if (!options.skipWeatherFetch) {
    requestWeatherQuote();
  }

  const payload = tao_du_lieu_tinh_cuoc();
  const result = window.calculateDomesticQuote(payload);

  if (!result || !result.services || result.services.length === 0) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp.</div>`;
    cap_nhat_hien_thi_tam_tinh_buoc_1(null);
    return;
  }

  // Lấy gói cước được chọn từ Select Box
    const packageChoice = document.getElementById("goi_cuoc");
  const chosenType = packageChoice ? packageChoice.value : null;

  const filteredServices = result.services.filter((svc) =>
    isInstantMode
      ? svc.serviceType === "instant"
      : svc.serviceType === chosenType,
  );

  if (!filteredServices.length) {
    container.innerHTML = `<div style="color:#ef4444;">Không tìm thấy gói cước phù hợp với lựa chọn hiện tại.</div>`;
    selectedService = null;
    btn5.disabled = true;
    cap_nhat_hien_thi_tam_tinh_buoc_1(null);
    return;
  }

  // Luôn chọn đúng gói tương ứng với Select Box
  selectedService = filteredServices[0];
  updateStorageNote();
  syncUrgentConditionVisibility(selectedService && selectedService.serviceType);
  btn5.disabled = !selectedService;
  cap_nhat_hien_thi_tam_tinh_buoc_1(selectedService);
  if (selectedService) {
    document.getElementById("hien_thi_thoi_gian_giao_du_kien").textContent =
      selectedService.estimate || "—";
    etaPanel.classList.remove("is-hidden");
  }

  container.innerHTML = "";

  filteredServices.forEach((svc) => {
    const bd = svc.breakdown || {};
    const card = document.createElement("div");
    card.className =
      "service-card" +
      (selectedService && selectedService.serviceType === svc.serviceType
        ? " selected"
        : "");
    card.innerHTML = `
      <div class="service-card-top">
        <div class="service-name"><i class="fas fa-truck-fast"></i> ${svc.serviceName}</div>
        <div class="service-price">${svc.total.toLocaleString()} ₫</div>
      </div>
      <div class="service-card-meta">
        <div class="service-eta"><i class="far fa-clock"></i> Thời gian giao dự kiến: ${svc.estimate}</div>
        <div class="service-eta" style="color: #16a34a; font-weight: 700;">
          <i class="fas fa-shipping-fast"></i>
          <span>Gợi ý: ${svc.vehicleSuggestion || "Xe máy"}</span>
        </div>
        <div class="service-eta" style="color: #0a2a66; font-weight: 700;">
          <i class="fas fa-truck-ramp-box"></i> Đang tính giá: ${svc.selectedVehicleLabel || svc.vehicleSuggestion || "Xe máy"}${Number(svc.he_so_xe || 1) > 1 ? ` (x${svc.he_so_xe})` : ""}
        </div>
      </div>
      <div class="service-breakdown">
        ${tao_html_cac_dong_phi_hien_thi(
          bd,
          "breakdown-row",
          "",
          "",
        )}
        <div class="breakdown-row"><span>Tổng</span><span>${svc.total.toLocaleString()} ₫</span></div>
      </div>
    `;
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".service-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedService = svc;
      cap_nhat_hien_thi_tam_tinh_buoc_1(selectedService);
      syncUrgentConditionVisibility(svc.serviceType);
      btn5.disabled = false;
      // Cập nhật ETA ở bước 3
      document.getElementById("hien_thi_thoi_gian_giao_du_kien").textContent =
        svc.estimate || "—";
      etaPanel.classList.remove("is-hidden");
    });
    container.appendChild(card);
  });

  btn5.disabled = !selectedService;
  bindInfoToggleInteractions(container);
}

// ========== STEP NAVIGATION ==========
