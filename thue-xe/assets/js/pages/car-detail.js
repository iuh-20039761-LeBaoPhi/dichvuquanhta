/**
 * Car Detail Page Logic
 * Manages gallery, SEO, and booking integration
 */

(async function () {
    // 1. Initial State
    let selectedCarId = null;
    let _currentCarType = null;
    let _galleryMode = 'image';
    let _galleryVideoUrl = '';
    let _session = null;
    
    // Safety constants
    const ADDON_PRICES = {};
    const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
    const today = () => new Date().toISOString().split('T')[0];

    // 2. Core Functions
    window.gallerySwitch = function (type, src, el) {
        const imgEl = document.getElementById('galleryMainImg');
        const videoEl = document.getElementById('galleryMainVideo');
        if (type === 'video') {
            _galleryVideoUrl = src || _galleryVideoUrl;
            setGalleryMode('video');
        } else {
            setGalleryMode('image');
            imgEl.src = src;
            imgEl.onerror = () => { imgEl.src = 'assets/images/cars/thue-xe-xe-anh-mac-dinh-fallback.jpg'; };
        }
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        if (el) el.classList.add('active');
        updateGalleryNavButtons();
    };

    window.setGalleryMode = function (mode) {
        const imgEl = document.getElementById('galleryMainImg');
        const videoEl = document.getElementById('galleryMainVideo');
        const thumbsWrap = document.getElementById('galleryThumbsWrap');
        if (!imgEl || !videoEl || !thumbsWrap) return;

        const hasVideo = !!_galleryVideoUrl;
        _galleryMode = (mode === 'video' && hasVideo) ? 'video' : 'image';

        if (_galleryMode === 'video') {
            imgEl.style.display = 'none';
            thumbsWrap.classList.add('is-hidden');
            videoEl.style.display = 'block';
            const sep = _galleryVideoUrl.includes('?') ? '&' : '?';
            videoEl.src = `${_galleryVideoUrl}${sep}autoplay=1&rel=0`;
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        } else {
            videoEl.style.display = 'none';
            videoEl.src = '';
            imgEl.style.display = 'block';
            thumbsWrap.classList.remove('is-hidden');
            let activeThumb = document.querySelector('.gallery-thumb.active img');
            if (!activeThumb) {
                const front = document.querySelector('.gallery-thumb[data-angle="avatar"]');
                if (front) { front.classList.add('active'); activeThumb = front.querySelector('img'); }
            }
            if (activeThumb) imgEl.src = activeThumb.src;
        }
        updateGalleryModeButtons(_galleryMode, hasVideo);
        updateGalleryNavButtons();
    };

    function updateGalleryModeButtons(mode, hasVideo) {
        const imgBtn = document.getElementById('galleryModeImageBtn');
        const vidBtn = document.getElementById('galleryModeVideoBtn');
        if (imgBtn) imgBtn.classList.toggle('active', mode === 'image');
        if (vidBtn) {
            vidBtn.classList.toggle('active', mode === 'video');
            vidBtn.disabled = !hasVideo;
        }
    }

    function updateGalleryNavButtons() {
        const prev = document.getElementById('galleryPrevBtn');
        const next = document.getElementById('galleryNextBtn');
        if (!prev || !next) return;
        const thumbs = Array.from(document.querySelectorAll('.gallery-thumb[data-angle]'));
        if (_galleryMode !== 'image' || thumbs.length <= 1) {
            prev.style.display = next.style.display = 'none';
            return;
        }
        const idx = thumbs.findIndex(t => t.classList.contains('active'));
        prev.style.display = idx > 0 ? 'flex' : 'none';
        next.style.display = idx < thumbs.length - 1 ? 'flex' : 'none';
    }

    window.galleryPrev = () => {
        const thumbs = Array.from(document.querySelectorAll('.gallery-thumb[data-angle]'));
        const idx = thumbs.findIndex(t => t.classList.contains('active'));
        if (idx > 0) gallerySwitch('img', thumbs[idx-1].querySelector('img').src, thumbs[idx-1]);
    };

    window.galleryNext = () => {
        const thumbs = Array.from(document.querySelectorAll('.gallery-thumb[data-angle]'));
        const idx = thumbs.findIndex(t => t.classList.contains('active'));
        if (idx < thumbs.length - 1) gallerySwitch('img', thumbs[idx+1].querySelector('img').src, thumbs[idx+1]);
    };

    function buildGalleryHtml(car, hasAvail, count) {
        const base = 'assets/images/cars/';
        const fallback = `onerror="this.src='${base}thue-xe-xe-anh-mac-dinh-fallback.jpg'"`;
        const thumbs = [
            { key: 'avatar', label: 'Trước', src: car.anhdaidien },
            { key: 'back', label: 'Sau', src: car.anhsau },
            { key: 'left', label: 'Trái', src: car.anhtrai },
            { key: 'right', label: 'Phải', src: car.anhphai },
            { key: 'interior', label: 'Nội thất', src: car.anhnoithat },
        ].filter(t => t.src);

        return `
            <div class="card border-0 shadow-sm mb-4 gallery-wrap position-relative">
                <div class="position-relative">
                    <img id="galleryMainImg" class="gallery-main-img" src="${base + (thumbs[0]?.src || 'default.jpg')}" ${fallback}>
                    <iframe id="galleryMainVideo" class="gallery-main-video" allowfullscreen></iframe>
                    <button class="gallery-main-nav prev" id="galleryPrevBtn" onclick="galleryPrev()"><i class="fas fa-chevron-left"></i></button>
                    <button class="gallery-main-nav next" id="galleryNextBtn" onclick="galleryNext()"><i class="fas fa-chevron-right"></i></button>
                    <div class="gallery-toggle-overlay">
                        <button class="gtog-btn" id="galleryModeImageBtn" onclick="setGalleryMode('image')"><i class="fas fa-image"></i> Ảnh</button>
                        <button class="gtog-btn" id="galleryModeVideoBtn" onclick="setGalleryMode('video')"><i class="fas fa-play"></i> Video</button>
                    </div>
                </div>
                <div class="gallery-thumbs" id="galleryThumbsWrap">
                    ${thumbs.map((t, i) => `
                        <div class="gallery-thumb ${i===0?'active':''}" data-angle="${t.key}" onclick="gallerySwitch('img','${base+t.src}',this)">
                            <img src="${base+t.src}" ${fallback}>
                            <div class="gallery-thumb-label">${t.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    function renderCarDetail(car, avail, allSameType = []) {
        const hasAvailable = avail.length > 0;
        const features = (car.features || '').split(',').filter(f => f.trim());
        const container = document.getElementById('carContent');
        if (!container) return;

        container.innerHTML = `
            <div class="col-lg-8">
                ${buildGalleryHtml(car, hasAvailable, avail.length)}
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body p-4">
                        <h1 class="fw-bold fs-3 mb-2">${car.tenxe}</h1>
                        <div class="mb-4">
                            <span class="badge bg-primary me-2">${car.hangxe}</span>
                            <span class="badge bg-secondary me-2">${car.dongxe}</span>
                            <span class="badge bg-info">${car.namsanxuat}</span>
                        </div>
                        <div class="row g-3 mb-4">
                            ${renderSpecItem('users', 'Số chỗ', car.socho + ' chỗ')}
                            ${renderSpecItem('cog', 'Hộp số', car.hopso)}
                            ${renderSpecItem('gas-pump', 'Nhiên liệu', car.nhienlieu)}
                            ${renderSpecItem('dollar-sign', 'Giá thuê', fmt(car.giathue)+'đ')}
                        </div>
                        <hr>
                        <h5 class="fw-bold mb-3">Mô Tả</h5>
                        <p class="text-muted" style="line-height:1.7">${car.mota || 'Đang cập nhật'}</p>
                        <hr>
                        <h5 class="fw-bold mb-3">Tính Năng</h5>
                        <div class="feature-grid">
                            ${features.map(f => `<div class="feature-item"><i class="fas fa-check-circle me-2"></i>${f}</div>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- HIỂN THỊ CÁC XE CÙNG LOẠI TRONG HỆ THỐNG -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body p-4">
                        <h5 class="fw-bold mb-1"><i class="fas fa-layer-group me-2 text-primary"></i>Đội xe cùng loại (${allSameType.length})</h5>
                        <p class="text-muted small mb-3">Hệ thống có ${allSameType.length} chiếc ${car.tenxe} đang sẵn sàng phục vụ.</p>
                        
                        <div class="table-responsive">
                            <table class="table table-hover align-middle border-top">
                                <thead class="table-light">
                                    <tr>
                                        <th class="py-3">Biển số</th>
                                        <th>Màu sắc</th>
                                        <th>Odo</th>
                                        <th>Trạng thái</th>
                                        <th class="text-end">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${allSameType.map(item => {
                                        const isBusy = item.trangthai === 'rented' || item.trangthai === 'maintenance';
                                        return `
                                        <tr class="${item.id == car.id ? 'table-primary bg-opacity-10' : ''}">
                                            <td class="fw-bold fs-6">
                                                <i class="fas fa-id-card-alt text-muted me-2"></i>${item.bienso || '—'}
                                                ${item.id == car.id ? '<span class="badge bg-primary ms-1 small" style="font-size:0.6rem">Đang xem</span>' : ''}
                                            </td>
                                            <td><span class="small">${item.mausac || '—'}</span></td>
                                            <td><span class="small">${fmt(item.odo || 0)} km</span></td>
                                            <td>
                                                ${!isBusy 
                                                    ? '<span class="badge bg-success bg-opacity-10 text-success fw-medium"><i class="fas fa-check-circle me-1"></i>Còn xe</span>' 
                                                    : '<span class="badge bg-danger bg-opacity-10 text-danger fw-medium"><i class="fas fa-clock me-1"></i>Đang cho thuê</span>'}
                                            </td>
                                            <td class="text-end">
                                                <a href="views/pages/public/chi-tiet-xe.html?id=${item.id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">
                                                    Chọn <i class="fas fa-chevron-right ms-1"></i>
                                                </a>
                                            </td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body p-4">
                        <h5 class="fw-bold mb-3">Thông số kỹ thuật</h5>
                        <div class="row g-3">
                            ${renderDetailSpec('Năm SX', car.namsanxuat)}
                            ${renderDetailSpec('Loại xe', car.loaixe)}
                            ${renderDetailSpec('Biển số', car.bienso)}
                            ${renderDetailSpec('Odo', fmt(car.odo) + ' km')}
                            ${renderDetailSpec('Màu sắc', car.mausac)}
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-4">${renderBookingSidebar(car, hasAvailable)}</div>
        `;

        _galleryVideoUrl = car.videourl || '';
        window._currentCarData = car; // Store for booking confirmation
        setGalleryMode('image');
        setupBookingLogic(car, hasAvailable);
    }

    function renderSpecItem(icon, label, val) {
        return `<div class="col-6 col-md-3">
            <div class="d-flex align-items-center">
                <div class="bg-light p-3 rounded-circle me-2"><i class="fas fa-${icon}"></i></div>
                <div><small class="text-muted d-block">${label}</small><strong>${val}</strong></div>
            </div>
        </div>`;
    }

    function renderDetailSpec(label, val) {
        return `<div class="col-6 col-md-4"><div class="spec-item"><small class="text-muted d-block">${label}</small><strong>${val || '—'}</strong></div></div>`;
    }

    function renderBookingSidebar(car, hasAvail) {
        return `
            <div class="card border-0 shadow-sm sticky-top" style="top:90px;">
                <div class="card-body p-4">
                    <h5 class="fw-bold mb-3">Đặt Xe Ngay</h5>
                    <div class="bg-light p-3 rounded mb-3">
                        <h6 class="fw-bold mb-1">${car.tenxe}</h6>
                        <p class="text-primary fw-bold mb-0">${fmt(car.giathue)}đ/ngày</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ngày nhận</label>
                        <input type="date" class="form-control" id="pickupDate" min="${today()}" ${!hasAvail?'disabled':''}>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ngày trả</label>
                        <input type="date" class="form-control" id="returnDate" min="${today()}" ${!hasAvail?'disabled':''}>
                    </div>
                    <div id="priceCalc" class="bg-light p-3 rounded mb-3" style="display:none;">
                        <div class="d-flex justify-content-between"><span>Số ngày:</span><strong id="totalDays">0</strong></div>
                        <div class="d-flex justify-content-between"><span>Tổng:</span><strong class="text-primary" id="totalPrice">0đ</strong></div>
                    </div>
                    ${hasAvail ? '<button class="btn btn-gradient w-100" onclick="txBpOpen()"><i class="fas fa-calendar-check me-2"></i>Đặt ngay</button>' : '<button class="btn btn-secondary w-100" disabled>Hết xe</button>'}
                </div>
            </div>`;
    }

    function setupBookingLogic(car, hasAvail) {
        if (!hasAvail) return;
        const pDate = document.getElementById('pickupDate');
        const rDate = document.getElementById('returnDate');
        const calc = () => {
            if (pDate.value && rDate.value) {
                const days = Math.max(1, Math.round((new Date(rDate.value)-new Date(pDate.value))/86400000));
                document.getElementById('totalDays').textContent = days + ' ngày';
                document.getElementById('totalPrice').textContent = fmt(days * car.giathue) + 'đ';
                document.getElementById('priceCalc').style.display = 'block';
                rDate.min = pDate.value;
            }
        };
        pDate.onchange = rDate.onchange = calc;
    }

    function updateSEO(car) {
        const title = `${car.tenxe} - Thuê Xe Toàn Quốc`;
        document.title = title;
        const desc = car.mota || `Thuê xe ${car.tenxe} giá rẻ...`;
        document.getElementById('metaDesc').setAttribute('content', desc);
    }

    // 3. Initialization
    try {
        await STATIC_DATA_PROMISE;
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) throw new Error('No ID');

        const allCars = await getLiveCars();
        console.log("[Antigravity-Debug] Total cars found:", allCars.length);
        
        const car = allCars.find(c => String(c.id) == String(id));
        if (!car) throw new Error('Empty result');

        // Tìm các xe cùng loại (cùng tên xe)
        const allSameType = allCars.filter(c => String(c.tenxe).toLowerCase() === String(car.tenxe).toLowerCase());

        updateSEO(car);
        renderCarDetail(car, [car], allSameType);
    } catch (e) {
        console.error(e);
        document.getElementById('carContent').innerHTML = '<div class="text-center py-5"><h4>Không tìm thấy xe</h4><a href="index.html" class="btn btn-primary mt-3">Quay lại</a></div>';
    }

    window.txBpFormLoaded = async function() {
        console.log('[Antigravity] Booking form loaded. Initializing modal logic...');
        const form = document.getElementById('bookingFormFull');
        if (!form) return;

        // A. Autofill & State
        const s = (window.DVQTApp && window.DVQTApp.checkSession) ? await window.DVQTApp.checkSession() : null;
        if (s && s.logged_in) {
            const f = n => form.querySelector(`[name="${n}"]`);
            if (f('customer_name')) f('customer_name').value = s.hovaten || s.name || '';
            if (f('customer_phone')) f('customer_phone').value = s.sodienthoai || s.phone || '';
            if (f('customer_email')) f('customer_email').value = s.email || '';
            if (f('customer_address')) f('customer_address').value = s.diachi || s.address || '';
        }

        // B. Render Addon Services
        const STATIC = await STATIC_DATA_PROMISE;
        const addonContainer = document.getElementById('addonServiceList');
        if (addonContainer && STATIC.services) {
            addonContainer.innerHTML = STATIC.services.map(svc => `
                <div class="col-12 col-md-6">
                    <label class="addon-service-card" for="svc_${svc.id}">
                        <input class="addon-service-input" type="checkbox" name="addon_services" value="${svc.name}" id="svc_${svc.id}" data-price="${svc.price}" data-unit="${svc.unit}">
                        <span class="addon-service-shell">
                            <span class="addon-service-check"><i class="fas fa-check"></i></span>
                            <span class="addon-service-main">
                                <span class="addon-service-top">
                                    <span class="addon-service-name"><i class="fas fa-${svc.icon || 'star'} text-primary me-1"></i>${svc.name}</span>
                                    <span class="addon-service-price">+${fmt(svc.price)}đ/${svc.unit}</span>
                                </span>
                            </span>
                        </span>
                    </label>
                </div>`).join('');
        }

        // C. Sync Dates from Sidebar (if available)
        const sidebarPickup = document.getElementById('pickupDate');
        const sidebarReturn = document.getElementById('returnDate');
        const modalPickup = form.querySelector('#pickupDate');
        const modalReturn = form.querySelector('#returnDate');
        if (sidebarPickup && modalPickup) modalPickup.value = sidebarPickup.value;
        if (sidebarReturn && modalReturn) modalReturn.value = sidebarReturn.value;

        // D. Handle Form Submission -> Show Confirmation
        form.onsubmit = function(e) {
            e.preventDefault();
            const car = window._currentCarData; // Lấy dữ liệu xe đang xem
            if(!car) return;

            const days = Math.max(1, Math.round((new Date(modalReturn.value) - new Date(modalPickup.value)) / 86400000));
            const addons = [...form.querySelectorAll('input[name="addon_services"]:checked')];
            let addonTotal = 0;
            let addonText = [];
            addons.forEach(cb => {
                const p = Number(cb.dataset.price);
                const u = cb.dataset.unit;
                const cost = u === 'ngày' ? p * days : p;
                addonTotal += cost;
                addonText.push(cb.value);
            });

            // Populate Confirmation Table
            const cf = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
            cf('tx-cf-name', form.customer_name.value);
            cf('tx-cf-phone', form.customer_phone.value);
            cf('tx-cf-email', form.customer_email.value || 'N/A');
            cf('tx-cf-pickup', modalPickup.value + ' ' + (document.getElementById('pickupTime')?.value || '08:00'));
            cf('tx-cf-return', modalReturn.value + ' ' + (document.getElementById('returnTime')?.value || '08:00'));
            cf('tx-cf-days', days + ' ngày');
            cf('tx-cf-price-day', fmt(car.giathue) + ' đ/ngày');
            cf('tx-cf-rental-cost', fmt(days * car.giathue) + ' đ');
            cf('tx-cf-addon-cost', fmt(addonTotal) + ' đ');
            cf('tx-cf-total', fmt(days * car.giathue + addonTotal) + ' đ');
            
            // Diễn giải & Dịch vụ đi kèm
            const summaryEl = document.getElementById('tx-cf-summary');
            if(summaryEl) summaryEl.textContent = `Giá thuê ${days} ngày x ${fmt(car.giathue)}đ/ngày`;
            const addonEl = document.getElementById('tx-cf-addon');
            if(addonEl) addonEl.textContent = addonText.length ? addonText.join(', ') : 'Không có';

            const imgEl = document.getElementById('tx-cf-car-front-img');
            if(imgEl) { imgEl.src = 'assets/images/cars/' + car.anhdaidien; imgEl.style.display='block'; }
            const carRow = document.getElementById('tx-cf-car-front-row');
            if(carRow) carRow.style.display = 'flex';

            document.getElementById('bookingFormFull').style.display = 'none';
            document.getElementById('txBookingConfirm').style.display = 'block';
            
            // Final Database Submission
            document.getElementById('txConfirmSubmitBtn').onclick = async function() {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang gửi...';
                try {
                    const payload = {
                        id_nguoidung: s?.id || null,
                        tenkhachhang: form.customer_name.value,
                        sdtkhachhang: form.customer_phone.value,
                        emailkhachhang: form.customer_email.value,
                        id_xe: car.id,
                        ten_xe: car.tenxe,
                        ngay_nhan_yeu_cau: modalPickup.value,
                        ngay_tra_yeu_cau: modalReturn.value,
                        gio_nhan_yeu_cau: document.getElementById('pickupTime')?.value || '08:00',
                        gio_tra_yeu_cau: document.getElementById('returnTime')?.value || '08:00',
                        diachikhachhang: form.customer_address.value,
                        ghi_chu: form.notes.value,
                        dich_vu_kem: JSON.stringify(addonText),
                        tong_tien: (days * car.giathue + addonTotal),
                        ngaydat: new Date().toISOString().slice(0, 19).replace('T', ' ')
                    };
                    const res = await DVQTKrud.insertRow('datlich_thuexe', payload);
                    if(res) {
                        Swal.fire('Thành công!', `Đơn hàng #${String(res.id).padStart(7,'0')} đã được tiếp nhận.`, 'success')
                            .then(() => window.location.href = 'views/pages/customer/trang-ca-nhan.html');
                    }
                } catch(err) { Swal.fire('Lỗi', 'Không thể gửi đơn hàng', 'error'); }
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-check me-2"></i> Xác nhận đặt xe';
            };
            
            document.getElementById('txConfirmBackBtn').onclick = () => {
                document.getElementById('bookingFormFull').style.display = 'block';
                document.getElementById('txBookingConfirm').style.display = 'none';
            };
        };
    };
})();