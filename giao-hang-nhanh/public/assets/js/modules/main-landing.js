(function (window, document) {
  if (window.__giaoHangNhanhLandingInitDone) return;
  window.__giaoHangNhanhLandingInitDone = true;

  const core = window.GiaoHangNhanhCore;
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
      if (q.dataset.faqReady === "1") return;
      q.dataset.faqReady = "1";

      q.addEventListener("click", () => {
        const item = q.closest(".faq-item");
        const isActive = item.classList.contains("active");

        // Close all other FAQ items
        document.querySelectorAll(".faq-item").forEach((i) => {
          i.classList.remove("active");
        });

        // Toggle current item
        if (!isActive) {
          item.classList.add("active");
        }
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
    const districtMap = Object.assign({}, cityMap);
    const defaultItemOptionsByType = {
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
      "mui-hoi": [
        "Mắm tôm/nước mắm đặc biệt",
        "Sầu riêng/chôm chôm",
        "Hải sản mắm",
        "Thực phẩm lên men (dưa cải, kim chi)",
        "Phân bón/chế phẩm sinh học",
        "Hóa chất có mùi đặc biệt",
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
    let itemOptionsByType = Object.assign({}, defaultItemOptionsByType);
    const measurementModeByType = {
      thuong: "volume",
      "gia-tri-cao": "weight",
      "de-vo": "volume",
      "mui-hoi": "weight",
      "chat-long": "weight",
      "pin-lithium": "weight",
      "dong-lanh": "volume",
      "cong-kenh": "volume",
    };
    const cityNameAliases = {
      "thua thien hue": ["hue"],
    };
    function resolveOrderFormConfigUrl() {
      if (typeof window === "undefined") return "public/data/form-dat-hang.json";
      if (window.GiaoHangNhanhCore?.publicBasePath) {
        return `${window.GiaoHangNhanhCore.publicBasePath}data/form-dat-hang.json`;
      }
      const path = String(window.location.pathname || "").replace(/\\/g, "/");
      const marker = "/giao-hang-nhanh/";
      const markerIndex = path.toLowerCase().lastIndexOf(marker);
      const projectBasePath =
        markerIndex !== -1
          ? path.slice(0, markerIndex + marker.length)
          : "/";
        return `${projectBasePath}public/data/form-dat-hang.json`;
      }

    function applyOrderFormConfig(config) {
      if (!config || typeof config !== "object") return;

      if (Array.isArray(config.loaihang) && config.loaihang.length) {
        itemOptionsByType = {};
        config.loaihang.forEach((type) => {
          if (!type || !type.key) return;
          itemOptionsByType[type.key] = Array.isArray((config.tenhangtheoloai || {})[type.key])
            ? config.tenhangtheoloai[type.key]
            : [];
        });

        const domesticTypeSelect = document.getElementById("domestic-item-type");
        if (domesticTypeSelect) {
          const current = domesticTypeSelect.value;
          domesticTypeSelect.innerHTML = '<option value="">Chọn loại hàng</option>';
          config.loaihang.forEach((type) => {
            const option = document.createElement("option");
            option.value = type.key;
            option.textContent = type.label || type.key;
            domesticTypeSelect.appendChild(option);
          });
          if (current && itemOptionsByType[current]) {
            domesticTypeSelect.value = current;
          }
        }
      }

      updateItemNameOptions(
        document.getElementById("domestic-item-type"),
        document.getElementById("domestic-item-name"),
      );
    }

    function loadOrderFormConfig() {
      if (typeof window.fetch !== "function") return Promise.resolve();
      return fetch(resolveOrderFormConfigUrl())
        .then((response) => {
          if (!response.ok) throw new Error("Cannot load order form config");
          return response.json();
        })
        .then((config) => {
          applyOrderFormConfig(config);
        })
        .catch((error) => {
          console.warn("Cannot load order form config:", error);
        });
    }

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

    function getMoney(id) {
      // Lấy giá trị chuỗi, loại bỏ dấu chấm và chuyển thành số
      const rawVal = getValue(id).replace(/\./g, "");
      const num = parseInt(rawVal, 10);
      if (!Number.isFinite(num) || num < 0) return 0;
      return num;
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
      summaryNote = "",
      explanation = [],
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
          const weightSizeFee =
            (breakdown.overweightFee || 0) + (breakdown.volumeFee || 0);
          const goodsGroupFee =
            (breakdown.goodsFee || 0) + (breakdown.insuranceFee || 0);
          const serviceGroupFee =
            (breakdown.timeFee || 0) +
            (breakdown.conditionFee || 0) +
            (breakdown.codFee || 0);
          const domesticFeeList = `
            <li>① Phí vận chuyển: <strong>${formatVnd(breakdown.basePrice || 0)}</strong></li>
            <li>② Phí trọng lượng & kích thước: <strong>${formatVnd(weightSizeFee)}</strong></li>
            <li>③ Phụ phí hàng hóa: <strong>${formatVnd(goodsGroupFee)}</strong></li>
            <li>④ Phụ phí dịch vụ: <strong>${formatVnd(serviceGroupFee)}</strong></li>
            <li>⑤ Phí phương tiện: <strong>${formatVnd(breakdown.vehicleFee || 0)}</strong></li>
          `;

          return `
            <article class="quote-card quote-package-item ${index === 0 ? "is-best" : ""}">
              <div class="quote-package-head">
                <h4>${escapeHtml(service.serviceName || "Gói cước")}</h4>
                ${index === 0 ? '<span class="quote-badge">Giá tốt nhất</span>' : ""}
              </div>
              <p class="quote-service-eta">⏱ Thời gian dự kiến: <strong>${escapeHtml(service.estimate || "Đang cập nhật")}</strong></p>
              <p class="quote-service-eta">🚚 Phương tiện gợi ý khi đặt đơn: <strong>${escapeHtml(service.vehicleSuggestion || "Đang cập nhật")}</strong></p>
              <p class="quote-breakdown-title">Chi tiết tính cước tham khảo:</p>
              <ul class="quote-breakdown-list">
                ${domesticFeeList}
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

      let explanationHtml = "";
      if (Array.isArray(explanation) && explanation.length > 0) {
        const stepItems = explanation
          .filter(s => s.title)
          .map(s => `
            <li class="pricing-step">
              <div class="pricing-step-header">
                ${s.step ? `<span class="pricing-step-num">${s.step}</span>` : '<span class="pricing-step-sub">↳</span>'}
                <strong>${escapeHtml(s.title)}</strong>
              </div>
              <div class="pricing-step-detail">${s.detail || ""}</div>
              ${s.formula ? `<div class="pricing-step-formula">${s.formula}</div>` : ""}
            </li>
          `).join("");
        explanationHtml = `
          <details class="pricing-explanation" open>
            <summary class="pricing-explanation-title">📐 Xem cách tính chi tiết (từng bước)</summary>
            <ol class="pricing-step-list">${stepItems}</ol>
            <p class="pricing-explanation-note">💡 Trên đây là cách hệ thống tính cước minh bạch. Giá chỉ mang tính tham khảo, có thể thay đổi nhỏ theo thực tế.</p>
          </details>
        `;
      }

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
          ${explanationHtml}
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
        syncMeasurementInputsByMode("domestic");
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
      const selectedMode = "domestic";
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
    bindTypeAndItemName("domestic-item-type", "domestic-item-name");
    loadOrderFormConfig();
    loadAccurateDistrictData();
    setActiveMode(modeInput && modeInput.value ? modeInput.value : "domestic");
    function initCurrencyInputs() {
      const currencyInputs = document.querySelectorAll(".input-currency");
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

    quickQuoteForm.addEventListener("submit", function (e) {
      e.preventDefault();
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
        codValue: getMoney("domestic-cod"),
        insuranceValue: getMoney("domestic-insurance"),
        vehicleType: "auto",
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
      if (!hasValidMeasurements(payload)) {
        renderError(getMeasurementValidationMessage("nội địa"));
        return;
      }
      if (typeof window.calculateDomesticQuote !== "function") {
        renderError("Không tải được cấu hình giá trong nước.");
        return;
      }

      const result = window.calculateDomesticQuote(payload, {
        includeTimeFee: false,
        includeVehicleFee: false,
      });
      const domesticCheapestService = result && Array.isArray(result.services) ? result.services[0] : null;
      const pricingExplanation = (typeof window.buildDomesticPricingExplanation === "function")
        ? window.buildDomesticPricingExplanation(payload, result, {
          includeTimeFee: false,
          includeVehicleFee: false,
        })
        : [];

      const summaryMetrics = [
        {
          icon: "📍",
          label: "Tuyến",
          value: `${payload.fromCity} - ${payload.fromDistrict} → ${payload.toCity} - ${payload.toDistrict}`,
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
          label: "Khối lượng tính cước",
          value: `${String(result.billableWeight)} kg`,
        },
        {
          icon: "🔢",
          label: "Số lượng",
          value: `${payload.quantity} kiện`,
        },
        {
          icon: "🚚",
          label: "Xe gợi ý",
          value: (domesticCheapestService && domesticCheapestService.vehicleSuggestion) || "Đang cập nhật",
        },
      ];
      renderQuoteCards(
        `Hàng hóa: ${payload.itemName}`,
        `Bảng giá vận chuyển nội địa — ${result.zoneLabel || ""}`,
        summaryMetrics,
        result.services,
        `Giá tham khảo nhanh đang bám theo 5 nhóm phí: phí vận chuyển + phí trọng lượng & kích thước + phụ phí hàng hóa + phụ phí dịch vụ + phí phương tiện. Ở bước tra nhanh này hệ thống chưa cộng phụ phí dịch vụ và phí phương tiện; khi sang bước đặt lịch, cả 4 gói đều sẽ được đối chiếu cùng một logic phụ phí theo khung giờ, điều kiện giao và loại xe bạn chọn.`,
        pricingExplanation,
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
      window.setTimeout(() => {
        msgDiv.style.display = "block";
        msgDiv.innerText =
          "Yêu cầu của bạn đã được ghi nhận trong chế độ local. Nhóm sẽ nối API mới sau.";
        msgDiv.style.color = "green";
        inquiryForm.reset();
        btn.innerText = originalText;
        btn.disabled = false;
      }, 350);
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
          core.showToast(
            "⚠️ Bắt buộc: Vui lòng chụp/tải lên ảnh bằng chứng giao hàng (POD) để hoàn tất đơn hàng.",
            "warning"
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
  onReady(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });
  document.addEventListener("ghn:landing-faq-updated", initFaqAccordion);
  initHeroAnimation();
})(window, document);
