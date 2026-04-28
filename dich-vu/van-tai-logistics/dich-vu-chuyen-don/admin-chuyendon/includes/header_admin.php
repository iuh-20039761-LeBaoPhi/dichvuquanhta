<?php
moving_admin_boot_session();
$currentPage = basename($_SERVER['PHP_SELF'] ?? '');
$adminNavItems = [
    [
        'href' => 'index.php',
        'icon' => 'fas fa-chart-pie',
        'label' => 'Dashboard',
        'active' => in_array($currentPage, ['index.php', 'admin_stats.php'], true),
    ],
    [
        'href' => 'orders_manage.php',
        'icon' => 'fas fa-shopping-cart',
        'label' => 'Đơn hàng',
        'active' => $currentPage === 'orders_manage.php',
    ],
    [
        'href' => 'users_manage.php',
        'icon' => 'fas fa-users-gear',
        'label' => 'Thành viên',
        'active' => $currentPage === 'users_manage.php',
    ],
    [
        'href' => 'admin_pricing.php',
        'icon' => 'fas fa-tags',
        'label' => 'Bảng giá',
        'active' => $currentPage === 'admin_pricing.php',
    ],
    [ // New dropdown item
        'type' => 'dropdown',
        'label' => 'Quản lý chung',
        'icon' => 'fas fa-cogs', // Icon for general management
        'active' => in_array($currentPage, ['admin_service_content.php', 'admin_content_chunks.php', 'contact_manage.php', 'articles_manage.php', 'admin_guide.php', 'admin_profile.php'], true),
        'children' => [
            [
                'href' => 'admin_service_content.php',
                'label' => 'Nội dung dịch vụ',
                'active' => $currentPage === 'admin_service_content.php',
            ],
            [
                'href' => 'contact_manage.php',
                'label' => 'Liên hệ',
                'active' => $currentPage === 'contact_manage.php',
            ],
            [
                'href' => 'articles_manage.php',
                'label' => 'Cẩm nang',
                'active' => $currentPage === 'articles_manage.php',
            ],
            [
                'href' => 'admin_guide.php',
                'label' => 'Hướng dẫn',
                'active' => $currentPage === 'admin_guide.php',
            ],
            [
                'href' => 'admin_profile.php',
                'label' => 'Cấu hình',
                'active' => $currentPage === 'admin_profile.php',
            ],
        ],
    ],
];
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo moving_admin_escape($pageTitle ?? 'Admin chuyển dọn'); ?></title>
    <link rel="stylesheet" href="assets/css/admin.css">
    <?php if (!empty($extraStylesheets) && is_array($extraStylesheets)): ?>
        <?php foreach ($extraStylesheets as $stylesheet): ?>
            <link rel="stylesheet" href="<?php echo moving_admin_escape((string) $stylesheet); ?>">
        <?php endforeach; ?>
    <?php endif; ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
        rel="stylesheet">
</head>

