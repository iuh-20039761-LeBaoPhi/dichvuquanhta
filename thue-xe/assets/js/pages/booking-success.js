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

    // Đọc dữ liệu từ URL params (được car_detail.js truyền vào khi redirect)
    const urlDays       = parseInt(sp.get('days')        || '0');
    const urlAddons     = sp.get('addons') ? sp.get('addons').split('|').filter(Boolean) : [];
    const urlAddonTotal = parseInt(sp.get('addon_total') || '0');
    const urlTotal      = parseInt(sp.get('total')       || '0');

    // Hiển thị ngay từ URL params (không cần đợi API)
    if (urlTotal > 0) {
        renderBookingCard(bookingId, null, urlDays, urlAddons, urlAddonTotal, urlTotal);
    } else {
        // Fallback khi không có URL params (truy cập trực tiếp)
        document.getElementById('bookingInfo').innerHTML = `
            <div class="card bg-light border-0">
                <div class="card-body">
                    <div class="d-flex align-items-center gap-3">
                        <strong>Mã đơn đặt xe:</strong>
                        <span class="badge bg-primary fs-6 px-3 py-2">
                            #${String(bookingId).padStart(6, '0')}
                        </span>
                    </div>
                </div>
            </div>
            <div class="alert alert-info mt-3 mb-0">
                <i class="fas fa-phone me-2"></i>
                <strong>Thông tin sẽ được xác nhận qua điện thoại và email của bạn.</strong>
            </div>
        `;
    }

    // Gọi API để bổ sung tên xe, ngày nhận/trả (nếu có backend)
    loadFullBookingDetails(bookingId, urlDays, urlAddons, urlAddonTotal, urlTotal);
}

async function loadFullBookingDetails(bookingId, urlDays, urlAddons, urlAddonTotal, urlTotal) {
    try {
        const result = await API.bookings.getById(bookingId);
        if (result.success && result.data) {
            renderBookingCard(bookingId, result.data, urlDays, urlAddons, urlAddonTotal, urlTotal);
        }
    } catch (error) {
        console.error('Error loading booking details:', error);
    }
}

function renderBookingCard(bookingId, booking, urlDays, urlAddons, urlAddonTotal, urlTotal) {
    const carName    = booking?.car_name   || '';
    const pickupDate = booking?.pickup_date || '';
    const returnDate = booking?.return_date || '';

    // URL params ưu tiên; nếu không có, fallback về dữ liệu từ DB
    const apiAddons  = booking?.addon_services ? (
        typeof booking.addon_services === 'string'
            ? JSON.parse(booking.addon_services)
            : booking.addon_services
    ) : [];
    const services   = urlAddons.length  ? urlAddons  : apiAddons;
    const addonTotal = urlAddonTotal || Number(booking?.addon_total  || 0);
    const totalPrice = urlTotal      || Number(booking?.total_price  || 0);
    const days       = urlDays       || booking?.total_days           || '';

    const addonBlock = services.length ? `
        <div class="col-12">
            <small class="text-muted">Dịch vụ đi kèm:</small><br>
            <div class="d-flex flex-wrap gap-2 mt-1">
                ${services.map(s => `<span class="badge rounded-pill" style="background:var(--gradient-primary);font-size:.85rem;">${s}</span>`).join('')}
            </div>
            ${addonTotal ? `<small class="text-muted">Phí dịch vụ: +${Utils.formatPrice(addonTotal)}đ</small>` : ''}
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
                        <strong>${Utils.formatDate(pickupDate)}</strong>
                    </div>` : ''}
                    ${returnDate ? `<div class="col-md-6">
                        <small class="text-muted">Ngày trả:</small><br>
                        <strong>${Utils.formatDate(returnDate)}</strong>
                    </div>` : ''}
                    ${days ? `<div class="col-md-6">
                        <small class="text-muted">Số ngày:</small><br>
                        <strong>${days} ngày</strong>
                    </div>` : ''}
                    ${addonBlock}
                    <div class="col-12">
                        <hr class="my-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold">Tổng tiền:</span>
                            <strong class="text-primary fs-5">${Utils.formatPrice(totalPrice)}đ</strong>
                        </div>
                        <small class="text-muted">* Giá có thể thay đổi tuỳ thực tế</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}
