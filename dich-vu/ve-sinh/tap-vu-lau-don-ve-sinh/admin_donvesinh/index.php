<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$admin = admin_require_login();

$q = trim((string) ($_GET['q'] ?? ''));
$statusFilter = trim((string) ($_GET['status'] ?? 'all'));
$dateFrom = trim((string) ($_GET['date_from'] ?? ''));
$dateTo = trim((string) ($_GET['date_to'] ?? ''));

$normalizeDateInput = static function (string $value): string {
	if ($value === '') {
		return '';
	}

	$dt = DateTimeImmutable::createFromFormat('Y-m-d', $value);
	$errors = DateTimeImmutable::getLastErrors();
	if (!$dt || (($errors['warning_count'] ?? 0) > 0) || (($errors['error_count'] ?? 0) > 0)) {
		return '';
	}

	return $dt->format('Y-m-d');
};

$dateFrom = $normalizeDateInput($dateFrom);
$dateTo = $normalizeDateInput($dateTo);
if ($dateFrom !== '' && $dateTo !== '' && $dateFrom > $dateTo) {
	[$dateFrom, $dateTo] = [$dateTo, $dateFrom];
}

$data = get_hoadon_data();
$rows = is_array($data['rows'] ?? null) ? $data['rows'] : [];
$error = (string) ($data['error'] ?? '');

// Status Mapping & Counts
$statusCounts = [];
$statusCounts['all'] = count($rows);
foreach ($rows as $row) {
	$st = trim((string) ($row['trangthai'] ?? ''));
	if ($st === '') {
		$st = 'Chờ xác nhận';
	}
	$statusCounts[$st] = ($statusCounts[$st] ?? 0) + 1;
}
$availableStatuses = array_keys($statusCounts);
sort($availableStatuses);
// Keep 'all' as first
$availableStatuses = array_merge(['all'], array_diff($availableStatuses, ['all']));

if ($statusFilter !== 'all' && !isset($statusCounts[$statusFilter])) {
	$statusFilter = 'all';
}

$qLower = function_exists('mb_strtolower') ? mb_strtolower($q, 'UTF-8') : strtolower($q);
$filtered = [];

foreach ($rows as $row) {
	if (!is_array($row)) {
		continue;
	}

	$statusText = trim((string) ($row['trangthai'] ?? ''));
	if ($statusText === '') {
		$statusText = 'Cho xac nhan';
	}

	if ($statusFilter !== 'all' && $statusText !== $statusFilter) {
		continue;
	}

	if ($qLower !== '') {
		$searchText = implode(' ', [
			(string) ($row['id'] ?? ''),
			(string) ($row['tenkhachhang'] ?? ''),
			(string) ($row['sdtkhachhang'] ?? ''),
			(string) ($row['dich_vu'] ?? ''),
			(string) ($row['goi_dich_vu'] ?? ''),
		]);
		$searchTextLower = function_exists('mb_strtolower') ? mb_strtolower($searchText, 'UTF-8') : strtolower($searchText);
		if (strpos($searchTextLower, $qLower) === false) {
			continue;
		}
	}

	$bookedRaw = trim((string) ($row['ngaydat'] ?? ''));
	if ($bookedRaw === '') {
		$bookedRaw = trim((string) ($row['created_date'] ?? ''));
	}
	if ($bookedRaw === '') {
		$bookedRaw = trim((string) ($row['ngay_bat_dau_kehoach'] ?? ''));
	}

	$bookedDate = '';
	if ($bookedRaw !== '') {
		$bookedTimestamp = strtotime($bookedRaw);
		if ($bookedTimestamp !== false) {
			$bookedDate = date('Y-m-d', $bookedTimestamp);
		}
	}

	if ($dateFrom !== '' && ($bookedDate === '' || $bookedDate < $dateFrom)) {
		continue;
	}
	if ($dateTo !== '' && ($bookedDate === '' || $bookedDate > $dateTo)) {
		continue;
	}

	$filtered[] = $row;
}

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
	'date_from' => $dateFrom,
	'date_to' => $dateTo,
]);

admin_render_layout_start('Quản Lý Đơn Hàng', 'orders', $admin);
?>

