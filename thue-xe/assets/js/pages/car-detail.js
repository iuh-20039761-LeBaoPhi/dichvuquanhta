/**
 * Car Detail Page JavaScript
 */

let currentCar = null;
let currentImages = [];
let bookingModalSetup = false;
let bookingModalSetupPromise = null;

// Sẽ được nạp từ API.services.getAll() khi khởi động
let ADDON_SERVICES = [];
let ADDON_PRICES   = {}; // { 'Tên dịch vụ': { price, unit } }

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

    // Tải song song: thông tin xe + danh sách dịch vụ addon
    const [result, svcResult] = await Promise.all([
        API.cars.getById(carId),
        API.services.getAll()
    ]);

    // Xây dựng ADDON_PRICES từ dữ liệu API
    if (svcResult.success && svcResult.data && svcResult.data.length) {
        ADDON_SERVICES = svcResult.data;
        ADDON_PRICES = {};
        svcResult.data.forEach(svc => {
            ADDON_PRICES[svc.name] = { price: Number(svc.price), unit: svc.unit || 'chuyến' };
        });
    } else {
        // Fallback cứng khi cả static-data không có unit
        ADDON_SERVICES = [
            { id:1, name:'Giao xe tận nơi',  icon:'map-marker-alt', price:100000, unit:'chuyến', description:'Giao xe đến tận địa chỉ của bạn' },
            { id:2, name:'Bảo hiểm mở rộng', icon:'shield-alt',    price:150000, unit:'ngày',    description:'Bảo hiểm toàn diện an tâm hơn' },
            { id:3, name:'Xe có tài xế',      icon:'user-tie',      price:300000, unit:'ngày',    description:'Tài xế chuyên nghiệp, lịch sự' },
            { id:4, name:'GPS định vị',       icon:'map-marker-alt',price: 50000, unit:'chuyến', description:'Dẫn đường chính xác, không lo lạc' },
            { id:5, name:'Ghế trẻ em',        icon:'baby',          price:100000, unit:'chuyến', description:'An toàn cho bé dưới 10 tuổi' },
            { id:6, name:'WiFi di động',      icon:'wifi',          price: 80000, unit:'chuyến', description:'Kết nối internet ổn định' },
        ];
        ADDON_SERVICES.forEach(svc => {
            ADDON_PRICES[svc.name] = { price: svc.price, unit: svc.unit };
        });
    }

    if(result.success && result.data) {
        currentCar = result.data.car;
        currentImages = result.data.images || [];

        // Update page SEO dynamically
        const car = result.data.car;
        const SITE_BASE = 'https://iuh-20039761-lebaophi.github.io/GlobalCare/thue-xe';
        const carUrl = `${SITE_BASE}/car-detail.html?id=${car.id}`;
        const carImg = `${SITE_BASE}/assets/images/cars/${car.main_image}`;
        const carTitle = `${car.name} – Thuê Xe TP.HCM | ${new Intl.NumberFormat('vi-VN').format(car.price_per_day)}đ/ngày`;
        const carDesc = `Thuê ${car.name} tại Thuê Xe TP.HCM. ${car.seats} chỗ, ${car.transmission}, ${car.fuel_type}. Giá chỉ từ ${new Intl.NumberFormat('vi-VN').format(car.price_per_day)}đ/ngày. Giao xe tận nơi, bảo hiểm đầy đủ.`;
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
                         onerror="this.src='assets/images/cars/thue-xe-xe-anh-mac-dinh-fallback.jpg'">
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
                                     onerror="this.src='assets/images/cars/thue-xe-xe-anh-mac-dinh-fallback.jpg'">
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

                <h5 class="fw-bold mb-3">Thông Tin Chi Tiết</h5>
                <div class="row g-2 mb-3">
                    <div class="col-6 col-md-4">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted d-block mb-1"><i class="fas fa-id-card me-1 text-primary"></i>Biển số</small>
                            <span class="fw-bold">${car.license_plate || '—'}</span>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted d-block mb-1"><i class="fas fa-calendar-alt me-1 text-primary"></i>Năm sản xuất</small>
                            <span class="fw-bold">${car.manufacture_year || car.year || '—'}</span>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted d-block mb-1"><i class="fas fa-tachometer-alt me-1 text-primary"></i>Quãng đường đã chạy</small>
                            <span class="fw-bold">${car.mileage != null ? Number(car.mileage).toLocaleString('vi-VN') + ' km' : '—'}</span>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted d-block mb-1"><i class="fas fa-palette me-1 text-primary"></i>Màu xe</small>
                            <span class="fw-bold">${car.color || '—'}</span>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted d-block mb-1"><i class="fas fa-industry me-1 text-primary"></i>Hãng xe</small>
                            <span class="fw-bold">${car.brand || '—'}</span>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted d-block mb-1"><i class="fas fa-car me-1 text-primary"></i>Loại xe</small>
                            <span class="fw-bold">${car.car_type || '—'}</span>
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
                        <div class="row g-1">
                            <div class="col-7">
                                <input type="date" class="form-control" id="pickupDate" required min="${getTodayDate()}">
                            </div>
                            <div class="col-5">
                                <input type="time" class="form-control" id="pickupTime" value="08:00" title="Giờ nhận xe">
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Ngày trả xe *</label>
                        <div class="row g-1">
                            <div class="col-7">
                                <input type="date" class="form-control" id="returnDate" required min="${getTodayDate()}">
                            </div>
                            <div class="col-5">
                                <input type="time" class="form-control" id="returnTime" value="08:00" title="Giờ trả xe">
                            </div>
                        </div>
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
                    
                    <button type="button" class="btn btn-gradient w-100" onclick="openBookingModal()">
                        <i class="fas fa-calendar-check me-2"></i>Đặt xe ngay
                    </button>
                </form>
                
                <hr>
                
                <div class="text-center">
                    <p class="mb-2"><i class="fas fa-phone text-primary me-2"></i><strong>0775 472 347</strong></p>
                    <p class="mb-0 small text-muted">Hỗ trợ 24/7</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('bookingForm').innerHTML = html;
    
    // Setup date change listeners
    setupDateCalculation(car.price_per_day);
    
    // Preload modal in background
    bookingModalSetupPromise = setupBookingModal(car);
}

