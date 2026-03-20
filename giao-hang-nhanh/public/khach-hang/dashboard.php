<?php
session_start();
require_once __DIR__ . '/../../config/db.php';
if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit;
}

// Nếu là Admin thì chuyển ngay sang trang quản lý, không cho ở lại đây
if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
    header("Location: ../admin-giaohang/admin_stats.php");
    exit;
}

// Nếu là Shipper thì chuyển sang dashboard shipper
if (isset($_SESSION['role']) && $_SESSION['role'] === 'shipper') {
    header("Location: ../nha-cung-cap/shipper_dashboard.php");
    exit;
}

$queryString = $_SERVER['QUERY_STRING'] ?? '';
header("Location: dashboard.html" . ($queryString !== '' ? '?' . $queryString : ''));
exit;

$current_page = 'dashboard.php';
$user_id = (int) $_SESSION['user_id'];

$dashboard_stats = [
    'total' => 0,
    'pending' => 0,
    'shipping' => 0,
    'completed' => 0,
    'cancelled' => 0
];
$unpaid_orders = 0;
$dashboard_unread_notifications = 0;
$saved_address_count = 0;
$recent_orders = [];
$recent_status_filter = $_GET['recent_status'] ?? 'all';
$allowed_recent_filters = ['all', 'pending', 'shipping'];
if (!in_array($recent_status_filter, $allowed_recent_filters, true)) {
    $recent_status_filter = 'all';
}
$recent_filter_labels = [
    'all' => 'Tất cả',
    'pending' => 'Chờ xử lý',
    'shipping' => 'Đang giao'
];

$stats_sql = "SELECT
    COUNT(*) AS total_orders,
    COALESCE(SUM(status = 'pending'), 0) AS pending_orders,
    COALESCE(SUM(status = 'shipping'), 0) AS shipping_orders,
    COALESCE(SUM(status = 'completed'), 0) AS completed_orders,
    COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders
    FROM orders
    WHERE user_id = ?";
$stmt_stats = $conn->prepare($stats_sql);
if ($stmt_stats) {
    $stmt_stats->bind_param("i", $user_id);
    $stmt_stats->execute();
    $stats_row = $stmt_stats->get_result()->fetch_assoc();
    if ($stats_row) {
        $dashboard_stats['total'] = (int) ($stats_row['total_orders'] ?? 0);
        $dashboard_stats['pending'] = (int) ($stats_row['pending_orders'] ?? 0);
        $dashboard_stats['shipping'] = (int) ($stats_row['shipping_orders'] ?? 0);
        $dashboard_stats['completed'] = (int) ($stats_row['completed_orders'] ?? 0);
        $dashboard_stats['cancelled'] = (int) ($stats_row['cancelled_orders'] ?? 0);
    }
    $stmt_stats->close();
}

$stmt_unpaid = $conn->prepare("SELECT COUNT(*) AS total FROM orders WHERE user_id = ? AND payment_status = 'unpaid' AND status <> 'cancelled'");
if ($stmt_unpaid) {
    $stmt_unpaid->bind_param("i", $user_id);
    $stmt_unpaid->execute();
    $unpaid_row = $stmt_unpaid->get_result()->fetch_assoc();
    $unpaid_orders = (int) ($unpaid_row['total'] ?? 0);
    $stmt_unpaid->close();
}

$stmt_notify = $conn->prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0");
if ($stmt_notify) {
    $stmt_notify->bind_param("i", $user_id);
    $stmt_notify->execute();
    $notify_row = $stmt_notify->get_result()->fetch_assoc();
    $dashboard_unread_notifications = (int) ($notify_row['total'] ?? 0);
    $stmt_notify->close();
}

$stmt_address = $conn->prepare("SELECT COUNT(*) AS total FROM saved_addresses WHERE user_id = ?");
if ($stmt_address) {
    $stmt_address->bind_param("i", $user_id);
    $stmt_address->execute();
    $address_row = $stmt_address->get_result()->fetch_assoc();
    $saved_address_count = (int) ($address_row['total'] ?? 0);
    $stmt_address->close();
}

$recent_sql = "SELECT id, order_code, receiver_name, shipping_fee, status, payment_status, created_at FROM orders WHERE user_id = ?";
$recent_params = [$user_id];
$recent_types = "i";
if ($recent_status_filter !== 'all') {
    $recent_sql .= " AND status = ?";
    $recent_params[] = $recent_status_filter;
    $recent_types .= "s";
}
$recent_sql .= " ORDER BY created_at DESC LIMIT 5";
$stmt_recent = $conn->prepare($recent_sql);
if ($stmt_recent) {
    $stmt_recent->bind_param($recent_types, ...$recent_params);
    $stmt_recent->execute();
    $recent_result = $stmt_recent->get_result();
    while ($row = $recent_result->fetch_assoc()) {
        $recent_orders[] = $row;
    }
    $stmt_recent->close();
}

