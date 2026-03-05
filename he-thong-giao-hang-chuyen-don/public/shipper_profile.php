<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Shipper
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'shipper') {
    header("Location: login.php");
    exit;
}

$shipper_id = $_SESSION['user_id'];

// --- FIX: Kiểm tra tài khoản bị khóa ---
$check_lock = $conn->query("SELECT is_locked FROM users WHERE id = $shipper_id");
if ($check_lock && $check_lock->fetch_assoc()['is_locked'] == 1) {
    header("Location: logout.php");
    exit;
}

$msg = "";
$msg_class = "";

// --- XỬ LÝ FORM CẬP NHẬT ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Cập nhật thông tin cá nhân
    if (isset($_POST['update_info'])) {
        $fullname = trim($_POST['fullname']);
        $phone = trim($_POST['phone']);

        if (empty($fullname) || empty($phone)) {
            $msg = "Vui lòng nhập đầy đủ họ tên và SĐT.";
            $msg_class = "error";
        } else {
            $stmt = $conn->prepare("UPDATE users SET fullname = ?, phone = ? WHERE id = ?");
            $stmt->bind_param("ssi", $fullname, $phone, $shipper_id);
            if ($stmt->execute()) {
                $msg = "Cập nhật thông tin thành công!";
                $msg_class = "success";
            } else {
                error_log("Update Profile Error: " . $conn->error);
                $msg = "Có lỗi xảy ra khi cập nhật.";
                $msg_class = "error";
            }
        }
    }

    // 2. Đổi mật khẩu
    if (isset($_POST['change_pass'])) {
        $old_pass = $_POST['old_pass'];
        $new_pass = $_POST['new_pass'];
        $confirm_pass = $_POST['confirm_pass'];

        $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->bind_param("i", $shipper_id);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!password_verify($old_pass, $user['password'])) {
            $msg = "Mật khẩu cũ không đúng.";
            $msg_class = "error";
        } elseif ($new_pass !== $confirm_pass) {
            $msg = "Mật khẩu xác nhận không khớp.";
            $msg_class = "error";
        } elseif (strlen($new_pass) < 6) {
            $msg = "Mật khẩu mới phải từ 6 ký tự trở lên.";
            $msg_class = "error";
        } else {
            $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
            $upd = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $upd->bind_param("si", $hashed, $shipper_id);
            if ($upd->execute()) {
                $msg = "Đổi mật khẩu thành công!";
                $msg_class = "success";
            }
        }
    }
}

// --- LẤY THỐNG KÊ HIỆU SUẤT ---
$stats = [
    'income' => 0,
    'total' => 0,
    'completed' => 0,
    'cancelled' => 0
];

$sql_stats = "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'completed' THEN shipping_fee ELSE 0 END) as income
              FROM orders WHERE shipper_id = ?";
$stmt = $conn->prepare($sql_stats);
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$res_stats = $stmt->get_result()->fetch_assoc();
if ($res_stats) {
    $stats = $res_stats;
}

// Lấy thông tin user
$stmt = $conn->prepare("SELECT username, fullname, phone, email FROM users WHERE id = ?");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$user_info = $stmt->get_result()->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Hồ sơ Shipper | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin_styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_shipper.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ & Thống kê</h2>
            <a href="shipper_dashboard.php" class="back-link">← Quay lại Dashboard</a>
        </div>

        <?php if ($msg): ?>
            <div class="msg-box <?php echo $msg_class; ?>">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <!-- THỐNG KÊ -->
        <div class="profile-grid"
            style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 30px;">
            <div class="stat-box" style="border-bottom: 4px solid #28a745;">
                <div class="stat-label">💰 Tổng thu nhập (Ship)</div>
                <div class="stat-num" style="color: #28a745;">
                    <?php echo number_format($stats['income'] ?? 0); ?>đ
                </div>
            </div>
            <div class="stat-box" style="border-bottom: 4px solid #0a2a66;">
                <div class="stat-label">📦 Tổng đơn được giao</div>
                <div class="stat-num" style="color: #0a2a66;">
                    <?php echo number_format($stats['total']); ?>
                </div>
            </div>
            <div class="stat-box" style="border-bottom: 4px solid #17a2b8;">
                <div class="stat-label">✅ Giao thành công</div>
                <div class="stat-num" style="color: #17a2b8;">
                    <?php echo number_format($stats['completed']); ?>
                </div>
            </div>
            <div class="stat-box" style="border-bottom: 4px solid #dc3545;">
                <div class="stat-label">❌ Đơn hủy / Thất bại</div>
                <div class="stat-num" style="color: #dc3545;">
                    <?php echo number_format($stats['cancelled']); ?>
                </div>
            </div>
        </div>

        <!-- CẬP NHẬT THÔNG TIN -->
        <div class="profile-grid">
            <div class="form-box">
                <h3 style="color: #0a2a66; margin-bottom: 15px;">Thông tin cá nhân</h3>
                <form method="POST">
                    <div class="form-group"><label>Tên đăng nhập</label><input type="text"
                            value="<?php echo htmlspecialchars($user_info['username']); ?>" disabled
                            style="background:#eee;"></div>
                    <div class="form-group"><label>Họ và tên</label><input type="text" name="fullname"
                            value="<?php echo htmlspecialchars($user_info['fullname']); ?>" required></div>
                    <div class="form-group"><label>Số điện thoại</label><input type="text" name="phone"
                            value="<?php echo htmlspecialchars($user_info['phone']); ?>" required></div>
                    <button type="submit" name="update_info" class="btn-primary"
                        style="width:100%; margin-top:10px;">Lưu thông tin</button>
                </form>
            </div>

            <div class="form-box">
                <h3 style="color: #0a2a66; margin-bottom: 15px;">Đổi mật khẩu</h3>
                <form method="POST">
                    <div class="form-group"><label>Mật khẩu cũ</label><input type="password" name="old_pass" required>
                    </div>
                    <div class="form-group"><label>Mật khẩu mới</label><input type="password" name="new_pass" required>
                    </div>
                    <div class="form-group"><label>Nhập lại mật khẩu mới</label><input type="password"
                            name="confirm_pass" required></div>
                    <button type="submit" name="change_pass" class="btn-secondary"
                        style="width:100%; margin-top:10px; background:#6c757d; color:white; border:none;">Đổi mật
                        khẩu</button>
                </form>
            </div>
        </div>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="assets/js/main.js?v=<?php echo time(); ?>"></script>
</body>

</html>
