<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Nội dung dịch vụ | Admin Chuyển Dọn';
$pageSlug = 'dich-vu-chuyen-don';
$pageUrl = '../../dich-vu-chuyen-don.html';

require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .service-content-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
    }

    .service-content-runtime {
        display: none;
        position: fixed;
        top: 22px;
        right: 22px;
        width: min(420px, calc(100vw - 28px));
        margin: 0;
        z-index: 2400;
        border-radius: 18px;
        border: 1px solid rgba(194, 122, 77, 0.18);
        background: rgba(255, 248, 242, 0.96);
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
        backdrop-filter: blur(12px);
    }

    .service-content-runtime.flash-error {
        border-color: rgba(239, 68, 68, 0.22);
        background: rgba(255, 245, 245, 0.97);
        box-shadow: 0 18px 42px rgba(127, 29, 29, 0.16);
    }

    .service-content-runtime .btn {
        min-width: 126px;
        justify-content: center;
    }

    /* ── Tab navigation ── */
    .sc-tabs-nav {
        display: flex;
        gap: 6px;
        padding: 8px;
        background: white;
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: var(--shadow-premium);
        margin-bottom: 24px;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .sc-tabs-nav::-webkit-scrollbar {
        display: none;
    }

    .sc-tab-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1;
        min-width: 120px;
        padding: 12px 20px;
        border: 1px solid transparent;
        border-radius: 12px;
        background: var(--slate-soft);
        color: var(--slate-light);
        font-family: inherit;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
        white-space: nowrap;
    }

    .sc-tab-btn i {
        font-size: 14px;
    }

    .sc-tab-btn:hover {
        background: white;
        border-color: var(--primary-soft);
        color: var(--primary);
    }

    .sc-tab-btn.is-active {
        background: linear-gradient(135deg, var(--primary), var(--primary-deep));
        border-color: transparent;
        color: white;
        box-shadow: 0 4px 14px rgba(194, 122, 77, .35);
    }

    /* ── Tab panels ── */
    .sc-tab-panel {
        display: none;
    }

    .sc-tab-panel.is-active {
        display: block;
        animation: fadeInUp .35s ease-out;
    }

    /* ── Panel accent ── */
    .panel-hero {
        border: 2px solid var(--primary);
        background: linear-gradient(135deg, rgba(194, 122, 77, .06), white);
    }

    /* ── Form groups ── */
    .form-group {
        margin-bottom: 28px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--line);
    }

    .form-group:last-of-type {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }

    .form-group__label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: var(--slate-light);
        margin-bottom: 16px;
    }

    .form-group__label i {
        color: var(--primary);
        font-size: 13px;
    }

    /* ── Service cards (JS-rendered) ── */
    .service-card-stack {
        display: grid;
        gap: 18px;
    }

    .service-content-card {
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, .92);
        box-shadow: var(--shadow-premium);
        overflow: hidden;
    }

    .service-content-card__head {
        padding: 18px 22px;
        border-bottom: 1px solid var(--line);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
    }

    .service-content-card__body {
        padding: 22px;
    }

    .service-content-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
    }

    .service-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 700;
        color: var(--slate);
    }

    .service-toggle input {
        width: 18px;
        height: 18px;
    }

    .service-items-textarea {
        min-height: 140px;
        resize: vertical;
    }

    .service-content-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
        flex-wrap: wrap;
    }

    .service-content-note {
        margin-top: 14px;
        font-size: 13px;
        color: var(--slate-light);
        line-height: 1.6;
    }

    .service-image-tools {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-top: 10px;
    }

    .service-image-picker {
        position: relative;
        overflow: hidden;
    }

    .service-image-picker input[type="file"] {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
    }

    .service-image-hint {
        font-size: 12px;
        color: var(--slate-light);
    }

    .service-image-preview {
        margin-top: 12px;
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 12px;
        background: rgba(241, 245, 249, 0.7);
    }

    .service-image-preview img {
        display: block;
        width: 100%;
        max-width: 280px;
        border-radius: 12px;
        border: 1px solid var(--line);
        background: white;
    }

    .service-image-preview a {
        display: inline-flex;
        margin-top: 10px;
        font-size: 12px;
        font-weight: 700;
        color: var(--primary-deep);
        text-decoration: none;
    }

    @media (max-width: 640px) {
        .service-content-runtime {
            top: 14px;
            right: 14px;
            left: 14px;
            width: auto;
        }

        .sc-tab-btn {
            font-size: 12px;
            padding: 10px 14px;
            min-width: 100px;
        }
    }
</style>

<!-- Page hero -->
<section class="hero-card service-content-hero">
    <div>
        <h1>Quản lý nội dung trang dịch vụ chuyển dọn</h1>
        <p>Sửa Hero, tiêu đề khối dịch vụ và 3 nhóm dịch vụ của trang <code>dich-vu-chuyen-don.html</code>. Dữ liệu lưu
            ở KRUD và trang public đọc trực tiếp từ API.</p>
    </div>
    <div class="hero-actions">
        <a href="<?php echo moving_admin_escape($pageUrl); ?>" target="_blank" rel="noopener" class="btn btn-outline">
            <i class="fas fa-arrow-up-right-from-square"></i>Xem trang public
        </a>
    </div>
</section>

<div id="service-content-runtime" class="flash service-content-runtime"></div>

