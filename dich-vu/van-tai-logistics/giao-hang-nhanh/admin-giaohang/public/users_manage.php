<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$legacyUserFormNotice = isset($_GET['legacy_user_form']);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Quản lý người dùng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .users-shell {
            display: grid;
            grid-template-columns: minmax(0, 1.9fr) 320px;
            gap: 24px;
            align-items: start;
        }

        .users-hero {
            padding: 24px;
            border-radius: 24px;
            color: #fff;
            background:
                radial-gradient(circle at top right, rgba(255, 122, 0, 0.15), transparent 24%),
                linear-gradient(135deg, #08214f 0%, #0a2a66 60%, #123b87 100%);
            box-shadow: 0 18px 40px rgba(10, 42, 102, 0.16);
        }

        .users-hero h3 {
            margin: 0 0 10px;
            font-size: 30px;
            line-height: 1.12;
        }

        .users-hero p {
            margin: 0;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
        }

        .users-stat-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
        }

        .users-stat-card {
            padding: 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .users-stat-card small {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: rgba(255, 255, 255, 0.72);
            font-weight: 800;
        }

        .users-stat-card strong {
            font-size: 26px;
            line-height: 1;
        }

        .users-table-card {
            padding: 0;
            overflow: hidden;
        }

        .users-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 22px;
            border-bottom: 1px solid #edf2f7;
        }

        .users-card-header h3 {
            margin: 0;
            color: #0a2a66;
            font-size: 18px;
        }

        .users-card-header p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 13px;
        }

        .users-toolbar-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 999px;
            background: #f8fbff;
            border: 1px solid #d9e5ff;
            color: #355086;
            font-weight: 800;
            font-size: 13px;
        }

        .users-avatar {
            width: 38px;
            height: 38px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0a2a66, #1e3a8a);
            color: #fff;
            font-weight: 800;
            font-size: 14px;
            flex-shrink: 0;
        }

        .role-badge-inline {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .role-badge-inline.is-admin {
            background: rgba(10, 42, 102, 0.12);
            color: #0a2a66;
        }

        .role-badge-inline.is-customer {
            background: rgba(255, 122, 0, 0.12);
            color: #c26000;
        }

        .role-badge-inline.is-shipper {
            background: rgba(46, 125, 50, 0.12);
            color: #2e7d32;
        }

        .users-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
        }

        .users-status-pill.is-active {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }

        .users-status-pill.is-pending {
            background: #fff3e0;
            color: #e65100;
            border: 1px solid #ffe0b2;
        }

        .users-status-pill.is-locked {
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }

        .users-loading,
        .users-empty {
            padding: 32px 24px;
            text-align: center;
            color: #64748b;
            font-weight: 600;
        }

        .users-pagination {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            padding: 18px 22px 24px;
            border-top: 1px solid #edf2f7;
        }

        .users-page-btn {
            min-width: 38px;
            height: 38px;
            padding: 0 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            border: 1px solid #d9e5ff;
            background: #f8fbff;
            color: #355086;
            font-weight: 800;
            cursor: pointer;
        }

        .users-page-btn.is-active {
            background: #0a2a66;
            border-color: #0a2a66;
            color: #fff;
        }

        .users-page-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
        }

        .users-filter-card {
            position: sticky;
            top: 100px;
        }

        .users-filter-actions {
            display: grid;
            gap: 10px;
            margin-top: 10px;
        }

        .users-inline-actions {
            display: flex;
            justify-content: flex-end;
            gap: 6px;
            flex-wrap: wrap;
        }

        .users-toast {
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 9999;
            min-width: 280px;
            max-width: 420px;
            padding: 14px 16px;
            border-radius: 14px;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
            font-weight: 700;
            display: none;
        }

        .users-toast.is-success {
            display: block;
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
        }

        .users-toast.is-error {
            display: block;
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }

        @media (max-width: 1200px) {
            .users-shell {
                grid-template-columns: 1fr;
            }

            .users-stat-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .users-filter-card {
                position: static;
            }
        }

        @media (max-width: 900px) {
            .users-stat-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 640px) {
            .users-stat-grid {
                grid-template-columns: 1fr;
            }

            .users-hero h3 {
                font-size: 26px;
            }

            .users-card-header {
                align-items: flex-start;
                flex-direction: column;
            }

            .users-toolbar-badge {
                width: 100%;
                justify-content: center;
            }

            .users-pagination {
                justify-content: stretch;
            }

            .users-page-btn {
                flex: 1 1 calc(50% - 10px);
            }

            .users-toast {
                left: 14px;
                right: 14px;
                min-width: 0;
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý người dùng</h2>
            <span class="users-toolbar-badge">
                <i class="fa-solid fa-database"></i>
                <span>Đang dùng chung bảng nguoidung</span>
            </span>
        </div>

        <?php if ($legacyUserFormNotice): ?>
            <div class="status-badge status-pending" style="width:100%; margin-bottom: 20px; padding: 14px 16px;">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Form thêm/sửa PHP cũ đã tạm ẩn vì còn ghi vào bảng `nguoi_dung` riêng, chưa đồng bộ với `nguoidung`.
            </div>
        <?php endif; ?>

        <section class="users-hero">
            <h3>Quản lý khách hàng, shipper và tài khoản quản trị</h3>
            <p>Màn này đọc trực tiếp từ bảng dùng chung <strong>nguoidung</strong> để lọc người dùng, khóa tài khoản và theo dõi tình trạng vận hành nhân sự.</p>
            <div class="users-stat-grid">
                <div class="users-stat-card">
                    <small>Tổng người dùng</small>
                    <strong id="users-stat-total">0</strong>
                </div>
                <div class="users-stat-card">
                    <small>Khách hàng</small>
                    <strong id="users-stat-customers">0</strong>
                </div>
                <div class="users-stat-card">
                    <small>Shipper</small>
                    <strong id="users-stat-shippers">0</strong>
                </div>
                <div class="users-stat-card">
                    <small>Tài khoản bị khóa</small>
                    <strong id="users-stat-locked-users">0</strong>
                </div>
            </div>
        </section>

        <div class="users-shell" style="margin-top: 24px;">
            <section class="admin-card users-table-card">
                <div class="users-card-header">
                    <div>
                        <h3>Danh sách người dùng</h3>
                        <p id="users-summary">Đang tải dữ liệu người dùng từ API...</p>
                    </div>
                    <div class="users-toolbar-badge">
                        <i class="fa-solid fa-users-gear"></i>
                        <span>API Driven</span>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tài khoản</th>
                                <th>Thông tin liên hệ</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th>Ngày tham gia</th>
                                <th style="text-align: right;">Hành động</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <tr>
                                <td colspan="7" class="users-loading">Đang tải danh sách người dùng...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="users-pagination" class="users-pagination" hidden></div>
            </section>

            <aside class="admin-card users-filter-card">
                <h3 style="font-size: 16px; margin-bottom: 20px; color: #0a2a66; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-filter"></i> Bộ lọc người dùng
                </h3>
                <form id="users-filter-form" class="form-grid" style="grid-template-columns: 1fr;">
                    <div class="form-group">
                        <label for="users-search">Tìm kiếm</label>
                        <input id="users-search" type="text" name="search" placeholder="Tên, Email, SĐT..." class="admin-input">
                    </div>
                    <div class="form-group">
                        <label for="users-role">Vai trò</label>
                        <select id="users-role" name="role" class="admin-select">
                            <option value="">-- Tất cả vai trò --</option>
                            <option value="customer">Khách hàng</option>
                            <option value="shipper">Shipper</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="users-filter-actions">
                        <button type="submit" class="btn-primary" style="justify-content: center;">
                            <i class="fa-solid fa-magnifying-glass"></i> Áp dụng lọc
                        </button>
                        <button type="button" id="users-reset-btn" class="btn-secondary" style="justify-content: center;">
                            <i class="fa-solid fa-rotate-left"></i> Xóa bộ lọc
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <div id="users-toast" class="users-toast"></div>

    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script src="../../public/assets/js/local-auth.js"></script>
    <script>
        (function () {
            const localAuth = window.GiaoHangNhanhLocalAuth || null;
            const currentAdminId = <?php echo (int) $_SESSION['user_id']; ?>;
            const currentAdminUsername = <?php echo json_encode((string) ($_SESSION['username'] ?? 'admin01')); ?>;
            const currentAdminName = <?php echo json_encode((string) ($_SESSION['fullname'] ?? 'Admin')); ?>;
            const currentAdminEmail = <?php echo json_encode((string) ($_SESSION['email'] ?? '')); ?>;
            const currentAdminPhone = <?php echo json_encode((string) ($_SESSION['phone'] ?? '')); ?>;
            const tbody = document.getElementById("users-table-body");
            const summary = document.getElementById("users-summary");
            const pagination = document.getElementById("users-pagination");
            const form = document.getElementById("users-filter-form");
            const resetBtn = document.getElementById("users-reset-btn");
            const toast = document.getElementById("users-toast");
            const statTotal = document.getElementById("users-stat-total");
            const statCustomers = document.getElementById("users-stat-customers");
            const statShippers = document.getElementById("users-stat-shippers");
            const statLockedUsers = document.getElementById("users-stat-locked-users");
            let lastParams = null;

            function escapeHtml(value) {
                return String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function formatDate(value) {
                if (!value) return "N/A";
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return escapeHtml(value);
                return date.toLocaleDateString("vi-VN");
            }

            function showToast(message, type) {
                toast.textContent = message;
                toast.className = `users-toast is-${type}`;
                window.clearTimeout(showToast._timer);
                showToast._timer = window.setTimeout(() => {
                    toast.className = "users-toast";
                }, 3200);
            }

            function getRoleBadge(user) {
                const role = user.role || "";
                const roleMap = {
                    admin: { label: "Admin", className: "is-admin" },
                    customer: { label: "Khách hàng", className: "is-customer" },
                    shipper: { label: "Shipper", className: "is-shipper" },
                };
                const meta = roleMap[role] || { label: role, className: "is-customer" };
                return `<span class="role-badge-inline ${meta.className}">${escapeHtml(meta.label)}</span>`;
            }

            function getStatusBadge(user) {
                if (user.is_locked) {
                    return '<span class="users-status-pill is-locked">Đã khóa</span>';
                }
                return '<span class="users-status-pill is-active">Hoạt động</span>';
            }

            function updateStats(users) {
                const list = Array.isArray(users) ? users : [];
                const total = list.length;
                const customers = list.filter((user) => user.role === "customer").length;
                const shippers = list.filter((user) => user.role === "shipper").length;
                const lockedUsers = list.filter((user) => user.is_locked).length;

                statTotal.textContent = total.toLocaleString("vi-VN");
                statCustomers.textContent = customers.toLocaleString("vi-VN");
                statShippers.textContent = shippers.toLocaleString("vi-VN");
                statLockedUsers.textContent = lockedUsers.toLocaleString("vi-VN");
            }

            function buildSyntheticAdminUser() {
                return {
                    id: currentAdminId,
                    username: currentAdminUsername || "admin01",
                    fullname: currentAdminName || "Admin",
                    phone: currentAdminPhone || "",
                    email: currentAdminEmail || "",
                    role: "admin",
                    vehicle_type: "",
                    created_at: "",
                    is_locked: false,
                    lock_reason: "",
                    status_label: "Hoạt động",
                    source: "session",
                };
            }

            async function listUsersFromKrud() {
                const adminUser = buildSyntheticAdminUser();
                if (!localAuth || typeof localAuth.listAllKrudUsers !== "function") {
                    return [adminUser];
                }

                const users = await localAuth.listAllKrudUsers();
                return [adminUser, ...users];
            }

            function getParamsFromLocation() {
                const params = new URLSearchParams(window.location.search);
                return {
                    search: params.get("search") || "",
                    role: params.get("role") || "",
                    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
                };
            }

            function syncForm(params) {
                form.search.value = params.search;
                form.role.value = params.role;
            }

            function updateUrl(params) {
                const url = new URL(window.location.href);
                url.searchParams.set("page", String(params.page || 1));
                if (params.search) url.searchParams.set("search", params.search);
                else url.searchParams.delete("search");
                if (params.role) url.searchParams.set("role", params.role);
                else url.searchParams.delete("role");
                window.history.replaceState({}, "", url.toString());
            }

            function renderUsers(users) {
                if (!Array.isArray(users) || !users.length) {
                    tbody.innerHTML = '<tr><td colspan="7" class="users-empty">Không tìm thấy người dùng nào.</td></tr>';
                    return;
                }

                tbody.innerHTML = users.map((user) => {
                    const canMutate = Number(user.id) !== currentAdminId;
                    const avatar = escapeHtml((user.username || "U").charAt(0).toUpperCase());
                    const actionButtons = [];

                    if (canMutate) {
                        if (user.is_locked) {
                            actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="unlock" data-user-id="${user.id}" title="Mở khóa" style="color:#2e7d32; background:rgba(46,125,50,0.1);"><i class="fa-solid fa-lock-open"></i></button>`);
                        } else {
                            actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="lock" data-user-id="${user.id}" title="Khóa" style="color:#d9534f; background:rgba(217,83,79,0.1);"><i class="fa-solid fa-lock"></i></button>`);
                        }
                        actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="delete" data-user-id="${user.id}" title="Xóa" style="color:#1a1a1a; background:rgba(0,0,0,0.05);"><i class="fa-solid fa-trash-can"></i></button>`);
                    }

                    return `
                        <tr>
                            <td data-label="ID"><span style="font-weight:700; color:#64748b;">#${Number(user.id || 0).toLocaleString("vi-VN")}</span></td>
                            <td data-label="Tài khoản">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div class="users-avatar">${avatar}</div>
                                    <strong>${escapeHtml(user.username)}</strong>
                                </div>
                            </td>
                            <td data-label="Thông tin liên hệ">
                                <div style="line-height:1.4;">
                                    <div style="font-weight:600;">${escapeHtml(user.fullname)}</div>
                                    <div style="font-size:12px; color:#64748b;">
                                        <i class="fa-regular fa-envelope" style="width:14px;"></i> ${escapeHtml(user.email)}<br>
                                        <i class="fa-solid fa-phone" style="width:14px;"></i> ${escapeHtml(user.phone)}
                                        ${user.vehicle_type ? `<br><i class="fa-solid fa-motorcycle" style="width:14px;"></i> ${escapeHtml(user.vehicle_type)}` : ""}
                                    </div>
                                </div>
                            </td>
                            <td data-label="Vai trò">${getRoleBadge(user)}</td>
                            <td data-label="Trạng thái">${getStatusBadge(user)}</td>
                            <td data-label="Ngày tham gia"><span style="color:#64748b; font-size:13px;">${formatDate(user.created_at)}</span></td>
                            <td data-label="Hành động" style="text-align:right;">
                                <div class="users-inline-actions">${actionButtons.join("")}</div>
                            </td>
                        </tr>
                    `;
                }).join("");
            }

            function renderPagination(meta, currentParams) {
                pagination.innerHTML = "";
                const totalPages = Number(meta.total_pages || 0);
                if (totalPages <= 1) {
                    pagination.hidden = true;
                    return;
                }

                pagination.hidden = false;
                const currentPage = Number(meta.page || 1);
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, currentPage + 2);

                function createButton(label, page, active, disabled) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = `users-page-btn${active ? " is-active" : ""}`;
                    button.textContent = label;
                    button.disabled = !!disabled || active;
                    if (!button.disabled) {
                        button.addEventListener("click", () => loadUsers({ ...currentParams, page }));
                    }
                    return button;
                }

                pagination.appendChild(createButton("‹", Math.max(1, currentPage - 1), false, currentPage === 1));
                for (let page = start; page <= end; page += 1) {
                    pagination.appendChild(createButton(String(page), page, page === currentPage, false));
                }
                pagination.appendChild(createButton("›", Math.min(totalPages, currentPage + 1), false, currentPage === totalPages));
            }

            async function sendAction(action, userId, userRole) {
                if (!localAuth) {
                    showToast("Không khởi tạo được local auth admin helpers.", "error");
                    return;
                }

                let reason = "";
                if (action === "lock") {
                    const promptValue = window.prompt("Nhập lý do khóa tài khoản này:", "Vi phạm quy định");
                    if (promptValue === null) return;
                    reason = promptValue.trim() || "Vi phạm quy định";
                }

                const confirmMessages = {
                    unlock: "Mở khóa tài khoản này?",
                    delete: "Xóa tài khoản này?",
                };

                if (confirmMessages[action] && !window.confirm(confirmMessages[action])) {
                    return;
                }

                try {
                    let result = null;

                    if (action === "lock") {
                        result = await localAuth.updateKrudUser(userId, userRole, {
                            is_locked: 1,
                            bi_khoa: 1,
                            lock_reason: reason,
                            ly_do_khoa: reason,
                        });
                    } else if (action === "unlock") {
                        result = await localAuth.updateKrudUser(userId, userRole, {
                            is_locked: 0,
                            bi_khoa: 0,
                            lock_reason: "",
                            ly_do_khoa: "",
                        });
                    } else if (action === "delete") {
                        result = await localAuth.deleteKrudUser(userId, userRole);
                    } else {
                        throw new Error("Hành động không hợp lệ.");
                    }

                    showToast(result.message || "Thao tác thành công.", "success");
                    if (lastParams) {
                        loadUsers(lastParams);
                    }
                } catch (error) {
                    showToast(error.message || "Không thể cập nhật người dùng.", "error");
                }
            }

            async function loadUsers(params) {
                lastParams = { ...params };
                syncForm(params);
                updateUrl(params);
                summary.textContent = "Đang tải dữ liệu người dùng từ KRUD...";
                tbody.innerHTML = '<tr><td colspan="7" class="users-loading">Đang tải danh sách người dùng...</td></tr>';
                pagination.hidden = true;

                try {
                    const allUsers = await listUsersFromKrud();
                    const search = String(params.search || "").trim().toLowerCase();
                    const filteredUsers = allUsers.filter((user) => {
                        if (params.role && user.role !== params.role) return false;
                        if (!search) return true;

                        const haystack = [
                            user.username,
                            user.fullname,
                            user.email,
                            user.phone,
                        ]
                            .map((value) => String(value || "").toLowerCase())
                            .join(" ");
                        return haystack.includes(search);
                    });
                    const page = Math.max(1, Number(params.page || 1));
                    const limit = 10;
                    const totalRecords = filteredUsers.length;
                    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
                    const safePage = Math.min(page, totalPages);
                    const start = (safePage - 1) * limit;
                    const users = filteredUsers.slice(start, start + limit);

                    renderUsers(users);
                    renderPagination({
                        page: safePage,
                        total_pages: totalPages,
                    }, { ...params, page: safePage });
                    updateStats(filteredUsers);
                    summary.textContent = `Hiển thị ${users.length} người dùng trên tổng ${totalRecords.toLocaleString("vi-VN")} bản ghi. Trang ${safePage}/${totalPages}.`;
                } catch (error) {
                    summary.textContent = "Không tải được dữ liệu.";
                    tbody.innerHTML = `<tr><td colspan="7" class="users-empty">${escapeHtml(error.message || "Không thể tải dữ liệu người dùng.")}</td></tr>`;
                    pagination.hidden = true;
                    updateStats([]);
                }
            }

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                loadUsers({
                    search: form.search.value.trim(),
                    role: form.role.value,
                    page: 1,
                });
            });

            resetBtn.addEventListener("click", () => {
                loadUsers({ search: "", role: "", page: 1 });
            });

            tbody.addEventListener("click", (event) => {
                const button = event.target.closest("[data-user-action]");
                if (!button) return;
                const row = button.closest("tr");
                const userRole = row?.querySelector("[data-user-role]")?.getAttribute("data-user-role") || button.dataset.userRole || "";
                sendAction(button.dataset.userAction, Number(button.dataset.userId), userRole);
            });

            loadUsers(getParamsFromLocation());
        })();
    </script>
</body>
</html>


