<?php
// đảm bảo PHP session đã được khởi tạo trước khi sử dụng
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Kiểm tra tài khoản đã đăng nhập hay chưa
function isLoggedIn() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']);
}

function isAdmin() {
    return isLoggedIn() && $_SESSION['role'] === 'admin';
}


function requireAdmin($redirectTo = '/CSMVB/admin/login.php') {
    if (!isAdmin()) {
        header('Location: ' . $redirectTo);
        exit();
    }
}



// lấy đầy đủ thông tin người dùng đang đăng nhập
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }

    // Try to get from session first
    if (isset($_SESSION['user_data_complete'])) {
        return $_SESSION['user_data_complete'];
    }

    // Fetch complete user data from database
    try {
        require_once __DIR__ . '/database.php';
        $db = new Database();
        $conn = $db->getConnection();

        $stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if ($user) {
            // Cache complete user data in session
            $_SESSION['user_data_complete'] = $user;
            return $user;
        }
    } catch (Exception $e) {
        // Fallback to session data
    }

    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'] ?? '',
        'full_name' => $_SESSION['full_name'] ?? '',
        'email' => $_SESSION['email'] ?? '',
        'role' => $_SESSION['role'],
        'phone' => '',
        'address' => '',
        'created_at' => '',
        'password' => ''
    ];
}
// Xử lý đăng xuất
function logout() {
    session_destroy();
    header('Location: /CSMVB/admin/login.php');
    exit();
}
function dasboard() {
    header('Location: /CSMVB/admin/dasboard/index.php');
    exit();
}
?>