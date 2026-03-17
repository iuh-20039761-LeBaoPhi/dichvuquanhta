/**
 * Booking JavaScript - Xử lý đặt lịch dịch vụ
 * Modal HTML được load động từ partials/booking-modal.html
 *
 * Công thức tính giá:
 *   basePrice    = giá hãng đã chọn (hoặc giá mặc định)
 *   travelMin/Max = phí di chuyển min–max (fallback: fixed nếu không có distance thực tế)
 *   surveyAmount = phí khảo sát (chỉ tính khi required = true)
 *   estimatedMin = basePrice + travelMin + surveyAmount
 *   estimatedMax = basePrice + travelMax + surveyAmount
 */

// true khi chạy trên localhost/XAMPP, false khi chạy web tĩnh
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

// ==================== DOM REFS (khởi tạo sau khi modal load) ====================
let bookingModal, mainService, subService, servicePrice, brandSelectorWrap, brandOptionsContainer;
let pricingBreakdownWrap;
let STATIC_SERVICES = [];
let initBookingPromise;

// Item hiện tại đang chọn (dùng để tính pricing khi submit)
let _currentItem = null;

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
    const survey    = (surveyFee && surveyFee.required) ? (surveyFee.amount || 0) : 0;

    return {
        travelMin,
        travelMax,
        survey,
        totalMin: basePrice + travelMin + survey,
        totalMax: basePrice + travelMax + survey,
        hasFees:  travelMax > 0 || survey > 0
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

    const bdService = document.getElementById('bd-service');
    const bdTravelRow = document.getElementById('bd-travel-row');
    const bdTravel    = document.getElementById('bd-travel');
    const bdSurveyRow = document.getElementById('bd-survey-row');
    const bdSurvey    = document.getElementById('bd-survey');
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

    if (pricing.survey > 0 && bdSurveyRow && bdSurvey) {
        bdSurveyRow.style.removeProperty('display');
        bdSurvey.textContent = fmtVND(pricing.survey) + ' (bắt buộc, trừ vào tổng khi đặt)';
    } else if (bdSurveyRow) {
        bdSurveyRow.style.setProperty('display', 'none', 'important');
    }

    if (bdTotal) {
        bdTotal.textContent = pricing.totalMin === pricing.totalMax
            ? fmtVND(pricing.totalMin)
            : `${fmtVND(pricing.totalMin)} – ${fmtVND(pricing.totalMax)}`;
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
        const res = await fetch('partials/booking-modal.html');
        if (!res.ok) throw new Error();
        document.body.insertAdjacentHTML('beforeend', await res.text());
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

    // ==================== LOAD DATA & POPULATE DROPDOWN ====================
    fetch('data/services.json')
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
        subService.innerHTML = '<option value="">-- Chọn dịch vụ chi tiết --</option>';
        subService.disabled  = true;
        servicePrice.value   = '';
        hideBrandSelector();
        hidePricingBreakdown();
        _currentItem = null;

        if (!mainService.value) return;

        const cat = STATIC_SERVICES.find(c => c.id == mainService.value);
        if (!cat) return;

        cat.items.forEach(s => {
            const opt = document.createElement('option');
            opt.value           = s.name;
            opt.textContent     = s.name;
            opt.dataset.price   = s.price;
            subService.appendChild(opt);
        });
        subService.disabled = false;
    });

    // ==================== SUB-SERVICE CHANGE ====================
    subService.addEventListener('change', function () {
        const cat  = STATIC_SERVICES.find(c => c.id == mainService.value);
        const item = cat ? cat.items.find(i => i.name === this.value) : null;
        _currentItem = item || null;

        if (!item) {
            hideBrandSelector();
            hidePricingBreakdown();
            servicePrice.value = '';
            return;
        }

        if (item.brandPrices && item.brandPrices.length > 1) {
            showBrandSelector(item.brandPrices, item);
            const initPrice = item.brandPrices[0].price;
            servicePrice.value = fmtVND(initPrice);
            updatePricingBreakdown(initPrice, item);
        } else {
            hideBrandSelector();
            servicePrice.value = item.price ? fmtVND(item.price) : '';
            if (item.price) updatePricingBreakdown(item.price, item);
            else hidePricingBreakdown();
        }
    });

    // ==================== BOOKING SUBMIT ====================
    document.getElementById('bookingForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const activeBrand   = brandOptionsContainer.querySelector('.brand-option.active');
        const selectedBrand = activeBrand ? activeBrand.dataset.brand : null;
        const serviceName   = subService.value + (selectedBrand ? ` (${selectedBrand})` : '');

        // Tính estimated_price để gửi lên server
        let estimatedPrice = 0;
        if (_currentItem) {
            const basePrice = activeBrand ? Number(activeBrand.dataset.price) : (_currentItem.price || 0);
            const p = calcPricing(basePrice, _currentItem.travelFee, _currentItem.surveyFee);
            estimatedPrice = p.totalMin;
        }

        const data = {
            name:            document.getElementById('name').value.trim(),
            phone:           document.getElementById('phone').value.trim(),
            service_id:      serviceName,
            address:         document.getElementById('address').value.trim(),
            note:            document.getElementById('note').value.trim(),
            selected_brand:  selectedBrand,
            estimated_price: estimatedPrice
        };

        if (!data.name || !data.phone || !data.service_id || !data.address) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        if (!/^(0|\+84)[0-9]{9}$/.test(data.phone)) {
            alert('Số điện thoại không hợp lệ!');
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled  = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';

        const resetBtn = () => {
            submitBtn.disabled  = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận đặt lịch';
        };

        const onSuccess = (orderCode) => {
            const msg = orderCode
                ? `✅ Đặt lịch thành công! Mã đơn: ${orderCode}`
                : '✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.';
            alert(msg);
            bookingModal.hide();
            this.reset();
            subService.disabled = true;
            servicePrice.value  = '';
            hideBrandSelector();
            hidePricingBreakdown();
            _currentItem = null;
            resetBtn();
        };

        fetch('api/book.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                onSuccess(res.order_code);
            } else {
                if (IS_LOCAL) {
                    alert('❌ Lỗi: ' + (res.message || 'Gửi đặt lịch thất bại. Vui lòng thử lại!'));
                    resetBtn();
                } else {
                    onSuccess(null);
                }
            }
        })
        .catch(() => {
            if (IS_LOCAL) {
                alert('❌ Không thể kết nối đến server!\nVui lòng kiểm tra XAMPP đang chạy và thử lại.');
                resetBtn();
            } else {
                alert('✅ Đặt lịch thành công!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.\n\n📞 Hotline: 0775 472 347');
                bookingModal.hide();
                this.reset();
                subService.disabled = true;
                servicePrice.value  = '';
                hideBrandSelector();
                hidePricingBreakdown();
                _currentItem = null;
                resetBtn();
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

    subService.selectedIndex = 0;
    servicePrice.value = '';
    hideBrandSelector();
    hidePricingBreakdown();
    _currentItem = null;
    bookingModal.show();
});

// Khởi chạy — preload modal ngay khi script load
initBookingPromise = initBooking();
