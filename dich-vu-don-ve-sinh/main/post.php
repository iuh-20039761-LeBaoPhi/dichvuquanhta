<?php
require_once "db.php";

$id = $_GET['id'] ?? 0;

$stmt = $conn->prepare("SELECT * FROM posts WHERE id=?");
$stmt->bind_param("i", $id);
$stmt->execute();

$post = $stmt->get_result()->fetch_assoc();

if(!$post){
    die("Không tìm thấy bài viết");
}
?>


<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title><?= htmlspecialchars($post['title']) ?></title>

<link rel="stylesheet" href="../demo/style.css">
<link rel="stylesheet" href="../demo/header.css">
<link rel="stylesheet" href="../demo/post.css">

</head>

<body>

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
          <a href="blog.php">Bài viết</a>
          <a href="terms.php">Điều khoản dịch vụ</a>
        </nav>

        <div class="site-user-area">
          <a href="login_customer.php" class="site-btn">Đăng nhập</a>
        </div>
      </div>
    </header>

<section class="post-section">

<div class="post-container">

  

<h1 class="post-title"><?= htmlspecialchars($post['title']) ?></h1>

<div class="post-meta">
📅 <?= $post['created_at'] ?>
</div>

<img src="../uploads/<?= $post['image'] ?>" class="post-image">

<div class="post-content">
<?= $post['content'] ?>
</div>

<a href="blog.php" class="back-btn">← Quay lại bài viết</a>



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