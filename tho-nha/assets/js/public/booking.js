/**
 * Booking JavaScript - Xử lý đặt lịch dịch vụ
 * Modal HTML được load động từ partials/booking-modal.html
 *
 * Công thức tính giá:
 *   basePrice     = giá hãng đã chọn (hoặc giá mặc định)
 *   travelMin/Max = phí di chuyển min–max (fallback: fixed nếu không có distance thực tế)
 *   survey        = phí khảo sát (chỉ tính khi required = true)
 *
 *   Tổng "nếu đồng ý sửa":
 *     totalMin = basePrice + travelMin   (phí khảo sát ĐƯỢC MIỄN khi tiến hành sửa)
 *     totalMax = basePrice + travelMax
 *
 *   Tổng "nếu KHÔNG đồng ý sửa" (hiện thị trong notice):
 *     noRepairMin = travelMin + survey
 *     noRepairMax = travelMax + survey
 */

// true khi chạy trên localhost/XAMPP, false khi chạy web tĩnh
// true chỉ khi chạy trên XAMPP (port 80), không phải Live Server (5500/5501)
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    && (window.location.port === '' || window.location.port === '80');

// Google Apps Script Web App URL — thay bằng URL thật sau khi deploy
const GSHEET_URL = window.GSHEET_URL || 'https://script.google.com/macros/s/AKfycbx8J5infIIqf-VOFCNq89L7W1xRfluTU0Dt4R8Vijl81zhid59aql3vURdT01dwaaKgPQ/exec';

// ==================== DOM REFS (khởi tạo sau khi modal load) ====================
let bookingModal, mainService, subService, servicePrice, brandSelectorWrap, brandOptionsContainer;
let pricingBreakdownWrap, subServiceWrap, subServiceBtns, subServicePlaceholder;
let STATIC_SERVICES = [];
let initBookingPromise;

// Item hiện tại đang chọn (dùng để tính pricing khi submit)
let _currentItem = null;
// Danh sách các dịch vụ đã chọn (multi-select)
let _selectedItems = [];

// ==================== GOOGLE SHEETS — fire-and-forget ====================
function sendToSheet(pendingData, orderCode) {
    if (!GSHEET_URL) return;
    const now = new Date();
    const created_at = now.toLocaleString('vi-VN', { hour12: false });
    const payload = {
        order_code:      orderCode || '',
        name:            pendingData.name            || '',
        phone:           pendingData.phone           || '',
        service:         pendingData.service_id      || '',
        address:         pendingData.address         || '',
        note:            pendingData.note            || '',
        selected_brand:  pendingData.selected_brand  || '',
        estimated_price: pendingData.estimated_price || '',
        status:          'new',
        created_at,
    };
    fetch(GSHEET_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
    }).catch(() => {});
}

// ==================== FORMAT HELPER ====================
function fmtVND(n) {
    return Number(n).toLocaleString('vi-VN') + 'đ';
}

// ==================== PRICING CALC ====================
/**
 * Tính chi phí ước tính.
 * Assumption: không có dữ liệu khoảng cách thực tế →
 *   dùng fixedAmount hoặc min/max từ travelFee.
 */
function calcPricing(basePrice, travelFee, surveyFee) {
    // Phí di chuyển — fallback sang fixed nếu không có distance thực tế
    const travelMin = travelFee ? (travelFee.min ?? travelFee.fixedAmount ?? 0) : 0;
    const travelMax = travelFee ? (travelFee.max ?? travelFee.fixedAmount ?? 0) : 0;
    // Phí khảo sát — chỉ tính khi required === true
    const survey = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;

    return {
        travelMin,
        travelMax,
        survey,
        // Tổng khi đồng ý sửa: phí khảo sát được MIỄN
        totalMin: basePrice + travelMin,
        totalMax: basePrice + travelMax,
        // Tổng khi KHÔNG đồng ý sửa: phải trả phí di chuyển + phí khảo sát
        noRepairMin: travelMin + survey,
        noRepairMax: travelMax + survey,
        hasFees: travelMax > 0 || survey > 0
    };
}

