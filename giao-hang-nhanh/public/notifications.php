<?php
session_start();
require_once __DIR__ . '/../config/db.php';

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

function get_project_base_path(): string
{
    return preg_replace('#public/?$#i', '', get_public_base_path());
}

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = (int)$_SESSION['user_id'];

// Phân trang
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit = 15;
$offset = ($page - 1) * $limit;
if ($page < 1) $page = 1;

// Đếm tổng số sử dụng Prepared Statement
$total_records = 0;
$stmt_count = $conn->prepare("SELECT COUNT(*) as total FROM thong_bao WHERE nguoi_dung_id = ?");
if ($stmt_count) {
    $stmt_count->bind_param("i", $user_id);
    $stmt_count->execute();
    $stmt_count->bind_result($total_n);
    if ($stmt_count->fetch()) {
        $total_records = (int)$total_n;
    }
    $stmt_count->close();
}
$total_pages = ceil($total_records / $limit);

// Lấy danh sách
$notifications = [];
$stmt = $conn->prepare("SELECT id, noi_dung AS message, duong_dan AS link, da_doc AS is_read, tao_luc AS created_at FROM thong_bao WHERE nguoi_dung_id = ? ORDER BY tao_luc DESC LIMIT ? OFFSET ?");
if ($stmt) {
    $stmt->bind_param("iii", $user_id, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $notifications[] = $row;
        }
    }
    $stmt->close();
}

// Đánh dấu tất cả là đã đọc
$stmt_read = $conn->prepare("UPDATE thong_bao SET da_doc = 1 WHERE nguoi_dung_id = ? AND da_doc = 0");
if ($stmt_read) {
    $stmt_read->bind_param("i", $user_id);
    $stmt_read->execute();
    $stmt_read->close();
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Tất cả thông báo | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
    <style>
        .notifications-shell {
            min-height: 100vh;
            background: #f4f7fb;
        }

        .notifications-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding: 24px 20px 0;
            max-width: 1000px;
            margin: 0 auto;
        }

        .notifications-topbar h1 {
            margin: 0;
            color: #0a2a66;
            font-size: 28px;
        }

        .notifications-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .notifications-card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 10px 24px rgba(10, 42, 102, 0.08);
        }
    </style>
</head>

<body>
    <div class="notifications-shell">
        <div class="notifications-topbar">
            <div>
                <p style="margin: 0 0 6px; color: #7c8fb6; text-transform: uppercase; letter-spacing: 0.08em;">Trung tâm thông báo</p>
                <h1>Lịch sử thông báo</h1>
            </div>
            <div class="notifications-actions">
                <a class="btn-outline" href="<?php echo htmlspecialchars(get_public_base_path() . 'khach-hang/dashboard.html'); ?>">Khu vực khách hàng</a>
                <a class="btn-primary" href="<?php echo htmlspecialchars(get_project_base_path() . 'index.html'); ?>">Trang chủ</a>
            </div>
        </div>

        <main class="container" style="padding: 24px 20px 40px; max-width: 900px;">
            <div class="notifications-card">
            <?php if (empty($notifications)): ?>
                <p style="text-align:center; padding: 40px; color:#666;">Bạn chưa có thông báo nào.</p>
            <?php else: ?>
                <?php foreach ($notifications as $notif): ?>
                    <a href="<?php echo htmlspecialchars(normalize_notification_link($notif['link'] ?? '')); ?>" class="notification-page-item">
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
    </div>
</body>

</html>
