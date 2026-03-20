<?php
session_start();
define('BASE_PATH', __DIR__);
define('BASE_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\'));

$page = $_GET['page'] ?? 'home';
$validPages = ['home', 'search', 'car-detail', 'about', 'services', 'guide', 'contact', 'booking-success', 'track-order', 'terms'];

if (!in_array($page, $validPages)) $page = 'home';

// Ánh xạ route sang cấu trúc mới
$pageMap = [
    'home'            => 'index.html',
    'search'          => 'views/pages/public/tim-kiem.html',
    'car-detail'      => 'views/pages/public/chi-tiet-xe.html',
    'about'           => 'views/pages/public/gioi-thieu.html',
    'services'        => 'views/pages/public/dich-vu.html',
    'guide'           => 'views/pages/public/huong-dan-thue-xe.html',
    'contact'         => 'views/pages/public/lien-he.html',
    'booking-success' => 'views/pages/public/dat-lich-thanh-cong.html',
    'track-order'     => 'views/pages/public/tra-cuu-don.html',
    'terms'           => 'views/pages/public/dieu-khoan.html',
];

$target = $pageMap[$page] ?? 'index.html';
$viewFile = BASE_PATH . '/' . $target;

if (file_exists($viewFile)) {
    $queryParams = $_GET;
    unset($queryParams['page']);
    $queryString = http_build_query($queryParams);
    $redirectUrl = $target . ($queryString ? ('?' . $queryString) : '');

    header('Location: ' . $redirectUrl, true, 302);
    exit;
}

echo '<h1>404 - Page Not Found</h1>';
?>