<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));
$user = $_SESSION['user'] ?? null;
$userPhone = preg_replace('/\D/', '', $user['sodienthoai'] ?? '');
$loadError = '';
$rows = [];
$isEmployeeApproved = true;

try {
    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => 'datlich_donvesinh'], JSON_UNESCAPED_UNICODE);
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 20,
        ]
    ];
    $context = stream_context_create($opts);
    $raw = @file_get_contents($url, false, $context);

    if (!$raw) {
        $loadError = 'Không thể kết nối API';
    } else {
        $json = json_decode($raw, true);
        $allData = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];

        foreach ($allData as $item) {
            $phoneKH = preg_replace('/\D/', '', $item['sdtkhachhang'] ?? '');
            if ($phoneKH !== '' && $phoneKH === $userPhone) {
                $rows[] = $item;
            }
        }
    }
} catch (\Throwable $e) {
    $loadError = 'Lỗi: ' . $e->getMessage();
}
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
$fromDate = trim((string) ($_GET['from_date'] ?? ''));
$toDate = trim((string) ($_GET['to_date'] ?? ''));

if ($statusFilter === '') {
    $statusFilter = 'all';
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

// Dynamic Status Mapping & Counts
$statusCounts = [];
$statusCounts['all'] = count($rows);
foreach ($rows as $row) {
    $st = trim((string) ($row['trangthai'] ?? ''));
    if ($st === '' || $st === 'đang chờ') $st = 'chờ duyệt';
    $statusCounts[$st] = ($statusCounts[$st] ?? 0) + 1;
}
$availableStatuses = array_keys($statusCounts);
sort($availableStatuses);
$availableStatuses = array_merge(['all'], array_diff($availableStatuses, ['all']));

if ($statusFilter !== 'all' && !isset($statusMap[$statusFilter])) {
    $statusFilter = 'all';
}

$filteredRows = array_values(array_filter($rows, static function (array $item) use ($q, $statusFilter, $fromDate, $toDate): bool {
    $status = trim((string) ($item['trangthai'] ?? ''));
    if ($status === '' || $status === 'đang chờ') {
        $status = 'chờ duyệt';
    }

    if ($statusFilter !== 'all' && $status !== $statusFilter) {
        return false;
    }

    if ($fromDate !== '') {
        $itemDate = date('Y-m-d', strtotime((string) ($item['ngay_bat_dau_kehoach'] ?? 'now')));
        if ($itemDate < $fromDate) return false;
    }
    if ($toDate !== '') {
        $itemDate = date('Y-m-d', strtotime((string) ($item['ngay_bat_dau_kehoach'] ?? 'now')));
        if ($itemDate > $toDate) return false;
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

// Sorting
usort($filteredRows, static fn(array $a, array $b): int => ((int) ($b['id'] ?? 0)) <=> ((int) ($a['id'] ?? 0)));

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
    'from_date' => $fromDate,
    'to_date' => $toDate,
], 'page', 'don-hang-cua-toi.php');

$summaryPending = count(array_filter($rows, static fn(array $i): bool => trim((string) ($i['trangthai'] ?? '')) === '' || trim((string) ($i['trangthai'] ?? '')) === 'chờ duyệt'));
$summaryReceived = count(array_filter($rows, static fn(array $i): bool => trim((string) ($i['trangthai'] ?? '')) === 'hoàn thành' || trim((string) ($i['trangthai'] ?? '')) === 'đã nhận' || trim((string) ($i['trangthai'] ?? '')) === 'đang thực hiện'));
$summaryTotal = count($rows);
?>
<?php
$pageTitle = "Đơn hàng của tôi";
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
        font-weight: 600;
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
        font-weight: 600;
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
        font-weight: 600;
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
        .table-wrap {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
        }

        .page-wrap {
            padding: 1px;
        }

        .panel-soft {
            margin: 1px;
            border-radius: 12px;
        }

        .card-body {
            padding: 8px 1px !important;
        }

        .stat-card {
            padding: 8px 6px;
        }

        .stat-value {
            font-size: 1.2rem;
        }

        .filter-box {
            padding: 8px 4px;
        }

        .jobs-table thead th,
        .jobs-table tbody td {
            padding: 8px 6px;
            font-size: 0.85rem;
        }

        .row {
            --bs-gutter-x: 0.25rem;
            --bs-gutter-y: 0.25rem;
        }

        .mb-3 {
            margin-bottom: 0.5rem !important;
        }

        .g-2,
        .g-3 {
            --bs-gutter-x: 0.25rem;
            --bs-gutter-y: 0.25rem;
        }
    }

    /* Filter & Header Styles */
    .filter-section {
        background: #fff;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        margin-bottom: 20px;
    }

    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 20px;
    }

    .header-title h1 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 2px;
    }

    .header-title p {
        font-size: 0.85rem;
        color: #64748b;
        margin-bottom: 0;
    }

    .filter-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .date-input-group {
        display: flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 4px 12px;
        gap: 8px;
    }

    .date-input-group span {
        font-size: 0.8rem;
        color: #64748b;
        white-space: nowrap;
    }

    .date-input-group input {
        border: none;
        background: transparent;
        font-size: 0.85rem;
        color: #1e293b;
        font-weight: 500;
        outline: none;
        width: 110px;
    }

    .search-input-wrapper {
        position: relative;
        min-width: 240px;
    }

    .search-input-wrapper i {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
    }

    .search-input-wrapper input {
        width: 100%;
        padding: 10px 14px 10px 40px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        font-size: 0.9rem;
        color: #1e293b;
        transition: all 0.2s;
    }

    .search-input-wrapper input:focus {
        background: #fff;
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        outline: none;
    }

    .btn-refresh {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #3b82f6;
        color: #fff;
        border: none;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transition: all 0.2s;
    }

    .btn-refresh:hover {
        background: #2563eb;
        transform: translateY(-1px);
    }

    /* Tabs Styles */
    .filter-tabs {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 5px;
        scrollbar-width: none; /* Firefox */
    }

    .filter-tabs::-webkit-scrollbar {
        display: none; /* Chrome, Safari */
    }

    .tab-item {
        display: flex;
        align-items: center;
        padding: 10px 20px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 12px;
        color: #64748b;
        font-weight: 600;
        font-size: 0.9rem;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none !important;
        gap: 8px;
    }

    .tab-item:hover {
        background: #f1f5f9;
        color: #1e293b;
    }

    .tab-item.active {
        background: #3b82f6;
        color: #fff !important;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
    }

    .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .tab-item.active .tab-badge {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
    }

    .badge-chua-nhan { background: #fef3c7; color: #d97706; }
    .badge-dang-thue { background: #dbeafe; color: #2563eb; }
    .badge-hoan-thanh { background: #dcfce7; color: #16a34a; }
    .badge-da-huy { background: #fee2e2; color: #dc2626; }

    .tab-item:not(.active) .tab-badge.badge-all { background: #e2e8f0; color: #475569; }

    .status-mobile-trigger {
        display: none;
    }

    @media (max-width: 1024px) {
        .filter-section { padding: 15px; }
        .filter-header { flex-direction: column; align-items: stretch; }
        .filter-controls { flex-direction: column; align-items: stretch; }
        .date-input-group { width: 100%; justify-content: space-between; }
        .search-input-wrapper { min-width: 100%; }
        .btn-refresh { width: 100%; height: 42px; }

        .status-mobile-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            color: #1e293b;
            margin-top: 10px;
        }

        .filter-tabs {
            display: none;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
            padding: 10px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow-x: visible;
        }

        .filter-tabs.show {
            display: flex;
        }

        .tab-item {
            width: 100%;
            justify-content: space-between;
        }
    }
</style>
<style>
    /* Theme color overrides */
    body {
        background: linear-gradient(180deg, #f0f7ff 0%, #e1efff 48%, #f8fbff 100%);
        color: #1e293b;
    }

    .panel-soft {
        border: 1px solid #dbeafe;
        border-radius: 16px;
        box-shadow: 0 14px 34px rgba(30, 64, 175, 0.12);
        background: #f8fbff;
    }

    .stat-card {
        border-color: #dbeafe;
        background: linear-gradient(180deg, #f8fbff, #f0f7ff);
        box-shadow: 0 8px 20px rgba(30, 64, 175, 0.06);
    }

    .filter-box {
        border-color: #dbeafe;
        border-radius: 14px;
        background: linear-gradient(180deg, #f8fbff, #f0f7ff);
        box-shadow: 0 8px 18px rgba(30, 64, 175, 0.05);
    }

    .table-wrap {
        border-color: #dbeafe;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 10px 22px rgba(30, 64, 175, 0.08);
    }

    .jobs-table {
        --bs-table-hover-bg: #f0f7ff;
    }

    .jobs-table thead th {
        background: linear-gradient(135deg, #e1efff 0%, #f0f7ff 100%);
        color: #1e40af;
        border-bottom-color: #dbeafe;
    }

    .jobs-table tbody td {
        border-color: #eef2ff;
    }

    .id-badge {
        background: #eff6ff !important;
        border-color: #dbeafe !important;
        color: #1e40af !important;
    }

    .summary-note,
    .empty-row,
    .text-secondary,
    .form-label.small.text-secondary {
        color: #64748b !important;
    }

    .badge.rounded-pill.text-bg-warning,
    .badge.rounded-pill.text-bg-info,
    .badge.rounded-pill.text-bg-success,
    .badge.rounded-pill.text-bg-secondary {
        border: 1px solid #dbeafe;
        background: #eff6ff !important;
        color: #1e40af !important;
    }

    .btn-primary {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        box-shadow: 0 8px 18px rgba(29, 78, 216, 0.24);
    }

    .btn-primary:hover,
    .btn-primary:focus {
        border-color: #2563eb;
        background: linear-gradient(135deg, #2563eb, #1e40af);
    }

    .btn-outline-secondary {
        color: #1e40af;
        border-color: #dbeafe;
        background: #f8fbff;
    }

    .btn-outline-secondary:hover,
    .btn-outline-secondary:focus {
        color: #fff;
        border-color: #1e40af;
        background: #1e40af;
    }

    .form-control,
    .form-select,
    .input-group-text {
        border-color: #dbeafe;
        background: #f8fbff;
        color: #1e293b;
    }

    .form-control:focus,
    .form-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.2);
    }

    .pagination .page-link {
        color: #1e40af;
        border-color: #dbeafe;
        background: #f8fbff;
    }

    .pagination .page-item.active .page-link {
        border-color: #1d4ed8;
        background: #1d4ed8;
        color: #fff;
    }

    .alert-success {
        color: #1f6148;
        background: #e9f8f1;
        border-color: #9dd9be;
        box-shadow: 0 8px 16px rgba(31, 97, 72, 0.08);
    }

    .alert-warning {
        color: #1e40af;
        background: #eff6ff;
        border-color: #dbeafe;
        box-shadow: 0 8px 16px rgba(30, 64, 175, 0.08);
    }

    /* Mobile Card Styles */
    .invoice-card {
        background: #ffffffff;
        border: 1px solid #eef2ff;
        margin-bottom: 2px;
        border-radius: 5px;
        padding: 10px;
        text-decoration: none !important;
        color: inherit !important;
        display: block;
        transition: background 0.2s;
    }

    .invoice-card:active {
        background: #f0f7ff;
    }

    .invoice-card .inv-id {
        color: #2563eb;
        font-weight: 600;
        font-size: 0.95rem;
    }

    .invoice-card .inv-date {
        color: #94a3b8;
        font-size: 0.75rem;
    }

    .invoice-card .inv-name {
        font-weight: 600;
        font-size: 1rem;
        color: #1e293b;
        margin-top: 4px;
    }

    .invoice-card .inv-status {
        background: #1e293b;
        color: #fff;
        font-size: 0.7rem;
        padding: 4px 10px;
        border-radius: 999px;
        font-weight: 600;
    }

    .invoice-card .inv-service {
        color: #64748b;
        font-size: 0.85rem;
        margin-top: 2px;
    }

    .invoice-card .inv-price {
        color: #3b82f6;
        font-weight: 700;
        font-size: 1.1rem;
        text-align: right;
        margin-top: 4px;
    }
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
                <div class="filter-section">
                    <form method="get" id="filterForm">
                        <input type="hidden" name="status" id="statusInput" value="<?= htmlspecialchars($statusFilter, ENT_QUOTES, 'UTF-8') ?>">
                        
                        <div class="filter-header">
                            <div class="header-title">
                                <h1>Đơn hàng của tôi</h1>
                                <p>Theo dõi mọi giao dịch hệ thống</p>
                            </div>
                            
                            <div class="filter-controls">
                                <div class="date-input-group">
                                    <span>Từ</span>
                                    <input type="date" name="from_date" value="<?= htmlspecialchars($fromDate, ENT_QUOTES, 'UTF-8') ?>" onchange="this.form.submit()">
                                </div>
                                <div class="date-input-group">
                                    <span>Đến</span>
                                    <input type="date" name="to_date" value="<?= htmlspecialchars($toDate, ENT_QUOTES, 'UTF-8') ?>" onchange="this.form.submit()">
                                </div>
                                
                                <div class="search-input-wrapper">
                                    <i class="bi bi-search"></i>
                                    <input type="text" name="q" value="<?= htmlspecialchars($q, ENT_QUOTES, 'UTF-8') ?>" placeholder="Mã đơn / Tên khách..." onkeypress="if(event.keyCode === 13) { this.form.submit(); return false; }">
                                </div>
                                
                                <button type="button" class="btn-refresh" onclick="window.location.href='don-hang-cua-toi.php'">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>
                        </div>
                        
                        <?php
                        $activeLabel = 'Tất cả';
                        foreach ($availableStatuses as $st) {
                            if ($st === $statusFilter) {
                                $activeLabel = ($st === 'all') ? 'Tất cả' : mb_convert_case($st, MB_CASE_TITLE, "UTF-8");
                                break;
                            }
                        }
                        ?>
                        <div class="status-mobile-trigger" onclick="toggleStatusMenu()">
                            <span>Trạng thái: <b><?= htmlspecialchars($activeLabel, ENT_QUOTES, 'UTF-8') ?></b></span>
                            <i class="bi bi-chevron-down"></i>
                        </div>

                        <div class="filter-tabs" id="statusMenu">
                            <?php foreach ($availableStatuses as $stKey): ?>
                                <?php
                                $label = ($stKey === 'all') ? 'Tất cả' : mb_convert_case($stKey, MB_CASE_TITLE, "UTF-8");
                                $badgeClass = 'badge-all';
                                if ($stKey === 'chờ duyệt' || $stKey === 'đang chờ') $badgeClass = 'badge-chua-nhan';
                                elseif (strpos($stKey, 'thực hiện') !== false || strpos($stKey, 'nhận') !== false) $badgeClass = 'badge-dang-thue';
                                elseif (strpos($stKey, 'hoàn thành') !== false || strpos($stKey, 'xong') !== false) $badgeClass = 'badge-hoan-thanh';
                                elseif (strpos($stKey, 'hủy') !== false) $badgeClass = 'badge-da-huy';
                                ?>
                                <a href="javascript:void(0)" onclick="setStatus('<?= htmlspecialchars($stKey, ENT_QUOTES, 'UTF-8') ?>')" class="tab-item <?= $statusFilter === $stKey ? 'active' : '' ?>">
                                    <?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?> 
                                    <span class="tab-badge <?= $badgeClass ?>"><?= $statusCounts[$stKey] ?></span>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    </form>
                </div>

                <script>
                function setStatus(status) {
                    document.getElementById('statusInput').value = status;
                    document.getElementById('filterForm').submit();
                }
                function toggleStatusMenu() {
                    document.getElementById('statusMenu').classList.toggle('show');
                }
                </script>

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
                                            <td><span
                                                    class="badge text-bg-light border id-badge"><?= htmlspecialchars($displayItemId, ENT_QUOTES, 'UTF-8') ?></span>
                                            </td>
                                            <td>
                                                <div class="fw-semibold">
                                                    <?= htmlspecialchars((string) ($item['tenkhachhang'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?>
                                                </div>
                                                <?php if (trim((string) ($item['sdtkhachhang'] ?? '')) !== ''): ?>
                                                    <div class="small text-secondary">
                                                        <?= htmlspecialchars((string) ($item['sdtkhachhang'] ?? ''), ENT_QUOTES, 'UTF-8') ?>
                                                    </div>
                                                <?php endif; ?>
                                            </td>
                                            <td><?= htmlspecialchars((string) ($item['dich_vu'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?>
                                            </td>
                                            <td><?= number_format((float) ($item['tong_tien'] ?? 0), 0, ',', '.') . ' VND' ?></td>
                                            <td><?= date('d/m/Y', strtotime((string) ($item['ngay_bat_dau_kehoach'] ?? 'now'))) ?>
                                            </td>
                                            <td><span
                                                    class="badge rounded-pill <?= htmlspecialchars($badgeClass, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($statusValue, ENT_QUOTES, 'UTF-8') ?></span>
                                            </td>
                                            <td>
                                                <div class="action-group">
                                                    <a href="chi-tiet-hoa-don-donvesinh.php"
                                                        onclick="sessionStorage.setItem('last_view_mahd', <?= htmlspecialchars(json_encode((string) $itemId)) ?>); sessionStorage.setItem('last_view_sodienthoai', <?= htmlspecialchars(json_encode((string) ($_SESSION['user']['sodienthoai'] ?? ''))) ?>); sessionStorage.setItem('last_view_password', <?= htmlspecialchars(json_encode((string) ($_SESSION['user']['matkhau'] ?? ''))) ?>); if(typeof navigateTo === 'function') { navigateTo(this.getAttribute('href')); return false; }"
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
                                if ($statusValue === '') {
                                    $statusValue = 'đang chờ';
                                }
                                $price = number_format((float) ($item['tong_tien'] ?? 0), 0, ',', '.') . ' VND';
                                ?>
                                <a href="chi-tiet-hoa-don-donvesinh.php" class="invoice-card"
                                    onclick="sessionStorage.setItem('last_view_mahd', <?= htmlspecialchars(json_encode((string) $itemId)) ?>); sessionStorage.setItem('last_view_sodienthoai', <?= htmlspecialchars(json_encode((string) ($_SESSION['user']['sodienthoai'] ?? ''))) ?>); sessionStorage.setItem('last_view_password', <?= htmlspecialchars(json_encode((string) ($_SESSION['user']['matkhau'] ?? ''))) ?>); if(typeof navigateTo === 'function') { navigateTo(this.getAttribute('href')); return false; }">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="inv-id"><?= htmlspecialchars($displayItemId, ENT_QUOTES, 'UTF-8') ?></div>
                                        <div class="inv-date">
                                            <?= date('d/m/Y', strtotime((string) ($item['ngay_bat_dau_kehoach'] ?? 'now'))) ?>
                                        </div>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center mt-1">
                                        <div class="inv-name">
                                            <?= htmlspecialchars((string) ($item['tenkhachhang'] ?? 'N/A'), ENT_QUOTES, 'UTF-8') ?>
                                        </div>
                                        <span class="inv-status"><?= htmlspecialchars($statusValue, ENT_QUOTES, 'UTF-8') ?></span>
                                    </div>
                                    <div class="inv-service">
                                        <?= htmlspecialchars((string) ($item['dich_vu'] ?? 'Dịch vụ'), ENT_QUOTES, 'UTF-8') ?>
                                    </div>
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
                                        <a class="page-link"
                                            href="<?= htmlspecialchars($buildPageUrl(max(1, $page - 1)), ENT_QUOTES, 'UTF-8') ?>"
                                            onclick="event.preventDefault(); navigateTo(this.getAttribute('href'));">Truoc</a>
                                    </li>
                                    <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                        <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                            <a class="page-link" href="<?= htmlspecialchars($buildPageUrl($i), ENT_QUOTES, 'UTF-8') ?>"
                                                onclick="event.preventDefault(); navigateTo(this.getAttribute('href'));"><?= $i ?></a>
                                        </li>
                                    <?php endfor; ?>
                                    <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                        <a class="page-link"
                                            href="<?= htmlspecialchars($buildPageUrl(min($totalPages, $page + 1)), ENT_QUOTES, 'UTF-8') ?>"
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