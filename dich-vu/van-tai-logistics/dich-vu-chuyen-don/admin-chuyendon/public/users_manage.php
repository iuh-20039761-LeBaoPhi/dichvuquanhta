<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Nhà cung cấp & người dùng | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .user-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 20px;
        margin-bottom: 32px;
    }

    .user-summary-card {
        background: white;
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 22px 24px;
        box-shadow: var(--shadow-premium);
    }

    .user-summary-card span {
        display: block;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--slate-light);
    }

    .user-summary-card strong {
        display: block;
        margin-top: 10px;
        font-size: 30px;
        font-weight: 900;
        color: var(--slate);
    }

    .user-summary-card p {
        margin: 8px 0 0;
        color: var(--slate-light);
        font-size: 13px;
        line-height: 1.5;
    }

    .identity-stack {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .identity-avatar {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: var(--primary-soft);
        color: var(--primary-deep);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 15px;
        overflow: hidden;
        flex-shrink: 0;
    }

    .identity-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .verification-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
    }

    .verification-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid var(--line);
        background: var(--slate-soft);
        color: var(--slate);
    }

    .verification-chip.is-ok {
        color: #166534;
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.22);
    }

    .verification-chip.is-missing {
        color: #92400e;
        background: rgba(245, 158, 11, 0.14);
        border-color: rgba(245, 158, 11, 0.22);
    }

    .user-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .user-actions .btn {
        min-width: 42px;
        padding: 10px 12px;
    }

    .status-pills {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .status-pills .btn {
        padding: 10px 14px;
        min-width: 0;
    }

    .modal.modal-user-wide {
        width: min(980px, 100%);
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
    }

    .modal.modal-user-wide .modal-body {
        overflow: auto;
    }

    .profile-preview-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
    }

    .profile-preview-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 16px;
        background: var(--slate-soft);
    }

    .profile-preview-card strong {
        display: block;
        margin-bottom: 12px;
        font-size: 14px;
    }

    .profile-preview-card a {
        display: block;
        text-decoration: none;
        color: var(--primary-deep);
        font-weight: 700;
        word-break: break-all;
    }

    .status-inline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        border: 1px solid var(--line);
    }

    .status-inline.is-active {
        color: #166534;
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.22);
    }

    .status-inline.is-pending {
        color: #92400e;
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.22);
    }

    .status-inline.is-locked {
        color: #991b1b;
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.22);
    }

    @media (max-width: 1180px) {
        .user-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {

        .user-summary-grid,
        .profile-preview-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

<section class="hero-card">
    <div>
        <h1>Nhà cung cấp & người dùng</h1>
        <p>Quản lý toàn bộ khách hàng, nhà cung cấp chuyển dọn và thông tin xác minh hồ sơ ngay trên bảng `nguoidung`
            dùng chung với portal.</p>
    </div>
    <div class="hero-actions" style="display:flex; gap:12px; flex-wrap:wrap;">
        <a href="notifications.php" class="btn btn-outline">
            <i class="fas fa-bell"></i>Thông báo
        </a>
    </div>
</section>

<section class="user-summary-grid">
    <article class="user-summary-card">
        <span>Tổng tài khoản</span>
        <strong id="statsUsersTotal">0</strong>
        <p>Tổng số tài khoản đồng bộ từ bảng người dùng.</p>
    </article>
    <article class="user-summary-card">
        <span>Nhà cung cấp</span>
        <strong id="statsUsersProviders">0</strong>
        <p>Tài khoản đang gắn với dịch vụ chuyển dọn (`id_dichvu = 12`).</p>
    </article>
    <article class="user-summary-card">
        <span>Chờ duyệt</span>
        <strong id="statsUsersPending">0</strong>
        <p>Provider chưa duyệt xong hoặc hồ sơ còn thiếu xác minh.</p>
    </article>
    <article class="user-summary-card">
        <span>Đang khóa</span>
        <strong id="statsUsersLocked">0</strong>
        <p>Tài khoản bị khóa để ngăn nhận đơn hoặc đăng nhập.</p>
    </article>
</section>

<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách tài khoản</h2>
            <p>Lọc nhanh theo vai trò, trạng thái và mức độ xác minh hồ sơ nhà cung cấp.</p>
        </div>
        <button class="btn btn-outline" type="button" onclick="userManager.fetchUsers()">
            <i class="fas fa-rotate"></i>Tải lại
        </button>
    </div>

    <div class="premium-toolbar">
        <div class="input-icon-group" style="flex:2;">
            <label class="label">Tìm kiếm</label>
            <div style="position: relative;">
                <i class="fas fa-search"></i>
                <input type="text" class="input" id="userSearchInput"
                    placeholder="Tên, SĐT, email, công ty, phương tiện..."
                    oninput="userManager.handleSearch(this.value)">
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Vai trò</label>
            <div style="position: relative;">
                <i class="fas fa-user-tag"></i>
                <select class="select" id="roleFilter" onchange="userManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="provider">Nhà cung cấp</option>
                    <option value="customer">Khách hàng</option>
                    <option value="admin">Quản trị viên</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Trạng thái</label>
            <div style="position: relative;">
                <i class="fas fa-shield-halved"></i>
                <select class="select" id="statusFilter" onchange="userManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="0">Đang hoạt động</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="1">Đang khóa</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Xác minh</label>
            <div style="position: relative;">
                <i class="fas fa-id-card"></i>
                <select class="select" id="verificationFilter" onchange="userManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="complete">Đủ avatar + CCCD</option>
                    <option value="missing">Thiếu xác minh</option>
                </select>
            </div>
        </div>

        <div id="filterChips" class="filter-chips"></div>
    </div>

    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Người dùng</th>
                    <th>Liên hệ</th>
                    <th>Vai trò & hồ sơ</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody id="userListBody"></tbody>
        </table>
    </div>
</section>

<div class="modal-overlay" id="userModal">
    <div class="modal modal-user-wide">
        <div class="modal-header">
            <h3 id="modalTitle">Tài khoản người dùng</h3>
            <button class="btn-delete-small" type="button" onclick="userManager.closeModal()"><i
                    class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <form id="userForm" onsubmit="userManager.handleSubmit(event)">
                <input type="hidden" id="userId">
                <div class="editor-grid">
                    <div class="field">
                        <label class="label">Họ tên</label>
                        <input type="text" id="hovaten" class="input" required>
                    </div>
                    <div class="field">
                        <label class="label">Số điện thoại</label>
                        <input type="text" id="sodienthoai" class="input" required>
                    </div>
                    <div class="field">
                        <label class="label">Email</label>
                        <input type="email" id="email" class="input">
                    </div>
                    <div class="field">
                        <label class="label">Vai trò</label>
                        <select id="vaitro" class="select">
                            <option value="customer">Khách hàng</option>
                            <option value="provider">Nhà cung cấp</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                    </div>
                    <div class="field span-full">
                        <label class="label">Địa chỉ liên hệ</label>
                        <input type="text" id="diachi" class="input" placeholder="Khu vực hoạt động / địa chỉ cá nhân">
                    </div>
                    <div class="field">
                        <label class="label">Trạng thái</label>
                        <select id="trangthai" class="select">
                            <option value="0">Đang hoạt động</option>
                            <option value="pending">Chờ duyệt</option>
                            <option value="1">Đang khóa</option>
                        </select>
                    </div>
                    <div class="field" id="passwordField">
                        <label class="label">Mật khẩu</label>
                        <input type="password" id="matkhau" class="input" placeholder="Nhập mật khẩu mới">
                    </div>
                    <div class="field">
                        <label class="label">Tên công ty / đơn vị</label>
                        <input type="text" id="ten_cong_ty" class="input">
                    </div>
                    <div class="field">
                        <label class="label">Mã số thuế</label>
                        <input type="text" id="ma_so_thue" class="input">
                    </div>
                    <div class="field span-full">
                        <label class="label">Địa chỉ doanh nghiệp</label>
                        <input type="text" id="dia_chi_doanh_nghiep" class="input">
                    </div>
                    <div class="field">
                        <label class="label">Loại phương tiện</label>
                        <input type="text" id="loai_phuong_tien" class="input" placeholder="Xe tải 1.5 tấn, xe van...">
                    </div>
                    <div class="field span-full">
                        <label class="label">Ghi chú nội bộ admin</label>
                        <textarea id="note_admin" class="textarea" rows="3"
                            placeholder="Tình trạng hợp đồng, khu vực phụ trách, lưu ý hồ sơ..."></textarea>
                    </div>
                    <div class="field">
                        <label class="label">Link avatar</label>
                        <input type="text" id="link_avatar" class="input" placeholder="Google Drive / URL ảnh đại diện">
                    </div>
                    <div class="field">
                        <label class="label">Link CCCD mặt trước</label>
                        <input type="text" id="link_cccd_truoc" class="input">
                    </div>
                    <div class="field">
                        <label class="label">Link CCCD mặt sau</label>
                        <input type="text" id="link_cccd_sau" class="input">
                    </div>
                </div>

                <div style="margin-top: 28px;">
                    <h4 style="margin:0 0 12px;">Xác minh hồ sơ nhanh</h4>
                    <div class="profile-preview-grid">
                        <div class="profile-preview-card">
                            <strong>Avatar</strong>
                            <a href="#" id="avatarPreviewLink" target="_blank" rel="noreferrer">Chưa có</a>
                        </div>
                        <div class="profile-preview-card">
                            <strong>CCCD mặt trước</strong>
                            <a href="#" id="cccdFrontPreviewLink" target="_blank" rel="noreferrer">Chưa có</a>
                        </div>
                        <div class="profile-preview-card">
                            <strong>CCCD mặt sau</strong>
                            <a href="#" id="cccdBackPreviewLink" target="_blank" rel="noreferrer">Chưa có</a>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <div style="display:flex; gap:12px;">
                <button type="button" class="btn btn-outline" onclick="userManager.closeModal()">Đóng</button>
            </div>
        </div>
    </div>
</div>

<div class="toast-container" id="toastContainer"
    style="position: fixed; top: 100px; right: 24px; display: grid; gap: 12px; z-index: 1300;"></div>

<script src="assets/js/admin-api.js"></script>
<script src="assets/js/users-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>