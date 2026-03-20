-- =====================================================
-- Thuê Xe — Schema v3 (Đặt tên chuẩn tiếng Việt không dấu)
-- Database: car_rental (giữ nguyên tên DB)
--
-- QUY TẮC ĐẶT TÊN:
--   Bảng : tiếng Việt không dấu, viết liền, chữ thường
--   Cột  : tiếng Việt không dấu, viết liền, chữ thường
--   ENUM : giữ nguyên giá trị English để giữ API contract với frontend
--
-- MAPPING BẢNG (cũ → mới):
--   users       → nguoidung
--   cars        → xe
--   car_images  → hinhanhxe
--   services    → dichvu
--   bookings    → datxe
--   contacts    → lienhe
--
-- SELECT đều dùng AS alias để output JSON giữ nguyên field name cũ.
-- Admin mặc định: admin.thuexe@gmail.com / admin123
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `car_rental`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `car_rental`;

-- =====================================================
-- BẢNG NGƯỜI DÙNG (nguoidung)
-- vaitro:    admin | customer | provider
-- trangthai: active | blocked | pending | rejected
-- Giữ ENUM values tiếng Anh để giữ API contract
-- =====================================================
CREATE TABLE IF NOT EXISTS `nguoidung` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `hoten`        VARCHAR(255) NOT NULL                        COMMENT 'Họ và tên (old: full_name)',
  `email`        VARCHAR(255) NOT NULL,
  `sodienthoai`  VARCHAR(20)  NOT NULL DEFAULT ''             COMMENT 'Số điện thoại (old: phone)',
  `matkhau`      VARCHAR(255) NOT NULL                        COMMENT 'Mật khẩu đã hash (old: password)',
  `vaitro`       ENUM('admin','customer','provider')
                              NOT NULL DEFAULT 'customer'     COMMENT 'Vai trò (old: role)',
  `trangthai`    ENUM('active','blocked','pending','rejected')
                              NOT NULL DEFAULT 'active'       COMMENT 'Trạng thái (old: status)',
  -- Chỉ dùng cho provider
  `tencongty`    VARCHAR(255) DEFAULT NULL                    COMMENT 'Tên công ty (old: company_name)',
  `sogiayphep`   VARCHAR(100) DEFAULT NULL                    COMMENT 'Số GPKD (old: license_number)',
  `diachi`       TEXT         DEFAULT NULL                    COMMENT 'Địa chỉ (old: address)',
  `mota`         TEXT         DEFAULT NULL                    COMMENT 'Mô tả (old: description)',
  `lydotuchoi`   VARCHAR(500) DEFAULT NULL                    COMMENT 'Lý do từ chối (old: rejection_reason)',
  -- Upload files
  `avatar`       VARCHAR(500) DEFAULT NULL,
  `cccdmatruoc`  VARCHAR(500) DEFAULT NULL                    COMMENT 'CCCD mặt trước (old: cccd_front)',
  `cccdmatsau`   VARCHAR(500) DEFAULT NULL                    COMMENT 'CCCD mặt sau (old: cccd_back)',
  `ngaytao`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo (old: created_at)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_vaitro`    (`vaitro`),
  KEY `idx_trangthai` (`trangthai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin mặc định (password: admin123)
INSERT INTO `nguoidung` (`hoten`,`email`,`sodienthoai`,`matkhau`,`vaitro`,`trangthai`) VALUES
('Quản trị viên','admin.thuexe@gmail.com','','$2y$10$lEmVivDyXWB.Oe.XyB9uK.fg57b63A.CbDA5Lqh1aBZhABqIxnhO6','admin','active');

