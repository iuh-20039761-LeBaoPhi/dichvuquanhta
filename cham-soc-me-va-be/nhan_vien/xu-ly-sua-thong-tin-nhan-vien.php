<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';

/** Redirect ve trang sua kem thong bao. */
function redirect_with_message(bool $ok, string $message, string $page = 'sua-thong-tin-nhan-vien.php'): void
{
    $query = '?ok=' . ($ok ? '1' : '0') . '&msg=' . rawurlencode($message);
    header('Location: ' . $page . $query);
    exit;
}

/** Goi KRUD API voi payload JSON va tra ket qua chuan hoa. */
function krud_call(array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return ['success' => false, 'message' => 'Khong tao duoc payload API.'];
    }

    $url = 'https://api.dvqt.vn/krud/';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $json,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
    ]);

    $raw = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw) || $raw === '') {
        return ['success' => false, 'message' => $error !== '' ? $error : 'Khong nhan duoc phan hoi API.'];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['success' => false, 'message' => 'Phan hoi API khong hop le.'];
    }

    if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return ['success' => false, 'message' => (string)($decoded['error'] ?? $decoded['message'] ?? 'Cap nhat that bai.')];
    }

    return ['success' => true, 'message' => 'Cap nhat thanh cong.'];
}

/** Upload 1 anh neu nguoi dung chon file moi, neu khong thi giu file cu. */
function upload_or_keep_image(string $inputName, string $targetDir, string $currentPath): array
{
    if (!isset($_FILES[$inputName]) || !is_array($_FILES[$inputName])) {
        return ['success' => true, 'path' => $currentPath];
    }

    $file = $_FILES[$inputName];
    $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        return ['success' => true, 'path' => $currentPath];
    }

    if ($error !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'Upload file loi: ' . $inputName];
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return ['success' => false, 'message' => 'File upload khong hop le: ' . $inputName];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = $finfo ? (string)finfo_file($finfo, $tmpPath) : '';
    if ($finfo) {
        finfo_close($finfo);
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    if (!isset($allowed[$mime])) {
        return ['success' => false, 'message' => 'Dinh dang anh khong hop le: ' . $inputName];
    }

    $safeDir = trim(str_replace('\\', '/', $targetDir), '/');
    $absoluteDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $safeDir);

    if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0775, true) && !is_dir($absoluteDir)) {
        return ['success' => false, 'message' => 'Khong tao duoc thu muc upload'];
    }

    $ext = $allowed[$mime];
    $fileName = $inputName . '_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $fileName;

    if (!move_uploaded_file($tmpPath, $absolutePath)) {
        return ['success' => false, 'message' => 'Khong luu duoc file: ' . $inputName];
    }

    return ['success' => true, 'path' => $safeDir . '/' . $fileName];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: sua-thong-tin-nhan-vien.php');
    exit;
}

$user = session_user_require_employee('../login.html', 'nhan_vien/sua-thong-tin-nhan-vien.php');
$employeeId = (int)($user['id'] ?? 0);
if ($employeeId <= 0) {
    redirect_with_message(false, 'Khong tim thay id nhan vien trong session.');
}

