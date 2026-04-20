<?php

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';

$admin = admin_require_login();

$q = trim((string) ($_GET['q'] ?? ''));

$data = get_dichvu_data();
$rows = $data['rows'] ?? [];
$error = (string) ($data['error'] ?? '');

$filtered = array_values(array_filter($rows, static function (array $row) use ($q): bool {
	if ($q === '') {
		return true;
	}

	$pricingText = implode(' ', array_map(static function (array $p): string {
		return trim((string) ($p['label'] ?? '')) . ' ' . trim((string) ($p['type'] ?? ''));
	}, $row['pricing'] ?? []));

	$target = strtolower(implode(' ', [
		(string) ($row['id'] ?? ''),
		(string) ($row['name'] ?? ''),
		(string) ($row['alt'] ?? ''),
		(string) ($row['description'] ?? ''),
		implode(' ', $row['includes'] ?? []),
		$pricingText,
	]));

	return strpos($target, strtolower($q)) !== false;
}));

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

$truncate = static function (string $text, int $limit = 120): string {
	if ($text === '') {
		return '';
	}

	if (function_exists('mb_strlen') && function_exists('mb_substr')) {
		if (mb_strlen($text) <= $limit) {
			return $text;
		}
		return rtrim(mb_substr($text, 0, $limit)) . '...';
	}

	if (strlen($text) <= $limit) {
		return $text;
	}

	return rtrim(substr($text, 0, $limit)) . '...';
};

admin_render_layout_start('Quản Lý Dịch Vụ', 'services', $admin);
?>

