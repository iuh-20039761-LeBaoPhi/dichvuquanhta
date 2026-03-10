const SHIPPING_DATA = {
  "noi-thanh": {
    slow: { base: 18000, next: 2500, time: "12h-24h" },
    standard: { base: 22000, next: 3000, time: "6h-12h" },
    fast: { base: 28000, next: 4000, time: "3h-6h" },
    express: { base: 35000, next: 5000, time: "2h" },
  },
  "ngoai-thanh": {
    slow: { base: 25000, next: 3000, time: "1-2 ngày" },
    standard: { base: 30000, next: 4000, time: "24h" },
    fast: { base: 38000, next: 5000, time: "8h-12h" },
    express: { base: 45000, next: 6000, time: "6h-12h" },
  },
  "lien-tinh": {
    slow: { base: 30000, next: 6000, time: "3-5 ngày" },
    standard: { base: 35000, next: 8000, time: "2-3 ngày" },
    fast: { base: 45000, next: 10000, time: "1-2 ngày" },
    express: { base: 55000, next: 12000, time: "1-2 ngày" },
  },
  addons: {
    cod: { threshold: 1000000, fee_rate: 0.012, min: 15000 },
    ins: { fee_rate: 0.005 },
  },
};

const DOMESTIC_CITY_OPTIONS = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
];

const DOMESTIC_DISTRICT_OVERRIDES = {
  "TP. Hồ Chí Minh": [
    "Quận 1",
    "Quận 3",
    "Quận 4",
    "Quận 5",
    "Quận 6",
    "Quận 7",
    "Quận 8",
    "Quận 10",
    "Quận 11",
    "Quận 12",
    "Bình Thạnh",
    "Tân Bình",
    "Tân Phú",
    "Gò Vấp",
    "Phú Nhuận",
    "Bình Tân",
    "TP. Thủ Đức",
    "Hóc Môn",
    "Bình Chánh",
    "Nhà Bè",
    "Cần Giờ",
    "Củ Chi",
  ],
  "Hà Nội": [
    "Ba Đình",
    "Hoàn Kiếm",
    "Hai Bà Trưng",
    "Đống Đa",
    "Cầu Giấy",
    "Thanh Xuân",
    "Hoàng Mai",
    "Long Biên",
    "Nam Từ Liêm",
    "Bắc Từ Liêm",
    "Hà Đông",
    "Tây Hồ",
    "Sóc Sơn",
    "Đông Anh",
    "Gia Lâm",
    "Thanh Trì",
    "Hoài Đức",
    "Thường Tín",
    "Quốc Oai",
    "Phúc Thọ",
  ],
  "Đà Nẵng": [
    "Hải Châu",
    "Thanh Khê",
    "Sơn Trà",
    "Ngũ Hành Sơn",
    "Liên Chiểu",
    "Cẩm Lệ",
    "Hòa Vang",
    "Hoàng Sa",
  ],
  "Hải Phòng": [
    "Hồng Bàng",
    "Lê Chân",
    "Ngô Quyền",
    "Kiến An",
    "Hải An",
    "Đồ Sơn",
    "Dương Kinh",
    "An Dương",
    "An Lão",
    "Kiến Thụy",
    "Thủy Nguyên",
    "Tiên Lãng",
    "Vĩnh Bảo",
    "Cát Hải",
    "Bạch Long Vĩ",
  ],
  "Cần Thơ": [
    "Ninh Kiều",
    "Bình Thủy",
    "Cái Răng",
    "Ô Môn",
    "Thốt Nốt",
    "Phong Điền",
    "Cờ Đỏ",
    "Vĩnh Thạnh",
    "Thới Lai",
  ],
  "Bình Dương": [
    "Thủ Dầu Một",
    "Dĩ An",
    "Thuận An",
    "Tân Uyên",
    "Bến Cát",
    "Bắc Tân Uyên",
    "Phú Giáo",
    "Dầu Tiếng",
    "Bàu Bàng",
  ],
};

const DOMESTIC_DISTRICTS_BY_CITY = DOMESTIC_CITY_OPTIONS.reduce((acc, city) => {
  if (Array.isArray(DOMESTIC_DISTRICT_OVERRIDES[city])) {
    acc[city] = DOMESTIC_DISTRICT_OVERRIDES[city];
  }
  return acc;
}, {});

