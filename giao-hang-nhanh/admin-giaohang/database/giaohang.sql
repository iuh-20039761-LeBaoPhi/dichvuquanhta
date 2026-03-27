-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th3 21, 2026 lúc 10:30 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `giaohang`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_code` varchar(20) NOT NULL,
  `client_order_code` varchar(100) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `shipper_id` int(11) DEFAULT NULL,
  `pickup_address` text DEFAULT NULL,
  `pickup_lat` decimal(10,8) DEFAULT NULL,
  `pickup_lng` decimal(11,8) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `receiver_name` varchar(100) NOT NULL,
  `receiver_phone` varchar(20) NOT NULL,
  `delivery_address` text NOT NULL,
  `delivery_lat` decimal(10,8) DEFAULT NULL,
  `delivery_lng` decimal(11,8) DEFAULT NULL,
  `intl_country` varchar(100) DEFAULT NULL,
  `intl_province` varchar(100) DEFAULT NULL,
  `intl_postal_code` varchar(20) DEFAULT NULL,
  `receiver_id_number` varchar(50) DEFAULT NULL,
  `is_corporate` tinyint(1) DEFAULT 0,
  `company_name` varchar(255) DEFAULT NULL,
  `company_email` varchar(100) DEFAULT NULL,
  `company_tax_code` varchar(50) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `company_bank_info` text DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `package_type` varchar(50) DEFAULT 'other',
  `intl_purpose` varchar(50) DEFAULT NULL,
  `intl_hs_code` varchar(50) DEFAULT NULL,
  `service_type` varchar(50) NOT NULL DEFAULT 'standard',
  `service_condition_key` varchar(50) DEFAULT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `khoang_cach_km` decimal(10,2) DEFAULT 0.00,
  `weight` decimal(10,2) DEFAULT 0.00,
  `cod_amount` decimal(15,2) DEFAULT 0.00,
  `shipping_fee` decimal(15,2) DEFAULT 0.00,
  `pickup_time` datetime DEFAULT NULL,
  `requested_delivery_time` datetime DEFAULT NULL,
  `estimated_delivery` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `service_meta_json` longtext DEFAULT NULL,
  `weather_source` varchar(100) DEFAULT NULL,
  `weather_note` text DEFAULT NULL,
  `pricing_breakdown_json` longtext DEFAULT NULL,
  `booking_payload_json` longtext DEFAULT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cod',
  `payment_status` varchar(50) NOT NULL DEFAULT 'unpaid',
  `shipper_note` text DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `pod_image` varchar(255) DEFAULT NULL,
  `status` enum('pending','shipping','completed','cancelled') DEFAULT 'pending',
  `rating` int(11) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `orders`
--

INSERT INTO `orders` (
  `id`, `order_code`, `client_order_code`, `user_id`, `shipper_id`,
  `pickup_address`, `pickup_lat`, `pickup_lng`, `name`, `phone`,
  `receiver_name`, `receiver_phone`, `delivery_address`, `delivery_lat`, `delivery_lng`,
  `intl_country`, `intl_province`, `intl_postal_code`, `receiver_id_number`,
  `is_corporate`, `company_name`, `company_email`, `company_tax_code`, `company_address`,
  `company_bank_info`, `cancel_reason`, `package_type`, `intl_purpose`, `intl_hs_code`,
  `service_type`, `service_condition_key`, `vehicle_type`, `khoang_cach_km`, `weight`,
  `cod_amount`, `shipping_fee`, `pickup_time`, `requested_delivery_time`, `estimated_delivery`,
  `note`, `service_meta_json`, `weather_source`, `weather_note`, `pricing_breakdown_json`,
  `booking_payload_json`, `payment_method`, `payment_status`, `shipper_note`, `admin_note`,
  `pod_image`, `status`, `rating`, `feedback`, `created_at`
) VALUES
(1, 'DOM-PERS-001', NULL, 3, NULL, '123 Đường Láng, Hà Nội', NULL, NULL, 'Lê Thị Khách', '0911222333', 'Nguyễn Văn Nhận', '0901234567', '456 Phố Huế, Hà Nội', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'clothes', NULL, NULL, 'standard', 'macdinh', NULL, 7.41, 1.50, 500000.00, 22000.00, '2026-03-20 20:00:00', '2026-03-20 22:00:00', '2026-03-20 22:00:00', 'Giao trong giờ hành chính, gọi trước 15p.', NULL, 'fallback', NULL, NULL, NULL, 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, '2026-03-16 12:04:12'),
(2, 'DOM-CORP-002', NULL, 3, NULL, '10 Mai Chí Thọ, Quận 2, TP.HCM', NULL, NULL, 'Lê Thị Khách', '0911222333', 'Kế toán ABC', '0988000111', '20 Hàm Nghi, Quận 1, TP.HCM', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'CÔNG TY TNHH GIẢI PHÁP SỐ', 'billing@solutions.vn', '0312678999', 'Tòa nhà Landmark 81, TP.HCM', NULL, NULL, 'electronic', NULL, NULL, 'express', 'macdinh', 'Xe máy', 5.20, 2.00, 0.00, 50000.00, '2026-03-19 10:00:00', '2026-03-19 14:00:00', '2026-03-19 14:00:00', 'Xuất hóa đơn VAT đầy đủ.', NULL, 'fallback', NULL, NULL, NULL, 'bank_transfer', 'paid', NULL, NULL, NULL, 'shipping', NULL, NULL, '2026-03-16 12:04:12'),
(3, 'INTL-PERS-003', NULL, 3, NULL, NULL, NULL, NULL, 'Lê Thị Khách', '0911222333', 'John Doe', '+1-555-0199', '123 Main St, Los Angeles', NULL, NULL, 'USA', 'California', '90001', 'PP12345678', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'clothes', 'gift', '6104.43', 'intl_express', NULL, NULL, 0.00, 3.00, 0.00, 1500000.00, NULL, NULL, NULL, 'Hàng quà tặng gia đình.', NULL, NULL, NULL, NULL, NULL, 'bank_transfer', 'unpaid', NULL, NULL, NULL, 'shipping', NULL, NULL, '2026-03-16 12:04:12'),
(4, 'DOM-BULK-004', NULL, 3, NULL, 'KCN Sóng Thần, Bình Dương', NULL, NULL, 'Lê Thị Khách', '0911222333', 'Nội Thất Xinh', '0933444555', '789 Trần Hưng Đạo, Quận 5, TP.HCM', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'other', NULL, NULL, 'bulk', 'macdinh', 'Xe tải 500kg', 22.40, 150.00, 0.00, 800000.00, '2026-03-21 08:00:00', '2026-03-21 15:00:00', '2026-03-21 15:00:00', 'Hàng nội thất gỗ, cần xe nâng hỗ trợ.', NULL, 'fallback', NULL, NULL, NULL, 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `weight` decimal(10,2) DEFAULT 0.00,
  `length` decimal(10,2) DEFAULT 0.00,
  `width` decimal(10,2) DEFAULT 0.00,
  `height` decimal(10,2) DEFAULT 0.00,
  `declared_value` decimal(15,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `item_name`, `quantity`, `weight`, `length`, `width`, `height`, `declared_value`, `created_at`) VALUES
(1, 1, 'Áo sơ mi nam', 2, 0.40, 0.00, 0.00, 0.00, 400000.00, '2026-03-16 12:04:12'),
(2, 1, 'Quần tây công sở', 1, 0.70, 0.00, 0.00, 0.00, 300000.00, '2026-03-16 12:04:12'),
(3, 2, 'Ổ cứng SSD 500GB', 2, 0.20, 10.00, 8.00, 1.00, 3000000.00, '2026-03-16 12:04:12'),
(4, 2, 'Chuột không dây Logitech', 1, 0.10, 12.00, 6.00, 4.00, 800000.00, '2026-03-16 12:04:12'),
(5, 3, 'Áo dài truyền thống tơ tằm', 2, 0.60, 0.00, 0.00, 0.00, 5000000.00, '2026-03-16 12:04:12'),
(6, 3, 'Đặc sản hạt điều (Hộp 500g)', 4, 0.50, 0.00, 0.00, 0.00, 1200000.00, '2026-03-16 12:04:12'),
(7, 4, 'Bàn làm việc gỗ sồi', 1, 80.00, 160.00, 80.00, 75.00, 8000000.00, '2026-03-16 12:04:12'),
(8, 4, 'Ghế xoay văn phòng', 2, 35.00, 60.00, 60.00, 110.00, 4000000.00, '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_logs`
--

