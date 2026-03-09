<?php
/**
 * Base Model Class
 * Parent class cho tất cả models
 */

require_once __DIR__ . '/../config/database.php';

class BaseModel {
    protected $conn;
    protected $table;
    
    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }
    
    /**
     * Lấy tất cả records
     */
    public function getAll($conditions = [], $orderBy = 'id DESC', $limit = null) {
        try {
            $sql = "SELECT * FROM {$this->table}";
            
            // Add conditions
            if(!empty($conditions)) {
                $whereClauses = [];
                foreach($conditions as $key => $value) {
                    $whereClauses[] = "$key = :$key";
                }
                $sql .= " WHERE " . implode(' AND ', $whereClauses);
            }
            
            // Add order by
            if($orderBy) {
                $sql .= " ORDER BY $orderBy";
            }
            
            // Add limit
            if($limit) {
                $sql .= " LIMIT $limit";
            }
            
            $stmt = $this->conn->prepare($sql);
            
            // Bind parameters
            foreach($conditions as $key => $value) {
                $stmt->bindValue(":$key", $value);
            }
            
            $stmt->execute();
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in getAll: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Lấy record theo ID
     */
    public function getById($id) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE id = :id LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetch();
            
        } catch(PDOException $e) {
            error_log("Error in getById: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Tạo record mới
     */
    public function create($data) {
        try {
            $columns = array_keys($data);
            $placeholders = array_map(function($col) {
                return ":$col";
            }, $columns);
            
            $sql = "INSERT INTO {$this->table} (" . implode(', ', $columns) . ") 
                    VALUES (" . implode(', ', $placeholders) . ")";
            
            $stmt = $this->conn->prepare($sql);
            
            foreach($data as $key => $value) {
                $stmt->bindValue(":$key", $value);
            }
            
            $stmt->execute();
            return $this->conn->lastInsertId();
            
        } catch(PDOException $e) {
            error_log("Error in create: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Cập nhật record
     */
    public function update($id, $data) {
        try {
            $setClauses = [];
            foreach($data as $key => $value) {
                $setClauses[] = "$key = :$key";
            }
            
            $sql = "UPDATE {$this->table} SET " . implode(', ', $setClauses) . " WHERE id = :id";
            
            $stmt = $this->conn->prepare($sql);
            
            foreach($data as $key => $value) {
                $stmt->bindValue(":$key", $value);
            }
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            return $stmt->execute();
            
        } catch(PDOException $e) {
            error_log("Error in update: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Xóa record
     */
    public function delete($id) {
        try {
            $sql = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            return $stmt->execute();
            
        } catch(PDOException $e) {
            error_log("Error in delete: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Đếm số records
     */
    public function count($conditions = []) {
        try {
            $sql = "SELECT COUNT(*) as total FROM {$this->table}";
            
            if(!empty($conditions)) {
                $whereClauses = [];
                foreach($conditions as $key => $value) {
                    $whereClauses[] = "$key = :$key";
                }
                $sql .= " WHERE " . implode(' AND ', $whereClauses);
            }
            
            $stmt = $this->conn->prepare($sql);
            
            foreach($conditions as $key => $value) {
                $stmt->bindValue(":$key", $value);
            }
            
            $stmt->execute();
            $result = $stmt->fetch();
            
            return $result ? (int)$result['total'] : 0;
            
        } catch(PDOException $e) {
            error_log("Error in count: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Kiểm tra record tồn tại
     */
    public function exists($conditions) {
        return $this->count($conditions) > 0;
    }
}
?>