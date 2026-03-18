<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$customer = $_SESSION['customer'] ?? null;
?>
<style>
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
      flex-wrap:nowrap;
}

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

.site-nav{
    display:flex;
    align-items:center;
    gap:22px;
      flex-shrink:0;
      margin-left:40px;
}

.site-nav a{
    text-decoration:none;
    color:#333;
    font-size:14px;
    font-weight:500;
    white-space:nowrap; 
       transition: color 0.2s ease;
}
.site-nav a.active{
    color:#1abc9c;
    font-weight:600;
}
.site-nav a:active{
    transform: scale(0.95);
}
.site-btn{
    background:#1abc9c;
    color:#fff;
    padding:6px 12px;
    border-radius:6px;
     font-size:13px;
}

.logo-group{
    display:flex;
    align-items:center;
    gap:12px;
}

.logo-sub{
    height:42px;
    border-radius:8px;
    border:1px solid #eee;
}
.nav-user{
    font-size:14px;
    font-weight:500;
    color:#333;
    max-width:140px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
}
.site-user-area{
    display:flex;
    align-items:center;
    gap:10px;
    flex-shrink:0;
     border-left:1px solid #eee;
    padding-left:10px;
}
.site-user-area a{
    text-decoration:none;
    font-size:14px;
}
/* ===== MENU TOGGLE ===== */
.menu-toggle{
    display:none;
    font-size:24px;
    background:none;
    border:none;
    cursor:pointer;
}
.site-nav a:hover{
    color:#1abc9c;
}
.site-nav{
    transition: all 0.3s ease;
}
/* ===== MOBILE ===== */
@media (max-width: 768px){

    /* hiện nút ☰ */
    .menu-toggle{
        display:block;
        margin-left:auto;
    }

    /* ẨN MENU */
    .site-nav{
        display:none;
        flex-direction:column;
        width:100%;
        background:#fff;
        padding:10px 0;
        border-top:1px solid #eee;
    }

    /* Khi bấm thì hiện */
    .site-nav.active{
        display:flex;
    }

    /* Menu item */
    .site-nav a{
        padding:10px 20px;
        width:100%;
        
    }

    /* USER AREA xuống dưới */
    .site-user-area{
        width:100%;
        justify-content:space-between;
        padding-top:10px;
    }
}

@media (max-width: 768px){

    .site-header-content{
        flex-direction: column;
        align-items: flex-start;
        gap:10px;
    }

    .site-nav a{
        font-size:13px;
    }

    .logo-group{
        width:100%;
        justify-content: space-between;
    }

    .site-user-area{
        width:100%;
        justify-content: space-between;
    }

    .nav-user{
        max-width:120px;
    }

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
<button class="menu-toggle">☰</button>
    <nav class="site-nav">
     <?php $page = basename($_SERVER['PHP_SELF']); ?>

<a href="index.php" class="<?= $page == 'index.php' ? 'active' : '' ?>">Trang chủ</a>
<a href="about.php" class="<?= $page == 'about.php' ? 'active' : '' ?>">Giới thiệu</a>
<a href="services.php" class="<?= $page == 'services.php' ? 'active' : '' ?>">Dịch vụ</a>
<a href="booking.php" class="<?= $page == 'booking.php' ? 'active' : '' ?>">Đặt lịch</a>
<a href="pricing.php" class="<?= $page == 'pricing.php' ? 'active' : '' ?>">Bảng giá</a>
<a href="faq.php" class="<?= $page == 'faq.php' ? 'active' : '' ?>">FAQ</a>
<a href="contact.php" class="<?= $page == 'contact.php' ? 'active' : '' ?>">Liên hệ</a>
<a href="blog.php" class="<?= $page == 'blog.php' ? 'active' : '' ?>">Bài viết</a>
<a href="terms.php" class="<?= $page == 'terms.php' ? 'active' : '' ?>">Điều khoản dịch vụ</a>

    </nav>

    <!-- USER AREA -->
    <div class="site-user-area">

      <?php if ($customer): ?>

        <span class="nav-user">
  👋 Hello <?= substr($customer['phone'], 0, 4) ?>****
</span>

       <a href="customer_dashboard.php" class="site-btn">Đơn hàng</a>
        <a href="logout.php" class="site-btn">Đăng xuất</a>

      <?php else: ?>

        <a href="login_customer.php" class="site-btn">Đăng nhập</a>

      <?php endif; ?>

    </div>

  </div>
</header>




<script>
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

if (toggle && nav) {
    toggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}
window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if(window.scrollY > 10){
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
</script>