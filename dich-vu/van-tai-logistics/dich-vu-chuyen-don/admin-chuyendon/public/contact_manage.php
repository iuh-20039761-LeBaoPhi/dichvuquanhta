<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Liên hệ & Khiếu nại | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .contact-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 20px;
        margin-bottom: 28px;
    }

    .contact-summary-card {
        background: white;
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 22px 24px;
        box-shadow: var(--shadow-premium);
    }

    .contact-summary-card span {
        display: block;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--slate-light);
    }

    .contact-summary-card strong {
        display: block;
        margin-top: 10px;
        font-size: 30px;
        font-weight: 900;
        color: var(--slate);
    }

    .contact-summary-card p {
        margin: 8px 0 0;
        color: var(--slate-light);
        font-size: 13px;
        line-height: 1.5;
    }

    .message-card {
        background: white;
        border: 1px solid var(--line);
        border-left: 4px solid #cbd5e1;
        border-radius: 18px;
        padding: 20px;
        box-shadow: var(--shadow-premium);
    }

    .message-card.status-0 { border-left-color: #0ea5e9; }
    .message-card.status-1 { border-left-color: #f59e0b; }
    .message-card.status-2 { border-left-color: #10b981; }

    .message-list {
        display: grid;
        gap: 14px;
    }

    .message-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 16px;
        margin: 0 0 12px;
        color: var(--slate-light);
        font-size: 13px;
    }

    .message-body {
        white-space: pre-wrap;
        padding: 14px 16px;
        border-radius: 14px;
        background: var(--slate-soft);
        border: 1px solid var(--line);
        line-height: 1.6;
        color: var(--slate);
        margin-bottom: 16px;
    }

    .message-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 240px;
        gap: 16px;
        align-items: start;
    }

    .contact-empty {
        text-align: center;
        color: var(--slate-light);
        padding: 48px 16px;
    }

    @media (max-width: 1080px) {
        .contact-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .contact-summary-grid,
        .message-actions {
            grid-template-columns: 1fr;
        }
    }
</style>

<section class="hero-card">
    <div>
        <h1>Liên hệ & khiếu nại</h1>
        <p>Theo dõi hòm thư hỗ trợ, cập nhật tiến độ xử lý và lưu ghi chú phản hồi ngay trong admin chuyển dọn.</p>
    </div>
    <div class="hero-actions">
        <a href="notifications.php" class="btn btn-outline">
            <i class="fas fa-bell"></i>Xem thông báo
        </a>
    </div>
</section>

<section id="contactSummary" class="contact-summary-grid">
    <article class="contact-summary-card">
        <span>Tổng tin</span>
        <strong>--</strong>
        <p>Đang tải...</p>
    </article>
    <article class="contact-summary-card">
        <span>Mới nhận</span>
        <strong>--</strong>
        <p>Đang tải...</p>
    </article>
    <article class="contact-summary-card">
        <span>Đang xử lý</span>
        <strong>--</strong>
        <p>Đang tải...</p>
    </article>
    <article class="contact-summary-card">
        <span>Đã giải quyết</span>
        <strong>--</strong>
        <p>Đang tải...</p>
    </article>
</section>

<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách yêu cầu hỗ trợ</h2>
            <p>Mặc định đọc bảng `lien_he` dùng chung; nếu có field dịch vụ thì admin sẽ ưu tiên các yêu cầu liên quan chuyển dọn.</p>
        </div>
        <button class="btn btn-outline" type="button" onclick="window.contactManager?.loadContacts()">
            <i class="fas fa-rotate"></i>Tải lại
        </button>
    </div>
    <div id="contactList" class="message-list">
        <div class="contact-empty">Đang tải dữ liệu liên hệ...</div>
    </div>
</section>

<script src="assets/js/admin-api.js"></script>
<script src="assets/js/contact-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
