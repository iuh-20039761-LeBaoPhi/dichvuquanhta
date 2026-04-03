<?php
session_start();
require_once __DIR__ . '/../config/local_store.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$notifications = admin_local_store_read('admin-notifications.json', []);
if (!is_array($notifications)) {
    $notifications = [];
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo | Admin</title>
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Thông báo</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>
        <div class="admin-card">
            <?php if (empty($notifications)): ?>
                <div class="empty-state">Không có thông báo nào. Luồng thông báo cũ từ MySQL đã được tắt.</div>
            <?php else: ?>
                <?php foreach ($notifications as $item): ?>
                    <a class="notification-page-item" href="<?php echo htmlspecialchars((string) (($item['link'] ?? '') ?: 'notifications.php'), ENT_QUOTES, 'UTF-8'); ?>">
                        <div class="message"><?php echo htmlspecialchars((string) ($item['message'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="time"><?php echo htmlspecialchars((string) ($item['created_at'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></div>
                    </a>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>
</html>
