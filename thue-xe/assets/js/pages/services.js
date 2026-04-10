document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadRentalCars(), loadServices()]);
});

async function loadRentalCars() {
    const container = document.getElementById('rentalCarList');
    if (!container) return;

    Utils.showLoading(container);

    try {
        // 1. Nạp toàn bộ xe đã được duyệt từ database
        const res = await API.cars.getAll();
        const cars = res.data || [];
        
        // 2. Gom nhóm theo Loại xe (để hiển thị đếm số lượng)
        // Trong database mới, ta có thể gom theo 'tenxe' (Vios, Mazda 3...)
        const groupedCars = cars.reduce((acc, car) => {
            const key = car.tenxe;
            if (!acc[key]) {
                acc[key] = {
                    ...car,
                    count: 0
                };
            }
            // Coi như xe approved là xe sẵn sàng (nếu muốn check bận thì thêm điều kiện && car.tinhtrang !== 'busy')
            acc[key].count++;
            return acc;
        }, {});

        const carList = Object.values(groupedCars);
        displayRentalCars(carList);
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Không thể tải danh sách xe. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

function displayRentalCars(carList) {
    const container = document.getElementById('rentalCarList');
    if (!container) return;

    if (carList.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Chưa có xe nào được phê duyệt.</p>
            </div>
        `;
        return;
    }

    const html = carList.map((car) => {
        const avail = car.count || 0;
        
        // Kiểm tra xem trang có thẻ <base> không. Nếu có, đường dẫn luôn bắt đầu từ gốc thue-xe/
        const hasBaseTag = !!document.querySelector('base');
        const imgBase = hasBaseTag ? 'assets/images/cars/' : (window.location.pathname.includes('/public/') ? '../../../assets/images/cars/' : 'assets/images/cars/');
        
        const carImg = car.anhdaidien || 'thue-xe-xe-anh-mac-dinh-fallback.jpg';

        return `
            <div class="col-lg-4 col-md-6">
                <div class="card car-card h-100">
                    <div class="position-relative">
                        <img src="${imgBase}${carImg}"
                            class="card-img-top car-card-img"
                            alt="${car.tenxe}"
                            onerror="this.src='${imgBase}thue-xe-xe-anh-mac-dinh-fallback.jpg'">
                        ${avail > 0 
                            ? `<span class="badge badge-status badge-available">Còn ${avail} xe</span>`
                            : `<span class="badge badge-status" style="background:linear-gradient(135deg,#6c757d,#495057);">Hết xe</span>`}
                    </div>
                    <div class="card-body">
                        <h5 class="fw-bold mb-2">${car.tenxe}</h5>
                        <p class="text-muted small mb-3">${car.loaixe} · ${car.socho} chỗ · ${car.nhienlieu}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="car-price">${Utils.formatPrice(car.giathue)}đ/ngày</span>
                            <a href="views/pages/public/chi-tiet-xe.html?id=${car.id || car.type_id}" class="btn btn-gradient-secondary btn-sm">
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