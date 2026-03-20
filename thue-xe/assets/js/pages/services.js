document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadRentalCars(), loadServices()]);
});

async function loadRentalCars() {
    const container = document.getElementById('rentalCarList');
    if (!container) return;

    Utils.showLoading(container);

    try {
        const data = await STATIC_DATA_PROMISE;
        const carTypes = data.car_types || [];
        const cars = data.cars || [];
        const availableByType = cars.reduce((acc, car) => {
            if (car.status === 'available') {
                acc[car.type_id] = (acc[car.type_id] || 0) + 1;
            }
            return acc;
        }, {});

        displayRentalCars(carTypes, availableByType);
    } catch (error) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Không thể tải danh sách xe cho thuê. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

function displayRentalCars(carTypes, availableByType) {
    const container = document.getElementById('rentalCarList');
    if (!container) return;

    if (carTypes.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Chưa có xe cho thuê</p>
            </div>
        `;
        return;
    }

    const html = carTypes.map((car) => {
        const availableCount = availableByType[car.id] || 0;
        return `
            <div class="col-lg-4 col-md-6">
                <div class="card car-card h-100">
                    <div class="position-relative">
                        <img src="assets/images/cars/${car.main_image}"
                            class="card-img-top car-card-img"
                            alt="${car.name}"
                            onerror="this.src='assets/images/cars/thue-xe-xe-anh-mac-dinh-fallback.jpg'">
                        ${availableCount > 0
                            ? `<span class="badge badge-status badge-available">Còn ${availableCount} xe</span>`
                            : `<span class="badge badge-status" style="background:linear-gradient(135deg,#6c757d,#495057);">Hết xe</span>`}
                    </div>
                    <div class="card-body">
                        <h5 class="fw-bold mb-2">${car.name}</h5>
                        <p class="text-muted small mb-3">${car.brand} · ${car.seats} chỗ · ${car.transmission}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="car-price">${Utils.formatPrice(car.price_per_day)}đ/ngày</span>
                            <a href="pages/public/chi-tiet-xe.html?type_id=${car.id}" class="btn btn-gradient-secondary btn-sm">
                                Chi tiết
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function loadServices() {
    const serviceContainer = document.getElementById('serviceList');
    if (!serviceContainer) return;

    Utils.showLoading(serviceContainer);
    const result = await API.services.getAll();
    
    if(result.success) {
        displayServices(result.data);
    } else {
        serviceContainer.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Không thể tải dịch vụ. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

function displayServices(services) {
    if(services.length === 0) {
        document.getElementById('serviceList').innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Chưa có dịch vụ nào</p>
            </div>
        `;
        return;
    }
    
    const gradients = ['primary', 'secondary', 'success', 'orange'];
    
    const html = services.map((service, index) => `
        <div class="col-lg-6">
            <div class="card service-card border-0 shadow-sm h-100">
                <div class="card-body p-4">
                    <div class="d-flex align-items-start">
                        <div class="service-icon me-4" style="flex-shrink: 0;">
                            <div class="rounded-circle d-flex align-items-center justify-content-center" 
                                 style="width: 80px; height: 80px; background: var(--gradient-${gradients[index % 4]});">
                                <i class="fas fa-${service.icon} fa-2x text-white"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <h4 class="fw-bold mb-3">${service.name}</h4>
                            <p class="text-muted mb-3">${service.description}</p>
                            <h5 class="text-primary fw-bold mb-0">
                                ${Utils.formatPrice(service.price)}đ
                                ${service.unit ? `<small class="text-muted fw-normal">/${service.unit}</small>` : ''}
                            </h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('serviceList').innerHTML = html;
}