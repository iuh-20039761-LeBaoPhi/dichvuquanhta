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

        // 1. Text Data
        setText(container, 'heroOrderCode', '#' + order.orderCode);
        setText(container, 'heroServiceName', order.service);
        setText(container, 'heroBookingDate', utils.formatDateTime(order.dates.ordered));
        setText(container, 'heroServiceFee', utils.formatCurrencyVn(order.estimated_price));
        setText(container, 'heroTransportFee', utils.formatCurrencyVn(order._raw.phidichuyen || 0));
        setText(container, 'heroPaymentStatus', order.actualCost > 0 ? 'Đã báo giá' : 'Chưa báo giá');
        
        setText(container, 'heroTotalAmount', utils.formatCurrencyVn(order.total_price));
        setText(container, 'heroTimeRange', utils.formatDateTime(order.dates.ordered));
        setText(container, 'heroAddress', order.address);

        // 2. Status Badge
        const badgeNode = container.querySelector('#heroStatusBadge');
        if (badgeNode) {
            badgeNode.innerHTML = utils.buildStatusBadge(order.status);
            badgeNode.style.background = 'none'; // Re-re-sync
        }

        // 4. Progress Sync (Đồng bộ % hoàn thành)
        const progress = order.progress || 0;
        const progressStr = progress.toFixed(0) + '%';
        setText(container, 'heroProgressPercent', progressStr);
        setText(container, 'detailProgressText', progressStr);
        
        const ring = container.querySelector('#heroProgressRing');
        if (ring) {
            // Cập nhật gradient hình tròn theo % tiến độ
            ring.style.background = `conic-gradient(var(--detail-primary) ${progress}%, #e2e8f0 ${progress}%)`;
        }

        const bar = container.querySelector('#detailProgressBar');
        if (bar) {
            bar.style.width = progressStr;
        }

        // 5. Timeline & Descriptive Status
        setText(container, 'detailCreatedAt', utils.formatDateTime(order.dates.ordered));
        setText(container, 'detailExecutionStart', utils.formatDateTime(order.dates.accepted));
        setText(container, 'detailExecutionEnd', utils.formatDateTime(order.dates.completed));

        // 5. Tasks (Dịch vụ)
        renderTasks(container, order);

        // 6. Notes
        setText(container, 'detailNote', order.note || 'Không có ghi chú đặc biệt.');

        // 7. Identity (KH & NCC)
        setText(container, 'detailCustomerName', order.customer.name);
        setText(container, 'detailCustomerPhone', order.customer.phone);
        setText(container, 'detailCustomerAddress', order.customer.address);

        setText(container, 'detailProviderName', order.provider.company || order.provider.name || 'Chưa nhận đơn');
        setText(container, 'detailProviderCompany', order.provider.company || '---');
        setText(container, 'detailProviderPhone', order.provider.phone || '---');
        
        const providerChip = container.querySelector('#providerStateChip');
        if (providerChip) {
            providerChip.textContent = order.provider.id ? 'Đang thực hiện' : 'Chưa nhận';
            providerChip.className = 'panel-chip ' + (order.provider.id ? 'success' : 'warn');
        }

        // 8. Reviews & Evidence (KH & NCC Feedback)
        renderReviews(container, order, role);

        // 9. Action Area (Linh động theo vai trò)
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
                    custTextEl.innerHTML += `<div class="mt-2"><img src="../../uploads/evidence/${raw.hinhanhminhchung_kh}" style="max-width:100%; border-radius:8px; border:1px solid #eee;"></div>`;
                }
                if (custHeadEl) custHeadEl.querySelector('.panel-chip').outerHTML = '<span class="panel-chip success">Đã đánh giá</span>';
            } else if (role === 'customer' && order.status === 'done') {
                custTextEl.innerHTML = `
                    <textarea class="form-control mb-2" id="inputCustFeedback" placeholder="Nhập cảm nhận của bạn về dịch vụ..." rows="3"></textarea>
                    <div class="d-flex gap-2">
                        <input type="file" id="fileCustEvidence" class="form-control form-control-sm" accept="image/*">
                        <button class="btn btn-primary btn-sm" data-action="submit-customer-feedback" data-id="${order.id}">Gửi</button>
                    </div>
                `;
            }
        }

        // --- Feedback NCC ---
        const nccTextEl = container.querySelector('#reviewProviderText');
        const nccHeadEl = container.querySelector('#reviewProviderText')?.closest('.review-card')?.querySelector('.review-card-head');
        if (nccTextEl) {
            if (raw.danhgiancc) {
                nccTextEl.innerHTML = `<div>${raw.danhgiancc}</div>`;
                if (raw.hinhanhminhchung_ncc) {
                    nccTextEl.innerHTML += `<div class="mt-2"><img src="../../uploads/evidence/${raw.hinhanhminhchung_ncc}" style="max-width:100%; border-radius:8px; border:1px solid #eee;"></div>`;
                }
                if (nccHeadEl) nccHeadEl.querySelector('.panel-chip').outerHTML = '<span class="panel-chip success">Đã báo cáo</span>';
            } else if (role === 'provider' && order.status === 'done') {
                nccTextEl.innerHTML = `
                    <textarea class="form-control mb-2" id="inputProviderFeedback" placeholder="Mô tả công việc đã hoàn thành hoặc sự cố..." rows="3"></textarea>
                    <div class="d-flex gap-2">
                        <input type="file" id="fileProviderEvidence" class="form-control form-control-sm" accept="image/*">
                        <button class="btn btn-primary btn-sm" data-action="submit-provider-feedback" data-id="${order.id}">Báo cáo</button>
                    </div>
                `;
            }
        }
    }

    function setText(container, id, value) {
        const node = container.querySelector('#' + id);
        if (node) node.textContent = value || '---';
    }

    function calculateProgress(status) {
        if (status === 'done' || status === 'completed') return 100;
        if (status === 'doing' || status === 'working') return 75;
        if (status === 'confirmed' || status === 'assigned') return 40;
        if (status === 'new') return 10;
        return 0;
    }

    function renderTasks(container, order) {
        const list = container.querySelector('#detailTasksList');
        if (!list) return;

        // Tách dịch vụ từ chuỗi text (ví dụ: "Lát nền gạch - 6.000.000đ + Sơn nhà...")
        const tasks = order.service.split(' + ').map(t => t.trim());
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
            // Khách chỉ được hủy khi đơn chưa có thợ nhận (id_nhacungcap trống)
            if (!order.provider.id && order.status === 'new') {
                html = `<button class="btn btn-danger px-4 shadow-sm" data-action="cancel-order" data-id="${order.id}" data-code="${order.orderCode}" style="border-radius:12px; font-weight:800; border:2px solid rgba(255,255,255,0.2);">Hủy đơn ngay</button>`;
            } else if (order.status === 'done' && (!order.actualCost || order.actualCost === 0)) {
                // Form trợ giá ĐỂ DÀNH CHO KHÁCH HÀNG (Sẽ hiện ở vùng chi phí hoặc dưới hero)
                html = `
                <div class="card p-2 shadow-sm" style="border-radius:12px; border: 1px dashed #10b981; background: #f0fdf4;">
                    <p class="small mb-1 fw-bold text-success"><i class="fas fa-gift me-1"></i>Nhập giá & Nhận trợ giá 5%</p>
                    <div class="input-group">
                        <input type="number" id="inputActualPrice" class="form-control" placeholder="Giá thợ báo">
                        <button class="btn btn-success" data-action="submit-actual-price" data-id="${order.id}">Gửi</button>
                    </div>
                </div>`;
            }
        } else if (role === 'provider') {
            // Nhà cung cấp có quy trình: Nhận -> Bắt đầu -> Hoàn thành
            if (!order.provider.id && order.status === 'new') {
                html = `<button class="btn btn-primary px-4 shadow-sm" data-action="accept-order" data-id="${order.id}" style="border-radius:12px; font-weight:800; border:2px solid rgba(16,185,129,0.2);">NHẬN ĐƠN NGAY</button>`;
            } else if (order.status === 'confirmed' || order.status === 'pending') {
                html = `<button class="btn btn-warning px-4 shadow-sm" data-action="start-order" data-id="${order.id}" style="border-radius:12px; font-weight:800; color:#000;">BẮT ĐẦU LÀM</button>`;
            } else if (order.status === 'doing' || order.status === 'working') {
                html = `<button class="btn btn-success px-4 shadow-sm" data-action="complete-order" data-id="${order.id}" style="border-radius:12px; font-weight:800;">XÁC NHẬN XONG</button>`;
            }
        } else if (role === 'admin') {
            // Admin chỉ được xem trong trang này theo yêu cầu
            html = `<span class="badge bg-secondary" style="font-size:0.8rem; border-radius:8px; padding:8px 16px;">CHẾ ĐỘ XEM (ADMIN)</span>`;
        }

        area.innerHTML = html;
    }

    return { render };
})();

window.ThoNhaOrderDetailRenderer = ThoNhaOrderDetailRenderer;
