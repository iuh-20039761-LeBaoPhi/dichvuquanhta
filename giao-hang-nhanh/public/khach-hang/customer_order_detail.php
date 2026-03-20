<?php
session_start();
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/settings_helper.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit;
}

$queryString = $_SERVER['QUERY_STRING'] ?? '';
header("Location: chi-tiet-don-hang.html" . ($queryString !== '' ? '?' . $queryString : ''));
exit;

$id = $_GET['id'] ?? 0;
$user_id = $_SESSION['user_id'];

// Xử lý đánh giá
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_rating'])) {
    $rating = intval($_POST['rating']);
    $feedback = trim($_POST['feedback']);

    $stmt = $conn->prepare("UPDATE orders SET rating = ?, feedback = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("isii", $rating, $feedback, $id, $user_id);
    $stmt->execute();
    $msg = "Cảm ơn bạn đã đánh giá!";
}

// Lấy thông tin đơn hàng (JOIN lấy thông tin Shipper)
$stmt = $conn->prepare("SELECT o.*, u.fullname as shipper_name, u.phone as shipper_phone 
                        FROM orders o 
                        LEFT JOIN users u ON o.shipper_id = u.id 
                        WHERE o.id = ? AND o.user_id = ?");
$stmt->bind_param("ii", $id, $user_id);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order) {
    die("Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.");
}

// Lấy lịch sử trạng thái
$logs = [];
$stmt_log = $conn->prepare("SELECT old_status, new_status, created_at FROM order_logs WHERE order_id = ? ORDER BY created_at ASC");
$stmt_log->bind_param("i", $id);
$stmt_log->execute();
$log_res = $stmt_log->get_result();
if ($log_res)
    while ($r = $log_res->fetch_assoc())
        $logs[] = $r;
$stmt_log->close();