-- =====================================================
-- BẢNG XE (xe)
-- trangthai: available | rented | maintenance
-- =====================================================
CREATE TABLE IF NOT EXISTS `xe` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `ten`             VARCHAR(255)  NOT NULL                    COMMENT 'Tên xe (old: name)',
  `thuonghieu`      VARCHAR(100)  NOT NULL                    COMMENT 'Thương hiệu (old: brand)',
  `model`           VARCHAR(100)  NOT NULL DEFAULT '',
  `namsanxuat`      INT           NOT NULL DEFAULT 2023       COMMENT 'Năm sản xuất (old: year)',
  `loaixe`          VARCHAR(100)  NOT NULL DEFAULT 'Sedan'    COMMENT 'Loại xe (old: car_type)',
  `socho`           INT           NOT NULL DEFAULT 5          COMMENT 'Số chỗ (old: seats)',
  `hopso`           VARCHAR(50)   NOT NULL DEFAULT 'Tự động'  COMMENT 'Hộp số (old: transmission)',
  `nhienlieu`       VARCHAR(50)   NOT NULL DEFAULT 'Xăng'     COMMENT 'Nhiên liệu (old: fuel_type)',
  `giathue`         DECIMAL(12,0) NOT NULL                    COMMENT 'Giá thuê/ngày (old: price_per_day)',
  `tilephicuoituan` DECIMAL(5,4)  NOT NULL DEFAULT 0.1000     COMMENT 'Tỷ lệ phí cuối tuần (old: weekend_surcharge_rate)',
  `tiledatcoc`      DECIMAL(5,4)  NOT NULL DEFAULT 0.3000     COMMENT 'Tỷ lệ đặt cọc (old: deposit_rate)',
  `anhchinh`        VARCHAR(255)  NOT NULL DEFAULT ''         COMMENT 'Ảnh chính (old: main_image)',
  `mota`            TEXT                                      COMMENT 'Mô tả (old: description)',
  `tienich`         TEXT                                      COMMENT 'Tiện ích comma-separated (old: features)',
  `trangthai`       ENUM('available','rented','maintenance')
                                  NOT NULL DEFAULT 'available' COMMENT 'Trạng thái (old: status)',
  `idnhacungcap`    INT           DEFAULT NULL                COMMENT 'FK → nguoidung (old: provider_id)',
  `urlvideo`        VARCHAR(500)  DEFAULT NULL                COMMENT 'URL video (old: video_url)',
  `ngaytao`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo (old: created_at)',
  PRIMARY KEY (`id`),
  KEY `idx_trangthai`    (`trangthai`),
  KEY `idx_thuonghieu`   (`thuonghieu`),
  KEY `idx_idnhacungcap` (`idnhacungcap`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `xe`
  (`id`,`ten`,`thuonghieu`,`model`,`namsanxuat`,`loaixe`,`socho`,`hopso`,`nhienlieu`,`giathue`,`anhchinh`,`mota`,`tienich`,`trangthai`,`urlvideo`)
VALUES
(1,'Toyota Camry 2023','Toyota','Camry',2023,'Sedan',5,'Tự động','Xăng',1200000,'thue-xe-xe-toyota-camry-2023.jpg','Toyota Camry 2023 - Sedan hạng sang với thiết kế sang trọng, nội thất tiện nghi và tiết kiệm nhiên liệu.','Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Ghế da cao cấp','available','https://www.youtube.com/embed/BpMBkt7RCHo'),
(2,'Honda CR-V 2022','Honda','CR-V',2022,'SUV',7,'Tự động','Xăng',1500000,'thue-xe-xe-honda-crv-2022.jpg','Honda CR-V 7 chỗ rộng rãi, phù hợp gia đình. Vận hành mạnh mẽ, an toàn tuyệt đối.','Điều hòa hai vùng,Camera 360,Cảm biến va chạm,Apple CarPlay,Android Auto,Cốp điện','available','https://www.youtube.com/embed/iiMmRJlCeDM'),
(3,'Hyundai Tucson 2023','Hyundai','Tucson',2023,'SUV',5,'Tự động','Xăng',1100000,'thue-xe-xe-anh-mac-dinh-fallback.jpg','Hyundai Tucson 2023 với thiết kế trẻ trung, hiện đại. Tiêu thụ nhiên liệu thấp.','Điều hòa tự động,Camera lùi,Hỗ trợ phanh khẩn cấp,Màn hình 10.25 inch,Sạc không dây','available','https://www.youtube.com/embed/nPVzCCnCRTo'),
(4,'Ford Ranger 2022','Ford','Ranger',2022,'Bán tải',5,'Số sàn','Dầu',900000,'thue-xe-xe-ford-ranger-2022.jpg','Ford Ranger bán tải mạnh mẽ, thích hợp cho cả đường thành phố và địa hình.','Điều hòa,Camera lùi,Lốp địa hình,Cầu ngang,Kéo tải 3.5 tấn','available','https://www.youtube.com/embed/XhPCz-q8GIQ'),
(5,'Mitsubishi Xpander 2023','Mitsubishi','Xpander',2023,'MPV',7,'Tự động','Xăng',850000,'thue-xe-xe-mitsubishi-xpander-2023.jpg','MPV 7 chỗ rộng rãi, phù hợp cho gia đình và nhóm bạn du lịch.','Điều hòa,Camera lùi,Màn hình cảm ứng,Kết nối Bluetooth,Ghế lái chỉnh điện','available','https://www.youtube.com/embed/oC3TBPB5YBo'),
(6,'VinFast VF8 2023','VinFast','VF8',2023,'SUV điện',5,'Tự động','Điện',1800000,'thue-xe-xe-vinfast-vf8-2023.jpg','SUV điện thương hiệu Việt Nam. Phạm vi 420km/sạc, tăng tốc 0-100km/h trong 5.9 giây.','Điều hòa,Camera 360,ADAS,Màn hình 15.6 inch,Sạc nhanh AC/DC,Hỗ trợ phanh tự động','available','https://www.youtube.com/embed/Iy4J4Hfnfz8'),
(7,'Honda City 2023','Honda','City',2023,'Sedan',5,'Tự động','Xăng',750000,'thue-xe-xe-honda-city-2023.jpg','Honda City 2023 - Sedan hạng B thế hệ mới với ngoại thất thể thao, nội thất hiện đại và tiết kiệm nhiên liệu vượt trội.','Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng 8 inch,Kết nối Bluetooth,Honda Sensing','available','https://www.youtube.com/embed/7KBSfQFSfkM'),
(8,'Mazda CX-5 2023','Mazda','CX-5',2023,'SUV',5,'Tự động','Xăng',1150000,'thue-xe-xe-mazda-cx5-2023.jpg','Mazda CX-5 2023 - SUV hạng C với thiết kế Kodo sang trọng, cabin cách âm tốt và hệ thống an toàn hiện đại.','Điều hòa hai vùng,Camera 360,Cảm biến va chạm,Màn hình 10.25 inch,Ghế da,i-Activsense','available','https://www.youtube.com/embed/nYrFWMJEY3U'),
(9,'Mazda 3 2023','Mazda','Mazda3',2023,'Sedan',5,'Tự động','Xăng',850000,'thue-xe-xe-mazda3-2023.jpg','Mazda 3 2023 - Sedan hạng C với thiết kế thời thượng, động cơ Skyactiv tiết kiệm và vận hành mượt mà.','Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình 8.8 inch,Sạc không dây,Ghế da','available','https://www.youtube.com/embed/H-VFm0sgkbU'),
(10,'Toyota Vios 2023','Toyota','Vios',2023,'Sedan',5,'Tự động','Xăng',700000,'thue-xe-xe-toyota-vios-2023.jpg','Toyota Vios 2023 - Sedan hạng B phổ biến, bền bỉ và tiết kiệm nhiên liệu, phù hợp di chuyển đô thị.','Điều hòa,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Túi khí đôi','available','https://www.youtube.com/embed/BSRV9dLrN8g'),
(11,'VinFast VF5 2023','VinFast','VF5',2023,'SUV điện',5,'Tự động','Điện',900000,'thue-xe-xe-vinfast-vf5-2023.jpg','VinFast VF5 - SUV điện mini thương hiệu Việt, phạm vi 326km/sạc, phù hợp di chuyển nội đô kinh tế.','Điều hòa,Camera lùi,Màn hình 10 inch,Sạc nhanh AC/DC,Kết nối điện thoại,Túi khí đôi','available','https://www.youtube.com/embed/MJMhLTSWXd4'),
(12,'Suzuki XL7 2023','Suzuki','XL7',2023,'SUV',7,'Tự động','Xăng',820000,'thue-xe-xe-suzuki-xl7-2023.jpg','Suzuki XL7 2023 - SUV 7 chỗ gọn gàng, tiết kiệm nhiên liệu, thiết kế hiện đại phù hợp gia đình.','Điều hòa,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Hàng ghế thứ 3','available','https://www.youtube.com/embed/s5k5y8fCyOI');

-- =====================================================
-- BẢNG HÌNH ẢNH XE (hinhanhxe)
-- loai: front | back | left | right | interior
-- =====================================================
CREATE TABLE IF NOT EXISTS `hinhanhxe` (
  `id`   INT          NOT NULL AUTO_INCREMENT,
  `idxe` INT          NOT NULL                               COMMENT 'FK → xe (old: car_id)',
  `loai` ENUM('front','back','left','right','interior')
                      NOT NULL DEFAULT 'front'               COMMENT 'Loại ảnh (old: type)',
  `tep`  VARCHAR(255) NOT NULL                               COMMENT 'Tên file (old: filename)',
  PRIMARY KEY (`id`),
  KEY `idx_idxe` (`idxe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BẢNG DỊCH VỤ ĐI KÈM (dichvu)
-- donvi: giữ ENUM 'ngày'/'chuyến' (giá trị data, không phải tên cột)
-- =====================================================
CREATE TABLE IF NOT EXISTS `dichvu` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `ten`       VARCHAR(255)  NOT NULL                         COMMENT 'Tên dịch vụ (old: name)',
  `icon`      VARCHAR(100)  NOT NULL DEFAULT 'star',
  `gia`       DECIMAL(12,0) NOT NULL DEFAULT 0               COMMENT 'Giá (old: price)',
  `donvi`     ENUM('ngày','chuyến') NOT NULL DEFAULT 'chuyến' COMMENT 'Đơn vị (old: unit)',
  `mota`      TEXT                                           COMMENT 'Mô tả (old: description)',
  `trangthai` TINYINT(1)    NOT NULL DEFAULT 1               COMMENT 'Trạng thái (old: status)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `dichvu` (`id`,`ten`,`icon`,`gia`,`donvi`,`mota`,`trangthai`) VALUES
(1,'Giao xe tận nơi','map-marker-alt',100000,'chuyến','Giao xe đến tận địa chỉ của bạn trong nội thành, tiết kiệm thời gian và thuận tiện tối đa.',1),
(2,'Bảo hiểm mở rộng','shield-alt',150000,'ngày','Gói bảo hiểm toàn diện bảo vệ xe và người lái trong suốt chuyến đi, an tâm không lo rủi ro.',1),
(3,'Xe có tài xế','user-tie',300000,'ngày','Tài xế chuyên nghiệp, am hiểu đường xá TP.HCM, phong thái lịch sự và nhiệt tình phục vụ.',1),
(4,'GPS định vị','map-marker-alt',50000,'chuyến','Thiết bị GPS dẫn đường chính xác, bản đồ cập nhật mới nhất, không lo lạc đường.',1),
(5,'Ghế trẻ em','baby',100000,'chuyến','Ghế ngồi an toàn cho bé dưới 10 tuổi, đạt tiêu chuẩn an toàn quốc tế.',1),
(6,'WiFi di động','wifi',80000,'chuyến','Bộ phát WiFi di động tốc độ cao, kết nối internet ổn định suốt chuyến đi.',1);

-- =====================================================
-- BẢNG ĐẶT XE (datxe)
-- trangthai: pending | confirmed | completed | cancelled
-- idkhachhang: FK → nguoidung (customer)
-- idnhacungcap: FK → nguoidung (provider)
-- =====================================================
CREATE TABLE IF NOT EXISTS `datxe` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `idkhachhang`         INT           DEFAULT NULL            COMMENT 'FK → nguoidung khách hàng (old: user_id)',
  `idnhacungcap`        INT           DEFAULT NULL            COMMENT 'FK → nguoidung nhà cung cấp (old: provider_id)',
  `idxe`                INT           NOT NULL                COMMENT 'FK → xe (old: car_id)',
  `tenxe`               VARCHAR(255)  NOT NULL DEFAULT ''     COMMENT 'Tên xe snapshot (old: car_name)',
  `tenkhachhang`        VARCHAR(255)  NOT NULL                COMMENT 'Tên khách hàng (old: customer_name)',
  `emailkhachhang`      VARCHAR(255)  NOT NULL DEFAULT ''     COMMENT 'Email (old: customer_email)',
  `dienthoaikhachhang`  VARCHAR(20)   NOT NULL                COMMENT 'Điện thoại (old: customer_phone)',
  `diachikhachhang`     TEXT          NOT NULL DEFAULT ''     COMMENT 'Địa chỉ (old: customer_address)',
  `socccd`              VARCHAR(50)   DEFAULT ''              COMMENT 'Số CCCD/CMND (old: id_number)',
  `ngaynhan`            DATE          NOT NULL                COMMENT 'Ngày nhận xe (old: pickup_date)',
  `gionhan`             TIME          NOT NULL DEFAULT '08:00:00' COMMENT 'Giờ nhận xe (old: pickup_time)',
  `ngaytra`             DATE          NOT NULL                COMMENT 'Ngày trả xe (old: return_date)',
  `gioratra`            TIME          NOT NULL DEFAULT '08:00:00' COMMENT 'Giờ trả xe (old: return_time)',
  `diachinhan`          VARCHAR(255)  DEFAULT ''              COMMENT 'Địa chỉ nhận xe (old: pickup_location)',
  `ghichu`              TEXT                                  COMMENT 'Ghi chú (old: notes)',
  `songay`              INT           NOT NULL DEFAULT 1      COMMENT 'Số ngày thuê (old: total_days)',
  `tongtien`            DECIMAL(12,0) NOT NULL                COMMENT 'Tổng tiền compat (old: total_price)',
  `dichvuthem`          TEXT          DEFAULT NULL            COMMENT 'JSON dịch vụ thêm (old: addon_services)',
  `tiendichvuthem`      DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Tiền dịch vụ thêm (old: addon_total)',
  `tamtinh`             DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Tạm tính thuê gốc (old: subtotal)',
  `tiengiamgia`         DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Tiền giảm giá (old: discount_amount)',
  `tienvat`             DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Tiền VAT 10% (old: tax_amount)',
  `tiendatcoc`          DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Tiền đặt cọc (old: deposit_amount)',
  `phuphi`              DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Phụ phí phát sinh (old: surcharge_amount)',
  `phicuoituan`         DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Phí cuối tuần (old: weekend_surcharge_amount)',
  `tongcuoi`            DECIMAL(12,0) NOT NULL DEFAULT 0      COMMENT 'Tổng cuối (old: final_total)',
  `gioratre`            INT           NOT NULL DEFAULT 0      COMMENT 'Giờ trả trễ (old: late_return_hours)',
  `trangthai`           ENUM('pending','confirmed','completed','cancelled')
                                      NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái (old: status)',
  `ngaytao`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo (old: created_at)',
  PRIMARY KEY (`id`),
  KEY `idx_idkhachhang`  (`idkhachhang`),
  KEY `idx_idnhacungcap` (`idnhacungcap`),
  KEY `idx_trangthai`    (`trangthai`),
  KEY `idx_idxe`         (`idxe`),
  KEY `idx_ngaynhan`     (`ngaynhan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu đặt xe
INSERT INTO `datxe`
  (`idxe`,`tenxe`,`tenkhachhang`,`emailkhachhang`,`dienthoaikhachhang`,`diachikhachhang`,`socccd`,`ngaynhan`,`ngaytra`,`diachinhan`,`ghichu`,`songay`,`tongtien`,`trangthai`,`ngaytao`)
VALUES
(1,'Toyota Camry 2023','Nguyễn Văn An','nguyenvanan@gmail.com','0901234567','12 Nguyễn Huệ, Q.1, TP.HCM','079201001234','2026-02-26','2026-03-01','12 Nguyễn Huệ, Q.1','Giao xe trước 8 giờ sáng',4,4800000,'pending','2026-02-24 10:15:00'),
(2,'Honda CR-V 2022','Trần Thị Bích','tranthibich@gmail.com','0912345678','45 Lê Lợi, Hải Châu, Đà Nẵng','048195002345','2026-02-27','2026-03-03','45 Lê Lợi, Hải Châu','Cần xe đi du lịch Hội An cả gia đình',5,7500000,'confirmed','2026-02-23 14:30:00'),
(6,'VinFast VF8 2023','Lê Minh Khoa','leminhkhoa@gmail.com','0978901234','88 Đinh Tiên Hoàng, Bình Thạnh, HCM','079197003456','2026-03-01','2026-03-05','88 Đinh Tiên Hoàng','Muốn trải nghiệm xe điện VinFast',4,7200000,'pending','2026-02-25 09:00:00'),
(8,'Mazda CX-5 2023','Phạm Quỳnh Anh','phamquynhanh@gmail.com','0934567890','23 Trần Phú, Nha Trang','056200004567','2026-02-28','2026-03-02','23 Trần Phú, Nha Trang','',3,3450000,'confirmed','2026-02-24 16:45:00'),
(7,'Honda City 2023','Hoàng Đức Trung','hoangductrung@gmail.com','0945678901','67 Hai Bà Trưng, Q.3, TP.HCM','079199005678','2026-02-10','2026-02-13','67 Hai Bà Trưng, Q.3','',3,2250000,'completed','2026-02-08 11:20:00'),
(4,'Ford Ranger 2022','Vũ Thị Lan','vuthilan@gmail.com','0956789012','15 Phan Bội Châu, TP. Huế','046200006789','2026-02-05','2026-02-08','15 Phan Bội Châu, Huế','Đi công trình miền núi, cần xe gầm cao',3,2700000,'completed','2026-02-03 08:00:00'),
(9,'Mazda 3 2023','Đỗ Thanh Tùng','dothanhtung@gmail.com','0967890123','100 Nguyễn Trãi, Thanh Xuân, HN','001198007890','2026-01-20','2026-01-25','100 Nguyễn Trãi, Thanh Xuân','Đi công tác Hải Phòng 5 ngày',5,4250000,'completed','2026-01-18 13:10:00'),
(10,'Toyota Vios 2023','Ngô Thị Mai','ngothimai@gmail.com','0989012345','5 Lý Tự Trọng, Ninh Kiều, Cần Thơ','092200008901','2026-01-15','2026-01-18','5 Lý Tự Trọng, Cần Thơ','',3,2100000,'completed','2026-01-13 15:30:00'),
(5,'Mitsubishi Xpander 2023','Bùi Văn Hùng','buivanhung@gmail.com','0901112233','30 Lê Duẩn, Q.1, TP.HCM','079195009012','2026-02-01','2026-02-05','30 Lê Duẩn, Q.1','Đưa gia đình 7 người đi Vũng Tàu',4,3400000,'completed','2026-01-29 10:00:00');

-- =====================================================
-- BẢNG LIÊN HỆ (lienhe)
-- =====================================================
CREATE TABLE IF NOT EXISTS `lienhe` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `ten`         VARCHAR(255) NOT NULL                        COMMENT 'Tên người liên hệ (old: name)',
  `sodienthoai` VARCHAR(20)  NOT NULL                        COMMENT 'Số điện thoại (old: phone)',
  `email`       VARCHAR(255) DEFAULT '',
  `chude`       VARCHAR(255) DEFAULT ''                      COMMENT 'Chủ đề (old: subject)',
  `noidung`     TEXT         NOT NULL                        COMMENT 'Nội dung (old: message)',
  `dadoc`       TINYINT(1)   NOT NULL DEFAULT 0              COMMENT 'Đã đọc (old: is_read)',
  `ngaytao`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo (old: created_at)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MIGRATION: Schema cũ → Schema v3
-- Stored procedure: an toàn khi chạy nhiều lần
-- Chạy khi đã có DB cũ (car_rental với tên bảng cũ)
-- =====================================================

DROP PROCEDURE IF EXISTS `thuexe_migrate_v3`;
DELIMITER $$
CREATE PROCEDURE `thuexe_migrate_v3`()
BEGIN
    -- ── 1. MIGRATE: users → nguoidung ──────────────────────────
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    ) THEN
        -- Kiểm tra xem cột avatar, cccd_front, cccd_back có tồn tại không
        IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
        ) THEN
            INSERT IGNORE INTO `nguoidung`
                (id, hoten, email, sodienthoai, matkhau, vaitro, trangthai,
                 tencongty, sogiayphep, diachi, mota, lydotuchoi,
                 avatar, cccdmatruoc, cccdmatsau, ngaytao)
            SELECT
                id, full_name, email, phone, password, role, status,
                company_name, license_number, address, description, rejection_reason,
                avatar,
                IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cccd_front') > 0,
                    cccd_front, NULL
                ),
                IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cccd_back') > 0,
                    cccd_back, NULL
                ),
                created_at
            FROM `users`;
        ELSE
            INSERT IGNORE INTO `nguoidung`
                (id, hoten, email, sodienthoai, matkhau, vaitro, trangthai,
                 tencongty, sogiayphep, diachi, mota, lydotuchoi, ngaytao)
            SELECT
                id, full_name, email, phone, password, role, status,
                company_name, license_number, address, description, rejection_reason,
                created_at
            FROM `users`;
        END IF;
    END IF;

    -- ── 2. MIGRATE: cars → xe ───────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars'
    ) THEN
        INSERT IGNORE INTO `xe`
            (id, ten, thuonghieu, model, namsanxuat, loaixe, socho, hopso, nhienlieu,
             giathue, tilephicuoituan, tiledatcoc, anhchinh, mota, tienich,
             trangthai, idnhacungcap, urlvideo, ngaytao)
        SELECT
            id, name, brand, model, year, car_type, seats, transmission, fuel_type,
            price_per_day,
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'weekend_surcharge_rate') > 0,
                weekend_surcharge_rate, 0.10
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'deposit_rate') > 0,
                deposit_rate, 0.30
            ),
            main_image, description, features,
            status,
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'provider_id') > 0,
                provider_id, NULL
            ),
            video_url, created_at
        FROM `cars`;
    END IF;

    -- ── 3. MIGRATE: car_images → hinhanhxe ─────────────────────
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_images'
    ) THEN
        INSERT IGNORE INTO `hinhanhxe` (id, idxe, loai, tep)
        SELECT id, car_id, type, filename FROM `car_images`;
    END IF;

    -- ── 4. MIGRATE: services → dichvu ──────────────────────────
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'
    ) THEN
        INSERT IGNORE INTO `dichvu` (id, ten, icon, gia, donvi, mota, trangthai)
        SELECT
            id, name, icon, price,
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'unit') > 0,
                unit, 'chuyến'
            ),
            description, status
        FROM `services`;
    END IF;

    -- ── 5. MIGRATE: bookings → datxe ───────────────────────────
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
    ) THEN
        -- Dùng SET để tránh lỗi cột cũ chưa có
        INSERT IGNORE INTO `datxe`
            (id, idkhachhang, idnhacungcap, idxe, tenxe,
             tenkhachhang, emailkhachhang, dienthoaikhachhang, diachikhachhang, socccd,
             ngaynhan, gionhan, ngaytra, gioratra, diachinhan, ghichu,
             songay, tongtien, dichvuthem, tiendichvuthem,
             tamtinh, tiengiamgia, tienvat, tiendatcoc, phuphi, phicuoituan,
             tongcuoi, gioratre, trangthai, ngaytao)
        SELECT
            id, user_id, provider_id, car_id, car_name,
            customer_name, customer_email, customer_phone, customer_address, id_number,
            pickup_date,
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'pickup_time') > 0,
                pickup_time, '08:00:00'
            ),
            return_date,
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'return_time') > 0,
                return_time, '08:00:00'
            ),
            pickup_location, notes,
            total_days, total_price, addon_services, addon_total,
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'subtotal') > 0,
                subtotal, total_price - addon_total
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'discount_amount') > 0,
                discount_amount, 0
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'tax_amount') > 0,
                tax_amount, 0
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'deposit_amount') > 0,
                deposit_amount, 0
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'surcharge_amount') > 0,
                surcharge_amount, 0
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'weekend_surcharge_amount') > 0,
                weekend_surcharge_amount, 0
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'final_total') > 0,
                final_total, total_price
            ),
            IF(
                (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'late_return_hours') > 0,
                late_return_hours, 0
            ),
            status, created_at
        FROM `bookings`;
    END IF;

    -- ── 6. MIGRATE: contacts → lienhe ──────────────────────────
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contacts'
    ) THEN
        INSERT IGNORE INTO `lienhe` (id, ten, sodienthoai, email, chude, noidung, dadoc, ngaytao)
        SELECT id, name, phone, email, subject, message, is_read, created_at
        FROM `contacts`;
    END IF;

