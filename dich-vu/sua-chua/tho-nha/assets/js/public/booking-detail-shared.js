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

// Google Apps Script Web App URL — thay bằng URL thật sau khi deploy
const _BD_GSHEET_URL = window.GSHEET_URL || 'https://script.google.com/macros/s/AKfycbx8J5infIIqf-VOFCNq89L7W1xRfluTU0Dt4R8Vijl81zhid59aql3vURdT01dwaaKgPQ/exec';

// ===================================================================
// AUTH GATE — ĐẶT LỊCH NHANH (Không yêu cầu đăng nhập)
// Tự động tạo tài khoản nếu chưa có khi đặt lịch.
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

// Kiểm tra khách hàng đã đăng nhập hợp lệ hay chưa.
async function _bdIsCustomerLoggedIn() {
    try {
        const session = await DVQTApp.checkSession();
        return !!(session && session.logged_in);
    } catch (_err) {
        return false;
    }
}

// Tạo URL trang đăng nhập dùng chung, kèm redirect quay lại trang hiện tại.
function _bdGetCustomerLoginUrl() {
    const redirect = encodeURIComponent(window.location.href);
    return _BD_BASE + '../../../public/dang-nhap.html?redirect=' + redirect;
}

// Hiển thị banner trạng thái trên form đặt lịch.
async function _bdRenderAuthBanner() {
    const banner = document.getElementById('bookingAuthBanner');
    if (!banner) return;

    // 1. Kiểm tra session thật
    try {
        const session = await DVQTApp.checkSession();
        if (session && session.logged_in) {
            const name = String(session.name || 'Khách hàng');
            const phone = String(session.phone || '');
            banner.innerHTML = '<div class="alert alert-success py-2 mb-0"><i class="fas fa-check-circle me-1"></i>Đang đặt lịch bằng tài khoản: <strong>' +
                name + '</strong>' + (phone ? ' - ' + phone : '') + '</div>';
            banner.style.display = '';
            return;
        }
    } catch(_e) {}

    // 2. Hiện banner đặt lịch nhanh (không yêu cầu đăng nhập)
    banner.innerHTML = '<div class="alert alert-info py-2 mb-0"><i class="fas fa-bolt me-1"></i>Đặt lịch nhanh — Hệ thống sẽ tự động tạo tài khoản cho bạn. ' +
        'Đã có tài khoản? <a href="' + _bdGetCustomerLoginUrl() + '">Đăng nhập</a></div>';
    banner.style.display = '';
}

/**
 * Tự động tạo tài khoản hoặc tìm tài khoản hiện có theo SĐT.
 * - Nếu SĐT chưa tồn tại: Tạo tài khoản mới (matkhau = SĐT, id_dichvu = 0)
 * - Nếu SĐT đã tồn tại: Thông báo nhưng vẫn cho đặt lịch
 * @param {string} name - Họ tên khách hàng
 * @param {string} phone - SĐT khách hàng
 * @returns {{ isNew: boolean, accountExists: boolean, userId: string|null }}
 */
async function _bdAutoCreateOrFindAccount(name, phone) {
    const krud = window.DVQTKrud;
    if (!krud) throw new Error('Hệ thống chưa sẵn sàng.');

    const pNorm = String(phone).replace(/\D/g, '');
    const rows = await krud.listTable('nguoidung', { limit: 2000 });
    const existing = rows.find(r => {
        const dbPhone = String(r.sodienthoai || r.phone || '').replace(/\D/g, '');
        return dbPhone === pNorm;
    });

    if (existing) {
        // SĐT đã tồn tại — vẫn cho đặt lịch nhưng thông báo
        return { isNew: false, accountExists: true, userId: existing.id };
    }

    // Tạo tài khoản mới
    const now = new Date();
    const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const pad = n => String(n).padStart(2, '0');
    const created = `${vn.getFullYear()}-${pad(vn.getMonth()+1)}-${pad(vn.getDate())} ${pad(vn.getHours())}:${pad(vn.getMinutes())}:${pad(vn.getSeconds())}`;

    // Đảm bảo bảng nguoidung tồn tại
    if (typeof krud.ensureNguoidungTable === 'function') {
        await krud.ensureNguoidungTable();
    }

    const userData = {
        hovaten: name,
        sodienthoai: phone,
        matkhau: phone, // Mật khẩu mặc định = SĐT
        id_dichvu: '0', // Mặc định là khách hàng
        created_date: created,
        trangthai: 'active'
    };

    const result = await krud.insertRow('nguoidung', userData);
    const newId = result?.data?.id || result?.id || null;
    return { isNew: true, accountExists: false, userId: newId };
}

