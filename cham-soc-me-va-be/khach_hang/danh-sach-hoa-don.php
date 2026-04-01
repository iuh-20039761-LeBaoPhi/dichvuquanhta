<?php
declare(strict_types=1);

require_once __DIR__ . '/invoice_krud_helpers.php';

[$sessionUser, $sessionPhone] = require_customer_session('khach_hang/danh-sach-hoa-don.php');
[$invoices, $loadError] = fetch_customer_invoices_by_phone($sessionPhone);

function invoice_customer_name(array $invoice): string
{
    return (string)($invoice['hovaten'] ?? ($invoice['ten_khach_hang'] ?? ($invoice['ten'] ?? 'Khach hang')));
}

function invoice_service_name(array $invoice): string
{
    return (string)($invoice['goi_dich_vu'] ?? ($invoice['dich_vu'] ?? 'N/A'));
}

function invoice_employee_name(array $invoice): string
{
    return (string)($invoice['nhan_vien_ten'] ?? ($invoice['ten_nhan_vien'] ?? ($invoice['employee_name'] ?? '')));
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Danh Sach Hoa Don - He Thong Quan Ly Dich Vu</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        .invoice-page-shell {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px 12px 32px;
        }

        .invoice-mobile-list .card {
            border: 1px solid rgba(220, 53, 69, 0.2);
            box-shadow: 0 4px 14px rgba(220, 53, 69, 0.08);
        }

        .invoice-mobile-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.35rem 0;
            border-bottom: 1px dashed rgba(108, 117, 125, 0.25);
        }

        .invoice-mobile-row:last-child {
            border-bottom: 0;
        }

        .invoice-mobile-label {
            font-weight: 600;
            color: #6c757d;
            min-width: 92px;
            flex: 0 0 auto;
        }

        .invoice-mobile-value {
            text-align: right;
            min-width: 0;
            word-break: break-word;
        }

        .invoice-mobile-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            flex-wrap: wrap;
        }

        @media (max-width: 767.98px) {
            .invoice-mobile-list .card-body {
                padding: 0.75rem;
            }

            .invoice-mobile-row {
                font-size: 0.92rem;
            }
        }
    </style>
