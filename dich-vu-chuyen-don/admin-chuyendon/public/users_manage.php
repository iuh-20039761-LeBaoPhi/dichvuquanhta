<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$users = moving_admin_read_collection('users');
$editId = trim((string) ($_GET['edit'] ?? ''));
$search = trim((string) ($_GET['search'] ?? ''));
$roleFilter = trim((string) ($_GET['role'] ?? 'all'));
$statusFilter = trim((string) ($_GET['status'] ?? 'all'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? 'save');
    $id = trim((string) ($_POST['id'] ?? ''));

    if ($action === 'delete') {
        $users = array_values(array_filter($users, function ($row) use ($id) {
            return (string) ($row['id'] ?? '') !== $id;
        }));
        moving_admin_write_collection('users', $users);
        moving_admin_set_flash('success', 'Đã xóa người dùng.');
        moving_admin_redirect('users_manage.php');
    }

    $payload = [
        'id' => $id !== '' ? $id : moving_admin_next_id('USR', $users),
        'name' => trim((string) ($_POST['name'] ?? '')),
        'phone' => trim((string) ($_POST['phone'] ?? '')),
        'email' => trim((string) ($_POST['email'] ?? '')),
        'region' => trim((string) ($_POST['region'] ?? '')),
        'role' => trim((string) ($_POST['role'] ?? 'customer')),
        'status' => trim((string) ($_POST['status'] ?? 'active')),
        'note' => trim((string) ($_POST['note'] ?? '')),
        'created_at' => trim((string) ($_POST['created_at'] ?? '')) ?: date('Y-m-d H:i:s'),
    ];

    if ($payload['name'] === '' || $payload['phone'] === '' || $payload['email'] === '') {
        moving_admin_set_flash('error', 'Vui lòng nhập đầy đủ họ tên, số điện thoại và email.');
        $redirect = 'users_manage.php' . ($payload['id'] !== '' ? '?edit=' . urlencode($payload['id']) : '');
        moving_admin_redirect($redirect);
    }

    [$index] = moving_admin_find_by_id($users, $payload['id']);
    if ($index === null) {
        array_unshift($users, $payload);
        moving_admin_set_flash('success', 'Đã thêm người dùng mới.');
    } else {
        $users[$index] = $payload;
        moving_admin_set_flash('success', 'Đã cập nhật người dùng.');
    }

    moving_admin_write_collection('users', $users);
    moving_admin_redirect('users_manage.php');
}

$editingUser = [
    'id' => '',
    'name' => '',
    'phone' => '',
    'email' => '',
    'region' => '',
    'role' => 'customer',
    'status' => 'active',
    'note' => '',
    'created_at' => date('Y-m-d H:i:s'),
];

if ($editId !== '') {
    [, $selectedUser] = moving_admin_find_by_id($users, $editId);
    if (is_array($selectedUser)) {
        $editingUser = $selectedUser;
    }
}

$filteredUsers = array_values(array_filter($users, function ($row) use ($search, $roleFilter, $statusFilter) {
    $haystack = strtolower(implode(' ', [
        $row['id'] ?? '',
        $row['name'] ?? '',
        $row['phone'] ?? '',
        $row['email'] ?? '',
        $row['region'] ?? '',
        $row['note'] ?? '',
    ]));

    if ($search !== '' && strpos($haystack, strtolower($search)) === false) {
        return false;
    }
    if ($roleFilter !== 'all' && (string) ($row['role'] ?? '') !== $roleFilter) {
        return false;
    }
    if ($statusFilter !== 'all' && (string) ($row['status'] ?? '') !== $statusFilter) {
        return false;
    }
    return true;
}));

$flash = moving_admin_get_flash();
$pageTitle = 'Quản lý người dùng | Admin chuyển dọn';
$activeUsers = count(array_filter($users, fn($row) => ($row['status'] ?? '') === 'active'));
$providerUsers = count(array_filter($users, fn($row) => ($row['role'] ?? '') === 'provider'));
$customerUsers = count(array_filter($users, fn($row) => ($row['role'] ?? '') === 'customer'));

