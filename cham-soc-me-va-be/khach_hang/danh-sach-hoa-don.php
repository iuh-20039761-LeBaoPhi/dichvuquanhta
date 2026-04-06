<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadonsdt.php';
require_once __DIR__ . '/xu-ly-huy.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$sessionUser = session_user_require_customer('../login.html', 'khach_hang/danh-sach-hoa-don.php');
$sessionPhone = (string)($sessionUser['sodienthoai'] ?? '');
$sessionAvatar = trim((string)($sessionUser['anh_dai_dien'] ?? $sessionUser['avatar'] ?? ''));

sync_customer_avatar_to_orders($sessionPhone, $sessionAvatar);

$result = getHoaDonBySessionSdt($sessionPhone);
$rows = $result['rows'] ?? [];
$loadError = (string)($result['error'] ?? '');
$rows = is_array($rows) ? mevabe_refresh_invoice_rows($rows) : [];
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? 'all'));
$serviceFilter = trim((string)($_GET['service'] ?? 'all'));

$rows = is_array($rows) ? $rows : [];
$servicesMap = [];
$statusesMap = [];
foreach ($rows as $row) {
    if (!is_array($row)) {
        continue;
    }

    $service = trim((string)($row['dich_vu'] ?? ''));
    $status = trim((string)($row['trangthai'] ?? ''));
    if ($service !== '') {
        $servicesMap[$service] = $service;
    }
    if ($status !== '') {
        $statusesMap[$status] = $status;
    }
}

$services = array_values($servicesMap);
$statuses = array_values($statusesMap);
sort($services);
sort($statuses);

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function contains_text(string $haystack, string $needle): bool
{
    if ($needle === '') {
        return true;
    }

    if (function_exists('mb_stripos')) {
        return mb_stripos($haystack, $needle, 0, 'UTF-8') !== false;
    }

    return stripos($haystack, $needle) !== false;
}

function mevabe_format_invoice_id_display($value): string
{
    $raw = trim((string)$value);
    if ($raw === '') {
        return '---';
    }

    if (!is_numeric($raw)) {
        return '---';
    }

    $num = (float)$raw;
    if (!is_finite($num) || $num < 0) {
        return '---';
    }

    $id = (int)$num;
    return str_pad((string)$id, 7, '0', STR_PAD_LEFT);
}

if ($serviceFilter !== 'all' && !in_array($serviceFilter, $services, true)) {
    $serviceFilter = 'all';
}
if ($statusFilter !== 'all' && !in_array($statusFilter, $statuses, true)) {
    $statusFilter = 'all';
}

$filteredRows = array_values(array_filter($rows, static function (array $item) use ($q, $statusFilter, $serviceFilter): bool {
    $status = trim((string)($item['trangthai'] ?? ''));
    $service = trim((string)($item['dich_vu'] ?? ''));

    if ($statusFilter !== 'all' && $status !== $statusFilter) {
        return false;
    }

    if ($serviceFilter !== 'all' && $service !== $serviceFilter) {
        return false;
    }

    if ($q !== '') {
        $target = implode(' ', [
            (string)($item['id'] ?? ''),
            (string)($item['dich_vu'] ?? ''),
            (string)($item['goi_dich_vu'] ?? ''),
            (string)($item['tenkhachhang'] ?? ''),
            (string)($item['tenncc'] ?? $item['hotenncc'] ?? ''),
            (string)($item['ngay_bat_dau_kehoach'] ?? ''),
            (string)($item['gio_bat_dau_kehoach'] ?? ''),
            (string)($item['trangthai'] ?? ''),
            (string)($item['tong_tien'] ?? ''),
        ]);

        if (!contains_text($target, $q)) {
            return false;
        }
    }

    return true;
}));

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
], 'page', 'danh-sach-hoa-don.php');

