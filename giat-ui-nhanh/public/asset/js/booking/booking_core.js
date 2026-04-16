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

    const kgInput = document.getElementById("khoiluong");
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

    // Hiển thị phụ phí giao hàng
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
    let providerLocations = [];
    let providerLocation = null;
    let latestDistanceKm = null;
    let latestDistanceSource = null;
    let transportCalcToken = 0;
    let addressCalcTimer = null;
    let transportOptions = [];

    // Đảm bảo phần ghi chú khoảng cách giao hàng tồn tại
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

    // Cập nhật hiển thị khoảng cách giao hàng
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

    // Kiểm tra tọa độ hợp lệ
    function isValidCoordinate(value) {
      return typeof value === "number" && Number.isFinite(value);
    }

    // Tính khoảng cách theo công thức Haversine (đường chim bay)
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

    // Kiểm tra xem ID dịch vụ có tồn tại trong chuỗi không
    function hasServiceId(rawServiceIds, targetServiceId) {
      const target = String(targetServiceId || "").trim();
      if (!target) return false;

      return String(rawServiceIds || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .includes(target);
    }

    // Phân tích trường dữ liệu danh sách
    function parseListField(value) {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }

      const raw = String(value || "").trim();
      if (!raw) return [];

      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => String(item || "").trim())
              .filter(Boolean);
          }
        } catch (_error) {}
      }

      return raw
        .split(/[,;\n|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    // Chuẩn hóa đơn vị dịch vụ
    function normalizeServiceUnit(value) {
      return String(value || "")
        .trim()
        .toLowerCase();
    }

    // Chuẩn hóa hàng dữ liệu dịch vụ
    function normalizeServiceRow(row) {
      return {
        id: String(row?.id || "").trim(),
        service_name: String(row?.tendichvu || "").trim(),
        price: Number(row?.giadichvu || 0) || 0,
        price_unit: normalizeServiceUnit(row?.donvi),
        work_items: parseListField(row?.congviec),
        support_chemicals: parseListField(row?.hoachat),
      };
    }

    // Chuẩn hóa hàng dữ liệu vận chuyển
    function normalizeTransportRow(row) {
      return {
        name: String(row?.tenphuongthuc || "").trim(),
        price: Math.max(0, Number(row?.giaphuongthuc || 0)),
      };
    }

    // Lấy danh sách hàng từ bảng CSDL
    async function listTableRows(tableName, limit = 3000) {
      if (window.DVQTKrud && typeof window.DVQTKrud.listTable === "function") {
        return window.DVQTKrud.listTable(tableName, { limit });
      }

      if (typeof window.krudList === "function") {
        const result = await window.krudList({
          table: tableName,
          limit,
        });
        return result?.data || (Array.isArray(result) ? result : []);
      }

      throw new Error("Không có API để đọc dữ liệu");
    }

    // Tải danh mục dịch vụ
    async function loadServiceCatalog() {
      const rows = await listTableRows("dichvu_giatuinhanh", 3000);
      services = (Array.isArray(rows) ? rows : [])
        .map(normalizeServiceRow)
        .filter((service) => service.id && service.service_name)
        .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }

    // Tải các tùy chọn vận chuyển
    async function loadTransportOptions() {
      const rows = await listTableRows("phuongthucgiaonhan", 3000);
      transportOptions = (Array.isArray(rows) ? rows : [])
        .map(normalizeTransportRow)
        .filter((item) => item.name);
    }

    // Lấy danh sách người dùng
    async function listNguoidungRows() {
      return listTableRows("nguoidung", 3000);
    }

    // Tải vị trí các nhà cung cấp
    async function loadProviderLocations() {
      const rows = await listNguoidungRows();

      providerLocations = (Array.isArray(rows) ? rows : [])
        .filter((row) => hasServiceId(row?.id_dichvu, "11"))
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

    // Tìm vị trí nhà cung cấp gần nhất
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

    // Lấy tọa độ khách hàng đã lưu trong cache (dataset)
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

    // Tra cứu tọa độ từ địa chỉ (Geocoding)
    async function geocodeAddress(address) {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(address)}`;
      const res = await fetch(endpoint, {
        headers: { "Accept-Language": "vi" },
      });

      if (!res.ok) {
        throw new Error("Không thể tra cứu tọa độ từ địa chỉ");
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

    // Lấy khoảng cách đường bộ thực tế từ OSRM
    async function getRoadDistanceKm(from, to) {
      const endpoint = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false&steps=false`;
      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error("Không thể lấy quãng đường bộ thực tế");
      }

      const data = await res.json();
      const route = data?.routes?.[0];

      if (!route || typeof route.distance !== "number") {
        throw new Error("Không có dữ liệu tuyến đường bộ");
      }

      return route.distance / 1000;
    }

    // Tính toán lại khoảng cách
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
        const customerCoords =
          getCachedCustomerCoords() || (await geocodeAddress(addressText));

        if (addressInput && customerCoords && !getCachedCustomerCoords()) {
          addressInput.dataset.lat = customerCoords.lat;
          addressInput.dataset.lng = customerCoords.lng;
          addressInput.dataset.coordAddress = addressText;

          const toaDoBadges = document.getElementById("toaDoHienThi");
          if (toaDoBadges) {
            toaDoBadges.innerHTML = `
              <span class="badge bg-info text-dark me-2 border border-info rounded-pill px-3 py-2 shadow-sm">
                <i class="fas fa-location-arrow me-1"></i> Lat: <strong>${customerCoords.lat.toFixed(6)}</strong>
              </span>
              <span class="badge bg-success text-white border border-success rounded-pill px-3 py-2 shadow-sm">
                <i class="fas fa-map-marker-alt me-1"></i> Lng: <strong>${customerCoords.lng.toFixed(6)}</strong>
              </span>
            `;
          }
        }

        providerLocation = findNearestProviderLocation(customerCoords);
        if (
          !providerLocation ||
          !isValidCoordinate(providerLocation.lat) ||
          !isValidCoordinate(providerLocation.lng)
        ) {
          throw new Error("Không tìm thấy nhà cung cấp (dịch vụ 11)");
        }

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
        console.error("Lỗi tính khoảng cách:", error);
      } finally {
        if (token === transportCalcToken || force) {
          calculate();
        }
      }
    }

    // Lên lịch tính toán lại khoảng cách (Debounce)
    function scheduleRecalculateRoadDistance(delay = 700) {
      if (addressCalcTimer) {
        clearTimeout(addressCalcTimer);
      }

      addressCalcTimer = setTimeout(() => {
        recalculateRoadDistance();
      }, delay);
    }

    // Ẩn/Hiện nhóm tùy chọn dịch vụ
    function toggleServiceOptionGroups(visible) {
      if (workItemsGroup) {
        workItemsGroup.style.display = visible ? "block" : "none";
      }
      if (chemicalsGroup) {
        chemicalsGroup.style.display = visible ? "block" : "none";
      }
    }

    toggleServiceOptionGroups(false);

    // Hiển thị danh sách checkbox (Công việc/Hóa chất)
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
        const wrapperClass = isMandatory
          ? "form-check is-mandatory"
          : "form-check";
        const checkedAttr = isMandatory ? "checked" : "";
        const mandatoryAttr = isMandatory ? 'data-mandatory="true"' : "";
        const disabledAttr = isMandatory ? 'disabled aria-disabled="true"' : "";
        html += `
          <div class="${wrapperClass}">
            <input class="form-check-input" type="checkbox" id="${inputId}" name="${name}" value="${value}" ${checkedAttr} ${mandatoryAttr} ${disabledAttr}>
            <label class="form-check-label" for="${inputId}">${value}</label>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    // Áp dụng chọn nhanh dịch vụ
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

    // Gắn sự kiện đặt lịch nhanh
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

    // Gắn sự kiện tự động điền thời gian
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

    // Tải dữ liệu ban đầu
    const servicesPromise = loadServiceCatalog()
      .then(() => {
        services.forEach((service) => {
          const option = document.createElement("option");

          option.value = String(service.id);
          option.textContent = service.service_name;
          option.dataset.unit = service.price_unit;

          serviceSelect.appendChild(option);
        });

        if (state.pendingQuickServiceId) {
          if (applyQuickServiceSelection(state.pendingQuickServiceId)) {
            state.pendingQuickServiceId = null;
          }
        }
      })
      .catch((error) => {
        console.error("Lỗi tải danh mục:", error);
        services = [];
      });

    const transportPromise = loadTransportOptions().catch((error) => {
      console.error("Lỗi tải hình thức vận chuyển:", error);
      transportOptions = [];
    });

    const providerPromise = loadProviderLocations().catch((error) => {
      console.error("Lỗi tải vị trí đơn vị:", error);
      providerLocations = [];
      providerLocation = null;
    });

    Promise.all([servicesPromise, transportPromise, providerPromise]).finally(
      () => {
        recalculateRoadDistance(true);
      },
    );

    // Xử lý khi modal hiển thị
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

    // Sự kiện Thay đổi dịch vụ
    serviceSelect.addEventListener("change", function () {
      const serviceId = String(this.value || "").trim();

      if (!serviceId) {
        transportOptionSelect.innerHTML =
          '<option value="">Chọn hình thức nhận / giao</option>';
        renderCheckboxList(workItemsList, [], "congviec");
        renderCheckboxList(chemicalsList, [], "hoachathotro");
        toggleServiceOptionGroups(false);

        kgInput.value = "";
        kgBox.style.display = "block";

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

      const service = services.find((s) => String(s.id) === serviceId);
      if (!service) return;

      (transportOptions || []).forEach((transportOption) => {
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
      kgBox.style.display = "none";

      if (String(unit || "").toLowerCase() === "kg")
        kgBox.style.display = "block";

      if (quantityInput) {
        quantityInput.value = String(kgInput.value || 1);
      }

      calculate();
    });

    // Sự kiện Thay đổi hình thức vận chuyển
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

    // Hàm tính toán tổng tiền và các loại phí
    function calculate() {
      const service = services.find(
        (s) => String(s.id) === serviceSelect.value,
      );
      if (!service) return;

      const price = Number(service.price || 0);
      let quantity = 1;

      if (kgBox.style.display === "block") quantity = Number(kgInput.value);

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

    // Ràng buộc Thay đổi các hạng mục công việc
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

    // Ràng buộc Thay đổi các loại hóa chất
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

    // Sự kiện Thay đổi ô nhập Địa chỉ
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

    // Khởi tạo các module con
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
