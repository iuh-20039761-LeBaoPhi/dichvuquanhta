<?php
require_once "../main/db.php";

$title = $_POST['title'];
$content = $_POST['content'];

// xử lý upload ảnh
$imageName = "";

if(isset($_FILES['image']) && $_FILES['image']['error'] == 0){

   $targetDir = __DIR__ . "/../uploads/";

if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}
    $imageName = time() . "_" . $_FILES['image']['name'];

    move_uploaded_file($_FILES['image']['tmp_name'], $targetDir . $imageName);
}

// insert DB
$stmt = $conn->prepare("INSERT INTO posts (title, content, image) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $title, $content, $imageName);
$stmt->execute();

header("Location: add_post.php?success=1");
exit;