const INTERNATIONAL_COUNTRIES = [
  "Nhật Bản",
  "Hàn Quốc",
  "Trung Quốc",
  "Đài Loan",
  "Hong Kong",
  "Singapore",
  "Malaysia",
  "Thái Lan",
  "Indonesia",
  "Philippines",
  "Ấn Độ",
  "UAE",
  "Qatar",
  "Kuwait",
  "Saudi Arabia",
  "Israel",
  "Thổ Nhĩ Kỳ",
  "Anh",
  "Pháp",
  "Đức",
  "Ý",
  "Tây Ban Nha",
  "Bồ Đào Nha",
  "Hà Lan",
  "Bỉ",
  "Thụy Sĩ",
  "Thụy Điển",
  "Na Uy",
  "Đan Mạch",
  "Phần Lan",
  "Ireland",
  "Ba Lan",
  "Áo",
  "Séc",
  "Hungary",
  "Romania",
  "Nga",
  "Hoa Kỳ",
  "Canada",
  "Mexico",
  "Brazil",
  "Argentina",
  "Chile",
  "Peru",
  "Colombia",
  "Úc",
  "New Zealand",
  "Nam Phi",
  "Ai Cập",
  "Morocco",
  "Kenya",
  "Nigeria",
  "Lào",
  "Campuchia",
  "Myanmar",
  "Brunei",
  "Nepal",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "Kazakhstan",
  "Mông Cổ",
  "Jordan",
  "Oman",
  "Bahrain",
  "Iran",
  "Iraq",
  "Greece",
  "Ukraine",
  "Belarus",
  "Bulgaria",
  "Croatia",
  "Slovakia",
  "Slovenia",
  "Lithuania",
  "Latvia",
  "Estonia",
  "Luxembourg",
  "Iceland",
  "Serbia",
  "Albania",
  "Bosnia và Herzegovina",
  "Venezuela",
  "Ecuador",
  "Bolivia",
  "Uruguay",
  "Paraguay",
  "Guatemala",
  "Panama",
  "Costa Rica",
  "Dominican Republic",
  "Cuba",
  "Algeria",
  "Tunisia",
  "Ghana",
  "Ethiopia",
  "Tanzania",
  "Uganda",
  "Angola",
  "Cameroon",
  "Zimbabwe",
  "Mozambique",
  "Fiji",
  "Papua New Guinea",
];

const DEFAULT_INTL_REGIONS = [
  "Khu vực trung tâm",
  "Khu vực ngoại ô",
  "Khu vực khác",
];

