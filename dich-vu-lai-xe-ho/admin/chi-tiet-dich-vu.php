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

admin_render_layout_start('Chi Tiết Dịch Vụ Thuê Tài Xế', 'services', $admin);
?>

<style>
	.admin-main,
	.admin-main > main {
		background: #ffffff !important;
	}
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
	<h2 class="h4 mb-0 fw-bold">Chi tiết dịch vụ #<?= (int)$id ?></h2>
	<div class="d-inline-flex gap-2">
		<a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lại</a>
		<?php if (is_array($row)): ?>
			<a href="sua-dich-vu.php?id=<?= urlencode((string)$id) ?>" class="btn btn-warning btn-sm"><i class="bi bi-pencil-square me-1"></i>Sửa dịch vụ</a>
		<?php endif; ?>
	</div>
</div>

<?php if ($flashMsg !== ''): ?>
	<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<?php if ($error !== '' || !is_array($row)): ?>
	<div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy dịch vụ.') ?></div>
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
				<div class="card-header bg-white fw-semibold">Thông tin cơ bản</div>
				<div class="card-body">
					<div class="mb-3">
						<small class="text-secondary">Tên dịch vụ</small>
						<div class="fw-semibold"><?= admin_h((string)($row['name'] ?? 'N/A')) ?></div>
					</div>
					<div class="mb-3">
						<small class="text-secondary">Alt hình ảnh</small>
						<div><?= admin_h((string)($row['alt'] ?? '')) ?></div>
					</div>
					<div class="mb-3">
						<small class="text-secondary">Đường dẫn hình</small>
						<div><?= admin_h($image !== '' ? $image : 'Chưa có') ?></div>
					</div>
					<div>
						<small class="text-secondary">Mô tả</small>
						<div class="mt-1" style="white-space: pre-line;"><?= admin_h((string)($row['description'] ?? '')) ?></div>
					</div>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-5">
			<div class="card border-0 shadow-sm mb-3">
				<div class="card-header bg-white fw-semibold">Hình ảnh dịch vụ</div>
				<div class="card-body text-center">
					<?php if ($imageSrc !== ''): ?>
						<img src="<?= admin_h($imageSrc) ?>" class="img-fluid rounded" alt="<?= admin_h((string)($row['alt'] ?? 'Dịch vụ thuê tài xế')) ?>">
					<?php else: ?>
						<div class="text-secondary">Chưa có hình ảnh.</div>
					<?php endif; ?>
				</div>
			</div>

			<div class="card border-0 shadow-sm">
				<div class="card-header bg-white fw-semibold">Dịch vụ bao gồm</div>
				<div class="card-body">
					<?php if (!(is_array($row['includes'] ?? null) && $row['includes'])): ?>
						<div class="text-secondary">Chưa có danh sách bao gồm.</div>
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
				<div class="card-header bg-white fw-semibold">Bảng giá (pricing)</div>
				<div class="card-body">
					<?php if (!(is_array($row['pricing'] ?? null) && $row['pricing'])): ?>
						<div class="text-secondary">Chưa có bảng giá.</div>
					<?php else: ?>
						<div class="table-responsive">
							<table class="table table-hover align-middle mb-0">
								<thead class="table-light">
									<tr>
										<th>Gói dịch vụ</th>
										<th>Giá (VNĐ)</th>
										<th>Số giờ</th>
										<th>Loại</th>
									</tr>
								</thead>
								<tbody>
								<?php foreach (($row['pricing'] ?? []) as $pricing): ?>
									<tr>
										<td><?= admin_h((string)($pricing['label'] ?? '')) ?></td>
										<td><?= number_format((float)($pricing['value'] ?? 0), 0, ',', '.') ?> đ</td>
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