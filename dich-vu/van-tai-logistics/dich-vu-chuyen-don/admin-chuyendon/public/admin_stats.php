<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Dashboard điều hành | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .stats-hero {
        padding: 28px 30px;
        border-radius: var(--radius-xl);
        color: white;
        background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 24%),
            linear-gradient(135deg, #0f172a 0%, #1e293b 42%, #9d5e35 100%);
        box-shadow: var(--shadow-lg);
        margin-bottom: 28px;
    }

    .stats-hero h1 {
        margin: 0 0 10px;
        font-size: 34px;
        font-weight: 900;
        letter-spacing: -0.03em;
    }

    .stats-hero p {
        margin: 0;
        max-width: 820px;
        line-height: 1.7;
        color: rgba(255, 255, 255, 0.82);
    }

    .stats-kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 18px;
        margin-top: 22px;
    }

    .stats-kpi-card {
        padding: 18px 20px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.14);
    }

    .stats-kpi-card small {
        display: block;
        color: rgba(255, 255, 255, 0.72);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 11px;
    }

    .stats-kpi-card strong {
        display: block;
        margin-top: 10px;
        font-size: 30px;
        font-weight: 900;
    }

    .stats-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
        gap: 24px;
    }

    .stats-panel {
        background: white;
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-premium);
        overflow: hidden;
    }

    .stats-panel-head {
        padding: 20px 24px;
        border-bottom: 1px solid var(--line);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .stats-panel-head h3 {
        margin: 0;
        font-size: 19px;
        font-weight: 800;
    }

    .stats-panel-head p {
        margin: 6px 0 0;
        color: var(--slate-light);
        font-size: 13px;
    }

    .stats-panel-body {
        padding: 22px 24px 26px;
    }

    .stats-chart-wrap {
        position: relative;
        min-height: 300px;
    }

    .stats-chart-wrap.is-compact {
        min-height: 260px;
    }

    .stats-table {
        width: 100%;
        border-collapse: collapse;
    }

    .stats-table th,
    .stats-table td {
        padding: 14px 0;
        text-align: left;
        border-bottom: 1px solid var(--line);
    }

    .stats-table th {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--slate-light);
    }

    .stats-table tr:last-child td {
        border-bottom: none;
    }

    .stats-alert-list {
        display: grid;
        gap: 12px;
    }

    .stats-alert-card {
        padding: 16px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: var(--slate-soft);
    }

    .stats-alert-card.is-danger {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.16);
    }

    .stats-alert-card.is-warning {
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.18);
    }

    .stats-alert-card.is-info {
        background: rgba(14, 165, 233, 0.08);
        border-color: rgba(14, 165, 233, 0.16);
    }

    .stats-alert-card strong {
        display: block;
        font-size: 14px;
        margin-bottom: 6px;
    }

    .stats-alert-card p {
        margin: 0;
        color: var(--slate-light);
        line-height: 1.6;
        font-size: 13px;
    }

    .stats-empty,
    .stats-loading {
        color: var(--slate-light);
        text-align: center;
        padding: 40px 16px;
    }

    @media (max-width: 1160px) {
        .stats-layout {
            grid-template-columns: 1fr;
        }

        .stats-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .stats-kpi-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

<section class="stats-hero">
    <h1>Dashboard điều hành chuyển dọn</h1>
    <p>Tổng hợp tình trạng đơn hàng, điều phối nhà cung cấp, cảnh báo đơn quá SLA và hiệu suất theo loại dịch vụ để admin có thể xử lý vận hành ngay.</p>

    <div class="stats-kpi-grid" id="statsHeroKpis">
        <article class="stats-kpi-card">
            <small>Đơn hàng</small>
            <strong>--</strong>
        </article>
        <article class="stats-kpi-card">
            <small>Đang mở</small>
            <strong>--</strong>
        </article>
        <article class="stats-kpi-card">
            <small>Quá SLA</small>
            <strong>--</strong>
        </article>
        <article class="stats-kpi-card">
            <small>Doanh thu dự kiến</small>
            <strong>--</strong>
        </article>
    </div>
</section>

<section class="stats-layout">
    <div style="display:grid; gap:24px;">
        <article class="stats-panel">
            <div class="stats-panel-head">
                <div>
                    <h3>Phân bổ đơn theo dịch vụ</h3>
                    <p>Nhìn nhanh xem chuyển nhà, văn phòng hay kho bãi đang chiếm tỷ trọng lớn.</p>
                </div>
            </div>
            <div class="stats-panel-body">
                <div class="stats-chart-wrap">
                    <canvas id="serviceDistributionChart"></canvas>
                </div>
            </div>
        </article>

        <article class="stats-panel">
            <div class="stats-panel-head">
                <div>
                    <h3>Top nhà cung cấp theo số đơn</h3>
                    <p>Theo dõi ai đang xử lý nhiều đơn nhất và số đơn hoàn thành tương ứng.</p>
                </div>
            </div>
            <div class="stats-panel-body">
                <div id="topProvidersContent" class="stats-loading">Đang tải dữ liệu nhà cung cấp...</div>
            </div>
        </article>
    </div>

    <div style="display:grid; gap:24px;">
        <article class="stats-panel">
            <div class="stats-panel-head">
                <div>
                    <h3>Trạng thái vận hành</h3>
                    <p>Tỷ lệ đơn đang chờ, đang làm, hoàn tất và đã hủy.</p>
                </div>
            </div>
            <div class="stats-panel-body">
                <div class="stats-chart-wrap is-compact">
                    <canvas id="statusDistributionChart"></canvas>
                </div>
            </div>
        </article>

        <article class="stats-panel">
            <div class="stats-panel-head">
                <div>
                    <h3>Cảnh báo ưu tiên</h3>
                    <p>Tập trung vào các việc admin cần xử lý trước trong ca vận hành.</p>
                </div>
            </div>
            <div class="stats-panel-body">
                <div id="alertsContent" class="stats-loading">Đang tổng hợp cảnh báo...</div>
            </div>
        </article>
    </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="assets/js/admin-api.js"></script>
<script src="assets/js/admin-stats.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
