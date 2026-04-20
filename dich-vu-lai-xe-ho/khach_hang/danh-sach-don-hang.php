<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-donhangsdt.php';
require_once __DIR__ . '/xu-ly-huy.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';


$sessionUser = session_user_require_customer('../login.html', 'khach hang/danh-sach-don-hang.php');
$sessionPhone = (string)($sessionUser['sodienthoai'] ?? '');
$sessionAvatar = trim((string)($sessionUser['anh_dai_dien'] ?? $sessionUser['avatar'] ?? ''));

sync_customer_avatar_to_orders($sessionPhone, $sessionAvatar);

$result = getDonHangBySessionSdt($sessionPhone);
$rows = $result['rows'] ?? [];
$loadError = (string)($result['error'] ?? '');
$rows = is_array($rows) ? taixe_refresh_invoice_rows($rows) : [];
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? 'all'));
$serviceFilter = trim((string)($_GET['service'] ?? 'all'));
$dateFromFilter = trim((string)($_GET['date_from'] ?? ''));
$dateToFilter = trim((string)($_GET['date_to'] ?? ''));

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

function parse_ymd_date(string $value): ?DateTimeImmutable
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
    if (!$date) {
        return null;
    }

    return $date->format('Y-m-d') === $value ? $date : null;
}

function taixe_format_invoice_id_display($value): string
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

$dateFromObj = parse_ymd_date($dateFromFilter);
$dateToObj = parse_ymd_date($dateToFilter);

if (!$dateFromObj) {
    $dateFromFilter = '';
}
if (!$dateToObj) {
    $dateToFilter = '';
}
if ($dateFromObj && $dateToObj && $dateFromObj > $dateToObj) {
    [$dateFromObj, $dateToObj] = [$dateToObj, $dateFromObj];
    $dateFromFilter = $dateFromObj->format('Y-m-d');
    $dateToFilter = $dateToObj->format('Y-m-d');
}

