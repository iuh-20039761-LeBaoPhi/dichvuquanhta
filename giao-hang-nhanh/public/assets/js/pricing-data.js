let SHIPPING_DATA = {};
let QUOTE_SHIPPING_DATA = {};

function resolvePricingDataUrl() {
  if (typeof window === "undefined") return "assets/data/pricing-data.json";
  const inPublicDir = window.location.pathname
    .toLowerCase()
    .includes("/public/");
  const basePath =
    typeof window.apiBasePath === "string"
      ? window.apiBasePath
      : inPublicDir
        ? ""
        : "public/";
  return `${basePath}assets/data/pricing-data.json`;
}

function loadPricingDataSync() {
  if (typeof XMLHttpRequest === "undefined") return;
  const url = resolvePricingDataUrl();
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      const parsed = JSON.parse(xhr.responseText);
      
      // Khôi phục mảng json cũ (English) nếu là phiên bản cũ
      if (parsed.SHIPPING_DATA) SHIPPING_DATA = parsed.SHIPPING_DATA;
      if (parsed.QUOTE_SHIPPING_DATA) QUOTE_SHIPPING_DATA = parsed.QUOTE_SHIPPING_DATA;
      
      // Adapter cho cấu trúc Tiếng Việt mới "BANGGIA" và "BAOGIACHITIET"
      if (parsed.BANGGIA && parsed.BAOGIACHITIET) {
        const bd = parsed.BAOGIACHITIET.noidia;
        QUOTE_SHIPPING_DATA = {
          cities: parsed.BAOGIACHITIET.thanhpho,
          domestic: {
            cityOptions: bd.danhsachthanhpho,
            volumeDivisor: 6000,
            baseIncludedWeight: 2,
            zoneLabels: {
              same_district: "Nội quận/huyện",
              same_city: "Nội thành",
              inter_city: "Liên tỉnh"
            },
            goodsTypeFee: {
              "thuong": bd.philoaihang.thuong !== undefined ? bd.philoaihang.thuong : 0,
              "de-vo": (bd.philoaihang.devo || 0),
              "gia-tri-cao": (bd.philoaihang.giatricao || 0),
              "mui-hoi": (bd.philoaihang.muihoi || 5000),
              "chat-long": (bd.philoaihang.chatlong || 0),
              "pin-lithium": (bd.philoaihang.pinlithium || 0),
              "dong-lanh": (bd.philoaihang.donglanh || 0),
              "cong-kenh": (bd.philoaihang.congkenh || 0)
            },
            goodsTypeDescription: bd.motaloaihang || {},
            distanceConfig: (function() {
              // Hỗ trợ cả key mới (cauhinh_khoangcach) lẫn key cũ (distance_config)
              const ck = bd.cauhinh_khoangcach;
              const dc = bd.distance_config;
              if (ck) return {
                base_km: ck.km_coban || 3,
                base_price: ck.gia_coban || 20000,
                next_km_price: ck.gia_tiep_theo_km || 5000,
                long_distance_threshold: ck.nguong_xa || 50,
                long_distance_price: ck.gia_xa || 3500,
                base_included_weight: ck.can_mien_phi || 2,
                volume_divisor: ck.he_so_the_tich || 6000
              };
              if (dc) return dc;
              return { base_km: 3, base_price: 20000, next_km_price: 5000, long_distance_threshold: 50, long_distance_price: 3500 };
            })(),
            insuranceFreeThreshold: (parsed.BANGGIA.phuthu.baohiem && parsed.BANGGIA.phuthu.baohiem.nguong) || 1000000,
            codFreeThreshold: parsed.BANGGIA.phuthu.thuho.nguong || 0,
            goodsTypeMultiplier: {
              "chat-long": 1.1
            },
            cod: {
              freeThreshold: parsed.BANGGIA.phuthu.thuho.nguong || 0,
              rate: parsed.BANGGIA.phuthu.thuho.kieu || 0.012,
              min: parsed.BANGGIA.phuthu.thuho.toithieu || 15000
            },
            insurance: {
              freeThreshold: (parsed.BANGGIA.phuthu.baohiem && parsed.BANGGIA.phuthu.baohiem.nguong) || 1000000,
              rate: (parsed.BANGGIA.phuthu.baohiem && parsed.BANGGIA.phuthu.baohiem.kieu) || 0.005,
              minAboveThreshold: (parsed.BANGGIA.phuthu.baohiem && parsed.BANGGIA.phuthu.baohiem.toithieu) || 5000
            },
            services: {
              standard: {
                label: "Gói Tiêu chuẩn",
                base: {
                  same_district: bd.dichvu.tieuchuan.coban.cungquan || bd.dichvu.tieuchuan.coban.cungtinh || 18000,
                  same_city: bd.dichvu.tieuchuan.coban.khacquan || bd.dichvu.tieuchuan.coban.cungtinh || 26000,
                  inter_city: bd.dichvu.tieuchuan.coban.lientinh || 39000
                },
                perHalfKg: bd.dichvu.tieuchuan.buoctiep || 3500,
                estimate: {
                  same_district: "4-6 giờ", same_city: "8-12 giờ", inter_city: "1-3 ngày"
                }
              },
              fast: {
                label: "Gói Nhanh",
                base: {
                  same_district: bd.dichvu.nhanh.coban.cungquan || bd.dichvu.nhanh.coban.cungtinh || 24000,
                  same_city: bd.dichvu.nhanh.coban.khacquan || bd.dichvu.nhanh.coban.cungtinh || 34000,
                  inter_city: bd.dichvu.nhanh.coban.lientinh || 49000
                },
                perHalfKg: bd.dichvu.nhanh.buoctiep || 4500,
                estimate: {
                  same_district: "2-3 giờ", same_city: "4-8 giờ", inter_city: "18-30 giờ"
                }
              },
              express: {
                label: "Gói Hỏa tốc",
                base: {
                  same_district: bd.dichvu.hoatoc.coban.cungquan || bd.dichvu.hoatoc.coban.cungtinh || 32000,
                  same_city: bd.dichvu.hoatoc.coban.khacquan || bd.dichvu.hoatoc.coban.cungtinh || 45000,
                  inter_city: bd.dichvu.hoatoc.coban.lientinh || 60000
                },
                perHalfKg: bd.dichvu.hoatoc.buoctiep || 6500,
                estimate: {
                  same_district: "1-2 giờ", same_city: "2-4 giờ", inter_city: "12-24 giờ"
                }
              }
            }
          }
        };
      }
      return;
    }
    console.error("Không thể tải dữ liệu bảng giá:", url, xhr.status);
  } catch (err) {
    console.error("Không thể tải dữ liệu bảng giá:", url, err);
  }
}

