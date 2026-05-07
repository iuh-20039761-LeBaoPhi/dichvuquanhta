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
        --primary-green: #2e7d32;
        --light-green: #f0fdf4;
        --border-color: #e2e8f0;
        --text-main: #1e293b;
    }

    .admin-main, .admin-main > main {
        background: #f8fafc !important;
    }

    .page-header {
        background: #fff;
        padding: 1.25rem;
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        margin-bottom: 1.5rem;
    }

    .card-custom {
        background: #fff;
        border-radius: 20px;
        border: 1px solid var(--border-color);
        overflow: hidden;
        height: 100%;
    }

    .card-header-green {
        background: var(--light-green);
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-color);
    }

    .card-header-green h6 {
        color: var(--primary-green);
        font-weight: 700;
        margin-bottom: 0;
        text-transform: uppercase;
        font-size: 0.85rem;
        letter-spacing: 0.5px;
    }

    .img-preview-container {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: #fff;
    }

    .badge-type {
        background: var(--light-green);
        color: var(--primary-green);
        border: 1px solid #dcfce7;
        padding: 0.5rem 1rem;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.85rem;
    }

    .pricing-box {
        background: #fdfbf7;
        border: 1px solid #fae8ff; 
        border-radius: 12px;
        padding: 1rem;
    }

    .table-pricing thead th {
        background: #f1f5f9;
        font-size: 0.7rem;
        text-transform: uppercase;
        color: #64748b;
        border: none;
    }

    .list-work-item {
        padding: 0.75rem 0;
        border-bottom: 1px dashed var(--border-color);
    }

    .list-work-item:last-child {
        border-bottom: none;
    }

    .btn-action {
        border-radius: 10px;
        padding: 0.5rem 1.25rem;
        font-weight: 600;
    }
</style>

<div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-3">
    <div>
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-1 small">
                <li class="breadcrumb-item"><a href="quan-ly-dich-vu.php" class="text-decoration-none">Dịch vụ</a></li>
                <li class="breadcrumb-item active">Chi tiết #<?= $id ?></li>
            </ol>
        </nav>
        <h2 class="h4 mb-0 fw-bold text-dark">Xem thông tin dịch vụ</h2>
    </div>
    <div class="d-flex gap-2">
        <a href="quan-ly-dich-vu.php" class="btn btn-light border btn-action text-secondary">
            <i class="bi bi-arrow-left me-2"></i>Thoát
        </a>
        <?php if (is_array($row)): ?>
            <a href="sua-dich-vu.php?id=<?= urlencode((string) $id) ?>" class="btn btn-primary btn-action shadow-sm" style="background-color: var(--primary-green); border: none;">
                <i class="bi bi-pencil-square me-2"></i>Chỉnh sửa nội dung
            </a>
        <?php endif; ?>
    </div>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> border-0 shadow-sm mb-4 rounded-4">
        <i class="bi <?= $flashOk ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill' ?> me-2"></i>
        <?= admin_h($flashMsg) ?>
    </div>
<?php endif; ?>

<?php if ($error !== '' || !is_array($row)): ?>
    <div class="text-center py-5">
        <div class="alert alert-danger d-inline-block px-5 rounded-4">
            <?= admin_h($error !== '' ? $error : 'Rất tiếc, không tìm thấy dữ liệu dịch vụ này.') ?>
        </div>
    </div>