// Điền sẵn thông tin khách hàng vào form từ URL hoặc Profile (đã đăng nhập).
async function _bdPrefillCustomerProfileToForm() {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Lấy dữ liệu từ URL (Ưu tiên hàng đầu cho Express Mode)
    const urlPhone = params.get('sdt');
    const urlName = params.get('ten') || params.get('ho_ten');

    // 2. Lấy dữ liệu từ Session (Nếu đã đăng nhập)
    const session = await DVQTApp.checkSession();
    const profile = session.logged_in ? (session.profile || session) : null;
    
    const hotenEl = document.getElementById('hoten');
    const sdtEl = document.getElementById('sodienthoai');
    const diachiEl = document.getElementById('diachi');

    // Điền Họ tên
    if (hotenEl && !hotenEl.value) {
        hotenEl.value = urlName || (profile ? (profile.name || '') : '');
    }
    // Điền SĐT
    if (sdtEl && !sdtEl.value) {
        sdtEl.value = urlPhone || (profile ? (profile.phone || '') : '');
    }
    // Điền Địa chỉ
    if (diachiEl && !diachiEl.value && profile && profile.address) {
        diachiEl.value = String(profile.address);
    }
}

// Biến lưu kết quả xác thực URL để tránh gọi API nhiều lần
let _urlAuthCache = null;
window._bdTransportFeeRates = [];

// Tự động điều chỉnh các option của thời gian phục vụ theo giờ thực tế (VN)
function _bdAutoSetTimePreference() {
    const timeEl = document.getElementById('thoigianphucvu');
    if (!timeEl) return;
    
    const rates = Array.isArray(window._bdTransportFeeRates) ? window._bdTransportFeeRates : [];
    const getRate = (type) => {
        const found = rates.find(x => String(x.loaiphi) === type);
        return found && found.sotien ? (Number(found.sotien).toLocaleString('vi-VN') + 'đ') : '5.000đ';
    };

    const rSang = getRate('Thường');
    const rToi  = getRate('Buổi tối');
    const rGap  = getRate('Gấp');

    const now = new Date();
    const vnTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    const hours = vnTime.getHours();
    
    let baseOption = '';
    // 6h sáng -> trước 18h tối (tức là 6 -> 17)
    if (hours >= 6 && hours < 18) {
        baseOption = `<option value="Thường">Buổi sáng (${rSang}/km)</option>`;
    } else {
        baseOption = `<option value="Buổi tối">Buổi tối (${rToi}/km)</option>`;
    }
    
    timeEl.innerHTML = baseOption + `<option value="Gấp">Gấp (tới trong 1h, ${rGap}/km)</option>`;
}

// Chuẩn bị trạng thái auth ban đầu cho luồng đặt lịch.
async function _bdPrepareBookingAuthState() {
    try {
        if (window.DVQTKrud) {
            const res = await window.DVQTKrud.listTable('phidichuyen', { limit: 100 });
            window._bdTransportFeeRates = Array.isArray(res) ? res : [];
        }
    } catch(e) {}
    
    _bdAutoSetTimePreference();

    // Thử xác thực thầm lặng qua URL nếu có đủ tham số (không hiện alert nếu thất bại ở giai đoạn này)
    const params = new URLSearchParams(window.location.search);
    if (params.get('sdt') && params.get('password')) {
        const isValid = await _bdRequireCustomerLogin(true); 
        
        // Nếu xác thực thành công qua URL -> Hiện thông báo chào mừng rực rỡ
        if (isValid && _urlAuthCache && _urlAuthCache.profile) {
            const userName = _urlAuthCache.profile.hovaten || _urlAuthCache.profile.name || 'Quý khách';
            Swal.fire({
                title: '<span style="color:#11998e">Chào mừng ' + userName + '!</span>',
                html: 'Tài khoản của bạn đã được xác thực qua liên kết. Bạn có thể tiến hành đặt lịch ngay bây giờ.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                borderRadius: '12px'
            });
        }
    }

    await _bdRenderAuthBanner();
    await _bdPrefillCustomerProfileToForm();
}

