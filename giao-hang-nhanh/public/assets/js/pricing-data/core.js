/**
 * pricing-data/core.js
 * Chứa lõi dữ liệu và calculator cho bảng giá giao hàng:
 * - nạp pricing-data.json
 * - chuẩn hóa dữ liệu / alias
 * - tính giá các gói cước
 * - sinh breakdown và phần giải thích giá
 *
 * Liên quan trực tiếp:
 * - pricing-data.js: bootstrap, nạp file này trước render.js
 * - pricing-data/render.js: dùng dữ liệu và hàm do file này export ra window
 * - dat-lich/*.js, main-core.js, main-landing.js: gọi calculateDomesticQuote(...)
 */
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
  // Xe máy
  xemay: "xe_may",

  // Xe 4 bánh nhỏ (≤ 500kg)
  xe_loi: "xe_4_banh_nho",
  xeloi: "xe_4_banh_nho",
  xeba: "xe_4_banh_nho",
  xe_ban_tai: "xe_4_banh_nho",
  xebantai: "xe_4_banh_nho",
  xevan: "xe_4_banh_nho",
  xe_4_banh_nho: "xe_4_banh_nho",
  xe4banhnho: "xe_4_banh_nho",
  taior5: "xe_4_banh_nho", // Tải 0.5 tấn

  // Xe 4 bánh vừa (≤ 1200kg)
  tai_nhe: "xe_4_banh_vua",
  tainhe: "xe_4_banh_vua",
  xe_tai_vua: "xe_4_banh_vua",
  xetaivua: "xe_4_banh_vua",
  xe_4_banh_vua: "xe_4_banh_vua",
  xe4banhvua: "xe_4_banh_vua",
  taior10: "xe_4_banh_vua", // Tải 1.0 tấn

  // Xe 4 bánh lớn / Xe tải (≤ 3500kg)
  xe_tai: "xe_4_banh_lon",
  xetai: "xe_4_banh_lon",
  taior20: "xe_4_banh_lon", // Tải 2.0 tấn
  xe_4_banh_lon: "xe_4_banh_lon",
  xe4banhlon: "xe_4_banh_lon",
};

function normalizeVehicleKey(key) {
  const normalized = String(key || "")
    .trim()
    .toLowerCase();
  return VEHICLE_KEY_ALIASES[normalized] || normalized;
}

function buildDomesticVehicleOptions(rawVehicles = []) {
  const vehicleMap = {};
  const sourceVehicles = Array.isArray(rawVehicles) ? rawVehicles : [];

  sourceVehicles.forEach((item) => {
    const normalizedKey = normalizeVehicleKey(item?.key);
    if (!normalizedKey || normalizedKey === "auto") return;

    const parsedHeSoXe = Number(item?.he_so_xe ?? item?.he_so);
    const parsedGiaCoBan = Number(item?.gia_co_ban);
    const parsedPhiToiThieu = Number(item?.phi_toi_thieu);
    const parsedTrongLuongToiDa = Number(item?.trong_luong_toi_da);
    vehicleMap[normalizedKey] = {
      key: normalizedKey,
      label: item?.label || item?.ten || normalizedKey,
      he_so_xe:
        Number.isFinite(parsedHeSoXe) && parsedHeSoXe > 0
          ? parsedHeSoXe
          : 1,
      gia_co_ban:
        Number.isFinite(parsedGiaCoBan) && parsedGiaCoBan > 0
          ? parsedGiaCoBan
          : 0,
      phi_toi_thieu:
        Number.isFinite(parsedPhiToiThieu) && parsedPhiToiThieu > 0
          ? parsedPhiToiThieu
          : 0,
      trong_luong_toi_da:
        Number.isFinite(parsedTrongLuongToiDa) && parsedTrongLuongToiDa > 0
          ? parsedTrongLuongToiDa
          : 0,
      description:
        item?.description ||
        item?.mo_ta ||
        "Phần vận chuyển thay đổi theo hệ số phương tiện",
    };
  });

  return {
    auto: {
      key: "auto",
      label: "Để hệ thống tự đề xuất",
      he_so_xe: 1,
      description:
        "Hệ thống tự gợi ý xe theo tổng trọng lượng hàng hóa.",
    },
    ...vehicleMap,
  };
}

function getDisplayVehicleCatalog(data = {}) {
  return Object.values(buildDomesticVehicleOptions(data.phuong_tien)).filter(
    (item) => item.key !== "auto",
  );
}

