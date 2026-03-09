<?php
require_once '../../config/database.php';
require_once '../../config/auth_unified.php';
require_once '../../includes/functions.php';
require_once '../components/AdminHeader.php';
require_once '../components/AdminSidebar.php';

requireAdmin();

$currentUser = getCurrentUser();
$db = new Database();
$conn = $db->getConnection();

$error = '';
$success = '';

// Lấy danh sách danh mục dịch vụ từ bảng service_category
try {
    $categories = $conn->query("SELECT id, name FROM service_category WHERE status = 1 ORDER BY name")->fetchAll();
} catch (PDOException $e) {
    $categories = [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Thu thập dữ liệu theo các trường trong bảng dichvu
    $tendichvu = sanitizeInput($_POST['tendichvu'] ?? '');
    $mo_ta_ngan = sanitizeInput($_POST['mo_ta_ngan'] ?? '');
    $noi_dung_chi_tiet = $_POST['noi_dung_chi_tiet'] ?? '';
    $category_id = intval($_POST['category_id'] ?? 0);
    $gia = floatval($_POST['gia'] ?? 0);
    $gia_cu = !empty($_POST['gia_cu']) ? floatval($_POST['gia_cu']) : null;
    $thoi_gian_du_kien = sanitizeInput($_POST['thoi_gian_du_kien'] ?? '');
    $status = isset($_POST['status']) ? intval($_POST['status']) : 1;

    // Validation tương tự nghiệp vụ cũ
    if (empty($tendichvu)) {
        $error = 'Tên dịch vụ là bắt buộc';
    } elseif ($gia <= 0) {
        $error = 'Giá dịch vụ phải lớn hơn 0';
    } elseif ($category_id <= 0) {
        $error = 'Vui lòng chọn danh mục dịch vụ';
    } else {
        // Kiểm tra tên dịch vụ trùng lặp
        $stmt = $conn->prepare("SELECT id FROM dichvu WHERE tendichvu = ?");
        $stmt->execute([$tendichvu]);
        if ($stmt->fetch()) {
            $error = 'Tên dịch vụ này đã tồn tại';
        }

        if (!$error) {
            try {
                $conn->beginTransaction();

                $hinh_anh = null;
                // Xử lý upload hình ảnh giữ nguyên logic
                if (isset($_FILES['hinh_anh']) && $_FILES['hinh_anh']['error'] === UPLOAD_ERR_OK) {
                    $uploadResult = uploadImage($_FILES['hinh_anh'], '../../assets/uploads/services/');
                    if ($uploadResult['success']) {
                        $hinh_anh = 'assets/uploads/services/' . $uploadResult['filename'];
                    }
                }

                // Thêm vào bảng dichvu
                $stmt = $conn->prepare("
                    INSERT INTO dichvu (
                        tendichvu, mo_ta_ngan, noi_dung_chi_tiet, hinh_anh, 
                        gia, gia_cu, thoi_gian_du_kien, category_id, status, 
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ");

                $stmt->execute([
                    $tendichvu, $mo_ta_ngan, $noi_dung_chi_tiet, $hinh_anh,
                    $gia, $gia_cu, $thoi_gian_du_kien, $category_id, $status
                ]);

                $conn->commit();

                setFlashMessage('Thêm dịch vụ thành công!', 'success');
                header('Location: index.php');
                exit();
            } catch (Exception $e) {
                $conn->rollBack();
                $error = 'Có lỗi xảy ra: ' . $e->getMessage();
            }
        }
    }
}

renderAdminHeader('Thêm dịch vụ mới', $currentUser);
?>

<div class="flex">
    <?php renderAdminSidebar('/MamaCore/admin/services/'); ?>

    <main class="flex-1 p-6">
        <div class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-semibold text-gray-900">Thêm dịch vụ mới</h1>
                    <p class="text-gray-600">Tạo dịch vụ y tế mới cho hệ thống MamaCore</p>
                </div>
                <a href="index.php" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                    ← Quay lại
                </a>
            </div>
        </div>

        <?php if ($error): ?>
            <div class="bg-red-100 border border-red-300 text-red-700 rounded-md p-4 mb-6">
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <?php echo htmlspecialchars($error); ?>
                </div>
            </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="space-y-6">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tên dịch vụ <span class="text-red-500">*</span></label>
                        <input type="text" name="tendichvu" required value="<?php echo htmlspecialchars($_POST['tendichvu'] ?? ''); ?>"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none" placeholder="VD: Tắm bé sơ sinh tại nhà">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Danh mục <span class="text-red-500">*</span></label>
                        <select name="category_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                            <option value="">Chọn danh mục</option>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?php echo $cat['id']; ?>" <?php echo ($_POST['category_id'] ?? '') == $cat['id'] ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($cat['name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian dự kiến</label>
                        <input type="text" name="thoi_gian_du_kien" value="<?php echo htmlspecialchars($_POST['thoi_gian_du_kien'] ?? ''); ?>"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none" placeholder="VD: 60 phút, 4 giờ...">
                    </div>
                </div>

                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Mô tả ngắn</label>
                    <textarea name="mo_ta_ngan" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none"><?php echo htmlspecialchars($_POST['mo_ta_ngan'] ?? ''); ?></textarea>
                </div>

                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung chi tiết</label>
                    <textarea name="noi_dung_chi_tiet" rows="5" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none"><?php echo htmlspecialchars($_POST['noi_dung_chi_tiet'] ?? ''); ?></textarea>
                </div>

                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Hình ảnh dịch vụ</label>
                    <input type="file" name="hinh_anh" accept="image/*" class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none">
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Giá & Trạng thái</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Giá hiện tại <span class="text-red-500">*</span></label>
                        <input type="number" name="gia" step="0.01" required value="<?php echo $_POST['gia'] ?? ''; ?>"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Giá cũ (nếu có)</label>
                        <input type="number" name="gia_cu" step="0.01" value="<?php echo $_POST['gia_cu'] ?? ''; ?>"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                            <option value="1" <?php echo ($_POST['status'] ?? '1') == '1' ? 'selected' : ''; ?>>Đang hoạt động</option>
                            <option value="0" <?php echo ($_POST['status'] ?? '') == '0' ? 'selected' : ''; ?>>Tạm ẩn</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-end gap-4">
                <a href="index.php" class="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 transition-colors">Hủy</a>
                <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Lưu dịch vụ
                </button>
            </div>
        </form>
    </main>
</div>

<script src="/MamaCore/assets/js/admin.js"></script>
</body>
</html>