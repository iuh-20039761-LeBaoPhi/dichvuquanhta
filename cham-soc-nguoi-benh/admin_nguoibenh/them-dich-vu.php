<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';

$admin = admin_require_login();

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

admin_render_layout_start('Thêm Dịch Vụ', 'services', $admin);
?>

<style>
    :root {
        --admin-primary: #4361ee;
        --admin-secondary: #8392a5;
        --admin-success: #2ec4b6;
        --admin-warning: #ff9f1c;
        --admin-bg: #f8f9fa;
    }

    .admin-main,
    .admin-main>main {
        background: var(--admin-bg) !important;
    }

    .card {
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.05) !important;
        transition: box-shadow 0.2s ease;
    }

    .card:hover {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08) !important;
    }

    .form-label {
        font-weight: 700;
        color: #000;
        margin-bottom: 3px;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .form-control,
    .form-select {
        border-radius: 4px;
        border: 1px solid #000 !important;
        padding: 0.5rem 0.75rem;
        font-size: 0.95rem;
        color: #000;
        font-weight: 500;
    }

    .form-control:focus {
        border-color: var(--admin-primary) !important;
        box-shadow: 0 0 0 0.2rem rgba(67, 97, 238, 0.1);
    }
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
    <div class="d-flex align-items-center">
        <div class="bg-success bg-opacity-10 p-2 rounded-2 me-3">
            <i class="bi bi-plus-square text-success fs-5"></i>
        </div>
        <h2 class="h4 mb-0 fw-bold">Thêm dịch vụ mới</h2>
    </div>
    <a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay
        lại</a>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2 shadow-sm border-0"
        style="border-radius: 4px;"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<form id="addServiceForm" method="post" action="xu-ly-them-dich-vu.php" enctype="multipart/form-data">
    <div class="row compact-row g-1">
        <!-- Ô 1: Thông tin & Mô tả (7/12) -->
        <div class="col-lg-7">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white py-2 border-bottom border-light">
                    <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-plus-circle-fill me-2 text-success"></i>Thông tin
                        cơ bản & Mô tả</h6>
                </div>
                <div class="card-body p-3 h-100">
                    <div class="row g-3 h-100">
                        <div class="col-md-5 d-flex flex-column">
                            <label class="form-label">Hình ảnh minh họa</label>
                            <div class="service-image-container rounded-2 overflow-hidden border mb-2 bg-light d-flex align-items-center justify-content-center flex-grow-1"
                                style="aspect-ratio: 1/1; min-height: 200px;">
                                <img id="imagePreview" src="" class="img-fluid w-100 h-100 d-none"
                                    style="object-fit: cover;" alt="Preview">
                                <div id="noImageText" class="text-secondary text-center p-2">
                                    <i class="bi bi-image fs-2 opacity-25 d-block"></i>
                                    <span class="small d-block mt-1">Chưa có ảnh</span>
                                </div>
                            </div>
                            <input type="file" class="form-control form-control-sm mt-auto" name="image_file"
                                id="imageInput" accept="image/png,image/jpeg,image/webp,image/gif" required>
                        </div>

                        <div class="col-md-7 d-flex flex-column">
                            <div class="mb-2">
                                <label class="form-label">Tên dịch vụ</label>
                                <input type="text" class="form-control fw-bold text-success" name="name"
                                    placeholder="VD: Tắm bé sơ sinh" required>
                            </div>
                            <div class="mb-2">
                                <label class="form-label">Mô tả ảnh (SEO)</label>
                                <input type="text" class="form-control" name="alt" placeholder="Mô tả nội dung tấm ảnh">
                            </div>
                            <div class="flex-grow-1 d-flex flex-column">
                                <label class="form-label">Mô tả chi tiết kỹ thuật</label>
                                <textarea class="form-control flex-grow-1" name="description"
                                    placeholder="Mô tả đầy đủ về dịch vụ tại đây..." required
                                    style="font-size: 0.95rem; line-height: 1.5; border-left: 3px solid var(--admin-success) !important; min-height: 100px;"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Ô 2: Danh sách công việc (5/12) -->
        <div class="col-lg-5">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white py-2 border-bottom border-light">
                    <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-ui-checks me-2 text-success"></i>Nội dung thực
                        hiện</h6>
                </div>
                <div class="card-body p-3 d-flex flex-column h-100">
                    <label class="form-label">Công việc bao gồm (Mỗi dòng 1 mục):</label>
                    <textarea class="form-control flex-grow-1" name="includes_text"
                        placeholder="VD: Tắm bé&#10;Vệ sinh rốn&#10;Massage cho bé" required
                        style="font-size: 0.95rem; border-left: 3px solid var(--admin-success) !important; min-height: 250px;"></textarea>
                    <div class="form-text small mt-1">Xuống dòng để tạo mục mới.</div>
                </div>
            </div>
        </div>

        <!-- Ô 3: Bảng giá (12/12) -->
        <div class="col-12 mt-1">
            <div class="card border-0 shadow-sm">
                <div
                    class="card-header bg-white py-2 border-bottom border-light d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-tags-fill me-2 text-success"></i>Thiết lập bảng
                        giá gói</h6>
                    <button class="btn btn-sm btn-success rounded-pill px-3" type="button" id="btn-add-pricing">
                        <i class="bi bi-plus-lg me-1"></i>Thêm dòng
                    </button>
                </div>
                <div class="card-body p-2 px-3">
                    <div id="pricing-rows">
                        <div class="row g-2 mb-2 d-none d-md-flex text-muted fw-bold"
                            style="font-size: 0.7rem; text-transform: uppercase;">
                            <div class="col-md-3 ms-2">Khung giờ</div>
                            <div class="col-md-3">Giá (VNĐ)</div>
                            <div class="col-md-2 text-center">Thời lượng(tiếng)</div>
                            <div class="col-md-3">ký hiệu gói(viết liền không dấu)</div>
                        </div>
                        <div class="d-flex flex-column gap-1">
                            <div
                                class="row g-2 pricing-row align-items-center bg-light bg-opacity-25 p-1 rounded-1 border border-light mx-0 mb-1">
                                <div class="col-md-3">
                                    <input type="text" class="form-control form-control-sm border-0 bg-white"
                                        name="pricing_label[]" placeholder="Tên gói" required>
                                </div>
                                <div class="col-md-3">
                                    <input type="number"
                                        class="form-control form-control-sm border-0 bg-white fw-bold text-success"
                                        name="pricing_value[]" placeholder="0" min="0" step="1000" required>
                                </div>
                                <div class="col-md-2">
                                    <input type="number"
                                        class="form-control form-control-sm border-0 bg-white text-center"
                                        name="pricing_hours[]" placeholder="0" min="0.1" step="0.1" required>
                                </div>
                                <div class="col-md-3">
                                    <input type="text" class="form-control form-control-sm border-0 bg-white"
                                        name="pricing_type[]" placeholder="VD: theo_gio" required>
                                </div>
                                <div class="col-md-1 text-center">
                                    <button type="button" class="btn btn-sm btn-outline-danger border-0 p-0" title="Xóa"
                                        onclick="this.closest('.pricing-row').remove()">
                                        <i class="bi bi-dash-circle-fill fs-5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-white py-3 border-top border-light d-flex justify-content-end gap-2">
                    <a href="quan-ly-dich-vu.php" class="btn btn-light px-4 border shadow-sm">Hủy bỏ</a>
                    <button type="submit" class="btn btn-success px-5 fw-bold shadow-sm">
                        <i class="bi bi-check-circle-fill me-2"></i>LƯU DỊCH VỤ MỚI
                    </button>
                </div>
            </div>
        </div>
    </div>
</form>

<script>
    (function () {
        // Image preview
        var imageInput = document.getElementById('imageInput');
        var imagePreview = document.getElementById('imagePreview');
        var noImageText = document.getElementById('noImageText');

        imageInput.onchange = function () {
            var file = this.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('d-none');
                    noImageText.classList.add('d-none');
                }
                reader.readAsDataURL(file);
            }
        };

        // Pricing rows logic
        var container = document.querySelector('#pricing-rows > .d-flex');
        var addButton = document.getElementById('btn-add-pricing');

        function bindRemoveButtons() {
            var removeButtons = container.querySelectorAll('.btn-remove-pricing');
            removeButtons.forEach(function (button) {
                button.onclick = function () {
                    var rows = container.querySelectorAll('.pricing-row');
                    if (rows.length <= 1) return;
                    button.closest('.pricing-row').remove();
                };
            });
        }

        addButton.addEventListener('click', function () {
            var firstRow = container.querySelector('.pricing-row');
            if (!firstRow) return;
            var clone = firstRow.cloneNode(true);
            clone.querySelectorAll('input').forEach(function (input) { input.value = ''; });
            container.appendChild(clone);
            bindRemoveButtons();
        });

        bindRemoveButtons();
    })();
</script>

<?php admin_render_layout_end(); ?>