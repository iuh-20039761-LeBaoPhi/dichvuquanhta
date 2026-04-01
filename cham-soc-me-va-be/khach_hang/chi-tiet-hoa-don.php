<?php
declare(strict_types=1);

require_once __DIR__ . '/invoice_krud_helpers.php';

$invoiceId = (int)($_GET['id'] ?? 0);
$returnPath = $invoiceId > 0
    ? 'khach_hang/chi-tiet-hoa-don.php?id=' . $invoiceId
    : 'khach_hang/chi-tiet-hoa-don.php';

[$sessionUser, $sessionPhone] = require_customer_session($returnPath);

$invoice = null;
$loadError = '';

if ($invoiceId <= 0) {
    $loadError = 'Thieu ma hoa don de hien thi chi tiet.';
} else {
    [$invoices, $apiError] = fetch_customer_invoices_by_phone($sessionPhone);
    if ($apiError !== '') {
        $loadError = $apiError;
    } else {
        foreach ($invoices as $row) {
            if ((int)($row['id'] ?? 0) === $invoiceId) {
                $invoice = $row;
                break;
            }
        }

        if (!$invoice) {
            $loadError = 'Khong tim thay hoa don hoac ban khong co quyen xem hoa don nay.';
        }
    }
}

$statusMeta = invoice_status_meta($invoice['trang_thai'] ?? ($invoice['status'] ?? 'cho_duyet'));
$employee = $invoice ? invoice_employee_data($invoice) : [
    'ten' => 'N/A',
    'so_dien_thoai' => 'N/A',
    'email' => 'N/A',
    'danh_gia' => '4.50',
    'kinh_nghiem' => 'N/A',
    'avatar' => '../assets/logomvb.png',
];
$workItems = $invoice ? invoice_work_items($invoice) : [];
$mediaItems = $invoice ? invoice_media_items($invoice) : [];

