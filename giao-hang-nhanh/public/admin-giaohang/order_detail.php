<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

function base_path(): string
{
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $marker = '/public/';
    $pos = stripos($scriptName, $marker);
    return $pos !== false ? substr($scriptName, 0, $pos + strlen($marker)) : '/giao-hang-nhanh/public/';
}

function upload_root(): string
{
    return dirname(__DIR__) . '/uploads';
}

function decode_json_safe(?string $json): array
{
    if (!$json) {
        return [];
    }
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function collect_files(string $absoluteDir, string $publicPrefix): array
{
    if (!is_dir($absoluteDir)) {
        return [];
    }
    $entries = array_diff(scandir($absoluteDir) ?: [], ['.', '..']);
    $items = [];
    foreach ($entries as $entry) {
        $path = $absoluteDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($path)) {
            continue;
        }
        $items[] = [
            'name' => $entry,
            'extension' => strtolower(pathinfo($entry, PATHINFO_EXTENSION)),
            'url' => rtrim($publicPrefix, '/') . '/' . rawurlencode($entry),
        ];
    }
    usort($items, static fn(array $a, array $b): int => strcmp($a['name'], $b['name']));
    return $items;
}

function media_kind_of(string $extension): string
{
    if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'], true)) {
        return 'image';
    }
    if (in_array($extension, ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'], true)) {
        return 'video';
    }
    return 'file';
}

function money_vnd($value): string
{
    return number_format((float) $value, 0, ',', '.') . 'đ';
}

function dt_vi(?string $value, string $fallback = 'Chưa cập nhật'): string
{
    $text = trim((string) $value);
    if ($text === '') {
        return $fallback;
    }
    $timestamp = strtotime($text);
    return $timestamp === false ? htmlspecialchars($text) : date('d/m/Y H:i', $timestamp);
}

function text_or_dash(?string $value, string $fallback = 'Chưa cập nhật'): string
{
    $text = trim((string) $value);
    return $text !== '' ? htmlspecialchars($text) : $fallback;
}

function status_text(string $status): string
{
    $map = ['pending' => 'Chờ xử lý', 'shipping' => 'Đang giao', 'completed' => 'Hoàn tất', 'cancelled' => 'Đã hủy'];
    return $map[$status] ?? $status;
}

function service_text(string $serviceType): string
{
    $map = ['slow' => 'Chậm', 'standard' => 'Tiêu chuẩn', 'fast' => 'Nhanh', 'express' => 'Hỏa tốc', 'instant' => 'Ngay lập tức', 'intl_economy' => 'Tiêu chuẩn quốc tế', 'intl_express' => 'Hỏa tốc quốc tế'];
    return $map[$serviceType] ?? $serviceType;
}

function payment_method_text(string $paymentMethod): string
{
    $normalized = strtolower(trim($paymentMethod));
    return in_array($normalized, ['bank', 'bank_transfer', 'transfer', 'chuyen_khoan'], true) ? 'Chuyển khoản' : 'Tiền mặt/COD';
}

function clean_customer_note(?string $note): string
{
    $clean = (string) $note;
    $clean = preg_replace('/--- CHI TIẾT HÀNG HÓA ---\n(.*?)(?=\n---|\n💎|\n Người trả cước|$)/us', '', $clean);
    $clean = preg_replace('/💎 Bảo hiểm hàng hóa: .*/u', '', $clean);
    $clean = preg_replace('/Người trả cước: .*/u', '', $clean);
    $clean = preg_replace('/Tệp đính kèm: .*/u', '', $clean);
    $clean = str_replace(['--- CHI TIẾT HÀNG HÓA ---', '---'], '', $clean);
    return trim($clean);
}

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: ../../index.html');
    exit;
}

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    exit('Thiếu ID đơn hàng hợp lệ.');
}

