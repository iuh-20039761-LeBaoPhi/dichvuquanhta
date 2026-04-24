(function (window, document) {
    const chartRefs = {
        service: null,
        status: null,
    };

    function normalizeText(value) {
        return window.adminApi?.normalizeText ? window.adminApi.normalizeText(value) : String(value || "").replace(/\s+/g, " ").trim();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatMoney(value) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    }

    function destroyCharts() {
        Object.keys(chartRefs).forEach((key) => {
            if (chartRefs[key]) {
                chartRefs[key].destroy();
                chartRefs[key] = null;
            }
        });
    }

    function getServiceLabel(value) {
        const map = {
            "chuyen-nha": "Chuyển nhà",
            "van-phong": "Chuyển văn phòng",
            "kho-bai": "Chuyển kho bãi",
        };
        return map[normalizeText(value)] || normalizeText(value) || "Khác";
    }

    function isMovingRelatedContact(row) {
        const serviceMeta = [row?.service_key, row?.service_name]
            .map((value) => normalizeText(value).toLowerCase())
            .join(" ");
        if (!serviceMeta) {
            return true;
        }
        return ["chuyendon", "chuyen don", "chuyển dọn", "chuyen_nha", "chuyển nhà"].some((keyword) => serviceMeta.includes(keyword));
    }

    function buildKpis(orders, providers, contacts) {
        const movingContacts = contacts.filter(isMovingRelatedContact);
        const overdue = orders.filter((order) => window.adminApi.isOrderOverdue(order)).length;
        const active = orders.filter((order) => !window.adminApi.isOrderCompleted(order) && !window.adminApi.isOrderCancelled(order)).length;
        const revenue = orders.reduce((sum, order) => {
            if (window.adminApi.isOrderCancelled(order)) {
                return sum;
            }
            return sum + Number(order.tong_tam_tinh || order.tong_tien || 0);
        }, 0);
        const pendingProviders = providers.filter((user) => {
            const status = normalizeText(user.trangthai).toLowerCase();
            const hasDocs = normalizeText(user.link_avatar) && normalizeText(user.link_cccd_truoc) && normalizeText(user.link_cccd_sau);
            return status === "pending" || !hasDocs;
        }).length;
        const newContacts = movingContacts.filter((row) => Number(row.status || 0) === 0).length;

        return [
            { label: "Đơn hàng", value: String(orders.length) },
            { label: "Đang mở", value: String(active) },
            { label: "Quá SLA", value: String(overdue) },
            { label: "Doanh thu dự kiến", value: formatMoney(revenue) },
            { label: "Provider chờ duyệt", value: String(pendingProviders) },
            { label: "Liên hệ mới", value: String(newContacts) },
        ];
    }

    function renderKpis(kpis) {
        const container = document.getElementById("statsHeroKpis");
        container.innerHTML = kpis.slice(0, 4).map((kpi) => `
            <article class="stats-kpi-card">
                <small>${escapeHtml(kpi.label)}</small>
                <strong>${escapeHtml(kpi.value)}</strong>
            </article>
        `).join("");
    }

    function renderServiceChart(orders) {
        const ctx = document.getElementById("serviceDistributionChart");
        if (!ctx || typeof window.Chart !== "function") {
            return;
        }

        const buckets = new Map();
        orders.forEach((order) => {
            const label = getServiceLabel(order.loai_dich_vu || order.ten_dich_vu);
            buckets.set(label, (buckets.get(label) || 0) + 1);
        });

        chartRefs.service = new window.Chart(ctx, {
            type: "bar",
            data: {
                labels: Array.from(buckets.keys()),
                datasets: [{
                    label: "Số đơn",
                    data: Array.from(buckets.values()),
                    backgroundColor: ["#c27a4d", "#0ea5e9", "#10b981", "#8b5cf6"],
                    borderRadius: 12,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                    },
                },
            },
        });
    }

    function renderStatusChart(orders) {
        const ctx = document.getElementById("statusDistributionChart");
        if (!ctx || typeof window.Chart !== "function") {
            return;
        }

        const buckets = {
            pending: 0,
            accepted: 0,
            shipping: 0,
            completed: 0,
            cancelled: 0,
        };

        orders.forEach((order) => {
            if (window.adminApi.isOrderCancelled(order)) {
                buckets.cancelled += 1;
                return;
            }
            if (window.adminApi.isOrderCompleted(order)) {
                buckets.completed += 1;
                return;
            }
            if (window.adminApi.isOrderStarted(order)) {
                buckets.shipping += 1;
                return;
            }
            if (window.adminApi.isOrderAccepted(order)) {
                buckets.accepted += 1;
                return;
            }
            buckets.pending += 1;
        });

        chartRefs.status = new window.Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Mới tiếp nhận", "Đã nhận", "Đang triển khai", "Hoàn tất", "Đã hủy"],
                datasets: [{
                    data: [buckets.pending, buckets.accepted, buckets.shipping, buckets.completed, buckets.cancelled],
                    backgroundColor: ["#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981", "#64748b"],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
            },
        });
    }

    function renderTopProviders(orders, providers) {
        const container = document.getElementById("topProvidersContent");
        const providerMap = new Map(providers.map((provider) => [String(provider.id), provider]));
        const buckets = new Map();

        orders.forEach((order) => {
            const providerId = normalizeText(order.provider_id);
            if (!providerId) {
                return;
            }
            const bucket = buckets.get(providerId) || {
                id: providerId,
                name: normalizeText(providerMap.get(providerId)?.hovaten || providerId),
                total: 0,
                completed: 0,
                revenue: 0,
            };
            bucket.total += 1;
            if (window.adminApi.isOrderCompleted(order)) {
                bucket.completed += 1;
            }
            bucket.revenue += Number(order.tong_tam_tinh || order.tong_tien || 0);
            buckets.set(providerId, bucket);
        });

        const rows = Array.from(buckets.values())
            .sort((left, right) => right.total - left.total || right.completed - left.completed)
            .slice(0, 8);

        if (!rows.length) {
            container.innerHTML = '<div class="stats-empty">Chưa có provider nào được gán đơn.</div>';
            return;
        }

        container.innerHTML = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Nhà cung cấp</th>
                        <th>Tổng đơn</th>
                        <th>Hoàn tất</th>
                        <th>Giá trị</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row) => `
                        <tr>
                            <td><strong>${escapeHtml(row.name)}</strong></td>
                            <td>${escapeHtml(row.total)}</td>
                            <td>${escapeHtml(row.completed)}</td>
                            <td>${escapeHtml(formatMoney(row.revenue))}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    }

    function renderAlerts(orders, providers, contacts) {
        const container = document.getElementById("alertsContent");
        const movingContacts = contacts.filter(isMovingRelatedContact);
        const overdueOrders = orders.filter((order) => window.adminApi.isOrderOverdue(order));
        const lowRatings = orders.filter((order) => Number(order.customer_rating || 0) > 0 && Number(order.customer_rating || 0) <= 3);
        const pendingProviders = providers.filter((user) => {
            const status = normalizeText(user.trangthai).toLowerCase();
            const hasDocs = normalizeText(user.link_avatar) && normalizeText(user.link_cccd_truoc) && normalizeText(user.link_cccd_sau);
            return status === "pending" || !hasDocs;
        });
        const newContacts = movingContacts.filter((row) => Number(row.status || 0) === 0);

        const cards = [
            overdueOrders.length
                ? {
                    tone: "is-danger",
                    title: `${overdueOrders.length} đơn quá SLA 120 phút`,
                    note: "Các đơn này vẫn chưa có nhà cung cấp nhận và cần điều phối gấp.",
                }
                : null,
            pendingProviders.length
                ? {
                    tone: "is-warning",
                    title: `${pendingProviders.length} provider chờ duyệt hoặc thiếu hồ sơ`,
                    note: "Kiểm tra avatar, CCCD và trạng thái để đủ điều kiện nhận đơn.",
                }
                : null,
            lowRatings.length
                ? {
                    tone: "is-danger",
                    title: `${lowRatings.length} đơn có đánh giá thấp`,
                    note: "Cần rà lại chất lượng triển khai hoặc phản hồi khách hàng.",
                }
                : null,
            newContacts.length
                ? {
                    tone: "is-info",
                    title: `${newContacts.length} liên hệ / khiếu nại mới`,
                    note: "Cập nhật phản hồi trong hòm thư hỗ trợ để tránh tồn backlog.",
                }
                : null,
        ].filter(Boolean);

        if (!cards.length) {
            container.innerHTML = '<div class="stats-empty">Không có cảnh báo ưu tiên ở thời điểm hiện tại.</div>';
            return;
        }

        container.innerHTML = `<div class="stats-alert-list">${cards.map((card) => `
            <article class="stats-alert-card ${escapeHtml(card.tone)}">
                <strong>${escapeHtml(card.title)}</strong>
                <p>${escapeHtml(card.note)}</p>
            </article>
        `).join("")}</div>`;
    }

    async function loadDashboard() {
        try {
            await window.adminApi.ensureNguoidungTable();
            await window.adminApi.ensureOrdersTable();
            await window.adminApi.ensureContactTable();

            const [users, orders, contacts] = await Promise.all([
                window.adminApi.listAll(window.adminApi.USERS_TABLE, { limit: 200, maxPages: 12, sort: { id: "desc" } }),
                window.adminApi.listAll(window.adminApi.ORDERS_TABLE, { limit: 200, maxPages: 15, sort: { id: "desc" } }),
                window.adminApi.listAll(window.adminApi.CONTACT_TABLE, { limit: 100, maxPages: 6, sort: { id: "desc" } }),
            ]);

            const providers = users.filter((row) => window.adminApi.resolveMovingRole(row) === "provider");
            renderKpis(buildKpis(orders, providers, contacts));
            destroyCharts();
            renderServiceChart(orders);
            renderStatusChart(orders);
            renderTopProviders(orders, providers);
            renderAlerts(orders, providers, contacts);
        } catch (error) {
            document.getElementById("topProvidersContent").innerHTML = `<div class="stats-empty">${escapeHtml(error?.message || "Không thể tải dashboard.")}</div>`;
            document.getElementById("alertsContent").innerHTML = `<div class="stats-empty">${escapeHtml(error?.message || "Không thể tải dashboard.")}</div>`;
        }
    }

    document.addEventListener("DOMContentLoaded", loadDashboard);
})(window, document);
