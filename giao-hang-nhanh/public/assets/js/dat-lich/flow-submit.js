/**
 * dat-lich/flow-submit.js
 * Gom phần điều hướng và hoàn tất đơn:
 * - validate từng bước của form
 * - dựng màn review cuối
 * - build payload và submit qua KRUD / API liên quan
 *
 * Liên quan trực tiếp:
 * - dat-lich/core.js: state form, helper chung, local detail
 * - dat-lich/pricing.js: cung cấp quote/breakdown đã tính
 * - admin-giaohang/api/booking.php: backend nhận payload tạo đơn
 */
function chon_tuy_chon(groupId, btn) {
  document
    .querySelectorAll(`#${groupId} .option-btn`)
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const inputId =
    groupId === "nhom_nguoi_tra_cuoc" ? "nguoi_tra_cuoc" : "phuong_thuc_thanh_toan";
  document.getElementById(inputId).value = btn.dataset.val;
}

function chuyen_den_buoc(step) {
  if (step < 1 || step > 5) return;
  for (let i = 1; i <= 5; i++) {
    xoa_loi(i);
    document.getElementById(`buoc_${i}`).classList.toggle("active", i === step);
    const ind = document.getElementById(`chi_bao_buoc_${i}`);
    ind.className =
      "step-item" + (i < step ? " completed" : i === step ? " active" : "");
    if (i < step) {
      ind.querySelector(".step-circle").innerHTML = "✓";
    } else {
      ind.querySelector(".step-circle").textContent = i;
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function xac_thuc_buoc_1() {
  xoa_loi(1);
  const fields = [
    ["nguoi_gui_ho_ten", "Họ tên người gửi"],
    ["nguoi_gui_so_dien_thoai", "Số điện thoại người gửi"],
    ["nguoi_nhan_ho_ten", "Họ tên người nhận"],
    ["nguoi_nhan_so_dien_thoai", "Số điện thoại người nhận"],
    ["dia_chi_lay_hang", "Địa chỉ lấy hàng"],
    ["dia_chi_giao_hang", "Địa chỉ giao hàng"],
  ];
  for (const [id, label] of fields) {
    const val = document.getElementById(id).value.trim();
    if (!val) {
      hien_thi_loi(1, `Vui lòng điền: ${label}`);
      document.getElementById(id).focus();
      return false;
    }
    if (id.includes("so_dien_thoai") && !isValidPhone(val)) {
      hien_thi_loi(
        1,
        `${label} không đúng định dạng (10 số, bắt đầu bằng 03, 05, 07, 08, 09).`,
      );
      document.getElementById(id).focus();
      return false;
    }
  }
  if (!khoang_cach_km || khoang_cach_km <= 0) {
    hien_thi_loi(
      1,
      "Vui lòng xác định vị trí trên bản đồ bằng cách tìm kiếm địa chỉ hoặc kéo ghim.",
    );
    return false;
  }
  if (
    document.getElementById("dia_chi_lay_hang").value ===
    document.getElementById("dia_chi_giao_hang").value
  ) {
    hien_thi_loi(
      1,
      "Địa chỉ lấy hàng và địa chỉ giao hàng không được trùng nhau.",
    );
    return false;
  }
  return true;
}

function xac_thuc_buoc_2() {
  xoa_loi(2);
  if (orderItems.length === 0) {
    hien_thi_loi(2, "Vui lòng thêm ít nhất một món hàng.");
    return false;
  }
  for (let i = 0; i < orderItems.length; i++) {
    const it = orderItems[i];
    if (!it.loai_hang) {
      hien_thi_loi(2, `Vui lòng chọn loại hàng cho món hàng thứ ${i + 1}.`);
      return false;
    }
    if (!it.ten_hang) {
      hien_thi_loi(2, `Vui lòng chọn hoặc nhập tên cho món hàng thứ ${i + 1}.`);
      return false;
    }
    if ((it.so_luong || 0) <= 0) {
      hien_thi_loi(2, `Số lượng món hàng thứ ${i + 1} phải từ 1 trở lên.`);
      return false;
    }
    if (it.can_nang <= 0 || it.can_nang > 1000) {
      hien_thi_loi(
        2,
        `Trọng lượng món hàng thứ ${i + 1} phải từ 0.1kg đến 1000kg.`,
      );
      return false;
    }
    if (it.chieu_dai <= 0 || it.chieu_rong <= 0 || it.chieu_cao <= 0) {
      hien_thi_loi(2, `Kích thước món hàng thứ ${i + 1} phải > 0.`);
      return false;
    }
    if (it.gia_tri_khai_bao < 0) {
      hien_thi_loi(2, `Giá trị khai báo món hàng thứ ${i + 1} không được âm.`);
      return false;
    }
  }
  return true;
}

function xac_thuc_buoc_3() {
  xoa_loi(3);
  if (getDeliveryMode() === "instant") {
    if (!selectedService || selectedService.serviceType !== "instant") {
      hien_thi_loi(3, "Vui lòng chọn gói Giao Ngay Lập Tức để tiếp tục.");
      return false;
    }
    return true;
  }

  const pDateVal = document.getElementById("ngay_lay_hang").value;
  if (!pDateVal) {
    hien_thi_loi(3, "Vui lòng chọn ngày lấy hàng.");
    return false;
  }

  const todayDate = formatDateValue(getCurrentDateTime());
  if (pDateVal < todayDate) {
    hien_thi_loi(3, "Ngày lấy hàng không được ở trong quá khứ.");
    return false;
  }

  const pSlot = document.getElementById("khung_gio_lay_hang").value;
  if (!pSlot) {
    hien_thi_loi(3, "Vui lòng chọn khung giờ lấy hàng.");
    return false;
  }
  const pickupSlot = getSelectedPickupSlot();
  if (!pickupSlot) {
    hien_thi_loi(3, "Khung giờ lấy hàng không hợp lệ. Vui lòng chọn lại.");
    return false;
  }

  // Logic: Check if slot is in the past for TODAY
  if (pDateVal === todayDate) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = timeTextToMinutes(pickupSlot.end || "");

    if (endMinutes >= 0 && currentMinutes >= endMinutes) {
      hien_thi_loi(
        3,
        `Khung giờ ${pickupSlot.label} của ngày hôm nay đã trôi qua. Vui lòng chọn khung giờ khác.`,
      );
      return false;
    }
  }
  if (!selectedService) {
    hien_thi_loi(3, "Vui lòng chọn một gói cước vận chuyển.");
    return false;
  }
  return true;
}

function xac_thuc_buoc_4() {
  xoa_loi(4);
  const loaiXeDaChon = (
    document.getElementById("phuong_tien_giao_hang")?.value || "auto"
  )
    .trim()
    .toLowerCase();
  if (loaiXeDaChon === "xe_may") {
    const kiemTraXeMay = lay_kiem_tra_hang_hoa_xe_may_hien_tai();
    if (!kiemTraXeMay.hop_le) {
      const xeGoiY =
        selectedService?.selectedVehicleLabel || "Xe 4 bánh nhỏ ≤ 500kg";
      hien_thi_loi(
        4,
        `${kiemTraXeMay.ly_do} Vui lòng chuyển sang ${xeGoiY}.`,
      );
      document.getElementById("phuong_tien_giao_hang")?.focus();
      return false;
    }
  }
  return true;
}

function formatDateToDDMMYYYY(dateString) {
  if (!dateString) return "—";
  const parts = String(dateString).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

// ========== REVIEW ==========
function chuan_bi_xac_nhan() {
  if (!selectedService) return;
  const payload = tao_du_lieu_gui();

  document.getElementById("xac_nhan_nguoi_gui").textContent =
    `${document.getElementById("nguoi_gui_ho_ten").value} — ${document.getElementById("nguoi_gui_so_dien_thoai").value}`;
  document.getElementById("xac_nhan_nguoi_nhan").textContent =
    `${document.getElementById("nguoi_nhan_ho_ten").value} — ${document.getElementById("nguoi_nhan_so_dien_thoai").value}`;
  document.getElementById("xac_nhan_dia_chi_lay_hang").textContent =
    document.getElementById("dia_chi_lay_hang").value || "—";
  document.getElementById("xac_nhan_dia_chi_giao_hang").textContent =
    document.getElementById("dia_chi_giao_hang").value || "—";
  document.getElementById("xac_nhan_khoang_cach").textContent =
    `${khoang_cach_km.toFixed(2)} km`;

  // Items List (Phần 5: Hiển thị hàng hóa rõ ràng)
  const list = document.getElementById("xac_nhan_danh_sach_hang_hoa");
  list.innerHTML = "";
  orderItems.forEach((it, idx) => {
    const div = document.createElement("div");
    div.style.cssText =
      "background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;";
    div.innerHTML = `
      <div style="width: 40px; height: 40px; background: #f0f9ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #0a2a66;">
        <i class="fas fa-box"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 800; color: #1e293b; font-size: 14px;">${escapeHtml(it.ten_hang || "Hàng hóa #" + (idx + 1))}</div>
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

  document.getElementById("xac_nhan_gia_tri_thu_ho_cod").textContent = payload.gia_tri_thu_ho_cod
    ? `${payload.gia_tri_thu_ho_cod.toLocaleString()} ₫`
    : "Không có";
  document.getElementById("xac_nhan_ghi_chu_tai_xe").textContent =
    document.getElementById("ghi_chu_tai_xe").value || "Không có";
  hien_thi_tai_len_xac_nhan();

  // Lịch trình (Phần 3: Thời gian và khoảng thời gian)
  const pDate = document.getElementById("ngay_lay_hang").value;
  const pSlot = getSelectedPickupSlot();
  const urgentCondition = getSelectedUrgentCondition();
  document.getElementById("xac_nhan_thoi_gian_lay_hang").textContent =
    `${formatDateToDDMMYYYY(pDate)} | ${(pSlot && pSlot.label) || "—"}`;
  document.getElementById("xac_nhan_thoi_gian_giao_du_kien").textContent = selectedService.estimate;

  // Giá & Phương tiện (Phần 4: Phương tiện)
  const bd = selectedService.breakdown || {};
  const rvPrice = document.getElementById("xac_nhan_chi_tiet_gia");
  rvPrice.innerHTML = `
    <div class="rv-row"><span class="rv-label">Gói dịch vụ:</span><span class="rv-val" style="color:#ff7a00; font-weight:800;">${selectedService.serviceName}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện gợi ý:</span><span class="rv-val">${selectedService.vehicleSuggestion || "Xe máy"}</span></div>
    <div class="rv-row"><span class="rv-label">Phương tiện đang tính giá:</span><span class="rv-val">${selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion || "Xe máy"}</span></div>
    <div class="rv-row"><span class="rv-label">Điều kiện giao đang áp dụng:</span><span class="rv-val">${selectedService.serviceConditionLabel || (urgentCondition && urgentCondition.label) || "Điều kiện bình thường"}</span></div>
    ${tao_html_cac_dong_phi_hien_thi(bd, "rv-row", "rv-label", "rv-val")}
    <div class="rv-row" style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
      <span class="rv-label">Người trả cước:</span><span class="rv-val">${document.getElementById("nguoi_tra_cuoc").value === "gui" ? "Người gửi" : "Người nhận"}</span>
    </div>
    <div class="rv-row"><span class="rv-label">Thanh toán:</span><span class="rv-val">${document.getElementById("phuong_thuc_thanh_toan").value === "tien_mat" ? "Tiền mặt" : "Chuyển khoản"}</span></div>
  `;
  document.getElementById("xac_nhan_tong_thanh_toan").textContent =
    `${selectedService.total.toLocaleString()} ₫`;
}

// ========== UPLOAD ==========
function getSelectedUploadFiles() {
  return [
    {
      type: "image",
      file: document.getElementById("hinh_anh_hang_hoa")?.files?.[0] || null,
    },
    {
      type: "video",
      file: document.getElementById("video_hang_hoa")?.files?.[0] || null,
    },
  ].filter((entry) => entry.file);
}

function clearReviewUploadObjectUrls() {
  reviewUploadObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Không thể giải phóng URL tạm của media:", error);
    }
  });
  reviewUploadObjectUrls = [];
}

function hien_thi_tai_len_xac_nhan() {
  const host = document.getElementById("xac_nhan_danh_sach_media");
  const empty = document.getElementById("xac_nhan_media_trong");
  if (!host || !empty) return;

  clearReviewUploadObjectUrls();
  host.innerHTML = "";

  const uploads = getSelectedUploadFiles();
  if (!uploads.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  uploads.forEach((entry) => {
    const objectUrl = URL.createObjectURL(entry.file);
    reviewUploadObjectUrls.push(objectUrl);

    const card = document.createElement("article");
    card.className = "review-upload-card";
    card.innerHTML =
      entry.type === "video"
        ? `
          <video class="review-upload-thumb" controls preload="metadata" src="${objectUrl}"></video>
          <div class="review-upload-meta">
            <strong>${escapeHtml(entry.file.name)}</strong>
            <span>Video • ${Math.round(entry.file.size / 1024)} KB</span>
          </div>
        `
        : `
          <img class="review-upload-thumb" src="${objectUrl}" alt="${escapeHtml(entry.file.name)}" />
          <div class="review-upload-meta">
            <strong>${escapeHtml(entry.file.name)}</strong>
            <span>Ảnh • ${Math.round(entry.file.size / 1024)} KB</span>
          </div>
        `;
    host.appendChild(card);
  });
}

function renderSubmitSuccessState(orderCode, messageHtml) {
  clearPendingBookingDraft();
  const isLoggedIn = !!syncBookingLoginState();
  const secondaryAction = isLoggedIn
    ? `
      <a
        href="${resolveProjectHtmlUrl("public/khach-hang/dashboard.html")}"
        class="btn-secondary"
        style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:180px;"
      >Vào trang quản lý</a>
    `
    : `
      <a
        href="${resolveProjectHtmlUrl("tra-don-hang.html")}"
        class="btn-secondary"
        style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:180px;"
      >Tra cứu đơn hàng</a>
    `;

  const container = document.getElementById("buoc_5");
  if (!container) return;

  container.innerHTML = `
    <div id="booking-success-state" tabindex="-1" style="text-align: center; padding: 40px 20px;">
      <div style="width: 80px; height: 80px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px;">
        <i class="fas fa-check-circle"></i>
      </div>
      <h2 style="color: #1e293b; font-weight: 800; margin-bottom: 12px;">Đặt đơn hàng thành công!</h2>
      <p style="color: #64748b; margin-bottom: 16px;">Mã đơn hàng: <strong style="color: #0a2a66;">${orderCode || "GHN-00000000-0000000"}</strong>.</p>
      <p style="color: #64748b; margin-bottom: 32px;">${messageHtml}</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a
          href="${resolveProjectHtmlUrl("dat-lich-giao-hang-nhanh.html")}"
          class="btn-primary"
          style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:180px;"
        >Tạo đơn mới</a>
        ${secondaryAction}
      </div>
    </div>
  `;

  window.requestAnimationFrame(() => {
    const successState = document.getElementById("booking-success-state");
    successState?.focus({ preventScroll: true });
    successState?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function getServiceStorageValue(serviceType) {
  const normalized = String(serviceType || "").toLowerCase();
  if (normalized === "instant") return "giao_ngay_lap_tuc";
  if (normalized === "express") return "giao_hoa_toc";
  if (normalized === "fast") return "giao_nhanh";
  if (normalized === "standard") return "giao_tieu_chuan";
  return normalized;
}

function getInternalServiceType(serviceValue) {
  const normalized = String(serviceValue || "").toLowerCase();
  if (normalized === "giao_ngay_lap_tuc") return "instant";
  if (normalized === "giao_hoa_toc") return "express";
  if (normalized === "giao_nhanh") return "fast";
  if (normalized === "giao_tieu_chuan") return "standard";
  return normalized;
}

function getWeatherSourceStorageValue(source) {
  const normalized = String(source || "").toLowerCase();
  if (!normalized) return "";
  if (normalized === "fallback") return "du_lieu_tam_tinh";
  if (normalized === "openmeteo_hourly") return "du_lieu_thoi_tiet_theo_gio";
  if (normalized === "openmeteo_current") return "du_lieu_thoi_tiet_hien_tai";
  if (normalized === "openweather_forecast") return "du_lieu_du_bao_thoi_tiet";
  if (normalized === "openweather_current") return "du_lieu_thoi_tiet_hien_tai";
  if (normalized.startsWith("du_lieu_")) return normalized;
  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function tao_chi_tiet_gia_cuoc_de_luu_tru(breakdown = {}) {
  return {
    tong_gia_van_chuyen: Number(
      breakdown.tong_gia_van_chuyen || breakdown.basePrice || 0,
    ),
    don_gia_km: Number(breakdown.don_gia_km || 0),
    he_so_xe: Number(breakdown.he_so_xe || 1),
    phi_toi_thieu: Number(breakdown.phi_toi_thieu || 0),
    ten_loai_xe_tinh_gia: String(breakdown.ten_loai_xe_tinh_gia || ""),
    phu_phi_loai_hang: Number(breakdown.goodsFee || 0),
    phu_phi_khung_gio: Number(breakdown.timeFee || 0),
    phu_phi_thoi_tiet: Number(breakdown.conditionFee || 0),
    ten_khung_gio: String(breakdown.timeSurchargeLabel || ""),
    ten_dieu_kien_thoi_tiet: String(breakdown.conditionSurchargeLabel || ""),
    phi_cod: Number(breakdown.codFee || 0),
    phi_bao_hiem: Number(breakdown.insuranceFee || 0),
    dieu_chinh_theo_xe: Number(breakdown.vehicleFee || 0),
  };
}

function chuan_hoa_chi_tiet_gia_cuoc_da_luu(chiTiet = {}) {
  return {
    basePrice: Number(
      chiTiet.tong_gia_van_chuyen || 0,
    ),
    tong_gia_van_chuyen: Number(
      chiTiet.tong_gia_van_chuyen || 0,
    ),
    don_gia_km: Number(chiTiet.don_gia_km || 0),
    he_so_xe: Number(chiTiet.he_so_xe || 1),
    phi_toi_thieu: Number(chiTiet.phi_toi_thieu || 0),
    ten_loai_xe_tinh_gia: String(chiTiet.ten_loai_xe_tinh_gia || ""),
    goodsFee: Number(chiTiet.phu_phi_loai_hang || 0),
    timeFee: Number(chiTiet.phu_phi_khung_gio || 0),
    conditionFee: Number(chiTiet.phu_phi_thoi_tiet || 0),
    timeSurchargeLabel: String(chiTiet.ten_khung_gio || ""),
    conditionSurchargeLabel: String(chiTiet.ten_dieu_kien_thoi_tiet || ""),
    codFee: Number(chiTiet.phi_cod || 0),
    insuranceFee: Number(chiTiet.phi_bao_hiem || 0),
    vehicleFee: Number(chiTiet.dieu_chinh_theo_xe || 0),
    includesTimeFee: true,
    includesVehicleFee: true,
  };
}

function xem_truoc_tai_len(type) {
  const inputId = type === "video" ? "video_hang_hoa" : "hinh_anh_hang_hoa";
  const previewId = type === "video" ? "xem_truoc_video_hang_hoa" : "xem_truoc_anh_hang_hoa";
  const metaId = type === "video" ? "thong_tin_tai_len_video" : "thong_tin_tai_len_anh";
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const preview = document.getElementById(previewId);
  document.getElementById(metaId).textContent =
    `${file.name} • ${Math.round(file.size / 1024)} KB`;

  if (type === "video") {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);

  if (lay_buoc_hien_tai() >= 5) {
    hien_thi_tai_len_xac_nhan();
  }
}

// ========== SUBMIT ==========
function buildBookingSheetPayload(payload, orderCode) {
  const itemsSummary = Array.isArray(payload.mat_hang)
    ? payload.mat_hang
        .map((item, index) => {
          const itemName = item?.ten_hang || `Hàng #${index + 1}`;
          const itemType = ITEM_TYPE_LABELS[item?.loai_hang] || item?.loai_hang || "";
          const quantity = Number(item?.so_luong || 0);
          const weight = Number(item?.can_nang || 0);
          return `${itemName} (${itemType}) x${quantity || 1}, ${weight || 0}kg`;
        })
        .join(" | ")
    : "";

  return {
    sheet_type: "Giao hàng nhanh",
    created_at: new Date().toISOString(),
    "Mã đơn": orderCode || "",
    "Người gửi": payload.nguoi_gui_ho_ten || "",
    "SĐT người gửi": payload.nguoi_gui_so_dien_thoai || "",
    "Người nhận": payload.nguoi_nhan_ho_ten || "",
    "SĐT người nhận": payload.nguoi_nhan_so_dien_thoai || "",
    "Địa chỉ lấy hàng": payload.dia_chi_lay_hang || "",
    "Địa chỉ giao hàng": payload.dia_chi_giao_hang || "",
    "Ngày lấy hàng": payload.ngay_lay_hang || "",
    "Khung giờ lấy hàng": payload.ten_khung_gio_lay_hang || payload.khung_gio_lay_hang || "",
    "Dự kiến giao hàng": payload.du_kien_giao_hang || "",
    "Dịch vụ": payload.ten_dich_vu || payload.dich_vu || "",
    "Phương tiện": payload.ten_phuong_tien || payload.phuong_tien || "",
    "Khoảng cách (km)": Number(payload.khoang_cach_km || 0),
    "Giá trị COD": Number(payload.gia_tri_thu_ho_cod || 0),
    "Tổng cước": Number(payload.tong_cuoc || 0),
    "Phương thức thanh toán": payload.phuong_thuc_thanh_toan || "",
    "Người trả cước": payload.nguoi_tra_cuoc || "",
    "Danh sách hàng": itemsSummary,
    "Chi tiết giá cước": JSON.stringify(payload.chi_tiet_gia_cuoc || {}),
    "Ghi chú": payload.ghi_chu_tai_xe || "",
  };
}

function saveBookingToGoogleSheet(payload, orderCode) {
  if (typeof window.saveToGoogleSheet !== "function") {
    return Promise.reject(new Error("driveUtil.js chưa được nạp."));
  }

  const sheetPayload = buildBookingSheetPayload(payload, orderCode);

  return Promise.resolve(window.saveToGoogleSheet(sheetPayload)).then(
    (result) => {
      const isSuccess =
        result && (result.status === "success" || result.success === true);

      if (!isSuccess) {
        const serverMessage =
          (result && (result.error || result.message)) ||
          "Gửi dữ liệu Google Sheet thất bại.";
        throw new Error(serverMessage);
      }

      return result;
    },
  );
}

async function gui_don_hang() {
  const btn = document.getElementById("btn_gui_don_hang");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý...`;

  const payload = tao_du_lieu_gui();
  if (!requireBookingLogin({ saveDraft: true, payload })) {
    btn.disabled = false;
    btn.innerHTML = originalText;
    return;
  }
  xoa_loi(5);

  try {
    const crudResult = await insertBookingWithCrud(payload);
    const orderMeta = extractCrudInsertOrderMeta(crudResult);
    const finalOrderCode =
      resolveSystemOrderCodeFromResult(
        crudResult,
        orderMeta.created_at || new Date().toISOString(),
      );
    if (!finalOrderCode) {
      throw new Error(
        "Không nhận được ID hệ thống để tạo mã đơn GHN. Vui lòng thử lại.",
      );
    }
    if (orderMeta.id) {
      await syncCrudOrderCode(
        orderMeta.id,
        finalOrderCode,
        orderMeta.created_at || new Date().toISOString(),
      );
    }
    let googleSheetWarning = "";

    try {
      await saveBookingToGoogleSheet(payload, finalOrderCode);
    } catch (sheetError) {
      console.warn("Không thể đồng bộ Google Sheet từ frontend:", sheetError);
      googleSheetWarning =
        " Đơn hàng đã được lưu hệ thống nhưng chưa đồng bộ Google Sheets.";
    }

    const localDetail = buildLocalOrderDetail(payload, finalOrderCode);
    const returnedRecordId = orderMeta.id;
    if (returnedRecordId) {
      localDetail.order.id = returnedRecordId;
      localDetail.order.remote_id = returnedRecordId;
    }
    const savedLocally = persistLocalCustomerOrder(localDetail);
    if (!savedLocally) {
      console.warn(
        "Không thể lưu bản sao đơn hàng vào bộ nhớ tạm của trình duyệt sau khi tạo đơn.",
      );
    }

    renderSubmitSuccessState(
      localDetail.order.order_code || finalOrderCode || "GHN-00000000-0000000",
      !!syncBookingLoginState()
        ? `Đơn hàng đã được tạo thành công. Bạn có thể theo dõi đơn ngay trong tài khoản của mình.${googleSheetWarning}`
        : `Đơn hàng đã được tạo thành công. Hãy lưu lại mã đơn để tra cứu sau.${googleSheetWarning}`,
    );
  } catch (error) {
    console.error(error);
    hien_thi_loi(
      5,
      error.message ||
        "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.",
    );
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function tao_du_lieu_gui() {
  const quotePayload = tao_du_lieu_tinh_cuoc();
  const serviceType = selectedService.serviceType;
  const chiTietGiaCuoc = tao_chi_tiet_gia_cuoc_de_luu_tru(
    selectedService.breakdown || {},
  );
  const nguoi_gui_ho_ten = document.getElementById("nguoi_gui_ho_ten").value;
  const nguoi_gui_so_dien_thoai = document.getElementById("nguoi_gui_so_dien_thoai").value;
  const nguoi_nhan_ho_ten = document.getElementById("nguoi_nhan_ho_ten").value;
  const nguoi_nhan_so_dien_thoai = document.getElementById("nguoi_nhan_so_dien_thoai").value;
  const dia_chi_lay_hang = document.getElementById("dia_chi_lay_hang").value;
  const dia_chi_giao_hang = document.getElementById("dia_chi_giao_hang").value;
  const ghi_chu_tai_xe = document.getElementById("ghi_chu_tai_xe").value;
  const gia_tri_thu_ho_cod =
    parseFloat(document.getElementById("gia_tri_thu_ho_cod").value) || 0;
  const phuong_thuc_thanh_toan =
    document.getElementById("phuong_thuc_thanh_toan").value;
  const nguoi_tra_cuoc = document.getElementById("nguoi_tra_cuoc").value;
  return {
    nguoi_gui_ho_ten,
    nguoi_gui_so_dien_thoai,
    nguoi_nhan_ho_ten,
    nguoi_nhan_so_dien_thoai,
    dia_chi_lay_hang,
    dia_chi_giao_hang,
    ngay_lay_hang: quotePayload.ngay_lay_hang || "",
    khung_gio_lay_hang: quotePayload.khung_gio_lay_hang || "",
    ten_khung_gio_lay_hang: quotePayload.ten_khung_gio_lay_hang || "",
    du_kien_giao_hang: selectedService.estimate,
    ghi_chu_tai_xe,
    gia_tri_thu_ho_cod,
    phuong_thuc_thanh_toan,
    nguoi_tra_cuoc,
    dich_vu: getServiceStorageValue(serviceType),
    ten_dich_vu: selectedService.serviceName,
    phuong_tien: selectedService.selectedVehicleKey || "",
    ten_phuong_tien:
      selectedService.selectedVehicleLabel || selectedService.vehicleSuggestion,
    tong_cuoc: selectedService.total,
    chi_tiet_gia_cuoc: chiTietGiaCuoc,
    vi_do_lay_hang: quotePayload.pickup_lat || 0,
    kinh_do_lay_hang: quotePayload.pickup_lng || 0,
    vi_do_giao_hang: quotePayload.delivery_lat || 0,
    kinh_do_giao_hang: quotePayload.delivery_lng || 0,
    khoang_cach_km: khoang_cach_km,
    mat_hang: orderItems,
  };
}
