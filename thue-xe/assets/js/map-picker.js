/**
 * CarMapPicker — Leaflet + OpenStreetMap + Nominatim reverse geocoding
 * Hỗ trợ picker địa chỉ trên form đặt xe
 */
const CarMapPicker = (() => {
    const HCM = [10.7769, 106.7009];
    const instances = {};

    const config = {
        addr: {
            boxId:   'mapBoxAddr',
            mapId:   'mapElAddr',
            btnId:   'mapBtnAddr',
            inputId: 'customerAddress',
            placeholder: 'Số nhà, đường, phường, quận...'
        }
    };

    function init(key) {
        const cfg = config[key];
        if (!cfg) return;
        if (instances[key]) {
            instances[key].map.invalidateSize();
            return;
        }
        const map = L.map(cfg.mapId).setView(HCM, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(map);
        instances[key] = { map, marker: null };
        map.on('click', e => pick(key, e.latlng.lat, e.latlng.lng));
    }

    function pick(key, lat, lng) {
        const cfg = config[key];
        if (!cfg) return;
        const inst = instances[key];
        if (!inst) return;

        if (inst.marker) inst.map.removeLayer(inst.marker);
        inst.marker = L.marker([lat, lng]).addTo(inst.map);
        inst.map.panTo([lat, lng]);

        const input = document.getElementById(cfg.inputId);
        if (!input) return;
        const orig = input.placeholder;
        input.placeholder = 'Đang tải địa chỉ...';
        input.value = '';

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
            headers: { 'Accept-Language': 'vi' }
        })
            .then(r => r.json())
            .then(data => {
                input.placeholder = orig;
                if (!data || !data.address) { input.value = data.display_name || ''; return; }
                const a = data.address;
                const parts = [
                    a.house_number,
                    a.road,
                    a.suburb || a.neighbourhood || a.quarter,
                    a.city_district || a.district,
                    a.city || a.town || a.village || a.county
                ].filter(Boolean);
                input.value = parts.join(', ');
                if (input.value) inst.marker.bindPopup(`<small>${input.value}</small>`).openPopup();
            })
            .catch(() => {
                input.placeholder = orig;
                input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            });
    }

    function toggle(key) {
        const cfg = config[key];
        if (!cfg) return;
        const box = document.getElementById(cfg.boxId);
        const btn = document.getElementById(cfg.btnId);
        if (!box || !btn) return;

        const opening = box.style.display === 'none';
        box.style.display = opening ? 'block' : 'none';
        if (opening) {
            btn.innerHTML = '<i class="fas fa-times me-1"></i> Đóng bản đồ';
            btn.classList.add('active');
            setTimeout(() => init(key), 50);
        } else {
            btn.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i> Chọn trên bản đồ';
            btn.classList.remove('active');
        }
    }

    function gps(key) {
        if (!navigator.geolocation) { alert('Trình duyệt của bạn không hỗ trợ định vị GPS.'); return; }
        const cfg = config[key];
        if (!cfg) return;
        const input = document.getElementById(cfg.inputId);
        if (!input) return;
        const orig = input.placeholder;
        input.placeholder = 'Đang xác định vị trí...';

        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                const box = document.getElementById(cfg.boxId);
                if (box && box.style.display === 'none') toggle(key);
                setTimeout(() => {
                    if (instances[key]) {
                        instances[key].map.setView([lat, lng], 16);
                        pick(key, lat, lng);
                    }
                }, instances[key] ? 0 : 350);
            },
            err => {
                input.placeholder = orig;
                if (err.code === 1) alert('Vui lòng cho phép truy cập vị trí trong trình duyệt.');
                else alert('Không thể xác định vị trí. Vui lòng thử lại.');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    return { toggle, gps };
})();
