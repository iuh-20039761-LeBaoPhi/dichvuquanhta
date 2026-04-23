/**
 * booking-detail-standalone.js
 * Standalone page handlers for dat-lich.html.
 */

'use strict';

function _bdScrollStandaloneTo(el) {
    if (!el) return;
    const navbar = document.querySelector('#header-container .navbar');
    const offset = (navbar?.offsetHeight || 0) + 8;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

// ===================================================================
// STANDALONE MODE — dat-lich.html
// ===================================================================
async function _bdInitStandalone() {
    _bdSetupMedia();
    _bdSetupAddressListener();
    await _bdPrepareBookingAuthState();

    // Load services.json vào dropdown
    _bdLoadStandaloneServices();

    const form = document.getElementById('bookingForm');
    if (!form) return;

    let _stPendingData = null;

    // Submit → validate → confirm (KHÔNG CẦN ĐĂNG NHẬP)
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        // Chỉ kiểm tra NCC tự đặt cho mình (không yêu cầu đăng nhập)
        if (typeof _bdRequireCustomerLogin === 'function') {
            if (!(await _bdRequireCustomerLogin())) return;
        }
        
        const mainSel = document.getElementById('loaidichvu');
        const subSel  = document.getElementById('dichvucuthe');
        const service = (subSel?.value || '').trim();

        if (!mainSel?.value) { _tnToast('Vui lòng chọn loại dịch vụ!', 'danger'); return; }
        if (!service)        { _tnToast('Vui lòng chọn dịch vụ cụ thể!', 'danger'); return; }

        const data = _bdBuildPendingData(service);
        if (!_bdValidateCommon(data)) return;

        _stPendingData = data;
        _bdFillConfirm(data.name, data.phone, data.service_id, data.address, (document.getElementById('ghichu')?.value || '').trim());
        form.style.display = 'none';
        const confirm = document.getElementById('bookingConfirm');
        if (confirm) {
            confirm.style.display = '';
            requestAnimationFrame(() => _bdScrollStandaloneTo(confirm));
        }
    });

    // Quay lại
    document.getElementById('btnquaylai')?.addEventListener('click', () => {
        document.getElementById('bookingConfirm').style.display = 'none';
        form.style.display = '';
        requestAnimationFrame(() => _bdScrollStandaloneTo(form));
        _stPendingData = null;
    });

    // Xác nhận → TẠO TÀI KHOẢN TỰ ĐỘNG → API
    const confirmBtn = document.getElementById('btnxacnhan');
    confirmBtn?.addEventListener('click', async function () {
        if (!_stPendingData) return;

        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';

        try {
            // BƯỚC 1: Tự động tạo tài khoản nếu chưa đăng nhập
            let accountResult = null;
            const isLoggedIn = await _bdIsCustomerLoggedIn();

            if (!isLoggedIn) {
                accountResult = await _bdAutoCreateOrFindAccount(
                    _stPendingData.name,
                    _stPendingData.phone
                );
                console.log('📝 Account result:', accountResult);
            }

            // BƯỚC 2: Gửi đơn đặt lịch
            await _bdSubmitApi(_stPendingData, btn, async (orderCode) => {
                // BƯỚC 3: Xử lý sau khi đặt lịch thành công
                if (accountResult && accountResult.isNew) {
                    // TÀI KHOẢN MỚI → Đăng nhập tự động và chuyển đến trang quản lý
                    try {
                        await DVQTApp.login(_stPendingData.phone, _stPendingData.phone);
                    } catch(_loginErr) {
                        console.warn('Auto-login failed:', _loginErr);
                    }
                    
                    await Swal.fire({
                        title: '<span style="color:#11998e">Đặt lịch thành công!</span>',
                        html: `<div style="text-align:left; line-height:1.8;">
                            <p><i class="fas fa-check-circle text-success me-1"></i> Mã đơn: <strong>${orderCode || 'Đang xử lý'}</strong></p>
                            <p><i class="fas fa-user-plus text-primary me-1"></i> Tài khoản đã được tạo tự động:</p>
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin:8px 0;">
                                <p style="margin:4px 0;"><strong>SĐT:</strong> ${_stPendingData.phone}</p>
                                <p style="margin:4px 0;"><strong>Mật khẩu:</strong> ${_stPendingData.phone} <small class="text-muted">(mặc định = SĐT)</small></p>
                            </div>
                            <p class="text-warning small"><i class="fas fa-shield-alt me-1"></i>Vui lòng đổi mật khẩu để bảo mật tài khoản.</p>
                        </div>`,
                        icon: 'success',
                        confirmButtonText: 'Xem đơn hàng của tôi',
                        confirmButtonColor: '#11998e',
                        allowOutsideClick: false
                    });
                    
                    // Chuyển đến trang quản lý đơn hàng
                    const root = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : '';
                    window.location.href = root + '/tho-nha/pages/customer/trang-ca-nhan.html';

                } else if (accountResult && accountResult.accountExists) {
                    // SĐT ĐÃ TỒN TẠI → Thông báo, đặt lịch thành công nhưng KHÔNG đăng nhập
                    await Swal.fire({
                        title: '<span style="color:#11998e">Đặt lịch thành công!</span>',
                        html: `<div style="text-align:left; line-height:1.8;">
                            <p><i class="fas fa-check-circle text-success me-1"></i> Mã đơn: <strong>${orderCode || 'Đang xử lý'}</strong></p>
                            <p><i class="fas fa-info-circle text-warning me-1"></i> SĐT <strong>${_stPendingData.phone}</strong> đã có tài khoản trong hệ thống.</p>
                            <p class="small text-muted">Vui lòng <a href="${_bdGetCustomerLoginUrl()}">đăng nhập</a> để xem và quản lý đơn hàng.</p>
                        </div>`,
                        icon: 'success',
                        confirmButtonText: 'Đóng',
                        confirmButtonColor: '#11998e'
                    });

                    // Reset form
                    _bdResetBookingForm(form);
                    _stPendingData = null;

                } else {
                    // Đã đăng nhập sẵn → Thông báo bình thường
                    await Swal.fire({
                        title: '<span style="color:#11998e">Đặt lịch thành công!</span>',
                        html: `Mã đơn: <strong>${orderCode || 'Đang xử lý'}</strong><br>Chúng tôi sẽ liên hệ lại sớm nhất.`,
                        icon: 'success',
                        confirmButtonText: 'Xem đơn hàng',
                        confirmButtonColor: '#11998e'
                    });

                    const root = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : '';
                    window.location.href = root + '/tho-nha/pages/customer/trang-ca-nhan.html';
                }
            });
        } catch (err) {
            console.error('Booking error:', err);
            Swal.fire({
                title: 'Lỗi',
                text: err?.message || 'Không thể đặt lịch. Vui lòng thử lại.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận';
        }
    });
}

// Helper: Reset form về trạng thái ban đầu
function _bdResetBookingForm(form) {
    if (!form) return;
    form.reset();
    form.style.display = '';
    const confirm = document.getElementById('bookingConfirm');
    if (confirm) confirm.style.display = 'none';
    const subWrap = document.getElementById('subServiceWrap');
    if (subWrap) subWrap.style.display = 'none';
    const subBtns = document.getElementById('subServiceBtns');
    if (subBtns) subBtns.innerHTML = '';
    const subCount = document.getElementById('subServiceCount');
    if (subCount) { subCount.textContent = ''; subCount.style.display = 'none'; }
    const subHidden = document.getElementById('dichvucuthe');
    if (subHidden) subHidden.value = '';
    if (typeof _bdClearBrandSelectorUi === 'function') _bdClearBrandSelectorUi();
    _bdHideBreakdown(true);
    _bdClearMedia();
}

async function _bdLoadStandaloneServices() {
    const mainSel     = document.getElementById('loaidichvu');
    const subSel      = document.getElementById('dichvucuthe');
    const subBtns     = document.getElementById('subServiceBtns');
    const subWrap     = document.getElementById('subServiceWrap');
    const subPh       = document.getElementById('subServicePlaceholder');
    const brandWrap   = document.getElementById('brandSelectorWrap');
    const brandBox    = document.getElementById('brandOptionsContainer');
    if (!mainSel) return;

    let services = [];
    try {
        const krud = window.DVQTKrud;
        if (!krud) throw new Error('KRUD not found');

        // 1. Tải danh mục và dịch vụ từ Database
        const [cats, svcs] = await Promise.all([
            krud.listTable('danhmuc_thonha', { limit: 100, filter: "trang_thai='active'", sort: 'thu_tu ASC' }),
            krud.listTable('dichvu_thonha',  { limit: 1000, filter: "trang_thai='active'" })
        ]);

        // 2. Map dữ liệu về cấu trúc cũ để tương thích với logic giao diện
        services = cats.map(cat => {
            const catItems = svcs.filter(s => String(s.id_danhmuc) === String(cat.id)).map(s => ({
                id:           s.id,
                name:         s.ten_dichvu,
                price:        Number(s.gia_co_ban || 0),
                desc:         s.mo_ta,
                surveyFee:    s.phi_khao_sat ? { amount: Number(s.phi_khao_sat), required: String(s.yeu_cau_khao_sat) === '1' } : null,
                travelFee:    null // Sẽ lấy mặc định từ hệ thống hoặc cat
            }));

            return {
                id: cat.id,
                name: cat.ten_danhmuc,
                items: catItems,
                travelFee: { 
                    mode: 'per_km', 
                    min: 20000, 
                    max: 150000,
                    pricePerKm: { baseKm: 2, basePrice: 20000, extraPrice: 12000 }
                }
            };
        });

    } catch (err) { 
        console.error('Lỗi nạp dịch vụ từ DB:', err);
        services = []; 
    }

    services.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id; opt.textContent = cat.name;
        mainSel.appendChild(opt);
    });

    // Detect UI style: button-group (partials/dat-lich.html) vs regular select
    const useButtons = !!subBtns;
    const subCountEl = document.getElementById('subServiceCount');
    const priceEl    = document.getElementById('giadichvu');

    function _renderSubBtns(items, catData) {
        _bdBuildSubBtns(subBtns, subSel, items, catData, subCountEl, priceEl);
        if (subWrap) subWrap.style.display = '';
        if (subPh)   subPh.classList.add('d-none');
    }

    function _hideSubBtns() {
        if (subWrap) subWrap.style.display = 'none';
        if (subBtns) subBtns.innerHTML = '';
        if (subPh)   subPh.classList.remove('d-none');
        if (subSel)  subSel.value = '';
        if (brandWrap) brandWrap.style.display = 'none';
        if (brandBox) brandBox.innerHTML = '';
        if (typeof _bdClearBrandSelectorUi === 'function') _bdClearBrandSelectorUi();
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
            if (!cat) {
                if (typeof _bdClearBrandSelectorUi === 'function') _bdClearBrandSelectorUi();
                _bdHideBreakdown();
                return;
            }
            cat.items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = item.name + (item.price > 0 ? ` – ${Number(item.price).toLocaleString('vi-VN')}đ` : ' – Giá thỏa thuận');
                subSel && subSel.appendChild(opt);
            });
        }
    });

    if (!useButtons && subSel) {
        subSel.addEventListener('change', function () {
            const mainCat = services.find(c => c.id == mainSel.value); // loose ==
            if (!mainCat) return;
            const item = mainCat.items.find(i => i.name === this.value);
            const priceEl = document.getElementById('giadichvu');
            if (!item) { if (priceEl) priceEl.value = ''; _bdHideBreakdown(); return; }
            const price = item.price || 0;
            if (priceEl) priceEl.value = price > 0 ? Number(price).toLocaleString('vi-VN') + 'đ' : 'Giá thỏa thuận';
            _bdSetBreakdown(price, item.travelFee || mainCat.travelFee || null, item.surveyFee || mainCat.surveyFee || null, mainCat.id, item.id);
        });
    }

    // Prefill từ URL param ?service=TênDịchVụ hoặc window._BD_PREFILL_SERVICE (panel mode)
    const params = new URLSearchParams(window.location.search);
    const svcParam = params.get('service') || window._BD_PREFILL_SERVICE || '';
    if (window._BD_PREFILL_SERVICE) window._BD_PREFILL_SERVICE = null; // dùng 1 lần
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

