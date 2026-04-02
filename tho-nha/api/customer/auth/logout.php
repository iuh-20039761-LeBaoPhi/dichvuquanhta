<?php
/**
 * Customer Logout — Xóa PHP session cho khách hàng
 * ──────────────────────────────────────────────────────────
 * Được gọi bởi: ThoNhaApp.logout() -> app-helper.js
 * ──────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../../config/session-config.php';

// Hủy toàn bộ dữ liệu xác thực
clearAuthSession();

jsonResponse(true, 'Đăng xuất thành công');