const INTERNATIONAL_DESTINATION_REGIONS = {
  "Nhật Bản": ["Tokyo", "Osaka", "Aichi", "Fukuoka", "Hokkaido"],
  "Hàn Quốc": ["Seoul", "Busan", "Incheon", "Daegu", "Gyeonggi-do"],
  "Trung Quốc": ["Beijing", "Shanghai", "Guangdong", "Shenzhen", "Zhejiang"],
  "Đài Loan": ["Taipei", "New Taipei", "Taichung", "Kaohsiung", "Tainan"],
  "Hong Kong": ["Hong Kong Island", "Kowloon", "New Territories", "Lantau"],
  Singapore: [
    "Central Region",
    "North East",
    "North West",
    "South East",
    "South West",
  ],
  Malaysia: ["Kuala Lumpur", "Selangor", "Penang", "Johor", "Sabah"],
  "Thái Lan": ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Khon Kaen"],
  Indonesia: ["Jakarta", "Surabaya", "Bandung", "Medan", "Bali"],
  Philippines: ["Metro Manila", "Cebu", "Davao", "Quezon City", "Iloilo"],
  "Ấn Độ": ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"],
  UAE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah"],
  Qatar: ["Doha", "Al Rayyan", "Al Wakrah", "Umm Salal"],
  Kuwait: ["Kuwait City", "Hawalli", "Farwaniya", "Ahmadi"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina"],
  Israel: ["Tel Aviv", "Jerusalem", "Haifa", "Beersheba"],
  "Thổ Nhĩ Kỳ": ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"],
  Lào: ["Vientiane", "Luang Prabang", "Savannakhet", "Pakse"],
  Campuchia: ["Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang"],
  Myanmar: ["Yangon", "Mandalay", "Naypyidaw", "Bago"],
  Brunei: ["Bandar Seri Begawan", "Kuala Belait", "Seria", "Tutong"],
  Nepal: ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar"],
  Pakistan: ["Karachi", "Lahore", "Islamabad", "Faisalabad"],
  Bangladesh: ["Dhaka", "Chittagong", "Khulna", "Sylhet"],
  "Sri Lanka": ["Colombo", "Kandy", "Galle", "Jaffna"],
  Kazakhstan: ["Almaty", "Astana", "Shymkent", "Aktobe"],
  "Mông Cổ": ["Ulaanbaatar", "Erdenet", "Darkhan", "Choibalsan"],
  Jordan: ["Amman", "Irbid", "Aqaba", "Zarqa"],
  Oman: ["Muscat", "Salalah", "Sohar", "Nizwa"],
  Bahrain: ["Manama", "Muharraq", "Riffa", "Isa Town"],
  Iran: ["Tehran", "Mashhad", "Isfahan", "Shiraz"],
  Iraq: ["Baghdad", "Basra", "Erbil", "Mosul"],
  "Hoa Kỳ": ["California", "Texas", "New York", "Florida", "Washington"],
  Canada: ["Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba"],
  Mexico: ["Mexico City", "Jalisco", "Nuevo Leon", "Puebla", "Guanajuato"],
  Brazil: ["Sao Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Parana"],
  Argentina: ["Buenos Aires", "Cordoba", "Santa Fe", "Mendoza"],
  Chile: ["Santiago", "Valparaiso", "Biobio", "Antofagasta"],
  Peru: ["Lima", "Arequipa", "Cusco", "La Libertad"],
  Colombia: ["Bogota", "Antioquia", "Valle del Cauca", "Atlantico"],
  Venezuela: ["Caracas", "Maracaibo", "Valencia", "Barquisimeto"],
  Ecuador: ["Quito", "Guayaquil", "Cuenca", "Manta"],
  Bolivia: ["La Paz", "Santa Cruz", "Cochabamba", "Sucre"],
  Uruguay: ["Montevideo", "Salto", "Paysandu", "Maldonado"],
  Paraguay: ["Asuncion", "Ciudad del Este", "Encarnacion", "Luque"],
  Guatemala: ["Guatemala City", "Quetzaltenango", "Escuintla", "Peten"],
  Panama: ["Panama City", "Colon", "David", "Santiago"],
  "Costa Rica": ["San Jose", "Alajuela", "Heredia", "Cartago"],
  "Dominican Republic": [
    "Santo Domingo",
    "Santiago",
    "La Romana",
    "Punta Cana",
  ],
  Cuba: ["Havana", "Santiago de Cuba", "Holguin", "Camaguey"],
  Úc: [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
  ],
  Anh: ["England", "Scotland", "Wales", "Northern Ireland"],
  Đức: ["Berlin", "Bavaria", "Hamburg", "Hesse", "North Rhine-Westphalia"],
  Pháp: ["Ile-de-France", "Auvergne-Rhone-Alpes", "Provence-Alpes-Cote d'Azur"],
  Ý: ["Lombardy", "Lazio", "Campania", "Sicily", "Veneto"],
  "Tây Ban Nha": ["Madrid", "Catalonia", "Andalusia", "Valencia"],
  "Bồ Đào Nha": ["Lisbon", "Porto", "Braga", "Setubal"],
  "Hà Lan": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  Bỉ: ["Brussels", "Antwerp", "Ghent", "Liege"],
  "Thụy Sĩ": ["Zurich", "Geneva", "Basel", "Bern"],
  "Thụy Điển": ["Stockholm", "Gothenburg", "Malmo", "Uppsala"],
  "Na Uy": ["Oslo", "Bergen", "Trondheim", "Stavanger"],
  "Đan Mạch": ["Copenhagen", "Aarhus", "Odense", "Aalborg"],
  "Phần Lan": ["Helsinki", "Espoo", "Tampere", "Turku"],
  Ireland: ["Dublin", "Cork", "Limerick", "Galway"],
  "Ba Lan": ["Warsaw", "Krakow", "Lodz", "Wroclaw"],
  Áo: ["Vienna", "Graz", "Linz", "Salzburg"],
  Séc: ["Prague", "Brno", "Ostrava", "Plzen"],
  Hungary: ["Budapest", "Debrecen", "Szeged", "Miskolc"],
  Romania: ["Bucharest", "Cluj-Napoca", "Timisoara", "Iasi"],
  Nga: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg"],
  Greece: ["Athens", "Thessaloniki", "Patras", "Heraklion"],
  Ukraine: ["Kyiv", "Kharkiv", "Odesa", "Lviv"],
  Belarus: ["Minsk", "Gomel", "Brest", "Vitebsk"],
  Bulgaria: ["Sofia", "Plovdiv", "Varna", "Burgas"],
  Croatia: ["Zagreb", "Split", "Rijeka", "Osijek"],
  Slovakia: ["Bratislava", "Kosice", "Presov", "Zilina"],
  Slovenia: ["Ljubljana", "Maribor", "Koper", "Celje"],
  Lithuania: ["Vilnius", "Kaunas", "Klaipeda", "Siauliai"],
  Latvia: ["Riga", "Daugavpils", "Liepaja", "Jelgava"],
  Estonia: ["Tallinn", "Tartu", "Narva", "Parnu"],
  Luxembourg: [
    "Luxembourg City",
    "Esch-sur-Alzette",
    "Differdange",
    "Dudelange",
  ],
  Iceland: ["Reykjavik", "Kopavogur", "Hafnarfjordur", "Akureyri"],
  Serbia: ["Belgrade", "Novi Sad", "Nis", "Kragujevac"],
  Albania: ["Tirana", "Durres", "Vlore", "Shkoder"],
  "Bosnia và Herzegovina": ["Sarajevo", "Banja Luka", "Mostar", "Tuzla"],
  "New Zealand": ["Auckland", "Wellington", "Canterbury", "Otago"],
  Fiji: ["Suva", "Nadi", "Lautoka", "Labasa"],
  "Papua New Guinea": ["Port Moresby", "Lae", "Mount Hagen", "Madang"],
  "Nam Phi": ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
  "Ai Cập": ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh"],
  Morocco: ["Casablanca", "Rabat", "Marrakesh", "Tangier"],
  Kenya: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
  Nigeria: ["Lagos", "Abuja", "Kano", "Port Harcourt"],
  Algeria: ["Algiers", "Oran", "Constantine", "Annaba"],
  Tunisia: ["Tunis", "Sfax", "Sousse", "Bizerte"],
  Ghana: ["Accra", "Kumasi", "Takoradi", "Tamale"],
  Ethiopia: ["Addis Ababa", "Dire Dawa", "Mekelle", "Bahir Dar"],
  Tanzania: ["Dar es Salaam", "Dodoma", "Arusha", "Mwanza"],
  Uganda: ["Kampala", "Entebbe", "Gulu", "Mbarara"],
  Angola: ["Luanda", "Huambo", "Benguela", "Lubango"],
  Cameroon: ["Yaounde", "Douala", "Garoua", "Bafoussam"],
  Zimbabwe: ["Harare", "Bulawayo", "Mutare", "Gweru"],
  Mozambique: ["Maputo", "Beira", "Nampula", "Matola"],
};

const QUOTE_SHIPPING_DATA = {
  cities: DOMESTIC_DISTRICTS_BY_CITY,
  domestic: {
    cityOptions: DOMESTIC_CITY_OPTIONS,
    volumeDivisor: 5000,
    baseIncludedWeight: 2, // Cước cơ bản áp dụng cho 2kg đầu
    zoneLabels: {
      same_district: "Nội quận/huyện",
      same_city: "Nội thành",
      inter_city: "Liên tỉnh",
    },
    goodsTypeFee: {
      thuong: 3000,
      "de-vo": 9000,
      "gia-tri-cao": 15000,
      "chat-long": 0,
      "pin-lithium": 14000,
      "dong-lanh": 13000,
      "cong-kenh": 18000,
    },
    goodsTypeMultiplier: {
      "chat-long": 1.1,
    },
    cod: {
      freeThreshold: 100000,
      rate: 0.01,
      min: 5000,
    },
    insurance: {
      freeThreshold: 1000000, // Miễn phí bảo hiểm cho đơn dưới 1 triệu
      rate: 0.005,
      minAboveThreshold: 5000,
    },
    services: {
      slow: {
        label: "Gói Chậm",
        base: {
          same_district: 14000,
          same_city: 21000,
          inter_city: 32000,
        },
        perHalfKg: 2500,
        estimate: {
          same_district: "8-12 giờ",
          same_city: "12-24 giờ",
          inter_city: "2-4 ngày",
        },
      },
      standard: {
        label: "Gói Tiêu chuẩn",
        base: {
          same_district: 18000,
          same_city: 26000,
          inter_city: 39000,
        },
        perHalfKg: 3500,
        estimate: {
          same_district: "4-6 giờ",
          same_city: "8-12 giờ",
          inter_city: "1-3 ngày",
        },
      },
      fast: {
        label: "Gói Nhanh",
        base: {
          same_district: 24000,
          same_city: 34000,
          inter_city: 49000,
        },
        perHalfKg: 4500,
        estimate: {
          same_district: "2-3 giờ",
          same_city: "4-8 giờ",
          inter_city: "18-30 giờ",
        },
      },
      express: {
        label: "Gói Hỏa tốc",
        base: {
          same_district: 32000,
          same_city: 45000,
          inter_city: 65000,
        },
        perHalfKg: 6000,
        estimate: {
          same_district: "1-2 giờ",
          same_city: "2-4 giờ",
          inter_city: "12-24 giờ",
        },
      },
    },
  },
  international: {
    countries: INTERNATIONAL_COUNTRIES,
    destinationRegions: INTERNATIONAL_DESTINATION_REGIONS,
    defaultDestinationRegions: DEFAULT_INTL_REGIONS,
    volumeDivisor: 6000,
    baseIncludedWeight: 0.5,
    countryZoneMap: {
      "Nhật Bản": "asia",
      "Hàn Quốc": "asia",
      "Trung Quốc": "asia",
      "Đài Loan": "asia",
      "Hong Kong": "asia",
      Singapore: "asia",
      Malaysia: "asia",
      "Thái Lan": "asia",
      Indonesia: "asia",
      Philippines: "asia",
      "Ấn Độ": "asia",
      UAE: "asia",
      Qatar: "asia",
      Kuwait: "asia",
      "Saudi Arabia": "asia",
      Israel: "asia",
      "Thổ Nhĩ Kỳ": "europe",
      Anh: "europe",
      Pháp: "europe",
      Đức: "europe",
      Ý: "europe",
      "Tây Ban Nha": "europe",
      "Bồ Đào Nha": "europe",
      "Hà Lan": "europe",
      Bỉ: "europe",
      "Thụy Sĩ": "europe",
      "Thụy Điển": "europe",
      "Na Uy": "europe",
      "Đan Mạch": "europe",
      "Phần Lan": "europe",
      Ireland: "europe",
      "Ba Lan": "europe",
      Áo: "europe",
      Séc: "europe",
      Hungary: "europe",
      Romania: "europe",
      Nga: "europe",
      "Hoa Kỳ": "america",
      Canada: "america",
      Mexico: "america",
      Brazil: "america",
      Argentina: "america",
      Chile: "america",
      Peru: "america",
      Colombia: "america",
      Úc: "oceania",
      "New Zealand": "oceania",
      "Nam Phi": "africa",
      "Ai Cập": "africa",
      Morocco: "africa",
      Kenya: "africa",
      Nigeria: "africa",
      Lào: "asia",
      Campuchia: "asia",
      Myanmar: "asia",
      Brunei: "asia",
      Nepal: "asia",
      Pakistan: "asia",
      Bangladesh: "asia",
      "Sri Lanka": "asia",
      Kazakhstan: "asia",
      "Mông Cổ": "asia",
      Jordan: "asia",
      Oman: "asia",
      Bahrain: "asia",
      Iran: "asia",
      Iraq: "asia",
      Greece: "europe",
      Ukraine: "europe",
      Belarus: "europe",
      Bulgaria: "europe",
      Croatia: "europe",
      Slovakia: "europe",
      Slovenia: "europe",
      Lithuania: "europe",
      Latvia: "europe",
      Estonia: "europe",
      Luxembourg: "europe",
      Iceland: "europe",
      Serbia: "europe",
      Albania: "europe",
      "Bosnia và Herzegovina": "europe",
      Venezuela: "america",
      Ecuador: "america",
      Bolivia: "america",
      Uruguay: "america",
      Paraguay: "america",
      Guatemala: "america",
      Panama: "america",
      "Costa Rica": "america",
      "Dominican Republic": "america",
      Cuba: "america",
      Algeria: "africa",
      Tunisia: "africa",
      Ghana: "africa",
      Ethiopia: "africa",
      Tanzania: "africa",
      Uganda: "africa",
      Angola: "africa",
      Cameroon: "africa",
      Zimbabwe: "africa",
      Mozambique: "africa",
      Fiji: "oceania",
      "Papua New Guinea": "oceania",
    },
    zoneLabels: {
      asia: "Châu Á",
      europe: "Châu Âu",
      america: "Châu Mỹ",
      oceania: "Châu Đại Dương",
      africa: "Châu Phi",
      other: "Khu vực khác",
    },
    goodsTypeMultiplier: {
      thuong: 1.05,
      "de-vo": 1.12,
      "gia-tri-cao": 1.18,
      "chat-long": 1.16,
      "pin-lithium": 1.2,
      "dong-lanh": 1.22,
      "cong-kenh": 1.25,
    },
    customsFee: {
      asia: 20000,
      europe: 35000,
      america: 40000,
      oceania: 35000,
      africa: 38000,
      other: 38000,
    },
    fuelRate: 0.08,
    securityFee: 12000,
    insurance: {
      rate: 0.01,
      min: 0,
    },
    services: {
      intl_economy: {
        label: "Tiêu chuẩn quốc tế",
        base: {
          asia: 210000,
          europe: 360000,
          america: 460000,
          oceania: 340000,
          africa: 390000,
          other: 420000,
        },
        perHalfKg: {
          asia: 50000,
          europe: 70000,
          america: 90000,
          oceania: 70000,
          africa: 75000,
          other: 80000,
        },
        estimate: {
          asia: "5-7 ngày",
          europe: "6-9 ngày",
          america: "7-10 ngày",
          oceania: "6-9 ngày",
          africa: "7-10 ngày",
          other: "8-12 ngày",
        },
      },
      intl_express: {
        label: "Chuyển phát nhanh quốc tế",
        base: {
          asia: 320000,
          europe: 500000,
          america: 620000,
          oceania: 470000,
          africa: 530000,
          other: 560000,
        },
        perHalfKg: {
          asia: 70000,
          europe: 90000,
          america: 120000,
          oceania: 95000,
          africa: 98000,
          other: 105000,
        },
        estimate: {
          asia: "2-4 ngày",
          europe: "3-5 ngày",
          america: "4-6 ngày",
          oceania: "3-5 ngày",
          africa: "4-6 ngày",
          other: "5-7 ngày",
        },
      },
    },
  },
};

function toPositiveNumber(value) {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function roundCurrency(value) {
  return Math.round(value / 1000) * 1000;
}

function getVolumetricWeight(length, width, height, divisor) {
  const l = toPositiveNumber(length);
  const w = toPositiveNumber(width);
  const h = toPositiveNumber(height);
  if (!l || !w || !h || !divisor) return 0;
  return (l * w * h) / divisor;
}

function determineDomesticZone(fromCity, fromDistrict, toCity, toDistrict) {
  const fCity = String(fromCity || "")
    .trim()
    .toLowerCase();
  const tCity = String(toCity || "")
    .trim()
    .toLowerCase();
  const fDistrict = String(fromDistrict || "")
    .trim()
    .toLowerCase();
  const tDistrict = String(toDistrict || "")
    .trim()
    .toLowerCase();

  if (fCity && tCity && fCity === tCity) {
    if (fDistrict && tDistrict && fDistrict === tDistrict)
      return "same_district";
    return "same_city";
  }
  return "inter_city";
}

function parseEstimateRangeToHours(estimateText) {
  const text = String(estimateText || "")
    .trim()
    .toLowerCase();
  if (!text) return { minHours: 24, maxHours: 48 };

  const rangeMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(giờ|gio|h|ngày|ngay|d)/i,
  );
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(",", "."));
    const max = parseFloat(rangeMatch[2].replace(",", "."));
    const unit = rangeMatch[3];
    const multiplier = /ngày|ngay|d/i.test(unit) ? 24 : 1;
    return {
      minHours: Math.max(1, Math.round(min * multiplier)),
      maxHours: Math.max(1, Math.round(max * multiplier)),
    };
  }

  const singleMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(giờ|gio|h|ngày|ngay|d)/i,
  );
  if (singleMatch) {
    const value = parseFloat(singleMatch[1].replace(",", "."));
    const unit = singleMatch[2];
    const multiplier = /ngày|ngay|d/i.test(unit) ? 24 : 1;
    const hours = Math.max(1, Math.round(value * multiplier));
    return { minHours: hours, maxHours: hours };
  }

  return { minHours: 24, maxHours: 48 };
}

