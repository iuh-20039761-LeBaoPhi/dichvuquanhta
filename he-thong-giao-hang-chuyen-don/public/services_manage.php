<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$msg = "";
$error = "";

// Xử lý Thêm / Sửa / Xóa
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'delete') {
        $id = intval($_POST['id']);
        $conn->query("DELETE FROM services WHERE id = $id");
        $msg = "Đã xóa dịch vụ.";
    } elseif ($action === 'save') { // Chỉ xử lý khi action là 'save' để tránh lỗi undefined key
        $name = trim($_POST['name'] ?? '');
        $type_key = trim($_POST['type_key'] ?? '');
        $base_price = floatval($_POST['base_price'] ?? 0);
        $description = trim($_POST['description'] ?? '');
        $id = intval($_POST['id'] ?? 0);

        if (empty($name) || empty($type_key)) {
            $error = "Vui lòng nhập tên và mã dịch vụ.";
        } else {
            if ($id > 0) {
                // Update
                $stmt = $conn->prepare("UPDATE services SET name=?, type_key=?, base_price=?, description=? WHERE id=?");
                $stmt->bind_param("ssdsi", $name, $type_key, $base_price, $description, $id);
            } else {
                // Insert
                $stmt = $conn->prepare("INSERT INTO services (name, type_key, base_price, description) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("ssds", $name, $type_key, $base_price, $description);
            }

            if ($stmt->execute()) {
                $msg = "Lưu dịch vụ thành công!";
            } else {
                $error = "Lỗi: " . $conn->error;
            }
        }
    }
}

// Lấy danh sách dịch vụ
$services = [];
$res = $conn->query("SELECT * FROM services ORDER BY base_price ASC");
if ($res)
    while ($row = $res->fetch_assoc())
        $services[] = $row;
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý Dịch vụ & Giá | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý Dịch vụ & Bảng giá</h2>
            <a href="orders_manage.php" class="back-link">← Quay lại</a>
            <a href="admin_pricing_guide.php" class="btn-secondary"
                style="margin-left: auto; text-decoration: none; border: 1px solid #0a2a66; color: #0a2a66;">
                📖 Xem công thức tính giá</a>
        </div>

        <?php if ($msg): ?>
            <div style="padding:10px; background:#d4edda; color:#155724; margin-bottom:15px; border-radius:4px;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div style="padding:10px; background:#f8d7da; color:#721c24; margin-bottom:15px; border-radius:4px;">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <!-- Form Thêm/Sửa -->
        <form method="POST" class="form-inline">
            <input type="hidden" name="action" value="save">
            <input type="hidden" name="id" id="edit-id" value="0">
            <input type="text" name="name" id="edit-name" placeholder="Tên dịch vụ (VD: Giao nhanh)" required>
            <input type="text" name="type_key" id="edit-key" placeholder="Mã (VD: express)" required>
            <input type="number" name="base_price" id="edit-price" placeholder="Giá cơ bản (VNĐ)" required>
            <input type="text" name="description" id="edit-desc" placeholder="Mô tả ngắn">
            <button type="submit" class="btn-primary">Lưu</button>
            <button type="button" onclick="resetForm()" class="btn-secondary"
                style="color:#333; border:1px solid #ccc;">Hủy</button>
        </form>

        <div class="table-section">
            <table class="order-table">
                <thead>
                    <tr>
                        <th>Tên dịch vụ</th>
                        <th>Mã (Key)</th>
                        <th>Giá cơ bản</th>
                        <th>Mô tả</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($services as $svc): ?>
                        <tr>
                            <td><strong>
                                    <?php echo htmlspecialchars($svc['name']); ?>
                                </strong></td>
                            <td><code><?php echo htmlspecialchars($svc['type_key']); ?></code></td>
                            <td style="color:#d9534f; font-weight:bold;">
                                <?php echo number_format($svc['base_price']); ?>đ
                            </td>
                            <td>
                                <?php echo htmlspecialchars($svc['description']); ?>
                            </td>
                            <td>
                                <button onclick='editService(<?php echo json_encode($svc); ?>)'
                                    class="btn-action">Sửa</button>
                                <form method="POST" style="display:inline-block;"
                                    onsubmit="return confirm('Xóa dịch vụ này?');">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?php echo $svc['id']; ?>">
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
        function editService(data) {
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-name').value = data.name;
            document.getElementById('edit-key').value = data.type_key;
            document.getElementById('edit-price').value = data.base_price;
            document.getElementById('edit-desc').value = data.description;
            window.scrollTo(0, 0);
        }

        function resetForm() {
            document.getElementById('edit-id').value = 0;
            document.getElementById('edit-name').value = '';
            document.getElementById('edit-key').value = '';
            document.getElementById('edit-price').value = '';
            document.getElementById('edit-desc').value = '';
        }
    </script>
</body>

</html>

