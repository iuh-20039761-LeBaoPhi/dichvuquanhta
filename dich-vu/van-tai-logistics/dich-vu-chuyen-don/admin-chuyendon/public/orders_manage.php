<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Điều phối đơn hàng | Admin Chuyển Dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .operations-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 20px;
        margin-bottom: 32px;
    }

    .ops-card {
        background: white;
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 22px 24px;
        box-shadow: var(--shadow-premium);
    }

    .ops-card span {
        display: block;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--slate-light);
    }

    .ops-card strong {
        display: block;
        margin-top: 10px;
        font-size: 30px;
        font-weight: 900;
        color: var(--slate);
    }

    .ops-card p {
        margin: 8px 0 0;
        color: var(--slate-light);
        font-size: 13px;
        line-height: 1.5;
    }

    .order-meta-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
    }

    .order-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--slate-soft);
        border: 1px solid var(--line);
        font-size: 11px;
        font-weight: 700;
        color: var(--slate);
    }

    .order-chip.is-danger {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.18);
        color: #b91c1c;
    }

    .order-chip.is-warning {
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.22);
        color: #92400e;
    }

    .order-chip.is-success {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.22);
        color: #166534;
    }

    .order-chip.is-info {
        background: rgba(14, 165, 233, 0.1);
        border-color: rgba(14, 165, 233, 0.18);
        color: #0f766e;
    }

    .order-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .order-actions .btn {
        min-width: 42px;
        padding: 10px 12px;
    }

    .modal.modal-wide {
        width: min(1120px, 100%);
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
    }

    .modal.modal-wide .modal-body {
        overflow: auto;
        padding-bottom: 16px;
    }

    .modal-section {
        margin-bottom: 28px;
        padding: 22px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: #fff;
    }

    .modal-section h4 {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 800;
        color: var(--slate);
    }

    .modal-section p {
        margin: 0 0 18px;
        color: var(--slate-light);
        font-size: 13px;
        line-height: 1.6;
    }

    .json-preview,
    .media-preview-list {
        border: 1px dashed var(--line);
        border-radius: 14px;
        background: var(--slate-soft);
        padding: 14px 16px;
        min-height: 56px;
    }

    .json-preview code {
        display: block;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
        line-height: 1.6;
        color: var(--slate);
        font-family: Consolas, Monaco, monospace;
    }

    .media-preview-list {
        display: grid;
        gap: 10px;
    }

    .media-link {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 14px;
        border-radius: 12px;
        background: white;
        border: 1px solid var(--line);
        text-decoration: none;
        color: var(--slate);
        font-size: 13px;
        font-weight: 600;
    }

    .media-link:hover {
        border-color: var(--primary);
        color: var(--primary-deep);
    }

    .feedback-box {
        display: grid;
        grid-template-columns: 150px 1fr;
        gap: 16px;
        align-items: start;
    }

    .feedback-score {
        padding: 18px;
        border-radius: 16px;
        background: var(--primary-soft);
        border: 1px solid rgba(194, 122, 77, 0.16);
        text-align: center;
    }

    .feedback-score strong {
        display: block;
        font-size: 32px;
        font-weight: 900;
        color: var(--primary-deep);
    }

    .feedback-note {
        padding: 16px;
        border-radius: 16px;
        background: var(--slate-soft);
        border: 1px solid var(--line);
        white-space: pre-wrap;
        color: var(--slate);
        line-height: 1.6;
        min-height: 92px;
    }

    .field-note {
        margin-top: 8px;
        color: var(--slate-light);
        font-size: 12px;
        line-height: 1.5;
    }

    @media (max-width: 1180px) {
        .operations-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .operations-grid {
            grid-template-columns: 1fr;
        }

        .feedback-box {
            grid-template-columns: 1fr;
        }
    }
</style>

<section class="hero-card">
    <div>
        <h1>Điều phối đơn hàng chuyển dọn</h1>
        <p>Đồng bộ đầy đủ đơn từ hệ thống đặt lịch, gán nhà cung cấp, theo dõi mốc xử lý, phản hồi khách hàng và cảnh báo SLA trên cùng một màn quản trị.</p>
    </div>
    <div class="hero-actions" style="display:flex; gap:12px; flex-wrap:wrap;">
        <a href="admin_stats.php" class="btn btn-outline">
            <i class="fas fa-chart-line"></i>Dashboard
        </a>
        <button class="btn btn-primary" type="button" onclick="orderManager.showOrderModal()">
            <i class="fas fa-plus"></i>Tạo đơn nội bộ
        </button>
    </div>
</section>

<section class="operations-grid">
    <article class="ops-card">
        <span>Tổng đơn</span>
        <strong id="statsTotalOrders">0</strong>
        <p>Tất cả yêu cầu đã đồng bộ từ bảng đặt lịch chuyển dọn.</p>
    </article>
    <article class="ops-card">
        <span>Đang mở</span>
        <strong id="statsOpenOrders">0</strong>
        <p>Đơn mới, đã nhận hoặc đang triển khai chưa kết thúc.</p>
    </article>
    <article class="ops-card">
        <span>Quá SLA 120 phút</span>
        <strong id="statsLateOrders">0</strong>
        <p>Đơn còn chờ nhận quá 120 phút và cần điều phối ngay.</p>
    </article>
    <article class="ops-card">
        <span>Tổng dự kiến</span>
        <strong id="statsTotalValue">0 ₫</strong>
        <p>Tổng tạm tính các đơn chưa hủy để theo dõi doanh thu dự kiến.</p>
    </article>
