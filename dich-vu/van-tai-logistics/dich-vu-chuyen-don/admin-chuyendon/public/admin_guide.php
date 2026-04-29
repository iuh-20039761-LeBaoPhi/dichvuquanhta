<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$pageTitle = 'Hướng dẫn vận hành | Admin chuyển dọn';
require_once __DIR__ . '/../includes/header_admin.php';
?>

<style>
    .guide-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 24px;
        align-items: stretch;
        padding: 28px;
        margin-bottom: 24px;
        border-radius: 24px;
        color: #fff;
        background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.18), transparent 24%),
            linear-gradient(135deg, #0f172a 0%, #1f2937 50%, #9a612f 100%);
        box-shadow: var(--shadow-lg);
    }

    .guide-hero__eyebrow {
        margin: 0 0 8px;
        color: rgba(255, 255, 255, 0.72);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .guide-hero h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1.12;
        letter-spacing: -0.03em;
    }

    .guide-hero p {
        margin: 14px 0 0;
        max-width: 760px;
        color: rgba(255, 255, 255, 0.82);
        line-height: 1.72;
    }

    .guide-hero__meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        align-content: start;
    }

    .guide-metric {
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.1);
    }

    .guide-metric small {
        display: block;
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .guide-metric strong {
        display: block;
        margin-top: 8px;
        font-size: 24px;
        line-height: 1.1;
    }

    .guide-layout {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        gap: 24px;
        align-items: start;
    }

    .guide-toc {
        position: sticky;
        top: 96px;
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: #fff;
        box-shadow: var(--shadow-premium);
    }

    .guide-toc h2 {
        margin: 0 0 12px;
        color: var(--primary-deep);
        font-size: 16px;
        font-weight: 800;
    }

    .guide-toc a {
        display: block;
        padding: 10px 12px;
        border-radius: 12px;
        color: var(--slate);
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
    }

    .guide-toc a:hover {
        background: var(--slate-soft);
        color: var(--primary-deep);
    }

    .guide-stack {
        display: grid;
        gap: 20px;
    }

    .guide-section {
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: #fff;
        box-shadow: var(--shadow-premium);
        scroll-margin-top: 96px;
    }

    .guide-section h2 {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 0 0 12px;
        color: var(--primary-deep);
        font-size: 23px;
        font-weight: 900;
    }

    .guide-section h3 {
        margin: 18px 0 10px;
        color: var(--slate);
        font-size: 16px;
        font-weight: 800;
    }

    .guide-section p {
        margin: 0 0 12px;
        color: var(--slate-light);
        line-height: 1.72;
    }

    .guide-section ul,
    .guide-section ol {
        margin: 0 0 14px;
        padding-left: 20px;
        color: var(--slate);
        line-height: 1.7;
    }

    .guide-section li {
        margin-bottom: 6px;
    }

    .guide-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 12px 0 16px;
    }

    .guide-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(13, 148, 136, 0.16);
        background: rgba(13, 148, 136, 0.08);
        color: #0f766e;
        font-size: 12px;
        font-weight: 800;
    }

    .guide-note {
        padding: 14px 16px;
        margin: 14px 0;
        border-radius: 16px;
        border: 1px solid rgba(245, 158, 11, 0.24);
        background: rgba(245, 158, 11, 0.09);
        color: #92400e;
        line-height: 1.68;
        font-weight: 700;
    }

    .guide-danger {
        border-color: rgba(239, 68, 68, 0.2);
        background: rgba(239, 68, 68, 0.08);
        color: #991b1b;
    }

    .guide-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 14px;
    }

    .guide-card {
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--slate-soft);
    }

    .guide-card strong {
        display: block;
        margin-bottom: 8px;
        color: var(--primary-deep);
        font-size: 15px;
    }

    .guide-card span {
        color: var(--slate-light);
        line-height: 1.68;
    }

    .guide-table-wrap {
        overflow-x: auto;
        margin-top: 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
    }

    .guide-table {
        width: 100%;
        min-width: 720px;
        border-collapse: collapse;
        background: #fff;
    }

    .guide-table th,
    .guide-table td {
        padding: 13px 14px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
        text-align: left;
    }

    .guide-table th {
        background: var(--slate-soft);
        color: var(--primary-deep);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .guide-table tr:last-child td {
        border-bottom: none;
    }

    .guide-link-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
    }

    .guide-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 12px;
        background: var(--primary-soft);
        color: var(--primary-deep);
        font-weight: 800;
        text-decoration: none;
    }

    .guide-link:hover {
        filter: brightness(0.98);
    }

    @media (max-width: 1120px) {
        .guide-hero,
        .guide-layout,
        .guide-grid {
            grid-template-columns: 1fr;
        }

        .guide-toc {
            position: static;
        }
    }
