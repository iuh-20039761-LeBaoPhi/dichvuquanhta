<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';
require_once __DIR__ . '/header-shared.php';

$sessionUser = session_user_require_employee('../login.html', 'nhan_vien/danh-sach-hoa-don.php');

$result = getHoaDonData();
$rows = $result['rows'] ?? [];
$loadError = (string)($result['error'] ?? '');
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = strtolower(trim((string)($_GET['status'] ?? 'all')));
$serviceFilter = trim((string)($_GET['service'] ?? 'all'));
$sortFilter = strtolower(trim((string)($_GET['sort'] ?? 'newest')));

if (!in_array($statusFilter, ['all', 'pending', 'approved', 'received', 'other'], true)) {
    $statusFilter = 'all';
}
if (!in_array($sortFilter, ['newest', 'oldest', 'status', 'customer'], true)) {
    $sortFilter = 'newest';
}

function normalize_status_key(string $status): string
{
    $raw = strtolower(trim($status));

    if (in_array($raw, ['da_nhan', 'da nhan', 'đã nhận', 'received'], true)) {
        return 'received';
    }
    if (in_array($raw, ['approved', 'da_duyet', 'da duyet', 'đã duyệt', 'accepted'], true)) {
        return 'approved';
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
        return ['key' => 'received', 'text' => 'Da nhan', 'class' => 'text-bg-success'];
    }
    if ($key === 'approved') {
        return ['key' => 'approved', 'text' => 'Da duyet', 'class' => 'text-bg-info'];
    }
    if ($key === 'pending') {
        return ['key' => 'pending', 'text' => 'Cho duyet', 'class' => 'text-bg-warning'];
    }

    return ['key' => 'other', 'text' => 'Khac', 'class' => 'text-bg-secondary'];
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

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$normalizedRows = [];
$serviceMap = [];

foreach ($rows as $row) {
    if (!is_array($row)) {
        continue;
    }

    $id = trim((string)($row['id'] ?? ''));
    $name = trim((string)($row['hovaten'] ?? ''));
    $service = trim((string)($row['dich_vu'] ?? ''));
    $package = trim((string)($row['goi_dich_vu'] ?? ''));
    $startDate = trim((string)($row['ngay_bat_dau'] ?? ''));
    $statusRaw = trim((string)($row['trangthai'] ?? ''));
    $phone = trim((string)($row['sodienthoai'] ?? ''));

    $meta = status_meta($statusRaw);

    if ($service !== '') {
        $serviceMap[$service] = $service;
    }

    $normalizedRows[] = [
        'id' => $id,
        'name' => $name !== '' ? $name : 'N/A',
        'service' => $service !== '' ? $service : 'N/A',
        'package' => $package !== '' ? $package : 'N/A',
        'startDate' => $startDate !== '' ? $startDate : 'N/A',
        'phone' => $phone,
        'statusRaw' => $statusRaw,
        'statusKey' => (string)$meta['key'],
        'statusText' => (string)$meta['text'],
        'statusClass' => (string)$meta['class'],
        'isReceived' => ((string)$meta['key'] === 'received'),
    ];
}

$services = array_values($serviceMap);
sort($services);

$filteredRows = array_values(array_filter($normalizedRows, static function (array $item) use ($q, $statusFilter, $serviceFilter): bool {
    if ($statusFilter !== 'all' && $item['statusKey'] !== $statusFilter) {
        return false;
    }

    if ($serviceFilter !== 'all' && $item['service'] !== $serviceFilter) {
        return false;
    }

    if ($q !== '') {
        $searchTarget = implode(' ', [
            $item['id'],
            $item['name'],
            $item['service'],
            $item['package'],
            $item['phone'],
            $item['startDate'],
        ]);

        if (!contains_text($searchTarget, $q)) {
            return false;
        }
    }

    return true;
}));

if ($sortFilter === 'oldest') {
    usort($filteredRows, static fn(array $a, array $b): int => ((int)$a['id']) <=> ((int)$b['id']));
} elseif ($sortFilter === 'status') {
    $order = ['pending' => 1, 'approved' => 2, 'received' => 3, 'other' => 4];
    usort($filteredRows, static function (array $a, array $b) use ($order): int {
        $left = $order[$a['statusKey']] ?? 99;
        $right = $order[$b['statusKey']] ?? 99;
        if ($left === $right) {
            return ((int)$b['id']) <=> ((int)$a['id']);
        }
        return $left <=> $right;
    });
} elseif ($sortFilter === 'customer') {
    usort($filteredRows, static fn(array $a, array $b): int => strcasecmp($a['name'], $b['name']));
} else {
    usort($filteredRows, static fn(array $a, array $b): int => ((int)$b['id']) <=> ((int)$a['id']));
}

$summaryPending = count(array_filter($normalizedRows, static fn(array $i): bool => $i['statusKey'] === 'pending'));
$summaryReceived = count(array_filter($normalizedRows, static fn(array $i): bool => $i['statusKey'] === 'received'));
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
</head>
<body>
<main class="page-wrap">
    <?php render_nhan_vien_header($sessionUser, 'Quan ly hoa don nhan vien'); ?>

    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2" role="alert">
            <?= esc($flashMsg) ?>
        </div>
    <?php endif; ?>

    <section class="card panel-soft mb-3">
        <div class="card-body p-3 p-lg-4">
            <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-3">
                <div>
                    <h1 class="h4 fw-bold mb-1">Danh sách hóa đơn</h1>
                    <p class="summary-note mb-0">Theo dõi, lọc va xử lý công viêc.</p>
                </div>
                <div class="text-secondary small">Tổng hiển thị: <b><?= (int)count($filteredRows) ?></b> / <?= (int)$summaryTotal ?> hoa don</div>
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
                            <input type="text" class="form-control" name="q" value="<?= esc($q) ?>" placeholder="ID, khach hang, SDT...">
                        </div>
                    </div>
                    <div class="col-6 col-md-3 col-lg-2">
                        <label class="form-label small text-secondary mb-1">Trạng thái</label>
                        <select class="form-select" name="status">
                            <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tất cả</option>
                            <option value="pending" <?= $statusFilter === 'pending' ? 'selected' : '' ?>>Chờ duyệt</option>
                            <option value="approved" <?= $statusFilter === 'approved' ? 'selected' : '' ?>>Đã duyệt</option>
                            <option value="received" <?= $statusFilter === 'received' ? 'selected' : '' ?>>Đã nhận</option>
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
                                <th>Gói</th>
                                <th>Ngay bắt đàu</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                        <?php if ($loadError !== ''): ?>
                            <tr>
                                <td colspan="7" class="empty-row py-4">Loi tai du lieu: <?= esc($loadError) ?></td>
                            </tr>
                        <?php elseif (!$filteredRows): ?>
                            <tr>
                                <td colspan="7" class="empty-row py-4">Khong co hoa don phu hop bo loc.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($filteredRows as $item): ?>
                                <tr>
                                    <td><span class="badge text-bg-light border id-badge"><?= esc($item['id']) ?></span></td>
                                    <td>
                                        <div class="fw-semibold"><?= esc($item['name']) ?></div>
                                        <?php if ($item['phone'] !== ''): ?>
                                            <div class="small text-secondary"><?= esc($item['phone']) ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= esc($item['service']) ?></td>
                                    <td><?= esc($item['package']) ?></td>
                                    <td><?= esc($item['startDate']) ?></td>
                                    <td><span class="badge rounded-pill <?= esc($item['statusClass']) ?>"><?= esc($item['statusText']) ?></span></td>
                                    <td>
                                        <div class="action-group">
                                            <?php if (!$item['isReceived']): ?>
                                                <form method="post" action="xu-ly-nhan-viec.php" class="d-inline">
                                                    <input type="hidden" name="invoice_id" value="<?= esc($item['id']) ?>">
                                                    <button type="submit" class="btn btn-success btn-action"><i class="bi bi-hand-thumbs-up"></i>Nhan viec</button>
                                                </form>
                                            <?php endif; ?>
                                            <a href="chi-tiet-hoa-don.php?id=<?= urlencode($item['id']) ?>" class="btn btn-primary btn-action"><i class="bi bi-eye"></i>Chi tiet</a>
                                            <button type="button" class="btn btn-outline-secondary btn-action" disabled><i class="bi bi-cloud-upload"></i>Upload</button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>
</main>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
