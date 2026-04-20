<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

/**
 * Trang Chi tiết Đơn hàng "Siêu Nhúng" (Master Standalone)
 * - Tái tạo 100% giao diện dự án gốc.
 * - Không có Header Admin để tạo cảm giác "Trang riêng".
 * - Có nút quay lại Dashboard.
 */
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chi tiết đơn hàng #<?php echo $_GET['madonhang'] ?? ''; ?> | Admin Chuyển Dọn</title>
    
    <!-- Shared Project Styles (Bắt buộc) -->
    <link rel="stylesheet" href="../../public/assets/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* Standalone Admin Overrides */
        body { margin: 0; padding: 0; background: #f8fafc; }
        
        .admin-back-bar {
            background: #1e293b;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
        }
        
        .admin-back-btn {
            background: rgba(255,255,255,0.1);
            color: white;
            text-decoration: none;
            padding: 6px 15px;
            border-radius: 6px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
        }
        
        .admin-back-btn:hover { background: rgba(255,255,255,0.2); }
        
        .standalone-order-shell {
            padding-top: 0 !important;
        }

        /* Đảm bảo trang chiếm toàn màn hình */
        .standalone-order-layout {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
    </style>
</head>
<body class="standalone-order-page" data-page="provider-order-detail">
    
    <!-- Thanh điều hướng Admin tối giản -->
    <div class="admin-back-bar">
        <span><i class="fas fa-user-shield me-2"></i> Chế độ Xem Admin</span>
        <a href="orders_manage.php" class="admin-back-btn">
            <i class="fas fa-arrow-left me-2"></i> Quay lại Admin Dashboard
        </a>
    </div>

    <main class="standalone-order-shell">
        <div id="provider-order-detail-root" class="standalone-order-state">
            <div class="standalone-order-loader">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Đang nạp file gốc của hệ thống...</span>
            </div>
        </div>
    </main>

    <!-- Dependencies -->
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    
    <!-- Master Logic for Admin (No Redirects) -->
    <script type="module" src="assets/js/admin-order-detail-master.js"></script>
</body>
</html>