<!-- Tab navigation -->
<nav class="sc-tabs-nav" role="tablist" aria-label="Quản lý nội dung dịch vụ">
    <button class="sc-tab-btn is-active" role="tab" aria-selected="true" aria-controls="sc-panel-hero" data-tab="hero"
        type="button">
        <i class="fas fa-star"></i>Hero
    </button>
    <button class="sc-tab-btn" role="tab" aria-selected="false" aria-controls="sc-panel-section" data-tab="section"
        type="button">
        <i class="fas fa-layer-group"></i>Khối dịch vụ
    </button>
    <button class="sc-tab-btn" role="tab" aria-selected="false" aria-controls="sc-panel-services" data-tab="services"
        type="button">
        <i class="fas fa-boxes-stacked"></i>3 nhóm dịch vụ
    </button>
</nav>

<!-- Tab 1: Hero -->
<div id="sc-panel-hero" class="sc-tab-panel is-active" role="tabpanel">
    <section class="panel panel-hero">
        <div class="section-header">
            <div>
                <h2>Hero trang dịch vụ</h2>
                <p>Nội dung mở đầu và hai nút hành động hiển thị trên cùng của trang.</p>
            </div>
        </div>
        <form id="hero-content-form">
            <div class="form-group">
                <div class="form-group__label"><i class="fas fa-align-left"></i>Nội dung chính</div>
                <div class="editor-grid">
                    <div class="field span-full">
                        <label class="label">Eyebrow (nhãn phụ nhỏ)</label>
                        <input class="input" name="eyebrow" required>
                    </div>
                    <div class="field span-full">
                        <label class="label">Tiêu đề chính</label>
                        <input class="input" name="title" required>
                    </div>
                    <div class="field span-full">
                        <label class="label">Mô tả</label>
                        <textarea class="textarea" name="description" rows="4" required></textarea>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="form-group__label"><i class="fas fa-hand-pointer"></i>Nút hành động</div>
                <div class="editor-grid">
                    <div class="field">
                        <label class="label">Nhãn nút chính</label>
                        <input class="input" name="primary_cta_label" placeholder="VD: Đặt lịch ngay">
                    </div>
                    <div class="field">
                        <label class="label">Link nút chính</label>
                        <input class="input" name="primary_cta_url" placeholder="dat-lich-chuyendon.html">
                    </div>
                    <div class="field">
                        <label class="label">Nhãn nút phụ</label>
                        <input class="input" name="secondary_cta_label" placeholder="VD: Xem bảng giá">
                    </div>
                    <div class="field">
                        <label class="label">Link nút phụ</label>
                        <input class="input" name="secondary_cta_url" placeholder="bang-gia-chuyen-don.html">
                    </div>
                </div>
            </div>
            <div class="service-content-form-actions">
                <button type="submit" class="btn btn-primary" id="save-hero-btn">
                    <i class="fas fa-floppy-disk"></i>Lưu Hero
                </button>
            </div>
        </form>
    </section>
</div>

<!-- Tab 2: Khối dịch vụ -->
<div id="sc-panel-section" class="sc-tab-panel" role="tabpanel">
    <section class="panel">
        <div class="section-header">
            <div>
                <h2>Khối dịch vụ</h2>
                <p>Tiêu đề và mô tả nhóm dịch vụ hiển thị ngay trước 3 nhóm.</p>
            </div>
        </div>
        <form id="services-section-form">
            <div class="editor-grid">
                <div class="field span-full">
                    <label class="label">Eyebrow (nhãn phụ nhỏ)</label>
                    <input class="input" name="eyebrow">
                </div>
                <div class="field span-full">
                    <label class="label">Tiêu đề</label>
                    <input class="input" name="title" required>
                </div>
                <div class="field span-full">
                    <label class="label">Mô tả</label>
                    <textarea class="textarea" name="description" rows="4" required></textarea>
                </div>
            </div>
            <div class="service-content-form-actions">
                <button type="submit" class="btn btn-primary" id="save-services-section-btn">
                    <i class="fas fa-floppy-disk"></i>Lưu khối dịch vụ
                </button>
            </div>
        </form>
    </section>
</div>

<!-- Tab 3: 3 nhóm dịch vụ -->
<div id="sc-panel-services" class="sc-tab-panel" role="tabpanel">
    <section class="panel">
        <div class="section-header">
            <div>
                <h2>Ba nhóm dịch vụ cố định</h2>
                <p>Chỉ cho sửa và ẩn/hiện từng nhóm. Không có thêm mới hoặc xóa khỏi hệ thống.</p>
            </div>
        </div>
        <div id="service-card-stack" class="service-card-stack">
            <div class="text-muted">Đang tải dữ liệu dịch vụ...</div>
        </div>
        <p class="service-content-note">
            <i class="fas fa-circle-info" style="color:var(--primary);margin-right:6px;"></i>
            <code>service_items</code> nhập mỗi dòng một mục. Không thêm/xóa nhóm dịch vụ.
        </p>
    </section>
</div>

<script>
    (function () {
        var btns = document.querySelectorAll('.sc-tab-btn');
        var panels = document.querySelectorAll('.sc-tab-panel');

        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var target = btn.dataset.tab;
                btns.forEach(function (b) {
                    b.classList.remove('is-active');
                    b.setAttribute('aria-selected', 'false');
                });
                panels.forEach(function (p) { p.classList.remove('is-active'); });
                btn.classList.add('is-active');
                btn.setAttribute('aria-selected', 'true');
                var panel = document.getElementById('sc-panel-' + target);
                if (panel) { panel.classList.add('is-active'); }
            });
        });
    })();
</script>

<script>
    window.__MOVING_SERVICE_CONTENT_PAGE_URL__ = <?php echo json_encode($pageUrl, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
</script>
<script src="assets/js/admin-api.js"></script>
<script src="assets/js/admin-service-content.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
