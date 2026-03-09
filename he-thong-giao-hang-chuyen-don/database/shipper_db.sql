-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th2 02, 2026 lúc 11:14 AM
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
-- Cơ sở dữ liệu: `shipper_db`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `status` tinyint(4) DEFAULT 0,
  `note_admin` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `faqs`
--

CREATE TABLE `faqs` (
  `id` int(11) NOT NULL,
  `question` varchar(255) NOT NULL,
  `answer` text NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `faqs`
--

INSERT INTO `faqs` (`id`, `question`, `answer`, `display_order`, `created_at`) VALUES
(1, 'FastGo giao hàng trong bao lâu?', 'Thời gian giao hàng nội thành: 30–60 phút, liên tỉnh: 1–3 ngày.', 1, '2026-02-02 02:39:12'),
(2, 'Có thể hủy hoặc thay đổi đơn không?', 'Vui lòng liên hệ hotline trước khi đơn được shipper nhận.', 2, '2026-02-02 02:39:12'),
(3, 'FastGo có thu hộ COD không?', 'Có, chúng tôi hỗ trợ dịch vụ thu hộ tiền mặt minh bạch.', 3, '2026-02-02 02:39:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'ID của người nhận thông báo',
  `order_id` int(11) DEFAULT NULL,
  `message` varchar(255) NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_code` varchar(20) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `shipper_id` int(11) DEFAULT NULL,
  `pickup_address` text DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `receiver_name` varchar(100) NOT NULL,
  `receiver_phone` varchar(20) NOT NULL,
  `delivery_address` text NOT NULL,
  `is_corporate` tinyint(1) DEFAULT 0 COMMENT '0: Cá nhân, 1: Công ty',
  `company_name` varchar(255) DEFAULT NULL,
  `company_email` varchar(100) DEFAULT NULL,
  `company_tax_code` varchar(50) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `company_bank_info` text DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `package_type` varchar(50) DEFAULT 'other',
  `service_type` varchar(50) NOT NULL DEFAULT 'standard',
  `weight` decimal(10,2) DEFAULT 0.00,
  `cod_amount` decimal(15,2) DEFAULT 0.00,
  `shipping_fee` decimal(15,2) DEFAULT 0.00,
  `pickup_time` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cod' COMMENT 'Phương thức thanh toán (cod, bank_transfer)',
  `payment_status` varchar(50) NOT NULL DEFAULT 'unpaid' COMMENT 'Trạng thái thanh toán (unpaid, paid)',
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

INSERT INTO `orders` (`id`, `order_code`, `user_id`, `shipper_id`, `pickup_address`, `name`, `phone`, `receiver_name`, `receiver_phone`, `delivery_address`, `is_corporate`, `company_name`, `company_email`, `company_tax_code`, `company_address`, `company_bank_info`, `cancel_reason`, `package_type`, `service_type`, `weight`, `cod_amount`, `shipping_fee`, `pickup_time`, `note`, `payment_method`, `payment_status`, `shipper_note`, `admin_note`, `pod_image`, `status`, `rating`, `feedback`, `created_at`) VALUES
(1, 'FAST-000001', 2, NULL, '123 Lê Lợi Quận 1', 'Nguyễn Văn A', '0987654321', '', '', '45 Nguyễn Huệ Quận 1', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'document', 'standard', 1.00, 0.00, 30000.00, '0000-00-00 00:00:00', '', 'cod', 'unpaid', NULL, NULL, NULL, 'cancelled', NULL, NULL, '2026-01-22 13:44:23'),
(2, 'FAST-BB02CD', 2, 3, '123 Lê Lợi Quận 1', 'Nguyễn Văn A', '0987654321', 'Nguyễn Văn B', '0987654322', '45 Nguyễn Huệ Quận 1', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'document', 'standard', 1.00, 0.00, 30000.00, '0000-00-00 00:00:00', '', 'cod', 'paid', NULL, NULL, NULL, 'completed', NULL, NULL, '2026-01-22 16:31:32'),
(3, 'FAST-9B0EC1', 2, 3, '123 Lê Lợi Quận 1', 'Nguyễn Văn A', '0987654321', 'Nguyễn Văn B', '0987654322', '45 Nguyễn Huệ Quận 1', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'document', 'standard', 2.00, 25000.00, 30000.00, '0000-00-00 00:00:00', '', 'cod', 'unpaid', '', NULL, NULL, 'cancelled', NULL, NULL, '2026-01-23 00:42:34'),
(4, 'FAST-0287AE', 2, 3, '123 Lê Lợi Quận 1', 'Nguyễn Văn A', '0987654321', 'Nguyễn Văn B', '0987654322', '45 Nguyễn Huệ Quận 12', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'document', 'standard', 2.00, 0.00, 45000.00, '0000-00-00 00:00:00', '', 'cod', 'paid', '', NULL, NULL, 'completed', NULL, NULL, '2026-01-23 01:38:20'),
(5, 'TEST-RATE-01', NULL, NULL, '123 Lê Lợi, Quận 1', 'Nguyễn Văn A', '0901234567', 'Trần Thị B', '0909876543', '456 Nguyễn Huệ, Quận 1', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'document', 'standard', 1.00, 0.00, 30000.00, NULL, NULL, 'cod', 'unpaid', NULL, NULL, NULL, 'completed', 5, 'Dịch vụ rất tốt, giao hàng siêu nhanh!', '2026-01-28 07:07:14'),
(6, 'TEST-RATE-02', NULL, 3, '789 Võ Văn Kiệt, Quận 5', 'Phạm Văn C', '0912345678', 'Lê Thị D', '0918765432', '101 Pasteur, Quận 3', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'food', 'express', 2.50, 50000.00, 45000.00, NULL, NULL, 'cod', 'unpaid', NULL, NULL, NULL, 'completed', 4, 'Shipper thân thiện, đồ ăn vẫn còn nóng hổi.', '2026-01-28 07:07:14'),
(7, 'FAST-D76F57', 2, NULL, '123 Lê Lợi Quận 1', 'Nguyễn Văn A', '0987654321', 'Nguyễn Văn B', '0987654322', '45 Nguyễn Huệ Quận 12', 1, 'CONG TY THU NGHIEM PHAN MEM', 'test-api@gmail.com', '0100109106', '123 Đường Cách Mạng Tháng 8, Quận 1, TP.HCM', 'TK: 123456789 - Vietcombank', NULL, 'document', 'standard', 1.00, 0.00, 30000.00, '0000-00-00 00:00:00', '', 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, '2026-02-02 07:04:10'),
(8, 'FAST-100AED', 2, NULL, '123 Lê Lợi Quận 1', 'Nguyễn Văn A', '0987654321', 'Nguyễn Văn B', '0987654322', '45 Nguyễn Huệ Quận 12', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'document', 'standard', 1.00, 0.00, 30000.00, '0000-00-00 00:00:00', '', 'bank_transfer', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, '2026-02-02 08:31:22');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_logs`
--

CREATE TABLE `order_logs` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `old_status` varchar(50) NOT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `order_logs`
--

INSERT INTO `order_logs` (`id`, `order_id`, `user_id`, `old_status`, `new_status`, `changed_at`) VALUES
(1, 3, 1, 'pending', 'shipping', '2026-01-23 00:44:17'),
(2, 3, 3, 'unknown', 'cancelled', '2026-01-23 01:11:19'),
(3, 4, 3, 'unknown', 'shipping', '2026-01-23 04:37:07'),
(4, 4, 3, 'unknown', 'completed', '2026-01-23 05:10:19');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `saved_addresses`
--

CREATE TABLE `saved_addresses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL COMMENT 'Tên gợi nhớ (VD: Nhà riêng, Văn phòng)',
  `phone` varchar(20) NOT NULL,
  `address` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type_key` varchar(50) NOT NULL,
  `base_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `services`
--

INSERT INTO `services` (`id`, `name`, `type_key`, `base_price`, `description`, `created_at`) VALUES
(1, 'Giao tiêu chuẩn', 'standard', 30000.00, 'Giao hàng tiêu chuẩn trong nội thành', '2026-01-22 17:28:10'),
(2, 'Giao hỏa tốc', 'express', 50000.00, 'Giao hàng nhanh trong 2h', '2026-01-22 17:28:10'),
(3, 'Giao hàng số lượng lớn', 'bulk', 0.00, 'Liên hệ để có giá tốt nhất', '2026-01-22 17:28:10');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_at`) VALUES
(1, 'bank_id', 'MB', 'Mã ngân hàng (VD: MB, VCB, ACB)', '2026-02-02 10:11:57'),
(2, 'bank_name', 'MB Bank (Quân đội)', 'Tên ngân hàng đầy đủ', '2026-02-02 10:11:57'),
(3, 'bank_account_no', '0333666999', 'Số tài khoản ngân hàng', '2026-02-02 10:11:57'),
(4, 'bank_account_name', 'FASTGO LOGISTICS', 'Tên chủ tài khoản', '2026-02-02 10:11:57'),
(5, 'qr_template', 'compact', 'Mẫu QR Code (compact, print, qr_only)', '2026-02-02 10:11:57'),
(6, 'company_name', 'FastGo Logistics', 'Tên công ty', '2026-02-02 10:11:57'),
(7, 'company_hotline', '0123 456 789', 'Hotline hỗ trợ', '2026-02-02 10:11:57'),
(8, 'company_email', 'contact@fastgo.vn', 'Email liên hệ', '2026-02-02 10:11:57'),
(9, 'company_address', 'TP. Hồ Chí Minh', 'Địa chỉ công ty', '2026-02-02 10:11:57');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `testimonials`
--

CREATE TABLE `testimonials` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_role` varchar(100) DEFAULT 'Khách hàng',
  `rating` tinyint(4) DEFAULT 5,
  `content` text NOT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1: Visible, 0: Hidden',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `testimonials`
--

INSERT INTO `testimonials` (`id`, `customer_name`, `customer_role`, `rating`, `content`, `is_visible`, `created_at`) VALUES
(1, 'Nguyễn Thu Hà', 'Shop Online', 5, 'Giao hàng siêu nhanh, shipper thân thiện. Mình gửi hàng từ Q1 sang Thủ Đức mà chưa đầy 1 tiếng đã nhận được.', 1, '2026-01-28 06:55:38'),
(2, 'Trần Minh Tuấn', 'Văn phòng phẩm', 5, 'Hệ thống tracking rất tiện lợi, mình có thể theo dõi đơn hàng từng phút. Rất yên tâm khi sử dụng dịch vụ.', 1, '2026-01-28 06:55:38'),
(3, 'Lê Bảo Ngọc', 'Cửa hàng thời trang', 4, 'Giá cước hợp lý, có thu hộ COD nhanh chóng. Sẽ ủng hộ FastGo dài dài.', 1, '2026-01-28 06:55:38');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `tax_code` varchar(50) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0: Hoạt động, 1: Bị khóa',
  `lock_reason` varchar(255) DEFAULT NULL,
  `is_approved` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `password`, `role`, `created_at`, `email`, `company_name`, `tax_code`, `company_address`, `is_locked`, `lock_reason`, `is_approved`) VALUES
(1, 'admin', NULL, NULL, '$2y$10$GXB0ZfzHjcDOR8oa5XSEv.G2nQiN6.O2ZZo/leShPqqKTd4LoKw/a', 'admin', '2026-01-22 13:37:41', '', NULL, NULL, NULL, 0, NULL, 1),
(2, 'Anguyen', 'Nguyễn Văn A', '0987654321', '$2y$10$UP.X471ZkmUjBMASEoR/yuH9Ug4DTXCuC.8YksMl52mHqqgZGdHDq', 'customer', '2026-01-22 13:38:42', 'nguyenvana@gmail.com', 'CONG TY THU NGHIEM PHAN MEM', '0100109106', '123 Đường Cách Mạng Tháng 8, Quận 1, TP.HCM', 0, NULL, 1),
(3, 'Thien', 'Thiện Bảo', '0987654332', '$2y$10$jyiF4rZilRjMX.X8JVQIzORG36ab7o9exKM3.yzmOsTs18pBVLm4O', 'shipper', '2026-01-22 17:48:43', 'thienbao@gmail.com', NULL, NULL, NULL, 0, NULL, 1);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `faqs`
--
ALTER TABLE `faqs`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orders_users` (`user_id`),
  ADD KEY `order_code` (`order_code`),
  ADD KEY `fk_orders_shipper` (`shipper_id`);

--
-- Chỉ mục cho bảng `order_logs`
--
ALTER TABLE `order_logs`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `saved_addresses`
--
ALTER TABLE `saved_addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_saved_addr_users` (`user_id`);

--
-- Chỉ mục cho bảng `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_key` (`type_key`);

--
-- Chỉ mục cho bảng `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Chỉ mục cho bảng `testimonials`
--
ALTER TABLE `testimonials`
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
-- AUTO_INCREMENT cho bảng `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `faqs`
--
ALTER TABLE `faqs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `order_logs`
--
ALTER TABLE `order_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `saved_addresses`
--
ALTER TABLE `saved_addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `testimonials`
--
ALTER TABLE `testimonials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_shipper` FOREIGN KEY (`shipper_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `saved_addresses`
--
ALTER TABLE `saved_addresses`
  ADD CONSTRAINT `fk_saved_addr_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
