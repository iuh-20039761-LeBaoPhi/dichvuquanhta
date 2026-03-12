<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_GET['id'] ?? 0;

if ($id) {
    $conn->query("UPDATE contacts SET status='done' WHERE id=$id");
}

header("Location: contacts.php");
exit;
