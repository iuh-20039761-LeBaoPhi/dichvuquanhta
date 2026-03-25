(function (window, document) {
  if (window.__fastGoFormsInitDone) return;
  window.__fastGoFormsInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  const partialPaths = {
    "khao-sat": core.toPublicUrl("assets/partials/bieu-mau/form-khao-sat.html"),
    "dat-lich": core.toPublicUrl("assets/partials/bieu-mau/form-dat-lich.html"),
  };

  const bookingVehicleOptions = {
    chuyen_nha: {
      defaultValue: "xe_van_500kg",
      options: [
        { value: "xe_van_500kg", label: "Xe Van 500kg" },
        { value: "xe_tai_1_5_tan", label: "Xe Tải 1.5 Tấn" },
        { value: "xe_tai_2_5_tan", label: "Xe Tải 2.5 Tấn" },
      ],
    },
    chuyen_van_phong: {
      defaultValue: "xe_van_500kg",
      options: [
        { value: "xe_van_500kg", label: "Xe Van 500kg (VP)" },
        { value: "xe_tai_1_5_tan", label: "Xe Tải 1.5 Tấn (VP)" },
        { value: "xe_tai_2_5_tan", label: "Xe Tải 2.5 Tấn (VP)" },
      ],
    },
    chuyen_kho_bai: {
      defaultValue: "xe_tai_1_5_tan",
      options: [
        { value: "xe_tai_1_5_tan", label: "Xe Tải 1.5 Tấn (Kho)" },
        { value: "xe_tai_2_5_tan", label: "Xe Tải 2.5 Tấn (Kho)" },
        { value: "xe_tai_5_tan", label: "Xe Tải 5 Tấn (Kho)" },
      ],
    },
  };

  let pricingReferencePromise = null;
  const bookingWeatherCache = new Map();

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function loadPartial(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return xhr.responseText.trim();
      }
    } catch (error) {
      console.error("Cannot load form partial:", url, error);
    }
    return "";
  }

  function loadPricingReference() {
    if (!pricingReferencePromise) {
      pricingReferencePromise = fetch(
        core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json"),
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Cannot load pricing reference: ${response.status}`);
          }
          return response.json();
        })
        .catch((error) => {
          console.error("Cannot load pricing reference:", error);
          return [];
        });
    }

    return pricingReferencePromise;
  }

  function normalizeService(rawValue) {
    const value = String(rawValue || "").trim().toLowerCase();
    const map = {
      chuyen_nha: "chuyen_nha",
      "chuyen-nha": "chuyen_nha",
      moving_house: "chuyen_nha",
      chuyen_van_phong: "chuyen_van_phong",
      "chuyen-van-phong": "chuyen_van_phong",
      moving_office: "chuyen_van_phong",
      chuyen_kho_bai: "chuyen_kho_bai",
      "chuyen-kho-bai": "chuyen_kho_bai",
      moving_warehouse: "chuyen_kho_bai",
    };
    return map[value] || "";
  }

  function getPricingServiceId(rawValue) {
    const normalized = normalizeService(rawValue);
    const map = {
      chuyen_nha: "moving_house",
      chuyen_van_phong: "moving_office",
      chuyen_kho_bai: "moving_warehouse",
    };
    return map[normalized] || "";
  }

  function normalizePricingDataServiceId(rawValue) {
    const value = String(rawValue || "").trim().toLowerCase();
    const map = {
      chuyen_nha: "moving_house",
      chuyen_van_phong: "moving_office",
      chuyen_kho_bai: "moving_warehouse",
      moving_house: "moving_house",
      moving_office: "moving_office",
      moving_warehouse: "moving_warehouse",
    };
    return map[value] || "";
  }

  function getSelectedLabel(select) {
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    return option ? String(option.textContent || "").trim() : "";
  }

  function getCheckedLabel(scope, selector) {
    const input = scope.querySelector(`${selector}:checked`);
    if (!input) return "";
    const label = input.closest("label");
    return label ? String(label.textContent || "").trim() : "";
  }

  function getCheckedLabels(scope, selector) {
    return Array.from(scope.querySelectorAll(`${selector}:checked`))
      .map((input) => {
        const label = input.closest("label");
        return label ? String(label.textContent || "").trim() : "";
      })
      .filter(Boolean);
  }

  function countChecked(scope, selector) {
    return scope.querySelectorAll(`${selector}:checked`).length;
  }

  function countFiles(scope, selector) {
    return Array.from(scope.querySelectorAll(selector)).reduce((total, input) => {
      return total + (input.files ? input.files.length : 0);
    }, 0);
  }

  function mapBookingPricingTimeSlot(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    if (
      value === "buoi_toi" ||
      value === "ban_dem" ||
      value === "can_xac_nhan" ||
      value === "binh_thuong" ||
      value === "cuoi_tuan"
    ) {
      return value;
    }
    if (value === "toi") return "buoi_toi";
    if (value === "dem") return "ban_dem";
    if (value === "linh_dong") return "can_xac_nhan";
    return "binh_thuong";
  }

  function getBookingPricingTimeLabel(rawValue) {
    const mapped = mapBookingPricingTimeSlot(rawValue);
    if (!mapped) return "Chưa chọn";
    if (mapped === "buoi_toi") return "Buổi tối";
    if (mapped === "ban_dem") return "Ban đêm";
    if (mapped === "cuoi_tuan") return "Cuối tuần";
    if (mapped === "can_xac_nhan") return "Chờ xác nhận";
    return "Ban ngày";
  }

  function revokePreviewUrl(preview) {
    const currentUrl = preview?.dataset?.objectUrl;
    if (currentUrl) {
      window.URL.revokeObjectURL(currentUrl);
      delete preview.dataset.objectUrl;
    }
  }

  function revokePreviewUrlsIn(container) {
    container?.querySelectorAll("[data-object-url]").forEach((node) => {
      const url = node.getAttribute("data-object-url");
      if (url) {
        window.URL.revokeObjectURL(url);
        node.removeAttribute("data-object-url");
      }
    });
  }

  function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  function updateFilePreview(scope, input) {
    const previewId = input.getAttribute("data-xem-truoc-tep");
    const preview = previewId ? scope.querySelector(`#${previewId}`) : null;
    if (!preview) return;

    revokePreviewUrl(preview);

    const file = input.files && input.files[0];
    if (!file) {
      if (preview.tagName === "VIDEO") {
        preview.pause();
        preview.removeAttribute("src");
        preview.load();
      } else {
        preview.removeAttribute("src");
      }
      preview.hidden = true;
      return;
    }

    const objectUrl = window.URL.createObjectURL(file);
    preview.dataset.objectUrl = objectUrl;
    preview.src = objectUrl;
    preview.hidden = false;

    if (preview.tagName === "VIDEO") {
      preview.load();
    }
  }

  function updateSpecialItemField(scope) {
    const trigger = scope.querySelector("[data-bat-khac]");
    const target = scope.querySelector("[data-khoi-hang-muc-khac]");
    const input = target ? target.querySelector("input") : null;
    if (!trigger || !target) return;

    const shouldShow = !!trigger.checked;
    target.hidden = !shouldShow;
    target.classList.toggle("is-hidden", !shouldShow);

    if (!shouldShow && input) {
      input.value = "";
    }
  }

  function formatLatLng(lat, lng) {
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return "";
    return `${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`;
  }

  function renderSurveyMapPreview(scope) {
    const addressInput = scope.querySelector("#dia-chi-khao-sat");
    const destinationInput = scope.querySelector("#dia-chi-diem-den-du-kien");
    const surveyOutput = scope.querySelector(
      "[data-vi-tri-ban-do-da-chon='khao_sat']",
    );
    const destinationOutput = scope.querySelector(
      "[data-vi-tri-ban-do-da-chon='diem_den']",
    );
    const surveyLatInput = scope.querySelector(
      "[data-ban-do-toa-do='khao_sat_lat']",
    );
    const surveyLngInput = scope.querySelector(
      "[data-ban-do-toa-do='khao_sat_lng']",
    );
    const destinationLatInput = scope.querySelector(
      "[data-ban-do-toa-do='diem_den_lat']",
    );
    const destinationLngInput = scope.querySelector(
      "[data-ban-do-toa-do='diem_den_lng']",
    );

    if (!addressInput || !surveyOutput || !destinationOutput) return;

    const surveyText = String(addressInput.value || "").trim();
    const destinationText = String(destinationInput?.value || "").trim();
    const surveyCoordText = formatLatLng(
      surveyLatInput?.value,
      surveyLngInput?.value,
    );
    const destinationCoordText = formatLatLng(
      destinationLatInput?.value,
      destinationLngInput?.value,
    );

    surveyOutput.textContent =
      surveyText || surveyCoordText || "Đang chờ xác nhận vị trí điểm khảo sát.";
    destinationOutput.textContent =
      destinationText ||
      destinationCoordText ||
      "Kéo ghim đỏ hoặc nhập địa chỉ điểm đến.";
  }

  async function reverseGeocodeSurvey(lat, lng) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    const data = await response.json();
    return String(data?.display_name || "").trim();
  }

  async function geocodeSurveyAddress(address) {
    const query = String(address || "").trim();
    if (!query) return null;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=vn&limit=1`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: String(data[0].display_name || "").trim(),
    };
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

    if (hasFrom) {
      return { lat: fromLat, lng: fromLng, mode: "pickup" };
    }

    if (hasTo) {
      return { lat: toLat, lng: toLng, mode: "delivery" };
    }

    return null;
  }

  async function fetchBookingWeatherForecast(lat, lng, dateValue) {
    const cacheKey = `${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}:${dateValue}`;
    if (!bookingWeatherCache.has(cacheKey)) {
      const request = fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&hourly=precipitation,rain,weather_code&daily=rain_sum,precipitation_hours,weather_code&timezone=auto&start_date=${encodeURIComponent(dateValue)}&end_date=${encodeURIComponent(dateValue)}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
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
      .filter((item) => {
        if (!range) return true;
        return item.hour >= range[0] && item.hour <= range[1];
      });
  }

  function inferBookingWeatherValue(dateValue, timeSlot, forecast) {
    const slotHours = getBookingWeatherHours(dateValue, timeSlot, forecast);
    const hasSlotRain = slotHours.some(
      (item) =>
        item.precipitation > 0.1 ||
        item.rain > 0.1 ||
        isRainWeatherCode(item.weatherCode),
    );

    if (hasSlotRain) {
      return "troi_mua";
    }

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

  function getMaxForecastDateString() {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 15);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, "0");
    const day = String(maxDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function syncBookingExecutionDateLimits(scope) {
    const dateInput = scope.querySelector("#ngay-thuc-hien-dat-lich");
    if (!dateInput) return;
    dateInput.min = getTodayDateString();
  }

  async function refreshBookingWeather(scope) {
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

  function initSurveyMap(scope) {
    if (!scope.querySelector(".form-khao-sat") || !window.L) return;

    const mapElement = scope.querySelector("#ban-do-khao-sat");
    const surveyInput = scope.querySelector("#dia-chi-khao-sat");
    const destinationInput = scope.querySelector("#dia-chi-diem-den-du-kien");
    const surveyLatInput = scope.querySelector(
      "[data-ban-do-toa-do='khao_sat_lat']",
    );
    const surveyLngInput = scope.querySelector(
      "[data-ban-do-toa-do='khao_sat_lng']",
    );
    const destinationLatInput = scope.querySelector(
      "[data-ban-do-toa-do='diem_den_lat']",
    );
    const destinationLngInput = scope.querySelector(
      "[data-ban-do-toa-do='diem_den_lng']",
    );
    const statusOutput = scope.querySelector("[data-trang-thai-ban-do-ui]");
    const currentButton = scope.querySelector(
      "[data-ban-do-hanh-dong='vi-tri-hien-tai']",
    );

    if (
      !mapElement ||
      !surveyInput ||
      !destinationInput ||
      !surveyLatInput ||
      !surveyLngInput ||
      !destinationLatInput ||
      !destinationLngInput
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

    const surveyIcon = createPinIcon("#1b4332");
    const destinationIcon = createPinIcon("#dc2626");

    const surveyMarker = window.L.marker(defaultCenter, {
      draggable: true,
      icon: surveyIcon,
    })
      .addTo(map)
      .bindTooltip("<div>Khảo sát</div>", {
        permanent: true,
        direction: "top",
        offset: [0, -30],
        className: "map-marker-tooltip map-marker-tooltip--survey",
      });

    const destinationMarker = window.L.marker(
      [defaultCenter[0] - 0.01, defaultCenter[1] - 0.01],
      {
        draggable: true,
        icon: destinationIcon,
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
          input: destinationInput,
          latInput: destinationLatInput,
          lngInput: destinationLngInput,
          marker: destinationMarker,
          emptyText: "Chưa có vị trí điểm đến.",
          geocodeStatus:
            "Đang cập nhật địa chỉ điểm đến từ vị trí đã chọn...",
          successStatus:
            "Đã cập nhật điểm đến từ vị trí trên bản đồ.",
          fallbackStatus:
            "Đã chọn vị trí điểm đến trên bản đồ, nhưng chưa thể tự động đọc ra địa chỉ.",
        };
      }

      return {
        input: surveyInput,
        latInput: surveyLatInput,
        lngInput: surveyLngInput,
        marker: surveyMarker,
        emptyText: "Chưa có vị trí khảo sát.",
        geocodeStatus:
          "Đang cập nhật địa chỉ khảo sát từ vị trí đã chọn...",
        successStatus:
          "Đã cập nhật địa chỉ khảo sát từ vị trí trên bản đồ.",
        fallbackStatus:
          "Đã chọn vị trí khảo sát trên bản đồ, nhưng chưa thể tự động đọc ra địa chỉ.",
      };
    }

    function setPointCoords(point, lat, lng) {
      const config = getPointConfig(point);
      config.latInput.value = String(lat);
      config.lngInput.value = String(lng);
      renderSurveyMapPreview(scope);
      renderFormSummaries(scope);
    }

    function clearPoint(point) {
      const config = getPointConfig(point);
      config.latInput.value = "";
      config.lngInput.value = "";
      renderSurveyMapPreview(scope);
      renderFormSummaries(scope);
    }

    function updateConnectionLine() {
      connectionLine.setLatLngs([
        surveyMarker.getLatLng(),
        destinationMarker.getLatLng(),
      ]);
    }

    function updateMapBounds() {
      const group = new window.L.featureGroup([surveyMarker, destinationMarker]);
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 16 });
    }

    async function moveMarker(point, lat, lng, options = {}) {
      const shouldReverse = options.shouldReverse !== false;
      const shouldWriteAddress = options.shouldWriteAddress !== false;
      const shouldReframe = options.shouldReframe !== false;
      const config = getPointConfig(point);

      config.marker.setLatLng([lat, lng]);
      setPointCoords(point, lat, lng);
      updateConnectionLine();

      if (shouldReframe) {
        updateMapBounds();
      }

      if (!shouldReverse) return;

      if (statusOutput) {
        statusOutput.textContent = config.geocodeStatus;
      }

      try {
        const label = await reverseGeocodeSurvey(lat, lng);
        if (label && shouldWriteAddress) {
          config.input.value = label;
        }
        renderSurveyMapPreview(scope);
        if (statusOutput) {
          statusOutput.textContent = label
            ? config.successStatus
            : "Đã chọn vị trí trên bản đồ.";
        }
      } catch (error) {
        console.warn("Survey reverse geocode failed:", error);
        if (statusOutput) {
          statusOutput.textContent = config.fallbackStatus;
        }
      }
    }

    surveyMarker.on("dragend", function () {
      const latlng = surveyMarker.getLatLng();
      moveMarker("khao_sat", latlng.lat, latlng.lng, { shouldReverse: true });
    });

    destinationMarker.on("dragend", function () {
      const latlng = destinationMarker.getLatLng();
      moveMarker("diem_den", latlng.lat, latlng.lng, { shouldReverse: true });
    });

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
            "Thiết bị này không hỗ trợ lấy vị trí hiện tại. Bạn có thể nhập địa chỉ hoặc kéo ghim xanh để chọn.";
        }
        return;
      }

      if (!silent && statusOutput) {
        statusOutput.textContent = "Đang lấy vị trí hiện tại cho điểm khảo sát...";
      }
      setCurrentButtonLoading(true);

      navigator.geolocation.getCurrentPosition(
        function (position) {
          moveMarker("khao_sat", position.coords.latitude, position.coords.longitude, {
            shouldReverse: true,
          }).finally(function () {
            setCurrentButtonLoading(false);
            if (silent && statusOutput) {
              statusOutput.textContent =
                "Đã cập nhật nhanh địa chỉ điểm khảo sát theo vị trí hiện tại.";
            }
          });
        },
        function () {
          setCurrentButtonLoading(false);
          if (!silent && statusOutput) {
            statusOutput.textContent =
              "Không lấy được vị trí hiện tại. Bạn có thể nhập địa chỉ hoặc kéo ghim xanh để chỉnh thủ công.";
          }
        },
        { timeout: 10000 },
      );
    }

    currentButton?.addEventListener("click", function () {
      requestCurrentLocation({ silent: false });
    });

    let surveyTimer = null;
    let destinationTimer = null;

    surveyInput.addEventListener("input", function () {
      clearTimeout(surveyTimer);
      const query = String(surveyInput.value || "").trim();

      if (!query) {
        if (statusOutput) {
          statusOutput.textContent =
            "Bạn có thể nhập lại địa chỉ hoặc kéo ghim xanh để xác định điểm khảo sát.";
        }
        renderSurveyMapPreview(scope);
        return;
      }

      surveyTimer = window.setTimeout(async function () {
        try {
          if (statusOutput) {
            statusOutput.textContent =
              "Đang dò vị trí khảo sát từ địa chỉ bạn vừa nhập...";
          }

          const result = await geocodeSurveyAddress(query);
          if (!result) {
            if (statusOutput) {
              statusOutput.textContent =
                "Chưa tìm thấy vị trí khảo sát khớp hoàn toàn với địa chỉ này. Bạn có thể tinh lại địa chỉ hoặc kéo ghim xanh trên bản đồ.";
            }
            return;
          }

          await moveMarker("khao_sat", result.lat, result.lng, {
            shouldReverse: false,
          });

          if (statusOutput) {
            statusOutput.textContent =
              "Đã ghim vị trí khảo sát theo địa chỉ bạn nhập. Bạn vẫn có thể kéo ghim để chỉnh lại chính xác hơn.";
          }
        } catch (error) {
          console.warn("Survey address geocode failed:", error);
          if (statusOutput) {
            statusOutput.textContent =
              "Chưa thể dò vị trí khảo sát từ địa chỉ. Bạn có thể kéo ghim xanh để chọn thủ công.";
          }
        }
      }, 600);
    });

    destinationInput.addEventListener("input", function () {
      clearTimeout(destinationTimer);
      const query = String(destinationInput.value || "").trim();

      if (!query) {
        if (statusOutput) {
          statusOutput.textContent =
            "Bạn có thể nhập lại địa chỉ điểm đến hoặc kéo ghim đỏ để đối chiếu vị trí.";
        }
        renderSurveyMapPreview(scope);
        return;
      }

      destinationTimer = window.setTimeout(async function () {
        try {
          if (statusOutput) {
            statusOutput.textContent =
              "Đang dò vị trí điểm đến từ địa chỉ bạn vừa nhập...";
          }

          const result = await geocodeSurveyAddress(query);
          if (!result) {
            if (statusOutput) {
              statusOutput.textContent =
                "Chưa tìm thấy vị trí điểm đến khớp hoàn toàn với địa chỉ này. Bạn có thể tinh lại địa chỉ hoặc kéo ghim đỏ trên bản đồ.";
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
          console.warn("Survey destination geocode failed:", error);
          if (statusOutput) {
            statusOutput.textContent =
              "Chưa thể dò vị trí điểm đến từ địa chỉ. Bạn có thể kéo ghim đỏ để chọn thủ công.";
          }
        }
      }, 600);
    });

    clearPoint("khao_sat");
    clearPoint("diem_den");
    updateConnectionLine();
    updateMapBounds();
    requestCurrentLocation({ silent: true });

    window.setTimeout(function () {
      map.invalidateSize();
    }, 120);
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

  function initBookingMap(scope) {
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

      const km = fromLatLng.distanceTo(toLatLng) / 1000;
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

    scope.__bookingMapState = {
      map,
      updateMapBounds,
    };

    function setPointCoords(point, lat, lng) {
      const config = getPointConfig(point);
      config.latInput.value = String(lat);
      config.lngInput.value = String(lng);
      renderBookingMapPreview(scope);
      renderFormSummaries(scope);
      updateDistanceAndRoute();
      refreshBookingWeather(scope);
    }

    function clearPoint(point) {
      const config = getPointConfig(point);
      config.latInput.value = "";
      config.lngInput.value = "";
      renderBookingMapPreview(scope);
      renderFormSummaries(scope);
      updateDistanceAndRoute();
      updateMapBounds();
      refreshBookingWeather(scope);
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
        const label = await reverseGeocodeSurvey(lat, lng);
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

          const result = await geocodeSurveyAddress(query);
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

          const result = await geocodeSurveyAddress(query);
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

  function formatSurveySchedule(scope) {
    const dateInput = scope.querySelector("#ngay-khao-sat");
    const timeSelect = scope.querySelector("#khung-gio-khao-sat");
    const dateValue = String(dateInput?.value || "").trim();
    const timeLabel = getSelectedLabel(timeSelect);

    if (dateValue && timeSelect?.value) {
      return `${dateValue} • ${timeLabel}`;
    }

    if (dateValue) return dateValue;
    if (timeSelect?.value) return timeLabel;
    return "Chưa chọn";
  }

  function formatBookingSchedule(scope) {
    const dateInput = scope.querySelector("#ngay-thuc-hien-dat-lich");
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const dateValue = String(dateInput?.value || "").trim();
    const timeLabel = getSelectedLabel(timeSelect);

    if (dateValue && timeSelect?.value) {
      return `${dateValue} • ${timeLabel}`;
    }

    if (dateValue) return dateValue;
    if (timeSelect?.value) return timeLabel;
    return "Chưa chọn";
  }

  function syncBookingVehicleOptions(scope, serviceValue) {
    const select = scope.querySelector("#loai-xe-dat-lich");
    if (!select) return;

    const normalized = normalizeService(serviceValue);
    const config = bookingVehicleOptions[normalized];
    const previousValue = String(select.value || "").trim();

    if (!config) {
      select.innerHTML = '<option value="">Chọn dịch vụ để chọn loại xe</option>';
      select.value = "";
      return;
    }

    select.innerHTML = [
      '<option value="">Chọn loại xe phù hợp</option>',
      ...config.options.map(
        (item) => `<option value="${item.value}">${item.label}</option>`,
      ),
    ].join("");

    if (config.options.some((item) => item.value === previousValue)) {
      select.value = previousValue;
    } else {
      select.value = config.defaultValue;
    }
  }

  function syncBookingPricingTimeSlot(scope) {
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const hiddenInput = scope.querySelector("[data-khung-gio-tinh-gia]");
    if (!timeSelect || !hiddenInput) return;

    hiddenInput.value = mapBookingPricingTimeSlot(timeSelect.value);
  }

  function joinSurveyParts(parts, fallback) {
    const filtered = parts
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    return filtered.length ? filtered.join(" • ") : fallback;
  }

  function formatBookingDeploymentDetail(scope, serviceValue) {
    const normalized = normalizeService(serviceValue);
    const soTangDiemDi = String(
      scope.querySelector("#so-tang-diem-di-dat-lich")?.value || "",
    ).trim();
    const soTangDiemDen = String(
      scope.querySelector("#so-tang-diem-den-dat-lich")?.value || "",
    ).trim();

    let loaiDiemDi = "";
    let loaiDiemDen = "";

    if (normalized === "chuyen_nha") {
      loaiDiemDi = getSelectedLabel(
        scope.querySelector("#loai-nha-diem-di-dat-lich"),
      );
      loaiDiemDen = getSelectedLabel(
        scope.querySelector("#loai-nha-diem-den-dat-lich"),
      );
    } else if (normalized === "chuyen_van_phong") {
      loaiDiemDi = getSelectedLabel(
        scope.querySelector("#loai-mat-bang-di-van-phong-dat-lich"),
      );
      loaiDiemDen = getSelectedLabel(
        scope.querySelector("#loai-mat-bang-den-van-phong-dat-lich"),
      );
    } else if (normalized === "chuyen_kho_bai") {
      loaiDiemDi = getSelectedLabel(
        scope.querySelector("#loai-kho-diem-di-dat-lich"),
      );
      loaiDiemDen = getSelectedLabel(
        scope.querySelector("#loai-kho-diem-den-dat-lich"),
      );
    }

    return joinSurveyParts(
      [
        loaiDiemDi && `Điểm đi: ${loaiDiemDi}`,
        loaiDiemDen && `Điểm đến: ${loaiDiemDen}`,
        soTangDiemDi && `Điểm đi ${soTangDiemDi} tầng`,
        soTangDiemDen && `Điểm đến ${soTangDiemDen} tầng`,
      ],
      "Chưa có",
    );
  }

  function formatSurveyServiceDetail(scope, serviceValue) {
    const normalized = normalizeService(serviceValue);
    const khoiLuong =
      getCheckedLabel(scope, "input[name='muc_do_khoi_luong']") || "";
    const hoTro = getCheckedLabels(
      scope,
      "input[name='can_dong_goi'], input[name='can_thao_lap'], input[name='co_do_gia_tri_cao']",
    );

    if (normalized === "chuyen_nha") {
      const loaiNha = getSelectedLabel(
        scope.querySelector("#loai-mat-bang-nha-khao-sat"),
      );
      const soTang = String(
        scope.querySelector("#so-tang-khao-sat")?.value || "",
      ).trim();
      const soPhong = String(
        scope.querySelector("#so-phong-khao-sat")?.value || "",
      ).trim();

      return joinSurveyParts(
        [
          khoiLuong && `Khối lượng ${khoiLuong.toLowerCase()}`,
          loaiNha,
          soTang && `${soTang} tầng`,
          soPhong && `${soPhong} phòng`,
          hoTro.slice(0, 2).join(", "),
        ],
        "Chưa có",
      );
    }

    if (normalized === "chuyen_van_phong") {
      const loaiMatBang = getSelectedLabel(
        scope.querySelector("#loai-mat-bang-van-phong-khao-sat"),
      );
      const soNhanSu = String(
        scope.querySelector("#so-nhan-su-khao-sat")?.value || "",
      ).trim();
      const dienTich = String(
        scope.querySelector("#dien-tich-van-phong-khao-sat")?.value || "",
      ).trim();
      const chiTiet = getCheckedLabels(
        scope,
        "[data-nhom-chip='chi_tiet_van_phong'] input[type='checkbox']",
      );

      return joinSurveyParts(
        [
          khoiLuong && `Khối lượng ${khoiLuong.toLowerCase()}`,
          loaiMatBang,
          soNhanSu && `${soNhanSu} nhân sự`,
          dienTich && dienTich,
          chiTiet.slice(0, 2).join(", "),
        ],
        "Chưa có",
      );
    }

    if (normalized === "chuyen_kho_bai") {
      const loaiKho = getSelectedLabel(
        scope.querySelector("#loai-mat-bang-kho-khao-sat"),
      );
      const quyMo = String(
        scope.querySelector("#quy-mo-kho-khao-sat")?.value || "",
      ).trim();
      const chiTiet = getCheckedLabels(
        scope,
        "[data-nhom-chip='chi_tiet_kho_bai'] input[type='checkbox']",
      );

      return joinSurveyParts(
        [
          khoiLuong && `Khối lượng ${khoiLuong.toLowerCase()}`,
          loaiKho,
          quyMo,
          chiTiet.slice(0, 2).join(", "),
        ],
        "Chưa có",
      );
    }

    return joinSurveyParts(
      [khoiLuong && `Khối lượng ${khoiLuong.toLowerCase()}`, hoTro.slice(0, 2).join(", ")],
      "Chưa có",
    );
  }

  function formatBookingServiceDetail(scope, serviceValue) {
    const normalized = normalizeService(serviceValue);

    if (normalized === "chuyen_nha") {
      const dienTich = String(
        scope.querySelector("#dien-tich-nha-dat-lich")?.value || "",
      ).trim();
      const soPhong = String(
        scope.querySelector("#so-phong-dat-lich")?.value || "",
      ).trim();
      const soNhanCong = String(
        scope.querySelector("#so-nhan-cong-dat-lich")?.value || "",
      ).trim();
      const soGoiDongGoi = String(
        scope.querySelector("#so-goi-dong-goi-dat-lich")?.value || "",
      ).trim();
      const soBoThaoLap = String(
        scope.querySelector("#so-bo-thao-lap-dat-lich")?.value || "",
      ).trim();
      const hoTro = getCheckedLabels(
        scope,
        "input[name='can_thao_lap_noi_that'], input[name='can_dong_goi_do_dac'], input[name='co_do_gia_tri_cao'], input[name='co_do_de_vo'], input[name='co_do_cong_kenh']",
      );

      return joinSurveyParts(
        [
          dienTich,
          soPhong && `${soPhong} phòng`,
          soNhanCong && `${soNhanCong} nhân công`,
          soGoiDongGoi && `${soGoiDongGoi} gói đóng gói`,
          soBoThaoLap && `${soBoThaoLap} bộ tháo lắp`,
          hoTro.slice(0, 3).join(", "),
        ],
        "Chưa có",
      );
    }

    if (normalized === "chuyen_van_phong") {
      const soChoNgoi = String(
        scope.querySelector("#so-cho-ngoi-dat-lich")?.value || "",
      ).trim();
      const soPhongBan = String(
        scope.querySelector("#so-phong-ban-dat-lich")?.value || "",
      ).trim();
      const soThungHoSo = String(
        scope.querySelector("#so-thung-ho-so-dat-lich")?.value || "",
      ).trim();
      const soBoMayIt = String(
        scope.querySelector("#so-bo-may-it-dat-lich")?.value || "",
      ).trim();
      const soMonNoiThat = String(
        scope.querySelector("#so-mon-noi-that-van-phong-dat-lich")?.value || "",
      ).trim();
      const soThietBiNang = String(
        scope.querySelector("#so-thiet-bi-nang-dat-lich")?.value || "",
      ).trim();
      const chiTiet = getCheckedLabels(
        scope,
        "input[name='can_bao_mat_tai_lieu'], input[name='can_di_doi_server'], input[name='can_thuc_hien_cuoi_tuan']",
      );

      return joinSurveyParts(
        [
          soChoNgoi && `${soChoNgoi} chỗ ngồi`,
          soPhongBan && `${soPhongBan} phòng ban`,
          soThungHoSo && `${soThungHoSo} thùng hồ sơ`,
          soBoMayIt && `${soBoMayIt} bộ máy IT`,
          soMonNoiThat && `${soMonNoiThat} món nội thất`,
          soThietBiNang && `${soThietBiNang} thiết bị nặng`,
          chiTiet.slice(0, 3).join(", "),
        ],
        "Chưa có",
      );
    }

    if (normalized === "chuyen_kho_bai") {
      const khoiLuong = String(
        scope.querySelector("#khoi-luong-kho-dat-lich")?.value || "",
      ).trim();
      const loaiHang = String(
        scope.querySelector("#loai-hang-dat-lich")?.value || "",
      ).trim();
      const soPallet = String(
        scope.querySelector("#so-pallet-dat-lich")?.value || "",
      ).trim();
      const soCaXeNang = String(
        scope.querySelector("#so-ca-xe-nang-dat-lich")?.value || "",
      ).trim();
      const soCaXeCau = String(
        scope.querySelector("#so-ca-xe-cau-dat-lich")?.value || "",
      ).trim();
      const soNhanSuBocXep = String(
        scope.querySelector("#so-nhan-su-boc-xep-dat-lich")?.value || "",
      ).trim();
      const soDonViGiaCo = String(
        scope.querySelector("#so-don-vi-gia-co-dat-lich")?.value || "",
      ).trim();
      const chiTiet = getCheckedLabels(
        scope,
        "input[name='can_xe_nang_dat_lich'], input[name='can_xe_cau_dat_lich'], input[name='can_kiem_ke_hang_hoa']",
      );

      return joinSurveyParts(
        [
          khoiLuong,
          loaiHang,
          soPallet && `${soPallet} pallet`,
          soCaXeNang && `${soCaXeNang} ca xe nâng`,
          soCaXeCau && `${soCaXeCau} ca xe cẩu`,
          soNhanSuBocXep && `${soNhanSuBocXep} nhân sự bốc xếp`,
          soDonViGiaCo && `${soDonViGiaCo} đơn vị gia cố`,
          chiTiet.slice(0, 3).join(", "),
        ],
        "Chưa có",
      );
    }

    return "Chưa có";
  }

  function formatBookingDistance(scope) {
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

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return "Chưa xác định";
    }

    const km = calculateDistanceKm(fromLat, fromLng, toLat, toLng);
    return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
  }

  function formatBookingConditionDetail(scope) {
    const labels = getCheckedLabels(
      scope,
      "[data-nhom-chip='dieu_kien_dat_lich'] input[type='checkbox']",
    );
    return labels.length ? labels.join(", ") : "Chưa có";
  }

  function renderBookingMediaReview(scope) {
    const emptyState = scope.querySelector("[data-media-dat-lich-rong]");
    const grid = scope.querySelector("[data-media-dat-lich-luoi]");
    if (!emptyState || !grid) return;

    revokePreviewUrlsIn(grid);
    grid.innerHTML = "";

    const items = [];
    scope
      .querySelectorAll("#tep-anh-dat-lich, #tep-video-dat-lich")
      .forEach((input) => {
        Array.from(input.files || []).forEach((file) => {
          items.push({
            file,
            kind: file.type.startsWith("video/") ? "video" : "image",
          });
        });
      });

    if (!items.length) {
      emptyState.hidden = false;
      grid.hidden = true;
      return;
    }

    emptyState.hidden = true;
    grid.hidden = false;

    grid.innerHTML = items
      .map(({ file, kind }, index) => {
        const objectUrl = window.URL.createObjectURL(file);
        const media =
          kind === "video"
            ? `<video controls preload="metadata" src="${objectUrl}" data-object-url="${objectUrl}"></video>`
            : `<img src="${objectUrl}" alt="${file.name}" data-object-url="${objectUrl}" />`;

        return `
          <article class="the-media-xac-nhan-dat-lich">
            ${media}
            <div class="meta-media-xac-nhan-dat-lich">
              <strong>${file.name}</strong>
              <span>${kind === "video" ? "Video" : "Ảnh"} đính kèm ${index + 1}</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function parseBookingNumber(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return 0;

    let cleaned = raw.replace(/\s+/g, "").replace(/[^\d.,-]/g, "");
    if (!cleaned) return 0;

    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/,/g, ".");
    } else {
      const dotMatches = cleaned.match(/\./g) || [];
      if (dotMatches.length > 1) {
        cleaned = cleaned.replace(/\./g, "");
      }
    }

    const value = Number(cleaned);
    return Number.isFinite(value) ? value : 0;
  }

  function getBookingNumericValue(scope, selector) {
    const value = parseBookingNumber(scope.querySelector(selector)?.value || "");
    return value > 0 ? value : 0;
  }

  function isBookingChecked(scope, selector) {
    return !!scope.querySelector(`${selector}:checked`);
  }

  function parseMinPriceFromRange(text) {
    const value = String(text || "").trim();
    if (!value || /miễn phí/i.test(value)) return 0;
    const matches = value.match(/\d[\d.]*/g);
    if (!matches || !matches.length) return 0;
    return Number(matches[0].replace(/\./g, "")) || 0;
  }

  function getBookingDistanceKmValue(scope) {
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

    if (!fromLat || !fromLng || !toLat || !toLng) return 0;
    return calculateDistanceKm(fromLat, fromLng, toLat, toLng);
  }

  function getBookingDisplayItem(serviceData, slug) {
    return core
      .getPricingDisplayItems(serviceData)
      .find((item) => String(item?.slug || "").trim() === String(slug || "").trim());
  }

  function getBookingDisplayItemUnitPrice(serviceData, slug) {
    const displayItem = getBookingDisplayItem(serviceData, slug);
    return parseMinPriceFromRange(displayItem?.khoang_gia || "");
  }

  function getBookingSpecialFixedItem(serviceData, slug) {
    const standard = core.getPricingStandardStructure(serviceData);
    const items = standard?.phu_phi_co_dinh?.tinh_chat_do_dac;
    if (!Array.isArray(items)) return null;
    return items.find((item) => String(item?.slug || "").trim() === String(slug || "").trim()) || null;
  }

  function getBookingFixedTimeWeatherAmount(serviceData, groupKey, slug) {
    const standard = core.getPricingStandardStructure(serviceData);
    const items = Array.isArray(standard?.he_so?.[groupKey]) ? standard.he_so[groupKey] : [];
    const match = items.find((item) => String(item?.slug || "").trim() === String(slug || "").trim());
    if (!match) return 0;

    const referenceValue = Number(match?.tham_chieu_du_lieu_cu?.gia_tri || 0);
    if (Number.isFinite(referenceValue) && referenceValue > 0) {
      return referenceValue;
    }

    return 0;
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

  function formatBookingMoneyLine(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return "Miễn phí";
    return core.formatCurrencyVnd(amount);
  }

  function renderBookingLineItem(item) {
    const detail = String(item?.detail || "").trim();
    return `
      <div class="muc-chi-tiet-gia-chot-dat-lich">
        <div class="muc-chi-tiet-gia-chot-dat-lich__hang">
          <span>${core.escapeHtml(item.label || "")}</span>
          <strong>${core.escapeHtml(formatBookingMoneyLine(item.amount))}</strong>
        </div>
        ${detail ? `<p>${core.escapeHtml(detail)}</p>` : ""}
      </div>
    `;
  }

  function buildBookingPricingState(scope, serviceData) {
    const normalizedService = normalizeService(serviceData?.id || "");
    const vehicleValue = String(
      scope.querySelector("#loai-xe-dat-lich")?.value || "",
    ).trim();
    const vehicleEntries = core.getPricingVehicleEntries(serviceData);
    const vehicleEntry = vehicleEntries.find(
      (item) => String(item?.slug || "").trim() === vehicleValue,
    );
    const calculationItems = core.getPricingCalculationItems(serviceData);
    const calcItemMap = new Map(
      calculationItems.map((item) => [String(item?.slug || "").trim(), item]),
    );
    const displayItems = core.getPricingDisplayItems(serviceData);
    const optionSelections = new Map();
    const breakdownLines = [];
    const notes = [];
    const includedOptionSlugs = new Set(
      normalizedService === "chuyen_nha"
        ? ["sap_xep_tai_nha_moi"]
        : normalizedService === "chuyen_van_phong"
          ? ["lap_dat_tai_van_phong_moi"]
          : [],
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

    function addCalculationCharge({
      calcSlug,
      quantity,
      label,
      displaySlug,
      note,
    }) {
      const calcItem = calcItemMap.get(calcSlug);
      if (!calcItem || quantity <= 0) return;
      const amount = Number(calcItem.don_gia || 0) * quantity;
      addChargeLine({
        label: label || calcItem.ten || "Hạng mục phát sinh",
        detail: `${quantity} ${calcItem.don_vi || "đơn vị"} x ${core.formatCurrencyVnd(calcItem.don_gia || 0)}`,
        amount,
        displaySlug: displaySlug || calcItem.nguon_hien_thi_slug || calcSlug,
        quantity,
        note,
        state: quantity > 1 ? `Đang chọn x${quantity}` : "Đang chọn",
      });
    }

    if (!vehicleEntry) {
      notes.push("Chọn loại xe để khóa cước cơ bản và hoàn tất giá chốt.");
    } else {
      let tripCount = 1;
      const tripNotes = [];

      if (normalizedService === "chuyen_kho_bai") {
        const totalWeightKg = getBookingNumericValue(scope, "#khoi-luong-kho-dat-lich");
        if (totalWeightKg > 0 && vehicleEntry.tai_trong_kg > 0) {
          tripCount = Math.max(1, Math.ceil(totalWeightKg / vehicleEntry.tai_trong_kg));
          if (tripCount > 1) {
            tripNotes.push(`Tổng ${Math.round(totalWeightKg)}kg nên hệ thống tính ${tripCount} chuyến theo tải trọng xe.`);
          }
        }
      }

      const baseAmount = Number(vehicleEntry.gia_co_ban || 0) * tripCount;
      addChargeLine({
        label: "Cước xe cơ bản",
        detail: `${vehicleEntry.ten_hien_thi}${tripCount > 1 ? ` x ${tripCount} chuyến` : ""}`,
        amount: baseAmount,
      });

      if (hasDistance) {
        const extraKm = Math.max(
          0,
          Math.ceil(distanceKm - Number(vehicleEntry.km_co_ban || 0)),
        );
        if (extraKm > 0 && Number(vehicleEntry.gia_moi_km_tiep || 0) > 0) {
          addChargeLine({
            label: "Quãng đường vượt ngưỡng",
            detail: `${extraKm} km x ${core.formatCurrencyVnd(vehicleEntry.gia_moi_km_tiep || 0)}${tripCount > 1 ? ` x ${tripCount} chuyến` : ""}`,
            amount: extraKm * Number(vehicleEntry.gia_moi_km_tiep || 0) * tripCount,
          });
        }
      } else {
        tripNotes.push(
          `Chưa ghim đủ hai điểm trên bản đồ nên hệ thống mới tính trong ${vehicleEntry.km_co_ban}km đầu.`,
        );
      }

      notes.push(...tripNotes);
    }

    if (normalizedService === "chuyen_nha") {
      addCalculationCharge({
        calcSlug: "nhan_cong_boc_xep",
        quantity: getBookingNumericValue(scope, "#so-nhan-cong-dat-lich"),
      });

      addCalculationCharge({
        calcSlug: "dong_goi_do_dac",
        quantity: Math.max(
          getBookingNumericValue(scope, "#so-goi-dong-goi-dat-lich"),
          isBookingChecked(scope, "input[name='can_dong_goi_do_dac']") ? 1 : 0,
        ),
      });

      addCalculationCharge({
        calcSlug: "thao_lap_thiet_bi",
        quantity: Math.max(
          getBookingNumericValue(scope, "#so-bo-thao-lap-dat-lich"),
          isBookingChecked(scope, "input[name='can_thao_lap_noi_that']") ? 1 : 0,
        ),
        displaySlug: "ho_tro_thao_lap_ky_thuat",
      });

      [
        { selector: "input[name='co_do_de_vo']", slug: "de_vo" },
        { selector: "input[name='co_do_cong_kenh']", slug: "cong_kenh" },
        { selector: "input[name='co_do_gia_tri_cao']", slug: "gia_tri_cao" },
      ].forEach(({ selector, slug }) => {
        if (!isBookingChecked(scope, selector)) return;
        const specialItem = getBookingSpecialFixedItem(serviceData, slug);
        if (!specialItem) return;
        addChargeLine({
          label: specialItem.ten || "Hạng mục đặc biệt",
          detail: `${specialItem.so_luong_mac_dinh_khi_chi_tick_checkbox || 1} ${specialItem.don_vi || "món"} x ${core.formatCurrencyVnd(specialItem.don_gia || 0)}`,
          amount:
            Number(specialItem.don_gia || 0) *
            Number(
              specialItem.so_luong_mac_dinh_khi_chi_tick_checkbox || 1,
            ),
          displaySlug: slug === "de_vo" ? "dong_goi_do_dac" : slug === "cong_kenh" ? "thao_lap_noi_that" : "ho_tro_thao_lap_ky_thuat",
          quantity: Number(
            specialItem.so_luong_mac_dinh_khi_chi_tick_checkbox || 1,
          ),
          note: "Tính theo checkbox đặc biệt đã chọn.",
          state: "Đang chọn",
        });
      });
    }

    if (normalizedService === "chuyen_van_phong") {
      addCalculationCharge({
        calcSlug: "dong_goi_ho_so",
        quantity: getBookingNumericValue(scope, "#so-thung-ho-so-dat-lich"),
      });

      addCalculationCharge({
        calcSlug: "bao_ve_thiet_bi_it",
        quantity: Math.max(
          getBookingNumericValue(scope, "#so-bo-may-it-dat-lich"),
          isBookingChecked(scope, "input[name='can_di_doi_server']") ? 1 : 0,
        ),
      });

      addCalculationCharge({
        calcSlug: "thao_lap_noi_that_van_phong",
        quantity: getBookingNumericValue(
          scope,
          "#so-mon-noi-that-van-phong-dat-lich",
        ),
      });

      const heavyEquipmentQty = getBookingNumericValue(
        scope,
        "#so-thiet-bi-nang-dat-lich",
      );
      const heavyEquipmentUnit = getBookingDisplayItemUnitPrice(
        serviceData,
        "van_chuyen_thiet_bi_nang",
      );
      if (heavyEquipmentQty > 0 && heavyEquipmentUnit > 0) {
        addChargeLine({
          label: "Vận chuyển thiết bị nặng",
          detail: `${heavyEquipmentQty} máy x ${core.formatCurrencyVnd(heavyEquipmentUnit)}`,
          amount: heavyEquipmentQty * heavyEquipmentUnit,
          displaySlug: "van_chuyen_thiet_bi_nang",
          quantity: heavyEquipmentQty,
          state: heavyEquipmentQty > 1 ? `Đang chọn x${heavyEquipmentQty}` : "Đang chọn",
        });
      }

      if (isBookingChecked(scope, "input[name='can_thuc_hien_cuoi_tuan']")) {
        const weekendAmount = getBookingFixedTimeWeatherAmount(
          serviceData,
          "khung_gio",
          "cuoi_tuan",
        );
        addChargeLine({
          label: "Phụ phí cuối tuần",
          detail: "Áp dụng cho ca thực hiện vào thứ bảy hoặc chủ nhật.",
          amount: weekendAmount,
          note: "Đã ghi nhận checkbox làm cuối tuần.",
          state: "Đang chọn",
        });
      }

      if (isBookingChecked(scope, "input[name='can_bao_mat_tai_lieu']")) {
        notes.push("Yêu cầu bảo mật tài liệu đã được ghi nhận để đội ngũ triển khai đúng quy trình.");
      }
    }

    if (normalizedService === "chuyen_kho_bai") {
      addCalculationCharge({
        calcSlug: "boc_xep_khoi_luong_lon",
        quantity: getBookingNumericValue(scope, "#so-nhan-su-boc-xep-dat-lich"),
      });

      addCalculationCharge({
        calcSlug: "dong_mang_co_pallet",
        quantity: getBookingNumericValue(scope, "#so-pallet-dat-lich"),
      });

      const liftShiftQty =
        getBookingNumericValue(scope, "#so-ca-xe-nang-dat-lich") +
        getBookingNumericValue(scope, "#so-ca-xe-cau-dat-lich");
      addCalculationCharge({
        calcSlug: "thue_xe_nang_cau",
        quantity: Math.max(
          liftShiftQty,
          isBookingChecked(scope, "input[name='can_xe_nang_dat_lich']") ||
            isBookingChecked(scope, "input[name='can_xe_cau_dat_lich']")
            ? 1
            : 0,
        ),
      });

      const reinforcementQty = getBookingNumericValue(
        scope,
        "#so-don-vi-gia-co-dat-lich",
      );
      const reinforcementUnit = getBookingDisplayItemUnitPrice(
        serviceData,
        "dong_goi_gia_co",
      );
      if (reinforcementQty > 0 && reinforcementUnit > 0) {
        addChargeLine({
          label: "Đóng gói & gia cố",
          detail: `${reinforcementQty} đơn vị x ${core.formatCurrencyVnd(reinforcementUnit)}`,
          amount: reinforcementQty * reinforcementUnit,
          displaySlug: "dong_goi_gia_co",
          quantity: reinforcementQty,
          state: reinforcementQty > 1 ? `Đang chọn x${reinforcementQty}` : "Đang chọn",
        });
      }

      if (isBookingChecked(scope, "input[name='can_kiem_ke_hang_hoa']")) {
        addChargeLine({
          label: "Kiểm kê & bàn giao",
          detail: "Hạng mục miễn phí đã được chọn cùng đơn hàng.",
          amount: 0,
          displaySlug: "kiem_ke_ban_giao",
          quantity: 1,
          note: "Miễn phí khi cần kiểm kê đối soát.",
          forceInclude: true,
          state: "Đang chọn",
        });
      }
    }

    const pricingTimeSlug = String(
      scope.querySelector("[data-khung-gio-tinh-gia]")?.value || "",
    ).trim();
    if (pricingTimeSlug && pricingTimeSlug !== "binh_thuong" && pricingTimeSlug !== "can_xac_nhan") {
      const timeAmount = getBookingFixedTimeWeatherAmount(
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
      notes.push("Khung giờ linh động đã được ghi nhận, hiện chưa cộng thêm phụ phí riêng.");
    }

    const weatherValue = String(
      scope.querySelector("#thoi-tiet-du-kien-dat-lich")?.value || "",
    ).trim();
    if (weatherValue === "troi_mua") {
      const weatherAmount = getBookingFixedTimeWeatherAmount(
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

    const conditionLabels = getCheckedLabels(
      scope,
      "[data-nhom-chip='dieu_kien_dat_lich'] input[type='checkbox']",
    );
    if (conditionLabels.length) {
      notes.push(
        `Điều kiện tiếp cận đã ghi nhận: ${conditionLabels.join(", ")}. Các checkbox này đang dùng để điều phối, chưa có dòng phí riêng trong bảng giá chốt.`,
      );
    }

    includedOptionSlugs.forEach((slug) => {
      if (!optionSelections.has(slug)) {
        markBookingSelectedOption(optionSelections, {
          displaySlug: slug,
          amount: 0,
          quantity: 1,
          note: "Hạng mục hỗ trợ đã gồm trong gói cơ bản.",
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
        const stateLabel = selected?.state || (selected?.included ? "Đã gồm" : "Chưa chọn");
        const amountText = selected
          ? formatBookingMoneyLine(selected.amount)
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
          <span>Step này chỉ liệt kê các mục bạn đã bật hoặc đã nhập số lượng.</span>
        </article>
      `;

    const breakdownHtml = breakdownLines.length
      ? breakdownLines.map((item) => renderBookingLineItem(item)).join("")
      : '<div class="muc-chi-tiet-gia-chot-dat-lich"><p>Chưa có dòng tính nào được kích hoạt. Chọn xe hoặc thêm hạng mục để hệ thống cập nhật ngay.</p></div>';

    return {
      title: serviceData.ten_dich_vu || "Giá chốt",
      description:
        serviceData?.thong_tin_minh_bach?.tom_tat_tong_chi_phi ||
        "Giá chốt đang bám theo bảng giá minh bạch và các lựa chọn bạn nhập trong form.",
      optionCardsHtml,
      breakdownHtml,
      breakdownLines,
      total: vehicleEntry ? total : null,
      totalNote: vehicleEntry
        ? "Giá chốt sẽ tự cập nhật ngay khi bạn đổi loại xe, số lượng hoặc checkbox phát sinh."
        : "Chọn loại xe trước để khóa cước cơ bản và hoàn tất giá chốt.",
      notes,
    };
  }

  async function renderBookingPricing(scope) {
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
    const totalValue = pricingRoot.querySelector("[data-tong-gia-chot-dat-lich]");
    const totalHint = pricingRoot.querySelector("[data-goi-y-gia-chot-dat-lich]");
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
          "Chọn dịch vụ, xe và nhập đủ các hạng mục cần dùng để hệ thống tính giá chốt.";
      }
      if (confirmEmpty) confirmEmpty.hidden = false;
      if (confirmGrid) {
        confirmGrid.hidden = true;
        confirmGrid.innerHTML = "";
      }
      if (confirmNotes) {
        confirmNotes.innerHTML =
          '<div class="muc-luu-y-xac-nhan">Giá chốt sẽ hiện khi bạn chọn dịch vụ và bắt đầu khai báo các hạng mục chính.</div>';
      }
      return;
    }

    const pricingData = await loadPricingReference();
    const serviceData = Array.isArray(pricingData)
      ? pricingData.find(
          (item) =>
            normalizePricingDataServiceId(item?.id) === pricingServiceId,
        )
      : null;

    if (!serviceData || !list) {
      if (defaultBlock) defaultBlock.hidden = false;
      if (contentBlock) {
        contentBlock.hidden = true;
        contentBlock.classList.add("is-hidden");
      }
      if (detailGrid) detailGrid.innerHTML = "";
      if (totalValue) totalValue.textContent = "Chưa đủ dữ liệu";
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
      title.textContent = serviceData.ten_dich_vu || "Giá chốt";
    }

    if (description) {
      description.textContent =
        serviceData?.thong_tin_minh_bach?.tom_tat_tong_chi_phi ||
        serviceData?.thong_tin_minh_bach?.phu_hop_khi ||
        "Hệ thống đang hiển thị đúng gói cơ bản, hạng mục chọn thêm và giá chốt của dịch vụ bạn đã chọn.";
    }

    const pricingState = buildBookingPricingState(scope, serviceData);

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

    if (confirmEmpty) confirmEmpty.hidden = false;
    if (confirmGrid) {
      const confirmationItems = pricingState.breakdownLines.map((item) => {
        const detail = String(item.detail || "").trim();
        return `
          <article class="the-gia-xac-nhan-dat-lich">
            <h5>${core.escapeHtml(item.label || "")}</h5>
            <strong>${core.escapeHtml(formatBookingMoneyLine(item.amount))}</strong>
            <span>${core.escapeHtml(detail || "Đã ghi nhận theo lựa chọn hiện tại.")}</span>
          </article>
        `;
      });

      confirmationItems.push(`
        <article class="the-gia-xac-nhan-dat-lich the-gia-xac-nhan-dat-lich--tong">
          <h5>Tổng giá chốt</h5>
          <strong>${core.escapeHtml(
            pricingState.total === null
              ? "Chưa đủ dữ liệu"
              : core.formatCurrencyVnd(pricingState.total),
          )}</strong>
          <span>${core.escapeHtml(pricingState.totalNote)}</span>
        </article>
      `);

      confirmEmpty.hidden = true;
      confirmGrid.hidden = false;
      confirmGrid.innerHTML = confirmationItems.join("");
    }

    if (confirmNotes) {
      confirmNotes.innerHTML = pricingState.notes
        .concat([
          "Nếu bạn đổi loại xe, thay số lượng hạng mục hoặc bật thêm checkbox phát sinh, giá chốt sẽ tự cập nhật ngay trong form.",
        ])
        .map((note) => `<div class="muc-luu-y-xac-nhan">${note}</div>`)
        .join("");
    }
  }

  function renderSurveySummary(scope) {
    const summaryBox = scope.querySelector("[data-tom-tat-khao-sat]");
    if (!summaryBox) return;

    const serviceSelect = scope.querySelector("#loai-dich-vu-khao-sat");
    const addressInput = scope.querySelector("#dia-chi-khao-sat");
    const destinationInput = scope.querySelector("#dia-chi-diem-den-du-kien");
    const companyInput = scope.querySelector("#ten-don-vi-khao-sat");
    const contactInput = scope.querySelector("#nguoi-lien-he-tai-diem");
    const landmarkInput = scope.querySelector("#moc-nhan-dien-loi-vao-khao-sat");
    const serviceValue = serviceSelect?.value || "";

    const values = {
      dich_vu: serviceValue ? getSelectedLabel(serviceSelect) : "Chưa chọn",
      don_vi: String(companyInput?.value || "").trim() || "Không có",
      nguoi_lien_he: String(contactInput?.value || "").trim() || "Chưa nhập",
      dia_chi: String(addressInput?.value || "").trim() || "Chưa nhập",
      dia_chi_diem_den:
        String(destinationInput?.value || "").trim() || "Chưa có",
      moc_nhan_dien:
        String(landmarkInput?.value || "").trim() || "Chưa nhập",
      lich_khao_sat: formatSurveySchedule(scope),
      hinh_thuc:
        getCheckedLabel(scope, "input[name='hinh_thuc_khao_sat']") ||
        "Chưa chọn",
      muc_do_gap:
        getCheckedLabel(scope, "input[name='muc_do_gap']") || "Chưa chọn",
      dieu_kien: `${countChecked(
        scope,
        "[data-nhom-chip='dieu_kien_tiep_can'] input[type='checkbox']",
      )} mục`,
      hang_muc: `${countChecked(
        scope,
        "[data-nhom-chip='hang_muc_dac_biet'] input[type='checkbox']",
      )} mục`,
      chi_tiet: formatSurveyServiceDetail(scope, serviceValue),
      tep_dinh_kem: `${countFiles(
        scope,
        "#tep-anh-khao-sat, #tep-video-khao-sat",
      )} tệp`,
    };

    Object.entries(values).forEach(([key, value]) => {
      const target = summaryBox.querySelector(`[data-tom-tat='${key}']`);
      if (target) target.textContent = value;
    });
  }

  function renderBookingSummary(scope) {
    const summaryBox = scope.querySelector("[data-tom-tat-dat-lich]");
    if (!summaryBox) return;

    const serviceSelect = scope.querySelector("#loai-dich-vu-dat-lich");
    const contactInput = scope.querySelector("#ho-ten-dat-lich");
    const phoneInput = scope.querySelector("#so-dien-thoai-dat-lich");
    const companyInput = scope.querySelector("#ten-cong-ty-dat-lich");
    const fromInput = scope.querySelector("#dia-chi-di-dat-lich");
    const toInput = scope.querySelector("#dia-chi-den-dat-lich");
    const vehicleSelect = scope.querySelector("#loai-xe-dat-lich");
    const weatherSelect = scope.querySelector("#thoi-tiet-du-kien-dat-lich");
    const noteInput = scope.querySelector("#ghi-chu-dat-lich");
    const pricingTimeInput = scope.querySelector("[data-khung-gio-tinh-gia]");
    const serviceValue = serviceSelect?.value || "";
    const fromText = String(fromInput?.value || "").trim();
    const toText = String(toInput?.value || "").trim();

    const routeText =
      fromText && toText
        ? `${fromText} → ${toText}`
        : fromText || toText || "Chưa nhập";

    const values = {
      nguoi_lien_he: String(contactInput?.value || "").trim() || "Chưa nhập",
      so_dien_thoai: String(phoneInput?.value || "").trim() || "Chưa nhập",
      don_vi: String(companyInput?.value || "").trim() || "Không có",
      dich_vu: serviceSelect?.value
        ? getSelectedLabel(serviceSelect)
        : "Chưa chọn",
      lo_trinh: routeText,
      lich_thuc_hien: formatBookingSchedule(scope),
      khoang_cach: formatBookingDistance(scope),
      loai_xe: getSelectedLabel(vehicleSelect) || "Chưa chọn",
      khung_gio_tinh_gia:
        getBookingPricingTimeLabel(pricingTimeInput?.value || "") || "Chưa chọn",
      thoi_tiet: getSelectedLabel(weatherSelect) || "Chưa chọn",
      trien_khai: formatBookingDeploymentDetail(scope, serviceValue),
      dieu_kien: formatBookingConditionDetail(scope),
      chi_tiet: formatBookingServiceDetail(scope, serviceValue),
      ghi_chu: String(noteInput?.value || "").trim() || "Chưa có",
      tep_dinh_kem: `${countFiles(
        scope,
        "#tep-anh-dat-lich, #tep-video-dat-lich",
      )} tệp`,
    };

    Object.entries(values).forEach(([key, value]) => {
      const target = summaryBox.querySelector(`[data-tom-tat-dat-lich='${key}']`);
      if (target) target.textContent = value;
    });
  }

  function renderFormSummaries(scope) {
    renderSurveySummary(scope);
    renderBookingSummary(scope);
  }

  function resetFieldValue(field) {
    field.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.matches("input[type='checkbox'], input[type='radio']")) {
        input.checked = false;
        return;
      }

      if (input.tagName === "SELECT") {
        input.selectedIndex = 0;
        return;
      }

      input.value = "";
    });
  }

  function applyServiceState(scope, serviceValue) {
    const normalized = normalizeService(serviceValue);
    const emptyPanel = scope.querySelector("[data-khoi-mac-dinh]");
    const companyLabel = scope.querySelector("[data-nhan-cong-ty-dat-lich]");

    if (companyLabel) {
      companyLabel.textContent =
        normalized === "chuyen_van_phong"
          ? "Tên công ty"
          : normalized === "chuyen_kho_bai"
            ? "Tên kho hoặc đơn vị vận hành"
            : "Tên công ty hoặc đơn vị";
    }

    scope.querySelectorAll("[data-khoi-dich-vu]").forEach((panel) => {
      const shouldShow =
        normalized && panel.getAttribute("data-khoi-dich-vu") === normalized;
      panel.hidden = !shouldShow;
      panel.classList.toggle("is-hidden", !shouldShow);
    });

    if (emptyPanel) {
      emptyPanel.hidden = !!normalized;
    }

    scope.querySelectorAll("[data-hien-theo-dich-vu]").forEach((field) => {
      const allowed = String(
        field.getAttribute("data-hien-theo-dich-vu") || "",
      )
        .split(",")
        .map((value) => normalizeService(value))
        .filter(Boolean);
      const shouldShow = !!normalized && allowed.includes(normalized);

      field.hidden = !shouldShow;
      field.classList.toggle("is-hidden", !shouldShow);

      if (!shouldShow) {
        resetFieldValue(field);
      }
    });

    syncBookingVehicleOptions(scope, normalized);
    syncBookingPricingTimeSlot(scope);
    renderFormSummaries(scope);
    renderBookingPricing(scope);

    if (scope.__bookingMapState?.map) {
      const refreshMapLayout = function () {
        scope.__bookingMapState.map.invalidateSize();
        scope.__bookingMapState.updateMapBounds?.();
      };

      refreshMapLayout();
      window.requestAnimationFrame(refreshMapLayout);
      window.setTimeout(refreshMapLayout, 120);
    }
  }

  function initServiceSelect(scope) {
    const select = scope.querySelector("[data-truong-dich-vu]");
    if (!select) return;

    const params = new URLSearchParams(window.location.search);
    const initialValue = normalizeService(params.get("dich-vu"));
    if (initialValue) {
      select.value = initialValue;
    }

    applyServiceState(scope, select.value);
    select.addEventListener("change", function () {
      applyServiceState(scope, select.value);
    });
  }

  function initFileInputs(scope) {
    scope
      .querySelectorAll("input[type='file'][data-dich-ten-tep]")
      .forEach((input) => {
        const targetId = input.getAttribute("data-dich-ten-tep");
        const output = targetId ? scope.querySelector(`#${targetId}`) : null;
        const emptyText =
          input.getAttribute("data-van-ban-rong") || "Chưa có tệp nào được chọn";
        if (!output) return;

        input.addEventListener("change", function () {
          const total = input.files ? input.files.length : 0;
          if (!total) {
            output.textContent = emptyText;
            updateFilePreview(scope, input);
            return;
          }

          if (total === 1) {
            output.textContent = input.files[0].name;
            updateFilePreview(scope, input);
            return;
          }

          output.textContent = `${total} tệp đã được chọn`;
          updateFilePreview(scope, input);
        });
      });
  }

  function initInfoToggles(scope) {
    const detailsList = Array.from(scope.querySelectorAll(".goi-y-thong-tin"));
    if (!detailsList.length) return;

    detailsList.forEach((details) => {
      details.addEventListener("toggle", function () {
        if (!details.open) return;

        detailsList.forEach((other) => {
          if (other !== details) {
            other.open = false;
          }
        });
      });
    });
  }

  function initSurveyFormUi(scope) {
    if (!scope.querySelector(".form-khao-sat")) return;

    const specialTrigger = scope.querySelector("[data-bat-khac]");
    if (specialTrigger) {
      specialTrigger.addEventListener("change", function () {
        updateSpecialItemField(scope);
        renderSurveySummary(scope);
      });
    }

    scope.addEventListener("input", function () {
      renderSurveyMapPreview(scope);
      renderFormSummaries(scope);
    });

    scope.addEventListener("change", function () {
      updateSpecialItemField(scope);
      renderSurveyMapPreview(scope);
      renderFormSummaries(scope);
    });

    updateSpecialItemField(scope);
    initSurveyMap(scope);
    renderSurveyMapPreview(scope);
    renderFormSummaries(scope);
  }

  function getBookingStepPanels(scope) {
    return Array.from(scope.querySelectorAll("[data-booking-step]"));
  }

  function getBookingCurrentStep(scope) {
    const activePanel = getBookingStepPanels(scope).find((panel) => !panel.hidden);
    return Number(activePanel?.getAttribute("data-booking-step") || 1);
  }

  function isBookingFieldVisible(field) {
    return !field.disabled && !field.hidden && !field.closest("[hidden]");
  }

  function validateBookingStep(scope, stepNumber) {
    const panel = scope.querySelector(`[data-booking-step="${stepNumber}"]`);
    if (!panel) return true;

    // Clear previous errors
    panel.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
    panel.querySelectorAll('.field-error-msg').forEach((el) => el.remove());

    let isValid = true;
    let firstErrorField = null;

    const markError = (field, message) => {
      isValid = false;
      field.classList.add('input-error');
      
      const group = field.closest('.nhom-truong') || field.parentElement;
      let errorEl = group.querySelector('.field-error-msg');
      if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error-msg';
        // Thêm thông báo ngay dưới thẻ input/select
        field.insertAdjacentElement('afterend', errorEl);
      }
      errorEl.textContent = '❌ Lỗi: ' + message;
      
      if (!firstErrorField) firstErrorField = field;
    };

    const markMapError = (message) => {
      isValid = false;
      const mapBtn = panel.querySelector('.nut-ban-do-ui-vi-tri');
      if (mapBtn) {
        mapBtn.classList.add('input-error');
        let errorEl = mapBtn.parentElement.querySelector('.field-error-msg');
        if (!errorEl) {
          errorEl = document.createElement('span');
          errorEl.className = 'field-error-msg';
          mapBtn.insertAdjacentElement('afterend', errorEl);
        }
        errorEl.textContent = '❌ Lỗi: ' + message;
        if (!firstErrorField) firstErrorField = mapBtn;
      }
    };

    // 1. Kiểm tra trường bắt buộc (required) cơ bản
    const fields = panel.querySelectorAll("input, select, textarea");
    for (const field of fields) {
      if (!isBookingFieldVisible(field)) continue;
      
      if (field.hasAttribute("required") && !field.value.trim()) {
        const labelText = field.closest('.nhom-truong')?.querySelector('.nhan-truong')?.textContent.replace('*', '').trim() || 'Trường này';
        markError(field, `Vui lòng nhập/chọn ${labelText.toLowerCase()}`);
      } else if (field.type === "tel" && field.value.trim()) {
        const phoneRegex = /^(0|\+84)[0-9]{9}$/;
        if (!phoneRegex.test(field.value.replace(/\s+/g, ''))) {
          markError(field, "Số điện thoại không hợp lệ (cần đủ 10 số)");
        }
      }
    }

    // 2. Logic kiểm tra chuyên sâu theo từng bước (Business Logic)
    if (stepNumber === 1) {
      const fromAddr = panel.querySelector('#dia-chi-di-dat-lich')?.value.trim();
      const toAddr = panel.querySelector('#dia-chi-den-dat-lich')?.value.trim();
      
      if (fromAddr && toAddr && fromAddr.toLowerCase() === toAddr.toLowerCase()) {
        markError(panel.querySelector('#dia-chi-den-dat-lich'), "Điểm đến không được trùng với điểm đi.");
      }

      const latFrom = scope.querySelector('input[name="vi_tri_diem_di_lat"]')?.value;
      const latTo = scope.querySelector('input[name="vi_tri_diem_den_lat"]')?.value;
      
      if (!latFrom || !latTo) {
        markMapError("Vui lòng lấy vị trí hoặc kéo ghim trên bản đồ để tính khoảng cách.");
      }
    }

    if (stepNumber === 3) {
      const dateField = panel.querySelector('#ngay-thuc-hien-dat-lich');
      if (dateField && dateField.value) {
        const selectedDate = new Date(dateField.value);
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          markError(dateField, "Ngày thực hiện không được ở trong quá khứ.");
        }
      }
    }

    // 3. Xử lý UI nếu có lỗi
    if (!isValid && firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof firstErrorField.focus === 'function') {
        firstErrorField.focus({ preventScroll: true });
      }
    }

    return isValid;
  }

  function updateBookingStepIndicator(scope, currentStep) {
    scope
      .querySelectorAll("[data-booking-step-indicator-item]")
      .forEach((item) => {
        const step = Number(item.getAttribute("data-booking-step-indicator-item") || 0);
        item.classList.toggle("is-active", step === currentStep);
        item.classList.toggle("is-completed", step < currentStep);
      });

    const finalActions = scope.querySelector("[data-booking-final-actions]");
    if (finalActions) {
      finalActions.hidden = currentStep !== 6;
    }
  }

  function goToBookingStep(scope, targetStep, options = {}) {
    const panels = getBookingStepPanels(scope);
    if (!panels.length) return;

    const maxStep = panels.length;
    const nextStep = Math.min(Math.max(Number(targetStep || 1), 1), maxStep);
    const currentStep = getBookingCurrentStep(scope);

    if (!options.force && nextStep > currentStep) {
      for (let step = currentStep; step < nextStep; step += 1) {
        if (!validateBookingStep(scope, step)) return;
      }
    }

    panels.forEach((panel) => {
      const step = Number(panel.getAttribute("data-booking-step") || 0);
      const isActive = step === nextStep;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    updateBookingStepIndicator(scope, nextStep);

    if (nextStep === 6) {
      renderFormSummaries(scope);
      renderBookingMediaReview(scope);
      renderBookingPricing(scope);
    }

    if ((nextStep === 1 || nextStep === 2) && scope.__bookingMapState?.map) {
      const refreshMapLayout = function () {
        scope.__bookingMapState.map.invalidateSize();
        scope.__bookingMapState.updateMapBounds?.();
      };
      refreshMapLayout();
      window.requestAnimationFrame(refreshMapLayout);
    }

    const activePanel = scope.querySelector(`[data-booking-step="${nextStep}"]`);
    activePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initBookingStepWizard(scope) {
    if (!scope.querySelector("[data-booking-step]")) return;

    scope.querySelectorAll("[data-booking-step-next]").forEach((button) => {
      button.addEventListener("click", function () {
        const nextStep = Number(button.getAttribute("data-booking-step-next") || 0);
        if (nextStep) {
          goToBookingStep(scope, nextStep);
        }
      });
    });

    scope.querySelectorAll("[data-booking-step-prev]").forEach((button) => {
      button.addEventListener("click", function () {
        const previousStep = Number(button.getAttribute("data-booking-step-prev") || 0);
        if (previousStep) {
          goToBookingStep(scope, previousStep, { force: true });
        }
      });
    });

    scope.querySelectorAll("[data-booking-step-indicator-item]").forEach((button) => {
      button.addEventListener("click", function () {
        const targetStep = Number(
          button.getAttribute("data-booking-step-indicator-item") || 0,
        );
        if (!targetStep) return;

        const currentStep = getBookingCurrentStep(scope);
        if (targetStep <= currentStep) {
          goToBookingStep(scope, targetStep, { force: true });
        }
      });
    });

    goToBookingStep(scope, 1, { force: true });
  }

  function initBookingFormUi(scope) {
    if (!scope.querySelector(".form-dat-lich")) return;

    scope.addEventListener("input", function (event) {
      if (event.target && event.target.classList.contains("input-error")) {
        event.target.classList.remove("input-error");
        const group = event.target.closest('.nhom-truong') || event.target.parentElement;
        const msg = group?.querySelector('.field-error-msg');
        if (msg) msg.remove();
      }

      syncBookingPricingTimeSlot(scope);
      renderBookingMapPreview(scope);
      renderFormSummaries(scope);
      renderBookingMediaReview(scope);
      renderBookingPricing(scope);
      refreshBookingWeather(scope);
    });

    scope.addEventListener("change", function (event) {
      if (event.target && event.target.classList.contains("input-error")) {
        event.target.classList.remove("input-error");
        const group = event.target.closest('.nhom-truong') || event.target.parentElement;
        const msg = group?.querySelector('.field-error-msg');
        if (msg) msg.remove();
      }

      syncBookingPricingTimeSlot(scope);
      renderBookingMapPreview(scope);
      renderFormSummaries(scope);
      renderBookingMediaReview(scope);
      renderBookingPricing(scope);
      refreshBookingWeather(scope);
    });

    initBookingMap(scope);
    syncBookingExecutionDateLimits(scope);
    syncBookingVehicleOptions(
      scope,
      scope.querySelector("#loai-dich-vu-dat-lich")?.value || "",
    );
    syncBookingPricingTimeSlot(scope);
    renderBookingMapPreview(scope);
    renderFormSummaries(scope);
    renderBookingMediaReview(scope);
    renderBookingPricing(scope);
    refreshBookingWeather(scope);
    initBookingStepWizard(scope);
  }

  function initFormNotice(scope, formType) {
    const form = scope.querySelector("form[data-loai-bieu-mau]");
    const notice = scope.querySelector("[data-thong-bao-bieu-mau]");
    if (!form || !notice) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.reportValidity()) return;

      if (formType === "khao-sat") {
        notice.textContent =
          "Biểu mẫu khảo sát đã sẵn sàng về nội dung và giao diện. Chức năng gửi yêu cầu chính thức đang được hoàn thiện.";
      } else {
        notice.textContent =
          "Biểu mẫu đặt lịch đã sẵn sàng về nội dung và giao diện. Chức năng gửi yêu cầu chính thức đang được hoàn thiện.";
      }

      notice.hidden = false;
      notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function initFormHost(host) {
    const formType = host.getAttribute("data-bieu-mau-trang");
    const partialPath = partialPaths[formType];
    if (!formType || !partialPath) return;

    const html = loadPartial(partialPath);
    if (!html) return;

    host.innerHTML = html;
    initInfoToggles(host);
    initServiceSelect(host);
    initFileInputs(host);
    initSurveyFormUi(host);
    initBookingFormUi(host);
    initFormNotice(host, formType);
  }

  onReady(function () {
    document.querySelectorAll("[data-bieu-mau-trang]").forEach(initFormHost);
  });
})(window, document);
