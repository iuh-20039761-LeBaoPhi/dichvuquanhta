/**
 * Car Detail Page Logic
 * Manages gallery, SEO, and booking integration
 */

(async function () {
    // 1. Initial State
    let _galleryMode = 'image';
    let _galleryVideoUrl = '';
    
    // Safety constants
    const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
    const toNumber = v => {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
        return Number(String(v || '').replace(/[^\d.-]/g, '')) || 0;
    };
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, function(ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
    const today = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const addDaysIso = (isoDate, days) => {
        if (!isoDate) return '';
        const parts = String(isoDate).split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        dt.setDate(dt.getDate() + days);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

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
            imgEl.onerror = () => { imgEl.src = 'public/assets/images/cars/thue-xe-xe-anh-mac-dinh-fallback.jpg'; };
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
            
            // Phân biệt Video Local và Video YouTube/nhúng
            const isLocal = !(_galleryVideoUrl.startsWith('http') || _galleryVideoUrl.startsWith('//'));
            
            if (isLocal) {
                // Video local: Dùng thẻ <video> (cần tạo nếu chưa có hoặc dùng chung)
                // Trong code này ta tạm dùng iframe cho đơn giản nhưng sửa src, 
                // thực tế nên đổi hẳn sang <video> để có control tốt hơn.
                // Ở đây tôi sẽ cập nhật hàm build để hỗ trợ cả 2.
                const videoContainer = videoEl.parentElement;
                videoEl.style.display = 'none';
                
                let localPlayer = document.getElementById('galleryLocalVideo');
                if (!localPlayer) {
                    localPlayer = document.createElement('video');
                    localPlayer.id = 'galleryLocalVideo';
                    localPlayer.className = 'gallery-main-video';
                    localPlayer.controls = true;
                    localPlayer.autoplay = true;
                    videoContainer.appendChild(localPlayer);
                }
                localPlayer.style.display = 'block';
                localPlayer.src = _galleryVideoUrl;
            } else {
                const localPlayer = document.getElementById('galleryLocalVideo');
                if (localPlayer) localPlayer.style.display = 'none';

                videoEl.style.display = 'block';
                const sep = _galleryVideoUrl.includes('?') ? '&' : '?';
                videoEl.src = `${_galleryVideoUrl}${sep}autoplay=1&rel=0`;
            }
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        } else {
            const localPlayer = document.getElementById('galleryLocalVideo');
            if (localPlayer) {
                 localPlayer.style.display = 'none';
                 localPlayer.src = '';
            }
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

    function buildGalleryHtml(car) {
        const base = 'public/assets/images/cars/';
        const fallback = `onerror="this.src='${base}thue-xe-xe-anh-mac-dinh-fallback.jpg'"`;
        // Hỗ trợ cả ảnh cũ (local) và ảnh mới (Drive fileId)
        const resolveImg = (val) => {
            if(!val) return '';
            if(val.startsWith('http')) return val;
            // Drive fileId: chuỗi dài >= 20 ký tự không chứa dấu chấm mở rộng
            if(val.match(/^[a-zA-Z0-9_-]{20,}$/)) return `https://lh3.googleusercontent.com/u/0/d/${val}`;
            return base + val;
        };
        const thumbs = [
            { key: 'avatar', label: 'Trước', src: car.anhdaidien },
            { key: 'back', label: 'Sau', src: car.anhsau },
            { key: 'left', label: 'Trái', src: car.anhtrai },
            { key: 'right', label: 'Phải', src: car.anhphai },
            { key: 'interior', label: 'Nội thất', src: car.anhnoithat },
        ].filter(t => t.src);

        const mainSrc = thumbs[0] ? resolveImg(thumbs[0].src) : (base + 'default.jpg');

        return `
            <div class="card border-0 shadow-sm mb-4 gallery-wrap position-relative">
                <div class="position-relative">
                    <img id="galleryMainImg" class="gallery-main-img" src="${mainSrc}" ${fallback}>
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
                        <div class="gallery-thumb ${i===0?'active':''}" data-angle="${t.key}" onclick="gallerySwitch('img','${resolveImg(t.src)}',this)">
                            <img src="${resolveImg(t.src)}" ${fallback}>
                            <div class="gallery-thumb-label">${t.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    function renderCarDetail(car, avail, allSameType = [], isOwnCar = false) {
        const hasAvailable = avail.length > 0;
        const features = (car.features || '').split(',').filter(f => f.trim());
        const container = document.getElementById('carContent');
        if (!container) return;

        // Xác định nút đặt xe: NCC không được đặt xe của chính mình
        let bookingBtnHtml;
        if (isOwnCar) {
            bookingBtnHtml = `<div class="alert alert-info border-0 shadow-sm d-flex align-items-center gap-2 mb-0 py-2 px-3" style="border-radius:12px; background:linear-gradient(135deg,#eff6ff,#dbeafe);">
                <i class="fas fa-info-circle text-primary"></i>
                <span class="small fw-bold text-primary">Đây là xe của bạn. Bạn không thể tự đặt xe mình cho thuê.</span>
            </div>`;
        } else if (hasAvailable) {
            bookingBtnHtml = '<button class="btn btn-gradient px-4" onclick="txBpOpen()"><i class="fas fa-calendar-check me-2"></i>Đặt ngay</button>';
        } else {
            bookingBtnHtml = '<button class="btn btn-secondary px-4" disabled><i class="fas fa-ban me-2"></i>Hết xe</button>';
        }

        container.innerHTML = `
            <div class="col-12">
                ${buildGalleryHtml(car)}
                <div class="mb-4 d-grid d-sm-flex">
                    ${bookingBtnHtml}
                </div>
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

                <!-- HIỂN THỊ CÁC XE CÙNG LOẠI TRONG HỆ THỐNG -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body p-4">
                        <h5 class="fw-bold mb-1"><i class="fas fa-layer-group me-2 text-primary"></i>Xe cùng loại (${allSameType.length})</h5>
                        <p class="text-muted small mb-3">Hệ thống có ${allSameType.length} chiếc ${car.tenxe} đang sẵn sàng phục vụ.</p>
                        
                        <div class="table-responsive">
                            <table class="table table-hover align-middle border-top">
                                <thead class="table-light">
                                    <tr>
                                        <th class="py-3">Biển số</th>
                                        <th>Màu sắc</th>
                                        <th>Odo</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${allSameType.map(item => {
                                        const isBusy = item.trangthai === 'rented' || item.trangthai === 'maintenance';
                                        const isCurrent = item.id == car.id;
                                        const detailUrl = `chi-tiet-xe.html?id=${item.id}`;
                                        return `
                                        <tr class="${isCurrent ? 'table-primary bg-opacity-10' : ''}" ${isCurrent ? '' : `role="button" tabindex="0" style="cursor:pointer;" onclick="window.location.href='${detailUrl}'" onkeydown="if(event.key==='Enter' || event.key===' '){ event.preventDefault(); window.location.href='${detailUrl}'; }"`}>
                                            <td class="fw-bold fs-6">
                                                <i class="fas fa-id-card-alt text-muted me-2"></i>${item.bienso || '—'}
                                                ${isCurrent ? '<span class="badge bg-primary ms-1 small" style="font-size:0.6rem">Đang xem</span>' : ''}
                                            </td>
                                            <td><span class="small">${item.mausac || '—'}</span></td>
                                            <td><span class="small">${fmt(item.odo || 0)} km</span></td>
                                            <td>
                                                ${!isBusy 
                                                    ? '<span class="badge bg-success bg-opacity-10 text-success fw-medium"><i class="fas fa-check-circle me-1"></i>Còn xe</span>' 
                                                    : '<span class="badge bg-danger bg-opacity-10 text-danger fw-medium"><i class="fas fa-clock me-1"></i>Đang cho thuê</span>'}
                                            </td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (car.videourl) {
            if (car.videourl.startsWith('http') || car.videourl.startsWith('//')) {
                _galleryVideoUrl = car.videourl;
            } else {
                // Video cục bộ lưu trong assets/video/cars/
                _galleryVideoUrl = 'public/assets/video/cars/' + car.videourl;
            }
        } else {
            _galleryVideoUrl = '';
        }
        window._currentCarData = car; // Store for booking confirmation
        setGalleryMode('image');
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

        // Kiểm tra: người dùng hiện tại có phải chủ xe này không?
        let isOwnCar = false;
        try {
            const sess = window._dvqt_session_cache || (window.DVQTApp ? await DVQTApp.checkSession() : null);
            if (sess && sess.logged_in && car.provider_id) {
                isOwnCar = String(sess.id) === String(car.provider_id);
            }
        } catch(_e) {}

        // Tìm các xe cùng loại (cùng tên xe)
        const allSameType = allCars.filter(c => String(c.tenxe).toLowerCase() === String(car.tenxe).toLowerCase());

        updateSEO(car);
        renderCarDetail(car, [car], allSameType, isOwnCar);
    } catch (e) {
        console.error(e);
        document.getElementById('carContent').innerHTML = '<div class="text-center py-5"><h4>Không tìm thấy xe</h4><a href="index.html" class="btn btn-primary mt-3">Quay lại</a></div>';
    }

    window.txBpFormLoaded = async function() {
        console.log('[Antigravity] Booking form loaded. Initializing modal logic...');
        const form = document.getElementById('bookingFormFull');
        if (!form) return;

        // Helper cập nhật badge
        const txUpdatePersonalInfoBadge = (section) => {
            if (!section) return;
            const badge = section.querySelector('.bk-tx-collapsible-badge');
            if (!badge) return;
            const name = document.querySelector('[name="customer_name"]')?.value?.trim();
            const phone = document.querySelector('[name="customer_phone"]')?.value?.trim();
            if (name && phone) {
                badge.textContent = (s && s.logged_in) ? 'Đã tự điền' : 'Đã điền';
                badge.classList.remove('warning');
            } else {
                badge.textContent = 'Chưa điền';
                badge.classList.add('warning');
            }
        };

        // A. Autofill & State
        let s = null;
        try {
            s = (window.DVQTApp && window.DVQTApp.checkSession) ? await window.DVQTApp.checkSession() : null;
            const section = document.getElementById('txSectionPersonalInfo');
            if (s && s.logged_in) {
                const f = n => form.querySelector(`[name="${n}"]`);
                if (f('customer_name')) f('customer_name').value = s.hovaten || s.name || '';
                if (f('customer_phone')) f('customer_phone').value = s.sodienthoai || s.phone || '';
                if (f('customer_email')) f('customer_email').value = s.email || '';
                if (f('customer_address')) f('customer_address').value = s.diachi || s.address || '';
                if (section) section.classList.add('collapsed');
            } else {
                if (section) section.classList.remove('collapsed');
            }
            if (section) txUpdatePersonalInfoBadge(section);
        } catch(_e) { console.warn('Session check skipped:', _e); }

        // Định nghĩa hàm toggle cho modal
        window.txToggleCollapsible = function(header) {
            const section = header.closest('.bk-tx-collapsible-section');
            if (section) {
                section.classList.toggle('collapsed');
                if (section.id === 'txSectionPersonalInfo') txUpdatePersonalInfoBadge(section);
            }
        };

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

        const modalPickup = form.querySelector('#pickupDate');
        const modalReturn = form.querySelector('#returnDate');

        const syncModalDateConstraints = () => {
            if (!modalPickup || !modalReturn) return;
            const todayStr = today();
            modalPickup.min = todayStr;

            if (modalPickup.value && modalPickup.value < todayStr) {
                modalPickup.value = todayStr;
            }

            const effectivePickup = modalPickup.value && modalPickup.value >= todayStr
                ? modalPickup.value
                : todayStr;
            const minReturn = addDaysIso(effectivePickup, 1);
            modalReturn.min = minReturn;

            if (modalReturn.value && modalReturn.value < minReturn) {
                modalReturn.value = minReturn;
            }
        };

        syncModalDateConstraints();
        if (modalPickup) modalPickup.addEventListener('change', syncModalDateConstraints);
        if (modalReturn) modalReturn.addEventListener('change', syncModalDateConstraints);

        // E. Handle Media Capture
        let _modalMediaFiles = [];
        const photoInput = document.getElementById('txMediaPhotoInput');
        const videoInput = document.getElementById('txMediaVideoInput');
        const photoBtn   = document.getElementById('txPhotoCaptureBtn');
        const videoBtn   = document.getElementById('txVideoCaptureBtn');
        const photoPreview = document.getElementById('txMediaPhotoPreviewContainer');
        const videoPreview = document.getElementById('txMediaVideoPreviewContainer');

        const addMediaPreview = (file, container) => {
            const id = Date.now() + Math.random();
            _modalMediaFiles.push({ id, file });
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid rgba(59,130,246,0.4);';
            wrap.dataset.mediaId = id;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button'; removeBtn.innerHTML = '&times;';
            removeBtn.style.cssText = 'position:absolute;top:2px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;line-height:16px;cursor:pointer;padding:0;z-index:1;';
            removeBtn.addEventListener('click', () => { _modalMediaFiles = _modalMediaFiles.filter(m => m.id !== id); wrap.remove(); });
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                img.src = URL.createObjectURL(file);
                wrap.appendChild(img);
            } else {
                const icon = document.createElement('div');
                icon.style.cssText = 'width:100%;height:100%;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;';
                icon.innerHTML = '<i class="fas fa-video" style="color:#3B82F6;font-size:1.4rem;"></i><span style="color:#ccc;font-size:0.6rem;text-align:center;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;">' + file.name + '</span>';
                wrap.appendChild(icon);
            }
            wrap.appendChild(removeBtn);
            if (container) container.appendChild(wrap);
        };

        if (photoBtn) photoBtn.onclick = () => photoInput && photoInput.click();
        if (videoBtn) videoBtn.onclick = () => videoInput && videoInput.click();
        if (photoInput) photoInput.onchange = function() { Array.from(this.files).forEach(f => addMediaPreview(f, photoPreview)); this.value = ''; };
        if (videoInput) videoInput.onchange = function() { Array.from(this.files).forEach(f => addMediaPreview(f, videoPreview)); this.value = ''; };

        // D. Handle Form Submission -> Show Confirmation
        form.onsubmit = function(e) {
            e.preventDefault();
            const car = window._currentCarData; // Lấy dữ liệu xe đang xem
            if(!car) return;

            const pickupDateVal = (modalPickup?.value || '').trim();
            const returnDateVal = (modalReturn?.value || '').trim();
            const todayStr = today();

            if (!pickupDateVal || !returnDateVal) {
                Swal.fire('Thiếu thông tin', 'Vui lòng chọn đầy đủ ngày nhận và ngày trả xe.', 'warning');
                return;
            }
            if (pickupDateVal < todayStr) {
                Swal.fire('Ngày nhận không hợp lệ', 'Ngày nhận xe phải bằng hoặc sau ngày hiện tại.', 'warning');
                modalPickup?.focus();
                return;
            }
            if (returnDateVal <= pickupDateVal) {
                Swal.fire('Ngày trả không hợp lệ', 'Ngày trả xe phải sau ngày nhận xe.', 'warning');
                modalReturn?.focus();
                return;
            }

            const days = Math.max(1, Math.round((new Date(returnDateVal) - new Date(pickupDateVal)) / 86400000));
            const pricePerDay = toNumber(car.giathue);
            const rentalCost = days * pricePerDay;
            const addons = [...form.querySelectorAll('input[name="addon_services"]:checked')];
            let addonTotal = 0;
            let addonNames = [];
            let addonDetails = [];
            addons.forEach(cb => {
                const p = toNumber(cb.dataset.price);
                const u = cb.dataset.unit || 'chuyến';
                const cost = u === 'ngày' ? p * days : p;
                addonTotal += cost;
                addonNames.push(cb.value);
                addonDetails.push({
                    name: cb.value,
                    unit_price: p,
                    unit: u,
                    quantity: u === 'ngày' ? days : 1,
                    total_price: cost
                });
            });
            const totalCost = rentalCost + addonTotal;
            const addonPayload = {
                names: addonNames,
                items: addonDetails,
                total: addonTotal
            };

            // Populate Confirmation Table
            const cf = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
            cf('tx-cf-name', form.customer_name.value);
            cf('tx-cf-phone', form.customer_phone.value);
            cf('tx-cf-email', form.customer_email.value || 'N/A');
            const selectedAddress = (form.customer_address?.value || '').trim();
            const addressRow = document.getElementById('tx-cf-address-row');
            const addressEl = document.getElementById('tx-cf-address');
            if (addressRow && addressEl) {
                if (selectedAddress) {
                    addressEl.textContent = selectedAddress;
                    addressRow.style.display = '';
                } else {
                    addressRow.style.display = 'none';
                }
            }
            cf('tx-cf-pickup', pickupDateVal + ' ' + (document.getElementById('pickupTime')?.value || '08:00'));
            cf('tx-cf-return', returnDateVal + ' ' + (document.getElementById('returnTime')?.value || '08:00'));
            cf('tx-cf-days', days + ' ngày');
            cf('tx-cf-price-day', fmt(pricePerDay) + ' đ/ngày');
            cf('tx-cf-rental-cost', fmt(rentalCost) + ' đ');
            const totalEl = document.getElementById('tx-cf-total');
            if (totalEl) {
                totalEl.innerHTML = `${fmt(totalCost)} đ<small class="d-block text-muted" style="font-weight:500;">= ${fmt(rentalCost)}đ + ${fmt(addonTotal)}đ</small>`;
            }

            const addonRow = document.getElementById('tx-cf-addon-row');
            const addonEl = document.getElementById('tx-cf-addon');
            if (addonEl) {
                if (addonDetails.length) {
                    if (addonRow) addonRow.style.display = 'flex';
                    addonEl.innerHTML = `<details class="tx-addon-fee-list tx-addon-collapsible" open><summary class="tx-addon-collapsible-summary"><span class="tx-addon-collapsible-title"><i class="fas fa-list-ul"></i>Chi tiết phí dịch vụ</span><span class="tx-addon-collapsible-meta"><span class="tx-addon-collapsible-total">${fmt(addonTotal)}đ</span><i class="fas fa-chevron-down tx-addon-collapsible-icon" aria-hidden="true"></i></span></summary>
                        ${addonDetails.map(item => {
                            const unit = item.unit || 'chuyến';
                            const calcText = unit === 'ngày'
                                ? `${fmt(item.unit_price)}đ x ${item.quantity} ngày`
                                : `${fmt(item.unit_price)}đ x ${item.quantity} ${escapeHtml(unit)}`;
                            return `<div class="tx-addon-fee-item">
                                <span class="tx-addon-fee-left">
                                    <span class="tx-addon-fee-name">${escapeHtml(item.name)}</span>
                                    <span class="tx-addon-fee-calc">(${calcText})</span>
                                </span>
                                <span class="tx-addon-fee-right">${fmt(item.total_price)}đ</span>
                            </div>`;
                        }).join('')}
                        <div class="tx-addon-fee-total">
                            <span class="tx-addon-fee-left">Tổng phí dịch vụ:</span><span class="tx-addon-fee-right">${fmt(addonTotal)}đ</span>
                        </div>
                    </details>`;
                } else {
                    if (addonRow) addonRow.style.display = 'none';
                    addonEl.textContent = 'Không có';
                }
            }

            const imgEl = document.getElementById('tx-cf-car-front-img');
            if(imgEl) {
                const av = car.anhdaidien || '';
                const imgSrc = av.startsWith('http') ? av : (av.match(/^[a-zA-Z0-9_-]{20,}$/) ? `https://lh3.googleusercontent.com/u/0/d/${av}` : 'public/assets/images/cars/' + av);
                imgEl.src = imgSrc; imgEl.style.display='block';
            }
            const carRow = document.getElementById('tx-cf-car-front-row');
            if(carRow) carRow.style.display = 'flex';

            document.getElementById('bookingFormFull').style.display = 'none';
            document.getElementById('txBookingConfirm').style.display = 'block';
            
            // Final Database Submission — TỰ ĐỘNG TẠO TÀI KHOẢN
            document.getElementById('txConfirmSubmitBtn').onclick = async function() {
                // Safety check: chặn đặt xe chính mình (phòng bypass UI)
                try {
                    const _sess = window._dvqt_session_cache || await DVQTApp.checkSession();
                    if (_sess && _sess.logged_in && car.provider_id && String(_sess.id) === String(car.provider_id)) {
                        Swal.fire('Không thể đặt', 'Bạn không thể đặt xe mà chính bạn cho thuê.', 'warning');
                        return;
                    }
                } catch(_e) {}

                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
                
                const buildSheetData = (formData, orderCode) => {
                    return {
                        sheet_type: "Thuê xe",
                        "Mã đơn": orderCode || "",
                        "Tên khách": formData.customer_name || "",
                        "Số điện thoại": formData.customer_phone || "",
                        "Email": formData.customer_email || "",
                        "Địa chỉ": formData.customer_address || "",
                        "Tên xe": formData.car_name || "",
                        "Ngày nhận": formData.pickup_date + " " + formData.pickup_time,
                        "Ngày trả": formData.return_date + " " + formData.return_time,
                        "Số ngày thuê": formData.days || 0,
                        "Giá thuê/ngày": Number(formData.price_per_day || 0),
                        "Phí dịch vụ": Number(formData.addon_total || 0),
                        "Tổng tiền": Number(formData.total_cost || 0),
                        "Dịch vụ kèm": formData.addon_names ? formData.addon_names.join(", ") : "",
                        "Ghi chú": formData.notes || "",
                        "Ngày đặt": new Date().toLocaleString('vi-VN')
                    };
                };

                const custName = form.customer_name.value.trim();
                const custPhone = form.customer_phone.value.trim();
                
                try {
                    // BƯỚC 1: Tự động tạo tài khoản nếu chưa đăng nhập
                    let accountResult = null;
                    let isLoggedIn = false;
                    try {
                        const currentSession = await DVQTApp.checkSession();
                        isLoggedIn = !!(currentSession && currentSession.logged_in);
                    } catch(_e) {}

                    if (!isLoggedIn) {
                        const helper = window.DVQTBookingHelper;
                        if (helper) {
                            accountResult = await helper.autoCreateOrFindAccount(custName, custPhone);
                        } else {
                            accountResult = await _txAutoCreateOrFindAccount(custName, custPhone);
                        }
                    }

                    // BƯỚC 2: Tải file lên Drive (CATCH lỗi không làm dừng các bước sau)
                    let driveIds = [];
                    try {
                        if (_modalMediaFiles && _modalMediaFiles.length > 0) {
                            this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang tải ảnh...';
                            for (const m of _modalMediaFiles) {
                                try {
                                    const up = await DVQTApp.uploadFile(m.file, { folderKey: 30 });
                                    if (up && up.success) driveIds.push(up.fileId);
                                } catch (err) {
                                    console.warn('Upload failed for 1 file:', err);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Lỗi Google Drive:', e);
                    }

                    // BƯỚC 3: Gửi đơn đặt xe (Bắt buộc thành công)
                    let rawId = null;
                    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const payload = {
                        id_nguoidung: accountResult?.userId || s?.id || null,
                        tenkhachhang: custName,
                        sdtkhachhang: custPhone,
                        emailkhachhang: form.customer_email.value,
                        id_xe: car.id,
                        ten_xe: car.tenxe,
                        ngay_nhan_yeu_cau: pickupDateVal,
                        ngay_tra_yeu_cau: returnDateVal,
                        gio_nhan_yeu_cau: document.getElementById('pickupTime')?.value || '08:00',
                        gio_tra_yeu_cau: document.getElementById('returnTime')?.value || '08:00',
                        diachikhachhang: form.customer_address.value,
                        ghi_chu: form.notes.value,
                        hinh_anh: driveIds.join(','),
                        dich_vu_kem: JSON.stringify(addonPayload),
                        so_ngay_thue: days,
                        gia_thue_nhat: pricePerDay,
                        tong_tien_dich_vu: addonTotal,
                        tong_tien: totalCost,
                        ngaydat: nowStr,
                        created_at: nowStr
                    };

                    try {
                        const res = await DVQTKrud.insertRow('datlich_thuexe', payload);
                        rawId = res ? (res.id || (res.data && res.data.id)) : null;
                        if (!rawId) throw new Error('Hệ thống không thể tiếp nhận yêu cầu.');
                    } catch (err) {
                        console.error('Database error:', err);
                        Swal.fire('Lỗi Database', err?.message || 'Không thể gửi đơn hàng vào hệ thống', 'error');
                        this.disabled = false;
                        this.innerHTML = '<i class="fas fa-check me-2"></i> Xác nhận đặt xe';
                        return;
                    }

                    // BƯỚC 4: Gửi lên Google Sheet (CATCH lỗi không làm dừng flow)
                    try {
                        if (window.saveToGoogleSheet) {
                            const sheetData = buildSheetData({
                                customer_name: custName,
                                customer_phone: custPhone,
                                customer_email: form.customer_email.value,
                                car_name: car.tenxe,
                                pickup_date: pickupDateVal,
                                pickup_time: document.getElementById('pickupTime')?.value || '08:00',
                                return_date: returnDateVal,
                                return_time: document.getElementById('returnTime')?.value || '08:00',
                                customer_address: form.customer_address.value,
                                notes: form.notes.value,
                                days: days,
                                price_per_day: pricePerDay,
                                addon_total: addonTotal,
                                total_cost: totalCost,
                                addon_names: addonNames
                            }, rawId);
                            window.saveToGoogleSheet(sheetData).catch(e => console.error('Gửi Sheet thất bại:', e));
                        }
                    } catch (e) {
                        console.error('Lỗi Google Sheet:', e);
                    }

                    // BƯỚC 5: Xử lý kết quả thành công
                    const orderCodePadded = String(rawId).padStart(7, '0');
                    if (window.DVQTBookingHelper) {
                        const helper = window.DVQTBookingHelper;
                        const redirectUrl = 'nguoidung/trang-ca-nhan.html';
                        await helper.showSuccessAlert(accountResult || {isNew:false}, custPhone, orderCodePadded, redirectUrl);
                    } else {
                        if (accountResult && accountResult.isNew) {
                            try { await DVQTApp.login(custPhone, custPhone); } catch(_e) {}
                            await Swal.fire({
                                title: '<span style="color:#0ea5e9">Đặt xe thành công!</span>',
                                html: `<div style="text-align:left; line-height:1.8;">
                                    <p><i class="fas fa-check-circle text-success me-1"></i> Mã đơn: <strong>#${orderCodePadded}</strong></p>
                                    <p><i class="fas fa-user-plus text-primary me-1"></i> Tài khoản đã được tạo tự động:</p>
                                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin:8px 0;">
                                        <p style="margin:4px 0;"><strong>SĐT:</strong> ${custPhone}</p>
                                        <p style="margin:4px 0;"><strong>Mật khẩu:</strong> ${custPhone} <small class="text-muted">(mặc định = SĐT)</small></p>
                                    </div>
                                </div>`,
                                icon: 'success',
                                confirmButtonText: 'Xem đơn hàng',
                                confirmButtonColor: '#0ea5e9'
                            });
                            window.location.href = 'nguoidung/trang-ca-nhan.html';
                        } else {
                            Swal.fire('Thành công!', `Đơn hàng #${orderCodePadded} đã được tiếp nhận.`, 'success')
                                .then(() => window.location.href = 'nguoidung/trang-ca-nhan.html');
                        }
                    }
                } catch(err) {
                    console.error('Booking flow error:', err);
                    Swal.fire('Lỗi', 'Có lỗi xảy ra trong quá trình xử lý đơn hàng.', 'error');
                } finally {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-check me-2"></i> Xác nhận đặt xe';
                }
            };
            
            document.getElementById('txConfirmBackBtn').onclick = () => {
                document.getElementById('bookingFormFull').style.display = 'block';
                document.getElementById('txBookingConfirm').style.display = 'none';
            };
        };
    };

    /**
     * Tự động tạo tài khoản hoặc tìm tài khoản hiện có theo SĐT (Thuê Xe).
     * Logic tương tự _bdAutoCreateOrFindAccount trong Thợ Nhà.
     */
    async function _txAutoCreateOrFindAccount(name, phone) {
        const krud = window.DVQTKrud;
        if (!krud) throw new Error('Hệ thống chưa sẵn sàng.');

        const pNorm = String(phone).replace(/\D/g, '');
        const rows = await krud.listTable('nguoidung', { limit: 2000 });
        const existing = rows.find(r => {
            const dbPhone = String(r.sodienthoai || r.phone || '').replace(/\D/g, '');
            return dbPhone === pNorm;
        });

        if (existing) {
            return { isNew: false, accountExists: true, userId: existing.id };
        }

        // Tạo tài khoản mới
        const now = new Date();
        const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const pad = n => String(n).padStart(2, '0');
        const created = `${vn.getFullYear()}-${pad(vn.getMonth()+1)}-${pad(vn.getDate())} ${pad(vn.getHours())}:${pad(vn.getMinutes())}:${pad(vn.getSeconds())}`;

        if (typeof krud.ensureNguoidungTable === 'function') {
            await krud.ensureNguoidungTable();
        }

        const userData = {
            hovaten: name,
            sodienthoai: phone,
            matkhau: phone,
            id_dichvu: '0',
            created_date: created,
            trangthai: '0'
        };

        const result = await krud.insertRow('nguoidung', userData);
        const newId = result?.data?.id || result?.id || null;
        return { isNew: true, accountExists: false, userId: newId };
    }
})();