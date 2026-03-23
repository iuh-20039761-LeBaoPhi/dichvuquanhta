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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  <?php require_once "footer.php"; ?>
</body>
</html>