<body>
    <header class="admin-header">
        <div class="admin-header__inner">
            <div class="admin-brand">
                <span class="admin-brand__eyebrow">GlobalCare</span>
                <a href="index.php" class="admin-brand__title">Admin chuyển dọn</a>
            </div>

            <button class="admin-menu-toggle" aria-label="Mở menu điều hướng" id="admin-menu-toggle">
                <i class="fas fa-bars"></i>
            </button>

            <nav class="admin-nav" id="admin-nav" aria-label="Điều hướng quản trị chuyển dọn">
                <?php foreach ($adminNavItems as $item): ?>
                    <?php if (isset($item['type']) && $item['type'] === 'dropdown'): ?>
                        <div class="admin-nav__item dropdown <?php echo $item['active'] ? 'is-active' : ''; ?>">
                            <a class="admin-nav__link dropdown-toggle <?php echo $item['active'] ? 'is-active' : ''; ?>"
                                href="#" role="button"
                                id="dropdown-<?php echo moving_admin_escape(str_replace(' ', '-', strtolower($item['label']))); ?>"
                                data-bs-toggle="dropdown" aria-expanded="false"
                                title="<?php echo moving_admin_escape($item['label']); ?>"
                                aria-label="<?php echo moving_admin_escape($item['label']); ?>">
                                <i class="<?php echo moving_admin_escape($item['icon']); ?>" aria-hidden="true"></i>
                                <span><?php echo moving_admin_escape($item['label']); ?></span>
                            </a>
                            <ul class="dropdown-menu"
                                aria-labelledby="dropdown-<?php echo moving_admin_escape(str_replace(' ', '-', strtolower($item['label']))); ?>">
                                <?php foreach ($item['children'] as $child): ?>
                                    <li>
                                        <a class="dropdown-item <?php echo $child['active'] ? 'is-active' : ''; ?>"
                                            href="<?php echo moving_admin_escape($child['href']); ?>">
                                            <?php echo moving_admin_escape($child['label']); ?>
                                        </a>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php else: ?>
                        <a href="<?php echo moving_admin_escape($item['href']); ?>"
                            class="admin-nav__link <?php echo $item['active'] ? 'is-active' : ''; ?>"
                            title="<?php echo moving_admin_escape($item['label']); ?>"
                            aria-label="<?php echo moving_admin_escape($item['label']); ?>" <?php echo $item['active'] ? 'aria-current="page"' : ''; ?>>
                            <i class="<?php echo moving_admin_escape($item['icon']); ?>" aria-hidden="true"></i>
                            <span><?php echo moving_admin_escape($item['label']); ?></span>
                        </a>
                    <?php endif; ?>
                <?php endforeach; ?>
            </nav>

            <div class="admin-header__actions">
                <a href="notifications.php" class="button button-ghost admin-notification-link" title="Thông báo"
                    aria-label="Thông báo">
                    <i class="fas fa-bell" aria-hidden="true"></i>
                </a>
                <span
                    class="admin-user-chip"><?php echo moving_admin_escape($_SESSION['username'] ?? 'admin'); ?></span>
                <a href="logout.php" class="button button-ghost admin-logout-link" title="Đăng xuất"
                    aria-label="Đăng xuất">
                    <i class="fas fa-arrow-right-from-bracket" aria-hidden="true"></i>
                    <span>Đăng xuất</span>
                </a>
            </div>
        </div>
    </header>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const menuToggle = document.getElementById('admin-menu-toggle');
            const adminNav = document.getElementById('admin-nav');
            const dropdownItems = Array.from(document.querySelectorAll('.admin-nav__item.dropdown'));
            
            // Toggle Mobile Menu
            if (menuToggle && adminNav) {
                menuToggle.addEventListener('click', function() {
                    const isOpen = adminNav.classList.toggle('is-open');
                    menuToggle.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
                });
            }

            if (!dropdownItems.length) return;

            function closeAll(exceptNode) {
                dropdownItems.forEach((item) => {
                    if (item !== exceptNode) {
                        item.classList.remove('is-open');
                        const toggle = item.querySelector('.dropdown-toggle');
                        if (toggle) toggle.setAttribute('aria-expanded', 'false');
                    }
                });
            }

            dropdownItems.forEach((item) => {
                const toggle = item.querySelector('.dropdown-toggle');
                if (!toggle) return;

                toggle.addEventListener('click', function (event) {
                    event.preventDefault();
                    const willOpen = !item.classList.contains('is-open');
                    closeAll(item);
                    item.classList.toggle('is-open', willOpen);
                    toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                });
            });

            document.addEventListener('click', function (event) {
                const target = event.target;
                if (!(target instanceof Node)) return;
                const insideDropdown = dropdownItems.some((item) => item.contains(target));
                if (!insideDropdown) {
                    closeAll(null);
                }
            });

            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    closeAll(null);
                }
            });
        });
    </script>
    <main class="admin-page">