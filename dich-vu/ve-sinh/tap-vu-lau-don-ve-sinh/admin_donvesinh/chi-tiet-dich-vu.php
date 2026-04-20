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
        --admin-primary: #2563eb;
        --admin-secondary: #64748b;
        --admin-success: #1e40af;
        --admin-warning: #3b82f6;
        --admin-bg: #f8fafc;
    }

    .admin-main,
    .admin-main>main {
        background: var(--admin-bg) !important;
    }

    .card {
        border: 1px solid #e2e8f0 !important;
        border-radius: 14px;
        transition: box-shadow 0.2s ease;
    }

    .card:hover {
        box-shadow: 0 5px 15px rgba(37, 99, 235, 0.08) !important;
    }

    .section-title {
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--admin-primary);
        border-left: 3px solid var(--admin-primary);
        padding-left: 10px;
        margin-bottom: 15px;
        text-transform: uppercase;
    }

    .pricing-table th {
        background: #f1f5f9 !important;
        font-size: 0.75rem;
        color: #1e293b;
        border: none !important;
    }
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
    <h2 class="h4 mb-0 fw-bold">Chi tiết dịch vụ #<?= (int) $id ?></h2>
    <div class="d-inline-flex gap-2">
        <a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay
            lại</a>
        <?php if (is_array($row)): ?>
            <a href="sua-dich-vu.php?id=<?= urlencode((string) $id) ?>" class="btn btn-warning btn-sm"><i
                    class="bi bi-pencil-square me-1"></i>Sửa</a>
        <?php endif; ?>
    </div>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2 shadow-sm"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<?php if ($error !== '' || !is_array($row)): ?>
    <div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy dịch vụ.') ?></div>
<?php else: ?>
    <?php
    $pricing = is_array($row['pricing'] ?? null) ? $row['pricing'] : [];
    $pType = (string) ($pricing['type'] ?? 'N/A');
    ?>
    <div class="row g-3">
        <!-- Cột trái: Nội dung & Hình ảnh -->
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body">
                    <div class="section-title">Thông tin cơ bản</div>
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <?php
                            $image = trim((string) ($row['image'] ?? ''));
                            ?>
                            <?php if ($image !== ''): ?>
                                <iframe src="https://drive.google.com/file/d/<?= urlencode($image) ?>/preview"
                                    class="rounded border w-100" style="aspect-ratio: 1/1; border:none;" scrolling="no"
                                    loading="lazy"></iframe>
                            <?php else: ?>
                                <div class="d-flex align-items-center justify-content-center bg-light text-secondary rounded border w-100"
                                    style="aspect-ratio: 1/1;">
                                    <i class="bi bi-image fs-1 opacity-25"></i>
                                </div>
                            <?php endif; ?>
                        </div>
                        <div class="col-md-8">
                            <h4 class="fw-bold text-success mb-1"><?= admin_h((string) ($row['name'] ?? '')) ?></h4>
                            <p class="text-muted small mb-3">Alt: <?= admin_h((string) ($row['alt'] ?? '')) ?></p>
                            <div class="mb-3">
                                <label class="form-label d-block text-secondary small">Loại hình áp dụng:</label>
                                <?php foreach (($row['loai'] ?? []) as $l): ?>
                                    <span
                                        class="badge bg-light text-primary border me-1 px-3 py-2"><?= admin_h((string) $l) ?></span>
                                <?php endforeach; ?>
                            </div>
                            <div class="p-3 bg-light rounded border-start border-4 border-primary">
                                <label class="fw-bold d-block mb-1 small">Mô tả giới thiệu:</label>
                                <div class="fw-medium"><?= admin_h((string) ($row['description'] ?? '')) ?></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body">
                    <div class="section-title">Bảng giá chuyên sâu
                        (<?= $pType === 'per_m2' ? 'Tính theo Diện tích' : 'Tính theo Gói' ?>)</div>

                    <?php if ($pType === 'per_m2'): ?>
                        <div class="row g-2 mb-4">
                            <div class="col-6 col-md-3">
                                <div class="p-2 border rounded bg-light text-center">
                                    <small class="text-muted d-block">Giá cơ bản</small>
                                    <span
                                        class="fw-bold text-primary"><?= number_format((float) ($pricing['base_price'] ?? 0)) ?>đ</span>
                                </div>
                            </div>
                            <div class="col-6 col-md-3">
                                <div class="p-2 border rounded bg-light text-center">
                                    <small class="text-muted d-block">Giá tối thiểu</small>
                                    <span
                                        class="fw-bold text-danger"><?= number_format((float) ($pricing['min_price'] ?? 0)) ?>đ</span>
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block text-center mb-1">Hệ số (Nhẹ / Thường / Sâu)</small>
                                    <div class="d-flex justify-content-around fw-bold">
                                        <span><?= (float) ($pricing['levels']['nhẹ'] ?? 1) ?></span>/
                                        <span><?= (float) ($pricing['levels']['tiêu chuẩn'] ?? 1) ?></span>/
                                        <span><?= (float) ($pricing['levels']['sâu'] ?? 1) ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <label class="fw-bold mb-2 small">Bảng dự toán Estimated:</label>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered pricing-table text-center align-middle">
                                <thead>
                                    <tr>
                                        <th>Diện tích (m2)</th>
                                        <th>Nhân viên</th>
                                        <th>Thời lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach (($pricing['estimated'] ?? []) as $est): ?>
                                        <tr>
                                            <td class="fw-bold"><?= (int) $est['area'] ?> m2</td>
                                            <td><?= (int) $est['staff'] ?> người</td>
                                            <td><?= (float) $est['hours'] ?> giờ</td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                    <?php elseif ($pType === 'package'): ?>
                        <div class="table-responsive">
                            <table class="table table-bordered table-sm pricing-table align-middle">
                                <thead>
                                    <tr>
                                        <th class="ps-3">Tên gói</th>
                                        <th class="text-center">Giá</th>
                                        <th class="text-center">Nhân viên</th>
                                        <th class="text-center">Thời lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach (($pricing['packages'] ?? []) as $pkg): ?>
                                        <tr>
                                            <td class="ps-3 fw-bold"><?= admin_h((string) $pkg['name']) ?></td>
                                            <td class="text-center text-primary fw-bold">
                                                <?= number_format((float) $pkg['price']) ?>đ
                                            </td>
                                            <td class="text-center"><?= (int) $pkg['staff'] ?> người</td>
                                            <td class="text-center"><?= (float) $pkg['hours'] ?> giờ</td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Cột phải: Lists -->
        <div class="col-lg-4">
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body">
                    <div class="section-title">Danh mục công việc</div>
                    <ul class="ps-3 mb-0" style="list-style-type: none;">
                        <?php foreach (($row['includes'] ?? []) as $inc): ?>
                            <li class="mb-2 d-flex align-items-start fw-medium">
                                <i class="bi bi-check2-circle text-success mt-1 me-2"></i>
                                <?= admin_h((string) $inc) ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body">
                    <div class="section-title">Khung giờ phục vụ</div>
                    <div class="list-group list-group-flush border rounded overflow-hidden">
                        <?php foreach (($row['time_slots'] ?? []) as $ts): ?>
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <span class="badge bg-primary rounded-pill"><?= admin_h((string) $ts['value']) ?></span>
                                <span class="fw-bold"><?= admin_h((string) $ts['label']) ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php endif; ?>

<?php admin_render_layout_end(); ?>