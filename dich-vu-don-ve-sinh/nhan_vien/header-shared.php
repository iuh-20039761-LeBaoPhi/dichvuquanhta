<?php
session_start();
// Đảm bảo session đã được nạp (hoặc gọi API nếu cần)
if (!isset($_SESSION['user'])) {
    // Nếu chưa có session, thử chạy session_user.php để đồng bộ từ cookie
    ob_start();
    include_once __DIR__ . '/../session_user.php';
    ob_end_clean();
}

$userName = $_SESSION['user']['hovaten'] ?? 'Nhân viên';
$userAvatar = $_SESSION['user']['avatartenfile'] ?? 'logomvb.png';
if (strpos($userAvatar, 'assets/') === false && $userAvatar !== 'logomvb.png') {
    $userAvatar = '../assets/' . $userAvatar;
} else if ($userAvatar === 'logomvb.png') {
    $userAvatar = '../assets/logomvb.png';
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MamaCore - Staff Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    
    <style>
        :root {
            --nv-border: #ee68b2;
            --nv-title: #e474a5;
            --nv-text: #e572a6;
            --nv-sidebar-a: #ea5f99;
            --nv-sidebar-b: #e984af;
            --nv-accent: #f391c2;
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
            font-family: 'Inter', -apple-system, sans-serif;
            color: var(--nv-text);
            background: #fffafa;
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
            background: #fdf8fb;
        }

        /* Topbar */
        .nv-admin-topbar {
            height: 70px;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(241, 195, 220, 0.3);
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
                /* Changed to column to support dropdown menu */
                align-items: stretch;
                padding: 0;
                border-radius: 0;
                z-index: 1100;
                overflow: visible;
                /* Allow menu to overflow */
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
                /* Hide by default on mobile */
                flex-direction: column;
                background: linear-gradient(135deg, var(--nv-sidebar-a), var(--nv-sidebar-b));
                margin-top: 0;
                width: 100%;
                position: absolute;
                /* Thay đổi thành tuyệt đối để không đẩy nội dung */
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

            .nv-admin-sidebar .list-group-item i {
                margin-right: 12px !important;
            }

            .nv-admin-sidebar .list-group-item span {
                display: inline;
            }

            /* Ẩn Topbar trên Mobile để tinh gọn */
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

            /* Ép các container con (nếu có) phải sát lề */
            .nv-main-wrapper #main-content .container,
            .nv-main-wrapper #main-content .container-fluid {
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                max-width: 100% !important;
            }
        }

        /* Utilities */
        .spinner-border.text-pink {
            color: var(--nv-accent);
        }
    </style>
</head>

