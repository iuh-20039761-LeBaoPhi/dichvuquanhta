<?php
require_once __DIR__ . "/../../core/Database.php";

class Order {
    private $db;
    private $table = "orders";

    public function __construct() {
        $this->db = (new Database())->connect();
    }

    public function all() {
        return $this->db->query("SELECT o.*, s.service_name FROM $this->table AS o JOIN services AS s ON o.service_id = s.id  ORDER BY o.id DESC")->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find($id) {
        $stmt = $this->db->prepare("SELECT * FROM $this->table WHERE id=?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO $this->table (customer_name, customer_tel, customer_address, service_id, total_price, note) VALUES (?, ?, ?, ?, ?, ?)"
        );
        return $stmt->execute([$data['customer_name'], $data['customer_tel'], $data['customer_address'], $data['service_id'], $data['total_price'], $data['note']]);
    }

    public function update($id, $data) {
        $stmt = $this->db->prepare(
            "UPDATE $this->table SET order_status=?, transaction_status=? WHERE id=?"
        );
        return $stmt->execute([$data['order_status'], $data['transaction_status'], $id]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM $this->table WHERE id=?");
        return $stmt->execute([$id]);
    }

    public function searchOrder($data) {
        $stmt = $this->db->prepare("SELECT o.*, s.service_name FROM $this->table AS o 
        JOIN services AS s ON o.service_id = s.id WHERE o.customer_tel = ?");
       $stmt->execute([$data['customer_tel']]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
