<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_donhang.php';
require_once __DIR__ . '/get_taixe.php';
require_once __DIR__ . '/get_dichvu.php';

$admin = admin_require_login();

// Lấy dữ liệu đơn hàng
$donHangData = get_donhang_data();
$donHangRows = $donHangData['rows'] ?? [];
$donHangError = (string)($donHangData['error'] ?? '');

// Lấy dữ liệu tài xế
$taiXeData = get_taixe_data();
$taiXeRows = $taiXeData['rows'] ?? [];
$taiXeError = (string)($taiXeData['error'] ?? '');

// Lấy dữ liệu dịch vụ
$dichVuData = get_dichvu_data();
$dichVuRows = $dichVuData['rows'] ?? [];
$dichVuError = (string)($dichVuData['error'] ?? '');

// Thống kê trạng thái đơn hàng
$statusCounts = [
	'pending' => 0,
	'confirmed' => 0,
	'in_progress' => 0,
	'completed' => 0,
	'cancelled' => 0,
	'other' => 0,
];

$uniqueCustomers = [];
$uniqueServices = [];

foreach ($donHangRows as $row) {
	$statusKey = donhang_status_key((string)($row['trangthai'] ?? ''));
	if (!isset($statusCounts[$statusKey])) {
		$statusCounts['other']++;
	} else {
		$statusCounts[$statusKey]++;
	}

	$phone = trim((string)($row['sdtkhachhang'] ?? ''));
	if ($phone !== '') {
		$uniqueCustomers[$phone] = true;
	}

	$service = trim((string)($row['dich_vu'] ?? ''));
	if ($service !== '') {
		$uniqueServices[$service] = true;
	}
}

// Tổng hợp số liệu
$totalOrders = count($donHangRows);
$totalPending = $statusCounts['pending'];
$totalConfirmed = $statusCounts['confirmed'];
$totalInProgress = $statusCounts['in_progress'];
$totalCompleted = $statusCounts['completed'];
$totalCancelled = $statusCounts['cancelled'];
$totalCustomers = count($uniqueCustomers);
$totalServices = count($uniqueServices);
$totalDrivers = count($taiXeRows);

// Đếm tài xế theo trạng thái
$driverActive = 0;
$driverBusy = 0;
$driverOffline = 0;
$driverPending = 0;

foreach ($taiXeRows as $driver) {
	$status = $driver['trangthai'] ?? '';
	switch ($status) {
		case 'active': $driverActive++; break;
		case 'busy': $driverBusy++; break;
		case 'offline': $driverOffline++; break;
		case 'pending': $driverPending++; break;
	}
}

// Đơn hàng gần đây (6 đơn mới nhất)
$recentOrders = array_slice($donHangRows, 0, 6);

// Giá trị lớn nhất để hiển thị thanh progress
$maxStatus = max(1, max($statusCounts));

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

admin_render_layout_start('Tổng Quan', 'dashboard', $admin);
?>