<body>

    <div class="nv-admin-shell">
        <aside class="nv-admin-sidebar">
            <div class="nv-admin-brand-wrapper">
                <div class="d-flex align-items-center gap-2">
                    <div class="nv-admin-brand"><img src="../assets/logomvb.png" width="22" alt="logo"></div>
                    <div class="fw-bold lh-1 profile-name-text">Chăm Sóc Mẹ và Bé</div>
                </div>
                <!-- Avatar làm nút mở Menu trên Mobile -->
                <button class="btn p-0 d-lg-none" id="mobileMenuToggle" type="button">
                    <img class="nv-admin-avatar m-0" src="../assets/logomvb.png" alt="toggle menu"
                        style="width: 40px; height: 40px; border: 2px solid #fff;">
                </button>
            </div>

            <nav id="nvSidebarMenu" class="list-group list-group-flush mt-3">
                <a href="../index.html" class="list-group-item">
                    <i class="bi bi-house"></i> <span>Trang chủ</span>
                </a>
                <a href="#" class="list-group-item active" data-page="thong-tin-nhan-vien.php">
                    <i class="bi bi-person-badge"></i> <span>Thông tin cá nhân</span>
                </a>
                <a href="#" class="list-group-item" data-page="danh-sach-hoa-don.php">
                    <i class="bi bi-receipt"></i> <span>Danh sách hóa đơn</span>
                </a>
                
                <a href="../logout.php" class="list-group-item text-warning">
                    <i class="bi bi-box-arrow-right"></i> <span>Đăng xuất</span>
                </a>
            </nav>
        </aside>

        <section class="nv-main-wrapper">
            <header class="nv-admin-topbar">
                <h1 class="h5 fw-bold mb-0 text-truncate" id="page-title">Thông tin cá nhân</h1>

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
                        <li><a class="dropdown-item text-danger py-2 px-3" href="../logout.php"><i
                                    class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
                    </ul>
                </div>
            </header>

            <main id="main-content">
                <div class="d-flex justify-content-center mt-5">
                    <div class="spinner-border text-pink" role="status"></div>
                </div>
            </main>
        </section>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        /**
         * HÀM XỬ LÝ SPA - ĐƠN GIẢN & DỄ HIỂU
         */
        async function navigateTo(url, element = null, updateHistory = true, keepShellURL = false) {
            const contentArea = document.getElementById('main-content');
            const pageTitle = document.getElementById('page-title');

            // 1. Hiệu ứng loading
            contentArea.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-danger"></div></div>';

            try {
                // 2. Cập nhật URL trình duyệt
                if (updateHistory) {
                    const newURL = keepShellURL ? 'header-shared.php' : url;
                    window.history.pushState({ url: url, keepShellURL: keepShellURL }, '', newURL);
                }

                // 3. Gọi file HTML/PHP độc lập
                const response = await fetch(url);
                if (!response.ok) throw new Error('Trang không tồn tại');
                const html = await response.text();

                // 4. Hiển thị vào vùng div
                const range = document.createRange();
                range.selectNode(contentArea);
                const fragment = range.createContextualFragment(html);
                contentArea.innerHTML = '';
                contentArea.appendChild(fragment);

                // 5. Cập nhật giao diện Menu Active
                if (element) {
                    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
                    element.classList.add('active');
                    pageTitle.innerText = element.innerText.trim();
                } else {
                    const matchedEl = document.querySelector(`[data-page="${url.split('?')[0]}"]`);
                    if (matchedEl) {
                        document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
                        matchedEl.classList.add('active');
                        pageTitle.innerText = matchedEl.innerText.trim();
                    }
                }
            } catch (err) {
                contentArea.innerHTML = `<div class="alert alert-danger">Lỗi tải trang: ${err.message}</div>`;
            }
        }

        // Lắng nghe click vào menu - Đối với Sidebar Menu thì ÉP URL là header-shared.html
        document.querySelectorAll('[data-page]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                navigateTo(page, this, true, true);

                // Đóng menu sau khi click (trên mobile)
                document.querySelector('.nv-admin-sidebar').classList.remove('menu-open');
            });
        });

        // Xử lý nút Hamburger Toggle trên Mobile
        document.getElementById('mobileMenuToggle').addEventListener('click', function () {
            document.querySelector('.nv-admin-sidebar').classList.toggle('menu-open');
        });

        // TỰ ĐỘNG HÓA SPA: Xử lý tất cả các link và form trong vùng nội dung chính
        // 1. Xử lý nộp form lọc (mặc định GET sẽ làm reload trang mất layout)
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (form.closest('#main-content') && form.method.toLowerCase() === 'get') {
                e.preventDefault();
                const formData = new FormData(form);
                const params = new URLSearchParams(formData).toString();
                const action = form.getAttribute('action') || '';
                // Lấy tên tệp hiện tại nếu action trống
                const baseUrl = action || 'danh-sach-hoa-don.php'; 
                navigateTo(baseUrl + (params ? '?' + params : ''));
            }
        });

        // 2. Xử lý các link nội bộ (Phân trang, Xem chi tiết...)
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a');
            if (!link || e.defaultPrevented) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript:')) return;

            // Nếu link nằm trong vùng nội dung chính, nạp qua navigateTo
            if (link.closest('#main-content')) {
                e.preventDefault();
                navigateTo(href);
            }
        });

        // Xử lý nút Back/Forward
        window.onpopstate = function (event) {
            if (event.state && event.state.url) {
                navigateTo(event.state.url, null, false, event.state.keepShellURL || false);
            }
        };

        // Tải trang mặc định hoặc trang hiện tại dựa trên URL
        window.onload = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const displayParam = urlParams.get('display');

            const currentPath = window.location.pathname.split('/').pop();
            const currentSearch = window.location.search;
            const currentFull = currentPath + currentSearch;

            if (displayParam) {
                // Nếu có tham số display, nạp trang đó vào layout
                const targetItem = document.querySelector(`[data-page="${displayParam.split('?')[0]}"]`);
                navigateTo(displayParam, targetItem, false, true);
            } else if (currentPath === 'header-shared.php' || currentPath === '') {
                // Mặc định nạp Thông tin nhân viên và giữ URL Shell
                const defaultItem = document.querySelector('[data-page="danh-sach-hoa-don.php"]');
                if (defaultItem) {
                    navigateTo('danh-sach-hoa-don.php', defaultItem, false, true);
                }
            } else {
                // Nếu load trực tiếp một trang (như chi tiết hóa đơn), giữ nguyên URL đó trong layout
                navigateTo(currentFull, null, false, false);
            }
        };

    </script>

</body>

</html>