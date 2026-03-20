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
$check_lock = $conn->query("SELECT is_locked FROM users WHERE id = $shipper_id");
if ($check_lock && $check_lock->fetch_assoc()['is_locked'] == 1) {
    header("Location: ../logout.php");
    exit;
}

$msg = "";

// Xử lý cập nhật trạng thái
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $order_id = intval($_POST['order_id']);
    $new_status = $_POST['update_status']; // Lấy giá trị từ nút bấm
    $shipper_note = trim($_POST['shipper_note'] ?? '');
    $cancel_reason = trim($_POST['cancel_reason'] ?? '');
    $pod_image = null;

    // Lấy trạng thái cũ trước khi update
    $old_status = 'unknown';
    $check_st = $conn->query("SELECT status FROM orders WHERE id = $order_id");
    if ($check_st && $row_st = $check_st->fetch_assoc()) {
        $old_status = $row_st['status'];
    }

    if ($new_status === 'decline') {
        // Trả đơn: set shipper_id = NULL, status quay về pending
        $sql = "UPDATE orders SET status = 'pending', shipper_id = NULL, shipper_note = ? WHERE id = ? AND shipper_id = ?";
        $stmt = $conn->prepare($sql);
        $decline_note = "[Từ chối bởi Shipper] " . $shipper_note;
        $stmt->bind_param("sii", $decline_note, $order_id, $shipper_id);
        
        if ($stmt->execute()) {
            $msg = "Đã từ chối đơn hàng #$order_id. Đã được chuyển về danh sách chờ phân công.";
            $conn->query("INSERT INTO order_logs (order_id, user_id, old_status, new_status, note) VALUES ($order_id, $shipper_id, '$old_status', 'pending', 'Shipper từ chối nhận đơn: $shipper_note')");
        } else {
            $msg = "Lỗi: " . $conn->error;
        }
    } else {
        // Xử lý upload ảnh nếu hoàn tất đơn
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

        $sql = "UPDATE orders SET status = ?, shipper_note = ?" . ($pod_image ? ", pod_image = '$pod_image'" : "") . ($new_status === 'cancelled' ? ", cancel_reason = ?" : "") . " WHERE id = ? AND shipper_id = ?";
        $stmt = $conn->prepare($sql);
        
        if ($new_status === 'cancelled') {
            $stmt->bind_param("sssii", $new_status, $shipper_note, $cancel_reason, $order_id, $shipper_id);
        } else {
            $stmt->bind_param("ssii", $new_status, $shipper_note, $order_id, $shipper_id);
        }

        if ($stmt->execute()) {
            $msg = "Đã cập nhật trạng thái đơn hàng #$order_id";
            $log_note = ($new_status === 'cancelled') ? "Lý do: " . $cancel_reason : "";
            $conn->query("INSERT INTO order_logs (order_id, user_id, old_status, new_status, note) VALUES ($order_id, $shipper_id, '$old_status', '$new_status', '$log_note')");
        } else {
            $msg = "Lỗi: " . $conn->error;
        }
    }
}

// --- TÍNH NĂNG THÔNG BÁO ---
// 1. Đếm đơn mới phân công (Chờ lấy hàng)
$stmt_notify_new = $conn->prepare("SELECT COUNT(*) as count FROM orders WHERE shipper_id = ? AND status = 'pending'");
$stmt_notify_new->bind_param("i", $shipper_id);
$stmt_notify_new->execute();
$new_orders_count = $stmt_notify_new->get_result()->fetch_assoc()['count'];
$stmt_notify_new->close();

// 2. Lấy thông báo từ Admin (Log thay đổi trạng thái trong 3 ngày gần nhất)
$admin_logs = [];
$sql_notify_admin = "SELECT l.old_status, l.new_status, l.created_at, o.order_code, u.fullname as admin_name 
                     FROM order_logs l 
                     JOIN orders o ON l.order_id = o.id 
                     JOIN users u ON l.user_id = u.id 
                     WHERE o.shipper_id = ? AND u.role = 'admin' AND l.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY) 
                     ORDER BY l.created_at DESC LIMIT 5";
