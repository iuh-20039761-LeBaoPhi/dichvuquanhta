import core from "./core/app-core.js";
import authModule from "./main-auth.js";
import bookingApi from "./main-booking-api.js";
import {
  buildBookingVehicleLabelMapFromPricingData,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
  getBookingVehicleLabel as getSharedBookingVehicleLabel,
  getBookingWeatherLabel,
  setBookingVehicleLabelMap,
} from "./main-booking-shared.js";
import customerPortalStore from "./main-customer-portal-store.js";
import {
  bookingFormsModule,
  bookingMapModule,
  bookingPricingModule,
  bookingWizardModule,
  formMediaModule,
  formSummariesModule,
} from "./ui/booking-runtime.js";

if (!core) {
  throw new Error("FastGo core module is required for booking forms.");
}

const partialPaths = {
  "dat-lich": core.toPublicUrl("assets/partials/bieu-mau/form-dat-lich-chuyendon.html"),
};

  const SERVICE_ALIAS_MAP = {
    chuyen_nha: "chuyen_nha",
    "chuyen-nha": "chuyen_nha",
    moving_house: "chuyen_nha",
    chuyen_van_phong: "chuyen_van_phong",
    "chuyen-van-phong": "chuyen_van_phong",
    moving_office: "chuyen_van_phong",
    chuyen_kho_bai: "chuyen_kho_bai",
    "chuyen-kho-bai": "chuyen_kho_bai",
    moving_warehouse: "chuyen_kho_bai",
  };

  const SERVICE_PRICING_ID_MAP = {
    chuyen_nha: "moving_house",
    chuyen_van_phong: "moving_office",
    chuyen_kho_bai: "moving_warehouse",
  };

  const PRICING_DATA_SERVICE_ID_MAP = {
    chuyen_nha: "moving_house",
    chuyen_van_phong: "moving_office",
    chuyen_kho_bai: "moving_warehouse",
    moving_house: "moving_house",
    moving_office: "moving_office",
    moving_warehouse: "moving_warehouse",
  };

  const bookingVehicleFallbackOptions = {
    chuyen_nha: {
      defaultValue: "xe_may_cho_hang",
      options: [
        { value: "xe_may_cho_hang", label: "Xe máy chở hàng" },
        { value: "ba_gac_may", label: "Ba gác máy" },
        { value: "xe_van_500kg", label: "Xe tải 500kg" },
        { value: "xe_tai_750kg", label: "Xe tải 750kg" },
        { value: "xe_tai_1_tan", label: "Xe tải 1 tấn" },
        { value: "xe_tai_1_5_tan", label: "Xe tải 1.5 tấn" },
        { value: "xe_tai_2_5_tan", label: "Xe tải 2 tấn" },
        { value: "xe_tai_3_5_tan", label: "Xe tải 3.5 tấn" },
      ],
    },
    chuyen_van_phong: {
      defaultValue: "xe_van_500kg",
      options: [
        { value: "xe_van_500kg", label: "Xe tải 500kg" },
        { value: "xe_tai_750kg", label: "Xe tải 750kg" },
        { value: "xe_tai_1_tan", label: "Xe tải 1 tấn" },
        { value: "xe_tai_1_5_tan", label: "Xe tải 1.5 tấn" },
        { value: "xe_tai_2_5_tan", label: "Xe tải 2 tấn" },
        { value: "xe_tai_3_5_tan", label: "Xe tải 3.5 tấn" },
        { value: "xe_tai_5_tan", label: "Xe tải 5 tấn" },
      ],
    },
    chuyen_kho_bai: {
      defaultValue: "xe_tai_1_5_tan",
      options: [
        { value: "xe_tai_1_5_tan", label: "Xe tải 1.5 tấn" },
        { value: "xe_tai_2_5_tan", label: "Xe tải 2 tấn" },
        { value: "xe_tai_3_5_tan", label: "Xe tải 3.5 tấn" },
        { value: "xe_tai_5_tan", label: "Xe tải 5 tấn" },
        { value: "xe_tai_7_5_tan", label: "Xe tải 8 tấn" },
        { value: "xe_tai_15_tan", label: "Xe tải 15 tấn" },
        { value: "dau_keo_container", label: "Đầu kéo container" },
      ],
    },
  };
  let bookingVehicleOptions = { ...bookingVehicleFallbackOptions };

  let pricingReferencePromise = null;
  function escapeHtml(value) {
    if (typeof core.escapeHtml === "function") {
      return core.escapeHtml(String(value ?? ""));
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  async function loadPartial(url) {
    if (typeof window.fetch !== "function") {
      console.error("Cannot load form partial: window.fetch is unavailable.");
      return "";
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return String(await response.text()).trim();
    } catch (error) {
      console.error("Cannot load form partial:", url, error);
    }
    return "";
  }

  function loadPricingReference() {
    if (!pricingReferencePromise) {
      pricingReferencePromise = fetch(
        core.toPublicUrl("assets/js/data/bang-gia-minh-bach.json"),
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Cannot load pricing reference: ${response.status}`,
            );
          }
          return response.json();
        })
        .then((pricingData) => {
          bookingVehicleOptions = buildBookingVehicleOptionsFromPricingData(
            pricingData,
          );
          setBookingVehicleLabelMap(
            buildBookingVehicleLabelMapFromPricingData(pricingData),
          );
          return pricingData;
        })
        .catch((error) => {
          console.error("Cannot load pricing reference:", error);
          bookingVehicleOptions = { ...bookingVehicleFallbackOptions };
          return [];
        });
    }

    return pricingReferencePromise;
  }

  function normalizeService(rawValue) {
    const value = String(rawValue || "")
      .trim()
      .toLowerCase();
    return SERVICE_ALIAS_MAP[value] || "";
  }

  function getPricingServiceId(rawValue) {
    const normalized = normalizeService(rawValue);
    return SERVICE_PRICING_ID_MAP[normalized] || "";
  }

  function normalizePricingDataServiceId(rawValue) {
    const value = String(rawValue || "")
      .trim()
      .toLowerCase();
    return PRICING_DATA_SERVICE_ID_MAP[value] || "";
  }

  function getSelectedLabel(select) {
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    return option ? String(option.textContent || "").trim() : "";
  }

  function getCheckedLabel(scope, selector) {
    const input = scope.querySelector(`${selector}:checked`);
    if (!input) return "";
    const label = input.closest("label");
    return label ? String(label.textContent || "").trim() : "";
  }

  function getCheckedLabels(scope, selector) {
    return Array.from(scope.querySelectorAll(`${selector}:checked`))
      .map((input) => {
        const label = input.closest("label");
        return label ? String(label.textContent || "").trim() : "";
      })
      .filter(Boolean);
  }

  function queryFirst(scope, selectors) {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorList) {
      const node = scope.querySelector(selector);
      if (node) return node;
    }

    return null;
  }

  function prefillInputValue(input, value) {
    if (!input) return;

    const currentValue = String(input.value || "").trim();
    const nextValue = String(value || "").trim();
    if (currentValue || !nextValue) return;

    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function prefillBookingContactFields(scope, portalStore) {
    if (!scope || !portalStore) return;

    try {
      await Promise.resolve(portalStore.bootstrapAuthSession?.());
    } catch (error) {
      console.warn("Cannot bootstrap auth session for booking prefill:", error);
    }

    const identity = portalStore.readIdentity?.() || {};
    const fullNameInput = queryFirst(scope, [
      "#ho-ten-dat-lich",
      "[name='ho_ten']",
    ]);
    const phoneInput = queryFirst(scope, [
      "#so-dien-thoai-dat-lich",
      "[name='so_dien_thoai']",
    ]);

    prefillInputValue(fullNameInput, identity.hovaten);
    prefillInputValue(phoneInput, identity.sodienthoai);
  }

  function cloneBookingVehicleConfig(config) {
    if (!config || typeof config !== "object") return null;
    return {
      defaultValue: String(config.defaultValue || "").trim(),
      options: Array.isArray(config.options)
        ? config.options.map((item) => ({
            value: String(item?.value || "").trim(),
            label: String(item?.label || "").trim(),
          }))
        : [],
    };
  }

  function buildBookingVehicleOptionsFromPricingData(pricingData) {
    const nextOptions = {};
    const services = Array.isArray(pricingData) ? pricingData : [];

    services.forEach((serviceData) => {
      const serviceId = normalizePricingDataServiceId(serviceData?.id);
      const normalizedService = Object.entries(SERVICE_PRICING_ID_MAP).find(
        ([, pricingId]) => pricingId === serviceId,
      )?.[0];
      const vehicleEntries =
        typeof core.getPricingVehicleEntries === "function"
          ? core.getPricingVehicleEntries(serviceData)
          : [];

      if (!normalizedService || !vehicleEntries.length) return;

      nextOptions[normalizedService] = {
        defaultValue: String(vehicleEntries[0]?.slug || "").trim(),
        options: vehicleEntries
          .map((entry) => ({
            value: String(entry?.slug || "").trim(),
            label: String(entry?.ten_hien_thi || "").trim(),
          }))
          .filter((entry) => entry.value && entry.label),
      };
    });

    return {
      ...bookingVehicleFallbackOptions,
      ...nextOptions,
    };
  }

  function getCheckedLabelsFromSelectors(scope, selectors) {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    const labels = [];
    const seen = new Set();

    selectorList.forEach((selector) => {
      getCheckedLabels(scope, selector).forEach((label) => {
        if (seen.has(label)) return;
        seen.add(label);
        labels.push(label);
      });
    });

    return labels;
  }

  function getSelectedMediaFiles(scope, selector) {
    if (typeof formMediaModule?.collectFileItemsFromInputs === "function") {
      return formMediaModule
        .collectFileItemsFromInputs(scope, selector)
        .map((item) => item?.file)
        .filter((file) => file instanceof File);
    }

    return Array.from(scope.querySelectorAll(selector)).flatMap((input) =>
      Array.from(input.files || []).filter((file) => file instanceof File),
    );
  }

  async function uploadSelectedBookingMedia(scope) {
    const warnings = [];
    const imageFiles = getSelectedMediaFiles(scope, "#tep-anh-dat-lich");
    const videoFiles = getSelectedMediaFiles(scope, "#tep-video-dat-lich");

    if (!imageFiles.length && !videoFiles.length) {
      return {
        imageLinks: [],
        videoLinks: [],
        warnings,
      };
    }

    if (typeof core.uploadFilesToDrive !== "function") {
      return {
        imageLinks: [],
        videoLinks: [],
        warnings: [
          "Media đính kèm chưa được tải lên Google Drive vì thiếu helper upload.",
        ],
      };
    }

    const imageLinks = [];
    const videoLinks = [];

    if (imageFiles.length) {
      try {
        const uploadedImages = await core.uploadFilesToDrive(imageFiles, {
          proxyFile: "upload.php",
          uploadKind: "order_media",
        });
        imageLinks.push(
          ...uploadedImages
            .map((item) => String(item?.url || item?.download_url || "").trim())
            .filter(Boolean),
        );
      } catch (error) {
        console.error("Không thể tải ảnh đặt lịch chuyển dọn lên Drive:", error);
        warnings.push("Ảnh đính kèm chưa được tải lên Google Drive.");
      }
    }

    if (videoFiles.length) {
      try {
        const uploadedVideos = await core.uploadFilesToDrive(videoFiles, {
          proxyFile: "upload.php",
          uploadKind: "order_media",
        });
        videoLinks.push(
          ...uploadedVideos
            .map((item) => String(item?.url || item?.download_url || "").trim())
            .filter(Boolean),
        );
      } catch (error) {
        console.error("Không thể tải video đặt lịch chuyển dọn lên Drive:", error);
        warnings.push("Video đính kèm chưa được tải lên Google Drive.");
      }
    }

    return {
      imageLinks,
      videoLinks,
      warnings,
    };
  }

  function getBookingPayload(scope, portalStore, mediaLinks = {}) {
    const identity = portalStore?.readIdentity?.() || {};
    const form = scope.querySelector("form[data-loai-bieu-mau='dat-lich']");
    const formData = form ? new FormData(form) : new FormData();
    const serviceSelect = scope.querySelector("#loai-dich-vu-dat-lich");
    const vehicleSelect = scope.querySelector("#loai-xe-dat-lich");
    const weatherInput = scope.querySelector("#thoi-tiet-du-kien-dat-lich-gui");
    const imageLinks = Array.isArray(mediaLinks?.imageLinks)
      ? mediaLinks.imageLinks.filter(Boolean)
      : [];
    const videoLinks = Array.isArray(mediaLinks?.videoLinks)
      ? mediaLinks.videoLinks.filter(Boolean)
      : [];
    const accessConditions = getCheckedLabels(
      scope,
      "[data-nhom-chip='dieu_kien_dat_lich'] input[type='checkbox']",
    );
    const serviceDetails = getCheckedLabelsFromSelectors(scope, [
      "[data-nhom-chip='chi_tiet_nha_dat_lich'] input[type='checkbox']",
      "[data-nhom-chip='chi_tiet_van_phong_dat_lich'] input[type='checkbox']",
      "[data-nhom-chip='chi_tiet_kho_bai_dat_lich'] input[type='checkbox']",
    ]);
    const requiresSurveyFirst =
      String(formData.get("can_khao_sat_truoc") || "").trim() === "1";
    const pricingBreakdown = getBookingPricingBreakdown(scope);
    const totalAmount = Number(
      String(
        scope.querySelector("[data-tong-gia-chot-dat-lich]")?.textContent || "",
      ).replace(/[^\d]/g, ""),
    );

    const serviceValue = normalizeService(serviceSelect?.value || "");
    const scheduleTimeValue = String(
      formData.get("khung_gio_thuc_hien") || "",
    ).trim();
    const weatherValue = String(weatherInput?.value || "").trim();
    const vehicleValue = String(formData.get("loai_xe") || "").trim();
    const serviceLabel =
      getSelectedLabel(scope.querySelector("#loai-dich-vu-dat-lich")) ||
      getBookingServiceLabel(serviceValue);
    const scheduleTimeLabel =
      getSelectedLabel(scope.querySelector("#khung-gio-dat-lich")) ||
      getBookingScheduleTimeLabel(scheduleTimeValue);
    const vehicleLabel =
      getSelectedLabel(scope.querySelector("#loai-xe-dat-lich")) ||
      getSharedBookingVehicleLabel(vehicleValue);
    const weatherLabel =
      getSelectedLabel(scope.querySelector("#thoi-tiet-du-kien-dat-lich")) ||
      getBookingWeatherLabel(weatherValue);

    return {
      loai_dich_vu: serviceValue,
      ten_dich_vu: serviceLabel,
      ho_ten: String(formData.get("ho_ten") || identity.hovaten || "").trim(),
      so_dien_thoai: String(
        formData.get("so_dien_thoai") || identity.sodienthoai || "",
      ).trim(),
      ten_cong_ty: String(formData.get("ten_cong_ty") || "").trim(),
      dia_chi_di: String(formData.get("dia_chi_di") || "").trim(),
      dia_chi_den: String(formData.get("dia_chi_den") || "").trim(),
      ngay_thuc_hien: String(formData.get("ngay_thuc_hien") || "").trim(),
      khung_gio_thuc_hien: scheduleTimeValue,
      ten_khung_gio_thuc_hien: scheduleTimeLabel,
      thoi_tiet_du_kien: weatherValue,
      ten_thoi_tiet_du_kien: weatherLabel,
      loai_xe: vehicleValue,
      ten_loai_xe: vehicleLabel,
      ghi_chu: String(formData.get("ghi_chu") || "").trim(),
      dieu_kien_tiep_can: accessConditions.join(" | "),
      chi_tiet_dich_vu: [
        ...serviceDetails,
        ...(requiresSurveyFirst
          ? ["Cần khảo sát trước (miễn phí khi chốt đơn)"]
          : []),
      ].join(" | "),
      tong_tam_tinh: totalAmount,
      pricing_breakdown_json: JSON.stringify(pricingBreakdown),
      khoang_cach_km: String(
        scope.querySelector("[data-gia-tri-khoang-cach-dat-lich]")
          ?.textContent || "",
      )
        .replace(",", ".")
        .trim(),
      anh_dinh_kem: imageLinks.join(" | "),
      video_dinh_kem: videoLinks.join(" | "),
      customer_email: String(identity.email || "").trim(),
    };
  }

  function getBookingPricingBreakdown(scope) {
    const lineSelector =
      "[data-chi-tiet-gia-chot-dat-lich] .muc-chi-tiet-gia-chot-dat-lich";
    const nodes = Array.from(scope.querySelectorAll(lineSelector));

    return nodes
      .map((node) => {
        const label = String(
          node.querySelector(".muc-chi-tiet-gia-chot-dat-lich__hang span")
            ?.textContent || "",
        ).trim();
        const amount = String(
          node.querySelector(".muc-chi-tiet-gia-chot-dat-lich__hang strong")
            ?.textContent || "",
        ).trim();
        const detail = String(
          node.querySelector("p")?.textContent || "",
        ).trim();

        if (!label && !amount && !detail) return null;

        return {
          label,
          amount,
          detail,
        };
      })
      .filter(Boolean);
  }

  function buildBookingSheetPayload(scope, payload, remoteId) {
    const weatherLabel = getSelectedLabel(
      scope.querySelector("#thoi-tiet-du-kien-dat-lich"),
    );
    const pricingTimeLabel = getBookingPricingTimeLabel(
      scope.querySelector("[data-khung-gio-tinh-gia]")?.value || "",
    );
    const pricingBreakdown = getBookingPricingBreakdown(scope);

    return {
      sheet_type: "Dịch vụ Chuyển Dọn",
      created_at: payload.created_at || payload.created_date || new Date().toISOString(),
      "Mã yêu cầu": payload.ma_yeu_cau_noi_bo || "",
      "ID KRUD": String(remoteId || "").trim(),
      "Người liên hệ": payload.ho_ten || "",
      "Số điện thoại": payload.so_dien_thoai || "",
      Email: payload.customer_email || "",
      "Đơn vị / công ty": payload.ten_cong_ty || "",
      "Loại dịch vụ": getSelectedLabel(scope.querySelector("#loai-dich-vu-dat-lich")) || payload.loai_dich_vu || "",
      "Loại xe": getSelectedLabel(scope.querySelector("#loai-xe-dat-lich")) || payload.loai_xe || "",
      "Địa chỉ điểm đi": payload.dia_chi_di || "",
      "Địa chỉ điểm đến": payload.dia_chi_den || "",
      "Ngày thực hiện": payload.ngay_thuc_hien || "",
      "Khung giờ thực hiện": getSelectedLabel(scope.querySelector("#khung-gio-dat-lich")) || payload.khung_gio_thuc_hien || "",
      "Khung giờ tính giá": pricingTimeLabel || "",
      "Thời tiết dự kiến": weatherLabel || payload.thoi_tiet_du_kien || "",
      "Khoảng cách (km)": Number(payload.khoang_cach_km || 0),
      "Điều kiện tiếp cận": payload.dieu_kien_tiep_can || "",
      "Chi tiết dịch vụ": payload.chi_tiet_dich_vu || "",
      "Khảo sát trước": scope.querySelector("#can-khao-sat-truoc-dat-lich")
        ?.checked
        ? "Có"
        : "Không",
      "Tổng tạm tính": Number(payload.tong_tam_tinh || 0),
      "Ảnh đính kèm": payload.anh_dinh_kem || "",
      "Video đính kèm": payload.video_dinh_kem || "",
      "Ghi chú": payload.ghi_chu || "",
    };
  }

  async function syncBookingSheet(scope, payload, remoteId) {
    if (!bookingApi || typeof bookingApi.syncGoogleSheet !== "function") {
      throw new Error("Không tìm thấy lớp API đồng bộ Google Sheets.");
    }

    const sheetPayload = buildBookingSheetPayload(scope, payload, remoteId);
    return bookingApi.syncGoogleSheet(sheetPayload);
  }

  async function createBookingRequest(scope, portalStore) {
    if (!bookingApi || typeof bookingApi.createBooking !== "function") {
      throw new Error("Không tìm thấy lớp API đặt lịch chuyển dọn.");
    }

    const form = scope.querySelector("form[data-loai-bieu-mau='dat-lich']");
    const formData = form ? new FormData(form) : new FormData();
    const bookingContact = {
      hovaten: String(formData.get("ho_ten") || "").trim(),
      sodienthoai: String(formData.get("so_dien_thoai") || "").trim(),
    };
    let accountSetup = null;
    const authService = authModule || null;
    const savedRole = portalStore?.getSavedRole?.() || "";
    const bookingPhone = normalizePhoneValue(bookingContact.sodienthoai);
    let hasMatchingCustomerSession = false;

    if (savedRole === "khach-hang" && portalStore?.fetchProfile) {
      try {
        const verifiedProfile = await portalStore.fetchProfile();
        const profilePhone = normalizePhoneValue(
          verifiedProfile?.sodienthoai || "",
        );
        hasMatchingCustomerSession = !!(
          bookingPhone &&
          profilePhone &&
          bookingPhone === profilePhone
        );
      } catch (error) {
        hasMatchingCustomerSession = false;
      }
    }

    if (!hasMatchingCustomerSession) {
      if (typeof authService?.ensureCustomerAccountForBooking !== "function") {
        throw new Error(
          "Không thể xác minh hoặc tạo tài khoản khách hàng cho yêu cầu này.",
        );
      }

      accountSetup = await authService.ensureCustomerAccountForBooking(
        bookingContact,
      );
    }

    let mediaUploadResult = {
      imageLinks: [],
      videoLinks: [],
      warnings: [],
    };
    try {
      mediaUploadResult = await uploadSelectedBookingMedia(scope);
    } catch (mediaError) {
      console.error("Không thể xử lý media đặt lịch chuyển dọn:", mediaError);
      mediaUploadResult.warnings.push(
        "Media đính kèm chưa được tải lên Google Drive.",
      );
    }
    const payload = getBookingPayload(scope, portalStore, mediaUploadResult);
    let bookingResult = null;
    try {
      bookingResult = await bookingApi.createBooking(payload);
    } catch (krudError) {
      console.error("Không thể lưu yêu cầu đặt lịch chuyển dọn vào KRUD:", krudError);
      const uploadedMediaBeforeKrudError =
        mediaUploadResult.imageLinks.length || mediaUploadResult.videoLinks.length;
      throw new Error(
        uploadedMediaBeforeKrudError
          ? "Media có thể đã tải lên Google Drive, nhưng yêu cầu chưa được lưu vào KRUD."
          : krudError?.message ||
              "Không thể lưu yêu cầu đặt lịch vào KRUD lúc này.",
      );
    }
    return {
      ...bookingResult,
      accountSetup,
      mediaUploadWarnings: mediaUploadResult.warnings,
    };
  }

  function buildBookingSuccessMessage(
    accountSetup,
    sheetSyncNote,
    mediaUploadWarnings = [],
  ) {
    let message = `Yêu cầu đặt lịch đã được lưu thành công.${sheetSyncNote}`;

    if (Array.isArray(mediaUploadWarnings) && mediaUploadWarnings.length) {
      message += ` ${mediaUploadWarnings.join(" ")}`;
    }

    if (accountSetup?.status === "created") {
      message += " Tài khoản khách hàng đã được tạo tự động cho yêu cầu này.";
      return message;
    }

    if (accountSetup?.status === "existing" && !accountSetup.auto_logged_in) {
      message += " Số điện thoại này đã có tài khoản sẵn trong hệ thống.";
    }

    return message;
  }

  let bookingSuccessRedirectTimer = null;
  const BOOKING_SUCCESS_REDIRECT_DELAY_MS = 3000;

  function clearBookingSuccessRedirectTimer() {
    if (!bookingSuccessRedirectTimer) return;
    window.clearTimeout(bookingSuccessRedirectTimer);
    bookingSuccessRedirectTimer = null;
  }

  function countChecked(scope, selector) {
    return scope.querySelectorAll(`${selector}:checked`).length;
  }

  function countFiles(scope, selector) {
    return Array.from(scope.querySelectorAll(selector)).reduce(
      (total, input) => {
        return total + (input.files ? input.files.length : 0);
      },
      0,
    );
  }

  function mapBookingPricingTimeSlot(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    if (
      value === "buoi_toi" ||
      value === "ban_dem" ||
      value === "can_xac_nhan" ||
      value === "binh_thuong" ||
      value === "cuoi_tuan"
    ) {
      return value;
    }
    if (value === "toi") return "buoi_toi";
    if (value === "dem") return "ban_dem";
    if (value === "linh_dong") return "can_xac_nhan";
    return "binh_thuong";
  }

  function getBookingPricingTimeLabel(rawValue) {
    const mapped = mapBookingPricingTimeSlot(rawValue);
    if (!mapped) return "Chưa chọn";
    if (mapped === "buoi_toi") return "Buổi tối";
    if (mapped === "ban_dem") return "Ca đêm";
    if (mapped === "cuoi_tuan") return "Cuối tuần";
    if (mapped === "can_xac_nhan") return "Chờ xác nhận";
    return "Ban ngày";
  }

  function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  function getFormSummaryDeps() {
    return {
      core,
      queryFirst,
      getSelectedLabel,
      getCheckedLabels,
      getCheckedLabelsFromSelectors,
      countFiles,
      normalizeService,
      calculateDistanceKm,
      formatBookingSchedule,
      getBookingPricingTimeLabel,
      getBookingVehicleLabel,
    };
  }

  function getBookingPricingDeps() {
    return {
      core,
      loadPricingReference,
      getPricingServiceId,
      normalizePricingDataServiceId,
      normalizeService,
      resolveBookingVehicleEntry,
      getBookingDistanceKmValue,
      getBookingNumericValue,
      isBookingChecked,
      getCheckedLabelsFromSelectors,
      getBookingPricingTimeLabel,
    };
  }

  function getBookingMapDeps() {
    return {
      renderFormSummaries,
      renderBookingPricing,
      getSelectedLabel,
      calculateDistanceKm,
    };
  }

  function clearFieldErrorState(input) {
    if (!input || !input.classList.contains("input-error")) return;

    input.classList.remove("input-error");
    input.removeAttribute("aria-invalid");

    const errorId = input.getAttribute("data-error-id");
    if (errorId) {
      const describedBy = String(input.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => token !== errorId);
      if (describedBy.length) {
        input.setAttribute("aria-describedby", describedBy.join(" "));
      } else {
        input.removeAttribute("aria-describedby");
      }
      input.removeAttribute("data-error-id");
    }

    const group = input.closest(".nhom-truong") || input.parentElement;
    const msg = group?.querySelector(".field-error-msg");
    if (msg) msg.remove();
  }

  function syncBookingUi(scope) {
    syncPhoneFieldValidity(scope);
    syncBookingPricingTimeSlot(scope);
    renderBookingMapPreview(scope);
    renderFormSummaries(scope);
    renderBookingMediaReview(scope);
    renderBookingPricing(scope);
    refreshBookingWeather(scope);
  }

  function getBookingWizardDeps() {
    return {
      isVisibleFormField,
      isValidVietnamesePhone,
      renderFormSummaries,
      renderBookingMediaReview,
      renderBookingPricing,
    };
  }

  function validateBookingBeforeSubmit(scope) {
    if (!bookingWizardModule?.validateAll) return true;
    return bookingWizardModule.validateAll(scope, getBookingWizardDeps());
  }

  function getBookingFormDeps() {
    return {
      clearFieldErrorState,
      syncBookingUi,
      initBookingMap,
      syncBookingExecutionDateLimits,
      syncBookingVehicleOptions,
      initBookingStepWizard,
    };
  }

  // Wrapper cho module map/forecast của form đặt lịch.
  function syncBookingExecutionDateLimits(scope) {
    if (!bookingMapModule?.syncBookingExecutionDateLimits) return;
    return bookingMapModule.syncBookingExecutionDateLimits(scope);
  }

  // Wrapper cho module map/forecast của form đặt lịch.
  async function refreshBookingWeather(scope) {
    if (!bookingMapModule?.refreshBookingWeather) return;
    return bookingMapModule.refreshBookingWeather(scope, {
      renderFormSummaries,
      renderBookingPricing,
      getSelectedLabel,
    });
  }

  // Wrapper cho module map của form đặt lịch.
  function renderBookingMapPreview(scope) {
    if (!bookingMapModule?.renderBookingMapPreview) return;
    return bookingMapModule.renderBookingMapPreview(scope);
  }

  // Wrapper cho module map của form đặt lịch.
  function initBookingMap(scope) {
    if (!bookingMapModule?.initBookingMap) return;
    return bookingMapModule.initBookingMap(scope, getBookingMapDeps());
  }

  function formatDateTimeSummary(dateValue, timeValue, timeLabel) {
    const rawDateText = String(dateValue || "").trim();
    const dateText = /^\d{4}-\d{2}-\d{2}$/.test(rawDateText)
      ? rawDateText.split("-").reverse().join("-")
      : rawDateText;
    const hasTime = !!String(timeValue || "").trim();
    const timeText = String(timeLabel || "").trim();

    if (dateText && hasTime) {
      return `${dateText} • ${timeText}`;
    }

    if (dateText) return dateText;
    if (hasTime) return timeText;
    return "Chưa chọn";
  }

  function formatBookingSchedule(scope) {
    const dateInput = scope.querySelector("#ngay-thuc-hien-dat-lich");
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const dateValue = String(dateInput?.value || "").trim();
    const timeLabel = getSelectedLabel(timeSelect);
    return formatDateTimeSummary(dateValue, timeSelect?.value, timeLabel);
  }

  function syncBookingVehicleOptions(scope, serviceValue) {
    const select = scope.querySelector("#loai-xe-dat-lich");
    if (!select) return;

    const normalized = normalizeService(serviceValue);
    const config = getBookingVehicleConfig(normalized);
    const previousValue = String(select.value || "").trim();

    if (!config) {
      select.innerHTML =
        '<option value="">Chọn dịch vụ để chọn loại xe</option>';
      select.value = "";
      return;
    }

    select.innerHTML = [
      '<option value="">Chọn loại xe phù hợp</option>',
      ...config.options.map(
        (item) => `<option value="${item.value}">${item.label}</option>`,
      ),
    ].join("");

    if (config.options.some((item) => item.value === previousValue)) {
      select.value = previousValue;
    } else {
      select.value = config.defaultValue;
    }
  }

  function getBookingVehicleConfig(serviceValue) {
    const normalized = normalizeService(serviceValue);
    return cloneBookingVehicleConfig(bookingVehicleOptions[normalized]);
  }

  function resolveBookingVehicleEntry(scope, serviceValue, vehicleEntries) {
    const select = queryFirst(scope, [
      "#loai-xe-dat-lich",
      "select[name='loai_xe']",
      "[data-truong-loai-xe-dat-lich]",
    ]);
    const entries = Array.isArray(vehicleEntries) ? vehicleEntries : [];
    const currentValue = String(select?.value || "").trim();
    const currentEntry = entries.find(
      (item) => String(item?.slug || "").trim() === currentValue,
    );

    if (currentEntry) {
      return currentEntry;
    }

    const config = getBookingVehicleConfig(serviceValue);
    const fallbackValue =
      config?.defaultValue || String(entries[0]?.slug || "").trim();
    const fallbackEntry = entries.find(
      (item) => String(item?.slug || "").trim() === fallbackValue,
    );

    if (select && fallbackValue) {
      const optionExists = Array.from(select.options).some(
        (option) => String(option.value || "").trim() === fallbackValue,
      );

      if (!optionExists && config) {
        syncBookingVehicleOptions(scope, serviceValue);
      }

      const hasResolvedOption = Array.from(select.options).some(
        (option) => String(option.value || "").trim() === fallbackValue,
      );

      if (!hasResolvedOption) {
        const option = document.createElement("option");
        option.value = fallbackValue;
        option.textContent =
          config?.options.find((item) => item.value === fallbackValue)?.label ||
          fallbackEntry?.ten_hien_thi ||
          fallbackValue;
        select.appendChild(option);
      }

      select.value = fallbackValue;
    }

    return fallbackEntry || null;
  }

  function getBookingVehicleLabel(scope, serviceValue) {
    const select = queryFirst(scope, [
      "#loai-xe-dat-lich",
      "select[name='loai_xe']",
      "[data-truong-loai-xe-dat-lich]",
    ]);
    const selectedLabel = getSelectedLabel(select);
    if (selectedLabel) return selectedLabel;

    const config = getBookingVehicleConfig(serviceValue);
    return (
      config?.options.find((item) => item.value === config.defaultValue)
        ?.label || "Chưa chọn"
    );
  }

  function syncBookingPricingTimeSlot(scope) {
    const timeSelect = scope.querySelector("#khung-gio-dat-lich");
    const hiddenInput = scope.querySelector("[data-khung-gio-tinh-gia]");
    if (!timeSelect || !hiddenInput) return;

    hiddenInput.value = mapBookingPricingTimeSlot(timeSelect.value);
  }

  function renderBookingMediaReview(scope) {
    if (!formMediaModule?.renderBookingMediaReview) return;
    return formMediaModule.renderBookingMediaReview(core, scope);
  }

  function parseBookingNumber(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return 0;

    let cleaned = raw.replace(/\s+/g, "").replace(/[^\d.,-]/g, "");
    if (!cleaned) return 0;

    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/,/g, ".");
    } else {
      const dotMatches = cleaned.match(/\./g) || [];
      if (dotMatches.length > 1) {
        cleaned = cleaned.replace(/\./g, "");
      }
    }

    const value = Number(cleaned);
    return Number.isFinite(value) ? value : 0;
  }

  function getBookingNumericValue(scope, selector) {
    const value = parseBookingNumber(
      scope.querySelector(selector)?.value || "",
    );
    return value > 0 ? value : 0;
  }

  function isBookingChecked(scope, selector) {
    return !!scope.querySelector(`${selector}:checked`);
  }

  function getBookingDistanceKmValue(scope) {
    const fromLat = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_di_lat']")
        ?.value || 0,
    );
    const fromLng = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_di_lng']")
        ?.value || 0,
    );
    const toLat = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_den_lat']")
        ?.value || 0,
    );
    const toLng = Number(
      scope.querySelector("[data-ban-do-dat-lich-toa-do='diem_den_lng']")
        ?.value || 0,
    );

    if (!fromLat || !fromLng || !toLat || !toLng) return 0;
    return calculateDistanceKm(fromLat, fromLng, toLat, toLng);
  }

  // Wrapper mỏng để giữ nguyên các điểm gọi cũ trong file này.
  async function renderBookingPricing(scope) {
    if (!bookingPricingModule?.render) return;
    return bookingPricingModule.render(scope, getBookingPricingDeps());
  }

  function renderBookingSummary(scope) {
    if (!formSummariesModule?.renderBookingSummary) return;
    return formSummariesModule.renderBookingSummary(
      scope,
      getFormSummaryDeps(),
    );
  }

  function renderFormSummaries(scope) {
    renderBookingSummary(scope);
  }

  function resetFieldValue(field) {
    field.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.matches("input[type='checkbox'], input[type='radio']")) {
        input.checked = false;
        return;
      }

      if (input.tagName === "SELECT") {
        input.selectedIndex = 0;
        return;
      }

      input.value = "";
    });
  }

  function buildServiceContextHref(baseHref, serviceValue) {
    const href = String(baseHref || "").trim();
    if (!href) return "";

    const [beforeHash, hashPart] = href.split("#");
    const [pathPart, queryPart] = beforeHash.split("?");
    const params = new URLSearchParams(queryPart || "");
    const normalized = normalizeService(serviceValue);

    if (normalized) {
      params.set("dich-vu", normalized);
    } else {
      params.delete("dich-vu");
    }

    const query = params.toString();
    return `${pathPart}${query ? `?${query}` : ""}${hashPart ? `#${hashPart}` : ""}`;
  }

  function syncServiceContextLinks(serviceValue) {
    document.querySelectorAll("[data-giu-dich-vu]").forEach((link) => {
      const baseHref =
        link.getAttribute("data-base-href") ||
        link.getAttribute("data-giu-dich-vu") ||
        link.getAttribute("href") ||
        "";
      if (!baseHref) return;

      if (!link.hasAttribute("data-base-href")) {
        link.setAttribute("data-base-href", baseHref);
      }

      link.setAttribute(
        "href",
        buildServiceContextHref(baseHref, serviceValue),
      );
    });
  }

  function isVisibleFormField(field) {
    return !field.disabled && !field.hidden && !field.closest("[hidden]");
  }

  function normalizePhoneValue(value) {
    return String(value || "")
      .replace(/\s+/g, "")
      .trim();
  }

  function isValidVietnamesePhone(value) {
    return /^(0|\+84)[0-9]{9}$/.test(normalizePhoneValue(value));
  }

  function syncPhoneFieldValidity(scope) {
    scope.querySelectorAll("input[type='tel']").forEach((field) => {
      if (!isVisibleFormField(field)) {
        field.setCustomValidity("");
        return;
      }

      const value = String(field.value || "").trim();
      if (!value) {
        field.setCustomValidity("");
        return;
      }

      field.setCustomValidity(
        isValidVietnamesePhone(value)
          ? ""
          : "Số điện thoại không hợp lệ (cần đủ 10 số).",
      );
    });
  }

  // Đồng bộ toàn bộ UI phụ thuộc vào loại dịch vụ đang chọn: field, label, giá và summary.
  function applyServiceState(scope, serviceValue) {
    const normalized = normalizeService(serviceValue);
    const emptyPanel = scope.querySelector("[data-khoi-mac-dinh]");
    const companyLabel = scope.querySelector("[data-nhan-cong-ty-dat-lich]");

    if (companyLabel) {
      companyLabel.textContent =
        normalized === "chuyen_van_phong"
          ? "Tên công ty"
          : normalized === "chuyen_kho_bai"
            ? "Tên kho hoặc đơn vị vận hành"
            : "Tên công ty hoặc đơn vị";
    }

    scope.querySelectorAll("[data-khoi-dich-vu]").forEach((panel) => {
      const shouldShow =
        normalized && panel.getAttribute("data-khoi-dich-vu") === normalized;
      panel.hidden = !shouldShow;
      panel.classList.toggle("is-hidden", !shouldShow);
    });

    if (emptyPanel) {
      emptyPanel.hidden = !!normalized;
    }

    scope.querySelectorAll("[data-hien-theo-dich-vu]").forEach((field) => {
      const allowed = String(field.getAttribute("data-hien-theo-dich-vu") || "")
        .split(",")
        .map((value) => normalizeService(value))
        .filter(Boolean);
      const shouldShow = !!normalized && allowed.includes(normalized);

      field.hidden = !shouldShow;
      field.classList.toggle("is-hidden", !shouldShow);

      if (!shouldShow) {
        resetFieldValue(field);
      }
    });

    syncBookingVehicleOptions(scope, normalized);
    syncBookingPricingTimeSlot(scope);
    renderFormSummaries(scope);
    renderBookingPricing(scope);
    syncServiceContextLinks(normalized);
    loadPricingReference().then(() => {
      const activeService = normalizeService(
        scope.querySelector("[data-truong-dich-vu]")?.value || "",
      );
      if (activeService !== normalized) return;
      syncBookingVehicleOptions(scope, activeService);
      renderFormSummaries(scope);
      renderBookingPricing(scope);
    });

    if (scope.__bookingMapState?.map) {
      const refreshMapLayout = function () {
        scope.__bookingMapState.map.invalidateSize();
        scope.__bookingMapState.updateMapBounds?.();
      };

      refreshMapLayout();
      window.requestAnimationFrame(refreshMapLayout);
      window.setTimeout(refreshMapLayout, 120);
    }
  }

  function initServiceSelect(scope) {
    const select = scope.querySelector("[data-truong-dich-vu]");
    if (!select) return;

    const params = new URLSearchParams(window.location.search);
    const initialValue = normalizeService(params.get("dich-vu"));
    if (initialValue) {
      select.value = initialValue;
    }

    syncServiceContextLinks(select.value);
    applyServiceState(scope, select.value);
    select.addEventListener("change", function () {
      applyServiceState(scope, select.value);
    });
  }

  function initFileInputs(scope) {
    if (!formMediaModule?.initFileInputs) return;
    return formMediaModule.initFileInputs(core, scope);
  }

  function initInfoToggles(scope) {
    const detailsList = Array.from(scope.querySelectorAll(".goi-y-thong-tin"));
    if (!detailsList.length) return;

    detailsList.forEach((details) => {
      details.addEventListener("toggle", function () {
        if (!details.open) return;

        detailsList.forEach((other) => {
          if (other !== details) {
            other.open = false;
          }
        });
      });
    });
  }

  function initBookingStepWizard(scope) {
    if (!bookingWizardModule?.init) return;
    return bookingWizardModule.init(scope, getBookingWizardDeps());
  }

  function initBookingFormUi(scope) {
    if (!bookingFormsModule?.init) return;
    return bookingFormsModule.init(scope, getBookingFormDeps());
  }

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function"
      ? core.toProjectUrl(path)
      : path;
  }

  function renderBookingSuccessState(scope, bookingResult, options = {}) {
    const submitStep = scope.querySelector('[data-booking-step="5"]');
    const finalActions = scope.querySelector("[data-booking-final-actions]");
    const notice = scope.querySelector("[data-thong-bao-bieu-mau]");
    const requestCode =
      bookingResult?.payload?.ma_yeu_cau_noi_bo ||
      bookingResult?.remoteId ||
      "CDL-00000000-0000000";
    const orderDetailIdentifier =
      String(bookingResult?.remoteId || "").trim() || requestCode;
    const statusMessage = String(options.statusMessage || "").trim();
    const isLoggedIn = !!(customerPortalStore?.getSavedRole?.() === "khach-hang");
    const historyUrl = getProjectUrl("khach-hang/danh-sach-don-hang-chuyendon.html");
    const secondaryActionHref = isLoggedIn
      ? (typeof core.buildOrderDetailUrl === "function"
          ? core.buildOrderDetailUrl("khach-hang/chi-tiet-hoa-don-chuyendon.html", orderDetailIdentifier)
          : `khach-hang/chi-tiet-hoa-don-chuyendon.html?madonhang=${encodeURIComponent(orderDetailIdentifier)}`)
      : core.getSharedLoginUrl({
          redirect: core.getCurrentRelativeUrl(),
        });
    const secondaryActionLabel = isLoggedIn
      ? "Xem chi tiết hóa đơn"
      : "Đăng nhập để theo dõi";
    const tertiaryAction = isLoggedIn
      ? `
          <a class="nut-phu" href="${escapeHtml(historyUrl)}">Danh sách đơn hàng</a>
        `
      : "";
    const redirectNotice = isLoggedIn
      ? `<p class="trang-thai-thanh-cong-dat-lich__ghi-chu">Hệ thống sẽ tự chuyển sang danh sách đơn hàng sau ${Math.round(BOOKING_SUCCESS_REDIRECT_DELAY_MS / 1000)} giây.</p>`
      : "";

    if (!submitStep) return;
    clearBookingSuccessRedirectTimer();

    if (finalActions) {
      finalActions.hidden = true;
    }

    if (notice) {
      notice.hidden = true;
      notice.classList.remove("is-pending", "is-success", "is-error");
      notice.textContent = "";
    }

    submitStep.innerHTML = `
      <div class="trang-thai-thanh-cong-dat-lich" tabindex="-1" data-booking-success-state>
        <div class="trang-thai-thanh-cong-dat-lich__bieu-tuong">
          <i class="fa-solid fa-check"></i>
        </div>
        <div>
          <h3>Đặt lịch chuyển dọn thành công</h3>
          <p>${escapeHtml(
            statusMessage ||
              "Yêu cầu của bạn đã được ghi nhận trên hệ thống và sẵn sàng cho bước điều phối tiếp theo.",
          )}</p>
        </div>
        <div class="trang-thai-thanh-cong-dat-lich__ma">
          Mã yêu cầu: ${escapeHtml(requestCode)}
        </div>
        ${redirectNotice}
        <div class="trang-thai-thanh-cong-dat-lich__hanh-dong">
          <a class="nut-chinh" href="${escapeHtml(getProjectUrl("dat-lich-chuyendon.html"))}">Tạo yêu cầu mới</a>
          <a class="nut-phu" href="${escapeHtml(getProjectUrl(secondaryActionHref))}">${secondaryActionLabel}</a>
          ${tertiaryAction}
        </div>
      </div>
    `;

    window.requestAnimationFrame(() => {
      const successNode = scope.querySelector("[data-booking-success-state]");
      successNode?.focus({ preventScroll: true });
      successNode?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (isLoggedIn) {
      bookingSuccessRedirectTimer = window.setTimeout(function () {
        window.location.href = historyUrl;
      }, BOOKING_SUCCESS_REDIRECT_DELAY_MS);
    }
  }

  function initFormNotice(scope, formType) {
    const form = scope.querySelector("form[data-loai-bieu-mau]");
    const notice = scope.querySelector("[data-thong-bao-bieu-mau]");
    if (!form || !notice) return;
    const submitButton =
      form.querySelector("[data-nut-gui-bieu-mau]") ||
      form.querySelector("button[type='submit']");
    const defaultSubmitLabel =
      String(submitButton?.textContent || "").trim() || "Gửi";

    function syncSubmitState(isSubmitting, label) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = label || defaultSubmitLabel;
      submitButton.setAttribute(
        "aria-disabled",
        isSubmitting ? "true" : "false",
      );
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      syncPhoneFieldValidity(scope);
      if (formType === "dat-lich" && !validateBookingBeforeSubmit(scope))
        return;
      if (!form.reportValidity()) return;

      syncSubmitState(true, "Đang tạo yêu cầu...");
      notice.hidden = true;
      notice.classList.remove("is-pending", "is-success", "is-error");
      notice.textContent = "";

      window.setTimeout(async function () {
        const portalStore = customerPortalStore || null;

        try {
          const bookingResult = await createBookingRequest(scope, portalStore);
          let sheetSyncNote = "";

          try {
            await syncBookingSheet(
              scope,
              bookingResult.payload,
              bookingResult.remoteId,
            );
            sheetSyncNote = " Đã đồng bộ Google Sheets.";
          } catch (sheetError) {
            console.warn(
              "Không thể đồng bộ Google Sheet cho form đặt lịch chuyển dọn:",
              sheetError,
            );
            sheetSyncNote =
              " Yêu cầu đã lưu KRUD nhưng chưa đồng bộ Google Sheets.";
          }

          renderBookingSuccessState(scope, bookingResult, {
            statusMessage: buildBookingSuccessMessage(
              bookingResult.accountSetup,
              sheetSyncNote,
              bookingResult.mediaUploadWarnings,
            ),
          });
        } catch (error) {
          notice.hidden = false;
          notice.classList.remove("is-pending", "is-success");
          notice.classList.add("is-error");
          notice.textContent =
            error?.message ||
            "Không thể tạo yêu cầu đặt lịch ở thời điểm hiện tại.";
          notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } finally {
          syncSubmitState(false, defaultSubmitLabel);
        }
      }, 900);
    });
  }

  async function initFormHost(host) {
    const formType = host.getAttribute("data-bieu-mau-trang");
    const partialPath = partialPaths[formType];
    if (!formType || !partialPath) return;
    if (host.dataset.fastgoFormHostInitState === "pending") return;
    if (host.dataset.fastgoFormHostInitState === "done") return;

    host.dataset.fastgoFormHostInitState = "pending";

    const html = await loadPartial(partialPath);
    if (!html) {
      host.dataset.fastgoFormHostInitState = "error";
      return;
    }

    host.innerHTML = html;
    initInfoToggles(host);
    initServiceSelect(host);
    initFileInputs(host);
    initBookingFormUi(host);
    await prefillBookingContactFields(host, customerPortalStore || null);
    initFormNotice(host, formType);
    host.dataset.fastgoFormHostInitState = "done";
  }

onReady(function () {
  document.querySelectorAll("[data-bieu-mau-trang]").forEach((host) => {
    void initFormHost(host);
  });
});

const formsModule = {};

export default formsModule;
