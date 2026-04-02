<?php
declare(strict_types=1);

const SESSION_USER_IDLE_TIMEOUT = 1800;

function session_user_start(): void
{
	if (session_status() !== PHP_SESSION_ACTIVE) {
		session_start();
	}
}

function session_user_clear(): void
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

	session_destroy();
}

/**
 * Doc thong tin user hien tai tu session dung chung.
 */
function session_user_current(): array
{
	session_user_start();

	if (isset($_SESSION['last_activity'])) {
		$lastActivity = (int)$_SESSION['last_activity'];
		if ($lastActivity > 0 && (time() - $lastActivity) > SESSION_USER_IDLE_TIMEOUT) {
			session_user_clear();
			return [
				'success' => false,
				'message' => 'Phiên đăng nhập đã hết hạn do không hoạt động',
				'user' => null,
			];
		}
	}

	$isLoggedIn = !empty($_SESSION['logged_in']);
	$hasUser = isset($_SESSION['user']) && is_array($_SESSION['user']);

	if (!$isLoggedIn || !$hasUser) {
		return [
			'success' => false,
			'message' => 'Unauthorized',
			'user' => null,
		];
	}

	$_SESSION['last_activity'] = time();

	$user = $_SESSION['user'];
	return [
		'success' => true,
		'message' => 'OK',
		'user' => [
			'id' => $user['id'] ?? ($_SESSION['user_id'] ?? null),
			'ten' => (string)($user['ten'] ?? ($_SESSION['user_name'] ?? '')),
			'sodienthoai' => (string)($user['sodienthoai'] ?? ($_SESSION['user_phone'] ?? '')),
			'vai_tro' => (string)($user['vai_tro'] ?? ($_SESSION['user_role'] ?? '')),
			'trangthai' => (string)($user['trangthai'] ?? ($_SESSION['user_status'] ?? '')),
			'anh_dai_dien' => (string)($user['anh_dai_dien'] ?? ''),
			'dia_chi' => (string)($user['dia_chi'] ?? ''),
			'loai_tai_khoan' => (string)($user['loai_tai_khoan'] ?? ''),
			'bang_nguon' => (string)($user['bang_nguon'] ?? ''),
		],
	];
}

/**
 * Bat buoc dang nhap voi vai tro nhan vien, sai se redirect ve trang login.
 */
function session_user_require_employee(string $loginPath = 'login.html', string $returnPath = ''): array
{
	$result = session_user_current();

	if (!$result['success']) {
		$target = $loginPath;
		if ($returnPath !== '') {
			$target .= (strpos($target, '?') === false ? '?' : '&') . 'redirect=' . rawurlencode($returnPath);
		}
		header('Location: ' . $target);
		exit;
	}

	$role = strtolower(trim((string)($result['user']['vai_tro'] ?? '')));
	$isEmployee = in_array($role, ['nhan_vien', 'nhanvien', 'employee'], true);

	if (!$isEmployee) {
		$target = $loginPath;
		if ($returnPath !== '') {
			$target .= (strpos($target, '?') === false ? '?' : '&') . 'redirect=' . rawurlencode($returnPath);
		}
		header('Location: ' . $target);
		exit;
	}

	return $result['user'];
}

/**
 * Bat buoc dang nhap voi vai tro khach hang, sai se redirect ve trang login.
 */
function session_user_require_customer(string $loginPath = 'login.html', string $returnPath = ''): array
{
	$result = session_user_current();

	if (!$result['success']) {
		$target = $loginPath;
		if ($returnPath !== '') {
			$target .= (strpos($target, '?') === false ? '?' : '&') . 'redirect=' . rawurlencode($returnPath);
		}
		header('Location: ' . $target);
		exit;
	}

	$role = strtolower(trim((string)($result['user']['vai_tro'] ?? '')));
	$isCustomer = in_array($role, ['khach_hang', 'khachhang', 'customer'], true);

	if (!$isCustomer) {
		$target = $loginPath;
		if ($returnPath !== '') {
			$target .= (strpos($target, '?') === false ? '?' : '&') . 'redirect=' . rawurlencode($returnPath);
		}
		header('Location: ' . $target);
		exit;
	}

	return $result['user'];
}

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
	header('Content-Type: application/json; charset=utf-8');
	$result = session_user_current();
	http_response_code($result['success'] ? 200 : 401);
	echo json_encode($result, JSON_UNESCAPED_UNICODE);
	exit;
}
