<?php
/**
 * Base Model Class
 * Parent class cho tất cả models
 *
 * v3: Hỗ trợ đặt tên bảng/cột tiếng Việt không dấu.
 *   - $table     : tên bảng mới (tiếng Việt không dấu)
 *   - $selectSql : câu SELECT với AS alias để output JSON giữ nguyên field name cũ
 *   - $columnMap : ánh xạ English key → Vietnamese DB column (dùng cho WHERE / SET)
 *   - dbCol($key): tra bảng columnMap, trả về tên cột DB thực tế
 */

require_once __DIR__ . '/../config/database.php';

class BaseModel {
    protected $conn;
    protected $table;

    /**
     * Câu SELECT với AS alias để output JSON giữ nguyên field name cũ.
     * Mỗi subclass override với danh sách cột cụ thể có alias.
     * Mặc định '*' — chỉ an toàn khi column name chưa đổi.
     */
    protected $selectSql = '*';

    /**
     * Ánh xạ English input key → Vietnamese DB column name.
     * Dùng trong getAll() conditions, count() conditions, create(), update().
     * Ví dụ: ['status' => 'trangthai', 'name' => 'ten']
     */
    protected $columnMap = [];

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    /**
     * Tra bảng columnMap: trả về tên cột DB thực tế cho key đầu vào.
     */
    protected function dbCol($key) {
        return $this->columnMap[$key] ?? $key;
    }

    /**
     * Dịch toàn bộ mảng key → value sang tên cột DB.
     */
    protected function translateKeys(array $data): array {
        $out = [];
        foreach ($data as $key => $val) {
            $out[$this->dbCol($key)] = $val;
        }
        return $out;
    }

    /**
     * Lấy tất cả records.
     * $conditions keys dùng English (tự động dịch qua columnMap).
     * $orderBy    dùng tên cột DB (Vietnamese) trực tiếp.
     */
    public function getAll($conditions = [], $orderBy = 'id DESC', $limit = null) {
        try {
            $sql = "SELECT {$this->selectSql} FROM {$this->table}";

            if (!empty($conditions)) {
                $whereClauses = [];
                foreach ($conditions as $key => $value) {
                    $dbKey = $this->dbCol($key);
                    // Dùng prefix cond_ để tránh đụng placeholder
                    $whereClauses[] = "$dbKey = :cond_$key";
                }
                $sql .= " WHERE " . implode(' AND ', $whereClauses);
            }

            if ($orderBy) {
                $sql .= " ORDER BY $orderBy";
            }

            if ($limit) {
                $sql .= " LIMIT $limit";
            }

            $stmt = $this->conn->prepare($sql);

            foreach ($conditions as $key => $value) {
                $stmt->bindValue(":cond_$key", $value);
            }

            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in getAll [{$this->table}]: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Lấy record theo ID.
     */
    public function getById($id) {
        try {
            $sql = "SELECT {$this->selectSql} FROM {$this->table} WHERE id = :id LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetch();

        } catch (PDOException $e) {
            error_log("Error in getById [{$this->table}]: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Tạo record mới.
     * $data keys có thể là English (tự động dịch qua columnMap).
     */
    public function create($data) {
        try {
            $dbData   = $this->translateKeys($data);
            $columns  = array_keys($dbData);
            $placeholders = array_map(fn($c) => ":$c", $columns);

            $sql = "INSERT INTO {$this->table} (" . implode(', ', $columns) . ")
                    VALUES (" . implode(', ', $placeholders) . ")";

            $stmt = $this->conn->prepare($sql);

            foreach ($dbData as $col => $val) {
                $stmt->bindValue(":$col", $val);
            }

            $stmt->execute();
            return $this->conn->lastInsertId();

        } catch (PDOException $e) {
            error_log("Error in create [{$this->table}]: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cập nhật record.
     * $data keys có thể là English (tự động dịch qua columnMap).
     */
    public function update($id, $data) {
        try {
            $dbData     = $this->translateKeys($data);
            $setClauses = [];
            foreach ($dbData as $col => $val) {
                $setClauses[] = "$col = :set_$col";
            }

            $sql = "UPDATE {$this->table} SET " . implode(', ', $setClauses) . " WHERE id = :id";

            $stmt = $this->conn->prepare($sql);

            foreach ($dbData as $col => $val) {
                $stmt->bindValue(":set_$col", $val);
            }
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);

            return $stmt->execute();

        } catch (PDOException $e) {
            error_log("Error in update [{$this->table}]: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Xóa record.
     */
    public function delete($id) {
        try {
            $sql  = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);

            return $stmt->execute();

        } catch (PDOException $e) {
            error_log("Error in delete [{$this->table}]: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Đếm số records.
     * $conditions keys dùng English (tự động dịch qua columnMap).
     */
    public function count($conditions = []) {
        try {
            $sql = "SELECT COUNT(*) as total FROM {$this->table}";

            if (!empty($conditions)) {
                $whereClauses = [];
                foreach ($conditions as $key => $value) {
                    $dbKey = $this->dbCol($key);
                    $whereClauses[] = "$dbKey = :cond_$key";
                }
                $sql .= " WHERE " . implode(' AND ', $whereClauses);
            }

            $stmt = $this->conn->prepare($sql);

            foreach ($conditions as $key => $value) {
                $stmt->bindValue(":cond_$key", $value);
            }

            $stmt->execute();
            $result = $stmt->fetch();

            return $result ? (int)$result['total'] : 0;

        } catch (PDOException $e) {
            error_log("Error in count [{$this->table}]: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Kiểm tra record tồn tại.
     */
    public function exists($conditions) {
        return $this->count($conditions) > 0;
    }
}
?>
