<?php
session_start();
// Chỉ cho phép 'customer' truy cập
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'customer') {
    // Nếu chưa đăng nhập, chuyển đến trang login và đính kèm trang này làm redirect
    header("Location: login.php?redirect=" . urlencode('create_order.php'));
    exit;
}

require_once __DIR__ . '/../config/db.php';

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

    <main class="container" style="padding-top: 40px; padding-bottom: 40px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin:0;">Tạo đơn hàng mới</h2>
            <a href="dashboard.php" class="btn-secondary"
                style="color:#0a2a66; border-color:#0a2a66; padding:8px 15px; text-decoration:none;">← Quay lại
                Dashboard</a>
        </div>

        <form id="create-order-form" class="order-form-container" method="POST">
            <!-- Thông tin người gửi -->
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
                    <div class="form-group" style="grid-column: 1 / -1; position: relative;">
                        <div
                            style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <label for="pickup-addr" style="margin-bottom:0;">Địa chỉ lấy hàng</label>
                            <?php if (!empty($saved_addresses)): ?>
                            <a href="#" onclick="openAddrModal('pickup'); return false;"
                                style="font-size:13px; color:#ff7a00; text-decoration:none;">📍 Chọn từ sổ địa chỉ</a>
                            <?php endif; ?>
                        </div>
                        <label for="pickup-addr">Địa chỉ lấy hàng</label>
                        <input type="text" id="pickup-addr" name="pickup"
                            value="<?php echo htmlspecialchars($reorder_data['pickup_address']); ?>"
                            placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..." required>
                    </div>
                </div>
            </div>

            <!-- Thông tin người nhận -->
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
                    <div class="form-group" style="grid-column: 1 / -1; position: relative;">
                        <div
                            style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <label for="delivery-addr" style="margin-bottom:0;">Địa chỉ giao hàng</label>
                            <?php if (!empty($saved_addresses)): ?>
                            <a href="#" onclick="openAddrModal('delivery'); return false;"
                                style="font-size:13px; color:#ff7a00; text-decoration:none;">📍 Chọn từ sổ địa chỉ</a>
                            <?php endif; ?>
                        </div>
                        <label for="delivery-addr">Địa chỉ giao hàng</label>
                        <input type="text" id="delivery-addr" name="delivery"
                            value="<?php echo htmlspecialchars($reorder_data['delivery_address']); ?>"
                            placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..." required>
                    </div>
                </div>
            </div>

            <!-- Thông tin gói hàng -->
            <div class="form-section">
                <h3>3. Thông tin gói hàng</h3>
                <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    <div class="form-group">
                        <label for="order-service-type">Loại dịch vụ</label>
                        <select id="order-service-type" name="service_type">
                            <?php foreach ($services_list as $svc): ?>
                            <option value="<?php echo $svc['type_key']; ?>"
                                <?php echo ($reorder_data['service_type'] == $svc['type_key']) ? 'selected' : ''; ?>>
                                <?php echo $svc['name']; ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="package_type">Loại hàng hóa</label>
                        <select id="package_type" name="package_type">
                            <option value="document"
                                <?php echo ($reorder_data['package_type'] == 'document') ? 'selected' : ''; ?>>Tài liệu
                            </option>
                            <option value="food"
                                <?php echo ($reorder_data['package_type'] == 'food') ? 'selected' : ''; ?>>Thực phẩm
                            </option>
                            <option value="clothes"
                                <?php echo ($reorder_data['package_type'] == 'clothes') ? 'selected' : ''; ?>>Quần áo
                            </option>
                            <option value="electronic"
                                <?php echo ($reorder_data['package_type'] == 'electronic') ? 'selected' : ''; ?>>Đồ điện
                                tử</option>
                            <option value="other"
                                <?php echo ($reorder_data['package_type'] == 'other') ? 'selected' : ''; ?>>Khác
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="weight">Khối lượng (kg)</label>
                        <input type="number" id="weight" name="weight"
                            value="<?php echo htmlspecialchars($reorder_data['weight']); ?>" min="0" step="0.5"
                            required>
                    </div>
                    <div class="form-group">
                        <label for="cod_amount">Tiền thu hộ (COD)</label>
                        <input type="number" id="cod_amount" name="cod_amount"
                            value="<?php echo htmlspecialchars($reorder_data['cod_amount']); ?>" min="0"
                            placeholder="Để trống nếu không có">
                    </div>
                </div>
                <div class="form-group" style="margin-top: 20px;">
                    <label for="note">Ghi chú cho tài xế</label>
                    <textarea id="note" name="note"
                        placeholder="VD: Hàng dễ vỡ, vui lòng gọi trước khi giao..."><?php echo htmlspecialchars($reorder_data['note']); ?></textarea>
                </div>
            </div>

            <!-- Thanh toán & Hóa đơn -->
            <div class="form-section">
                <h3>4. Thanh toán & Hóa đơn</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="payment_method">Phương thức thanh toán phí ship</label>
                        <select name="payment_method" id="payment_method">
                            <option value="cod">Thanh toán khi tài xế lấy hàng</option>
                            <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                        </select>
                    </div>
                    <div class="form-group" style="justify-content: center;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="is_corporate" id="is_corporate_checkbox" value="1"
                                style="width: auto; margin-right: 10px;">
                            Yêu cầu xuất hóa đơn công ty
                        </label>
                    </div>
                </div>
                <div id="corporate_info_fields">
                    <p style="font-weight: bold; color: #333; margin-top: 0;">Nhập thông tin công ty</p>
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

            <!-- Phí ship & Submit -->
            <div id="price-preview" style="display: none;">
                Phí vận chuyển dự kiến: <strong id="shipping-fee-display">0</strong>đ
                <input type="hidden" name="shipping_fee" id="shipping-fee-input" value="0">
            </div>
            <div id="form-message" style="display: none; margin-top: 20px;"></div>
            <button type="submit" class="btn-primary"
                style="width: 100%; margin-top: 20px; padding: 15px; font-size: 16px;">Xác nhận đặt đơn</button>
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
        <?php echo json_encode($services_list, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;
    window.pricingConfig =
        <?php echo json_encode($pricing_config, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;
    </script>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Toggle corporate fields
        const corporateCheckbox = document.getElementById('is_corporate_checkbox');
        if (corporateCheckbox) {
            corporateCheckbox.addEventListener('change', function() {
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
        }

        // Trigger initial calculation
        if (typeof calculateOrderShipping === 'function') {
            calculateOrderShipping();
        }
    });

    // --- FIX & UX IMPROVEMENT: Link Payment Method with COD input ---
    const paymentMethodSelect = document.getElementById('payment_method');
    const codInput = document.getElementById('cod_amount');

    if (paymentMethodSelect && codInput) {
        const handlePaymentChange = () => {
            if (paymentMethodSelect.value === 'bank_transfer') {
                codInput.value = 0; // Reset giá trị về 0
                codInput.disabled = true; // Vô hiệu hóa ô nhập
                codInput.style.backgroundColor = '#e9ecef'; // Thêm màu nền để người dùng biết là bị vô hiệu hóa
            } else {
                codInput.disabled = false; // Kích hoạt lại ô nhập
                codInput.style.backgroundColor = '#ffffff'; // Trả lại màu nền trắng
            }
            // Tính toán lại phí ship vì phí COD có thể đã thay đổi
            if (typeof calculateOrderShipping === 'function') {
                calculateOrderShipping();
            }
        };

        // Gắn sự kiện 'change' vào dropdown phương thức thanh toán
        paymentMethodSelect.addEventListener('change', handlePaymentChange);

        // Tự động chạy hàm này một lần khi tải trang
        // để đảm bảo trạng thái ban đầu của ô COD là đúng
        // (quan trọng cho trường hợp "Đặt lại đơn hàng")
        handlePaymentChange();
    }
    // --- END FIX ---

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
