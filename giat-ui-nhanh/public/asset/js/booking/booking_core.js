(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});
  const state = app.state || {};
  const utils = app.utils || {};

  function initBookingModal() {
    const bookingModal = document.getElementById("bookingModal");
    if (bookingModal && bookingModal.dataset.bookingInitDone === "true") {
      return;
    }

    if (bookingModal) {
      bookingModal.dataset.bookingInitDone = "true";
      if (
        bookingModal.dataset.pendingServiceId &&
        !state.pendingQuickServiceId
      ) {
        state.pendingQuickServiceId = bookingModal.dataset.pendingServiceId;
      }
      if (bookingModal.dataset.pendingServiceId) {
        delete bookingModal.dataset.pendingServiceId;
      }
    }

    const serviceSelect = document.getElementById("dichvuquantam");
    const transportOptionSelect = document.getElementById("hinhthucnhangiao");
    const workItemsList = document.getElementById("danhsachcongviec");
    const chemicalsList = document.getElementById("danhsachhoachat");
    const workItemsGroup = workItemsList?.closest(".form-group");
    const chemicalsGroup = chemicalsList?.closest(".form-group");
    const bookingModalEl = document.getElementById("bookingModal");

    const kgBox = document.getElementById("khoiluongbox");
    const pairBox = document.getElementById("pairBox");

    const kgInput = document.getElementById("khoiluong");
    const pairInput = document.getElementById("pair");
    const quantityInput = document.getElementById("quantityContact");
    const bookingForm = document.getElementById("formdatdichvu");

    const priceInput = document.getElementById("giadichvu");
    const shipInput = document.getElementById("tiendichuyen");
    const shippingSurchargeInput = document.getElementById("phuphigiaonhan");
    const totalInput = document.getElementById("tongtien");
    const addressInput = document.getElementById("diachi");

    if (!serviceSelect) return;

    if (typeof utils.fillBookingTimeNow === "function") {
      utils.fillBookingTimeNow(false);
    }

    if (bookingForm && bookingForm.dataset.bookingTimeResetBound !== "true") {
      bookingForm.dataset.bookingTimeResetBound = "true";
      bookingForm.addEventListener("reset", function () {
        setTimeout(() => {
          if (typeof utils.fillBookingTimeNow === "function") {
            utils.fillBookingTimeNow(true);
          }
        }, 0);
      });
    }

    let transportFee = 0;
    shipInput.value = transportFee.toLocaleString("vi-VN");

    function setShippingSurchargeDisplay(value) {
      const rawValue = Math.max(0, Math.round(Number(value) || 0));
      if (!shippingSurchargeInput) return;

      shippingSurchargeInput.type = "text";
      shippingSurchargeInput.inputMode = "numeric";
      shippingSurchargeInput.readOnly = true;
      shippingSurchargeInput.dataset.rawValue = String(rawValue);
      shippingSurchargeInput.value = rawValue.toLocaleString("vi-VN");
    }

    if (shippingSurchargeInput) {
      setShippingSurchargeDisplay(0);
    }

    let services = [];
    let providerLocation = null;
    let latestDistanceKm = null;
    let latestDistanceSource = null;
    let transportCalcToken = 0;
    let addressCalcTimer = null;

    function ensureShippingDistanceNoteElement() {
      if (!shippingSurchargeInput) return null;

      let noteEl = document.getElementById("shippingDistanceNote");
      if (noteEl) return noteEl;

      noteEl = document.createElement("small");
      noteEl.id = "shippingDistanceNote";
      noteEl.className = "text-muted d-block mt-1";
      noteEl.textContent = "";

      shippingSurchargeInput.insertAdjacentElement("afterend", noteEl);
      return noteEl;
    }

    const shippingDistanceNoteEl = ensureShippingDistanceNoteElement();

    function setShippingDistanceDisplay(distanceKm, source = null) {
      if (!shippingDistanceNoteEl) return;

      if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
        shippingDistanceNoteEl.textContent = "";
        return;
      }

      const suffix =
        source === "fallback"
          ? " (ước tính theo tọa độ)"
          : " (quãng đường thực tế)";

      shippingDistanceNoteEl.textContent = `Quãng đường: ${distanceKm.toFixed(1)} km${suffix}`;
    }

    function isValidCoordinate(value) {
      return typeof value === "number" && Number.isFinite(value);
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

    function getCachedCustomerCoords() {
      if (!addressInput) return null;

      const currentAddress = String(addressInput.value || "").trim();
      const coordAddress = String(
        addressInput.dataset.coordAddress || "",
      ).trim();
      const lat = Number(addressInput.dataset.lat);
      const lng = Number(addressInput.dataset.lng);

      if (!currentAddress || !coordAddress || currentAddress !== coordAddress) {
        return null;
      }

      if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
        return null;
      }

      return { lat, lng };
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

    async function recalculateRoadDistance(force = false) {
      const addressText = (addressInput?.value || "").trim();

      if (!addressText) {
        latestDistanceKm = null;
        latestDistanceSource = null;
        calculate();
        return;
      }

      const token = ++transportCalcToken;

      try {
        if (
          !providerLocation ||
          !isValidCoordinate(providerLocation.lat) ||
          !isValidCoordinate(providerLocation.lng)
        ) {
          throw new Error("Thiếu tọa độ nhà cung cấp");
        }

        const customerCoords =
          getCachedCustomerCoords() || (await geocodeAddress(addressText));
        let distanceKm;

        try {
          distanceKm = await getRoadDistanceKm(
            providerLocation,
            customerCoords,
          );
          latestDistanceSource = "road";
        } catch (_routeError) {
          distanceKm = haversineDistanceKm(providerLocation, customerCoords);
          latestDistanceSource = "fallback";
        }

        if (token !== transportCalcToken && !force) {
          return;
        }

        latestDistanceKm = distanceKm;
      } catch (error) {
        if (token !== transportCalcToken && !force) {
          return;
        }

        latestDistanceKm = null;
        latestDistanceSource = null;
        console.error(error);
      } finally {
        if (token === transportCalcToken || force) {
          calculate();
        }
      }
    }

    function scheduleRecalculateRoadDistance(delay = 700) {
      if (addressCalcTimer) {
        clearTimeout(addressCalcTimer);
      }

      addressCalcTimer = setTimeout(() => {
        recalculateRoadDistance();
      }, delay);
    }

    function toggleServiceOptionGroups(visible) {
      if (workItemsGroup) {
        workItemsGroup.style.display = visible ? "block" : "none";
      }
      if (chemicalsGroup) {
        chemicalsGroup.style.display = visible ? "block" : "none";
      }
    }

    toggleServiceOptionGroups(false);

    function renderCheckboxList(container, items, name) {
      if (!container) return;

      if (!items || !items.length) {
        container.innerHTML =
          '<span class="text-muted small">Không có dữ liệu.</span>';
        return;
      }

      const normalizeLabel = (text) =>
        String(text || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

      const lockAllOptions = name === "congviec";
      const mandatoryValue =
        name === "congviec"
          ? "giat"
          : name === "hoachathotro"
            ? "bot giat"
            : "";

      let html = "";
      items.forEach((item, index) => {
        const value = String(item);
        const inputId = `${name}${index}`;
        const isMandatory =
          lockAllOptions ||
          (mandatoryValue && normalizeLabel(value) === mandatoryValue);
        const checkedAttr = isMandatory ? "checked" : "";
        const mandatoryAttr = isMandatory ? 'data-mandatory="true"' : "";
        html += `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="${inputId}" name="${name}" value="${value}" ${checkedAttr} ${mandatoryAttr}>
            <label class="form-check-label" for="${inputId}">${value}</label>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function applyQuickServiceSelection(serviceId) {
      if (!serviceId || !serviceSelect) return false;

      const target = String(serviceId);
      const hasOption = Array.from(serviceSelect.options).some(
        (opt) => String(opt.value) === target,
      );

      if (!hasOption) return false;

      serviceSelect.value = target;
      serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (document.body.dataset.quickBookingBound !== "true") {
      document.body.dataset.quickBookingBound = "true";

      document.addEventListener("click", function (e) {
        const triggerBtn = e.target.closest("[data-service-id]");
        if (!triggerBtn) return;

        const serviceId = triggerBtn.dataset.serviceId;
        if (!serviceId) return;

        state.pendingQuickServiceId = serviceId;

        if (typeof utils.fillBookingTimeNow === "function") {
          utils.fillBookingTimeNow(true);
        }

        const modalEl = document.getElementById("bookingModal");
        if (modalEl) {
          bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
      });
    }

    if (document.body.dataset.bookingTimeAutoFillBound !== "true") {
      document.body.dataset.bookingTimeAutoFillBound = "true";

      document.addEventListener("click", function (e) {
        const trigger = e.target.closest(
          '[data-bs-target="#bookingModal"], [data-bs-toggle="modal"][href="#bookingModal"], a[href="#bookingModal"]',
        );
        if (!trigger) return;

        if (typeof utils.fillBookingTimeNow === "function") {
          utils.fillBookingTimeNow(true);
        }
      });
    }

    fetch("public/services.json")
      .then((res) => res.json())
      .then((data) => {
        const servicesData = Array.isArray(data)
          ? data
          : Array.isArray(data?.services)
            ? data.services
            : [];

        if (data && !Array.isArray(data)) {
          providerLocation = {
            lat: Number(data?.provider?.lat),
            lng: Number(data?.provider?.lng),
            address: data?.provider?.address || "",
          };
        }

        services = servicesData.filter((s) => s.price_unit !== "combo");

        services.forEach((service) => {
          const option = document.createElement("option");

          option.value = service.id;
          option.textContent = service.service_name;
          option.dataset.unit = service.price_unit;

          serviceSelect.appendChild(option);
        });

        if (state.pendingQuickServiceId) {
          if (applyQuickServiceSelection(state.pendingQuickServiceId)) {
            state.pendingQuickServiceId = null;
          }
        }

        recalculateRoadDistance(true);
      });

    if (bookingModalEl && !bookingModalEl.dataset.quickServiceSyncLoaded) {
      bookingModalEl.dataset.quickServiceSyncLoaded = "true";
      bookingModalEl.addEventListener("shown.bs.modal", function () {
        if (typeof utils.fillBookingTimeNow === "function") {
          utils.fillBookingTimeNow(true);
        }

        if (!state.pendingQuickServiceId) return;

        if (applyQuickServiceSelection(state.pendingQuickServiceId)) {
          state.pendingQuickServiceId = null;
        }
      });
    }

    serviceSelect.addEventListener("change", function () {
      const serviceId = Number(this.value);

      if (!serviceId) {
        transportOptionSelect.innerHTML =
          '<option value="">Chọn hình thức nhận / giao</option>';
        renderCheckboxList(workItemsList, [], "congviec");
        renderCheckboxList(chemicalsList, [], "hoachathotro");
        toggleServiceOptionGroups(false);

        kgInput.value = "";
        if (pairInput) pairInput.value = "";

        kgBox.style.display = "block";
        if (pairBox) pairBox.style.display = "none";

        priceInput.value = "";
        shipInput.value = "";
        totalInput.value = "";
        if (shippingSurchargeInput) {
          setShippingSurchargeDisplay(0);
        }
        setShippingDistanceDisplay(null);
        if (quantityInput) quantityInput.value = "1";
        return;
      }

      transportOptionSelect.innerHTML =
        '<option value="">Chọn hình thức nhận / giao</option>';

      const service = services.find((s) => s.id === serviceId);
      if (!service) return;

      (service.transport_options || []).forEach((transportOption) => {
        const option = document.createElement("option");
        option.value = transportOption.name;
        option.textContent = transportOption.name;
        option.dataset.price = Number(transportOption.price || 0);
        transportOptionSelect.appendChild(option);
      });

      if (transportOptionSelect.options.length > 1) {
        transportOptionSelect.selectedIndex = 1;
      }

      transportFee = Number(
        transportOptionSelect.options[transportOptionSelect.selectedIndex]
          ?.dataset.price || 0,
      );

      const servicePrice = Number(service.price || 0);
      priceInput.value = servicePrice.toLocaleString("vi-VN");
      renderCheckboxList(workItemsList, service.work_items || [], "congviec");
      renderCheckboxList(
        chemicalsList,
        service.support_chemicals || [],
        "hoachathotro",
      );
      toggleServiceOptionGroups(true);

      const unit = service.price_unit;

      kgInput.value = 1;
      if (pairInput) pairInput.value = 1;

      kgBox.style.display = "none";
      if (pairBox) pairBox.style.display = "none";

      if (unit === "kg") kgBox.style.display = "block";
      if (unit === "pair" && pairBox) pairBox.style.display = "block";

      if (quantityInput) {
        quantityInput.value =
          unit === "pair" && pairInput
            ? String(pairInput.value || 1)
            : String(kgInput.value || 1);
      }

      calculate();
    });

    transportOptionSelect.addEventListener("change", function () {
      const option = this.options[this.selectedIndex];

      if (!option.value) {
        shipInput.value = "";
        totalInput.value = "";
        if (shippingSurchargeInput) {
          setShippingSurchargeDisplay(0);
        }
        return;
      }

      transportFee = Number(option.dataset.price || 0);

      calculate();
    });

    function calculate() {
      const service = services.find(
        (s) => String(s.id) === serviceSelect.value,
      );
      if (!service) return;

      const price = Number(service.price || 0);

      let quantity = 1;

      if (kgBox.style.display === "block") quantity = Number(kgInput.value);
      if (pairBox && pairInput && pairBox.style.display === "block") {
        quantity = Number(pairInput.value);
      }

      if (quantityInput) {
        const normalizedQuantity =
          Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        quantityInput.value = String(normalizedQuantity);
      }

      const totalWeight =
        Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

      const isKgUnit = kgBox.style.display === "block";
      const baseServiceAmount = isKgUnit
        ? price + Math.max(0, totalWeight - 1) * 10000
        : price * totalWeight;
      const serviceAmount = baseServiceAmount;

      priceInput.value = Math.round(serviceAmount).toLocaleString("vi-VN");
      const distanceKm =
        Number.isFinite(latestDistanceKm) && latestDistanceKm > 0
          ? latestDistanceKm
          : 0;
      setShippingDistanceDisplay(distanceKm, latestDistanceSource);

      const selectedTransportName = String(
        transportOptionSelect.options[transportOptionSelect.selectedIndex]
          ?.value || "",
      )
        .toLowerCase()
        .trim();

      const extraTransportFee =
        totalWeight >= 50 && selectedTransportName !== "tự lấy" ? 5000 : 0;
      const effectiveTransportFee = transportFee + extraTransportFee;
      const shippingSurcharge =
        distanceKm > 0
          ? (distanceKm * effectiveTransportFee * (totalWeight / 20)) / 4
          : 0;
      const normalizedShippingSurcharge = Math.round(shippingSurcharge);

      shipInput.value = effectiveTransportFee.toLocaleString("vi-VN");
      if (shippingSurchargeInput) {
        setShippingSurchargeDisplay(normalizedShippingSurcharge);
      }

      const total =
        Math.round(serviceAmount) +
        effectiveTransportFee +
        normalizedShippingSurcharge;
      totalInput.value = total.toLocaleString("vi-VN");
    }

    kgInput.addEventListener("input", calculate);
    if (pairInput) pairInput.addEventListener("input", calculate);

    if (workItemsList && !workItemsList.dataset.priceSyncBound) {
      workItemsList.dataset.priceSyncBound = "true";
      workItemsList.addEventListener("change", function (event) {
        if (event.target && event.target.name === "congviec") {
          if (
            event.target.dataset.mandatory === "true" &&
            event.target.checked === false
          ) {
            event.target.checked = true;
          }
          calculate();
        }
      });
    }

    if (chemicalsList && !chemicalsList.dataset.lockMandatoryBound) {
      chemicalsList.dataset.lockMandatoryBound = "true";
      chemicalsList.addEventListener("change", function (event) {
        if (
          event.target &&
          event.target.name === "hoachathotro" &&
          event.target.dataset.mandatory === "true" &&
          event.target.checked === false
        ) {
          event.target.checked = true;
        }
      });
    }

    if (addressInput) {
      addressInput.addEventListener("input", function () {
        if (addressInput.dataset.coordAddress !== (addressInput.value || "")) {
          delete addressInput.dataset.lat;
          delete addressInput.dataset.lng;
          delete addressInput.dataset.coordAddress;
        }
        scheduleRecalculateRoadDistance();
      });
      addressInput.addEventListener("change", function () {
        scheduleRecalculateRoadDistance(200);
      });
      addressInput.addEventListener("blur", function () {
        scheduleRecalculateRoadDistance(0);
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
