<?php
// Lấy tên file hiện tại để active menu
$currentPage = basename($_SERVER['PHP_SELF']);
?>

<aside class="sidebar">
    <h2>🧹 VỆ SINH CARE</h2>

    <a href="dashboard.php"
       class="<?= $currentPage == 'dashboard.php' ? 'active' : '' ?>">
        📊 Dashboard
    </a>

    <a href="orders.php"
       class="<?= $currentPage == 'orders.php' ? 'active' : '' ?>">
        📋 Quản lý duyệt đơn
    </a>


    <a href="bookings.php" class="<?= $currentPage == 'bookings.php' ? 'active' : '' ?>">
        📋 Danh sách đơn 
    </a>

    <a href="invoices.php" class="<?= $currentPage == 'invoices.php' ? 'active' : '' ?>">
        🧾 Hóa đơn
    </a>

    <a href="statistics.php"
       class="<?= $currentPage == 'statistics.php' ? 'active' : '' ?>">
        📈 Thống kê
    </a>

    <a href="logout.php">🚪 Đăng xuất</a>
</aside>
