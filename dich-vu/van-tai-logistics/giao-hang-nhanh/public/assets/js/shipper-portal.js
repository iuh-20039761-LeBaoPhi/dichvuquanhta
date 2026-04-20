(function (window) {
  if (window.ShipperPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const routes =
    typeof core.getPortalRoutes === "function"
      ? core.getPortalRoutes("shipper")
      : {
          home: "../../index.html",
          login: "../../dang-nhap.html",
          logout: "../../dang-nhap.html",
          dashboard: "dashboard-giaohang.html",
          orders: "don-hang-giaohang.html",
          detail: "chi-tiet-don-hang-giaohang.html",
          profile: "ho-so-giaohang.html",
        };

  (function applyAuthToRoutes() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("username");
    const password = urlParams.get("password");
    if (!username || !password) return;
    const keysToInject = ["dashboard", "orders", "profile"];
    keysToInject.forEach(function (key) {
      if (!routes[key]) return;
      try {
        const u = new URL(routes[key], window.location.href);
        u.searchParams.set("username", username);
        u.searchParams.set("password", password);
        routes[key] = u.toString();
      } catch (e) { /* skip */ }
    });
  })();

  const storageKeys = {
    orders: "ghn-customer-orders",
  };
  const AUTO_CANCEL_REASON =
    "Đơn đã quá khung giờ lấy hàng mà chưa có shipper nhận.";
  const SERVICE_AUTO_CANCEL_FALLBACK_MINUTES = {
    instant: 15,
    express: 30,
    fast: 60,
    standard: 120,
  };

  function getLoginRedirect() {
    return typeof core.getPortalLoginRedirect === "function"
      ? core.getPortalLoginRedirect("shipper")
      : `${routes.login}?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot read shipper portal local payload:", error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Cannot persist shipper portal local payload:", error);
      return false;
    }
  }

  function getCurrentSessionUser() {
    const session =
      localAuth && typeof localAuth.getSession === "function"
        ? localAuth.getSession()
        : null;
    return session && typeof session === "object" ? session : null;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizePhone(value) {
    if (localAuth && typeof localAuth.normalizePhone === "function") {
      return localAuth.normalizePhone(value);
    }
    return String(value || "").replace(/\D/g, "");
  }

  function getAccessCredentials(sessionOverride = null) {
    const session =
      sessionOverride && typeof sessionOverride === "object"
        ? sessionOverride
        : getCurrentSessionUser();
    const username = normalizeText(
      session?.username || session?.phone || session?.so_dien_thoai || "",
    );
    const password = String(session?.password || session?.mat_khau || "");

    if (!username || !password) return null;
    return { username, password };
  }

  function buildOrderDetailUrl(order, sessionOverride = null) {
    const detailUrl = new URL(routes.detail, window.location.href);
    const identifier = getOrderDetailIdentifier(order);
    if (identifier) {
      detailUrl.searchParams.set("madonhang", identifier);
    }

    const access = getAccessCredentials(sessionOverride);
    if (access) {
      detailUrl.searchParams.set("username", access.username);
      detailUrl.searchParams.set("password", access.password);
    }

    return detailUrl.toString();
  }

  function formatOrderDateCode(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("");
  }

  function isSystemOrderCode(value) {
    return /^GHN-\d{8}-\d{7}$/i.test(String(value || "").trim());
  }

  function formatSystemOrderCode(orderId, createdAt = new Date()) {
    const numericId = Number(orderId);
    if (!Number.isFinite(numericId) || numericId <= 0) return "";
    const dateCode = formatOrderDateCode(createdAt);
    if (!dateCode) return "";
    return `GHN-${dateCode}-${String(Math.trunc(Math.abs(numericId))).padStart(7, "0")}`;
  }

  function getKrudListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    return null;
  }

  function getKrudUpdateFn() {
    if (typeof window.crud === "function") {
      return (tableName, data, id) => window.crud("update", tableName, data, id);
    }

    if (typeof window.krud === "function") {
      return (tableName, data, id) => window.krud("update", tableName, data, id);
    }

    return null;
  }

  function extractRows(payload, depth = 0) {
    if (depth > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, depth + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function parseDateMs(value) {
    const normalized = normalizeText(value);
    if (!normalized) return 0;
    const timestamp = new Date(normalized).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function normalizeServiceType(value) {
    const normalized = normalizeText(value).toLowerCase();
    if (normalized === "giao_ngay_lap_tuc") return "instant";
    if (normalized === "giao_hoa_toc") return "express";
    if (normalized === "giao_nhanh") return "fast";
    if (normalized === "giao_tieu_chuan") return "standard";
    return normalized;
  }

  function extractTimeTokens(value) {
    return Array.from(
      String(value || "").matchAll(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g),
    ).map((match) => {
      const hour = Number(match[1] || 0);
      const minute = Number(match[2] || 0);
      const second = Number(match[3] || 0);
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
    });
  }

  function buildLocalDateTimeMs(dateValue, timeValue) {
    const dateText = normalizeText(dateValue).slice(0, 10);
    const timeText = normalizeText(timeValue);
    if (!dateText || !timeText) return 0;
    const timestamp = new Date(`${dateText}T${timeText}`).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function resolvePickupDeadlineMs(source) {
    const order = source && typeof source === "object" ? source : {};
    const serviceMeta =
      order.service_meta && typeof order.service_meta === "object"
        ? order.service_meta
        : {};
    const pickupDate = normalizeText(
      order.ngay_lay_hang ||
        order.pickup_date ||
        serviceMeta.pickup_date ||
        "",
    );
    const explicitDeadline = buildLocalDateTimeMs(
      pickupDate,
      normalizeText(order.gio_ket_thuc_lay_hang || serviceMeta.pickup_slot_end || ""),
    );
    if (explicitDeadline) return explicitDeadline;

    const slotTokens = extractTimeTokens(
      order.ten_khung_gio_lay_hang ||
        order.khung_gio_lay_hang ||
        order.pickup_slot_label ||
        order.pickup_slot ||
        serviceMeta.pickup_slot_label ||
        "",
    );
    const slotDeadline = buildLocalDateTimeMs(
      pickupDate,
      slotTokens[slotTokens.length - 1] || "",
    );
    if (slotDeadline) return slotDeadline;

    const pickupTimeMs = parseDateMs(order.pickup_time || "");
    if (pickupTimeMs) return pickupTimeMs;

    const createdMs = parseDateMs(order.created_at || order.created_date || "");
    if (!createdMs) return 0;
    const serviceType = normalizeServiceType(
      order.service_type || order.loai_dich_vu || order.dich_vu || "",
    );
    const fallbackMinutes =
      SERVICE_AUTO_CANCEL_FALLBACK_MINUTES[serviceType] ||
      SERVICE_AUTO_CANCEL_FALLBACK_MINUTES.fast;
    return createdMs + fallbackMinutes * 60 * 1000;
  }

  function hasAcceptedOrAssignedOrder(order) {
    return Boolean(
      normalizeText(order?.thoidiemnhandon || order?.ngaynhan || "") ||
        normalizeText(
          order?.shipper_id ||
            order?.ncc_id ||
            order?.shipper_name ||
            order?.nha_cung_cap_ho_ten ||
            "",
        ),
    );
  }

  function shouldAutoCancelPendingOrder(order, nowMs = Date.now()) {
    if (!order || typeof order !== "object") return false;
    if (normalizeText(order.ngayhuy || "")) return false;
    if (normalizeText(order.ngaybatdauthucte || "")) return false;
    if (normalizeText(order.ngayhoanthanhthucte || "")) return false;
    if (hasAcceptedOrAssignedOrder(order)) return false;

    const normalizedStatus = String(order.status || order.trang_thai || "")
      .trim()
      .toLowerCase();
    if (["cancelled", "canceled", "completed", "delivered", "success"].includes(normalizedStatus)) {
      return false;
    }

    const deadlineMs = resolvePickupDeadlineMs(order);
    return deadlineMs > 0 && nowMs >= deadlineMs;
  }

  async function autoCancelPendingKrudRows(rows = []) {
    const list = Array.isArray(rows) ? rows : [];
    const updateFn = getKrudUpdateFn();
    if (!updateFn) return list;

    const nowMs = Date.now();
    const cancelledAt = new Date(nowMs).toISOString();
    const nextRows = [];

    for (const row of list) {
      const rawRow = row && typeof row === "object" ? { ...row } : row;
      if (
        rawRow &&
        typeof rawRow === "object" &&
        normalizeText(rawRow.id || "") &&
        shouldAutoCancelPendingOrder(rawRow, nowMs)
      ) {
        try {
          await updateFn(
            "giaohangnhanh_dat_lich",
            {
              id: rawRow.id,
              trang_thai: "cancelled",
              status: "cancelled",
              ngayhuy: cancelledAt,
              ly_do_huy: normalizeText(rawRow.ly_do_huy || "") || AUTO_CANCEL_REASON,
              updated_at: cancelledAt,
            },
            rawRow.id,
          );
          rawRow.trang_thai = "cancelled";
          rawRow.status = "cancelled";
          rawRow.ngayhuy = cancelledAt;
          rawRow.ly_do_huy =
            normalizeText(rawRow.ly_do_huy || "") || AUTO_CANCEL_REASON;
        } catch (error) {
          console.error("Cannot auto cancel overdue GHN shipper booking:", error);
        }
      }

      nextRows.push(rawRow);
    }

    return nextRows;
  }

  const {
    escapeHtml,
    formatNumber,
    formatCurrency,
    formatDateTime,
    showToast,
    apiRequest,
    createStatusBadge,
    renderLoading,
    renderError
  } = core;

  function getStatusLabel(status) {
    const normalized = String(status || "").toLowerCase();
    if (
      normalized === "completed" ||
      normalized === "delivered" ||
      normalized === "success"
    ) {
      return "Hoàn tất";
    }
    if (normalized === "shipping" || normalized === "in_transit") {
      return "Đang giao";
    }
    if (normalized === "cancelled" || normalized === "canceled") {
      return "Đã hủy";
    }
    if (normalized === "decline") {
      return "Từ chối / trả đơn";
    }
    return "Chờ xử lý";
  }

  function getProfileStatusMeta(profile) {
    const isLocked = Number(profile?.is_locked || profile?.bi_khoa || 0) === 1;
    const status = normalizeText(
      profile?.trangthai || profile?.trang_thai || "",
    ).toLowerCase();

    if (isLocked || ["locked", "inactive", "blocked", "disabled"].includes(status)) {
      return {
        label: "Đang khóa",
        className: "is-locked",
        note: normalizeText(profile?.ly_do_khoa || profile?.lock_reason || "") ||
          "Tài khoản đang bị khóa, cần liên hệ quản trị viên để mở lại.",
      };
    }

    if (["pending", "waiting"].includes(status)) {
      return {
        label: "Chờ xác minh",
        className: "is-pending",
        note: "Hồ sơ nhà cung cấp đang chờ hệ thống xác minh.",
      };
    }

    return {
      label: "Sẵn sàng nhận đơn",
      className: "is-active",
      note: "Hồ sơ đang hoạt động bình thường và có thể tiếp tục nhận đơn.",
    };
  }

  function getProfileInitial(name) {
    return normalizeText(name || "").charAt(0).toUpperCase() || "N";
  }

  function isDriveFileId(value) {
    return /^[A-Za-z0-9_-]{20,}$/.test(normalizeText(value || ""));
  }

  function resolveProfileMediaSource(value) {
    const raw = normalizeText(value || "");
    if (!raw) return "";

    if (/^https?:\/\//i.test(raw)) return raw;

    if (isDriveFileId(raw) && typeof core.getDriveFileUrls === "function") {
      const urls = core.getDriveFileUrls(raw);
      return urls.thumbnailUrl || urls.url || "";
    }

    const projectBaseUrl = new URL("../../", window.location.href);
    try {
      if (raw.startsWith("../") || raw.startsWith("./")) {
        return new URL(raw, window.location.href).toString();
      }
      return new URL(raw.replace(/^\/+/, ""), projectBaseUrl).toString();
    } catch (error) {
      return "";
    }
  }

  function bindProfileMediaPreview(inputId, previewId, emptyId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const emptyState = document.getElementById(emptyId);
    if (!input || !preview) return;

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
      if (emptyState) emptyState.hidden = true;
    });
  }

  function normalizeServiceType(value) {
    const normalized = String(value || "").toLowerCase();
    const map = {
      giao_ngay_lap_tuc: "instant",
      giao_hoa_toc: "express",
      giao_nhanh: "fast",
      giao_tieu_chuan: "standard",
    };
    return map[normalized] || normalized;
  }

  function getServiceLabel(serviceType, fallbackLabel) {
    if (fallbackLabel) return fallbackLabel;
    const normalized = normalizeServiceType(serviceType);
    if (normalized === "instant") return "Giao ngay lập tức";
    if (normalized === "express") return "Giao hàng hỏa tốc";
    if (normalized === "fast") return "Giao hàng nhanh";
    if (normalized === "standard") return "Giao hàng tiêu chuẩn";
    return "--";
  }

  function getPaymentMethodLabel(paymentMethod) {
    const normalized = String(paymentMethod || "").toLowerCase();
    return ["bank", "bank_transfer", "transfer", "chuyen_khoan"].includes(
      normalized,
    )
      ? "Chuyển khoản"
      : "Tiền mặt";
  }

  function getPaymentStatusLabel(paymentStatus, fallback = "Chưa hoàn tất") {
    const normalized = String(paymentStatus || "").toLowerCase();
    if (!normalized) return fallback;
    if (["paid", "completed", "done"].includes(normalized)) {
      return "Đã hoàn tất";
    }
    if (["unpaid", "pending", "processing"].includes(normalized)) {
      return "Chưa hoàn tất";
    }
    return paymentStatus || fallback;
  }

  function getFeePayerLabel(feePayer) {
    return String(feePayer || "").toLowerCase() === "nhan"
      ? "Người nhận"
      : "Người gửi";
  }

  function normalizeMockBreakdown(rawBreakdown, shippingFee) {
    const breakdown = rawBreakdown || {};
    return {
      base_price: Number(
        breakdown.base_price ??
          breakdown.tong_gia_van_chuyen ??
          breakdown.phi_van_chuyen ??
          breakdown.gia_co_ban ??
          breakdown.baseFee ??
          breakdown.basePrice ??
          0,
      ),
      overweight_fee: Number(
        breakdown.overweight_fee ?? breakdown.overweightFee ?? 0,
      ),
      volume_fee: Number(breakdown.volume_fee ?? breakdown.volumeFee ?? 0),
      goods_fee: Number(
        breakdown.goods_fee ??
          breakdown.phu_phi_loai_hang ??
          breakdown.goodsGroupFee ??
          breakdown.goodsFee ??
          0,
      ),
      time_fee: Number(
        breakdown.time_fee ??
          breakdown.phu_phi_khung_gio ??
          breakdown.serviceFee ??
          breakdown.timeFee ??
          0,
      ),
      condition_fee: Number(
        breakdown.condition_fee ??
          breakdown.phu_phi_thoi_tiet ??
          breakdown.conditionFee ??
          0,
      ),
      vehicle_fee: Number(
        breakdown.vehicle_fee ??
          breakdown.dieu_chinh_theo_xe ??
          breakdown.vehicleFee ??
          0,
      ),
      cod_fee: Number(
        breakdown.cod_fee ?? breakdown.phi_cod ?? breakdown.codFee ?? 0,
      ),
      insurance_fee: Number(
        breakdown.insurance_fee ??
          breakdown.phi_bao_hiem ??
          breakdown.insuranceFee ??
          0,
      ),
      service_fee: Number(
        breakdown.service_fee ?? breakdown.serviceFee ?? 0,
      ),
      total_fee: Number(
        breakdown.total_fee ??
          breakdown.tong_cuoc ??
          breakdown.totalFee ??
          shippingFee ??
          0,
      ),
      khoang_cach_km: Number(
        breakdown.khoang_cach_km ?? breakdown.distance_km ?? 0,
      ),
    };
  }

  function normalizeMockItems(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({
      item_name: item.item_name || item.ten_hang || "",
      quantity: Number(item.quantity ?? item.so_luong ?? 1),
      weight: Number(item.weight ?? item.can_nang ?? 0),
      declared_value: Number(
        item.declared_value ?? item.gia_tri_khai_bao ?? 0,
      ),
      length: Number(item.length ?? item.chieu_dai ?? 0),
      width: Number(item.width ?? item.chieu_rong ?? 0),
      height: Number(item.height ?? item.chieu_cao ?? 0),
      loai_hang: item.loai_hang || "",
      ten_hang: item.ten_hang || item.item_name || "",
      so_luong: Number(item.so_luong ?? item.quantity ?? 1),
      gia_tri_khai_bao: Number(
        item.gia_tri_khai_bao ?? item.declared_value ?? 0,
      ),
      can_nang: Number(item.can_nang ?? item.weight ?? 0),
      chieu_dai: Number(item.chieu_dai ?? item.length ?? 0),
      chieu_rong: Number(item.chieu_rong ?? item.width ?? 0),
      chieu_cao: Number(item.chieu_cao ?? item.height ?? 0),
    }));
  }

  function parseJsonSafe(value, fallback) {
    if (value == null || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function deriveStatusFromRecord(record) {
    const cancelledAt = normalizeText(record.ngayhuy || "");
    const completedAt = normalizeText(record.ngayhoanthanhthucte || "");
    const startedAt = normalizeText(record.ngaybatdauthucte || "");
    const acceptedAt = normalizeText(
      record.thoidiemnhandon || record.ngaynhan || "",
    );
    if (cancelledAt) return "cancelled";
    if (completedAt) return "completed";
    if (startedAt) return "shipping";
    if (acceptedAt) return "pending";
    const normalized = String(record.trang_thai || record.status || "pending")
      .trim()
      .toLowerCase();
    if (["completed", "delivered", "success"].includes(normalized)) return "completed";
    if (["shipping", "in_transit"].includes(normalized)) return "shipping";
    if (["cancelled", "canceled"].includes(normalized)) return "cancelled";
    return "pending";
  }

  function normalizeKrudOrderDetail(record, session) {
    const shippingFee = Number(
      record.tong_cuoc ??
        record.shipping_fee ??
        record.total_fee ??
        record.phi_van_chuyen ??
        0,
    );
    const feeBreakdown = normalizeMockBreakdown(
      parseJsonSafe(
        record.chi_tiet_gia_cuoc_json ||
          record.chi_tiet_gia_json ||
          record.pricing_breakdown ||
          {},
        {},
      ),
      shippingFee,
    );
    const orderStatus = deriveStatusFromRecord(record);

    return normalizeLocalOrderDetail(
      {
        order: {
          id: record.id || record.ma_don_hang_noi_bo || record.ma_don_hang || "",
          order_code:
            record.ma_don_hang_noi_bo ||
            record.ma_don_hang ||
            record.order_code ||
            record.id ||
            "",
          status: orderStatus,
          status_label:
            record.status_label ||
            record.trang_thai_hien_thi ||
            getStatusLabel(orderStatus),
          service_type: record.dich_vu || record.loai_dich_vu || "",
          service_label: record.ten_dich_vu || record.service_label || "",
          shipping_fee: shippingFee,
          cod_amount: Number(
            record.gia_tri_thu_ho_cod ||
              record.cod_amount ||
              record.cod_value ||
              0,
          ),
          created_at: record.created_at || record.created_date || "",
          pickup_address: record.dia_chi_lay_hang || "",
          delivery_address: record.dia_chi_giao_hang || "",
          receiver_name:
            record.ho_ten_nguoi_nhan || record.nguoi_nhan_ho_ten || "",
          receiver_phone:
            record.so_dien_thoai_nguoi_nhan ||
            record.nguoi_nhan_so_dien_thoai ||
            "",
          sender_name:
            record.ho_ten_nguoi_gui || record.nguoi_gui_ho_ten || "",
          sender_phone:
            record.so_dien_thoai_nguoi_gui ||
            record.nguoi_gui_so_dien_thoai ||
            "",
          payment_method_label:
            record.payment_method_label ||
            getPaymentMethodLabel(record.phuong_thuc_thanh_toan),
          payment_status_label:
            getPaymentStatusLabel(
              record.payment_status_label || record.trang_thai_thanh_toan,
            ),
          payer_label:
            record.payer_label || getFeePayerLabel(record.nguoi_tra_cuoc),
          fee_breakdown: feeBreakdown,
          pricing_breakdown: feeBreakdown,
          khoang_cach_km: Number(record.khoang_cach_km || record.distance_km || 0),
          ngayhuy: record.ngayhuy || "",
          thoidiemnhandon: record.thoidiemnhandon || record.ngaynhan || "",
          ngaynhan: record.ngaynhan || record.thoidiemnhandon || "",
          ngaybatdauthucte: record.ngaybatdauthucte || "",
          ngayhoanthanhthucte: record.ngayhoanthanhthucte || "",
        },
        provider: {
          ...buildProviderFromSession(session),
          shipper_id: record.ncc_id || record.shipper_id || session?.id || "",
          fullname:
            record.nha_cung_cap_ho_ten ||
            record.shipper_name ||
            session?.fullname ||
            "",
          phone:
            record.nha_cung_cap_so_dien_thoai ||
            record.shipper_phone ||
            session?.phone ||
            "",
          email: record.ncc_email || session?.email || "",
          vehicle_type:
            record.shipper_vehicle ||
            record.vehicle_type ||
            session?.vehicle_type ||
            "",
          shipper_vehicle:
            record.shipper_vehicle ||
            record.vehicle_type ||
            session?.vehicle_type ||
            "",
          attachments: parseJsonSafe(
            record.attachments_json || record.attachments || [],
            [],
          ),
          shipper_reports: parseJsonSafe(
            record.shipper_reports_json || record.shipper_reports || [],
            [],
          ),
          feedback_media: parseJsonSafe(
            record.feedback_media_json || record.feedback_media || [],
            [],
          ),
        },
      },
      session,
    );
  }

  function buildProviderFromSession(session) {
    const vehicle =
      session?.vehicle_type ||
      session?.loai_phuong_tien ||
      session?.shipper_vehicle ||
      "";

    return {
      shipper_id: session?.id || session?.username || "",
      username: session?.username || "",
      fullname: session?.fullname || session?.ho_ten || "",
      phone: session?.phone || session?.so_dien_thoai || "",
      email: session?.email || "",
      vehicle_type: vehicle,
      shipper_vehicle: vehicle,
      attachments: [],
      shipper_reports: [],
      feedback_media: [],
    };
  }

  function cloneDetail(detail) {
    return JSON.parse(JSON.stringify(detail || {}));
  }

  function normalizeLocalOrderDetail(detail, session) {
    const nextDetail = cloneDetail(detail);
    const sessionProvider = buildProviderFromSession(session);
    const nextOrder = nextDetail.order || {};
    nextOrder.id = nextOrder.id || nextOrder.order_code || "";
    const explicitOrderCode = normalizeText(nextOrder.order_code || "");
    nextOrder.order_code = isSystemOrderCode(explicitOrderCode)
      ? explicitOrderCode.toUpperCase()
      : formatSystemOrderCode(nextOrder.id, nextOrder.created_at || new Date()) ||
          explicitOrderCode ||
          nextOrder.id ||
          "";
    nextOrder.status = String(nextOrder.status || "pending").toLowerCase();
    nextOrder.status_label =
      nextOrder.status_label || getStatusLabel(nextOrder.status);
    nextOrder.service_label = getServiceLabel(
      nextOrder.service_type,
      nextOrder.service_label || nextOrder.service_name,
    );
    nextOrder.shipping_fee = Number(
      nextOrder.shipping_fee || nextOrder.total_fee || 0,
    );
    nextOrder.cod_amount = Number(nextOrder.cod_amount || nextOrder.cod_value || 0);
    nextOrder.created_at = nextOrder.created_at || new Date().toISOString();
    nextOrder.ngay_lay_hang = normalizeText(
      nextOrder.ngay_lay_hang || nextOrder.pickup_date || "",
    );
    nextOrder.khung_gio_lay_hang = normalizeText(
      nextOrder.khung_gio_lay_hang || nextOrder.pickup_slot || "",
    );
    nextOrder.ten_khung_gio_lay_hang = normalizeText(
      nextOrder.ten_khung_gio_lay_hang || nextOrder.pickup_slot_label || "",
    );
    nextOrder.gio_bat_dau_lay_hang = normalizeText(
      nextOrder.gio_bat_dau_lay_hang || "",
    );
    nextOrder.gio_ket_thuc_lay_hang = normalizeText(
      nextOrder.gio_ket_thuc_lay_hang || "",
    );
    nextOrder.payment_status_label = getPaymentStatusLabel(
      nextOrder.payment_status_label,
      nextOrder.status === "completed" ? "Đã hoàn tất" : "Chưa hoàn tất",
    );
    nextOrder.fee_breakdown = normalizeMockBreakdown(
      nextOrder.fee_breakdown || nextOrder.pricing_breakdown,
      nextOrder.shipping_fee,
    );
    nextOrder.service_meta =
      nextOrder.service_meta && typeof nextOrder.service_meta === "object"
        ? nextOrder.service_meta
        : {};
    nextDetail.order = nextOrder;
    nextDetail.items = normalizeMockItems(nextDetail.items || []);
    nextDetail.logs = Array.isArray(nextDetail.logs) ? nextDetail.logs : [];
    nextDetail.provider =
      nextDetail.provider && typeof nextDetail.provider === "object"
        ? {
            ...sessionProvider,
            ...nextDetail.provider,
            shipper_reports: Array.isArray(nextDetail.provider.shipper_reports)
              ? nextDetail.provider.shipper_reports
              : [],
            feedback_media: Array.isArray(nextDetail.provider.feedback_media)
              ? nextDetail.provider.feedback_media
              : [],
            attachments: Array.isArray(nextDetail.provider.attachments)
              ? nextDetail.provider.attachments
              : [],
          }
        : sessionProvider;
    nextDetail.customer =
      nextDetail.customer && typeof nextDetail.customer === "object"
        ? nextDetail.customer
        : {};
    return nextDetail;
  }

  function getOrderSummaryFromDetail(detail) {
    const order = detail.order || {};
    return {
      ...order,
      id: order.id || order.order_code || "",
      order_code: order.order_code || order.id || "",
      status: String(order.status || "pending").toLowerCase(),
      status_label: order.status_label || getStatusLabel(order.status),
      service_label: getServiceLabel(order.service_type, order.service_label),
      shipping_fee: Number(order.shipping_fee || 0),
      cod_amount: Number(order.cod_amount || 0),
      pickup_address: order.pickup_address || "",
      delivery_address: order.delivery_address || "",
      sender_name: order.sender_name || "",
      receiver_name: order.receiver_name || "",
      receiver_phone: order.receiver_phone || "",
      created_at: order.created_at || "",
    };
  }

  function getOrderDetailIdentifier(order) {
    return normalizeText(order?.krud_id || order?.id || order?.order_code || "");
  }

  function isProviderAssignedToOrder(row, session) {
    const sessionId = normalizeText(session?.id || "");
    const sessionUsername = normalizeText(session?.username || "").toLowerCase();
    const shipperId = normalizeText(row?.ncc_id || row?.shipper_id || "");
    const shipperName = normalizeText(
      row?.nha_cung_cap_ho_ten || row?.shipper_name || "",
    ).toLowerCase();

    return (
      (sessionId && shipperId === sessionId) ||
      (sessionUsername && shipperName.includes(sessionUsername))
    );
  }

  function isOrderUnassigned(row) {
    const shipperId = normalizeText(row?.ncc_id || row?.shipper_id || "");
    const shipperName = normalizeText(
      row?.nha_cung_cap_ho_ten || row?.shipper_name || "",
    );
    return !shipperId && !shipperName;
  }

  function isOrderCancelled(row) {
    if (normalizeText(row?.ngayhuy || "")) return true;
    const rawStatus = normalizeText(row?.trang_thai || row?.status || "").toLowerCase();
    return ["cancelled", "canceled", "da_huy"].includes(rawStatus);
  }

  function shouldProviderSeeOrder(row, session) {
    const assignedToCurrentProvider = isProviderAssignedToOrder(row, session);
    if (assignedToCurrentProvider) return true;

    const unassigned = isOrderUnassigned(row);
    if (!unassigned) return false;

    return !isOrderCancelled(row);
  }

  async function getAllOrderDetails(session) {
    const listFn = getKrudListFn();
    if (session && listFn) {
      try {
        const response = await listFn({
          table: "giaohangnhanh_dat_lich",
          page: 1,
          limit: 500,
        });
        const rows = await autoCancelPendingKrudRows(extractRows(response));
        const krudDetails = rows
          .filter((row) => shouldProviderSeeOrder(row, session))
          .map((detail) => normalizeKrudOrderDetail(detail, session));

        if (krudDetails.length) {
          krudDetails.forEach((detail) => persistOrderDetail(detail, session));
          return krudDetails.sort((left, right) => {
            const leftTime = new Date(left?.order?.created_at || 0).getTime();
            const rightTime = new Date(right?.order?.created_at || 0).getTime();
            return rightTime - leftTime;
          });
        }
      } catch (error) {
        console.warn("Không thể tải đơn NCC từ KRUD, fallback local:", error);
      }
    }

    const localDetails = (
      readJson(storageKeys.orders, []) || []
    ).map((detail) => normalizeLocalOrderDetail(detail, session));
    return localDetails.sort((left, right) => {
      const leftTime = new Date(left?.order?.created_at || 0).getTime();
      const rightTime = new Date(right?.order?.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }

  function persistOrderDetail(detail, session) {
    const nextDetail = normalizeLocalOrderDetail(detail, session);
    const current = (readJson(storageKeys.orders, []) || []).map((item) =>
      normalizeLocalOrderDetail(item, session),
    );
    const nextId = String(
      nextDetail?.order?.id || nextDetail?.order?.order_code || "",
    )
      .trim()
      .toUpperCase();
    const filtered = current.filter((item) => {
      const itemId = String(item?.order?.id || item?.order?.order_code || "")
        .trim()
        .toUpperCase();
      return itemId !== nextId;
    });
    filtered.unshift(nextDetail);
    writeJson(storageKeys.orders, filtered);
    return nextDetail;
  }

  function calculateStats(details) {
    return (Array.isArray(details) ? details : []).reduce(
      (accumulator, detail) => {
        const order = detail?.order || {};
        const status = String(order.status || "pending").toLowerCase();
        accumulator.total += 1;
        if (status === "pending") accumulator.pending += 1;
        if (status === "shipping") accumulator.shipping += 1;
        if (status === "completed") {
          accumulator.completed += 1;
          accumulator.revenue += Number(order.shipping_fee || 0);
          const createdDate = new Date(order.created_at || 0);
          const today = new Date();
          if (
            createdDate.getFullYear() === today.getFullYear() &&
            createdDate.getMonth() === today.getMonth() &&
            createdDate.getDate() === today.getDate()
          ) {
            accumulator.today_completed += 1;
          }
        }
        if (status === "cancelled") accumulator.cancelled += 1;
        return accumulator;
      },
      {
        total: 0,
        pending: 0,
        shipping: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
        today_completed: 0,
        success_rate: 0,
      },
    );
  }

  function updateAuthStorage(mutator) {
    if (!localAuth) return null;
    const authKeys = localAuth.storageKeys || {};
    const usersKey = authKeys.users;
    const sessionKey = authKeys.session;
    const usersRaw = readJson(usersKey, []);
    const users = Array.isArray(usersRaw) ? usersRaw : [];
    const session = getCurrentSessionUser();
    if (!usersKey || !sessionKey || !session) return null;

    const index = users.findIndex(
      (item) => String(item.id || "") === String(session.id || ""),
    );
    if (index === -1) return null;

    const nextUser =
      mutator && typeof mutator === "function"
        ? mutator({ ...users[index] })
        : users[index];
    if (!nextUser) return null;

    users[index] = nextUser;
    writeJson(usersKey, users);
    if (typeof localAuth.saveSession === "function") {
      localAuth.saveSession({
        ...session,
        ...nextUser,
        password:
          nextUser.password ||
          nextUser.mat_khau ||
          session.password ||
          session.mat_khau ||
          "",
      });
    } else {
      window.localStorage.setItem(
        sessionKey,
        JSON.stringify({
          ...session,
          ...nextUser,
          password:
            nextUser.password ||
            nextUser.mat_khau ||
            session.password ||
            session.mat_khau ||
            "",
        }),
      );
    }
    return nextUser;
  }

  async function fetchCurrentKrudShipper(session) {
    if (!session) return null;

    if (localAuth && typeof localAuth.listAllKrudUsers === "function") {
      const users = await localAuth.listAllKrudUsers().catch(() => []);
      const sessionId = normalizeText(session.id || "");
      const sessionUsername = normalizeText(session.username || "").toLowerCase();
      const sessionPhone = normalizePhone(
        session.phone || session.so_dien_thoai || "",
      );
      const sessionEmail = normalizeText(session.email || "").toLowerCase();
      const matchedUser = Array.isArray(users)
        ? users.find((user) => {
            const userId = normalizeText(user.id || user.remote_id || "");
            const userUsername = normalizeText(
              user.username || user.phone || user.so_dien_thoai || "",
            ).toLowerCase();
            const userPhone = normalizePhone(
              user.phone || user.so_dien_thoai || "",
            );
            const userEmail = normalizeText(user.email || "").toLowerCase();
            return (
              (sessionId && userId === sessionId) ||
              (sessionUsername && userUsername === sessionUsername) ||
              (sessionPhone && userPhone === sessionPhone) ||
              (sessionEmail && userEmail === sessionEmail)
            );
          })
        : null;
      if (matchedUser) return matchedUser;
    }

    const tableName = localAuth?.krudTables?.shipper;
    const listFn = getKrudListFn();
    if (!tableName || !listFn) return null;

    const response = await listFn({
      table: tableName,
      page: 1,
      limit: 200,
    });
    const rows = extractRows(response);
    const sessionId = normalizeText(session.id || "");
    const sessionUsername = normalizeText(session.username || "").toLowerCase();
    const sessionPhone = normalizePhone(
      session.phone || session.so_dien_thoai || "",
    );
    const sessionEmail = normalizeText(session.email || "").toLowerCase();

    return (
      rows.find((row) => {
        const rowId = normalizeText(
          row.id || row.user_id || row.ma_tai_khoan_noi_bo || "",
        );
        const rowUsername = normalizeText(
          row.username || row.ten_dang_nhap || row.phone || row.so_dien_thoai,
        ).toLowerCase();
        const rowPhone = normalizePhone(row.phone || row.so_dien_thoai || "");
        const rowEmail = normalizeText(row.email || "").toLowerCase();
        return (
          (sessionId && rowId === sessionId) ||
          (sessionUsername && rowUsername === sessionUsername) ||
          (sessionPhone && rowPhone === sessionPhone) ||
          (sessionEmail && rowEmail === sessionEmail)
        );
      }) || null
    );
  }

  async function requestLocalData(action, options = {}) {
    const session = getCurrentSessionUser();

    if (!session || session.role !== "shipper") {
      window.location.href = getLoginRedirect();
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    const allDetails = await getAllOrderDetails(session);
    const stats = calculateStats(allDetails);
    stats.success_rate = stats.total
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;
    const summaries = allDetails.map(getOrderSummaryFromDetail);

    if (action === "session") {
      return { status: "success", user: session };
    }

    if (action === "dashboard") {
      const recentStatus = String(
        options.params?.recent_status || "active",
      ).toLowerCase();
      const recentOrders = summaries
        .filter((order) => {
          if (recentStatus === "all") return true;
          if (recentStatus === "active") {
            return ["pending", "shipping"].includes(order.status);
          }
          return order.status === recentStatus;
        })
        .slice(0, 6);

      return {
        status: "success",
        stats,
        recent_orders: recentOrders,
      };
    }

    if (action === "orders") {
      const search = String(options.params?.search || "")
        .trim()
        .toLowerCase();
      const status = String(options.params?.status || "")
        .trim()
        .toLowerCase();
      const dateFrom = String(options.params?.date_from || "").trim();
      const dateTo = String(options.params?.date_to || "").trim();
      const page = Math.max(1, Number(options.params?.page || 1));
      const limit = 10;

      const filtered = summaries.filter((order) => {
        const haystack = [
          order.order_code,
          order.sender_name,
          order.receiver_name,
          order.receiver_phone,
          order.pickup_address,
          order.delivery_address,
        ]
          .join(" ")
          .toLowerCase();

        if (search && !haystack.includes(search)) return false;
        if (status && String(order.status || "").toLowerCase() !== status) {
          return false;
        }

        const created = new Date(order.created_at || 0);
        if (dateFrom) {
          const from = new Date(`${dateFrom}T00:00:00`);
          if (created < from) return false;
        }
        if (dateTo) {
          const to = new Date(`${dateTo}T23:59:59`);
          if (created > to) return false;
        }
        return true;
      });

      const totalRecords = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * limit;

      return {
        status: "success",
        items: filtered.slice(start, start + limit),
        filters: {
          search: options.params?.search || "",
          status: options.params?.status || "",
          date_from: options.params?.date_from || "",
          date_to: options.params?.date_to || "",
        },
        pagination: {
          page: safePage,
          total_pages: totalPages,
          total_records: totalRecords,
          limit,
        },
      };
    }

    if (action === "profile") {
      const remoteProfile = await fetchCurrentKrudShipper(session).catch(() => null);
      if (remoteProfile) {
        updateAuthStorage((currentUser) => ({
          ...currentUser,
          fullname: normalizeText(
            remoteProfile.fullname || remoteProfile.ho_ten || currentUser.fullname,
          ),
          ho_ten: normalizeText(
            remoteProfile.ho_ten || remoteProfile.fullname || currentUser.ho_ten,
          ),
          phone: normalizeText(
            remoteProfile.phone || remoteProfile.so_dien_thoai || currentUser.phone,
          ),
          so_dien_thoai: normalizeText(
            remoteProfile.so_dien_thoai || remoteProfile.phone || currentUser.so_dien_thoai,
          ),
          email: normalizeText(remoteProfile.email || currentUser.email).toLowerCase(),
          address: normalizeText(
            remoteProfile.address ||
              remoteProfile.dia_chi ||
              remoteProfile.diachi ||
              currentUser.address ||
              currentUser.dia_chi,
          ),
          dia_chi: normalizeText(
            remoteProfile.dia_chi ||
              remoteProfile.diachi ||
              remoteProfile.address ||
              currentUser.dia_chi ||
              currentUser.address,
          ),
          vehicle_type: normalizeText(
            remoteProfile.vehicle_type ||
              remoteProfile.loai_phuong_tien ||
              currentUser.vehicle_type,
          ),
          loai_phuong_tien: normalizeText(
            remoteProfile.loai_phuong_tien ||
              remoteProfile.vehicle_type ||
              currentUser.loai_phuong_tien,
          ),
          trangthai: normalizeText(
            remoteProfile.trangthai ||
              remoteProfile.trang_thai ||
              currentUser.trangthai,
          ),
          link_avatar: normalizeText(
            remoteProfile.link_avatar ||
              remoteProfile.avatar_link ||
              currentUser.link_avatar,
          ),
          link_cccd_truoc: normalizeText(
            remoteProfile.link_cccd_truoc ||
              remoteProfile.cccd_front_link ||
              currentUser.link_cccd_truoc,
          ),
          link_cccd_sau: normalizeText(
            remoteProfile.link_cccd_sau ||
              remoteProfile.cccd_back_link ||
              currentUser.link_cccd_sau,
          ),
          avatar_name: normalizeText(
            remoteProfile.avatar_name ||
              remoteProfile.avatartenfile ||
              currentUser.avatar_name,
          ),
          cccd_front_name: normalizeText(
            remoteProfile.cccd_front_name ||
              remoteProfile.cccdmattruoctenfile ||
              currentUser.cccd_front_name,
          ),
          cccd_back_name: normalizeText(
            remoteProfile.cccd_back_name ||
              remoteProfile.cccdmatsautenfile ||
              currentUser.cccd_back_name,
          ),
        }));
      }

      const latestSession = getCurrentSessionUser() || session;
      return {
        status: "success",
        profile: {
          ...latestSession,
          ho_ten:
            remoteProfile?.ho_ten ||
            remoteProfile?.fullname ||
            latestSession.fullname ||
            latestSession.ho_ten ||
            "",
          so_dien_thoai:
            remoteProfile?.so_dien_thoai ||
            remoteProfile?.phone ||
            latestSession.phone ||
            latestSession.so_dien_thoai ||
            "",
          email:
            remoteProfile?.email ||
            latestSession.email ||
            "",
          dia_chi:
            remoteProfile?.dia_chi ||
            remoteProfile?.diachi ||
            remoteProfile?.address ||
            latestSession.dia_chi ||
            latestSession.address ||
            "",
          loai_phuong_tien:
            remoteProfile?.loai_phuong_tien ||
            remoteProfile?.vehicle_type ||
            latestSession.vehicle_type ||
            latestSession.loai_phuong_tien ||
            "",
          trangthai:
            remoteProfile?.trangthai ||
            remoteProfile?.trang_thai ||
            latestSession.trangthai ||
            "",
          link_avatar:
            remoteProfile?.link_avatar ||
            remoteProfile?.avatar_link ||
            latestSession.link_avatar ||
            "",
          link_cccd_truoc:
            remoteProfile?.link_cccd_truoc ||
            remoteProfile?.cccd_front_link ||
            latestSession.link_cccd_truoc ||
            "",
          link_cccd_sau:
            remoteProfile?.link_cccd_sau ||
            remoteProfile?.cccd_back_link ||
            latestSession.link_cccd_sau ||
            "",
          avatar_name:
            remoteProfile?.avatar_name ||
            remoteProfile?.avatartenfile ||
            latestSession.avatar_name ||
            "",
          cccd_front_name:
            remoteProfile?.cccd_front_name ||
            remoteProfile?.cccdmattruoctenfile ||
            latestSession.cccd_front_name ||
            "",
          cccd_back_name:
            remoteProfile?.cccd_back_name ||
            remoteProfile?.cccdmatsautenfile ||
            latestSession.cccd_back_name ||
            "",
          created_at:
            remoteProfile?.created_at ||
            latestSession.created_at ||
            new Date().toISOString(),
        },
        stats,
      };
    }

    if (action === "update-profile") {
      const formData = options.body;
      const fullname = String(formData?.get("ho_ten") || "").trim();
      const phone = String(formData?.get("so_dien_thoai") || "").trim();
      const email = String(formData?.get("email") || session.email || "").trim();
      const address = String(
        formData?.get("dia_chi") || session.address || session.dia_chi || "",
      ).trim();
      const vehicleType = String(
        formData?.get("loai_phuong_tien") || "",
      ).trim();
      const uploadSingleFile = async (fieldName) => {
        const file = formData?.get(fieldName);
        if (!(file instanceof File) || !file.size) return "";
        if (typeof core.uploadFileToDrive !== "function") {
          throw new Error("Hệ thống upload hồ sơ chưa sẵn sàng.");
        }
        const uploaded = await core.uploadFileToDrive(file, { name: file.name });
        return normalizeText(uploaded?.fileId || uploaded?.id || "");
      };
      const avatarLink = await uploadSingleFile("avatar_file");
      const cccdFrontLink = await uploadSingleFile("cccd_front_file");
      const cccdBackLink = await uploadSingleFile("cccd_back_file");

      if (!fullname || !phone) {
        throw new Error("Vui lòng nhập đầy đủ họ tên và số điện thoại.");
      }

      if (localAuth && typeof localAuth.updateKrudUser === "function") {
        await localAuth.updateKrudUser(session.id, "shipper", {
          fullname,
          ho_ten: fullname,
          phone,
          so_dien_thoai: phone,
          email,
          address,
          dia_chi: address,
          vehicle_type: vehicleType,
          loai_phuong_tien: vehicleType,
          link_avatar: avatarLink || session.link_avatar || "",
          link_cccd_truoc: cccdFrontLink || session.link_cccd_truoc || "",
          link_cccd_sau: cccdBackLink || session.link_cccd_sau || "",
        });
      }

      const updatedUser = updateAuthStorage((currentUser) => ({
        ...currentUser,
        fullname,
        ho_ten: fullname,
        phone,
        so_dien_thoai: phone,
        email,
        address,
        dia_chi: address,
        vehicle_type: vehicleType,
        loai_phuong_tien: vehicleType,
        link_avatar: avatarLink || currentUser.link_avatar || "",
        link_cccd_truoc: cccdFrontLink || currentUser.link_cccd_truoc || "",
        link_cccd_sau: cccdBackLink || currentUser.link_cccd_sau || "",
      }));

      if (!updatedUser) {
        throw new Error("Không thể cập nhật hồ sơ nhà cung cấp.");
      }

      return {
        status: "success",
        profile: updatedUser,
      };
    }

    if (action === "change-password") {
      const formData = options.body;
      const currentPassword = String(formData?.get("mat_khau_hien_tai") || "");
      const newPassword = String(formData?.get("mat_khau_moi") || "");
      const confirmPassword = String(
        formData?.get("xac_nhan_mat_khau_moi") || "",
      );

      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("Vui lòng nhập đầy đủ thông tin mật khẩu.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Xác nhận mật khẩu mới không khớp.");
      }
      if (newPassword.length < 8) {
        throw new Error("Mật khẩu mới cần ít nhất 8 ký tự.");
      }
      if (newPassword === currentPassword) {
        throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại.");
      }
      const storedPassword = String(session?.password || "");
      if (storedPassword && storedPassword !== currentPassword) {
        throw new Error("Mật khẩu hiện tại không chính xác.");
      }

      if (localAuth && typeof localAuth.updateKrudUser === "function") {
        await localAuth.updateKrudUser(session.id, "shipper", {
          password: newPassword,
          mat_khau: newPassword,
        });
      }

      const updatedUser = updateAuthStorage((currentUser) => {
        if (String(currentUser.password || "") !== currentPassword) {
          throw new Error("Mật khẩu hiện tại không chính xác.");
        }
        return {
          ...currentUser,
          password: newPassword,
        };
      });

      if (!updatedUser) {
        throw new Error("Không thể đổi mật khẩu cho tài khoản hiện tại.");
      }

      return {
        status: "success",
      };
    }

    throw new Error("Tác vụ nhà cung cấp chưa được hỗ trợ ở local mode.");
  }

  async function portalApiRequest(action, options = {}) {
    return requestLocalData(action, options);
  }

  function getPageRoot() {
    return {
      shell: document.getElementById("shipper-shell"),
      content: document.getElementById("shipper-page-content"),
    };
  }

  function getFirstName(user) {
    return String(user?.fullname || user?.username || "Nhà cung cấp")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-1)[0];
  }

  function syncPublicHeader(user) {
    const loginItem = document.getElementById("nav-login-item");
    const registerItem = document.getElementById("nav-register-item");
    const firstName = escapeHtml(getFirstName(user) || "Nhà cung cấp");
    const accountSummary = escapeHtml(
      String(user?.phone || "").trim() ||
        String(user?.email || "").trim() ||
        "Khu vực nhà cung cấp",
    );

    if (loginItem) {
      loginItem.className = "dropdown has-submenu customer-nav-dropdown";
      loginItem.innerHTML = `
        <a href="${routes.dashboard}">Xin chào, ${firstName}</a>
        <ul class="dropdown-menu customer-nav-dropdown-menu">
          <li class="customer-nav-dropdown-summary">
            <div class="customer-nav-dropdown-avatar">${firstName.charAt(0)}</div>
            <div class="customer-nav-dropdown-user">
              <strong>${firstName}</strong>
              <span>${accountSummary}</span>
            </div>
          </li>
          <li><a href="${routes.dashboard}"><i class="fas fa-chart-line"></i> Tổng quan</a></li>
          <li><a href="${routes.orders}"><i class="fas fa-truck-ramp-box"></i> Đơn của tôi</a></li>
          <li><a href="${routes.profile}"><i class="fas fa-user-gear"></i> Hồ sơ cá nhân</a></li>
          <li class="customer-nav-logout-wrapper">
            <a href="${routes.logout}" class="customer-nav-logout" data-local-logout="1">
              <i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất
            </a>
          </li>
        </ul>
      `;
    }

    if (registerItem) {
      registerItem.innerHTML = "";
      registerItem.hidden = true;
    }
  }

  function renderShell(user, activePage) {
    const { shell } = getPageRoot();
    if (!shell) return;

    shell.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <main class="customer-portal-main" id="shipper-page-content"></main>
      </div>
    `;
    if (typeof core.bindPortalLogoutActions === "function") {
      core.bindPortalLogoutActions(shell, {
        localAuth,
        redirectUrl: getLoginRedirect(),
      });
    }
  }

  function redirectNonShipper(session, page) {
    const role = String(session?.role || "")
      .trim()
      .toLowerCase();
    if (!role || role === "shipper") return false;

    if (role === "customer") {
      const targetByPage = {
        dashboard: "../khach-hang/dashboard-giaohang.html",
        orders: "../khach-hang/lich-su-don-hang-giaohang.html",
        profile: "../khach-hang/ho-so-giaohang.html",
      };
      const target = targetByPage[page] || "../khach-hang/dashboard-giaohang.html";
      window.location.replace(target);
      return true;
    }

    if (localAuth && typeof localAuth.getDashboardPath === "function") {
      window.location.replace(`../../${localAuth.getDashboardPath(role)}`);
      return true;
    }

    return false;
  }

  function buildPagination(currentPage, totalPages) {
    if (!totalPages || totalPages <= 1) return "";
    const buttons = [];

    const createLink = (page, label, active = false) => {
      const url = new URL(window.location.href);
      url.searchParams.set("page", page);
      return `<a href="${escapeHtml(url.search)}" class="customer-page-btn ${active ? "is-active" : ""}">${escapeHtml(label)}</a>`;
    };

    if (currentPage > 1) buttons.push(createLink(currentPage - 1, "Trước"));
    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(createLink(page, String(page), currentPage === page));
    }
    if (currentPage < totalPages) buttons.push(createLink(currentPage + 1, "Sau"));

    return `<div class="customer-pagination">${buttons.join("")}</div>`;
  }

  function renderInfoList(items) {
    return `<dl class="customer-info-list">${items
      .map(
        (item) => `
      <div>
        <dt>${escapeHtml(item.label)}</dt>
        <dd>${item.html ? item.value : escapeHtml(item.value ?? "--")}</dd>
      </div>`,
      )
      .join("")}</dl>`;
  }

  async function initDashboard() {
    renderLoading("Đang tải tổng quan...");
    const data = await portalApiRequest("dashboard", { params: { recent_status: "active" } });

    const { content } = getPageRoot();
    const stats = data.stats || {};
    const recentOrders = (Array.isArray(data.recent_orders) ? data.recent_orders : []).slice(0, 3);
    const activeOrders = Number(stats.pending || 0) + Number(stats.shipping || 0);

    content.innerHTML = `
      <section class="customer-panel customer-panel-overview">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Khu vực nhà cung cấp</p>
            <h2>Tổng quan công việc</h2>
            <p class="customer-panel-subtext">Bạn đang có ${formatNumber(activeOrders)} đơn cần theo dõi và xử lý tiến độ.</p>
          </div>
          <div class="customer-inline-actions">
            <a href="${routes.orders}" class="customer-btn customer-btn-primary">Xem tất cả</a>
          </div>
        </div>
        <div class="customer-kpi-grid customer-kpi-grid-dashboard">
          <article class="customer-kpi-card customer-kpi-card-total">
            <span>Tổng đơn</span>
            <strong>${formatNumber(stats.total || 0)}</strong>
          </article>
          <article class="customer-kpi-card ${activeOrders > 0 ? "customer-kpi-card-shipping" : "customer-kpi-card-pending"}">
            <span>Cần xử lý</span>
            <strong>${formatNumber(activeOrders)}</strong>
          </article>
          <article class="customer-kpi-card customer-kpi-card-revenue">
            <span>Thu nhập tích lũy</span>
            <strong>${formatCurrency(stats.revenue || 0)}</strong>
          </article>
        </div>
      </section>

      <section class="customer-panel customer-panel-orders">
        <div class="customer-panel-head customer-panel-head-dashboard">
          <div>
            <p class="customer-section-kicker">Đơn hàng mới</p>
            <h2>Danh sách việc cần làm</h2>
            <p class="customer-panel-subtext">3 đơn hàng mới nhất được phân công cho bạn.</p>
          </div>
          <div class="customer-inline-actions customer-inline-actions-dashboard">
            <form action="${routes.orders}" method="GET" class="customer-quick-search">
              <input type="text" name="search" placeholder="Mã đơn, SĐT nhận..." required />
              <button type="submit" class="customer-btn customer-btn-primary customer-btn-sm" style="min-width: 44px; padding: 0;"><i class="fas fa-search"></i></button>
            </form>
          </div>
        </div>

        <div class="customer-list customer-list-compact">
          ${
            recentOrders.length
              ? recentOrders
                  .map(
                    (order) => `
              <article class="customer-order-card customer-order-card-compact">
                <div class="customer-order-topline">
                  <div class="customer-order-heading">
                    <p class="customer-order-recipient">${escapeHtml(order.service_label || "Giao hàng nhanh")}</p>
                    <div class="customer-order-heading-meta">
                      <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                      ${createStatusBadge(order.status, order.status_label)}
                    </div>
                    <p class="customer-order-route">${escapeHtml(order.pickup_address)} → ${escapeHtml(order.delivery_address)}</p>
                  </div>
                  <div class="customer-order-side">
                    <div class="customer-order-price-block">
                      <span class="customer-order-price-label">Cước ship</span>
                      <strong class="customer-order-price">${formatCurrency(order.shipping_fee || 0)}</strong>
                    </div>
                    <div class="customer-order-actions customer-order-actions-compact">
                      <a class="customer-btn customer-btn-primary customer-btn-sm" href="${buildOrderDetailUrl(order)}">Xem chi tiết</a>
                    </div>
                  </div>
                </div>
                <div class="customer-order-meta customer-order-meta-compact">
                  <span><b>Người nhận</b><span class="customer-order-meta-value">${escapeHtml(order.receiver_name || "Chưa cập nhật")}</span></span>
                  <span><b>COD</b><span class="customer-order-meta-value">${formatCurrency(order.cod_amount || 0)}</span></span>
                  <span><b>Tạo</b><span class="customer-order-meta-value">${formatDateTime(order.created_at)}</span></span>
                </div>
              </article>`,
                  )
                  .join("")
              : '<div class="customer-empty">Chưa có đơn hàng nào được phân công.</div>'
          }
        </div>
      </section>
    `;
  }

  async function initOrders() {
    renderLoading("Đang tải đơn hàng của nhà cung cấp...");
    const params = new URLSearchParams(window.location.search);
    const requestParams = {
      search: params.get("search") || "",
      status: params.get("status") || "",
      date_from: params.get("date_from") || "",
      date_to: params.get("date_to") || "",
      page: params.get("page") || 1,
    };

    const data = await portalApiRequest("orders", { params: requestParams });
    const { content } = getPageRoot();
    const items = Array.isArray(data.items) ? data.items : [];
    const filters = data.filters || {};
    const pagination = data.pagination || {};
    const statusLabels = {
      pending: "Chờ xử lý",
      shipping: "Đang giao",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
    };
    const activeFilters = [];
    if (filters.search) activeFilters.push(`Từ khóa: ${filters.search}`);
    if (filters.status) activeFilters.push(`Trạng thái: ${statusLabels[filters.status] || filters.status}`);
    if (filters.date_from) activeFilters.push(`Từ ngày: ${filters.date_from}`);
    if (filters.date_to) activeFilters.push(`Đến ngày: ${filters.date_to}`);
    const currentPage = Number(pagination.page || 1);
    const totalPages = Number(pagination.total_pages || 1);
    const totalResults = Number(pagination.total_records || items.length || 0);

    content.innerHTML = `
      <section class="customer-panel customer-orders-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Đơn hàng của tôi</p>
            <h2>Tra cứu và mở chi tiết đơn được phân công</h2>
            <p class="customer-panel-subtext">Trang ${formatNumber(currentPage)} / ${formatNumber(totalPages)} · ${formatNumber(totalResults)} đơn phù hợp với bộ lọc hiện tại.</p>
          </div>
          <span class="customer-panel-note">Quản lý tập trung</span>
        </div>

        <form id="shipper-order-filter" class="customer-filter-form customer-filter-form-compact customer-filter-form-orders">
          <label class="customer-filter-field-search">
            <span>Tìm đơn / người gửi / người nhận</span>
            <input type="text" name="search" value="${escapeHtml(filters.search || "")}" placeholder="ORD..., tên người gửi, người nhận" />
          </label>
          <label class="customer-filter-field-status">
            <span>Trạng thái</span>
            <select name="status">
              <option value="">Tất cả</option>
              <option value="pending" ${filters.status === "pending" ? "selected" : ""}>Chờ xử lý</option>
              <option value="shipping" ${filters.status === "shipping" ? "selected" : ""}>Đang giao</option>
              <option value="completed" ${filters.status === "completed" ? "selected" : ""}>Hoàn tất</option>
              <option value="cancelled" ${filters.status === "cancelled" ? "selected" : ""}>Đã hủy</option>
            </select>
          </label>
          <label class="customer-filter-field-date">
            <span>Từ ngày</span>
            <input type="date" name="date_from" value="${escapeHtml(filters.date_from || "")}" />
          </label>
          <label class="customer-filter-field-date">
            <span>Đến ngày</span>
            <input type="date" name="date_to" value="${escapeHtml(filters.date_to || "")}" />
          </label>
          <div class="customer-inline-actions customer-filter-actions">
            <button type="submit" class="customer-btn customer-btn-primary">Lọc dữ liệu</button>
            <a href="${routes.orders}" class="customer-btn customer-btn-ghost">Đặt lại bộ lọc</a>
          </div>
        </form>

        <div class="customer-active-filters">
          ${
            activeFilters.length
              ? activeFilters
                  .map((item) => `<span class="customer-chip customer-chip-muted">${escapeHtml(item)}</span>`)
                  .join("")
              : '<span class="customer-active-filters-note">Đang hiển thị toàn bộ đơn đã được phân công cho bạn.</span>'
          }
        </div>

        <div class="customer-list customer-list-history">
          ${
            items.length
              ? items
                  .map(
                    (order) => `
              <article class="customer-order-card customer-order-card-history">
                <div class="customer-order-topline">
                  <div class="customer-order-heading">
                    <p class="customer-order-recipient">${escapeHtml(order.service_label || "Giao hàng nhanh")}</p>
                    <div class="customer-order-heading-meta">
                      <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                      ${createStatusBadge(order.status, order.status_label)}
                    </div>
                    <p class="customer-order-dest">Từ ${escapeHtml(order.pickup_address)} đến ${escapeHtml(order.delivery_address)}</p>
                  </div>
                  <div class="customer-order-side">
                    <div class="customer-order-price-block">
                      <span class="customer-order-price-label">Cước ship</span>
                      <strong class="customer-order-price">${formatCurrency(order.shipping_fee || 0)}</strong>
                    </div>
                    <div class="customer-order-actions customer-order-actions-compact">
                      <a class="customer-btn customer-btn-primary customer-btn-sm" href="${buildOrderDetailUrl(order)}">Xem chi tiết</a>
                    </div>
                  </div>
                </div>
                <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                  <span><b>Người gửi</b><span class="customer-order-meta-value">${escapeHtml(order.sender_name || "--")}</span></span>
                  <span><b>Người nhận</b><span class="customer-order-meta-value">${escapeHtml(order.receiver_name || "--")} · ${escapeHtml(order.receiver_phone || "--")}</span></span>
                  <span><b>COD</b><span class="customer-order-meta-value">${formatCurrency(order.cod_amount)}</span></span>
                  <span><b>Tạo</b><span class="customer-order-meta-value">${formatDateTime(order.created_at)}</span></span>
                </div>
              </article>`,
                  )
                  .join("")
              : '<div class="customer-empty">Không tìm thấy đơn phù hợp.</div>'
          }
        </div>
        <div class="customer-pagination-wrap">
          ${buildPagination(currentPage, totalPages)}
        </div>
      </section>
    `;

    const filterForm = document.getElementById("shipper-order-filter");
    if (filterForm) {
      filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(filterForm);
        const url = new URL(window.location.href);
        ["search", "status", "date_from", "date_to"].forEach((field) => {
          const value = String(formData.get(field) || "").trim();
          if (value) {
            url.searchParams.set(field, value);
          } else {
            url.searchParams.delete(field);
          }
        });
        url.searchParams.delete("page");
        window.location.href = url.toString();
      });
    }
  }

  async function initProfile() {
    renderLoading("Đang tải hồ sơ nhà cung cấp...");
    const data = await portalApiRequest("profile");
    const { content } = getPageRoot();
    const profile = data.profile || {};
    const stats = data.stats || {};
    const name = profile.ho_ten || profile.fullname || "Nhà cung cấp";
    const phone = profile.so_dien_thoai || profile.phone || "Chưa cập nhật";
    const email = profile.email || "Chưa cập nhật email";
    const vehicleType =
      profile.loai_phuong_tien || profile.vehicle_type || "Chưa cập nhật";
    const initial = getProfileInitial(name);
    const statusMeta = getProfileStatusMeta(profile);
    const createdAtLabel = profile.created_at
      ? formatDateTime(profile.created_at)
      : "Chưa có dữ liệu";
    const avatarSrc = resolveProfileMediaSource(
      profile.link_avatar || profile.avatar_name || profile.avatartenfile,
    );
    const cccdFrontSrc = resolveProfileMediaSource(
      profile.link_cccd_truoc ||
        profile.cccd_front_name ||
        profile.cccdmattruoctenfile,
    );
    const cccdBackSrc = resolveProfileMediaSource(
      profile.link_cccd_sau ||
        profile.cccd_back_name ||
        profile.cccdmatsautenfile,
    );

    content.innerHTML = `
      <section class="customer-portal-profile customer-portal-profile-rich">
        <div class="customer-profile-hero customer-profile-hero-rich">
          <div class="customer-profile-hero-main">
            <div class="customer-profile-avatar-wrapper customer-profile-avatar-wrapper-rich">
              ${
                avatarSrc
                  ? `<img class="customer-profile-avatar-image" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(name)}" />`
                  : `<div class="customer-profile-avatar-large">${initial}</div>`
              }
            </div>
            <div class="customer-profile-hero-info">
              <p class="customer-profile-eyebrow">Hồ sơ nhà cung cấp giao hàng</p>
              <h2>${escapeHtml(name)}</h2>
              <p><i class="fas fa-id-badge"></i> ID: ${escapeHtml(profile.username || "Shipper")}</p>
              <div class="customer-profile-meta-list">
                <span><i class="fas fa-phone"></i> ${escapeHtml(phone)}</span>
                <span><i class="fas fa-truck-fast"></i> ${escapeHtml(vehicleType)}</span>
              </div>
            </div>
          </div>
          <div class="customer-profile-hero-side">
            <span class="customer-profile-status-badge ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
            <p class="customer-profile-hero-note">${escapeHtml(statusMeta.note)}</p>
            <small><i class="fas fa-clock"></i> Đồng bộ lần gần nhất: ${escapeHtml(createdAtLabel)}</small>
          </div>
        </div>

        <div class="customer-profile-summary">
          <article><span>Tổng đơn</span><strong>${formatNumber(stats.total || 0)}</strong></article>
          <article><span>Hoàn tất</span><strong>${formatNumber(stats.completed || 0)}</strong></article>
          <article><span>Tỷ lệ</span><strong>${stats.success_rate || 0}%</strong></article>
        </div>

        <div class="customer-profile-sections">
          <form id="shipper-profile-form" class="customer-profile-edit-layout" enctype="multipart/form-data">
            <div class="customer-profile-edit-main">
              <div class="customer-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-id-card"></i>
                  <h3>Thông tin hành nghề</h3>
                </div>
                <div class="customer-form-row">
                  <div class="customer-form-group">
                    <span>Họ và tên</span>
                    <div class="customer-form-field">
                      <i class="fas fa-user"></i>
                      <input name="ho_ten" value="${escapeHtml(name)}" required />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Số điện thoại tài khoản</span>
                    <div class="customer-form-field">
                      <i class="fas fa-phone"></i>
                      <input name="so_dien_thoai" value="${escapeHtml(phone)}" readonly disabled aria-readonly="true" />
                    </div>
                  </div>
                </div>
                <div class="customer-form-row">
                  <div class="customer-form-group">
                    <span>Email</span>
                    <div class="customer-form-field">
                      <i class="fas fa-envelope"></i>
                      <input name="email" type="email" value="${escapeHtml(profile.email || "")}" placeholder="shipper@example.com" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Địa chỉ</span>
                    <div class="customer-form-field">
                      <i class="fas fa-location-dot"></i>
                      <input name="dia_chi" value="${escapeHtml(profile.dia_chi || profile.address || "")}" placeholder="Khu vực hoạt động, địa chỉ liên hệ..." />
                    </div>
                  </div>
                </div>
                <div class="customer-form-group">
                  <span>Loại phương tiện</span>
                  <div class="customer-form-field">
                    <i class="fas fa-truck"></i>
                    <input name="loai_phuong_tien" value="${escapeHtml(profile.loai_phuong_tien || profile.vehicle_type || "")}" placeholder="Ví dụ: Xe máy, xe tải nhỏ..." />
                  </div>
                </div>
                <p class="customer-form-helper customer-form-helper-compact">
                  <i class="fas fa-circle-info"></i> Số điện thoại là định danh tài khoản tài xế, hiện không thể chỉnh sửa tại đây.
                </p>
              </div>
            </div>

            <div class="customer-profile-edit-side">
              <div class="customer-profile-card customer-profile-card-compact">
                <div class="customer-profile-card-head">
                  <i class="fas fa-route"></i>
                  <h3>Tóm tắt vận hành</h3>
                </div>
                <div class="customer-profile-fact-list">
                  <div><span>Trạng thái</span><strong>${escapeHtml(statusMeta.label)}</strong></div>
                  <div><span>Loại phương tiện</span><strong>${escapeHtml(vehicleType)}</strong></div>
                  <div><span>Email</span><strong>${escapeHtml(email)}</strong></div>
                </div>
              </div>

              <div class="customer-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-shield-check"></i>
                  <h3>Xác minh hồ sơ</h3>
                </div>
                <div class="customer-profile-media-grid">
                  <article class="customer-profile-media-card">
                    <div class="customer-profile-media-head">
                      <strong>Ảnh đại diện</strong>
                      <span>Nhận diện</span>
                    </div>
                    <div class="customer-profile-media-preview">
                      <img id="shipper-avatar-preview" src="${escapeHtml(avatarSrc || "")}" alt="Ảnh đại diện" ${avatarSrc ? "" : "hidden"} />
                      <div id="shipper-avatar-empty" class="customer-profile-media-empty" ${avatarSrc ? "hidden" : ""}>Chưa có ảnh đại diện</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                      <input id="shipper-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-camera"></i> Chọn ảnh
                    </label>
                  </article>

                  <article class="customer-profile-media-card">
                    <div class="customer-profile-media-head">
                      <strong>CCCD mặt trước</strong>
                      <span>Xác minh</span>
                    </div>
                    <div class="customer-profile-media-preview">
                      <img id="shipper-cccd-front-preview" src="${escapeHtml(cccdFrontSrc || "")}" alt="CCCD mặt trước" ${cccdFrontSrc ? "" : "hidden"} />
                      <div id="shipper-cccd-front-empty" class="customer-profile-media-empty" ${cccdFrontSrc ? "hidden" : ""}>Chưa có CCCD mặt trước</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                      <input id="shipper-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-id-card"></i> Chọn ảnh
                    </label>
                  </article>

                  <article class="customer-profile-media-card">
                    <div class="customer-profile-media-head">
                      <strong>CCCD mặt sau</strong>
                      <span>Xác minh</span>
                    </div>
                    <div class="customer-profile-media-preview">
                      <img id="shipper-cccd-back-preview" src="${escapeHtml(cccdBackSrc || "")}" alt="CCCD mặt sau" ${cccdBackSrc ? "" : "hidden"} />
                      <div id="shipper-cccd-back-empty" class="customer-profile-media-empty" ${cccdBackSrc ? "hidden" : ""}>Chưa có CCCD mặt sau</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                      <input id="shipper-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-id-card-clip"></i> Chọn ảnh
                    </label>
                  </article>
                </div>
              </div>

              <div class="customer-profile-card customer-profile-save-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-save"></i>
                  <h3>Lưu hồ sơ</h3>
                </div>
                <p class="customer-profile-save-copy">Cập nhật hồ sơ hành nghề và ảnh xác minh để hệ thống điều phối đơn mượt hơn.</p>
                <button class="customer-btn customer-btn-primary" type="submit" id="shipper-profile-submit-btn">
                  <i class="fas fa-save"></i> Cập nhật hồ sơ
                </button>
              </div>
            </div>
          </form>

          <div class="customer-profile-card customer-password-card">
            <div class="customer-profile-card-head">
              <i class="fas fa-shield-halved"></i>
              <h3>Bảo mật tài khoản</h3>
            </div>
            <form id="shipper-password-form" class="customer-form-stack">
              <div class="customer-form-group">
                <span>Mật khẩu hiện tại</span>
                <div class="customer-form-field">
                  <i class="fas fa-key"></i>
                  <input name="mat_khau_hien_tai" type="password" autocomplete="current-password" required placeholder="••••••••" />
                </div>
              </div>
              <div class="customer-form-row">
                <div class="customer-form-group">
                  <span>Mật khẩu mới</span>
                  <div class="customer-form-field">
                    <i class="fas fa-lock"></i>
                    <input name="mat_khau_moi" type="password" minlength="8" autocomplete="new-password" required placeholder="Nhập mật khẩu mới" />
                  </div>
                </div>
                <div class="customer-form-group">
                  <span>Xác nhận mật khẩu</span>
                  <div class="customer-form-field">
                    <i class="fas fa-lock-open"></i>
                    <input name="xac_nhan_mat_khau_moi" type="password" minlength="8" autocomplete="new-password" required placeholder="Cùng mật khẩu mới" />
                  </div>
                </div>
              </div>
              <p class="customer-form-helper" style="margin: 0 0 16px;"><i class="fas fa-circle-info"></i> Mật khẩu mới cần ít nhất 8 ký tự.</p>
              <button class="customer-btn customer-btn-ghost" type="submit">
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        </div>
      </section>
    `;

    const profileForm = document.getElementById("shipper-profile-form");
    if (profileForm) {
      bindProfileMediaPreview(
        "shipper-avatar-file",
        "shipper-avatar-preview",
        "shipper-avatar-empty",
      );
      bindProfileMediaPreview(
        "shipper-cccd-front-file",
        "shipper-cccd-front-preview",
        "shipper-cccd-front-empty",
      );
      bindProfileMediaPreview(
        "shipper-cccd-back-file",
        "shipper-cccd-back-preview",
        "shipper-cccd-back-empty",
      );
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = document.getElementById("shipper-profile-submit-btn");
        try {
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu hồ sơ';
          }
          await portalApiRequest("update-profile", {
            method: "POST",
            body: new FormData(profileForm),
          });
          showToast("Đã cập nhật hồ sơ cá nhân.", "success");
          window.setTimeout(() => {
            window.location.reload();
          }, 600);
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Cập nhật hồ sơ';
          }
        }
      });
    }

    const passwordForm = document.getElementById("shipper-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(passwordForm);
        const newPassword = String(formData.get("mat_khau_moi") || "");
        const confirmPassword = String(
          formData.get("xac_nhan_mat_khau_moi") || "",
        );

        if (newPassword !== confirmPassword) {
          showToast("Xác nhận mật khẩu mới không khớp.", "error");
          return;
        }

        try {
          await portalApiRequest("change-password", {
            method: "POST",
            body: formData,
          });
          showToast("Đã đổi mật khẩu thành công.", "success");
          passwordForm.reset();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }
  }

  async function init() {
    const page = document.body.dataset.shipperPage;
    if (!page) return;

    if (page === "detail") {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("viewer")) {
        params.set("viewer", "shipper");
      }
      const query = params.toString();
      window.location.href = `${routes.detail}${query ? `?${query}` : ""}`;
      return;
    }

    const sessionData = await portalApiRequest("session");
    if (redirectNonShipper(sessionData.user, page)) {
      return;
    }
    syncPublicHeader(sessionData.user || {});
    renderShell(sessionData.user || {}, page);

    switch (page) {
      case "dashboard":
        await initDashboard();
        break;
      case "orders":
        await initOrders();
        break;
      case "profile":
        await initProfile();
        break;
      default:
        throw new Error("Trang nhà cung cấp không hợp lệ.");
    }
  }

  window.ShipperPortal = { init };
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      renderError(error);
    });
  });
})(window);
