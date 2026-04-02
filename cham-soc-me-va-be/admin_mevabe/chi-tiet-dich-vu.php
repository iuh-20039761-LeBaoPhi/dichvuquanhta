<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_dichvu_by_id($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

admin_render_layout_start('Chi Tiet Dich Vu', 'services', $admin);
?>

<style>
	.admin-main,
	.admin-main > main {
		background: #ffffff !important;
	}
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
	<h2 class="h4 mb-0 fw-bold">Chi tiet dich vu #<?= (int)$id ?></h2>
	<div class="d-inline-flex gap-2">
		<a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lai</a>
		<?php if (is_array($row)): ?>
			<a href="sua-dich-vu.php?id=<?= urlencode((string)$id) ?>" class="btn btn-warning btn-sm"><i class="bi bi-pencil-square me-1"></i>Sua dich vu</a>
		<?php endif; ?>
	</div>
</div>

<?php if ($flashMsg !== ''): ?>
	<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<?php if ($error !== '' || !is_array($row)): ?>
	<div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Khong tim thay dich vu.') ?></div>
<?php else: ?>
	<?php
	$image = trim((string)($row['image'] ?? ''));
	$imageSrc = $image;
	if ($imageSrc !== '' && !preg_match('/^https?:\/\//i', $imageSrc)) {
		$imageSrc = '../' . ltrim($imageSrc, '/');
	}
	?>
	<div class="row g-3">
		<div class="col-12 col-xl-7">
			<div class="card border-0 shadow-sm h-100">
				<div class="card-header bg-white fw-semibold">Thong tin co ban</div>
				<div class="card-body">
					<div class="mb-3">
						<small class="text-secondary">Ten dich vu</small>
						<div class="fw-semibold"><?= admin_h((string)($row['name'] ?? 'N/A')) ?></div>
					</div>
					<div class="mb-3">
						<small class="text-secondary">Alt hinh anh</small>
						<div><?= admin_h((string)($row['alt'] ?? '')) ?></div>
					</div>
					<div class="mb-3">
						<small class="text-secondary">Duong dan hinh</small>
						<div><?= admin_h($image !== '' ? $image : 'Chua co') ?></div>
					</div>
					<div>
						<small class="text-secondary">Mo ta</small>
						<div class="mt-1" style="white-space: pre-line;"><?= admin_h((string)($row['description'] ?? '')) ?></div>
					</div>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-5">
			<div class="card border-0 shadow-sm mb-3">
				<div class="card-header bg-white fw-semibold">Hinh anh dich vu</div>
				<div class="card-body text-center">
					<?php if ($imageSrc !== ''): ?>
						<img src="<?= admin_h($imageSrc) ?>" class="img-fluid rounded" alt="<?= admin_h((string)($row['alt'] ?? 'Dich vu')) ?>">
					<?php else: ?>
						<div class="text-secondary">Chua co hinh anh.</div>
					<?php endif; ?>
				</div>
			</div>

			<div class="card border-0 shadow-sm">
				<div class="card-header bg-white fw-semibold">Danh sach cong viec bao gom</div>
				<div class="card-body">
					<?php if (!(is_array($row['includes'] ?? null) && $row['includes'])): ?>
						<div class="text-secondary">Chua co danh sach bao gom.</div>
					<?php else: ?>
						<ul class="mb-0 ps-3">
							<?php foreach (($row['includes'] ?? []) as $item): ?>
								<li class="mb-1"><?= admin_h((string)$item) ?></li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<div class="col-12">
			<div class="card border-0 shadow-sm">
				<div class="card-header bg-white fw-semibold">Bang gia (pricing)</div>
				<div class="card-body">
					<?php if (!(is_array($row['pricing'] ?? null) && $row['pricing'])): ?>
						<div class="text-secondary">Chua co bang gia.</div>
					<?php else: ?>
						<div class="table-responsive">
							<table class="table table-hover align-middle mb-0">
								<thead class="table-light">
								<tr>
									<th>Label</th>
									<th>Value</th>
									<th>Hours</th>
									<th>Type</th>
								</tr>
								</thead>
								<tbody>
								<?php foreach (($row['pricing'] ?? []) as $pricing): ?>
									<tr>
										<td><?= admin_h((string)($pricing['label'] ?? '')) ?></td>
										<td><?= number_format((float)($pricing['value'] ?? 0), 0, ',', '.') ?></td>
										<td><?= admin_h((string)($pricing['hours'] ?? '')) ?></td>
										<td><?= admin_h((string)($pricing['type'] ?? '')) ?></td>
									</tr>
								<?php endforeach; ?>
								</tbody>
							</table>
						</div>
					<?php endif; ?>
				</div>
			</div>
		</div>
	</div>
<?php endif; ?>

<?php admin_render_layout_end(); ?>
