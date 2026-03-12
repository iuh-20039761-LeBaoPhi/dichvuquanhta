<?php require_once "auth.php"; ?>
<form method="POST">
    <input name="name" placeholder="Tên tài xế">
    <input name="phone" placeholder="SĐT">
    <input name="license_type" placeholder="Loại bằng lái">
    <button name="add">Thêm</button>
</form>

<?php
require_once "../main/db.php";
if (isset($_POST['add'])) {
    $stmt = $conn->prepare(
        "INSERT INTO drivers (name, phone, license_type) VALUES (?,?,?)"
    );
    $stmt->bind_param("sss",
        $_POST['name'],
        $_POST['phone'],
        $_POST['license_type']
    );
    $stmt->execute();
    header("Location: driver.php");
}
