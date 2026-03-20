<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền (Admin hoặc chính chủ đơn hàng)
if (!isset($_SESSION['user_id'])) die("Truy cập bị từ chối.");

$id = $_GET['id'] ?? 0;
// Lấy thông tin đơn hàng (Cho phép Admin xem bất kỳ, khách chỉ xem đơn của mình)
if ($_SESSION['role'] === 'admin') {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->bind_param("i", $id);
} else {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $_SESSION['user_id']);
}
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order) die("Không tìm thấy đơn hàng.");

$svc_map = ['slow' => 'Chậm', 'standard' => 'Tiêu chuẩn', 'fast' => 'Nhanh', 'express' => 'Hỏa tốc', 'instant' => 'Ngay lập tức'];
$pkg_map = ['document' => 'Tài liệu', 'food' => 'Đồ ăn', 'clothes' => 'Quần áo', 'electronic' => 'Điện tử', 'other' => 'Khác'];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hóa đơn điện tử #<?php echo $order['order_code']; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #f8fafc; }
        .invoice-box { max-width: 800px; margin: auto; background: #fff; padding: 50px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0a2a66; padding-bottom: 30px; margin-bottom: 40px; }
        .brand { color: #0a2a66; }
        .brand h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px; }
        .brand p { margin: 5px 0 0; font-size: 14px; opacity: 0.7; font-weight: 600; }
        .invoice-meta { text-align: right; }
        .invoice-meta h2 { margin: 0; font-size: 32px; color: #ff7a00; font-weight: 800; }
        .invoice-meta p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-row span:first-child { color: #64748b; font-weight: 500; }
        .info-row span:last-child { font-weight: 700; color: #1e293b; text-align: right; }
        
        .address-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; font-size: 13px; line-height: 1.6; }
        
        .pay-summary { background: #0a2a66; color: #fff; padding: 30px; border-radius: 15px; margin-top: 40px; }
        .pay-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 15px; opacity: 0.9; }
        .pay-total { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 15px; }
        .pay-total span:last-child { font-size: 28px; font-weight: 800; }
        
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }
        
        @media print {
            body { background: #fff; padding: 0; }
            .invoice-box { box-shadow: none; border: none; width: 100%; max-width: 100%; }
            .no-print { display: none; }
        }
        
        .no-print { text-align: right; margin-bottom: 20px; max-width: 800px; margin-left: auto; margin-right: auto; }
        .btn-print { background: #0a2a66; color: #fff; border: none; padding: 12px 25px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-print:hover { background: #1e293b; transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()" class="btn-print">🖨️ In hóa đơn / Lưu PDF</button>
    </div>

    <div class="invoice-box">
        <div class="header">
            <div class="brand">
                <h1>GLOBALCARE EXPRESS</h1>
                <p>Nền tảng vận chuyển thông minh</p>
            </div>
            <div class="invoice-meta">
                <h2>#<?php echo $order['order_code']; ?></h2>
                <p>Ngày tạo: <?php echo date('d/m/Y H:i', strtotime($order['created_at'])); ?></p>
            </div>
        </div>

        <div class="grid">
            <div>
                <div class="section-title">Thông tin giao nhận</div>
                <div class="info-row"><span>Người gửi:</span> <span><?php echo htmlspecialchars($order['name']); ?></span></div>
                <div class="info-row"><span>SĐT:</span> <span><?php echo htmlspecialchars($order['phone']); ?></span></div>
                <div class="address-box" style="margin-top: 10px;">
                    <strong>Điểm lấy hàng:</strong><br>
                    <?php echo htmlspecialchars($order['pickup_address']); ?>
                </div>
            </div>
            <div>
                <div class="section-title">&nbsp;</div>
                <div class="info-row"><span>Người nhận:</span> <span><?php echo htmlspecialchars($order['receiver_name']); ?></span></div>
                <div class="info-row"><span>SĐT:</span> <span><?php echo htmlspecialchars($order['receiver_phone']); ?></span></div>
                <div class="address-box" style="margin-top: 10px; background: #fff8f1; border-color: #ffe4cc;">
                    <strong>Điểm giao tận nơi:</strong><br>
                    <?php echo htmlspecialchars($order['delivery_address']); ?>
                </div>
            </div>
        </div>

        <div class="grid">
            <div>
                <div class="section-title">Chi tiết bưu kiện</div>
                <div class="info-row"><span>Dịch vụ:</span> <span style="color:#0a2a66"><?php echo $svc_map[$order['service_type']] ?? $order['service_type']; ?></span></div>
                <?php if ($order['vehicle_type']): ?>
                <div class="info-row"><span>Phương tiện:</span> <span style="color:#ff7a00"><?php echo strtoupper($order['vehicle_type']); ?></span></div>
                <?php endif; ?>
                <div class="info-row"><span>Loại hàng:</span> <span><?php echo $pkg_map[$order['package_type']] ?? $order['package_type']; ?></span></div>
                <div class="info-row"><span>Tổng cân nặng:</span> <span><?php echo $order['weight']; ?> kg</span></div>
            </div>
            <div>
                <div class="section-title">Thông tin bổ sung</div>
                <?php if ($order['is_corporate']): ?>
                    <div style="font-size: 12px; margin-bottom: 10px; border-left: 3px solid #28a745; padding-left: 10px;">
                        <strong>Hóa đơn Công ty:</strong><br>
                        <?php echo htmlspecialchars($order['company_name']); ?><br>
                        MST: <?php echo htmlspecialchars($order['company_tax_code']); ?>
                    </div>
                <?php endif; ?>
                <?php if (strpos($order['service_type'], 'intl_') === 0): ?>
                    <div style="font-size: 12px; margin-bottom: 10px; border-left: 3px solid #3b82f6; padding-left: 10px;">
                        <strong>Vận chuyển Quốc tế:</strong><br>
                        ID/Passport: <?php echo htmlspecialchars($order['receiver_id_number']); ?><br>
                        Postal: <?php echo htmlspecialchars($order['intl_postal_code']); ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Bảng kê món hàng chi tiết -->
        <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #f8fafc; text-align: left;">
                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Tên món hàng</th>
                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">SL</th>
                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">Khối lượng</th>
                        <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">Kích thước</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $items_res = $conn->query("SELECT * FROM order_items WHERE order_id = " . $order['id']);
                    if ($items_res && $items_res->num_rows > 0):
                        while ($item = $items_res->fetch_assoc()):
                    ?>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><?php echo htmlspecialchars($item['item_name']); ?></td>
                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;"><?php echo $item['quantity']; ?></td>
                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;"><?php echo $item['weight']; ?> kg</td>
                            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                                <?php echo ($item['length'] > 0) ? "{$item['length']}x{$item['width']}x{$item['height']} cm" : 'N/A'; ?>
                            </td>
                        </tr>
                    <?php 
                        endwhile;
                    else:
                        echo '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #94a3b8;">Không có dữ liệu món hàng chi tiết.</td></tr>';
                    endif;
                    ?>
                </tbody>
            </table>
        </div>

        <div style="margin-top: 20px;">
            <div class="section-title">Ghi chú & Lời nhắn</div>
            <div style="font-size: 13px; color: #475569; font-style: italic; line-height: 1.5; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #f1f5f9;">
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

        <div class="pay-summary">
            <?php 
            $insurance_fee = 0;
            if (preg_match('/💎 Bảo hiểm hàng hóa: ([\d\.,]+)/', $order['note'], $matches)) {
                $insurance_fee = (float)str_replace(['.', ','], '', $matches[1]);
            }
            ?>
            <div class="pay-row">
                <span>Cước phí vận chuyển (Gói <?php echo $svc_map[$order['service_type']] ?? ''; ?>)</span>
                <span><?php echo number_format($order['shipping_fee']); ?>đ</span>
            </div>
            <?php if ($insurance_fee > 0): ?>
            <div class="pay-row" style="opacity: 0.8;">
                <span>💎 Phí bảo hiểm hàng hóa</span>
                <span><?php echo number_format($insurance_fee); ?>đ</span>
            </div>
            <?php endif; ?>
            <div class="pay-row">
                <span>Tiền thu hộ hàng hóa (COD)</span>
                <span><?php echo number_format($order['cod_amount']); ?>đ</span>
            </div>
            <div class="pay-row" style="font-size: 13px; border-top: 1px dashed rgba(255,255,255,0.3); padding-top: 10px; margin-top: 5px;">
                <span>Người trả cước vận chuyển:</span>
                <span style="text-transform: uppercase;">
                    <?php 
                    if (preg_match('/Người trả cước: (.*)/', $order['note'], $matches)) {
                        echo $matches[1];
                    } else {
                        echo 'Người gửi';
                    }
                    ?>
                </span>
            </div>
            <div class="pay-total">
                <span>TỔNG CỘNG GIÁ TRỊ ĐƠN HÀNG</span>
                <span><?php echo number_format($order['shipping_fee'] + $insurance_fee + $order['cod_amount']); ?>đ</span>
            </div>
        </div>

        <div class="footer">
            <p><strong>GLOBALCARE EXPRESS - HẢI PHÒNG / TP.HCM / HÀ NỘI</strong></p>
            <p>Hotline: 1900 6789 | Website: globalcare.com.vn</p>
            <p style="margin-top: 20px; opacity: 0.6;">Đây là hóa đơn điện tử được tạo tự động từ hệ thống quản lý.</p>
        </div>
    </div>
</body>
</html>

