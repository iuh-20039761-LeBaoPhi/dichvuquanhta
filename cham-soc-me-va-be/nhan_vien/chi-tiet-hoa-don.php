<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';
require_once __DIR__ . '/header-shared.php';

$sessionUser = session_user_require_employee('../login.html', 'nhan_vien/chi-tiet-hoa-don.php' . (isset($_GET['id']) ? ('?id=' . urlencode((string)$_GET['id'])) : ''));

$sessionEmployeeId = (int)($sessionUser['id'] ?? 0);
$employeeStatus = (string)($sessionUser['trangthai'] ?? '');
$isEmployeeApproved = employee_account_is_approved($employeeStatus);

function fetchNhanVienById(int $nhanVienId): ?array
{
	if ($nhanVienId <= 0) {
		return null;
	}

	$url = 'https://api.dvqt.vn/list/';
	$payload = json_encode(['table' => 'nhacungcap_mevabe'], JSON_UNESCAPED_UNICODE);
	if ($payload === false) {
		return null;
	}

	$ch = curl_init($url);
	curl_setopt_array($ch, [
		CURLOPT_POST => true,
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
		CURLOPT_POSTFIELDS => $payload,
		CURLOPT_CONNECTTIMEOUT => 8,
		CURLOPT_TIMEOUT => 20,
	]);

	$raw = curl_exec($ch);
	curl_close($ch);

	if (!is_string($raw) || $raw === '') {
		return null;
	}

	$decoded = json_decode($raw, true);
	if (!is_array($decoded) || !empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
		return null;
	}

	$rows = $decoded;
	if (isset($decoded['data']) && is_array($decoded['data'])) {
		$rows = $decoded['data'];
	} elseif (isset($decoded['rows']) && is_array($decoded['rows'])) {
		$rows = $decoded['rows'];
	} elseif (isset($decoded['items']) && is_array($decoded['items'])) {
		$rows = $decoded['items'];
	}

	if (!is_array($rows)) {
		return null;
	}

	foreach ($rows as $row) {
		if (!is_array($row)) {
			continue;
		}
		if ((int)($row['id'] ?? 0) === $nhanVienId) {
			return $row;
		}
	}

	return null;
}

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

	if (!$invoice && $loadError === '') {
		$loadError = 'Không tìm thấy hóa đơn tương ứng.';
	}

	if (is_array($invoice) && !invoice_in_employee_scope($invoice, $sessionEmployeeId)) {
		$invoice = null;
		$loadError = 'Bạn không có quyền xem hóa đơn này.';
	}
}

