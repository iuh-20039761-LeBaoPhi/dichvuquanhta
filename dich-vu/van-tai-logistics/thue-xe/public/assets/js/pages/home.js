document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadCars(), loadServices(), loadFilterOptions()]);
    setupSearchForm();
});

async function loadCars() {
    Utils.showLoading(document.getElementById('carList'));
    const result = await API.cars.getFeatured();
    if(result.success) {
        displayCars(result.data);
    }
}

function displayCars(cars) {
    const html = cars.map(car => `
        <div class="col-lg-4 col-md-6">
            <div class="card car-card h-100">
                <div class="position-relative">
                    <img src="public/assets/images/cars/${car.main_image}"
                        class="card-img-top car-card-img"
                        alt="${car.name}"
                        onerror="this.src='public/assets/images/cars/thue-xe-xe-anh-mac-dinh-fallback.jpg'">
                    <span class="badge badge-status badge-available">Có sẵn</span>
                </div>
                <div class="card-body">
                    <h5 class="fw-bold">${car.name}</h5>
                    <p class="text-muted">${car.brand} ${car.model}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="car-price">${Utils.formatPrice(car.price_per_day)}đ/ngày</span>
                        <a href="index.php?page=car-detail&id=${car.id}" class="btn btn-gradient-secondary btn-sm">
                            Chi tiết
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('carList').innerHTML = html;
}

async function loadServices() {
    const result = await API.services.getAll();
    if(result.success) {
        displayServices(result.data);
    }
}

function displayServices(services) {
    const html = services.map((s) => `
        <div class="col-lg-3 col-md-6">
            <div class="card service-card text-center h-100">
                <div class="card-body">
                    <div class="service-icon mb-3">
                        <i class="fas fa-${s.icon} fa-2x"></i>
                    </div>
                    <h5 class="fw-bold">${s.name}</h5>
                    <p class="text-muted">${s.description}</p>
                    <p class="fw-bold text-primary">${Utils.formatPrice(s.price)}đ</p>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('serviceList').innerHTML = html;
}

// ===== Filter options từ DB =====
async function loadFilterOptions() {
    const result = await API.cars.getFilterOptions();
    if (!result.success) return;

    // Hãng xe
    const brandSel = document.getElementById('searchBrand');
    result.brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b; opt.textContent = b;
        brandSel.appendChild(opt);
    });

    // Số chỗ
    const seatsSel = document.getElementById('searchSeats');
    result.seats.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = `${s} chỗ`;
        seatsSel.appendChild(opt);
    });

    // Khoảng giá — tính từ min/max trong DB
    const priceSel = document.getElementById('searchPrice');
    buildPriceRanges(result.prices.min, result.prices.max).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value; opt.textContent = r.label;
        priceSel.appendChild(opt);
    });
}

// Tạo các khoảng giá dựa vào min/max thực tế trong DB
function buildPriceRanges(minPrice, maxPrice) {
    const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
    const BREAKS = [500_000, 1_000_000, 2_000_000];
    const ranges = [];
    let prev = 0;
    for (const br of BREAKS) {
        if (minPrice < br && prev < maxPrice) {
            ranges.push({
                value: prev === 0 ? `0-${br}` : `${prev}-${br}`,
                label: prev === 0 ? `Dưới ${fmt(br)}đ` : `${fmt(prev)} – ${fmt(br)}đ`,
            });
        }
        prev = br;
    }
    if (maxPrice > BREAKS[BREAKS.length - 1]) {
        const lo = BREAKS[BREAKS.length - 1];
        ranges.push({ value: String(lo), label: `Trên ${fmt(lo)}đ` });
    }
    return ranges;
}

function setupSearchForm() {
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const brand = document.getElementById('searchBrand').value;
        const seats = document.getElementById('searchSeats').value;
        const price = document.getElementById('searchPrice').value;

        const query = new URLSearchParams({ page: 'search' });
        if (brand) query.set('brand', brand);
        if (seats) query.set('seats', seats);
        if (price) query.set('price', price);

        window.location.href = `index.php?${query.toString()}`;
    });
}
