const SERVICES = [

  // 1️⃣ Chăm sóc người già cơ bản
  {
    id: 1,
    name: "Chăm sóc người già tại nhà (cơ bản)",
    image: "assets/1.png",
    description: "Hỗ trợ sinh hoạt và theo dõi sức khỏe hằng ngày cho người cao tuổi tại nhà.",
    includes: [
      "Theo dõi tình trạng sức khỏe hằng ngày",
      "Hỗ trợ ăn uống, uống thuốc đúng giờ",
      "Hỗ trợ vệ sinh cá nhân",
      "Nhắc lịch tái khám",
      "Trò chuyện, hỗ trợ tinh thần",
      "Ghi chép tình trạng sức khỏe mỗi ngày"
    ],
    pricing: [
      { label: "Theo giờ (120.000đ/giờ - tối thiểu 2 giờ)", value: 120000 },
      { label: "Theo ca 4 giờ (450.000đ)", value: 450000 },
      { label: "Ca 8 giờ (850.000đ)", value: 850000 },
      { label: "Theo ngày 24h (1.500.000đ)", value: 1500000 },
      { label: "Theo tháng 26 ngày (21.000.000đ)", value: 21000000 }
    ]
  },

  // 2️⃣ Chăm sóc sau bệnh / sau phẫu thuật
  {
    id: 2,
    name: "Chăm sóc người già sau bệnh / sau phẫu thuật",
    image: "assets/2.png",
    description: "Hỗ trợ phục hồi và theo dõi sức khỏe cho người cao tuổi sau điều trị.",
    includes: [
      "Hỗ trợ vận động nhẹ, tập phục hồi",
      "Theo dõi huyết áp, nhịp tim",
      "Hỗ trợ ăn uống theo chế độ dinh dưỡng",
      "Thay băng, vệ sinh vết mổ theo hướng dẫn bác sĩ",
      "Nhắc thuốc đúng giờ",
      "Theo dõi bất thường và báo gia đình"
    ],
    pricing: [
      { label: "Theo giờ (140.000đ/giờ)", value: 140000 },
      { label: "Ca 8 giờ (1.000.000đ)", value: 1000000 },
      { label: "Theo ngày 24h (1.800.000đ)", value: 1800000 },
      { label: "Theo tháng 24/24 (30.000.000đ)", value: 30000000 }
    ]
  },

  // 3️⃣ Chăm sóc mất khả năng tự chăm sóc
  {
    id: 3,
    name: "Chăm sóc người già mất khả năng tự chăm sóc",
    image: "assets/3.png",
    description: "Chăm sóc toàn diện cho người cao tuổi nằm liệt giường hoặc mất khả năng tự phục vụ.",
    includes: [
      "Hỗ trợ ăn uống, đút ăn",
      "Thay tã, vệ sinh tại giường",
      "Lật trở chống loét",
      "Tắm rửa tại giường",
      "Theo dõi sức khỏe liên tục",
      "Hỗ trợ di chuyển bằng xe lăn"
    ],
    pricing: [
      { label: "Ca 8 giờ (1.200.000đ)", value: 1200000 },
      { label: "Theo ngày 24h (2.200.000đ)", value: 2200000 },
      { label: "Theo tháng 24/24 (35.000.000đ)", value: 35000000 }
    ]
  },

  // 4️⃣ Chăm sóc người già ban đêm
  {
    id: 4,
    name: "Chăm sóc người già ban đêm",
    image: "assets/4.png",
    description: "Hỗ trợ trực và theo dõi người cao tuổi trong khung giờ ban đêm.",
    includes: [
      "Thức trực ban đêm",
      "Hỗ trợ đi vệ sinh",
      "Theo dõi tình trạng sức khỏe",
      "Hỗ trợ khi mất ngủ",
      "Nhắc uống thuốc ban đêm"
    ],
    pricing: [
      { label: "19h–23h (500.000đ)", value: 500000 },
      { label: "23h–5h (700.000đ)", value: 700000 },
      { label: "19h–7h (1.100.000đ)", value: 1100000 },
      { label: "30 đêm/tháng (29.000.000đ)", value: 29000000 }
    ]
  },

  // 5️⃣ Nấu ăn dinh dưỡng cho người cao tuổi
  {
    id: 5,
    name: "Nấu ăn dinh dưỡng cho người cao tuổi",
    image: "assets/5.png",
    description: "Chuẩn bị bữa ăn phù hợp bệnh lý và tình trạng sức khỏe người cao tuổi.",
    includes: [
      "Lên thực đơn phù hợp bệnh lý",
      "Đi chợ (gia đình thanh toán tiền chợ)",
      "Nấu 2–3 bữa/ngày",
      "Dọn dẹp bếp",
      "Tư vấn chế độ ăn phù hợp"
    ],
    pricing: [
      { label: "Theo giờ (100.000đ/giờ)", value: 100000 },
      { label: "Nấu 1 bữa (280.000đ)", value: 280000 },
      { label: "Nấu 2 bữa/ngày (500.000đ)", value: 500000 },
      { label: "Theo tháng 26 ngày (11.000.000đ)", value: 11000000 }
    ]
  },

  // 6️⃣ Hỗ trợ việc nhà cho gia đình có người già
  {
    id: 6,
    name: "Hỗ trợ việc nhà cho gia đình có người già",
    image: "assets/6.png",
    description: "Giúp gia đình giữ không gian sạch sẽ, an toàn cho người cao tuổi.",
    includes: [
      "Giặt đồ",
      "Dọn phòng",
      "Lau dọn nhà cửa",
      "Rửa chén",
      "Vệ sinh khu vực sinh hoạt"
    ],
    pricing: [
      { label: "Theo giờ (90.000đ/giờ)", value: 90000 },
      { label: "4 giờ (350.000đ)", value: 350000 },
      { label: "8 giờ (680.000đ)", value: 680000 },
      { label: "Theo tháng 26 ngày, 4h/ngày (8.500.000đ)", value: 8500000 }
    ]
  }

];