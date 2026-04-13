<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pricingRows = moving_admin_read_collection('pricing');
$editId = trim((string) ($_GET['edit'] ?? ''));
$search = trim((string) ($_GET['search'] ?? ''));
$categoryFilter = trim((string) ($_GET['category'] ?? 'all'));
$statusFilter = trim((string) ($_GET['status'] ?? 'all'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? 'save');
    $id = trim((string) ($_POST['id'] ?? ''));

    if ($action === 'delete') {
        $pricingRows = array_values(array_filter($pricingRows, function ($row) use ($id) {
            return (string) ($row['id'] ?? '') !== $id;
        }));
        moving_admin_write_collection('pricing', $pricingRows);
        moving_admin_set_flash('success', 'Đã xóa gói bảng giá.');
        moving_admin_redirect('admin_pricing.php');
    }

    $payload = [
        'id' => $id !== '' ? $id : moving_admin_next_id('PRI', $pricingRows),
        'name' => trim((string) ($_POST['name'] ?? '')),
        'category' => trim((string) ($_POST['category'] ?? 'co-ban')),
        'unit' => trim((string) ($_POST['unit'] ?? 'chuyến')),
        'base_price' => (float) ($_POST['base_price'] ?? 0),
        'surcharge' => (float) ($_POST['surcharge'] ?? 0),
        'status' => trim((string) ($_POST['status'] ?? 'active')),
        'description' => trim((string) ($_POST['description'] ?? '')),
    ];

    if ($payload['name'] === '' || $payload['unit'] === '') {
        moving_admin_set_flash('error', 'Vui lòng nhập tên gói giá và đơn vị tính.');
        $redirect = 'admin_pricing.php' . ($payload['id'] !== '' ? '?edit=' . urlencode($payload['id']) : '');
        moving_admin_redirect($redirect);
    }

    [$index] = moving_admin_find_by_id($pricingRows, $payload['id']);
    if ($index === null) {
        array_unshift($pricingRows, $payload);
        moving_admin_set_flash('success', 'Đã thêm gói bảng giá.');
    } else {
        $pricingRows[$index] = $payload;
        moving_admin_set_flash('success', 'Đã cập nhật bảng giá.');
    }

    moving_admin_write_collection('pricing', $pricingRows);
    moving_admin_redirect('admin_pricing.php');
}

$editingPricing = [
    'id' => '',
    'name' => '',
    'category' => 'co-ban',
    'unit' => 'chuyến',
    'base_price' => 0,
    'surcharge' => 0,
    'status' => 'active',
    'description' => '',
];

if ($editId !== '') {
    [, $selectedPricing] = moving_admin_find_by_id($pricingRows, $editId);
    if (is_array($selectedPricing)) {
        $editingPricing = $selectedPricing;
    }
}

$filteredPricing = array_values(array_filter($pricingRows, function ($row) use ($search, $categoryFilter, $statusFilter) {
    $haystack = strtolower(implode(' ', [
        $row['id'] ?? '',
        $row['name'] ?? '',
        $row['category'] ?? '',
        $row['unit'] ?? '',
        $row['description'] ?? '',
    ]));

    if ($search !== '' && strpos($haystack, strtolower($search)) === false) {
        return false;
    }
    if ($categoryFilter !== 'all' && (string) ($row['category'] ?? '') !== $categoryFilter) {
        return false;
    }
    if ($statusFilter !== 'all' && (string) ($row['status'] ?? '') !== $statusFilter) {
        return false;
    }
    return true;
}));

$flash = moving_admin_get_flash();
$pageTitle = 'Quản lý bảng giá | Admin chuyển dọn';
$activePricing = count(array_filter($pricingRows, fn($row) => ($row['status'] ?? '') === 'active'));
$baseTotal = array_reduce($pricingRows, fn($sum, $row) => $sum + (float) ($row['base_price'] ?? 0), 0);
$surchargeTotal = array_reduce($pricingRows, fn($sum, $row) => $sum + (float) ($row['surcharge'] ?? 0), 0);

