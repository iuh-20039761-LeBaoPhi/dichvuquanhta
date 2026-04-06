<?php
/**
 * public/api/public/check-session.php
 * Trả về trạng thái session dùng chung.
 */

require_once __DIR__ . '/../config/session-config.php';

if (!empty($_SESSION['auth']) && $_SESSION['auth']['logged_in'] === true) {
    echo json_encode([
        'logged_in' => true,
        'id'        => $_SESSION['auth']['id'] ?? null,
        'role'      => $_SESSION['auth']['role'] ?? 'customer',
        'name'      => $_SESSION['auth']['name'] ?? 'User',
        'phone'     => $_SESSION['auth']['phone'] ?? '',
        'extra'     => $_SESSION['auth']['extra'] ?? [],
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['logged_in' => false]);
}