$stmt_notify_admin = $conn->prepare($sql_notify_admin);
$stmt_notify_admin->bind_param("i", $shipper_id);
$stmt_notify_admin->execute();
$res_notify = $stmt_notify_admin->get_result();
while ($row = $res_notify->fetch_assoc()) {
    $admin_logs[] = $row;
}
$stmt_notify_admin->close();

// 3. Tổng kết ngày hôm nay
$today = date('Y-m-d');
$stmt_today = $conn->prepare("SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
    SUM(CASE WHEN status = 'completed' THEN shipping_fee ELSE 0 END) as revenue
    FROM orders 
    WHERE shipper_id = ? AND DATE(created_at) = ?"); // Simplified for now since orders are usually same day
$stmt_today->bind_param("is", $shipper_id, $today);
$stmt_today->execute();
$day_stats = $stmt_today->get_result()->fetch_assoc();
$stmt_today->close();
// ---------------------------

// Xử lý bộ lọc trạng thái
$status_filter = $_GET['status'] ?? 'active'; // Mặc định hiện đơn đang xử lý
$search = trim($_GET['search'] ?? '');
$date_filter = $_GET['date'] ?? '';
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit = 10; // Số đơn mỗi trang
$offset = ($page - 1) * $limit;
if ($page < 1)
    $page = 1;

// 1. Đếm tổng số bản ghi
$count_sql = "SELECT COUNT(*) as total FROM orders WHERE shipper_id = ?";
$sql = "SELECT * FROM orders WHERE shipper_id = ?";
$params = [$shipper_id];
$types = "i";

if ($status_filter === 'active') {
    $condition = " AND status IN ('pending', 'shipping')";
} elseif ($status_filter !== 'all') {
    $condition = " AND status = ?";
    $params[] = $status_filter;
    $types .= "s";
}

if (isset($condition)) {
    $sql .= $condition;
    $count_sql .= $condition;
}

// Xử lý tìm kiếm (Mã đơn, Tên người gửi, Tên người nhận)
if (!empty($search)) {
    $condition = " AND (order_code LIKE ? OR name LIKE ? OR receiver_name LIKE ?)";
    $sql .= $condition;
    $count_sql .= $condition;
    $searchTerm = "%$search%";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "sss";
}

// Xử lý lọc theo ngày
if (!empty($date_filter)) {
    $condition = " AND DATE(created_at) = ?";
    $sql .= $condition;
    $count_sql .= $condition;
    $params[] = $date_filter;
    $types .= "s";
}

// Thực hiện đếm
$stmt_count = $conn->prepare($count_sql);
$stmt_count->bind_param($types, ...$params);
$stmt_count->execute();
$total_records = $stmt_count->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);
$stmt_count->close();

