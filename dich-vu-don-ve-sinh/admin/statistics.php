<?php
require_once "auth.php";
require_once "../main/db.php";

/* Thống kê theo trạng thái */
$statusStats = $conn->query("
    SELECT status, COUNT(*) as total
    FROM bookings
    GROUP BY status
");

/* Thống kê theo ngày (7 ngày gần nhất) */
$dailyStats = $conn->query("
    SELECT booking_date, COUNT(*) as total
    FROM bookings
    GROUP BY booking_date
    ORDER BY booking_date DESC
    LIMIT 7
");

$labels = [];
$data = [];

while ($row = $dailyStats->fetch_assoc()) {
    $labels[] = $row['booking_date'];
    $data[] = $row['total'];
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Thống kê</title>
    <link rel="stylesheet" href="../admin/layout/admin.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="admin-page">

<div class="admin-layout">

    <!-- SIDEBAR -->
    <?php require_once "../admin/layout/sidebar.php"; ?>


    <!-- MAIN -->
    <main class="main-content">
        <h1>📈 Thống kê hệ thống</h1>

        <!-- ===== STAT CARDS ===== -->
        <div class="stats">
            <?php while ($s = $statusStats->fetch_assoc()): ?>
            <div class="stat-card <?= $s['status'] ?>">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <h3><?= $s['total'] ?></h3>
                    <p><?= strtoupper($s['status']) ?></p>
                    <span>Số lượng đơn</span>
                </div>
            </div>
            <?php endwhile; ?>
        </div>

        <!-- ===== CHART ===== -->
        <div class="table-card" style="margin-top:40px;">
            <h2>📅 Đơn hàng theo ngày</h2>
            <canvas id="orderChart" height="100"></canvas>
        </div>

    </main>
</div>

<script>
const ctx = document.getElementById('orderChart');

new Chart(ctx, {
    type: 'line',
    data: {
        labels: <?= json_encode(array_reverse($labels)) ?>,
        datasets: [{
            label: 'Số đơn',
            data: <?= json_encode(array_reverse($data)) ?>,
            tension: 0.4,
            fill: true,
        }]
    },
    options: {
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});
</script>

</body>
</html>