// ==================== BREAKDOWN UI ====================
function updatePricingBreakdown(basePrice, item) {
    if (!pricingBreakdownWrap) return;

    const pricing = calcPricing(basePrice, item.travelFee, item.surveyFee);

    if (!pricing.hasFees) {
        hidePricingBreakdown();
        return;
    }

    const bdService   = document.getElementById('bd-service');
    const bdTravelRow = document.getElementById('bd-travel-row');
    const bdTravel    = document.getElementById('bd-travel');
    const bdTotal     = document.getElementById('bd-total');

    if (bdService)  bdService.textContent  = fmtVND(basePrice);

    if (pricing.travelMax > 0 && bdTravelRow && bdTravel) {
        bdTravelRow.style.removeProperty('display');
        const label = pricing.travelMin === pricing.travelMax
            ? fmtVND(pricing.travelMin)
            : `${fmtVND(pricing.travelMin)} – ${fmtVND(pricing.travelMax)}`;
        bdTravel.textContent = label;
    } else if (bdTravelRow) {
        bdTravelRow.style.setProperty('display', 'none', 'important');
    }

    if (bdTotal) {
        bdTotal.textContent = pricing.totalMin === pricing.totalMax
            ? fmtVND(pricing.totalMin)
            : `${fmtVND(pricing.totalMin)} – ${fmtVND(pricing.totalMax)}`;
    }

    // Notice phí khảo sát — 2 kịch bản: đồng ý sửa / không sửa
    const bdSurveyNotice   = document.getElementById('bd-survey-notice');
    const bdSurveyTravel   = document.getElementById('bd-survey-travel');
    const bdSurveyAmount   = document.getElementById('bd-survey-amount');
    const bdSurveyNoRepair = document.getElementById('bd-survey-no-repair');
    if (pricing.survey > 0 && bdSurveyNotice) {
        // Phí di chuyển (dòng riêng trong bảng "nếu không sửa")
        if (bdSurveyTravel) bdSurveyTravel.textContent = pricing.travelMin === pricing.travelMax
            ? fmtVND(pricing.travelMin)
            : `${fmtVND(pricing.travelMin)} – ${fmtVND(pricing.travelMax)}`;
        // Phí khảo sát
        if (bdSurveyAmount)   bdSurveyAmount.textContent   = fmtVND(pricing.survey);
        // Tổng cần trả nếu không sửa
        if (bdSurveyNoRepair) bdSurveyNoRepair.textContent = pricing.noRepairMin === pricing.noRepairMax
            ? fmtVND(pricing.noRepairMin)
            : `${fmtVND(pricing.noRepairMin)} – ${fmtVND(pricing.noRepairMax)}`;
        bdSurveyNotice.style.display = '';
    } else if (bdSurveyNotice) {
        bdSurveyNotice.style.display = 'none';
    }

    pricingBreakdownWrap.style.display = '';
}

function hidePricingBreakdown() {
    if (pricingBreakdownWrap) pricingBreakdownWrap.style.display = 'none';
}

// ==================== LOAD MODAL PARTIAL ====================
async function loadBookingModalPartial() {
    if (document.getElementById('bookingModal')) return;
    try {
        const res = await fetch('../../partials/dat-lich.html');
        if (!res.ok) throw new Error();
        // Dùng DOMParser để chỉ lấy #bookingModal
        // (dat-lich.html là trang đầy đủ, không inject cả <html> vào body)
        const parser = new DOMParser();
        const doc    = parser.parseFromString(await res.text(), 'text/html');
        const modal  = doc.getElementById('bookingModal');
        if (modal) document.body.appendChild(modal);
        else throw new Error('no #bookingModal');
    } catch {
        // Fallback: inject trực tiếp nếu fetch thất bại
        document.body.insertAdjacentHTML('beforeend', buildBookingModalFallback());
    }
}

