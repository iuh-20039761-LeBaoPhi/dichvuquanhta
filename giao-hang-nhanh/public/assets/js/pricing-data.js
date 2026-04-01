let SHIPPING_DATA = {};
let QUOTE_SHIPPING_DATA = {};

const ITEM_TYPE_KEY_ALIASES = {
  giatricao: "gia-tri-cao",
  devo: "de-vo",
  muihoi: "mui-hoi",
  chatlong: "chat-long",
  pinlithium: "pin-lithium",
  donglanh: "dong-lanh",
  congkenh: "cong-kenh",
};

function normalizeItemTypeKey(key) {
  const normalized = String(key || "")
    .trim()
    .toLowerCase();
  return ITEM_TYPE_KEY_ALIASES[normalized] || normalized;
}

function normalizeItemTypeMap(source = {}) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([key, value]) => [
      normalizeItemTypeKey(key),
      value,
    ]),
  );
}

const VEHICLE_KEY_ALIASES = {
  xemay: "xe_may",
  xeba: "xe_loi",
  xevan: "xe_ban_tai",
  xeta: "xe_tai",
  taior5: "xe_tai",
  taior10: "xe_tai",
  taior20: "xe_tai",
};

function normalizeVehicleKey(key) {
  const normalized = String(key || "")
    .trim()
    .toLowerCase();
  return VEHICLE_KEY_ALIASES[normalized] || normalized;
}

function buildDomesticVehicleOptions(
  rawVehicles = [],
  legacyMultipliers = {},
  legacyLabels = {},
) {
  const defaultVehicles = [
    {
      key: "xe_may",
      label: "Xe máy",
      multiplier: 1,
      description: "Mức chuẩn, không cộng thêm",
    },
    {
      key: "xe_loi",
      label: "Xe lôi / xe ba gác",
      multiplier: 2,
      description: "Phần vận chuyển tăng gấp 2 lần",
    },
    {
      key: "xe_ban_tai",
      label: "Xe bán tải / xe van",
      multiplier: 2.8,
      description: "Phần vận chuyển tăng gấp 2,8 lần",
    },
    {
      key: "xe_tai",
      label: "Xe tải nhẹ",
      multiplier: 4,
      description: "Phần vận chuyển tăng gấp 4 lần",
    },
  ];
  const vehicleMap = Object.fromEntries(
    defaultVehicles.map((item) => [item.key, { ...item }]),
  );
  const sourceVehicles =
    Array.isArray(rawVehicles) && rawVehicles.length
      ? rawVehicles
      : Object.keys({ ...legacyLabels, ...legacyMultipliers }).map((key) => ({
          key,
          label: legacyLabels[key],
          multiplier: legacyMultipliers[key],
        }));

  sourceVehicles.forEach((item) => {
    const normalizedKey = normalizeVehicleKey(item?.key);
    if (!normalizedKey || normalizedKey === "auto") return;

    const fallback = vehicleMap[normalizedKey] || {};
    const parsedMultiplier = Number(item?.multiplier ?? item?.he_so);
    vehicleMap[normalizedKey] = {
      key: normalizedKey,
      label: item?.label || item?.ten || fallback.label || normalizedKey,
      multiplier:
        Number.isFinite(parsedMultiplier) && parsedMultiplier > 0
          ? parsedMultiplier
          : fallback.multiplier || 1,
      description:
        item?.description ||
        item?.mo_ta ||
        fallback.description ||
        "Phần vận chuyển thay đổi theo hệ số phương tiện",
    };
  });

  return {
    auto: {
      key: "auto",
      label: "Để hệ thống tự đề xuất",
      multiplier: 1,
      description:
        "Hệ thống tự chọn xe phù hợp theo cân nặng, kích thước và loại hàng.",
    },
    ...vehicleMap,
  };
}

function getDisplayVehicleCatalog(data = {}) {
  return Object.values(
    buildDomesticVehicleOptions(
      data.phuong_tien,
      data.hesophuongtien,
      data.tenphuongtien,
    ),
  ).filter((item) => item.key !== "auto");
}

let DOMESTIC_VEHICLE_OPTIONS = buildDomesticVehicleOptions();

function normalizeInstantSurchargeConfig(rawConfig = {}) {
  const weatherSource =
    rawConfig.thoitiet && typeof rawConfig.thoitiet === "object"
      ? rawConfig.thoitiet
      : rawConfig;
  const timeSource =
    rawConfig.thoigian && typeof rawConfig.thoigian === "object"
      ? rawConfig.thoigian
      : {};

  const fallbackWeather = {
    macdinh: { ten: "Điều kiện bình thường", phicodinh: 0, heso: 1 },
  };
  const fallbackTime = {};

  const normalizeFeeMap = (source, fallback) =>
    Object.fromEntries(
      Object.entries({ ...fallback, ...source }).map(([key, value]) => [
        key,
        {
          key,
          label:
            (value && (value.ten || value.label)) ||
            (fallback[key] && fallback[key].ten) ||
            key,
          fixedFee: (value && (value.phicodinh ?? value.fixedFee)) || 0,
          multiplier: (value && (value.heso ?? value.multiplier)) || 1,
          start: (value && (value.batdau || value.start)) || "",
          end: (value && (value.ketthuc || value.end)) || "",
        },
      ]),
    );

  return {
    note:
      rawConfig.ghichu ||
      "Phụ phí dịch vụ chỉ là giá tham khảo, hệ thống sẽ đối chiếu lại khi tạo đơn.",
    weather: normalizeFeeMap(weatherSource, fallbackWeather),
    time: normalizeFeeMap(timeSource, fallbackTime),
  };
}

