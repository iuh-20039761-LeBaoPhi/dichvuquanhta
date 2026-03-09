<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];
$msg = "";

// Xử lý thêm mới
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_address'])) {
    $name = trim($_POST['name']); // Tên gợi nhớ (Nhà, Cty...)
    $phone = trim($_POST['phone']);
    $address = trim($_POST['address']);

    if (empty($name) || empty($address) || empty($phone)) {
        $msg = "Vui lòng nhập đầy đủ thông tin.";
    } else {
        $stmt = $conn->prepare("INSERT INTO saved_addresses (user_id, name, phone, address) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $user_id, $name, $phone, $address);
        if ($stmt->execute()) {
            $msg = "Đã thêm địa chỉ thành công!";
        } else {
            $msg = "Lỗi: " . $conn->error;
        }
        $stmt->close();
    }
}

// Xử lý xóa
if (isset($_GET['del'])) {
    $del_id = intval($_GET['del']);
    $stmt = $conn->prepare("DELETE FROM saved_addresses WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $del_id, $user_id);
    $stmt->execute();
    header("Location: address_book.php");
    exit;
}

// Lấy danh sách
$addresses = [];
$res = $conn->query("SELECT * FROM saved_addresses WHERE user_id = $user_id ORDER BY id DESC");
if ($res) {
    while ($row = $res->fetch_assoc())
        $addresses[] = $row;
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Sổ địa chỉ | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_user.php'; ?>
    <main class="container" style="padding: 40px 20px; max-width: 800px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin:0;">Sổ địa chỉ</h2>
            <a href="dashboard.php" class="btn-secondary"
                style="color:#0a2a66; border-color:#0a2a66; padding:8px 15px;">← Quay lại</a>
        </div>

        <?php if ($msg): ?>
            <div style="padding:10px; background:#d4edda; color:#155724; border-radius:4px; margin-bottom:20px;">
                <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <!-- Form thêm -->
        <div class="form-box">
            <h3 style="margin-bottom:15px; color:#0a2a66;">+ Thêm địa chỉ mới</h3>
            <form method="POST" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <input type="text" name="name" placeholder="Tên gợi nhớ (VD: Nhà riêng, Cty)" required
                    style="padding:10px; border:1px solid #ddd; border-radius:4px;">
                <input type="text" name="phone" placeholder="Số điện thoại liên hệ" required
                    style="padding:10px; border:1px solid #ddd; border-radius:4px;">
                <input type="text" name="address" placeholder="Địa chỉ chi tiết (Số nhà, đường, quận...)" required
                    style="grid-column: 1 / -1; padding:10px; border:1px solid #ddd; border-radius:4px;">
                <button type="submit" name="add_address" class="btn-primary" style="grid-column: 1 / -1;">Lưu địa
                    chỉ</button>
            </form>
        </div>

        <!-- Danh sách -->
        <h3 style="margin-bottom:15px;">Danh sách đã lưu</h3>
        <?php if (empty($addresses)): ?>
            <p style="color:#666;">Chưa có địa chỉ nào được lưu.</p>
        <?php else: ?>
            <?php foreach ($addresses as $addr): ?>
                <div class="address-card">
                    <div>
                        <strong style="font-size:16px; color:#0a2a66;">
                            <?php echo htmlspecialchars($addr['name']); ?>
                        </strong>
                        <div style="color:#555; margin-top:5px;">
                            <?php echo htmlspecialchars($addr['address']); ?>
                        </div>
                        <div style="color:#888; font-size:13px; margin-top:3px;">📞
                            <?php echo htmlspecialchars($addr['phone']); ?>
                        </div>
                    </div>
                    <a href="?del=<?php echo $addr['id']; ?>" onclick="return confirm('Xóa địa chỉ này?')"
                        style="color:#dc3545; text-decoration:none; font-weight:bold; border:1px solid #dc3545; padding:5px 10px; border-radius:4px;">Xóa</a>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>
