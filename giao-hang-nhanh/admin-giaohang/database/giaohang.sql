-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th3 30, 2026 lúc 12:11 PM
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
-- Cấu trúc bảng cho bảng `cai_dat_he_thong`
--

CREATE TABLE `cai_dat_he_thong` (
  `id` int(11) NOT NULL,
  `khoa_cai_dat` varchar(100) NOT NULL,
  `gia_tri_cai_dat` text DEFAULT NULL,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp(),
  `cap_nhat_luc` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `cai_dat_he_thong`
--

INSERT INTO `cai_dat_he_thong` (`id`, `khoa_cai_dat`, `gia_tri_cai_dat`, `tao_luc`, `cap_nhat_luc`) VALUES
(1, 'bank_id', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(2, 'bank_name', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(3, 'bank_account_no', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(4, 'bank_account_name', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(5, 'qr_template', 'compact', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(6, 'company_name', 'Giao Hàng Nhanh', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(7, 'company_hotline', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(8, 'company_email', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(9, 'company_address', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12'),
(11, 'google_sheets_webhook_url', '', '2026-03-16 12:04:12', '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `dia_chi_da_luu`
--

CREATE TABLE `dia_chi_da_luu` (
  `id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) NOT NULL,
  `ten_goi_nho` varchar(100) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `dia_chi` text NOT NULL,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `don_hang`
--

CREATE TABLE `don_hang` (
  `id` int(11) NOT NULL,
  `ma_don_hang` varchar(20) NOT NULL,
  `ma_don_hang_khach` varchar(100) DEFAULT NULL,
  `nguoi_dung_id` int(11) DEFAULT NULL,
  `shipper_id` int(11) DEFAULT NULL,
  `dia_chi_lay_hang` text DEFAULT NULL,
  `vi_do_lay_hang` decimal(10,8) DEFAULT NULL,
  `kinh_do_lay_hang` decimal(11,8) DEFAULT NULL,
  `ten_nguoi_gui` varchar(100) NOT NULL,
  `so_dien_thoai_nguoi_gui` varchar(20) DEFAULT NULL,
  `ten_nguoi_nhan` varchar(100) NOT NULL,
  `so_dien_thoai_nguoi_nhan` varchar(20) NOT NULL,
  `dia_chi_giao_hang` text NOT NULL,
  `vi_do_giao_hang` decimal(10,8) DEFAULT NULL,
  `kinh_do_giao_hang` decimal(11,8) DEFAULT NULL,
  `quoc_gia_quoc_te` varchar(100) DEFAULT NULL,
  `tinh_bang_quoc_te` varchar(100) DEFAULT NULL,
  `ma_buu_chinh_quoc_te` varchar(20) DEFAULT NULL,
  `so_giay_to_nguoi_nhan` varchar(50) DEFAULT NULL,
  `la_doanh_nghiep` tinyint(1) DEFAULT 0,
  `ten_cong_ty` varchar(255) DEFAULT NULL,
  `email_cong_ty` varchar(100) DEFAULT NULL,
  `ma_so_thue_cong_ty` varchar(50) DEFAULT NULL,
  `dia_chi_cong_ty` text DEFAULT NULL,
  `thong_tin_ngan_hang_cong_ty` text DEFAULT NULL,
  `ly_do_huy` text DEFAULT NULL,
  `loai_goi_hang` varchar(50) DEFAULT 'other',
  `muc_dich_quoc_te` varchar(50) DEFAULT NULL,
  `ma_hs_quoc_te` varchar(50) DEFAULT NULL,
  `loai_dich_vu` varchar(50) NOT NULL DEFAULT 'standard',
  `ma_dieu_kien_dich_vu` varchar(50) DEFAULT NULL,
  `loai_phuong_tien` varchar(50) DEFAULT NULL,
  `khoang_cach_km` decimal(10,2) DEFAULT 0.00,
  `tong_can_nang` decimal(10,2) DEFAULT 0.00,
  `so_tien_cod` decimal(15,2) DEFAULT 0.00,
  `phi_van_chuyen` decimal(15,2) DEFAULT 0.00,
  `thoi_gian_lay_hang` datetime DEFAULT NULL,
  `thoi_gian_giao_hang_yeu_cau` datetime DEFAULT NULL,
  `thoi_gian_giao_hang_du_kien` datetime DEFAULT NULL,
  `ghi_chu` text DEFAULT NULL,
  `du_lieu_dich_vu_json` longtext DEFAULT NULL,
  `nguon_thoi_tiet` varchar(100) DEFAULT NULL,
  `ghi_chu_thoi_tiet` text DEFAULT NULL,
  `chi_tiet_gia_json` longtext DEFAULT NULL,
  `du_lieu_dat_lich_json` longtext DEFAULT NULL,
  `phuong_thuc_thanh_toan` varchar(50) NOT NULL DEFAULT 'cod',
  `trang_thai_thanh_toan` varchar(50) NOT NULL DEFAULT 'unpaid',
  `ghi_chu_shipper` text DEFAULT NULL,
  `ghi_chu_quan_tri` text DEFAULT NULL,
  `anh_xac_nhan_giao_hang` varchar(255) DEFAULT NULL,
  `trang_thai` enum('pending','shipping','completed','cancelled') DEFAULT 'pending',
  `danh_gia_so_sao` int(11) DEFAULT NULL,
  `phan_hoi` text DEFAULT NULL,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `don_hang`
--

INSERT INTO `don_hang` (`id`, `ma_don_hang`, `ma_don_hang_khach`, `nguoi_dung_id`, `shipper_id`, `dia_chi_lay_hang`, `vi_do_lay_hang`, `kinh_do_lay_hang`, `ten_nguoi_gui`, `so_dien_thoai_nguoi_gui`, `ten_nguoi_nhan`, `so_dien_thoai_nguoi_nhan`, `dia_chi_giao_hang`, `vi_do_giao_hang`, `kinh_do_giao_hang`, `quoc_gia_quoc_te`, `tinh_bang_quoc_te`, `ma_buu_chinh_quoc_te`, `so_giay_to_nguoi_nhan`, `la_doanh_nghiep`, `ten_cong_ty`, `email_cong_ty`, `ma_so_thue_cong_ty`, `dia_chi_cong_ty`, `thong_tin_ngan_hang_cong_ty`, `ly_do_huy`, `loai_goi_hang`, `muc_dich_quoc_te`, `ma_hs_quoc_te`, `loai_dich_vu`, `ma_dieu_kien_dich_vu`, `loai_phuong_tien`, `khoang_cach_km`, `tong_can_nang`, `so_tien_cod`, `phi_van_chuyen`, `thoi_gian_lay_hang`, `thoi_gian_giao_hang_yeu_cau`, `thoi_gian_giao_hang_du_kien`, `ghi_chu`, `du_lieu_dich_vu_json`, `nguon_thoi_tiet`, `ghi_chu_thoi_tiet`, `chi_tiet_gia_json`, `du_lieu_dat_lich_json`, `phuong_thuc_thanh_toan`, `trang_thai_thanh_toan`, `ghi_chu_shipper`, `ghi_chu_quan_tri`, `anh_xac_nhan_giao_hang`, `trang_thai`, `danh_gia_so_sao`, `phan_hoi`, `tao_luc`) VALUES
(1, 'DOM-PERS-001', NULL, 3, NULL, '123 Đường Láng, Hà Nội', NULL, NULL, 'Lê Thị Khách', '0911222333', 'Nguyễn Văn Nhận', '0901234567', '456 Phố Huế, Hà Nội', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'clothes', NULL, NULL, 'standard', 'macdinh', NULL, 7.41, 1.50, 500000.00, 22000.00, '2026-03-20 20:00:00', '2026-03-20 22:00:00', '2026-03-20 22:00:00', 'Giao trong giờ hành chính, gọi trước 15p.', NULL, 'fallback', NULL, NULL, NULL, 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, '2026-03-16 12:04:12'),
(2, 'DOM-CORP-002', NULL, 3, NULL, '10 Mai Chí Thọ, Quận 2, TP.HCM', NULL, NULL, 'Lê Thị Khách', '0911222333', 'Kế toán ABC', '0988000111', '20 Hàm Nghi, Quận 1, TP.HCM', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'CÔNG TY TNHH GIẢI PHÁP SỐ', 'billing@solutions.vn', '0312678999', 'Tòa nhà Landmark 81, TP.HCM', NULL, NULL, 'electronic', NULL, NULL, 'express', 'macdinh', 'Xe máy', 5.20, 2.00, 0.00, 50000.00, '2026-03-19 10:00:00', '2026-03-19 14:00:00', '2026-03-19 14:00:00', 'Xuất hóa đơn VAT đầy đủ.', NULL, 'fallback', NULL, NULL, NULL, 'bank_transfer', 'paid', NULL, NULL, NULL, 'shipping', NULL, NULL, '2026-03-16 12:04:12'),
(3, 'INTL-PERS-003', NULL, 3, NULL, NULL, NULL, NULL, 'Lê Thị Khách', '0911222333', 'John Doe', '+1-555-0199', '123 Main St, Los Angeles', NULL, NULL, 'USA', 'California', '90001', 'PP12345678', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'clothes', 'gift', '6104.43', 'intl_express', NULL, NULL, 0.00, 3.00, 0.00, 1500000.00, NULL, NULL, NULL, 'Hàng quà tặng gia đình.', NULL, NULL, NULL, NULL, NULL, 'bank_transfer', 'unpaid', NULL, NULL, NULL, 'shipping', NULL, NULL, '2026-03-16 12:04:12'),
(4, 'DOM-BULK-004', NULL, 3, NULL, 'KCN Sóng Thần, Bình Dương', NULL, NULL, 'Lê Thị Khách', '0911222333', 'Nội Thất Xinh', '0933444555', '789 Trần Hưng Đạo, Quận 5, TP.HCM', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'other', NULL, NULL, 'bulk', 'macdinh', 'Xe tải 500kg', 22.40, 150.00, 0.00, 800000.00, '2026-03-21 08:00:00', '2026-03-21 15:00:00', '2026-03-21 15:00:00', 'Hàng nội thất gỗ, cần xe nâng hỗ trợ.', NULL, 'fallback', NULL, NULL, NULL, 'cod', 'unpaid', NULL, NULL, NULL, 'pending', NULL, NULL, '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `don_hang_mat_hang`
--

CREATE TABLE `don_hang_mat_hang` (
  `id` int(11) NOT NULL,
  `don_hang_id` int(11) NOT NULL,
  `ten_mat_hang` varchar(255) NOT NULL,
  `so_luong` int(11) NOT NULL DEFAULT 1,
  `can_nang` decimal(10,2) DEFAULT 0.00,
  `chieu_dai` decimal(10,2) DEFAULT 0.00,
  `chieu_rong` decimal(10,2) DEFAULT 0.00,
  `chieu_cao` decimal(10,2) DEFAULT 0.00,
  `gia_tri_khai_bao` decimal(15,2) DEFAULT 0.00,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `don_hang_mat_hang`
--

INSERT INTO `don_hang_mat_hang` (`id`, `don_hang_id`, `ten_mat_hang`, `so_luong`, `can_nang`, `chieu_dai`, `chieu_rong`, `chieu_cao`, `gia_tri_khai_bao`, `tao_luc`) VALUES
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
-- Cấu trúc bảng cho bảng `lien_he`
--

CREATE TABLE `lien_he` (
  `id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) DEFAULT NULL,
  `ho_ten` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `chu_de` varchar(255) NOT NULL DEFAULT 'Tuvan',
  `noi_dung` text NOT NULL,
  `dia_chi_ip` varchar(45) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 0,
  `ghi_chu_quan_tri` text DEFAULT NULL,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nguoi_dung`
--

CREATE TABLE `nguoi_dung` (
  `id` int(11) NOT NULL,
  `ten_dang_nhap` varchar(50) NOT NULL,
  `ho_ten` varchar(100) DEFAULT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `mat_khau` varchar(255) NOT NULL,
  `vai_tro` enum('customer','admin','shipper') DEFAULT 'customer',
  `loai_phuong_tien` varchar(50) DEFAULT NULL,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `so_cccd` varchar(30) DEFAULT NULL,
  `anh_cccd_mat_truoc` varchar(255) DEFAULT NULL,
  `anh_cccd_mat_sau` varchar(255) DEFAULT NULL,
  `anh_dai_dien` varchar(255) DEFAULT NULL,
  `shipper_dong_y_dieu_khoan` tinyint(1) NOT NULL DEFAULT 0,
  `shipper_dong_y_dieu_khoan_luc` datetime DEFAULT NULL,
  `ten_cong_ty` varchar(255) DEFAULT NULL,
  `ma_so_thue` varchar(50) DEFAULT NULL,
  `dia_chi_cong_ty` text DEFAULT NULL,
  `bi_khoa` tinyint(1) NOT NULL DEFAULT 0,
  `ly_do_khoa` varchar(255) DEFAULT NULL,
  `da_duyet` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `nguoi_dung`
--

INSERT INTO `nguoi_dung` (`id`, `ten_dang_nhap`, `ho_ten`, `so_dien_thoai`, `mat_khau`, `vai_tro`, `loai_phuong_tien`, `tao_luc`, `email`, `so_cccd`, `anh_cccd_mat_truoc`, `anh_cccd_mat_sau`, `anh_dai_dien`, `shipper_dong_y_dieu_khoan`, `shipper_dong_y_dieu_khoan_luc`, `ten_cong_ty`, `ma_so_thue`, `dia_chi_cong_ty`, `bi_khoa`, `ly_do_khoa`, `da_duyet`) VALUES
(1, 'admin', 'Quản trị viên Hệ thống', '0901234567', '$2y$10$s14x7W47E5mTTsy9iW0IV.B85UolJ.Qc/zmMhXG07TeuojjCF3xNS', 'admin', NULL, '2026-03-16 12:04:12', NULL, NULL, NULL, NULL, NULL, 0, NULL, 'CÔNG TY TNHH KERI TEST', '0312345678', '789 Cong Hoa, Tan Binh, TP.HCM', 0, NULL, 1),
(2, 'shipper01', 'Nguyễn Văn Giao', '0988777666', '$2y$10$s14x7W47E5mTTsy9iW0IV.B85UolJ.Qc/zmMhXG07TeuojjCF3xNS', 'shipper', NULL, '2026-03-16 12:04:12', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 1),
(3, 'khachhang01', 'Lê Thị Khách', '0911222333', '$2y$10$s14x7W47E5mTTsy9iW0IV.B85UolJ.Qc/zmMhXG07TeuojjCF3xNS', 'customer', NULL, '2026-03-16 12:04:12', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nhat_ky_don_hang`
--

CREATE TABLE `nhat_ky_don_hang` (
  `id` int(11) NOT NULL,
  `don_hang_id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) DEFAULT NULL,
  `trang_thai_cu` varchar(50) DEFAULT NULL,
  `trang_thai_moi` varchar(50) DEFAULT NULL,
  `ghi_chu` text DEFAULT NULL,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `nhat_ky_don_hang`
--

INSERT INTO `nhat_ky_don_hang` (`id`, `don_hang_id`, `nguoi_dung_id`, `trang_thai_cu`, `trang_thai_moi`, `ghi_chu`, `tao_luc`) VALUES
(1, 1, 1, 'pending', 'shipping', 'Admin đã phân phối đơn cho shipper01', '2026-03-16 12:04:12'),
(2, 3, 2, 'shipping', 'completed', 'Shipper đã giao hàng thành công', '2026-03-16 12:04:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thong_bao`
--

CREATE TABLE `thong_bao` (
  `id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) NOT NULL,
  `don_hang_id` int(11) DEFAULT NULL,
  `noi_dung` text NOT NULL,
  `duong_dan` varchar(255) DEFAULT NULL,
  `da_doc` tinyint(1) NOT NULL DEFAULT 0,
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `cai_dat_he_thong`
--
ALTER TABLE `cai_dat_he_thong`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `khoa_cai_dat` (`khoa_cai_dat`);

--
-- Chỉ mục cho bảng `dia_chi_da_luu`
--
ALTER TABLE `dia_chi_da_luu`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nguoi_dung_id` (`nguoi_dung_id`);

--
-- Chỉ mục cho bảng `don_hang`
--
ALTER TABLE `don_hang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ma_don_hang` (`ma_don_hang`),
  ADD KEY `nguoi_dung_id` (`nguoi_dung_id`),
  ADD KEY `shipper_id` (`shipper_id`);

--
-- Chỉ mục cho bảng `don_hang_mat_hang`
--
ALTER TABLE `don_hang_mat_hang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `don_hang_id` (`don_hang_id`);

--
-- Chỉ mục cho bảng `lien_he`
--
ALTER TABLE `lien_he`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nguoi_dung_id` (`nguoi_dung_id`),
  ADD KEY `trang_thai` (`trang_thai`);

--
-- Chỉ mục cho bảng `nguoi_dung`
--
ALTER TABLE `nguoi_dung`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ten_dang_nhap` (`ten_dang_nhap`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `so_dien_thoai` (`so_dien_thoai`);

--
-- Chỉ mục cho bảng `nhat_ky_don_hang`
--
ALTER TABLE `nhat_ky_don_hang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `don_hang_id` (`don_hang_id`),
  ADD KEY `nguoi_dung_id` (`nguoi_dung_id`);

--
-- Chỉ mục cho bảng `thong_bao`
--
ALTER TABLE `thong_bao`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nguoi_dung_id` (`nguoi_dung_id`),
  ADD KEY `don_hang_id` (`don_hang_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `cai_dat_he_thong`
--
ALTER TABLE `cai_dat_he_thong`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT cho bảng `dia_chi_da_luu`
--
ALTER TABLE `dia_chi_da_luu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `don_hang`
--
ALTER TABLE `don_hang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `don_hang_mat_hang`
--
ALTER TABLE `don_hang_mat_hang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `lien_he`
--
ALTER TABLE `lien_he`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `nguoi_dung`
--
ALTER TABLE `nguoi_dung`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `nhat_ky_don_hang`
--
ALTER TABLE `nhat_ky_don_hang`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `thong_bao`
--
ALTER TABLE `thong_bao`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