<style>
	.admin-main,
	.admin-main>main {
		background: #fff5f7 !important;
	}

	.service-page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 14px;
	}

	table th {
		white-space: nowrap !important;
		vertical-align: middle !important;
	}

	table td {
		vertical-align: middle !important;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		align-items: center;
		flex-wrap: nowrap;
	}

	.action-buttons .btn {
		min-width: 36px;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Mobile Service Card Styles */
	@media (max-width: 767.98px) {
		.service-list-container {
			background: transparent !important;
			padding: 0 !important;
			box-shadow: none !important;
			border: none !important;
		}

		.service-list-container>.card-body {
			padding: 0 !important;
		}

		.service-item-mobile {
			display: flex;
			align-items: center;
			padding: 12px;
			background: #fff;
			border-radius: 12px;
			margin-bottom: 12px;
			position: relative;
			transition: transform 0.2s, box-shadow 0.2s;
			cursor: pointer;
			text-decoration: none;
			color: inherit;
			border: 1px solid #fce7f3;
		}

		.service-item-mobile:active {
			transform: scale(0.98);
			background-color: #fff5f7;
		}

		.service-img-mobile {
			width: 60px;
			height: 60px;
			object-fit: cover;
			border-radius: 10px;
			margin-right: 15px;
			border: 1px solid #fce7f3;
		}

		.service-info-mobile {
			flex: 1;
		}

		.service-info-mobile h6 {
			font-weight: 700;
			font-size: 1rem;
			margin-bottom: 4px;
			color: #4a044e;
		}

		.service-jobs-mobile {
			font-size: 0.85rem;
			color: #be185d;
		}

		.btn-edit-mobile {
			position: absolute;
			bottom: 10px;
			right: 10px;
			width: 32px;
			height: 32px;
			background: #fff5f7;
			color: #ec4899;
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid #fce7f3;
			box-shadow: 0 2px 4px rgba(131, 24, 67, 0.05);
		}

		.btn-edit-mobile i {
			font-size: 0.9rem;
		}
	}
</style>

<div class="service-page-header">
	<h2 class="h4 mb-0 fw-bold">Quản lý dịch vụ</h2>
	<a href="them-dich-vu.php" class="btn btn-primary"><i class="bi bi-plus-circle me-1"></i>Thêm dịch vụ</a>
</div>

<?php if ($flashMsg !== ''): ?>
	<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<div class="card border-0 shadow-sm mb-3">
	<div class="card-body">
		<form method="get" class="row g-2 align-items-end">
			<div class="col-12 col-md-7 col-lg-8">
				<label class="form-label mb-1">Tìm kiếm dịch vụ</label>
				<input type="text" class="form-control" name="q" value="<?= admin_h($q) ?>"
					placeholder="Tên dịch vụ, mô tả, bảng giá...">
			</div>
			<div class="col-6 col-md-3 col-lg-2 d-grid">
				<button class="btn btn-success" type="submit"><i class="bi bi-search me-1"></i>Tìm</button>
			</div>
			<div class="col-6 col-md-2 col-lg-2 text-md-end text-secondary small">
				Tổng: <strong><?= (int) count($filtered) ?></strong>
			</div>
		</form>
	</div>
</div>

<div class="card border-0 shadow-sm service-list-container">
	<div class="card-body">
		<?php if ($error !== ''): ?>
			<div class="alert alert-warning mb-0"><?= admin_h($error) ?></div>
		<?php else: ?>
			<?php if (!$filtered): ?>
				<div class="text-center py-4 text-secondary">Không có dịch vụ phù hợp.</div>
			<?php else: ?>
				<!-- Desktop View -->
				<div class="table-responsive d-none d-md-block">
					<table class="table table-hover align-middle mb-0">
						<thead class="table-light">
							<tr>
								<th>ID</th>
								<th>Hình ảnh</th>
								<th>Tên dịch vụ</th>
								<th>Mô tả</th>
								<th>Công việc</th>
								<th class="text-end">Hành động</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ($filtered as $row): ?>
								<tr>
									<td class="fw-semibold text-primary">#<?= (int) ($row['id'] ?? 0) ?></td>
									<td>
										<?php if (!empty($row['image'])): ?>
											<iframe src="https://drive.google.com/file/d/<?= urlencode($row['image']) ?>/preview"
												style="width:48px;height:48px;border:none;border-radius:8px;pointer-events:none;"
												scrolling="no" loading="lazy"></iframe>
										<?php else: ?>
											<span class="text-secondary small">(Không có ảnh)</span>
										<?php endif; ?>
									</td>
									<td>
										<div class="fw-semibold"><?= admin_h((string) ($row['name'] ?? 'N/A')) ?></div>
									</td>
									<td><?= admin_h($truncate((string) ($row['description'] ?? ''))) ?></td>
									<td><?= (int) count($row['includes'] ?? []) ?></td>
									<td class="text-end">
										<div class="action-buttons">
											<a href="chi-tiet-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>"
												class="btn btn-sm btn-outline-primary" title="Xem chi tiết">
												<i class="bi bi-eye"></i>
											</a>
											<a href="sua-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>"
												class="btn btn-sm btn-outline-warning" title="Sửa dịch vụ">
												<i class="bi bi-pencil-square"></i>
											</a>
											<form method="post" action="xu-ly-xoa-dich-vu.php" class="d-inline"
												onsubmit="return confirm('Bạn có chắc chắn muốn xóa dịch vụ này?');"
												style="margin:0;">
												<input type="hidden" name="id" value="<?= (int) ($row['id'] ?? 0) ?>">
												<input type="hidden" name="q" value="<?= admin_h($q) ?>">
												<button type="submit" class="btn btn-sm btn-outline-danger" title="Xóa dịch vụ">
													<i class="bi bi-trash"></i>
												</button>
											</form>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>

				<!-- Mobile View -->
				<div class="d-md-none">
					<?php foreach ($filtered as $row): ?>
						<div class="service-item-mobile shadow-sm"
							onclick="location.href='chi-tiet-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>'">
							<?php if (!empty($row['image'])): ?>
								<iframe src="https://drive.google.com/file/d/<?= urlencode($row['image']) ?>/preview"
									class="service-img-mobile" style="border:none;pointer-events:none;" scrolling="no"
									loading="lazy"></iframe>
							<?php else: ?>
								<div
									class="service-img-mobile d-flex align-items-center justify-content-center bg-light text-secondary">
									<i class="bi bi-image" style="font-size: 1.5rem;"></i>
								</div>
							<?php endif; ?>

							<div class="service-info-mobile">
								<h6 class="mb-0"><?= admin_h((string) ($row['name'] ?? 'N/A')) ?></h6>
								<div class="service-jobs-mobile">Số công việc: <?= (int) count($row['includes'] ?? []) ?></div>
							</div>

							<a href="sua-dich-vu.php?id=<?= urlencode((string) ($row['id'] ?? '')) ?>" class="btn-edit-mobile"
								title="Sửa dịch vụ" onclick="event.stopPropagation();">
								<i class="bi bi-pencil-square"></i>
							</a>
						</div>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		<?php endif; ?>
	</div>
</div>

<?php admin_render_layout_end(); ?>