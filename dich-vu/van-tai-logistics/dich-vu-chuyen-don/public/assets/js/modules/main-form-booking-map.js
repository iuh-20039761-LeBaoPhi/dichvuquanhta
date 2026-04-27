// Tách riêng bản đồ đặt lịch và dự báo thời tiết để main-forms gọn hơn.
const bookingWeatherCache = new Map();
const BOOKING_DEFAULT_SLOT_STARTS = [
  { value: "08:00", hour: 8, minute: 0 },
  { value: "13:30", hour: 13, minute: 30 },
  { value: "17:00", hour: 17, minute: 0 },
  { value: "21:00", hour: 21, minute: 0 },
];

  function formatLatLng(lat, lng) {
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return "";
    return `${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`;
  }

  function getBookingWeatherTarget(scope) {
    const fromLat = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_di_lat']")?.value || 0,
    );
    const fromLng = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_di_lng']")?.value || 0,
    );
    const toLat = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_den_lat']")?.value || 0,
    );
    const toLng = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_den_lng']")?.value || 0,
    );

    const hasFrom = !!(fromLat && fromLng);
    const hasTo = !!(toLat && toLng);

    if (hasFrom && hasTo) {
      return {
        lat: (fromLat + toLat) / 2,
        lng: (fromLng + toLng) / 2,
        mode: "midpoint",
      };
    }

    if (hasFrom) return { lat: fromLat, lng: fromLng, mode: "pickup" };
    if (hasTo) return { lat: toLat, lng: toLng, mode: "delivery" };
    return null;
  }

  async function reverseGeocode(lat, lng) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } },
    );
    const data = await response.json();
    return String(data?.display_name || "").trim();
  }

  async function geocodeAddress(address) {
    const query = String(address || "").trim();
    if (!query) return null;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=1`,
      { headers: { Accept: "application/json" } },
    );
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: String(data[0].display_name || "").trim(),
    };
  }

  async function fetchBookingWeatherForecast(lat, lng, dateValue) {
    const cacheKey = `${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}:${dateValue}`;
    if (!bookingWeatherCache.has(cacheKey)) {
      const request = fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&hourly=precipitation,rain,weather_code&daily=rain_sum,precipitation_hours,weather_code&timezone=auto&start_date=${encodeURIComponent(dateValue)}&end_date=${encodeURIComponent(dateValue)}`,
        { headers: { Accept: "application/json" } },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Weather request failed: ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          bookingWeatherCache.delete(cacheKey);
          throw error;
        });

      bookingWeatherCache.set(cacheKey, request);
    }

    return bookingWeatherCache.get(cacheKey);
  }

  function isRainWeatherCode(code) {
    return [
      51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85,
      86, 95, 96, 99,
    ].includes(Number(code));
  }

  function getBookingWeatherHours(dateValue, timeSlot, forecast) {
    const times = Array.isArray(forecast?.hourly?.time) ? forecast.hourly.time : [];
    const precipitation = Array.isArray(forecast?.hourly?.precipitation)
      ? forecast.hourly.precipitation
      : [];
    const rain = Array.isArray(forecast?.hourly?.rain) ? forecast.hourly.rain : [];
    const weatherCodes = Array.isArray(forecast?.hourly?.weather_code)
      ? forecast.hourly.weather_code
      : [];

    const ranges = {
      sang: [8, 11],
      chieu: [13, 17],
      toi: [17, 21],
      dem: [21, 23],
    };
    const range = ranges[String(timeSlot || "").trim()] || null;

    return times
      .map((time, index) => ({
        time: String(time || ""),
        hour: Number(String(time || "").slice(11, 13)),
        precipitation: Number(precipitation[index] || 0),
        rain: Number(rain[index] || 0),
        weatherCode: Number(weatherCodes[index] || 0),
      }))
      .filter((item) => item.time.startsWith(`${dateValue}T`))
      .filter((item) => (!range ? true : item.hour >= range[0] && item.hour <= range[1]));
  }

  function inferBookingWeatherValue(dateValue, timeSlot, forecast) {
    const slotHours = getBookingWeatherHours(dateValue, timeSlot, forecast);
    const hasSlotRain = slotHours.some(
      (item) =>
        item.precipitation > 0.1 ||
        item.rain > 0.1 ||
        isRainWeatherCode(item.weatherCode),
    );
    if (hasSlotRain) return "troi_mua";

    const dailyRainSum = Number(forecast?.daily?.rain_sum?.[0] || 0);
    const dailyPrecipitationHours = Number(
      forecast?.daily?.precipitation_hours?.[0] || 0,
    );
    const dailyWeatherCode = Number(forecast?.daily?.weather_code?.[0] || 0);

    if (
      dailyRainSum > 0.2 ||
      dailyPrecipitationHours > 0 ||
      isRainWeatherCode(dailyWeatherCode)
    ) {
      return "troi_mua";
    }

    return "binh_thuong";
  }

  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateInputValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function buildSlotDate(baseDate, slot) {
    const slotDate = new Date(baseDate);
    slotDate.setHours(slot.hour, slot.minute, 0, 0);
    return slotDate;
  }

  function getRecommendedBookingSchedule(now = new Date()) {
    const minLeadTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const preferredUpperBound = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const candidates = [];

    for (let dayOffset = 0; dayOffset <= 2; dayOffset += 1) {
      const baseDate = new Date(now);
      baseDate.setHours(0, 0, 0, 0);
      baseDate.setDate(baseDate.getDate() + dayOffset);

      BOOKING_DEFAULT_SLOT_STARTS.forEach((slot) => {
        const slotDate = buildSlotDate(baseDate, slot);
        if (slotDate.getTime() < minLeadTime.getTime()) return;
        candidates.push({
          date: formatDateInputValue(baseDate),
          slot: slot.value,
          slotDate,
        });
      });
    }

    if (!candidates.length) {
      const fallbackDate = new Date(now);
      fallbackDate.setDate(fallbackDate.getDate() + 1);
      fallbackDate.setHours(0, 0, 0, 0);
      return {
        date: formatDateInputValue(fallbackDate),
        slot: "08:00",
      };
    }

    const preferredCandidate = candidates.find(
      (candidate) => candidate.slotDate.getTime() <= preferredUpperBound.getTime(),
    );
    const resolvedCandidate = preferredCandidate || candidates[0];

    return {
      date: resolvedCandidate.date,
      slot: resolvedCandidate.slot,
    };
  }

  function getMaxForecastDateString() {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 15);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, "0");
    const day = String(maxDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderBookingMapPreview(scope) {
    const fromInput = scope.querySelector("#dia-chi-di-dat-lich");
    const toInput = scope.querySelector("#dia-chi-den-dat-lich");
    const fromOutput = scope.querySelector(
      "[data-vi-tri-ban-do-dat-lich='diem_di']",
    );
    const toOutput = scope.querySelector(
      "[data-vi-tri-ban-do-dat-lich='diem_den']",
    );
    const fromLatInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_di_lat']",
    );
    const fromLngInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_di_lng']",
    );
    const toLatInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_den_lat']",
    );
    const toLngInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_den_lng']",
    );

    if (!fromInput || !toInput || !fromOutput || !toOutput) return;

    const fromText = String(fromInput.value || "").trim();
    const toText = String(toInput.value || "").trim();
    const fromCoordText = formatLatLng(fromLatInput?.value, fromLngInput?.value);
    const toCoordText = formatLatLng(toLatInput?.value, toLngInput?.value);

    fromOutput.textContent =
      fromText || fromCoordText || "Đang chờ xác nhận vị trí điểm đi.";
    toOutput.textContent =
      toText || toCoordText || "Đang chờ xác nhận vị trí điểm đến.";
  }

  function syncBookingExecutionDateLimits(scope) {
    const dateInput = scope.querySelector("#ngay-thuc-hien-dat-lich");
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    if (!dateInput) return;
    dateInput.min = getTodayDateString();

    const recommendedSchedule = getRecommendedBookingSchedule();

    if (!String(dateInput.value || "").trim()) {
      dateInput.value = recommendedSchedule.date;
    }

    if (timeSelect && !String(timeSelect.value || "").trim()) {
      timeSelect.value = recommendedSchedule.slot;
    }
  }

  // Tự suy ra thời tiết theo ngày, giờ và vị trí hiện tại của tuyến đường đặt lịch.
  async function refreshBookingWeather(scope, deps) {
    const { renderFormSummaries, renderBookingPricing, getSelectedLabel } = deps;
    if (!scope.querySelector(".form-dat-lich")) return;

    const dateInput = scope.querySelector("#ngay-thuc-hien-dat-lich");
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const weatherSelect = scope.querySelector("#thoi-tiet-du-kien-dat-lich");
    const weatherHiddenInput = scope.querySelector(
      "#thoi-tiet-du-kien-dat-lich-gui",
    );
    const weatherOutput = scope.querySelector("[data-thoi-tiet-tu-dong-dat-lich]");
    const weatherValueOutput = scope.querySelector(
      "[data-thoi-tiet-tu-dong-gia-tri]",
    );
    const weatherStateOutput = scope.querySelector(
      "[data-thoi-tiet-tu-dong-trang-thai]",
    );
    if (!dateInput || !weatherSelect || !weatherOutput) return;

    function applyWeatherValue(value, stateLabel) {
      weatherSelect.value = value;
      if (weatherHiddenInput) weatherHiddenInput.value = value;
      if (weatherValueOutput) {
        weatherValueOutput.textContent = value
          ? getSelectedLabel(weatherSelect) || "Chưa có dữ liệu"
          : "Chưa có dữ liệu";
      }
      if (weatherStateOutput && stateLabel) {
        weatherStateOutput.textContent = stateLabel;
      }
    }

    const dateValue = String(dateInput.value || "").trim();
    const timeValue = String(timeSelect?.value || "").trim();
    const target = getBookingWeatherTarget(scope);
    const today = getTodayDateString();
    const maxForecastDate = getMaxForecastDateString();

    if (!dateValue) {
      applyWeatherValue("", "Dự báo tự động");
      weatherOutput.textContent =
        "Chọn ngày thực hiện để hệ thống tự lấy dự báo thời tiết.";
      return;
    }

    if (dateValue < today) {
      applyWeatherValue("", "Không hỗ trợ");
      weatherOutput.textContent =
        "Ngày thực hiện đang ở quá khứ nên không thể lấy forecast thời tiết tự động.";
      return;
    }

    if (dateValue > maxForecastDate) {
      applyWeatherValue("", "Chưa đến phạm vi forecast");
      weatherOutput.textContent =
        "Ngày này đang vượt phạm vi dự báo thời tiết ngắn hạn. Hệ thống sẽ tự kiểm tra lại khi lịch gần hơn.";
      return;
    }

    if (!target) {
      applyWeatherValue("", "Dự báo tự động");
      weatherOutput.textContent =
        "Ghim ít nhất một vị trí trên bản đồ để hệ thống tự lấy thời tiết cho ngày thực hiện.";
      return;
    }

    applyWeatherValue("", "Đang kiểm tra");
    weatherOutput.textContent =
      "Đang lấy dự báo thời tiết từ Open-Meteo cho lịch trình bạn đã chọn...";
    const requestKey = `${dateValue}:${timeValue}:${target.lat.toFixed(4)}:${target.lng.toFixed(4)}`;
    weatherOutput.dataset.requestKey = requestKey;

    try {
      const forecast = await fetchBookingWeatherForecast(
        target.lat,
        target.lng,
        dateValue,
      );
      if (weatherOutput.dataset.requestKey !== requestKey) return;

      const inferredValue = inferBookingWeatherValue(dateValue, timeValue, forecast);
      applyWeatherValue(inferredValue, "Dự báo tự động");
      renderFormSummaries(scope);
      renderBookingPricing(scope);

      const locationLabel =
        target.mode === "midpoint"
          ? "điểm giữa lộ trình"
          : target.mode === "pickup"
            ? "điểm đi"
            : "điểm đến";
      weatherOutput.textContent =
        inferredValue === "troi_mua"
          ? `Dự báo có mưa tại ${locationLabel} vào ngày đã chọn. Hệ thống đã tự chuyển sang “Trời mưa”.`
          : `Dự báo thời tiết ổn định tại ${locationLabel} vào ngày đã chọn. Hệ thống đang để “Bình thường”.`;
    } catch (error) {
      if (weatherOutput.dataset.requestKey !== requestKey) return;
      console.warn("Booking weather forecast failed:", error);
      applyWeatherValue("", "Chưa lấy được");
      weatherOutput.textContent =
        "Chưa lấy được dự báo thời tiết tự động. Hệ thống sẽ chưa cộng phụ phí thời tiết cho đến khi có dữ liệu.";
    }
  }

  // Khởi tạo bản đồ đặt lịch, đồng bộ tuyến đường, quãng đường và thời tiết tự động.
  function initBookingMap(scope, deps) {
    const {
      renderFormSummaries,
      renderBookingPricing,
      getSelectedLabel,
      calculateDistanceKm,
    } = deps;
    if (!scope.querySelector(".form-dat-lich") || !window.L) return;

    const mapElement = scope.querySelector("#ban-do-dat-lich");
    const fromInput = scope.querySelector("#dia-chi-di-dat-lich");
    const toInput = scope.querySelector("#dia-chi-den-dat-lich");
    const fromLatInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_di_lat']",
    );
    const fromLngInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_di_lng']",
    );
    const toLatInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_den_lat']",
    );
    const toLngInput = scope.querySelector(
      "[data-ban-do-dat-lich-toa-do='diem_den_lng']",
    );
    const statusOutput = scope.querySelector("[data-trang-thai-ban-do-dat-lich]");
    const distanceBadge = scope.querySelector("[data-khoang-cach-dat-lich]");
    const distanceValue = scope.querySelector(
      "[data-gia-tri-khoang-cach-dat-lich]",
    );
    const currentButton = scope.querySelector(
      "[data-ban-do-dat-lich-hanh-dong='vi-tri-hien-tai']",
    );

    if (
      !mapElement ||
      !fromInput ||
      !toInput ||
      !fromLatInput ||
      !fromLngInput ||
      !toLatInput ||
      !toLngInput
    ) {
      return;
    }
    if (mapElement.dataset.mapReady === "true") return;

    mapElement.dataset.mapReady = "true";

    const defaultCenter = [10.762622, 106.660172];
    const map = window.L.map(mapElement).setView(defaultCenter, 12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    function createPinIcon(fill) {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
          <path fill="${fill}" d="M16 1C7.2 1 0 8.2 0 17c0 12.2 13.4 28.4 15.1 30.4.5.6 1.4.6 1.9 0C18.6 45.4 32 29.2 32 17 32 8.2 24.8 1 16 1z"/>
          <circle cx="16" cy="17" r="7.2" fill="#fff"/>
        </svg>
      `.trim();

      return window.L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        iconSize: [32, 48],
        iconAnchor: [16, 47],
        tooltipAnchor: [0, -34],
      });
    }

    const fromMarker = window.L.marker(defaultCenter, {
      draggable: true,
      icon: createPinIcon("#1b4332"),
    })
      .addTo(map)
      .bindTooltip("<div>Điểm đi</div>", {
        permanent: true,
        direction: "top",
        offset: [0, -30],
        className: "map-marker-tooltip map-marker-tooltip--survey",
      });

    const toMarker = window.L.marker(
      [defaultCenter[0] - 0.01, defaultCenter[1] - 0.01],
      {
        draggable: true,
        icon: createPinIcon("#dc2626"),
      },
    )
      .addTo(map)
      .bindTooltip("<div>Điểm đến</div>", {
        permanent: true,
        direction: "top",
        offset: [0, -30],
        className: "map-marker-tooltip map-marker-tooltip--destination",
      });

    const connectionLine = window.L.polyline([], {
      color: "#1b4332",
      weight: 4,
      opacity: 0.72,
      dashArray: "10 8",
      lineCap: "round",
    }).addTo(map);

    function getPointConfig(point) {
      if (point === "diem_den") {
        return {
          input: toInput,
          latInput: toLatInput,
          lngInput: toLngInput,
          marker: toMarker,
          geocodeStatus: "Đang cập nhật địa chỉ điểm đến từ bản đồ...",
          successStatus: "Đã cập nhật điểm đến từ vị trí trên bản đồ.",
          fallbackStatus:
            "Đã chọn vị trí điểm đến trên bản đồ, nhưng chưa thể tự động đọc ra địa chỉ.",
        };
      }

      return {
        input: fromInput,
        latInput: fromLatInput,
        lngInput: fromLngInput,
        marker: fromMarker,
        geocodeStatus: "Đang cập nhật địa chỉ điểm đi từ bản đồ...",
        successStatus: "Đã cập nhật điểm đi từ vị trí trên bản đồ.",
        fallbackStatus:
          "Đã chọn vị trí điểm đi trên bản đồ, nhưng chưa thể tự động đọc ra địa chỉ.",
      };
    }

    function hasPoint(latInput, lngInput) {
      return Boolean(
        String(latInput?.value || "").trim() && String(lngInput?.value || "").trim(),
      );
    }

    function updateDistanceAndRoute() {
      const hasFrom = hasPoint(fromLatInput, fromLngInput);
      const hasTo = hasPoint(toLatInput, toLngInput);

      if (!hasFrom || !hasTo) {
        connectionLine.setLatLngs([]);
        if (distanceBadge) distanceBadge.hidden = true;
        return;
      }

      const fromLatLng = fromMarker.getLatLng();
      const toLatLng = toMarker.getLatLng();
      connectionLine.setLatLngs([fromLatLng, toLatLng]);

      const km = calculateDistanceKm(
        fromLatLng.lat,
        fromLatLng.lng,
        toLatLng.lat,
        toLatLng.lng,
      );
      if (distanceValue) {
        distanceValue.textContent = km.toFixed(km >= 10 ? 0 : 1);
      }
      if (distanceBadge) distanceBadge.hidden = false;
    }

    function updateMapBounds() {
      const hasFrom = hasPoint(fromLatInput, fromLngInput);
      const hasTo = hasPoint(toLatInput, toLngInput);

      if (hasFrom && hasTo) {
        const group = new window.L.featureGroup([fromMarker, toMarker]);
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 16 });
        return;
      }

      if (hasFrom) {
        map.setView(fromMarker.getLatLng(), 15);
        return;
      }

      if (hasTo) {
        map.setView(toMarker.getLatLng(), 15);
        return;
      }

      map.setView(defaultCenter, 12);
    }

    scope.__bookingMapState = { map, updateMapBounds };

    function refreshWeather() {
      return refreshBookingWeather(scope, {
        renderFormSummaries,
        renderBookingPricing,
        getSelectedLabel,
      });
    }

    function setPointCoords(point, lat, lng) {
      const config = getPointConfig(point);
      config.latInput.value = String(lat);
      config.lngInput.value = String(lng);
      renderBookingMapPreview(scope);
      renderFormSummaries(scope);
      updateDistanceAndRoute();
      renderBookingPricing(scope);
      refreshWeather();
    }

    function clearPoint(point) {
      const config = getPointConfig(point);
      config.latInput.value = "";
      config.lngInput.value = "";
      renderBookingMapPreview(scope);
      renderFormSummaries(scope);
      updateDistanceAndRoute();
      renderBookingPricing(scope);
      updateMapBounds();
      refreshWeather();
    }

    async function moveMarker(point, lat, lng, options = {}) {
      const shouldReverse = options.shouldReverse !== false;
      const shouldWriteAddress = options.shouldWriteAddress !== false;
      const shouldReframe = options.shouldReframe !== false;
      const config = getPointConfig(point);

      config.marker.setLatLng([lat, lng]);
      setPointCoords(point, lat, lng);

      if (shouldReframe) {
        updateMapBounds();
      }

      if (!shouldReverse) return;

      if (statusOutput) {
        statusOutput.textContent = config.geocodeStatus;
      }

      try {
        const label = await reverseGeocode(lat, lng);
        if (label && shouldWriteAddress) {
          config.input.value = label;
        }
        renderBookingMapPreview(scope);
        if (statusOutput) {
          statusOutput.textContent = label
            ? config.successStatus
            : "Đã cập nhật vị trí trên bản đồ.";
        }
      } catch (error) {
        console.warn("Booking reverse geocode failed:", error);
        if (statusOutput) {
          statusOutput.textContent = config.fallbackStatus;
        }
      }
    }

    function setCurrentButtonLoading(isLoading) {
      if (!currentButton) return;
      if (!currentButton.dataset.originalLabel) {
        currentButton.dataset.originalLabel = currentButton.textContent || "";
      }

      currentButton.disabled = isLoading;
      currentButton.textContent = isLoading
        ? "Đang lấy vị trí..."
        : currentButton.dataset.originalLabel;
    }

    function requestCurrentLocation(options = {}) {
      const silent = options.silent === true;
      if (!navigator.geolocation) {
        if (!silent && statusOutput) {
          statusOutput.textContent =
            "Thiết bị này không hỗ trợ lấy vị trí hiện tại. Bạn có thể nhập địa chỉ hoặc kéo ghim điểm đi.";
        }
        return;
      }

      if (!silent && statusOutput) {
        statusOutput.textContent = "Đang lấy vị trí hiện tại cho điểm đi...";
      }
      setCurrentButtonLoading(true);

      navigator.geolocation.getCurrentPosition(
        function (position) {
          moveMarker("diem_di", position.coords.latitude, position.coords.longitude, {
            shouldReverse: true,
          }).finally(function () {
            setCurrentButtonLoading(false);
            if (silent && statusOutput) {
              statusOutput.textContent =
                "Đã cập nhật nhanh điểm đi theo vị trí hiện tại.";
            }
          });
        },
        function () {
          setCurrentButtonLoading(false);
          if (!silent && statusOutput) {
            statusOutput.textContent =
              "Không lấy được vị trí hiện tại. Bạn có thể nhập địa chỉ hoặc kéo ghim điểm đi để chỉnh thủ công.";
          }
        },
        { timeout: 10000 },
      );
    }

    currentButton?.addEventListener("click", function () {
      requestCurrentLocation({ silent: false });
    });

    fromMarker.on("dragend", function () {
      const latlng = fromMarker.getLatLng();
      moveMarker("diem_di", latlng.lat, latlng.lng, { shouldReverse: true });
    });

    toMarker.on("dragend", function () {
      const latlng = toMarker.getLatLng();
      moveMarker("diem_den", latlng.lat, latlng.lng, { shouldReverse: true });
    });

    map.on("click", function (event) {
      const latlng = event.latlng;
      const hasFrom = hasPoint(fromLatInput, fromLngInput);
      const hasTo = hasPoint(toLatInput, toLngInput);
      let targetPoint = "diem_di";

      if (hasFrom && !hasTo) {
        targetPoint = "diem_den";
      } else if (hasFrom && hasTo) {
        const fromDistance = fromMarker.getLatLng().distanceTo(latlng);
        const toDistance = toMarker.getLatLng().distanceTo(latlng);
        targetPoint = fromDistance <= toDistance ? "diem_di" : "diem_den";
      }

      if (statusOutput) {
        statusOutput.textContent =
          targetPoint === "diem_di"
            ? "Đang đặt nhanh ghim điểm đi theo vị trí bạn vừa bấm trên bản đồ..."
            : "Đang đặt nhanh ghim điểm đến theo vị trí bạn vừa bấm trên bản đồ...";
      }

      moveMarker(targetPoint, latlng.lat, latlng.lng, {
        shouldReverse: true,
      });
    });

    let fromTimer = null;
    let toTimer = null;

    fromInput.addEventListener("input", function () {
      clearTimeout(fromTimer);
      const query = String(fromInput.value || "").trim();

      if (!query) {
        clearPoint("diem_di");
        if (statusOutput) {
          statusOutput.textContent =
            "Bạn có thể nhập lại địa chỉ điểm đi hoặc kéo ghim xanh để xác định vị trí.";
        }
        return;
      }

      fromTimer = window.setTimeout(async function () {
        try {
          if (statusOutput) {
            statusOutput.textContent =
              "Đang dò vị trí điểm đi từ địa chỉ bạn vừa nhập...";
          }

          const result = await geocodeAddress(query);
          if (!result) {
            if (statusOutput) {
              statusOutput.textContent =
                "Chưa tìm thấy điểm đi khớp hoàn toàn với địa chỉ này. Bạn có thể tinh lại địa chỉ hoặc kéo ghim xanh.";
            }
            return;
          }

          await moveMarker("diem_di", result.lat, result.lng, {
            shouldReverse: false,
          });

          if (statusOutput) {
            statusOutput.textContent =
              "Đã ghim điểm đi theo địa chỉ bạn nhập. Bạn vẫn có thể kéo ghim để chỉnh lại chính xác hơn.";
          }
        } catch (error) {
          console.warn("Booking pickup geocode failed:", error);
          if (statusOutput) {
            statusOutput.textContent =
              "Chưa thể dò vị trí điểm đi từ địa chỉ. Bạn có thể kéo ghim xanh để chọn thủ công.";
          }
        }
      }, 600);
    });

    toInput.addEventListener("input", function () {
      clearTimeout(toTimer);
      const query = String(toInput.value || "").trim();

      if (!query) {
        clearPoint("diem_den");
        if (statusOutput) {
          statusOutput.textContent =
            "Bạn có thể nhập lại địa chỉ điểm đến hoặc kéo ghim đỏ để chỉnh vị trí.";
        }
        return;
      }

      toTimer = window.setTimeout(async function () {
        try {
          if (statusOutput) {
            statusOutput.textContent =
              "Đang dò vị trí điểm đến từ địa chỉ bạn vừa nhập...";
          }

          const result = await geocodeAddress(query);
          if (!result) {
            if (statusOutput) {
              statusOutput.textContent =
                "Chưa tìm thấy điểm đến khớp hoàn toàn với địa chỉ này. Bạn có thể tinh lại địa chỉ hoặc kéo ghim đỏ.";
            }
            return;
          }

          await moveMarker("diem_den", result.lat, result.lng, {
            shouldReverse: false,
          });

          if (statusOutput) {
            statusOutput.textContent =
              "Đã ghim điểm đến theo địa chỉ bạn nhập. Bạn vẫn có thể kéo ghim để chỉnh lại chính xác hơn.";
          }
        } catch (error) {
          console.warn("Booking delivery geocode failed:", error);
          if (statusOutput) {
            statusOutput.textContent =
              "Chưa thể dò vị trí điểm đến từ địa chỉ. Bạn có thể kéo ghim đỏ để chọn thủ công.";
          }
        }
      }, 600);
    });

    clearPoint("diem_di");
    clearPoint("diem_den");
    updateMapBounds();
    requestCurrentLocation({ silent: true });

    window.setTimeout(function () {
      map.invalidateSize();
    }, 120);
  }

const bookingMapModule = {
  renderBookingMapPreview,
  syncBookingExecutionDateLimits,
  refreshBookingWeather,
  initBookingMap,
};

export {
  renderBookingMapPreview,
  syncBookingExecutionDateLimits,
  refreshBookingWeather,
  initBookingMap,
  bookingMapModule,
};
export default bookingMapModule;