let DOMESTIC_VEHICLE_OPTIONS = buildDomesticVehicleOptions([]);

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
          phicodinh: (value && value.phicodinh) || 0,
          heso: (value && value.heso) || 1,
          batdau: (value && value.batdau) || "",
          ketthuc: (value && value.ketthuc) || "",
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
      DOMESTIC_VEHICLE_OPTIONS = buildDomesticVehicleOptions(parsed.phuong_tien);

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
              const ck = bd.cauhinh_khoangcach || {};
              return {
                gia_xe_may_gan: ck.gia_xe_may_gan || 6500,
                nguong_xe_may_xa: ck.nguong_xe_may_xa || 20,
                gia_xe_may_xa: ck.gia_xe_may_xa || 5000,
                base_included_weight: ck.can_mien_phi || 2,
                volume_divisor: ck.he_so_the_tich || 6000,
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
                appliesServiceFee:
                  !bd.dichvu.laptuc ||
                  bd.dichvu.laptuc.ap_dung_phi_dich_vu !== false,
              },
            },
          },
        };
      }
      if (typeof window !== "undefined") {
        window.SHIPPING_DATA = SHIPPING_DATA;
        window.QUOTE_SHIPPING_DATA = QUOTE_SHIPPING_DATA;
        window.DOMESTIC_VEHICLE_OPTIONS = DOMESTIC_VEHICLE_OPTIONS;
      }
      // Render static data tables
      if (typeof renderDynamicData === "function") {
        renderDynamicData(parsed);
      }
      return;
    }
    console.error("Không thể tải dữ liệu bảng giá:", url, xhr.status);
  } catch (err) {
    console.error("Không thể tải dữ liệu bảng giá:", url, err);
  }
}

