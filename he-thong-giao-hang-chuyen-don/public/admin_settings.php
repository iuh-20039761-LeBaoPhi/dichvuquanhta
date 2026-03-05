<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

// Xử lý cập nhật cài đặt
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_settings'])) {
    $settings = $_POST['settings'] ?? [];

    foreach ($settings as $key => $value) {
        $stmt = $conn->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?");
        $stmt->bind_param("ss", $value, $key);
        $stmt->execute();
        $stmt->close();
    }

    $success_msg = "Cập nhật cài đặt thành công!";
}

// Lấy tất cả cài đặt
$settings = [];
$result = $conn->query("SELECT * FROM system_settings ORDER BY id ASC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $settings[$row['setting_key']] = $row;
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
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">⚙️ Cài đặt hệ thống</h2>
            <a href="admin_stats.php" class="back-link">← Quay lại Dashboard</a>
        </div>

        <?php if (isset($success_msg)): ?>
            <div
                style="padding:15px; background:#d4edda; color:#155724; margin-bottom:20px; border-radius:6px; border:1px solid #c3e6cb;">
                ✓ <?php echo $success_msg; ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="settings-form">
            <!-- Thông tin ngân hàng -->
            <div class="settings-section">
                <h3 style="color:#0a2a66; border-bottom:2px solid #ff7a00; padding-bottom:10px; margin-bottom:20px;">
                    🏦 Thông tin ngân hàng (Thanh toán QR)
                </h3>

                <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    <div class="form-group">
                        <label for="bank_id">Mã ngân hàng</label>
                        <input type="text" id="bank_id" name="settings[bank_id]"
                            value="<?php echo htmlspecialchars($settings['bank_id']['setting_value'] ?? ''); ?>"
                            placeholder="VD: MB, VCB, ACB" required>
                        <small style="color:#666; font-size:12px;">Mã ngân hàng theo chuẩn VietQR</small>
                    </div>

                    <div class="form-group">
                        <label for="bank_name">Tên ngân hàng</label>
                        <input type="text" id="bank_name" name="settings[bank_name]"
                            value="<?php echo htmlspecialchars($settings['bank_name']['setting_value'] ?? ''); ?>"
                            placeholder="VD: MB Bank (Quân đội)" required>
                    </div>

                    <div class="form-group">
                        <label for="bank_account_no">Số tài khoản</label>
                        <input type="text" id="bank_account_no" name="settings[bank_account_no]"
                            value="<?php echo htmlspecialchars($settings['bank_account_no']['setting_value'] ?? ''); ?>"
                            placeholder="VD: 0333666999" required>
                    </div>

                    <div class="form-group">
                        <label for="bank_account_name">Tên chủ tài khoản</label>
                        <input type="text" id="bank_account_name" name="settings[bank_account_name]"
                            value="<?php echo htmlspecialchars($settings['bank_account_name']['setting_value'] ?? ''); ?>"
                            placeholder="VD: FASTGO LOGISTICS" required>
                    </div>

                    <div class="form-group">
                        <label for="qr_template">Mẫu QR Code</label>
                        <select id="qr_template" name="settings[qr_template]">
                            <option value="compact" <?php echo ($settings['qr_template']['setting_value'] ?? '') === 'compact' ? 'selected' : ''; ?>>Compact (Gọn)</option>
                            <option value="print" <?php echo ($settings['qr_template']['setting_value'] ?? '') === 'print' ? 'selected' : ''; ?>>Print (In ấn)</option>
                            <option value="qr_only" <?php echo ($settings['qr_template']['setting_value'] ?? '') === 'qr_only' ? 'selected' : ''; ?>>QR Only (Chỉ mã)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Thông tin công ty -->
            <div class="settings-section" style="margin-top:30px;">
                <h3 style="color:#0a2a66; border-bottom:2px solid #ff7a00; padding-bottom:10px; margin-bottom:20px;">
                    🏢 Thông tin công ty
                </h3>

                <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    <div class="form-group">
                        <label for="company_name">Tên công ty</label>
                        <input type="text" id="company_name" name="settings[company_name]"
                            value="<?php echo htmlspecialchars($settings['company_name']['setting_value'] ?? ''); ?>"
                            placeholder="VD: FastGo Logistics">
                    </div>

                    <div class="form-group">
                        <label for="company_hotline">Hotline</label>
                        <input type="text" id="company_hotline" name="settings[company_hotline]"
                            value="<?php echo htmlspecialchars($settings['company_hotline']['setting_value'] ?? ''); ?>"
                            placeholder="VD: 0123 456 789">
                    </div>

                    <div class="form-group">
                        <label for="company_email">Email liên hệ</label>
                        <input type="email" id="company_email" name="settings[company_email]"
                            value="<?php echo htmlspecialchars($settings['company_email']['setting_value'] ?? ''); ?>"
                            placeholder="VD: contact@fastgo.vn">
                    </div>

                    <div class="form-group">
                        <label for="company_address">Địa chỉ</label>
                        <input type="text" id="company_address" name="settings[company_address]"
                            value="<?php echo htmlspecialchars($settings['company_address']['setting_value'] ?? ''); ?>"
                            placeholder="VD: TP. Hồ Chí Minh">
                    </div>
                </div>
            </div>

            <div style="margin-top:30px; text-align:right;">
                <button type="submit" name="update_settings" class="btn-primary"
                    style="padding:12px 30px; font-size:16px;">
                    💾 Lưu cài đặt
                </button>
            </div>
        </form>

        <!-- Preview QR Code -->
        <div class="settings-section" style="margin-top:40px; background:#f8f9fa; padding:20px; border-radius:8px;">
            <h3 style="color:#0a2a66; margin-bottom:15px;">👁️ Xem trước QR Code</h3>
            <div style="text-align:center;">
                <img id="qr-preview" src="" alt="QR Preview"
                    style="max-width:300px; border:2px solid #0a2a66; border-radius:8px; display:none;">
                <button type="button" onclick="previewQR()" class="btn-secondary" style="margin-top:15px;">
                    🔄 Tạo QR mẫu
                </button>
            </div>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script>
        function previewQR() {
            const bankId = document.getElementById('bank_id').value || 'MB';
            const accountNo = document.getElementById('bank_account_no').value || '0333666999';
            const accountName = document.getElementById('bank_account_name').value || 'FASTGO LOGISTICS';
            const template = document.getElementById('qr_template').value || 'compact';

            const amount = 50000; // Số tiền mẫu
            const addInfo = 'FAST-DEMO123'; // Mã đơn mẫu

            const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

            const img = document.getElementById('qr-preview');
            img.src = qrUrl;
            img.style.display = 'block';
        }
    </script>
</body>

</html>

