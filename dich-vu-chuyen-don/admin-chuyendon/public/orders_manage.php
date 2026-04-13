<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$orders = moving_admin_read_collection('orders');
$editId = trim((string) ($_GET['edit'] ?? ''));
$search = trim((string) ($_GET['search'] ?? ''));
$statusFilter = trim((string) ($_GET['status'] ?? 'all'));
$serviceFilter = trim((string) ($_GET['service'] ?? 'all'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? 'save');
    $id = trim((string) ($_POST['id'] ?? ''));

    if ($action === 'delete') {
        $orders = array_values(array_filter($orders, function ($row) use ($id) {
            return (string) ($row['id'] ?? '') !== $id;
        }));
        moving_admin_write_collection('orders', $orders);
        moving_admin_set_flash('success', 'Đã xóa đơn hàng.');
        moving_admin_redirect('orders_manage.php');
    }

    $payload = [
        'id' => $id !== '' ? $id : moving_admin_next_id('ORD', $orders),
        'code' => trim((string) ($_POST['code'] ?? '')),
        'customer' => trim((string) ($_POST['customer'] ?? '')),
        'service' => trim((string) ($_POST['service'] ?? 'chuyen-nha')),
        'provider' => trim((string) ($_POST['provider'] ?? '')),
        'execute_date' => trim((string) ($_POST['execute_date'] ?? '')),
        'route' => trim((string) ($_POST['route'] ?? '')),
        'total' => (float) ($_POST['total'] ?? 0),
        'status' => trim((string) ($_POST['status'] ?? 'new')),
        'survey' => trim((string) ($_POST['survey'] ?? 'no')),
        'note' => trim((string) ($_POST['note'] ?? '')),
        'created_at' => trim((string) ($_POST['created_at'] ?? '')) ?: date('Y-m-d H:i:s'),
    ];

    if ($payload['code'] === '' || $payload['customer'] === '' || $payload['route'] === '') {
        moving_admin_set_flash('error', 'Vui lòng nhập mã đơn, khách hàng và tuyến chuyển.');
        $redirect = 'orders_manage.php' . ($payload['id'] !== '' ? '?edit=' . urlencode($payload['id']) : '');
        moving_admin_redirect($redirect);
    }

    [$index] = moving_admin_find_by_id($orders, $payload['id']);
    if ($index === null) {
        array_unshift($orders, $payload);
        moving_admin_set_flash('success', 'Đã thêm đơn hàng mới.');
    } else {
        $orders[$index] = $payload;
        moving_admin_set_flash('success', 'Đã cập nhật đơn hàng.');
    }

    moving_admin_write_collection('orders', $orders);
    moving_admin_redirect('orders_manage.php');
}

$editingOrder = [
    'id' => '',
    'code' => '',
    'customer' => '',
    'service' => 'chuyen-nha',
    'provider' => '',
    'execute_date' => date('Y-m-d'),
    'route' => '',
    'total' => 0,
    'status' => 'new',
    'survey' => 'no',
    'note' => '',
    'created_at' => date('Y-m-d H:i:s'),
];

if ($editId !== '') {
    [, $selectedOrder] = moving_admin_find_by_id($orders, $editId);
    if (is_array($selectedOrder)) {
        $editingOrder = $selectedOrder;
    }
}

$filteredOrders = array_values(array_filter($orders, function ($row) use ($search, $statusFilter, $serviceFilter) {
    $haystack = strtolower(implode(' ', [
        $row['id'] ?? '',
        $row['code'] ?? '',
        $row['customer'] ?? '',
        $row['provider'] ?? '',
        $row['route'] ?? '',
        $row['note'] ?? '',
    ]));

    if ($search !== '' && strpos($haystack, strtolower($search)) === false) {
        return false;
    }
    if ($statusFilter !== 'all' && (string) ($row['status'] ?? '') !== $statusFilter) {
        return false;
    }
    if ($serviceFilter !== 'all' && (string) ($row['service'] ?? '') !== $serviceFilter) {
        return false;
    }
    return true;
}));

$flash = moving_admin_get_flash();
$pageTitle = 'Quản lý đơn hàng | Admin chuyển dọn';
$processingOrders = count(array_filter($orders, fn($row) => in_array(($row['status'] ?? ''), ['new', 'survey', 'processing'], true)));
$completedOrders = count(array_filter($orders, fn($row) => ($row['status'] ?? '') === 'completed'));
$totalValue = array_reduce($orders, function ($sum, $row) {
    return ($row['status'] ?? '') === 'cancelled' ? $sum : $sum + (float) ($row['total'] ?? 0);
}, 0);

require_once __DIR__ . '/../includes/header_admin.php';
?>
<section class="hero-card">
    <div>
        <h1>Quản lý đơn hàng</h1>
        <p>
            Giữ đúng phần admin đơn giản cho chuyển dọn: mã đơn, loại dịch vụ,
            tuyến chuyển, đơn vị phụ trách, trạng thái và giá trị tham chiếu.
        </p>
    </div>
    <div class="hero-meta">
        <span class="muted">Giá trị chưa hủy</span>
        <strong><?php echo moving_admin_escape(moving_admin_money($totalValue)); ?></strong>
        <p>Tổng giá trị đơn hiện tại</p>
    </div>
