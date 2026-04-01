<?php
/**
 * Customer Login â€” Táº¡o PHP session cho khÃ¡ch hÃ ng
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ÄÆ°á»£c gá»i bá»Ÿi: pages/customer/dang-nhap.html (sau khi KRUD validate OK)
 *
 * Method:  POST
 * Body:    { "name": "...", "phone": "...", "address": "..." }
 * Response: { "success": true } hoáº·c { "success": false, "message": "..." }
 *
 * Luá»“ng:
 *   1. JS validate tÃ i khoáº£n qua KRUD API (client-side)
 *   2. KRUD OK â†’ JS gá»i POST endpoint nÃ y
 *   3. PHP táº¡o session vá»›i role = "customer"
 *   4. Tá»« Ä‘Ã¢y check-session.php sáº½ tráº£ logged_in = true
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

require_once __DIR__ . '/../../../config/session-config.php';

// â”€â”€ Chá»‰ cháº¥p nháº­n POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method Not Allowed');
}

// â”€â”€ Äá»c body JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['phone'])) {
    jsonResponse(false, 'Thiáº¿u thÃ´ng tin Ä‘Äƒng nháº­p (phone)');
}

$name    = trim($input['name'] ?? 'KhÃ¡ch hÃ ng');
$phone   = trim($input['phone'] ?? '');
$address = trim($input['address'] ?? '');

// â”€â”€ Táº¡o session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setAuthSession('customer', $name, $phone, [
    'address' => $address,
]);

jsonResponse(true, 'ÄÄƒng nháº­p thÃ nh cÃ´ng');

