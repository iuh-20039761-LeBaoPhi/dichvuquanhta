/**
 * dat-lich/map-reorder.js
 * Luồng map, prefill và reorder của form đặt lịch.
 * - Khởi tạo bản đồ, marker, geocode, tính khoảng cách
 * - Tự điền dữ liệu từ reorder / prefill / draft
 * - Đồng bộ địa chỉ và tọa độ giữa UI với state
 *
 * Liên quan trực tiếp:
 * - dat-lich/core.js: cung cấp state chung, helper và fetch reorder từ KRUD
 * - dat-lich/pricing.js: đọc khoảng cách mới để cập nhật giá
 * - dat-lich/flow-submit.js: dùng dữ liệu đã resolve để review và submit
 */
function initMap() {
  map = L.map("ban_do_giao_hang").setView([10.762622, 106.660172], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const iconBlue = new L.Icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  const iconRed = new L.Icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  markerPickup = L.marker([10.7769, 106.7009], {
    draggable: true,
    icon: iconBlue,
  })
    .addTo(map)
    .bindPopup("📍 Điểm lấy hàng")
    .bindTooltip("<div>Lấy hàng</div>", {
      permanent: true,
      direction: "top",
      offset: [0, -30],
      className: "map-marker-tooltip map-marker-tooltip--pickup",
    });
  markerDelivery = L.marker([10.75, 106.65], { draggable: true, icon: iconRed })
    .addTo(map)
    .bindPopup("🏁 Điểm giao hàng")
    .bindTooltip("<div>Giao hàng</div>", {
      permanent: true,
      direction: "top",
      offset: [0, -30],
      className: "map-marker-tooltip map-marker-tooltip--delivery",
    });

  markerPickup.on("dragend", () => {
    reverseGeocode(markerPickup.getLatLng(), "dia_chi_lay_hang");
    recalculateDistance();
  });
  markerDelivery.on("dragend", () => {
    reverseGeocode(markerDelivery.getLatLng(), "dia_chi_giao_hang");
    recalculateDistance();
  });

  recalculateDistance();
}

function initGeolocationButton() {
  const btn = document.getElementById("btn_lay_vi_tri_hien_tai");
  if (!btn) return;

  btn.addEventListener("click", () => {
    requestPickupCurrentLocation({ showError: true, silent: false });
  });
}

function setGeolocationButtonLoading(isLoading) {
  const btn = document.getElementById("btn_lay_vi_tri_hien_tai");
  if (!btn) return;
  if (!btn.dataset.originalHtml) {
    btn.dataset.originalHtml = btn.innerHTML;
  }
  btn.innerHTML = isLoading
    ? `<i class="fas fa-spinner fa-spin" style="margin-right: 6px;"></i> Đang lấy...`
    : btn.dataset.originalHtml;
  btn.disabled = isLoading;
}

function requestPickupCurrentLocation(options = {}) {
  const showError = options.showError !== false;
  const silent = options.silent === true;

  if (isResolvingPickupLocation) return;

  if (!navigator.geolocation) {
    if (showError) {
      showErrorMessage(
        "Trình duyệt của thiết bị không hỗ trợ lấy vị trí, vui lòng nhập thủ công.",
      );
    }
    return;
  }

  xoa_loi(1);
  isResolvingPickupLocation = true;
  setGeolocationButtonLoading(true);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (markerPickup) {
        markerPickup.setLatLng([lat, lng]);
      }
      adjustMapBounds();
      reverseGeocode({ lat, lng }, "dia_chi_lay_hang");
      recalculateDistance();
      isResolvingPickupLocation = false;
      setGeolocationButtonLoading(false);
    },
    (error) => {
      console.warn("Lỗi lấy vị trí: ", error);
      if (!silent && showError) {
        showErrorMessage(
          "Thiết bị đã chặn quyền truy cập vị trí. Vui lòng cấp quyền hoặc bấm nút lấy vị trí hiện tại để thử lại.",
        );
      }
      isResolvingPickupLocation = false;
      setGeolocationButtonLoading(false);
    },
    { timeout: 10000 },
  );
}

function showErrorMessage(message) {
  hien_thi_loi(1, message);
}

