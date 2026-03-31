(function (window) {
  if (window.FastGoSurveyMap) return;

  // Tách riêng bản đồ khảo sát để main-forms không phải ôm geocode và drag marker.
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
      { headers: { Accept: "application/json" } },
    );
    const data = await response.json();
    return String(data?.display_name || "").trim();
  }

  async function geocodeSurveyAddress(address) {
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

  // Khởi tạo map khảo sát với hai ghim: điểm khảo sát và điểm đến dự kiến.
  function initSurveyMap(scope, deps) {
    const { renderFormSummaries } = deps;
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

  window.FastGoSurveyMap = {
    renderSurveyMapPreview,
    initSurveyMap,
  };
})(window);
