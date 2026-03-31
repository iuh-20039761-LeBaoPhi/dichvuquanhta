<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

function register_json_response(array $payload): void
{
    echo json_encode($payload);
    exit;
}

function register_sanitize_filename(string $name): string
{
    $base = basename($name);
    $clean = preg_replace('/[^A-Za-z0-9._-]/', '_', $base);
    return $clean !== '' ? $clean : 'file';
}

function register_save_upload(string $field, string $targetDir, array $allowedExts = []): ?array
{
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) {
        return null;
    }

    $file = $_FILES[$field];
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($error !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Tệp tải lên không hợp lệ.');
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    $originalName = (string) ($file['name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        throw new RuntimeException('Không tìm thấy tệp tải lên hợp lệ.');
    }

    $safeName = register_sanitize_filename($originalName);
    $extension = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
    if (!empty($allowedExts) && !in_array($extension, $allowedExts, true)) {
        throw new RuntimeException('Định dạng tệp không được hỗ trợ.');
    }

    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Không thể tạo thư mục lưu hồ sơ shipper.');
    }

    $finalName = $safeName;
    $counter = 1;
    while (file_exists($targetDir . DIRECTORY_SEPARATOR . $finalName)) {
        $finalName = pathinfo($safeName, PATHINFO_FILENAME) . '_' . $counter . ($extension !== '' ? '.' . $extension : '');
        $counter++;
    }

    $destination = $targetDir . DIRECTORY_SEPARATOR . $finalName;
    if (!move_uploaded_file($tmpName, $destination)) {
        throw new RuntimeException('Không thể lưu tệp tải lên.');
    }

    return [
        'absolute_path' => $destination,
        'relative_path' => $finalName,
    ];
}