</style>

<section class="guide-hero">
    <div>
        <p class="guide-hero__eyebrow">Admin chuyển dọn</p>
        <h1>Hướng dẫn vận hành đầy đủ cho đội điều phối</h1>
        <p>Trang này gom toàn bộ quy ước vận hành hiện có của `admin-chuyendon`: cách đọc dashboard, xử lý đơn, rà soát hồ sơ nhà cung cấp, cập nhật bảng giá, theo dõi liên hệ, kiểm soát upload và xử lý các tình huống lỗi thường gặp. Nội dung bên dưới bám theo code và luồng đang chạy thực tế, không phải tài liệu giả lập.</p>
        <div class="guide-link-row">
            <a class="guide-link" href="admin_stats.php"><i class="fas fa-chart-line"></i> Mở Dashboard</a>
            <a class="guide-link" href="orders_manage.php"><i class="fas fa-truck"></i> Mở Đơn hàng</a>
            <a class="guide-link" href="notifications.php"><i class="fas fa-bell"></i> Mở Thông báo</a>
        </div>
    </div>

    <div class="guide-hero__meta">
        <article class="guide-metric">
            <small>Mô hình dữ liệu</small>
            <strong>KRUD</strong>
        </article>
        <article class="guide-metric">
            <small>Service ID</small>
            <strong>12</strong>
        </article>
        <article class="guide-metric">
            <small>Rule quá hạn</small>
            <strong>120 phút</strong>
        </article>
        <article class="guide-metric">
            <small>Admin mặc định</small>
            <strong>admin01</strong>
        </article>
    </div>
</section>

