<?php
/**
 * Admin Model — v3
 * Sửa lỗi: bảng thực tế là `nguoidung` (old: `users`), không phải `admins`.
 * Filter thêm vaitro = 'admin' trong mọi query.
 */

require_once __DIR__ . '/base-model.php';

class Admin extends BaseModel {
    protected $table = 'nguoidung';

    /**
     * SELECT với AS alias: output JSON giữ nguyên field name cũ.
     */
    protected $selectSql = "
        id,
        hoten         AS full_name,
        email,
        sodienthoai   AS phone,
        matkhau       AS password,
        vaitro        AS role,
        trangthai     AS status,
        ngaytao       AS created_at";

    /**
     * Ánh xạ English key → Vietnamese DB column.
     */
    protected $columnMap = [
        'full_name'        => 'hoten',
        'phone'            => 'sodienthoai',
        'password'         => 'matkhau',
        'role'             => 'vaitro',
        'status'           => 'trangthai',
        'company_name'     => 'tencongty',
        'license_number'   => 'sogiayphep',
        'address'          => 'diachi',
        'description'      => 'mota',
        'rejection_reason' => 'lydotuchoi',
        'avatar'           => 'avatar',
        'cccd_front'       => 'cccdmatruoc',
        'cccd_back'        => 'cccdmatsau',
        'created_at'       => 'ngaytao',
    ];

    // Properties
    public $id;
    public $full_name;
    public $email;
    public $password;
    public $created_at;

    /**
     * Xác thực đăng nhập admin (dùng email).
     */
    public function authenticate($email, $password) {
        try {
            $sql  = "SELECT {$this->selectSql}
                     FROM {$this->table}
                     WHERE email = :email AND vaitro = 'admin' LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':email', $email);
            $stmt->execute();

            $admin = $stmt->fetch();
            if ($admin && password_verify($password, $admin['password'])) {
                unset($admin['password']);
                return $admin;
            }
            return null;

        } catch (PDOException $e) {
            error_log("Error in Admin::authenticate: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Đổi mật khẩu admin.
     */
    public function changePassword($adminId, $currentPassword, $newPassword) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT matkhau FROM {$this->table} WHERE id = ? AND vaitro = 'admin' LIMIT 1"
            );
            $stmt->execute([$adminId]);
            $admin = $stmt->fetch();

            if (!$admin) {
                return ['success' => false, 'message' => 'Admin không tồn tại'];
            }
            if (!password_verify($currentPassword, $admin['matkhau'])) {
                return ['success' => false, 'message' => 'Mật khẩu hiện tại không đúng'];
            }
            if (strlen($newPassword) < 6) {
                return ['success' => false, 'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự'];
            }

            $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
            // columnMap dịch 'password' → 'matkhau'
            $this->update($adminId, ['password' => $hashed]);

            return ['success' => true, 'message' => 'Đổi mật khẩu thành công'];

        } catch (PDOException $e) {
            error_log("Error in Admin::changePassword: " . $e->getMessage());
            return ['success' => false, 'message' => 'Lỗi hệ thống'];
        }
    }

    /**
     * Cập nhật thông tin admin.
     */
    public function updateProfile($adminId, $data) {
        unset($data['password']);

        if (!empty($data['email'])) {
            $existing = $this->getByEmail($data['email']);
            if ($existing && $existing['id'] != $adminId) {
                return ['success' => false, 'message' => 'Email đã được sử dụng'];
            }
        }

        $result = $this->update($adminId, $data);
        return $result
            ? ['success' => true,  'message' => 'Cập nhật thành công']
            : ['success' => false, 'message' => 'Không thể cập nhật'];
    }

    /**
     * Kiểm tra email tồn tại (toàn bảng nguoidung).
     */
    public function emailExists($email, $excludeId = null) {
        try {
            $sql  = "SELECT COUNT(*) as cnt FROM {$this->table} WHERE email = :email";
            if ($excludeId) $sql .= " AND id != :eid";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':email', $email);
            if ($excludeId) $stmt->bindValue(':eid', $excludeId, PDO::PARAM_INT);
            $stmt->execute();

            return (int)$stmt->fetch()['cnt'] > 0;

        } catch (PDOException $e) {
            error_log("Error in Admin::emailExists: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Lấy admin theo email.
     */
    public function getByEmail($email) {
        try {
            $sql  = "SELECT {$this->selectSql}
                     FROM {$this->table}
                     WHERE email = :email AND vaitro = 'admin' LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':email', $email);
            $stmt->execute();
            return $stmt->fetch();

        } catch (PDOException $e) {
            error_log("Error in Admin::getByEmail: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Validate dữ liệu admin.
     */
    public function validate($data) {
        $errors = [];
        if (empty($data['full_name'])) {
            $errors[] = 'Họ tên không được để trống';
        }
        if (empty($data['password']) || strlen($data['password']) < 6) {
            $errors[] = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email không hợp lệ';
        }
        return $errors;
    }

    /**
     * Lấy danh sách tất cả admin.
     */
    public function getAllAdmins() {
        try {
            $sql  = "SELECT id, hoten AS full_name, email, ngaytao AS created_at
                     FROM {$this->table} WHERE vaitro = 'admin'
                     ORDER BY ngaytao DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Admin::getAllAdmins: " . $e->getMessage());
            return [];
        }
    }
}
?>
