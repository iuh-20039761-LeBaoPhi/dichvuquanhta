-- =====================================================
-- CarRental Database Schema
-- Chạy file này trong phpMyAdmin hoặc MySQL CLI
-- =====================================================

CREATE DATABASE IF NOT EXISTS car_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE car_rental;

-- =====================================================
-- BẢNG XE (cars)
-- =====================================================
CREATE TABLE IF NOT EXISTS cars (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    brand         VARCHAR(100) NOT NULL,
    model         VARCHAR(100) NOT NULL,
    year          YEAR        NOT NULL,
    seats         TINYINT     NOT NULL DEFAULT 5,
    transmission  VARCHAR(50) NOT NULL DEFAULT 'Tự động',
    fuel_type     VARCHAR(50) NOT NULL DEFAULT 'Xăng',
    price_per_day DECIMAL(12,0) NOT NULL,
    main_image    VARCHAR(255) DEFAULT 'default.jpg',
    description   TEXT,
    features      TEXT,
    status        ENUM('available','rented','maintenance') NOT NULL DEFAULT 'available',
    created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BẢNG ẢNH XE (car_images)
-- =====================================================
CREATE TABLE IF NOT EXISTS car_images (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    car_id     INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_main    TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BẢNG DỊCH VỤ (services)
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       DECIMAL(12,0) NOT NULL DEFAULT 0,
    icon        VARCHAR(100) DEFAULT 'star',
    status      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BẢNG ĐƠN ĐẶT XE (bookings)
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    car_id           INT NOT NULL,
    customer_name    VARCHAR(255) NOT NULL,
    customer_email   VARCHAR(255) NOT NULL,
    customer_phone   VARCHAR(20)  NOT NULL,
    customer_address TEXT NOT NULL,
    id_number        VARCHAR(50)  DEFAULT '',
    pickup_date      DATE NOT NULL,
    return_date      DATE NOT NULL,
    pickup_location  VARCHAR(255) DEFAULT '',
    notes            TEXT,
    total_days       INT NOT NULL DEFAULT 1,
    total_price      DECIMAL(12,0) NOT NULL,
    status           ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BẢNG DỊCH VỤ THEO ĐƠN (booking_services)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_services (
    booking_id INT NOT NULL,
    service_id INT NOT NULL,
    PRIMARY KEY (booking_id, service_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BẢNG ADMIN (admins)
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    full_name  VARCHAR(255) NOT NULL,
    email      VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- DỮ LIỆU MẪU
-- =====================================================

-- Tài khoản admin mặc định: admin / admin123
INSERT INTO admins (username, password, full_name, email) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Quản trị viên', 'admin@carrental.com');

-- Dịch vụ mẫu
INSERT INTO services (name, description, price, icon, status) VALUES
('Giao xe tận nơi', 'Giao xe đến địa chỉ khách hàng trong bán kính 20km', 200000, 'truck', 1),
('Bảo hiểm toàn diện', 'Bảo hiểm tai nạn và vật chất toàn diện trong suốt thời gian thuê', 150000, 'shield-alt', 1),
('Tài xế riêng', 'Cung cấp tài xế chuyên nghiệp, lịch sự và am hiểu đường đi', 500000, 'user-tie', 1),
('GPS định vị', 'Thiết bị GPS định vị chính xác, bản đồ cập nhật', 50000, 'map-marker-alt', 1);

-- Xe mẫu
INSERT INTO cars (name, brand, model, year, seats, transmission, fuel_type, price_per_day, main_image, description, features, status) VALUES
('Toyota Camry 2023', 'Toyota', 'Camry', 2023, 5, 'Tự động', 'Xăng', 1200000, 'camry.jpg',
 'Toyota Camry 2023 - Sedan hạng sang với thiết kế sang trọng, nội thất tiện nghi và tiết kiệm nhiên liệu.',
 'Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Ghế da cao cấp', 'available'),

('Honda CR-V 2022', 'Honda', 'CR-V', 2022, 7, 'Tự động', 'Xăng', 1500000, 'crv.jpg',
 'Honda CR-V 7 chỗ rộng rãi, phù hợp gia đình. Vận hành mạnh mẽ, an toàn tuyệt đối.',
 'Điều hòa hai vùng,Camera 360,Cảm biến va chạm,Apple CarPlay,Android Auto,Cốp điện', 'available'),

('Hyundai Tucson 2023', 'Hyundai', 'Tucson', 2023, 5, 'Tự động', 'Xăng', 1100000, 'default.jpg',
 'Hyundai Tucson 2023 với thiết kế trẻ trung, hiện đại. Tiêu thụ nhiên liệu thấp.',
 'Điều hòa tự động,Camera lùi,Hỗ trợ phanh khẩn cấp,Màn hình 10.25 inch,Sạc không dây', 'available'),

('Ford Ranger 2022', 'Ford', 'Ranger', 2022, 5, 'Số sàn', 'Dầu', 900000, 'ranger.jpg',
 'Ford Ranger bán tải mạnh mẽ, thích hợp cho cả đường thành phố và địa hình.',
 'Điều hòa,Camera lùi,Lốp địa hình,Cầu ngang,Kéo tải 3.5 tấn', 'available'),

('Mitsubishi Xpander 2023', 'Mitsubishi', 'Xpander', 2023, 7, 'Tự động', 'Xăng', 850000, 'mitsubishi_xpander.jpg',
 'MPV 7 chỗ rộng rãi, phù hợp cho gia đình và nhóm bạn du lịch.',
 'Điều hòa,Camera lùi,Màn hình cảm ứng,Kết nối Bluetooth,Ghế lái chỉnh điện', 'available'),

('VinFast VF8 2023', 'VinFast', 'VF8', 2023, 5, 'Tự động', 'Điện', 1800000, 'vf8.jpg',
 'SUV điện thương hiệu Việt Nam. Phạm vi 420km/sạc, tăng tốc 0-100km/h trong 5.9 giây.',
 'Điều hòa,Camera 360,ADAS,Màn hình 15.6 inch,Sạc nhanh AC/DC,Hỗ trợ phanh tự động', 'available'),

('Honda City 2023', 'Honda', 'City', 2023, 5, 'Tự động', 'Xăng', 750000, 'city.jpg',
 'Honda City 2023 - Sedan hạng B thế hệ mới với ngoại thất thể thao, nội thất hiện đại và tiết kiệm nhiên liệu vượt trội.',
 'Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng 8 inch,Kết nối Bluetooth,Honda Sensing', 'available'),

('Mazda CX-5 2023', 'Mazda', 'CX-5', 2023, 5, 'Tự động', 'Xăng', 1150000, 'cx5.jpg',
 'Mazda CX-5 2023 - SUV hạng C với thiết kế Kodo sang trọng, cabin cách âm tốt và hệ thống an toàn hiện đại.',
 'Điều hòa hai vùng,Camera 360,Cảm biến va chạm,Màn hình 10.25 inch,Ghế da,i-Activsense', 'available'),

('Mazda 3 2023', 'Mazda', 'Mazda3', 2023, 5, 'Tự động', 'Xăng', 850000, 'mazda3.jpg',
 'Mazda 3 2023 - Sedan hạng C với thiết kế thời thượng, động cơ Skyactiv tiết kiệm và vận hành mượt mà.',
 'Điều hòa tự động,Camera lùi,Cảm biến đỗ xe,Màn hình 8.8 inch,Sạc không dây,Ghế da', 'available'),

('Toyota Vios 2023', 'Toyota', 'Vios', 2023, 5, 'Tự động', 'Xăng', 700000, 'toyota_vios.jpg',
 'Toyota Vios 2023 - Sedan hạng B phổ biến, bền bỉ và tiết kiệm nhiên liệu, phù hợp di chuyển đô thị.',
 'Điều hòa,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Túi khí đôi', 'available'),

('VinFast VF5 2023', 'VinFast', 'VF5', 2023, 5, 'Tự động', 'Điện', 900000, 'vf5.jpg',
 'VinFast VF5 - SUV điện mini thương hiệu Việt, phạm vi 326km/sạc, phù hợp di chuyển nội đô kinh tế.',
 'Điều hòa,Camera lùi,Màn hình 10 inch,Sạc nhanh AC/DC,Kết nối điện thoại,Túi khí đôi', 'available'),

('Suzuki XL7 2023', 'Suzuki', 'XL7', 2023, 7, 'Tự động', 'Xăng', 820000, 'xl7.jpg',
 'Suzuki XL7 2023 - SUV 7 chỗ gọn gàng, tiết kiệm nhiên liệu, thiết kế hiện đại phù hợp gia đình.',
 'Điều hòa,Camera lùi,Cảm biến đỗ xe,Màn hình cảm ứng,Kết nối Bluetooth,Hàng ghế thứ 3', 'available');

-- =====================================================
-- DỮ LIỆU ĐƠN ĐẶT XE MẪU
-- car_id tương ứng: 1=Camry, 2=CR-V, 3=Tucson, 4=Ranger,
--   5=Xpander, 6=VF8, 7=City, 8=CX-5, 9=Mazda3, 10=Vios,
--   11=VF5, 12=XL7
-- =====================================================

-- Đơn đang đặt (pending / confirmed)
INSERT INTO bookings (car_id, customer_name, customer_email, customer_phone, customer_address, id_number, pickup_date, return_date, pickup_location, notes, total_days, total_price, status, created_at) VALUES

(1, 'Nguyễn Văn An', 'nguyenvanan@gmail.com', '0901234567',
 '12 Nguyễn Huệ, Quận 1, TP.HCM', '079201001234',
 '2026-02-26', '2026-03-01', '12 Nguyễn Huệ, Quận 1, TP.HCM',
 'Giao xe trước 8 giờ sáng', 4, 4800000, 'pending', '2026-02-24 10:15:00'),

(2, 'Trần Thị Bích', 'tranthibich@gmail.com', '0912345678',
 '45 Lê Lợi, Quận Hải Châu, Đà Nẵng', '048195002345',
 '2026-02-27', '2026-03-03', '45 Lê Lợi, Quận Hải Châu, Đà Nẵng',
 'Cần xe đi du lịch Hội An cả gia đình', 5, 7500000, 'confirmed', '2026-02-23 14:30:00'),

(6, 'Lê Minh Khoa', 'leminhkhoa@gmail.com', '0978901234',
 '88 Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM', '079197003456',
 '2026-03-01', '2026-03-05', 'Văn phòng 88 Đinh Tiên Hoàng, Bình Thạnh',
 'Muốn trải nghiệm xe điện VinFast', 4, 7200000, 'pending', '2026-02-25 09:00:00'),

(8, 'Phạm Quỳnh Anh', 'phamquynhanh@gmail.com', '0934567890',
 '23 Trần Phú, TP. Nha Trang, Khánh Hòa', '056200004567',
 '2026-02-28', '2026-03-02', '23 Trần Phú, TP. Nha Trang',
 '', 3, 3450000, 'confirmed', '2026-02-24 16:45:00'),

-- Đơn đã hoàn thành (completed)
(7, 'Hoàng Đức Trung', 'hoangductrung@gmail.com', '0945678901',
 '67 Hai Bà Trưng, Quận 3, TP.HCM', '079199005678',
 '2026-02-10', '2026-02-13', '67 Hai Bà Trưng, Quận 3, TP.HCM',
 '', 3, 2250000, 'completed', '2026-02-08 11:20:00'),

(4, 'Vũ Thị Lan', 'vuthilan@gmail.com', '0956789012',
 '15 Phan Bội Châu, TP. Huế, Thừa Thiên Huế', '046200006789',
 '2026-02-05', '2026-02-08', '15 Phan Bội Châu, TP. Huế',
 'Đi công trình miền núi, cần xe gầm cao', 3, 2700000, 'completed', '2026-02-03 08:00:00'),

(9, 'Đỗ Thanh Tùng', 'dothanhtung@gmail.com', '0967890123',
 '100 Nguyễn Trãi, Quận Thanh Xuân, Hà Nội', '001198007890',
 '2026-01-20', '2026-01-25', '100 Nguyễn Trãi, Thanh Xuân, Hà Nội',
 'Đi công tác Hải Phòng 5 ngày', 5, 4250000, 'completed', '2026-01-18 13:10:00'),

(10, 'Ngô Thị Mai', 'ngothimai@gmail.com', '0989012345',
 '5 Lý Tự Trọng, Quận Ninh Kiều, Cần Thơ', '092200008901',
 '2026-01-15', '2026-01-18', '5 Lý Tự Trọng, Ninh Kiều, Cần Thơ',
 '', 3, 2100000, 'completed', '2026-01-13 15:30:00'),

(5, 'Bùi Văn Hùng', 'buivanhung@gmail.com', '0901112233',
 '30 Lê Duẩn, Quận 1, TP.HCM', '079195009012',
 '2026-02-01', '2026-02-05', '30 Lê Duẩn, Quận 1, TP.HCM',
 'Đưa gia đình 7 người đi Vũng Tàu', 4, 3400000, 'completed', '2026-01-29 10:00:00');
