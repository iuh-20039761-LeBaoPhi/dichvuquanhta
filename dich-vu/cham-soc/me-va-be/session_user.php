<?php
session_start();

/**
 * 0. Tự động lưu COOKIE nếu có param trên URL (Dành cho việc chuyển hướng/copy link kèm tài khoản)
 * Sau khi lưu cookie qua dvqt-app.js, script sẽ tự reload để PHP nhận diện cookie và tạo session.
 */
if (isset($_GET['sodienthoai']) && isset($_GET['password'])) {
    $u = $_GET['sodienthoai'];
    $p = $_GET['password'];
    ?>
    <!DOCTYPE html>
    <html>

    <head>
        <script src="../../../../public/asset/js/dvqt-app.js"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                if (typeof DVQTApp !== 'undefined') {
                    // Lưu cookie với thời hạn 7 ngày
                    DVQTApp.setCookie('dvqt_u', '<?php echo addslashes($u); ?>', 7);
                    DVQTApp.setCookie('dvqt_p', '<?php echo addslashes($p); ?>', 7);

                    // Xóa params nhạy cảm khỏi URL và reload để PHP xử lý session từ cookie
                    const url = new URL(window.location.href);
                    url.searchParams.delete('sodienthoai');
                    url.searchParams.delete('password');
                    window.location.href = url.toString();
                } else {
                    console.error('DVQTApp not found');
                    // Fallback reload sau 1s nếu lỗi script
                    setTimeout(() => {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('sodienthoai');
                        url.searchParams.delete('password');
                        window.location.href = url.toString();
                    }, 1000);
                }
            });
        </script>
    </head>

    <body
        style="background:#f4f7fb; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
        <div style="text-align:center; color:#5a7ae4;">
            <h3>Đang xác thực thông tin...</h3>
            <p>Vui lòng đợi trong giây lát.</p>
        </div>
    </body>

    </html>
    <?php
    exit;
}

// 1. Lấy cookie
$phone = $_COOKIE['dvqt_u'] ?? '';
$password = $_COOKIE['dvqt_p'] ?? '';

// 2. Nếu thiếu thông tin, trả về lỗi
if (!$phone || !$password) {
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

// 3. Gọi API lấy danh sách người dùng (POST)
$url = 'https://api.dvqt.vn/list/';
$payload = json_encode([
    'table' => 'nguoidung',
    'limit' => 100000
], JSON_UNESCAPED_UNICODE);

$opts = [
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 20,
    ]
];
$context = stream_context_create($opts);
$raw = @file_get_contents($url, false, $context);

if (!$raw) {
    echo json_encode(['success' => false, 'message' => 'Không kết nối được API']);
    exit;
}

$json = json_decode($raw, true);
$users = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];

// 4. Tìm user khớp số điện thoại và mật khẩu
$found = null;
foreach ($users as $user) {
    $dbPhone = preg_replace('/\\D/', '', $user['sodienthoai'] ?? $user['phone'] ?? '');
    $inputPhone = preg_replace('/\\D/', '', $phone);
    $dbPass = $user['matkhau'] ?? $user['password'] ?? '';
    if ($dbPhone === $inputPhone && $dbPass === $password) {
        $found = $user;
        break;
    }
}

if (!$found) {
    echo json_encode(['success' => false, 'message' => 'Sai tài khoản hoặc mật khẩu']);
    exit;
}

// 5. Lưu vào session các trường cần thiết
$_SESSION['user'] = [
    'id' => $found['id'] ?? '',
    'hovaten' => $found['hovaten'] ?? '',
    'sodienthoai' => $found['sodienthoai'] ?? '',
    'email' => $found['email'] ?? '',
    'diachi' => $found['diachi'] ?? '',
    'matkhau' => $found['matkhau'] ?? '',
    'avatartenfile' => $found['link_avatar'] ?? '',
    'id_dichvu' => $found['id_dichvu'] ?? '',
    'trangthai' => $found['trangthai'] ?? 'active'
];
$_SESSION['logged_in'] = true;
$_SESSION['last_activity'] = time();
