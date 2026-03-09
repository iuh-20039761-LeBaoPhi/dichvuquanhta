<?php
session_start();
require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $phone = $_POST['phone'];
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT * FROM customers WHERE phone=?");
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['customer'] = [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'phone' => $user['phone']
        ];
        header("Location: customer_dashboard.php");
        exit;
    } else {
        header("Location: login_customer.php?error=1");
        exit;
    }
}
