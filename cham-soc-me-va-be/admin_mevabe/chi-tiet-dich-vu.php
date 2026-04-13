<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';

$admin = admin_require_login();
$id = (int) ($_GET['id'] ?? 0);

$detail = get_dichvu_by_id($id);
$row = $detail['row'] ?? null;
$error = (string) ($detail['error'] ?? '');

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

admin_render_layout_start('Chi Tiết Dịch Vụ', 'services', $admin);
?>

<style>
	:root {
		--admin-primary: #4361ee;
		--admin-secondary: #8392a5;
		--admin-success: #2ec4b6;
		--admin-warning: #ff9f1c;
		--admin-bg: #f8f9fa;
	}

	.admin-main,
	.admin-main>main {
		background: var(--admin-bg) !important;
	}

	.card {
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		border: 1px solid rgba(0, 0, 0, 0.05) !important;
	}

	.card:hover {
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08) !important;
		z-index: 1;
	}

	.compact-row {
		--bs-gutter-x: 2px;
		--bs-gutter-y: 2px;
	}

	.service-image-container {
		background: #fdfdfd;
		position: relative;
	}

	.service-image-container img {
		transition: transform 0.5s ease;
	}

	.service-image-container:hover img {
		transform: scale(1.05);
	}

	.includes-list .last-mb-0:last-child {
		margin-bottom: 0 !important;
	}

	.custom-table thead th {
		border-top: none;
		letter-spacing: 0.5px;
	}

	.custom-table tbody tr {
		transition: background-color 0.2s;
	}

	.custom-table tbody tr:hover {
		background-color: rgba(67, 97, 238, 0.02);
	}

	.badge {
		font-weight: 500;
	}

	.ls-1 {
		letter-spacing: 1px;
	}
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
	<h2 class="h4 mb-0 fw-bold">Chi tiết dịch vụ #<?= (int) $id ?></h2>
	<div class="d-inline-flex gap-2">
		<a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay
			lại</a>
		<?php if (is_array($row)): ?>
			<a href="sua-dich-vu.php?id=<?= urlencode((string) $id) ?>" class="btn btn-warning btn-sm"><i
					class="bi bi-pencil-square me-1"></i>Sửa dịch vụ</a>
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
	$image = trim((string) ($row['image'] ?? ''));
	$imageSrc = $image;
	if ($imageSrc !== '' && !preg_match('/^https?:\/\//i', $imageSrc)) {
		$imageSrc = '../' . ltrim($imageSrc, '/');
	}
	?>
	<div class="row compact-row">
		<!-- Box 1: Thông tin cơ bản & Ảnh -->
		<div class="col-12 col-lg-7">
			<div class="card border-0 shadow-sm h-100 overflow-hidden" style="border-radius: 4px;">
				<div class="card-header bg-white py-2 border-bottom border-light">
					<div class="d-flex align-items-center">
						<div class="bg-primary bg-opacity-10 p-1 rounded-2 me-2">
							<i class="bi bi-info-circle text-primary fs-6"></i>
						</div>
						<h6 class="mb-0 fw-bold text-dark">Thông tin cơ bản</h6>
					</div>
				</div>
				<div class="card-body p-3">
					<div class="row g-3 mb-3">
						<div class="col-md-4">
							<div class="service-image-container rounded-3 overflow-hidden shadow-sm border">
								<?php if ($imageSrc !== ''): ?>
									<img src="<?= admin_h($imageSrc) ?>" class="img-fluid w-100"
										style="object-fit: cover; aspect-ratio: 1/1;"
										alt="<?= admin_h((string) ($row['alt'] ?? 'Dịch vụ')) ?>">
								<?php else: ?>
									<div class="d-flex align-items-center justify-content-center bg-light text-secondary"
										style="height: 180px;">
										<i class="bi bi-image fs-1 opacity-25"></i>
									</div>
								<?php endif; ?>
							</div>
						</div>
						<div class="col-md-8">
							<div class="mb-2">
								<label class="text-uppercase fw-bold text-black mb-0 ls-1" style="font-size: 0.85rem;">Tên
									dịch vụ</label>
								<h5 class="fw-bold text-primary mb-0 mt-0"><?= admin_h((string) ($row['name'] ?? 'N/A')) ?>
								</h5>
							</div>

							<?php if (trim((string) ($row['alt'] ?? '')) !== ''): ?>
								<div class="mb-2">
									<label class="text-uppercase fw-bold text-black mb-0" style="font-size: 0.85rem;">Chú thích
										hình</label>
									<div class="text-dark fw-medium lh-sm" style="font-size: 0.95rem;">
										<?= admin_h((string) ($row['alt'] ?? '')) ?>
									</div>
								</div>
							<?php endif; ?>

							<?php if ($image !== ''): ?>
								<div class="mb-0">
									<label class="text-uppercase fw-bold text-black mb-0" style="font-size: 0.85rem;">Đường dẫn
										ảnh</label>
									<div class="text-dark bg-light p-1 px-2 rounded border mt-0"
										style="font-size: 0.85rem; border-color: #ced4da !important;"
										title="<?= admin_h($image) ?>">
										<i class="bi bi-link-45deg me-1"></i><?= admin_h($image) ?>
									</div>
								</div>
							<?php endif; ?>
						</div>
					</div>

					<div class="service-description-box p-2 px-3 bg-white border rounded shadow-sm mt-1"
						style="border-left: 3px solid var(--admin-primary) !important;">
						<label class="text-uppercase fw-bold text-black d-block"
							style="font-size: 0.85rem; letter-spacing: 0.5px; margin-bottom: 3px !important;">Mô tả chi tiết
							dịch vụ</label>
						<div class="text-dark" style="margin: 0; line-height: 1.5; font-size: 0.95rem; font-weight: 500;">
							<?= admin_h(ltrim((string) ($row['description'] ?? 'Chưa có mô tả chi tiết.'))) ?>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Box 2: Danh sách công việc -->
		<div class="col-12 col-lg-5">
			<div class="card border-0 shadow-sm h-100" style="border-radius: 4px;">
				<div class="card-header bg-white py-2 border-bottom border-light">
					<div class="d-flex align-items-center">
						<div class="bg-success bg-opacity-10 p-1 rounded-2 me-2">
							<i class="bi bi-list-check text-success fs-6"></i>
						</div>
						<h6 class="mb-0 fw-bold text-dark">Danh sách công việc</h6>
					</div>
				</div>
				<div class="card-body p-3">
					<?php if (!(is_array($row['includes'] ?? null) && $row['includes'])): ?>
						<div class="text-center py-4 bg-light rounded-3 border border-dashed">
							<i class="bi bi-clipboard-x text-muted fs-1 mb-2 d-block"></i>
							<span class="text-secondary">Chưa có danh sách công việc.</span>
						</div>
					<?php else: ?>
						<div class="includes-list">
							<?php foreach (($row['includes'] ?? []) as $item): ?>
								<div class="d-flex align-items-start mb-3 last-mb-0">
									<div class="bg-success rounded-circle p-1 me-3 mt-1"
										style="width: 20px; height: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
										<i class="bi bi-check2 text-white" style="font-size: 12px;"></i>
									</div>
									<div class="text-dark fw-medium"><?= admin_h((string) $item) ?></div>
								</div>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<!-- Box 3: Bảng giá -->
		<div class="col-12">
			<div class="card border-0 shadow-sm" style="border-radius: 4px;">
				<div class="card-header bg-white py-2 border-bottom border-light">
					<div class="d-flex align-items-center">
						<div class="bg-warning bg-opacity-10 p-1 rounded-2 me-2">
							<i class="bi bi-currency-dollar text-warning fs-6"></i>
						</div>
						<h6 class="mb-0 fw-bold text-dark">Bảng giá dịch vụ</h6>
					</div>
				</div>
				<div class="card-body p-0">
					<?php if (!(is_array($row['pricing'] ?? null) && $row['pricing'])): ?>
						<div class="p-4 text-center">
							<div class="bg-light p-4 rounded-3 d-inline-block">
								<i class="bi bi-cash-stack text-muted fs-1 mb-2 d-block"></i>
								<span class="text-secondary">Chưa có thông tin bảng giá cho dịch vụ này.</span>
							</div>
						</div>
					<?php else: ?>
						<div class="table-responsive">
							<table class="table table-hover align-middle mb-0 custom-table">
								<thead class="bg-light text-secondary text-uppercase small fw-bold">
									<tr>
										<th class="ps-4 py-2">Loại dịch vụ</th>
										<th class="py-2">Số giờ</th>
										<th class="py-2">Hình thức</th>
										<th class="pe-4 py-2 text-end">Giá (VNĐ)</th>
									</tr>
								</thead>
								<tbody>
									<?php foreach (($row['pricing'] ?? []) as $pricing): ?>
										<tr>
											<td class="ps-4 fw-bold text-dark"><?= admin_h((string) ($pricing['label'] ?? '')) ?>
											</td>
											<td>
												<span class="badge bg-light text-dark border fw-normal px-2 py-1">
													<i
														class="bi bi-clock me-1"></i><?= admin_h((string) ($pricing['hours'] ?? '')) ?>
												</span>
											</td>
											<td>
												<span
													class="badge bg-info bg-opacity-10 text-info fw-normal border border-info border-opacity-25 px-2 py-1">
													<?= admin_h((string) ($pricing['type'] ?? '')) ?>
												</span>
											</td>
											<td class="pe-4 text-end">
												<div class="fw-bold text-primary fs-5">
													<?= number_format((float) ($pricing['value'] ?? 0), 0, ',', '.') ?> <small
														class="text-muted" style="font-size: 0.7em;">đ</small>
												</div>
											</td>
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