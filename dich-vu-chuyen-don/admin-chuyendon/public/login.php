<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_boot_session();

if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    moving_admin_redirect('users_manage.php');
}

$error = '';
$accounts = moving_admin_admin_accounts();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim((string) ($_POST['identifier'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($identifier === '' || $password === '') {
        $error = 'Vui lòng nhập tài khoản và mật khẩu.';
    } else {
        $admin = null;
        foreach ($accounts as $candidate) {
            $username = strtolower(trim((string) ($candidate['username'] ?? '')));
            $email = strtolower(trim((string) ($candidate['email'] ?? '')));
            $phone = preg_replace('/\D+/', '', (string) ($candidate['phone'] ?? ''));
            $needle = strtolower($identifier);
            $needlePhone = preg_replace('/\D+/', '', $identifier);

            if ($needle === $username || $needle === $email || ($needlePhone !== '' && $needlePhone === $phone)) {
                $admin = $candidate;
                break;
            }
        }

        if (!$admin) {
            $error = 'Không tìm thấy tài khoản admin.';
        } elseif ((int) ($admin['is_locked'] ?? 0) === 1) {
            $error = 'Tài khoản admin đang bị khóa.';
        } elseif (!password_verify($password, (string) ($admin['password_hash'] ?? ''))) {
            $error = 'Mật khẩu không chính xác.';
        } else {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) ($admin['id'] ?? 0);
            $_SESSION['username'] = (string) ($admin['username'] ?? 'admin');
            $_SESSION['role'] = 'admin';
            $_SESSION['fullname'] = (string) ($admin['fullname'] ?? '');
            moving_admin_redirect('users_manage.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập admin chuyển dọn</title>
    <link rel="stylesheet" href="assets/css/admin.css">
</head>
<body>
    <div class="login-shell">
        <form method="post" class="login-card">
            <div class="login-card__head">
                <span class="admin-brand__eyebrow">Admin đơn giản</span>
                <h1>Đăng nhập quản trị</h1>
                <p>
                    Cụm admin này đi theo hướng của giao hàng: có session PHP,
                    tách riêng `public / includes / config / data`, nhưng chỉ giữ
                    3 màn hình đơn giản cho chuyển dọn.
                </p>
            </div>

            <div class="login-card__body">
                <div class="login-hint">
                    <strong>Tài khoản mặc định:</strong><br>
                    Tài khoản: <code>admin01</code> hoặc <code>0901234569</code><br>
                    Mật khẩu: <code>Admin@123</code>
                </div>

                <?php if ($error !== ''): ?>
                    <div class="flash flash-error"><?php echo moving_admin_escape($error); ?></div>
                <?php endif; ?>

                <div class="field">
                    <label for="identifier">Tài khoản, email hoặc số điện thoại</label>
                    <input id="identifier" class="input" type="text" name="identifier" required autocomplete="username" value="<?php echo moving_admin_escape($_POST['identifier'] ?? ''); ?>">
                </div>

                <div class="field" style="margin-top: 14px;">
                    <label for="password">Mật khẩu</label>
                    <input id="password" class="input" type="password" name="password" required autocomplete="current-password">
                </div>

                <div class="form-actions" style="margin-top: 20px;">
                    <button type="submit" class="button button-primary" style="width: 100%;">Đăng nhập admin</button>
                </div>
            </div>
        </form>
    </div>
</body>
</html>
