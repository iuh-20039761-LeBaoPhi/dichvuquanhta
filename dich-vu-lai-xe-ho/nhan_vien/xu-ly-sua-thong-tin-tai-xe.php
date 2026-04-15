<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';

/** Redirect về trang sửa kèm thông báo. */
function redirect_with_message(bool $ok, string $message, string $page = 'sua-thong-tin-tai-xe.php'): void
{
    $query = '?ok=' . ($ok ? '1' : '0') . '&msg=' . rawurlencode($message);
    header('Location: ' . $page . $query);
    exit;
}

/** Gọi KRUD API với payload JSON và trả kết quả chuẩn hóa. */
function krud_call(array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return ['success' => false, 'message' => 'Không tạo được payload API.'];
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
        return ['success' => false, 'message' => $error !== '' ? $error : 'Không nhận được phản hồi API.'];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['success' => false, 'message' => 'Phản hồi API không hợp lệ.'];
    }

    if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return ['success' => false, 'message' => (string) ($decoded['error'] ?? $decoded['message'] ?? 'Cập nhật thất bại.')];
    }

    return ['success' => true, 'message' => 'Cập nhật thành công.'];
}

/** Upload 1 ảnh nếu người dùng chọn file mới, nếu không thì giữ file cũ. */
function upload_or_keep_image(string $inputName, string $targetDir, string $currentPath): array
{
    if (!isset($_FILES[$inputName]) || !is_array($_FILES[$inputName])) {
        return ['success' => true, 'path' => $currentPath];
    }

    $file = $_FILES[$inputName];
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        return ['success' => true, 'path' => $currentPath];
    }

    if ($error !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'Upload file lỗi: ' . $inputName];
    }

    $tmpPath = (string) ($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return ['success' => false, 'message' => 'File upload không hợp lệ: ' . $inputName];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = $finfo ? (string) finfo_file($finfo, $tmpPath) : '';
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
        return ['success' => false, 'message' => 'Định dạng ảnh không hợp lệ: ' . $inputName];
    }

    $safeDir = trim(str_replace('\\', '/', $targetDir), '/');
    $absoluteDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $safeDir);

    if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0775, true) && !is_dir($absoluteDir)) {
        return ['success' => false, 'message' => 'Không tạo được thư mục upload'];
    }

    $ext = $allowed[$mime];
    $fileName = $inputName . '_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $fileName;

    if (!move_uploaded_file($tmpPath, $absolutePath)) {
        return ['success' => false, 'message' => 'Không lưu được file: ' . $inputName];
    }

    return ['success' => true, 'path' => $safeDir . '/' . $fileName];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: sua-thong-tin-tai-xe.php');
    exit;
}

$user = $_SESSION['user'] ?? [];
$employeeId = (int) ($user['id'] ?? 0);
if ($employeeId <= 0) {
    redirect_with_message(false, 'Không tìm thấy id tài xế trong session.');
}

