<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$msg = "";

// Xử lý Thêm / Sửa / Xóa
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $question = trim($_POST['question'] ?? '');
    $answer = trim($_POST['answer'] ?? '');
    $order = intval($_POST['display_order'] ?? 0);
    $id = intval($_POST['id'] ?? 0);

    if ($action === 'delete' && $id > 0) {
        $conn->query("DELETE FROM faqs WHERE id = $id");
        $msg = "Đã xóa câu hỏi.";
    } elseif ($action === 'save') {
        if (empty($question) || empty($answer)) {
            $msg = "Vui lòng nhập câu hỏi và câu trả lời.";
        } else {
            if ($id > 0) {
                $stmt = $conn->prepare("UPDATE faqs SET question=?, answer=?, display_order=? WHERE id=?");
                $stmt->bind_param("ssii", $question, $answer, $order, $id);
            } else {
                $stmt = $conn->prepare("INSERT INTO faqs (question, answer, display_order) VALUES (?, ?, ?)");
                $stmt->bind_param("ssi", $question, $answer, $order);
            }
            if ($stmt->execute())
                $msg = "Lưu thành công!";
            else
                $msg = "Lỗi: " . $conn->error;
        }
    }
}

// Lấy danh sách FAQ
$faqs = [];
$res = $conn->query("SELECT * FROM faqs ORDER BY display_order ASC, id DESC");
if ($res)
    while ($r = $res->fetch_assoc())
        $faqs[] = $r;
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý FAQ | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý FAQ & Hướng dẫn</h2>
        </div>

        <?php if ($msg): ?>
            <div style="padding:10px; background:#d4edda; color:#155724; margin-bottom:15px; border-radius:4px;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <!-- Form Thêm/Sửa -->
        <div class="form-box"
            style="background:#fff; padding:20px; border-radius:8px; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
            <h3 style="color:#0a2a66; margin-bottom:15px;" id="form-title">Thêm câu hỏi mới</h3>
            <form method="POST">
                <input type="hidden" name="action" value="save">
                <input type="hidden" name="id" id="edit-id" value="0">
                <div class="form-group">
                    <label>Câu hỏi</label>
                    <input type="text" name="question" id="edit-question" required
                        style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Câu trả lời</label>
                    <textarea name="answer" id="edit-answer" rows="3" required
                        style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;"></textarea>
                </div>
                <div class="form-group">
                    <label>Thứ tự hiển thị</label>
                    <input type="number" name="display_order" id="edit-order" value="0"
                        style="width:100px; padding:10px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <button type="submit" class="btn-primary">Lưu lại</button>
                <button type="button" onclick="resetForm()" class="btn-secondary" style="margin-left:10px;">Hủy / Nhập
                    mới</button>
            </form>
        </div>

        <!-- Danh sách -->
        <div class="table-section">
            <table class="order-table">
                <thead>
                    <tr>
                        <th width="50">TT</th>
                        <th>Câu hỏi</th>
                        <th>Câu trả lời</th>
                        <th width="150">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($faqs as $f): ?>
                        <tr>
                            <td style="text-align:center;">
                                <?php echo $f['display_order']; ?>
                            </td>
                            <td><strong>
                                    <?php echo htmlspecialchars($f['question']); ?>
                                </strong></td>
                            <td>
                                <?php echo nl2br(htmlspecialchars($f['answer'])); ?>
                            </td>
                            <td>
                                <button onclick='editFaq(<?php echo json_encode($f); ?>)' class="btn-action">Sửa</button>
                                <form method="POST" style="display:inline-block;"
                                    onsubmit="return confirm('Xóa câu hỏi này?');">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?php echo $f['id']; ?>">
                                    <button type="submit" class="btn-action"
                                        style="color:#d9534f; border-color:#d9534f;">Xóa</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script>
        function editFaq(data) {
            document.getElementById('form-title').innerText = 'Cập nhật câu hỏi';
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-question').value = data.question;
            document.getElementById('edit-answer').value = data.answer;
            document.getElementById('edit-order').value = data.display_order;
            window.scrollTo(0, 0);
        }
        function resetForm() {
            document.getElementById('form-title').innerText = 'Thêm câu hỏi mới';
            document.getElementById('edit-id').value = 0;
            document.getElementById('edit-question').value = '';
            document.getElementById('edit-answer').value = '';
            document.getElementById('edit-order').value = 0;
        }
    </script>
</body>

</html>

