<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../../index.html");
    exit;
}

$id = $_GET['id'] ?? 0;
$msg = "";
$error = "";

// Xử lý phân công Shipper
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['assign_shipper'])) {
    $shipper_id = intval($_POST['shipper_id']);
    $stmt = $conn->prepare("UPDATE orders SET shipper_id = ? WHERE id = ?");
    $stmt->bind_param("ii", $shipper_id, $id);
    if ($stmt->execute()) {
        $msg = "Đã phân công shipper thành công!";
        header("Refresh:0");
    } else {
        $error = "Lỗi: " . $conn->error;
    }
}

// Xử lý Cập nhật trạng thái thanh toán
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_payment_status'])) {
    $new_payment_status = $_POST['payment_status'];
    $stmt = $conn->prepare("UPDATE orders SET payment_status = ? WHERE id = ?");
    $stmt->bind_param("si", $new_payment_status, $id);
    if ($stmt->execute()) {
        $msg = "Cập nhật trạng thái thanh toán thành công!";
    } else {
        $error = "Lỗi khi cập nhật thanh toán: " . $conn->error;
    }
}

// Xử lý Cập nhật trạng thái đơn hàng
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $new_status = $_POST['status'];
    $override = isset($_POST['override_status']);

    $check_stmt = $conn->prepare("SELECT status FROM orders WHERE id = ?");
    $check_stmt->bind_param("i", $id);
    $check_stmt->execute();
    $curr = $check_stmt->get_result()->fetch_assoc();
    $old_status = $curr['status'];
    $check_stmt->close();

    $allowed = ($override || $old_status === $new_status) ? true : false;
    if (!$allowed) {
        if ($old_status === 'pending' && in_array($new_status, ['shipping', 'cancelled'])) $allowed = true;
        elseif ($old_status === 'shipping' && in_array($new_status, ['completed', 'cancelled'])) $allowed = true;
    }

    if ($allowed) {
        $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $new_status, $id);
        if ($stmt->execute()) {
            $msg = "Cập nhật trạng thái thành công!";
            $admin_id = $_SESSION['user_id'];
            $log_stmt = $conn->prepare("INSERT INTO order_logs (order_id, user_id, old_status, new_status) VALUES (?, ?, ?, ?)");
            $log_stmt->bind_param("iiss", $id, $admin_id, $old_status, $new_status);
            $log_stmt->execute();
            $log_stmt->close();
            
            // Thông báo khách hàng
            $stmt_info = $conn->prepare("SELECT user_id, order_code FROM orders WHERE id = ?");
            $stmt_info->bind_param("i", $id);
            $stmt_info->execute();
            $order_info = $stmt_info->get_result()->fetch_assoc();
            $stmt_info->close();
            if ($order_info && $order_info['user_id']) {
                $status_map_vn = ['shipping' => 'đang được giao', 'completed' => 'đã hoàn tất', 'cancelled' => 'đã bị hủy'];
                $status_text = $status_map_vn[$new_status] ?? 'đã được cập nhật';
                $notif_msg = "Đơn hàng #{$order_info['order_code']} của bạn {$status_text}.";
                $notif_link = "customer_order_detail.php?id={$id}";
                $notif_stmt = $conn->prepare("INSERT INTO notifications (user_id, order_id, message, link) VALUES (?, ?, ?, ?)");
                if ($notif_stmt) {
                    $notif_stmt->bind_param("iiss", $order_info['user_id'], $id, $notif_msg, $notif_link);
                    $notif_stmt->execute();
                    $notif_stmt->close();
                }
            }
        }
    } else {
        $error = "Chuyển trạng thái không hợp lệ. Hãy tick 'Cho phép sửa bất kỳ' để bỏ qua kiểm tra.";
    }
}

