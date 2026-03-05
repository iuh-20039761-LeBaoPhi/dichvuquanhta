<?php
session_start();

// 1. Kết nối database
require_once __DIR__ . '/../config/db.php';

$error_msg = "";

// 2. Xử lý khi submit form
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $fullname = trim($_POST['fullname'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    $role = $_POST['role'] ?? 'customer'; // Lấy vai trò từ form

    // Validate cơ bản
    if (empty($username) || empty($password) || empty($email) || empty($phone) || empty($fullname)) {
        $error_msg = "Vui lòng nhập đầy đủ thông tin.";
    } elseif ($password !== $confirm_password) {
        $error_msg = "Mật khẩu xác nhận không khớp.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error_msg = "Email không hợp lệ.";
    } elseif (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        $error_msg = "Số điện thoại không hợp lệ.";
    } else {
        // Kiểm tra username đã tồn tại chưa
        // Kiểm tra cả username hoặc email đã tồn tại chưa
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->bind_param("ss", $username, $email);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $error_msg = "Tên đăng nhập hoặc Email đã được sử dụng.";
        } else {
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // --- TÍNH NĂNG MỚI: DUYỆT SHIPPER ---
            // Nếu đăng ký là shipper, tài khoản cần được admin duyệt
            $is_approved = ($role === 'shipper') ? 0 : 1;

            // Insert vào DB
            $insert_stmt = $conn->prepare("INSERT INTO users (username, email, phone, fullname, password, role, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $insert_stmt->bind_param("ssssssi", $username, $email, $phone, $fullname, $hashed_password, $role, $is_approved);

            if ($insert_stmt->execute()) {
                // BẢO MẬT: Chống Session Fixation
                session_regenerate_id(true);

                // Đăng ký thành công, tự động đăng nhập và chuyển hướng đến dashboard
                $_SESSION['user_id'] = $insert_stmt->insert_id;
                $_SESSION['username'] = $username;
                $_SESSION['role'] = $role;
                header("Location: dashboard.php");
                exit;
            } else {
                error_log("Register Error: " . $conn->error);
                $error_msg = "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.";
            }
            $insert_stmt->close();
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
    <title>Đăng ký tài khoản | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
    <style>
    /* Style riêng cho trang auth để căn giữa */
    body {
        background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        font-family: 'Poppins', sans-serif;
        padding: 20px;
        margin: 0;
    }

    .auth-card {
        background: white;
        padding: 40px 35px;
        border-radius: 16px;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 450px;
        border-top: 5px solid #ff7a00;
        /* Brand accent */
        transition: transform 0.3s ease;
    }

    .auth-title {
        text-align: center;
        color: #0a2a66;
        margin-bottom: 5px;
        font-size: 28px;
        font-weight: 700;
    }

    .auth-subtitle {
        text-align: center;
        color: #666;
        font-size: 14px;
        margin-bottom: 30px;
    }

    .error-box {
        background: #fff5f5;
        color: #e53e3e;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 14px;
        text-align: center;
        border: 1px solid #fed7d7;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        margin-bottom: 8px;
        color: #4a5568;
        font-weight: 500;
        font-size: 14px;
    }

    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 15px;
        transition: all 0.3s ease;
        outline: none;
        color: #2d3748;
        background-color: #f8fafc;
    }

    .form-group input:focus {
        border-color: #0a2a66;
        background-color: #fff;
        box-shadow: 0 0 0 4px rgba(10, 42, 102, 0.1);
    }

    .form-group input::placeholder {
        color: #a0aec0;
    }

    .auth-link {
        text-align: center;
        margin-top: 25px;
        font-size: 14px;
        color: #718096;
    }

    .auth-link a {
        color: #ff7a00;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s;
    }

    .auth-link a:hover {
        color: #e96f00;
        text-decoration: underline;
    }

    /* Button override */
    .btn-primary {
        width: 100%;
        padding: 14px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        background-color: #0a2a66;
        border: none;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 10px;
        box-shadow: 0 4px 6px rgba(10, 42, 102, 0.2);
    }

    .btn-primary:hover {
        background-color: #0f3b99;
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(10, 42, 102, 0.3);
    }

    .btn-primary:active {
        transform: translateY(0);
    }

    @media (max-width: 480px) {
        .auth-card {
            padding: 30px 20px;
        }
    }
    </style>
</head>

<body>
    <div class="auth-card">
        <h2 class="auth-title">Đăng Ký FastGo</h2>
        <p class="auth-subtitle">Tạo tài khoản mới để bắt đầu vận chuyển</p>

        <?php if (!empty($error_msg)): ?>
        <div class="error-box">⚠️ <?php echo $error_msg; ?></div>
        <?php endif; ?>

        <form method="POST" action="">
            <!-- Thêm lựa chọn vai trò -->
            <div class="form-group">
                <label>Bạn muốn đăng ký với vai trò</label>
                <select name="role"
                    style="width:100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px;">
                    <option value="customer">Khách hàng (Gửi hàng)</option>
                    <option value="shipper">Tài xế (Nhận đơn)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" name="username" required placeholder="Nhập username"
                    value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>">
            </div>
            <div class="form-group">
                <label>Họ và tên</label>
                <input type="text" name="fullname" required placeholder="Nhập họ tên đầy đủ"
                    value="<?php echo htmlspecialchars($_POST['fullname'] ?? ''); ?>">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" required placeholder="example@gmail.com"
                    value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>">
            </div>
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="tel" name="phone" required placeholder="09xxxxxxxxx"
                    value="<?php echo htmlspecialchars($_POST['phone'] ?? ''); ?>">
            </div>
            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" name="password" required placeholder="Nhập mật khẩu">
            </div>
            <div class="form-group">
                <label>Xác nhận mật khẩu</label>
                <input type="password" name="confirm_password" required placeholder="Nhập lại mật khẩu">
            </div>
            <button type="submit" class="btn-primary" style="width: 100%;">Đăng Ký</button>
        </form>
        <div class="auth-link">Đã có tài khoản? <a href="login.php">Đăng nhập ngay</a></div>
    </div>

    <!-- Nút Back to Top -->
    <button id="back-to-top-btn" title="Lên đầu trang">↑</button>
</body>


</html>
