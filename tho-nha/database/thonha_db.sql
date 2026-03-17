-- =====================================================
-- Thợ Nhà — Full Database Schema
-- Import file này để tạo mới hoàn toàn
-- Admin mặc định: admin@thonha.com / admin123
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `thonha`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `thonha`;

-- =====================================================
-- BẢNG NGƯỜI DÙNG (users)
-- role:   admin | customer | provider
-- status: active | blocked | pending | rejected
--   provider: pending=chờ duyệt, active=đã duyệt
-- =====================================================
CREATE TABLE `users` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `full_name`    VARCHAR(100) NOT NULL,
  `email`        VARCHAR(100) NOT NULL,
  `phone`        VARCHAR(20)  NOT NULL DEFAULT '',
  `password`     VARCHAR(255) NOT NULL,
  `role`         ENUM('admin','customer','provider') NOT NULL DEFAULT 'customer',
  `status`       ENUM('active','blocked','pending','rejected') NOT NULL DEFAULT 'active',
  -- Chỉ dùng cho provider
  `company_name` VARCHAR(255) DEFAULT NULL COMMENT 'Tên cửa hàng / đội thợ',
  `address`      TEXT         DEFAULT NULL,
  `description`  TEXT         DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role`   (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin mặc định (password: admin123)
INSERT INTO `users` (`full_name`, `email`, `phone`, `password`, `role`, `status`) VALUES
('Quản trị viên', 'admin@thonha.com', '', '$2y$10$6bCPfmuIzA8RXWyVsGHS9eBK8erfGyEt6OjQt7ClA4u7WtyHbfkeO', 'admin', 'active');

-- =====================================================
-- BẢNG ĐẶT LỊCH (bookings)
-- user_id:     khách hàng đặt lịch (FK → users)
-- provider_id: nhà cung cấp nhận đơn (FK → users)
-- =====================================================
CREATE TABLE `bookings` (
  `id`            INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`       INT(11)      DEFAULT NULL COMMENT 'FK → users (customer)',
  `provider_id`   INT(11)      DEFAULT NULL COMMENT 'FK → users (provider)',
  `order_code`    VARCHAR(30)  DEFAULT NULL,
  `customer_name` VARCHAR(100) DEFAULT NULL,
  `phone`         VARCHAR(20)  DEFAULT NULL,
  `service_name`  VARCHAR(255) NOT NULL DEFAULT '',
  `address`       TEXT         DEFAULT NULL,
  `note`          TEXT         DEFAULT NULL,
  `status`        ENUM('new','confirmed','doing','done','cancel') NOT NULL DEFAULT 'new',
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code`   (`order_code`),
  KEY `idx_user_id`     (`user_id`),
  KEY `idx_provider_id` (`provider_id`),
  KEY `idx_status`      (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu
INSERT INTO `bookings` (`order_code`,`customer_name`,`phone`,`service_name`,`address`,`note`,`status`,`created_at`) VALUES
('TN709918','Nguyễn Văn An',   '0901234567','Thay motor máy giặt',    'Số 11 Phan Văn Trị, Q. Bình Thạnh','',   'cancel',    '2026-01-22 07:28:30'),
('TN417873','Trần Thị Bích',   '0912345678','Sửa bồn cầu rò nước',   '45 Lê Lợi, Quận Hải Châu, Đà Nẵng','',  'new',       '2026-01-22 07:31:23'),
('TN672259','Lê Minh Khoa',    '0978901234','Sửa bồn cầu rò nước',   '88 Đinh Tiên Hoàng, Bình Thạnh','',      'new',       '2026-01-22 07:32:20'),
('TN188042','Phạm Quỳnh Anh',  '0987654321','Chống thấm nhà vệ sinh', 'Gò Vấp, TP.HCM','',                    'confirmed', '2026-01-25 08:36:23'),
('TN516460','Hoàng Đức Trung', '0945678901','Sửa rò rỉ nước',        '67 Hai Bà Trưng, Q.3, TP.HCM','',       'cancel',    '2026-01-27 04:27:33'),
('TN735188','Vũ Thị Lan',      '0956789012','Thay motor máy giặt',    '15 Phan Bội Châu, TP. Huế','',           'cancel',    '2026-01-28 04:11:00'),
('TN376090','Ngô Thị Mai',     '0989012345','Vệ sinh máy giặt',       '5 Lý Tự Trọng, Cần Thơ','',             'done',      '2026-01-28 04:34:07'),
('TN821345','Bùi Văn Hùng',    '0901112233','Sơn tường nội thất',     '30 Lê Duẩn, Q.1, TP.HCM','',            'doing',     '2026-02-01 09:00:00');

-- =====================================================
-- BẢNG YÊU CẦU HỦY (cancel_requests)
-- =====================================================
CREATE TABLE `cancel_requests` (
  `id`                  INT(11)  NOT NULL AUTO_INCREMENT,
  `booking_id`          INT(11)  NOT NULL,
  `cancel_reason`       TEXT     NOT NULL,
  `cancel_status`       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `cancel_requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cancel_processed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `cancel_requests_ibfk_1`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu yêu cầu hủy
INSERT INTO `cancel_requests` (`booking_id`,`cancel_reason`,`cancel_status`,`cancel_requested_at`,`cancel_processed_at`) VALUES
(3,'Tôi muốn đổi lịch sang tuần sau',    'pending',  '2026-01-27 05:51:14', NULL),
(1,'Đặt nhầm dịch vụ',                   'approved', '2026-01-27 05:54:34', '2026-01-27 06:00:42'),
(5,'Bận đột xuất không thể tiếp thợ',    'approved', '2026-01-27 06:23:49', '2026-01-29 09:59:14');

-- =====================================================
-- MIGRATION: Tính năng tính tiền nâng cao
-- Chạy các lệnh ALTER TABLE này một lần trên DB hiện có.
-- An toàn — dùng IF NOT EXISTS, không phá vỡ dữ liệu cũ.
-- =====================================================

-- Bảng services: thêm cột pricing_json để lưu phí di chuyển, khảo sát, khoảng giá theo hãng
ALTER TABLE `services`
  ADD COLUMN IF NOT EXISTS `pricing_json` TEXT DEFAULT NULL
    COMMENT 'JSON: { travelFee, surveyFee, priceRange, brandPrices }';

-- Bảng bookings: thêm hãng đã chọn và giá ước tính khi đặt lịch
ALTER TABLE `bookings`
  ADD COLUMN IF NOT EXISTS `selected_brand`  VARCHAR(100) DEFAULT NULL
    COMMENT 'Hãng linh kiện/vật liệu đã chọn khi đặt lịch',
  ADD COLUMN IF NOT EXISTS `estimated_price` INT(11)      DEFAULT NULL
    COMMENT 'Giá ước tính tối thiểu (service + travel + survey) lúc đặt';

-- =====================================================
-- Nếu MySQL < 8.0 không hỗ trợ IF NOT EXISTS trong ALTER TABLE,
-- dùng script dưới thay thế (kiểm tra trước bằng SHOW COLUMNS):
-- =====================================================
-- ALTER TABLE `services` ADD COLUMN `pricing_json` TEXT DEFAULT NULL COMMENT '...';
-- ALTER TABLE `bookings` ADD COLUMN `selected_brand` VARCHAR(100) DEFAULT NULL COMMENT '...';
-- ALTER TABLE `bookings` ADD COLUMN `estimated_price` INT(11) DEFAULT NULL COMMENT '...';
