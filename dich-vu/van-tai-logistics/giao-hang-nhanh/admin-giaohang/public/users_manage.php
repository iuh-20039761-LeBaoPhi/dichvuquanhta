<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}
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

        .users-card-actions {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
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

            .users-card-actions {
                width: 100%;
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
            <div class="users-card-actions">
                <span class="users-toolbar-badge">
                    <i class="fa-solid fa-database"></i>
                    <span>Đang dùng chung bảng nguoidung</span>
                </span>
            </div>
        </div>

        <section class="users-hero">
            <h3>Quản lý trạng thái tài khoản giao hàng</h3>
            <p>Màn này đọc trực tiếp từ bảng dùng chung <strong>nguoidung</strong> để lọc khách hàng, nhà cung cấp và khóa/mở khóa tài khoản khi cần.</p>
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
                    <small>Nhà cung cấp</small>
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
                            <option value="shipper">Nhà cung cấp</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="users-status">Trạng thái</label>
                        <select id="users-status" name="status" class="admin-select">
                            <option value="">-- Tất cả trạng thái --</option>
                            <option value="active">Hoạt động</option>
                            <option value="locked">Đã khóa</option>
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
        window.GHNAdminUsersConfig = {
            currentAdminId: <?php echo (int) $_SESSION['user_id']; ?>,
            currentAdminUsername: <?php echo json_encode((string) ($_SESSION['username'] ?? 'admin01')); ?>,
            currentAdminName: <?php echo json_encode((string) ($_SESSION['fullname'] ?? 'Admin')); ?>,
            currentAdminEmail: <?php echo json_encode((string) ($_SESSION['email'] ?? '')); ?>,
            currentAdminPhone: <?php echo json_encode((string) ($_SESSION['phone'] ?? '')); ?>
        };
    </script>
    <script src="assets/js/admin-users-manage.js?v=<?php echo time(); ?>"></script>
</body>
</html>


