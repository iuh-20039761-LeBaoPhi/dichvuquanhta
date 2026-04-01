<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$requestedCode = trim((string) ($_GET['code'] ?? ''));
$requestedId = trim((string) ($_GET['id'] ?? ''));
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Chi tiết đơn hàng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .detail-shell {
            display: grid;
            gap: 24px;
        }

        .detail-hero,
        .detail-card {
            background: #fff;
            border: 1px solid #dbe7ff;
            border-radius: 24px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
        }

        .detail-hero {
            padding: 24px;
            color: #fff;
            background:
                radial-gradient(circle at top right, rgba(255, 122, 0, 0.18), transparent 24%),
                linear-gradient(135deg, #08214f 0%, #0a2a66 62%, #123b87 100%);
        }

        .detail-hero-head {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .detail-hero h1 {
            margin: 0 0 10px;
            font-size: 32px;
            line-height: 1.08;
        }

        .detail-hero p {
            margin: 0;
            color: rgba(255, 255, 255, 0.82);
            line-height: 1.6;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .hero-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
        }

        .hero-stat {
            padding: 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .hero-stat small {
            display: block;
            margin-bottom: 8px;
            color: rgba(255, 255, 255, 0.72);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 800;
        }

        .hero-stat strong {
            font-size: 24px;
            line-height: 1.12;
        }

        .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
        }

        .detail-card {
            padding: 22px;
        }

        .detail-card h3 {
            margin: 0 0 18px;
            color: #0a2a66;
            font-size: 22px;
        }

        .detail-meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .detail-item {
            padding: 14px 16px;
            border-radius: 16px;
            background: #f8fbff;
            border: 1px solid #e3ecfb;
        }

        .detail-item small {
            display: block;
            margin-bottom: 8px;
            color: #7d93b8;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 800;
        }

        .detail-item strong,
        .detail-item span {
            display: block;
            color: #102a43;
            font-size: 17px;
            line-height: 1.45;
            font-weight: 800;
            word-break: break-word;
        }

        .detail-route {
            display: grid;
            gap: 14px;
        }

        .detail-route-block {
            padding: 16px 18px;
            border-radius: 18px;
            background: #f8fbff;
            border: 1px solid #e3ecfb;
        }

        .detail-route-block small {
            display: block;
            margin-bottom: 8px;
            color: #6b85b4;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 800;
        }

        .detail-route-block strong {
            display: block;
            color: #102a43;
            font-size: 18px;
            line-height: 1.55;
        }

        .detail-note {
            margin-top: 14px;
            padding: 14px 16px;
            border-radius: 16px;
            background: #fff8ed;
            border: 1px solid #ffe0b3;
            color: #8a5a00;
            line-height: 1.7;
            font-weight: 600;
        }

        .detail-empty,
        .detail-loading,
        .detail-error,
        .detail-admin-note {
            padding: 26px 24px;
            border-radius: 20px;
            text-align: center;
            font-weight: 700;
            line-height: 1.7;
        }

        .detail-loading,
        .detail-empty {
            background: #fff;
            border: 1px dashed #dbe7ff;
            color: #64748b;
        }

        .detail-error {
            background: #fff5f5;
            border: 1px solid #fecaca;
            color: #b91c1c;
        }

        .detail-admin-note {
            background: #fffbea;
            border: 1px solid #fde68a;
            color: #92400e;
        }

        .detail-logs {
            display: grid;
            gap: 12px;
        }

        .detail-log {
            padding: 14px 16px;
            border-radius: 16px;
            background: #f8fbff;
            border: 1px solid #e3ecfb;
        }

        .detail-log small {
            display: block;
            margin-bottom: 6px;
            color: #6b7280;
            font-weight: 700;
        }

        .detail-log strong {
            display: block;
            color: #102a43;
            font-size: 16px;
        }

        @media (max-width: 1100px) {
            .hero-grid,
            .detail-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 760px) {
            .hero-grid,
            .detail-grid,
            .detail-meta-grid {
                grid-template-columns: 1fr;
            }

            .detail-hero h1 {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Chi tiết đơn hàng</h2>
            <a href="orders_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quay lại danh sách</a>
        </div>

        <div id="admin-order-detail" class="detail-shell">
            <div class="detail-loading">
                <i class="fa-solid fa-spinner fa-spin"></i> Đang tải chi tiết đơn hàng từ KRUD...
            </div>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
        (function () {
            const tableName = "giaohangnhanh_dat_lich";
            const requestedCode = <?php echo json_encode($requestedCode, JSON_UNESCAPED_UNICODE); ?>;
            const requestedId = <?php echo json_encode($requestedId, JSON_UNESCAPED_UNICODE); ?>;
            const root = document.getElementById("admin-order-detail");

            function escapeHtml(value) {
                return String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function normalizeText(value) {
                return String(value || "").replace(/\s+/g, " ").trim();
            }

            function formatMoney(value) {
                return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
            }

            function formatDateTime(value, fallback = "Chưa cập nhật") {
                const raw = normalizeText(value);
                if (!raw) return fallback;
                const date = new Date(raw);
                if (Number.isNaN(date.getTime())) return escapeHtml(raw);
                return date.toLocaleString("vi-VN");
            }

            function normalizeStatus(rawStatus) {
                const normalized = String(rawStatus || "").trim().toLowerCase();
                if (["completed", "hoan_tat", "hoàn tất", "success", "delivered"].includes(normalized)) return "completed";
                if (["shipping", "dang_giao", "đang giao", "in_transit"].includes(normalized)) return "shipping";
                if (["cancelled", "canceled", "da_huy", "đã hủy"].includes(normalized)) return "cancelled";
                return "pending";
            }

            function statusLabel(status) {
                const map = {
                    pending: "Chờ xử lý",
                    shipping: "Đang giao",
                    completed: "Hoàn tất",
                    cancelled: "Đã hủy",
                };
                return map[status] || "Chờ xử lý";
            }

            function serviceLabel(value) {
                const normalized = String(value || "").trim().toLowerCase();
                const map = {
                    standard: "Gói tiêu chuẩn",
                    fast: "Gói nhanh",
                    express: "Gói hỏa tốc",
                    instant: "Giao ngay",
                    giao_tieu_chuan: "Gói tiêu chuẩn",
                    giao_nhanh: "Gói nhanh",
                    giao_hoa_toc: "Gói hỏa tốc",
                    giao_ngay_lap_tuc: "Giao ngay",
                };
                return map[normalized] || normalizeText(value) || "Chưa cập nhật";
            }

            function paymentMethodLabel(value) {
                const normalized = String(value || "").trim().toLowerCase();
                if (["chuyen_khoan", "bank", "bank_transfer", "transfer"].includes(normalized)) {
                    return "Chuyển khoản";
                }
                return "Tiền mặt";
            }

            function payerLabel(value) {
                return String(value || "").trim().toLowerCase() === "nhan" ? "Người nhận" : "Người gửi";
            }

            function parseJsonObject(value) {
                if (!value) return {};
                if (typeof value === "object") return value;
                try {
                    const parsed = JSON.parse(value);
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (error) {
                    return {};
                }
            }

            function parseJsonArray(value) {
                if (!value) return [];
                if (Array.isArray(value)) return value;
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (error) {
                    return [];
                }
            }

            function getListFn() {
                if (typeof window.krudList === "function") {
                    return (payload) => window.krudList(payload);
                }

                if (typeof window.crud === "function") {
                    return (payload) => window.crud("list", payload.table, {
                        p: payload.page || 1,
                        limit: payload.limit || 300,
                    });
                }

                if (typeof window.krud === "function") {
                    return (payload) => window.krud("list", payload.table, {
                        p: payload.page || 1,
                        limit: payload.limit || 300,
                    });
                }

                return null;
            }

            function extractRows(payload, depth = 0) {
                if (depth > 4 || payload == null) return [];
                if (Array.isArray(payload)) return payload;
                if (typeof payload !== "object") return [];

                const keys = ["data", "items", "rows", "list", "result", "payload"];
                for (const key of keys) {
                    const value = payload[key];
                    if (Array.isArray(value)) return value;
                    const nested = extractRows(value, depth + 1);
                    if (nested.length) return nested;
                }

                return [];
            }

            function normalizeOrder(row) {
                const status = normalizeStatus(row.trang_thai || row.status);
                const pricingMeta = parseJsonObject(row.chi_tiet_gia_cuoc_json);
                const items = parseJsonArray(row.mat_hang_json);

                return {
                    id: String(row.id || "").trim(),
                    code: normalizeText(row.ma_don_hang_noi_bo || row.ma_don_hang || row.order_code || row.id),
                    createdAt: row.created_at || row.created_date || "",
                    status,
                    statusLabel: statusLabel(status),
                    senderName: normalizeText(row.ho_ten_nguoi_gui || ""),
                    senderPhone: normalizeText(row.so_dien_thoai_nguoi_gui || ""),
                    receiverName: normalizeText(row.ho_ten_nguoi_nhan || ""),
                    receiverPhone: normalizeText(row.so_dien_thoai_nguoi_nhan || ""),
                    pickupAddress: normalizeText(row.dia_chi_lay_hang || row.pickup_address || ""),
                    deliveryAddress: normalizeText(row.dia_chi_giao_hang || row.delivery_address || ""),
                    serviceName: normalizeText(row.ten_dich_vu) || serviceLabel(row.dich_vu || row.loai_dich_vu),
                    vehicleName: normalizeText(row.ten_phuong_tien || row.phuong_tien || ""),
                    totalFee: Number(row.tong_cuoc || row.shipping_fee || row.total_fee || 0),
                    codAmount: Number(row.gia_tri_thu_ho_cod || row.cod_amount || 0),
                    paymentMethod: paymentMethodLabel(row.phuong_thuc_thanh_toan || row.payment_method),
                    feePayer: payerLabel(row.nguoi_tra_cuoc || row.fee_payer),
                    note: normalizeText(row.ghi_chu || row.notes || ""),
                    pickupDate: normalizeText(row.ngay_lay_hang || ""),
                    pickupSlot: normalizeText(row.ten_khung_gio_lay_hang || row.khung_gio_lay_hang || ""),
                    estimatedDelivery: normalizeText(row.du_kien_giao_hang || row.estimated_delivery || ""),
                    distanceKm: Number(row.khoang_cach_km || pricingMeta.khoang_cach_km || 0),
                    customerId: normalizeText(row.customer_id || ""),
                    customerUsername: normalizeText(row.customer_username || ""),
                    shipperName: normalizeText(row.nha_cung_cap_ho_ten || row.shipper_name || ""),
                    shipperPhone: normalizeText(row.nha_cung_cap_so_dien_thoai || row.shipper_phone || ""),
                    items,
                    logs: [],
                };
            }

            function buildLogEntries(order) {
                const logs = [];
                logs.push({
                    time: order.createdAt,
                    title: "Đơn hàng đã được tạo",
                    note: `Đơn ${order.code} đã được lưu lên KRUD với trạng thái ${order.statusLabel.toLowerCase()}.`,
                });

                if (order.shipperName) {
                    logs.push({
                        time: "",
                        title: "Đã có nhà cung cấp phụ trách",
                        note: `${order.shipperName}${order.shipperPhone ? ` - ${order.shipperPhone}` : ""}`,
                    });
                }

                return logs;
            }

            async function fetchOrder() {
                const listFn = getListFn();
                if (!listFn) {
                    throw new Error("Không tìm thấy hàm KRUD list trên trang admin.");
                }

                const response = await listFn({
                    table: tableName,
                    sort: { id: "desc" },
                    page: 1,
                    limit: 300,
                });

                const rows = extractRows(response).map(normalizeOrder);
                if (requestedCode) {
                    return rows.find((row) => row.code === requestedCode) || null;
                }

                if (requestedId) {
                    return rows.find((row) => row.id === requestedId) || null;
                }

                return null;
            }

            function renderItems(items) {
                if (!Array.isArray(items) || !items.length) {
                    return '<div class="detail-empty">Đơn này chưa có danh sách mặt hàng chi tiết.</div>';
                }

                return `
                    <div class="detail-logs">
                        ${items.map((item) => `
                            <div class="detail-log">
                                <small>${escapeHtml(item.ten_hang || item.item_name || "Mặt hàng")}</small>
                                <strong>
                                    SL: ${escapeHtml(item.so_luong ?? item.quantity ?? 1)} |
                                    Cân nặng: ${escapeHtml(item.can_nang ?? item.weight ?? 0)} kg
                                </strong>
                            </div>
                        `).join("")}
                    </div>
                `;
            }

            function renderLogs(logs) {
                if (!Array.isArray(logs) || !logs.length) {
                    return '<div class="detail-empty">Chưa có nhật ký xử lý chi tiết.</div>';
                }

                return `
                    <div class="detail-logs">
                        ${logs.map((log) => `
                            <div class="detail-log">
                                <small>${escapeHtml(formatDateTime(log.time, "Hệ thống"))}</small>
                                <strong>${escapeHtml(log.title)}</strong>
                                ${log.note ? `<div style="margin-top:8px; color:#64748b;">${escapeHtml(log.note)}</div>` : ""}
                            </div>
                        `).join("")}
                    </div>
                `;
            }

            function renderOrder(order) {
                const logs = buildLogEntries(order);
                root.innerHTML = `
                    <section class="detail-hero">
                        <div class="detail-hero-head">
                            <div>
                                <h1>#${escapeHtml(order.code)}</h1>
                                <p>Chi tiết đơn hàng admin đang đọc trực tiếp từ bảng KRUD <strong>${escapeHtml(tableName)}</strong>.</p>
                            </div>
                            <span class="status-pill"><i class="fa-solid fa-circle"></i> ${escapeHtml(order.statusLabel)}</span>
                        </div>
                        <div class="hero-grid">
                            <div class="hero-stat">
                                <small>Ngày tạo đơn</small>
                                <strong>${escapeHtml(formatDateTime(order.createdAt))}</strong>
                            </div>
                            <div class="hero-stat">
                                <small>Tổng cước</small>
                                <strong>${escapeHtml(formatMoney(order.totalFee))}</strong>
                            </div>
                            <div class="hero-stat">
                                <small>COD</small>
                                <strong>${escapeHtml(formatMoney(order.codAmount))}</strong>
                            </div>
                            <div class="hero-stat">
                                <small>Người trả cước</small>
                                <strong>${escapeHtml(order.feePayer)}</strong>
                            </div>
                        </div>
                    </section>

                    <div class="detail-grid">
                        <section class="detail-card">
                            <h3>Thông tin đơn hàng</h3>
                            <div class="detail-meta-grid">
                                <div class="detail-item">
                                    <small>Mã đơn</small>
                                    <strong>${escapeHtml(order.code)}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Dịch vụ</small>
                                    <strong>${escapeHtml(order.serviceName || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Phương tiện</small>
                                    <strong>${escapeHtml(order.vehicleName || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Khoảng cách</small>
                                    <strong>${order.distanceKm > 0 ? `${order.distanceKm.toLocaleString("vi-VN")} km` : "Chưa cập nhật"}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Ngày lấy hàng</small>
                                    <strong>${escapeHtml(order.pickupDate || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Khung giờ lấy hàng</small>
                                    <strong>${escapeHtml(order.pickupSlot || "Chưa cập nhật")}</strong>
                                </div>
                            </div>

                            <div class="detail-route" style="margin-top:18px;">
                                <div class="detail-route-block">
                                    <small>Điểm lấy hàng</small>
                                    <strong>${escapeHtml(order.pickupAddress || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-route-block">
                                    <small>Điểm giao hàng</small>
                                    <strong>${escapeHtml(order.deliveryAddress || "Chưa cập nhật")}</strong>
                                </div>
                            </div>

                            <div class="detail-note">
                                <strong>Ghi chú đơn:</strong> ${escapeHtml(order.note || "Không có ghi chú.")}
                            </div>
                        </section>

                        <section class="detail-card">
                            <h3>Thanh toán và điều phối</h3>
                            <div class="detail-meta-grid">
                                <div class="detail-item">
                                    <small>Trạng thái đơn</small>
                                    <strong>${escapeHtml(order.statusLabel)}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Phương thức thanh toán</small>
                                    <strong>${escapeHtml(order.paymentMethod)}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Tổng cước</small>
                                    <strong>${escapeHtml(formatMoney(order.totalFee))}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>COD</small>
                                    <strong>${escapeHtml(formatMoney(order.codAmount))}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Người trả cước</small>
                                    <strong>${escapeHtml(order.feePayer)}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Dự kiến giao</small>
                                    <strong>${escapeHtml(order.estimatedDelivery || "Chưa cập nhật")}</strong>
                                </div>
                            </div>

                            <div class="detail-admin-note" style="margin-top:18px;">
                                Phần xem chi tiết admin đã nối KRUD. Các thao tác sửa trạng thái, phân công nhà cung cấp và ghi chú nội bộ của trang này chưa được nối lại trên KRUD.
                            </div>
                        </section>

                        <section class="detail-card">
                            <h3>Thông tin khách hàng</h3>
                            <div class="detail-meta-grid">
                                <div class="detail-item">
                                    <small>Người gửi</small>
                                    <strong>${escapeHtml(order.senderName || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Số điện thoại người gửi</small>
                                    <strong>${escapeHtml(order.senderPhone || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Người nhận</small>
                                    <strong>${escapeHtml(order.receiverName || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Số điện thoại người nhận</small>
                                    <strong>${escapeHtml(order.receiverPhone || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Customer ID</small>
                                    <strong>${escapeHtml(order.customerId || "Chưa cập nhật")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Customer username</small>
                                    <strong>${escapeHtml(order.customerUsername || "Chưa cập nhật")}</strong>
                                </div>
                            </div>
                        </section>

                        <section class="detail-card">
                            <h3>Thông tin nhà cung cấp</h3>
                            <div class="detail-meta-grid">
                                <div class="detail-item">
                                    <small>Họ tên</small>
                                    <strong>${escapeHtml(order.shipperName || "Chưa phân công")}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Số điện thoại</small>
                                    <strong>${escapeHtml(order.shipperPhone || "Chưa phân công")}</strong>
                                </div>
                            </div>
                        </section>

                        <section class="detail-card">
                            <h3>Mặt hàng</h3>
                            ${renderItems(order.items)}
                        </section>

                        <section class="detail-card">
                            <h3>Nhật ký xử lý</h3>
                            ${renderLogs(logs)}
                        </section>
                    </div>
                `;
            }

            function renderError(message) {
                root.innerHTML = `<div class="detail-error"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(message)}</div>`;
            }

            async function init() {
                if (!requestedCode && !requestedId) {
                    renderError("Thiếu mã đơn hoặc ID đơn hàng để xem chi tiết.");
                    return;
                }

                try {
                    const order = await fetchOrder();
                    if (!order) {
                        root.innerHTML = '<div class="detail-empty">Không tìm thấy đơn hàng phù hợp trong KRUD.</div>';
                        return;
                    }

                    renderOrder(order);
                } catch (error) {
                    renderError(error && error.message ? error.message : "Không thể tải chi tiết đơn hàng.");
                }
            }

            init();
        })();
    </script>
</body>
</html>
