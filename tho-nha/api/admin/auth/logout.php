<?php
/**
 * Admin Logout — Xóa PHP session cho Quản trị viên
 * ──────────────────────────────────────────────────────────
 * Được gọi bởi: pages/admin/quan-tri.html
 * ──────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../../config/session-config.php';

// Hủy toàn bộ dữ liệu xác thực
clearAuthSession();

jsonResponse(true, 'Đăng xuất Admin thành công');
