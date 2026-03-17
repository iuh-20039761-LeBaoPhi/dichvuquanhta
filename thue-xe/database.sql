-- =====================================================
-- Thuê Xe — Full Database Schema
-- Import file này để tạo mới hoàn toàn
-- Admin mặc định: admin@carrental.com / admin123
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
  `company_name`   VARCHAR(255) DEFAULT NULL,
  `license_number` VARCHAR(100) DEFAULT NULL COMMENT 'Số GPKD / GPXE',
  `address`        TEXT         DEFAULT NULL,
  `description`    TEXT         DEFAULT NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role`   (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin mặc định (password: admin123)
INSERT INTO `users` (`full_name`, `email`, `phone`, `password`, `role`, `status`) VALUES
('Quản trị viên', 'admin@carrental.com', '', '$2y$10$lEmVivDyXWB.Oe.XyB9uK.fg57b63A.CbDA5Lqh1aBZhABqIxnhO6', 'admin', 'active');

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
  `return_date`     DATE          NOT NULL,
  `pickup_location` VARCHAR(255)  DEFAULT '',
  `notes`           TEXT,
  `total_days`      INT           NOT NULL DEFAULT 1,
  `total_price`     DECIMAL(12,0) NOT NULL,
  `addon_services`  TEXT          DEFAULT NULL COMMENT 'JSON array of addon service names',
  `addon_total`     DECIMAL(12,0) NOT NULL DEFAULT 0,
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
