/**
 * pricing-data/render.js
 * Chỉ lo phần render demo/landing của bảng giá:
 * - đổ nội dung từ pricing-data.json vào HTML tĩnh
 * - dựng ví dụ minh họa và bảng giá trên landing / tra cứu giá
 *
 * Liên quan trực tiếp:
 * - pricing-data.js: bootstrap, nạp file này sau core.js
 * - pricing-data/core.js: cung cấp SHIPPING_DATA, QUOTE_SHIPPING_DATA,
 *   loadPricingDataSync(), calculateDomesticQuote(...)
 */
function renderDynamicData(data) {
  if (typeof document === "undefined") return;

  function render() {
    const qsd = window.QUOTE_SHIPPING_DATA || QUOTE_SHIPPING_DATA || {};
    const domesticData = qsd.domestic || {};
    const services = domesticData.services || {};
    const pricingContent = data.noi_dung_bang_gia || {};

    const formatCurrency = (value) => {
      if (typeof value !== "number") return value;
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(value);
    };
    const formatMoney = (value) =>
      `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
    const formatDistance = (value) => {
      const distance = Number(value) || 0;
      if (!distance) return "";
      return Number.isInteger(distance)
        ? `${distance.toLocaleString("vi-VN")}km`
        : `${distance.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })}km`;
    };
    const formatKg = (value) =>
      `${Number(value || 0).toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}kg`;
    const formatPercent = (value) =>
      `${(Number(value || 0) * 100).toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}%`;
    const renderParagraphGroup = (elementId, paragraphs) => {
      const target = document.getElementById(elementId);
      if (!target || !Array.isArray(paragraphs) || !paragraphs.length) return;
      target.innerHTML = paragraphs.map((item) => `<p>${item}</p>`).join("");
    };
    const renderListGroup = (elementId, items) => {
      const target = document.getElementById(elementId);
      if (!target || !Array.isArray(items) || !items.length) return;
      target.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
    };
    const resolveScenarioService = (scenario, options) => {
      if (
        !scenario ||
        !scenario.payload ||
        typeof calculateDomesticQuote !== "function"
      ) {
        return null;
      }
      const result = calculateDomesticQuote(scenario.payload, options);
      const service = (result.services || []).find(
        (item) => item.serviceType === scenario.service_type,
      );
      if (!service) return null;
      return { result, service };
    };
    const distanceConfig = domesticData.distanceConfig || {};
    const baseIncludedWeight =
      toPositiveNumber(distanceConfig.base_included_weight) ||
      toPositiveNumber(domesticData.baseIncludedWeight) ||
      2;
    const serviceLabelFallbacks = {
      standard: "standard",
      fast: "fast",
      express: "express",
      instant: "instant",
    };
    const serviceDisplayOrder = ["instant", "express", "fast", "standard"];
    const getServiceLabel = (serviceType, fallback = "") =>
      String(
        services?.[serviceType]?.label ||
          fallback ||
          serviceLabelFallbacks[serviceType] ||
          serviceType ||
          "",
      ).trim();
    const replaceServiceNameForType = (text, serviceType) => {
      const label = getServiceLabel(serviceType);
      if (!text || !label) return text;
      const aliasPatterns = {
        standard: [/Gói\s+Tiêu\s+chuẩn/gi, /Tiêu\s+Chuẩn/gi, /Tiêu\s+chuẩn/gi],
        fast: [/Gói\s+Nhanh/gi, /Giao\s+Nhanh/gi, /Giao\s+nhanh/gi],
        express: [/Gói\s+Hỏa\s+tốc/gi, /Hỏa\s*Tốc/gi, /Hỏa\s*tốc/gi],
        instant: [
          /Giao\s+hàng\s+ngay\s+lập\s+tức/gi,
          /Giao\s+Ngay\s+Lập\s+Tức/gi,
          /Giao\s+ngay\s+lập\s+tức/gi,
          /Giao\s+Ngay/gi,
          /Giao\s+ngay/gi,
          /Ngay\s+lập\s+tức/gi,
        ],
      };
      const sourceText = String(text);
      for (const pattern of aliasPatterns[serviceType] || []) {
        const replacedText = sourceText.replace(pattern, label);
        if (replacedText !== sourceText) return replacedText;
      }
      return sourceText;
    };
    const replaceKnownServiceNames = (text) =>
      ["instant", "express", "fast", "standard"].reduce(
        (nextText, serviceType) => replaceServiceNameForType(nextText, serviceType),
        String(text || ""),
      );
    const getDynamicFinalNotes = (notes) => {
      if (!Array.isArray(notes)) return notes;
      const orderedLabels = serviceDisplayOrder
        .map((serviceType) => getServiceLabel(serviceType))
        .filter(Boolean)
        .join(" → ");
      return notes.map((note) => {
        const text = String(note || "");
        if (text.includes("4 ví dụ") && text.includes("→") && orderedLabels) {
          return `<strong>4 ví dụ trên</strong> lần lượt đi theo đúng thứ tự: <strong>${orderedLabels}</strong>, để bạn đối chiếu nhanh từ gói khẩn cấp nhất đến gói tiết kiệm nhất. Đây vẫn là giá tham khảo để bạn ra quyết định nhanh trước khi tạo đơn.`;
        }
        return replaceKnownServiceNames(text);
      }).concat([
        "Nếu một đơn có nhiều dòng hàng khác loại, hệ thống sẽ cộng phụ phí loại hàng theo <strong>từng dòng</strong>, không lấy một loại đại diện cho toàn đơn.",
        "<strong>Khai giá dòng hàng</strong> là giá trị của cả dòng hàng; hệ thống cộng tổng khai giá của các dòng để tính bảo hiểm và <strong>không tự nhân thêm theo số kiện</strong>.",
      ]);
    };
    const buildFinalExampleTitle = (example, service) => {
      const serviceType = example?.service_type || service?.serviceType || "";
      const serviceLabel =
        service?.serviceName || getServiceLabel(serviceType, "Dịch vụ");
      const rawTitle = String(example?.title || "").trim();
      if (!rawTitle) return `Ví dụ: ${serviceLabel}`;
      const prefixMatch = rawTitle.match(/^(Ví dụ(?:\s+\d+)?\s*:)\s*/i);
      if (prefixMatch) return `${prefixMatch[1]} ${serviceLabel}`;
      return replaceServiceNameForType(rawTitle, serviceType);
    };

    const standardLabel = getServiceLabel("standard");
    const fastLabel = getServiceLabel("fast");
    const expressLabel = getServiceLabel("express");
    const instantLabel = getServiceLabel("instant");

    // 1. Bảng giá vùng (Fixed Price)
    const fixedTable = document.getElementById("pricing-fixed-table-body");
    if (fixedTable && services.standard && services.fast && services.express) {
      const baseTabDesc = fixedTable
        .closest(".pricing-tab-panel")
        ?.querySelector(".tab-desc");
      if (baseTabDesc) {
        baseTabDesc.innerHTML = `
          Phí vận chuyển tùy thuộc vào
          <strong>Lộ trình & Gói cước</strong> bạn chọn. Các gói phổ thông
          sẽ có giá <strong>cố định theo Vùng</strong>, riêng gói
          <strong>${escapeHtml(instantLabel)}</strong> sẽ tính
          <strong>linh hoạt theo số Km</strong>.
        `;
      }
      const fixedTableElement = fixedTable.closest("table");
      const fixedHeaders = fixedTableElement?.querySelectorAll("thead th");
      if (fixedHeaders && fixedHeaders.length >= 4) {
        fixedHeaders[1].textContent = standardLabel;
        fixedHeaders[2].textContent = fastLabel;
        fixedHeaders[3].textContent = expressLabel;
      }
      const fixedSubtitle =
        fixedTableElement?.closest(".pricing-table-wrapper")
          ?.previousElementSibling;
      if (fixedSubtitle?.classList?.contains("table-subtitle")) {
        fixedSubtitle.textContent = `1. Giá cố định theo Vùng (${standardLabel}, ${fastLabel}, ${expressLabel})`;
      }
      fixedTable.innerHTML = `
                <tr>
                    <td><span class="zone-badge same-district">Nội quận/huyện</span></td>
                    <td><strong>${formatCurrency(services.standard.base.same_district)}</strong></td>
                    <td><strong>${formatCurrency(services.fast.base.same_district)}</strong></td>
                    <td><strong>${formatCurrency(services.express.base.same_district)}</strong></td>
                </tr>
                <tr>
                    <td><span class="zone-badge same-city">Nội thành (khác quận)</span></td>
                    <td><strong>${formatCurrency(services.standard.base.same_city)}</strong></td>
                    <td><strong>${formatCurrency(services.fast.base.same_city)}</strong></td>
                    <td><strong>${formatCurrency(services.express.base.same_city)}</strong></td>
                </tr>
                <tr>
                    <td><span class="zone-badge inter-city">Liên tỉnh</span></td>
                    <td><strong>${formatCurrency(services.standard.base.inter_city)}</strong></td>
                    <td><strong>${formatCurrency(services.fast.base.inter_city)}</strong></td>
                    <td><strong>${formatCurrency(services.express.base.inter_city)}</strong></td>
                </tr>
            `;
    }

    // 2. Bảng giá khoảng cách (Distance Price)
    const distanceTable = document.getElementById(
      "pricing-distance-table-body",
    );
    if (distanceTable && domesticData.distanceConfig) {
      const distanceSubtitle =
        distanceTable
          .closest(".pricing-table-wrapper")
          ?.previousElementSibling;
      if (distanceSubtitle?.classList?.contains("table-subtitle")) {
        distanceSubtitle.textContent = `2. Giá tính theo Km thực tế (Chỉ ${instantLabel})`;
      }
      const xeMay = lay_cau_hinh_xe_giao_ngay("xe_may");
      const cauHinhXeMay =
        typeof lay_cau_hinh_gia_xe_may_giao_ngay === "function"
          ? lay_cau_hinh_gia_xe_may_giao_ngay()
          : { don_gia_gan: 6500, nguong_xa: 20, don_gia_xa: 5000 };
      distanceTable.innerHTML = `
                <tr>
                    <td><span class="zone-badge same-district">Đến ${formatDistance(cauHinhXeMay.nguong_xa)}</span></td>
                    <td><strong>${formatMoney(cauHinhXeMay.don_gia_gan)} / km</strong></td>
                    <td>Áp dụng cho xe máy, đơn gọn và tối đa 50kg</td>
                </tr>
                <tr>
                    <td><span class="zone-badge same-city">Trên ${formatDistance(cauHinhXeMay.nguong_xa)}</span></td>
                    <td><strong>${formatMoney(cauHinhXeMay.don_gia_xa)} / km</strong></td>
                    <td>Giảm đơn giá để giữ bảng giá đơn giản và minh bạch</td>
                </tr>
                <tr>
                    <td><span class="zone-badge inter-city">Phí tối thiểu</span></td>
                    <td><strong>${formatMoney(xeMay.phi_toi_thieu || 10000)}</strong></td>
                    <td>Tổng tiền = max(phí tối thiểu, km × giá cơ bản × hệ số xe × hệ số xăng)</td>
                </tr>
            `;
    }

    // 3. Ghi chú công thức giao ngay
    const noteArea = document.getElementById("note-service-multipliers");
    if (noteArea && services.instant) {
      noteArea.innerHTML = `<p><strong>${escapeHtml(instantLabel)}</strong> đang áp dụng công thức: <strong>tổng tiền = max(phí tối thiểu, km × giá cơ bản × hệ số xe × hệ số xăng)</strong>. Hệ số xăng mặc định là <strong>x1</strong> và có thể điều chỉnh linh hoạt trong hệ thống quản trị khi cần cập nhật mặt bằng giá.</p>`;
    }

    // 4. Quy tắc khối lượng & kích thước
    const weightList = document.getElementById("pricing-weight-excess-list");
    if (weightList) {
      const gioiHanXeMay = lay_gioi_han_hang_hoa_xe_may();
      const weightSummary = document.getElementById("pricing-weight-summary");
      if (weightSummary) {
        weightSummary.innerHTML = `<strong>Không còn dùng trọng lượng thể tích</strong> để cộng phí. Trọng lượng và kích thước hiện dùng để gợi ý loại xe phù hợp.`;
      }
      weightList.innerHTML = `
                <li>Xe máy chỉ áp dụng cho đơn <strong>≤ ${formatKg(gioiHanXeMay.trong_luong_toi_da_kg)}</strong>.</li>
                <li>Chiều dài kiện hàng nên trong ngưỡng <strong>${gioiHanXeMay.chieu_dai_toi_da_cm}cm</strong>.</li>
                <li>Chiều rộng kiện hàng nên trong ngưỡng <strong>${gioiHanXeMay.chieu_rong_toi_da_cm}cm</strong>.</li>
                <li>Chiều cao kiện hàng nên trong ngưỡng <strong>${gioiHanXeMay.chieu_cao_toi_da_cm}cm</strong>.</li>
                <li>Nếu vượt ngưỡng, hệ thống sẽ gợi ý đổi sang xe 4 bánh phù hợp.</li>
            `;

      const weightExample = document.getElementById("pricing-weight-example");
      if (weightExample) {
        weightExample.innerHTML = `
          <strong>Ví dụ:</strong> đơn 35kg, kích thước gọn sẽ tiếp tục gợi ý <strong>xe máy</strong>.<br />
          Nếu đơn 70kg hoặc kiện dài vượt ngưỡng cho xe máy, hệ thống sẽ đổi sang <strong>xe 4 bánh nhỏ ≤ 500kg</strong> thay vì cộng thêm phí thể tích.
        `;
      }
    }

    // 5. Phụ phí hàng hóa (Goods Surcharge)
    const surchargeTable = document.getElementById(
      "pricing-goods-surcharge-body",
    );
    if (
      surchargeTable &&
      domesticData.goodsTypeFee &&
      domesticData.goodsTypeLabel &&
      domesticData.goodsTypeDescription
    ) {
      const {
        goodsTypeLabel,
        goodsTypeFee,
        goodsTypeDescription,
        goodsTypeMultiplier = {},
      } = domesticData;
      let html = "";
      for (const key in goodsTypeLabel) {
        const fee = goodsTypeFee[key] || 0;
        const multiplier = goodsTypeMultiplier[key] || 1;
        let feeText =
          fee > 0
            ? `<strong>+${fee.toLocaleString("vi-VN")}đ/kiện</strong>`
            : multiplier > 1
              ? `<strong>Hệ số ×${multiplier}</strong>`
              : `<strong class="price-zero">0đ</strong>`;
        html += `<tr class="${fee > 0 || multiplier > 1 ? "highlight-row" : ""}"><td>${goodsTypeLabel[key]}</td><td>${feeText}</td><td>${goodsTypeDescription[key] || ""}</td></tr>`;
      }
      surchargeTable.innerHTML = html;
    }

    const insuranceRules = document.getElementById("pricing-insurance-rules");
    const insuranceExample = document.getElementById("pricing-insurance-example");
    const insuranceConfig = domesticData.insurance || {};
    const insuranceThreshold =
      toPositiveNumber(insuranceConfig.freeThreshold) || 1000000;
    const insuranceRate = toPositiveNumber(insuranceConfig.rate) || 0.005;
    const insuranceMin =
      toPositiveNumber(insuranceConfig.minAboveThreshold) || 5000;
    if (insuranceRules) {
      insuranceRules.innerHTML = `
        <li>Miễn phí nếu giá trị khai báo ≤ <strong>${formatMoney(
          insuranceThreshold,
        )}</strong></li>
        <li>Phí: <strong>${formatPercent(insuranceRate)}</strong> giá trị khai báo</li>
        <li>Tối thiểu: <strong>${formatMoney(insuranceMin)}</strong></li>
        <li><strong>Khai giá dòng hàng</strong> là giá trị của cả dòng, không tự nhân thêm theo số kiện</li>
        <li>Hệ thống cộng tổng khai giá của các dòng để tính phí bảo hiểm</li>
        <li>Bồi thường 100% nếu mất hoặc hỏng theo mức khai báo hợp lệ</li>
      `;
    }
    if (insuranceExample) {
      const insuranceValue =
        toPositiveNumber(pricingContent.bao_hiem?.vi_du_gia_tri) || 3000000;
      const insuranceFee =
        insuranceValue > insuranceThreshold
          ? Math.max(insuranceValue * insuranceRate, insuranceMin)
          : 0;
      insuranceExample.innerHTML = `
        <strong>Ví dụ:</strong> Một dòng hàng khai giá ${formatMoney(insuranceValue)}<br />
        Phí bảo hiểm = ${formatPercent(insuranceRate)} × ${formatMoney(
          insuranceValue,
        )} = <strong>${formatMoney(insuranceFee)}</strong>
      `;
    }

    const serviceRules = pricingContent.phu_phi_dich_vu?.thoi_gian_thoi_tiet
      ?.ghi_chu || [
      "Tất cả 4 gói dịch vụ đều hiển thị và áp dụng <strong>phí thời gian</strong> và <strong>phí thời tiết</strong> dựa trên điều kiện thực tế lúc đặt đơn (Đêm khuya, giờ cao điểm, thời tiết xấu).",
      "Phụ phí được tính toán tự động và tách bạch để khách hàng dễ dàng kiểm soát tổng cước phí.",
    ];
    renderListGroup("pricing-service-rules", serviceRules);

    const serviceExample = document.getElementById("pricing-service-example");
    const serviceScenario =
      pricingContent.phu_phi_dich_vu?.thoi_gian_thoi_tiet?.vi_du;
    const serviceResolved = resolveScenarioService(serviceScenario, {
      includeTimeFee: true,
      includeVehicleFee: false,
    });
    if (serviceExample && serviceResolved) {
      const breakdown = serviceResolved.service.breakdown || {};
      const transportBeforeService =
        getTongGiaVanChuyen(breakdown) +
        (breakdown.weightFee || 0) +
        (breakdown.goodsFee || 0);
      const serviceExampleTitle = replaceServiceNameForType(
        serviceScenario.title || "Ví dụ phụ phí dịch vụ",
        serviceScenario.service_type,
      );
      serviceExample.innerHTML = `
        <strong>${escapeHtml(serviceExampleTitle)}</strong><br />
        Phần vận chuyển trước phụ phí: ${formatMoney(
          transportBeforeService,
        )}<br />
        ${escapeHtml(
          serviceResolved.service.timeSurchargeLabel || "Phí thời gian",
        )}: <strong>+${formatMoney(breakdown.timeFee)}</strong><br />
        ${escapeHtml(
          serviceResolved.service.serviceConditionLabel ||
            "Phí điều kiện giao",
        )}: <strong>+${formatMoney(breakdown.conditionFee)}</strong>
      `;
    }

    const codRules = document.getElementById("pricing-cod-rules");
    const codExample = document.getElementById("pricing-cod-example");
    const codConfig = domesticData.cod || {};
    const codThreshold = toPositiveNumber(codConfig.freeThreshold) || 1000000;
    const codRate = toPositiveNumber(codConfig.rate) || 0.012;
    const codMin = toPositiveNumber(codConfig.min) || 15000;
    if (codRules) {
      codRules.innerHTML = `
        <li>Miễn phí nếu giá trị thu hộ ≤ <strong>${formatMoney(
          codThreshold,
        )}</strong></li>
        <li>Phí: <strong>${formatPercent(codRate)}</strong> giá trị thu hộ</li>
        <li>Tối thiểu: <strong>${formatMoney(codMin)}</strong></li>
      `;
    }
    if (codExample) {
      const codValue =
        toPositiveNumber(pricingContent.phu_phi_dich_vu?.cod?.vi_du_gia_tri) ||
        2000000;
      const codFee =
        codValue > codThreshold ? Math.max(codValue * codRate, codMin) : 0;
      codExample.innerHTML = `
        <strong>Ví dụ:</strong> Thu hộ ${formatMoney(codValue)}<br />
        Phí COD = ${formatPercent(codRate)} × ${formatMoney(
          codValue,
        )} = <strong>${formatMoney(codFee)}</strong>
      `;
    }
    renderParagraphGroup(
      "pricing-service-note",
      pricingContent.phu_phi_dich_vu?.ghi_chu,
    );

    // 6. Bảng phương tiện (Vehicle Table)
    const vehicleTable = document.getElementById("pricing-vehicle-table-body");
    const vehicleCatalog = getDisplayVehicleCatalog(data);
    if (vehicleTable && vehicleCatalog.length) {
      vehicleTable.innerHTML = vehicleCatalog
        .map(
          (item) => `<tr class="${item.he_so_xe > 1 ? "highlight-row" : ""}">
              <td>${item.label}</td>
              <td><strong>×${item.he_so_xe.toFixed(2)}</strong></td>
              <td>${item.description || (item.he_so_xe > 1 ? `Phần vận chuyển tăng gấp ${item.he_so_xe} lần` : "Mức chuẩn, không cộng thêm")}</td>
            </tr>`,
        )
        .join("");
    }

    // 7. Ví dụ tính phí xe (Example)
    const exampleArea = document.getElementById("pricing-vehicle-example");
    if (exampleArea && data.vi_du_tinh_phi) {
      exampleArea.innerHTML = data.vi_du_tinh_phi;
    }
    renderParagraphGroup("pricing-vehicle-note", pricingContent.phi_xe?.ghi_chu);

    // 8. Bảng so sánh (Comparison)
    const compareTable = document.getElementById(
      "pricing-comparison-table-body",
    );
    if (compareTable && data.so_sanh_dich_vu) {
      const comparisonOrder = {
        instant: 1,
        express: 2,
        fast: 3,
        standard: 4,
      };
      compareTable.innerHTML = [...data.so_sanh_dich_vu]
        .sort(
          (a, b) =>
            (comparisonOrder[a.service_type] || 99) -
            (comparisonOrder[b.service_type] || 99),
        )
        .map((item) => {
          const serviceType = item.service_type;
          const serviceMeta = services[serviceType] || {};
          const serviceLabel =
            getServiceLabel(serviceType, item.goi || "Đang cập nhật");
          const estimateLabel =
            (serviceMeta.estimate && serviceMeta.estimate.same_district) ||
            (serviceMeta.estimate && serviceMeta.estimate.same_city) ||
            "";

          return `
                <tr>
                    <td>
                        <div class="service-name-cell">
                            <strong>${escapeHtml(serviceLabel)}</strong>
                            <span class="service-tag ${item.tagCls || "tag-standard"}">${item.tag}</span>
                        </div>
                    </td>
                    <td><strong>${estimateLabel || "Đang cập nhật"}</strong></td>
                    <td>
                        <div class="surcharge-info-cell">
                            <span class="price-active price-active--time"><i class="fas fa-exclamation-triangle"></i> Có tính</span>
                            <small>${item.phi_thoi_gian || "(Đêm khuya, giờ cao điểm)"}</small>
                        </div>
                    </td>
                    <td>
                        <div class="surcharge-info-cell">
                            <span class="price-active price-active--weather"><i class="fas fa-cloud-rain"></i> Có tính</span>
                            <small>${item.phi_thoi_tiet || "(Mưa nhẹ, mưa lớn, thời tiết xấu)"}</small>
                        </div>
                    </td>
                    <td>${item.phu_hop || ""}</td>
                </tr>
            `;
        })
        .join("");
    }

    // 9. Ví dụ hoàn chỉnh (Dynamic examples)
    const finalExamplesGrid = document.getElementById(
      "pricing-final-examples-grid",
    );
    if (
      finalExamplesGrid &&
      Array.isArray(data.vi_du_hoan_chinh) &&
      typeof calculateDomesticQuote === "function"
    ) {
      finalExamplesGrid.innerHTML = data.vi_du_hoan_chinh
        .map((example) => {
          try {
            const payload = example.payload || {};
            const result = calculateDomesticQuote(payload, {
              includeTimeFee: true,
              includeVehicleFee: true,
            });
            const service = (result.services || []).find(
              (item) => item.serviceType === example.service_type,
            );

            if (!service) {
              throw new Error("missing service");
            }

            const breakdown = service.breakdown || {};
            const goodsFeeDetails = breakdown.goodsFeeDetails || {};
            const serviceLabel =
              buildFinalExampleTitle(example, service);
            const summary =
              replaceKnownServiceNames(example.summary) ||
              `${service.serviceName || "Dịch vụ"} tuyến ${
                result.zoneLabel || "nội địa"
              }.`;
            const baseDetailParts = [];
            const distanceText = formatDistance(
              payload.khoang_cach_km || payload.khoangCachKm || result.distanceKm,
            );

            if (distanceText) {
              baseDetailParts.push(distanceText);
            }
            if (result.zoneLabel) {
              baseDetailParts.push(result.zoneLabel);
            }

            const goodsParts = [];
            if (breakdown.goodsFee > 0) {
              if (
                Array.isArray(goodsFeeDetails.lines) &&
                goodsFeeDetails.lines.length > 1
              ) {
                goodsFeeDetails.lines.forEach((line) => {
                  const lineParts = [];
                  if (Number(line.fixedFee || 0) > 0) {
                    lineParts.push(
                      `${formatMoney(line.fixedFee)}/kiện × ${line.quantity} kiện`,
                    );
                  }
                  if (Number(line.multiplier || 1) > 1) {
                    lineParts.push(`hệ số ×${line.multiplier}`);
                  }
                  goodsParts.push(
                    `${escapeHtml(line.label || "Phụ phí loại hàng")} <strong>${formatMoney(line.total || 0)}</strong>${lineParts.length ? ` (${lineParts.join(" + ")})` : ""}`,
                  );
                });
              } else {
                const line =
                  Array.isArray(goodsFeeDetails.lines) && goodsFeeDetails.lines[0]
                    ? goodsFeeDetails.lines[0]
                    : null;
                goodsParts.push(
                  `${escapeHtml(
                    line?.label || "Phụ phí loại hàng",
                  )} <strong>${formatMoney(breakdown.goodsFee)}</strong>`,
                );
              }
            }
            if (breakdown.insuranceFee > 0) {
              goodsParts.push(
                `bảo hiểm <strong>${formatMoney(
                  breakdown.insuranceFee,
                )}</strong>`,
              );
            }

            const serviceParts = [];
            if (breakdown.codFee > 0) {
              serviceParts.push(
                `COD <strong>${formatMoney(breakdown.codFee)}</strong>`,
              );
            }
            if (breakdown.timeFee > 0) {
              serviceParts.push(
                `${escapeHtml(
                  service.timeSurchargeLabel || "Phí thời gian",
                )} <strong>${formatMoney(breakdown.timeFee)}</strong>`,
              );
            }
            if (breakdown.conditionFee > 0) {
              serviceParts.push(
                `${escapeHtml(
                  service.serviceConditionLabel || "Phí thời tiết",
                )} <strong>${formatMoney(breakdown.conditionFee)}</strong>`,
              );
            }

            const vehicleDetail = service.selectedVehicleLabel
              ? ` (${escapeHtml(service.selectedVehicleLabel)})`
              : "";

            return `
              <div class="pricing-info-card">
                <div class="pricing-info-card-head">
                  <span>${escapeHtml(example.icon || "🧾")}</span>
                  <h4>${escapeHtml(serviceLabel)}</h4>
                </div>
                <div class="pricing-example">
                  ${escapeHtml(summary)}<br /><br />
                  1. Phí vận chuyển: <strong>${formatMoney(
                    getTongGiaVanChuyen(breakdown),
                  )}</strong>${
                    baseDetailParts.length
                      ? ` (${baseDetailParts
                          .map((part) => escapeHtml(part))
                          .join(" | ")})`
                      : ""
                  }<br />
                  2. Phụ phí hàng hóa: ${
                    goodsParts.length ? goodsParts.join(" + ") : "<strong>0đ</strong>"
                  }<br />
                  3. Phụ phí dịch vụ: ${
                    serviceParts.length
                      ? serviceParts.join(" + ")
                      : "<strong>0đ</strong>"
                  }<br />
                  4. Điều chỉnh phương tiện: <strong>${formatMoney(
                    breakdown.vehicleFee,
                  )}</strong>${vehicleDetail}<br /><br />
                  <strong>Tổng cước tạm tính: ${formatMoney(
                    service.total,
                  )}</strong>
                </div>
              </div>
            `;
          } catch (error) {
            return `
              <div class="pricing-info-card">
                <div class="pricing-example">
                  Không thể tải ví dụ minh họa cho gói này.
                </div>
              </div>
            `;
          }
        })
        .join("");
    }
    renderParagraphGroup(
      "pricing-final-note",
      getDynamicFinalNotes(pricingContent.vi_du_hoan_chinh?.ghi_chu),
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
}
