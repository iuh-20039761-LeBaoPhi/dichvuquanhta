/**
 * DVQT MAP PICKER
 * Module Bản đồ dùng chung cho hệ thống Dịch Vụ Quanh Ta.
 * Hỗ trợ các tính năng: Chọn vị trí trên bản đồ, Định vị GPS, Tìm kiếm địa chỉ, Tính khoảng cách.
 */
window.mapPicker = (function () {
    const HCM = [10.7769, 106.7009]; // Tọa độ trung tâm TP.HCM mặc định
    let map = null;
    let marker = null;
    let timer = null;
    let suggestStylesReady = false;

    /**
     * Tự động dò tìm các phần tử DOM liên quan dựa trên các ID phổ biến.
     * @returns {Object} Các phần tử DOM: input địa chỉ, nút bấm, khung chứa bản đồ.
     */
    function getEls() {
        return {
            addr: document.getElementById('diachi') || document.getElementById('address') || document.getElementById('accAddress'),
            btn: document.getElementById('btnbando') || document.getElementById('toggleMapBtn') || document.querySelector('[onclick*="mapPicker.toggle"]'),
            box: document.getElementById('mapPickerBox'),
            mapEl: document.getElementById('mapPickerEl')
        };
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureSuggestStyles() {
        if (suggestStylesReady) return;
        const style = document.createElement('style');
        style.textContent = [
            '.map-suggest-box{position:relative;margin-top:6px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.08);max-height:220px;overflow:auto;display:none;z-index:999}',
            '.map-suggest-item{padding:8px 12px;cursor:pointer;font-size:0.92rem;line-height:1.35;color:#0f172a}',
            '.map-suggest-item:hover{background:#f1f5f9}',
            '.map-suggest-empty{padding:10px 12px;color:#64748b;font-size:0.85rem}'
        ].join('');
        document.head.appendChild(style);
        suggestStylesReady = true;
    }

    function getSuggestId(addr) {
        const base = (addr && addr.id) ? addr.id : 'addr';
        return 'mapPickerSuggest_' + base;
    }

    function ensureSuggestBox(addr) {
        if (!addr) return null;
        const id = getSuggestId(addr);
        let box = document.getElementById(id);
        if (!box) {
            box = document.createElement('div');
            box.id = id;
            box.className = 'map-suggest-box';
            box.setAttribute('role', 'listbox');
            const host = addr.closest('.input-group') || addr;
            host.insertAdjacentElement('afterend', box);
        }
        ensureSuggestStyles();
        return box;
    }

    function hideSuggestions(addr) {
        const box = addr ? document.getElementById(getSuggestId(addr)) : null;
        if (box) box.style.display = 'none';
    }

    function formatSuggestion(item) {
        if (!item) return '';
        if (item.display_name) return item.display_name.split(', ').slice(0, 6).join(', ');
        return '';
    }

    function renderSuggestions(addr, items) {
        const box = ensureSuggestBox(addr);
        if (!box) return;
        box.innerHTML = '';

        if (!items || !items.length) {
            const empty = document.createElement('div');
            empty.className = 'map-suggest-empty';
            empty.textContent = 'Không tìm thấy vị trí phù hợp.';
            box.appendChild(empty);
            box.style.display = 'block';
            return;
        }

        items.slice(0, 3).forEach(item => {
            const label = formatSuggestion(item);
            const el = document.createElement('div');
            el.className = 'map-suggest-item';
            el.textContent = label || item.display_name || '';
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                applySuggestion(addr, item, label);
            });
            box.appendChild(el);
        });
        box.style.display = 'block';
    }

    function applySuggestion(addr, item, label) {
        if (!addr || !item) return;
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (label) addr.value = label;
        hideSuggestions(addr);
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && map) {
            pick(lat, lng, { skipReverse: true, label: label });
            map.setView([lat, lng], 16);
        }
    }

    /**
     * Khởi tạo bản đồ Leaflet.
     */
    function init() {
        if (typeof L === 'undefined') return console.warn('Thư viện Leaflet chưa được nạp.');
        const { mapEl } = getEls();
        if (!mapEl) return;
        if (map) {
            map.invalidateSize();
            geocodeCurrentAddress();
            return;
        }
        map = L.map(mapEl).setView(HCM, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(map);

        // Click chọn trực tiếp trên bản đồ
        map.on('click', e => pick(e.latlng.lat, e.latlng.lng, true));

        // Gán sự kiện tìm kiếm địa chỉ khi người dùng gõ phím
        bindGeocoding();

        // Tự động tìm kiếm địa chỉ đã nhập trước đó (nếu có)
        geocodeCurrentAddress();
    }

    /**
     * Khi người dùng nhấp chọn trên bản đồ hoặc định vị được GPS.
     * @param {number} lat - Vĩ độ
     * @param {number} lng - Kinh độ
     * @param {boolean} doReverse - Nếu true, sẽ gọi API để chuyển tọa độ thành địa chỉ văn bản.
     */
    function pick(lat, lng, doReverse = true) {
        let options = {};
        if (typeof doReverse === 'object' && doReverse !== null) {
            options = doReverse;
            doReverse = !options.skipReverse;
        }
        if (!map) return;
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        map.panTo([lat, lng]);

        const { addr } = getEls();
        if (addr) {
            if (!doReverse && options.label) {
                addr.value = options.label;
                addr.placeholder = 'Số nhà, tên đường, phường...';
                if (marker) marker.bindPopup(`<small>${escapeHtml(options.label)}</small>`).openPopup();
                return;
            }
            if (doReverse) {
                // Hiển thị trạng thái đang xử lý
                addr.placeholder = 'Đang trích xuất địa chỉ...';
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                    headers: { 'User-Agent': 'DVQTApp/1.0', 'Accept-Language': 'vi' }
                })
                    .then(r => r.json())
                    .then(data => {
                        const a = data.address || {};
                        // Danh sách các "mảnh" địa chỉ theo thứ tự ưu tiên
                        const parts = [
                            a.amenity || a.building || a.shop || a.office || a.tourism || a.leisure, // Tên tòa nhà/cửa hàng
                            a.house_number,
                            a.road || a.pedestrian || a.cycleway,
                            a.suburb || a.neighbourhood || a.quarter || a.hamlet,
                            a.ward || a.city_district || a.district,
                            a.city || a.town || a.village || a.province || a.state
                        ].filter(Boolean);

                        // Nếu các mảnh ghép được quá ít, dùng display_name nhưng lọc bớt phần đuôi (Quốc gia, Mã bưu chính...)
                        let fullAddr = parts.join(', ');
                        if (parts.length < 3 && data.display_name) {
                            fullAddr = data.display_name.split(', ').slice(0, 5).join(', ');
                        }
                        
                        addr.value = fullAddr || `${lat}, ${lng}`;
                        addr.placeholder = 'Số nhà, tên đường, phường...';
                        if (marker) marker.bindPopup(`<small>${escapeHtml(fullAddr)}</small>`).openPopup();
                    })
                    .catch(e => {
                        console.warn('Không thể trích xuất địa chỉ từ tọa độ:', e);
                        addr.value = `${lat}, ${lng}`;
                        addr.placeholder = 'Số nhà, tên đường, phường...';
                    });
            }
        }

        // Hook để gửi tọa độ sang các module khác (VD: cập nhật input ngầm)
        if (typeof window._bdTravelFromCoords === 'function') {
            window._bdTravelFromCoords(lat, lng);
        }
    }

    /**
     * Lắng nghe sự kiện gõ phím trên ô input để tự động tìm kiếm vị trí (Geocoding).
     */
    function bindGeocoding() {
        const { addr } = getEls();
        if (!addr) return;

        if (!addr.dataset.mapSuggestBound) {
            addr.dataset.mapSuggestBound = '1';
            addr.addEventListener('blur', () => setTimeout(() => hideSuggestions(addr), 150));
            addr.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') hideSuggestions(addr);
            });
            document.addEventListener('click', (e) => {
                const box = document.getElementById(getSuggestId(addr));
                if (!box) return;
                if (e.target === addr || box.contains(e.target)) return;
                hideSuggestions(addr);
            });
        }

        addr.addEventListener('input', () => {
            clearTimeout(timer);
            const query = addr.value.trim();
            if (query.length < 3) {
                hideSuggestions(addr);
                return;
            }

            timer = setTimeout(() => {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3&countrycodes=vn&addressdetails=1`;
                fetch(url, { headers: { 'User-Agent': 'DVQTApp/1.0' } })
                    .then(r => r.json())
                    .then(data => {
                        const list = Array.isArray(data) ? data : [];
                        renderSuggestions(addr, list);
                        if (list[0] && map) {
                            const lat = parseFloat(list[0].lat);
                            const lng = parseFloat(list[0].lon);
                            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                                pick(lat, lng, false);
                                map.setView([lat, lng], 16);
                            }
                        }
                    })
                    .catch(e => {
                        console.warn('Lỗi tìm kiếm địa chỉ:', e);
                        hideSuggestions(addr);
                    });
            }, 500);
        });
    }

    /**
     * Tự động tìm kiếm địa chỉ hiện có trong ô input và trỏ ghim trên bản đồ.
     */
    function geocodeCurrentAddress() {
        const { addr } = getEls();
        if (!addr) return;
        const query = addr.value.trim();
        if (query.length < 5) return;

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=vn`;
        fetch(url, { headers: { 'User-Agent': 'DVQTApp/1.0' } })
            .then(r => r.json())
            .then(data => {
                if (data && data[0]) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    pick(lat, lng, false); // false vì đã gõ địa chỉ rồi, không cần reverse geocode nữa
                    if (map) map.setView([lat, lng], 16);
                }
            })
            .catch(e => console.warn('Lỗi tìm kiếm địa chỉ tự động:', e));
    }

    /**
     * Đóng hoặc Mở khung bản đồ popup.
     */
    function toggle() {
        const { box, btn } = getEls();
        if (!box) return;
        const opening = box.style.display === 'none';

        box.style.display = opening ? 'block' : 'none';
        if (opening) {
            if (btn) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fa-solid fa-xmark me-2"></i> Đóng bản đồ';
            }
            setTimeout(init, 50);
        } else {
            if (btn) {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fa-solid fa-location-dot me-2"></i> Chọn trên bản đồ';
            }
        }
    }

    /**
     * Lấy tọa độ GPS thực tế của thiết bị người dùng.
     */
    function gps() {
        if (!navigator.geolocation) return showError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
        const { addr } = getEls();
        const oldP = addr ? addr.placeholder : '';
        if (addr) addr.placeholder = 'Đang định vị...';

        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                const box = document.getElementById('mapPickerBox');
                if (box && box.style.display === 'none') toggle();

                setTimeout(() => {
                    if (map) map.setView([latitude, longitude], 17);
                    pick(latitude, longitude, true);
                    if (addr) addr.placeholder = oldP;
                }, 300);
            },
            err => {
                if (addr) addr.placeholder = oldP;
                showError('Vui lòng cho phép quyền truy cập vị trí trong cài đặt trình duyệt.');
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    /**
     * Tính toán khoảng cách đường bộ thực tế đến Nhà cung cấp gần nhất.
     * @param {number} lat - Vĩ độ khách hàng
     * @param {number} lng - Kinh độ khách hàng
     * @param {string} tableName - Bảng NCC cần tìm kiếm
     * @param {string} catId - ID danh mục dịch vụ để lọc
     * @returns {Promise<Object|null>} { km: số km, provider: thông tin NCC }
     */
    async function calculateDistance(lat, lng, tableName, catId) {
        try {
            const krud = window.DVQTKrud;
            if (!krud) return null;

            if (!tableName) return null;
            const rows = await krud.listTable(tableName);
            if (!rows || !rows.length) return null;

            const catStr = String(catId || '').trim();
            const withCoords = rows.filter(r => {
                const plat = r.maplat || r.lat || 0;
                const plng = r.maplng || r.lng || 0;
                return Number(plat) !== 0 && Number(plng) !== 0;
            });

            let candidates = withCoords.filter(r => {
                const c1 = String(r.id_danhmuc || '');
                const c2 = String(r.danh_muc_thuc_hien || '');
                const c3 = String(r.loai_hinh_kinh_doanh || '');
                const c4 = String(r.id_dichvu || ''); // ID dịch vụ trong bảng nguoidung
                const allCats = (c1 + ',' + c2 + ',' + c3 + ',' + c4).split(',').map(s => s.trim()).filter(Boolean);
                return !catStr || allCats.includes(catStr);
            });

            if (!candidates.length && withCoords.length > 0) candidates = withCoords;
            if (!candidates.length) return null;

            candidates.forEach(r => {
                const plat = Number(r.maplat || r.lat || 0);
                const plng = Number(r.maplng || r.lng || 0);
                const dLat = plat - Number(lat);
                const dLng = plng - Number(lng);
                r.linearDist = Math.sqrt(dLat * dLat + dLng * dLng);
                r.normLat = plat;
                r.normLng = plng;
            });
            candidates.sort((a, b) => a.linearDist - b.linearDist);
            const nearest = candidates[0];

            let km = null;
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${nearest.normLng},${nearest.normLat};${lng},${lat}?overview=false`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.code === 'Ok' && data.routes?.length) km = data.routes[0].distance / 1000;
            } catch (e) { }

            if (km === null || km <= 0) {
                km = (nearest.linearDist * 111) * 1.25;
                if (km < 0.1) km = 0.1;
            }

            return {
                km: Number(km.toFixed(2)),
                provider: nearest
            };
        } catch (e) {
            console.error('Lỗi tính khoảng cách:', e);
            return null;
        }
    }

    return { toggle, gps, pick, calculateDistance };
})();
