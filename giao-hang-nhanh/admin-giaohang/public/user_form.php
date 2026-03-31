<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$user = ['username' => '', 'fullname' => '', 'email' => '', 'phone' => '', 'role' => 'customer', 'vehicle_type' => '', 'is_locked' => 0];
$is_edit = false;
$msg = "";
$error = "";

if ($id > 0) {
    $is_edit = true;
    $res = $conn->query("SELECT id, ten_dang_nhap AS username, ho_ten AS fullname, email, so_dien_thoai AS phone, vai_tro AS role, loai_phuong_tien AS vehicle_type, bi_khoa AS is_locked FROM nguoi_dung WHERE id = $id");
    if ($res->num_rows > 0) $user = $res->fetch_assoc();
    else die("Người dùng không tồn tại.");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $fullname = trim($_POST['fullname']);
    $email = trim($_POST['email']);
    $phone = trim($_POST['phone']);
    $role = $_POST['role'];
    $vehicle_type = ($role === 'shipper') ? trim($_POST['vehicle_type'] ?? '') : null;
    $password = $_POST['password'];

    $errs = [];
    if (empty($username)) $errs[] = "Tên đăng nhập không được để trống.";
    if (empty($email)) $errs[] = "Email không được để trống.";

    $check_sql = "SELECT id FROM nguoi_dung WHERE (ten_dang_nhap = '$username' OR email = '$email') AND id != $id";
    if ($conn->query($check_sql)->num_rows > 0) $errs[] = "Tên đăng nhập hoặc Email đã tồn tại.";

    if (empty($errs)) {
        if ($is_edit) {
            $sql = "UPDATE nguoi_dung SET ho_ten=?, email=?, so_dien_thoai=?, vai_tro=?, loai_phuong_tien=? WHERE id=?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssi", $fullname, $email, $phone, $role, $vehicle_type, $id);
            $stmt->execute();
            if (!empty($password)) {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $conn->query("UPDATE nguoi_dung SET mat_khau = '$hash' WHERE id = $id");
            }
            $msg = "Cập nhật tài khoản thành công!";
            $user = $conn->query("SELECT id, ten_dang_nhap AS username, ho_ten AS fullname, email, so_dien_thoai AS phone, vai_tro AS role, loai_phuong_tien AS vehicle_type, bi_khoa AS is_locked FROM nguoi_dung WHERE id = $id")->fetch_assoc();
        } else {
            if (empty($password)) $error = "Mật khẩu là bắt buộc khi tạo mới.";
            else {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $sql = "INSERT INTO nguoi_dung (ten_dang_nhap, mat_khau, ho_ten, email, so_dien_thoai, vai_tro, loai_phuong_tien) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sssssss", $username, $hash, $fullname, $email, $phone, $role, $vehicle_type);
                if ($stmt->execute()) {
                    header("Location: users_manage.php");
                    exit;
                } else $error = "Lỗi: " . $conn->error;
            }
        }
    } else $error = implode("<br>", $errs);
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title><?php echo $is_edit ? 'Chỉnh sửa' : 'Thêm mới'; ?> người dùng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title"><?php echo $is_edit ? 'Chỉnh sửa thành viên' : 'Đăng ký thành viên mới'; ?></h2>
            <a href="users_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Danh sách</a>
        </div>

        <?php if ($msg): ?>
            <div class="status-badge status-active" style="width:100%; margin-bottom: 25px; padding: 15px;"><i class="fa-solid fa-circle-check"></i> <?php echo $msg; ?></div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="status-badge status-cancelled" style="width:100%; margin-bottom: 25px; padding: 15px;"><i class="fa-solid fa-triangle-exclamation"></i> <?php echo $error; ?></div>
        <?php endif; ?>

        <div class="admin-card" style="max-width: 800px; margin: 0 auto; padding: 40px;">
            <form method="POST">
                <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
                    <div class="form-group">
                        <label>Tên đăng nhập <span style="color:red">*</span></label>
                        <input type="text" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" class="admin-input" <?php echo $is_edit ? 'readonly style="background:#f1f5f9; cursor:not-allowed;"' : 'required'; ?>>
                    </div>
                    <div class="form-group">
                        <label>Mật khẩu <?php echo $is_edit ? '(Để trống nếu không đổi)' : '<span style="color:red">*</span>'; ?></label>
                        <input type="password" name="password" class="admin-input" <?php echo $is_edit ? '' : 'required'; ?>>
                    </div>
                    <div class="form-group">
                        <label>Họ và tên</label>
                        <input type="text" name="fullname" value="<?php echo htmlspecialchars($user['fullname']); ?>" class="admin-input" placeholder="Nhập tên đầy đủ...">
                    </div>
                    <div class="form-group">
                        <label>Địa chỉ Email <span style="color:red">*</span></label>
                        <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" class="admin-input" required>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại</label>
                        <input type="text" name="phone" value="<?php echo htmlspecialchars($user['phone']); ?>" class="admin-input">
                    </div>
                    <div class="form-group">
                        <label>Vai trò hệ thống</label>
                        <select name="role" class="admin-select" onchange="toggleVehicle(this.value)">
                            <option value="customer" <?php echo $user['role'] == 'customer' ? 'selected' : ''; ?>>Khách hàng</option>
                            <option value="shipper" <?php echo $user['role'] == 'shipper' ? 'selected' : ''; ?>>Shipper (Nhân viên giao nhận)</option>
                            <option value="admin" <?php echo $user['role'] == 'admin' ? 'selected' : ''; ?>>Quản trị viên (Admin)</option>
                        </select>
                    </div>
                </div>

                <div id="vehicle-group" style="display: <?php echo $user['role'] === 'shipper' ? 'block' : 'none'; ?>; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <label style="font-weight: 700; color: #0a2a66; margin-bottom: 10px; display: block;">Loại phương tiện vận chuyển</label>
                    <div style="display: flex; gap: 20px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="vehicle_type" value="Xe máy" <?php echo $user['vehicle_type'] == 'Xe máy' ? 'checked' : ''; ?>> Xe máy
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="vehicle_type" value="Xe tải" <?php echo $user['vehicle_type'] == 'Xe tải' ? 'checked' : ''; ?>> Xe tải
                        </label>
                    </div>
                </div>

                <div style="margin-top: 40px; display: flex; gap: 15px;">
                    <button type="submit" class="btn-primary" style="flex: 2; justify-content: center; height: 50px; font-size: 16px;">
                        <i class="fa-solid fa-floppy-disk"></i> <?php echo $is_edit ? 'Lưu thay đổi' : 'Tạo tài khoản'; ?>
                    </button>
                    <a href="users_manage.php" class="btn-secondary" style="flex: 1; justify-content: center; height: 50px; font-size: 16px;">Hủy bỏ</a>
                </div>
            </form>
        </div>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script>
        function toggleVehicle(role) {
            document.getElementById('vehicle-group').style.display = (role === 'shipper' ? 'block' : 'none');
        }
    </script>
</body>
</html>



