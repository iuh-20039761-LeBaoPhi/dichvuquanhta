<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$pageSlug = 'dich-vu-giao-hang';
$pageUrl = '../../dich-vu-giao-hang.html';
$pageJsonUrl = '../../public/data/dich-vu-giao-hang-page.json';
$legacyJsonPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'dsdichvugiaohang.json';
$pageHtmlPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'dich-vu-giao-hang.html';

function ghn_service_content_read_html(string $path): array
{
    $fallback = [
        'hero' => [
            'badge_label' => 'Dịch vụ chuyên nghiệp',
            'title' => 'Các gói dịch vụ giao hàng',
            'description' => 'Chúng tôi cung cấp đa dạng các gói giải pháp vận chuyển nhằm đáp ứng tối ưu nhu cầu về thời gian và chi phí của bạn.',
        ],
        'services_section' => [
            'title' => 'Các dịch vụ vận chuyển',
            'description' => 'Lựa chọn gói dịch vụ phù hợp để tối ưu hóa thời gian và chi phí cho từng loại mặt hàng của bạn.',
        ],
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

    $heroBadge = $xpath->query('//section[contains(@class,"subpage-hero")]//*[contains(@class,"subpage-hero__badge")]//span')->item(0);
    $heroTitle = $xpath->query('//section[contains(@class,"subpage-hero")]//*[contains(@class,"subpage-hero__title")]')->item(0);
    $heroDescription = $xpath->query('//section[contains(@class,"subpage-hero")]//*[contains(@class,"subpage-hero__desc")]')->item(0);
    $sectionTitle = $xpath->query('//section[@id="services"]//*[contains(@class,"section-title")]')->item(0);
    $sectionDescription = $xpath->query('//section[@id="services"]//*[contains(@class,"section-desc")]')->item(0);

    return [
        'hero' => [
            'badge_label' => trim($heroBadge ? $heroBadge->textContent : $fallback['hero']['badge_label']),
            'title' => trim($heroTitle ? $heroTitle->textContent : $fallback['hero']['title']),
            'description' => trim(preg_replace('/\s+/u', ' ', $heroDescription ? $heroDescription->textContent : $fallback['hero']['description'])),
        ],
        'services_section' => [
            'title' => trim($sectionTitle ? $sectionTitle->textContent : $fallback['services_section']['title']),
            'description' => trim(preg_replace('/\s+/u', ' ', $sectionDescription ? $sectionDescription->textContent : $fallback['services_section']['description'])),
        ],
    ];
}

function ghn_service_content_read_services(string $path): array
{
    $raw = is_file($path) ? file_get_contents($path) : false;
    $decoded = json_decode($raw ?: '[]', true);
    if (!is_array($decoded)) {
        return [];
    }

    $services = [];
    foreach ($decoded as $service) {
        if (!is_array($service)) {
            continue;
        }

        $name = trim((string) ($service['ten'] ?? ''));
        if ($name === '') {
            continue;
        }

        $serviceKey = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name;
        $serviceKey = strtolower($serviceKey);
        $serviceKey = preg_replace('/[^a-z0-9]+/i', '-', $serviceKey);
        $serviceKey = trim((string) $serviceKey, '-');
        if ($serviceKey === '') {
            $serviceKey = 'dich-vu-' . (count($services) + 1);
        }

        $services[] = [
            'service_key' => $serviceKey,
            'is_visible' => '1',
            'ten' => $name,
            'bieutuong' => trim((string) ($service['bieutuong'] ?? '')),
            'khauhieu' => trim((string) ($service['khauhieu'] ?? '')),
            'phamvi' => trim((string) ($service['phamvi'] ?? '')),
            'uutien' => trim((string) ($service['uutien'] ?? '')),
            'phuhopcho' => trim((string) ($service['phuhopcho'] ?? '')),
            'mota' => trim((string) ($service['mota'] ?? '')),
        ];
    }

    return $services;
}

$pageContent = ghn_service_content_read_html($pageHtmlPath);
$bootstrapPayload = [
    'page_slug' => $pageSlug,
    'hero' => $pageContent['hero'],
    'services_section' => $pageContent['services_section'],
    'services' => ghn_service_content_read_services($legacyJsonPath),
];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Nội dung dịch vụ | Admin Giao Hàng</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .service-content-sections {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
            margin-bottom: 24px;
        }

        .service-content-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
            gap: 24px;
            align-items: start;
        }

        .service-content-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .service-content-form-grid .span-full {
            grid-column: 1 / -1;
        }

        .service-content-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
            flex-wrap: wrap;
        }

        .service-content-runtime {
            display: none;
            margin-bottom: 16px;
        }

        .service-content-summary {
            color: #64748b;
            margin-top: 6px;
        }

        .service-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 999px;
            padding: 5px 10px;
            font-size: 12px;
            font-weight: 700;
        }

        .service-status-pill.is-visible {
            color: #166534;
            background: #dcfce7;
        }

        .service-status-pill.is-hidden {
            color: #92400e;
            background: #fef3c7;
        }

        .service-row-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            color: #0a2a66;
        }

        .service-row-title span {
            font-size: 20px;
            line-height: 1;
        }

        .service-row-copy small {
            display: block;
            margin-top: 5px;
            line-height: 1.45;
            color: #64748b;
        }

        .service-row-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        .service-row-actions button {
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
        }

        .service-content-note {
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
            margin-top: 14px;
        }

        .service-content-editor {
            min-height: 140px;
            resize: vertical;
        }

        @media (max-width: 1100px) {
            .service-content-sections,
            .service-content-layout {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 720px) {
            .service-content-form-grid {
                grid-template-columns: 1fr;
            }

            .service-row-actions {
                justify-content: flex-start;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <div>
                <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
                <h2 class="page-title">Quản lý nội dung dịch vụ</h2>
                <p style="color:#64748b; margin-top:6px;">Chỉnh Hero, khối dịch vụ và danh sách gói dịch vụ của trang dịch vụ giao hàng.</p>
            </div>
            <a class="btn-view-site-pill" href="<?php echo htmlspecialchars($pageUrl, ENT_QUOTES, 'UTF-8'); ?>" target="_blank" rel="noopener">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Xem trang public
            </a>
        </div>

        <div id="service-content-runtime" class="pricing-alert service-content-runtime"></div>

        <section class="service-content-sections">
            <section class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <h3>Hero</h3>
                        <p>Dùng cho badge nhỏ, tiêu đề chính và mô tả đầu trang.</p>
                    </div>
                </div>
                <form id="service-content-hero-form">
                    <div class="service-content-form-grid">
                        <div class="form-group span-full">
                            <label>Nhãn badge</label>
                            <input class="admin-input" name="badge_label" required>
                        </div>
                        <div class="form-group span-full">
                            <label>Tiêu đề</label>
                            <input class="admin-input" name="title" required>
                        </div>
                        <div class="form-group span-full">
                            <label>Mô tả</label>
                            <textarea class="admin-input service-content-editor" name="description" rows="4" required></textarea>
                        </div>
                    </div>
                    <div class="service-content-actions">
                        <button type="submit" class="btn-primary" id="service-content-hero-save-btn">
                            <i class="fa-solid fa-floppy-disk"></i> Lưu Hero
                        </button>
                    </div>
                </form>
            </section>

            <section class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <h3>Khối dịch vụ</h3>
                        <p>Tiêu đề và mô tả hiển thị phía trên danh sách card dịch vụ.</p>
                    </div>
                </div>
                <form id="service-content-section-form">
                    <div class="service-content-form-grid">
                        <div class="form-group span-full">
                            <label>Tiêu đề</label>
                            <input class="admin-input" name="title" required>
                        </div>
                        <div class="form-group span-full">
                            <label>Mô tả</label>
                            <textarea class="admin-input service-content-editor" name="description" rows="4" required></textarea>
                        </div>
                    </div>
                    <div class="service-content-actions">
                        <button type="submit" class="btn-primary" id="service-content-section-save-btn">
                            <i class="fa-solid fa-floppy-disk"></i> Lưu khối dịch vụ
                        </button>
                    </div>
                </form>
            </section>
        </section>

        <section class="service-content-layout">
            <section class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <h3>Danh sách gói dịch vụ</h3>
                        <p id="service-content-summary" class="service-content-summary">Đang tải dữ liệu dịch vụ...</p>
                    </div>
                    <button type="button" class="btn-primary" id="service-content-create-btn">
                        <i class="fa-solid fa-plus"></i> Thêm dịch vụ
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Dịch vụ</th>
                                <th>Trạng thái</th>
                                <th style="text-align:right;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="service-content-table-body">
                            <tr><td colspan="3" class="users-loading">Đang tải dữ liệu dịch vụ...</td></tr>
                        </tbody>
                    </table>
                </div>
                <p class="service-content-note">
                    CTA của card public vẫn giữ nguyên theo code hiện tại. Màn này chỉ quản lý nội dung văn bản của các gói dịch vụ.
                </p>
            </section>

            <aside class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <h3 id="service-content-form-title">Thêm dịch vụ</h3>
                        <p>Không hiển thị <code>id</code> ra UI. Hệ thống chỉ dùng nội bộ để lưu KRUD.</p>
                    </div>
                </div>
                <form id="service-content-service-form">
                    <div class="service-content-form-grid">
                        <div class="form-group">
                            <label>Biểu tượng</label>
                            <input class="admin-input" name="bieutuong" placeholder="VD: 🛵">
                        </div>
                        <div class="form-group">
                            <label>Hiển thị</label>
                            <select class="admin-select" name="is_visible">
                                <option value="1">Đang hiển thị</option>
                                <option value="0">Đang ẩn</option>
                            </select>
                        </div>
                        <div class="form-group span-full">
                            <label>Tên dịch vụ</label>
                            <input class="admin-input" name="ten" required>
                        </div>
                        <div class="form-group span-full">
                            <label>Khẩu hiệu</label>
                            <input class="admin-input" name="khauhieu">
                        </div>
                        <div class="form-group span-full">
                            <label>Phạm vi</label>
                            <input class="admin-input" name="phamvi">
                        </div>
                        <div class="form-group span-full">
                            <label>Ưu tiên</label>
                            <input class="admin-input" name="uutien">
                        </div>
                        <div class="form-group span-full">
                            <label>Phù hợp cho</label>
                            <input class="admin-input" name="phuhopcho">
                        </div>
                        <div class="form-group span-full">
                            <label>Mô tả</label>
                            <textarea class="admin-input service-content-editor" name="mota" rows="5"></textarea>
                        </div>
                    </div>
                    <div class="service-content-actions">
                        <button type="button" class="btn-secondary" id="service-content-reset-btn">Làm mới</button>
                        <button type="submit" class="btn-primary" id="service-content-save-btn">
                            <i class="fa-solid fa-floppy-disk"></i> Lưu dịch vụ
                        </button>
                    </div>
                </form>
            </aside>
        </section>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script>
        window.__GHN_SERVICE_CONTENT_BOOTSTRAP__ = <?php echo json_encode($bootstrapPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
        window.__GHN_SERVICE_CONTENT_JSON_URL__ = <?php echo json_encode($pageJsonUrl, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
        window.__GHN_SERVICE_CONTENT_PUBLIC_URL__ = <?php echo json_encode($pageUrl, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script src="assets/js/admin-pricing-krud-client.js?v=<?php echo time(); ?>"></script>
    <script src="assets/js/admin-service-content.js?v=<?php echo time(); ?>"></script>
</body>
</html>