require_once __DIR__ . '/../includes/header_admin.php';
?>
<section class="hero-card">
    <div>
        <h1>Quản lý người dùng</h1>
        <p>
            Cụm này đang giữ gọn 3 vai trò chính: admin, khách hàng và nhà cung
            cấp. Dữ liệu được lưu trong JSON nội bộ để dễ copy theo cả thư mục
            admin sang máy khác.
        </p>
    </div>
    <div class="hero-meta">
        <span class="muted">Bản ghi đang hiển thị</span>
        <strong><?php echo count($filteredUsers); ?></strong>
        <p>trên tổng <?php echo count($users); ?> người dùng</p>
    </div>
</section>

<section class="stats-grid">
    <article class="stat-card">
        <span class="muted">Tổng người dùng</span>
        <strong><?php echo count($users); ?></strong>
        <p>Dữ liệu cục bộ trong `users.json`</p>
    </article>
    <article class="stat-card">
        <span class="muted">Đang hoạt động</span>
        <strong><?php echo $activeUsers; ?></strong>
        <p>Tài khoản đã mở sử dụng</p>
    </article>
    <article class="stat-card">
        <span class="muted">Khách hàng / NCC</span>
        <strong><?php echo $customerUsers; ?> / <?php echo $providerUsers; ?></strong>
        <p>Phân bổ theo 2 nhóm chính</p>
    </article>
</section>

<?php if (is_array($flash)): ?>
    <div class="flash <?php echo $flash['type'] === 'error' ? 'flash-error' : ($flash['type'] === 'warning' ? 'flash-warning' : 'flash-success'); ?>">
        <?php echo moving_admin_escape($flash['message'] ?? ''); ?>
    </div>
<?php endif; ?>

