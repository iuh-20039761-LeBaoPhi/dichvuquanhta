-- =====================================================
-- Thuê Xe — Full Database Schema
-- Import file này để tạo mới hoàn toàn
-- Admin mặc định: admin.thuexe@gmail.com / admin123
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `car_rental`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `car_rental`;

-- =====================================================
-- BẢNG NGƯỜI DÙNG (users)
-- role:   admin | customer | provider
-- status: active | blocked | pending | rejected
-- =====================================================
CREATE TABLE `users` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `full_name`      VARCHAR(255) NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `phone`          VARCHAR(20)  NOT NULL DEFAULT '',
  `password`       VARCHAR(255) NOT NULL,
  `role`           ENUM('admin','customer','provider') NOT NULL DEFAULT 'customer',
  `status`         ENUM('active','blocked','pending','rejected') NOT NULL DEFAULT 'active',
  -- Chỉ dùng cho provider
  `company_name`     VARCHAR(255) DEFAULT NULL,
  `license_number`   VARCHAR(100) DEFAULT NULL COMMENT 'Số GPKD / GPXE',
  `address`          TEXT         DEFAULT NULL,
  `description`      TEXT         DEFAULT NULL,
  `rejection_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Lý do từ chối / khóa tài khoản (admin ghi)',
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role`   (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin mặc định (password: admin123)
INSERT INTO `users` (`full_name`, `email`, `phone`, `password`, `role`, `status`) VALUES
('Quản trị viên', 'admin.thuexe@gmail.com', '', '$2y$10$lEmVivDyXWB.Oe.XyB9uK.fg57b63A.CbDA5Lqh1aBZhABqIxnhO6', 'admin', 'active');

-- =====================================================
-- BẢNG XE (cars)
-- Bảng phẳng (denormalized): kết hợp loại xe + thông tin hiển thị
-- car-controller.php và booking-controller.php đều SELECT từ bảng này
-- =====================================================
CREATE TABLE `cars` (
  `id`                     INT           NOT NULL AUTO_INCREMENT,
  `name`                   VARCHAR(255)  NOT NULL,
  `brand`                  VARCHAR(100)  NOT NULL,
  `model`                  VARCHAR(100)  NOT NULL DEFAULT '',
  `year`                   INT           NOT NULL DEFAULT 2023,
  `car_type`               VARCHAR(100)  NOT NULL DEFAULT 'Sedan',
  `seats`                  INT           NOT NULL DEFAULT 5,
  `transmission`           VARCHAR(50)   NOT NULL DEFAULT 'Tự động',
  `fuel_type`              VARCHAR(50)   NOT NULL DEFAULT 'Xăng',
  `price_per_day`          DECIMAL(12,0) NOT NULL,
  `weekend_surcharge_rate` DECIMAL(5,4)  NOT NULL DEFAULT 0.1000 COMMENT 'Tỷ lệ phụ thu cuối tuần',
  `deposit_rate`           DECIMAL(5,4)  NOT NULL DEFAULT 0.3000 COMMENT 'Tỷ lệ đặt cọc',
  `main_image`             VARCHAR(255)  NOT NULL DEFAULT '',
  `description`            TEXT,
  `features`               TEXT          COMMENT 'Comma-separated feature list',
  `status`                 ENUM('available','rented','maintenance') NOT NULL DEFAULT 'available',
  `provider_id`            INT           DEFAULT NULL COMMENT 'FK → users (provider)',
  `video_url`              VARCHAR(500)  DEFAULT NULL,
  `created_at`             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status`      (`status`),
  KEY `idx_brand`       (`brand`),
  KEY `idx_provider_id` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cars`
  (`id`,`name`,`brand`,`model`,`year`,`car_type`,`seats`,`transmission`,`fuel_type`,`price_per_day`,`main_image`,`description`,`features`,`status`,`video_url`)
VALUES
(1, 'Toyota Camry 2023',      'Toyota',    'Camry',   2023, 'Sedan',     5, 'Tự động', 'Xăng',  1200000, 'thue-xe-xe-toyota-camry-2023.jpg',        'Toyota Camry 2023 - Sedan hạng sang với thiết kế sang trọng, nội thất tiện nghi và tiết kiệm nhiên liệu.',         'Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Ghế da cao cấp',         'available', 'https://www.youtube.com/embed/BpMBkt7RCHo'),
(2, 'Honda CR-V 2022',        'Honda',     'CR-V',    2022, 'SUV',       7, 'Tự động', 'Xăng',  1500000, 'thue-xe-xe-honda-crv-2022.jpg',            'Honda CR-V 7 chỗ rộng rãi, phù hợp gia đình. Vận hành mạnh mẽ, an toàn tuyệt đối.',                           'Điều hòa hai vùng,Camera 360,Cảm biến va chạm,Apple CarPlay,Android Auto,Cốp điện',                    'available', 'https://www.youtube.com/embed/iiMmRJlCeDM'),
(3, 'Hyundai Tucson 2023',    'Hyundai',   'Tucson',  2023, 'SUV',       5, 'Tự động', 'Xăng',  1100000, 'thue-xe-xe-anh-mac-dinh-fallback.jpg',     'Hyundai Tucson 2023 với thiết kế trẻ trung, hiện đại. Tiêu thụ nhiên liệu thấp.',                           'Điều hòa tự động,Camera lùi,Hỗ trợ phanh khẩn cấp,Màn hình 10.25 inch,Sạc không dây',                  'available', 'https://www.youtube.com/embed/nPVzCCnCRTo'),
(4, 'Ford Ranger 2022',       'Ford',      'Ranger',  2022, 'Bán tải',   5, 'Số sàn',  'Dầu',    900000, 'thue-xe-xe-ford-ranger-2022.jpg',           'Ford Ranger bán tải mạnh mẽ, thích hợp cho cả đường thành phố và địa hình.',                                 'Điều hòa,Camera lùi,Lốp địa hình,Cầu ngang,Kéo tải 3.5 tấn',                                           'available', 'https://www.youtube.com/embed/XhPCz-q8GIQ'),
(5, 'Mitsubishi Xpander 2023','Mitsubishi','Xpander', 2023, 'MPV',       7, 'Tự động', 'Xăng',   850000, 'thue-xe-xe-mitsubishi-xpander-2023.jpg',   'MPV 7 chỗ rộng rãi, phù hợp cho gia đình và nhóm bạn du lịch.',                                               'Điều hòa,Camera lùi,Màn hình cảm ứng,Kết nối Bluetooth,Ghế lái chỉnh điện',                            'available', 'https://www.youtube.com/embed/oC3TBPB5YBo'),
(6, 'VinFast VF8 2023',       'VinFast',   'VF8',     2023, 'SUV điện', 5, 'Tự động', 'Điện',  1800000, 'thue-xe-xe-vinfast-vf8-2023.jpg',          'SUV điện thương hiệu Việt Nam. Phạm vi 420km/sạc, tăng tốc 0-100km/h trong 5.9 giây.',                        'Điều hòa,Camera 360,ADAS,Màn hình 15.6 inch,Sạc nhanh AC/DC,Hỗ trợ phanh tự động',                    'available', 'https://www.youtube.com/embed/Iy4J4Hfnfz8'),
(7, 'Honda City 2023',        'Honda',     'City',    2023, 'Sedan',     5, 'Tự động', 'Xăng',   750000, 'thue-xe-xe-honda-city-2023.jpg',           'Honda City 2023 - Sedan hạng B thế hệ mới với ngoại thất thể thao, nội thất hiện đại và tiết kiệm nhiên liệu vượt trội.', 'Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng 8 inch,Kết nối Bluetooth,Honda Sensing',   'available', 'https://www.youtube.com/embed/7KBSfQFSfkM'),
(8, 'Mazda CX-5 2023',        'Mazda',     'CX-5',    2023, 'SUV',       5, 'Tự động', 'Xăng',  1150000, 'thue-xe-xe-mazda-cx5-2023.jpg',            'Mazda CX-5 2023 - SUV hạng C với thiết kế Kodo sang trọng, cabin cách âm tốt và hệ thống an toàn hiện đại.',   'Điều hòa hai vùng,Camera 360,Cảm biến va chạm,Màn hình 10.25 inch,Ghế da,i-Activsense',                'available', 'https://www.youtube.com/embed/nYrFWMJEY3U'),
(9, 'Mazda 3 2023',           'Mazda',     'Mazda3',  2023, 'Sedan',     5, 'Tự động', 'Xăng',   850000, 'thue-xe-xe-mazda3-2023.jpg',               'Mazda 3 2023 - Sedan hạng C với thiết kế thời thượng, động cơ Skyactiv tiết kiệm và vận hành mượt mà.',         'Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình 8.8 inch,Sạc không dây,Ghế da',                   'available', 'https://www.youtube.com/embed/H-VFm0sgkbU'),
(10,'Toyota Vios 2023',       'Toyota',    'Vios',    2023, 'Sedan',     5, 'Tự động', 'Xăng',   700000, 'thue-xe-xe-toyota-vios-2023.jpg',          'Toyota Vios 2023 - Sedan hạng B phổ biến, bền bỉ và tiết kiệm nhiên liệu, phù hợp di chuyển đô thị.',          'Điều hòa,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Túi khí đôi',                   'available', 'https://www.youtube.com/embed/BSRV9dLrN8g'),
(11,'VinFast VF5 2023',       'VinFast',   'VF5',     2023, 'SUV điện', 5, 'Tự động', 'Điện',   900000, 'thue-xe-xe-vinfast-vf5-2023.jpg',          'VinFast VF5 - SUV điện mini thương hiệu Việt, phạm vi 326km/sạc, phù hợp di chuyển nội đô kinh tế.',           'Điều hòa,Camera lùi,Màn hình 10 inch,Sạc nhanh AC/DC,Kết nối điện thoại,Túi khí đôi',                 'available', 'https://www.youtube.com/embed/MJMhLTSWXd4'),
(12,'Suzuki XL7 2023',        'Suzuki',    'XL7',     2023, 'SUV',       7, 'Tự động', 'Xăng',   820000, 'thue-xe-xe-suzuki-xl7-2023.jpg',           'Suzuki XL7 2023 - SUV 7 chỗ gọn gàng, tiết kiệm nhiên liệu, thiết kế hiện đại phù hợp gia đình.',             'Điều hòa,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Hàng ghế thứ 3',               'available', 'https://www.youtube.com/embed/s5k5y8fCyOI');

-- =====================================================
-- BẢNG ẢNH XE (car_images)
-- car-controller.php: SELECT * FROM car_images WHERE car_id = :id
-- =====================================================
CREATE TABLE `car_images` (
  `id`       INT          NOT NULL AUTO_INCREMENT,
  `car_id`   INT          NOT NULL,
  `type`     ENUM('front','back','left','right','interior') NOT NULL DEFAULT 'front',
  `filename` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_car_id` (`car_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BẢNG DỊCH VỤ ĐI KÈM (services)
-- service-controller.php: SELECT * FROM services WHERE status = 1
-- booking-controller.php: SELECT name, price, unit FROM services WHERE name IN (...)
-- =====================================================
CREATE TABLE `services` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255)  NOT NULL,
  `icon`        VARCHAR(100)  NOT NULL DEFAULT 'star',
  `price`       DECIMAL(12,0) NOT NULL DEFAULT 0,
  `unit`        ENUM('ngày','chuyến') NOT NULL DEFAULT 'chuyến' COMMENT 'Đơn vị tính phí',
  `description` TEXT,
  `status`      TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1=active, 0=inactive',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `services` (`id`,`name`,`icon`,`price`,`unit`,`description`,`status`) VALUES
(1, 'Giao xe tận nơi',  'map-marker-alt', 100000, 'chuyến', 'Giao xe đến tận địa chỉ của bạn trong nội thành, tiết kiệm thời gian và thuận tiện tối đa.', 1),
(2, 'Bảo hiểm mở rộng', 'shield-alt',     150000, 'ngày',   'Gói bảo hiểm toàn diện bảo vệ xe và người lái trong suốt chuyến đi, an tâm không lo rủi ro.', 1),
(3, 'Xe có tài xế',     'user-tie',        300000, 'ngày',   'Tài xế chuyên nghiệp, am hiểu đường xá TP.HCM, phong thái lịch sự và nhiệt tình phục vụ.', 1),
(4, 'GPS định vị',      'map-marker-alt',   50000, 'chuyến', 'Thiết bị GPS dẫn đường chính xác, bản đồ cập nhật mới nhất, không lo lạc đường.', 1),
(5, 'Ghế trẻ em',       'baby',            100000, 'chuyến', 'Ghế ngồi an toàn cho bé dưới 10 tuổi, đạt tiêu chuẩn an toàn quốc tế.', 1),
(6, 'WiFi di động',     'wifi',             80000, 'chuyến', 'Bộ phát WiFi di động tốc độ cao, kết nối internet ổn định suốt chuyến đi.', 1);

-- =====================================================
-- BẢNG ĐƠN ĐẶT XE (bookings)
-- user_id:     khách hàng đặt xe (FK → users)
-- provider_id: nhà cung cấp nhận đơn (FK → users)
-- =====================================================
CREATE TABLE `bookings` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `user_id`         INT           DEFAULT NULL COMMENT 'FK → users (customer)',
  `provider_id`     INT           DEFAULT NULL COMMENT 'FK → users (provider)',
  `car_id`          INT           NOT NULL,
  `car_name`        VARCHAR(255)  NOT NULL DEFAULT '',
  `customer_name`   VARCHAR(255)  NOT NULL,
  `customer_email`  VARCHAR(255)  NOT NULL DEFAULT '',
  `customer_phone`  VARCHAR(20)   NOT NULL,
  `customer_address`TEXT          NOT NULL DEFAULT '',
  `id_number`       VARCHAR(50)   DEFAULT '' COMMENT 'CCCD / CMND',
  `pickup_date`     DATE          NOT NULL,
  `pickup_time`     TIME          NOT NULL DEFAULT '08:00:00' COMMENT 'Giờ nhận xe',
  `return_date`     DATE          NOT NULL,
  `return_time`     TIME          NOT NULL DEFAULT '08:00:00' COMMENT 'Giờ trả xe',
  `pickup_location` VARCHAR(255)  DEFAULT '',
  `notes`           TEXT,
  `total_days`      INT           NOT NULL DEFAULT 1,
  `total_price`     DECIMAL(12,0) NOT NULL,
  `addon_services`  TEXT          DEFAULT NULL COMMENT 'JSON array of addon service names',
  `addon_total`             DECIMAL(12,0) NOT NULL DEFAULT 0,
  `subtotal`                DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Tiền thuê gốc (total_days × price_per_day)',
  `discount_amount`         DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Giảm giá / khuyến mãi',
  `tax_amount`              DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Thuế VAT 10%',
  `deposit_amount`          DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Tiền đặt cọc (mặc định 30% subtotal)',
  `surcharge_amount`        DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Phụ phí phát sinh (trả trễ, v.v.)',
  `weekend_surcharge_amount`DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Phụ thu cuối tuần / ngày lễ',
  `final_total`             DECIMAL(12,0) NOT NULL DEFAULT 0  COMMENT 'Tổng cuối — ánh xạ total_price (compat)',
  `late_return_hours`       INT           NOT NULL DEFAULT 0  COMMENT 'Số giờ trả trễ (cập nhật sau khi trả xe)',
  `status`          ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id`     (`user_id`),
  KEY `idx_provider_id` (`provider_id`),
  KEY `idx_status`      (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu (user_id/provider_id = NULL vì chưa có tài khoản mẫu)
INSERT INTO `bookings`
  (`car_id`,`car_name`,`customer_name`,`customer_email`,`customer_phone`,`customer_address`,`id_number`,`pickup_date`,`return_date`,`pickup_location`,`notes`,`total_days`,`total_price`,`status`,`created_at`)
VALUES
(1,'Toyota Camry 2023',   'Nguyễn Văn An',    'nguyenvanan@gmail.com',  '0901234567','12 Nguyễn Huệ, Q.1, TP.HCM',        '079201001234','2026-02-26','2026-03-01','12 Nguyễn Huệ, Q.1',        'Giao xe trước 8 giờ sáng',          4,4800000,'pending',   '2026-02-24 10:15:00'),
(2,'Honda CR-V 2022',     'Trần Thị Bích',    'tranthibich@gmail.com',  '0912345678','45 Lê Lợi, Hải Châu, Đà Nẵng',      '048195002345','2026-02-27','2026-03-03','45 Lê Lợi, Hải Châu',        'Cần xe đi du lịch Hội An cả gia đình',5,7500000,'confirmed', '2026-02-23 14:30:00'),
(6,'VinFast VF8 2023',    'Lê Minh Khoa',     'leminhkhoa@gmail.com',   '0978901234','88 Đinh Tiên Hoàng, Bình Thạnh, HCM','079197003456','2026-03-01','2026-03-05','88 Đinh Tiên Hoàng',          'Muốn trải nghiệm xe điện VinFast',  4,7200000,'pending',   '2026-02-25 09:00:00'),
(8,'Mazda CX-5 2023',     'Phạm Quỳnh Anh',   'phamquynhanh@gmail.com', '0934567890','23 Trần Phú, Nha Trang',             '056200004567','2026-02-28','2026-03-02','23 Trần Phú, Nha Trang',     '',                                  3,3450000,'confirmed', '2026-02-24 16:45:00'),
(7,'Honda City 2023',     'Hoàng Đức Trung',  'hoangductrung@gmail.com','0945678901','67 Hai Bà Trưng, Q.3, TP.HCM',       '079199005678','2026-02-10','2026-02-13','67 Hai Bà Trưng, Q.3',        '',                                  3,2250000,'completed', '2026-02-08 11:20:00'),
(4,'Ford Ranger 2022',    'Vũ Thị Lan',       'vuthilan@gmail.com',     '0956789012','15 Phan Bội Châu, TP. Huế',          '046200006789','2026-02-05','2026-02-08','15 Phan Bội Châu, Huế',       'Đi công trình miền núi, cần xe gầm cao',3,2700000,'completed','2026-02-03 08:00:00'),
(9,'Mazda 3 2023',        'Đỗ Thanh Tùng',    'dothanhtung@gmail.com',  '0967890123','100 Nguyễn Trãi, Thanh Xuân, HN',    '001198007890','2026-01-20','2026-01-25','100 Nguyễn Trãi, Thanh Xuân', 'Đi công tác Hải Phòng 5 ngày',      5,4250000,'completed', '2026-01-18 13:10:00'),
(10,'Toyota Vios 2023',   'Ngô Thị Mai',      'ngothimai@gmail.com',    '0989012345','5 Lý Tự Trọng, Ninh Kiều, Cần Thơ', '092200008901','2026-01-15','2026-01-18','5 Lý Tự Trọng, Cần Thơ',      '',                                  3,2100000,'completed', '2026-01-13 15:30:00'),
(5,'Mitsubishi Xpander 2023','Bùi Văn Hùng', 'buivanhung@gmail.com',   '0901112233','30 Lê Duẩn, Q.1, TP.HCM',           '079195009012','2026-02-01','2026-02-05','30 Lê Duẩn, Q.1',             'Đưa gia đình 7 người đi Vũng Tàu',  4,3400000,'completed', '2026-01-29 10:00:00');

-- =====================================================
-- BẢNG LIÊN HỆ (contacts)
-- =====================================================
CREATE TABLE `contacts` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `phone`      VARCHAR(20)  NOT NULL,
  `email`      VARCHAR(255) DEFAULT '',
  `subject`    VARCHAR(255) DEFAULT '',
  `message`    TEXT         NOT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MIGRATION — Nâng cấp DB cũ
-- Chạy phần này nếu DB đã tồn tại từ phiên bản trước.
-- An toàn khi chạy nhiều lần (IF NOT EXISTS check).
-- KHÔNG cần chạy khi import file này lần đầu.
-- =====================================================

DROP PROCEDURE IF EXISTS `cr_migrate`;
DELIMITER $$
CREATE PROCEDURE `cr_migrate`()
BEGIN
    -- v1 → v2: giờ nhận/trả xe
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='pickup_time') THEN
        ALTER TABLE `bookings` ADD COLUMN `pickup_time` TIME NOT NULL DEFAULT '08:00:00' COMMENT 'Giờ nhận xe' AFTER `pickup_date`;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='return_time') THEN
        ALTER TABLE `bookings` ADD COLUMN `return_time` TIME NOT NULL DEFAULT '08:00:00' COMMENT 'Giờ trả xe' AFTER `return_date`;
    END IF;

    -- v1 → v2: chi tiết cấu phần giá trong bookings
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='subtotal') THEN
        ALTER TABLE `bookings`
            ADD COLUMN `subtotal`                 DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Tiền thuê gốc' AFTER `addon_total`,
            ADD COLUMN `discount_amount`          DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Giảm giá' AFTER `subtotal`,
            ADD COLUMN `tax_amount`               DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Thuế VAT 10%' AFTER `discount_amount`,
            ADD COLUMN `deposit_amount`           DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Tiền đặt cọc' AFTER `tax_amount`,
            ADD COLUMN `surcharge_amount`         DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Phụ phí phát sinh' AFTER `deposit_amount`,
            ADD COLUMN `weekend_surcharge_amount` DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Phụ thu cuối tuần' AFTER `surcharge_amount`,
            ADD COLUMN `final_total`              DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Tổng cuối' AFTER `weekend_surcharge_amount`,
            ADD COLUMN `late_return_hours`        INT           NOT NULL DEFAULT 0 COMMENT 'Số giờ trả trễ' AFTER `final_total`;
    END IF;

    -- v1 → v2: services.unit (nếu bảng services tồn tại)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='services') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='services' AND COLUMN_NAME='unit') THEN
            ALTER TABLE `services` ADD COLUMN `unit` ENUM('ngày','chuyến') NOT NULL DEFAULT 'chuyến' COMMENT 'Đơn vị tính phí' AFTER `price`;
        END IF;
    END IF;

    -- v1 → v2: cars (nếu bảng cars tồn tại)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cars') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cars' AND COLUMN_NAME='weekend_surcharge_rate') THEN
            ALTER TABLE `cars` ADD COLUMN `weekend_surcharge_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.1000 COMMENT 'Tỷ lệ phụ thu cuối tuần' AFTER `price_per_day`;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cars' AND COLUMN_NAME='deposit_rate') THEN
            ALTER TABLE `cars` ADD COLUMN `deposit_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.3000 COMMENT 'Tỷ lệ đặt cọc' AFTER `weekend_surcharge_rate`;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cars' AND COLUMN_NAME='provider_id') THEN
            ALTER TABLE `cars` ADD COLUMN `provider_id` INT DEFAULT NULL COMMENT 'FK → users (provider sở hữu xe)';
            ALTER TABLE `cars` ADD INDEX `idx_cars_provider_id` (`provider_id`);
        END IF;
    END IF;

    -- v2 → v3: rejection_reason cho users
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='rejection_reason') THEN
        ALTER TABLE `users` ADD COLUMN `rejection_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Lý do từ chối / khóa tài khoản (admin ghi)';
    END IF;

END$$
DELIMITER ;

CALL `cr_migrate`();
DROP PROCEDURE IF EXISTS `cr_migrate`;

-- Backfill bookings cũ: final_total = total_price, subtotal = total_price - addon_total
UPDATE `bookings` SET `final_total` = `total_price`, `subtotal` = `total_price` - `addon_total`
WHERE `final_total` = 0 AND `total_price` > 0;

-- =====================================================
-- Công thức tính tiền (tham khảo):
--   subtotal                 = total_days × price_per_day
--   weekend_surcharge_amount = weekend_days × price_per_day × weekend_surcharge_rate
--   addon_total              = Σ services.price (×days nếu unit='ngày', ×1 nếu 'chuyến')
--   tax_amount               = ROUND((subtotal + weekend_surcharge_amount + addon_total) × 0.10)
--   deposit_amount           = ROUND(subtotal × deposit_rate)
--   final_total              = subtotal + weekend_surcharge_amount + addon_total + tax_amount − discount_amount
--   total_price              = final_total  (backward compatibility)
-- =====================================================