loadPricingDataSync();

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
  // Giả sử weight truyền vào đã là tổng weight của đơn hàng
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

function cleanString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Ước tính khoảng cách (Km) dựa trên Tỉnh/Thành & Quận/Huyện.
 * Hàm mô phỏng để tạo ra con số KM có tính chất minh hoạ logic.
 */
function estimateDistance(fromCity, fromProv, toCity, toProv) {
  const c1 = cleanString(fromCity);
  const c2 = cleanString(toCity);
  const p1 = cleanString(fromProv);
  const p2 = cleanString(toProv);

  if (c1 === c2 && p1 === p2) return 3.5 + ((c1.length + p1.length) % 5);
  if (c1 === c2 && p1 !== p2) return 12.5 + ((p1.length + p2.length) % 20);

  const distanceMatrix = {
    "ho chi minh_ha noi": 1710, "ha noi_ho chi minh": 1710,
    "ho chi minh_da nang": 964, "da nang_ho chi minh": 964,
    "ha noi_da nang": 766, "da nang_ha noi": 766,
    "ho chi minh_can tho": 165, "can tho_ho chi minh": 165,
    "ho chi minh_hai phong": 1780, "hai phong_ho chi minh": 1780,
    "ha noi_hai phong": 120, "hai phong_ha noi": 120,
    "da nang_can tho": 1130, "can tho_da nang": 1130,
  };
  
  const routeKey = `${c1}_${c2}`;
  if (distanceMatrix[routeKey]) return distanceMatrix[routeKey];
  
  return 200 + ((c1.length * c2.length * 15) % 1300);
}