END$$
DELIMITER ;

-- Gọi migration (chỉ có tác dụng nếu tồn tại bảng cũ)
CALL `thuexe_migrate_v3`();
DROP PROCEDURE IF EXISTS `thuexe_migrate_v3`;

-- =====================================================
-- REFERENCE: TRUY VẤN SELECT CHUẨN (dùng trong backend)
--
-- xe (đầy đủ alias):
--   SELECT id, ten AS name, thuonghieu AS brand, model,
--          namsanxuat AS year, loaixe AS car_type, socho AS seats,
--          hopso AS transmission, nhienlieu AS fuel_type,
--          giathue AS price_per_day,
--          tilephicuoituan AS weekend_surcharge_rate,
--          tiledatcoc AS deposit_rate, anhchinh AS main_image,
--          mota AS description, tienich AS features,
--          trangthai AS status, idnhacungcap AS provider_id,
--          urlvideo AS video_url, ngaytao AS created_at
--   FROM xe
--
-- datxe (đầy đủ alias):
--   SELECT id, idkhachhang AS user_id, idnhacungcap AS provider_id,
--          idxe AS car_id, tenxe AS car_name,
--          tenkhachhang AS customer_name, emailkhachhang AS customer_email,
--          dienthoaikhachhang AS customer_phone, diachikhachhang AS customer_address,
--          socccd AS id_number, ngaynhan AS pickup_date, gionhan AS pickup_time,
--          ngaytra AS return_date, gioratra AS return_time,
--          diachinhan AS pickup_location, ghichu AS notes,
--          songay AS total_days, tongtien AS total_price,
--          dichvuthem AS addon_services, tiendichvuthem AS addon_total,
--          tamtinh AS subtotal, tiengiamgia AS discount_amount,
--          tienvat AS tax_amount, tiendatcoc AS deposit_amount,
--          phuphi AS surcharge_amount, phicuoituan AS weekend_surcharge_amount,
--          tongcuoi AS final_total, gioratre AS late_return_hours,
--          trangthai AS status, ngaytao AS created_at
--   FROM datxe
-- =====================================================