function invoice_value(array $invoice, string $key, string $fallback = 'N/A'): string
{
    $value = trim((string)($invoice[$key] ?? ''));
    return $value !== '' ? $value : $fallback;
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chi Tiet Hoa Don - He Thong Quan Ly Dich Vu</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: #f3f4f6;
        }

        .invoice-page-shell {
            max-width: 1280px;
            margin: 0 auto;
            padding: 20px 10px 36px;
        }

        .detail-top {
            background: #e6c8cc;
            border-radius: 14px 14px 0 0;
            border-bottom: 1px solid rgba(138, 40, 40, 0.12);
        }

        .detail-title {
            color: #591b1f;
            font-weight: 800;
            margin: 0;
            font-size: clamp(1.3rem, 2.2vw, 1.9rem);
        }

        .detail-subtitle {
            margin: 4px 0 0;
            color: #68707a;
            font-size: 0.96rem;
        }

        .detail-back-btn {
            border: 1.5px solid #e35d66;
            color: #e35d66;
            font-weight: 700;
            border-radius: 10px;
            background: #fff6f7;
        }

        .detail-back-btn:hover {
            color: #fff;
            background: #e35d66;
        }

        .invoice-card,
        .employee-card,
        .media-card {
            border: 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(24, 26, 27, 0.08);
            overflow: hidden;
            background: #fff;
        }

        .invoice-card-head {
            background: linear-gradient(90deg, #dd3f33, #f15a3b);
            color: #fff;
            padding: 8px 14px;
            font-weight: 800;
            font-size: 1.15rem;
        }

        .employee-card-head {
            background: #e7dcaf;
            color: #7b5c00;
            padding: 8px 14px;
            font-weight: 800;
            font-size: 1.1rem;
            border-bottom: 1px solid rgba(123, 92, 0, 0.2);
        }

        .media-card-head {
            background: #e8c8cc;
            color: #6a1f29;
            padding: 8px 14px;
            font-weight: 800;
            font-size: 1.15rem;
            border-bottom: 1px solid rgba(106, 31, 41, 0.2);
        }

        .invoice-content {
            padding: 14px 16px 12px;
        }

        .detail-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 28px;
        }

        .info-row {
            display: grid;
            grid-template-columns: 140px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
            min-height: 28px;
        }

        .info-label {
            color: #8e1f1f;
            font-weight: 800;
            font-size: 1.02rem;
        }

        .info-value {
            color: #2f3640;
            word-break: break-word;
        }

        .status-pill {
            border-radius: 999px;
            font-weight: 800;
            font-size: 0.8rem;
            padding: 2px 10px;
            display: inline-block;
        }

        .status-pill-default {
            background: #d0d5dd;
            color: #1f2937;
        }

        .status-pill-info {
            background: #12b4da;
            color: #083344;
        }

        .status-pill-warning {
            background: #f6d365;
            color: #78350f;
        }

        .status-pill-primary {
            background: #7fb3ff;
            color: #1e3a8a;
        }

        .status-pill-success {
            background: #86efac;
            color: #14532d;
        }

        .status-pill-danger {
            background: #fca5a5;
            color: #7f1d1d;
        }

        .work-block {
            margin-top: 12px;
            border: 1px solid #e9b949;
            border-radius: 6px;
            padding: 10px 14px 10px;
            min-height: 124px;
        }

        .work-title {
            font-weight: 800;
            color: #8b6508;
            margin-bottom: 8px;
            font-size: 1.45rem;
        }

        .work-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .work-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            color: #2f3640;
        }

        .work-index {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #1d70ff;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.78rem;
            font-weight: 800;
            flex: 0 0 22px;
            margin-top: 1px;
        }

        .employee-content {
            padding: 12px 14px;
            min-height: 334px;
        }

        .employee-avatar {
            width: 95px;
            height: 95px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #ece7dc;
            display: block;
            margin: 4px auto 10px;
            background: #f9fafb;
        }

        .employee-info {
            display: grid;
            gap: 5px;
        }

        .employee-row {
            display: grid;
            grid-template-columns: 112px minmax(0, 1fr);
            gap: 6px;
            align-items: center;
        }

        .employee-label {
            color: #8e1f1f;
            font-weight: 800;
        }

        .employee-value {
            color: #2f3640;
            min-width: 0;
            word-break: break-word;
        }

        .rating-pill {
            border-radius: 8px;
            font-weight: 800;
            background: #facc15;
            color: #1f2937;
            padding: 2px 8px;
            display: inline-block;
        }

        .media-note {
            color: #6b7280;
            margin: 0;
        }

        .media-content {
            padding: 14px;
        }

        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 12px;
        }

        .media-item {
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
            border: 1px solid #e5e7eb;
        }

        .media-item img,
        .media-item video {
            width: 100%;
            height: 280px;
            object-fit: cover;
            display: block;
            background: #e5e7eb;
        }

        .media-empty {
            padding: 20px;
            text-align: center;
            color: #6b7280;
        }

        @media (max-width: 991.98px) {
            .detail-info-grid {
                grid-template-columns: 1fr;
            }

            .info-row {
                grid-template-columns: 126px minmax(0, 1fr);
            }

            .employee-content {
                min-height: 0;
            }

            .media-item img,
            .media-item video {
                height: 230px;
            }
        }

        @media (max-width: 575.98px) {
            .invoice-page-shell {
                padding: 14px 8px 24px;
            }

            .info-row {
                grid-template-columns: 110px minmax(0, 1fr);
                gap: 6px;
            }

            .employee-row {
                grid-template-columns: 100px minmax(0, 1fr);
            }

            .media-item img,
            .media-item video {
                height: 190px;
            }
        }
    </style>
