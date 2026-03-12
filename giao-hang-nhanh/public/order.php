<?php
session_start();
// 1. Kết nối database
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json; charset=UTF-8');

function parse_money_value($value): int
{
    $digits = preg_replace('/[^\d]/', '', (string) $value);
    if ($digits === null || $digits === '') {
        return 0;
    }
    return (int) $digits;
}

function sanitize_filename($name): string
{
    $base = basename((string) $name);
    $clean = preg_replace('/[^A-Za-z0-9._-]/', '_', $base);
    return $clean !== '' ? $clean : 'file';
}

function save_upload_group(string $field, string $target_dir): array
{
    if (!isset($_FILES[$field])) {
        return [];
    }
    $files = $_FILES[$field];
    $names = $files['name'] ?? [];
    $tmp_names = $files['tmp_name'] ?? [];
    $errors = $files['error'] ?? [];
    if (!is_array($names)) {
        $names = [$names];
        $tmp_names = [$tmp_names];
        $errors = [$errors];
    }

    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0775, true);
    }

    $saved = [];
    foreach ($names as $i => $original) {
        if (($errors[$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }
        $tmp = $tmp_names[$i] ?? '';
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            continue;
        }
        $safe = sanitize_filename($original);
        $ext = strtolower(pathinfo($safe, PATHINFO_EXTENSION));
        if ($ext !== '' && !in_array($ext, $allowed_exts, true)) {
            continue;
        }
        $final_name = $safe;
        $counter = 1;
        while (file_exists($target_dir . DIRECTORY_SEPARATOR . $final_name)) {
            $final_name = pathinfo($safe, PATHINFO_FILENAME) . '_' . $counter . ($ext ? '.' . $ext : '');
            $counter++;
        }
        $dest = $target_dir . DIRECTORY_SEPARATOR . $final_name;
        if (move_uploaded_file($tmp, $dest)) {
            $saved[] = $final_name;
        }
    }

    return $saved;
}

// 2. Nhận dữ liệu từ form
$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$receiver_name = $_POST['receiver_name'] ?? '';
$receiver_phone = $_POST['receiver_phone'] ?? '';
$pickup = $_POST['pickup'] ?? '';
$delivery = $_POST['delivery'] ?? '';
$goods_item_types = $_POST['goods_item_type'] ?? [];
$goods_item_names = $_POST['goods_item_name'] ?? [];
$goods_item_weights = $_POST['goods_item_weight'] ?? [];
$goods_item_quantities = $_POST['goods_item_quantity'] ?? [];
$goods_item_declareds = $_POST['goods_item_declared'] ?? [];
$service_type = $_POST['service_type'] ?? '';
$route_type = $_POST['route_type'] ?? 'domestic';
$pickup_city = $_POST['pickup_city'] ?? '';
$delivery_city = $_POST['delivery_city'] ?? '';
$intl_country = $_POST['intl_country'] ?? '';
$weight = $_POST['weight'] ?? 0;
$cod_amount = parse_money_value($_POST['cod_amount'] ?? 0);
$insurance_value = parse_money_value($_POST['insurance_value'] ?? 0);
$receiver_id_type = trim($_POST['receiver_id_type'] ?? '');
$receiver_id_number = trim($_POST['receiver_id_number'] ?? '');
$intl_postal_code = trim($_POST['intl_postal_code'] ?? '');
$intl_hs_code = trim($_POST['intl_hs_code'] ?? '');
$intl_purpose = trim($_POST['intl_purpose'] ?? '');
$fee_payer = trim($_POST['fee_payer'] ?? 'sender');
$shipping_fee = $_POST['shipping_fee'] ?? 0;
$pickup_time = $_POST['pickup_time'] ?? '';
$delivery_time = $_POST['delivery_time'] ?? '';
$payment_method = $_POST['payment_method'] ?? 'cod';
$note = $_POST['note'] ?? '';

