<?php
/**
 * Customer Logout â€” Huá»· PHP session khÃ¡ch hÃ ng
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ÄÆ°á»£c gá»i bá»Ÿi: auth-nav.js â†’ bindLogout()
 *
 * Method:  GET hoáº·c POST
 * Response: { "success": true, "message": "ÄÃ£ Ä‘Äƒng xuáº¥t" }
 *
 * Luá»“ng:
 *   1. User click "ÄÄƒng xuáº¥t" trÃªn navbar
 *   2. auth-nav.js xoÃ¡ localStorage + gá»i fetch(logout.php)
 *   3. PHP huá»· session â†’ redirect vá» trang Ä‘Äƒng nháº­p
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

require_once __DIR__ . '/../../../config/session-config.php';

clearAuthSession();

jsonResponse(true, 'ÄÃ£ Ä‘Äƒng xuáº¥t');

