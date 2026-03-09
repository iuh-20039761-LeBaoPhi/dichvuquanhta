<?php
require_once __DIR__ . "/../../core/Database.php";

class Statistic {
    private $db;

    public function __construct() {
        $this->db = (new Database())->connect();
    }

    public function find($data) {
        $sql = "SELECT s.service_name, COUNT(o.id) AS total_orders, SUM(o.total_price) AS revenue FROM 
        orders o JOIN services s ON o.service_id = s.id WHERE 
        o.order_status = 'Completed' AND MONTH(o.created_at) = ? AND YEAR(o.created_at) = ? GROUP BY
         s.id, s.service_name ORDER BY revenue DESC;";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$data['month'], $data['year']]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


}
