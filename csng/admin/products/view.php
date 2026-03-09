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

$serviceId = intval($_GET['id'] ?? 0);
if ($serviceId <= 0) {
    header('Location: index.php');
    exit();
}

// Lấy thông tin dịch vụ phối hợp với danh mục
try {
    $stmt = $conn->prepare("
        SELECT d.*, sc.name as category_name
        FROM dichvu d
        LEFT JOIN service_category sc ON d.category_id = sc.id
        WHERE d.id = ?
    ");
    $stmt->execute([$serviceId]);
    $service = $stmt->fetch();
} catch (PDOException $e) {
    setFlashMessage('Lỗi truy vấn: ' . $e->getMessage(), 'error');
    header('Location: index.php');
    exit();
}

if (!$service) {
    setFlashMessage('Không tìm thấy dịch vụ', 'error');
    header('Location: index.php');
    exit();
}

renderAdminHeader('Chi tiết dịch vụ', $currentUser);
?>

<div class="flex">
    <?php renderAdminSidebar('/MamaCore/admin/services/'); ?>

    <main class="flex-1 p-6">
        <div class="mb-8 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900">Chi tiết dịch vụ</h1>
                <p class="text-gray-600">ID: #<?php echo $service['id']; ?></p>
            </div>
            <div class="flex gap-3">
                <a href="index.php" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                    Quay lại
                </a>
                <a href="edit.php?id=<?php echo $service['id']; ?>" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Chỉnh sửa
                </a>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="space-y-6">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Hình ảnh dịch vụ</h3>
                    <div class="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <?php if ($service['hinh_anh']): ?>
                            <img src="../../<?php echo htmlspecialchars($service['hinh_anh']); ?>" class="w-full h-full object-cover">
                        <?php else: ?>
                            <div class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <svg class="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span>Không có ảnh</span>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Trạng thái & Giá</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Trạng thái hiển thị</label>
                            <span class="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full <?php echo $service['status'] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'; ?>">
                                <?php echo $service['status'] ? 'Đang hoạt động' : 'Đã ẩn'; ?>
                            </span>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Giá dịch vụ</label>
                            <p class="text-2xl font-bold text-blue-600"><?php echo number_format($service['gia'], 0, ',', '.'); ?>đ</p>
                            <?php if ($service['gia_cu']): ?>
                                <p class="text-sm text-gray-400 line-through"><?php echo number_format($service['gia_cu'], 0, ',', '.'); ?>đ</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Tên dịch vụ</label>
                            <p class="text-gray-900 font-medium"><?php echo htmlspecialchars($service['tendichvu']); ?></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Danh mục</label>
                            <p class="text-gray-900"><?php echo htmlspecialchars($service['category_name'] ?? 'Chưa phân loại'); ?></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Thời gian dự kiến</label>
                            <p class="text-gray-900"><?php echo htmlspecialchars($service['thoi_gian_du_kien'] ?: 'Chưa cập nhật'); ?></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Ngày tạo</label>
                            <p class="text-gray-900"><?php echo date('d/m/Y H:i', strtotime($service['created_at'])); ?></p>
                        </div>
                    </div>

                    <div class="border-t border-gray-100 pt-6">
                        <label class="block text-sm font-medium text-gray-500 mb-2">Mô tả ngắn</label>
                        <p class="text-gray-700 italic"><?php echo nl2br(htmlspecialchars($service['mo_ta_ngan'])); ?></p>
                    </div>

                    <div class="border-t border-gray-100 pt-6 mt-6">
                        <label class="block text-sm font-medium text-gray-500 mb-2">Nội dung chi tiết</label>
                        <div class="prose max-w-none text-gray-800">
                            <?php echo nl2br(htmlspecialchars($service['noi_dung_chi_tiet'])); ?>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Lịch sử cập nhật</h3>
                    <div class="flex items-center gap-4 text-sm text-gray-600">
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>Cập nhật lần cuối: <?php echo date('d/m/Y H:i', strtotime($service['updated_at'])); ?></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>

<script src="/MamaCore/assets/js/admin.js"></script>
</body>
</html>