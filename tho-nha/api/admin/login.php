<?php
session_start();
require_once '../db.php';

$data = json_decode(file_get_contents("php://input"), true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if(!$username || !$password){
    echo json_encode(['status'=>'error','message'=>'Thiếu thông tin']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM admins WHERE username=? LIMIT 1");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if($admin = $result->fetch_assoc()){
    if(password_verify($password, $admin['password'])){
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];

        echo json_encode([
            'status'=>'success',
            'username'=>$admin['username']
        ]);
        exit;
    }
}

echo json_encode(['status'=>'error','message'=>'Sai tài khoản hoặc mật khẩu']);
