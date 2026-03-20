<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../../index.html");
    exit;
}

$msg = "";

// Xử lý Khóa/Mở khóa nhanh
if (isset($_GET['action']) && isset($_GET['id'])) {
    $action = $_GET['action'];
    $uid = intval($_GET['id']);

    // Không cho phép tự khóa chính mình
    if ($uid == $_SESSION['user_id']) {
        $msg = "Không thể khóa tài khoản đang đăng nhập.";
    } else {
        if ($action === 'approve') {
            $conn->query("UPDATE users SET is_approved = 1 WHERE id = $uid AND role = 'shipper'");
            $msg = "Đã duyệt tài khoản shipper ID $uid.";
        }
        if ($action === 'lock') {
            $reason = isset($_GET['reason']) ? trim($_GET['reason']) : 'Vi phạm chính sách';
            $stmt = $conn->prepare("UPDATE users SET is_locked = 1, lock_reason = ? WHERE id = ?");
            $stmt->bind_param("si", $reason, $uid);
            $stmt->execute();
            $msg = "Đã khóa tài khoản ID $uid.";
        } elseif ($action === 'unlock') {
            $conn->query("UPDATE users SET is_locked = 0, lock_reason = NULL WHERE id = $uid");
            $msg = "Đã mở khóa tài khoản ID $uid.";
        } elseif ($action === 'delete') {
            $del = $conn->query("DELETE FROM users WHERE id = $uid");
            if ($del)
                $msg = "Đã xóa tài khoản ID $uid.";
            else
                $msg = "Không thể xóa (User này đã có dữ liệu đơn hàng). Hãy dùng chức năng Khóa.";
        }
    }
}

// Bộ lọc & Phân trang
$search = trim($_GET['search'] ?? '');
$role = $_GET['role'] ?? '';
$approval_status = $_GET['approval_status'] ?? '';
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit = 10;
$offset = ($page - 1) * $limit;
if ($page < 1)
    $page = 1;

$where = "WHERE 1=1";
if ($search)
    $where .= " AND (username LIKE '%$search%' OR fullname LIKE '%$search%' OR email LIKE '%$search%' OR phone LIKE '%$search%')";
if ($role)
    $where .= " AND role = '$role'";
if ($approval_status === 'pending')
    $where .= " AND is_approved = 0 AND role = 'shipper'";

// Đếm tổng
$total_res = $conn->query("SELECT COUNT(*) as total FROM users $where");
$total_records = $total_res->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);

