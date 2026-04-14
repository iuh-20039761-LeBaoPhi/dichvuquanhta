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
            <a href="users_manage.php" class="admin-brand__title">Admin chuyển dọn</a>
        </div>

        <nav class="admin-nav">
            <a href="users_manage.php" class="<?php echo $currentPage === 'users_manage.php' ? 'is-active' : ''; ?>">Người dùng</a>
            <a href="orders_manage.php" class="<?php echo $currentPage === 'orders_manage.php' ? 'is-active' : ''; ?>">Đơn hàng</a>
            <a href="admin_pricing.php" class="<?php echo $currentPage === 'admin_pricing.php' ? 'is-active' : ''; ?>">Bảng giá</a>
        </nav>

        <div class="admin-header__actions">
            <span class="admin-user-chip"><?php echo moving_admin_escape($_SESSION['username'] ?? 'admin'); ?></span>
            <a href="logout.php" class="button button-ghost">Đăng xuất</a>
        </div>
    </div>
</header>
<main class="admin-page">
