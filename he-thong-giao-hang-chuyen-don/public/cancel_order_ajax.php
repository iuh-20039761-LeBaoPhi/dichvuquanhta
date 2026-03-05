<?php
session_start(); // Khởi động session để lấy thông tin người dùng đăng nhập
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $code = trim($_POST['code'] ?? '');

    if (empty($code)) {
        echo json_encode(['status' => 'error', 'message' => 'Thiếu mã đơn hàng.']);
        exit;
    }

    // Kiểm tra trạng thái hiện tại của đơn hàng
    $stmt = $conn->prepare("SELECT id, status, user_id FROM orders WHERE order_code = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Đơn hàng không tồn tại.']);
        exit;
    }

    $order = $res->fetch_assoc();

    // Chỉ cho phép hủy nếu đơn đang "Chờ xử lý"
    if ($order['status'] !== 'pending') {
        echo json_encode(['status' => 'error', 'message' => 'Không thể hủy đơn hàng này (đã giao hoặc đã hủy).']);
        exit;
    }

    // BẢO MẬT: Nếu người dùng đã đăng nhập, kiểm tra xem đơn này có phải của họ không
    if (isset($_SESSION['user_id'])) {
        if ($order['user_id'] != $_SESSION['user_id'] && $_SESSION['role'] !== 'admin') {
            echo json_encode(['status' => 'error', 'message' => 'Bạn không có quyền hủy đơn hàng của người khác.']);
            exit;
        }
    }

    // Lấy lý do hủy (nếu có)
    $reason = trim($_POST['reason'] ?? 'Không có lý do cụ thể');

    // Cập nhật trạng thái thành 'cancelled' và lưu lý do
    $update = $conn->prepare("UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?");
    $update->bind_param("si", $reason, $order['id']);

    if ($update->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Đã hủy đơn hàng thành công.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống.']);
    }
}
?>
