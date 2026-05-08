<?php

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';

$admin = admin_require_login();

$q = trim((string) ($_GET['q'] ?? ''));

$data = get_dichvu_data();
$rows = $data['rows'] ?? [];
$error = (string) ($data['error'] ?? '');

$filtered = array_values(array_filter($rows, static function (array $row) use ($q): bool {
    if ($q === '') {
        return true;
    }

    // ĐỒNG NHẤT LOGIC TÌM KIẾM VỚI CẤU TRÚC JSON MỚI
    // Lấy thông tin giá từ trường mới hoặc trường đã chuẩn hóa
    $priceMin = (string) ($row['price_m2_min'] ?? ($row['pricing']['base_price'] ?? ''));
    $priceMax = (string) ($row['price_m2_max'] ?? ($row['pricing']['max_price'] ?? ''));
    $priceNote = (string) ($row['price_note'] ?? ($row['pricing']['note'] ?? ''));
    $serviceArea = (string) ($row['service_area'] ?? implode(' ', $row['loai'] ?? []));
    
    // Gom tất cả text lại để tìm kiếm (không phá vỡ logic cũ)
    $target = strtolower(implode(' ', [
        (string) ($row['id'] ?? ''),
        (string) ($row['name'] ?? ''),
        (string) ($row['description'] ?? ''),
        (string) ($row['category'] ?? ''),
        $serviceArea,
        $priceMin,
        $priceMax,
        $priceNote,
        implode(' ', (array)($row['tags'] ?? [])),
        implode(' ', (array)($row['includes'] ?? [])),
    ]));

    return strpos($target, strtolower($q)) !== false;
}));

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

$truncate = static function (string $text, int $limit = 120): string {
    if ($text === '') {
        return '';
    }

    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        if (mb_strlen($text) <= $limit) {
            return $text;
        }
        return rtrim(mb_substr($text, 0, $limit)) . '...';
    }

    if (strlen($text) <= $limit) {
        return $text;
    }

    return rtrim(substr($text, 0, $limit)) . '...';
};

admin_render_layout_start('Quản Lý Dịch Vụ', 'services', $admin);
?>

