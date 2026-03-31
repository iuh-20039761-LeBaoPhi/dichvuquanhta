<?php
session_start();
require_once __DIR__ . '/../config/db.php';

$error_msg = "";
$redirect_target = trim($_POST['redirect'] ?? ($_GET['redirect'] ?? ''));

function normalize_redirect_target($target)
{
    $target = trim((string) $target);
    if ($target === '' || strlen($target) > 500) {
        return '';
    }
    if (preg_match('/[\r\n]/', $target)) {
        return '';
    }
    if (preg_match('/^(https?:)?\/\//i', $target)) {
        return '';
    }
    if ($target[0] === '/') {
        return $target;
    }
    if (!preg_match('/^[A-Za-z0-9_\-\.\/\?=&%#]+$/', $target)) {
        return '';
    }
    return $target;
}

$redirect_target = normalize_redirect_target($redirect_target);

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $loginIdentifier = trim((string) ($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? ($_POST['ten_dang_nhap'] ?? ($_POST['username'] ?? '')))));
    $password = $_POST['mat_khau'] ?? ($_POST['password'] ?? '');

    if (empty($loginIdentifier) || empty($password)) {
        $error_msg = "Vui lòng nhập số điện thoại và mật khẩu.";
    } else {
        $stmt = $conn->prepare("SELECT id, ten_dang_nhap AS username, mat_khau AS password, vai_tro AS role, bi_khoa AS is_locked, ly_do_khoa AS lock_reason, da_duyet AS is_approved FROM nguoi_dung WHERE so_dien_thoai = ? OR ten_dang_nhap = ? ORDER BY CASE WHEN so_dien_thoai = ? THEN 0 ELSE 1 END LIMIT 1");
        $stmt->bind_param("sss", $loginIdentifier, $loginIdentifier, $loginIdentifier);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            if ($user['is_locked'] == 1) {
                $reason = $user['lock_reason'] ? $user['lock_reason'] : "Vi phạm chính sách";
                $error_msg = "Tài khoản bị khóa. Lý do: " . htmlspecialchars($reason);
            } elseif ($user['role'] === 'shipper' && $user['is_approved'] == 0) {
                $error_msg = "Tài khoản shipper của bạn đang chờ quản trị viên duyệt.";
            } elseif (password_verify($password, $user['password'])) {
                // Đăng nhập thành công
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];

                // Phân quyền chuyển hướng mặc định
                $default_redirect = "khach-hang/dashboard.html";
                if ($user['role'] === 'admin') {
                    $error_msg = "Thông tin đăng nhập không chính xác.";
                } elseif ($user['role'] === 'shipper') {
                    $default_redirect = "nha-cung-cap/dashboard.html";
                }

                if ($error_msg === '') {
                    // Nếu có redirect hợp lệ từ request thì ưu tiên.
                    $target = $redirect_target !== '' ? $redirect_target : $default_redirect;
                    header("Location: " . $target);
                    exit;
                }
            } else {
                $error_msg = "Mật khẩu không chính xác.";
            }
        } else {
            $error_msg = "Số điện thoại không tồn tại.";
        }
        $stmt->close();
    }
}
$conn->close();
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Đăng nhập | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body class="auth-page-body">
    <div class="auth-card">
        <h2 class="auth-title">Đăng Nhập Giao Hàng Nhanh</h2>
        <?php if (!empty($error_msg)): ?>
            <div class="error-box">
                <?php echo $error_msg; ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <?php if ($redirect_target !== ''): ?>
                <input type="hidden" name="redirect" value="<?php echo htmlspecialchars($redirect_target); ?>">
            <?php endif; ?>
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="tel" name="so_dien_thoai" required inputmode="numeric"
                    value="<?php echo htmlspecialchars($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? ($_POST['ten_dang_nhap'] ?? ($_POST['username'] ?? '')))); ?>">
            </div>
            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" name="mat_khau" required>
            </div>
            <button type="submit" class="btn-primary" style="width: 100%;">Đăng Nhập</button>
        </form>
        <div class="auth-link">Chưa có tài khoản? <a href="register.php">Đăng ký ngay</a></div>
    </div>
</body>

</html>
