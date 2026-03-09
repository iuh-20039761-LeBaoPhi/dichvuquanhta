<?php
function renderHeader($title = "MamaCore - Chăm Sóc Mẹ và Bé Chuyên Nghiệp") {
    // 1. Kết nối database ngay trong hàm để lấy danh mục
require_once '../config/database.php';
    $db = new Database();
    $conn = $db->getConnection();
    
    $categories = [];
    try {
        // Lấy danh sách các danh mục đang hoạt động
        $catStmt = $conn->prepare("SELECT id, name FROM service_category WHERE status = 1 ORDER BY id ASC");
        $catStmt->execute();
        $categories = $catStmt->fetchAll();
    } catch (PDOException $e) {
        // Xử lý lỗi nếu cần
    }
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($title); ?></title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="/MamaCore/CSS/style.css">
    <style>
        /* Đảm bảo dropdown hiển thị mượt và đúng màu của MamaCore */
        .dropdown-item:hover {
            background-color: #FFF3F7;
            color: #F06292 !important;
        }
        .dropdown-toggle::after {
            vertical-align: middle;
        }
    </style>
</head>
<body>
<div style="font-family: 'Quicksand', sans-serif;">

<nav class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3" href="../index.php" style="color: #F06292;">
            <i class="fas fa-heart"></i>
            <span>MamaCore</span>
        </a>
        
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse justify-content-end" id="navMenu">
            <ul class="navbar-nav align-items-center gap-3">
                <li class="nav-item"><a class="nav-link fw-bold px-3" href="../index.php">Trang Chủ</a></li>
                <li class="nav-item"><a class="nav-link fw-bold px-3" href="about.php">Giới Thiệu</a></li>
                
                <li class="nav-item dropdown">
                    <a class="nav-link fw-bold px-3 dropdown-toggle" href="service.php" id="navDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Dịch Vụ
                    </a>
                    <ul class="dropdown-menu border-0 shadow-sm" aria-labelledby="navDropdown">
                        <li><a class="dropdown-item py-2 fw-bold" href="service.php">Tất cả dịch vụ</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <?php if (!empty($categories)): ?>
                            <?php foreach ($categories as $cat): ?>
                                <li>
                                    <a class="dropdown-item py-2" href="service.php?cat=<?php echo $cat['id']; ?>">
                                        <?php echo htmlspecialchars($cat['name']); ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </ul>
                </li>

                <li class="nav-item"><a class="nav-link fw-bold px-3" href="contact.php">Liên Hệ</a></li>
                <li class="nav-item ms-lg-3">
                    <a href="contact.php" class="btn text-white rounded-pill px-4 py-2 shadow-sm" style="background-color:#F06292;" onmouseover="this.style.backgroundColor='#d84374'; this.style.transform='scale(1.05)';"
                        onmouseout="this.style.backgroundColor='#F06292'; this.style.transform='scale(1)';">Đặt Lịch Tư Vấn</a>
                </li>
            </ul>
        </div>
    </div>
</nav>
<main>
<?php
}
?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function () {
    const currentPath = window.location.pathname.split("/").pop();

    document.querySelectorAll(".nav-link:not(.dropdown-toggle)").forEach(link => {
        const linkPath = link.getAttribute("href").split("/").pop();
        if (linkPath === currentPath) {
            link.style.color = "#F06292";
            link.style.fontWeight = "bold";
        }
    });
});
</script>