$fullName = trim((string)($_POST['hovaten'] ?? ''));
$phone = trim((string)($_POST['sodienthoai'] ?? ''));
$password = trim((string)($_POST['matkhau'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$address = trim((string)($_POST['diachi'] ?? ''));
$birthDate = trim((string)($_POST['ngaysinh'] ?? ''));
$experience = trim((string)($_POST['kinh_nghiem'] ?? ''));
$existingAvatar = trim((string)($_POST['existing_anh_dai_dien'] ?? ''));
$existingFront = trim((string)($_POST['existing_cccd_mat_truoc'] ?? ''));
$existingBack = trim((string)($_POST['existing_cccd_mat_sau'] ?? ''));

if ($fullName === '' || mb_strlen($fullName, 'UTF-8') > 120) {
    redirect_with_message(false, 'Ho va ten khong hop le.');
}

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if ($phoneDigits === '' || strlen($phoneDigits) < 9 || strlen($phoneDigits) > 12) {
    redirect_with_message(false, 'So dien thoai khong hop le.');
}

if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    redirect_with_message(false, 'Email khong dung dinh dang hoac bi bo trong.');
}

if ($password === '' || mb_strlen($password, 'UTF-8') < 6) {
    redirect_with_message(false, 'Mat khau phai co it nhat 6 ky tu.');
}

if ($address === '') {
    redirect_with_message(false, 'Dia chi khong duoc bo trong.');
}

if ($birthDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate)) {
    redirect_with_message(false, 'Ngay sinh khong hop le hoac bi bo trong.');
}

if ($experience === '') {
    redirect_with_message(false, 'Mo ta kinh nghiem khong duoc bo trong.');
}

$avatar = upload_or_keep_image('anh_dai_dien', 'assets/nhacungcap/anhdaidien', $existingAvatar);
if (!$avatar['success']) {
    redirect_with_message(false, (string)($avatar['message'] ?? 'Khong the upload anh dai dien.'));
}

$front = upload_or_keep_image('cccd_mat_truoc', 'assets/nhacungcap/cccdmattruoc', $existingFront);
if (!$front['success']) {
    redirect_with_message(false, (string)($front['message'] ?? 'Khong the upload CCCD mat truoc.'));
}

$back = upload_or_keep_image('cccd_mat_sau', 'assets/nhacungcap/cccdmatsau', $existingBack);
if (!$back['success']) {
    redirect_with_message(false, (string)($back['message'] ?? 'Khong the upload CCCD mat sau.'));
}

$avatarPath = trim((string)($avatar['path'] ?? ''));
$frontPath = trim((string)($front['path'] ?? ''));
$backPath = trim((string)($back['path'] ?? ''));

if ($avatarPath === '' || $frontPath === '' || $backPath === '') {
    redirect_with_message(false, 'Can co day du anh dai dien, CCCD mat truoc va CCCD mat sau.');
}

$data = [
    'hovaten' => $fullName,
    'sodienthoai' => $phone,
    'matkhau' => $password,
    'email' => $email,
    'diachi' => $address,
    'ngaysinh' => $birthDate,
    'kinh_nghiem' => $experience,
    'anh_dai_dien' => $avatarPath,
    'cccd_mat_truoc' => $frontPath,
    'cccd_mat_sau' => $backPath,
    'updated_date' => date('Y-m-d H:i:s'),
];

$updateResult = krud_call([
    'action' => 'update',
    'table' => 'nhacungcap_mevabe',
    'id' => $employeeId,
    'data' => $data,
]);

if (!$updateResult['success']) {
    redirect_with_message(false, (string)$updateResult['message']);
}

session_user_start();
if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
    $_SESSION['user']['id'] = $employeeId;
    $_SESSION['user']['ten'] = $fullName;
    $_SESSION['user']['hovaten'] = $fullName;
    $_SESSION['user']['sodienthoai'] = $phone;
    $_SESSION['user']['matkhau'] = $password;
    $_SESSION['user']['email'] = $email;
    $_SESSION['user']['dia_chi'] = $address;
    $_SESSION['user']['diachi'] = $address;
    $_SESSION['user']['ngaysinh'] = $birthDate;
    $_SESSION['user']['kinh_nghiem'] = $experience;
    $_SESSION['user']['anh_dai_dien'] = $avatarPath;
    $_SESSION['user']['cccd_mat_truoc'] = $frontPath;
    $_SESSION['user']['cccd_mat_sau'] = $backPath;
}

$_SESSION['user_id'] = $employeeId;
$_SESSION['user_name'] = $fullName;
$_SESSION['user_phone'] = $phone;
$_SESSION['last_activity'] = time();

header('Location: thong-tin-nhan-vien.php?ok=1&msg=' . rawurlencode('Da cap nhat thong tin nhan vien thanh cong.'));
exit;
