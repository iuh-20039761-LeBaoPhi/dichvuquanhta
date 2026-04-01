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
    <title>Quản lý đơn hàng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .orders-shell {
            display: grid;
            grid-template-columns: minmax(0, 1.9fr) 320px;
            gap: 24px;
            align-items: start;
        }

        .orders-hero {
            padding: 24px;
            border-radius: 24px;
            color: #fff;
            background:
                radial-gradient(circle at top right, rgba(255, 122, 0, 0.15), transparent 24%),
                linear-gradient(135deg, #08214f 0%, #0a2a66 60%, #123b87 100%);
            box-shadow: 0 18px 40px rgba(10, 42, 102, 0.16);
        }

        .orders-hero h3 {
            margin: 0 0 10px;
            font-size: 30px;
            line-height: 1.12;
        }

        .orders-hero p {
            margin: 0;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
        }

        .orders-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
        }

        .orders-stat {
            padding: 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .orders-stat small {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: rgba(255, 255, 255, 0.72);
            font-weight: 800;
        }

        .orders-stat strong {
            font-size: 26px;
            line-height: 1;
        }

        .orders-table-card {
            padding: 0;
            overflow: hidden;
        }

        .orders-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 22px;
            border-bottom: 1px solid #edf2f7;
        }

        .orders-card-header h3 {
            margin: 0;
            color: #0a2a66;
            font-size: 18px;
        }

        .orders-card-header p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 13px;
        }

        .orders-toolbar-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 999px;
            background: #f8fbff;
            border: 1px solid #d9e5ff;
            color: #355086;
            font-weight: 800;
            font-size: 13px;
        }

        .orders-empty,
        .orders-loading {
            padding: 32px 24px;
            text-align: center;
            color: #64748b;
            font-weight: 600;
        }

        .orders-pagination {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            padding: 18px 22px 24px;
            border-top: 1px solid #edf2f7;
        }

        .orders-page-btn {
            min-width: 38px;
            height: 38px;
            padding: 0 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            border: 1px solid #d9e5ff;
            background: #f8fbff;
            color: #355086;
            font-weight: 800;
            cursor: pointer;
        }

        .orders-page-btn.is-active {
            background: #0a2a66;
            border-color: #0a2a66;
            color: #fff;
        }

        .orders-page-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
        }

        .orders-filter-card {
            position: sticky;
            top: 100px;
        }

        .orders-filter-actions {
            display: grid;
            gap: 10px;
            margin-top: 10px;
        }

        .orders-ref {
            font-size: 11px;
            color: #28a745;
            font-weight: 700;
        }

        .orders-payment-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
        }

        .orders-payment-pill.is-paid {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }

        .orders-payment-pill.is-unpaid {
            background: #fff3e0;
            color: #e65100;
            border: 1px solid #ffe0b2;
        }

        @media (max-width: 1200px) {
            .orders-shell {
                grid-template-columns: 1fr;
            }

            .orders-filter-card {
                position: static;
            }
        }

        @media (max-width: 900px) {
            .orders-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 640px) {
            .orders-grid {
                grid-template-columns: 1fr;
            }

            .orders-hero h3 {
                font-size: 26px;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý đơn hàng</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <section class="orders-hero">
            <h3>Điều hành toàn bộ đơn hàng trên một luồng dữ liệu</h3>
            <p>Bảng này đọc trực tiếp từ API quản trị, giúp lọc đơn, theo dõi trạng thái và mở nhanh trang chi tiết để kiểm soát tiến độ.</p>
            <div class="orders-grid">
                <div class="orders-stat">
                    <small>Tổng đơn</small>
                    <strong id="orders-stat-total">0</strong>
                </div>
                <div class="orders-stat">
                    <small>Chờ xử lý</small>
                    <strong id="orders-stat-pending">0</strong>
                </div>
                <div class="orders-stat">
                    <small>Đang giao</small>
                    <strong id="orders-stat-shipping">0</strong>
                </div>
                <div class="orders-stat">
                    <small>Hoàn tất</small>
                    <strong id="orders-stat-completed">0</strong>
                </div>
                <div class="orders-stat">
                    <small>Đã hủy</small>
                    <strong id="orders-stat-cancelled">0</strong>
                </div>
            </div>
        </section>

        <div class="orders-shell" style="margin-top: 24px;">
            <section class="admin-card orders-table-card">
                <div class="orders-card-header">
                    <div>
                        <h3>Danh sách đơn hàng</h3>
                        <p id="orders-summary">Đang tải dữ liệu từ API...</p>
                    </div>
                    <div class="orders-toolbar-badge">
                        <i class="fa-solid fa-database"></i>
                        <span>JSON API</span>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Mã đơn / KH</th>
                                <th>Người gửi / Nhận</th>
                                <th>Lịch / Dịch vụ</th>
                                <th>Thanh toán</th>
                                <th>Trạng thái</th>
                                <th style="text-align: right;">Hành động</th>
                            </tr>
                        </thead>
                        <tbody id="orders-table-body">
                            <tr>
                                <td colspan="6" class="orders-loading">Đang tải danh sách đơn hàng...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="orders-pagination" class="orders-pagination" hidden></div>
            </section>

            <aside class="admin-card orders-filter-card">
                <h3 style="font-size: 16px; margin-bottom: 20px; color: #0a2a66; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-filter"></i> Bộ lọc nâng cao
                </h3>
                <form id="orders-filter-form" class="form-grid" style="grid-template-columns: 1fr;">
                    <div class="form-group">
                        <label for="orders-search">Tìm kiếm</label>
                        <input id="orders-search" type="text" name="search" placeholder="Mã đơn, tên, SĐT..." class="admin-input">
                    </div>
                    <div class="form-group">
                        <label for="orders-date-from">Từ ngày</label>
                        <input id="orders-date-from" type="date" name="date_from" class="admin-input">
                    </div>
                    <div class="form-group">
                        <label for="orders-date-to">Đến ngày</label>
                        <input id="orders-date-to" type="date" name="date_to" class="admin-input">
                    </div>
                    <div class="form-group">
                        <label for="orders-status">Trạng thái</label>
                        <select id="orders-status" name="status" class="admin-select">
                            <option value="">-- Tất cả --</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="shipping">Đang giao</option>
                            <option value="completed">Hoàn tất</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="orders-issue">Vấn đề khác</label>
                        <select id="orders-issue" name="issue" class="admin-select">
                            <option value="">-- Tất cả --</option>
                            <option value="has_admin_note">Có ghi chú Admin</option>
                        </select>
                    </div>
                    <div class="orders-filter-actions">
                        <button type="submit" class="btn-primary" style="justify-content: center;">
                            <i class="fa-solid fa-magnifying-glass"></i> Áp dụng lọc
                        </button>
                        <button type="button" id="orders-reset-btn" class="btn-secondary" style="justify-content: center;">
                            <i class="fa-solid fa-rotate-left"></i> Xóa bộ lọc
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
        (function () {
            const ordersTable = "giaohangnhanh_dat_lich";
            const detailBaseUrl = "order_detail.php?code=";
            const tbody = document.getElementById("orders-table-body");
            const summary = document.getElementById("orders-summary");
            const pagination = document.getElementById("orders-pagination");
            const form = document.getElementById("orders-filter-form");
            const resetBtn = document.getElementById("orders-reset-btn");
            const statTotal = document.getElementById("orders-stat-total");
            const statPending = document.getElementById("orders-stat-pending");
            const statShipping = document.getElementById("orders-stat-shipping");
            const statCompleted = document.getElementById("orders-stat-completed");
            const statCancelled = document.getElementById("orders-stat-cancelled");
            const defaultLimit = 10;

            function escapeHtml(value) {
                return String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function formatMoney(value) {
                return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
            }

            function formatDate(value) {
                if (!value) return "N/A";
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return escapeHtml(value);
                return date.toLocaleDateString("vi-VN");
            }

            function formatDateValue(value) {
                if (!value) return "";
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return "";
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }

            function normalizeText(value) {
                return String(value || "").replace(/\s+/g, " ").trim();
            }

            function normalizePhone(value) {
                return String(value || "").replace(/[^\d]/g, "");
            }

            function getListFn() {
                if (typeof window.krudList === "function") {
                    return (payload) => window.krudList(payload);
                }

                if (typeof window.crud === "function") {
                    return (payload) => window.crud("list", payload.table, {
                        p: payload.page || 1,
                        limit: payload.limit || 200,
                    });
                }

                if (typeof window.krud === "function") {
                    return (payload) => window.krud("list", payload.table, {
                        p: payload.page || 1,
                        limit: payload.limit || 200,
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

            function normalizeStatus(rawStatus) {
                const normalized = String(rawStatus || "").trim().toLowerCase();
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

            function getStatusLabel(status) {
                const map = {
                    pending: "Chờ xử lý",
                    shipping: "Đang giao",
                    completed: "Hoàn tất",
                    cancelled: "Đã hủy",
                };
                return map[status] || "Chờ xử lý";
            }

            function getServiceLabel(value) {
                const normalized = String(value || "").trim().toLowerCase();
                const map = {
                    standard: "Tiêu chuẩn",
                    fast: "Nhanh",
                    express: "Hỏa tốc",
                    instant: "Ngay lập tức",
                    giao_tieu_chuan: "Tiêu chuẩn",
                    giao_nhanh: "Nhanh",
                    giao_hoa_toc: "Hỏa tốc",
                    giao_ngay_lap_tuc: "Ngay lập tức",
                    tieuchuan: "Tiêu chuẩn",
                    nhanh: "Nhanh",
                    hoatoc: "Hỏa tốc",
                    laptuc: "Ngay lập tức",
                };
                return map[normalized] || normalizeText(value) || "Chưa rõ";
            }

            function getPaymentStatusLabel(amount, status) {
                if (Number(amount || 0) <= 0) return "Không COD";
                return status === "completed" ? "Đã đối soát" : "Chưa hoàn tất";
            }

            function normalizeKrudOrder(row) {
                const status = normalizeStatus(row.trang_thai || row.status);
                const orderCode = normalizeText(
                    row.ma_don_hang_noi_bo || row.order_code || row.ma_don_hang || row.id,
                );
                const createdAt = row.created_at || row.created_date || "";
                const codAmount = Number(row.gia_tri_thu_ho_cod || row.cod_amount || row.cod_value || 0);
                const shippingFee = Number(row.tong_cuoc || row.shipping_fee || row.total_fee || 0);

                return {
                    id: row.id || "",
                    order_code: orderCode,
                    client_order_code: normalizeText(row.ma_khach_tham_chieu || row.client_order_code || ""),
                    sender_name: normalizeText(row.ho_ten_nguoi_gui || row.nguoi_gui_ho_ten || ""),
                    sender_phone: normalizePhone(row.so_dien_thoai_nguoi_gui || row.nguoi_gui_so_dien_thoai || row.sender_phone || ""),
                    receiver_name: normalizeText(row.ho_ten_nguoi_nhan || row.nguoi_nhan_ho_ten || ""),
                    receiver_phone: normalizePhone(row.so_dien_thoai_nguoi_nhan || row.nguoi_nhan_so_dien_thoai || row.receiver_phone || ""),
                    pickup_time: row.ngay_lay_hang || row.pickup_time || createdAt,
                    service_label: normalizeText(row.ten_dich_vu) || getServiceLabel(row.dich_vu || row.service_type),
                    shipping_fee: shippingFee,
                    payment_status: codAmount > 0 && status === "completed" ? "paid" : "unpaid",
                    payment_status_label: normalizeText(row.payment_status_label) || getPaymentStatusLabel(codAmount, status),
                    status,
                    status_label: normalizeText(row.status_label) || getStatusLabel(status),
                    has_admin_note: Boolean(normalizeText(row.ghi_chu_admin || row.ghi_chu_quan_tri || row.admin_note)),
                    created_at: createdAt,
                };
            }

            async function listOrdersFromKrud() {
                const listFn = getListFn();
                if (!listFn) {
                    throw new Error("Không tìm thấy hàm KRUD list.");
                }

                const response = await listFn({
                    table: ordersTable,
                    sort: { id: "desc" },
                    page: 1,
                    limit: 500,
                });

                return extractRows(response).map(normalizeKrudOrder);
            }

            function getParamsFromLocation() {
                const params = new URLSearchParams(window.location.search);
                return {
                    search: params.get("search") || "",
                    date_from: params.get("date_from") || "",
                    date_to: params.get("date_to") || "",
                    status: params.get("status") || "",
                    issue: params.get("issue") || "",
                    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
                };
            }

            function syncForm(params) {
                form.search.value = params.search;
                form.date_from.value = params.date_from;
                form.date_to.value = params.date_to;
                form.status.value = params.status;
                form.issue.value = params.issue;
            }

            function updateUrl(params) {
                const url = new URL(window.location.href);
                url.searchParams.set("page", String(params.page || 1));
                if (params.search) url.searchParams.set("search", params.search);
                else url.searchParams.delete("search");
                if (params.date_from) url.searchParams.set("date_from", params.date_from);
                else url.searchParams.delete("date_from");
                if (params.date_to) url.searchParams.set("date_to", params.date_to);
                else url.searchParams.delete("date_to");
                if (params.status) url.searchParams.set("status", params.status);
                else url.searchParams.delete("status");
                if (params.issue) url.searchParams.set("issue", params.issue);
                else url.searchParams.delete("issue");
                window.history.replaceState({}, "", url.toString());
            }

            function renderStats(stats) {
                statTotal.textContent = (stats.total || 0).toLocaleString("vi-VN");
                statPending.textContent = ((stats.by_status && stats.by_status.pending) || 0).toLocaleString("vi-VN");
                statShipping.textContent = ((stats.by_status && stats.by_status.shipping) || 0).toLocaleString("vi-VN");
                statCompleted.textContent = ((stats.by_status && stats.by_status.completed) || 0).toLocaleString("vi-VN");
                statCancelled.textContent = ((stats.by_status && stats.by_status.cancelled) || 0).toLocaleString("vi-VN");
            }

            function applyOrderFilters(orders, params) {
                const search = normalizeText(params.search).toLowerCase();
                const dateFrom = params.date_from || "";
                const dateTo = params.date_to || "";

                return (Array.isArray(orders) ? orders : []).filter((order) => {
                    if (search) {
                        const haystack = [
                            order.order_code,
                            order.client_order_code,
                            order.sender_name,
                            order.sender_phone,
                            order.receiver_name,
                            order.receiver_phone,
                        ]
                            .map((value) => String(value || "").toLowerCase())
                            .join(" ");
                        if (!haystack.includes(search)) return false;
                    }

                    if (params.status && order.status !== params.status) {
                        return false;
                    }

                    if (params.issue === "has_admin_note" && !order.has_admin_note) {
                        return false;
                    }

                    const orderDate = formatDateValue(order.created_at || order.pickup_time);
                    if (dateFrom && orderDate && orderDate < dateFrom) {
                        return false;
                    }
                    if (dateTo && orderDate && orderDate > dateTo) {
                        return false;
                    }
                    if ((dateFrom || dateTo) && !orderDate) {
                        return false;
                    }

                    return true;
                });
            }

            function buildStats(orders) {
                return orders.reduce((acc, order) => {
                    acc.total += 1;
                    if (acc.by_status[order.status] != null) {
                        acc.by_status[order.status] += 1;
                    }
                    return acc;
                }, {
                    total: 0,
                    by_status: {
                        pending: 0,
                        shipping: 0,
                        completed: 0,
                        cancelled: 0,
                    },
                });
            }

            function renderOrders(orders) {
                if (!Array.isArray(orders) || !orders.length) {
                    tbody.innerHTML = '<tr><td colspan="6" class="orders-empty">Không có đơn hàng nào khớp với bộ lọc.</td></tr>';
                    return;
                }

                tbody.innerHTML = orders.map((order) => {
                    const paymentClass = order.payment_status === "paid" ? "is-paid" : "is-unpaid";
                    return `
                        <tr>
                            <td data-label="Mã đơn / KH">
                                <div style="font-weight:700; color:#0a2a66;">#${escapeHtml(order.order_code)}</div>
                                ${order.client_order_code ? `<div class="orders-ref">Ref: ${escapeHtml(order.client_order_code)}</div>` : ""}
                            </td>
                            <td data-label="Người gửi / Nhận">
                                <div style="font-size:13px; margin-bottom:4px;">
                                    <i class="fa-solid fa-arrow-up-from-bracket" style="width:16px; color:#64748b;"></i> ${escapeHtml(order.sender_name)}
                                </div>
                                <div style="font-size:13px;">
                                    <i class="fa-solid fa-arrow-down-to-bracket" style="width:16px; color:#ff7a00;"></i> ${escapeHtml(order.receiver_name)}
                                </div>
                            </td>
                            <td data-label="Lịch / Dịch vụ">
                                <div style="font-size:12px; color:#64748b;">
                                    <i class="fa-regular fa-calendar-alt" style="width:16px;"></i> ${formatDate(order.pickup_time)}
                                </div>
                                <div style="font-size:12px; font-weight:700; color:#ff7a00; margin-top:2px;">
                                    <i class="fa-solid fa-bolt" style="width:16px;"></i> ${escapeHtml(order.service_label)}
                                </div>
                            </td>
                            <td data-label="Thanh toán">
                                <div style="font-size:13px; font-weight:700; color:#0a2a66; margin-bottom:4px;">${formatMoney(order.shipping_fee)}</div>
                                <span class="orders-payment-pill ${paymentClass}">${escapeHtml(order.payment_status_label)}</span>
                            </td>
                            <td data-label="Trạng thái">
                                <span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(order.status_label)}</span>
                            </td>
                            <td data-label="Hành động" style="text-align:right;">
                                <a href="${detailBaseUrl}${encodeURIComponent(order.order_code)}" class="btn-sm btn-view-site-pill" style="background:rgba(10,42,102,0.05); color:#0a2a66; display:inline-flex; align-items:center; gap:5px; width:100%; justify-content:center;">
                                    <i class="fa-solid fa-eye"></i> Xem chi tiết
                                </a>
                            </td>
                        </tr>
                    `;
                }).join("");
            }

            function renderPagination(meta, currentParams) {
                pagination.innerHTML = "";
                const totalPages = Number(meta.total_pages || 0);
                if (totalPages <= 1) {
                    pagination.hidden = true;
                    return;
                }

                pagination.hidden = false;

                function makeButton(label, page, active) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = `orders-page-btn${active ? " is-active" : ""}`;
                    button.textContent = label;
                    if (!active) {
                        button.addEventListener("click", () => loadOrders({ ...currentParams, page }));
                    } else {
                        button.disabled = true;
                    }
                    return button;
                }

                const currentPage = Number(meta.page || 1);
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, currentPage + 2);

                pagination.appendChild(makeButton("‹", Math.max(1, currentPage - 1), false));
                for (let page = start; page <= end; page += 1) {
                    pagination.appendChild(makeButton(String(page), page, page === currentPage));
                }
                pagination.appendChild(makeButton("›", Math.min(totalPages, currentPage + 1), false));
            }

            async function loadOrders(params) {
                syncForm(params);
                updateUrl(params);
                summary.textContent = "Đang tải dữ liệu từ KRUD...";
                tbody.innerHTML = '<tr><td colspan="6" class="orders-loading">Đang tải danh sách đơn hàng...</td></tr>';
                pagination.hidden = true;

                try {
                    const allOrders = await listOrdersFromKrud();
                    const filteredOrders = applyOrderFilters(allOrders, params);
                    const stats = buildStats(filteredOrders);
                    const totalRecords = filteredOrders.length;
                    const currentPage = Math.max(1, Number(params.page || 1));
                    const totalPages = Math.max(1, Math.ceil(totalRecords / defaultLimit));
                    const safePage = Math.min(currentPage, totalPages);
                    const startIndex = (safePage - 1) * defaultLimit;
                    const pageOrders = filteredOrders.slice(startIndex, startIndex + defaultLimit);

                    renderStats(stats);
                    renderOrders(pageOrders);
                    renderPagination({
                        page: safePage,
                        total_pages: totalPages,
                    }, { ...params, page: safePage });

                    summary.textContent = `Hiển thị ${pageOrders.length.toLocaleString("vi-VN")} đơn trên tổng ${totalRecords.toLocaleString("vi-VN")} đơn. Trang ${safePage}/${totalPages}.`;
                } catch (error) {
                    summary.textContent = "Không tải được dữ liệu.";
                    tbody.innerHTML = `<tr><td colspan="6" class="orders-empty">${escapeHtml(error.message || "Không thể tải dữ liệu đơn hàng từ KRUD.")}</td></tr>`;
                    pagination.hidden = true;
                }
            }

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                loadOrders({
                    search: form.search.value.trim(),
                    date_from: form.date_from.value,
                    date_to: form.date_to.value,
                    status: form.status.value,
                    issue: form.issue.value,
                    page: 1,
                });
            });

            resetBtn.addEventListener("click", () => {
                loadOrders({ search: "", date_from: "", date_to: "", status: "", issue: "", page: 1 });
            });

            loadOrders(getParamsFromLocation());
        })();
    </script>
</body>
</html>


