(function (window, document) {
  const core = window.FastGoCore;
  let ALL_SERVICES_DATA = null;
  const surveyServiceLabels = {
    moving_house: "Chuyển nhà trọn gói",
    moving_office: "Chuyển văn phòng",
    moving_warehouse: "Chuyển kho bãi",
  };

  async function loadPricingData() {
    try {
      const response = await fetch('assets/js/data/pricing-reference.json');
      if (!response.ok) throw new Error('Không thể tải bảng giá JSON');
      ALL_SERVICES_DATA = await response.json();
      
      // Khởi tạo lần đầu
      updateVehicleOptions();
      calculatePrice();
    } catch (error) {
      console.error('Lỗi tải dữ liệu bảng giá:', error);
    }
  }

  function formatCurrency(value) {
    if(value === 0) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  function getSelectedServiceConfig() {
    if (!ALL_SERVICES_DATA) return null;
    const serviceSelect = document.getElementById('order-service-type-moving');
    if (!serviceSelect) return null;
    
    const serviceId = serviceSelect.value;
    const serviceData = ALL_SERVICES_DATA.find(s => s.id === serviceId);
    return serviceData ? serviceData.cau_hinh_tinh_gia : null;
  }

  function updateVehicleOptions() {
    const config = getSelectedServiceConfig();
    const vehicleSelect = document.getElementById('moving-vehicle-type');
    if (!config || !vehicleSelect) return;

    const previousValue = vehicleSelect.value;
    vehicleSelect.innerHTML = '';
    
    Object.keys(config.loai_xe).forEach(key => {
      const item = config.loai_xe[key];
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${item.ten_hien_thi} (Cước từ ${formatCurrency(item.gia_co_ban)})`;
      vehicleSelect.appendChild(option);
    });

    // Giữ lại lựa chọn cũ nếu còn tồn tại trong bộ cước mới
    if (config.loai_xe[previousValue]) {
      vehicleSelect.value = previousValue;
    }
  }

  function calculatePrice() {
    const config = getSelectedServiceConfig();
    if (!config) return;

    const form = document.getElementById('moving-booking-form');
    if (!form) return;

    // Lấy values từ UI form
    const vehicleSelect = document.getElementById('moving-vehicle-type');
    const vehicleType = vehicleSelect ? vehicleSelect.value : '';
    
    const distanceKm = parseFloat(document.getElementById('moving-distance')?.value) || 0;
    const volume = parseFloat(document.getElementById('moving-volume')?.value) || 0;
    const weight = parseFloat(document.getElementById('moving-weight')?.value) || 0;
    
    const timeOfDay = document.getElementById('moving-time-slot')?.value || 'ban_ngay';
    const weather = document.getElementById('moving-weather')?.value || 'binh_thuong';
    
    // Natures (checkboxes)
    const selectedNatures = Array.from(form.querySelectorAll('.moving-nature:checked')).map(cb => cb.value);

    // Selected Additional Services
    const serviceSelectId = document.getElementById('order-service-type-moving');
    const serviceType = serviceSelectId ? serviceSelectId.value : '';
    let selectedServices = [];
    if (serviceType === 'moving_house') {
       selectedServices = Array.from(form.querySelectorAll('input[name="services[]"]:checked')).map(cb => cb.value);
    } else if (serviceType === 'moving_office') {
       selectedServices = Array.from(form.querySelectorAll('input[name="office_services[]"]:checked')).map(cb => cb.value);
    } else if (serviceType === 'moving_warehouse') {
       selectedServices = Array.from(form.querySelectorAll('input[name="warehouse_services[]"]:checked')).map(cb => cb.value);
    }

    // Bắt đầu tính giá dựa trên config của đúng dịch vụ đó
    const vehicleConfig = config.loai_xe[vehicleType];
    if(!vehicleConfig) return;

    let total = vehicleConfig.gia_co_ban;

    // 1. Quãng đường
    if (distanceKm > vehicleConfig.km_co_ban) {
      total += (distanceKm - vehicleConfig.km_co_ban) * vehicleConfig.gia_moi_km_tiep;
    }

    // 2. Thể tích
    const volConfig = config.phu_phi.the_tich;
    if (volume > volConfig.nguong_mien_phi) {
      const extraVol = volume - volConfig.nguong_mien_phi;
      total += Math.ceil(extraVol / volConfig.buoc_nhay) * volConfig.don_gia_moi_buoc;
    }

    // 3. Trọng lượng
    const weightConfig = config.phu_phi.trong_luong;
    if (weight > weightConfig.nguong_mien_phi) {
      const extraWeight = weight - weightConfig.nguong_mien_phi;
      total += Math.ceil(extraWeight / weightConfig.buoc_nhay) * weightConfig.don_gia_moi_buoc;
    }

    // 4. Tính chất đồ đạc
    selectedNatures.forEach(nature => {
      total += config.phu_phi.tinh_chat_do_dac[nature] || 0;
    });

    // 5. Điều kiện thời tiết & Thời gian
    if (weather === 'troi_mua') total += config.phu_phi.thoi_tiet.troi_mua;
    if (config.phu_phi.khung_gio[timeOfDay]) {
      total += config.phu_phi.khung_gio[timeOfDay];
    }

    // 6. Dịch vụ phụ
    const dichVuPhuConfig = config.phu_phi.dich_vu_phu || {};
    let parsedServices = [];
    selectedServices.forEach(srv => {
      let qtyInput = form.querySelector(`input[name="qty_${srv}"]`);
      let qty = 1;
      if (qtyInput) {
        qty = parseInt(qtyInput.value) || 1;
      }
      
      let srvData = dichVuPhuConfig[srv];
      if (srvData) {
        let cost = srvData.don_gia * qty;
        total += cost;
        parsedServices.push({
          name: srv,
          qty: qty,
          unit: srvData.don_vi,
          cost: cost
        });
      }
    });

    // Cập nhật lên UI
    const priceEl = document.getElementById('moving-total-cost');
    const breakdownEl = document.getElementById('moving-price-breakdown');
    
    if (priceEl) {
      priceEl.innerText = formatCurrency(total);
    }
    
    if (breakdownEl) {
      let breakdownHtml = `<li class="text-slate-800 font-bold mb-2 border-b border-slate-200 pb-1 mt-1">Ước tính vận chuyển cơ bản</li>`;
      
      // Phí cơ bản
      breakdownHtml += `<li class="flex justify-between items-center text-slate-700">
          <span>Phí cơ bản (${vehicleConfig.ten_hien_thi})</span>
          <span class="font-bold">${formatCurrency(vehicleConfig.gia_co_ban)}</span>
      </li>`;

      // Phí quãng đường
      if (distanceKm > vehicleConfig.km_co_ban) {
        let extraKm = distanceKm - vehicleConfig.km_co_ban;
        let distFee = extraKm * vehicleConfig.gia_moi_km_tiep;
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2 text-xs text-slate-500">- KM Vượt (+${extraKm.toFixed(1)}km x ${formatCurrency(vehicleConfig.gia_moi_km_tiep)})</span>
            <span>${formatCurrency(distFee)}</span>
        </li>`;
      }

      // Thể tích
      if (volume > volConfig.nguong_mien_phi) {
        let extraVol = volume - volConfig.nguong_mien_phi;
        let steps = Math.ceil(extraVol / volConfig.buoc_nhay);
        let volFee = steps * volConfig.don_gia_moi_buoc;
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2 text-xs text-slate-500">- Thể tích vượt (+${extraVol}m³ ~ ${steps} bậc x ${formatCurrency(volConfig.don_gia_moi_buoc)})</span>
            <span>${formatCurrency(volFee)}</span>
        </li>`;
      }

      // Trọng lượng
      if (weight > weightConfig.nguong_mien_phi) {
        let extraWeight = weight - weightConfig.nguong_mien_phi;
        let steps = Math.ceil(extraWeight / weightConfig.buoc_nhay);
        let weightFee = steps * weightConfig.don_gia_moi_buoc;
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2 text-xs text-slate-500">- Trọng tải vượt (+${extraWeight}kg ~ ${steps} bậc x ${formatCurrency(weightConfig.don_gia_moi_buoc)})</span>
            <span>${formatCurrency(weightFee)}</span>
        </li>`;
      }

      // Đặc tính
      if (selectedNatures.length > 0) {
        let natureFee = selectedNatures.reduce((acc, n) => acc + (config.phu_phi.tinh_chat_do_dac[n] || 0), 0);
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2 text-xs text-slate-500">- Thuộc tính đồ đạc (${selectedNatures.length} mục)</span>
            <span>${formatCurrency(natureFee)}</span>
        </li>`;
      }

      // Giờ giấc/ Thời tiết
      if (config.phu_phi.khung_gio[timeOfDay]) {
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2 text-xs text-slate-500">- Khung giờ đặc biệt</span>
            <span>${formatCurrency(config.phu_phi.khung_gio[timeOfDay])}</span>
        </li>`;
      }
      if (weather === 'troi_mua') {
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2 text-xs text-slate-500">- Phụ phí thời tiết (mưa)</span>
            <span>${formatCurrency(config.phu_phi.thoi_tiet.troi_mua)}</span>
        </li>`;
      }

      // Dịch vụ bổ sung
      if (parsedServices.length > 0) {
        breakdownHtml += `<li class="text-slate-800 font-bold mt-4 mb-2 border-b border-slate-200 pb-1">Dịch vụ bổ sung (Tham khảo)</li>`;
        parsedServices.forEach(item => {
           breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
               <span class="pl-2 text-xs text-slate-500">- ${item.name} (x${item.qty} ${item.unit})</span>
               <span>${formatCurrency(item.cost)}</span>
           </li>`;
        });
      }

      breakdownEl.innerHTML = breakdownHtml;
    }
  }

  function attachComputeEvent() {
    const form = document.getElementById('moving-booking-form');
    if (form && form.dataset.computeBound !== 'true') {
      form.dataset.computeBound = 'true';

      // Listen to changes on inputs to recalculate price live
      form.addEventListener('input', calculatePrice);
      form.addEventListener('change', calculatePrice);

      // Khi đổi loại dịch vụ -> Update danh sách xe
      const serviceSelect = document.getElementById('order-service-type-moving');
      if (serviceSelect && serviceSelect.dataset.computeBound !== 'true') {
        serviceSelect.dataset.computeBound = 'true';
        serviceSelect.addEventListener('change', () => {
          updateVehicleOptions();
          calculatePrice();
        });
      }

      // Submit form (chạy sau khi submit validate của HTML5 thành công)
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Cảm ơn bạn! Yêu cầu Đặt Lịch đã được ghi nhận. Chúng tôi sẽ liên hệ báo giá chính thức sau khi đối chiếu lộ trình.');
        if(typeof window.closeBookingModal === 'function') window.closeBookingModal('moving');
      });
    }

    const surveyForm = document.getElementById('moving-survey-form');
    if (surveyForm && surveyForm.dataset.computeBound !== 'true') {
      surveyForm.dataset.computeBound = 'true';
      surveyForm.addEventListener('submit', handleSurveySubmit);
    }
  }

  function clearSurveyErrors(form) {
    if (!core || !form) return;
    [
      "name",
      "phone",
      "service_type",
      "survey_address",
      "moving_survey_date",
      "moving_survey_time_slot",
      "survey_files[]",
    ].forEach((fieldName) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input) core.clearFieldError(input);
    });
  }

  function getSurveyFieldValue(form, name) {
    return String(form.querySelector(`[name="${name}"]`)?.value || "").trim();
  }

  function getSurveySelectText(form, name) {
    const select = form.querySelector(`[name="${name}"]`);
    if (!select) return "";
    const selectedOption = select.options[select.selectedIndex];
    return String(selectedOption?.textContent || "").trim();
  }

  function getSurveyCheckboxState(form, name) {
    return !!form.querySelector(`[name="${name}"]`)?.checked;
  }

  function buildSurveyServiceDetails(form, serviceType) {
    const serviceDetails = {
      service_type: serviceType,
      service_label: surveyServiceLabels[serviceType] || "Chuyển dọn",
      survey_address: getSurveyFieldValue(form, "survey_address"),
      survey_lat: getSurveyFieldValue(form, "survey_lat"),
      survey_lng: getSurveyFieldValue(form, "survey_lng"),
      survey_date: getSurveyFieldValue(form, "moving_survey_date"),
      survey_time_slot: getSurveyFieldValue(form, "moving_survey_time_slot"),
      note: getSurveyFieldValue(form, "note"),
      uploaded_file_names: Array.from(
        form.querySelector('[name="survey_files[]"]')?.files || [],
      ).map((file) => file.name),
    };

    if (serviceType === "moving_house") {
      serviceDetails.house = {
        house_type: getSurveySelectText(form, "survey_house_type"),
        floors: getSurveyFieldValue(form, "survey_house_floors"),
        has_elevator: getSurveyCheckboxState(form, "survey_elevator"),
        truck_access: getSurveyCheckboxState(form, "survey_house_truck"),
      };
    } else if (serviceType === "moving_office") {
      serviceDetails.office = {
        staff_count: getSurveyFieldValue(form, "survey_office_staff"),
        area: getSurveyFieldValue(form, "survey_office_area"),
        complex_it: getSurveyCheckboxState(form, "survey_office_it"),
        needs_dismantle: getSurveyCheckboxState(
          form,
          "survey_office_dismantle",
        ),
      };
    } else if (serviceType === "moving_warehouse") {
      serviceDetails.warehouse = {
        warehouse_type: getSurveySelectText(form, "survey_warehouse_type"),
        estimated_volume: getSurveyFieldValue(form, "survey_warehouse_vol"),
        needs_crane: getSurveyCheckboxState(form, "survey_warehouse_crane"),
        needs_wrapping: getSurveyCheckboxState(
          form,
          "survey_warehouse_wrapping",
        ),
      };
    }

    return serviceDetails;
  }

  function validateSurveyForm(form) {
    if (!form) return false;
    clearSurveyErrors(form);

    const nameInput = form.querySelector('[name="name"]');
    const phoneInput = form.querySelector('[name="phone"]');
    const serviceInput = form.querySelector('[name="service_type"]');
    const addressInput = form.querySelector('[name="survey_address"]');
    const dateInput = form.querySelector('[name="moving_survey_date"]');
    const timeInput = form.querySelector('[name="moving_survey_time_slot"]');
    const fileInput = form.querySelector('[name="survey_files[]"]');
    let isValid = true;

    if (!nameInput?.value.trim()) {
      if (core && nameInput) core.showFieldError(nameInput, "Vui lòng nhập họ và tên");
      isValid = false;
    }

    const phoneValue = phoneInput?.value.trim() || "";
    if (!phoneValue) {
      if (core && phoneInput) core.showFieldError(phoneInput, "Vui lòng nhập số điện thoại");
      isValid = false;
    } else if (!/^0\d{9,10}$/.test(phoneValue)) {
      if (core && phoneInput) core.showFieldError(phoneInput, "Số điện thoại phải gồm 10-11 số và bắt đầu bằng 0");
      isValid = false;
    }

    if (!serviceInput?.value) {
      if (core && serviceInput) core.showFieldError(serviceInput, "Vui lòng chọn loại dịch vụ");
      isValid = false;
    }

    const addressValue = addressInput?.value.trim() || "";
    if (!addressValue) {
      if (core && addressInput) core.showFieldError(addressInput, "Vui lòng nhập địa chỉ khảo sát");
      isValid = false;
    } else if (addressValue.length < 10) {
      if (core && addressInput) core.showFieldError(addressInput, "Địa chỉ quá ngắn, cần ghi rõ số nhà và tên đường");
      isValid = false;
    }

    const selectedDate = dateInput?.value || "";
    if (!selectedDate) {
      if (core && dateInput) core.showFieldError(dateInput, "Vui lòng chọn ngày khảo sát");
      isValid = false;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const surveyDate = new Date(`${selectedDate}T00:00:00`);
      if (surveyDate < today) {
        if (core && dateInput) core.showFieldError(dateInput, "Không thể chọn ngày trong quá khứ");
        isValid = false;
      }
    }

    if (!timeInput?.value) {
      if (core && timeInput) core.showFieldError(timeInput, "Vui lòng chọn khung giờ phù hợp");
      isValid = false;
    }

    const selectedFiles = Array.from(fileInput?.files || []);
    if (selectedFiles.length > 8) {
      if (core && fileInput) core.showFieldError(fileInput, "Tối đa 8 tệp cho một yêu cầu khảo sát");
      isValid = false;
    }

    return isValid;
  }

  function renderSurveyResult(form, data) {
    const messageDiv = document.getElementById("moving-survey-message");
    if (!messageDiv || !core) return;

    const serviceType = getSurveyFieldValue(form, "service_type");
    const serviceLabel = surveyServiceLabels[serviceType] || "Khảo sát";
    const address = core.escapeHtml(getSurveyFieldValue(form, "survey_address"));
    const surveyDate = core.escapeHtml(getSurveyFieldValue(form, "moving_survey_date"));
    const surveyTime = core.escapeHtml(
      getSurveySelectText(form, "moving_survey_time_slot"),
    );

    form.classList.add("hidden");
    messageDiv.classList.remove("hidden");
    messageDiv.innerHTML = `
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-slate-800">
        <h3 class="text-xl font-bold text-emerald-700">Đã ghi nhận lịch khảo sát</h3>
        <p class="mt-2 text-sm">Mã yêu cầu: <strong>${core.escapeHtml(data.order_code || "")}</strong></p>
        <div class="mt-4 space-y-2 rounded-xl bg-white p-4 text-sm shadow-sm">
          <p><strong>Dịch vụ:</strong> ${core.escapeHtml(serviceLabel)}</p>
          <p><strong>Địa chỉ khảo sát:</strong> ${address}</p>
          <p><strong>Lịch hẹn:</strong> ${surveyDate} ${surveyTime ? `- ${surveyTime}` : ""}</p>
          <p><strong>Phí đi lại:</strong> 50.000 VNĐ, thanh toán sau khi nhân viên đến nơi.</p>
        </div>
        <div class="mt-5 flex gap-3">
          <button type="button" onclick="window.closeSurveyModal && window.closeSurveyModal()" class="rounded-xl bg-accent px-5 py-3 font-semibold text-white">Đóng</button>
        </div>
      </div>
    `;
  }

  window.resetSurveyForm = function() {
    const form = document.getElementById("moving-survey-form");
    const messageDiv = document.getElementById("moving-survey-message");
    if (!form) return;

    form.reset();
    form.classList.remove("hidden");
    clearSurveyErrors(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.defaultText || "Đặt lịch khảo sát";
    }

    const fileInput = form.querySelector('[name="survey_files[]"]');
    if (fileInput) {
      fileInput._managedFiles = [];
      const dataTransfer = new DataTransfer();
      fileInput.files = dataTransfer.files;
      const previewGrid = fileInput.parentNode.querySelector(".file-preview-grid");
      if (previewGrid) previewGrid.innerHTML = "";
    }

    const latInput = form.querySelector('[name="survey_lat"]');
    const lngInput = form.querySelector('[name="survey_lng"]');
    if (latInput) latInput.value = "";
    if (lngInput) lngInput.value = "";

    const serviceSelect = form.querySelector('[name="service_type"]');
    if (serviceSelect) {
      serviceSelect.dispatchEvent(new Event("change"));
    }

    if (messageDiv) {
      messageDiv.classList.add("hidden");
      messageDiv.innerHTML = "";
    }
  };

  function handleSurveySubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    if (!form) return;
    if (!validateSurveyForm(form)) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      if (!submitBtn.dataset.defaultText) {
        submitBtn.dataset.defaultText = submitBtn.textContent.trim();
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang gửi yêu cầu...";
    }

    const formData = new FormData(form);
    formData.append("survey_fee", "50000");
    formData.append(
      "service_details",
      JSON.stringify(
        buildSurveyServiceDetails(form, getSurveyFieldValue(form, "service_type")),
      ),
    );

    const messageDiv = document.getElementById("moving-survey-message");
    if (messageDiv) {
      messageDiv.classList.add("hidden");
      messageDiv.innerHTML = "";
    }

    fetch(
      core ? core.toApiUrl("admin-chuyendon/api/save_survey.php") : "/dich-vu-chuyen-don/admin-chuyendon/api/save_survey.php",
      {
        method: "POST",
        body: formData,
      },
    )
      .then(async (response) => {
        const data = await response
          .json()
          .catch(() => ({ status: "error", message: "Máy chủ trả về dữ liệu không hợp lệ." }));
        if (!response.ok) {
          throw new Error(data.message || "Không thể lưu lịch khảo sát.");
        }
        return data;
      })
      .then((data) => {
        if (data.status !== "success") {
          throw new Error(data.message || "Không thể lưu lịch khảo sát.");
        }
        renderSurveyResult(form, data);
      })
      .catch((error) => {
        if (messageDiv) {
          messageDiv.classList.remove("hidden");
          messageDiv.innerHTML = `
            <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              ${core ? core.escapeHtml(error.message) : error.message}
            </div>
          `;
        }
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.defaultText || "Đặt lịch khảo sát";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadPricingData();
      attachComputeEvent();
    });
  } else {
    loadPricingData();
    attachComputeEvent();
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          let node = mutation.addedNodes[i];
          if (node.id === "booking-modal-placeholder" || node.id === "survey-modal-placeholder") {
             setTimeout(() => {
                attachComputeEvent();
                updateVehicleOptions();
                calculatePrice();
             }, 300);
          }
        }
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

})(window, document);
