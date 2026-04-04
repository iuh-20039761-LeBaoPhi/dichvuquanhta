/**
 * Map Picker 2.0 - Siêu Module Bản đồ dùng chung cho Thợ Nhà.
 */
window.mapPicker = (function () {
    const HCM = [10.7769, 106.7009]; // HCM City center
    let map = null;
    let marker = null;
    let timer = null; // Dùng cho debounce gõ phím

    /**
     * Tự động dò tìm các phần tử DOM liên quan dựa trên ID phổ biến.
     */
    function getEls() {
        return {
            addr: document.getElementById('diachi') || document.getElementById('address') || document.getElementById('accAddress'),
            btn:  document.getElementById('btnbando') || document.getElementById('toggleMapBtn') || document.querySelector('[onclick*="mapPicker.toggle"]'),
            box:  document.getElementById('mapPickerBox'),
            mapEl: document.getElementById('mapPickerEl')
        };
    }

    /**
     * Khởi tạo bản đồ Leaflet.
     */
    function init() {
        if (typeof L === 'undefined') return console.warn('Leaflet not loaded.');
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
        map.on('click', e => pick(e.latlng.lat, e.latlng.lng, true)); // true = trích địa chỉ từ tọa độ
        
        // Gắn sự kiện gõ phím để tìm kiếm địa chỉ (Geocoding)
        bindGeocoding();
    }

    /**
     * Khi người dùng nhấp chọn hoặc GPS bắt được tọa độ.
     * @param {boolean} doReverse - Nếu true, sẽ gọi API lấy địa chỉ chữ từ tọa độ.
     */
    function pick(lat, lng, doReverse = true) {
        if (!map) return;
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        map.panTo([lat, lng]);

        const { addr } = getEls();
        if (addr) {
            if (doReverse) {
                // Chỉ lấy địa chỉ văn bản khi CHỌN TRÊN BẢN ĐỒ hoặc GPS
                addr.placeholder = 'Đang trích xuất địa chỉ...';
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                    headers: { 'User-Agent': 'ThoNhaApp/1.0', 'Accept-Language': 'vi' }
                })
                .then(r => r.json())
                .then(data => {
                    const a = data.address || {};
                    const parts = [
                        a.house_number || a.building,
                        a.road || a.pedestrian,
                        a.suburb || a.neighbourhood || a.quarter,
                        a.city_district || a.ward || a.district,
                        a.city || a.town || a.village || a.province || a.state
                    ].filter(Boolean);
                    
                    const fullAddr = parts.join(', ') || data.display_name || `${lat}, ${lng}`;
                    console.log('Reverse Geocoded:', fullAddr);
                    addr.value = fullAddr;
                    addr.placeholder = 'Số nhà, đường, phường, quận...';
                    if (marker) marker.bindPopup(`<small>${fullAddr}</small>`).openPopup();
                })
                .catch(e => {
                    console.warn('Reverse Geocoding failed:', e);
                    addr.value = `${lat}, ${lng}`;
                    addr.placeholder = 'Số nhà, đường, phường, quận...';
                });
            } else {
                // ĐANG GÕ TAY: Tuyệt đối không đè tọa độ lên ô địa chỉ văn bản
                console.log('Pick triggered by Geocoding (typing), keeping text.');
            }
        }
        
        // Luôn tính phí di chuyển dựa trên tọa độ thực ngầm
        if (typeof window._bdTravelFromCoords === 'function') {
            window._bdTravelFromCoords(lat, lng);
        }
    }

    /**
     * Lắng nghe sự kiện gõ phím trên ô input để tìm vị trí (Geocoding).
     */
    function bindGeocoding() {
        const { addr } = getEls();
        if (!addr) return;

        addr.addEventListener('input', () => {
            clearTimeout(timer);
            const query = addr.value.trim();
            if (query.length < 5) return; // Chỉ tìm khi gõ đủ dài

            timer = setTimeout(() => {
                // Thêm tham số countrycodes để ưu tiên kết quả tại Việt Nam
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=vn`;
                fetch(url, { headers: { 'User-Agent': 'ThoNhaApp/1.0' } })
                .then(r => r.json())
                .then(data => {
                    if (data && data[0]) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        console.log('Geocoded:', query, 'to', lat, lng);
                        pick(lat, lng, false); 
                        if (map) map.setView([lat, lng], 16);
                    }
                })
                .catch(e => console.warn('Geocoding error:', e));
            }, 800); 
        });
    }

    /**
     * Đóng/Mở khung bản đồ.
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
     * Lấy tọa độ GPS thực tế của thiết bị.
     */
    function gps() {
        if (!navigator.geolocation) return alert('GPS không hỗ trợ.');
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
                alert('Vui lòng cho phép quyền truy cập vị trí.');
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    /**
     * TÍNH PHÍ DI CHUYỂN TÁI SỬ DỤNG
     */
    async function calculateTravelFee(lat, lng, catId, config) {
        if (!config || config.mode !== 'per_km') return null;
        
        try {
            const krud = window.ThoNhaKrud;
            if (!krud) return null;
            
            const rows = await krud.listTable('nhacungcap_thonha');
            if (!rows || !rows.length) return null;

            const catStr = String(catId || '').trim();
            const withCoords = rows.filter(r => {
                const plat = r.maplat || r.lat;
                const plng = r.maplng || r.lng;
                return plat != null && plat !== '' && plng != null && plng !== '' && Number(plat) !== 0;
            });

            let candidates = withCoords.filter(r => {
                const c1 = String(r.id_danhmuc || '');
                const c2 = String(r.danh_muc_thuc_hien || '');
                const c3 = String(r.loai_hinh_kinh_doanh || '');
                const allCats = (c1 + ',' + c2 + ',' + c3).split(',').map(s => s.trim()).filter(Boolean);
                return allCats.includes(catStr);
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
            } catch (e) {}

            if (km === null || km <= 0) {
                km = (nearest.linearDist * 111) * 1.3;
                if (km < 0.1) km = 0.1;
            }

            const dist = Number(km) || 0;
            const baseKm = Number(config.pricePerKm?.baseKm || 0);
            const baseP  = Number(config.pricePerKm?.basePrice || 0);
            const extraP = Number(config.pricePerKm?.extraPrice || (config.pricePerKm || 0));

            let fee = dist <= baseKm ? baseP : baseP + (dist - baseKm) * extraP;
            if (config.min && fee < config.min) fee = config.min;
            if (config.max && fee > config.max) fee = config.max;

            const amtRounded = Math.round(fee / 1000) * 1000;

            return {
                amt: amtRounded,
                km: Number(km.toFixed(2)),
                provider: nearest
            };
        } catch (e) {
            console.error('Calculation error:', e);
            return null;
        }
    }

    return { toggle, gps, pick, calculateTravelFee };
})();
