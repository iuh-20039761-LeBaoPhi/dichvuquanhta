<?php
session_start();
// 1. Kết nối database
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json; charset=UTF-8');


// 2. Nhận dữ liệu từ form
$name = $_POST['name'] ?? '';
$phone = $_POST['phone'] ?? '';
$receiver_name = $_POST['receiver_name'] ?? '';
$receiver_phone = $_POST['receiver_phone'] ?? '';
$pickup = $_POST['pickup'] ?? '';
$delivery = $_POST['delivery'] ?? '';
$package_type = $_POST['package_type'] ?? '';
$service_type = $_POST['service_type'] ?? 'standard'; // Nhận loại dịch vụ
$weight = $_POST['weight'] ?? 0;
$cod_amount = $_POST['cod_amount'] ?? 0;
$shipping_fee = $_POST['shipping_fee'] ?? 0; // Nhận phí ship
$pickup_time = $_POST['pickup_time'] ?? '';
$payment_method = $_POST['payment_method'] ?? 'cod';
$note = $_POST['note'] ?? '';

// Đồng bộ giá trị từ nhiều form frontend cũ/mới
if ($payment_method === 'bank') {
    $payment_method = 'bank_transfer';
}
$is_moving = strpos($service_type, 'moving_') === 0;
$is_international = strpos($service_type, 'intl_') === 0;

// Dịch vụ chuyển dọn chỉ cần 1 đầu mối liên hệ
if ($is_moving) {
    if (empty(trim($receiver_name))) {
        $receiver_name = $name;
    }
    if (empty(trim($receiver_phone))) {
        $receiver_phone = $phone;
    }
    if (empty(trim($package_type))) {
        $package_type = 'other';
    }
    if ($weight === '' || !is_numeric($weight)) {
        $weight = 0;
    }
    $cod_amount = 0;
}
if ($is_international) {
    $cod_amount = 0;
}

// Thêm: Nhận dữ liệu hóa đơn công ty
$is_corporate = isset($_POST['is_corporate']) ? 1 : 0;
$company_name = $is_corporate ? trim($_POST['company_name'] ?? '') : null;
$company_email = $is_corporate ? trim($_POST['company_email'] ?? '') : null;
$company_tax_code = $is_corporate ? trim($_POST['company_tax_code'] ?? '') : null;
$company_address = $is_corporate ? trim($_POST['company_address'] ?? '') : null;
$company_bank_info = $is_corporate ? trim($_POST['company_bank_info'] ?? '') : null;

$errors = [];

// Kiểm tra rỗng
if (empty($name))
    $errors[] = "Chưa nhập họ tên";
if (empty($phone))
    $errors[] = "Chưa nhập số điện thoại";
if (!$is_moving && empty($receiver_name))
    $errors[] = "Chưa nhập tên người nhận";
if (!$is_moving && empty($receiver_phone))
    $errors[] = "Chưa nhập SĐT người nhận";
if (empty($pickup))
    $errors[] = "Chưa nhập địa chỉ lấy hàng";
elseif (strlen($pickup) < 10)
    $errors[] = "Địa chỉ lấy hàng quá ngắn (tối thiểu 10 ký tự)";
elseif (!preg_match('/(quận|huyện|tp|thành phố|phường|xã|q\.|p\.|q\d)/iu', $pickup))
    $errors[] = "Địa chỉ lấy hàng thiếu Quận/Huyện (VD: Quận 1)";

if (empty($delivery))
    $errors[] = "Chưa nhập địa chỉ giao hàng";
elseif (strlen($delivery) < 10)
    $errors[] = "Địa chỉ giao hàng quá ngắn (tối thiểu 10 ký tự)";
elseif (!$is_international && !preg_match('/(quận|huyện|tp|thành phố|phường|xã|q\.|p\.|q\d)/iu', $delivery))
    $errors[] = "Địa chỉ giao hàng thiếu Quận/Huyện (VD: Quận 1)";

if ($is_international) {
    $intl_country = trim($_POST['intl_country'] ?? '');
    if (empty($intl_country))
        $errors[] = "Vui lòng chọn quốc gia nhận cho đơn quốc tế";
}

// Kiểm tra số điện thoại hợp lệ
if (!preg_match('/^0[0-9]{9,10}$/', $phone))
    $errors[] = "Số điện thoại không hợp lệ (phải bắt đầu bằng 0)";
if (!$is_moving && !preg_match('/^0[0-9]{9,10}$/', $receiver_phone))
    $errors[] = "SĐT người nhận không hợp lệ";

// Kiểm tra weight >=0
if (!is_numeric($weight) || $weight < 0)
    $errors[] = "Khối lượng phải >= 0";

// Kiểm tra COD >= 0
if (!empty($cod_amount) && (!is_numeric($cod_amount) || $cod_amount < 0))
    $errors[] = "Tiền thu hộ phải >= 0";