function shouldAutoResolvePickupLocation() {
  if (getQueryParam("reorder_id")) return false;
  const pickupInput = document.getElementById("dia_chi_lay_hang");
  return !String(pickupInput?.value || "").trim();
}

function adjustMapBounds() {
  if (markerPickup && markerDelivery && map) {
    const group = new L.featureGroup([markerPickup, markerDelivery]);
    map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
  }
}

function refreshDistanceDependentUi(options = {}) {
  showDistance();
  if (lay_buoc_hien_tai() >= 3) {
    if (getDeliveryMode() === "instant" && options.skipWeatherFetch !== true) {
      requestWeatherQuote(true);
    }
    renderServiceCards({ skipWeatherFetch: options.skipWeatherFetch === true });
  }
}

async function recalculateDistance() {
  const requestToken = ++recalculateDistanceRequestToken;
  const a = markerPickup.getLatLng();
  const b = markerDelivery.getLatLng();
  const fallbackDistanceKm = a.distanceTo(b) / 1000;
  khoang_cach_km = fallbackDistanceKm;
  refreshDistanceDependentUi({ skipWeatherFetch: true });

  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (requestToken !== recalculateDistanceRequestToken) {
      return;
    }
    if (data && data.routes && data.routes[0] && data.routes[0].distance) {
      khoang_cach_km = data.routes[0].distance / 1000;
    } else {
      throw new Error("No route");
    }
  } catch (error) {
    if (requestToken !== recalculateDistanceRequestToken) {
      return;
    }
    khoang_cach_km = fallbackDistanceKm;
  }
  if (requestToken === recalculateDistanceRequestToken) {
    refreshDistanceDependentUi({ skipWeatherFetch: true });
  }
}

function showDistance() {
  const badge = document.getElementById("thong_tin_khoang_cach");
  const distanceValue = document.getElementById("gia_tri_khoang_cach_km");
  if (distanceValue) {
    distanceValue.textContent = khoang_cach_km.toFixed(2);
  }
  badge.style.display = "inline-flex";
  cap_nhat_hien_thi_tam_tinh_buoc_1();
}

// ========== ADDRESS SEARCH ==========
function initAddressSearch(inputId, sugId, markerType) {
  const input = document.getElementById(inputId);
  const sugBox = document.getElementById(sugId);
  let timer;

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) {
      sugBox.style.display = "none";
      return;
    }
    timer = setTimeout(() => fetchNominatim(q, sugBox, markerType), 250);
  });
  document.addEventListener("click", (e) => {
    if (e.target !== input) sugBox.style.display = "none";
  });
}

function fetchNominatim(query, sugBox, markerType) {
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=6`,
  )
    .then((r) => r.json())
    .then((data) => {
      sugBox.innerHTML = "";
      if (!data.length) {
        sugBox.style.display = "none";
        return;
      }
      data.forEach((item) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        const parts = item.display_name.split(",");
        div.innerHTML = `<i class="fas fa-map-pin" style="color:#94a3b8;margin-top:3px;"></i>
          <div><span class="s-main">${parts[0]}</span><span class="s-sub">${parts.slice(1).join(",").trim()}</span></div>`;
        div.addEventListener("click", () => {
          const inputId =
            markerType === "pickup" ? "dia_chi_lay_hang" : "dia_chi_giao_hang";
          document.getElementById(inputId).value = item.display_name;
          sugBox.style.display = "none";
          if (markerType === "pickup")
            markerPickup.setLatLng([item.lat, item.lon]);
          else markerDelivery.setLatLng([item.lat, item.lon]);
          adjustMapBounds();
          recalculateDistance();
        });
        sugBox.appendChild(div);
      });
      sugBox.style.display = "block";
    });
}

function reverseGeocode(latlng, inputId) {
  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
  )
    .then((r) => r.json())
    .then((d) => {
      if (d.display_name)
        document.getElementById(inputId).value = d.display_name;
    });
}

function getQueryParam(name) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

async function resolveAddressToLatLng(address) {
  const query = String(address || "").trim();
  if (!query) return null;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=1`,
  );
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
  const button = document.querySelector(
    `#${groupId} .option-btn[data-val="${value}"]`,
  );
  if (button) {
    chon_tuy_chon(groupId, button);
  }
}

function normalizeReorderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return [
      {
        loai_hang: "",
        ten_hang: "",
        so_luong: 1,
        gia_tri_khai_bao: 0,
        can_nang: 1,
        chieu_dai: 15,
        chieu_rong: 10,
        chieu_cao: 10,
      },
    ];
  }

  return items.map((item) => ({
    loai_hang: item.loai_hang || "thuong",
    ten_hang: item.ten_hang || "",
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
  banner.style.cssText =
    "margin-bottom:18px;padding:14px 16px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-weight:700;";
  banner.innerHTML = `<i class="fas fa-rotate-right"></i> Đang đặt lại từ đơn <strong>${escapeHtml(orderCode || "")}</strong>. Bạn có thể chỉnh lại trước khi gửi.`;
  container.insertBefore(banner, container.firstChild);
}

function resetUploadsAfterDraftRestore(hadUploads) {
  const imageInput = document.getElementById("hinh_anh_hang_hoa");
  const videoInput = document.getElementById("video_hang_hoa");
  const imageMeta = document.getElementById("thong_tin_tai_len_anh");
  const videoMeta = document.getElementById("thong_tin_tai_len_video");
  const imagePreview = document.getElementById("xem_truoc_anh_hang_hoa");
  const videoPreview = document.getElementById("xem_truoc_video_hang_hoa");
  const restoreMessage = hadUploads
    ? "Media cũ không thể tự khôi phục sau khi đăng nhập. Vui lòng chọn lại."
    : "Chưa có tệp nào được chọn.";

  if (imageInput) imageInput.value = "";
  if (videoInput) videoInput.value = "";
  if (imageMeta) imageMeta.textContent = restoreMessage;
  if (videoMeta) videoMeta.textContent = restoreMessage;
  if (imagePreview) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
  if (videoPreview) {
    videoPreview.removeAttribute("src");
    videoPreview.load();
    videoPreview.style.display = "none";
  }
  hien_thi_tai_len_xac_nhan();
}

async function applyStoredDraftMarkers(payload) {
  const pickupLat = Number(
    payload.vi_do_lay_hang || payload.pickup_lat || 0,
  );
  const pickupLng = Number(
    payload.kinh_do_lay_hang || payload.pickup_lng || 0,
  );
  const deliveryLat = Number(
    payload.vi_do_giao_hang || payload.delivery_lat || 0,
  );
  const deliveryLng = Number(
    payload.kinh_do_giao_hang || payload.delivery_lng || 0,
  );
  const hasPickupPoint = pickupLat && pickupLng;
  const hasDeliveryPoint = deliveryLat && deliveryLng;

  if (hasPickupPoint) {
    markerPickup.setLatLng([pickupLat, pickupLng]);
  }
  if (hasDeliveryPoint) {
    markerDelivery.setLatLng([deliveryLat, deliveryLng]);
  }

  if (hasPickupPoint && hasDeliveryPoint) {
    map.fitBounds(
      [
        [pickupLat, pickupLng],
        [deliveryLat, deliveryLng],
      ],
      { padding: [40, 40] },
    );
    await recalculateDistance();
    return;
  }

  const pickupAddress = String(
    payload.dia_chi_lay_hang || payload.search_pickup || "",
  ).trim();
  const deliveryAddress = String(
    payload.dia_chi_giao_hang || payload.search_delivery || "",
  ).trim();
  if (pickupAddress && deliveryAddress) {
    await applyReorderAddresses({
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
    });
  }
}

async function restorePendingBookingDraft() {
  const draft = loadPendingBookingDraft();
  if (!draft || !draft.payload) return false;

  const payload = draft.payload;
  document.getElementById("nguoi_gui_ho_ten").value =
    payload.nguoi_gui_ho_ten || payload.sender_name || "";
  document.getElementById("nguoi_gui_so_dien_thoai").value =
    payload.nguoi_gui_so_dien_thoai || payload.sender_phone || "";
  document.getElementById("nguoi_nhan_ho_ten").value =
    payload.nguoi_nhan_ho_ten || payload.receiver_name || "";
  document.getElementById("nguoi_nhan_so_dien_thoai").value =
    payload.nguoi_nhan_so_dien_thoai || payload.receiver_phone || "";
  document.getElementById("dia_chi_lay_hang").value =
    payload.dia_chi_lay_hang || payload.search_pickup || "";
  document.getElementById("dia_chi_giao_hang").value =
    payload.dia_chi_giao_hang || payload.search_delivery || "";
  document.getElementById("ghi_chu_tai_xe").value =
    payload.ghi_chu_tai_xe || payload.notes || "";
  document.getElementById("gia_tri_thu_ho_cod").value =
    parseFloat(payload.gia_tri_thu_ho_cod || payload.cod_value) || 0;

  setOptionGroupValue(
    "nhom_nguoi_tra_cuoc",
    payload.nguoi_tra_cuoc || payload.fee_payer || "gui",
  );
  setOptionGroupValue(
    "nhom_phuong_thuc_thanh_toan",
    payload.phuong_thuc_thanh_toan || payload.payment_method || "tien_mat",
  );

  orderItems = normalizeReorderItems(payload.mat_hang || payload.items);
  hien_thi_danh_sach_hang_hoa();

  const dichVuNoiBo = getInternalServiceType(
    payload.dich_vu || payload.service || "",
  );
  const preferredMode =
    dichVuNoiBo === "instant" ? "instant" : "scheduled";
  setPackageChoiceValue(dichVuNoiBo);
  setDeliveryMode(preferredMode, { render: false });

  const pickupDateInput = document.getElementById("ngay_lay_hang");
  const pickupSlotSelect = document.getElementById("khung_gio_lay_hang");
  const vehicleSelect = document.getElementById("phuong_tien_giao_hang");

  const ngayLayHang = payload.ngay_lay_hang || payload.pickup_date || "";
  const khungGioLayHang =
    payload.khung_gio_lay_hang || payload.pickup_slot || "";
  const phuongTien = payload.phuong_tien || payload.vehicle || "";

  if (preferredMode !== "instant" && pickupDateInput && ngayLayHang) {
    pickupDateInput.value = ngayLayHang;
  }
  if (preferredMode !== "instant" && pickupSlotSelect && khungGioLayHang) {
    pickupSlotSelect.value = khungGioLayHang;
  }
  if (vehicleSelect && phuongTien) {
    vehicleSelect.value = Array.from(vehicleSelect.options).some(
      (option) => option.value === phuongTien,
    )
      ? phuongTien
      : "auto";
  }

  await applyStoredDraftMarkers(payload);

  selectedService = null;
  if (dichVuNoiBo) {
    renderServiceCards();
  }

  const requestedStep = Math.max(
    1,
    Math.min(5, parseInt(draft.current_step, 10) || 5),
  );
  let targetStep = requestedStep;
  if (requestedStep >= 4 && !selectedService) {
    targetStep = 3;
  }

  if (targetStep >= 5 && selectedService) {
    chuan_bi_xac_nhan();
    chuyen_den_buoc(5);
  } else if (targetStep >= 4) {
    chuyen_den_buoc(4);
  } else if (targetStep >= 3) {
    chuyen_den_buoc(3);
  } else if (targetStep >= 2) {
    chuyen_den_buoc(2);
  } else {
    chuyen_den_buoc(1);
  }

  resetUploadsAfterDraftRestore(draft.had_uploads);
  showBookingStatusNotice(
    draft.had_uploads
      ? "Đã khôi phục lại thông tin đơn hàng sau khi đăng nhập. Ảnh/video cần chọn lại trước khi xác nhận."
      : "Đã khôi phục lại thông tin đơn hàng sau khi đăng nhập. Bạn có thể kiểm tra và xác nhận tiếp.",
    draft.had_uploads ? "warn" : "info",
  );
  return true;
}

async function applyReorderAddresses(data) {
  document.getElementById("dia_chi_lay_hang").value = data.pickup_address || "";
  document.getElementById("dia_chi_giao_hang").value =
    data.delivery_address || "";

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
    map.fitBounds(
      [
        [pickupPoint.lat, pickupPoint.lng],
        [deliveryPoint.lat, deliveryPoint.lng],
      ],
      { padding: [40, 40] },
    );
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

  document.getElementById("nguoi_gui_ho_ten").value =
    data.nguoi_gui_ho_ten || data.sender_name || "";
  document.getElementById("nguoi_gui_so_dien_thoai").value =
    data.nguoi_gui_so_dien_thoai || data.sender_phone || "";
  document.getElementById("nguoi_nhan_ho_ten").value =
    data.nguoi_nhan_ho_ten || data.receiver_name || "";
  document.getElementById("nguoi_nhan_so_dien_thoai").value =
    data.nguoi_nhan_so_dien_thoai || data.receiver_phone || "";
  document.getElementById("ghi_chu_tai_xe").value =
    data.ghi_chu_tai_xe || data.notes || "";
  document.getElementById("gia_tri_thu_ho_cod").value =
    parseFloat(data.gia_tri_thu_ho_cod || data.cod_value) || 0;

  const vehicleChoice = document.getElementById("phuong_tien_giao_hang");
  if (vehicleChoice) {
    const phuongTien = data.phuong_tien || data.vehicle || "";
    vehicleChoice.value = Array.from(vehicleChoice.options).some(
      (option) => option.value === phuongTien,
    )
      ? phuongTien
      : "auto";
  }

  setOptionGroupValue(
    "nhom_nguoi_tra_cuoc",
    data.nguoi_tra_cuoc || data.fee_payer || "gui",
  );
  setOptionGroupValue(
    "nhom_phuong_thuc_thanh_toan",
    data.phuong_thuc_thanh_toan || data.payment_method || "tien_mat",
  );

  orderItems = normalizeReorderItems(data.mat_hang || data.items);
  hien_thi_danh_sach_hang_hoa();

  if (data.dich_vu || data.service_type) {
    const internalServiceType = getInternalServiceType(
      data.dich_vu || data.service_type,
    );
    setPackageChoiceValue(internalServiceType);
    selectedService = null;
    setDeliveryMode(
      internalServiceType === "instant" ? "instant" : "scheduled",
      { render: false },
    );
  }

  await applyReorderAddresses(data);
  if (data.dich_vu || data.service_type) {
    renderServiceCards();
  }
  markReorderMode(data.source_order_code || `#${data.source_order_id || ""}`);
}

async function initReorderPrefill() {
  const reorderId = getQueryParam("reorder_id");
  if (!reorderId) return;

  try {
    const reorderData = await fetchReorderDataFromCrud(reorderId);
    if (!reorderData) {
      throw new Error("Không tìm thấy dữ liệu đơn cần đặt lại từ hệ thống.");
    }
    await applyReorderPrefill(reorderData);
  } catch (error) {
    console.warn("Không thể tải dữ liệu đặt lại:", error);
    hien_thi_loi(
      1,
      error.message || "Không thể tải dữ liệu đơn cũ từ hệ thống để đặt lại.",
    );
  }
}

function applyCustomerPrefill(data) {
  if (!data || typeof data !== "object") return;

  const senderNameInput = document.getElementById("nguoi_gui_ho_ten");
  const senderPhoneInput = document.getElementById("nguoi_gui_so_dien_thoai");
  const pickupInput = document.getElementById("dia_chi_lay_hang");

  if (senderNameInput && !senderNameInput.value.trim()) {
    senderNameInput.value = data.nguoi_gui_ho_ten || data.sender_name || "";
  }
  if (senderPhoneInput && !senderPhoneInput.value.trim()) {
    senderPhoneInput.value =
      data.nguoi_gui_so_dien_thoai || data.sender_phone || "";
  }
  if (pickupInput && !pickupInput.value.trim()) {
    pickupInput.value = data.dia_chi_lay_hang || data.pickup_address || "";
  }
}

async function initCustomerPrefill() {
  if (getQueryParam("reorder_id")) return;

  try {
    const session =
      (await Promise.resolve(
        window.GiaoHangNhanhLocalAuth?.bootstrapSession?.(),
      ).catch(() => null)) || getLocalSession();
    if (!session) return;
    applyCustomerPrefill({
      nguoi_gui_ho_ten: session.fullname || "",
      nguoi_gui_so_dien_thoai: session.phone || session.so_dien_thoai || "",
    });
  } catch (error) {
    console.warn("Không tự điền được thông tin khách hàng:", error);
  }
}

// ========== ITEMS ==========
