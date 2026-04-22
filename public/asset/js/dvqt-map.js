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

    /**
     * Khởi tạo bản đồ Leaflet.
     */
    function init() {
        if (typeof L === 'undefined') return console.warn('Thư viện Leaflet chưa được nạp.');
        const { mapEl } = getEls();
        if (!mapEl) return;
        if (map) {
            map.invalidateSize();
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
    }

    /**
     * Khi người dùng nhấp chọn trên bản đồ hoặc định vị được GPS.
     * @param {number} lat - Vĩ độ
     * @param {number} lng - Kinh độ
     * @param {boolean} doReverse - Nếu true, sẽ gọi API để chuyển tọa độ thành địa chỉ văn bản.
     */
    function pick(lat, lng, doReverse = true) {
        if (!map) return;
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        map.panTo([lat, lng]);

        const { addr } = getEls();
        if (addr) {
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
                        if (marker) marker.bindPopup(`<small>${fullAddr}</small>`).openPopup();
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

        addr.addEventListener('input', () => {
            clearTimeout(timer);
            const query = addr.value.trim();
            if (query.length < 5) return;

            timer = setTimeout(() => {
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
                    .catch(e => console.warn('Lỗi tìm kiếm địa chỉ:', e));
            }, 800);
        });
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
