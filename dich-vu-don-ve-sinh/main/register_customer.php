<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đăng ký | Vệ Sinh Care</title>
    <link rel="stylesheet" href="../css/register.css">
</head>
<body class="login-page">

<div class="login-wrapper">
    <div class="login-card">

        <div class="login-header">
            <h1>VỆ SINH CARE</h1>
            <p>Đăng ký tài khoản khách hàng</p>
        </div>

        <form class="login-form" action="register_process.php" method="POST">
            <h2>📝 Đăng ký</h2>

            <div class="form-group">
                <label>Họ và tên</label>
                <input type="text" name="full_name" required>
            </div>

            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" name="phone" required>
            </div>

            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" required>
            </div>

            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" name="password" required>
            </div>

            <button type="submit" class="login-btn">
                Tạo tài khoản
            </button>

            <?php if (isset($_GET['error'])): ?>
                <div class="error-msg">❌ <?= $_GET['error'] ?></div>
            <?php endif; ?>
        </form>

        <div class="login-footer">
            Đã có tài khoản? <a href="login_customer.php">Đăng nhập</a>
        </div>

    </div>
</div>

</body>
</html>
