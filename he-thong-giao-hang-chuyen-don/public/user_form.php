<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$user = ['username' => '', 'fullname' => '', 'email' => '', 'phone' => '', 'role' => 'customer', 'is_locked' => 0];
$is_edit = false;
$msg = "";

if ($id > 0) {
    $is_edit = true;
    $res = $conn->query("SELECT * FROM users WHERE id = $id");
    if ($res->num_rows > 0) {
        $user = $res->fetch_assoc();
    } else {
        die("Người dùng không tồn tại.");
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $fullname = trim($_POST['fullname']);
    $email = trim($_POST['email']);
    $phone = trim($_POST['phone']);
    $role = $_POST['role'];
    $password = $_POST['password'];

    $errors = [];
    if (empty($username))
        $errors[] = "Tên đăng nhập không được để trống.";
    if (empty($email))
        $errors[] = "Email không được để trống.";

    // Check duplicate username/email
    $check_sql = "SELECT id FROM users WHERE (username = '$username' OR email = '$email') AND id != $id";
    if ($conn->query($check_sql)->num_rows > 0) {
        $errors[] = "Tên đăng nhập hoặc Email đã tồn tại.";
    }

    if (empty($errors)) {
        if ($is_edit) {
            // Update
            $sql = "UPDATE users SET fullname=?, email=?, phone=?, role=? WHERE id=?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ssssi", $fullname, $email, $phone, $role, $id);
            $stmt->execute();

            // Update password if provided
            if (!empty($password)) {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $conn->query("UPDATE users SET password = '$hash' WHERE id = $id");
            }
            $msg = "Cập nhật thành công!";
            // Refresh data
            $user = $conn->query("SELECT * FROM users WHERE id = $id")->fetch_assoc();
        } else {
            // Create
            if (empty($password)) {
                $msg = "Mật khẩu là bắt buộc khi tạo mới.";
            } else {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $sql = "INSERT INTO users (username, password, fullname, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ssssss", $username, $hash, $fullname, $email, $phone, $role);
                if ($stmt->execute()) {
                    header("Location: users_manage.php");
                    exit;
                } else {
                    $msg = "Lỗi: " . $conn->error;
                }
            }
        }
    } else {
        $msg = implode("<br>", $errors);
    }
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>
        <?php echo $is_edit ? 'Sửa người dùng' : 'Thêm người dùng'; ?> | Admin
    </title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">
                <?php echo $is_edit ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'; ?>
            </h2>
            <a href="users_manage.php" class="back-link">← Quay lại danh sách</a>
        </div>

        <?php if ($msg): ?>
            <div
                style="padding:15px; background:<?php echo strpos($msg, 'thành công') !== false ? '#d4edda' : '#f8d7da'; ?>; margin-bottom:20px; border-radius:4px;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <form method="POST"
            style="background:#fff; padding:30px; border-radius:8px; max-width:600px; margin:0 auto; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <div class="form-group"><label>Tên đăng nhập (*)</label><input type="text" name="username"
                    value="<?php echo htmlspecialchars($user['username']); ?>" <?php echo $is_edit ? 'readonly style="background:#eee;"' : 'required'; ?>></div>
            <div class="form-group"><label>Mật khẩu
                    <?php echo $is_edit ? '(Để trống nếu không đổi)' : '(*)'; ?>
                </label><input type="password" name="password" <?php echo $is_edit ? '' : 'required'; ?>></div>
            <div class="form-group"><label>Họ và tên</label><input type="text" name="fullname"
                    value="<?php echo htmlspecialchars($user['fullname']); ?>"></div>
            <div class="form-group"><label>Email (*)</label><input type="email" name="email"
                    value="<?php echo htmlspecialchars($user['email']); ?>" required></div>
            <div class="form-group"><label>Số điện thoại</label><input type="text" name="phone"
                    value="<?php echo htmlspecialchars($user['phone']); ?>"></div>
            <div class="form-group"><label>Vai trò</label>
                <select name="role">
                    <option value="customer" <?php if ($user['role'] == 'customer')
                        echo 'selected'; ?>>Khách hàng
                    </option>
                    <option value="shipper" <?php if ($user['role'] == 'shipper')
                        echo 'selected'; ?>>Shipper</option>
                    <option value="admin" <?php if ($user['role'] == 'admin')
                        echo 'selected'; ?>>Admin</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top:20px;">Lưu thông tin</button>
        </form>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>

