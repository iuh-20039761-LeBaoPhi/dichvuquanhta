<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Quản lý người dùng - Admin Chuyển Dọn';
include __DIR__ . '/../includes/header_admin.php';
?>

<div class="admin-page">
    <div class="hero-card">
        <div class="hero-content">
            <h1>Quản lý Người dùng</h1>
            <p>Đồng bộ dữ liệu trực tiếp từ hệ thống <strong>Dịch vụ quanh ta</strong> qua API.</p>
        </div>
        <div class="hero-actions">
            <button class="btn btn-primary" onclick="userManager.showUserModal()">
                <i class="fas fa-plus me-2"></i>Thêm người dùng mới
            </button>
        </div>
    </div>

    <div class="panel">
        <!-- Premium Toolbar -->
        <div class="premium-toolbar">
            <div class="input-icon-group" style="flex: 2;">
                <label class="label">Tìm kiếm</label>
                <div style="position: relative;">
                    <i class="fas fa-search"></i>
                    <input type="text" class="input" placeholder="Tìm tên, SĐT hoặc email..." oninput="userManager.handleSearch(this.value)">
                </div>
            </div>
            
            <div class="input-icon-group">
                <label class="label">Vai trò</label>
                <div style="position: relative;">
                    <i class="fas fa-user-tag"></i>
                    <select class="select" id="roleFilter" onchange="userManager.handleFilterChange()">
                        <option value="">Tất cả vai trò</option>
                        <option value="customer">Khách hàng</option>
                        <option value="provider">Nhà cung cấp</option>
                        <option value="admin">Quản trị viên</option>
                    </select>
                </div>
            </div>

            <button class="btn btn-outline" style="height: 48px;" onclick="userManager.fetchUsers()" title="Tải lại">
                <i class="fas fa-sync-alt"></i>
            </button>

            <!-- Filter Chips Container -->
            <div id="filterChips" class="filter-chips"></div>
        </div>

        <div class="table-wrap">
            <table id="usersTable">
                <thead>
                    <tr>
                        <th>Người dùng</th>
                        <th>Liên hệ</th>
                        <th>Vai trò & Dịch vụ</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th style="width: 100px;">Thao tác</th>
                    </tr>
                </thead>
                <tbody id="userListBody">
                    <!-- Data will be rendered here by JS -->
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 60px;">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p style="margin-top: 15px; color: var(--muted);">Đang tải danh sách người dùng...</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Thêm/Sửa Người dùng -->
<div id="userModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center;">
    <div class="modal-content panel" style="width: 100%; max-width: 600px; max-height: 90vh; overflow: auto; padding: 32px; border-radius: var(--radius-lg);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 id="modalTitle" style="margin: 0;">Thêm người dùng mới</h3>
            <button class="btn-close" onclick="userManager.closeModal()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--muted);"><i class="fas fa-times"></i></button>
        </div>
        <form id="userForm" onsubmit="userManager.handleSubmit(event)">
            <input type="hidden" id="userId">
            <div class="editor-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="field" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Họ và tên</label>
                    <input type="text" id="hovaten" required placeholder="Nguyễn Văn A" style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                </div>
                <div class="field" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Số điện thoại</label>
                    <input type="text" id="sodienthoai" required placeholder="0901234567" style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                </div>
                <div class="field" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Email</label>
                    <input type="email" id="email" placeholder="email@example.com" style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                </div>
                <div class="field" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Vai trò</label>
                    <select id="vaitro" style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                        <option value="customer">Khách hàng</option>
                        <option value="provider">Nhà cung cấp</option>
                        <option value="admin">Quản trị viên</option>
                    </select>
                </div>
                <div class="field" style="display: flex; flex-direction: column; gap: 8px; grid-column: span 2;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Địa chỉ</label>
                    <input type="text" id="diachi" placeholder="Số nhà, đường, phường, quận..." style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                </div>
                <div class="field" id="passwordField" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Mật khẩu</label>
                    <input type="password" id="matkhau" placeholder="Nhập mật khẩu mới" style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                </div>
                <div class="field" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 600; font-size: 13px; color: var(--ink);">Trạng thái</label>
                    <select id="trangthai" style="padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);">
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Khóa tài khoản</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer" style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
                <button type="button" class="btn btn-outline" onclick="userManager.closeModal()">Hủy</button>
                <button type="submit" class="btn btn-primary" id="btnSave">Lưu thông tin</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Confirm Delete User -->
<div class="modal-overlay" id="confirmDeleteUserModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1100; align-items: center; justify-content: center;">
    <div class="modal" style="background: white; max-width: 400px; text-align: center; padding: 40px 30px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);">
        <div style="width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px;">
            <i class="fas fa-user-minus"></i>
        </div>
        <h3 style="margin-bottom: 12px; font-size: 20px; font-weight: 700;">Xác nhận xóa người dùng?</h3>
        <p style="color: var(--slate-light); margin-bottom: 32px; line-height: 1.6;">Thao tác này sẽ xóa vĩnh viễn tài khoản người dùng khỏi hệ thống và không thể hoàn tác.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-outline" onclick="userManager.closeDeleteModal()" style="flex: 1; padding: 12px; border-radius: 10px;">Hủy bỏ</button>
            <button class="btn btn-danger" id="confirmDeleteUserBtn" style="flex: 1; padding: 12px; border-radius: 10px; background: var(--danger); color: white; border: none; cursor: pointer; font-weight: 600;">Xác nhận xóa</button>
        </div>
    </div>
</div>

<div class="toast-container" id="toastContainer"></div>

<!-- Scripts -->
<script src="assets/js/admin-api.js"></script>
<script src="assets/js/users-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