// Lấy thông tin đơn hàng
$stmt = $conn->prepare("SELECT o.*, u.fullname as customer_name, s.fullname as shipper_name, s.phone as shipper_phone 
                        FROM orders o 
                        LEFT JOIN users u ON o.user_id = u.id 
                        LEFT JOIN users s ON o.shipper_id = s.id 
                        WHERE o.id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
if (!$order) die("Đơn hàng không tồn tại.");

$pkg_map = ['document' => 'Tài liệu', 'food' => 'Đồ ăn', 'clothes' => 'Quần áo', 'electronic' => 'Điện tử', 'other' => 'Khác'];
$svc_map = [
    'slow' => 'Chậm', 
    'standard' => 'Tiêu chuẩn', 
    'fast' => 'Nhanh', 
    'express' => 'Hỏa tốc',
    'instant' => 'Ngay lập tức',
    'intl_economy' => 'Tiêu chuẩn quốc tế',
    'intl_express' => 'Hỏa tốc quốc tế'
];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Chi tiết #<?php echo $order['order_code']; ?> | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .admin-timeline {
            position: relative;
            padding: 20px 0;
            list-style: none;
        }
        .admin-timeline::before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 31px;
            width: 2px;
            background: #e2e8f0;
        }
        .timeline-item {
            position: relative;
            margin-bottom: 25px;
            padding-left: 70px;
        }
        .timeline-item .timeline-marker {
            position: absolute;
            left: 20px;
            top: 0;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #cbd5e1;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #64748b;
        }
        .timeline-item.active .timeline-marker {
            background: #0a2a66;
            border-color: #0a2a66;
            color: #fff;
            box-shadow: 0 0 0 4px rgba(10,42,102,0.1);
        }
        .timeline-content {
            background: #f8fafc;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #edf2f7;
            position: relative;
        }
        .timeline-content::before {
            content: '';
            position: absolute;
            left: -8px;
            top: 12px;
            border-top: 8px solid transparent;
            border-bottom: 8px solid transparent;
            border-right: 8px solid #edf2f7;
        }
        .timeline-time {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .timeline-user {
            font-weight: 700;
            color: #334155;
            margin-bottom: 8px;
        }
        .timeline-status-change {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-pending { background: #fff7ed; color: #c2410c; }
        .status-shipping { background: #eff6ff; color: #1d4ed8; }
        .status-completed { background: #f0fdf4; color: #15803d; }
        .status-cancelled { background: #fef2f2; color: #b91c1c; }
        
        .admin-card-body-header {
            padding: 30px; 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            position: relative;
        }
        .connector-line {
            position: absolute; 
            left: 50%; 
            top: 50px; 
            bottom: 50px; 
            border-left: 2px dashed #edf2f7;
        }
        .info-section-label {
            font-size: 14px; 
            text-transform: uppercase; 
            color: #64748b; 
            margin-bottom: 15px;
        }
        .info-highlight-box {
            background: #f8f9fa; 
            padding: 12px; 
            border-radius: 10px; 
            font-size: 14px; 
            line-height: 1.5; 
            margin-bottom: 10px;
        }
        .payment-summary-box {
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 15px; 
            border: 1px solid #edf2f7;
        }
        .total-price-label {
            font-weight: 700; 
            color: #0a2a66; 
            font-size: 14px;
        }
        .total-price-value {
            font-size: 24px; 
            font-weight: 800; 
            color: #0a2a66;
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">
                Chi tiết đơn hàng <span style="color:#64748b;">#<?php echo $order['order_code']; ?></span>
            </h2>
            <a href="orders_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quay lại danh sách</a>
        </div>

        <?php if ($msg): ?>
            <div class="status-badge status-active" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo $msg; ?>
            </div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="status-badge status-cancelled" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-triangle-exclamation"></i> <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <div class="dashboard-layout" style="grid-template-columns: 2fr 1fr; gap: 30px;">
            <div style="display: flex; flex-direction: column; gap: 30px;">
                
                <!-- Section 1: Thông tin người gửi & người nhận -->
                    <div class="admin-card-body-header grid-responsive">
                        <!-- Connector line (Visible on Desktop only) -->
                        <div class="connector-line"></div>
                        
                        <div>
                            <h4 class="info-section-label">Người gửi</h4>
                            <div style="font-weight: 700; font-size: 16px; margin-bottom: 5px;"><?php echo htmlspecialchars($order['name']); ?></div>
                            <div style="color: #64748b; font-size: 14px; margin-bottom: 15px;"><i class="fa-solid fa-phone" style="width: 20px;"></i> <?php echo htmlspecialchars($order['phone']); ?></div>
                            <div class="info-highlight-box">
                                <i class="fa-solid fa-location-dot" style="color: #0a2a66; margin-right: 5px;"></i>
                                <?php echo htmlspecialchars($order['pickup_address']); ?>
                            </div>
                            <?php if ($order['pickup_time']): ?>
                                <div style="font-size: 13px; color: #d9534f; font-weight: 700;">
                                    <i class="fa-regular fa-calendar-check"></i> Hẹn lấy hàng: <?php echo date('d/m/Y', strtotime($order['pickup_time'])); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                        
                        <div>
                            <h4 class="info-section-label">Người nhận</h4>
                            <div style="font-weight: 700; font-size: 16px; margin-bottom: 5px;"><?php echo htmlspecialchars($order['receiver_name']); ?></div>
                            <div style="color: #64748b; font-size: 14px; margin-bottom: 15px;"><i class="fa-solid fa-phone" style="width: 20px;"></i> <?php echo htmlspecialchars($order['receiver_phone']); ?></div>
                            <div class="info-highlight-box" style="background: #fff8f1;">
                                <i class="fa-solid fa-location-arrow" style="color: #ff7a00; margin-right: 5px;"></i>
                                <?php echo htmlspecialchars($order['delivery_address']); ?>
                                <?php if (!empty($order['intl_province']) || !empty($order['intl_country'])): ?>
                                    <br><strong><?php echo htmlspecialchars($order['intl_province']); ?>, <?php echo htmlspecialchars($order['intl_country']); ?></strong>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                <!-- Section: Thông tin Hóa đơn Doanh nghiệp -->
                <?php if ($order['is_corporate']): ?>
                <div class="admin-card" style="border-left: 5px solid #28a745; background: #f0fff4;">
                    <div class="admin-card-header">
                        <h3 style="color: #28a745;"><i class="fa-solid fa-file-invoice-dollar"></i> Yêu cầu Xuất hóa đơn Doanh nghiệp</h3>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr 1.5fr;">
                        <div>
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Tên công ty / Đơn vị</div>
                            <div style="font-weight: 700; color: #0a2a66; margin-bottom: 15px;"><?php echo htmlspecialchars($order['company_name']); ?></div>
                            
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Mã số thuế</div>
                            <div style="font-weight: 700; color: #0a2a66; margin-bottom: 15px;"><?php echo htmlspecialchars($order['company_tax_code']); ?></div>
                            
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Email nhận hóa đơn</div>
                            <div style="font-weight: 700; color: #0a2a66;"><?php echo htmlspecialchars($order['company_email']); ?></div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Địa chỉ trụ sở</div>
                            <div style="font-weight: 600; color: #475569; margin-bottom: 15px;"><?php echo htmlspecialchars($order['company_address']); ?></div>
                            
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Thông tin tài khoản ngân hàng</div>
                            <div style="font-weight: 600; color: #475569;"><?php echo nl2br(htmlspecialchars($order['company_bank_info'])); ?></div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <!-- Section: Thông tin Quốc tế (Nếu có) -->
                <?php if (strpos($order['service_type'], 'intl_') === 0): ?>
                <div class="admin-card" style="border-left: 5px solid #3b82f6; background: #eff6ff;">
                    <div class="admin-card-header">
                        <h3 style="color: #3b82f6;"><i class="fa-solid fa-earth-americas"></i> Thông tin Vận chuyển Quốc tế</h3>
                    </div>
                    <div class="grid-responsive">
                        <div>
                            <div class="form-group">
                                <label>CCCD / Passport Người nhận</label>
                                <div style="font-weight: 700; color: #0a2a66;"><?php echo htmlspecialchars($order['receiver_id_number'] ?: 'N/A'); ?></div>
                            </div>
                            <div class="form-group">
                                <label>Mã bưu chính (Postal Code)</label>
                                <div style="font-weight: 700; color: #0a2a66;"><?php echo htmlspecialchars($order['intl_postal_code'] ?: 'N/A'); ?></div>
                            </div>
                        </div>
                        <div>
                            <div class="form-group">
                                <label>Mã HS / Mục đích gửi</label>
                                <div style="font-weight: 700; color: #0a2a66;">
                                    <?php 
                                    $hs = $order['intl_hs_code'] ?: '';
                                    $purpose = $order['intl_purpose'] ?: '';
                                    echo ($hs ? "HS: $hs" : "") . ($hs && $purpose ? " | " : "") . ($purpose ?: "");
                                    if (!$hs && !$purpose) echo "Chưa cập nhật";
                                    ?>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Dịch vụ quốc tế</label>
                                <div style="font-weight: 700; color: #3b82f6; text-transform: uppercase;"><i class="fa-solid fa-plane-up"></i> <?php echo $order['service_type']; ?></div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <?php if ($order['vehicle_type']): ?>
                    <div style="margin-top: 20px; display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,122,0,0.05); border: 1px dashed #ff7a00; border-radius: 12px;">
                        <div style="width: 45px; height: 45px; background: #ff7a00; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px;">
                            <i class="fa-solid <?php echo strpos(strtolower($order['vehicle_type']), 'tải') !== false ? 'fa-truck' : 'fa-motorcycle'; ?>"></i>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Phương tiện yêu cầu</div>
                            <div style="font-size: 18px; font-weight: 800; color: #ff7a00;"><?php echo strtoupper($order['vehicle_type']); ?></div>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Section 3: Thanh toán (Tiếp tục code cũ) -->

                <!-- Section 2: Hàng hóa & Dịch vụ -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-box-open"></i> Thông tin hàng hóa & Dịch vụ</h3>
                    </div>
                    <div class="grid-responsive-3">
                        <div class="form-group">
                            <label>Loại bưu kiện</label>
                            <div style="font-weight: 600; color: #0a2a66;"><?php echo $pkg_map[$order['package_type']] ?? $order['package_type']; ?></div>
                        </div>
                        <div class="form-group">
                            <label>Khối lượng</label>
                            <div style="font-weight: 600; color: #0a2a66;"><?php echo $order['weight']; ?> kg</div>
                        </div>
                        <div class="form-group">
                            <label>Gói dịch vụ</label>
                            <div style="font-weight: 700; color: #ff7a00; text-transform: uppercase;">
                                <i class="fa-solid fa-bolt"></i> <?php echo $svc_map[$order['service_type']] ?? $order['service_type']; ?>
                            </div>
                        </div>
                    </div>

                    <!-- CHI TIẾT DANH MỤC HÀNG HÓA (Quy trình mới) -->
                    <!-- CHI TIẾT DANH MỤC HÀNG HÓA (Quy trình mới) -->
                    <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #475569; display: flex; justify-content: space-between;">
                            <span>DANH SÁCH MÓN HÀNG CHI TIẾT</span>
                            <span style="color: #64748b; font-weight: normal;">Dữ liệu từ bảng order_items</span>
                        </div>
                        <div class="table-responsive">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Tên món hàng</th>
                                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">SL</th>
                                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">Khối lượng</th>
                                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">Kích thước</th>
                                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">Khai giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php 
                                    $stmt_items = $conn->prepare("SELECT * FROM order_items WHERE order_id = ?");
                                    $stmt_items->bind_param("i", $order['id']);
                                    $stmt_items->execute();
                                    $items_res = $stmt_items->get_result();
                                    if ($items_res && $items_res->num_rows > 0):
                                        while ($item = $items_res->fetch_assoc()):
                                    ?>
                                        <tr>
                                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: 600;"><?php echo htmlspecialchars($item['item_name']); ?></td>
                                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;"><?php echo $item['quantity']; ?></td>
                                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;"><?php echo $item['weight']; ?>kg</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">
                                                <?php echo ($item['length'] > 0 || $item['width'] > 0 || $item['height'] > 0) ? "{$item['length']}x{$item['width']}x{$item['height']}" : '-'; ?>
                                            </td>
                                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600;"><?php echo number_format($item['declared_value']); ?>đ</td>
                                        </tr>
                                    <?php 
                                        endwhile;
                                    else:
                                        // Dự phòng Regex cho đơn cũ
                                        if (preg_match('/--- CHI TIẾT HÀNG HÓA ---\n(.*?)(?=\n---|\n💎|\n Người trả cước|$)/s', $order['note'], $matches)):
                                    ?>
                                        <tr>
                                            <td colspan="5" style="padding: 15px; font-family: monospace; line-height: 1.6; background: #fff;">
                                                <div style="color: #64748b; font-size: 11px; margin-bottom: 5px;">(Dữ liệu từ đơn hàng cũ - Text format)</div>
                                                <?php echo nl2br(trim($matches[1])); ?>
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="5" style="padding: 20px; text-align: center; color: #94a3b8;">Chưa có dữ liệu món hàng chi tiết.</td>
                                        </tr>
                                    <?php endif; endif; ?>
                                </tbody>
                            </table>
                        </div>
                        <?php if (preg_match('/💎 Bảo hiểm hàng hóa: (.*)/', $order['note'], $matches)): ?>
                        <div style="background: #fffbeb; padding: 10px 15px; border-top: 1px solid #fef3c7; color: #92400e; font-weight: 700; font-size: 14px;">
                            <i class="fa-solid fa-shield-halved"></i> <?php echo $matches[0]; ?>
                        </div>
                        <?php endif; ?>
                    </div>

                    <div class="form-group" style="margin-top: 20px;">
                        <label>Ghi chú tổng quát của khách</label>
                        <div class="info-highlight-box" style="background: #f1f5f9; font-style: italic; color: #475569;">
                            "<?php 
                            $clean_note = $order['note'];
                            $clean_note = preg_replace('/--- CHI TIẾT HÀNG HÓA ---\n(.*?)(?=\n---|\n💎|\n Người trả cước|$)/s', '', $clean_note);
                            $clean_note = preg_replace('/💎 Bảo hiểm hàng hóa: .*/', '', $clean_note);
                            $clean_note = preg_replace('/Người trả cước: .*/', '', $clean_note);
                            $clean_note = preg_replace('/Tệp đính kèm: .*/', '', $clean_note);
                            $clean_note = str_replace(['--- CHI TIẾT HÀNG HÓA ---', '---'], '', $clean_note);
                            echo !empty(trim($clean_note)) ? nl2br(htmlspecialchars(trim($clean_note))) : 'Không có ghi chú thêm.'; 
                            ?>"
                        </div>
                    </div>

                    <!-- Ghi chú từ Shipper -->
                    <?php if (!empty($order['shipper_note'])): ?>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="color: #ff7a00;"><i class="fa-solid fa-comment-dots"></i> Phản hồi từ tài xế (Shipper Note)</label>
                        <div style="background: #fff8f1; padding: 15px; border-radius: 10px; font-weight: 600; color: #9a5200; border: 1px solid #ffd8a8;">
                            <?php echo nl2br(htmlspecialchars($order['shipper_note'])); ?>
                        </div>
                    </div>
                    <?php endif; ?>

                    <!-- Lý do hủy -->
                    <?php if ($order['status'] === 'cancelled' && !empty($order['cancel_reason'])): ?>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="color: #dc3545;"><i class="fa-solid fa-circle-xmark"></i> Lý do hủy đơn</label>
                        <div style="background: #fff5f5; padding: 15px; border-radius: 10px; font-weight: 700; color: #dc3545; border: 1px solid #ffcccc;">
                            <?php echo htmlspecialchars($order['cancel_reason']); ?>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Section: Tệp đính kèm (Ảnh/Chứng từ) -->
                <?php 
                $attachment_dir = "../uploads/order_attachments/" . $order['order_code'] . "/";
                $files = [];
                if (is_dir($attachment_dir)) {
                    $files = array_diff(scandir($attachment_dir), array('.', '..'));
                }
                
                if (!empty($files)):
                ?>
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-paperclip"></i> Tệp đính kèm & Hình ảnh</h3>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        <?php foreach($files as $file): 
                            $file_ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                            $is_img = in_array($file_ext, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
                            $file_path = $attachment_dir . $file;
                        ?>
                            <div style="width: 120px; text-align: center;">
                                <?php if ($is_img): ?>
                                    <a href="<?php echo $file_path; ?>" target="_blank">
                                        <img src="<?php echo $file_path; ?>" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;">
                                    </a>
                                <?php else: ?>
                                    <a href="<?php echo $file_path; ?>" target="_blank" style="display: block; width: 100%; height: 100px; background: #f1f5f9; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; border: 1px dashed #cbd5e1; color: #475569;">
                                        <i class="fa-solid <?php echo strpos($file_ext, 'pdf') !== false ? 'fa-file-pdf' : 'fa-file-lines'; ?>" style="font-size: 24px; color: #d9534f; margin-bottom: 5px;"></i>
                                        <span style="font-size: 10px; word-break: break-all; padding: 0 5px;"><?php echo htmlspecialchars($file); ?></span>
                                    </a>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>

                <!-- Section 3: Thanh toán -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-money-bill-wave"></i> Chi tiết thanh toán</h3>
                    </div>
                    <div class="grid-responsive" style="align-items: center;">
                        <div class="payment-summary-box">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span style="color: #64748b;">Phí vận chuyển:</span>
                                <span style="font-weight: 600;"><?php echo number_format($order['shipping_fee']); ?>đ</span>
                            </div>
                            
                            <?php 
                            $insurance_fee = 0;
                            if (preg_match('/💎 Bảo hiểm hàng hóa: ([\d\.,]+)/', $order['note'], $matches)) {
                                $insurance_fee = (float)str_replace(['.', ','], '', $matches[1]);
                            ?>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #d97706;">
                                <span style="color: #64748b;"><i class="fa-solid fa-shield-halved"></i> Phí bảo hiểm:</span>
                                <span style="font-weight: 600;"><?php echo number_format($insurance_fee); ?>đ</span>
                            </div>
                            <?php } ?>

                            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #edf2f7;">
                                <span style="color: #64748b;">Thu hộ (COD):</span>
                                <span style="font-weight: 700; color: #d9534f;"><?php echo number_format($order['cod_amount']); ?>đ</span>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
                                <span class="total-price-label">TỔNG GIÁ TRỊ:</span>
                                <span class="total-price-value"><?php echo number_format($order['shipping_fee'] + $insurance_fee + $order['cod_amount']); ?>đ</span>
                            </div>

                            <div style="background: #fff8f1; padding: 10px; border-radius: 8px; font-size: 13px; color: #9a5200; border: 1px solid #ffd8a8;">
                                <i class="fa-solid fa-circle-info"></i> <strong>Người trả cước:</strong> 
                                <?php 
                                if (preg_match('/Người trả cước: (.*)/', $order['note'], $matches)) {
                                    echo htmlspecialchars($matches[1]);
                                } else {
                                    echo 'Người gửi (Mặc định)';
                                }
                                ?>
                            </div>
                        </div>
                        
                        <div>
                            <div class="form-group">
                                <label>Hình thức thanh toán</label>
                                <div style="font-weight: 700; color: #0a2a66; font-size: 16px; margin-bottom: 15px;">
                                    <?php echo ($order['payment_method'] == 'bank_transfer') ? '<i class="fa-solid fa-credit-card"></i> Chuyển khoản' : '<i class="fa-solid fa-wallet"></i> Tiền mặt (COD)'; ?>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Trạng thái thanh toán</label>
                                <form method="POST" action="?id=<?php echo $id; ?>" style="display: flex; gap: 10px;">
                                    <select name="payment_status" class="admin-select" style="flex: 1;">
                                        <option value="unpaid" <?php echo $order['payment_status'] == 'unpaid' ? 'selected' : ''; ?>>Chưa thanh toán</option>
                                        <option value="paid" <?php echo $order['payment_status'] == 'paid' ? 'selected' : ''; ?>>Đã thanh toán</option>
                                        <option value="refunded" <?php echo $order['payment_status'] == 'refunded' ? 'selected' : ''; ?>>Đã hoàn tiền</option>
                                    </select>
                                    <button type="submit" name="update_payment_status" class="btn-primary" style="padding: 10px 15px;">Lưu</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <aside>
                <!-- Card: Trạng thái & Phân công -->
                <div class="admin-card" style="border-top: 5px solid #0a2a66;">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-gears"></i> Quản lý vận hành</h3>
                    </div>
                    
                    <div class="sidebar-action-group">
                        <!-- Nhóm 1: Trạng thái -->
                        <form method="POST" action="?id=<?php echo $id; ?>">
                            <span class="sidebar-section-title">Trạng thái đơn hàng</span>
                            <div class="form-group" style="margin-bottom: 12px;">
                                <select name="status" class="admin-select" style="font-weight: 700; color: #0a2a66;">
                                    <option value="pending" <?php echo $order['status'] == 'pending' ? 'selected' : ''; ?>>⏳ Chờ lấy hàng</option>
                                    <option value="shipping" <?php echo $order['status'] == 'shipping' ? 'selected' : ''; ?>>🚚 Đang giao hàng</option>
                                    <option value="completed" <?php echo $order['status'] == 'completed' ? 'selected' : ''; ?>>✅ Giao thành công</option>
                                    <option value="cancelled" <?php echo $order['status'] == 'cancelled' ? 'selected' : ''; ?>>❌ Đã hủy đơn</option>
                                </select>
                            </div>
                            
                            <div class="admin-danger-zone" style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 13px; font-weight: 700; color: #ef4444;">Ghi đè quy trình</span>
                                    <span style="font-size: 11px; color: #991b1b; opacity: 0.8;">Bỏ qua kiểm tra logic</span>
                                </div>
                                <label class="switch">
                                    <input type="checkbox" name="override_status">
                                    <span class="slider"></span>
                                </label>
                            </div>
                            
                            <button type="submit" name="update_status" class="btn-primary" style="justify-content: center; width: 100%; margin-top: 15px;">
                                <i class="fa-solid fa-rotate"></i> Cập nhật trạng thái
                            </button>
                        </form>

                        <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin: 5px 0;">

                        <!-- Nhóm 2: Shipper -->
                        <form method="POST" action="?id=<?php echo $id; ?>">
                            <span class="sidebar-section-title">Điều phối vận chuyển</span>

                            <!-- Xe yêu cầu của đơn -->
                            <?php if (!empty($order['vehicle_type'])): ?>
                            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #1e40af; margin-bottom: 10px;">
                                <i class="fa-solid fa-truck-fast"></i> Đơn yêu cầu phương tiện: <strong><?php echo htmlspecialchars($order['vehicle_type']); ?></strong>
                            </div>
                            <?php endif; ?>

                            <div class="form-group" style="margin-bottom: 12px;">
                                <select name="shipper_id" class="admin-select">
                                    <option value="0">-- Chưa phân công --</option>
                                    <?php 
                                    $sh_res = $conn->query("SELECT id, fullname, vehicle_type FROM users WHERE role = 'shipper' AND is_approved = 1 AND is_locked = 0 ORDER BY fullname ASC");
                                    while($sh = $sh_res->fetch_assoc()) {
                                        $is_selected = ($order['shipper_id'] == $sh['id']);
                                        $vehicle = !empty($sh['vehicle_type']) ? $sh['vehicle_type'] : 'Chưa cập nhật xe';
                                        $is_match = (!empty($sh['vehicle_type']) && $sh['vehicle_type'] === $order['vehicle_type']);
                                        $match_tag = $is_match ? ' ✅ Phù hợp' : '';
                                        echo "<option value='{$sh['id']}' " . ($is_selected ? 'selected' : '') . ">{$sh['fullname']} | 🛵 {$vehicle}{$match_tag}</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                            <button type="submit" name="assign_shipper" style="background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; padding: 10px 24px; border-radius: 10px; font-weight: 600; border: none; box-shadow: 0 4px 15px rgba(22,163,74,0.25); cursor: pointer; justify-content: center; width: 100%; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                                <i class="fa-solid fa-user-check"></i> Phân công Shipper
                            </button>
                        </form>
                    </div>

                    <?php if ($order['status'] === 'completed' && $order['pod_image']): ?>
                    <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #edf2f7;">
                        <span class="sidebar-section-title">📸 Bằng chứng giao hàng (POD)</span>
                        <a href="../uploads/<?php echo htmlspecialchars($order['pod_image']); ?>" target="_blank" style="display: block; position: relative; overflow: hidden; border-radius: 12px;">
                            <img src="../uploads/<?php echo htmlspecialchars($order['pod_image']); ?>" style="width: 100%; transition: transform 0.3s ease;">
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 5px; text-align: center; font-size: 11px;">Nhấn để xem ảnh lớn</div>
                        </a>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Card: Ghi chú nội bộ -->
                <div class="admin-card" style="margin-top: 20px; background: #fffde7; border-color: #fff176;">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-user-shield"></i> Ghi chú Admin</h3>
                    </div>
                    <form method="POST" action="?id=<?php echo $id; ?>">
                        <textarea name="admin_note" class="admin-input" rows="4" placeholder="Chỉ Admin có thể xem được nội dung này..."><?php echo htmlspecialchars($order['admin_note'] ?? ''); ?></textarea>
                        <button type="submit" name="save_admin_note" class="btn-primary" style="width: 100%; justify-content: center; margin-top: 15px; background: #f57c00;">Lưu ghi chú</button>
                    </form>
                </div>
            </aside>
        </div>

        <!-- Lịch sử Log (Full Width) -->
        <div class="admin-card" style="margin-top: 30px;">
            <div class="admin-card-header">
                <h3><i class="fa-solid fa-clock-rotate-left"></i> Nhật ký hành trình & Thay đổi trạng thái</h3>
            </div>
            <div class="admin-timeline">
                <?php 
                $stmt_log = $conn->prepare("SELECT l.*, u.fullname FROM order_logs l LEFT JOIN users u ON l.user_id = u.id WHERE l.order_id = ? ORDER BY l.created_at DESC");
                $stmt_log->bind_param("i", $id);
                $stmt_log->execute();
                $log_r = $stmt_log->get_result();
                $first = true;
                if ($log_r && $log_r->num_rows > 0) {
                    while($log = $log_r->fetch_assoc()) {
                        $old_st = htmlspecialchars($log['old_status']);
                        $new_st = htmlspecialchars($log['new_status']);
                        $icon = $first ? 'fa-circle-check' : 'fa-circle';
                        $active_class = $first ? 'active' : '';
                        ?>
                        <div class="timeline-item <?php echo $active_class; ?>">
                            <div class="timeline-marker"><i class="fa-solid <?php echo $icon; ?>"></i></div>
                            <div class="timeline-content">
                                <div class="timeline-time"><?php echo date('d/m/Y H:i', strtotime($log['created_at'])); ?></div>
                                <div class="timeline-user"><i class="fa-solid fa-user-circle"></i> <?php echo htmlspecialchars($log['fullname']); ?></div>
                                <div class="timeline-status-change">
                                    <span class="status-badge status-<?php echo $old_st; ?>"><?php echo $old_st; ?></span>
                                    <i class="fa-solid fa-arrow-right-long" style="color: #cbd5e1;"></i>
                                    <span class="status-badge status-<?php echo $new_st; ?>"><?php echo $new_st; ?></span>
                                </div>
                            </div>
                        </div>
                        <?php
                        $first = false;
                    }
                } else {
                    echo "<div style='padding: 30px; text-align: center; color: #94a3b8;'>Chưa có bản ghi hoạt động nào.</div>";
                }
                $stmt_log->close();
                ?>
                
                <!-- Điểm khởi tạo đơn -->
                <div class="timeline-item">
                    <div class="timeline-marker"><i class="fa-solid fa-star"></i></div>
                    <div class="timeline-content">
                        <div class="timeline-time"><?php echo date('d/m/Y H:i', strtotime($order['created_at'])); ?></div>
                        <div class="timeline-user">Hệ thống</div>
                        <div style="font-weight: 600; color: #64748b;">Đơn hàng đã được tạo thành công</div>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>
</html>