<?php else: ?>
    <?php
    // Giữ nguyên logic cũ nhưng có fallback cho dữ liệu mới
    $pricing = is_array($row['pricing'] ?? null) ? $row['pricing'] : [];
    $pType = (string) ($pricing['type'] ?? 'per_m2');
    ?>
    <div class="row g-4">
        <!-- Cột TRÁI: Nội dung chính -->
        <div class="col-lg-8">
            <div class="card-custom shadow-sm mb-4">
                <div class="card-header-green">
                    <h6><i class="bi bi-info-circle me-2"></i>TỔNG QUAN DỊCH VỤ</h6>
                </div>
                <div class="card-body p-4">
                    <div class="row g-4 align-items-start">
                        <div class="col-md-5">
                            <div class="img-preview-container shadow-sm">
                                <?php $image = trim((string) ($row['image'] ?? '')); ?>
                                <?php if ($image !== ''): ?>
                                    <iframe src="https://drive.google.com/file/d/<?= urlencode($image) ?>/preview"
                                        class="w-100" style="aspect-ratio: 4/3; border:none;" scrolling="no"
                                        loading="lazy"></iframe>
                                <?php else: ?>
                                    <div class="d-flex flex-column align-items-center justify-content-center bg-light text-muted" style="aspect-ratio: 4/3;">
                                        <i class="bi bi-image fs-1 opacity-25"></i>
                                        <span class="small mt-2">Chưa có ảnh</span>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="col-md-7">
                            <h3 class="fw-bold mb-2" style="color: var(--primary-green);"><?= admin_h((string) ($row['name'] ?? '')) ?></h3>
                            <div class="text-muted small mb-4">Mã nhận diện SEO (Alt): <i><?= admin_h((string) ($row['alt'] ?? 'Chưa đặt')) ?></i></div>
                            
                            <div class="mb-4">
                                <label class="text-secondary small fw-bold text-uppercase d-block mb-2">LOẠI HÌNH HỖ TRỢ</label>
                                <div class="d-flex flex-wrap gap-2">
                                    <?php 
                                    // Thích ứng: Nếu JSON mới dùng service_area (chuỗi), nếu cũ dùng loai (mảng)
                                    $tags = !empty($row['service_area']) ? explode(',', (string)$row['service_area']) : ($row['loai'] ?? []);
                                    foreach ($tags as $l): ?>
                                        <span class="badge-type"><i class="bi bi-house-door me-1"></i><?= admin_h(trim((string) $l)) ?></span>
                                    <?php endforeach; ?>
                                </div>
                            </div>

                            <div class="p-3 rounded-4 border-0 shadow-none" style="background-color: #f1f5f9;">
                                <label class="fw-bold d-block mb-2 small text-primary"><i class="bi bi-quote me-1"></i>Mô tả ngắn</label>
                                <div class="text-dark lh-base"><?= nl2br(admin_h((string) ($row['description'] ?? ''))) ?></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-custom shadow-sm">
                <div class="card-header-green">
                    <h6><i class="bi bi-currency-dollar me-2"></i>Cấu trúc bảng giá chi tiết</h6>
                </div>
                <div class="card-body p-4">
                    <?php
                    // Lấy giá từ JSON mới hoặc cũ
                    $basePrice = (float) ($row['price_m2_min'] ?? ($pricing['base_price'] ?? 0));
                    ?>
                    <div class="d-flex align-items-center mb-4 p-3 rounded-3 bg-light border border-white">
                        <i class="bi bi-calculator fs-4 text-primary me-3"></i>
                        <div>
                            <span class="small text-muted d-block">Phương thức tính giá:</span>
                            <strong class="text-dark fs-5"><?= $pType === 'per_m2' ? 'Dựa trên Diện tích (m²)' : 'Dựa trên Gói cố định' ?></strong>
                        </div>
                    </div>

                    <?php if ($pType === 'per_m2'): ?>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <div class="pricing-box text-center border-primary border-opacity-10">
                                    <small class="text-muted d-block mb-1">Đơn giá sàn</small>
                                    <h4 class="fw-bold mb-0 text-primary"><?= number_format($basePrice) ?>đ</h4>
                                </div>
                            </div>
                            <div class="col-md-8">
                                <div class="pricing-box">
                                    <small class="text-muted d-block text-center mb-2">Hệ số độ khó (Nhẹ / Chuẩn / Sâu)</small>
                                    <div class="d-flex justify-content-center align-items-center gap-3">
                                        <span class="badge bg-white border text-dark px-3 py-2 rounded-3 fw-bold"><?= (float) ($pricing['levels']['nhẹ'] ?? 1) ?>x</span>
                                        <i class="bi bi-chevron-right text-muted small"></i>
                                        <span class="badge bg-white border text-dark px-3 py-2 rounded-3 fw-bold text-primary"><?= (float) ($pricing['levels']['tiêu chuẩn'] ?? 1) ?>x</span>
                                        <i class="bi bi-chevron-right text-muted small"></i>
                                        <span class="badge bg-white border text-dark px-3 py-2 rounded-3 fw-bold"><?= (float) ($pricing['levels']['sâu'] ?? 1) ?>x</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <?php if (!empty($pricing['estimated'])): ?>
                        <h6 class="fw-bold mb-3 small text-secondary text-uppercase"><i class="bi bi-calendar-check me-2"></i>Dự toán nguồn lực</h6>
                        <div class="table-responsive rounded-3 border">
                            <table class="table table-hover mb-0 table-pricing text-center align-middle">
                                <thead>
                                    <tr>
                                        <th>Diện tích</th>
                                        <th>Số nhân sự</th>
                                        <th>Ước tính thời gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($pricing['estimated'] as $est): ?>
                                        <tr>
                                            <td class="fw-bold"><?= (int) $est['area'] ?> m²</td>
                                            <td><i class="bi bi-people me-2"></i><?= (int) $est['staff'] ?> người</td>
                                            <td class="text-primary fw-medium"><?= (float) $est['hours'] ?> giờ thi công</td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                        <?php endif; ?>

                    <?php elseif ($pType === 'package' && !empty($pricing['packages'])): ?>
                        <div class="table-responsive rounded-4 border">
                            <table class="table table-hover mb-0 table-pricing align-middle">
                                <thead>
                                    <tr>
                                        <th class="ps-4">Tên gói dịch vụ</th>
                                        <th class="text-center">Đơn giá</th>
                                        <th class="text-center">Nguồn lực</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($pricing['packages'] as $pkg): ?>
                                        <tr>
                                            <td class="ps-4 fw-bold text-dark"><?= admin_h((string) $pkg['name']) ?></td>
                                            <td class="text-center">
                                                <span class="text-primary fw-bold fs-5"><?= number_format((float) $pkg['price']) ?>đ</span>
                                            </td>
                                            <td class="text-center small">
                                                <div class="text-dark fw-medium"><?= (int) $pkg['staff'] ?> nhân sự</div>
                                                <div class="text-muted"><?= (float) $pkg['hours'] ?> giờ thi công</div>
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

        <!-- Cột PHẢI: Danh sách phụ -->
        <div class="col-lg-4">
            <div class="card-custom shadow-sm mb-4">
                <div class="card-header-green">
                    <h6><i class="bi bi-list-check me-2"></i>CÔNG VIỆC BAO GỒM</h6>
                </div>
                <div class="card-body p-4">
                    <?php 
                    // Thích ứng: lấy từ tags (mới) hoặc includes (cũ)
                    $includes = !empty($row['tags']) ? $row['tags'] : ($row['includes'] ?? []);
                    if (empty($includes)): ?>
                        <p class="text-muted small italic">Chưa có danh sách công việc.</p>
                    <?php else: ?>
                        <div class="d-flex flex-column">
                            <?php foreach ($includes as $inc): ?>
                                <div class="list-work-item d-flex align-items-start">
                                    <i class="bi bi-check-circle-fill text-success me-3 mt-1"></i>
                                    <span class="text-dark fw-medium"><?= admin_h((string) $inc) ?></span>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="card-custom shadow-sm">
                <div class="card-header-green">
                    <h6><i class="bi bi-clock-history me-2"></i>Khung giờ phục vụ</h6>
                </div>
                <div class="card-body p-4">
                    <?php if (!empty($row['time_slots'])): ?>
                        <div class="d-flex flex-column gap-2">
                            <?php foreach ($row['time_slots'] as $ts): ?>
                                <div class="d-flex justify-content-between align-items-center p-3 rounded-3 border bg-white shadow-sm-hover transition-all">
                                    <div class="d-flex align-items-center">
                                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3" style="width:35px; height:35px; display:flex; align-items:center; justify-content:center;">
                                            <small class="fw-bold"><?= admin_h((string) $ts['value']) ?></small>
                                        </div>
                                        <span class="fw-bold text-dark"><?= admin_h((string) $ts['label']) ?></span>
                                    </div>
                                    <i class="bi bi-chevron-right text-light"></i>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                    <p class="mt-4 small text-muted text-center italic">
                        <i class="bi bi-info-circle me-1"></i> Khung giờ này được hiển thị khi khách hàng đặt lịch trực tuyến.
                    </p>
                </div>
            </div>
        </div>
    </div>
<?php endif; ?>

<?php admin_render_layout_end(); ?>