function formatEstimateFromHours(minHours, maxHours) {
  const minH = Math.max(1, Math.round(minHours));
  const maxH = Math.max(minH, Math.round(maxHours));

  if (maxH <= 24) {
    if (minH === maxH) return `${minH} giờ`;
    return `${minH}-${maxH} giờ`;
  }

  const minDay = Math.max(1, Math.ceil(minH / 24));
  const maxDay = Math.max(minDay, Math.ceil(maxH / 24));
  if (minDay === maxDay) return `${minDay} ngày`;
  return `${minDay}-${maxDay} ngày`;
}

function getDomesticEstimateAdjustmentHours(zoneKey, billableWeight, itemType) {
  let adjust = 0;

  if (zoneKey === "inter_city") {
    if (billableWeight > 40) adjust += 48;
    else if (billableWeight > 20) adjust += 24;
    else if (billableWeight > 10) adjust += 12;
    else if (billableWeight > 5) adjust += 6;
  } else {
    if (billableWeight > 20) adjust += 10;
    else if (billableWeight > 10) adjust += 6;
    else if (billableWeight > 5) adjust += 3;
    else if (billableWeight > 2) adjust += 1;
  }

  const itemAdjustByType = {
    "gia-tri-cao": 0,
    "de-vo": zoneKey === "inter_city" ? 8 : 2,
    "chat-long": zoneKey === "inter_city" ? 6 : 1,
    "pin-lithium": zoneKey === "inter_city" ? 12 : 3,
    "dong-lanh": zoneKey === "inter_city" ? -4 : -1,
    "cong-kenh": zoneKey === "inter_city" ? 12 : 4,
  };
  adjust += itemAdjustByType[itemType] || 0;

  return adjust;
}

