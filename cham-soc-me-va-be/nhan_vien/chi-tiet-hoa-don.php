<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/xu-ly-cong-viec.php';

$sessionUser = session_user_require_employee('../login.html', 'nhan_vien/chi-tiet-hoa-don.php' . (isset($_GET['id']) ? ('?id=' . urlencode((string)$_GET['id'])) : ''));
$sessionEmployeeId = (int)($sessionUser['id'] ?? 0);
$employeeStatus = (string)($sessionUser['trangthai'] ?? '');
$isEmployeeApproved = employee_account_is_approved($employeeStatus);

$invoiceId = (int)($_GET['id'] ?? 0);
$invoice = null;
$loadError = '';

if (!$isEmployeeApproved) {
	$loadError = 'Tài khoản của bạn đang chờ duyệt';
} elseif ($invoiceId <= 0) {
	$loadError = 'Thiếu mã hóa đơn để hiển thị chi tiết.';
} else {
	$result = getHoaDonData($invoiceId);
	$invoice = $result['row'] ?? null;
	$loadError = (string)($result['error'] ?? '');

	if (!is_array($invoice) && $loadError === '') {
		$loadError = 'Không tìm thấy hóa đơn tương ứng.';
	}

	if (is_array($invoice) && !invoice_in_employee_scope($invoice, $sessionEmployeeId, $sessionUser)) {
		$invoice = null;
		$loadError = 'Bạn không có quyền xem hóa đơn này.';
	}
}

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$row = is_array($invoice) ? $invoice : [];
$viewData = build_invoice_work_view_data($row, $sessionUser);
extract($viewData, EXTR_OVERWRITE);

