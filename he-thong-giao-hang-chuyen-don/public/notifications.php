<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];

// Phân trang
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit = 15;
$offset = ($page - 1) * $limit;

// Đếm tổng số
$count_res = $conn->query("SELECT COUNT(*) as total FROM notifications WHERE user_id = $user_id");
$total_records = $count_res->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);

// Lấy danh sách
$notifications = [];
$stmt = $conn->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?");
$stmt->bind_param("iii", $user_id, $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $notifications[] = $row;
    }
}

// Đánh dấu tất cả là đã đọc khi vào trang này
$conn->query("UPDATE notifications SET is_read = 1 WHERE user_id = $user_id");
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Tất cả thông báo | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_user.php'; ?>
    <main class="container" style="padding: 40px 20px; max-width: 900px;">
        <h2 class="section-title" style="text-align:left; margin-bottom:20px;">Lịch sử thông báo</h2>

        <div style="background:#fff; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <?php if (empty($notifications)): ?>
                <p style="text-align:center; padding: 40px; color:#666;">Bạn chưa có thông báo nào.</p>
            <?php else: ?>
                <?php foreach ($notifications as $notif): ?>
                    <a href="<?php echo htmlspecialchars($notif['link']); ?>" class="notification-page-item">
                        <div class="message">
                            <?php echo htmlspecialchars($notif['message']); ?>
                        </div>
                        <div class="time">
                            <?php echo date('d/m/Y H:i', strtotime($notif['created_at'])); ?>
                        </div>
                    </a>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>

        <!-- Phân trang -->
        <?php if ($total_pages > 1): ?>
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 5px;">
                <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                    <a href="?page=<?php echo $i; ?>" class="btn-sm btn-outline"
                        style="font-size:14px; <?php echo ($i == $page) ? 'background:#0a2a66; color:white;' : ''; ?>">
                        <?php echo $i; ?>
                    </a>
                <?php endfor; ?>
            </div>
        <?php endif; ?>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>
