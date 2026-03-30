<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

$pricingConfig = ['weight_free' => 2, 'weight_price' => 5000, 'cod_min' => 5000];
$isLoggedIn = !empty($_SESSION['user_id']) && (($_SESSION['role'] ?? '') !== 'admin');
$role = $isLoggedIn ? ($_SESSION['role'] ?? 'customer') : 'guest';
$user = null;

if ($isLoggedIn) {
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    if ($userId > 0) {
        $userStmt = $conn->prepare("SELECT id, ten_dang_nhap AS username, ho_ten AS fullname, vai_tro AS role FROM nguoi_dung WHERE id = ? LIMIT 1");
        if ($userStmt) {
            $userStmt->bind_param('i', $userId);
            $userStmt->execute();
            $userRow = $userStmt->get_result()->fetch_assoc();
            $userStmt->close();

            if ($userRow && ($userRow['role'] ?? '') !== 'admin') {
                $role = $userRow['role'] ?? $role;
                $user = [
                    'id' => (int) ($userRow['id'] ?? $userId),
                    'username' => $userRow['username'] ?? '',
                    'fullname' => $userRow['fullname'] ?? '',
                    'role' => $role,
                ];
            } else {
                $isLoggedIn = false;
                $role = 'guest';
            }
        }
    }
}

echo json_encode([
    'status' => 'success',
    'data' => [
        'pricing_config' => $pricingConfig,
        'is_logged_in' => $isLoggedIn,
        'role' => $role,
        'user' => $user,
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$conn->close();
?>