</section>

<section class="panel">
    <div class="section-header">
        <div>
            <h2>Danh sách đơn hàng</h2>
            <p>Lọc theo nhà cung cấp, khảo sát, đánh giá và cảnh báo đơn quá thời gian chờ nhận.</p>
        </div>
        <button class="btn btn-outline" type="button" onclick="orderManager.fetchOrders()">
            <i class="fas fa-rotate"></i>Tải lại
        </button>
    </div>

    <div class="premium-toolbar">
        <div class="input-icon-group" style="flex: 2;">
            <label class="label">Tìm kiếm</label>
            <div style="position: relative;">
                <i class="fas fa-search"></i>
                <input type="text" class="input" id="orderSearchInput" placeholder="Mã đơn, khách hàng, SĐT, công ty, địa chỉ..." oninput="orderManager.handleSearch(this.value)">
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Trạng thái</label>
            <div style="position: relative;">
                <i class="fas fa-filter"></i>
                <select class="select" id="statusFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="pending">Mới tiếp nhận</option>
                    <option value="accepted">Đã nhận đơn</option>
                    <option value="shipping">Đang triển khai</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Dịch vụ</label>
            <div style="position: relative;">
                <i class="fas fa-truck-loading"></i>
                <select class="select" id="serviceFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="chuyen-nha">Chuyển nhà</option>
                    <option value="van-phong">Chuyển văn phòng</option>
                    <option value="kho-bai">Chuyển kho bãi</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Nhà cung cấp</label>
            <div style="position: relative;">
                <i class="fas fa-user-tie"></i>
                <select class="select" id="providerFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Khảo sát trước</label>
            <div style="position: relative;">
                <i class="fas fa-clipboard-check"></i>
                <select class="select" id="surveyFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="yes">Có</option>
                    <option value="no">Không</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Cảnh báo</label>
            <div style="position: relative;">
                <i class="fas fa-triangle-exclamation"></i>
                <select class="select" id="alertFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="late">Quá SLA 120 phút</option>
                    <option value="cancelled">Đã hủy</option>
                </select>
            </div>
        </div>

        <div class="input-icon-group">
            <label class="label">Đánh giá khách</label>
            <div style="position: relative;">
                <i class="fas fa-star"></i>
                <select class="select" id="feedbackFilter" onchange="orderManager.handleFilterChange()">
                    <option value="">Tất cả</option>
                    <option value="has-feedback">Có đánh giá</option>
                    <option value="low-rating">Từ 3 sao trở xuống</option>
                </select>
            </div>
        </div>

        <div id="filterChips" class="filter-chips"></div>
    </div>

    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Mã đơn & khách hàng</th>
                    <th>Dịch vụ & lịch</th>
                    <th>Điều phối</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody id="orderListBody"></tbody>
        </table>
    </div>
</section>

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
                                    <span style="font-size:12px; color:var(--slate-light); font-weight:700;">Đánh giá</span>
                                </div>
                                <div class="feedback-note" id="feedbackNote">Chưa có phản hồi từ khách hàng.</div>
                            </div>
                        </div>
                        <div class="field span-full">
                            <label class="label">Ảnh / video feedback</label>
                            <div id="feedbackMediaPreview" class="media-preview-list"></div>
                        </div>
                        <div class="field span-full">
                            <label class="label">provider_report / ghi chú hiện trường</label>
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

<div class="modal-overlay" id="confirmDeleteModal" style="z-index: 1100;">
    <div class="modal" style="max-width: 420px;">
        <div class="modal-header">
            <h3>Xóa đơn hàng?</h3>
            <button class="btn-delete-small" type="button" onclick="orderManager.closeDeleteModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <p style="margin:0; color:var(--slate-light); line-height:1.7;">Thao tác này chỉ nên dùng với đơn thử nghiệm hoặc dữ liệu nhập sai hoàn toàn. Với đơn thực tế, ưu tiên chuyển trạng thái sang hủy để giữ lịch sử vận hành.</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" type="button" onclick="orderManager.closeDeleteModal()">Hủy</button>
            <button class="btn btn-primary" type="button" id="confirmDeleteBtn" style="background:var(--danger); box-shadow:none;">
                <i class="fas fa-trash-alt"></i>Xóa vĩnh viễn
            </button>
        </div>
    </div>
</div>

<div class="toast-container" id="toastContainer" style="position: fixed; top: 100px; right: 24px; display: grid; gap: 12px; z-index: 1300;"></div>

<script src="assets/js/admin-api.js"></script>
<script src="assets/js/orders-manage.js"></script>

<?php include __DIR__ . '/../includes/footer_admin.php'; ?>
