<?php
moving_admin_boot_session();
$currentPage = basename($_SERVER['PHP_SELF'] ?? '');
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo moving_admin_escape($pageTitle ?? 'Admin chuyển dọn'); ?></title>
    <link rel="stylesheet" href="assets/css/admin.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<header class="admin-header">
    <div class="admin-header__inner">
        <div class="admin-brand">
            <span class="admin-brand__eyebrow">GlobalCare</span>
            <a href="index.php" class="admin-brand__title">Admin chuyển dọn</a>
        </div>

        <nav class="admin-nav">
            <a href="index.php" class="<?php echo in_array($currentPage, ['index.php', 'admin_stats.php'], true) ? 'is-active' : ''; ?>">Dashboard</a>
            <a href="orders_manage.php" class="<?php echo $currentPage === 'orders_manage.php' ? 'is-active' : ''; ?>">Đơn hàng</a>
            <a href="users_manage.php" class="<?php echo $currentPage === 'users_manage.php' ? 'is-active' : ''; ?>">Nhà cung cấp & người dùng</a>
            <a href="admin_pricing.php" class="<?php echo $currentPage === 'admin_pricing.php' ? 'is-active' : ''; ?>">Bảng giá</a>
            <a href="contact_manage.php" class="<?php echo $currentPage === 'contact_manage.php' ? 'is-active' : ''; ?>">Liên hệ</a>
            <a href="articles_manage.php" class="<?php echo $currentPage === 'articles_manage.php' ? 'is-active' : ''; ?>">Cẩm nang</a>
            <a href="admin_guide.php" class="<?php echo $currentPage === 'admin_guide.php' ? 'is-active' : ''; ?>">Hướng dẫn</a>
            <a href="admin_profile.php" class="<?php echo $currentPage === 'admin_profile.php' ? 'is-active' : ''; ?>">Cấu hình</a>
        </nav>

        <div class="admin-header__actions">
            <a href="notifications.php" class="button button-ghost" title="Thông báo">
                <i class="fas fa-bell"></i>
            </a>
            <span class="admin-user-chip"><?php echo moving_admin_escape($_SESSION['username'] ?? 'admin'); ?></span>
            <a href="logout.php" class="button button-ghost">Đăng xuất</a>
        </div>
    </div>
</header>
<main class="admin-page">
