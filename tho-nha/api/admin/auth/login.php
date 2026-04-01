<?php
/**
 * Admin Login â€” Táº¡o PHP session cho quáº£n trá»‹ viÃªn
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ÄÆ°á»£c gá»i bá»Ÿi: pages/admin/dang-nhap.html (sau khi KRUD validate OK)
 *
 * Method:  POST
 * Body:    { "email": "admin@example.com", "name": "Admin" }
 * Response: { "success": true } hoáº·c { "success": false, "message": "..." }
 *
 * Luá»“ng:
 *   1. JS validate tÃ i khoáº£n admin qua KRUD API (client-side)
 *   2. KRUD OK â†’ JS gá»i POST endpoint nÃ y
 *   3. PHP táº¡o session vá»›i role = "admin"
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

require_once __DIR__ . '/../../../config/session-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method Not Allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['email'])) {
    jsonResponse(false, 'Thiáº¿u thÃ´ng tin Ä‘Äƒng nháº­p (email)');
}

$email = trim($input['email'] ?? '');
$name  = trim($input['name'] ?? $email);

setAuthSession('admin', $name, $email);

jsonResponse(true, 'ÄÄƒng nháº­p thÃ nh cÃ´ng');