function buildDomesticEstimate(
  serviceConfig,
  zoneKey,
  billableWeight,
  itemType,
) {
  const estimateText = serviceConfig.estimate[zoneKey] || "";
  const parsed = parseEstimateRangeToHours(estimateText);
  const adjust = getDomesticEstimateAdjustmentHours(
    zoneKey,
    billableWeight,
    itemType,
  );
  const minHours = Math.max(1, parsed.minHours + adjust);
  const maxHours = Math.max(minHours, parsed.maxHours + adjust);
  return formatEstimateFromHours(minHours, maxHours);
}

function getDomesticVehicleSuggestion(
  serviceType,
  zoneKey,
  billableWeight,
  itemType,
) {
  if (itemType === "cong-kenh" || billableWeight >= 40) {
    return zoneKey === "inter_city"
      ? "Xe tải liên tỉnh (2-5 tấn)"
      : "Xe tải nhẹ (1-2 tấn)";
  }
  if (itemType === "dong-lanh") return "Xe tải lạnh/xe van lạnh";
  if (itemType === "de-vo" || billableWeight >= 15) return "Xe van/xe tải nhẹ";
  if (itemType === "pin-lithium" && zoneKey === "inter_city")
    return "Xe tải liên tỉnh (hạn chế hàng không)";

  if (serviceType === "slow") {
    return zoneKey === "inter_city"
      ? "Xe tải ghép liên tỉnh"
      : "Xe tải nhẹ ghép tuyến";
  }
  if (
    serviceType === "fast" &&
    zoneKey !== "inter_city" &&
    billableWeight <= 15
  ) {
    return "Xe máy/xe van nhanh";
  }
  if (
    serviceType === "express" &&
    zoneKey !== "inter_city" &&
    billableWeight <= 10
  ) {
    return "Xe máy";
  }
  if (zoneKey === "inter_city") return "Xe tải liên tỉnh + trung chuyển";
  return "Xe máy";
}