// Kiểm tra quyền đặt lịch (chỉ chặn nếu NCC tự đặt dịch vụ của mình).
// Không còn yêu cầu đăng nhập — luôn cho phép đặt lịch.
async function _bdRequireCustomerLogin(isSilent = false) {
    const currentCatId = String(_bdCurCatId || '9');

    // Nếu đã có Session Cookie (Đã đăng nhập thực sự) → Chỉ chặn NCC tự đặt cho mình
    try {
        const session = await DVQTApp.checkSession();
        if (session && session.logged_in) {
            const userDichVuIds = String(session.id_dichvu || '').split(',').map(v => v.trim());
            if (userDichVuIds.includes(currentCatId)) {
                Swal.fire({
                    title: '<span style="color:#11998e">Rất tiếc!</span>',
                    html: 'Bạn không thể đặt lịch dịch vụ do chính mình thực hiện.',
                    icon: 'warning',
                    confirmButtonColor: '#11998e',
                    borderRadius: '12px'
                });
                return false;
            }
        }
    } catch(_e) {}

    // Luôn cho phép đặt lịch — tài khoản sẽ được tạo tự động khi submit
    return true;
}

// Điền thông tin profile uỷ quyền từ URL vào form (Không kích hoạt banner đăng nhập)
async function _bdPrefillFromExpressUser(user) {
    if (!user) return;
    const hotenEl = document.getElementById('hoten');
    const sdtEl = document.getElementById('sodienthoai');
    const diachiEl = document.getElementById('diachi');

    if (hotenEl)  hotenEl.value  = user.hovaten || user.name || '';
    if (sdtEl)    sdtEl.value    = user.sodienthoai || user.phone || '';
    if (diachiEl) diachiEl.value = user.diachi || user.dia_chi || user.address || '';
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
    if (typeof window.saveToGoogleSheet !== 'function') {
        console.warn('driveUtil.js chưa được nạp, bỏ qua gửi Sheet.');
        return;
    }
    const now = new Date();
    const created_at = now.toLocaleString('vi-VN', { hour12: false });
    const surveyAmt = (_bdCurSurvey && _bdCurSurvey.required) ? (_bdCurSurvey.amount || 0) : 0;
    const travelAmt = _bdTravelAmt || 0;
    const basePrice = _bdCurPrice  || 0;
    
    // Tìm nhãn thời gian
    const thoigianEl = document.getElementById('thoigianphucvu');
    const thoigianLabel = thoigianEl ? thoigianEl.options[thoigianEl.selectedIndex].text : 'Thường';

    const payload = {
        sheet_type:       "Thợ nhà",
        "Mã đơn":         orderCode || '',
        "Họ tên":         pendingData.name            || '',
        "Số điện thoại":  pendingData.phone           || '',
        "Dịch vụ":        pendingData.service_id      || '',
        "Thương hiệu":    pendingData.selected_brand  || '',
        "Địa chỉ":        pendingData.address         || '',
        "Yêu cầu TG":     thoigianLabel,
        "Giá dịch vụ":    basePrice,
        "Phí di chuyển":  travelAmt,
        "Phí khảo sát":   surveyAmt,
        "Tổng tiền":      basePrice + travelAmt,
        "Ghi chú":        pendingData.note            || '',
        "Ngày đặt":       created_at,
    };

    window.saveToGoogleSheet(payload).catch(err => {
        console.error('Lỗi khi lưu Google Sheet (Thợ Nhà):', err);
    });
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

// Mọi logic Geocode và bắt sự kiện gõ phím đã được chuyển sang map-picker.js

async function _bdTravelFromCoords(inLat, inLng) {
    const lat = Number(inLat);
    const lng = Number(inLng);
    _bdPendingCoords = { lat, lng };
    if (!_bdTravelCfg || _bdTravelCfg.mode !== 'per_km') return;
    
    _bdTravelStatus = 'loading';
    _bdRefreshBreakdown();

    try {
        // Tận dụng logic tính khoảng cách từ dvqt-map.js — Sử dụng bảng nguoidung hợp nhất với id_dichvu = 9
        const result = await mapPicker.calculateDistance(lat, lng, 'nguoidung', '9');
        if (result && result.km != null) {
            // Sau khi có khoảng cách, Thợ Nhà tự tính phí theo config riêng
            const feeResult = _bdCalculateTravelFee(result.km, _bdTravelCfg);
            _bdTravelAmt    = feeResult.amt;
            _bdTravelDistKm = result.km;
            _bdTravelStatus = 'ok';
            console.log('Travel fee calculated in ThoNha logic:', feeResult);
        } else {
            console.warn('No provider matched for distance calculation.');
            _bdTravelStatus = 'na';
        }
    } catch (e) {
        console.error('Calculation error:', e);
        _bdTravelStatus = 'error';
    }
    _bdRefreshBreakdown();
}

function _bdCalculateTravelFee(km, config) {
    const dist = Number(km) || 0;
    
    // Tìm Time Preference Rate
    const thoigianEl = document.getElementById('thoigianphucvu');
    const thoigian = thoigianEl ? thoigianEl.value : 'Thường';
    
    let rate = 5000;
    if (Array.isArray(window._bdTransportFeeRates) && window._bdTransportFeeRates.length > 0) {
        const found = window._bdTransportFeeRates.find(x => String(x.loaiphi) === thoigian);
        if (found && found.sotien) rate = parseInt(found.sotien) || 5000;
    }

    // Miễn phí 3km đầu
    const billableKm = Math.max(0, dist - 3);
    const fee = billableKm * rate;

    const amtRounded = Math.round(fee / 1000) * 1000;
    return { amt: amtRounded, km: dist, rateUsed: rate, billableKm: billableKm };
}

/** 
 * Tìm nhà cung cấp gần nhất phù hợp (Hàm fallback để tương thích mã cũ) 
 */
window._bdTravelFromCoords = _bdTravelFromCoords;

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
    
    // Tự động nhận diện mã danh mục từ dropdown
    if (!catId) {
        catId = document.getElementById('loaidichvu')?.value || null;
    }
    
    _bdCurCatId  = catId || null;
    _bdCurServiceId = serviceId || null;
    
    console.log('catId set to', _bdCurCatId, 'for pricing calculation.');

    const isPerKm = travelFee && travelFee.mode === 'per_km';
    _bdTravelCfg    = isPerKm ? travelFee : null;
    _bdTravelStatus = isPerKm ? 'idle' : 'na';
    _bdTravelAmt    = 0; _bdTravelDistKm = 0;
    clearTimeout(_bdTravelTimer);
    _bdUpdateBreakdown(_bdCurPrice, _bdTravelCfg, _bdCurSurvey);
    // Khi set breakdown, gọi tính phí ngay nếu đã có tọa độ chờ
    if (isPerKm && _bdPendingCoords) {
        _bdTravelFromCoords(_bdPendingCoords.lat, _bdPendingCoords.lng);
    } else if (isPerKm && !_bdPendingCoords) {
        // Dự phòng: Nếu chưa có tọa độ, thử lấy từ ô địa chỉ đang gõ
        const addr = document.getElementById('diachi')?.value;
        if (addr && addr.length > 5) {
            console.log('Forced geocoding for travel fee...');
            _bdGeocodeFromAddress(addr);
        }
    }
}

