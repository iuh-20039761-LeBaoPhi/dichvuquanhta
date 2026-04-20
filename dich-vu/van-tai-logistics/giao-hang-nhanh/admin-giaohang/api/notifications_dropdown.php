<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

$notifications = admin_local_store_read('admin-notifications.json', []);
if (!is_array($notifications)) {
    $notifications = [];
}

$items = array_slice($notifications, 0, 5);
admin_api_json([
    'success' => true,
    'data' => [
        'items' => $items,
        'total_unread' => 0,
    ],
]);