<style>
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

	.order-list-mobile {
		display: none;
	}

	@media (max-width: 991.98px) {
		.table-responsive {
			display: none !important;
		}

		.order-list-mobile {
			display: block;
		}

		.order-card-mobile {
			display: block;
			margin-bottom: 14px;
			text-decoration: none;
		}

		.order-card-inner {
			background: #fff;
			border-radius: 12px;
			box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
			padding: 16px 18px 12px 18px;
			border: 1px solid #e2e8f0;
			transition: box-shadow 0.2s;
		}

		.order-card-mobile:active .order-card-inner,
		.order-card-mobile:focus .order-card-inner {
			box-shadow: 0 4px 16px rgba(37, 99, 235, 0.16);
		}

		.order-card-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 4px;
		}

		.order-card-id {
			font-weight: 700;
			color: #2563eb;
			font-size: 1.08rem;
		}

		.order-card-date {
			font-size: 0.95rem;
			color: #64748b;
			font-weight: 500;
		}

		.order-card-customer {
			font-weight: 700;
			color: #0f172a;
			font-size: 1.07rem;
		}

		.order-card-status {
			font-size: 0.92rem;
			font-weight: 600;
			padding: 4px 10px;
			border-radius: 8px;
		}

		.order-card-service {
			color: #334155;
			font-size: 0.98rem;
			margin-bottom: 2px;
			margin-left: 2px;
		}

		.order-card-price {
			color: #1e40af;
			font-weight: 700;
			font-size: 1.15rem;
			text-align: right;
			margin-top: 2px;
		}
	}
</style>

<div class="filter-section">
	<form method="get" id="filterForm">
		<input type="hidden" name="status" id="statusInput" value="<?= admin_h($statusFilter) ?>">
		
		<div class="filter-header">
			<div class="header-title">
				<h1>Quản lý Đơn hàng</h1>
				<p>Theo dõi mọi giao dịch hệ thống (Tổng: <b><?= (int) $totalFiltered ?></b> đơn)</p>
			</div>
			
			<div class="filter-controls">
				<div class="date-input-group">
					<span>Từ</span>
					<input type="date" name="date_from" value="<?= admin_h($dateFrom) ?>" onchange="this.form.submit()">
				</div>
				<div class="date-input-group">
					<span>Đến</span>
					<input type="date" name="date_to" value="<?= admin_h($dateTo) ?>" onchange="this.form.submit()">
				</div>
				
				<div class="search-input-wrapper">
					<i class="bi bi-search"></i>
					<input type="text" name="q" value="<?= admin_h($q) ?>" placeholder="Mã đơn / Tên khách..." onkeypress="if(event.keyCode === 13) { this.form.submit(); return false; }">
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
				$activeLabel = ($st === 'all') ? 'Tất cả' : $st;
				break;
			}
		}
		?>
		<div class="status-mobile-trigger" onclick="toggleStatusMenu()">
			<span>Trạng thái: <b><?= admin_h($activeLabel) ?></b></span>
			<i class="bi bi-chevron-down"></i>
		</div>

		<div class="filter-tabs" id="statusMenu">
			<?php foreach ($availableStatuses as $stKey): ?>
				<?php
				$label = ($stKey === 'all') ? 'Tất cả' : $stKey;
				$badgeClass = 'badge-all';
				$stLower = function_exists('mb_strtolower') ? mb_strtolower($stKey, 'UTF-8') : strtolower($stKey);
				if (strpos($stLower, 'chờ') !== false || strpos($stLower, 'xác nhận') !== false) $badgeClass = 'badge-chua-nhan';
				elseif (strpos($stLower, 'thực hiện') !== false || strpos($stLower, 'nhận') !== false) $badgeClass = 'badge-dang-thue';
				elseif (strpos($stLower, 'hoàn thành') !== false || strpos($stLower, 'xong') !== false) $badgeClass = 'badge-hoan-thanh';
				elseif (strpos($stLower, 'hủy') !== false) $badgeClass = 'badge-da-huy';
				?>
				<a href="javascript:void(0)" onclick="setStatus('<?= admin_h($stKey) ?>')" class="tab-item <?= $statusFilter === $stKey ? 'active' : '' ?>">
					<?= admin_h($label) ?> 
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

