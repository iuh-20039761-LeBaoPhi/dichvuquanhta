<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$admin = admin_require_login();

$q          = trim((string) ($_GET['q']          ?? ''));
$statusFilter = trim((string) ($_GET['status']   ?? 'all'));
$dateFrom   = trim((string) ($_GET['date_from']  ?? ''));
$dateTo     = trim((string) ($_GET['date_to']    ?? ''));

$normalizeDateInput = static function (string $value): string {
    if ($value === '') return '';
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$dt || (($errors['warning_count'] ?? 0) > 0) || (($errors['error_count'] ?? 0) > 0)) return '';
    return $dt->format('Y-m-d');
};

$dateFrom = $normalizeDateInput($dateFrom);
$dateTo   = $normalizeDateInput($dateTo);
if ($dateFrom !== '' && $dateTo !== '' && $dateFrom > $dateTo) {
    [$dateFrom, $dateTo] = [$dateTo, $dateFrom];
}

$data  = get_hoadon_data();
$rows  = is_array($data['rows'] ?? null) ? $data['rows'] : [];
$error = (string) ($data['error'] ?? '');

/* ── Đếm theo trạng thái ── */
$statusCounts = ['all' => count($rows)];
foreach ($rows as $row) {
    $st = trim((string) ($row['trangthai'] ?? ''));
    if ($st === '') $st = 'Chờ khảo sát';
    $statusCounts[$st] = ($statusCounts[$st] ?? 0) + 1;
}
$availableStatuses = array_keys($statusCounts);
sort($availableStatuses);
$availableStatuses = array_merge(['all'], array_diff($availableStatuses, ['all']));

if ($statusFilter !== 'all' && !isset($statusCounts[$statusFilter])) {
    $statusFilter = 'all';
}

/* ── Lọc ── */
$qLower   = function_exists('mb_strtolower') ? mb_strtolower($q, 'UTF-8') : strtolower($q);
$filtered = [];

foreach ($rows as $row) {
    if (!is_array($row)) continue;

    $statusText = trim((string) ($row['trangthai'] ?? ''));
    if ($statusText === '') $statusText = 'Chờ khảo sát';

    if ($statusFilter !== 'all' && $statusText !== $statusFilter) continue;

    if ($qLower !== '') {
        $searchText = implode(' ', [
            (string) ($row['id']           ?? ''),
            (string) ($row['tenkhachhang'] ?? ''),
            (string) ($row['sdtkhachhang'] ?? ''),
            (string) ($row['dich_vu']      ?? ''),
            (string) ($row['goi_dich_vu']  ?? ''),
        ]);
        $searchLower = function_exists('mb_strtolower') ? mb_strtolower($searchText, 'UTF-8') : strtolower($searchText);
        if (strpos($searchLower, $qLower) === false) continue;
    }

    $bookedRaw = trim((string) ($row['ngaydat']               ?? ''));
    if ($bookedRaw === '') $bookedRaw = trim((string) ($row['created_date']          ?? ''));
    if ($bookedRaw === '') $bookedRaw = trim((string) ($row['ngay_bat_dau_kehoach']  ?? ''));

    $bookedDate = '';
    if ($bookedRaw !== '') {
        $ts = strtotime($bookedRaw);
        if ($ts !== false) $bookedDate = date('Y-m-d', $ts);
    }

    if ($dateFrom !== '' && ($bookedDate === '' || $bookedDate < $dateFrom)) continue;
    if ($dateTo   !== '' && ($bookedDate === '' || $bookedDate > $dateTo))   continue;

    $filtered[] = $row;
}

$totalFiltered = count($filtered);

[
    'items'      => $paginatedRows,
    'page'       => $page,
    'perPage'    => $perPage,
    'offset'     => $offset,
    'totalPages' => $totalPages,
] = pagination_array($filtered, pagination_get_page($_GET, 'page', 1), 10);

$buildPageUrl = static fn(int $p): string => pagination_build_url($p, [
    'q'         => $q,
    'status'    => $statusFilter,
    'date_from' => $dateFrom,
    'date_to'   => $dateTo,
]);

/* ── Thống kê nhanh ── */
$totalRevenue  = array_sum(array_column($rows, 'tong_tien'));
$countDone     = count(array_filter($rows, fn($r) => strpos(strtolower((string)($r['trangthai']??'')), 'hoàn') !== false || strpos(strtolower((string)($r['trangthai']??'')), 'xong') !== false));
$countPending  = count(array_filter($rows, fn($r) => trim((string)($r['trangthai']??'')) === '' || strpos(strtolower((string)($r['trangthai']??'')), 'chờ') !== false));
$countProgress = count(array_filter($rows, fn($r) => strpos(strtolower((string)($r['trangthai']??'')), 'thực hiện') !== false || strpos(strtolower((string)($r['trangthai']??'')), 'đang') !== false));