$status_labels = [
    'pending' => 'Chờ xử lý',
    'shipping' => 'Đang giao',
    'completed' => 'Hoàn tất',
    'cancelled' => 'Đã hủy'
];

$todo_items = [];
if ($dashboard_stats['pending'] > 0) {
    $todo_items[] = [
        'type' => 'warning',
        'message' => "Bạn có {$dashboard_stats['pending']} đơn đang chờ xử lý.",
        'cta' => 'Xem đơn chờ',
        'link' => 'order_history.php?status=pending'
    ];
}
if ($dashboard_stats['shipping'] > 0) {
    $todo_items[] = [
        'type' => 'info',
        'message' => "Có {$dashboard_stats['shipping']} đơn đang vận chuyển.",
        'cta' => 'Theo dõi đơn',
        'link' => 'order_history.php?status=shipping'
    ];
}
if ($unpaid_orders > 0) {
    $todo_items[] = [
        'type' => 'warning',
        'message' => "Có {$unpaid_orders} đơn chưa thanh toán.",
        'cta' => 'Mở lịch sử đơn',
        'link' => 'order_history.php'
    ];
}
if ($dashboard_unread_notifications > 0) {
    $todo_items[] = [
        'type' => 'info',
        'message' => "Bạn có {$dashboard_unread_notifications} thông báo chưa đọc.",
        'cta' => 'Xem thông báo',
        'link' => '../notifications.php'
    ];
}
if ($saved_address_count === 0) {
    $todo_items[] = [
        'type' => 'neutral',
        'message' => 'Bạn chưa có địa chỉ lưu sẵn để đặt đơn nhanh.',
        'cta' => 'Thêm địa chỉ',
        'link' => 'address_book.php'
    ];
}
if (empty($todo_items)) {
    $todo_items[] = [
        'type' => 'success',
        'message' => 'Mọi thứ đang ổn. Bạn có thể tạo thêm đơn mới khi cần.',
        'cta' => 'Tạo đơn ngay',
        'link' => '../../dat-lich-giao-hang-nhanh.html'
    ];
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Dashboard | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_user.php'; ?>

    <main class="container customer-dashboard">
        <?php if (isset($_SESSION['success_order'])): ?>
            <div class="alert alert-success" style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
                <strong>Thành công!</strong> <?php echo htmlspecialchars($_SESSION['success_order']); ?>
                <?php unset($_SESSION['success_order']); ?>
            </div>
        <?php endif; ?>
        <section class="dashboard-hero">
            <div>
                <p class="dashboard-eyebrow">Bảng điều khiển khách hàng cá nhân</p>
                <h2 class="section-title dashboard-title">Chào mừng, <?php echo htmlspecialchars($_SESSION['username']); ?>!</h2>
                <p class="dashboard-subtitle">Theo dõi đơn hàng mới nhất, việc cần xử lý và thao tác nhanh trong một màn hình.</p>
            </div>
            <div class="dashboard-hero-actions">
                <a href="../../dat-lich-giao-hang-nhanh.html" class="btn-primary">+ Tạo đơn ngay</a>
                <a href="order_history.php" class="dashboard-btn-outline">Lịch sử đơn</a>
            </div>
        </section>

        <section class="dashboard-kpi-grid" aria-label="Thống kê đơn hàng">
            <article class="dashboard-kpi-card">
                <p>Tổng đơn</p>
                <strong><?php echo number_format($dashboard_stats['total']); ?></strong>
            </article>
            <article class="dashboard-kpi-card">
                <p>Chờ xử lý</p>
                <strong><?php echo number_format($dashboard_stats['pending']); ?></strong>
            </article>
            <article class="dashboard-kpi-card">
                <p>Đang giao</p>
                <strong><?php echo number_format($dashboard_stats['shipping']); ?></strong>
            </article>
            <article class="dashboard-kpi-card">
                <p>Hoàn tất</p>
                <strong><?php echo number_format($dashboard_stats['completed']); ?></strong>
            </article>
        </section>

        <section class="dashboard-main-grid">
            <article class="dashboard-panel">
                <div class="dashboard-panel-head">
                    <h3>Đơn gần đây</h3>
                    <div class="dashboard-panel-head-actions">
                        <a href="order_history.php">Xem tất cả</a>
                    </div>
                </div>
                <div class="dashboard-quick-filters">
                    <?php foreach ($recent_filter_labels as $filter_key => $filter_label): ?>
                        <a href="dashboard.php?recent_status=<?php echo urlencode($filter_key); ?>"
                            class="dashboard-filter-chip <?php echo ($recent_status_filter === $filter_key) ? 'is-active' : ''; ?>">
                            <?php echo htmlspecialchars($filter_label); ?>
                        </a>
                    <?php endforeach; ?>
                </div>

                <?php if (!empty($recent_orders)): ?>
                    <div class="dashboard-order-list">
                        <?php foreach ($recent_orders as $order): ?>
                            <?php
                            $status_key = in_array($order['status'], ['pending', 'shipping', 'completed', 'cancelled'], true) ? $order['status'] : 'pending';
                            $status_text = $status_labels[$status_key] ?? ucfirst($status_key);
                            ?>
                            <article class="dashboard-order-item">
                                <div class="dashboard-order-main">
                                    <div>
                                        <p class="order-code"><?php echo htmlspecialchars($order['order_code']); ?></p>
                                        <p class="order-receiver">Người nhận: <?php echo htmlspecialchars($order['receiver_name']); ?></p>
                                    </div>
                                    <span class="status-badge status-<?php echo $status_key; ?>"><?php echo $status_text; ?></span>
                                </div>
                                <div class="dashboard-order-meta">
                                    <span>Phí ship: <?php echo number_format((float) $order['shipping_fee']); ?>đ</span>
                                    <span><?php echo date('d/m/Y H:i', strtotime($order['created_at'])); ?></span>
                                </div>
                                <div class="dashboard-order-actions">
                                    <a href="customer_order_detail.php?id=<?php echo (int) $order['id']; ?>" class="btn-sm btn-outline">Chi tiết</a>
                                    <a href="../../dat-lich-giao-hang-nhanh.html?reorder_id=<?php echo (int) $order['id']; ?>" class="btn-sm dashboard-reorder-btn">Đặt lại</a>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                <?php elseif ($dashboard_stats['total'] > 0 && $recent_status_filter !== 'all'): ?>
                    <div class="dashboard-empty">
                        <p>Không có đơn nào ở trạng thái "<?php echo htmlspecialchars($recent_filter_labels[$recent_status_filter] ?? 'đã chọn'); ?>" trong danh sách gần đây.</p>
                        <a href="dashboard.php?recent_status=all" class="dashboard-btn-outline">Xem tất cả đơn gần đây</a>
                    </div>
                <?php else: ?>
                    <div class="dashboard-empty">
                        <p>Bạn chưa có đơn hàng nào. Bắt đầu tạo đơn đầu tiên để theo dõi trạng thái tại đây.</p>
                        <a href="../../dat-lich-giao-hang-nhanh.html" class="btn-primary">Tạo đơn đầu tiên</a>
                    </div>
                <?php endif; ?>
            </article>

            <aside class="dashboard-panel">
                <div class="dashboard-panel-head">
                    <h3>Việc cần làm</h3>
                </div>
                <div class="dashboard-todo-list">
                    <?php foreach ($todo_items as $todo): ?>
                        <article class="dashboard-todo-item dashboard-todo-<?php echo htmlspecialchars($todo['type']); ?>">
                            <p><?php echo htmlspecialchars($todo['message']); ?></p>
                            <a href="<?php echo htmlspecialchars($todo['link']); ?>"><?php echo htmlspecialchars($todo['cta']); ?></a>
                        </article>
                    <?php endforeach; ?>
                </div>
            </aside>
        </section>

        <section>
            <h3 class="dashboard-section-subtitle">Thao tác nhanh</h3>
            <div class="dashboard-actions-grid">
                <article class="dashboard-action-card">
                    <h4>📦 Đặt đơn mới</h4>
                    <p>Tạo đơn vận chuyển ngay lập tức với biểu mẫu đã tối ưu cho cá nhân.</p>
                    <a href="../../dat-lich-giao-hang-nhanh.html" class="btn-primary">Tạo đơn</a>
                </article>
                <article class="dashboard-action-card">
                    <h4>🔍 Lịch sử đơn hàng</h4>
                    <p>Xem lại chi tiết, trạng thái và đặt lại từ các đơn đã từng tạo.</p>
                    <a href="order_history.php" class="dashboard-btn-outline">Xem lịch sử</a>
                </article>
                <article class="dashboard-action-card">
                    <h4>📒 Sổ địa chỉ</h4>
                    <p>Lưu địa chỉ giao nhận thường dùng để rút ngắn thời gian tạo đơn.</p>
                    <a href="address_book.php" class="dashboard-btn-outline">Quản lý địa chỉ</a>
                </article>
                <article class="dashboard-action-card">
                    <h4>👤 Thông tin tài khoản</h4>
                    <p>Cập nhật hồ sơ cá nhân và bảo mật tài khoản thường xuyên.</p>
                    <a href="profile.php" class="dashboard-btn-outline">Quản lý hồ sơ</a>
                </article>
            </div>
        </section>

        <a href="../../dat-lich-giao-hang-nhanh.html" class="dashboard-mobile-cta">+ Tạo đơn nhanh</a>
    </main>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>

</html>

