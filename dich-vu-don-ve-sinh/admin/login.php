<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Admin Login | Vệ Sinh Care</title>
    <link rel="stylesheet" href="../admin/layout/login.css">
</head>
<body class="login-page">

<div class="login-wrapper">
    <div class="login-card">

        <!-- Logo / Brand -->
        <div class="login-header">
            <h1>VỆ SINH CARE</h1>
            <p>Hệ thống quản trị</p>
        </div>

        <!-- Form -->
        <form class="login-form" action="login_process.php" method="POST">
            <h2>🔐 Admin Login</h2>

            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" name="username" placeholder="admin" required>
            </div>

            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" name="password" placeholder="••••••••" required>
            </div>

            <button type="submit" class="login-btn">
                Đăng nhập
            </button>

            <?php if (isset($_GET['error'])): ?>
                <div class="error-msg">
                    ❌ Sai tài khoản hoặc mật khẩu
                </div>
            <?php endif; ?>
        </form>

        <!-- Footer -->
        <div class="login-footer">
            © 2026 Vệ Sinh Care
        </div>
    </div>
</div>

</body>
</html>
