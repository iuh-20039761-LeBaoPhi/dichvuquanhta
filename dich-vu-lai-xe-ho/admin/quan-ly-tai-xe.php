<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/admin_api_common.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$admin = admin_require_login();

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? 'all'));

// Lấy tất cả người dùng
$taiXeData = admin_api_list_table('nguoidung');
$allRows = $taiXeData['rows'] ?? [];
$error = (string)($taiXeData['error'] ?? '');

// Lọc chỉ lấy tài xế (id_dichvu chứa '6' hoặc '1')
$rows = [];
foreach ($allRows as $user) {
    $idDichvu = (string)($user['id_dichvu'] ?? '');
    if (strpos($idDichvu, '6') !== false || strpos($idDichvu, '1') !== false) {
        $rows[] = $user;
    }
}

// Lọc dữ liệu theo từ khóa và trạng thái
$filtered = array_values(array_filter($rows, static function (array $row) use ($q, $statusFilter): bool {
    $status = trim((string)($row['trangthai'] ?? ''));
    if ($statusFilter !== 'all' && $status !== $statusFilter) {
        return false;
    }

    if ($q !== '') {
        $target = strtolower(implode(' ', [
            (string)($row['id'] ?? ''),
            (string)($row['hovaten'] ?? ''),
            (string)($row['email'] ?? ''),
            (string)($row['sodienthoai'] ?? ''),
            (string)($row['so_bang_lai'] ?? ''),
            (string)($row['trangthai'] ?? ''),
        ]));
        return strpos($target, strtolower($q)) !== false;
    }

    return true;
}));

// Phân trang
[
    'items' => $paginatedRows,
    'page' => $page,
    'perPage' => $perPage,
    'offset' => $offset,
    'totalItems' => $totalFiltered,
    'totalPages' => $totalPages,
] = pagination_array($filtered, pagination_get_page($_GET, 'page', 1), 5);

$buildPageUrl = static fn(int $targetPage): string => pagination_build_url($targetPage, [
    'q' => $q,
    'status' => $statusFilter,
]);

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

admin_render_layout_start('Quản Lý Tài Xế', 'drivers', $admin);
?>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<div class="card border-0 shadow-sm mb-3">
    <div class="card-body">
        <form method="get" class="row g-2 align-items-end">
            <div class="col-12 col-md-5 col-lg-4">
                <label class="form-label mb-1">Tìm kiếm</label>
                <input type="text" class="form-control" name="q" value="<?= admin_h($q) ?>" placeholder="Tên, email, SĐT, số bằng lái...">
            </div>
            <div class="col-6 col-md-4 col-lg-3">
                <label class="form-label mb-1">Trạng thái</label>
                <select class="form-select" name="status">
                    <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                    <option value="pending" <?= $statusFilter === 'pending' ? 'selected' : '' ?>>Chờ duyệt</option>
                    <option value="active" <?= $statusFilter === 'active' ? 'selected' : '' ?>>Hoạt động</option>
                    <option value="busy" <?= $statusFilter === 'busy' ? 'selected' : '' ?>>Đang bận</option>
                    <option value="offline" <?= $statusFilter === 'offline' ? 'selected' : '' ?>>Ngoại tuyến</option>
                    <option value="blocked" <?= $statusFilter === 'blocked' ? 'selected' : '' ?>>Bị khóa</option>
                </select>
            </div>
            <div class="col-6 col-md-3 col-lg-2 d-grid">
                <button class="btn btn-success" type="submit"><i class="bi bi-funnel me-1"></i>Lọc</button>
            </div>
            <div class="col-12 col-lg-3 text-lg-end text-secondary small">
                Tổng: <strong><?= (int)$totalFiltered ?></strong> tài xế
            </div>
        </form>
    </div>
</div>

