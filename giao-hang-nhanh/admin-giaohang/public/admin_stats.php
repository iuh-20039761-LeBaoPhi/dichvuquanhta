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

        @media (max-width: 1100px) {
            .stats-page-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 900px) {
            .stats-kpi-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 640px) {
            .stats-kpi-grid {
                grid-template-columns: 1fr;
            }

            .stats-hero h3 {
                font-size: 26px;
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

    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
        (function () {
            const ordersTable = "giaohangnhanh_dat_lich";
            const customersTable = "giaohangnhanh_customers";
            const pageLimit = 200;
            const maxPages = 10;

            function getListFn() {
                if (typeof window.krudList === "function") {
                    return (payload) => window.krudList(payload);
                }

                if (typeof window.crud === "function") {
                    return (payload) => window.crud("list", payload.table, {
                        p: payload.page || 1,
                        limit: payload.limit || pageLimit,
                    });
                }

                if (typeof window.krud === "function") {
                    return (payload) => window.krud("list", payload.table, {
                        p: payload.page || 1,
                        limit: payload.limit || pageLimit,
                    });
                }

                return null;
            }

            function extractRows(payload, depth = 0) {
                if (depth > 4 || payload == null) return [];
                if (Array.isArray(payload)) return payload;
                if (typeof payload !== "object") return [];

                const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
                for (const key of candidateKeys) {
                    const value = payload[key];
                    if (Array.isArray(value)) return value;
                    const nested = extractRows(value, depth + 1);
                    if (nested.length) return nested;
                }

                return [];
            }

            async function listAllRows(table) {
                const listFn = getListFn();
                if (!listFn) {
                    throw new Error("Không tìm thấy hàm KRUD list.");
                }

                const rows = [];
                for (let page = 1; page <= maxPages; page += 1) {
                    const response = await listFn({
                        table,
                        sort: { id: "desc" },
                        page,
                        limit: pageLimit,
                    });
                    const batch = extractRows(response);
                    if (!batch.length) break;
                    rows.push(...batch);
                    if (batch.length < pageLimit) break;
                }

                return rows;
            }

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

            function toNumber(value, fallback = 0) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
            }

            function normalizeStatus(rawStatus) {
                const normalized = normalizeText(rawStatus).toLowerCase();
                if (["completed", "hoan_tat", "hoàn tất", "success", "delivered"].includes(normalized)) {
                    return "completed";
                }
                if (["shipping", "dang_giao", "đang giao", "in_transit"].includes(normalized)) {
                    return "shipping";
                }
                if (["cancelled", "canceled", "da_huy", "đã hủy"].includes(normalized)) {
                    return "cancelled";
                }
                return "pending";
            }

            function getServiceMeta(rawValue) {
                const normalized = normalizeText(rawValue).toLowerCase();
                const map = {
                    standard: { key: "standard", label: "Tiêu chuẩn" },
                    giao_tieu_chuan: { key: "standard", label: "Tiêu chuẩn" },
                    tieuchuan: { key: "standard", label: "Tiêu chuẩn" },
                    fast: { key: "fast", label: "Nhanh" },
                    giao_nhanh: { key: "fast", label: "Nhanh" },
                    nhanh: { key: "fast", label: "Nhanh" },
                    express: { key: "express", label: "Hỏa tốc" },
                    giao_hoa_toc: { key: "express", label: "Hỏa tốc" },
                    hoatoc: { key: "express", label: "Hỏa tốc" },
                    instant: { key: "instant", label: "Ngay lập tức" },
                    giao_ngay_lap_tuc: { key: "instant", label: "Ngay lập tức" },
                    laptuc: { key: "instant", label: "Ngay lập tức" },
                };
                return map[normalized] || {
                    key: normalized || "khac",
                    label: normalizeText(rawValue) || "Khác",
                };
            }

            function getPackageMeta(rawValue) {
                const normalized = normalizeText(rawValue).toLowerCase();
                const map = {
                    thuong: { key: "thuong", label: "Hàng thông thường" },
                    "gia-tri-cao": { key: "gia-tri-cao", label: "Giá trị cao" },
                    "de-vo": { key: "de-vo", label: "Dễ vỡ" },
                    "mui-hoi": { key: "mui-hoi", label: "Có mùi hôi" },
                    "chat-long": { key: "chat-long", label: "Chất lỏng" },
                    "pin-lithium": { key: "pin-lithium", label: "Pin lithium" },
                    "dong-lanh": { key: "dong-lanh", label: "Đông lạnh" },
                    "cong-kenh": { key: "cong-kenh", label: "Cồng kềnh" },
                };
                return map[normalized] || {
                    key: normalized || "khac",
                    label: normalizeText(rawValue) || "Khác",
                };
            }

            function parseJsonArray(value) {
                if (Array.isArray(value)) return value;
                if (typeof value !== "string") return [];
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (error) {
                    return [];
                }
            }

            function parseDate(value) {
                const raw = normalizeText(value);
                if (!raw) return null;
                const parsed = new Date(raw);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
            }

            function formatDateKey(date) {
                return [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    String(date.getDate()).padStart(2, "0"),
                ].join("-");
            }

            function buildTimelineIndex() {
                const result = {};
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                for (let i = 6; i >= 0; i -= 1) {
                    const current = new Date(today);
                    current.setDate(today.getDate() - i);
                    result[formatDateKey(current)] = {
                        label: `${String(current.getDate()).padStart(2, "0")}/${String(current.getMonth() + 1).padStart(2, "0")}`,
                        orders: 0,
                        revenue: 0,
                    };
                }

                return result;
            }

            function getOrderItems(row) {
                return parseJsonArray(row.mat_hang_json || row.mat_hang || row.items || []);
            }

            function normalizeOrder(row) {
                const items = getOrderItems(row);
                const primaryItem = items.find((item) => normalizeText(item?.loai_hang)) || items[0] || {};
                const serviceMeta = getServiceMeta(row.ten_dich_vu || row.dich_vu || row.loai_dich_vu || row.service_type);
                const packageMeta = getPackageMeta(primaryItem.loai_hang || row.loai_goi_hang || row.loai_hang);

                return {
                    id: normalizeText(row.id),
                    createdAt: row.created_at || row.created_date || row.updated_at || "",
                    totalFee: toNumber(row.tong_cuoc || row.shipping_fee || row.total_fee || 0),
                    status: normalizeStatus(row.trang_thai || row.status),
                    serviceKey: serviceMeta.key,
                    serviceLabel: serviceMeta.label,
                    packageKey: packageMeta.key,
                    packageLabel: packageMeta.label,
                    customerId: normalizeText(row.customer_id),
                    customerUsername: normalizeText(row.customer_username),
                    senderName: normalizeText(row.ho_ten_nguoi_gui || row.nguoi_gui_ho_ten || ""),
                    senderPhone: normalizeText(row.so_dien_thoai_nguoi_gui || row.nguoi_gui_so_dien_thoai || ""),
                };
            }

            function normalizeCustomer(row) {
                return {
                    id: normalizeText(row.id),
                    username: normalizeText(row.username || row.ten_dang_nhap || ""),
                    fullname: normalizeText(row.fullname || row.ho_ten || ""),
                    phone: normalizeText(row.phone || row.so_dien_thoai || ""),
                };
            }

            function buildCustomerLookup(customers) {
                const byId = new Map();
                const byUsername = new Map();
                const byPhone = new Map();

                customers.forEach((customer) => {
                    if (customer.id) byId.set(customer.id, customer);
                    if (customer.username) byUsername.set(customer.username.toLowerCase(), customer);
                    if (customer.phone) byPhone.set(customer.phone.replace(/[^\d]/g, ""), customer);
                });

                return { byId, byUsername, byPhone };
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
                                        <small>@${escapeHtml(user.username)}</small>
                                    </td>
                                    <td style="font-weight:800; color:#0a2a66;">${Number(user.total_orders || 0).toLocaleString("vi-VN")}</td>
                                    <td style="font-weight:800; color:#d9534f;">${formatMoney(user.total_spent)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `;
            }

            function buildStatsData(orderRows, customerRows) {
                const orders = orderRows.map(normalizeOrder);
                const customers = customerRows.map(normalizeCustomer);
                const timelineIndex = buildTimelineIndex();
                const serviceMap = new Map();
                const packageMap = new Map();
                const customerLookup = buildCustomerLookup(customers);
                const topUsersMap = new Map();
                let revenue = 0;
                let completedCount = 0;

                orders.forEach((order) => {
                    if (order.status === "completed") {
                        revenue += order.totalFee;
                        completedCount += 1;
                    }

                    const orderDate = parseDate(order.createdAt);
                    if (orderDate) {
                        const dateKey = formatDateKey(orderDate);
                        if (timelineIndex[dateKey]) {
                            timelineIndex[dateKey].orders += 1;
                            if (order.status === "completed") {
                                timelineIndex[dateKey].revenue += order.totalFee;
                            }
                        }
                    }

                    const currentService = serviceMap.get(order.serviceKey) || {
                        key: order.serviceKey,
                        label: order.serviceLabel,
                        total: 0,
                    };
                    currentService.total += 1;
                    serviceMap.set(order.serviceKey, currentService);

                    const currentPackage = packageMap.get(order.packageKey) || {
                        key: order.packageKey,
                        label: order.packageLabel,
                        total: 0,
                    };
                    currentPackage.total += 1;
                    packageMap.set(order.packageKey, currentPackage);

                    const phoneKey = order.senderPhone.replace(/[^\d]/g, "");
                    const customer =
                        customerLookup.byId.get(order.customerId) ||
                        customerLookup.byUsername.get(order.customerUsername.toLowerCase()) ||
                        customerLookup.byPhone.get(phoneKey) ||
                        null;

                    const userKey =
                        order.customerId ||
                        order.customerUsername.toLowerCase() ||
                        phoneKey ||
                        order.senderName.toLowerCase() ||
                        `guest-${order.id}`;

                    const currentUser = topUsersMap.get(userKey) || {
                        id: customer?.id || order.customerId || userKey,
                        fullname: customer?.fullname || order.senderName || "Khách hàng",
                        username: customer?.username || order.customerUsername || "khach-le",
                        total_orders: 0,
                        total_spent: 0,
                    };
                    currentUser.total_orders += 1;
                    if (order.status === "completed") {
                        currentUser.total_spent += order.totalFee;
                    }
                    topUsersMap.set(userKey, currentUser);
                });

                return {
                    kpi: {
                        revenue,
                        total_orders: orders.length,
                        total_users: customers.length,
                        completed_rate: orders.length ? Number(((completedCount / orders.length) * 100).toFixed(1)) : 0,
                    },
                    timeline: {
                        labels: Object.values(timelineIndex).map((item) => item.label),
                        orders: Object.values(timelineIndex).map((item) => item.orders),
                        revenue: Object.values(timelineIndex).map((item) => item.revenue),
                    },
                    service_breakdown: Array.from(serviceMap.values()).sort((a, b) => b.total - a.total),
                    package_breakdown: Array.from(packageMap.values()).sort((a, b) => b.total - a.total),
                    top_users: Array.from(topUsersMap.values())
                        .sort((a, b) => {
                            if (b.total_orders !== a.total_orders) {
                                return b.total_orders - a.total_orders;
                            }
                            return b.total_spent - a.total_spent;
                        })
                        .slice(0, 5),
                };
            }

            async function loadStats() {
                try {
                    const [orderRows, customerRows] = await Promise.all([
                        listAllRows(ordersTable),
                        listAllRows(customersTable),
                    ]);
                    const data = buildStatsData(orderRows, customerRows);
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
                    const errorMessage = error?.message || "Không thể tải thống kê từ KRUD.";
                    setState("stats-revenue-state", errorMessage, "stats-error");
                    setState("stats-service-state", "Không thể tải biểu đồ dịch vụ.", "stats-error");
                    setState("stats-package-state", "Không thể tải biểu đồ hàng hóa.", "stats-error");
                    renderTopUsers([]);
                }
            }

            document.addEventListener("DOMContentLoaded", loadStats);
        })();
    </script>
    <script src="../assets/js/admin-stats.js?v=<?php echo time(); ?>"></script>
</body>
</html>


