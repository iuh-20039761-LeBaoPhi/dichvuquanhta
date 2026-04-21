<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_taixe.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_taixe_by_id($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');

admin_render_layout_start('Chi Tiết Tài Xế', 'drivers', $admin);
?>

<div class="d-flex justify-content-between align-items-center mb-3">
	<h2 class="h5 mb-0">Chi tiết tài xế #<?= admin_h((string)$id) ?></h2>
	<a href="quan-ly-tai-xe.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lại</a>
</div>

<?php if ($error !== '' || !is_array($row)): ?>
	<div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy tài xế.') ?></div>
<?php else: ?>
	<?php
	$status = trim((string)($row['trangthai'] ?? ''));
	$badge = match ($status) {
		'pending'   => 'text-bg-warning',
		'active'    => 'text-bg-success',
		'busy'      => 'text-bg-info',
		'offline'   => 'text-bg-secondary',
		'blocked'   => 'text-bg-danger',
		'rejected'  => 'text-bg-danger',
		default     => 'text-bg-dark',
	};

	// Chuyển đổi trạng thái hiển thị
	$statusDisplay = match ($status) {
		'pending'   => 'Chờ duyệt',
		'active'    => 'Hoạt động',
		'busy'      => 'Đang bận',
		'offline'   => 'Ngoại tuyến',
		'blocked'   => 'Đã khóa',
		'rejected'  => 'Bị từ chối',
		default     => $status ?: 'N/A',
	};

	$avatar = trim((string)($row['anh_dai_dien'] ?? ''));
	$licenseFront = trim((string)($row['giay_phep_lai_xe_mat_truoc'] ?? ''));
	$licenseBack = trim((string)($row['giay_phep_lai_xe_mat_sau'] ?? ''));
	$cccdFront = trim((string)($row['cccd_mat_truoc'] ?? ''));
	$cccdBack = trim((string)($row['cccd_mat_sau'] ?? ''));
	?>
	<div class="row g-3">
		<div class="col-12 col-xl-7">
			<div class="card border-0 shadow-sm h-100">
				<div class="card-header bg-white fw-semibold">Thông tin tài xế</div>
				<div class="card-body">
					<div class="row g-3">
						<div class="col-sm-6">
							<small class="text-secondary">Họ tên</small>
							<div class="fw-semibold"><?= admin_h((string)($row['hovaten'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Trạng thái</small>
							<div><span class="badge rounded-pill <?= admin_h($badge) ?>"><?= admin_h($statusDisplay) ?></span></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Email</small>
							<div><?= admin_h((string)($row['email'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Số điện thoại</small>
							<div><?= admin_h((string)($row['sodienthoai'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Số bằng lái</small>
							<div><?= admin_h((string)($row['so_bang_lai'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Hạng bằng lái</small>
							<div><?= admin_h((string)($row['hang_bang_lai'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Ngày sinh</small>
							<div><?= admin_h((string)($row['ngaysinh'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Năm kinh nghiệm</small>
							<div><?= admin_h((string)($row['kinh_nghiem_nam'] ?? '0')) ?> năm</div>
						</div>
						<div class="col-sm-6">
							<small class="text-secondary">Ngày tạo</small>
							<div><?= admin_h((string)($row['created_date'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-12">
							<small class="text-secondary">Địa chỉ</small>
							<div><?= admin_h((string)($row['diachi'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-12">
							<small class="text-secondary">Mô tả kinh nghiệm</small>
							<div><?= admin_h((string)($row['kinh_nghiem_mota'] ?? 'N/A')) ?></div>
						</div>
					</div>

					<?php if ($status !== 'blocked' && $status !== 'rejected'): ?>
						<hr>
						<div class="d-flex flex-wrap gap-2">
							<?php if ($status === 'pending'): ?>
								<form method="post" action="duyet-tai-xe.php">
									<input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
									<input type="hidden" name="return" value="chi-tiet-tai-xe.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>">
									<button type="submit" class="btn btn-success"><i class="bi bi-check2-circle me-1"></i>Duyệt tài xế</button>
								</form>
							<?php endif; ?>
							<?php if ($status === 'active' || $status === 'busy' || $status === 'offline'): ?>
								<form method="post" action="khoa-tai-xe.php" onsubmit="return confirm('Bạn có chắc chắn muốn khóa tài khoản tài xế này?');">
									<input type="hidden" name="id" value="<?= admin_h((string)($row['id'] ?? '')) ?>">
									<input type="hidden" name="return" value="chi-tiet-tai-xe.php?id=<?= urlencode((string)($row['id'] ?? '')) ?>">
									<button type="submit" class="btn btn-outline-danger"><i class="bi bi-lock me-1"></i>Khóa tài khoản</button>
								</form>
							<?php endif; ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-5">
			<div class="card border-0 shadow-sm mb-3">
				<div class="card-header bg-white fw-semibold">Ảnh đại diện</div>
				<div class="card-body text-center">
					<?php if ($avatar !== ''): ?>
						<img src="../<?= admin_h(ltrim($avatar, '/')) ?>" class="img-fluid rounded" alt="Ảnh đại diện tài xế" style="max-height: 200px;">
					<?php else: ?>
						<div class="text-secondary">Chưa có ảnh đại diện.</div>
					<?php endif; ?>
				</div>
			</div>

			<div class="card border-0 shadow-sm mb-3">
				<div class="card-header bg-white fw-semibold">Ảnh bằng lái xe</div>
				<div class="card-body">
					<div class="mb-3">
						<div class="small text-secondary mb-1">Mặt trước</div>
						<?php if ($licenseFront !== ''): ?>
							<img src="../<?= admin_h(ltrim($licenseFront, '/')) ?>" class="img-fluid rounded" alt="Bằng lái mặt trước">
						<?php else: ?>
							<div class="text-secondary">Chưa có ảnh mặt trước bằng lái.</div>
						<?php endif; ?>
					</div>
					<div>
						<div class="small text-secondary mb-1">Mặt sau</div>
						<?php if ($licenseBack !== ''): ?>
							<img src="../<?= admin_h(ltrim($licenseBack, '/')) ?>" class="img-fluid rounded" alt="Bằng lái mặt sau">
						<?php else: ?>
							<div class="text-secondary">Chưa có ảnh mặt sau bằng lái.</div>
						<?php endif; ?>
					</div>
				</div>
			</div>

			<div class="card border-0 shadow-sm">
				<div class="card-header bg-white fw-semibold">Ảnh CCCD</div>
				<div class="card-body">
					<div class="mb-3">
						<div class="small text-secondary mb-1">Mặt trước</div>
						<?php if ($cccdFront !== ''): ?>
							<img src="../<?= admin_h(ltrim($cccdFront, '/')) ?>" class="img-fluid rounded" alt="CCCD mặt trước">
						<?php else: ?>
							<div class="text-secondary">Chưa có ảnh mặt trước CCCD.</div>
						<?php endif; ?>
					</div>
					<div>
						<div class="small text-secondary mb-1">Mặt sau</div>
						<?php if ($cccdBack !== ''): ?>
							<img src="../<?= admin_h(ltrim($cccdBack, '/')) ?>" class="img-fluid rounded" alt="CCCD mặt sau">
						<?php else: ?>
							<div class="text-secondary">Chưa có ảnh mặt sau CCCD.</div>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
	</div>
<?php endif; ?>

<?php admin_render_layout_end(); ?>