require_once __DIR__ . '/../includes/header_admin.php';
?>
<section class="hero-card">
    <div>
        <h1>Quản lý bảng giá</h1>
        <p>
            Phần này giữ gọn theo đúng nhu cầu hiện tại: tên gói, danh mục, giá
            cơ bản, phụ phí, đơn vị tính và trạng thái áp dụng.
        </p>
    </div>
    <div class="hero-meta">
        <span class="muted">Gói đang áp dụng</span>
        <strong><?php echo $activePricing; ?></strong>
        <p>trên tổng <?php echo count($pricingRows); ?> gói giá</p>
    </div>
</section>

<section class="stats-grid">
    <article class="stat-card">
        <span class="muted">Tổng gói giá</span>
        <strong><?php echo count($pricingRows); ?></strong>
        <p>Dữ liệu cục bộ trong `pricing.json`</p>
    </article>
    <article class="stat-card">
        <span class="muted">Tổng giá cơ bản</span>
        <strong><?php echo moving_admin_escape(moving_admin_money($baseTotal)); ?></strong>
        <p>Cộng tham chiếu của toàn bộ gói giá</p>
    </article>
    <article class="stat-card">
        <span class="muted">Tổng phụ phí</span>
        <strong><?php echo moving_admin_escape(moving_admin_money($surchargeTotal)); ?></strong>
        <p>Cộng phụ phí cấu hình hiện tại</p>
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
            <h2>Danh sách bảng giá</h2>
            <p>Lọc nhanh theo tên gói, danh mục và trạng thái.</p>
        </div>
    </div>

    <div class="layout-split">
        <div>
            <form method="get" class="toolbar">
                <div class="field">
                    <label for="search">Tìm kiếm</label>
                    <input id="search" class="input" type="text" name="search" value="<?php echo moving_admin_escape($search); ?>" placeholder="Tên gói, danh mục, mô tả...">
                </div>
                <div class="field">
                    <label for="category">Danh mục</label>
                    <select id="category" class="select" name="category">
                        <option value="all" <?php echo $categoryFilter === 'all' ? 'selected' : ''; ?>>Tất cả</option>
                        <option value="co-ban" <?php echo $categoryFilter === 'co-ban' ? 'selected' : ''; ?>>Cơ bản</option>
                        <option value="van-phong" <?php echo $categoryFilter === 'van-phong' ? 'selected' : ''; ?>>Văn phòng</option>
                        <option value="kho-bai" <?php echo $categoryFilter === 'kho-bai' ? 'selected' : ''; ?>>Kho bãi</option>
                        <option value="phu-phi" <?php echo $categoryFilter === 'phu-phi' ? 'selected' : ''; ?>>Phụ phí</option>
                    </select>
                </div>
                <div class="field">
                    <label for="status">Trạng thái</label>
                    <select id="status" class="select" name="status">
                        <option value="all" <?php echo $statusFilter === 'all' ? 'selected' : ''; ?>>Tất cả</option>
                        <option value="active" <?php echo $statusFilter === 'active' ? 'selected' : ''; ?>>Đang áp dụng</option>
                        <option value="inactive" <?php echo $statusFilter === 'inactive' ? 'selected' : ''; ?>>Tạm ẩn</option>
                    </select>
                </div>
                <div class="form-actions" style="align-self: end;">
                    <button type="submit" class="button button-secondary">Lọc</button>
                    <a href="admin_pricing.php" class="button-link button-secondary">Làm mới</a>
                </div>
            </form>

            <div class="pricing-grid">
                <?php if (!$filteredPricing): ?>
                    <div class="empty-state panel">Không có gói bảng giá phù hợp.</div>
                <?php else: ?>
                    <?php foreach ($filteredPricing as $pricing): ?>
                        <article class="pricing-card">
                            <span class="badge <?php echo moving_admin_badge_class('pricing-status', $pricing['status'] ?? ''); ?>">
                                <?php echo moving_admin_escape(moving_admin_pricing_status_label($pricing['status'] ?? '')); ?>
                            </span>
                            <h3><?php echo moving_admin_escape($pricing['name'] ?? ''); ?></h3>
                            <p class="muted"><?php echo moving_admin_escape(moving_admin_pricing_category_label($pricing['category'] ?? '')); ?> · <?php echo moving_admin_escape($pricing['unit'] ?? ''); ?></p>

                            <div class="pricing-card__meta">
                                <div>
                                    <span>Giá cơ bản</span>
                                    <strong><?php echo moving_admin_escape(moving_admin_money($pricing['base_price'] ?? 0)); ?></strong>
                                </div>
                                <div>
                                    <span>Phụ phí</span>
                                    <strong><?php echo moving_admin_escape(moving_admin_money($pricing['surcharge'] ?? 0)); ?></strong>
                                </div>
                            </div>

                            <p class="muted"><?php echo moving_admin_escape($pricing['description'] ?? ''); ?></p>

                            <div class="inline-actions">
                                <a href="admin_pricing.php?edit=<?php echo urlencode((string) ($pricing['id'] ?? '')); ?>" class="button-link button-secondary">Sửa</a>
                                <form method="post" onsubmit="return confirm('Xóa gói bảng giá này?');">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?php echo moving_admin_escape($pricing['id'] ?? ''); ?>">
                                    <button type="submit" class="button button-danger">Xóa</button>
                                </form>
                            </div>
                        </article>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <aside class="editor-card">
            <h3><?php echo $editingPricing['id'] !== '' ? 'Cập nhật bảng giá' : 'Thêm gói bảng giá'; ?></h3>
            <form method="post">
                <input type="hidden" name="action" value="save">
                <input type="hidden" name="id" value="<?php echo moving_admin_escape($editingPricing['id']); ?>">

                <div class="editor-grid">
                    <div class="field span-full">
                        <label for="name">Tên gói</label>
                        <input id="name" class="input" type="text" name="name" required value="<?php echo moving_admin_escape($editingPricing['name']); ?>">
                    </div>
                    <div class="field">
                        <label for="category-edit">Danh mục</label>
                        <select id="category-edit" class="select" name="category">
                            <option value="co-ban" <?php echo ($editingPricing['category'] ?? '') === 'co-ban' ? 'selected' : ''; ?>>Cơ bản</option>
                            <option value="van-phong" <?php echo ($editingPricing['category'] ?? '') === 'van-phong' ? 'selected' : ''; ?>>Văn phòng</option>
                            <option value="kho-bai" <?php echo ($editingPricing['category'] ?? '') === 'kho-bai' ? 'selected' : ''; ?>>Kho bãi</option>
                            <option value="phu-phi" <?php echo ($editingPricing['category'] ?? '') === 'phu-phi' ? 'selected' : ''; ?>>Phụ phí</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="unit">Đơn vị tính</label>
                        <input id="unit" class="input" type="text" name="unit" required value="<?php echo moving_admin_escape($editingPricing['unit']); ?>">
                    </div>
                    <div class="field">
                        <label for="base_price">Giá cơ bản (VND)</label>
                        <input id="base_price" class="input" type="number" min="0" step="1000" name="base_price" value="<?php echo moving_admin_escape((string) $editingPricing['base_price']); ?>">
                    </div>
                    <div class="field">
                        <label for="surcharge">Phụ phí (VND)</label>
                        <input id="surcharge" class="input" type="number" min="0" step="1000" name="surcharge" value="<?php echo moving_admin_escape((string) $editingPricing['surcharge']); ?>">
                    </div>
                    <div class="field span-full">
                        <label for="status-edit">Trạng thái</label>
                        <select id="status-edit" class="select" name="status">
                            <option value="active" <?php echo ($editingPricing['status'] ?? '') === 'active' ? 'selected' : ''; ?>>Đang áp dụng</option>
                            <option value="inactive" <?php echo ($editingPricing['status'] ?? '') === 'inactive' ? 'selected' : ''; ?>>Tạm ẩn</option>
                        </select>
                    </div>
                    <div class="field span-full">
                        <label for="description">Mô tả</label>
                        <textarea id="description" class="textarea" name="description"><?php echo moving_admin_escape($editingPricing['description']); ?></textarea>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 16px;">
                    <button type="submit" class="button button-primary">Lưu bảng giá</button>
                    <a href="admin_pricing.php" class="button-link button-secondary">Tạo mới</a>
                </div>
            </form>
        </aside>
    </div>
</section>
<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>
