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
    <link rel="stylesheet" href="assets/css/admin/order-detail.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
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
            const standaloneDetailBaseUrl = "../../chi-tiet-don-hang-giaohang.html?viewer=admin&madonhang=";

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

            function deriveStatus(row) {
                const cancelledAt = normalizeText(row.ngayhuy || "");
                const completedAt = normalizeText(row.ngayhoanthanhthucte || "");
                const startedAt = normalizeText(row.ngaybatdauthucte || "");
                const acceptedAt = normalizeText(row.thoidiemnhandon || row.ngaynhan || "");

                if (cancelledAt) return "cancelled";
                if (completedAt) return "completed";
                if (startedAt) return "shipping";
                if (acceptedAt) return "pending";
                return normalizeStatus(row.trang_thai || row.status);
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

            function normalizeMediaItems(items) {
                return (Array.isArray(items) ? items : [])
                    .filter((item) => item && typeof item === "object")
                    .map((item, index) => {
                        const url = normalizeText(item.view_url || item.url || item.download_url || "");
                        if (!url) return null;
                        const extension = normalizeText(item.extension || "").toLowerCase()
                            || url.split("?")[0].split("#")[0].split(".").pop().toLowerCase();
                        return {
                            url,
                            name: normalizeText(item.name || "") || `Tệp đính kèm ${index + 1}`,
                            extension,
                        };
                    })
                    .filter(Boolean);
            }

            function isImageExtension(extension) {
                return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"].includes(
                    String(extension || "").toLowerCase(),
                );
            }

            function isVideoExtension(extension) {
                return ["mp4", "mov", "webm", "mkv", "avi", "m4v", "3gp"].includes(
                    String(extension || "").toLowerCase(),
                );
            }

            function renderMediaGallery(items, emptyMessage) {
                if (!Array.isArray(items) || !items.length) {
                    return `<div class="detail-empty">${escapeHtml(emptyMessage)}</div>`;
                }

                return `
                    <div class="detail-media-grid">
                        ${items.map((item) => {
                            const url = escapeHtml(item.url);
                            const name = escapeHtml(item.name);
                            const extension = String(item.extension || "").toLowerCase();
                            const mediaContent = isImageExtension(extension)
                                ? `<img src="${url}" alt="${name}">`
                                : isVideoExtension(extension)
                                    ? `<video src="${url}" controls preload="metadata"></video>`
                                    : `<div class="detail-media-fallback"><i class="fa-solid fa-file-lines"></i></div>`;
                            const mediaTypeLabel = isImageExtension(extension)
                                ? "Ảnh đính kèm"
                                : isVideoExtension(extension)
                                    ? "Video đính kèm"
                                    : "Tệp đính kèm";
                            return `
                                <a class="detail-media-item" href="${url}" target="_blank" rel="noreferrer">
                                    ${mediaContent}
                                    <div class="detail-media-meta">
                                        <span>${mediaTypeLabel}</span>
                                    </div>
                                </a>
                            `;
                        }).join("")}
                    </div>
                `;
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
                const status = deriveStatus(row);
                const pricingMeta = parseJsonObject(row.chi_tiet_gia_cuoc_json);
                const items = parseJsonArray(row.mat_hang_json);
                const bookingMedia = normalizeMediaItems(
                    parseJsonArray(row.attachments_json || row.attachments),
                );
                const shipperReports = normalizeMediaItems(
                    parseJsonArray(row.shipper_reports_json || row.shipper_reports),
                );
                const feedbackMedia = normalizeMediaItems(
                    parseJsonArray(row.feedback_media_json || row.feedback_media),
                );
                const legacyPodUrl = normalizeText(row.pod_image || row.anh_xac_nhan_giao_hang || "");
                if (
                    legacyPodUrl &&
                    !shipperReports.some((item) => item.url === legacyPodUrl)
                ) {
                    shipperReports.push({
                        url: legacyPodUrl,
                        name: "Bằng chứng giao hàng",
                        extension: legacyPodUrl.split("?")[0].split("#")[0].split(".").pop().toLowerCase(),
                    });
                }

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
                    cancelReason: normalizeText(row.ly_do_huy || row.cancel_reason || ""),
                    pickupDate: normalizeText(row.ngay_lay_hang || ""),
                    pickupSlot: normalizeText(row.ten_khung_gio_lay_hang || row.khung_gio_lay_hang || ""),
                    estimatedDelivery: normalizeText(row.du_kien_giao_hang || row.estimated_delivery || ""),
                    distanceKm: Number(row.khoang_cach_km || pricingMeta.khoang_cach_km || 0),
                    customerId: normalizeText(row.customer_id || ""),
                    customerUsername: normalizeText(row.customer_username || ""),
                    shipperName: normalizeText(row.nha_cung_cap_ho_ten || row.shipper_name || ""),
                    shipperPhone: normalizeText(row.nha_cung_cap_so_dien_thoai || row.shipper_phone || ""),
                    acceptedAt: normalizeText(row.thoidiemnhandon || row.ngaynhan || ""),
                    startedAt: normalizeText(row.ngaybatdauthucte || ""),
                    completedAt: normalizeText(row.ngayhoanthanhthucte || ""),
                    cancelledAt: normalizeText(row.ngayhuy || ""),
                    shipperNote: normalizeText(row.ghi_chu_shipper || row.shipper_note || ""),
                    feedback: normalizeText(row.phan_hoi || row.feedback || ""),
                    items,
                    bookingMedia,
                    shipperReports,
                    feedbackMedia,
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

                if (order.acceptedAt) {
                    logs.push({
                        time: order.acceptedAt,
                        title: "Đã có nhà cung cấp nhận đơn",
                        note: order.shipperName
                            ? `${order.shipperName}${order.shipperPhone ? ` - ${order.shipperPhone}` : ""}`
                            : "Đơn đã được nhận và bắt đầu điều phối.",
                    });
                }

                if (order.startedAt) {
                    logs.push({
                        time: order.startedAt,
                        title: "Đã bắt đầu thực hiện",
                        note: "Nhà cung cấp đã xác nhận bắt đầu xử lý đơn hàng.",
                    });
                }

                if (order.completedAt) {
                    logs.push({
                        time: order.completedAt,
                        title: "Đơn hàng hoàn tất",
                        note: "Đơn hàng đã được chốt hoàn tất theo mốc thời gian thực tế.",
                    });
                }

                if (order.cancelledAt) {
                    logs.push({
                        time: order.cancelledAt,
                        title: "Đơn hàng đã hủy",
                        note: order.cancelReason || "Đơn hàng đã được đánh dấu hủy.",
                    });
                }

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
                                ${log.note ? `<div class="detail-log-note">${escapeHtml(log.note)}</div>` : ""}
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
                            <div class="detail-hero-actions">
                                <span class="status-pill"><i class="fa-solid fa-circle"></i> ${escapeHtml(order.statusLabel)}</span>
                                <a href="${standaloneDetailBaseUrl}${encodeURIComponent(order.code)}" target="_blank" rel="noreferrer" class="status-pill detail-hero-link">
                                    <i class="fa-solid fa-up-right-from-square"></i> Mở màn chi tiết chung
                                </a>
                            </div>
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

                            <div class="detail-route detail-route-spaced">
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
                                <div class="detail-item">
                                    <small>Nhận đơn thực tế</small>
                                    <strong>${escapeHtml(formatDateTime(order.acceptedAt, "Chưa cập nhật"))}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Bắt đầu thực tế</small>
                                    <strong>${escapeHtml(formatDateTime(order.startedAt, "Chưa cập nhật"))}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Hoàn thành thực tế</small>
                                    <strong>${escapeHtml(formatDateTime(order.completedAt, "Chưa cập nhật"))}</strong>
                                </div>
                                <div class="detail-item">
                                    <small>Thời điểm hủy</small>
                                    <strong>${escapeHtml(formatDateTime(order.cancelledAt, "Chưa hủy"))}</strong>
                                </div>
                            </div>

                            <div class="detail-admin-note detail-admin-note-spaced">
                                Phần xem chi tiết admin đã nối KRUD và suy trạng thái theo các mốc thời gian thực tế. Các thao tác sửa trạng thái, phân công nhà cung cấp và ghi chú nội bộ của trang này chưa được nối lại trên KRUD.
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
                            <h3>Ảnh/video khi đặt đơn</h3>
                            ${renderMediaGallery(order.bookingMedia, "Chưa có ảnh hoặc video khi đặt đơn.")}
                        </section>

                        <section class="detail-card">
                            <h3>POD / Báo cáo NCC</h3>
                            ${order.shipperNote ? `<div class="detail-note detail-note--compact"><strong>Báo cáo NCC:</strong> ${escapeHtml(order.shipperNote)}</div>` : ""}
                            ${renderMediaGallery(order.shipperReports, "Chưa có ảnh/video POD hoặc báo cáo NCC.")}
                        </section>

                        <section class="detail-card">
                            <h3>Phản hồi khách hàng</h3>
                            ${order.feedback ? `<div class="detail-note detail-note--compact"><strong>Nội dung phản hồi:</strong> ${escapeHtml(order.feedback)}</div>` : ""}
                            ${renderMediaGallery(order.feedbackMedia, "Chưa có ảnh/video phản hồi từ khách hàng.")}
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
