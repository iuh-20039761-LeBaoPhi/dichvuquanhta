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
