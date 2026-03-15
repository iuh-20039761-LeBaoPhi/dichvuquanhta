<?php
/**
 * Admin Model
 * Xử lý logic liên quan đến quản trị viên
 */

require_once __DIR__ . '/base-model.php';

class Admin extends BaseModel {
    protected $table = 'admins';
    
    // Properties
    public $id;
    public $username;
    public $password;
    public $full_name;
    public $email;
    public $created_at;
    
    /**
     * Xác thực đăng nhập
     */
    public function authenticate($username, $password) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE username = :username LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':username', $username);
            $stmt->execute();
            
            $admin = $stmt->fetch();
            
            if($admin && password_verify($password, $admin['password'])) {
                // Remove password from return data
                unset($admin['password']);
                return $admin;
            }
            
            return null;
            
        } catch(PDOException $e) {
            error_log("Error in authenticate: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Tạo admin mới
     */
    public function createAdmin($data) {
        // Validate
        $errors = $this->validate($data);
        if(!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Check if username exists
        if($this->usernameExists($data['username'])) {
            return ['success' => false, 'errors' => ['Username đã tồn tại']];
        }
        
        // Check if email exists
        if(!empty($data['email']) && $this->emailExists($data['email'])) {
            return ['success' => false, 'errors' => ['Email đã tồn tại']];
        }
        
        // Hash password
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Create admin
        $adminId = $this->create($data);
        
        if($adminId) {
            return ['success' => true, 'admin_id' => $adminId];
        }
        
        return ['success' => false, 'errors' => ['Không thể tạo admin']];
    }
    
    /**
     * Đổi mật khẩu
     */
    public function changePassword($adminId, $currentPassword, $newPassword) {
        // Get admin
        $admin = $this->getById($adminId);
        
        if(!$admin) {
            return ['success' => false, 'message' => 'Admin không tồn tại'];
        }
        
        // Verify current password
        if(!password_verify($currentPassword, $admin['password'])) {
            return ['success' => false, 'message' => 'Mật khẩu hiện tại không đúng'];
        }
        
        // Validate new password
        if(strlen($newPassword) < 6) {
            return ['success' => false, 'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự'];
        }
        
        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password
        $result = $this->update($adminId, ['password' => $hashedPassword]);
        
        if($result) {
            return ['success' => true, 'message' => 'Đổi mật khẩu thành công'];
        }
        
        return ['success' => false, 'message' => 'Không thể đổi mật khẩu'];
    }
    
    /**
     * Cập nhật thông tin admin
     */
    public function updateProfile($adminId, $data) {
        // Remove password and username from update data
        unset($data['password']);
        unset($data['username']);
        
        // Check email exists (exclude current admin)
        if(!empty($data['email'])) {
            $existingAdmin = $this->getByEmail($data['email']);
            if($existingAdmin && $existingAdmin['id'] != $adminId) {
                return ['success' => false, 'message' => 'Email đã được sử dụng'];
            }
        }
        
        $result = $this->update($adminId, $data);
        
        if($result) {
            return ['success' => true, 'message' => 'Cập nhật thành công'];
        }
        
        return ['success' => false, 'message' => 'Không thể cập nhật'];
    }
    
    /**
     * Kiểm tra username tồn tại
     */
    public function usernameExists($username, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE username = :username";
            
            if($excludeId) {
                $sql .= " AND id != :exclude_id";
            }
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':username', $username);
            
            if($excludeId) {
                $stmt->bindValue(':exclude_id', $excludeId, PDO::PARAM_INT);
            }
            
            $stmt->execute();
            $result = $stmt->fetch();
            
            return $result['count'] > 0;
            
        } catch(PDOException $e) {
            error_log("Error in usernameExists: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Kiểm tra email tồn tại
     */
    public function emailExists($email, $excludeId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE email = :email";
            
            if($excludeId) {
                $sql .= " AND id != :exclude_id";
            }
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':email', $email);
            
            if($excludeId) {
                $stmt->bindValue(':exclude_id', $excludeId, PDO::PARAM_INT);
            }
            
            $stmt->execute();
            $result = $stmt->fetch();
            
            return $result['count'] > 0;
            
        } catch(PDOException $e) {
            error_log("Error in emailExists: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Lấy admin theo email
     */
    public function getByEmail($email) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE email = :email LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':email', $email);
            $stmt->execute();
            
            return $stmt->fetch();
            
        } catch(PDOException $e) {
            error_log("Error in getByEmail: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Lấy admin theo username
     */
    public function getByUsername($username) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE username = :username LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':username', $username);
            $stmt->execute();
            
            return $stmt->fetch();
            
        } catch(PDOException $e) {
            error_log("Error in getByUsername: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Validate dữ liệu admin
     */
    public function validate($data) {
        $errors = [];
        
        if(empty($data['username']) || strlen($data['username']) < 3) {
            $errors[] = 'Username phải có ít nhất 3 ký tự';
        }
        
        if(empty($data['password']) || strlen($data['password']) < 6) {
            $errors[] = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        
        if(empty($data['full_name'])) {
            $errors[] = 'Họ tên không được để trống';
        }
        
        if(!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email không hợp lệ';
        }
        
        return $errors;
    }
    
    /**
     * Lấy danh sách admin (không bao gồm password)
     */
    public function getAllAdmins() {
        try {
            $sql = "SELECT id, username, full_name, email, created_at FROM {$this->table} ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in getAllAdmins: " . $e->getMessage());
            return [];
        }
    }
}
?>