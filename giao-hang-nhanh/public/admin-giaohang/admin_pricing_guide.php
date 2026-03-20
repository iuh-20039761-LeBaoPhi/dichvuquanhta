<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

// Lấy giá cơ bản từ DB để hiển thị tham chiếu
$services = [];
$res = $conn->query("SELECT * FROM services ORDER BY base_price ASC");
if ($res)
    while ($row = $res->fetch_assoc())
        $services[] = $row;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hướng dẫn tính phí | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Cơ chế tính giá vận chuyển</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <div class="dashboard-layout" style="grid-template-columns: 1fr 400px; gap: 30px;">
            <div style="display: flex; flex-direction: column; gap: 30px;">
                <!-- Card 1: Công thức -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-calculator"></i> Công thức tổng quát</h3>
                    </div>
                    <div style="background: rgba(10, 42, 102, 0.05); border-left: 5px solid #0a2a66; padding: 20px; border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 700; color: #0a2a66; display: flex; align-items: center; gap: 15px;">
                        <i class="fa-solid fa-equals" style="font-size: 24px;"></i>
                        <div>Tổng phí = Giá cơ bản + Phí vùng + Phí cân nặng + Phí COD</div>
                    </div>
                    <p style="margin-top: 15px; color: #64748b; font-size: 14px;">Hệ thống tự động đồng bộ giá dựa trên các cấu hình dịch vụ và địa lý thực tế.</p>
                </div>

                <!-- Card 2: Chi tiết bảng phí -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3><i class="fa-solid fa-list-check"></i> Chi tiết các tham số phí</h3>
                    </div>
                    
                    <h4 style="color: #0a2a66; margin-bottom: 15px; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">A. Giá dịch vụ cơ bản (Base Price)</h4>
                    <div class="table-responsive">
                        <table class="order-table" style="margin-bottom: 30px;">
                            <thead>
                                <tr>
                                    <th>Tên dịch vụ</th>
                                    <th>Cước cơ bản</th>
                                    <th>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($services as $s): ?>
                                    <tr>
                                        <td style="font-weight: 700; color: #0a2a66;"><?php echo $s['name']; ?></td>
                                        <td style="font-weight: 800; color: #ff7a00; font-size: 16px;"><?php echo number_format($s['base_price']); ?>đ</td>
                                        <td style="font-size: 12px; color: #64748b;">Áp dụng cho bưu kiện dưới 2kg nội thành.</td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <h4 style="color: #0a2a66; margin-bottom: 15px; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">B. Phí vùng miền (Region Surcharge)</h4>
                    <div class="table-responsive">
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Tuyến đường</th>
                                    <th>Phụ phí</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Nội thành ➔ Nội thành</td><td>+0đ</td></tr>
                                <tr><td>Nội thành ➔ Ngoại thành (hoặc ngược lại)</td><td style="color:#d9534f; font-weight:700;">+15.000đ</td></tr>
                                <tr><td>Ngoại thành ➔ Ngoại thành</td><td style="color:#d9534f; font-weight:700;">+20.000đ</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="background: #f1f5f9; padding: 15px; margin-top: 15px; font-size: 13px; border-radius: 10px; color: #475569; border: 1px solid #e2e8f0;">
                        <i class="fa-solid fa-circle-info" style="color: #0a2a66;"></i> <strong>Ghi chú:</strong><br>
                        - <strong>Nội thành:</strong> Q1, Q3, Q4, Q5, Q6, Q10, Q11, Phú Nhuận, Bình Thạnh, Gò Vấp, Tân Bình, Tân Phú.<br>
                        - <strong>Ngoại thành:</strong> Các quận huyện còn lại của TP.HCM và các tỉnh khác.
                    </div>
                </div>
            </div>

            <aside>
                <div class="admin-card" style="position: sticky; top: 100px; border-top: 5px solid #ff7a00; background: #fffaf0;">
                    <h3 style="color:#ff7a00; margin-bottom:20px;"><i class="fa-solid fa-microchip"></i> Máy tính cước thử</h3>
                    <p style="font-size:13px; color:#666; margin-bottom:20px;">Dùng để kiểm tra nhanh mức cước hệ thống sẽ báo cho khách hàng.</p>

                    <form onsubmit="calculateSim(event)" style="display: flex; flex-direction: column; gap: 15px;">
                        <div class="form-group">
                            <label>Địa điểm đi (Quận)</label>
                            <input type="text" id="sim-from" placeholder="VD: Quận 1" value="Quận 1" class="admin-input">
                        </div>
                        <div class="form-group">
                            <label>Địa điểm đến (Quận)</label>
                            <input type="text" id="sim-to" placeholder="VD: Củ Chi" value="Củ Chi" class="admin-input">
                        </div>
                        <div class="form-group">
                            <label>Loại dịch vụ</label>
                            <select id="sim-service" class="admin-select">
                                <?php foreach ($services as $s): ?>
                                    <option value="<?php echo $s['type_key']; ?>" data-price="<?php echo $s['base_price']; ?>">
                                        <?php echo $s['name']; ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Khối lượng (kg)</label>
                            <input type="number" id="sim-weight" value="1" min="0" step="0.1" class="admin-input">
                        </div>
                        <div class="form-group">
                            <label>Tiền thu hộ (COD)</label>
                            <input type="number" id="sim-cod" value="0" min="0" step="1000" class="admin-input">
                        </div>
                        <button type="submit" class="btn-primary" style="width:100%; justify-content: center; background: #ff7a00;">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Tính cước dự kiến
                        </button>
                    </form>

                    <div id="sim-result" style="display:none; margin-top: 25px; padding: 20px; background: #0a2a66; border-radius: 15px; color: #fff; text-align: center;">
                        <div style="font-size:12px; opacity:0.8; text-transform: uppercase; margin-bottom: 5px;">Ước tính cước phí</div>
                        <div style="font-size:32px; font-weight:800;" id="total-display">0đ</div>
                        <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; text-align: left;">
                            <div>Base: <span id="detail-base" style="font-weight: 700;">0</span></div>
                            <div>Region: <span id="detail-region" style="font-weight: 700;">0</span></div>
                            <div>Weight: <span id="detail-weight" style="font-weight: 700;">0</span></div>
                            <div>COD Fee: <span id="detail-cod" style="font-weight: 700;">0</span></div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>

    <script>
        const districtGroups = {
            inner: ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 10", "Quận 11", "Phú Nhun", "Bình Thạnh", "Gò Vấp", "Tân Bình", "Tân Phú"],
            outer: ["Quận 2", "Quận 7", "Quận 8", "Quận 9", "Quận 12", "Thủ Đức", "Bình Tân", "Hóc Môn", "Bình Chánh", "Nhà Bè", "Củ Chi", "Cần Giờ"]
        };

        function calculateSim(e) {
            e.preventDefault();
            const from = document.getElementById('sim-from').value.trim();
            const to = document.getElementById('sim-to').value.trim();
            const weight = parseFloat(document.getElementById('sim-weight').value) || 0;
            const cod = parseFloat(document.getElementById('sim-cod').value) || 0;
            const serviceSelect = document.getElementById('sim-service');
            const basePrice = parseFloat(serviceSelect.options[serviceSelect.selectedIndex].dataset.price) || 0;

            const isFromOuter = districtGroups.outer.some(d => from.toLowerCase().includes(d.toLowerCase()));
            const isToOuter = districtGroups.outer.some(d => to.toLowerCase().includes(d.toLowerCase()));

            let regionFee = 0;
            if (isFromOuter && isToOuter) regionFee = 20000;
            else if (isFromOuter || isToOuter) regionFee = 15000;

            let weightFee = Math.max(0, Math.ceil(weight - 2) * 5000);
            let codFee = cod > 0 ? Math.max(5000, cod * 0.01) : 0;

            const total = basePrice + regionFee + weightFee + codFee;

            document.getElementById('total-display').innerText = total.toLocaleString() + 'đ';
            document.getElementById('detail-base').innerText = basePrice.toLocaleString();
            document.getElementById('detail-region').innerText = regionFee.toLocaleString();
            document.getElementById('detail-weight').innerText = weightFee.toLocaleString();
            document.getElementById('detail-cod').innerText = codFee.toLocaleString();
            document.getElementById('sim-result').style.display = 'block';
        }
    </script>
</body>
</html>

