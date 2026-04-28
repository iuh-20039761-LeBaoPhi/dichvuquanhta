<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Nội dung dịch vụ | Admin Chuyển Dọn';
$pageSlug = 'dich-vu-chuyen-don';
$pageUrl = '../../dich-vu-chuyen-don.html';
$pageJsonUrl = '../../public/assets/js/data/dich-vu-chuyen-don-page.json';
$legacyJsonPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'services-hub.json';
$pageHtmlPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'dich-vu-chuyen-don.html';

function moving_content_admin_fallback_hero(string $path): array
{
    $fallback = [
        'eyebrow' => 'Ba nhóm dịch vụ chuyển dọn',
        'title' => 'Chọn đúng dịch vụ chuyển dọn cho nhu cầu của bạn',
        'description' => 'Dù bạn đang muốn chuyển đến một căn hộ mới, di dời trụ sở văn phòng hay tổ chức lại toàn bộ hệ thống kho bãi, chúng tôi đều cung cấp dịch vụ chuyên nghiệp trọn gói. Khám phá chi tiết các hạng mục hỗ trợ và chọn ngay giải pháp phù hợp nhất.',
        'primary_cta_label' => 'Đặt lịch ngay',
        'primary_cta_url' => 'dat-lich-chuyendon.html',
        'secondary_cta_label' => 'Xem bảng giá',
        'secondary_cta_url' => 'bang-gia-chuyen-don.html',
    ];

    if (!is_file($path)) {
        return $fallback;
    }

    $html = file_get_contents($path);
    if ($html === false || trim($html) === '') {
        return $fallback;
    }

    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    if (!$dom->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING)) {
        return $fallback;
    }
    $xpath = new DOMXPath($dom);

    $eyebrowNode = $xpath->query('//section[contains(@class,"hero-dich-vu")]//*[contains(@class,"nhan-phu")]')->item(0);
    $titleNode = $xpath->query('//section[contains(@class,"hero-dich-vu")]//h1')->item(0);
    $descriptionNode = $xpath->query('//section[contains(@class,"hero-dich-vu")]//p')->item(0);
    $primaryNode = $xpath->query('//section[contains(@class,"hero-dich-vu")]//a[contains(@class,"nut-dat-lich")]')->item(0);
    $secondaryNode = $xpath->query('//section[contains(@class,"hero-dich-vu")]//a[contains(@class,"nut-vien")]')->item(0);

    return [
        'eyebrow' => trim($eyebrowNode?->textContent ?? $fallback['eyebrow']),
        'title' => trim($titleNode?->textContent ?? $fallback['title']),
        'description' => trim(preg_replace('/\s+/u', ' ', (string) ($descriptionNode?->textContent ?? $fallback['description'])) ?? $fallback['description']),
        'primary_cta_label' => trim($primaryNode?->textContent ?? $fallback['primary_cta_label']),
        'primary_cta_url' => trim($primaryNode?->getAttribute('href') ?? $fallback['primary_cta_url']),
        'secondary_cta_label' => trim($secondaryNode?->textContent ?? $fallback['secondary_cta_label']),
        'secondary_cta_url' => trim($secondaryNode?->getAttribute('href') ?? $fallback['secondary_cta_url']),
    ];
}

function moving_content_admin_fallback_services(string $path): array
{
    $raw = is_file($path) ? file_get_contents($path) : false;
    $decoded = json_decode($raw ?: '{}', true);
    if (!is_array($decoded)) {
        $decoded = [];
    }

    $services = [];
    foreach ((array) ($decoded['services'] ?? []) as $index => $service) {
        if (!is_array($service)) {
            continue;
        }

        $serviceKey = trim((string) ($service['id'] ?? $service['service_key'] ?? ''));
        if ($serviceKey === '') {
            continue;
        }

        $cta = is_array($service['cta'] ?? null) ? $service['cta'] : [];
        $services[] = [
            'service_key' => $serviceKey,
            'is_visible' => '1',
            'label' => trim((string) ($service['label'] ?? '')),
            'title' => trim((string) ($service['title'] ?? '')),
            'summary' => trim((string) ($service['summary'] ?? '')),
            'image' => trim((string) ($service['image'] ?? '')),
            'image_alt' => trim((string) ($service['image_alt'] ?? '')),
            'service_items' => array_values(array_filter((array) ($service['service_items'] ?? []), static fn($item) => trim((string) $item) !== '')),
            'booking_label' => trim((string) ($cta['booking_label'] ?? '')),
            'booking_url' => trim((string) ($cta['booking_url'] ?? '')),
            'pricing_label' => trim((string) ($cta['pricing_label'] ?? '')),
            'pricing_url' => trim((string) ($cta['pricing_url'] ?? '')),
            'sort_order' => $index + 1,
        ];
    }

    return [
        'section' => [
            'eyebrow' => trim((string) (($decoded['section']['eyebrow'] ?? ''))),
            'title' => trim((string) (($decoded['section']['title'] ?? ''))),
            'description' => trim((string) (($decoded['section']['description'] ?? ''))),
        ],
        'services' => $services,
    ];
}

$fallbackHero = moving_content_admin_fallback_hero($pageHtmlPath);
$fallbackServiceData = moving_content_admin_fallback_services($legacyJsonPath);
$bootstrapPayload = [
    'page_slug' => $pageSlug,
    'hero' => $fallbackHero,
    'services_section' => $fallbackServiceData['section'],
    'services' => $fallbackServiceData['services'],
];

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
            ở KRUD và export ra JSON public.</p>
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
    window.__MOVING_SERVICE_CONTENT_BOOTSTRAP__ = <?php echo json_encode($bootstrapPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    window.__MOVING_SERVICE_CONTENT_PAGE_URL__ = <?php echo json_encode($pageUrl, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    window.__MOVING_SERVICE_CONTENT_JSON_URL__ = <?php echo json_encode($pageJsonUrl, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
</script>
<script src="assets/js/admin-api.js"></script>
<script src="assets/js/admin-service-content.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>