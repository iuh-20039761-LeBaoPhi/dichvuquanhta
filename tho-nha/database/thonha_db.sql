-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 02, 2026 at 07:39 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `thonha_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password`) VALUES
(2, 'admin', '$2y$10$6bCPfmuIzA8RXWyVsGHS9eBK8erfGyEt6OjQt7ClA4u7WtyHbfkeO');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `order_code` varchar(30) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `note` text DEFAULT NULL,
  `status` enum('new','confirmed','doing','done','cancel') DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `order_code`, `customer_name`, `phone`, `address`, `note`, `status`, `created_at`) VALUES
(7, 'TN709918', 'Nông Quốc Thương', '0394371259', 'Số 11  Phan Văn Trị', 'aa', 'cancel', '2026-01-22 07:28:30'),
(8, 'TN417873', 'Nông Quốc Thương', '0123456789', 'Số 11  Phan Văn Trị', 'aaa', 'new', '2026-01-22 07:31:23'),
(9, 'TN672259', 'Nông Quốc Thương', '0394371259', 'Số 11  Phan Văn Trị', '', 'new', '2026-01-22 07:32:20'),
(10, 'TN188042', 'Nông Quốc Thu', '0987654321', 'Gò Vấp', 'no', 'confirmed', '2026-01-25 08:36:23'),
(11, 'TN516460', 'thuong', '0987654321', 'Gò Vấp', 'ko', 'cancel', '2026-01-27 04:27:33'),
(12, 'TN735188', 'Nông Quốc Thương', '0394371259', 'Lê đức thọ', '99', 'cancel', '2026-01-28 04:11:00'),
(13, 'TN376090', 'Nông Quốc Thương', '0394371259', 'aa', 'a', 'cancel', '2026-01-28 04:34:07');

-- --------------------------------------------------------

--
-- Table structure for table `booking_services`
--

