<?php
require_once "../main/db.php";

$id = $_GET['id'] ?? 0;
$status = $_GET['s'] ?? '';

if ($id && in_array($status, ['done', 'cancel'])) {

    if ($status === 'done') {
        $stmt = $conn->prepare("
            UPDATE driver_orders
            SET status = ?, completed_driver_id = driver_id
            WHERE id = ?
        ");
    } else {
        $stmt = $conn->prepare("
            UPDATE driver_orders
            SET status = ?
            WHERE id = ?
        ");
    }

    $stmt->bind_param("si", $status, $id);
    $stmt->execute();
}


header("Location: dashboard.php");
