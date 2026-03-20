<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra đăng nhập
if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit;
}

$queryString = $_SERVER['QUERY_STRING'] ?? '';
header("Location: lich-su-don-hang.html" . ($queryString !== '' ? '?' . $queryString : ''));
exit;

$user_id = $_SESSION['user_id'];

// Xử lý bộ lọc
$search = $_GET['search'] ?? '';
$status = $_GET['status'] ?? '';
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit = 10;
$offset = ($page - 1) * $limit;
if ($page < 1)
    $page = 1;

// 1. Đếm tổng số bản ghi
$count_sql = "SELECT COUNT(*) as total FROM orders WHERE user_id = ?";
$sql = "SELECT * FROM orders WHERE user_id = ?";
$params = [$user_id];
$types = "i";

if (!empty($search)) {
    $condition = " AND (order_code LIKE ? OR receiver_name LIKE ? OR receiver_phone LIKE ?)";
    $sql .= $condition;
    $count_sql .= $condition;
    $searchTerm = "%$search%";
    array_push($params, $searchTerm, $searchTerm, $searchTerm);
    $types .= "sss";
}
if (!empty($status)) {
    $condition = " AND status = ?";
    $sql .= $condition;
    $count_sql .= $condition;
    $params[] = $status;
    $types .= "s";
}
if (!empty($date_from) && !empty($date_to)) {
    $condition = " AND DATE(created_at) BETWEEN ? AND ?";
    $sql .= $condition;
    $count_sql .= $condition;
    array_push($params, $date_from, $date_to);
    $types .= "ss";
}

// Thực hiện đếm
$stmt_count = $conn->prepare($count_sql);
$stmt_count->bind_param($types, ...$params);
$stmt_count->execute();
$total_records = $stmt_count->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);
$stmt_count->close();

