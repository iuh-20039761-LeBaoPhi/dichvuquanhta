// Orders Page Script

let ordersTableBody = null;
let detailModal = null;
let statusModal = null;
let allOrders = []; // ✅ THÊM DÒNG NÀY - Khai báo biến toàn cục

// Helper functions
function getStatusBadge(status) {
    const statusMap = {
        'new': '<span class="badge bg-primary">Chờ xác nhận</span>',
        'confirmed': '<span class="badge bg-info">Đã xác nhận</span>',
        'done': '<span class="badge bg-success">Hoàn thành</span>',
        'cancel': '<span class="badge bg-danger">Đã hủy</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">Không xác định</span>';
}

function formatCurrency(amount) {
    if (!amount) return '0đ';
    return parseInt(amount).toLocaleString('vi-VN') + 'đ';
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// ✅ SỬA HÀM loadAllOrders - Lưu vào biến toàn cục
// ✅ SỬA HÀM loadAllOrders - Thêm xử lý lỗi
async function loadAllOrders() {
    try {
        const response = await fetch('api/admin/get_all_orders.php');
        
        // ✅ Kiểm tra response status
        if (!response.ok) {
            if (response.status === 401) {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
                window.location.href = 'login.php'; // Chuyển về trang login
                return [];
            }
            throw new Error('HTTP error ' + response.status);
        }
        
        const data = await response.json();
        
        console.log('API Response:', data); // ✅ Debug
        
        if (data.status === 'success') {
            allOrders = data.data || [];
            console.log('Loaded orders count:', allOrders.length); // ✅ Debug
            console.log('First order:', allOrders[0]); // ✅ Debug
            return allOrders;
        } else {
            console.error('Load orders failed:', data.message);
            alert('Lỗi: ' + data.message);
            allOrders = [];
            return [];
        }
    } catch (error) {
        console.error('Load orders error:', error);
        alert('Lỗi kết nối API: ' + error.message);
        allOrders = [];
        return [];
    }
}

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

function displayOrders(orders) {
    if (!ordersTableBody) return;
    
    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Không có đơn hàng</td></tr>';
        return;
    }
    
    ordersTableBody.innerHTML = orders.map(order => `
        <tr>
            <td><strong class="text-primary">${order.order_code}</strong></td>
            <td>${order.customer_name}</td>
            <td>${order.phone}</td>
            <td>${order.service_names || 'N/A'}</td>
            <td>${order.address.substring(0, 30)}...</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${formatDate(order.created_at)}</td>
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

function setupOrdersEvents() {
    // Filter button
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const status = document.getElementById('statusFilter').value;
            
            let filtered = allOrders;
            
            if (search) {
                filtered = filtered.filter(o => 
                    o.order_code.toLowerCase().includes(search) ||
                    o.phone.includes(search) ||
                    o.customer_name.toLowerCase().includes(search)
                );
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
            
            const adminToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_session');
            
            const requestData = { 
                id: parseInt(orderId), 
                status: newStatus 
            };
            
            fetch('api/admin/update_order_status.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify(requestData)
            })
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => {
                        throw new Error('HTTP error ' + res.status + ': ' + text);
                    });
                }
                return res.json();
            })
            .then(res => {
                if (res.status === 'success') {
                    alert('Cập nhật thành công!');
                    if (statusModal) statusModal.hide();
                    loadAllOrders().then(orders => displayOrders(orders));
                } else {
                    alert(res.message || 'Cập nhật thất bại');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert('Lỗi: ' + err.message);
            });
        });
    }
}

// Định nghĩa statusMap
const statusMap = {
    'new': { text: 'Chờ xác nhận', class: 'primary' },
    'confirmed': { text: 'Đã xác nhận', class: 'info' },
    'done': { text: 'Hoàn thành', class: 'success' },
    'cancel': { text: 'Đã hủy', class: 'danger' }
};

// ✅ SỬA HÀM viewOrderDetail
window.viewOrderDetail = function(orderId) {
    console.log('=== VIEW ORDER DETAIL ===');
    console.log('Requested ID:', orderId, '(type:', typeof orderId + ')');
    console.log('All orders count:', allOrders.length);
    console.log('All order IDs:', allOrders.map(o => `${o.id} (${typeof o.id})`));
    
    // ✅ So sánh cả == (loose) để bắt cả string và number
    const order = allOrders.find(o => o.id == orderId);
    
    if (!order) {
        console.error('❌ Order not found!');
        console.error('Available IDs:', allOrders.map(o => o.id));
        alert('Không tìm thấy đơn hàng với ID: ' + orderId);
        return;
    }
    
    console.log('✅ Order found:', order);
    
    const prices = order.prices ? order.prices.split(', ') : [];
    const totalPrice = prices.reduce((sum, price) => sum + parseInt(price || 0), 0);
    
    const detailContent = document.getElementById('orderDetailContent');
    if (!detailContent) {
        console.error('❌ Detail content element not found');
        return;
    }
    
    detailContent.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <strong>Mã đơn:</strong> ${order.order_code}
            </div>
            <div class="col-md-6">
                <strong>Khách hàng:</strong> ${order.customer_name}
            </div>
            <div class="col-md-6">
                <strong>Số điện thoại:</strong> ${order.phone}
            </div>
            <div class="col-md-6">
                <strong>Trạng thái:</strong> <span class="badge bg-${statusMap[order.status]?.class || 'secondary'}">${statusMap[order.status]?.text || order.status}</span>
            </div>
            <div class="col-12">
                <strong>Dịch vụ:</strong> ${order.service_names || 'N/A'}
            </div>
            <div class="col-12">
                <strong>Địa chỉ:</strong> ${order.address}
            </div>
            <div class="col-12">
                <strong>Ghi chú:</strong> ${order.note || 'Không có'}
            </div>
            <div class="col-md-6">
                <strong>Tổng tiền:</strong> <span class="text-success">${formatCurrency(totalPrice)}</span>
            </div>
            <div class="col-md-6">
                <strong>Ngày đặt:</strong> ${formatDateTime(order.created_at)}
            </div>
        </div>
    `;
    
    if (detailModal) {
        console.log('✅ Showing modal...');
        detailModal.show();
    } else {
        console.error('❌ Modal not initialized, trying to create...');
        const modalEl = document.getElementById('orderDetailModal');
        if (modalEl) {
            detailModal = new bootstrap.Modal(modalEl);
            detailModal.show();
        } else {
            console.error('❌ Modal element not found in DOM');
        }
    }
}

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