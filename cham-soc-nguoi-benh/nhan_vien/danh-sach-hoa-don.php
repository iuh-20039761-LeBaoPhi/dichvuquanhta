<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoa-don.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

function format_invoice_id_display($value): string
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return '---';
    }

    if (!is_numeric($raw)) {
        return '---';
    }

    $num = (float) $raw;
    if (!is_finite($num) || $num < 0) {
        return '---';
    }

    $id = (int) $num;
    return str_pad((string) $id, 7, '0', STR_PAD_LEFT);
}

$q = trim((string) ($_GET['q'] ?? ''));
$statusFilter = trim((string) ($_GET['status'] ?? 'all'));
$serviceFilter = trim((string) ($_GET['service'] ?? 'all'));
$sortFilter = strtolower(trim((string) ($_GET['sort'] ?? 'newest')));

if (!in_array($sortFilter, ['newest', 'oldest', 'status', 'customer'], true)) {
    $sortFilter = 'newest';
}

$serviceMap = [];
$statusMap = [];

foreach ($rows as $row) {
    $service = trim((string) ($row['dich_vu'] ?? ''));
    if ($service !== '') {
        $serviceMap[$service] = $service;
    }

    $status = trim((string) ($row['trangthai'] ?? ''));
    if ($status === '') {
        $status = 'chờ duyệt';
    }
    $statusMap[$status] = $status;
}

$services = array_values($serviceMap);
sort($services);

$statuses = array_values($statusMap);
sort($statuses);

if ($statusFilter !== 'all' && !isset($statusMap[$statusFilter])) {
    $statusFilter = 'all';
}
if ($serviceFilter !== 'all' && !isset($serviceMap[$serviceFilter])) {
    $serviceFilter = 'all';
}

$filteredRows = array_values(array_filter($rows, static function (array $item) use ($q, $statusFilter, $serviceFilter): bool {
    $status = trim((string) ($item['trangthai'] ?? ''));
    if ($status === '') {
        $status = 'chờ duyệt';
    }
    $service = trim((string) ($item['dich_vu'] ?? ''));

    if ($statusFilter !== 'all' && $status !== $statusFilter) {
        return false;
    }

    if ($serviceFilter !== 'all' && $service !== $serviceFilter) {
        return false;
    }

    if ($q !== '') {
        $searchTarget = implode(' ', [
            (string) ($item['id'] ?? ''),
            (string) ($item['tenkhachhang'] ?? ''),
            (string) ($item['dich_vu'] ?? ''),
            (string) ($item['goi_dich_vu'] ?? ''),
            (string) ($item['sdtkhachhang'] ?? ''),
            (string) ($item['ngay_bat_dau_kehoach'] ?? ''),
        ]);

        if (function_exists('mb_stripos')) {
            if (mb_stripos($searchTarget, $q, 0, 'UTF-8') === false) {
                return false;
            }
        } elseif (stripos($searchTarget, $q) === false) {
            return false;
        }
    }

    return true;
}));

if ($sortFilter === 'oldest') {
    usort($filteredRows, static fn(array $a, array $b): int => ((int) ($a['id'] ?? 0)) <=> ((int) ($b['id'] ?? 0)));
} elseif ($sortFilter === 'status') {
    usort($filteredRows, static function (array $a, array $b): int {
        $left = (string) ($a['trangthai'] ?? '');
        $right = (string) ($b['trangthai'] ?? '');
        $statusCompare = strcasecmp($left, $right);
        if ($statusCompare === 0) {
            return ((int) ($b['id'] ?? 0)) <=> ((int) ($a['id'] ?? 0));
        }
        return $statusCompare;
    });
} elseif ($sortFilter === 'customer') {
    usort($filteredRows, static fn(array $a, array $b): int => strcasecmp((string) ($a['tenkhachhang'] ?? ''), (string) ($b['tenkhachhang'] ?? '')));
} else {
    usort($filteredRows, static fn(array $a, array $b): int => ((int) ($b['id'] ?? 0)) <=> ((int) ($a['id'] ?? 0)));
}