function getInternationalEstimateAdjustmentDays(
  zoneKey,
  billableWeight,
  itemType,
) {
  let adjustDays = 0;

  if (billableWeight > 50) adjustDays += 5;
  else if (billableWeight > 30) adjustDays += 3;
  else if (billableWeight > 15) adjustDays += 2;
  else if (billableWeight > 5) adjustDays += 1;

  const itemAdjustByType = {
    "de-vo": 1,
    "chat-long": 1,
    "pin-lithium": 2,
    "dong-lanh": 1,
    "cong-kenh": 2,
  };
  adjustDays += itemAdjustByType[itemType] || 0;

  const zoneAdjustByKey = {
    asia: 0,
    europe: 0,
    america: 1,
    oceania: 1,
    africa: 1,
    other: 1,
  };
  adjustDays += zoneAdjustByKey[zoneKey] || 0;

  return adjustDays;
}

function buildInternationalEstimate(
  serviceConfig,
  zoneKey,
  billableWeight,
  itemType,
) {
  const estimateText =
    serviceConfig.estimate[zoneKey] || serviceConfig.estimate.other || "";
  const parsed = parseEstimateRangeToHours(estimateText);
  const adjustDays = getInternationalEstimateAdjustmentDays(
    zoneKey,
    billableWeight,
    itemType,
  );
  const adjustHours = adjustDays * 24;
  const minHours = Math.max(24, parsed.minHours + adjustHours);
  const maxHours = Math.max(minHours, parsed.maxHours + adjustHours);
  return formatEstimateFromHours(minHours, maxHours);
}