<section class="guide-layout">
    <aside class="guide-toc">
        <h2>Mục lục nhanh</h2>
        <a href="#tong-quan">1. Tổng quan</a>
        <a href="#luong-hang-ngay">2. Luồng xử lý hằng ngày</a>
        <a href="#dashboard">3. Dashboard và cảnh báo</a>
        <a href="#don-hang">4. Đơn hàng và trạng thái</a>
        <a href="#nguoi-dung">5. Nhà cung cấp và người dùng</a>
        <a href="#noi-dung-dich-vu">6. Nội dung dịch vụ</a>
        <a href="#bang-gia">7. Bảng giá và export JSON</a>
        <a href="#lien-he">8. Liên hệ</a>
        <a href="#thong-bao">9. Thông báo</a>
        <a href="#cam-nang">10. Cẩm nang</a>
        <a href="#upload">11. Upload và hồ sơ giấy tờ</a>
        <a href="#auth">12. Đăng nhập / đăng xuất</a>
        <a href="#su-co">13. Sự cố thường gặp</a>
        <a href="#checklist">14. Checklist bàn giao ca</a>
    </aside>

    <div class="guide-stack">
        <article class="guide-section" id="tong-quan">
            <h2><i class="fas fa-compass"></i> Tổng quan hệ thống</h2>
            <p>`admin-chuyendon` là cụm quản trị vận hành cho dịch vụ chuyển dọn. Shell admin dùng `PHP session` để kiểm soát đăng nhập, còn dữ liệu nghiệp vụ hiện đọc/ghi chủ yếu qua KRUD dùng chung.</p>
            <div class="guide-chip-row">
                <span class="guide-chip"><i class="fas fa-database"></i> Bảng người dùng: `nguoidung`</span>
                <span class="guide-chip"><i class="fas fa-clipboard-list"></i> Bảng đơn: `dich_vu_chuyen_don_dat_lich`</span>
                <span class="guide-chip"><i class="fas fa-envelope-open-text"></i> Bảng liên hệ: `lien_he`</span>
                <span class="guide-chip"><i class="fas fa-cloud-arrow-up"></i> Upload limit đọc qua `public/upload_settings.php`</span>
            </div>
            <p>Màn admin hiện có các khu chính: `Dashboard`, `Đơn hàng`, `Nhà cung cấp & người dùng`, `Nội dung dịch vụ`, `Bảng giá`, `Liên hệ`, `Cẩm nang`, `Thông báo`, `Cấu hình upload`, và trang `Hướng dẫn` này.</p>
            <div class="guide-note">Admin không nên sửa trực tiếp Apps Script Google Drive hoặc Google Sheet để ép đổi folder upload. Các route upload và folder mapping của chuyển dọn đã được chốt riêng.</div>
            <div class="guide-grid">
                <article class="guide-card">
                    <strong>Khi nào mở Dashboard</strong>
                    <span>Dùng đầu ca để xem tổng số đơn mở, đơn quá 120 phút chưa có provider nhận, provider đang chờ duyệt hoặc thiếu hồ sơ, và số contact mới.</span>
                </article>
                <article class="guide-card">
                    <strong>Khi nào mở Đơn hàng <span class="guide-status-badge badge-full">Toàn quyền</span></strong>
                    <span>Dùng để gán provider, cập nhật trạng thái, kiểm tra lịch thực hiện, rà ghi chú và media hiện trường, hoặc mở chi tiết một đơn cụ thể.</span>
                </article>
                <article class="guide-card">
                    <strong>Khi nào mở Users <span class="guide-status-badge badge-readonly">Chỉ xem</span></strong>
                    <span>Dùng để rà soát hồ sơ provider (Avatar/CCCD) và kiểm tra thông tin liên hệ. Lưu ý: Chức năng sửa/xóa đã bị khóa để bảo mật dữ liệu dùng chung.</span>
                </article>
                <article class="guide-card">
                    <strong>Khi nào mở Bảng giá</strong>
                    <span>Dùng khi thay đổi phụ phí, loại xe, hoặc cập nhật giá tham khảo cho frontend. Sau khi lưu, hệ thống export lại `bang-gia-minh-bach.json` cho public.</span>
                </article>
            </div>
        </article>

        <article class="guide-section" id="luong-hang-ngay">
            <h2><i class="fas fa-list-check"></i> Luồng xử lý hằng ngày</h2>
            <p>Quy trình tối thiểu để vận hành đúng trong một ca admin:</p>
            <ol>
                <li>Mở `Dashboard` để kiểm tra đơn quá SLA, provider thiếu hồ sơ, và contact mới.</li>
                <li>Vào `Thông báo` nếu cần danh sách cảnh báo theo từng record, sau đó nhảy sang đơn hoặc contact tương ứng.</li>
                <li>Mở `Đơn hàng`, lọc theo trạng thái và provider để xử lý các đơn mới, đơn cần gán nhà cung cấp, hoặc đơn có khảo sát trước.</li>
                <li>Rà `Nhà cung cấp & người dùng` để xác minh các provider đang `pending` hoặc thiếu `avatar + CCCD`.</li>
                <li>Nếu cần cập nhật trang dịch vụ chuyển dọn ngoài site, xử lý ở `Nội dung dịch vụ`, lưu xong rồi kiểm tra JSON public và giao diện thực tế.</li>
                <li>Nếu có thay đổi chính sách giá hoặc phụ phí, xử lý ở `Bảng giá`, xác nhận export JSON thành công rồi mới bàn giao.</li>
                <li>Cuối ca, kiểm tra `Liên hệ` và `Cẩm nang` để tránh bỏ sót inbox mới hoặc bài viết đang cần cập nhật.</li>
            </ol>
            <div class="guide-note">Rule tự hủy hiện là kiểu `lazy sweep`: đơn chờ quá `120 phút` mà chưa được nhận sẽ bị đẩy sang `da_huy` khi có luồng tải dữ liệu từ khách hàng hoặc nhà cung cấp. Nghĩa là hệ thống chỉ dọn khi có request chạy qua, chưa phải job nền độc lập.</div>
        </article>

        <article class="guide-section" id="dashboard">
            <h2><i class="fas fa-chart-column"></i> Dashboard và cảnh báo</h2>
            <p>`admin_stats.php` là màn nhìn nhanh tình trạng vận hành. Các KPI và cảnh báo ở đây đang lấy từ KRUD theo logic đã được đồng bộ với các màn còn lại.</p>
            <h3>Các chỉ số chính</h3>
            <ul>
                <li>Tổng số đơn, số đơn đang mở, số đơn quá SLA, doanh thu dự kiến.</li>
                <li>Phân bổ đơn theo loại dịch vụ như chuyển nhà, chuyển văn phòng, chuyển kho bãi.</li>
                <li>Top provider theo số đơn đã được gán và số đơn hoàn tất.</li>
            </ul>
            <h3>Cảnh báo ưu tiên</h3>
            <ul>
                <li>Đơn quá `120 phút` chưa có provider nhận.</li>
                <li>Provider chờ duyệt hoặc thiếu hồ sơ.</li>
                <li>Contact mới thuộc đúng service chuyển dọn.</li>
            </ul>
            <div class="guide-note">Filter contact trong dashboard hiện chỉ lấy các bản ghi có gắn `service_key` hoặc `service_name` thuộc chuyển dọn. Record `lien_he` rỗng service sẽ không còn bị nuốt vào dashboard như trước.</div>
        </article>

        <article class="guide-section" id="don-hang">
            <h2><i class="fas fa-truck-ramp-box"></i> Đơn hàng và trạng thái <span class="guide-status-badge badge-full">Toàn quyền điều phối</span></h2>
            <p>`orders_manage.php` là nơi điều phối đơn hàng. Admin có thể lọc theo trạng thái, loại dịch vụ, nhà cung cấp, khoảng thời gian và từ khóa để tìm đúng yêu cầu cần xử lý.</p>
            <h3>Những điểm cần nhớ</h3>
            <ul>
                <li>Đơn có `can_khao_sat_truoc = 1` nghĩa là khách đã bật khảo sát trước trong form đặt lịch.</li>
                <li>Nếu đổi trạng thái sang `dang_xu_ly`, hệ thống sẽ tự điền `accepted_at` nếu mốc này còn trống.</li>
                <li>Nếu đổi sang `da_xac_nhan`, hệ thống sẽ xem như đơn hoàn tất và tự bổ sung `accepted_at` hoặc `completed_at` khi cần.</li>
                <li>Nếu đổi sang `da_huy`, admin nên nhập thêm `cancel_reason` hoặc ghi chú để tiện rà soát cuối ca.</li>
            </ul>
            <div class="guide-table-wrap">
                <table class="guide-table">
                    <thead>
                        <tr>
                            <th>Trạng thái</th>
                            <th>Ý nghĩa vận hành</th>
                            <th>Mốc thời gian liên quan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>moi</code> / mới tiếp nhận</td>
                            <td>Đơn mới vào hệ thống, chưa có provider nhận hoặc chưa bắt đầu xử lý thực tế.</td>
                            <td>`created_at`</td>
                        </tr>
                        <tr>
                            <td><code>dang_xu_ly</code></td>
                            <td>Đã có thao tác nhận hoặc triển khai. Nếu thiếu `accepted_at` hệ thống sẽ tự bù.</td>
                            <td>`accepted_at`</td>
                        </tr>
                        <tr>
                            <td><code>da_xac_nhan</code></td>
                            <td>Được hệ thống và trang chi tiết hiểu là đã hoàn tất.</td>
                            <td>`accepted_at`, `completed_at`</td>
                        </tr>
                        <tr>
                            <td><code>da_huy</code></td>
                            <td>Đơn bị hủy thủ công hoặc tự động theo rule quá hạn.</td>
                            <td>`cancelled_at` nếu backend chấp nhận, hoặc ít nhất là `trang_thai`</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <h3>Trang chi tiết đơn</h3>
            <p>`order_detail.php` dùng để đọc sâu dữ liệu một đơn và xem media hiện trường. Đây là giao diện chi tiết độc lập, tái tạo lại gần với góc nhìn của Nhà cung cấp để Admin hỗ trợ và đối chiếu chính xác hơn.</p>
            <div class="guide-note guide-danger">Nếu gặp đơn đã ở `da_xac_nhan` nhưng chưa có `completed_at`, hãy ưu tiên lưu lại đơn một lần từ admin để mốc hoàn tất được bổ sung cho dữ liệu sạch hơn.</div>
        </article>

        <article class="guide-section" id="nguoi-dung">
            <h2><i class="fas fa-users-gear"></i> Nhà cung cấp và người dùng <span class="guide-status-badge badge-readonly">Chế độ rà soát</span></h2>
            <p>`users_manage.php` hiển thị danh sách khách hàng và nhà cung cấp. Để đảm bảo tính toàn vẹn của dữ liệu người dùng dùng chung hệ sinh thái, Admin Chuyển Dọn hiện tại chỉ có quyền <strong>Rà soát (View Only)</strong>.</p>
            <h3>Logic xác minh đang dùng</h3>
            <ul>
                <li>Provider được xem là đủ hồ sơ khi có đủ `avatar + CCCD trước + CCCD sau`.</li>
                <li>Hệ thống hiện đã normalize cả field mới lẫn alias cũ như `avatar_link`, `cccd_front_link`, `cccd_back_link`.</li>
                <li>Dashboard, notifications và users đã dùng cùng một chuẩn xác minh, nên số liệu không còn lệch như trước.</li>
            </ul>
            <h3>Khi duyệt provider</h3>
            <ol>
                <li>Kiểm tra `trangthai` hiện tại có đang là `pending` hoặc `active`.</li>
                <li>Mở preview avatar và 2 mặt CCCD ngay trên form.</li>
                <li>Nếu hồ sơ thiếu/sai, hãy liên hệ trực tiếp hoặc thông báo qua hệ thống (không sửa trực tiếp trên form).</li>
            </ol>
            <div class="guide-note">Vì module ở chế độ Chỉ xem, mọi yêu cầu thay đổi thông tin tài khoản cần được thực hiện bởi Admin tổng hoặc thông qua các yêu cầu hỗ trợ.</div>
        </article>

        <article class="guide-section" id="noi-dung-dich-vu">
            <h2><i class="fas fa-layer-group"></i> Nội dung dịch vụ</h2>
            <p>`admin_service_content.php` là màn chỉnh nội dung cho trang `dich-vu-chuyen-don.html`. Màn này cho phép cập nhật Hero đầu trang, phần giới thiệu nhóm dịch vụ, nội dung từng card dịch vụ, ảnh minh họa và các CTA dẫn sang đặt lịch hoặc bảng giá.</p>
            <h3>Những gì đang quản lý được</h3>
            <ul>
                <li>Hero: eyebrow, tiêu đề, mô tả, CTA chính và CTA phụ.</li>
                <li>Khối giới thiệu dịch vụ: eyebrow, tiêu đề và mô tả chung phía trên danh sách card.</li>
                <li>Từng dịch vụ: label, tiêu đề, mô tả ngắn, ảnh, alt ảnh, danh sách hạng mục dịch vụ, CTA đặt lịch và CTA xem bảng giá.</li>
            </ul>
            <h3>Nguồn dữ liệu và export</h3>
            <ul>
                <li>Hero được bootstrap từ `dich-vu-chuyen-don.html` nếu KRUD chưa có dữ liệu.</li>
                <li>Danh sách dịch vụ cũ được bootstrap từ `public/assets/js/data/services-hub.json` nếu cần.</li>
                <li>Sau khi lưu, hệ thống export lại `public/assets/js/data/dich-vu-chuyen-don-page.json` qua `api/service_content_export.php` để frontend public đọc.</li>
            </ul>
            <div class="guide-note">Nếu lưu thành công ở KRUD nhưng trang ngoài site chưa đổi, hãy ưu tiên kiểm tra bước export JSON và làm mới cứng trang public trước khi kết luận dữ liệu bị mất.</div>
            <div class="guide-link-row">
                <a class="guide-link" href="admin_service_content.php"><i class="fas fa-pen-ruler"></i> Mở Nội dung dịch vụ</a>
                <a class="guide-link" href="../../dich-vu-chuyen-don.html" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Xem trang ngoài site</a>
            </div>
        </article>

        <article class="guide-section" id="bang-gia">
            <h2><i class="fas fa-money-bill-trend-up"></i> Bảng giá và export JSON</h2>
            <p>`admin_pricing.php` là màn chỉnh dữ liệu giá cho chuyển dọn. Nguồn chính hiện là KRUD; file `public/assets/js/data/bang-gia-minh-bach.json` chỉ là bản export để frontend public đọc nhanh.</p>
            <h3>Flow hiện tại</h3>
            <ul>
                <li>Nếu KRUD trống, màn admin có thể bootstrap dữ liệu từ JSON fallback.</li>
                <li>Khi admin lưu hoặc xóa một dòng, màn bảng giá sẽ cập nhật state cục bộ trước, không reload toàn trang như trước.</li>
                <li>Sau khi state đã cập nhật, admin gọi `api/pricing_export.php` để ghi lại `bang-gia-minh-bach.json` cho public.</li>
                <li>Nếu lưu KRUD thành công nhưng export JSON thất bại, màn admin sẽ báo lỗi lưu một phần thay vì giả vờ thành công hoàn toàn.</li>
            </ul>
            <div class="guide-grid">
                <article class="guide-card">
                    <strong>Khi thêm loại xe</strong>
                    <span>Nhập đủ tên hiển thị, slug, giá mở cửa, giá theo các band km và các giá dùng cho form. Slug cần ổn định để không tạo bản ghi trùng logic.</span>
                </article>
                <article class="guide-card">
                    <strong>Khi thêm hạng mục</strong>
                    <span>Các nhóm `checkbox_main` không cộng tiền. `checkbox_surcharge`, `khung_gio`, `thoi_tiet` mới là các nhóm có `don_gia` dùng trong bảng giá.</span>
                </article>
                <article class="guide-card">
                    <strong>Khi thấy dữ liệu cũ sai giá checkbox</strong>
                    <span>Màn admin có bước normalize để ép các checkbox thường về `0`, chỉ giữ giá cho `khao_sat_truoc`.</span>
                </article>
                <article class="guide-card">
                    <strong>Khi bàn giao sau khi sửa giá</strong>
                    <span>Xác nhận badge `Cập nhật lần cuối` đã hiện giờ export mới và xem `bang-gia-chuyen-don.html` hoặc flow đặt lịch nếu thay đổi lớn.</span>
                </article>
            </div>
        </article>

        <article class="guide-section" id="lien-he">
            <h2><i class="fas fa-inbox"></i> Liên hệ</h2>
            <p>`contact_manage.php` là nơi xử lý các liên hệ và yêu cầu đổ đúng về ngữ cảnh chuyển dọn. Đây thường là nguồn việc đến sớm hơn cả đơn hàng đã xác nhận.</p>
            <ul>
                <li>`contact_manage.php` chỉ hiển thị các contact có gắn service chuyển dọn.</li>
                <li>Record `lien_he` không có service sẽ không còn bị lẫn vào inbox chuyển dọn.</li>
                <li>Dùng màn này để cập nhật `status`, ghi chú xử lý và điều phối sang sale hoặc vận hành.</li>
            </ul>
            <div class="guide-link-row">
                <a class="guide-link" href="contact_manage.php"><i class="fas fa-headset"></i> Mở Liên hệ</a>
            </div>
        </article>

        <article class="guide-section" id="thong-bao">
            <h2><i class="fas fa-bell"></i> Thông báo</h2>
            <p>`notifications.php` là màn rà nhanh cảnh báo đầu ca. Nó gom các điểm cần chú ý mà admin cần chuyển tiếp sang Đơn hàng, Users hoặc Liên hệ.</p>
            <ul>
                <li>`notifications.php` tổng hợp đơn quá SLA, provider cần rà hồ sơ và contact mới.</li>
                <li>Đây là màn phù hợp để đầu ca rà nhanh từng cảnh báo rồi nhảy sang màn xử lý tương ứng.</li>
            </ul>
            <div class="guide-link-row">
                <a class="guide-link" href="notifications.php"><i class="fas fa-bell"></i> Mở Thông báo</a>
            </div>
        </article>

        <article class="guide-section" id="cam-nang">
            <h2><i class="fas fa-newspaper"></i> Cẩm nang</h2>
            <p>`articles_manage.php` quản lý bài viết/cẩm nang của chuyển dọn. Đây là khu cập nhật nội dung hỗ trợ SEO, tư vấn và hướng dẫn cho người dùng ngoài site.</p>
            <ul>
                <li>`articles_manage.php` quản lý bài viết/cẩm nang của chuyển dọn.</li>
                <li>Khi sửa nội dung, cần kiểm tra lại trang danh sách và trang chi tiết bài viết nếu thay đổi tiêu đề, slug hoặc ảnh.</li>
            </ul>
            <div class="guide-link-row">
                <a class="guide-link" href="articles_manage.php"><i class="fas fa-pen-to-square"></i> Mở Cẩm nang</a>
            </div>
        </article>

        <article class="guide-section" id="upload">
            <h2><i class="fas fa-cloud-arrow-up"></i> Upload, hồ sơ giấy tờ và cấu hình</h2>
            <p>`admin_profile.php` hiện là màn Cấu hình upload cho toàn cụm chuyển dọn. Đây là điểm kiểm soát kích thước file, không phải nơi đổi route upload hay folder Drive.</p>
            <div class="guide-table-wrap">
                <table class="guide-table">
                    <thead>
                        <tr>
                            <th>Loại upload</th>
                            <th>Route hiện dùng</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Đặt lịch / đánh giá / báo cáo provider</td>
                            <td><code>upload.php</code></td>
                            <td>Dùng folderKey media của chuyển dọn.</td>
                        </tr>
                        <tr>
                            <td>Avatar</td>
                            <td><code>khach-hang/upload.php</code> hoặc <code>nha-cung-cap/upload.php</code></td>
                            <td>Dùng <code>upload_kind = avatar</code>, folderKey profile/avatar.</td>
                        </tr>
                        <tr>
                            <td>CCCD trước / sau</td>
                            <td><code>khach-hang/upload.php</code> hoặc <code>nha-cung-cap/upload.php</code></td>
                            <td>Dùng <code>upload_kind = cccd</code>, lưu cùng folder profile/avatar.</td>
                        </tr>
                        <tr>
                            <td>Đọc limit public</td>
                            <td><code>public/upload_settings.php</code></td>
                            <td>Frontend lấy giá trị tại đây để chặn file quá ngưỡng trước khi gửi.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p>Admin cấu hình limit qua `admin_profile.php`, dữ liệu được ghi vào `admin-chuyendon/api/settings.php`, sau đó frontend đọc lại qua `public/upload_settings.php`.</p>
            <div class="guide-note">Nếu người dùng báo không upload được, hãy kiểm tra theo thứ tự: dung lượng file, route upload đúng loại file, và response của `upload_settings.php`. Không sửa tay file public JSON hoặc Apps Script khi chưa xác minh nguyên nhân.</div>
            <div class="guide-link-row">
                <a class="guide-link" href="admin_profile.php"><i class="fas fa-cloud-arrow-up"></i> Mở Cấu hình upload</a>
            </div>
        </article>

        <article class="guide-section" id="auth">
            <h2><i class="fas fa-right-to-bracket"></i> Đăng nhập / đăng xuất</h2>
            <p>`login.php` của chuyển dọn không dùng form nhập riêng. Trang này kiểm tra cookie admin chung `admin_e` và `admin_p`; nếu hợp lệ thì tạo `PHP session` admin và chuyển thẳng vào dashboard.</p>
            <ul>
                <li>Nếu đã có session admin hợp lệ, mở `login.php` sẽ tự chuyển về `index.php`.</li>
                <li>Nếu cookie không hợp lệ, hệ thống sẽ xóa session/cookie admin cũ rồi trả về trang đăng nhập admin chung.</li>
                <li>`logout.php` dùng để thoát khỏi cụm admin chuyển dọn và dọn session hiện tại.</li>
            </ul>
            <div class="guide-note">Nếu admin bị văng ra ngoài hoặc không vào được cụm chuyển dọn, hãy kiểm tra trước tiên cookie admin chung còn hợp lệ hay không, thay vì sửa dữ liệu trong module.</div>
        </article>

        <article class="guide-section" id="su-co">
            <h2><i class="fas fa-screwdriver-wrench"></i> Sự cố thường gặp và cách xử lý</h2>
            <h3>1. Bảng giá lưu xong nhưng public chưa đổi</h3>
            <ul>
                <li>Kiểm tra thông báo partial-save trên màn bảng giá.</li>
                <li>Nếu export lỗi, dữ liệu KRUD đã lưu nhưng `bang-gia-minh-bach.json` chưa cập nhật.</li>
                <li>Mở lại bảng giá và thử export lại bằng một thao tác lưu hợp lệ khác, hoặc kiểm tra API `pricing_export.php`.</li>
            </ul>
            <h3>2. Dashboard báo thiếu hồ sơ nhưng users có vẻ đủ</h3>
            <ul>
                <li>Kiểm tra record có đang dùng alias cũ như `avatar_link`, `cccd_front_link`, `cccd_back_link` hay không.</li>
                <li>Lưu lại record từ màn users để dữ liệu chuẩn hóa rõ ở field hiện hành.</li>
            </ul>
            <h3>3. Contact bị thiếu hoặc thấy lẫn service khác</h3>
            <ul>
                <li>Hiện inbox chuyển dọn chỉ lấy contact có service gắn đúng ngữ cảnh chuyển dọn.</li>
                <li>Nếu record không hiện, rà lại `service_key` hoặc `service_name` từ phía form tạo contact.</li>
            </ul>
            <h3>4. Nội dung dịch vụ đã lưu nhưng trang ngoài site chưa đổi</h3>
            <ul>
                <li>Kiểm tra bước export `dich-vu-chuyen-don-page.json` có báo lỗi hay không.</li>
                <li>Nếu KRUD đã lưu nhưng JSON chưa cập nhật, mở lại màn Nội dung dịch vụ và lưu lại một thay đổi hợp lệ để export lại.</li>
            </ul>
            <h3>5. Đơn đã hoàn tất nhưng trang chi tiết hiển thị lạ</h3>
            <ul>
                <li>Rà `trang_thai`, `accepted_at`, `completed_at` trong đơn.</li>
                <li>Với đơn ở `da_xac_nhan`, hệ thống hiện đã coi là hoàn tất; nếu mốc thiếu, lưu lại đơn để bổ sung mốc.</li>
            </ul>
            <div class="guide-note guide-danger">Nếu phải can thiệp dữ liệu trực tiếp ngoài admin, cần ghi lại rõ bảng, record id, field thay đổi và lý do. Không nên sửa mù vì rất dễ làm lệch dashboard, notifications và các portal public.</div>
        </article>

        <article class="guide-section" id="checklist">
            <h2><i class="fas fa-clipboard-check"></i> Checklist bàn giao ca</h2>
            <ol>
                <li>Không còn đơn quá `120 phút` chưa có người nhận mà chưa được ghi chú xử lý.</li>
                <li>Các provider `pending` đã được rà avatar và CCCD, hoặc đã có `note_admin` rõ lý do treo.</li>
                <li>Contact mới đã được phân loại hoặc phản hồi sơ bộ.</li>
                <li>Nếu có sửa bảng giá, đã xác nhận export JSON thành công.</li>
                <li>Nếu có thay đổi lớn ở nội dung cẩm nang, đã kiểm tra lại trang public liên quan.</li>
                <li>Ca sau có thể đọc nhanh từ notifications, note_admin và ghi chú đơn để tiếp tục.</li>
            </ol>
            <div class="guide-link-row">
                <a class="guide-link" href="users_manage.php"><i class="fas fa-user-check"></i> Rà hồ sơ provider</a>
                <a class="guide-link" href="admin_pricing.php"><i class="fas fa-file-export"></i> Kiểm tra bảng giá</a>
                <a class="guide-link" href="contact_manage.php"><i class="fas fa-headset"></i> Kiểm tra liên hệ</a>
            </div>
        </article>
    </div>
</section>

<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>
