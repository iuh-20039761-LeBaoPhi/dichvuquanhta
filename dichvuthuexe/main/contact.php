<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Liên hệ</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/form.css">
</head>
<body>

<?php include "../partials/header.php"; ?>

<section class="page">
    <h2 class="section-title">📞 Liên hệ với chúng tôi</h2>

    <form action="contact_submit.php" method="POST" class="contact-form">
        <input type="text" name="name" placeholder="Họ và tên" required>
        <input type="tel" name="phone" placeholder="Số điện thoại" required>
        <input type="email" name="email" placeholder="Email (không bắt buộc)">
        <textarea name="message" rows="5" placeholder="Nội dung liên hệ..." required></textarea>

        <button type="submit">GỬI LIÊN HỆ</button>
    </form>
</section>

<?php include "../partials/footer.php"; ?>

</body>
</html>
