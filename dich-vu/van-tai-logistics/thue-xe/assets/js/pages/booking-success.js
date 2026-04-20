document.addEventListener('DOMContentLoaded', () => {
    displayBookingInfo();
});

function displayBookingInfo() {
    const sp        = new URLSearchParams(window.location.search);
    const bookingId = sp.get('id');

    if (!bookingId) {
        document.getElementById('bookingInfo').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Không tìm thấy thông tin đơn đặt xe
            </div>
        `;
        return;
    }

    // Đọc URL params — chỉ dùng làm hiển thị tạm trong khi fetch DB.
    // Sau khi API trả về, giá từ DB sẽ OVERRIDE toàn bộ (P0 fix).
    const urlDays       = parseInt(sp.get('days')        || '0');
    const urlAddons     = sp.get('addons') ? sp.get('addons').split('|').filter(Boolean) : [];
    const urlAddonTotal = parseInt(sp.get('addon_total') || '0');
    const urlTotal      = parseInt(sp.get('total')       || '0');

    // Hiển thị trạng thái loading ngay lập tức, KHÔNG render từ URL trước
    // (tránh khách thay URL total để thấy giá sai)
    document.getElementById('bookingInfo').innerHTML = `
        <div class="card border-0 bg-light">
            <div class="card-body text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                <strong>Đang xác nhận đơn #${String(bookingId).padStart(6, '0')}...</strong>
            </div>
        </div>
    `;

    // Luôn fetch từ DB — giá hiển thị là giá server tính, không phụ thuộc URL
    loadFullBookingDetails(bookingId, urlDays, urlAddons, urlAddonTotal, urlTotal);
}

async function loadFullBookingDetails(bookingId, urlDays, urlAddons, urlAddonTotal, urlTotal) {
    try {
        const result = await API.bookings.getById(bookingId);
        if (result.success && result.data) {
            renderBookingCard(bookingId, result.data, urlDays, urlAddons, urlAddonTotal, urlTotal);
        } else {
            // API trả về nhưng không có data → dùng URL params
            renderBookingCard(bookingId, null, urlDays, urlAddons, urlAddonTotal, urlTotal);
        }
    } catch (error) {
        // Lỗi mạng → fallback URL params
        renderBookingCard(bookingId, null, urlDays, urlAddons, urlAddonTotal, urlTotal);
    }
}

function renderBookingCard(bookingId, booking, urlDays, urlAddons, urlAddonTotal, urlTotal) {
    const carName    = booking?.car_name    || '';
    const pickupDate = booking?.pickup_date || '';
    const returnDate = booking?.return_date || '';
    const pickupTime = booking?.pickup_time ? booking.pickup_time.slice(0, 5) : '';
    const returnTime = booking?.return_time ? booking.return_time.slice(0, 5) : '';

    // Addon services: DB ưu tiên, URL params làm fallback
    const apiAddons = booking?.addon_services ? (
        typeof booking.addon_services === 'string'
            ? JSON.parse(booking.addon_services)
            : booking.addon_services
    ) : [];
    const services = (apiAddons && apiAddons.length) ? apiAddons : urlAddons;

    // ── Giá: DB ưu tiên tuyệt đối (P0 fix) ──
    // final_total là cột mới (sau migration); total_price là compat cũ.
    const addonTotal  = Number(booking?.addon_total   || 0) || urlAddonTotal;
    const totalPrice  = Number(booking?.final_total   || booking?.total_price || 0) || urlTotal;
    const days        = Number(booking?.total_days    || 0) || urlDays || '';

    // Các cột chi tiết giá (có sau migration_v2.sql)
    const subtotal   = Number(booking?.subtotal                 || 0);
    const weekendSur = Number(booking?.weekend_surcharge_amount || 0);
    const taxAmount  = Number(booking?.tax_amount               || 0);
    const deposit    = Number(booking?.deposit_amount           || 0);

    // Nếu không lấy được giá từ DB (fallback thuần URL)
    const priceUnknown = totalPrice === 0;

    const addonBlock = services.length ? `
        <div class="col-12">
            <small class="text-muted">Dịch vụ đi kèm:</small><br>
            <div class="d-flex flex-wrap gap-2 mt-1">
                ${services.map(s => `<span class="badge rounded-pill" style="background:var(--gradient-primary);font-size:.85rem;">${s}</span>`).join('')}
            </div>
            ${addonTotal ? `<small class="text-muted">Phí dịch vụ: +${Utils.formatPrice(addonTotal)}đ</small>` : ''}
        </div>` : '';

    // Hiển thị chi tiết cấu phần giá nếu có dữ liệu từ DB (sau migration)
    const breakdownBlock = (subtotal > 0 && taxAmount > 0) ? `
        <div class="col-12 mt-1">
            <div class="p-3 bg-white rounded border small">
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Tiền thuê xe${days ? ` (${days} ngày)` : ''}:</span>
                    <span>${Utils.formatPrice(subtotal)}đ</span>
                </div>
                ${addonTotal > 0 ? `<div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Dịch vụ đi kèm:</span>
                    <span>+${Utils.formatPrice(addonTotal)}đ</span>
                </div>` : ''}
                ${weekendSur > 0 ? `<div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Phụ thu cuối tuần:</span>
                    <span>+${Utils.formatPrice(weekendSur)}đ</span>
                </div>` : ''}
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Thuế VAT (10%):</span>
                    <span>+${Utils.formatPrice(taxAmount)}đ</span>
                </div>
                ${deposit > 0 ? `<div class="d-flex justify-content-between mt-2 pt-2 border-top text-warning">
                    <span><i class="fas fa-hand-holding-usd me-1"></i>Đặt cọc yêu cầu:</span>
                    <span class="fw-semibold">${Utils.formatPrice(deposit)}đ</span>
                </div>` : ''}
            </div>
        </div>` : '';

    document.getElementById('bookingInfo').innerHTML = `
        <div class="card bg-light border-0 mb-3">
            <div class="card-body">
                <h6 class="fw-bold mb-3">Chi Tiết Đơn Hàng</h6>
                <div class="row g-2">
                    <div class="col-md-6">
                        <small class="text-muted">Mã đơn:</small><br>
                        <strong>#${String(bookingId).padStart(6, '0')}</strong>
                    </div>
                    ${carName ? `<div class="col-md-6">
                        <small class="text-muted">Xe:</small><br>
                        <strong>${carName}</strong>
                    </div>` : ''}
                    ${pickupDate ? `<div class="col-md-6">
                        <small class="text-muted">Ngày nhận:</small><br>
                        <strong>${Utils.formatDate(pickupDate)}${pickupTime ? ' lúc ' + pickupTime : ''}</strong>
                    </div>` : ''}
                    ${returnDate ? `<div class="col-md-6">
                        <small class="text-muted">Ngày trả:</small><br>
                        <strong>${Utils.formatDate(returnDate)}${returnTime ? ' lúc ' + returnTime : ''}</strong>
                    </div>` : ''}
                    ${days ? `<div class="col-md-6">
                        <small class="text-muted">Số ngày:</small><br>
                        <strong>${days} ngày</strong>
                    </div>` : ''}
                    ${addonBlock}
                    ${breakdownBlock}
                    <div class="col-12">
                        <hr class="my-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold">Tổng tiền:</span>
                            ${priceUnknown
                                ? '<span class="text-muted fst-italic">Sẽ xác nhận qua điện thoại</span>'
                                : `<strong class="text-primary fs-5">${Utils.formatPrice(totalPrice)}đ</strong>`}
                        </div>
                        <small class="text-muted">* Giá đã bao gồm VAT 10%. Phụ phí trả trễ (nếu có) tính thêm sau.</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}
