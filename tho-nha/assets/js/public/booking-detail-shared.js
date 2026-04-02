/**
 * booking-detail-shared.js
 * ═══════════════════════════════════════════════════════════════════
 * Logic chia sẻ cho luồng đặt lịch (booking flow).
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DATA FLOW KHI ĐẶT LỊCH:                                      │
 * │                                                                 │
 * │  1. AUTH GATE                                                   │
 * │     └─ Kiểm tra localStorage → hiển thị banner đăng nhập       │
 * │     └─ Prefill họ tên, SĐT, địa chỉ từ profile đã lưu        │
 * │                                                                 │
 * │  2. CHỌN DỊCH VỤ + THƯƠNG HIỆU                                │
 * │     └─ _bdSetBreakdown() nhận giá + config phí di chuyển       │
 * │                                                                 │
 * │  3. TÍNH PHÍ DI CHUYỂN (nếu mode = 'per_km')                  │
 * │     └─ Nominatim geocode địa chỉ → lat/lng                    │
 * │     └─ OSRM tính quãng đường → km → phí (VNĐ)                 │
 * │     └─ Hoặc map-picker cung cấp tọa độ trực tiếp              │
 * │                                                                 │
 * │  4. MEDIA                                                       │
 * │     └─ Chụp/chọn ảnh + video → preview + đếm số lượng         │
 * │                                                                 │
 * │  5. XÁC NHẬN + SUBMIT                                          │
 * │     └─ _bdBuildPendingData() → tổng hợp form thành payload     │
 * │     └─ _bdSubmitApi() gọi:                                      │
 * │         a) KRUD insertRow('datlich_thonha', ...)                │
 * │         b) Google Sheets (fire-and-forget backup)               │
 * │         c) Lưu profile vào localStorage                         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * DEPENDENCIES:
 *   - krud-helper.js (ThoNhaKrud) — wrapper KRUD API
 *   - order-store.js              — pricing presets + profile helpers
 *   - Nominatim API               — geocoding (công khai, không cần key)
 *   - OSRM API                    — routing (công khai)
 *
 * ĐƯỢC GỌI TỪ:
 *   - booking-panel.js  (modal đặt lịch)
 *   - booking-detail.js (trang chi tiết dịch vụ)
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

// Base path cho fetch — trang pages/public/ dùng '../../', partials/ dùng '../'
const _BD_BASE = window.BD_BASE || '../../';
// KRUD client + table lưu booking từ modal
const _BD_KRUD_SCRIPT_URL = window.BD_KRUD_SCRIPT_URL || 'https://api.dvqt.vn/js/krud.js';
const _BD_KRUD_TABLE = window.BD_KRUD_TABLE || 'datlich_thonha';
const _BD_CUSTOMER_LOGIN_KEY = 'customer_logged_in';
const _BD_CUSTOMER_PROFILE_KEY = 'thonha_customer_profile_v1';

// Google Apps Script Web App URL — thay bằng URL thật sau khi deploy
const _BD_GSHEET_URL = window.GSHEET_URL || 'https://script.google.com/macros/s/AKfycbx8J5infIIqf-VOFCNq89L7W1xRfluTU0Dt4R8Vijl81zhid59aql3vURdT01dwaaKgPQ/exec';

// ===================================================================
// AUTH GATE — yêu cầu đăng nhập trước khi đặt lịch
// ===================================================================
// Parse JSON an toàn, trả về fallback nếu dữ liệu rỗng hoặc lỗi cú pháp.
function _bdSafeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (_err) {
        return fallback;
    }
}

// Lấy hồ sơ khách hàng đã lưu trong localStorage.
function _bdGetCustomerProfileFromStorage() {
    try {
        return _bdSafeParse(localStorage.getItem(_BD_CUSTOMER_PROFILE_KEY), {}) || {};
    } catch (_err) {
        return {};
    }
}

// Kiểm tra khách hàng đã đăng nhập hợp lệ hay chưa.
function _bdIsCustomerLoggedIn() {
    try {
        const logged = localStorage.getItem(_BD_CUSTOMER_LOGIN_KEY) === 'true';
        if (!logged) return false;
        const profile = _bdGetCustomerProfileFromStorage();
        return !!(profile && (profile.phone || profile.name));
    } catch (_err) {
        return false;
    }
}

// Tạo URL trang đăng nhập khách hàng theo base path hiện tại.
function _bdGetCustomerLoginUrl() {
    return _BD_BASE + 'pages/customer/dang-nhap.html';
}

// Hiển thị banner trạng thái đăng nhập trên form đặt lịch.
function _bdRenderAuthBanner() {
    const banner = document.getElementById('bookingAuthBanner');
    if (!banner) return;

    if (_bdIsCustomerLoggedIn()) {
        const p = _bdGetCustomerProfileFromStorage();
        const name = String(p.name || localStorage.getItem('customer_name') || 'Khách hàng');
        const phone = String(p.phone || '');
        banner.innerHTML = '<div class="alert alert-success py-2 mb-0"><i class="fas fa-check-circle me-1"></i>Đang đặt lịch bằng tài khoản: <strong>' +
            name + '</strong>' + (phone ? ' - ' + phone : '') + '</div>';
        banner.style.display = '';
        return;
    }

    banner.innerHTML = '<div class="alert alert-warning py-2 mb-0"><i class="fas fa-exclamation-triangle me-1"></i>Bạn cần <strong>đăng nhập khách hàng</strong> trước khi đặt lịch. <a href="' +
        _bdGetCustomerLoginUrl() + '">Đăng nhập ngay</a></div>';
    banner.style.display = '';
}

// Điền sẵn thông tin khách hàng vào form nếu đã có profile.
function _bdPrefillCustomerProfileToForm() {
    if (!_bdIsCustomerLoggedIn()) return;
    const profile = _bdGetCustomerProfileFromStorage();
    const hotenEl = document.getElementById('hoten');
    const sdtEl = document.getElementById('sodienthoai');
    const diachiEl = document.getElementById('diachi');

    if (hotenEl && !String(hotenEl.value || '').trim() && profile.name) {
        hotenEl.value = String(profile.name);
    }
    if (sdtEl && !String(sdtEl.value || '').trim() && profile.phone) {
        sdtEl.value = String(profile.phone);
    }
    if (diachiEl && !String(diachiEl.value || '').trim() && profile.address) {
        diachiEl.value = String(profile.address);
    }
}

// Chuẩn bị trạng thái auth ban đầu cho luồng đặt lịch.
function _bdPrepareBookingAuthState() {
    _bdRenderAuthBanner();
    _bdPrefillCustomerProfileToForm();
}

// Chặn thao tác đặt lịch nếu khách chưa đăng nhập.
function _bdRequireCustomerLogin() {
    if (_bdIsCustomerLoggedIn()) return true;

    _bdRenderAuthBanner();
    const banner = document.getElementById('bookingAuthBanner');
    if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alert('Vui lòng đăng nhập tài khoản khách hàng trước khi đặt lịch.');
    return false;
}

// ===================================================================
// GOOGLE SHEETS — fire-and-forget
// ===================================================================
/**
 * Gửi bản ghi tóm tắt đơn hàng sang Google Sheets (backup phụ).
 * Fire-and-forget: không chặn UX khi lỗi, mode 'no-cors'.
 * @param {Object} pendingData - Dữ liệu form đã tổng hợp
 * @param {string} orderCode   - Mã đơn hàng (VD: TN-20260401-A1B2)
 */
