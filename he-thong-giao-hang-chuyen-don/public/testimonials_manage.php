<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

$msg = "";

// Xử lý Form (Thêm / Sửa / Xóa)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
        $name = $_POST['customer_name'] ?? '';
        $role = $_POST['customer_role'] ?? '';
        $rating = intval($_POST['rating'] ?? 5);
        $content = $_POST['content'] ?? '';
        $visible = isset($_POST['is_visible']) ? 1 : 0;
        $id = intval($_POST['id'] ?? 0);

        if ($action === 'add') {
            $stmt = $conn->prepare("INSERT INTO testimonials (customer_name, customer_role, rating, content, is_visible) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssisi", $name, $role, $rating, $content, $visible);
            if ($stmt->execute())
                $msg = "Thêm đánh giá mới thành công!";
            else
                $msg = "Lỗi: " . $conn->error;
            $stmt->close();
        } elseif ($action === 'edit' && $id > 0) {
            $stmt = $conn->prepare("UPDATE testimonials SET customer_name=?, customer_role=?, rating=?, content=?, is_visible=? WHERE id=?");
            $stmt->bind_param("ssisii", $name, $role, $rating, $content, $visible, $id);
            if ($stmt->execute())
                $msg = "Cập nhật đánh giá thành công!";
            else
                $msg = "Lỗi: " . $conn->error;
            $stmt->close();
        } elseif ($action === 'delete' && $id > 0) {
            $stmt = $conn->prepare("DELETE FROM testimonials WHERE id=?");
            $stmt->bind_param("i", $id);
            if ($stmt->execute())
                $msg = "Đã xóa đánh giá!";
            else
                $msg = "Lỗi: " . $conn->error;
            $stmt->close();
        }
    }
}

// Lấy danh sách đánh giá
$testimonials = [];
$res = $conn->query("SELECT * FROM testimonials ORDER BY created_at DESC");
if ($res) {
    while ($row = $res->fetch_assoc())
        $testimonials[] = $row;
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý đánh giá | FastGo Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý đánh giá khách hàng</h2>
            <button class="btn-primary" onclick="openModal('add')">+ Thêm đánh giá</button>
        </div>

        <?php if ($msg): ?>
            <div
                style="padding: 15px; background: #d4edda; color: #155724; border-radius: 8px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <div class="table-section">
            <table class="order-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Khách hàng</th>
                        <th>Vai trò</th>
                        <th>Đánh giá</th>
                        <th>Nội dung</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($testimonials as $t): ?>
                        <tr>
                            <td>#<?php echo $t['id']; ?></td>
                            <td><strong><?php echo htmlspecialchars($t['customer_name']); ?></strong></td>
                            <td><?php echo htmlspecialchars($t['customer_role']); ?></td>
                            <td style="color: #ffc107; letter-spacing: 2px;"><?php echo str_repeat('★', $t['rating']); ?>
                            </td>
                            <td><?php echo htmlspecialchars(mb_strimwidth($t['content'], 0, 60, "...")); ?></td>
                            <td>
                                <?php if ($t['is_visible']): ?>
                                    <span class="status-badge status-completed">Hiển thị</span>
                                <?php else: ?>
                                    <span class="status-badge status-cancelled">Đang ẩn</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <button class="btn-action" onclick='openModal("edit", <?php echo json_encode($t); ?>)'>✏️
                                    Sửa</button>

                                <!-- Form Xóa có xác nhận -->
                                <form method="POST" style="display:inline-block;"
                                    onsubmit="return confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác.');">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?php echo $t['id']; ?>">
                                    <button type="submit" class="btn-action"
                                        style="color: #dc3545; border-color: #dc3545; margin-left: 5px;">🗑️ Xóa</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </main>

    <!-- Modal Form Thêm/Sửa -->
    <div id="testimonialModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h3 id="modalTitle"
                style="margin-bottom: 20px; color: #0a2a66; border-bottom: 2px solid #ff7a00; padding-bottom: 10px;">
                Thêm đánh giá mới</h3>

            <!-- Form có xác nhận khi lưu -->
            <form method="POST" id="testimonialForm" onsubmit="return confirmSave()">
                <input type="hidden" name="action" id="formAction" value="add">
                <input type="hidden" name="id" id="testimonialId" value="">

                <div class="form-group">
                    <label>Tên khách hàng (*)</label>
                    <input type="text" name="customer_name" id="customer_name" required placeholder="VD: Nguyễn Văn A">
                </div>
                <div class="form-group">
                    <label>Vai trò (*)</label>
                    <input type="text" name="customer_role" id="customer_role" required
                        placeholder="VD: Chủ shop quần áo">
                </div>
                <div class="form-group">
                    <label>Số sao đánh giá</label>
                    <select name="rating" id="rating">
                        <option value="5">⭐⭐⭐⭐⭐ (5 Sao)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Sao)</option>
                        <option value="3">⭐⭐⭐ (3 Sao)</option>
                        <option value="2">⭐⭐ (2 Sao)</option>
                        <option value="1">⭐ (1 Sao)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nội dung đánh giá (*)</label>
                    <textarea name="content" id="content" rows="4"
                        style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;" required
                        placeholder="Nhập lời nhận xét..."></textarea>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight: normal;">
                        <input type="checkbox" name="is_visible" id="is_visible" value="1" checked style="width: auto;">
                        Hiển thị ngay trên trang chủ
                    </label>
                </div>
                <button type="submit" class="btn-primary" style="width:100%; margin-top:20px;">Lưu lại</button>
            </form>
        </div>
    </div>

    <script>
        const modal = document.getElementById('testimonialModal');
        const form = document.getElementById('testimonialForm');
        const modalTitle = document.getElementById('modalTitle');
        const formAction = document.getElementById('formAction');
        const testimonialId = document.getElementById('testimonialId');

        // Các input
        const inpName = document.getElementById('customer_name');
        const inpRole = document.getElementById('customer_role');
        const inpRating = document.getElementById('rating');
        const inpContent = document.getElementById('content');
        const inpVisible = document.getElementById('is_visible');

        // Hàm mở modal (dùng chung cho Thêm và Sửa)
        function openModal(mode, data = null) {
            modal.style.display = 'block';
            if (mode === 'edit' && data) {
                modalTitle.innerText = 'Cập nhật đánh giá';
                formAction.value = 'edit';
                testimonialId.value = data.id;

                // Điền dữ liệu cũ
                inpName.value = data.customer_name;
                inpRole.value = data.customer_role;
                inpRating.value = data.rating;
                inpContent.value = data.content;
                inpVisible.checked = data.is_visible == 1;
            } else {
                modalTitle.innerText = 'Thêm đánh giá mới';
                formAction.value = 'add';
                testimonialId.value = '';
                form.reset();
                inpVisible.checked = true;
            }
        }

        function closeModal() {
            modal.style.display = 'none';
        }

        // Hàm xác nhận trước khi lưu (Sửa/Thêm)
        function confirmSave() {
            const actionText = formAction.value === 'edit' ? 'cập nhật thay đổi' : 'thêm đánh giá mới';
            return confirm('Bạn có chắc chắn muốn ' + actionText + ' không?');
        }

        // Đóng modal khi click ra ngoài
        window.onclick = function (event) {
            if (event.target == modal) {
                closeModal();
            }
        }
    </script>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>

