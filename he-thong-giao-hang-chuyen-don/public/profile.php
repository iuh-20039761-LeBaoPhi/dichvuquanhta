<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];
$msg = "";
$msg_class = "";

// Xử lý Form
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Cập nhật thông tin
    if (isset($_POST['update_info'])) {
        $fullname = trim($_POST['fullname']);
        $phone = trim($_POST['phone']);
        // Nhận thông tin công ty
        $company_name = trim($_POST['company_name'] ?? '');
        $tax_code = trim($_POST['tax_code'] ?? '');
        $company_address = trim($_POST['company_address'] ?? '');

        if (empty($fullname) || empty($phone)) {
            $msg = "Vui lòng nhập đầy đủ họ tên và SĐT.";
            $msg_class = "error";
        } else {
            $stmt = $conn->prepare("UPDATE users SET fullname = ?, phone = ?, company_name = ?, tax_code = ?, company_address = ? WHERE id = ?");
            $stmt->bind_param("sssssi", $fullname, $phone, $company_name, $tax_code, $company_address, $user_id);
            if ($stmt->execute()) {
                $msg = "Cập nhật thông tin thành công!";
                $msg_class = "success";
            } else {
                $msg = "Lỗi hệ thống: " . $conn->error;
                $msg_class = "error";
            }
        }
    }

    // 2. Đổi mật khẩu
    if (isset($_POST['change_pass'])) {
        $old_pass = $_POST['old_pass'];
        $new_pass = $_POST['new_pass'];
        $confirm_pass = $_POST['confirm_pass'];

        // Lấy pass cũ từ DB
        $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $user = $res->fetch_assoc();

        if (!password_verify($old_pass, $user['password'])) {
            $msg = "Mật khẩu cũ không chính xác.";
            $msg_class = "error";
        } elseif ($new_pass !== $confirm_pass) {
            $msg = "Mật khẩu xác nhận không khớp.";
            $msg_class = "error";
        } elseif (strlen($new_pass) < 8 || !preg_match('/[A-Z]/', $new_pass) || !preg_match('/[a-z]/', $new_pass) || !preg_match('/[0-9]/', $new_pass) || !preg_match('/[\W_]/', $new_pass)) {
            $msg = "Mật khẩu yếu. Yêu cầu: tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
            $msg_class = "error";
        } else {
            $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
            $upd = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $upd->bind_param("si", $hashed, $user_id);
            if ($upd->execute()) {
                $msg = "Đổi mật khẩu thành công!";
                $msg_class = "success";
            }
        }
    }
}

// Lấy thông tin hiển thị
$stmt = $conn->prepare("SELECT username, email, fullname, phone, company_name, tax_code, company_address FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_info = $stmt->get_result()->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Thông tin tài khoản | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_user.php'; ?>

    <main class="container" style="padding: 40px 20px; max-width: 800px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin:0;">Hồ sơ cá nhân</h2>
            <a href="dashboard.php" class="btn-secondary"
                style="color:#0a2a66; border-color:#0a2a66; padding:8px 15px;">← Quay lại</a>
        </div>

        <?php if ($msg): ?>
        <div class="msg-box <?php echo $msg_class; ?>">
            <?php echo $msg; ?>
        </div>
        <?php endif; ?>

        <div class="profile-card">
            <h3 style="margin-bottom:20px; color:#ff7a00;">Thông tin chung</h3>
            <form method="POST" onsubmit="return confirm('Bạn có chắc chắn muốn lưu thay đổi thông tin cá nhân?');">
                <div class="form-group"><label>Tên đăng nhập</label><input type="text"
                        value="<?php echo htmlspecialchars($user_info['username']); ?>" disabled
                        style="background:#eee;"></div>
                <div class="form-group"><label>Email</label><input type="text"
                        value="<?php echo htmlspecialchars($user_info['email']); ?>" disabled style="background:#eee;">
                </div>
                <div class="form-group"><label>Họ và tên</label><input type="text" name="fullname"
                        value="<?php echo htmlspecialchars($user_info['fullname']); ?>" required></div>
                <div class="form-group"><label>Số điện thoại</label><input type="text" name="phone"
                        value="<?php echo htmlspecialchars($user_info['phone']); ?>" required></div>

                <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #eee;">
                <h4 style="color:#0a2a66; margin-bottom:15px;">Thông tin xuất hóa đơn (Mặc định)</h4>
                <div class="form-group"><label>Tên công ty</label><input type="text" name="company_name"
                        value="<?php echo htmlspecialchars($user_info['company_name'] ?? ''); ?>"
                        placeholder="Nhập tên công ty"></div>
                <div class="form-group"><label>Mã số thuế</label><input type="text" name="tax_code"
                        value="<?php echo htmlspecialchars($user_info['tax_code'] ?? ''); ?>"
                        placeholder="Nhập mã số thuế"></div>
                <div class="form-group"><label>Địa chỉ công ty</label><input type="text" name="company_address"
                        value="<?php echo htmlspecialchars($user_info['company_address'] ?? ''); ?>"
                        placeholder="Nhập địa chỉ công ty"></div>

                <button type="submit" name="update_info" class="btn-primary" style="margin-top:15px;">Cập nhật thông
                    tin</button>
            </form>
        </div>

        <div class="profile-card">
            <h3 style="margin-bottom:20px; color:#ff7a00;">Đổi mật khẩu</h3>
            <form method="POST" onsubmit="return confirm('Bạn có chắc chắn muốn đổi mật khẩu không?');">
                <div class="form-group"><label>Mật khẩu cũ</label><input type="password" name="old_pass" required></div>
                <div class="form-group"><label>Mật khẩu mới</label><input type="password" name="new_pass" required>
                </div>
                <div class="form-group"><label>Nhập lại mật khẩu mới</label><input type="password" name="confirm_pass"
                        required></div>
                <button type="submit" name="change_pass" class="btn-secondary"
                    style="margin-top:15px; background:#0a2a66; color:white; border:none;">Đổi mật khẩu</button>
            </form>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>
