/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Admin.
 * Thiết lập các modal Bootstrap và kích hoạt tải dữ liệu đơn hàng lần đầu.
 */
function initOrders() {
    // Chỉ initialize một lần
    if (window.ordersInitialized) return;
    window.ordersInitialized = true;
    
    try {
        ordersTableBody = document.getElementById('ordersTableBody');
        
        const detailModalEl = document.getElementById('orderDetailModal');
        const statusModalEl = document.getElementById('updateStatusModal');
        
        // ✅ Khởi tạo modal ngay cả khi chưa có dữ liệu
        if (detailModalEl) {
            detailModal = new bootstrap.Modal(detailModalEl);
        }
        if (statusModalEl) {
            statusModal = new bootstrap.Modal(statusModalEl);
        }
        
        loadAllOrders().then(orders => {
            if (ordersTableBody) {
                displayOrders(orders);
                setupOrdersEvents();
            }
        });
    } catch(e) {
        console.error('Orders init error:', e);
    }
}

/**
 * Render danh sách đơn hàng ra bảng HTML.
 * Áp dụng các định dạng badge trạng thái và ngày tháng từ shell.js.
 * @param {Array} orders - Danh sách đơn hàng đã chuẩn hoá.
 */
function displayOrders(orders) {
    if (!ordersTableBody) return;
    
    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Không có đơn hàng</td></tr>';
        return;
    }
    
    ordersTableBody.innerHTML = orders.map(order => `
        <tr>
            <td><strong class="text-primary">${order.orderCode}</strong></td>
            <td>${order.customer && order.customer.name ? order.customer.name : 'Khách'}</td>
            <td>${order.customer && order.customer.phone ? order.customer.phone : ''}</td>
            <td>${order.service || 'N/A'}</td>
            <td>${(order.address || '').substring(0, 30)}...</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetail(${order.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus(${order.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Thiết lập các sự kiện cho bộ lọc, tìm kiếm và form cập nhật đơn hàng.
 * Bao gồm xử lý gọi API cập nhật trạng thái qua KRUD client.
 */
function setupOrdersEvents() {
    // Filter button
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const status = document.getElementById('statusFilter').value;
            
            let filtered = allOrders;
            
            if (search) {
                filtered = filtered.filter(o => {
                    const cPhone = o.customer && o.customer.phone ? String(o.customer.phone) : '';
                    const cName = o.customer && o.customer.name ? o.customer.name.toLowerCase() : '';
                    return (o.orderCode && o.orderCode.toLowerCase().includes(search)) ||
                           cPhone.includes(search) ||
                           cName.includes(search);
                });
            }
            
            if (status) {
                filtered = filtered.filter(o => o.status === status);
            }
            
            displayOrders(filtered);
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAllOrders().then(orders => displayOrders(orders));
        });
    }
    
    // Update status form
    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const orderId = document.getElementById('updateOrderId').value;
            const newStatus = document.getElementById('newStatus').value;
            
            if (!orderId || !newStatus) {
                alert('Vui lòng chọn trạng thái mới');
                return;
            }
            
            if (typeof ensureAdminKrudClient !== 'function') return;
            
            const btn = updateStatusForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Đang xử lý...';
            btn.disabled = true;

            ensureAdminKrudClient().then(() => {
                // Sử dụng hàm window.krud('update', ...) chuẩn của thư viện krud.js
                return window.krud('update', 'datlich_thonha', { trangthai: newStatus }, parseInt(orderId));
            }).then(() => {
                alert('Cập nhật trạng thái thành công!');
                if (statusModal) statusModal.hide();
                loadAllOrders().then(orders => displayOrders(orders));
            }).catch(err => {
                console.error('Update status error:', err);
                alert('Lỗi cập nhật: ' + (err.message || 'Không xác định'));
            }).finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
        });
    }
}

// Tách biệt với statusMap của shell.js và đưa ra scope window vì gọi từ inline event
window.orderStatusMap = {
    'new': { text: 'Chờ xác nhận', class: 'status-new' },
    'confirmed': { text: 'Đã xác nhận', class: 'status-confirmed' },
    'doing': { text: 'Đang thực hiện', class: 'status-doing' },
    'done': { text: 'Hoàn thành', class: 'status-done' },
    'cancel': { text: 'Đã hủy', class: 'status-cancel' }
};

// ✅ SỬA HÀM viewOrderDetail ĐỂ HIỂN THỊ ĐẦY ĐỦ VÀ SANG TRỌNG NHƯ KHÁCH HÀNG/ĐỐI TÁC
/**
 * Xem chi tiết đơn hàng (Modal) - Bao gồm tính toán trợ giá cho Admin.
 * Hiển thị thông tin Khách hàng, Địa điểm, Đối tác nhận đơn và Bảng kê chi phí.
 * @param {number|string} orderId - ID của đơn hàng.
 */
window.viewOrderDetail = function(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    
    if (!order) {
        alert('Không tìm thấy đơn hàng với ID: ' + orderId);
        return;
    }
    
    const detailContent = document.getElementById('orderDetailContent');
    if (!detailContent) return;
    
    const viewUtils = window.ThoNhaOrderViewUtils;
    
    let priceHtml = '';
    if (viewUtils && order.bookingPricing) {
        let pricingObj = order.bookingPricing;
        if (typeof pricingObj === 'string') {
            try { pricingObj = JSON.parse(pricingObj); } catch(e) {}
        }
        if (typeof pricingObj === 'object') {
            priceHtml = viewUtils.renderOrderPrices(pricingObj);
        }
    }
    
    if (!priceHtml) {
        const p = parseFloat(order.actualCost || 0);
        priceHtml = p > 0 ? `<div class="alert alert-info py-2 mb-0">Tổng trị giá: <strong>${viewUtils ? viewUtils.formatCurrency(p) : p}</strong></div>` : `<div class="text-muted text-center p-3 border rounded bg-light">Chưa cấu hình chi phí</div>`;
    }

    let providerHtml = '<div class="text-muted"><i class="fas fa-info-circle"></i> Chưa nhận đơn</div>';
    if (order.providerId && order.provider) {
        providerHtml = `
            <div class="p-3 bg-light rounded border border-primary border-opacity-25 mt-2">
                <strong class="text-dark"><i class="fas fa-building text-primary"></i> ${order.provider.company || 'Đối tác Thợ Nhà'}</strong><br>
                <div class="mt-2 text-secondary"><i class="fas fa-user-tie"></i> ${order.provider.name || 'N/A'}</div>
                <div class="mt-1"><i class="fas fa-phone-alt text-success"></i> <a href="tel:${order.provider.phone}" class="text-decoration-none">${order.provider.phone || 'N/A'}</a></div>
            </div>
        `;
    } else if (order.providerId) {
         providerHtml = `<div class="text-muted mt-2"><i class="fas fa-spinner fa-spin"></i> Giao cho ID: ${order.providerId}</div>`;
    }
    
    detailContent.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6 border-end">
                <h6 class="text-primary mb-3 border-bottom pb-2 fw-bold"><i class="fas fa-user"></i> Khách hàng</h6>
                <div class="mb-2"><strong>Mã đơn:</strong> <span class="badge bg-secondary px-2 py-1">${order.orderCode}</span></div>
                <div class="mb-2"><strong>Họ tên:</strong> ${order.customer ? order.customer.name : 'N/A'}</div>
                <div class="mb-2"><strong>Điện thoại:</strong> <a href="tel:${order.customer ? order.customer.phone : ''}" class="text-decoration-none">${order.customer ? order.customer.phone : 'N/A'}</a></div>
                <div class="mb-2"><strong>Ngày đặt:</strong> ${formatDateTime(order.createdAt)}</div>
                <div class="mb-2"><strong>Trạng thái:</strong> ${(window.orderStatusMap && window.orderStatusMap[order.status]) ? getStatusBadge(order.status) : order.status}</div>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-success mb-3 border-bottom pb-2 fw-bold"><i class="fas fa-briefcase"></i> Yêu cầu & Đối tác</h6>
                <div class="mb-2"><strong>Dịch vụ:</strong> <span class="text-danger fw-bold">${order.service}</span></div>
                <div class="mb-2"><strong>Địa chỉ:</strong> ${order.address}</div>
                <div class="mb-2"><strong>Ghi chú:</strong> <span class="fst-italic">${order.note || '<span class="text-muted">Không có</span>'}</span></div>
                <div class="mt-3">
                    ${providerHtml}
                </div>
            </div>

            <div class="col-12 mt-2">
                <h6 class="text-secondary mb-3 border-bottom pb-2 fw-bold"><i class="fas fa-receipt"></i> Bảng tính chi phí</h6>
                <div class="bg-white rounded p-1 mb-2">
                    ${priceHtml}
                </div>
                ${order.actualCost > 0 ? `<div class="mt-2 text-end text-danger fw-bold fs-6">Chi phí thực tế: ${viewUtils ? viewUtils.formatCurrency(p) : p}</div>` : ''}
                ${order.subsidyAmount > 0 ? `<div class="mt-1 text-end text-success fs-6">Trợ giá hệ thống: -${viewUtils ? viewUtils.formatCurrencyVn(order.subsidyAmount) : order.subsidyAmount}</div>` : ''}
                ${order.customerPays > 0 ? `<div class="mt-2 text-end text-primary fw-bold fs-5 border-top pt-2">Khách thực trả: ${viewUtils ? viewUtils.formatCurrencyVn(order.customerPays) : order.customerPays}</div>` : ''}
            </div>
        </div>
    `;
    
    if (detailModal) {
        detailModal.show();
    } else {
        const modalEl = document.getElementById('orderDetailModal');
        if (modalEl) {
            detailModal = new bootstrap.Modal(modalEl);
            detailModal.show();
        }
    }
}

/**
 * Hiển thị form cập nhật trạng thái đơn hàng (Modal).
 * @param {number|string} orderId - ID đơn hàng cần cập nhật.
 */
window.updateOrderStatus = function(orderId) {
    const updateOrderIdInput = document.getElementById('updateOrderId');
    if (updateOrderIdInput) {
        updateOrderIdInput.value = orderId;
        if (statusModal) {
            statusModal.show();
        } else {
            // ✅ Thử khởi tạo lại modal
            const modalEl = document.getElementById('updateStatusModal');
            if (modalEl) {
                statusModal = new bootstrap.Modal(modalEl);
                statusModal.show();
            }
        }
    }
}