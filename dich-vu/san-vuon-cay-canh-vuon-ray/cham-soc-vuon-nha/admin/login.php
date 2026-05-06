<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: text/html; charset=utf-8');
}

// Nếu đã đăng nhập, chuyển thẳng vào trang quản trị
if (!empty($_SESSION['admin_logged_in']) && isset($_SESSION['admin_user'])) {
    header('Location: index.php');
    exit;
}

// Hàm escape HTML
function admin_login_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

// Hàm kiểm tra mật khẩu (hỗ trợ cả plain text và sha256$hash)
function admin_password_match(string $input, string $stored): bool
{
    if ($stored === '') {
        return false;
    }
    if (strpos($stored, 'sha256$') === 0) {
        return hash_equals($stored, 'sha256$' . hash('sha256', $input));
    }
    return hash_equals($stored, $input);
}

// Thử đăng nhập tự động qua cookie (remember me)
function try_cookie_login(): bool
{
    $email    = trim((string) ($_COOKIE['admin_e'] ?? ''));
    $password = (string) ($_COOKIE['admin_p'] ?? '');

    if ($email === '' || $password === '') {
        return false;
    }

    $apiResult = admin_api_list_table('admin');
    if (($apiResult['error'] ?? '') !== '') {
        return false;
    }

    foreach ($apiResult['rows'] ?? [] as $row) {
        $rowEmail = strtolower(trim((string) ($row['email'] ?? '')));
        $rowPass  = (string) ($row['matkhau'] ?? $row['password'] ?? '');
        if ($rowEmail !== '' && $rowEmail === strtolower($email) && admin_password_match($password, $rowPass)) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_user'] = [
                'id'    => (int) ($row['id'] ?? 0),
                'name'  => (string) ($row['hovaten'] ?? $row['ten'] ?? 'Admin'),
                'email' => (string) ($row['email'] ?? $email),
            ];
            return true;
        }
    }
    return false;
}

if (try_cookie_login()) {
    header('Location: index.php');
    exit;
}

// Xử lý form đăng nhập POST
$formEmail = '';
$error     = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $formEmail = trim((string) ($_POST['email'] ?? ''));
    $password  = (string) ($_POST['password'] ?? '');

    if ($formEmail === '' || $password === '') {
        $error = 'Vui lòng nhập đầy đủ email và mật khẩu.';
    } else {
        $apiResult = admin_api_list_table('admin');
        $apiError  = (string) ($apiResult['error'] ?? '');

        if ($apiError !== '') {
            $error = 'Không lấy được dữ liệu admin: ' . $apiError;
        } else {
            $account = null;
            foreach ($apiResult['rows'] ?? [] as $row) {
                $rowEmail = strtolower(trim((string) ($row['email'] ?? '')));
                if ($rowEmail !== '' && $rowEmail === strtolower($formEmail)) {
                    $account = $row;
                    break;
                }
            }

            if (!is_array($account)) {
                $error = 'Tài khoản admin không tồn tại.';
            } else {
                $storedPassword = (string) ($account['matkhau'] ?? $account['password'] ?? '');
                if (!admin_password_match($password, $storedPassword)) {
                    $error = 'Mật khẩu không đúng.';
                } else {
                    $_SESSION['admin_logged_in'] = true;
                    $_SESSION['admin_user'] = [
                        'id'    => (int) ($account['id'] ?? 0),
                        'name'  => (string) ($account['hovaten'] ?? $account['ten'] ?? 'Admin'),
                        'email' => (string) ($account['email'] ?? $formEmail),
                    ];
                    header('Location: index.php');
                    exit;
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập - Quản trị Chăm Sóc Vườn</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --pg: #1a4d2e;
            --ag: #4f6f52;
            --lime: #e8f3d6;
            --accent: #43a047;
        }
        body {
            min-height: 100vh;
            background: radial-gradient(circle at 80% 20%, #e8f3d6 0%, #ffffff 60%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', sans-serif;
        }
        .login-card {
            width: 100%;
            max-width: 420px;
            background: #fff;
            border-radius: 24px;
            padding: 40px 36px;
            box-shadow: 0 20px 60px rgba(26, 77, 46, 0.12);
            border: 1px solid rgba(26, 77, 46, 0.08);
        }
        .login-logo {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            object-fit: cover;
            margin-bottom: 16px;
        }
        .login-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--pg);
            margin-bottom: 4px;
        }
        .login-sub {
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 28px;
        }
        .form-label {
            font-weight: 700;
            color: #374151;
            font-size: 0.85rem;
            margin-bottom: 6px;
        }
        .form-control {
            border-radius: 12px;
            border: 1px solid #d1d5db;
            padding: 10px 14px;
            font-size: 0.95rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.15);
        }
        .btn-login {
            background: linear-gradient(135deg, var(--accent), var(--pg));
            border: none;
            border-radius: 12px;
            padding: 12px;
            font-weight: 700;
            font-size: 1rem;
            color: #fff;
            width: 100%;
            transition: all 0.2s;
            box-shadow: 0 4px 16px rgba(26, 77, 46, 0.25);
        }
        .btn-login:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(26, 77, 46, 0.3);
        }
        .alert-danger {
            border-radius: 12px;
            font-size: 0.9rem;
            border: none;
            background: #fef2f2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="text-center">
            <img src="../assets/images/logo2.jpg" alt="Logo" class="login-logo">
            <div class="login-title">Quản Trị Vườn Nhà</div>
            <div class="login-sub">Đăng nhập để tiếp tục</div>
        </div>

        <?php if ($error !== ''): ?>
            <div class="alert alert-danger mb-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i><?= admin_login_h($error) ?>
            </div>
        <?php endif; ?>

        <form method="post" action="login.php" autocomplete="on">
            <div class="mb-3">
                <label class="form-label" for="email">Email</label>
                <input type="email" id="email" name="email" class="form-control"
                    value="<?= admin_login_h($formEmail) ?>"
                    placeholder="admin@example.com" required autofocus>
            </div>
            <div class="mb-4">
                <label class="form-label" for="password">Mật khẩu</label>
                <input type="password" id="password" name="password" class="form-control"
                    placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn-login">
                <i class="bi bi-box-arrow-in-right me-2"></i>Đăng nhập
            </button>
        </form>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
