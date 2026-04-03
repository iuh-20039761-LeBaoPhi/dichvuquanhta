<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

$statusMap = [
    0 => ['text' => 'Mới nhận', 'class' => 'pending', 'icon' => 'fa-envelope-dot'],
    1 => ['text' => 'Đang xử lý', 'class' => 'shipping', 'icon' => 'fa-spinner'],
    2 => ['text' => 'Đã giải quyết', 'class' => 'completed', 'icon' => 'fa-check-double'],
];

$messages = admin_local_store_read('contacts.json', []);
if (!is_array($messages)) {
    $messages = [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = admin_api_read_input();
    $id = intval($payload['id'] ?? 0);
    $status = intval($payload['status'] ?? -1);
    $note = trim((string) ($payload['note_admin'] ?? ''));

    if ($id <= 0 || !array_key_exists($status, $statusMap)) {
        admin_api_json(['success' => false, 'message' => 'Dữ liệu cập nhật không hợp lệ.'], 400);
    }

    $updated = false;
    foreach ($messages as &$item) {
        if (intval($item['id'] ?? 0) !== $id) {
            continue;
        }
        $item['status'] = $status;
        $item['note_admin'] = $note;
        $item['updated_at'] = date('c');
        $updated = true;
        break;
    }
    unset($item);

    if (!$updated) {
        admin_api_json(['success' => false, 'message' => 'Không tìm thấy liên hệ để cập nhật.'], 404);
    }

    if (!admin_local_store_write('contacts.json', $messages)) {
        admin_api_json(['success' => false, 'message' => 'Không thể lưu dữ liệu liên hệ cục bộ.'], 500);
    }

    admin_api_json([
        'success' => true,
        'message' => 'Đã cập nhật trạng thái tin nhắn thành công.',
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    admin_api_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
}

$filterStatus = (string) ($_GET['status'] ?? 'all');
if ($filterStatus !== 'all') {
    $messages = array_values(array_filter($messages, function ($item) use ($filterStatus) {
        return (string) intval($item['status'] ?? 0) === (string) $filterStatus;
    }));
}

usort($messages, function ($a, $b) {
    return strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? ''));
});

$summary = ['all' => count($messages), '0' => 0, '1' => 0, '2' => 0];
foreach ($messages as $row) {
    $summary[(string) intval($row['status'] ?? 0)] += 1;
}

[$page, $limit, $offset] = admin_api_get_pagination(20, 100);
$pagedMessages = array_slice($messages, $offset, $limit);
$normalized = array_map(function ($row) use ($statusMap) {
    $statusValue = intval($row['status'] ?? 0);
    $statusMeta = $statusMap[$statusValue] ?? $statusMap[0];
    return [
        'id' => intval($row['id'] ?? 0),
        'name' => $row['name'] ?? '',
        'email' => $row['email'] ?? '',
        'subject' => $row['subject'] ?? '',
        'message' => $row['message'] ?? '',
        'note_admin' => $row['note_admin'] ?? '',
        'status' => $statusValue,
        'status_text' => $statusMeta['text'],
        'status_class' => $statusMeta['class'],
        'status_icon' => $statusMeta['icon'],
        'created_at' => admin_api_value_or_null($row['created_at'] ?? null),
    ];
}, $pagedMessages);

admin_api_json([
    'success' => true,
    'data' => [
        'filters' => ['status' => $filterStatus],
        'summary' => $summary,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => count($messages),
            'total_pages' => $limit > 0 ? intval(ceil(count($messages) / $limit)) : 0,
        ],
        'messages' => $normalized,
    ],
]);
