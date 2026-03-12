<?php
require_once "auth.php";
require_once "../main/db.php";

$result = $conn->query("
    SELECT * FROM contacts
    ORDER BY created_at DESC
");
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Liên hệ khách hàng</title>
    <link rel="stylesheet" href="../assets/admin.css">
    <link rel="stylesheet" href="../assets/sidebar.css">
</head>
<body>

<?php include "sidebar.php"; ?>

<div class="main-content">
    <h2>📩 Liên hệ từ khách hàng</h2>

    <table>
        <tr>
            <th>Tên</th>
            <th>SĐT</th>
            <th>Email</th>
            <th>Nội dung</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th>Xử lý</th>
        </tr>

        <?php while ($c = $result->fetch_assoc()) { ?>
        <tr>
            <td><?= $c['name'] ?></td>
            <td><?= $c['phone'] ?></td>
            <td><?= $c['email'] ?></td>
            <td><?= nl2br($c['message']) ?></td>
            <td><?= $c['created_at'] ?></td>
            <td><?= $c['status'] ?></td>
            <td>
                <?php if ($c['status'] === 'new') { ?>
                    <a href="contact_done.php?id=<?= $c['id'] ?>">✔ Đã xử lý</a>
                <?php } ?>
            </td>
        </tr>
        <?php } ?>
    </table>
</div>

</body>
</html>