// Kiểm tra thời gian lấy hàng (nếu có nhập thì không được là quá khứ quá xa - tuỳ logic)
// Ở đây chỉ kiểm tra định dạng cơ bản để tránh SQL injection lạ, dù bind_param đã lo rồi.
// Ví dụ đơn giản: nếu nhập thì phải có độ dài hợp lý
if (!empty($pickup_time) && strlen($pickup_time) > 50)
    $errors[] = "Thời gian lấy hàng không hợp lệ";

// Kiểm tra package_type hợp lệ
$valid_types = ['document', 'food', 'clothes', 'electronic', 'other'];
if (!$is_moving && !in_array($package_type, $valid_types))
    $errors[] = "Loại hàng không hợp lệ";

// Nếu là chuyển khoản, tiền thu hộ phải bằng 0
if ($payment_method === 'bank_transfer' || $is_moving || $is_international) {
    $cod_amount = 0;
}

// Nếu yêu cầu xuất hóa đơn, các trường công ty là bắt buộc
if ($is_corporate) {
    if (empty($company_name))
        $errors[] = "Chưa nhập Tên công ty";
    if (empty($company_email) || !filter_var($company_email, FILTER_VALIDATE_EMAIL))
        $errors[] = "Email nhận hóa đơn không hợp lệ";
    if (empty($company_tax_code))
        $errors[] = "Chưa nhập Mã số thuế";
    if (empty($company_address))
        $errors[] = "Chưa nhập Địa chỉ công ty";
}

if (count($errors) > 0) {
    echo json_encode(['status' => 'error', 'message' => implode('<br>', $errors)]);
    exit; // dừng submit nếu có lỗi
}

// BẮT BUỘC ĐĂNG NHẬP: Kiểm tra session user_id
if (empty($_SESSION['user_id'])) {
    // Trả về lỗi nếu chưa đăng nhập (Backend enforcement)
    echo json_encode([
        'status' => 'auth_required',
        'message' => 'Vui lòng đăng nhập để thực hiện đặt hàng.'
    ]);
    exit;
}
$user_id = $_SESSION['user_id'];

// Tạo mã đơn hàng (Ví dụ: FAST-A1B2C3)
$order_code = 'FAST-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));

// 3. Chèn vào database
// Sử dụng prepared statements để chống SQL Injection
$stmt = $conn->prepare("INSERT INTO `orders`
(order_code, name, phone, receiver_name, receiver_phone, pickup_address, delivery_address, package_type, service_type, weight, cod_amount, shipping_fee, pickup_time, note, user_id, payment_method, payment_status, is_corporate, company_name, company_email, company_tax_code, company_address, company_bank_info)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

if (!$stmt) {
    error_log("Order Prepare Failed: " . $conn->error);
    echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống: ' . $conn->error]);
    exit;
}

$payment_status = 'unpaid'; // Trạng thái ban đầu
$stmt->bind_param("sssssssssdddssississsss", $order_code, $name, $phone, $receiver_name, $receiver_phone, $pickup, $delivery, $package_type, $service_type, $weight, $cod_amount, $shipping_fee, $pickup_time, $note, $user_id, $payment_method, $payment_status, $is_corporate, $company_name, $company_email, $company_tax_code, $company_address, $company_bank_info);

if ($stmt->execute()) {
    // --- TÍNH NĂNG MỚI: Cập nhật thông tin công ty vào bảng users để ghi nhớ ---
    if ($is_corporate && $user_id) {
        $stmt_user = $conn->prepare("UPDATE users SET company_name = ?, tax_code = ?, company_address = ? WHERE id = ?");
        $stmt_user->bind_param("sssi", $company_name, $company_tax_code, $company_address, $user_id);
        $stmt_user->execute();
        $stmt_user->close();
    }

    // --- CẢI THIỆN: Lấy thông tin ngân hàng từ CSDL thay vì hardcode ---
    $bank_settings = [];
    $settings_res = $conn->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('bank_id', 'bank_account_no', 'bank_account_name', 'qr_template')");
    if ($settings_res) {
        while ($row = $settings_res->fetch_assoc()) {
            $bank_settings[$row['setting_key']] = $row['setting_value'];
        }
    }

    // Trả về JSON thay vì text thuần để Frontend xử lý hiển thị QR
    echo json_encode([
        'status' => 'success',
        'order_code' => $order_code,
        'payment_method' => $payment_method,
        'amount' => $shipping_fee, // Số tiền cần thanh toán (Phí ship)
        'bank_info' => [ // Dữ liệu động từ DB
            'bank_id' => $bank_settings['bank_id'] ?? 'MB',
            'account_no' => $bank_settings['bank_account_no'] ?? '0333666999',
            'account_name' => $bank_settings['bank_account_name'] ?? 'FASTGO LOGISTICS',
            'template' => $bank_settings['qr_template'] ?? 'compact'
        ]
    ]);
} else {
    error_log("Order Execute Failed: " . $stmt->error);
    echo json_encode(['status' => 'error', 'message' => 'Có lỗi xảy ra khi lưu đơn hàng.']);
}

// 4. Đóng kết nối

$stmt->close();
$conn->close();
?>