$summaryTotal = count($rows);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Danh Sách Hóa Đơn</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <?php render_khach_hang_header_styles(); ?>
    <style>
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: linear-gradient(180deg, #edf2f7 0%, #f7fafc 45%, #f8fafc 100%);
            color: #0f172a;
        }
        .page-wrap {
            max-width: 1200px;
            margin: 0 auto;
            padding: 14px;
        }
        .panel-soft {
            border-radius: 14px;
            border: 0;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
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
        .action-group {
            display: inline-flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .summary-note {
            color: #64748b;
            font-size: 0.92rem;
        }
        .empty-row {
            text-align: center;
            color: #64748b;
            font-weight: 500;
        }
    </style>
    <style>
        body {
            background: linear-gradient(180deg, #fff6fb 0%, #ffeff8 48%, #fff9fc 100%);
            color: #6a3f59;
        }

        .panel-soft {
            border: 1px solid #f2c6de;
            border-radius: 16px;
            box-shadow: 0 14px 34px rgba(151, 61, 107, 0.16);
            background: #fff9fd;
        }

        .filter-box {
            border-color: #f1c7dd;
            border-radius: 14px;
            background: linear-gradient(180deg, #fff8fc, #fff2f9);
            box-shadow: 0 8px 18px rgba(155, 65, 112, 0.08);
        }

        .table-wrap {
            border-color: #f1c4dc;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 10px 22px rgba(151, 61, 107, 0.1);
        }

        .jobs-table {
            --bs-table-hover-bg: #fff1f8;
        }

        .jobs-table thead th {
            background: linear-gradient(135deg, #ffe8f3 0%, #ffeff8 100%);
            color: #8a3260;
            border-bottom-color: #f3cbe0;
        }

        .jobs-table tbody td {
            border-color: #f7dae9;
        }

        .summary-note,
        .empty-row,
        .text-secondary,
        .form-label.small.text-secondary {
            color: #925b7c !important;
        }

        .id-badge {
            background: #ffeaf5 !important;
            border-color: #f2bed9 !important;
            color: #8f2f61 !important;
        }

        .badge.rounded-pill.text-bg-light.border.text-dark {
            background: #fff0f8 !important;
            border-color: #f3c2dc !important;
            color: #8d325f !important;
        }

        .btn-primary {
            border-color: #ef9fc7;
            background: linear-gradient(135deg, #ea73ad, #cd5a92);
            box-shadow: 0 8px 18px rgba(205, 90, 146, 0.24);
        }

        .btn-primary:hover,
        .btn-primary:focus {
            border-color: #e58ab8;
            background: linear-gradient(135deg, #de63a1, #bf4d86);
        }

        .btn-outline-secondary {
            color: #8c3160;
            border-color: #ebb3d1;
            background: #fff7fb;
        }

        .btn-outline-secondary:hover,
        .btn-outline-secondary:focus {
            color: #fff;
            border-color: #ca5a90;
            background: #ca5a90;
        }

        .btn-outline-danger {
            color: #aa3f67;
            border-color: #ebb1cd;
            background: #fff7fb;
        }

        .btn-outline-danger:hover,
        .btn-outline-danger:focus {
            color: #fff;
            border-color: #cf5b94;
            background: #cf5b94;
        }

        .form-control,
        .form-select,
        .input-group-text {
            border-color: #f0c5db;
            background: #fffbfd;
            color: #744360;
        }

        .form-control:focus,
        .form-select:focus {
            border-color: #e18bb8;
            box-shadow: 0 0 0 0.2rem rgba(225, 139, 184, 0.2);
        }

        .pagination .page-link {
            color: #8c3462;
            border-color: #f1c5dc;
            background: #fff9fc;
        }

        .pagination .page-item.active .page-link {
            border-color: #ce5e95;
            background: #ce5e95;
            color: #fff;
        }

        .alert-success {
            color: #1f6148;
            background: #e9f8f1;
            border-color: #9dd9be;
            box-shadow: 0 8px 16px rgba(31, 97, 72, 0.08);
        }

        .alert-warning {
            color: #7b2f53;
            background: #fff1f8;
            border-color: #efbdd7;
            box-shadow: 0 8px 16px rgba(123, 47, 83, 0.08);
        }
    </style>
</head>
<body>
<?php render_khach_hang_header($sessionUser, 'Danh sách hóa đơn khách hàng', 'orders'); ?>
<div class="page-wrap">

    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2" role="alert">
            <?= esc($flashMsg) ?>
        </div>
    <?php endif; ?>

    <section class="card panel-soft mb-3">
        <div class="card-body p-3 p-lg-4">
            <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-3">
                <div>
                    <h1 class="h4 fw-bold mb-1">Đơn hàng của bạn</h1>
                    <p class="summary-note mb-0">Danh sách hiển thị trực tiếp từ dữ liệu hóa đơn của bạn.</p>
                </div>
                <div class="text-secondary small">Tổng hiển thị: <b><?= (int)$totalFiltered ?></b> / <?= (int)$summaryTotal ?> hóa đơn</div>
            </div>

            <form method="get" class="filter-box mb-3">
                <div class="row g-2 align-items-end">
                    <div class="col-12 col-md-4">
                        <label class="form-label small text-secondary mb-1">Tìm kiếm</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="text" class="form-control" name="q" value="<?= esc($q) ?>" placeholder="ID, dịch vụ, nhân viên...">
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <label class="form-label small text-secondary mb-1">Trạng thái</label>
                        <select class="form-select" name="status">
                            <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                            <?php foreach ($statuses as $statusOption): ?>
                                <option value="<?= esc($statusOption) ?>" <?= $statusFilter === $statusOption ? 'selected' : '' ?>><?= esc($statusOption) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-6 col-md-4">
                        <label class="form-label small text-secondary mb-1">Dịch vụ</label>
                        <select class="form-select" name="service">
                            <option value="all" <?= $serviceFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                            <?php foreach ($services as $serviceOption): ?>
                                <option value="<?= esc($serviceOption) ?>" <?= $serviceFilter === $serviceOption ? 'selected' : '' ?>><?= esc($serviceOption) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-12 d-flex gap-2 justify-content-md-end mt-1">
                        <button class="btn btn-primary" type="submit"><i class="bi bi-funnel me-1"></i>Lọc</button>
                        <a class="btn btn-outline-secondary" href="danh-sach-hoa-don.php"><i class="bi bi-arrow-counterclockwise"></i></a>
                    </div>
                </div>
            </form>

            <div class="table-wrap">
                <div class="table-responsive">
                    <table class="table jobs-table align-middle">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Dịch vụ</th>
                            <th>Gói</th>
                            <th>Ngày bắt đầu</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th>Nhân viên</th>
                            <th>Hành động</th>
                        </tr>
                        </thead>
                        <tbody>
                        <?php if ($loadError !== ''): ?>
                            <tr>
                                <td colspan="8" class="empty-row py-4">Lỗi tải dữ liệu: <?= esc($loadError) ?></td>
                            </tr>
                        <?php elseif (!$paginatedRows): ?>
                            <tr>
                                <td colspan="8" class="empty-row py-4">Không có hóa đơn phù hợp bộ lọc.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($paginatedRows as $item): ?>
                                <?php
                                    $itemId = (int)($item['id'] ?? 0);
                                    $displayItemId = mevabe_format_invoice_id_display($item['id'] ?? '');
                                    $service = trim((string)($item['dich_vu'] ?? ''));
                                    $customer = trim((string)($item['tenkhachhang'] ?? ''));
                                    $package = trim((string)($item['goi_dich_vu'] ?? ''));
                                    $startDate = trim((string)($item['ngay_bat_dau_kehoach'] ?? ''));
                                    $startTime = trim((string)($item['gio_bat_dau_kehoach'] ?? ''));
                                    $status = trim((string)($item['trangthai'] ?? ''));
                                    $amount = trim((string)($item['tong_tien'] ?? ''));
                                    $employee = trim((string)($item['tenncc'] ?? ''));
                                    if ($employee === '') {
                                        $employee = trim((string)($item['hotenncc'] ?? ''));
                                    }
                                    $cancelCheck = mevabe_can_cancel_invoice($item);
                                ?>
                                <tr>
                                    <td><span class="badge text-bg-light border id-badge"><?= esc($displayItemId) ?></span></td>
                                    <td>
                                        <div class="fw-semibold"><?= esc($service !== '' ? $service : '---') ?></div>
                                        <div class="small text-secondary">Khách: <?= esc($customer !== '' ? $customer : '---') ?></div>
                                    </td>
                                    <td><?= esc($package !== '' ? $package : '---') ?></td>
                                    <td><?= esc(trim($startDate . ' ' . $startTime) !== '' ? trim($startDate . ' ' . $startTime) : '---') ?></td>
                                    <td class="fw-semibold text-danger-emphasis"><?= esc($amount !== '' ? $amount : '0') ?></td>
                                    <td><span class="badge rounded-pill text-bg-light border text-dark"><?= esc($status !== '' ? $status : 'Chờ xác nhận') ?></span></td>
                                    <td><?= esc($employee !== '' ? $employee : 'Chưa có') ?></td>
                                    <td>
                                        <div class="action-group">
                                            <?php if ($itemId > 0 && (($cancelCheck['ok'] ?? false) === true)): ?>
                                                <form method="post" action="xu-ly-huy.php" class="d-inline">
                                                    <input type="hidden" name="action" value="cancel">
                                                    <input type="hidden" name="invoice_id" value="<?= esc((string)$itemId) ?>">
                                                    <button type="submit" class="btn btn-outline-danger btn-action"><i class="bi bi-x-circle"></i>Hủy đơn</button>
                                                </form>
                                            <?php endif; ?>

                                            <?php if ($itemId > 0): ?>
                                                <a href="chi-tiet-hoa-don.php?id=<?= urlencode((string)$itemId) ?>" class="btn btn-primary btn-action"><i class="bi bi-eye"></i>Chi tiết</a>
                                            <?php else: ?>
                                                <button type="button" class="btn btn-outline-secondary btn-action" disabled>Không có ID</button>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <?php if ($loadError === '' && $totalFiltered > 0): ?>
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
                    <div class="summary-note">Hiển thị <?= (int)$from ?> - <?= (int)$to ?> / <?= (int)$totalFiltered ?> hóa đơn</div>
                    <?php if ($totalPages > 1): ?>
                        <nav aria-label="Phân trang hóa đơn khách hàng">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= esc($buildPageUrl(max(1, $page - 1))) ?>">Trước</a>
                                </li>
                                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                        <a class="page-link" href="<?= esc($buildPageUrl($i)) ?>"><?= $i ?></a>
                                    </li>
                                <?php endfor; ?>
                                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= esc($buildPageUrl(min($totalPages, $page + 1))) ?>">Sau</a>
                                </li>
                            </ul>
                        </nav>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
    </section>
</div>
<?php render_khach_hang_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
