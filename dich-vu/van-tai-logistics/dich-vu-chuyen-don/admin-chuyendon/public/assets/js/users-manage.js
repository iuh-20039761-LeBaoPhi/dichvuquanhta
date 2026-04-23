/**
 * users-manage.js - Quản lý người dùng cho Admin Chuyển Dọn
 * Sử dụng DVQTKrud để tương tác với bảng 'nguoidung'
 */
const userManager = (function() {
    const MOVING_SERVICE_ID = '12';
    const CUSTOMER_SERVICE_ID = '0';
    let allUsers = [];
    let filteredUsers = [];
    let currentSearch = '';
    let currentRole = '';

    // Khởi tạo
    async function init() {
        try {
            await fetchUsers();
            console.log('User Manager Initialized');
        } catch (err) {
            showToast('Lỗi khởi tạo: ' + err.message, 'danger');
        }
    }

    // Lấy dữ liệu từ API
    async function fetchUsers() {
        const tbody = document.getElementById('userListBody');
        renderSkeleton(tbody, 5); // Hiển thị 5 hàng skeleton
        
        try {
            const krud = window.adminApi;
            if (!krud) throw new Error('Không tìm thấy adminApi');

            // Đảm bảo bảng tồn tại
            await krud.ensureNguoidungTable();

            // Lấy 1000 bản ghi mới nhất
            const rows = await krud.list('nguoidung', { limit: 1000, sort: 'created_date DESC' });
            allUsers = (rows || []).map(normalizeUserRecord);
            applyFilters();
        } catch (err) {
            console.error('Fetch users error:', err);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">Lỗi: ${err.message}</td></tr>`;
            showToast('Không thể tải dữ liệu: ' + err.message, 'danger');
        }
    }

    // Lọc dữ liệu
    function applyFilters() {
        filteredUsers = allUsers.filter(user => {
            const matchesSearch = !currentSearch || 
                (user.hovaten || '').toLowerCase().includes(currentSearch.toLowerCase()) ||
                (user.sodienthoai || '').includes(currentSearch) ||
                (user.email || '').toLowerCase().includes(currentSearch.toLowerCase());
            
            const matchesRole = !currentRole || user.vaitro === currentRole;
            
            return matchesSearch && matchesRole;
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
            html += `<div class="chip">Tìm: ${currentSearch} <span>(tất cả)</span> <i class="fas fa-times close" onclick="userManager.clearFilter('search')"></i></div>`;
        }
        
        if (currentRole) {
            html += `<div class="chip">Vai trò: <span>${getRoleLabel(currentRole)}</span> <i class="fas fa-times close" onclick="userManager.clearFilter('role')"></i></div>`;
        }

        container.innerHTML = html;
    }

    function clearFilter(type) {
        if (type === 'search') {
            currentSearch = '';
            const input = document.querySelector('.premium-toolbar input[type="text"]');
            if (input) input.value = '';
        } else if (type === 'role') {
            currentRole = '';
            document.getElementById('roleFilter').value = '';
        }
        applyFilters();
    }

    // Hiển thị bảng
    function renderTable() {
        const tbody = document.getElementById('userListBody');
        if (filteredUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">Không tìm thấy người dùng phù hợp.</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredUsers.map((user, index) => `
            <tr style="animation: fadeInUp 0.5s ease-out backwards; animation-delay: ${index * 0.05}s;">
                <td data-label="Người dùng">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--primary);">
                            ${(user.hovaten || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 600;">${user.hovaten || 'N/A'}</div>
                            <div style="font-size: 11px; color: var(--slate-light);">ID: ${user.id}</div>
                        </div>
                    </div>
                </td>
                <td data-label="Liên hệ">
                    <div style="font-weight: 500;"><i class="fas fa-phone-alt me-2" style="font-size: 11px; opacity: 0.5;"></i>${user.sodienthoai || '-'}</div>
                    <div style="font-size: 13px; color: var(--slate-light);"><i class="far fa-envelope me-2" style="font-size: 11px; opacity: 0.5;"></i>${user.email || '-'}</div>
                </td>
                <td data-label="Vai trò & Dịch vụ">
                    <span class="badge" style="background: ${getRoleColor(user.vaitro)}; color: #fff;">
                        ${getRoleLabel(user.vaitro)}
                    </span>
                </td>
                <td data-label="Trạng thái">
                    <span class="badge" style="background: ${user.trangthai === 'active' ? 'var(--success)' : 'var(--slate-light)'}; color: #fff;">
                        ${user.trangthai === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                </td>
                <td data-label="Ngày tạo" style="font-size: 13px; color: var(--slate-light);">
                    ${formatDate(user.created_date)}
                </td>
                <td data-label="Thao tác">
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline" style="padding: 8px 12px;" onclick="userManager.showUserModal('${user.id}')" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline" style="padding: 8px 12px; color: var(--danger);" onclick="userManager.handleDelete('${user.id}')" title="Xóa">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Xử lý tìm kiếm (Debounce)
    let searchTimeout;
    function handleSearch(val) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = val.trim();
            applyFilters();
        }, 300);
    }

    function handleFilterChange() {
        currentRole = document.getElementById('roleFilter').value;
        applyFilters();
    }

    // Modal và Form
    function showUserModal(id = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        const title = document.getElementById('modalTitle');
        const pwdField = document.getElementById('passwordField');
        
        form.reset();
        document.getElementById('userId').value = id || '';
        
        if (id) {
            title.innerText = 'Cập nhật người dùng';
            pwdField.querySelector('label').innerText = 'Mật khẩu mới (để trống nếu không đổi)';
            const user = allUsers.find(u => String(u.id) === String(id));
            if (user) {
                document.getElementById('hovaten').value = user.hovaten || '';
                document.getElementById('sodienthoai').value = user.sodienthoai || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('diachi').value = user.diachi || '';
                document.getElementById('vaitro').value = user.vaitro || 'customer';
                document.getElementById('trangthai').value = user.trangthai || 'active';
            }
        } else {
            title.innerText = 'Thêm người dùng mới';
            pwdField.querySelector('label').innerText = 'Mật khẩu';
        }
        
        modal.style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('userModal').style.display = 'none';
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSave');
        const id = document.getElementById('userId').value;
        
        const data = {
            hovaten: document.getElementById('hovaten').value.trim(),
            sodienthoai: document.getElementById('sodienthoai').value.trim(),
            email: document.getElementById('email').value.trim(),
            diachi: document.getElementById('diachi').value.trim(),
            vaitro: document.getElementById('vaitro').value,
            trangthai: document.getElementById('trangthai').value
        };
        const existingUser = id ? allUsers.find(user => String(user.id) === String(id)) : null;
        data.id_dichvu = getServiceIdForRole(data.vaitro, existingUser);

        const matkhau = document.getElementById('matkhau').value;
        if (matkhau) data.matkhau = matkhau;
        
        if (!id && !matkhau) {
            showToast('Vui lòng nhập mật khẩu cho người dùng mới', 'warning');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

        try {
            const krud = window.adminApi;
            if (id) {
                await krud.update('nguoidung', data, id);
                showToast('Cập nhật người dùng thành công');
            } else {
                data.created_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
                await krud.insert('nguoidung', data);
                showToast('Thêm người dùng mới thành công');
            }
            closeModal();
            fetchUsers();
        } catch (err) {
            showToast('Lỗi: ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Lưu thông tin';
        }
    }

    let idToDelete = null;

    async function handleDelete(id) {
        idToDelete = id;
        const modal = document.getElementById('confirmDeleteUserModal');
        const confirmBtn = document.getElementById('confirmDeleteUserBtn');
        
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xóa...';
            
            try {
                await window.adminApi.delete('nguoidung', idToDelete);
                showToast('Đã xóa người dùng thành công');
                closeDeleteModal();
                fetchUsers();
            } catch (err) {
                console.error(err);
                showToast('Lỗi khi xóa người dùng', 'danger');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Xác nhận xóa';
            }
        };

        modal.style.display = 'flex';
    }

    function closeDeleteModal() {
        document.getElementById('confirmDeleteUserModal').style.display = 'none';
        const confirmBtn = document.getElementById('confirmDeleteUserBtn');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Xác nhận xóa';
        idToDelete = null;
    }

    // Tiện ích
    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function splitServiceIds(value) {
        return String(value || '')
            .split(',')
            .map(item => normalizeText(item))
            .filter(Boolean);
    }

    function hasMovingServiceId(value) {
        return splitServiceIds(value).includes(MOVING_SERVICE_ID);
    }

    function resolveMovingRole(user) {
        if (normalizeText(user?.vaitro).toLowerCase() === 'admin') return 'admin';

        const serviceIds = splitServiceIds(user?.id_dichvu || CUSTOMER_SERVICE_ID);
        if (hasMovingServiceId(user?.id_dichvu)) return 'provider';

        const hasExplicitOtherService = serviceIds.some(serviceId => serviceId && serviceId !== CUSTOMER_SERVICE_ID);
        if (hasExplicitOtherService) return 'customer';

        const role = normalizeText(user?.vaitro || user?.role).toLowerCase();
        return ['provider', 'nha-cung-cap', 'doi-tac'].includes(role) ? 'provider' : 'customer';
    }

    function normalizeUserRecord(user) {
        return {
            ...user,
            vaitro: resolveMovingRole(user),
            id_dichvu: normalizeText(user?.id_dichvu || CUSTOMER_SERVICE_ID) || CUSTOMER_SERVICE_ID
        };
    }

    function getServiceIdForRole(role, existingUser = null) {
        const serviceIds = splitServiceIds(existingUser?.id_dichvu || '')
            .filter(serviceId => serviceId && serviceId !== CUSTOMER_SERVICE_ID);

        if (role === 'provider') {
            if (!serviceIds.includes(MOVING_SERVICE_ID)) serviceIds.push(MOVING_SERVICE_ID);
            return serviceIds.join(',') || MOVING_SERVICE_ID;
        }

        const remainingIds = serviceIds.filter(serviceId => serviceId !== MOVING_SERVICE_ID);
        return remainingIds.join(',') || CUSTOMER_SERVICE_ID;
    }

    function getRoleLabel(role) {
        const map = {
            'admin': 'Quản trị viên',
            'provider': 'Nhà cung cấp',
            'customer': 'Khách hàng'
        };
        return map[role] || role || 'Khách hàng';
    }

    function getRoleColor(role) {
        const map = {
            'admin': '#ef4444',
            'provider': '#f97316',
            'customer': '#3b82f6'
        };
        return map[role] || '#64748b';
    }

    function renderSkeleton(container, count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <tr>
                    <td><div class="skeleton" style="width: 140px;"></div></td>
                    <td><div class="skeleton" style="width: 120px;"></div><div class="skeleton" style="width: 160px; margin-top: 8px;"></div></td>
                    <td><div class="skeleton" style="width: 80px; border-radius: 8px;"></div></td>
                    <td><div class="skeleton" style="width: 80px; border-radius: 8px;"></div></td>
                    <td><div class="skeleton" style="width: 100px;"></div></td>
                    <td><div class="skeleton" style="width: 60px;"></div></td>
                </tr>
            `;
        }
        container.innerHTML = html;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dateStr;
        }
    }

    function showToast(msg, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-check-circle';
        let color = 'var(--success)';
        if (type === 'danger') { icon = 'fa-exclamation-circle'; color = 'var(--danger)'; }
        if (type === 'warning') { icon = 'fa-exclamation-triangle'; color = 'var(--warning)'; }

        toast.style.borderLeft = `4px solid ${color}`;
        toast.innerHTML = `<i class="fas ${icon}" style="color: ${color}"></i> <span>${msg}</span>`;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Khởi chạy khi DOM sẵn sàng
    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        fetchUsers,
        handleSearch,
        handleFilterChange,
        showUserModal,
        closeModal,
        handleSubmit,
        handleDelete,
        closeDeleteModal,
        clearFilter
    };
})();
