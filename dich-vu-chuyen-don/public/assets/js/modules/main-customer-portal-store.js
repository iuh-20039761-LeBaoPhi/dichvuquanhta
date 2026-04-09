import {
  extractRows,
  getKrudListFn,
  getKrudUpdateFn,
} from "./api/krud-client.js";
import {
  notifyAuthSessionChanged,
  clearStoredAuthSession,
  readStoredIdentity,
  readStoredRole,
  safeParse,
  saveStoredIdentity,
  storageKeys,
  writeStoredRole,
} from "./store/auth-session-store.js";

const customerPortalStoreModule = (function (window) {
  const bookingCrudTableName = "dich_vu_chuyen_don_dat_lich";
  const dvqtUserTable = "nguoidung";
  const krudScriptUrl = "https://api.dvqt.vn/js/krud.js";
  const AUTO_CANCEL_PENDING_MINUTES = 120;
  const AUTO_CANCEL_PENDING_MS = AUTO_CANCEL_PENDING_MINUTES * 60 * 1000;
  const AUTO_CANCEL_SWEEP_COOLDOWN_MS = 60 * 1000;
  let krudScriptPromise = null;
  let autoCancelSweepPromise = null;
  let lastAutoCancelSweepAt = 0;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeLowerText(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function readCookie(name) {
    const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(document.cookie || "").match(
      new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1] || "") : "";
  }

  function ensureKrudRuntime() {
    if (getKrudListFn()) {
      return Promise.resolve(true);
    }

    if (krudScriptPromise) {
      return krudScriptPromise;
    }

    krudScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${krudScriptUrl}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không thể nạp KRUD runtime.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = krudScriptUrl;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () =>
        reject(new Error("Không thể nạp KRUD runtime."));
      document.head.appendChild(script);
    }).finally(() => {
      krudScriptPromise = null;
    });

    return krudScriptPromise;
  }

  function resolveRoleFromProfile(profile) {
    const normalizedRole = normalizeLowerText(profile?.role || "");
    if (["nha-cung-cap", "doi-tac", "provider"].includes(normalizedRole)) {
      return "nha-cung-cap";
    }

    const serviceIds = normalizeText(profile?.id_dichvu || "0");
    return serviceIds && serviceIds !== "0" ? "nha-cung-cap" : "khach-hang";
  }

  function parseNumber(value) {
    if (value == null || value === "") return 0;
    const normalized = String(value)
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseDateMs(value) {
    const normalized = normalizeText(value);
    if (!normalized) return 0;

    const timestamp = new Date(normalized).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function formatRequestDateCode(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function formatSystemRequestCode(recordId, createdAt) {
    const numericId = Number(recordId);
    if (!Number.isFinite(numericId) || numericId <= 0) return "";
    const dateCode = formatRequestDateCode(createdAt || new Date());
    if (!dateCode) return "";
    return `CDL-${dateCode}-${String(Math.trunc(Math.abs(numericId))).padStart(7, "0")}`;
  }

  function resolveBookingRowCode(row) {
    const explicitCode = normalizeText(
      row?.ma_yeu_cau_noi_bo ||
        row?.ma_don_hang_noi_bo ||
        row?.order_code ||
        "",
    );
    if (explicitCode) return explicitCode;

    const fallbackSystemCode = formatSystemRequestCode(
      row?.id || row?.remote_id || "",
      row?.created_at || row?.created_date || "",
    );
    if (fallbackSystemCode) return fallbackSystemCode;

    return normalizeText(row?.id || row?.remote_id || "");
  }

  function splitPipeValues(value) {
    return String(value || "")
      .split("|")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function parseJsonObject(value) {
    const parsed = safeParse(value, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }

  function parseJsonArray(value) {
    const parsed = safeParse(value, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function toLabelFromKey(key) {
    return String(key || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function isTruthyFlag(value) {
    if (value === true || value === 1) return true;
    const text = normalizeLowerText(value);
    return ["1", "true", "co", "có", "yes"].includes(text);
  }

  function containsSurveyFirstMarker(value) {
    const list = Array.isArray(value) ? value : splitPipeValues(value);
    return list.some((item) =>
      normalizeLowerText(item).includes("cần khảo sát trước"),
    );
  }

  function resolveSurveyFirstFlag(source) {
    if (!source || typeof source !== "object") return false;

    const formPayload =
      source.form_payload && typeof source.form_payload === "object"
        ? source.form_payload
        : parseJsonObject(source.du_lieu_form_json);

    return (
      isTruthyFlag(source.survey_first) ||
      isTruthyFlag(source.can_khao_sat_truoc) ||
      isTruthyFlag(formPayload.can_khao_sat_truoc) ||
      containsSurveyFirstMarker(
        source.service_details || source.chi_tiet_dich_vu,
      ) ||
      normalizeLowerText(source.type) === "khao-sat"
    );
  }

  const bookingFormFieldLabels = {
    loai_dich_vu: "Loại dịch vụ",
    can_khao_sat_truoc: "Khảo sát trước",
    ho_ten: "Người liên hệ",
    so_dien_thoai: "Số điện thoại",
    ten_cong_ty: "Tên công ty / đơn vị",
    dia_chi_di: "Địa chỉ điểm đi",
    dia_chi_den: "Địa chỉ điểm đến",
    ngay_thuc_hien: "Ngày thực hiện",
    khung_gio_thuc_hien: "Khung giờ thực hiện",
    khung_gio_tinh_gia: "Khung giờ tính giá",
    thoi_tiet_du_kien: "Thời tiết dự kiến",
    loai_xe: "Loại xe",
    ghi_chu: "Ghi chú",
    co_thang_may_diem_di: "Điểm đi có thang máy",
    co_thang_may_diem_den: "Điểm đến có thang máy",
    xe_tai_do_xa_diem_di: "Xe tải đỗ xa ở điểm đi",
    duong_cam_tai: "Đường cấm tải / giới hạn xe",
    co_thang_bo_hep: "Cầu thang bộ hẹp",
    can_trung_chuyen: "Cần trung chuyển",
    can_thao_lap_noi_that: "Cần tháo lắp",
    can_dong_goi_do_dac: "Cần đóng gói",
    co_do_gia_tri_cao: "Có đồ giá trị cao",
    co_do_de_vo: "Có đồ dễ vỡ",
    co_do_cong_kenh: "Có đồ cồng kềnh",
    can_dong_goi_ho_so: "Cần đóng gói hồ sơ",
    can_bao_mat_tai_lieu: "Bảo mật tài liệu",
    can_di_doi_server: "Di dời server / thiết bị IT",
    can_thao_lap_noi_that_van_phong: "Cần tháo lắp nội thất",
    co_thiet_bi_nang_van_phong: "Có thiết bị nặng",
    can_thuc_hien_cuoi_tuan: "Cần làm cuối tuần",
    can_luan_chuyen_pallet: "Cần luân chuyển pallet",
    can_xe_nang_dat_lich: "Cần xe nâng",
    can_xe_cau_dat_lich: "Cần xe cẩu",
    can_gia_co_hang_hoa: "Cần gia cố hàng hóa",
    can_kiem_ke_hang_hoa: "Kiểm kê trước và sau chuyển",
  };

  function normalizeBookingFormRows(value) {
    const ignoredKeys = new Set([
      "vi_tri_diem_di_lat",
      "vi_tri_diem_di_lng",
      "vi_tri_diem_den_lat",
      "vi_tri_diem_den_lng",
    ]);

    return Object.entries(parseJsonObject(value))
      .filter(([key, rawValue]) => {
        if (ignoredKeys.has(key)) return false;
        return String(rawValue || "").trim() !== "";
      })
      .map(([key, rawValue]) => ({
        key,
        label: bookingFormFieldLabels[key] || toLabelFromKey(key),
        value:
          String(rawValue || "").trim() === "1"
            ? "Có"
            : normalizeText(rawValue),
      }))
      .filter((item) => item.value);
  }

  function normalizeBookingPricingBreakdown(value) {
    return parseJsonArray(value)
      .map((item, index, list) => {
        if (!item || typeof item !== "object") return null;

        const label = normalizeText(item.label || item.title || "");
        const amount = normalizeText(item.amount || item.value || "");
        const detail = normalizeText(item.detail || item.note || "");
        const amountValue = parseNumber(
          item.amount_value || item.amount || item.value || 0,
        );
        const isTotal =
          item.is_total === true ||
          /tong/i.test(label) ||
          (index === list.length - 1 && amountValue > 0);

        if (!label && !amount && !detail) return null;

        return {
          label: label || `Hạng mục ${index + 1}`,
          amount,
          detail,
          amount_value: amountValue,
          is_total: isTotal,
        };
      })
      .filter(Boolean);
  }

  function normalizeHistoryItem(item) {
    const statusMap = {
      moi: "moi",
      xac_nhan: "xac-nhan",
      "xac-nhan": "xac-nhan",
      dang_xu_ly: "dang-xu-ly",
      "dang-xu-ly": "dang-xu-ly",
    };
    const normalizedStatusClass =
      statusMap[String(item?.status_class || "").trim()] || "moi";
    const surveyFirst = resolveSurveyFirstFlag(item);

    return {
      code: normalizeText(item?.code || ""),
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: normalizeText(item?.title || ""),
      service_label: normalizeText(item?.service_label || ""),
      status_class: normalizedStatusClass,
      status_text: normalizeText(item?.status_text || "Mới tiếp nhận"),
      summary: normalizeText(item?.summary || ""),
      meta: normalizeText(item?.meta || ""),
      from_address: normalizeText(item?.from_address || ""),
      to_address: normalizeText(item?.to_address || ""),
      created_at: normalizeText(item?.created_at || new Date().toISOString()),
      schedule_label: normalizeText(item?.schedule_label || ""),
      estimated_amount: Number(item?.estimated_amount || 0),
      contact_name: normalizeText(item?.contact_name || ""),
      contact_phone: normalizeText(item?.contact_phone || ""),
      note: normalizeText(item?.note || ""),
      survey_first: surveyFirst,
      source: normalizeText(item?.source || "krud"),
      remote_id: normalizeText(item?.remote_id || item?.id || ""),
    };
  }

  function sortByCreatedAt(items) {
    return items.sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }

  function readIdentity() {
    const identity = readStoredIdentity();
    return identity && typeof identity === "object" ? identity : {};
  }

  function saveIdentity(payload) {
    return saveStoredIdentity(payload);
  }

  function syncIdentityFromProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return readIdentity();
    }

    const nextRole = resolveRoleFromProfile(profile);
    writeStoredRole(nextRole);

    return saveIdentity({
      id: normalizeText(profile.id || ""),
      hovaten: normalizeText(profile.hovaten || ""),
      email: normalizeText(profile.email || ""),
      sodienthoai: normalizeText(profile.sodienthoai || ""),
      id_dichvu: normalizeText(profile.id_dichvu || "0"),
      role: nextRole,
      trangthai: normalizeText(profile.trangthai || ""),
    });
  }

  function getSavedRole() {
    try {
      const role = String(readStoredRole() || "")
        .trim()
        .toLowerCase();
      if (role === "doi-tac") return "nha-cung-cap";
      return role;
    } catch (error) {
      console.error("Cannot access saved role:", error);
      return "";
    }
  }

  function getDisplayName(identity) {
    const role = getSavedRole();
    return (
      normalizeText(identity?.hovaten || "") ||
      normalizeText(identity?.email || "") ||
      (role === "nha-cung-cap" ? "nhà cung cấp" : "khách hàng")
    );
  }

  function getDashboardStats(items) {
    const list = Array.isArray(items) ? items : [];
    const openCount = list.filter((item) =>
      ["moi", "dang-xu-ly"].includes(item.status_class),
    ).length;
    const confirmedCount = list.filter(
      (item) => item.status_class === "xac-nhan",
    ).length;
    const surveyCount = list.filter((item) => item.survey_first).length;
    return {
      total: list.length,
      open_count: openCount,
      confirmed_count: confirmedCount,
      survey_count: surveyCount,
    };
  }

  function clearAuthSession() {
    clearStoredAuthSession();
  }

  function normalizeAuthProfileRow(row) {
    if (!row || typeof row !== "object") return null;

    return {
      id: normalizeText(row.id || ""),
      role: resolveRoleFromProfile(row),
      hovaten: normalizeText(row.hovaten || ""),
      email: normalizeText(row.email || "").toLowerCase(),
      sodienthoai: normalizeText(row.sodienthoai || ""),
      id_dichvu: normalizeText(row.id_dichvu || "0"),
      trangthai: normalizeText(row.trangthai || "active"),
    };
  }

  async function hydrateAuthSessionFromDvqtCookie() {
    const identity = readIdentity();
    const hasLocalIdentity =
      normalizeText(identity?.id || "") ||
      normalizeText(identity?.email || "") ||
      normalizeText(identity?.sodienthoai || "");

    if (hasLocalIdentity) {
      return identity;
    }

    const cookiePhone = normalizePhone(readCookie("dvqt_u"));
    if (!cookiePhone) return null;

    let listFn = getKrudListFn();
    if (!listFn) {
      try {
        await ensureKrudRuntime();
      } catch (error) {
        console.error("Cannot prepare KRUD runtime for auth bootstrap:", error);
        return null;
      }
      listFn = getKrudListFn();
    }
    if (!listFn) return null;

    const limit = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: dvqtUserTable,
            page,
            limit,
            sort: {
              id: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot hydrate auth session from DVQT cookie:", error);
        return null;
      }

      const rows = extractRows(response);
      if (!rows.length) break;

      const matchedRow =
        rows.find((row) => {
          const rowPhone = normalizePhone(row.sodienthoai || "");
          return rowPhone && rowPhone === cookiePhone;
        }) || null;

      if (matchedRow) {
        return syncIdentityFromProfile(normalizeAuthProfileRow(matchedRow));
      }

      if (rows.length < limit) break;
    }

    return null;
  }

  async function bootstrapAuthSession() {
    const cookiePhone = normalizePhone(readCookie("dvqt_u"));
    if (!cookiePhone) return null;

    const identity = readIdentity();
    const hasLocalIdentity =
      normalizeText(identity?.id || "") ||
      normalizeText(identity?.email || "") ||
      normalizeText(identity?.sodienthoai || "");

    if (hasLocalIdentity) {
      notifyAuthSessionChanged();
      return identity;
    }

    const hydratedIdentity = await hydrateAuthSessionFromDvqtCookie();
    if (hydratedIdentity) {
      notifyAuthSessionChanged();
    }
    return hydratedIdentity;
  }

  function normalizeLoginIdentifier(value) {
    const text = normalizeText(value);
    if (!text) return "";

    const phone = normalizePhone(text);
    return phone || normalizeLowerText(text);
  }

  function matchesUrlLoginIdentifier(row, loginIdentifier) {
    const normalizedIdentifier = normalizeLoginIdentifier(loginIdentifier);
    if (!normalizedIdentifier) return false;

    const rowPhone = normalizePhone(row?.sodienthoai || "");
    const rowEmail = normalizeLowerText(row?.email || "");

    return (
      (rowPhone && rowPhone === normalizedIdentifier) ||
      (rowEmail && rowEmail === normalizedIdentifier)
    );
  }

  async function autoAuthFromUrlCredentials(credentials = {}) {
    const loginIdentifier = normalizeText(
      credentials?.username ||
        credentials?.loginIdentifier ||
        credentials?.email ||
        credentials?.sodienthoai ||
        "",
    );
    const password = String(credentials?.password || "").trim();

    if (!loginIdentifier || !password) return null;

    let listFn = getKrudListFn();
    if (!listFn) {
      try {
        await ensureKrudRuntime();
      } catch (error) {
        console.error("Cannot prepare KRUD runtime for URL auth:", error);
        return null;
      }
      listFn = getKrudListFn();
    }
    if (!listFn) return null;

    const limit = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: dvqtUserTable,
            page,
            limit,
            sort: {
              id: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load URL auth profiles from KRUD:", error);
        return null;
      }

      const rows = extractRows(response);
      if (!rows.length) break;

      const matchedRow =
        rows.find((row) => {
          const storedPassword = String(row?.matkhau || "").trim();
          return (
            storedPassword &&
            storedPassword === password &&
            matchesUrlLoginIdentifier(row, loginIdentifier)
          );
        }) || null;

      if (matchedRow) {
        return syncIdentityFromProfile(normalizeAuthProfileRow(matchedRow));
      }

      if (rows.length < limit) break;
    }

    return null;
  }

  async function fetchCurrentAuthProfileFromKrud() {
    const currentIdentity = readIdentity();
    let listFn = getKrudListFn();
    if (!listFn) {
      try {
        await ensureKrudRuntime();
      } catch (error) {
        console.error("Cannot prepare KRUD runtime for current auth profile:", error);
        return null;
      }
      listFn = getKrudListFn();
    }
    const tableName = getAuthTableName(getSavedRole() || "khach-hang");
    const localId = normalizeText(currentIdentity.id || "");
    const localEmail = normalizeLowerText(currentIdentity.email || "");
    const localPhone = normalizePhone(currentIdentity.sodienthoai || "");

    if (!localId && !localEmail && !localPhone) return null;
    if (!listFn || !tableName) return null;

    const limit = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: tableName,
            page,
            limit,
            sort: {
              id: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load current auth profile from KRUD:", error);
        break;
      }

      const rows = extractRows(response);
      if (!rows.length) break;

      const matchedRow =
        rows.find((row) => {
          const rowId = normalizeText(row.id || "");
          const rowEmail = normalizeLowerText(row.email || "");
          const rowPhone = normalizePhone(row.sodienthoai || "");

          return (
            (localId && rowId === localId) ||
            (localEmail && rowEmail === localEmail) ||
            (localPhone && rowPhone === localPhone)
          );
        }) || null;

      if (matchedRow) {
        return syncIdentityFromProfile(normalizeAuthProfileRow(matchedRow));
      }

      if (rows.length < limit) break;
    }

    return null;
  }

  async function requireVerifiedProfile() {
    await hydrateAuthSessionFromDvqtCookie();
    const profile = await fetchCurrentAuthProfileFromKrud();
    if (profile) return profile;

    clearAuthSession();
    throw new Error("Không tìm thấy tài khoản hiện tại trong bảng nguoidung.");
  }

  function getAuthTableName(role) {
    return dvqtUserTable;
  }

  function formatDateLabel(dateValue, timeValue) {
    const rawDate = normalizeText(dateValue);
    if (!rawDate) return "";

    const date = new Date(rawDate);
    const dateText = Number.isNaN(date.getTime())
      ? rawDate
      : date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
    const timeText = normalizeText(timeValue);
    return timeText ? `${dateText} • ${timeText}` : dateText;
  }

  function isCancelledBookingStatus(rawStatus) {
    return ["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(
      normalizeLowerText(rawStatus),
    );
  }

  function isConfirmedBookingStatus(rawStatus) {
    return [
      "da_xac_nhan",
      "xac_nhan",
      "confirmed",
      "accepted",
      "da_chot_lich",
    ].includes(normalizeLowerText(rawStatus));
  }

  function isProcessingBookingStatus(rawStatus) {
    return [
      "dang_xu_ly",
      "processing",
      "in_progress",
      "dang_dieu_phoi",
      "dang_trien_khai",
    ].includes(normalizeLowerText(rawStatus));
  }

  function isPendingBookingRow(row) {
    const rawStatus = normalizeLowerText(row?.status || row?.trang_thai || "");
    if (!rawStatus) return true;

    return (
      !isCancelledBookingStatus(rawStatus) &&
      !isConfirmedBookingStatus(rawStatus) &&
      !isProcessingBookingStatus(rawStatus)
    );
  }

  function isExpiredPendingBookingRow(row, nowMs = Date.now()) {
    if (!row || typeof row !== "object") return false;
    if (!normalizeText(row?.id || "")) return false;
    if (!isPendingBookingRow(row)) return false;

    if (
      normalizeText(row?.accepted_at || "") ||
      normalizeText(row?.started_at || "") ||
      normalizeText(row?.completed_at || "") ||
      normalizeText(row?.cancelled_at || "")
    ) {
      return false;
    }

    const createdMs = parseDateMs(row?.created_at || row?.created_date || "");
    if (!createdMs) return false;

    return nowMs - createdMs >= AUTO_CANCEL_PENDING_MS;
  }

  async function updateBookingAsCancelled(updateFn, rawRow, cancelledAt) {
    const rowId = normalizeText(rawRow?.id || "");
    if (!updateFn || !rowId) return false;

    const basePayload = {
      id: rowId,
      status: "da_huy",
      trang_thai: "da_huy",
      updated_at: cancelledAt,
    };

    try {
      await Promise.resolve(
        updateFn(bookingCrudTableName, {
          ...basePayload,
          cancelled_at: cancelledAt,
        }),
      );
      return true;
    } catch (error) {
      console.warn(
        "Cannot persist cancelled_at for booking, fallback to status-only cancel:",
        error,
      );
      await Promise.resolve(updateFn(bookingCrudTableName, basePayload));
      return true;
    }
  }

  async function autoCancelExpiredBookings(options = {}) {
    const force = options?.force === true;
    const nowMs = Date.now();

    if (!force && nowMs - lastAutoCancelSweepAt < AUTO_CANCEL_SWEEP_COOLDOWN_MS) {
      return { updatedCount: 0, skipped: true };
    }

    if (autoCancelSweepPromise) {
      return autoCancelSweepPromise;
    }

    autoCancelSweepPromise = (async () => {
      const listFn = getKrudListFn();
      const updateFn = getKrudUpdateFn();
      if (!listFn || !updateFn) {
        lastAutoCancelSweepAt = Date.now();
        return { updatedCount: 0, skipped: true };
      }

      const limit = 200;
      const maxPages = 10;
      const expiredRows = [];

      for (let page = 1; page <= maxPages; page += 1) {
        let response;

        try {
          response = await Promise.resolve(
            listFn({
              table: bookingCrudTableName,
              page,
              limit,
              sort: {
                created_at: "desc",
              },
            }),
          );
        } catch (error) {
          console.error("Cannot scan booking rows for auto cancel:", error);
          break;
        }

        const pageRows = extractRows(response);
        if (!pageRows.length) break;

        expiredRows.push(
          ...pageRows.filter((row) => isExpiredPendingBookingRow(row, nowMs)),
        );
        if (pageRows.length < limit) break;
      }

      let updatedCount = 0;
      const cancelledAt = new Date(nowMs).toISOString();

      for (const row of expiredRows) {
        try {
          await updateBookingAsCancelled(updateFn, row, cancelledAt);
          updatedCount += 1;
        } catch (error) {
          console.error("Cannot auto cancel expired booking:", error);
        }
      }

      lastAutoCancelSweepAt = Date.now();
      return { updatedCount, skipped: false };
    })().finally(() => {
      autoCancelSweepPromise = null;
    });

    return autoCancelSweepPromise;
  }

  function getBookingStatusMeta(row) {
    const rawStatus = normalizeLowerText(row?.status || row?.trang_thai || "");

    if (isConfirmedBookingStatus(rawStatus)) {
      return {
        status_class: "xac-nhan",
        status_text: "Đã xác nhận",
      };
    }

    if (isProcessingBookingStatus(rawStatus)) {
      return {
        status_class: "dang-xu-ly",
        status_text: "Đang xử lý",
      };
    }

    if (isCancelledBookingStatus(rawStatus)) {
      return {
        status_class: "da-huy",
        status_text: "Đã hủy",
      };
    }

    return {
      status_class: "moi",
      status_text: "Mới tiếp nhận",
    };
  }

  function buildBookingSummary(row, statusText, surveyFirst) {
    if (statusText === "Đã xác nhận") {
      return surveyFirst
        ? "Yêu cầu đặt lịch có khảo sát trước đã được ghi nhận trên hệ thống và đang chờ đội vận hành khóa phương án cuối."
        : "Yêu cầu đặt lịch đã được ghi nhận trên hệ thống và đang chờ đội vận hành khóa phương án cuối.";
    }

    if (statusText === "Đang xử lý") {
      return surveyFirst
        ? "Điều phối đang sắp lịch khảo sát trước khi khóa phương án xe, tuyến đường và khối lượng."
        : "Điều phối đang rà phương án xe, tuyến đường và khối lượng phù hợp cho yêu cầu đặt lịch này.";
    }

    if (statusText === "Đã hủy") {
      return "Yêu cầu đặt lịch đã được đánh dấu hủy trên hệ thống và được giữ lại trong lịch sử theo dõi.";
    }

    return surveyFirst
      ? "Yêu cầu đặt lịch có khảo sát trước đã được lưu lên hệ thống và sẵn sàng cho bước điều phối tiếp theo."
      : "Yêu cầu đặt lịch đã được lưu lên hệ thống và sẵn sàng cho bước điều phối tiếp theo.";
  }

  function mapKrudBookingToHistoryItem(row) {
    const statusMeta = getBookingStatusMeta(row);
    const surveyFirst = resolveSurveyFirstFlag(row);
    const code = resolveBookingRowCode(row);
    const serviceLabel = normalizeText(
      row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn",
    );
    const vehicleLabel = normalizeText(row?.ten_loai_xe || row?.loai_xe || "");
    const contactName = normalizeText(row?.ho_ten || row?.contact_name || "");
    const contactPhone = normalizeText(row?.so_dien_thoai || row?.phone || "");

    return normalizeHistoryItem({
      code,
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: `Đặt lịch ${serviceLabel || "chuyển dọn"}`,
      service_label: serviceLabel,
      status_class: statusMeta.status_class,
      status_text: statusMeta.status_text,
      summary: buildBookingSummary(row, statusMeta.status_text, surveyFirst),
      meta: surveyFirst
        ? "Đã đánh dấu cần khảo sát trước khi triển khai."
        : vehicleLabel
          ? `Phương án xe đã chọn: ${vehicleLabel}`
          : normalizeText(row?.ten_cong_ty || row?.ghi_chu || ""),
      from_address: normalizeText(row?.dia_chi_di || ""),
      to_address: normalizeText(row?.dia_chi_den || ""),
      created_at: normalizeText(
        row?.created_at || row?.created_date || new Date().toISOString(),
      ),
      schedule_label: formatDateLabel(
        row?.ngay_thuc_hien,
        row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien,
      ),
      estimated_amount: Number(row?.tong_tam_tinh || 0),
      contact_name: contactName,
      contact_phone: contactPhone,
      note: normalizeText(row?.ghi_chu || ""),
      survey_first: surveyFirst,
      source: "krud",
      remote_id: normalizeText(row?.id || ""),
    });
  }

  function normalizeBookingInvoiceDetail(rawRow, requestItem) {
    const row = rawRow && typeof rawRow === "object" ? rawRow : {};
    const fallbackRequest = requestItem
      ? normalizeHistoryItem(requestItem)
      : null;
    const mappedRequest =
      row && Object.keys(row).length
        ? mapKrudBookingToHistoryItem(row)
        : fallbackRequest;
    const request =
      mappedRequest && fallbackRequest
        ? {
            ...fallbackRequest,
            ...mappedRequest,
            summary: normalizeText(
              mappedRequest.summary || fallbackRequest.summary || "",
            ),
            meta: normalizeText(
              mappedRequest.meta || fallbackRequest.meta || "",
            ),
            note: normalizeText(
              mappedRequest.note || fallbackRequest.note || "",
            ),
          }
        : mappedRequest || fallbackRequest;
    const formRows = normalizeBookingFormRows(row?.du_lieu_form_json);
    const pricingBreakdown = normalizeBookingPricingBreakdown(
      row?.pricing_breakdown_json,
    );

    return {
      code: normalizeText(
        resolveBookingRowCode(row) || request?.code || row?.id || "",
      ),
      remote_id: normalizeText(row?.id || request?.remote_id || ""),
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: normalizeText(
        request?.title || "Hóa đơn chi tiết đặt lịch chuyển dọn",
      ),
      service_label: normalizeText(
        row?.ten_dich_vu ||
          request?.service_label ||
          row?.loai_dich_vu ||
          "Chuyển dọn",
      ),
      status_class: normalizeText(request?.status_class || "moi") || "moi",
      status_text:
        normalizeText(request?.status_text || "Mới tiếp nhận") ||
        "Mới tiếp nhận",
      summary: normalizeText(request?.summary || ""),
      created_at: normalizeText(
        row?.created_at || row?.created_date || request?.created_at || "",
      ),
      schedule_label: normalizeText(
        request?.schedule_label ||
          formatDateLabel(
            row?.ngay_thuc_hien,
            row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien,
          ) ||
          "",
      ),
      estimated_amount: Number(
        row?.tong_tam_tinh || request?.estimated_amount || 0,
      ),
      contact_name: normalizeText(row?.ho_ten || request?.contact_name || ""),
      contact_phone: normalizeText(
        row?.so_dien_thoai || request?.contact_phone || "",
      ),
      customer_email: normalizeText(row?.customer_email || ""),
      company_name: normalizeText(row?.ten_cong_ty || ""),
      from_address: normalizeText(
        row?.dia_chi_di || request?.from_address || "",
      ),
      to_address: normalizeText(row?.dia_chi_den || request?.to_address || ""),
      schedule_date: normalizeText(row?.ngay_thuc_hien || ""),
      schedule_time: normalizeText(
        row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien || "",
      ),
      weather_label: normalizeText(row?.thoi_tiet_du_kien || ""),
      vehicle_label: normalizeText(row?.ten_loai_xe || row?.loai_xe || ""),
      distance_km: parseNumber(row?.khoang_cach_km || 0),
      access_conditions: splitPipeValues(row?.dieu_kien_tiep_can),
      service_details: splitPipeValues(row?.chi_tiet_dich_vu),
      note: normalizeText(row?.ghi_chu || request?.note || ""),
      meta: normalizeText(request?.meta || ""),
      pricing_breakdown: pricingBreakdown,
      image_attachments: splitPipeValues(row?.anh_dinh_kem),
      video_attachments: splitPipeValues(row?.video_dinh_kem),
      provider_note: normalizeText(row?.provider_note || ""),
      customer_feedback: normalizeText(row?.customer_feedback || ""),
      customer_rating: parseNumber(row?.customer_rating || 0),
      form_rows: formRows,
      form_payload: parseJsonObject(row?.du_lieu_form_json),
      source: normalizeText(request?.source || "krud"),
      request,
      raw_row: row,
    };
  }

  function isRowOwnedByIdentity(row, identity) {
    const identityEmail = normalizeLowerText(identity?.email || "");
    const identityPhone = normalizePhone(identity?.sodienthoai || "");
    const identityNames = [
      identity?.hovaten,
    ]
      .map(normalizeLowerText)
      .filter(Boolean);

    const rowEmail = normalizeLowerText(
      row?.customer_email || row?.email || "",
    );
    const rowPhone = normalizePhone(row?.so_dien_thoai || row?.phone || "");
    const rowName = normalizeLowerText(row?.ho_ten || row?.contact_name || "");

    if (identityEmail && rowEmail && identityEmail === rowEmail) return true;
    if (identityPhone && rowPhone && identityPhone === rowPhone) return true;
    if (!identityEmail && !identityPhone && identityNames.length && rowName) {
      return identityNames.includes(rowName);
    }

    return false;
  }

  function mergeHistoryItems(items) {
    const unique = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
      const normalized = normalizeHistoryItem(item);
      if (!normalized.code) return;

      const key = normalizeLowerText(normalized.code);
      const current = unique.get(key);
      if (!current || normalized.source === "krud") {
        unique.set(key, normalized);
      }
    });

    return sortByCreatedAt(Array.from(unique.values()));
  }

  async function fetchKrudBookingItems(identity) {
    const listFn = getKrudListFn();
    if (!listFn) return [];

    const profile =
      identity && typeof identity === "object" ? identity : readIdentity();
    const hasLookupIdentity =
      normalizeText(profile?.email || "") ||
      normalizeText(profile?.sodienthoai || "") ||
      normalizeText(profile?.hovaten || "");
    if (!hasLookupIdentity) return [];

    const limit = 200;
    const maxPages = 10;
    const rows = [];

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: bookingCrudTableName,
            page,
            limit,
            sort: {
              created_at: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load booking records from KRUD:", error);
        break;
      }

      const pageRows = extractRows(response);
      if (!pageRows.length) break;

      rows.push(...pageRows);
      if (pageRows.length < limit) break;
    }

    return mergeHistoryItems(
      rows
        .filter((row) => isRowOwnedByIdentity(row, profile))
        .map(mapKrudBookingToHistoryItem),
    );
  }

  async function findKrudBookingRowByCode(code, identity) {
    await autoCancelExpiredBookings();
    const listFn = getKrudListFn();
    if (!listFn) return null;

    const normalizedCode = normalizeLowerText(code);
    if (!normalizedCode) return null;

    const profile =
      identity && typeof identity === "object" ? identity : readIdentity();
    const hasLookupIdentity =
      normalizeText(profile?.email || "") ||
      normalizeText(profile?.sodienthoai || "") ||
      normalizeText(profile?.hovaten || "");
    if (!hasLookupIdentity) return null;

    const limit = 200;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page += 1) {
      let response;

      try {
        response = await Promise.resolve(
          listFn({
            table: bookingCrudTableName,
            page,
            limit,
            sort: {
              created_at: "desc",
            },
          }),
        );
      } catch (error) {
        console.error("Cannot load booking detail from KRUD:", error);
        return null;
      }

      const pageRows = extractRows(response);
      if (!pageRows.length) break;

      const matchedRow = pageRows.find((row) => {
        const rowCode = normalizeLowerText(resolveBookingRowCode(row));
        return rowCode === normalizedCode && isRowOwnedByIdentity(row, profile);
      });

      if (matchedRow) {
        return matchedRow;
      }

      if (pageRows.length < limit) break;
    }

    return null;
  }

  async function getAllHistoryItems(profile) {
    await autoCancelExpiredBookings();
    const identity =
      profile && typeof profile === "object"
        ? syncIdentityFromProfile(profile)
        : await requireVerifiedProfile();
    const krudBookingItems = await fetchKrudBookingItems(identity);
    return mergeHistoryItems(krudBookingItems);
  }

  async function fetchProfile() {
    const profile = await requireVerifiedProfile();
    return profile || null;
  }

  async function fetchDashboard() {
    const profile = await requireVerifiedProfile();
    const items = await getAllHistoryItems(profile);
    return {
      profile,
      stats: getDashboardStats(items),
      recent_requests: items.slice(0, 3),
    };
  }

  async function fetchHistory() {
    const profile = await requireVerifiedProfile();
    return {
      profile,
      history: await getAllHistoryItems(profile),
    };
  }

  async function fetchDetail(code) {
    const profile = await requireVerifiedProfile();
    const normalizedCode = normalizeLowerText(code);
    const history = await getAllHistoryItems(profile);
    return {
      profile,
      request:
        history.find(
          (item) => normalizeLowerText(item.code) === normalizedCode,
        ) || null,
    };
  }

  async function fetchBookingInvoiceDetail(code) {
    const profile = await requireVerifiedProfile();
    const normalizedCode = normalizeLowerText(code);
    const history = await getAllHistoryItems(profile);
    const request =
      history.find(
        (item) => normalizeLowerText(item.code) === normalizedCode,
      ) || null;
    const rawRow = await findKrudBookingRowByCode(code, profile);

    if (!rawRow && (!request || request.type !== "dat-lich")) {
      return {
        profile,
        request,
        invoice: null,
      };
    }

    return {
      profile,
      request,
      invoice: normalizeBookingInvoiceDetail(rawRow, request),
    };
  }

  async function cancelBooking(code) {
    const normalizedCode = normalizeLowerText(code);
    if (!normalizedCode) {
      throw new Error("Thiếu mã yêu cầu để hủy đơn.");
    }

    const profile = syncIdentityFromProfile(readIdentity());
    const rawRow = await findKrudBookingRowByCode(code, profile);
    const updateFn = getKrudUpdateFn();

    if (!rawRow || !normalizeText(rawRow.id || "")) {
      throw new Error("Không tìm thấy yêu cầu phù hợp để hủy.");
    }

    if (!updateFn) {
      throw new Error(
        "Không tìm thấy API KRUD để cập nhật trạng thái yêu cầu.",
      );
    }

    const rawStatus = normalizeLowerText(
      rawRow?.status || rawRow?.trang_thai || "",
    );
    if (isCancelledBookingStatus(rawStatus)) {
      throw new Error("Yêu cầu này đã ở trạng thái hủy.");
    }

    if (isConfirmedBookingStatus(rawStatus)) {
      throw new Error(
        "Yêu cầu đã được xác nhận nên không thể hủy trực tiếp từ phía khách hàng.",
      );
    }

    const updatedAt = new Date().toISOString();

    await updateBookingAsCancelled(updateFn, rawRow, updatedAt);

    return fetchBookingInvoiceDetail(code);
  }

  async function saveBookingFeedback(code, payload) {
    const normalizedCode = normalizeLowerText(code);
    if (!normalizedCode) {
      throw new Error("Thiếu mã yêu cầu để lưu đánh giá.");
    }

    const profile = syncIdentityFromProfile(readIdentity());
    const rawRow = await findKrudBookingRowByCode(code, profile);
    const updateFn = getKrudUpdateFn();

    if (!rawRow || !normalizeText(rawRow.id || "")) {
      throw new Error("Không tìm thấy yêu cầu phù hợp để lưu đánh giá.");
    }

    if (!updateFn) {
      throw new Error("Không tìm thấy API KRUD để cập nhật phản hồi.");
    }

    const rawStatus = normalizeLowerText(
      rawRow?.status || rawRow?.trang_thai || "",
    );
    if (
      !["da_xac_nhan", "xac_nhan", "completed", "confirmed"].includes(rawStatus)
    ) {
      throw new Error(
        "Chỉ có thể gửi đánh giá sau khi đơn hàng đã hoàn thành.",
      );
    }

    const rawRating = Number(payload?.customer_rating || 0);
    const customerRating = Number.isFinite(rawRating)
      ? Math.min(5, Math.max(0, Math.round(rawRating)))
      : 0;

    await Promise.resolve(
      updateFn(bookingCrudTableName, {
        id: rawRow.id,
        customer_feedback: normalizeText(payload?.customer_feedback || ""),
        customer_rating: customerRating,
        updated_at: new Date().toISOString(),
      }),
    );

    return fetchBookingInvoiceDetail(code);
  }

  async function updateProfile(payload) {
    const currentIdentity = readIdentity();
    const nextProfile = syncIdentityFromProfile({
      ...currentIdentity,
      ...(payload && typeof payload === "object"
        ? {
            ...payload,
            sodienthoai: currentIdentity.sodienthoai || "",
          }
        : {}),
    });
    const updateFn = getKrudUpdateFn();
    const tableName = getAuthTableName(getSavedRole() || "khach-hang");
    const remoteId = normalizeText(currentIdentity.id || "");

    if (!updateFn || !tableName || !remoteId) {
      throw new Error(
        "Không tìm thấy thông tin tài khoản KRUD hiện tại để cập nhật hồ sơ.",
      );
    }

    await Promise.resolve(
      updateFn(tableName, {
        id: remoteId,
        hovaten: normalizeText(
          nextProfile.hovaten || currentIdentity.hovaten || "",
        ),
        email: normalizeText(
          nextProfile.email || currentIdentity.email || "",
        ).toLowerCase(),
        sodienthoai: normalizeText(currentIdentity.sodienthoai || ""),
        updated_at: new Date().toISOString(),
      }),
    );

    return nextProfile;
  }

  async function changePassword(payload) {
    const currentPassword = String(payload?.current_password || "");
    const newPassword = String(payload?.new_password || "");
    const confirmPassword = String(payload?.confirm_password || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error("Vui lòng nhập đủ ba trường mật khẩu.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận chưa khớp.");
    }

    const identity = readIdentity();
    const remoteId = normalizeText(identity.id || "");
    const tableName = getAuthTableName(getSavedRole() || "khach-hang");
    const listFn = getKrudListFn();
    const updateFn = getKrudUpdateFn();

    if (!remoteId || !tableName || !listFn || !updateFn) {
      throw new Error(
        "Không tìm thấy thông tin tài khoản KRUD hiện tại để đổi mật khẩu.",
      );
    }

    const response = await Promise.resolve(
      listFn({
        table: tableName,
        page: 1,
        limit: 1,
        where: {
          id: remoteId,
        },
      }),
    );
    const currentRow = extractRows(response)[0] || null;
    const storedPassword = String(currentRow?.matkhau || "");

    if (storedPassword && storedPassword !== currentPassword) {
      throw new Error("Mật khẩu hiện tại chưa đúng.");
    }

    await Promise.resolve(
      updateFn(tableName, {
        id: remoteId,
        matkhau: newPassword,
        updated_at: new Date().toISOString(),
      }),
    );

    return { status: "success" };
  }

  return {
    storageKeys,
    bookingCrudTableName,
    bootstrapAuthSession,
    autoAuthFromUrlCredentials,
    readIdentity,
    saveIdentity,
    syncIdentityFromProfile,
    getSavedRole,
    getDisplayName,
    getDashboardStats,
    fetchProfile,
    fetchDashboard,
    fetchHistory,
    fetchDetail,
    fetchBookingInvoiceDetail,
    cancelBooking,
    saveBookingFeedback,
    updateProfile,
    changePassword,
    autoCancelExpiredBookings,
    isExpiredPendingBookingRow,
    bookingAutoCancelMinutes: AUTO_CANCEL_PENDING_MINUTES,
    clearAuthSession,
  };
})(window);

if (typeof window !== "undefined" && !window.__fastGoAuthBootstrapStarted) {
  window.__fastGoAuthBootstrapStarted = true;

  Promise.resolve().then(() =>
    customerPortalStoreModule.bootstrapAuthSession?.().catch((error) => {
      console.error("Cannot bootstrap moving auth session:", error);
    }),
  );
}

export const {
  autoAuthFromUrlCredentials,
  bootstrapAuthSession,
  bookingCrudTableName,
  changePassword,
  clearAuthSession,
  fetchBookingInvoiceDetail,
  fetchDashboard,
  fetchDetail,
  fetchHistory,
  fetchProfile,
  getDashboardStats,
  getDisplayName,
  getSavedRole,
  isExpiredPendingBookingRow,
  readIdentity,
  saveIdentity,
  storageKeys: portalStorageKeys,
  syncIdentityFromProfile,
  updateProfile,
  cancelBooking,
  saveBookingFeedback,
  autoCancelExpiredBookings,
  bookingAutoCancelMinutes,
} = customerPortalStoreModule;

export { customerPortalStoreModule as customerPortalStore };
export default customerPortalStoreModule;
