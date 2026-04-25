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

admin_render_layout_start('Sửa Dịch Vụ', 'services', $admin);
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
        border-radius: 14px;
        border: 1px solid #e2e8f0 !important;
        transition: box-shadow 0.2s ease;
    }

    .card:hover {
        box-shadow: 0 5px 15px rgba(37, 99, 235, 0.08) !important;
    }

    .form-label {
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 3px;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .form-control,
    .form-select {
        border-radius: 8px;
        border: 1px solid #e2e8f0 !important;
        padding: 0.5rem 0.75rem;
        font-size: 0.95rem;
        color: #1e293b;
        font-weight: 500;
    }

    .form-control:focus {
        border-color: var(--admin-primary) !important;
        box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.1);
    }

    .section-title {
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--admin-primary);
        border-left: 3px solid var(--admin-primary);
        padding-left: 10px;
        margin-bottom: 15px;
    }
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
    <div class="d-flex align-items-center">
        <div class="bg-primary bg-opacity-10 p-2 rounded-2 me-3">
            <i class="bi bi-pencil-square text-primary fs-5"></i>
        </div>
        <h2 class="h4 mb-0 fw-bold">Sửa dịch vụ #<?= (int) $id ?></h2>
    </div>
    <a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay
        lại</a>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2 shadow-sm border-0"
        style="border-radius: 4px;"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<?php if ($error !== '' || !is_array($row)): ?>
    <div class="alert alert-warning border-0 shadow-sm" style="border-radius: 4px;"><?= admin_h($error !== '' ? $error : 'Không tìm thấy dịch vụ.') ?></div>
