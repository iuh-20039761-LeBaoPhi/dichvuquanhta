<?php
session_start();
require_once __DIR__ . '/../config/local_store.php';

$adminAccounts = json_decode(
    '[
        {
            "id": 900001,
            "username": "admin01",
            "fullname": "Quan tri vien Giao Hang Nhanh",
            "email": "admin01@giaohangnhanh.local",
            "phone": "0901234569",
            "password": "Aq123@cc",
            "is_locked": 0
        }
    ]',
    true
);

$adminOverrides = admin_local_store_read('admin-profiles.json', []);
if (is_array($adminOverrides)) {
    foreach ($adminAccounts as &$account) {
        $usernameKey = strtolower(trim((string) ($account['username'] ?? '')));
        $override = is_array($adminOverrides[$usernameKey] ?? null)
            ? $adminOverrides[$usernameKey]
            : null;
        if (!$override) {
            continue;
        }

        foreach (['fullname', 'email', 'phone', 'password'] as $field) {
            if (isset($override[$field]) && $override[$field] !== '') {
                $account[$field] = (string) $override[$field];
            }
        }
    }
    unset($account);
}

$error = '';

if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    header('Location: admin_stats.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim((string) ($_POST['identifier'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($identifier === '' || $password === '') {
        $error = 'Vui lòng nhập số điện thoại hoặc tài khoản và mật khẩu.';
    } else {
        $admin = null;
        foreach ($adminAccounts as $candidate) {
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
            $error = 'Không tìm thấy tài khoản admin tạm thời.';
        } elseif ((int) ($admin['is_locked'] ?? 0) === 1) {
            $error = 'Tài khoản admin đang bị khóa.';
        } elseif ((string) ($admin['password'] ?? '') !== $password) {
            $error = 'Mật khẩu không chính xác.';
        } else {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) ($admin['id'] ?? 0);
            $_SESSION['username'] = (string) ($admin['username'] ?? 'admin');
            $_SESSION['role'] = 'admin';
            $_SESSION['fullname'] = (string) ($admin['fullname'] ?? '');
            $_SESSION['email'] = (string) ($admin['email'] ?? '');
            $_SESSION['phone'] = (string) ($admin['phone'] ?? '');
            header('Location: admin_stats.php');
            exit;
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
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
                radial-gradient(circle at top left, rgba(255, 147, 41, 0.14), transparent 22%),
                linear-gradient(180deg, #f4f7fb 0%, #eef4ff 100%);
        }

        .admin-login-card {
            width: min(440px, 100%);
            background: #fff;
            border: 1px solid #dbe7ff;
            border-radius: 22px;
            box-shadow: 0 20px 44px rgba(10, 42, 102, 0.12);
            overflow: hidden;
        }

        .admin-login-card__header {
            padding: 26px 28px 18px;
            color: #fff;
            background:
                radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 25%),
                linear-gradient(135deg, #08214f 0%, #0a2a66 62%, #123b87 100%);
        }

        .admin-login-card__eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.12);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .admin-login-card__header h1 {
            margin: 0 0 10px;
            font-size: 28px;
            line-height: 1.12;
        }

        .admin-login-card__header p {
            margin: 0;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
        }

        .admin-login-card__body {
            padding: 24px 28px 28px;
        }

        .admin-login-card__hint,
        .admin-login-card__error {
            margin-bottom: 16px;
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 14px;
            line-height: 1.6;
        }

        .admin-login-card__hint {
            color: #0f172a;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }

        .admin-login-card__error {
            color: #9f1239;
            background: #fff1f2;
            border: 1px solid #fecdd3;
        }

        .admin-login-card__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 20px;
        }

        .admin-login-card__actions .btn-secondary {
            justify-content: center;
        }

        .admin-login-card__meta {
            margin-top: 18px;
            font-size: 13px;
            color: #64748b;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <form method="post" class="admin-login-card">
        <div class="admin-login-card__header">
            <span class="admin-login-card__eyebrow">Admin Tam Thoi</span>
            <h1>Đăng nhập quản trị</h1>
            <p>Tạm thời dùng so sánh tài khoản JSON nội bộ để vào dashboard admin hiện tại, chưa đọc từ KRUD.</p>
        </div>

        <div class="admin-login-card__body">
            <div class="admin-login-card__hint">
                <strong>Tài khoản mặc định:</strong><br>
                Tài khoản: <code>admin01</code> hoặc <code>0901234569</code><br>
                Mật khẩu: <code>Aq123@cc</code>
            </div>

            <?php if ($error !== ''): ?>
                <div class="admin-login-card__error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>

            <div class="form-group">
                <label for="identifier">Số điện thoại hoặc tài khoản</label>
                <input
                    id="identifier"
                    type="text"
                    name="identifier"
                    class="admin-input"
                    required
                    autocomplete="username"
                    value="<?php echo htmlspecialchars((string) ($_POST['identifier'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"
                >
            </div>

            <div class="form-group">
                <label for="password">Mật khẩu</label>
                <input id="password" type="password" name="password" class="admin-input" required autocomplete="current-password">
            </div>

            <div class="admin-login-card__actions">
                <button type="submit" class="btn-primary" style="justify-content:center; flex:1 1 180px;">
                    Đăng nhập admin
                </button>
            </div>

            <p class="admin-login-card__meta">
                Khi nào chốt lại luồng admin bằng KRUD, file này sẽ được thay lại. Hiện tại nó chỉ giữ session PHP cho cụm trang admin hiện tại.
            </p>
        </div>
    </form>
</body>
</html>
