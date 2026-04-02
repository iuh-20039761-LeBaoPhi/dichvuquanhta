<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

function respond(int $statusCode, array $payload): void
{
	http_response_code($statusCode);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

$user = isset($_SESSION['user']) && is_array($_SESSION['user'])
	? $_SESSION['user']
	: null;

$userTel = $user['user_tel'] ?? '';
$isLoggedIn = $user !== null && trim((string) $userTel) !== '';

if ($isLoggedIn) {
	respond(200, [
		'success' => true,
		'loggedIn' => true,
		'user' => $user,
	]);
}

respond(401, [
	'success' => false,
	'loggedIn' => false,
	'redirect' => 'index.html',
	'message' => 'Bạn chưa đăng nhập.',
]);
