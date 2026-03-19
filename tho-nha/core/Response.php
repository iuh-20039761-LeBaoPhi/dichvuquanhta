<?php
class Response {
    public static function json($data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data = null, string $message = 'Thành công'): void {
        self::json(['status' => 'success', 'message' => $message, 'data' => $data]);
    }

    public static function error(string $message, int $code = 400): void {
        self::json(['status' => 'error', 'message' => $message], $code);
    }
}
