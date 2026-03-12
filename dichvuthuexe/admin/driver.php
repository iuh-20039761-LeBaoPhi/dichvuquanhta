<?php
require_once "auth.php";
require_once "../main/db.php";

$result = $conn->query("SELECT * FROM drivers ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html>
<head>
    <title>Quản lý tài xế</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/admin.css">
    <link rel="stylesheet" href="../assets/sidebar.css">
</head>
<body>

<?php include "sidebar.php"; ?>

<div class="main-content">
    <h2>Danh sách tài xế</h2>

    <a href="driver_add.php" class="btn">➕ Thêm tài xế</a>

    <table>
        <tr>
            <th>Tên</th>
            <th>SĐT</th>
            <th>Bằng lái</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
        </tr>

        <?php while ($d = $result->fetch_assoc()) { ?>
        <tr>
            <td><?= $d['name'] ?></td>
            <td><?= $d['phone'] ?></td>
            <td><?= $d['license_type'] ?></td>
            <td><?= $d['status'] ?></td>
             <td>
        <a 
            href="driver_delete.php?id=<?= $d['id'] ?>" 
            onclick="return confirm('Xóa tài xế này?')"
            class="btn-delete"
        >
            🗑 Xóa
        </a>
    </td>
        </tr>
        <?php } ?>
    </table>
</div>

</body>
</html>