admin_render_layout_start('Quản Lý Đơn Chăm Sóc Vườn', 'orders', $admin);
?>

<style>
    /* ── Page-level overrides (dùng biến từ slidebar) ── */
    .admin-main, .admin-main > main { background: var(--white) !important; }

    .page-title-box {
        background: #fff; padding: 20px 24px; border-radius: 20px;
        border: 1px solid var(--border); box-shadow: 0 2px 8px rgba(26,77,46,.05);
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
    }

    .stat-card {
        border-radius: 16px;
        border: 1px solid var(--border);
        background: #fff;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(26,77,46,.06);
        transition: transform .2s, box-shadow .2s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,77,46,.10); }
    .stat-icon {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; flex-shrink: 0;
    }
    .stat-icon.green  { background: #e8f5e9; color: var(--sidebar-b); }
    .stat-icon.lime   { background: #f1f8e9; color: #558b2f; }
    .stat-icon.amber  { background: #fff8e1; color: #f57f17; }
    .stat-icon.teal   { background: #e0f2f1; color: #00695c; }
    .stat-value { font-size: 1.5rem; font-weight: 800; color: var(--pg); line-height: 1; }
    .stat-label { font-size: .8rem; color: #6b7280; font-weight: 500; margin-top: 2px; }

    /* ── Filter bar ── */
    .filter-bar {
        background: #fff;
        border-radius: 16px;
        border: 1px solid var(--border);
        padding: 18px 20px;
        box-shadow: 0 2px 8px rgba(26,77,46,.04);
    }
    .filter-bar input[type="text"],
    .filter-bar input[type="date"] {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 8px 12px;
        font-size: .875rem;
        background: var(--white);
        color: var(--text);
        transition: border-color .2s, box-shadow .2s;
    }
    .filter-bar input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(67,160,71,.15);
        background: #fff;
    }
    .btn-refresh-page {
        width: 38px; height: 38px;
        border-radius: 10px;
        background: var(--accent);
        color: #fff; border: none;
        display: flex; align-items: center; justify-content: center;
        transition: background .2s, transform .3s;
        cursor: pointer;
    }
    .btn-refresh-page:hover { background: var(--sidebar-a); transform: rotate(180deg); }

    /* ── Status tabs ── */
    .status-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
    .stab {
        padding: 6px 14px; border-radius: 20px;
        font-size: .82rem; font-weight: 600;
        background: var(--white); color: #6b7280;
        border: 1px solid var(--border);
        cursor: pointer; transition: all .2s; text-decoration: none;
        white-space: nowrap;
    }
    .stab:hover { background: #e8f5e9; color: var(--sidebar-b); border-color: #a5d6a7; }
    .stab.active { background: var(--sidebar-b); color: #fff; border-color: var(--sidebar-b); box-shadow: 0 3px 10px rgba(46,125,50,.25); }
    .stab .cnt {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 20px; height: 20px; border-radius: 10px;
        background: rgba(0,0,0,.1); font-size: .75rem; padding: 0 5px; margin-left: 5px;
    }
    .stab.active .cnt { background: rgba(255,255,255,.25); }

    /* ── Table ── */
    .orders-table { width: 100%; border-collapse: collapse; }
    .orders-table thead th {
        background: var(--white);
        color: #6b7280;
        font-size: .72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }
    .orders-table tbody tr { transition: background .15s; }
    .orders-table tbody tr:hover { background: #f9fdf9; }
    .orders-table tbody td {
        padding: 14px 16px;
        border-bottom: 1px solid #f0f4f0;
        font-size: .875rem;
        vertical-align: middle;
    }
    .order-id { font-weight: 800; color: var(--sidebar-b); font-size: .9rem; }
    .cust-name { font-weight: 700; color: var(--pg); }
    .cust-phone { font-size: .78rem; color: #6b7280; margin-top: 2px; }
    .svc-tag {
        display: inline-block;
        background: #e8f5e9; color: var(--pg);
        padding: 3px 10px; border-radius: 6px;
        font-size: .8rem; font-weight: 600;
        max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .price-cell { font-weight: 700; color: var(--pg); white-space: nowrap; }
    .date-cell { font-size: .8rem; color: #6b7280; white-space: nowrap; }

    /* ── Status badges ── */
    .sbadge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px; border-radius: 20px;
        font-size: .75rem; font-weight: 700; white-space: nowrap;
    }
    .sbadge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .7; }
    .sbadge-pending  { background: #f1f5f9; color: #64748b; }
    .sbadge-progress { background: #fff8e1; color: #e65100; }
    .sbadge-done     { background: #e8f5e9; color: #2e7d32; }
    .sbadge-cancel   { background: #ffebee; color: #c62828; }
    .sbadge-confirm  { background: #e8f5e9; color: #1a4d2e; }

    /* ── Mobile cards ── */
    .order-card {
        background: #fff;
        border: 1px solid var(--border);
        border-left: 4px solid var(--accent);
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 10px;
        text-decoration: none;
        display: block;
        color: inherit;
        transition: box-shadow .2s, transform .2s;
    }
    .order-card:hover { box-shadow: 0 4px 16px rgba(26,77,46,.12); transform: translateY(-1px); }

    /* ── Pagination ── */
    .pg-btn {
        width: 34px; height: 34px; border-radius: 8px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: .85rem; font-weight: 600;
        border: 1px solid var(--border);
        background: #fff; color: var(--text);
        text-decoration: none; transition: all .15s;
    }
    .pg-btn:hover { background: #e8f5e9; border-color: #a5d6a7; color: var(--sidebar-b); }
    .pg-btn.active { background: var(--sidebar-b); border-color: var(--sidebar-b); color: #fff; }
    .pg-btn.disabled { opacity: .4; pointer-events: none; }
</style>

<!-- ── Tiêu đề trang ── -->
<div class="page-title-box mb-4">
    <div>
        <h2 style="font-family:'Playfair Display',serif;color:var(--pg);font-size:1.4rem;font-weight:700;margin:0">Quản Lý Đơn Chăm Sóc Vườn</h2>
        <p class="small text-muted mb-0 mt-1">Theo dõi và xử lý tất cả đơn đặt lịch chăm sóc vườn nhà</p>
    </div>
    <a href="index.php" class="btn btn-sm" style="background:var(--lime);color:var(--pg);border:1px solid var(--border);border-radius:10px;font-weight:700">
        <i class="bi bi-arrow-clockwise me-1"></i>Làm mới
    </a>
</div>

<!-- ── Thống kê nhanh ── -->
<div class="row g-3 mb-4">
    <div class="col-6 col-lg-3">
        <div class="stat-card">
            <div class="stat-icon green"><i class="bi bi-calendar2-check"></i></div>
            <div>
                <div class="stat-value"><?= count($rows) ?></div>
                <div class="stat-label">Tổng đơn vườn</div>
            </div>
        </div>
    </div>
    <div class="col-6 col-lg-3">
        <div class="stat-card">
            <div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div>
            <div>
                <div class="stat-value"><?= $countPending ?></div>
                <div class="stat-label">Chờ khảo sát</div>
            </div>
        </div>
    </div>
    <div class="col-6 col-lg-3">
        <div class="stat-card">
            <div class="stat-icon teal"><i class="bi bi-tools"></i></div>
            <div>
                <div class="stat-value"><?= $countProgress ?></div>
                <div class="stat-label">Đang chăm sóc</div>
            </div>
        </div>
    </div>
    <div class="col-6 col-lg-3">
        <div class="stat-card">
            <div class="stat-icon lime"><i class="bi bi-cash-coin"></i></div>
            <div>
                <div class="stat-value" style="font-size:1.1rem"><?= number_format($totalRevenue, 0, ',', '.') ?>đ</div>
                <div class="stat-label">Tổng doanh thu</div>
            </div>
        </div>
    </div>
</div>

<!-- ── Filter bar ── -->
<div class="filter-bar mb-4">
    <form method="get" id="filterForm">
        <input type="hidden" name="status" id="statusInput" value="<?= admin_h($statusFilter) ?>">

        <div class="d-flex flex-wrap align-items-center gap-2">
            <!-- Tiêu đề -->
            <div class="me-auto">
                <div class="fw-bold" style="color:var(--pg);font-size:1rem">
                    <i class="bi bi-tree-fill me-1" style="color:var(--accent)"></i>Lịch Chăm Sóc Vườn
                </div>
                <div class="small text-muted">Tìm thấy <strong><?= $totalFiltered ?></strong> đơn</div>
            </div>

            <!-- Từ ngày -->
            <div class="d-flex align-items-center gap-1">
                <span class="small text-muted fw-semibold">Từ</span>
                <input type="date" name="date_from" value="<?= admin_h($dateFrom) ?>" onchange="this.form.submit()">
            </div>
            <!-- Đến ngày -->
            <div class="d-flex align-items-center gap-1">
                <span class="small text-muted fw-semibold">Đến</span>
                <input type="date" name="date_to" value="<?= admin_h($dateTo) ?>" onchange="this.form.submit()">
            </div>

            <!-- Tìm kiếm -->
            <div class="position-relative">
                <i class="bi bi-search position-absolute top-50 translate-middle-y ms-2 text-muted" style="left:4px"></i>
                <input type="text" name="q" value="<?= admin_h($q) ?>"
                    placeholder="Tên khách, mã đơn..."
                    style="padding-left:28px;min-width:200px"
                    onkeypress="if(event.keyCode===13){this.form.submit();return false;}">
            </div>

            <!-- Refresh -->
            <button type="button" class="btn-refresh-page" onclick="location.href='index.php'" title="Làm mới">
                <i class="bi bi-arrow-clockwise"></i>
            </button>
        </div>

        <!-- Tabs trạng thái -->
        <div class="status-tabs">
            <?php foreach ($availableStatuses as $stKey):
                $label = $stKey === 'all' ? 'Tất cả' : $stKey;
                $isActive = $statusFilter === $stKey;
            ?>
                <a href="javascript:void(0)"
                   onclick="document.getElementById('statusInput').value='<?= admin_h($stKey) ?>';document.getElementById('filterForm').submit()"
                   class="stab <?= $isActive ? 'active' : '' ?>">
                    <?= admin_h($label) ?><span class="cnt"><?= (int)($statusCounts[$stKey] ?? 0) ?></span>
                </a>
            <?php endforeach; ?>
        </div>
    </form>
</div>

<!-- ── Bảng đơn hàng ── -->
<?php if ($error !== ''): ?>
    <div class="alert alert-danger rounded-3"><?= admin_h($error) ?></div>
<?php else: ?>

<!-- Desktop table -->
<div class="card border-0 shadow-sm d-none d-lg-block" style="border-radius:16px;overflow:hidden">
    <table class="orders-table">
        <thead>
            <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Dịch vụ vườn</th>
                <th>Kinh phí</th>
                <th>Trạng thái</th>
                <th>Ngày đặt</th>
                <th class="text-end">Thao tác</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!$paginatedRows): ?>
                <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                        <i class="bi bi-leaf d-block mb-2" style="font-size:2rem;color:#a5d6a7"></i>
                        Chưa có đơn chăm sóc vườn nào.
                    </td>
                </tr>
            <?php else: ?>
                <?php foreach ($paginatedRows as $row):
                    $meta   = hoadon_status_meta((string)($row['trangthai'] ?? ''));
                    $skey   = $meta['key'] ?? 'other';
                    $sbadge = match(true) {
                        $skey === 'completed'  => 'sbadge-done',
                        $skey === 'in_progress'=> 'sbadge-progress',
                        $skey === 'cancelled'  => 'sbadge-cancel',
                        $skey === 'confirmed'  => 'sbadge-confirm',
                        default                => 'sbadge-pending',
                    };
                    $dateRaw = trim((string)($row['ngaydat'] ?? $row['created_date'] ?? ''));
                    $dateDisp = $dateRaw !== '' && ($ts = strtotime($dateRaw)) !== false
                        ? date('d/m/Y', $ts) : '—';
                ?>
                    <tr>
                        <td><span class="order-id">#<?= admin_h(str_pad((string)($row['id']??''), 5, '0', STR_PAD_LEFT)) ?></span></td>
                        <td>
                            <div class="cust-name"><?= admin_h(trim((string)($row['tenkhachhang']??'')) ?: 'Khách vãng lai') ?></div>
                            <div class="cust-phone"><i class="bi bi-telephone-fill me-1"></i><?= admin_h((string)($row['sdtkhachhang']??'—')) ?></div>
                        </td>
                        <td><span class="svc-tag" title="<?= admin_h((string)($row['dich_vu']??'')) ?>"><?= admin_h(trim((string)($row['dich_vu']??'')) ?: 'Tư vấn vườn') ?></span></td>
                        <td class="price-cell"><?= number_format((float)($row['tong_tien']??0), 0, ',', '.') ?>đ</td>
                        <td><span class="sbadge <?= $sbadge ?>"><?= admin_h($meta['text']) ?></span></td>
                        <td class="date-cell"><i class="bi bi-calendar3 me-1"></i><?= $dateDisp ?></td>
                        <td class="text-end">
                            <a href="chi-tiet-hoa-don.php?id=<?= urlencode((string)($row['id']??'')) ?>"
                               class="btn btn-sm btn-success rounded-pill px-3 fw-semibold">
                                <i class="bi bi-eye me-1"></i>Chi tiết
                            </a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- Mobile cards -->
<div class="d-lg-none">
    <?php if (!$paginatedRows): ?>
        <div class="text-center py-5 text-muted">
            <i class="bi bi-leaf d-block mb-2" style="font-size:2rem;color:#a5d6a7"></i>
            Chưa có đơn chăm sóc vườn nào.
        </div>
    <?php else: ?>
        <?php foreach ($paginatedRows as $row):
            $meta   = hoadon_status_meta((string)($row['trangthai'] ?? ''));
            $skey   = $meta['key'] ?? 'other';
            $sbadge = match(true) {
                $skey === 'completed'  => 'sbadge-done',
                $skey === 'in_progress'=> 'sbadge-progress',
                $skey === 'cancelled'  => 'sbadge-cancel',
                $skey === 'confirmed'  => 'sbadge-confirm',
                default                => 'sbadge-pending',
            };
            $dateRaw  = trim((string)($row['ngaydat'] ?? $row['created_date'] ?? ''));
            $dateDisp = $dateRaw !== '' && ($ts = strtotime($dateRaw)) !== false ? date('d/m/Y', $ts) : '—';
        ?>
            <a href="chi-tiet-hoa-don.php?id=<?= urlencode((string)($row['id']??'')) ?>" class="order-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="order-id">#<?= admin_h(str_pad((string)($row['id']??''), 5, '0', STR_PAD_LEFT)) ?></span>
                    <span class="sbadge <?= $sbadge ?>"><?= admin_h($meta['text']) ?></span>
                </div>
                <div class="cust-name mb-1"><?= admin_h(trim((string)($row['tenkhachhang']??'')) ?: 'Khách vãng lai') ?></div>
                <div class="small text-muted mb-2">
                    <i class="bi bi-telephone-fill me-1"></i><?= admin_h((string)($row['sdtkhachhang']??'—')) ?>
                    &nbsp;·&nbsp;
                    <i class="bi bi-calendar3 me-1"></i><?= $dateDisp ?>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="svc-tag"><?= admin_h(trim((string)($row['dich_vu']??'')) ?: 'Tư vấn vườn') ?></span>
                    <span class="fw-bold" style="color:var(--sidebar-b)"><?= number_format((float)($row['tong_tien']??0), 0, ',', '.') ?>đ</span>
                </div>
            </a>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- Pagination -->
<?php if ($totalFiltered > 0): ?>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-4">
        <div class="small text-muted">
            Hiển thị <strong><?= $offset + 1 ?>–<?= min($offset + $perPage, $totalFiltered) ?></strong>
            trong <strong><?= $totalFiltered ?></strong> đơn
        </div>
        <?php if ($totalPages > 1): ?>
            <div class="d-flex gap-1 flex-wrap">
                <a href="<?= admin_h($buildPageUrl(max(1, $page - 1))) ?>"
                   class="pg-btn <?= $page <= 1 ? 'disabled' : '' ?>">
                    <i class="bi bi-chevron-left"></i>
                </a>
                <?php
                $start = max(1, $page - 2);
                $end   = min($totalPages, $page + 2);
                if ($start > 1): ?>
                    <a href="<?= admin_h($buildPageUrl(1)) ?>" class="pg-btn">1</a>
                    <?php if ($start > 2): ?><span class="pg-btn disabled">…</span><?php endif; ?>
                <?php endif; ?>
                <?php for ($i = $start; $i <= $end; $i++): ?>
                    <a href="<?= admin_h($buildPageUrl($i)) ?>"
                       class="pg-btn <?= $i === $page ? 'active' : '' ?>"><?= $i ?></a>
                <?php endfor; ?>
                <?php if ($end < $totalPages): ?>
                    <?php if ($end < $totalPages - 1): ?><span class="pg-btn disabled">…</span><?php endif; ?>
                    <a href="<?= admin_h($buildPageUrl($totalPages)) ?>" class="pg-btn"><?= $totalPages ?></a>
                <?php endif; ?>
                <a href="<?= admin_h($buildPageUrl(min($totalPages, $page + 1))) ?>"
                   class="pg-btn <?= $page >= $totalPages ? 'disabled' : '' ?>">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<?php endif; ?>

<?php admin_render_layout_end(); ?>
