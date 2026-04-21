<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';

$admin = admin_require_login();

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

admin_render_layout_start('Thêm Dịch Vụ Thuê Tài Xế', 'services', $admin);
?>

<style>
    .admin-main,
    .admin-main > main {
        background: #ffffff !important;
    }
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
    <h2 class="h4 mb-0 fw-bold">Thêm dịch vụ mới</h2>
    <a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lại danh sách</a>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<form method="post" action="xu-ly-them-dich-vu.php" enctype="multipart/form-data" class="card border-0 shadow-sm">
    <div class="card-header bg-white fw-semibold">Thông tin dịch vụ (cấu trúc services.json)</div>
    <div class="card-body">
        <div class="row g-3">
            <div class="col-12 col-md-6">
                <label class="form-label">Tên dịch vụ (name)</label>
                <input type="text" class="form-control" name="name" required>
                <div class="form-text text-muted small">Ví dụ: Lái xe theo giờ, Lái xe theo ngày, Lái xe đường dài...</div>
            </div>
            <div class="col-12 col-md-6">
                <label class="form-label">Hình ảnh (image) - tải lên thư mục assets</label>
                <input type="file" class="form-control" name="image_file" accept="image/png,image/jpeg,image/webp,image/gif" required>
                <div class="form-text">Hệ thống sẽ tự động lưu ảnh vào thư mục assets và sinh đường dẫn image.</div>
            </div>
            <div class="col-12">
                <label class="form-label">Alt (alt)</label>
                <input type="text" class="form-control" name="alt" placeholder="Mô tả alt cho hình ảnh">
                <div class="form-text text-muted small">Ví dụ: Dịch vụ thuê tài xế lái xe theo giờ</div>
            </div>
            <div class="col-12">
                <label class="form-label">Mô tả (description)</label>
                <textarea class="form-control" name="description" rows="4" required></textarea>
                <div class="form-text text-muted small">Mô tả chi tiết về dịch vụ, lợi ích khi sử dụng.</div>
            </div>
            <div class="col-12">
                <label class="form-label">Dịch vụ bao gồm (includes) - mỗi dòng là 1 mục</label>
                <textarea class="form-control" name="includes_text" rows="6" placeholder="Tài xế có kinh nghiệm 5 năm&#10;Xe sạch sẽ máy lạnh&#10;Hỗ trợ mang vác hành lý&#10;Đúng giờ tuyệt đối" required></textarea>
                <div class="form-text text-muted small">Mỗi dòng là một điểm nổi bật của dịch vụ.</div>
            </div>
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">Bảng giá (pricing)</label>
                    <button class="btn btn-sm btn-outline-primary" type="button" id="btn-add-pricing"><i class="bi bi-plus-circle me-1"></i>Thêm dòng giá</button>
                </div>
                <div id="pricing-rows" class="d-flex flex-column gap-2">
                    <div class="row g-2 pricing-row">
                        <div class="col-12 col-md-3"><input type="text" class="form-control" name="pricing_label[]" placeholder="Tên gói (VD: Gói 4 giờ)" required></div>
                        <div class="col-12 col-md-3"><input type="number" class="form-control" name="pricing_value[]" placeholder="Giá (VNĐ)" min="0" step="1000" required></div>
                        <div class="col-12 col-md-2"><input type="number" class="form-control" name="pricing_hours[]" placeholder="Số giờ" min="0.5" step="0.5" required></div>
                        <div class="col-12 col-md-3"><input type="text" class="form-control" name="pricing_type[]" placeholder="Loại (hourly/daily/long_distance)" required></div>
                        <div class="col-12 col-md-1 d-grid"><button type="button" class="btn btn-outline-danger btn-remove-pricing" title="Xóa dòng"><i class="bi bi-trash"></i></button></div>
                    </div>
                </div>
                <div class="form-text text-muted small mt-2">
                    <strong>Hướng dẫn:</strong> Mỗi dòng là một gói dịch vụ.<br>
                    - <strong>label</strong>: Tên gói (VD: Gói 4 giờ, Gói 8 giờ, 1 Ngày)<br>
                    - <strong>value</strong>: Giá tiền (VNĐ)<br>
                    - <strong>hours</strong>: Số giờ của gói<br>
                    - <strong>type</strong>: Loại gói (hourly: theo giờ, daily: theo ngày, long_distance: đường dài)
                </div>
            </div>
        </div>
    </div>
    <div class="card-footer bg-white d-flex justify-content-end gap-2">
        <a href="quan-ly-dich-vu.php" class="btn btn-light border">Hủy</a>
        <button type="submit" class="btn btn-success"><i class="bi bi-save me-1"></i>Lưu dịch vụ</button>
    </div>
</form>

<script>
(function () {
    var container = document.getElementById('pricing-rows');
    var addButton = document.getElementById('btn-add-pricing');

    function bindRemoveButtons() {
        var removeButtons = container.querySelectorAll('.btn-remove-pricing');
        removeButtons.forEach(function (button) {
            button.onclick = function () {
                var rows = container.querySelectorAll('.pricing-row');
                if (rows.length <= 1) {
                    return;
                }
                button.closest('.pricing-row').remove();
            };
        });
    }

    addButton.addEventListener('click', function () {
        var firstRow = container.querySelector('.pricing-row');
        if (!firstRow) {
            return;
        }

        var clone = firstRow.cloneNode(true);
        clone.querySelectorAll('input').forEach(function (input) {
            input.value = '';
        });
        container.appendChild(clone);
        bindRemoveButtons();
    });

    bindRemoveButtons();
})();
</script>

<?php admin_render_layout_end(); ?>