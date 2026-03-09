<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$customer = $_SESSION['customer'] ?? null;
?>

<style>
/* HEADER */
.site-header{
    background:#ffffff;
    border-bottom:1px solid #eee;
    padding:10px 0;
}

/* CONTAINER */
.site-header-content{
    width:1200px;
    margin:auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
}

/* LOGO */
.site-logo img{
    height:55px;
    width:auto;
}

/* MENU */
.site-nav a{
    margin:0 12px;
    text-decoration:none;
    color:#333;
    font-weight:500;
}

.site-nav a:hover{
    color:#1fa463;
}

/* USER AREA */
.site-user-area{
    display:flex;
    align-items:center;
    gap:10px;
}

.site-btn{
    background:#1fa463;
    color:white;
    padding:6px 14px;
    border-radius:6px;
    text-decoration:none;
}

.site-btn:hover{
    background:#168a52;
}

.site-logo{
    display:flex;
    align-items:center;
    text-decoration:none;
}

.logo-text{
    font-size:20px;
    font-weight:bold;
    margin-left:10px;
    color:#1fa463;
}
</style>

<header class="site-header">
  <div class="container site-header-content">

    <a href="index.php" class="site-logo">
    <img src="../img/ChatGPT Image 14_12_57 7 thg 3, 2026.png" alt="logo">
    <span class="logo-text">DỊCH VỤ VỆ SINH</span>
</a>
    <nav class="site-nav">
      <a href="index.php">Trang chủ</a>
      <a href="about.php">Giới thiệu</a>
      <a href="services.php">Dịch vụ</a>
      <a href="booking.php">Đặt lịch</a>
      <a href="pricing.php">Bảng giá</a>
      <a href="faq.php">FAQ</a>
      <a href="contact.php">Liên hệ</a>
    </nav>

    <!-- USER AREA -->
    <div class="site-user-area">

      <?php if ($customer): ?>

        <span class="site-user">
          xin chào👋 <?= htmlspecialchars($customer['phone']) ?>
        </span>

        <a href="customer_dashboard.php">Đơn hàng</a>
        <a href="logout.php" class="site-btn">Đăng xuất</a>

      <?php else: ?>

        <a href="login_customer.php" class="site-btn">Đăng nhập</a>

      <?php endif; ?>

    </div>

  </div>
</header>


