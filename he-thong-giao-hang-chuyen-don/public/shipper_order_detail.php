<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Shipper
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'shipper') {
    header("Location: login.php");
    exit;
}

$shipper_id = $_SESSION['user_id'];

// --- FIX: Kiểm tra tài khoản bị khóa ---
$check_lock = $conn->query("SELECT is_locked FROM users WHERE id = $shipper_id");
if ($check_lock && $check_lock->fetch_assoc()['is_locked'] == 1) {
    header("Location: logout.php");
    exit;
}

$order_id = $_GET['id'] ?? 0;
$msg = "";

// Xử lý cập nhật trạng thái (Copy logic từ dashboard)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $new_status = $_POST['update_status'];
    $shipper_note = trim($_POST['shipper_note'] ?? '');
    $pod_image = null;

    // Lấy trạng thái cũ
    $old_status = 'unknown';
    $check_st = $conn->query("SELECT status FROM orders WHERE id = $order_id");
    if ($check_st && $row_st = $check_st->fetch_assoc()) {
        $old_status = $row_st['status'];
    }

    if ($new_status === 'completed' && isset($_FILES['pod_image']) && $_FILES['pod_image']['error'] == 0) {
        $target_dir = "uploads/";
        if (!file_exists($target_dir))
            mkdir($target_dir, 0777, true);
        $ext = pathinfo($_FILES['pod_image']['name'], PATHINFO_EXTENSION);
        $filename = "pod_{$order_id}_" . time() . ".{$ext}";
        if (move_uploaded_file($_FILES['pod_image']['tmp_name'], $target_dir . $filename)) {
            $pod_image = $filename;
        }
    }

    $sql = "UPDATE orders SET status = ?, shipper_note = ?" . ($pod_image ? ", pod_image = '$pod_image'" : "") . " WHERE id = ? AND shipper_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssii", $new_status, $shipper_note, $order_id, $shipper_id);

    if ($stmt->execute()) {
        $msg = "Cập nhật thành công!";
        // Ghi log
        $conn->query("INSERT INTO order_logs (order_id, user_id, old_status, new_status) VALUES ($order_id, $shipper_id, '$old_status', '$new_status')");
    } else {
        $msg = "Lỗi: " . $conn->error;
    }
}

// Lấy thông tin đơn hàng
$stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND shipper_id = ?");
$stmt->bind_param("ii", $order_id, $shipper_id);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order) {
    die("Đơn hàng không tồn tại hoặc không được phân công cho bạn.");
}

