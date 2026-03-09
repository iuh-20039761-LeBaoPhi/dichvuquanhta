<?php
// Set timezone to Vietnam
date_default_timezone_set('Asia/Ho_Chi_Minh');

require_once '../../config/database.php';
require_once '../../config/auth_unified.php';

// Kiểm tra đăng nhập với vai trò admin
requireAdmin('/CSBN/admin/login.php');

$db = new Database();
$conn = $db->getConnection();
$currentUser = getCurrentUser();

// ==================== HANDLE AJAX REQUESTS ====================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax'])) {
    header('Content-Type: application/json');
    
    $action = $_POST['action'] ?? '';
    
    // Delete booking
    if ($action === 'delete') {
        try {
            $bookingId = $_POST['booking_id'] ?? null;
            if (!$bookingId) throw new Exception('ID không hợp lệ');
            
            $stmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
            $stmt->execute([$bookingId]);
            
            echo json_encode(['status' => 'success', 'message' => 'Xóa thành công']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    
    // Update booking status
    if ($action === 'update_status') {
        try {
            $bookingId = $_POST['booking_id'] ?? null;
            $status = $_POST['status'] ?? null;
            
            if (!$bookingId || !$status) throw new Exception('Dữ liệu không hợp lệ');
            
            // YÊU CẦU: Nếu nhấn hoàn thành thì tự động cập nhật trạng thái thanh toán là đã thanh toán
            if ($status === 'completed') {
                $stmt = $conn->prepare("UPDATE bookings SET status = ?, payment_status = 'paid' WHERE id = ?");
                $stmt->execute([$status, $bookingId]);
            } else {
                $stmt = $conn->prepare("UPDATE bookings SET status = ? WHERE id = ?");
                $stmt->execute([$status, $bookingId]);
            }
            
            echo json_encode(['status' => 'success', 'message' => 'Cập nhật thành công']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Cập nhật trạng thái thanh toán riêng lẻ
    if ($action === 'update_payment_status') {
        try {
            $bookingId = $_POST['booking_id'] ?? null;
            $payment_status = $_POST['payment_status'] ?? null;
            
            if (!$bookingId || !$payment_status) throw new Exception('Dữ liệu không hợp lệ');
            
            $stmt = $conn->prepare("UPDATE bookings SET payment_status = ? WHERE id = ?");
            $stmt->execute([$payment_status, $bookingId]);
            
            echo json_encode(['status' => 'success', 'message' => 'Cập nhật trạng thái thanh toán thành công']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}

// ==================== GET BOOKINGS (WITH JOIN) ====================
try {
    $search = $_GET['search'] ?? '';
    $status_filter = $_GET['status'] ?? '';
    
    // Query cơ bản
    $base_where = " WHERE 1=1";
    $search_params = [];
    
    if ($search) {
        $base_where .= " AND (b.customer_name LIKE ? OR b.email LIKE ? OR b.phone LIKE ?)";
        $searchTerm = "%$search%";
        $search_params = [$searchTerm, $searchTerm, $searchTerm];
    }
    
    // Query lấy danh sách (có lọc theo status)
    $list_query = "SELECT b.*, d.tendichvu, d.gia FROM bookings b LEFT JOIN dichvu d ON b.dichvu_id = d.id" . $base_where;
    $list_params = $search_params;
    
    if ($status_filter) {
        $list_query .= " AND b.status = ?";
        $list_params[] = $status_filter;
    }
    $list_query .= " ORDER BY b.created_at DESC";
    
    $stmt = $conn->prepare($list_query);
    $stmt->execute($list_params);
    $bookings = $stmt->fetchAll();

    // YÊU CẦU: Bộ lọc tổng doanh thu không đổi khi tìm theo status, chỉ đổi khi search tên/sdt/email
    $revenue_query = "SELECT SUM(d.gia) FROM bookings b LEFT JOIN dichvu d ON b.dichvu_id = d.id" . $base_where . " AND (b.status = 'completed' OR b.payment_status = 'paid')";
    $rev_stmt = $conn->prepare($revenue_query);
    $rev_stmt->execute($search_params);
    $total_revenue = $rev_stmt->fetchColumn() ?: 0;

} catch (Exception $e) {
    $error_message = "Lỗi: " . $e->getMessage();
    $bookings = [];
    $total_revenue = 0;
}

// ==================== VIEW ====================
require_once  '../components/adminheader.php';
require_once  '../components/adminsidebar.php';

renderAdminHeader('index', $currentUser);
?>

<div class="flex">
    <!-- Sidebar -->
    <?php renderAdminSidebar($_SERVER['REQUEST_URI']); ?>

    <div class="container-fluid mt-4 mb-4">
        <div class="row mb-4">
            <div class="col-12">
                <h1 class="h3 text-danger mb-3">📊 Quản lý Đặt lịch</h1>
                <form method="GET" class="row g-2 align-items-end">
                    <div class="col-md-6 col-lg-4">
                        <input type="text" name="search" placeholder="Tìm theo tên, email, SĐT..." 
                               class="form-control" value="<?php echo htmlspecialchars($search); ?>">
                    </div>
                    <div class="col-md-4 col-lg-3">
                        <select name="status" class="form-select">
                            <option value="">Tất cả trạng thái</option>
                            <option value="pending" <?php echo $status_filter === 'pending' ? 'selected' : ''; ?>>Chờ xác nhận</option>
                            <option value="confirmed" <?php echo $status_filter === 'confirmed' ? 'selected' : ''; ?>>Đã xác nhận</option>
                            <option value="completed" <?php echo $status_filter === 'completed' ? 'selected' : ''; ?>>Hoàn thành</option>
                            <option value="cancelled" <?php echo $status_filter === 'cancelled' ? 'selected' : ''; ?>>Huỷ</option>
                        </select>
                    </div>
                    <div class="col-md-2 col-lg-2">
                        <button type="submit" class="btn btn-danger w-100">
                            <i class="fas fa-search"></i> Tìm
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-6 col-lg-3">
                <div class="card text-center shadow-sm border-0">
                    <div class="card-body">
                        <h5 class="card-title text-muted">Tổng đặt lịch</h5>
                        <p class="display-6 text-danger fw-bold"><?php echo count($bookings); ?></p>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3">
                <div class="card text-center shadow-sm border-0 bg-success text-white">
                    <div class="card-body">
                        <h5 class="card-title">Tổng doanh thu</h5>
                        <p class="display-6 fw-bold">
                            <?php echo number_format($total_revenue, 0, ',', '.'); ?>
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3">
                <div class="card text-center shadow-sm border-0 text-info">
                    <div class="card-body">
                        <h5 class="card-title text-muted">Đã xác nhận</h5>
                        <p class="display-6 fw-bold">
                            <?php 
                                $stmt_confirmed = $conn->prepare("SELECT COUNT(*) FROM bookings b" . $base_where . " AND b.status = 'confirmed'");
                                $stmt_confirmed->execute($search_params);
                                echo $stmt_confirmed->fetchColumn();
                            ?>
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-3">
                <div class="card text-center shadow-sm border-0 text-success">
                    <div class="card-body">
                        <h5 class="card-title text-muted">Hoàn thành</h5>
                        <p class="display-6 fw-bold">
                            <?php 
                                $stmt_comp = $conn->prepare("SELECT COUNT(*) FROM bookings b" . $base_where . " AND b.status = 'completed'");
                                $stmt_comp->execute($search_params);
                                echo $stmt_comp->fetchColumn();
                            ?>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="card shadow-sm border-0">
            <div class="card-body p-0">
                <?php if (empty($bookings)): ?>
                    <div class="text-center py-5 text-muted">
                        <i class="fas fa-inbox fs-1 mb-3 d-block"></i>
                        <p>📭 Không có đặt lịch nào</p>
                    </div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Khách hàng</th>
                                    <th>Số điện thoại</th>
                                    <th>Email</th>
                                    <th>Dịch vụ</th>
                                    <th>Giá dự kiến</th>
                                    <th>Trạng thái</th>
                                    <th>Thanh toán</th>
                                    <th>Ngày tạo</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($bookings as $booking): ?>
                                    <tr>
                                        <td><strong>#<?php echo $booking['id']; ?></strong></td>
                                        <td><?php echo htmlspecialchars($booking['customer_name']); ?></td>
                                        <td><?php echo htmlspecialchars($booking['phone']); ?></td>
                                        <td><?php echo htmlspecialchars($booking['email']); ?></td>
                                        <td>
                                            <span class="badge bg-secondary">
                                                <?php echo htmlspecialchars($booking['tendichvu'] ?? 'N/A'); ?>
                                            </span>
                                        </td>
                                        <td><?php echo number_format($booking['gia'] ?? 0, 0, ',', '.'); ?> VNĐ</td>
                                        <td>
                                            <select onchange="updateStatus(<?php echo $booking['id']; ?>, this.value)" class="form-select form-select-sm w-auto status-select">
                                                <option value="pending" <?php echo $booking['status'] === 'pending' ? 'selected' : ''; ?>>Chờ xác nhận</option>
                                                <option value="confirmed" <?php echo $booking['status'] === 'confirmed' ? 'selected' : ''; ?>>Đã xác nhận</option>
                                                <option value="completed" <?php echo $booking['status'] === 'completed' ? 'selected' : ''; ?>>Hoàn thành</option>
                                                <option value="cancelled" <?php echo $booking['status'] === 'cancelled' ? 'selected' : ''; ?>>Huỷ</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select onchange="updatePaymentStatus(<?php echo $booking['id']; ?>, this.value)" class="form-select form-select-sm w-auto status-select <?php echo ($booking['payment_status'] ?? 'unpaid') == 'paid' ? 'text-success fw-bold' : 'text-danger'; ?>">
                                                <option value="unpaid" <?php echo ($booking['payment_status'] ?? 'unpaid') === 'unpaid' ? 'selected' : ''; ?>>Chưa thanh toán</option>
                                                <option value="paid" <?php echo ($booking['payment_status'] ?? 'unpaid') === 'paid' ? 'selected' : ''; ?>>Đã thanh toán</option>
                                            </select>
                                        </td>
                                        <td><?php echo date('d/m/Y H:i', strtotime($booking['created_at'])); ?></td>
                                        <td>
                                            <div class="d-flex gap-1">
                                                <button onclick="viewDetails(<?php echo htmlspecialchars(json_encode($booking)); ?>)" 
                                                        class="btn btn-sm btn-primary btn-action" title="Xem chi tiết">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button onclick="deleteBooking(<?php echo $booking['id']; ?>)" 
                                                        class="btn btn-sm btn-danger btn-action" title="Xóa">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <div class="modal fade" id="detailsModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">Chi tiết đặt lịch</h5>
                    <button type="button" class="btn-close btn-close-white" onclick="closeModal()"></button>
                </div>
                <div class="modal-body" id="detailsContent"></div>
                <div class="modal-footer border-0">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Đóng</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    
    <script>
        const detailsModalBS = new bootstrap.Modal(document.getElementById('detailsModal'));
        
        function viewDetails(booking) {
            const content = document.getElementById('detailsContent');
            const price = new Intl.NumberFormat('vi-VN').format(booking.gia || 0);
            const payStatusText = (booking.payment_status === 'paid') ? '<span class="text-success fw-bold">Đã thanh toán</span>' : '<span class="text-danger fw-bold">Chưa thanh toán</span>';
            
            content.innerHTML = `
                <div class="mb-3">
                    <label class="form-label fw-bold">ID đặt lịch:</label>
                    <input type="text" class="form-control" readonly value="#${booking.id}">
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Tên khách hàng:</label>
                    <input type="text" class="form-control" readonly value="${booking.customer_name}">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Số điện thoại:</label>
                        <input type="text" class="form-control" readonly value="${booking.phone}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Email:</label>
                        <input type="text" class="form-control" readonly value="${booking.email || 'N/A'}">
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold text-danger">Dịch vụ đã chọn:</label>
                    <input type="text" class="form-control border-danger" readonly value="${booking.tendichvu || 'N/A'}">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Giá dịch vụ:</label>
                        <input type="text" class="form-control" readonly value="${price} VNĐ">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Thanh toán:</label>
                        <div class="form-control bg-light">${payStatusText}</div>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Ghi chú của khách:</label>
                    <textarea class="form-control" readonly rows="3">${booking.note || 'Không có ghi chú'}</textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Ngày tạo đơn:</label>
                    <input type="text" class="form-control" readonly value="${new Date(booking.created_at).toLocaleString('vi-VN')}">
                </div>
            `;
            detailsModalBS.show();
        }
        
        function closeModal() { detailsModalBS.hide(); }
        
        function updateStatus(bookingId, status) {
            if (!confirm('Bạn có chắc muốn cập nhật trạng thái đơn này?')) {
                location.reload();
                return;
            }
            fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `ajax=1&action=update_status&booking_id=${bookingId}&status=${status}`
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('✓ ' + data.message);
                    location.reload();
                } else { alert('✗ ' + data.message); }
            });
        }

        function updatePaymentStatus(bookingId, payment_status) {
            if (!confirm('Cập nhật trạng thái thanh toán?')) {
                location.reload();
                return;
            }
            fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `ajax=1&action=update_payment_status&booking_id=${bookingId}&payment_status=${payment_status}`
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('✓ ' + data.message);
                    location.reload();
                } else { alert('✗ ' + data.message); }
            });
        }
        
        function deleteBooking(bookingId) {
            if (!confirm('Xác nhận xóa đặt lịch này?')) return;
            fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `ajax=1&action=delete&booking_id=${bookingId}`
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') { location.reload(); }
                else { alert('✗ ' + data.message); }
            });
        }
    </script>
