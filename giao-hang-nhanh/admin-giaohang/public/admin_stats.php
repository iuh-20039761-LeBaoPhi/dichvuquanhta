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
    <title>Thống kê hệ thống | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    <style>
        .stats-hero {
            padding: 24px;
            border-radius: 24px;
            color: #fff;
            background:
                radial-gradient(circle at top right, rgba(255, 122, 0, 0.15), transparent 24%),
                linear-gradient(135deg, #08214f 0%, #0a2a66 60%, #123b87 100%);
            box-shadow: 0 18px 40px rgba(10, 42, 102, 0.16);
        }

        .stats-hero h3 {
            margin: 0 0 10px;
            font-size: 30px;
            line-height: 1.12;
        }

        .stats-hero p {
            margin: 0;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
        }

        .stats-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
        }

        .stats-kpi-card {
            padding: 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .stats-kpi-card small {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: rgba(255, 255, 255, 0.72);
            font-weight: 800;
        }

        .stats-kpi-card strong {
            font-size: 28px;
            line-height: 1;
        }

        .stats-page-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 24px;
            margin-top: 24px;
        }

        .stats-panel {
            background: #fff;
            border: 1px solid #dbe7ff;
            border-radius: 24px;
            box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
            overflow: hidden;
        }

        .stats-panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 22px;
            border-bottom: 1px solid #edf2f7;
        }

        .stats-panel-head h3 {
            margin: 0;
            color: #0a2a66;
            font-size: 18px;
        }

        .stats-panel-head p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 13px;
        }

        .stats-panel-body {
            padding: 20px 22px 24px;
            overflow-x: auto;
        }

        .stats-chart-wrap {
            height: 320px;
            position: relative;
        }

        .stats-chart-wrap.is-compact {
            height: 260px;
        }

        .stats-loading,
        .stats-error,
        .stats-empty {
            padding: 32px 24px;
            text-align: center;
            color: #64748b;
            font-weight: 600;
        }

        .stats-error {
            color: #b91c1c;
        }

        .stats-top-users {
            width: 100%;
            border-collapse: collapse;
        }

        .stats-top-users th,
        .stats-top-users td {
            padding: 14px 0;
            text-align: left;
            border-bottom: 1px solid #edf2f7;
        }

        .stats-top-users th {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #8aa0c5;
        }

        .stats-top-users tr:last-child td {
            border-bottom: none;
        }

        .stats-top-users strong {
            color: #0a2a66;
        }

        .stats-top-users small {
            color: #64748b;
        }

        @media (max-width: 1200px) {
            .stats-kpi-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 1100px) {
            .stats-page-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 900px) {
            .stats-kpi-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .stats-panel-head {
                align-items: flex-start;
                flex-direction: column;
            }
        }

        @media (max-width: 640px) {
            .stats-kpi-grid {
                grid-template-columns: 1fr;
            }

            .stats-hero h3 {
                font-size: 26px;
            }

            .stats-hero,
            .stats-panel-body {
                padding-left: 18px;
                padding-right: 18px;
            }

            .stats-top-users {
                min-width: 520px;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Báo cáo thống kê</h2>
            <a href="orders_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quản lý đơn hàng</a>
        </div>

        <section class="stats-hero">
            <h3>Dashboard điều hành dành cho chủ doanh nghiệp</h3>
            <p>Toàn bộ số liệu được đọc trực tiếp từ API quản trị, giữ một nguồn dữ liệu thống nhất cho thống kê, đơn hàng, khách hàng và năng lực vận hành.</p>
            <div class="stats-kpi-grid">
                <div class="stats-kpi-card">
                    <small>Doanh thu ship</small>
                    <strong id="stats-kpi-revenue">0đ</strong>
                </div>
                <div class="stats-kpi-card">
                    <small>Tổng đơn hàng</small>
                    <strong id="stats-kpi-orders">0</strong>
                </div>
                <div class="stats-kpi-card">
                    <small>Tỷ lệ hoàn tất</small>
                    <strong id="stats-kpi-rate">0%</strong>
                </div>
                <div class="stats-kpi-card">
                    <small>Khách hàng</small>
                    <strong id="stats-kpi-users">0</strong>
                </div>
            </div>
        </section>

        <div class="stats-page-grid">
            <section class="stats-panel">
                <div class="stats-panel-head">
                    <div>
                        <h3>Đơn hàng và doanh thu 7 ngày gần nhất</h3>
                        <p>Đọc trực tiếp từ KRUD và render bằng Chart.js</p>
                    </div>
                </div>
                <div class="stats-panel-body">
                    <div id="stats-revenue-state" class="stats-loading">Đang tải dữ liệu thống kê...</div>
                    <div class="stats-chart-wrap" id="stats-revenue-wrap" hidden>
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
            </section>

            <section class="stats-panel">
                <div class="stats-panel-head">
                    <div>
                        <h3>Top khách hàng thân thiết</h3>
                        <p>Nhóm khách tạo nhiều đơn và có tổng chi cao</p>
                    </div>
                </div>
                <div class="stats-panel-body" id="stats-top-users-body">
                    <div class="stats-loading">Đang tải danh sách khách hàng...</div>
                </div>
            </section>
        </div>

        <div class="charts-grid" style="margin-top: 24px;">
            <section class="stats-panel">
                <div class="stats-panel-head">
                    <div>
                        <h3>Phân loại dịch vụ</h3>
                        <p>Tỷ trọng các gói dịch vụ đang vận hành</p>
                    </div>
                </div>
                <div class="stats-panel-body">
                    <div id="stats-service-state" class="stats-loading">Đang tải biểu đồ dịch vụ...</div>
                    <div class="stats-chart-wrap is-compact" id="stats-service-wrap" hidden>
                        <canvas id="serviceChart"></canvas>
                    </div>
                </div>
            </section>

            <section class="stats-panel">
                <div class="stats-panel-head">
                    <div>
                        <h3>Phân loại hàng hóa</h3>
                        <p>Phân bố nhóm hàng được đặt nhiều nhất</p>
                    </div>
                </div>
                <div class="stats-panel-body">
                    <div id="stats-package-state" class="stats-loading">Đang tải biểu đồ hàng hóa...</div>
                    <div class="stats-chart-wrap is-compact" id="stats-package-wrap" hidden>
                        <canvas id="packageChart"></canvas>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script>
        (function () {
            function formatMoney(value) {
                return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
            }

            function normalizeText(value) {
                return String(value ?? "").replace(/\s+/g, " ").trim();
            }

            function escapeHtml(value) {
                return String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function setState(id, message, className) {
                const el = document.getElementById(id);
                if (!el) return;
                el.className = className;
                el.textContent = message;
                el.hidden = false;
            }

            function renderTopUsers(topUsers) {
                const host = document.getElementById("stats-top-users-body");
                if (!host) return;

                if (!Array.isArray(topUsers) || !topUsers.length) {
                    host.innerHTML = '<div class="stats-empty">Chưa có dữ liệu khách hàng nổi bật.</div>';
                    return;
                }

                host.innerHTML = `
                    <table class="stats-top-users">
                        <thead>
                            <tr>
                                <th>Khách hàng</th>
                                <th>Đơn</th>
                                <th>Chi tiêu</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topUsers.map((user) => `
                                <tr>
                                    <td>
                                        <strong>${escapeHtml(user.fullname)}</strong><br>
                                        <small>@${escapeHtml(normalizeText(user.username) || "khach-le")}</small>
                                    </td>
                                    <td style="font-weight:800; color:#0a2a66;">${Number(user.total_orders || 0).toLocaleString("vi-VN")}</td>
                                    <td style="font-weight:800; color:#d9534f;">${formatMoney(user.total_spent)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `;
            }

            async function fetchStats() {
                const response = await fetch("../api/stats.php", {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json",
                    },
                });

                let payload = null;
                try {
                    payload = await response.json();
                } catch (error) {
                    throw new Error(`API thống kê trả về dữ liệu không hợp lệ (HTTP ${response.status}).`);
                }

                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.message || `Không thể tải thống kê (HTTP ${response.status}).`);
                }

                return payload.data || {};
            }

            async function loadStats() {
                try {
                    const data = await fetchStats();
                    const kpi = data.kpi || {};
                    document.getElementById("stats-kpi-revenue").textContent = formatMoney(kpi.revenue);
                    document.getElementById("stats-kpi-orders").textContent = Number(kpi.total_orders || 0).toLocaleString("vi-VN");
                    document.getElementById("stats-kpi-rate").textContent = `${Number(kpi.completed_rate || 0).toLocaleString("vi-VN")}%`;
                    document.getElementById("stats-kpi-users").textContent = Number(kpi.total_users || 0).toLocaleString("vi-VN");

                    window.chartData = {
                        revenue: data.timeline || { labels: [], orders: [], revenue: [] },
                        service: {
                            labels: Array.isArray(data.service_breakdown) ? data.service_breakdown.map((item) => item.label) : [],
                            data: Array.isArray(data.service_breakdown) ? data.service_breakdown.map((item) => item.total) : [],
                        },
                        package: {
                            labels: Array.isArray(data.package_breakdown) ? data.package_breakdown.map((item) => item.label) : [],
                            data: Array.isArray(data.package_breakdown) ? data.package_breakdown.map((item) => item.total) : [],
                        },
                    };

                    document.getElementById("stats-revenue-state").hidden = true;
                    document.getElementById("stats-service-state").hidden = true;
                    document.getElementById("stats-package-state").hidden = true;
                    document.getElementById("stats-revenue-wrap").hidden = false;
                    document.getElementById("stats-service-wrap").hidden = false;
                    document.getElementById("stats-package-wrap").hidden = false;

                    renderTopUsers(data.top_users || []);

                    if (typeof window.renderAdminStatsCharts === "function") {
                        window.renderAdminStatsCharts(window.chartData);
                    }
                } catch (error) {
                    const errorMessage = error?.message || "Không thể tải thống kê từ API.";
                    setState("stats-revenue-state", errorMessage, "stats-error");
                    setState("stats-service-state", "Không thể tải biểu đồ dịch vụ.", "stats-error");
                    setState("stats-package-state", "Không thể tải biểu đồ hàng hóa.", "stats-error");
                    renderTopUsers([]);
                }
            }

            document.addEventListener("DOMContentLoaded", loadStats);
        })();
    </script>
    <script src="../../public/assets/js/admin-stats.js?v=<?php echo time(); ?>"></script>
</body>
</html>


