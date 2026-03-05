(function (window, document) {
  if (window.__fastGoLandingInitDone) return;
  window.__fastGoLandingInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function initFaqAccordion() {
    document.querySelectorAll(".faq-question").forEach((q) => {
      q.addEventListener("click", () => {
        const ans = q.nextElementSibling;
        const isVisible = ans.style.display === "block";
        document
          .querySelectorAll(".faq-answer")
          .forEach((a) => (a.style.display = "none"));
        ans.style.display = isVisible ? "none" : "block";
      });
    });
  }

  function initQuickQuoteForm() {
    const quickQuoteForm = document.getElementById("quick-quote-form");
    if (!quickQuoteForm) return;
    const resultDiv = document.getElementById("quote-result");
    const modeInput = document.getElementById("quote-mode");
    const modeButtons = Array.from(
      quickQuoteForm.querySelectorAll(".quote-mode-btn[data-quote-mode]"),
    );
    const modePanels = Array.from(
      quickQuoteForm.querySelectorAll(".quote-panel[data-mode-panel]"),
    );
    const quoteData = window.QUOTE_SHIPPING_DATA || {};
    const cityMap = quoteData.cities || {};
    const domesticCities =
      (quoteData.domestic && quoteData.domestic.cityOptions) || Object.keys(cityMap);
    const intlCountries =
      (quoteData.international && quoteData.international.countries) || [];
    const intlDestinationRegions =
      (quoteData.international && quoteData.international.destinationRegions) || {};
    const defaultIntlDestinationRegions =
      (quoteData.international &&
        quoteData.international.defaultDestinationRegions) ||
      [];
    const districtMap = Object.assign({}, cityMap);
    const itemOptionsByType = {
      thuong: [
        "Quần áo/vải vóc",
        "Giày dép/túi xách",
        "Sách vở/văn phòng phẩm",
        "Đồ chơi nhựa",
        "Đồ gia dụng nhựa/inox",
        "Phụ kiện điện tử đơn giản",
      ],
      "gia-tri-cao": [
        "Điện thoại/máy tính bảng",
        "Laptop/máy ảnh",
        "Đồng hồ thông minh/tai nghe cao cấp",
        "Mỹ phẩm chính hãng",
        "Nước hoa",
        "Trang sức/đá quý",
      ],
      "de-vo": [
        "Đồ gốm sứ/chén dĩa",
        "Bình thủy tinh",
        "Màn hình TV/máy tính",
        "Gương soi",
        "Tượng đá/đồ thủ công mỹ nghệ",
        "Đèn trang trí/đèn chùm",
      ],
      "chat-long": [
        "Dầu ăn/nước mắm",
        "Mật ong/rượu vang",
        "Sữa nước/đồ uống đóng chai",
        "Hóa chất công nghiệp/sơn/dung môi",
        "Dầu nhớt",
        "Nước hoa",
      ],
      "pin-lithium": [
        "Sạc dự phòng",
        "Pin xe máy điện",
        "Xe điện",
        "Quạt tích điện",
        "Đèn pin",
      ],
      "dong-lanh": [
        "Thịt/cá/hải sản tươi sống",
        "Thực phẩm đông lạnh",
        "Rau củ/trái cây tươi",
        "Vaccine cần bảo quản lạnh",
        "Dược phẩm cần bảo quản lạnh",
      ],
      "cong-kenh": [
        "Sofa/tủ quần áo/giường gỗ",
        "Lốp xe tải",
        "Máy móc công trình",
        "Bồn nước inox",
        "Cuộn cáp điện lớn",
      ],
    };
    const measurementModeByType = {
      thuong: "volume",
      "gia-tri-cao": "weight",
      "de-vo": "volume",
      "chat-long": "weight",
      "pin-lithium": "weight",
      "dong-lanh": "volume",
      "cong-kenh": "volume",
    };
    const cityNameAliases = {
      "thua thien hue": ["hue"],
    };

    function escapeHtml(text) {
      if (core && typeof core.escapeHtml === "function") return core.escapeHtml(text);
      if (text === null || text === undefined) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function formatVnd(value) {
      return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
    }

    function getValue(id) {
      const el = document.getElementById(id);
      return el ? el.value.trim() : "";
    }

    function getNumber(id) {
      const raw = parseFloat(getValue(id));
      if (!Number.isFinite(raw) || raw < 0) return 0;
      return raw;
    }

    function getInteger(id, fallback = 0) {
      const raw = parseInt(getValue(id), 10);
      if (!Number.isFinite(raw) || raw <= 0) return fallback;
      return raw;
    }

    function getSelectedText(id) {
      const el = document.getElementById(id);
      if (!el || !el.options || el.selectedIndex < 0) return "";
      return el.options[el.selectedIndex].text.trim();
    }

    function renderError(message) {
      if (!resultDiv) return;
      resultDiv.innerHTML = `
        <div class="quote-error">
          <p><strong>Lỗi:</strong> ${escapeHtml(message)}</p>
        </div>
      `;
      resultDiv.classList.add("show");
    }

    function renderQuoteCards(
      title,
      subtitle,
      summaryMetrics,
      services,
      mode,
      summaryNote = "",
    ) {
      if (!resultDiv) return;
      if (!Array.isArray(services) || !services.length) {
        renderError("Không tìm thấy bảng giá phù hợp với thông tin đã nhập.");
        return;
      }

      const cheapest = services[0];
      const cardsHtml = services
        .map((service, index) => {
          const breakdown = service.breakdown || {};
          const domesticFeeList = `
            <li>Cước cơ bản: <strong>${formatVnd(breakdown.basePrice || 0)}</strong></li>
            <li>Phí khối lượng: <strong>${formatVnd(breakdown.weightFee || 0)}</strong></li>
            ${breakdown.goodsFee > 0 ? `<li>Phụ phí loại hàng: <strong>${formatVnd(breakdown.goodsFee)}</strong></li>` : ""}
            ${breakdown.codFee > 0 ? `<li>Phí COD: <strong>${formatVnd(breakdown.codFee)}</strong></li>` : ""}
            ${breakdown.insuranceFee > 0 ? `<li>Phí bảo hiểm: <strong>${formatVnd(breakdown.insuranceFee)}</strong></li>` : ""}
          `;
          const intlFeeList = `
            <li>Cước cơ bản: <strong>${formatVnd(breakdown.basePrice || 0)}</strong></li>
            <li>Phí khối lượng: <strong>${formatVnd(breakdown.weightFee || 0)}</strong></li>
            ${breakdown.goodsAdjustedFee > 0 ? `<li>Phụ phí loại hàng: <strong>${formatVnd(breakdown.goodsAdjustedFee)}</strong></li>` : ""}
            <li>Phụ phí nhiên liệu: <strong>${formatVnd(breakdown.fuelFee || 0)}</strong></li>
            <li>Phí khai quan: <strong>${formatVnd(breakdown.customsFee || 0)}</strong></li>
            <li>Phí an ninh: <strong>${formatVnd(breakdown.securityFee || 0)}</strong></li>
            ${breakdown.insuranceFee > 0 ? `<li>Phí bảo hiểm: <strong>${formatVnd(breakdown.insuranceFee)}</strong></li>` : ""}
          `;

          return `
            <article class="quote-card quote-package-item ${index === 0 ? "is-best" : ""}">
              <div class="quote-package-head">
                <h4>${escapeHtml(service.serviceName || "Gói cước")}</h4>
                ${index === 0 ? '<span class="quote-badge">Giá tốt nhất</span>' : ""}
              </div>
              <p class="quote-service-eta">Thời gian dự kiến: <strong>${escapeHtml(service.estimate || "Đang cập nhật")}</strong></p>
              <p class="quote-service-eta">Phương tiện đề xuất: <strong>${escapeHtml(service.vehicleSuggestion || "Đang cập nhật")}</strong></p>
              <ul class="quote-breakdown-list">
                ${mode === "domestic" ? domesticFeeList : intlFeeList}
              </ul>
              <p class="quote-service-total">Tổng cước: <strong>${formatVnd(service.total || 0)}</strong></p>
            </article>
          `;
        })
        .join("");
      const metricsHtml = (Array.isArray(summaryMetrics) ? summaryMetrics : [])
        .map(
          (metric) => `
            <article class="quote-infobar-item">
              <span class="quote-infobar-icon" aria-hidden="true">${escapeHtml(metric.icon || "")}</span>
              <div class="quote-infobar-text">
                <span class="quote-infobar-label">${escapeHtml(metric.label || "")}</span>
                <span class="quote-infobar-value">${escapeHtml(metric.value || "")}</span>
              </div>
            </article>
          `,
        )
        .join("");

      resultDiv.innerHTML = `
        <div class="quote-success">
          <div class="quote-total">
            <div>Cước tham khảo thấp nhất</div>
            <div style="font-size: 28px; font-weight: 800;">${formatVnd(cheapest.total || 0)}</div>
          </div>
          <p style="margin-bottom: 8px;"><strong>${escapeHtml(title)}</strong></p>
          <p style="margin-bottom: 12px; color: #4d5b7c;">${escapeHtml(subtitle)}</p>
          <section class="quote-infobar">
            ${metricsHtml}
          </section>
          ${summaryNote ? `<p class="quote-infobar-note">${escapeHtml(summaryNote)}</p>` : ""}
          <div class="quote-package-list">
            ${cardsHtml}
          </div>
        </div>
      `;
      resultDiv.classList.add("show");
    }

    function fillSelectOptions(selectEl, values, placeholderText) {
      if (!selectEl) return;
      const current = selectEl.value;
      const options = Array.isArray(values) ? values : [];
      selectEl.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = placeholderText;
      selectEl.appendChild(placeholder);

      options.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        selectEl.appendChild(option);
      });

      if (current && options.includes(current)) {
        selectEl.value = current;
      } else {
        selectEl.value = "";
      }
    }

    function normalizeCityName(cityName) {
      return String(cityName || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\b(tinh|thanh pho|tp)\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function getDistrictsByCity(cityName) {
      const districts = districtMap[cityName];
      return Array.isArray(districts) && districts.length ? districts : [];
    }

    function updateItemNameOptions(typeSelect, itemSelect) {
      if (!typeSelect || !itemSelect) return;
      const itemType = typeSelect.value;
      const options = itemOptionsByType[itemType] || [];
      const current = itemSelect.value;
      itemSelect.innerHTML = "";

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = itemType ? "Chọn tên hàng" : "Chọn loại hàng trước";
      itemSelect.appendChild(placeholder);

      options.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        itemSelect.appendChild(option);
      });

      if (current && options.includes(current)) {
        itemSelect.value = current;
      } else {
        itemSelect.value = "";
      }
      itemSelect.disabled = !itemType;
    }

    function getMeasurementModeByType(itemType) {
      const mode = measurementModeByType[itemType];
      return mode === "weight" || mode === "volume" ? mode : "both";
    }

    function getMeasurementModeLabel(measurementMode) {
      if (measurementMode === "weight") return "Ưu tiên theo khối lượng";
      if (measurementMode === "volume") return "Ưu tiên theo thể tích";
      return "Tính theo khối lượng/thể tích";
    }

    function hasValidMeasurements(payload) {
      const hasWeight = payload.weight > 0;
      const hasVolume = payload.length > 0 && payload.width > 0 && payload.height > 0;
      return hasWeight || hasVolume;
    }

    function getMeasurementValidationMessage(context) {
      return `Vui lòng nhập khối lượng hoặc đầy đủ kích thước (dài/rộng/cao) cho hàng ${context}.`;
    }

    function setMeasurementGroupState(groupId, visible, isActivePanel) {
      const group = document.getElementById(groupId);
      if (!group) return;
      group.style.display = visible ? "" : "none";

      const field = group.querySelector("input");
      if (!field) return;
      field.disabled = !isActivePanel || !visible;
    }

    function applyMeasurementLayout(prefix, measurementMode, isActivePanel) {
      // Hiển thị cả 2 nhóm input để tính theo luật max(thực cân, thể tích).
      const showWeight = true;
      const showVolume = true;
      setMeasurementGroupState(`${prefix}-weight-group`, showWeight, isActivePanel);
      setMeasurementGroupState(`${prefix}-length-group`, showVolume, isActivePanel);
      setMeasurementGroupState(`${prefix}-width-group`, showVolume, isActivePanel);
      setMeasurementGroupState(`${prefix}-height-group`, showVolume, isActivePanel);
    }

    function syncMeasurementInputsByMode(activeMode) {
      const mappings = [
        { mode: "domestic", typeId: "domestic-item-type", prefix: "domestic" },
        { mode: "international", typeId: "intl-item-type", prefix: "intl" },
      ];

      mappings.forEach(({ mode, typeId, prefix }) => {
        const typeSelect = document.getElementById(typeId);
        const measurementMode = getMeasurementModeByType(typeSelect ? typeSelect.value : "");
        applyMeasurementLayout(prefix, measurementMode, mode === activeMode);
      });
    }

    function bindTypeAndItemName(typeId, itemId) {
      const typeSelect = document.getElementById(typeId);
      const itemSelect = document.getElementById(itemId);
      if (!typeSelect || !itemSelect) return;
      typeSelect.addEventListener("change", () => {
        updateItemNameOptions(typeSelect, itemSelect);
        const activeMode =
          modeInput && modeInput.value === "international" ? "international" : "domestic";
        syncMeasurementInputsByMode(activeMode);
      });
      updateItemNameOptions(typeSelect, itemSelect);
    }

    function syncItemSelectByMode(activeMode) {
      const mappings = [
        {
          mode: "domestic",
          typeId: "domestic-item-type",
          itemId: "domestic-item-name",
        },
        {
          mode: "international",
          typeId: "intl-item-type",
          itemId: "intl-item-name",
        },
      ];

      mappings.forEach(({ mode, typeId, itemId }) => {
        const typeSelect = document.getElementById(typeId);
        const itemSelect = document.getElementById(itemId);
        if (!typeSelect || !itemSelect) return;
        updateItemNameOptions(typeSelect, itemSelect);
        if (mode !== activeMode) {
          itemSelect.disabled = true;
        }
      });
    }

    function refreshDistrictOptions() {
      [
        ["domestic-from-city", "domestic-from-district"],
        ["domestic-to-city", "domestic-to-district"],
        ["intl-origin-city", "intl-origin-district"],
      ].forEach(([cityId, districtId]) => {
        const citySelect = document.getElementById(cityId);
        const districtSelect = document.getElementById(districtId);
        if (!citySelect || !districtSelect) return;
        updateDistricts(citySelect, districtSelect);
      });
    }

    function loadAccurateDistrictData() {
      if (typeof window.fetch !== "function") return;

      fetch("https://provinces.open-api.vn/api/?depth=2")
        .then((response) => {
          if (!response.ok) throw new Error("Cannot fetch district data");
          return response.json();
        })
        .then((provinces) => {
          if (!Array.isArray(provinces) || !provinces.length) return;

          const apiProvinceByName = {};
          provinces.forEach((province) => {
            const key = normalizeCityName(province && province.name);
            if (key) apiProvinceByName[key] = province;
          });

          let hasChanged = false;
          domesticCities.forEach((city) => {
            const normalizedCity = normalizeCityName(city);
            const lookupKeys = [normalizedCity, ...(cityNameAliases[normalizedCity] || [])];
            const province = lookupKeys
              .map((key) => apiProvinceByName[key])
              .find((value) => Boolean(value));
            if (!province || !Array.isArray(province.districts)) return;
            const districts = province.districts
              .map((district) => String(district && district.name ? district.name : "").trim())
              .filter(Boolean);
            if (!districts.length) return;
            districtMap[city] = districts;
            hasChanged = true;
          });

          if (hasChanged) {
            refreshDistrictOptions();
          }
        })
        .catch((error) => {
          console.warn("Cannot load accurate district list:", error);
        });
    }

    function initLocationOptions() {
      fillSelectOptions(
        document.getElementById("domestic-from-city"),
        domesticCities,
        "Chọn tỉnh/thành phố",
      );
      fillSelectOptions(
        document.getElementById("domestic-to-city"),
        domesticCities,
        "Chọn tỉnh/thành phố",
      );
      fillSelectOptions(
        document.getElementById("intl-origin-city"),
        domesticCities,
        "Chọn tỉnh/thành phố",
      );
      fillSelectOptions(
        document.getElementById("intl-country"),
        intlCountries,
        "Chọn quốc gia",
      );
    }

    function updateIntlProvinceOptions() {
      const countrySelect = document.getElementById("intl-country");
      const provinceSelect = document.getElementById("intl-province");
      if (!countrySelect || !provinceSelect) return;
      const country = countrySelect.value;
      if (!country) {
        fillSelectOptions(provinceSelect, [], "Chọn tỉnh/thành phố đến");
        return;
      }
      const regions =
        intlDestinationRegions[country] && intlDestinationRegions[country].length
          ? intlDestinationRegions[country]
          : defaultIntlDestinationRegions;
      fillSelectOptions(provinceSelect, regions, "Chọn tỉnh/thành phố đến");
    }

    function updateDistricts(citySelect, districtSelect) {
      if (!citySelect || !districtSelect) return;
      const city = citySelect.value;
      const districts = getDistrictsByCity(city);
      const current = districtSelect.value;
      const hasCity = Boolean(city);
      const hasDistrictData = districts.length > 0;
      districtSelect.disabled = !hasCity || !hasDistrictData;
      if (!hasCity) {
        districtSelect.innerHTML = '<option value="">Chọn tỉnh/thành phố trước</option>';
        return;
      }
      if (!hasDistrictData) {
        districtSelect.innerHTML =
          '<option value="">Chưa có dữ liệu quận/huyện cho tỉnh/thành này</option>';
        return;
      }
      districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
      districts.forEach((district) => {
        const opt = document.createElement("option");
        opt.value = district;
        opt.textContent = district;
        districtSelect.appendChild(opt);
      });
      if (districts.includes(current)) {
        districtSelect.value = current;
      }
    }

    function bindCityDistrict(cityId, districtId) {
      const citySelect = document.getElementById(cityId);
      const districtSelect = document.getElementById(districtId);
      if (!citySelect || !districtSelect) return;
      citySelect.addEventListener("change", () => {
        updateDistricts(citySelect, districtSelect);
      });
      updateDistricts(citySelect, districtSelect);
    }

    function setActiveMode(mode) {
      const selectedMode = mode === "international" ? "international" : "domestic";
      if (modeInput) modeInput.value = selectedMode;

      modeButtons.forEach((btn) => {
        const active = btn.dataset.quoteMode === selectedMode;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });

      modePanels.forEach((panel) => {
        const active = panel.dataset.modePanel === selectedMode;
        panel.classList.toggle("is-hidden", !active);
        panel.querySelectorAll("input, select, textarea").forEach((field) => {
          if (field.id === "intl-origin-country") {
            field.readOnly = true;
            field.disabled = false;
            return;
          }
          field.disabled = !active;
        });
      });
      refreshDistrictOptions();
      syncItemSelectByMode(selectedMode);
      syncMeasurementInputsByMode(selectedMode);

      if (resultDiv) {
        resultDiv.classList.remove("show");
        resultDiv.innerHTML = "";
      }
    }

    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActiveMode(btn.dataset.quoteMode));
    });

    initLocationOptions();
    bindCityDistrict("domestic-from-city", "domestic-from-district");
    bindCityDistrict("domestic-to-city", "domestic-to-district");
    bindCityDistrict("intl-origin-city", "intl-origin-district");
    bindTypeAndItemName("domestic-item-type", "domestic-item-name");
    bindTypeAndItemName("intl-item-type", "intl-item-name");
    const intlCountrySelect = document.getElementById("intl-country");
    if (intlCountrySelect) {
      intlCountrySelect.addEventListener("change", updateIntlProvinceOptions);
    }
    updateIntlProvinceOptions();
    loadAccurateDistrictData();
    setActiveMode(modeInput && modeInput.value ? modeInput.value : "domestic");

    quickQuoteForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const mode = modeInput && modeInput.value === "international" ? "international" : "domestic";

      if (mode === "domestic") {
        const payload = {
          fromCity: getValue("domestic-from-city"),
          fromDistrict: getValue("domestic-from-district"),
          toCity: getValue("domestic-to-city"),
          toDistrict: getValue("domestic-to-district"),
          itemName: getValue("domestic-item-name"),
          itemType: getValue("domestic-item-type"),
          weight: getNumber("domestic-weight"),
          quantity: getInteger("domestic-quantity", 1),
          length: getNumber("domestic-length"),
          width: getNumber("domestic-width"),
          height: getNumber("domestic-height"),
          codValue: getNumber("domestic-cod"),
          insuranceValue: getNumber("domestic-insurance"),
        };

        if (!payload.fromCity || !payload.fromDistrict || !payload.toCity || !payload.toDistrict) {
          renderError("Vui lòng chọn đầy đủ thành phố/quận cho điểm gửi và điểm nhận.");
          return;
        }
        if (!payload.itemName || !payload.itemType) {
          renderError("Vui lòng chọn loại hàng và tên hàng.");
          return;
        }
        if (payload.quantity <= 0) {
          renderError("Vui lòng nhập số lượng kiện hợp lệ.");
          return;
        }
        const domesticMeasurementMode = getMeasurementModeByType(payload.itemType);
        if (!hasValidMeasurements(payload)) {
          renderError(getMeasurementValidationMessage("nội địa"));
          return;
        }
        if (typeof window.calculateDomesticQuote !== "function") {
          renderError("Không tải được cấu hình giá trong nước.");
          return;
        }

        const result = window.calculateDomesticQuote(payload);
        const domesticCheapestService = result && Array.isArray(result.services) ? result.services[0] : null;
        const summaryMetrics = [
          {
            icon: "📍",
            label: "Tuyến",
            value: `${payload.fromCity} - ${payload.fromDistrict} -> ${payload.toCity} - ${payload.toDistrict}`,
          },
          {
            icon: "📦",
            label: "Tên hàng",
            value: getSelectedText("domestic-item-name"),
          },
          {
            icon: "⚠️",
            label: "Loại hàng",
            value: getSelectedText("domestic-item-type"),
          },
          {
            icon: "⚖️",
            label: "Khối lượng",
            value: `${String(result.billableWeight)} kg`,
          },
          {
            icon: "🔢",
            label: "Số lượng",
            value: `${payload.quantity} kiện`,
          },
          {
            icon: "🚚",
            label: "Phương tiện",
            value: (domesticCheapestService && domesticCheapestService.vehicleSuggestion) || "Đang cập nhật",
          },
        ];

        renderQuoteCards(
          `Hàng hóa: ${payload.itemName}`,
          "Bảng giá hardcode JavaScript cho vận chuyển trong nước.",
          summaryMetrics,
          result.services,
          "domestic",
          `${getMeasurementModeLabel(domesticMeasurementMode)} | Vùng giá: ${result.zoneLabel || ""}`,
        );
        return;
      }

      const intlPayload = {
        originCountry: getValue("intl-origin-country") || "Việt Nam",
        originCity: getValue("intl-origin-city"),
        originDistrict: getValue("intl-origin-district"),
        country: getValue("intl-country"),
        destinationProvince: getValue("intl-province"),
        itemName: getValue("intl-item-name"),
        itemType: getValue("intl-item-type"),
        weight: getNumber("intl-weight"),
        quantity: getInteger("intl-quantity", 1),
        length: getNumber("intl-length"),
        width: getNumber("intl-width"),
        height: getNumber("intl-height"),
        insuranceValue: getNumber("intl-insurance"),
      };

      if (!intlPayload.originCity || !intlPayload.originDistrict) {
        renderError("Vui lòng chọn thành phố và quận/huyện gửi tại Việt Nam.");
        return;
      }
      if (
        !intlPayload.country ||
        !intlPayload.destinationProvince
      ) {
        renderError("Vui lòng nhập đủ thông tin quốc gia đến và tỉnh/thành.");
        return;
      }
      if (
        !intlPayload.itemName ||
        !intlPayload.itemType
      ) {
        renderError("Vui lòng chọn loại hàng và tên hàng quốc tế.");
        return;
      }
      if (intlPayload.quantity <= 0) {
        renderError("Vui lòng nhập số lượng kiện quốc tế hợp lệ.");
        return;
      }
      const intlMeasurementMode = getMeasurementModeByType(intlPayload.itemType);
      if (!hasValidMeasurements(intlPayload)) {
        renderError(getMeasurementValidationMessage("quốc tế"));
        return;
      }
      if (typeof window.calculateInternationalQuote !== "function") {
        renderError("Không tải được cấu hình giá quốc tế.");
        return;
      }

      const intlResult = window.calculateInternationalQuote(intlPayload);
      const internationalCheapestService = intlResult && Array.isArray(intlResult.services) ? intlResult.services[0] : null;
      const intlSummaryMetrics = [
        {
          icon: "📍",
          label: "Tuyến",
          value: `${intlPayload.originCountry} - ${intlPayload.originCity} - ${intlPayload.originDistrict} -> ${intlPayload.country} - ${intlPayload.destinationProvince}`,
        },
        {
          icon: "📦",
          label: "Tên hàng",
          value: getSelectedText("intl-item-name"),
        },
        {
          icon: "⚠️",
          label: "Loại hàng",
          value: getSelectedText("intl-item-type"),
        },
        {
          icon: "⚖️",
          label: "Khối lượng",
          value: `${String(intlResult.billableWeight)} kg`,
        },
        {
          icon: "🔢",
          label: "Số lượng",
          value: `${intlPayload.quantity} kiện`,
        },
        {
          icon: "🚚",
          label: "Phương tiện",
          value: (internationalCheapestService && internationalCheapestService.vehicleSuggestion) || "Đang cập nhật",
        },
      ];

      renderQuoteCards(
        `Hàng hóa quốc tế: ${intlPayload.itemName}`,
        "Bảng giá hardcode JavaScript cho vận chuyển quốc tế.",
        intlSummaryMetrics,
        intlResult.services,
        "international",
        `${getMeasurementModeLabel(intlMeasurementMode)} | Khu vực: ${intlResult.zoneLabel || ""}`,
      );
    });
  }

  function initHeroAnimation() {
    window.addEventListener("load", () => {
      const animatedElements = document.querySelectorAll(
        ".animate-top, .animate-bottom, .animate-right",
      );

      animatedElements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add("animate-show");
        }, index * 150);
      });
    });
  }

  function initInquiryForm() {
    const inquiryForm = document.getElementById("inquiry-form");
    if (!inquiryForm) return;

    inquiryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const btn = inquiryForm.querySelector("button");
      const msgDiv = document.getElementById("inquiry-message");
      const originalText = btn.innerText;

      btn.innerText = "Đang gửi...";
      btn.disabled = true;
      msgDiv.style.display = "none";

      const formData = new FormData(inquiryForm);

      fetch(core.toApiUrl("inquiry_ajax.php"), {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          msgDiv.style.display = "block";
          msgDiv.innerText = data.message;
          msgDiv.style.color = data.status === "success" ? "green" : "red";

          if (data.status === "success") {
            inquiryForm.reset();
          }
          btn.innerText = originalText;
          btn.disabled = false;
        })
        .catch((err) => {
          console.error(err);
          msgDiv.style.display = "block";
          msgDiv.innerText = "Lỗi kết nối. Vui lòng thử lại.";
          msgDiv.style.color = "red";
          btn.innerText = originalText;
          btn.disabled = false;
        });
    });
  }

  function initTestimonials() {
    if (!document.querySelector(".testimonial-slider")) return;
    if (typeof window.Swiper !== "function") return;

    new Swiper(".testimonial-slider", {
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      slidesPerView: 1,
      spaceBetween: 30,
      breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
    });
  }

  function initBackToTop() {
    const backToTopButton = document.getElementById("back-to-top-btn");
    if (!backToTopButton) return;

    function scrollFunction() {
      if (
        document.body.scrollTop > 200 ||
        document.documentElement.scrollTop > 200
      ) {
        backToTopButton.classList.add("show");
      } else {
        backToTopButton.classList.remove("show");
      }
    }

    window.addEventListener("scroll", scrollFunction);
    scrollFunction();

    backToTopButton.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  function initShipperPodValidation() {
    document.addEventListener("submit", function (e) {
      const form = e.target;
      const podInput = form.querySelector("input[type='file'][name='pod_image']");
      const statusSelect = form.querySelector("select[name='status']");

      if (podInput && statusSelect && statusSelect.value === "completed") {
        const hasExisting = form.querySelector("img[src*='uploads/']");
        if (podInput.files.length === 0 && !hasExisting) {
          e.preventDefault();
          alert(
            "⚠️ Bắt buộc: Vui lòng chụp/tải lên ảnh bằng chứng giao hàng (POD) để hoàn tất đơn hàng.",
          );
          podInput.focus();
          podInput.classList.add("input-error");
        }
      }
    });
  }

  onReady(initFaqAccordion);
  onReady(initQuickQuoteForm);
  onReady(initInquiryForm);
  onReady(initTestimonials);
  onReady(initBackToTop);
  onReady(initShipperPodValidation);
  initHeroAnimation();
})(window, document);
