<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_GET['id'] ?? 0;

if($id){
    // lấy ảnh để xóa file
    $stmt = $conn->prepare("SELECT image FROM posts WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $post = $stmt->get_result()->fetch_assoc();

    if($post){
        // xóa ảnh
        if(file_exists("../uploads/" . $post['image'])){
            unlink("../uploads/" . $post['image']);
        }

        // xóa DB
        $stmt = $conn->prepare("DELETE FROM posts WHERE id=?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
    }
}

header("Location: post.php");
exit;