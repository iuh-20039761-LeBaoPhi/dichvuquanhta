/**
 * order-detail-hybrid.js - Admin Version
 * Reuses the HTML structure from the main project for 100% CSS accuracy.
 * But uses Admin API to skip provider authentication redirects.
 */
const orderDetailManager = (function() {
    let currentOrder = null;

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('madonhang') || params.get('id');

        if (!orderId) {
            renderError('Không tìm thấy mã đơn hàng trong URL.');
            return;
        }

        try {
            await fetchOrderDetail(orderId);
        } catch (err) {
            renderError('Lỗi tải dữ liệu: ' + err.message);
        }
    }

    async function fetchOrderDetail(id) {
        const root = document.getElementById('admin-order-detail-root');
        try {
            const krud = window.adminApi;
            if (!krud) throw new Error('Không tìm thấy adminApi');

            const order = await krud.get('dich_vu_chuyen_don_dat_lich', id);
            if (!order) throw new Error('Đơn hàng không tồn tại.');

            currentOrder = order;
            render(order);
        } catch (err) {
            console.error(err);
            renderError(err.message);
        }
    }

    function render(order) {
        const root = document.getElementById('admin-order-detail-root');
        
        // Data Normalization (similar to main project)
        const statusKey = deriveStatusKey(order);
        const statusMeta = getStatusBadge(statusKey);
        const progress = getProgressMeta(statusKey, order);

        root.innerHTML = `
            <div class="standalone-order-unified-card">
                <!-- TOPBAR -->
                <header class="standalone-order-topbar">
                    <div class="standalone-order-topbar-center">
                        <div class="standalone-order-topbar-meta">
                            <span><i class="fa-solid fa-hashtag"></i> MÃ ĐƠN: ${order.id}</span>
                            <span><i class="fa-solid fa-calendar-day"></i> NGÀY TẠO: ${formatDate(order.created_date)}</span>
                        </div>
                    </div>
                </header>

                <!-- HERO SECTION -->
                <section class="standalone-order-card-header">
                    <div class="standalone-order-hero-top-row">
                        <div class="standalone-order-card-title">
                            <p class="standalone-order-card-kicker">${order.loai_dich_vu === 'chuyen-nha' ? 'CHUYỂN NHÀ' : 'CHUYỂN DỌN'}</p>
                            <h1>Đơn hàng của ${order.ho_ten || 'Khách hàng'}</h1>
                            <p class="standalone-order-card-summary">Lộ trình: ${order.dia_chi_di || '...'} <i class="fa-solid fa-arrow-right-long mx-2"></i> ${order.dia_chi_den || '...'}</p>
                        </div>
                        
                        <!-- Progress Ring -->
                        <div class="standalone-order-hero-side-progress">
                            <div class="standalone-order-progress-ring status-${progress.tone}" style="--progress: ${progress.percent}%">
                                <div class="standalone-order-progress-ring-core">
                                    <strong>${progress.percent}%</strong>
                                    <span>${progress.label}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="standalone-order-header-footer-row">
                        <div class="standalone-order-header-status-badge">
                            <span class="customer-status-badge status-${statusMeta.className}">${statusMeta.label}</span>
                        </div>
                        <div class="standalone-order-actions-group">
                            <button class="customer-btn customer-btn-ghost" onclick="window.print()">
                                <i class="fa-solid fa-print me-2"></i>In đơn hàng
                            </button>
                            <button class="customer-btn customer-btn-primary" onclick="alert('Tính năng chỉnh sửa đang phát triển')">
                                <i class="fa-solid fa-edit me-2"></i>Chỉnh sửa (Admin)
                            </button>
                        </div>
                    </div>
                </section>

                <!-- GRID CONTENT -->
                <div class="standalone-order-grid">
                    <!-- BLOCK 1: THÔNG TIN LỘ TRÌNH -->
                    <section class="standalone-order-block">
                        <div class="standalone-order-block-header">
                            <p class="standalone-order-block-kicker">Chi tiết</p>
                            <h2>Thông tin vận hành</h2>
                        </div>
                        
                        <div class="standalone-order-hero-metrics">
                            ${renderHeroMetric('fa-solid fa-truck', 'Loại xe', order.ten_loai_xe || order.loai_xe || 'Chưa chọn', 'Trọng tải phù hợp')}
                            ${renderHeroMetric('fa-solid fa-clock', 'Thời gian', order.ngay_thuc_hien, order.khung_gio_thuc_hien || 'Giờ hành chính')}
                            ${renderHeroMetric('fa-solid fa-route', 'Khoảng cách', (order.khoang_cach_km || '0') + ' km', 'Dự toán thực tế')}
                            ${renderHeroMetric('fa-solid fa-cloud-sun', 'Thời tiết', order.thoi_tiet_du_kien || 'Nắng ráo', 'Dự kiến thực hiện')}
                        </div>
                    </section>

                    <!-- BLOCK 2: ĐIỀU KIỆN TIẾP CẬN & DỊCH VỤ -->
                    <section class="standalone-order-block">
                        <div class="standalone-order-summary-grid">
                            <div class="standalone-order-panel">
                                <div class="standalone-order-panel-head">
                                    <strong>Điều kiện tiếp cận</strong>
                                </div>
                                ${renderChips(order.dieu_kien_tiep_can, 'Chưa cập nhật điều kiện.')}
                            </div>
                            <div class="standalone-order-panel">
                                <div class="standalone-order-panel-head">
                                    <strong>Chi tiết dịch vụ</strong>
                                </div>
                                ${renderChips(order.chi_tiet_dich_vu, 'Chưa cập nhật chi tiết.')}
                            </div>
                        </div>
                    </section>

                    <!-- BLOCK 3: MEDIA (ẢNH/VIDEO) -->
                    <section class="standalone-order-block">
                        <div class="standalone-order-block-header">
                            <p class="standalone-order-block-kicker">Tài liệu</p>
                            <h2>Hình ảnh & Video hiện trường</h2>
                        </div>
                        ${renderMediaGallery(order)}
                    </section>

                    <!-- BLOCK 4: TIMELINE -->
                    <section class="standalone-order-block">
                        <div class="standalone-order-block-header">
                            <p class="standalone-order-block-kicker">Lịch sử</p>
                            <h2>Nhật ký đơn hàng</h2>
                        </div>
                        ${renderTimeline(order)}
                    </section>
                </div>
            </div>
        `;
    }

    // --- Helpers (Copy từ hệ thống gốc để chuẩn CSS) ---
    
    function renderHeroMetric(icon, label, value, hint) {
        return `
            <article class="standalone-order-hero-metric">
                <div class="standalone-order-hero-metric-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="standalone-order-hero-metric-copy">
                    <span>${label}</span>
                    <strong>${value || '--'}</strong>
                    <small>${hint}</small>
                </div>
            </article>
        `;
    }

    function renderChips(data, emptyText) {
        const items = String(data || '').split('|').filter(Boolean);
        if (items.length === 0) return `<p style="font-size: 13px; color: var(--slate-light);">${emptyText}</p>`;
        
        return `<div class="standalone-order-item-meta">
            ${items.map(item => `<span class="standalone-order-chip">${item}</span>`).join('')}
        </div>`;
    }

    function renderMediaGallery(order) {
        const images = String(order.anh_dinh_kem || '').split('|').filter(Boolean);
        const videos = String(order.video_dinh_kem || '').split('|').filter(Boolean);
        const total = images.length + videos.length;

        if (total === 0) return '<div class="standalone-order-note-panel"><p>Không có tài liệu đính kèm.</p></div>';

        return `
            <div class="standalone-order-media-grid">
                ${images.map(img => `
                    <div class="standalone-order-media-item">
                        <div class="standalone-order-item-icon"><i class="fa-solid fa-image"></i></div>
                        <strong>Ảnh đính kèm</strong>
                        <span>${img}</span>
                    </div>
                `).join('')}
                ${videos.map(vid => `
                    <div class="standalone-order-media-item">
                        <div class="standalone-order-item-icon"><i class="fa-solid fa-video"></i></div>
                        <strong>Video đính kèm</strong>
                        <span>${vid}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderTimeline(order) {
        const entries = [
            { time: order.created_date, title: 'Yêu cầu khởi tạo', note: 'Khách hàng đã gửi yêu cầu lên hệ thống.' }
        ];

        if (order.accepted_at) entries.push({ time: order.accepted_at, title: 'Đã nhận đơn', note: 'Nhà cung cấp đã tiếp nhận yêu cầu.' });
        if (order.started_at) entries.push({ time: order.started_at, title: 'Đang triển khai', note: 'Đội ngũ đang thực hiện tại hiện trường.' });
        if (order.completed_at) entries.push({ time: order.completed_at, title: 'Hoàn thành', note: 'Đơn hàng đã hoàn tất thành công.' });
        if (order.cancelled_at || order.trang_thai === 'da_huy') entries.push({ time: order.cancelled_at || order.updated_at, title: 'Đã hủy', note: 'Yêu cầu đã được đóng lại.' });

        return `
            <div class="standalone-order-timeline">
                ${entries.map((item, index) => `
                    <article class="standalone-order-timeline-item">
                        <div class="standalone-order-timeline-dot ${index === entries.length - 1 ? 'is-active' : ''}"></div>
                        <div class="standalone-order-timeline-content">
                            <small>${formatDate(item.time)}</small>
                            <strong>${item.title}</strong>
                            <p>${item.note}</p>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;
    }

    function deriveStatusKey(order) {
        const status = order.trang_thai;
        if (status === 'da_huy') return 'cancelled';
        if (status === 'hoan_tat') return 'completed';
        if (order.started_at) return 'shipping';
        if (order.accepted_at) return 'accepted';
        return 'pending';
    }

    function getStatusBadge(key) {
        const map = {
            'cancelled': { className: 'cancelled', label: 'Đã hủy' },
            'completed': { className: 'completed', label: 'Hoàn tất' },
            'shipping': { className: 'shipping', label: 'Đang triển khai' },
            'accepted': { className: 'shipping', label: 'Đã nhận đơn' },
            'pending': { className: 'pending', label: 'Mới tiếp nhận' }
        };
        return map[key] || map['pending'];
    }

    function getProgressMeta(key, order) {
        const map = {
            'cancelled': { percent: 100, tone: 'cancelled', label: 'Đã hủy' },
            'completed': { percent: 100, tone: 'completed', label: 'Hoàn tất' },
            'shipping': { percent: 75, tone: 'shipping', label: 'Đang làm' },
            'accepted': { percent: 40, tone: 'shipping', label: 'Đã nhận' },
            'pending': { percent: 15, tone: 'pending', label: 'Chờ xử lý' }
        };
        return map[key] || map['pending'];
    }

    function renderError(msg) {
        document.getElementById('admin-order-detail-root').innerHTML = `
            <div class="standalone-order-error">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>${msg}</p>
            </div>
        `;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '--';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
    }

    // Khởi chạy khi DOM sẵn sàng
    document.addEventListener('DOMContentLoaded', init);

    return { init };
})();
