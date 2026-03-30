<?php
session_start();
require_once __DIR__ . '/../config/db.php';

$error = '';

if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    header('Location: admin_stats.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim((string) ($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? ($_POST['ten_dang_nhap'] ?? ($_POST['username'] ?? '')))));
    $password = (string) ($_POST['mat_khau'] ?? ($_POST['password'] ?? ''));

    if ($identifier === '' || $password === '') {
        $error = 'Vui lòng nhập số điện thoại hoặc username và mật khẩu.';
    } else {
        $stmt = $conn->prepare("SELECT id, ten_dang_nhap AS username, so_dien_thoai AS phone, mat_khau AS password, vai_tro AS role, bi_khoa AS is_locked, ly_do_khoa AS lock_reason FROM nguoi_dung WHERE vai_tro = 'admin' AND (so_dien_thoai = ? OR ten_dang_nhap = ?) ORDER BY CASE WHEN so_dien_thoai = ? THEN 0 ELSE 1 END LIMIT 1");
        if ($stmt) {
            $stmt->bind_param('sss', $identifier, $identifier, $identifier);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$user) {
                $error = 'Không tìm thấy tài khoản admin.';
            } elseif ((int) ($user['is_locked'] ?? 0) === 1) {
                $error = 'Tài khoản admin đang bị khóa: ' . trim((string) ($user['lock_reason'] ?? 'Không rõ lý do.'));
            } elseif (!password_verify($password, (string) ($user['password'] ?? ''))) {
                $error = 'Mật khẩu không chính xác.';
            } else {
                session_regenerate_id(true);
                $_SESSION['user_id'] = (int) $user['id'];
                $_SESSION['username'] = (string) $user['username'];
                $_SESSION['role'] = 'admin';
                header('Location: admin_stats.php');
                exit;
            }
        } else {
            $error = 'Không thể kết nối hệ thống đăng nhập admin.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập Admin | Giao Hàng Nhanh</title>
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <style>
        body { min-height: 100vh; display:flex; align-items:center; justify-content:center; background:#f5f7fb; padding:24px; }
        .login-card { width:min(420px,100%); background:#fff; border:1px solid #e6edf8; border-radius:18px; padding:28px; box-shadow:0 20px 40px rgba(10,42,102,.08); }
        .login-card h1 { margin:0 0 10px; color:#0a2a66; }
        .login-card p { margin:0 0 20px; color:#64748b; }
        .login-error { background:#fff1f2; color:#9f1239; border:1px solid #fecdd3; padding:12px 14px; border-radius:12px; margin-bottom:16px; }
    </style>
</head>
<body>
    <form method="post" class="login-card">
        <h1>Admin đăng nhập</h1>
        <p>Module quản trị độc lập của Giao Hàng Nhanh.</p>
        <?php if ($error !== ''): ?>
            <div class="login-error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
        <?php endif; ?>
        <div class="form-group">
            <label>Số điện thoại hoặc username</label>
            <input type="text" name="so_dien_thoai" class="admin-input" required value="<?php echo htmlspecialchars((string) ($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? ($_POST['ten_dang_nhap'] ?? ($_POST['username'] ?? '')))), ENT_QUOTES, 'UTF-8'); ?>">
        </div>
        <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" name="mat_khau" class="admin-input" required>
        </div>
        <button type="submit" class="btn-primary" style="width:100%; justify-content:center;">Đăng nhập</button>
    </form>
</body>
</html>

