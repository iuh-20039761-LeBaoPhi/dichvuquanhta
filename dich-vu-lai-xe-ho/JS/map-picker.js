/**
 * Map Picker - Leaflet + OpenStreetMap + Nominatim reverse geocoding
 * Dùng chung cho trang đặt lịch thuê tài xế
 */
const mapPicker = (() => {
    const HCM = [10.7769, 106.7009]; // Ho Chi Minh City center
    let map = null;
    let marker = null;

    function init() {
        if (map) {
            map.invalidateSize();
            return;
        }
        map = L.map('mapPickerEl').setView(HCM, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        map.on('click', e => pick(e.latlng.lat, e.latlng.lng));
    }

    function pick(lat, lng) {
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        map.panTo([lat, lng]);

        // Lấy element input điểm đón (tripPickup)
        const addr = document.getElementById('tripPickup');
        if (!addr) return;

        addr.placeholder = 'Đang tải địa chỉ...';
        addr.value = '';

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
            headers: { 'Accept-Language': 'vi' }
        })
            .then(r => r.json())
            .then(data => {
                addr.placeholder = 'Số nhà, đường, phường, quận, thành phố...';
                if (!data || !data.address) {
                    addr.value = data.display_name || '';
                    return;
                }
                const a = data.address;
                const parts = [
                    a.house_number,
                    a.road,
                    a.suburb || a.neighbourhood || a.quarter,
                    a.city_district || a.district,
                    a.city || a.town || a.village || a.county
                ].filter(Boolean);
                addr.value = parts.join(', ');
                if (addr.value) marker.bindPopup(`<small>${addr.value}</small>`).openPopup();
            })
            .catch(() => {
                addr.placeholder = 'Số nhà, đường, phường, quận, thành phố...';
                addr.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            });
    }

    function toggle() {
        const box = document.getElementById('mapPickerBox');
        const btn = document.getElementById('toggleMapBtn');
        if (!box || !btn) return;

        const opening = box.style.display === 'none' || window.getComputedStyle(box).display === 'none';

        box.style.display = opening ? 'block' : 'none';
        if (opening) {
            btn.innerHTML = '<i class="fas fa-times me-1"></i> Đóng bản đồ';
            btn.classList.add('active');
            setTimeout(init, 50);
        } else {
            btn.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i> Chọn trên bản đồ';
            btn.classList.remove('active');
        }
    }

    function gps() {
        if (!navigator.geolocation) {
            alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
            return;
        }

        const addr = document.getElementById('tripPickup');
        if (!addr) return;

        const origPlaceholder = addr.placeholder;
        addr.placeholder = 'Đang xác định vị trí...';

        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                
                // Mở bản đồ nếu chưa mở
                const box = document.getElementById('mapPickerBox');
                if (box && (box.style.display === 'none' || window.getComputedStyle(box).display === 'none')) {
                    toggle();
                }
                setTimeout(() => {
                    if (map) {
                        map.setView([lat, lng], 16);
                    }
                    pick(lat, lng);
                }, map ? 0 : 350);
            },
            err => {
                addr.placeholder = origPlaceholder;
                if (err.code === 1) {
                    alert('Vui lòng cho phép truy cập vị trí trong trình duyệt để sử dụng tính năng này.');
                } else {
                    alert('Không thể xác định vị trí. Vui lòng thử lại hoặc nhập địa chỉ thủ công.');
                }
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    return { toggle, gps };
})();