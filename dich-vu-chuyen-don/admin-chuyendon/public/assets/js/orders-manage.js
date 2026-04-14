/**
 * orders-manage.js - Quản lý đơn hàng cho Admin Chuyển Dọn
 * Sử dụng adminApi để tương tác với bảng 'dich_vu_chuyen_don_dat_lich'
 */
const orderManager = (function() {
    let allOrders = [];
    let filteredOrders = [];
    let currentSearch = '';
    let currentStatus = '';
    let currentService = '';

    // Khởi tạo
    async function init() {
        try {
            await fetchOrders();
            console.log('Order Manager Initialized');
        } catch (err) {
            showToast('Lỗi khởi tạo: ' + err.message, 'danger');
        }
    }

    // Lấy dữ liệu từ API
    async function fetchOrders() {
        const tbody = document.getElementById('orderListBody');
        renderSkeleton(tbody, 5); 
        
        try {
            const api = window.adminApi;
            if (!api) throw new Error('Không tìm thấy adminApi');

            // Đảm bảo bảng tồn tại
            await api.ensureOrdersTable();

            // Lấy dữ liệu
            const rows = await api.list('dich_vu_chuyen_don_dat_lich', { limit: 2000, sort: 'id DESC' });
            allOrders = rows || [];
            
            updateStats();
            applyFilters();
        } catch (err) {
            console.error('Fetch orders error:', err);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">Lỗi: ${err.message}</td></tr>`;
            showToast('Không thể tải dữ liệu: ' + err.message, 'danger');
        }
    }

    // Cập nhật thống kê
    function updateStats() {
        const totalValue = allOrders.reduce((sum, order) => {
            return order.trang_thai !== 'da_huy' ? sum + (Number(order.tong_tien) || 0) : sum;
        }, 0);
        
        const processing = allOrders.filter(o => ['moi', 'khao_sat', 'dang_trien_khai'].includes(o.trang_thai)).length;
        const completed = allOrders.filter(o => o.trang_thai === 'hoan_tat').length;

        document.getElementById('statsTotalValue').querySelector('strong').innerText = formatMoney(totalValue);
        document.getElementById('statsTotalOrders').innerText = allOrders.length;
        document.getElementById('statsProcessing').innerText = processing;
        document.getElementById('statsCompleted').innerText = completed;
    }

    // Lọc dữ liệu
    function applyFilters() {
        filteredOrders = allOrders.filter(order => {
            const matchesSearch = !currentSearch || 
                (order.ma_yeu_cau_noi_bo || '').toLowerCase().includes(currentSearch.toLowerCase()) ||
                (order.hovaten || '').toLowerCase().includes(currentSearch.toLowerCase()) ||
                (order.sodienthoai || '').includes(currentSearch);
            
            const matchesStatus = !currentStatus || order.trang_thai === currentStatus;
            const matchesService = !currentService || order.loai_dich_vu === currentService;
            
            return matchesSearch && matchesStatus && matchesService;
        });
        renderTable();
        renderFilterChips();
    }

    // Hiển thị Thẻ lọc (Chips)
    function renderFilterChips() {
        const container = document.getElementById('filterChips');
        if (!container) return;

        let html = '';
        
        if (currentSearch) {
            html += `<div class="chip">Tìm: ${currentSearch} <span>(tất cả)</span> <i class="fas fa-times close" onclick="orderManager.clearFilter('search')"></i></div>`;
        }
        
        if (currentStatus) {
            html += `<div class="chip">Trạng thái: <span>${getStatusLabel(currentStatus)}</span> <i class="fas fa-times close" onclick="orderManager.clearFilter('status')"></i></div>`;
        }
        
        if (currentService) {
            html += `<div class="chip">Dịch vụ: <span>${getServiceLabel(currentService)}</span> <i class="fas fa-times close" onclick="orderManager.clearFilter('service')"></i></div>`;
        }

        container.innerHTML = html;
    }

    function clearFilter(type) {
        if (type === 'search') {
            currentSearch = '';
            const input = document.querySelector('.premium-toolbar input[type="text"]');
            if (input) input.value = '';
        } else if (type === 'status') {
            currentStatus = '';
            document.getElementById('statusFilter').value = '';
        } else if (type === 'service') {
            currentService = '';
            document.getElementById('serviceFilter').value = '';
        }
        applyFilters();
    }

    // Hiển thị bảng
    function renderTable() {
        const tbody = document.getElementById('orderListBody');
        if (filteredOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">Không tìm thấy đơn hàng phù hợp.</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredOrders.map((order, index) => `
            <tr style="animation: fadeInUp 0.5s ease-out backwards; animation-delay: ${index * 0.05}s;">
                <td data-label="Mã đơn & Khách hàng">
                    <div style="font-weight: 800; color: var(--primary); font-size: 13px;">
                        <a href="order_detail.php?madonhang=${order.id}" style="color: inherit; text-decoration: underline;">
                            ${order.ma_yeu_cau_noi_bo || 'ID: ' + order.id}
                        </a>
                    </div>
                    <div style="font-weight: 600; font-size: 15px;">${order.ho_ten || 'N/A'}</div>
                    <div style="font-size: 12px; color: var(--slate-light);">${order.so_dien_thoai || '-'}</div>
                </td>
                <td data-label="Dịch vụ & Lộ trình">
                    <div style="font-size: 14px; font-weight: 700; color: var(--slate);">${getServiceLabel(order.loai_dich_vu)}</div>
                    <div style="font-size: 12px; color: var(--slate-light); margin-top: 6px; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-map-marker-alt" style="color: var(--primary); opacity: 0.7;"></i> <span>${order.dia_chi_di || '...'}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--slate-light); margin-top: 2px; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-flag-checkered" style="color: var(--success); opacity: 0.7;"></i> <span>${order.dia_chi_den || '...'}</span>
                    </div>
                </td>
                <td data-label="Ngày thực hiện">
                    <div style="font-size: 14px; font-weight: 500;">${order.ngay_thuc_hien || '-'}</div>
                </td>
                <td data-label="Giá trị">
                    <div style="font-weight: 800; color: var(--slate); font-size: 15px;">${formatMoney(order.tong_tam_tinh || order.tong_tien)}</div>
                </td>
                <td data-label="Trạng thái">
                    <span class="badge" style="background: ${getStatusColor(order.trang_thai)}; color: #fff;">
                        ${getStatusLabel(order.trang_thai)}
                    </span>
                </td>
                <td data-label="Thao tác">
                    <div style="display: flex; gap: 8px;">
                        <a href="order_detail.php?madonhang=${order.id}" class="btn btn-outline" style="padding: 8px 12px; color: var(--info);" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </a>
                        <button class="btn btn-outline" style="padding: 8px 12px; color: var(--danger);" onclick="orderManager.handleDelete('${order.id}')" title="Xóa">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Xử lý tìm kiếm
    let searchTimeout;
    function handleSearch(val) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = val.trim();
            applyFilters();
        }, 300);
    }

    function handleFilterChange() {
        currentStatus = document.getElementById('statusFilter').value;
        currentService = document.getElementById('serviceFilter').value;
        applyFilters();
    }

    // Modal
    function showOrderModal(id = null) {
        const modal = document.getElementById('orderModal');
        const form = document.getElementById('orderForm');
        document.getElementById('orderId').value = id || '';
        form.reset();

        if (id) {
            document.getElementById('modalTitle').innerText = 'Cập nhật đơn hàng';
            const order = allOrders.find(o => String(o.id) === String(id));
            if (order) {
                document.getElementById('ma_yeu_cau_noi_bo').value = order.ma_yeu_cau_noi_bo || '';
                document.getElementById('hovaten').value = order.hovaten || '';
                document.getElementById('sodienthoai').value = order.sodienthoai || '';
                document.getElementById('loai_dich_vu').value = order.loai_dich_vu || 'chuyen-nha';
                document.getElementById('ngay_thuc_hien').value = order.ngay_thuc_hien || '';
                document.getElementById('trang_thai').value = order.trang_thai || 'moi';
                document.getElementById('tong_tien').value = order.tong_tien || 0;
                document.getElementById('diachi_di').value = order.diachi_di || '';
                document.getElementById('diachi_den').value = order.diachi_den || '';
                document.getElementById('ghi_chu').value = order.ghi_chu || '';
            }
        } else {
            document.getElementById('modalTitle').innerText = 'Thêm đơn hàng mới';
            document.getElementById('ngay_thuc_hien').value = new Date().toISOString().split('T')[0];
        }
        modal.style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('orderModal').style.display = 'none';
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSave');
        const id = document.getElementById('orderId').value;
        
        const data = {
            ma_yeu_cau_noi_bo: document.getElementById('ma_yeu_cau_noi_bo').value.trim(),
            hovaten: document.getElementById('hovaten').value.trim(),
            sodienthoai: document.getElementById('sodienthoai').value.trim(),
            loai_dich_vu: document.getElementById('loai_dich_vu').value,
            ngay_thuc_hien: document.getElementById('ngay_thuc_hien').value,
            trang_thai: document.getElementById('trang_thai').value,
            tong_tien: Number(document.getElementById('tong_tien').value) || 0,
            diachi_di: document.getElementById('diachi_di').value.trim(),
            diachi_den: document.getElementById('diachi_den').value.trim(),
            ghi_chu: document.getElementById('ghi_chu').value.trim(),
            updated_at: new Date().toISOString()
        };

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

        try {
            const api = window.adminApi;
            if (id) {
                await api.update('dich_vu_chuyen_don_dat_lich', data, id);
                showToast('Cập nhật đơn hàng thành công');
            } else {
                data.created_at = new Date().toISOString();
                // Nếu mã trống, server hoặc logic render sẽ tự tạo sau, 
                // ở đây ta có thể tự tạo demo nếu muốn:
                if (!data.ma_yeu_cau_noi_bo) {
                    data.ma_yeu_cau_noi_bo = 'CDL-' + Date.now().toString().slice(-6);
                }
                await api.insert('dich_vu_chuyen_don_dat_lich', data);
                showToast('Thêm đơn hàng thành công');
            }
            closeModal();
            fetchOrders();
        } catch (error) {
            console.error(error);
            showToast('Lỗi khi lưu đơn hàng', 'error');
            btn.disabled = false;
            btn.innerHTML = 'Lưu thông tin';
        }
    }

    let idToDelete = null;

    function handleDelete(id) {
        idToDelete = id;
        const modal = document.getElementById('confirmDeleteModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        // Gán sự kiện cho nút xác nhận xóa (chỉ gán 1 lần)
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xóa...';
            
            try {
                await window.adminApi.delete('dich_vu_chuyen_don_dat_lich', idToDelete);
                showToast('Đã xóa đơn hàng thành công');
                closeDeleteModal();
                fetchOrders();
            } catch (error) {
                console.error(error);
                showToast('Lỗi khi xóa đơn hàng', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Xóa vĩnh viễn';
            }
        };

        modal.style.display = 'flex';
    }

    function closeDeleteModal() {
        document.getElementById('confirmDeleteModal').style.display = 'none';
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Xóa vĩnh viễn';
        idToDelete = null;
    }

    // Helpers
    function renderSkeleton(container, count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <tr>
                    <td><div class="skeleton" style="width: 120px;"></div><div class="skeleton" style="width: 150px; margin-top: 8px;"></div></td>
                    <td><div class="skeleton" style="width: 100px;"></div><div class="skeleton" style="width: 180px; margin-top: 8px;"></div></td>
                    <td><div class="skeleton" style="width: 80px;"></div></td>
                    <td><div class="skeleton" style="width: 90px;"></div></td>
                    <td><div class="skeleton" style="width: 80px; border-radius: 8px;"></div></td>
                    <td><div class="skeleton" style="width: 60px;"></div></td>
                </tr>
            `;
        }
        container.innerHTML = html;
    }

    function getStatusLabel(status) {
        const map = {
            'moi': 'Mới tiếp nhận',
            'khao_sat': 'Đang khảo sát',
            'dang_trien_khai': 'Đang triển khai',
            'hoan_tat': 'Hoàn tất',
            'da_huy': 'Đã hủy'
        };
        return map[status] || status;
    }

    function getStatusColor(status) {
        const map = {
            'moi': '#3b82f6',
            'khao_sat': '#f59e0b',
            'dang_trien_khai': '#8b5cf6',
            'hoan_tat': '#10b981',
            'da_huy': '#64748b'
        };
        return map[status] || '#64748b';
    }

    function getServiceLabel(svc) {
        const map = {
            'chuyen-nha': 'Chuyển nhà',
            'van-phong': 'Chuyển văn phòng',
            'kho-bai': 'Chuyển kho bãi'
        };
        return map[svc] || svc;
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    }

    function showToast(msg, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        let color = type === 'success' ? 'var(--success)' : 'var(--danger)';
        toast.style.borderLeft = `4px solid ${color}`;
        toast.innerHTML = `<i class="fas ${icon}" style="color: ${color}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        fetchOrders,
        handleSearch,
        handleFilterChange,
        showOrderModal,
        closeModal,
        handleSubmit,
        handleDelete,
        closeDeleteModal,
        clearFilter
    };
})();