CREATE TABLE `booking_services` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `price` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking_services`
--

INSERT INTO `booking_services` (`id`, `booking_id`, `service_id`, `price`) VALUES
(1, 1, 1, '300000'),
(2, 2, 10, '1500000'),
(3, 3, 1, '300000'),
(4, 3, 2, '450000'),
(5, 4, 5, '250000'),
(6, 5, 9, '250000'),
(7, 6, 3, '1200000'),
(8, 7, 6, '900000'),
(9, 8, 9, '250000'),
(10, 9, 8, '200000'),
(11, 10, 3, '1200000'),
(12, 11, 12, '200000'),
(13, 12, 6, '900000'),
(14, 13, 7, '350000');

-- --------------------------------------------------------

--
-- Table structure for table `cancel_requests`
--

CREATE TABLE `cancel_requests` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `cancel_reason` text NOT NULL,
  `cancel_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `cancel_requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `cancel_processed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cancel_requests`
--

INSERT INTO `cancel_requests` (`id`, `booking_id`, `cancel_reason`, `cancel_status`, `cancel_requested_at`, `cancel_processed_at`) VALUES
(1, 9, 'aa', 'pending', '2026-01-27 05:51:14', NULL),
(2, 7, 'aa', 'approved', '2026-01-27 05:54:34', '2026-01-27 06:00:42'),
(3, 11, 'aa', 'approved', '2026-01-27 06:23:49', '2026-01-29 09:59:14');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `price` varchar(50) DEFAULT NULL,
  `labor_cost` varchar(50) DEFAULT NULL,
  `material_cost` varchar(50) DEFAULT NULL,
  `brand` varchar(150) DEFAULT NULL,
  `warranty` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `brand_prices` text DEFAULT NULL COMMENT 'JSON: [{name,materialCost,price}]',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `category_id`, `name`, `price`, `labor_cost`, `material_cost`, `brand`, `warranty`, `duration`, `description`, `is_active`) VALUES
(1,  1, 'Vệ sinh máy lạnh',      '300000',   '200000', '100000',  NULL,                    '3 tháng',  '1–2 giờ',   'Vệ sinh toàn bộ dàn lạnh và dàn nóng, làm sạch bụi bẩn, giúp máy lạnh hoạt động hiệu quả và tiết kiệm điện.', 1),
(2,  1, 'Nạp gas máy lạnh',      '450000',   '150000', '300000',  'R32 / R410A',           '3 tháng',  '1–2 giờ',   'Nạp gas đúng loại và đúng áp suất, xử lý thiếu gas giúp máy lạnh làm mát nhanh và ổn định.', 1),
(3,  1, 'Thay block máy lạnh',   '1200000',  '300000', '900000',  'Daikin / Toshiba / LG', '12 tháng', '2–3 giờ',   'Thay block (máy nén) mới cho máy lạnh khi block cũ bị hư, kém lạnh hoặc không hoạt động.', 1),
(4,  1, 'Di dời máy lạnh',       '500000',   '500000', NULL,      NULL,                    '3 tháng',  '2–4 giờ',   'Tháo lắp, di chuyển máy lạnh sang vị trí mới an toàn, đảm bảo kỹ thuật và thẩm mỹ.', 1),
(5,  2, 'Sửa máy giặt không vắt','280000',   '200000', '80000',   NULL,                    '3 tháng',  '1–2 giờ',   'Khắc phục tình trạng máy giặt không vắt, vắt yếu do lỗi motor, dây curoa hoặc bo mạch.', 1),
(6,  2, 'Thay motor máy giặt',   '900000',   '200000', '700000',  'Samsung / LG / Electrolux', '6 tháng', '1–2 giờ', 'Thay motor máy giặt chính hãng, giúp máy giặt hoạt động mạnh mẽ và ổn định trở lại.', 1),
(7,  2, 'Vệ sinh máy giặt',      '350000',   '250000', '100000',  NULL,                    '1 tháng',  '1–2 giờ',   'Vệ sinh lồng giặt, loại bỏ cặn bẩn, vi khuẩn và mùi hôi, bảo vệ sức khỏe gia đình.', 1),
(8,  3, 'Thông tắc bồn cầu',     '200000',   '200000', NULL,      NULL,                    '1 tháng',  '30–60 phút','Xử lý nhanh tình trạng bồn cầu bị nghẹt, thoát nước kém bằng thiết bị chuyên dụng.', 1),
(9,  3, 'Sửa bồn cầu rò nước',   '250000',   '150000', '100000',  NULL,                    '3 tháng',  '1–2 giờ',   'Sửa chữa bồn cầu bị rò rỉ nước, chảy nước liên tục gây lãng phí và mất vệ sinh.', 1),
(10, 3, 'Chống thấm nhà vệ sinh','1500000',  '500000', '1000000', 'Sika / Kova',           '12 tháng', '1–2 ngày',  'Chống thấm triệt để nhà vệ sinh, ngăn thấm nước, ẩm mốc và hư hỏng kết cấu.', 1),
(11, 4, 'Sửa chập điện',         '180000',   '180000', NULL,      NULL,                    '3 tháng',  '1–2 giờ',   'Sửa chữa sự cố chập điện, mất điện cục bộ, đảm bảo an toàn cho hệ thống điện gia đình.', 1),
(12, 4, 'Sửa rò rỉ nước',        '200000',   '200000', NULL,      NULL,                    '3 tháng',  '1–2 giờ',   'Xử lý rò rỉ nước âm tường, đường ống nước bị bể, xì nước nhanh chóng và hiệu quả.', 1),
(13, 4, 'Thay đường ống nước',   '400000',   '200000', '200000',  'Tiền Phong / Bình Minh','12 tháng', '2–4 giờ',   'Thay mới đường ống nước cũ, hư hỏng, đảm bảo nguồn nước sạch và ổn định.', 1),
(14, 5, 'Sửa tủ lạnh',           '300000',   '200000', '100000',  NULL,                    '3 tháng',  '1–2 giờ',   'Sửa chữa các lỗi thường gặp ở tủ lạnh như không lạnh, kêu to, chảy nước.', 1),
(15, 5, 'Sửa tivi',              '250000',   '200000', '50000',   NULL,                    '3 tháng',  '1–2 giờ',   'Sửa tivi bị mất hình, mất tiếng, không lên nguồn với đội ngũ kỹ thuật chuyên nghiệp.', 1),
(16, 5, 'Sửa bếp từ',            '350000',   '250000', '100000',  NULL,                    '3 tháng',  '1–2 giờ',   'Sửa chữa bếp từ không nóng, báo lỗi, không nhận nồi, đảm bảo an toàn khi sử dụng.', 1),
(17, 6, 'Sơn nhà',               '5000000',  '2000000','3000000', 'Dulux / Jotun / Kova',  '12 tháng', '2–5 ngày',  'Sơn mới hoặc sơn lại nhà ở, căn hộ với vật liệu chất lượng cao, bền đẹp theo thời gian.', 1),
(18, 6, 'Trần thạch cao',         '7000000',  '3000000','4000000', 'Gyproc / USG',          '12 tháng', '3–5 ngày',  'Thi công trần thạch cao thẩm mỹ, cách âm, cách nhiệt, phù hợp nhà ở và văn phòng.', 1),
(19, 6, 'Lát nền gạch',          '6000000',  '2500000','3500000', 'Đồng Tâm / Viglacera', '12 tháng', '3–5 ngày',  'Lát nền gạch chuyên nghiệp, thẳng đẹp, bền chắc cho nhà ở và công trình.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `service_categories`
--

CREATE TABLE `service_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_categories`
--

INSERT INTO `service_categories` (`id`, `name`, `description`, `is_active`) VALUES
(1, 'Sửa máy lạnh', 'Các dịch vụ sửa chữa máy lạnh', 1),
(2, 'Sửa máy giặt', NULL, 1),
(3, 'Nhà vệ sinh', NULL, 1),
(4, 'Điện nước', NULL, 1),
(5, 'Đồ gia dụng', NULL, 1),
(6, 'Cải tạo nhà', NULL, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_code` (`order_code`);

