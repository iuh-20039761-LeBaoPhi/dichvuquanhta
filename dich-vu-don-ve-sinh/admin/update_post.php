<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_POST['id'];
$title = $_POST['title'];
$content = $_POST['content'];

$image = $_FILES['image']['name'];

if($image){
    $imageName = time() . "_" . $image;
    move_uploaded_file($_FILES['image']['tmp_name'], "../uploads/" . $imageName);

    $stmt = $conn->prepare("UPDATE posts SET title=?, content=?, image=? WHERE id=?");
    $stmt->bind_param("sssi", $title, $content, $imageName, $id);
}else{
    $stmt = $conn->prepare("UPDATE posts SET title=?, content=? WHERE id=?");
    $stmt->bind_param("ssi", $title, $content, $id);
}

$stmt->execute();

header("Location: post.php");
exit;