function calculateDomesticQuote(payload) {
  const config = QUOTE_SHIPPING_DATA.domestic;
  
  // Hỗ trợ tên trường mới (tiếng Việt không dấu) lẫn tên cũ (tiếng Anh)
  const norm = {
    itemType:       payload.loai_hang      || payload.itemType      || "thuong",
    itemName:       payload.ten_hang       || payload.itemName      || "",
    weight:         toPositiveNumber(payload.can_nang       || payload.weight),
    quantity:       Math.max(1, Math.round(toPositiveNumber(payload.so_luong || payload.quantity) || 1)),
    length:         toPositiveNumber(payload.chieu_dai      || payload.length),
    width:          toPositiveNumber(payload.chieu_rong     || payload.width),
    height:         toPositiveNumber(payload.chieu_cao      || payload.height),
    codValue:       toPositiveNumber(payload.phi_thu_ho     || payload.codValue),
    insuranceValue: toPositiveNumber(payload.gia_tri_khai_bao || payload.insuranceValue),
    fromCity:       payload.thanh_pho_gui  || payload.fromCity      || "",
    fromDistrict:   payload.quan_huyen_gui || payload.fromDistrict  || "",
    toCity:         payload.thanh_pho_nhan || payload.toCity        || "",
    toDistrict:     payload.quan_huyen_nhan|| payload.toDistrict    || "",
    // Khoảng cách thực từ OSM (ưu tiên sử dụng nếu có)
    khoangCachKm:   toPositiveNumber(payload.khoang_cach_km || payload.khoangCachKm || 0),
  };

  const quantity = norm.quantity;
  const zoneKey = determineDomesticZone(
    norm.fromCity, norm.fromDistrict,
    norm.toCity,   norm.toDistrict,
  );
  
  // Dùng khoảng cách OSM nếu có, nếu không ước tính từ zone
  const distanceKm = norm.khoangCachKm > 0
    ? norm.khoangCachKm
    : estimateDistance(norm.fromCity, norm.fromDistrict, norm.toCity, norm.toDistrict);
  const dc = config.distanceConfig || {};
  const volumeDivisor = dc.volume_divisor || 6000;
  
  const billableWeightPerPackage = Math.max(
    norm.weight,
    getVolumetricWeight(
      norm.length,
      norm.width,
      norm.height,
      volumeDivisor,
    ),
    0.1,
  );
  const billableWeight = billableWeightPerPackage * quantity;

  // Quy tắc mới: Miễn phí x kg đầu (thường là 2kg) cho TOÀN ĐƠN HÀNG
  const baseIncludedWeight = toPositiveNumber(dc.base_included_weight || dc.can_mien_phi) || 2;
  const extraWeightSteps = Math.max(
    0,
    Math.ceil((billableWeight - baseIncludedWeight) / 0.5),
  );
  const goodsFixedFee = config.goodsTypeFee[norm.itemType] || 0;
  const goodsMultiplier =
    (config.goodsTypeMultiplier || {})[norm.itemType] || 1;
  const codValue = norm.codValue;
  const insuranceValue = norm.insuranceValue;
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
      // Logic mới: Tính phí cơ bản theo Km thay vì theo Zone
      const dc = config.distanceConfig;
      let basePricePerOrder = dc.base_price;
      const extraKm = Math.max(0, distanceKm - dc.base_km);
      
      if (extraKm > 0) {
        if (distanceKm <= dc.long_distance_threshold) {
          basePricePerOrder += extraKm * dc.next_km_price;
        } else {
          // Nếu đi đường xa (Liên tỉnh), ưu đãi giảm đơn giá/km
          basePricePerOrder += (dc.long_distance_threshold - dc.base_km) * dc.next_km_price;
          basePricePerOrder += (distanceKm - dc.long_distance_threshold) * dc.long_distance_price;
        }
      }

      // Hệ số nhân theo gói dịch vụ (Tùy chọn: Hoả tốc nhân 1.5, Nhanh nhân 1.2)
      const serviceMultipliers = { "standard": 1, "nhanh": 1.25, "hoatoc": 1.5 };
      const sMul = serviceMultipliers[serviceType] || 1;
      basePricePerOrder = basePricePerOrder * sMul;

      const weightFeePerOrder = extraWeightSteps * (serviceConfig.perHalfKg || 0);
      const basePrice = basePricePerOrder;
      const weightFee = weightFeePerOrder;
      const goodsMultiplierFee =
        (basePricePerOrder + weightFeePerOrder) *
        Math.max(goodsMultiplier - 1, 0);
      const goodsFee = (goodsFixedFee * quantity) + goodsMultiplierFee;
      const total = roundCurrency(
        basePrice + weightFee + goodsFee + codFee + insuranceFee,
      );
      const estimate = buildDomesticEstimate(
        serviceConfig,
        zoneKey,
        billableWeight,
        norm.itemType,
      );
      const vehicleSuggestion = getDomesticVehicleSuggestion(
        serviceType,
        zoneKey,
        billableWeight,
        norm.itemType,
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
    distanceKm,
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
      const basePricePerOrder =
        serviceConfig.base[zoneKey] || serviceConfig.base.other || 0;
      const perHalf =
        serviceConfig.perHalfKg[zoneKey] || serviceConfig.perHalfKg.other || 0;
      const weightFeePerOrder = extraWeightSteps * perHalf;
      const basePrice = basePricePerOrder;
      const weightFee = weightFeePerOrder;
      const goodsAdjustedFee =
        (basePricePerOrder + weightFeePerOrder) *
        (goodsMultiplier - 1);
      // Fix: dùng đúng biến đã khai báo ở trên (basePricePerOrder, weightFeePerOrder)
      const basePricePerPackage = basePricePerOrder;
      const weightFeePerPackage = weightFeePerOrder;
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

/**
 * Trả về thông tin (tên + mô tả phụ phí) của loại hàng nội địa
 */
function getDomesticGoodsTypeInfo(itemTypeKey) {
  const config = QUOTE_SHIPPING_DATA.domestic || {};
  const fee = (config.goodsTypeFee || {})[itemTypeKey] || 0;
  const desc = (config.goodsTypeDescription || {})[itemTypeKey] || "";
  const nameMap = {
    "thuong": "Hàng thông thường",
    "de-vo": "Hàng dễ vỡ",
    "gia-tri-cao": "Hàng giá trị cao",
    "mui-hoi": "Hàng có mùi hôi",
    "chat-long": "Hàng chất lỏng/Hóa phẩm",
    "pin-lithium": "Hàng có pin Lithium",
    "dong-lanh": "Hàng đông lạnh/Tươi sống",
    "cong-kenh": "Hàng cồng kềnh/Quá khổ"
  };
  return {
    name: nameMap[itemTypeKey] || itemTypeKey,
    surcharge: fee,
    description: desc
  };
}

/**
 * Xây dựng chuỗi giải thích công thức tính cước nội địa bằng ngôn ngữ đơn giản.
 * Trả về mảng các bước tính để hiển thị trên UI.
 */
function buildDomesticPricingExplanation(payload, result) {
  if (!result || !Array.isArray(result.services) || !result.services.length) return [];

  const config = QUOTE_SHIPPING_DATA.domestic || {};
  const dc = config.distanceConfig || {};
  const baseIncludedWeight = toPositiveNumber(dc.base_included_weight) || 2;
  const volumeDivisor = dc.volume_divisor || 6000;
  const codFreeThreshold = toPositiveNumber((config.cod || {}).freeThreshold) || 0;
  const insuranceFreeThreshold = toPositiveNumber((config.insurance || {}).freeThreshold) || 1000000;

  const weight = toPositiveNumber(payload.weight);
  const length = toPositiveNumber(payload.length);
  const width = toPositiveNumber(payload.width);
  const height = toPositiveNumber(payload.height);
  const quantity = Math.max(1, Math.round(toPositiveNumber(payload.quantity) || 1));
  const codValue = toPositiveNumber(payload.codValue);
  const insuranceValue = toPositiveNumber(payload.insuranceValue);

  const volWeight = (length && width && height) ? (length * width * height) / volumeDivisor : 0;
  const billableWeightPerPkg = Math.max(weight, volWeight, 0.1);
  const billableWeight = billableWeightPerPkg * quantity;
  const extraSteps = Math.max(0, Math.ceil((billableWeight - baseIncludedWeight) / 0.5));

  const goodsInfo = getDomesticGoodsTypeInfo(payload.itemType);
  const multiplier = (config.goodsTypeMultiplier || {})[payload.itemType] || 1;

  const zoneLabels = {
    same_district: "Nội quận/huyện",
    same_city: "Nội thành (khác quận)",
    inter_city: "Liên tỉnh"
  };

  const steps = [];

  // Bước 1: Xác định vùng & Khoảng cách
  const distKm = result.distanceKm ? ` (~${result.distanceKm.toFixed(1)} km)` : "";
  steps.push({
    step: 1,
    title: "Xác định vùng & Khoảng cách tuyến",
    detail: `Từ ${payload.fromDistrict || "?"}, ${payload.fromCity || "?"} → ${payload.toDistrict || "?"}, ${payload.toCity || "?"}: <strong>${zoneLabels[result.zoneKey] || result.zoneKey}</strong>${distKm}`,
    formula: null
  });

  // Bước 2: Trọng lượng tính cước
  let weightStep;
  if (volWeight > weight && volWeight > 0) {
    weightStep = {
      step: 2,
      title: "Trọng lượng tính cước (lấy max thực cân / thể tích)",
      detail: `Trọng lượng thực: <strong>${weight} kg</strong> | Thể tích: D${length}×R${width}×C${height} cm ÷ 6.000 = <strong>${volWeight.toFixed(2)} kg</strong>`,
      formula: `→ Lấy giá trị lớn hơn: <strong>${billableWeightPerPkg.toFixed(2)} kg/kiện × ${quantity} kiện = ${billableWeight.toFixed(2)} kg</strong>`
    };
  } else {
    weightStep = {
      step: 2,
      title: "Trọng lượng tính cước",
      detail: `Trọng lượng thực: <strong>${weight} kg</strong>` + (volWeight > 0 ? ` | Thể tích quy đổi: <strong>${volWeight.toFixed(2)} kg</strong> (thấp hơn, không áp dụng)` : ""),
      formula: `→ Tính cước theo: <strong>${billableWeightPerPkg.toFixed(2)} kg/kiện × ${quantity} kiện = ${billableWeight.toFixed(2)} kg</strong>`
    };
  }
  steps.push(weightStep);

  // Bước 3 + 4: Phí cơ bản theo Km + phí cân nặng
  result.services.forEach((svc, idx) => {
    const bd = svc.breakdown || {};
    const weightExplain = extraSteps > 0
      ? `${extraSteps} bậc × phí/bậc = <strong>${(bd.weightFee || 0).toLocaleString("vi-VN")}đ</strong> (mỗi 0.5kg vượt ${baseIncludedWeight}kg đầu)`
      : `Dưới ${baseIncludedWeight}kg → <strong>Miễn phí trọng lượng</strong>`;
    
    // Giải thích chi tiết phí KM cho bước 3
    let kmExplain = `Km cơ bản (${dc.base_km}km): <strong>${(dc.base_price * (svc.serviceType === "hoatoc" ? 1.5 : (svc.serviceType === "nhanh" ? 1.25 : 1))).toLocaleString("vi-VN")}đ</strong>`;
    const extraKm = Math.max(0, result.distanceKm - dc.base_km);
    if (extraKm > 0) {
       kmExplain += ` | Km vượt (${extraKm.toFixed(1)}km): <strong>+${(bd.basePrice - dc.base_price * (svc.serviceType === "hoatoc" ? 1.5 : (svc.serviceType === "nhanh" ? 1.25 : 1))).toLocaleString("vi-VN")}đ</strong>`;
    }

    steps.push({
      step: idx === 0 ? 3 : undefined,
      serviceContext: svc.serviceName,
      title: idx === 0 ? `Phí vận chuyển theo Km + Phí trọng lượng` : null,
      detail: `[${svc.serviceName}] ${kmExplain}.<br>Phí cân: ${weightExplain}`,
      formula: null
    });
  });

  // Bước 4: Phụ phí loại hàng
  if (goodsInfo.surcharge > 0 || multiplier > 1) {
    let goodsDetail = `Loại hàng: <strong>${goodsInfo.name}</strong>`;
    if (goodsInfo.surcharge > 0) {
      goodsDetail += ` → Phụ phí cố định: <strong>+${goodsInfo.surcharge.toLocaleString("vi-VN")}đ/kiện × ${quantity} kiện</strong>`;
    }
    if (multiplier > 1) {
      goodsDetail += ` + Hệ số nhân ${multiplier} (tăng ${((multiplier - 1) * 100).toFixed(0)}% phần phí cơ bản + cân nặng)`;
    }
    if (goodsInfo.description) {
      goodsDetail += `<br><em style="color:#666;font-size:0.88em">Lý do: ${goodsInfo.description}</em>`;
    }
    steps.push({
      step: 4,
      title: "Phụ phí tính chất hàng hóa",
      detail: goodsDetail,
      formula: null
    });
  } else {
    steps.push({
      step: 4,
      title: "Phụ phí tính chất hàng hóa",
      detail: `Loại hàng: <strong>${goodsInfo.name}</strong> → <strong>Không phụ phí</strong>`,
      formula: null
    });
  }

  // Bước 5: Phí COD
  const codFee = result.services[0] ? (result.services[0].breakdown || {}).codFee || 0 : 0;
  if (codValue > 0) {
    const codConfig = config.cod || {};
    const codRate = (codConfig.rate || 0.012) * 100;
    const codMin = codConfig.min || 15000;
    if (codValue <= codFreeThreshold) {
      steps.push({
        step: 5,
        title: "Phí thu hộ COD",
        detail: `Giá trị thu hộ: <strong>${codValue.toLocaleString("vi-VN")}đ</strong> ≤ ngưỡng miễn phí ${codFreeThreshold.toLocaleString("vi-VN")}đ → <strong>Miễn phí COD</strong>`,
        formula: null
      });
    } else {
      steps.push({
        step: 5,
        title: "Phí thu hộ COD",
        detail: `Giá trị thu hộ: <strong>${codValue.toLocaleString("vi-VN")}đ</strong> × ${codRate}% = ${(codValue * codConfig.rate).toLocaleString("vi-VN")}đ (tối thiểu ${codMin.toLocaleString("vi-VN")}đ)`,
        formula: `→ Phí COD: <strong>${codFee.toLocaleString("vi-VN")}đ</strong>`
      });
    }
  } else {
    steps.push({
      step: 5,
      title: "Phí thu hộ COD",
      detail: "Không sử dụng dịch vụ COD → <strong>0đ</strong>",
      formula: null
    });
  }

  // Bước 6: Phí bảo hiểm
  const insuranceFee = result.services[0] ? (result.services[0].breakdown || {}).insuranceFee || 0 : 0;
  if (insuranceValue > 0) {
    const insConfig = config.insurance || {};
    const insRate = (insConfig.rate || 0.005) * 100;
    const insMin = insConfig.minAboveThreshold || 5000;
    if (insuranceValue <= insuranceFreeThreshold) {
      steps.push({
        step: 6,
        title: "Phí bảo hiểm hàng hóa",
        detail: `Giá trị khai báo: <strong>${insuranceValue.toLocaleString("vi-VN")}đ</strong> ≤ ngưỡng miễn phí ${insuranceFreeThreshold.toLocaleString("vi-VN")}đ → <strong>Miễn phí bảo hiểm</strong>`,
        formula: null
      });
    } else {
      steps.push({
        step: 6,
        title: "Phí bảo hiểm hàng hóa",
        detail: `Giá trị khai báo: <strong>${insuranceValue.toLocaleString("vi-VN")}đ</strong> × ${insRate}% = ${(insuranceValue * (insConfig.rate || 0.005)).toLocaleString("vi-VN")}đ (tối thiểu ${insMin.toLocaleString("vi-VN")}đ)`,
        formula: `→ Phí bảo hiểm: <strong>${insuranceFee.toLocaleString("vi-VN")}đ</strong>`
      });
    }
  } else {
    steps.push({
      step: 6,
      title: "Phí bảo hiểm hàng hóa",
      detail: "Không khai báo giá trị bảo hiểm → <strong>0đ</strong>",
      formula: null
    });
  }

  return steps;
}

function getDomesticVehicleSuggestion(serviceType, zoneKey, billableWeight, itemType) {
  if (itemType === "cong-kenh" || billableWeight > 50) {
    return "Xe Tải (500kg - 1.5 tấn)";
  }
  if (billableWeight > 20) {
    return "Xe Bán Tải / Xe Lôi";
  }
  return "Xe Máy (Shipper)";
}

if (typeof window !== "undefined") {
  window.SHIPPING_DATA = SHIPPING_DATA;
  window.QUOTE_SHIPPING_DATA = QUOTE_SHIPPING_DATA;
  window.calculateShipping = calculateShipping;
  window.calculateDomesticQuote = calculateDomesticQuote;
  window.calculateInternationalQuote = calculateInternationalQuote;
  window.getDomesticGoodsTypeInfo = getDomesticGoodsTypeInfo;
  window.buildDomesticPricingExplanation = buildDomesticPricingExplanation;
  window.getDomesticVehicleSuggestion = getDomesticVehicleSuggestion;
}
