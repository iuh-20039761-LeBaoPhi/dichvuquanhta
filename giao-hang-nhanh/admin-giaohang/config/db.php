<?php
$host = "localhost";
$user = "root";
$pass = "";
$db = "giaohang";
$db_connect_error = '';

mysqli_report(MYSQLI_REPORT_OFF);
$conn = mysqli_init();

if ($conn instanceof mysqli) {
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 3);
    @mysqli_real_connect($conn, $host, $user, $pass, $db);
}

if (!($conn instanceof mysqli) || $conn->connect_errno) {
    $db_connect_error = 'Không kết nối được cơ sở dữ liệu.';
    $conn = null;

    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $acceptHeader = (string) ($_SERVER['HTTP_ACCEPT'] ?? '');
    $isApiRequest =
        strpos($scriptName, '/api/') !== false ||
        stripos($acceptHeader, 'application/json') !== false;

    if ($isApiRequest) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => $db_connect_error,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    return;
}

$conn->set_charset("utf8");
?>