// Lấy dữ liệu
$sql = "SELECT * FROM users $where ORDER BY id DESC LIMIT $offset, $limit";
$result = $conn->query($sql);
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý người dùng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý người dùng</h2>
            <a href="user_form.php" class="btn-primary">
                <i class="fa-solid fa-user-plus"></i> Thêm người dùng
            </a>
        </div>

        <?php if ($msg): ?>
            <div class="status-badge status-active" style="width: 100%; margin-bottom: 20px; padding: 15px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo $msg; ?>
            </div>
        <?php endif; ?>

        <!-- Filter Card -->
        <div class="admin-card" style="padding: 20px; margin-bottom: 30px;">
            <form method="GET" class="grid-responsive-3" style="align-items: end; gap: 15px;">
                <div class="form-group">
                    <label><i class="fa-solid fa-magnifying-glass"></i> Tìm kiếm</label>
                    <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="Tên, Email, SĐT..." class="admin-input">
                </div>
                <div class="form-group">
                    <label><i class="fa-solid fa-user-tag"></i> Vai trò</label>
                    <select name="role" class="admin-select">
                        <option value="">-- Tất cả vai trò --</option>
                        <option value="customer" <?php if ($role == 'customer') echo 'selected'; ?>>Khách hàng</option>
                        <option value="shipper" <?php if ($role == 'shipper') echo 'selected'; ?>>Shipper</option>
                        <option value="admin" <?php if ($role == 'admin') echo 'selected'; ?>>Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label><i class="fa-solid fa-clock-rotate-left"></i> Xét duyệt</label>
                    <select name="approval_status" class="admin-select">
                        <option value="">-- Trạng thái duyệt --</option>
                        <option value="pending" <?php if ($approval_status == 'pending') echo 'selected'; ?>>Chờ duyệt</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn-primary" style="flex: 1; justify-content: center;">Lọc</button>
                    <a href="users_manage.php" class="btn-secondary" style="flex: 1; justify-content: center;">Đặt lại</a>
                </div>
            </form>
        </div>

        <!-- Table Card -->
        <div class="admin-card" style="padding: 0; overflow: hidden;">
            <div class="table-responsive">
                <table class="order-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tài khoản</th>
                            <th>Thông tin liên hệ</th>
                            <th>Vai trò</th>
                            <th>Trạng thái</th>
                            <th>Ngày tham gia</th>
                            <th style="text-align: right;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($result->num_rows > 0): ?>
                            <?php while ($row = $result->fetch_assoc()): ?>
                                <tr>
                                    <td><span style="font-weight: 700; color: #64748b;">#<?php echo $row['id']; ?></span></td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <div class="profile-avatar" style="width: 35px; height: 35px; font-size: 14px;">
                                                <?php echo strtoupper(substr($row['username'], 0, 1)); ?>
                                            </div>
                                            <strong><?php echo htmlspecialchars($row['username']); ?></strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div style="line-height: 1.4;">
                                            <div style="font-weight: 600;"><?php echo htmlspecialchars($row['fullname']); ?></div>
                                            <div style="font-size: 12px; color: #64748b;">
                                                <i class="fa-regular fa-envelope" style="width: 14px;"></i> <?php echo $row['email']; ?><br>
                                                <i class="fa-solid fa-phone" style="width: 14px;"></i> <?php echo $row['phone']; ?>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="role-badge role-<?php echo $row['role']; ?>">
                                            <?php 
                                                $labels = ['admin' => 'Admin', 'customer' => 'Khách hàng', 'shipper' => 'Shipper'];
                                                echo $labels[$row['role']] ?? ucfirst($row['role']);
                                            ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php if ($row['role'] === 'shipper' && !$row['is_approved']): ?>
                                            <span class="status-badge status-pending">Chờ duyệt</span>
                                        <?php elseif ($row['is_locked']): ?>
                                            <span class="status-badge status-locked">Đã khóa</span>
                                        <?php else: ?>
                                            <span class="status-badge status-active">Hoạt động</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><span style="color: #64748b; font-size: 13px;"><?php echo date('d/m/Y', strtotime($row['created_at'])); ?></span></td>
                                    <td style="text-align: right;">
                                        <div style="display: flex; justify-content: flex-end; gap: 5px;">
                                            <a href="user_history.php?id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" title="Lịch sử hoạt động" style="color: #0a2a66; background: rgba(10,42,102,0.1);">
                                                <i class="fa-solid fa-clock-rotate-left"></i>
                                            </a>
                                            <a href="user_form.php?id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" title="Sửa" style="color: #ff7a00; background: rgba(255,122,0,0.1);">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </a>
                                            <?php if ($row['role'] === 'shipper'): ?>
                                                <a href="admin_shipper_detail.php?id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" title="Hiệu suất Shipper" style="color: #6610f2; background: rgba(102,16,242,0.1);">
                                                    <i class="fa-solid fa-chart-line"></i>
                                                </a>
                                            <?php endif; ?>
                                            <?php if ($row['role'] === 'shipper' && !$row['is_approved']): ?>
                                                <a href="?action=approve&id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" onclick="return confirm('Duyệt tài khoản shipper này?')" title="Duyệt" style="color: #2e7d32; background: rgba(46,125,50,0.1);">
                                                    <i class="fa-solid fa-check"></i>
                                                </a>
                                            <?php endif; ?>
                                            <?php if ($row['id'] != $_SESSION['user_id']): ?>
                                                <?php if ($row['is_locked']): ?>
                                                    <a href="?action=unlock&id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" onclick="return confirm('Mở khóa tài khoản này?')" title="Mở khóa" style="color: #2e7d32; background: rgba(46,125,50,0.1);">
                                                        <i class="fa-solid fa-lock-open"></i>
                                                    </a>
                                                <?php else: ?>
                                                    <a href="#" class="btn-sm btn-view-site-pill" onclick="lockUser(<?php echo $row['id']; ?>); return false;" title="Khóa" style="color: #d9534f; background: rgba(217,83,79,0.1);">
                                                        <i class="fa-solid fa-lock"></i>
                                                    </a>
                                                <?php endif; ?>
                                                <a href="?action=delete&id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" onclick="return confirm('Xóa tài khoản này?')" title="Xóa" style="color: #1a1a1a; background: rgba(0,0,0,0.05);">
                                                    <i class="fa-solid fa-trash-can"></i>
                                                </a>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="7" style="text-align:center; padding:40px; color: #64748b;">Không tìm thấy người dùng nào.</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination -->
        <?php if ($total_pages > 1): ?>
            <div style="margin-top:30px; display: flex; justify-content: center; gap: 8px;">
                <?php for ($i = 1; $i <= $total_pages; $i++):
                    $page_query = http_build_query(array_merge($_GET, ['page' => $i])); ?>
                    <a href="?<?php echo $page_query; ?>" class="btn-sm"
                        style="min-width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: 600; <?php echo ($i == $page) ? 'background:#0a2a66; color:#fff;' : 'background:#fff; color:#64748b; border: 1px solid #e0e6ed;'; ?>">
                        <?php echo $i; ?>
                    </a>
                <?php endfor; ?>
            </div>
        <?php endif; ?>
    </main>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>
    <script>
        function lockUser(id) {
            let reason = prompt("Nhập lý do khóa tài khoản này:", "Vi phạm quy định");
            if (reason !== null) {
                window.location.href = "?action=lock&id=" + id + "&reason=" + encodeURIComponent(reason);
            }
        }
    </script>
</body>

</html>