async function openBookingModal() {
    // Đảm bảo modal đã load xong trước khi mở
    if (bookingModalSetupPromise) await bookingModalSetupPromise;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).show();
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

async function loadBookingModal() {
    if (document.getElementById('bookingModal')) return;
    const res = await fetch('views/partials/booking-modal.html');
    const html = await res.text();
    document.body.insertAdjacentHTML('beforeend', html);
}

async function setupBookingModal(car) {
    await loadBookingModal();

    // Inject addon checkboxes động
    document.getElementById('addonServiceList').innerHTML = renderAddonCheckboxes();

    // Setup addon price recalculation on checkbox change
    document.querySelectorAll('input[name="addon_services"]').forEach(cb => {
        cb.addEventListener('change', () => recalcAddonSummary(car.price_per_day));
    });
    document.getElementById('bookingModal').addEventListener('show.bs.modal', () => {
        recalcAddonSummary(car.price_per_day);
        bookingAutoFillTX();
    });

    // Setup form submission
    document.getElementById('bookingFormFull').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitBooking(car);
    });
}

function renderAddonCheckboxes() {
    if (!ADDON_SERVICES.length) return '<p class="text-muted small py-2">Không có dịch vụ đi kèm</p>';
    const UNIT_LABELS = { 'ngày': '/ngày', 'chuyến': '/chuyến' };
    return ADDON_SERVICES.map(svc => `
        <div class="col-md-6">
            <div class="form-check border rounded p-2 h-100">
                <input class="form-check-input" type="checkbox" name="addon_services"
                       value="${svc.name}" id="svc_${svc.id}">
                <label class="form-check-label w-100" for="svc_${svc.id}">
                    <i class="fas fa-${svc.icon} text-primary me-1"></i> ${svc.name}
                    <span class="float-end text-primary fw-semibold">+${Utils.formatPrice(svc.price)}đ${UNIT_LABELS[svc.unit] || ''}</span>
                    <small class="d-block text-muted">${svc.description || ''}</small>
                </label>
            </div>
        </div>
    `).join('');
}


