<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
	session_start();
}

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

// Kiểm tra đã đăng nhập chưa
if (!empty($_SESSION['admin_logged_in']) && isset($_SESSION['admin_user'])) {
	header('Location: index.php');
	exit;
}

$email = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$email = trim((string)($_POST['email'] ?? ''));
	$password = (string)($_POST['password'] ?? '');

	if ($email === '' || $password === '') {
		$error = 'Vui lòng nhập đầy đủ email và mật khẩu.';
	} else {
		// Lấy danh sách admin từ API
		$apiResult = admin_api_list_table('admin');
		$admins = $apiResult['rows'] ?? [];
		$apiError = (string)($apiResult['error'] ?? '');

		if ($apiError !== '') {
			$error = 'Không lấy được dữ liệu admin: ' . $apiError;
		} else {
			$account = null;
			foreach ($admins as $row) {
				$rowEmail = strtolower(trim((string)($row['email'] ?? '')));
				if ($rowEmail !== '' && $rowEmail === strtolower($email)) {
					$account = $row;
					break;
				}
			}

			if (!is_array($account)) {
				$error = 'Tài khoản admin không tồn tại.';
			} else {
				$storedPassword = (string)($account['matkhau'] ?? $account['password'] ?? '');
				if (!admin_password_match($password, $storedPassword)) {
					$error = 'Mật khẩu không đúng.';
				} else {
					$_SESSION['admin_logged_in'] = true;
					$_SESSION['admin_user'] = [
						'id' => (int)($account['id'] ?? 0),
						'name' => (string)($account['hovaten'] ?? $account['ten'] ?? 'Admin'),
						'email' => (string)($account['email'] ?? $email),
						'role' => (string)($account['vai_tro'] ?? $account['role'] ?? 'admin'),
					];
					header('Location: index.php');
					exit;
				}
			}
		}
	}
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Đăng nhập Admin - Dịch Vụ Thuê Tài Xế</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
	<style>
		body {
			background: linear-gradient(135deg, #e3f2fd 0%, #fff3e0 100%);
			font-family: 'Segoe UI', system-ui, sans-serif;
		}
		.login-card {
			border-radius: 20px;
			box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
			overflow: hidden;
		}
		.login-header {
			background: linear-gradient(135deg, #007bff, #00b4d8);
			padding: 30px;
			text-align: center;
			color: white;
		}
		.login-header h1 {
			font-size: 1.8rem;
			font-weight: 700;
			margin-bottom: 5px;
		}
		.login-header p {
			opacity: 0.9;
			margin-bottom: 0;
		}
		.login-body {
			padding: 30px;
			background: white;
		}
		.btn-login {
			background: linear-gradient(135deg, #007bff, #00b4d8);
			border: none;
			padding: 12px;
			font-weight: 600;
			font-size: 1rem;
		}
		.btn-login:hover {
			background: linear-gradient(135deg, #0056b3, #0096b8);
		}
	</style>
</head>
<body class="d-flex align-items-center min-vh-100">
	<main class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-md-8 col-lg-5">
				<div class="card border-0 login-card">
					<div class="login-header">
						<h1><i class="bi bi-car-front-fill me-2"></i>Admin Panel</h1>
						<p>Dịch Vụ Thuê Tài Xế Lái Xe Hộ</p>
					</div>
					<div class="login-body">
						<h2 class="h5 fw-bold text-center mb-3">Đăng nhập hệ thống</h2>
						<p class="text-secondary text-center mb-4">Quản lý đơn hàng, tài xế và dịch vụ</p>

						<?php if ($error !== ''): ?>
							<div class="alert alert-danger py-2"><?= admin_login_h($error) ?></div>
						<?php endif; ?>

						<form method="post">
							<div class="mb-3">
								<label class="form-label fw-semibold">Email</label>
								<input type="email" name="email" class="form-control form-control-lg" placeholder="admin@example.com" value="<?= admin_login_h($email) ?>" required>
							</div>
							<div class="mb-3">
								<label class="form-label fw-semibold">Mật khẩu</label>
								<input type="password" name="password" class="form-control form-control-lg" placeholder="••••••" required>
							</div>
							<button type="submit" class="btn btn-login btn-primary w-100">
								<i class="bi bi-box-arrow-in-right me-2"></i>Đăng nhập
							</button>
						</form>
						
						<div class="text-center mt-4">
							<small class="text-muted">Hệ thống quản lý dịch vụ thuê tài xế</small>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
</body>
</html>