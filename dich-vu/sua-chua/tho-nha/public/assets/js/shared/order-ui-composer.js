/**
 * Order UI Composer - Siêu Module hiển thị đơn hàng dùng chung.
 * Hợp nhất logic vẽ Table, Mobile Cards và Modal Chi tiết cho Admin, NCC và Khách hàng.
 */
const ThoNhaOrderUI = (() => {
    'use strict';

    const utils = window.ThoNhaOrderViewUtils;
    if (!utils) return console.error('[OrderUI] ThoNhaOrderViewUtils missing!');

    /**
     * Vẽ hàng bảng (Table Row) chuẩn .
     */
    function buildRowHtml(order, role) {
        const utils = window.ThoNhaOrderViewUtils;
        const statusBadge = `<td class="status-cell">${utils.buildStatusBadge(order.status)}</td>`;

        // GIAO DIỆN ADMIN CHUẨN 9 CỘT 
        if (role === 'admin') {
            const orderCode = `<td class="mono"><strong>${order.orderCode}</strong></td>`;
            const providerName = order.provider.id ? utils.escapeHtml(order.provider.name) : '<em class="text-muted">Chưa nhận</em>';
            const actionBtn = `<td class="detail-cell"><button class="btn btn-sm btn-outline-primary" data-action="view-detail" data-id="${order.id}" title="Xem chi tiết"><i class="fas fa-eye"></i></button></td>`;
            return `
                <tr>
                    ${orderCode}
                    <td>${utils.escapeHtml(order.customer.name)}</td>
                    <td><div class="cell-service-text small fw-bold" title="${utils.escapeHtml(order.service)}">${utils.escapeHtml(order.service)}</div></td>
                    <td><div class="small text-muted">${providerName}</div></td>
                    <td><span class="text-danger fw-bold small">${utils.formatCurrencyVn(order.total_price)}</span></td>
                    ${statusBadge}
                    <td>${utils.formatDateTime(order.createdAt)}</td>
                    ${actionBtn}
                </tr>
            `;
        }

        // GIAO DIỆN THỢ (PROVIDER)
        if (role === 'provider') {
            const orderCode = `<td class="mono"><strong>${order.orderCode}</strong></td>`;
            const info = `<td><strong>${utils.escapeHtml(order.customer.name)}</strong><div class="small text-muted">${utils.escapeHtml(order.customer.phone)}</div></td>`;
            const service = `<td><div class="cell-service-text fw-bold" title="${utils.escapeHtml(order.service)}">${utils.escapeHtml(order.service)}</div></td>`;
            const time = `<td><div class="small fw-bold">${utils.formatDate(order.createdAt)}</div><div class="small text-muted">${utils.formatTime(order.createdAt)}</div></td>`;
            const actionBtn = `<td class="detail-cell"><button class="btn-u-view" data-action="view-detail" data-id="${order.id}">Xem</button></td>`;
            return `<tr>${orderCode}${info}${service}${time}${statusBadge}${actionBtn}</tr>`;
        }

        // GIAO DIỆN KHÁCH HÀNG (CUSTOMER)
        const orderCodeId = `<td><div class="fw-800" style="color:var(--u-primary)">${order.orderCode}</div></td>`;
        const serviceInfo = `
            <td>
                <div class="fw-bold">${utils.escapeHtml(order.service)}</div>
                <div class="small text-muted"><i class="fa-regular fa-file-lines me-1"></i>${utils.escapeHtml(order.note || 'Không có ghi chú')}</div>
            </td>
        `;
        const dateHtml = `
            <td>
                <div class="small fw-bold">${utils.formatDate(order.createdAt)}</div>
                <div class="small text-muted">${utils.formatTime(order.createdAt)}</div>
            </td>
        `;
        const actionHtml = `
            <td>
                <button class="btn-u-view" data-action="view-detail" data-id="${order.id}">
                    <i class="fa-regular fa-eye me-1"></i>Chi tiết
                </button>
            </td>
        `;
        return `<tr>${orderCodeId}${serviceInfo}${dateHtml}${statusBadge}${actionHtml}</tr>`;
    }

    /**
     * Vẽ thẻ di động (Mobile Card) chuẩn 
     */
    function buildCardHtml(order, role) {
        const title = (role === 'provider' || role === 'admin') ? (order.customer.name || 'Khách hàng') : order.service;
        const statusBadge = utils.buildStatusBadge(order.status);

        let rows = '';
        if (role === 'admin') {
            rows += `<div class="mobile-row"><span>SĐT</span><strong>${order.customer.phone || '---'}</strong></div>`;
            rows += `<div class="mobile-row"><span>Ngày</span><strong>${utils.formatDate(order.createdAt)}</strong></div>`;
            const providerDisplay = order.provider.id ? (order.provider.name) : '<span class="text-warning">Chờ nhận</span>';
            rows += `<div class="mobile-row"><span>Thợ</span><strong>${providerDisplay}</strong></div>`;
        } else if (role === 'provider') {
            rows += `<div class="mobile-row"><span>SĐT khách</span><strong>${order.customer.phone}</strong></div>`;
            rows += `<div class="mobile-row"><span>Dịch vụ</span><strong>${order.service}</strong></div>`;
            rows += `<div class="mobile-row"><span>Ngày</span><strong>${utils.formatDate(order.createdAt)}</strong></div>`;
        } else {
            rows += `<div class="mobile-row"><span>Ngày đặt</span><strong>${utils.formatDate(order.createdAt)}</strong></div>`;
            const providerDisplay = order.provider.id ? (order.provider.company || order.provider.name) : '<span class="text-warning">Chờ thợ</span>';
            rows += `<div class="mobile-row"><span>Dành cho bạn</span><strong>${providerDisplay}</strong></div>`;
        }

        return `
            <div class="u-mobile-card">
                <div class="u-mobile-head">
                    <div>
                        <h4 class="u-mobile-title">${utils.escapeHtml(title)}</h4>
                        <p class="u-mobile-code">#${order.orderCode}</p>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                <div class="mobile-body mb-3">
                    ${rows}
                </div>
                <div class="d-flex gap-2">
                    <button class="btn-u-view flex-fill" data-action="view-detail" data-id="${order.id}">
                        <i class="fa-regular fa-eye me-2"></i>Xem chi tiết
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render danh sách đơn hàng vào container.
     */
    function renderList(orders, role, elements) {
        if (!elements.body && !elements.mobile) return;

        if (!orders.length) {
            if (elements.body) elements.body.innerHTML = '';
            if (elements.mobile) elements.mobile.innerHTML = '';
            if (elements.empty) elements.empty.style.display = 'block';
            return;
        }

        if (elements.empty) elements.empty.style.display = 'none';
        if (elements.body) elements.body.innerHTML = orders.map(o => buildRowHtml(o, role)).join('');
        if (elements.mobile) elements.mobile.innerHTML = orders.map(o => buildCardHtml(o, role)).join('');
    }

    /**
     * Tải và Hiển thị nội dung chi tiết đơn hàng (Premium v4.1).
     * @param {Object} order - Dữ liệu đơn hàng đã chuẩn hoá.
     * @param {string} role - Vai trò người dùng (admin, provider, customer).
     * @param {HTMLElement} container - Vùng chứa nội dung chi tiết.
     */
    async function renderDetails(order, role, container) {
        if (!container) return;

        // Xóa nội dung cũ và hiện loading
        container.innerHTML = '<div style="text-align:center; padding:100px; color:#64748b;"><i class="fas fa-spinner fa-spin fa-3x"></i><br><br>Đang tải chi tiết hóa đơn...</div>';

        try {
            // 1. Tải Partial HTML (nếu chưa có trong cache toàn cục)
            // Lưu ý: Đường dẫn relative có thể thay đổi tùy vị trí file gọi, nên dùng đường dẫn tuyệt đối hoặc logic fallback
            let partialPath = '../chi-tiet-hoa-don-tho-nha.html';
            
            // Tạm thời fetch để lấy content
            const response = await fetch(partialPath).catch(() => fetch('chi-tiet-hoa-don-tho-nha.html'));
            if (!response || !response.ok) throw new Error('Không thể nạp giao diện chi tiết.');
            const template = await response.text();

            // 2. Inject HTML vào container
            container.innerHTML = template;

            // 3. Gọi Renderer riêng biệt để đổ dữ liệu (Premium Logic)
            if (window.ThoNhaOrderDetailRenderer) {
                window.ThoNhaOrderDetailRenderer.render(order, role, container);
            } else {
                console.error('[OrderUI] ThoNhaOrderDetailRenderer missing!');
                container.innerHTML = '<div class="alert alert-danger">Lỗi hệ thống: Không tìm thấy bộ dựng giao diện chi tiết.</div>';
            }
        } catch (err) {
            console.error('[OrderUI] RenderDetail Error:', err);
            container.innerHTML = `<div class="alert alert-danger">Lỗi tải dữ liệu: ${err.message}</div>`;
        }
    }

    return { renderList, renderDetails };
})();

// Xuất ra window để các script khác có thể truy cập
window.ThoNhaOrderUI = ThoNhaOrderUI;