async function submitBooking(car) {
    const form = document.getElementById('bookingFormFull');
    const formData = new FormData(form);
    
    // Get dates + times from quick form
    const pickupDate = document.getElementById('pickupDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const pickupTime = document.getElementById('pickupTime')?.value || '08:00';
    const returnTime = document.getElementById('returnTime')?.value || '08:00';

    if(!pickupDate || !returnDate) {
        showBookingAlert('Vui lòng chọn ngày nhận và trả xe!', 'danger');
        return;
    }
    if(returnDate < pickupDate || (returnDate === pickupDate && returnTime <= pickupTime)) {
        showBookingAlert('Thời gian trả xe phải sau thời gian nhận xe!', 'danger');
        return;
    }

    // Validate form fields
    const phone = formData.get('customer_phone');
    const email = formData.get('customer_email');
    const idNumber = formData.get('id_number');
    if(!/^0[3-9][0-9]{8}$/.test(phone)) {
        showBookingAlert('Số điện thoại không hợp lệ! Vui lòng nhập 10 chữ số bắt đầu bằng 03x / 05x / 07x / 08x / 09x.', 'danger');
        return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showBookingAlert('Email không hợp lệ!', 'danger');
        return;
    }
    if(idNumber && !/^[0-9]{9}$|^[0-9]{12}$/.test(idNumber)) {
        showBookingAlert('CMND/CCCD không hợp lệ! Phải gồm 9 hoặc 12 chữ số.', 'danger');
        return;
    }
    
    // Collect selected addon services and calculate addon total
    const addonServices = [...document.querySelectorAll('input[name="addon_services"]:checked')]
        .map(cb => cb.value);
    const days = Utils.calculateDays(pickupDate, returnDate) || 0;
    const addonTotal = addonServices.reduce((sum, name) => {
        const info = ADDON_PRICES[name];
        if (!info) return sum;
        return sum + (info.unit === 'ngày' ? info.price * days : info.price);
    }, 0);

    // Prepare data — price_per_day / addon_total / total_price bị loại bỏ;
    // server tự tính lại từ DB (P0 fix).
    const bookingData = {
        car_id:           car.id,
        car_name:         car.name,
        customer_name:    formData.get('customer_name'),
        customer_email:   formData.get('customer_email'),
        customer_phone:   formData.get('customer_phone'),
        customer_address: formData.get('customer_address'),
        id_number:        formData.get('id_number'),
        pickup_date:      pickupDate,
        return_date:      returnDate,
        pickup_time:      pickupTime,   // giờ nhận xe
        return_time:      returnTime,   // giờ trả xe
        pickup_location:  formData.get('pickup_location'),
        notes:            formData.get('notes'),
        addon_services:   addonServices, // server tra giá từ DB theo tên
    };
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
    
    try {
        const result = await API.bookings.create(bookingData);

        if(result.success) {
            // Dùng giá server trả về (authoritative) cho URL params
            // để trang success hiển thị ngay trước khi fetch API
            const sp = new URLSearchParams({ page: 'booking-success', id: result.booking_id });
            sp.set('days',        result.total_days      ?? days);
            sp.set('addon_total', result.addon_total     ?? addonTotal);
            sp.set('total',       result.final_total     ?? 0);
            if (addonServices.length) sp.set('addons', addonServices.join('|'));
            window.location.href = 'index.php?' + sp.toString();
        } else if(result.demo) {
            // Static / no-server fallback: show demo success
            const addonLines = addonServices.length
                ? `<br><br><strong>Dịch vụ đi kèm:</strong> ${addonServices.join(', ')}`
                : '';
            const totalLine = `<br><strong>Tổng tiền ước tính: ${Utils.formatPrice(bookingData.total_price)}đ</strong>`;
            showBookingAlert(`
                <i class="fas fa-check-circle me-2"></i>
                <strong>Đặt xe thành công! (Demo)</strong><br>
                Cảm ơn bạn đã quan tâm đến <strong>${car.name}</strong>.
                ${addonLines}${totalLine}<br>
                Để hoàn tất đặt xe, vui lòng gọi hotline <strong>0775 472 347</strong> – hỗ trợ 24/7.
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

function recalcAddonSummary(pricePerDay) {
    const pickup = document.getElementById('pickupDate').value;
    const ret    = document.getElementById('returnDate').value;
    const days   = (pickup && ret && ret > pickup) ? Utils.calculateDays(pickup, ret) : 0;

    const checked = [...document.querySelectorAll('input[name="addon_services"]:checked')];
    const summaryEl = document.getElementById('addonSummary');

    if (!days && !checked.length) { summaryEl.style.display = 'none'; return; }

    const carTotal = days * pricePerDay;
    let addonTotal = 0;
    let addonLines = '';

    checked.forEach(cb => {
        const info = ADDON_PRICES[cb.value];
        if (!info) return;
        const cost = info.unit === 'ngày' ? info.price * days : info.price;
        addonTotal += cost;
        addonLines += `<div class="d-flex justify-content-between mb-1">
            <span class="text-muted">${cb.value}:</span>
            <span>+${Utils.formatPrice(cost)}đ</span>
        </div>`;
    });

    document.getElementById('summaryCarPrice').textContent = Utils.formatPrice(carTotal) + 'đ';
    document.getElementById('summaryAddonList').innerHTML = addonLines;
    document.getElementById('summaryTotal').textContent = Utils.formatPrice(carTotal + addonTotal) + 'đ';
    summaryEl.style.display = 'block';
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

// --- Booking auto-fill from session ---
var _txSession = null;

function bookingAutoFillTX() {
    _txSession = null; // reset mỗi lần mở modal
    fetch('controllers/check-session.php')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            _txSession = data;
            var banner = document.getElementById('bookingAuthBanner');
            if (!banner) return;

            if (data.logged_in && data.role === 'customer') {
                // Auto-fill ngay
                var form = document.getElementById('bookingFormFull');
                if (form) {
                    var nameEl  = form.querySelector('[name="customer_name"]');
                    var phoneEl = form.querySelector('[name="customer_phone"]');
                    var emailEl = form.querySelector('[name="customer_email"]');
                    if (nameEl  && data.name)  nameEl.value  = data.name;
                    if (phoneEl && data.phone) phoneEl.value = data.phone;
                    if (emailEl && data.email) emailEl.value = data.email;
                }
                banner.innerHTML =
                    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px;">' +
                        '<span style="font-size:0.83rem;color:#1e40af;"><i class="fas fa-user-check me-2"></i>Đã đăng nhập: <strong>' + (data.name || '') + '</strong></span>' +
                        '<button type="button" onclick="bookingAutoFillClick()" ' +
                            'style="background:linear-gradient(135deg,#3B82F6,#1E40AF);color:white;border:none;padding:5px 14px;border-radius:50px;font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap;">' +
                            '<i class="fas fa-magic me-1"></i>Tự điền thông tin' +
                        '</button>' +
                    '</div>';
            } else {
                banner.innerHTML =
                    '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:0.83rem;color:#92400e;margin-bottom:4px;">' +
                        '<i class="fas fa-info-circle me-2"></i>' +
                        '<a href="customer-login.html" style="color:#d97706;font-weight:600;text-decoration:none;">Đăng nhập</a>' +
                        ' để tự động điền tên, số điện thoại và email.' +
                    '</div>';
            }
        })
        .catch(function () { /* im lặng nếu lỗi */ });
}

window.bookingAutoFillClick = function () {
    if (!_txSession || !_txSession.logged_in) return;
    var form = document.getElementById('bookingFormFull');
    if (!form) return;
    var nameEl  = form.querySelector('[name="customer_name"]');
    var phoneEl = form.querySelector('[name="customer_phone"]');
    var emailEl = form.querySelector('[name="customer_email"]');
    if (nameEl  && _txSession.name)  nameEl.value  = _txSession.name;
    if (phoneEl && _txSession.phone) phoneEl.value = _txSession.phone;
    if (emailEl && _txSession.email) emailEl.value = _txSession.email;
};
window.openBookingModal = openBookingModal;