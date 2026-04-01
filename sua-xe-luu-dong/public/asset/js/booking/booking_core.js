(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});

  function initBookingModal() {
    const bookingModal = document.getElementById("bookingModal");
    if (bookingModal && bookingModal.dataset.bookingInitDone === "true") {
      return;
    }

    if (bookingModal) {
      bookingModal.dataset.bookingInitDone = "true";
    }

    const serviceSelect = document.getElementById("loaidichvu");
    const vehicleType = document.getElementById("loaixe");
    const brandSelect = document.getElementById("hangxe");
    const itemSelect = document.getElementById("mauxe");
    const customItemInputWrapper = document.getElementById(
      "customItemInputWrapper",
    );
    const customItemInput = document.getElementById("mauxekhac");
    const datetimeInput = document.querySelector(
      '#formdatdichvu input[type="datetime-local"]',
    );

    const priceInput = document.getElementById("giadichvu");
    const transportInput = document.getElementById("phidichuyen");
    const surveyInput = document.getElementById("phikhaosat");
    const totalInput = document.getElementById("tongchiphi");
    const addressInput = document.getElementById("diachi");
    const estimateServicePrice = document.getElementById(
      "estimateServicePrice",
    );
    const estimateTransportFee = document.getElementById(
      "estimateTransportFee",
    );
    const estimateTempTotal = document.getElementById("estimateTempTotal");
    const estimateTransportOnly = document.getElementById(
      "estimateTransportOnly",
    );
    const estimateSurveyOnly = document.getElementById("estimateSurveyOnly");
    const estimateNoFixTotal = document.getElementById("estimateNoFixTotal");
    const estimateSummaryBlock = document.getElementById(
      "estimateSummaryBlock",
    );

    let servicesData = [];
    let providerLocation = null;
    let transportPerKm = 0;
    let transportMinFee = 0;
    let transportMaxFee = 0;
    let latestDistanceKm = null;
    let transportFeeValue = 0;
    let transportCalcToken = 0;
    let addressCalcTimer = null;
    let pendingServiceId = bookingModal?.dataset.pendingServiceId || null;
    if (bookingModal && bookingModal.dataset.pendingServiceId) {
      delete bookingModal.dataset.pendingServiceId;
    }

    function applyServiceSelection(serviceId) {
      if (!serviceSelect || !serviceId) return false;

      const targetValue = String(serviceId);
      const hasOption = Array.from(serviceSelect.options).some(
        (opt) => String(opt.value) === targetValue,
      );

      if (!hasOption) return false;

      serviceSelect.value = targetValue;
      serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    function bindQuickBookingButtons() {
      if (document.body.dataset.quickBookingBound === "true") return;
      document.body.dataset.quickBookingBound = "true";

      document.addEventListener("click", function (e) {
        const triggerBtn = e.target.closest(
          '[data-booking-service-btn="true"]',
        );
        if (!triggerBtn) return;

        e.preventDefault();

        const serviceId = triggerBtn.dataset.id;
        if (!serviceId) return;

        const bookingModal = document.getElementById("bookingModal");
        if (bookingModal) {
          bootstrap.Modal.getOrCreateInstance(bookingModal).show();
        }

        const applied = applyServiceSelection(serviceId);
        if (!applied) {
          pendingServiceId = serviceId;
          if (bookingModal) {
            bookingModal.dataset.pendingServiceId = String(serviceId);
          }
        }
      });
    }

    function toggleCustomItemInput(force = null) {
      if (!itemSelect || !customItemInputWrapper || !customItemInput) return;

      const useCustom =
        force == null
          ? String(itemSelect.value || "") === "__other__"
          : Boolean(force);

      customItemInputWrapper.classList.toggle("d-none", !useCustom);
      customItemInput.required = useCustom;

      if (!useCustom) {
        customItemInput.value = "";
      }
    }

    function getCurrentDateTimeLocalValue() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function fillCurrentDateTime() {
      if (!datetimeInput) return;
      datetimeInput.value = getCurrentDateTimeLocalValue();
    }

    function ensureOtherModelOption() {
      if (!itemSelect) return;

      const hasOtherOption = Array.from(itemSelect.options).some(
        (option) => String(option.value) === "__other__",
      );

      if (hasOtherOption) return;

      const otherOption = document.createElement("option");
      otherOption.value = "__other__";
      otherOption.textContent = "Khác (nhập mẫu xe)";
      itemSelect.appendChild(otherOption);
    }

    let vehicleTypesData = [];

    function getSelectedServicePrice() {
      if (!serviceSelect || !serviceSelect.value) return 0;
      const service = servicesData.find(
        (s) => String(s.id) === serviceSelect.value,
      );
      return Number(service?.service_price || 0);
    }

    function getDistanceThresholdKm() {
      return Number(transportPerKm || 0);
    }

    function getTransportMinFee() {
      return Number(transportMinFee || 0);
    }

    function getTransportMaxFee() {
      return Number(transportMaxFee || 0);
    }

    function formatCurrency(value) {
      return Number(value || 0).toLocaleString("vi-VN");
    }

    function formatCurrencyVND(value) {
      return `${formatCurrency(value)}đ`;
    }

    function calculateTransportFeeByThreshold(distanceKm) {
      const thresholdKm = getDistanceThresholdKm();
      const minFee = getTransportMinFee();
      const maxFee = getTransportMaxFee();
      const perKmIncrease = 5000;
      const billableKm = Math.max(0, Math.ceil(Number(distanceKm || 0)));

      if (!Number.isFinite(distanceKm)) {
        return minFee;
      }

      if (thresholdKm > 0 && distanceKm < thresholdKm) {
        return minFee + billableKm * perKmIncrease;
      }

      const baseFee = maxFee > 0 ? maxFee : minFee;
      return baseFee + billableKm * perKmIncrease;
    }

    function updateTotalPrice() {
      const servicePrice = getSelectedServicePrice();
      const surveyFee = getCurrentSurveyFee();
      const transportFee = Number(transportFeeValue || 0);
      const total = servicePrice + surveyFee + transportFee;
      const noFixTotal = surveyFee + transportFee;

      if (priceInput) {
        priceInput.value = servicePrice > 0 ? formatCurrency(servicePrice) : "";
      }

      if (surveyInput) {
        surveyInput.value = surveyFee > 0 ? formatCurrency(surveyFee) : "";
      }

      if (totalInput) {
        totalInput.value = total > 0 ? formatCurrency(total) : "";
      }

      if (estimateServicePrice) {
        estimateServicePrice.textContent =
          servicePrice > 0 ? formatCurrencyVND(servicePrice) : "-";
      }

      if (estimateTransportOnly) {
        estimateTransportOnly.textContent =
          transportFee > 0 ? formatCurrencyVND(transportFee) : "-";
      }

      if (estimateSurveyOnly) {
        estimateSurveyOnly.textContent =
          surveyFee > 0 ? formatCurrencyVND(surveyFee) : "-";
      }

      if (estimateNoFixTotal) {
        estimateNoFixTotal.textContent =
          noFixTotal > 0 ? formatCurrencyVND(noFixTotal) : "-";
      }

      if (estimateTempTotal) {
        estimateTempTotal.textContent =
          total > 0 ? formatCurrencyVND(total) : "-";
      }
    }

    function updateEstimateVisibility() {
      if (!estimateSummaryBlock || !serviceSelect) return;

      if (String(serviceSelect.value || "").trim()) {
        estimateSummaryBlock.classList.remove("d-none");
      } else {
        estimateSummaryBlock.classList.add("d-none");
      }
    }

    function setTransportFeeDisplay(value, opts = {}) {
      const { pending = false, suffix = "", displayText = "" } = opts;

      if (!transportInput) return;

      if (pending) {
        transportInput.value = "Đang tính...";
        if (estimateTransportFee) {
          estimateTransportFee.textContent = "Đang tính...";
        }
        return;
      }

      if (displayText) {
        transportInput.value = displayText;
        if (estimateTransportFee) {
          estimateTransportFee.textContent = displayText;
        }
        return;
      }

      if (value == null || Number.isNaN(Number(value))) {
        transportInput.value = "";
        return;
      }

      const rendered = `${formatCurrency(value)}${suffix ? ` (${suffix})` : ""}`;
      transportInput.value = rendered;

      if (estimateTransportFee) {
        let suffixText = "";
        if (suffix) {
          suffixText = /km$/i.test(suffix.trim())
            ? ` (~${suffix.trim()})`
            : ` (${suffix.trim()})`;
        }

        estimateTransportFee.textContent =
          value > 0 ? `${formatCurrencyVND(value)}${suffixText}` : "-";
      }
    }

    function isValidCoordinate(value) {
      return typeof value === "number" && Number.isFinite(value);
    }

    async function geocodeAddress(address) {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(address)}`;
      const res = await fetch(endpoint, {
        headers: { "Accept-Language": "vi" },
      });

      if (!res.ok) {
        throw new Error("Không thể geocode địa chỉ khách hàng");
      }

      const data = await res.json();
      const first = data && data[0];
      if (!first) {
        throw new Error("Không tìm thấy tọa độ từ địa chỉ đã nhập");
      }

      return {
        lat: Number(first.lat),
        lng: Number(first.lon),
      };
    }

    async function getRoadDistanceKm(from, to) {
      const endpoint = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false&steps=false`;
      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error("Không thể lấy quãng đường thực tế");
      }

      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route || typeof route.distance !== "number") {
        throw new Error("Không có dữ liệu tuyến đường");
      }

      return route.distance / 1000;
    }

    async function recalculateTransportFee(force = false) {
      const addressText = (addressInput?.value || "").trim();

      const minFee = getTransportMinFee();

      if (!addressText) {
        latestDistanceKm = null;
        transportFeeValue = minFee;
        setTransportFeeDisplay(null, {
          displayText: "Nhập địa chỉ để tính giá",
        });
        updateTotalPrice();
        return;
      }

      const token = ++transportCalcToken;
      setTransportFeeDisplay(null, { pending: true });

      try {
        if (
          !providerLocation ||
          !isValidCoordinate(providerLocation.lat) ||
          !isValidCoordinate(providerLocation.lng)
        ) {
          throw new Error("Thiếu tọa độ nhà cung cấp");
        }

        const customerCoords = await geocodeAddress(addressText);
        const distanceKm = await getRoadDistanceKm(
          providerLocation,
          customerCoords,
        );

        if (token !== transportCalcToken && !force) {
          return;
        }

        latestDistanceKm = distanceKm;
        const calculated = calculateTransportFeeByThreshold(distanceKm);
        transportFeeValue = calculated;
        setTransportFeeDisplay(calculated, {
          suffix: `${distanceKm.toFixed(1)} km`,
        });
      } catch (error) {
        if (token !== transportCalcToken && !force) {
          return;
        }

        latestDistanceKm = null;
        transportFeeValue = minFee;
        setTransportFeeDisplay(minFee, { suffix: "ước tính" });
        console.error(error);
      } finally {
        if (token === transportCalcToken || force) {
          updateTotalPrice();
        }
      }
    }

    function scheduleRecalculateTransportFee(delay = 700) {
      if (addressCalcTimer) {
        clearTimeout(addressCalcTimer);
      }

      addressCalcTimer = setTimeout(() => {
        recalculateTransportFee();
      }, delay);
    }

    function getSurveyFeeByVehicleType(type) {
      const vehicleType = vehicleTypesData.find((v) => v.type === type);
      return vehicleType?.survey_fees || 0;
    }

    function getCurrentSurveyFee() {
      if (!vehicleType || !vehicleType.value) return 0;
      return getSurveyFeeByVehicleType(vehicleType.value);
    }

    setTransportFeeDisplay(null);
    updateEstimateVisibility();

    fetch("public/services.json")
      .then((res) => res.json())
      .then((data) => {
        servicesData = data.services || [];
        vehicleTypesData = data.vehicles || [];
        providerLocation = {
          lat: Number(data.provider?.lat),
          lng: Number(data.provider?.lng),
          address: data.provider?.address || "",
        };
        transportPerKm = Number(data.provider?.per_km || 0);
        transportMinFee = Number(data.provider?.min_fee || 0);
        transportMaxFee = Number(data.provider?.max_fee || 0);

        if (!serviceSelect) return;

        servicesData.forEach((service) => {
          const option = document.createElement("option");
          option.value = service.id;
          option.textContent = service.name;
          serviceSelect.appendChild(option);
        });

        if (pendingServiceId) {
          applyServiceSelection(pendingServiceId);
          pendingServiceId = null;
          if (bookingModal) {
            delete bookingModal.dataset.pendingServiceId;
          }
        }

        recalculateTransportFee(true);
      })
      .catch((err) => console.error("Lỗi load JSON:", err));

    if (serviceSelect) {
      serviceSelect.addEventListener("change", function () {
        updateEstimateVisibility();
        resetSelect(vehicleType, "Chọn loại xe");
        resetSelect(brandSelect, "Chọn hãng");
        resetSelect(itemSelect, "Chọn mẫu xe");
        ensureOtherModelOption();
        toggleCustomItemInput(false);
        clearPrice();
        recalculateTransportFee();

        if (!vehicleType) return;

        vehicleTypesData.forEach((vehicle) => {
          const option = document.createElement("option");
          option.value = vehicle.type;
          option.textContent = vehicle.type;
          vehicleType.appendChild(option);
        });
      });
    }

    if (vehicleType) {
      vehicleType.addEventListener("change", function () {
        resetSelect(brandSelect, "Chọn hãng");
        resetSelect(itemSelect, "Chọn mẫu xe");
        ensureOtherModelOption();
        toggleCustomItemInput(false);
        clearPrice();

        if (surveyInput) {
          surveyInput.value = getCurrentSurveyFee().toLocaleString("vi-VN");
        }

        recalculateTransportFee();

        const selectedVehicleType = vehicleTypesData.find(
          (v) => v.type === this.value,
        );
        if (!selectedVehicleType) return;

        const brands = selectedVehicleType.brands || [];
        brands.forEach((brand) => {
          const option = document.createElement("option");
          option.value = brand.name;
          option.textContent = brand.name;
          brandSelect.appendChild(option);
        });
      });
    }

    if (brandSelect) {
      brandSelect.addEventListener("change", function () {
        resetSelect(itemSelect, "Chọn mẫu xe");
        toggleCustomItemInput(false);
        clearPrice();

        const selectedVehicleType = vehicleTypesData.find(
          (v) => v.type === (vehicleType && vehicleType.value),
        );
        if (!selectedVehicleType) return;

        const selectedBrand = selectedVehicleType.brands.find(
          (b) => b.name === this.value,
        );
        if (!selectedBrand) return;

        const models = selectedBrand.models || [];
        models.forEach((model) => {
          const option = document.createElement("option");
          option.value = model.id;
          option.textContent = model.vehicle_name || model.name;
          itemSelect.appendChild(option);
        });

        ensureOtherModelOption();
      });
    }

    if (itemSelect) {
      itemSelect.addEventListener("change", function () {
        const option = this.options[this.selectedIndex];

        toggleCustomItemInput();

        if (!option || !option.value) {
          clearPrice();
          return;
        }

        updateTotalPrice();
      });
    }

    if (customItemInput) {
      customItemInput.addEventListener("input", function () {
        if (String(itemSelect?.value || "") !== "__other__") return;
        updateTotalPrice();
      });
    }

    if (addressInput) {
      addressInput.addEventListener("input", function () {
        scheduleRecalculateTransportFee();
      });

      addressInput.addEventListener("change", function () {
        scheduleRecalculateTransportFee(150);
      });
    }

    function resetSelect(select, placeholder) {
      if (!select) return;
      select.innerHTML = `<option value="">${placeholder}</option>`;
    }

    function clearPrice() {
      if (priceInput) priceInput.value = "";
      if (totalInput) totalInput.value = "";
    }

    const autoFillBtn = document.getElementById("autoFillBtn");
    if (autoFillBtn) {
      autoFillBtn.addEventListener("click", function () {
        const customer = this.dataset.customer;
        const phone = this.dataset.phone;
        const address = this.dataset.address;

        document.getElementById("hotenkhachhang").value = customer;
        document.getElementById("sodienthoaikhachhang").value = phone;
        document.getElementById("diachi").value = address;
        scheduleRecalculateTransportFee(150);
      });
    }

    bindQuickBookingButtons();
    ensureOtherModelOption();
    toggleCustomItemInput(false);
    fillCurrentDateTime();

    if (bookingModal && bookingModal.dataset.dateTimeAutofillBound !== "true") {
      bookingModal.dataset.dateTimeAutofillBound = "true";
      bookingModal.addEventListener("shown.bs.modal", function () {
        fillCurrentDateTime();
      });
    }

    const bookingForm = document.getElementById("formdatdichvu");
    if (bookingForm && bookingForm.dataset.customItemResetBound !== "true") {
      bookingForm.dataset.customItemResetBound = "true";
      bookingForm.addEventListener("reset", function () {
        setTimeout(() => {
          ensureOtherModelOption();
          toggleCustomItemInput(false);
        }, 0);
      });
    }

    if (app.media && typeof app.media.initMediaUpload === "function") {
      app.media.initMediaUpload();
    }

    if (app.map && typeof app.map.mapPickerInit === "function") {
      app.map.mapPickerInit();
    }

    if (
      app.confirm &&
      typeof app.confirm.initBookingConfirmFlow === "function"
    ) {
      app.confirm.initBookingConfirmFlow();
    }
  }

  app.core = app.core || {};
  app.core.initBookingModal = initBookingModal;
})(window);
