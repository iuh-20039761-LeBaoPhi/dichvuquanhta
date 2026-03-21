(function (window, document) {
  if (window.__giaoHangNhanhOrderInitDone) return;
  window.__giaoHangNhanhOrderInitDone = true;

  const core = window.GiaoHangNhanhCore;
  if (!core) return;

  core.bindOrderShippingInputs();

  const formConfigs = [
    {
      id: "create-order-form",
      type: "delivery",
      messageId: "form-message-delivery",
      shippingFeeInputId: "shipping-fee-input",
      paymentSelectId: "payment_method_delivery",
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

  function buildBookingReturnPath(serviceType) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("open_booking", "true");
    const normalizedService = String(serviceType || "").trim().toLowerCase();
    if (normalizedService) {
      currentUrl.searchParams.set("service", normalizedService);
    } else {
      currentUrl.searchParams.delete("service");
    }
    return `${currentUrl.pathname}${currentUrl.search}`;
  }

  function renderAuthRequiredMessage(msgDiv, serviceType) {
    if (!msgDiv) return;
    const returnPath = buildBookingReturnPath(serviceType);
    const loginUrl = `${core.toApiUrl("dang-nhap.html")}?redirect=${encodeURIComponent(returnPath)}`;
    const registerUrl = `${core.toApiUrl("dang-ky.html")}?redirect=${encodeURIComponent(returnPath)}`;

    msgDiv.style.display = "block";
    msgDiv.className = "";
    msgDiv.classList.add("error");
    msgDiv.innerHTML = `
      <div style="background:#fff7e6; border:1px solid #ffd48a; border-radius:8px; padding:14px;">
        <p style="margin:0 0 10px; color:#7a4c00;"><strong>Bạn cần đăng nhập để xác nhận đặt đơn.</strong></p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a href="${loginUrl}" class="btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:120px;">Đăng nhập</a>
          <a href="${registerUrl}" class="btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; min-width:120px; color:#0a2a66; border-color:#0a2a66;">Đăng ký</a>
        </div>
      </div>
    `;
  }

  function validateOrderForm(form) {
    let isValid = true;

    const serviceTypeInp = form.querySelector("[name=service_type]");
    const serviceSuggestion = form.querySelector("#order-service-suggestion");
    const isIntlService =
      typeof core.isInternationalServiceType === "function" &&
      core.isInternationalServiceType(serviceTypeInp?.value || "");

    const isMovingService =
      serviceTypeInp?.value &&
      (serviceTypeInp.value.includes("moving_") ||
        serviceTypeInp.value.includes("chuyen_"));

    syncOrderFields(form);

    const nameInp = form.querySelector("[name=name]");
    const phoneInp = form.querySelector("[name=phone]");
    const receiverNameInp = form.querySelector("[name=receiver_name]");
    const receiverPhoneInp = form.querySelector("[name=receiver_phone]");
    const pickupInp = form.querySelector("[name=pickup]");
    const deliveryInp = form.querySelector("[name=delivery]");
    const intlCountryInp = form.querySelector("[name=intl_country]");
    const receiverIdTypeInp = form.querySelector("[name=receiver_id_type]");
    const receiverIdNumberInp = form.querySelector("[name=receiver_id_number]");
    const intlPurposeInp = form.querySelector("[name=intl_purpose]");
    const weightInp = form.querySelector("[name=weight]");
    const codInp = form.querySelector("[name=cod_amount]");
    const packageTypeInp = form.querySelector("[name=package_type]");
    const itemNameInp = form.querySelector("[name=item_name]");

    [
      nameInp,
      phoneInp,
      receiverNameInp,
      receiverPhoneInp,
      pickupInp,
      deliveryInp,
      intlCountryInp,
      receiverIdTypeInp,
      receiverIdNumberInp,
      intlPurposeInp,
      weightInp,
      codInp,
      packageTypeInp,
      itemNameInp,
    ].forEach((inp) => {
      if (inp) core.clearFieldError(inp);
    });
    if (serviceSuggestion) {
      serviceSuggestion.classList.remove("is-error");
    }

    if (!serviceTypeInp || !serviceTypeInp.value.trim()) {
      if (serviceSuggestion) {
        serviceSuggestion.textContent =
          "Vui lòng điền đủ thông tin và chọn một gói dịch vụ trước khi xác nhận đơn.";
        serviceSuggestion.classList.add("is-error");
      }
      isValid = false;
    }

    if (!nameInp || !nameInp.value.trim()) {
      if (nameInp) core.showFieldError(nameInp, "Vui lòng nhập họ và tên");
      isValid = false;
    }

    const phoneRegex = /^0[0-9]{9,10}$/;
    if (!phoneInp || !phoneInp.value.trim()) {
      if (phoneInp) core.showFieldError(phoneInp, "Vui lòng nhập số điện thoại");
      isValid = false;
    } else if (!phoneRegex.test(phoneInp.value.trim())) {
      core.showFieldError(phoneInp, "SĐT không hợp lệ (phải bắt đầu bằng 0)");
      isValid = false;
    }

    if (!isMovingService) {
      if (!receiverNameInp || !receiverNameInp.value.trim()) {
        if (receiverNameInp) {
          core.showFieldError(receiverNameInp, "Vui lòng nhập tên người nhận");
        }
        isValid = false;
      }
      if (!receiverPhoneInp || !receiverPhoneInp.value.trim()) {
        if (receiverPhoneInp) {
          core.showFieldError(receiverPhoneInp, "Vui lòng nhập SĐT người nhận");
        }
        isValid = false;
      } else if (!phoneRegex.test(receiverPhoneInp.value.trim())) {
        core.showFieldError(receiverPhoneInp, "SĐT người nhận không hợp lệ");
        isValid = false;
      }
    }

    const addressRegex = /(quận|huyện|tp|thành phố|phường|xã|q\.|p\.|q\d)/i;
    if (!pickupInp || !pickupInp.value.trim()) {
      if (pickupInp) core.showFieldError(pickupInp, "Vui lòng nhập địa chỉ lấy hàng");
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
      if (deliveryInp) core.showFieldError(deliveryInp, "Vui lòng nhập địa chỉ giao hàng");
      isValid = false;
    } else if (deliveryInp.value.trim().length < 10) {
      core.showFieldError(
        deliveryInp,
        "Địa chỉ quá ngắn (cần số nhà, tên đường...)",
      );
      isValid = false;
    } else if (!isIntlService && !addressRegex.test(deliveryInp.value)) {
      core.showFieldError(
        deliveryInp,
        "Vui lòng ghi rõ Quận/Huyện (VD: Quận 1)",
      );
      isValid = false;
    }

    if (isIntlService && (!intlCountryInp || !intlCountryInp.value.trim())) {
      if (intlCountryInp) {
        core.showFieldError(intlCountryInp, "Vui lòng chọn quốc gia nhận");
      }
      isValid = false;
    }
    if (isIntlService) {
      if (!receiverIdTypeInp || !receiverIdTypeInp.value.trim()) {
        if (receiverIdTypeInp) {
          core.showFieldError(receiverIdTypeInp, "Vui lòng chọn giấy tờ người nhận");
        }
        isValid = false;
      }
      if (!receiverIdNumberInp || !receiverIdNumberInp.value.trim()) {
        if (receiverIdNumberInp) {
          core.showFieldError(receiverIdNumberInp, "Vui lòng nhập số giấy tờ");
        }
        isValid = false;
      }
      if (!intlPurposeInp || !intlPurposeInp.value.trim()) {
        if (intlPurposeInp) {
          core.showFieldError(intlPurposeInp, "Vui lòng chọn mục đích gửi hàng");
        }
        isValid = false;
      }
    }

    if (itemNameInp && !itemNameInp.value.trim()) {
      if (itemNameInp.type === "hidden") {
        if (serviceSuggestion) {
          serviceSuggestion.textContent =
            "Vui lòng thêm ít nhất 1 hàng hóa và chọn đủ loại hàng, tên hàng.";
          serviceSuggestion.classList.add("is-error");
        }
      } else {
        core.showFieldError(itemNameInp, "Vui lòng chọn tên hàng");
      }
      isValid = false;
    }

    if (weightInp && parseFloat(weightInp.value || "0") < 0) {
      core.showFieldError(weightInp, "Khối lượng không được âm");
      isValid = false;
    }

    if (codInp && parseFloat(codInp.value || "0") < 0) {
      core.showFieldError(codInp, "Tiền thu hộ không được âm");
      isValid = false;
    }

    return isValid;
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

  function syncOrderFields(form) {
    const pickupTimeField = form.querySelector("[name=pickup_time]");
    if (pickupTimeField) {
      const surveyDate = getFieldValue(form, "moving_survey_date");
      const surveySlot = getSelectText(form, "moving_survey_time_slot");
      const normalizedSlot =
        surveySlot || getFieldValue(form, "moving_survey_time_slot");
      pickupTimeField.value = [surveyDate, normalizedSlot]
        .filter(Boolean)
        .join(" - ");
    }

    const senderName = form.querySelector("[name=name]");
    const senderPhone = form.querySelector("[name=phone]");
    const receiverName = form.querySelector("[name=receiver_name]");
    const receiverPhone = form.querySelector("[name=receiver_phone]");
    if (receiverName && senderName && !receiverName.value.trim()) {
      receiverName.value = senderName.value.trim();
    }
    if (receiverPhone && senderPhone && !receiverPhone.value.trim()) {
      receiverPhone.value = senderPhone.value.trim();
    }
  }

  function buildPaymentContent(data) {
    const amountNum = parseInt(data.amount, 10) || 0;
    if (data.payment_method !== "bank_transfer" || amountNum <= 0) {
      return '<p style="margin-top:15px; color:#28a745; text-align:center;"><em>Đơn hàng sẽ được xác nhận và thanh toán theo thỏa thuận.</em></p>';
    }

    const qrUrl = `https://img.vietqr.io/image/${data.bank_info.bank_id}-${data.bank_info.account_no}-${data.bank_info.template}.png?amount=${data.amount}&addInfo=${data.order_code}&accountName=${encodeURIComponent(data.bank_info.account_name)}`;
    return `
      <div style="margin-top:20px; border-top:1px dashed #ccc; padding-top:15px; background:#f9f9f9; border-radius:8px; padding:15px;">
        <h4 style="color:#0a2a66; margin-bottom:15px; text-align:center;">💳 THÔNG TIN CHUYỂN KHOẢN</h4>
        <div style="text-align:center;">
          <img src="${qrUrl}" alt="QR Code" style="max-width:200px; border:2px solid #0a2a66; border-radius:8px;">
          <p style="font-size:13px; color:#666; margin-top:10px;">Quét mã để thanh toán nhanh</p>
        </div>
        <p style="text-align:center; margin-top:10px; font-size:14px;"><strong>Số tiền:</strong> <span style="color:#d9534f; font-weight:bold;">${amountNum.toLocaleString()}đ</span></p>
      </div>`;
  }

  function renderSubmitResult(form, msgDiv, data, config) {
    const pickup = core.escapeHtml(form.querySelector("[name=pickup]").value);
    const delivery = core.escapeHtml(
      form.querySelector("[name=delivery]").value,
    );
    const serviceType = form.querySelector("[name=service_type]")?.value || "";
    const isMovingService = serviceType.includes("moving_");

    const shippingInput = config.shippingFeeInputId
      ? document.getElementById(config.shippingFeeInputId)
      : form.querySelector("[name=shipping_fee]");
    const shipFee = parseFloat(shippingInput?.value || "0");
    const codValue = parseFloat(
      form.querySelector("[name=cod_amount]")?.value || "0",
    );

    const shippingLine = isMovingService
      ? '<p style="margin-bottom:5px;">💵 <strong>Phí dịch vụ:</strong> Báo giá theo khảo sát</p>'
      : `<p style="margin-bottom:5px;">💵 <strong>Phí ship:</strong> ${shipFee.toLocaleString()}đ</p>`;
    const codLine =
      codValue > 0
        ? `<p>💰 <strong>Thu hộ:</strong> ${codValue.toLocaleString()}đ</p>`
        : "";
    const paymentContent = buildPaymentContent(data);

    msgDiv.style.display = "block";
    msgDiv.className = "";
    msgDiv.classList.add("success");
    msgDiv.innerHTML = `
      <div class="success-message">
        <div class="check-icon">✓</div>
        <h3>Đã tạo đơn thành công!</h3>
        <p>Mã đơn hàng: <strong style="font-size:18px; color:#0a2a66;">${data.order_code}</strong></p>
        <div style="text-align:left; font-size:14px; background:#fff; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #eee;">
          <p style="margin-bottom:5px;">🚩 <strong>Lấy tại:</strong> ${pickup}</p>
          <p style="margin-bottom:5px;">🏁 <strong>Giao đến:</strong> ${delivery}</p>
          ${shippingLine}
          ${codLine}
        </div>
        ${paymentContent}
        <div style="margin-top:25px; display:flex; gap:10px; justify-content:center;">
          <button type="button" onclick="resetOrderForm('${config.id}')" class="btn-primary">Tạo đơn mới</button>
          <a href="${core.toApiUrl("khach-hang/lich-su-don-hang.html")}" class="btn-secondary" style="color:#0a2a66; border-color:#0a2a66; text-decoration:none; display:inline-block; padding:12px 20px;">Xem lịch sử</a>
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

    function initCurrencyInputs() {
      const currencyInputs = form.querySelectorAll(
        ".input-currency, [name='cod_amount'], [name='insurance_value']",
      );
      currencyInputs.forEach((input) => {
        input.addEventListener("input", (e) => {
          let value = e.target.value.replace(/\D/g, "");
          if (value) {
            value = parseInt(value, 10).toLocaleString("vi-VN");
          }
          e.target.value = value;
        });
      });
    }
    initCurrencyInputs();

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

      const serviceTypeInp = form.querySelector("[name=service_type]");
      const serviceTypeValue = serviceTypeInp?.value || "";
      if (!window.isLoggedIn) {
        renderAuthRequiredMessage(msgDiv, serviceTypeValue);
        setButtonState(submitBtn, defaultSubmitText, false);
        return;
      }

      const isValid = validateOrderForm(form);
      if (!isValid) {
        setButtonState(submitBtn, defaultSubmitText, false);
        return;
      }

      if (!confirm("Bạn có chắc chắn muốn xác nhận đặt đơn hàng này không?")) {
        setButtonState(submitBtn, defaultSubmitText, false);
        return;
      }

      core.calculateOrderShipping();

      const formData = new FormData(form);
      const codInp = form.querySelector("[name=cod_amount]");
      if (codInp && codInp.disabled) {
        formData.append("cod_amount", codInp.value);
      }

      fetch(core.toApiUrl("order.php"), {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            renderSubmitResult(form, msgDiv, data, config);
            if (submitBtn) submitBtn.style.display = "none";
            form.reset();
            core.calculateOrderShipping();
            return;
          }

          msgDiv.style.display = "block";
          msgDiv.className = "";
          msgDiv.classList.add("error");
          if (data.status === "auth_required") {
            renderAuthRequiredMessage(msgDiv, serviceTypeValue);
          } else {
            msgDiv.innerHTML = `<strong>Có lỗi xảy ra:</strong><br>${data.message}`;
          }
        })
        .catch((error) => {
          msgDiv.style.display = "block";
          msgDiv.className = "error";
          msgDiv.innerHTML =
            "<strong>Không thể gửi đơn hàng. Vui lòng thử lại.</strong>";
          console.error(error);
        })
        .finally(() => {
          setButtonState(submitBtn, defaultSubmitText, false);
        });
    });
  }

  formConfigs.forEach(initOrderForm);

  window.openPaymentModal = function (orderCode, amount) {
    const modal = document.getElementById("payment-modal");
    if (!modal) return;

    document.getElementById("payment-amount").textContent =
      new Intl.NumberFormat("vi-VN").format(amount);
    document.getElementById("payment-note").textContent = orderCode;

    const qrContainer = document.getElementById("qr-container");
    const bankSettings = window.bankSettings || {
      bankId: "MB",
      accountNo: "0333666999",
      accountName: "GIAO HÀNG NHANH",
      template: "compact",
    };

    const qrUrl = `https://img.vietqr.io/image/${bankSettings.bankId}-${bankSettings.accountNo}-${bankSettings.template}.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(bankSettings.accountName)}`;
    qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="max-width:300px; width:100%; border:2px solid #0a2a66; border-radius:8px;">`;
    modal.style.display = "block";
  };

  window.closePaymentModal = function () {
    const modal = document.getElementById("payment-modal");
    if (modal) modal.style.display = "none";
  };

  window.addEventListener("click", function (event) {
    const paymentModal = document.getElementById("payment-modal");
    if (event.target === paymentModal) {
      window.closePaymentModal();
    }
  });

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

      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.innerText = btn.dataset.defaultText || "Đặt lịch";
        btn.disabled = false;
        btn.style.display = "block";
      }

      const paymentSelect = document.getElementById(cfg.paymentSelectId);
      if (paymentSelect) paymentSelect.dispatchEvent(new Event("change"));

      core.calculateOrderShipping();
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };
})(window, document);
