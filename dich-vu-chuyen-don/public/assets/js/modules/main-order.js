(function (window, document) {
  if (window.__fastGoOrderInitDone) return;
  window.__fastGoOrderInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  const formConfigs = [
    {
      id: "create-order-form-moving",
      type: "moving",
      messageId: "form-message-moving",
      shippingFeeInputId: "shipping-fee-input-moving",
      paymentSelectId: "payment_method_moving",
    },
    {
      id: "quick-contact-form",
      type: "quick",
      messageId: "form-message-quick",
    },
  ];

  function ensureMessageContainer(form, messageId) {
    let msgDiv = document.getElementById(messageId);
    if (msgDiv) return msgDiv;

    msgDiv = document.createElement("div");
    msgDiv.id = messageId;
    msgDiv.style.display = "none";
    form.parentNode.insertBefore(msgDiv, form.nextSibling);
    return msgDiv;
  }

  function setButtonState(button, text, disabled) {
    if (!button) return;
    button.innerText = text;
    button.disabled = !!disabled;
  }

  function validateOrderForm(form) {
    let isValid = true;

    const nameInp = form.querySelector("[name=name]");
    const phoneInp = form.querySelector("[name=phone]");
    const pickupInp = form.querySelector("[name=pickup]");
    const deliveryInp = form.querySelector("[name=delivery]");

    [nameInp, phoneInp, pickupInp, deliveryInp].forEach((inp) => {
      if (inp) core.clearFieldError(inp);
    });

    if (!nameInp || !nameInp.value.trim()) {
      if (nameInp) core.showFieldError(nameInp, "Vui lòng nhập họ và tên");
      isValid = false;
    }

    const phoneRegex = /^0[0-9]{9,10}$/;
    if (!phoneInp || !phoneInp.value.trim()) {
      if (phoneInp)
        core.showFieldError(phoneInp, "Vui lòng nhập số điện thoại");
      isValid = false;
    } else if (!phoneRegex.test(phoneInp.value.trim())) {
      core.showFieldError(phoneInp, "SĐT không hợp lệ (phải bắt đầu bằng 0)");
      isValid = false;
    }

    const addressRegex = /(quận|huyện|tp|thành phố|phường|xã|q\.|p\.|q\d)/i;
    if (!pickupInp || !pickupInp.value.trim()) {
      if (pickupInp)
        core.showFieldError(pickupInp, "Vui lòng nhập địa chỉ lấy hàng");
      isValid = false;
    } else if (pickupInp.value.trim().length < 10) {
      core.showFieldError(
        pickupInp,
        "Địa chỉ quá ngắn (cần số nhà, tên đường...)",
      );
      isValid = false;
    } else if (!addressRegex.test(pickupInp.value)) {
      core.showFieldError(pickupInp, "Vui lòng ghi rõ Quận/Huyện (VD: Quận 1)");
      isValid = false;
    }

    if (!deliveryInp || !deliveryInp.value.trim()) {
      if (deliveryInp)
        core.showFieldError(deliveryInp, "Vui lòng nhập địa chỉ giao hàng");
      isValid = false;
    } else if (deliveryInp.value.trim().length < 10) {
      core.showFieldError(
        deliveryInp,
        "Địa chỉ quá ngắn (cần số nhà, tên đường...)",
      );
      isValid = false;
    } else if (!addressRegex.test(deliveryInp.value)) {
      core.showFieldError(
        deliveryInp,
        "Vui lòng ghi rõ Quận/Huyện (VD: Quận 1)",
      );
      isValid = false;
    }

    return isValid;
  }

  function applyMovingDefaults(form) {
    const senderName = form.querySelector("[name=name]");
    const senderPhone = form.querySelector("[name=phone]");
    const receiverName = form.querySelector("[name=receiver_name]");
    const receiverPhone = form.querySelector("[name=receiver_phone]");
    const packageType = form.querySelector("[name=package_type]");
    const weight = form.querySelector("[name=weight]");
    const cod = form.querySelector("[name=cod_amount]");
    const shipping = form.querySelector("[name=shipping_fee]");

    if (receiverName && !receiverName.value.trim() && senderName) {
      receiverName.value = senderName.value.trim();
    }
    if (receiverPhone && !receiverPhone.value.trim() && senderPhone) {
      receiverPhone.value = senderPhone.value.trim();
    }
    if (packageType && !packageType.value) packageType.value = "other";
    if (weight) weight.value = "0";
    if (cod) cod.value = "0";
    if (shipping) shipping.value = "0";
  }

  function getFieldValue(form, name) {
    return String(form.querySelector(`[name="${name}"]`)?.value || "").trim();
  }

  function getCheckedValues(form, name) {
    return Array.from(form.querySelectorAll(`[name="${name}"]:checked`))
      .map((item) => String(item.value || "").trim())
      .filter(Boolean);
  }

  function getSelectText(form, name) {
    const select = form.querySelector(`[name="${name}"]`);
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    const text = String(option?.textContent || "").trim();
    if (!option || !option.value) return "";
    return text;
  }

  function buildMovingSummary(form, serviceType) {
    const serviceLabels = {
      moving_house: "Chuyển nhà",
      moving_office: "Chuyển văn phòng",
      moving_warehouse: "Chuyển kho bãi",
    };
    const serviceLabel = serviceLabels[serviceType] || "Chuyển dọn";
    const lines = [`[${serviceLabel}] Yêu cầu khảo sát`];

    const name = getFieldValue(form, "name");
    const phone = getFieldValue(form, "phone");
    const pickup = getFieldValue(form, "pickup");
    const delivery = getFieldValue(form, "delivery");
    const moveDate = getFieldValue(form, "moving_date") || getFieldValue(form, "moving_survey_date");
    const moveTime = getSelectText(form, "moving_time_slot") || getSelectText(form, "moving_survey_time_slot");
    const floors = getFieldValue(form, "moving_floors");
    const hasElevator = form.querySelector("[name=moving_elevator]")?.checked || form.querySelector("[name=moving_house_elevator]")?.value === "co";

    lines.push("");
    lines.push("Thông tin liên hệ:");
    lines.push(`- Họ và tên: ${name}`);
    lines.push(`- Số điện thoại: ${phone}`);

    lines.push("");
    lines.push("Thông tin địa điểm:");
    lines.push(`- Địa chỉ chuyển đi: ${pickup}`);
    lines.push(`- Địa chỉ chuyển đến: ${delivery}`);

    lines.push("");
    lines.push("Thông tin khảo sát/vận chuyển:");
    lines.push(`- Ngày dự kiến: ${moveDate || "Chưa chọn"}`);
    lines.push(`- Khung giờ: ${moveTime || "Chưa chọn"}`);
    lines.push(`- Số tầng: ${floors || "Chưa xác định"}`);
    lines.push(`- Thang máy: ${hasElevator ? "Có" : "Không"}`);

    if (serviceType === "moving_house") {
      const email = getFieldValue(form, "moving_house_email");
      const houseType = getSelectText(form, "moving_house_type");
      const houseFloors = getFieldValue(form, "moving_house_floors") || floors;
      const elevator = getSelectText(form, "moving_house_elevator") || (hasElevator ? "Có" : "Không");
      const truckAccess = form.querySelector("[name=house_truck_access]")?.checked ? "Vào được" : "Không rõ/Khó vào";
      const items = getFieldValue(form, "moving_house_items");
      const note = getFieldValue(form, "moving_house_note");
      const services = getCheckedValues(form, "moving_house_services[]");
      const serviceOther = getFieldValue(form, "moving_house_service_other");

      lines.push(`- Email: ${email || "Không có"}`);
      lines.push("");
      lines.push("Thông tin chi tiết:");
      lines.push(`- Loại nhà: ${houseType || "Không có"}`);
      lines.push(`- Số tầng: ${floors || "Không có"}`);
      lines.push(`- Có thang máy không: ${elevator || "Không có"}`);
      lines.push("");
      lines.push("Thông tin thêm:");
      lines.push(`- Danh sách đồ cần chuyển: ${items || "Không có"}`);
      lines.push(
        `- Dịch vụ cần tư vấn: ${services.length ? services.join(", ") : "Chưa chọn"}`,
      );
      lines.push(`- Hẻm xe tải: ${truckAccess}`);
      lines.push(`- Dịch vụ khác: ${serviceOther || "Không có"}`);
      lines.push(`- Ghi chú thêm: ${note || "Không có"}`);
    } else if (serviceType === "moving_office") {
      const email = getFieldValue(form, "moving_office_email");
      const company = getFieldValue(form, "moving_office_company");
      const staffCount = getFieldValue(form, "moving_office_staff_count");
      const area = getFieldValue(form, "moving_office_area");
      const elevator = getSelectText(form, "moving_office_elevator");
      const dismantle = getSelectText(form, "moving_office_dismantle");
      const itMove = form.querySelector("[name=office_it_move]")?.checked ? "Có" : "Không";
      const note = getFieldValue(form, "moving_office_note");
      const services = getCheckedValues(form, "moving_office_services[]");
      const serviceOther = getFieldValue(form, "moving_office_service_other");

      lines.push(`- Email: ${email || "Không có"}`);
      lines.push(`- Tên công ty: ${company || "Không có"}`);
      lines.push("");
      lines.push("Thông tin văn phòng:");
      lines.push(`- Số lượng nhân viên: ${staffCount || "Không có"}`);
      lines.push(`- Diện tích văn phòng (ước lượng): ${area || "Không có"}`);
      lines.push(`- Có thang máy không: ${elevator || "Không có"}`);
      lines.push("");
      lines.push("Thông tin thêm:");
      lines.push(
        `- Có cần tháo lắp nội thất không: ${dismantle || "Không có"}`,
      );
      lines.push(`- Di dời Server/IT: ${itMove}`);
      lines.push(
        `- Dịch vụ cần tư vấn: ${services.length ? services.join(", ") : "Chưa chọn"}`,
      );
      lines.push(`- Dịch vụ khác: ${serviceOther || "Không có"}`);
      lines.push(`- Ghi chú thêm: ${note || "Không có"}`);
    } else if (serviceType === "moving_warehouse") {
      const email = getFieldValue(form, "moving_warehouse_email");
      const company = getFieldValue(form, "moving_warehouse_company");
      const goodsType = getSelectText(form, "moving_warehouse_goods_type");
      const estimatedVolume = getFieldValue(
        form,
        "moving_warehouse_estimated_volume",
      );
      const area = getFieldValue(form, "moving_warehouse_area");
      const equipmentSupport = getSelectText(
        form,
        "moving_warehouse_equipment_support",
      );
      const warehouseVolume = getFieldValue(form, "warehouse_volume") || getFieldValue(form, "moving_warehouse_estimated_volume");
      const note = getFieldValue(form, "moving_warehouse_note");
      const services = getCheckedValues(form, "moving_warehouse_services[]");
      const serviceOther = getFieldValue(
        form,
        "moving_warehouse_service_other",
      );

      lines.push(`- Email: ${email || "Không có"}`);
      lines.push(`- Tên công ty (nếu có): ${company || "Không có"}`);
      lines.push("");
      lines.push("Thông tin kho:");
      lines.push(`- Loại hàng hóa: ${goodsType || "Không có"}`);
      lines.push(`- Khối lượng ước tính: ${estimatedVolume || "Không có"}`);
      lines.push(`- Diện tích kho: ${area || "Không có"}`);
      lines.push("");
      lines.push("Thông tin thêm:");
      lines.push(
        `- Có cần xe nâng / thiết bị hỗ trợ không: ${equipmentSupport || "Không có"}`,
      );
      lines.push(`- Khối lượng/Thể tích sơ bộ: ${warehouseVolume || "Không có"}`);
      lines.push(
        `- Dịch vụ cần tư vấn: ${services.length ? services.join(", ") : "Chưa chọn"}`,
      );
      lines.push(`- Dịch vụ khác: ${serviceOther || "Không có"}`);
      lines.push(`- Ghi chú thêm: ${note || "Không có"}`);
    }

    return lines.join("\n");
  }

  function prepareMovingPayload(form, serviceType) {
    const noteField = form.querySelector("[name=note]");
    if (noteField) {
      noteField.value = buildMovingSummary(form, serviceType);
    }

    const pickupTimeField = form.querySelector("[name=pickup_time]");
    if (pickupTimeField) {
      const moveDate = getFieldValue(form, "moving_date") || getFieldValue(form, "moving_survey_date");
      const moveTime = getSelectText(form, "moving_time_slot") || getSelectText(form, "moving_survey_time_slot");
      const normalizedSlot =
        moveTime || getFieldValue(form, "moving_time_slot") || getFieldValue(form, "moving_survey_time_slot");
      pickupTimeField.value = [moveDate, normalizedSlot]
        .filter(Boolean)
        .join(" - ");
    }

    const senderName = form.querySelector("[name=name]");
    const senderPhone = form.querySelector("[name=phone]");
    const receiverName = form.querySelector("[name=receiver_name]");
    const receiverPhone = form.querySelector("[name=receiver_phone]");
    if (receiverName && senderName)
      receiverName.value = senderName.value.trim();
    if (receiverPhone && senderPhone)
      receiverPhone.value = senderPhone.value.trim();
  }

  function buildPaymentContent(data) {
    return `
      <div style="margin-top:10px; display:flex; flex-direction:column; align-items:center;">
        <p style="color:#28a745; margin-top:5px; text-align:center;"><em>Đơn hàng sẽ được xác nhận và thanh toán sau khi khảo sát thực tế.</em></p>
      </div>`;
  }

  function renderSubmitResult(form, msgDiv, data, config) {
    const pickup = core.escapeHtml(form.querySelector("[name=pickup]").value);
    const delivery = core.escapeHtml(
      form.querySelector("[name=delivery]").value,
    );
    const paymentContent = buildPaymentContent(data);

    // Tìm modal form và ẩn đi
    const modalContent = form.closest('.booking-modal-content');
    if (modalContent) {
        // Lấy tất cả children trừ nút tắt X (thường là element đầu tiên)
        Array.from(modalContent.children).forEach(el => {
            if (!el.classList.contains('modal-close-btn') && el !== msgDiv) {
                el.style.display = 'none';
            }
        });
    }

    msgDiv.style.display = "block";
    msgDiv.className = "";
    msgDiv.classList.add("success");
    msgDiv.innerHTML = `
      <div class="success-message">
        <h3 style="color:#28a745; font-size:24px; margin-top:10px;">Đã đặt lịch thành công!</h3>
        <p style="margin-top:10px;">Mã yêu cầu: <strong style="font-size:18px; color:#1b4332;">${data.order_code || "SURVEY-" + Date.now()}</strong></p>
        <div style="text-align:left; font-size:14px; background:#fff; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #eee;">
          <p style="margin-bottom:5px;">🚩 <strong>Địa điểm đi:</strong> ${pickup}</p>
          <p style="margin-bottom:5px;">🏁 <strong>Địa điểm đến:</strong> ${delivery}</p>
          <p style="margin-bottom:5px; border-top: 1px dashed #ddd; padding-top: 5px; margin-top: 5px;">💸 <strong>Phí đi lại (khảo sát):</strong> <span style="color:#e63946; font-weight:bold;">50,000 VNĐ</span> <em>(Thanh toán trực tiếp sau)</em></p>
          <p style="margin-bottom:5px;">💵 <strong>Phí dịch vụ:</strong> Báo giá chi tiết qua số điện thoại</p>
        </div>
        ${paymentContent}
        <div style="margin-top:25px; display:flex; gap:10px; justify-content:center;">
          <button type="button" onclick="closeBookingModal('${config.type}')" class="btn-primary" style="padding: 10px 30px;">Đóng</button>
        </div>
      </div>`;
  }

  function initOrderForm(config) {
    const form = document.getElementById(config.id);
    if (!form) return;

    const msgDiv = ensureMessageContainer(form, config.messageId);
    const submitBtnInit = form.querySelector("button[type='submit']");
    if (submitBtnInit && !submitBtnInit.dataset.defaultText) {
      submitBtnInit.dataset.defaultText = submitBtnInit.innerText.trim();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const submitBtn = form.querySelector("button[type='submit']");
      if (!submitBtn) return;
      const defaultSubmitText =
        submitBtn.dataset.defaultText ||
        submitBtn.innerText.trim() ||
        "Đặt lịch";
      submitBtn.dataset.defaultText = defaultSubmitText;
      setButtonState(submitBtn, "Đang xử lý...", true);

      if (config.type === "quick") {
        const nameInp = form.querySelector("[name=name]");
        const phoneInp = form.querySelector("[name=phone]");
        const name = nameInp?.value.trim();
        const phone = phoneInp?.value.trim();

        if (!name || !phone) {
          if (!name && nameInp)
            core.showFieldError(nameInp, "Vui lòng nhập tên");
          if (!phone && phoneInp)
            core.showFieldError(phoneInp, "Vui lòng nhập SĐT");
          setButtonState(submitBtn, defaultSubmitText, false);
          return;
        }

        if (typeof window.openBookingModal === "function") {
          window.openBookingModal("moving_house").then(() => {
            const fullForm = document.getElementById(
              "create-order-form-moving",
            );
            if (fullForm) {
              const fName = fullForm.querySelector("[name=name]");
              const fPhone = fullForm.querySelector("[name=phone]");
              if (fName) fName.value = name;
              if (fPhone) fPhone.value = phone;
            }
            setButtonState(submitBtn, defaultSubmitText, false);
            form.reset();
          });
        }
        return;
      }

      const serviceTypeInp = form.querySelector("[name=service_type]");
      const serviceTypeValue = serviceTypeInp?.value || "";

      const isValid = validateOrderForm(form);
      if (!isValid) {
        setButtonState(submitBtn, defaultSubmitText, false);
        return;
      }

      applyMovingDefaults(form);
      prepareMovingPayload(form, serviceTypeValue);

      const formData = new FormData(form);
      formData.append('survey_fee', '50000'); // Gửi phí khảo sát 50k xuống server

      // Gọi API thực tế
      fetch("/dich-vu-chuyen-don/admin-chuyendon/api/save_order.php", {
          method: "POST",
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === "success") {
              renderSubmitResult(form, msgDiv, data, config);
              if (submitBtn) submitBtn.style.display = "none";
              form.reset();
              const movingSelect = form.querySelector("[name=service_type]");
              if (movingSelect) movingSelect.dispatchEvent(new Event("change"));
          } else {
             core.showFieldError(submitBtn, data.message || "Có lỗi xảy ra, vui lòng thử lại.");
             setButtonState(submitBtn, defaultSubmitText, false);
          }
      })
      .catch(err => {
          console.error("Fetch Error:", err);
          core.showFieldError(submitBtn, "Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.");
          setButtonState(submitBtn, defaultSubmitText, false);
      });
    });
  }

  formConfigs.forEach(initOrderForm);

  window.resetOrderForm = function (formId) {
    const targets = formId
      ? [formConfigs.find((cfg) => cfg.id === formId)].filter(Boolean)
      : formConfigs;

    targets.forEach((cfg) => {
      const form = document.getElementById(cfg.id);
      const msg = document.getElementById(cfg.messageId);
      if (!form) return;

      if (msg) {
        msg.style.display = "none";
        msg.innerHTML = "";
      }

      form.reset();
      
      const modalContent = form.closest('.booking-modal-content');
      if (modalContent) {
          Array.from(modalContent.children).forEach(el => {
              el.style.display = ''; // Hiện lại mọi thứ khi reset
          });
      }

      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.innerText = btn.dataset.defaultText || "Đặt lịch";
        btn.disabled = false;
        btn.style.display = "block";
      }

      const paymentSelect = document.getElementById(cfg.paymentSelectId);
      if (paymentSelect) paymentSelect.dispatchEvent(new Event("change"));

      const movingSelect = form.querySelector("[name=service_type]");
      if (movingSelect) movingSelect.dispatchEvent(new Event("change"));
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };
})(window, document);

// Cập nhật hàm Close Modal (do ta ẩn components đi ở trên nên cần reset lại trước khi đóng)
const originalCloseBookingModal = typeof window.closeBookingModal === "function" ? window.closeBookingModal : null;
window.closeBookingModal = function(type) {
    if (type === 'moving') {
        window.resetOrderForm("create-order-form-moving"); 
    }
    if (originalCloseBookingModal) {
        originalCloseBookingModal(type);
    } else {
        const modal = document.getElementById("booking-modal-" + type);
        if (modal) {
          modal.style.display = "none";
          document.body.style.overflow = "auto";
        }
    }
};
