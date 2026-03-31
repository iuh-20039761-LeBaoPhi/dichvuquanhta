(function (window) {
  if (window.FastGoBookingPricing) return;

  // Gom toàn bộ logic tính giá và render khối giá tạm tính của form đặt lịch.
  // Khác biệt giữa từng dịch vụ được tách sang JSON để JS chỉ còn phần engine chung.
  let bookingFormLogicPromise = null;

  function loadBookingFormLogic(core) {
    if (!bookingFormLogicPromise) {
      bookingFormLogicPromise = fetch(
        core.toPublicUrl("assets/js/data/logic-form-dat-lich.json"),
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Cannot load booking form logic: ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          console.error("Cannot load booking form logic:", error);
          return {
            optional_checkbox_config: {},
            special_checkbox_config: {},
            included_option_config: {},
            time_checkbox_config: {},
            note_checkbox_config: {},
            conditional_included_option_config: {},
          };
        });
    }

    return bookingFormLogicPromise;
  }

  function getBookingSpecialFixedItem(core, serviceData, slug) {
    return (
      core
        .getPricingCheckboxItems(serviceData)
        .find(
          (item) =>
            String(item?.slug || "").trim() === String(slug || "").trim(),
        ) || null
    );
  }

  function getBookingFixedTimeWeatherAmount(core, serviceData, groupKey, slug) {
    const pricing = core.getPricingStandardStructure(serviceData);
    const items = Array.isArray(pricing?.phu_phi?.[groupKey])
      ? pricing.phu_phi[groupKey]
      : [];
    const match = items.find(
      (item) => String(item?.slug || "").trim() === String(slug || "").trim(),
    );
    if (!match) return 0;
    const amount = Number(match?.don_gia || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  function markBookingSelectedOption(selectionMap, payload) {
    const displaySlug = String(payload?.displaySlug || "").trim();
    if (!displaySlug) return;

    const amount = Number(payload?.amount || 0);
    const quantity = Number(payload?.quantity || 0);
    const existing = selectionMap.get(displaySlug);

    if (existing) {
      existing.amount += amount;
      existing.quantity += quantity;
      existing.note = payload.note || existing.note;
      existing.state = payload.state || existing.state;
      existing.included = existing.included || !!payload.included;
      return;
    }

    selectionMap.set(displaySlug, {
      amount,
      quantity,
      note: String(payload?.note || "").trim(),
      state: String(payload?.state || "").trim(),
      included: !!payload?.included,
    });
  }

  function formatBookingMoneyLine(core, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return "Miễn phí";
    return core.formatCurrencyVnd(amount);
  }

  function renderBookingLineItem(core, item) {
    const detail = String(item?.detail || "").trim();
    return `
      <div class="muc-chi-tiet-gia-chot-dat-lich">
        <div class="muc-chi-tiet-gia-chot-dat-lich__hang">
          <span>${core.escapeHtml(item.label || "")}</span>
          <strong>${core.escapeHtml(formatBookingMoneyLine(core, item.amount))}</strong>
        </div>
        ${detail ? `<p>${core.escapeHtml(detail)}</p>` : ""}
      </div>
    `;
  }

  // Chuẩn hóa dữ liệu giá trước khi render: dòng chi phí, note và card hạng mục.
  function buildBookingPricingState(scope, serviceData, deps) {
    const {
      core,
      normalizeService,
      resolveBookingVehicleEntry,
      getBookingDistanceKmValue,
      getBookingNumericValue,
      isBookingChecked,
      getCheckedLabelsFromSelectors,
      getBookingPricingTimeLabel,
      formLogicConfig,
    } = deps;

    const normalizedService = normalizeService(serviceData?.id || "");
    const vehicleEntries = core.getPricingVehicleEntries(serviceData);
    const vehicleEntry = resolveBookingVehicleEntry(
      scope,
      normalizedService,
      vehicleEntries,
    );
    const checkboxItems = core.getPricingCheckboxItems(serviceData);
    const checkboxItemMap = new Map(
      checkboxItems.map((item) => [String(item?.slug || "").trim(), item]),
    );
    const displayItems = core.getPricingDisplayItems(serviceData);
    const optionSelections = new Map();
    const breakdownLines = [];
    const notes = [];
    const optionalCheckboxConfigMap =
      formLogicConfig?.optional_checkbox_config || {};
    const specialCheckboxConfigMap =
      formLogicConfig?.special_checkbox_config || {};
    const includedOptionConfigMap =
      formLogicConfig?.included_option_config || {};
    const timeCheckboxConfigMap = formLogicConfig?.time_checkbox_config || {};
    const noteCheckboxConfigMap = formLogicConfig?.note_checkbox_config || {};
    const conditionalIncludedOptionConfigMap =
      formLogicConfig?.conditional_included_option_config || {};
    const includedOptionSlugs = new Set(
      includedOptionConfigMap[normalizedService] || [],
    );
    const distanceKm = getBookingDistanceKmValue(scope);
    const hasDistance = distanceKm > 0;
    let total = 0;

    function addChargeLine({
      label,
      detail,
      amount,
      displaySlug = "",
      quantity = 0,
      note = "",
      forceInclude = false,
      state = "",
      included = false,
    }) {
      const numericAmount = Number(amount || 0);
      if (numericAmount <= 0 && !forceInclude) return;

      breakdownLines.push({
        label,
        detail,
        amount: numericAmount > 0 ? numericAmount : 0,
      });

      if (numericAmount > 0) {
        total += numericAmount;
      }

      if (displaySlug) {
        markBookingSelectedOption(optionSelections, {
          displaySlug,
          amount: numericAmount > 0 ? numericAmount : 0,
          quantity,
          note,
          state,
          included,
        });
      }
    }

    function addCheckboxCharge({
      checkboxSlug,
      active,
      label,
      displaySlug,
      note,
    }) {
      const checkboxItem = checkboxItemMap.get(checkboxSlug);
      if (!checkboxItem || !active) return;
      const amount = Number(checkboxItem.don_gia || 0);
      addChargeLine({
        label: label || checkboxItem.ten || "Phụ phí phát sinh",
        detail: `Áp dụng khi bạn chọn hạng mục này: ${core.formatCurrencyVnd(checkboxItem.don_gia || 0)}`,
        amount,
        displaySlug:
          displaySlug || checkboxItem.nguon_hien_thi_slug || checkboxSlug,
        quantity: 1,
        note,
        state: "Đang chọn",
      });
    }

    const optionalCheckboxConfig =
      optionalCheckboxConfigMap[normalizedService] || [];
    optionalCheckboxConfig.forEach((item) => {
      addCheckboxCharge({
        checkboxSlug: item.checkbox_slug,
        active: Array.isArray(item.selectors)
          ? item.selectors.some((selector) => isBookingChecked(scope, selector))
          : isBookingChecked(scope, item.selector),
        displaySlug: item.display_slug,
      });
    });

    if (!vehicleEntry) {
      notes.push("Chọn loại xe để hệ thống tính cước theo số km di chuyển.");
    } else if (hasDistance) {
      const ratePerKm = Number(vehicleEntry.gia_moi_km || 0);
      const billedDistanceKm = Math.max(0, distanceKm);
      addChargeLine({
        label: "Cước xe theo quãng đường",
        detail: `${billedDistanceKm.toFixed(billedDistanceKm >= 10 ? 0 : 1)} km x ${core.formatCurrencyVnd(ratePerKm)}`,
        amount: Math.round(billedDistanceKm * ratePerKm),
      });
    } else {
      notes.push(
        "Chưa ghim đủ hai điểm trên bản đồ nên hệ thống chưa tính được cước xe theo km.",
      );
    }

    const specialCheckboxConfig =
      specialCheckboxConfigMap[normalizedService] || [];
    specialCheckboxConfig.forEach(({ selector, slug, display_slug }) => {
      const specialItem = getBookingSpecialFixedItem(core, serviceData, slug);
      if (!specialItem || !isBookingChecked(scope, selector)) return;
      addChargeLine({
        label: specialItem.ten || "Hạng mục đặc biệt",
        detail: `Áp dụng theo checkbox đã chọn: ${core.formatCurrencyVnd(specialItem.don_gia || 0)}`,
        amount: Number(specialItem.don_gia || 0),
        displaySlug: display_slug,
        quantity: 1,
        note: "Tính theo checkbox đặc biệt đã chọn.",
        state: "Đang chọn",
      });
    });

    const timeCheckboxConfig = timeCheckboxConfigMap[normalizedService] || [];
    timeCheckboxConfig.forEach((item) => {
      if (!isBookingChecked(scope, item.selector)) return;
      const amount = getBookingFixedTimeWeatherAmount(
        core,
        serviceData,
        item.group_key,
        item.slug,
      );
      addChargeLine({
        label: item.label || "Phụ phí phát sinh",
        detail:
          item.detail || "Áp dụng theo điều kiện thời gian đã được chọn.",
        amount,
        note: item.note || "",
        state: item.state || "Đang chọn",
      });
    });

    const noteCheckboxConfig = noteCheckboxConfigMap[normalizedService] || [];
    noteCheckboxConfig.forEach((item) => {
      if (!isBookingChecked(scope, item.selector)) return;
      if (item.note) notes.push(item.note);
    });

    const conditionalIncludedOptionConfig =
      conditionalIncludedOptionConfigMap[normalizedService] || [];
    conditionalIncludedOptionConfig.forEach((item) => {
      if (!isBookingChecked(scope, item.selector)) return;
      if (!item.display_slug) return;
      addChargeLine({
        label: item.label || "Hạng mục đã gồm",
        detail: item.detail || "Hạng mục hỗ trợ miễn phí đã được ghi nhận.",
        amount: 0,
        displaySlug: item.display_slug,
        quantity: 1,
        note: item.note || "Hạng mục hỗ trợ miễn phí đã được ghi nhận.",
        forceInclude: true,
        state: item.state || "Đang chọn",
      });
    });

    const pricingTimeSlug = String(
      scope.querySelector("[data-khung-gio-tinh-gia]")?.value || "",
    ).trim();
    if (
      pricingTimeSlug &&
      pricingTimeSlug !== "binh_thuong" &&
      pricingTimeSlug !== "can_xac_nhan"
    ) {
      const timeAmount = getBookingFixedTimeWeatherAmount(
        core,
        serviceData,
        "khung_gio",
        pricingTimeSlug,
      );
      addChargeLine({
        label: `Khung giờ ${getBookingPricingTimeLabel(pricingTimeSlug)}`,
        detail: "Áp dụng phụ phí khung giờ theo bảng giá minh bạch.",
        amount: timeAmount,
      });
    } else if (pricingTimeSlug === "can_xac_nhan") {
      notes.push(
        "Khung giờ linh động đã được ghi nhận, hiện chưa cộng thêm phụ phí riêng.",
      );
    }

    const weatherValue = String(
      scope.querySelector("#thoi-tiet-du-kien-dat-lich")?.value || "",
    ).trim();
    if (weatherValue === "troi_mua") {
      const weatherAmount = getBookingFixedTimeWeatherAmount(
        core,
        serviceData,
        "thoi_tiet",
        "troi_mua",
      );
      addChargeLine({
        label: "Phụ phí thời tiết mưa",
        detail: "Áp dụng khi bạn chọn triển khai trong điều kiện mưa.",
        amount: weatherAmount,
      });
    }

    includedOptionSlugs.forEach((slug) => {
      if (!optionSelections.has(slug)) {
        markBookingSelectedOption(optionSelections, {
          displaySlug: slug,
          amount: 0,
          quantity: 1,
          note: "Hạng mục hỗ trợ miễn phí đã được ghi nhận cùng dịch vụ.",
          state: "Đã gồm",
          included: true,
        });
      }
    });

    const selectedDisplayItems = displayItems
      .filter((item) => String(item?.slug || "").trim() !== "cuoc_xe")
      .filter((item) => {
        const displaySlug = String(item?.slug || "").trim();
        return optionSelections.has(displaySlug);
      });

    const optionCardsHtml = selectedDisplayItems.length
      ? selectedDisplayItems
          .map((item) => {
            const displaySlug = String(item?.slug || "").trim();
            const selected = optionSelections.get(displaySlug);
            const isActive = !!selected;
            const stateLabel =
              selected?.state || (selected?.included ? "Đã gồm" : "Chưa chọn");
            const amountText = selected
              ? formatBookingMoneyLine(core, selected.amount)
              : "Chưa chọn";
            const noteText = selected?.note || item.ghi_chu || "";

            return `
              <article class="the-gia-tham-khao-dat-lich${isActive ? " dang-chon" : ""}">
                <div class="the-gia-tham-khao-dat-lich__dau">
                  <h6>${core.escapeHtml(item.ten || "")}</h6>
                  <span class="nhan-trang-thai-goi-dat-lich">${core.escapeHtml(stateLabel)}</span>
                </div>
                <strong class="the-gia-tham-khao-dat-lich__gia">${core.escapeHtml(amountText)}</strong>
                <span>${core.escapeHtml(noteText)}</span>
              </article>
            `;
          })
          .join("")
      : `
        <article class="the-gia-tham-khao-dat-lich">
          <div class="the-gia-tham-khao-dat-lich__dau">
            <h6>Chưa có hạng mục chọn thêm</h6>
            <span class="nhan-trang-thai-goi-dat-lich">Chưa phát sinh</span>
          </div>
          <strong class="the-gia-tham-khao-dat-lich__gia">Chưa có mục bổ sung</strong>
          <span>Step này chỉ liệt kê các mục bạn đã bật hoặc được ghi nhận.</span>
        </article>
      `;

    const breakdownHtml = breakdownLines.length
      ? breakdownLines.map((item) => renderBookingLineItem(core, item)).join("")
      : '<div class="muc-chi-tiet-gia-chot-dat-lich"><p>Chưa có dòng tính nào được kích hoạt. Chọn xe hoặc thêm hạng mục để hệ thống cập nhật ngay.</p></div>';

    return {
      title: serviceData.ten_dich_vu || "Giá tạm tính",
      description:
        serviceData?.thong_tin_minh_bach?.tom_tat_tong_chi_phi ||
        "Giá tạm tính đang bám theo số km di chuyển, loại xe và các phụ phí bạn đã chọn trong form.",
      optionCardsHtml,
      breakdownHtml,
      breakdownLines,
      total: vehicleEntry ? total : null,
      totalNote: vehicleEntry
        ? "Giá tạm tính sẽ tự cập nhật ngay khi bạn đổi loại xe, thay đổi số km hoặc bật thêm phụ phí."
        : "Chọn loại xe trước để hệ thống tính giá tạm tính theo km.",
      notes,
    };
  }

  // Hàm public duy nhất: main-forms chỉ cần gọi render và truyền dependencies vào.
  async function render(scope, deps) {
    const {
      core,
      loadPricingReference,
      getPricingServiceId,
      normalizePricingDataServiceId,
    } = deps;
    const pricingRoot = scope.querySelector("[data-gia-tham-khao-dat-lich]");
    if (!pricingRoot) return;

    const defaultBlock = pricingRoot.querySelector(
      "[data-gia-tham-khao-dat-lich-mac-dinh]",
    );
    const contentBlock = pricingRoot.querySelector(
      "[data-gia-tham-khao-dat-lich-noi-dung]",
    );
    const title = pricingRoot.querySelector(
      "[data-gia-tham-khao-dat-lich-ten-dich-vu]",
    );
    const description = pricingRoot.querySelector(
      "[data-gia-tham-khao-dat-lich-mo-ta]",
    );
    const list = pricingRoot.querySelector(
      "[data-gia-tham-khao-dat-lich-danh-sach]",
    );
    const detailGrid = pricingRoot.querySelector(
      "[data-chi-tiet-gia-chot-dat-lich]",
    );
    const totalValue = pricingRoot.querySelector(
      "[data-tong-gia-chot-dat-lich]",
    );
    const totalHint = pricingRoot.querySelector("[data-goi-y-gia-chot-dat-lich]");
    const confirmTotalRoot = scope.querySelector("[data-tong-xac-nhan-dat-lich]");
    const confirmTotalValue = scope.querySelector("[data-tong-xac-nhan-dat-lich-gia]");
    const confirmTotalHint = scope.querySelector("[data-tong-xac-nhan-dat-lich-goi-y]");
    const confirmEmpty = scope.querySelector("[data-gia-xac-nhan-rong]");
    const confirmGrid = scope.querySelector("[data-gia-xac-nhan-luoi]");
    const confirmNotes = scope.querySelector("[data-luu-y-xac-nhan-dat-lich]");
    const serviceSelect = scope.querySelector("#loai-dich-vu-dat-lich");
    const pricingServiceId = getPricingServiceId(serviceSelect?.value || "");

    if (!pricingServiceId) {
      if (defaultBlock) defaultBlock.hidden = false;
      if (contentBlock) {
        contentBlock.hidden = true;
        contentBlock.classList.add("is-hidden");
      }
      if (list) list.innerHTML = "";
      if (detailGrid) detailGrid.innerHTML = "";
      if (totalValue) totalValue.textContent = "Chưa đủ dữ liệu";
      if (totalHint) {
        totalHint.textContent =
          "Chọn dịch vụ, xe và nhập đủ các hạng mục cần dùng để hệ thống tính giá tạm tính.";
      }
      if (confirmTotalRoot) confirmTotalRoot.hidden = false;
      if (confirmTotalValue) confirmTotalValue.textContent = "Chưa đủ dữ liệu";
      if (confirmTotalHint) {
        confirmTotalHint.textContent =
          "Chọn dịch vụ, xe và nhập đủ các hạng mục cần dùng để hệ thống tính giá tạm tính.";
      }
      if (confirmEmpty) confirmEmpty.hidden = false;
      if (confirmGrid) {
        confirmGrid.hidden = true;
        confirmGrid.innerHTML = "";
      }
      if (confirmNotes) {
        confirmNotes.innerHTML =
          '<div class="muc-luu-y-xac-nhan">Giá tạm tính sẽ hiện khi bạn chọn dịch vụ và bắt đầu khai báo các hạng mục chính.</div>';
      }
      return;
    }

    const [pricingData, formLogicConfig] = await Promise.all([
      loadPricingReference(),
      loadBookingFormLogic(core),
    ]);
    const serviceData = Array.isArray(pricingData)
      ? pricingData.find(
          (item) =>
            normalizePricingDataServiceId(item?.id) === pricingServiceId,
        )
      : null;

    if (!serviceData) {
      if (defaultBlock) defaultBlock.hidden = false;
      if (contentBlock) {
        contentBlock.hidden = true;
        contentBlock.classList.add("is-hidden");
      }
      if (detailGrid) detailGrid.innerHTML = "";
      if (totalValue) totalValue.textContent = "Chưa đủ dữ liệu";
      if (confirmTotalRoot) confirmTotalRoot.hidden = false;
      if (confirmTotalValue) confirmTotalValue.textContent = "Chưa đủ dữ liệu";
      if (confirmEmpty) confirmEmpty.hidden = false;
      if (confirmGrid) {
        confirmGrid.hidden = true;
        confirmGrid.innerHTML = "";
      }
      return;
    }

    if (defaultBlock) defaultBlock.hidden = true;
    if (contentBlock) {
      contentBlock.hidden = false;
      contentBlock.classList.remove("is-hidden");
    }

    if (title) {
      title.textContent = serviceData.ten_dich_vu || "Giá tạm tính";
    }

    if (description) {
      description.textContent =
        serviceData?.thong_tin_minh_bach?.tom_tat_tong_chi_phi ||
        serviceData?.thong_tin_minh_bach?.phu_hop_khi ||
        "Hệ thống đang hiển thị gói cơ bản, hạng mục chọn thêm và giá tạm tính của dịch vụ bạn đã chọn.";
    }

    const pricingState = buildBookingPricingState(scope, serviceData, {
      ...deps,
      formLogicConfig,
    });

    if (list) {
      list.innerHTML = pricingState.optionCardsHtml;
    }
    if (detailGrid) {
      detailGrid.innerHTML = pricingState.breakdownHtml;
    }
    if (totalValue) {
        totalValue.textContent =
          pricingState.total === null
            ? "Chưa đủ dữ liệu"
            : core.formatCurrencyVnd(pricingState.total);
    }
    if (totalHint) {
      totalHint.textContent = pricingState.totalNote;
    }
    if (confirmTotalRoot) confirmTotalRoot.hidden = false;
    if (confirmTotalValue) {
      confirmTotalValue.textContent =
        pricingState.total === null
          ? "Chưa đủ dữ liệu"
          : core.formatCurrencyVnd(pricingState.total);
    }
    if (confirmTotalHint) {
      confirmTotalHint.textContent = pricingState.totalNote;
    }

    if (confirmEmpty) confirmEmpty.hidden = false;
    if (confirmGrid) {
      const confirmationItems = pricingState.breakdownLines.map((item) => {
        const detail = String(item.detail || "").trim();
        return `
          <article class="the-gia-xac-nhan-dat-lich">
            <div class="the-gia-xac-nhan-dat-lich__hang">
              <h5>${core.escapeHtml(item.label || "")}</h5>
              <strong>${core.escapeHtml(formatBookingMoneyLine(core, item.amount))}</strong>
            </div>
            <span>${core.escapeHtml(detail || "Đã ghi nhận theo lựa chọn hiện tại.")}</span>
          </article>
        `;
      });

      confirmEmpty.hidden = true;
      confirmGrid.hidden = false;
      confirmGrid.innerHTML = confirmationItems.join("");
    }

    if (confirmNotes) {
      const mergedNote = pricingState.notes.filter(Boolean).join(" ");
      confirmNotes.hidden = !mergedNote;
      confirmNotes.innerHTML = mergedNote
        ? `
            <div class="muc-luu-y-xac-nhan muc-luu-y-xac-nhan--hop-nhat">
              ${core.escapeHtml(mergedNote)}
            </div>
          `
        : "";
    }
  }

  window.FastGoBookingPricing = {
    render,
  };
})(window);
