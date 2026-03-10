<?php
session_start();
define('BASE_PATH', __DIR__);
define('BASE_URL', 'http://localhost/carrental_test');

$page = $_GET['page'] ?? 'home';
$validPages = ['home', 'search', 'car-detail', 'about', 'services', 'guide', 'contact', 'booking_success', 'track_order', 'terms'];

if (!in_array($page, $validPages)) $page = 'home';

// Các trang dùng file HTML đầy đủ ở root (dùng chung với web tĩnh GitHub Pages)
// 'home' trỏ về index.html để tránh trùng lặp nội dung với views/pages/home.html
$rootPages = ['terms', 'home'];

if (in_array($page, $rootPages)) {
    $viewFile = BASE_PATH . '/' . $page . '.html';
} else {
    $viewFile = BASE_PATH . '/views/pages/' . str_replace('-', '_', $page) . '.html';
}

if (file_exists($viewFile)) {
    readfile($viewFile);
} else {
    echo '<h1>404 - Page Not Found</h1>';
}
?>