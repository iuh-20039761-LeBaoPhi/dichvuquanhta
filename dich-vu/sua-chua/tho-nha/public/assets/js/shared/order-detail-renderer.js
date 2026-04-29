/** ==========================================================================
   THO NHA - PREMIUM ORDER DETAIL RENDERER (v4.0)
   Encapsulates rendering logic for the premium order detail partial.
   Follows Giặt Ủi Nhanh premium style data-binding.
   ========================================================================= */

const ThoNhaOrderDetailRenderer = (() => {
    'use strict';

    const utils = window.ThoNhaOrderViewUtils;
    if (!utils) return console.error('[DetailRenderer] ThoNhaOrderViewUtils missing!');

    /**
     * Map Thợ Nhà order object to Premium View.
     */
    function render(order, role, container) {
        if (!container) return;

        // Helper để trả về 'Chưa' nếu ngày null
        const formatDateWithChua = (dt) => dt ? utils.formatDateTime(dt) : 'Chưa';

        // 1. Binder Map: Tự động điền dữ liệu theo ID
        const hasActual = order.actualCost > 0;

        // Cập nhật nhãn tiêu đề nếu đã báo giá
        if (hasActual) {
            const labelService = container.querySelector('span[id="heroServiceFee"]')?.previousElementSibling || container.querySelector('.meta-label:nth-of-type(1)');
            if (labelService) labelService.textContent = 'Giá thợ báo:';

            const labelSurcharge = container.querySelector('span[id="heroSurchargeFee"]')?.previousElementSibling;
            if (labelSurcharge) labelSurcharge.textContent = 'Được trợ giá/giảm:';
        }

        // Cập nhật nhãn Tổng tiền ở khu vực trung tâm / Header
        const labelTotalMain = container.querySelector('span[id="heroTotalAmountHeader"]')?.previousElementSibling;
        const textTotal = hasActual ? 'TỔNG TIỀN' : 'CHI PHÍ ƯỚC TÍNH';
        if (labelTotalMain) labelTotalMain.textContent = textTotal;

        // Thử tìm nhãn ở các khu vực khác nếu có class đặc trưng
        container.querySelectorAll('.total-label-sync').forEach(el => {
            el.textContent = textTotal;
        });

        const bindings = {
            heroOrderCode: '#' + order.orderCode,
            heroServiceName: order.fullService || order.service,
            heroBookingDate: utils.formatDateTime(order.dates.ordered),
            heroServiceFee: hasActual ? utils.formatCurrencyVn(order.actualCost) : utils.formatCurrencyVn(order.estimated_price),
            heroTransportFee: utils.formatCurrencyVn(order._raw.phidichuyen || 0),
            heroSurchargeFee: hasActual ? ('- ' + utils.formatCurrencyVn(order.subsidyAmount)) : utils.formatCurrencyVn(order._raw.phuphi || 0),
            heroPaymentStatus: hasActual ? 'Đã báo giá' : 'Chưa báo giá',
            heroPaymentSub: hasActual ? 'Chờ thanh toán' : 'Cập nhật theo thực tế',
            heroTotalAmount: hasActual ? utils.formatCurrencyVn(order.customerPays) : utils.formatCurrencyVn(order.total_price || (order.estimated_price + (order._raw.phidichuyen || 0))),
            heroTotalAmountHeader: hasActual ? utils.formatCurrencyVn(order.customerPays) : utils.formatCurrencyVn(order.total_price || (order.estimated_price + (order._raw.phidichuyen || 0))),
            heroAddress: order.address,
            detailCreatedAt: utils.formatDateTime(order.dates.ordered),
            detailExecutionStart: formatDateWithChua(order.dates.accepted),
            detailExecutionActual: formatDateWithChua(order._raw.ngaythuchienthucte || null),
            detailExecutionEnd: formatDateWithChua(order.dates.completed),
            detailNote: order.note || 'Chưa có ghi chú.',
            detailCustomerName: order.customer.name,
            detailCustomerPhone: order.customer.phone,
            detailCustomerAddress: order._raw.diachikhachhang || (order.customer && order.customer.address) || '---',
            detailProviderName: (order.provider.id && order.provider.name !== 'Nhà cung cấp')
                ? (order.provider.company || order.provider.name)
                : 'Chờ nhận',
            detailProviderPhone: order.provider.id ? (order.provider.phone || '---') : '---',
            detailProviderAddress: order._raw.diachincc || (order.provider && order.provider.address) || '---'
        };
        Object.entries(bindings).forEach(([id, val]) => setText(container, id, val));

        // 2. Status & Progress Sync
        const badgeNode = container.querySelector('#heroStatusBadge');
        if (badgeNode) badgeNode.innerHTML = utils.buildStatusBadge(order.status);

        // Tự động tính % dựa trên ngày tháng thực tế
        const progress = (order.progress && order.progress > 0) ? order.progress : calculateProgress(order);
        const progressStr = progress.toFixed(0) + '%';

        ['heroProgressPercent', 'detailProgressText', 'heroProgressPercentLabel'].forEach(id => setText(container, id, progressStr));

        const ring = container.querySelector('#heroProgressRing');
        if (ring) {
            // Nếu hủy đơn thì đổi vòng tròn sang màu RED (#ef4444)
            const isCanceled = order.status === 'canceled' || order.status === 'rejected';
            const progressColor = isCanceled ? '#ef4444' : 'var(--primary-emerald)';

            ring.style.background = `conic-gradient(${progressColor} ${progress}%, #334155 0%)`;
        }

        const bar = container.querySelector('#detailProgressBar');
        if (bar) bar.style.width = progressStr;

        // Cụm progress-fill trong timeline
        const fillEl = container.querySelector('.progress-fill');
        if (fillEl) fillEl.style.width = progressStr;

        // --- Render Avatars ---
        const getRootUrl = () => (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : window.location.pathname.split('/dich-vu/sua-chua/tho-nha/')[0];
        const session = window._dvqt_session_cache;

        let custAvatar = order.customer && order.customer.avatar;
        if (!custAvatar && role === 'customer' && session) custAvatar = session.link_avatar || session.avatar || session.avatartenfile || '';

        const custAvatarEl = container.querySelector('#customerAvatarBadge');
        if (custAvatarEl && custAvatar) {
            if (custAvatar.startsWith('http') || custAvatar.includes('/')) {
                const url = custAvatar.startsWith('http') ? custAvatar : (getRootUrl() + '/public/uploads/users/' + custAvatar);
                custAvatarEl.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                custAvatarEl.innerHTML = `
                    <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:50%;">
                        <iframe src="https://drive.google.com/file/d/${custAvatar}/preview" 
                                frameborder="0" scrolling="no"
                                style="width: 300%; height: 300%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;"></iframe>
                    </div>`;
            }
            custAvatarEl.style.padding = '0';
            custAvatarEl.style.overflow = 'hidden';
        }

        let provAvatar = order.provider && order.provider.avatar;

        const provAvatarEl = container.querySelector('#providerAvatarBadge');
        if (provAvatarEl && provAvatar) {
            if (provAvatar.startsWith('http') || provAvatar.includes('/')) {
                const url = provAvatar.startsWith('http') ? provAvatar : (getRootUrl() + '/public/uploads/users/' + provAvatar);
                provAvatarEl.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                provAvatarEl.innerHTML = `
                    <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:50%;">
                        <iframe src="https://drive.google.com/file/d/${provAvatar}/preview" 
                                frameborder="0" scrolling="no"
                                style="width: 300%; height: 300%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;"></iframe>
                    </div>`;
            }
            provAvatarEl.style.padding = '0';
            provAvatarEl.style.overflow = 'hidden';
        }

        // 3. Render sub-sections
        renderTasks(container, order);
        renderReviews(container, order, role);
        renderBookingMedia(container, order);
        renderActions(container, order, role);
    }

    function renderReviews(container, order, role) {
        const raw = order._raw || {};

        // --- Feedback Khách hàng ---
        const custTextEl = container.querySelector('#reviewCustomerText');
        const custHeadEl = container.querySelector('#reviewCustomerText')?.closest('.review-card')?.querySelector('.review-card-head');
        if (custTextEl) {
            if (raw.danhgiakhachhang) {
                custTextEl.innerHTML = `<div>${raw.danhgiakhachhang}</div>`;
                if (raw.hinhanhminhchung_kh) {
                    const isVid = raw.hinhanhminhchung_kh.startsWith('vid_');
                    const cleanId = raw.hinhanhminhchung_kh.replace('vid_', '');
                    custTextEl.innerHTML += `
                        <div class="mt-2">
                            <small class="text-muted d-block mb-1 fw-bold"><i class="fas ${isVid ? 'fa-video' : 'fa-image'} me-1"></i> Minh chứng:</small>
                            <div style="position:relative; width:100%; height:200px; border-radius:12px; overflow:hidden; border:1px solid #eee; background:${isVid ? '#000' : 'transparent'};">
                                <iframe src="https://drive.google.com/file/d/${cleanId}/preview" 
                                        frameborder="0" scrolling="no"
                                        style="width: 100%; height: 100%; pointer-events: none;"></iframe>
                                <a href="https://drive.google.com/file/d/${cleanId}/view" target="_blank" 
                                   style="position: absolute; inset: 0; z-index: 10;"></a>
                            </div>
                        </div>`;
                }
                if (custHeadEl) {
                    const chip = custHeadEl.querySelector('.panel-chip');
                    if (chip) chip.outerHTML = '<span class="panel-chip success">Đã đánh giá</span>';
                }
            } else if (role === 'customer' && order.status === 'done') {
                custTextEl.innerHTML = `
                    <textarea class="form-control mb-2" id="inputCustFeedback" placeholder="Nhập cảm nhận của bạn về dịch vụ..." rows="3"></textarea>
                    <div class="d-flex flex-column gap-2">
                        <div style="flex:1;">
                            <input type="file" id="fileCustEvidence" class="form-control form-control-sm" accept="image/*,video/*" onchange="ThoNhaOrderDetailRenderer.handleReviewMediaPreview(this, 'custReviewPreviewBox')">
                        </div>
                        <div id="custReviewPreviewBox" class="mt-1"></div>
                        <button class="btn btn-primary btn-sm px-3 mt-1" data-action="submit-customer-feedback" data-id="${order.id}">Gửi đánh giá</button>
                    </div>
                `;
            } else {
                custTextEl.innerHTML = '<div class="text-muted small"><em>Chưa có đánh giá từ khách hàng.</em></div>';
            }
        }

        // --- Feedback NCC ---
        const nccTextEl = container.querySelector('#reviewProviderText');
        const nccHeadEl = container.querySelector('#reviewProviderText')?.closest('.review-card')?.querySelector('.review-card-head');
        if (nccTextEl) {
            if (raw.danhgiancc) {
                nccTextEl.innerHTML = `<div>${raw.danhgiancc}</div>`;
                if (raw.hinhanhminhchung_ncc) {
                    const isVid = raw.hinhanhminhchung_ncc.startsWith('vid_');
                    const cleanId = raw.hinhanhminhchung_ncc.replace('vid_', '');
                    nccTextEl.innerHTML += `
                        <div class="mt-2">
                            <small class="text-muted d-block mb-1 fw-bold"><i class="fas ${isVid ? 'fa-video' : 'fa-image'} me-1"></i> Minh chứng:</small>
                            <div style="position:relative; width:100%; height:200px; border-radius:12px; overflow:hidden; border:1px solid #eee; background:${isVid ? '#000' : 'transparent'};">
                                <iframe src="https://drive.google.com/file/d/${cleanId}/preview" 
                                        frameborder="0" scrolling="no"
                                        style="width: 100%; height: 100%; pointer-events: none;"></iframe>
                                <a href="https://drive.google.com/file/d/${cleanId}/view" target="_blank" 
                                   style="position: absolute; inset: 0; z-index: 10;"></a>
                            </div>
                        </div>`;
                }
                if (nccHeadEl) {
                    const chip = nccHeadEl.querySelector('.panel-chip');
                    if (chip) chip.outerHTML = '<span class="panel-chip success">Đã báo cáo</span>';
                }
            } else if (role === 'provider' && order.status === 'done') {
                nccTextEl.innerHTML = `
                    <textarea class="form-control mb-2" id="inputProviderFeedback" placeholder="Mô tả công việc đã hoàn thành hoặc sự cố..." rows="3"></textarea>
                    <div class="d-flex flex-column gap-2">
                        <div style="flex:1;">
                            <input type="file" id="fileProviderEvidence" class="form-control form-control-sm" accept="image/*,video/*" onchange="ThoNhaOrderDetailRenderer.handleReviewMediaPreview(this, 'provReviewPreviewBox')">
                        </div>
                        <div id="provReviewPreviewBox" class="mt-1"></div>
                        <button class="btn btn-primary btn-sm px-3 mt-1" data-action="submit-provider-feedback" data-id="${order.id}">Gửi báo cáo</button>
                    </div>
                `;
            } else {
                nccTextEl.innerHTML = '<div class="text-muted small"><em>Chưa có báo cáo từ thợ.</em></div>';
            }
        }
    }

    /**
     * Render ảnh/video đính kèm khi đặt đơn (Drive IDs) - Hiển thị dưới Ghi chú
     */
    function renderBookingMedia(container, order) {
        const raw = order._raw || {};
        const mediaField = raw.link_hinhanh_khachhang || '';
        if (!mediaField) return;

        const allIds = mediaField.split(',').map(s => s.trim()).filter(Boolean);
        if (allIds.length === 0) return;

        const photoIds = allIds.filter(id => !id.startsWith('vid_'));
        const videoIds = allIds.filter(id => id.startsWith('vid_')).map(id => id.replace('vid_', ''));

        const noteEl = container.querySelector('#detailNote');
        if (!noteEl) return;

        let galleryWrap = container.querySelector('#detailBookingMediaWrap');
        if (!galleryWrap) {
            galleryWrap = document.createElement('div');
            galleryWrap.id = 'detailBookingMediaWrap';
            galleryWrap.className = 'mt-2 pt-2 border-top-dashed';
            galleryWrap.innerHTML = '<div id="detailBookingMediaGrid" class="d-flex flex-column gap-3"></div>';
            noteEl.after(galleryWrap);
        }

        const mediaGrid = container.querySelector('#detailBookingMediaGrid');
        if (mediaGrid) {
            let html = '';

            if (photoIds.length > 0) {
                html += `<div>
                    <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-image me-1"></i> Hình ảnh đính kèm:</small>
                    <div class="d-flex flex-wrap gap-2">
                        ${photoIds.map(id => `
                            <div class="booking-media-item-mini" style="position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">
                                <iframe src="https://drive.google.com/file/d/${id}/preview" 
                                        frameborder="0" scrolling="no"
                                        style="width: 100%; height: 100%; pointer-events: none;"></iframe>
                                <a href="https://drive.google.com/file/d/${id}/view" target="_blank" 
                                   style="position: absolute; inset: 0; z-index: 10;"></a>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            if (videoIds.length > 0) {
                html += `<div>
                    <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-video me-1"></i> Video đính kèm:</small>
                    <div class="d-flex flex-wrap gap-2">
                        ${videoIds.map(id => `
                            <div class="booking-media-item-mini" style="position:relative; width:120px; height:80px; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; background:#000;">
                                <iframe src="https://drive.google.com/file/d/${id}/preview" 
                                        frameborder="0" scrolling="no"
                                        style="width: 100%; height: 100%; pointer-events: none;"></iframe>
                                <a href="https://drive.google.com/file/d/${id}/view" target="_blank" 
                                   style="position: absolute; inset: 0; z-index: 10;"></a>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            mediaGrid.innerHTML = html;
        }
    }

    function setText(container, id, value) {
        const node = container.querySelector('#' + id);
        if (node) node.textContent = value || '---';
    }

    /**
     * Tính % tiến độ dựa trên các mốc thời gian thực tế
     */
    function calculateProgress(order) {
        const dates = order.dates || {};
        const raw = order._raw || {};

        if (order.status === 'canceled' || order.status === 'rejected') return 0;

        // Bước 4: Hoàn thành thực tế
        if (dates.completed) return 100;

        // Bước 3: Đã bắt đầu làm thực tế (Trường ngaythuchienthucte trong database)
        if (raw.ngaythuchienthucte) return 75;

        // Bước 2: Thợ đã nhận đơn
        if (dates.accepted || (order.provider && order.provider.id)) return 40;

        // Bước 1: Mới đặt đơn
        if (dates.ordered) return 10;

        return 0;
    }

    function renderTasks(container, order) {
        const list = container.querySelector('#detailTasksList');
        if (!list) return;

        // Tách dịch vụ từ chuỗi text (ví dụ: "Lát nền gạch - 6.000.000đ + Sơn nhà...")
        const tasks = (order.fullService || order.service).split(' + ').map(t => t.trim());
        list.innerHTML = tasks.map((task, idx) => `
            <li class="task-item">
                <span class="task-index">${idx + 1}</span>
                <p class="task-text">${task}</p>
            </li>
        `).join('');
    }

    function renderActions(container, order, role) {
        const area = container.querySelector('#actionArea');
        if (!area) return;

        let html = '';
        if (role === 'customer') {
            // Khách chỉ được hủy khi đơn chưa có thợ nhận
            if (!order.provider.id && order.status === 'new') {
                html = `<button class="btn-cancel" data-action="cancel-order" data-id="${order.id}" data-code="${order.orderCode}">HỦY ĐƠN</button>`;
            } else if (order.status === 'done' && (!order.actualCost || order.actualCost === 0)) {
                html = `<button class="btn-emerald btn-action-pricing" data-action="open-pricing-modal" data-id="${order.id}">NHẬP GIÁ THỰC TẾ</button>`;
            }
        } else if (role === 'provider') {
            // Nhà cung cấp: Nhận -> Bắt đầu -> Hoàn thành
            if (!order.provider.id && order.status === 'new') {
                html = `<button class="btn-emerald btn-action-accept" data-action="accept-order" data-id="${order.id}">XÁC NHẬN</button>`;
            } else if (order.status === 'confirmed' || order.status === 'pending') {
                html = `<button class="btn-emerald btn-action-start" data-action="start-order" data-id="${order.id}">BẮT ĐẦU LÀM</button>`;
            } else if (order.status === 'doing' || order.status === 'working') {
                html = `<button class="btn-emerald btn-action-complete" data-action="complete-order" data-id="${order.id}">HOÀN THÀNH</button>`;
            }
        } else if (role === 'admin') {
            html = `<span class="invoice-status-chip">CHẾ ĐỘ XEM (ADMIN)</span>`;
        }

        area.innerHTML = html;

        // Toggle 'no-actions' class on the shell based on whether actions are present
        const shell = container.querySelector('.order-detail-shell');
        if (shell) {
            if (!html || html.trim() === '') {
                shell.classList.add('no-actions');
            } else {
                shell.classList.remove('no-actions');
            }
        }
    }

    function handleReviewMediaPreview(input, boxId) {
        const box = document.getElementById(boxId);
        if (!box) return;
        box.innerHTML = '';
        
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const url = URL.createObjectURL(file);
            
            if (file.type.startsWith('image/')) {
                box.innerHTML = `
                    <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-image me-1"></i> Hình ảnh đã chọn:</small>
                    <img src="${url}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #ddd;">
                `;
            } else if (file.type.startsWith('video/')) {
                box.innerHTML = `
                    <small class="text-muted d-block mb-1 fw-bold"><i class="fas fa-video me-1"></i> Video đã chọn:</small>
                    <video src="${url}" muted autoplay loop playsinline style="width:120px; height:80px; object-fit:cover; border-radius:8px; background:#000;"></video>
                `;
            }
        }
    }

    return { render, handleReviewMediaPreview };
})();

window.ThoNhaOrderDetailRenderer = ThoNhaOrderDetailRenderer;
