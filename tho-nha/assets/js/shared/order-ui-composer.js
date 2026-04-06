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
        const orderCode = `<td class="mono"><strong>${order.orderCode}</strong></td>`;
        const time = `<td>${utils.formatDateTime(order.createdAt)}</td>`;
        const statusBadge = `<td class="status-cell">${utils.buildStatusBadge(order.status)}</td>`;
        const actionBtn = `<td class="detail-cell">${utils.buildDetailActionButton(order.id)}${role === 'admin' ? ` <button class="btn btn-sm btn-outline-success ms-1" onclick="updateOrderStatus(${order.id})"><i class="fas fa-edit"></i></button>` : ''}</td>`;

        // GIAO DIỆN ADMIN CHUẨN 9 CỘT 
        if (role === 'admin') {
            const providerName = order.provider.id ? utils.escapeHtml(order.provider.name) : '<em class="text-muted">Chưa nhận</em>';
            return `
                <tr>
                    ${orderCode}
                    <td>${utils.escapeHtml(order.customer.name)}</td>
                    <td>${utils.escapeHtml(order.customer.phone)}</td>
                    <td><div class="small fw-bold">${utils.escapeHtml(order.service)}</div></td>
                    <td><div class="small text-muted">${providerName}</div></td>
                    <td><span class="text-danger fw-bold small">${utils.formatCurrencyVn(order.total_price)}</span></td>
                    ${statusBadge}
                    ${time}
                    ${actionBtn}
                </tr>
            `;
        }

        // GIAO DIỆN THỢ (PROVIDER)
        if (role === 'provider') {
            const info = `<td><strong>${utils.escapeHtml(order.customer.name)}</strong><span class="sub-note">${utils.escapeHtml(order.customer.phone)}</span></td>`;
            const service = `<td><strong>${utils.escapeHtml(order.service)}</strong></td>`;
            return `<tr>${orderCode}${info}${service}${time}${statusBadge}${actionBtn}</tr>`;
        }

        // GIAO DIỆN KHÁCH HÀNG (CUSTOMER)
        const info = `<td><strong>${utils.escapeHtml(order.service)}</strong><span class="sub-note">${utils.escapeHtml(order.note || 'Không có ghi chú')}</span></td>`;
        return `<tr>${orderCode}${info}${time}${statusBadge}${actionBtn}</tr>`;
    }

    /**
     * Vẽ thẻ di động (Mobile Card) chuẩn 
     */
    function buildCardHtml(order, role) {
        const title = role === 'provider' ? order.customer.name : order.service;
        const subTitle = order.orderCode;
        const statusBadge = utils.buildStatusBadge(order.status);

        let rows = '';
        if (role === 'provider') {
            rows += `<div class="mobile-row"><span>SĐT khách</span><strong>${order.customer.phone}</strong></div>`;
            rows += `<div class="mobile-row"><span>Dịch vụ</span><strong>${order.service}</strong></div>`;
        } else {
            rows += `<div class="mobile-row"><span>Ngày đặt</span><strong>${utils.formatDateTime(order.createdAt)}</strong></div>`;
            rows += `<div class="mobile-row"><span>Thợ thầu</span><strong>${order.provider.company || order.provider.name}</strong></div>`;
        }

        return `
            <article class="mobile-card">
                <div class="mobile-card-head">
                    <div>
                        <h4 class="mobile-title">${utils.escapeHtml(title)}</h4>
                        <p class="mobile-code">${subTitle}</p>
                    </div>
                    ${statusBadge}
                </div>
                ${rows}
                <div class="mobile-actions">${utils.buildDetailActionButton(order.id)}</div>
            </article>
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
            if (elements.empty) elements.empty.hidden = false;
            return;
        }

        if (elements.empty) elements.empty.hidden = true;
        if (elements.body) elements.body.innerHTML = orders.map(o => buildRowHtml(o, role)).join('');
        if (elements.mobile) elements.mobile.innerHTML = orders.map(o => buildCardHtml(o, role)).join('');
    }

    /**
     * Vẽ nội dung chi tiết 
     */
    function renderDetails(order, role, profile) {
        const customerName = order.customer.name || 'Khách hàng';
        const providerName = order.provider.company || order.provider.name || 'Nhà cung cấp';

        let actionHtml = '';
        if (role === 'customer' && order.status === 'new') {
            actionHtml = `<button class="btn btn-danger w-100" data-action="cancel-order" data-id="${order.id}" data-code="${order.orderCode}">Hủy đơn hàng này</button>`;
        } else if (role === 'provider') {
            // Logic nút bấm cho thợ (Accept, Start, Done) - sẽ được handle tại file riêng
            actionHtml = `<div class="provider-actions" id="providerActionArea"></div>`;
        }

        return `
            <section class="detail-section">
                <h4>Thông tin định danh </h4>
                <div class="detail-grid">
                    ${utils.buildDetailRow('Mã đơn', order.orderCode)}
                    ${utils.buildDetailRow('Ngày đặt', utils.formatDateTime(order.createdAt))}
                    <div class="detail-row"><span>Trạng thái</span>${utils.buildStatusBadge(order.status)}</div>
                </div>
            </section>
            <section class="detail-section">
                <h4>Đối tượng </h4>
                <div class="detail-grid">
                    ${utils.buildDetailRow('Khách hàng', customerName)}
                    ${utils.buildDetailRow('Liên hệ', order.customer.phone)}
                    ${utils.buildDetailRow('Địa chỉ', order.address)}
                </div>
            </section>
            <section class="detail-section">
                <h4>Dịch vụ & Thợ thầu</h4>
                <div class="detail-grid">
                    ${utils.buildDetailRow('Dịch vụ', order.service)}
                    ${utils.buildDetailRow('Đơn vị thầu', providerName)}
                    ${utils.buildDetailRow('SĐT thợ', order.provider.phone)}
                </div>
            </section>
            <section class="detail-section">
                <h4>Nhật ký mốc thời gian </h4>
                <div class="detail-grid">
                    ${utils.buildDetailRow('Ngày dự kiến', utils.formatDateTime(order.dates.ordered))}
                    ${order.dates.accepted ? utils.buildDetailRow('Thợ nhận đơn', utils.formatDateTime(order.dates.accepted)) : ''}
                    ${order.dates.started ? utils.buildDetailRow('Bắt đầu làm', utils.formatDateTime(order.dates.started)) : ''}
                    ${order.dates.completed ? utils.buildDetailRow('Hoàn thành', utils.formatDateTime(order.dates.completed)) : ''}
                    ${order.dates.cancelled ? utils.buildDetailRow('Ngày hủy đơn', utils.formatDateTime(order.dates.cancelled)) : ''}
                </div>
            </section>
            <section class="detail-section">
                <h4>Chi phí </h4>
                ${utils.buildBookingCostSummary(order)}
            </section>
            <div class="mt-4">${actionHtml}</div>
        `;
    }

    return { renderList, renderDetails };
})();

// Xuất ra window để các script khác có thể truy cập
window.ThoNhaOrderUI = ThoNhaOrderUI;