$pkg_map = ['document' => 'Tài liệu', 'food' => 'Đồ ăn', 'clothes' => 'Quần áo', 'electronic' => 'Điện tử', 'other' => 'Khác'];
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Chi tiết đơn hàng #<?php echo $order['order_code']; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin_styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_shipper.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Chi tiết đơn #<?php echo $order['order_code']; ?></h2>
            <a href="shipper_dashboard.php" class="back-link">← Quay lại</a>
        </div>

        <?php if ($msg): ?>
            <div style="padding:10px; background:#d4edda; color:#155724; margin-bottom:15px; border-radius:4px;">
                <?php echo $msg; ?>
            </div><?php endif; ?>

        <div class="detail-card">
            <h3 style="color:#0a2a66; margin-bottom:15px; border-bottom:2px solid #ff7a00; display:inline-block;">Thông
                tin vận chuyển</h3>

            <div class="info-row">
                <span class="info-label">📤 Người gửi:</span>
                <?php echo htmlspecialchars($order['name']); ?> - <a
                    href="tel:<?php echo $order['phone']; ?>"><?php echo $order['phone']; ?></a>
            </div>
            <div class="info-row">
                <span class="info-label">📍 Địa chỉ lấy hàng:</span>
                <?php echo htmlspecialchars($order['pickup_address']); ?>
                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($order['pickup_address']); ?>"
                    target="_blank" class="map-link">🗺️ Chỉ đường</a>
            </div>

            <div class="info-row" style="margin-top:20px;">
                <span class="info-label">📥 Người nhận:</span>
                <?php echo htmlspecialchars($order['receiver_name']); ?> - <a
                    href="tel:<?php echo $order['receiver_phone']; ?>"><?php echo $order['receiver_phone']; ?></a>
            </div>
            <div class="info-row">
                <span class="info-label">🏁 Địa chỉ giao hàng:</span>
                <?php echo htmlspecialchars($order['delivery_address']); ?>
                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($order['delivery_address']); ?>"
                    target="_blank" class="map-link">🗺️ Chỉ đường</a>
            </div>
        </div>

        <div class="detail-card">
            <h3 style="color:#0a2a66; margin-bottom:15px; border-bottom:2px solid #ff7a00; display:inline-block;">Thông
                tin hàng hóa & Thanh toán</h3>
            <div class="info-row"><span class="info-label">Loại hàng:</span>
                <?php echo $pkg_map[$order['package_type']] ?? $order['package_type']; ?></div>
            <div class="info-row"><span class="info-label">Cân nặng:</span> <?php echo $order['weight']; ?> kg</div>
            <div class="info-row">
                <span class="info-label">Phương thức:</span> 
                <?php if ($order['payment_method'] === 'bank_transfer'): ?>
                    <span style="color:#0a2a66; font-weight:600;">Chuyển khoản</span>
                    <?php if ($order['payment_status'] === 'paid'): ?>
                        <span style="margin-left:10px; color:#28a745; font-weight:bold;">[✓ Đã thanh toán]</span>
                    <?php else: ?>
                        <span style="margin-left:10px; color:#dc3545; font-weight:bold;">[⚠ CHƯA THANH TOÁN]</span>
                    <?php endif; ?>
                <?php else: ?>
                    <span style="color:#28a745; font-weight:600;">COD (Tiền mặt)</span>
                <?php endif; ?>
            </div>
            <div class="info-row"><span class="info-label">Thu hộ (COD):</span> <strong
                    style="color:#d9534f; font-size:18px;"><?php echo number_format($order['cod_amount']); ?>đ</strong>
            </div>
            <?php if ($order['payment_method'] === 'bank_transfer' && $order['payment_status'] !== 'paid'): ?>
                <div style="background:#fff5f5; border:1px solid #ffcccc; color:#d9534f; padding:10px; border-radius:6px; margin-top:10px; font-size:14px;">
                    <strong>📢 Ghi chú:</strong> Hệ thống chưa ghi nhận tiền chuyển khoản cho đơn này. Vui lòng kiểm tra kỹ trước khi giao hàng!
                </div>
            <?php endif; ?>
            <div class="info-row" style="margin-top:10px;"><span class="info-label">Ghi chú từ khách:</span>
                <?php echo nl2br(htmlspecialchars($order['note'])); ?></div>
        </div>

        <!-- Khu vực cập nhật trạng thái -->
        <?php if ($order['status'] != 'completed' && $order['status'] != 'cancelled'): ?>
            <div class="action-box">
                <h3>Cập nhật trạng thái</h3>
                <form method="POST" enctype="multipart/form-data">
                    <div style="margin-bottom:15px;">
                        <label class="info-label">Ghi chú của bạn:</label>
                        <textarea name="shipper_note"
                            style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;" rows="3"
                            placeholder="VD: Khách hẹn lại giờ, đường khó đi..."><?php echo htmlspecialchars($order['shipper_note']); ?></textarea>
                    </div>

                    <?php if ($order['status'] == 'pending'): ?>
                        <button type="submit" name="update_status" value="shipping" class="btn-primary"
                            style="width:100%; background:#17a2b8;">🚀 Đã lấy hàng / Bắt đầu giao</button>
                    <?php elseif ($order['status'] == 'shipping'): ?>
                        <div style="margin-bottom:15px;">
                            <label class="info-label">📸 Ảnh bằng chứng giao hàng (POD):</label>
                            <input type="file" name="pod_image" accept="image/*" style="width:100%;">
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button type="submit" name="update_status" value="completed" class="btn-primary"
                                style="background:#28a745;" onclick="return confirmComplete('<?php echo $order['payment_method']; ?>', '<?php echo $order['payment_status']; ?>');">✅ Đã
                                giao</button>
                            <button type="submit" name="update_status" value="cancelled" class="btn-primary"
                                style="background:#dc3545;" onclick="return confirm('Xác nhận hủy đơn?');">❌ Hủy đơn</button>
                        </div>
                    <?php endif; ?>
                </form>
            </div>
        <?php elseif ($order['status'] == 'completed'): ?>
            <div class="detail-card" style="background:#d4edda; color:#155724; text-align:center;">
                <h3>✅ Đơn hàng đã hoàn tất</h3>
                <?php if ($order['pod_image']): ?>
                    <p>Ảnh POD:</p>
                    <img src="uploads/<?php echo htmlspecialchars($order['pod_image']); ?>"
                        style="max-width:200px; border-radius:8px;">
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="detail-card" style="background:#f8d7da; color:#721c24; text-align:center;">
                <h3>❌ Đơn hàng đã hủy</h3>
            </div>
        <?php endif; ?>

    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="assets/js/main.js?v=<?php echo time(); ?>"></script>
    <script>
        function confirmComplete(method, status) {
            if (method === 'bank_transfer' && status !== 'paid') {
                return confirm('⚠️ CẢNH BÁO: Đơn hàng này thanh toán CHUYỂN KHOẢN nhưng hệ thống ghi nhận CHƯA THANH TOÁN.\n\nBạn có chắc chắn muốn hoàn tất đơn hàng này không? (Hãy đảm bảo khách đã thanh toán hoặc bạn đã thu tiền mặt thay thế)');
            }
            return confirm('Xác nhận giao thành công và đã thu đủ tiền?');
        }
    </script>
</body>

</html>
