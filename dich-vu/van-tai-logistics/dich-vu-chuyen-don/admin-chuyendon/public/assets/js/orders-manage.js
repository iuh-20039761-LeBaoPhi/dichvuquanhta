/**
 * orders-manage.js
 * Admin operational order management for moving service.
 */
const orderManager = (function () {
    const state = {
        allOrders: [],
        filteredOrders: [],
        providers: [],
        providerMap: new Map(),
        filters: {
            search: "",
            status: "",
            service: "",
            provider: "",
            survey: "",
            alert: "",
            feedback: "",
        },
        orderIdToDelete: null,
        currentPage: 1,
        limit: 20,
        hasMore: true,
    };

    function normalizeText(value) {
        return window.adminApi?.normalizeText ? window.adminApi.normalizeText(value) : String(value || "").replace(/\s+/g, " ").trim();
    }

    function normalizeLowerText(value) {
        return normalizeText(value).toLowerCase();
    }

    function parseJsonObject(value) {
        return window.adminApi?.parseJsonObject ? window.adminApi.parseJsonObject(value) : {};
    }

    function splitPipeValues(value) {
        return String(value || "")
            .split("|")
            .map((item) => normalizeText(item))
            .filter(Boolean);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function setTextContent(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = String(value ?? "");
        }
    }

    function formatMoney(value) {
        const amount = Number(value || 0);
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function formatDate(value, withTime = false) {
        const raw = normalizeText(value);
        if (!raw) {
            return "--";
        }
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return raw;
        }
        return date.toLocaleString("vi-VN", withTime ? {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        } : {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    function getStartOfTodayMs() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }

    function getStartOfTomorrowMs() {
        const startOfTodayMs = getStartOfTodayMs();
        return startOfTodayMs + 24 * 60 * 60 * 1000;
    }

    function getOrderCreatedMs(row) {
        const raw = normalizeText(row?.created_at || row?.created_date || "");
        if (!raw) {
            return 0;
        }
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    function compareOrdersByCreatedDesc(left, right) {
        const leftCreatedMs = getOrderCreatedMs(left);
        const rightCreatedMs = getOrderCreatedMs(right);
        if (rightCreatedMs !== leftCreatedMs) {
            return rightCreatedMs - leftCreatedMs;
        }

        const leftId = Number(left?.id || 0);
        const rightId = Number(right?.id || 0);
        return rightId - leftId;
    }

    function isOrderCreatedToday(row) {
        const createdMs = getOrderCreatedMs(row);
        if (!createdMs) {
            return false;
        }
        return createdMs >= getStartOfTodayMs() && createdMs < getStartOfTomorrowMs();
    }

    async function fetchOrdersFromApi(page = 1) {
        const batch = await window.adminApi.list(window.adminApi.ORDERS_TABLE, {
            page,
            limit: state.limit,
            sort: { created_at: "desc", id: "desc" },
        });
        return Array.isArray(batch) ? batch : [];
    }

    function toDateInputValue(value) {
        const raw = normalizeText(value);
        if (!raw) {
            return "";
        }
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        return date.toISOString().slice(0, 10);
    }

    function toDateTimeLocalValue(value) {
        const raw = normalizeText(value);
        if (!raw) {
            return "";
        }
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        const offsetMs = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    }

    function fromDateTimeLocalValue(value) {
        const raw = normalizeText(value);
        if (!raw) {
            return "";
        }
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        return date.toISOString();
    }

    function buildDisplayCode(order) {
        if (window.adminApi?.getOrderDisplayCode) {
            return window.adminApi.getOrderDisplayCode(order);
        }

        return normalizeText(order?.ma_yeu_cau_noi_bo || order?.id || "");
    }

    function getServiceLabel(value) {
        const normalized = normalizeLowerText(value).replace(/_/g, "-");
        const map = {
            "chuyen-nha": "Chuyển nhà",
            "moving-house": "Chuyển nhà",
            "van-phong": "Chuyển văn phòng",
            "chuyen-van-phong": "Chuyển văn phòng",
            "moving-office": "Chuyển văn phòng",
            "kho-bai": "Chuyển kho bãi",
            "chuyen-kho-bai": "Chuyển kho bãi",
            "moving-warehouse": "Chuyển kho bãi",
        };
        return map[normalized] || normalizeText(value) || "Chưa xác định";
    }

    function getStatusMeta(order) {
        if (window.adminApi?.isOrderCancelled(order)) {
            return { key: "cancelled", label: "Đã hủy", color: "#64748b" };
        }
        if (window.adminApi?.isOrderCompleted(order)) {
            return { key: "completed", label: "Đã hoàn thành", color: "#10b981" };
        }
        if (window.adminApi?.isOrderStarted(order)) {
            return { key: "shipping", label: "Đang triển khai", color: "#8b5cf6" };
        }
        if (window.adminApi?.isOrderAccepted(order)) {
            return { key: "accepted", label: "Đã nhận đơn", color: "#0ea5e9" };
        }
        return { key: "pending", label: "Mới tiếp nhận", color: "#f59e0b" };
    }

    function getProviderName(order) {
        const providerId = normalizeText(order?.provider_id);
        if (!providerId) {
            return "";
        }
        return state.providerMap.get(providerId)?.hovaten || "";
    }

    function orderHasFeedback(order) {
        return Number(order?.customer_rating || 0) > 0 || normalizeText(order?.customer_feedback);
    }

    function orderHasLowRating(order) {
        return Number(order?.customer_rating || 0) > 0 && Number(order?.customer_rating || 0) <= 3;
    }

    function normalizeOrder(row) {
        const providerId = normalizeText(row?.provider_id);
        const formPayload = parseJsonObject(row?.du_lieu_form_json);
        const hasSurvey = window.adminApi?.hasSurveyFirst(row) || String(formPayload?.can_khao_sat_truoc || "").trim() === "1";
        const feedbackImages = splitPipeValues(row?.customer_feedback_anh_dinh_kem || row?.customer_feedback_image_attachments);
        const feedbackVideos = splitPipeValues(row?.customer_feedback_video_dinh_kem || row?.customer_feedback_video_attachments);
        const providerImages = splitPipeValues(row?.provider_report_anh_dinh_kem || row?.provider_note_anh_dinh_kem || row?.provider_report_image_attachments);
        const providerVideos = splitPipeValues(row?.provider_report_video_dinh_kem || row?.provider_note_video_dinh_kem || row?.provider_report_video_attachments);

        return {
            ...row,
            display_code: buildDisplayCode(row),
            service_label: getServiceLabel(row?.loai_dich_vu || row?.ten_dich_vu),
            status_meta: getStatusMeta(row),
            provider_id: providerId,
            provider_name: state.providerMap.get(providerId)?.hovaten || "",
            provider_phone: state.providerMap.get(providerId)?.sodienthoai || "",
            survey_first: hasSurvey,
            overdue: window.adminApi?.isOrderOverdue(row) || false,
            feedback_counted: orderHasFeedback(row),
            low_rating: orderHasLowRating(row),
            form_payload: formPayload,
            booking_images: splitPipeValues(row?.anh_dinh_kem),
            booking_videos: splitPipeValues(row?.video_dinh_kem),
            feedback_images: feedbackImages,
            feedback_videos: feedbackVideos,
            provider_images: providerImages,
            provider_videos: providerVideos,
        };
    }

    function renderSkeleton(container, count) {
        let html = "";
        for (let index = 0; index < count; index += 1) {
            html += `
                <tr>
                    <td><div class="skeleton orders-skeleton orders-skeleton-code"></div><div class="skeleton orders-skeleton orders-skeleton-name"></div></td>
                    <td><div class="skeleton orders-skeleton orders-skeleton-service"></div><div class="skeleton orders-skeleton orders-skeleton-meta"></div></td>
                    <td><div class="skeleton orders-skeleton orders-skeleton-provider"></div></td>
                    <td><div class="skeleton orders-skeleton orders-skeleton-amount"></div></td>
                    <td><div class="skeleton orders-skeleton orders-skeleton-status"></div></td>
                    <td><div class="skeleton orders-skeleton orders-skeleton-actions"></div></td>
                </tr>
            `;
        }
        container.innerHTML = html;
    }

    function populateProviderSelects() {
        const filter = document.getElementById("providerFilter");
        const formSelect = document.getElementById("provider_id");
        const options = state.providers
            .map((provider) => `<option value="${escapeHtml(provider.id)}">${escapeHtml(provider.hovaten || provider.sodienthoai || provider.id)}</option>`)
            .join("");

        if (filter) {
            const currentValue = filter.value;
            filter.innerHTML = '<option value="">Tất cả</option>' + options;
            filter.value = state.providers.some((provider) => String(provider.id) === currentValue) ? currentValue : "";
        }

        if (formSelect) {
            const currentValue = formSelect.value;
            formSelect.innerHTML = '<option value="">Chưa gán</option>' + options;
            formSelect.value = state.providers.some((provider) => String(provider.id) === currentValue) ? currentValue : "";
        }
    }

    async function fetchOrders() {
        const tbody = document.getElementById("orderListBody");
        renderSkeleton(tbody, 5);
        setTextContent("cd-admin-orders-summary", `Đang tải trang ${state.currentPage}...`);

        try {
            await window.adminApi.ensureNguoidungTable();
            await window.adminApi.ensureOrdersTable();

            const [providers, orders] = await Promise.all([
                window.adminApi.listProviders(),
                fetchOrdersFromApi(state.currentPage),
            ]);

            state.providers = providers
                .map((provider) => ({
                    ...provider,
                    hovaten: normalizeText(provider?.hovaten || provider?.name || provider?.sodienthoai || ""),
                }))
                .sort((left, right) => left.hovaten.localeCompare(right.hovaten, "vi"));
            state.providerMap = new Map(state.providers.map((provider) => [String(provider.id), provider]));
            populateProviderSelects();

            state.allOrders = orders.map(normalizeOrder);
            state.hasMore = state.allOrders.length === state.limit;
            
            updateStats();
            applyFilters();
            updatePaginationUI();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" class="orders-table-message-row orders-table-message-row-danger">${escapeHtml(error?.message || "Không thể tải dữ liệu đơn hàng.")}</td></tr>`;
            showToast(error?.message || "Không thể tải dữ liệu đơn hàng.", "danger");
        }
    }

    function updatePaginationUI() {
        setTextContent("currentPageDisplay", state.currentPage);
        const btnPrev = document.getElementById("btnPrev");
        const btnNext = document.getElementById("btnNext");
        if (btnPrev) btnPrev.disabled = state.currentPage <= 1;
        if (btnNext) btnNext.disabled = !state.hasMore;
        
        const summary = document.querySelector(".cd-admin-orders-summary");
        if (summary) {
            summary.textContent = `Trang ${state.currentPage} - Hiển thị tối đa ${state.limit} đơn hàng mới nhất.`;
        }
    }

    function changePage(delta) {
        const next = state.currentPage + delta;
        if (next < 1) return;
        if (delta > 0 && !state.hasMore) return;
        state.currentPage = next;
        fetchOrders();
    }

    function updateStats() {
        const totalOrders = state.allOrders.length;
        const newOrders = state.allOrders.filter((order) => order.status_meta.key === "pending").length;
        const activeOrders = state.allOrders.filter((order) => ["accepted", "shipping"].includes(order.status_meta.key)).length;
        const completedOrders = state.allOrders.filter((order) => order.status_meta.key === "completed").length;
        const cancelledOrders = state.allOrders.filter((order) => order.status_meta.key === "cancelled").length;

        setTextContent("statsTotalOrders", totalOrders);
        setTextContent("statsNewOrders", newOrders);
        setTextContent("statsActiveOrders", activeOrders);
        setTextContent("statsCompletedOrders", completedOrders);
        setTextContent("statsCancelledOrders", cancelledOrders);

        // Update tab badges if they exist
        setTextContent("count-all", totalOrders);
        setTextContent("count-pending", newOrders);
        setTextContent("count-active", activeOrders);
        setTextContent("count-completed", completedOrders);
        setTextContent("count-cancelled", cancelledOrders);
    }

    function renderFilterChips() {
        const container = document.getElementById("filterChips");
        if (!container) {
            return;
        }

        const chips = [];
        if (state.filters.search) {
            chips.push({ key: "search", label: `Tìm: ${state.filters.search}` });
        }
        if (state.filters.status) {
            const statusOption = document.querySelector(`#statusFilter option[value="${state.filters.status}"]`);
            chips.push({ key: "status", label: `Trạng thái: ${statusOption?.textContent || state.filters.status}` });
        }
        if (state.filters.service) {
            chips.push({ key: "service", label: `Dịch vụ: ${getServiceLabel(state.filters.service)}` });
        }
        if (state.filters.provider) {
            chips.push({ key: "provider", label: `Nhà cung cấp: ${state.providerMap.get(state.filters.provider)?.hovaten || state.filters.provider}` });
        }
        if (state.filters.survey) {
            chips.push({ key: "survey", label: `Khảo sát: ${state.filters.survey === "yes" ? "Có" : "Không"}` });
        }
        if (state.filters.alert) {
            chips.push({ key: "alert", label: `Cảnh báo: ${state.filters.alert === "late" ? "Quá SLA 120 phút" : "Đã hủy"}` });
        }
        if (state.filters.feedback) {
            chips.push({ key: "feedback", label: `Đánh giá: ${state.filters.feedback === "low-rating" ? "Từ 3 sao trở xuống" : "Có đánh giá"}` });
        }

        container.innerHTML = chips
            .map((chip) => `<div class="chip">${escapeHtml(chip.label)} <i class="fas fa-times close" onclick="orderManager.clearFilter('${escapeHtml(chip.key)}')"></i></div>`)
            .join("");
    }

    function applyFilters() {
        const keyword = normalizeLowerText(state.filters.search);
        state.filteredOrders = state.allOrders.filter((order) => {
            if (keyword) {
                const haystack = [
                    order.display_code,
                    order.ho_ten,
                    order.so_dien_thoai,
                    order.customer_email,
                    order.ten_cong_ty,
                    order.dia_chi_di,
                    order.dia_chi_den,
                    order.provider_name,
                    order.note_admin,
                    order.ghi_chu,
                ].map((value) => normalizeLowerText(value)).join(" ");

                if (!haystack.includes(keyword)) {
                    return false;
                }
            }

            if (state.filters.status) {
                if (state.filters.status === 'active') {
                    if (!["accepted", "shipping"].includes(order.status_meta.key)) return false;
                } else if (order.status_meta.key !== state.filters.status) {
                    return false;
                }
            }
            if (state.filters.service && normalizeText(order.loai_dich_vu) !== state.filters.service) {
                return false;
            }
            if (state.filters.provider && normalizeText(order.provider_id) !== state.filters.provider) {
                return false;
            }
            if (state.filters.survey === "yes" && !order.survey_first) {
                return false;
            }
            if (state.filters.survey === "no" && order.survey_first) {
                return false;
            }
            if (state.filters.alert === "late" && !order.overdue) {
                return false;
            }
            if (state.filters.alert === "cancelled" && order.status_meta.key !== "cancelled") {
                return false;
            }
            if (state.filters.feedback === "has-feedback" && !order.feedback_counted) {
                return false;
            }
            if (state.filters.feedback === "low-rating" && !order.low_rating) {
                return false;
            }

            return true;
        });

        renderTable();
        renderFilterChips();
    }

    function renderTable() {
        const tbody = document.getElementById("orderListBody");
        if (!state.filteredOrders.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="orders-table-message-row">Không có đơn hàng phù hợp bộ lọc hiện tại.</td></tr>';
            return;
        }

        tbody.innerHTML = state.filteredOrders.map((order) => {
            const schedule = [formatDate(order.ngay_thuc_hien), normalizeText(order.khung_gio_thuc_hien)].filter(Boolean).join(" • ") || "--";
            const providerName = order.provider_name || "Chưa gán";
            const pricingValue = Number(order.tong_tam_tinh || order.tong_tien || 0);
            const feedbackText = Number(order.customer_rating || 0) > 0 ? `${Number(order.customer_rating || 0)}/5 sao` : "Chưa có";
            const chips = [
                order.ten_cong_ty ? `<span class="order-chip"><i class="fas fa-building"></i>${escapeHtml(order.ten_cong_ty)}</span>` : "",
                order.provider_name ? `<span class="order-chip is-info"><i class="fas fa-user-tie"></i>${escapeHtml(providerName)}</span>` : '<span class="order-chip is-warning"><i class="fas fa-user-plus"></i>Chưa gán provider</span>',
                order.survey_first ? '<span class="order-chip"><i class="fas fa-clipboard-check"></i>Khảo sát trước</span>' : "",
                order.overdue ? '<span class="order-chip is-danger"><i class="fas fa-triangle-exclamation"></i>Quá SLA 120 phút</span>' : "",
                order.feedback_counted ? `<span class="order-chip ${order.low_rating ? "is-danger" : "is-success"}"><i class="fas fa-star"></i>${escapeHtml(feedbackText)}</span>` : "",
            ].filter(Boolean).join("");

            return `
                <tr>
                    <td data-label="Mã đơn & khách hàng">
                        <div class="orders-cell-code">${escapeHtml(order.display_code)}</div>
                        <div class="orders-cell-title">${escapeHtml(order.ho_ten || "--")}</div>
                        <div class="orders-cell-meta">${escapeHtml(order.so_dien_thoai || "--")} • ${escapeHtml(order.customer_email || "Không có email")}</div>
                        <div class="order-meta-stack">${chips}</div>
                    </td>
                    <td data-label="Dịch vụ & lịch">
                        <div class="orders-cell-title orders-cell-title-service">${escapeHtml(order.service_label)}</div>
                        <div class="orders-cell-meta orders-cell-meta-spaced">${escapeHtml(schedule)}</div>
                        <div class="orders-cell-meta orders-cell-meta-spaced">${escapeHtml(order.dia_chi_di || "--")} → ${escapeHtml(order.dia_chi_den || "--")}</div>
                    </td>
                    <td data-label="Điều phối">
                        <div class="orders-cell-title orders-cell-title-provider">${escapeHtml(providerName)}</div>
                        <div class="orders-cell-meta orders-cell-meta-spaced">Nhận: ${escapeHtml(formatDate(order.accepted_at, true))}</div>
                        <div class="orders-cell-meta orders-cell-meta-subtle">Bắt đầu: ${escapeHtml(formatDate(order.started_at, true))}</div>
                    </td>
                    <td data-label="Giá trị">
                        <div class="orders-cell-amount">${escapeHtml(formatMoney(pricingValue))}</div>
                        <div class="orders-cell-meta orders-cell-meta-spaced">Chốt cuối: ${escapeHtml(formatMoney(order.tong_tien || 0))}</div>
                    </td>
                    <td data-label="Trạng thái">
                        <span class="badge order-status-badge order-status-badge--${escapeHtml(order.status_meta.key)}">${escapeHtml(order.status_meta.label)}</span>
                        <div class="orders-cell-meta orders-cell-meta-top-gap">Tạo lúc ${escapeHtml(formatDate(order.created_at, true))}</div>
                    </td>
                    <td data-label="Thao tác">
                        <div class="order-actions">
                            <a href="order_detail.php?madonhang=${encodeURIComponent(order.id)}" class="btn btn-outline" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </a>
                            <button type="button" class="btn btn-outline" onclick="orderManager.showOrderModal('${escapeHtml(order.id)}')" title="Điều phối / chỉnh sửa">
                                <i class="fas fa-pen-to-square"></i>
                            </button>
                            <button type="button" class="btn btn-outline" onclick="orderManager.handleDelete('${escapeHtml(order.id)}')" title="Xóa">
                                <i class="fas fa-trash-alt order-action-icon-danger"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderMediaPreview(containerId, items, emptyText) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        if (!list.length) {
            container.innerHTML = `<div class="media-preview-empty">${escapeHtml(emptyText)}</div>`;
            return;
        }

        container.innerHTML = list.map((item, index) => {
            const href = /^https?:\/\//i.test(item) ? item : item;
            return `
                <a class="media-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
                    <span>${escapeHtml(`Tệp ${index + 1}`)}</span>
                    <span>${escapeHtml(item)}</span>
                </a>
            `;
        }).join("");
    }

    function setFeedbackPreview(order) {
        const score = document.getElementById("feedbackScore");
        const note = document.getElementById("feedbackNote");
        const rating = Number(order?.customer_rating || 0);
        if (score) {
            score.textContent = `${rating || 0}/5`;
        }
        if (note) {
            note.textContent = normalizeText(order?.customer_feedback) || "Chưa có phản hồi từ khách hàng.";
        }
    }

    function setProviderReportPreview(order) {
        const status = document.getElementById("providerReportStatus");
        const note = document.getElementById("providerReportNote");
        const providerNote = normalizeText(order?.provider_note);
        const hasMedia = Boolean((order?.provider_images || []).length || (order?.provider_videos || []).length);
        const hasReport = Boolean(providerNote || hasMedia);

        if (status) {
            status.textContent = hasReport ? "Đã gửi" : "Chưa có";
        }
        if (note) {
            note.textContent = providerNote || "Chưa có báo cáo từ nhà cung cấp.";
        }
    }

    function showOrderModal(id = "") {
        const form = document.getElementById("orderForm");
        const order = state.allOrders.find((item) => String(item.id) === String(id)) || null;
        form.reset();
        document.getElementById("orderId").value = id || "";
        document.getElementById("modalTitle").textContent = order ? `Điều phối ${order.display_code}` : "Tạo đơn nội bộ";
        populateProviderSelects();

        const fields = {
            ma_yeu_cau_noi_bo: order?.ma_yeu_cau_noi_bo || "",
            ho_ten: order?.ho_ten || "",
            so_dien_thoai: order?.so_dien_thoai || "",
            customer_email: order?.customer_email || "",
            ten_cong_ty: order?.ten_cong_ty || "",
            loai_dich_vu: order?.loai_dich_vu || "chuyen-nha",
            can_khao_sat_truoc: order?.survey_first ? "1" : normalizeText(order?.can_khao_sat_truoc) || "0",
            chi_tiet_dich_vu: order?.chi_tiet_dich_vu || "",
            trang_thai: order?.trang_thai || "moi",
            ngay_thuc_hien: toDateInputValue(order?.ngay_thuc_hien),
            khung_gio_thuc_hien: order?.khung_gio_thuc_hien || "",
            loai_xe: order?.loai_xe || "",
            thoi_tiet_du_kien: order?.thoi_tiet_du_kien || "",
            khoang_cach_km: order?.khoang_cach_km || "",
            dieu_kien_tiep_can: order?.dieu_kien_tiep_can || "",
            dia_chi_di: order?.dia_chi_di || "",
            dia_chi_den: order?.dia_chi_den || "",
            tong_tam_tinh: order?.tong_tam_tinh || "",
            tong_tien: order?.tong_tien || "",
            provider_id: order?.provider_id || "",
            accepted_at: toDateTimeLocalValue(order?.accepted_at),
            started_at: toDateTimeLocalValue(order?.started_at),
            completed_at: toDateTimeLocalValue(order?.completed_at),
            cancelled_at: toDateTimeLocalValue(order?.cancelled_at),
            cancel_reason: order?.cancel_reason || "",
            ghi_chu: order?.ghi_chu || "",
            note_admin: order?.note_admin || "",
            du_lieu_form_json: order?.du_lieu_form_json ? JSON.stringify(parseJsonObject(order.du_lieu_form_json), null, 2) : "",
            pricing_breakdown_json: order?.pricing_breakdown_json ? JSON.stringify(parsePricingJson(order.pricing_breakdown_json), null, 2) : "",
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
            }
        });

        renderMediaPreview("orderMediaPreview", [...(order?.booking_images || []), ...(order?.booking_videos || [])], "Không có media từ form đặt lịch.");
        renderMediaPreview("feedbackMediaPreview", [...(order?.feedback_images || []), ...(order?.feedback_videos || [])], "Chưa có media feedback.");
        renderMediaPreview("providerMediaPreview", [...(order?.provider_images || []), ...(order?.provider_videos || [])], "Chưa có media hiện trường từ nhà cung cấp.");
        setFeedbackPreview(order || {});
        setProviderReportPreview(order || {});

        document.getElementById("orderModal").style.display = "flex";
    }

    function parsePricingJson(value) {
        const raw = normalizeText(value);
        if (!raw) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function closeModal() {
        document.getElementById("orderModal").style.display = "none";
    }

    function buildLifecyclePayload(data, existingOrder) {
        const now = new Date().toISOString();
        const payload = { ...data };
        const status = normalizeText(payload.trang_thai);

        if (status === "dang_xu_ly" && !payload.accepted_at) {
            payload.accepted_at = existingOrder?.accepted_at || now;
        }
        if (status === "dang_trien_khai") {
            payload.accepted_at = payload.accepted_at || existingOrder?.accepted_at || now;
            payload.started_at = payload.started_at || existingOrder?.started_at || now;
        }
        if (status === "da_xac_nhan") {
            payload.accepted_at = payload.accepted_at || existingOrder?.accepted_at || now;
            payload.started_at = payload.started_at || existingOrder?.started_at || now;
            payload.completed_at = payload.completed_at || existingOrder?.completed_at || now;
        }
        if (status === "da_huy") {
            payload.cancelled_at = payload.cancelled_at || existingOrder?.cancelled_at || now;
        }

        if (!payload.provider_id) {
            payload.provider_id = "";
        }

        return payload;
    }

    function readJsonTextarea(fieldId, label, fallback = "") {
        const raw = document.getElementById(fieldId)?.value || "";
        const normalized = raw.trim();
        if (!normalized) {
            return fallback;
        }

        try {
            return JSON.stringify(JSON.parse(normalized));
        } catch (error) {
            throw new Error(`${label} không phải JSON hợp lệ.`);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const id = document.getElementById("orderId").value;
        const saveButton = document.getElementById("btnSave");
        const existingOrder = state.allOrders.find((item) => String(item.id) === String(id)) || null;
        const nowIso = new Date().toISOString();

        const payload = {
            ma_yeu_cau_noi_bo: normalizeText(document.getElementById("ma_yeu_cau_noi_bo").value),
            ho_ten: normalizeText(document.getElementById("ho_ten").value),
            so_dien_thoai: normalizeText(document.getElementById("so_dien_thoai").value),
            customer_email: normalizeText(document.getElementById("customer_email").value),
            ten_cong_ty: normalizeText(document.getElementById("ten_cong_ty").value),
            loai_dich_vu: normalizeText(document.getElementById("loai_dich_vu").value),
            can_khao_sat_truoc: normalizeText(document.getElementById("can_khao_sat_truoc").value) || "0",
            chi_tiet_dich_vu: normalizeText(document.getElementById("chi_tiet_dich_vu").value),
            trang_thai: normalizeText(document.getElementById("trang_thai").value),
            ngay_thuc_hien: normalizeText(document.getElementById("ngay_thuc_hien").value),
            khung_gio_thuc_hien: normalizeText(document.getElementById("khung_gio_thuc_hien").value),
            loai_xe: normalizeText(document.getElementById("loai_xe").value),
            thoi_tiet_du_kien: normalizeText(document.getElementById("thoi_tiet_du_kien").value),
            khoang_cach_km: Number(document.getElementById("khoang_cach_km").value || 0),
            dieu_kien_tiep_can: normalizeText(document.getElementById("dieu_kien_tiep_can").value),
            dia_chi_di: normalizeText(document.getElementById("dia_chi_di").value),
            dia_chi_den: normalizeText(document.getElementById("dia_chi_den").value),
            tong_tam_tinh: Number(document.getElementById("tong_tam_tinh").value || 0),
            tong_tien: Number(document.getElementById("tong_tien").value || 0),
            provider_id: normalizeText(document.getElementById("provider_id").value),
            accepted_at: fromDateTimeLocalValue(document.getElementById("accepted_at").value),
            started_at: fromDateTimeLocalValue(document.getElementById("started_at").value),
            completed_at: fromDateTimeLocalValue(document.getElementById("completed_at").value),
            cancelled_at: fromDateTimeLocalValue(document.getElementById("cancelled_at").value),
            cancel_reason: normalizeText(document.getElementById("cancel_reason").value),
            ghi_chu: normalizeText(document.getElementById("ghi_chu").value),
            note_admin: normalizeText(document.getElementById("note_admin").value),
            du_lieu_form_json: readJsonTextarea("du_lieu_form_json", "du_lieu_form_json", existingOrder?.du_lieu_form_json || ""),
            pricing_breakdown_json: readJsonTextarea("pricing_breakdown_json", "pricing_breakdown_json", existingOrder?.pricing_breakdown_json || ""),
            updated_at: nowIso,
        };

        if (!payload.ho_ten || !payload.so_dien_thoai) {
            showToast("Tên khách hàng và số điện thoại là bắt buộc.", "danger");
            return;
        }

        const finalPayload = buildLifecyclePayload(payload, existingOrder);
        const originalHtml = saveButton.innerHTML;

        try {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Đang lưu...';

            if (id) {
                await window.adminApi.update(window.adminApi.ORDERS_TABLE, finalPayload, id);
                showToast("Đã cập nhật điều phối đơn hàng.");
            } else {
                if (!finalPayload.ma_yeu_cau_noi_bo) {
                    finalPayload.ma_yeu_cau_noi_bo = `CDL-${Date.now()}`;
                }
                finalPayload.created_at = nowIso;
                await window.adminApi.insert(window.adminApi.ORDERS_TABLE, finalPayload);
                showToast("Đã tạo đơn hàng nội bộ.");
            }

            closeModal();
            await fetchOrders();
        } catch (error) {
            showToast(error?.message || "Không thể lưu đơn hàng.", "danger");
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = originalHtml;
        }
    }

    function handleSearch(value) {
        state.filters.search = normalizeText(value);
        applyFilters();
    }

    function handleFilterChange() {
        state.filters.status = document.getElementById("statusFilter") ? document.getElementById("statusFilter").value : "";
        state.filters.service = document.getElementById("serviceFilter") ? document.getElementById("serviceFilter").value : "";
        state.filters.provider = document.getElementById("providerFilter") ? document.getElementById("providerFilter").value : "";
        state.filters.survey = document.getElementById("surveyFilter") ? document.getElementById("surveyFilter").value : "";
        state.filters.alert = document.getElementById("alertFilter") ? document.getElementById("alertFilter").value : "";
        state.filters.feedback = document.getElementById("feedbackFilter") ? document.getElementById("feedbackFilter").value : "";
        applyFilters();
    }

    function handleTabFilter(statusKey) {
        state.filters.status = statusKey;
        state.currentPage = 1; // Reset về trang 1 khi đổi tab
        document.querySelectorAll(".nav-pills .order-chip--tab").forEach((el) => {
            el.classList.remove("order-chip--tab-active");
        });
        
        let activeId = 'tab-all';
        if (statusKey === 'pending') activeId = 'tab-pending';
        if (statusKey === 'active') activeId = 'tab-active';
        if (statusKey === 'completed') activeId = 'tab-completed';
        if (statusKey === 'cancelled') activeId = 'tab-cancelled';
        
        const activeTab = document.getElementById(activeId);
        if (activeTab) {
            activeTab.classList.add("order-chip--tab-active");
        }
        
        fetchOrders(); // Re-fetch from API for the new tab
    }

    function clearFilter(key) {
        state.filters[key] = "";
        if (key === "search") {
            document.getElementById("orderSearchInput").value = "";
        }
        if (key === "status") {
            document.getElementById("statusFilter").value = "";
        }
        if (key === "service") {
            document.getElementById("serviceFilter").value = "";
        }
        if (key === "provider") {
            document.getElementById("providerFilter").value = "";
        }
        if (key === "survey") {
            document.getElementById("surveyFilter").value = "";
        }
        if (key === "alert") {
            document.getElementById("alertFilter").value = "";
        }
        if (key === "feedback") {
            document.getElementById("feedbackFilter").value = "";
        }
        applyFilters();
    }

    function handleDelete(id) {
        state.orderIdToDelete = id;
        const modal = document.getElementById("confirmDeleteModal");
        const confirmButton = document.getElementById("confirmDeleteBtn");
        confirmButton.onclick = async function () {
            confirmButton.disabled = true;
            confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Đang xóa...';
            try {
                await window.adminApi.delete(window.adminApi.ORDERS_TABLE, state.orderIdToDelete);
                showToast("Đã xóa đơn hàng.");
                closeDeleteModal();
                await fetchOrders();
            } catch (error) {
                showToast(error?.message || "Không thể xóa đơn hàng.", "danger");
            } finally {
                confirmButton.disabled = false;
                confirmButton.innerHTML = '<i class="fas fa-trash-alt"></i>Xóa vĩnh viễn';
            }
        };
        modal.style.display = "flex";
    }

    function closeDeleteModal() {
        state.orderIdToDelete = null;
        document.getElementById("confirmDeleteModal").style.display = "none";
    }

    function showToast(message, type = "success") {
        const container = document.getElementById("toastContainer");
        if (!container) {
            return;
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        const icon = type === "danger" ? "fa-circle-exclamation" : "fa-circle-check";
        toast.innerHTML = `<i class="fas ${icon} toast-icon"></i><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%)";
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }

    document.addEventListener("DOMContentLoaded", fetchOrders);

    return {
        fetchOrders,
        handleSearch,
        handleFilterChange,
        handleTabFilter,
        changePage,
        clearFilter,
        showOrderModal,
        closeModal,
        handleSubmit,
        handleDelete,
        closeDeleteModal,
    };
})();
