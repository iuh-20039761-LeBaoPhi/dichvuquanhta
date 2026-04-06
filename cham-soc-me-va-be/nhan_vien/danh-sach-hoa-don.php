<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';
require_once __DIR__ . '/xu-ly-cong-viec.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';
$sessionUser = session_user_require_employee('../login.html', 'nhan_vien/danh-sach-hoa-don.php');

$employeeId = (int)($sessionUser['id'] ?? 0);
$employeeStatus = (string)($sessionUser['trangthai'] ?? '');
$isEmployeeApproved = employee_account_is_approved($employeeStatus);

$rows = [];
$loadError = '';

if ($isEmployeeApproved) {
    $result = getHoaDonData();
    $loadError = (string)($result['error'] ?? '');
    $rows = filter_invoices_for_employee($result['rows'] ?? [], $employeeId, $sessionUser);
}
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

function format_invoice_id_display($value): string
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

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? 'all'));
$serviceFilter = trim((string)($_GET['service'] ?? 'all'));
$sortFilter = strtolower(trim((string)($_GET['sort'] ?? 'newest')));

if (!in_array($sortFilter, ['newest', 'oldest', 'status', 'customer'], true)) {
    $sortFilter = 'newest';
}

$serviceMap = [];
$statusMap = [];

foreach ($rows as $row) {
    $service = trim((string)($row['dich_vu'] ?? ''));
    if ($service !== '') {
        $serviceMap[$service] = $service;
    }

    $status = trim((string)($row['trangthai'] ?? ''));
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
    $status = trim((string)($item['trangthai'] ?? ''));
    if ($status === '') {
        $status = 'chờ duyệt';
    }
    $service = trim((string)($item['dich_vu'] ?? ''));

    if ($statusFilter !== 'all' && $status !== $statusFilter) {
        return false;
    }

    if ($serviceFilter !== 'all' && $service !== $serviceFilter) {
        return false;
    }

    if ($q !== '') {
        $searchTarget = implode(' ', [
            (string)($item['id'] ?? ''),
            (string)($item['tenkhachhang'] ?? ''),
            (string)($item['dich_vu'] ?? ''),
            (string)($item['goi_dich_vu'] ?? ''),
            (string)($item['sdtkhachhang'] ?? ''),
            (string)($item['ngay_bat_dau_kehoach'] ?? ''),
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
    usort($filteredRows, static fn(array $a, array $b): int => ((int)($a['id'] ?? 0)) <=> ((int)($b['id'] ?? 0)));
} elseif ($sortFilter === 'status') {
    usort($filteredRows, static function (array $a, array $b): int {
        $left = (string)($a['trangthai'] ?? '');
        $right = (string)($b['trangthai'] ?? '');
        $statusCompare = strcasecmp($left, $right);
        if ($statusCompare === 0) {
            return ((int)($b['id'] ?? 0)) <=> ((int)($a['id'] ?? 0));
        }
        return $statusCompare;
    });
} elseif ($sortFilter === 'customer') {
    usort($filteredRows, static fn(array $a, array $b): int => strcasecmp((string)($a['tenkhachhang'] ?? ''), (string)($b['tenkhachhang'] ?? '')));
} else {
    usort($filteredRows, static fn(array $a, array $b): int => ((int)($b['id'] ?? 0)) <=> ((int)($a['id'] ?? 0)));
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

$summaryPending = count(array_filter($rows, static fn(array $i): bool => trim((string)($i['trangthai'] ?? '')) === '' || trim((string)($i['trangthai'] ?? '')) === 'chờ duyệt'));
$summaryReceived = count(array_filter($rows, static fn(array $i): bool => trim((string)($i['trangthai'] ?? '')) === 'đã nhận'));
$summaryTotal = count($rows);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Danh Sach Hoa Don</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <?php render_nhan_vien_header_styles(); ?>
    <style>
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: linear-gradient(180deg, #edf2f7 0%, #f7fafc 45%, #f8fafc 100%);
            color: #0f172a;
        }
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
            font-weight: 800;
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
        @media (max-width: 992px) {
            .btn-action {
                min-width: 98px;
            }
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

        .stat-card {
            border-color: #f1c6dc;
            background: linear-gradient(180deg, #fff9fd, #fff2f9);
            box-shadow: 0 8px 20px rgba(151, 61, 107, 0.09);
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

        .id-badge {
            background: #ffeaf5 !important;
            border-color: #f2bed9 !important;
            color: #8f2f61 !important;
        }

        .summary-note,
        .empty-row,
        .text-secondary,
        .form-label.small.text-secondary {
            color: #925b7c !important;
        }

        .badge.rounded-pill.text-bg-warning,
        .badge.rounded-pill.text-bg-info,
        .badge.rounded-pill.text-bg-success,
        .badge.rounded-pill.text-bg-secondary {
            border: 1px solid #f1bfd9;
            background: #fff1f8 !important;
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
<?php render_nhan_vien_header($sessionUser, 'Quan ly hoa don nhan vien', 'orders'); ?>
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
                    <h1 class="h4 fw-bold mb-1">Danh sách hóa đơn</h1>
                    <p class="summary-note mb-0">Theo dõi, lọc va xử lý công viêc.</p>
                </div>
                <div class="text-secondary small">Tổng hiển thị: <b><?= (int)$totalFiltered ?></b> / <?= (int)$summaryTotal ?> hoa don</div>
            </div>

            <div class="row g-2 g-lg-3 mb-3">
                <div class="col-12 col-md-4">
                    <div class="stat-card">
                        <div class="d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <div class="text-secondary small">Đang chờ nhận</div>
                                <div class="stat-value text-warning-emphasis"><?= (int)$summaryPending ?></div>
                            </div>
                            <div class="stat-icon bg-warning-subtle text-warning-emphasis"><i class="bi bi-hourglass-split"></i></div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="stat-card">
                        <div class="d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <div class="text-secondary small">Đã nhận việc</div>
                                <div class="stat-value text-success-emphasis"><?= (int)$summaryReceived ?></div>
                            </div>
                            <div class="stat-icon bg-success-subtle text-success-emphasis"><i class="bi bi-check2-circle"></i></div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="stat-card">
                        <div class="d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <div class="text-secondary small">Tổng công việc</div>
                                <div class="stat-value text-primary"><?= (int)$summaryTotal ?></div>
                            </div>
                            <div class="stat-icon bg-primary-subtle text-primary-emphasis"><i class="bi bi-collection"></i></div>
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
                            <input type="text" class="form-control" name="q" value="<?= htmlspecialchars($q, ENT_QUOTES, 'UTF-8') ?>" placeholder="ID, khach hang, SDT...">
                        </div>
                    </div>
                    <div class="col-6 col-md-3 col-lg-2">
                        <label class="form-label small text-secondary mb-1">Trạng thái</label>
                        <select class="form-select" name="status">
                            <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                            <?php foreach ($statuses as $statusOption): ?>
                                <option value="<?= htmlspecialchars($statusOption, ENT_QUOTES, 'UTF-8') ?>" <?= $statusFilter === $statusOption ? 'selected' : '' ?>><?= htmlspecialchars($statusOption, ENT_QUOTES, 'UTF-8') ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-6 col-md-3 col-lg-3">
                        <label class="form-label small text-secondary mb-1">Dịch vụ</label>
                        <select class="form-select" name="service">
                            <option value="all">Tất cả</option>
                            <?php foreach ($services as $serviceOption): ?>
                                <option value="<?= htmlspecialchars($serviceOption, ENT_QUOTES, 'UTF-8') ?>" <?= $serviceFilter === $serviceOption ? 'selected' : '' ?>><?= htmlspecialchars($serviceOption, ENT_QUOTES, 'UTF-8') ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-6 col-md-3 col-lg-2">
                        <label class="form-label small text-secondary mb-1">Sap xep</label>
                        <select class="form-select" name="sort">
                            <option value="newest" <?= $sortFilter === 'newest' ? 'selected' : '' ?>>Mới nhất</option>
                            <option value="oldest" <?= $sortFilter === 'oldest' ? 'selected' : '' ?>>Cũ nhất</option>
                            <option value="status" <?= $sortFilter === 'status' ? 'selected' : '' ?>>Theo trạng thái</option>
                            <option value="customer" <?= $sortFilter === 'customer' ? 'selected' : '' ?>>Theo khách hàng</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-3 col-lg-2 d-flex gap-2">
                        <button class="btn btn-primary flex-fill" type="submit"><i class="bi bi-funnel me-1"></i>Loc</button>
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
                                <th>Khách hàng</th>
                                <th>Dịch vụ</th>
                                <th>Ngay bắt đàu</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php if ($loadError !== ''): ?>
                            <tr>
                                <td colspan="6" class="empty-row py-4">Loi tai du lieu: <?= htmlspecialchars($loadError, ENT_QUOTES, 'UTF-8') ?></td>
                            </tr>
                        <?php elseif (!$paginatedRows): ?>
                            <tr>
                                <td colspan="6" class="empty-row py-4">Khong co hoa don phu hop bo loc.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($paginatedRows as $item): ?>
                                <?php
                                    $itemId = (int)($item['id'] ?? 0);
                                    $displayItemId = format_invoice_id_display($item['id'] ?? '');
                                    $statusValue = trim((string)($item['trangthai'] ?? ''));
                                    if ($statusValue === '') {
                                        $statusValue = 'chờ duyệt';
                                    }
                                    $badgeClass = 'text-bg-secondary';
                                    if ($statusValue === 'chờ duyệt') {
                                        $badgeClass = 'text-bg-warning';
                                    } elseif ($statusValue === 'đã duyệt') {
                                        $badgeClass = 'text-bg-info';
                                    } elseif ($statusValue === 'đã nhận') {
                                        $badgeClass = 'text-bg-success';
                                    }
                                ?>
                                <tr>
                                    <td><span class="badge text-bg-light border id-badge"><?= htmlspecialchars($displayItemId, ENT_QUOTES, 'UTF-8') ?></span></td>
                                    <td>
                                        <div class="fw-semibold"><?= htmlspecialchars((string)($item['tenkhachhang'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></div>
                                        <?php if (trim((string)($item['sdtkhachhang'] ?? '')) !== ''): ?>
                                            <div class="small text-secondary"><?= htmlspecialchars((string)($item['sdtkhachhang'] ?? ''), ENT_QUOTES, 'UTF-8') ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= htmlspecialchars((string)($item['dich_vu'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= htmlspecialchars((string)($item['ngay_bat_dau_kehoach'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><span class="badge rounded-pill <?= htmlspecialchars($badgeClass, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($statusValue, ENT_QUOTES, 'UTF-8') ?></span></td>
                                    <td>
                                        <div class="action-group">
                                            <a href="chi-tiet-hoa-don.php?id=<?= urlencode((string)$itemId) ?>" class="btn btn-primary btn-action"><i class="bi bi-eye"></i>Chi tiet</a>
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
                    <div class="summary-note">Hien thi <?= (int)$from ?> - <?= (int)$to ?> / <?= (int)$totalFiltered ?> hoa don</div>
                    <?php if ($totalPages > 1): ?>
                        <nav aria-label="Phan trang hoa don nhan vien">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= htmlspecialchars($buildPageUrl(max(1, $page - 1)), ENT_QUOTES, 'UTF-8') ?>">Truoc</a>
                                </li>
                                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                        <a class="page-link" href="<?= htmlspecialchars($buildPageUrl($i), ENT_QUOTES, 'UTF-8') ?>"><?= $i ?></a>
                                    </li>
                                <?php endfor; ?>
                                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= htmlspecialchars($buildPageUrl(min($totalPages, $page + 1)), ENT_QUOTES, 'UTF-8') ?>">Sau</a>
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
<?php render_nhan_vien_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
