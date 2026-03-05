<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$msg = "";

// Xử lý cập nhật trạng thái
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $id = intval($_POST['id']);
    $status = intval($_POST['status']);
    $note = trim($_POST['note_admin']);

    $stmt = $conn->prepare("UPDATE contact_messages SET status = ?, note_admin = ? WHERE id = ?");
    $stmt->bind_param("isi", $status, $note, $id);
    if ($stmt->execute()) {
        $msg = "Đã cập nhật trạng thái tin nhắn.";
    }
}

// Lấy danh sách tin nhắn
$filter_status = $_GET['status'] ?? 'all';
$sql = "SELECT * FROM contact_messages";
if ($filter_status !== 'all') {
    $sql .= " WHERE status = " . intval($filter_status);
}
$sql .= " ORDER BY created_at DESC";

$messages = [];
$res = $conn->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $messages[] = $row;
    }
}

$status_map = [
    0 => ['text' => 'Mới', 'class' => 'pending'],
    1 => ['text' => 'Đang xử lý', 'class' => 'shipping'],
    2 => ['text' => 'Đã giải quyết', 'class' => 'completed'],
];
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý Liên hệ & Khiếu nại | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hòm thư & Khiếu nại</h2>
        </div>

        <?php if ($msg): ?>
            <div style="padding:10px; background:#d4edda; color:#155724; margin-bottom:15px; border-radius:4px;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <!-- Filter -->
        <div class="filter-tabs" style="margin-bottom: 20px;">
            <a href="?status=all" class="filter-tab <?php echo $filter_status == 'all' ? 'active' : ''; ?>">Tất cả</a>
            <a href="?status=0" class="filter-tab <?php echo $filter_status == '0' ? 'active' : ''; ?>">Mới</a>
            <a href="?status=1" class="filter-tab <?php echo $filter_status == '1' ? 'active' : ''; ?>">Đang xử lý</a>
            <a href="?status=2" class="filter-tab <?php echo $filter_status == '2' ? 'active' : ''; ?>">Đã giải
                quyết</a>
        </div>

        <?php if (empty($messages)): ?>
            <p style="text-align:center; color:#666;">Không có tin nhắn nào.</p>
        <?php else: ?>
            <?php foreach ($messages as $m): ?>
                <div class="message-card status-<?php echo $m['status']; ?>">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>
                                <?php echo htmlspecialchars($m['name']); ?>
                            </strong> - <small>
                                <?php echo htmlspecialchars($m['email']); ?>
                            </small>
                            <div style="font-size:14px; color:#555; margin-top:5px;">Chủ đề: <strong>
                                    <?php echo htmlspecialchars($m['subject']); ?>
                                </strong></div>
                        </div>
                        <div>
                            <span class="status-badge status-<?php echo $status_map[$m['status']]['class']; ?>">
                                <?php echo $status_map[$m['status']]['text']; ?>
                            </span>
                            <button class="btn-action" style="margin-left:10px;"
                                onclick="toggleDetails(this, <?php echo $m['id']; ?>)">Xem</button>
                        </div>
                    </div>
                    <div class="details" id="details-<?php echo $m['id']; ?>">
                        <p><strong>Nội dung:</strong><br>
                            <?php echo nl2br(htmlspecialchars($m['message'])); ?>
                        </p>
                        <p><small>Gửi lúc:
                                <?php echo date('d/m/Y H:i', strtotime($m['created_at'])); ?> | IP:
                                <?php echo $m['ip_address']; ?>
                            </small></p>
                        <hr>
                        <form method="POST">
                            <input type="hidden" name="id" value="<?php echo $m['id']; ?>">
                            <div class="form-group"><label>Ghi chú của Admin</label><textarea name="note_admin" rows="2"
                                    style="width:100%; padding:8px;"><?php echo htmlspecialchars($m['note_admin']); ?></textarea>
                            </div>
                            <div class="form-group"><label>Cập nhật trạng thái</label><select name="status">
                                    <option value="0" <?php if ($m['status'] == 0)
                                        echo 'selected'; ?>>Mới</option>
                                    <option value="1" <?php if ($m['status'] == 1)
                                        echo 'selected'; ?>>Đang xử lý</option>
                                    <option value="2" <?php if ($m['status'] == 2)
                                        echo 'selected'; ?>>Đã giải quyết</option>
                                </select></div>
                            <button type="submit" name="update_status" class="btn-primary">Lưu thay đổi</button>
                        </form>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script>
        function toggleDetails(btn, id) {
            const detailsDiv = document.getElementById('details-' + id);
            if (detailsDiv.style.display === 'block') {
                detailsDiv.style.display = 'none';
                btn.innerText = 'Xem';
            } else {
                detailsDiv.style.display = 'block';
                btn.innerText = 'Đóng';
            }
        }
    </script>
</body>

</html>

