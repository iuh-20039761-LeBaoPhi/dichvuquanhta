<?php
session_start();

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: login.php");
    exit;
}

$shipper_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hồ sơ Shipper | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .shipper-profile-card {
            background: linear-gradient(135deg, #0a2a66 0%, #1e3a8a 100%);
            border-radius: 20px;
            padding: 40px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 30px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
            min-height: 180px;
        }
        .shipper-profile-card::after {
            content: "\f48b";
            font-family: "Font Awesome 6 Free";
            font-weight: 900;
            position: absolute;
            right: -20px;
            bottom: -20px;
            font-size: 150px;
            opacity: 0.1;
            transform: rotate(-15px);
        }
        .shipper-avatar {
            width: 100px;
            height: 100px;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-radius: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: 800;
            border: 2px solid rgba(255,255,255,0.3);
            flex-shrink: 0;
        }
        .loading-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            border-radius: 20px;
        }
        .error-message {
            background: #fee2e2;
            color: #b91c1c;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid #fecaca;
            display: none;
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container" id="main-content">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ hiệu suất Shipper</h2>
            <a href="users_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Danh sách thành viên</a>
        </div>

        <div id="error-box" class="error-message"></div>

        <div id="shipper-content" style="opacity: 0; transition: opacity 0.3s;">
            <div class="shipper-profile-card">
                <div class="shipper-avatar" id="shipper-avatar-init">S</div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                        <h2 id="shipper-name" style="margin: 0; font-size: 28px;">Đang tải...</h2>
                        <span id="shipper-status" class="status-badge"></span>
                    </div>
                    <div style="display: flex; gap: 20px; font-size: 14px; opacity: 0.9; flex-wrap: wrap;">
                        <span><i class="fa-solid fa-user-tag"></i> ID: #<span id="shipper-id-val"></span></span>
                        <span><i class="fa-solid fa-phone"></i> <span id="shipper-phone"></span></span>
                        <span><i class="fa-solid fa-envelope"></i> <span id="shipper-email"></span></span>
                        <span><i class="fa-solid fa-calendar-check"></i> Tham gia: <span id="shipper-joined"></span></span>
                    </div>
                </div>
                <div style="text-align: right; background: rgba(255,255,255,0.1); padding: 15px 25px; border-radius: 15px; backdrop-filter: blur(5px);">
                    <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; margin-bottom: 5px;">Phương tiện gắn liền</div>
                    <div style="font-size: 20px; font-weight: 800; color: #ff7a00;">
                        <i id="vehicle-icon" class="fa-solid fa-motorcycle"></i>
                        <span id="vehicle-name">CHƯA GÁN</span>
                    </div>
                </div>
            </div>

            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="stat-card" style="border-bottom: 4px solid #0a2a66;">
                    <div style="color: #0a2a66; font-size: 12px; font-weight: 700; text-transform: uppercase;">Tổng đơn nhận</div>
                    <div id="stat-total-orders" style="font-size: 28px; font-weight: 800; margin: 10px 0;">0</div>
                    <div style="font-size: 11px; color: #64748b;">Từ ngày bắt đầu</div>
                </div>
                <div class="stat-card" style="border-bottom: 4px solid #10b981;">
                    <div style="color: #10b981; font-size: 12px; font-weight: 700; text-transform: uppercase;">Giao thành công</div>
                    <div id="stat-completed-orders" style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #10b981;">0</div>
                    <div id="stat-success-rate" style="font-size: 11px; color: #64748b;">Tỷ lệ: 0%</div>
                </div>
                <div class="stat-card" style="border-bottom: 4px solid #3b82f6;">
                    <div style="color: #3b82f6; font-size: 12px; font-weight: 700; text-transform: uppercase;">Xếp hạng</div>
                    <div style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #3b82f6;">
                        <span id="stat-avg-rating">0</span> <span style="font-size: 18px;">★</span>
                    </div>
                    <div id="stat-count-rating" style="font-size: 11px; color: #64748b;">0 lượt đánh giá</div>
                </div>
                <div class="stat-card" style="border-bottom: 4px solid #f59e0b;">
                    <div style="color: #f59e0b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Điểm thưởng</div>
                    <div id="stat-bonus-points" style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #f59e0b;">+0</div>
                    <div id="stat-tier" style="font-size: 11px; color: #64748b;">Hạng: -</div>
                </div>
            </div>

            <div class="dashboard-layout" style="grid-template-columns: 1fr; margin-top: 30px;">
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-star"></i> Đánh giá khách hàng gần đây</h3>
                    </div>
                    <div id="feedback-list" style="display: grid; gap: 15px;">
                        <!-- Feedback items will be here -->
                    </div>
                </div>
            </div>
        </div>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script>
        (function() {
            const shipperId = <?php echo $shipper_id; ?>;
            const apiUrl = `../api/shipper_detail.php?id=${shipperId}`;
            
            const content = document.getElementById('shipper-content');
            const errorBox = document.getElementById('error-box');

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            function formatDate(dateStr) {
                if (!dateStr) return 'N/A';
                const date = new Date(dateStr);
                return date.toLocaleDateString('vi-VN');
            }

            async function loadShipperDetail() {
                if (shipperId <= 0) {
                    showError("ID Shipper không hợp lệ.");
                    return;
                }

                try {
                    const response = await fetch(apiUrl);
                    const result = await response.json();

                    if (!result.success) {
                        showError(result.message || "Không thể tải thông tin shipper.");
                        return;
                    }

                    renderData(result.data);
                } catch (error) {
                    showError("Lỗi kết nối máy chủ.");
                    console.error(error);
                }
            }

            function showError(msg) {
                errorBox.textContent = msg;
                errorBox.style.display = 'block';
                content.style.opacity = '0';
            }

            function renderData(data) {
                const s = data.shipper;
                const m = data.metrics;
                const f = data.feedbacks;

                // Profile Header
                document.getElementById('shipper-avatar-init').textContent = (s.username || 'S').charAt(0).toUpperCase();
                document.getElementById('shipper-name').textContent = s.fullname;
                document.getElementById('shipper-id-val').textContent = s.id;
                document.getElementById('shipper-phone').textContent = s.phone;
                document.getElementById('shipper-email').textContent = s.email;
                document.getElementById('shipper-joined').textContent = formatDate(s.created_at);
                
                const statusBadge = document.getElementById('shipper-status');
                if (s.is_locked) {
                    statusBadge.textContent = "Đã khóa";
                    statusBadge.style.cssText = "background:#ef4444; color:#fff;";
                } else {
                    statusBadge.textContent = "Hoạt động";
                    statusBadge.style.cssText = "background:#10b981; color:#fff;";
                }

                document.getElementById('vehicle-name').textContent = (s.vehicle_type || 'CHƯA GÁN').toUpperCase();
                const vIcon = document.getElementById('vehicle-icon');
                if ((s.vehicle_type || '').toLowerCase().includes('tải')) {
                    vIcon.className = "fa-solid fa-truck";
                } else {
                    vIcon.className = "fa-solid fa-motorcycle";
                }

                // Metrics
                document.getElementById('stat-total-orders').textContent = Number(m.total_orders).toLocaleString('vi-VN');
                document.getElementById('stat-completed-orders').textContent = Number(m.completed_orders).toLocaleString('vi-VN');
                document.getElementById('stat-success-rate').textContent = `Tỷ lệ: ${m.success_rate}%`;
                document.getElementById('stat-avg-rating').textContent = m.avg_rating;
                document.getElementById('stat-count-rating').textContent = `${m.count_rating} lượt đánh giá`;
                document.getElementById('stat-bonus-points').textContent = `+${m.bonus_points}`;
                document.getElementById('stat-tier').textContent = `Hạng: ${m.tier}`;

                // Feedbacks
                const fList = document.getElementById('feedback-list');
                if (f.length === 0) {
                    fList.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">Chưa có phản hồi nào cho shipper này.</div>';
                } else {
                    fList.innerHTML = f.map(item => `
                        <div style="padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <div style="font-weight: 700; color: #0a2a66;">${escapeHtml(item.customer_name)}</div>
                                <div style="color: #ffb800; font-size: 14px;">
                                    ${'<i class="fa-solid fa-star"></i>'.repeat(item.rating)}${'<i class="fa-regular fa-star"></i>'.repeat(5 - item.rating)}
                                </div>
                            </div>
                            <div style="font-size: 14px; color: #475569; font-style: italic; margin-bottom: 10px;">"${escapeHtml(item.feedback)}"</div>
                            <div style="font-size:11px; color: #94a3b8; display: flex; justify-content: space-between;">
                                <span>Mã đơn: #${escapeHtml(item.order_code)}</span>
                                <span>Ngày: ${formatDate(item.created_at)}</span>
                            </div>
                        </div>
                    `).join('');
                }

                content.style.opacity = '1';
                document.title = `Hồ sơ Shipper: ${s.fullname} | Admin`;
            }

            loadShipperDetail();
        })();
    </script>
</body>
</html>