[
    'items' => $paginatedRows,
    'page' => $page,
    'perPage' => $perPage,
    'totalItems' => $totalFiltered,
    'totalPages' => $totalPages,
    'from' => $from,
    'to' => $to,
] = pagination_array($filteredRows, pagination_get_page($_GET, 'page', 1), 5);

$buildPageUrl = static fn(int $targetPage): string => pagination_build_url($targetPage, [
    'q' => $q,
    'status' => $statusFilter,
    'service' => $serviceFilter,
    'sort' => $sortFilter,
], 'page', 'danh-sach-hoa-don.php');

$summaryPending = count(array_filter($rows, static fn(array $i): bool => trim((string) ($i['trangthai'] ?? '')) === '' || trim((string) ($i['trangthai'] ?? '')) === 'chờ duyệt'));
$summaryReceived = count(array_filter($rows, static fn(array $i): bool => trim((string) ($i['trangthai'] ?? '')) === 'hoàn thành' || trim((string) ($i['trangthai'] ?? '')) === 'đã nhận' || trim((string) ($i['trangthai'] ?? '')) === 'đang thực hiện'));
$summaryTotal = count($rows);
?>
<?php
$pageTitle = "Danh sách đơn hàng";
include 'layout-header.php';
?>
<style>
    /* Giữ nguyên style gốc của trang */
    .page-wrap {
        max-width: 1380px;
        margin: 0 auto;
        padding: 14px;
    }

    .panel-soft {
        border: 0;
        border-radius: 16px;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    }

    .stat-card {
        border-radius: 14px;
        border: 1px solid #edf2f7;
        background: #ffffff;
        padding: 14px;
        height: 100%;
    }

    .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }

    .stat-value {
        font-size: 1.4rem;
        font-weight: 700;
        line-height: 1;
        margin-top: 4px;
    }

    .filter-box {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #f8fafc;
        padding: 12px;
    }

    .table-wrap {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
        background: #fff;
    }

    .jobs-table {
        --bs-table-bg: transparent;
        --bs-table-hover-bg: #f8fbff;
        margin-bottom: 0;
        min-width: 980px;
        vertical-align: middle;
    }

    .jobs-table thead th {
        background: #f1f5f9;
        color: #334155;
        white-space: nowrap;
        font-weight: 700;
        padding: 12px 14px;
        border-bottom: 1px solid #e2e8f0;
    }

    .jobs-table tbody td {
        padding: 12px 14px;
        border-color: #edf2f7;
    }

    .id-badge {
        min-width: 48px;
        text-align: center;
        font-weight: 700;
        border-radius: 999px;
    }

    .action-group {
        display: inline-flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .btn-action {
        min-width: 102px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.86rem;
    }

    .empty-row {
        text-align: center;
        color: #64748b;
        font-weight: 500;
    }

    .summary-note {
        color: #64748b;
        font-size: 0.92rem;
    }

    @media (max-width: 991.98px) {
        .table-wrap { border: none !important; box-shadow: none !important; background: transparent !important; }
        .page-wrap { padding: 1px; }
        .panel-soft { margin: 1px; border-radius: 12px; }
        .card-body { padding: 8px 1px !important; }
        .stat-card { padding: 8px 6px; }
        .stat-value { font-size: 1.2rem; }
        .filter-box { padding: 8px 4px; }
        .jobs-table thead th, .jobs-table tbody td { padding: 8px 6px; font-size: 0.85rem; }
        .row { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
        .mb-3 { margin-bottom: 0.5rem !important; }
        .g-2, .g-3 { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
    }
</style>
<style>
    /* Theme color overrides */
    body {
        background: linear-gradient(180deg, #f0f7ff 0%, #e1effe 48%, #f8fafc 100%);
        color: #1e3a8a;
    }

    .panel-soft {
        border: 1px solid #bbd9fb;
        border-radius: 16px;
        box-shadow: 0 14px 34px rgba(30, 64, 175, 0.12);
        background: #f0f7ff;
    }

    .stat-card {
        border-color: #bbd9fb;
        background: linear-gradient(180deg, #f0f7ff, #e1effe);
        box-shadow: 0 8px 20px rgba(30, 107, 184, 0.08);
    }

    .filter-box {
        border-color: #bbd9fb;
        border-radius: 14px;
        background: linear-gradient(180deg, #f8fafc, #f0f7ff);
        box-shadow: 0 8px 18px rgba(30, 107, 184, 0.06);
    }

    .table-wrap {
        border-color: #bbd9fb;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 10px 22px rgba(30, 64, 175, 0.1);
    }

    .jobs-table { --bs-table-hover-bg: #e1effe; }

    .jobs-table thead th {
        background: linear-gradient(135deg, #dbeafe 0%, #e1effe 100%);
        color: #1e40af;
        border-bottom-color: #bbd9fb;
    }

    .jobs-table tbody td { border-color: #dbeafe; }

    .id-badge {
        background: #dbeafe !important;
        border-color: #bbd9fb !important;
        color: #1e40af !important;
    }

    .summary-note, .empty-row, .text-secondary, .form-label.small.text-secondary {
        color: #475569 !important;
    }

    .badge.rounded-pill.text-bg-warning,
    .badge.rounded-pill.text-bg-info,
    .badge.rounded-pill.text-bg-success,
    .badge.rounded-pill.text-bg-secondary {
        border: 1px solid #bbd9fb;
        background: #e1effe !important;
        color: #1e40af !important;
    }

    .btn-primary {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
    }

    .btn-primary:hover, .btn-primary:focus {
        border-color: #2563eb;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
    }

    .btn-outline-secondary {
        color: #1e40af;
        border-color: #bbd9fb;
        background: #f8fafc;
    }

    .btn-outline-secondary:hover, .btn-outline-secondary:focus {
        color: #fff;
        border-color: #1e40af;
        background: #1e40af;
    }

    .form-control, .form-select, .input-group-text {
        border-color: #bbd9fb;
        background: #f8fafc;
        color: #1e3a8a;
    }

    .form-control:focus, .form-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.2);
    }

    .pagination .page-link {
        color: #1e40af;
        border-color: #bbd9fb;
        background: #f8fafc;
    }

    .pagination .page-item.active .page-link {
        border-color: #1e40af;
        background: #1e40af;
        color: #fff;
    }

    .alert-success {
        color: #1f6148;
        background: #e9f8f1;
        border-color: #9dd9be;
        box-shadow: 0 8px 16px rgba(31, 97, 72, 0.08);
    }

    .alert-warning {
        color: #7c2d12;
        background: #fff7ed;
        border-color: #fed7aa;
        box-shadow: 0 8px 16px rgba(124, 45, 18, 0.08);
    }

    /* Mobile Card Styles */
    .invoice-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        margin-bottom: 2px;
        border-radius: 5px;
        padding: 10px;
        text-decoration: none !important;
        color: inherit !important;
        display: block;
        transition: background 0.2s;
    }

    .invoice-card:active { background: #e1effe; }
    .invoice-card .inv-id { color: #2563eb; font-weight: 700; font-size: 0.95rem; }
    .invoice-card .inv-date { color: #94a3b8; font-size: 0.75rem; }
    .invoice-card .inv-name { font-weight: 700; font-size: 1rem; color: #1e293b; margin-top: 4px; }
    .invoice-card .inv-status { background: #1e293b; color: #fff; font-size: 0.7rem; padding: 4px 10px; border-radius: 999px; font-weight: 600; }
    .invoice-card .inv-service { color: #64748b; font-size: 0.85rem; margin-top: 2px; }
    .invoice-card .inv-price { color: #3b82f6; font-weight: 700; font-size: 1.1rem; text-align: right; margin-top: 4px; }
</style>

<div class="page-wrap">
    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2" role="alert">
            <?= htmlspecialchars($flashMsg, ENT_QUOTES, 'UTF-8') ?>
        </div>
    <?php endif; ?>

    <section class="card panel-soft mb-3">
        <div class="card-body p-3 p-lg-4">
            <?php if (!$isEmployeeApproved): ?>
                <div class="alert alert-warning mb-0">Tài khoản của bạn đang chờ duyệt</div>
            <?php else: ?>
                <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-3">
                    <div>
                        <h1 class="h4 fw-bold mb-1">Danh sách đơn hàng</h1>
                    </div>
                    <div class="text-secondary small">Tổng hiển thị: <b><?= (int) $totalFiltered ?></b> /
                        <?= (int) $summaryTotal ?> hoa don
                    </div>
                </div>

                <div class="row g-2 g-lg-3 mb-3">
                    <div class="col-12 col-md-4">
                        <div class="stat-card">
                            <div class="d-flex align-items-center justify-content-between gap-3">
                                <div>
                                    <div class="text-secondary small">Đang chờ nhận</div>
                                    <div class="stat-value text-warning-emphasis"><?= (int) $summaryPending ?></div>
                                </div>
                                <div class="stat-icon bg-warning-subtle text-warning-emphasis"><i
                                        class="bi bi-hourglass-split"></i></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="stat-card">
                            <div class="d-flex align-items-center justify-content-between gap-3">
                                <div>
                                    <div class="text-secondary small">Đã nhận việc</div>
                                    <div class="stat-value text-success-emphasis"><?= (int) $summaryReceived ?></div>
                                </div>
                                <div class="stat-icon bg-success-subtle text-success-emphasis"><i
                                        class="bi bi-check2-circle"></i></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="stat-card">
                            <div class="d-flex align-items-center justify-content-between gap-3">
                                <div>
                                    <div class="text-secondary small">Tổng công việc</div>
                                    <div class="stat-value text-primary"><?= (int) $summaryTotal ?></div>
                                </div>
                                <div class="stat-icon bg-primary-subtle text-primary-emphasis"><i
                                        class="bi bi-collection"></i></div>
                            </div>
                        </div>
                    </div>
                </div>

                <form method="get" class="filter-box mb-3">
                    <div class="row g-2 align-items-end">
                        <div class="col-12 col-md-4 col-lg-3">
                            <label class="form-label small text-secondary mb-1">Tìm kiếm</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control" name="q"
                                    value="<?= htmlspecialchars($q, ENT_QUOTES, 'UTF-8') ?>"
                                    placeholder="ID, khach hang, SDT...">
                            </div>
                        </div>
                        <div class="col-6 col-md-3 col-lg-2">
                            <label class="form-label small text-secondary mb-1">Trạng thái</label>
                            <select class="form-select" name="status">
                                <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                                <?php foreach ($statuses as $statusOption): ?>
                                    <option value="<?= htmlspecialchars($statusOption, ENT_QUOTES, 'UTF-8') ?>"
                                        <?= $statusFilter === $statusOption ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($statusOption, ENT_QUOTES, 'UTF-8') ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-6 col-md-3 col-lg-3">
                            <label class="form-label small text-secondary mb-1">Dịch vụ</label>
                            <select class="form-select" name="service">
                                <option value="all">Tất cả</option>
                                <?php foreach ($services as $serviceOption): ?>
                                    <option value="<?= htmlspecialchars($serviceOption, ENT_QUOTES, 'UTF-8') ?>"
                                        <?= $serviceFilter === $serviceOption ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($serviceOption, ENT_QUOTES, 'UTF-8') ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-6 col-md-3 col-lg-2">
                            <label class="form-label small text-secondary mb-1">Sap xep</label>
                            <select class="form-select" name="sort">
                                <option value="newest" <?= $sortFilter === 'newest' ? 'selected' : '' ?>>Mới nhất</option>
                                <option value="oldest" <?= $sortFilter === 'oldest' ? 'selected' : '' ?>>Cũ nhất</option>
                                <option value="status" <?= $sortFilter === 'status' ? 'selected' : '' ?>>Theo trạng thái
                                </option>
                                <option value="customer" <?= $sortFilter === 'customer' ? 'selected' : '' ?>>Theo khách
                                    hàng</option>
                            </select>
                        </div>
                        <div class="col-6 col-md-3 col-lg-2 d-flex gap-2">
                            <button class="btn btn-primary flex-fill" type="submit"><i
                                    class="bi bi-funnel me-1"></i>Loc</button>
                            <a class="btn btn-outline-secondary" href="danh-sach-hoa-don.php"
                               onclick="event.preventDefault(); navigateTo('danh-sach-hoa-don.php');"><i
                                    class="bi bi-arrow-counterclockwise"></i></a>
                        </div>
                    </div>
                </form>

                <div class="table-wrap">
                    <!-- Desktop View: Table -->
                    <div class="table-responsive d-none d-md-block">
                        <table class="table jobs-table align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Khách hàng</th>
                                    <th>Dịch vụ</th>
                                    <th>Tổng tiền</th>
                                    <th>Ngay bắt đàu</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if ($loadError !== ''): ?>
                                    <tr>
                                        <td colspan="7" class="empty-row py-4">Loi tai du lieu:
                                            <?= htmlspecialchars($loadError, ENT_QUOTES, 'UTF-8') ?>
                                        </td>
                                    </tr>
                                <?php elseif (!$paginatedRows): ?>
                                    <tr>
                                        <td colspan="7" class="empty-row py-4">Khong co hoa don phu hop bo loc.</td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($paginatedRows as $item): ?>
                                        <?php
                                        $itemId = (int) ($item['id'] ?? 0);
                                        $displayItemId = format_invoice_id_display($item['id'] ?? '');
                                        $statusValue = trim((string) ($item['trangthai'] ?? ''));
                                        if ($statusValue === '') { $statusValue = 'chờ duyệt'; }
                                        $badgeClass = 'text-bg-secondary';
                                        if ($statusValue === 'chờ duyệt') { $badgeClass = 'text-bg-warning'; }
                                        elseif ($statusValue === 'đã duyệt') { $badgeClass = 'text-bg-info'; }
                                        elseif ($statusValue === 'đã nhận') { $badgeClass = 'text-bg-success'; }
                                        ?>
                                        <tr>
                                            <td><span class="badge text-bg-light border id-badge"><?= htmlspecialchars($displayItemId, ENT_QUOTES, 'UTF-8') ?></span></td>
                                            <td>
                                                <div class="fw-semibold"><?= htmlspecialchars((string) ($item['tenkhachhang'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></div>
                                                <?php if (trim((string) ($item['sdtkhachhang'] ?? '')) !== ''): ?>
                                                    <div class="small text-secondary"><?= htmlspecialchars((string) ($item['sdtkhachhang'] ?? ''), ENT_QUOTES, 'UTF-8') ?></div>
                                                <?php endif; ?>
                                            </td>
                                            <td><?= htmlspecialchars((string) ($item['dich_vu'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></td>
                                            <td><?= number_format((float) ($item['tong_tien'] ?? 0), 0, ',', '.') . ' VND' ?></td>
                                            <td><?= date('d/m/Y', strtotime((string) ($item['ngay_bat_dau_kehoach'] ?? 'now'))) ?></td>
                                            <td><span class="badge rounded-pill <?= htmlspecialchars($badgeClass, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($statusValue, ENT_QUOTES, 'UTF-8') ?></span></td>
                                            <td>
                                                <div class="action-group">
                                                    <a href="chi-tiet-hoa-don-nguoibenh.html?mahd=<?= urlencode((string) $itemId) ?>&sodienthoai=<?= urlencode((string) ($_SESSION['user']['sodienthoai'] ?? '')) ?>&password=<?= urlencode((string) ($_SESSION['user']['matkhau'] ?? '')) ?>"
                                                        onclick="if(typeof navigateTo === 'function') { navigateTo(this.getAttribute('href')); return false; }"
                                                        class="btn btn-primary btn-action"><i class="bi bi-eye"></i>Chi tiet</a>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile View: Cards -->
                    <div class="d-md-none">
                        <?php if ($loadError !== ''): ?>
                            <div class="empty-row py-4"><?= htmlspecialchars($loadError, ENT_QUOTES, 'UTF-8') ?></div>
                        <?php elseif (!$paginatedRows): ?>
                            <div class="empty-row py-4">Khong co hoa don.</div>
                        <?php else: ?>
                            <?php foreach ($paginatedRows as $item): ?>
                                <?php
                                $itemId = (int) ($item['id'] ?? 0);
                                $displayItemId = '#' . format_invoice_id_display($item['id'] ?? '');
                                $statusValue = trim((string) ($item['trangthai'] ?? ''));
                                if ($statusValue === '') { $statusValue = 'đang chờ'; }
                                $price = number_format((float) ($item['tong_tien'] ?? 0), 0, ',', '.') . ' VND';
                                $detailUrl = "chi-tiet-hoa-don-nguoibenh.html?mahd=" . urlencode((string) $itemId) . "&sodienthoai=" . urlencode((string) ($_SESSION['user']['sodienthoai'] ?? '')) . "&password=" . urlencode((string) ($_SESSION['user']['matkhau'] ?? ''));
                                ?>
                                <a href="<?= $detailUrl ?>" class="invoice-card"
                                    onclick="if(typeof navigateTo === 'function') { navigateTo(this.getAttribute('href')); return false; }">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="inv-id"><?= htmlspecialchars($displayItemId, ENT_QUOTES, 'UTF-8') ?></div>
                                        <div class="inv-date"><?= date('d/m/Y', strtotime((string) ($item['ngay_bat_dau_kehoach'] ?? 'now'))) ?></div>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center mt-1">
                                        <div class="inv-name"><?= htmlspecialchars((string) ($item['tenkhachhang'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></div>
                                        <span class="inv-status"><?= htmlspecialchars($statusValue, ENT_QUOTES, 'UTF-8') ?></span>
                                    </div>
                                    <div class="inv-service"><?= htmlspecialchars((string) ($item['dich_vu'] ?? 'Dịch vụ'), ENT_QUOTES, 'UTF-8') ?></div>
                                    <div class="inv-price"><?= $price ?></div>
                                </a>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <?php if ($loadError === '' && $totalFiltered > 0): ?>
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
                        <?php if ($totalPages > 1): ?>
                            <nav aria-label="Phan trang hoa don nhan vien" class="w-100">
                                <ul class="pagination pagination-sm mb-0 justify-content-center">
                                    <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                        <a class="page-link" href="<?= htmlspecialchars($buildPageUrl(max(1, $page - 1)), ENT_QUOTES, 'UTF-8') ?>"
                                           onclick="event.preventDefault(); navigateTo(this.getAttribute('href'));">Truoc</a>
                                    </li>
                                    <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                        <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                            <a class="page-link" href="<?= htmlspecialchars($buildPageUrl($i), ENT_QUOTES, 'UTF-8') ?>"
                                               onclick="event.preventDefault(); navigateTo(this.getAttribute('href'));"><?= $i ?></a>
                                        </li>
                                    <?php endfor; ?>
                                    <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                        <a class="page-link" href="<?= htmlspecialchars($buildPageUrl(min($totalPages, $page + 1)), ENT_QUOTES, 'UTF-8') ?>"
                                           onclick="event.preventDefault(); navigateTo(this.getAttribute('href'));">Sau</a>
                                    </li>
                                </ul>
                            </nav>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </section>
</div>
<?php include 'layout-footer.php'; ?>