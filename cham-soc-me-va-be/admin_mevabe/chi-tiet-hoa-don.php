<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_hoadon_detail_view_data($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');
$viewData = is_array($detail['view'] ?? null) ? $detail['view'] : [];
extract($viewData, EXTR_SKIP);

admin_render_layout_start('Chi Tiết Hóa Đơn', 'orders', $admin);
?>

<style>
	.admin-main,
	.admin-main > main {
		background: #f3f7fb !important;
	}

	.od-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.od-title {
		margin: 0;
		font-size: 1.45rem;
		font-weight: 800;
		color: #0e2e4f;
	}

	.od-head-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.od-chip {
		display: inline-flex;
		align-items: center;
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		background: #e4f8ec;
		color: #178157;
		border: 1px solid #c6ecd6;
	}

	.od-back-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.32rem 0.8rem;
		border-radius: 999px;
		background: linear-gradient(135deg, #2f8fe8, #1f6ec9);
		color: #fff;
		border: 1px solid #65a9ec;
		font-weight: 600;
		font-size: 0.8rem;
		text-decoration: none;
	}

	.od-back-btn:hover {
		background: linear-gradient(135deg, #1e79d6, #165fb2);
		color: #fff;
	}

	.od-alert {
		border-radius: 9px;
		background: #e9f2fb;
		border: 1px solid #d3e5f7;
		color: #2f587d;
		padding: 10px 12px;
		font-weight: 700;
		margin-bottom: 10px;
	}

	.od-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.od-card {
		background: #fff;
		border: 1px solid #d6e3f0;
		border-radius: 11px;
		box-shadow: 0 4px 14px rgba(14, 32, 58, 0.05);
		overflow: hidden;
	}

	.od-card.wide {
		grid-column: 1 / -1;
	}

	.od-hero {
		padding: 12px;
		background: linear-gradient(115deg, #1f66c6 0%, #1282d3 50%, #12a58d 100%);
		color: #fff;
	}

	.od-hero-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 14px;
	}

	.od-order-id {
		margin: 0;
		font-size: 1.95rem;
		font-weight: 800;
		line-height: 1;
	}

	.od-status-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 9px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 800;
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.35);
		margin-left: 6px;
	}

	.od-service {
		margin: 4px 0 7px;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.od-tools {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.od-tool {
		display: inline-flex;
		align-items: center;
		padding: 4px 9px;
		font-size: 10px;
		font-weight: 700;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.od-progress-ring {
		--p: 0;
		width: 94px;
		height: 94px;
		padding: 5px;
		border-radius: 50%;
		background: conic-gradient(#b7f5d7 calc(var(--p) * 1%), rgba(255, 255, 255, 0.24) 0);
	}

	.od-progress-core {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		display: grid;
		place-content: center;
		text-align: center;
		background: rgba(21, 81, 132, 0.45);
	}

	.od-progress-core strong {
		font-size: 1.85rem;
		line-height: 1;
	}

	.od-progress-core small {
		font-size: 10px;
		font-weight: 700;
	}

	.od-hero-grid {
		margin-top: 10px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.od-box {
		border-radius: 8px;
		padding: 10px;
		border: 1px solid rgba(255, 255, 255, 0.25);
		background: rgba(16, 62, 114, 0.2);
	}

	.od-box-label {
		margin: 0;
		font-size: 10px;
		font-weight: 700;
		opacity: 0.88;
	}

	.od-box-value {
		margin: 2px 0 0;
		font-size: 1.92rem;
		font-weight: 800;
		line-height: 1.2;
		word-break: break-word;
	}

	.od-box-sub {
		margin: 1px 0 0;
		font-size: 11px;
		font-weight: 600;
	}

	.od-panel-head,
	.od-profile-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 11px 12px;
		border-bottom: 1px solid #e2ebf5;
		background: #f8fbff;
	}

	.od-panel-title,
	.od-profile-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		color: #1f3b57;
	}

	.od-job-count {
		display: inline-flex;
		align-items: center;
		padding: 4px 9px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 800;
		color: #138157;
		background: #ddf8ea;
		border: 1px solid #c4edd5;
	}

	.od-jobs-body {
		padding: 12px;
		background: #ecf8f2;
	}

	.od-jobs-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
		counter-reset: od-job;
	}

	.od-jobs-list li {
		counter-increment: od-job;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px;
		border-radius: 9px;
		background: rgba(255, 255, 255, 0.4);
		border: 1px solid #cce7d8;
		font-weight: 600;
		font-size: 13px;
		line-height: 1.4;
		color: #2b4a65;
	}

	.od-jobs-list li::before {
		content: counter(od-job);
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 800;
		background: #16a46d;
		color: #fff;
		flex: 0 0 22px;
		margin-top: 1px;
	}

	.od-jobs-foot {
		padding: 10px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 7px;
		border-top: 1px solid #e2ebf5;
		background: #fff;
	}

	.od-mini {
		border: 1px solid #c8d8ea;
		background: #dfe9f7;
		border-radius: 8px;
		padding: 7px 9px;
	}

	.od-mini p {
		margin: 0;
	}

	.od-mini .k {
		font-size: 10px;
		font-weight: 700;
		color: #46627d;
	}

	.od-mini .v {
		font-size: 13px;
		font-weight: 700;
		color: #1e3a58;
	}

	.od-progress-body {
		padding: 12px;
	}

	.od-progress-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 700;
		color: #3c5772;
	}

	.od-progress-track {
		height: 10px;
		border-radius: 999px;
		background: #dce9f6;
		overflow: hidden;
		margin-top: 6px;
	}

	.od-progress-fill {
		height: 100%;
		width: 0;
		background: linear-gradient(90deg, #16a56d, #2dcf92);
	}

	.od-progress-note {
		margin: 8px 0 10px;
		font-size: 12px;
		font-weight: 600;
		color: #5c738a;
	}

	.od-timeline {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}

	.od-timeline li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding-left: 20px;
		position: relative;
		font-size: 13px;
		font-weight: 700;
		color: #2a445e;
	}

	.od-timeline li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 7px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid #c9d9ea;
		background: #fff;
	}

	.od-timeline li.done::before,
	.od-timeline li.active::before {
		border-color: #16a56d;
		background: #16a56d;
	}

	.od-timeline li span {
		font-size: 12px;
		font-weight: 600;
		color: #667f98;
	}

	.od-next {
		margin-top: 10px;
		padding: 10px;
		border-radius: 8px;
		border: 1px solid #d6e4f2;
		background: #eef5ff;
		font-size: 12px;
		font-weight: 700;
		color: #385573;
	}

	.od-profile-body {
		padding: 12px;
		display: grid;
		grid-template-columns: 72px 1fr;
		gap: 12px;
	}

	.od-avatar {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		object-fit: cover;
		border: 3px solid #deebf9;
		background: #d6e4f4;
	}

	.od-name {
		margin: 0;
		font-size: 1.45rem;
		font-weight: 800;
		line-height: 1.2;
		color: #223e59;
	}

	.od-rating {
		margin: 4px 0 6px;
		font-size: 13px;
		font-weight: 700;
		color: #566d83;
	}

	.od-rating i {
		color: #f2b019;
		margin-right: 4px;
	}

	.od-info-row {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
		color: #2b4964;
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.od-info-row i {
		color: #60a5fa;
	}

	.od-profile-foot {
		padding: 0 12px 12px;
	}

	.od-exp {
		display: inline-flex;
		align-items: center;
		padding: 7px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		background: #eef2f6;
		color: #52667c;
	}

	.od-review-body {
		padding: 11px 12px;
		display: grid;
		gap: 8px;
	}

	.od-review-box {
		border: 1px solid #d8e5f3;
		border-radius: 8px;
		padding: 8px;
		background: #f8fbff;
	}

	.od-review-label {
		margin: 0 0 3px;
		font-size: 10px;
		font-weight: 700;
		color: #57708a;
	}

	.od-review-value {
		margin: 0;
		font-size: 12px;
		font-weight: 700;
		color: #2d4b67;
		white-space: pre-line;
		word-break: break-word;
	}

	@media (max-width: 1199px) {
		.od-grid,
		.od-hero-grid,
		.od-jobs-foot {
			grid-template-columns: 1fr;
		}

		.od-profile-body,
		.od-hero-top {
			grid-template-columns: 1fr;
			flex-direction: column;
		}
	}
</style>

<div class="od-head">
	<h2 class="od-title">Chi tiết hóa đơn mẹ và bé</h2>
	<div class="od-head-actions">
		<span class="od-chip">Vai trò: Admin</span>
		<a href="quan-ly-hoa-don.php" class="od-back-btn"><i class="bi bi-arrow-left-circle me-1"></i>Quay lại</a>
	</div>
</div>

<?php if ($error !== '' || !is_array($row)): ?>
	<div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy hóa đơn.') ?></div>
<?php else: ?>
	<div class="od-alert">Tải dữ liệu thành công</div>

	<section class="od-grid">
		<article class="od-card od-hero wide">
			<div class="od-hero-top">
				<div>
					<h3 class="od-order-id">
						Đơn #<?= admin_h((string)($row['id'] ?? '')) ?>
						<span class="od-status-pill"><?= admin_h($statusText !== '' ? $statusText : 'N/A') ?></span>
					</h3>
					<p class="od-service"><?= admin_h($serviceName) ?></p>
					<div class="od-tools">
						<span class="od-tool">Hỗ trợ</span>
						<span class="od-tool">Mã HĐ: <?= admin_h((string)($row['id'] ?? '')) ?></span>
					</div>
				</div>
				<div class="od-progress-ring" style="--p:<?= admin_h($progressText) ?>;">
					<div class="od-progress-core">
						<strong><?= admin_h($progressText) ?>%</strong>
						<small>Hoàn thành</small>
					</div>
				</div>
			</div>
			<div class="od-hero-grid">
				<div class="od-box">
					<p class="od-box-label">Tổng tiền</p>
					<p class="od-box-value"><?= admin_h($priceText) ?></p>
				</div>
				<div class="od-box">
					<p class="od-box-label">Thời gian</p>
					<p class="od-box-value"><?= admin_h($timeRange) ?></p>
					<p class="od-box-sub"><?= admin_h($dateRange) ?></p>
				</div>
				<div class="od-box">
					<p class="od-box-label">Địa chỉ</p>
					<p class="od-box-value"><?= admin_h($address) ?></p>
				</div>
			</div>
		</article>

		<article class="od-card">
			<div class="od-panel-head">
				<h4 class="od-panel-title">Công việc cần thực hiện</h4>
				<span class="od-job-count"><?= admin_h((string)$jobCount) ?>/<?= admin_h((string)$jobCount) ?> đã hoàn thành</span>
			</div>
			<div class="od-jobs-body">
				<ol class="od-jobs-list">
					<?php foreach ($jobItems as $item): ?>
						<li><?= admin_h($item) ?></li>
					<?php endforeach; ?>
				</ol>
			</div>
			<div class="od-jobs-foot">
				<div class="od-mini">
					<p class="k">Gói dịch vụ</p>
					<p class="v"><?= admin_h($packageName) ?></p>
				</div>
				<div class="od-mini">
					<p class="k">Yêu cầu</p>
					<p class="v"><?= admin_h($requestText !== '' ? $requestText : 'Không có') ?></p>
				</div>
				<div class="od-mini" style="grid-column:1/-1;">
					<p class="k">Ghi chú</p>
					<p class="v"><?= admin_h($noteText !== '' ? $noteText : 'Không có') ?></p>
				</div>
			</div>
		</article>

		<article class="od-card">
			<div class="od-panel-head">
				<h4 class="od-panel-title">Tiến độ thực hiện</h4>
				<span class="od-job-count">Cập nhật: <?= admin_h($updatedAtDisplay) ?></span>
			</div>
			<div class="od-progress-body">
				<div class="od-progress-top">
					<span>Tiến độ cộng dồn</span>
					<span><?= admin_h($progressText) ?>%</span>
				</div>
				<div class="od-progress-track"><div class="od-progress-fill" style="width:<?= admin_h($progressText) ?>%;"></div></div>
				<p class="od-progress-note">Tiến độ theo từng ngày, mỗi ngày là 1 ca <?= admin_h($timeRange) ?>. Khoảng ngày kế hoạch: <?= admin_h($dateRange) ?>.</p>
				<ul class="od-timeline">
					<li class="<?= $hasStart ? 'done' : 'pending' ?>">Bắt đầu ca <span><?= admin_h($startRealDisplay) ?></span></li>
					<li class="<?= $isRunning ? 'active' : ($hasEnd ? 'done' : 'pending') ?>">Đang thực hiện <span><?= admin_h($timeRange) ?></span></li>
					<li class="<?= $hasEnd ? 'done' : 'pending' ?>">Chuẩn bị kết thúc <span><?= admin_h($timeEndDisplay) ?></span></li>
					<li class="<?= $isDone ? 'done' : 'pending' ?>">Hoàn thành <span><?= admin_h($endRealDisplay) ?></span></li>
				</ul>
				<div class="od-next">Ca tiếp theo<br>Khoảng ngày: <?= admin_h($dateRange) ?></div>
			</div>
		</article>

		<article class="od-card">
			<div class="od-profile-head">
				<h4 class="od-profile-title">Khách hàng</h4>
				<span class="od-job-count" style="background:#e8f7ff;color:#1c6aa8;border-color:#d0eafb;">Khách hàng</span>
			</div>
			<div class="od-profile-body">
				<img class="od-avatar" src="<?= admin_h($customerAvatar !== '' ? $customerAvatar : '../assets/logomvb.png') ?>" alt="Khách hàng">
				<div>
					<p class="od-name"><?= admin_h($customerName) ?></p>
					<p class="od-rating"><i class="bi bi-star-fill"></i><?= admin_h($customerEmail) ?></p>
					<p class="od-info-row"><i class="bi bi-telephone"></i><?= admin_h($customerPhone) ?></p>
					<p class="od-info-row"><i class="bi bi-geo-alt"></i><?= admin_h($customerAddress) ?></p>
				</div>
			</div>
			<div class="od-profile-foot"><span class="od-exp">Ngày tạo: <?= admin_h($createdDateDisplay) ?></span></div>
		</article>

		<article class="od-card">
			<div class="od-profile-head">
				<h4 class="od-profile-title">Nhà Cung Cấp phụ trách</h4>
				<span class="od-job-count" style="<?= $supplierAssigned ? 'background:#def8ea;color:#138259;border-color:#c4edd5;' : 'background:#fff4df;color:#996316;border-color:#f0ddb4;' ?>"><?= $supplierAssigned ? 'Đã nhận' : 'Chưa nhận' ?></span>
			</div>
			<div class="od-profile-body">
				<img class="od-avatar" src="<?= admin_h($supplierAvatar !== '' ? $supplierAvatar : '../assets/logomvb.png') ?>" alt="Nhà Cung Cấp">
				<div>
					<p class="od-name"><?= admin_h($supplierName !== '' ? $supplierName : 'Chưa phân công') ?></p>
					<p class="od-rating"><i class="bi bi-star-fill"></i><?= admin_h($supplierRatingText) ?></p>
					<p class="od-info-row"><i class="bi bi-envelope"></i><?= admin_h($supplierEmail !== '' ? $supplierEmail : 'N/A') ?></p>
					<p class="od-info-row"><i class="bi bi-telephone"></i><?= admin_h($supplierPhone !== '' ? $supplierPhone : 'N/A') ?></p>
					<p class="od-info-row"><i class="bi bi-geo-alt"></i><?= admin_h($supplierAddress !== '' ? $supplierAddress : 'N/A') ?></p>
				</div>
			</div>
			<div class="od-profile-foot d-flex flex-wrap" style="gap:8px;">
				<span class="od-exp">Nhận việc: <?= admin_h($supplierReceivedAtDisplay) ?></span>
				<span class="od-exp">Kinh nghiệm: <?= admin_h($supplierExp !== '' ? $supplierExp : 'Không có') ?></span>
			</div>
		</article>

		<article class="od-card">
			<div class="od-profile-head">
				<h4 class="od-profile-title">Đánh giá khách hàng</h4>
				<span class="od-job-count" style="background:#fff4df;color:#996316;border-color:#f0ddb4;"><?= $reviewCustomer !== '' ? 'Đã có' : 'Chưa có' ?></span>
			</div>
			<div class="od-review-body">
				<div class="od-review-box">
					<p class="od-review-label">Nội dung đánh giá</p>
					<p class="od-review-value"><?= admin_h($reviewCustomer !== '' ? $reviewCustomer : 'Chưa có đánh giá') ?></p>
				</div>
				<div class="od-review-box">
					<p class="od-review-label">Thời gian gửi</p>
					<p class="od-review-value"><?= admin_h($reviewCustomerAtDisplay) ?></p>
				</div>
			</div>
		</article>

		<article class="od-card">
			<div class="od-profile-head">
				<h4 class="od-profile-title">Đánh giá nhà cung cấp</h4>
				<span class="od-job-count" style="background:#fff4df;color:#996316;border-color:#f0ddb4;"><?= $reviewSupplier !== '' ? 'Đã có' : 'Chưa có' ?></span>
			</div>
			<div class="od-review-body">
				<div class="od-review-box">
					<p class="od-review-label">Nội dung đánh giá</p>
					<p class="od-review-value"><?= admin_h($reviewSupplier !== '' ? $reviewSupplier : 'Chưa có đánh giá') ?></p>
				</div>
				<div class="od-review-box">
					<p class="od-review-label">Thời gian gửi</p>
					<p class="od-review-value"><?= admin_h($reviewSupplierAtDisplay) ?></p>
				</div>
			</div>
		</article>
	</section>
<?php endif; ?>

<?php admin_render_layout_end(); ?>