$pkg_map = ['document' => 'Tài liệu', 'food' => 'Đồ ăn', 'clothes' => 'Quần áo', 'electronic' => 'Điện tử', 'other' => 'Khác'];
$svc_map = [
    'slow' => 'Chậm',
    'standard' => 'Tiêu chuẩn',
    'fast' => 'Nhanh',
    'express' => 'Hỏa tốc',
    'instant' => 'Ngay lập tức',
    'bulk' => 'Số lượng lớn (cũ)'
];
$status_map = [
    'pending' => 'Chờ xử lý',
    'shipping' => 'Đang giao hàng',
    'completed' => 'Hoàn tất',
    'cancelled' => 'Đã hủy',
    'unknown' => 'Không xác định'
];
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Chi tiết đơn hàng #<?php echo $order['order_code']; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_user.php'; ?>

    <main class="container" style="padding: 40px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin:0;">Đơn hàng: <span
                    style="color:#ff7a00"><?php echo $order['order_code']; ?></span></h2>
            <div>
                <a href="print_invoice.php?id=<?php echo $order['id']; ?>" target="_blank" class="btn-print">🖨️ In hóa
                    đơn</a>
                <?php if ($order['status'] === 'pending'): ?>
                    <button onclick="openCancelModal('<?php echo $order['order_code']; ?>')" class="btn-secondary"
                        style="color:#d9534f; border-color:#d9534f; padding: 8px 16px; margin-right: 5px;">Hủy đơn hàng</button>
                <?php endif; ?>
                <a href="order_history.php" class="btn-secondary"
                    style="color:#0a2a66; border-color:#0a2a66; padding: 8px 16px;">Quay lại</a>
            </div>
        </div>

        <?php if (isset($msg)): ?>
            <div style="padding:10px; background:#d4edda; color:#155724; margin-bottom:15px; border-radius:4px;">
                <?php echo $msg; ?>
            </div><?php endif; ?>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
            <!-- Cột 1: Thông tin vận chuyển -->
            <div class="detail-box">
                <h3 style="color:#0a2a66; border-bottom:2px solid #ff7a00; padding-bottom:10px; margin-bottom:15px;">
                    Thông tin vận chuyển</h3>
                <div class="info-row"><span class="info-label">Người gửi:</span> <span
                        class="info-val"><?php echo htmlspecialchars($order['name']); ?><br><small><?php echo $order['phone']; ?></small></span>
                </div>
                <div class="info-row"><span class="info-label">Địa chỉ lấy:</span> <span
                        class="info-val"><?php echo htmlspecialchars($order['pickup_address']); ?></span></div>
                <?php if ($order['client_order_code']): ?>
                <div class="info-row"><span class="info-label">Mã đơn khách:</span> <span
                        class="info-val" style="font-family:monospace; color:#0a2a66; font-weight:700;"><?php echo htmlspecialchars($order['client_order_code']); ?></span></div>
                <?php endif; ?>
                <?php if ($order['pickup_time']): ?>
                <div class="info-row"><span class="info-label">Hẹn lấy hàng:</span> <span
                        class="info-val" style="color:#d97706; font-weight:600;"><i class="fa-regular fa-calendar-check"></i> <?php echo date('d/m/Y', strtotime($order['pickup_time'])); ?></span></div>
                <?php endif; ?>

                <div class="info-row"><span class="info-label">Người nhận:</span> <span
                        class="info-val"><?php echo htmlspecialchars($order['receiver_name']); ?><br><small><?php echo $order['receiver_phone']; ?></small></span>
                </div>
                <div class="info-row"><span class="info-label">Địa chỉ giao:</span> <span
                        class="info-val">
                        <?php echo htmlspecialchars($order['delivery_address']); ?>
                        <?php if (!empty($order['intl_province']) || !empty($order['intl_country'])): ?>
                            <br><strong><?php echo htmlspecialchars($order['intl_province']); ?>, <?php echo htmlspecialchars($order['intl_country']); ?></strong>
                        <?php endif; ?>
                        <?php if (!empty($order['intl_postal_code'])): ?>
                            <br>Postal Code: <?php echo htmlspecialchars($order['intl_postal_code']); ?>
                        <?php endif; ?>
                    </span></div>

                <!-- Thẻ Thông tin Shipper (Nếu đã có tài xế) -->
                <?php if ($order['shipper_id']): ?>
                <div class="shipper-info-card" style="margin-top:20px; padding:15px; background:#fff8f1; border:1px solid #ffd8a8; border-radius:8px; display:flex; align-items:center; gap:15px; flex-wrap: wrap;">
                    <div style="width:50px; height:50px; background:#ff7a00; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:20px; flex-shrink: 0;">
                        <i class="fa-solid fa-user-ninja"></i>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-size:12px; color:#c67605; text-transform:uppercase; font-weight:700;">Tài xế phụ trách</div>
                        <div style="font-weight:700; color:#0a2a66; font-size:16px;"><?php echo htmlspecialchars($order['shipper_name']); ?></div>
                        <a href="tel:<?php echo $order['shipper_phone']; ?>" style="color:#ff7a00; text-decoration:none; font-size:14px; font-weight:600;">
                            <i class="fa-solid fa-phone"></i> <?php echo $order['shipper_phone']; ?>
                        </a>
                    </div>
                </div>
                <?php endif; ?>
            </div>

            <!-- Cột 2: Chi tiết & Thanh toán -->
            <div class="detail-box">
                <h3 style="color:#0a2a66; border-bottom:2px solid #ff7a00; padding-bottom:10px; margin-bottom:15px;">Thanh toán & Chi phí</h3>
                
                <!-- Bóc tách Phí Dịch vụ -->
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #0a2a66;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Cước phí dịch vụ</div>
                    
                    <div class="info-row" style="margin-bottom: 5px;">
                        <span class="info-label">Phí vận chuyển (<?php echo $svc_map[$order['service_type']] ?? $order['service_type']; ?>):</span> 
                        <span class="info-val" style="font-weight:700;"><?php echo number_format($order['shipping_fee']); ?>đ</span>
                    </div>

                    <?php 
                    $insurance_fee = 0;
                    if (preg_match('/💎 Bảo hiểm hàng hóa: ([\d\.,]+)/', $order['note'], $matches)) {
                        $insurance_fee = (float)str_replace(['.', ','], '', $matches[1]);
                    ?>
                    <div class="info-row" style="margin-bottom: 5px; color: #d97706;">
                        <span class="info-label"><i class="fa-solid fa-shield-halved"></i> Phí bảo hiểm:</span> 
                        <span class="info-val" style="font-weight:700;"><?php echo number_format($insurance_fee); ?>đ</span>
                    </div>
                    <?php } ?>

                    <div class="info-row" style="margin-top: 8px; border-top: 1px dashed #ced4da; padding-top: 8px;">
                        <span class="info-label" style="font-weight: 700;">Người trả cước:</span> 
                        <span class="info-val" style="font-weight:700; color: #0a2a66;">
                            <?php 
                            if (preg_match('/Người trả cước: (.*)/', $order['note'], $matches)) {
                                echo $matches[1];
                            } else {
                                echo 'Người gửi (Mặc định)';
                            }
                            ?>
                        </span>
                    </div>
                </div>

                <!-- Bóc tách Tiền hàng (COD) -->
                <div style="background: #fff8f1; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #ff7a00;">
                    <div style="font-size: 12px; color: #c67605; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Tiền thu hộ (COD)</div>
                    <div class="info-row">
                        <span class="info-label">Tổng tiền hàng:</span> 
                        <span class="info-val" style="font-weight:800; color:#d9534f; font-size: 18px;"><?php echo number_format($order['cod_amount']); ?>đ</span>
                    </div>
                    <div style="font-size: 11px; color: #a16207; font-style: italic; margin-top: 4px;">* Số tiền Shipper sẽ thu của người nhận hàng.</div>
                </div>

                <div class="info-row" style="background:rgba(10,42,102,0.1); padding:15px; border-radius:8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="info-label" style="font-weight:800; display: block; font-size: 12px; color: #475569;">TỔNG GIÁ TRỊ ĐƠN HÀNG:</span>
                        <span class="info-val" style="font-size:24px; font-weight:800; color:#0a2a66"><?php echo number_format($order['shipping_fee'] + $insurance_fee + $order['cod_amount']); ?>đ</span>
                    </div>
                    <div style="text-align: right;">
                        <div class="info-val" style="font-size: 13px; font-weight: 600; color: #475569;"><?php echo $order['payment_method'] === 'bank_transfer' ? 'Thanh toán: Chuyển khoản' : 'Thanh toán: Tiền mặt'; ?></div>
                        <?php if ($order['payment_method'] === 'bank_transfer'): ?>
                            <?php if ($order['payment_status'] === 'paid'): ?>
                                <span style="display:inline-block; padding:4px 12px; background:#28a745; color:white; border-radius:12px; font-size:12px; font-weight:600;">✓ Đã thanh toán</span>
                            <?php else: ?>
                                <span style="display:inline-block; padding:4px 12px; background:#dc3545; color:white; border-radius:12px; font-size:12px; font-weight:600;">⚠ Chưa thanh toán</span>
                            <?php endif; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <?php if ($order['payment_method'] === 'bank_transfer' && $order['payment_status'] === 'unpaid' && $order['status'] !== 'cancelled'): ?>
                    <div style="margin-top:15px;">
                        <button onclick="openPaymentModal('<?php echo $order['order_code']; ?>', <?php echo $order['shipping_fee'] + $insurance_fee; ?>)" 
                            class="btn-primary" style="width:100%; padding:14px; font-size:16px; font-weight:bold; letter-spacing:0.5px; box-shadow: 0 4px 10px rgba(255,122,0,0.3);">💳 Thanh toán cước phí ngay</button>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <?php if ($order['is_corporate']): ?>
        <div class="detail-box" style="margin-bottom: 25px; border-left: 5px solid #28a745; background: #f0fff4;">
            <h3 style="color:#28a745; border-bottom:2px solid #28a745; padding-bottom:10px; margin-bottom:15px; font-weight: 800;">
                <i class="fa-solid fa-file-invoice-dollar"></i> THÔNG TIN HÓA ĐƠN CÔNG TY</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#155724;">Tên công ty:</span> <span class="info-val" style="font-weight:700; color:#0a2a66;"><?php echo htmlspecialchars($order['company_name']); ?></span></div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#155724;">Mã số thuế:</span> <span class="info-val" style="font-weight:700; color:#0a2a66;"><?php echo htmlspecialchars($order['company_tax_code']); ?></span></div>
                </div>
                <div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#155724;">Email nhận HĐ:</span> <span class="info-val" style="font-weight:600;"><?php echo htmlspecialchars($order['company_email']); ?></span></div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#155724;">Địa chỉ:</span> <span class="info-val" style="font-size:13px;"><?php echo htmlspecialchars($order['company_address']); ?></span></div>
                </div>
            </div>
            <?php if (!empty($order['company_bank_info'])): ?>
                <div class="info-row" style="margin-top: 15px; border-top: 1px dashed #c3e6cb; padding-top:10px;">
                    <span class="info-label" style="text-transform:uppercase; font-size:12px; color:#155724;">Tài khoản ngân hàng:</span> 
                    <span class="info-val" style="font-family:monospace;"><?php echo nl2br(htmlspecialchars($order['company_bank_info'])); ?></span>
                </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php if (strpos($order['service_type'], 'intl_') === 0): ?>
        <div class="detail-box" style="margin-bottom: 25px; border-left: 5px solid #3b82f6; background: #eff6ff;">
            <h3 style="color:#3b82f6; border-bottom:2px solid #3b82f6; padding-bottom:10px; margin-bottom:15px; font-weight: 800;">
                <i class="fa-solid fa-earth-americas"></i> THÔNG TIN VẬN CHUYỂN QUỐC TẾ</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#1e40af;">Số CCCD/HC Người nhận:</span> <span class="info-val" style="font-weight:700; color:#0a2a66;"><?php echo htmlspecialchars($order['receiver_id_number'] ?: 'Chưa cung cấp'); ?></span></div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#1e40af;">Mã bưu chính (Postal Code):</span> <span class="info-val" style="font-weight:700; color:#0a2a66;"><?php echo htmlspecialchars($order['intl_postal_code'] ?: 'N/A'); ?></span></div>
                </div>
                <div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#1e40af;">Mục đích gửi hàng:</span> <span class="info-val" style="font-weight:600; text-transform:capitalize;"><?php echo htmlspecialchars($order['intl_purpose'] ?? 'N/A'); ?></span></div>
                    <div class="info-row"><span class="info-label" style="text-transform:uppercase; font-size:12px; color:#1e40af;">Mã HS Code:</span> <span class="info-val" style="font-weight:600;"><?php echo htmlspecialchars($order['intl_hs_code'] ?? 'N/A'); ?></span></div>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- Lý do hủy (Nếu đơn đã hủy) -->
        <?php if ($order['status'] === 'cancelled' && !empty($order['cancel_reason'])): ?>
        <div class="detail-box" style="margin-bottom: 25px; border-left: 5px solid #d9534f; background: #fff5f5;">
            <h3 style="color:#d9534f; border-bottom:2px solid #d9534f; padding-bottom:10px; margin-bottom:15px; font-weight: 800;">
                <i class="fa-solid fa-circle-xmark"></i> THÔNG TIN HỦY ĐƠN</h3>
            <div class="info-row"><span class="info-label" style="color:#d9534f; font-weight:700;">Lý do hủy:</span> <span class="info-val" style="color:#d9534f; font-weight:600;"><?php echo htmlspecialchars($order['cancel_reason']); ?></span></div>
        </div>
        <?php endif; ?>

        <!-- Ghi chú & Chi tiết hàng hóa -->
        <div class="detail-box" style="margin-bottom: 25px;">
            <h3 style="color:#0a2a66; border-bottom:2px solid #ff7a00; padding-bottom:10px; margin-bottom:15px; font-weight: 800;">DANH SÁCH MÓN HÀNG CHI TIẾT</h3>
            <div class="table-responsive" style="margin-bottom: 20px;">
                <table class="order-table" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #f1f5f9; text-align: left;">
                            <th style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 800;">Tên món hàng</th>
                            <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 800;">SL</th>
                            <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 800;">Khối lượng</th>
                            <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: 800;">Kích thước (DxRxC)</th>
                            <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: 800;">Khai giá</th>
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
                                <td style="padding: 12px; border: 1px solid #e2e8f0;"><?php echo htmlspecialchars($item['item_name']); ?></td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;"><?php echo $item['quantity']; ?></td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;"><?php echo $item['weight']; ?> kg</td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;">
                                    <?php echo ($item['length'] > 0 || $item['width'] > 0 || $item['height'] > 0) ? "{$item['length']}x{$item['width']}x{$item['height']} cm" : 'N/A'; ?>
                                </td>
                                <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;"><?php echo number_format($item['declared_value']); ?>đ</td>
                            </tr>
                        <?php 
                            endwhile;
                        else:
                            // Fallback cho đơn hàng cũ hoặc dùng Regex nếu cần (tạm thời chỉ báo trống nếu không có trong order_items)
                            echo '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">Dữ liệu món hàng chi tiết chưa được chuyển đổi hoặc không có.</td></tr>';
                        endif;
                        ?>
                    </tbody>
                </table>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                <!-- Ghi chú của khách -->
                <div>
                    <h3 style="color:#0a2a66; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px; font-size: 16px;">Ghi chú & Lời nhắn thêm</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; font-style: italic; color: #475569; border: 1px solid #edf2f7; min-height:60px;">
                        <?php 
                        $clean_note = $order['note'];
                        // Loai bo cac thong tin trung lap da hien thi o tren
                        $clean_note = preg_replace('/--- CHI TIẾT HÀNG HÓA ---\n(.*?)(?=\n---|\n💎|\n Người trả cước|$)/s', '', $clean_note);
                        $clean_note = preg_replace('/💎 Bảo hiểm hàng hóa: .*/', '', $clean_note);
                        $clean_note = preg_replace('/Người trả cước: .*/', '', $clean_note);
                        $clean_note = preg_replace('/Tệp đính kèm: .*/', '', $clean_note);
                        $clean_note = str_replace(['--- CHI TIẾT HÀNG HÓA ---', '---'], '', $clean_note);
                        
                        echo !empty(trim($clean_note)) ? nl2br(htmlspecialchars(trim($clean_note))) : 'Không có ghi chú thêm.'; 
                        ?>
                    </div>
                </div>

                <!-- Ghi chú từ Shipper -->
                <?php if (!empty($order['shipper_note'])): ?>
                <div>
                    <h3 style="color:#ff7a00; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px; font-size: 16px;"><i class="fa-solid fa-comment-dots"></i> Phản hồi từ tài xế</h3>
                    <div style="background: #fff8f1; padding: 15px; border-radius: 10px; font-weight: 600; color: #9a5200; border: 1px solid #ffd8a8; min-height:60px;">
                        <?php echo nl2br(htmlspecialchars($order['shipper_note'])); ?>
                    </div>
                </div>
                <?php endif; ?>
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
        <div class="detail-box" style="margin-bottom: 25px;">
            <h3 style="color:#0a2a66; border-bottom:2px solid #ff7a00; padding-bottom:10px; margin-bottom:15px; font-weight: 800;">
                <i class="fa-solid fa-paperclip"></i> HÌNH ẢNH & TÀI LIỆU ĐÍNH KÈM</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                <?php foreach ($files as $file): 
                    $file_ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    $is_img = in_array($file_ext, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
                    $file_path = $attachment_dir . $file;
                ?>
                    <div style="width: 120px; text-align: center;">
                        <?php if ($is_img): ?>
                            <a href="<?php echo $file_path; ?>" target="_blank">
                                <img src="<?php echo $file_path; ?>" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            </a>
                        <?php else: ?>
                            <a href="<?php echo $file_path; ?>" target="_blank" style="display: block; width: 120px; height: 120px; background: #f1f5f9; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-decoration: none; color: #475569; border: 1px dashed #cbd5e1;">
                                <i class="fa-solid <?php echo strpos($file_ext, 'pdf') !== false ? 'fa-file-pdf' : 'fa-file-lines'; ?>" style="font-size: 30px; margin-bottom: 5px;"></i>
                                <span style="font-size: 10px; padding: 0 5px; word-break: break-all;"><?php echo htmlspecialchars($file); ?></span>
                            </a>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Bằng chứng giao hàng -->
        <?php if (!empty($order['pod_image'])): ?>
            <div class="detail-box">
                <h3 style="color:#0a2a66; margin-bottom:15px;">📸 Bằng chứng giao hàng</h3>
                <img src="../uploads/<?php echo htmlspecialchars($order['pod_image']); ?>" alt="POD"
                    style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #eee;">
            </div>
        <?php endif; ?>

        <!-- Lịch sử trạng thái -->
        <div class="detail-box">
            <h3 style="color:#0a2a66; margin-bottom:15px;">Lịch sử trạng thái</h3>

            <?php
            // Chuẩn bị dữ liệu Timeline
            $timeline_data = [];

            // 1. Sự kiện tạo đơn
            $timeline_data[] = [
                'time' => $order['created_at'],
                'status' => 'Đơn hàng được tạo',
                'desc' => 'Đơn hàng đã được khởi tạo trên hệ thống.',
                'code' => 'created'
            ];

            // 2. Các sự kiện thay đổi trạng thái
            foreach ($logs as $log) {
                $st_key = $log['new_status'];
                $status_text = $status_map[$st_key] ?? $st_key;
                $desc = '';

                if ($st_key == 'shipping') {
                    $status_text = "Đang giao hàng";
                    $desc = "Tài xế đã nhận đơn và đang di chuyển đến địa chỉ giao.";
                } elseif ($st_key == 'completed') {
                    $status_text = "Giao hàng thành công";
                    $desc = "Kiện hàng đã được giao tận tay người nhận.";
                } elseif ($st_key == 'cancelled') {
                    $status_text = "Đã hủy";
                    $desc = "Đơn hàng đã bị hủy bỏ.";
                } elseif ($st_key == 'pending') {
                    $status_text = "Chờ xử lý";
                    $desc = "Đang chờ tài xế tiếp nhận đơn hàng.";
                }

                $timeline_data[] = [
                    'time' => $log['created_at'],
                    'status' => $status_text,
                    'desc' => $desc,
                    'code' => $st_key
                ];
            }
            ?>

            <div class="modern-timeline">
                <?php
                $total_events = count($timeline_data);
                foreach ($timeline_data as $index => $event):
                    // Kiểm tra nếu là phần tử cuối cùng (mới nhất)
                    $is_latest = ($index === $total_events - 1);
                    ?>
                    <div
                        class="timeline-item <?php echo $is_latest ? 'latest' : ''; ?> status-<?php echo $event['code']; ?>">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="time"><?php echo date('H:i - d/m/Y', strtotime($event['time'])); ?></div>
                            <div class="status"><?php echo $event['status']; ?></div>
                            <?php if ($event['desc']): ?>
                                <div class="desc"><?php echo $event['desc']; ?></div>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Đánh giá (Chỉ hiện khi hoàn tất) -->
        <?php if ($order['status'] == 'completed'): ?>
            <div class="detail-box">
                <h3 style="color:#0a2a66; margin-bottom:15px;">Đánh giá dịch vụ</h3>
                <?php if ($order['rating']): ?>
                    <div style="text-align:center;">
                        <div style="font-size:30px; color:#ffcc00;">
                            <?php echo str_repeat('★', $order['rating']) . str_repeat('☆', 5 - $order['rating']); ?>
                        </div>
                        <p><em>"<?php echo htmlspecialchars($order['feedback']); ?>"</em></p>
                    </div>
                <?php else: ?>
                    <form method="POST">
                        <div class="rating-stars" id="star-container" style="text-align:center; margin-bottom:10px;">
                            <span data-val="1">★</span><span data-val="2">★</span><span data-val="3">★</span><span
                                data-val="4">★</span><span data-val="5">★</span>
                        </div>
                        <input type="hidden" name="rating" id="rating-input" value="5">
                        <textarea name="feedback" placeholder="Nhập nhận xét của bạn..."
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px;"></textarea>
                        <button type="submit" name="submit_rating" class="btn-primary" style="width:100%;">Gửi đánh giá</button>
                    </form>
                <?php endif; ?>
            </div>
        <?php endif; ?>

    </main>
    
    <!-- Modal Thanh toán QR -->
    <div id="payment-modal" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.5);">
        <div class="modal-content" style="background-color:#fff; margin:5% auto; padding:30px; border:1px solid #888; width:90%; max-width:500px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; color:#0a2a66;">💳 Thanh toán đơn hàng</h3>
                <span class="close" onclick="closePaymentModal()" style="color:#aaa; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
            </div>
            
            <div id="payment-content" style="text-align:center;">
                <p style="margin-bottom:15px; color:#666;">Quét mã QR bên dưới để thanh toán</p>
                <div id="qr-container" style="margin:20px 0;">
                    <!-- QR Code will be inserted here -->
                </div>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-top:20px;">
                    <p style="margin:5px 0;"><strong>Ngân hàng:</strong> <?php echo htmlspecialchars(getSetting($conn, 'bank_name', 'MB Bank')); ?></p>
                    <p style="margin:5px 0;"><strong>Số TK:</strong> <?php echo htmlspecialchars(getSetting($conn, 'bank_account_no', '0333666999')); ?></p>
                    <p style="margin:5px 0;"><strong>Chủ TK:</strong> <?php echo htmlspecialchars(getSetting($conn, 'bank_account_name', 'GIAO HÀNG NHANH')); ?></p>
                    <p style="margin:5px 0; color:#d9534f; font-weight:600;"><strong>Số tiền:</strong> <span id="payment-amount"></span>đ</p>
                    <p style="margin:5px 0; font-size:13px; color:#666;"><strong>Nội dung:</strong> <span id="payment-note"></span></p>
                </div>
                <p style="margin-top:15px; font-size:13px; color:#999;">Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong vòng 1-2 phút.</p>
            </div>
        </div>
    </div>
    
    <!-- Modal Hủy Đơn Hàng -->
    <div id="cancel-modal" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.5);">
        <div class="modal-content" style="background-color:#fff; margin:10% auto; padding:20px; border:1px solid #888; width:90%; max-width:400px; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#d9534f;">⚠️ Hủy Đơn Hàng</h3>
                <span class="close" onclick="closeCancelModal()" style="color:#aaa; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
            </div>
            
            <p style="margin-bottom:15px;">Bạn có chắc chắn muốn hủy đơn hàng này? Thao tác này không thể hoàn tác.</p>
            
            <label for="cancel-reason" style="display:block; margin-bottom:8px; font-weight:600;">Lý do hủy:</label>
            <select id="cancel-reason" onchange="handleReasonChange(this)" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:4px;">
                <option value="" disabled selected>-- Chọn lý do --</option>
                <option value="Thay đổi kế hoạch">Thay đổi kế hoạch</option>
                <option value="Tìm đước đơn vị vận chuyển khác">Tìm được đơn vị vận chuyển khác</option>
                <option value="Sai thông tin người nhận/địa chỉ">Sai thông tin người nhận/địa chỉ</option>
                <option value="other">Lý do khác...</option>
            </select>
            
            <input type="text" id="other-reason-input" placeholder="Nhập lý do của bạn..." style="display:none; width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:4px;">
            
            <div style="text-align:right; margin-top:20px;">
                <button onclick="closeCancelModal()" class="btn-secondary" style="margin-right:10px; padding:8px 16px;">Đóng</button>
                <button id="confirm-cancel-btn" onclick="confirmCancelOrder()" class="btn-primary" style="background-color:#d9534f; border:none; padding:8px 16px;">Xác nhận hủy đơn</button>
            </div>
        </div>
    </div>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>
    
    <script>
        // Bank settings from database
        window.bankSettings = {
            bankId: "<?php echo getSetting($conn, 'bank_id', 'MB'); ?>",
            accountNo: "<?php echo getSetting($conn, 'bank_account_no', '0333666999'); ?>",
            accountName: "<?php echo getSetting($conn, 'bank_account_name', 'GIAO HÀNG NHANH'); ?>",
            template: "<?php echo getSetting($conn, 'qr_template', 'compact'); ?>"
        };
    </script>

    <script>
        // Script chọn sao đánh giá
        const stars = document.querySelectorAll('#star-container span');
        const input = document.getElementById('rating-input');
        if (stars.length > 0) {
            stars.forEach((star, idx) => {
                star.addEventListener('click', () => {
                    input.value = idx + 1;
                    stars.forEach((s, i) => {
                        s.style.color = i <= idx ? '#ffcc00' : '#ddd';
                    });
                });
            });
            // Init active all
            stars.forEach(s => s.style.color = '#ffcc00');
        }
    </script>
</body>

</html>

