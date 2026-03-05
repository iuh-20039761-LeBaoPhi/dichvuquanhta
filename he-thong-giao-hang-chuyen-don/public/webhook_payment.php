<?php
// 1. Include DB
require_once __DIR__ . '/../config/db.php';

// --- CONFIGURATION ---
// QUAN TRỌNG: Lấy khóa bí mật này từ nhà cung cấp dịch vụ thanh toán của bạn (VD: VietQR)
// và giữ nó an toàn tuyệt đối.
define('WEBHOOK_SECRET_KEY', 'YOUR_ACTUAL_SECRET_KEY_FROM_PROVIDER');

// --- XỬ LÝ WEBHOOK ---

// 1. Lấy dữ liệu thô và chữ ký từ header
$payload = file_get_contents('php://input');
// Tên header có thể khác nhau tùy nhà cung cấp, VD: 'X-Webhook-Signature', 'X-Signature'.
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';

/*
// 2. **BẢO MẬT: Xác thực chữ ký**
// Đây là bước CỰC KỲ QUAN TRỌNG để đảm bảo request là hợp lệ.
// Phương thức tính toán tùy thuộc vào nhà cung cấp, thường là HMAC-SHA256.
$calculated_signature = hash_hmac('sha256', $payload, WEBHOOK_SECRET_KEY);

if (!hash_equals($calculated_signature, $signature)) {
    // Nếu chữ ký không khớp, đây là request giả mạo.
    http_response_code(401); // Unauthorized
    error_log('Webhook Error: Invalid signature.');
    exit('Invalid signature.');
}
// LƯU Ý: Khối code trên đang được comment để bạn có thể test.
// Khi triển khai thực tế, BẮT BUỘC phải mở ra và cấu hình đúng.
*/

// 3. Decode JSON payload
$data = json_decode($payload, true);

if (json_last_error() !== JSON_ERROR_NONE || !$data) {
    http_response_code(400); // Bad Request
    error_log('Webhook Error: Invalid JSON payload.');
    exit('Invalid JSON.');
}

// 4. Trích xuất thông tin cần thiết
// Tên các trường này phụ thuộc vào API của nhà cung cấp.
// Ta giả định 'addInfo' chứa mã đơn hàng và 'amount' chứa số tiền.
$order_code = $data['addInfo'] ?? null;
$amount_paid = $data['amount'] ?? 0;
$transaction_id = $data['transaction'] ?? 'N/A'; // Để ghi log

// Ghi log lại mọi request nhận được để debug
error_log("Webhook received for order code: $order_code, amount: $amount_paid, transaction: $transaction_id");

// 5. Validate dữ liệu
if (empty($order_code) || $amount_paid <= 0) {
    http_response_code(400);
    error_log("Webhook Error: Missing order_code or amount for transaction: $transaction_id");
    exit('Missing data.');
}

// 6. Tìm và xác thực đơn hàng trong CSDL
$stmt = $conn->prepare("SELECT id, user_id, shipping_fee, payment_status FROM orders WHERE order_code = ? LIMIT 1");
$stmt->bind_param("s", $order_code);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order) {
    http_response_code(404); // Not Found
    error_log("Webhook Error: Order code '$order_code' not found.");
    exit('Order not found.');
}

// 7. Kiểm tra logic nghiệp vụ
// Check 1: Đơn hàng đã được xử lý chưa? (Để tránh xử lý 1 giao dịch 2 lần)
if ($order['payment_status'] !== 'unpaid') {
    error_log("Webhook Info: Order '$order_code' is already processed (status: {$order['payment_status']}). Ignoring.");
    http_response_code(200); // Báo thành công để gateway không gửi lại
    exit('Order already processed.');
}

// Check 2: Số tiền nhận được có khớp với phí ship không?
if ((int) $amount_paid !== (int) $order['shipping_fee']) {
    http_response_code(400); // Bad Request
    error_log("Webhook Error: Amount mismatch for order '$order_code'. Expected: {$order['shipping_fee']}, Paid: {$amount_paid}.");
    // Ghi chú lại cho admin về việc thanh toán sai số tiền
    $note = "Webhook: Nhận được thanh toán sai lệch " . number_format($amount_paid) . "đ. Mong đợi " . number_format($order['shipping_fee']) . "đ. Mã GD: $transaction_id";
    $conn->query("UPDATE orders SET admin_note = CONCAT(IFNULL(admin_note, ''), '\n', '$note') WHERE id = {$order['id']}");
    exit('Amount mismatch.');
}

// 8. Mọi thứ hợp lệ, cập nhật đơn hàng
$conn->begin_transaction();
try {
    // Cập nhật trạng thái thanh toán
    $conn->query("UPDATE orders SET payment_status = 'paid' WHERE id = {$order['id']}");

    // Ghi log
    $conn->query("INSERT INTO order_logs (order_id, user_id, old_status, new_status) VALUES ({$order['id']}, NULL, 'Payment Unpaid', 'Payment Paid (Webhook)')");

    // Gửi thông báo cho khách hàng
    if ($order['user_id']) {
        $msg = "Thanh toán cho đơn hàng #{$order_code} đã được xác nhận thành công.";
        $link = "customer_order_detail.php?id={$order['id']}";
        $conn->query("INSERT INTO notifications (user_id, order_id, message, link) VALUES ({$order['user_id']}, {$order['id']}, '$msg', '$link')");
    }

    $conn->commit();
    error_log("Webhook Success: Order '$order_code' updated to 'paid'.");
} catch (mysqli_sql_exception $exception) {
    $conn->rollback();
    http_response_code(500);
    error_log("Webhook DB Error: " . $exception->getMessage());
    exit('Database transaction failed.');
}

// 9. Phản hồi thành công cho gateway
http_response_code(200);
echo "OK";

$conn->close();
?>