$msg = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_admin_note'])) {
    $adminNote = trim((string) ($_POST['admin_note'] ?? ''));
    $stmt = $conn->prepare('UPDATE orders SET admin_note = ? WHERE id = ?');
    $stmt->bind_param('si', $adminNote, $id);
    $msg = $stmt->execute() ? 'Đã lưu ghi chú nội bộ.' : '';
    $error = $msg === '' ? 'Không thể lưu ghi chú admin.' : '';
    $stmt->close();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_payment_status'])) {
    $paymentStatus = trim((string) ($_POST['payment_status'] ?? ''));
    $stmt = $conn->prepare('UPDATE orders SET payment_status = ? WHERE id = ?');
    $stmt->bind_param('si', $paymentStatus, $id);
    $msg = $stmt->execute() ? 'Đã cập nhật trạng thái thanh toán.' : $msg;
    $error = !$stmt->affected_rows && $msg === '' ? 'Không thể cập nhật thanh toán.' : $error;
    $stmt->close();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['assign_shipper'])) {
    $shipperId = (int) ($_POST['shipper_id'] ?? 0);
    if ($shipperId > 0) {
        $stmt = $conn->prepare('UPDATE orders SET shipper_id = ? WHERE id = ?');
        $stmt->bind_param('ii', $shipperId, $id);
    } else {
        $stmt = $conn->prepare('UPDATE orders SET shipper_id = NULL WHERE id = ?');
        $stmt->bind_param('i', $id);
    }
    if ($stmt && $stmt->execute()) {
        $msg = $shipperId > 0 ? 'Đã phân công shipper.' : 'Đã hủy phân công shipper.';
    } else {
        $error = 'Không thể cập nhật shipper.';
    }
    if ($stmt) {
        $stmt->close();
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $newStatus = trim((string) ($_POST['status'] ?? ''));
    $override = isset($_POST['override_status']);

    $checkStmt = $conn->prepare('SELECT status FROM orders WHERE id = ?');
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    $current = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    $oldStatus = (string) ($current['status'] ?? '');
    $allowed = ($override || $oldStatus === $newStatus);
    if (!$allowed) {
        if ($oldStatus === 'pending' && in_array($newStatus, ['shipping', 'cancelled'], true)) {
            $allowed = true;
        } elseif ($oldStatus === 'shipping' && in_array($newStatus, ['completed', 'cancelled'], true)) {
            $allowed = true;
        }
    }

    if (!$allowed) {
        $error = "Chuyển trạng thái không hợp lệ. Hãy tick 'Cho phép sửa bất kỳ'.";
    } else {
        $stmt = $conn->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $stmt->bind_param('si', $newStatus, $id);
        if ($stmt->execute()) {
            $msg = 'Đã cập nhật trạng thái đơn.';
            $adminId = (int) $_SESSION['user_id'];
            $logStmt = $conn->prepare('INSERT INTO order_logs (order_id, user_id, old_status, new_status) VALUES (?, ?, ?, ?)');
            if ($logStmt) {
                $logStmt->bind_param('iiss', $id, $adminId, $oldStatus, $newStatus);
                $logStmt->execute();
                $logStmt->close();
            }

            $infoStmt = $conn->prepare('SELECT user_id, order_code FROM orders WHERE id = ?');
            $infoStmt->bind_param('i', $id);
            $infoStmt->execute();
            $orderInfo = $infoStmt->get_result()->fetch_assoc();
            $infoStmt->close();

            if ($orderInfo && !empty($orderInfo['user_id'])) {
                $statusMap = [
                    'shipping' => 'đang được giao',
                    'completed' => 'đã hoàn tất',
                    'cancelled' => 'đã bị hủy',
                    'pending' => 'đã được cập nhật',
                ];
                $notifMessage = "Đơn hàng #{$orderInfo['order_code']} của bạn " . ($statusMap[$newStatus] ?? 'đã được cập nhật') . '.';
                $notifLink = base_path() . "khach-hang/chi-tiet-don-hang.html?id={$id}";
                $notifStmt = $conn->prepare('INSERT INTO notifications (user_id, order_id, message, link) VALUES (?, ?, ?, ?)');
                if ($notifStmt) {
                    $notifStmt->bind_param('iiss', $orderInfo['user_id'], $id, $notifMessage, $notifLink);
                    $notifStmt->execute();
                    $notifStmt->close();
                }
            }
        } else {
            $error = 'Không thể cập nhật trạng thái đơn.';
        }
        $stmt->close();
    }
}

$orderStmt = $conn->prepare(
    "SELECT
        o.*,
        u.username AS customer_username,
        u.fullname AS customer_fullname,
        u.phone AS customer_phone,
        u.email AS customer_email,
        s.fullname AS shipper_name,
        s.phone AS shipper_phone,
        s.email AS shipper_email,
        s.vehicle_type AS shipper_vehicle
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN users s ON o.shipper_id = s.id
    WHERE o.id = ?
    LIMIT 1"
);
$orderStmt->bind_param('i', $id);
$orderStmt->execute();
$order = $orderStmt->get_result()->fetch_assoc();
$orderStmt->close();

if (!$order) {
    http_response_code(404);
    exit('Đơn hàng không tồn tại.');
}

$serviceMeta = decode_json_safe($order['service_meta_json'] ?? null);
$feeBreakdown = decode_json_safe($order['pricing_breakdown_json'] ?? null);
$payload = decode_json_safe($order['booking_payload_json'] ?? null);
$items = [];
$itemStmt = $conn->prepare('SELECT item_name, quantity, weight, length, width, height, declared_value FROM order_items WHERE order_id = ? ORDER BY id ASC');
if ($itemStmt) {
    $itemStmt->bind_param('i', $id);
    $itemStmt->execute();
    $res = $itemStmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $items[] = $row;
    }
    $itemStmt->close();
}