<?php else: ?>
    <?php
    $pricing = is_array($row['pricing'] ?? null) ? $row['pricing'] : [];
    $pType = (string) ($pricing['type'] ?? 'per_m2');
    ?>
    <form id="editServiceForm" method="post" action="xu-ly-sua-dich-vu.php" enctype="multipart/form-data">
        <input type="hidden" name="id" value="<?= (int) $id ?>">
        <input type="hidden" name="pricing_json" id="pricing_json">
        <input type="hidden" name="current_image" value="<?= admin_h((string) ($row['image'] ?? '')) ?>">

        <div class="row g-3">
            <!-- Cột trái: Thông tin chính -->
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Thông tin cơ bản</div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Hình ảnh</label>
                                <div class="border rounded bg-light d-flex align-items-center justify-content-center mb-2 position-relative"
                                    style="aspect-ratio: 1/1; overflow: hidden;">
                                    <?php
                                    $image = trim((string) ($row['image'] ?? ''));
                                    ?>
                                    
                                    <?php if ($image !== ''): ?>
                                        <iframe id="driveFrame" src="https://drive.google.com/file/d/<?= urlencode($image) ?>/preview" class="w-100 h-100 position-absolute" style="top:0; left:0; border:none;" scrolling="no"></iframe>
                                    <?php endif; ?>
                                    
                                    <img id="imagePreview" src="" class="img-fluid w-100 h-100 d-none position-absolute" style="object-fit: cover; top:0; left:0; z-index:10;" alt="Preview">
                                    <i id="noImageText" class="bi bi-image text-muted fs-1 <?= $image !== '' ? 'd-none' : '' ?>"></i>
                                </div>
                                <input type="file" name="image_file" id="imageInput" class="form-control form-control-sm" accept="image/*">
                            </div>
                            <div class="col-md-8">
                                <div class="mb-3">
                                    <label class="form-label">Tên dịch vụ</label>
                                    <input type="text" name="name" class="form-control" value="<?= admin_h((string) ($row['name'] ?? '')) ?>" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Mô tả ảnh (ALT)</label>
                                    <input type="text" name="alt" class="form-control" value="<?= admin_h((string) ($row['alt'] ?? '')) ?>">
                                </div>
                                <div>
                                    <label class="form-label">Giới thiệu ngắn</label>
                                    <textarea name="description" class="form-control" rows="3" required><?= admin_h((string) ($row['description'] ?? '')) ?></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Bảng giá chuyên sâu (Pricing)</div>
                        <div class="mb-3">
                            <label class="form-label">Loại hình tính phí</label>
                            <select id="pricing_type_select" class="form-select border-primary fw-bold" style="border-width: 2px !important;">
                                <option value="per_m2" <?= $pType === 'per_m2' ? 'selected' : '' ?>>Tính theo m2 (Diện tích)</option>
                                <option value="package" <?= $pType === 'package' ? 'selected' : '' ?>>Tính theo Gói (Số phòng/đặc thù)</option>
                            </select>
                        </div>

                        <!-- Giao diện cho per_m2 -->
                        <div id="pricing_per_m2_box" class="<?= $pType !== 'per_m2' ? 'd-none' : '' ?>">
                            <div class="row g-2 mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small">Giá cơ bản (VNĐ/m2)</label>
                                    <input type="number" id="base_price" class="form-control" value="<?= (int) ($pricing['base_price'] ?? 15000) ?>">
                                </div>
                                
                            </div>
                            <label class="form-label small">Hệ số mức độ sạch (Levels)</label>
                            <div class="row g-2 mb-3">
                                <div class="col-4">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text">Nhẹ</span>
                                        <input type="number" id="level_nhẹ" class="form-control" step="0.1" value="<?= (float) ($pricing['levels']['nhẹ'] ?? 0.7) ?>">
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text">Thường</span>
                                        <input type="number" id="level_tiêu_chuẩn" class="form-control" step="0.1" value="<?= (float) ($pricing['levels']['tiêu chuẩn'] ?? 1) ?>">
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text">Sâu</span>
                                        <input type="number" id="level_sâu" class="form-control" step="0.1" value="<?= (float) ($pricing['levels']['sâu'] ?? 1.2) ?>">
                                    </div>
                                </div>
                            </div>
                            <label class="form-label small d-flex justify-content-between mb-1">
                                Dự toán thực hiện (Estimated)
                                <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none" onclick="addEstimatedRow()">+ Thêm dự toán</button>
                            </label>
                            <div class="bg-light p-2 rounded">
                                <div class="row g-1 mb-2 text-secondary small fw-bold px-1">
                                    <div class="col">Mét Vuông</div>
                                    <div class="col">Số Nhân Viên</div>
                                    <div class="col">Số Giờ Làm</div>
                                    <div class="col-auto" style="width: 25px;"></div>
                                </div>
                                <div id="estimated_rows"></div>
                            </div>
                        </div>

                        <!-- Giao diện cho package -->
                        <div id="pricing_package_box" class="<?= $pType !== 'package' ? 'd-none' : '' ?>">
                            <label class="form-label small d-flex justify-content-between">
                                Danh sách các gói dịch vụ
                                <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none" onclick="addPackageRow()">+ Thêm gói</button>
                            </label>
                            <div id="package_rows" class="bg-light p-2 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cột phải: Lists -->
            <div class="col-lg-4">
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Loại hình áp dụng</div>
                        <label class="form-label small">Mỗi dòng 1 loại</label>
                        <textarea name="loai_text" class="form-control" rows="4" required><?= admin_h(implode("\n", $row['loai'] ?? [])) ?></textarea>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Công việc bao gồm</div>
                        <label class="form-label small">Mỗi dòng 1 công việc</label>
                        <textarea name="includes_text" class="form-control" rows="8" required><?= admin_h(implode("\n", $row['includes'] ?? [])) ?></textarea>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Khung giờ phục vụ</div>
                        <div id="ts_rows" class="d-flex flex-column gap-2"></div>
                        <button type="button" class="btn btn-sm btn-outline-primary w-100 mt-2" onclick="addTsRow()">+ Thêm khung giờ</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mt-3">
            <div class="card-body d-flex justify-content-end gap-2">
                <a href="quan-ly-dich-vu.php" class="btn btn-light border px-4">Hủy</a>
                <button type="submit" class="btn btn-primary px-5 fw-bold"><i class="bi bi-save me-1"></i>LƯU THAY ĐỔI</button>
            </div>
        </div>
    </form>

    <script>
        // --- Utils ---
        function createRow(containerId, html) {
            const div = document.createElement('div');
            div.className = 'row g-1 mb-1 align-items-center pricing-sub-row';
            div.innerHTML = html + '<div class="col-auto"><button type="button" class="btn btn-sm text-danger p-0" onclick="this.closest(\'.pricing-sub-row\').remove()"><i class="bi bi-x-circle"></i></button></div>';
            document.getElementById(containerId).appendChild(div);
        }

        function addTsRow(v = '', l = '') {
            createRow('ts_rows', `
                <div class="col"><input type="text" name="ts_value[]" class="form-control form-control-sm" placeholder="morning" value="${v}"></div>
                <div class="col-7"><input type="text" name="ts_label[]" class="form-control form-control-sm" placeholder="08:00 - 11:00" value="${l}"></div>
            `);
        }

        function addEstimatedRow(a = '', s = '', h = '') {
            createRow('estimated_rows', `
                <div class="col"><input type="number" class="form-control form-control-sm est-area" placeholder="Diện tích" value="${a}"></div>
                <div class="col"><input type="number" class="form-control form-control-sm est-staff" placeholder="Nhân viên" value="${s}"></div>
                <div class="col"><input type="number" class="form-control form-control-sm est-hours" placeholder="Số giờ" value="${h}"></div>
            `);
        }

        function addPackageRow(n = '', p = '', s = '', h = '') {
            createRow('package_rows', `
                <div class="col-5"><input type="text" class="form-control form-control-sm pkg-name" placeholder="Tên gói" value="${n}"></div>
                <div class="col"><input type="number" class="form-control form-control-sm pkg-price" placeholder="Giá" value="${p}"></div>
                <div class="col"><input type="number" class="form-control form-control-sm pkg-staff" placeholder="NV" value="${s}"></div>
                <div class="col"><input type="number" class="form-control form-control-sm pkg-hours" placeholder="Giờ" value="${h}"></div>
            `);
        }

        document.getElementById('pricing_type_select').onchange = function () {
            const isM2 = this.value === 'per_m2';
            document.getElementById('pricing_per_m2_box').classList.toggle('d-none', !isM2);
            document.getElementById('pricing_package_box').classList.toggle('d-none', isM2);
        };

        const currentPricing = <?= json_encode($pricing) ?>;
        const currentTs = <?= json_encode($row['time_slots'] ?? []) ?>;

        if (currentTs.length > 0) {
            currentTs.forEach(ts => addTsRow(ts.value, ts.label));
        } else {
            addTsRow();
        }

        if (currentPricing.type === 'package' && currentPricing.packages) {
            currentPricing.packages.forEach(p => addPackageRow(p.name, p.price, p.staff, p.hours));
        } else if (currentPricing.type === 'per_m2' && currentPricing.estimated) {
            currentPricing.estimated.forEach(e => addEstimatedRow(e.area, e.staff, e.hours));
        } else {
            addEstimatedRow(50, 2, 3);
            addPackageRow();
        }

        document.getElementById('editServiceForm').onsubmit = function (e) {
            const type = document.getElementById('pricing_type_select').value;
            let pData = { type: type };
            if (type === 'per_m2') {
                pData.base_price = parseInt(document.getElementById('base_price').value) || 0;
                pData.levels = {
                    "nhẹ": parseFloat(document.getElementById('level_nhẹ').value) || 1,
                    "tiêu chuẩn": parseFloat(document.getElementById('level_tiêu_chuẩn').value) || 1,
                    "sâu": parseFloat(document.getElementById('level_sâu').value) || 1
                };
                pData.estimated = [];
                document.querySelectorAll('#estimated_rows .pricing-sub-row').forEach(row => {
                    const a = row.querySelector('.est-area').value;
                    const s = row.querySelector('.est-staff').value;
                    const h = row.querySelector('.est-hours').value;
                    if (a && s && h) pData.estimated.push({ area: parseInt(a), staff: parseInt(s), hours: parseFloat(h) });
                });
            } else {
                pData.packages = [];
                document.querySelectorAll('#package_rows .pricing-sub-row').forEach(row => {
                    const n = row.querySelector('.pkg-name').value;
                    const p = row.querySelector('.pkg-price').value;
                    const s = row.querySelector('.pkg-staff').value;
                    const h = row.querySelector('.pkg-hours').value;
                    if (n && p) pData.packages.push({ name: n, price: parseInt(p), staff: parseInt(s) || 1, hours: parseFloat(h) || 1 });
                });
            }
            document.getElementById('pricing_json').value = JSON.stringify(pData);
        };

        document.getElementById('imageInput').onchange = function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('imagePreview').src = e.target.result;
                    document.getElementById('imagePreview').classList.remove('d-none');
                    document.getElementById('noImageText').classList.add('d-none');
                    const driveFrame = document.getElementById('driveFrame');
                    if (driveFrame) driveFrame.classList.add('d-none');
                };
                reader.readAsDataURL(file);
            }
        };
    </script>
<?php endif; ?>

<?php admin_render_layout_end(); ?>