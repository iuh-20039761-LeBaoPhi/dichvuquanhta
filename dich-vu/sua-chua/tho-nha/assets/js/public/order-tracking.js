document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('viewOrderForm');
    const resultBox = document.getElementById('orderResult');
    const phoneInput = document.getElementById('orderPhone');

    if (!form || !resultBox || !phoneInput) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = phoneInput.value.trim();
        if (!phone) return;

        resultBox.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';

        try {
            // Sử dụng DVQTApp để lấy đơn hàng theo SĐT
            const orders = await DVQTApp.getOrders({ sodienthoai: phone }, 'datlich_thonha');

            if (!orders || !orders.length) {
                resultBox.innerHTML = `<div class="alert alert-warning">Không tìm thấy đơn hàng cho SĐT <strong>${phone}</strong></div>`;
                return;
            }

            let html = `<div class="table-responsive"><table class="table table-hover align-middle">
                <thead class="table-light"><tr>
                    <th>Mã đơn</th><th>Dịch vụ</th><th>Trạng thái</th><th>Tổng tiền</th><th>Ngày tạo</th>
                </tr></thead><tbody>`;

            orders.forEach(order => {
                html += `<tr>
                    <td><strong>${order.madon || '---'}</strong></td>
                    <td>${order.tendichvu || '---'}</td>
                    <td>${getStatusBadge(order.trangthai)}</td>
                    <td><strong>${Number(order.tongtien || 0).toLocaleString('vi-VN')}đ</strong></td>
                    <td>${new Date(order.ngaytao).toLocaleDateString('vi-VN')}</td>
                </tr>`;
            });

            html += '</tbody></table></div>';
            resultBox.innerHTML = html;
        } catch (err) {
            resultBox.innerHTML = '<div class="alert alert-danger">Lỗi kết nối server</div>';
        }
    });

    function getStatusBadge(status) {
        const map = {
            'new': '<span class="badge bg-primary">Mới</span>',
            'confirmed': '<span class="badge bg-info">Đã xác nhận</span>',
            'done': '<span class="badge bg-success">Hoàn thành</span>',
            'cancel': '<span class="badge bg-danger">Đã hủy</span>'
        };
        return map[status] || '<span class="badge bg-secondary">Khác</span>';
    }
});