// Đồng bộ giá trị từ nhiều form frontend cũ/mới
if ($payment_method === 'bank') {
    $payment_method = 'bank_transfer';
}
$is_international = strpos($service_type, 'intl_') === 0;

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
if (empty(trim((string) $service_type)))
    $errors[] = "Chưa chọn gói dịch vụ";

$has_items = false;
if (is_array($goods_item_names)) {
    foreach ($goods_item_names as $itemName) {
        if (!empty(trim($itemName))) {
            $has_items = true;
            break;
        }
    }
}
if (!$has_items) $errors[] = "Vui lòng thêm ít nhất một hàng hóa vào đơn hàng.";
if (empty($receiver_name))
    $errors[] = "Chưa nhập tên người nhận";
if (empty($receiver_phone))
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
    if (empty($intl_country))
        $errors[] = "Vui lòng chọn quốc gia nhận cho đơn quốc tế";
    if ($receiver_id_type === '' || $receiver_id_number === '')
        $errors[] = "Vui lòng nhập đầy đủ giấy tờ người nhận (CCCD/Hộ chiếu)";
    if ($intl_purpose === '')
        $errors[] = "Vui lòng chọn mục đích gửi hàng quốc tế";
}

// Kiểm tra số điện thoại hợp lệ
if (!preg_match('/^0[0-9]{9,10}$/', $phone))
    $errors[] = "Số điện thoại không hợp lệ (phải bắt đầu bằng 0)";
if (!preg_match('/^0[0-9]{9,10}$/', $receiver_phone))
    $errors[] = "SĐT người nhận không hợp lệ";

// Kiểm tra weight >=0
if (!is_numeric($weight) || $weight < 0)
    $errors[] = "Khối lượng phải >= 0";

// Kiểm tra COD >= 0
if (!empty($cod_amount) && (!is_numeric($cod_amount) || $cod_amount < 0))
    $errors[] = "Tiền thu hộ phải >= 0";
if (!in_array($fee_payer, ['sender', 'receiver'], true))
    $errors[] = "Người trả cước không hợp lệ";

// Nếu là chuyển khoản, tiền thu hộ phải bằng 0
if ($payment_method === 'bank_transfer' || $is_international) {
    $cod_amount = 0;
}