</section>

<section class="stats-grid">
    <article class="stat-card">
        <span class="muted">Tổng đơn hàng</span>
        <strong><?php echo count($orders); ?></strong>
        <p>Dữ liệu cục bộ trong `orders.json`</p>
    </article>
    <article class="stat-card">
        <span class="muted">Đang xử lý</span>
        <strong><?php echo $processingOrders; ?></strong>
        <p>Mới tiếp nhận, khảo sát hoặc đang triển khai</p>
    </article>
    <article class="stat-card">
        <span class="muted">Hoàn tất</span>
        <strong><?php echo $completedOrders; ?></strong>
        <p>Đơn đã xong trong danh sách hiện tại</p>
    </article>
</section>

<?php if (is_array($flash)): ?>
    <div class="flash <?php echo $flash['type'] === 'error' ? 'flash-error' : ($flash['type'] === 'warning' ? 'flash-warning' : 'flash-success'); ?>">
        <?php echo moving_admin_escape($flash['message'] ?? ''); ?>
    </div>
<?php endif; ?>

<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách đơn hàng</h2>
            <p>Lọc nhanh theo mã đơn, khách hàng, trạng thái và loại dịch vụ.</p>
        </div>
    </div>

    <div class="layout-split">
        <div>
            <form method="get" class="toolbar">
                <div class="field">
                    <label for="search">Tìm kiếm</label>
                    <input id="search" class="input" type="text" name="search" value="<?php echo moving_admin_escape($search); ?>" placeholder="Mã đơn, khách hàng, tuyến đường...">
                </div>
                <div class="field">
                    <label for="status">Trạng thái</label>
                    <select id="status" class="select" name="status">
                        <option value="all" <?php echo $statusFilter === 'all' ? 'selected' : ''; ?>>Tất cả</option>
                        <option value="new" <?php echo $statusFilter === 'new' ? 'selected' : ''; ?>>Mới tiếp nhận</option>
                        <option value="survey" <?php echo $statusFilter === 'survey' ? 'selected' : ''; ?>>Chờ khảo sát</option>
                        <option value="processing" <?php echo $statusFilter === 'processing' ? 'selected' : ''; ?>>Đang triển khai</option>
                        <option value="completed" <?php echo $statusFilter === 'completed' ? 'selected' : ''; ?>>Hoàn tất</option>
                        <option value="cancelled" <?php echo $statusFilter === 'cancelled' ? 'selected' : ''; ?>>Đã hủy</option>
                    </select>
                </div>
                <div class="field">
                    <label for="service">Loại dịch vụ</label>
                    <select id="service" class="select" name="service">
                        <option value="all" <?php echo $serviceFilter === 'all' ? 'selected' : ''; ?>>Tất cả</option>
                        <option value="chuyen-nha" <?php echo $serviceFilter === 'chuyen-nha' ? 'selected' : ''; ?>>Chuyển nhà</option>
                        <option value="van-phong" <?php echo $serviceFilter === 'van-phong' ? 'selected' : ''; ?>>Chuyển văn phòng</option>
                        <option value="kho-bai" <?php echo $serviceFilter === 'kho-bai' ? 'selected' : ''; ?>>Chuyển kho bãi</option>
                    </select>
                </div>
                <div class="form-actions" style="align-self: end;">
                    <button type="submit" class="button button-secondary">Lọc</button>
                    <a href="orders_manage.php" class="button-link button-secondary">Làm mới</a>
                </div>
            </form>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Đơn hàng</th>
                            <th>Dịch vụ</th>
                            <th>Phụ trách</th>
                            <th>Giá trị</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!$filteredOrders): ?>
                            <tr><td colspan="6" class="empty-state">Không có đơn hàng phù hợp.</td></tr>
                        <?php else: ?>
                            <?php foreach ($filteredOrders as $order): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo moving_admin_escape($order['code'] ?? ''); ?></strong><br>
                                        <span class="muted"><?php echo moving_admin_escape($order['customer'] ?? ''); ?></span><br>
                                        <span class="muted"><?php echo moving_admin_escape($order['route'] ?? ''); ?></span>
                                    </td>
                                    <td><?php echo moving_admin_escape(moving_admin_service_label($order['service'] ?? '')); ?></td>
                                    <td>
                                        <?php echo moving_admin_escape($order['provider'] ?? ''); ?><br>
                                        <span class="muted"><?php echo ($order['survey'] ?? 'no') === 'yes' ? 'Có khảo sát trước' : 'Không khảo sát'; ?></span>
                                    </td>
                                    <td>
                                        <strong><?php echo moving_admin_escape(moving_admin_money($order['total'] ?? 0)); ?></strong><br>
                                        <span class="muted"><?php echo moving_admin_escape($order['execute_date'] ?? ''); ?></span>
                                    </td>
                                    <td><span class="badge <?php echo moving_admin_badge_class('order-status', $order['status'] ?? ''); ?>"><?php echo moving_admin_escape(moving_admin_order_status_label($order['status'] ?? '')); ?></span></td>
                                    <td>
                                        <div class="inline-actions">
                                            <a href="orders_manage.php?edit=<?php echo urlencode((string) ($order['id'] ?? '')); ?>" class="button-link button-secondary">Sửa</a>
                                            <form method="post" onsubmit="return confirm('Xóa đơn hàng này?');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?php echo moving_admin_escape($order['id'] ?? ''); ?>">
                                                <button type="submit" class="button button-danger">Xóa</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <aside class="editor-card">
            <h3><?php echo $editingOrder['id'] !== '' ? 'Cập nhật đơn hàng' : 'Thêm đơn hàng'; ?></h3>
            <form method="post">
                <input type="hidden" name="action" value="save">
                <input type="hidden" name="id" value="<?php echo moving_admin_escape($editingOrder['id']); ?>">
                <input type="hidden" name="created_at" value="<?php echo moving_admin_escape($editingOrder['created_at']); ?>">

                <div class="editor-grid">
                    <div class="field">
                        <label for="code">Mã đơn</label>
                        <input id="code" class="input" type="text" name="code" required value="<?php echo moving_admin_escape($editingOrder['code']); ?>">
                    </div>
                    <div class="field">
                        <label for="customer">Khách hàng</label>
                        <input id="customer" class="input" type="text" name="customer" required value="<?php echo moving_admin_escape($editingOrder['customer']); ?>">
                    </div>
                    <div class="field">
                        <label for="service-edit">Loại dịch vụ</label>
                        <select id="service-edit" class="select" name="service">
                            <option value="chuyen-nha" <?php echo ($editingOrder['service'] ?? '') === 'chuyen-nha' ? 'selected' : ''; ?>>Chuyển nhà</option>
                            <option value="van-phong" <?php echo ($editingOrder['service'] ?? '') === 'van-phong' ? 'selected' : ''; ?>>Chuyển văn phòng</option>
                            <option value="kho-bai" <?php echo ($editingOrder['service'] ?? '') === 'kho-bai' ? 'selected' : ''; ?>>Chuyển kho bãi</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="provider">Đơn vị phụ trách</label>
                        <input id="provider" class="input" type="text" name="provider" value="<?php echo moving_admin_escape($editingOrder['provider']); ?>">
                    </div>
                    <div class="field">
                        <label for="execute_date">Ngày thực hiện</label>
                        <input id="execute_date" class="input" type="date" name="execute_date" value="<?php echo moving_admin_escape($editingOrder['execute_date']); ?>">
                    </div>
                    <div class="field">
                        <label for="status-edit">Trạng thái</label>
                        <select id="status-edit" class="select" name="status">
                            <option value="new" <?php echo ($editingOrder['status'] ?? '') === 'new' ? 'selected' : ''; ?>>Mới tiếp nhận</option>
                            <option value="survey" <?php echo ($editingOrder['status'] ?? '') === 'survey' ? 'selected' : ''; ?>>Chờ khảo sát</option>
                            <option value="processing" <?php echo ($editingOrder['status'] ?? '') === 'processing' ? 'selected' : ''; ?>>Đang triển khai</option>
                            <option value="completed" <?php echo ($editingOrder['status'] ?? '') === 'completed' ? 'selected' : ''; ?>>Hoàn tất</option>
                            <option value="cancelled" <?php echo ($editingOrder['status'] ?? '') === 'cancelled' ? 'selected' : ''; ?>>Đã hủy</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="total">Tổng tiền (VND)</label>
                        <input id="total" class="input" type="number" min="0" step="1000" name="total" value="<?php echo moving_admin_escape((string) $editingOrder['total']); ?>">
                    </div>
                    <div class="field">
                        <label for="survey">Khảo sát trước</label>
                        <select id="survey" class="select" name="survey">
                            <option value="no" <?php echo ($editingOrder['survey'] ?? '') === 'no' ? 'selected' : ''; ?>>Không</option>
                            <option value="yes" <?php echo ($editingOrder['survey'] ?? '') === 'yes' ? 'selected' : ''; ?>>Có</option>
                        </select>
                    </div>
                    <div class="field span-full">
                        <label for="route">Tuyến chuyển dọn</label>
                        <input id="route" class="input" type="text" name="route" required value="<?php echo moving_admin_escape($editingOrder['route']); ?>">
                    </div>
                    <div class="field span-full">
                        <label for="note">Ghi chú</label>
                        <textarea id="note" class="textarea" name="note"><?php echo moving_admin_escape($editingOrder['note']); ?></textarea>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 16px;">
                    <button type="submit" class="button button-primary">Lưu đơn hàng</button>
                    <a href="orders_manage.php" class="button-link button-secondary">Tạo mới</a>
                </div>
            </form>
        </aside>
    </div>
</section>
<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>
