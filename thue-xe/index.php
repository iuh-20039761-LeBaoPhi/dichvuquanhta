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
    'search'          => 'pages/public/tim-kiem.html',
    'car-detail'      => 'pages/public/chi-tiet-xe.html',
    'about'           => 'pages/public/gioi-thieu.html',
    'services'        => 'pages/public/dich-vu.html',
    'guide'           => 'pages/public/huong-dan-thue-xe.html',
    'contact'         => 'pages/public/lien-he.html',
    'booking-success' => 'pages/public/dat-lich-thanh-cong.html',
    'track-order'     => 'pages/public/tra-cuu-don.html',
    'terms'           => 'pages/public/dieu-khoan.html',
];

$viewFile = BASE_PATH . '/' . ($pageMap[$page] ?? 'index.html');

if (file_exists($viewFile)) {
    readfile($viewFile);
} else {
    echo '<h1>404 - Page Not Found</h1>';
}
?>