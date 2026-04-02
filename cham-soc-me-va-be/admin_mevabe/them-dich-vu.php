<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';

$admin = admin_require_login();

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

admin_render_layout_start('Them Dich Vu', 'services', $admin);
?>

<style>
    .admin-main,
    .admin-main > main {
        background: #ffffff !important;
    }
</style>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
    <h2 class="h4 mb-0 fw-bold">Them dich vu moi</h2>
    <a href="quan-ly-dich-vu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lai danh sach</a>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<form method="post" action="xu-ly-them-dich-vu.php" enctype="multipart/form-data" class="card border-0 shadow-sm">
    <div class="card-header bg-white fw-semibold">Thong tin giong cau truc services.json</div>
    <div class="card-body">
        <div class="row g-3">
            <div class="col-12 col-md-6">
                <label class="form-label">name</label>
                <input type="text" class="form-control" name="name" required>
            </div>
            <div class="col-12 col-md-6">
                <label class="form-label">image (tai len vao assets)</label>
                <input type="file" class="form-control" name="image_file" accept="image/png,image/jpeg,image/webp,image/gif" required>
                <div class="form-text">He thong se tu dong luu anh vao thu muc assets va sinh duong dan image.</div>
            </div>
            <div class="col-12">
                <label class="form-label">alt</label>
                <input type="text" class="form-control" name="alt" placeholder="Mo ta alt cho hinh anh">
            </div>
            <div class="col-12">
                <label class="form-label">description</label>
                <textarea class="form-control" name="description" rows="4" required></textarea>
            </div>
            <div class="col-12">
                <label class="form-label">includes (moi dong la 1 muc)</label>
                <textarea class="form-control" name="includes_text" rows="6" placeholder="Muc 1&#10;Muc 2&#10;Muc 3" required></textarea>
            </div>
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">pricing</label>
                    <button class="btn btn-sm btn-outline-primary" type="button" id="btn-add-pricing"><i class="bi bi-plus-circle me-1"></i>Them dong gia</button>
                </div>
                <div id="pricing-rows" class="d-flex flex-column gap-2">
                    <div class="row g-2 pricing-row">
                        <div class="col-12 col-md-3"><input type="text" class="form-control" name="pricing_label[]" placeholder="label" required></div>
                        <div class="col-12 col-md-3"><input type="number" class="form-control" name="pricing_value[]" placeholder="value" min="0" step="1000" required></div>
                        <div class="col-12 col-md-2"><input type="number" class="form-control" name="pricing_hours[]" placeholder="hours" min="0.5" step="0.5" required></div>
                        <div class="col-12 col-md-3"><input type="text" class="form-control" name="pricing_type[]" placeholder="type" required></div>
                        <div class="col-12 col-md-1 d-grid"><button type="button" class="btn btn-outline-danger btn-remove-pricing" title="Xoa dong"><i class="bi bi-trash"></i></button></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="card-footer bg-white d-flex justify-content-end gap-2">
        <a href="quan-ly-dich-vu.php" class="btn btn-light border">Huy</a>
        <button type="submit" class="btn btn-success"><i class="bi bi-save me-1"></i>Luu dich vu</button>
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
