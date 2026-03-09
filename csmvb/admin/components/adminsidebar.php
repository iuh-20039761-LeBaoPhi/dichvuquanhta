<?php
function renderAdminSidebar($currentPage = '') {
    // Lấy role của user hiện tại
    if (!function_exists('getCurrentUser')) {
        require_once __DIR__ . '/../config/auth_unified.php';
    }

    // Guard: Nếu chưa login, mặc định là customer
    if (!isLoggedIn()) {
        $userRole = 'customer';
    } else {
        $currentUser = getCurrentUser();
        $userRole = $currentUser['role'] ?? 'customer';
    }

    // Định nghĩa menu với phân quyền
    // roles: ['admin'] = chỉ admin, ['admin', 'staff'] = cả admin và staff
    $allMenuItems = [
        ['url' => '/CSMVB/admin/dasboard/', 'label' => 'Dashboard', 'icon' => 'dashboard', 'roles' => ['admin']],
        ['url' => '/CSMVB/admin/products/', 'label' => 'Quản lý sản phẩm', 'icon' => 'package', 'roles' => ['admin']]
    ];

    // Lọc menu theo role của user
    $menuItems = array_filter($allMenuItems, function($item) use ($userRole) {
        return in_array($userRole, $item['roles']);
    });
?>
    <aside class="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
        <nav class="p-4">
            <ul class="space-y-2">
                <?php foreach ($menuItems as $item):
                    $isActive = strpos($currentPage, $item['url']) === 0;
                    $activeClass = $isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100';
                ?>
                    <li>
                        <a href="<?php echo $item['url']; ?>"
                           class="flex items-center gap-3 px-3 py-2 rounded-md transition-colors <?php echo $activeClass; ?>">
                            <span class="w-5 h-5"><?php echo getIconSvg($item['icon']); ?></span>
                            <span class="text-sm font-medium"><?php echo $item['label']; ?></span>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </nav>
    </aside>
<?php
}

function getIconSvg($iconName) {
    $icons = [
        'dashboard' => '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z"></path></svg>',
        'package' => '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"></path></svg>'
    ];

    return $icons[$iconName] ?? '';
}
?>