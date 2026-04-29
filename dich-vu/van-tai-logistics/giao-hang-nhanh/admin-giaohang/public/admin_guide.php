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
    <title>Hướng dẫn Admin | Giao Hàng Nhanh</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .guide-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 22px;
            align-items: center;
            padding: 28px;
            border-radius: 20px;
            color: #fff;
            background: linear-gradient(135deg, #08214f 0%, #0a2a66 62%, #123b87 100%);
            box-shadow: 0 18px 40px rgba(10, 42, 102, 0.16);
        }

        .guide-hero__eyebrow {
            margin: 0 0 8px;
            color: rgba(255, 255, 255, 0.72);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .guide-hero h3 {
            margin: 0;
            font-size: 30px;
            line-height: 1.12;
        }

        .guide-hero p {
            max-width: 760px;
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.82);
            line-height: 1.65;
        }

        .guide-hero__meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(120px, 1fr));
            gap: 12px;
            min-width: 290px;
        }

        .guide-hero__meta span {
            display: block;
            padding: 14px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.1);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .guide-hero__meta strong {
            display: block;
            margin-bottom: 5px;
            font-size: 24px;
            line-height: 1;
            color: #fff;
        }

        .guide-layout {
            display: grid;
            grid-template-columns: 280px minmax(0, 1fr);
            gap: 24px;
            align-items: start;
            margin-top: 24px;
        }

        .guide-toc {
            position: sticky;
            top: 100px;
            padding: 18px;
            border: 1px solid #dbe7ff;
            border-radius: 18px;
            background: #fff;
            box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
        }

        .guide-toc h3 {
            margin: 0 0 12px;
            color: #0a2a66;
            font-size: 16px;
        }

        .guide-toc a {
            display: block;
            padding: 9px 10px;
            border-radius: 10px;
            color: #355086;
            font-size: 13px;
            font-weight: 700;
            text-decoration: none;
        }

        .guide-toc a:hover {
            background: #f3f7ff;
            color: #0a2a66;
        }

        .guide-stack {
            display: grid;
            gap: 18px;
        }

        .guide-section {
            padding: 24px;
            border: 1px solid #dbe7ff;
            border-radius: 20px;
            background: #fff;
            box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
            scroll-margin-top: 110px;
        }

        .guide-section h3 {
            display: flex;
            gap: 10px;
            align-items: center;
            margin: 0 0 12px;
            color: #0a2a66;
            font-size: 22px;
        }

        .guide-section h4 {
            margin: 18px 0 10px;
            color: #123b87;
            font-size: 16px;
        }

        .guide-section p {
            margin: 0 0 12px;
            color: #52637d;
            line-height: 1.7;
        }

        .guide-section ul,
        .guide-section ol {
            margin: 0 0 14px;
            padding-left: 20px;
            color: #334155;
            line-height: 1.7;
        }

        .guide-section li {
            margin-bottom: 6px;
        }

        .guide-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 12px 0;
        }

        .guide-chip {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 7px 10px;
            border: 1px solid #dbe7ff;
            border-radius: 999px;
            background: #f8fbff;
            color: #355086;
            font-size: 12px;
            font-weight: 800;
        }

        .guide-note {
            padding: 14px 16px;
            border: 1px solid #fde68a;
            border-radius: 14px;
            background: #fffbea;
            color: #92400e;
            font-weight: 700;
            line-height: 1.65;
        }

        .guide-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin-top: 14px;
        }

        .guide-mini {
            padding: 16px;
            border: 1px solid #e4ecfb;
            border-radius: 14px;
            background: #f8fbff;
        }

        .guide-mini strong {
            display: block;
            margin-bottom: 6px;
            color: #0a2a66;
        }

        .guide-mini span {
            color: #52637d;
            line-height: 1.6;
        }

        .guide-table-wrap {
            overflow-x: auto;
            margin-top: 14px;
            border: 1px solid #dbe7ff;
            border-radius: 14px;
        }

        .guide-table {
            width: 100%;
            min-width: 680px;
            border-collapse: collapse;
            background: #fff;
        }

        .guide-table th,
        .guide-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #edf2f7;
            text-align: left;
            vertical-align: top;
        }

        .guide-table th {
            background: #f8fbff;
            color: #0a2a66;
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
        }

        .guide-table tr:last-child td {
            border-bottom: 0;
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
            padding: 10px 12px;
            border: 1px solid #d9e5ff;
            border-radius: 10px;
            background: #f8fbff;
            color: #0a2a66;
            font-size: 13px;
            font-weight: 800;
            text-decoration: none;
        }

        .guide-link:hover {
            border-color: #0a2a66;
        }

        code {
            padding: 2px 5px;
            border-radius: 6px;
            background: #eef4ff;
            color: #0a2a66;
            font-size: 0.92em;
        }

        @media (max-width: 1100px) {
            .guide-hero,
            .guide-layout {
                grid-template-columns: 1fr;
            }

            .guide-hero__meta {
                min-width: 0;
            }

            .guide-toc {
                position: static;
            }
        }

        @media (max-width: 720px) {
            .guide-hero,
            .guide-section {
                padding: 18px;
            }

            .guide-hero h3 {
                font-size: 26px;
            }

            .guide-hero__meta,
            .guide-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hướng dẫn Admin</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <section class="guide-hero">
            <div>
                <p class="guide-hero__eyebrow">Tài liệu vận hành nội bộ</p>
                <h3>Admin Giao Hàng Nhanh đang quản lý những gì?</h3>
                <p>
                    Trang này tóm tắt từng màn trong admin giao hàng: dữ liệu lấy từ đâu, thao tác nào có thể dùng,
                    và giới hạn hiện tại cần biết trước khi vận hành hoặc sửa code.
                </p>
            </div>
            <div class="guide-hero__meta">
                <span><strong>15+</strong>Màn / nhóm chức năng</span>
                <span><strong>KRUD</strong>Nguồn dữ liệu chính</span>
                <span><strong>JSON</strong>Cache và dữ liệu cục bộ</span>
                <span><strong>PHP</strong>Render giao diện admin</span>
            </div>
        </section>

        <div class="guide-layout">
            <aside class="guide-toc" aria-label="Mục lục hướng dẫn admin">
                <h3>Mục lục</h3>
                <a href="#overview">Tổng quan admin</a>
                <a href="#daily-workflows">Quy trình thao tác</a>
                <a href="#quick-checklists">Checklist nhanh</a>
                <a href="#faq">FAQ / lỗi thường gặp</a>
                <a href="#operation-warnings">Cảnh báo vận hành</a>
                <a href="#dashboard">Dashboard thống kê</a>
                <a href="#orders">Quản lý đơn hàng</a>
                <a href="#order-detail">Chi tiết đơn hàng</a>
                <a href="#users">Quản lý người dùng</a>
                <a href="#service-content">Nội dung dịch vụ</a>
                <a href="#articles">Quản lý cẩm nang</a>
                <a href="#contacts">Hòm thư & khiếu nại</a>
                <a href="#pricing">Bảng giá</a>
                <a href="#pricing-support">Dữ liệu giá</a>
                <a href="#notifications">Thông báo</a>
                <a href="#profile">Hồ sơ admin</a>
                <a href="#auth">Đăng nhập / đăng xuất</a>
                <a href="#internal-api">Hạ tầng nội bộ</a>
            </aside>

            <div class="guide-stack">
                <section class="guide-section" id="overview">
                    <h3><i class="fa-solid fa-compass"></i> Tổng quan admin</h3>
                    <p>
                        Admin Giao Hàng Nhanh là cụm PHP nằm trong <code>admin-giaohang</code>. Giao diện khách hàng
                        và shipper chủ yếu là HTML/CSS/JS tĩnh, còn admin dùng PHP để kiểm tra session và dựng trang.
                    </p>
                    <div class="guide-grid">
                        <div class="guide-mini">
                            <strong>KRUD</strong>
                            <span>Đọc/ghi đơn hàng, người dùng, liên hệ và các bảng cấu hình bảng giá.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>JSON export</strong>
                            <span><code>public/data/pricing-data.json</code> là cache public cho công cụ tính giá, không phải nguồn chỉnh sửa chính.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>JSON nội bộ</strong>
                            <span>Lưu hồ sơ admin, thông báo cục bộ và một phần dữ liệu phục vụ giao diện public.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Session admin</strong>
                            <span>Mọi trang quản trị đều kiểm tra <code>$_SESSION['role'] === 'admin'</code>.</span>
                        </div>
                    </div>
                    <div class="guide-link-row">
                        <a class="guide-link" href="admin_stats.php"><i class="fa-solid fa-chart-line"></i> Dashboard</a>
                        <a class="guide-link" href="admin_profile.php"><i class="fa-solid fa-circle-user"></i> Hồ sơ admin</a>
                    </div>
                </section>

                <section class="guide-section" id="daily-workflows">
                    <h3><i class="fa-solid fa-route"></i> Quy trình thao tác hằng ngày</h3>
                    <p>
                        Các quy trình dưới đây là luồng vận hành thực tế cho admin mới. Nếu cần điều tra lỗi sâu hơn,
                        mở thêm phần chức năng tương ứng ở các mục bên dưới.
                    </p>
                    <div class="guide-table-wrap">
                        <table class="guide-table">
                            <thead>
                                <tr>
                                    <th>Tình huống</th>
                                    <th>Thao tác đề xuất</th>
                                    <th>Màn cần mở</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Kiểm tra đơn mới trong ngày</td>
                                    <td>Mở danh sách đơn, lọc trạng thái chờ xử lý hoặc lọc theo ngày, sau đó mở chi tiết đơn cần kiểm tra.</td>
                                    <td><code>orders_manage.php</code>, <code>order_detail.php</code></td>
                                </tr>
                                <tr>
                                    <td>Xem tiến độ một đơn cụ thể</td>
                                    <td>Tìm theo mã đơn, tên hoặc SĐT; mở link chi tiết để xem timeline, trạng thái, phí và thông tin giao nhận.</td>
                                    <td><code>orders_manage.php</code></td>
                                </tr>
                                <tr>
                                    <td>Xử lý khiếu nại hoặc tin liên hệ</td>
                                    <td>Mở hòm thư, đọc nội dung khách gửi, ghi chú phản hồi vào <code>note_admin</code>, đổi trạng thái xử lý rồi lưu.</td>
                                    <td><code>contact_manage.php</code></td>
                                </tr>
                                <tr>
                                    <td>Khóa tài khoản vi phạm</td>
                                    <td>Tìm tài khoản trong danh sách người dùng, kiểm tra vai trò, chỉ khóa tài khoản không phải admin và nhập lý do khóa.</td>
                                    <td><code>users_manage.php</code></td>
                                </tr>
                                <tr>
                                    <td>Cập nhật nội dung trang dịch vụ giao hàng</td>
                                    <td>Sửa Hero, khối dịch vụ hoặc từng gói dịch vụ; lưu xong thì kiểm tra bước cập nhật JSON public và mở trang ngoài site để đối chiếu.</td>
                                    <td><code>admin_service_content.php</code>, <code>dich-vu-giao-hang.html</code></td>
                                </tr>
                                <tr>
                                    <td>Sửa bảng giá ngoài site</td>
                                    <td>Sửa cấu hình trong bảng giá, đợi KRUD lưu xong, kiểm tra đồng bộ JSON; nếu cần dữ liệu vùng/quận huyện thì qua Dữ liệu giá.</td>
                                    <td><code>admin_pricing.php</code>, <code>pricing_support.php</code></td>
                                </tr>
                                <tr>
                                    <td>Cập nhật bài cẩm nang</td>
                                    <td>Chọn bài, sửa nội dung, kiểm tra trạng thái hiển thị, lưu rồi mở trang ngoài site để xem kết quả.</td>
                                    <td><code>articles_manage.php</code>, <code>cam-nang.html</code></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="guide-section" id="quick-checklists">
                    <h3><i class="fa-solid fa-list-check"></i> Checklist nhanh</h3>
                    <div class="guide-grid">
                        <div class="guide-mini">
                            <strong>Trước khi sửa bảng giá</strong>
                            <span>Kiểm tra đang đọc từ KRUD, xác định đúng nhóm giá cần sửa, không sửa trực tiếp file <code>pricing-data.json</code>.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Sau khi sửa bảng giá</strong>
                            <span>Đợi thông báo lưu thành công, kiểm tra đồng bộ JSON public, rồi thử lại công cụ tính giá hoặc form đặt lịch nếu thay đổi ảnh hưởng giá.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Khi đơn hàng bị báo lỗi</strong>
                            <span>Tìm đơn trong Quản lý đơn hàng, mở chi tiết, đối chiếu trạng thái theo mốc thời gian và kiểm tra ghi chú khách/admin.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Khi không thấy dữ liệu</strong>
                            <span>Kiểm tra đăng nhập admin, KRUD có tải được không, bộ lọc có đang bó hẹp dữ liệu không, rồi tải lại trang.</span>
                        </div>
                    </div>
                    <h4>Checklist theo ca trực</h4>
                    <ol>
                        <li>Mở Dashboard để xem số đơn, doanh thu và tỷ lệ hoàn tất.</li>
                        <li>Vào Quản lý đơn hàng để lọc các đơn đang chờ xử lý hoặc đang giao.</li>
                        <li>Kiểm tra Hòm thư & khiếu nại, chuyển tin mới sang đang xử lý nếu đã tiếp nhận.</li>
                        <li>Kiểm tra Bảng giá sau mỗi lần có yêu cầu thay đổi giá hoặc vùng giao hàng.</li>
                        <li>Ghi nhận vấn đề chưa xử lý được vào ghi chú nội bộ hoặc báo lại người phụ trách kỹ thuật.</li>
                    </ol>
                </section>

                <section class="guide-section" id="faq">
                    <h3><i class="fa-solid fa-circle-question"></i> FAQ / lỗi thường gặp</h3>
                    <div class="guide-table-wrap">
                        <table class="guide-table">
                            <thead>
                                <tr>
                                    <th>Vấn đề</th>
                                    <th>Nguyên nhân thường gặp</th>
                                    <th>Cách xử lý</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Không thấy dữ liệu đơn hàng</td>
                                    <td>KRUD chưa tải, mất session admin, hoặc bộ lọc đang giữ trạng thái/ngày cũ.</td>
                                    <td>Xóa bộ lọc, tải lại trang, đăng nhập lại nếu bị redirect, kiểm tra console/API nếu vẫn rỗng.</td>
                                </tr>
                                <tr>
                                    <td>Bảng giá ngoài site chưa đổi</td>
                                    <td>KRUD đã lưu nhưng bước export JSON public lỗi hoặc trình duyệt đang cache dữ liệu cũ.</td>
                                    <td>Dùng nút kiểm tra đồng bộ hoặc export lại JSON ở Bảng giá, sau đó tải lại trang ngoài site.</td>
                                </tr>
                                <tr>
                                    <td>Không lưu được cẩm nang</td>
                                    <td>File JSON hoặc thư mục dữ liệu cẩm nang không ghi được, payload thiếu tiêu đề/nội dung.</td>
                                    <td>Kiểm tra thông báo lỗi trên màn, đảm bảo tiêu đề và HTML content không rỗng, kiểm tra quyền ghi server nếu cần.</td>
                                </tr>
                                <tr>
                                    <td>Sửa nội dung dịch vụ nhưng trang ngoài site chưa đổi</td>
                                    <td>KRUD đã lưu nhưng bước export <code>dich-vu-giao-hang-page.json</code> lỗi hoặc trình duyệt đang dùng cache cũ.</td>
                                    <td>Lưu lại từ màn Nội dung dịch vụ, kiểm tra thông báo export, rồi tải lại trang ngoài site bằng làm mới cứng.</td>
                                </tr>
                                <tr>
                                    <td>Không thấy thông báo</td>
                                    <td>Thông báo hiện đọc từ <code>admin-notifications.json</code>; luồng MySQL cũ đã tắt.</td>
                                    <td>Nếu JSON rỗng thì trạng thái không có thông báo là đúng. Kiểm tra nguồn tạo thông báo nếu cần bật lại luồng mới.</td>
                                </tr>
                                <tr>
                                    <td>Admin bị văng đăng nhập</td>
                                    <td>Cookie admin chung không hợp lệ, session hết hạn hoặc bị xóa khi đăng xuất.</td>
                                    <td>Đăng nhập lại từ trang admin chung, sau đó vào lại admin giao hàng.</td>
                                </tr>
                                <tr>
                                    <td>Không khóa được tài khoản</td>
                                    <td>Tài khoản là admin hoặc KRUD update chưa tải được.</td>
                                    <td>Không khóa admin từ màn này. Với khách/shipper, tải lại danh sách rồi thử lại khi KRUD sẵn sàng.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="guide-section" id="operation-warnings">
                    <h3><i class="fa-solid fa-triangle-exclamation"></i> Cảnh báo vận hành</h3>
                    <div class="guide-grid">
                        <div class="guide-mini">
                            <strong>Không sửa JSON giá bằng tay</strong>
                            <span><code>pricing-data.json</code> chỉ là cache public. Sửa giá phải đi qua admin để KRUD và JSON không lệch nhau.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Không xóa cơ chế version nội bộ</strong>
                            <span><code>pricing_version_id</code>, <code>ghn_pricing_versions</code> và <code>active_pricing_version_id</code> vẫn là khóa gom dữ liệu giá.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Cẩn thận với HTML cẩm nang</strong>
                            <span>Nội dung bài viết render HTML trực tiếp ở ngoài site, nên tránh script, iframe lạ hoặc markup phá layout.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Chi tiết đơn admin chủ yếu để xem</strong>
                            <span>Không xem trang chi tiết admin là nơi chỉnh trạng thái chính nếu chức năng đó chưa nối KRUD đầy đủ.</span>
                        </div>
                    </div>
                    <div class="guide-note">
                        Khi cần thao tác ảnh hưởng dữ liệu thật, ưu tiên kiểm tra bảng nguồn và màn quản lý tương ứng trước.
                        Nếu lỗi nằm ở KRUD hoặc quyền ghi file JSON, không cố sửa dữ liệu public/cache để né lỗi.
                    </div>
                </section>

                <section class="guide-section" id="dashboard">
                    <h3><i class="fa-solid fa-chart-pie"></i> Dashboard thống kê</h3>
                    <p>
                        Màn <code>admin_stats.php</code> lấy dữ liệu qua <code>api/stats.php</code>. API này đọc bảng
                        <code>giaohangnhanh_dat_lich</code> và <code>nguoidung</code>, sau đó trả dữ liệu cho Chart.js.
                    </p>
                    <div class="guide-chip-row">
                        <span class="guide-chip">Doanh thu ship</span>
                        <span class="guide-chip">Tổng đơn hàng</span>
                        <span class="guide-chip">Tỷ lệ hoàn tất</span>
                        <span class="guide-chip">Khách hàng</span>
                        <span class="guide-chip">Biểu đồ 7 ngày</span>
                        <span class="guide-chip">Top khách hàng</span>
                    </div>
                    <p>
                        Dashboard còn hiển thị phân loại dịch vụ và phân loại hàng hóa để nắm gói giao nào được dùng nhiều,
                        nhóm hàng nào phát sinh thường xuyên.
                    </p>
                    <div class="guide-link-row">
                        <a class="guide-link" href="admin_stats.php"><i class="fa-solid fa-arrow-up-right-from-square"></i> Mở dashboard</a>
                    </div>
                </section>

                <section class="guide-section" id="orders">
                    <h3><i class="fa-solid fa-boxes-stacked"></i> Quản lý đơn hàng</h3>
                    <p>
                        Màn <code>orders_manage.php</code> đọc bảng <code>giaohangnhanh_dat_lich</code> bằng KRUD.
                        Admin dùng màn này để xem nhanh toàn bộ đơn, thống kê trạng thái và mở trang chi tiết.
                    </p>
                    <div class="guide-table-wrap">
                        <table class="guide-table">
                            <thead>
                                <tr>
                                    <th>Nhóm dữ liệu</th>
                                    <th>Admin thấy gì</th>
                                    <th>Ghi chú vận hành</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Mã đơn / khách hàng</td>
                                    <td>Mã nội bộ, tên khách, số điện thoại hoặc dữ liệu định danh tương ứng.</td>
                                    <td>Dùng để tìm nhanh đơn khi khách liên hệ.</td>
                                </tr>
                                <tr>
                                    <td>Người gửi / nhận</td>
                                    <td>Thông tin liên hệ và tuyến giao nhận đã lưu trong đơn.</td>
                                    <td>Nên đối chiếu với trang chi tiết trước khi xử lý sự cố.</td>
                                </tr>
                                <tr>
                                    <td>Lịch / dịch vụ</td>
                                    <td>Ngày lấy hàng, gói dịch vụ, loại hàng và dữ liệu liên quan.</td>
                                    <td>Giúp lọc đơn theo ngày hoặc trạng thái xử lý.</td>
                                </tr>
                                <tr>
                                    <td>Thanh toán</td>
                                    <td>Cước, COD và trạng thái đối soát suy từ dữ liệu đơn.</td>
                                    <td>COD hoàn tất được nhận diện khi đơn đã hoàn thành.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <h4>Bộ lọc đang có</h4>
                    <ul>
                        <li>Tìm theo mã đơn, tên, số điện thoại.</li>
                        <li>Lọc từ ngày đến ngày.</li>
                        <li>Lọc trạng thái: chờ xử lý, đang giao, hoàn tất, đã hủy.</li>
                        <li>Lọc đơn có ghi chú admin.</li>
                    </ul>
                    <div class="guide-link-row">
                        <a class="guide-link" href="orders_manage.php"><i class="fa-solid fa-list-check"></i> Mở quản lý đơn</a>
                    </div>
                </section>

                <section class="guide-section" id="order-detail">
                    <h3><i class="fa-solid fa-clipboard-list"></i> Chi tiết đơn hàng</h3>
                    <p>
                        Trang <code>order_detail.php</code> tải một đơn từ KRUD theo <code>code</code> hoặc <code>id</code>.
                        Trang này gom thông tin điều phối, phí, tuyến giao hàng, timeline và nhà cung cấp nếu có.
                    </p>
                    <div class="guide-note">
                        Lưu ý: trang chi tiết admin hiện chủ yếu để xem và đối chiếu. Các thao tác sửa trạng thái,
                        phân công nhà cung cấp và ghi chú nội bộ trực tiếp trên trang này chưa phải luồng chính đã nối đầy đủ.
                    </div>
                    <h4>Admin nên kiểm tra</h4>
                    <ul>
                        <li>Mã đơn, ngày tạo, trạng thái suy theo mốc thời gian.</li>
                        <li>Thông tin người gửi, người nhận, địa chỉ và ghi chú đơn.</li>
                        <li>Cước vận chuyển, COD, khoảng cách và phương tiện.</li>
                        <li>Timeline: tạo đơn, nhận đơn, bắt đầu, hoàn thành hoặc hủy.</li>
                    </ul>
                </section>

                <section class="guide-section" id="users">
                    <h3><i class="fa-solid fa-users-gear"></i> Quản lý người dùng</h3>
                    <p>
                        Màn <code>users_manage.php</code> dùng chung bảng <code>nguoidung</code>. Admin có thể xem
                        khách hàng, nhà cung cấp và admin, đồng thời khóa hoặc mở khóa tài khoản không phải admin.
                    </p>
                    <div class="guide-chip-row">
                        <span class="guide-chip">Tìm tên / email / SĐT</span>
                        <span class="guide-chip">Lọc vai trò</span>
                        <span class="guide-chip">Lọc trạng thái</span>
                        <span class="guide-chip">Khóa tài khoản</span>
                        <span class="guide-chip">Mở khóa tài khoản</span>
                    </div>
                    <p>
                        Khi khóa tài khoản, hệ thống cập nhật các field như <code>trangthai</code>, <code>is_locked</code>,
                        <code>bi_khoa</code>, <code>lock_reason</code> và <code>ly_do_khoa</code>.
                    </p>
                    <div class="guide-link-row">
                        <a class="guide-link" href="users_manage.php"><i class="fa-solid fa-users"></i> Mở quản lý người dùng</a>
                    </div>
                </section>

                <section class="guide-section" id="service-content">
                    <h3><i class="fa-solid fa-layer-group"></i> Nội dung dịch vụ</h3>
                    <p>
                        Màn <code>admin_service_content.php</code> dùng để chỉnh phần Hero, khối dịch vụ và danh sách
                        gói dịch vụ của trang <code>dich-vu-giao-hang.html</code>. Dữ liệu được nạp ban đầu từ HTML hiện tại
                        và file dịch vụ cũ, sau đó lưu vào KRUD rồi cập nhật ra JSON public.
                    </p>
                    <div class="guide-grid">
                        <div class="guide-mini">
                            <strong>Hero</strong>
                            <span>Quản lý badge nhỏ, tiêu đề chính và mô tả đầu trang dịch vụ.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Khối dịch vụ</strong>
                            <span>Quản lý tiêu đề và mô tả nằm phía trên danh sách card dịch vụ.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Danh sách gói dịch vụ</strong>
                            <span>Cho phép thêm, sửa, ẩn/hiện hoặc xóa từng gói dịch vụ trong danh sách.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Cập nhật JSON public</strong>
                            <span>Sau khi lưu, hệ thống gọi <code>api/service_content_export.php</code> để cập nhật <code>public/data/dich-vu-giao-hang-page.json</code>.</span>
                        </div>
                    </div>
                    <h4>Nguồn dữ liệu liên quan</h4>
                    <ul>
                        <li><code>dich-vu-giao-hang.html</code>: nguồn HTML public để bootstrap Hero và khối mô tả hiện có.</li>
                        <li><code>public/data/dsdichvugiaohang.json</code>: nguồn dữ liệu cũ để bootstrap danh sách gói dịch vụ.</li>
                        <li><code>public/data/dich-vu-giao-hang-page.json</code>: JSON public mới mà frontend đọc sau khi export.</li>
                    </ul>
                    <div class="guide-note">
                        Màn này hiện chỉ quản lý nội dung văn bản và trạng thái hiển thị của gói dịch vụ. Nút CTA của
                        card ngoài site vẫn giữ theo code hiện tại, không đổi từ màn admin này.
                    </div>
                    <div class="guide-link-row">
                        <a class="guide-link" href="admin_service_content.php"><i class="fa-solid fa-pen-ruler"></i> Mở nội dung dịch vụ</a>
                        <a class="guide-link" href="../../dich-vu-giao-hang.html" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Xem trang ngoài site</a>
                    </div>
                </section>

                <section class="guide-section" id="articles">
                    <h3><i class="fa-solid fa-newspaper"></i> Quản lý cẩm nang</h3>
                    <p>
                        Màn <code>articles_manage.php</code> quản lý dữ liệu bài viết trong
                        <code>public/data/du-lieu-bai-viet.json</code> thông qua <code>api/articles_manage.php</code>.
                    </p>
                    <div class="guide-table-wrap">
                        <table class="guide-table">
                            <thead>
                                <tr>
                                    <th>Trường</th>
                                    <th>Ý nghĩa</th>
                                    <th>Lưu ý</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>title</code>, <code>slug</code>, <code>date</code></td>
                                    <td>Thông tin hiển thị và định danh bài viết.</td>
                                    <td>Slug tự tạo nếu bỏ trống.</td>
                                </tr>
                                <tr>
                                    <td><code>category</code>, <code>tags</code></td>
                                    <td>Phân nhóm và lọc bài viết.</td>
                                    <td>Tags nhập cách nhau bằng dấu phẩy.</td>
                                </tr>
                                <tr>
                                    <td><code>img</code>, <code>description</code></td>
                                    <td>Ảnh đại diện và mô tả ngắn ngoài site.</td>
                                    <td>Đường dẫn ảnh cần khớp với file public thực tế.</td>
                                </tr>
                                <tr>
                                    <td><code>content</code>, <code>status</code></td>
                                    <td>Nội dung HTML và trạng thái hiển thị.</td>
                                    <td>Nội dung render trực tiếp, cần nhập HTML cẩn thận.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="guide-link-row">
                        <a class="guide-link" href="articles_manage.php"><i class="fa-solid fa-pen-to-square"></i> Mở quản lý cẩm nang</a>
                        <a class="guide-link" href="../../cam-nang.html" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Xem trang ngoài site</a>
                    </div>
                </section>

                <section class="guide-section" id="contacts">
                    <h3><i class="fa-solid fa-inbox"></i> Hòm thư & khiếu nại</h3>
                    <p>
                        Màn <code>contact_manage.php</code> đọc bảng <code>lien_he</code>. Admin dùng màn này để xem
                        tin liên hệ, khiếu nại, ghi chú xử lý và cập nhật trạng thái.
                    </p>
                    <div class="guide-chip-row">
                        <span class="guide-chip">Mới nhận</span>
                        <span class="guide-chip">Đang xử lý</span>
                        <span class="guide-chip">Đã xong</span>
                        <span class="guide-chip">Ghi chú <code>note_admin</code></span>
                    </div>
                    <p>
                        Khi lưu, hệ thống cập nhật <code>status</code>, <code>note_admin</code> và <code>updated_at</code>
                        lên KRUD.
                    </p>
                    <div class="guide-link-row">
                        <a class="guide-link" href="contact_manage.php"><i class="fa-solid fa-envelope-open-text"></i> Mở liên hệ</a>
                    </div>
                </section>

                <section class="guide-section" id="pricing">
                    <h3><i class="fa-solid fa-tags"></i> Bảng giá</h3>
                    <p>
                        Màn <code>admin_pricing.php</code> là nơi chỉnh cấu hình giá chính. KRUD là nguồn dữ liệu chính,
                        còn <code>public/data/pricing-data.json</code> chỉ là cache export để công cụ tính giá ngoài site đọc nhanh.
                    </p>
                    <div class="guide-grid">
                        <div class="guide-mini">
                            <strong>Bảng giá dịch vụ chính</strong>
                            <span>Giá cố định của Tiêu chuẩn, Nhanh, Hỏa tốc theo vùng giao hàng.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Cấu hình Giao ngay</strong>
                            <span>Đơn giá gần, ngưỡng xa và đơn giá xa của xe máy.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Phụ phí dịch vụ</strong>
                            <span>Phí cố định và hệ số theo khung giờ, điều kiện giao.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>COD / bảo hiểm</strong>
                            <span>Ngưỡng miễn phí, tỷ lệ và mức tối thiểu cho COD, bảo hiểm.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Phương tiện</strong>
                            <span>Giá cơ bản, hệ số xe, phí tối thiểu và tải trọng tối đa.</span>
                        </div>
                        <div class="guide-mini">
                            <strong>Phụ phí loại hàng</strong>
                            <span>Phụ phí, hệ số và mô tả của từng loại hàng.</span>
                        </div>
                    </div>
                    <div class="guide-note">
                        Cơ chế <code>pricing_version_id</code> vẫn dùng nội bộ để gom cấu hình giá đang áp dụng.
                        Admin không còn UI kích hoạt phiên bản bảng giá cũ.
                    </div>
                    <div class="guide-link-row">
                        <a class="guide-link" href="admin_pricing.php"><i class="fa-solid fa-calculator"></i> Mở bảng giá</a>
                    </div>
                </section>

                <section class="guide-section" id="pricing-support">
                    <h3><i class="fa-solid fa-database"></i> Dữ liệu giá</h3>
                    <p>
                        Màn <code>pricing_support.php</code> quản lý dữ liệu phụ trợ cho công cụ tính giá: thành phố,
                        quận/huyện và nhãn vùng. Các dữ liệu này lưu theo bảng giá đang áp dụng rồi export JSON public sau khi lưu.
                    </p>
                    <ul>
                        <li>Thành phố: quản lý danh sách tỉnh/thành dùng cho điểm gửi và điểm nhận.</li>
                        <li>Quận huyện: gắn theo mã thành phố, export thành <code>BAOGIACHITIET.thanhpho</code>.</li>
                        <li>Vùng giao hàng: chỉ sửa nhãn vùng cố định để tránh lệch công thức tính giá.</li>
                    </ul>
                    <div class="guide-link-row">
                        <a class="guide-link" href="pricing_support.php"><i class="fa-solid fa-table-list"></i> Mở dữ liệu giá</a>
                    </div>
                </section>

                <section class="guide-section" id="notifications">
                    <h3><i class="fa-regular fa-bell"></i> Thông báo</h3>
                    <p>
                        Màn <code>notifications.php</code> đọc <code>admin-notifications.json</code> từ local store.
                        Luồng thông báo MySQL cũ đã tắt, nên nếu JSON rỗng thì admin sẽ thấy trạng thái không có thông báo.
                    </p>
                    <p>
                        Dropdown chuông ở header gọi <code>api/notifications_dropdown.php</code> để lấy dữ liệu cùng nguồn.
                    </p>
                    <div class="guide-link-row">
                        <a class="guide-link" href="notifications.php"><i class="fa-regular fa-bell"></i> Mở thông báo</a>
                    </div>
                </section>

                <section class="guide-section" id="profile">
                    <h3><i class="fa-solid fa-user-tie"></i> Hồ sơ admin</h3>
                    <p>
                        Màn <code>admin_profile.php</code> cho phép cập nhật họ tên, email và số điện thoại hiển thị.
                        Dữ liệu được lưu vào <code>admin-profiles.json</code> theo username admin.
                    </p>
                    <div class="guide-note">
                        Mật khẩu admin không đổi ở màn này. Mật khẩu đang được quản lý bởi tài khoản admin chung trong hệ thống.
                    </div>
                    <div class="guide-link-row">
                        <a class="guide-link" href="admin_profile.php"><i class="fa-solid fa-id-card"></i> Mở hồ sơ</a>
                    </div>
                </section>

                <section class="guide-section" id="auth">
                    <h3><i class="fa-solid fa-right-to-bracket"></i> Đăng nhập / đăng xuất</h3>
                    <p>
                        <code>login.php</code> kiểm tra cookie admin chung <code>admin_e</code> và <code>admin_p</code>.
                        Nếu hợp lệ, trang tạo session admin và chuyển tới <code>admin_stats.php</code>.
                    </p>
                    <p>
                        Nếu cookie không hợp lệ, hệ thống xóa session/cookie admin cũ và redirect sang trang đăng nhập admin chung.
                        <code>logout.php</code> dùng để thoát khỏi admin giao hàng.
                    </p>
                </section>

                <section class="guide-section" id="internal-api">
                    <h3><i class="fa-solid fa-gears"></i> Hạ tầng nội bộ</h3>
                    <p>
                        Các file API dưới đây hỗ trợ vận hành nhưng không phải trang quản lý riêng trên menu.
                    </p>
                    <div class="guide-table-wrap">
                        <table class="guide-table">
                            <thead>
                                <tr>
                                    <th>API / file</th>
                                    <th>Vai trò</th>
                                    <th>Nguồn lưu</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>api/settings.php</code></td>
                                    <td>Đọc/ghi cài đặt doanh nghiệp, ngân hàng, hotline và webhook.</td>
                                    <td><code>admin-settings.json</code></td>
                                </tr>
                                <tr>
                                    <td><code>api/order_media_upload.php</code></td>
                                    <td>API cũ đã bị vô hiệu hóa; media đơn hàng hiện đi qua các luồng upload Google Drive.</td>
                                    <td>Không còn sử dụng</td>
                                </tr>
                                <tr>
                                    <td><code>api/service_content_export.php</code></td>
                                    <td>Export dữ liệu nội dung dịch vụ từ KRUD ra JSON public cho trang dịch vụ giao hàng.</td>
                                    <td><code>public/data/dich-vu-giao-hang-page.json</code></td>
                                </tr>
                                <tr>
                                    <td><code>api/pricing_export.php</code></td>
                                    <td>Export cấu hình giá từ KRUD hoặc snapshot request ra JSON public.</td>
                                    <td><code>public/data/pricing-data.json</code></td>
                                </tr>
                                <tr>
                                    <td><code>api/notifications_dropdown.php</code></td>
                                    <td>Cấp dữ liệu cho dropdown chuông thông báo ở header.</td>
                                    <td><code>admin-notifications.json</code></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>