<div class="card border-0 shadow-sm">
	<div class="card-body">
		<?php if ($error !== ''): ?>
			<div class="alert alert-warning mb-0"><?= admin_h($error) ?></div>
		<?php else: ?>
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0">
					<thead class="table-light">
						<tr>
							<th>Mã đơn</th>
							<th>Khách hàng</th>
							<th>Dịch vụ</th>
							<th>Tổng tiền</th>
							<th>Trạng thái</th>
							<th>Ngày đặt</th>
							<th class="text-end">Hành động</th>
						</tr>
					</thead>
					<tbody>
						<?php if (!$paginatedRows): ?>
							<tr>
								<td colspan="7" class="text-center py-4 text-secondary">Không có đơn hàng phù hợp.</td>
							</tr>
						<?php else: ?>
							<?php foreach ($paginatedRows as $row): ?>
								<?php $meta = hoadon_status_meta((string) ($row['trangthai'] ?? '')); ?>
								<tr>
									<td class="fw-semibold text-primary">#<?= admin_h((string) ($row['id'] ?? '')) ?></td>
									<td>
										<div class="fw-semibold">
											<?= admin_h(trim((string) ($row['tenkhachhang'] ?? '')) !== '' ? (string) $row['tenkhachhang'] : 'N/A') ?>
										</div>
										<div class="small text-secondary"><?= admin_h((string) ($row['sdtkhachhang'] ?? '')) ?>
										</div>
									</td>
									<td><?= admin_h(trim((string) ($row['dich_vu'] ?? '')) !== '' ? (string) $row['dich_vu'] : 'N/A') ?>
									</td>
									<td><?= number_format((float) ($row['tong_tien'] ?? 0), 0, ',', '.') ?> VND</td>
									<td><span
											class="badge rounded-pill <?= admin_h((string) $meta['badge']) ?>"><?= admin_h((string) $meta['text']) ?></span>
									</td>
									<td><?= admin_h(trim((string) ($row['ngaydat'] ?? '')) !== '' ? (string) $row['ngaydat'] : (trim((string) ($row['created_date'] ?? '')) !== '' ? (string) $row['created_date'] : (trim((string) ($row['ngay_bat_dau_kehoach'] ?? '')) !== '' ? (string) $row['ngay_bat_dau_kehoach'] : 'N/A'))) ?>
									</td>
									<td class="text-end">
										<a href="chi-tiet-hoa-don.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>"
											class="btn btn-sm btn-outline-primary">
											<i class="bi bi-eye me-1"></i>Chi tiết
										</a>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</div>

			<div class="order-list-mobile d-lg-none mt-2">
				<?php if (!$paginatedRows): ?>
					<div class="text-center py-4 text-secondary">Không có đơn hàng phù hợp.</div>
				<?php else: ?>
					<?php foreach ($paginatedRows as $row): ?>
						<?php $meta = hoadon_status_meta((string) ($row['trangthai'] ?? '')); ?>
						<a href="chi-tiet-hoa-don.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>" class="order-card-mobile">
							<div class="order-card-inner">
								<div class="order-card-row">
									<span
										class="order-card-id">#<?= str_pad((string) ($row['id'] ?? ''), 7, '0', STR_PAD_LEFT) ?></span>
									<span class="order-card-date">
										<?= admin_h(trim((string) ($row['ngaydat'] ?? '')) !== '' ? (string) $row['ngaydat'] : (trim((string) ($row['created_date'] ?? '')) !== '' ? (string) $row['created_date'] : (trim((string) ($row['ngay_bat_dau_kehoach'] ?? '')) !== '' ? (string) $row['ngay_bat_dau_kehoach'] : 'N/A'))) ?>
									</span>
								</div>
								<div class="order-card-row">
									<span
										class="order-card-customer"><?= admin_h(trim((string) ($row['tenkhachhang'] ?? '')) !== '' ? (string) $row['tenkhachhang'] : 'N/A') ?></span>
									<span
										class="order-card-status badge <?= admin_h((string) $meta['badge']) ?>"><?= admin_h((string) $meta['text']) ?></span>
								</div>
								<div class="order-card-service">
									<?= admin_h(trim((string) ($row['dich_vu'] ?? '')) !== '' ? (string) $row['dich_vu'] : 'N/A') ?>
								</div>
								<div class="order-card-price"><?= number_format((float) ($row['tong_tien'] ?? 0), 0, ',', '.') ?>
									VND
								</div>
							</div>
						</a>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>

			<?php if ($totalFiltered > 0): ?>
				<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
					<div class="small text-secondary">
						Hiển thị <?= (int) ($offset + 1) ?> - <?= (int) min($offset + $perPage, $totalFiltered) ?> /
						<?= (int) $totalFiltered ?> đơn hàng
					</div>
					<?php if ($totalPages > 1): ?>
						<nav aria-label="Phân trang đơn hàng">
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