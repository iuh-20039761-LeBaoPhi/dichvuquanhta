<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

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
    <title>Hồ sơ Admin | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ cá nhân</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quay lại Dashboard</a>
        </div>

        <?php if ($msg): ?>
            <div class="status-badge status-active" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo $msg; ?>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="status-badge status-cancelled" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-triangle-exclamation"></i> <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <div class="dashboard-layout">
            <!-- Cột trái: Thông tin tài khoản -->
            <div class="admin-card">
                <div class="admin-card-header">
                    <h3><i class="fa-solid fa-id-card"></i> Thông tin cơ bản</h3>
                </div>
                
                <form method="POST">
                    <div class="grid-responsive">
                        <div class="form-group">
                            <label>Tên đăng nhập (Username)</label>
                            <input type="text" value="<?php echo htmlspecialchars($user['username']); ?>" class="admin-input" disabled>
                        </div>
                        <div class="form-group">
                            <label>Họ và tên</label>
                            <input type="text" name="fullname" value="<?php echo htmlspecialchars($user['fullname']); ?>" class="admin-input" required>
                        </div>
                        <div class="form-group">
                            <label>Email liên lạc</label>
                            <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" class="admin-input" required>
                        </div>
                        <div class="form-group">
                            <label>Số điện thoại</label>
                            <input type="text" name="phone" value="<?php echo htmlspecialchars($user['phone']); ?>" class="admin-input">
                        </div>
                        <div class="form-group">
                            <label>Vai trò hệ thống</label>
                            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(10, 42, 102, 0.05); border-radius: 10px;">
                                <span class="role-badge role-admin">Quản trị viên (Admin)</span>
                                <small style="color: #64748b;">(Không thể thay đổi)</small>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px; text-align: right;">
                        <button type="submit" name="update_info" class="btn-primary">
                            <i class="fa-solid fa-save"></i> Cập nhật thông tin
                        </button>
                    </div>
                </form>
            </div>

            <!-- Cột phải: Bảo mật -->
            <aside>
                <div class="admin-card" style="border-top: 4px solid #d9534f;">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-shield-halved"></i> Đổi mật khẩu</h3>
                    </div>
                    
                    <form method="POST">
                        <div class="form-grid" style="grid-template-columns: 1fr;">
                            <div class="form-group">
                                <label>Mật khẩu hiện tại</label>
                                <input type="password" name="current_password" class="admin-input" required placeholder="••••••••">
                            </div>
                            <div class="form-group">
                                <label>Mật khẩu mới</label>
                                <input type="password" name="new_password" class="admin-input" required placeholder="Tối thiểu 6 ký tự">
                            </div>
                            <div class="form-group">
                                <label>Xác nhận mật khẩu</label>
                                <input type="password" name="confirm_password" class="admin-input" required placeholder="Nhập lại mật khẩu mới">
                            </div>
                        </div>
                        
                        <div style="margin-top: 25px;">
                            <button type="submit" name="change_password" class="btn-primary" style="width: 100%; justify-content: center; background: #d9534f;">
                                <i class="fa-solid fa-key"></i> Đổi mật khẩu bảo mật
                            </button>
                        </div>
                    </form>
                </div>
                
                <div class="admin-card" style="margin-top: 20px; background: #f8f9fa;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 30px; color: #ff7a00;"><i class="fa-solid fa-circle-info"></i></div>
                        <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Việc thay đổi mật khẩu thường xuyên giúp bảo vệ tài khoản quản trị của bạn an toàn hơn.
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </main>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>

</html>

