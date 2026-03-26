<?php
/**
 * Provider Bookings Controller
 * Đồng bộ schema hiện tại: datxe + nguoidung + xechiec + xemau.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'provider') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

$action      = $_GET['action'] ?? '';
$provider_id = (int)$_SESSION['user_id'];

function ensureProviderCarMapTable(PDO $conn): void {
        $conn->exec(
                "CREATE TABLE IF NOT EXISTS nhacungcap_xechiec (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        idnhacungcap INT NOT NULL,
                        idxechiec INT NOT NULL,
                        ngaytao DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_provider_car (idnhacungcap, idxechiec),
                        INDEX idx_provider (idnhacungcap),
                        INDEX idx_car (idxechiec),
                        CONSTRAINT fk_ncc_xc_provider
                            FOREIGN KEY (idnhacungcap) REFERENCES nguoidung(id)
                            ON DELETE CASCADE,
                        CONSTRAINT fk_ncc_xc_car
                            FOREIGN KEY (idxechiec) REFERENCES xechiec(id)
                            ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
}

try {
    $db   = new Database();
    $conn = $db->getConnection();
    ensureProviderCarMapTable($conn);

    if ($action === 'getMyBookings') {
        $stmt = $conn->prepare(
            "SELECT
                b.id,
                b.idxechiec                  AS car_id,
                xm.ten                       AS car_name,
                u.hoten                      AS customer_name,
                u.sodienthoai                AS customer_phone,
                b.ngaynhan                   AS pickup_date,
                b.ngaytra                    AS return_date,
                b.songay                     AS total_days,
                (b.songay * xm.giathue_ngay) AS total_price,
                b.trangthai                  AS status,
                b.ngaytao                    AS created_at
             FROM datxe b
             INNER JOIN nguoidung u ON u.id = b.idkhachhang
             INNER JOIN xechiec xc ON xc.id = b.idxechiec
             INNER JOIN xemau xm ON xm.id = xc.idxemau
               INNER JOIN nhacungcap_xechiec m ON m.idxechiec = xc.id
               WHERE m.idnhacungcap = ?
             ORDER BY b.ngaytao DESC"
        );
           $stmt->execute([$provider_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'updateStatus') {
        $body       = json_decode(file_get_contents('php://input'), true);
        $booking_id = (int)($body['booking_id'] ?? 0);
        $new_status = $body['status']            ?? '';

        $allowed = ['confirmed', 'completed'];
        if (!$booking_id || !in_array($new_status, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Trạng thái không hợp lệ']);
            exit;
        }

        $stmt = $conn->prepare(
            "SELECT b.id, b.trangthai AS status
             FROM datxe b
             INNER JOIN nhacungcap_xechiec m ON m.idxechiec = b.idxechiec
             WHERE b.id = ? AND m.idnhacungcap = ?"
        );
        $stmt->execute([$booking_id, $provider_id]);
        $booking = $stmt->fetch();

        if (!$booking) {
            echo json_encode(['success' => false, 'message' => 'Không tìm thấy đơn hàng']);
            exit;
        }

        $transitions = ['pending' => 'confirmed', 'confirmed' => 'completed'];
        if (($transitions[$booking['status']] ?? '') !== $new_status) {
            echo json_encode(['success' => false, 'message' => 'Không thể chuyển trạng thái này']);
            exit;
        }

        // UPDATE datxe: cột trangthai
        $stmt = $conn->prepare("UPDATE datxe SET trangthai = ? WHERE id = ?");
        $stmt->execute([$new_status, $booking_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống']);
}
