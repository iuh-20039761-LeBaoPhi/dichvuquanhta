/**
 * Car Detail Page JavaScript
 */

let currentCar = null;
let currentImages = [];

document.addEventListener('DOMContentLoaded', async () => {
    const carId = Utils.getUrlParam('id');
    
    if(!carId) {
        window.location.href = 'index.php?page=home';
        return;
    }
    
    await loadCarDetail(carId);
});

async function loadCarDetail(carId) {
    // Show loading
    Utils.showLoading(document.getElementById('carDetail'));
    Utils.showLoading(document.getElementById('bookingForm'));
    
    // Call API
    const result = await API.cars.getById(carId);
    
    if(result.success && result.data) {
        currentCar = result.data.car;
        currentImages = result.data.images || [];

        // Update page SEO dynamically
        const car = result.data.car;
        const SITE_BASE = 'https://iuh-20039761-lebaophi.github.io/GlobalCare/thue-xe';
        const carUrl = `${SITE_BASE}/car_detail.html?id=${car.id}`;
        const carImg = `${SITE_BASE}/assets/images/cars/${car.main_image}`;
        const carTitle = `${car.name} – Thuê Xe TP.HCM | ${new Intl.NumberFormat('vi-VN').format(car.price_per_day)}đ/ngày`;
        const carDesc = `Thuê ${car.name} tại CarRental TP.HCM. ${car.seats} chỗ, ${car.transmission}, ${car.fuel_type}. Giá chỉ từ ${new Intl.NumberFormat('vi-VN').format(car.price_per_day)}đ/ngày. Giao xe tận nơi, bảo hiểm đầy đủ.`;
        document.title = carTitle;
        const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
        setMeta('meta[name="description"]', 'content', carDesc);
        setMeta('meta[property="og:title"]', 'content', carTitle);
        setMeta('meta[property="og:description"]', 'content', carDesc);
        setMeta('meta[property="og:url"]', 'content', carUrl);
        setMeta('meta[property="og:image"]', 'content', carImg);
        setMeta('meta[name="twitter:title"]', 'content', carTitle);
        setMeta('meta[name="twitter:description"]', 'content', carDesc);
        setMeta('meta[name="twitter:image"]', 'content', carImg);
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = carUrl;

        displayCarDetail(result.data);
        displayBookingForm(result.data.car);
    } else {
        document.getElementById('carDetail').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Không tìm thấy xe hoặc xe không còn tồn tại
            </div>
            <a href="index.php?page=home" class="btn btn-gradient">
                <i class="fas fa-arrow-left me-2"></i>Về trang chủ
            </a>
        `;
    }
}

function displayCarDetail(data) {
    const car = data.car;
    const images = data.images || [];
    
    // Prepare images array
    const allImages = [
        {path: car.main_image, is_main: true},
        ...images.map(img => ({path: img.image_path, is_main: false}))
    ];
    
    const features = car.features ? car.features.split(',') : [];
    
    const html = `
        <!-- Image Gallery -->
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-0">
                <!-- Main Image -->
                <div id="carMainImage" class="position-relative">
                    <img src="assets/images/cars/${allImages[0].path}" 
                         class="w-100" 
                         style="height: 400px; object-fit: cover; border-radius: 8px 8px 0 0;"
                         alt="${car.name}"
                         onerror="this.src='assets/images/cars/default.jpg'">
                    <span class="badge badge-status ${car.status === 'available' ? 'badge-available' : 'badge-rented'}" 
                          style="position: absolute; top: 20px; right: 20px;">
                        ${car.status === 'available' ? 'Có sẵn' : 'Đã thuê'}
                    </span>
                </div>
                
                <!-- Thumbnail Gallery -->
                ${allImages.length > 1 ? `
                <div class="p-3">
                    <div class="row g-2" id="imageThumbnails">
                        ${allImages.map((img, index) => `
                            <div class="col-3">
                                <img src="assets/images/cars/${img.path}" 
                                     class="img-thumbnail cursor-pointer ${index === 0 ? 'border-primary' : ''}" 
                                     style="height: 80px; object-fit: cover; cursor: pointer;"
                                     onclick="changeMainImage('${img.path}', ${index})"
                                     onerror="this.src='assets/images/cars/default.jpg'">
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Car Info -->
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-4">
                <h1 class="fw-bold mb-3 fs-3">${car.name}</h1>
                <div class="d-flex align-items-center mb-3">
                    <span class="badge bg-primary me-2">${car.brand}</span>
                    <span class="badge bg-secondary me-2">${car.model}</span>
                    <span class="badge bg-info">${car.year}</span>
                </div>
                
                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                                <i class="fas fa-users text-primary"></i>
                            </div>
                            <div>
                                <small class="text-muted">Số chỗ</small>
                                <p class="mb-0 fw-bold">${car.seats} chỗ</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle bg-secondary bg-opacity-10 p-3 me-3">
                                <i class="fas fa-cog text-secondary"></i>
                            </div>
                            <div>
                                <small class="text-muted">Hộp số</small>
                                <p class="mb-0 fw-bold">${car.transmission}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                                <i class="fas fa-gas-pump text-success"></i>
                            </div>
                            <div>
                                <small class="text-muted">Nhiên liệu</small>
                                <p class="mb-0 fw-bold">${car.fuel_type}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                                <i class="fas fa-dollar-sign text-warning"></i>
                            </div>
                            <div>
                                <small class="text-muted">Giá thuê</small>
                                <p class="mb-0 fw-bold text-primary">${Utils.formatPrice(car.price_per_day)}đ</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <hr>
                
                <h5 class="fw-bold mb-3">Mô Tả</h5>
                <p class="text-muted">${car.description || 'Không có mô tả'}</p>
                
                ${features.length > 0 ? `
                <hr>
                <h5 class="fw-bold mb-3">Tính Năng</h5>
                <div class="row g-2">
                    ${features.map(feature => `
                        <div class="col-md-6">
                            <i class="fas fa-check-circle text-success me-2"></i>
                            <span>${feature.trim()}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('carDetail').innerHTML = html;
}

function changeMainImage(imagePath, index) {
    // Update main image
    const mainImg = document.querySelector('#carMainImage img');
    mainImg.src = `assets/images/cars/${imagePath}`;
    
    // Update thumbnail borders
    document.querySelectorAll('#imageThumbnails img').forEach((thumb, i) => {
        if(i === index) {
            thumb.classList.add('border-primary');
        } else {
            thumb.classList.remove('border-primary');
        }
    });
}

function displayBookingForm(car) {
    const html = `
        <div class="card border-0 shadow-sm sticky-top booking-sticky" style="top: 90px;">
            <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Đặt Xe Ngay</h5>
                
                <div class="mb-3 p-3 bg-light rounded">
                    <h6 class="fw-bold mb-2">${car.name}</h6>
                    <p class="mb-0 text-primary fw-bold">${Utils.formatPrice(car.price_per_day)}đ <small class="text-muted">/ ngày</small></p>
                </div>
                
                <form id="quickBookingForm">
                    <div class="mb-3">
                        <label class="form-label">Ngày nhận xe *</label>
                        <input type="date" class="form-control" id="pickupDate" required min="${getTodayDate()}">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Ngày trả xe *</label>
                        <input type="date" class="form-control" id="returnDate" required min="${getTodayDate()}">
                    </div>
                    
                    <div id="priceCalculation" class="mb-3 p-3 bg-light rounded" style="display: none;">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Số ngày:</span>
                            <strong id="totalDays">0</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Tổng tiền:</span>
                            <strong class="text-primary" id="totalPrice">0đ</strong>
                        </div>
                    </div>
                    
                    <button type="button" class="btn btn-gradient w-100" data-bs-toggle="modal" data-bs-target="#bookingModal">
                        <i class="fas fa-calendar-check me-2"></i>Đặt xe ngay
                    </button>
                </form>
                
                <hr>
                
                <div class="text-center">
                    <p class="mb-2"><i class="fas fa-phone text-primary me-2"></i><strong>0123 456 789</strong></p>
                    <p class="mb-0 small text-muted">Hỗ trợ 24/7</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('bookingForm').innerHTML = html;
    
    // Setup date change listeners
    setupDateCalculation(car.price_per_day);
    
    // Setup booking modal
    setupBookingModal(car);
}

function setupDateCalculation(pricePerDay) {
    const pickupInput = document.getElementById('pickupDate');
    const returnInput = document.getElementById('returnDate');
    
    const calculate = () => {
        if(pickupInput.value && returnInput.value) {
            const days = Utils.calculateDays(pickupInput.value, returnInput.value);
            const total = days * pricePerDay;
            
            document.getElementById('totalDays').textContent = days + ' ngày';
            document.getElementById('totalPrice').textContent = Utils.formatPrice(total) + 'đ';
            document.getElementById('priceCalculation').style.display = 'block';
            
            // Update return date min
            returnInput.min = pickupInput.value;
        }
    };
    
    pickupInput.addEventListener('change', calculate);
    returnInput.addEventListener('change', calculate);
}

function setupBookingModal(car) {
    // Create modal if not exists
    if(!document.getElementById('bookingModal')) {
        const modal = createBookingModal();
        document.body.insertAdjacentHTML('beforeend', modal);
    }
    
    // Setup form submission
    document.getElementById('bookingFormFull').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitBooking(car);
    });
}

function createBookingModal() {
    return `
        <div class="modal fade" id="bookingModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Thông Tin Đặt Xe</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="bookingAlert"></div>
                        
                        <form id="bookingFormFull">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Họ và tên *</label>
                                    <input type="text" class="form-control" name="customer_name" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Số điện thoại *</label>
                                    <input type="tel" class="form-control" name="customer_phone" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Email *</label>
                                    <input type="email" class="form-control" name="customer_email" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">CMND/CCCD</label>
                                    <input type="text" class="form-control" name="id_number">
                                </div>
                                <div class="col-md-12">
                                    <label class="form-label">Địa chỉ *</label>
                                    <textarea class="form-control" name="customer_address" rows="2" required></textarea>
                                </div>
                                <div class="col-md-12">
                                    <label class="form-label">Địa điểm nhận xe</label>
                                    <input type="text" class="form-control" name="pickup_location" placeholder="Để trống nếu nhận tại văn phòng">
                                </div>
                                <div class="col-md-12">
                                    <label class="form-label">Ghi chú</label>
                                    <textarea class="form-control" name="notes" rows="2"></textarea>
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <button type="submit" class="btn btn-gradient w-100">
                                    <i class="fas fa-check me-2"></i>Xác nhận đặt xe
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function submitBooking(car) {
    const form = document.getElementById('bookingFormFull');
    const formData = new FormData(form);
    
    // Get dates from quick form
    const pickupDate = document.getElementById('pickupDate').value;
    const returnDate = document.getElementById('returnDate').value;
    
    if(!pickupDate || !returnDate) {
        showBookingAlert('Vui lòng chọn ngày nhận và trả xe!', 'danger');
        return;
    }
    
    // Prepare data
    const bookingData = {
        car_id: car.id,
        customer_name: formData.get('customer_name'),
        customer_email: formData.get('customer_email'),
        customer_phone: formData.get('customer_phone'),
        customer_address: formData.get('customer_address'),
        id_number: formData.get('id_number'),
        pickup_date: pickupDate,
        return_date: returnDate,
        pickup_location: formData.get('pickup_location'),
        notes: formData.get('notes'),
        price_per_day: car.price_per_day
    };
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
    
    try {
        const result = await API.bookings.create(bookingData);

        if(result.success) {
            // Redirect to success page
            window.location.href = `index.php?page=booking_success&id=${result.booking_id}`;
        } else if(result.demo) {
            // Static / no-server fallback: show demo success
            showBookingAlert(`
                <i class="fas fa-check-circle me-2"></i>
                <strong>Đặt xe thành công! (Demo)</strong><br>
                Cảm ơn bạn đã quan tâm đến <strong>${car.name}</strong>.<br>
                Để hoàn tất đặt xe, vui lòng gọi hotline <strong>0123 456 789</strong> – hỗ trợ 24/7.
            `, 'success');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        } else {
            showBookingAlert(result.message || 'Có lỗi xảy ra!', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch(error) {
        showBookingAlert('Có lỗi xảy ra. Vui lòng thử lại!', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showBookingAlert(message, type) {
    const alertDiv = document.getElementById('bookingAlert');
    alertDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Export functions
window.changeMainImage = changeMainImage;