<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

$msg = "";

// Xử lý cập nhật trạng thái
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $id = intval($_POST['id']);
    $status = intval($_POST['status']);
    $note = trim($_POST['note_admin']);

    $stmt = $conn->prepare("UPDATE lien_he SET trang_thai = ?, ghi_chu_quan_tri = ? WHERE id = ?");
    $stmt->bind_param("isi", $status, $note, $id);
    if ($stmt->execute()) {
        $msg = "Đã cập nhật trạng thái tin nhắn thành công!";
    }
}

// Lấy danh sách tin nhắn
$filter_status = $_GET['status'] ?? 'all';
$sql = "SELECT id, ten AS name, email, chu_de AS subject, noi_dung AS message, trang_thai AS status, ghi_chu_quan_tri AS note_admin, tao_luc AS created_at FROM lien_he";
if ($filter_status !== 'all') {
    $sql .= " WHERE trang_thai = " . intval($filter_status);
}
$sql .= " ORDER BY tao_luc DESC";

$messages = [];
$res = $conn->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $messages[] = $row;
    }
}

$status_map = [
    0 => ['text' => 'Mới nhận', 'class' => 'pending', 'icon' => 'fa-envelope-dot'],
    1 => ['text' => 'Đang xử lý', 'class' => 'shipping', 'icon' => 'fa-spinner'],
    2 => ['text' => 'Đã giải quyết', 'class' => 'completed', 'icon' => 'fa-check-double'],
];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hòm thư liên hệ | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .message-card {
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            border-left: 4px solid #cbd5e1;
            transition: all 0.3s ease;
        }
        .message-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px rgba(0,0,0,0.05);
        }
        .message-card.status-0 { border-left-color: #3b82f6; } /* Mới */
        .message-card.status-1 { border-left-color: #f59e0b; } /* Đang xử lý */
        .message-card.status-2 { border-left-color: #10b981; } /* Đã xong */
        
        .filter-nav {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
            background: #f1f5f9;
            padding: 5px;
            border-radius: 12px;
            width: fit-content;
        }
        .filter-btn {
            padding: 8px 16px;
            border-radius: 8px;
            text-decoration: none;
            color: #64748b;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
        }
        .filter-btn.active {
            background: #fff;
            color: #0a2a66;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hòm thư & Khiếu nại</h2>
            <div class="filter-nav">
                <a href="?status=all" class="filter-btn <?php echo $filter_status == 'all' ? 'active' : ''; ?>">Tất cả</a>
                <a href="?status=0" class="filter-btn <?php echo $filter_status == '0' ? 'active' : ''; ?>">Mới nhận</a>
                <a href="?status=1" class="filter-btn <?php echo $filter_status == '1' ? 'active' : ''; ?>">Đang xử lý</a>
                <a href="?status=2" class="filter-btn <?php echo $filter_status == '2' ? 'active' : ''; ?>">Đã xong</a>
            </div>
        </div>

        <?php if ($msg): ?>
            <div class="status-badge status-active" style="width:100%; margin-bottom: 25px; padding: 12px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <?php if (empty($messages)): ?>
            <div class="admin-card" style="text-align: center; padding: 60px;">
                <i class="fa-solid fa-folder-open" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
                <p style="color: #64748b;">Hòm thư hiện tại đang trống.</p>
            </div>
        <?php else: ?>
            <div class="dashboard-layout" style="grid-template-columns: 1fr; gap: 0;">
                <?php foreach ($messages as $m): ?>
                    <div class="message-card status-<?php echo $m['status']; ?>">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <span class="status-badge status-<?php echo $status_map[$m['status']]['class']; ?>" style="font-size: 11px;">
                                        <i class="fa-solid <?php echo $status_map[$m['status']]['icon']; ?>"></i> <?php echo $status_map[$m['status']]['text']; ?>
                                    </span>
                                    <span style="color: #64748b; font-size: 13px;"><i class="fa-regular fa-clock"></i> <?php echo date('d/m/Y H:i', strtotime($m['created_at'])); ?></span>
                                </div>
                                <h3 style="font-size: 18px; color: #0a2a66; margin-bottom: 5px;"><?php echo htmlspecialchars($m['subject']); ?></h3>
                                <div style="font-size: 14px; margin-bottom: 15px;">
                                    <strong style="color: #334155;"><?php echo htmlspecialchars($m['name']); ?></strong> 
                                    <span style="color: #94a3b8; font-size: 12px; margin-left: 5px;">&lt;<?php echo htmlspecialchars($m['email']); ?>&gt;</span>
                                </div>
                                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; color: #475569; font-size: 14px; line-height: 1.6; border: 1px solid #f1f5f9; margin-bottom: 20px;">
                                    <?php echo nl2br(htmlspecialchars($m['message'])); ?>
                                </div>
                                
                                <form method="POST" style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #edf2f7;">
                                    <input type="hidden" name="id" value="<?php echo $m['id']; ?>">
                                    <div class="grid-responsive">
                                        <div class="form-group">
                                            <label>Ghi chú phản hồi / Xử lý</label>
                                            <textarea name="note_admin" class="admin-input" rows="2" placeholder="Ghi lại nội dung đã phản hồi cho khách..."><?php echo htmlspecialchars($m['note_admin']); ?></textarea>
                                        </div>
                                        <div class="form-group">
                                            <label>Trạng thái</label>
                                            <select name="status" class="admin-select">
                                                <option value="0" <?php echo $m['status'] == 0 ? 'selected' : ''; ?>>🆕 Mới nhận</option>
                                                <option value="1" <?php echo $m['status'] == 1 ? 'selected' : ''; ?>>⏳ Đang xử lý</option>
                                                <option value="2" <?php echo $m['status'] == 2 ? 'selected' : ''; ?>>✅ Đã giải quyết</option>
                                            </select>
                                            <button type="submit" name="update_status" class="btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">Lưu</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>
</html>



