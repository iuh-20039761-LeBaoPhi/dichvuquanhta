<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>

<header class="site-header">
    <div class="logo">🚗 LÁI XE HỘ</div>

    <nav>

        <a href="../main/index.php">Trang chủ</a>
        <a href="../main/pricing.php">Bảng giá</a>
        <a href="../main/contact.php">Liên hệ</a>

        <a href="../main/book_driver.php" class="btn">Đặt tài xế</a>

        <?php if(isset($_SESSION['customer_id'])): ?>

            <a href="../customer/dashboard.php">
                Xin chào <?php echo $_SESSION['customer_name']; ?>
            </a>

            <a href="../main/logout.php">Đăng xuất</a>

        <?php else: ?>

            <a href="../main/login.php">Đăng nhập</a>
            <a href="../main/register.php" class="btn">Đăng ký</a>

        <?php endif; ?>

    </nav>
</header>