function getInternationalVehicleSuggestion(zoneKey, billableWeight, itemType) {
  if (itemType === "pin-lithium") {
    return "Đường bộ/biển + xe tải chặng cuối";
  }
  if (itemType === "cong-kenh" || billableWeight >= 30) {
    return "Đường biển/đường bộ + xe tải chặng cuối";
  }
  if (zoneKey === "asia" && billableWeight <= 5) {
    return "Máy bay + xe van chặng cuối";
  }
  return "Máy bay + xe tải chặng cuối";
}

function calculateShipping(
  area,
  level,
  weight,
  l,
  r,
  c,
  codValue = 0, // giá trị thu hộ
  insuranceValue = 0, // giá trị khai giá để tính bảo hiểm
) {
  const dimWeight = (l * r * c) / 6000;
  const finalWeight = Math.max(weight, dimWeight);
  const config = SHIPPING_DATA[area][level];
  let total = config.base;

  if (finalWeight > 0.5) {
    total += Math.ceil((finalWeight - 0.5) / 0.5) * config.next;
  }

  let addonFee = 0;
  if (codValue > SHIPPING_DATA.addons.cod.threshold) {
    addonFee += Math.max(
      codValue * SHIPPING_DATA.addons.cod.fee_rate,
      SHIPPING_DATA.addons.cod.min,
    );
  }
  if (insuranceValue > 0) {
    addonFee += insuranceValue * SHIPPING_DATA.addons.ins.fee_rate;
  }

  return {
    shipFee: total,
    addonFee: addonFee,
    total: total + addonFee,
    weight: finalWeight.toFixed(2),
    estimate: config.time,
  };
}

function calculateDomesticQuote(payload) {
  const config = QUOTE_SHIPPING_DATA.domestic;
  const quantity = Math.max(
    1,
    Math.round(toPositiveNumber(payload.quantity) || 1),
  );
  const zoneKey = determineDomesticZone(
    payload.fromCity,
    payload.fromDistrict,
    payload.toCity,
    payload.toDistrict,
  );
  const billableWeightPerPackage = Math.max(
    toPositiveNumber(payload.weight),
    getVolumetricWeight(
      payload.length,
      payload.width,
      payload.height,
      config.volumeDivisor,
    ),
    0.1,
  );
  const billableWeight = billableWeightPerPackage * quantity;
  const baseIncludedWeight = Math.max(
    toPositiveNumber(config.baseIncludedWeight),
    0.5,
  );
  const extraWeightSteps = Math.max(
    0,
    Math.ceil((billableWeightPerPackage - baseIncludedWeight) / 0.5),
  );
  const goodsFixedFee = config.goodsTypeFee[payload.itemType] || 0;
  const goodsMultiplier =
    (config.goodsTypeMultiplier || {})[payload.itemType] || 1;
  const codValue = toPositiveNumber(payload.codValue);
  const insuranceValue = toPositiveNumber(payload.insuranceValue);
  const codFreeThreshold = toPositiveNumber((config.cod || {}).freeThreshold);
  const codFee =
    codValue > codFreeThreshold
      ? Math.max(codValue * config.cod.rate, config.cod.min)
      : 0;
  const domesticInsurance = config.insurance || {};
  const freeThreshold = toPositiveNumber(domesticInsurance.freeThreshold);
  const insuranceRate = toPositiveNumber(domesticInsurance.rate);
  const insuranceMin = toPositiveNumber(domesticInsurance.minAboveThreshold);
  const insuranceFee =
    insuranceValue > freeThreshold && insuranceRate > 0
      ? Math.max(insuranceValue * insuranceRate, insuranceMin)
      : 0;

  const services = Object.entries(config.services).map(
    ([serviceType, serviceConfig]) => {
      const basePricePerPackage = serviceConfig.base[zoneKey] || 0;
      const weightFeePerPackage =
        extraWeightSteps * (serviceConfig.perHalfKg || 0);
      const basePrice = basePricePerPackage * quantity;
      const weightFee = weightFeePerPackage * quantity;
      const goodsMultiplierFee =
        (basePricePerPackage + weightFeePerPackage) *
        Math.max(goodsMultiplier - 1, 0) *
        quantity;
      const goodsFee = goodsFixedFee * quantity + goodsMultiplierFee;
      const total = roundCurrency(
        basePrice + weightFee + goodsFee + codFee + insuranceFee,
      );
      const estimate = buildDomesticEstimate(
        serviceConfig,
        zoneKey,
        billableWeight,
        payload.itemType,
      );
      const vehicleSuggestion = getDomesticVehicleSuggestion(
        serviceType,
        zoneKey,
        billableWeight,
        payload.itemType,
      );
      return {
        serviceType,
        serviceName: serviceConfig.label,
        estimate,
        vehicleSuggestion,
        total,
        breakdown: {
          basePrice,
          weightFee,
          goodsFee: roundCurrency(goodsFee),
          codFee,
          insuranceFee,
        },
      };
    },
  );

  services.sort((a, b) => a.total - b.total);

  return {
    mode: "domestic",
    zoneKey,
    zoneLabel: config.zoneLabels[zoneKey] || "",
    billableWeight: Number(billableWeight.toFixed(2)),
    billableWeightPerPackage: Number(billableWeightPerPackage.toFixed(2)),
    quantity,
    services,
  };
}