$employeeProfile = null;
if ($loadError === '' && is_array($invoice)) {
	$assignedEmployeeId = (int)($invoice['id_nhacungcap'] ?? 0);
	$employeeProfile = $assignedEmployeeId > 0 ? fetchNhanVienById($assignedEmployeeId) : null;
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Chi Tiết Hóa Đơn</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
	<?php render_nhan_vien_header_styles(); ?>
	<style>
		body {
			background: linear-gradient(180deg, #edf2f7 0%, #f8fafc 100%);
			color: #1f2937;
		}
		.detail-wrap {
			max-width: 1380px;
			margin: 0 auto;
			padding: 14px;
		}
		.top-head {
			background: linear-gradient(90deg, #5178de, #7a4aa8);
			color: #fff;
			border-radius: 10px 10px 0 0;
			padding: 10px 14px;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.top-head h1 {
			font-size: 1.35rem;
			margin: 0;
			font-weight: 800;
		}
		.sheet {
			background: #f3f4f6;
			border: 1px solid #d3d8de;
			border-top: 0;
			border-radius: 0 0 10px 10px;
			padding: 10px;
		}
		.card-box {
			border: 1px solid #cfd6dd;
			border-radius: 6px;
			background: #fff;
			overflow: hidden;
		}
		.head-blue,
		.head-green,
		.head-cyan,
		.head-yellow {
			color: #fff;
			font-weight: 800;
			font-size: 1rem;
			padding: 7px 12px;
		}
		.head-blue { background: #216de0; }
		.head-green { background: #1d8a58; }
		.head-cyan { background: #1cb5de; }
		.head-yellow { background: #f4b400; color: #1f2937; }
		.box-body {
			padding: 12px;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px 24px;
		}
		.meta-row {
			line-height: 1.4;
		}
		.meta-row b {
			font-weight: 800;
		}
		.status-pill {
			display: inline-block;
			border-radius: 999px;
			padding: 2px 10px;
			font-size: 12px;
			font-weight: 800;
			color: #fff;
			background: #12b5dd;
		}
		.status-pending {
			background: #fbbc04;
			color: #1f2937;
		}
		.avatar {
			width: 68px;
			height: 68px;
			border-radius: 50%;
			margin: 0 auto 8px;
			display: block;
			border: 1px solid #d1d5db;
			object-fit: cover;
		}
		.center-name {
			text-align: center;
			font-weight: 600;
			margin-bottom: 10px;
		}
		.kv-list {
			margin: 0;
			padding-left: 16px;
		}
		.kv-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 14px;
		}
		.kv-table th,
		.kv-table td {
			border: 1px solid #e5e7eb;
			padding: 7px 8px;
			vertical-align: top;
		}
		.kv-table th {
			width: 35%;
			background: #f8fafc;
			font-weight: 700;
		}
		.media-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: 10px;
		}
		.media-grid img,
		.media-grid video {
			width: 100%;
			height: 160px;
			object-fit: cover;
			border-radius: 6px;
			border: 1px solid #e5e7eb;
		}
		@media (max-width: 991.98px) {
			.meta-grid { grid-template-columns: 1fr; }
		}
	</style>
</head>
<body>
<main class="detail-wrap">
	<?php render_nhan_vien_header($sessionUser, 'Chi tiet hoa don'); ?>
	<div class="top-head">
		<h1><i class="bi bi-file-earmark-text me-2"></i>Chi Tiết Hóa Đơn</h1>
		<a href="danh-sach-hoa-don.php" class="btn btn-sm btn-outline-light"><i class="bi bi-x-lg"></i></a>
	</div>

	<div class="sheet">
		<?php if ($loadError !== ''): ?>
			<div class="alert alert-warning mb-0"><?= htmlspecialchars($loadError, ENT_QUOTES, 'UTF-8') ?></div>
		<?php else: ?>
			<?php
				$statusText = trim((string)($invoice['trangthai'] ?? ''));
				if ($statusText === '') {
					$statusText = 'Chờ duyệt';
				}

				$statusRaw = strtolower($statusText);
				$statusClass = ' status-pending';
				if (in_array($statusRaw, ['đã duyệt', 'da duyet', 'da_duyet', 'approved', 'đã nhận', 'da nhan', 'da_nhan', 'received'], true)) {
					$statusClass = '';
				}

				$invoiceIdText = trim((string)($invoice['id'] ?? ''));
				$totalMoney = trim((string)($invoice['tong_tien'] ?? ''));
				$serviceName = trim((string)($invoice['dich_vu'] ?? ''));
				$packageName = trim((string)($invoice['goi_dich_vu'] ?? ''));
				$note = trim((string)($invoice['ghi_chu'] ?? ''));
				$requestExtra = trim((string)($invoice['yeu_cau_khac'] ?? ''));
				$startDate = trim((string)($invoice['ngay_bat_dau'] ?? ''));
				$endDate = trim((string)($invoice['ngay_ket_thuc'] ?? ''));
				$workName = trim((string)($invoice['cong_viec'] ?? ''));
				$supplierIdText = trim((string)($invoice['id_nhacungcap'] ?? ''));

				$customerName = trim((string)($invoice['hovaten'] ?? ''));
				$customerPhone = trim((string)($invoice['sodienthoai'] ?? ''));
				$customerEmail = trim((string)($invoice['email'] ?? ''));
				$customerAddress = trim((string)($invoice['diachi'] ?? ''));

				$employeeSource = (is_array($employeeProfile) && $employeeProfile) ? $employeeProfile : [];
				$employeeIdText = trim((string)($employeeSource['id'] ?? ''));
				$employeeName = trim((string)($employeeSource['hovaten'] ?? ''));
				$employeePhone = trim((string)($employeeSource['sodienthoai'] ?? ''));
				$employeeEmail = trim((string)($employeeSource['email'] ?? ''));
				$employeeCreatedDate = trim((string)($employeeSource['created_date'] ?? ''));
				$employeeAvatar = '../assets/logomvb.png';

				$displayOrDefault = static function (string $value, string $default = 'N/A'): string {
					return $value !== '' ? $value : $default;
				};

				$mediaItems = [];
				foreach (['yeu_cau_khac', 'ghi_chu', 'cong_viec'] as $mediaField) {
					$text = trim((string)($invoice[$mediaField] ?? ''));
					if ($text === '') {
						continue;
					}

					$parts = preg_split('/[,\n]/', $text) ?: [];
					foreach ($parts as $part) {
						$part = trim($part);
						if ($part === '') {
							continue;
						}
						if (preg_match('/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov)(\?.*)?$/i', $part)) {
							$mediaItems[] = $part;
						}
					}
				}

				$mediaItems = array_values(array_unique($mediaItems));
			?>

			<div class="card-box mb-3">
				<div class="head-blue"><i class="bi bi-file-earmark me-2"></i>Thông Tin Hóa Đơn</div>
				<div class="box-body">
					<div class="meta-grid">
						<div class="meta-row"><b>Mã HĐ:</b> #<?= htmlspecialchars($displayOrDefault($invoiceIdText, ''), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Tổng tiền:</b> <span style="color:#e53935;font-weight:800;"><?= htmlspecialchars($displayOrDefault($totalMoney), ENT_QUOTES, 'UTF-8') ?></span></div>
						<div class="meta-row"><b>Dịch vụ:</b> <?= htmlspecialchars($displayOrDefault($serviceName), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Trạng thái:</b> <span class="status-pill<?= $statusClass ?>"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') ?></span></div>
						<div class="meta-row"><b>ID nhà cung cấp:</b> <?= htmlspecialchars($displayOrDefault($supplierIdText), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Gói:</b> <?= htmlspecialchars($displayOrDefault($packageName), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Ghi chú:</b> <?= htmlspecialchars($displayOrDefault($note, 'Không có'), ENT_QUOTES, 'UTF-8') ?></div>
						
						<div class="meta-row"><b>Yêu cầu thêm:</b> <?= htmlspecialchars($displayOrDefault($requestExtra, 'Không có'), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Ngày bắt đầu:</b> <?= htmlspecialchars($displayOrDefault($startDate), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Ngày kết thúc:</b> <?= htmlspecialchars($displayOrDefault($endDate), ENT_QUOTES, 'UTF-8') ?></div>
						<div class="meta-row"><b>Công việc:</b> <?= htmlspecialchars($displayOrDefault($workName), ENT_QUOTES, 'UTF-8') ?></div>
					</div>
				</div>
			</div>

			<div class="row g-3 mb-3">
				<div class="col-12 col-lg-6">
					<div class="card-box h-100">
						<div class="head-green"><i class="bi bi-person me-2"></i>Thông Tin Khách Hàng</div>
						<div class="box-body">
							<img class="avatar" src="../assets/logomvb.png" alt="avatar khách hàng">
							<div class="center-name"><?= htmlspecialchars($displayOrDefault($customerName, 'Khách hàng'), ENT_QUOTES, 'UTF-8') ?></div>
							<ul class="kv-list">
								<li><b>SĐT:</b> <?= htmlspecialchars($displayOrDefault($customerPhone), ENT_QUOTES, 'UTF-8') ?></li>
								<li><b>Email:</b> <?= htmlspecialchars($displayOrDefault($customerEmail), ENT_QUOTES, 'UTF-8') ?></li>
								<li><b>Địa chỉ:</b> <?= htmlspecialchars($displayOrDefault($customerAddress), ENT_QUOTES, 'UTF-8') ?></li>
							</ul>
						</div>
					</div>
				</div>
				<div class="col-12 col-lg-6">
					<div class="card-box h-100">
						<div class="head-cyan"><i class="bi bi-person-badge me-2"></i>Nhân Viên Phụ Trách</div>
						<div class="box-body">
							<img class="avatar" src="<?= htmlspecialchars($employeeAvatar, ENT_QUOTES, 'UTF-8') ?>" alt="avatar nhân viên">
							<div class="center-name"><?= htmlspecialchars($displayOrDefault($employeeName, 'Chưa phân công'), ENT_QUOTES, 'UTF-8') ?></div>
							<ul class="kv-list">
								<li><b>ID:</b> <?= htmlspecialchars($displayOrDefault($employeeIdText), ENT_QUOTES, 'UTF-8') ?></li>
								<li><b>SĐT:</b> <?= htmlspecialchars($displayOrDefault($employeePhone), ENT_QUOTES, 'UTF-8') ?></li>
								<li><b>Email:</b> <?= htmlspecialchars($displayOrDefault($employeeEmail), ENT_QUOTES, 'UTF-8') ?></li>
								<li><b>Ngày tạo:</b> <?= htmlspecialchars($displayOrDefault($employeeCreatedDate), ENT_QUOTES, 'UTF-8') ?></li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			<div class="card-box">
				<div class="head-yellow"><i class="bi bi-camera-video me-2"></i>Hình Ảnh & Video Thực Tế</div>
				<div class="box-body">
					<?php if (!$mediaItems): ?>
						<div class="text-center text-muted">Chưa có hình ảnh hoặc video minh chứng.</div>
					<?php else: ?>
						<div class="media-grid">
							<?php foreach ($mediaItems as $asset): ?>
								<?php if (preg_match('/\.(mp4|webm|ogg|mov)(\?.*)?$/i', $asset)): ?>
									<video src="<?= htmlspecialchars($asset, ENT_QUOTES, 'UTF-8') ?>" controls playsinline></video>
								<?php else: ?>
									<img src="<?= htmlspecialchars($asset, ENT_QUOTES, 'UTF-8') ?>" alt="media hóa đơn">
								<?php endif; ?>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
		<?php endif; ?>
	</div>
</main>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
