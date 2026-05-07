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
    $pricing  = is_array($row['pricing'] ?? null) ? $row['pricing'] : [];
    $pType    = (string) ($pricing['type'] ?? 'per_m2');

    // Lấy base_price: ưu tiên pricing.base_price đã lưu, fallback về price_m2_min
    $basePrice = (float) ($pricing['base_price'] ?? $row['price_m2_min'] ?? 0);
    if ($basePrice === 0.0) {
        $basePrice = (float) ($row['price_m2_min'] ?? 0);
    }

    // Levels: dùng đã lưu hoặc mặc định
    $lvlNhe    = (float) ($pricing['levels']['nhẹ']          ?? 0.7);
    $lvlTc     = (float) ($pricing['levels']['tiêu chuẩn']   ?? 1.0);
    $lvlSau    = (float) ($pricing['levels']['sâu']          ?? 1.2);
    ?>
    <form id="editServiceForm" method="post" action="xu-ly-sua-dich-vu.php" enctype="multipart/form-data">
        <input type="hidden" name="id" value="<?= (int) $id ?>">
        <input type="hidden" name="pricing_json" id="pricing_json">
        <input type="hidden" name="current_image" value="<?= admin_h((string) ($row['image'] ?? '')) ?>">

        <div class="row g-3">
            <!-- ── Cột trái: Thông tin chính ── -->
            <div class="col-lg-8">

                <!-- Card: Thông tin cơ bản -->
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Thông tin cơ bản</div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Hình ảnh</label>
                                <div class="border rounded bg-light d-flex align-items-center justify-content-center mb-2 position-relative"
                                    style="aspect-ratio: 1/1; overflow: hidden;">
                                    <?php $image = trim((string) ($row['image'] ?? '')); ?>
                                    <?php if ($image !== ''): ?>
                                        <iframe id="driveFrame"
                                            src="https://drive.google.com/file/d/<?= urlencode($image) ?>/preview"
                                            class="w-100 h-100 position-absolute"
                                            style="top:0;left:0;border:none;" scrolling="no"></iframe>
                                    <?php endif; ?>
                                    <img id="imagePreview" src=""
                                        class="img-fluid w-100 h-100 d-none position-absolute"
                                        style="object-fit:cover;top:0;left:0;z-index:10;" alt="Preview">
                                    <i id="noImageText"
                                        class="bi bi-image text-muted fs-1 <?= $image !== '' ? 'd-none' : '' ?>"></i>
                                </div>
                                <input type="file" name="image_file" id="imageInput"
                                    class="form-control form-control-sm" accept="image/*">
                                <div class="form-text">Để trống = giữ ảnh cũ</div>
                            </div>
                            <div class="col-md-8">
                                <div class="mb-3">
                                    <label class="form-label">Tên dịch vụ <span class="text-danger">*</span></label>
                                    <input type="text" name="name" class="form-control"
                                        value="<?= admin_h((string) ($row['name'] ?? '')) ?>" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Mô tả ảnh (ALT)</label>
                                    <input type="text" name="alt" class="form-control"
                                        value="<?= admin_h((string) ($row['alt'] ?? '')) ?>"
                                        placeholder="Mô tả cho SEO">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Danh mục</label>
                                    <select name="category" class="form-select">
                                        <?php
                                        $cats = ['coban' => 'Cơ bản', 'nangcao' => 'Nâng cao', 'thietke' => 'Thiết kế', 'ray' => 'Rẫy', 'vesinh' => 'Vệ sinh'];
                                        $curCat = (string) ($row['category'] ?? 'coban');
                                        foreach ($cats as $val => $label):
                                        ?>
                                            <option value="<?= $val ?>" <?= $curCat === $val ? 'selected' : '' ?>><?= $label ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">Giới thiệu ngắn <span class="text-danger">*</span></label>
                                    <textarea name="description" class="form-control" rows="3"
                                        required><?= admin_h((string) ($row['description'] ?? '')) ?></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card: Bảng giá -->
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Bảng giá</div>

                        <!-- Loại tính phí -->
                        <div class="mb-3">
                            <label class="form-label">Loại hình tính phí</label>
                            <select id="pricing_type_select" class="form-select fw-bold"
                                style="border:2px solid var(--admin-primary)!important;">
                                <option value="per_m2"  <?= $pType === 'per_m2'  ? 'selected' : '' ?>>Tính theo m² (Diện tích)</option>
                                <option value="package" <?= $pType === 'package' ? 'selected' : '' ?>>Tính theo Gói (Số phòng / đặc thù)</option>
                            </select>
                        </div>

                        <!-- ── Per m² ── -->
                        <div id="pricing_per_m2_box" class="<?= $pType !== 'per_m2' ? 'd-none' : '' ?>">

                            <!-- Giá cơ bản + ghi chú -->
                            <div class="row g-2 mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small">Giá cơ bản (VNĐ/m²) <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <input type="number" id="base_price" class="form-control"
                                            min="0" step="500"
                                            value="<?= (int) $basePrice ?>"
                                            placeholder="VD: 15000">
                                        <span class="input-group-text text-muted small">đ/m²</span>
                                    </div>
                                    <?php if ($basePrice > 0): ?>
                                        <div class="form-text text-success fw-bold">
                                            Hiện tại: <?= number_format($basePrice) ?>đ/m²
                                        </div>
                                    <?php endif; ?>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small">Ghi chú giá</label>
                                    <input type="text" name="price_note" class="form-control"
                                        value="<?= admin_h((string) ($row['price_note'] ?? '')) ?>"
                                        placeholder="VD: Giá có thể thay đổi theo diện tích">
                                </div>
                            </div>

                            <!-- Hệ số levels -->
                            <div class="mb-3">
                                <label class="form-label small">Hệ số mức độ (Levels)</label>
                                <div class="row g-2">
                                    <div class="col-4">
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text bg-success bg-opacity-10 text-success fw-bold">Nhẹ</span>
                                            <input type="number" id="level_nhẹ" class="form-control"
                                                step="0.1" min="0.1" value="<?= $lvlNhe ?>">
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text bg-primary bg-opacity-10 text-primary fw-bold">Thường</span>
                                            <input type="number" id="level_tiêu_chuẩn" class="form-control"
                                                step="0.1" min="0.1" value="<?= $lvlTc ?>">
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text bg-danger bg-opacity-10 text-danger fw-bold">Sâu</span>
                                            <input type="number" id="level_sâu" class="form-control"
                                                step="0.1" min="0.1" value="<?= $lvlSau ?>">
                                        </div>
                                    </div>
                                </div>
                                <!-- Preview giá tính toán -->
                                <div id="price_preview" class="mt-2 p-2 rounded bg-light small text-muted">
                                    Nhập giá cơ bản để xem dự tính...
                                </div>
                            </div>

                            <!-- Dự toán estimated -->
                            <div>
                                <label class="form-label small d-flex justify-content-between mb-1">
                                    Dự toán nguồn lực (Estimated)
                                    <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none"
                                        onclick="addEstimatedRow()">+ Thêm dòng</button>
                                </label>
                                <div class="bg-light p-2 rounded">
                                    <div class="row g-1 mb-2 text-secondary small fw-bold px-1">
                                        <div class="col">Diện tích (m²)</div>
                                        <div class="col">Nhân viên</div>
                                        <div class="col">Số giờ</div>
                                        <div class="col-auto" style="width:28px;"></div>
                                    </div>
                                    <div id="estimated_rows"></div>
                                </div>
                            </div>
                        </div>

                        <!-- ── Package ── -->
                        <div id="pricing_package_box" class="<?= $pType !== 'package' ? 'd-none' : '' ?>">
                            <label class="form-label small d-flex justify-content-between mb-1">
                                Danh sách gói dịch vụ
                                <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none"
                                    onclick="addPackageRow()">+ Thêm gói</button>
                            </label>
                            <div class="bg-light p-2 rounded">
                                <div class="row g-1 mb-2 text-secondary small fw-bold px-1">
                                    <div class="col-5">Tên gói</div>
                                    <div class="col">Giá (đ)</div>
                                    <div class="col">NV</div>
                                    <div class="col">Giờ</div>
                                    <div class="col-auto" style="width:28px;"></div>
                                </div>
                                <div id="package_rows"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card: Thông tin bổ sung -->
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Thông tin bổ sung</div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label small">Thời gian thực hiện</label>
                                <input type="text" name="duration" class="form-control"
                                    value="<?= admin_h((string) ($row['duration'] ?? '')) ?>"
                                    placeholder="VD: 30-60 phút">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small">Độ khó</label>
                                <select name="difficulty" class="form-select">
                                    <?php
                                    $diffs = ['easy' => 'Dễ', 'medium' => 'Trung bình', 'hard' => 'Khó'];
                                    $curDiff = (string) ($row['difficulty'] ?? 'easy');
                                    foreach ($diffs as $val => $label):
                                    ?>
                                        <option value="<?= $val ?>" <?= $curDiff === $val ? 'selected' : '' ?>><?= $label ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Cột phải: Lists ── -->
            <div class="col-lg-4">
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Loại hình áp dụng</div>
                        <label class="form-label small">Mỗi dòng 1 loại</label>
                        <textarea name="loai_text" class="form-control" rows="4"
                            required><?= admin_h(implode("\n", !empty($row['loai']) ? $row['loai'] : array_filter(array_map('trim', explode(',', (string) ($row['service_area'] ?? '')))))) ?></textarea>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Công việc bao gồm</div>
                        <label class="form-label small">Mỗi dòng 1 công việc</label>
                        <textarea name="includes_text" class="form-control" rows="8"
                            required><?= admin_h(implode("\n", !empty($row['tags']) ? $row['tags'] : ($row['includes'] ?? []))) ?></textarea>
                    </div>
                </div>

                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <div class="section-title">Khung giờ phục vụ</div>
                        <div id="ts_rows" class="d-flex flex-column gap-2"></div>
                        <button type="button" class="btn btn-sm btn-outline-primary w-100 mt-2"
                            onclick="addTsRow()">+ Thêm khung giờ</button>
                    </div>
                </div>

                <!-- Tóm tắt giá hiện tại -->
                <div class="card border-0 shadow-sm mb-3" style="border-left:3px solid var(--admin-primary)!important;">
                    <div class="card-body py-3">
                        <div class="section-title mb-2">Giá hiện tại</div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="small text-muted">Giá min</span>
                            <span class="fw-bold text-success"><?= number_format((float) ($row['price_m2_min'] ?? 0)) ?>đ/m²</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="small text-muted">Giá max</span>
                            <span class="fw-bold text-primary"><?= number_format((float) ($row['price_m2_max'] ?? 0)) ?>đ/m²</span>
                        </div>
                        <div class="form-text mt-1">Sẽ tự tính lại khi lưu</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mt-3">
            <div class="card-body d-flex justify-content-between align-items-center gap-2">
                <a href="chi-tiet-dich-vu.php?id=<?= (int) $id ?>" class="btn btn-light border">
                    <i class="bi bi-eye me-1"></i>Xem chi tiết
                </a>
                <div class="d-flex gap-2">
                    <a href="quan-ly-dich-vu.php" class="btn btn-light border px-4">Hủy</a>
                    <button type="submit" class="btn btn-primary px-5 fw-bold">
                        <i class="bi bi-save me-1"></i>LƯU THAY ĐỔI
                    </button>
                </div>
            </div>
        </div>
    </form>

    <script>
        // ── Utils ──
        function createRow(containerId, html) {
            const div = document.createElement('div');
            div.className = 'row g-1 mb-1 align-items-center pricing-sub-row';
            div.innerHTML = html + '<div class="col-auto"><button type="button" class="btn btn-sm text-danger p-0" onclick="this.closest(\'.pricing-sub-row\').remove();updatePricePreview()"><i class="bi bi-x-circle"></i></button></div>';
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

        // ── Toggle loại giá ──
        document.getElementById('pricing_type_select').onchange = function () {
            const isM2 = this.value === 'per_m2';
            document.getElementById('pricing_per_m2_box').classList.toggle('d-none', !isM2);
            document.getElementById('pricing_package_box').classList.toggle('d-none', isM2);
            updatePricePreview();
        };

        // ── Live preview giá ──
        function fmt(n) { return Number(n).toLocaleString('vi-VN') + 'đ'; }

        function updatePricePreview() {
            const preview = document.getElementById('price_preview');
            if (!preview) return;
            const base  = parseInt(document.getElementById('base_price').value) || 0;
            const lNhe  = parseFloat(document.getElementById('level_nhẹ').value) || 0.7;
            const lTc   = parseFloat(document.getElementById('level_tiêu_chuẩn').value) || 1;
            const lSau  = parseFloat(document.getElementById('level_sâu').value) || 1.2;
            if (base <= 0) {
                preview.innerHTML = '<span class="text-muted">Nhập giá cơ bản để xem dự tính...</span>';
                return;
            }
            const pNhe = Math.round(base * lNhe);
            const pTc  = Math.round(base * lTc);
            const pSau = Math.round(base * lSau);
            preview.innerHTML = `
                <div class="d-flex gap-3 flex-wrap">
                    <span><span class="badge bg-success bg-opacity-10 text-success">Nhẹ</span> <strong>${fmt(pNhe)}/m²</strong></span>
                    <span><span class="badge bg-primary bg-opacity-10 text-primary">Thường</span> <strong>${fmt(pTc)}/m²</strong></span>
                    <span><span class="badge bg-danger bg-opacity-10 text-danger">Sâu</span> <strong>${fmt(pSau)}/m²</strong></span>
                    <span class="text-muted">→ Khoảng <strong>${fmt(pNhe)} – ${fmt(pSau)}</strong>/m²</span>
                </div>`;
        }

        // Gắn sự kiện live update
        ['base_price', 'level_nhẹ', 'level_tiêu_chuẩn', 'level_sâu'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updatePricePreview);
        });

        // ── Load dữ liệu hiện tại ──
        const currentPricing = <?= json_encode($pricing) ?>;
        const currentTs      = <?= json_encode($row['time_slots'] ?? []) ?>;

        // Time slots
        if (currentTs.length > 0) {
            currentTs.forEach(ts => addTsRow(ts.value ?? '', ts.label ?? ''));
        } else {
            addTsRow();
        }

        // Pricing rows
        if (currentPricing.type === 'package' && Array.isArray(currentPricing.packages) && currentPricing.packages.length > 0) {
            currentPricing.packages.forEach(p => addPackageRow(p.name ?? '', p.price ?? '', p.staff ?? '', p.hours ?? ''));
        } else if (Array.isArray(currentPricing.estimated) && currentPricing.estimated.length > 0) {
            currentPricing.estimated.forEach(e => addEstimatedRow(e.area ?? '', e.staff ?? '', e.hours ?? ''));
        } else {
            addEstimatedRow(50, 2, 3);
        }

        // Chạy preview ngay khi load
        updatePricePreview();

        // ── Submit: gom pricing_json ──
        document.getElementById('editServiceForm').onsubmit = function () {
            const type = document.getElementById('pricing_type_select').value;
            const pData = { type };

            if (type === 'per_m2') {
                pData.base_price = parseInt(document.getElementById('base_price').value) || 0;
                pData.levels = {
                    'nhẹ':          parseFloat(document.getElementById('level_nhẹ').value)          || 0.7,
                    'tiêu chuẩn':   parseFloat(document.getElementById('level_tiêu_chuẩn').value)   || 1,
                    'sâu':          parseFloat(document.getElementById('level_sâu').value)           || 1.2,
                };
                pData.estimated = [];
                document.querySelectorAll('#estimated_rows .pricing-sub-row').forEach(row => {
                    const a = row.querySelector('.est-area')?.value;
                    const s = row.querySelector('.est-staff')?.value;
                    const h = row.querySelector('.est-hours')?.value;
                    if (a && s && h) pData.estimated.push({ area: parseInt(a), staff: parseInt(s), hours: parseFloat(h) });
                });
            } else {
                pData.packages = [];
                document.querySelectorAll('#package_rows .pricing-sub-row').forEach(row => {
                    const n = row.querySelector('.pkg-name')?.value;
                    const p = row.querySelector('.pkg-price')?.value;
                    const s = row.querySelector('.pkg-staff')?.value;
                    const h = row.querySelector('.pkg-hours')?.value;
                    if (n && p) pData.packages.push({ name: n, price: parseInt(p), staff: parseInt(s) || 1, hours: parseFloat(h) || 1 });
                });
            }

            document.getElementById('pricing_json').value = JSON.stringify(pData);
        };

        // ── Preview ảnh mới ──
        document.getElementById('imageInput').onchange = function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                document.getElementById('imagePreview').src = e.target.result;
                document.getElementById('imagePreview').classList.remove('d-none');
                document.getElementById('noImageText').classList.add('d-none');
                const driveFrame = document.getElementById('driveFrame');
                if (driveFrame) driveFrame.classList.add('d-none');
            };
            reader.readAsDataURL(file);
        };
    </script>
<?php endif; ?>

<?php admin_render_layout_end(); ?>