<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách người dùng</h2>
            <p>Lọc nhanh theo từ khóa, vai trò và trạng thái.</p>
        </div>
    </div>

    <div class="layout-split">
        <div>
            <form method="get" class="toolbar">
                <div class="field">
                    <label for="search">Tìm kiếm</label>
                    <input id="search" class="input" type="text" name="search" value="<?php echo moving_admin_escape($search); ?>" placeholder="Tên, email, số điện thoại...">
                </div>
                <div class="field">
                    <label for="role">Vai trò</label>
                    <select id="role" class="select" name="role">
                        <option value="all" <?php echo $roleFilter === 'all' ? 'selected' : ''; ?>>Tất cả</option>
                        <option value="admin" <?php echo $roleFilter === 'admin' ? 'selected' : ''; ?>>Admin</option>
                        <option value="provider" <?php echo $roleFilter === 'provider' ? 'selected' : ''; ?>>Nhà cung cấp</option>
                        <option value="customer" <?php echo $roleFilter === 'customer' ? 'selected' : ''; ?>>Khách hàng</option>
                    </select>
                </div>
                <div class="field">
                    <label for="status">Trạng thái</label>
                    <select id="status" class="select" name="status">
                        <option value="all" <?php echo $statusFilter === 'all' ? 'selected' : ''; ?>>Tất cả</option>
                        <option value="active" <?php echo $statusFilter === 'active' ? 'selected' : ''; ?>>Đang hoạt động</option>
                        <option value="pending" <?php echo $statusFilter === 'pending' ? 'selected' : ''; ?>>Chờ duyệt</option>
                        <option value="locked" <?php echo $statusFilter === 'locked' ? 'selected' : ''; ?>>Tạm khóa</option>
                    </select>
                </div>
                <div class="form-actions" style="align-self: end;">
                    <button type="submit" class="button button-secondary">Lọc</button>
                    <a href="users_manage.php" class="button-link button-secondary">Làm mới</a>
                </div>
            </form>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Người dùng</th>
                            <th>Vai trò</th>
                            <th>Khu vực</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!$filteredUsers): ?>
                            <tr><td colspan="5" class="empty-state">Không có người dùng phù hợp.</td></tr>
                        <?php else: ?>
                            <?php foreach ($filteredUsers as $user): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo moving_admin_escape($user['name'] ?? ''); ?></strong><br>
                                        <span class="muted"><?php echo moving_admin_escape($user['phone'] ?? ''); ?></span><br>
                                        <span class="muted"><?php echo moving_admin_escape($user['email'] ?? ''); ?></span>
                                    </td>
                                    <td><span class="badge <?php echo moving_admin_badge_class('user-role', $user['role'] ?? ''); ?>"><?php echo moving_admin_escape(moving_admin_user_role_label($user['role'] ?? '')); ?></span></td>
                                    <td><?php echo moving_admin_escape($user['region'] ?? ''); ?></td>
                                    <td><span class="badge <?php echo moving_admin_badge_class('user-status', $user['status'] ?? ''); ?>"><?php echo moving_admin_escape(moving_admin_user_status_label($user['status'] ?? '')); ?></span></td>
                                    <td>
                                        <div class="inline-actions">
                                            <a href="users_manage.php?edit=<?php echo urlencode((string) ($user['id'] ?? '')); ?>" class="button-link button-secondary">Sửa</a>
                                            <form method="post" onsubmit="return confirm('Xóa người dùng này?');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?php echo moving_admin_escape($user['id'] ?? ''); ?>">
                                                <button type="submit" class="button button-danger">Xóa</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <aside class="editor-card">
            <h3><?php echo $editingUser['id'] !== '' ? 'Cập nhật người dùng' : 'Thêm người dùng'; ?></h3>
            <form method="post">
                <input type="hidden" name="action" value="save">
                <input type="hidden" name="id" value="<?php echo moving_admin_escape($editingUser['id']); ?>">
                <input type="hidden" name="created_at" value="<?php echo moving_admin_escape($editingUser['created_at']); ?>">

                <div class="editor-grid">
                    <div class="field">
                        <label for="name">Họ tên</label>
                        <input id="name" class="input" type="text" name="name" required value="<?php echo moving_admin_escape($editingUser['name']); ?>">
                    </div>
                    <div class="field">
                        <label for="phone">Số điện thoại</label>
                        <input id="phone" class="input" type="text" name="phone" required value="<?php echo moving_admin_escape($editingUser['phone']); ?>">
                    </div>
                    <div class="field">
                        <label for="email">Email</label>
                        <input id="email" class="input" type="email" name="email" required value="<?php echo moving_admin_escape($editingUser['email']); ?>">
                    </div>
                    <div class="field">
                        <label for="region">Khu vực</label>
                        <input id="region" class="input" type="text" name="region" value="<?php echo moving_admin_escape($editingUser['region']); ?>">
                    </div>
                    <div class="field">
                        <label for="role-edit">Vai trò</label>
                        <select id="role-edit" class="select" name="role">
                            <option value="customer" <?php echo ($editingUser['role'] ?? '') === 'customer' ? 'selected' : ''; ?>>Khách hàng</option>
                            <option value="provider" <?php echo ($editingUser['role'] ?? '') === 'provider' ? 'selected' : ''; ?>>Nhà cung cấp</option>
                            <option value="admin" <?php echo ($editingUser['role'] ?? '') === 'admin' ? 'selected' : ''; ?>>Admin</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="status-edit">Trạng thái</label>
                        <select id="status-edit" class="select" name="status">
                            <option value="active" <?php echo ($editingUser['status'] ?? '') === 'active' ? 'selected' : ''; ?>>Đang hoạt động</option>
                            <option value="pending" <?php echo ($editingUser['status'] ?? '') === 'pending' ? 'selected' : ''; ?>>Chờ duyệt</option>
                            <option value="locked" <?php echo ($editingUser['status'] ?? '') === 'locked' ? 'selected' : ''; ?>>Tạm khóa</option>
                        </select>
                    </div>
                    <div class="field span-full">
                        <label for="note">Ghi chú</label>
                        <textarea id="note" class="textarea" name="note"><?php echo moving_admin_escape($editingUser['note']); ?></textarea>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 16px;">
                    <button type="submit" class="button button-primary">Lưu người dùng</button>
                    <a href="users_manage.php" class="button-link button-secondary">Tạo mới</a>
                </div>
            </form>
        </aside>
    </div>
</section>
<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>
