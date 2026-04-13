/**
 * Tho Nha Order Actions - Xử lý tập trung các hành động trên đơn hàng (Chấp nhận, Báo giá, Hoàn thành...)
 * Dùng chung cho cả trang Standalone và Dashboard (SPA).
 */
const ThoNhaOrderActions = (() => {
    'use strict';

    /**
     * Gắn sự kiện click cho container (Event Delegation)
     * @param {HTMLElement} container - Vùng chứa các nút bấm
     * @param {Object} session - Thông tin người dùng hiện tại
     * @param {Function} callback - Hàm gọi lại sau khi thực hiện thành công (ví dụ: reload list)
     */
    function init(container, session, callback) {
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            // Dừng sự kiện lan truyền để tránh các listener ở cấp document (như trong order-management.js) chạy đè lên
            e.stopPropagation();
            e.preventDefault();

            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            // Lấy thời gian hiện tại chuẩn SQL
            const d = new Date();
            const vnDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
            const pad = (n) => String(n).padStart(2, '0');
            const now = `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;

            try {
                let payload = {};
                
                if (action === 'accept-order') {
                    if (!confirm('Xác nhận nhận đơn hàng này?')) return;
                    payload = { 
                        id_nhacungcap: session.id, 
                        tenncc: session.name || session.hovaten, 
                        sdtncc: session.phone || session.sodienthoai, 
                        diachincc: session.address || session.diachi || '',
                        ngaynhan: now 
                    };
                } else if (action === 'start-order') {
                    payload = { ngaybatdauthucte: now, ngaythuchienthucte: now };
                } else if (action === 'complete-order') {
                    if (!confirm('Xác nhận đã hoàn thành công việc?')) return;
                    payload = { ngayhoanthanhthucte: now };
                } else if (action === 'submit-actual-price') {
                    const price = Number(document.getElementById('inputActualPrice').value);
                    if (!price || price <= 0) return alert('Vui lòng nhập giá thực tế.');
                    const sub = Math.round(price * 0.05);
                    payload = { chiphithucte: price, sotientrogia: sub, khachthanhtoan: price - sub };
                } else if (action === 'cancel-order') {
                    const code = btn.dataset.code || id;
                    if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${code}?`)) return;
                    payload = { ngayhuy: now };
                }

                if (Object.keys(payload).length > 0) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    await DVQTApp.updateOrder(id, payload, 'datlich_thonha');
                    alert('Hành động thành công!');
                    if (typeof callback === 'function') {
                        callback(action, id);
                    } else {
                        location.reload();
                    }
                }
            } catch (err) {
                alert('Lỗi: ' + err.message);
                btn.disabled = false;
            }
        });
    }

    return { init };
})();

window.ThoNhaOrderActions = ThoNhaOrderActions;
