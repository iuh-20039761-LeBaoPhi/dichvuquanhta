<?php

// Nạp session và kết nối database dùng chung cho toàn bộ auth API.
require_once __DIR__ . '/../../config/session.php';
require_once __DIR__ . '/../../config/database.php';

// Trả JSON chuẩn cho mọi endpoint auth.
if (!function_exists('chuyen_don_send_json')) {
    function chuyen_don_send_json(array $payload, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

// Trả lỗi JSON ngắn gọn, thống nhất format response.
if (!function_exists('chuyen_don_fail')) {
    function chuyen_don_fail(string $message, int $statusCode = 400, array $extra = []): void
    {
        chuyen_don_send_json(array_merge([
            'status' => 'error',
            'message' => $message,
        ], $extra), $statusCode);
    }
}

// Chặn request sai HTTP method, ví dụ gọi GET vào endpoint chỉ nhận POST.
if (!function_exists('chuyen_don_require_method')) {
    function chuyen_don_require_method(string $method): void
    {
        if (strcasecmp($_SERVER['REQUEST_METHOD'] ?? '', $method) !== 0) {
            chuyen_don_fail('Phương thức không được hỗ trợ.', 405);
        }
    }
}

// Đọc body JSON từ request và ép về mảng PHP.
if (!function_exists('chuyen_don_get_json_input')) {
    function chuyen_don_get_json_input(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            chuyen_don_fail('Dữ liệu gửi lên không hợp lệ.', 400);
        }

        return $data;
    }
}

// Chuẩn hóa chuỗi nhập vào: bỏ khoảng trắng dư ở đầu/cuối và giữa câu.
if (!function_exists('chuyen_don_normalize_text')) {
    function chuyen_don_normalize_text($value): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', (string) ($value ?? '')));
    }
}

// Chuẩn hóa email về chữ thường để so trùng ổn định hơn.
if (!function_exists('chuyen_don_normalize_email')) {
    function chuyen_don_normalize_email($value): string
    {
        return strtolower(chuyen_don_normalize_text($value));
    }
}

// Chuẩn hóa số điện thoại về dạng số, hỗ trợ đổi 84... thành 0...
if (!function_exists('chuyen_don_normalize_phone')) {
    function chuyen_don_normalize_phone($value): string
    {
        $phone = preg_replace('/\D+/', '', (string) ($value ?? ''));
        if ($phone === null) {
            return '';
        }

        if (strpos($phone, '84') === 0 && strlen($phone) === 11) {
            return '0' . substr($phone, 2);
        }

        return $phone;
    }
}

// Đếm độ dài chuỗi có hỗ trợ UTF-8 nếu server bật mbstring.
if (!function_exists('chuyen_don_text_length')) {
    function chuyen_don_text_length(string $value): int
    {
        return function_exists('mb_strlen') ? (int) mb_strlen($value) : strlen($value);
    }
}

// Rule mật khẩu dùng chung cho đăng ký tài khoản.
if (!function_exists('chuyen_don_validate_password')) {
    function chuyen_don_validate_password(string $password): bool
    {
        return (bool) preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,32}$/', $password);
    }
}

// Chỉ chấp nhận 2 vai trò auth hiện có trong module chuyển dọn.
if (!function_exists('chuyen_don_resolve_role')) {
    function chuyen_don_resolve_role($value): string
    {
        $role = chuyen_don_normalize_text($value);
        return in_array($role, ['khach-hang', 'doi-tac'], true) ? $role : '';
    }
}

// Nhãn tiếng Việt để hiển thị ra frontend/log khi cần.
if (!function_exists('chuyen_don_get_role_label')) {
    function chuyen_don_get_role_label(string $role): string
    {
        return $role === 'doi-tac' ? 'đối tác cung ứng' : 'khách hàng';
    }
}

// Trang mặc định sẽ chuyển tới sau khi auth thành công.
if (!function_exists('chuyen_don_get_default_redirect')) {
    function chuyen_don_get_default_redirect(string $role): string
    {
        return $role === 'doi-tac' ? 'index.html' : 'khach-hang/dashboard.html';
    }
}

// Tự tạo bảng auth nếu database đã tồn tại nhưng chưa import schema.
if (!function_exists('chuyen_don_ensure_auth_schema')) {
    function chuyen_don_ensure_auth_schema(mysqli $conn): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $sql = <<<SQL
CREATE TABLE IF NOT EXISTS auth_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role ENUM('khach-hang', 'doi-tac') NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(120) DEFAULT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_auth_users_role_email (role, email),
    UNIQUE KEY uq_auth_users_role_phone (role, phone),
    KEY idx_auth_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

        if (!$conn->query($sql)) {
            throw new RuntimeException('Không thể khởi tạo bảng auth_users: ' . $conn->error);
        }

        $ready = true;
    }
}

// Chỉ giữ lại dữ liệu user tối thiểu cần lưu trong session.
if (!function_exists('chuyen_don_build_session_user')) {
    function chuyen_don_build_session_user(array $user): array
    {
        return [
            'id' => (int) ($user['id'] ?? 0),
            'role' => (string) ($user['role'] ?? ''),
            'full_name' => (string) ($user['full_name'] ?? ''),
            'contact_person' => (string) ($user['contact_person'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'phone' => (string) ($user['phone'] ?? ''),
            'status' => (string) ($user['status'] ?? 'active'),
        ];
    }
}

// Ghi session đăng nhập và regenerate session id để an toàn hơn.
if (!function_exists('chuyen_don_login_user')) {
    function chuyen_don_login_user(array $user): array
    {
        session_regenerate_id(true);
        $_SESSION['chuyen_don_auth'] = chuyen_don_build_session_user($user);
        return $_SESSION['chuyen_don_auth'];
    }
}

// Lấy user hiện tại từ session nếu đã đăng nhập.
if (!function_exists('chuyen_don_current_user')) {
    function chuyen_don_current_user(): ?array
    {
        $user = $_SESSION['chuyen_don_auth'] ?? null;
        return is_array($user) ? $user : null;
    }
}

// Xóa thông tin auth khỏi session khi logout.
if (!function_exists('chuyen_don_clear_auth_session')) {
    function chuyen_don_clear_auth_session(): void
    {
        unset($_SESSION['chuyen_don_auth']);
    }
}
