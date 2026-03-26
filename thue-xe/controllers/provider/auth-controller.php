<?php
/**
 * Provider Auth Controller
 * Schema-adaptive for nguoidung table variants.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

function tx_get_nguoidung_columns_provider(PDO $conn): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $stmt = $conn->query('SHOW COLUMNS FROM nguoidung');
    $cols = [];
    foreach ($stmt->fetchAll() as $row) {
        $cols[$row['Field']] = true;
    }
    $cache = $cols;
    return $cache;
}

function uploadImageTX(array $file, string $prefix): ?string {
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($file['type'] ?? '', $allowed, true)) return null;
    if (($file['size'] ?? 0) > 5 * 1024 * 1024) return null;

    $ext      = pathinfo($file['name'] ?? '', PATHINFO_EXTENSION);
    $filename = $prefix . '_' . uniqid('', true) . '.' . strtolower($ext ?: 'jpg');
    $dir      = __DIR__ . '/../../uploads/providers/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        return 'uploads/providers/' . $filename;
    }
    return null;
}

$action = $_GET['action'] ?? '';

if ($action === 'checkLogin') {
    if (isset($_SESSION['user_id']) && ($_SESSION['user_role'] ?? '') === 'provider') {
        echo json_encode([
            'success' => true,
            'id'      => $_SESSION['user_id'],
            'name'    => $_SESSION['user_name'] ?? '',
            'email'   => $_SESSION['user_email'] ?? '',
            'company' => $_SESSION['user_company'] ?? '',
        ]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

if ($action === 'logout') {
    unset($_SESSION['user_id'], $_SESSION['user_name'], $_SESSION['user_email'], $_SESSION['user_role'], $_SESSION['user_company']);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'register') {
    $full_name      = trim($_POST['full_name'] ?? '');
    $email          = strtolower(trim($_POST['email'] ?? ''));
    $phone          = trim($_POST['phone'] ?? '');
    $password       = $_POST['password'] ?? '';
    $company_name   = trim($_POST['company_name'] ?? '');
    $license_number = trim($_POST['license_number'] ?? '');
    $address        = trim($_POST['address'] ?? '');
    $description    = trim($_POST['description'] ?? '');

    if ($full_name === '' || $email === '' || $phone === '' || $password === '' || $company_name === '') {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ các trường bắt buộc']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Email không hợp lệ']);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Mật khẩu phải có ít nhất 6 ký tự']);
        exit;
    }

    try {
        $db   = new Database();
        $conn = $db->getConnection();
        $cols = tx_get_nguoidung_columns_provider($conn);

        $needCccd = isset($cols['cccdmatruoc']) || isset($cols['cccdmatsau']);
        if ($needCccd && (empty($_FILES['cccd_front']['tmp_name']) || empty($_FILES['cccd_back']['tmp_name']))) {
            echo json_encode(['success' => false, 'message' => 'Vui lòng tải lên ảnh CCCD mặt trước và mặt sau']);
            exit;
        }

        $stmt = $conn->prepare('SELECT id FROM nguoidung WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Email này đã được đăng ký']);
            exit;
        }

        $avatar_path = (isset($_FILES['avatar']['tmp_name']) && ($_FILES['avatar']['error'] ?? 1) === 0)
            ? uploadImageTX($_FILES['avatar'], 'avatar')
            : null;
        $cccd_front_path = (isset($_FILES['cccd_front']['tmp_name']) && ($_FILES['cccd_front']['error'] ?? 1) === 0)
            ? uploadImageTX($_FILES['cccd_front'], 'cccd_front')
            : null;
        $cccd_back_path = (isset($_FILES['cccd_back']['tmp_name']) && ($_FILES['cccd_back']['error'] ?? 1) === 0)
            ? uploadImageTX($_FILES['cccd_back'], 'cccd_back')
            : null;

        if ($needCccd && (!$cccd_front_path || !$cccd_back_path)) {
            echo json_encode(['success' => false, 'message' => 'Upload ảnh CCCD thất bại. Chỉ chấp nhận JPG/PNG, tối đa 5MB.']);
            exit;
        }

        $hashed = password_hash($password, PASSWORD_DEFAULT);

        $insertCols = [];
        $insertVals = [];
        $params = [];

        $put = function(string $col, $val) use (&$insertCols, &$insertVals, &$params): void {
            $insertCols[] = $col;
            $insertVals[] = '?';
            $params[] = $val;
        };

        $put('hoten', $full_name);
        $put('email', $email);
        if (isset($cols['sodienthoai'])) $put('sodienthoai', $phone);
        if (isset($cols['matkhau'])) $put('matkhau', $hashed);
        if (isset($cols['vaitro'])) $put('vaitro', 'provider');
        if (isset($cols['trangthai'])) $put('trangthai', 'pending');
        if (isset($cols['tencongty'])) $put('tencongty', $company_name);
        if (isset($cols['sogiayphep'])) $put('sogiayphep', $license_number);
        if (isset($cols['diachi'])) $put('diachi', $address);
        if (isset($cols['mota'])) $put('mota', $description);
        if (isset($cols['avatar'])) $put('avatar', $avatar_path);
        if (isset($cols['cccdmatruoc'])) $put('cccdmatruoc', $cccd_front_path);
        if (isset($cols['cccdmatsau'])) $put('cccdmatsau', $cccd_back_path);

        $sql = 'INSERT INTO nguoidung (' . implode(', ', $insertCols) . ') VALUES (' . implode(', ', $insertVals) . ')';
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Đăng ký thành công! Vui lòng chờ admin xét duyệt tài khoản.']);
    } catch (PDOException $e) {
        error_log('provider register error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống, vui lòng thử lại']);
    }
    exit;
}

if ($action === 'login') {
    $data     = json_decode(file_get_contents('php://input'), true) ?? [];
    $phone    = trim($data['phone'] ?? '');
    $password = $data['password'] ?? '';

    if ($phone === '' || $password === '') {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ thông tin']);
        exit;
    }

    try {
        $db   = new Database();
        $conn = $db->getConnection();
        $cols = tx_get_nguoidung_columns_provider($conn);

        $hasPhoneCol   = isset($cols['sodienthoai']);
        $hasRoleCol    = isset($cols['vaitro']);
        $hasStatusCol  = isset($cols['trangthai']);
        $hasCompanyCol = isset($cols['tencongty']);

        $sql = "SELECT id, hoten AS full_name, email, "
             . ($hasPhoneCol ? 'sodienthoai' : "''") . " AS phone, "
             . "matkhau AS password, "
             . ($hasStatusCol ? 'trangthai' : "'active'") . " AS status, "
             . ($hasCompanyCol ? 'tencongty' : "''") . " AS company_name "
             . "FROM nguoidung WHERE "
             . ($hasPhoneCol ? 'sodienthoai = ?' : 'email = ?');
        if ($hasRoleCol) {
            $sql .= " AND vaitro = 'provider'";
        }
        $sql .= ' LIMIT 1';

        $stmt = $conn->prepare($sql);
        $stmt->execute([$phone]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Số điện thoại hoặc mật khẩu không đúng']);
            exit;
        }

        $status = $user['status'] ?? 'active';
        if ($status === 'pending') {
            echo json_encode(['success' => false, 'message' => 'Tài khoản đang chờ admin xét duyệt']);
            exit;
        }
        if ($status === 'rejected') {
            echo json_encode(['success' => false, 'message' => 'Tài khoản đã bị từ chối. Vui lòng liên hệ admin.']);
            exit;
        }
        if ($status === 'blocked') {
            echo json_encode(['success' => false, 'message' => 'Tài khoản đã bị khóa']);
            exit;
        }

        $_SESSION['user_id']      = (int)$user['id'];
        $_SESSION['user_name']    = $user['full_name'] ?? '';
        $_SESSION['user_email']   = $user['email'] ?? '';
        $_SESSION['user_role']    = 'provider';
        $_SESSION['user_company'] = $user['company_name'] ?? '';

        echo json_encode([
            'success' => true,
            'name'    => $user['full_name'] ?? 'Nhà cung cấp',
            'company' => $user['company_name'] ?? '',
        ]);
    } catch (PDOException $e) {
        error_log('provider login error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống!']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
