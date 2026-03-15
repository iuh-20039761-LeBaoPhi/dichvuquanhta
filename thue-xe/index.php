<?php
session_start();
define('BASE_PATH', __DIR__);
define('BASE_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\'));

$page = $_GET['page'] ?? 'home';
$validPages = ['home', 'search', 'car-detail', 'about', 'services', 'guide', 'contact', 'booking-success', 'track-order', 'terms'];

if (!in_array($page, $validPages)) $page = 'home';

// Các trang dùng file HTML đầy đủ ở root (dùng chung với web tĩnh GitHub Pages)
// 'home' trỏ về index.html để tránh trùng lặp nội dung với views/pages/home.html
$rootPages = ['terms', 'home'];

if (in_array($page, $rootPages)) {
    $viewFile = BASE_PATH . '/' . $page . '.html';
} else {
    $viewFile = BASE_PATH . '/views/pages/' . $page . '.html';
}

if (file_exists($viewFile)) {
    readfile($viewFile);
} else {
    echo '<h1>404 - Page Not Found</h1>';
}
?>