CREATE TABLE `order_logs` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `order_logs`
--

INSERT INTO `order_logs` (`id`, `order_id`, `user_id`, `old_status`, `new_status`, `note`, `created_at`) VALUES
(1, 1, 1, 'pending', 'shipping', 'Admin đã phân phối đơn cho shipper01', '2026-03-16 12:04:12'),
(2, 3, 2, 'shipping', 'completed', 'Shipper đã giao hàng thành công', '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `subject` varchar(255) NOT NULL DEFAULT 'Tuvan',
  `message` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `note_admin` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES
(1, 'bank_id', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(2, 'bank_name', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(3, 'bank_account_no', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(4, 'bank_account_name', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(5, 'qr_template', 'compact', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(6, 'company_name', 'Giao Hàng Nhanh', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(7, 'company_hotline', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(8, 'company_email', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(9, 'company_address', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(10, 'openweather_api_key', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(11, 'google_sheets_webhook_url', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `saved_addresses`
--

CREATE TABLE `saved_addresses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `fullname` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('customer','admin','shipper') DEFAULT 'customer',
  `vehicle_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `tax_code` varchar(50) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `lock_reason` varchar(255) DEFAULT NULL,
  `is_approved` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `password`, `role`, `vehicle_type`, `created_at`, `email`, `company_name`, `tax_code`, `company_address`, `is_locked`, `lock_reason`, `is_approved`) VALUES
(1, 'admin', 'Quản trị viên Hệ thống', '0901234567', '$2y$10$s14x7W47E5mTTsy9iW0IV.B85UolJ.Qc/zmMhXG07TeuojjCF3xNS', 'admin', NULL, '2026-03-16 12:04:12', NULL, 'CÔNG TY TNHH KERI TEST', '0312345678', '789 Cong Hoa, Tan Binh, TP.HCM', 0, NULL, 1),
(2, 'shipper01', 'Nguyễn Văn Giao', '0988777666', '$2y$10$s14x7W47E5mTTsy9iW0IV.B85UolJ.Qc/zmMhXG07TeuojjCF3xNS', 'shipper', NULL, '2026-03-16 12:04:12', NULL, NULL, NULL, NULL, 0, NULL, 1),
(3, 'khachhang01', 'Lê Thị Khách', '0911222333', '$2y$10$s14x7W47E5mTTsy9iW0IV.B85UolJ.Qc/zmMhXG07TeuojjCF3xNS', 'customer', NULL, '2026-03-16 12:04:12', NULL, NULL, NULL, NULL, 0, NULL, 1);

--
-- Chỉ mục cho các bảng đã đổ
--

ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_code` (`order_code`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `shipper_id` (`shipper_id`);

ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

ALTER TABLE `order_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `order_id` (`order_id`);

ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `status` (`status`);

ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

ALTER TABLE `saved_addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

ALTER TABLE `order_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `contact_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

ALTER TABLE `saved_addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