// Lấy dữ liệu từ form
$fullName = trim((string) ($_POST['hovaten'] ?? ''));
$phone = trim((string) ($_POST['sodienthoai'] ?? ''));
$password = trim((string) ($_POST['matkhau'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$address = trim((string) ($_POST['diachi'] ?? ''));

// Thông tin bổ sung cho tài xế
$soBangLai = trim((string) ($_POST['so_bang_lai'] ?? ''));
$hangBangLai = trim((string) ($_POST['hang_bang_lai'] ?? ''));
$kinhNghiemNam = trim((string) ($_POST['kinh_nghiem_nam'] ?? '0'));
$kinhNghiemMoTa = trim((string) ($_POST['kinh_nghiem_mota'] ?? ''));

$existingAvatar = trim((string) ($_POST['existing_anh_dai_dien'] ?? ''));
$existingFront = trim((string) ($_POST['existing_cccd_mat_truoc'] ?? ''));
$existingBack = trim((string) ($_POST['existing_cccd_mat_sau'] ?? ''));
$existingLicense = trim((string) ($_POST['existing_giay_phep_lai_xe'] ?? ''));

// Validate dữ liệu
if ($fullName === '' || mb_strlen($fullName, 'UTF-8') > 120) {
    redirect_with_message(false, 'Họ và tên không hợp lệ.');
}

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if ($phoneDigits === '' || strlen($phoneDigits) < 9 || strlen($phoneDigits) > 12) {
    redirect_with_message(false, 'Số điện thoại không hợp lệ.');
}

if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    redirect_with_message(false, 'Email không đúng định dạng hoặc bị bỏ trống.');
}

if ($password === '' || mb_strlen($password, 'UTF-8') < 6) {
    redirect_with_message(false, 'Mật khẩu phải có ít nhất 6 ký tự.');
}

if ($address === '') {
    redirect_with_message(false, 'Địa chỉ không được bỏ trống.');
}

if ($soBangLai === '') {
    redirect_with_message(false, 'Số bằng lái không được bỏ trống.');
}

if ($hangBangLai === '') {
    redirect_with_message(false, 'Hạng bằng lái không được bỏ trống.');
}

// Xử lý danh sách dịch vụ được chọn
$selectedServices = $_POST['services'] ?? [];
$idDichVu = is_array($selectedServices) ? implode(',', array_map('intval', $selectedServices)) : '';

// Upload ảnh
$avatar = upload_or_keep_image('anh_dai_dien', 'assets/taixe/anhdaidien', $existingAvatar);
if (!$avatar['success']) {
    redirect_with_message(false, (string) ($avatar['message'] ?? 'Không thể upload ảnh đại diện.'));
}

$license = upload_or_keep_image('giay_phep_lai_xe', 'assets/taixe/giaypheplaixe', $existingLicense);
if (!$license['success']) {
    redirect_with_message(false, (string) ($license['message'] ?? 'Không thể upload ảnh bằng lái xe.'));
}

$front = upload_or_keep_image('cccd_mat_truoc', 'assets/taixe/cccdmattruoc', $existingFront);
if (!$front['success']) {
    redirect_with_message(false, (string) ($front['message'] ?? 'Không thể upload CCCD mặt trước.'));
}

$back = upload_or_keep_image('cccd_mat_sau', 'assets/taixe/cccdmatsau', $existingBack);
if (!$back['success']) {
    redirect_with_message(false, (string) ($back['message'] ?? 'Không thể upload CCCD mặt sau.'));
}

$avatarPath = trim((string) ($avatar['path'] ?? ''));
$licensePath = trim((string) ($license['path'] ?? ''));
$frontPath = trim((string) ($front['path'] ?? ''));
$backPath = trim((string) ($back['path'] ?? ''));

// Validate ảnh bắt buộc (chỉ yêu cầu khi chưa có ảnh cũ)
if ($avatarPath === '' && $existingAvatar === '') {
    redirect_with_message(false, 'Vui lòng tải lên ảnh đại diện.');
}
if ($licensePath === '' && $existingLicense === '') {
    redirect_with_message(false, 'Vui lòng tải lên ảnh bằng lái xe.');
}
if ($frontPath === '' && $existingFront === '') {
    redirect_with_message(false, 'Vui lòng tải lên ảnh CCCD mặt trước.');
}
if ($backPath === '' && $existingBack === '') {
    redirect_with_message(false, 'Vui lòng tải lên ảnh CCCD mặt sau.');
}

// Chuẩn bị dữ liệu cập nhật
$data = [
    'hovaten' => $fullName,
    'sodienthoai' => $phone,
    'matkhau' => $password,
    'email' => $email,
    'diachi' => $address,
    'avatartenfile' => $avatarPath ?: $existingAvatar,
    'giaypheplaixetenfile' => $licensePath ?: $existingLicense,
    'cccdmattruoctenfile' => $frontPath ?: $existingFront,
    'cccdmatsautenfile' => $backPath ?: $existingBack,
    'so_bang_lai' => $soBangLai,
    'hang_bang_lai' => $hangBangLai,
    'kinh_nghiem_nam' => (int)$kinhNghiemNam,
    'kinh_nghiem_mota' => $kinhNghiemMoTa,
    'id_dichvu' => $idDichVu,
    'updated_date' => date('Y-m-d H:i:s'),
];

$updateResult = krud_call([
    'action' => 'update',
    'table' => 'nguoidung',
    'id' => $employeeId,
    'data' => $data,
]);

if (!$updateResult['success']) {
    redirect_with_message(false, (string) $updateResult['message']);
}

// Cập nhật lại session sau khi lưu thành công
if (!isset($_SESSION)) {
    session_start();
}
if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
    $_SESSION['user']['id'] = $employeeId;
    $_SESSION['user']['ten'] = $fullName;
    $_SESSION['user']['hovaten'] = $fullName;
    $_SESSION['user']['sodienthoai'] = $phone;
    $_SESSION['user']['matkhau'] = $password;
    $_SESSION['user']['email'] = $email;
    $_SESSION['user']['diachi'] = $address;
    $_SESSION['user']['avatartenfile'] = $avatarPath ?: $existingAvatar;
    $_SESSION['user']['giaypheplaixetenfile'] = $licensePath ?: $existingLicense;
    $_SESSION['user']['cccdmattruoctenfile'] = $frontPath ?: $existingFront;
    $_SESSION['user']['cccdmatsautenfile'] = $backPath ?: $existingBack;
    $_SESSION['user']['so_bang_lai'] = $soBangLai;
    $_SESSION['user']['hang_bang_lai'] = $hangBangLai;
    $_SESSION['user']['kinh_nghiem_nam'] = $kinhNghiemNam;
    $_SESSION['user']['kinh_nghiem_mota'] = $kinhNghiemMoTa;
    $_SESSION['user']['id_dichvu'] = $idDichVu;
}

$_SESSION['user_id'] = $employeeId;
$_SESSION['user_name'] = $fullName;
$_SESSION['user_phone'] = $phone;
$_SESSION['last_activity'] = time();

header('Location: thong-tin-tai-xe.php?ok=1&msg=' . rawurlencode('Đã cập nhật thông tin tài xế thành công.'));
exit;
?>