function buildBookingModalFallback() {
    return `
    <div class="modal fade" id="bookingModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">
                        <i class="fas fa-calendar-check me-2" style="color: var(--primary);"></i>
                        Đặt Lịch Dịch Vụ
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="bookingForm">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="name" class="form-label">Họ và tên <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="name" placeholder="Nhập họ và tên" required>
                            </div>
                            <div class="col-md-6">
                                <label for="phone" class="form-label">Số điện thoại <span class="text-danger">*</span></label>
                                <input type="tel" class="form-control" id="phone" placeholder="0xxx xxx xxx" required>
                            </div>
                            <div class="col-md-6">
                                <label for="mainService" class="form-label">Loại dịch vụ <span class="text-danger">*</span></label>
                                <select class="form-select" id="mainService" required>
                                    <option value="">-- Chọn loại dịch vụ --</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label for="subService" class="form-label">Dịch vụ cụ thể <span class="text-danger">*</span></label>
                                <select class="form-select" id="subService" disabled required>
                                    <option value="">-- Chọn dịch vụ chi tiết --</option>
                                </select>
                            </div>
                            <div class="col-12" id="brandSelectorWrap" style="display:none;">
                                <label class="form-label">
                                    <i class="fas fa-tag me-1" style="color:var(--primary);"></i>Chọn hãng
                                </label>
                                <div id="brandOptionsContainer" class="brand-options"></div>
                            </div>
                            <div class="col-12">
                                <label for="servicePrice" class="form-label">Giá dịch vụ (tham khảo)</label>
                                <input type="text" class="form-control" id="servicePrice" readonly placeholder="Chọn dịch vụ để xem giá">
                            </div>
                            <div class="col-12">
                                <label for="address" class="form-label">Địa chỉ <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="address" rows="2" placeholder="Số nhà, đường, phường, quận..." required></textarea>
                            </div>
                            <div class="col-12">
                                <label for="note" class="form-label">Ghi chú thêm</label>
                                <textarea class="form-control" id="note" rows="2" placeholder="Mô tả thêm về tình trạng hư hỏng..."></textarea>
                            </div>
                        </div>
                        <div class="mt-4">
                            <button type="submit" class="btn btn-gradient w-100" style="padding: 14px; font-size: 1rem;">
                                <i class="fas fa-check-circle me-2"></i> Xác nhận đặt lịch
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;
}

// ==================== INIT ====================
async function initBooking() {
    await loadBookingModalPartial();

    // Khởi tạo refs sau khi modal đã có trong DOM
    bookingModal          = new bootstrap.Modal(document.getElementById('bookingModal'));
    mainService           = document.getElementById('mainService');
    subService            = document.getElementById('subService');
    servicePrice          = document.getElementById('servicePrice');
    brandSelectorWrap     = document.getElementById('brandSelectorWrap');
    brandOptionsContainer = document.getElementById('brandOptionsContainer');
    pricingBreakdownWrap  = document.getElementById('pricingBreakdownWrap');
    subServiceWrap        = document.getElementById('subServiceWrap');
    subServiceBtns        = document.getElementById('subServiceBtns');
    subServicePlaceholder = document.getElementById('subServicePlaceholder');

    // ==================== MEDIA CAPTURE ====================
    setupMediaCapture();

    // ==================== LOAD DATA & POPULATE DROPDOWN ====================
    fetch('../../data/services.json')
        .then(r => r.json())
        .then(data => {
            STATIC_SERVICES = data.map(s => ({
                id:         s.id,
                name:       s.name,
                // travelFee ở cấp category — làm mặc định cho tất cả item
                travelFee:  s.travelFee  || null,
                surveyFee:  s.surveyFee  || null,
                items: s.items.map(item => ({
                    name:        item.name,
                    price:       item.price,
                    priceRange:  item.priceRange  || null,
                    // Item override category nếu có
                    travelFee:   item.travelFee  || s.travelFee  || null,
                    surveyFee:   item.surveyFee  || s.surveyFee  || null,
                    brandPrices: item.brandPrices || null
                }))
            }));

            STATIC_SERVICES.forEach(cat => {
                const opt = document.createElement('option');
                opt.value       = cat.id;
                opt.textContent = cat.name;
                mainService.appendChild(opt);
            });
        })
        .catch(() => console.warn('Không thể tải data/services.json'));

    // ==================== CATEGORY CHANGE ====================
    mainService.addEventListener('change', () => {
        // Reset sub-service
        subService.value = '';
        servicePrice.value = '';
        hideBrandSelector();
        hidePricingBreakdown();
        _currentItem = null;

        if (!mainService.value) {
            hideSubServiceBtns();
            return;
        }

        const cat = STATIC_SERVICES.find(c => c.id == mainService.value);
        if (!cat) { hideSubServiceBtns(); return; }

        renderSubServiceBtns(cat.items);
    });

    // ==================== SUB-SERVICE BUTTON CLICK (multi-select) ====================
    function renderSubServiceBtns(items) {
        subServiceBtns.innerHTML = '';
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sub-service-btn';
            btn.textContent = item.name;
            btn.addEventListener('click', () => {
                // Toggle: click lại để bỏ chọn
                const isActive = btn.classList.contains('active');
                if (isActive) {
                    btn.classList.remove('active');
                    _selectedItems = _selectedItems.filter(i => i.name !== item.name);
                } else {
                    btn.classList.add('active');
                    _selectedItems.push(item);
                }
                updateMultiServiceState();
            });
            subServiceBtns.appendChild(btn);
        });
        if (subServiceWrap) subServiceWrap.style.display = '';
        if (subServicePlaceholder) subServicePlaceholder.classList.add('d-none');
    }

    function hideSubServiceBtns() {
        if (subServiceWrap) subServiceWrap.style.display = 'none';
        if (subServiceBtns) subServiceBtns.innerHTML = '';
        if (subServicePlaceholder) subServicePlaceholder.classList.remove('d-none');
        _selectedItems = [];
        _currentItem = null;
        updateSubServiceCountBadge();
    }

    // Cập nhật badge đếm số dịch vụ đã chọn
    function updateSubServiceCountBadge() {
        const badge = document.getElementById('subServiceCount');
        if (!badge) return;
        if (_selectedItems.length > 0) {
            badge.textContent = _selectedItems.length + ' đã chọn';
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    // Tính toán & cập nhật giá/brand sau mỗi thay đổi chọn dịch vụ
    function updateMultiServiceState() {
        updateSubServiceCountBadge();

        if (_selectedItems.length === 0) {
            _currentItem = null;
            subService.value = '';
            servicePrice.value = '';
            hideBrandSelector();
            hidePricingBreakdown();
            return;
        }

        subService.value = _selectedItems.map(i => i.name).join(', ');

        // Brand selector chỉ hiện khi chọn đúng 1 dịch vụ có nhiều hãng
        if (_selectedItems.length === 1 && _selectedItems[0].brandPrices?.length > 1) {
            _currentItem = _selectedItems[0];
            showBrandSelector(_selectedItems[0].brandPrices, _selectedItems[0]);
            const initPrice = _selectedItems[0].brandPrices[0].price;
            servicePrice.value = fmtVND(initPrice);
            updatePricingBreakdown(initPrice, _selectedItems[0]);
        } else {
            hideBrandSelector();
            _currentItem = _selectedItems[0]; // dùng item đầu tiên làm đại diện phí di chuyển
            // Tổng giá = cộng dồn tất cả dịch vụ đã chọn
            const totalBase = _selectedItems.reduce((sum, i) => sum + (i.price || 0), 0);
            if (totalBase > 0) {
                servicePrice.value = fmtVND(totalBase);
                // Phí di chuyển/khảo sát tính 1 lần (theo dịch vụ đầu tiên)
                updatePricingBreakdown(totalBase, _selectedItems[0]);
            } else {
                servicePrice.value = '';
                hidePricingBreakdown();
            }
        }
    }

    // ==================== BOOKING SUBMIT — hiện bảng xác nhận ====================
    let _pendingData = null;

    document.getElementById('bookingForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const activeBrand   = brandOptionsContainer.querySelector('.brand-option.active');
        // Brand chỉ áp dụng khi chọn đúng 1 dịch vụ
        const selectedBrand = (_selectedItems.length === 1 && activeBrand) ? activeBrand.dataset.brand : null;

        // Ghép tên tất cả dịch vụ đã chọn
        let serviceName;
        if (_selectedItems.length > 0) {
            serviceName = _selectedItems
                .map((item, idx) => idx === 0 && selectedBrand ? `${item.name} (${selectedBrand})` : item.name)
                .join(', ');
        } else {
            serviceName = subService.value;
        }

        let estimatedPrice = 0;
        if (_selectedItems.length > 0) {
            const primaryItem = _selectedItems[0];
            const basePrice = (_selectedItems.length === 1 && activeBrand)
                ? Number(activeBrand.dataset.price)
                : _selectedItems.reduce((sum, i) => sum + (i.price || 0), 0);
            const p = calcPricing(basePrice, primaryItem.travelFee, primaryItem.surveyFee);
            estimatedPrice = p.totalMin;
        }

        let noteVal = document.getElementById('note').value.trim();
        if (_mediaFiles.length > 0) {
            const imgs = _mediaFiles.filter(m => m.file.type.startsWith('image/')).length;
            const vids = _mediaFiles.filter(m => m.file.type.startsWith('video/')).length;
            const parts = [];
            if (imgs > 0) parts.push(`${imgs} ảnh`);
            if (vids > 0) parts.push(`${vids} video`);
            noteVal = (noteVal ? noteVal + '\n' : '') + `[Đính kèm: ${parts.join(', ')}]`;
        }

        _pendingData = {
            name:            document.getElementById('name').value.trim(),
            phone:           document.getElementById('phone').value.trim(),
            service_id:      serviceName,
            address:         document.getElementById('address').value.trim(),
            note:            noteVal,
            selected_brand:  selectedBrand,
            estimated_price: estimatedPrice
        };

        if (!_pendingData.name || !_pendingData.phone || !mainService.value || !_pendingData.service_id || !_pendingData.address) {
            if (!mainService.value) alert('Vui lòng chọn loại dịch vụ!');
            else if (!_pendingData.service_id) alert('Vui lòng chọn ít nhất 1 dịch vụ cụ thể!');
            else alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }
        if (!/^(0|\+84)[0-9]{9}$/.test(_pendingData.phone)) {
            alert('Số điện thoại không hợp lệ!');
            return;
        }

        // Điền thông tin vào bảng xác nhận
        document.getElementById('cf-name').textContent    = _pendingData.name;
        document.getElementById('cf-phone').textContent   = _pendingData.phone;
        document.getElementById('cf-service').textContent = _pendingData.service_id;
        document.getElementById('cf-address').textContent = document.getElementById('address').value.trim();

        // Ưu tiên hiện tổng tạm tính (bd-total) nếu có breakdown, fallback về giá base
        const bdTotal      = document.getElementById('bd-total');
        const bdWrapVis    = pricingBreakdownWrap && pricingBreakdownWrap.style.display !== 'none';
        const totalText    = bdWrapVis && bdTotal && bdTotal.textContent ? bdTotal.textContent : '';
        const priceDisplay = totalText || servicePrice.value;
        const priceRow     = document.getElementById('cf-price-row');
        if (priceDisplay) {
            const cfLabel = priceRow.querySelector('.cf-label');
            if (cfLabel) cfLabel.textContent = totalText ? 'Tổng tạm tính' : 'Giá tham khảo';
            document.getElementById('cf-price').textContent = priceDisplay;
            priceRow.style.display = '';
        } else {
            priceRow.style.display = 'none';
        }

        const rawNote = document.getElementById('note').value.trim();
        const noteRow = document.getElementById('cf-note-row');
        if (rawNote) {
            document.getElementById('cf-note').textContent = rawNote;
            noteRow.style.display = '';
        } else {
            noteRow.style.display = 'none';
        }

        const mediaRow = document.getElementById('cf-media-row');
        if (_mediaFiles.length > 0) {
            const imgs = _mediaFiles.filter(m => m.file.type.startsWith('image/')).length;
            const vids = _mediaFiles.filter(m => m.file.type.startsWith('video/')).length;
            const parts = [];
            if (imgs > 0) parts.push(`${imgs} ảnh`);
            if (vids > 0) parts.push(`${vids} video`);
            document.getElementById('cf-media').textContent = parts.join(', ');
            mediaRow.style.display = '';
        } else {
            mediaRow.style.display = 'none';
        }

        // Chuyển sang màn hình xác nhận
        document.getElementById('bookingForm').style.display    = 'none';
        document.getElementById('bookingConfirm').style.display = '';
    });

    // Reset toàn bộ form khi modal đóng (dù đóng bằng cách nào)
    document.getElementById('bookingModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('bookingForm').reset();
        document.getElementById('bookingForm').style.display    = '';
        document.getElementById('bookingConfirm').style.display = 'none';
        hideSubServiceBtns();
        servicePrice.value = '';
        hideBrandSelector();
        hidePricingBreakdown();
        clearMediaFiles();
        _selectedItems = [];
        _currentItem = null;
        _pendingData = null;
    });

    // Quay lại form
    document.getElementById('confirmBackBtn').addEventListener('click', () => {
        document.getElementById('bookingConfirm').style.display = 'none';
        document.getElementById('bookingForm').style.display    = '';
        _pendingData = null;
    });

    // Xác nhận → gọi API
    document.getElementById('confirmSubmitBtn').addEventListener('click', function () {
        if (!_pendingData) return;

        this.disabled  = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';
        const btn = this;

        const resetConfirmBtn = () => {
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận';
        };

        const onSuccess = (orderCode) => {
            const msg = orderCode
                ? `✅ Đặt lịch thành công! Mã đơn: ${orderCode}`
                : '✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.';
            alert(msg);
            bookingModal.hide();
            document.getElementById('bookingForm').reset();
            document.getElementById('bookingForm').style.display    = '';
            document.getElementById('bookingConfirm').style.display = 'none';
            hideSubServiceBtns();
            servicePrice.value  = '';
            hideBrandSelector();
            hidePricingBreakdown();
            clearMediaFiles();
            _selectedItems = [];
            _currentItem = null;
            _pendingData = null;
            resetConfirmBtn();
        };

        fetch('../../api/public/book.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(_pendingData)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                sendToSheet(_pendingData, res.order_code);
                onSuccess(res.order_code);
            } else {
                if (IS_LOCAL) {
                    alert('❌ Lỗi: ' + (res.message || 'Gửi đặt lịch thất bại. Vui lòng thử lại!'));
                    resetConfirmBtn();
                } else {
                    onSuccess(null);
                }
            }
        })
        .catch(() => {
            if (IS_LOCAL) {
                alert('❌ Không thể kết nối đến server!\nVui lòng kiểm tra XAMPP đang chạy và thử lại.');
                resetConfirmBtn();
            } else {
                sendToSheet(_pendingData, null);
                alert('✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.\n\n📞 Hotline: 0775 472 347');
                bookingModal.hide();
                document.getElementById('bookingForm').reset();
                document.getElementById('bookingForm').style.display    = '';
                document.getElementById('bookingConfirm').style.display = 'none';
                hideSubServiceBtns();
                servicePrice.value  = '';
                hideBrandSelector();
                hidePricingBreakdown();
                clearMediaFiles();
                _selectedItems = [];
                _currentItem = null;
                _pendingData = null;
                resetConfirmBtn();
            }
        });
    });
}

// ==================== BRAND SELECTOR HELPERS ====================
function showBrandSelector(brandPrices, item) {
    brandOptionsContainer.innerHTML = '';
    brandPrices.forEach((bp, i) => {
        const btn = document.createElement('button');
        btn.type          = 'button';
        btn.className     = 'brand-option' + (i === 0 ? ' active' : '');
        btn.textContent   = bp.name;
        btn.dataset.brand = bp.name;
        btn.dataset.price = bp.price;
        btn.addEventListener('click', function () {
            brandOptionsContainer.querySelectorAll('.brand-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const price = Number(this.dataset.price);
            servicePrice.value = fmtVND(price);
            if (item) updatePricingBreakdown(price, item);
        });
        brandOptionsContainer.appendChild(btn);
    });
    brandSelectorWrap.style.display = '';
}

function hideBrandSelector() {
    if (brandSelectorWrap)     brandSelectorWrap.style.display     = 'none';
    if (brandOptionsContainer) brandOptionsContainer.innerHTML      = '';
}

// ==================== CLICK DELEGATION (mở modal từ card dịch vụ) ====================
document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.booking-btn');
    if (!btn) return;

    await initBookingPromise;

    const card = btn.closest('.service-item');
    if (!card) return;

    const categoryName = card.getAttribute('data-category');
    if (!categoryName) return;

    const cat = STATIC_SERVICES.find(c =>
        c.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );

    if (cat) {
        mainService.value = cat.id;
        mainService.dispatchEvent(new Event('change'));
    } else {
        mainService.value = '';
        subService.innerHTML = '<option value="">-- Chọn dịch vụ chi tiết --</option>';
        subService.disabled  = true;
    }

    servicePrice.value = '';
    hideBrandSelector();
    hidePricingBreakdown();
    _currentItem = null;
    bookingModal.show();
});

// ==================== MEDIA CAPTURE ====================
// Lưu trữ danh sách file đã chọn (mảng File objects)
let _mediaFiles = [];

function setupMediaCapture() {
    const photoInput   = document.getElementById('mediaPhotoInput');
    const videoInput   = document.getElementById('mediaVideoInput');
    const photoBtn     = document.getElementById('photoCaptureBtn');
    const videoBtn     = document.getElementById('videoCaptureBtn');
    const previewBox   = document.getElementById('mediaPreviewContainer');
    if (!photoInput || !videoInput) return;

    photoBtn.addEventListener('click', () => photoInput.click());
    videoBtn.addEventListener('click', () => videoInput.click());

    photoInput.addEventListener('change', function () {
        Array.from(this.files).forEach(f => addMediaFile(f, previewBox));
        this.value = ''; // reset để chọn lại cùng file nếu muốn
    });

    videoInput.addEventListener('change', function () {
        Array.from(this.files).forEach(f => addMediaFile(f, previewBox));
        this.value = '';
    });
}

function addMediaFile(file, previewBox) {
    const id = Date.now() + Math.random();
    _mediaFiles.push({ id, file });

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid rgba(17,153,142,0.4);';
    wrap.dataset.mediaId = id;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '&times;';
    removeBtn.style.cssText = 'position:absolute;top:2px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;line-height:16px;cursor:pointer;padding:0;z-index:1;';
    removeBtn.addEventListener('click', () => {
        _mediaFiles = _mediaFiles.filter(m => m.id !== id);
        wrap.remove();
    });

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.src = URL.createObjectURL(file);
        wrap.appendChild(img);
    } else {
        const icon = document.createElement('div');
        icon.style.cssText = 'width:100%;height:100%;background:#0f2027;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;';
        icon.innerHTML = '<i class="fas fa-video" style="color:#38ef7d;font-size:1.4rem;"></i><span style="color:#ccc;font-size:0.6rem;text-align:center;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;">' + file.name + '</span>';
        wrap.appendChild(icon);
    }

    wrap.appendChild(removeBtn);
    previewBox.appendChild(wrap);
}

function clearMediaFiles() {
    _mediaFiles = [];
    const previewBox = document.getElementById('mediaPreviewContainer');
    if (previewBox) previewBox.innerHTML = '';
}

// Khởi chạy — preload modal ngay khi script load
initBookingPromise = initBooking();
