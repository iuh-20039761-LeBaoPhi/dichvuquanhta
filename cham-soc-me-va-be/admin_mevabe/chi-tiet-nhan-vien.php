<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_nhanvien.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_nhanvien_by_id($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');

admin_render_layout_start('Chi Tiet Nhan Vien', 'employees', $admin);
?>

<div class="d-flex justify-content-between align-items-center mb-3">
	<h2 class="h5 mb-0">Chi tiet nhan vien #<?= admin_h((string)$id) ?></h2>
	<a href="quan-ly-nhan-vien.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lai</a>
</div>

<?php if ($error !== '' || !is_array($row)): ?>
	<div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Khong tim thay nhan vien.') ?></div>
<?php else: ?>
	<?php
	$meta = nhanvien_status_meta((string)($row['trangthai'] ?? ''));
	$avatar = trim((string)($row['anh_dai_dien'] ?? ''));
	$front = trim((string)($row['cccd_mat_truoc'] ?? ''));
	$back = trim((string)($row['cccd_mat_sau'] ?? ''));
	?>
	<div class="row g-3">
		<div class="col-12 col-xl-7">
			<div class="card border-0 shadow-sm h-100">
				<div class="card-header bg-white fw-semibold">Thong tin nhan vien</div>
				<div class="card-body">
					<div class="row g-3">
						<div class="col-sm-6"><small class="text-secondary">Ho ten</small><div class="fw-semibold"><?= admin_h((string)($row['hovaten'] ?? 'N/A')) ?></div></div>
						<div class="col-sm-6"><small class="text-secondary">Trang thai</small><div><span class="badge rounded-pill <?= admin_h((string)$meta['badge']) ?>"><?= admin_h((string)$meta['text']) ?></span></div></div>
						<div class="col-sm-6"><small class="text-secondary">Email</small><div><?= admin_h((string)($row['email'] ?? 'N/A')) ?></div></div>
						<div class="col-sm-6"><small class="text-secondary">So dien thoai</small><div><?= admin_h((string)($row['sodienthoai'] ?? 'N/A')) ?></div></div>
						<div class="col-sm-6"><small class="text-secondary">Ngay sinh</small><div><?= admin_h((string)($row['ngaysinh'] ?? 'N/A')) ?></div></div>
						<div class="col-sm-6"><small class="text-secondary">Ngay tao</small><div><?= admin_h((string)($row['created_date'] ?? 'N/A')) ?></div></div>
						<div class="col-12"><small class="text-secondary">Dia chi</small><div><?= admin_h((string)($row['diachi'] ?? 'N/A')) ?></div></div>
						<div class="col-12"><small class="text-secondary">Mo ta kinh nghiem</small><div><?= admin_h((string)($row['kinh_nghiem'] ?? 'N/A')) ?></div></div>
					</div>

					<?php if (($meta['key'] ?? '') !== 'blocked'): ?>
						<hr>
						<div class="d-flex flex-wrap gap-2">
							<?php if (($meta['key'] ?? '') === 'pending'): ?>
								<form method="post" action="duyet-nhan-vien.php">
									<input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
									<input type="hidden" name="return" value="chi-tiet-nhan-vien.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>">
									<button type="submit" class="btn btn-success"><i class="bi bi-check2-circle me-1"></i>Duyet tai khoan nhan vien</button>
								</form>
							<?php endif; ?>

							<?php if (($meta['key'] ?? '') !== 'blocked'): ?>
								<form method="post" action="khoa-nhan-vien.php" onsubmit="return confirm('Ban co chac chan muon khoa tai khoan nay?');">
									<input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
									<input type="hidden" name="return" value="chi-tiet-nhan-vien.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>">
									<button type="submit" class="btn btn-outline-danger"><i class="bi bi-lock me-1"></i>Khoa tai khoan</button>
								</form>
							<?php endif; ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-5">
			<div class="card border-0 shadow-sm mb-3">
				<div class="card-header bg-white fw-semibold">Anh dai dien</div>
				<div class="card-body text-center">
					<?php if ($avatar !== ''): ?>
						<img src="../<?= admin_h(ltrim($avatar, '/')) ?>" class="img-fluid rounded" alt="anh dai dien">
					<?php else: ?>
						<div class="text-secondary">Chua co anh dai dien.</div>
					<?php endif; ?>
				</div>
			</div>
			<div class="card border-0 shadow-sm">
				<div class="card-header bg-white fw-semibold">Anh CCCD</div>
				<div class="card-body">
					<div class="mb-3">
						<div class="small text-secondary mb-1">Mat truoc</div>
						<?php if ($front !== ''): ?>
							<img src="../<?= admin_h(ltrim($front, '/')) ?>" class="img-fluid rounded" alt="cccd mat truoc">
						<?php else: ?>
							<div class="text-secondary">Chua co anh mat truoc.</div>
						<?php endif; ?>
					</div>
					<div>
						<div class="small text-secondary mb-1">Mat sau</div>
						<?php if ($back !== ''): ?>
							<img src="../<?= admin_h(ltrim($back, '/')) ?>" class="img-fluid rounded" alt="cccd mat sau">
						<?php else: ?>
							<div class="text-secondary">Chua co anh mat sau.</div>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
	</div>
<?php endif; ?>

<?php admin_render_layout_end(); ?>
