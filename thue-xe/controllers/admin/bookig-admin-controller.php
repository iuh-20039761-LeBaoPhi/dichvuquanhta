<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

$action = $_GET['action'] ?? '';
$db = new Database();
$conn = $db->getConnection();

switch ($action) {
    case 'list':
        $status = $_GET['status'] ?? '';
        $sql = "SELECT * FROM bookings";
        $params = [];
        if ($status) {
            $sql .= " WHERE status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY created_at DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'recent':
        $stmt = $conn->query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'stats':
        $stmt = $conn->query("SELECT
            COUNT(*) as total,
            SUM(status = 'pending') as pending,
            SUM(status = 'confirmed') as confirmed,
            SUM(status = 'cancelled') as cancelled,
            SUM(status = 'completed') as completed,
            SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as revenue
            FROM bookings");
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'updateStatus':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? 0);
        $status = $data['status'] ?? '';
        $validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

        if (!in_array($status, $validStatuses)) {
            echo json_encode(['success' => false, 'message' => 'Trạng thái không hợp lệ']);
            break;
        }
        try {
            $stmt = $conn->prepare("UPDATE bookings SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