/**
 * Cập nhật lại giao diện Breakdown với các biến state hiện tại.
 */
function _bdRefreshBreakdown() {
    _bdUpdateBreakdown(_bdCurPrice, _bdTravelCfg, _bdCurSurvey);
}

// Listener cập nhật khi thay đổi yêu cầu thời gian
function _bdSetupAddressListener() {
    const timeEl = document.getElementById('thoigianphucvu');
    if (timeEl) {
        timeEl.addEventListener('change', () => {
            if (_bdPendingCoords && _bdTravelStatus === 'ok') {
                _bdTravelFromCoords(_bdPendingCoords.lat, _bdPendingCoords.lng);
            } else {
                _bdRefreshBreakdown();
            }
        });
    }
}

// Dùng chung cho cả modal và standalone (cùng ID trong DOM)
// Render khối breakdown chi phí cho cả modal và trang standalone.
function _bdUpdateBreakdown(price, travelFee, surveyFee) {
    const wrap = document.getElementById('pricingBreakdownWrap');
    if (!wrap) return;

    const isPerKm = travelFee && travelFee.mode === 'per_km';
    const tAmt = isPerKm ? (_bdTravelStatus === 'ok' ? _bdTravelAmt : 0) : null;
    const effectiveTf = isPerKm ? null : travelFee; 

    // Tính phí fixed
    const tFixed = effectiveTf ? (effectiveTf.min ?? effectiveTf.fixedAmount ?? 0) : 0;
    const survey  = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;

    const travelAmtValue = isPerKm ? tAmt : tFixed;

    // Hiển thị giá dịch vụ
    const bdService = document.getElementById('bd-service');
    if (bdService) {
        bdService.innerHTML = price > 0 ? _bdFmt(price) : 'Miễn phí';
    }

    const thoigianEl = document.getElementById('thoigianphucvu');
    let thoigian = thoigianEl ? thoigianEl.value : 'Thường';
    let rate = 5000;
    if (Array.isArray(window._bdTransportFeeRates)) {
        let found = window._bdTransportFeeRates.find(x => String(x.loaiphi) === thoigian);
        if (found && found.sotien) rate = parseInt(found.sotien) || 5000;
    }
    
    // Giao diện khảo sát - phí không sửa
    const bdSurveyNotice = document.getElementById('bd-survey-notice');
    if (bdSurveyNotice) bdSurveyNotice.style.display = '';

    const bdSurveyTravel = document.getElementById('bd-survey-travel');
    if (bdSurveyTravel) {
        if (isPerKm) {
            if (_bdTravelStatus === 'ok') {
                const distInfo = _bdTravelDistKm > 0 ? `<div style="font-size:0.75rem; text-align:right;">(+${Math.max(0, _bdTravelDistKm - 3).toFixed(1)} km tính phí)</div>` : '';
                bdSurveyTravel.innerHTML = `<span style="font-weight:700;">${_bdFmt(_bdTravelAmt)}</span><br>${distInfo}`;
            } else if (_bdTravelStatus === 'loading') {
                bdSurveyTravel.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang tính...';
            } else {
                bdSurveyTravel.innerHTML = `Tạm tính theo ${_bdFmt(rate)}/km<br><span style="font-size:0.75rem">(Sau 3km đầu)</span>`;
            }
        } else {
            bdSurveyTravel.textContent = _bdFmt(tFixed);
        }
    }

    const bdSurveyAmount = document.getElementById('bd-survey-amount');
    if (bdSurveyAmount) {
        bdSurveyAmount.textContent = survey > 0 ? _bdFmt(survey) : 'Miễn phí';
    }

    const bdSurveyNoRepair = document.getElementById('bd-survey-no-repair');
    if (bdSurveyNoRepair) {
        if (isPerKm && _bdTravelStatus !== 'ok') {
            bdSurveyNoRepair.innerHTML = survey > 0 ? `${_bdFmt(survey)} <span class="fw-normal text-muted" style="font-size: 0.85rem">+ phí di chuyển</span>` : `<span style="font-size: 0.9rem">Theo di chuyển</span>`;
        } else {
            bdSurveyNoRepair.textContent = _bdFmt((travelAmtValue || 0) + survey);
        }
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
        // Milestone: Regex thông minh để tách Tên + Thương hiệu ra riêng, Giá ra riêng
        let labelSide = txt;
        let priceSide = '';

        const m = txt.match(/^(.*?)\s*–\s*(.*)$/);
        if (m) {
            labelSide = m[1].trim();
            priceSide = m[2].trim();
        }

        const mB = labelSide.match(/^(.*)\(([^()]+)\)\s*$/);
        let finalLabel = esc(labelSide);
        if (mB) {
            finalLabel = `${esc(mB[1].trim())} <span class="cfm-svc-brand">${esc(mB[2].trim())}</span>`;
        }

        return priceSide 
            ? `<div class="cfm-svc-content">${finalLabel}</div> <span class="cfm-svc-price">${esc(priceSide)}</span>`
            : `<div class="cfm-svc-content">${finalLabel}</div>`;
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
                    `<li><span class="cfm-svc-num">${i + 1}</span>${renderServiceHtml(s)}</li>`
                ).join('') + '</ul>'
            : '';
    }

    // Chi phí
    const costSection     = document.getElementById('cf-cost-section');
    const costBase        = document.getElementById('cf-cost-base');
    const costTravel      = document.getElementById('cf-cost-travel');
    const costSurvey      = document.getElementById('cf-cost-survey');
    const costNoRepair    = document.getElementById('cf-cost-norepair');

    const basePrice = _bdCurPrice || 0;
    const survey    = (_bdCurSurvey && _bdCurSurvey.required) ? (_bdCurSurvey.amount || 0) : 0;
    const isPerKm   = _bdTravelCfg && _bdTravelCfg.mode === 'per_km';

    // Tìm rate
    let tAmt = 0;
    let rateUi = '';
    const thoigianEl = document.getElementById('thoigianphucvu');
    const thoigian = thoigianEl ? thoigianEl.value : 'Thường';
    if (isPerKm) {
        if (_bdTravelStatus === 'ok') {
            tAmt = _bdTravelAmt;
            rateUi = '';
        } else {
            let rate = 5000;
            if (Array.isArray(window._bdTransportFeeRates)) {
                let found = window._bdTransportFeeRates.find(x => String(x.loaiphi) === thoigian);
                if (found && found.sotien) rate = parseInt(found.sotien) || 5000;
            }
            tAmt = 0;
            rateUi = `<span class="cfm-cost-sub text-muted">Từ ${_bdFmt(rate)}/km (sau 3km)</span>`;
        }
    } else {
        tAmt = _bdTravelCfg?.min || 0;
    }

    const shouldShowCostSection = !!costSection && (basePrice > 0 || survey > 0 || isPerKm || (_bdTravelAmt > 0));

    if (shouldShowCostSection && costSection) {
        costSection.style.display = '';

        // Giá dịch vụ (Nếu khách sửa)
        if (costBase) costBase.textContent = basePrice > 0 ? _bdFmt(basePrice) : 'Miễn phí';

        // Phí di chuyển (Nếu khách không sửa)
        if (costTravel) {
            if (isPerKm && _bdTravelStatus !== 'ok') {
                costTravel.innerHTML = rateUi;
            } else {
                costTravel.innerHTML = `<span style="font-weight:600;">${_bdFmt(tAmt)}</span>`;
            }
        }

        // Phí khảo sát
        if (costSurvey) {
            costSurvey.innerHTML = survey > 0 ? `<span style="font-weight:600;">${_bdFmt(survey)}</span>` : 'Miễn phí';
        }

        // Tổng không sửa
        if (costNoRepair) {
            if (isPerKm && _bdTravelStatus !== 'ok') {
                costNoRepair.innerHTML = survey > 0 ? `${_bdFmt(survey)} + Phí đi lại` : `Phí đi lại`;
            } else {
                costNoRepair.textContent = _bdFmt(tAmt + survey);
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

// Trả về thời gian hiện tại theo định dạng datetime SQL.
function _bdNowSql() {
    const d = new Date();
    // Milestone: Ép giờ Việt Nam GMT+7
    const vnNow = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    return `${vnNow.getFullYear()}-${_bdPad2(vnNow.getMonth() + 1)}-${_bdPad2(vnNow.getDate())} ${_bdPad2(vnNow.getHours())}:${_bdPad2(vnNow.getMinutes())}:${_bdPad2(vnNow.getSeconds())}`;
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
    if (!window.DVQTKrud) {
        throw new Error('Không tải được bộ thư viện DVQTKrud dùng chung');
    }
    return window.DVQTKrud;
}

/**
 * Mapping dữ liệu pending → schema bảng 'datlich_thonha' (KRUD).
 */
function _bdBuildKrudBookingRecord(pendingData) {
    const mediaStats = _bdGetMediaStats();
    const basePrice  = _bdToMoney(pendingData.estimated_price || _bdCurPrice || 0);
    const surveyFee  = (_bdCurSurvey && _bdCurSurvey.required) ? _bdToMoney(_bdCurSurvey.amount || 0) : 0;

    const lat = Number(_bdPendingCoords?.lat);
    const lng = Number(_bdPendingCoords?.lng);

    return {
        tenkhachhang: pendingData.name || '',
        sdtkhachhang: pendingData.phone || '',
        diachikhachhang: pendingData.address || '',
        emailkhachhang: pendingData.email || '',
        
        id_danhmuc: pendingData.id_danhmuc || null,
        id_dichvu: pendingData.id_dichvu || null,
        tendichvu: pendingData.service_id || '',
        thuonghieu: pendingData.selected_brand || '',
        ghichu: `[Khoản: ${document.getElementById('thoigianphucvu')?.value || 'Thường'}] ` + (pendingData.note || ''),
        giadichvu: basePrice,
        phidichuyen: _bdToMoney(_bdTravelAmt),
        quangduongkm: _bdTravelDistKm ? Number(_bdTravelDistKm.toFixed(2)) : null,
        trangthaidichuyen: _bdTravelStatus === 'ok' ? 'calculated' : 'waiting_provider',
        phikhaosat: surveyFee,
        tongtien: basePrice + _bdToMoney(_bdTravelAmt), 
        
        // Ảnh đính kèm (Lưu ID Drive)
        link_hinhanh_khachhang: pendingData.link_hinhanh_khachhang || '',
        soluongmedia: mediaStats.total,
        soluonganh: mediaStats.images,
        soluongvideo: mediaStats.videos,
        
        maplat: Number.isFinite(lat) ? Number(lat.toFixed(7)) : null,
        maplng: Number.isFinite(lng) ? Number(lng.toFixed(7)) : null,
        ngaydat: _bdNowSql()
    };
}

// Ghi nhớ thông tin khách hàng (Đã bỏ localStorage - thông tin tự động lấy từ Cookie)
function _bdRememberCustomerProfile(pendingData) {
    // Luồng mới không lưu vào localStorage nữa để đảm bảo tính riêng tư
}

/**
 * Tạo bản ghi đặt lịch mới qua ThoNhaApp.
 */
async function _bdInsertBookingWithKrud(pendingData) {
    const row = _bdBuildKrudBookingRecord(pendingData);
    const result = await DVQTApp.createOrder(row, 'datlich_thonha');
    const rawId = (result && (result.data?.id || result.id)) || 0;
    return { 
        rawId: rawId,
        orderCode: String(rawId).padStart(7, '0'), 
        result 
    };
}

/**
 * Hàm chính submit đơn hàng: Tận dụng DVQTApp để gửi đơn & xử lý UI.
 */
async function _bdSubmitApi(pendingData, submitBtn, onSuccess) {
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';

    try {
        // --- 1. Upload Media lên Drive ---
        const app = window.DVQTApp;
        const mediaIds = [];
        
        if (_bdMediaFiles && _bdMediaFiles.length > 0) {
            for (let i = 0; i < _bdMediaFiles.length; i++) {
                const item = _bdMediaFiles[i];
                submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Đang tải ảnh ${i+1}/${_bdMediaFiles.length}...`;
                try {
                    const up = await app.uploadFile(item.file);
                    if (up.success) mediaIds.push(up.fileId);
                } catch (e) {
                    console.warn('Lỗi tải file lên Drive:', e);
                }
            }
        }
        
        pendingData.link_hinhanh_khachhang = mediaIds.join(',');

        // --- 2. Tạo đơn hàng ---
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo đơn...';
        const inserted = await _bdInsertBookingWithKrud(pendingData);
        
        // --- 3. Backup Sheets ---
        _bdSendToSheet(pendingData, inserted.rawId);
        onSuccess(inserted.orderCode || null);

    } catch (err) {
        alert('❌ ' + (err?.message || 'Lỗi đặt lịch. Thử lại sau!'));
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận';
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
        const p = _effectiveItemPrice(item);
        const pS = p > 0 ? `${Number(p).toLocaleString('vi-VN')}đ` : 'Miễn phí';
        if (brand && brand.name) return `${item.name} (${brand.name}) – ${pS}`;
        return `${item.name} – ${pS}`;
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
        if (item.id) btn.dataset.id = item.id;

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

