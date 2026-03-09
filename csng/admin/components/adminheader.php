<?php
// ==================== ADMIN HEADER ====================
// Usage:
// require_once 'AdminHeader.php';
// renderAdminHeader('Dashboard', $currentUser);

if (!function_exists('renderAdminHeader')) {
    function renderAdminHeader(string $title = 'Admin', array $currentUser = [])
    {
        ?>
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title><?= htmlspecialchars($title) ?> | Admin</title>

            <!-- Tailwind CSS -->
            <script src="https://cdn.tailwindcss.com"></script>
            
            <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
            <!-- Font Awesome -->
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <!-- Font -->
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #f5f6fa;
                }
            </style>
        </head>

        <body>
        <!-- TOP BAR -->
        <nav class="navbar navbar-dark bg-danger shadow-sm">
            <div class="container-fluid">
                <span class="navbar-brand mb-0 h5">❤️ ElderlyCare Admin</span>
                <div class="d-flex align-items-center gap-3">
                    <span class="text-white">Xin chào, <strong><?php echo htmlspecialchars($currentUser['full_name'] ?? $currentUser['username']); ?></strong></span>
                    <a href="../logout.php" class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sign-out-alt"></i> Đăng xuất
                    </a>
                </div>
            </div>
        </nav>
        <?php
    }
}
?>