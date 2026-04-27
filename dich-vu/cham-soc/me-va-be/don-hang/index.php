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
$fromDate = trim((string) ($_GET['from_date'] ?? ''));
$toDate = trim((string) ($_GET['to_date'] ?? ''));

if ($statusFilter === '') {
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
] = pagination_array($filteredRows, pagination_get_page($_GET, 'page', 1), 10);

$buildPageUrl = static fn(int $targetPage): string => pagination_build_url($targetPage, [
    'q' => $q,
    'status' => $statusFilter,
    'from_date' => $fromDate,
    'to_date' => $toDate,
], 'page', 'index.php');

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
// Keep 'all' as first
$availableStatuses = array_merge(['all'], array_diff($availableStatuses, ['all']));
?>
<?php
$pageTitle = "Danh sách đơn hàng";
include 'layout-header.php';
?>
<style>
    /* Giữ nguyên style gốc của trang */
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

    .jobs-table { --bs-table-hover-bg: #fff1f8; }

    .jobs-table thead th {
        background: linear-gradient(135deg, #ffe8f3 0%, #ffeff8 100%);
        color: #8a3260;
        border-bottom-color: #f3cbe0;
    }

    .jobs-table tbody td { border-color: #f7dae9; }

    .id-badge {
        background: #ffeaf5 !important;
        border-color: #f2bed9 !important;
        color: #8f2f61 !important;
    }

    .summary-note, .empty-row, .text-secondary, .form-label.small.text-secondary {
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

    .btn-primary:hover, .btn-primary:focus {
        border-color: #e58ab8;
        background: linear-gradient(135deg, #de63a1, #bf4d86);
    }

    .btn-outline-secondary {
        color: #8c3160;
        border-color: #ebb3d1;
        background: #fff7fb;
    }

    .btn-outline-secondary:hover, .btn-outline-secondary:focus {
        color: #fff;
        border-color: #ca5a90;
        background: #ca5a90;
    }

    .form-control, .form-select, .input-group-text {
        border-color: #f0c5db;
        background: #fffbfd;
        color: #744360;
    }

    .form-control:focus, .form-select:focus {
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

    /* Mobile Card Styles */
    .invoice-card {
        background: #ffffffff;
        border: 1px solid #020202ff;
        margin-bottom: 2px;
        border-radius: 5px;
        padding: 10px;
        text-decoration: none !important;
        color: inherit !important;
        display: block;
        transition: background 0.2s;
    }

    .invoice-card:active { background: #fff0f7; }
    .invoice-card .inv-id { color: #c52274ff; font-weight: 700; font-size: 0.95rem; }
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

    <section class="card panel-soft mb-3" >
        <div class="card-body p-3 p-lg-4">
            <?php if (!$isEmployeeApproved): ?>
                    <div class="alert alert-warning mb-0">Tài khoản của bạn đang chờ duyệt</div>
            <?php else: ?>
                    <div class="filter-section">
                        <form method="get" id="filterForm">
                            <input type="hidden" name="status" id="statusInput" value="<?= htmlspecialchars($statusFilter, ENT_QUOTES, 'UTF-8') ?>">
                            
                            <div class="filter-header">
                                <div class="header-title">
                                    <h1>Quản lý Đơn hàng</h1>
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
                                    
                                    <button type="button" class="btn-refresh" onclick="window.location.href='index.php'">
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
                                                                <a href="chi-tiet-hoa-don-mevabe.php"
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
                                            <a href="chi-tiet-hoa-don-mevabe.php" class="invoice-card"
                                                onclick="sessionStorage.setItem('last_view_mahd', <?= htmlspecialchars(json_encode((string) $itemId)) ?>); sessionStorage.setItem('last_view_sodienthoai', <?= htmlspecialchars(json_encode((string) ($_SESSION['user']['sodienthoai'] ?? ''))) ?>); sessionStorage.setItem('last_view_password', <?= htmlspecialchars(json_encode((string) ($_SESSION['user']['matkhau'] ?? ''))) ?>); if(typeof navigateTo === 'function') { navigateTo(this.getAttribute('href')); return false; }">
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