$filteredRows = array_values(array_filter($rows, static function (array $item) use ($q, $statusFilter, $serviceFilter, $dateFromObj, $dateToObj): bool {
    $status = trim((string)($item['trangthai'] ?? ''));
    $service = trim((string)($item['dich_vu'] ?? ''));

    if ($statusFilter !== 'all' && $status !== $statusFilter) {
        return false;
    }

    if ($serviceFilter !== 'all' && $service !== $serviceFilter) {
        return false;
    }

    if ($dateFromObj || $dateToObj) {
        $startDateRaw = trim((string)($item['ngay_bat_dau_kehoach'] ?? ''));
        $startDateObj = parse_ymd_date($startDateRaw);

        if (!$startDateObj) {
            return false;
        }

        if ($dateFromObj && $startDateObj < $dateFromObj) {
            return false;
        }

        if ($dateToObj && $startDateObj > $dateToObj) {
            return false;
        }
    }

    if ($q !== '') {
        $target = implode(' ', [
            (string)($item['id'] ?? ''),
            (string)($item['dich_vu'] ?? ''),
            (string)($item['goi_dich_vu'] ?? ''),
            (string)($item['tenkhachhang'] ?? ''),
            (string)($item['ten_taixe'] ?? ''),
            (string)($item['ngay_bat_dau_kehoach'] ?? ''),
            (string)($item['gio_bat_dau_kehoach'] ?? ''),
            (string)($item['trangthai'] ?? ''),
            (string)($item['tong_tien'] ?? ''),
            (string)($item['diemden'] ?? ''),
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
    'date_from' => $dateFromFilter,
    'date_to' => $dateToFilter,
], 'page', 'danh-sach-don-hang.php');

$summaryTotal = count($rows);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Danh Sách Đơn Hàng Thuê Tài Xế</title>
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
            max-width: 1300px;
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
            min-width: 1100px;
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
            background: linear-gradient(180deg, #e8f4ff 0%, #f0f8ff 48%, #f5faff 100%);
            color: #2c5282;
        }

        .panel-soft {
            border: 1px solid #bbdef5;
            border-radius: 16px;
            box-shadow: 0 14px 34px rgba(0, 123, 255, 0.16);
            background: #ffffff;
        }

        .filter-box {
            border-color: #bbdef5;
            border-radius: 14px;
            background: linear-gradient(180deg, #f8fcff, #f2f9ff);
            box-shadow: 0 8px 18px rgba(0, 123, 255, 0.08);
        }

        .table-wrap {
            border-color: #bbdef5;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 10px 22px rgba(0, 123, 255, 0.1);
        }

        .jobs-table {
            --bs-table-hover-bg: #eef6ff;
        }

        .jobs-table thead th {
            background: linear-gradient(135deg, #e3f2fd 0%, #ebf5ff 100%);
            color: #1a5d9c;
            border-bottom-color: #c8e0f5;
        }

        .jobs-table tbody td {
            border-color: #e0edf8;
        }

        .summary-note,
        .empty-row,
        .text-secondary,
        .form-label.small.text-secondary {
            color: #4a7fb5 !important;
        }

        .id-badge {
            background: #e3f2fd !important;
            border-color: #bbdef5 !important;
            color: #1a5d9c !important;
        }

        .badge.rounded-pill.text-bg-light.border.text-dark {
            background: #e3f2fd !important;
            border-color: #bbdef5 !important;
            color: #1a5d9c !important;
        }

        .btn-primary {
            border-color: #90caf9;
            background: linear-gradient(135deg, #42a5f5, #1e88e5);
            box-shadow: 0 8px 18px rgba(30, 136, 229, 0.24);
        }

        .btn-primary:hover,
        .btn-primary:focus {
            border-color: #64b5f6;
            background: linear-gradient(135deg, #2196f3, #1976d2);
        }

        .btn-outline-secondary {
            color: #1e88e5;
            border-color: #90caf9;
            background: #f5faff;
        }

        .btn-outline-secondary:hover,
        .btn-outline-secondary:focus {
            color: #fff;
            border-color: #1e88e5;
            background: #1e88e5;
        }

        .btn-outline-danger {
            color: #e53935;
            border-color: #ef9a9a;
            background: #fff5f5;
        }

        .btn-outline-danger:hover,
        .btn-outline-danger:focus {
            color: #fff;
            border-color: #e53935;
            background: #e53935;
        }

        .form-control,
        .form-select,
        .input-group-text {
            border-color: #bbdef5;
            background: #ffffff;
            color: #2c5282;
        }

        .form-control:focus,
        .form-select:focus {
            border-color: #64b5f6;
            box-shadow: 0 0 0 0.2rem rgba(33, 150, 243, 0.2);
        }

        .pagination .page-link {
            color: #1e88e5;
            border-color: #bbdef5;
            background: #ffffff;
        }

        .pagination .page-item.active .page-link {
            border-color: #1e88e5;
            background: #1e88e5;
            color: #fff;
        }

        .alert-success {
            color: #1f6148;
            background: #e9f8f1;
            border-color: #9dd9be;
            box-shadow: 0 8px 16px rgba(31, 97, 72, 0.08);
        }

        .alert-warning {
            color: #856404;
            background: #fff3cd;
            border-color: #ffeeba;
            box-shadow: 0 8px 16px rgba(133, 100, 4, 0.08);
        }
    </style>
</head>
<body>
<?php render_khach_hang_header($sessionUser, 'Danh sách đơn hàng', 'orders'); ?>
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
                    <p class="summary-note mb-0">Danh sách các đơn hàng thuê tài xế của bạn.</p>
                </div>
                <div class="text-secondary small">Tổng hiển thị: <b><?= (int)$totalFiltered ?></b> / <?= (int)$summaryTotal ?> đơn hàng</div>
            </div>

            <form method="get" class="filter-box mb-3">
                <div class="row g-2 align-items-end">
                    <div class="col-12 col-md-4">
                        <label class="form-label small text-secondary mb-1">Tìm kiếm</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="text" class="form-control" name="q" value="<?= esc($q) ?>" placeholder="ID, dịch vụ, tài xế, điểm đến...">
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
                    <div class="col-6 col-md-3">
                        <label class="form-label small text-secondary mb-1">Từ ngày</label>
                        <input type="date" class="form-control" name="date_from" value="<?= esc($dateFromFilter) ?>">
                    </div>
                    <div class="col-6 col-md-3">
                        <label class="form-label small text-secondary mb-1">Đến ngày</label>
                        <input type="date" class="form-control" name="date_to" value="<?= esc($dateToFilter) ?>">
                    </div>
                    <div class="col-12 d-flex gap-2 justify-content-md-end mt-1">
                        <button class="btn btn-primary" type="submit"><i class="bi bi-funnel me-1"></i>Lọc</button>
                        <a class="btn btn-outline-secondary" href="danh-sach-don-hang.php"><i class="bi bi-arrow-counterclockwise"></i></a>
                    </div>
                </div>
            </form>

            <div class="table-wrap">
                <div class="table-responsive">
                    <table class="table jobs-table align-middle">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Dịch vụ</th>
                                <th>Ngày bắt đầu</th>
                                <th>Điểm đến</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Tài xế</th>
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
                                <td colspan="8" class="empty-row py-4">Không có đơn hàng phù hợp.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($paginatedRows as $item): ?>
                                <?php
                                    $itemId = (int)($item['id'] ?? 0);
                                    $displayItemId = taixe_format_invoice_id_display($item['id'] ?? '');
                                    $service = trim((string)($item['dich_vu'] ?? ''));
                                    $customer = trim((string)($item['tenkhachhang'] ?? ''));
                                    $startDate = trim((string)($item['ngay_bat_dau_kehoach'] ?? ''));
                                    $startTime = trim((string)($item['gio_bat_dau_kehoach'] ?? ''));
                                    $destination = trim((string)($item['diemden'] ?? ''));
                                    $status = trim((string)($item['trangthai'] ?? ''));
                                    $amount = trim((string)($item['tong_tien'] ?? ''));
                                    $driver = trim((string)($item['ten_taixe'] ?? ''));
                                    if ($driver === '') {
                                        $driver = 'Chưa phân công';
                                    }
                                    $cancelCheck = taixe_can_cancel_invoice($item);
                                ?>
                                <tr>
                                    <td><span class="badge text-bg-light border id-badge"><?= esc($displayItemId) ?></span></td>
                                    <td>
                                        <div class="fw-semibold"><?= esc($service !== '' ? $service : '---') ?></div>
                                        <div class="small text-secondary">Khách: <?= esc($customer !== '' ? $customer : '---') ?></div>
                                    </td>
                                    <td><?= esc(trim($startDate . ' ' . $startTime) !== '' ? trim($startDate . ' ' . $startTime) : '---') ?></td>
                                    <td><?= esc($destination !== '' ? $destination : '---') ?></td>
                                    <td class="fw-semibold text-primary"><?= esc($amount !== '' ? number_format((float)$amount, 0, ',', '.') . ' đ' : '0 đ') ?></td>
                                    <td><span class="badge rounded-pill text-bg-light border text-dark"><?= esc($status !== '' ? $status : 'Chờ xác nhận') ?></span></td>
                                    <td><?= esc($driver) ?></td>
                                    <td>
                                        <div class="action-group">
                                            <?php if ($itemId > 0 && (($cancelCheck['ok'] ?? false) === true)): ?>
                                                <form method="post" action="xu-ly-huy.php" class="d-inline">
                                                    <input type="hidden" name="action" value="cancel">
                                                    <input type="hidden" name="invoice_id" value="<?= esc((string)$itemId) ?>">
                                                    <button type="submit" class="btn btn-outline-danger btn-action" onclick="return confirm('Bạn có chắc muốn hủy đơn hàng này?');"><i class="bi bi-x-circle"></i>Hủy đơn</button>
                                                </form>
                                            <?php endif; ?>

                                            <?php if ($itemId > 0): ?>
                                                <a href="chi-tiet-don-hang.php?id=<?= urlencode((string)$itemId) ?>" class="btn btn-primary btn-action"><i class="bi bi-eye"></i>Chi tiết</a>
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
                    <div class="summary-note">Hiển thị <?= (int)$from ?> - <?= (int)$to ?> / <?= (int)$totalFiltered ?> đơn hàng</div>
                    <?php if ($totalPages > 1): ?>
                        <nav aria-label="Phân trang đơn hàng">
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