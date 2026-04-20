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

    const customBrandInputWrapper = document.getElementById(
      "customBrandInputWrapper",
    );
    const customBrandInput = document.getElementById("hangxekhac");

    const yeucaugapInput = document.getElementById("yeucaugap");

    const datetimeInput = document.querySelector(
      '#formdatdichvu input[type="datetime-local"]',
    );


    const transportInput = document.getElementById("phidichuyen");
    const surveyInput = document.getElementById("phikhaosat");
    const totalInput = document.getElementById("tongchiphi");
    const addressInput = document.getElementById("diachi");

    const estimateTransportFee = document.getElementById(
      "estimateTransportFee",
    );
    const estimateTempTotal = document.getElementById("estimateTempTotal");
    const estimateSurveyFee = document.getElementById("estimateSurveyFee");
    const estimateSummaryBlock = document.getElementById(
      "estimateSummaryBlock",
    );

    let servicesData = [];
    let transportFeesData = [];
    let providerLocation = null;
    let providerLocations = [];
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

    function toggleCustomBrandInput(force = null) {
      if (!brandSelect || !customBrandInputWrapper || !customBrandInput) return;

      const useCustom =
        force == null
          ? String(brandSelect.value || "") === "__other__"
          : Boolean(force);

      customBrandInputWrapper.classList.toggle("d-none", !useCustom);
      customBrandInput.required = useCustom;

      if (!useCustom) {
        customBrandInput.value = "";
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

      let otherOption = Array.from(itemSelect.options).find(
        (option) => String(option.value) === "__other__",
      );

      if (!otherOption) {
        otherOption = document.createElement("option");
        otherOption.value = "__other__";
        otherOption.textContent = "Khác (nhập mẫu xe)";
      }
      
      itemSelect.appendChild(otherOption);
    }

    function ensureOtherBrandOption() {
      if (!brandSelect) return;

      let otherOption = Array.from(brandSelect.options).find(
        (option) => String(option.value) === "__other__",
      );

      if (!otherOption) {
        otherOption = document.createElement("option");
        otherOption.value = "__other__";
        otherOption.textContent = "Khác (nhập hãng xe)";
      }
      
      brandSelect.appendChild(otherOption);
    }

    let vehicleTypesData = [];



    function getTransportPricePerKm(distanceKm) {
      if (distanceKm < 3) return 0;

      const isGap = yeucaugapInput?.checked;
      const hour = datetimeInput?.value ? new Date(datetimeInput.value).getHours() : new Date().getHours();
      const isNight = hour >= 18 || hour < 6;

      let loaiphi = "Thường";
      if (isGap) loaiphi = "Gấp";
      else if (isNight) loaiphi = "Buổi tối";

      const feeEntry = transportFeesData.find(f => f.loaiphi === loaiphi);
      const sotien = Number(feeEntry?.sotien || 0);
      
      return (distanceKm - 3) * sotien;
    }

    function formatCurrency(value) {
      return Number(value || 0).toLocaleString("vi-VN");
    }

    function formatCurrencyVND(value) {
      return `${formatCurrency(value)}đ`;
    }

    function calculateTransportFee(distanceKm) {
      if (!Number.isFinite(distanceKm)) return 0;
      return Math.round(getTransportPricePerKm(distanceKm));
    }

    function updateTotalPrice() {
      const surveyFee = getCurrentSurveyFee();
      const transportFee = Number(transportFeeValue || 0);
      const total = surveyFee + transportFee;

      if (surveyInput) {
        surveyInput.value = surveyFee > 0 ? formatCurrency(surveyFee) : "";
      }

      if (totalInput) {
        totalInput.value = total > 0 ? formatCurrency(total) : "";
      }

      if (estimateSurveyFee) {
        estimateSurveyFee.textContent =
          surveyFee > 0 ? formatCurrencyVND(surveyFee) : "-";
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

      if (value === 0 && latestDistanceKm != null && latestDistanceKm <= 3) {
        transportInput.value = "Miễn phí (từ 3km trở xuống)";
        if (estimateTransportFee) {
          estimateTransportFee.textContent = "Miễn phí (từ 3km trở xuống)";
        }
      } else {
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
    }

    function isValidCoordinate(value) {
      return typeof value === "number" && Number.isFinite(value);
    }

    function hasServiceId(rawServiceIds, targetServiceId) {
      const target = String(targetServiceId || "").trim();
      if (!target) return false;

      return String(rawServiceIds || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .includes(target);
    }

    function toRows(result) {
      return result?.data || (Array.isArray(result) ? result : []);
    }

    async function listTableRows(tableName, limit = 3000) {
      if (typeof window.krudList !== "function") {
        throw new Error("krudList chua duoc nap");
      }
      const result = await window.krudList({ table: tableName, limit });
      return toRows(result);
    }

    function splitModelNames(rawValue) {
      const raw = String(rawValue || "").trim();
      if (!raw) return [];
      return raw
        .split(/[,;\n|]/)
        .map((name) => String(name || "").trim())
        .filter(Boolean);
    }

    function buildVehicleTypesData(loaixeRows, dongxeRows) {
      const allDongxe = Array.isArray(dongxeRows) ? dongxeRows : [];

      return (Array.isArray(loaixeRows) ? loaixeRows : [])
        .map((row) => {
        const vehicleTypeId = String(row?.id || "").trim();
        const vehicleTypeName = String(row?.loaixe || "").trim();
        const typeBrands = [];
        const brandMap = new Map();

        allDongxe
          .filter(
            (item) => String(item?.id_loaixe || "").trim() === vehicleTypeId,
          )
          .forEach((item) => {
            const brandName = String(item?.thuonghieu || "").trim();
            if (!brandName) return;

            if (!brandMap.has(brandName)) {
              const nextBrand = { name: brandName, models: [] };
              brandMap.set(brandName, nextBrand);
              typeBrands.push(nextBrand);
            }

            const brandNode = brandMap.get(brandName);
            const modelNames = splitModelNames(item?.mauxe);

            modelNames.forEach((modelName, index) => {
              const exists = brandNode.models.some(
                (model) =>
                  String(model.vehicle_name || model.name || "").trim() ===
                  modelName,
              );
              if (exists) return;

              brandNode.models.push({
                id: item?.id
                  ? `${item.id}_${index}`
                  : `${vehicleTypeId}_${brandName}_${modelName}`.replace(
                       /\s+/g,
                       "_",
                    ),
                vehicle_name: modelName,
              });
            });
          });

        return {
          id: vehicleTypeId,
          type: vehicleTypeName,
          survey_fees: Number(row?.phikhaosat || 0),
          brands: typeBrands,
        };
      })
        .filter((row) => row.type);
    }

    async function loadBookingFormData() {
      const [serviceRows, loaixeRows, dongxeRows] = await Promise.all([
        listTableRows("dichvu_suaxe", 3000),
        listTableRows("loaixe", 3000),
        listTableRows("dongxe", 5000),
      ]);

      servicesData = (Array.isArray(serviceRows) ? serviceRows : [])
        .map((row) => ({
          id: String(row?.id || "").trim(),
          name: String(row?.tendichvu || "").trim(),
        }))
        .filter((row) => row.id && row.name);

      const feeRows = await listTableRows("phidichuyen", 100);
      transportFeesData = (Array.isArray(feeRows) ? feeRows : [])
        .map(row => ({
          loaiphi: String(row?.loaiphi || "").trim(),
          sotien: Number(row?.sotien || 0)
        }));

      vehicleTypesData = buildVehicleTypesData(loaixeRows, dongxeRows);
    }

    function haversineDistanceKm(from, to) {
      const R = 6371;
      const toRad = (deg) => (Number(deg) * Math.PI) / 180;
      const dLat = toRad(to.lat - from.lat);
      const dLng = toRad(to.lng - from.lng);
      const lat1 = toRad(from.lat);
      const lat2 = toRad(to.lat);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    async function listNguoidungRows() {
      return listTableRows("nguoidung", 3000);
    }

    async function loadProviderLocations() {
      const rows = await listNguoidungRows();

      providerLocations = (Array.isArray(rows) ? rows : [])
        .filter((row) => hasServiceId(row?.id_dichvu, "8"))
        .map((row) => ({
          lat: Number(row?.maplat),
          lng: Number(row?.maplng),
        }))
        .filter(
          (location) =>
            isValidCoordinate(location.lat) &&
            isValidCoordinate(location.lng) &&
            location.lat !== 0 &&
            location.lng !== 0,
        );
    }

    function findNearestProviderLocation(customerCoords) {
      if (!providerLocations.length) return null;

      let nearest = null;
      let nearestKm = Number.POSITIVE_INFINITY;

      providerLocations.forEach((provider) => {
        const km = haversineDistanceKm(provider, customerCoords);
        if (km < nearestKm) {
          nearestKm = km;
          nearest = provider;
        }
      });

      return nearest;
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

      if (!addressText) {
        latestDistanceKm = null;
        transportFeeValue = 0;
        setTransportFeeDisplay(null, {
          displayText: "Nhập địa chỉ để tính giá",
        });
        updateTotalPrice();
        if (addressInput) {
          delete addressInput.dataset.lat;
          delete addressInput.dataset.lng;
        }
        return;
      }

      const token = ++transportCalcToken;
      setTransportFeeDisplay(null, { pending: true });

      try {
        const customerCoords = await geocodeAddress(addressText);
        
        if (addressInput) {
          addressInput.dataset.lat = customerCoords.lat;
          addressInput.dataset.lng = customerCoords.lng;
        }

        const latDisplay = document.getElementById("latDisplay");
        const lngDisplay = document.getElementById("lngDisplay");
        const toaDoHienThi = document.getElementById("toaDoHienThi");
        if(latDisplay && lngDisplay && toaDoHienThi) {
          latDisplay.innerText = `Lat: ${customerCoords.lat.toFixed(6)}`;
          lngDisplay.innerText = `Lng: ${customerCoords.lng.toFixed(6)}`;
          toaDoHienThi.style.setProperty('display', 'flex', 'important');
        }

        providerLocation = findNearestProviderLocation(customerCoords);

        if (
          !providerLocation ||
          !isValidCoordinate(providerLocation.lat) ||
          !isValidCoordinate(providerLocation.lng)
        ) {
          throw new Error("Khong tim thay nha cung cap co id_dichvu = 8");
        }

        let distanceKm;
        let distanceSuffix = "";
        try {
          distanceKm = await getRoadDistanceKm(providerLocation, customerCoords);
          distanceSuffix = `${distanceKm.toFixed(1)} km`;
        } catch (_routeError) {
          distanceKm = haversineDistanceKm(providerLocation, customerCoords);
          distanceSuffix = `${distanceKm.toFixed(1)} km ước tính`;
        }

        if (token !== transportCalcToken && !force) {
          return;
        }

        latestDistanceKm = distanceKm;
        const calculated = calculateTransportFee(distanceKm);
        transportFeeValue = calculated;
        setTransportFeeDisplay(calculated, {
          suffix: distanceSuffix,
        });
      } catch (error) {
        if (token !== transportCalcToken && !force) {
          return;
        }

        latestDistanceKm = null;
        transportFeeValue = 0;
        setTransportFeeDisplay(0, { suffix: "lỗi tính" });
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
      const vType = vehicleTypesData.find((v) => v.type === type);
      return vType?.survey_fees || 0;
    }

    function getCurrentSurveyFee() {
      if (!vehicleType || !vehicleType.value) return 0;
      return getSurveyFeeByVehicleType(vehicleType.value);
    }

    setTransportFeeDisplay(null);
    updateEstimateVisibility();

    const providerPromise = loadProviderLocations().catch((error) => {
      console.error(error);
      providerLocations = [];
      providerLocation = null;
    });

    const servicesPromise = loadBookingFormData()
      .then(() => {
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
      })
      .catch((err) => console.error("Lỗi load dữ liệu đặt lịch:", err));

    Promise.all([servicesPromise, providerPromise]).finally(() => {
      recalculateTransportFee(true);
    });

    if (serviceSelect) {
      serviceSelect.addEventListener("change", function () {
        updateEstimateVisibility();
        resetSelect(vehicleType, "Chọn loại xe");
        resetSelect(brandSelect, "Chọn hãng");
        resetSelect(itemSelect, "Chọn mẫu xe");
        ensureOtherBrandOption();
        ensureOtherModelOption();
        toggleCustomBrandInput(false);
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
        ensureOtherBrandOption();
        ensureOtherModelOption();
        toggleCustomBrandInput(false);
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

        ensureOtherBrandOption();
      });
    }

    if (brandSelect) {
      brandSelect.addEventListener("change", function () {
        resetSelect(itemSelect, "Chọn mẫu xe");
        toggleCustomBrandInput();
        toggleCustomItemInput(false);
        clearPrice();

        if (String(this.value) === "__other__") {
          ensureOtherModelOption();
          return;
        }

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
        toggleCustomItemInput();
        updateTotalPrice();
      });
    }

    if (customItemInput) {
      customItemInput.addEventListener("input", function () {
        if (String(itemSelect?.value || "") !== "__other__") return;
        updateTotalPrice();
      });
    }

    if (customBrandInput) {
      customBrandInput.addEventListener("input", function () {
        if (String(brandSelect?.value || "") !== "__other__") return;
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

    if (yeucaugapInput) {
      yeucaugapInput.addEventListener("change", function() {
        if (yeucaugapInput.checked) {
          // If urgent, disable datetime input and set to now? 
          // Actually user just said "ignore time factor"
        }
        updateTotalPrice();
        recalculateTransportFee();
      });
    }

    if (datetimeInput) {
        datetimeInput.addEventListener("change", function() {
            recalculateTransportFee();
        });
    }

    function resetSelect(select, placeholder) {
      if (!select) return;
      select.innerHTML = `<option value="">${placeholder}</option>`;
    }

    function clearPrice() {
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
    ensureOtherBrandOption();
    ensureOtherModelOption();
    toggleCustomBrandInput(false);
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
          ensureOtherBrandOption();
          ensureOtherModelOption();
          toggleCustomBrandInput(false);
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