// 2. Lấy dữ liệu phân trang
$sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$pkg_map = [
    'document' => 'Tài liệu',
    'food' => 'Đồ ăn',
    'clothes' => 'Quần áo',
    'electronic' => 'Điện tử',
    'other' => 'Khác'
];
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Shipper Dashboard | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/styles.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../assets/css/shipper.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_shipper.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Đơn hàng cần giao</h2>
            <div style="display:flex; align-items:center; gap:15px;">
                <span>Xin chào, <?php echo htmlspecialchars($_SESSION['username']); ?></span>
                <a href="shipper_profile.php" class="btn-action-sm"
                    style="background: #28a745; text-decoration: none;">👤 Hồ sơ & Thu nhập</a>
            </div>
        </div>

        <!-- Khu vực Thông báo -->
        <?php if ($new_orders_count > 0 || !empty($admin_logs)): ?>
            <div class="shipper-notification-box">
                <h3>🔔 Thông báo mới</h3>
                <?php if ($new_orders_count > 0): ?>
                    <div class="new-orders-alert">
                        <strong>📦 Bạn có <?php echo $new_orders_count; ?> đơn hàng mới cần lấy!</strong>
                        <a href="?status=pending" style="color: #856404; text-decoration: underline; margin-left: 5px;">Xem ngay</a>
                    </div>
                <?php endif; ?>
                <?php if (!empty($admin_logs)): ?>
                    <ul class="admin-log-list">
                        <?php foreach ($admin_logs as $log): ?>
                            <li>
                                <span style="color: #666; font-size: 12px;">[<?php echo date('d/m H:i', strtotime($log['created_at'])); ?>]</span>
                                <strong>Admin <?php echo htmlspecialchars($log['admin_name']); ?></strong>
                                đã cập nhật đơn <strong>#<?php echo $log['order_code']; ?></strong>:
                                <span style="color: #d9534f;"><?php echo $log['old_status']; ?></span> ➔
                                <span style="color: #28a745; font-weight:bold;"><?php echo $log['new_status']; ?></span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <!-- Widget Tổng kết ngày -->
        <div class="shipper-card" style="margin-bottom: 25px; border-left: 5px solid #28a745; background: #f0fff4;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; font-size:18px; color:#1b4332;"><i class="fa-solid fa-chart-line"></i> Tổng kết hôm nay (<?php echo date('d/m'); ?>)</h3>
                <a href="shipper_profile.php" style="font-size:13px; color:#2d6a4f; text-decoration:none; font-weight:600;">Xem chi tiết &rarr;</a>
            </div>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; text-align:center;">
                <div style="background:white; padding:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:12px; color:#666;">Đơn nhận</div>
                    <div style="font-size:18px; font-weight:700; color:#0a2a66;"><?php echo $day_stats['total']; ?></div>
                </div>
                <div style="background:white; padding:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:12px; color:#666;">Thành công</div>
                    <div style="font-size:18px; font-weight:700; color:#28a745;"><?php echo $day_stats['completed']; ?></div>
                </div>
                <div style="background:white; padding:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:12px; color:#666;">Tiền ship</div>
                    <div style="font-size:18px; font-weight:700; color:#ff7a00;"><?php echo number_format($day_stats['revenue']); ?>đ</div>
                </div>
            </div>
        </div>

        <!-- Bộ lọc trạng thái -->
        <div class="filter-tabs">
            <a href="?status=active" class="filter-tab <?php echo $status_filter == 'active' ? 'active' : ''; ?>">Đang
                xử lý</a>
            <a href="?status=pending" class="filter-tab <?php echo $status_filter == 'pending' ? 'active' : ''; ?>">Chờ
                lấy hàng</a>
            <a href="?status=shipping"
                class="filter-tab <?php echo $status_filter == 'shipping' ? 'active' : ''; ?>">Đang giao</a>
            <a href="?status=completed"
                class="filter-tab <?php echo $status_filter == 'completed' ? 'active' : ''; ?>">Đã giao</a>
            <a href="?status=cancelled"
                class="filter-tab <?php echo $status_filter == 'cancelled' ? 'active' : ''; ?>">Đã hủy</a>
            <a href="?status=all" class="filter-tab <?php echo $status_filter == 'all' ? 'active' : ''; ?>">Tất cả</a>
        </div>

        <!-- Form Tìm kiếm & Lọc -->
        <form method="GET" action="" class="shipper-search-form">
            <input type="hidden" name="status" value="<?php echo htmlspecialchars($status_filter); ?>">
            <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="🔍 Tìm mã đơn, tên người gửi/nhận...">
            <input type="date" name="date" value="<?php echo htmlspecialchars($date_filter); ?>" title="Lọc theo ngày nhận đơn">
            <button type="submit" class="btn-action-sm" style="background: #0a2a66;">Lọc</button>
            <?php if (!empty($search) || !empty($date_filter)): ?>
                <a href="shipper_dashboard.php?status=<?php echo $status_filter; ?>" style="color: #d9534f; text-decoration: none; font-size: 14px;">❌ Xóa lọc</a>
            <?php endif; ?>
        </form>

        <?php if ($msg): ?>
            <div style="padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; margin-bottom: 15px;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <div class="shipper-orders">
            <?php if ($result->num_rows > 0): ?>
                <?php while ($row = $result->fetch_assoc()): ?>
                    <div class="shipper-card <?php echo $row['status']; ?>">
                        <div class="card-header">
                            <div style="display:flex; flex-direction:column;">
                                <span style="color:#0a2a66; font-weight:bold;">#<?php echo $row['order_code']; ?></span>
                                <?php if ($row['client_order_code']): ?>
                                    <span style="font-size:11px; color:#28a745;">Ref: <?php echo htmlspecialchars($row['client_order_code']); ?></span>
                                <?php endif; ?>
                            </div>
                            <span class="status-badge status-<?php echo $row['status']; ?>">
                                <?php
                                $st_label = [
                                    'pending' => 'Chờ lấy hàng',
                                    'shipping' => 'Đang giao',
                                    'completed' => 'Hoàn tất',
                                    'cancelled' => 'Đã hủy'
                                ];
                                echo $st_label[$row['status']] ?? $row['status'];
                                ?>
                            </span>
                        </div>
                        <div class="card-body">
                            <p><strong>📤 Người gửi:</strong> <?php echo htmlspecialchars($row['name']); ?> 
                                <a href="tel:<?php echo $row['phone']; ?>" class="call-btn" style="display:inline-flex; vertical-align:middle; margin-left:5px;"><i class="fa-solid fa-phone"></i></a>
                            </p>
                            <p><strong>📍 Địa chỉ lấy:</strong> <?php echo htmlspecialchars($row['pickup_address']); ?>
                                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($row['pickup_address']); ?>"
                                    target="_blank" style="color:#ff7a00; font-weight:bold;">[Bản đồ]</a>
                            </p>
                            <div style="background:#f0f7ff; padding:8px; border-radius:4px; margin:5px 0; border:1px solid #cce5ff;">
                                <p style="margin:0; font-size:14px; color:#004085;">
                                    <strong>🕒 Lịch lấy hàng:</strong> 
                                    <span style="color:#d9534f; font-weight:bold;"><?php echo $row['pickup_time'] ? date('d/m/Y', strtotime($row['pickup_time'])) : 'Sớm nhất có thể'; ?></span>
                                </p>
                                <?php if ($row['vehicle_type']): ?>
                                    <p style="margin:5px 0 0 0; font-size:14px; color:#004085;">
                                        <strong>🛵 Yêu cầu xe:</strong> 
                                        <span class="quote-vehicle-badge" style="background:#ff7a00; color:white; padding:1px 6px; border-radius:4px; font-size:12px;"><?php echo htmlspecialchars($row['vehicle_type']); ?></span>
                                    </p>
                                <?php endif; ?>
                            </div>
                            <hr style="border:0; border-top:1px dashed #eee; margin:8px 0;">
                            <p><strong>📥 Người nhận:</strong> <?php echo htmlspecialchars($row['receiver_name']); ?>
                                <a href="tel:<?php echo $row['receiver_phone']; ?>" class="call-btn" style="display:inline-flex; vertical-align:middle; margin-left:5px;"><i class="fa-solid fa-phone"></i></a>
                            </p>
                            <p><strong>🏁 Giao:</strong> <?php echo htmlspecialchars($row['delivery_address']); ?>
                                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($row['delivery_address']); ?>"
                                    target="_blank" style="color:#ff7a00; font-weight:bold;">[Bản đồ]</a>
                            </p>
                            <p><strong>📦 Hàng hóa:</strong>
                                <?php echo $pkg_map[$row['package_type']] ?? $row['package_type']; ?> -
                                <strong><?php echo $row['weight']; ?> kg</strong>
                            </p>
                            <p><strong>💳 Thanh toán:</strong> 
                                <?php if ($row['payment_method'] === 'bank_transfer'): ?>
                                    <span style="color:#0a2a66; font-weight:600;">Chuyển khoản</span>
                                    <?php if ($row['payment_status'] === 'paid'): ?>
                                        <span style="display:inline-block; margin-left:5px; padding:2px 8px; background:#28a745; color:white; border-radius:10px; font-size:11px;">✓ Đã trả</span>
                                    <?php else: ?>
                                        <span style="display:inline-block; margin-left:5px; padding:2px 8px; background:#dc3545; color:white; border-radius:10px; font-size:11px;">⚠ CHƯA TRẢ</span>
                                        <div style="margin-top:5px; font-size:12px; color:#d9534f; background:#fff5f5; padding:5px; border-radius:4px; border:1px solid #ffcccc;">
                                            <strong>Ghi chú:</strong> Đơn này khách chọn CK nhưng chưa thấy tiền vào hệ thống. Cẩn thận khi giao!
                                        </div>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <span style="color:#28a745; font-weight:600;">COD (Thu tiền mặt)</span>
                                <?php endif; ?>
                            </p>
                            <p><strong>💰 Thu hộ (COD):</strong> <span
                                    style="color:#d9534f; font-weight:bold;"><?php echo number_format($row['cod_amount']); ?>đ</span>
                            </p>
                            <?php if ($row['note']): ?>
                                <p><em>📝 Note: <?php echo htmlspecialchars($row['note']); ?></em></p><?php endif; ?>
                            <?php if ($row['shipper_note']): ?>
                                <p style="color:#0a2a66;"><em>💬 Ghi chú của bạn:
                                        <?php echo htmlspecialchars($row['shipper_note']); ?></em></p><?php endif; ?>
                        </div>
                        <div class="card-actions">
                            <form method="POST" enctype="multipart/form-data"
                                style="display:flex; flex-direction:column; gap:10px; width:100%;">
                                <input type="hidden" name="order_id" value="<?php echo $row['id']; ?>">

                                <?php if ($row['status'] == 'pending'): ?>
                                    <textarea name="shipper_note" class="shipper-note-input"
                                        placeholder="Ghi chú (VD: Đã gọi khách, hẹn 10h lấy...)"><?php echo htmlspecialchars($row['shipper_note']); ?></textarea>
                                    <div style="display:flex; gap:10px;">
                                        <button type="submit" name="update_status" value="shipping" class="btn-action-sm"
                                            style="background:#17a2b8; flex:1;">
                                            🚀 Đã lấy hàng / Bắt đầu giao
                                        </button>
                                        <button type="submit" name="update_status" value="decline" class="btn-action-sm"
                                            style="background:#6c757d;" onclick="return confirm('Bạn muốn từ chối (trả lại) đơn hàng này? Đơn sẽ quay về danh sách chờ phân công.')">
                                            ✖ Từ chối đơn
                                        </button>
                                    </div>
                                <?php elseif ($row['status'] == 'shipping'): ?>
                                    <textarea name="shipper_note" class="shipper-note-input"
                                        placeholder="Ghi chú (VD: Khách hẹn chiều giao, địa chỉ khó tìm...)"><?php echo htmlspecialchars($row['shipper_note']); ?></textarea>
                                    <div style="background:#f9f9f9; padding:10px; border-radius:4px;">
                                        <label style="font-size:13px; font-weight:600; display:block; margin-bottom:5px;">📸 Chụp
                                            ảnh giao hàng (POD):</label>
                                        <input type="file" name="pod_image" accept="image/*" style="font-size:13px; width:100%;">
                                    </div>
                                    <div style="display:flex; gap:10px;">
                                        <button type="submit" name="update_status" value="completed" class="btn-action-sm"
                                            style="background:#28a745; flex:1;"
                                            onclick="return confirmComplete('<?php echo $row['payment_method']; ?>', '<?php echo $row['payment_status']; ?>');">
                                            ✅ Đã giao thành công
                                        </button>
                                        
                                        <input type="hidden" name="cancel_reason" id="cancel_reason_<?php echo $row['id']; ?>">
                                        <button type="submit" name="update_status" value="cancelled" class="btn-action-sm"
                                            style="background:#dc3545;"
                                            onclick="return confirmCancel(<?php echo $row['id']; ?>);">
                                            ❌ Không giao được / Hủy
                                        </button>
                                    </div>
                                <?php endif; ?>
                            </form>
                            <div style="margin-top: 10px; text-align: center;">
                                <a href="shipper_order_detail.php?id=<?php echo $row['id']; ?>"
                                    style="color: #0a2a66; text-decoration: none; font-weight: 600;">Xem chi tiết đầy đủ
                                    &rarr;</a>
                            </div>
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else: ?>
                <p style="text-align:center; color:#666; margin-top:30px;">Hiện chưa có đơn hàng nào được phân công cho bạn.
                </p>
            <?php endif; ?>
        </div>

        <!-- Phân trang -->
        <?php if ($total_pages > 1): ?>
            <div class="shipper-pagination">
                <?php
                $qs = "&status=" . urlencode($status_filter) . "&search=" . urlencode($search) . "&date=" . urlencode($date_filter);
                ?>
                <?php if ($page > 1): ?>
                    <a href="?page=<?php echo $page - 1; ?><?php echo $qs; ?>" class="btn-action-sm" style="background:#6c757d; text-decoration:none;">&laquo; Trước</a>
                <?php endif; ?>
                <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                    <a href="?page=<?php echo $i; ?><?php echo $qs; ?>" class="btn-action-sm" style="text-decoration:none; <?php echo ($i == $page) ? 'background:#0a2a66;' : 'background:#ccc; color:#333;'; ?>"><?php echo $i; ?></a>
                <?php endfor; ?>
                <?php if ($page < $total_pages): ?>
                    <a href="?page=<?php echo $page + 1; ?><?php echo $qs; ?>" class="btn-action-sm" style="background:#6c757d; text-decoration:none;">Sau &raquo;</a>
                <?php endif; ?>
            </div>
            <p style="text-align: center; margin-top: 10px; font-size: 14px; color: #666;">Trang <?php echo $page; ?>/<?php echo $total_pages; ?></p>
        <?php endif; ?>
    </main>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>
    <script src="../assets/js/main.js?v=<?php echo time(); ?>"></script>
    <script>
        function confirmComplete(method, status) {
            if (method === 'bank_transfer' && status !== 'paid') {
                return confirm('⚠️ CẢNH BÁO: Đơn hàng này thanh toán CHUYỂN KHOẢN nhưng hệ thống ghi nhận CHƯA THANH TOÁN.\n\nBạn có chắc chắn muốn hoàn tất đơn hàng này không? (Hãy đảm bảo khách đã thanh toán hoặc bạn đã thu tiền mặt thay thế)');
            }
            return confirm('Xác nhận đã giao hàng thành công và thu đủ tiền?');
        }

        function confirmCancel(orderId) {
            let reason = prompt('Vui lòng nhập lý do hủy đơn (Vd: Khách không nghe máy, Khách đổi ý, Sai địa chỉ...):');
            if (reason === null) return false; // Nhấn Cancel
            if (reason.trim() === '') {
                alert('Bạn phải nhập lý do hủy đơn!');
                return false;
            }
            document.getElementById('cancel_reason_' + orderId).value = reason;
            return confirm('Xác nhận hủy đơn hàng này với lý do: ' + reason + '?');
        }
    </script>
</body>

</html>

