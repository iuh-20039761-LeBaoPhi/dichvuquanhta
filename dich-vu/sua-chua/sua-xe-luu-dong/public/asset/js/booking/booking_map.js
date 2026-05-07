(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});

  const mapPicker = (() => {
    const HCM = [10.7769, 106.7009];
    let map = null;
    let marker = null;
    let currentPopup = null;
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

    let isInitializing = false;
    function init() {
      if (map) {
        map.invalidateSize();
        return Promise.resolve();
      }
      
      if (isInitializing && leafletPromise) {
        return leafletPromise.then(() => init());
      }

      isInitializing = true;
      return ensureLeaflet().then(() => {
        if (map) {
          isInitializing = false;
          return;
        }
        const mapEl = getFirstElementById(["osmMap", "mapPickerEl"]);
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

        isInitializing = false;
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
          
          const latDisplay = document.getElementById("latDisplay");
          const lngDisplay = document.getElementById("lngDisplay");
          const toaDoHienThi = document.getElementById("toaDoHienThi");
          if (latDisplay && lngDisplay && toaDoHienThi) {
            latDisplay.innerText = `Lat: ${Number(lat).toFixed(6)}`;
            lngDisplay.innerText = `Lng: ${Number(lng).toFixed(6)}`;
            toaDoHienThi.style.setProperty('display', 'flex', 'important');
          }

          addr.dataset.fromPick = "true";
          addr.dispatchEvent(new Event("input", { bubbles: true }));
          addr.dispatchEvent(new Event("change", { bubbles: true }));
          if (addr.value) {
            if (currentPopup) map.closePopup(currentPopup);
            currentPopup = L.popup({ autoClose: false })
              .setLatLng([lat, lng])
              .setContent(`<small>${addr.value}</small>`);
            currentPopup.openOn(map);
          }
          setTimeout(() => { addr.dataset.fromPick = "false"; }, 100);
        })
        .catch(() => {
          addr.placeholder = "Số nhà, đường, phường/xã, quận/huyện...";
          addr.value = `Vĩ độ ${lat.toFixed(6)}, Kinh độ ${lng.toFixed(6)}`;
          addr.dataset.lat = String(lat);
          addr.dataset.lng = String(lng);

          const latDisplay = document.getElementById("latDisplay");
          const lngDisplay = document.getElementById("lngDisplay");
          const toaDoHienThi = document.getElementById("toaDoHienThi");
          if (latDisplay && lngDisplay && toaDoHienThi) {
            latDisplay.innerText = `Lat: ${Number(lat).toFixed(6)}`;
            lngDisplay.innerText = `Lng: ${Number(lng).toFixed(6)}`;
            toaDoHienThi.style.setProperty('display', 'flex', 'important');
          }

          addr.dataset.fromPick = "true";
          addr.dispatchEvent(new Event("input", { bubbles: true }));
          addr.dispatchEvent(new Event("change", { bubbles: true }));
          setTimeout(() => { addr.dataset.fromPick = "false"; }, 100);
        });
    }

    function toggle() {
      const box = getFirstElementById(["osmMapWrapper", "mapPickerBox"]);
      const btn = document.getElementById("nutmobando");
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

          const box = getFirstElementById(["osmMapWrapper", "mapPickerBox"]);
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
                  if (map) {
                    map.setView([lat, lng], 16);
                  }
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

    // Timer & AbortController dùng chung cho chế độ live
    let _liveTimer = null;
    let _liveAbort = null;

    /**
     * lookup(query, opts)
     *   opts.live     = true  → debounce 700ms, chỉ chạy khi bản đồ đang mở, panTo mượt (real-time follow)
     *   opts.autoOpen = true  → tự mở bản đồ nếu đang ẩn trước khi fetch (dùng khi điền tự động từ tài khoản)
     *   (mặc định)           → fetch ngay, setView, hiện popup (dùng khi người dùng bấm/blur)
     */
    function lookup(query, { live = false } = {}) {
      if (!query || query.length < 5) return;

      // ── Hàm cập nhật marker & tọa độ sau khi có kết quả ──
      function _applyLocation(lat, lng, showPopup, popupText) {
        init().then(() => {
          if (!map) return;
          
          // Đảm bảo kích thước map chuẩn trước khi pan
          map.invalidateSize();

          const setViewAction = () => {
            if (live) {
              map.panTo([lat, lng], { animate: true, duration: 0.5 });
            } else {
              map.setView([lat, lng], 16, { animate: false });
            }
          };

          // Nếu map vừa được tạo, đợi một chút để DOM ổn định
          if (isInitializing) {
             setTimeout(setViewAction, 100);
          } else {
             setViewAction();
          }
          if (marker) map.removeLayer(marker);
          if (currentPopup) map.closePopup(currentPopup);
          
          marker = L.marker([lat, lng]).addTo(map);
          if (showPopup) {
            const content = popupText || query;
            const popupContent = `<small>${content}</small>`;
            currentPopup = L.popup({ autoClose: false })
              .setLatLng([lat, lng])
              .setContent(popupContent);
            
            currentPopup.openOn(map);
          }

          // Cập nhật tọa độ hiển thị
          const latDisplay = document.getElementById('latDisplay');
          const lngDisplay = document.getElementById('lngDisplay');
          const toaDoHienThi = document.getElementById('toaDoHienThi');
          if (latDisplay && lngDisplay && toaDoHienThi) {
            latDisplay.innerText = `Lat: ${lat.toFixed(6)}`;
            lngDisplay.innerText = `Lng: ${lng.toFixed(6)}`;
            toaDoHienThi.style.setProperty('display', 'flex', 'important');
          }

          // Lưu tọa độ vào input địa chỉ
          const addrEl = getAddressInput();
          if (addrEl) {
            addrEl.dataset.lat = lat;
            addrEl.dataset.lng = lng;
          }
        });
      }

      // ── Hàm hiển thị danh sách gợi ý (Autocomplete) ──
      function _renderSuggestions(data) {
        const addrEl = getAddressInput();
        if (!addrEl) return;

        let list = document.getElementById('mapSuggestionsList');
        if (!list) {
          list = document.createElement('div');
          list.id = 'mapSuggestionsList';
          list.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            z-index: 9999;
            max-height: 250px;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-radius: 0 0 8px 8px;
          `;
          addrEl.parentNode.style.position = 'relative';
          addrEl.parentNode.appendChild(list);
        }

        if (!data || !data.length) {
          list.style.display = 'none';
          return;
        }

        list.innerHTML = '';
        list.style.display = 'block';

        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'suggestion-item';
          div.style.cssText = `
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
            transition: background 0.2s;
          `;
          div.innerHTML = `<i class="fas fa-map-marker-alt text-danger me-2"></i> ${item.display_name}`;
          
          div.addEventListener('mouseover', () => div.style.background = '#f8f9fa');
          div.addEventListener('mouseout', () => div.style.background = 'white');

          div.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Đặt cờ hiệu để chặn sự kiện change/lookup thừa
            addrEl.dataset.fromPick = "true";
            addrEl.value = item.display_name;
            
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            
            _applyLocation(lat, lng, true, item.display_name); // Hiện popup với địa chỉ đầy đủ
            list.style.display = 'none';
            
            // Reset cờ hiệu sau một khoảng thời gian ngắn
            setTimeout(() => { addrEl.dataset.fromPick = "false"; }, 500);
          });

          list.appendChild(div);
        });

        // Đóng list khi click ra ngoài
        document.addEventListener('click', function _hideList(e) {
          if (!addrEl.contains(e.target) && !list.contains(e.target)) {
            list.style.display = 'none';
            document.removeEventListener('click', _hideList);
          }
        });
      }

      // ── Hàm thực sự gọi Nominatim ──
      function _doFetch(signal) {
        const limit = live ? 5 : 1; // Live lấy 5 để gợi ý, bình thường lấy 1
        return fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&countrycodes=vn`,
          { headers: { 'Accept-Language': 'vi' }, ...(signal ? { signal } : {}) }
        )
          .then(r => r.json())
          .then(data => {
            if (!data || !data.length) {
              if (live) _renderSuggestions([]);
              return;
            }

            if (live) {
              // Ở chế độ live: hiển thị list gợi ý + pan bản đồ tới kết quả đầu tiên
              _renderSuggestions(data);
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              _applyLocation(lat, lng, false); // Không hiện popup khi đang gõ
            } else {
              // Chế độ thường/auto-open: lấy kết quả đầu tiên và hiện popup
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              _applyLocation(lat, lng, true);
            }
          })
          .catch(err => {
            if (err && err.name === 'AbortError') return;
          });
      }

      // ── Chế độ LIVE: debounce + chỉ chạy khi bản đồ đang mở ──
      if (live) {
        if (_liveTimer) clearTimeout(_liveTimer);
        _liveTimer = setTimeout(() => {
          const box = getFirstElementById(['osmMapWrapper', 'mapPickerBox']);
          const isOpen = box && box.style.display !== 'none' && box.style.display !== '';
          if (!isOpen) return;

          if (_liveAbort) _liveAbort.abort();
          _liveAbort = new AbortController();
          _doFetch(_liveAbort.signal);
        }, 700);
        return;
      }

      // ── Chế độ THƯỜNG: fetch ngay ──
      _doFetch();
    }

    return { toggle, gps, refresh, lookup };
  })();

  function mapPickerInit() {
    const locateBtn = document.getElementById("nutvitricuatoi");
    const toggleMapBtn = document.getElementById("nutmobando");
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
        setTimeout(() => mapPicker.refresh(), 300);
      });
    }

    const addrInput = document.getElementById("diachi") || document.getElementById("address");
    if (addrInput && !addrInput.dataset.lookupBound) {
      addrInput.dataset.lookupBound = "true";

      // Khi người dùng đang gõ → pan bản đồ theo real-time (chỉ khi bản đồ đang mở)
      addrInput.addEventListener("input", function (e) {
        if (!e.isTrusted || this.dataset.fromPick === "true") return;
        mapPicker.lookup(this.value, { live: true });
      });

      addrInput.addEventListener("change", function (e) {
        if (this.dataset.fromPick === "true") return;
        // Chỉ thực hiện lookup khi người dùng tự nhập (tránh xung đột lúc mở form)
        if (e.isTrusted) {
          mapPicker.lookup(this.value);
        }
      });
    }
  }

  app.map = app.map || {};
  app.map.mapPicker = mapPicker;
  app.map.mapPickerInit = mapPickerInit;
})(window);
