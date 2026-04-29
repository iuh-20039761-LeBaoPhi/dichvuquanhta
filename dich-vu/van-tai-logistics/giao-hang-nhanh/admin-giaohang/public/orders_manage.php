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
    <link rel="stylesheet" href="assets/css/admin/orders-manage.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container ghn-admin-orders-page">
        <div class="page-header">
            <h2 class="page-title">Quản lý đơn hàng</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <!-- ===== STAT CARDS ===== -->
        <div class="mb-4 ghn-admin-orders-stats">
            <div class="ghn-admin-orders-stat-cell">
                <div class="admin-card admin-stat-card p-3 p-md-4 h-100">
                    <div class="d-flex align-items-center gap-3">
                        <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary ghn-admin-stat-icon">
                            <i class="fas fa-file-invoice fa-lg"></i>
                        </div>
                        <div>
                            <div class="h4 fw-bold mb-0" id="stat-total">0</div>
                            <div class="text-muted small fw-semibold">
                                <span class="ghn-admin-stat-label-full">Tổng đơn</span>
                                <span class="ghn-admin-stat-label-short">Tổng</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ghn-admin-orders-stat-cell">
                <div class="admin-card admin-stat-card p-3 p-md-4 h-100">
                    <div class="d-flex align-items-center gap-3">
                        <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning ghn-admin-stat-icon">
                            <i class="fas fa-spinner fa-lg"></i>
                        </div>
                        <div>
                            <div class="h4 fw-bold mb-0" id="stat-pending">0</div>
                            <div class="text-muted small fw-semibold">
                                <span class="ghn-admin-stat-label-full">Chờ xử lý</span>
                                <span class="ghn-admin-stat-label-short">Chờ</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ghn-admin-orders-stat-cell">
                <div class="admin-card admin-stat-card p-3 p-md-4 h-100">
                    <div class="d-flex align-items-center gap-3">
                        <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info ghn-admin-stat-icon">
                            <i class="fas fa-handshake fa-lg"></i>
                        </div>
                        <div>
                            <div class="h4 fw-bold mb-0" id="stat-accepted">0</div>
                            <div class="text-muted small fw-semibold">
                                <span class="ghn-admin-stat-label-full">Đã nhận đơn</span>
                                <span class="ghn-admin-stat-label-short">Đã nhận</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ghn-admin-orders-stat-cell">
                <div class="admin-card admin-stat-card p-3 p-md-4 h-100">
                    <div class="d-flex align-items-center gap-3">
                        <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info ghn-admin-stat-icon">
                            <i class="fas fa-truck fa-lg"></i>
                        </div>
                        <div>
                            <div class="h4 fw-bold mb-0" id="stat-shipping">0</div>
                            <div class="text-muted small fw-semibold">
                                <span class="ghn-admin-stat-label-full">Đang giao</span>
                                <span class="ghn-admin-stat-label-short">Giao</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ghn-admin-orders-stat-cell">
                <div class="admin-card admin-stat-card p-3 p-md-4 h-100">
                    <div class="d-flex align-items-center gap-3">
                        <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success ghn-admin-stat-icon">
                            <i class="fas fa-check-double fa-lg"></i>
                        </div>
                        <div>
                            <div class="h4 fw-bold mb-0" id="stat-completed">0</div>
                            <div class="text-muted small fw-semibold">
                                <span class="ghn-admin-stat-label-full">Hoàn thành</span>
                                <span class="ghn-admin-stat-label-short">Xong</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ghn-admin-orders-stat-cell">
                <div class="admin-card admin-stat-card p-3 p-md-4 h-100">
                    <div class="d-flex align-items-center gap-3">
                        <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger ghn-admin-stat-icon">
                            <i class="fas fa-ban fa-lg"></i>
                        </div>
                        <div>
                            <div class="h4 fw-bold mb-0" id="stat-cancelled">0</div>
                            <div class="text-muted small fw-semibold">
                                <span class="ghn-admin-stat-label-full">Đã hủy</span>
                                <span class="ghn-admin-stat-label-short">Hủy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ===== MAIN CARD ===== -->
        <div class="admin-card ghn-admin-orders-main">
            <div class="ghn-admin-orders-main-header">
                <!-- Tiêu đề + Search -->
                <div class="ghn-admin-orders-toolbar">
                    <div>
                        <h5 class="fw-bold mb-1 ghn-admin-orders-heading">Danh sách đơn hàng</h5>
                        <p class="text-muted small mb-0 ghn-admin-orders-summary" id="orders-summary">Đang tải dữ liệu...</p>
                    </div>
                    <div class="d-flex flex-sm-row gap-2 flex-wrap">
                        <div class="input-group order-search-wrap ghn-admin-orders-search">
                            <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted small"></i></span>
                            <input type="text" class="form-control bg-light border-0 ghn-admin-orders-search-input" placeholder="Mã đơn, tên, SĐT..." id="orderSearchInput" oninput="filterOrders()">
                        </div>
                    </div>
                </div>

                <!-- Status Tabs (giống mẫu Thuê Xe) -->
                <div class="mt-2">
                    <div class="ghn-admin-orders-filters">
                        <label class="ghn-admin-orders-filter" for="orderFromDate">
                            <span>Từ ngày</span>
                            <input type="date" class="form-control" id="orderFromDate" onchange="filterOrders()">
                        </label>
                        <label class="ghn-admin-orders-filter" for="orderToDate">
                            <span>Đến ngày</span>
                            <input type="date" class="form-control" id="orderToDate" onchange="filterOrders()">
                        </label>
                        <button class="btn btn-light ghn-admin-orders-reset-btn" type="button" onclick="resetFilters()">Đặt lại</button>
                    </div>
                    <ul class="nav nav-pills nav-fill order-tabs ghn-admin-orders-tabs bg-light p-1 flex-column flex-md-row gap-1 w-100">
                        <li class="nav-item">
                            <a class="nav-link active fw-bold" href="#" id="tabAll" onclick="switchTab('all');return false;">
                                Tất cả <span class="badge bg-secondary ms-1" id="countAll">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link fw-bold" href="#" id="tabPending" onclick="switchTab('pending');return false;">
                                Chưa xử lý <span class="badge bg-warning text-dark ms-1" id="countPending">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link fw-bold" href="#" id="tabAccepted" onclick="switchTab('accepted');return false;">
                                Đã nhận đơn <span class="badge bg-info ms-1" id="countAccepted">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link fw-bold" href="#" id="tabShipping" onclick="switchTab('shipping');return false;">
                                Đang giao <span class="badge bg-primary ms-1" id="countShipping">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link fw-bold" href="#" id="tabDone" onclick="switchTab('done');return false;">
                                Hoàn thành <span class="badge bg-success ms-1" id="countDone">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link fw-bold" href="#" id="tabCancel" onclick="switchTab('cancel');return false;">
                                Đã hủy <span class="badge bg-danger ms-1" id="countCancel">0</span>
                            </a>
                        </li>
                    </ul>
                    <div class="ghn-admin-orders-total-bar" aria-live="polite">
                        <div>
                            <span class="ghn-admin-orders-total-label">Đơn đang lọc</span>
                            <strong id="ordersFilteredCount">0</strong>
                        </div>
                        <div>
                            <span class="ghn-admin-orders-total-label">Tổng cước</span>
                            <strong id="ordersFilteredTotal">0đ</strong>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Desktop Table -->
            <div class="table-responsive d-none d-md-block ghn-admin-orders-table">
                <table class="table align-middle mb-0 ghn-admin-orders-table-grid" id="adminOrderTable">
                    <thead class="bg-light text-muted small text-uppercase">
                        <tr>
                            <th class="ps-4 ghn-admin-orders-col-code">Mã đơn / Ngày đặt</th>
                            <th class="ghn-admin-orders-col-sender">Khách hàng</th>
                            <th class="ghn-admin-orders-col-recipient">Người nhận</th>
                            <th class="ghn-admin-orders-col-service">Dịch vụ / Ngày lấy</th>
                            <th class="ghn-admin-orders-col-fee">Cước ship</th>
                            <th class="ghn-admin-orders-col-status">Trạng thái</th>
                            <th class="pe-4 text-end ghn-admin-orders-col-actions">Hành động</th>
                        </tr>
                    </thead>
                    <tbody id="adminOrderBody">
                        <tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div id="adminOrderMobileList" class="d-block d-md-none p-3 ghn-admin-orders-mobile"></div>
            
            <!-- Pagination -->
            <div class="ghn-admin-orders-pagination-wrap p-3 border-top d-flex justify-content-center align-items-center gap-2" id="paginationWrap">
                <button class="btn btn-sm btn-outline-secondary px-3" id="btnPrev" onclick="changePage(-1)" disabled>
                    <i class="fas fa-chevron-left me-1"></i> Trước
                </button>
                <div class="d-flex align-items-center gap-1 mx-2" id="pageNumberWrap">
                    <span class="small text-muted">Trang</span>
                    <strong class="small" id="currentPageDisplay">1</strong>
                </div>
                <button class="btn btn-sm btn-outline-secondary px-3" id="idNext" onclick="changePage(1)">
                    Sau <i class="fas fa-chevron-right ms-1"></i>
                </button>
            </div>
        </div>

    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
    (function () {
        'use strict';
        const TABLE = 'giaohangnhanh_dat_lich';
        const DETAIL_URL = '../../chi-tiet-don-hang-giaohang.html?viewer=admin&madonhang=';
        const PAGE_SIZE = 20;
        let allOrders = [];
        let currentTab = 'all';
        let currentPage = 1;

        /* ── Helpers ── */
        function esc(v) {
            return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        function fmtMoney(v) { return Number(v || 0).toLocaleString('vi-VN') + 'đ'; }
        function orderFeeValue(order) { return Number(order?.tong_cuoc || order?.shipping_fee || 0); }
        function fmtDate(v) {
            if (!v) return '--';
            const d = new Date(v);
            return isNaN(d) ? esc(v) : d.toLocaleDateString('vi-VN');
        }
        function normalizeText(v) { return String(v || '').replace(/\s+/g,' ').trim(); }
        function startOfToday() {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        }
        function startOfTomorrow() {
            return startOfToday() + 24 * 60 * 60 * 1000;
        }
        function orderCreatedMs(order) {
            const raw = normalizeText(order?.created_at || order?.created_date || '');
            if (!raw) return 0;
            const date = new Date(raw);
            return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        function parseDateFilterMs(v, mode) {
            const raw = String(v || '').trim();
            if (!raw) return null;
            const suffix = mode === 'end' ? 'T23:59:59' : 'T00:00:00';
            const date = new Date(raw + suffix);
            return isNaN(date.getTime()) ? null : date.getTime();
        }
        function compareOrdersByCreatedDesc(left, right) {
            const leftCreatedMs = orderCreatedMs(left);
            const rightCreatedMs = orderCreatedMs(right);
            if (rightCreatedMs !== leftCreatedMs) {
                return rightCreatedMs - leftCreatedMs;
            }
            return Number(right?.id || 0) - Number(left?.id || 0);
        }
        function isTodayOrder(order) {
            const createdMs = orderCreatedMs(order);
            return createdMs >= startOfToday() && createdMs < startOfTomorrow();
        }

        async function fetchAllOrdersFromApi() {
            if (typeof window.DVQTKrud?.listTable === 'function') {
                const rows = await window.DVQTKrud.listTable(TABLE);
                return Array.isArray(rows) ? rows : [];
            }

            const rows = [];
            const limit = 200;
            const maxPages = 20;
            for (let page = 1; page <= maxPages; page += 1) {
                let batch = [];
                if (typeof window.krudList === 'function') {
                    const res = await window.krudList({
                        table: TABLE,
                        page,
                        limit,
                        sort: { created_at: 'desc', id: 'desc' },
                    });
                    batch = Array.isArray(res) ? res : (res?.data || res?.items || []);
                } else if (typeof window.crud === 'function') {
                    batch = await window.crud('list', TABLE, { p: page, limit });
                }

                if (!Array.isArray(batch) || !batch.length) break;
                rows.push(...batch);
                if (batch.length < limit) break;
            }
            return rows;
        }

        /* ── Trạng thái ── */
        function deriveStatus(o) {
            if (normalizeText(o.ngayhuy)) return 'cancel';
            if (normalizeText(o.ngayhoanthanhthucte)) return 'done';
            if (normalizeText(o.ngaybatdauthucte)) return 'shipping';
            if (normalizeText(o.thoidiemnhandon || o.ngaynhan)) return 'accepted';
            const s = String(o.trang_thai || o.status || '').toLowerCase();
            if (['cancelled','canceled','da_huy'].includes(s)) return 'cancel';
            if (['completed','success','delivered'].includes(s)) return 'done';
            if (['shipping','in_transit'].includes(s)) return 'shipping';
            return 'pending';
        }

        const STATUS_META = {
            pending:  { label: 'Chưa xử lý', cls: 'bg-warning text-warning' },
            accepted: { label: 'Đã nhận đơn', cls: 'bg-info text-info' },
            shipping: { label: 'Đang giao',  cls: 'bg-primary text-primary' },
            done:     { label: 'Hoàn thành', cls: 'bg-success text-success' },
            cancel:   { label: 'Đã hủy',     cls: 'bg-danger text-danger'   },
        };

        function badge(status) {
            const m = STATUS_META[status] || STATUS_META.pending;
            return `<span class="badge ${m.cls} bg-opacity-10 px-3 py-2 rounded-pill">${m.label}</span>`;
        }

        /* ── Counts ── */
        function updateCounts(baseList, filteredList) {
            const source = Array.isArray(baseList) ? baseList : allOrders;
            const filtered = Array.isArray(filteredList) ? filteredList : source;
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const wrap = document.getElementById('paginationWrap');

            document.getElementById('orders-summary').textContent =
                `Trang ${currentPage}/${totalPages} • ${Number(filtered.length || 0).toLocaleString('vi-VN')} đơn sau lọc`;
            document.getElementById('currentPageDisplay').textContent = `${currentPage}/${totalPages}`;
            document.getElementById('btnPrev').disabled = currentPage <= 1;
            document.getElementById('idNext').disabled = currentPage >= totalPages;
            if (wrap) wrap.hidden = filtered.length <= PAGE_SIZE;

            document.getElementById('countAll').textContent = source.length;
            document.getElementById('countPending').textContent = source.filter(o => deriveStatus(o) === 'pending').length;
            document.getElementById('countAccepted').textContent = source.filter(o => deriveStatus(o) === 'accepted').length;
            document.getElementById('countShipping').textContent = source.filter(o => deriveStatus(o) === 'shipping').length;
            document.getElementById('countDone').textContent = source.filter(o => deriveStatus(o) === 'done').length;
            document.getElementById('countCancel').textContent = source.filter(o => deriveStatus(o) === 'cancel').length;
        }

        /* ── Stat Cards ── */
        function updateStats(baseList) {
            const source = Array.isArray(baseList) ? baseList : allOrders;
            document.getElementById('stat-total').textContent     = source.length;
            document.getElementById('stat-pending').textContent   = source.filter(o => deriveStatus(o) === 'pending').length;
            document.getElementById('stat-accepted').textContent  = source.filter(o => deriveStatus(o) === 'accepted').length;
            document.getElementById('stat-shipping').textContent  = source.filter(o => deriveStatus(o) === 'shipping').length;
            document.getElementById('stat-completed').textContent = source.filter(o => deriveStatus(o) === 'done').length;
            document.getElementById('stat-cancelled').textContent = source.filter(o => deriveStatus(o) === 'cancel').length;
        }

        /* ── Render ── */
        function renderTable(list) {
            const tbody = document.getElementById('adminOrderBody');
            const mob   = document.getElementById('adminOrderMobileList');
            updateFilteredTotalBar(list);

            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">Không có đơn hàng nào khớp.</td></tr>`;
                mob.innerHTML   = `<div class="text-center text-muted p-4 small">Không có đơn phù hợp.</div>`;
                return;
            }

            const paginatedList = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

            /* Desktop */
            tbody.innerHTML = paginatedList.map(o => {
                const st   = deriveStatus(o);
                const code = normalizeText(o.ma_don_hang_noi_bo || o.order_code || o.ma_don_hang || '');
                const disp = code || `#${String(o.id).padStart(7,'0')}`;
                const senderName  = esc(normalizeText(o.ho_ten_nguoi_gui || o.nguoi_gui_ho_ten || ''));
                const senderPhone = esc(normalizeText(o.so_dien_thoai_nguoi_gui || o.nguoi_gui_so_dien_thoai || ''));
                const recvName    = esc(normalizeText(o.ho_ten_nguoi_nhan || o.nguoi_nhan_ho_ten || ''));
                const recvPhone   = esc(normalizeText(o.so_dien_thoai_nguoi_nhan || o.nguoi_nhan_so_dien_thoai || ''));
                const svc  = esc(normalizeText(o.ten_dich_vu || o.dich_vu || ''));
                const date = fmtDate(o.ngay_lay_hang || o.created_at);
                const fee  = fmtMoney(orderFeeValue(o));
                const url  = DETAIL_URL + encodeURIComponent(code || o.id);
                return `<tr>
                    <td class="ps-4">
                        <div class="fw-bold small ghn-admin-order-code">${esc(disp)}</div>
                        <div class="text-muted ghn-admin-order-date">${fmtDate(o.created_at || o.ngay_lay_hang)}</div>
                    </td>
                    <td>
                        <div class="fw-semibold small text-dark">${senderName || '--'}</div>
                        <div class="small text-muted">${senderPhone || ''}</div>
                    </td>
                    <td>
                        <div class="fw-semibold small text-dark">${recvName || '--'}</div>
                        <div class="small text-muted">${recvPhone || ''}</div>
                    </td>
                    <td>
                        <div class="small fw-semibold ghn-admin-order-service">${svc || '--'}</div>
                        <div class="small text-muted">${date}</div>
                    </td>
                    <td class="fw-bold ghn-admin-order-fee">${fee}</td>
                    <td>${badge(st)}</td>
                    <td class="pe-4 text-end">
                        <a href="${url}" class="btn btn-sm btn-light rounded-circle shadow-sm" title="Xem chi tiết">
                            <i class="fas fa-eye text-primary"></i>
                        </a>
                    </td>
                </tr>`;
            }).join('');

            /* Mobile */
            mob.innerHTML = paginatedList.map(o => {
                const st   = deriveStatus(o);
                const m    = STATUS_META[st] || STATUS_META.pending;
                const code = normalizeText(o.ma_don_hang_noi_bo || o.order_code || o.ma_don_hang || '');
                const disp = code || `#${String(o.id).padStart(7,'0')}`;
                const sender = esc(normalizeText(o.ho_ten_nguoi_gui || o.nguoi_gui_ho_ten || ''));
                const recv   = esc(normalizeText(o.ho_ten_nguoi_nhan || o.nguoi_nhan_ho_ten || ''));
                const ncc    = esc(normalizeText(o.nha_cung_cap_ho_ten || o.shipper_name || ''));
                const fee    = fmtMoney(orderFeeValue(o));
                const url    = DETAIL_URL + encodeURIComponent(code || o.id);
                return `<div class="mobile-order-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="fw-bold small ghn-admin-order-mobile-code">${esc(disp)}</div>
                        <span class="badge ${m.cls} bg-opacity-10 px-2 py-1 rounded-pill ghn-admin-order-mobile-badge">${m.label}</span>
                    </div>
                    <div class="mc-row"><span>Người gửi</span><strong>${sender || '--'}</strong></div>
                    <div class="mc-row"><span>Người nhận</span><strong>${recv || '--'}</strong></div>
                    <div class="mc-row"><span>Shipper</span><strong>${ncc || 'Chưa nhận'}</strong></div>
                    <div class="mc-row text-primary"><span>Cước ship</span><strong>${fee}</strong></div>
                    <div class="mt-2">
                        <a href="${url}" class="btn btn-sm btn-light border w-100 fw-bold">
                            <i class="fas fa-eye me-2 text-primary"></i>Xem chi tiết
                        </a>
                    </div>
                </div>`;
            }).join('');

        }

        function updateFilteredTotalBar(list) {
            const orders = Array.isArray(list) ? list : [];
            const totalAmount = orders.reduce((sum, order) => sum + orderFeeValue(order), 0);
            const countNode = document.getElementById('ordersFilteredCount');
            const totalNode = document.getElementById('ordersFilteredTotal');
            if (countNode) countNode.textContent = Number(orders.length || 0).toLocaleString('vi-VN');
            if (totalNode) totalNode.textContent = fmtMoney(totalAmount);
        }

        /* ── Filter ── */
        window.filterOrders = function () {
            const q = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
            const fromTime = parseDateFilterMs(document.getElementById('orderFromDate')?.value, 'start');
            const toTime = parseDateFilterMs(document.getElementById('orderToDate')?.value, 'end');
            let list = allOrders.filter(o => {
                if (fromTime == null && toTime == null) return true;
                const createdMs = orderCreatedMs(o);
                if (!createdMs) return false;
                if (fromTime != null && createdMs < fromTime) return false;
                if (toTime != null && createdMs > toTime) return false;
                return true;
            });

            const baseList = list.slice();
            updateStats(baseList);

            if (currentTab !== 'all') {
                list = list.filter(o => deriveStatus(o) === currentTab);
            }
            if (q) {
                list = list.filter(o => {
                    const fields = [
                        o.ma_don_hang_noi_bo, o.order_code, o.ma_don_hang, String(o.id),
                        o.ho_ten_nguoi_gui, o.nguoi_gui_ho_ten,
                        o.so_dien_thoai_nguoi_gui, o.nguoi_gui_so_dien_thoai,
                        o.ho_ten_nguoi_nhan, o.nguoi_nhan_ho_ten,
                        o.so_dien_thoai_nguoi_nhan, o.nguoi_nhan_so_dien_thoai,
                        o.nha_cung_cap_ho_ten, o.shipper_name,
                    ].map(v => String(v || '').toLowerCase()).join(' ');
                    return fields.includes(q);
                });
            }
            currentPage = Math.max(1, Math.min(currentPage, Math.max(1, Math.ceil(list.length / PAGE_SIZE))));
            updateCounts(baseList, list);
            renderTable(list);
        };

        /* ── Switch Tab ── */
        window.switchTab = function (tab) {
            currentTab = tab;
            currentPage = 1;
            const tabMap = { all:'tabAll', pending:'tabPending', accepted:'tabAccepted', shipping:'tabShipping', done:'tabDone', cancel:'tabCancel' };
            document.querySelectorAll('.order-tabs .nav-link').forEach(el => el.classList.remove('active'));
            if (tabMap[tab]) document.getElementById(tabMap[tab])?.classList.add('active');
            filterOrders();
        };

        window.changePage = function (delta) {
            const next = currentPage + delta;
            if (next < 1) return;
            const totalFiltered = document.getElementById('ordersFilteredCount')?.textContent?.replace(/\D/g,'') || '0';
            const totalPages = Math.max(1, Math.ceil(Number(totalFiltered || 0) / PAGE_SIZE));
            if (next > totalPages) return;
            currentPage = next;
            filterOrders();
        };

        window.resetFilters = function () {
            const searchNode = document.getElementById('orderSearchInput');
            const fromNode = document.getElementById('orderFromDate');
            const toNode = document.getElementById('orderToDate');
            if (searchNode) searchNode.value = '';
            if (fromNode) fromNode.value = '';
            if (toNode) toNode.value = '';
            currentTab = 'all';
            currentPage = 1;
            document.querySelectorAll('.order-tabs .nav-link').forEach(el => el.classList.remove('active'));
            document.getElementById('tabAll')?.classList.add('active');
            filterOrders();
        };

        /* ── Load All (Admin: không lọc role) ── */
        window.loadAllOrders = async function () {
            const tbody = document.getElementById('adminOrderBody');
            const mob   = document.getElementById('adminOrderMobileList');
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Đang tải trang ${currentPage}...</td></tr>`;
            mob.innerHTML   = '';
            document.getElementById('orders-summary').textContent = 'Đang tải toàn bộ dữ liệu...';

            try {
                const rows = await fetchAllOrdersFromApi();
                allOrders = Array.isArray(rows) ? rows.sort(compareOrdersByCreatedDesc) : [];
                filterOrders();
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Lỗi: ${esc(err.message || 'Không thể tải dữ liệu')}</td></tr>`;
                document.getElementById('orders-summary').textContent = 'Không tải được dữ liệu.';
            }
        };

        /* Khởi động */
        loadAllOrders();
    })();
    </script>
</body>
</html>
