<?php
session_start();
require_once __DIR__ . '/../config/local_store.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: login.php");
    exit;
}

$defaults = [
    'bank_id' => 'MB',
    'bank_name' => 'Ngân hàng Quân Đội',
    'bank_account_no' => '0333666999',
    'bank_account_name' => 'GIAO HANG NHANH',
    'qr_template' => 'compact',
    'company_name' => 'Giao Hàng Nhanh',
    'company_hotline' => '1900 1234',
    'company_email' => 'support@giaohangnhanh.local',
    'company_address' => '123 Nguyễn Huệ, TP. HCM',
    'google_sheets_webhook_url' => '',
];

$settings = array_merge($defaults, admin_local_store_read('admin-settings.json', []));
$success_msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_settings'])) {
    $submitted = is_array($_POST['settings'] ?? null) ? $_POST['settings'] : [];
    foreach ($defaults as $key => $defaultValue) {
        $settings[$key] = trim((string) ($submitted[$key] ?? $defaultValue));
    }

    if (admin_local_store_write('admin-settings.json', $settings)) {
        $success_msg = "Cập nhật cài đặt thành công!";
    }
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Cài đặt hệ thống | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">⚙️ Cài đặt hệ thống</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <?php if ($success_msg !== ''): ?>
            <div class="status-badge status-active" style="width: 100%; margin-bottom: 25px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo htmlspecialchars($success_msg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="settings-form">
            <div class="dashboard-layout" style="gap: 30px;">
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-building-columns"></i> Thông tin ngân hàng (VietQR)</h3>
                    </div>
                    
                    <div class="grid-responsive">
                        <div class="form-group">
                            <label for="bank_id">Mã ngân hàng (VietQR)</label>
                            <input type="text" id="bank_id" name="settings[bank_id]"
                                value="<?php echo htmlspecialchars($settings['bank_id'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: MB, VCB, ACB" class="admin-input" required>
                            <small style="color:#64748b; font-size:12px;">Tra cứu mã ngân hàng tại vietqr.io</small>
                        </div>

                        <div class="form-group">
                            <label for="bank_name">Tên ngân hàng đầy đủ</label>
                            <input type="text" id="bank_name" name="settings[bank_name]"
                                value="<?php echo htmlspecialchars($settings['bank_name'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: Ngân hàng Quân Đội" class="admin-input" required>
                        </div>

                        <div class="form-group">
                            <label for="bank_account_no">Số tài khoản</label>
                            <input type="text" id="bank_account_no" name="settings[bank_account_no]"
                                value="<?php echo htmlspecialchars($settings['bank_account_no'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: 0333666999" class="admin-input" required>
                        </div>

                        <div class="form-group">
                            <label for="bank_account_name">Tên chủ tài khoản</label>
                            <input type="text" id="bank_account_name" name="settings[bank_account_name]"
                                value="<?php echo htmlspecialchars($settings['bank_account_name'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: NGUYEN VAN A" class="admin-input" required>
                        </div>

                        <div class="form-group">
                            <label for="qr_template">Giao diện QR Code</label>
                            <select id="qr_template" name="settings[qr_template]" class="admin-select">
                                <option value="compact" <?php echo $settings['qr_template'] === 'compact' ? 'selected' : ''; ?>>Compact (Gọn)</option>
                                <option value="print" <?php echo $settings['qr_template'] === 'print' ? 'selected' : ''; ?>>Print (Để in ấn)</option>
                                <option value="qr_only" <?php echo $settings['qr_template'] === 'qr_only' ? 'selected' : ''; ?>>QR Only (Chỉ mã)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-briefcase"></i> Thông tin doanh nghiệp</h3>
                    </div>

                    <div class="grid-responsive">
                        <div class="form-group">
                            <label for="company_name">Tên thương hiệu</label>
                            <input type="text" id="company_name" name="settings[company_name]"
                                value="<?php echo htmlspecialchars($settings['company_name'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: Giao Hàng Nhanh" class="admin-input">
                        </div>

                        <div class="form-group">
                            <label for="company_hotline">Đường dây nóng (Hotline)</label>
                            <input type="text" id="company_hotline" name="settings[company_hotline]"
                                value="<?php echo htmlspecialchars($settings['company_hotline'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: 1900 1234" class="admin-input">
                        </div>

                        <div class="form-group">
                            <label for="company_email">Email liên hệ hệ thống</label>
                            <input type="email" id="company_email" name="settings[company_email]"
                                value="<?php echo htmlspecialchars($settings['company_email'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: support@ghn.vn" class="admin-input">
                        </div>

                        <div class="form-group">
                            <label for="company_address">Địa chỉ trụ sở chính</label>
                            <input type="text" id="company_address" name="settings[company_address]"
                                value="<?php echo htmlspecialchars($settings['company_address'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="VD: 123 Nguyễn Huệ, TP. HCM" class="admin-input">
                        </div>

                        <div class="form-group">
                            <label for="google_sheets_webhook_url">Google Sheets Webhook URL</label>
                            <input type="text" id="google_sheets_webhook_url" name="settings[google_sheets_webhook_url]"
                                value="<?php echo htmlspecialchars($settings['google_sheets_webhook_url'], ENT_QUOTES, 'UTF-8'); ?>"
                                placeholder="Dán URL Web App của Google Apps Script để đồng bộ đơn hàng" class="admin-input">
                            <small style="color:#64748b; font-size:12px;">Đang lưu nội bộ ở file JSON, không còn phụ thuộc bảng MySQL cũ.</small>
                        </div>
                    </div>
                </div>

                <div class="admin-card" style="background: rgba(10, 42, 102, 0.02); border-style: dashed;">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-qrcode"></i> Xem trước hiển thị thanh toán</h3>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                        <img id="qr-preview" src="" alt="QR Preview"
                            style="max-width:240px; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display:none;">
                        <button type="button" onclick="previewQR()" class="btn-secondary" style="padding: 10px 30px;">
                            <i class="fa-solid fa-arrows-rotate"></i> Cập nhật bản xem trước
                        </button>
                    </div>
                </div>

                <div style="position: sticky; bottom: 30px; z-index: 10; padding: 20px 0; display: flex; justify-content: flex-end;">
                    <button type="submit" name="update_settings" class="btn-primary" style="padding: 15px 40px; font-size: 16px; box-shadow: 0 10px 30px rgba(10,42,102,0.4);">
                        <i class="fa-solid fa-floppy-disk"></i> Lưu tất cả thay đổi
                    </button>
                </div>
            </div>
        </form>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script>
        function previewQR() {
            const bankId = document.getElementById('bank_id').value || 'MB';
            const accountNo = document.getElementById('bank_account_no').value || '0333666999';
            const accountName = document.getElementById('bank_account_name').value || 'GIAO HÀNG NHANH';
            const template = document.getElementById('qr_template').value || 'compact';

            const amount = 50000;
            const addInfo = 'MA_DON_HANG';

            const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

            const img = document.getElementById('qr-preview');
            img.src = qrUrl;
            img.style.display = 'block';
            img.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    </script>
</body>

</html>
