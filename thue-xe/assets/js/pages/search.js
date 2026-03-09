document.addEventListener('DOMContentLoaded', async () => {
    await loadFilterOptions();
    await performSearch();
    setupFilterForm();
});

// ===== Filter options từ DB =====
async function loadFilterOptions() {
    const result = await API.cars.getFilterOptions();
    if (!result.success) return;

    const params = new URLSearchParams(window.location.search);

    // Hãng xe
    const brandSel = document.getElementById('filterBrand');
    result.brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b; opt.textContent = b;
        if (b === params.get('brand')) opt.selected = true;
        brandSel.appendChild(opt);
    });

    // Số chỗ
    const seatsSel = document.getElementById('filterSeats');
    result.seats.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = `${s} chỗ`;
        if (String(s) === params.get('seats')) opt.selected = true;
        seatsSel.appendChild(opt);
    });

    // Khoảng giá
    const priceSel = document.getElementById('filterPrice');
    buildPriceRanges(result.prices.min, result.prices.max).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value; opt.textContent = r.label;
        if (r.value === params.get('price')) opt.selected = true;
        priceSel.appendChild(opt);
    });
}

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

// ===== Search =====
async function performSearch() {
    const params = new URLSearchParams(window.location.search);
    const searchParams = {
        brand: params.get('brand') || '',
        seats: params.get('seats') || '',
        price: params.get('price') || ''
    };

    Utils.showLoading(document.getElementById('searchResults'));
    const result = await API.cars.search(searchParams);

    if(result.success) {
        displaySearchResults(result.data, searchParams);
    } else {
        document.getElementById('searchResults').innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                <h5>Có lỗi xảy ra</h5>
                <p class="text-muted">${result.message}</p>
            </div>`;
    }
}

function displaySearchResults(cars, searchParams) {
    const container = document.getElementById('searchResults');
    const fmt = n => new Intl.NumberFormat('vi-VN').format(n);

    // Build info label
    const filters = [];
    if (searchParams.brand) filters.push(`Hãng <strong>${searchParams.brand}</strong>`);
    if (searchParams.seats) filters.push(`<strong>${searchParams.seats}</strong> chỗ`);
    if (searchParams.price) {
        if (!searchParams.price.includes('-')) {
            filters.push(`Trên <strong>${fmt(searchParams.price)}đ</strong>/ngày`);
        } else {
            const [min, max] = searchParams.price.split('-');
            filters.push(min == 0
                ? `Dưới <strong>${fmt(max)}đ</strong>/ngày`
                : `<strong>${fmt(min)} – ${fmt(max)}đ</strong>/ngày`);
        }
    }
    const searchInfo = filters.length ? filters.join(', ') : 'Tất cả xe';

    if(cars.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5>Không tìm thấy xe phù hợp</h5>
                <p class="text-muted">${searchInfo}</p>
                <a href="index.php?page=search" class="btn btn-gradient mt-3">
                    <i class="fas fa-redo me-2"></i>Xem tất cả
                </a>
            </div>`;
        return;
    }

    const html = `
        <div class="col-12 mb-3">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <p class="mb-0 text-muted small">Tìm thấy <strong class="text-dark">${cars.length} xe</strong>${filters.length ? ' — ' + searchInfo : ''}</p>
                <select class="form-select form-select-sm w-auto" id="sortSelect">
                    <option value="default">Sắp xếp mặc định</option>
                    <option value="price_asc">Giá thấp đến cao</option>
                    <option value="price_desc">Giá cao đến thấp</option>
                    <option value="name">Tên A-Z</option>
                </select>
            </div>
        </div>
        ${cars.map(car => `
            <div class="col-lg-4 col-md-6">
                <div class="card car-card h-100">
                    <div class="position-relative">
                        <img src="assets/images/cars/${car.main_image}"
                             class="card-img-top"
                             alt="${car.name}"
                             onerror="this.src='assets/images/cars/default.jpg'">
                        <span class="badge badge-status ${car.status === 'available' ? 'badge-available' : 'badge-rented'}">
                            ${car.status === 'available' ? 'Có sẵn' : 'Đã thuê'}
                        </span>
                    </div>
                    <div class="card-body">
                        <h5 class="fw-bold mb-2">${car.name}</h5>
                        <p class="text-muted mb-3">${car.brand} ${car.model} ${car.year}</p>
                        <div class="car-features mb-3">
                            <div class="car-feature-item">
                                <i class="fas fa-users text-primary"></i>
                                <span>${car.seats} chỗ</span>
                            </div>
                            <div class="car-feature-item">
                                <i class="fas fa-cog text-primary"></i>
                                <span>${car.transmission}</span>
                            </div>
                            <div class="car-feature-item">
                                <i class="fas fa-gas-pump text-primary"></i>
                                <span>${car.fuel_type}</span>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="car-price">${Utils.formatPrice(car.price_per_day)}đ/ngày</span>
                            <a href="index.php?page=car-detail&id=${car.id}" class="btn btn-gradient-secondary btn-sm">
                                Xem chi tiết
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    `;

    container.innerHTML = html;
    setupSort(cars);
}

function setupSort(cars) {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    sortSelect.addEventListener('change', (e) => {
        let sorted = [...cars];
        switch(e.target.value) {
            case 'price_asc':  sorted.sort((a,b) => a.price_per_day - b.price_per_day); break;
            case 'price_desc': sorted.sort((a,b) => b.price_per_day - a.price_per_day); break;
            case 'name':       sorted.sort((a,b) => a.name.localeCompare(b.name)); break;
        }
        const cur = new URLSearchParams(window.location.search);
        displaySearchResults(sorted, {
            brand: cur.get('brand') || '',
            seats: cur.get('seats') || '',
            price: cur.get('price') || '',
        });
    });
}

function setupFilterForm() {
    document.getElementById('searchFilterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const brand = document.getElementById('filterBrand').value;
        const seats = document.getElementById('filterSeats').value;
        const price = document.getElementById('filterPrice').value;
        window.location.href = `index.php?page=search&brand=${brand}&seats=${seats}&price=${price}`;
    });
}