<style>
	.admin-main {
		background: #f0f9ff !important;
	}

	.admin-main > main {
		background: #f0f9ff;
	}

	.dashboard-note {
		color: #64748b;
	}

	.dashboard-stat-card {
		position: relative;
		overflow: hidden;
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.45) !important;
		box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2) !important;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.dashboard-stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 14px 28px rgba(59, 130, 246, 0.3) !important;
	}

	.dashboard-stat-card::after {
		content: '';
		position: absolute;
		inset: auto -25% -50% auto;
		width: 150px;
		height: 150px;
		border-radius: 50%;
		opacity: 0.22;
		background: rgba(255, 255, 255, 0.65);
	}

	.dashboard-stat-card .text-secondary {
		color: rgba(255, 255, 255, 0.88) !important;
	}

	.stat-theme-blue { background: linear-gradient(135deg, #007bff, #00b4d8); }
	.stat-theme-green { background: linear-gradient(135deg, #14b8a6, #2563eb); }
	.stat-theme-slate { background: linear-gradient(135deg, #64748b, #475569); }
	.stat-theme-amber { background: linear-gradient(135deg, #f59e0b, #f97316); }
	.stat-theme-cyan { background: linear-gradient(135deg, #06b6d4, #0ea5e9); }
	.stat-theme-red { background: linear-gradient(135deg, #f43f5e, #a855f7); }
	.stat-theme-indigo { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
	.stat-theme-emerald { background: linear-gradient(135deg, #22c55e, #06b6d4); }
	.stat-theme-purple { background: linear-gradient(135deg, #8b5cf6, #d946ef); }

	.dashboard-icon {
		width: 50px;
		height: 50px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		font-size: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.45);
		background: rgba(255, 255, 255, 0.18);
		color: #ffffff;
		backdrop-filter: blur(4px);
	}

	.dashboard-table-wrap .table {
		margin-bottom: 0;
	}

	.dashboard-table-wrap,
	.dashboard-status-card {
		border: 1px solid #dbe7ff !important;
		background: linear-gradient(180deg, #ffffff, #f5f9ff);
		box-shadow: 0 8px 22px rgba(37, 99, 235, 0.08) !important;
	}

	.dashboard-table-wrap .table thead th {
		background: #eaf1ff !important;
	}

	.dashboard-table-wrap .table tbody tr:hover {
		background: #f6f9ff;
	}
</style>

<?php if ($flashMsg !== ''): ?>
	<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<?php if ($donHangError !== '' || $taiXeError !== '' || $dichVuError !== ''): ?>
	<div class="alert alert-warning">
		<?= admin_h(trim('Lỗi dữ liệu: ' . $donHangError . ' ' . $taiXeError . ' ' . $dichVuError)) ?>
	</div>
<?php endif; ?>

<!-- Hàng 1: Thống kê chính -->
<div class="row g-3 mb-3">
	<div class="col-12 col-md-6 col-xl-3">
		<div class="card h-100 dashboard-stat-card stat-theme-blue">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-calendar-check"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalOrders ?></h3><small class="text-secondary">Tổng đơn hàng</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3">
		<div class="card h-100 dashboard-stat-card stat-theme-amber">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-hourglass-split"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalPending ?></h3><small class="text-secondary">Chờ xác nhận</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3">
		<div class="card h-100 dashboard-stat-card stat-theme-cyan">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-tools"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalInProgress ?></h3><small class="text-secondary">Đang thực hiện</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3">
		<div class="card h-100 dashboard-stat-card stat-theme-green">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-check-circle"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalCompleted ?></h3><small class="text-secondary">Hoàn thành</small></div>
			</div>
		</div>
	</div>
</div>

<!-- Hàng 2: Thống kê phụ -->
<div class="row g-3 mb-3">
	<div class="col-12 col-md-6 col-xl-4">
		<div class="card h-100 dashboard-stat-card stat-theme-red">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-x-octagon"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalCancelled ?></h3><small class="text-secondary">Đơn đã hủy</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-4">
		<div class="card h-100 dashboard-stat-card stat-theme-emerald">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-people"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalCustomers ?></h3><small class="text-secondary">Khách hàng</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-4">
		<div class="card h-100 dashboard-stat-card stat-theme-purple">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-truck"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$totalDrivers ?></h3><small class="text-secondary">Tài xế</small></div>
			</div>
		</div>
	</div>
</div>

<!-- Hàng 3: Tài xế theo trạng thái -->
<div class="row g-3 mb-3">
	<div class="col-12 col-md-4">
		<div class="card h-100 dashboard-stat-card stat-theme-green">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-check-circle-fill"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$driverActive ?></h3><small class="text-secondary">Tài xế hoạt động</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-4">
		<div class="card h-100 dashboard-stat-card stat-theme-amber">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-clock-history"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$driverBusy ?></h3><small class="text-secondary">Tài xế đang bận</small></div>
			</div>
		</div>
	</div>
	<div class="col-12 col-md-4">
		<div class="card h-100 dashboard-stat-card stat-theme-slate">
			<div class="card-body d-flex align-items-center gap-3">
				<span class="dashboard-icon"><i class="bi bi-person-check"></i></span>
				<div><h3 class="h4 mb-0 fw-bold"><?= (int)$driverPending ?></h3><small class="text-secondary">Chờ duyệt</small></div>
			</div>
		</div>
	</div>
</div>

<!-- Hàng 4: Đơn hàng gần đây và thống kê trạng thái -->
<div class="row g-3">
	<div class="col-12 col-xl-8">
		<div class="card dashboard-table-wrap h-100">
			<div class="card-header bg-white border-0 pb-0">
				<h2 class="h6 fw-bold mb-0">Đơn hàng gần đây</h2>
			</div>
			<div class="card-body">
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-light">
							<tr>
								<th>Mã đơn</th>
								<th>Khách hàng</th>
								<th>Dịch vụ</th>
								<th>Điểm đến</th>
								<th>Trạng thái</th>
								<th>Ngày đặt</th>
							</tr>
						</thead>
						<tbody>
						<?php if (!$recentOrders): ?>
							<tr><td colspan="6" class="text-center text-secondary py-4">Chưa có dữ liệu đơn hàng.</td></tr>
						<?php else: ?>
							<?php foreach ($recentOrders as $order): ?>
								<?php $meta = donhang_status_meta((string)($order['trangthai'] ?? '')); ?>
								<tr>
									<td class="fw-semibold text-primary">#<?= admin_h((string)($order['id'] ?? 'N/A')) ?></td>
									<td><?= admin_h((string)($order['tenkhachhang'] ?? 'N/A')) ?></td>
									<td><?= admin_h((string)($order['dich_vu'] ?? 'N/A')) ?></td>
									<td><?= admin_h((string)($order['diemden'] ?? 'N/A')) ?></td>
									<td><span class="badge rounded-pill <?= admin_h((string)$meta['badge']) ?>"><?= admin_h((string)$meta['text']) ?></span></td>
									<td><?= admin_h((string)($order['created_date'] ?? $order['ngay_bat_dau_kehoach'] ?? 'N/A')) ?></td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>

	<div class="col-12 col-xl-4">
		<div class="card h-100 dashboard-status-card">
			<div class="card-header bg-white border-0 pb-0">
				<h2 class="h6 fw-bold mb-0">Thống kê trạng thái đơn hàng</h2>
			</div>
			<div class="card-body">
				<?php
				$statusBlocks = [
					['label' => 'Chờ xác nhận', 'key' => 'pending', 'bar' => 'bg-secondary'],
					['label' => 'Đã xác nhận', 'key' => 'confirmed', 'bar' => 'bg-info'],
					['label' => 'Đang thực hiện', 'key' => 'in_progress', 'bar' => 'bg-warning'],
					['label' => 'Hoàn thành', 'key' => 'completed', 'bar' => 'bg-success'],
					['label' => 'Đã hủy', 'key' => 'cancelled', 'bar' => 'bg-danger'],
				];
				?>
				<?php foreach ($statusBlocks as $block): ?>
					<?php
					$value = (int)($statusCounts[$block['key']] ?? 0);
					$width = (int)round(($value / $maxStatus) * 100);
					?>
					<div class="mb-3">
						<div class="d-flex justify-content-between small mb-1">
							<span><?= admin_h($block['label']) ?></span>
							<strong><?= $value ?></strong>
						</div>
						<div class="progress" style="height:8px;">
							<div class="progress-bar <?= admin_h($block['bar']) ?>" role="progressbar" style="width: <?= $width ?>%"></div>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</div>

<?php admin_render_layout_end(); ?>