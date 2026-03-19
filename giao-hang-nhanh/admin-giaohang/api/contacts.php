<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

$statusMap = [
    0 => ['text' => 'Mới nhận', 'class' => 'pending', 'icon' => 'fa-envelope-dot'],
    1 => ['text' => 'Đang xử lý', 'class' => 'shipping', 'icon' => 'fa-spinner'],
    2 => ['text' => 'Đã giải quyết', 'class' => 'completed', 'icon' => 'fa-check-double'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = admin_api_read_input();
    $id = intval($payload['id'] ?? 0);
    $status = intval($payload['status'] ?? -1);
    $note = trim((string) ($payload['note_admin'] ?? ''));

    if ($id <= 0 || !array_key_exists($status, $statusMap)) {
        admin_api_json(['success' => false, 'message' => 'Dữ liệu cập nhật không hợp lệ.'], 400);
    }

    $stmt = $conn->prepare("UPDATE contact_messages SET status = ?, note_admin = ? WHERE id = ?");
    $stmt->bind_param('isi', $status, $note, $id);
    $stmt->execute();
    $updated = $stmt->affected_rows;
    $stmt->close();

    if ($updated < 1) {
        $checkStmt = $conn->prepare("SELECT id FROM contact_messages WHERE id = ? LIMIT 1");
        $checkStmt->bind_param('i', $id);
        $checkStmt->execute();
        $exists = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();
        if (!$exists) {
            admin_api_json(['success' => false, 'message' => 'Không tìm thấy liên hệ để cập nhật.'], 404);
        }
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
[$page, $limit, $offset] = admin_api_get_pagination(20, 100);

$whereSql = '';
$params = [];
$types = '';
if ($filterStatus !== 'all') {
    $statusValue = intval($filterStatus);
    if (!array_key_exists($statusValue, $statusMap)) {
        admin_api_json(['success' => false, 'message' => 'Bộ lọc trạng thái không hợp lệ.'], 400);
    }
    $whereSql = ' WHERE status = ?';
    $params[] = $statusValue;
    $types .= 'i';
}

$countSql = "SELECT COUNT(*) AS total FROM contact_messages" . $whereSql;
$stmtCount = $conn->prepare($countSql);
if ($types !== '') {
    $stmtCount->bind_param($types, ...$params);
}
$stmtCount->execute();
$countRow = $stmtCount->get_result()->fetch_assoc();
$totalRecords = intval($countRow['total'] ?? 0);
$stmtCount->close();

$sql = "SELECT id, name, email, subject, message, note_admin, status, created_at
        FROM contact_messages" . $whereSql . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
$paramsWithPage = $params;
$paramsWithPage[] = $limit;
$paramsWithPage[] = $offset;
$typesWithPage = $types . 'ii';

$stmt = $conn->prepare($sql);
$stmt->bind_param($typesWithPage, ...$paramsWithPage);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $statusValue = intval($row['status'] ?? 0);
    $statusMeta = $statusMap[$statusValue] ?? $statusMap[0];
    $messages[] = [
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
}
$stmt->close();

$summary = ['all' => 0, '0' => 0, '1' => 0, '2' => 0];
$allCountResult = $conn->query("SELECT COUNT(*) AS total FROM contact_messages");
if ($allCountResult && $allCountRow = $allCountResult->fetch_assoc()) {
    $summary['all'] = intval($allCountRow['total'] ?? 0);
}
$summaryResult = $conn->query("SELECT status, COUNT(*) AS total FROM contact_messages GROUP BY status");
if ($summaryResult) {
    while ($row = $summaryResult->fetch_assoc()) {
        $summary[(string) intval($row['status'] ?? 0)] = intval($row['total'] ?? 0);
    }
}

admin_api_json([
    'success' => true,
    'data' => [
        'filters' => [
            'status' => $filterStatus,
        ],
        'summary' => $summary,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => $limit > 0 ? intval(ceil($totalRecords / $limit)) : 0,
        ],
        'messages' => $messages,
    ],
]);
