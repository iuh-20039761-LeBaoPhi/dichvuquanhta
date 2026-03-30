<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

function get_public_base_path(): string
{
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $marker = '/public/';
    $pos = stripos($scriptName, $marker);
    return $pos !== false
        ? substr($scriptName, 0, $pos + strlen($marker))
        : '/giao-hang-nhanh/public/';
}

function normalize_notification_link(?string $link): string
{
    $link = trim((string) $link);
    if ($link === '') {
        return '#';
    }

    if (preg_match('#^(https?:)?//#i', $link) || str_starts_with($link, '/')) {
        return $link;
    }

    $publicBase = get_public_base_path();
    if (preg_match('/^customer_order_detail\.php\?id=(\d+)$/i', $link, $matches)) {
        return $publicBase . 'khach-hang/chi-tiet-don-hang.html?id=' . $matches[1];
    }

    return $publicBase . ltrim($link, '/');
}

if (!isset($_SESSION['user_id'])) {
    echo '<div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Vui lòng đăng nhập.</div>';
    exit;
}

$user_id = $_SESSION['user_id'];

// Lấy 5 thông báo gần nhất
$sql = "SELECT id, noi_dung AS message, duong_dan AS link, da_doc AS is_read, tao_luc AS created_at FROM thong_bao WHERE nguoi_dung_id = ? ORDER BY tao_luc DESC LIMIT 5";
$stmt = $conn->prepare($sql);
if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $is_read_class = $row['is_read'] ? '' : 'unread';
            echo '<a href="' . htmlspecialchars(normalize_notification_link($row['link'] ?? '#')) . '" class="notification-item ' . $is_read_class . '">';
            echo '<div class="message">' . htmlspecialchars($row['message']) . '</div>';
            echo '<div class="time">' . date('d/m/Y H:i', strtotime($row['created_at'])) . '</div>';
            echo '</a>';
        }
        // Đánh dấu đã đọc sau khi hiển thị
        $stmt_upd = $conn->prepare("UPDATE thong_bao SET da_doc = 1 WHERE nguoi_dung_id = ? AND da_doc = 0");
        if ($stmt_upd) {
            $stmt_upd->bind_param("i", $user_id);
            $stmt_upd->execute();
            $stmt_upd->close();
        }
    } else {
        echo '<div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Không có thông báo nào.</div>';
    }
    $stmt->close();
}
$conn->close();
?>
