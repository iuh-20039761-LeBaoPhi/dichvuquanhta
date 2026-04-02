<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';

$admin = admin_require_login();

$q = trim((string)($_GET['q'] ?? ''));

$data = get_dichvu_data();
$rows = $data['rows'] ?? [];
$error = (string)($data['error'] ?? '');

$filtered = array_values(array_filter($rows, static function (array $row) use ($q): bool {
	if ($q === '') {
		return true;
	}

	$pricingText = implode(' ', array_map(static function (array $p): string {
		return trim((string)($p['label'] ?? '')) . ' ' . trim((string)($p['type'] ?? ''));
	}, $row['pricing'] ?? []));

	$target = strtolower(implode(' ', [
		(string)($row['id'] ?? ''),
		(string)($row['name'] ?? ''),
		(string)($row['alt'] ?? ''),
		(string)($row['description'] ?? ''),
		implode(' ', $row['includes'] ?? []),
		$pricingText,
	]));

	return strpos($target, strtolower($q)) !== false;
}));

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

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

admin_render_layout_start('Quan Ly Dich Vu', 'services', $admin);
?>

<style>
	.admin-main,
	.admin-main > main {
		background: #ffffff !important;
	}

	.service-page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 14px;
	}
</style>

<div class="service-page-header">
	<h2 class="h4 mb-0 fw-bold">Quan ly dich vu</h2>
	<a href="them-dich-vu.php" class="btn btn-primary"><i class="bi bi-plus-circle me-1"></i>Them dich vu</a>
</div>

<?php if ($flashMsg !== ''): ?>
	<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<div class="card border-0 shadow-sm mb-3">
	<div class="card-body">
		<form method="get" class="row g-2 align-items-end">
			<div class="col-12 col-md-7 col-lg-8">
				<label class="form-label mb-1">Tim kiem dich vu</label>
				<input type="text" class="form-control" name="q" value="<?= admin_h($q) ?>" placeholder="Ten dich vu, mo ta, bang gia...">
			</div>
			<div class="col-6 col-md-3 col-lg-2 d-grid">
				<button class="btn btn-success" type="submit"><i class="bi bi-search me-1"></i>Tim</button>
			</div>
			<div class="col-6 col-md-2 col-lg-2 text-md-end text-secondary small">
				Tong: <strong><?= (int)count($filtered) ?></strong>
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
						<th>Ten dich vu</th>
						<th>Mo ta ngan</th>
						<th>So muc bao gom</th>
						<th>So goi gia</th>
						<th class="text-end">Hanh dong</th>
					</tr>
					</thead>
					<tbody>
					<?php if (!$filtered): ?>
						<tr><td colspan="6" class="text-center py-4 text-secondary">Khong co dich vu phu hop.</td></tr>
					<?php else: ?>
						<?php foreach ($filtered as $row): ?>
							<tr>
								<td class="fw-semibold text-primary">#<?= (int)($row['id'] ?? 0) ?></td>
								<td>
									<div class="fw-semibold"><?= admin_h((string)($row['name'] ?? 'N/A')) ?></div>
									<div class="small text-secondary"><?= admin_h((string)($row['alt'] ?? '')) ?></div>
								</td>
								<td><?= admin_h($truncate((string)($row['description'] ?? ''))) ?></td>
								<td><?= (int)count($row['includes'] ?? []) ?></td>
								<td><?= (int)count($row['pricing'] ?? []) ?></td>
								<td class="text-end">
									<div class="d-inline-flex gap-1 flex-wrap justify-content-end">
										<a href="chi-tiet-dich-vu.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>" class="btn btn-sm btn-outline-primary">
											<i class="bi bi-eye me-1"></i>Chi tiet
										</a>
										<a href="sua-dich-vu.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>" class="btn btn-sm btn-outline-warning">
											<i class="bi bi-pencil-square me-1"></i>Sua
										</a>
										<form method="post" action="xu-ly-xoa-dich-vu.php" class="d-inline" onsubmit="return confirm('Ban co chac chan muon xoa dich vu nay?');">
											<input type="hidden" name="id" value="<?= (int)($row['id'] ?? 0) ?>">
											<input type="hidden" name="q" value="<?= admin_h($q) ?>">
											<button type="submit" class="btn btn-sm btn-outline-danger">
												<i class="bi bi-trash me-1"></i>Xoa
											</button>
										</form>
									</div>
								</td>
							</tr>
						<?php endforeach; ?>
					<?php endif; ?>
					</tbody>
				</table>
			</div>
		<?php endif; ?>
	</div>
</div>

<?php admin_render_layout_end(); ?>