function _bdSendToSheet(pendingData, orderCode) {
    if (!_BD_GSHEET_URL) return;
    const now = new Date();
    const created_at = now.toLocaleString('vi-VN', { hour12: false });
    const surveyAmt = (_bdCurSurvey && _bdCurSurvey.required) ? (_bdCurSurvey.amount || 0) : 0;
    const travelAmt = _bdTravelAmt || 0;
    const basePrice = _bdCurPrice  || 0;
    const payload = {
        order_code:       orderCode || '',
        name:             pendingData.name            || '',
        phone:            pendingData.phone           || '',
        service:          pendingData.service_id      || '',
        address:          pendingData.address         || '',
        note:             pendingData.note            || '',
        selected_brand:   pendingData.selected_brand  || '',
        estimated_price:  basePrice,
        travel_fee:       travelAmt,
        inspection_fee:   surveyAmt,
        total_price:      basePrice + travelAmt,
        status:           'new',
        created_at,
    };
    fetch(_BD_GSHEET_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
    }).catch(() => {}); // bỏ qua lỗi, không ảnh hưởng UX
}

// ===================================================================
// SHARED: FORMAT + PRICING
// ===================================================================
/**
 * Format số tiền sang chuỗi VND. VD: 150000 → "150.000đ"
 * @param {number} n - Số tiền
 * @returns {string}
 */
function _bdFmt(n) {
    return Number(n).toLocaleString('vi-VN') + 'đ';
}

/**
 * Tính các giá trị chi phí tổng hợp cho breakdown hiển thị.
 * @param {number} basePrice  - Giá dịch vụ cơ bản
 * @param {number} travelAmt  - Phí di chuyển
 * @param {Object} surveyFee  - { required: bool, amount: number }
 * @returns {{ travel, survey, total, noRepair, hasFees }}
 */
function _bdCalcPricing(basePrice, travelAmt, surveyFee) {
    const t    = travelAmt || 0;
    const survey = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;
    return {
        travel: t, survey,
        total:       basePrice + t,
        noRepair:    t + survey,
        hasFees: t > 0 || survey > 0
    };
}

// ===================================================================
// TRAVEL FEE — PER KM (OSRM + Nominatim)
// ===================================================================
let _bdTravelCfg      = null;   // per_km config từ services.json
let _bdTravelStatus   = 'na';   // 'na'|'idle'|'loading'|'ok'|'error'
let _bdTravelAmt      = 0;      // phí đã tính (VNĐ)
let _bdTravelDistKm   = 0;      // quãng đường (km)
let _bdTravelTimer    = null;   // debounce handle
let _bdCurPrice       = 0;      // giá dịch vụ hiện tại (để refresh)
let _bdCurSurvey      = null;   // survey fee hiện tại (để refresh)
let _bdCurCatId       = null;   // ID danh mục hiện tại
let _bdCurServiceId   = null;   // ID dịch vụ hiện tại (nếu có 1 dịch vụ cụ thể)
let _bdPendingCoords  = null;   // tọa độ chờ nếu user chọn map trước khi chọn dịch vụ

/**
 * Geocode địa chỉ văn bản → tọa độ lat/lng bằng Nominatim API.
 * @param {string} address - Địa chỉ cần tìm (VD: "123 Nguyễn Du, Q1")
 * @returns {Promise<{lat: number, lng: number}|null>} null nếu không tìm thấy
 */
