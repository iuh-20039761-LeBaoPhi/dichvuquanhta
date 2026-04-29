<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

http_response_code(410);
echo json_encode([
    'success' => false,
    'message' => 'API upload media admin da duoc vo hieu hoa. Hay dung cac luong upload Google Drive dang hoat dong.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
