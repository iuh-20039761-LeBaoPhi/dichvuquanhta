<?php
session_start();
require_once __DIR__ . '/../config/local_store.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: login.php");
    exit;
}

$username = strtolower(trim((string) ($_SESSION['username'] ?? 'admin01')));
$profiles = admin_local_store_read('admin-profiles.json', []);
$stored = is_array($profiles[$username] ?? null) ? $profiles[$username] : [];

$user = [
    'username' => (string) ($_SESSION['username'] ?? 'admin01'),
    'fullname' => (string) ($stored['fullname'] ?? ($_SESSION['fullname'] ?? 'Quan tri vien Giao Hang Nhanh')),
    'email' => (string) ($stored['email'] ?? ($_SESSION['email'] ?? 'admin01@giaohangnhanh.local')),
    'phone' => (string) ($stored['phone'] ?? ($_SESSION['phone'] ?? '0901234569')),
    'role' => 'admin',
];

$msg = "";
$error = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['update_info'])) {
        $fullname = trim((string) ($_POST['ho_ten'] ?? ($_POST['fullname'] ?? '')));
        $email = trim((string) ($_POST['email'] ?? ''));
        $phone = trim((string) ($_POST['so_dien_thoai'] ?? ($_POST['phone'] ?? '')));

        if ($fullname === '' || $email === '') {
            $error = "Họ tên và Email không được để trống.";
        } else {
            $profiles[$username] = array_merge($stored, [
                'fullname' => $fullname,
                'email' => $email,
                'phone' => $phone,
            ]);
            if (admin_local_store_write('admin-profiles.json', $profiles)) {
                $_SESSION['fullname'] = $fullname;
                $_SESSION['email'] = $email;
                $_SESSION['phone'] = $phone;
                $user['fullname'] = $fullname;
                $user['email'] = $email;
                $user['phone'] = $phone;
                $msg = "Cập nhật thông tin thành công!";
            } else {
                $error = "Không thể lưu thông tin hồ sơ admin.";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Hồ sơ Admin | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ cá nhân</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quay lại Dashboard</a>
        </div>

        <?php if ($msg): ?>
            <div class="status-badge status-active" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo htmlspecialchars($msg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="status-badge status-cancelled" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-triangle-exclamation"></i> <?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <div class="dashboard-layout">
            <div class="admin-card">
                <div class="admin-card-header">
                    <h3><i class="fa-solid fa-id-card"></i> Thông tin cơ bản</h3>
                </div>
                
                <form method="POST">
                    <div class="grid-responsive">
                        <div class="form-group">
                            <label>Tên đăng nhập (Username)</label>
                            <input type="text" value="<?php echo htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8'); ?>" class="admin-input" disabled>
                        </div>
                        <div class="form-group">
                            <label>Họ và tên</label>
                            <input type="text" name="ho_ten" value="<?php echo htmlspecialchars((string) ($user['fullname'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="admin-input" required>
                        </div>
                        <div class="form-group">
                            <label>Email liên lạc</label>
                            <input type="email" name="email" value="<?php echo htmlspecialchars((string) ($user['email'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="admin-input" required>
                        </div>
                        <div class="form-group">
                            <label>Số điện thoại</label>
                            <input type="text" name="so_dien_thoai" value="<?php echo htmlspecialchars((string) ($user['phone'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>" class="admin-input">
                        </div>
                        <div class="form-group">
                            <label>Vai trò hệ thống</label>
                            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(10, 42, 102, 0.05); border-radius: 10px;">
                                <span class="role-badge role-admin">Quản trị viên (Admin)</span>
                                <small style="color: #64748b;">(Tài khoản quản trị dùng chung)</small>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px; text-align: right;">
                        <button type="submit" name="update_info" class="btn-primary">
                            <i class="fa-solid fa-save"></i> Cập nhật thông tin
                        </button>
                    </div>
                </form>
            </div>

            <aside>
                <div class="admin-card" style="border-top: 4px solid #ff7a00;">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-shield-halved"></i> Bảo mật đăng nhập</h3>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 15px;">
                        <div style="font-size: 30px; color: #ff7a00;"><i class="fa-solid fa-lock"></i></div>
                        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
                            Mật khẩu admin đang được quản lý bởi trang đăng nhập chung của hệ thống. Nếu cần đổi mật khẩu, hãy cập nhật tài khoản trong bảng admin chung.
                        </div>
                    </div>
                </div>

                <div class="admin-card" style="margin-top: 20px; border-top: 4px solid #0a2a66;">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-cloud-arrow-up"></i> Cấu hình upload</h3>
                    </div>
                    <form id="upload-settings-form">
                        <div class="form-group">
                            <label for="max_upload_mb">Dung lượng file upload tối đa (MB)</label>
                            <input
                                type="number"
                                id="max_upload_mb"
                                name="max_upload_mb"
                                class="admin-input"
                                min="1"
                                step="1"
                                value="25">
                            <small style="display:block; margin-top:8px; color:#64748b; line-height:1.5;">
                                Áp dụng cho các file upload qua web của Giao Hàng Nhanh. Không thay đổi Apps Script Google Drive / Google Sheet.
                            </small>
                        </div>
                        <div id="upload-settings-status" style="display:none; margin-top:14px; padding:12px 14px; border-radius:12px; font-size:13px;"></div>
                        <div style="margin-top: 20px; text-align: right;">
                            <button type="submit" class="btn-primary" id="upload-settings-submit">
                                <i class="fa-solid fa-floppy-disk"></i> Lưu cấu hình upload
                            </button>
                        </div>
                    </form>
                </div>
                
                <div class="admin-card" style="margin-top: 20px; background: #f8f9fa;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 30px; color: #ff7a00;"><i class="fa-solid fa-circle-info"></i></div>
                        <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Thông tin hiển thị của hồ sơ admin vẫn lưu ở JSON nội bộ của phân hệ giao hàng nhanh.
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script>
        (function () {
            const form = document.getElementById('upload-settings-form');
            const input = document.getElementById('max_upload_mb');
            const statusEl = document.getElementById('upload-settings-status');
            const submitBtn = document.getElementById('upload-settings-submit');
            const endpoint = 'api/settings.php';

            if (!form || !input || !statusEl || !submitBtn) {
                return;
            }

            function setStatus(message, type) {
                statusEl.textContent = message;
                statusEl.style.display = message ? 'block' : 'none';
                statusEl.style.background =
                    type === 'error' ? '#fff1f2' : type === 'success' ? '#ecfdf3' : '#eff6ff';
                statusEl.style.color =
                    type === 'error' ? '#b42318' : type === 'success' ? '#027a48' : '#0a2a66';
                statusEl.style.border =
                    type === 'error'
                        ? '1px solid #fecdd3'
                        : type === 'success'
                            ? '1px solid #a6f4c5'
                            : '1px solid #bfdbfe';
            }

            async function loadSettings() {
                setStatus('Đang tải cấu hình upload...', 'info');
                try {
                    const response = await fetch(endpoint, {
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    const payload = await response.json();
                    if (!response.ok || !payload?.success) {
                        throw new Error(payload?.message || 'Không thể tải cấu hình upload.');
                    }

                    const nextValue = Number(payload?.data?.settings?.max_upload_mb || 25);
                    input.value = Number.isFinite(nextValue) && nextValue > 0 ? String(nextValue) : '25';
                    setStatus('', 'info');
                } catch (error) {
                    setStatus(error.message || 'Không thể tải cấu hình upload.', 'error');
                }
            }

            form.addEventListener('submit', async function (event) {
                event.preventDefault();
                const maxUploadMb = Math.max(1, parseInt(input.value, 10) || 25);

                submitBtn.disabled = true;
                setStatus('Đang lưu cấu hình upload...', 'info');

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            settings: {
                                max_upload_mb: maxUploadMb
                            }
                        })
                    });
                    const payload = await response.json();
                    if (!response.ok || !payload?.success) {
                        throw new Error(payload?.message || 'Không thể lưu cấu hình upload.');
                    }

                    input.value = String(maxUploadMb);
                    setStatus('Đã cập nhật dung lượng file upload tối đa.', 'success');
                } catch (error) {
                    setStatus(error.message || 'Không thể lưu cấu hình upload.', 'error');
                } finally {
                    submitBtn.disabled = false;
                }
            });

            loadSettings();
        })();
    </script>
</body>

</html>
