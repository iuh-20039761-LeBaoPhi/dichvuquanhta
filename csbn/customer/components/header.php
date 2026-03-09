<?php
function renderHeader($title = "MediCare - Dịch Vụ Chăm Sóc Bệnh Nhân Chuyên Nghiệp") {
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($title); ?></title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="CSS/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&family=Roboto:wght@700&display=swap" rel="stylesheet">
</head>
<body>

    <div style="font-family: 'Quicksand', sans-serif;">

    <nav class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
        <div class="container">
            <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3" href="index.php" style="color: #007bff;">
                <i class="fas fa-hand-holding-medical"></i>
                <span>MediCare</span>
            </a>

            <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse justify-content-end" id="navMenu">
                <ul class="navbar-nav align-items-center gap-3">
                    <li class="nav-item"><a class="nav-link fw-bold px-3 " href="../index.php">Trang Chủ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3 " href="about.php">Giới Thiệu</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3"  href="services.php">Dịch Vụ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="contact.php">Liên Hệ</a></li>
                    <li class="nav-item ms-lg-3">
                        <a href="contact.php" class="btn text-white rounded-pill px-4 py-2 shadow-sm" style="background-color:#007bff;">Đăng Ký Chăm Sóc</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
<main>
<?php
}
?>
<script>
document.addEventListener("DOMContentLoaded", function () {
    const currentPath = window.location.pathname.split("/").pop();

    document.querySelectorAll(".nav-link").forEach(link => {
        const linkPath = link.getAttribute("href").split("/").pop();

        if (linkPath === currentPath) {
            link.style.color = "#007bff";
            link.style.fontSize = "larger";
        }
    });
});
</script>