// 2. Lấy dữ liệu phân trang
$sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Lịch sử đơn hàng | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/styles.css?v=<?php echo time(); ?>">
    <style>
        /* Force Filter Bar to 1 line on desktop */
        .filter-bar {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 10px !important;
            align-items: center !important;
        }

        .filter-bar input,
        .filter-bar select,
        .filter-bar button,
        .filter-bar a.btn-filter {
            width: auto !important;
            margin-bottom: 0 !important;
            flex: 1;
        }

        .filter-bar input[name="search"] {
            flex: 2.5 !important;
            min-width: 180px;
        }

        .filter-bar select[name="status"] {
            flex: 1.2 !important;
            min-width: 140px;
        }

        .filter-bar input[type="date"] {
            flex: 1 !important;
            min-width: 120px;
        }

        .filter-bar .btn-filter {
            flex: 0 0 auto !important;
            padding: 10px 20px !important;
            line-height: 1.5;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        @media (max-width: 768px) {
            .filter-bar {
                flex-wrap: wrap !important;
            }

            .filter-bar input[type="text"],
            .filter-bar select,
            .filter-bar input[type="date"] {
                flex: 1 1 calc(50% - 10px) !important;
            }

            .filter-bar .btn-filter {
                flex: 1 1 auto !important;
            }
        }
    </style>
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_user.php'; ?>

    <main class="container" style="padding: 40px 20px; min-height: 60vh;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="section-title" style="margin-bottom:0; font-size: 28px;">Lịch sử đơn hàng</h2>
            <a href="dashboard.php" class="btn-secondary"
                style="color:#0a2a66; border-color:#0a2a66; padding: 8px 16px;">← Quay lại</a>
        </div>

        <!-- Bộ lọc -->
        <form class="filter-bar" method="GET">
            <input type="text" name="search" placeholder="Mã đơn, Tên người nhận..."
                value="<?php echo htmlspecialchars($search); ?>">
            <select name="status">
                <option value="">-- Tất cả trạng thái --</option>
                <option value="pending" <?php if ($status == 'pending')
                    echo 'selected'; ?>>Chờ xử lý</option>
                <option value="shipping" <?php if ($status == 'shipping')
                    echo 'selected'; ?>>Đang giao</option>
                <option value="completed" <?php if ($status == 'completed')
                    echo 'selected'; ?>>Hoàn tất</option>
                <option value="cancelled" <?php if ($status == 'cancelled')
                    echo 'selected'; ?>>Đã hủy</option>
            </select>
            <input type="date" name="date_from" value="<?php echo $date_from; ?>" title="Từ ngày">
            <input type="date" name="date_to" value="<?php echo $date_to; ?>" title="Đến ngày">
            <button type="submit" class="btn-filter">Lọc</button>
            <a href="order_history.php" class="btn-filter"
                style="background:#6c757d; text-decoration:none; text-align:center;">Reset</a>
        </form>

        <div class="table-responsive">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Mã đơn</th>
                        <th>Người nhận</th>
                        <th>Lộ trình</th>
                        <th>Phí ship</th>
                        <th>Thu hộ (COD)</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($result->num_rows > 0): ?>
                        <?php while ($row = $result->fetch_assoc()): ?>
                            <tr>
                                <td><strong style="color:#0a2a66;"><?php echo htmlspecialchars($row['order_code']); ?></strong>
                                </td>
                                <td>
                                    <strong><?php echo htmlspecialchars($row['receiver_name']); ?></strong><br>
                                    <small style="color:#666;"><?php echo htmlspecialchars($row['receiver_phone']); ?></small>
                                </td>
                                <td>
                                    <div style="font-size:13px; margin-bottom:4px;">🚩 <strong>Lấy:</strong>
                                        <?php echo htmlspecialchars($row['pickup_address']); ?></div>
                                    <div style="font-size:13px;">🏁 <strong>Giao:</strong>
                                        <?php echo htmlspecialchars($row['delivery_address']); ?></div>
                                </td>
                                <td style="color:#d9534f; font-weight:bold;"><?php echo number_format($row['shipping_fee']); ?>đ
                                </td>
                                <td><?php echo number_format($row['cod_amount']); ?>đ</td>
                                <td>
                                    <?php
                                    $st = $row['status'];
                                    $class = 'status-' . $st;
                                    $label = match ($st) {
                                        'pending' => 'Chờ xử lý',
                                        'shipping' => 'Đang giao',
                                        'completed' => 'Hoàn tất',
                                        'cancelled' => 'Đã hủy',
                                        default => $st
                                    };
                                    ?>
                                    <span class="status-badge <?php echo $class; ?>"><?php echo $label; ?></span>
                                </td>
                                <td><?php echo date('d/m/Y H:i', strtotime($row['created_at'])); ?></td>
                                <td>
                                    <a href="customer_order_detail.php?id=<?php echo $row['id']; ?>"
                                        class="btn-sm btn-outline">Chi tiết</a>
                                    
                                    <?php if ($row['status'] === 'pending'): ?>
                                        <button onclick="openCancelModal('<?php echo $row['order_code']; ?>')" 
                                            class="btn-sm" style="background-color: white; color: #d9534f; border: 1px solid #d9534f; cursor: pointer;">
                                            Hủy đơn
                                        </button>
                                    <?php endif; ?>

                                    <a href="../../dat-lich-giao-hang-nhanh.html?reorder_id=<?php echo $row['id']; ?>" class="btn-sm btn-outline"
                                        style="border-color:#ff7a00; color:#ff7a00;">Đặt lại</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="8" style="text-align:center; padding:40px; color:#666;">Không tìm thấy đơn hàng
                                nào.
                                <a href="index.php#contact" style="color:#ff7a00;">Tạo đơn ngay</a>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <!-- Phân trang -->
        <?php if ($total_pages > 1): ?>
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 5px;">
                <?php
                $qs = "&search=" . urlencode($search) . "&status=" . urlencode($status) . "&date_from=" . urlencode($date_from) . "&date_to=" . urlencode($date_to);
                ?>
                <?php if ($page > 1): ?>
                    <a href="?page=<?php echo $page - 1; ?><?php echo $qs; ?>" class="btn-sm btn-outline"
                        style="font-size:14px;">&laquo; Trước</a>
                <?php endif; ?>

                <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                    <a href="?page=<?php echo $i; ?><?php echo $qs; ?>" class="btn-sm btn-outline"
                        style="font-size:14px; <?php echo ($i == $page) ? 'background:#0a2a66; color:white;' : ''; ?>"><?php echo $i; ?></a>
                <?php endfor; ?>

                <?php if ($page < $total_pages): ?>
                    <a href="?page=<?php echo $page + 1; ?><?php echo $qs; ?>" class="btn-sm btn-outline"
                        style="font-size:14px;">Sau &raquo;</a>
                <?php endif; ?>
            </div>
            <p style="text-align: center; margin-top: 10px; font-size: 14px; color: #666;">Trang
                <?php echo $page; ?>/<?php echo $total_pages; ?>
            </p>
        <?php endif; ?>
    </main>

    <!-- Modal Hủy Đơn Hàng -->
    <div id="cancel-modal" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.5);">
        <div class="modal-content" style="background-color:#fff; margin:10% auto; padding:20px; border:1px solid #888; width:90%; max-width:400px; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#d9534f;">⚠️ Hủy Đơn Hàng</h3>
                <span class="close" onclick="closeCancelModal()" style="color:#aaa; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
            </div>
            
            <p style="margin-bottom:15px;">Bạn có chắc chắn muốn hủy đơn hàng này? Thao tác này không thể hoàn tác.</p>
            
            <label for="cancel-reason" style="display:block; margin-bottom:8px; font-weight:600;">Lý do hủy:</label>
            <select id="cancel-reason" onchange="handleReasonChange(this)" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:4px;">
                <option value="" disabled selected>-- Chọn lý do --</option>
                <option value="Thay đổi kế hoạch">Thay đổi kế hoạch</option>
                <option value="Tìm đước đơn vị vận chuyển khác">Tìm được đơn vị vận chuyển khác</option>
                <option value="Sai thông tin người nhận/địa chỉ">Sai thông tin người nhận/địa chỉ</option>
                <option value="other">Lý do khác...</option>
            </select>
            
            <input type="text" id="other-reason-input" placeholder="Nhập lý do của bạn..." style="display:none; width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:4px;">
            
            <div style="text-align:right; margin-top:20px;">
                <button onclick="closeCancelModal()" class="btn-secondary" style="margin-right:10px; padding:8px 16px;">Đóng</button>
                <button id="confirm-cancel-btn" onclick="confirmCancelOrder()" class="btn-primary" style="background-color:#d9534f; border:none; padding:8px 16px;">Xác nhận hủy đơn</button>
            </div>
        </div>
    </div>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>

</body>

</html>

