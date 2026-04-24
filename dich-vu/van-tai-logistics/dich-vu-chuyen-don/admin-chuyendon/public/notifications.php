<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Thông báo vận hành | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .notice-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
        margin-bottom: 28px;
    }

    .notice-card {
        background: white;
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 22px 24px;
        box-shadow: var(--shadow-premium);
    }

    .notice-card span {
        display: block;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--slate-light);
    }

    .notice-card strong {
        display: block;
        margin-top: 10px;
        font-size: 30px;
        font-weight: 900;
    }

    .notice-card p {
        margin: 8px 0 0;
        color: var(--slate-light);
        font-size: 13px;
        line-height: 1.6;
    }

    .notice-list {
        display: grid;
        gap: 14px;
    }

    .notice-item {
        background: white;
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px 20px;
        box-shadow: var(--shadow-premium);
    }

    .notice-item.is-danger {
        border-color: rgba(239, 68, 68, 0.18);
        background: rgba(239, 68, 68, 0.05);
    }

    .notice-item.is-warning {
        border-color: rgba(245, 158, 11, 0.22);
        background: rgba(245, 158, 11, 0.07);
    }

    .notice-item.is-info {
        border-color: rgba(14, 165, 233, 0.18);
        background: rgba(14, 165, 233, 0.05);
    }

    .notice-item-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 10px;
    }

    .notice-item strong {
        display: block;
        font-size: 16px;
        margin-bottom: 6px;
    }

    .notice-item p {
        margin: 0;
        color: var(--slate-light);
        line-height: 1.6;
        font-size: 13px;
    }

    .notice-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        background: white;
        border: 1px solid var(--line);
        color: var(--slate);
        white-space: nowrap;
    }

    .notice-item a {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        color: var(--primary-deep);
        font-weight: 700;
        text-decoration: none;
    }

    .notice-empty {
        text-align: center;
        color: var(--slate-light);
        padding: 48px 16px;
    }

    @media (max-width: 980px) {
        .notice-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

<section class="hero-card">
    <div>
        <h1>Thông báo vận hành</h1>
        <p>Tổng hợp cảnh báo đơn quá SLA, provider thiếu xác minh, đánh giá thấp và tin liên hệ mới để admin chuyển dọn xử lý theo mức ưu tiên.</p>
    </div>
    <div class="hero-actions">
        <a href="orders_manage.php" class="btn btn-outline">
            <i class="fas fa-truck-fast"></i>Điều phối đơn
        </a>
    </div>
</section>

<section class="notice-grid" id="noticeSummary">
    <article class="notice-card">
        <span>Ưu tiên cao</span>
        <strong>--</strong>
        <p>Đang tổng hợp...</p>
    </article>
    <article class="notice-card">
        <span>Cần rà soát</span>
        <strong>--</strong>
        <p>Đang tổng hợp...</p>
    </article>
    <article class="notice-card">
        <span>Liên hệ mới</span>
        <strong>--</strong>
        <p>Đang tổng hợp...</p>
    </article>
</section>

<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách thông báo</h2>
            <p>Mỗi thông báo gắn thẳng tới khu quản trị liên quan để xử lý nhanh.</p>
        </div>
    </div>
    <div id="noticeList" class="notice-list">
        <div class="notice-empty">Đang tải cảnh báo vận hành...</div>
    </div>
</section>

<script src="assets/js/admin-api.js"></script>
<script src="assets/js/notifications-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