$note_extras = [];
if (true) { // Always include fee payer info for regular delivery
    $fee_payer_label = ($fee_payer === 'receiver') ? 'Người nhận' : 'Người gửi'; // Giữ nguyên logic này
    $note_extras[] = "Người trả cước: " . $fee_payer_label;
}
if ($is_international) {
    if ($receiver_id_type !== '' && $receiver_id_number !== '') {
        $receiver_id_label = ($receiver_id_type === 'passport') ? 'Hộ chiếu' : 'CCCD';
        $note_extras[] = "Giấy tờ người nhận: " . $receiver_id_label . " - " . preg_replace('/\s+/', ' ', $receiver_id_number);
    }
    if ($intl_postal_code !== '') {
        $note_extras[] = "Mã bưu chính: " . preg_replace('/\s+/', ' ', $intl_postal_code);
    }
    if ($intl_hs_code !== '') {
        $note_extras[] = "Mã HS: " . preg_replace('/\s+/', ' ', $intl_hs_code);
    }
    if ($intl_purpose !== '') {
        $purpose_map = [
            'gift' => 'Quà tặng cá nhân',
            'sample' => 'Hàng mẫu',
            'document' => 'Tài liệu/giấy tờ',
            'sale' => 'Hàng thương mại',
            'return' => 'Hàng gửi trả/bảo hành',
            'other' => 'Khác'
        ];
        $note_extras[] = "Mục đích gửi: " . ($purpose_map[$intl_purpose] ?? $intl_purpose);
    }
}
if (!empty($note_extras)) {
    $note = trim((string) $note);
    $extras_text = implode("\n", $note_extras);
    $note = $note === '' ? $extras_text : ($note . "\n" . $extras_text);
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

// Lưu file đính kèm (nếu có) và ghi chú vào đơn
$attachment_notes = [];
$upload_base = __DIR__ . '/../public/uploads/order_attachments/' . $order_code;
$goods_images = save_upload_group('goods_images', $upload_base);
if (!empty($goods_images)) {
    $attachment_notes[] = "Ảnh hàng hóa: " . implode(', ', $goods_images);
}
$intl_documents = save_upload_group('intl_documents', $upload_base);
if (!empty($intl_documents)) {
    $attachment_notes[] = "Hồ sơ/chứng từ: " . implode(', ', $intl_documents);
}
if (!empty($attachment_notes)) {
    $note = trim((string) $note);
    $attachments_text = implode("\n", $attachment_notes);
    $note = $note === '' ? $attachments_text : ($note . "\n" . $attachments_text);
}

// 3. Chèn vào database (Sử dụng Transaction)
$conn->begin_transaction();

try {
    // 3.1. Chèn vào bảng `orders`
    $stmt = $conn->prepare("INSERT INTO `orders`
    (order_code, user_id, route_type, name, phone, pickup_address, pickup_city, receiver_name, receiver_phone, receiver_id_number, delivery_address, delivery_city, intl_country, service_type, pickup_time, weight, shipping_fee, cod_amount, insurance_value, fee_payer, payment_method, payment_status, status, note, is_corporate, company_name, company_email, company_tax_code, company_address, company_bank_info, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");

    if (!$stmt) {
        throw new Exception("Order Prepare Failed: " . $conn->error);
    }

    $status = 'pending';
    $payment_status = 'unpaid';

    $stmt->bind_param(
        "sisssssssssssssddddsssssissssss",
        $order_code, $user_id, $route_type, $name, $phone,
        $pickup, $pickup_city, $receiver_name, $receiver_phone, $receiver_id_number,
        $delivery, $delivery_city, $intl_country, $service_type, $pickup_time,
        $weight, $shipping_fee, $cod_amount, $insurance_value, $fee_payer,
        $payment_method, $payment_status, $status, $note,
        $is_corporate, $company_name, $company_email, $company_tax_code, $company_address, $company_bank_info
    );

    if (!$stmt->execute()) {
        throw new Exception("Order Execute Failed: " . $stmt->error);
    }

    $order_id = $conn->insert_id;
    $stmt->close();

    // 3.2. Chèn vào bảng `order_items`
    $stmt_item = $conn->prepare("INSERT INTO order_items (order_id, item_name, quantity, unit_weight, declared_value, item_type) VALUES (?, ?, ?, ?, ?, ?)");

    if ($stmt_item && is_array($goods_item_names)) {
        for ($i = 0; $i < count($goods_item_names); $i++) {
            $itm_name = trim($goods_item_names[$i]);
            if (empty($itm_name)) continue;

            $itm_qty = intval($goods_item_quantities[$i] ?? 1);
            $itm_weight = floatval($goods_item_weights[$i] ?? 0);
            $itm_val = parse_money_value($goods_item_declareds[$i] ?? 0);
            $itm_type = trim($goods_item_types[$i] ?? 'goods');

            $stmt_item->bind_param("isidds", $order_id, $itm_name, $itm_qty, $itm_weight, $itm_val, $itm_type);
            if (!$stmt_item->execute()) {
                throw new Exception("Item Insert Failed: " . $stmt_item->error);
            }
        }
        $stmt_item->close();
    }

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
            'account_name' => $bank_settings['bank_account_name'] ?? 'GIAO HÀNG NHANH',
            'template' => $bank_settings['qr_template'] ?? 'compact'
        ]
    ]);

    $conn->commit();

} catch (Exception $e) {
    $conn->rollback();
    error_log($e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Có lỗi xảy ra khi lưu đơn hàng: ' . $e->getMessage()]);
    exit;
}

$conn->close();
?>