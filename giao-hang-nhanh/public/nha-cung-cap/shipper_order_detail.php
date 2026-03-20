<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Shipper
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'shipper') {
    header("Location: ../login.php");
    exit;
}

$shipper_id = $_SESSION['user_id'];

// --- FIX: Kiểm tra tài khoản bị khóa ---
$stmt_lock = $conn->prepare("SELECT is_locked FROM users WHERE id = ?");
$stmt_lock->bind_param("i", $shipper_id);
$stmt_lock->execute();
$lock_res = $stmt_lock->get_result()->fetch_assoc();
if ($lock_res && $lock_res['is_locked'] == 1) {
    header("Location: ../logout.php");
    exit;
}
$stmt_lock->close();

$order_id = $_GET['id'] ?? 0;
$msg = "";

// Xử lý cập nhật trạng thái (Copy logic từ dashboard)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $new_status = $_POST['update_status'];
    $shipper_note = trim($_POST['shipper_note'] ?? '');
    $pod_image = null;

    // Lấy trạng thái cũ
    $old_status = 'unknown';
    $stmt_st = $conn->prepare("SELECT status FROM orders WHERE id = ?");
    $stmt_st->bind_param("i", $order_id);
    $stmt_st->execute();
    $res_st = $stmt_st->get_result();
    if ($res_st && $row_st = $res_st->fetch_assoc()) {
        $old_status = $row_st['status'];
    }
    $stmt_st->close();

    if ($new_status === 'completed' && isset($_FILES['pod_image']) && $_FILES['pod_image']['error'] == 0) {
        $target_dir = "../uploads/";
        if (!file_exists($target_dir))
            mkdir($target_dir, 0777, true);
        $ext = pathinfo($_FILES['pod_image']['name'], PATHINFO_EXTENSION);
        $filename = "pod_{$order_id}_" . time() . ".{$ext}";
        if (move_uploaded_file($_FILES['pod_image']['tmp_name'], $target_dir . $filename)) {
            $pod_image = $filename;
        }
    }

    if ($new_status === 'decline') {
        // Trả đơn: set shipper_id = NULL, status quay về pending
        $stmt_decline = $conn->prepare("UPDATE orders SET status = 'pending', shipper_id = NULL, shipper_note = ? WHERE id = ? AND shipper_id = ?");
        $decline_note = "[Từ chối bởi Shipper] " . $shipper_note;
        $stmt_decline->bind_param("sii", $decline_note, $order_id, $shipper_id);
        
        if ($stmt_decline->execute()) {
            $msg = "Đã từ chối đơn hàng. Bạn đã được gỡ khỏi đơn này.";
            $conn->query("INSERT INTO order_logs (order_id, user_id, old_status, new_status, note) VALUES ($order_id, $shipper_id, '$old_status', 'pending', 'Shipper từ chối nhận đơn: $shipper_note')");
            header("Location: shipper_dashboard.php?msg=" . urlencode($msg));
            exit;
        } else {
            $msg = "Lỗi: " . $conn->error;
        }
    } else {
        if ($new_status === 'completed' && isset($_FILES['pod_image']) && $_FILES['pod_image']['error'] == 0) {
            $target_dir = "../uploads/";
            if (!file_exists($target_dir))
                mkdir($target_dir, 0777, true);
            $ext = pathinfo($_FILES['pod_image']['name'], PATHINFO_EXTENSION);
            $filename = "pod_{$order_id}_" . time() . ".{$ext}";
            if (move_uploaded_file($_FILES['pod_image']['tmp_name'], $target_dir . $filename)) {
                $pod_image = $filename;
            }
        }
        
        $cancel_reason = trim($_POST['cancel_reason'] ?? '');
        $sql = "UPDATE orders SET status = ?, shipper_note = ?" . ($pod_image ? ", pod_image = '$pod_image'" : "") . ($new_status === 'cancelled' ? ", cancel_reason = ?" : "") . " WHERE id = ? AND shipper_id = ?";
        $stmt = $conn->prepare($sql);
        
        if ($new_status === 'cancelled') {
            $stmt->bind_param("sssii", $new_status, $shipper_note, $cancel_reason, $order_id, $shipper_id);
        } else {
            $stmt->bind_param("ssii", $new_status, $shipper_note, $order_id, $shipper_id);
        }

        if ($stmt->execute()) {
            $msg = "Cập nhật thành công!";
            $log_note = ($new_status === 'cancelled') ? "Lý do: " . $cancel_reason : "";
            // Ghi log
            $log_stmt = $conn->prepare("INSERT INTO order_logs (order_id, user_id, old_status, new_status, note) VALUES (?, ?, ?, ?, ?)");
            $log_stmt->bind_param("iisss", $order_id, $shipper_id, $old_status, $new_status, $log_note);
            $log_stmt->execute();
            $log_stmt->close();

            // --- NEW: Thông báo khách hàng ---
            $stmt_info = $conn->prepare("SELECT user_id, order_code FROM orders WHERE id = ?");
            $stmt_info->bind_param("i", $order_id);
            $stmt_info->execute();
            $order_info = $stmt_info->get_result()->fetch_assoc();
            $stmt_info->close();

            if ($order_info && $order_info['user_id']) {
                $status_map_vn = ['shipping' => 'đang được giao', 'completed' => 'đã hoàn tất', 'cancelled' => 'đã bị hủy'];
                $status_text = $status_map_vn[$new_status] ?? 'đã được cập nhật';
                $notif_msg = "Tài xế thông báo: Đơn hàng #{$order_info['order_code']} của bạn {$status_text}.";
                $notif_link = "customer_order_detail.php?id={$order_id}";
                $notif_stmt = $conn->prepare("INSERT INTO notifications (user_id, order_id, message, link) VALUES (?, ?, ?, ?)");
                if ($notif_stmt) {
                    $notif_stmt->bind_param("iiss", $order_info['user_id'], $order_id, $notif_msg, $notif_link);
                    $notif_stmt->execute();
                    $notif_stmt->close();
                }
            }
        } else {
            $msg = "Lỗi: " . $conn->error;
        }
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
    <link rel="stylesheet" href="../assets/css/styles.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../assets/css/shipper.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_shipper.php'; ?>

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
            <h3 style="color:#0a2a66; margin-bottom:15px; border-bottom:2px solid #ff7a00; display:inline-block;">Thông tin vận chuyển</h3>

            <?php if ($order['client_order_code']): ?>
            <div class="info-row" style="background: #e8f5e9; padding: 10px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #28a745;">
                <span class="info-label" style="color:#2e7d32;">🔖 Mã đơn khách hàng:</span>
                <strong style="color:#2e7d32;"><?php echo htmlspecialchars($order['client_order_code']); ?></strong>
            </div>
            <?php endif; ?>

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

            <div class="info-row" style="background:#f0f7ff; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #cce5ff;">
                <div style="margin-bottom:8px;">
                    <span class="info-label" style="color:#004085;">🕒 Lịch lấy hàng dự kiến:</span>
                    <strong style="color:#d9534f; font-size:16px;">
                        <?php echo $order['pickup_time'] ? date('d/m/Y', strtotime($order['pickup_time'])) : 'Càng sớm càng tốt'; ?>
                    </strong>
                </div>
                <?php if ($order['vehicle_type']): ?>
                <div>
                    <span class="info-label" style="color:#004085;">🛵 Yêu cầu phương tiện:</span>
                    <span class="quote-vehicle-badge" style="background:#ff7a00; color:white; padding:4px 12px; border-radius:6px; font-weight:bold;">
                        <?php echo htmlspecialchars($order['vehicle_type']); ?>
                    </span>
                </div>
                <?php endif; ?>
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

            <?php if ($order['is_corporate']): ?>
            <div style="margin-top:15px; background: #fff8e1; border: 1px solid #ffb300; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-file-invoice-dollar" style="color: #ffb300; font-size: 20px;"></i>
                <div>
                    <strong style="color: #856404; display: block;">Khách yêu cầu Hóa đơn Doanh nghiệp</strong>
                    <span style="font-size: 13px; color: #856404;">Tên cty: <?php echo htmlspecialchars($order['company_name']); ?></span>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <div class="detail-card">
            <h3 style="color:#0a2a66; margin-bottom:15px; border-bottom:2px solid #ff7a00; display:inline-block;">Thông tin hàng hóa & Thanh toán</h3>
            
            <!-- Danh sách món hàng cho Shipper kiểm đếm -->
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px; overflow: hidden;">
                <div style="background: #e9ecef; padding: 8px 12px; font-weight: bold; font-size: 14px; color: #495057;">
                    📦 CHI TIẾT CÁC MÓN HÀNG
                </div>
                <div style="padding: 10px;">
                    <?php 
                    $stmt_items = $conn->prepare("SELECT * FROM order_items WHERE order_id = ?");
                    $stmt_items->bind_param("i", $order['id']);
                    $stmt_items->execute();
                    $items_res = $stmt_items->get_result();
                    if ($items_res && $items_res->num_rows > 0):
                        while ($item = $items_res->fetch_assoc()):
                    ?>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #dee2e6;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 15px;"><?php echo htmlspecialchars($item['item_name']); ?></div>
                                <div style="font-size: 12px; color: #6c757d;">
                                    <?php echo $item['weight']; ?>kg | <?php echo ($item['length'] > 0) ? "{$item['length']}x{$item['width']}x{$item['height']}cm" : 'Kích thước linh hoạt'; ?>
                                </div>
                            </div>
                            <div style="background: #ff7a00; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                                x<?php echo $item['quantity']; ?>
                            </div>
                        </div>
                    <?php 
                        endwhile;
                    else:
                        echo '<div style="padding: 10px; text-align: center; color: #adb5bd; font-size: 13px;">Chi tiết hàng hóa sẽ hiển thị tại đây.</div>';
                    endif;
                    ?>
                </div>
            </div>

            <div class="info-row"><span class="info-label">Loại hàng (Nhóm):</span>
                <?php echo $pkg_map[$order['package_type']] ?? $order['package_type']; ?></div>
            <div class="info-row"><span class="info-label">Tổng cân nặng:</span> <?php echo $order['weight']; ?> kg</div>
            <?php 
                $insurance_fee = 0;
                if (preg_match('/💎 Bảo hiểm hàng hóa: ([\d\.,]+)/', $order['note'], $matches)) {
                    $insurance_fee = (float)str_replace(['.', ','], '', $matches[1]);
                }
                
                $is_receiver_pay = false;
                if (preg_match('/Người trả cước: Người nhận/', $order['note'])) {
                    $is_receiver_pay = true;
                }

                $total_collect = $order['cod_amount'];
                if ($is_receiver_pay) {
                    $total_collect += ($order['shipping_fee'] + $insurance_fee);
                }
            ?>

            <div class="collect-money-box">
                <div style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 10px;">
                    💰 TỔNG TIỀN CẦN THU TẠI ĐIỂM GIAO
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 28px; font-weight: 900; color: #d9534f;"><?php echo number_format($total_collect); ?>đ</span>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #475569; font-weight: 600;">
                            <?php if ($is_receiver_pay): ?>
                                <i class="fa-solid fa-circle-exclamation"></i> Bao gồm Phí ship + Bảo hiểm
                            <?php else: ?>
                                <i class="fa-solid fa-check-circle"></i> Chỉ thu hộ tiền hàng (COD)
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ffd8a8; display: grid; gap: 10px; font-size: 13px;" class="grid-responsive">
                    <div>
                        <span style="color: #64748b;">Tiền hàng (COD):</span>
                        <strong style="color: #0a2a66;"><?php echo number_format($order['cod_amount']); ?>đ</strong>
                    </div>
                    <?php if ($is_receiver_pay): ?>
                    <div>
                        <span style="color: #64748b;">Phí dịch vụ:</span>
                        <strong style="color: #0a2a66;"><?php echo number_format($order['shipping_fee'] + $insurance_fee); ?>đ</strong>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="info-row" style="margin-top: 15px;">
                <span class="info-label">Phương thức phí ship:</span> 
                <?php if ($order['payment_method'] === 'bank_transfer'): ?>
                    <span style="color:#0a2a66; font-weight:600;">Chuyển khoản</span>
                    <?php if ($order['payment_status'] === 'paid'): ?>
                        <span style="margin-left:5px; color:#28a745; font-weight:bold;">[✓ Đã trả]</span>
                    <?php else: ?>
                        <span style="margin-left:5px; color:#dc3545; font-weight:bold;">[⚠ CHƯA TRẢ]</span>
                    <?php endif; ?>
                <?php else: ?>
                    <span style="color:#28a745; font-weight:600;">Tiền mặt (tại điểm giao/nhận)</span>
                <?php endif; ?>
            </div>
            <?php if ($order['payment_method'] === 'bank_transfer' && $order['payment_status'] !== 'paid'): ?>
                <div style="background:#fff5f5; border:1px solid #ffcccc; color:#d9534f; padding:10px; border-radius:6px; margin-top:10px; font-size:14px;">
                    <strong>📢 Ghi chú:</strong> Hệ thống chưa ghi nhận tiền chuyển khoản cho đơn này. Vui lòng kiểm tra kỹ trước khi giao hàng!
                </div>
            <?php endif; ?>
            <div class="info-row" style="margin-top:10px;"><span class="info-label">Lời nhắn từ khách:</span>
                <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #dee2e6; margin-top: 5px; font-size: 14px; font-style: italic; color: #495057;">
                    <?php 
                    $clean_note = $order['note'];
                    $clean_note = preg_replace('/--- CHI TIẾT HÀNG HÓA ---\n(.*?)(?=\n---|\n💎|\n Người trả cước|$)/s', '', $clean_note);
                    $clean_note = preg_replace('/💎 Bảo hiểm hàng hóa: .*/', '', $clean_note);
                    $clean_note = preg_replace('/Người trả cước: .*/', '', $clean_note);
                    $clean_note = preg_replace('/Tệp đính kèm: .*/', '', $clean_note);
                    $clean_note = str_replace(['--- CHI TIẾT HÀNG HÓA ---', '---'], '', $clean_note);
                    echo !empty(trim($clean_note)) ? nl2br(htmlspecialchars(trim($clean_note))) : 'Không có ghi chú thêm.'; 
                    ?>
                </div>
            </div>
        </div>

        <!-- Section: Hình ảnh & Tài liệu đính kèm -->
        <?php 
        $attachment_dir = "../uploads/order_attachments/" . $order['order_code'] . "/";
        $files = [];
        if (is_dir($attachment_dir)) {
            $files = array_diff(scandir($attachment_dir), array('.', '..'));
        }
        
        if (!empty($files)):
        ?>
        <div class="detail-card">
            <h3 style="color:#0a2a66; margin-bottom:15px; border-bottom:2px solid #ff7a00; display:inline-block;">📦 Hình ảnh & Tài liệu đính kèm</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top:10px;">
                <?php foreach ($files as $file): 
                    $file_ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    $is_img = in_array($file_ext, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
                    $file_path = $attachment_dir . $file;
                ?>
                    <div style="width: 100px; text-align: center;">
                        <?php if ($is_img): ?>
                            <a href="<?php echo $file_path; ?>" target="_blank">
                                <img src="<?php echo $file_path; ?>" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #dee2e6;">
                            </a>
                        <?php else: ?>
                            <a href="<?php echo $file_path; ?>" target="_blank" style="display: flex; width: 100px; height: 100px; background: #f8f9fa; border-radius: 6px; flex-direction: column; justify-content: center; align-items: center; text-decoration: none; color: #6c757d; border: 1px dashed #adb5bd;">
                                <i class="fa-solid <?php echo strpos($file_ext, 'pdf') !== false ? 'fa-file-pdf' : 'fa-file-lines'; ?>" style="font-size: 24px; margin-bottom: 4px;"></i>
                                <span style="font-size: 9px; padding: 0 4px; word-break: break-all; overflow: hidden; height: 2.4em; line-height: 1.2;"><?php echo htmlspecialchars($file); ?></span>
                            </a>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

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
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button type="submit" name="update_status" value="shipping" class="btn-primary"
                                style="background:#17a2b8;">🚀 Lấy hàng & Bắt đầu giao</button>
                            <button type="submit" name="update_status" value="decline" class="btn-primary"
                                style="background:#6c757d;" onclick="return confirm('Bạn muốn từ chối đơn hàng này?');">✖ Từ chối đơn</button>
                        </div>
                    <?php elseif ($order['status'] == 'shipping'): ?>
                        <div style="margin-bottom:15px;">
                            <label class="info-label">📸 Ảnh bằng chứng giao hàng (POD):</label>
                            <input type="file" name="pod_image" accept="image/*" style="width:100%;">
                        </div>
                        <input type="hidden" name="cancel_reason" id="cancel_reason_val">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button type="submit" name="update_status" value="completed" class="btn-primary"
                                style="background:#28a745;" onclick="return confirmComplete('<?php echo $order['payment_method']; ?>', '<?php echo $order['payment_status']; ?>');">✅ Đã
                                giao</button>
                            <button type="submit" name="update_status" value="cancelled" class="btn-primary"
                                style="background:#dc3545;" onclick="return confirmCancelDetail();">❌ Hủy đơn</button>
                        </div>
                    <?php endif; ?>
                </form>
            </div>
        <?php elseif ($order['status'] == 'completed'): ?>
            <div class="detail-card" style="background:#d4edda; color:#155724; text-align:center;">
                <h3>✅ Đơn hàng đã hoàn tất</h3>
                <?php if ($order['rating']): ?>
                    <div style="margin-top:15px; padding-top:15px; border-top:1px dashed #28a745; text-align:left;">
                        <span class="info-label">⭐ Đánh giá của khách:</span>
                        <div style="color:#ffcc00; font-size:20px; margin:5px 0;">
                            <?php for($i=1; $i<=5; $i++) echo $i <= $order['rating'] ? '★' : '☆'; ?>
                        </div>
                        <?php if ($order['feedback']): ?>
                            <div style="background:rgba(40,167,69,0.1); padding:10px; border-radius:8px; font-style:italic;">
                                "<?php echo htmlspecialchars($order['feedback']); ?>"
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                
                <?php if ($order['pod_image']): ?>
                    <p style="margin-top:15px;">Ảnh POD:</p>
                    <img src="../uploads/<?php echo htmlspecialchars($order['pod_image']); ?>"
                        style="max-width:200px; border-radius:8px;">
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="detail-card" style="background:#f8d7da; color:#721c24; text-align:center;">
                <h3>❌ Đơn hàng đã hủy</h3>
            </div>
        <?php endif; ?>

    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>
    <script src="../assets/js/main.js?v=<?php echo time(); ?>"></script>
    <script>
        function confirmComplete(method, status) {
            if (method === 'bank_transfer' && status !== 'paid') {
                return confirm('⚠️ CẢNH BÁO: Đơn hàng này thanh toán CHUYỂN KHOẢN nhưng hệ thống ghi nhận CHƯA THANH TOÁN.\n\nBạn có chắc chắn muốn hoàn tất đơn hàng này không? (Hãy đảm bảo khách đã thanh toán hoặc bạn đã thu tiền mặt thay thế)');
            }
            return confirm('Xác nhận giao thành công và đã thu đủ tiền?');
        }

        function confirmCancelDetail() {
            let reason = prompt('Vui lòng nhập lý do hủy đơn:');
            if (reason === null) return false;
            if (reason.trim() === '') {
                alert('Bạn phải nhập lý do hủy đơn!');
                return false;
            }
            document.getElementById('cancel_reason_val').value = reason;
            return confirm('Xác nhận hủy đơn hàng này?');
        }
    </script>
</body>

</html>

