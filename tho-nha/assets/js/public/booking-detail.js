/**
 * booking-detail.js
 * Xử lý đặt lịch cho HAI chế độ — dùng chung một nguồn JS:
 *
 *  1. MODAL MODE   — trang chi tiết dịch vụ (service-detail.php)
 *     - Lazy-load partials/dat-lich-chi-tiet.html khi lần đầu người dùng click
 *     - Detail mode : nút "Đặt lịch" trên từng card → pre-fill dịch vụ readonly
 *     - Nav mode    : nút "Đặt Lịch" trên navbar → dropdown chọn dịch vụ
 *
 *  2. STANDALONE MODE — trang đặt lịch trực tiếp (dat-lich.html)
 *     - Form nhúng thẳng vào trang (không phải modal)
 *     - URL param ?service= để prefill
 *     - Phát hiện bằng: document.body.classList.contains('dat-lich-standalone')
 *
 * Công thức tính giá (giống booking.js):
 *   Nếu đồng ý sửa  : total = base + travelMin → base + travelMax  (phí KS miễn)
 *   Nếu không sửa   : phải trả travelMin/Max + surveyFee
 */

'use strict';

const _BD_IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
// Base path cho fetch — trang pages/public/ dùng '../../', partials/ dùng '../'
const _BD_BASE = window.BD_BASE || '../../';

// ===================================================================
// SHARED: FORMAT + PRICING
// ===================================================================
function _bdFmt(n) {
    return Number(n).toLocaleString('vi-VN') + 'đ';
}

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
let _bdPendingCoords  = null;   // tọa độ chờ nếu user chọn map trước khi chọn dịch vụ

