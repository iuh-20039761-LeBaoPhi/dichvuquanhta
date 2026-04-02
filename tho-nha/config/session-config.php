<?php
/**
 * session-config.php
 * ──────────────────────────────────────────────────────────
 * Cấu hình PHP session dùng chung cho toàn bộ project Thợ Nhà.
 *
 * Chức năng:
 *   - Khởi tạo session với cookie an toàn (httpOnly, sameSite)
 *   - Cung cấp helper: setAuthSession(), getAuthSession(), clearAuthSession()
 *   - Trả JSON response chuẩn cho API endpoints
 *
 * Cách dùng:
 *   require_once __DIR__ . '/../../config/session-config.php';
 * ──────────────────────────────────────────────────────────
 */

// ── Bắt đầu session với cấu hình bảo mật ──────────────────
if (session_status() === PHP_SESSION_NONE) {
    // Đặt tên session riêng để không xung đột với project khác trên cùng server
    session_name('THONHA_SESSID');

    session_set_cookie_params([
        'lifetime' => 86400 * 7,   // 7 ngày
        'path'     => '/',
        'domain'   => '',          // auto-detect domain
        'secure'   => false,       // true nếu dùng HTTPS (production)
        'httponly' => true,        // Không cho JS truy cập cookie session
        'samesite' => 'Lax',      // Chống CSRF cơ bản
    ]);

    session_start();
}

// ── CORS headers cho API endpoints ─────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

/**
 * Lưu thông tin đăng nhập vào PHP session.
 *
 * @param string|int $id    ID thực tế trong cơ sở dữ liệu
 * @param string     $role  Vai trò: 'customer' | 'provider' | 'admin'
 * @param string     $name  Tên hiển thị
 * @param string     $phone SĐT hoặc email (dùng để định danh)
 * @param array      $extra Dữ liệu bổ sung tuỳ role (vd: company, address)
 */
function setAuthSession($id, string $role, string $name, string $phone, array $extra = []): void
{
    $_SESSION['auth'] = [
        'logged_in' => true,
        'id'        => $id,
        'role'      => $role,
        'name'      => $name,
        'phone'     => $phone,
        'extra'     => $extra,
        'login_at'  => date('Y-m-d H:i:s'),
    ];
}

/**
 * Đọc thông tin session hiện tại.
 *
 * @return array|null  Trả về mảng auth nếu đã đăng nhập, null nếu chưa.
 */
function getAuthSession(): ?array
{
    if (!empty($_SESSION['auth']) && $_SESSION['auth']['logged_in'] === true) {
        return $_SESSION['auth'];
    }
    return null;
}

/**
 * Xoá session đăng nhập (đăng xuất).
 * Huỷ toàn bộ dữ liệu session và cookie session.
 */
function clearAuthSession(): void
{
    $_SESSION = [];

    // Xoá cookie session trên trình duyệt
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();
}

/**
 * Trả JSON response chuẩn và dừng script.
 *
 * @param bool   $success  Thành công hay thất bại
 * @param string $message  Nội dung thông báo
 * @param array  $data     Dữ liệu bổ sung (tuỳ chọn)
 */
function jsonResponse(bool $success, string $message = '', array $data = []): void
{
    $response = ['success' => $success];

    if ($message) {
        $response['message'] = $message;
    }

    if ($success) {
        $response['status'] = 'success';
    }

    if (!empty($data)) {
        $response = array_merge($response, $data);
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
