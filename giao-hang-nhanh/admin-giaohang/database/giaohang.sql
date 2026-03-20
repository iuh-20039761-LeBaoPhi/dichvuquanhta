-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th3 17, 2026 lúc 04:26 AM
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
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `receiver_name` varchar(100) NOT NULL,
  `receiver_phone` varchar(20) NOT NULL,
  `delivery_address` text NOT NULL,
  `is_corporate` tinyint(1) DEFAULT 0,
  `company_name` varchar(255) DEFAULT NULL,
  `company_email` varchar(100) DEFAULT NULL,
  `company_tax_code` varchar(50) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `company_bank_info` text DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `package_type` varchar(50) DEFAULT 'other',
  `service_type` varchar(50) NOT NULL DEFAULT 'standard',
  `vehicle_type` varchar(50) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT 0.00,
  `cod_amount` decimal(15,2) DEFAULT 0.00,
  `shipping_fee` decimal(15,2) DEFAULT 0.00,
  `pickup_time` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `service_meta_json` longtext DEFAULT NULL,
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
  `intl_country` varchar(100) DEFAULT NULL,
  `intl_province` varchar(100) DEFAULT NULL,
  `intl_postal_code` varchar(20) DEFAULT NULL,
  `receiver_id_number` varchar(50) DEFAULT NULL,
  `intl_purpose` varchar(50) DEFAULT NULL,
  `intl_hs_code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Đang đổ dữ liệu cho bảng `orders`
--

INSERT INTO `orders` (`id`, `order_code`, `client_order_code`, `user_id`, `shipper_id`, `pickup_address`, `name`, `phone`, `receiver_name`, `receiver_phone`, `delivery_address`, `is_corporate`, `company_name`, `company_email`, `company_tax_code`, `company_address`, `company_bank_info`, `cancel_reason`, `package_type`, `service_type`, `vehicle_type`, `weight`, `cod_amount`, `shipping_fee`, `pickup_time`, `note`, `payment_method`, `payment_status`, `shipper_note`, `admin_note`, `pod_image`, `status`, `rating`, `feedback`, `created_at`) VALUES
INSERT INTO `orders` (`id`, `order_code`, `client_order_code`, `user_id`, `shipper_id`, `pickup_address`, `name`, `phone`, `receiver_name`, `receiver_phone`, `delivery_address`, `is_corporate`, `company_name`, `company_email`, `company_tax_code`, `company_address`, `company_bank_info`, `cancel_reason`, `package_type`, `service_type`, `vehicle_type`, `weight`, `cod_amount`, `shipping_fee`, `pickup_time`, `note`, `payment_method`, `payment_status`, `shipper_note`, `admin_note`, `pod_image`, `status`, `rating`, `feedback`, `intl_country`, `intl_province`, `intl_postal_code`, `receiver_id_number`, `intl_purpose`, `intl_hs_code`, `created_at`) VALUES
(1, 'DOM-PERS-001', NULL, 3, NULL, '123 Đường Láng, Hà Nội', 'Lê Thị Khách', '0911222333', 'Nguyễn Văn Nhận', '0901234567', '456 Phố Huế, Hà Nội', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'clothes', 'standard', NULL, 1.50, 500000.00, 22000.00, NULL, 'Giao trong giờ hành chính, gọi trước 15p.', 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW()),
(2, 'DOM-CORP-002', NULL, 3, NULL, '10 Mai Chí Thọ, Quận 2, TP.HCM', 'Lê Thị Khách', '0911222333', 'Kế toán ABC', '0988000111', '20 Hàm Nghi, Quận 1, TP.HCM', 1, 'CÔNG TY TNHH GIẢI PHÁP SỐ', 'billing@solutions.vn', '0312678999', 'Tòa nhà Landmark 81, TP.HCM', NULL, NULL, 'electronic', 'express', 'Xe máy', 2.00, 0.00, 50000.00, NULL, 'Xuất hóa đơn VAT đầy đủ.', 'cod', 'unpaid', NULL, NULL, NULL, 'shipping', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW()),
(3, 'INTL-PERS-003', NULL, 3, NULL, NULL, 'Lê Thị Khách', '0911222333', 'John Doe', '+1-555-0199', '123 Main St, Los Angeles', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'clothes', 'intl_express', NULL, 3.00, 0.00, 1500000.00, NULL, 'Hàng quà tặng gia đình.', 'bank_transfer', 'unpaid', NULL, NULL, NULL, 'shipping', NULL, NULL, 'USA', 'California', '90001', 'PP12345678', 'gift', '6104.43', NOW()),
(4, 'DOM-BULK-004', NULL, 3, NULL, 'KCN Sóng Thần, Bình Dương', 'Lê Thị Khách', '0911222333', 'Nội Thất Xinh', '0933444555', '789 Trần Hưng Đạo, Quận 5, TP.HCM', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'other', 'bulk', 'Xe tải 500kg', 150.00, 0.00, 800000.00, NULL, 'Hàng nội thất gỗ, cần xe nâng hỗ trợ.', 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW());

--
-- Đang đổ dữ liệu cho bảng `order_items`
--

INSERT INTO `order_items` (`order_id`, `item_name`, `quantity`, `weight`, `length`, `width`, `height`, `declared_value`) VALUES
(1, 'Áo sơ mi nam', 2, 0.40, 0.00, 0.00, 0.00, 400000.00),
(1, 'Quần tây công sở', 1, 0.70, 0.00, 0.00, 0.00, 300000.00),
(2, 'Ổ cứng SSD 500GB', 2, 0.20, 10.00, 8.00, 1.00, 3000000.00),
(2, 'Chuột không dây Logitech', 1, 0.10, 12.00, 6.00, 4.00, 800000.00),
(3, 'Áo dài truyền thống tơ tằm', 2, 0.60, 0.00, 0.00, 0.00, 5000000.00),
(3, 'Đặc sản hạt điều (Hộp 500g)', 4, 0.50, 0.00, 0.00, 0.00, 1200000.00),
(4, 'Bàn làm việc gỗ sồi', 1, 80.00, 160.00, 80.00, 75.00, 8000000.00),
(4, 'Ghế xoay văn phòng', 2, 35.00, 60.00, 60.00, 110.00, 4000000.00);

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

--
-- Chỉ mục cho bảng `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_code` (`order_code`);

--
-- Chỉ mục cho bảng `order_logs`
--
ALTER TABLE `order_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Chỉ mục cho bảng `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Chỉ mục cho bảng `saved_addresses`
--
ALTER TABLE `saved_addresses`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `order_logs`
--
ALTER TABLE `order_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `saved_addresses`
--
ALTER TABLE `saved_addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