function register_cleanup_uploaded_files(array $absolutePaths): void
{
    foreach ($absolutePaths as $path) {
        if (is_string($path) && $path !== '' && is_file($path)) {
            @unlink($path);
        }
    }
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim((string) ($_POST['ten_dang_nhap'] ?? ($_POST['username'] ?? '')));
    $email = trim($_POST['email'] ?? '');
    $phone = trim((string) ($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? '')));
    $fullname = trim((string) ($_POST['ho_ten'] ?? ($_POST['fullname'] ?? '')));
    $password = $_POST['mat_khau'] ?? ($_POST['password'] ?? '');
    $confirm_password = $_POST['xac_nhan_mat_khau'] ?? ($_POST['confirm_password'] ?? '');
    $role = $_POST['vai_tro'] ?? ($_POST['role'] ?? 'customer');
    $cccdNumber = trim((string) ($_POST['so_cccd'] ?? ($_POST['cccd'] ?? '')));
    $shipperTermsAccepted = isset($_POST['shipper_dong_y_dieu_khoan']) || isset($_POST['shipper_terms']) ? 1 : 0;
    $uploadedAbsolutePaths = [];
    $allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

    // Validate
    if (empty($password) || empty($email) || empty($phone) || empty($fullname)) {
        register_json_response(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
    } elseif ($password !== $confirm_password) {
        register_json_response(['status' => 'error', 'message' => 'Mật khẩu xác nhận không khớp.']);
    } elseif (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[\W_]/', $password)) {
        register_json_response(['status' => 'error', 'message' => 'Mật khẩu yếu. Yêu cầu: tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.']);
    } elseif (!empty($username) && !preg_match('/^[a-zA-Z0-9_.]{3,20}$/', $username)) {
        register_json_response(['status' => 'error', 'message' => 'Tên đăng nhập không hợp lệ (3-20 ký tự, không dấu, không khoảng trắng).']);
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        register_json_response(['status' => 'error', 'message' => 'Email không hợp lệ.']);
    } elseif (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        register_json_response(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ.']);
    } elseif (strlen($fullname) < 2) {
        register_json_response(['status' => 'error', 'message' => 'Họ và tên quá ngắn.']);
    } elseif (!in_array($role, ['customer', 'shipper'], true)) {
        register_json_response(['status' => 'error', 'message' => 'Vai trò đăng ký không hợp lệ.']);
    } elseif ($role === 'shipper' && !preg_match('/^[0-9]{9,12}$/', $cccdNumber)) {
        register_json_response(['status' => 'error', 'message' => 'Số CCCD/CMND không hợp lệ.']);
    } elseif ($role === 'shipper' && $shipperTermsAccepted !== 1) {
        register_json_response(['status' => 'error', 'message' => 'Bạn cần đồng ý điều khoản dành cho shipper.']);
    }

    if (empty($username)) {
        $username = $phone;
    }

    // Kiểm tra trùng lặp (Username, Email hoặc Số điện thoại)
    $stmt = $conn->prepare("SELECT id FROM nguoi_dung WHERE ten_dang_nhap = ? OR email = ? OR so_dien_thoai = ?");
    if (!$stmt) {
        error_log('Register Check Error: ' . $conn->error);
        register_json_response(['status' => 'error', 'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.']);
    }
    $stmt->bind_param("sss", $username, $email, $phone);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        register_json_response(['status' => 'error', 'message' => 'Tên đăng nhập, Email hoặc Số điện thoại đã được sử dụng.']);
    } else {
        try {
            $cccdFrontPath = null;
            $cccdBackPath = null;
            $avatarPath = null;
            $shipperTermsAt = null;

            if ($role === 'shipper') {
                $uploadDir = dirname(__DIR__) . '/public/uploads/shipper_profiles/' . register_sanitize_filename($username);
                $cccdFront = register_save_upload(isset($_FILES['anh_cccd_mat_truoc']) ? 'anh_cccd_mat_truoc' : 'cccd_front', $uploadDir, $allowedImageExts);
                $cccdBack = register_save_upload(isset($_FILES['anh_cccd_mat_sau']) ? 'anh_cccd_mat_sau' : 'cccd_back', $uploadDir, $allowedImageExts);
                $avatar = register_save_upload(isset($_FILES['anh_dai_dien']) ? 'anh_dai_dien' : 'avatar', $uploadDir, $allowedImageExts);

                if (!$cccdFront || !$cccdBack || !$avatar) {
                    throw new RuntimeException('Shipper cần tải đủ ảnh CCCD mặt trước, mặt sau và ảnh đại diện.');
                }

                $cccdFrontPath = 'shipper_profiles/' . register_sanitize_filename($username) . '/' . $cccdFront['relative_path'];
                $cccdBackPath = 'shipper_profiles/' . register_sanitize_filename($username) . '/' . $cccdBack['relative_path'];
                $avatarPath = 'shipper_profiles/' . register_sanitize_filename($username) . '/' . $avatar['relative_path'];
                $shipperTermsAt = date('Y-m-d H:i:s');
                $uploadedAbsolutePaths = [
                    $cccdFront['absolute_path'],
                    $cccdBack['absolute_path'],
                    $avatar['absolute_path'],
                ];
            }

            // Tạo tài khoản
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $is_approved = ($role === 'shipper') ? 0 : 1;
            $shipperTermsValue = ($role === 'shipper') ? 1 : 0;
            $cccdNumberValue = ($role === 'shipper') ? $cccdNumber : null;

            $insert_stmt = $conn->prepare("INSERT INTO nguoi_dung (ten_dang_nhap, email, so_dien_thoai, ho_ten, mat_khau, vai_tro, da_duyet, so_cccd, anh_cccd_mat_truoc, anh_cccd_mat_sau, anh_dai_dien, shipper_dong_y_dieu_khoan, shipper_dong_y_dieu_khoan_luc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$insert_stmt) {
                throw new RuntimeException('Lỗi hệ thống. Vui lòng thử lại sau.');
            }
            $insert_stmt->bind_param(
                "ssssssissssis",
                $username,
                $email,
                $phone,
                $fullname,
                $hashed_password,
                $role,
                $is_approved,
                $cccdNumberValue,
                $cccdFrontPath,
                $cccdBackPath,
                $avatarPath,
                $shipperTermsValue,
                $shipperTermsAt
            );

            if (!$insert_stmt->execute()) {
                throw new RuntimeException('Không thể tạo tài khoản. Vui lòng thử lại.');
            }

            if ($role === 'shipper') {
                register_json_response([
                    'status' => 'success',
                    'message' => 'Đăng ký thành công. Tài khoản shipper của bạn đang chờ quản trị viên duyệt.',
                    'requires_approval' => true
                ]);
            }

            // BẢO MẬT: Chống Session Fixation
            session_regenerate_id(true);
            $_SESSION['user_id'] = $insert_stmt->insert_id;
            $_SESSION['username'] = $username;
            $_SESSION['role'] = $role;

            register_json_response([
                'status' => 'success',
                'message' => 'Đăng ký thành công!',
                'user' => ['fullname' => $fullname, 'phone' => $phone, 'role' => $role]
            ]);
        } catch (Throwable $e) {
            register_cleanup_uploaded_files($uploadedAbsolutePaths);
            error_log('Register Execute Error: ' . $e->getMessage());
            register_json_response(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    $stmt->close();
}
$conn->close();
?>