--
-- Indexes for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cancel_requests`
--
ALTER TABLE `cancel_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `service_categories`
--
ALTER TABLE `service_categories`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `booking_services`
--
ALTER TABLE `booking_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `cancel_requests`
--
ALTER TABLE `cancel_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `service_categories`
--
ALTER TABLE `service_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cancel_requests`
--
ALTER TABLE `cancel_requests`
  ADD CONSTRAINT `cancel_requests_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ============================================================
-- MIGRATION: Thêm cột mới vào bảng services (chạy nếu DB đã tồn tại)
-- ============================================================
ALTER TABLE `services`
  ADD COLUMN IF NOT EXISTS `labor_cost`    varchar(50)  DEFAULT NULL AFTER `price`,
  ADD COLUMN IF NOT EXISTS `material_cost` varchar(50)  DEFAULT NULL AFTER `labor_cost`,
  ADD COLUMN IF NOT EXISTS `brand`         varchar(150) DEFAULT NULL AFTER `material_cost`,
  ADD COLUMN IF NOT EXISTS `warranty`      varchar(100) DEFAULT NULL AFTER `brand`,
  ADD COLUMN IF NOT EXISTS `duration`      varchar(100) DEFAULT NULL AFTER `warranty`,
  ADD COLUMN IF NOT EXISTS `brand_prices`  text         DEFAULT NULL AFTER `duration`;

UPDATE `services` SET labor_cost='200000', material_cost='100000',  brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=1;
UPDATE `services` SET labor_cost='150000', material_cost='300000',  brand='R32 / R410A',           warranty='3 tháng',  duration='1–2 giờ'   WHERE id=2;
UPDATE `services` SET labor_cost='300000', material_cost='900000',  brand='Daikin / Toshiba / LG', warranty='12 tháng', duration='2–3 giờ'   WHERE id=3;
UPDATE `services` SET labor_cost='500000', material_cost=NULL,      brand=NULL,                    warranty='3 tháng',  duration='2–4 giờ'   WHERE id=4;
UPDATE `services` SET labor_cost='200000', material_cost='80000',   brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=5;
UPDATE `services` SET labor_cost='200000', material_cost='700000',  brand='Samsung / LG / Electrolux', warranty='6 tháng', duration='1–2 giờ' WHERE id=6;
UPDATE `services` SET labor_cost='250000', material_cost='100000',  brand=NULL,                    warranty='1 tháng',  duration='1–2 giờ'   WHERE id=7;
UPDATE `services` SET labor_cost='200000', material_cost=NULL,      brand=NULL,                    warranty='1 tháng',  duration='30–60 phút' WHERE id=8;
UPDATE `services` SET labor_cost='150000', material_cost='100000',  brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=9;
UPDATE `services` SET labor_cost='500000', material_cost='1000000', brand='Sika / Kova',           warranty='12 tháng', duration='1–2 ngày'  WHERE id=10;
UPDATE `services` SET labor_cost='180000', material_cost=NULL,      brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=11;
UPDATE `services` SET labor_cost='200000', material_cost=NULL,      brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=12;
UPDATE `services` SET labor_cost='200000', material_cost='200000',  brand='Tiền Phong / Bình Minh',warranty='12 tháng', duration='2–4 giờ'   WHERE id=13;
UPDATE `services` SET labor_cost='200000', material_cost='100000',  brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=14;
UPDATE `services` SET labor_cost='200000', material_cost='50000',   brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=15;
UPDATE `services` SET labor_cost='250000', material_cost='100000',  brand=NULL,                    warranty='3 tháng',  duration='1–2 giờ'   WHERE id=16;
UPDATE `services` SET labor_cost='2000000',material_cost='3000000', brand='Dulux / Jotun / Kova',  warranty='12 tháng', duration='2–5 ngày'  WHERE id=17;
UPDATE `services` SET labor_cost='3000000',material_cost='4000000', brand='Gyproc / USG',          warranty='12 tháng', duration='3–5 ngày'  WHERE id=18;
UPDATE `services` SET labor_cost='2500000',material_cost='3500000', brand='Đồng Tâm / Viglacera', warranty='12 tháng', duration='3–5 ngày'  WHERE id=19;

-- MIGRATION: Thêm brand_prices (JSON) cho các dịch vụ có nhiều hãng
ALTER TABLE `services` ADD COLUMN IF NOT EXISTS `brand_prices` text DEFAULT NULL AFTER `duration`;

UPDATE `services` SET brand_prices='[{"name":"R32","materialCost":280000,"price":430000},{"name":"R410A","materialCost":320000,"price":470000}]' WHERE id=2;
UPDATE `services` SET brand_prices='[{"name":"Daikin","materialCost":1000000,"price":1300000},{"name":"Toshiba","materialCost":900000,"price":1200000},{"name":"LG","materialCost":850000,"price":1150000}]' WHERE id=3;
UPDATE `services` SET brand_prices='[{"name":"Samsung","materialCost":700000,"price":900000},{"name":"LG","materialCost":650000,"price":850000},{"name":"Electrolux","materialCost":800000,"price":1000000}]' WHERE id=6;
UPDATE `services` SET brand_prices='[{"name":"Sika","materialCost":1000000,"price":1500000},{"name":"Kova","materialCost":800000,"price":1300000}]' WHERE id=10;
UPDATE `services` SET brand_prices='[{"name":"Ti\u1ec1n Phong","materialCost":200000,"price":400000},{"name":"B\u00ecnh Minh","materialCost":180000,"price":380000}]' WHERE id=13;
UPDATE `services` SET brand_prices='[{"name":"Dulux","materialCost":3000000,"price":5000000},{"name":"Jotun","materialCost":3500000,"price":5500000},{"name":"Kova","materialCost":2500000,"price":4500000}]' WHERE id=17;
UPDATE `services` SET brand_prices='[{"name":"Gyproc","materialCost":4000000,"price":7000000},{"name":"USG","materialCost":4500000,"price":7500000}]' WHERE id=18;
UPDATE `services` SET brand_prices='[{"name":"\u0110\u1ed3ng T\u00e2m","materialCost":3500000,"price":6000000},{"name":"Viglacera","materialCost":4000000,"price":6500000}]' WHERE id=19;
