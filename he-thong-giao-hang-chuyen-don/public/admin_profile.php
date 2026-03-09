<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$user_id = $_SESSION['user_id'];
$msg = "";
$error = "";

// Xử lý cập nhật thông tin
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['update_info'])) {
        $fullname = trim($_POST['fullname']);
        $email = trim($_POST['email']);
        $phone = trim($_POST['phone']);

        if (empty($fullname) || empty($email)) {
            $error = "Họ tên và Email không được để trống.";
        } else {
            $stmt = $conn->prepare("UPDATE users SET fullname = ?, email = ?, phone = ? WHERE id = ?");
            $stmt->bind_param("sssi", $fullname, $email, $phone, $user_id);
            if ($stmt->execute()) {
                $msg = "Cập nhật thông tin thành công!";
            } else {
                $error = "Lỗi: " . $conn->error;
            }
            $stmt->close();
        }
    } elseif (isset($_POST['change_password'])) {
        $current_pass = $_POST['current_password'];
        $new_pass = $_POST['new_password'];
        $confirm_pass = $_POST['confirm_password'];

        if (empty($current_pass) || empty($new_pass) || empty($confirm_pass)) {
            $error = "Vui lòng nhập đầy đủ thông tin mật khẩu.";
        } elseif ($new_pass !== $confirm_pass) {
            $error = "Mật khẩu mới không khớp.";
        } else {
            // Verify current password
            $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $user_pass = $res->fetch_assoc();
            $stmt->close();

            if ($user_pass && password_verify($current_pass, $user_pass['password'])) {
                $hashed_new = password_hash($new_pass, PASSWORD_DEFAULT);
                $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt->bind_param("si", $hashed_new, $user_id);
                if ($stmt->execute()) {
                    $msg = "Đổi mật khẩu thành công!";
                } else {
                    $error = "Lỗi hệ thống.";
                }
                $stmt->close();
            } else {
                $error = "Mật khẩu hiện tại không đúng.";
            }
        }
    }
}

// Lấy thông tin user hiện tại để hiển thị lên form
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Hồ sơ Admin | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ cá nhân</h2>
            <a href="admin_stats.php" class="back-link">← Quay lại Dashboard</a>
        </div>

        <?php if ($msg): ?>
            <div
                style="padding:15px; background:#d4edda; color:#155724; border-radius:8px; margin-bottom:20px; border:1px solid #c3e6cb;">
                ✓ <?php echo $msg; ?>
            </div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div
                style="padding:15px; background:#f8d7da; color:#721c24; border-radius:8px; margin-bottom:20px; border:1px solid #f5c6cb;">
                ⚠️ <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <div class="dashboard-layout">
            <!-- Cột trái: Thông tin tài khoản -->
            <div class="table-section">
                <h3
                    style="color:#0a2a66; margin-bottom:20px; border-bottom:2px solid #ff7a00; padding-bottom:10px; display:inline-block;">
                    Thông tin tài khoản</h3>
                <form method="POST">
                    <div class="form-group">
                        <label>Tên đăng nhập</label>
                        <input type="text" value="<?php echo htmlspecialchars($user['username']); ?>" disabled
                            style="background:#e9ecef; cursor:not-allowed;">
                    </div>
                    <div class="form-group">
                        <label>Họ và tên</label>
                        <input type="text" name="fullname" value="<?php echo htmlspecialchars($user['fullname']); ?>"
                            required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>"
                            required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại</label>
                        <input type="text" name="phone" value="<?php echo htmlspecialchars($user['phone']); ?>"
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <div class="form-group">
                        <label>Vai trò</label>
                        <input type="text" value="Quản trị viên (Admin)" disabled
                            style="background:#e9ecef; cursor:not-allowed; color:#d9534f; font-weight:bold;">
                    </div>
                    <button type="submit" name="update_info" class="btn-primary" style="margin-top:15px;">Lưu thay
                        đổi</button>
                </form>
            </div>

            <!-- Cột phải: Đổi mật khẩu -->
            <aside class="filter-sidebar">
                <h3 style="color:#0a2a66; margin-bottom:20px;">Đổi mật khẩu</h3>
                <form method="POST" class="filter-form">
                    <div class="form-group">
                        <label>Mật khẩu hiện tại</label>
                        <input type="password" name="current_password" required
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <div class="form-group">
                        <label>Mật khẩu mới</label>
                        <input type="password" name="new_password" required
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <div class="form-group">
                        <label>Xác nhận mật khẩu mới</label>
                        <input type="password" name="confirm_password" required
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <button type="submit" name="change_password" class="btn-filter"
                        style="width:100%; margin-top:10px;">Cập nhật mật khẩu</button>
                </form>
            </aside>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>