</head>
<body class="bg-body-tertiary">
    <main class="invoice-page-shell">
        <div class="card border-0 rounded-4 shadow-lg overflow-hidden">
            <div class="card-header border-0 bg-danger-subtle px-3 px-md-4 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div>
                    <h4 class="mb-1 fw-bold text-danger-emphasis"><i class="bi bi-receipt-cutoff me-2"></i>Danh Sach Hoa Don Da Dat</h4>
                    <p class="text-secondary small mb-0">Theo doi trang thai va xem chi tiet hoa don cua ban</p>
                </div>
                <div class="d-flex gap-2">
                    <a href="../index.html" class="btn btn-outline-secondary rounded-3 fw-semibold">
                        <i class="bi bi-house me-1"></i>Trang Chu
                    </a>
                    <a href="../dat-lich.html" class="btn btn-danger rounded-3 fw-semibold">
                        <i class="bi bi-calendar-plus me-1"></i>Dat Lich Dich Vu
                    </a>
                </div>
            </div>

            <div class="card-body p-3 p-md-4 bg-danger-subtle">
                <?php if ($loadError !== ''): ?>
                    <div class="alert alert-warning mb-0"><?= h($loadError) ?></div>
                <?php elseif (empty($invoices)): ?>
                    <div class="alert alert-info mb-0">Ban chua co hoa don nao.</div>
                <?php else: ?>
                    <div class="d-none d-md-block">
                        <div class="card border-danger-subtle shadow-sm rounded-4">
                            <div class="card-body p-2 p-md-3">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle mb-0 table-sm" style="font-size: 14px;">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Ten khach hang</th>
                                                <th>Goi dich vu</th>
                                                <th>Ngay bat dau</th>
                                                <th>Tong tien</th>
                                                <th>Trang thai</th>
                                                <th>Ten nhan vien</th>
                                                <th>Hanh dong</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($invoices as $invoice): ?>
                                                <?php
                                                    $invoiceId = (int)($invoice['id'] ?? 0);
                                                    $statusMeta = invoice_status_meta($invoice['trang_thai'] ?? ($invoice['status'] ?? 'cho_duyet'));
                                                    $employeeName = trim(invoice_employee_name($invoice));
                                                ?>
                                                <tr>
                                                    <td><?= h(invoice_customer_name($invoice)) ?></td>
                                                    <td><?= h(invoice_service_name($invoice)) ?></td>
                                                    <td><?= h((string)($invoice['ngay_bat_dau'] ?? 'N/A')) ?></td>
                                                    <td><?= h(format_money($invoice['tong_tien'] ?? ($invoice['gia_tien'] ?? 0))) ?></td>
                                                    <td><span class="badge rounded-pill <?= h($statusMeta['class']) ?>"><?= h($statusMeta['text']) ?></span></td>
                                                    <td>
                                                        <?php if ($employeeName !== ''): ?>
                                                            <?= h($employeeName) ?>
                                                        <?php else: ?>
                                                            <span class="text-muted">Chua co</span>
                                                        <?php endif; ?>
                                                    </td>
                                                    <td>
                                                        <?php if ($invoiceId > 0): ?>
                                                            <a class="btn btn-sm btn-outline-danger" href="chi-tiet-hoa-don.php?id=<?= $invoiceId ?>">
                                                                <i class="bi bi-eye me-1"></i>Chi tiet
                                                            </a>
                                                        <?php else: ?>
                                                            <button type="button" class="btn btn-sm btn-outline-secondary" disabled>Khong co ID</button>
                                                        <?php endif; ?>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-md-none invoice-mobile-list">
                        <?php foreach ($invoices as $invoice): ?>
                            <?php
                                $invoiceId = (int)($invoice['id'] ?? 0);
                                $statusMeta = invoice_status_meta($invoice['trang_thai'] ?? ($invoice['status'] ?? 'cho_duyet'));
                                $employeeName = trim(invoice_employee_name($invoice));
                            ?>
                            <div class="card mb-2 rounded-4 border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="invoice-mobile-row"><span class="invoice-mobile-label">Khach hang</span><span class="invoice-mobile-value fw-semibold"><?= h(invoice_customer_name($invoice)) ?></span></div>
                                    <div class="invoice-mobile-row"><span class="invoice-mobile-label">Goi</span><span class="invoice-mobile-value"><?= h(invoice_service_name($invoice)) ?></span></div>
                                    <div class="invoice-mobile-row"><span class="invoice-mobile-label">Bat dau</span><span class="invoice-mobile-value"><?= h((string)($invoice['ngay_bat_dau'] ?? 'N/A')) ?></span></div>
                                    <div class="invoice-mobile-row"><span class="invoice-mobile-label">Tong tien</span><span class="invoice-mobile-value fw-semibold text-danger-emphasis"><?= h(format_money($invoice['tong_tien'] ?? ($invoice['gia_tien'] ?? 0))) ?></span></div>
                                    <div class="invoice-mobile-row"><span class="invoice-mobile-label">Trang thai</span><span class="invoice-mobile-value"><span class="badge rounded-pill <?= h($statusMeta['class']) ?>"><?= h($statusMeta['text']) ?></span></span></div>
                                    <div class="invoice-mobile-row"><span class="invoice-mobile-label">Nhan vien</span><span class="invoice-mobile-value"><?= h($employeeName !== '' ? $employeeName : 'Chua co') ?></span></div>
                                    <div class="invoice-mobile-actions mt-2">
                                        <?php if ($invoiceId > 0): ?>
                                            <a class="btn btn-sm btn-outline-danger" href="chi-tiet-hoa-don.php?id=<?= $invoiceId ?>">
                                                <i class="bi bi-eye me-1"></i>Chi tiet
                                            </a>
                                        <?php else: ?>
                                            <button type="button" class="btn btn-sm btn-outline-secondary" disabled>Khong co ID</button>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </main>
</body>
</html>
