<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$customer = $_SESSION['customer'] ?? null;
?>

<style>
/* HEADER */
/* ===== HEADER ===== */

.site-header{
    background:#fff;
    border-bottom:1px solid #eee;
    position:sticky;
    top:0;
    z-index:1000;
}

.site-header-content{
    max-width:1200px;
    margin:auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:14px 20px;
}

/* LOGO */

.site-logo{
    display:flex;
    align-items:center;
    gap:10px;
    text-decoration:none;
}

.site-logo img{
    height:42px;
}

.logo-text{
    font-size:18px;
    font-weight:700;
    color:#1abc9c;
    white-space:nowrap;
}

/* MENU */

.site-nav{
    display:flex;
    align-items:center;
    gap:22px;
}

.site-nav a{
    text-decoration:none;
    color:#333;
    font-size:14px;
    font-weight:500;
    transition:0.2s;
}

.site-nav a:hover{
    color:#1abc9c;
}

/* LOGIN BUTTON */

.site-user-area{
    display:flex;
    align-items:center;
}

.site-btn{
    background:#1abc9c;
    color:#fff;
    padding:9px 20px;
    border-radius:6px;
    text-decoration:none;
    font-size:14px;
    font-weight:600;
    transition:0.2s;
}

.site-btn:hover{
    background:#16a085;
}
/* GROUP LOGO */
.logo-group{
    display:flex;
    align-items:center;
    gap:12px;
}

/* Logo phụ */
.logo-sub{
    height:42px;          /* tăng nhẹ cho cân */
    width:auto;           /* giữ đúng tỉ lệ */
    object-fit:contain;   /* không bị méo */
    padding:4px 8px;      /* tạo khoảng thở */
    background:#fff;      /* nền trắng cho sạch */
    border-radius:8px;
    border:1px solid #eee;
    transition:0.3s;
}

/* Hover effect */
.logo-sub:hover{
    transform:translateY(-2px) scale(1.05);
    box-shadow:0 6px 14px rgba(0,0,0,0.12);
}
</style>

<header class="site-header">
  <div class="container site-header-content">

   <div class="logo-group">

    <!-- Logo chính -->
    <a href="index.php" class="site-logo">
        <img src="../img/ChatGPT Image 14_12_57 7 thg 3, 2026.png">
        <span class="logo-text">DỊCH VỤ VỆ SINH</span>
    </a>

    <!-- Logo dịch vụ quanh ta -->
    <a href="https://iuh-20039761-lebaophi.github.io/GlobalCare/index.html" target="_blank">
        <img src="../demo/img/dichvuquanhta.png" class="logo-sub">
    </a>

</div>
    <nav class="site-nav">
      <a href="index.php">Trang chủ</a>
      <a href="about.php">Giới thiệu</a>
      <a href="services.php">Dịch vụ</a>
      <a href="booking.php">Đặt lịch</a>
      <a href="pricing.php">Bảng giá</a>
      <a href="faq.php">FAQ</a>
      <a href="contact.php">Liên hệ</a>
      <a href="blog.php">Bài viết</a>
      <a href="terms.php">Điều khoản dịch vụ</a>

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


