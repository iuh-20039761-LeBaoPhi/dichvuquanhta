(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});

  const mapPicker = (() => {
    const HCM = [10.7769, 106.7009];
    let map = null;
    let marker = null;
    let leafletPromise = null;

    function getFirstElementById(ids) {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
      }
      return null;
    }

    function getAddressInput() {
      return getFirstElementById(["diachi", "address"]);
    }

    function uniqueNonEmpty(items) {
      const seen = new Set();
      return items.filter((item) => {
        if (!item) return false;
        const normalized = String(item).trim();
        if (!normalized) return false;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function buildDetailedAddress(address, displayName) {
      if (!address) return displayName || "";

      const parts = uniqueNonEmpty([
        address.house_number,
        address.road || address.pedestrian || address.footway || address.path,
        address.hamlet || address.allotments || address.city_block,
        address.suburb || address.neighbourhood || address.quarter,
        address.city_district || address.district || address.borough,
        address.city || address.town || address.village || address.municipality,
        address.state_district,
        address.state,
        address.postcode,
        address.country,
      ]);

      if (parts.length >= 3) return parts.join(", ");
      return displayName || parts.join(", ");
    }

    function ensureLeaflet() {
      if (window.L && typeof window.L.map === "function") {
        return Promise.resolve();
      }

      if (leafletPromise) {
        return leafletPromise;
      }

      leafletPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(
          'script[data-map-picker="leaflet"]',
        );
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), {
            once: true,
          });
          existingScript.addEventListener(
            "error",
            () => reject(new Error("Không tải được Leaflet")),
            { once: true },
          );
          return;
        }

        if (!document.querySelector('link[data-map-picker="leaflet"]')) {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
          css.crossOrigin = "";
          css.setAttribute("data-map-picker", "leaflet");
          document.head.appendChild(css);
        }

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity =
          "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.async = true;
        script.setAttribute("data-map-picker", "leaflet");
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Không tải được Leaflet"));
        document.head.appendChild(script);
      });

      return leafletPromise;
    }

    function init() {
      if (map) {
        map.invalidateSize();
        return Promise.resolve();
      }

      return ensureLeaflet().then(() => {
        const mapEl = getFirstElementById(["bando", "mapPickerEl"]);
        if (!mapEl) return;

        map = L.map(mapEl).setView(HCM, 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        map.on("click", function (e) {
          pick(e.latlng.lat, e.latlng.lng);
        });
      });
    }

    function pick(lat, lng) {
      if (!map) return;

      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map);
      map.panTo([lat, lng]);

      const addr = getAddressInput();
      if (!addr) return;

      addr.placeholder = "Đang tải địa chỉ...";
      addr.value = "";

      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&namedetails=1`,
        {
          headers: { "Accept-Language": "vi" },
        },
      )
        .then((r) => r.json())
        .then((data) => {
          addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";

          if (!data || !data.address) {
            addr.value = (data && data.display_name) || "";
            return;
          }

          addr.value = buildDetailedAddress(data.address, data.display_name);
          addr.dataset.lat = String(lat);
          addr.dataset.lng = String(lng);
          addr.dataset.coordAddress = addr.value;
          if (addr.value) {
            marker.bindPopup(`<small>${addr.value}</small>`).openPopup();
          }

          const toaDoBadges = document.getElementById("toaDoHienThi");
          if (toaDoBadges) {
            toaDoBadges.innerHTML = `
              <span class="badge bg-info text-dark me-2 border border-info rounded-pill px-3 py-2 shadow-sm">
                <i class="fas fa-location-arrow me-1"></i> Lat: <strong>${Number(lat).toFixed(6)}</strong>
              </span>
              <span class="badge bg-success text-white border border-success rounded-pill px-3 py-2 shadow-sm">
                <i class="fas fa-map-marker-alt me-1"></i> Lng: <strong>${Number(lng).toFixed(6)}</strong>
              </span>
            `;
          }

          addr.dispatchEvent(new Event("input", { bubbles: true }));
          addr.dispatchEvent(new Event("change", { bubbles: true }));
        })
        .catch(() => {
          addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";
          addr.value = `Vĩ độ ${lat.toFixed(6)}, Kinh độ ${lng.toFixed(6)}`;
          addr.dataset.lat = String(lat);
          addr.dataset.lng = String(lng);
          addr.dataset.coordAddress = addr.value;

          const toaDoBadges = document.getElementById("toaDoHienThi");
          if (toaDoBadges) {
             toaDoBadges.innerHTML = `
              <span class="badge bg-info text-dark me-2 border border-info rounded-pill px-3 py-2 shadow-sm">
                <i class="fas fa-location-arrow me-1"></i> Lat: <strong>${Number(lat).toFixed(6)}</strong>
              </span>
              <span class="badge bg-success text-white border border-success rounded-pill px-3 py-2 shadow-sm">
                <i class="fas fa-map-marker-alt me-1"></i> Lng: <strong>${Number(lng).toFixed(6)}</strong>
              </span>
            `;
          }

          addr.dispatchEvent(new Event("input", { bubbles: true }));
          addr.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    function toggle() {
      const box = getFirstElementById(["khungbando", "mapPickerBox"]);
      const btn = document.getElementById("nutbando");
      if (!box || !btn) return;

      const opening = box.style.display === "none" || box.style.display === "";
      box.style.display = opening ? "block" : "none";

      if (opening) {
        btn.innerHTML = '<i class="fas fa-times me-1"></i> Đóng bản đồ';
        btn.classList.add("active");
        setTimeout(() => {
          init().then(() => {
            if (map) map.invalidateSize();
          });
        }, 50);
      } else {
        btn.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i> Mở bản đồ';
        btn.classList.remove("active");
      }
    }

    function gps() {
      if (!navigator.geolocation) {
        alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
        return;
      }

      const addr = getAddressInput();
      if (!addr) return;

      const origPlaceholder = addr.placeholder;
      addr.placeholder = "Đang xác định vị trí...";

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const box = getFirstElementById(["khungbando", "mapPickerBox"]);
          if (
            box &&
            (box.style.display === "none" || box.style.display === "")
          ) {
            toggle();
          }

          setTimeout(
            () => {
              if (!map) {
                init().then(() => {
                  if (!map) return;
                  map.setView([lat, lng], 16);
                  pick(lat, lng);
                });
                return;
              }

              map.setView([lat, lng], 16);
              pick(lat, lng);
            },
            map ? 0 : 350,
          );
        },
        (err) => {
          addr.placeholder = origPlaceholder;
          if (err.code === 1) {
            alert(
              "Vui lòng cho phép truy cập vị trí trong trình duyệt để sử dụng tính năng này.",
            );
          } else {
            alert(
              "Không thể xác định vị trí. Vui lòng thử lại hoặc nhập địa chỉ thủ công.",
            );
          }
        },
        { timeout: 10000, enableHighAccuracy: true },
      );
    }

    function refresh() {
      if (map) {
        map.invalidateSize();
        return;
      }
      init();
    }

    return { toggle, gps, refresh };
  })();

  function mapPickerInit() {
    const locateBtn = document.getElementById("nutvitrihientai");
    const toggleMapBtn = document.getElementById("nutbando");
    const bookingModal = document.getElementById("bookingModal");

    if (locateBtn && !locateBtn.dataset.loaded) {
      locateBtn.dataset.loaded = "true";

      locateBtn.addEventListener("click", function () {
        locateBtn.disabled = true;
        locateBtn.innerHTML = "Đang lấy vị trí...";

        try {
          mapPicker.gps();
        } finally {
          setTimeout(() => {
            locateBtn.disabled = false;
            locateBtn.innerHTML =
              '<i class="fas fa-location-arrow"></i> Vị trí hiện tại';
          }, 500);
        }
      });
    }

    if (toggleMapBtn && !toggleMapBtn.dataset.loaded) {
      toggleMapBtn.dataset.loaded = "true";
      toggleMapBtn.addEventListener("click", function () {
        mapPicker.toggle();
      });
    }

    if (bookingModal && !bookingModal.dataset.mapSyncLoaded) {
      bookingModal.dataset.mapSyncLoaded = "true";
      bookingModal.addEventListener("shown.bs.modal", function () {
        setTimeout(() => mapPicker.refresh(), 80);
      });
    }
  }

  app.map = app.map || {};
  app.map.mapPicker = mapPicker;
  app.map.mapPickerInit = mapPickerInit;
})(window);
