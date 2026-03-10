<?php
session_start();
// Chỉ cho phép 'customer' truy cập
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'customer') {
    // Nếu chưa đăng nhập, chuyển đến trang login và đính kèm trang này làm redirect
    header("Location: login.php?redirect=" . urlencode('create_order.php'));
    exit;
}

require_once __DIR__ . '/../config/db.php';
$current_page = 'create_order.php';

// ===== XỬ LÝ SUBMIT FORM =====
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // tạo mã đơn tạm
    $order_code = 'ORD' . time();

    // thư mục upload
    $upload_dir = __DIR__ . "/../public/uploads/order_attachments/" . $order_code . "/";

    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $uploaded_files = [];

    // upload ảnh hàng hóa
    if (!empty($_FILES['goods_images']['name'][0])) {
        foreach ($_FILES['goods_images']['tmp_name'] as $key => $tmp_name) {

            $filename = basename($_FILES['goods_images']['name'][$key]);
            $target = $upload_dir . $filename;

            if (move_uploaded_file($tmp_name, $target)) {
                $uploaded_files[] = $filename;
            }
        }
    }

    // upload chứng từ
    if (!empty($_FILES['intl_documents']['name'][0])) {
        foreach ($_FILES['intl_documents']['tmp_name'] as $key => $tmp_name) {

            $filename = basename($_FILES['intl_documents']['name'][$key]);
            $target = $upload_dir . $filename;

            if (move_uploaded_file($tmp_name, $target)) {
                $uploaded_files[] = $filename;
            }
        }
    }

    // lấy ghi chú
    $note = $_POST['note'] ?? '';

    // đính tên file vào ghi chú
    if (!empty($uploaded_files)) {
        $note .= "\nTệp đính kèm: " . implode(', ', $uploaded_files);
    }

}

// Lấy thông tin user để auto-fill
$user_info = ['fullname' => '', 'phone' => '', 'email' => '', 'company_name' => '', 'tax_code' => '', 'company_address' => ''];
$stmt = $conn->prepare("SELECT fullname, phone, email, company_name, tax_code, company_address FROM users WHERE id = ?");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows > 0) {
    $user_info = $res->fetch_assoc();
}
$stmt->close();

// Lấy danh sách địa chỉ đã lưu (MỚI)
$saved_addresses = [];
$addr_res = $conn->query("SELECT * FROM saved_addresses WHERE user_id = " . $_SESSION['user_id']);
if ($addr_res) {
    while ($r = $addr_res->fetch_assoc()) {
        $saved_addresses[] = $r;
    }
}

// Lấy danh sách dịch vụ từ DB
$services_list = [];
$svc_res = $conn->query("SELECT * FROM services ORDER BY base_price ASC");
if ($svc_res) {
    while ($r = $svc_res->fetch_assoc()) {
        $services_list[] = $r;
    }
}

// Lấy cấu hình giá
$pricing_config = ['weight_free' => 2, 'weight_price' => 5000, 'cod_min' => 5000];

// --- XỬ LÝ RE-ORDER (Đặt lại đơn hàng cũ) ---
$reorder_data = [
    'receiver_name' => '',
    'receiver_phone' => '',
    'pickup_address' => '',
    'delivery_address' => '',
    'service_type' => '',
    'package_type' => 'document', // Mặc định
    'weight' => 1,
    'cod_amount' => 0,
    'note' => ''
];

if (isset($_GET['reorder_id'])) {
    $reorder_id = intval($_GET['reorder_id']);
    // Chỉ lấy đơn hàng CỦA CHÍNH USER đó (bảo mật)
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $reorder_id, $_SESSION['user_id']);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows > 0) {
        $old_order = $res->fetch_assoc();
        $reorder_data['receiver_name'] = $old_order['receiver_name'];
        $reorder_data['receiver_phone'] = $old_order['receiver_phone'];
        $reorder_data['pickup_address'] = $old_order['pickup_address'];
        $reorder_data['delivery_address'] = $old_order['delivery_address'];
        $reorder_data['service_type'] = $old_order['service_type'];

        // Kiểm tra nếu cột package_type tồn tại trong kết quả trả về, nếu không dùng mặc định
        $reorder_data['package_type'] = isset($old_order['package_type']) ? $old_order['package_type'] : 'document';

        $reorder_data['note'] = $old_order['note'];
        $reorder_data['cod_amount'] = $old_order['cod_amount'];
        $reorder_data['weight'] = isset($old_order['weight']) ? $old_order['weight'] : 1;
    }
    $stmt->close();
}

$service_name_map = [
    'slow' => 'Giao chậm',
    'standard' => 'Giao tiêu chuẩn',
    'fast' => 'Giao nhanh',
    'express' => 'Giao hỏa tốc',
    'bulk' => 'Giao hàng số lượng lớn',
    'intl_economy' => 'Tiêu chuẩn quốc tế',
    'intl_express' => 'Chuyển phát nhanh quốc tế'
];
foreach ($services_list as $svc) {
    $key = strtolower(trim((string) ($svc['type_key'] ?? '')));
    $name = trim((string) ($svc['name'] ?? ''));
    if ($key !== '' && $name !== '') {
        $service_name_map[$key] = $name;
    }
}

$service_options = [
    ['key' => 'slow', 'route' => 'domestic'],
    ['key' => 'standard', 'route' => 'domestic'],
    ['key' => 'fast', 'route' => 'domestic'],
    ['key' => 'express', 'route' => 'domestic'],
    ['key' => 'bulk', 'route' => 'domestic'],
    ['key' => 'intl_economy', 'route' => 'international'],
    ['key' => 'intl_express', 'route' => 'international']
];

$known_keys = array_column($service_options, 'key');
foreach ($services_list as $svc) {
    $key = strtolower(trim((string) ($svc['type_key'] ?? '')));
    if ($key === '' || strpos($key, 'moving_') === 0 || in_array($key, $known_keys, true)) {
        continue;
    }
    $service_options[] = [
        'key' => $key,
        'route' => (strpos($key, 'intl_') === 0) ? 'international' : 'domestic'
    ];
    $known_keys[] = $key;
}

$service_base_price_map = [];
foreach ($services_list as $svc) {
    $key = strtolower(trim((string) ($svc['type_key'] ?? '')));
    if ($key === '') {
        continue;
    }
    $service_base_price_map[$key] = (float) ($svc['base_price'] ?? 0);
}

$services_js_payload = [];
foreach ($service_options as $service_option) {
    $service_key = strtolower(trim((string) ($service_option['key'] ?? '')));
    if ($service_key === '' || !isset($service_name_map[$service_key])) {
        continue;
    }
    $services_js_payload[] = [
        'id' => $service_key,
        'name' => $service_name_map[$service_key],
        'type_key' => $service_key,
        'base_price' => $service_base_price_map[$service_key] ?? 0
    ];
}

$selected_service_type = trim((string) $reorder_data['service_type']);
if ($selected_service_type === '') {
    $selected_service_type = 'standard';
}
if (!isset($service_name_map[$selected_service_type])) {
    $selected_service_type = 'standard';
}
$reorder_data['service_type'] = $selected_service_type;
$default_route_type = (strpos($selected_service_type, 'intl_') === 0) ? 'international' : 'domestic';

