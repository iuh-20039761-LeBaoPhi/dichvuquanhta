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
		$error = 'Vui long nhap day du email va mat khau.';
	} else {
		$apiResult = admin_api_list_table('admin');
		$admins = $apiResult['rows'] ?? [];
		$apiError = (string)($apiResult['error'] ?? '');

		if ($apiError !== '') {
			$error = 'Khong lay duoc du lieu admin: ' . $apiError;
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
				$error = 'Tai khoan admin khong ton tai.';
			} else {
				$storedPassword = (string)($account['matkhau'] ?? $account['password'] ?? '');
				if (!admin_password_match($password, $storedPassword)) {
					$error = 'Mat khau khong dung.';
				} else {
					$_SESSION['admin_logged_in'] = true;
					$_SESSION['admin_user'] = [
						'id' => (int)($account['id'] ?? 0),
						'name' => (string)($account['hovaten'] ?? $account['ten'] ?? 'Admin'),
						'email' => (string)($account['email'] ?? $email),
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
	<title>Dang nhap Admin</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
</head>
<body class="bg-light d-flex align-items-center min-vh-100">
	<main class="container">
		<div class="row justify-content-center">
			<div class="col-12 col-md-8 col-lg-5">
				<div class="card border-0 shadow-sm rounded-4">
					<div class="card-body p-4 p-lg-5">
						<h1 class="h4 fw-bold text-center mb-1">Dang nhap Admin</h1>
						<p class="text-secondary text-center mb-4">Quan ly hoa don va nhan vien</p>

						<?php if ($error !== ''): ?>
							<div class="alert alert-danger py-2"><?= admin_login_h($error) ?></div>
						<?php endif; ?>

						<form method="post">
							<div class="mb-3">
								<label class="form-label">Email</label>
								<input type="email" name="email" class="form-control" value="<?= admin_login_h($email) ?>" required>
							</div>
							<div class="mb-3">
								<label class="form-label">Mat khau</label>
								<input type="password" name="password" class="form-control" required>
							</div>
							<button type="submit" class="btn btn-success w-100">
								<i class="bi bi-box-arrow-in-right me-1"></i>Dang nhap
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	</main>
</body>
</html>
