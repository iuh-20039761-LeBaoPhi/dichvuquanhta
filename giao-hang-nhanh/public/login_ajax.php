<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $loginIdentifier = trim((string) ($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? ($_POST['ten_dang_nhap'] ?? ($_POST['username'] ?? '')))));
    $password = $_POST['mat_khau'] ?? ($_POST['password'] ?? '');

    if (empty($loginIdentifier) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, ten_dang_nhap AS username, mat_khau AS password, vai_tro AS role, ho_ten AS fullname, so_dien_thoai AS phone, bi_khoa AS is_locked, ly_do_khoa AS lock_reason, da_duyet AS is_approved FROM nguoi_dung WHERE so_dien_thoai = ? OR ten_dang_nhap = ? ORDER BY CASE WHEN so_dien_thoai = ? THEN 0 ELSE 1 END LIMIT 1");
    if (!$stmt) {
        error_log('Login Prepare Error: ' . $conn->error); // Ghi log lỗi server
        echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.']);
        exit;
    }
    $stmt->bind_param("sss", $loginIdentifier, $loginIdentifier, $loginIdentifier);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        // --- FIX: Kiểm tra xem tài khoản có bị khóa không ---
        if ($user['is_locked'] == 1) {
            $reason = $user['lock_reason'] ? $user['lock_reason'] : "Vi phạm chính sách";
            echo json_encode(['status' => 'error', 'message' => 'Tài khoản bị khóa. Lý do: ' . $reason]);
            exit;
        } elseif ($user['role'] === 'shipper' && $user['is_approved'] == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Tài khoản shipper của bạn đang chờ quản trị viên duyệt.']);
            exit;
        }

        if (password_verify($password, $user['password'])) {
            if ($user['role'] === 'admin') {
                echo json_encode(['status' => 'error', 'message' => 'Thông tin đăng nhập không chính xác.']);
                exit;
            }

            // BẢO MẬT: Tạo lại Session ID để chống Session Fixation
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            echo json_encode(['status' => 'success', 'message' => 'Đăng nhập thành công!', 'user' => $user]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Mật khẩu không chính xác.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Số điện thoại không tồn tại.']);
    }
    $stmt->close();
}
$conn->close();
?>
