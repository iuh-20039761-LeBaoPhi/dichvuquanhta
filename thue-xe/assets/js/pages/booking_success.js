document.addEventListener('DOMContentLoaded', () => {
    displayBookingInfo();
});

function displayBookingInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    
    if(!bookingId) {
        document.getElementById('bookingInfo').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Không tìm thấy thông tin đơn đặt xe
            </div>
        `;
        return;
    }
    
    // Display booking ID
    const html = `
        <div class="card bg-light border-0">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-4 text-md-end mb-2 mb-md-0">
                        <strong>Mã đơn đặt xe:</strong>
                    </div>
                    <div class="col-md-8">
                        <span class="badge bg-primary fs-6 px-3 py-2">
                            #${String(bookingId).padStart(6, '0')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="alert alert-info mt-3 mb-0">
            <i class="fas fa-phone me-2"></i>
            <strong>Thông tin sẽ được gửi qua:</strong><br>
            - Email đã đăng ký<br>
            - Số điện thoại đã cung cấp
        </div>
    `;
    
    document.getElementById('bookingInfo').innerHTML = html;
    
    // Fetch full booking details
    loadFullBookingDetails(bookingId);
}

// Optional: Load full booking details from API
async function loadFullBookingDetails(bookingId) {
    try {
        const result = await API.bookings.getById(bookingId);
        
        if(result.success && result.data) {
            displayFullBookingInfo(result.data);
        }
    } catch(error) {
        console.error('Error loading booking details:', error);
    }
}

function displayFullBookingInfo(booking) {
    // Read addon info from sessionStorage (saved by car_detail.js before redirect)
    let addonData = {};
    try { addonData = JSON.parse(sessionStorage.getItem('lastBookingAddons') || '{}'); } catch(e) {}

    const services = addonData.services || (booking.addon_services ? JSON.parse(booking.addon_services) : []);
    const addonTotal = addonData.addonTotal ?? (booking.addon_total || 0);
    const totalPrice = addonData.totalPrice ?? (booking.total_price || 0);

    const addonBlock = services.length ? `
        <div class="col-12">
            <small class="text-muted">Dịch vụ đi kèm:</small><br>
            <div class="d-flex flex-wrap gap-2 mt-1">
                ${services.map(s => `<span class="badge rounded-pill" style="background:var(--gradient-primary);font-size:.85rem;">${s}</span>`).join('')}
            </div>
            ${addonTotal ? `<small class="text-muted">Phí dịch vụ: +${Utils.formatPrice(addonTotal)}đ</small>` : ''}
        </div>` : '';

    const html = `
        <div class="card bg-light border-0 mb-3">
            <div class="card-body">
                <h6 class="fw-bold mb-3">Chi Tiết Đơn Hàng</h6>
                <div class="row g-2">
                    <div class="col-md-6">
                        <small class="text-muted">Mã đơn:</small><br>
                        <strong>#${String(booking.id).padStart(6, '0')}</strong>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Xe:</small><br>
                        <strong>${booking.car_name}</strong>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Ngày nhận:</small><br>
                        <strong>${Utils.formatDate(booking.pickup_date)}</strong>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Ngày trả:</small><br>
                        <strong>${Utils.formatDate(booking.return_date)}</strong>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Số ngày:</small><br>
                        <strong>${booking.total_days} ngày</strong>
                    </div>
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

    document.getElementById('bookingInfo').innerHTML = html;
    sessionStorage.removeItem('lastBookingAddons');
}