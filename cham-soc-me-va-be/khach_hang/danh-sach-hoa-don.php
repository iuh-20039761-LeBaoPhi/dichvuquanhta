<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadonsdt.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$sessionUser = session_user_require_customer('../login.html', 'khach_hang/danh-sach-hoa-don.php');
$sessionPhone = (string)($sessionUser['sodienthoai'] ?? '');

$result = getHoaDonBySessionSdt($sessionPhone);
$rows = $result['rows'] ?? [];
$loadError = (string)($result['error'] ?? '');
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = strtolower(trim((string)($_GET['status'] ?? 'all')));
$serviceFilter = trim((string)($_GET['service'] ?? 'all'));
$sortFilter = strtolower(trim((string)($_GET['sort'] ?? 'newest')));

if (!in_array($statusFilter, ['all', 'pending', 'approved', 'received', 'rejected', 'cancelled', 'other'], true)) {
    $statusFilter = 'all';
}
if (!in_array($sortFilter, ['newest', 'oldest', 'status', 'amount'], true)) {
    $sortFilter = 'newest';
}

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function money_text($value): string
{
    $amount = (int)preg_replace('/\D+/', '', (string)$value);
    return number_format($amount, 0, ',', '.') . ' VNĐ';
}

function money_number($value): int
{
    return (int)preg_replace('/\D+/', '', (string)$value);
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

function normalize_status_key(string $status): string
{
    $raw = strtolower(trim($status));

    if (in_array($raw, ['da_nhan', 'đã nhận', 'da nhan', 'received'], true)) {
        return 'received';
    }
    if (in_array($raw, ['da_duyet', 'đã duyệt', 'da duyet', 'approved', 'hoan_thanh', 'completed'], true)) {
        return 'approved';
    }
    if (in_array($raw, ['tu_choi', 'rejected'], true)) {
        return 'rejected';
    }
    if (in_array($raw, ['huy_don', 'huy don', 'huy', 'đã hủy', 'da_huy', 'da huy', 'cancelled', 'canceled'], true)) {
        return 'cancelled';
    }
    if (in_array($raw, ['', 'pending', 'cho_duyet', 'cho duyet', 'chờ duyệt', 'waiting'], true)) {
        return 'pending';
    }

    return 'other';
}

function status_meta(string $status): array
{
    $key = normalize_status_key($status);

    if ($key === 'received') {
        return ['key' => 'received', 'text' => 'Da nhan', 'class' => 'text-bg-primary'];
    }
    if ($key === 'approved') {
        return ['key' => 'approved', 'text' => 'Da duyet', 'class' => 'text-bg-info'];
    }
    if ($key === 'rejected') {
        return ['key' => 'rejected', 'text' => 'Tu choi', 'class' => 'text-bg-danger'];
    }
    if ($key === 'cancelled') {
        return ['key' => 'cancelled', 'text' => 'Da huy', 'class' => 'text-bg-secondary'];
    }
    if ($key === 'pending') {
        return ['key' => 'pending', 'text' => 'Cho duyet', 'class' => 'text-bg-warning'];
    }

    return ['key' => 'other', 'text' => 'Khac', 'class' => 'text-bg-secondary'];
}

$employeesById = [];
foreach (list_table_rows('nhacungcap_mevabe') as $employee) {
    $employeeId = (int)($employee['id'] ?? 0);
    if ($employeeId > 0) {
        $employeesById[$employeeId] = $employee;
    }
}

$normalizedRows = [];
$servicesMap = [];

foreach ($rows as $row) {
    if (!is_array($row)) {
        continue;
    }

    $invoiceId = trim((string)($row['id'] ?? ''));
    $serviceName = trim((string)($row['dich_vu'] ?? ''));
    $packageName = trim((string)($row['goi_dich_vu'] ?? ''));
    $startDate = trim((string)($row['ngay_bat_dau'] ?? ''));
    $customerName = trim((string)($row['hovaten'] ?? ''));
    $rawStatus = trim((string)($row['trangthai'] ?? ''));
    $amountValue = (string)($row['tong_tien'] ?? '0');
    $employeeName = '';

    $supplierId = (int)($row['id_nhacungcap'] ?? 0);
    if ($supplierId > 0 && isset($employeesById[$supplierId]) && is_array($employeesById[$supplierId])) {
        $employeeName = trim((string)($employeesById[$supplierId]['hovaten'] ?? ''));
    }

    if ($serviceName !== '') {
        $servicesMap[$serviceName] = $serviceName;
    }

    $meta = status_meta($rawStatus);

    $normalizedRows[] = [
        'id' => $invoiceId,
        'service' => $serviceName !== '' ? $serviceName : 'N/A',
        'package' => $packageName !== '' ? $packageName : 'N/A',
        'startDate' => $startDate !== '' ? $startDate : 'N/A',
        'customer' => $customerName !== '' ? $customerName : 'N/A',
        'amountText' => money_text($amountValue),
        'amountNumber' => money_number($amountValue),
        'statusKey' => (string)$meta['key'],
        'statusText' => (string)$meta['text'],
        'statusClass' => (string)$meta['class'],
        'employee' => $employeeName,
    ];
}

$services = array_values($servicesMap);
sort($services);

$filteredRows = array_values(array_filter($normalizedRows, static function (array $item) use ($q, $statusFilter, $serviceFilter): bool {
    if ($statusFilter !== 'all' && $item['statusKey'] !== $statusFilter) {
        return false;
    }

    if ($serviceFilter !== 'all' && $item['service'] !== $serviceFilter) {
        return false;
    }

    if ($q !== '') {
        $target = implode(' ', [
            $item['id'],
            $item['service'],
            $item['package'],
            $item['customer'],
            $item['employee'],
            $item['startDate'],
            $item['amountText'],
        ]);

        if (!contains_text($target, $q)) {
            return false;
        }
    }

    return true;
}));

if ($sortFilter === 'oldest') {
    usort($filteredRows, static fn(array $a, array $b): int => ((int)$a['id']) <=> ((int)$b['id']));
} elseif ($sortFilter === 'status') {
    $order = ['pending' => 1, 'approved' => 2, 'received' => 3, 'rejected' => 4, 'other' => 5];
    usort($filteredRows, static function (array $a, array $b) use ($order): int {
        $left = $order[$a['statusKey']] ?? 99;
        $right = $order[$b['statusKey']] ?? 99;
        if ($left === $right) {
            return ((int)$b['id']) <=> ((int)$a['id']);
        }
        return $left <=> $right;
    });
} elseif ($sortFilter === 'amount') {
    usort($filteredRows, static fn(array $a, array $b): int => $b['amountNumber'] <=> $a['amountNumber']);
} else {
    usort($filteredRows, static fn(array $a, array $b): int => ((int)$b['id']) <=> ((int)$a['id']));
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

$summaryPending = count(array_filter($normalizedRows, static fn(array $item): bool => $item['statusKey'] === 'pending'));
$summaryReceived = count(array_filter($normalizedRows, static fn(array $item): bool => $item['statusKey'] === 'received'));
$summaryTotal = count($normalizedRows);
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
    <?php render_khach_hang_header_styles(); ?>
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
</head>
<body>
<main class="page-wrap">
    <?php render_khach_hang_header($sessionUser, 'Danh sách hóa đơn khách hàng'); ?>

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
                    <p class="summary-note mb-0">Theo dõi, tìm kiếm, lọc hóa đơn.</p>
                </div>
                <div class="text-secondary small">Tổng hiển thị: <b><?= (int)$totalFiltered ?></b> / <?= (int)$summaryTotal ?> hóa đơn</div>
            </div>

            <div class="row g-2 g-lg-3 mb-3">
                <div class="col-12 col-md-4">
                    <div class="stat-card">
                        <div class="d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <div class="text-secondary small">Đang chờ duyệt</div>
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
                                <div class="text-secondary small">Đã nhận</div>
                                <div class="stat-value text-primary-emphasis"><?= (int)$summaryReceived ?></div>
                            </div>
                            <div class="stat-icon bg-primary-subtle text-primary-emphasis"><i class="bi bi-check2-circle"></i></div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-4">
                    <div class="stat-card">
                        <div class="d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <div class="text-secondary small">Tổng hóa đơn</div>
                                <div class="stat-value text-success-emphasis"><?= (int)$summaryTotal ?></div>
                            </div>
                            <div class="stat-icon bg-success-subtle text-success-emphasis"><i class="bi bi-receipt"></i></div>
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
                            <input type="text" class="form-control" name="q" value="<?= esc($q) ?>" placeholder="ID, dich vu, nhan vien...">
                        </div>
                    </div>
                    <div class="col-6 col-md-3 col-lg-2">
                        <label class="form-label small text-secondary mb-1">Trạng thái</label>
                        <select class="form-select" name="status">
                            <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                            <option value="pending" <?= $statusFilter === 'pending' ? 'selected' : '' ?>>Chờ duyệt</option>
                            <option value="approved" <?= $statusFilter === 'approved' ? 'selected' : '' ?>>Đã duyệt</option>
                            <option value="received" <?= $statusFilter === 'received' ? 'selected' : '' ?>>Đã nhận</option>
                            <option value="rejected" <?= $statusFilter === 'rejected' ? 'selected' : '' ?>>Từ chối</option>
                            <option value="cancelled" <?= $statusFilter === 'cancelled' ? 'selected' : '' ?>>Da huy</option>
                            <option value="other" <?= $statusFilter === 'other' ? 'selected' : '' ?>>Khác</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-3 col-lg-3">
                        <label class="form-label small text-secondary mb-1">Dịch vụ</label>
                        <select class="form-select" name="service">
                            <option value="all">Tất cả</option>
                            <?php foreach ($services as $serviceOption): ?>
                                <option value="<?= esc($serviceOption) ?>" <?= $serviceFilter === $serviceOption ? 'selected' : '' ?>><?= esc($serviceOption) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-6 col-md-3 col-lg-2">
                        <label class="form-label small text-secondary mb-1">Sap xep</label>
                        <select class="form-select" name="sort">
                            <option value="newest" <?= $sortFilter === 'newest' ? 'selected' : '' ?>>Mới nhất</option>
                            <option value="oldest" <?= $sortFilter === 'oldest' ? 'selected' : '' ?>>Cũ nhất</option>
                            <option value="status" <?= $sortFilter === 'status' ? 'selected' : '' ?>>Theo trạng thái</option>
                            <option value="amount" <?= $sortFilter === 'amount' ? 'selected' : '' ?>>Theo tổng tiền</option>
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
                            <th>Dịch vụ</th>
                            <th>Gói</th>
                            <th>Ngày bắt đâu</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th>Nhân viên</th>
                            <th>Hành động</th>
                        </tr>
                        </thead>
                        <tbody>
                        <?php if ($loadError !== ''): ?>
                            <tr>
                                <td colspan="8" class="empty-row py-4">Loi tai du lieu: <?= esc($loadError) ?></td>
                            </tr>
                        <?php elseif (!$paginatedRows): ?>
                            <tr>
                                <td colspan="8" class="empty-row py-4">Khong co hoa don phu hop bo loc.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($paginatedRows as $item): ?>
                                <tr>
                                    <td><span class="badge text-bg-light border id-badge"><?= esc($item['id']) ?></span></td>
                                    <td>
                                        <div class="fw-semibold"><?= esc($item['service']) ?></div>
                                        <div class="small text-secondary">Khach: <?= esc($item['customer']) ?></div>
                                    </td>
                                    <td><?= esc($item['package']) ?></td>
                                    <td><?= esc($item['startDate']) ?></td>
                                    <td class="fw-semibold text-danger-emphasis"><?= esc($item['amountText']) ?></td>
                                    <td><span class="badge rounded-pill <?= esc($item['statusClass']) ?>"><?= esc($item['statusText']) ?></span></td>
                                    <td><?= esc($item['employee'] !== '' ? $item['employee'] : 'Chua co') ?></td>
                                    <td>
                                        <div class="action-group">
                                            <?php if ((int)$item['id'] > 0 && $item['statusKey'] === 'pending'): ?>
                                                <form method="post" action="xy-ly-huy.php" class="d-inline">
                                                    <input type="hidden" name="invoice_id" value="<?= esc($item['id']) ?>">
                                                    <button type="submit" class="btn btn-outline-danger btn-action"><i class="bi bi-x-circle"></i>Huy don</button>
                                                </form>
                                            <?php endif; ?>

                                            <?php if ((int)$item['id'] > 0): ?>
                                                <a href="chi-tiet-hoa-don.php?id=<?= urlencode($item['id']) ?>" class="btn btn-primary btn-action"><i class="bi bi-eye"></i>Chi tiet</a>
                                            <?php else: ?>
                                                <button type="button" class="btn btn-outline-secondary btn-action" disabled>Khong co ID</button>
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
                    <div class="summary-note">Hien thi <?= (int)$from ?> - <?= (int)$to ?> / <?= (int)$totalFiltered ?> hoa don</div>
                    <?php if ($totalPages > 1): ?>
                        <nav aria-label="Phan trang hoa don khach hang">
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                    <a class="page-link" href="<?= esc($buildPageUrl(max(1, $page - 1))) ?>">Truoc</a>
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
</main>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
