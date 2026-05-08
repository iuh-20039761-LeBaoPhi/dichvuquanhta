/**
 * CarMapPicker — Leaflet + OpenStreetMap + Nominatim reverse geocoding
 * Hỗ trợ picker địa chỉ trên form đặt xe
 */
const CarMapPicker = (() => {
    const HCM = [10.7769, 106.7009];
    const instances = {};
    let timer = null;
    let styleReady = false;

    const config = {
        addr: {
            boxId:   'mapBoxAddr',
            mapId:   'mapElAddr',
            btnId:   'mapBtnAddr',
            inputId: 'customerAddress',
            placeholder: 'Số nhà, đường, phường, quận...',
            suggestId: 'mapSuggestAddr'
        }
    };

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureSuggestStyles() {
        if (styleReady) return;
        const style = document.createElement('style');
        style.textContent = [
            '.map-suggest-box{position:relative;margin-top:6px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.08);max-height:220px;overflow:auto;display:none;z-index:999}',
            '.map-suggest-item{padding:8px 12px;cursor:pointer;font-size:0.92rem;line-height:1.35;color:#0f172a}',
            '.map-suggest-item:hover{background:#f1f5f9}',
            '.map-suggest-empty{padding:10px 12px;color:#64748b;font-size:0.85rem}'
        ].join('');
        document.head.appendChild(style);
        styleReady = true;
    }

    function ensureSuggestBox(key) {
        const cfg = config[key];
        if (!cfg) return null;
        const input = document.getElementById(cfg.inputId);
        if (!input) return null;

        let box = document.getElementById(cfg.suggestId);
        if (!box) {
            box = document.createElement('div');
            box.id = cfg.suggestId;
            box.className = 'map-suggest-box';
            box.setAttribute('role', 'listbox');
            input.insertAdjacentElement('afterend', box);
        }
        ensureSuggestStyles();
        return box;
    }

    function hideSuggestions(key) {
        const cfg = config[key];
        if (!cfg) return;
        const box = document.getElementById(cfg.suggestId);
        if (box) box.style.display = 'none';
    }

    function formatSuggestion(item) {
        if (!item) return '';
        if (item.display_name) return item.display_name.split(', ').slice(0, 6).join(', ');
        return '';
    }

    function renderSuggestions(key, items) {
        const box = ensureSuggestBox(key);
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
                applySuggestion(key, item, label);
            });
            box.appendChild(el);
        });
        box.style.display = 'block';
    }

    function applySuggestion(key, item, label) {
        const cfg = config[key];
        if (!cfg || !item) return;
        const input = document.getElementById(cfg.inputId);
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (input && label) input.value = label;
        hideSuggestions(key);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            pick(key, lat, lng, { label: label, skipReverse: true });
            if (instances[key]) instances[key].map.setView([lat, lng], 16);
        }
    }

    function init(key) {
        const cfg = config[key];
        if (!cfg) return;
        if (instances[key]) {
            instances[key].map.invalidateSize();
            geocodeCurrentAddress(key);
            return;
        }
        const map = L.map(cfg.mapId).setView(HCM, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(map);
        instances[key] = { map, marker: null };
        map.on('click', e => pick(key, e.latlng.lat, e.latlng.lng));

        // Gán sự kiện tìm kiếm địa chỉ khi người dùng gõ phím
        bindGeocoding(key);

        // Tự động tìm kiếm địa chỉ đã nhập trước đó (nếu có)
        geocodeCurrentAddress(key);
    }

    function pick(key, lat, lng, opts) {
        const cfg = config[key];
        if (!cfg) return;
        const inst = instances[key] || null;
        const options = opts || {};

        if (inst) {
            if (inst.marker) inst.map.removeLayer(inst.marker);
            inst.marker = L.marker([lat, lng]).addTo(inst.map);
            inst.map.panTo([lat, lng]);
        }

        const input = document.getElementById(cfg.inputId);
        if (!input) return;
        const orig = input.placeholder;
        if (options.skipReverse && options.label) {
            input.value = options.label;
            input.placeholder = orig || cfg.placeholder || '';
            if (inst && options.label) {
                inst.marker.bindPopup(`<small>${escapeHtml(options.label)}</small>`).openPopup();
            }
            return;
        }

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
                if (input.value && inst) inst.marker.bindPopup(`<small>${escapeHtml(input.value)}</small>`).openPopup();
            })
            .catch(() => {
                input.placeholder = orig;
                input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            });
    }

    /**
     * Lắng nghe sự kiện gõ phím trên ô input để tự động tìm kiếm vị trí (Geocoding).
     */
    function bindGeocoding(key) {
        const cfg = config[key];
        if (!cfg) return;
        const input = document.getElementById(cfg.inputId);
        if (!input) return;

        if (!input.dataset.mapSuggestBound) {
            input.dataset.mapSuggestBound = '1';
            input.addEventListener('blur', () => setTimeout(() => hideSuggestions(key), 150));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') hideSuggestions(key);
            });
            document.addEventListener('click', (e) => {
                const box = document.getElementById(cfg.suggestId);
                if (!box) return;
                if (e.target === input || box.contains(e.target)) return;
                hideSuggestions(key);
            });
        }

        input.addEventListener('input', () => {
            clearTimeout(timer);
            const query = input.value.trim();
            if (query.length < 3) {
                hideSuggestions(key);
                return;
            }

            timer = setTimeout(() => {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn&addressdetails=1`;
                fetch(url, { headers: { 'User-Agent': 'DVQTApp/1.0' } })
                    .then(r => r.json())
                    .then(data => renderSuggestions(key, Array.isArray(data) ? data : []))
                    .catch(e => {
                        console.warn('Lỗi tìm kiếm địa chỉ:', e);
                        hideSuggestions(key);
                    });
            }, 500);
        });
    }

    /**
     * Tự động tìm kiếm địa chỉ hiện có trong ô input và trỏ ghim trên bản đồ.
     */
    function geocodeCurrentAddress(key) {
        const cfg = config[key];
        if (!cfg) return;
        const input = document.getElementById(cfg.inputId);
        if (!input) return;
        const query = input.value.trim();
        if (query.length < 5) return;

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=vn`;
        fetch(url, { headers: { 'User-Agent': 'DVQTApp/1.0' } })
            .then(r => r.json())
            .then(data => {
                if (data && data[0]) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    pick(key, lat, lng);
                    if (instances[key]) instances[key].map.setView([lat, lng], 16);
                }
            })
            .catch(e => console.warn('Lỗi tìm kiếm địa chỉ tự động:', e));
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
        if (!navigator.geolocation) { Utils.showToast('Trình duyệt của bạn không hỗ trợ định vị GPS.', 'danger'); return; }
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
                    if (instances[key]) instances[key].map.setView([lat, lng], 16);
                    pick(key, lat, lng);
                }, instances[key] ? 0 : 350);
            },
            err => {
                input.placeholder = orig;
                if (err.code === 1) Utils.showToast('Vui lòng cho phép truy cập vị trí trong trình duyệt.', 'danger');
                else Utils.showToast('Không thể xác định vị trí. Vui lòng thử lại.', 'danger');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    return { toggle, gps };
})();