function getInternationalZone(countryName) {
  const zoneMap = QUOTE_SHIPPING_DATA.international.countryZoneMap;
  return zoneMap[countryName] || "other";
}

function calculateInternationalQuote(payload) {
  const config = QUOTE_SHIPPING_DATA.international;
  const quantity = Math.max(
    1,
    Math.round(toPositiveNumber(payload.quantity) || 1),
  );
  const zoneKey = getInternationalZone(payload.country);
  const goodsMultiplier = config.goodsTypeMultiplier[payload.itemType] || 1;
  const billableWeightPerPackage = Math.max(
    toPositiveNumber(payload.weight),
    getVolumetricWeight(
      payload.length,
      payload.width,
      payload.height,
      config.volumeDivisor,
    ),
    0.1,
  );
  const billableWeight = billableWeightPerPackage * quantity;
  const baseIncludedWeight = Math.max(
    toPositiveNumber(config.baseIncludedWeight),
    0.5,
  );
  const extraWeightSteps = Math.max(
    0,
    Math.ceil((billableWeightPerPackage - baseIncludedWeight) / 0.5),
  );
  const customsFeePerPackage =
    config.customsFee[zoneKey] || config.customsFee.other || 0;
  const customsFee = customsFeePerPackage * quantity;
  const insuranceValue = toPositiveNumber(payload.insuranceValue);
  const intlInsurance = config.insurance || {};
  const intlInsuranceRate = toPositiveNumber(intlInsurance.rate);
  const intlInsuranceMin = toPositiveNumber(intlInsurance.min);
  const insuranceFee =
    insuranceValue > 0 && intlInsuranceRate > 0
      ? Math.max(insuranceValue * intlInsuranceRate, intlInsuranceMin)
      : 0;

  const services = Object.entries(config.services).map(
    ([serviceType, serviceConfig]) => {
      const basePricePerPackage =
        serviceConfig.base[zoneKey] || serviceConfig.base.other || 0;
      const perHalf =
        serviceConfig.perHalfKg[zoneKey] || serviceConfig.perHalfKg.other || 0;
      const weightFeePerPackage = extraWeightSteps * perHalf;
      const basePrice = basePricePerPackage * quantity;
      const weightFee = weightFeePerPackage * quantity;
      const goodsAdjustedFee =
        (basePricePerPackage + weightFeePerPackage) *
        (goodsMultiplier - 1) *
        quantity;
      const fuelFee =
        (basePricePerPackage + weightFeePerPackage) *
        config.fuelRate *
        quantity;
      const securityFee = config.securityFee * quantity;
      const total = roundCurrency(
        basePrice +
          weightFee +
          goodsAdjustedFee +
          fuelFee +
          customsFee +
          securityFee +
          insuranceFee,
      );
      const estimate = buildInternationalEstimate(
        serviceConfig,
        zoneKey,
        billableWeight,
        payload.itemType,
      );
      const vehicleSuggestion = getInternationalVehicleSuggestion(
        zoneKey,
        billableWeight,
        payload.itemType,
      );

      return {
        serviceType,
        serviceName: serviceConfig.label,
        estimate,
        vehicleSuggestion,
        total,
        breakdown: {
          basePrice,
          weightFee,
          goodsAdjustedFee: roundCurrency(goodsAdjustedFee),
          fuelFee: roundCurrency(fuelFee),
          customsFee,
          securityFee,
          insuranceFee,
        },
      };
    },
  );

  services.sort((a, b) => a.total - b.total);

  return {
    mode: "international",
    zoneKey,
    zoneLabel: config.zoneLabels[zoneKey] || "",
    billableWeight: Number(billableWeight.toFixed(2)),
    billableWeightPerPackage: Number(billableWeightPerPackage.toFixed(2)),
    quantity,
    services,
  };
}

if (typeof window !== "undefined") {
  window.SHIPPING_DATA = SHIPPING_DATA;
  window.QUOTE_SHIPPING_DATA = QUOTE_SHIPPING_DATA;
  window.calculateShipping = calculateShipping;
  window.calculateDomesticQuote = calculateDomesticQuote;
  window.calculateInternationalQuote = calculateInternationalQuote;
}
