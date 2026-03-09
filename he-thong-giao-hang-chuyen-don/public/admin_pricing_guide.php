<?php
session_start();
require_once __DIR__ . '/../config/db.php';

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
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">📖 Cơ chế tính giá vận chuyển</h2>
            <a href="services_manage.php" class="back-link">← Quản lý Dịch vụ</a>
        </div>

        <div class="guide-grid">
            <!-- CỘT TRÁI: LÝ THUYẾT -->
            <div>
                <div class="guide-card">
                    <h3 style="color:#0a2a66; margin-bottom:15px;">1. Công thức tổng quát</h3>
                    <div class="formula-box">
                        Tổng phí = Giá cơ bản + Phí vùng miền + Phí cân nặng + Phí COD
                    </div>
                    <p>Hệ thống tự động tính toán dựa trên 4 yếu tố trên. Dưới đây là chi tiết từng thành phần:</p>
                </div>

                <div class="guide-card">
                    <h3 style="color:#0a2a66; margin-bottom:15px;">2. Chi tiết các loại phí</h3>

                    <h4 style="margin-top:20px;">A. Giá cơ bản (Base Price)</h4>
                    <p style="font-size:13px; color:#666;">Lấy từ trang "Quản lý dịch vụ".</p>
                    <table class="param-table">
                        <thead>
                            <tr>
                                <th>Dịch vụ</th>
                                <th>Mã (Key)</th>
                                <th>Giá hiện tại</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($services as $s): ?>
                                <tr>
                                    <td>
                                        <?php echo $s['name']; ?>
                                    </td>
                                    <td><code><?php echo $s['type_key']; ?></code></td>
                                    <td class="highlight">
                                        <?php echo number_format($s['base_price']); ?>đ
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>

                    <h4 style="margin-top:20px;">B. Phí vùng miền (Region Fee)</h4>
                    <p style="font-size:13px; color:#666;">Dựa trên Quận/Huyện đi và đến (Cấu hình cứng trong hệ thống).
                    </p>
                    <table class="param-table">
                        <thead>
                            <tr>
                                <th>Tuyến đường</th>
                                <th>Phụ phí</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Nội thành ➔ Nội thành</td>
                                <td>+0đ</td>
                            </tr>
                            <tr>
                                <td>Nội thành ➔ Ngoại thành (hoặc ngược lại)</td>
                                <td class="highlight">+15.000đ</td>
                            </tr>
                            <tr>
                                <td>Ngoại thành ➔ Ngoại thành</td>
                                <td class="highlight">+20.000đ</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="background:#f9f9f9; padding:10px; margin-top:10px; font-size:13px; border-radius:4px;">
                        <strong>Nội thành:</strong> Q1, Q3, Q4, Q5, Q6, Q10, Q11, Phú Nhuận, Bình Thạnh, Gò Vấp, Tân
                        Bình, Tân Phú.<br>
                        <strong>Ngoại thành:</strong> Các quận huyện còn lại của TP.HCM.
                    </div>

                    <h4 style="margin-top:20px;">C. Phí cân nặng (Weight Fee)</h4>
                    <ul style="font-size:14px; line-height:1.6;">
                        <li>Dưới 2kg: <strong>Miễn phí</strong></li>
                        <li>Trên 2kg: <strong>+5.000đ</strong> cho mỗi kg vượt thêm.</li>
                        <li><em>Công thức: (Cân nặng - 2) * 5.000</em></li>
                    </ul>

                    <h4 style="margin-top:20px;">D. Phí thu hộ (COD Fee)</h4>
                    <ul style="font-size:14px; line-height:1.6;">
                        <li>Nếu không thu hộ: 0đ</li>
                        <li>Nếu có thu hộ: <strong>1% tiền thu hộ</strong> (Tối thiểu 5.000đ).</li>
                    </ul>
                </div>
            </div>

            <!-- CỘT PHẢI: MÔ PHỎNG -->
            <div>
                <div class="guide-card" style="position:sticky; top:20px;">
                    <h3 style="color:#ff7a00; margin-bottom:15px;">🧮 Máy tính mô phỏng</h3>
                    <p style="font-size:13px; color:#666; margin-bottom:15px;">Nhập thử dữ liệu để kiểm tra giá cước hệ
                        thống sẽ tính cho khách.</p>

                    <form class="sim-form" onsubmit="calculateSim(event)">
                        <label>Điểm đi (Quận/Huyện)</label>
                        <input type="text" id="sim-from" placeholder="VD: Quận 1" value="Quận 1">

                        <label>Điểm đến (Quận/Huyện)</label>
                        <input type="text" id="sim-to" placeholder="VD: Thủ Đức" value="Thủ Đức">

                        <label>Dịch vụ</label>
                        <select id="sim-service">
                            <?php foreach ($services as $s): ?>
                                <option value="<?php echo $s['type_key']; ?>" data-price="<?php echo $s['base_price']; ?>">
                                    <?php echo $s['name']; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>

                        <label>Cân nặng (kg)</label>
                        <input type="number" id="sim-weight" value="1" min="0" step="0.1">

                        <label>Tiền thu hộ (COD)</label>
                        <input type="number" id="sim-cod" value="0" min="0" step="1000">

                        <button type="submit" class="btn-primary" style="width:100%;">Tính thử ngay</button>
                    </form>

                    <div id="sim-result" class="sim-result">
                        <div style="font-size:14px; opacity:0.9;">Tổng cước phí</div>
                        <div style="font-size:32px; font-weight:bold;" id="total-display">0đ</div>
                        <div
                            style="font-size:12px; margin-top:10px; border-top:1px solid rgba(255,255,255,0.3); padding-top:10px; text-align:left;">
                            Base: <span id="detail-base">0</span> |
                            Vùng: <span id="detail-region">0</span> |
                            Kg: <span id="detail-weight">0</span> |
                            COD: <span id="detail-cod">0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script>
        // Định nghĩa danh sách quận (Copy logic từ main.js để đảm bảo chính xác)
        const districtGroups = {
            inner: [
                "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 10", "Quận 11",
                "Phú Nhuận", "Bình Thạnh", "Gò Vấp", "Tân Bình", "Tân Phú"
            ],
            outer: [
                "Quận 2", "Quận 7", "Quận 8", "Quận 9", "Quận 12", "Thủ Đức", "Bình Tân",
                "Hóc Môn", "Bình Chánh", "Nhà Bè", "Củ Chi", "Cần Giờ"
            ]
        };

        function calculateSim(e) {
            e.preventDefault();

            // 1. Lấy giá trị
            const from = document.getElementById('sim-from').value.trim();
            const to = document.getElementById('sim-to').value.trim();
            const weight = parseFloat(document.getElementById('sim-weight').value) || 0;
            const cod = parseFloat(document.getElementById('sim-cod').value) || 0;

            const serviceSelect = document.getElementById('sim-service');
            const basePrice = parseFloat(serviceSelect.options[serviceSelect.selectedIndex].dataset.price) || 0;

            // 2. Tính phí vùng miền
            const isFromOuter = districtGroups.outer.some(d => from.toLowerCase().includes(d.toLowerCase()));
            const isToOuter = districtGroups.outer.some(d => to.toLowerCase().includes(d.toLowerCase()));

            let regionFee = 0;
            if (isFromOuter && isToOuter) regionFee = 20000;
            else if (isFromOuter || isToOuter) regionFee = 15000;

            // 3. Tính phí cân nặng
            let weightFee = 0;
            if (weight > 2) {
                weightFee = Math.ceil(weight - 2) * 5000;
            }

            // 4. Tính phí COD
            let codFee = 0;
            if (cod > 0) {
                codFee = Math.max(5000, cod * 0.01);
            }

            // 5. Tổng
            const total = basePrice + regionFee + weightFee + codFee;

            // 6. Hiển thị
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