function resolvePricingDataUrl() {
  if (typeof window === "undefined") return "public/data/pricing-data.json";
  if (window.GiaoHangNhanhCore?.publicBasePath) {
    return `${window.GiaoHangNhanhCore.publicBasePath}data/pricing-data.json`;
  }

  const path = String(window.location.pathname || "").replace(/\\/g, "/");
  const marker = "/giao-hang-nhanh/";
  const markerIndex = path.toLowerCase().lastIndexOf(marker);
  const projectBasePath =
    markerIndex !== -1 ? path.slice(0, markerIndex + marker.length) : "/";
  return `${projectBasePath}public/data/pricing-data.json`;
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
      DOMESTIC_VEHICLE_OPTIONS = buildDomesticVehicleOptions(
        parsed.phuong_tien,
        parsed.hesophuongtien,
        parsed.tenphuongtien,
      );

      // Khôi phục mảng json cũ (English) nếu là phiên bản cũ
      if (parsed.SHIPPING_DATA) SHIPPING_DATA = parsed.SHIPPING_DATA;
      if (parsed.QUOTE_SHIPPING_DATA)
        QUOTE_SHIPPING_DATA = parsed.QUOTE_SHIPPING_DATA;

      // Adapter cho cấu trúc Tiếng Việt mới "BANGGIA" và "BAOGIACHITIET"
      if (parsed.BANGGIA && parsed.BAOGIACHITIET) {
        const bd = parsed.BAOGIACHITIET.noidia;
        const tenVung = bd.tenvung || {};
        const thoigianTieuChuan =
          (bd.dichvu.tieuchuan && bd.dichvu.tieuchuan.thoigian) || {};
        const thoigianNhanh =
          (bd.dichvu.nhanh && bd.dichvu.nhanh.thoigian) || {};
        const thoigianHoaToc =
          (bd.dichvu.hoatoc && bd.dichvu.hoatoc.thoigian) || {};
        const thoigianLapTuc =
          (bd.dichvu.laptuc && bd.dichvu.laptuc.thoigian) || {};
        const phiDichVuLapTuc =
          (bd.phidichvu && bd.phidichvu.giaongaylaptuc) || {};
        const instantSurcharges =
          normalizeInstantSurchargeConfig(phiDichVuLapTuc);
        QUOTE_SHIPPING_DATA = {
          cities: parsed.BAOGIACHITIET.thanhpho,
          domestic: {
            cityOptions: bd.danhsachthanhpho,
            volumeDivisor:
              (bd.cauhinh_khoangcach && bd.cauhinh_khoangcach.he_so_the_tich) ||
              6000,
            baseIncludedWeight:
              (bd.cauhinh_khoangcach && bd.cauhinh_khoangcach.can_mien_phi) ||
              2,
            zoneLabels: {
              same_district:
                tenVung.cung_quan || tenVung.same_district || "Nội quận/huyện",
              same_city: tenVung.noi_thanh || tenVung.same_city || "Nội thành",
              inter_city:
                tenVung.lien_tinh || tenVung.inter_city || "Liên tỉnh",
            },
            goodsTypeFee: normalizeItemTypeMap(bd.philoaihang || {}),
            goodsTypeLabel: normalizeItemTypeMap(bd.tenloaihang || {}),
            goodsTypeDescription: normalizeItemTypeMap(
              bd.motaloaihang || {},
            ),
            goodsTypeMultiplier: normalizeItemTypeMap(bd.hesoloaihang || {}),
            distanceConfig: (function () {
              // Hỗ trợ cả key mới (cauhinh_khoangcach) lẫn key cũ (distance_config)
              const ck = bd.cauhinh_khoangcach;
              const dc = bd.distance_config;
              if (ck)
                return {
                  base_km: ck.km_coban || 3,
                  base_price: ck.gia_coban || 20000,
                  next_km_price: ck.gia_tiep_theo_km || 5000,
                  long_distance_threshold: ck.nguong_xa || 50,
                  long_distance_price: ck.gia_xa || 3500,
                  base_included_weight: ck.can_mien_phi || 2,
                  volume_divisor: ck.he_so_the_tich || 6000,
                };
              if (dc) return dc;
              return {
                base_km: 3,
                base_price: 20000,
                next_km_price: 5000,
                long_distance_threshold: 50,
                long_distance_price: 3500,
              };
            })(),
            insuranceFreeThreshold:
              (parsed.BANGGIA.phuthu.baohiem &&
                parsed.BANGGIA.phuthu.baohiem.nguong) ||
              1000000,
            codFreeThreshold: parsed.BANGGIA.phuthu.thuho.nguong || 0,
            // (Removed hardcoded goodsTypeMultiplier)
            cod: {
              freeThreshold: parsed.BANGGIA.phuthu.thuho.nguong || 0,
              rate: parsed.BANGGIA.phuthu.thuho.kieu || 0.012,
              min: parsed.BANGGIA.phuthu.thuho.toithieu || 15000,
            },
            insurance: {
              freeThreshold:
                (parsed.BANGGIA.phuthu.baohiem &&
                  parsed.BANGGIA.phuthu.baohiem.nguong) ||
                1000000,
              rate:
                (parsed.BANGGIA.phuthu.baohiem &&
                  parsed.BANGGIA.phuthu.baohiem.kieu) ||
                0.005,
              minAboveThreshold:
                (parsed.BANGGIA.phuthu.baohiem &&
                  parsed.BANGGIA.phuthu.baohiem.toithieu) ||
                5000,
            },
            vehicleSuggestions: bd.goi_y_phuong_tien || {},
            instantSurcharges,
            serviceConditions: {
              instant: instantSurcharges.weather,
            },
            services: {
              standard: {
                label: "Gói Tiêu chuẩn",
                jsonKey: "tieuchuan",
                base: {
                  same_district:
                    bd.dichvu.tieuchuan.coban.cungquan ||
                    bd.dichvu.tieuchuan.coban.cungtinh ||
                    11000,
                  same_city:
                    bd.dichvu.tieuchuan.coban.khacquan ||
                    bd.dichvu.tieuchuan.coban.cungtinh ||
                    18000,
                  inter_city: bd.dichvu.tieuchuan.coban.lientinh || 30000,
                },
                perHalfKg: bd.dichvu.tieuchuan.buoctiep || 2000,
                estimate: {
                  same_district:
                    thoigianTieuChuan.cung_quan ||
                    thoigianTieuChuan.same_district ||
                    "",
                  same_city:
                    thoigianTieuChuan.noi_thanh ||
                    thoigianTieuChuan.same_city ||
                    "",
                  inter_city:
                    thoigianTieuChuan.lien_tinh ||
                    thoigianTieuChuan.inter_city ||
                    "",
                },
                serviceMultiplier:
                  bd.dichvu.tieuchuan.heso_dichvu !== undefined
                    ? bd.dichvu.tieuchuan.heso_dichvu
                    : 1,
                appliesServiceFee: !!bd.dichvu.tieuchuan.ap_dung_phi_dich_vu,
              },
              fast: {
                label: "Gói Nhanh",
                jsonKey: "nhanh",
                base: {
                  same_district:
                    bd.dichvu.nhanh.coban.cungquan ||
                    bd.dichvu.nhanh.coban.cungtinh ||
                    16000,
                  same_city:
                    bd.dichvu.nhanh.coban.khacquan ||
                    bd.dichvu.nhanh.coban.cungtinh ||
                    25000,
                  inter_city: bd.dichvu.nhanh.coban.lientinh || 40000,
                },
                perHalfKg: bd.dichvu.nhanh.buoctiep || 2500,
                estimate: {
                  same_district:
                    thoigianNhanh.cung_quan ||
                    thoigianNhanh.same_district ||
                    "2-3 giờ",
                  same_city:
                    thoigianNhanh.noi_thanh ||
                    thoigianNhanh.same_city ||
                    "4-8 giờ",
                  inter_city:
                    thoigianNhanh.lien_tinh ||
                    thoigianNhanh.inter_city ||
                    "18-30 giờ",
                },
                serviceMultiplier:
                  bd.dichvu.nhanh.heso_dichvu !== undefined
                    ? bd.dichvu.nhanh.heso_dichvu
                    : 1.25,
                appliesServiceFee: !!bd.dichvu.nhanh.ap_dung_phi_dich_vu,
              },
              express: {
                label: "Gói Hỏa tốc",
                jsonKey: "hoatoc",
                base: {
                  same_district:
                    bd.dichvu.hoatoc.coban.cungquan ||
                    bd.dichvu.hoatoc.coban.cungtinh ||
                    24000,
                  same_city:
                    bd.dichvu.hoatoc.coban.khacquan ||
                    bd.dichvu.hoatoc.coban.cungtinh ||
                    35000,
                  inter_city: bd.dichvu.hoatoc.coban.lientinh || 50000,
                },
                perHalfKg: bd.dichvu.hoatoc.buoctiep || 3500,
                estimate: {
                  same_district:
                    thoigianHoaToc.cung_quan ||
                    thoigianHoaToc.same_district ||
                    "1-2 giờ",
                  same_city:
                    thoigianHoaToc.noi_thanh ||
                    thoigianHoaToc.same_city ||
                    "2-4 giờ",
                  inter_city:
                    thoigianHoaToc.lien_tinh ||
                    thoigianHoaToc.inter_city ||
                    "12-24 giờ",
                },
                serviceMultiplier:
                  bd.dichvu.hoatoc.heso_dichvu !== undefined
                    ? bd.dichvu.hoatoc.heso_dichvu
                    : 1.5,
                appliesServiceFee: !!bd.dichvu.hoatoc.ap_dung_phi_dich_vu,
              },
              instant: {
                label: "Giao Ngay Lập Tức",
                jsonKey: "laptuc",
                base: {
                  same_district:
                    (bd.dichvu.laptuc &&
                      bd.dichvu.laptuc.coban &&
                      (bd.dichvu.laptuc.coban.cungquan ||
                        bd.dichvu.laptuc.coban.cungtinh)) ||
                    24000,
                  same_city:
                    (bd.dichvu.laptuc &&
                      bd.dichvu.laptuc.coban &&
                      (bd.dichvu.laptuc.coban.khacquan ||
                        bd.dichvu.laptuc.coban.cungtinh)) ||
                    35000,
                  inter_city:
                    (bd.dichvu.laptuc &&
                      bd.dichvu.laptuc.coban &&
                      bd.dichvu.laptuc.coban.lientinh) ||
                    55000,
                },
                perHalfKg:
                  (bd.dichvu.laptuc && bd.dichvu.laptuc.buoctiep) || 8000,
                estimate: {
                  same_district:
                    thoigianLapTuc.cung_quan ||
                    thoigianLapTuc.same_district ||
                    "",
                  same_city:
                    thoigianLapTuc.noi_thanh || thoigianLapTuc.same_city || "",
                  inter_city:
                    thoigianLapTuc.lien_tinh || thoigianLapTuc.inter_city || "",
                },
                serviceMultiplier:
                  (bd.dichvu.laptuc &&
                    bd.dichvu.laptuc.heso_dichvu !== undefined &&
                    bd.dichvu.laptuc.heso_dichvu) ||
                  1.5,
                appliesServiceFee:
                  !bd.dichvu.laptuc ||
                  bd.dichvu.laptuc.ap_dung_phi_dich_vu !== false,
              },
            },
          },
        };
      }
      // Render static data tables
      renderDynamicData(parsed);
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

function timeTextToMinutes(timeText) {
  const text = String(timeText || "").trim();
  if (!text) return -1;
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDomesticInstantSurchargeConfig() {
  const domesticConfig = QUOTE_SHIPPING_DATA.domestic || {};
  const source = domesticConfig.instantSurcharges || {};
  if (
    source &&
    typeof source === "object" &&
    source.weather &&
    source.time
  ) {
    return source;
  }
  return normalizeInstantSurchargeConfig(source);
}

function getDomesticInstantTimeConfig(dateLike) {
  const config = getDomesticInstantSurchargeConfig();
  const rules = Object.values(config.time || {});
  const fallback = rules[rules.length - 1] || {
    key: "default",
    label: "Tiêu chuẩn",
    fixedFee: 0,
    multiplier: 1,
    start: "00:00",
    end: "23:59",
  };

  let targetMinutes = -1;
  if (dateLike instanceof Date && !Number.isNaN(dateLike.getTime())) {
    targetMinutes = dateLike.getHours() * 60 + dateLike.getMinutes();
  } else if (typeof dateLike === "string") {
    targetMinutes = timeTextToMinutes(dateLike);
  } else if (typeof dateLike === "number" && Number.isFinite(dateLike)) {
    targetMinutes = Math.max(0, Math.round(dateLike));
  }

  if (targetMinutes < 0) {
    const now = new Date();
    targetMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const matchedRule =
    rules.find((rule) => {
      const start = timeTextToMinutes(rule.start);
      const end = timeTextToMinutes(rule.end);
      if (start < 0 || end < 0) return false;
      if (end <= start) {
        return targetMinutes >= start || targetMinutes < end;
      }
      return targetMinutes >= start && targetMinutes < end;
    }) ||
    (targetMinutes < 8 * 60
      ? rules.find((rule) => String(rule.key || "").includes("dem_22_06")) ||
        fallback
      : fallback);

  return matchedRule;
}

function getDomesticInstantWeatherConfig(conditionKey) {
  const config = getDomesticInstantSurchargeConfig();
  const weatherMap = config.weather || {};
  const normalizedKey = String(conditionKey || "macdinh")
    .trim()
    .toLowerCase();
  const weatherKey = normalizedKey.includes("muato")
    ? "muato"
    : normalizedKey.includes("muanhe")
      ? "muanhe"
      : "macdinh";
  return (
    weatherMap[weatherKey] ||
    weatherMap.macdinh || {
      key: "macdinh",
      label: "Điều kiện bình thường",
      fixedFee: 0,
      multiplier: 1,
    }
  );
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
    /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(phút|phut|p|giờ|gio|h|ngày|ngay|d)/i,
  );
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(",", "."));
    const max = parseFloat(rangeMatch[2].replace(",", "."));
    const unit = rangeMatch[3];
    const multiplier = /ngày|ngay|d/i.test(unit)
      ? 24
      : /phút|phut|p/i.test(unit)
        ? 1 / 60
        : 1;
    return {
      minHours: Math.max(1 / 60, min * multiplier),
      maxHours: Math.max(1 / 60, max * multiplier),
    };
  }

  const singleMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(phút|phut|p|giờ|gio|h|ngày|ngay|d)/i,
  );
  if (singleMatch) {
    const value = parseFloat(singleMatch[1].replace(",", "."));
    const unit = singleMatch[2];
    const multiplier = /ngày|ngay|d/i.test(unit)
      ? 24
      : /phút|phut|p/i.test(unit)
        ? 1 / 60
        : 1;
    const hours = Math.max(1 / 60, value * multiplier);
    return { minHours: hours, maxHours: hours };
  }

  return { minHours: 24, maxHours: 48 };
}

