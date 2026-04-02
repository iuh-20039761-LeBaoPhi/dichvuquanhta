<?php
/**
 * Provider Logout — Xóa PHP session cho Nhà cung cấp/Thợ
 * ──────────────────────────────────────────────────────────
 * Được gọi bởi: logoutProvider() -> shell.js (Provider)
 * ──────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../../config/session-config.php';

// Hủy toàn bộ dữ liệu xác thực
clearAuthSession();

jsonResponse(true, 'Đăng xuất thành công');
