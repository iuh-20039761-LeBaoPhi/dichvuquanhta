<?php
require_once __DIR__ . "/../../core/Database.php";

class User {
    private $db;
    private $table = "nguoidung";

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
            "INSERT INTO $this->table (user_name, user_tel, user_email, user_password) VALUES (?, ?, ?, ?)"
        );
        return $stmt->execute([$data['name'], $data['tel'], $data['email'], $data['password']]);
    }

    public function update($id, $data) {
        $stmt = $this->db->prepare(
            "UPDATE $this->table SET name=?, email=? WHERE id=?"
        );
        return $stmt->execute([$data['name'], $data['email'], $id]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM $this->table WHERE id=?");
        return $stmt->execute([$id]);
    }
    
    public function submitLogin($data) {
        $stmt = $this->db->prepare("SELECT * FROM $this->table WHERE sodienthoai=? AND matkhau=?");
        $stmt->execute([$data['sodienthoai'], sha1($data['matkhau'])]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user; // thất bại
    }
    public function createUserCustomer($data) {
        $stmt = $this->db->prepare("INSERT INTO $this->table (hoten, email, sodienthoai, matkhau) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$data['hoten'], $data['email'], $data['sodienthoai'], sha1($data['matkhau'])]);
    }
}
