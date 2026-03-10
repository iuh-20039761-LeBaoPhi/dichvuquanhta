(function (window, document) {
  if (window.__fastGoCreateOrderPageInitDone) return;
  window.__fastGoCreateOrderPageInitDone = true;

  const ITEM_TYPE_OPTIONS = [
    { value: "thuong", label: "Hàng thông thường" },
    { value: "gia-tri-cao", label: "Hàng giá trị cao" },
    { value: "de-vo", label: "Hàng dễ vỡ" },
    { value: "chat-long", label: "Hàng chất lỏng" },
    { value: "pin-lithium", label: "Hàng chứa pin lithium" },
    { value: "dong-lanh", label: "Hàng đông lạnh" },
    { value: "cong-kenh", label: "Hàng cồng kềnh" },
  ];

  const ITEM_TYPE_TO_PACKAGE_TYPE = {
    thuong: "other",
    "gia-tri-cao": "electronic",
    "de-vo": "other",
    "chat-long": "food",
    "pin-lithium": "electronic",
    "dong-lanh": "food",
    "cong-kenh": "other",
  };

  let currentAddrField = "";

  function toNumber(value, fallback = 0) {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
  }

  function roundTo(value, digits) {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }

  function setSelectOptions(selectEl, options, placeholderText) {
    if (!selectEl) return;
    const previous = selectEl.value;
    selectEl.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = placeholderText;
    selectEl.appendChild(placeholder);

    (Array.isArray(options) ? options : []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      selectEl.appendChild(option);
    });

    if (previous && Array.from(selectEl.options).some((o) => o.value === previous)) {
      selectEl.value = previous;
    } else {
      selectEl.value = "";
    }
  }

  function initCorporateFields() {
    const corporateCheckbox = document.getElementById("is_corporate_checkbox");
    const corporateFields = document.getElementById("corporate_info_fields");
    if (!corporateCheckbox || !corporateFields) return;

    const companyNameInput = corporateFields.querySelector('[name="company_name"]');
    const companyEmailInput = corporateFields.querySelector('[name="company_email"]');
    const companyTaxInput = corporateFields.querySelector('[name="company_tax_code"]');
    const companyAddressInput = corporateFields.querySelector('[name="company_address"]');

    const applyState = () => {
      const checked = !!corporateCheckbox.checked;
      corporateFields.style.display = checked ? "block" : "none";
      [companyNameInput, companyEmailInput, companyTaxInput, companyAddressInput]
        .filter(Boolean)
        .forEach((input) => {
          input.required = checked;
        });
    };

    corporateCheckbox.addEventListener("change", applyState);
    applyState();
  }

  function initAddressModal() {
    const modal = document.getElementById("addr-modal");
    if (!modal) return;

    window.openAddrModal = function (type) {
      currentAddrField = String(type || "");
      modal.style.display = "block";
    };

    window.selectAddr = function (address, phone) {
      const pickupInput = document.getElementById("pickup-addr");
      const deliveryInput = document.getElementById("delivery-addr");
      const receiverPhoneInput = document.getElementById("receiver_phone");

      if (currentAddrField === "pickup" && pickupInput) {
        pickupInput.value = address || "";
      } else if (currentAddrField === "delivery") {
        if (deliveryInput) deliveryInput.value = address || "";
        if (receiverPhoneInput && phone) receiverPhoneInput.value = phone;
      }
      modal.style.display = "none";

      if (typeof window.calculateOrderShipping === "function") {
        window.calculateOrderShipping();
      }
    };

    window.addEventListener("click", function (event) {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  function bindCityDistrict(citySelect, districtSelect, cityMap, cityPlaceholder, districtPlaceholder) {
    if (!citySelect || !districtSelect) return;
    const cityOptions = Object.keys(cityMap || {}).sort((a, b) =>
      a.localeCompare(b, "vi", { sensitivity: "base" }),
    );
    setSelectOptions(citySelect, cityOptions, cityPlaceholder);
    setSelectOptions(districtSelect, [], districtPlaceholder);
    districtSelect.disabled = true;

    const applyDistricts = () => {
      const city = citySelect.value;
      const districts = Array.isArray(cityMap[city]) ? cityMap[city] : [];
      setSelectOptions(districtSelect, districts, districtPlaceholder);
      districtSelect.disabled = districts.length === 0;
    };

    citySelect.addEventListener("change", () => {
      applyDistricts();
      if (typeof window.calculateOrderShipping === "function") {
        window.calculateOrderShipping();
      }
    });
    districtSelect.addEventListener("change", function () {
      if (typeof window.calculateOrderShipping === "function") {
        window.calculateOrderShipping();
      }
    });
    applyDistricts();
  }

  function initLocationSelectors() {
    const quoteData =
      window.QUOTE_SHIPPING_DATA && typeof window.QUOTE_SHIPPING_DATA === "object"
        ? window.QUOTE_SHIPPING_DATA
        : {};

    const citiesMap =
      quoteData.cities && typeof quoteData.cities === "object" ? quoteData.cities : {};
    const pickupCity = document.getElementById("pickup-city");
    const pickupDistrict = document.getElementById("pickup-district");
    const deliveryCity = document.getElementById("delivery-city");
    const deliveryDistrict = document.getElementById("delivery-district");

    bindCityDistrict(
      pickupCity,
      pickupDistrict,
      citiesMap,
      "Chọn tỉnh/thành phố gửi",
      "Chọn quận/huyện gửi",
    );
    bindCityDistrict(
      deliveryCity,
      deliveryDistrict,
      citiesMap,
      "Chọn tỉnh/thành phố nhận",
      "Chọn quận/huyện nhận",
    );

    const intlCountry = document.getElementById("delivery-intl-country");
    const intlProvince = document.getElementById("delivery-intl-province");
    if (intlCountry && intlProvince) {
      const intlData =
        quoteData.international && typeof quoteData.international === "object"
          ? quoteData.international
          : {};
      const countries = Array.isArray(intlData.countries) ? intlData.countries : [];
      const destinationRegions =
        intlData.destinationRegions && typeof intlData.destinationRegions === "object"
          ? intlData.destinationRegions
          : {};

      setSelectOptions(intlCountry, countries, "Chọn quốc gia nhận");
      setSelectOptions(intlProvince, [], "Chọn tỉnh/bang nhận");
      intlProvince.disabled = true;

      const applyIntlRegions = () => {
        const selected = intlCountry.value;
        const regions = Array.isArray(destinationRegions[selected])
          ? destinationRegions[selected]
          : [];
        setSelectOptions(intlProvince, regions, "Chọn tỉnh/bang nhận");
        intlProvince.disabled = regions.length === 0;
      };

      intlCountry.addEventListener("change", () => {
        applyIntlRegions();
        if (typeof window.calculateOrderShipping === "function") {
          window.calculateOrderShipping();
        }
      });
      intlProvince.addEventListener("change", function () {
        if (typeof window.calculateOrderShipping === "function") {
          window.calculateOrderShipping();
        }
      });
      applyIntlRegions();
    }
  }

  function initOrderModeAndService() {
    const modeSelect = document.getElementById("order-mode");
    const serviceSelect = document.getElementById("order-service-type");
    const domesticCityGroup = document.getElementById("domestic-delivery-city-group");
    const domesticDistrictGroup = document.getElementById("domestic-delivery-district-group");
    const intlCountryGroup = document.getElementById("intl-country-group");
    const intlProvinceGroup = document.getElementById("intl-province-group");
    const intlCountrySelect = document.getElementById("delivery-intl-country");
    const paymentSelect = document.getElementById("payment_method_delivery");
    const codInput = document.getElementById("cod_amount");

    if (!modeSelect || !serviceSelect) return;

    const applyModeState = () => {
      const mode = modeSelect.value === "international" ? "international" : "domestic";
      const options = Array.from(serviceSelect.options);
      let firstVisibleValue = "";
      options.forEach((opt) => {
        const optionMode = opt.dataset.mode || "domestic";
        const shouldShow = !opt.value || optionMode === mode;
        opt.hidden = !shouldShow;
        if (!firstVisibleValue && shouldShow && opt.value) {
          firstVisibleValue = opt.value;
        }
      });

      const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
      if (!selectedOption || selectedOption.hidden) {
        serviceSelect.value = firstVisibleValue || "";
      }

      const isIntl = mode === "international";
      if (domesticCityGroup) domesticCityGroup.style.display = isIntl ? "none" : "";
      if (domesticDistrictGroup) domesticDistrictGroup.style.display = isIntl ? "none" : "";
      if (intlCountryGroup) intlCountryGroup.style.display = isIntl ? "" : "none";
      if (intlProvinceGroup) intlProvinceGroup.style.display = isIntl ? "" : "none";
      if (intlCountrySelect) intlCountrySelect.required = isIntl;

      if (codInput) {
        if (isIntl) {
          codInput.value = "0";
          codInput.disabled = true;
          codInput.style.backgroundColor = "#e9ecef";
        } else if (paymentSelect && paymentSelect.value !== "bank_transfer") {
          codInput.disabled = false;
          codInput.style.backgroundColor = "#ffffff";
        }
      }

      if (typeof window.calculateOrderShipping === "function") {
        window.calculateOrderShipping();
      }
    };

    modeSelect.addEventListener("change", applyModeState);
    serviceSelect.addEventListener("change", function () {
      const selected = String(serviceSelect.value || "").toLowerCase();
      if (selected.startsWith("intl_")) {
        modeSelect.value = "international";
      } else {
        modeSelect.value = "domestic";
      }
      applyModeState();
    });

    applyModeState();
  }

  function initPaymentMethod() {
    const paymentSelect = document.getElementById("payment_method_delivery");
    const codInput = document.getElementById("cod_amount");
    const modeSelect = document.getElementById("order-mode");
    if (!paymentSelect || !codInput) return;

    const applyState = () => {
      const isIntl = modeSelect && modeSelect.value === "international";
      if (paymentSelect.value === "bank_transfer" || isIntl) {
        codInput.value = "0";
        codInput.disabled = true;
        codInput.style.backgroundColor = "#e9ecef";
      } else {
        codInput.disabled = false;
        codInput.style.backgroundColor = "#ffffff";
      }
      if (typeof window.calculateOrderShipping === "function") {
        window.calculateOrderShipping();
      }
    };

    paymentSelect.addEventListener("change", applyState);
    if (modeSelect) modeSelect.addEventListener("change", applyState);
    applyState();
  }

  function createCargoRow(index) {
    const typeOptionsHtml = ITEM_TYPE_OPTIONS.map(
      (opt) => `<option value="${opt.value}">${opt.label}</option>`,
    ).join("");

    const wrapper = document.createElement("div");
    wrapper.className = "cargo-item-card";
    wrapper.style.border = "1px solid #e8eef7";
    wrapper.style.borderRadius = "10px";
    wrapper.style.padding = "12px";
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
        <strong class="cargo-item-title" style="color:#0a2a66;">Hàng hóa #${index + 1}</strong>
        <button type="button" class="btn-secondary cargo-remove-btn" style="padding:6px 10px; color:#a12f2f; border-color:#a12f2f;">
          Xóa
        </button>
      </div>
      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
        <div class="form-group">
          <label>Loại hàng</label>
          <select class="cargo-type">${typeOptionsHtml}</select>
        </div>
        <div class="form-group">
          <label>Tên hàng</label>
          <input type="text" class="cargo-name" placeholder="VD: Máy in, Hồ sơ..." />
        </div>
        <div class="form-group">
          <label>Số kiện</label>
          <input type="number" class="cargo-qty" min="1" step="1" value="1" />
        </div>
        <div class="form-group">
          <label>Khối lượng / kiện (kg)</label>
          <input type="number" class="cargo-weight" min="0" step="0.01" value="1" />
        </div>
        <div class="form-group">
          <label>Dài (cm)</label>
          <input type="number" class="cargo-length" min="0" step="1" value="0" />
        </div>
        <div class="form-group">
          <label>Rộng (cm)</label>
          <input type="number" class="cargo-width" min="0" step="1" value="0" />
        </div>
        <div class="form-group">
          <label>Cao (cm)</label>
          <input type="number" class="cargo-height" min="0" step="1" value="0" />
        </div>
        <div class="form-group">
          <label>Khai giá (VNĐ)</label>
          <input type="number" class="cargo-insurance" min="0" step="1000" value="0" />
        </div>
      </div>
    `;
    return wrapper;
  }

  function initCargoItems() {
    const container = document.getElementById("cargo-items");
    const addBtn = document.getElementById("add-cargo-item");
    const weightInput = document.getElementById("weight");
    const insuranceTotalInput = document.getElementById("insurance-total");
    const packageTypeSelect = document.getElementById("package_type");
    const quantityHidden = document.getElementById("quantity-hidden");
    const lengthHidden = document.getElementById("length-hidden");
    const widthHidden = document.getElementById("width-hidden");
    const heightHidden = document.getElementById("height-hidden");
    const insuranceHidden = document.getElementById("insurance-value-hidden");
    const itemTypeHidden = document.getElementById("item-type-hidden");
    const itemNameHidden = document.getElementById("item-name-hidden");
    const itemsPayloadHidden = document.getElementById("order-items-payload");
    const weightField = document.querySelector("input[name='weight']");

    if (!container || !addBtn || !weightInput) return;

    function refreshTitles() {
      Array.from(container.querySelectorAll(".cargo-item-card")).forEach((row, idx) => {
        const title = row.querySelector(".cargo-item-title");
        const removeBtn = row.querySelector(".cargo-remove-btn");
        if (title) title.textContent = `Hàng hóa #${idx + 1}`;
        if (removeBtn) removeBtn.disabled = container.children.length === 1;
      });
    }

    function syncAggregates() {
      const rows = Array.from(container.querySelectorAll(".cargo-item-card"));
      const payload = [];
      let totalWeight = 0;
      let totalQty = 0;
      let totalInsurance = 0;
      let totalVolumetricWeight = 0;
      let firstType = "";
      let firstName = "";

      rows.forEach((row) => {
        const type = String(row.querySelector(".cargo-type")?.value || "thuong");
        const name = String(row.querySelector(".cargo-name")?.value || "").trim();
        const qty = Math.max(1, Math.round(toNumber(row.querySelector(".cargo-qty")?.value, 1)));
        const weightPerUnit = Math.max(0, toNumber(row.querySelector(".cargo-weight")?.value, 0));
        const length = Math.max(0, toNumber(row.querySelector(".cargo-length")?.value, 0));
        const width = Math.max(0, toNumber(row.querySelector(".cargo-width")?.value, 0));
        const height = Math.max(0, toNumber(row.querySelector(".cargo-height")?.value, 0));
        const insurance = Math.max(0, toNumber(row.querySelector(".cargo-insurance")?.value, 0));

        if (!firstType) firstType = type;
        if (!firstName) firstName = name;

        const itemTotalWeight = qty * weightPerUnit;
        const volumeWeightPerUnit =
          length > 0 && width > 0 && height > 0 ? (length * width * height) / 5000 : 0;

        totalWeight += itemTotalWeight;
        totalQty += qty;
        totalInsurance += insurance;
        totalVolumetricWeight += volumeWeightPerUnit * qty;

        payload.push({
          type,
          name,
          quantity: qty,
          weight_per_unit: roundTo(weightPerUnit, 3),
          length: roundTo(length, 2),
          width: roundTo(width, 2),
          height: roundTo(height, 2),
          insurance_value: Math.round(insurance),
        });
      });

      const safeTotalWeight = roundTo(totalWeight, 3);
      weightInput.value = safeTotalWeight > 0 ? safeTotalWeight : 0;
      if (weightField) weightField.value = safeTotalWeight > 0 ? safeTotalWeight : 0;

      if (insuranceTotalInput) insuranceTotalInput.value = Math.round(totalInsurance);
      if (quantityHidden) quantityHidden.value = totalQty > 0 ? totalQty : 1;
      if (insuranceHidden) insuranceHidden.value = Math.round(totalInsurance);
      if (itemTypeHidden) itemTypeHidden.value = firstType || "thuong";
      if (itemNameHidden) itemNameHidden.value = firstName || "";
      if (itemsPayloadHidden) itemsPayloadHidden.value = JSON.stringify(payload);

      if (packageTypeSelect && firstType) {
        const mappedPackage = ITEM_TYPE_TO_PACKAGE_TYPE[firstType] || "other";
        if (Array.from(packageTypeSelect.options).some((opt) => opt.value === mappedPackage)) {
          packageTypeSelect.value = mappedPackage;
        }
      }

      if (lengthHidden && widthHidden && heightHidden) {
        if (totalVolumetricWeight > 0) {
          // Quy đổi nhiều kiện về một kiện tương đương để dùng lại hàm tính hiện có.
          lengthHidden.value = 100;
          widthHidden.value = 100;
          heightHidden.value = Math.max(
            1,
            Math.ceil((totalVolumetricWeight * 5000) / (100 * 100)),
          );
        } else {
          lengthHidden.value = 0;
          widthHidden.value = 0;
          heightHidden.value = 0;
        }
      }

      if (typeof window.calculateOrderShipping === "function") {
        window.calculateOrderShipping();
      }
    }

    function bindRowEvents(row) {
      const removeBtn = row.querySelector(".cargo-remove-btn");
      const controls = row.querySelectorAll("input, select");
      controls.forEach((control) => {
        control.addEventListener("input", syncAggregates);
        control.addEventListener("change", syncAggregates);
      });

      if (removeBtn) {
        removeBtn.addEventListener("click", function () {
          if (container.children.length <= 1) return;
          row.remove();
          refreshTitles();
          syncAggregates();
        });
      }
    }

    function addRow(initialData) {
      const row = createCargoRow(container.children.length);
      container.appendChild(row);

      if (initialData && typeof initialData === "object") {
        const typeInput = row.querySelector(".cargo-type");
        const nameInput = row.querySelector(".cargo-name");
        const qtyInput = row.querySelector(".cargo-qty");
        const weightInputRow = row.querySelector(".cargo-weight");
        if (typeInput && initialData.type) typeInput.value = initialData.type;
        if (nameInput && initialData.name) nameInput.value = initialData.name;
        if (qtyInput && initialData.quantity) qtyInput.value = initialData.quantity;
        if (weightInputRow && initialData.weight) weightInputRow.value = initialData.weight;
      }

      bindRowEvents(row);
      refreshTitles();
      syncAggregates();
    }

    addBtn.addEventListener("click", function () {
      addRow(null);
    });

    addRow({
      type: "thuong",
      name: "",
      quantity: 1,
      weight: toNumber(weightInput.value, 1) || 1,
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCorporateFields();
    initAddressModal();
    initLocationSelectors();
    initOrderModeAndService();
    initPaymentMethod();
    initCargoItems();
  });
})(window, document);
