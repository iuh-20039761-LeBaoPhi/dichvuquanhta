<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_nhanvien.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$admin = admin_require_login();

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? 'all'));

$data = get_nhanvien_data();
$rows = $data['rows'] ?? [];
$error = (string)($data['error'] ?? '');

$filtered = array_values(array_filter($rows, static function (array $row) use ($q, $statusFilter): bool {
	$status = trim((string)($row['trangthai'] ?? ''));
	if ($statusFilter !== 'all' && $status !== $statusFilter) {
		return false;
	}

	if ($q !== '') {
		$target = strtolower(implode(' ', [
			(string)($row['id'] ?? ''),
			(string)($row['hovaten'] ?? ''),
			(string)($row['email'] ?? ''),
			(string)($row['sodienthoai'] ?? ''),
			(string)($row['trangthai'] ?? ''),
		]));
		return strpos($target, strtolower($q)) !== false;
	}

	return true;
}));

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
]);

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

admin_render_layout_start('Quan Ly nhà cung cấp', 'employees', $admin);
?>

<?php if ($flashMsg !== ''): ?>
	<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<div class="card border-0 shadow-sm mb-3">
	<div class="card-body">
		<form method="get" class="row g-2 align-items-end">
			<div class="col-12 col-md-5 col-lg-4">
				<label class="form-label mb-1">Tim kiem</label>
				<input type="text" class="form-control" name="q" value="<?= admin_h($q) ?>" placeholder="Ten, email, SDT...">
			</div>
			<div class="col-6 col-md-4 col-lg-3">
				<label class="form-label mb-1">Trang thai</label>
				<select class="form-select" name="status">
					<option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tat ca</option>
					<option value="pending" <?= $statusFilter === 'pending' ? 'selected' : '' ?>>Cho duyet</option>
					<option value="active" <?= $statusFilter === 'active' ? 'selected' : '' ?>>Da duyet</option>
					<option value="blocked" <?= $statusFilter === 'blocked' ? 'selected' : '' ?>>Bi khoa</option>
					<option value="rejected" <?= $statusFilter === 'rejected' ? 'selected' : '' ?>>Tu choi</option>
				</select>
			</div>
			<div class="col-6 col-md-3 col-lg-2 d-grid">
				<button class="btn btn-success" type="submit"><i class="bi bi-funnel me-1"></i>Loc</button>
			</div>
			<div class="col-12 col-lg-3 text-lg-end text-secondary small">
				Tong: <strong><?= (int)$totalFiltered ?></strong> nhà cung cấp
			</div>
		</form>
	</div>
</div>

<div class="card border-0 shadow-sm">
	<div class="card-body">
		<?php if ($error !== ''): ?>
			<div class="alert alert-warning mb-0"><?= admin_h($error) ?></div>
		<?php else: ?>
			<div class="table-responsive">
				<table class="table table-hover align-middle mb-0">
					<thead class="table-light">
					<tr>
						<th>ID</th>
						<th>Ho ten</th>
						<th>Email</th>
						<th>So dien thoai</th>
						<th>Trang thai</th>
						<th>Ngay tao</th>
						<th class="text-end">Hanh dong</th>
					</tr>
					</thead>
					<tbody>
					<?php if (!$paginatedRows): ?>
						<tr><td colspan="7" class="text-center py-4 text-secondary">Khong co du lieu nhà cung cấp.</td></tr>
					<?php else: ?>
						<?php foreach ($paginatedRows as $row): ?>
							<?php
							$status = trim((string)($row['trangthai'] ?? ''));
							$badge = match ($status) {
								'pending' => 'text-bg-warning',
								'active' => 'text-bg-success',
								'blocked' => 'text-bg-secondary',
								'rejected' => 'text-bg-danger',
								default => 'text-bg-dark',
							};
							?>
							<tr>
								<td class="fw-semibold text-primary">#<?= admin_h((string)($row['id'] ?? '')) ?></td>
								<td>
									<div class="fw-semibold"><?= admin_h((string)($row['hovaten'] ?? 'N/A')) ?></div>
									<div class="small text-secondary"><?= admin_h((string)($row['diachi'] ?? '')) ?></div>
								</td>
								<td><?= admin_h((string)($row['email'] ?? 'N/A')) ?></td>
								<td><?= admin_h((string)($row['sodienthoai'] ?? 'N/A')) ?></td>
								<td><span class="badge rounded-pill <?= admin_h($badge) ?>"><?= admin_h($status !== '' ? $status : 'N/A') ?></span></td>
								<td><?= admin_h((string)($row['created_date'] ?? 'N/A')) ?></td>
								<td class="text-end">
									<div class="d-inline-flex gap-1 flex-wrap justify-content-end">
										<a href="chi-tiet-nhan-vien.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>" class="btn btn-sm btn-outline-primary">
											<i class="bi bi-eye me-1"></i>Chi tiet
										</a>
										<?php if ($status === 'pending'): ?>
											<form method="post" action="duyet-nhan-vien.php" class="d-inline">
												<input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
												<input type="hidden" name="return" value="quan-ly-nhan-vien.php">
												<button type="submit" class="btn btn-sm btn-success"><i class="bi bi-check2-circle me-1"></i>Duyet</button>
											</form>
										<?php endif; ?>
										<?php if ($status !== 'blocked'): ?>
											<form method="post" action="khoa-nhan-vien.php" class="d-inline" onsubmit="return confirm('Ban co chac chan muon khoa tai khoan nay?');">
												<input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
												<input type="hidden" name="return" value="quan-ly-nhan-vien.php">
												<button type="submit" class="btn btn-sm btn-outline-danger"><i class="bi bi-lock me-1"></i>Khoa</button>
											</form>
										<?php endif; ?>
									</div>
								</td>
							</tr>
						<?php endforeach; ?>
					<?php endif; ?>
					</tbody>
				</table>
			</div>

			<?php if ($totalFiltered > 0): ?>
				<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
					<div class="small text-secondary">
						Hien thi <?= (int)($offset + 1) ?> - <?= (int)min($offset + $perPage, $totalFiltered) ?> / <?= (int)$totalFiltered ?> nhà cung cấp
					</div>
					<?php if ($totalPages > 1): ?>
						<nav aria-label="Phan trang nhà cung cấp">
							<ul class="pagination pagination-sm mb-0">
								<li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
									<a class="page-link" href="<?= admin_h($buildPageUrl(max(1, $page - 1))) ?>">Truoc</a>
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