function formatEstimateFromHours(minHours, maxHours) {
  const minH = Math.max(1 / 60, minHours);
  const maxH = Math.max(minH, maxHours);

  if (maxH <= 2 && (!Number.isInteger(minH) || !Number.isInteger(maxH))) {
    const minMinutes = Math.max(1, Math.round(minH * 60));
    const maxMinutes = Math.max(minMinutes, Math.round(maxH * 60));
    if (minMinutes === maxMinutes) return `${minMinutes} phút`;
    return `${minMinutes}-${maxMinutes} phút`;
  }

  if (maxH <= 24) {
    const roundedMin = Math.max(1, Math.round(minH));
    const roundedMax = Math.max(roundedMin, Math.round(maxH));
    if (roundedMin === roundedMax) return `${roundedMin} giờ`;
    return `${roundedMin}-${roundedMax} giờ`;
  }

  const minDay = Math.max(1, Math.ceil(minH / 24));
  const maxDay = Math.max(minDay, Math.ceil(maxH / 24));
  if (minDay === maxDay) return `${minDay} ngày`;
  return `${minDay}-${maxDay} ngày`;
}

function buildDateTimeFromText(dateText, timeText) {
  const date = String(dateText || "").trim();
  const time = String(timeText || "").trim();
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDurationFromMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes || 0));
  const days = Math.floor(safeMinutes / 1440);
  const hours = Math.floor((safeMinutes % 1440) / 60);
  const minutes = safeMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} ngày`);
  if (hours) parts.push(`${hours} giờ`);
  if (minutes || !parts.length) parts.push(`${minutes} phút`);
  return parts.join(" ");
}

function resolveRequestedTurnaroundMinutes(norm) {
  if (norm.requestedTurnaroundMinutes > 0) {
    return Math.round(norm.requestedTurnaroundMinutes);
  }
  const pickupAt = buildDateTimeFromText(norm.pickupDate, norm.pickupSlotStart);
  const deliveryAt = buildDateTimeFromText(
    norm.deliveryDate,
    norm.deliverySlotEnd,
  );
  if (!pickupAt || !deliveryAt || deliveryAt < pickupAt) return 0;
  return Math.round((deliveryAt.getTime() - pickupAt.getTime()) / (60 * 1000));
}

function getDomesticServiceConditionConfig(serviceType, conditionKey) {
  const config = getDomesticInstantWeatherConfig(conditionKey);
  const normalizedConditionKey = String(conditionKey || "macdinh")
    .trim()
    .toLowerCase();
  const resolvedKey = normalizedConditionKey.includes("muato")
    ? "muato"
    : normalizedConditionKey.includes("muanhe")
      ? "muanhe"
      : "macdinh";
  return {
    key: config.key || resolvedKey,
    label: config.label || "Điều kiện bình thường",
    fixedFee: config.fixedFee || 0,
    multiplier: config.multiplier || 1,
  };
}

function getDomesticEstimateAdjustmentHours(
  zoneKey,
  billableWeight,
  itemType,
  serviceType,
  serviceConditionKey,
) {
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

  if (
    String(serviceType || "")
      .trim()
      .toLowerCase() === "instant"
  ) {
    const conditionAdjustMap = {
      macdinh: 0,
      muanhe: 0.5,
      muato: 1,
      demkhuya: 1,
      muanhe_demkhuya: 1.5,
      muato_demkhuya: 2,
    };
    adjust += conditionAdjustMap[serviceConditionKey] || 0;
  }

  return adjust;
}

function buildDomesticEstimate(
  serviceConfig,
  zoneKey,
  billableWeight,
  itemType,
  serviceType,
  serviceConditionKey,
) {
  const estimateText = serviceConfig.estimate[zoneKey] || "";
  const parsed = parseEstimateRangeToHours(estimateText);
  const adjust = getDomesticEstimateAdjustmentHours(
    zoneKey,
    billableWeight,
    itemType,
    serviceType,
    serviceConditionKey,
  );
  const minHours = Math.max(1, parsed.minHours + adjust);
  const maxHours = Math.max(minHours, parsed.maxHours + adjust);
  return formatEstimateFromHours(minHours, maxHours);
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
    "ho chi minh_ha noi": 1710,
    "ha noi_ho chi minh": 1710,
    "ho chi minh_da nang": 964,
    "da nang_ho chi minh": 964,
    "ha noi_da nang": 766,
    "da nang_ha noi": 766,
    "ho chi minh_can tho": 165,
    "can tho_ho chi minh": 165,
    "ho chi minh_hai phong": 1780,
    "hai phong_ho chi minh": 1780,
    "ha noi_hai phong": 120,
    "hai phong_ha noi": 120,
    "da nang_can tho": 1130,
    "can tho_da nang": 1130,
  };

  const routeKey = `${c1}_${c2}`;
  if (distanceMatrix[routeKey]) return distanceMatrix[routeKey];

  return 200 + ((c1.length * c2.length * 15) % 1300);
}

function calculateDomesticQuote(payload, options = {}) {
  const config = QUOTE_SHIPPING_DATA.domestic;
  const includeTimeFee = options.includeTimeFee !== false;
  const includeVehicleFee = options.includeVehicleFee !== false;

  // Hỗ trợ tên trường mới (tiếng Việt không dấu) lẫn tên cũ (tiếng Anh)
  const norm = {
    itemType: payload.loai_hang || payload.itemType || "thuong",
    itemName: payload.ten_hang || payload.itemName || "",
    weight: toPositiveNumber(payload.can_nang || payload.weight),
    quantity: Math.max(
      1,
      Math.round(toPositiveNumber(payload.so_luong || payload.quantity) || 1),
    ),
    length: toPositiveNumber(payload.chieu_dai || payload.length),
    width: toPositiveNumber(payload.chieu_rong || payload.width),
    height: toPositiveNumber(payload.chieu_cao || payload.height),
    codValue: toPositiveNumber(payload.phi_thu_ho || payload.codValue),
    insuranceValue: toPositiveNumber(
      payload.gia_tri_khai_bao || payload.insuranceValue,
    ),
    fromCity: payload.thanh_pho_gui || payload.fromCity || "",
    fromDistrict: payload.quan_huyen_gui || payload.fromDistrict || "",
    toCity: payload.thanh_pho_nhan || payload.toCity || "",
    toDistrict: payload.quan_huyen_nhan || payload.toDistrict || "",
    // Khoảng cách thực từ OSM (ưu tiên sử dụng nếu có)
    khoangCachKm: toPositiveNumber(
      payload.khoang_cach_km || payload.khoangCachKm || 0,
    ),
    vehicleType:
      String(payload.loai_xe || payload.vehicleType || "auto")
        .trim()
        .toLowerCase() || "auto",
    pickupSlotLabel: String(
      payload.ten_khung_gio_lay_hang ||
        payload.pickupSlotLabel ||
        payload.khung_gio_lay_hang ||
        payload.pickupSlot ||
        "",
    ).trim(),
    pickupSlotFixedFee: toPositiveNumber(
      payload.phi_khung_gio || payload.pickupSlotFixedFee,
    ),
    pickupSlotMultiplier:
      toPositiveNumber(
        payload.he_so_khung_gio || payload.pickupSlotMultiplier,
      ) || 1,
    pickupDate: String(
      payload.ngay_lay_hang || payload.pickupDate || "",
    ).trim(),
    pickupSlotStart: String(
      payload.gio_bat_dau_lay_hang || payload.pickupSlotStart || "",
    ).trim(),
    pickupSlotEnd: String(
      payload.gio_ket_thuc_lay_hang || payload.pickupSlotEnd || "",
    ).trim(),
    deliveryDate: String(
      payload.ngay_nhan_mong_muon || payload.deliveryDate || "",
    ).trim(),
    deliverySlotLabel: String(
      payload.ten_khung_gio_nhan_hang ||
        payload.deliverySlotLabel ||
        payload.khung_gio_nhan_hang ||
        payload.deliverySlot ||
        "",
    ).trim(),
    deliverySlotStart: String(
      payload.gio_bat_dau_nhan_hang || payload.deliverySlotStart || "",
    ).trim(),
    deliverySlotEnd: String(
      payload.gio_ket_thuc_nhan_hang || payload.deliverySlotEnd || "",
    ).trim(),
    requestedTurnaroundMinutes: toPositiveNumber(
      payload.thoi_gian_xu_ly_phut || payload.requestedTurnaroundMinutes,
    ),
    requestedTurnaroundLabel: String(
      payload.ten_thoi_gian_xu_ly || payload.requestedTurnaroundLabel || "",
    ).trim(),
    serviceConditionKey: String(
      payload.dieu_kien_dich_vu ||
        payload.serviceConditionKey ||
        payload.service_condition_key ||
        "macdinh",
    )
      .trim()
      .toLowerCase(),
    serviceConditionLabel: String(
      payload.ten_dieu_kien_dich_vu ||
        payload.serviceConditionLabel ||
        payload.service_condition_label ||
        "",
    ).trim(),
  };
  const requestedTurnaroundMinutes = resolveRequestedTurnaroundMinutes(norm);
  const requestedTurnaroundLabel =
    norm.requestedTurnaroundLabel ||
    (requestedTurnaroundMinutes > 0
      ? formatDurationFromMinutes(requestedTurnaroundMinutes)
      : "");

  const quantity = norm.quantity;
  const zoneKey = determineDomesticZone(
    norm.fromCity,
    norm.fromDistrict,
    norm.toCity,
    norm.toDistrict,
  );

  // Dùng khoảng cách OSM nếu có, nếu không ước tính từ zone
  const distanceKm =
    norm.khoangCachKm > 0
      ? norm.khoangCachKm
      : estimateDistance(
          norm.fromCity,
          norm.fromDistrict,
          norm.toCity,
          norm.toDistrict,
        );
  const dc = config.distanceConfig || {};
  const volumeDivisor = dc.volume_divisor || 6000;
  const actualWeightTotal = norm.weight * quantity;
  const volumetricWeightPerPackage = getVolumetricWeight(
    norm.length,
    norm.width,
    norm.height,
    volumeDivisor,
  );

  const billableWeightPerPackage = Math.max(
    norm.weight,
    volumetricWeightPerPackage,
    0.1,
  );
  const billableWeight = billableWeightPerPackage * quantity;

  // Quy tắc mới: Miễn phí x kg đầu (thường là 2kg) cho TOÀN ĐƠN HÀNG
  const baseIncludedWeight =
    toPositiveNumber(dc.base_included_weight || dc.can_mien_phi) || 2;
  const totalChargeableSteps = Math.max(
    0,
    Math.ceil((billableWeight - baseIncludedWeight) / 0.5),
  );
  const actualChargeableSteps = Math.max(
    0,
    Math.ceil((actualWeightTotal - baseIncludedWeight) / 0.5),
  );
  const volumetricExtraSteps = Math.max(
    0,
    totalChargeableSteps - actualChargeableSteps,
  );
  const overweightSteps = Math.max(
    0,
    totalChargeableSteps - volumetricExtraSteps,
  );
  const normalizedItemType = normalizeItemTypeKey(norm.itemType);
  const goodsFixedFee = config.goodsTypeFee[normalizedItemType] || 0;
  const goodsMultiplier =
    (config.goodsTypeMultiplier || {})[normalizedItemType] || 1;
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
  const vehicleSuggestion = getDomesticVehicleSuggestion({
    serviceType: "standard",
    zoneKey,
    billableWeight,
    itemType: norm.itemType,
    length: norm.length,
    width: norm.width,
    height: norm.height,
  });
  const selectedVehicle = resolveDomesticVehicleSelection(
    norm.vehicleType,
    vehicleSuggestion.key,
  );

  const services = Object.entries(config.services).map(
    ([serviceType, serviceConfig]) => {
      // Tách logic: Scheduled dùng bảng giá cố định, Instant tính theo Km
      let basePricePerOrder;
      if (serviceType === "instant") {
        // Gói Ngay lập tức: tính theo Km (như Grab/Be)
        const dc = config.distanceConfig;
        basePricePerOrder = dc.base_price;
        const extraKm = Math.max(0, distanceKm - dc.base_km);
        if (extraKm > 0) {
          if (distanceKm <= dc.long_distance_threshold) {
            basePricePerOrder += extraKm * dc.next_km_price;
          } else {
            basePricePerOrder +=
              (dc.long_distance_threshold - dc.base_km) * dc.next_km_price;
            basePricePerOrder +=
              (distanceKm - dc.long_distance_threshold) *
              dc.long_distance_price;
          }
        }
        const sMul =
          serviceConfig.serviceMultiplier !== undefined
            ? serviceConfig.serviceMultiplier
            : 1;
        basePricePerOrder = basePricePerOrder * sMul;
      } else {
        // 3 gói còn lại: dùng bảng giá cố định theo vùng địa lý
        const zonePrice = serviceConfig.base || {};
        basePricePerOrder =
          zonePrice[zoneKey] || zonePrice.same_district || 20000;
      }

      const perHalfKg = serviceConfig.perHalfKg || 2000;

      const overweightFee = overweightSteps * perHalfKg;
      const volumeFee = volumetricExtraSteps * perHalfKg;
      const weightFeePerOrder = overweightFee + volumeFee;
      const basePrice = basePricePerOrder;
      const weightFee = weightFeePerOrder;
      const goodsMultiplierFee =
        (basePricePerOrder + weightFeePerOrder) *
        Math.max(goodsMultiplier - 1, 0);
      const goodsFee = goodsFixedFee * quantity + goodsMultiplierFee;
      const transportSubtotal = basePrice + weightFee + goodsFee;
      // Tất cả 4 gói đều tính phụ phí theo khung giờ lấy hàng
      const timeConfig = getDomesticInstantTimeConfig(
        norm.pickupSlotStart || new Date(),
      );
      const conditionConfig = getDomesticServiceConditionConfig(
        serviceType,
        norm.serviceConditionKey,
      );
      const pickupSlotMultiplier = timeConfig?.multiplier || 1;
      const pickupSlotFixedFee = timeConfig?.fixedFee || 0;
      const allowsServiceFee =
        includeTimeFee && serviceConfig.appliesServiceFee === true;
      const rawTimeFee =
        transportSubtotal * Math.max(pickupSlotMultiplier - 1, 0) +
        pickupSlotFixedFee;
      const timeFee = allowsServiceFee ? rawTimeFee : 0;
      const rawConditionFee =
        transportSubtotal * Math.max((conditionConfig.multiplier || 1) - 1, 0) +
        (conditionConfig.fixedFee || 0);
      const conditionFee = allowsServiceFee ? rawConditionFee : 0;
      const serviceFee = timeFee + conditionFee;
      const transportWithServiceFee = transportSubtotal + serviceFee;
      const appliedVehicleMultiplier = includeVehicleFee
        ? selectedVehicle.multiplier
        : 1;
      const vehicleAdjustedTransport =
        transportWithServiceFee * appliedVehicleMultiplier;
      const vehicleFee = includeVehicleFee
        ? vehicleAdjustedTransport - transportWithServiceFee
        : 0;
      const total = roundCurrency(
        vehicleAdjustedTransport + codFee + insuranceFee,
      );
      const estimate = buildDomesticEstimate(
        serviceConfig,
        zoneKey,
        billableWeight,
        norm.itemType,
        serviceType,
        conditionConfig.key,
      );
      const serviceVehicleSuggestion = getDomesticVehicleSuggestion({
        serviceType,
        zoneKey,
        billableWeight,
        itemType: norm.itemType,
        length: norm.length,
        width: norm.width,
        height: norm.height,
      });
      return {
        serviceType,
        serviceName: serviceConfig.label,
        estimate,
        vehicleSuggestion: serviceVehicleSuggestion.label,
        suggestedVehicleKey: serviceVehicleSuggestion.key,
        selectedVehicleKey: selectedVehicle.key,
        selectedVehicleLabel: selectedVehicle.label,
        vehicleMultiplier: appliedVehicleMultiplier,
        configuredVehicleMultiplier: selectedVehicle.multiplier,
        pickupSlotLabel: norm.pickupSlotLabel,
        deliverySlotLabel: norm.deliverySlotLabel,
        requestedTurnaroundMinutes,
        requestedTurnaroundLabel,
        timeSurchargeKey: timeConfig?.key || "",
        timeSurchargeLabel: timeConfig?.label || norm.pickupSlotLabel || "",
        serviceConditionKey: conditionConfig.key,
        serviceConditionLabel:
          norm.serviceConditionLabel || conditionConfig.label || "",
        total,
        breakdown: {
          basePrice,
          overweightFee: roundCurrency(overweightFee),
          volumeFee: roundCurrency(volumeFee),
          weightFee: roundCurrency(weightFee),
          goodsFee: roundCurrency(goodsFee),
          timeFee: roundCurrency(timeFee),
          conditionFee: roundCurrency(conditionFee),
          serviceFee: roundCurrency(serviceFee),
          timeSurchargeKey: timeConfig?.key || "",
          timeSurchargeLabel: timeConfig?.label || norm.pickupSlotLabel || "",
          conditionSurchargeKey: conditionConfig.key,
          conditionSurchargeLabel:
            norm.serviceConditionLabel || conditionConfig.label || "",
          codFee,
          insuranceFee,
          vehicleFee: roundCurrency(vehicleFee),
          actualWeight: Number(actualWeightTotal.toFixed(2)),
          volumetricWeight: Number(
            (volumetricWeightPerPackage * quantity).toFixed(2),
          ),
          billableWeight: Number(billableWeight.toFixed(2)),
          billableWeightPerPackage: Number(billableWeightPerPackage.toFixed(2)),
          weightSizeFee: roundCurrency(weightFee),
          goodsGroupFee: roundCurrency(goodsFee + insuranceFee),
          serviceGroupFee: roundCurrency(serviceFee + codFee),
          includesTimeFee: allowsServiceFee,
          includesVehicleFee: includeVehicleFee,
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
    actualWeight: Number(actualWeightTotal.toFixed(2)),
    volumetricWeight: Number(
      (volumetricWeightPerPackage * quantity).toFixed(2),
    ),
    quantity,
    distanceKm,
    selectedVehicleKey: selectedVehicle.key,
    selectedVehicleLabel: selectedVehicle.label,
    suggestedVehicleKey: vehicleSuggestion.key,
    suggestedVehicleLabel: vehicleSuggestion.label,
    pickupSlotLabel: norm.pickupSlotLabel,
    deliverySlotLabel: norm.deliverySlotLabel,
    requestedTurnaroundMinutes,
    requestedTurnaroundLabel,
    serviceConditionKey: norm.serviceConditionKey,
    serviceConditionLabel: norm.serviceConditionLabel,
    includesTimeFee: includeTimeFee,
    includesVehicleFee: includeVehicleFee,
    services,
  };
}

/**
 * Trả về thông tin (tên + mô tả phụ phí) của loại hàng nội địa
 */
function getDomesticGoodsTypeInfo(itemTypeKey) {
  const config = QUOTE_SHIPPING_DATA.domestic || {};
  const normalizedItemTypeKey = normalizeItemTypeKey(itemTypeKey);
  const fee = (config.goodsTypeFee || {})[normalizedItemTypeKey] || 0;
  const desc =
    (config.goodsTypeDescription || {})[normalizedItemTypeKey] || "";
  const nameMap = config.goodsTypeLabel || {};

  return {
    name:
      nameMap[normalizedItemTypeKey] ||
      nameMap[itemTypeKey] ||
      normalizedItemTypeKey,
    surcharge: fee,
    description: desc,
  };
}

/**
 * Xây dựng chuỗi giải thích công thức tính cước nội địa bằng ngôn ngữ đơn giản.
 * Trả về mảng các bước tính để hiển thị trên UI.
 */
function buildDomesticPricingExplanation(payload, result, options = {}) {
  if (!result || !Array.isArray(result.services) || !result.services.length)
    return [];
  const includeTimeFee =
    options.includeTimeFee !== false && result.includesTimeFee !== false;
  const includeVehicleFee =
    options.includeVehicleFee !== false && result.includesVehicleFee !== false;

  const config = QUOTE_SHIPPING_DATA.domestic || {};
  const dc = config.distanceConfig || {};
  const baseIncludedWeight = toPositiveNumber(dc.base_included_weight) || 2;
  const volumeDivisor = dc.volume_divisor || 6000;
  const codFreeThreshold =
    toPositiveNumber((config.cod || {}).freeThreshold) || 0;
  const insuranceFreeThreshold =
    toPositiveNumber((config.insurance || {}).freeThreshold) || 1000000;

  const weight = toPositiveNumber(payload.weight);
  const length = toPositiveNumber(payload.length);
  const width = toPositiveNumber(payload.width);
  const height = toPositiveNumber(payload.height);
  const quantity = Math.max(
    1,
    Math.round(toPositiveNumber(payload.quantity) || 1),
  );
  const codValue = toPositiveNumber(payload.codValue);
  const insuranceValue = toPositiveNumber(payload.insuranceValue);

  const volWeight =
    length && width && height ? (length * width * height) / volumeDivisor : 0;
  const billableWeightPerPkg = Math.max(weight, volWeight, 0.1);
  const billableWeight = billableWeightPerPkg * quantity;
  const extraSteps = Math.max(
    0,
    Math.ceil((billableWeight - baseIncludedWeight) / 0.5),
  );

  const goodsInfo = getDomesticGoodsTypeInfo(payload.itemType);
  const multiplier =
    (config.goodsTypeMultiplier || {})[
      normalizeItemTypeKey(payload.itemType)
    ] || 1;

  const zoneLabels = {
    same_district: "Nội quận/huyện",
    same_city: "Nội thành (khác quận)",
    inter_city: "Liên tỉnh",
  };

  const steps = [];

  // Bước 1: Xác định vùng & Khoảng cách
  const distKm = result.distanceKm
    ? ` (~${result.distanceKm.toFixed(1)} km)`
    : "";
  steps.push({
    step: 1,
    title: "Xác định vùng & Khoảng cách tuyến",
    detail: `Từ ${payload.fromDistrict || "?"}, ${payload.fromCity || "?"} → ${payload.toDistrict || "?"}, ${payload.toCity || "?"}: <strong>${zoneLabels[result.zoneKey] || result.zoneKey}</strong>${distKm}`,
    formula: null,
  });

  // Bước 2: Trọng lượng tính cước
  let weightStep;
  if (volWeight > weight && volWeight > 0) {
    weightStep = {
      step: 2,
      title: "Trọng lượng tính cước (lấy max thực cân / thể tích)",
      detail: `Trọng lượng thực: <strong>${weight} kg</strong> | Thể tích: D${length}×R${width}×C${height} cm ÷ 6.000 = <strong>${volWeight.toFixed(2)} kg</strong>`,
      formula: `→ Lấy giá trị lớn hơn: <strong>${billableWeightPerPkg.toFixed(2)} kg/kiện × ${quantity} kiện = ${billableWeight.toFixed(2)} kg</strong>`,
    };
  } else {
    weightStep = {
      step: 2,
      title: "Trọng lượng tính cước",
      detail:
        `Trọng lượng thực: <strong>${weight} kg</strong>` +
        (volWeight > 0
          ? ` | Thể tích quy đổi: <strong>${volWeight.toFixed(2)} kg</strong> (thấp hơn, không áp dụng)`
          : ""),
      formula: `→ Tính cước theo: <strong>${billableWeightPerPkg.toFixed(2)} kg/kiện × ${quantity} kiện = ${billableWeight.toFixed(2)} kg</strong>`,
    };
  }
  steps.push(weightStep);

  // Bước 3 + 4: Phí cơ bản theo Km + phí cân nặng
  result.services.forEach((svc, idx) => {
    const bd = svc.breakdown || {};
    const serviceMeta =
      (((config || {}).services || {})[svc.serviceType] &&
        ((config || {}).services || {})[svc.serviceType]) ||
      {};
    const serviceMultiplier =
      serviceMeta.serviceMultiplier !== undefined
        ? serviceMeta.serviceMultiplier
        : 1;
    const weightExplain =
      (bd.overweightFee || 0) > 0
        ? `Phần vượt cân thực = <strong>${(bd.overweightFee || 0).toLocaleString("vi-VN")}đ</strong>`
        : `Khối lượng thực nằm trong ngưỡng ${baseIncludedWeight}kg đầu → <strong>0đ</strong>`;
    const volumeExplain =
      (bd.volumeFee || 0) > 0
        ? `Phần chênh thể tích = <strong>${(bd.volumeFee || 0).toLocaleString("vi-VN")}đ</strong>`
        : `Không phát sinh phí thể tích`;

    // Giải thích chi tiết phí KM cho bước 3
    let kmExplain = `Km cơ bản (${dc.base_km}km): <strong>${(dc.base_price * serviceMultiplier).toLocaleString("vi-VN")}đ</strong>`;
    const extraKm = Math.max(0, result.distanceKm - dc.base_km);
    if (extraKm > 0) {
      kmExplain += ` | Km vượt (${extraKm.toFixed(1)}km): <strong>+${(bd.basePrice - dc.base_price * serviceMultiplier).toLocaleString("vi-VN")}đ</strong>`;
    }

    steps.push({
      step: idx === 0 ? 3 : undefined,
      serviceContext: svc.serviceName,
      title:
        idx === 0
          ? `Phí vận chuyển chính (Vùng/Km) + Phí khối lượng/thể tích`
          : null,
      detail: `[${svc.serviceName}] ${kmExplain}.<br>Phí vượt cân: ${weightExplain}.<br>Phí thể tích: ${volumeExplain}.`,
      formula: null,
    });
  });

  // Bước 4: Phụ phí loại hàng
  if (goodsInfo.surcharge > 0 || multiplier > 1) {
    let goodsDetail = `Loại hàng: <strong>${goodsInfo.name}</strong>`;
    if (goodsInfo.surcharge > 0) {
      goodsDetail += ` → Phụ phí cố định: <strong>+${goodsInfo.surcharge.toLocaleString("vi-VN")}đ/kiện × ${quantity} kiện</strong>`;
    }
    if (multiplier > 1) {
      goodsDetail += ` + Hệ số nhân ${multiplier} (tăng ${((multiplier - 1) * 100).toFixed(0)}% phần phí vận chuyển chính + cân nặng)`;
    }
    if (goodsInfo.description) {
      goodsDetail += `<br><em style="color:#666;font-size:0.88em">Lý do: ${goodsInfo.description}</em>`;
    }
    steps.push({
      step: 4,
      title: "Phụ phí tính chất hàng hóa",
      detail: goodsDetail,
      formula: null,
    });
  } else {
    steps.push({
      step: 4,
      title: "Phụ phí tính chất hàng hóa",
      detail: `Loại hàng: <strong>${goodsInfo.name}</strong> → <strong>Không phụ phí</strong>`,
      formula: null,
    });
  }

  // Bước 5: Phí COD
  const codFee = result.services[0]
    ? (result.services[0].breakdown || {}).codFee || 0
    : 0;
  if (codValue > 0) {
    const codConfig = config.cod || {};
    const codRate = (codConfig.rate || 0.012) * 100;
    const codMin = codConfig.min || 15000;
    if (codValue <= codFreeThreshold) {
      steps.push({
        step: 5,
        title: "Phí thu hộ COD",
        detail: `Giá trị thu hộ: <strong>${codValue.toLocaleString("vi-VN")}đ</strong> ≤ ngưỡng miễn phí ${codFreeThreshold.toLocaleString("vi-VN")}đ → <strong>Miễn phí COD</strong>`,
        formula: null,
      });
    } else {
      steps.push({
        step: 5,
        title: "Phí thu hộ COD",
        detail: `Giá trị thu hộ: <strong>${codValue.toLocaleString("vi-VN")}đ</strong> × ${codRate}% = ${(codValue * codConfig.rate).toLocaleString("vi-VN")}đ (tối thiểu ${codMin.toLocaleString("vi-VN")}đ)`,
        formula: `→ Phí COD: <strong>${codFee.toLocaleString("vi-VN")}đ</strong>`,
      });
    }
  } else {
    steps.push({
      step: 5,
      title: "Phí thu hộ COD",
      detail: "Không sử dụng dịch vụ COD → <strong>0đ</strong>",
      formula: null,
    });
  }

  // Bước 6: Phí bảo hiểm
  const insuranceFee = result.services[0]
    ? (result.services[0].breakdown || {}).insuranceFee || 0
    : 0;
  if (insuranceValue > 0) {
    const insConfig = config.insurance || {};
    const insRate = (insConfig.rate || 0.005) * 100;
    const insMin = insConfig.minAboveThreshold || 5000;
    if (insuranceValue <= insuranceFreeThreshold) {
      steps.push({
        step: 6,
        title: "Phí bảo hiểm hàng hóa",
        detail: `Giá trị khai báo: <strong>${insuranceValue.toLocaleString("vi-VN")}đ</strong> ≤ ngưỡng miễn phí ${insuranceFreeThreshold.toLocaleString("vi-VN")}đ → <strong>Miễn phí bảo hiểm</strong>`,
        formula: null,
      });
    } else {
      steps.push({
        step: 6,
        title: "Phí bảo hiểm hàng hóa",
        detail: `Giá trị khai báo: <strong>${insuranceValue.toLocaleString("vi-VN")}đ</strong> × ${insRate}% = ${(insuranceValue * (insConfig.rate || 0.005)).toLocaleString("vi-VN")}đ (tối thiểu ${insMin.toLocaleString("vi-VN")}đ)`,
        formula: `→ Phí bảo hiểm: <strong>${insuranceFee.toLocaleString("vi-VN")}đ</strong>`,
      });
    }
  } else {
    steps.push({
      step: 6,
      title: "Phí bảo hiểm hàng hóa",
      detail: "Không khai báo giá trị bảo hiểm → <strong>0đ</strong>",
      formula: null,
    });
  }

  if (!includeTimeFee) {
    steps.push({
      step: 7,
      title: "Phụ phí dịch vụ",
      detail:
        "Báo giá nhanh chưa cộng phụ phí dịch vụ. Khi sang bước đặt lịch, cả 4 gói đều áp dụng chung phụ phí thời gian và phụ phí điều kiện giao theo khung giờ lấy hàng, thời tiết và tình trạng vận hành thực tế. Các khoản này sẽ được tách riêng để bạn đối chiếu trước khi chốt đơn.",
      formula: null,
    });
  } else if (result.pickupSlotLabel) {
    const cheapestServiceWithTime = result.services[0] || null;
    const timeFee =
      ((cheapestServiceWithTime || {}).breakdown || {}).timeFee || 0;
    const conditionFee =
      ((cheapestServiceWithTime || {}).breakdown || {}).conditionFee || 0;
    const conditionLabel =
      cheapestServiceWithTime &&
      cheapestServiceWithTime.serviceConditionLabel &&
      cheapestServiceWithTime.serviceConditionLabel.trim()
        ? cheapestServiceWithTime.serviceConditionLabel
        : "Điều kiện bình thường";
    const timeLabel =
      (cheapestServiceWithTime &&
        cheapestServiceWithTime.timeSurchargeLabel &&
        cheapestServiceWithTime.timeSurchargeLabel.trim()) ||
      result.pickupSlotLabel ||
      "Khung thời gian hiện tại";
    steps.push({
      step: 7,
      title: "Phụ phí dịch vụ",
      detail:
        `Cả 4 gói đều dùng chung logic phụ phí dịch vụ. Ở báo giá hiện tại, hệ thống đang áp dụng khung <strong>${timeLabel}</strong>${result.requestedTurnaroundLabel ? ` | Khoảng xử lý theo lịch: <strong>${result.requestedTurnaroundLabel}</strong>` : ""} | Điều kiện giao: <strong>${conditionLabel}</strong>.`,
      formula: [
        `${escapeHtml(timeLabel)}: <strong>${timeFee.toLocaleString("vi-VN")}đ</strong>`,
        `${escapeHtml(conditionLabel)}: <strong>${conditionFee.toLocaleString("vi-VN")}đ</strong>`,
      ].join(" | "),
    });
  }

  const cheapestService = result.services[0] || null;
  if (!includeVehicleFee) {
    steps.push({
      step: 8,
      title: "Điều chỉnh theo phương tiện",
      detail: `Báo giá nhanh chưa cộng phụ phí phương tiện. Hệ thống hiện chỉ gợi ý <strong>${(cheapestService && cheapestService.vehicleSuggestion) || "xe phù hợp"}</strong>; giá cuối sẽ chốt theo loại xe bạn chọn ở bước đặt đơn.`,
      formula: null,
    });
  } else if (cheapestService && cheapestService.vehicleMultiplier > 1) {
    steps.push({
      step: 8,
      title: "Điều chỉnh theo phương tiện",
      detail: `Bạn đang chọn <strong>${cheapestService.selectedVehicleLabel}</strong>. Gói cước được nhân hệ số <strong>x${cheapestService.vehicleMultiplier}</strong> cho phần vận chuyển.`,
      formula: `→ Phụ phí phương tiện: <strong>${((cheapestService.breakdown || {}).vehicleFee || 0).toLocaleString("vi-VN")}đ</strong>`,
    });
  } else {
    steps.push({
      step: 8,
      title: "Điều chỉnh theo phương tiện",
      detail: `Phương tiện đang dùng: <strong>${(cheapestService && cheapestService.selectedVehicleLabel) || "Xe máy"}</strong> → <strong>không nhân thêm hệ số</strong>.`,
      formula: null,
    });
  }

  return steps;
}

function resolveDomesticVehicleSelection(requestedKey, suggestedKey) {
  const safeRequestedKey = DOMESTIC_VEHICLE_OPTIONS[requestedKey]
    ? requestedKey
    : "auto";
  const finalKey =
    safeRequestedKey === "auto" ? suggestedKey : safeRequestedKey;
  const finalConfig =
    DOMESTIC_VEHICLE_OPTIONS[finalKey] || DOMESTIC_VEHICLE_OPTIONS.xe_may;

  return {
    key: finalKey,
    label: finalConfig.label,
    multiplier: finalConfig.multiplier,
  };
}

function getDomesticVehicleSuggestion({
  serviceType,
  itemType,
  billableWeight,
  zoneKey,
  length,
  width,
  height,
}) {
  const config = QUOTE_SHIPPING_DATA.domestic || {};
  const v = config.vehicleSuggestions || {};

  const longestEdge = Math.max(
    toPositiveNumber(length),
    toPositiveNumber(width),
    toPositiveNumber(height),
  );
  const bulkyVolume =
    toPositiveNumber(length) *
    toPositiveNumber(width) *
    toPositiveNumber(height);

  if (
    itemType === "cong-kenh" ||
    billableWeight >= 60 ||
    longestEdge > 180 ||
    bulkyVolume >= 250000
  ) {
    return {
      key: "xe_tai",
      label: zoneKey === "inter_city" ? "Xe tải nhẹ liên tỉnh" : "Xe tải nhẹ",
    };
  }

  if (itemType === "dong-lanh") {
    return {
      key: billableWeight > 20 || longestEdge > 50 ? "xe_tai" : "xe_ban_tai",
      label:
        billableWeight > 20 || longestEdge > 50
          ? "Xe tải lạnh / xe tải nhẹ"
          : "Xe van lạnh / xe bán tải",
    };
  }

  if (billableWeight > 20 || longestEdge > 50) {
    return {
      key: longestEdge > 120 || billableWeight > 35 ? "xe_ban_tai" : "xe_loi",
      label:
        longestEdge > 120 || billableWeight > 35
          ? "Xe bán tải / xe van"
          : "Xe lôi / xe ba gác",
    };
  }

  return {
    key: "xe_may",
    label: "Xe máy (giao nhanh nội thành)",
  };
}

if (typeof window !== "undefined") {
  window.SHIPPING_DATA = SHIPPING_DATA;
  window.QUOTE_SHIPPING_DATA = QUOTE_SHIPPING_DATA;
  window.calculateShipping = calculateShipping;
  window.calculateDomesticQuote = calculateDomesticQuote;
  window.buildDomesticPricingExplanation = buildDomesticPricingExplanation;
  window.getDomesticInstantSurchargeConfig = getDomesticInstantSurchargeConfig;
  window.getDomesticInstantTimeConfig = getDomesticInstantTimeConfig;
  window.getDomesticInstantWeatherConfig = getDomesticInstantWeatherConfig;
  window.DOMESTIC_VEHICLE_OPTIONS = DOMESTIC_VEHICLE_OPTIONS;
}

/**
 * Renders dynamic data from JSON into the static pricing tables on the page.
 * @param {object} data The full parsed data from pricing-data.json
 */
function renderDynamicData(data) {
  if (typeof document === "undefined") return;

  function render() {
    const qsd = window.QUOTE_SHIPPING_DATA || QUOTE_SHIPPING_DATA || {};
    const domesticData = qsd.domestic || {};
    const services = domesticData.services || {};
    const pricingContent = data.noi_dung_bang_gia || {};

    const formatCurrency = (value) => {
      if (typeof value !== "number") return value;
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(value);
    };
    const formatMoney = (value) =>
      `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
    const formatDistance = (value) => {
      const distance = Number(value) || 0;
      if (!distance) return "";
      return Number.isInteger(distance)
        ? `${distance.toLocaleString("vi-VN")}km`
        : `${distance.toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })}km`;
    };
    const formatKg = (value) =>
      `${Number(value || 0).toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}kg`;
    const formatPercent = (value) =>
      `${(Number(value || 0) * 100).toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}%`;
    const renderParagraphGroup = (elementId, paragraphs) => {
      const target = document.getElementById(elementId);
      if (!target || !Array.isArray(paragraphs) || !paragraphs.length) return;
      target.innerHTML = paragraphs.map((item) => `<p>${item}</p>`).join("");
    };
    const renderListGroup = (elementId, items) => {
      const target = document.getElementById(elementId);
      if (!target || !Array.isArray(items) || !items.length) return;
      target.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
    };
    const resolveScenarioService = (scenario, options) => {
      if (
        !scenario ||
        !scenario.payload ||
        typeof calculateDomesticQuote !== "function"
      ) {
        return null;
      }
      const result = calculateDomesticQuote(scenario.payload, options);
      const service = (result.services || []).find(
        (item) => item.serviceType === scenario.service_type,
      );
      if (!service) return null;
      return { result, service };
    };
    const distanceConfig = domesticData.distanceConfig || {};
    const baseIncludedWeight =
      toPositiveNumber(distanceConfig.base_included_weight) ||
      toPositiveNumber(domesticData.baseIncludedWeight) ||
      2;

    // 1. Bảng giá vùng (Fixed Price)
    const fixedTable = document.getElementById("pricing-fixed-table-body");
    if (fixedTable && services.standard && services.fast && services.express) {
      fixedTable.innerHTML = `
                <tr>
                    <td><span class="zone-badge same-district">Nội quận/huyện</span></td>
                    <td><strong>${formatCurrency(services.standard.base.same_district)}</strong></td>
                    <td><strong>${formatCurrency(services.fast.base.same_district)}</strong></td>
                    <td><strong>${formatCurrency(services.express.base.same_district)}</strong></td>
                </tr>
                <tr>
                    <td><span class="zone-badge same-city">Nội thành (khác quận)</span></td>
                    <td><strong>${formatCurrency(services.standard.base.same_city)}</strong></td>
                    <td><strong>${formatCurrency(services.fast.base.same_city)}</strong></td>
                    <td><strong>${formatCurrency(services.express.base.same_city)}</strong></td>
                </tr>
                <tr>
                    <td><span class="zone-badge inter-city">Liên tỉnh</span></td>
                    <td><strong>${formatCurrency(services.standard.base.inter_city)}</strong></td>
                    <td><strong>${formatCurrency(services.fast.base.inter_city)}</strong></td>
                    <td><strong>${formatCurrency(services.express.base.inter_city)}</strong></td>
                </tr>
            `;
    }

    // 2. Bảng giá khoảng cách (Distance Price)
    const distanceTable = document.getElementById(
      "pricing-distance-table-body",
    );
    if (distanceTable && domesticData.distanceConfig) {
      const dc = domesticData.distanceConfig;
      distanceTable.innerHTML = `
                <tr>
                    <td><span class="zone-badge same-district">${dc.base_km} Km đầu tiên</span></td>
                    <td><strong>${formatCurrency(dc.base_price)}</strong></td>
                    <td>Mức phí tối thiểu</td>
                </tr>
                <tr>
                    <td><span class="zone-badge same-city">Từ Km thứ ${dc.base_km + 1} đến ${dc.long_distance_threshold}</span></td>
                    <td><strong>+${dc.next_km_price.toLocaleString("vi-VN")}đ / km</strong></td>
                    <td>Áp dụng chặng ngắn nội thành</td>
                </tr>
                <tr>
                    <td><span class="zone-badge inter-city">Trên ${dc.long_distance_threshold} Km</span></td>
                    <td><strong>+${dc.long_distance_price.toLocaleString("vi-VN")}đ / km</strong></td>
                    <td>Ưu đãi đường trường xa</td>
                </tr>
            `;
    }

    // 3. Ghi chú hệ số (Service Multipliers)
    const noteArea = document.getElementById("note-service-multipliers");
    if (
      noteArea &&
      services.standard &&
      services.fast &&
      services.express &&
      services.instant
    ) {
      const notes = [
        `Giao Ngay Lập Tức (×${services.instant.serviceMultiplier})`,
        `Hỏa tốc (×${services.express.serviceMultiplier})`,
        `Giao Nhanh (×${services.fast.serviceMultiplier})`,
        `Tiêu chuẩn (×${services.standard.serviceMultiplier})`,
      ].join(" | ");
      noteArea.innerHTML = `<p><strong>Hệ số dịch vụ:</strong> ${notes} (Áp dụng lên <strong>phí vận chuyển chính</strong> và trọng lượng)</p>`;
    }

    // 4. Phí vượt cân (Weight Excess)
    const weightList = document.getElementById("pricing-weight-excess-list");
    if (
      weightList &&
      services.standard &&
      services.fast &&
      services.express &&
      services.instant
    ) {
      const weightSummary = document.getElementById("pricing-weight-summary");
      if (weightSummary) {
        weightSummary.innerHTML = `<strong>Miễn phí ${formatKg(
          baseIncludedWeight,
        )} đầu tiên</strong> cho mọi gói dịch vụ.`;
      }
      weightList.innerHTML = `
                <li>Giao Ngay Lập Tức: <strong>+${services.instant.perHalfKg.toLocaleString("vi-VN")}đ/0.5kg</strong></li>
                <li>Hỏa Tốc: <strong>+${services.express.perHalfKg.toLocaleString("vi-VN")}đ/0.5kg</strong></li>
                <li>Giao Nhanh: <strong>+${services.fast.perHalfKg.toLocaleString("vi-VN")}đ/0.5kg</strong></li>
                <li>Giao Tiêu chuẩn: <strong>+${services.standard.perHalfKg.toLocaleString("vi-VN")}đ/0.5kg</strong></li>
            `;

      const weightExample = document.getElementById("pricing-weight-example");
      const weightScenario = pricingContent.trong_luong?.vi_du;
      const weightResolved = resolveScenarioService(weightScenario, {
        includeTimeFee: false,
        includeVehicleFee: false,
      });
      if (weightExample && weightResolved) {
        const breakdown = weightResolved.service.breakdown || {};
        const actualWeight = Number(breakdown.actualWeight || 0);
        const extraWeight = Math.max(0, actualWeight - baseIncludedWeight);
        const extraSteps = Math.max(0, Math.ceil(extraWeight / 0.5));
        const perHalfKg =
          services[weightResolved.service.serviceType]?.perHalfKg || 0;
        weightExample.innerHTML = `
          <strong>${escapeHtml(weightScenario.title || "Ví dụ trọng lượng")}</strong><br />
          Phí vận chuyển chính: ${formatMoney(breakdown.basePrice)}<br />
          ${
            breakdown.weightFee > 0
              ? `Vượt ${formatKg(extraWeight)}: ${extraSteps} bậc × ${formatMoney(
                  perHalfKg,
                )} = +${formatMoney(breakdown.weightFee)}`
              : `Khối lượng nằm trong ngưỡng miễn phí ${formatKg(
                  baseIncludedWeight,
                )} đầu tiên`
          }<br />
          Tổng nhóm trọng lượng & kích thước =
          <strong>${formatMoney(breakdown.weightFee)}</strong>
        `;
      }
    }

    // 5. Phụ phí hàng hóa (Goods Surcharge)
    const surchargeTable = document.getElementById(
      "pricing-goods-surcharge-body",
    );
    if (
      surchargeTable &&
      domesticData.goodsTypeFee &&
      domesticData.goodsTypeLabel &&
      domesticData.goodsTypeDescription
    ) {
      const {
        goodsTypeLabel,
        goodsTypeFee,
        goodsTypeDescription,
        goodsTypeMultiplier = {},
      } = domesticData;
      let html = "";
      for (const key in goodsTypeLabel) {
        const fee = goodsTypeFee[key] || 0;
        const multiplier = goodsTypeMultiplier[key] || 1;
        let feeText =
          fee > 0
            ? `<strong>+${fee.toLocaleString("vi-VN")}đ</strong>`
            : multiplier > 1
              ? `<strong>Hệ số ×${multiplier}</strong>`
              : `<strong class="price-zero">0đ</strong>`;
        html += `<tr class="${fee > 0 || multiplier > 1 ? "highlight-row" : ""}"><td>${goodsTypeLabel[key]}</td><td>${feeText}</td><td>${goodsTypeDescription[key] || ""}</td></tr>`;
      }
      surchargeTable.innerHTML = html;
    }

    const insuranceRules = document.getElementById("pricing-insurance-rules");
    const insuranceExample = document.getElementById("pricing-insurance-example");
    const insuranceConfig = domesticData.insurance || {};
    const insuranceThreshold =
      toPositiveNumber(insuranceConfig.freeThreshold) || 1000000;
    const insuranceRate = toPositiveNumber(insuranceConfig.rate) || 0.005;
    const insuranceMin =
      toPositiveNumber(insuranceConfig.minAboveThreshold) || 5000;
    if (insuranceRules) {
      insuranceRules.innerHTML = `
        <li>Miễn phí nếu giá trị khai báo ≤ <strong>${formatMoney(
          insuranceThreshold,
        )}</strong></li>
        <li>Phí: <strong>${formatPercent(insuranceRate)}</strong> giá trị khai báo</li>
        <li>Tối thiểu: <strong>${formatMoney(insuranceMin)}</strong></li>
        <li>Bồi thường 100% nếu mất hoặc hỏng theo mức khai báo hợp lệ</li>
      `;
    }
    if (insuranceExample) {
      const insuranceValue =
        toPositiveNumber(pricingContent.bao_hiem?.vi_du_gia_tri) || 3000000;
      const insuranceFee =
        insuranceValue > insuranceThreshold
          ? Math.max(insuranceValue * insuranceRate, insuranceMin)
          : 0;
      insuranceExample.innerHTML = `
        <strong>Ví dụ:</strong> Khai giá ${formatMoney(insuranceValue)}<br />
        Phí bảo hiểm = ${formatPercent(insuranceRate)} × ${formatMoney(
          insuranceValue,
        )} = <strong>${formatMoney(insuranceFee)}</strong>
      `;
    }

    const serviceRules = pricingContent.phu_phi_dich_vu?.thoi_gian_thoi_tiet
      ?.ghi_chu || [
      "Tất cả 4 gói dịch vụ đều hiển thị và áp dụng <strong>phí thời gian</strong> và <strong>phí thời tiết</strong> dựa trên điều kiện thực tế lúc đặt đơn (Đêm khuya, giờ cao điểm, thời tiết xấu).",
      "Phụ phí được tính toán tự động và tách bạch để khách hàng dễ dàng kiểm soát tổng cước phí.",
    ];
    renderListGroup("pricing-service-rules", serviceRules);

    const serviceExample = document.getElementById("pricing-service-example");
    const serviceScenario =
      pricingContent.phu_phi_dich_vu?.thoi_gian_thoi_tiet?.vi_du;
    const serviceResolved = resolveScenarioService(serviceScenario, {
      includeTimeFee: true,
      includeVehicleFee: false,
    });
    if (serviceExample && serviceResolved) {
      const breakdown = serviceResolved.service.breakdown || {};
      const transportBeforeService =
        (breakdown.basePrice || 0) +
        (breakdown.weightFee || 0) +
        (breakdown.goodsFee || 0);
      serviceExample.innerHTML = `
        <strong>${escapeHtml(
          serviceScenario.title || "Ví dụ phụ phí dịch vụ",
        )}</strong><br />
        Phần vận chuyển trước phụ phí: ${formatMoney(
          transportBeforeService,
        )}<br />
        ${escapeHtml(
          serviceResolved.service.timeSurchargeLabel || "Phí thời gian",
        )}: <strong>+${formatMoney(breakdown.timeFee)}</strong><br />
        ${escapeHtml(
          serviceResolved.service.serviceConditionLabel ||
            "Phí điều kiện giao",
        )}: <strong>+${formatMoney(breakdown.conditionFee)}</strong>
      `;
    }

    const codRules = document.getElementById("pricing-cod-rules");
    const codExample = document.getElementById("pricing-cod-example");
    const codConfig = domesticData.cod || {};
    const codThreshold = toPositiveNumber(codConfig.freeThreshold) || 1000000;
    const codRate = toPositiveNumber(codConfig.rate) || 0.012;
    const codMin = toPositiveNumber(codConfig.min) || 15000;
    if (codRules) {
      codRules.innerHTML = `
        <li>Miễn phí nếu giá trị thu hộ ≤ <strong>${formatMoney(
          codThreshold,
        )}</strong></li>
        <li>Phí: <strong>${formatPercent(codRate)}</strong> giá trị thu hộ</li>
        <li>Tối thiểu: <strong>${formatMoney(codMin)}</strong></li>
      `;
    }
    if (codExample) {
      const codValue =
        toPositiveNumber(pricingContent.phu_phi_dich_vu?.cod?.vi_du_gia_tri) ||
        2000000;
      const codFee =
        codValue > codThreshold ? Math.max(codValue * codRate, codMin) : 0;
      codExample.innerHTML = `
        <strong>Ví dụ:</strong> Thu hộ ${formatMoney(codValue)}<br />
        Phí COD = ${formatPercent(codRate)} × ${formatMoney(
          codValue,
        )} = <strong>${formatMoney(codFee)}</strong>
      `;
    }
    renderParagraphGroup(
      "pricing-service-note",
      pricingContent.phu_phi_dich_vu?.ghi_chu,
    );

    // 6. Bảng phương tiện (Vehicle Table)
    const vehicleTable = document.getElementById("pricing-vehicle-table-body");
    const vehicleCatalog = getDisplayVehicleCatalog(data);
    if (vehicleTable && vehicleCatalog.length) {
      vehicleTable.innerHTML = vehicleCatalog
        .map(
          (item) => `<tr class="${item.multiplier > 1 ? "highlight-row" : ""}">
              <td>${item.label}</td>
              <td><strong>×${item.multiplier.toFixed(2)}</strong></td>
              <td>${item.description || (item.multiplier > 1 ? `Phần vận chuyển tăng gấp ${item.multiplier} lần` : "Mức chuẩn, không cộng thêm")}</td>
            </tr>`,
        )
        .join("");
    }

    // 7. Ví dụ tính phí xe (Example)
    const exampleArea = document.getElementById("pricing-vehicle-example");
    if (exampleArea && data.vi_du_tinh_phi) {
      exampleArea.innerHTML = data.vi_du_tinh_phi;
    }
    renderParagraphGroup("pricing-vehicle-note", pricingContent.phi_xe?.ghi_chu);

    // 8. Bảng so sánh (Comparison)
    const compareTable = document.getElementById(
      "pricing-comparison-table-body",
    );
    if (compareTable && data.so_sanh_dich_vu) {
      const comparisonOrder = {
        "tag-instant": 1,
        "tag-express": 2,
        "tag-fast": 3,
        "tag-standard": 4,
      };
      compareTable.innerHTML = [...data.so_sanh_dich_vu]
        .sort(
          (a, b) =>
            (comparisonOrder[a.tagCls] || 99) -
            (comparisonOrder[b.tagCls] || 99),
        )
        .map((item) => {
          const serviceType = item.service_type;
          const serviceMeta = services[serviceType] || {};
          const estimateLabel =
            (serviceMeta.estimate && serviceMeta.estimate.same_district) ||
            (serviceMeta.estimate && serviceMeta.estimate.same_city) ||
            "";

          return `
                <tr>
                    <td>
                        <div class="service-name-cell">
                            <strong>${item.goi}</strong>
                            <span class="service-tag ${item.tagCls || "tag-standard"}">${item.tag}</span>
                        </div>
                    </td>
                    <td><strong>${estimateLabel || "Đang cập nhật"}</strong></td>
                    <td>
                        <div class="surcharge-info-cell">
                            <span class="price-active price-active--time"><i class="fas fa-exclamation-triangle"></i> Có tính</span>
                            <small>${item.phi_thoi_gian || "(Đêm khuya, giờ cao điểm)"}</small>
                        </div>
                    </td>
                    <td>
                        <div class="surcharge-info-cell">
                            <span class="price-active price-active--weather"><i class="fas fa-cloud-rain"></i> Có tính</span>
                            <small>${item.phi_thoi_tiet || "(Mưa nhẹ, mưa lớn, thời tiết xấu)"}</small>
                        </div>
                    </td>
                    <td>${item.phu_hop || ""}</td>
                </tr>
            `;
        })
        .join("");
    }

    // 9. Ví dụ hoàn chỉnh (Dynamic examples)
    const finalExamplesGrid = document.getElementById(
      "pricing-final-examples-grid",
    );
    if (
      finalExamplesGrid &&
      Array.isArray(data.vi_du_hoan_chinh) &&
      typeof calculateDomesticQuote === "function"
    ) {
      finalExamplesGrid.innerHTML = data.vi_du_hoan_chinh
        .map((example) => {
          try {
            const payload = example.payload || {};
            const result = calculateDomesticQuote(payload, {
              includeTimeFee: true,
              includeVehicleFee: true,
            });
            const service = (result.services || []).find(
              (item) => item.serviceType === example.service_type,
            );

            if (!service) {
              throw new Error("missing service");
            }

            const breakdown = service.breakdown || {};
            const goodsInfo = getDomesticGoodsTypeInfo(
              payload.loai_hang || payload.itemType || "thuong",
            );
            const serviceLabel =
              example.title || `Ví dụ: ${service.serviceName || "Dịch vụ"}`;
            const summary =
              example.summary ||
              `${service.serviceName || "Dịch vụ"} tuyến ${
                result.zoneLabel || "nội địa"
              }.`;
            const baseDetailParts = [];
            const distanceText = formatDistance(
              payload.khoang_cach_km || payload.khoangCachKm || result.distanceKm,
            );

            if (distanceText) {
              baseDetailParts.push(distanceText);
            }
            if (result.zoneLabel) {
              baseDetailParts.push(result.zoneLabel);
            }

            const weightDetailParts = [];
            if (breakdown.overweightFee > 0) {
              weightDetailParts.push(
                `vượt cân <strong>${formatMoney(
                  breakdown.overweightFee,
                )}</strong>`,
              );
            }
            if (breakdown.volumeFee > 0) {
              weightDetailParts.push(
                `thể tích <strong>${formatMoney(
                  breakdown.volumeFee,
                )}</strong>`,
              );
            }

            const goodsParts = [];
            if (breakdown.goodsFee > 0) {
              goodsParts.push(
                `${escapeHtml(
                  goodsInfo.name || "Phụ phí loại hàng",
                )} <strong>${formatMoney(breakdown.goodsFee)}</strong>`,
              );
            }
            if (breakdown.insuranceFee > 0) {
              goodsParts.push(
                `bảo hiểm <strong>${formatMoney(
                  breakdown.insuranceFee,
                )}</strong>`,
              );
            }

            const serviceParts = [];
            if (breakdown.codFee > 0) {
              serviceParts.push(
                `COD <strong>${formatMoney(breakdown.codFee)}</strong>`,
              );
            }
            if (breakdown.timeFee > 0) {
              serviceParts.push(
                `${escapeHtml(
                  service.timeSurchargeLabel || "Phí thời gian",
                )} <strong>${formatMoney(breakdown.timeFee)}</strong>`,
              );
            }
            if (breakdown.conditionFee > 0) {
              serviceParts.push(
                `${escapeHtml(
                  service.serviceConditionLabel || "Phí thời tiết",
                )} <strong>${formatMoney(breakdown.conditionFee)}</strong>`,
              );
            }

            const vehicleDetail = service.selectedVehicleLabel
              ? ` (${escapeHtml(service.selectedVehicleLabel)})`
              : "";

            return `
              <div class="pricing-info-card">
                <div class="pricing-info-card-head">
                  <span>${escapeHtml(example.icon || "🧾")}</span>
                  <h4>${escapeHtml(serviceLabel)}</h4>
                </div>
                <div class="pricing-example">
                  ${escapeHtml(summary)}<br /><br />
                  1. Phí vận chuyển: <strong>${formatMoney(
                    breakdown.basePrice,
                  )}</strong>${
                    baseDetailParts.length
                      ? ` (${baseDetailParts
                          .map((part) => escapeHtml(part))
                          .join(" | ")})`
                      : ""
                  }<br />
                  2. Trọng lượng & kích thước: <strong>${formatMoney(
                    breakdown.weightFee,
                  )}</strong>${
                    weightDetailParts.length
                      ? ` (${weightDetailParts.join(" + ")})`
                      : ""
                  }<br />
                  3. Phụ phí hàng hóa: ${
                    goodsParts.length ? goodsParts.join(" + ") : "<strong>0đ</strong>"
                  }<br />
                  4. Phụ phí dịch vụ: ${
                    serviceParts.length
                      ? serviceParts.join(" + ")
                      : "<strong>0đ</strong>"
                  }<br />
                  5. Phí phương tiện: <strong>${formatMoney(
                    breakdown.vehicleFee,
                  )}</strong>${vehicleDetail}<br /><br />
                  <strong>Tổng cước tạm tính: ${formatMoney(
                    service.total,
                  )}</strong>
                </div>
              </div>
            `;
          } catch (error) {
            return `
              <div class="pricing-info-card">
                <div class="pricing-example">
                  Không thể tải ví dụ minh họa cho gói này.
                </div>
              </div>
            `;
          }
        })
        .join("");
    }
    renderParagraphGroup(
      "pricing-final-note",
      pricingContent.vi_du_hoan_chinh?.ghi_chu,
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
}
