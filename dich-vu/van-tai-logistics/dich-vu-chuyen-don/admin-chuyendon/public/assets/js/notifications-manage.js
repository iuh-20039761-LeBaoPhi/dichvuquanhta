(function (window, document) {
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

    function buildOrderCode(order) {
        return normalizeText(order.ma_yeu_cau_noi_bo || order.id || "");
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

    function buildNotifications(orders, providers, contacts) {
        const notifications = [];

        orders.filter((order) => window.adminApi.isOrderOverdue(order)).forEach((order) => {
            notifications.push({
                tone: "is-danger",
                tag: "Đơn quá SLA",
                title: `${buildOrderCode(order)} đang quá 120 phút chưa có provider nhận`,
                note: `${normalizeText(order.ho_ten || "Khách hàng")} • ${normalizeText(order.dia_chi_di || "--")} → ${normalizeText(order.dia_chi_den || "--")}`,
                href: "orders_manage.php",
            });
        });

        providers.forEach((provider) => {
            const hasDocs = normalizeText(provider.link_avatar) && normalizeText(provider.link_cccd_truoc) && normalizeText(provider.link_cccd_sau);
            const status = normalizeText(provider.trangthai).toLowerCase();
            if (status === "pending" || !hasDocs) {
                notifications.push({
                    tone: "is-warning",
                    tag: "Provider",
                    title: `${normalizeText(provider.hovaten || provider.sodienthoai || provider.id)} cần rà soát hồ sơ`,
                    note: hasDocs ? "Tài khoản đang ở trạng thái chờ duyệt." : "Thiếu avatar hoặc ảnh CCCD để xác minh.",
                    href: "users_manage.php",
                });
            }
        });

        orders
            .filter((order) => Number(order.customer_rating || 0) > 0 && Number(order.customer_rating || 0) <= 3)
            .forEach((order) => {
                notifications.push({
                    tone: "is-danger",
                    tag: "Đánh giá thấp",
                    title: `${buildOrderCode(order)} chỉ đạt ${Number(order.customer_rating || 0)}/5 sao`,
                    note: normalizeText(order.customer_feedback) || "Khách hàng để lại đánh giá thấp nhưng chưa có ghi chú chi tiết.",
                    href: `order_detail.php?madonhang=${encodeURIComponent(order.id)}`,
                });
            });

        contacts
            .filter((row) => isMovingRelatedContact(row))
            .filter((row) => Number(row.status || 0) === 0)
            .forEach((row) => {
                notifications.push({
                    tone: "is-info",
                    tag: "Liên hệ mới",
                    title: normalizeText(row.subject) || `Tin mới từ ${normalizeText(row.name || "khách hàng")}`,
                    note: normalizeText(row.message) || "Cần mở hòm thư để xem chi tiết.",
                    href: "contact_manage.php",
                });
            });

        return notifications;
    }

    function renderSummary(notifications) {
        const summary = {
            high: notifications.filter((item) => item.tone === "is-danger").length,
            review: notifications.filter((item) => item.tone === "is-warning").length,
            inbox: notifications.filter((item) => item.tag === "Liên hệ mới").length,
        };

        document.getElementById("noticeSummary").innerHTML = `
            <article class="notice-card">
                <span>Ưu tiên cao</span>
                <strong>${escapeHtml(summary.high)}</strong>
                <p>Đơn quá SLA và đánh giá thấp cần xử lý trước.</p>
            </article>
            <article class="notice-card">
                <span>Cần rà soát</span>
                <strong>${escapeHtml(summary.review)}</strong>
                <p>Provider đang chờ duyệt hoặc còn thiếu hồ sơ xác minh.</p>
            </article>
            <article class="notice-card">
                <span>Liên hệ mới</span>
                <strong>${escapeHtml(summary.inbox)}</strong>
                <p>Tin nhắn hoặc khiếu nại mới chưa được phản hồi.</p>
            </article>
        `;
    }

    function renderList(notifications) {
        const container = document.getElementById("noticeList");
        if (!notifications.length) {
            container.innerHTML = '<div class="notice-empty">Không có cảnh báo vận hành nào tại thời điểm hiện tại.</div>';
            return;
        }

        container.innerHTML = notifications.map((item) => `
            <article class="notice-item ${escapeHtml(item.tone)}">
                <div class="notice-item-head">
                    <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <p>${escapeHtml(item.note)}</p>
                    </div>
                    <span class="notice-tag">${escapeHtml(item.tag)}</span>
                </div>
                <a href="${escapeHtml(item.href)}">
                    <i class="fas fa-arrow-right"></i>Mở khu xử lý
                </a>
            </article>
        `).join("");
    }

    async function loadNotifications() {
        try {
            await window.adminApi.ensureNguoidungTable();
            await window.adminApi.ensureOrdersTable();
            await window.adminApi.ensureContactTable();

            const [users, orders, contacts] = await Promise.all([
                window.adminApi.listAll(window.adminApi.USERS_TABLE, { limit: 200, maxPages: 12, sort: { id: "desc" } }),
                window.adminApi.listAll(window.adminApi.ORDERS_TABLE, { limit: 200, maxPages: 15, sort: { id: "desc" } }),
                window.adminApi.listAll(window.adminApi.CONTACT_TABLE, { limit: 100, maxPages: 6, sort: { id: "desc" } }),
            ]);

            const providers = users.filter((user) => window.adminApi.resolveMovingRole(user) === "provider");
            const notifications = buildNotifications(orders, providers, contacts);
            renderSummary(notifications);
            renderList(notifications);
        } catch (error) {
            document.getElementById("noticeList").innerHTML = `<div class="notice-empty">${escapeHtml(error?.message || "Không thể tải thông báo vận hành.")}</div>`;
        }
    }

    document.addEventListener("DOMContentLoaded", loadNotifications);
})(window, document);
