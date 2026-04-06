/**
 * Khởi tạo dữ liệu và sự kiện cho trang Đơn hàng Admin.
 * Thiết lập các modal Bootstrap và kích hoạt tải dữ liệu đơn hàng lần đầu.
 */
window.initOrders = function() {
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
};

/**
 * Render danh sách đơn hàng ra bảng HTML thông qua Siêu Module Milestone.
 */
function displayOrders(orders) {
    if (!ordersTableBody) return;
    
    if (window.ThoNhaOrderUI) {
        window.ThoNhaOrderUI.renderList(orders, 'admin', {
            body: ordersTableBody,
            empty: null // Milestone Admin không cần hiện empty card phức tạp
        });
    }
}

/**
 * Thiết lập các sự kiện cho bộ lọc, tìm kiếm.
 */
function setupOrdersEvents() {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const status = document.getElementById('statusFilter').value;
            
            let filtered = allOrders.filter(o => {
                const matchStatus = !status || o.status === status;
                const matchSearch = !search || 
                    (o.orderCode && o.orderCode.toLowerCase().includes(search)) || 
                    (o.customer && o.customer.phone && o.customer.phone.includes(search)) || 
                    (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(search)) ||
                    (o.service && o.service.toLowerCase().includes(search));
                    
                return matchStatus && matchSearch;
            });
            
            displayOrders(filtered);
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAllOrders().then(displayOrders));
    }
    
    // Form cập nhật trạng thái Milestone
    const updateForm = document.getElementById('updateStatusForm');
    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('updateOrderId').value;
            const newStatus = document.getElementById('newStatus').value;
            
            let payload = {};
            const d = new Date();
            const vnDate = new Date(d.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
            const pad = (n) => String(n).padStart(2, '0');
            const nowStr = `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;

            if (newStatus === 'new') payload = { ngayhuy: null, ngaynhan: null, ngaythuchienthucte: null, ngayhoanthanhthucte: null };
            else if (newStatus === 'confirmed') payload = { ngaynhan: nowStr };
            else if (newStatus === 'doing') payload = { ngaythuchienthucte: nowStr };
            else if (newStatus === 'done') payload = { ngayhoanthanhthucte: nowStr };
            else if (newStatus === 'cancel') payload = { ngayhuy: nowStr };

            window.DVQTKrud.updateRow('datlich_thonha', id, payload).then(() => {
                alert('Cập nhật thành công!');
                if (statusModal) statusModal.hide();
                loadAllOrders().then(displayOrders);
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

/**
 * Xem chi tiết đơn hàng (Modal) chuẩn Milestone.
 */
window.viewOrderDetail = function(orderId) {
    const order = allOrders.find(o => o.id == orderId);
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