$actionReturn = 'chi-tiet-hoa-don.php?id=' . $idNumber;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Chi Tiết Hóa Đơn</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
	<?php render_nhan_vien_header_styles(); ?>
	<style>
		body {
			font-family: 'Be Vietnam Pro', sans-serif;
			background: linear-gradient(180deg, #edf2f7 0%, #f7fafc 45%, #f8fafc 100%);
			color: #0f172a;
		}

		.page-wrap {
			max-width: 1320px;
			margin: 0 auto;
			padding: 6px;
		}

		.detail-shell {
			border-radius: 14px;
			border: 1px solid #d7e1ec;
			background: #eef3f7;
			box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
			overflow: hidden;
		}

		.hero-box {
			padding: 10px;
			background: linear-gradient(95deg, #1a66cb 0%, #1295be 58%, #17a37e 100%);
			color: #fff;
		}

		.hero-top {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			gap: 10px;
			margin-bottom: 10px;
		}

		.hero-title {
			margin: 0;
			font-size: clamp(1.1rem, 2.2vw, 2rem);
			font-weight: 800;
			line-height: 1.15;
		}

		.hero-subtitle {
			margin: 4px 0 0;
			font-size: 1rem;
			font-weight: 700;
			opacity: 0.95;
		}

		.hero-status {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			border-radius: 999px;
			padding: 4px 9px;
			font-size: 11px;
			font-weight: 800;
			border: 1px solid rgba(255, 255, 255, 0.45);
			background: rgba(255, 255, 255, 0.12);
			margin-left: 8px;
			vertical-align: middle;
		}

		.hero-progress {
			width: 86px;
			height: 86px;
			border-radius: 50%;
			border: 4px solid rgba(255, 255, 255, 0.5);
			background: rgba(255, 255, 255, 0.2);
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			font-weight: 800;
			text-align: center;
			line-height: 1.1;
			flex: 0 0 auto;
		}

		.hero-progress strong {
			font-size: 2rem;
		}

		.hero-progress small {
			font-size: 11px;
			font-weight: 700;
		}

		.hero-stats {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 8px;
		}

		.hero-stat {
			border: 1px solid rgba(255, 255, 255, 0.25);
			border-radius: 10px;
			padding: 8px 10px;
			background: rgba(255, 255, 255, 0.08);
			min-height: 74px;
		}

		.hero-stat .label {
			margin: 0 0 2px;
			font-size: 11px;
			font-weight: 700;
			opacity: 0.92;
			display: inline-flex;
			align-items: center;
			gap: 5px;
		}

		.hero-stat .value {
			margin: 0;
			font-size: 1.15rem;
			font-weight: 800;
			line-height: 1.22;
			word-break: break-word;
		}

		.hero-stat .sub {
			margin: 2px 0 0;
			font-size: 12px;
			font-weight: 700;
			opacity: 0.95;
		}

		.content-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
			padding: 10px;
		}

		.panel {
			border: 1px solid #cfd9e5;
			border-radius: 12px;
			background: #f2f6fa;
			overflow: hidden;
		}

		.panel-full {
			grid-column: 1 / -1;
		}

		.panel-head {
			padding: 8px 12px;
			background: #e8eef4;
			border-bottom: 1px solid #d4dee9;
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 8px;
		}

		.panel-title {
			margin: 0;
			font-size: clamp(1.2rem, 2.2vw, 2rem);
			line-height: 1.15;
			font-weight: 800;
			color: #1c446f;
		}

		.chip {
			display: inline-flex;
			align-items: center;
			padding: 4px 10px;
			border-radius: 999px;
			font-size: 11px;
			font-weight: 800;
			white-space: nowrap;
			background: #e7eef7;
			color: #36597e;
			border: 1px solid #d2dfec;
		}

		.chip.success {
			background: #def8ea;
			color: #138259;
			border-color: #c0ead3;
		}

		.chip.warning {
			background: #fff4da;
			color: #a56d0f;
			border-color: #f1dfb5;
		}

		.chip.danger {
			background: #fee4e4;
			color: #b13434;
			border-color: #f5c6c6;
		}

		.jobs-list {
			list-style: none;
			margin: 0;
			padding: 8px;
			display: grid;
			gap: 6px;
			counter-reset: job-step;
		}

		.jobs-list li {
			counter-increment: job-step;
			display: flex;
			align-items: flex-start;
			gap: 8px;
			border: 1px solid #c8e2d1;
			border-radius: 8px;
			padding: 8px 10px;
			background: #ecf7f1;
			font-size: 0.9rem;
			font-weight: 700;
			color: #2f4f47;
			line-height: 1.35;
		}

		.jobs-list li::before {
			content: counter(job-step);
			width: 20px;
			height: 20px;
			border-radius: 999px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			font-weight: 800;
			color: #fff;
			background: #20a06d;
			flex: 0 0 20px;
			margin-top: 1px;
		}

		.jobs-meta {
			border-top: 1px solid #d4dee9;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 6px;
			padding: 8px;
		}

		.jobs-meta-item {
			border: 1px solid #cfd9e5;
			border-radius: 8px;
			background: #dfe8f2;
			padding: 8px;
		}

		.label-xs {
			margin: 0 0 4px;
			font-size: 10px;
			font-weight: 800;
			letter-spacing: .4px;
			text-transform: uppercase;
			color: #5f7590;
		}

		.value-sm {
			margin: 0;
			font-size: 0.95rem;
			font-weight: 700;
			color: #213d57;
			word-break: break-word;
		}

		.progress-block {
			padding: 10px;
			display: grid;
			gap: 8px;
		}

		.progress-head {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 0.9rem;
			font-weight: 700;
			color: #496480;
		}

		.progress-wrap {
			height: 16px;
			border-radius: 999px;
			border: 1px solid #d3deea;
			background: #dce7f3;
			overflow: hidden;
		}

		.progress-bar {
			height: 100%;
			background: linear-gradient(90deg, #19a56f, #29c38a);
		}

		.progress-bar.danger {
			background: linear-gradient(90deg, #d85a5a, #c73838);
		}

		.time-table {
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			border: 1px solid #cfd9e5;
			border-radius: 8px;
			overflow: hidden;
			font-size: 0.9rem;
		}

		.time-table th,
		.time-table td {
			border-bottom: 1px solid #d9e2ec;
			padding: 7px 8px;
			text-align: left;
			font-weight: 700;
			color: #314d69;
		}

		.time-table th {
			background: #dfe8f2;
			font-size: 0.82rem;
		}

		.time-table tr:last-child td {
			border-bottom: 0;
		}

		.status-line {
			display: flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
			font-size: 0.93rem;
			font-weight: 700;
			color: #3c5875;
		}

		.muted-note {
			margin: 0;
			color: #64748b;
			font-size: 0.92rem;
		}

		.person-card {
			padding: 10px;
		}

		.person-head {
			display: flex;
			gap: 10px;
			align-items: center;
			margin-bottom: 8px;
		}

		.avatar {
			width: 66px;
			height: 66px;
			border-radius: 50%;
			border: 2px solid #dbe8f5;
			object-fit: cover;
			background: #fff;
			flex: 0 0 66px;
		}

		.person-name {
			margin: 0;
			font-size: 1.9rem;
			font-weight: 800;
			color: #1f3f61;
			line-height: 1.1;
		}

		.person-items {
			display: grid;
			gap: 6px;
		}

		.person-row {
			margin: 0;
			font-size: 0.95rem;
			font-weight: 700;
			color: #2e4a66;
			display: flex;
			align-items: flex-start;
			gap: 7px;
		}

		.person-row i {
			color: #4b8cd4;
			margin-top: 2px;
		}

		.person-foot {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: 10px;
		}

		.review-wrap {
			padding: 8px;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}

		.review-box {
			border: 1px solid #d4dee9;
			border-radius: 10px;
			background: #f5f9fd;
			overflow: hidden;
		}

		.review-head {
			padding: 8px 10px;
			background: #eaf0f6;
			border-bottom: 1px solid #d4dee9;
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 8px;
		}

		.review-title {
			margin: 0;
			font-size: 1rem;
			font-weight: 800;
			color: #254767;
		}

		.review-body {
			padding: 8px;
			display: grid;
			gap: 8px;
		}

		.review-text {
			margin: 0;
			font-size: 0.95rem;
			font-weight: 700;
			color: #2d4a67;
			word-break: break-word;
		}

		.media-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}

		.media-grid img,
		.media-grid video {
			width: 100%;
			height: 120px;
			object-fit: cover;
			border-radius: 8px;
			border: 1px solid #d4dee9;
			background: #fff;
		}

		.media-empty {
			border: 1px dashed #c9d8e8;
			border-radius: 8px;
			padding: 8px;
			font-size: 0.85rem;
			font-weight: 700;
			color: #5f7590;
			text-align: center;
			grid-column: 1 / -1;
		}

		@media (max-width: 1199.98px) {
			.content-grid {
				grid-template-columns: 1fr;
			}
		}

		@media (max-width: 991.98px) {
			.hero-stats,
			.jobs-meta,
			.review-wrap {
				grid-template-columns: 1fr;
			}

			.hero-top {
				flex-direction: column;
				align-items: flex-start;
			}

			.person-name {
				font-size: 1.5rem;
			}
		}
	</style>
</head>
<body>
<?php render_nhan_vien_header($sessionUser, 'Chi tiet hoa don nhan vien', 'orders'); ?>
<div class="page-wrap">
	<?php if ($flashMsg !== ''): ?>
		<div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> mb-3"><?= htmlspecialchars($flashMsg, ENT_QUOTES, 'UTF-8') ?></div>
	<?php endif; ?>

	<?php if ($loadError !== ''): ?>
		<div class="alert alert-warning mb-3"><?= htmlspecialchars($loadError, ENT_QUOTES, 'UTF-8') ?></div>
	<?php else: ?>
		<section class="detail-shell">
			<div class="hero-box">
				<div class="hero-top">
					<div>
						<h1 class="hero-title">Đơn <?= htmlspecialchars($invoiceCode, ENT_QUOTES, 'UTF-8') ?> <span class="hero-status"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') ?></span></h1>
						<p class="hero-subtitle"><?= htmlspecialchars($serviceName, ENT_QUOTES, 'UTF-8') ?></p>
					</div>
					<div class="hero-progress">
						<strong><?= (int)round($progress) ?>%</strong>
						<small>Hoàn thành</small>
					</div>
				</div>

				<div class="hero-stats">
					<article class="hero-stat">
						<p class="label"><i class="bi bi-cash-coin"></i>Tổng tiền</p>
						<p class="value"><?= htmlspecialchars($totalMoneyText, ENT_QUOTES, 'UTF-8') ?></p>
					</article>
					<article class="hero-stat">
						<p class="label"><i class="bi bi-clock"></i>Thời gian</p>
						<p class="value"><?= htmlspecialchars($planTimeRangeText, ENT_QUOTES, 'UTF-8') ?></p>
						<p class="sub"><?= htmlspecialchars($planDayRangeText, ENT_QUOTES, 'UTF-8') ?></p>
					</article>
					<article class="hero-stat">
						<p class="label"><i class="bi bi-geo-alt"></i>Địa chỉ</p>
						<p class="value"><?= htmlspecialchars($addressText, ENT_QUOTES, 'UTF-8') ?></p>
					</article>
				</div>
			</div>

			<div class="content-grid">
				<article class="panel">
					<div class="panel-head">
						<h2 class="panel-title">Công việc cần thực hiện</h2>
					</div>
					<ol class="jobs-list">
						<?php foreach ($jobs as $job): ?>
							<li><?= htmlspecialchars($job, ENT_QUOTES, 'UTF-8') ?></li>
						<?php endforeach; ?>
					</ol>
					<div class="jobs-meta">
						<div class="jobs-meta-item">
							<p class="label-xs">Yêu cầu</p>
							<p class="value-sm"><?= htmlspecialchars($requestExtra, ENT_QUOTES, 'UTF-8') ?></p>
						</div>
						<div class="jobs-meta-item">
							<p class="label-xs">Ghi chú</p>
							<p class="value-sm"><?= htmlspecialchars($note, ENT_QUOTES, 'UTF-8') ?></p>
						</div>
					</div>
				</article>

				<article class="panel">
					<div class="panel-head">
						<h2 class="panel-title" style="font-size:1.2rem;">Trạng thái, thời gian và tiến độ</h2>
					</div>
					<div class="progress-block">
						<div class="progress-head">
							<span>Tiến độ thực hiện</span>
							<span><?= htmlspecialchars($progressText, ENT_QUOTES, 'UTF-8') ?>%</span>
						</div>
						<div class="progress-wrap">
							<div class="progress-bar <?= $stateClass === 'danger' ? 'danger' : '' ?>" style="width: <?= htmlspecialchars($progressText, ENT_QUOTES, 'UTF-8') ?>%;"></div>
						</div>
						<p class="muted-note">Tiến độ cộng dồn theo từng ngày làm việc.</p>

						<div class="status-line">
							<span>Trạng thái:</span>
							<span class="chip <?= htmlspecialchars($stateClass, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') ?></span>
						</div>

						<table class="time-table">
							<thead>
								<tr>
									<th></th>
									<th>Thời gian dự kiến</th>
									<th>Thời gian thực tế</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>Bắt đầu</td>
									<td><?= htmlspecialchars($planStartDateTimeText, ENT_QUOTES, 'UTF-8') ?></td>
									<td><?= htmlspecialchars($realStartText, ENT_QUOTES, 'UTF-8') ?></td>
								</tr>
								<tr>
									<td>Kết thúc</td>
									<td><?= htmlspecialchars($planEndDateTimeText, ENT_QUOTES, 'UTF-8') ?></td>
									<td><?= htmlspecialchars($realEndText, ENT_QUOTES, 'UTF-8') ?></td>
								</tr>
							</tbody>
						</table>

						<div class="status-line">
							<span>Ghi chú ngày</span>
							<span><?= htmlspecialchars($planDayRangeText, ENT_QUOTES, 'UTF-8') ?></span>
						</div>
						<p class="muted-note">Số ngày kế hoạch: <?= (int)$daysPlan ?> ngày</p>

						<div class="d-flex flex-wrap align-items-center gap-2 mt-1">
							<?php if ($canClaim): ?>
								<form method="post" action="xu-ly-cong-viec.php" class="d-inline">
									<input type="hidden" name="invoice_id" value="<?= (int)$idNumber ?>">
									<input type="hidden" name="action" value="claim">
									<input type="hidden" name="return_to" value="<?= htmlspecialchars($actionReturn, ENT_QUOTES, 'UTF-8') ?>">
									<button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-hand-thumbs-up me-1"></i>Nhận việc</button>
								</form>
							<?php endif; ?>

							<?php if ($canStart): ?>
								<form method="post" action="xu-ly-cong-viec.php" class="d-inline">
									<input type="hidden" name="invoice_id" value="<?= (int)$idNumber ?>">
									<input type="hidden" name="action" value="start">
									<input type="hidden" name="return_to" value="<?= htmlspecialchars($actionReturn, ENT_QUOTES, 'UTF-8') ?>">
									<button type="submit" class="btn btn-success btn-sm"><i class="bi bi-play-fill me-1"></i>Bắt đầu</button>
								</form>
							<?php endif; ?>

							<?php if ($canEnd): ?>
								<form method="post" action="xu-ly-cong-viec.php" class="d-inline">
									<input type="hidden" name="invoice_id" value="<?= (int)$idNumber ?>">
									<input type="hidden" name="action" value="end">
									<input type="hidden" name="return_to" value="<?= htmlspecialchars($actionReturn, ENT_QUOTES, 'UTF-8') ?>">
									<button type="submit" class="btn btn-warning btn-sm text-white"><i class="bi bi-stop-fill me-1"></i>Kết thúc</button>
								</form>
							<?php endif; ?>

							<?php if (!$canClaim && !$canStart && !$canEnd): ?>
								<span class="muted-note">Không có thao tác khả dụng cho trạng thái hiện tại.</span>
							<?php endif; ?>
						</div>
					</div>
				</article>

				<article class="panel">
					<div class="panel-head">
						<h2 class="panel-title" style="font-size:1.8rem;">Khách hàng</h2>
						<span class="chip success">Khách hàng</span>
					</div>
					<div class="person-card">
						<div class="person-head">
							<img class="avatar" src="<?= htmlspecialchars($customerAvatar, ENT_QUOTES, 'UTF-8') ?>" alt="avatar khách hàng">
							<h3 class="person-name"><?= htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8') ?></h3>
						</div>
						<div class="person-items">
							<p class="person-row"><i class="bi bi-envelope-fill"></i><span><?= htmlspecialchars($customerEmail, ENT_QUOTES, 'UTF-8') ?></span></p>
							<p class="person-row"><i class="bi bi-telephone-fill"></i><span><?= htmlspecialchars($customerPhone, ENT_QUOTES, 'UTF-8') ?></span></p>
							<p class="person-row"><i class="bi bi-geo-alt-fill"></i><span><?= htmlspecialchars($customerAddress, ENT_QUOTES, 'UTF-8') ?></span></p>
						</div>
						<div class="person-foot">
							<span class="chip">Năm sinh: ---</span>
						</div>
					</div>
				</article>

				<article class="panel">
					<div class="panel-head">
						<h2 class="panel-title" style="font-size:1.8rem;">Nhà Cung Cấp phụ trách</h2>
						<span class="chip <?= $staffAssigned ? 'success' : 'warning' ?>"><?= $staffAssigned ? 'Đã nhận' : 'Chưa nhận' ?></span>
					</div>
					<div class="person-card">
						<div class="person-head">
							<img class="avatar" src="<?= htmlspecialchars($staffAvatar, ENT_QUOTES, 'UTF-8') ?>" alt="avatar nhà cung cấp">
							<h3 class="person-name"><?= htmlspecialchars($staffName, ENT_QUOTES, 'UTF-8') ?></h3>
						</div>
						<div class="person-items">
							<p class="person-row"><i class="bi bi-envelope-fill"></i><span><?= htmlspecialchars($staffEmail, ENT_QUOTES, 'UTF-8') ?></span></p>
							<p class="person-row"><i class="bi bi-telephone-fill"></i><span><?= htmlspecialchars($staffPhone, ENT_QUOTES, 'UTF-8') ?></span></p>
							<p class="person-row"><i class="bi bi-geo-alt-fill"></i><span><?= htmlspecialchars($staffAddress, ENT_QUOTES, 'UTF-8') ?></span></p>
						</div>
						<div class="person-foot">
							<span class="chip">Nhận việc: <?= htmlspecialchars($staffReceiveAt, ENT_QUOTES, 'UTF-8') ?></span>
							<span class="chip">Kinh nghiệm: ---</span>
						</div>
					</div>
				</article>

				<article class="panel panel-full">
					<div class="panel-head">
						<h2 class="panel-title" style="font-size:1.45rem;">Ảnh và đánh giá</h2>
						<span class="chip">Minh chứng</span>
					</div>
					<div class="review-wrap">
						<section class="review-box">
							<div class="review-head">
								<h3 class="review-title">Đánh giá khách hàng</h3>
								<span class="chip warning">Chưa có</span>
							</div>
							<div class="review-body">
								<p class="label-xs">Nội dung đánh giá</p>
								<p class="review-text">Chưa có đánh giá</p>
								<p class="label-xs">Thời gian gửi</p>
								<p class="review-text">---</p>
								<p class="label-xs">Ảnh/video đánh giá</p>
								<div class="media-grid">
									<div class="media-empty">Chưa có tệp</div>
								</div>
							</div>
						</section>

						<section class="review-box">
							<div class="review-head">
								<h3 class="review-title">Đánh giá nhà cung cấp</h3>
								<span class="chip warning">Chưa có</span>
							</div>
							<div class="review-body">
								<p class="label-xs">Nội dung đánh giá</p>
								<p class="review-text">Chưa có đánh giá</p>
								<p class="label-xs">Thời gian gửi</p>
								<p class="review-text">---</p>
								<p class="label-xs">Ảnh/video minh chứng</p>
								<div class="media-grid">
									<?php if (!$proofMedia): ?>
										<div class="media-empty">Chưa có tệp</div>
									<?php else: ?>
										<?php foreach ($proofMedia as $media): ?>
											<?php $isVideo = preg_match('/\.(mp4|webm|ogg|mov)(\?.*)?$/i', $media) === 1; ?>
											<?php if ($isVideo): ?>
												<video src="<?= htmlspecialchars($media, ENT_QUOTES, 'UTF-8') ?>" controls playsinline></video>
											<?php else: ?>
												<img src="<?= htmlspecialchars($media, ENT_QUOTES, 'UTF-8') ?>" alt="media minh chứng">
											<?php endif; ?>
										<?php endforeach; ?>
									<?php endif; ?>
								</div>
							</div>
						</section>
					</div>
				</article>
			</div>
		</section>
	<?php endif; ?>
</div>
<?php render_nhan_vien_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