async function _bdGeocode(address) {
    const url = 'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({ q: address + ', TP.HCM, Việt Nam', format: 'json', limit: 1, countrycodes: 'vn' });
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
    const arr = await res.json();
    if (!arr.length) return null;
    return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

async function _bdRoadDist(pLat, pLng, cLat, cLng) {
    // OSRM dùng lng,lat (không phải lat,lng)
    const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${cLng},${cLat}?overview=false`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    return data.routes[0].distance / 1000; // meters → km
}

function _bdFeeFromDist(km, cfg) {
    let fee = Math.round(km * cfg.pricePerKm / 1000) * 1000; // làm tròn 1,000đ
    if (cfg.minFee) fee = Math.max(fee, cfg.minFee);
    if (cfg.maxFee) fee = Math.min(fee, cfg.maxFee);
    return fee;
}

function _bdRefreshBreakdown() {
    _bdUpdateBreakdown(_bdCurPrice, _bdTravelCfg, _bdCurSurvey);
}

function _bdStartTravelCalc() {
    if (!_bdTravelCfg || _bdTravelCfg.mode !== 'per_km') return;
    clearTimeout(_bdTravelTimer);
    const addr = document.getElementById('address')?.value?.trim();
    if (!addr) {
        _bdTravelStatus = 'idle'; _bdTravelAmt = 0; _bdTravelDistKm = 0;
        _bdRefreshBreakdown(); return;
    }
    _bdTravelStatus = 'loading';
    _bdRefreshBreakdown();
    _bdTravelTimer = setTimeout(_bdDoTravelCalc, 800);
}

async function _bdDoTravelCalc() {
    if (!_bdTravelCfg) return;
    const addr = document.getElementById('address')?.value?.trim();
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

// Gọi khi chọn dịch vụ mới — lưu state và render
function _bdSetBreakdown(price, travelFee, surveyFee) {
    _bdCurPrice  = price || 0;
    _bdCurSurvey = surveyFee || null;
    const isPerKm = travelFee && travelFee.mode === 'per_km';
    _bdTravelCfg    = isPerKm ? travelFee : null;
    _bdTravelStatus = isPerKm ? 'idle' : 'na';
    _bdTravelAmt    = 0; _bdTravelDistKm = 0;
    clearTimeout(_bdTravelTimer);
    _bdUpdateBreakdown(price, travelFee, surveyFee);
    // Nếu đã có tọa độ từ map picker → tính ngay (bỏ qua geocode)
    if (isPerKm && _bdPendingCoords) {
        _bdTravelFromCoords(_bdPendingCoords.lat, _bdPendingCoords.lng);
    } else {
        // Nếu đã có địa chỉ nhập tay → tính ngay
        const addr = document.getElementById('address')?.value?.trim();
        if (isPerKm && addr) _bdStartTravelCalc();
    }
}

// Gắn listener địa chỉ — gọi 1 lần sau khi form có trong DOM
function _bdSetupAddressListener() {
    const addrEl = document.getElementById('address');
    if (!addrEl || addrEl._bdListened) return;
    addrEl._bdListened = true;
    addrEl.addEventListener('input', _bdStartTravelCalc);
}

// Dùng chung cho cả modal và standalone (cùng ID trong DOM)
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

    if (bdService) bdService.textContent = _bdFmt(price);

    // Hàng phí di chuyển
    if (isPerKm) {
        if (bdTravelRow) bdTravelRow.style.removeProperty('display');
        if (bdTravel) {
            if (_bdTravelStatus === 'loading') {
                bdTravel.innerHTML = '<span class="spinner-border spinner-border-sm me-1" style="width:11px;height:11px;border-width:2px;vertical-align:middle;"></span><em class="text-muted" style="font-size:0.82rem;">Đang tính...</em>';
            } else if (_bdTravelStatus === 'ok') {
                bdTravel.textContent = `${_bdFmt(_bdTravelAmt)} (~${_bdTravelDistKm.toFixed(1)} km)`;
            } else if (_bdTravelStatus === 'error') {
                bdTravel.innerHTML = '<span style="color:#ef4444;font-size:0.82rem;">Không tính được — thử lại sau</span>';
            } else { // idle
                bdTravel.innerHTML = '<em class="text-muted" style="font-size:0.82rem;">Nhập địa chỉ để tính phí</em>';
            }
        }
    } else {
        const tMax = effectiveTf ? (effectiveTf.max ?? effectiveTf.fixedAmount ?? 0) : 0;
        const tMin = effectiveTf ? (effectiveTf.min ?? effectiveTf.fixedAmount ?? 0) : 0;
        if (tMax > 0 && bdTravelRow && bdTravel) {
            bdTravelRow.style.removeProperty('display');
            bdTravel.textContent = tMin === tMax ? _bdFmt(tMin) : `${_bdFmt(tMin)} – ${_bdFmt(tMax)}`;
        } else if (bdTravelRow) {
            bdTravelRow.style.setProperty('display', 'none', 'important');
        }
    }

    // Tổng
    if (bdTotal) {
        if (isPerKm && _bdTravelStatus !== 'ok') {
            bdTotal.innerHTML = `${_bdFmt(price)} <span style="color:#94a3b8;font-size:0.82rem;">+ phí di chuyển</span>`;
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

function _bdHideBreakdown(clearCoords) {
    const wrap = document.getElementById('pricingBreakdownWrap');
    if (wrap) wrap.style.display = 'none';
    _bdTravelCfg = null; _bdTravelStatus = 'na';
    _bdTravelAmt = 0; _bdTravelDistKm = 0;
    if (clearCoords) _bdPendingCoords = null;
    clearTimeout(_bdTravelTimer);
}

// ===================================================================
// SHARED: MEDIA CAPTURE
// ===================================================================
let _bdMediaFiles = [];

function _bdSetupMedia() {
    const photoInput = document.getElementById('mediaPhotoInput');
    const videoInput = document.getElementById('mediaVideoInput');
    const photoBtn   = document.getElementById('photoCaptureBtn');
    const videoBtn   = document.getElementById('videoCaptureBtn');
    const previewBox = document.getElementById('mediaPreviewContainer');
    if (!photoInput || !videoInput) return;

    photoBtn && photoBtn.addEventListener('click', () => photoInput.click());
    videoBtn && videoBtn.addEventListener('click', () => videoInput.click());

    photoInput.addEventListener('change', function () {
        Array.from(this.files).forEach(f => _bdAddMedia(f, previewBox));
        this.value = '';
    });
    videoInput.addEventListener('change', function () {
        Array.from(this.files).forEach(f => _bdAddMedia(f, previewBox));
        this.value = '';
    });
}

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
    if (previewBox) {
        previewBox.appendChild(wrap);
        const box = document.getElementById('mediaPreviewBox');
        if (box) box.style.display = 'block';
    }
}

function _bdClearMedia() {
    _bdMediaFiles = [];
    const grid = document.getElementById('mediaPreviewContainer');
    if (grid) grid.innerHTML = '';
    const box = document.getElementById('mediaPreviewBox');
    if (box) box.style.display = 'none';
}

// ===================================================================
// SHARED: CONFIRM SCREEN — điền dữ liệu vào bảng xác nhận
// ===================================================================
function _bdFillConfirm(name, phone, service, address, noteRaw) {
    // Thông tin khách hàng
    const cfName = document.getElementById('cf-name');
    const cfPhone = document.getElementById('cf-phone');
    const cfAddr = document.getElementById('cf-address');
    const cfSvc = document.getElementById('cf-service');
    if (cfName)  cfName.textContent  = name;
    if (cfPhone) cfPhone.textContent = phone;
    if (cfAddr)  cfAddr.textContent  = address;
    if (cfSvc)   cfSvc.textContent   = service;

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

    if (basePrice > 0 && costSection) {
        costSection.style.display = '';

        // Giá dịch vụ
        if (costBase) costBase.textContent = _bdFmt(basePrice);

        // Phí di chuyển
        if (costTravelRow && costTravel) {
            if (isPerKm) {
                costTravelRow.style.display = '';
                if (travelOk) {
                    costTravel.textContent = `${_bdFmt(_bdTravelAmt)} (~${_bdTravelDistKm.toFixed(1)} km)`;
                } else if (_bdTravelStatus === 'loading') {
                    costTravel.innerHTML = '<em style="color:#94a3b8;font-size:0.82rem;">Đang tính...</em>';
                } else {
                    costTravel.innerHTML = '<em style="color:#94a3b8;font-size:0.82rem;">Chưa xác định</em>';
                }
            } else {
                costTravelRow.style.display = 'none';
            }
        }

        // Phí khảo sát
        if (costSurveyRow && costSurvey) {
            if (survey > 0) {
                costSurveyRow.style.display = '';
                costSurvey.textContent = _bdFmt(survey) + ' (nếu không sửa)';
            } else {
                costSurveyRow.style.display = 'none';
            }
        }

        // Tổng
        if (costTotal) {
            const travel = travelOk ? _bdTravelAmt : 0;
            const total  = basePrice + travel;
            if (isPerKm && !travelOk) {
                costTotal.innerHTML = `${_bdFmt(basePrice)} <span style="font-size:0.78rem;font-weight:500;color:#94a3b8;">+ phí di chuyển</span>`;
            } else {
                costTotal.textContent = _bdFmt(total);
            }
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
async function _bdSubmitApi(pendingData, submitBtn, onSuccess) {
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';
    const resetBtn = () => {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận';
    };

    try {
        const res  = await fetch(_BD_BASE + 'api/public/book.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingData)
        });
        const data = await res.json();
        if (data.status === 'success') {
            onSuccess(data.order_code || null);
        } else {
            if (_BD_IS_LOCAL) {
                alert('❌ ' + (data.message || 'Có lỗi xảy ra, vui lòng thử lại!'));
                resetBtn();
            } else {
                onSuccess(null);
            }
        }
    } catch {
        if (_BD_IS_LOCAL) {
            alert('❌ Không thể kết nối server. Vui lòng thử lại sau!');
            resetBtn();
        } else {
            alert('✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.\n\n📞 Hotline: 0775 472 347');
            onSuccess(null);
        }
    }
}

// ===================================================================
// SHARED: BUILD PENDING DATA từ form
// ===================================================================
function _bdBuildPendingData(service) {
    let noteVal = (document.getElementById('note')?.value || '').trim();
    if (_bdMediaFiles.length > 0) {
        const imgs  = _bdMediaFiles.filter(m => m.file.type.startsWith('image/')).length;
        const vids  = _bdMediaFiles.filter(m => m.file.type.startsWith('video/')).length;
        const parts = [];
        if (imgs > 0) parts.push(`${imgs} ảnh`);
        if (vids > 0) parts.push(`${vids} video`);
        noteVal = (noteVal ? noteVal + '\n' : '') + `[Đính kèm: ${parts.join(', ')}]`;
    }
    const priceRaw = Number((document.getElementById('servicePrice')?.value || '').replace(/[^\d]/g, '')) || 0;
    const activeBrand  = document.querySelector('#bookingModal .brand-option.active, .booking-form-section .brand-option.active');
    return {
        name:            (document.getElementById('name')?.value  || '').trim(),
        phone:           (document.getElementById('phone')?.value || '').trim(),
        service_id:      service,
        address:         (document.getElementById('address')?.value || '').trim(),
        note:            noteVal,
        selected_brand:  activeBrand ? activeBrand.dataset.brand : null,
        estimated_price: priceRaw
    };
}

// ===================================================================
// SHARED: VALIDATE COMMON FIELDS (name, phone, address)
// ===================================================================
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
// MODAL MODE — LAZY LOAD + FORM INIT
// ===================================================================
let _bdModalPromise = null;
let _bdModalReady   = false;
let _bdOpenMode     = 'detail'; // 'detail' | 'nav'
let _bdPrefill      = null;     // { name, price, travelFee, surveyFee }
let _bdPendingData  = null;

// Load services.json cho nav mode dropdown
let _bdNavServices  = null;
async function _bdLoadNavServices() {
    const mainSel = document.getElementById('sdMainService');
    if (!mainSel || mainSel.options.length > 1) return;
    if (!_bdNavServices) {
        try {
            const r = await fetch(_BD_BASE + 'data/services.json');
            _bdNavServices = await r.json();
        } catch { _bdNavServices = []; }
    }
    _bdNavServices.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id; opt.textContent = cat.name;
        mainSel.appendChild(opt);
    });
    mainSel.addEventListener('change', () => {
        const subSel = document.getElementById('sdSubService');
        if (!subSel) return;
        subSel.innerHTML = '<option value="">-- Chọn dịch vụ chi tiết --</option>';
        const cat = _bdNavServices.find(c => c.id == mainSel.value); // loose ==
        if (!cat) { subSel.disabled = true; _bdHideBreakdown(); return; }
        cat.items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = item.name + (item.price ? ` – ${Number(item.price).toLocaleString('vi-VN')}đ` : '');
            subSel.appendChild(opt);
        });
        subSel.disabled = false;
        _bdHideBreakdown();
    });

    // Hiển thị giá + tính phí di chuyển khi chọn dịch vụ cụ thể
    const _subSel = document.getElementById('sdSubService');
    if (_subSel) {
        _subSel.addEventListener('change', function () {
            const cat = _bdNavServices.find(c => c.id == mainSel.value);
            if (!cat) { _bdHideBreakdown(); return; }
            const item = cat.items.find(i => i.name === this.value);
            if (!item) { _bdHideBreakdown(); return; }
            const priceEl = document.getElementById('servicePrice');
            if (priceEl) priceEl.value = item.price > 0 ? Number(item.price).toLocaleString('vi-VN') + 'đ' : '';
            _bdSetBreakdown(item.price || 0, item.travelFee || cat.travelFee || null, item.surveyFee || null);
        });
    }
}

// Gắn tất cả event handlers sau khi modal HTML có trong DOM
function _bdInitModalHandlers() {
    _bdSetupMedia();
    _bdSetupAddressListener();

    // Form submit → validate → show confirm
    const form = document.getElementById('bookingForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Lấy tên dịch vụ tuỳ theo mode
        let service = '';
        if (_bdOpenMode === 'nav') {
            const sdMain = document.getElementById('sdMainService');
            const sdSub  = document.getElementById('sdSubService');
            service = sdSub ? sdSub.value.trim() : '';
            if (!sdMain?.value || !service) {
                alert('Vui lòng chọn loại dịch vụ và dịch vụ cụ thể!');
                return;
            }
        } else {
            service = (document.getElementById('selectedService')?.value || '').trim();
        }

        const data = _bdBuildPendingData(service);
        if (!_bdValidateCommon(data)) return;

        _bdPendingData = data;
        _bdFillConfirm(data.name, data.phone, data.service_id, data.address, (document.getElementById('note')?.value || '').trim());
        form.style.display = 'none';
        document.getElementById('bookingConfirm').style.display = '';
    });

    // Quay lại form
    document.getElementById('confirmBackBtn')?.addEventListener('click', () => {
        document.getElementById('bookingConfirm').style.display = 'none';
        form.style.display = '';
        _bdPendingData = null;
    });

    // Xác nhận → gọi API
    const confirmBtn = document.getElementById('confirmSubmitBtn');
    confirmBtn?.addEventListener('click', async function () {
        if (!_bdPendingData) return;
        await _bdSubmitApi(_bdPendingData, this, (orderCode) => {
            alert(orderCode ? `✅ Đặt lịch thành công! Mã đơn: ${orderCode}` : '✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại sớm nhất.');
            const inst = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
            if (inst) inst.hide();
        });
    });

    // Reset toàn bộ khi đóng modal
    document.getElementById('bookingModal')?.addEventListener('hidden.bs.modal', () => {
        form.reset();
        form.style.display = '';
        const confirm = document.getElementById('bookingConfirm');
        if (confirm) confirm.style.display = 'none';
        _bdHideBreakdown(true); // full reset — clear pending coords too
        _bdClearMedia();
        _bdPendingData = null;
        _bdPrefill = null;
    });
}

// Lazy-load modal HTML (gọi 1 lần, sau đó cache)
async function _bdLoadModal() {
    if (_bdModalPromise) return _bdModalPromise;
    _bdModalPromise = (async () => {
        if (document.getElementById('bookingModal')) { _bdModalReady = true; return; }
        try {
            const res = await fetch(_BD_BASE + 'partials/dat-lich-chi-tiet.html');
            if (!res.ok) throw new Error('fetch failed');
            const container = document.getElementById('booking-modal-container');
            if (container) container.innerHTML = await res.text();
            else document.body.insertAdjacentHTML('beforeend', await res.text());
        } catch (err) {
            console.error('[booking-detail] Không thể tải modal đặt lịch:', err);
            return;
        }
        _bdInitModalHandlers();
        _bdModalReady = true;
    })();
    return _bdModalPromise;
}

// Mở modal với mode và prefill info
async function _bdOpenModal(mode, prefill) {
    _bdOpenMode = mode || 'detail';
    _bdPrefill  = prefill || null;
    await _bdLoadModal();

    const modalEl = document.getElementById('bookingModal');
    if (!modalEl) return;

    const navModeEl    = document.getElementById('sdNavMode');
    const detailModeEl = document.getElementById('sdDetailMode');

    if (_bdOpenMode === 'nav') {
        if (navModeEl)    navModeEl.style.display    = '';
        if (detailModeEl) detailModeEl.style.display = 'none';
        await _bdLoadNavServices();
    } else {
        if (navModeEl)    navModeEl.style.display    = 'none';
        if (detailModeEl) detailModeEl.style.display = '';
        if (prefill) {
            const selEl   = document.getElementById('selectedService');
            const priceEl = document.getElementById('servicePrice');
            if (selEl)   selEl.value   = prefill.name  || '';
            if (priceEl) priceEl.value = prefill.price ? Number(prefill.price).toLocaleString('vi-VN') + 'đ' : '';
            if (prefill.price) {
                _bdSetBreakdown(parseInt(prefill.price) || 0, prefill.travelFee || null, prefill.surveyFee || null);
            }
        }
    }

    // Dùng getInstance trước để tránh tạo trùng
    const existing = bootstrap.Modal.getInstance(modalEl);
    if (existing) existing.show();
    else new bootstrap.Modal(modalEl).show();
}

// ===================================================================
// CARD BRAND SELECTION — service-detail.php (page-level, không phải trong modal)
// ===================================================================
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.brand-option');
    // Chỉ xử lý brand option TRÊN CARD (không phải trong modal)
    if (!btn || btn.closest('#bookingModal')) return;
    const card = btn.closest('.service-item-card');
    if (!card) return;

    card.querySelectorAll('.brand-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const price   = parseInt(btn.dataset.price);
    const matCost = parseInt(btn.dataset.materialCost) || 0;
    let travelFee = null, surveyFee = null;
    try { travelFee = btn.dataset.travelFee ? JSON.parse(btn.dataset.travelFee) : null; } catch (_) {}
    try { surveyFee = btn.dataset.surveyFee ? JSON.parse(btn.dataset.surveyFee) : null; } catch (_) {}

    const fmtN = n => parseInt(n).toLocaleString('vi-VN');

    const totalEl = card.querySelector('.sic-total-price');
    if (totalEl) totalEl.textContent = fmtN(price) + 'đ';

    const matEl = card.querySelector('.sic-bd-material');
    if (matEl && matCost) matEl.innerHTML = `<i class="fas fa-box"></i> Vật liệu: ${fmtN(matCost)}đ`;

    // Rebuild fee breakdown trong card
    const feeDiv = card.querySelector('.sic-fee-breakdown');
    if (feeDiv) {
        const isPerKm  = travelFee && travelFee.mode === 'per_km';
        const survey   = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;
        const hasFees  = isPerKm || (travelFee && (travelFee.min > 0 || travelFee.max > 0 || travelFee.fixedAmount > 0)) || survey > 0;
        if (hasFees) {
            let travelRow = '';
            if (isPerKm) {
                travelRow = `<div style="display:flex;justify-content:space-between;color:#64748b;margin-bottom:3px;"><span><i class="fas fa-motorcycle me-1"></i>Phí di chuyển</span><span style="font-size:0.82rem;color:#94a3b8;">theo km (tính khi đặt)</span></div>`;
            } else if (travelFee) {
                const tMin = travelFee.min ?? travelFee.fixedAmount ?? 0;
                const tMax = travelFee.max ?? travelFee.fixedAmount ?? 0;
                if (tMax > 0) travelRow = `<div style="display:flex;justify-content:space-between;color:#64748b;margin-bottom:3px;"><span><i class="fas fa-motorcycle me-1"></i>Phí di chuyển</span><span>${tMin === tMax ? fmtN(tMin)+'đ' : fmtN(tMin)+'đ – '+fmtN(tMax)+'đ'}</span></div>`;
            }
            const surveyRow = survey > 0
                ? `<div style="display:flex;justify-content:space-between;color:#b45309;margin-bottom:3px;"><span><i class="fas fa-clipboard-check me-1"></i>Phí khảo sát</span><span>${fmtN(survey)}đ</span></div>` : '';
            const totalText = isPerKm
                ? `${fmtN(price)}đ <span style="color:#94a3b8;font-size:0.82rem;">+ phí di chuyển</span>`
                : fmtN(price + (travelFee?.min ?? travelFee?.fixedAmount ?? 0)) + 'đ';
            feeDiv.innerHTML = travelRow + surveyRow
                + `<div style="display:flex;justify-content:space-between;font-weight:600;color:var(--primary);border-top:1px dashed rgba(17,153,142,0.3);margin-top:5px;padding-top:5px;"><span>Tổng tạm tính:</span><span>${totalText}</span></div>`;
        }
    }

    // Cập nhật data-service-price trên nút đặt lịch
    const bookBtn = card.querySelector('.booking-btn');
    if (bookBtn) bookBtn.dataset.servicePrice = price;
});

// ===================================================================
// CLICK DELEGATION — lazy-load + mở modal
// ===================================================================
document.addEventListener('click', async function (e) {
    // Nút "Đặt lịch" trên từng card dịch vụ
    const bookBtn = e.target.closest('.booking-btn');
    if (bookBtn) {
        e.preventDefault();
        const card = bookBtn.closest('.service-item-card');
        // Không có .service-item-card (vd: trang dich-vu.html) → nav mode
        if (!card) {
            await _bdOpenModal('nav', null);
            return;
        }
        // service-detail.php: có price + travelFee → detail mode
        const activeBrand = card.querySelector('.brand-option.active');
        const svcName     = bookBtn.getAttribute('data-service-name') || '';
        const displayName = activeBrand ? `${svcName} (${activeBrand.dataset.brand})` : svcName;
        let travelFee = null, surveyFee = null;
        try { travelFee = bookBtn.dataset.travelFee ? JSON.parse(bookBtn.dataset.travelFee) : null; } catch (_) {}
        try { surveyFee = bookBtn.dataset.surveyFee ? JSON.parse(bookBtn.dataset.surveyFee) : null; } catch (_) {}
        await _bdOpenModal('detail', {
            name:      displayName,
            price:     bookBtn.getAttribute('data-service-price'),
            travelFee, surveyFee
        });
        return;
    }

    // Nút "Đặt Lịch" trên navbar → NAV MODE (chỉ intercept khi modal chưa tồn tại)
    const navBtn = e.target.closest('[data-bs-target="#bookingModal"]');
    if (navBtn && !document.getElementById('bookingModal')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        await _bdOpenModal('nav', null);
    }
});

// ===================================================================
// scrollToServices — dùng cho onclick="scrollToServices()" trong PHP
// ===================================================================
function scrollToServices() {
    const first = document.querySelector('.service-item-card');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================================================================
// STANDALONE MODE — dat-lich.html
// ===================================================================
function _bdInitStandalone() {
    _bdSetupMedia();
    _bdSetupAddressListener();

    // Load services.json vào dropdown
    _bdLoadStandaloneServices();

    const form = document.getElementById('bookingForm');
    if (!form) return;

    let _stPendingData = null;

    // Submit → validate → confirm
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const mainSel = document.getElementById('mainService');
        const subSel  = document.getElementById('subService');
        const service = (subSel?.value || '').trim();

        if (!mainSel?.value) { alert('Vui lòng chọn loại dịch vụ!'); return; }
        if (!service)        { alert('Vui lòng chọn dịch vụ cụ thể!'); return; }

        const data = _bdBuildPendingData(service);
        if (!_bdValidateCommon(data)) return;

        _stPendingData = data;
        _bdFillConfirm(data.name, data.phone, data.service_id, data.address, (document.getElementById('note')?.value || '').trim());
        form.style.display = 'none';
        document.getElementById('bookingConfirm').style.display = '';
    });

    // Quay lại
    document.getElementById('confirmBackBtn')?.addEventListener('click', () => {
        document.getElementById('bookingConfirm').style.display = 'none';
        form.style.display = '';
        _stPendingData = null;
    });

    // Xác nhận → API
    const confirmBtn = document.getElementById('confirmSubmitBtn');
    confirmBtn?.addEventListener('click', async function () {
        if (!_stPendingData) return;
        await _bdSubmitApi(_stPendingData, this, (orderCode) => {
            alert(orderCode ? `✅ Đặt lịch thành công! Mã đơn: ${orderCode}` : '✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại sớm nhất.');
            form.reset();
            form.style.display = '';
            const confirm = document.getElementById('bookingConfirm');
            if (confirm) confirm.style.display = 'none';
            _bdHideBreakdown(true);
            _bdClearMedia();
            _stPendingData = null;
        });
    });
}

async function _bdLoadStandaloneServices() {
    const mainSel     = document.getElementById('mainService');
    const subSel      = document.getElementById('subService');
    const subBtns     = document.getElementById('subServiceBtns');
    const subWrap     = document.getElementById('subServiceWrap');
    const subPh       = document.getElementById('subServicePlaceholder');
    if (!mainSel) return;

    let services = [];
    try {
        const r = await fetch(_BD_BASE + 'data/services.json');
        services = await r.json();
    } catch { services = []; }

    services.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id; opt.textContent = cat.name;
        mainSel.appendChild(opt);
    });

    // Detect UI style: button-group (partials/dat-lich.html) vs regular select
    const useButtons = !!subBtns;

    function _renderSubBtns(items, catData) {
        subBtns.innerHTML = '';
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sub-service-btn';
            btn.textContent = item.name + (item.price ? ` – ${Number(item.price).toLocaleString('vi-VN')}đ` : '');
            btn.addEventListener('click', () => {
                // Single-select trong standalone mode
                subBtns.querySelectorAll('.sub-service-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (subSel) subSel.value = item.name;
                const priceEl = document.getElementById('servicePrice');
                const price = item.price || 0;
                if (priceEl) priceEl.value = price > 0 ? Number(price).toLocaleString('vi-VN') + 'đ' : '';
                _bdSetBreakdown(price, item.travelFee || catData.travelFee || null, item.surveyFee || catData.surveyFee || null);
            });
            subBtns.appendChild(btn);
        });
        if (subWrap) subWrap.style.display = '';
        if (subPh)   subPh.classList.add('d-none');
        if (subSel)  { subSel.value = ''; }
        _bdHideBreakdown();
    }

    function _hideSubBtns() {
        if (subWrap) subWrap.style.display = 'none';
        if (subBtns) subBtns.innerHTML = '';
        if (subPh)   subPh.classList.remove('d-none');
        if (subSel)  subSel.value = '';
        _bdHideBreakdown();
    }

    mainSel.addEventListener('change', function () {
        const cat = services.find(c => c.id == this.value); // loose ==
        if (useButtons) {
            if (!cat) { _hideSubBtns(); return; }
            _renderSubBtns(cat.items, cat);
        } else {
            if (subSel) {
                subSel.innerHTML = '<option value="">-- Chọn dịch vụ chi tiết --</option>';
                subSel.disabled = !cat;
            }
            if (!cat) { _bdHideBreakdown(); return; }
            cat.items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = item.name + (item.price ? ` – ${Number(item.price).toLocaleString('vi-VN')}đ` : '');
                subSel && subSel.appendChild(opt);
            });
        }
    });

    if (!useButtons && subSel) {
        subSel.addEventListener('change', function () {
            const mainCat = services.find(c => c.id == mainSel.value); // loose ==
            if (!mainCat) return;
            const item = mainCat.items.find(i => i.name === this.value);
            const priceEl = document.getElementById('servicePrice');
            if (!item) { if (priceEl) priceEl.value = ''; _bdHideBreakdown(); return; }
            const price = item.price || 0;
            if (priceEl) priceEl.value = price > 0 ? Number(price).toLocaleString('vi-VN') + 'đ' : '';
            _bdSetBreakdown(price, item.travelFee || mainCat.travelFee || null, item.surveyFee || mainCat.surveyFee || null);
        });
    }

    // Prefill từ URL param ?service=TênDịchVụ
    const params = new URLSearchParams(window.location.search);
    const svcParam = params.get('service');
    if (svcParam) {
        const decoded = decodeURIComponent(svcParam);
        for (const cat of services) {
            const item = cat.items.find(i => i.name === decoded);
            if (item) {
                mainSel.value = cat.id;
                mainSel.dispatchEvent(new Event('change'));
                setTimeout(() => {
                    if (useButtons && subBtns) {
                        const target = Array.from(subBtns.querySelectorAll('.sub-service-btn'))
                            .find(b => b.textContent.startsWith(item.name));
                        if (target) target.click();
                    } else if (subSel) {
                        subSel.value = item.name;
                        subSel.dispatchEvent(new Event('change'));
                    }
                }, 0);
                break;
            }
        }
    }
}

// ===================================================================
// AUTO-DETECT và KHỞI CHẠY
// ===================================================================
if (document.body.classList.contains('dat-lich-standalone')) {
    // Standalone mode: form đã có trong trang
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bdInitStandalone);
    } else {
        _bdInitStandalone();
    }
}
// Modal mode: không preload, chờ click
