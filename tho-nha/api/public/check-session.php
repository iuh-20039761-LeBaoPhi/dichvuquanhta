<?php
/**
 * check-session.php
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Kiá»ƒm tra tráº¡ng thÃ¡i Ä‘Äƒng nháº­p hiá»‡n táº¡i tá»« PHP session.
 *
 * ÄÆ°á»£c gá»i bá»Ÿi: auth-nav.js â†’ initAuthNav()
 * Method:        GET
 * Response:      { logged_in: bool, role?: string, name?: string }
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

require_once __DIR__ . '/../../config/session-config.php';

$auth = getAuthSession();

if ($auth) {
    echo json_encode([
        'logged_in' => true,
        'role'      => $auth['role'] ?? 'customer',
        'name'      => $auth['name'] ?? 'User',
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'logged_in' => false,
    ]);
}

