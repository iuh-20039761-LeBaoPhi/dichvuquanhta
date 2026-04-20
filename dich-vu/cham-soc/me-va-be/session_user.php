<?php
declare(strict_types=1);

/**
 * session_user.php
 * File quản lý phiên đăng nhập hợp nhất (đã gộp session_auth.php)
 * Hỗ trợ: Auto-sync từ cookie, quản lý login/logout AJAX và Idle Timeout.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- CONFIG ---
const SESSION_IDLE_TIMEOUT = 1800; // 30 phút

// --- HELPER FUNCTIONS ---
if (!function_exists('json_response')) {
    function json_response(int $statusCode, array $payload): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        http_response_code($statusCode);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('clear_session_data')) {
    function clear_session_data(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                (bool)$params['secure'],
                (bool)$params['httponly']
            );
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
}

if (!function_exists('read_payload')) {
    function read_payload(): array
    {
        $raw = file_get_contents('php://input');
        return ($raw !== false && trim($raw) !== '') ? (json_decode($raw, true) ?? []) : [];
    }
}

// --- 0. TỰ ĐỘNG LƯU COOKIE (Nếu có param trên URL) ---
if (isset($_GET['sodienthoai']) && isset($_GET['password'])) {
    // BUỘC ĐĂNG XUẤT tài khoản cũ để hệ thống nhận diện tài khoản mới từ URL
    clear_session_data();
    $u = $_GET['sodienthoai'];
    $p = $_GET['password'];
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Xác thực thông tin</title>
        <script src="../../../../public/asset/js/dvqt-app.js"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const u = '<?php echo addslashes((string)$u); ?>';
                const p = '<?php echo addslashes((string)$p); ?>';
                
                try {
                    if (typeof DVQTApp !== 'undefined') {
                        // Lưu cookie và ghi đè path=/ để dùng chung toàn hệ thống
                        DVQTApp.setCookie('dvqt_u', u, 7);
                        DVQTApp.setCookie('dvqt_p', p, 7);
                        console.log('Cookies updated via DVQTApp');
                    } else {
                        // Fallback nếu không nạp được script
                        const expires = new Date();
                        expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000));
                        document.cookie = "dvqt_u=" + encodeURIComponent(u) + ";expires=" + expires.toUTCString() + ";path=/";
                        document.cookie = "dvqt_p=" + encodeURIComponent(p) + ";expires=" + expires.toUTCString() + ";path=/";
                        console.log('Cookies updated via fallback');
                    }
                } catch (e) {
                    console.error('Lỗi khi lưu cookie:', e);
                }

                // Xóa params nhạy cảm và reload trang để PHP nhận diện session từ cookie
                const url = new URL(window.location.href);
                url.searchParams.delete('sodienthoai');
                url.searchParams.delete('password');
                
                // Đảm bảo reload ngay lập tức
                window.location.replace(url.toString());
            });
        </script>
    </head>
    <body style="background:#f4f7fb; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <div style="text-align:center; color:#5a7ae4; background:white; padding:40px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <div style="margin-bottom:20px;">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 2s linear infinite;">
                    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
                    <circle cx="12" cy="12" r="10" opacity="0.2"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
            </div>
            <h3 style="margin:0 0 10px;">Đang xác thực thông tin...</h3>
            <p style="color:#666; margin:0;">Vui lòng đợi trong giây lát.</p>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// --- 1. XỬ LÝ ACTION (Login/Logout/Current) ---
$payload = read_payload();
$action = strtolower(trim((string)($_GET['action'] ?? $payload['action'] ?? '')));

if ($action !== '') {
    // Xử lý Logout
    if (in_array($action, ['logout', 'close', 'clear'])) {
        clear_session_data();
        json_response(200, ['success' => true, 'message' => 'Đã đăng xuất']);
    }

    // Xử lý Login (Lưu session trực tiếp từ payload)
    if ($action === 'login') {
        $rawUser = $payload['user'] ?? [];
        if (empty($rawUser)) {
            json_response(422, ['success' => false, 'message' => 'Thiếu dữ liệu tài khoản']);
        }
        session_regenerate_id(true);
        $_SESSION['logged_in'] = true;
        $_SESSION['user'] = $rawUser;
        $_SESSION['last_activity'] = time();
        json_response(200, ['success' => true, 'message' => 'Lưu session thành công', 'user' => $rawUser]);
    }
}

// --- 2. KIỂM TRA TIMEOUT ---
if (isset($_SESSION['last_activity'])) {
    if ((time() - (int)$_SESSION['last_activity']) > SESSION_IDLE_TIMEOUT) {
        clear_session_data();
        // Nếu là yêu cầu lấy trạng thái thì trả về JSON lỗi, nếu là include thì lát nữa sẽ xử lý exit sau
        if ($action === 'current') {
            json_response(401, ['success' => false, 'message' => 'Phiên đăng nhập đã hết hạn']);
        }
    }
}

// --- 3. TỰ ĐỘNG ĐỒNG BỘ TỪ COOKIE (Logic gốc của session_user.php) ---
if (empty($_SESSION['logged_in']) || !isset($_SESSION['user'])) {
    $phone = $_COOKIE['dvqt_u'] ?? '';
    $password = $_COOKIE['dvqt_p'] ?? '';

    if ($phone !== '' && $password !== '') {
        // Gọi API lấy danh sách người dùng để xác thực cookie
        $url = 'https://api.dvqt.vn/list/';
        $postData = json_encode(['table' => 'nguoidung', 'limit' => 100000], JSON_UNESCAPED_UNICODE);
        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $postData,
                'timeout' => 20,
            ]
        ];
        $raw = @file_get_contents($url, false, stream_context_create($opts));
        if ($raw) {
            $json = json_decode($raw, true);
            $users = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];
            foreach ($users as $u) {
                $dbPhone = preg_replace('/\D/', '', $u['sodienthoai'] ?? $u['phone'] ?? '');
                $inputPhone = preg_replace('/\D/', '', $phone);
                $dbPass = $u['matkhau'] ?? $u['password'] ?? '';
                if ($dbPhone === $inputPhone && $dbPass === $password) {
                    $_SESSION['logged_in'] = true;
                    $_SESSION['user'] = [
                        'id' => $u['id'] ?? '',
                        'hovaten' => $u['hovaten'] ?? '',
                        'sodienthoai' => $u['sodienthoai'] ?? '',
                        'email' => $u['email'] ?? '',
                        'diachi' => $u['diachi'] ?? '',
                        'matkhau' => $u['matkhau'] ?? '',
                        'avatartenfile' => $u['link_avatar'] ?? '',
                        'id_dichvu' => $u['id_dichvu'] ?? '',
                        'trangthai' => $u['trangthai'] ?? 'active'
                    ];
                    $_SESSION['last_activity'] = time();
                    break;
                }
            }
        }
    }
}

// --- 4. PHẢN HỒI ---

// Nếu gọi trực tiếp qua AJAX với action 'current'
if ($action === 'current') {
    if (empty($_SESSION['logged_in']) || !isset($_SESSION['user'])) {
        json_response(401, ['success' => false, 'message' => 'Chưa đăng nhập']);
    }
    $_SESSION['last_activity'] = time();
    json_response(200, [
        'success' => true,
        'user' => $_SESSION['user'],
        'idle_timeout' => SESSION_IDLE_TIMEOUT
    ]);
}

// Nếu dùng require_once trong file PHP và chưa đăng nhập
if (empty($_SESSION['logged_in']) || !isset($_SESSION['user'])) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

// Nếu đã đăng nhập thành công, tiếp tục thực thi các file PHP include nó
$_SESSION['last_activity'] = time();
