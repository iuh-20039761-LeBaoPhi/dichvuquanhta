<?php
header('Content-Type: application/json');
require_once '../config/database.php';

class ServiceController {
    private $conn;
    
    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }
    
    public function getAll() {
        try {
            $sql = "SELECT * FROM services WHERE status = 1 ORDER BY id ASC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$controller = new ServiceController();
$action = $_GET['action'] ?? 'getAll';
if($action == 'getAll') $controller->getAll();
?>