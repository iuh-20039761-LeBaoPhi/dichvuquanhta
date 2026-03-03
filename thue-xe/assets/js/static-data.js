// Static data fallback for GitHub Pages / no-server environments
const STATIC_DATA = {
    cars: [
        {
            id: 1, name: 'Toyota Camry 2022', brand: 'Toyota', model: 'Camry', year: 2022,
            seats: 5, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 800000, main_image: 'camry.jpg', status: 'available',
            description: 'Toyota Camry 2022 - Sedan sang trọng, phong cách, phù hợp cho các chuyến công tác và du lịch cao cấp. Tiện nghi đầy đủ, vận hành êm ái.',
            features: 'Điều hòa tự động,Cửa sổ trời,Cảm biến lùi,Camera 360,Kết nối Bluetooth,Ghế da cao cấp'
        },
        {
            id: 2, name: 'Honda City 2022', brand: 'Honda', model: 'City', year: 2022,
            seats: 5, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 500000, main_image: 'city.jpg', status: 'available',
            description: 'Honda City 2022 - Sedan tiết kiệm nhiên liệu, linh hoạt trong đô thị, phù hợp di chuyển hàng ngày trong thành phố.',
            features: 'Điều hòa tự động,Cảm biến lùi,Camera lùi,Kết nối Bluetooth,Màn hình cảm ứng'
        },
        {
            id: 3, name: 'Honda CR-V 2021', brand: 'Honda', model: 'CR-V', year: 2021,
            seats: 7, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 900000, main_image: 'crv.jpg', status: 'available',
            description: 'Honda CR-V 2021 - SUV 7 chỗ rộng rãi, tiện nghi hiện đại, phù hợp cho các chuyến du lịch gia đình dài ngày.',
            features: 'Điều hòa tự động,Cửa sổ trời,Cảm biến lùi,Camera 360,Hàng ghế thứ 3,Kết nối Apple CarPlay'
        },
        {
            id: 4, name: 'Mazda CX-5 2022', brand: 'Mazda', model: 'CX-5', year: 2022,
            seats: 5, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 850000, main_image: 'cx5.jpg', status: 'available',
            description: 'Mazda CX-5 2022 - SUV 5 chỗ thiết kế thể thao sang trọng, vận hành mạnh mẽ và tiết kiệm nhiên liệu.',
            features: 'Điều hòa tự động,Cửa sổ trời,Cảm biến lùi,Camera 360,Màn hình 10.25 inch,Kết nối Bluetooth'
        },
        {
            id: 5, name: 'Mazda 3 2022', brand: 'Mazda', model: '3', year: 2022,
            seats: 5, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 550000, main_image: 'mazda3.jpg', status: 'available',
            description: 'Mazda 3 2022 - Sedan thiết kế hiện đại tinh tế, tiết kiệm nhiên liệu, vận hành êm ái và dễ điều khiển.',
            features: 'Điều hòa tự động,Cảm biến lùi,Camera lùi,Màn hình cảm ứng,Kết nối Bluetooth'
        },
        {
            id: 6, name: 'Mitsubishi Xpander 2022', brand: 'Mitsubishi', model: 'Xpander', year: 2022,
            seats: 7, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 700000, main_image: 'mitsubishi_xpander.jpg', status: 'available',
            description: 'Mitsubishi Xpander 2022 - MPV 7 chỗ đa dụng, không gian rộng rãi, tiết kiệm nhiên liệu, lý tưởng cho gia đình.',
            features: 'Điều hòa tự động,Cảm biến lùi,Camera lùi,Kết nối Bluetooth,Hàng ghế thứ 3 gập được'
        },
        {
            id: 7, name: 'Ford Ranger 2021', brand: 'Ford', model: 'Ranger', year: 2021,
            seats: 5, transmission: 'Số sàn', fuel_type: 'Diesel',
            price_per_day: 950000, main_image: 'ranger.jpg', status: 'available',
            description: 'Ford Ranger 2021 - Bán tải mạnh mẽ, phù hợp cho địa hình phức tạp, vận chuyển hàng hóa và khám phá địa điểm mới.',
            features: '4 cầu,Điều hòa tự động,Cảm biến lùi,Camera lùi,Thùng xe rộng,Kết nối Bluetooth'
        },
        {
            id: 8, name: 'Toyota Vios 2023', brand: 'Toyota', model: 'Vios', year: 2023,
            seats: 5, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 450000, main_image: 'toyota_vios.jpg', status: 'available',
            description: 'Toyota Vios 2023 - Sedan kinh tế hàng đầu, tiết kiệm nhiên liệu, bền bỉ và dễ vận hành, giá thuê phải chăng.',
            features: 'Điều hòa tự động,Camera lùi,Cảm biến lùi,Kết nối Bluetooth,Túi khí an toàn'
        },
        {
            id: 9, name: 'VinFast VF5 2023', brand: 'VinFast', model: 'VF5', year: 2023,
            seats: 5, transmission: 'Tự động', fuel_type: 'Điện',
            price_per_day: 600000, main_image: 'vf5.jpg', status: 'available',
            description: 'VinFast VF5 2023 - SUV điện thuần túy của thương hiệu Việt, thân thiện môi trường, chi phí vận hành thấp.',
            features: 'Điện 100%,Điều hòa tự động,Camera 360,Màn hình 10 inch,Cập nhật OTA,Sạc nhanh'
        },
        {
            id: 10, name: 'VinFast VF8 2023', brand: 'VinFast', model: 'VF8', year: 2023,
            seats: 5, transmission: 'Tự động', fuel_type: 'Điện',
            price_per_day: 850000, main_image: 'vf8.jpg', status: 'available',
            description: 'VinFast VF8 2023 - SUV điện cỡ trung cao cấp, trang bị hiện đại toàn diện và phạm vi hoạt động lên đến 400km.',
            features: 'Điện 100%,Điều hòa tự động,Camera 360,Màn hình 15.6 inch,ADAS,Cập nhật OTA,Sạc nhanh'
        },
        {
            id: 11, name: 'Suzuki XL7 2022', brand: 'Suzuki', model: 'XL7', year: 2022,
            seats: 7, transmission: 'Tự động', fuel_type: 'Xăng',
            price_per_day: 650000, main_image: 'xl7.jpg', status: 'available',
            description: 'Suzuki XL7 2022 - SUV 7 chỗ nhỏ gọn, tiết kiệm nhiên liệu, thiết kế trẻ trung, lý tưởng cho gia đình nhỏ.',
            features: 'Điều hòa tự động,Cảm biến lùi,Camera lùi,Kết nối Bluetooth,Hàng ghế thứ 3'
        }
    ],

    services: [
        {
            id: 1, name: 'Giao Xe Tận Nơi', icon: 'map-marker-alt',
            description: 'Dịch vụ giao xe tận địa chỉ của bạn trong nội thành, tiết kiệm thời gian, thuận tiện tối đa.',
            price: 100000
        },
        {
            id: 2, name: 'Bảo Hiểm Mở Rộng', icon: 'shield-alt',
            description: 'Gói bảo hiểm mở rộng bảo vệ toàn diện cho chuyến đi, yên tâm lái xe mà không lo rủi ro.',
            price: 150000
        },
        {
            id: 3, name: 'Xe Có Tài Xế', icon: 'user-tie',
            description: 'Thuê xe kèm tài xế chuyên nghiệp, am hiểu đường xá TP.HCM, phong thái lịch sự và nhiệt tình.',
            price: 800000
        },
        {
            id: 4, name: 'Thuê Xe Theo Tháng', icon: 'calendar-check',
            description: 'Gói thuê xe dài hạn theo tháng với mức giá ưu đãi đặc biệt, phù hợp cho doanh nghiệp và cá nhân.',
            price: 12000000
        }
    ],

    filterOptions: {
        brands: ['Toyota', 'Honda', 'Mazda', 'Mitsubishi', 'Ford', 'VinFast', 'Suzuki'],
        seats: [5, 7],
        prices: { min: 450000, max: 950000 }
    }
};
