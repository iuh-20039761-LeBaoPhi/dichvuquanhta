<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Điều phối đơn hàng | Admin Chuyển Dọn';
$extraStylesheets = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'assets/css/orders-manage.css',
];
require_once __DIR__ . '/../includes/header_admin.php';
?>

<div class="cd-admin-orders-page">
    <div class="page-header cd-admin-orders-page-header">
        <div>
            <h2 class="page-title">Điều phối đơn hàng</h2>
            <p class="cd-admin-orders-page-copy">Đồng bộ yêu cầu đặt lịch, điều phối nhà cung cấp và theo dõi toàn bộ vòng đời xử lý trên một màn quản trị.</p>
        </div>
        <div class="cd-admin-orders-page-actions">
            <a href="admin_stats.php" class="back-link cd-admin-orders-back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
            <button class="btn btn-primary cd-admin-orders-create-btn" type="button" onclick="orderManager.showOrderModal()">
                <i class="fas fa-plus"></i>Tạo đơn nội bộ
            </button>
        </div>
    </div>

    <div class="cd-admin-orders-stats">
        <div class="cd-admin-orders-stat-cell">
            <div class="admin-card cd-admin-stat-card p-3 p-md-4 h-100">
                <div class="d-flex align-items-center gap-3">
                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary cd-admin-stat-icon">
                        <i class="fas fa-file-invoice fa-lg"></i>
                    </div>
                    <div>
                        <div class="h4 fw-bold mb-0" id="statsTotalOrders">0</div>
                        <div class="text-muted small fw-semibold">
                            <span class="cd-admin-stat-label-full">Tổng đơn</span>
                            <span class="cd-admin-stat-label-short">Tổng</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="cd-admin-orders-stat-cell">
            <div class="admin-card cd-admin-stat-card p-3 p-md-4 h-100">
                <div class="d-flex align-items-center gap-3">
                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning cd-admin-stat-icon">
                        <i class="fas fa-spinner fa-lg"></i>
                    </div>
                    <div>
                        <div class="h4 fw-bold mb-0" id="statsNewOrders">0</div>
                        <div class="text-muted small fw-semibold">
                            <span class="cd-admin-stat-label-full">Mới tiếp nhận</span>
                            <span class="cd-admin-stat-label-short">Mới</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="cd-admin-orders-stat-cell">
            <div class="admin-card cd-admin-stat-card p-3 p-md-4 h-100">
                <div class="d-flex align-items-center gap-3">
                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info cd-admin-stat-icon">
                        <i class="fas fa-truck-moving fa-lg"></i>
                    </div>
                    <div>
                        <div class="h4 fw-bold mb-0" id="statsActiveOrders">0</div>
                        <div class="text-muted small fw-semibold">
                            <span class="cd-admin-stat-label-full">Đang triển khai</span>
                            <span class="cd-admin-stat-label-short">Đang</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="cd-admin-orders-stat-cell">
            <div class="admin-card cd-admin-stat-card p-3 p-md-4 h-100">
                <div class="d-flex align-items-center gap-3">
                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success cd-admin-stat-icon">
                        <i class="fas fa-check-double fa-lg"></i>
                    </div>
                    <div>
                        <div class="h4 fw-bold mb-0" id="statsCompletedOrders">0</div>
                        <div class="text-muted small fw-semibold">
                            <span class="cd-admin-stat-label-full">Hoàn thành</span>
                            <span class="cd-admin-stat-label-short">Xong</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="cd-admin-orders-stat-cell">
            <div class="admin-card cd-admin-stat-card p-3 p-md-4 h-100">
                <div class="d-flex align-items-center gap-3">
                    <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger cd-admin-stat-icon">
                        <i class="fas fa-ban fa-lg"></i>
                    </div>
                    <div>
                        <div class="h4 fw-bold mb-0" id="statsCancelledOrders">0</div>
                        <div class="text-muted small fw-semibold">
                            <span class="cd-admin-stat-label-full">Đã hủy</span>
                            <span class="cd-admin-stat-label-short">Hủy</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="admin-card cd-admin-orders-main">
        <div class="cd-admin-orders-main-header">
            <div class="cd-admin-orders-toolbar">
                <div>
                    <h5 class="fw-bold mb-1 cd-admin-orders-heading">Danh sách đơn hàng</h5>
                    <p class="text-muted small mb-0 cd-admin-orders-summary">Lọc theo nhà cung cấp, khảo sát, đánh giá và cảnh báo đơn quá thời gian chờ nhận.</p>
                </div>
                <div class="d-flex flex-sm-row gap-2 flex-wrap">
                    <div class="input-group order-search-wrap cd-admin-orders-search">
                        <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted small"></i></span>
                        <input type="text" class="form-control bg-light border-0 cd-admin-orders-search-input" id="orderSearchInput" placeholder="Mã đơn, khách hàng, SĐT, địa chỉ..." oninput="orderManager.handleSearch(this.value)">
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm cd-admin-orders-reload-btn" type="button" onclick="orderManager.fetchOrders()">
                        <i class="fas fa-sync-alt me-2"></i>Tải lại
                    </button>
                </div>
            </div>

            <div class="mt-2">
                <ul class="nav nav-pills nav-fill order-tabs cd-admin-orders-tabs bg-light p-1 flex-column flex-md-row gap-1 w-100">
                    <li class="nav-item">
                        <a class="nav-link active fw-bold" href="#" id="tab-all" onclick="orderManager.handleTabFilter(''); return false;">
                            Tất cả <span class="badge bg-secondary ms-1" id="count-all">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link fw-bold" href="#" id="tab-pending" onclick="orderManager.handleTabFilter('pending'); return false;">
                            Mới tiếp nhận <span class="badge bg-warning text-dark ms-1" id="count-pending">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link fw-bold" href="#" id="tab-active" onclick="orderManager.handleTabFilter('active'); return false;">
                            Đang triển khai <span class="badge bg-primary ms-1" id="count-active">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link fw-bold" href="#" id="tab-completed" onclick="orderManager.handleTabFilter('completed'); return false;">
                            Hoàn thành <span class="badge bg-success ms-1" id="count-completed">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link fw-bold" href="#" id="tab-cancelled" onclick="orderManager.handleTabFilter('cancelled'); return false;">
                            Đã hủy <span class="badge bg-danger ms-1" id="count-cancelled">0</span>
                        </a>
                    </li>
                </ul>
                <div id="filterChips" class="filter-chips orders-filter-chips"></div>
            </div>
        </div>

        <div class="table-wrap cd-admin-orders-table">
            <table class="table align-middle mb-0 cd-admin-orders-table-grid">
                <thead class="bg-light text-muted small text-uppercase">
                    <tr>
                        <th class="cd-admin-orders-col-code">Mã đơn & khách hàng</th>
                        <th class="cd-admin-orders-col-service">Dịch vụ & lịch</th>
                        <th class="cd-admin-orders-col-provider">Điều phối</th>
                        <th class="cd-admin-orders-col-fee">Giá trị</th>
                        <th class="cd-admin-orders-col-status">Trạng thái</th>
                        <th class="cd-admin-orders-col-actions">Thao tác</th>
                    </tr>
                </thead>
                <tbody id="orderListBody"></tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="cd-admin-orders-pagination p-3 border-top d-flex justify-content-center align-items-center gap-2" id="paginationWrap">
            <button class="btn btn-sm btn-outline-secondary px-3" id="btnPrev" onclick="orderManager.changePage(-1)" disabled>
                <i class="fas fa-chevron-left me-1"></i> Trước
            </button>
            <div class="d-flex align-items-center gap-1 mx-2">
                <span class="small text-muted">Trang</span>
                <strong class="small" id="currentPageDisplay">1</strong>
            </div>
            <button class="btn btn-sm btn-outline-secondary px-3" id="btnNext" onclick="orderManager.changePage(1)">
                Sau <i class="fas fa-chevron-right ms-1"></i>
            </button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="orderModal">
    <div class="modal modal-wide">
        <div class="modal-header">
            <h3 id="modalTitle">Điều phối đơn hàng</h3>
            <button class="btn-delete-small" type="button" onclick="orderManager.closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <form id="orderForm" onsubmit="orderManager.handleSubmit(event)">
                <input type="hidden" id="orderId">

                <section class="modal-section">
                    <h4>1. Khách hàng & yêu cầu</h4>
                    <p>Giữ khớp dữ liệu với form public, bao gồm công ty và yêu cầu khảo sát trước.</p>
                    <div class="editor-grid">
                        <div class="field">
                            <label class="label">Mã đơn nội bộ</label>
                            <input type="text" id="ma_yeu_cau_noi_bo" class="input" placeholder="Tự sinh nếu để trống">
                        </div>
                        <div class="field">
                            <label class="label">Trạng thái</label>
                            <select id="trang_thai" class="select" required>
                                <option value="moi">Mới tiếp nhận</option>
                                <option value="dang_xu_ly">Đã nhận đơn</option>
                                <option value="dang_trien_khai">Đang triển khai</option>
                                <option value="da_xac_nhan">Đã hoàn thành</option>
                                <option value="da_huy">Đã hủy</option>
                            </select>
                        </div>
                        <div class="field">
                            <label class="label">Họ tên khách hàng</label>
                            <input type="text" id="ho_ten" class="input" required>
                        </div>
                        <div class="field">
                            <label class="label">Số điện thoại</label>
                            <input type="tel" id="so_dien_thoai" class="input" required>
                        </div>
                        <div class="field">
                            <label class="label">Email</label>
                            <input type="email" id="customer_email" class="input">
                        </div>
                        <div class="field">
                            <label class="label">Tên công ty / đơn vị</label>
                            <input type="text" id="ten_cong_ty" class="input" placeholder="Áp dụng cho văn phòng, kho bãi...">
                        </div>
                        <div class="field">
                            <label class="label">Loại dịch vụ</label>
                            <select id="loai_dich_vu" class="select" required>
                                <option value="chuyen-nha">Chuyển nhà</option>
                                <option value="van-phong">Chuyển văn phòng</option>
                                <option value="kho-bai">Chuyển kho bãi</option>
                            </select>
                        </div>
                        <div class="field">
                            <label class="label">Khảo sát trước</label>
                            <select id="can_khao_sat_truoc" class="select">
                                <option value="0">Không</option>
                                <option value="1">Có</option>
                            </select>
                        </div>
                        <div class="field span-full">
                            <label class="label">Chi tiết dịch vụ</label>
                            <textarea id="chi_tiet_dich_vu" class="textarea" rows="2" placeholder="Ví dụ: Tháo lắp nội thất | Có thang máy | Bốc xếp nặng"></textarea>
                        </div>
                    </div>
                </section>

                <section class="modal-section">
                    <h4>2. Lịch, lộ trình & giá</h4>
                    <p>Cho phép admin chốt lịch, xe và tổng tiền mà không làm mất breakdown hiện tại của portal.</p>
                    <div class="editor-grid">
                        <div class="field">
                            <label class="label">Ngày thực hiện</label>
                            <input type="date" id="ngay_thuc_hien" class="input">
                        </div>
                        <div class="field">
                            <label class="label">Khung giờ</label>
                            <input type="text" id="khung_gio_thuc_hien" class="input" placeholder="sang, chieu, toi...">
                        </div>
                        <div class="field">
                            <label class="label">Loại xe</label>
                            <input type="text" id="loai_xe" class="input" placeholder="xe_tai_1_5_tan">
                        </div>
                        <div class="field">
                            <label class="label">Thời tiết dự kiến</label>
                            <input type="text" id="thoi_tiet_du_kien" class="input" placeholder="binh_thuong / troi_mua">
                        </div>
                        <div class="field">
                            <label class="label">Khoảng cách (km)</label>
                            <input type="number" id="khoang_cach_km" class="input" min="0" step="0.1">
                        </div>
                        <div class="field">
                            <label class="label">Điều kiện tiếp cận</label>
                            <input type="text" id="dieu_kien_tiep_can" class="input" placeholder="Thang máy | Xe đỗ xa | Đường cấm tải">
                        </div>
                        <div class="field span-full">
                            <label class="label">Địa chỉ đi</label>
                            <input type="text" id="dia_chi_di" class="input" placeholder="Điểm đi">
                        </div>
                        <div class="field span-full">
                            <label class="label">Địa chỉ đến</label>
                            <input type="text" id="dia_chi_den" class="input" placeholder="Điểm đến">
                        </div>
                        <div class="field">
                            <label class="label">Tạm tính (VNĐ)</label>
                            <input type="number" id="tong_tam_tinh" class="input" min="0" step="1000">
                        </div>
                        <div class="field">
                            <label class="label">Tổng tiền chốt (VNĐ)</label>
                            <input type="number" id="tong_tien" class="input" min="0" step="1000">
                        </div>
                    </div>
                </section>

                <section class="modal-section">
                    <h4>3. Điều phối & mốc xử lý</h4>
                    <p>Gán hoặc đổi nhà cung cấp, chỉnh mốc nhận đơn, bắt đầu, hoàn tất, hủy và ghi lý do hủy nếu cần.</p>
                    <div class="editor-grid">
                        <div class="field">
                            <label class="label">Nhà cung cấp</label>
                            <select id="provider_id" class="select">
                                <option value="">Chưa gán</option>
                            </select>
                        </div>
                        <div class="field">
                            <label class="label">Nhận đơn lúc</label>
                            <input type="datetime-local" id="accepted_at" class="input">
                        </div>
                        <div class="field">
                            <label class="label">Bắt đầu lúc</label>
                            <input type="datetime-local" id="started_at" class="input">
                        </div>
                        <div class="field">
                            <label class="label">Hoàn tất lúc</label>
                            <input type="datetime-local" id="completed_at" class="input">
                        </div>
                        <div class="field">
                            <label class="label">Hủy lúc</label>
                            <input type="datetime-local" id="cancelled_at" class="input">
                        </div>
                        <div class="field">
                            <label class="label">Lý do hủy</label>
                            <input type="text" id="cancel_reason" class="input" placeholder="Khách đổi lịch / Quá SLA / Sai thông tin...">
                        </div>
                        <div class="field span-full">
                            <label class="label">Ghi chú khách hàng</label>
                            <textarea id="ghi_chu" class="textarea" rows="3"></textarea>
                        </div>
                        <div class="field span-full">
                            <label class="label">Ghi chú nội bộ admin</label>
                            <textarea id="note_admin" class="textarea" rows="3" placeholder="Lưu ý điều phối, ghi chú kiểm tra hồ sơ, báo giá..."></textarea>
                        </div>
                    </div>
                </section>

                <section class="modal-section">
                    <h4>4. Dữ liệu runtime từ portal</h4>
                    <p>Giữ nguyên các trường JSON để portal khách hàng và nhà cung cấp vẫn render đúng chi tiết.</p>
                    <div class="editor-grid">
                        <div class="field span-full">
                            <label class="label">du_lieu_form_json</label>
                            <textarea id="du_lieu_form_json" class="textarea" rows="6" placeholder='{"can_khao_sat_truoc":"1"}'></textarea>
                        </div>
                        <div class="field span-full">
                            <label class="label">pricing_breakdown_json</label>
                            <textarea id="pricing_breakdown_json" class="textarea" rows="6" placeholder='[{"label":"Tổng tạm tính","amount_value":3500000}]'></textarea>
                        </div>
                    </div>
                </section>

                <section class="modal-section">
                    <h4>5. Media & phản hồi khách hàng</h4>
                    <p>Xem nhanh ảnh/video từ đặt lịch và feedback sau hoàn tất để không phải mở portal khách hàng.</p>
                    <div class="editor-grid">
                        <div class="field span-full">
                            <label class="label">Ảnh / video từ đơn đặt lịch</label>
                            <div id="orderMediaPreview" class="media-preview-list"></div>
                        </div>
                        <div class="field span-full">
                            <label class="label">Feedback khách hàng</label>
                            <div class="feedback-box">
                                <div class="feedback-score">
                                    <strong id="feedbackScore">0/5</strong>
                                    <span class="feedback-score-label">Đánh giá</span>
                                </div>
                                <div class="feedback-note" id="feedbackNote">Chưa có phản hồi từ khách hàng.</div>
                            </div>
                        </div>
                        <div class="field span-full">
                            <label class="label">Ảnh / video feedback</label>
                            <div id="feedbackMediaPreview" class="media-preview-list"></div>
                        </div>
                        <div class="field span-full">
                            <label class="label">Báo cáo nhà cung cấp</label>
                            <div class="feedback-box">
                                <div class="feedback-score">
                                    <strong id="providerReportStatus">Chưa có</strong>
                                    <span class="feedback-score-label">Báo cáo</span>
                                </div>
                                <div class="feedback-note" id="providerReportNote">Chưa có báo cáo từ nhà cung cấp.</div>
                            </div>
                        </div>
                        <div class="field span-full">
                            <label class="label">Ảnh / video báo cáo NCC</label>
                            <div id="providerMediaPreview" class="media-preview-list"></div>
                        </div>
                    </div>
                </section>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="orderManager.closeModal()">Đóng</button>
            <button type="submit" class="btn btn-primary" id="btnSave" form="orderForm">
                <i class="fas fa-floppy-disk"></i>Lưu điều phối
            </button>
        </div>
    </div>
</div>

<div class="modal-overlay modal-overlay-delete" id="confirmDeleteModal">
    <div class="modal modal-delete-confirm">
        <div class="modal-header">
            <h3>Xóa đơn hàng?</h3>
            <button class="btn-delete-small" type="button" onclick="orderManager.closeDeleteModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <p class="delete-confirm-copy">Thao tác này chỉ nên dùng với đơn thử nghiệm hoặc dữ liệu nhập sai hoàn toàn. Với đơn thực tế, ưu tiên chuyển trạng thái sang hủy để giữ lịch sử vận hành.</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" type="button" onclick="orderManager.closeDeleteModal()">Hủy</button>
            <button class="btn btn-primary btn-danger-flat" type="button" id="confirmDeleteBtn">
                <i class="fas fa-trash-alt"></i>Xóa vĩnh viễn
            </button>
        </div>
    </div>
</div>

<div class="toast-container orders-toast-container" id="toastContainer"></div>

<script src="assets/js/admin-api.js"></script>
<script src="assets/js/orders-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
