(function (window, document) {
  let ALL_SERVICES_DATA = null;

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

    // Cập nhật lên UI
    const priceEl = document.getElementById('moving-total-cost');
    const breakdownEl = document.getElementById('moving-price-breakdown');
    
    if (priceEl) {
      priceEl.innerText = formatCurrency(total);
    }
    
    if (breakdownEl) {
      let breakdownHtml = '';
      
      // Phí cơ bản
      breakdownHtml += `<li class="flex justify-between items-center text-slate-700">
          <span>Phí cơ bản (${vehicleConfig.ten_hien_thi})</span>
          <span class="font-bold">${formatCurrency(vehicleConfig.gia_co_ban)}</span>
      </li>`;

      // Phí quãng đường
      if (distanceKm > vehicleConfig.km_co_ban) {
        let distFee = (distanceKm - vehicleConfig.km_co_ban) * vehicleConfig.gia_moi_km_tiep;
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2">- Thêm quãng đường (+${(distanceKm - vehicleConfig.km_co_ban).toFixed(1)}km):</span>
            <span>${formatCurrency(distFee)}</span>
        </li>`;
      }

      // Thể tích
      if (volume > volConfig.nguong_mien_phi) {
        let volFee = Math.ceil((volume - volConfig.nguong_mien_phi) / volConfig.buoc_nhay) * volConfig.don_gia_moi_buoc;
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2">- Phụ phí thể tích (>${volConfig.nguong_mien_phi}m3):</span>
            <span>${formatCurrency(volFee)}</span>
        </li>`;
      }

      // Trọng lượng
      if (weight > weightConfig.nguong_mien_phi) {
        let weightFee = Math.ceil((weight - weightConfig.nguong_mien_phi) / weightConfig.buoc_nhay) * weightConfig.don_gia_moi_buoc;
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2">- Phụ phí trọng lượng:</span>
            <span>${formatCurrency(weightFee)}</span>
        </li>`;
      }

      // Đặc tính
      if (selectedNatures.length > 0) {
        let natureFee = selectedNatures.reduce((acc, n) => acc + (config.phu_phi.tinh_chat_do_dac[n] || 0), 0);
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2">- Phụ phí đặc tính (${selectedNatures.length} món):</span>
            <span>${formatCurrency(natureFee)}</span>
        </li>`;
      }

      // Giờ giấc
      if (config.phu_phi.khung_gio[timeOfDay]) {
        breakdownHtml += `<li class="flex justify-between items-center text-slate-600">
            <span class="pl-2">- Phụ phí ngoài giờ:</span>
            <span>${formatCurrency(config.phu_phi.khung_gio[timeOfDay])}</span>
        </li>`;
      }

      breakdownEl.innerHTML = breakdownHtml;
    }
  }

  function attachComputeEvent() {
    const form = document.getElementById('moving-booking-form');
    if (!form) return;
    
    // Listen to changes on inputs to recalculate price live
    form.addEventListener('input', calculatePrice);
    form.addEventListener('change', calculatePrice);

    // Khi đổi loại dịch vụ -> Update danh sách xe
    const serviceSelect = document.getElementById('order-service-type-moving');
    if (serviceSelect) {
      serviceSelect.addEventListener('change', () => {
        updateVehicleOptions();
        calculatePrice();
      });
    }
    
    const confirmBtn = document.getElementById('confirm-moving-booking-btn');
    if(confirmBtn) {
       confirmBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if(!document.getElementById('moving-customer-name').value || !document.getElementById('moving-customer-phone').value) {
              alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
              return;
          }
          alert('Cảm ơn bạn! Yêu cầu Đặt Lịch đã được ghi nhận. Chúng tôi sẽ liên hệ báo giá chính thức sau khi đối chiếu lộ trình.');
          if(typeof window.closeBookingModal === 'function') window.closeBookingModal('moving');
       });
    }

    const surveyForm = document.getElementById('moving-survey-form');
    if(surveyForm) {
      surveyForm.onsubmit = function(e) {
        e.preventDefault();
        alert('Cảm ơn bạn! Yêu cầu Khảo Sát thực tế đã được gửi.');
        if(typeof window.closeSurveyModal === 'function') window.closeSurveyModal();
      };
    }
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