?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Tạo đơn hàng mới | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_user.php'; ?>

    <main class="container create-order-page">
        <div class="create-order-head">
            <h2 class="section-title">Tạo đơn hàng mới</h2>
            <a href="dashboard.php" class="dashboard-btn-outline">← Quay lại Dashboard</a>
        </div>

        <form id="create-order-form" class="order-form-container" method="POST" enctype="multipart/form-data">
            <div class="form-section">
                <h3>Chọn tuyến vận chuyển</h3>
                <div class="quote-mode-switch order-route-switch" role="tablist" aria-label="Chọn tuyến đơn hàng">
                    <button type="button"
                        class="quote-mode-btn <?php echo ($default_route_type === 'domestic') ? 'active' : ''; ?>"
                        data-order-route="domestic"
                        aria-selected="<?php echo ($default_route_type === 'domestic') ? 'true' : 'false'; ?>">
                        Tạo đơn trong nước
                    </button>
                    <button type="button"
                        class="quote-mode-btn <?php echo ($default_route_type === 'international') ? 'active' : ''; ?>"
                        data-order-route="international"
                        aria-selected="<?php echo ($default_route_type === 'international') ? 'true' : 'false'; ?>">
                        Tạo đơn quốc tế
                    </button>
                </div>
                <input type="hidden" name="route_type" id="order-route-type"
                    value="<?php echo htmlspecialchars($default_route_type); ?>">
                <p class="order-route-hint">Bạn có thể chuyển tuyến bất kỳ lúc nào, hệ thống sẽ tự điều chỉnh trường bắt
                    buộc.</p>
            </div>

            <div class="order-section-row order-section-row-top">
                <div class="form-section">
                    <h3>1. Thông tin người gửi</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="name">Họ và tên</label>
                            <input type="text" id="name" name="name"
                                value="<?php echo htmlspecialchars($user_info['fullname']); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Số điện thoại</label>
                            <input type="tel" id="phone" name="phone"
                                value="<?php echo htmlspecialchars($user_info['phone']); ?>" pattern="0[0-9]{9,10}"
                                title="Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số" required>
                        </div>

                        <div class="form-group form-group-span-2">
                            <div class="form-group-head">
                                <label for="pickup-addr">Địa chỉ lấy hàng</label>
                                <?php if (!empty($saved_addresses)): ?>
                                    <a href="#" onclick="openAddrModal('pickup'); return false;"
                                        class="address-picker-link">📍
                                        Chọn từ sổ địa chỉ</a>
                                <?php endif; ?>
                            </div>
                            <input type="text" id="pickup-addr" name="pickup"
                                value="<?php echo htmlspecialchars($reorder_data['pickup_address']); ?>"
                                placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..." required>
                        </div>

                        <div class="form-group" id="pickup-domestic-city-group">
                            <label for="pickup-city">Tỉnh/Thành phố gửi</label>
                            <select id="pickup-city" name="pickup_city">
                                <option value="">Chọn tỉnh/thành phố gửi</option>
                            </select>
                        </div>
                        <div class="form-group" id="pickup-domestic-district-group">
                            <label for="pickup-district">Quận/Huyện gửi</label>
                            <select id="pickup-district" name="pickup_district">
                                <option value="">Chọn quận/huyện gửi</option>
                            </select>
                        </div>

                    </div>
                </div>

                <div class="form-section">
                    <h3>2. Thông tin người nhận</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="receiver_name">Họ và tên người nhận</label>
                            <input type="text" id="receiver_name" name="receiver_name"
                                value="<?php echo htmlspecialchars($reorder_data['receiver_name']); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="receiver_phone">Số điện thoại người nhận</label>
                            <input type="tel" id="receiver_phone" name="receiver_phone"
                                value="<?php echo htmlspecialchars($reorder_data['receiver_phone']); ?>"
                                pattern="0[0-9]{9,10}" title="Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số"
                                required>
                        </div>

                        <div class="form-group form-group-span-2">
                            <div class="form-group-head">
                                <label for="delivery-addr">Địa chỉ giao hàng</label>
                                <?php if (!empty($saved_addresses)): ?>
                                    <a href="#" onclick="openAddrModal('delivery'); return false;"
                                        class="address-picker-link">📍 Chọn từ sổ địa chỉ</a>
                                <?php endif; ?>
                            </div>
                            <input type="text" id="delivery-addr" name="delivery"
                                value="<?php echo htmlspecialchars($reorder_data['delivery_address']); ?>"
                                placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..." required>
                        </div>

                        <div class="form-group" id="delivery-domestic-city-group">
                            <label for="delivery-city">Tỉnh/Thành phố nhận</label>
                            <select id="delivery-city" name="delivery_city">
                                <option value="">Chọn tỉnh/thành phố nhận</option>
                            </select>
                        </div>
                        <div class="form-group" id="delivery-domestic-district-group">
                            <label for="delivery-district">Quận/Huyện nhận</label>
                            <select id="delivery-district" name="delivery_district">
                                <option value="">Chọn quận/huyện nhận</option>
                            </select>
                        </div>

                        <div class="form-group order-hidden" id="delivery-intl-country-group">
                            <label for="delivery-intl-country">Quốc gia nhận</label>
                            <select id="delivery-intl-country" name="intl_country">
                                <option value="">Chọn quốc gia nhận</option>
                            </select>
                        </div>
                        <div class="form-group order-hidden" id="delivery-intl-province-group">
                            <label for="delivery-intl-province">Tỉnh/Thành phố nhận (quốc tế)</label>
                            <select id="delivery-intl-province" name="intl_province" disabled>
                                <option value="">Chọn tỉnh/thành phố nhận</option>
                            </select>
                        </div>
                        <div class="form-group order-hidden" id="intl-postal-code-group">
                            <label for="intl-postal-code">Mã bưu chính</label>
                            <input type="text" id="intl-postal-code" name="intl_postal_code" placeholder="VD: 100-0001">
                        </div>
                        <div class="form-group order-hidden" id="receiver-id-number-group">
                            <label for="receiver-id-number">Số CCCD/Hộ chiếu</label>
                            <input type="text" id="receiver-id-number" name="receiver_id_number"
                                placeholder="Nhập số giấy tờ">
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h3>3. Thông tin gói hàng</h3>
                <div class="form-grid">
                    <div class="form-group form-group-span-2" id="goods-list-group">
                        <label>Hàng hóa</label>
                        <div id="goods-items-wrapper" class="goods-items-wrapper goods-items-detailed">
                            <div class="goods-item-row goods-item-detailed-row">
                                <div class="goods-item-fields">
                                    <div class="goods-item-field">
                                        <label>Loại hàng</label>
                                        <select name="goods_item_type[]" class="goods-item-type-select">
                                            <option value="">Chọn loại hàng</option>
                                            <option value="thuong">Hàng thông thường</option>
                                            <option value="gia-tri-cao">Hàng giá trị cao</option>
                                            <option value="de-vo">Hàng dễ vỡ</option>
                                            <option value="chat-long">Hàng chất lỏng/Hóa phẩm</option>
                                            <option value="pin-lithium">Hàng điện tử có pin</option>
                                            <option value="dong-lanh">Hàng đông lạnh/Thực phẩm tươi</option>
                                            <option value="cong-kenh">Hàng cồng kềnh/Quá khổ</option>
                                        </select>
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Tên hàng</label>
                                        <select name="goods_item_name[]" class="goods-item-name-select" disabled>
                                            <option value="">Chọn loại hàng trước</option>
                                        </select>
                                        <input type="text" name="goods_item_name[]" class="goods-item-name-input"
                                            placeholder="VD: Jean pants, books, phone" disabled style="display: none;">
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Khối lượng (kg)</label>
                                        <input type="number" name="goods_item_weight[]" class="goods-item-weight-input"
                                            min="0" step="0.1" placeholder="0.5">
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Số lượng kiện</label>
                                        <input type="number" name="goods_item_quantity[]"
                                            class="goods-item-quantity-input" min="1" step="1" value="1">
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Dài (cm)</label>
                                        <input type="number" name="goods_item_length[]" class="goods-item-length-input"
                                            min="0" step="1" placeholder="30">
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Rộng (cm)</label>
                                        <input type="number" name="goods_item_width[]" class="goods-item-width-input"
                                            min="0" step="1" placeholder="20">
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Cao (cm)</label>
                                        <input type="number" name="goods_item_height[]" class="goods-item-height-input"
                                            min="0" step="1" placeholder="15">
                                    </div>
                                    <div class="goods-item-field">
                                        <label>Khai giá (VNĐ)</label>
                                        <input type="text" name="goods_item_declared[]"
                                            class="goods-item-declared-input" inputmode="numeric" autocomplete="off"
                                            value="0" placeholder="0">
                                    </div>
                                </div>
                                <button type="button" class="goods-item-remove" aria-label="Xóa hàng hóa">Xóa</button>
                            </div>
                        </div>
                        <button type="button" id="add-goods-item" class="btn-secondary goods-item-add-btn">+ Thêm
                            hàng hóa</button>
                        <input type="hidden" id="item_type" name="item_type" value="">
                        <input type="hidden" id="item_name" name="item_name" value="">
                        <input type="hidden" id="weight" name="weight" value="0">
                        <input type="hidden" id="quantity" name="quantity" value="1">
                        <input type="hidden" id="length" name="length" value="0">
                        <input type="hidden" id="width" name="width" value="0">
                        <input type="hidden" id="height" name="height" value="0">
                        <input type="hidden" id="insurance_value" name="insurance_value" value="0">
                        <input type="hidden" id="goods_description" name="goods_description" value="">
                        <input type="hidden" id="package_type" name="package_type"
                            value="<?php echo htmlspecialchars($reorder_data['package_type'] ?: 'other'); ?>">
                    </div>
                    <div class="form-group order-hidden" id="intl-purpose-group">
                        <label for="intl-purpose">Mục đích gửi hàng</label>
                        <select id="intl-purpose" name="intl_purpose">
                            <option value="">Chọn mục đích</option>
                            <option value="gift">Quà tặng cá nhân</option>
                            <option value="sample">Hàng mẫu</option>
                            <option value="document">Tài liệu/giấy tờ</option>
                            <option value="sale">Hàng thương mại</option>
                            <option value="return">Hàng gửi trả/bảo hành</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>
                    <div class="form-group order-hidden" id="intl-hs-code-group">
                        <label for="intl-hs-code">Mã HS (nếu có)</label>
                        <input type="text" id="intl-hs-code" name="intl_hs_code" placeholder="VD: 8517.12">
                    </div>
                    <div class="form-group form-group-span-2 order-hidden" id="intl-goods-images-group">
                        <label for="intl-goods-images">Ảnh hàng hóa (nếu có)</label>
                        <input type="file" id="intl-goods-images" name="goods_images[]" accept="image/*" multiple>
                    </div>
                    <div class="form-group form-group-span-2 order-hidden" id="intl-docs-group">
                        <label for="intl-docs">Hồ sơ/chứng từ đi kèm (nếu có)</label>
                        <input type="file" id="intl-docs" name="intl_documents[]"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" multiple>
                    </div>
                    <div class="form-group form-group-span-2" id="schedule-order-group">
                        <label>Đặt lịch lấy và giao hàng</label>
                        <p class="order-route-hint">Chọn lịch mong muốn trước. Hệ thống sẽ dùng lịch này để lọc gói
                            đáp ứng thời gian lấy/giao.</p>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="pickup-date-control">Ngày lấy hàng</label>
                                <input type="date" id="pickup-date-control" required>
                            </div>
                            <div class="form-group">
                                <label for="pickup-slot-control">Khung giờ lấy hàng</label>
                                <select id="pickup-slot-control" required>
                                    <option value="">Chọn khung giờ lấy hàng</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="delivery-date-control">Ngày giao dự kiến</label>
                                <input type="date" id="delivery-date-control" required>
                            </div>
                            <div class="form-group">
                                <label for="delivery-slot-control">Khung giờ giao dự kiến</label>
                                <select id="delivery-slot-control" required>
                                    <option value="">Chọn khung giờ giao hàng</option>
                                </select>
                            </div>
                        </div>
                        <div class="schedule-estimate" id="schedule-estimate-note">Chọn lịch mong muốn để hệ thống
                            lọc gói dịch vụ phù hợp.</div>
                        <input type="hidden" name="pickup_time" id="pickup-time-hidden" value="">
                        <input type="hidden" name="delivery_time" id="delivery-time-hidden" value="">
                    </div>
                </div>
                <div class="form-group form-group-span-2">
                    <label>Gói dịch vụ đề xuất</label>
                    <p class="order-route-hint service-picker-hint">Hệ thống sẽ hiển thị các gói cước sau khi bạn nhập
                        đủ thông tin cần thiết và lịch mong muốn. Bạn chọn 1 gói để khóa phí.</p>
                    <div id="order-service-suggestion" class="order-service-suggestion">
                        Vui lòng nhập đủ thông tin hành trình, hàng hóa và lịch để xem gói dịch vụ.
                    </div>
                    <div id="order-service-packages" class="quote-package-list order-service-package-list"></div>
                    <select id="order-service-type" name="service_type" class="order-service-native-select">
                        <option value="" data-route="all">-- Chọn gói dịch vụ --</option>
                        <?php foreach ($service_options as $service_option): ?>
                            <?php
                            $service_key = $service_option['key'];
                            if (!isset($service_name_map[$service_key])) {
                                continue;
                            }
                            ?>
                            <option value="<?php echo htmlspecialchars($service_key); ?>"
                                data-route="<?php echo htmlspecialchars($service_option['route']); ?>" <?php echo ($reorder_data['service_type'] === $service_key) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($service_name_map[$service_key]); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div class="order-section-row order-section-row-bottom">
                <div class="form-section">
                    <h3>4. COD & Ghi chú</h3>
                    <div class="form-grid">
                        <div class="form-group" id="cod-field-group">
                            <label for="cod_amount">Phí COD (giá trị thu hộ, VNĐ)</label>
                            <input type="number" id="cod_amount" name="cod_amount"
                                value="<?php echo htmlspecialchars($reorder_data['cod_amount']); ?>" min="0"
                                placeholder="Để trống nếu không có">
                        </div>
                        <div class="form-group" id="cod-fee-payer-group">
                            <label>Người trả cước</label>
                            <div class="radio-inline-group">
                                <label class="radio-inline-option">
                                    <input type="radio" name="fee_payer" value="sender" checked>
                                    Người gửi
                                </label>
                                <label class="radio-inline-option">
                                    <input type="radio" name="fee_payer" value="receiver">
                                    Người nhận
                                </label>
                            </div>
                        </div>
                        <div class="form-group form-group-span-2">
                            <label for="note">Ghi chú cho tài xế</label>
                            <textarea id="note" name="note"
                                placeholder="VD: Hàng dễ vỡ, vui lòng gọi trước khi giao..."><?php echo htmlspecialchars($reorder_data['note']); ?></textarea>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>5. Thanh toán & Hóa đơn</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="payment_method_delivery">Phương thức thanh toán phí ship</label>
                            <select name="payment_method" id="payment_method_delivery">
                                <option value="cod">Thanh toán khi tài xế lấy hàng</option>
                                <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                            </select>
                        </div>
                        <div class="form-group checkbox-center-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_corporate" id="is_corporate_checkbox" value="1">
                                Yêu cầu xuất hóa đơn công ty
                            </label>
                        </div>
                    </div>
                    <div id="corporate_info_fields">
                        <p class="corporate-title">Nhập thông tin công ty</p>
                        <div class="form-group">
                            <input type="text" name="company_name"
                                value="<?php echo htmlspecialchars($user_info['company_name'] ?? ''); ?>"
                                placeholder="Tên công ty (*)">
                        </div>
                        <div class="form-group">
                            <input type="email" name="company_email" placeholder="Email nhận hóa đơn (*)">
                        </div>
                        <div class="form-group">
                            <input type="text" name="company_tax_code"
                                value="<?php echo htmlspecialchars($user_info['tax_code'] ?? ''); ?>"
                                placeholder="Mã số thuế (*)">
                        </div>
                        <div class="form-group">
                            <textarea name="company_address"
                                placeholder="Địa chỉ công ty (*)"><?php echo htmlspecialchars($user_info['company_address'] ?? ''); ?></textarea>
                        </div>
                        <div class="form-group">
                            <textarea name="company_bank_info" placeholder="Thông tin tài khoản (tùy chọn)"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div id="price-preview" style="display: none;">
                Phí vận chuyển dự kiến: <strong id="shipping-fee-display">0</strong>đ
                <input type="hidden" name="shipping_fee" id="shipping-fee-input" value="0">
            </div>
            <div id="form-message-delivery" style="display: none; margin-top: 20px;"></div>
            <button type="submit" class="btn-primary create-order-submit-btn">Xác nhận đặt đơn</button>
        </form>
    </main>

    <!-- Modal Chọn Địa Chỉ (MỚI) -->
    <div id="addr-modal" class="modal"
        style="display:none; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.5);">
        <div class="modal-content"
            style="background:#fff; margin:10% auto; padding:20px; width:90%; max-width:500px; border-radius:8px; position:relative;">
            <span onclick="document.getElementById('addr-modal').style.display='none'"
                style="position:absolute; right:15px; top:10px; cursor:pointer; font-size:24px;">&times;</span>
            <h3 style="color:#0a2a66; margin-bottom:15px;">Chọn địa chỉ</h3>
            <div style="max-height:300px; overflow-y:auto;">
                <?php foreach ($saved_addresses as $addr): ?>
                    <div class="addr-item"
                        onclick="selectAddr('<?php echo htmlspecialchars(addslashes($addr['address'])); ?>', '<?php echo htmlspecialchars(addslashes($addr['phone'])); ?>')"
                        style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; transition:background 0.2s;">
                        <strong style="color:#0a2a66;"><?php echo htmlspecialchars($addr['name']); ?></strong>
                        <div style="font-size:14px; color:#555;"><?php echo htmlspecialchars($addr['address']); ?></div>
                        <div style="font-size:12px; color:#888;">SĐT: <?php echo htmlspecialchars($addr['phone']); ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
            <div style="margin-top:15px; text-align:center;">
                <a href="address_book.php" target="_blank" style="color:#ff7a00; font-size:14px;">+ Quản lý sổ địa
                    chỉ</a>
            </div>
        </div>
    </div>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script>
        // Biến JS để script `main.js` có thể truy cập
        window.isLoggedIn = <?php echo isset($_SESSION['user_id']) ? 'true' : 'false'; ?>;
        window.servicesData =
            <?php echo json_encode($services_js_payload, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;
        window.pricingConfig =
            <?php echo json_encode($pricing_config, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;
    </script>
    <script src="assets/js/pricing-data.js" defer></script>
    <script src="assets/js/service-catalog.js" defer></script>
    <script src="assets/js/main.js?v=<?php echo time(); ?>" defer></script>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            let ALL_COUNTRIES_LIST = [];
            const form = document.getElementById('create-order-form');
            if (!form) return;

            const routeInput = document.getElementById('order-route-type');
            const routeButtons = document.querySelectorAll('[data-order-route]');
            const serviceSelect = document.getElementById('order-service-type');
            const paymentMethodSelect = document.getElementById('payment_method_delivery');
            const codInput = document.getElementById('cod_amount');
            const codFieldGroup = document.getElementById('cod-field-group');
            const deliveryDomesticCityGroup = document.getElementById('delivery-domestic-city-group');
            const deliveryDomesticDistrictGroup = document.getElementById('delivery-domestic-district-group');
            const intlCountryGroup = document.getElementById('delivery-intl-country-group');
            const intlProvinceGroup = document.getElementById('delivery-intl-province-group');
            const intlCountrySelect = document.getElementById('delivery-intl-country');
            const intlProvinceSelect = document.getElementById('delivery-intl-province');
            const receiverIdTypeGroup = document.getElementById('receiver-id-type-group');
            const receiverIdNumberGroup = document.getElementById('receiver-id-number-group');
            const receiverIdTypeSelect = document.getElementById('receiver-id-type');
            const receiverIdNumberInput = document.getElementById('receiver-id-number');
            const intlPostalCodeGroup = document.getElementById('intl-postal-code-group');
            const intlPostalCodeInput = document.getElementById('intl-postal-code');
            const intlPurposeGroup = document.getElementById('intl-purpose-group');
            const intlPurposeSelect = document.getElementById('intl-purpose');
            const intlHsCodeGroup = document.getElementById('intl-hs-code-group');
            const intlHsCodeInput = document.getElementById('intl-hs-code');
            const intlGoodsImagesGroup = document.getElementById('intl-goods-images-group');
            const intlGoodsImagesInput = document.getElementById('intl-goods-images');
            const intlDocsGroup = document.getElementById('intl-docs-group');
            const intlDocsInput = document.getElementById('intl-docs');

            const pickupCitySelect = document.getElementById('pickup-city');
            const pickupDistrictSelect = document.getElementById('pickup-district');
            const deliveryCitySelect = document.getElementById('delivery-city');
            const deliveryDistrictSelect = document.getElementById('delivery-district');
            const pickupDateControl = document.getElementById('pickup-date-control');
            const pickupSlotControl = document.getElementById('pickup-slot-control');
            const deliveryDateControl = document.getElementById('delivery-date-control');
            const deliverySlotControl = document.getElementById('delivery-slot-control');
            const pickupTimeHidden = document.getElementById('pickup-time-hidden');
            const deliveryTimeHidden = document.getElementById('delivery-time-hidden');
            const scheduleEstimateNote = document.getElementById('schedule-estimate-note');
            const serviceSuggestion = document.getElementById('order-service-suggestion');
            const servicePackages = document.getElementById('order-service-packages');
            const itemTypeInput = document.getElementById('item_type');
            const itemNameInput = document.getElementById('item_name');
            const weightInput = document.getElementById('weight');
            const quantityInput = document.getElementById('quantity');
            const lengthInput = document.getElementById('length');
            const widthInput = document.getElementById('width');
            const heightInput = document.getElementById('height');
            const insuranceValueInput = document.getElementById('insurance_value');
            const packageTypeInput = document.getElementById('package_type');
            const goodsItemsWrapper = document.getElementById('goods-items-wrapper');
            const addGoodsItemBtn = document.getElementById('add-goods-item');
            const goodsDescriptionInput = document.getElementById('goods_description');
            const codFeePayerGroup = document.getElementById('cod-fee-payer-group');
            const feePayerInputs = Array.from(form.querySelectorAll('input[name="fee_payer"]'));

            const SLOT_CATALOG_DOMESTIC = [{
                value: '08:00-10:00',
                label: '08:00 - 10:00',
                startHour: 8
            },
            {
                value: '10:00-12:00',
                label: '10:00 - 12:00',
                startHour: 10
            },
            {
                value: '13:00-15:00',
                label: '13:00 - 15:00',
                startHour: 13
            },
            {
                value: '15:00-17:00',
                label: '15:00 - 17:00',
                startHour: 15
            },
            {
                value: '17:00-19:00',
                label: '17:00 - 19:00',
                startHour: 17
            },
            {
                value: '19:00-21:00',
                label: '19:00 - 21:00',
                startHour: 19
            }
            ];
            const SLOT_CATALOG_INTERNATIONAL = [{
                value: '08:00-10:00',
                label: '08:00 - 10:00',
                startHour: 8
            },
            {
                value: '10:00-12:00',
                label: '10:00 - 12:00',
                startHour: 10
            },
            {
                value: '13:00-15:00',
                label: '13:00 - 15:00',
                startHour: 13
            },
            {
                value: '15:00-17:00',
                label: '15:00 - 17:00',
                startHour: 15
            }
            ];
            const SCHEDULE_WINDOW_DAYS = 45;
            const ITEM_OPTIONS_BY_TYPE = {
                'thuong': ['Quần áo/vải vóc', 'Giày dép/túi xách', 'Sách vở/văn phòng phẩm', 'Đồ chơi nhựa',
                    'Đồ gia dụng nhựa/inox', 'Phụ kiện điện tử đơn giản'
                ],
                'gia-tri-cao': ['Điện thoại/máy tính bảng', 'Laptop/máy ảnh',
                    'Đồng hồ thông minh/tai nghe cao cấp',
                    'Mỹ phẩm chính hãng', 'Nước hoa', 'Trang sức/đá quý'
                ],
                'de-vo': ['Đồ gốm sứ/chén dĩa', 'Bình thủy tinh', 'Màn hình TV/máy tính', 'Gương soi',
                    'Tượng đá/đồ thủ công mỹ nghệ', 'Đèn trang trí/đèn chùm'
                ],
                'chat-long': ['Dầu ăn/nước mắm', 'Mật ong/rượu vang', 'Sữa nước/đồ uống đóng chai',
                    'Hóa chất công nghiệp/sơn/dung môi', 'Dầu nhớt', 'Nước hoa'
                ],
                'pin-lithium': ['Sạc dự phòng', 'Pin xe máy điện', 'Xe điện', 'Quạt tích điện', 'Đèn pin'],
                'dong-lanh': ['Thịt/cá/hải sản tươi sống', 'Thực phẩm đông lạnh', 'Rau củ/trái cây tươi',
                    'Vaccine cần bảo quản lạnh', 'Dược phẩm cần bảo quản lạnh'
                ],
                'cong-kenh': ['Sofa/tủ quần áo/giường gỗ', 'Lốp xe tải', 'Máy móc công trình', 'Bồn nước inox',
                    'Cuộn cáp điện lớn'
                ]
            };
            const PACKAGE_TYPE_BY_ITEM_TYPE = {
                'thuong': 'other',
                'gia-tri-cao': 'electronic',
                'de-vo': 'other',
                'chat-long': 'food',
                'pin-lithium': 'electronic',
                'dong-lanh': 'food',
                'cong-kenh': 'other'
            };

            function toPositiveNumber(value, fallback = 0) {
                const parsed = parseFloat(value);
                if (!Number.isFinite(parsed) || parsed < 0) return fallback;
                return parsed;
            }

            function toPositiveInteger(value, fallback = 0) {
                const parsed = parseInt(value, 10);
                if (!Number.isFinite(parsed) || parsed < 0) return fallback;
                return parsed;
            }

            function escapeHtml(text) {
                if (text === null || text === undefined) return '';
                return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }

            function formatVnd(value) {
                const amount = Math.round(Number(value) || 0);
                return amount.toLocaleString('vi-VN') + 'đ';
            }

            function parseVndInput(value, fallback = 0) {
                const digits = String(value === null || value === undefined ? '' : value).replace(/[^\d]/g, '');
                if (!digits) return fallback;
                const parsed = parseInt(digits, 10);
                if (!Number.isFinite(parsed) || parsed < 0) return fallback;
                return parsed;
            }

            function formatVndFieldValue(value) {
                const numericValue = parseVndInput(value, 0);
                return numericValue > 0 ? numericValue.toLocaleString('vi-VN') : '0';
            }

            function bindVndCurrencyInput(inputEl) {
                if (!inputEl || inputEl.dataset.vndBound === '1') return;
                inputEl.dataset.vndBound = '1';

                inputEl.addEventListener('focus', function () {
                    const numericValue = parseVndInput(inputEl.value, 0);
                    inputEl.value = numericValue > 0 ? String(numericValue) : '';
                });

                inputEl.addEventListener('input', function () {
                    const digitsOnly = String(inputEl.value || '').replace(/[^\d]/g, '');
                    inputEl.value = digitsOnly;
                });

                inputEl.addEventListener('blur', function () {
                    inputEl.value = formatVndFieldValue(inputEl.value);
                });

                inputEl.value = formatVndFieldValue(inputEl.value);
            }

            function populateOriginSelect(selectEl) {
                if (!selectEl) return;
                const previousValue = selectEl.value;
                setSelectOptions(selectEl, ALL_COUNTRIES_LIST, 'Chọn xuất xứ');
                if (previousValue) selectEl.value = previousValue;
            }

            function setSelectOptions(selectEl, options, placeholder) {
                if (!selectEl) return;
                const previousValue = selectEl.value;
                selectEl.innerHTML = '';
                const firstOption = document.createElement('option');
                firstOption.value = '';
                firstOption.textContent = placeholder;
                selectEl.appendChild(firstOption);

                (options || []).forEach(function (item) {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    selectEl.appendChild(option);
                });

                if (previousValue && Array.from(selectEl.options).some(function (opt) {
                    return opt.value === previousValue;
                })) {
                    selectEl.value = previousValue;
                }
            }

            function setSlotOptions(selectEl, slots, placeholder, preferredValue) {
                if (!selectEl) return;
                selectEl.innerHTML = '';

                const firstOption = document.createElement('option');
                firstOption.value = '';
                firstOption.textContent = placeholder;
                selectEl.appendChild(firstOption);

                (slots || []).forEach(function (slot) {
                    const option = document.createElement('option');
                    option.value = slot.value;
                    option.textContent = slot.label;
                    selectEl.appendChild(option);
                });

                if (preferredValue && Array.from(selectEl.options).some(function (opt) {
                    return opt.value === preferredValue;
                })) {
                    selectEl.value = preferredValue;
                } else if (!selectEl.value && slots && slots.length) {
                    selectEl.value = slots[0].value;
                }
            }

            function getCurrentVolumeDivisor() {
                const quoteData = (window.QUOTE_SHIPPING_DATA && typeof window.QUOTE_SHIPPING_DATA === 'object') ?
                    window.QUOTE_SHIPPING_DATA : {};
                const domesticDivisor = toPositiveNumber(quoteData?.domestic?.volumeDivisor, 5000);
                const intlDivisor = toPositiveNumber(quoteData?.international?.volumeDivisor, 6000);
                return getCurrentRoute() === 'international' ? intlDivisor : domesticDivisor;
            }

            function buildItemNameOptionsForRow(typeSelect, nameSelect) {
                if (!typeSelect || !nameSelect) return;
                const itemType = String(typeSelect.value || '').trim().toLowerCase();
                const options = Array.isArray(ITEM_OPTIONS_BY_TYPE[itemType]) ? ITEM_OPTIONS_BY_TYPE[itemType] : [];
                const previousValue = nameSelect.value;

                nameSelect.innerHTML = '';
                const firstOption = document.createElement('option');
                firstOption.value = '';
                firstOption.textContent = itemType ? 'Chọn tên hàng' : 'Chọn loại hàng trước';
                nameSelect.appendChild(firstOption);

                options.forEach(function (itemName) {
                    const option = document.createElement('option');
                    option.value = itemName;
                    option.textContent = itemName;
                    nameSelect.appendChild(option);
                });

                if (previousValue && options.includes(previousValue)) {
                    nameSelect.value = previousValue;
                } else {
                    nameSelect.value = '';
                }
                nameSelect.disabled = !itemType;
            }

            function syncGoodsAggregatesFromRows() {
                if (!goodsItemsWrapper) return;

                const rows = Array.from(goodsItemsWrapper.querySelectorAll('.goods-item-detailed-row'));
                const typeScores = {
                    'thuong': 1,
                    'gia-tri-cao': 3,
                    'de-vo': 4,
                    'chat-long': 5,
                    'pin-lithium': 6,
                    'dong-lanh': 5,
                    'cong-kenh': 7
                };

                let selectedType = '';
                let selectedTypeScore = 0;
                const itemNames = [];
                const descriptionLines = [];
                let totalQty = 0;
                let totalActualWeight = 0;
                let totalVolumetricWeight = 0;
                let totalDeclaredValue = 0;
                const divisor = Math.max(1, getCurrentVolumeDivisor());

                rows.forEach(function (row) {
                    const typeSelect = row.querySelector('.goods-item-type-select');
                    const nameSelect = row.querySelector('.goods-item-name-select');
                    const codeField = row.querySelector('.goods-item-code-input');
                    const originField = row.querySelector('.goods-item-origin-select');
                    const nameInput = row.querySelector('.goods-item-name-input');
                    const weightField = row.querySelector('.goods-item-weight-input');
                    const qtyField = row.querySelector('.goods-item-quantity-input');
                    const lengthField = row.querySelector('.goods-item-length-input');
                    const widthField = row.querySelector('.goods-item-width-input');
                    const heightField = row.querySelector('.goods-item-height-input');
                    const declaredField = row.querySelector('.goods-item-declared-input');

                    const itemType = String(typeSelect?.value || '').trim().toLowerCase();
                    const isIntlRoute = getCurrentRoute() === 'international';
                    const itemName = isIntlRoute ?
                        String(nameInput?.value || '').trim() :
                        String(nameSelect?.value || '').trim();
                    const itemCode = String(codeField?.value || '').trim();
                    const itemOrigin = String(originField?.value || '').trim();
                    const quantity = Math.max(1, toPositiveInteger(qtyField?.value || 1, 1));
                    const weight = toPositiveNumber(weightField?.value || 0, 0);
                    const length = toPositiveNumber(lengthField?.value || 0, 0);
                    const width = toPositiveNumber(widthField?.value || 0, 0);
                    const height = toPositiveNumber(heightField?.value || 0, 0);
                    const declaredValue = parseVndInput(declaredField?.value || 0, 0);

                    const hasContent = itemType || itemName || weight > 0 || length > 0 || width > 0 ||
                        height > 0 || declaredValue > 0 || itemCode || itemOrigin;
                    if (!hasContent) return;

                    totalQty += quantity;
                    totalActualWeight += weight * quantity;
                    const volumetricPerPackage = (length > 0 && width > 0 && height > 0) ? (length * width *
                        height / divisor) : 0;
                    totalVolumetricWeight += volumetricPerPackage * quantity;
                    totalDeclaredValue += declaredValue;

                    if (itemType) {
                        const score = typeScores[itemType] || 0;
                        if (!selectedType || score >= selectedTypeScore) {
                            selectedType = itemType;
                            selectedTypeScore = score;
                        }
                    }
                    if (itemName && !itemNames.includes(itemName)) {
                        itemNames.push(itemName);
                    }

                    const lineParts = [];
                    if (itemName) lineParts.push(itemName);
                    else if (itemType) lineParts.push('[' + itemType + ']');
                    if (itemCode) lineParts.push('Mã: ' + itemCode);
                    if (itemOrigin) lineParts.push('XX: ' + itemOrigin);
                    lineParts.push('SL: ' + quantity);
                    if (weight > 0) lineParts.push('Kg: ' + weight);
                    if (length > 0 && width > 0 && height > 0) {
                        lineParts.push('KT: ' + length + 'x' + width + 'x' + height + 'cm');
                    }
                    if (declaredValue > 0) lineParts.push('Khai giá: ' + Math.round(declaredValue)
                        .toLocaleString('vi-VN') + 'đ');
                    descriptionLines.push(lineParts.join(', '));
                });

                const billableWeight = Math.max(totalActualWeight, totalVolumetricWeight);

                if (itemTypeInput) itemTypeInput.value = selectedType || '';
                if (itemNameInput) itemNameInput.value = itemNames.join(' | ');
                if (quantityInput) quantityInput.value = totalQty > 0 ? String(totalQty) : '1';
                if (weightInput) weightInput.value = billableWeight > 0 ? String(Number(billableWeight.toFixed(
                    2))) : '0';
                if (lengthInput) lengthInput.value = '0';
                if (widthInput) widthInput.value = '0';
                if (heightInput) heightInput.value = '0';
                if (insuranceValueInput) insuranceValueInput.value = String(Math.round(totalDeclaredValue));
                if (packageTypeInput) packageTypeInput.value = PACKAGE_TYPE_BY_ITEM_TYPE[selectedType] || 'other';
                if (goodsDescriptionInput) goodsDescriptionInput.value = descriptionLines.join(' | ');
            }

            function updateGoodsRemoveButtonsState() {
                if (!goodsItemsWrapper) return;
                const rows = Array.from(goodsItemsWrapper.querySelectorAll('.goods-item-detailed-row'));
                rows.forEach(function (row) {
                    const removeBtn = row.querySelector('.goods-item-remove');
                    if (!removeBtn) return;
                    removeBtn.disabled = rows.length <= 1;
                    removeBtn.style.opacity = rows.length <= 1 ? '0.55' : '1';
                    removeBtn.style.cursor = rows.length <= 1 ? 'not-allowed' : 'pointer';
                });
            }

            function bindGoodsRowEvents(row) {
                if (!row) return;

                const typeSelect = row.querySelector('.goods-item-type-select');
                const nameSelect = row.querySelector('.goods-item-name-select');
                const originSelect = row.querySelector('.goods-item-origin-select');
                const nameInput = row.querySelector('.goods-item-name-input');
                const declaredInput = row.querySelector('.goods-item-declared-input');
                const removeBtn = row.querySelector('.goods-item-remove');
                const trackInputs = Array.from(row.querySelectorAll(
                    '.goods-item-type-select, .goods-item-name-select, .goods-item-name-input, .goods-item-code-input, .goods-item-origin-select, .goods-item-weight-input, .goods-item-quantity-input, .goods-item-length-input, .goods-item-width-input, .goods-item-height-input, .goods-item-declared-input'
                ));
                populateOriginSelect(originSelect);
                bindVndCurrencyInput(declaredInput);

                if (typeSelect && nameSelect && nameInput) {
                    typeSelect.addEventListener('change', function () {
                        const itemType = String(typeSelect.value || '').trim();
                        const isIntlRoute = getCurrentRoute() === 'international';

                        if (isIntlRoute) {
                            nameInput.disabled = !itemType;
                            if (!itemType) {
                                nameInput.value = '';
                            }
                        } else {
                            buildItemNameOptionsForRow(typeSelect, nameSelect);
                        }
                        syncGoodsAggregatesFromRows();
                        refreshSchedule();
                        refreshServiceRecommendations();
                    });
                }

                trackInputs.forEach(function (inputEl) {
                    ['input', 'change'].forEach(function (eventName) {
                        inputEl.addEventListener(eventName, function () {
                            syncGoodsAggregatesFromRows();
                            refreshSchedule();
                            refreshServiceRecommendations();
                            if (typeof calculateOrderShipping === 'function') {
                                calculateOrderShipping();
                            }
                        });
                    });
                });

                if (removeBtn) {
                    removeBtn.addEventListener('click', function () {
                        if (!goodsItemsWrapper) return;
                        const rows = Array.from(goodsItemsWrapper.querySelectorAll(
                            '.goods-item-detailed-row'));
                        if (rows.length <= 1) {
                            trackInputs.forEach(function (inputEl) {
                                if (inputEl.tagName === 'SELECT') {
                                    inputEl.value = '';
                                } else if (inputEl.classList.contains(
                                    'goods-item-quantity-input')) {
                                    inputEl.value = '1';
                                } else if (inputEl.classList.contains(
                                    'goods-item-declared-input')) {
                                    inputEl.value = '0';
                                } else {
                                    inputEl.value = '';
                                }
                            });
                            if (typeSelect && nameSelect && nameInput) {
                                const isIntlRoute = getCurrentRoute() === 'international';
                                const codeInput = row.querySelector('.goods-item-code-input');
                                const originSelect = row.querySelector('.goods-item-origin-select');
                                nameInput.value = '';
                                nameSelect.value = '';
                                nameInput.disabled = true;
                                nameSelect.disabled = true;
                                if (!isIntlRoute) {
                                    buildItemNameOptionsForRow(typeSelect, nameSelect);
                                }
                                if (codeInput) codeInput.value = '';
                                if (originSelect) originSelect.value = '';
                            }
                            syncGoodsAggregatesFromRows();
                            refreshSchedule();
                            refreshServiceRecommendations();
                            if (typeof calculateOrderShipping === 'function') {
                                calculateOrderShipping();
                            }
                            return;
                        }
                        row.remove();
                        updateGoodsRemoveButtonsState();
                        syncGoodsAggregatesFromRows();
                        refreshSchedule();
                        refreshServiceRecommendations();
                        if (typeof calculateOrderShipping === 'function') {
                            calculateOrderShipping();
                        }
                    });
                }
            }

            function createGoodsRowTemplate() {
                return '' +
                    '<div class="goods-item-row goods-item-detailed-row">' +
                    '<div class="goods-item-fields">' +
                    '<div class="goods-item-field"><label>Loại hàng</label><select name="goods_item_type[]" class="goods-item-type-select">' +
                    '<option value="">Chọn loại hàng</option>' +
                    '<option value="thuong">Hàng thông thường</option>' +
                    '<option value="gia-tri-cao">Hàng giá trị cao</option>' +
                    '<option value="de-vo">Hàng dễ vỡ</option>' +
                    '<option value="chat-long">Hàng chất lỏng/Hóa phẩm</option>' +
                    '<option value="pin-lithium">Hàng điện tử có pin</option>' +
                    '<option value="dong-lanh">Hàng đông lạnh/Thực phẩm tươi</option>' +
                    '<option value="cong-kenh">Hàng cồng kềnh/Quá khổ</option>' +
                    '</select></div>' +
                    '<div class="goods-item-field"><label>Tên hàng</label>' +
                    '<select name="goods_item_name[]" class="goods-item-name-select" disabled><option value="">Chọn loại hàng trước</option></select>' +
                    '<input type="text" name="goods_item_name[]" class="goods-item-name-input" placeholder="VD: Jean pants, books, phone" disabled style="display: none;">' +
                    '</div>' +
                    '<div class="goods-item-field goods-item-intl-field" style="display: none;"><label>Mã hàng (SKU)</label><input type="text" name="goods_item_code[]" class="goods-item-code-input" placeholder="Tùy chọn"></div>' +
                    '<div class="goods-item-field goods-item-intl-field" style="display: none;"><label>Xuất xứ</label><select name="goods_item_origin[]" class="goods-item-origin-select"><option value="">Chọn quốc gia</option></select></div>' +
                    '<div class="goods-item-field"><label>Khối lượng (kg)</label><input type="number" name="goods_item_weight[]" class="goods-item-weight-input" min="0" step="0.1" placeholder="0.5"></div>' +
                    '<div class="goods-item-field"><label>Số lượng kiện</label><input type="number" name="goods_item_quantity[]" class="goods-item-quantity-input" min="1" step="1" value="1"></div>' +
                    '<div class="goods-item-field"><label>Dài (cm)</label><input type="number" name="goods_item_length[]" class="goods-item-length-input" min="0" step="1" placeholder="30"></div>' +
                    '<div class="goods-item-field"><label>Rộng (cm)</label><input type="number" name="goods_item_width[]" class="goods-item-width-input" min="0" step="1" placeholder="20"></div>' +
                    '<div class="goods-item-field"><label>Cao (cm)</label><input type="number" name="goods_item_height[]" class="goods-item-height-input" min="0" step="1" placeholder="15"></div>' +
                    '<div class="goods-item-field"><label>Khai giá (VNĐ)</label><input type="text" name="goods_item_declared[]" class="goods-item-declared-input" inputmode="numeric" autocomplete="off" value="0" placeholder="0"></div>' +
                    '</div>' +
                    '<button type="button" class="goods-item-remove" aria-label="Xóa hàng hóa">Xóa</button>' +
                    '</div>';
            }

            function addGoodsRow() {
                if (!goodsItemsWrapper) return null;
                const holder = document.createElement('div');
                holder.innerHTML = createGoodsRowTemplate();
                const row = holder.firstElementChild;
                if (!row) return null;
                goodsItemsWrapper.appendChild(row);
                bindGoodsRowEvents(row);
                updateGoodsRemoveButtonsState();
                syncGoodsAggregatesFromRows();
                return row;
            }

            function initGoodsRows() {
                if (!goodsItemsWrapper) return;
                const existingRows = Array.from(goodsItemsWrapper.querySelectorAll('.goods-item-detailed-row'));
                if (!existingRows.length) {
                    addGoodsRow();
                } else {
                    existingRows.forEach(function (row) {
                        bindGoodsRowEvents(row);
                    });
                    updateGoodsRemoveButtonsState();
                    syncGoodsAggregatesFromRows();
                }

                if (addGoodsItemBtn) {
                    addGoodsItemBtn.addEventListener('click', function () {
                        const newRow = addGoodsRow();
                        const firstType = newRow ? newRow.querySelector('.goods-item-type-select') : null;
                        if (firstType) firstType.focus();
                        refreshSchedule();
                        refreshServiceRecommendations();
                        if (typeof calculateOrderShipping === 'function') {
                            calculateOrderShipping();
                        }
                    });
                }
            }

            function normalizeLocationList(list) {
                return Array.from(new Set((list || []).map(function (item) {
                    return String(item || '').trim();
                }).filter(Boolean))).sort(function (a, b) {
                    return a.localeCompare(b, 'vi');
                });
            }

            function bindCityDistrict(citySelect, districtSelect, cityPlaceholder, districtPlaceholder, cityMap) {
                if (!citySelect || !districtSelect) return;
                const cities = normalizeLocationList(Object.keys(cityMap || {}));
                setSelectOptions(citySelect, cities, cityPlaceholder);

                const applyDistricts = function () {
                    const city = citySelect.value;
                    const districts = normalizeLocationList((cityMap && cityMap[city]) ? cityMap[city] : []);
                    setSelectOptions(districtSelect, districts, districtPlaceholder);
                    districtSelect.disabled = districts.length === 0;
                };

                citySelect.addEventListener('change', applyDistricts);
                applyDistricts();
            }

            function initLocationOptions() {
                const quoteData = (window.QUOTE_SHIPPING_DATA && typeof window.QUOTE_SHIPPING_DATA === 'object') ?
                    window.QUOTE_SHIPPING_DATA : {};
                const cityMap = (quoteData.cities && typeof quoteData.cities === 'object') ? quoteData.cities : {};
                bindCityDistrict(pickupCitySelect, pickupDistrictSelect, 'Chọn tỉnh/thành phố gửi',
                    'Chọn quận/huyện gửi', cityMap);
                bindCityDistrict(deliveryCitySelect, deliveryDistrictSelect, 'Chọn tỉnh/thành phố nhận',
                    'Chọn quận/huyện nhận', cityMap);

                const intlData = (quoteData.international && typeof quoteData.international === 'object') ?
                    quoteData.international : {};
                const countries = normalizeLocationList(Array.isArray(intlData.countries) ? intlData.countries :
                    []);
                const destinationRegions = (intlData.destinationRegions && typeof intlData.destinationRegions ===
                    'object') ? intlData.destinationRegions : {};
                const defaultDestinationRegions = normalizeLocationList(Array.isArray(intlData
                    .defaultDestinationRegions) ?
                    intlData.defaultDestinationRegions : []);
                ALL_COUNTRIES_LIST = normalizeLocationList(Array.isArray(intlData.countries) ? intlData.countries : []);

                if (!intlCountrySelect || !intlProvinceSelect) {
                    return;
                }

                setSelectOptions(intlCountrySelect, countries, 'Chọn quốc gia nhận');
                setSelectOptions(intlProvinceSelect, [], 'Chọn tỉnh/thành phố nhận');
                if (intlProvinceSelect) {
                    intlProvinceSelect.disabled = true;
                }

                const applyIntlRegions = function () {
                    const country = intlCountrySelect.value;
                    let regions = normalizeLocationList(Array.isArray(destinationRegions[country]) ?
                        destinationRegions[country] : []);
                    if (!regions.length) {
                        regions = defaultDestinationRegions;
                    }
                    setSelectOptions(intlProvinceSelect, regions, 'Chọn tỉnh/thành phố nhận');
                    intlProvinceSelect.disabled = regions.length === 0;
                };

                intlCountrySelect.addEventListener('change', applyIntlRegions);
                applyIntlRegions();
            }

            function isIntlServiceType(value) {
                const normalized = String(value || '').trim().toLowerCase();
                return normalized === 'intl_economy' || normalized === 'intl_express';
            }

            function getCurrentRoute() {
                return routeInput && routeInput.value === 'international' ? 'international' : 'domestic';
            }

            function getSlotCatalog(routeType) {
                return routeType === 'international' ? SLOT_CATALOG_INTERNATIONAL : SLOT_CATALOG_DOMESTIC;
            }

            function toIsoDateLocal(dateObj) {
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                return y + '-' + m + '-' + d;
            }

            function parseDateIso(dateIso) {
                const parts = String(dateIso || '').split('-');
                if (parts.length !== 3) return null;

                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

                return new Date(year, month - 1, day, 0, 0, 0, 0);
            }

            function parseSlotStartHour(slotValue) {
                const match = String(slotValue || '').match(/^(\d{2}):/);
                if (!match) return null;
                const hour = parseInt(match[1], 10);
                return Number.isFinite(hour) ? hour : null;
            }

            function buildSlotDateTime(dateIso, slotValue) {
                const dateObj = parseDateIso(dateIso);
                const hour = parseSlotStartHour(slotValue);
                if (!dateObj || hour === null) return null;
                return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hour, 0, 0, 0);
            }

            function parseEstimateRangeToHours(estimateText) {
                const text = String(estimateText || '').trim().toLowerCase();
                if (!text) return null;

                const rangeMatch = text.match(
                    /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(giờ|gio|h|ngày|ngay|d)/i
                );
                if (rangeMatch) {
                    const min = parseFloat(rangeMatch[1].replace(',', '.'));
                    const max = parseFloat(rangeMatch[2].replace(',', '.'));
                    const unit = rangeMatch[3];
                    const multiplier = /ngày|ngay|d/i.test(unit) ? 24 : 1;
                    return {
                        minHours: Math.max(1, Math.round(min * multiplier)),
                        maxHours: Math.max(1, Math.round(max * multiplier))
                    };
                }

                const singleMatch = text.match(
                    /(\d+(?:[.,]\d+)?)\s*(giờ|gio|h|ngày|ngay|d)/i
                );
                if (singleMatch) {
                    const value = parseFloat(singleMatch[1].replace(',', '.'));
                    const unit = singleMatch[2];
                    const multiplier = /ngày|ngay|d/i.test(unit) ? 24 : 1;
                    const hours = Math.max(1, Math.round(value * multiplier));
                    return {
                        minHours: hours,
                        maxHours: hours
                    };
                }

                return null;
            }

            function formatHoursLabel(hours) {
                const normalized = Math.max(1, Math.round(hours));
                if (normalized < 24) return normalized + ' giờ';
                const days = Math.floor(normalized / 24);
                const restHours = normalized % 24;
                if (!restHours) return days + ' ngày';
                return days + ' ngày ' + restHours + ' giờ';
            }

            function formatDateForHumans(dateObj) {
                if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '';
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();
                const hour = String(dateObj.getHours()).padStart(2, '0');
                const minute = String(dateObj.getMinutes()).padStart(2, '0');
                return day + '/' + month + '/' + year + ' ' + hour + ':' + minute;
            }

            function getVolumetricWeight(routeType) {
                const quoteData = (window.QUOTE_SHIPPING_DATA && typeof window.QUOTE_SHIPPING_DATA === 'object') ?
                    window.QUOTE_SHIPPING_DATA : {};
                const domesticDivisor = toPositiveNumber(quoteData?.domestic?.volumeDivisor, 5000);
                const intlDivisor = toPositiveNumber(quoteData?.international?.volumeDivisor, 6000);
                const divisor = routeType === 'international' ? intlDivisor : domesticDivisor;
                const quantity = Math.max(1, toPositiveInteger(form.querySelector('[name="quantity"]')?.value || 1,
                    1));
                const length = toPositiveNumber(form.querySelector('[name="length"]')?.value || 0, 0);
                const width = toPositiveNumber(form.querySelector('[name="width"]')?.value || 0, 0);
                const height = toPositiveNumber(form.querySelector('[name="height"]')?.value || 0, 0);

                if (!length || !width || !height || !divisor) return 0;
                return (length * width * height / divisor) * quantity;
            }

            function getChargeableWeight(routeType) {
                const actualWeight = toPositiveNumber(form.querySelector('[name="weight"]')?.value || 0, 0);
                const volumetricWeight = getVolumetricWeight(routeType);
                return Math.max(actualWeight, volumetricWeight);
            }

            function getTransitHoursFromQuote(serviceType) {
                if (typeof window.getShippingFeeDetails !== 'function') return null;

                try {
                    const payload = {
                        quantity: form.querySelector('[name="quantity"]')?.value || '1',
                        length: form.querySelector('[name="length"]')?.value || '0',
                        width: form.querySelector('[name="width"]')?.value || '0',
                        height: form.querySelector('[name="height"]')?.value || '0',
                        insuranceValue: form.querySelector('[name="insurance_value"]')?.value || '0',
                        itemType: form.querySelector('[name="item_type"]')?.value || '',
                        packageType: form.querySelector('[name="package_type"]')?.value || '',
                        fromCity: form.querySelector('[name="pickup_city"]')?.value || '',
                        fromDistrict: form.querySelector('[name="pickup_district"]')?.value || '',
                        toCity: form.querySelector('[name="delivery_city"]')?.value || '',
                        toDistrict: form.querySelector('[name="delivery_district"]')?.value || '',
                        intlCountry: form.querySelector('[name="intl_country"]')?.value || '',
                        intlProvince: form.querySelector('[name="intl_province"]')?.value || ''
                    };

                    const quote = window.getShippingFeeDetails(
                        serviceType,
                        form.querySelector('[name="weight"]')?.value || 0,
                        form.querySelector('[name="cod_amount"]')?.value || 0,
                        form.querySelector('[name="pickup"]')?.value || '',
                        form.querySelector('[name="delivery"]')?.value || '',
                        payload
                    );
                    if (!quote || quote.isContactPrice) return null;

                    const parsed = parseEstimateRangeToHours(quote.estimate || '');
                    if (!parsed) return null;
                    return Math.max(1, parsed.minHours);
                } catch (err) {
                    console.error('Cannot parse quote estimate for schedule', err);
                    return null;
                }
            }

            function estimatePickupLeadHours(routeType, serviceType) {
                const leadByService = {
                    express: 1,
                    fast: 2,
                    standard: 3,
                    slow: 5,
                    bulk: 8,
                    intl_express: 10,
                    intl_economy: 16
                };
                let leadHours = leadByService[serviceType] || (routeType === 'international' ? 8 : 3);

                const quantity = Math.max(1, toPositiveInteger(form.querySelector('[name="quantity"]')?.value || 1,
                    1));
                if (quantity > 1) {
                    leadHours += Math.min(10, Math.ceil((quantity - 1) / 2));
                }

                const chargeableWeight = getChargeableWeight(routeType);
                if (chargeableWeight > 10) leadHours += 2;
                if (chargeableWeight > 30) leadHours += 4;

                const itemType = String(form.querySelector('[name="item_type"]')?.value || '').trim().toLowerCase();
                if (itemType === 'de-vo' || itemType === 'gia-tri-cao') leadHours += 1;
                if (itemType === 'chat-long' || itemType === 'pin-lithium') leadHours += 2;
                if (itemType === 'dong-lanh' || itemType === 'cong-kenh') leadHours += 3;

                return Math.max(1, Math.round(leadHours));
            }

            function estimateTransitHours(routeType, serviceType) {
                const quoteHours = getTransitHoursFromQuote(serviceType);
                const fallbackHoursByService = {
                    express: 4,
                    fast: 8,
                    standard: 18,
                    slow: 30,
                    bulk: 36,
                    intl_express: 72,
                    intl_economy: 144
                };

                let transitHours = quoteHours || fallbackHoursByService[serviceType] || (routeType ===
                    'international' ? 96 : 24);

                const quantity = Math.max(1, toPositiveInteger(form.querySelector('[name="quantity"]')?.value || 1,
                    1));
                if (quantity > 1) {
                    transitHours += Math.min(24, Math.ceil((quantity - 1) / 2));
                }

                const chargeableWeight = getChargeableWeight(routeType);
                if (chargeableWeight > 10) transitHours += 4;
                if (chargeableWeight > 30) transitHours += 10;

                const itemType = String(form.querySelector('[name="item_type"]')?.value || '').trim().toLowerCase();
                if (itemType === 'de-vo' || itemType === 'gia-tri-cao') transitHours += 4;
                if (itemType === 'chat-long' || itemType === 'pin-lithium') transitHours += 8;
                if (itemType === 'dong-lanh' || itemType === 'cong-kenh') transitHours += 12;

                const insuranceValue = toPositiveNumber(form.querySelector('[name="insurance_value"]')?.value || 0,
                    0);
                if (insuranceValue >= 20000000) transitHours += 4;

                if (routeType === 'domestic') {
                    const fromCity = String(pickupCitySelect?.value || '').trim().toLowerCase();
                    const toCity = String(deliveryCitySelect?.value || '').trim().toLowerCase();
                    if (fromCity && toCity && fromCity === toCity) {
                        transitHours = Math.max(2, transitHours - 4);
                    }
                }

                return Math.max(1, Math.round(transitHours));
            }

            function hasValidMeasurementInput() {
                const weight = toPositiveNumber(form.querySelector('[name="weight"]')?.value || 0, 0);
                const length = toPositiveNumber(form.querySelector('[name="length"]')?.value || 0, 0);
                const width = toPositiveNumber(form.querySelector('[name="width"]')?.value || 0, 0);
                const height = toPositiveNumber(form.querySelector('[name="height"]')?.value || 0, 0);
                return weight > 0 || (length > 0 && width > 0 && height > 0);
            }

            function getServiceReadiness(routeType) {
                const itemType = String(form.querySelector('[name="item_type"]')?.value || '').trim();
                const itemName = String(form.querySelector('[name="item_name"]')?.value || '').trim();
                const quantity = Math.max(1, toPositiveInteger(form.querySelector('[name="quantity"]')?.value || 1,
                    1));
                if (!itemType) {
                    return {
                        valid: false,
                        message: 'Chọn loại hàng để hệ thống đề xuất gói dịch vụ.'
                    };
                }
                if (!itemName) {
                    return {
                        valid: false,
                        message: 'Chọn tên hàng để hệ thống đề xuất gói dịch vụ.'
                    };
                }
                if (quantity <= 0) {
                    return {
                        valid: false,
                        message: 'Số lượng kiện chưa hợp lệ.'
                    };
                }
                if (!hasValidMeasurementInput()) {
                    return {
                        valid: false,
                        message: 'Nhập khối lượng hoặc đủ kích thước (dài/rộng/cao) để tính cước.'
                    };
                }
                if (!pickupDateControl?.value || !pickupSlotControl?.value) {
                    return {
                        valid: false,
                        message: 'Chọn lịch lấy hàng để hệ thống lọc gói phù hợp.'
                    };
                }
                if (!deliveryDateControl?.value || !deliverySlotControl?.value) {
                    return {
                        valid: false,
                        message: 'Chọn lịch giao dự kiến để hệ thống lọc gói phù hợp.'
                    };
                }

                const desiredPickup = buildSlotDateTime(pickupDateControl.value, pickupSlotControl.value);
                const desiredDelivery = buildSlotDateTime(deliveryDateControl.value, deliverySlotControl.value);
                if (!desiredPickup || !desiredDelivery || desiredDelivery.getTime() <= desiredPickup.getTime()) {
                    return {
                        valid: false,
                        message: 'Lịch giao phải sau lịch lấy hàng.'
                    };
                }

                if (routeType === 'international') {
                    if (!pickupCitySelect?.value || !pickupDistrictSelect?.value) {
                        return {
                            valid: false,
                            message: 'Chọn đủ Tỉnh/Thành và Quận/Huyện gửi để tính gói quốc tế.'
                        };
                    }
                    if (!intlCountrySelect?.value || !intlProvinceSelect?.value) {
                        return {
                            valid: false,
                            message: 'Chọn đủ Quốc gia và Tỉnh/Thành nhận để tính gói quốc tế.'
                        };
                    }
                    return {
                        valid: true,
                        message: ''
                    };
                }

                if (!pickupCitySelect?.value || !pickupDistrictSelect?.value || !deliveryCitySelect?.value || !
                    deliveryDistrictSelect?.value) {
                    return {
                        valid: false,
                        message: 'Chọn đủ Tỉnh/Thành và Quận/Huyện gửi/nhận để tính gói trong nước.'
                    };
                }

                return {
                    valid: true,
                    message: ''
                };
            }

            function getAllowedServiceTypes(routeType) {
                if (!serviceSelect) return [];
                return Array.from(serviceSelect.options)
                    .filter(function (opt) {
                        const optionRoute = opt.dataset.route || 'all';
                        return optionRoute === routeType && opt.value;
                    })
                    .map(function (opt) {
                        return String(opt.value).trim().toLowerCase();
                    });
            }

            function getQuotePayload(routeType) {
                const payloadBase = {
                    itemType: form.querySelector('[name="item_type"]')?.value || '',
                    itemName: form.querySelector('[name="item_name"]')?.value || '',
                    weight: toPositiveNumber(form.querySelector('[name="weight"]')?.value || 0, 0),
                    quantity: Math.max(1, toPositiveInteger(form.querySelector('[name="quantity"]')?.value || 1,
                        1)),
                    length: toPositiveNumber(form.querySelector('[name="length"]')?.value || 0, 0),
                    width: toPositiveNumber(form.querySelector('[name="width"]')?.value || 0, 0),
                    height: toPositiveNumber(form.querySelector('[name="height"]')?.value || 0, 0),
                    insuranceValue: toPositiveNumber(form.querySelector('[name="insurance_value"]')?.value || 0,
                        0)
                };

                if (routeType === 'international') {
                    return Object.assign(payloadBase, {
                        originCountry: 'Việt Nam',
                        originCity: pickupCitySelect?.value || '',
                        originDistrict: pickupDistrictSelect?.value || '',
                        country: intlCountrySelect?.value || '',
                        destinationProvince: intlProvinceSelect?.value || ''
                    });
                }

                return Object.assign(payloadBase, {
                    fromCity: pickupCitySelect?.value || '',
                    fromDistrict: pickupDistrictSelect?.value || '',
                    toCity: deliveryCitySelect?.value || '',
                    toDistrict: deliveryDistrictSelect?.value || '',
                    codValue: codInput?.disabled ? 0 : toPositiveNumber(codInput?.value || 0, 0)
                });
            }

            function getServiceQuoteResult(routeType) {
                const payload = getQuotePayload(routeType);
                if (routeType === 'international') {
                    if (typeof window.calculateInternationalQuote !== 'function') return null;
                    return window.calculateInternationalQuote(payload);
                }
                if (typeof window.calculateDomesticQuote !== 'function') return null;
                return window.calculateDomesticQuote(payload);
            }

            function formatServiceBreakdown(service, routeType) {
                const breakdown = service?.breakdown || {};
                if (routeType === 'international') {
                    return [
                        'Cước cơ bản: <strong>' + formatVnd(breakdown.basePrice || 0) + '</strong>',
                        'Phí khối lượng: <strong>' + formatVnd(breakdown.weightFee || 0) + '</strong>',
                        (breakdown.goodsAdjustedFee > 0 ? 'Phụ phí loại hàng: <strong>' + formatVnd(breakdown
                            .goodsAdjustedFee) +
                            '</strong>' : ''),
                        'Phụ phí nhiên liệu: <strong>' + formatVnd(breakdown.fuelFee || 0) + '</strong>',
                        'Phí khai quan: <strong>' + formatVnd(breakdown.customsFee || 0) + '</strong>',
                        'Phí an ninh: <strong>' + formatVnd(breakdown.securityFee || 0) + '</strong>',
                        (breakdown.insuranceFee > 0 ? 'Phí bảo hiểm: <strong>' + formatVnd(breakdown
                            .insuranceFee) + '</strong>' :
                            '')
                    ].filter(Boolean);
                }

                return [
                    'Cước cơ bản: <strong>' + formatVnd(breakdown.basePrice || 0) + '</strong>',
                    'Phí khối lượng: <strong>' + formatVnd(breakdown.weightFee || 0) + '</strong>',
                    (breakdown.goodsFee > 0 ? 'Phụ phí loại hàng: <strong>' + formatVnd(breakdown.goodsFee) +
                        '</strong>' : ''),
                    (breakdown.codFee > 0 ? 'Phí COD: <strong>' + formatVnd(breakdown.codFee) + '</strong>' :
                        ''),
                    (breakdown.insuranceFee > 0 ? 'Phí bảo hiểm: <strong>' + formatVnd(breakdown.insuranceFee) +
                        '</strong>' : '')
                ].filter(Boolean);
            }

            function setServiceSuggestionState(message, state) {
                if (!serviceSuggestion) return;
                serviceSuggestion.textContent = message;
                serviceSuggestion.classList.remove('is-ready', 'is-error');
                if (state === 'ready') {
                    serviceSuggestion.classList.add('is-ready');
                } else if (state === 'error') {
                    serviceSuggestion.classList.add('is-error');
                }
            }

            function setSelectedServiceType(serviceType, triggerChangeEvent) {
                if (!serviceSelect) return;
                const normalized = String(serviceType || '').trim().toLowerCase();
                const matched = Array.from(serviceSelect.options).find(function (opt) {
                    return String(opt.value || '').trim().toLowerCase() === normalized && !opt.disabled;
                });
                if (!matched) {
                    serviceSelect.value = '';
                    return;
                }
                const changed = serviceSelect.value !== matched.value;
                serviceSelect.value = matched.value;
                if (triggerChangeEvent && changed) {
                    serviceSelect.dispatchEvent(new Event('change', {
                        bubbles: true
                    }));
                }
            }

            function getSelectedScheduleDateTimes() {
                const desiredPickup = buildSlotDateTime(pickupDateControl?.value || '', pickupSlotControl?.value ||
                    '');
                const desiredDelivery = buildSlotDateTime(deliveryDateControl?.value || '', deliverySlotControl
                    ?.value || '');
                return {
                    desiredPickup,
                    desiredDelivery
                };
            }

            function getServiceScheduleSnapshot(routeType, serviceType, desiredPickup) {
                const now = new Date();
                const leadHours = estimatePickupLeadHours(routeType, serviceType);
                const earliestPickup = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
                const transitHours = estimateTransitHours(routeType, serviceType);

                let plannedPickup = earliestPickup;
                if (desiredPickup instanceof Date && !Number.isNaN(desiredPickup.getTime()) && desiredPickup
                    .getTime() > earliestPickup.getTime()) {
                    plannedPickup = desiredPickup;
                }

                const earliestDelivery = new Date(plannedPickup.getTime() + transitHours * 60 * 60 * 1000);
                return {
                    leadHours,
                    transitHours,
                    earliestPickup,
                    plannedPickup,
                    earliestDelivery,
                };
            }

            function clearServicePackageCards() {
                if (servicePackages) {
                    servicePackages.innerHTML = '';
                }
            }

            function refreshServiceRecommendations() {
                const routeType = getCurrentRoute();
                const readiness = getServiceReadiness(routeType);

                if (!readiness.valid) {
                    clearServicePackageCards();
                    if (serviceSelect) serviceSelect.value = '';
                    setServiceSuggestionState(readiness.message, 'neutral');
                    return;
                }

                const quoteResult = getServiceQuoteResult(routeType);
                const allowedTypes = getAllowedServiceTypes(routeType);
                const services = Array.isArray(quoteResult?.services) ? quoteResult.services.filter(function (
                    service) {
                    const key = String(service?.serviceType || '').trim().toLowerCase();
                    return allowedTypes.includes(key);
                }) : [];

                if (!services.length) {
                    clearServicePackageCards();
                    if (serviceSelect) serviceSelect.value = '';
                    setServiceSuggestionState(
                        'Không tìm thấy gói phù hợp với thông tin đã nhập. Vui lòng kiểm tra lại dữ liệu.',
                        'error');
                    return;
                }

                const selectedSchedule = getSelectedScheduleDateTimes();
                const desiredPickup = selectedSchedule.desiredPickup;
                const desiredDelivery = selectedSchedule.desiredDelivery;
                const evaluatedServices = services.map(function (service) {
                    const serviceType = String(service?.serviceType || '').trim().toLowerCase();
                    const schedule = getServiceScheduleSnapshot(routeType, serviceType, desiredPickup);
                    const pickupCompatible = desiredPickup instanceof Date &&
                        !Number.isNaN(desiredPickup.getTime()) &&
                        desiredPickup.getTime() >= schedule.earliestPickup.getTime();
                    const deliveryCompatible = desiredDelivery instanceof Date &&
                        !Number.isNaN(desiredDelivery.getTime()) &&
                        desiredDelivery.getTime() >= schedule.earliestDelivery.getTime();
                    return {
                        service: service,
                        serviceType: serviceType,
                        schedule: schedule,
                        scheduleCompatible: pickupCompatible && deliveryCompatible,
                        pickupCompatible: pickupCompatible,
                        deliveryCompatible: deliveryCompatible,
                    };
                });
                const compatibleServices = evaluatedServices.filter(function (item) {
                    return item.scheduleCompatible;
                });
                const hasCompatible = compatibleServices.length > 0;
                const displayServices = hasCompatible ? compatibleServices : evaluatedServices;

                const currentType = String(serviceSelect?.value || '').trim().toLowerCase();
                const selectedType = displayServices.some(function (item) {
                    return item.serviceType === currentType && item.scheduleCompatible;
                }) ? currentType : (hasCompatible ? String(displayServices[0].serviceType || '').trim()
                    .toLowerCase() : '');

                setSelectedServiceType(selectedType, false);

                if (!hasCompatible) {
                    setServiceSuggestionState(
                        'Lịch bạn chọn đang quá gấp: chưa có gói nào đáp ứng. Hãy dời lịch lấy/giao để hệ thống đề xuất gói khả dụng.',
                        'error'
                    );
                } else {
                    const selectedServiceInfo = displayServices.find(function (item) {
                        return item.serviceType === selectedType;
                    }) || displayServices[0];
                    const selectedName = selectedServiceInfo?.service?.serviceName || 'gói dịch vụ';
                    setServiceSuggestionState(
                        'Có ' + compatibleServices.length + ' gói đáp ứng lịch bạn chọn. Gói đang chọn: ' +
                        selectedName + '.',
                        'ready'
                    );
                }

                const cardsHtml = displayServices.map(function (serviceInfo, index) {
                    const service = serviceInfo.service;
                    const serviceType = serviceInfo.serviceType;
                    const isSelected = serviceType === selectedType;
                    const isAvailable = serviceInfo.scheduleCompatible;
                    const schedule = serviceInfo.schedule;
                    const feeLines = formatServiceBreakdown(service, routeType).map(function (line) {
                        return '<li>' + line + '</li>';
                    }).join('');

                    return '<article class="quote-card quote-package-item order-service-package ' + (
                        isSelected ? 'is-selected' : '') + (!isAvailable ? ' is-unavailable' : '') +
                        '" data-service-type="' + escapeHtml(serviceType) + '" data-schedule-compatible="' +
                        (isAvailable ? '1' : '0') + '">' +
                        '<div class="quote-package-head">' +
                        '<h4>' + escapeHtml(service.serviceName || 'Gói cước') + '</h4>' +
                        (hasCompatible && index === 0 ? '<span class="quote-badge">Giá tốt nhất</span>' :
                            '') +
                        '</div>' +
                        '<p class="quote-service-eta">Thời gian dự kiến: <strong>' + escapeHtml(service
                            .estimate || 'Đang cập nhật') + '</strong></p>' +
                        '<p class="quote-service-eta">Lấy sớm nhất: <strong>' + escapeHtml(
                            formatDateForHumans(schedule.earliestPickup)) + '</strong></p>' +
                        '<p class="quote-service-eta">Giao dự kiến theo lịch chọn: <strong>' + escapeHtml(
                            formatDateForHumans(schedule.earliestDelivery)) + '</strong></p>' +
                        '<p class="quote-service-eta ' + (isAvailable ? '' : 'is-error') +
                        '">Trạng thái theo lịch: <strong>' + (isAvailable ? 'Đáp ứng' : 'Không đáp ứng') +
                        '</strong></p>' +
                        '<details class="order-service-breakdown">' +
                        '<summary>Xem chi tiết phí</summary>' +
                        '<ul class="quote-breakdown-list order-service-breakdown-list">' + feeLines +
                        '</ul>' +
                        '</details>' +
                        '<p class="quote-service-total">Tổng cước: <strong>' + formatVnd(service.total ||
                            0) + '</strong></p>' +
                        '<span class="order-service-action">' + (isSelected ? 'Đã chọn' : (isAvailable ?
                            'Chọn gói này' : 'Không khả dụng')) + '</span>' +
                        '</article>';
                }).join('');

                if (servicePackages) {
                    servicePackages.innerHTML = cardsHtml;
                    servicePackages.querySelectorAll('.order-service-breakdown').forEach(function (detailEl) {
                        detailEl.addEventListener('click', function (e) {
                            e.stopPropagation();
                        });
                    });
                    servicePackages.querySelectorAll('[data-service-type]').forEach(function (card) {
                        card.addEventListener('click', function () {
                            const serviceType = String(card.getAttribute('data-service-type') || '')
                                .trim().toLowerCase();
                            const scheduleCompatible = card.getAttribute(
                                'data-schedule-compatible') === '1';
                            if (!serviceType) return;
                            if (!scheduleCompatible) return;
                            setSelectedServiceType(serviceType, true);
                        });
                    });
                }
            }

            function getAvailableSlotsForDate(dateIso, minDateTime, slotCatalog) {
                if (!dateIso) return [];
                return (slotCatalog || []).filter(function (slot) {
                    const slotDateTime = buildSlotDateTime(dateIso, slot.value);
                    return slotDateTime && slotDateTime.getTime() >= minDateTime.getTime();
                });
            }

            function findFirstAvailableSlot(minDateTime, slotCatalog) {
                const startDay = new Date(minDateTime.getFullYear(), minDateTime.getMonth(), minDateTime.getDate(),
                    0, 0, 0, 0);

                for (let i = 0; i <= SCHEDULE_WINDOW_DAYS; i++) {
                    const testDate = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + i,
                        0, 0, 0, 0);
                    const dateIso = toIsoDateLocal(testDate);
                    const available = getAvailableSlotsForDate(dateIso, minDateTime, slotCatalog);
                    if (available.length > 0) {
                        return {
                            dateIso: dateIso,
                            slotValue: available[0].value
                        };
                    }
                }

                return null;
            }

            function syncScheduleHiddenFields() {
                if (pickupTimeHidden) {
                    pickupTimeHidden.value = (pickupDateControl?.value && pickupSlotControl?.value) ?
                        pickupDateControl.value + ' ' + pickupSlotControl.value : '';
                }
                if (deliveryTimeHidden) {
                    deliveryTimeHidden.value = (deliveryDateControl?.value && deliverySlotControl?.value) ?
                        deliveryDateControl.value + ' ' + deliverySlotControl.value : '';
                }
            }

            function getRouteBaselineTimings(routeType) {
                const allowedTypes = getAllowedServiceTypes(routeType);
                if (!allowedTypes.length) {
                    return {
                        minLeadHours: routeType === 'international' ? 10 : 1,
                        minTransitHours: routeType === 'international' ? 72 : 4,
                    };
                }

                let minLeadHours = Number.POSITIVE_INFINITY;
                let minTransitHours = Number.POSITIVE_INFINITY;
                allowedTypes.forEach(function (serviceType) {
                    minLeadHours = Math.min(minLeadHours, estimatePickupLeadHours(routeType, serviceType));
                    minTransitHours = Math.min(minTransitHours, estimateTransitHours(routeType,
                        serviceType));
                });

                return {
                    minLeadHours: Number.isFinite(minLeadHours) ? minLeadHours : (routeType === 'international' ?
                        10 : 1),
                    minTransitHours: Number.isFinite(minTransitHours) ? minTransitHours : (routeType ===
                        'international' ? 72 : 4),
                };
            }

            function updateScheduleEstimateNote(minPickupDateTime, minDeliveryDateTime, transitHours, routeType) {
                if (!scheduleEstimateNote) return;
                const pickupText = formatDateForHumans(minPickupDateTime);
                const deliveryText = formatDateForHumans(minDeliveryDateTime);
                const routeText = routeType === 'international' ? 'quốc tế' : 'trong nước';
                scheduleEstimateNote.textContent = 'Tuyến ' + routeText + ': lấy sớm nhất ' + pickupText +
                    ', giao sớm nhất ' + deliveryText + '. Mốc này tính theo gói nhanh nhất (~ ' + formatHoursLabel(
                        transitHours) +
                    ') và sẽ dùng để lọc gói đáp ứng lịch bạn chọn.';
            }

            function refreshSchedule() {
                if (!pickupDateControl || !pickupSlotControl || !deliveryDateControl || !deliverySlotControl) {
                    return;
                }

                const routeType = getCurrentRoute();
                const slotCatalog = getSlotCatalog(routeType);
                const now = new Date();
                const baselineTimings = getRouteBaselineTimings(routeType);
                const leadHours = baselineTimings.minLeadHours;
                const minPickupDateTime = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
                const maxPickupDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() +
                    SCHEDULE_WINDOW_DAYS, 0, 0, 0, 0);
                pickupDateControl.min = toIsoDateLocal(now);
                pickupDateControl.max = toIsoDateLocal(maxPickupDate);

                const firstPickup = findFirstAvailableSlot(minPickupDateTime, slotCatalog);
                if (firstPickup && (!pickupDateControl.value || pickupDateControl.value < firstPickup.dateIso)) {
                    pickupDateControl.value = firstPickup.dateIso;
                }

                let pickupSlots = getAvailableSlotsForDate(pickupDateControl.value, minPickupDateTime, slotCatalog);
                if (!pickupSlots.length && firstPickup) {
                    pickupDateControl.value = firstPickup.dateIso;
                    pickupSlots = getAvailableSlotsForDate(pickupDateControl.value, minPickupDateTime, slotCatalog);
                }

                setSlotOptions(pickupSlotControl, pickupSlots, 'Chọn khung giờ lấy hàng', pickupSlotControl.value);
                if (!pickupSlotControl.value && pickupSlots.length) {
                    pickupSlotControl.value = pickupSlots[0].value;
                }

                const selectedPickupDateTime = buildSlotDateTime(pickupDateControl.value, pickupSlotControl
                    .value) || minPickupDateTime;
                const transitHours = baselineTimings.minTransitHours;
                const minDeliveryDateTime = new Date(selectedPickupDateTime.getTime() + transitHours * 60 * 60 *
                    1000);

                const maxDeliveryDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() +
                    SCHEDULE_WINDOW_DAYS + 15, 0, 0, 0, 0);
                const minDeliveryIso = toIsoDateLocal(minDeliveryDateTime);
                deliveryDateControl.min = minDeliveryIso;
                deliveryDateControl.max = toIsoDateLocal(maxDeliveryDate);

                const firstDelivery = findFirstAvailableSlot(minDeliveryDateTime, slotCatalog);
                if (firstDelivery && (!deliveryDateControl.value || deliveryDateControl.value < firstDelivery
                    .dateIso)) {
                    deliveryDateControl.value = firstDelivery.dateIso;
                }

                let deliverySlots = getAvailableSlotsForDate(deliveryDateControl.value, minDeliveryDateTime,
                    slotCatalog);
                if (!deliverySlots.length && firstDelivery) {
                    deliveryDateControl.value = firstDelivery.dateIso;
                    deliverySlots = getAvailableSlotsForDate(deliveryDateControl.value, minDeliveryDateTime,
                        slotCatalog);
                }

                setSlotOptions(deliverySlotControl, deliverySlots, 'Chọn khung giờ giao hàng', deliverySlotControl
                    .value);
                if (!deliverySlotControl.value && deliverySlots.length) {
                    deliverySlotControl.value = deliverySlots[0].value;
                }

                syncScheduleHiddenFields();
                updateScheduleEstimateNote(minPickupDateTime, minDeliveryDateTime, transitHours, routeType);
            }

            function syncServiceOptionsByRoute(routeType) {
                if (!serviceSelect) return;
                const options = Array.from(serviceSelect.options);

                options.forEach(function (opt) {
                    const optionRoute = opt.dataset.route || 'all';
                    const shouldShow = optionRoute === 'all' || routeType === optionRoute;
                    opt.hidden = !shouldShow;
                    opt.disabled = !shouldShow;
                });

                const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
                if (!selectedOption || selectedOption.hidden || selectedOption.disabled) {
                    serviceSelect.value = '';
                }
            }

            function handlePaymentState() {
                const isIntlRoute = getCurrentRoute() === 'international';
                if (!paymentMethodSelect || !codInput) return;

                const lockCod = paymentMethodSelect.value === 'bank_transfer' || isIntlRoute;
                if (lockCod) {
                    codInput.value = '0';
                    codInput.disabled = true;
                    codInput.style.backgroundColor = '#e9ecef';
                } else {
                    codInput.disabled = false;
                    codInput.style.backgroundColor = '#ffffff';
                }

                feePayerInputs.forEach(function (input) {
                    input.disabled = lockCod || isIntlRoute;
                });
                if (lockCod || isIntlRoute) {
                    const senderRadio = feePayerInputs.find(function (input) {
                        return input.value === 'sender';
                    });
                    if (senderRadio) senderRadio.checked = true;
                }
            }

            function setRouteGroupVisibility(groupEl, shouldShow) {
                if (!groupEl) return;
                groupEl.classList.toggle('order-hidden', !shouldShow);
                groupEl.style.display = shouldShow ? '' : 'none';
            }

            function applyRouteMode(routeType) {
                const normalizedRoute = (routeType === 'international') ? 'international' : 'domestic';
                if (routeInput) routeInput.value = normalizedRoute;

                routeButtons.forEach(function (btn) {
                    const isActive = btn.dataset.orderRoute === normalizedRoute;
                    btn.classList.toggle('active', isActive);
                    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });

                const isIntl = normalizedRoute === 'international';
                setRouteGroupVisibility(deliveryDomesticCityGroup, !isIntl);
                setRouteGroupVisibility(deliveryDomesticDistrictGroup, !isIntl);
                setRouteGroupVisibility(intlCountryGroup, isIntl);
                setRouteGroupVisibility(intlProvinceGroup, isIntl);
                if (intlCountrySelect) intlCountrySelect.required = isIntl;
                if (intlProvinceSelect) intlProvinceSelect.required = isIntl;

                if (goodsItemsWrapper) {
                    const goodsRows = Array.from(goodsItemsWrapper.querySelectorAll('.goods-item-detailed-row'));
                    goodsRows.forEach(row => {
                        const nameSelect = row.querySelector('.goods-item-name-select');
                        const nameInput = row.querySelector('.goods-item-name-input');
                        const typeSelect = row.querySelector('.goods-item-type-select');
                        const hasItemType = typeSelect && typeSelect.value;

                        if (nameSelect && nameInput) {
                            nameSelect.style.display = isIntl ? 'none' : '';
                            nameInput.style.display = isIntl ? '' : 'none';

                            nameSelect.disabled = isIntl || !hasItemType;
                            nameInput.disabled = !isIntl || !hasItemType;

                            if (isIntl) {
                                nameSelect.value = '';
                            } else {
                                nameInput.value = '';
                                buildItemNameOptionsForRow(typeSelect, nameSelect);
                            }

                            const intlFields = Array.from(row.querySelectorAll('.goods-item-intl-field'));
                            const codeInput = row.querySelector('.goods-item-code-input');
                            const originSelect = row.querySelector('.goods-item-origin-select');

                            intlFields.forEach(field => {
                                field.style.display = isIntl ? '' : 'none';
                            });

                            if (codeInput) codeInput.disabled = !isIntl;
                            if (originSelect) {
                                originSelect.disabled = !isIntl;
                                originSelect.required = isIntl;
                            }

                            if (!isIntl && codeInput) codeInput.value = '';
                            if (!isIntl && originSelect) originSelect.value = '';
                        }
                    });
                }

                if (!isIntl && intlCountrySelect) intlCountrySelect.value = '';
                if (!isIntl && intlProvinceSelect) {
                    intlProvinceSelect.value = '';
                    intlProvinceSelect.disabled = true;
                }
                setRouteGroupVisibility(receiverIdTypeGroup, isIntl);
                setRouteGroupVisibility(receiverIdNumberGroup, isIntl);
                if (receiverIdTypeSelect) receiverIdTypeSelect.required = isIntl;
                if (receiverIdNumberInput) receiverIdNumberInput.required = isIntl;
                if (!isIntl && receiverIdTypeSelect) receiverIdTypeSelect.value = '';
                if (!isIntl && receiverIdNumberInput) receiverIdNumberInput.value = '';
                setRouteGroupVisibility(intlPostalCodeGroup, isIntl);
                if (!isIntl && intlPostalCodeInput) intlPostalCodeInput.value = '';
                setRouteGroupVisibility(intlPurposeGroup, isIntl);
                if (intlPurposeSelect) intlPurposeSelect.required = isIntl;
                if (!isIntl && intlPurposeSelect) intlPurposeSelect.value = '';
                setRouteGroupVisibility(intlHsCodeGroup, isIntl);
                if (!isIntl && intlHsCodeInput) intlHsCodeInput.value = '';
                setRouteGroupVisibility(intlGoodsImagesGroup, isIntl);
                if (!isIntl && intlGoodsImagesInput) intlGoodsImagesInput.value = '';
                setRouteGroupVisibility(intlDocsGroup, isIntl);
                if (!isIntl && intlDocsInput) intlDocsInput.value = '';

                setRouteGroupVisibility(codFieldGroup, !isIntl);
                setRouteGroupVisibility(codFeePayerGroup, !isIntl);
                syncServiceOptionsByRoute(normalizedRoute);
                handlePaymentState();
                syncGoodsAggregatesFromRows();
                refreshSchedule();
                refreshServiceRecommendations();

                if (typeof calculateOrderShipping === 'function') {
                    calculateOrderShipping();
                }
            }

            routeButtons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    applyRouteMode(btn.dataset.orderRoute || 'domestic');
                });
            });

            if (serviceSelect) {
                serviceSelect.addEventListener('change', function () {
                    if (isIntlServiceType(serviceSelect.value)) {
                        applyRouteMode('international');
                    } else {
                        applyRouteMode('domestic');
                    }
                    refreshSchedule();
                    refreshServiceRecommendations();
                });
            }

            if (pickupDateControl) {
                pickupDateControl.addEventListener('change', function () {
                    refreshSchedule();
                    refreshServiceRecommendations();
                    if (typeof calculateOrderShipping === 'function') {
                        calculateOrderShipping();
                    }
                });
            }
            if (pickupSlotControl) {
                pickupSlotControl.addEventListener('change', function () {
                    refreshSchedule();
                    refreshServiceRecommendations();
                    if (typeof calculateOrderShipping === 'function') {
                        calculateOrderShipping();
                    }
                });
            }
            if (deliveryDateControl) {
                deliveryDateControl.addEventListener('change', function () {
                    refreshSchedule();
                    refreshServiceRecommendations();
                    if (typeof calculateOrderShipping === 'function') {
                        calculateOrderShipping();
                    }
                });
            }
            if (deliverySlotControl) {
                deliverySlotControl.addEventListener('change', function () {
                    syncScheduleHiddenFields();
                    refreshServiceRecommendations();
                    if (typeof calculateOrderShipping === 'function') {
                        calculateOrderShipping();
                    }
                });
            }

            const scheduleInputSelectors = [
                '[name="pickup_city"]',
                '[name="pickup_district"]',
                '[name="delivery_city"]',
                '[name="delivery_district"]',
                '[name="intl_country"]',
                '[name="intl_province"]',
                '[name="weight"]',
                '[name="quantity"]',
                '[name="length"]',
                '[name="width"]',
                '[name="height"]',
                '[name="item_type"]',
                '[name="item_name"]',
                '[name="goods_description"]',
                '[name="insurance_value"]',
                '[name="cod_amount"]'
            ];
            scheduleInputSelectors.forEach(function (selector) {
                const inputEl = form.querySelector(selector);
                if (!inputEl) return;
                inputEl.addEventListener('change', function () {
                    refreshSchedule();
                    refreshServiceRecommendations();
                });
                inputEl.addEventListener('input', function () {
                    refreshSchedule();
                    refreshServiceRecommendations();
                });
            });

            // Toggle corporate fields
            const corporateCheckbox = document.getElementById('is_corporate_checkbox');
            if (corporateCheckbox) {
                corporateCheckbox.addEventListener('change', function () {
                    const corporateFields = document.getElementById('corporate_info_fields');
                    const companyNameInput = corporateFields.querySelector('[name="company_name"]');
                    const companyEmailInput = corporateFields.querySelector('[name="company_email"]');
                    const companyTaxInput = corporateFields.querySelector('[name="company_tax_code"]');
                    const companyAddressInput = corporateFields.querySelector('[name="company_address"]');

                    if (this.checked) {
                        corporateFields.style.display = 'block';
                        companyNameInput.required = true;
                        companyEmailInput.required = true;
                        companyTaxInput.required = true;
                        companyAddressInput.required = true;
                    } else {
                        corporateFields.style.display = 'none';
                        companyNameInput.required = false;
                        companyEmailInput.required = false;
                        companyTaxInput.required = false;
                        companyAddressInput.required = false;
                    }
                });
                corporateCheckbox.dispatchEvent(new Event('change'));
            }

            if (paymentMethodSelect) {
                paymentMethodSelect.addEventListener('change', function () {
                    handlePaymentState();
                    refreshSchedule();
                    refreshServiceRecommendations();
                    if (typeof calculateOrderShipping === 'function') {
                        calculateOrderShipping();
                    }
                });
            }

            form.addEventListener('submit', function () {
                refreshSchedule();
                syncScheduleHiddenFields();
            });

            initGoodsRows();
            initLocationOptions();
            applyRouteMode(getCurrentRoute());
            refreshSchedule();
            refreshServiceRecommendations();
        });

        // Logic Modal Địa chỉ
        let currentAddrField = '';

        function openAddrModal(type) {
            currentAddrField = type; // 'pickup' hoặc 'delivery'
            document.getElementById('addr-modal').style.display = 'block';
        }

        function selectAddr(address, phone) {
            if (currentAddrField === 'pickup') {
                document.getElementById('pickup-addr').value = address;
                // Có thể tự điền SĐT người gửi nếu muốn, nhưng thường SĐT người gửi là cố định từ profile
            } else if (currentAddrField === 'delivery') {
                document.getElementById('delivery-addr').value = address;
                document.getElementById('receiver_phone').value = phone; // Điền luôn SĐT người nhận
            }
            document.getElementById('addr-modal').style.display = 'none';
            // Gọi lại hàm tính phí
            if (typeof calculateOrderShipping === 'function') calculateOrderShipping();
        }
    </script>
    <?php
    if (isset($conn) && $conn instanceof mysqli)
        $conn->close();
    ?>
</body>

</html>