<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';
require_once __DIR__ . '/get_nhanvien.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_hoadon_by_id($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');

$nhanVienRow = null;
if (is_array($row)) {
	$nhanVienId = (int)($row['id_nhacungcap'] ?? 0);
	if ($nhanVienId > 0) {
		$nhanVienDetail = get_nhanvien_by_id($nhanVienId);
		$nhanVienRow = is_array($nhanVienDetail['row'] ?? null) ? $nhanVienDetail['row'] : null;
	}
}

admin_render_layout_start('Chi Tiet Hoa Don', 'orders', $admin);
?>

<style>
	.admin-main,
	.admin-main > main {
		background: #ffffff !important;
	}

	.order-detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
	}

	.order-detail-title {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #0f172a;
	}

	.order-back-btn {
		border-radius: 999px;
		background: linear-gradient(135deg, #60a5fa, #3b82f6);
		color: #ffffff;
		border: 1px solid #60a5fa;
		font-weight: 600;
		padding: 0.3rem 0.85rem;
	}

	.order-back-btn:hover {
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: #ffffff;
	}

	.order-detail-card {
		background: #ffffff;
		border: 1px solid #cfd8e6;
		border-radius: 14px;
		box-shadow: 0 3px 8px rgba(15, 23, 42, 0.04);
	}

	.order-detail-card .card-header {
		background: #ffffff;
		border-bottom: 1px solid #dce4f2;
		font-weight: 700;
		color: #111827;
	}

	.order-meta-label {
		display: block;
		font-size: 0.84rem;
		font-weight: 600;
		color: #6b7280;
		margin-bottom: 2px;
	}

	.order-meta-value {
		color: #0f172a;
		font-weight: 500;
		word-break: break-word;
	}

	.order-status .badge {
		font-size: 0.74rem;
		font-weight: 700;
		padding: 0.32rem 0.54rem;
	}

	.order-price {
		font-size: 2.1rem;
		line-height: 1;
		font-weight: 800;
		color: #4f46e5;
		letter-spacing: 0.3px;
	}

	.order-long-text {
		white-space: pre-line;
		line-height: 1.45;
	}
</style>

<div class="order-detail-header">
	<h2 class="order-detail-title">Chi tiet hoa don #<?= admin_h((string)$id) ?></h2>
	<a href="quan-ly-hoa-don.php" class="btn btn-sm order-back-btn"><i class="bi bi-arrow-left me-1"></i>Quay lai</a>
</div>

<?php if ($error !== '' || !is_array($row)): ?>
	<div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Khong tim thay hoa don.') ?></div>
<?php else: ?>
	<?php $statusMeta = hoadon_status_meta((string)($row['trangthai'] ?? '')); ?>
	<div class="row g-3">
		<div class="col-12 col-xl-7">
			<div class="card order-detail-card h-100">
				<div class="card-header">Thong tin don hang</div>
				<div class="card-body">
					<div class="row g-3">
						<div class="col-sm-6">
							<span class="order-meta-label">Ma don</span>
							<div class="order-meta-value">#<?= admin_h((string)($row['id'] ?? '')) ?></div>
						</div>
						<div class="col-sm-6 order-status">
							<span class="order-meta-label">Trang thai</span>
							<div><span class="badge rounded-pill <?= admin_h((string)$statusMeta['badge']) ?>"><?= admin_h((string)$statusMeta['text']) ?></span></div>
						</div>
						<div class="col-sm-6">
							<span class="order-meta-label">Dich vu</span>
							<div class="order-meta-value"><?= admin_h((string)($row['dich_vu'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<span class="order-meta-label">Goi dich vu</span>
							<div class="order-meta-value"><?= admin_h((string)($row['goi_dich_vu'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<span class="order-meta-label">Ngay bat dau</span>
							<div class="order-meta-value"><?= admin_h((string)($row['ngay_bat_dau'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<span class="order-meta-label">Ngay ket thuc</span>
							<div class="order-meta-value"><?= admin_h((string)($row['ngay_ket_thuc'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-sm-6">
							<span class="order-meta-label">Tong tien</span>
							<div class="order-price"><?= admin_h((string)($row['tong_tien'] ?? '0')) ?></div>
						</div>
						<div class="col-sm-6">
							<span class="order-meta-label">Nhan vien phu trach</span>
							<div class="order-meta-value"><?= admin_h((string)($row['id_nhacungcap'] ?? 'Chua phan cong')) ?></div>
						</div>
						<div class="col-12">
							<span class="order-meta-label">Cong viec</span>
							<div class="order-meta-value order-long-text"><?= admin_h((string)($row['cong_viec'] ?? 'N/A')) ?></div>
						</div>
						<div class="col-12">
							<span class="order-meta-label">Yeu cau khac</span>
							<div class="order-meta-value order-long-text"><?= admin_h((string)($row['yeu_cau_khac'] ?? 'Khong co')) ?></div>
						</div>
						<div class="col-12">
							<span class="order-meta-label">Ghi chu</span>
							<div class="order-meta-value order-long-text"><?= admin_h((string)($row['ghi_chu'] ?? 'Khong co')) ?></div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-5">
			<div class="card order-detail-card mb-3">
				<div class="card-header">Thong tin khach hang</div>
				<div class="card-body">
					<div class="mb-3"><span class="order-meta-label">Ho ten</span><div class="order-meta-value fw-semibold"><?= admin_h((string)($row['hovaten'] ?? 'N/A')) ?></div></div>
					<div class="mb-3"><span class="order-meta-label">So dien thoai</span><div class="order-meta-value"><?= admin_h((string)($row['sodienthoai'] ?? 'N/A')) ?></div></div>
					<div class="mb-3"><span class="order-meta-label">Email</span><div class="order-meta-value"><?= admin_h((string)($row['email'] ?? 'N/A')) ?></div></div>
					<div class="mb-3"><span class="order-meta-label">Dia chi</span><div class="order-meta-value order-long-text"><?= admin_h((string)($row['diachi'] ?? 'N/A')) ?></div></div>
					<div><span class="order-meta-label">Ngay tao</span><div class="order-meta-value"><?= admin_h((string)($row['created_date'] ?? 'N/A')) ?></div></div>
				</div>
			</div>

			<div class="card order-detail-card">
				<div class="card-header">Thong tin nhan vien phu trach</div>
				<div class="card-body">
					<?php if (is_array($nhanVienRow)): ?>
						<div class="mb-3"><span class="order-meta-label">ID nhan vien</span><div class="order-meta-value fw-semibold">#<?= admin_h((string)($nhanVienRow['id'] ?? '')) ?></div></div>
						<div class="mb-3"><span class="order-meta-label">Ho ten</span><div class="order-meta-value fw-semibold"><?= admin_h((string)($nhanVienRow['hovaten'] ?? 'N/A')) ?></div></div>
						<div class="mb-3"><span class="order-meta-label">So dien thoai</span><div class="order-meta-value"><?= admin_h((string)($nhanVienRow['sodienthoai'] ?? 'N/A')) ?></div></div>
						<div class="mb-3"><span class="order-meta-label">Email</span><div class="order-meta-value"><?= admin_h((string)($nhanVienRow['email'] ?? 'N/A')) ?></div></div>
						<div class="mb-3"><span class="order-meta-label">Dia chi</span><div class="order-meta-value order-long-text"><?= admin_h((string)($nhanVienRow['diachi'] ?? 'N/A')) ?></div></div>
						<?php $statusNhanVien = nhanvien_status_meta((string)($nhanVienRow['trangthai'] ?? '')); ?>
						<div><span class="order-meta-label">Trang thai tai khoan</span><div><span class="badge rounded-pill <?= admin_h((string)$statusNhanVien['badge']) ?>"><?= admin_h((string)$statusNhanVien['text']) ?></span></div></div>
					<?php else: ?>
						<div class="order-meta-value text-secondary">Hoa don nay chua co nhan vien phu trach hoac khong tim thay thong tin nhan vien.</div>
					<?php endif; ?>
				</div>
			</div>
		</div>
	</div>
<?php endif; ?>

<?php admin_render_layout_end(); ?>