<div class="card border-0 shadow-sm">
    <div class="card-body">
        <?php if ($error !== ''): ?>
            <div class="alert alert-warning mb-0"><?= admin_h($error) ?></div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>ID</th>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>Số điện thoại</th>
                            <th>Số bằng lái</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th class="text-end">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (!$paginatedRows): ?>
                        <tr><td colspan="8" class="text-center py-4 text-secondary">Không có dữ liệu tài xế.</td></tr>
                    <?php else: ?>
                        <?php foreach ($paginatedRows as $row): ?>
                            <?php
                            $status = trim((string)($row['trangthai'] ?? ''));
                            $badge = match ($status) {
                                'pending'   => 'text-bg-warning',
                                'active'    => 'text-bg-success',
                                'busy'      => 'text-bg-info',
                                'offline'   => 'text-bg-secondary',
                                'blocked'   => 'text-bg-danger',
                                'rejected'  => 'text-bg-danger',
                                default     => 'text-bg-dark',
                            };
                            
                            $statusDisplay = match ($status) {
                                'pending'   => 'Chờ duyệt',
                                'active'    => 'Hoạt động',
                                'busy'      => 'Đang bận',
                                'offline'   => 'Ngoại tuyến',
                                'blocked'   => 'Đã khóa',
                                'rejected'  => 'Bị từ chối',
                                default     => $status ?: 'N/A',
                            };
                            ?>
                            <tr>
                                <td class="fw-semibold text-primary">#<?= admin_h((string)($row['id'] ?? '')) ?></td>
                                <td>
                                    <div class="fw-semibold"><?= admin_h((string)($row['hovaten'] ?? 'N/A')) ?></div>
                                    <div class="small text-secondary"><?= admin_h((string)($row['diachi'] ?? '')) ?></div>
                                </td>
                                <td><?= admin_h((string)($row['email'] ?? 'N/A')) ?></td>
                                <td><?= admin_h((string)($row['sodienthoai'] ?? 'N/A')) ?></td>
                                <td><?= admin_h((string)($row['so_bang_lai'] ?? $row['so_bang_lai_xe'] ?? 'N/A')) ?></td>
                                <td><span class="badge rounded-pill <?= admin_h($badge) ?>"><?= admin_h($statusDisplay) ?></span></td>
                                <td><?= admin_h((string)($row['created_date'] ?? $row['ngay_tao'] ?? $row['ngay_dang_ky'] ?? 'N/A')) ?></td>
                                <td class="text-end">
                                    <div class="d-inline-flex gap-1 flex-wrap justify-content-end">
                                        <a href="chi-tiet-tai-xe.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>" class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-eye me-1"></i>Chi tiết
                                        </a>
                                        <?php if ($status === 'pending'): ?>
                                            <form method="post" action="duyet-tai-xe.php" class="d-inline">
                                                <input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
                                                <input type="hidden" name="return" value="quan-ly-tai-xe.php">
                                                <button type="submit" class="btn btn-sm btn-success"><i class="bi bi-check2-circle me-1"></i>Duyệt</button>
                                            </form>
                                        <?php endif; ?>
                                        <?php if ($status === 'active' || $status === 'busy' || $status === 'offline'): ?>
                                            <form method="post" action="khoa-tai-xe.php" class="d-inline" onsubmit="return confirm('Bạn có chắc chắn muốn khóa tài khoản tài xế này?');">
                                                <input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
                                                <input type="hidden" name="return" value="quan-ly-tai-xe.php">
                                                <button type="submit" class="btn btn-sm btn-outline-danger"><i class="bi bi-lock me-1"></i>Khóa</button>
                                            </form>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <?php if ($totalFiltered > 0): ?>
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
                    <div class="small text-secondary">
                        Hiển thị <?= (int)($offset + 1) ?> - <?= (int)min($offset + $perPage, $totalFiltered) ?> / <?= (int)$totalFiltered ?> tài xế
                    </div>
                    <?php if ($totalPages > 1): ?>
                        <nav aria-label="Phân trang tài xế">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= admin_h($buildPageUrl(max(1, $page - 1))) ?>">Trước</a>
                                </li>
                                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                        <a class="page-link" href="<?= admin_h($buildPageUrl($i)) ?>"><?= $i ?></a>
                                    </li>
                                <?php endfor; ?>
                                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= admin_h($buildPageUrl(min($totalPages, $page + 1))) ?>">Sau</a>
                                </li>
                            </ul>
                        </nav>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<?php admin_render_layout_end(); ?>