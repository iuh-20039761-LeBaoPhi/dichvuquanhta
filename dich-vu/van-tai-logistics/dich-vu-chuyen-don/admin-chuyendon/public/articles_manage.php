<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Quản lý cẩm nang | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .articles-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
        gap: 24px;
        align-items: start;
    }

    .articles-toolbar {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 18px;
    }

    .articles-toolbar .input,
    .articles-toolbar .select {
        min-width: 220px;
    }

    .article-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .article-actions .btn {
        min-width: 40px;
        padding: 10px 12px;
    }

    .article-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
    }

    .article-status.is-published {
        color: #166534;
        background: rgba(16, 185, 129, 0.12);
    }

    .article-status.is-hidden {
        color: #92400e;
        background: rgba(245, 158, 11, 0.14);
    }

    .article-content-editor {
        min-height: 320px;
        resize: vertical;
        font-family: Consolas, Monaco, monospace;
        line-height: 1.6;
    }

    .article-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
    }

    .article-runtime-message {
        display: none;
        margin-bottom: 18px;
    }

    @media (max-width: 1100px) {
        .articles-layout {
            grid-template-columns: 1fr;
        }
    }
</style>

<section class="hero-card">
    <div>
        <h1>Quản lý cẩm nang chuyển dọn</h1>
        <p>Thêm, sửa, ẩn hoặc xóa bài viết trong `news-data.json` để đồng bộ với trang cẩm nang public của chuyển dọn.</p>
    </div>
    <div class="hero-actions">
        <a href="../../cam-nang-chuyendon.html" target="_blank" rel="noopener" class="btn btn-outline">
            <i class="fas fa-arrow-up-right-from-square"></i>Xem trang public
        </a>
    </div>
</section>

<div id="article-runtime-message" class="flash article-runtime-message"></div>

<section class="articles-layout">
    <div class="panel">
        <div class="section-header">
            <div>
                <h2>Danh sách bài viết</h2>
                <p id="articles-summary">Đang tải dữ liệu cẩm nang...</p>
            </div>
            <button type="button" class="btn btn-primary" id="article-create-btn">
                <i class="fas fa-plus"></i>Thêm bài
            </button>
        </div>

        <div class="articles-toolbar">
            <input id="article-search" class="input" type="search" placeholder="Tìm tiêu đề, mô tả, tag...">
            <select id="article-category-filter" class="select">
                <option value="">Tất cả chuyên mục</option>
            </select>
            <select id="article-status-filter" class="select">
                <option value="">Tất cả trạng thái</option>
                <option value="published">Đang hiển thị</option>
                <option value="hidden">Đang ẩn</option>
            </select>
        </div>

        <div class="table-wrap">
            <table>
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
                    <tr><td colspan="5" style="text-align:center; padding:40px; color:var(--slate-light);">Đang tải cẩm nang...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <aside class="panel">
        <div class="section-header" style="margin-bottom: 20px;">
            <div>
                <h2 id="article-form-title">Thêm bài viết</h2>
                <p>Cho phép nhập HTML trực tiếp vì frontend đang render trường `content`.</p>
            </div>
        </div>

        <form id="article-form">
            <input type="hidden" name="id" value="">
            <div class="editor-grid">
                <div class="field span-full">
                    <label class="label">Tiêu đề</label>
                    <input class="input" name="title" required>
                </div>
                <div class="field">
                    <label class="label">Slug</label>
                    <input class="input" name="slug" placeholder="tu-dong-tao-neu-bo-trong">
                </div>
                <div class="field">
                    <label class="label">Ngày đăng</label>
                    <input class="input" name="date" placeholder="dd/mm/yyyy">
                </div>
                <div class="field">
                    <label class="label">Chuyên mục</label>
                    <input class="input" name="category" required placeholder="Kinh nghiệm">
                </div>
                <div class="field">
                    <label class="label">Trạng thái</label>
                    <select class="select" name="status">
                        <option value="published">Đang hiển thị</option>
                        <option value="hidden">Đang ẩn</option>
                    </select>
                </div>
                <div class="field span-full">
                    <label class="label">Ảnh đại diện</label>
                    <input class="input" name="img" placeholder="assets/images/ten-anh.png">
                </div>
                <div class="field span-full">
                    <label class="label">Mô tả ngắn</label>
                    <textarea class="textarea" name="description" rows="3"></textarea>
                </div>
                <div class="field span-full">
                    <label class="label">Tags, cách nhau bởi dấu phẩy</label>
                    <input class="input" name="tags" placeholder="chuyển nhà, kinh nghiệm, đóng gói">
                </div>
                <div class="field span-full">
                    <label class="label">Nội dung HTML</label>
                    <textarea class="textarea article-content-editor" name="content" required></textarea>
                </div>
            </div>

            <div class="article-form-actions">
                <button type="button" class="btn btn-outline" id="article-reset-btn">Làm mới</button>
                <button type="submit" class="btn btn-primary" id="article-save-btn">
                    <i class="fas fa-floppy-disk"></i>Lưu bài viết
                </button>
            </div>
        </form>
    </aside>
</section>

<script src="assets/js/articles-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
