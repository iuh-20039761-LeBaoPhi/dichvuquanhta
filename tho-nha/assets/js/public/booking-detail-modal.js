/**
 * booking-detail-modal.js
 * Modal mode handlers: lazy-load modal HTML, nav/detail mode setup, and modal form events.
 */

'use strict';

// ===================================================================
// MODAL MODE — LAZY LOAD + FORM INIT
// ===================================================================
let _bdModalPromise = null;
let _bdModalReady   = false;
let _bdOpenMode     = 'detail'; // 'detail' | 'nav'
let _bdPrefill      = null;     // { name, price, travelFee, surveyFee }
let _bdPendingData  = null;

// Load services.json cho nav mode (modal)
let _bdNavServices  = null;
async function _bdLoadNavServices() {
    const mainSel = document.getElementById('loaidichvunav');
    if (!mainSel || mainSel.options.length > 1) return;
    if (!_bdNavServices) {
        try {
            await new Promise(r => {
                if (window.DVQTKrud) r();
                else {
                    const check = setInterval(() => {
                        if (window.DVQTKrud) { clearInterval(check); r(); }
                    }, 100);
                }
            });
            const krud = window.DVQTKrud;
            const [cats, svcs] = await Promise.all([
                krud.listTable('danhmuc_thonha', { limit: 100 }),
                krud.listTable('dichvu_thonha', { limit: 1000 })
            ]);
            
            _bdNavServices = cats.map(c => ({
                id: c.id,
                name: c.ten_danhmuc,
                items: svcs.filter(s => String(s.id_danhmuc) === String(c.id)).map(s => ({
                    id: s.id,
                    name: s.ten_dichvu,
                    price: Number(s.gia_dichvu) || 0,
                    // Giả định các config này sẽ được lấy từ bảng dịch vụ trong tương lai
                    travelFee: { mode: 'fixed', amount: 30000, min: 20000, max: 150000 },
                    surveyFee: { required: false, amount: 50000 }
                }))
            }));
        } catch (err) {
            console.error('Failed to load DB services:', err);
            _bdNavServices = [];
        }
    }
    _bdNavServices.forEach(cat => {
        if (cat.items.length === 0) return; // Không hiện danh mục rỗng
        const opt = document.createElement('option');
        opt.value = cat.id; opt.textContent = cat.name;
        mainSel.appendChild(opt);
    });

    const subBtnsEl  = document.getElementById('sdSubServiceBtns');
    const subHidden  = document.getElementById('dichvucuthenav');
    const subWrap    = document.getElementById('sdSubServiceWrap');
    const subCountEl = document.getElementById('sdSubServiceCount');
    const priceEl    = document.getElementById('giadichvu');

    mainSel.addEventListener('change', () => {
        const cat = _bdNavServices.find(c => c.id == mainSel.value);
        if (!cat || !subBtnsEl) {
            if (subWrap) subWrap.style.display = 'none';
            if (typeof _bdClearBrandSelectorUi === 'function') _bdClearBrandSelectorUi();
            _bdHideBreakdown();
            return;
        }
        _bdBuildSubBtns(subBtnsEl, subHidden, cat.items, cat, subCountEl, priceEl);
        if (subWrap) subWrap.style.display = '';
        _bdHideBreakdown();
    });
}

// Gắn tất cả event handlers sau khi modal HTML có trong DOM
function _bdInitModalHandlers() {
    _bdSetupMedia();
    _bdSetupAddressListener();
    _bdPrepareBookingAuthState();

    // Form submit → validate → show confirm
    const form = document.getElementById('bookingForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!_bdRequireCustomerLogin()) return;

        // Lấy tên dịch vụ tuỳ theo mode
        let service = '';
        if (_bdOpenMode === 'nav') {
            const sdMain = document.getElementById('loaidichvunav');
            const sdSub  = document.getElementById('dichvucuthenav');
            service = sdSub ? sdSub.value.trim() : '';
            if (!sdMain?.value || !service) {
                alert('Vui lòng chọn loại dịch vụ và dịch vụ cụ thể!');
                return;
            }
        } else {
            service = (document.getElementById('dichvudachon')?.value || '').trim();
        }

        const data = _bdBuildPendingData(service);
        if (!_bdValidateCommon(data)) return;

        _bdPendingData = data;
        _bdFillConfirm(data.name, data.phone, data.service_id, data.address, (document.getElementById('ghichu')?.value || '').trim());
        form.style.display = 'none';
        document.getElementById('bookingConfirm').style.display = '';
    });

    // Quay lại form
    document.getElementById('btnquaylai')?.addEventListener('click', () => {
        document.getElementById('bookingConfirm').style.display = 'none';
        form.style.display = '';
        _bdPendingData = null;
    });

    // Xác nhận → gọi API
    const confirmBtn = document.getElementById('btnxacnhan');
    confirmBtn?.addEventListener('click', async function () {
        if (!_bdPendingData) return;
        if (!_bdRequireCustomerLogin()) return;
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
        // Reset sub-service buttons
        document.querySelectorAll('#bookingModal .sub-service-btn').forEach(b => b.classList.remove('active'));
        const sdSubHidden = document.getElementById('dichvucuthenav');
        if (sdSubHidden) sdSubHidden.value = '';
        const sdSubWrap = document.getElementById('sdSubServiceWrap');
        if (sdSubWrap) sdSubWrap.style.display = 'none';
        const sdMainSel = document.getElementById('loaidichvunav');
        if (sdMainSel) sdMainSel.value = '';
        const sdCount = document.getElementById('sdSubServiceCount');
        if (sdCount) { sdCount.textContent = ''; sdCount.style.display = 'none'; }
        if (typeof _bdClearBrandSelectorUi === 'function') _bdClearBrandSelectorUi();
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
            // Fix logo paths relative to current page (not partial file location)
            const modalLogoThoNha = document.getElementById('modalLogoThoNha');
            if (modalLogoThoNha) modalLogoThoNha.src = _BD_BASE + 'assets/images/tho-nha-logo-thuong-hieu-cropped.jpg';
            const modalLogoDVQT = document.getElementById('modalLogoDVQT');
            if (modalLogoDVQT) modalLogoDVQT.src = _BD_BASE + 'assets/images/logo-dich-vu-quanh-ta.jpg';
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
            const selEl   = document.getElementById('dichvudachon');
            const priceEl = document.getElementById('giadichvu');
            if (selEl)   selEl.value   = prefill.name  || '';
            if (priceEl) priceEl.value = prefill.price ? Number(prefill.price).toLocaleString('vi-VN') + 'đ' : '';
            if (prefill.price) {
                _bdSetBreakdown(parseInt(prefill.price) || 0, prefill.travelFee || null, prefill.surveyFee || null, prefill.catId || null, prefill.serviceId || null);
            }
        }
    }

    _bdPrepareBookingAuthState();

    // Dùng getInstance trước để tránh tạo trùng
    const existing = bootstrap.Modal.getInstance(modalEl);
    if (existing) existing.show();
    else new bootstrap.Modal(modalEl).show();
}

