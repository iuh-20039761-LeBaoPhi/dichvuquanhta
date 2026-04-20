<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Quản lý đơn hàng | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<!-- Hero Section -->
<section class="hero-card">
    <div>
        <h1>Quản lý đơn hàng</h1>
        <p>Tận hưởng giao diện quản lý đơn hàng hiện đại, đồng bộ hóa trực tiếp với hệ thống đặt lịch.</p>
    </div>
    <div class="hero-meta" id="statsTotalValue">
        <span class="muted">Đang tải...</span>
        <strong>0 ₫</strong>
        <p>Tổng giá trị đơn hàng</p>
    </div>
</section>

<!-- Stats Grid -->
<section class="stats-grid">
    <article class="stat-card">
        <span class="muted">Tổng đơn hàng</span>
        <strong id="statsTotalOrders">0</strong>
        <p>Đã đồng bộ từ hệ thống</p>
    </article>
    <article class="stat-card">
        <span class="muted">Đang xử lý</span>
        <strong id="statsProcessing">0</strong>
        <p>Mới, Khảo sát & Đang làm</p>
    </article>
    <article class="stat-card">
        <span class="muted">Hoàn tất</span>
        <strong id="statsCompleted">0</strong>
        <p>Đơn hàng đã xong</p>
    </article>
</section>

<!-- Main Panel -->
<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách đơn hàng</h2>
            <p>Sử dụng bộ lọc để tìm kiếm đơn hàng nhanh chóng.</p>
        </div>
        <button class="btn btn-primary" onclick="orderManager.showOrderModal()">
            <i class="fas fa-plus me-2"></i>Thêm đơn hàng mới
        </button>
    </div>

    <!-- Toolbar -->
    <!-- Premium Toolbar -->
    <div class="premium-toolbar">
        <div class="input-icon-group" style="flex: 2;">
            <label class="label">Tìm kiếm</label>
            <div style="position: relative;">
                <i class="fas fa-search"></i>
                <input type="text" class="input" placeholder="Mã đơn, tên khách hàng, số điện thoại..." onkeyup="orderManager.handleSearch(this.value)">
            </div>
        </div>
        
        <div class="input-icon-group">
            <label class="label">Trạng thái</label>
            <div style="position: relative;">
                <i class="fas fa-filter"></i>
                <select class="select" id="statusFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả trạng thái</option>
                    <option value="moi">Mới tiếp nhận</option>
                    <option value="khao_sat">Đang khảo sát</option>
                    <option value="dang_trien_khai">Đang triển khai</option>
                    <option value="hoan_tat">Hoàn tất</option>
                    <option value="da_huy">Đã hủy</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Loại dịch vụ</label>
            <div style="position: relative;">
                <i class="fas fa-truck-loading"></i>
                <select class="select" id="serviceFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả dịch vụ</option>
                    <option value="chuyen-nha">Chuyển nhà</option>
                    <option value="van-phong">Chuyển văn phòng</option>
                    <option value="kho-bai">Chuyển kho bãi</option>
                </select>
            </div>
        </div>

        <button class="btn btn-outline" style="height: 48px;" onclick="orderManager.fetchOrders()" title="Tải lại dữ liệu">
            <i class="fas fa-sync-alt"></i>
        </button>

        <!-- Filter Chips Container -->
        <div id="filterChips" class="filter-chips"></div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Mã đơn & Khách hàng</th>
                    <th>Dịch vụ & Lộ trình</th>
                    <th>Ngày thực hiện</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody id="orderListBody">
                <!-- Data will be rendered here via JS -->
            </tbody>
        </table>
    </div>
</section>

<!-- Modal: Add/Edit Order -->
<div class="modal-overlay" id="orderModal">
    <div class="modal">
        <div class="modal-header">
            <h3 id="modalTitle">Thêm đơn hàng mới</h3>
            <button class="close-btn" onclick="orderManager.closeModal()">&times;</button>
        </div>
        <form id="orderForm" onsubmit="orderManager.handleSubmit(event)">
            <input type="hidden" id="orderId">
            <div class="editor-grid">
                <div class="field">
                    <label>Mã đơn nội bộ</label>
                    <input type="text" id="ma_yeu_cau_noi_bo" class="input" placeholder="Hệ thống tự tạo nếu trống">
                </div>
                <div class="field">
                    <label>Họ và tên khách hàng</label>
                    <input type="text" id="hovaten" class="input" required>
                </div>
                <div class="field">
                    <label>Số điện thoại</label>
                    <input type="tel" id="sodienthoai" class="input" required>
                </div>
                <div class="field">
                    <label>Loại dịch vụ</label>
                    <select id="loai_dich_vu" class="select" required>
                        <option value="chuyen-nha">Chuyển nhà</option>
                        <option value="van-phong">Chuyển văn phòng</option>
                        <option value="kho-bai">Chuyển kho bãi</option>
                    </select>
                </div>
                <div class="field">
                    <label>Ngày thực hiện</label>
                    <input type="date" id="ngay_thuc_hien" class="input">
                </div>
                <div class="field">
                    <label>Trạng thái</label>
                    <select id="trang_thai" class="select" required>
                        <option value="moi">Mới tiếp nhận</option>
                        <option value="khao_sat">Đang khảo sát</option>
                        <option value="dang_trien_khai">Đang triển khai</option>
                        <option value="hoan_tat">Hoàn tất</option>
                        <option value="da_huy">Đã hủy</option>
                    </select>
                </div>
                <div class="field">
                    <label>Tổng tiền (VNĐ)</label>
                    <input type="number" id="tong_tien" class="input" min="0" value="0">
                </div>
                <div class="field">
                    <label>Lộ trình: Điểm đi</label>
                    <input type="text" id="diachi_di" class="input" placeholder="Địa chỉ bắt đầu">
                </div>
                <div class="field">
                    <label>Lộ trình: Điểm đến</label>
                    <input type="text" id="diachi_den" class="input" placeholder="Địa chỉ kết thúc">
                </div>
                <div class="field span-full">
                    <label>Ghi chú</label>
                    <textarea id="ghi_chu" class="textarea" rows="3"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="orderManager.closeModal()">Hủy bỏ</button>
                <button type="submit" class="btn btn-primary" id="btnSave">Lưu thông tin</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Confirm Delete -->
<div class="modal-overlay" id="confirmDeleteModal" style="display: none; align-items: center; justify-content: center; z-index: 1100;">
    <div class="modal" style="max-width: 400px; text-align: center; padding: 40px 30px;">
        <div style="width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px;">
            <i class="fas fa-trash-alt"></i>
        </div>
        <h3 style="margin-bottom: 12px; font-size: 20px;">Xác nhận xóa đơn hàng?</h3>
        <p style="color: var(--slate-light); margin-bottom: 32px; line-height: 1.6;">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa đơn hàng này khỏi hệ thống?</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-outline" onclick="orderManager.closeDeleteModal()" style="flex: 1;">Hủy bỏ</button>
            <button class="btn btn-danger" id="confirmDeleteBtn" style="flex: 1; background: var(--danger); color: white; border: none;">Xóa vĩnh viễn</button>
        </div>
    </div>
</div>

<!-- Notification Container -->
<div class="toast-container" id="toastContainer"></div>

<!-- Scripts -->
<script src="assets/js/admin-api.js"></script>
<script src="assets/js/orders-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
