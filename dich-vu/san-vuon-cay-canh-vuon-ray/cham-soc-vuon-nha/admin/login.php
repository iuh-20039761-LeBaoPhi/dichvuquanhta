<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';


if (session_status() !== PHP_SESSION_ACTIVE) {
	session_start();
}

// Check login via cookie (no form)
function get_cookie($name)
{
	return $_COOKIE[$name] ?? '';
}

$email = trim((string) get_cookie('admin_e'));
$password = (string) get_cookie('admin_p');

if ($email !== '' && $password !== '') {
	$apiResult = admin_api_list_table('admin');
	$admins = $apiResult['rows'] ?? [];
	$apiError = (string) ($apiResult['error'] ?? '');

	if ($apiError === '') {
		$account = null;
		foreach ($admins as $row) {
			$rowEmail = strtolower(trim((string) ($row['email'] ?? '')));
			$rowPass = (string) ($row['matkhau'] ?? $row['password'] ?? '');
			if ($rowEmail !== '' && $rowEmail === strtolower($email) && $rowPass === $password) {
				$account = $row;
				break;
			}
		}
		if (is_array($account)) {
			$_SESSION['admin_logged_in'] = true;
			$_SESSION['admin_user'] = [
				'id' => (int) ($account['id'] ?? 0),
				'name' => (string) ($account['hovaten'] ?? $account['ten'] ?? 'Admin'),
				'email' => (string) ($account['email'] ?? $email),
			];
			header('Location: index.php');
			exit;
		}
	}
}

// Nếu không hợp lệ, xóa session và chuyển về trang nhập lại
$_SESSION['admin_logged_in'] = false;
unset($_SESSION['admin_user']);

// Redirect về đúng trang đăng nhập admin.
// - Trên hosting (dichvuquanhta.vn): luôn dùng đường dẫn root để tránh lặp "/dichvuquanhta" trong URL.
// - Trên local XAMPP: giữ hỗ trợ chạy trong thư mục con "/dichvuquanhta".
$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
$isProdHost = (bool) preg_match('/(^|\\.)dichvuquanhta\\.vn$/', $host);

$basePath = '';
if (!$isProdHost) {
	$scriptName = str_replace('\\\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
	if (stripos($scriptName, '/dichvuquanhta/') === 0) {
		$basePath = '/dichvuquanhta';
	}
}

header('Location: ' . $basePath . '/public/admin-login.html');
exit;


if (!function_exists('admin_login_h')) {
	function admin_login_h(string $value): string
	{
		return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
	}
}

if (!function_exists('admin_password_match')) {
	function admin_password_match(string $input, string $stored): bool
	{
		if ($stored === '') {
			return false;
		}

		if (strpos($stored, 'sha256$') === 0) {
			return hash_equals($stored, 'sha256$' . hash('sha256', $input));
		}

		return hash_equals($stored, $input);
	}
}

if (!empty($_SESSION['admin_logged_in']) && isset($_SESSION['admin_user'])) {
	header('Location: index.php');
	exit;
}

$email = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$email = trim((string) ($_POST['email'] ?? ''));
	$password = (string) ($_POST['password'] ?? '');

	if ($email === '' || $password === '') {
		$error = 'Vui long nhap day du email va mat khau.';
	} else {
		$apiResult = admin_api_list_table('admin');
		$admins = $apiResult['rows'] ?? [];
		$apiError = (string) ($apiResult['error'] ?? '');

		if ($apiError !== '') {
			$error = 'Khong lay duoc du lieu admin: ' . $apiError;
		} else {
			$account = null;
			foreach ($admins as $row) {
				$rowEmail = strtolower(trim((string) ($row['email'] ?? '')));
				if ($rowEmail !== '' && $rowEmail === strtolower($email)) {
					$account = $row;
					break;
				}
			}

			if (!is_array($account)) {
				$error = 'Tai khoan admin khong ton tai.';
			} else {
				$storedPassword = (string) ($account['matkhau'] ?? $account['password'] ?? '');
				if (!admin_password_match($password, $storedPassword)) {
					$error = 'Mat khau khong dung.';
				} else {
					$_SESSION['admin_logged_in'] = true;
					$_SESSION['admin_user'] = [
						'id' => (int) ($account['id'] ?? 0),
						'name' => (string) ($account['hovaten'] ?? $account['ten'] ?? 'Admin'),
						'email' => (string) ($account['email'] ?? $email),
					];
					header('Location: index.php');
					exit;
				}
			}
		}
	}
}
// ...existing code...
