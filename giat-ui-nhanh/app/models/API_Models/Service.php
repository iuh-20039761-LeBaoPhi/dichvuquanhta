<?php
require_once __DIR__ . "/../../core/Database.php";

class Service {
    private $db;
    private $table = "dichvu";

    public function __construct() {
        $this->db = (new Database())->connect();
    }

    public function all() {
        $stmt = $this->db->prepare("SELECT dv.*, gn.ten, gn.gia FROM $this->table AS dv LEFT JOIN giaonhan AS gn ON dv.id = gn.iddichvu");
        $stmt->execute();
        $rows= $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $services = [];

        foreach ($rows as $row) { 
            $id = $row['id'];
            if(!isset($services[$id])) {
                $services[$id] = [
                    'id' => (int)$row['id'],
                    'service_name' => $row['tendichvu'],
                    'summary' => $row['mota'],
                    'image' => $row['hinhanh'],
                    'price' => $row['gia'],
                    'price_unit' => $row['donvitinh'],
                    'work_items' => array_map('trim', explode(',', $row['congviec'])),
                    'support_chemicals' => array_map('trim', explode(',', $row['hoachat'])),
                    'transport_options' => []
                ];

            }
            if($row["ten"]) {
                $services[$id]['transport_options'][] = [
                    'name' => $row['ten'],
                    'price' => $row['gia']
                ];

            }
        }
        $provider = [
            'address' => "Tòa Nhà Sbi, Lô 6b, Đường Số 3, Công Viên Phần Mềm Quang Trung, Phường Tân Chánh Hiệp, Quận 12, Thành Phố Hồ Chí Minh, Việt Nam",
            'lat' => 10.871715,
            'lng' => 106.625886
        ];

        return [
            'provider' => $provider,
            'services' => array_values($services)
        ];
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
