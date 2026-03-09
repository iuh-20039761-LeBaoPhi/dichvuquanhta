<?php
require_once '../../config/database.php';
require_once '../../config/auth_unified.php';
require_once '../../includes/functions.php';
require_once '../components/AdminHeader.php';
require_once '../components/AdminSidebar.php';
require_once '../components/Pagination.php';

requireAdmin();

$currentUser = getCurrentUser();
$db = new Database();
$conn = $db->getConnection();

// Xử lý tìm kiếm và lọc (Chỉnh sửa phù hợp với csmvb)
$search = $_GET['search'] ?? '';
$category = $_GET['category'] ?? '';
$status = $_GET['status'] ?? ''; // status trong sql là tinyint(1)
$page = max(1, intval($_GET['page'] ?? 1));
$limit = 5;
$offset = ($page - 1) * $limit;

// Xây dựng câu query dựa trên bảng 'dichvu' (d) và 'service_category' (sc)
$whereConditions = ["d.id IS NOT NULL"];
$params = [];

if (!empty($search)) {
    $whereConditions[] = "(d.tendichvu LIKE ? OR d.mo_ta_ngan LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if (!empty($category)) {
    $whereConditions[] = "d.category_id = ?";
    $params[] = $category;
}

if ($status !== '') {
    $whereConditions[] = "d.status = ?";
    $params[] = $status;
}

$whereClause = implode(' AND ', $whereConditions);

// Đếm tổng số bản ghi
try {
    $countSql = "SELECT COUNT(*) as total FROM dichvu d WHERE $whereClause";
    $countStmt = $conn->prepare($countSql);
    $countStmt->execute($params);
    $totalRecords = $countStmt->fetch()['total'];
} catch (PDOException $e) {
    $totalRecords = 0;
    setFlashMessage('Lỗi kết nối cơ sở dữ liệu: ' . $e->getMessage(), 'error');
}

// Lấy danh sách dịch vụ
$services = [];
if ($totalRecords > 0) {
    try {
        $sql = "SELECT d.*, sc.name as category_name
                FROM dichvu d
                LEFT JOIN service_category sc ON d.category_id = sc.id
                WHERE $whereClause
                ORDER BY d.created_at DESC
                LIMIT $limit OFFSET $offset";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $services = $stmt->fetchAll();
    } catch (PDOException $e) {
        setFlashMessage('Không thể tải danh sách dịch vụ: ' . $e->getMessage(), 'error');
    }
}

// Lấy danh mục cho filter
try {
    $categories = $conn->query("SELECT id, name FROM service_category WHERE status = 1 ORDER BY name")->fetchAll();
} catch (PDOException $e) {
    $categories = [];
}

$pagination = getPagination($page, $totalRecords, $limit);

renderAdminHeader('Quản lý dịch vụ', $currentUser);
?>

<div class="flex">
    <?php renderAdminSidebar('/MamaCore/admin/services/'); ?>

    <main class="flex-1 p-6">
        <div class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-semibold text-gray-900">Quản lý dịch vụ</h1>
                    <p class="text-gray-600">Quản lý danh sách dịch vụ y tế MamaCore</p>
                </div>
                <a href="create.php" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Thêm dịch vụ mới
                </a>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <form method="GET" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
                    <input
                        type="text"
                        name="search"
                        value="<?php echo htmlspecialchars($search); ?>"
                        placeholder="Tên dịch vụ..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                    <select name="category" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600">
                        <option value="">Tất cả danh mục</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?php echo $cat['id']; ?>" <?php echo $category == $cat['id'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($cat['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                    <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600">
                        <option value="">Tất cả trạng thái</option>
                        <option value="1" <?php echo $status === '1' ? 'selected' : ''; ?>>Đang hoạt động</option>
                        <option value="0" <?php echo $status === '0' ? 'selected' : ''; ?>>Đã ẩn</option>
                    </select>
                </div>
            </form>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="p-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">
                        Danh sách dịch vụ (<?php echo number_format($totalRecords); ?>)
                    </h3>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình ảnh</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên dịch vụ</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá dịch vụ</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian dự kiến</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($services)): ?>
                            <tr>
                                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Không tìm thấy dịch vụ nào</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($services as $service): ?>
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                                            <?php if ($service['hinh_anh']): ?>
                                                <img src="../../<?php echo htmlspecialchars($service['hinh_anh']); ?>" class="w-full h-full object-cover">
                                            <?php else: ?>
                                                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-medium text-gray-900"><?php echo htmlspecialchars($service['tendichvu']); ?></div>
                                        <div class="text-xs text-gray-500 line-clamp-1"><?php echo htmlspecialchars($service['mo_ta_ngan']); ?></div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><?php echo htmlspecialchars($service['category_name'] ?? 'Chưa phân loại'); ?></td>
                                    <td class="px-6 py-4 whitespace-nowrap font-semibold text-blue-600"><?php echo number_format($service['gia'], 0, ',', '.'); ?>đ</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><?php echo htmlspecialchars($service['thoi_gian_du_kien'] ?? '-'); ?></td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full <?php echo $service['status'] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'; ?>">
                                            <?php echo $service['status'] ? 'Hoạt động' : 'Đã ẩn'; ?>
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <div class="flex gap-3">
                                            <a href="view.php?id=<?php echo $service['id']; ?>" class="text-green-600 hover:text-green-900">Xem</a>
                                            
                                            <a href="edit.php?id=<?php echo $service['id']; ?>" class="text-blue-600 hover:text-blue-900">Sửa</a>
                                            <button onclick="deleteService(<?php echo $service['id']; ?>)" class="text-red-600 hover:text-red-900">Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <?php
            $currentParams = $_GET;
            unset($currentParams['page']);
            echo '<div class="border-t border-gray-200">';
            renderPagination($pagination, $currentParams);
            echo '</div>';
            ?>
        </div>
    </main>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[method="GET"]');
    ['category', 'status'].forEach(name => {
        const select = form.querySelector(`select[name="${name}"]`);
        if (select) select.addEventListener('change', () => form.submit());
    });
});

// Tìm và thay thế hàm deleteService cũ bằng nội dung này:
function deleteService(id) {
    if (confirm('Bạn có chắc chắn muốn thay đổi trạng thái (Ẩn/Hiện) dịch vụ này?')) {
        // Tạo một form tạm thời để gửi POST request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'delete.php'; // Đảm bảo đường dẫn này đúng với file delete.php của bạn

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'product_id'; // Tên này phải khớp với $_POST['product_id'] trong delete.php
        input.value = id;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
    }
}
</script>
<script src="/MamaCore/assets/js/admin.js"></script>
</body>
</html>