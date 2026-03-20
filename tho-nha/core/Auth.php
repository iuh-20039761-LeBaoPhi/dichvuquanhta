<?php
require_once __DIR__ . '/../config/session.php';

class Auth {
    public static function requireAdmin(): void {
        if (!isset($_SESSION['admin_id'])) {
            Response::error('Chưa đăng nhập', 401);
        }
    }

    public static function requireCustomer(): void {
        if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'customer') {
            Response::error('Chưa đăng nhập', 401);
        }
    }

    public static function requireProvider(): void {
        if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'provider') {
            Response::error('Chưa đăng nhập', 401);
        }
    }

    public static function currentUser(): ?array {
        if (isset($_SESSION['user_id'])) {
            return [
                'id'    => $_SESSION['user_id'],
                'name'  => $_SESSION['user_name']  ?? '',
                'email' => $_SESSION['user_email'] ?? '',
                'phone' => $_SESSION['user_phone'] ?? '',
                'role'  => $_SESSION['user_role']  ?? '',
            ];
        }
        if (isset($_SESSION['admin_id'])) {
            return [
                'id'   => $_SESSION['admin_id'],
                'name' => $_SESSION['admin_username'] ?? 'Admin',
                'role' => 'admin',
            ];
        }
        return null;
    }
}