function toPositiveNumber(value) {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function roundCurrency(value) {
  return Math.round(value / 1000) * 1000;
}

const GIOI_HAN_HANG_HOA_XE_MAY = {
  trong_luong_toi_da_kg: 50,
  // Form chỉ có kích thước kiện hàng, nên hệ thống dùng ngưỡng vận hành bảo thủ
  // để bám sát giới hạn lưu thông xe máy nội thành.
  chieu_dai_toi_da_cm: 200,
  chieu_rong_toi_da_cm: 120,
  chieu_cao_toi_da_cm: 130,
};

function getTongGiaVanChuyen(chi_tiet_gia = {}) {
  return toPositiveNumber(
    chi_tiet_gia.tong_gia_van_chuyen ?? chi_tiet_gia.basePrice ?? 0,
  );
}

function lay_gioi_han_hang_hoa_xe_may() {
  return { ...GIOI_HAN_HANG_HOA_XE_MAY };
}

function kiem_tra_hang_hoa_xe_may(thong_tin_hang = {}) {
  const trong_luong = toPositiveNumber(thong_tin_hang.trong_luong_hang, 0);
  const chieu_dai = toPositiveNumber(thong_tin_hang.chieu_dai, 0);
  const chieu_rong = toPositiveNumber(thong_tin_hang.chieu_rong, 0);
  const chieu_cao = toPositiveNumber(thong_tin_hang.chieu_cao, 0);
  const gioi_han = lay_gioi_han_hang_hoa_xe_may();

  if (trong_luong > gioi_han.trong_luong_toi_da_kg) {
    return {
      hop_le: false,
      ly_do:
        `Tổng trọng lượng ${trong_luong.toFixed(1)}kg vượt ngưỡng ${gioi_han.trong_luong_toi_da_kg}kg của xe máy.`,
      gioi_han,
    };
  }

  if (chieu_dai > gioi_han.chieu_dai_toi_da_cm) {
    return {
      hop_le: false,
      ly_do:
        `Chiều dài ${chieu_dai.toFixed(0)}cm vượt ngưỡng ${gioi_han.chieu_dai_toi_da_cm}cm cho xe máy.`,
      gioi_han,
    };
  }

  if (chieu_rong > gioi_han.chieu_rong_toi_da_cm) {
    return {
      hop_le: false,
      ly_do:
        `Chiều rộng ${chieu_rong.toFixed(0)}cm vượt ngưỡng ${gioi_han.chieu_rong_toi_da_cm}cm cho xe máy.`,
      gioi_han,
    };
  }

  if (chieu_cao > gioi_han.chieu_cao_toi_da_cm) {
    return {
      hop_le: false,
      ly_do:
        `Chiều cao ${chieu_cao.toFixed(0)}cm vượt ngưỡng ${gioi_han.chieu_cao_toi_da_cm}cm cho xe máy.`,
      gioi_han,
    };
  }

  return {
    hop_le: true,
    ly_do: "",
    gioi_han,
  };
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
    phicodinh: 0,
    heso: 1,
    batdau: "00:00",
    ketthuc: "23:59",
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
      const start = timeTextToMinutes(rule.batdau);
      const end = timeTextToMinutes(rule.ketthuc);
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
      phicodinh: 0,
      heso: 1,
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
    phicodinh: config.phicodinh || 0,
    heso: config.heso || 1,
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

function lay_cau_hinh_xe_giao_ngay(khoa_xe) {
  const khoa_xe_hop_le = normalizeVehicleKey(khoa_xe);
  if (DOMESTIC_VEHICLE_OPTIONS[khoa_xe_hop_le]) {
    return DOMESTIC_VEHICLE_OPTIONS[khoa_xe_hop_le];
  }

  const danhSachXe = Object.values(DOMESTIC_VEHICLE_OPTIONS || {}).filter(
    (item) => item && item.key && item.key !== "auto",
  );
  if (danhSachXe.length) {
    return danhSachXe[0];
  }

  return {
    key: khoa_xe_hop_le || "xe_may",
    label: khoa_xe_hop_le || "xe_may",
    he_so_xe: 1,
    gia_co_ban: 0,
    phi_toi_thieu: 0,
    trong_luong_toi_da: 0,
    description: "Chưa có cấu hình phương tiện trong pricing-data.json.",
  };
}

function lay_danh_sach_xe_giao_ngay_theo_tai_trong() {
  return Object.values(DOMESTIC_VEHICLE_OPTIONS || {})
    .filter((item) => item && item.key && item.key !== "auto")
    .sort((a, b) => {
      const trongLuongA = toPositiveNumber(a?.trong_luong_toi_da, 0);
      const trongLuongB = toPositiveNumber(b?.trong_luong_toi_da, 0);
      return trongLuongA - trongLuongB;
    });
}

function lay_cau_hinh_gia_xe_may_giao_ngay() {
  const config = QUOTE_SHIPPING_DATA?.domestic?.distanceConfig || {};
  const xeMay = DOMESTIC_VEHICLE_OPTIONS?.xe_may || {};
  return {
    don_gia_gan:
      toPositiveNumber(config.gia_xe_may_gan, 0) ||
      toPositiveNumber(xeMay.gia_co_ban, 0),
    nguong_xa: toPositiveNumber(config.nguong_xe_may_xa, 0),
    don_gia_xa: toPositiveNumber(config.gia_xe_may_xa, 0),
  };
}

function goi_y_loai_xe_theo_trong_luong(trong_luong_hang) {
  const trong_luong = toPositiveNumber(trong_luong_hang, 0);
  const danhSachXe = lay_danh_sach_xe_giao_ngay_theo_tai_trong();
  if (!danhSachXe.length) {
    return lay_cau_hinh_xe_giao_ngay("xe_may");
  }

  const xePhuHop = danhSachXe.find((item) => {
    const trongLuongToiDa = toPositiveNumber(item?.trong_luong_toi_da, 0);
    return trongLuongToiDa > 0 && trong_luong <= trongLuongToiDa;
  });

  return xePhuHop || danhSachXe[danhSachXe.length - 1];
}

function chon_loai_xe_tinh_gia(
  loai_xe_yeu_cau,
  loai_xe_goi_y,
  thong_tin_hang = {},
) {
  const khoa_yeu_cau = normalizeVehicleKey(loai_xe_yeu_cau);
  const khoa_goi_y = normalizeVehicleKey(loai_xe_goi_y);
  const kiem_tra_xe_may = kiem_tra_hang_hoa_xe_may(thong_tin_hang);
  if (khoa_yeu_cau === "xe_may" && !kiem_tra_xe_may.hop_le) {
    return lay_cau_hinh_xe_giao_ngay(khoa_goi_y);
  }
  const khoa_ap_dung =
    !khoa_yeu_cau || khoa_yeu_cau === "auto" ? khoa_goi_y : khoa_yeu_cau;
  return lay_cau_hinh_xe_giao_ngay(khoa_ap_dung);
}

function lay_thong_so_xe_giao_ngay(xe_ap_dung, khoang_cach_km) {
  if (xe_ap_dung.key !== "xe_may") {
    return {
      gia_co_ban: Number(xe_ap_dung.gia_co_ban || 0),
      he_so_xe: Number(xe_ap_dung.he_so_xe || 1),
      cach_tinh_xe_may_duong_dai: "",
    };
  }

  const cau_hinh_xe_may = lay_cau_hinh_gia_xe_may_giao_ngay();
  if (khoang_cach_km > cau_hinh_xe_may.nguong_xa) {
    return {
      gia_co_ban: cau_hinh_xe_may.don_gia_xa,
      he_so_xe: 1,
      cach_tinh_xe_may_duong_dai:
        `Tuyen tren ${cau_hinh_xe_may.nguong_xa}km dang ap dung don gia ${Math.round(
          cau_hinh_xe_may.don_gia_xa,
        ).toLocaleString("vi-VN")}d/km de giu bang gia don gian va minh bach.`,
    };
  }

  return {
    gia_co_ban: cau_hinh_xe_may.don_gia_gan,
    he_so_xe: 1,
    cach_tinh_xe_may_duong_dai:
      `Tuyen den ${cau_hinh_xe_may.nguong_xa}km dang ap dung don gia ${Math.round(
        cau_hinh_xe_may.don_gia_gan,
      ).toLocaleString("vi-VN")}d/km cho xe may.`,
  };
}

function tinh_cuoc_van_chuyen_giao_ngay(thong_tin = {}) {
  const khoang_cach_km = toPositiveNumber(thong_tin.khoang_cach_km, 0);
  const gia_co_ban = toPositiveNumber(thong_tin.gia_co_ban, 0);
  const he_so_xe = toPositiveNumber(thong_tin.he_so_xe, 1) || 1;
  const he_so_xang = toPositiveNumber(thong_tin.he_so_xang, 1) || 1;
  const phi_toi_thieu = toPositiveNumber(thong_tin.phi_toi_thieu, 0);
  const tong_tien_truoc_toi_thieu = Math.round(
    khoang_cach_km * gia_co_ban * he_so_xe * he_so_xang,
  );
  const tong_gia_van_chuyen = Math.round(
    Math.max(phi_toi_thieu, tong_tien_truoc_toi_thieu),
  );

  return {
    tong_tien_truoc_toi_thieu,
    tong_gia_van_chuyen,
    bu_phi_toi_thieu: Math.round(
      Math.max(0, tong_gia_van_chuyen - tong_tien_truoc_toi_thieu),
    ),
  };
}

function tinh_gia_giao_hang_ngay_lap_tuc(thong_tin = {}) {
  const khoang_cach_km = toPositiveNumber(thong_tin.khoang_cach_km, 0);
  const trong_luong_hang = toPositiveNumber(thong_tin.trong_luong_hang, 0);
  const he_so_xang = toPositiveNumber(thong_tin.he_so_xang, 1) || 1;
  const co_tach_dieu_chinh_theo_xe = thong_tin.includeVehicleFee !== false;
  const so_luong = Math.max(
    1,
    Math.round(toPositiveNumber(thong_tin.so_luong, 1) || 1),
  );
  const goods_fee_co_dinh = toPositiveNumber(thong_tin.goodsFeeFixed, 0);
  const he_so_loai_hang =
    toPositiveNumber(thong_tin.goodsMultiplier, 1) || 1;
  const phi_cod = toPositiveNumber(thong_tin.codFee, 0);
  const phi_bao_hiem = toPositiveNumber(thong_tin.insuranceFee, 0);
  const ap_dung_phi_dich_vu = thong_tin.appliesServiceFee !== false;
  const co_tinh_phi_thoi_gian = thong_tin.includeTimeFee !== false;
  const cau_hinh_khung_gio = getDomesticInstantTimeConfig(
    thong_tin.pickupSlotStart || new Date(),
  );
  const cau_hinh_thoi_tiet = getDomesticServiceConditionConfig(
    "instant",
    thong_tin.serviceConditionKey,
  );
  const kiem_tra_xe_may = kiem_tra_hang_hoa_xe_may(thong_tin);
  let xe_goi_y = goi_y_loai_xe_theo_trong_luong(trong_luong_hang);
  if (!kiem_tra_xe_may.hop_le && xe_goi_y.key === "xe_may") {
    xe_goi_y = lay_cau_hinh_xe_giao_ngay("xe_4_banh_nho");
  }
  const xe_ap_dung = chon_loai_xe_tinh_gia(
    thong_tin.loai_xe_yeu_cau,
    xe_goi_y.key,
    thong_tin,
  );

  const thong_so_xe_ap_dung = lay_thong_so_xe_giao_ngay(
    xe_ap_dung,
    khoang_cach_km,
  );
  const gia_co_ban = thong_so_xe_ap_dung.gia_co_ban;
  const he_so_xe = thong_so_xe_ap_dung.he_so_xe;
  const cach_tinh_xe_may_duong_dai =
    thong_so_xe_ap_dung.cach_tinh_xe_may_duong_dai;

  const don_gia_km = Math.round(gia_co_ban * he_so_xe);
  const phi_toi_thieu = Number(xe_ap_dung.phi_toi_thieu || 0);
  const cuoc_day_du = tinh_cuoc_van_chuyen_giao_ngay({
    khoang_cach_km,
    gia_co_ban,
    he_so_xe,
    he_so_xang,
    phi_toi_thieu,
  });
  const xe_nen_tinh_phi =
    xe_ap_dung.key === "xe_may"
      ? xe_ap_dung
      : lay_cau_hinh_xe_giao_ngay("xe_4_banh_nho");
  const thong_so_xe_nen = lay_thong_so_xe_giao_ngay(
    xe_nen_tinh_phi,
    khoang_cach_km,
  );
  const phi_toi_thieu_nen = Number(
    xe_nen_tinh_phi.phi_toi_thieu || phi_toi_thieu || 0,
  );
  const cuoc_nen = tinh_cuoc_van_chuyen_giao_ngay({
    khoang_cach_km,
    gia_co_ban: thong_so_xe_nen.gia_co_ban,
    he_so_xe: thong_so_xe_nen.he_so_xe,
    he_so_xang,
    phi_toi_thieu: phi_toi_thieu_nen,
  });
  const vehicleFee = co_tach_dieu_chinh_theo_xe
    ? Math.max(0, cuoc_day_du.tong_gia_van_chuyen - cuoc_nen.tong_gia_van_chuyen)
    : 0;
  const tong_gia_van_chuyen = Math.round(
    Math.max(0, cuoc_day_du.tong_gia_van_chuyen - vehicleFee),
  );
  const tong_tien_truoc_toi_thieu = co_tach_dieu_chinh_theo_xe
    ? cuoc_nen.tong_tien_truoc_toi_thieu
    : cuoc_day_du.tong_tien_truoc_toi_thieu;
  const phi_toi_thieu_hien_thi = co_tach_dieu_chinh_theo_xe
    ? phi_toi_thieu_nen
    : phi_toi_thieu;
  const bu_phi_toi_thieu = Math.round(
    Math.max(0, tong_gia_van_chuyen - tong_tien_truoc_toi_thieu),
  );
  const phu_phi_he_so_loai_hang =
    tong_gia_van_chuyen * Math.max(he_so_loai_hang - 1, 0);
  const goodsFee = Math.round(goods_fee_co_dinh * so_luong + phu_phi_he_so_loai_hang);
  const transportSubtotal = tong_gia_van_chuyen + goodsFee;
  const timeFee =
    ap_dung_phi_dich_vu && co_tinh_phi_thoi_gian
      ? Math.round(
          transportSubtotal *
            Math.max((cau_hinh_khung_gio?.heso || 1) - 1, 0) +
            (cau_hinh_khung_gio?.phicodinh || 0),
        )
      : 0;
  const conditionFee =
    ap_dung_phi_dich_vu && co_tinh_phi_thoi_gian
      ? Math.round(
          transportSubtotal *
            Math.max((cau_hinh_thoi_tiet?.heso || 1) - 1, 0) +
            (cau_hinh_thoi_tiet?.phicodinh || 0),
        )
      : 0;
  const serviceFee = timeFee + conditionFee;
  const tong_tien = Math.round(
    tong_gia_van_chuyen +
      goodsFee +
      serviceFee +
      vehicleFee +
      phi_cod +
      phi_bao_hiem,
  );

  return {
    serviceType: "instant",
    serviceName: "Giao hàng ngay lập tức",
    estimate: "",
    vehicleSuggestion: xe_goi_y.label,
    suggestedVehicleKey: xe_goi_y.key,
    selectedVehicleKey: xe_ap_dung.key,
    selectedVehicleLabel: xe_ap_dung.label,
    he_so_xe: Number(he_so_xe.toFixed(2)),
    pickupSlotLabel: String(thong_tin.pickupSlotLabel || "").trim(),
    deliverySlotLabel: String(thong_tin.deliverySlotLabel || "").trim(),
    requestedTurnaroundMinutes: Math.max(
      0,
      Math.round(thong_tin.requestedTurnaroundMinutes || 0),
    ),
    requestedTurnaroundLabel: String(
      thong_tin.requestedTurnaroundLabel || "",
    ).trim(),
    timeSurchargeKey: String(cau_hinh_khung_gio?.key || "").trim(),
    timeSurchargeLabel: String(
      cau_hinh_khung_gio?.label || thong_tin.pickupSlotLabel || "",
    ).trim(),
    serviceConditionKey: String(
      thong_tin.serviceConditionKey || "macdinh",
    ).trim(),
    serviceConditionLabel: String(
      thong_tin.serviceConditionLabel ||
        cau_hinh_thoi_tiet?.label ||
        "Bình thường",
    ).trim(),
    total: tong_tien,
    breakdown: {
      tong_gia_van_chuyen: tong_gia_van_chuyen,
      overweightFee: 0,
      volumeFee: 0,
      weightFee: 0,
      goodsFee: goodsFee,
      timeFee: timeFee,
      conditionFee: conditionFee,
      serviceFee: serviceFee,
      timeSurchargeKey: String(cau_hinh_khung_gio?.key || "").trim(),
      timeSurchargeLabel: String(
        cau_hinh_khung_gio?.label || thong_tin.pickupSlotLabel || "",
      ).trim(),
      conditionSurchargeKey: String(
        cau_hinh_thoi_tiet?.key || thong_tin.serviceConditionKey || "macdinh",
      ).trim(),
      conditionSurchargeLabel: String(
        thong_tin.serviceConditionLabel ||
          cau_hinh_thoi_tiet?.label ||
          "Bình thường",
      ).trim(),
      codFee: Math.round(phi_cod),
      insuranceFee: Math.round(phi_bao_hiem),
      vehicleFee: Math.round(vehicleFee),
      actualWeight: Number(trong_luong_hang.toFixed(2)),
      volumetricWeight: 0,
      billableWeight: Number(trong_luong_hang.toFixed(2)),
      billableWeightPerPackage: Number(trong_luong_hang.toFixed(2)),
      weightSizeFee: 0,
      goodsGroupFee: Math.round(goodsFee + phi_bao_hiem),
      serviceGroupFee: Math.round(serviceFee + phi_cod),
      includesTimeFee: ap_dung_phi_dich_vu && co_tinh_phi_thoi_gian,
      includesVehicleFee: co_tach_dieu_chinh_theo_xe && vehicleFee > 0,
      khoang_cach_km: Number(khoang_cach_km.toFixed(2)),
      gia_co_ban: Math.round(gia_co_ban),
      don_gia_km,
      he_so_xe: Number(he_so_xe.toFixed(2)),
      he_so_xang: Number(he_so_xang.toFixed(2)),
      phi_toi_thieu: Math.round(phi_toi_thieu_hien_thi),
      tong_tien_truoc_toi_thieu,
      bu_phi_toi_thieu,
      ap_dung_phi_toi_thieu: bu_phi_toi_thieu > 0,
      trong_luong: Number(trong_luong_hang.toFixed(2)),
      trong_luong_toi_da: Number(xe_ap_dung.trong_luong_toi_da || 0),
      loai_xe_goi_y: xe_goi_y.key,
      ten_loai_xe_goi_y: xe_goi_y.label,
      loai_xe_tinh_gia: xe_ap_dung.key,
      ten_loai_xe_tinh_gia: xe_ap_dung.label,
      cach_tinh_xe_may_duong_dai,
      xe_may_hop_le: kiem_tra_xe_may.hop_le,
      ly_do_khong_hop_le_xe_may: kiem_tra_xe_may.ly_do,
    },
  };
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
      payload.phi_khung_gio,
    ),
    pickupSlotMultiplier:
      toPositiveNumber(payload.he_so_khung_gio) || 1,
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
    heSoXang:
      toPositiveNumber(
        payload.he_so_xang || payload.heso_xang || payload.fuelMultiplier,
      ) || 1,
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
  const actualWeightTotal = norm.weight * quantity;
  const billableWeightPerPackage = Math.max(norm.weight, 0.1);
  const billableWeight = Math.max(actualWeightTotal, 0.1);
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
    actualWeight: actualWeightTotal,
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
      if (serviceType === "instant") {
        const dich_vu_giao_ngay = tinh_gia_giao_hang_ngay_lap_tuc({
          khoang_cach_km: distanceKm,
          trong_luong_hang: actualWeightTotal,
          so_luong: quantity,
          chieu_dai: norm.length,
          chieu_rong: norm.width,
          chieu_cao: norm.height,
          goodsFeeFixed: goodsFixedFee,
          goodsMultiplier: goodsMultiplier,
          codFee: codFee,
          insuranceFee: insuranceFee,
          he_so_xang: norm.heSoXang,
          loai_xe_yeu_cau: norm.vehicleType,
          pickupSlotLabel: norm.pickupSlotLabel,
          pickupSlotStart: norm.pickupSlotStart || new Date(),
          deliverySlotLabel: norm.deliverySlotLabel,
          requestedTurnaroundMinutes,
          requestedTurnaroundLabel,
          serviceConditionKey: norm.serviceConditionKey,
          serviceConditionLabel: norm.serviceConditionLabel,
          includeTimeFee: includeTimeFee,
          includeVehicleFee: includeVehicleFee,
          appliesServiceFee: serviceConfig.appliesServiceFee === true,
        });
        dich_vu_giao_ngay.estimate = buildDomesticEstimate(
          serviceConfig,
          zoneKey,
          actualWeightTotal,
          norm.itemType,
          serviceType,
          norm.serviceConditionKey,
        );
        return dich_vu_giao_ngay;
      }

      // Tách logic: Scheduled dùng bảng giá cố định, Instant tính theo Km
      let tong_gia_van_chuyen_co_ban = 0;
      const zonePrice = serviceConfig.base || {};
      tong_gia_van_chuyen_co_ban =
        zonePrice[zoneKey] || zonePrice.same_district || 20000;

      const overweightFee = 0;
      const volumeFee = 0;
      const weightFeePerOrder = 0;
      const tong_gia_van_chuyen = tong_gia_van_chuyen_co_ban;
      const weightFee = weightFeePerOrder;
      const goodsMultiplierFee =
        (tong_gia_van_chuyen_co_ban + weightFeePerOrder) *
        Math.max(goodsMultiplier - 1, 0);
      const goodsFee = goodsFixedFee * quantity + goodsMultiplierFee;
      const transportSubtotal =
        tong_gia_van_chuyen + weightFee + goodsFee;
      // Tất cả 4 gói đều tính phụ phí theo khung giờ lấy hàng
      const timeConfig = getDomesticInstantTimeConfig(
        norm.pickupSlotStart || new Date(),
      );
      const conditionConfig = getDomesticServiceConditionConfig(
        serviceType,
        norm.serviceConditionKey,
      );
      const pickupSlotMultiplier = timeConfig?.heso || 1;
      const pickupSlotFixedFee = timeConfig?.phicodinh || 0;
      const allowsServiceFee =
        includeTimeFee && serviceConfig.appliesServiceFee === true;
      const rawTimeFee =
        transportSubtotal * Math.max(pickupSlotMultiplier - 1, 0) +
        pickupSlotFixedFee;
      const timeFee = allowsServiceFee ? rawTimeFee : 0;
      const rawConditionFee =
        transportSubtotal * Math.max((conditionConfig.heso || 1) - 1, 0) +
        (conditionConfig.phicodinh || 0);
      const conditionFee = allowsServiceFee ? rawConditionFee : 0;
      const serviceFee = timeFee + conditionFee;
      const transportWithServiceFee = transportSubtotal + serviceFee;
      const he_so_xe_ap_dung = includeVehicleFee
        ? selectedVehicle.he_so_xe
        : 1;
      const vehicleAdjustedTransport =
        transportWithServiceFee * he_so_xe_ap_dung;
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
        actualWeight: actualWeightTotal,
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
        he_so_xe: Number(he_so_xe_ap_dung.toFixed(2)),
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
          tong_gia_van_chuyen: roundCurrency(tong_gia_van_chuyen),
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
          he_so_xe: Number(he_so_xe_ap_dung.toFixed(2)),
          actualWeight: Number(actualWeightTotal.toFixed(2)),
          volumetricWeight: 0,
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
    volumetricWeight: 0,
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

  // Bước 2: Khối lượng & kích thước dùng để gợi ý xe
  steps.push({
    step: 2,
    title: "Khối lượng & kích thước hàng hóa",
    detail: `Trọng lượng thực: <strong>${weight} kg</strong> | Kích thước kiện: <strong>D${length}×R${width}×C${height} cm</strong>`,
    formula: `→ Hệ thống dùng thông tin này để gợi ý xe phù hợp; không cộng thêm phí thể tích riêng.`,
  });

  // Bước 3: Phí vận chuyển chính theo logic hiện tại của từng gói
  result.services.forEach((svc, idx) => {
    const bd = svc.breakdown || {};
    const tongGiaVanChuyen = getTongGiaVanChuyen(bd);
    let chiTietVanChuyen = `Phí vận chuyển đang áp dụng cho <strong>${svc.serviceName}</strong>: <strong>${tongGiaVanChuyen.toLocaleString("vi-VN")}đ</strong>.`;

    if (svc.serviceType === "instant") {
      const khoangCach = toPositiveNumber(
        bd.khoang_cach_km ?? result.distanceKm,
        result.distanceKm,
      );
      const giaCoBan = toPositiveNumber(bd.gia_co_ban, 0);
      const heSoXe = toPositiveNumber(bd.he_so_xe, 1) || 1;
      const heSoXang = toPositiveNumber(bd.he_so_xang, 1) || 1;
      const phiToiThieu = toPositiveNumber(bd.phi_toi_thieu, 0);
      chiTietVanChuyen += ` Công thức: <strong>max(${phiToiThieu.toLocaleString("vi-VN")}đ, ${khoangCach.toFixed(1)} km × ${giaCoBan.toLocaleString("vi-VN")}đ × ${heSoXe} × ${heSoXang})</strong>.`;
      if (toPositiveNumber(bd.bu_phi_toi_thieu, 0) > 0) {
        chiTietVanChuyen += ` Tuyến này đang được bù phí tối thiểu <strong>${toPositiveNumber(
          bd.bu_phi_toi_thieu,
          0,
        ).toLocaleString("vi-VN")}đ</strong>.`;
      }
    } else {
      chiTietVanChuyen += ` Gói này đang dùng giá cố định theo vùng tuyến, chưa tách công thức theo km như gói giao ngay.`;
    }

    steps.push({
      step: idx === 0 ? 3 : undefined,
      serviceContext: svc.serviceName,
      title:
        idx === 0 ? `Phí vận chuyển chính` : null,
      detail: `[${svc.serviceName}] ${chiTietVanChuyen}`,
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
      goodsDetail += ` + Hệ số nhân ${multiplier} (tăng ${((multiplier - 1) * 100).toFixed(0)}% phần phí vận chuyển áp dụng)`;
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
  } else if (
    cheapestService &&
    toPositiveNumber(((cheapestService || {}).breakdown || {}).vehicleFee, 0) > 0
  ) {
    steps.push({
      step: 8,
      title: "Điều chỉnh theo phương tiện",
      detail: `Bạn đang chọn <strong>${cheapestService.selectedVehicleLabel}</strong>. Hệ thống đang tách riêng phần chênh lệch do phương tiện lớn hơn mức nền để bạn dễ đối chiếu.`,
      formula: `→ Điều chỉnh theo xe: <strong>${toPositiveNumber(
        ((cheapestService || {}).breakdown || {}).vehicleFee,
        0,
      ).toLocaleString("vi-VN")}đ</strong>`,
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
  const khoa_yeu_cau = normalizeVehicleKey(requestedKey);
  const khoa_goi_y = normalizeVehicleKey(suggestedKey);
  const safeRequestedKey = DOMESTIC_VEHICLE_OPTIONS[khoa_yeu_cau]
    ? khoa_yeu_cau
    : "auto";
  const finalKey =
    safeRequestedKey === "auto" ? khoa_goi_y : safeRequestedKey;
  const finalConfig =
    DOMESTIC_VEHICLE_OPTIONS[finalKey] || DOMESTIC_VEHICLE_OPTIONS.xe_may;

  return {
    key: finalKey,
    label: finalConfig.label,
    he_so_xe: finalConfig.he_so_xe,
  };
}

function getDomesticVehicleSuggestion({
  serviceType,
  itemType,
  billableWeight,
  actualWeight,
  zoneKey,
  length,
  width,
  height,
}) {
  const trong_luong_hang =
    toPositiveNumber(actualWeight, 0) || toPositiveNumber(billableWeight, 0);
  const kiem_tra_xe_may = kiem_tra_hang_hoa_xe_may({
    trong_luong_hang,
    chieu_dai: length,
    chieu_rong: width,
    chieu_cao: height,
  });
  if (!kiem_tra_xe_may.hop_le && trong_luong_hang <= 50) {
    return lay_cau_hinh_xe_giao_ngay("xe_4_banh_nho");
  }
  return goi_y_loai_xe_theo_trong_luong(trong_luong_hang);
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
  window.lay_cau_hinh_gia_xe_may_giao_ngay = lay_cau_hinh_gia_xe_may_giao_ngay;
  window.lay_gioi_han_hang_hoa_xe_may = lay_gioi_han_hang_hoa_xe_may;
  window.kiem_tra_hang_hoa_xe_may = kiem_tra_hang_hoa_xe_may;
  window.loadPricingDataSync = loadPricingDataSync;
}
