<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo '<div class="empty-state">Phiên đăng nhập đã hết hạn.</div>';
    exit;
}

$userId = (int) ($_SESSION['user_id'] ?? 0);
$stmt = $conn->prepare("SELECT noi_dung AS message, duong_dan AS link, tao_luc AS created_at FROM thong_bao WHERE nguoi_dung_id = ? ORDER BY tao_luc DESC LIMIT 5");
if (!$stmt) {
    echo '<div class="empty-state">Không thể tải thông báo.</div>';
    exit;
}

$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}
$stmt->close();

if (empty($items)) {
    echo '<div class="empty-state">Không có thông báo mới</div>';
    exit;
}

$markRead = $conn->prepare("UPDATE thong_bao SET da_doc = 1 WHERE nguoi_dung_id = ? AND da_doc = 0");
if ($markRead) {
    $markRead->bind_param("i", $userId);
    $markRead->execute();
    $markRead->close();
}

foreach ($items as $item) {
    $message = htmlspecialchars((string) ($item['message'] ?? ''), ENT_QUOTES, 'UTF-8');
    $link = trim((string) ($item['link'] ?? ''));
    $safeLink = $link !== '' ? htmlspecialchars($link, ENT_QUOTES, 'UTF-8') : 'notifications.php';
    $time = htmlspecialchars((string) ($item['created_at'] ?? ''), ENT_QUOTES, 'UTF-8');
    echo '<a class="notification-page-item" href="' . $safeLink . '">';
    echo '<div class="message">' . $message . '</div>';
    echo '<div class="time">' . $time . '</div>';
    echo '</a>';
}
