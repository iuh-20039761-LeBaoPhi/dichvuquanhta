<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/admin_api_common.php';
require_once __DIR__ . '/get_taixe.php';

$admin = admin_require_login();
$donhang_id = (int)($_GET['id'] ?? 0);

// Lấy thông tin đơn hàng
$donhangResult = admin_api_list_table('datlich_taixe');
$allOrders = $donhangResult['rows'] ?? [];
$row = null;
foreach ($allOrders as $o) {
    if ((int)($o['id'] ?? 0) === $donhang_id) {
        $row = $o;
        break;
    }
}

// Lấy danh sách tài xế
$taixeData = get_all_taixe();
$taixeList = $taixeData['rows'] ?? [];

// Xử lý form phân công
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $taixe_id = (int)($_POST['taixe_id'] ?? 0);
    if ($taixe_id > 0 && $donhang_id > 0) {
        // Lấy thông tin tài xế
        $taixeInfo = null;
        foreach ($taixeList as $tx) {
            if ((int)($tx['id'] ?? 0) === $taixe_id) {
                $taixeInfo = $tx;
                break;
            }
        }
        
        if ($taixeInfo) {
            $result = admin_api_update_table('datlich_taixe', $donhang_id, [
                'id_taixe' => $taixe_id,
                'ten_taixe' => $taixeInfo['hovaten'] ?? '',
                'sdt_taixe' => $taixeInfo['sodienthoai'] ?? '',
                'email_taixe' => $taixeInfo['email'] ?? '',
                'kinh_nghiem_taixe' => $taixeInfo['kinh_nghiem_nam'] ?? '',
                'trangthai' => 'Đã nhận',
                'ngaynhan' => date('Y-m-d H:i:s')
            ]);
            
            $msg = ($result['success'] ?? false) ? 'Phân công thành công!' : ($result['message'] ?? 'Lỗi');
            header('Location: chi-tiet-don-hang.php?id=' . $donhang_id . '&ok=1&msg=' . rawurlencode($msg));
            exit;
        }
    }
    header('Location: chi-tiet-don-hang.php?id=' . $donhang_id . '&ok=0&msg=Thiếu thông tin');
    exit;
}

admin_render_layout_start('Phân Công Tài Xế', 'orders', $admin);
?>

<div class="card border-0 shadow-sm">
    <div class="card-header bg-white fw-semibold">Phân công tài xế cho đơn #<?= $donhang_id ?></div>
    <div class="card-body">
        <?php if (!$row): ?>
            <div class="alert alert-warning">Không tìm thấy đơn hàng.</div>
        <?php else: ?>
            <p><strong>Khách hàng:</strong> <?= admin_h($row['tenkhachhang'] ?? 'N/A') ?></p>
            <p><strong>Dịch vụ:</strong> <?= admin_h($row['dich_vu'] ?? 'N/A') ?></p>
            <p><strong>Điểm đón:</strong> <?= admin_h($row['diemdon'] ?? 'N/A') ?></p>
            
            <form method="post">
                <div class="mb-3">
                    <label class="form-label">Chọn tài xế</label>
                    <select name="taixe_id" class="form-select" required>
                        <option value="">-- Chọn tài xế --</option>
                        <?php foreach ($taixeList as $tx): ?>
                            <option value="<?= $tx['id'] ?>">
                                <?= admin_h($tx['hovaten'] ?? 'N/A') ?> - <?= admin_h($tx['sodienthoai'] ?? '') ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Phân công</button>
                <a href="chi-tiet-don-hang.php?id=<?= $donhang_id ?>" class="btn btn-outline-secondary">Quay lại</a>
            </form>
        <?php endif; ?>
    </div>
</div>

<?php admin_render_layout_end(); ?>