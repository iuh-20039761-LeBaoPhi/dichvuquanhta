<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';
require_once __DIR__ . '/xu-ly-phan-trang.php';

$admin = admin_require_login();

$q = trim((string)($_GET['q'] ?? ''));
$statusFilter = trim((string)($_GET['status'] ?? 'all'));
$dateFrom = trim((string)($_GET['date_from'] ?? ''));
$dateTo = trim((string)($_GET['date_to'] ?? ''));

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

$data = get_hoadon_list_view_data($q, $statusFilter, $dateFrom, $dateTo);
$filtered = $data['items'] ?? [];
$error = (string)($data['error'] ?? '');

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

admin_render_layout_start('Quan Ly Don Hang', 'orders', $admin);
?>

<div class="card border-0 shadow-sm mb-3">
	<div class="card-body">
		<form method="get" class="row g-2 align-items-end">
			<div class="col-12 col-md-4 col-lg-3">
				<label class="form-label mb-1">Tim kiem</label>
				<input type="text" class="form-control" name="q" value="<?= admin_h($q) ?>" placeholder="Ma don, ten KH, SDT...">
			</div>
			<div class="col-6 col-md-3 col-lg-2">
				<label class="form-label mb-1">Trang thai</label>
				<select class="form-select" name="status">
					<option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>Tat ca</option>
					<option value="pending" <?= $statusFilter === 'pending' ? 'selected' : '' ?>>Cho xac nhan</option>
					<option value="confirmed" <?= $statusFilter === 'confirmed' ? 'selected' : '' ?>>Da xac nhan</option>
					<option value="in_progress" <?= $statusFilter === 'in_progress' ? 'selected' : '' ?>>Dang thuc hien</option>
					<option value="completed" <?= $statusFilter === 'completed' ? 'selected' : '' ?>>Hoan thanh</option>
					<option value="cancelled" <?= $statusFilter === 'cancelled' ? 'selected' : '' ?>>Da huy</option>
				</select>
			</div>
			<div class="col-6 col-md-2 col-lg-2">
				<label class="form-label mb-1">Tu ngay</label>
				<input type="date" class="form-control" name="date_from" value="<?= admin_h($dateFrom) ?>">
			</div>
			<div class="col-6 col-md-2 col-lg-2">
				<label class="form-label mb-1">Den ngay</label>
				<input type="date" class="form-control" name="date_to" value="<?= admin_h($dateTo) ?>">
			</div>
			<div class="col-6 col-md-1 col-lg-1 d-grid">
				<button class="btn btn-success" type="submit"><i class="bi bi-funnel me-1"></i>Loc</button>
			</div>
			<div class="col-12 col-lg-2 text-lg-end text-secondary small">
				Tong: <strong><?= (int)$totalFiltered ?></strong> don hang
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
						<th>Ma don</th>
						<th>Khach hang</th>
						<th>Dich vu</th>
						<th>Tong tien</th>
						<th>Trang thai</th>
						<th>Ngay dat</th>
						<th class="text-end">Hanh dong</th>
					</tr>
					</thead>
					<tbody>
					<?php if (!$paginatedRows): ?>
						<tr><td colspan="7" class="text-center py-4 text-secondary">Khong co hoa don phu hop.</td></tr>
					<?php else: ?>
						<?php foreach ($paginatedRows as $row): ?>
							<?php $meta = is_array($row['statusMeta'] ?? null) ? $row['statusMeta'] : hoadon_status_meta(''); ?>
							<tr>
								<td class="fw-semibold text-primary">#<?= admin_h((string)($row['id'] ?? '')) ?></td>
								<td>
									<div class="fw-semibold"><?= admin_h((string)($row['customerName'] ?? 'N/A')) ?></div>
									<div class="small text-secondary"><?= admin_h((string)($row['customerPhone'] ?? '')) ?></div>
								</td>
								<td><?= admin_h((string)($row['serviceName'] ?? 'N/A')) ?></td>
								<td><?= admin_h((string)($row['priceText'] ?? '0')) ?></td>
								<td><span class="badge rounded-pill <?= admin_h((string)$meta['badge']) ?>"><?= admin_h((string)$meta['text']) ?></span></td>
								<td><?= admin_h((string)($row['bookedAtText'] ?? 'N/A')) ?></td>
								<td class="text-end">
									<a href="chi-tiet-hoa-don.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>" class="btn btn-sm btn-outline-primary">
										<i class="bi bi-eye me-1"></i>Chi tiet
									</a>
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
						Hien thi <?= (int)($offset + 1) ?> - <?= (int)min($offset + $perPage, $totalFiltered) ?> / <?= (int)$totalFiltered ?> don hang
					</div>
					<?php if ($totalPages > 1): ?>
						<nav aria-label="Phan trang hoa don">
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
