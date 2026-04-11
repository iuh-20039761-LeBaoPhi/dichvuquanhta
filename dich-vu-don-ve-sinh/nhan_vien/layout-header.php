<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Nếu là AJAX request (từ SPA), không hiển thị layout header
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    return;
}

// Đảm bảo session đã được nạp
if (!isset($_SESSION['user'])) {
    ob_start();
    include_once __DIR__ . '/../session_user.php';
    ob_end_clean();
}

$userName = $_SESSION['user']['hovaten'] ?? 'Nhân viên';
$userAvatar = $_SESSION['user']['avatartenfile'] ?? 'logo_main.png';
if (strpos($userAvatar, 'assets/') === false && $userAvatar !== 'logo_main.png') {
    $userAvatar = '../assets/' . $userAvatar;
} else if ($userAvatar === 'logo_main.png') {
    $userAvatar = '../assets/logo_main.png';
}

$current_page = basename($_SERVER['PHP_SELF']);
$pageTitle = $pageTitle ?? 'MamaCore - Staff Panel';
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($pageTitle); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
        rel="stylesheet">
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <style>
        :root {
            --nv-border: #3498db;
            --nv-title: #2980b9;
            --nv-text: #1b2a3a;
            --nv-sidebar-a: #0056b3;
            --nv-sidebar-b: #007bff;
            --nv-accent: #3498db;
            --nv-sidebar-width: 260px;
            --nv-header-mobile-height: 50px;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            overflow-x: hidden;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            color: var(--nv-text);
            background: #f8fbff;
            font-weight: 400;
            line-height: 1.5;
        }

        /* Shell Container */
        .nv-admin-shell {
            display: flex;
            min-height: 100vh;
            width: 100%;
            background: #fff;
        }

        /* Sidebar - Desktop */
        .nv-admin-sidebar {
            width: var(--nv-sidebar-width);
            background: linear-gradient(180deg, var(--nv-sidebar-a), var(--nv-sidebar-b));
            color: #fff;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1050;
        }

        .nv-admin-brand-wrapper {
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nv-admin-brand {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .nv-admin-sidebar .list-group-item {
            background: transparent;
            color: rgba(255, 255, 255, 0.8);
            border: 0;
            padding: 14px 24px;
            margin: 4px 12px;
            border-radius: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .nv-admin-sidebar .list-group-item:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
        }

        .nv-admin-sidebar .list-group-item.active {
            background: #fff;
            color: var(--nv-sidebar-a);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Main Section */
        .nv-main-wrapper {
            flex-grow: 1;
            margin-left: var(--nv-sidebar-width);
            display: flex;
            flex-direction: column;
            min-width: 0;
            background: #f0f7ff;
        }

        /* Topbar */
        .nv-admin-topbar {
            height: 70px;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(52, 152, 219, 0.3);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 30px;
            position: sticky;
            top: 0;
            z-index: 1040;
        }

        .nv-admin-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #fff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        /* Content Area */
        #main-content {
            padding: 0;
            flex-grow: 2;
        }

        /* RESPONSIVE: MOBILE & IPAD */
        @media (max-width: 991.98px) {
            .nv-admin-sidebar {
                width: 100%;
                height: var(--nv-header-mobile-height);
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: auto;
                flex-direction: column;
                align-items: stretch;
                padding: 0;
                border-radius: 0;
                z-index: 1100;
                overflow: visible;
            }

            .nv-admin-brand-wrapper {
                height: var(--nv-header-mobile-height);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
                border-bottom: none;
                width: 100%;
            }

            .profile-name-text {
                font-size: 0.9rem;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            #nvSidebarMenu {
                display: none;
                flex-direction: column;
                background: linear-gradient(135deg, var(--nv-sidebar-a), var(--nv-sidebar-b));
                margin-top: 0;
                width: 100%;
                position: absolute;
                top: var(--nv-header-mobile-height);
                left: 0;
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                z-index: 1090;
            }

            .nv-admin-sidebar.menu-open #nvSidebarMenu {
                display: flex !important;
                animation: slideDown 0.3s ease-out;
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }

                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .nv-admin-sidebar .list-group-item {
                margin: 0;
                padding: 15px 25px;
                border-radius: 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .nv-admin-topbar {
                display: none !important;
            }

            .nv-main-wrapper {
                margin: 0;
                padding: 0;
                padding-top: var(--nv-header-mobile-height);
                width: 100%;
            }

            .nv-main-wrapper #main-content {
                padding: 0;
                width: 100%;
                overflow-x: hidden;
            }

            .nv-main-wrapper #main-content .container,
            .nv-main-wrapper #main-content .container-fluid {
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                max-width: 100% !important;
            }
        }

        .spinner-border.text-blue {
            color: var(--nv-accent);
        }
    </style>
</head>

<body>

    <div class="nv-admin-shell">
        <aside class="nv-admin-sidebar">
            <div class="nv-admin-brand-wrapper">
                <div class="d-flex align-items-center gap-2">
                    <div class="nv-admin-brand"><img src="../assets/logo_main.png" width="22" alt="logo"></div>
                    <div class="fw-semibold lh-1 profile-name-text">Dọn Vệ Sinh</div>
                </div>
                <button class="btn p-0 d-lg-none" id="mobileMenuToggle" type="button">
                    <img class="nv-admin-avatar m-0" src="../assets/logo_main.png" alt="toggle menu"
                        style="width: 40px; height: 40px; border: 2px solid #fff;">
                </button>
            </div>

            <nav id="nvSidebarMenu" class="list-group list-group-flush mt-3">
                <a href="../index.html" class="list-group-item">
                    <i class="bi bi-house"></i> <span>Trang chủ</span>
                </a>
                <a href="thong-tin-nhan-vien.php"
                    class="list-group-item <?php echo $current_page == 'thong-tin-nhan-vien.php' || $current_page == 'sua-thong-tin-nhan-vien.php' ? 'active' : ''; ?>"
                    data-page="thong-tin-nhan-vien.php">
                    <i class="bi bi-person-badge"></i> <span>Thông tin cá nhân</span>
                </a>
                <a href="danh-sach-hoa-don.php"
                    class="list-group-item <?php echo $current_page == 'danh-sach-hoa-don.php' ? 'active' : ''; ?>"
                    data-page="danh-sach-hoa-don.php">
                    <i class="bi bi-receipt"></i> <span>Danh sách hóa đơn</span>
                </a>

                <a href="../logout.html" class="list-group-item text-warning">
                    <i class="bi bi-box-arrow-right"></i> <span>Đăng xuất</span>
                </a>
            </nav>
        </aside>

        <section class="nv-main-wrapper">
            <header class="nv-admin-topbar">
                <h1 class="h5 fw-semibold mb-0 text-truncate" id="page-title">
                    <?php echo htmlspecialchars($pageTitle); ?></h1>

                <div class="dropdown">
                    <button class="btn border-0 d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                        <span class="fw-semibold d-none d-sm-inline"><?php echo htmlspecialchars($userName); ?></span>
                        <img class="nv-admin-avatar" src="<?php echo htmlspecialchars($userAvatar); ?>" alt="avatar">
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0" style="border-radius: 15px;">
                        <li><a class="dropdown-item py-2 px-3" href="#"><i class="bi bi-gear me-2"></i>Cài đặt</a></li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li><a class="dropdown-item text-danger py-2 px-3" href="../logout.html"><i
                                    class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
                    </ul>
                </div>
            </header>

            <main id="main-content">