async function _bdGeocode(address) {
    const url = 'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({ q: address + ', TP.HCM, Việt Nam', format: 'json', limit: 1, countrycodes: 'vn' });
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
    const arr = await res.json();
    if (!arr.length) return null;
    return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

/**
 * Tính quãng đường lái xe giữa 2 điểm bằng OSRM API.
 * @param {number} pLat - Latitude nhà cung cấp
 * @param {number} pLng - Longitude nhà cung cấp
 * @param {number} cLat - Latitude khách hàng
 * @param {number} cLng - Longitude khách hàng
 * @returns {Promise<number|null>} Khoảng cách km, null nếu lỗi
 */
async function _bdRoadDist(pLat, pLng, cLat, cLng) {
    // OSRM dùng lng,lat (không phải lat,lng)
    const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${cLng},${cLat}?overview=false`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    return data.routes[0].distance / 1000; // meters → km
}

/**
 * Quy đổi quãng đường → phí di chuyển theo config dịch vụ.
 * Phí = km × pricePerKm, làm tròn 1.000đ, clamp [minFee, maxFee].
 * @param {number} km  - Khoảng cách (km)
 * @param {Object} cfg - { pricePerKm, minFee?, maxFee? }
 * @returns {number} Phí di chuyển (VNĐ)
 */
function _bdFeeFromDist(km, cfg) {
    let fee = Math.round(km * cfg.pricePerKm / 1000) * 1000; // làm tròn 1,000đ
    if (cfg.minFee) fee = Math.max(fee, cfg.minFee);
    if (cfg.maxFee) fee = Math.min(fee, cfg.maxFee);
    return fee;
}

// Render lại breakdown dựa trên state hiện tại.
function _bdRefreshBreakdown() {
    _bdUpdateBreakdown(_bdCurPrice, _bdTravelCfg, _bdCurSurvey);
}

// Debounce thao tác tính phí di chuyển từ địa chỉ nhập tay.
function _bdStartTravelCalc() {
    if (!_bdTravelCfg || _bdTravelCfg.mode !== 'per_km') return;
    clearTimeout(_bdTravelTimer);
    const addr = document.getElementById('diachi')?.value?.trim();
    if (!addr) {
        _bdTravelStatus = 'idle'; _bdTravelAmt = 0; _bdTravelDistKm = 0;
        _bdRefreshBreakdown(); return;
    }
    _bdTravelStatus = 'loading';
    _bdRefreshBreakdown();
    _bdTravelTimer = setTimeout(_bdDoTravelCalc, 800);
}

// Thực thi geocode + route để cập nhật phí di chuyển theo km.
async function _bdDoTravelCalc() {
    if (!_bdTravelCfg) return;
    const addr = document.getElementById('diachi')?.value?.trim();
    if (!addr) { _bdTravelStatus = 'idle'; _bdRefreshBreakdown(); return; }
    try {
        const c = await _bdGeocode(addr);
        if (!c) throw new Error('geocode');
        const km = await _bdRoadDist(_bdTravelCfg.providerLat, _bdTravelCfg.providerLng, c.lat, c.lng);
        if (km === null) throw new Error('route');
        _bdTravelDistKm = km;
        _bdTravelAmt    = _bdFeeFromDist(km, _bdTravelCfg);
        _bdTravelStatus = 'ok';
    } catch {
        _bdTravelStatus = 'error';
    }
    _bdRefreshBreakdown();
}

// Gọi trực tiếp từ map-picker khi đã có tọa độ — bỏ qua geocoding
// Tính phí di chuyển trực tiếp từ tọa độ map picker.
async function _bdTravelFromCoords(lat, lng) {
    // Lưu tọa độ để dùng khi dịch vụ được chọn sau
    _bdPendingCoords = { lat, lng };
    if (!_bdTravelCfg || _bdTravelCfg.mode !== 'per_km') return;
    clearTimeout(_bdTravelTimer); // huỷ debounce đang chờ
    _bdTravelStatus = 'loading';
    _bdRefreshBreakdown();
    try {
        const km = await _bdRoadDist(_bdTravelCfg.providerLat, _bdTravelCfg.providerLng, lat, lng);
        if (km === null) throw new Error('route');
        _bdTravelDistKm = km;
        _bdTravelAmt    = _bdFeeFromDist(km, _bdTravelCfg);
        _bdTravelStatus = 'ok';
    } catch {
        _bdTravelStatus = 'error';
    }
    _bdRefreshBreakdown();
}

/**
 * Thiết lập state breakdown khi người dùng đổi dịch vụ.
 * Gọi bởi: booking-panel.js khi user chọn/đổi dịch vụ từ dropdown.
 * @param {number} price     - Giá dịch vụ cơ bản (VNĐ)
 * @param {Object} travelFee - Config phí di chuyển: { mode, pricePerKm, ... }
 * @param {Object} surveyFee - Config phí khảo sát: { required, amount }
 * @param {string|number} [catId] - ID danh mục
 * @param {string|number} [serviceId] - ID dịch vụ cụ thể
 */
function _bdSetBreakdown(price, travelFee, surveyFee, catId, serviceId) {
    _bdCurPrice  = price || 0;
    _bdCurSurvey = surveyFee || null;
    _bdCurCatId  = catId || null;
    _bdCurServiceId = serviceId || null;
    const isPerKm = travelFee && travelFee.mode === 'per_km';
    _bdTravelCfg    = isPerKm ? travelFee : null;
    _bdTravelStatus = isPerKm ? 'idle' : 'na';
    _bdTravelAmt    = 0; _bdTravelDistKm = 0;
    clearTimeout(_bdTravelTimer);
    _bdUpdateBreakdown(price, travelFee, surveyFee);
    /* 
    Vô hiệu hóa tính toán km tự động tại bước đặt lịch (chờ Thợ nhận đơn mới tính thực tế)
    if (isPerKm && _bdPendingCoords) {
        _bdTravelFromCoords(_bdPendingCoords.lat, _bdPendingCoords.lng);
    } else {
        const addr = document.getElementById('diachi')?.value?.trim();
        if (isPerKm && addr) _bdStartTravelCalc();
    }
    */
}

// Gắn listener địa chỉ — gọi 1 lần sau khi form có trong DOM
// Khởi tạo listener địa chỉ để tự động tính phí theo km.
function _bdSetupAddressListener() {
    const addrEl = document.getElementById('diachi');
    if (!addrEl || addrEl._bdListened) return;
    addrEl._bdListened = true;
    addrEl.addEventListener('input', _bdStartTravelCalc);
}

// Dùng chung cho cả modal và standalone (cùng ID trong DOM)
// Render khối breakdown chi phí cho cả modal và trang standalone.
function _bdUpdateBreakdown(price, travelFee, surveyFee) {
    const wrap = document.getElementById('pricingBreakdownWrap');
    if (!wrap) return;

    const isPerKm = travelFee && travelFee.mode === 'per_km';
    // Với per_km, dùng _bdTravelAmt nếu đã tính xong
    const tAmt = isPerKm ? (_bdTravelStatus === 'ok' ? _bdTravelAmt : 0) : null;
    const effectiveTf = isPerKm ? null : travelFee; // fixed mode: dùng min/max gốc

    // Tính phí fixed
    const tFixed = effectiveTf ? (effectiveTf.min ?? effectiveTf.fixedAmount ?? 0) : 0;
    const survey  = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;

    const travelAmt = isPerKm ? tAmt : tFixed;
    const p = _bdCalcPricing(price, travelAmt, surveyFee);

    // Ẩn box nếu fixed và không có phí
    if (!isPerKm && !p.hasFees) { wrap.style.display = 'none'; return; }

    const bdService   = document.getElementById('bd-service');
    const bdTravelRow = document.getElementById('bd-travel-row');
    const bdTravel    = document.getElementById('bd-travel');
    const bdTotal     = document.getElementById('bd-total');

    if (bdService) bdService.textContent = price > 0 ? _bdFmt(price) : 'Miễn phí';

    // Phí di chuyển (Travel Fee Row)
    if (bdTravelRow && bdTravel) {
        bdTravelRow.style.removeProperty('display');
        
        // Luôn hiển thị khung giá tạm tính trong lúc đặt lịch (theo yêu cầu User)
        const tMin = travelFee?.min || 20000;
        const tMax = travelFee?.max || 150000;
        
        if (isPerKm) {
            // Ngay cả mode per_km cũng hiện range khi đang đặt
            bdTravel.innerHTML = `<span style="font-weight:600;">${_bdFmt(tMin)} – ${_bdFmt(tMax)}</span> <small class="text-muted">(tạm tính)</small>`;
        } else {
            // Chế độ cố định (fixed)
            bdTravel.textContent = tMin === tMax ? _bdFmt(tMin) : `${_bdFmt(tMin)} – ${_bdFmt(tMax)}`;
        }
    }

    // Tổng
    if (bdTotal) {
        if (isPerKm && _bdTravelStatus !== 'ok') {
            const priceLabel = price > 0 ? _bdFmt(price) : 'Miễn phí';
            bdTotal.innerHTML = `${priceLabel} <span style="color:#94a3b8;font-size:0.82rem;">+ phí di chuyển</span>`;
        } else {
            bdTotal.textContent = _bdFmt(p.total);
        }
    }

    // Survey notice
    const bdSurveyNotice   = document.getElementById('bd-survey-notice');
    const bdSurveyTravel   = document.getElementById('bd-survey-travel');
    const bdSurveyAmount   = document.getElementById('bd-survey-amount');
    const bdSurveyNoRepair = document.getElementById('bd-survey-no-repair');

    if (survey > 0 && bdSurveyNotice) {
        const tDisp = isPerKm && _bdTravelStatus === 'ok' ? _bdFmt(_bdTravelAmt) : (isPerKm ? '—' : _bdFmt(tFixed));
        const nr    = isPerKm && _bdTravelStatus === 'ok' ? _bdFmt(_bdTravelAmt + survey) : (isPerKm ? '—' : _bdFmt(tFixed + survey));
        if (bdSurveyTravel)   bdSurveyTravel.textContent   = tDisp;
        if (bdSurveyAmount)   bdSurveyAmount.textContent   = _bdFmt(survey);
        if (bdSurveyNoRepair) bdSurveyNoRepair.textContent = nr;
        bdSurveyNotice.style.display = '';
    } else if (bdSurveyNotice) {
        bdSurveyNotice.style.display = 'none';
    }

    wrap.style.display = '';
}

// Ẩn breakdown và reset trạng thái tính phí di chuyển.
function _bdHideBreakdown(clearCoords) {
    const wrap = document.getElementById('pricingBreakdownWrap');
    if (wrap) wrap.style.display = 'none';
    _bdTravelCfg = null; _bdTravelStatus = 'na';
    _bdTravelAmt = 0; _bdTravelDistKm = 0;
    if (clearCoords) _bdPendingCoords = null;
    clearTimeout(_bdTravelTimer);
}

// Xóa giao diện chọn thương hiệu khi chưa có dịch vụ phù hợp.
function _bdClearBrandSelectorUi() {
    const brandWrap = document.getElementById('brandSelectorWrap');
    const brandBox = document.getElementById('brandOptionsContainer');
    if (brandBox) brandBox.innerHTML = '';
    if (brandWrap) brandWrap.style.display = 'none';
}

// ===================================================================
// SHARED: MEDIA CAPTURE
// ===================================================================
let _bdMediaFiles = [];

// Gắn sự kiện cho input ảnh/video và nút mở trình chọn file.
function _bdSetupMedia() {
    const photoInput    = document.getElementById('inputhinhanh');
    const videoInput    = document.getElementById('inputvideo');
    const photoBtn      = document.getElementById('btnchuphinh');
    const videoBtn      = document.getElementById('btnquayvideo');
    const photoPreview  = document.getElementById('mediaPhotoPreviewContainer');
    const videoPreview  = document.getElementById('mediaVideoPreviewContainer');
    if (!photoInput || !videoInput) return;

    photoBtn && photoBtn.addEventListener('click', () => photoInput.click());
    videoBtn && videoBtn.addEventListener('click', () => videoInput.click());

    photoInput.addEventListener('change', function () {
        Array.from(this.files).forEach(f => _bdAddMedia(f, photoPreview));
        this.value = '';
    });
    videoInput.addEventListener('change', function () {
        Array.from(this.files).forEach(f => _bdAddMedia(f, videoPreview));
        this.value = '';
    });
}

// Thêm file media vào state và render preview có thể xóa.
function _bdAddMedia(file, previewBox) {
    const id = Date.now() + Math.random();
    _bdMediaFiles.push({ id, file });
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid rgba(17,153,142,0.4);';
    wrap.dataset.mediaId = id;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '&times;';
    removeBtn.style.cssText = 'position:absolute;top:2px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;line-height:16px;cursor:pointer;padding:0;z-index:1;';
    removeBtn.addEventListener('click', () => { _bdMediaFiles = _bdMediaFiles.filter(m => m.id !== id); wrap.remove(); });
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.src = URL.createObjectURL(file);
        wrap.appendChild(img);
    } else {
        const icon = document.createElement('div');
        icon.style.cssText = 'width:100%;height:100%;background:#0f2027;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;';
        icon.innerHTML = `<i class="fas fa-video" style="color:#38ef7d;font-size:1.4rem;"></i><span style="color:#ccc;font-size:0.6rem;text-align:center;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;">${file.name}</span>`;
        wrap.appendChild(icon);
    }
    wrap.appendChild(removeBtn);
    if (previewBox) previewBox.appendChild(wrap);
}

// Xóa toàn bộ media đã chọn và dọn vùng preview.
function _bdClearMedia() {
    _bdMediaFiles = [];
    const pg = document.getElementById('mediaPhotoPreviewContainer');
    const vg = document.getElementById('mediaVideoPreviewContainer');
    if (pg) pg.innerHTML = '';
    if (vg) vg.innerHTML = '';
}

// ===================================================================
// SHARED: CONFIRM SCREEN — điền dữ liệu vào bảng xác nhận
// ===================================================================
// Điền dữ liệu khách hàng, chi phí và media vào màn hình xác nhận.
function _bdFillConfirm(name, phone, service, address, noteRaw) {
    // Thông tin khách hàng
    const cfName = document.getElementById('cf-name');
    const cfPhone = document.getElementById('cf-phone');
    const cfAddr = document.getElementById('cf-address');
    const cfSvc = document.getElementById('cf-service');
    const esc = (v) => String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const renderServiceHtml = (raw) => {
        const txt = String(raw || '').trim();
        const m = txt.match(/^(.*)\(([^()]+)\)\s*$/);
        if (!m) return esc(txt);
        const svcName = esc(m[1].trim());
        const brand = esc(m[2].trim());
        return `${svcName} <span class="cfm-svc-brand">${brand}</span>`;
    };
    if (cfName)  cfName.textContent  = name;
    if (cfPhone) cfPhone.textContent = phone;
    if (cfAddr)  cfAddr.textContent  = address;
    if (cfSvc) {
        const parts = service ? service.split(' + ').map(s => s.trim()).filter(Boolean) : [];
        const normalized = parts.length ? parts : (String(service || '').trim() ? [String(service || '').trim()] : []);
        cfSvc.innerHTML = normalized.length
            ? '<ul class="cfm-service-list">' +
                normalized.map((s, i) =>
                    `<li><span class="cfm-svc-num">${i + 1}</span><span>${renderServiceHtml(s)}</span></li>`
                ).join('') + '</ul>'
            : '';
    }

    // Chi phí
    const costSection     = document.getElementById('cf-cost-section');
    const costBaseRow     = document.getElementById('cf-cost-base-row');
    const costTravelRow   = document.getElementById('cf-cost-travel-row');
    const costSurveyRow   = document.getElementById('cf-cost-survey-row');
    const costBase        = document.getElementById('cf-cost-base');
    const costTravel      = document.getElementById('cf-cost-travel');
    const costSurvey      = document.getElementById('cf-cost-survey');
    const costTotal       = document.getElementById('cf-cost-total');
    const costNote        = document.getElementById('cf-cost-note');

    const basePrice = _bdCurPrice || 0;
    const survey    = (_bdCurSurvey && _bdCurSurvey.required) ? (_bdCurSurvey.amount || 0) : 0;
    const isPerKm   = _bdTravelCfg && _bdTravelCfg.mode === 'per_km';
    const travelOk  = isPerKm && _bdTravelStatus === 'ok';

    const shouldShowCostSection = !!costSection && (basePrice > 0 || survey > 0 || isPerKm || (_bdTravelAmt > 0));

    if (shouldShowCostSection && costSection) {
        costSection.style.display = '';

        // Giá dịch vụ
        if (costBase) costBase.textContent = basePrice > 0 ? _bdFmt(basePrice) : 'Miễn phí';

        // Phí di chuyển (Confirmation Row)
        if (costTravelRow && costTravel) {
            costTravelRow.style.display = '';
            const tMin = _bdTravelCfg?.min || 20000;
            const tMax = _bdTravelCfg?.max || 150000;
            costTravel.innerHTML = `<span style="font-weight:600;">${_bdFmt(tMin)} – ${_bdFmt(tMax)}</span><span class="cfm-cost-sub">tạm tính</span>`;
        }

        // Phí khảo sát
        if (costSurveyRow && costSurvey) {
            if (survey > 0) {
                costSurveyRow.style.display = '';
                costSurvey.innerHTML = `${_bdFmt(survey)}<span class="cfm-cost-sub">nếu không sửa</span>`;
            } else {
                costSurveyRow.style.display = 'none';
            }
        }

        // Tổng tạm tính
        if (costTotal) {
            const baseLabel = basePrice > 0 ? _bdFmt(basePrice) : 'Miễn phí';
            costTotal.innerHTML = `${baseLabel} <span style="font-size:0.78rem;font-weight:500;color:#94a3b8;">+ phí di chuyển</span>`;
        }

        // Ghi chú nhỏ
        if (costNote) {
            if (survey > 0) {
                costNote.style.display = '';
                costNote.innerHTML = '<i class="fas fa-info-circle me-1"></i>Phí khảo sát được miễn nếu đồng ý sửa. Giá chính xác xác nhận sau khi thợ khảo sát.';
            } else {
                costNote.style.display = '';
                costNote.innerHTML = '<i class="fas fa-info-circle me-1"></i>Giá chính xác xác nhận sau khi thợ khảo sát thực tế.';
            }
        }
    } else if (costSection) {
        costSection.style.display = 'none';
    }

    // Ghi chú
    const noteRow = document.getElementById('cf-note-row');
    if (noteRaw && noteRow) {
        document.getElementById('cf-note').textContent = noteRaw;
        noteRow.style.display = '';
    } else if (noteRow) {
        noteRow.style.display = 'none';
    }

    // Đính kèm
    const mediaRow = document.getElementById('cf-media-row');
    if (_bdMediaFiles.length > 0 && mediaRow) {
        const imgs  = _bdMediaFiles.filter(m => m.file.type.startsWith('image/')).length;
        const vids  = _bdMediaFiles.filter(m => m.file.type.startsWith('video/')).length;
        const parts = [];
        if (imgs > 0) parts.push(`${imgs} ảnh`);
        if (vids > 0) parts.push(`${vids} video`);
        document.getElementById('cf-media').textContent = parts.join(', ');
        mediaRow.style.display = '';
    } else if (mediaRow) {
        mediaRow.style.display = 'none';
    }
}

// ===================================================================
// SHARED: API SUBMIT
// ===================================================================
// Chuẩn hóa số về chuỗi 2 ký tự (ví dụ tháng/ngày/giờ).
function _bdPad2(n) {
    return String(n).padStart(2, '0');
}

// Sinh mã đơn hàng theo định dạng TN-YYYYMMDD-XXXX.
function _bdBuildOrderCode() {
    const now = new Date();
    const y = now.getFullYear();
    const m = _bdPad2(now.getMonth() + 1);
    const d = _bdPad2(now.getDate());
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    return `TN-${y}${m}${d}-${suffix}`;
}

// Trả về thời gian hiện tại theo định dạng datetime SQL.
function _bdNowSql() {
    const d = new Date();
    return `${d.getFullYear()}-${_bdPad2(d.getMonth() + 1)}-${_bdPad2(d.getDate())} ${_bdPad2(d.getHours())}:${_bdPad2(d.getMinutes())}:${_bdPad2(d.getSeconds())}`;
}

// Ép giá trị tiền về số nguyên hợp lệ, mặc định 0 nếu không hợp lệ.
function _bdToMoney(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : 0;
}

// Đếm số lượng ảnh/video đã đính kèm trong đơn.
function _bdGetMediaStats() {
    const stats = { total: 0, images: 0, videos: 0 };
    _bdMediaFiles.forEach((item) => {
        const type = String(item?.file?.type || '');
        if (type.startsWith('image/')) stats.images += 1;
        if (type.startsWith('video/')) stats.videos += 1;
    });
    stats.total = stats.images + stats.videos;
    return stats;
}

// Lấy helper KRUD toàn cục và báo lỗi nếu chưa load script.
function _bdGetKrudHelper() {
    if (!window.ThoNhaKrud) {
        throw new Error('Không tải được helper KRUD');
    }
    return window.ThoNhaKrud;
}

/**
 * Mapping dữ liệu pending → schema bảng 'datlich_thonha' (KRUD).
 * @param {Object} pendingData - Payload từ _bdBuildPendingData()
 * @param {string} orderCode   - Mã đơn hàng
 * @returns {Object} Row object sẵn sàng insert vào KRUD
 */
function _bdBuildKrudBookingRecord(pendingData, orderCode) {
    const mediaStats = _bdGetMediaStats();
    const basePrice  = _bdToMoney(pendingData.estimated_price || _bdCurPrice || 0);
    const surveyFee  = (_bdCurSurvey && _bdCurSurvey.required) ? _bdToMoney(_bdCurSurvey.amount || 0) : 0;

    const lat = Number(_bdPendingCoords?.lat);
    const lng = Number(_bdPendingCoords?.lng);

    return {
        madon: orderCode,
        hoten: pendingData.name || '',
        sodienthoai: pendingData.phone || '',
        id_danhmuc: pendingData.id_danhmuc || null,
        id_dichvu: pendingData.id_dichvu || null,
        id_dich_vu: pendingData.id_dichvu || null, // Bổ sung trường alias để đảm bảo lưu record thành công
        tendichvu: pendingData.service_id || '',
        thuonghieu: pendingData.selected_brand || '',
        diachi: pendingData.address || '',
        ghichu: pendingData.note || '',
        giadichvu: basePrice,
        phidichuyen: null,
        quangduongkm: null,
        trangthaidichuyen: 'waiting_provider',
        phikhaosat: surveyFee,
        tongtien: basePrice + surveyFee, 
        soluongmedia: mediaStats.total,
        soluonganh: mediaStats.images,
        soluongvideo: mediaStats.videos,
        maplat: Number.isFinite(lat) ? Number(lat.toFixed(7)) : null,
        maplng: Number.isFinite(lng) ? Number(lng.toFixed(7)) : null,
        nguontrang: window.location.pathname || '',
        trangthai: 'new',
        ngaytao: _bdNowSql()
    };
}

// Ghi nhớ thông tin khách hàng để prefill cho lần đặt lịch sau.
function _bdRememberCustomerProfile(pendingData) {
    try {
        var payload = {
            name: pendingData && pendingData.name ? pendingData.name : 'Khách hàng',
            phone: pendingData && pendingData.phone ? pendingData.phone : '',
            address: pendingData && pendingData.address ? pendingData.address : ''
        };
        localStorage.setItem('thonha_customer_profile_v1', JSON.stringify(payload));
    } catch (_err) {
        // Bỏ qua lỗi localStorage để không ảnh hưởng luồng đặt lịch.
    }
}

/**
 * Tạo bản ghi đặt lịch mới qua ThoNhaApp.
 * @param {Object} pendingData - Payload từ _bdBuildPendingData()
 * @returns {Promise<{orderCode: string, result: *}>}
 */
async function _bdInsertBookingWithKrud(pendingData) {
    const orderCode = _bdBuildOrderCode();
    const row = _bdBuildKrudBookingRecord(pendingData, orderCode);
    
    // Sử dụng ThoNhaApp để tạo đơn hàng
    const result = await ThoNhaApp.createOrder(row);

    return { orderCode, result };
}

/**
 * Hàm chính submit đơn hàng: KRUD insert → Google Sheets → callback.
 * Quản lý trạng thái nút (disabled/spinner) và error handling.
 * @param {Object}      pendingData - Payload từ _bdBuildPendingData()
 * @param {HTMLElement} submitBtn   - Nút submit để toggle trạng thái
 * @param {Function}    onSuccess   - Callback(orderCode) khi thành công
 */
async function _bdSubmitApi(pendingData, submitBtn, onSuccess) {
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';
    const resetBtn = () => {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận';
    };

    try {
        const inserted = await _bdInsertBookingWithKrud(pendingData);
        _bdRememberCustomerProfile(pendingData);
        _bdSendToSheet(pendingData, inserted.orderCode);
        onSuccess(inserted.orderCode || null);
    } catch (err) {
        console.error('[booking-detail] Submit failed:', err);
        alert('❌ ' + (err?.message || 'Không thể kết nối API đặt lịch. Vui lòng thử lại sau!'));
        resetBtn();
    }
}

// ===================================================================
// SHARED: BUILD PENDING DATA từ form
// ===================================================================
/**
 * Tổng hợp dữ liệu form hiện tại thành payload pending để submit.
 * Bao gồm: họ tên, SĐT, dịch vụ, địa chỉ, ghi chú, thương hiệu, giá.
 * @param {string} service - Tên dịch vụ đã chọn (VD: "Sửa máy lạnh (Daikin)")
 * @returns {Object} { name, phone, service_id, address, note, selected_brand, estimated_price }
 */
function _bdBuildPendingData(service) {
    let noteVal = (document.getElementById('ghichu')?.value || '').trim();
    if (_bdMediaFiles.length > 0) {
        const imgs  = _bdMediaFiles.filter(m => m.file.type.startsWith('image/')).length;
        const vids  = _bdMediaFiles.filter(m => m.file.type.startsWith('video/')).length;
        const parts = [];
        if (imgs > 0) parts.push(`${imgs} ảnh`);
        if (vids > 0) parts.push(`${vids} video`);
        noteVal = (noteVal ? noteVal + '\n' : '') + `[Đính kèm: ${parts.join(', ')}]`;
    }
    const priceRaw = Number((document.getElementById('giadichvu')?.value || '').replace(/[^\d]/g, '')) || 0;

    const brandSelections = (service || '')
        .split(' + ')
        .map(s => s.trim())
        .filter(Boolean)
        .map((s) => {
            const m = s.match(/^(.*)\(([^()]+)\)\s*$/);
            if (!m) return null;
            return { service: m[1].trim(), brand: m[2].trim() };
        })
        .filter(Boolean);

    let selectedBrandPayload = null;
    if (brandSelections.length === 1) {
        selectedBrandPayload = brandSelections[0].brand;
    } else if (brandSelections.length > 1) {
        selectedBrandPayload = brandSelections
            .map(b => `${b.service}: ${b.brand}`)
            .join(' | ');
    }

    if (!selectedBrandPayload) {
        const activeBrand = document.querySelector('#bookingModal .brand-option.active, .booking-form-section .brand-option.active');
        selectedBrandPayload = activeBrand ? activeBrand.dataset.brand : null;
    }

    return {
        name:            (document.getElementById('hoten')?.value  || '').trim(),
        phone:           (document.getElementById('sodienthoai')?.value || '').trim(),
        service_id:      service,
        address:         (document.getElementById('diachi')?.value || '').trim(),
        note:            noteVal,
        selected_brand:  selectedBrandPayload,
        estimated_price: priceRaw,
        id_danhmuc:      _bdCurCatId,
        id_dichvu:       _bdCurServiceId
    };
}

// ===================================================================
// SHARED: VALIDATE COMMON FIELDS (name, phone, address)
// ===================================================================
// Kiểm tra các trường bắt buộc và định dạng số điện thoại.
function _bdValidateCommon(data) {
    if (!data.name || !data.phone || !data.service_id || !data.address) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
        return false;
    }
    if (!/^(0|\+84)[0-9]{9}$/.test(data.phone)) {
        alert('Số điện thoại không hợp lệ!');
        return false;
    }
    return true;
}


// ===================================================================
// SHARED: BUILD MULTI-SELECT SUB-SERVICE BUTTONS
// container   — DOM element để render buttons vào
// hiddenEl    — input[type=hidden] lưu giá trị đã chọn (joined bởi " + ")
// items       — mảng items từ services.json
// catData     — category object (để lấy travelFee fallback)
// countEl     — (tuỳ chọn) badge hiển thị số lượng đã chọn
// priceEl     — (tuỳ chọn) input hiển thị giá tham khảo
// ===================================================================
// Render cụm nút chọn nhiều dịch vụ con và đồng bộ dữ liệu liên quan.
function _bdBuildSubBtns(container, hiddenEl, items, catData, countEl, priceEl) {
    container.innerHTML = '';
    if (hiddenEl) hiddenEl.value = '';
    if (countEl)  { countEl.textContent = ''; countEl.style.display = 'none'; }
    if (priceEl)  priceEl.value = '';
    _bdHideBreakdown();
    _bdClearBrandSelectorUi();

    const brandWrap = document.getElementById('brandSelectorWrap');
    const brandBox = document.getElementById('brandOptionsContainer');

    let selectedItems = [];
    let selectedBrands = Object.create(null);

    // Xóa lựa chọn thương hiệu của dịch vụ đã bị bỏ chọn.
    function _trimRemovedBrandSelections() {
        const selectedNames = new Set(selectedItems.map(i => i.name));
        Object.keys(selectedBrands).forEach((svcName) => {
            if (!selectedNames.has(svcName)) delete selectedBrands[svcName];
        });
    }

    // Tạo nhãn hiển thị dịch vụ kèm thương hiệu đã chọn.
    function _serviceLabel(item) {
        const brand = selectedBrands[item.name];
        if (brand && brand.name) return `${item.name} (${brand.name})`;
        return item.name;
    }

    // Lấy giá cuối cùng của dịch vụ theo thương hiệu đang chọn.
    function _effectiveItemPrice(item) {
        const selected = selectedBrands[item.name];
        if (selected && Number.isFinite(selected.price)) return selected.price;
        return item.price || 0;
    }

    // Render danh sách chọn thương hiệu cho các dịch vụ có bảng giá theo hãng.
    function _renderBrandSelectors() {
        if (!brandWrap || !brandBox) return;

        _trimRemovedBrandSelections();
        brandBox.innerHTML = '';

        const brandedItems = selectedItems.filter(item => Array.isArray(item.brandPrices) && item.brandPrices.length > 0);
        if (brandedItems.length === 0) {
            brandWrap.style.display = 'none';
            return;
        }

        const frag = document.createDocumentFragment();

        brandedItems.forEach((item) => {
            if (!selectedBrands[item.name] && item.brandPrices.length > 0) {
                const firstBrand = item.brandPrices[0];
                const firstPrice = Number(firstBrand.price);
                selectedBrands[item.name] = {
                    name: firstBrand.name || '',
                    price: Number.isFinite(firstPrice) ? firstPrice : (item.price || 0)
                };
            }

            const group = document.createElement('div');
            group.className = 'brand-service-group';

            const title = document.createElement('div');
            title.className = 'brand-service-title';
            title.textContent = item.name;
            group.appendChild(title);

            const options = document.createElement('div');
            options.className = 'brand-options';

            const activeBrand = selectedBrands[item.name]?.name || '';

            item.brandPrices.forEach((brand) => {
                const brandPrice = Number(brand.price);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'brand-option';
                btn.dataset.serviceName = item.name;
                btn.dataset.brand = brand.name || '';
                if (Number.isFinite(brandPrice)) btn.dataset.price = String(brandPrice);

                if (activeBrand && activeBrand === (brand.name || '')) {
                    btn.classList.add('active');
                }

                btn.textContent = brand.name || 'Khác';
                if (Number.isFinite(brandPrice)) {
                    const priceTag = document.createElement('small');
                    priceTag.className = 'brand-option-price';
                    priceTag.textContent = ' - ' + brandPrice.toLocaleString('vi-VN') + 'đ';
                    btn.appendChild(priceTag);
                }

                btn.addEventListener('click', () => {
                    selectedBrands[item.name] = {
                        name: brand.name || '',
                        price: Number.isFinite(brandPrice) ? brandPrice : (item.price || 0)
                    };
                    _sync();
                });

                options.appendChild(btn);
            });

            group.appendChild(options);
            frag.appendChild(group);
        });

        brandBox.appendChild(frag);
        brandWrap.style.display = '';
    }

    // Đồng bộ hidden input, badge, giá hiển thị và breakdown chi phí.
    function _sync() {
        _renderBrandSelectors();

        // Cập nhật hidden input
        if (hiddenEl) hiddenEl.value = selectedItems.map(_serviceLabel).join(' + ');

        // Cập nhật badge đếm
        if (countEl) {
            if (selectedItems.length > 0) {
                countEl.textContent = selectedItems.length + ' đã chọn';
                countEl.style.display = '';
            } else {
                countEl.style.display = 'none';
            }
        }

        // Cập nhật giá + breakdown
        if (selectedItems.length === 0) {
            if (priceEl) priceEl.value = '';
            _bdHideBreakdown();
            return;
        }

        const totalPrice = selectedItems.reduce((s, i) => s + _effectiveItemPrice(i), 0);
        if (priceEl) {
            if (totalPrice === 0) {
                priceEl.value = 'Miễn phí dịch vụ (chỉ tính phí di chuyển)';
            } else {
                priceEl.value = Number(totalPrice).toLocaleString('vi-VN') + 'đ';
            }
        }
        const travelFee  = selectedItems[0].travelFee || catData.travelFee || null;
        const surveyItem = selectedItems.find(i => i.surveyFee);
        const surveyFee  = surveyItem ? surveyItem.surveyFee : null;
        
        const catId = catData.id || null;
        const serviceId = selectedItems.map(i => i.id).filter(id => id !== undefined && id !== null).join(',');
        _bdSetBreakdown(totalPrice, travelFee, surveyFee, catId, serviceId);
    }

    items.forEach(item => {
        const isSurvey = !!item.isSurveyOnly;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sub-service-btn' + (isSurvey ? ' sub-service-btn--survey' : '');
        btn.dataset.itemName = item.name;

        if (isSurvey) {
            btn.innerHTML = `${item.name} <small style="opacity:0.75;font-size:0.78em;">(phí di chuyển + khảo sát)</small>`;
        } else {
            btn.textContent = item.name + (item.price ? ` – ${Number(item.price).toLocaleString('vi-VN')}đ` : '');
        }

        btn.addEventListener('click', () => {
            if (selectedItems.includes(item)) {
                selectedItems = selectedItems.filter(i => i !== item);
                btn.classList.remove('active');
            } else {
                selectedItems.push(item);
                btn.classList.add('active');
            }
            _sync();
        });

        container.appendChild(btn);
    });
}

