'use strict';
/**
 * booking-panel.js
 * Mở Bootstrap Modal chứa form đặt lịch (jQuery .load từ partials/dat-lich.html).
 *
 * - Tạo modal HTML vào DOM tự động
 * - Intercept click .booking-btn (capture phase) → jQuery load form → show modal
 * - Modal to + fullscreen trên mobile
 * - Bỏ qua khi đang ở trang dat-lich-standalone
 * - Tự load jQuery nếu chưa có
 */
(function () {

    if (document.body.classList.contains('dat-lich-standalone')) return;

    /* ------------------------------------------------------------------ */
    /*  State                                                               */
    /* ------------------------------------------------------------------ */
    var _ready        = false;
    var _loaded       = false;
    var _initialized  = false;
    var _pendingClick = null;
    var _prefillMeta  = null;
    var _services     = null; // cache services.json

    /* ------------------------------------------------------------------ */
    /*  CSS bổ sung                                                         */
    /* ------------------------------------------------------------------ */
    var CSS = [
        /* Modal body: padding 0, scroll trong modal */
        '#bpModal .modal-body{padding:0;overflow-x:hidden}',

        /* Loading spinner */
        '#bpLoading{display:flex;flex-direction:column;align-items:center;',
        'justify-content:center;padding:48px 24px;gap:14px;color:#11998e}',
        '#bpLoading span{font-size:.88rem;color:#64748b}',

        /* Bo góc modal content */
        '#bpModal .modal-content{border-radius:18px!important;overflow:hidden}',

        /* Mobile: modal full-screen */
        '@media(max-width:575.98px){',
        '#bpModal .modal-dialog{',
        'margin:0!important;',
        'max-width:100vw!important;width:100vw!important;',
        'height:100dvh!important;max-height:100dvh!important}',
        '#bpModal .modal-content{',
        'height:100dvh!important;max-height:100dvh!important;border-radius:0!important}',
        '#bpModal .modal-body{',
        'max-height:calc(100dvh - 58px)!important;overflow-y:auto!important}',
        '}',

        /* Confirm screen service price alignment */
        '.cfm-service-list { list-style:none; padding:0; margin:0; }',
        '.cfm-service-list li { display:flex; align-items:center; gap:10px; margin-bottom:8px; border-bottom:1px dashed #f1f5f9; padding-bottom:6px; }',
        '.cfm-svc-content { flex: 1; display:flex; align-items:center; }',
        '.cfm-svc-price { margin-left: auto; color: #11998e; font-weight: 700; font-size: 0.95rem; }',
        '.cfm-svc-brand { font-size: 0.75rem; color: #11998e; background: #e6fffa; padding: 2px 8px; border-radius: 4px; margin-left: 8px; font-weight: normal; }',
    ].join('');

    /* ------------------------------------------------------------------ */
    /*  Tạo Bootstrap Modal HTML                                            */
    /* ------------------------------------------------------------------ */
    function _createModal() {
        var style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);


        var base = window.BD_BASE || './';
        // Đảm bảo publicBase luôn trỏ tới thư mục public/ của Thợ Nhà
        var publicBase = base.endsWith('/') ? base + 'public/' : (base ? base + '/public/' : 'public/');
        
        // Logo DVQT (Lấy từ root nếu có thể, hoặc dùng bản copy trong dự án)
        var logoL = (base === './' || base === '') ? '../../../public/asset/image/logo-dich-vu-quanh-ta.png' : publicBase + 'assets/images/logo-dich-vu-quanh-ta.jpg';
        var logoR = publicBase + 'assets/images/tho-nha-logo-thuong-hieu-cropped.jpg';


        var wrapper = document.createElement('div');
        wrapper.innerHTML = [
            '<div class="modal fade" id="bpModal" tabindex="-1" aria-labelledby="bpModalTitle" aria-hidden="true">',
            '  <div class="modal-dialog modal-fullscreen-sm-down modal-dialog-centered modal-dialog-scrollable">',
            '    <div class="modal-content">',
            '      <div class="modal-header bk-modal-header">',
            '        <div class="bk-header-spacer"></div>',
            '        <div class="bk-header-center">',
            '          <img src="' + logoL + '" alt="Dịch Vụ Quanh Ta" class="bk-header-logo">',
            '          <h5 class="modal-title fw-bold mb-0" id="bpModalTitle">',
            '            Đặt Lịch Dịch Vụ',
            '          </h5>',
            '          <img src="' + logoR + '" alt="Thợ Nhà" class="bk-header-logo">',
            '        </div>',
            '        <button type="button" class="btn-close bk-header-close" data-bs-dismiss="modal" aria-label="Đóng"></button>',
            '      </div>',
            '      <div class="modal-body" id="bpModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(wrapper.firstElementChild);

        _ready = true;

        if (_pendingClick !== null) {
            _openModal(_pendingClick);
            _pendingClick = null;
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Mở modal                                                           */
    /* ------------------------------------------------------------------ */
    function _openModal(serviceName) {
        var modalEl = document.getElementById('bpModal');
        if (!modalEl) {
            console.error('[BookingPanel] Modal element #bpModal not found.');
            return;
        }

        // Đảm bảo bootstrap đã sẵn sàng
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.warn('[BookingPanel] Bootstrap not ready, waiting 100ms...');
            setTimeout(function() { _openModal(serviceName); }, 100);
            return;
        }

        try {
            // Show Bootstrap Modal
            var bsModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
            bsModal.show();
        } catch (err) {
            console.error('[BookingPanel] Error showing modal:', err);
        }

        if (!_loaded) {
            _loadContent(serviceName);
        } else {
            _initForm(serviceName); // prefill nếu đã loaded
        }
    }

    /* ------------------------------------------------------------------ */
    /*  jQuery .load() nội dung form từ dat-lich.html                      */
    /* ------------------------------------------------------------------ */
    function _loadBookingMarkup(url, serviceName) {
        var $body = jQuery('#bpModalBody');

        // Chuẩn mới: load từ div dùng chung; fallback selector cũ để tương thích
        $body.load(url + ' #bookingSharedContent', function (_response, status) {
            var loadedSomething = $body.children().length > 0;

            if (status === 'error' || !loadedSomething) {
                $body.load(url + ' #bookingModal .modal-body', function (_resp2, status2) {
                    if (status2 === 'error') {
                        $body.html(
                            '<p class="text-danger p-4">' +
                            '<i class="fas fa-exclamation-triangle me-2"></i>' +
                            'Không thể tải form đặt lịch. Vui lòng thử lại.' +
                            '</p>'
                        );
                        return;
                    }
                    _loaded = true;
                    _ensureMap(async function () {
                        await _initForm(serviceName);
                    });
                });
                return;
            }

            _loaded = true;
            _ensureMap(async function () {
                await _initForm(serviceName);
            });
        });
    }

    function _loadContent(serviceName) {
        var base = window.BD_BASE || '';
        if (base && !base.endsWith('/')) base += '/';
        var url  = base + 'dat-lich.html';
        var $body = jQuery('#bpModalBody');

        $body.html(
            '<div id="bpLoading">' +
            '<div class="spinner-border" style="color:#11998e;width:2.2rem;height:2.2rem;"></div>' +
            '<span>Đang tải form đặt lịch...</span>' +
            '</div>'
        );

        _loadBookingMarkup(url, serviceName);
    }

    /* ------------------------------------------------------------------ */
    /*  Đảm bảo Leaflet + mapPicker đã load                               */
    /* ------------------------------------------------------------------ */
    function _ensureMap(callback) {
        var base = window.BD_BASE || '../../';

        function tryMapPicker() {
            if (window.mapPicker) { callback(); return; }
            var s = document.createElement('script');
            s.src = base + '../../../public/asset/js/dvqt-map.js';
            s.onload  = callback;
            s.onerror = callback;
            document.head.appendChild(s);
        }

        if (!window.L) {
            if (!document.querySelector('link[href*="leaflet"]')) {
                var lnk = document.createElement('link');
                lnk.rel  = 'stylesheet';
                lnk.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(lnk);
            }
            var s = document.createElement('script');
            s.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload  = tryMapPicker;
            s.onerror = callback;
            document.head.appendChild(s);
        } else {
            tryMapPicker();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Prefill dịch vụ vào form                                           */
    /* ------------------------------------------------------------------ */
    function _prefillServiceInForm(name) {
        if (!name && !_prefillMeta) return;
        var base = window.BD_BASE || '../../';

        function applyMetaOverrides() {
            if (!_prefillMeta) return;

            var priceEl = document.getElementById('giadichvu');
            if (typeof _prefillMeta.price === 'number' && !isNaN(_prefillMeta.price)) {
                if (priceEl) {
                    priceEl.value = _prefillMeta.price > 0
                        ? _prefillMeta.price.toLocaleString('vi-VN') + 'đ'
                        : 'Giá thỏa thuận';
                }
                if (typeof _bdSetBreakdown === 'function') {
                    _bdSetBreakdown(
                        _prefillMeta.price,
                        _prefillMeta.travelFee || null,
                        _prefillMeta.surveyFee || null,
                        _prefillMeta.catId || null,
                        _prefillMeta.serviceId || null,
                        _prefillMeta.unit || 'lượt'
                    );
                }
            }

            if (_prefillMeta.brand) {
                setTimeout(function () {
                    var wanted = String(_prefillMeta.brand || '').trim().toLowerCase();
                    if (!wanted) return;

                    var preferredService = String(name || '').trim().toLowerCase();
                    var btns = document.querySelectorAll('#brandOptionsContainer .brand-option');
                    var candidate = null;

                    for (var i = 0; i < btns.length; i++) {
                        var btn = btns[i];
                        var btnBrand = String(btn.getAttribute('data-brand') || '').trim().toLowerCase();
                        if (btnBrand !== wanted) continue;

                        var svc = String(btn.getAttribute('data-service-name') || '').trim().toLowerCase();
                        if (preferredService && svc === preferredService) {
                            candidate = btn;
                            break;
                        }
                        if (!candidate) candidate = btn;
                    }

                    if (candidate && !candidate.classList.contains('active')) {
                        candidate.click();
                    }
                }, 60);
            }
        }

        async function doFetch(cb) {
            if (_services) { cb(_services); return; }
            
            const krud = window.DVQTKrud;
            if (!krud) return;

            try {
                // Tải dữ liệu từ DB tương tự standalone mode
                const [cats, svcs] = await Promise.all([
                    krud.listTable('danhmuc_thonha', { limit: 100, filter: "trang_thai='active'", sort: 'thu_tu ASC' }),
                    krud.listTable('dichvu_thonha',  { limit: 1000, filter: "trang_thai='active'" })
                ]);

                const mappedServices = cats.map(function(cat) {
                    return {
                        id: cat.id,
                        name: cat.ten_danhmuc,
                        items: svcs.filter(function(s) { 
                            return String(s.id_danhmuc) === String(cat.id); 
                        }).map(function(s) {
                            return {
                                id:    s.id,
                                name:  s.ten_dichvu,
                                price: Number(s.gia_co_ban || 0),
                                unit:  s.don_vi_tinh || 'lượt',
                                travelFee: null,
                                surveyFee: s.phi_khao_sat ? { amount: Number(s.phi_khao_sat), required: String(s.yeu_cau_khao_sat) === '1' } : null
                            };
                        }),
                        travelFee: { 
                            mode: 'per_km', 
                            min: 20000, 
                            max: 150000,
                            pricePerKm: { baseKm: 2, basePrice: 20000, extraPrice: 12000 }
                        }
                    };
                });

                _services = mappedServices;
                cb(mappedServices);
            } catch (e) {
                console.error('Panel: Lỗi nạp dịch vụ từ DB:', e);
            }
        }

        // Đợi dropdown #loaidichvu được populate (polling tối đa 2s)
        var attempts = 0;
        var timer = setInterval(function () {
            var mainSel = document.getElementById('loaidichvu');
            if (!mainSel || (mainSel.options.length <= 1 && attempts++ < 20)) return;
            clearInterval(timer);
            if (!mainSel || mainSel.options.length <= 1) return;

            if (!name) {
                applyMetaOverrides();
                return;
            }

            doFetch(function (services) {
                // 0) Khớp ID (Nếu có - chính xác nhất)
                if (_prefillMeta && _prefillMeta.catId) {
                    mainSel.value = _prefillMeta.catId;
                    mainSel.dispatchEvent(new Event('change'));

                    if (_prefillMeta.serviceId) {
                        setTimeout(function () {
                            var subBtns = document.getElementById('subServiceBtns');
                            if (!subBtns) return;
                            var btns = subBtns.querySelectorAll('.sub-service-btn');
                            for (var k = 0; k < btns.length; k++) {
                                if (btns[k].getAttribute('data-id') === String(_prefillMeta.serviceId)) {
                                    btns[k].click();
                                    break;
                                }
                            }
                            _prefillMeta = _prefillMeta || {};
                            _prefillMeta.unit = cat.items[j].unit || 'lượt';
                            applyMetaOverrides();
                        }, 80);
                        return;
                    }
                    setTimeout(applyMetaOverrides, 80);
                    return;
                }

                var nameLower = name.toLowerCase();

                // 1) Khớp tên CATEGORY (case-insensitive) → chọn category, không chọn sub
                for (var i = 0; i < services.length; i++) {
                    if (services[i].name.toLowerCase() === nameLower) {
                        mainSel.value = services[i].id;
                        mainSel.dispatchEvent(new Event('change'));
                        _prefillMeta = _prefillMeta || {};
                        _prefillMeta.unit = services[i].items && services[i].items[0] ? services[i].items[0].unit : 'lượt';
                        setTimeout(applyMetaOverrides, 80);
                        return;
                    }
                }

                // 2) Khớp tên SUB-SERVICE → chọn category + click sub-service button
                for (var i = 0; i < services.length; i++) {
                    var cat = services[i];
                    for (var j = 0; j < cat.items.length; j++) {
                        if (cat.items[j].name.toLowerCase() === nameLower) {
                            mainSel.value = cat.id;
                            mainSel.dispatchEvent(new Event('change'));
                            var itemName = cat.items[j].name;
                            setTimeout(function () {
                                var subBtns = document.getElementById('subServiceBtns');
                                if (!subBtns) return;
                                var btns = subBtns.querySelectorAll('.sub-service-btn');
                                for (var k = 0; k < btns.length; k++) {
                                    if (btns[k].textContent.trim().startsWith(itemName)) {
                                        btns[k].click();
                                        break;
                                    }
                                }
                                applyMetaOverrides();
                            }, 80);
                            return;
                        }
                    }
                }

                applyMetaOverrides();
            });
        }, 100);
    }

    /* ------------------------------------------------------------------ */
    /*  Khởi tạo form (gọi booking-detail.js standalone handler)           */
    /* ------------------------------------------------------------------ */
    async function _initForm(serviceName) {
        if (_initialized) {
            // Form đã init, chỉ prefill lại nếu có service
            if (serviceName || _prefillMeta) _prefillServiceInForm(serviceName);
            return;
        }
        _initialized = true;

        if (typeof _bdInitStandalone === 'function') {
            await _bdInitStandalone();
        }

        // Tự động điền thông tin người dùng nếu đã đăng nhập
        if (window.DVQTApp && window.DVQTApp.checkSession) {
            try {
                const session = await window.DVQTApp.checkSession();
                if (session && session.logged_in) {
                    const nameInput = document.getElementById('hoten');
                    const phoneInput = document.getElementById('sodienthoai');
                    const addrInput = document.getElementById('diachi');
                    
                    if (nameInput && !nameInput.value) nameInput.value = session.name || '';
                    if (phoneInput && !phoneInput.value) phoneInput.value = session.phone || '';
                    if (addrInput && !addrInput.value) addrInput.value = session.address || '';
                }
            } catch (err) { console.warn('[BookingPanel] Prefill user info failed:', err); }
        }

        // Prefill sau khi _bdLoadStandaloneServices chạy xong
        if (serviceName || _prefillMeta) _prefillServiceInForm(serviceName);

        // Tự động định vị GPS (sau khi form đã init)
        if (window.mapPicker && typeof window.mapPicker.gps === 'function') {
            setTimeout(() => window.mapPicker.gps(), 500);
        }

        // Khi modal đóng: reset form về trạng thái ban đầu
        var modalEl = document.getElementById('bpModal');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function () {
                var form = document.getElementById('bookingForm');
                var confirm = document.getElementById('bookingConfirm');
                if (form) { form.reset(); form.style.display = ''; }
                if (confirm) confirm.style.display = 'none';
                var mainSel = document.getElementById('loaidichvu');
                if (mainSel) mainSel.value = '';
                var subWrap = document.getElementById('subServiceWrap');
                if (subWrap) subWrap.style.display = 'none';
                var subBtns = document.getElementById('subServiceBtns');
                if (subBtns) subBtns.innerHTML = '';
                var subCount = document.getElementById('subServiceCount');
                if (subCount) { subCount.textContent = ''; subCount.style.display = 'none'; }
                var subHidden = document.getElementById('dichvucuthe');
                if (subHidden) subHidden.value = '';
                var priceInput = document.getElementById('giadichvu');
                if (priceInput) priceInput.value = '';
                if (typeof _bdClearBrandSelectorUi === 'function') _bdClearBrandSelectorUi();
                if (typeof _bdHideBreakdown === 'function') _bdHideBreakdown(true);
                if (typeof _bdClearMedia === 'function') _bdClearMedia();
                _prefillMeta = null;
            });
        }
    }

    // Tự động điền dữ liệu người dùng khi đã đăng nhập hoặc từ URL (Express mode)
    function autoFillUserForm() {
        const params = new URLSearchParams(window.location.search);
        
        // Ưu tiên 1: Lấy từ URL (Chế độ Express)
        const urlPhone = params.get('sdt');
        const urlName = params.get('ten') || params.get('ho_ten');

        // Ưu tiên 2: Lấy từ Session (Chế độ đã đăng nhập)
        const userPhone = (typeof DVQTApp !== 'undefined' && DVQTApp.getCookie) ? DVQTApp.getCookie('dvqt_u') : null;
        
        // Kiểm tra hàm getProfile, nếu không có thì thử lấy dữ liệu từ localStorage (nếu có)
        let userData = null;
        if (typeof DVQTApp !== 'undefined' && typeof DVQTApp.getProfile === 'function') {
            userData = DVQTApp.getProfile();
        } else if (window.localStorage.getItem('dvqt_user')) {
             try { userData = JSON.parse(window.localStorage.getItem('dvqt_user')); } catch(e){}
        }

        const nameInput = document.getElementById('hoten');
        const phoneInput = document.getElementById('sodienthoai');
        const addrInput = document.getElementById('diachi');

        // Điền Tên
        if (nameInput && !nameInput.value) {
            nameInput.value = urlName || (userData ? (userData.ho_ten || '') : '');
        }
        // Điền SĐT
        if (phoneInput && !phoneInput.value) {
            phoneInput.value = urlPhone || userPhone || '';
        }
        // Điền Địa chỉ
        if (addrInput && !addrInput.value && userData) {
            addrInput.value = userData.dia_chi || '';
        }
    }

    document.addEventListener('DOMContentLoaded', autoFillUserForm);
    document.addEventListener('auth-synced', autoFillUserForm);

    /* ------------------------------------------------------------------ */
    /*  Intercept .booking-btn click — CAPTURE PHASE                       */
    /* ------------------------------------------------------------------ */
    document.addEventListener('click', async function (e) {
        var btn = e.target.closest('.booking-btn');
        if (!btn) return;

        e.preventDefault();
        e.stopImmediatePropagation(); // ngăn booking-detail.js mở modal cũ

        // Không yêu cầu đăng nhập nữa — tài khoản sẽ được tạo tự động khi đặt lịch

        var serviceName = btn.getAttribute('data-service-name') || '';
        var card = btn.closest('.service-item-card');
        var activeBrand = card ? card.querySelector('.brand-option.active') : null;
        var rawPrice = btn.getAttribute('data-service-price');
        var rawUnit  = btn.getAttribute('data-service-unit');
        var rawTravel = btn.getAttribute('data-travel-fee');
        var rawSurvey = btn.getAttribute('data-survey-fee');

        _prefillMeta = null;
        if (activeBrand || rawPrice || rawTravel || rawSurvey) {
            _prefillMeta = {};
            _prefillMeta.serviceId = btn.getAttribute('data-service-id') || null;
            _prefillMeta.catId     = btn.getAttribute('data-cat-id') || null;

            if (activeBrand) {
                _prefillMeta.brand = activeBrand.getAttribute('data-brand') || '';
            }
            if (rawPrice !== null && rawPrice !== '') {
                var parsedPrice = parseInt(rawPrice, 10);
                if (!isNaN(parsedPrice)) {
                    _prefillMeta.price = parsedPrice;
                    _prefillMeta.unit  = rawUnit || 'lượt';
                }
            }
            if (rawTravel) {
                try { _prefillMeta.travelFee = JSON.parse(rawTravel); } catch (_e) {}
            }
            if (rawSurvey) {
                try { _prefillMeta.surveyFee = JSON.parse(rawSurvey); } catch (_e2) {}
            }
        }

        if (_ready) {
            _openModal(serviceName);
        } else {
            _pendingClick = serviceName;
        }
    }, true /* capture phase */);

    /* ------------------------------------------------------------------ */
    /*  Bootstrap: load jQuery nếu chưa có, rồi tạo modal                 */
    /* ------------------------------------------------------------------ */
    function _boot() {
        if (typeof jQuery !== 'undefined') {
            _createModal();
        } else {
            var jq = document.createElement('script');
            jq.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
            jq.onload = _createModal;
            document.head.appendChild(jq);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot);
    } else {
        _boot();
    }

})();
