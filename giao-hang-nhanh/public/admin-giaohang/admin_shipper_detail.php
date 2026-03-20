<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$shipper_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Lấy thông tin Shipper
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ? AND role = 'shipper'");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$shipper = $stmt->get_result()->fetch_assoc();

if (!$shipper) {
    die("Shipper không tồn tại hoặc ID không hợp lệ.");
}

// --- TÍNH TOÁN CHỈ SỐ HIỆU SUẤT ---
$stmt = $conn->prepare("SELECT COUNT(*) as total FROM orders WHERE shipper_id = ?");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$total_orders = $stmt->get_result()->fetch_assoc()['total'];

$stmt = $conn->prepare("SELECT COUNT(*) as completed FROM orders WHERE shipper_id = ? AND status = 'completed'");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$completed_orders = $stmt->get_result()->fetch_assoc()['completed'];

$avg_rating = 0; $count_rating = 0;
$stmt = $conn->prepare("SELECT AVG(rating) as avg_rating, COUNT(rating) as count_rating FROM orders WHERE shipper_id = ? AND rating > 0");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$rating_data = $stmt->get_result()->fetch_assoc();
$avg_rating = $rating_data['avg_rating'] ? round($rating_data['avg_rating'], 1) : 0;
$count_rating = $rating_data['count_rating'];

$success_rate = $total_orders > 0 ? round(($completed_orders / $total_orders) * 100, 1) : 0;

// Feedbacks
$feedbacks = [];
$stmt = $conn->prepare("SELECT o.order_code, o.rating, o.feedback, o.created_at, u.fullname as customer_name 
                        FROM orders o 
                        LEFT JOIN users u ON o.user_id = u.id 
                        WHERE o.shipper_id = ? AND o.rating > 0 
                        ORDER BY o.created_at DESC LIMIT 5");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) $feedbacks[] = $row;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hồ sơ Shipper: <?php echo htmlspecialchars($shipper['fullname']); ?> | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .shipper-profile-card {
            background: linear-gradient(135deg, #0a2a66 0%, #1e3a8a 100%);
            border-radius: 20px;
            padding: 40px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 30px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
        }
        .shipper-profile-card::after {
            content: "\f48b";
            font-family: "Font Awesome 6 Free";
            font-weight: 900;
            position: absolute;
            right: -20px;
            bottom: -20px;
            font-size: 150px;
            opacity: 0.1;
            transform: rotate(-15px);
        }
        .shipper-avatar {
            width: 100px;
            height: 100px;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-radius: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: 800;
            border: 2px solid rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ hiệu suất Shipper</h2>
            <a href="users_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Danh sách thành viên</a>
        </div>

        <div class="shipper-profile-card">
            <div class="shipper-avatar">
                <?php echo strtoupper(substr($shipper['username'] ?? 'S', 0, 1)); ?>
            </div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 28px;"><?php echo htmlspecialchars($shipper['fullname']); ?></h2>
                    <span class="status-badge" style="<?php echo $shipper['is_locked'] ? 'background:#ef4444; color:#fff;' : 'background:#10b981; color:#fff;'; ?>">
                        <?php echo $shipper['is_locked'] ? 'Đã khóa' : 'Hoạt động'; ?>
                    </span>
                </div>
                <div style="display: flex; gap: 20px; font-size: 14px; opacity: 0.9;">
                    <span><i class="fa-solid fa-user-tag"></i> ID: #<?php echo $shipper['id']; ?></span>
                    <span><i class="fa-solid fa-phone"></i> <?php echo htmlspecialchars($shipper['phone']); ?></span>
                    <span><i class="fa-solid fa-calendar-check"></i> Tham gia: <?php echo date('d/m/Y', strtotime($shipper['created_at'])); ?></span>
                </div>
            </div>
            <div style="text-align: right; background: rgba(255,255,255,0.1); padding: 15px 25px; border-radius: 15px; backdrop-filter: blur(5px);">
                <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; margin-bottom: 5px;">Phương tiện gắn liền</div>
                <div style="font-size: 20px; font-weight: 800; color: #ff7a00;">
                    <i class="fa-solid <?php echo strpos(strtolower($shipper['vehicle_type'] ?? ''), 'tải') !== false ? 'fa-truck' : 'fa-motorcycle'; ?>"></i>
                    <?php echo strtoupper($shipper['vehicle_type'] ?: 'CHƯA GÁN'); ?>
                </div>
            </div>
        </div>

        <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="stat-card" style="border-bottom: 4px solid #0a2a66;">
                <div style="color: #0a2a66; font-size: 12px; font-weight: 700; text-transform: uppercase;">Tổng đơn nhận</div>
                <div style="font-size: 28px; font-weight: 800; margin: 10px 0;"><?php echo number_format($total_orders); ?></div>
                <div style="font-size: 11px; color: #64748b;">Từ ngày bắt đầu</div>
            </div>
            <div class="stat-card" style="border-bottom: 4px solid #10b981;">
                <div style="color: #10b981; font-size: 12px; font-weight: 700; text-transform: uppercase;">Giao thành công</div>
                <div style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #10b981;"><?php echo number_format($completed_orders); ?></div>
                <div style="font-size: 11px; color: #64748b;">Tỷ lệ: <?php echo $success_rate; ?>%</div>
            </div>
            <div class="stat-card" style="border-bottom: 4px solid #3b82f6;">
                <div style="color: #3b82f6; font-size: 12px; font-weight: 700; text-transform: uppercase;">Xếp hạng</div>
                <div style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #3b82f6;">
                    <?php echo $avg_rating; ?> <span style="font-size: 18px;">★</span>
                </div>
                <div style="font-size: 11px; color: #64748b;"><?php echo $count_rating; ?> lượt đánh giá</div>
            </div>
            <div class="stat-card" style="border-bottom: 4px solid #f59e0b;">
                <div style="color: #f59e0b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Điểm thưởng</div>
                <div style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #f59e0b;">+850</div>
                <div style="font-size: 11px; color: #64748b;">Hạng: Bạch kim</div>
            </div>
        </div>

        <div class="dashboard-layout" style="grid-template-columns: 1fr; margin-top: 30px;">
            <div class="admin-card">
                <div class="admin-card-header">
                    <h3><i class="fa-solid fa-star"></i> Đánh giá khách hàng gần đây</h3>
                </div>
                <?php if (empty($feedbacks)): ?>
                    <div style="text-align: center; padding: 40px; color: #64748b;">Chưa có phản hồi nào cho shipper này.</div>
                <?php else: ?>
                    <div style="display: grid; gap: 15px;">
                        <?php foreach ($feedbacks as $fb): ?>
                            <div style="padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <div style="font-weight: 700; color: #0a2a66;"><?php echo htmlspecialchars($fb['customer_name']); ?></div>
                                    <div style="color: #ffb800; font-size: 14px;">
                                        <?php echo str_repeat('<i class="fa-solid fa-star"></i>', $fb['rating']) . str_repeat('<i class="fa-regular fa-star"></i>', 5 - $fb['rating']); ?>
                                    </div>
                                </div>
                                <div style="font-size: 14px; color: #475569; font-style: italic; margin-bottom: 10px;">"<?php echo htmlspecialchars($fb['feedback']); ?>"</div>
                                <div style="font-size:11px; color: #94a3b8; display: flex; justify-content: space-between;">
                                    <span>Mã đơn: #<?php echo $fb['order_code']; ?></span>
                                    <span>Ngày: <?php echo date('d/m/Y', strtotime($fb['created_at'])); ?></span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>
</html>

