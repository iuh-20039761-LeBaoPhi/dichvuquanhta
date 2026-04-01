<?php
/**
 * Provider Login â€” Táº¡o PHP session cho nhÃ  cung cáº¥p
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ÄÆ°á»£c gá»i bá»Ÿi: pages/provider/dang-nhap.html (sau khi KRUD validate OK)
 *
 * Method:  POST
 * Body:    { "name": "...", "phone": "...", "company": "...", "id": "..." }
 * Response: { "success": true } hoáº·c { "success": false, "message": "..." }
 *
 * Luá»“ng:
 *   1. JS validate tÃ i khoáº£n qua KRUD API (client-side)
 *   2. KRUD OK + tráº¡ng thÃ¡i = active â†’ JS gá»i POST endpoint nÃ y
 *   3. PHP táº¡o session vá»›i role = "provider"
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

require_once __DIR__ . '/../../../config/session-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method Not Allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['phone'])) {
    jsonResponse(false, 'Thiáº¿u thÃ´ng tin Ä‘Äƒng nháº­p (phone)');
}

$name    = trim($input['name'] ?? 'NhÃ  cung cáº¥p');
$phone   = trim($input['phone'] ?? '');
$company = trim($input['company'] ?? '');
$id      = trim($input['id'] ?? '');

setAuthSession('provider', $name, $phone, [
    'company' => $company,
    'id'      => $id,
]);

jsonResponse(true, 'ÄÄƒng nháº­p thÃ nh cÃ´ng');

