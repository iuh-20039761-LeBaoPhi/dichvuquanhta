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

$msg = "";

// Xử lý cập nhật trạng thái
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $order_id = intval($_POST['order_id']);
    $new_status = $_POST['update_status']; // Lấy giá trị từ nút bấm
    $shipper_note = trim($_POST['shipper_note'] ?? '');
    $pod_image = null;

    // Lấy trạng thái cũ trước khi update
    $old_status = 'unknown';
    $check_st = $conn->query("SELECT status FROM orders WHERE id = $order_id");
    if ($check_st && $row_st = $check_st->fetch_assoc()) {
        $old_status = $row_st['status'];
    }

    // Xử lý upload ảnh nếu hoàn tất đơn
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
        $msg = "Đã cập nhật trạng thái đơn hàng #$order_id";
        // Ghi log (Optional)
        $conn->query("INSERT INTO order_logs (order_id, user_id, old_status, new_status) VALUES ($order_id, $shipper_id, '$old_status', '$new_status')");
    } else {
        $msg = "Lỗi: " . $conn->error;
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
$sql_notify_admin = "SELECT l.old_status, l.new_status, l.changed_at, o.order_code, u.fullname as admin_name 
                     FROM order_logs l 
                     JOIN orders o ON l.order_id = o.id 
                     JOIN users u ON l.user_id = u.id 
                     WHERE o.shipper_id = ? AND u.role = 'admin' AND l.changed_at >= DATE_SUB(NOW(), INTERVAL 3 DAY) 
                     ORDER BY l.changed_at DESC LIMIT 5";
$stmt_notify_admin = $conn->prepare($sql_notify_admin);
$stmt_notify_admin->bind_param("i", $shipper_id);
$stmt_notify_admin->execute();
$res_notify = $stmt_notify_admin->get_result();
while ($row = $res_notify->fetch_assoc()) {
    $admin_logs[] = $row;
}
$stmt_notify_admin->close();
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
    <title>Shipper Dashboard | FastGo</title>
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
            <h2 class="page-title">Đơn hàng cần giao</h2>
            <div style="display:flex; align-items:center; gap:15px;">
                <span>Xin chào, <?php echo htmlspecialchars($_SESSION['username']); ?></span>
                <a href="shipper_profile.php" class="btn-action-sm"
                    style="background: #28a745; text-decoration: none;">👤 Hồ sơ & Thu nhập</a>
            </div>
        </div>

        <!-- Khu vực Thông báo -->
        <?php if ($new_orders_count > 0 || !empty($admin_logs)): ?>
            <div
                style="background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff7a00; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h3 style="margin-top: 0; margin-bottom: 10px; color: #0a2a66; font-size: 16px;">🔔 Thông báo mới</h3>

                <?php if ($new_orders_count > 0): ?>
                    <div
                        style="margin-bottom: 10px; color: #856404; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 4px;">
                        <strong>📦 Bạn có <?php echo $new_orders_count; ?> đơn hàng mới cần lấy!</strong>
                        <a href="?status=pending" style="color: #856404; text-decoration: underline; margin-left: 5px;">Xem
                            ngay</a>
                    </div>
                <?php endif; ?>

                <?php if (!empty($admin_logs)): ?>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <?php foreach ($admin_logs as $log): ?>
                            <li style="padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 14px;">
                                <span
                                    style="color: #666; font-size: 12px;">[<?php echo date('d/m H:i', strtotime($log['changed_at'])); ?>]</span>
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
        <form method="GET" action=""
            style="background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <input type="hidden" name="status" value="<?php echo htmlspecialchars($status_filter); ?>">

            <div style="flex: 1; min-width: 200px;">
                <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>"
                    placeholder="🔍 Tìm mã đơn, tên người gửi/nhận..."
                    style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
            </div>

            <div>
                <input type="date" name="date" value="<?php echo htmlspecialchars($date_filter); ?>"
                    style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;"
                    title="Lọc theo ngày nhận đơn">
            </div>

            <button type="submit" class="btn-action-sm"
                style="background: #0a2a66; border: none; padding: 9px 20px; font-size: 14px;">Lọc</button>

            <?php if (!empty($search) || !empty($date_filter)): ?>
                <a href="shipper_dashboard.php?status=<?php echo $status_filter; ?>"
                    style="color: #d9534f; text-decoration: none; font-size: 14px; margin-left: 5px;">❌ Xóa lọc</a>
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
                            <span style="color:#0a2a66">#<?php echo $row['order_code']; ?></span>
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
                            <p><strong>📤 Người gửi:</strong> <?php echo htmlspecialchars($row['name']); ?> - <a
                                    href="tel:<?php echo $row['phone']; ?>"><?php echo $row['phone']; ?></a></p>
                            <p><strong>📍 Địa chỉ lấy:</strong> <?php echo htmlspecialchars($row['pickup_address']); ?>
                                <a href="https://www.google.com/maps/search/?api=1&query=<?php echo urlencode($row['pickup_address']); ?>"
                                    target="_blank" style="color:#ff7a00; font-weight:bold;">[Bản đồ]</a>
                            </p>
                            <hr style="border:0; border-top:1px dashed #eee; margin:8px 0;">
                            <p><strong>📥 Người nhận:</strong> <?php echo htmlspecialchars($row['receiver_name']); ?> - <a
                                    href="tel:<?php echo $row['receiver_phone']; ?>"><?php echo $row['receiver_phone']; ?></a>
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
                                    <button type="submit" name="update_status" value="shipping" class="btn-action-sm"
                                        style="background:#17a2b8; flex:1;">
                                        🚀 Đã lấy hàng / Bắt đầu giao
                                    </button>
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
                                        <button type="submit" name="update_status" value="cancelled" class="btn-action-sm"
                                            style="background:#dc3545;"
                                            onclick="return confirm('Xác nhận hủy đơn này (khách không nhận/bom hàng)?');">
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
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 5px;">
                <?php
                $qs = "&status=" . urlencode($status_filter) . "&search=" . urlencode($search) . "&date=" . urlencode($date_filter);
                ?>
                <?php if ($page > 1): ?>
                    <a href="?page=<?php echo $page - 1; ?><?php echo $qs; ?>" class="btn-action-sm"
                        style="background:#6c757d; text-decoration:none;">&laquo; Trước</a>
                <?php endif; ?>

                <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                    <a href="?page=<?php echo $i; ?><?php echo $qs; ?>" class="btn-action-sm"
                        style="text-decoration:none; <?php echo ($i == $page) ? 'background:#0a2a66;' : 'background:#ccc; color:#333;'; ?>"><?php echo $i; ?></a>
                <?php endfor; ?>

                <?php if ($page < $total_pages): ?>
                    <a href="?page=<?php echo $page + 1; ?><?php echo $qs; ?>" class="btn-action-sm"
                        style="background:#6c757d; text-decoration:none;">Sau &raquo;</a>
                <?php endif; ?>
            </div>
            <p style="text-align: center; margin-top: 10px; font-size: 14px; color: #666;">Trang
                <?php echo $page; ?>/<?php echo $total_pages; ?>
            </p>
        <?php endif; ?>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="assets/js/main.js?v=<?php echo time(); ?>"></script>
    <script>
        function confirmComplete(method, status) {
            if (method === 'bank_transfer' && status !== 'paid') {
                return confirm('⚠️ CẢNH BÁO: Đơn hàng này thanh toán CHUYỂN KHOẢN nhưng hệ thống ghi nhận CHƯA THANH TOÁN.\n\nBạn có chắc chắn muốn hoàn tất đơn hàng này không? (Hãy đảm bảo khách đã thanh toán hoặc bạn đã thu tiền mặt thay thế)');
            }
            return confirm('Xác nhận đã giao hàng thành công và thu đủ tiền?');
        }
    </script>
</body>

</html>
