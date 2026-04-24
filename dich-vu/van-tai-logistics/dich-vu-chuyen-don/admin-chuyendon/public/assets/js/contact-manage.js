(function (window, document) {
    const MOVING_SERVICE_KEYWORDS = ["chuyendon", "chuyen don", "chuyển dọn", "chuyen_nha", "chuyển nhà"];

    function normalizeText(value) {
        return window.adminApi?.normalizeText ? window.adminApi.normalizeText(value) : String(value || "").replace(/\s+/g, " ").trim();
    }

    function normalizeLowerText(value) {
        return normalizeText(value).toLowerCase();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getStatusMeta(value) {
        const numeric = Number(value || 0);
        if (numeric === 2) {
            return { label: "Đã giải quyết", icon: "fa-check-double", className: "status-2" };
        }
        if (numeric === 1) {
            return { label: "Đang xử lý", icon: "fa-spinner", className: "status-1" };
        }
        return { label: "Mới nhận", icon: "fa-envelope-open-text", className: "status-0" };
    }

    function isMovingRelated(row) {
        const serviceMeta = [row.service_key, row.service_name].map((value) => normalizeLowerText(value)).join(" ");
        if (!serviceMeta) {
            return true;
        }

        return MOVING_SERVICE_KEYWORDS.some((keyword) => serviceMeta.includes(keyword));
    }

    function renderSummary(rows) {
        const summary = {
            total: rows.length,
            0: 0,
            1: 0,
            2: 0,
        };

        rows.forEach((row) => {
            const status = String(Number(row.status || 0));
            summary[status] = (summary[status] || 0) + 1;
        });

        document.getElementById("contactSummary").innerHTML = `
            <article class="contact-summary-card">
                <span>Tổng tin</span>
                <strong>${escapeHtml(summary.total)}</strong>
                <p>Tổng số liên hệ / khiếu nại đang nhìn thấy trong admin.</p>
            </article>
            <article class="contact-summary-card">
                <span>Mới nhận</span>
                <strong>${escapeHtml(summary[0])}</strong>
                <p>Các yêu cầu cần admin mở và phản hồi đầu tiên.</p>
            </article>
            <article class="contact-summary-card">
                <span>Đang xử lý</span>
                <strong>${escapeHtml(summary[1])}</strong>
                <p>Đã có ghi chú xử lý nhưng chưa đóng hoàn toàn.</p>
            </article>
            <article class="contact-summary-card">
                <span>Đã giải quyết</span>
                <strong>${escapeHtml(summary[2])}</strong>
                <p>Đã hoàn tất xử lý và lưu lại ghi chú phản hồi.</p>
            </article>
        `;
    }

    function renderRows(rows) {
        const container = document.getElementById("contactList");
        if (!rows.length) {
            container.innerHTML = '<div class="contact-empty">Chưa có tin liên hệ nào phù hợp.</div>';
            return;
        }

        container.innerHTML = rows.map((row) => {
            const statusMeta = getStatusMeta(row.status);
            return `
                <article class="message-card ${statusMeta.className}">
                    <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
                        <div>
                            <div style="font-weight:800; font-size:16px; color:var(--slate);">${escapeHtml(normalizeText(row.subject) || "Liên hệ hỗ trợ")}</div>
                            <div class="message-meta">
                                <span><i class="fas ${statusMeta.icon}"></i> ${escapeHtml(statusMeta.label)}</span>
                                <span><i class="fas fa-user"></i> ${escapeHtml(normalizeText(row.name) || "Khách hàng")}</span>
                                <span><i class="fas fa-phone"></i> ${escapeHtml(normalizeText(row.phone) || "--")}</span>
                                <span><i class="fas fa-envelope"></i> ${escapeHtml(normalizeText(row.email) || "--")}</span>
                                <span><i class="fas fa-clock"></i> ${escapeHtml(normalizeText(row.created_at) || "--")}</span>
                            </div>
                        </div>
                    </div>
                    <div class="message-body">${escapeHtml(normalizeText(row.message) || "Không có nội dung chi tiết.")}</div>
                    <form class="message-actions" data-contact-form data-id="${escapeHtml(row.id)}">
                        <div class="field">
                            <label class="label">Ghi chú xử lý nội bộ</label>
                            <textarea name="note_admin" class="textarea" rows="3" placeholder="Ví dụ: Đã gọi lại khách lúc 10:30, chờ bổ sung ảnh hiện trường...">${escapeHtml(normalizeText(row.note_admin))}</textarea>
                        </div>
                        <div class="field">
                            <label class="label">Trạng thái</label>
                            <select name="status" class="select">
                                <option value="0" ${Number(row.status || 0) === 0 ? "selected" : ""}>Mới nhận</option>
                                <option value="1" ${Number(row.status || 0) === 1 ? "selected" : ""}>Đang xử lý</option>
                                <option value="2" ${Number(row.status || 0) === 2 ? "selected" : ""}>Đã giải quyết</option>
                            </select>
                            <button type="submit" class="btn btn-primary" style="margin-top:12px;">
                                <i class="fas fa-floppy-disk"></i>Lưu phản hồi
                            </button>
                        </div>
                    </form>
                </article>
            `;
        }).join("");

        container.querySelectorAll("form[data-contact-form]").forEach((form) => {
            form.addEventListener("submit", handleSubmit);
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const id = form.getAttribute("data-id");
        const button = form.querySelector('button[type="submit"]');
        const originalHtml = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Đang lưu...';
            await window.adminApi.update(window.adminApi.CONTACT_TABLE, {
                status: Number(form.elements.status.value || 0),
                note_admin: normalizeText(form.elements.note_admin.value),
                updated_at: new Date().toISOString(),
            }, id);
            await loadContacts();
        } catch (error) {
            button.innerHTML = `<i class="fas fa-circle-exclamation"></i>${escapeHtml(error?.message || "Không thể cập nhật.")}`;
        } finally {
            button.disabled = false;
            button.innerHTML = originalHtml;
        }
    }

    async function loadContacts() {
        const container = document.getElementById("contactList");
        container.innerHTML = '<div class="contact-empty">Đang tải dữ liệu liên hệ...</div>';

        try {
            await window.adminApi.ensureContactTable();
            const rows = await window.adminApi.listAll(window.adminApi.CONTACT_TABLE, {
                limit: 100,
                maxPages: 8,
                sort: { id: "desc" },
            });
            const filteredRows = rows.filter((row) => isMovingRelated(row));
            renderSummary(filteredRows);
            renderRows(filteredRows);
        } catch (error) {
            container.innerHTML = `<div class="contact-empty">${escapeHtml(error?.message || "Không thể tải dữ liệu liên hệ.")}</div>`;
        }
    }

    window.contactManager = { loadContacts };
    document.addEventListener("DOMContentLoaded", loadContacts);
})(window, document);
