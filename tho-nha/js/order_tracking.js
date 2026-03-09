document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('viewOrderForm');
    const resultBox = document.getElementById('orderResult');
    const phoneInput = document.getElementById('orderPhone');

    if (!form || !resultBox || !phoneInput) {
        console.error('❌ Thiếu element form tra cứu');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phone = phoneInput.value.trim();
        if (!phone) {
            resultBox.innerHTML = `<div class="alert alert-warning">⚠️ Vui lòng nhập số điện thoại</div>`;
            return;
        }

        resultBox.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2">Đang tra cứu...</p>
            </div>
        `;

        try {
            const res = await fetch(`api/get_orders.php?phone=${encodeURIComponent(phone)}`);
            const data = await res.json();

            console.log('API:', data);

            if (data.status !== 'success' || !data.data.length) {
                resultBox.innerHTML = `
                    <div class="alert alert-warning">
                        Không tìm thấy đơn hàng với số điện thoại <strong>${phone}</strong>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="table-responsive">
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Mã đơn</th>
                            <th>Dịch vụ</th>
                            <th>Trạng thái</th>
                            <th>Giá</th>
                            <th>Ngày tạo</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.data.forEach(order => {
                // ✅ Kiểm tra xem đơn có thể hủy không
                const canCancel = ['new', 'confirmed'].includes(order.status);
                const isCancelled = order.status === 'cancel';
                
                html += `
                    <tr>
                        <td><strong>${order.order_code}</strong></td>
                        <td>${order.service_names}</td>
                        <td>${getStatusBadgeCustomer(order.status)}</td>
                        <td><strong>${Number(order.prices).toLocaleString('vi-VN')} đ</strong></td>
                        <td>${new Date(order.created_at).toLocaleString('vi-VN')}</td>
                        <td class="text-center">
                            ${canCancel ? `
                                <button class="btn btn-sm btn-danger" onclick="requestCancelOrder(${order.id}, '${order.order_code}')">
                                    <i class="fas fa-times-circle"></i> Yêu cầu hủy
                                </button>
                            ` : ''}
                            ${isCancelled ? `
                                <span class="badge bg-secondary">Đã hủy</span>
                            ` : ''}
                            ${order.status === 'done' ? `
                                <span class="badge bg-success">Hoàn thành</span>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            resultBox.innerHTML = html; 

        } catch (err) {
            console.error(err);
            resultBox.innerHTML = `
                <div class="alert alert-danger">
                    ❌ Lỗi kết nối server
                </div>
            `;
        }
    });
});

// ✅ HÀM TẠO BADGE TRẠNG THÁI CHO KHÁCH HÀNG
function getStatusBadgeCustomer(status) {
    const statusMap = {
        'new': '<span class="badge bg-primary">Chờ xác nhận</span>',
        'confirmed': '<span class="badge bg-info">Đã xác nhận</span>',
        'done': '<span class="badge bg-success">Hoàn thành</span>',
        'cancel': '<span class="badge bg-danger">Đã hủy</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">Không xác định</span>';
}

// ✅ HÀM XỬ LÝ YÊU CẦU HỦY ĐỚN
window.requestCancelOrder = async function(orderId, orderCode) {
    // Xác nhận trước khi hủy
    const confirm = window.confirm(
        `Bạn có chắc muốn yêu cầu hủy đơn hàng ${orderCode}?\n\n` +
        `⚠️ Lưu ý: Yêu cầu hủy sẽ được gửi đến quản trị viên để xem xét.`
    );
    
    if (!confirm) return;

    try {
        const res = await fetch('api/request_cancel_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId,
                order_code: orderCode
            })
        });

        const data = await res.json();

        if (data.status === 'success') {
            alert('✅ Yêu cầu hủy đơn hàng đã được gửi thành công!\n\nQuản trị viên sẽ xem xét và phản hồi sớm nhất.');
            
            // Reload lại danh sách đơn hàng
            document.getElementById('viewOrderForm').dispatchEvent(new Event('submit'));
        } else {
            alert('❌ Lỗi: ' + (data.message || 'Không thể gửi yêu cầu hủy'));
        }

    } catch (err) {
        console.error('Cancel order error:', err);
        alert('❌ Lỗi kết nối server. Vui lòng thử lại sau.');
    }
}