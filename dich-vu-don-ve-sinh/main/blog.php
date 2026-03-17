<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bài viết | Vệ sinh Care</title>

<link rel="stylesheet" href="../demo/style.css">
<link rel="stylesheet" href="../demo/header.css">

<style>

.blog-section{
padding:60px 20px;
}

.blog-title{
text-align:center;
margin-bottom:40px;
}

.blog-grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
gap:25px;
}

.blog-card{
background:white;
border-radius:10px;
overflow:hidden;
box-shadow:0 5px 20px rgba(0,0,0,0.08);
transition:0.3s;
}

.blog-card:hover{
transform:translateY(-5px);
}

.blog-card img{
width:100%;
height:180px;
object-fit:cover;
}

.blog-content{
padding:20px;
}

.blog-content h3{
margin-bottom:10px;
}

.blog-content p{
color:#666;
font-size:14px;
margin-bottom:15px;
}

.read-more{
text-decoration:none;
color:white;
background:#1abc9c;
padding:8px 14px;
border-radius:5px;
font-size:14px;
}

</style>
</head>

<body>

<!-- HEADER -->
<header class="site-header">
<div class="container site-header-content">

<a href="index.html" class="site-logo">
<img src="../img/ChatGPT Image 14_12_57 7 thg 3, 2026.png">
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
      <a href="blog.php">Bài viết</a>
       <a href="terms.php   ">Điều khoản dịch vụ</a>
</nav>

<div class="site-user-area">
<a href="login_customer.php" class="site-btn">Đăng nhập</a>
</div>

</div>
</header>


<!-- BLOG -->

<section class="blog-section container">

<h2 class="blog-title">Bài viết & Mẹo vệ sinh</h2>

<?php
require_once "db.php";
$result = $conn->query("SELECT * FROM posts ORDER BY id DESC");
?>

<div class="blog-grid">

<?php while($row = $result->fetch_assoc()): ?>

<div class="blog-card">
<img src="../uploads/<?= $row['image'] ?>">

<div class="blog-content">
<h3><?= htmlspecialchars($row['title']) ?></h3>

<p>
<?= substr(strip_tags($row['content']), 0, 100) ?>...
</p>

<a href="post.php?id=<?= $row['id'] ?>" class="read-more">
Xem bài viết
</a>

</div>
</div>

<?php endwhile; ?>

</div>

</section>
  <footer class="footer">
      <div class="container footer-content">
        <!-- CỘT 1 -->
        <div class="footer-col">
          <h3>VỆ SINH CARE</h3>
          <p>
            Dịch vụ vệ sinh chuyên nghiệp cho nhà ở, văn phòng và công trình sau
            xây dựng.
          </p>
        </div>

        <!-- CỘT 2 -->
        <div class="footer-col">
          <h4>Liên kết nhanh</h4>
          <ul>
            <li>
              <a target="_blank" href="../demo/">Lau Dọn Vệ Sinh</a>
            </li>
            <li><a target="_blank" href="../../csmvb/">Chăm Sóc Mẹ & Bé</a></li>
            <li>
              <a target="_blank" href="../../web-cham-soc-vuon-nha/"
                >Chăm Sóc Vườn & Rẫy</a
              >
            </li>
            <li>
              <a target="_blank" href="../../giat-ui-nhanh/">Giặt Ủi Cao Cấp</a>
            </li>
            <li>
              <a target="_blank" href="../../tho-nha/">Thợ Nhà & Sửa Chữa</a>
            </li>
            <li>
              <a target="_blank" href="../../csng/">Chăm Sóc Người Già</a>
            </li>
            <li>
              <a target="_blank" href="../../csbn/">Chăm Sóc Bệnh Nhân</a>
            </li>
            <li>
              <a target="_blank" href="../../he-thong-giao-hang-chuyen-don/"
                >Giao Hàng Nhanh</a
              >
            </li>
          </ul>
        </div>

        <!-- CỘT 3 -->
        <div class="footer-col">
          <h4>Thông tin liên hệ</h4>
          <p>📍 273 Trần Thủ Độ, Tân Phú, TP.HCM</p>
          <p>📞 <a href="tel:0775472347">0775 472 347</a></p>
          <p>
            ✉
            <a href="mailto:dichvuquanhta.vn@gmail.com"
              >dichvuquanhta.vn@gmail.com</a
            >
          </p>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© 2026 Vệ sinh Care. All rights reserved.</p>
      </div>
    </footer>
</body>
</html>