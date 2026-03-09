<?php
require_once __DIR__ . "/../../core/Database.php";

class Service {
    private $db;
    private $table = "services";

    public function __construct() {
        $this->db = (new Database())->connect();
    }

    public function all() {
        return $this->db->query("SELECT * FROM $this->table")->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find($id) {
        $stmt = $this->db->prepare("SELECT * FROM $this->table WHERE id=?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO $this->table (service_name, summary, service_price) VALUES (?, ?, ?)"
        );
        return $stmt->execute([$data['service_name'], $data['summary'], $data['service_price']]);
    }

    public function update($id, $data) {
        $stmt = $this->db->prepare(
            "UPDATE $this->table SET service_name=?, summary=?, service_price=? WHERE id=?"
        );
        return $stmt->execute([$data['service_name'], $data['summary'], $data['service_price'], $id]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM $this->table WHERE id=?");
        return $stmt->execute([$id]);
    }
}