</head>
<body class="bg-body-tertiary">
    <main class="invoice-page-shell">
        <div class="detail-top px-3 px-md-4 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div>
                <h1 class="detail-title"><i class="bi bi-receipt-cutoff me-2"></i>Chi Tiet Hoa Don</h1>
                <p class="detail-subtitle">Thong tin chi tiet hoa don va tien do cong viec</p>
            </div>
            <a href="danh-sach-hoa-don.php" class="btn detail-back-btn fw-semibold">
                <i class="bi bi-arrow-left me-1"></i>Quay Lai Danh Sach
            </a>
        </div>

        <div class="pt-3">
            <?php if ($loadError !== ''): ?>
                <div class="alert alert-warning mb-0"><?= h($loadError) ?></div>
            <?php else: ?>
                <div class="row g-3 align-items-start">
                    <div class="col-12 col-lg-8">
                        <div class="invoice-card">
                            <div class="invoice-card-head">
                                <i class="bi bi-file-earmark-text me-2"></i>
                                Chi Tiet Hoa Don #<?= h((string)($invoice['id'] ?? 'N/A')) ?>
                            </div>
                            <div class="invoice-content">
                                <div class="detail-info-grid">
                                    <div>
                                        <div class="info-row"><div class="info-label">Ten khach hang</div><div class="info-value"><?= h((string)($invoice['hovaten'] ?? ($invoice['ten_khach_hang'] ?? ($invoice['ten'] ?? 'N/A')))) ?></div></div>
                                        <div class="info-row"><div class="info-label">So dien thoai</div><div class="info-value"><?= h((string)($invoice['sodienthoai'] ?? ($invoice['so_dien_thoai'] ?? ($invoice['dien_thoai'] ?? 'N/A')))) ?></div></div>
                                        <div class="info-row"><div class="info-label">Dich vu</div><div class="info-value"><?= h((string)($invoice['dich_vu'] ?? 'N/A')) ?></div></div>
                                        <div class="info-row"><div class="info-label">Goi dich vu</div><div class="info-value"><?= h((string)($invoice['goi_dich_vu'] ?? 'N/A')) ?></div></div>
                                    </div>
                                    <div>
                                        <div class="info-row"><div class="info-label">Ngay bat dau</div><div class="info-value"><?= h((string)($invoice['ngay_bat_dau'] ?? 'N/A')) ?></div></div>
                                        <div class="info-row"><div class="info-label">Gio bat dau</div><div class="info-value"><?= h((string)($invoice['gio_bat_dau'] ?? 'N/A')) ?></div></div>
                                        <div class="info-row"><div class="info-label">Gia tien</div><div class="info-value"><?= h(format_money($invoice['tong_tien'] ?? ($invoice['gia_tien'] ?? 0))) ?></div></div>
                                        <div class="info-row"><div class="info-label">Trang thai</div><div class="info-value"><span class="status-pill <?= h($statusMeta['class']) ?>"><?= h($statusMeta['text']) ?></span></div></div>
                                    </div>
                                </div>

                                <div class="work-block">
                                    <div class="work-title"><i class="bi bi-list-check me-2"></i>Cong viec</div>
                                    <?php if (empty($workItems)): ?>
                                        <p class="mb-0 text-muted">Chua co danh sach cong viec.</p>
                                    <?php else: ?>
                                        <ul class="work-list">
                                            <?php foreach ($workItems as $idx => $item): ?>
                                                <li class="work-item">
                                                    <span class="work-index"><?= h((string)($idx + 1)) ?></span>
                                                    <span><?= h($item) ?></span>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-4">
                        <div class="employee-card">
                            <div class="employee-card-head"><i class="bi bi-person-badge me-2"></i>Nhan Vien Thuc Hien</div>
                            <div class="employee-content">
                                <img class="employee-avatar" src="<?= h(invoice_asset_url($employee['avatar'])) ?>" alt="avatar nhan vien">
                                <div class="employee-info">
                                    <div class="employee-row"><div class="employee-label">Ho ten</div><div class="employee-value"><?= h($employee['ten']) ?></div></div>
                                    <div class="employee-row"><div class="employee-label">So dien thoai</div><div class="employee-value"><?= h($employee['so_dien_thoai']) ?></div></div>
                                    <div class="employee-row"><div class="employee-label">Email</div><div class="employee-value"><?= h($employee['email']) ?></div></div>
                                    <div class="employee-row"><div class="employee-label">Danh gia</div><div class="employee-value"><span class="rating-pill"><i class="bi bi-star-fill me-1"></i><?= h($employee['danh_gia']) ?>/5.0</span></div></div>
                                    <div class="employee-row"><div class="employee-label">Kinh nghiem</div><div class="employee-value"><?= h($employee['kinh_nghiem']) ?></div></div>
                                </div>
                                <hr class="my-3">
                                <div class="fw-bold mb-1" style="color:#8b6508;"><i class="bi bi-camera-video-fill me-2"></i>Media Cua Nhan Vien</div>
                                <p class="media-note">Chua co media cua nhan vien.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="media-card mt-3">
                    <div class="media-card-head"><i class="bi bi-camera-video-fill me-2"></i>Hinh Anh & Video Cong Viec</div>
                    <div class="media-content">
                        <?php if (empty($mediaItems)): ?>
                            <div class="media-empty">Chua co hinh anh hoac video cho hoa don nay.</div>
                        <?php else: ?>
                            <div class="media-grid">
                                <?php foreach ($mediaItems as $media): ?>
                                    <?php $asset = invoice_asset_url($media); ?>
                                    <?php if ($asset === '') continue; ?>
                                    <div class="media-item">
                                        <?php if (preg_match('/\.(mp4|webm|ogg|mov)$/i', $asset)): ?>
                                            <video src="<?= h($asset) ?>" controls playsinline></video>
                                        <?php else: ?>
                                            <img src="<?= h($asset) ?>" alt="media hoa don">
                                        <?php endif; ?>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </main>
</body>
</html>