<style>
    .page-title-box {
        background: var(--white); padding: 18px 22px; border-radius: var(--r-xl);
        border: 1px solid var(--border-soft); box-shadow: var(--shadow-sm);
        margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;
    }

    .card { border-radius: var(--r-lg); border: 1px solid var(--border-soft); box-shadow: var(--shadow-sm); }
    .search-card { background: var(--white); }
    .table-container { background: var(--white); border-radius: var(--r-lg); overflow: hidden; border: 1px solid var(--border-soft); }

    .table thead th {
        background: var(--g25); color: var(--muted); font-weight: 700;
        text-transform: uppercase; font-size: .7rem; letter-spacing: .8px;
        padding: 12px 16px; border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    .table tbody td { padding: 13px 16px; border-color: var(--border-soft); vertical-align: middle; }
    .table-hover tbody tr:hover { background: var(--g25); }

    .service-img-wrapper {
        width: 52px; height: 52px; border-radius: var(--r-md); overflow: hidden;
        border: 2px solid var(--border); box-shadow: var(--shadow-sm);
    }
    .badge-includes {
        background: var(--g50); color: var(--g700); padding: 4px 12px;
        border-radius: 99px; font-size: .75rem; font-weight: 700; border: 1px solid var(--g100);
    }
    .action-buttons .btn {
        width: 32px; height: 32px; padding: 0;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: var(--r-sm); margin-left: 4px; transition: all .18s;
    }
    @media (max-width: 767.98px) {
        .service-item-mobile {
            background: var(--white); border-radius: var(--r-lg); padding: 14px; margin-bottom: 10px;
            border: 1px solid var(--border-soft); display: flex; gap: 14px; position: relative;
            box-shadow: var(--shadow-sm);
        }
        .mobile-img { width: 64px; height: 64px; border-radius: var(--r-md); object-fit: cover; }
        .mobile-info h6 { color: var(--g800); font-weight: 700; margin-bottom: 4px; }
        .btn-edit-mobile { position: absolute; top: 14px; right: 14px; color: var(--g700); }
    }
</style>

<div class="page-title-box">
    <div>
        <h2 class="h5 mb-0 fw-bold" style="color:var(--g800);">Quản lý dịch vụ vườn</h2>
        <p style="font-size:.8rem;color:var(--muted);margin:2px 0 0;">Danh sách các dịch vụ chăm sóc vườn đang cung cấp</p>
    </div>
    <a href="them-dich-vu.php" class="btn btn-primary btn-sm px-3 fw-bold" style="border-radius:var(--r-sm);">
        <i class="bi bi-plus-lg me-1"></i>Thêm dịch vụ
    </a>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> border-0 shadow-sm mb-4">
        <i class="bi <?= $flashOk ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill' ?> me-2"></i>
        <?= admin_h($flashMsg) ?>
    </div>
<?php endif; ?>

<div class="card search-card shadow-sm mb-4">
    <div class="card-body p-3">
        <form method="get" class="row g-2 align-items-center">
            <div class="col-12 col-md-8">
                <div class="input-group">
                    <span class="input-group-text bg-light border-0"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control bg-light border-0" name="q" value="<?= admin_h($q) ?>"
                           placeholder="Tìm kiếm theo tên, mô tả hoặc bảng giá...">
                </div>
            </div>
            <div class="col-6 col-md-2 d-grid">
                <button class="btn btn-dark" style="border-radius:10px;" type="submit">Tìm lọc</button>
            </div>
            <div class="col-6 col-md-2 text-end">
                <span class="text-secondary small">Tổng: <b class="text-dark"><?= (int) count($filtered) ?></b></span>
            </div>
        </form>
    </div>
</div>

<div class="table-container shadow-sm">
    <div class="card-body p-0">
        <?php if ($error !== ''): ?>
            <div class="p-4 text-center">
                <div class="alert alert-warning d-inline-block"><?= admin_h($error) ?></div>
            </div>
        <?php else: ?>
            <?php if (!$filtered): ?>
                <div class="text-center py-5">
                    <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" width="64" class="opacity-25 mb-3">
                    <p class="text-secondary">Không tìm thấy dịch vụ nào phù hợp.</p>
                </div>
            <?php else: ?>
                <!-- Desktop View -->
                <div class="table-responsive d-none d-md-block">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th width="80" class="text-center">ID</th>
                                <th width="100">Hình ảnh</th>
                                <th>Tên dịch vụ</th>
                                <th>Mô tả tóm tắt</th>
                                <th class="text-center">Công việc</th>
                                <th width="150" class="text-end">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($filtered as $row): ?>
                                <tr>
                                    <td class="text-center text-secondary fw-medium">#<?= (int) ($row['id'] ?? 0) ?></td>
                                    <td>
                                        <div class="service-img-wrapper">
                                            <?php if (!empty($row['image'])): ?>
                                                <?php if (strpos($row['image'], '.') !== false): ?>
                                                    <!-- Nếu là file ảnh trực tiếp từ JSON mới -->
                                                    <img src="../assets/images/<?= admin_h($row['image']) ?>" style="width:100%;height:100%;object-fit:cover;">
                                                <?php else: ?>
                                                    <!-- Nếu là ID Google Drive từ dữ liệu cũ -->
                                                    <iframe src="https://drive.google.com/file/d/<?= urlencode($row['image']) ?>/preview"
                                                        style="width:100%;height:100%;border:none;pointer-events:none;transform: scale(1.5);"
                                                        scrolling="no" loading="lazy"></iframe>
                                                <?php endif; ?>
                                            <?php else: ?>
                                                <div class="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
                                                    <i class="bi bi-image text-muted"></i>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="fw-bold text-dark"><?= admin_h((string) ($row['name'] ?? 'N/A')) ?></div>
                                    </td>
                                    <td class="text-muted small"><?= admin_h($truncate((string) ($row['description'] ?? ''))) ?></td>
                                    <td class="text-center">
                                        <span class="badge-includes"><?= (int) count($row['includes'] ?? $row['tags'] ?? []) ?> đầu việc</span>
                                    </td>
                                    <td class="text-end">
                                        <div class="action-buttons">
                                            <a href="chi-tiet-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>"
                                               class="btn btn-sm btn-outline-info" title="Xem">
                                                <i class="bi bi-eye"></i>
                                            </a>
                                            <a href="sua-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>"
                                               class="btn btn-sm btn-outline-warning" title="Sửa">
                                                <i class="bi bi-pencil"></i>
                                            </a>
                                            <form method="post" action="xu-ly-xoa-dich-vu.php" class="d-inline"
                                                  onsubmit="return confirm('Xác nhận xóa dịch vụ này?');">
                                                <input type="hidden" name="id" value="<?= (int) ($row['id'] ?? 0) ?>">
                                                <input type="hidden" name="q" value="<?= admin_h($q) ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-danger">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile View -->
                <div class="d-md-none p-3">
                    <?php foreach ($filtered as $row): ?>
                        <div class="service-item-mobile shadow-sm" onclick="location.href='chi-tiet-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>'">
                            <div class="mobile-img-box">
                                <?php if (!empty($row['image'])): ?>
                                    <?php if (strpos($row['image'], '.') !== false): ?>
                                        <img src="assets/images/<?= admin_h($row['image']) ?>" class="mobile-img">
                                    <?php else: ?>
                                        <iframe src="https://drive.google.com/file/d/<?= urlencode($row['image']) ?>/preview"
                                                class="mobile-img" style="border:none;pointer-events:none;" scrolling="no" loading="lazy"></iframe>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <div class="mobile-img bg-light d-flex align-items-center justify-content-center">
                                        <i class="bi bi-image text-secondary"></i>
                                    </div>
                                <?php endif; ?>
                            </div>
                            <div class="mobile-info flex-grow-1">
                                <h6 class="mb-1 text-truncate" style="max-width: 180px;"><?= admin_h((string) ($row['name'] ?? 'N/A')) ?></h6>
                                <p class="text-muted small mb-1">ID: #<?= (int) ($row['id'] ?? 0) ?></p>
                                <span class="badge-includes"><?= (int) count($row['includes'] ?? $row['tags'] ?? []) ?> công việc</span>
                            </div>
                            <a href="sua-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>" 
                               class="btn-edit-mobile" onclick="event.stopPropagation();">
                                <i class="bi bi-pencil-square fs-5"></i>
                            </a>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<?php admin_render_layout_end(); ?>