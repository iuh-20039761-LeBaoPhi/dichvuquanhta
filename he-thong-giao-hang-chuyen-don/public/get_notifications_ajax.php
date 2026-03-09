<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    echo '<div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Vui lòng đăng nhập.</div>';
    exit;
}

$user_id = $_SESSION['user_id'];

// Lấy 5 thông báo gần nhất
$sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $is_read_class = $row['is_read'] ? '' : 'unread';
        echo '<a href="' . htmlspecialchars($row['link']) . '" class="notification-item ' . $is_read_class . '">';
        echo '<div class="message">' . htmlspecialchars($row['message']) . '</div>';
        echo '<div class="time">' . date('d/m/Y H:i', strtotime($row['created_at'])) . '</div>';
        echo '</a>';
    }
    // Đánh dấu đã đọc sau khi hiển thị
    $conn->query("UPDATE notifications SET is_read = 1 WHERE user_id = $user_id AND is_read = 0");
} else {
    echo '<div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Không có thông báo nào.</div>';
}

$stmt->close();
$conn->close();
?>