$attachments = collect_files(upload_root() . '/order_attachments/' . $order['order_code'], '../uploads/order_attachments/' . rawurlencode((string) $order['order_code']));
$shipperReports = collect_files(upload_root() . '/shipper_reports/' . $order['order_code'], '../uploads/shipper_reports/' . rawurlencode((string) $order['order_code']));
$customerFeedbackMedia = collect_files(upload_root() . '/customer-feedback/' . $order['order_code'], '../uploads/customer-feedback/' . rawurlencode((string) $order['order_code']));
$podImage = !empty($order['pod_image']) ? '../uploads/' . ltrim((string) $order['pod_image'], '/') : '';
$customerNote = clean_customer_note($order['note'] ?? '');
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Chi tiết #<?php echo htmlspecialchars((string) $order['order_code']); ?> | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .detail-layout { display:grid; grid-template-columns:minmax(0,2fr) 340px; gap:24px; }
        .detail-hero,.detail-card,.side-card,.timeline-card { background:#fff; border:1px solid #dbe7ff; border-radius:22px; box-shadow:0 12px 24px rgba(15,23,42,.05); }
        .detail-hero { padding:24px; background:linear-gradient(135deg,#08214f,#0a2a66 60%,#123b87); color:#fff; }
        .detail-hero h1 { margin:0 0 12px; font-size:32px; }
        .hero-meta,.tab-buttons { display:flex; flex-wrap:wrap; gap:10px; }
        .pill,.tab-btn { padding:10px 14px; border-radius:999px; font-weight:800; }
        .pill { background:rgba(255,255,255,.14); display:inline-flex; align-items:center; gap:8px; }
        .hero-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:18px; }
        .hero-stat { padding:14px; border-radius:16px; background:rgba(255,255,255,.12); }
        .hero-stat small { display:block; margin-bottom:6px; color:rgba(255,255,255,.72); font-weight:800; text-transform:uppercase; }
        .hero-stat strong { font-size:20px; }
        .detail-card { padding:18px; margin-top:24px; }
        .tab-btn { border:1px solid #d9e5ff; background:#f8fbff; color:#355086; cursor:pointer; }
        .tab-btn.is-active { background:#0a2a66; border-color:#0a2a66; color:#fff; }
        .tab-panel { display:none; margin-top:18px; }
        .tab-panel.is-active { display:block; }
        .block { padding:18px; border-radius:18px; background:linear-gradient(180deg,#fff,#f8fbff); border:1px solid #e4ecfb; margin-bottom:16px; }
        .block h3 { margin:0 0 14px; color:#0a2a66; font-size:18px; }
        .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .item { padding:14px 16px; border-radius:14px; background:#fff; border:1px solid #e5edf8; }
        .item small { display:block; margin-bottom:6px; color:#8aa0c5; font-weight:800; text-transform:uppercase; }
        .table-wrap { overflow:auto; border:1px solid #e5edf8; border-radius:16px; background:#fff; }
        .table-wrap table { width:100%; border-collapse:collapse; min-width:680px; }
        .table-wrap th,.table-wrap td { padding:14px 16px; text-align:left; border-bottom:1px solid #eef3fb; }
        .table-wrap th { background:#f8fbff; color:#446092; font-size:12px; text-transform:uppercase; }
        .media-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
        .media-card { padding:12px; border-radius:16px; background:#fff; border:1px solid #e5edf8; }
        .media-frame { aspect-ratio:4/3; background:#eef3fb; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .media-frame img,.media-frame video { width:100%; height:100%; object-fit:cover; display:block; }
        .media-card span { display:block; margin-top:10px; font-size:12px; color:#64748b; word-break:break-word; }
        .empty,.note { padding:16px; border-radius:16px; background:#fff; border:1px solid #e5edf8; }
        .empty { border-style:dashed; color:#64748b; text-align:center; font-weight:600; }
        .note { line-height:1.7; font-style:italic; }
        .side-stack { position:sticky; top:96px; display:flex; flex-direction:column; gap:18px; }
        .side-card { padding:18px; }
        .side-card h3,.timeline-card h3 { margin:0 0 14px; color:#0a2a66; }
        .timeline-card { padding:20px; margin-top:24px; }
        .timeline-item { padding:14px 16px; border-radius:16px; background:#f8fbff; border:1px solid #e5edf8; margin-bottom:12px; }
        .notice-success,.notice-error { padding:16px 18px; border-radius:16px; margin-bottom:18px; font-weight:800; }
        .notice-success { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; } .notice-error { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; }
        @media (max-width:1100px) { .detail-layout { grid-template-columns:1fr; } .side-stack { position:static; } }
        @media (max-width:760px) { .hero-stats,.grid { grid-template-columns:1fr; } .detail-hero h1 { font-size:28px; } }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Chi tiết đơn hàng</h2>
            <a href="orders_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quay lại danh sách</a>
        </div>

        <?php if ($msg !== ''): ?><div class="notice-success"><i class="fa-solid fa-circle-check"></i> <?php echo htmlspecialchars($msg); ?></div><?php endif; ?>
        <?php if ($error !== ''): ?><div class="notice-error"><i class="fa-solid fa-triangle-exclamation"></i> <?php echo htmlspecialchars($error); ?></div><?php endif; ?>

        <section class="detail-hero">
            <h1>#<?php echo htmlspecialchars((string) $order['order_code']); ?></h1>
            <div class="hero-meta">
                <span class="pill"><i class="fa-solid fa-bolt"></i> <?php echo htmlspecialchars(service_text((string) ($order['service_type'] ?? ''))); ?></span>
                <span class="pill"><i class="fa-solid fa-circle"></i> <?php echo htmlspecialchars(status_text((string) ($order['status'] ?? ''))); ?></span>
                <span class="pill"><i class="fa-regular fa-clock"></i> <?php echo dt_vi((string) ($order['created_at'] ?? '')); ?></span>
                <?php if (!empty($order['client_order_code'])): ?><span class="pill"><i class="fa-solid fa-hashtag"></i> Ref: <?php echo htmlspecialchars((string) $order['client_order_code']); ?></span><?php endif; ?>
            </div>
            <div class="hero-stats">
                <div class="hero-stat"><small>Tổng giá trị</small><strong><?php echo money_vnd((float) ($order['shipping_fee'] ?? 0) + (float) ($feeBreakdown['insurance_fee'] ?? 0) + (float) ($order['cod_amount'] ?? 0)); ?></strong></div>
                <div class="hero-stat"><small>Phí vận chuyển</small><strong><?php echo money_vnd((float) ($order['shipping_fee'] ?? 0)); ?></strong></div>
                <div class="hero-stat"><small>COD</small><strong><?php echo money_vnd((float) ($order['cod_amount'] ?? 0)); ?></strong></div>
                <div class="hero-stat"><small>Người trả cước</small><strong><?php echo htmlspecialchars(payer_label($order, $payload)); ?></strong></div>
            </div>
        </section>

        <div class="detail-layout">
            <div>
                <section class="detail-card">
                    <div class="tab-buttons">
                        <button type="button" class="tab-btn is-active" data-tab-target="service">Thông tin đặt dịch vụ</button>
                        <button type="button" class="tab-btn" data-tab-target="provider">Thông tin nhà cung cấp</button>
                        <button type="button" class="tab-btn" data-tab-target="customer">Thông tin khách hàng</button>
                    </div>

                    <div class="tab-panel is-active" data-tab-panel="service">
                        <div class="block">
                            <h3>Thông tin đặt dịch vụ</h3>
                            <div class="grid">
                                <div class="item"><small>Ngày lấy hàng</small><div><?php echo text_or_dash($serviceMeta['pickup_date'] ?? ''); ?></div></div>
                                <div class="item"><small>Khung giờ lấy hàng</small><div><?php echo text_or_dash($serviceMeta['pickup_slot_label'] ?? $serviceMeta['pickup_slot'] ?? ''); ?></div></div>
                                <div class="item"><small>Ngày nhận mong muốn</small><div><?php echo text_or_dash($serviceMeta['delivery_date'] ?? ''); ?></div></div>
                                <div class="item"><small>Khung giờ nhận mong muốn</small><div><?php echo text_or_dash($serviceMeta['delivery_slot_label'] ?? $serviceMeta['delivery_slot'] ?? ''); ?></div></div>
                                <div class="item"><small>Thời gian giao dự kiến</small><div><?php echo text_or_dash($serviceMeta['estimated_eta'] ?? ($order['estimated_delivery'] ?? '')); ?></div></div>
                                <div class="item"><small>Từ lấy đến giao</small><div><?php echo text_or_dash($serviceMeta['turnaround_label'] ?? 'Điều phối realtime'); ?></div></div>
                                <div class="item"><small>Phương tiện tính giá</small><div><?php echo text_or_dash($serviceMeta['vehicle_label'] ?? ($order['vehicle_type'] ?? '')); ?></div></div>
                                <div class="item"><small>Phương tiện gợi ý</small><div><?php echo text_or_dash($serviceMeta['vehicle_suggestion'] ?? ''); ?></div></div>
                                <div class="item"><small>Điều kiện áp giá</small><div><?php echo text_or_dash($serviceMeta['service_condition_label'] ?? ''); ?></div></div>
                                <div class="item"><small>Nguồn thời tiết</small><div><?php echo text_or_dash($serviceMeta['weather_source'] ?? ($order['weather_source'] ?? '')); ?></div></div>
                                <div class="item"><small>Khoảng cách tuyến</small><div><?php echo !empty($payload['khoang_cach_km']) ? htmlspecialchars(number_format((float) $payload['khoang_cach_km'], 2, ',', '.')) . ' km' : 'Chưa cập nhật'; ?></div></div>
                                <div class="item"><small>Thanh toán</small><div><?php echo htmlspecialchars(payment_method_text((string) ($order['payment_method'] ?? ''))); ?></div></div>
                            </div>
                        </div>

                        <div class="block">
                            <h3>Hành trình giao nhận</h3>
                            <div class="grid">
                                <div class="item"><small>Điểm lấy hàng</small><div><?php echo text_or_dash($order['pickup_address'] ?? ''); ?></div></div>
                                <div class="item"><small>Điểm giao hàng</small><div><?php echo text_or_dash($order['delivery_address'] ?? ''); ?></div></div>
                                <div class="item"><small>Người gửi</small><div><?php echo text_or_dash($order['name'] ?? ''); ?> - <?php echo text_or_dash($order['phone'] ?? ''); ?></div></div>
                                <div class="item"><small>Người nhận</small><div><?php echo text_or_dash($order['receiver_name'] ?? ''); ?> - <?php echo text_or_dash($order['receiver_phone'] ?? ''); ?></div></div>
                            </div>
                        </div>

                        <div class="block">
                            <h3>Hàng hóa</h3>
                            <?php if (!empty($items)): ?>
                                <div class="table-wrap">
                                    <table>
                                        <thead><tr><th>Tên hàng</th><th>Số lượng</th><th>Cân nặng</th><th>Kích thước</th><th>Khai giá</th></tr></thead>
                                        <tbody>
                                            <?php foreach ($items as $item): ?>
                                                <tr>
                                                    <td><?php echo text_or_dash($item['item_name'] ?? ''); ?></td>
                                                    <td><?php echo (int) ($item['quantity'] ?? 0); ?></td>
                                                    <td><?php echo htmlspecialchars((string) ($item['weight'] ?? 0)); ?> kg</td>
                                                    <td><?php echo htmlspecialchars((string) ($item['length'] ?? 0)) . ' x ' . htmlspecialchars((string) ($item['width'] ?? 0)) . ' x ' . htmlspecialchars((string) ($item['height'] ?? 0)) . ' cm'; ?></td>
                                                    <td><?php echo money_vnd((float) ($item['declared_value'] ?? 0)); ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php else: ?>
                                <div class="empty">Đơn hàng chưa có dữ liệu món hàng chi tiết.</div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <div class="tab-panel" data-tab-panel="provider">
                        <div class="block">
                            <h3>Thông tin nhà cung cấp</h3>
                            <?php if (!empty($order['shipper_id'])): ?>
                                <div class="grid">
                                    <div class="item"><small>Họ tên</small><div><?php echo text_or_dash($order['shipper_name'] ?? ''); ?></div></div>
                                    <div class="item"><small>Số điện thoại</small><div><?php echo text_or_dash($order['shipper_phone'] ?? ''); ?></div></div>
                                    <div class="item"><small>Email</small><div><?php echo text_or_dash($order['shipper_email'] ?? ''); ?></div></div>
                                    <div class="item"><small>Phương tiện</small><div><?php echo text_or_dash($order['shipper_vehicle'] ?? ''); ?></div></div>
                                </div>
                            <?php else: ?>
                                <div class="empty">Đơn hàng chưa được phân công cho nhà cung cấp nào.</div>
                            <?php endif; ?>
                        </div>

                        <div class="block">
                            <h3>Báo cáo công việc và POD</h3>
                            <?php if (!empty($order['shipper_note'])): ?><div class="note" style="margin-bottom:16px;">"<?php echo nl2br(htmlspecialchars((string) $order['shipper_note'])); ?>"</div><?php endif; ?>
                            <?php if (!empty($shipperReports) || $podImage !== ''): ?>
                                <div class="media-grid">
                                    <?php foreach ($shipperReports as $file): ?>
                                        <?php $kind = media_kind_of($file['extension']); ?>
                                        <article class="media-card">
                                            <div class="media-frame">
                                                <?php if ($kind === 'image'): ?>
                                                    <a href="<?php echo htmlspecialchars($file['url']); ?>" target="_blank" rel="noopener noreferrer"><img src="<?php echo htmlspecialchars($file['url']); ?>" alt="<?php echo htmlspecialchars($file['name']); ?>"></a>
                                                <?php elseif ($kind === 'video'): ?>
                                                    <video controls preload="metadata"><source src="<?php echo htmlspecialchars($file['url']); ?>"></video>
                                                <?php else: ?>
                                                    <a href="<?php echo htmlspecialchars($file['url']); ?>" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-lines"></i> Xem tệp</a>
                                                <?php endif; ?>
                                            </div>
                                            <span><?php echo htmlspecialchars($file['name']); ?></span>
                                        </article>
                                    <?php endforeach; ?>
                                    <?php if ($podImage !== ''): ?>
                                        <article class="media-card">
                                            <div class="media-frame"><a href="<?php echo htmlspecialchars($podImage); ?>" target="_blank" rel="noopener noreferrer"><img src="<?php echo htmlspecialchars($podImage); ?>" alt="POD"></a></div>
                                            <span>POD - Bằng chứng giao hàng</span>
                                        </article>
                                    <?php endif; ?>
                                </div>
                            <?php else: ?>
                                <div class="empty">Nhà cung cấp chưa tải lên media báo cáo hoặc POD.</div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <div class="tab-panel" data-tab-panel="customer">
                        <div class="block">
                            <h3>Thông tin khách hàng</h3>
                            <div class="grid">
                                <div class="item"><small>Khách hàng</small><div><?php echo text_or_dash($order['customer_fullname'] ?? $order['name'] ?? ''); ?></div></div>
                                <div class="item"><small>Username</small><div><?php echo text_or_dash($order['customer_username'] ?? ''); ?></div></div>
                                <div class="item"><small>Số điện thoại</small><div><?php echo text_or_dash($order['customer_phone'] ?? $order['phone'] ?? ''); ?></div></div>
                                <div class="item"><small>Email</small><div><?php echo text_or_dash($order['customer_email'] ?? ''); ?></div></div>
                            </div>
                        </div>

                        <?php if ((int) ($order['is_corporate'] ?? 0) === 1): ?>
                            <div class="block">
                                <h3>Thông tin xuất hóa đơn</h3>
                                <div class="grid">
                                    <div class="item"><small>Tên công ty</small><div><?php echo text_or_dash($order['company_name'] ?? ''); ?></div></div>
                                    <div class="item"><small>Email nhận hóa đơn</small><div><?php echo text_or_dash($order['company_email'] ?? ''); ?></div></div>
                                    <div class="item"><small>Mã số thuế</small><div><?php echo text_or_dash($order['company_tax_code'] ?? ''); ?></div></div>
                                    <div class="item"><small>Địa chỉ công ty</small><div><?php echo text_or_dash($order['company_address'] ?? ''); ?></div></div>
                                </div>
                            </div>
                        <?php endif; ?>

                        <div class="block">
                            <h3>Phản hồi và media từ khách hàng</h3>
                            <?php if ($customerNote !== ''): ?><div class="note" style="margin-bottom:16px;">"<?php echo nl2br(htmlspecialchars($customerNote)); ?>"</div><?php endif; ?>
                            <?php if (!empty($order['feedback'])): ?><div class="note" style="margin-bottom:16px;">"<?php echo nl2br(htmlspecialchars((string) $order['feedback'])); ?>"</div><?php endif; ?>
                            <?php if ($order['rating'] !== null && (int) $order['rating'] > 0): ?><div style="margin-bottom:16px;"><span class="pill" style="background:#fff6eb; color:#9a5200;"><i class="fa-solid fa-star"></i> <?php echo (int) $order['rating']; ?>/5 sao</span></div><?php endif; ?>
                            <?php if (!empty($customerFeedbackMedia)): ?>
                                <div class="media-grid">
                                    <?php foreach ($customerFeedbackMedia as $file): ?>
                                        <?php $kind = media_kind_of($file['extension']); ?>
                                        <article class="media-card">
                                            <div class="media-frame">
                                                <?php if ($kind === 'image'): ?>
                                                    <a href="<?php echo htmlspecialchars($file['url']); ?>" target="_blank" rel="noopener noreferrer"><img src="<?php echo htmlspecialchars($file['url']); ?>" alt="<?php echo htmlspecialchars($file['name']); ?>"></a>
                                                <?php elseif ($kind === 'video'): ?>
                                                    <video controls preload="metadata"><source src="<?php echo htmlspecialchars($file['url']); ?>"></video>
                                                <?php else: ?>
                                                    <a href="<?php echo htmlspecialchars($file['url']); ?>" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-lines"></i> Xem tệp</a>
                                                <?php endif; ?>
                                            </div>
                                            <span><?php echo htmlspecialchars($file['name']); ?></span>
                                        </article>
                                    <?php endforeach; ?>
                                </div>
                            <?php else: ?>
                                <div class="empty">Khách hàng chưa tải ảnh hoặc video phản hồi.</div>
                            <?php endif; ?>
                        </div>
                    </div>
                </section>

                <section class="timeline-card">
                    <h3>Nhật ký xử lý đơn</h3>
                    <?php if (!empty($logs)): ?>
                        <?php foreach ($logs as $log): ?>
                            <div class="timeline-item">
                                <small><?php echo dt_vi((string) ($log['created_at'] ?? '')); ?> - <?php echo text_or_dash($log['fullname'] ?? 'Hệ thống'); ?></small>
                                <div>
                                    <span class="pill" style="background:#f8fbff; color:#355086;"><?php echo htmlspecialchars(status_text((string) ($log['old_status'] ?? 'pending'))); ?></span>
                                    <i class="fa-solid fa-arrow-right-long" style="color:#94a3b8; margin:0 8px;"></i>
                                    <span class="pill" style="background:#0a2a66; color:#fff;"><?php echo htmlspecialchars(status_text((string) ($log['new_status'] ?? 'pending'))); ?></span>
                                </div>
                                <?php if (!empty($log['note'])): ?><div style="margin-top:8px; color:#64748b;"><?php echo nl2br(htmlspecialchars((string) $log['note'])); ?></div><?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="empty">Chưa có lịch sử thay đổi trạng thái nào.</div>
                    <?php endif; ?>
                </section>
            </div>

            <aside class="side-stack">
                <section class="side-card">
                    <h3>Điều phối vận hành</h3>
                    <form method="POST" action="?id=<?php echo $id; ?>">
                        <label style="display:block; margin-bottom:8px; font-size:12px; font-weight:800; text-transform:uppercase; color:#8aa0c5;">Trạng thái đơn hàng</label>
                        <select name="status" class="admin-select" style="width:100%; margin-bottom:14px;">
                            <option value="pending" <?php echo ($order['status'] ?? '') === 'pending' ? 'selected' : ''; ?>>Chờ lấy hàng</option>
                            <option value="shipping" <?php echo ($order['status'] ?? '') === 'shipping' ? 'selected' : ''; ?>>Đang giao hàng</option>
                            <option value="completed" <?php echo ($order['status'] ?? '') === 'completed' ? 'selected' : ''; ?>>Giao thành công</option>
                            <option value="cancelled" <?php echo ($order['status'] ?? '') === 'cancelled' ? 'selected' : ''; ?>>Đã hủy đơn</option>
                        </select>
                        <label style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:13px; color:#b91c1c;"><input type="checkbox" name="override_status"> Cho phép sửa bất kỳ</label>
                        <button type="submit" name="update_status" class="btn-primary" style="width:100%; justify-content:center;">Cập nhật trạng thái</button>
                    </form>

                    <hr style="border:0; border-top:1px dashed #dbe7ff; margin:16px 0;">

                    <form method="POST" action="?id=<?php echo $id; ?>">
                        <label style="display:block; margin-bottom:8px; font-size:12px; font-weight:800; text-transform:uppercase; color:#8aa0c5;">Phân công nhà cung cấp</label>
                        <select name="shipper_id" class="admin-select" style="width:100%; margin-bottom:14px;">
                            <option value="0">-- Chưa phân công --</option>
                            <?php foreach ($availableShippers as $shipper): ?>
                                <option value="<?php echo (int) $shipper['id']; ?>" <?php echo (int) ($order['shipper_id'] ?? 0) === (int) ($shipper['id'] ?? 0) ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars((string) $shipper['fullname']); ?><?php if (!empty($shipper['vehicle_type'])): ?> | <?php echo htmlspecialchars((string) $shipper['vehicle_type']); ?><?php endif; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <button type="submit" name="assign_shipper" class="btn-primary" style="width:100%; justify-content:center; background:linear-gradient(135deg,#16a34a,#15803d); border:none;">Lưu phân công</button>
                    </form>
                </section>

                <section class="side-card">
                    <h3>Thanh toán</h3>
                    <div class="item" style="margin-bottom:14px;"><small>Hình thức thanh toán</small><div><?php echo htmlspecialchars(payment_method_text((string) ($order['payment_method'] ?? ''))); ?></div></div>
                    <div class="item" style="margin-bottom:14px;"><small>Người trả cước</small><div><?php echo htmlspecialchars(payer_label($order, $payload)); ?></div></div>
                    <form method="POST" action="?id=<?php echo $id; ?>">
                        <label style="display:block; margin-bottom:8px; font-size:12px; font-weight:800; text-transform:uppercase; color:#8aa0c5;">Trạng thái thanh toán</label>
                        <select name="payment_status" class="admin-select" style="width:100%; margin-bottom:14px;">
                            <option value="unpaid" <?php echo ($order['payment_status'] ?? '') === 'unpaid' ? 'selected' : ''; ?>>Chưa thanh toán</option>
                            <option value="paid" <?php echo ($order['payment_status'] ?? '') === 'paid' ? 'selected' : ''; ?>>Đã thanh toán</option>
                            <option value="refunded" <?php echo ($order['payment_status'] ?? '') === 'refunded' ? 'selected' : ''; ?>>Đã hoàn tiền</option>
                        </select>
                        <button type="submit" name="update_payment_status" class="btn-primary" style="width:100%; justify-content:center;">Lưu thanh toán</button>
                    </form>
                </section>

                <section class="side-card" style="background:#fffde8; border-color:#f7e38e;">
                    <h3>Ghi chú nội bộ</h3>
                    <form method="POST" action="?id=<?php echo $id; ?>">
                        <textarea name="admin_note" class="admin-input" rows="5" placeholder="Chỉ Admin có thể xem nội dung này..."><?php echo htmlspecialchars((string) ($order['admin_note'] ?? '')); ?></textarea>
                        <button type="submit" name="save_admin_note" class="btn-primary" style="width:100%; justify-content:center; margin-top:14px; background:#f57c00; border:none;">Lưu ghi chú</button>
                    </form>
                </section>
            </aside>
        </div>
    </main>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const buttons = Array.from(document.querySelectorAll('[data-tab-target]'));
            const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));
            buttons.forEach((button) => {
                button.addEventListener('click', function () {
                    const target = button.dataset.tabTarget;
                    buttons.forEach((item) => item.classList.toggle('is-active', item === button));
                    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.tabPanel === target));
                });
            });
        });
    </script>
</body>
</html>
