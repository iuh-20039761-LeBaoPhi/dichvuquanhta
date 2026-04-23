<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Quản lý cẩm nang | Admin Giao Hàng</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .articles-layout { display:grid; grid-template-columns:minmax(0, 1fr) minmax(360px, 440px); gap:24px; align-items:start; }
        .articles-toolbar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:18px; }
        .articles-toolbar .admin-input, .articles-toolbar .admin-select { width:auto; min-width:190px; }
        .articles-table td { vertical-align:top; }
        .article-title-cell strong { color:#0a2a66; display:block; margin-bottom:4px; }
        .article-title-cell small { color:#64748b; display:block; line-height:1.4; }
        .article-status { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:5px 9px; font-size:12px; font-weight:700; }
        .article-status.is-published { color:#166534; background:#dcfce7; }
        .article-status.is-hidden { color:#92400e; background:#fef3c7; }
        .article-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .article-form-grid .span-full { grid-column:1 / -1; }
        .article-content-editor { min-height:300px; font-family:Consolas, Monaco, monospace; line-height:1.5; resize:vertical; }
        .article-form-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; flex-wrap:wrap; }
        .article-runtime-message { display:none; margin-bottom:16px; }
        .article-preview-link { color:#0a2a66; text-decoration:none; font-weight:700; }
        .article-actions { display:flex; gap:8px; justify-content:flex-end; }
        .article-actions button { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border-radius:10px; }
        @media (max-width: 1100px) { .articles-layout { grid-template-columns:1fr; } }
        @media (max-width: 720px) {
            .articles-toolbar .admin-input, .articles-toolbar .admin-select { width:100%; }
            .article-form-grid { grid-template-columns:1fr; }
            .article-actions { justify-content:flex-start; }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <div>
                <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
                <h2 class="page-title">Quản lý cẩm nang</h2>
                <p style="color:#64748b; margin-top:6px;">Thêm, sửa, ẩn/hiện và xóa bài viết đang hiển thị trên trang cẩm nang giao hàng.</p>
            </div>
            <a class="btn-view-site-pill" href="../../cam-nang.html" target="_blank" rel="noopener">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Xem trang public
            </a>
        </div>

        <div id="article-runtime-message" class="pricing-alert article-runtime-message"></div>

        <section class="articles-layout">
            <div class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <h3>Danh sách bài viết</h3>
                        <p id="articles-summary">Đang tải dữ liệu cẩm nang...</p>
                    </div>
                    <button type="button" class="btn-primary" id="article-create-btn">
                        <i class="fa-solid fa-plus"></i> Thêm bài
                    </button>
                </div>

                <div class="articles-toolbar">
                    <input id="article-search" class="admin-input" type="search" placeholder="Tìm tiêu đề, mô tả, tag...">
                    <select id="article-category-filter" class="admin-select">
                        <option value="">Tất cả chuyên mục</option>
                    </select>
                    <select id="article-status-filter" class="admin-select">
                        <option value="">Tất cả trạng thái</option>
                        <option value="published">Đang hiển thị</option>
                        <option value="hidden">Đang ẩn</option>
                    </select>
                </div>

                <div class="table-responsive">
                    <table class="order-table articles-table">
                        <thead>
                            <tr>
                                <th style="width:70px;">ID</th>
                                <th>Bài viết</th>
                                <th>Chuyên mục</th>
                                <th>Trạng thái</th>
                                <th style="text-align:right;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="articles-table-body">
                            <tr><td colspan="5" class="users-loading">Đang tải cẩm nang...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <aside class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <h3 id="article-form-title">Thêm bài viết</h3>
                        <p>Nội dung cho phép HTML vì trang public đang render trực tiếp trường content.</p>
                    </div>
                </div>

                <form id="article-form">
                    <input type="hidden" name="id" value="">
                    <div class="article-form-grid">
                        <div class="form-group span-full">
                            <label>Tiêu đề</label>
                            <input class="admin-input" name="title" required>
                        </div>
                        <div class="form-group">
                            <label>Slug</label>
                            <input class="admin-input" name="slug" placeholder="tu-dong-tao-neu-bo-trong">
                        </div>
                        <div class="form-group">
                            <label>Ngày đăng</label>
                            <input class="admin-input" name="date" placeholder="dd/mm/yyyy">
                        </div>
                        <div class="form-group">
                            <label>Chuyên mục</label>
                            <input class="admin-input" name="category" required placeholder="Hướng dẫn">
                        </div>
                        <div class="form-group">
                            <label>Trạng thái</label>
                            <select class="admin-select" name="status">
                                <option value="published">Đang hiển thị</option>
                                <option value="hidden">Đang ẩn</option>
                            </select>
                        </div>
                        <div class="form-group span-full">
                            <label>Ảnh đại diện</label>
                            <input class="admin-input" name="img" placeholder="assets/images/ten-anh.png">
                        </div>
                        <div class="form-group span-full">
                            <label>Mô tả ngắn</label>
                            <textarea class="admin-input" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-group span-full">
                            <label>Tags, cách nhau bằng dấu phẩy</label>
                            <input class="admin-input" name="tags" placeholder="COD, đóng gói, kinh nghiệm">
                        </div>
                        <div class="form-group span-full">
                            <label>Nội dung HTML</label>
                            <textarea class="admin-input article-content-editor" name="content" required></textarea>
                        </div>
                    </div>
                    <div class="article-form-actions">
                        <button type="button" class="btn-secondary" id="article-reset-btn">Làm mới</button>
                        <button type="submit" class="btn-primary" id="article-save-btn">
                            <i class="fa-solid fa-floppy-disk"></i> Lưu bài viết
                        </button>
                    </div>
                </form>
            </aside>
        </section>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="assets/js/articles-manage.js?v=<?php echo time(); ?>"></script>
</body>
</html>
