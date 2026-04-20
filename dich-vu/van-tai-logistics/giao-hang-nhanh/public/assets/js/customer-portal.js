(function (window) {
  if (window.CustomerPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const routes =
    typeof core.getPortalRoutes === "function"
      ? core.getPortalRoutes("customer")
      : {
          login: "../../dang-nhap.html",
          logout: "../../dang-nhap.html",
          booking: "../../dat-lich-giao-hang-nhanh.html",
          dashboard: "dashboard-giaohang.html",
          orders: "lich-su-don-hang-giaohang.html",
          detail: "chi-tiet-don-hang-giaohang.html",
          profile: "ho-so-giaohang.html",
        };

  (function applyAuthToRoutes() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("username");
    const password = urlParams.get("password");
    if (!username || !password) return;
    const keysToInject = ["dashboard", "orders", "profile", "booking"];
    keysToInject.forEach(function (key) {
      if (!routes[key]) return;
      try {
        const u = new URL(routes[key], window.location.href);
        u.searchParams.set("username", username);
        u.searchParams.set("password", password);
        routes[key] = u.toString();
      } catch (e) {
        /* skip */
      }
    });
  })();

  const storageKeys = {
    orders: "ghn-customer-orders",
    addresses: "ghn-customer-addresses",
  };
  const krudOrdersTable = "giaohangnhanh_dat_lich";
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
      ? core.getPortalLoginRedirect("customer")
      : `${routes.login}?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot read customer portal local payload:", error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Cannot persist customer portal local payload:", error);
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

  function getDetailQueryParams() {
    return new URLSearchParams(window.location.search);
  }

  function getDetailIdentifierFromUrl() {
    const params = getDetailQueryParams();
    return normalizeText(
      params.get("madonhang") || params.get("code") || params.get("id") || "",
    );
  }

  function getUrlAccessCredentials() {
    const params = getDetailQueryParams();
    const username = normalizeText(params.get("username") || "");
    const password = String(params.get("password") || "");
    if (!username || !password) return null;
    return { username, password };
  }

  async function ensureUrlAccessSession() {
    const session = getCurrentSessionUser();
    if (session) return session;

    if (!localAuth || typeof localAuth.login !== "function") {
      return null;
    }

    const params = getDetailQueryParams();
    const username = normalizeText(params.get("username") || "");
    const password = String(params.get("password") || "");
    if (!username || !password) return null;

    try {
      const result = await localAuth.login({
        loginIdentifier: username,
        password,
      });
      if (result && result.status === "success") {
        return result.user || getCurrentSessionUser();
      }
    } catch (error) {
      console.error("Customer portal URL auth failed:", error);
    }

    return getCurrentSessionUser();
  }

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePhone(value) {
    if (localAuth && typeof localAuth.normalizePhone === "function") {
      return localAuth.normalizePhone(value);
    }
    return String(value ?? "").replace(/\D/g, "");
  }

  function findStoredAuthUser(session) {
    if (!session || !localAuth?.storageKeys?.users) return null;
    const users = readJson(localAuth.storageKeys.users, []);
    if (!Array.isArray(users) || !users.length) return null;

    const sessionId = normalizeText(session.id || "");
    const sessionUsername = normalizeText(session.username || "").toLowerCase();
    const sessionPhone = normalizePhone(
      session.phone || session.so_dien_thoai || "",
    );
    const sessionEmail = normalizeText(session.email || "").toLowerCase();

    return (
      users.find((user) => {
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
      }) || null
    );
  }

  function getAccessCredentials(sessionOverride = null) {
    const fromUrl = getUrlAccessCredentials();
    if (fromUrl) return fromUrl;

    const session = sessionOverride || getCurrentSessionUser();
    if (!session) return null;

    const storedUser = findStoredAuthUser(session);
    const username = normalizeText(
      session.username ||
        session.phone ||
        session.so_dien_thoai ||
        storedUser?.username ||
        storedUser?.phone ||
        storedUser?.so_dien_thoai ||
        "",
    );
    const password = String(
      session.password || storedUser?.password || storedUser?.mat_khau || "",
    );

    if (!username || !password) return null;
    return { username, password };
  }

  function buildOrderDetailUrl(order, sessionOverride = null) {
    const detailUrl = new URL(routes.detail, window.location.href);
    const identifier = normalizeText(
      order?.krud_id || order?.id || order?.order_code || "",
    );
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

  function parseJsonSafe(value, fallback) {
    if (value == null || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function getKrudListFn() {
    if (typeof core.getKrudListFn === "function") {
      const fn = core.getKrudListFn();
      if (typeof fn === "function") return fn;
    }

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
      return (tableName, data, id) =>
        window.crud("update", tableName, data, id);
    }

    if (typeof window.krud === "function") {
      return (tableName, data, id) =>
        window.krud("update", tableName, data, id);
    }

    return null;
  }

  function extractRows(payload, depth = 0) {
    if (typeof core.extractRows === "function") {
      return core.extractRows(payload, depth);
    }
    if (depth > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = [
      "data",
      "items",
      "rows",
      "list",
      "result",
      "payload",
    ];
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
      order.ngay_lay_hang || order.pickup_date || serviceMeta.pickup_date || "",
    );
    const explicitDeadline = buildLocalDateTimeMs(
      pickupDate,
      normalizeText(
        order.gio_ket_thuc_lay_hang || serviceMeta.pickup_slot_end || "",
      ),
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
      normalizeText(
        order?.thoidiemnhandon ||
          order?.ngaynhan ||
          order?.accepted_at ||
          order?.acceptedAt ||
          "",
      ) ||
      normalizeText(
        order?.shipper_id ||
          order?.ncc_id ||
          order?.provider_id ||
          order?.shipper_name ||
          order?.nha_cung_cap_ho_ten ||
          "",
      ),
    );
  }

  function canCustomerCancelOrder(order) {
    if (!order || typeof order !== "object") return false;
    const normalizedStatus = String(order.status || "").toLowerCase();
    if (["cancelled", "canceled", "completed"].includes(normalizedStatus)) {
      return false;
    }
    if (normalizeText(order.ngaybatdauthucte || order.started_at || "")) {
      return false;
    }
    if (normalizeText(order.ngayhoanthanhthucte || order.completed_at || "")) {
      return false;
    }
    if (shouldAutoCancelPendingOrder(order)) {
      return false;
    }
    return !hasAcceptedOrAssignedOrder(order);
  }

  function shouldAutoCancelPendingOrder(order, nowMs = Date.now()) {
    if (!order || typeof order !== "object") return false;
    if (normalizeText(order.ngayhuy || order.cancelled_at || "")) return false;
    if (normalizeText(order.ngaybatdauthucte || order.started_at || ""))
      return false;
    if (normalizeText(order.ngayhoanthanhthucte || order.completed_at || ""))
      return false;
    if (hasAcceptedOrAssignedOrder(order)) return false;

    const normalizedStatus = String(order.status || order.trang_thai || "")
      .trim()
      .toLowerCase();
    if (
      ["cancelled", "canceled", "completed", "delivered", "success"].includes(
        normalizedStatus,
      )
    ) {
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
            krudOrdersTable,
            {
              id: rawRow.id,
              trang_thai: "cancelled",
              status: "cancelled",
              ngayhuy: cancelledAt,
              ly_do_huy:
                normalizeText(rawRow.ly_do_huy || rawRow.cancel_reason || "") ||
                AUTO_CANCEL_REASON,
              updated_at: cancelledAt,
            },
            rawRow.id,
          );
          rawRow.trang_thai = "cancelled";
          rawRow.status = "cancelled";
          rawRow.ngayhuy = cancelledAt;
          rawRow.ly_do_huy =
            normalizeText(rawRow.ly_do_huy || rawRow.cancel_reason || "") ||
            AUTO_CANCEL_REASON;
        } catch (error) {
          console.error("Cannot auto cancel overdue GHN booking:", error);
        }
      }

      nextRows.push(rawRow);
    }

    return nextRows;
  }

  function getMediaExtension(item) {
    const direct = normalizeText(item?.extension || "").toLowerCase();
    if (direct) return direct;

    const fileName = normalizeText(item?.name || "");
    if (fileName.includes(".")) {
      return fileName.split(".").pop().toLowerCase();
    }

    const url = normalizeText(item?.url || item || "");
    if (!url) return "";
    const cleanUrl = url.split("?")[0].split("#")[0];
    const parts = cleanUrl.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function normalizeMediaItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((item, index) => {
        if (typeof item === "string") {
          const url = normalizeText(item);
          return url
            ? {
                id: "",
                name: `Tệp đính kèm ${index + 1}`,
                extension: getMediaExtension(url),
                url,
                created_at: "",
              }
            : null;
        }

        if (!item || typeof item !== "object") return null;
        const url = normalizeText(item.url || item.path || item.src || "");
        return {
          id: normalizeText(item.id || ""),
          name: normalizeText(item.name || item.filename || "Tệp đính kèm"),
          extension: getMediaExtension(item),
          url,
          created_at: normalizeText(item.created_at || item.createdAt || ""),
        };
      })
      .filter((item) => item && item.url);
  }

  async function uploadOrderMedia(orderRef, files, mediaType) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return [];

    const normalizedOrderRef = normalizeText(orderRef || "");
    if (!normalizedOrderRef) {
      throw new Error("Không tìm thấy mã đơn để tải media lên Google Drive.");
    }

    if (typeof core.uploadFilesToDrive !== "function") {
      throw new Error("Không tìm thấy helper upload Google Drive.");
    }

    return normalizeMediaItems(await core.uploadFilesToDrive(list));
  }
  const escapeHtml =
    typeof core.escapeHtml === "function"
      ? (value) => core.escapeHtml(value)
      : (value) =>
          String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
  const formatCurrency =
    typeof core.formatCurrency === "function"
      ? (value) => core.formatCurrency(value)
      : (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  const formatNumber =
    typeof core.formatNumber === "function"
      ? (value) => core.formatNumber(value)
      : (value) => Number(value || 0).toLocaleString("vi-VN");
  const formatDateTime =
    typeof core.formatDateTime === "function"
      ? (value) => core.formatDateTime(value)
      : (value) => {
          if (!value) return "--";
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return escapeHtml(value);
          return date.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        };
  const formatDateOnly =
    typeof core.formatDateOnly === "function"
      ? (value) => core.formatDateOnly(value)
      : (value) => {
          if (!value) return "--";
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return escapeHtml(value);
          return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        };
  const getServiceLabel =
    typeof core.getServiceLabel === "function"
      ? (serviceType, fallbackLabel) =>
          core.getServiceLabel(serviceType, fallbackLabel)
      : (serviceType, fallbackLabel) => fallbackLabel || "--";
  const getPaymentMethodLabel =
    typeof core.getPaymentMethodLabel === "function"
      ? (paymentMethod) => core.getPaymentMethodLabel(paymentMethod)
      : (paymentMethod) =>
          ["bank", "bank_transfer", "transfer", "chuyen_khoan"].includes(
            String(paymentMethod || "").toLowerCase(),
          )
            ? "Chuyển khoản"
            : "Tiền mặt";
  const getPaymentStatusLabel =
    typeof core.getPaymentStatusLabel === "function"
      ? (paymentStatus, fallback = "Chưa hoàn tất") =>
          core.getPaymentStatusLabel(paymentStatus, fallback)
      : (paymentStatus, fallback = "Chưa hoàn tất") =>
          paymentStatus || fallback;
  const getFeePayerLabel =
    typeof core.getFeePayerLabel === "function"
      ? (feePayer) => core.getFeePayerLabel(feePayer)
      : (feePayer) =>
          String(feePayer || "").toLowerCase() === "nhan"
            ? "Người nhận"
            : "Người gửi";
  const getStatusLabel =
    typeof core.getStatusLabel === "function"
      ? (status) => core.getStatusLabel(status)
      : (status) => String(status || "") || "Chờ xử lý";

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
      service_fee: Number(breakdown.service_fee ?? breakdown.serviceFee ?? 0),
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
      declared_value: Number(item.declared_value ?? item.gia_tri_khai_bao ?? 0),
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

  function cloneDetail(detail) {
    return JSON.parse(JSON.stringify(detail || {}));
  }

  function normalizeLocalOrderDetail(detail) {
    const nextDetail = cloneDetail(detail);
    const nextOrder = nextDetail.order || {};
    nextOrder.id =
      nextOrder.id || nextOrder.krud_id || nextOrder.order_code || "";
    nextOrder.krud_id = nextOrder.krud_id || "";
    const explicitOrderCode = normalizeText(nextOrder.order_code || "");
    nextOrder.order_code = isSystemOrderCode(explicitOrderCode)
      ? explicitOrderCode.toUpperCase()
      : formatSystemOrderCode(
          nextOrder.krud_id || nextOrder.id,
          nextOrder.created_at || new Date(),
        ) ||
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
    nextOrder.cod_amount = Number(
      nextOrder.cod_amount || nextOrder.cod_value || 0,
    );
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
    nextOrder.cancel_reason =
      nextOrder.cancel_reason || nextOrder.ly_do_huy || "";
    nextOrder.rating = Number(
      nextOrder.rating || nextOrder.danh_gia_so_sao || 0,
    );
    nextOrder.feedback = nextOrder.feedback || nextOrder.phan_hoi || "";
    nextOrder.shipper_note =
      nextOrder.shipper_note || nextOrder.ghi_chu_shipper || "";
    nextOrder.pod_image =
      nextOrder.pod_image || nextOrder.anh_xac_nhan_giao_hang || "";
    nextOrder.payment_status_label = getPaymentStatusLabel(
      nextOrder.payment_status_label || nextOrder.trang_thai_thanh_toan,
      nextOrder.status === "completed" ? "Đã hoàn tất" : "Chưa hoàn tất",
    );
    nextOrder.fee_breakdown = normalizeMockBreakdown(
      nextOrder.fee_breakdown || nextOrder.pricing_breakdown,
      nextOrder.shipping_fee,
    );
    nextDetail.order = nextOrder;
    nextDetail.items = normalizeMockItems(nextDetail.items || []);
    nextDetail.logs = Array.isArray(nextDetail.logs) ? nextDetail.logs : [];
    nextDetail.provider =
      nextDetail.provider && typeof nextDetail.provider === "object"
        ? {
            ...nextDetail.provider,
            attachments: normalizeMediaItems(nextDetail.provider.attachments),
            shipper_reports: normalizeMediaItems(
              nextDetail.provider.shipper_reports,
            ),
            feedback_media: normalizeMediaItems(
              nextDetail.provider.feedback_media,
            ),
          }
        : {};
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
      receiver_name: order.receiver_name || "",
      created_at: order.created_at || "",
    };
  }

  async function getAllOrderDetails(sessionOverride = null) {
    const localDetails = (readJson(storageKeys.orders, []) || []).map(
      normalizeLocalOrderDetail,
    );
    const session = sessionOverride || getCurrentSessionUser();
    const listFn = getKrudListFn();

    if (session && listFn) {
      try {
        const response = await listFn({
          table: krudOrdersTable,
          page: 1,
          limit: 500,
        });
        const rows = await autoCancelPendingKrudRows(extractRows(response));
        const sessionId = normalizeText(session.id || "");
        const sessionUsername = normalizeText(
          session.username || "",
        ).toLowerCase();
        const sessionPhone = normalizePhone(
          session.phone || session.so_dien_thoai || "",
        );
        const sessionEmail = normalizeText(session.email || "").toLowerCase();
        const localMap = new Map(
          localDetails.map((detail) => [
            normalizeText(
              detail?.order?.order_code || detail?.order?.id || "",
            ).toUpperCase(),
            detail,
          ]),
        );

        const krudDetails = rows
          .filter((row) => {
            const customerId = normalizeText(row.customer_id || "");
            const customerUsername = normalizeText(
              row.customer_username || "",
            ).toLowerCase();
            const senderPhone = normalizePhone(
              row.so_dien_thoai_nguoi_gui || row.nguoi_gui_so_dien_thoai || "",
            );
            const senderEmail = normalizeText(
              row.email_nguoi_gui || row.customer_email || "",
            ).toLowerCase();
            return (
              (sessionId && customerId === sessionId) ||
              (sessionUsername && customerUsername === sessionUsername) ||
              (sessionPhone && senderPhone === sessionPhone) ||
              (sessionEmail && senderEmail && senderEmail === sessionEmail)
            );
          })
          .map((record) => {
            const shippingFee = Number(
              record.tong_cuoc ??
                record.shipping_fee ??
                record.total_fee ??
                record.phi_van_chuyen ??
                0,
            );
            const rawStatus = String(
              record.trang_thai || record.status || "pending",
            )
              .trim()
              .toLowerCase();
            let normalizedStatus = "pending";
            if (normalizeText(record.ngayhuy)) normalizedStatus = "cancelled";
            else if (normalizeText(record.ngayhoanthanhthucte))
              normalizedStatus = "completed";
            else if (normalizeText(record.ngaybatdauthucte))
              normalizedStatus = "shipping";
            else if (
              ["completed", "delivered", "success"].includes(rawStatus)
            ) {
              normalizedStatus = "completed";
            } else if (["shipping", "in_transit"].includes(rawStatus)) {
              normalizedStatus = "shipping";
            } else if (["cancelled", "canceled"].includes(rawStatus)) {
              normalizedStatus = "cancelled";
            }

            const detail = normalizeLocalOrderDetail({
              source: "krud",
              order: {
                id:
                  record.id ||
                  record.ma_don_hang_noi_bo ||
                  record.ma_don_hang ||
                  "",
                krud_id: record.id || "",
                order_code:
                  record.ma_don_hang_noi_bo ||
                  record.ma_don_hang ||
                  record.order_code ||
                  record.id ||
                  "",
                status: normalizedStatus,
                status_label:
                  record.status_label ||
                  record.trang_thai_hien_thi ||
                  getStatusLabel(normalizedStatus),
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
                ngay_lay_hang: record.ngay_lay_hang || "",
                khung_gio_lay_hang: record.khung_gio_lay_hang || "",
                ten_khung_gio_lay_hang: record.ten_khung_gio_lay_hang || "",
                gio_bat_dau_lay_hang: record.gio_bat_dau_lay_hang || "",
                gio_ket_thuc_lay_hang: record.gio_ket_thuc_lay_hang || "",
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
                payment_method:
                  record.payment_method || record.phuong_thuc_thanh_toan || "",
                payment_method_label: getPaymentMethodLabel(
                  record.payment_method || record.phuong_thuc_thanh_toan,
                ),
                payment_status_label: getPaymentStatusLabel(
                  record.payment_status_label || record.trang_thai_thanh_toan,
                ),
                fee_breakdown: normalizeMockBreakdown(
                  parseJsonSafe(
                    record.chi_tiet_gia_cuoc_json ||
                      record.chi_tiet_gia_json ||
                      record.pricing_breakdown ||
                      {},
                    {},
                  ),
                  shippingFee,
                ),
                clean_note: record.ghi_chu || "",
                cancel_reason: record.ly_do_huy || record.cancel_reason || "",
                rating: Number(record.danh_gia_so_sao || record.rating || 0),
                feedback: record.phan_hoi || record.feedback || "",
                shipper_note:
                  record.ghi_chu_shipper || record.shipper_note || "",
                pod_image:
                  record.pod_image || record.anh_xac_nhan_giao_hang || "",
                ngayhuy: record.ngayhuy || "",
                thoidiemnhandon:
                  record.thoidiemnhandon || record.ngaynhan || "",
                ngaynhan: record.ngaynhan || record.thoidiemnhandon || "",
                ngaybatdauthucte: record.ngaybatdauthucte || "",
                ngayhoanthanhthucte: record.ngayhoanthanhthucte || "",
              },
              provider: {
                shipper_id: record.ncc_id || record.shipper_id || "",
                shipper_name:
                  record.nha_cung_cap_ho_ten || record.shipper_name || "",
                shipper_phone:
                  record.nha_cung_cap_so_dien_thoai ||
                  record.shipper_phone ||
                  "",
                email: record.ncc_email || "",
                shipper_address:
                  record.ncc_dia_chi ||
                  record.shipper_address ||
                  record.dia_chi_nha_cung_cap ||
                  "",
                address:
                  record.shipper_address ||
                  record.ncc_dia_chi ||
                  record.dia_chi_nha_cung_cap ||
                  "",
                vehicle_type:
                  record.shipper_vehicle || record.vehicle_type || "",
                shipper_vehicle:
                  record.shipper_vehicle || record.vehicle_type || "",
                bien_so: record.bien_so || "",
                attachments: normalizeMediaItems(
                  parseJsonSafe(
                    record.attachments_json || record.attachments || [],
                    [],
                  ),
                ),
                shipper_reports: normalizeMediaItems(
                  parseJsonSafe(
                    record.shipper_reports_json || record.shipper_reports || [],
                    [],
                  ),
                ),
                feedback_media: normalizeMediaItems(
                  parseJsonSafe(
                    record.feedback_media_json || record.feedback_media || [],
                    [],
                  ),
                ),
              },
              customer: {
                fullname:
                  record.ho_ten_nguoi_gui || record.nguoi_gui_ho_ten || "",
                username: record.customer_username || session?.username || "",
                phone:
                  record.so_dien_thoai_nguoi_gui ||
                  record.nguoi_gui_so_dien_thoai ||
                  "",
                email:
                  record.email_nguoi_gui ||
                  record.customer_email ||
                  session?.email ||
                  "",
                company_name: session?.company_name || "",
                tax_code: session?.tax_code || "",
                company_address: session?.company_address || "",
              },
              items: parseJsonSafe(
                record.mat_hang_json || record.items_json || record.items || [],
                [],
              ),
              logs: [
                {
                  created_at: record.created_at || "",
                  old_status_label: "Khởi tạo",
                  new_status_label: "Đơn hàng",
                  note:
                    normalizeText(
                      record.ghi_chu_quan_tri || record.admin_note,
                    ) || "Đơn hàng được tải trực tiếp từ dữ liệu hệ thống.",
                },
              ],
            });

            const localKey = normalizeText(
              detail?.order?.order_code || detail?.order?.id || "",
            ).toUpperCase();
            const localDetail = localMap.get(localKey);
            if (!localDetail) return detail;

            return normalizeLocalOrderDetail({
              ...detail,
              provider: {
                ...(detail.provider || {}),
                attachments: detail.provider?.attachments?.length
                  ? detail.provider.attachments
                  : localDetail.provider?.attachments,
                shipper_reports: detail.provider?.shipper_reports?.length
                  ? detail.provider.shipper_reports
                  : localDetail.provider?.shipper_reports,
                feedback_media: detail.provider?.feedback_media?.length
                  ? detail.provider.feedback_media
                  : localDetail.provider?.feedback_media,
              },
              logs:
                Array.isArray(localDetail.logs) && localDetail.logs.length
                  ? localDetail.logs
                  : detail.logs,
            });
          });

        krudDetails.forEach((detail) => persistOrderDetail(detail));
        return krudDetails.sort((left, right) => {
          const leftTime = new Date(left?.order?.created_at || 0).getTime();
          const rightTime = new Date(right?.order?.created_at || 0).getTime();
          return rightTime - leftTime;
        });
      } catch (error) {
        console.warn(
          "Cannot load customer orders from KRUD, fallback local:",
          error,
        );
      }
    }

    return localDetails.sort((left, right) => {
      const leftTime = new Date(left?.order?.created_at || 0).getTime();
      const rightTime = new Date(right?.order?.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }

  function findOrderDetailByIdentifier(details, identifier) {
    const normalizedIdentifier = normalizeText(identifier).toUpperCase();
    if (!normalizedIdentifier) return null;

    return (
      (Array.isArray(details) ? details : []).find((item) => {
        const candidates = [
          item?.order?.krud_id,
          item?.order?.id,
          item?.order?.order_code,
        ]
          .map((value) => normalizeText(value).toUpperCase())
          .filter(Boolean);
        return candidates.includes(normalizedIdentifier);
      }) || null
    );
  }

  async function updateKrudOrderRecord(detail, patch) {
    const updateFn = getKrudUpdateFn();
    const recordId = normalizeText(
      detail?.order?.krud_id || detail?.order?.id || "",
    );

    if (!updateFn || !recordId) return false;

    const result = await updateFn(
      krudOrdersTable,
      {
        id: recordId,
        updated_at: new Date().toISOString(),
        ...patch,
      },
      recordId,
    );
    if (!result || result.success === false || result.error) {
      throw new Error(
        result?.error || result?.message || "Không thể cập nhật đơn hàng.",
      );
    }
    return true;
  }

  function persistOrderDetail(detail) {
    const nextDetail = normalizeLocalOrderDetail(detail);
    const current = (readJson(storageKeys.orders, []) || []).map(
      normalizeLocalOrderDetail,
    );
    const nextKeys = [
      nextDetail?.order?.krud_id,
      nextDetail?.order?.id,
      nextDetail?.order?.order_code,
    ]
      .map((value) => normalizeText(value).toUpperCase())
      .filter(Boolean);
    const filtered = current.filter((item) => {
      const itemKeys = [
        item?.order?.krud_id,
        item?.order?.id,
        item?.order?.order_code,
      ]
        .map((value) => normalizeText(value).toUpperCase())
        .filter(Boolean);
      return !itemKeys.some((key) => nextKeys.includes(key));
    });
    filtered.unshift(nextDetail);
    writeJson(storageKeys.orders, filtered);
    return nextDetail;
  }

  function getSavedAddresses(userId) {
    const allAddresses = readJson(storageKeys.addresses, []);
    return (Array.isArray(allAddresses) ? allAddresses : [])
      .filter((item) => String(item.user_id || "") === String(userId || ""))
      .sort((left, right) => {
        const leftTime = new Date(left.created_at || 0).getTime();
        const rightTime = new Date(right.created_at || 0).getTime();
        return rightTime - leftTime;
      });
  }

  function saveAddressesForUser(userId, addresses) {
    const allAddresses = readJson(storageKeys.addresses, []);
    const nextAddresses = Array.isArray(allAddresses) ? allAddresses : [];
    const preserved = nextAddresses.filter(
      (item) => String(item.user_id || "") !== String(userId || ""),
    );
    writeJson(storageKeys.addresses, [
      ...preserved,
      ...(Array.isArray(addresses) ? addresses : []),
    ]);
  }

  function updateAuthStorage(mutator) {
    if (!localAuth) return null;
    const authKeys = localAuth.storageKeys || {};
    const usersKey = authKeys.users;
    const sessionKey = authKeys.session;
    const users = Array.isArray(readJson(usersKey, []))
      ? readJson(usersKey, [])
      : [];
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

  async function fetchCurrentKrudCustomer(session) {
    if (!session) return null;

    if (localAuth && typeof localAuth.listAllKrudUsers === "function") {
      const users = await localAuth.listAllKrudUsers().catch(() => []);
      const sessionId = normalizeText(session.id || "");
      const sessionUsername = normalizeText(
        session.username || "",
      ).toLowerCase();
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

    const tableName = localAuth?.krudTables?.customer;
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

  function formatMultilineText(value) {
    return escapeHtml(value ?? "--").replace(/\r?\n/g, "<br>");
  }

  function showToast(message, type) {
    if (core.showToast) {
      core.showToast(message, type);
      return;
    }
    window.alert(message);
  }

  function getProfileStatusMeta(profile) {
    const isLocked = Number(profile?.is_locked || profile?.bi_khoa || 0) === 1;
    const status = normalizeText(
      profile?.trangthai || profile?.trang_thai || "",
    ).toLowerCase();

    if (
      isLocked ||
      ["locked", "inactive", "blocked", "disabled"].includes(status)
    ) {
      return {
        label: "Đang khóa",
        className: "is-locked",
        note:
          normalizeText(profile?.ly_do_khoa || profile?.lock_reason || "") ||
          "Tài khoản đang bị khóa trên hệ thống.",
      };
    }

    if (["pending", "waiting"].includes(status)) {
      return {
        label: "Chờ xác nhận",
        className: "is-pending",
        note: "Hồ sơ đang chờ hệ thống kiểm tra và đồng bộ.",
      };
    }

    return {
      label: "Đang hoạt động",
      className: "is-active",
      note: "Tài khoản có thể tiếp tục đặt đơn và quản lý hồ sơ.",
    };
  }

  function getProfileInitial(name) {
    return (
      normalizeText(name || "")
        .charAt(0)
        .toUpperCase() || "K"
    );
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

  function openCancelOrderDialog(orderCode) {
    return new Promise((resolve) => {
      if (
        typeof window.HTMLDialogElement === "undefined" ||
        typeof document.createElement("dialog").showModal !== "function"
      ) {
        const confirmed = window.confirm(
          `Bạn có chắc muốn hủy đơn ${orderCode || ""} không?`,
        );
        if (!confirmed) {
          resolve(null);
          return;
        }
        const reason = window.prompt(
          "Nhập lý do hủy đơn (có thể để trống nếu không cần):",
          "Khách hàng chủ động hủy đơn.",
        );
        resolve(reason === null ? null : String(reason).trim());
        return;
      }

      const dialog = document.createElement("dialog");
      dialog.className = "customer-dialog";
      dialog.innerHTML = `
        <form method="dialog" class="customer-dialog-card">
          <div class="customer-dialog-copy">
            <p class="customer-section-kicker">Xác nhận hủy đơn</p>
            <h2>Hủy đơn ${escapeHtml(orderCode || "")}</h2>
            <p class="customer-panel-subtext">Đơn sau khi hủy sẽ không thể tiếp tục xử lý.</p>
          </div>
          <label class="customer-form-stack">
            <span>Lý do hủy</span>
            <textarea name="cancel_reason" rows="4" placeholder="Nhập lý do hủy nếu cần...">Khách hàng chủ động hủy đơn.</textarea>
          </label>
          <div class="customer-inline-actions customer-dialog-actions">
            <button type="button" class="customer-btn customer-btn-ghost" data-dialog-close>Quay lại</button>
            <button type="submit" class="customer-btn customer-btn-danger" value="confirm">Xác nhận hủy</button>
          </div>
        </form>
      `;

      const cleanup = () => {
        if (dialog.isConnected) dialog.remove();
      };

      dialog.addEventListener("close", () => {
        if (dialog.returnValue === "confirm") {
          const reasonField = dialog.querySelector("[name='cancel_reason']");
          resolve(String(reasonField?.value || "").trim());
        } else {
          resolve(null);
        }
        cleanup();
      });

      dialog
        .querySelector("[data-dialog-close]")
        ?.addEventListener("click", () => {
          dialog.close("cancel");
        });

      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  async function requestLocalData(action, options = {}) {
    const session = options.sessionOverride || getCurrentSessionUser();
    const allowUrlAccess = action === "order-detail";

    if (!session && !allowUrlAccess) {
      window.location.href = getLoginRedirect();
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    const allDetails = await getAllOrderDetails(session);
    const summaries = allDetails.map(getOrderSummaryFromDetail);

    if (action === "session") {
      return { status: "success", user: session };
    }

    if (action === "dashboard") {
      const recentStatus = String(options?.params?.recent_status || "all")
        .trim()
        .toLowerCase();
      const filteredRecent =
        recentStatus && recentStatus !== "all"
          ? summaries.filter((item) => item.status === recentStatus)
          : summaries;
      const stats = {
        total: summaries.length,
        pending: summaries.filter((item) => item.status === "pending").length,
        shipping: summaries.filter((item) => item.status === "shipping").length,
        completed: summaries.filter((item) => item.status === "completed")
          .length,
        cancelled: summaries.filter((item) => item.status === "cancelled")
          .length,
        unpaid: 0,
      };
      return {
        status: "success",
        stats,
        recent_orders: filteredRecent.slice(0, 5),
      };
    }

    if (action === "orders") {
      const params = options?.params || {};
      const search = String(params.search || "")
        .trim()
        .toLowerCase();
      const status = String(params.status || "")
        .trim()
        .toLowerCase();
      const dateFrom = String(params.date_from || "").trim();
      const dateTo = String(params.date_to || "").trim();
      const page = Math.max(Number(params.page || 1), 1);
      const pageSize = 6;
      const filtered = summaries.filter((item) => {
        if (status && item.status !== status) return false;
        if (dateFrom && String(item.created_at || "").slice(0, 10) < dateFrom)
          return false;
        if (dateTo && String(item.created_at || "").slice(0, 10) > dateTo)
          return false;
        if (!search) return true;
        const haystack = [
          item.order_code,
          item.pickup_address,
          item.delivery_address,
          item.receiver_name,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
      const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
      const safePage = Math.min(page, totalPages);
      const startIndex = (safePage - 1) * pageSize;
      return {
        status: "success",
        items: filtered.slice(startIndex, startIndex + pageSize),
        filters: {
          search: params.search || "",
          status: params.status || "",
          date_from: params.date_from || "",
          date_to: params.date_to || "",
        },
        pagination: {
          page: safePage,
          total_pages: totalPages,
          total_records: filtered.length,
        },
      };
    }

    if (action === "order-detail") {
      const orderId = String(options?.params?.id || "")
        .trim()
        .toUpperCase();
      const detail =
        allDetails.find((item) => {
          const itemId = String(
            item?.order?.id || item?.order?.order_code || "",
          )
            .trim()
            .toUpperCase();
          return itemId === orderId;
        }) || null;
      if (!detail) {
        throw new Error("Không tìm thấy dữ liệu cho đơn hàng này.");
      }
      return {
        status: "success",
        ...detail,
      };
    }

    if (action === "cancel-order") {
      const formData = options.body;
      const orderId = String(formData?.get("order_id") || "")
        .trim()
        .toUpperCase();
      const reason = String(formData?.get("reason") || "").trim();
      const currentDetail = findOrderDetailByIdentifier(allDetails, orderId);
      if (!currentDetail) {
        throw new Error("Không tìm thấy đơn hàng cần hủy.");
      }
      const nextDetail = normalizeLocalOrderDetail(currentDetail);
      if (!canCustomerCancelOrder(nextDetail.order)) {
        throw new Error(
          "Đơn đã có shipper nhận hoặc đã vào xử lý nên không thể hủy từ phía khách hàng.",
        );
      }
      const cancelledAt = new Date().toISOString();
      nextDetail.order.status = "cancelled";
      nextDetail.order.status_label = "Đã hủy";
      nextDetail.order.ngayhuy = cancelledAt;
      nextDetail.order.cancel_reason = reason || "Khách hàng chủ động hủy đơn.";
      nextDetail.logs = [
        {
          old_status_label:
            currentDetail.order.status_label ||
            getStatusLabel(currentDetail.order.status),
          new_status_label: "Đã hủy",
          created_at: cancelledAt,
          note: nextDetail.order.cancel_reason,
        },
        ...(Array.isArray(currentDetail.logs) ? currentDetail.logs : []),
      ];
      const updatedOnKrud = await updateKrudOrderRecord(nextDetail, {
        trang_thai: "cancelled",
        status: "cancelled",
        ngayhuy: cancelledAt,
        ly_do_huy: nextDetail.order.cancel_reason,
      });
      if (!updatedOnKrud) {
        console.warn(
          "KRUD update unavailable for cancel-order, saved locally.",
        );
      }
      persistOrderDetail(nextDetail);
      return { status: "success" };
    }

    if (action === "submit-feedback") {
      const formData = options.body;
      const orderId = String(formData?.get("order_id") || "")
        .trim()
        .toUpperCase();
      const rating = Number(formData?.get("rating") || 0);
      const feedback = String(formData?.get("feedback") || "").trim();
      const currentDetail = findOrderDetailByIdentifier(allDetails, orderId);
      if (!currentDetail) {
        throw new Error("Không tìm thấy đơn hàng để gửi phản hồi.");
      }
      const mediaFiles = formData?.getAll("media_files[]") || [];
      const nextDetail = normalizeLocalOrderDetail(currentDetail);
      const orderRef = nextDetail.order.order_code || nextDetail.order.id || "";
      const existingFeedbackMedia = normalizeMediaItems(
        nextDetail.provider.feedback_media,
      );
      const uploadedFeedbackMedia = mediaFiles.length
        ? await uploadOrderMedia(orderRef, mediaFiles, "feedback")
        : [];
      const feedbackMedia = uploadedFeedbackMedia.length
        ? [...existingFeedbackMedia, ...uploadedFeedbackMedia]
        : existingFeedbackMedia;
      nextDetail.order.rating = rating;
      nextDetail.order.feedback = feedback;
      nextDetail.provider.feedback_media = feedbackMedia;
      const updatedOnKrud = await updateKrudOrderRecord(nextDetail, {
        danh_gia_so_sao: rating || "",
        rating: rating || "",
        phan_hoi: feedback,
        feedback,
        feedback_media_json: JSON.stringify(feedbackMedia),
      });
      if (!updatedOnKrud) {
        console.warn(
          "KRUD update unavailable for submit-feedback, saved locally.",
        );
      }
      persistOrderDetail(nextDetail);
      return { status: "success" };
    }

    if (action === "profile") {
      const remoteProfile = await fetchCurrentKrudCustomer(session).catch(
        () => null,
      );
      if (remoteProfile) {
        updateAuthStorage((currentUser) => ({
          ...currentUser,
          fullname: normalizeText(
            remoteProfile.fullname ||
              remoteProfile.ho_ten ||
              currentUser.fullname,
          ),
          ho_ten: normalizeText(
            remoteProfile.ho_ten ||
              remoteProfile.fullname ||
              currentUser.ho_ten,
          ),
          phone: normalizeText(
            remoteProfile.phone ||
              remoteProfile.so_dien_thoai ||
              currentUser.phone,
          ),
          so_dien_thoai: normalizeText(
            remoteProfile.so_dien_thoai ||
              remoteProfile.phone ||
              currentUser.so_dien_thoai,
          ),
          email: normalizeText(
            remoteProfile.email || currentUser.email,
          ).toLowerCase(),
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
          company_name: normalizeText(
            remoteProfile.company_name ||
              remoteProfile.ten_cong_ty ||
              currentUser.company_name,
          ),
          tax_code: normalizeText(
            remoteProfile.tax_code ||
              remoteProfile.ma_so_thue ||
              currentUser.tax_code,
          ),
          company_address: normalizeText(
            remoteProfile.company_address ||
              remoteProfile.dia_chi ||
              remoteProfile.dia_chi_cong_ty ||
              currentUser.company_address,
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
      const stats = {
        total: summaries.length,
        pending: summaries.filter((item) => item.status === "pending").length,
        shipping: summaries.filter((item) => item.status === "shipping").length,
        completed: summaries.filter((item) => item.status === "completed")
          .length,
      };
      return {
        status: "success",
        profile: {
          ...latestSession,
          ho_ten:
            remoteProfile?.ho_ten ||
            remoteProfile?.fullname ||
            latestSession.fullname ||
            "",
          so_dien_thoai:
            remoteProfile?.so_dien_thoai ||
            remoteProfile?.phone ||
            latestSession.phone ||
            latestSession.so_dien_thoai ||
            "",
          email: remoteProfile?.email || latestSession.email || "",
          dia_chi:
            remoteProfile?.dia_chi ||
            remoteProfile?.diachi ||
            remoteProfile?.address ||
            latestSession.dia_chi ||
            latestSession.address ||
            "",
          ten_cong_ty:
            remoteProfile?.ten_cong_ty ||
            remoteProfile?.company_name ||
            latestSession.company_name ||
            "",
          ma_so_thue:
            remoteProfile?.ma_so_thue ||
            remoteProfile?.tax_code ||
            latestSession.tax_code ||
            "",
          dia_chi_cong_ty:
            remoteProfile?.dia_chi_cong_ty ||
            remoteProfile?.company_address ||
            remoteProfile?.dia_chi ||
            latestSession.company_address ||
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
        },
        stats,
        saved_addresses: getSavedAddresses(latestSession.id),
      };
    }

    if (action === "update-profile") {
      const formData = options.body;
      const uploadSingleFile = async (fieldName) => {
        const file = formData?.get(fieldName);
        if (!(file instanceof File) || !file.size) return "";
        if (typeof core.uploadFileToDrive !== "function") {
          throw new Error("Hệ thống upload hồ sơ chưa sẵn sàng.");
        }
        const uploaded = await core.uploadFileToDrive(file, {
          name: file.name,
        });
        return normalizeText(uploaded?.fileId || uploaded?.id || "");
      };

      const avatarLink = await uploadSingleFile("avatar_file");
      const cccdFrontLink = await uploadSingleFile("cccd_front_file");
      const cccdBackLink = await uploadSingleFile("cccd_back_file");
      const profilePatch = {
        fullname: String(
          formData?.get("ho_ten") || session.fullname || "",
        ).trim(),
        ho_ten: String(
          formData?.get("ho_ten") || session.fullname || "",
        ).trim(),
        phone: String(
          formData?.get("so_dien_thoai") ||
            session.phone ||
            session.so_dien_thoai ||
            "",
        ).trim(),
        so_dien_thoai: String(
          formData?.get("so_dien_thoai") ||
            session.phone ||
            session.so_dien_thoai ||
            "",
        ).trim(),
        email: String(formData?.get("email") || session.email || "").trim(),
        address: String(
          formData?.get("dia_chi") || session.address || session.dia_chi || "",
        ).trim(),
        dia_chi: String(
          formData?.get("dia_chi") || session.address || session.dia_chi || "",
        ).trim(),
        company_name: String(
          formData?.get("ten_cong_ty") || session.company_name || "",
        ).trim(),
        ten_cong_ty: String(
          formData?.get("ten_cong_ty") || session.company_name || "",
        ).trim(),
        tax_code: String(
          formData?.get("ma_so_thue") || session.tax_code || "",
        ).trim(),
        ma_so_thue: String(
          formData?.get("ma_so_thue") || session.tax_code || "",
        ).trim(),
        company_address: String(
          formData?.get("dia_chi_cong_ty") || session.company_address || "",
        ).trim(),
        dia_chi_cong_ty: String(
          formData?.get("dia_chi_cong_ty") || session.company_address || "",
        ).trim(),
        link_avatar: avatarLink || session.link_avatar || "",
        link_cccd_truoc: cccdFrontLink || session.link_cccd_truoc || "",
        link_cccd_sau: cccdBackLink || session.link_cccd_sau || "",
      };

      if (localAuth && typeof localAuth.updateKrudUser === "function") {
        await localAuth.updateKrudUser(session.id, "customer", profilePatch);
      }

      const updatedUser = updateAuthStorage((currentUser) => ({
        ...currentUser,
        fullname: profilePatch.fullname,
        ho_ten: profilePatch.ho_ten,
        phone: profilePatch.phone,
        so_dien_thoai: profilePatch.so_dien_thoai,
        email: profilePatch.email,
        address: profilePatch.address,
        dia_chi: profilePatch.dia_chi,
        company_name: profilePatch.company_name,
        tax_code: profilePatch.tax_code,
        company_address: profilePatch.company_address,
        link_avatar: profilePatch.link_avatar,
        link_cccd_truoc: profilePatch.link_cccd_truoc,
        link_cccd_sau: profilePatch.link_cccd_sau,
      }));
      if (!updatedUser) {
        throw new Error("Không thể cập nhật hồ sơ trong chế độ cục bộ.");
      }
      return { status: "success", profile: updatedUser };
    }

    if (action === "change-password") {
      const formData = options.body;
      const currentPassword = String(formData?.get("mat_khau_hien_tai") || "");
      const newPassword = String(formData?.get("mat_khau_moi") || "");
      const remoteProfile = await fetchCurrentKrudCustomer(session).catch(
        () => null,
      );
      const localUsersKey = localAuth?.storageKeys?.users;
      const localUsers = localUsersKey ? readJson(localUsersKey, []) : [];
      const storedPassword = String(
        remoteProfile?.password ||
          remoteProfile?.mat_khau ||
          localUsers?.find(
            (item) => String(item.id || "") === String(session.id || ""),
          )?.password ||
          "",
      );

      if (storedPassword && storedPassword !== currentPassword) {
        throw new Error("Mật khẩu hiện tại không chính xác.");
      }

      if (localAuth && typeof localAuth.updateKrudUser === "function") {
        await localAuth.updateKrudUser(session.id, "customer", {
          password: newPassword,
          mat_khau: newPassword,
        });
      }

      const updatedUser = updateAuthStorage((currentUser) => {
        if (
          String(currentUser.password || currentUser.mat_khau || "") &&
          String(currentUser.password || currentUser.mat_khau || "") !==
            currentPassword
        ) {
          throw new Error("Mật khẩu hiện tại không chính xác.");
        }
        return {
          ...currentUser,
          password: newPassword,
          mat_khau: newPassword,
        };
      });
      if (!updatedUser) {
        throw new Error("Không thể đổi mật khẩu trong chế độ cục bộ.");
      }
      return { status: "success" };
    }

    if (action === "save-address") {
      const formData = options.body;
      const currentAddresses = getSavedAddresses(session.id);
      const addressId = String(formData?.get("dia_chi_id") || "").trim();
      const nextAddress = {
        id: addressId || `ADDR-${Date.now()}`,
        user_id: session.id,
        name: String(formData?.get("ten_goi_nho") || "").trim(),
        phone: String(formData?.get("so_dien_thoai") || "").trim(),
        address: String(formData?.get("dia_chi") || "").trim(),
        created_at: new Date().toISOString(),
        ten_goi_nho: String(formData?.get("ten_goi_nho") || "").trim(),
        so_dien_thoai: String(formData?.get("so_dien_thoai") || "").trim(),
        dia_chi: String(formData?.get("dia_chi") || "").trim(),
      };
      const filtered = currentAddresses.filter(
        (item) => String(item.id || "") !== String(addressId || ""),
      );
      filtered.unshift(nextAddress);
      saveAddressesForUser(session.id, filtered);
      return { status: "success" };
    }

    if (action === "delete-address") {
      const formData = options.body;
      const addressId = String(formData?.get("dia_chi_id") || "").trim();
      const currentAddresses = getSavedAddresses(session.id).filter(
        (item) => String(item.id || "") !== addressId,
      );
      saveAddressesForUser(session.id, currentAddresses);
      return { status: "success" };
    }

    throw new Error("Hành động portal cục bộ chưa được hỗ trợ.");
  }

  async function apiRequest(action, options = {}) {
    const data = await requestLocalData(action, options);
    if (!data || data.status !== "success") {
      throw new Error(data?.message || "Có lỗi xảy ra khi tải dữ liệu.");
    }
    return data;
  }

  async function getSessionData() {
    return apiRequest("session");
  }

  async function getOrderDetailData(orderId) {
    return apiRequest("order-detail", { params: { id: orderId } });
  }

  async function getOrderDetailDataWithAccess(orderId, sessionOverride = null) {
    return apiRequest("order-detail", {
      params: { id: orderId },
      sessionOverride,
    });
  }

  function getPageRoot() {
    return {
      shell: document.getElementById("customer-shell"),
      content: document.getElementById("customer-page-content"),
    };
  }

  function redirectNonCustomer(session, page) {
    const role = String(session?.role || "")
      .trim()
      .toLowerCase();
    if (!role || role === "customer") return false;

    if (role === "shipper") {
      const targetByPage = {
        dashboard: "../nha-cung-cap/dashboard-giaohang.html",
        orders: "../nha-cung-cap/don-hang-giaohang.html",
        profile: "../nha-cung-cap/ho-so-giaohang.html",
      };
      const target = targetByPage[page] || "../nha-cung-cap/dashboard-giaohang.html";
      window.location.replace(target);
      return true;
    }

    if (localAuth && typeof localAuth.getDashboardPath === "function") {
      window.location.replace(`../../${localAuth.getDashboardPath(role)}`);
      return true;
    }

    return false;
  }

  function getFirstName(user) {
    return String(user?.fullname || user?.username || "Khách hàng")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-1)[0];
  }

  function syncPublicHeader(user) {
    const loginItem = document.getElementById("nav-login-item");
    const registerItem = document.getElementById("nav-register-item");
    const firstName = escapeHtml(getFirstName(user) || "Khách hàng");
    const accountSummary = escapeHtml(
      String(user?.phone || "").trim() ||
        String(user?.email || "").trim() ||
        "Khu vực khách hàng",
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
          <li><a href="${routes.orders}"><i class="fas fa-box"></i> Danh sách đơn hàng</a></li>
          <li><a href="${routes.profile}"><i class="fas fa-user"></i> Hồ sơ cá nhân</a></li>
          <li class="customer-nav-logout-wrapper"><a href="${routes.logout}" class="customer-nav-logout" data-local-logout="1"><i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất</a></li>
        </ul>
      `;

      if (
        window.GiaoHangNhanhNavigation &&
        typeof window.GiaoHangNhanhNavigation.init === "function"
      ) {
        window.GiaoHangNhanhNavigation.init(loginItem);
      }
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
        <main class="customer-portal-main" id="customer-page-content"></main>
      </div>
    `;
    if (typeof core.bindPortalLogoutActions === "function") {
      core.bindPortalLogoutActions(shell, {
        localAuth,
        redirectUrl: getLoginRedirect(),
      });
    }
  }

  function renderLoading(message = "Đang tải dữ liệu...") {
    const { content } = getPageRoot();
    if (!content) return;
    content.innerHTML = `<div class="customer-state-card"><p>${escapeHtml(message)}</p></div>`;
  }

  function renderError(error) {
    const { shell, content } = getPageRoot();
    const target = content || shell;
    if (!target) return;

    target.innerHTML = `
      <div class="customer-state-card is-error">
        <h2>Không thể tải dữ liệu</h2>
        <p>${escapeHtml(error.message || "Đã xảy ra lỗi.")}</p>
        <button class="customer-btn customer-btn-primary" type="button" id="customer-retry-btn">Thử lại</button>
      </div>
    `;

    const retryBtn = document.getElementById("customer-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => window.location.reload());
    }
  }

  const createStatusBadge =
    typeof core.createStatusBadge === "function"
      ? (status, label) => core.createStatusBadge(status, label)
      : (status, label) =>
          `<span class="customer-status-badge status-${escapeHtml(status || "")}">${escapeHtml(label || status || "--")}</span>`;

  const getStatusBadge = createStatusBadge;

  function isOrderCancelable(order) {
    if (!order) return false;
    if (typeof order.can_cancel === "boolean") return order.can_cancel;
    return canCustomerCancelOrder(order);
  }

  function renderCancelButton(order, compact = false) {
    if (!isOrderCancelable(order)) return "";
    return `
      <button
        type="button"
        class="customer-btn customer-btn-danger ${compact ? "customer-btn-sm" : ""}"
        data-cancel-order-id="${escapeHtml(order.id)}"
        data-cancel-order-code="${escapeHtml(order.order_code || "")}"
      >
        Hủy đơn
      </button>
    `;
  }

  async function requestCancelOrder(orderId, orderCode) {
    const reason = await openCancelOrderDialog(orderCode || `#${orderId}`);
    if (reason === null) return false;

    const formData = new FormData();
    formData.append("order_id", orderId);
    if (reason.trim()) {
      formData.append("reason", reason.trim());
    }

    await apiRequest("cancel-order", {
      method: "POST",
      body: formData,
    });

    showToast("Đã hủy đơn hàng thành công.", "success");
    return true;
  }

  function bindCancelButtons(root = document) {
    root.querySelectorAll("[data-cancel-order-id]").forEach((button) => {
      if (button.dataset.cancelBound === "1") return;
      button.dataset.cancelBound = "1";
      button.addEventListener("click", async () => {
        const orderId = button.dataset.cancelOrderId;
        const orderCode = button.dataset.cancelOrderCode || "";
        try {
          const cancelled = await requestCancelOrder(orderId, orderCode);
          if (cancelled) {
            window.setTimeout(() => {
              window.location.reload();
            }, 600);
          }
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  }

  function buildPagination(currentPage, totalPages) {
    if (!totalPages || totalPages <= 1) return "";
    const buttons = [];
    const isCompactPagination = window.matchMedia("(max-width: 640px)").matches;

    const createLink = (page, label, active = false) => {
      const url = new URL(window.location.href);
      url.searchParams.set("page", page);
      return `<a href="${escapeHtml(url.search)}" class="customer-page-btn ${active ? "is-active" : ""}">${escapeHtml(label)}</a>`;
    };

    if (currentPage > 1) buttons.push(createLink(currentPage - 1, "Trước"));
    const pages = isCompactPagination
      ? (() => {
          if (totalPages <= 2)
            return Array.from({ length: totalPages }, (_, i) => i + 1);
          if (currentPage <= 1) return [1, 2];
          if (currentPage >= totalPages) return [totalPages - 1, totalPages];
          return [currentPage, currentPage + 1];
        })()
      : Array.from({ length: totalPages }, (_, i) => i + 1);
    pages.forEach((page) => {
      buttons.push(createLink(page, String(page), currentPage === page));
    });
    if (currentPage < totalPages)
      buttons.push(createLink(currentPage + 1, "Sau"));

    return `<div class="customer-pagination">${buttons.join("")}</div>`;
  }

  function renderFiles(items) {
    if (!items || !items.length) {
      return '<div class="customer-empty">Chưa có tệp nào được đính kèm.</div>';
    }

    return `<div class="customer-file-grid">${items
      .map(
        (item) => `
      <a class="customer-file-card" href="${escapeHtml(item.view_url || item.url)}" target="_blank" rel="noreferrer">
        <span>${escapeHtml(item.name)}</span>
        <small>${escapeHtml(item.extension || "tệp")}</small>
      </a>`,
      )
      .join("")}</div>`;
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

  function renderFeeBreakdownRows(breakdown, shippingFee) {
    const hasBreakdownData = [
      breakdown.base_price,
      breakdown.goods_fee,
      breakdown.time_fee,
      breakdown.condition_fee,
      breakdown.vehicle_fee,
      breakdown.cod_fee,
      breakdown.insurance_fee,
    ].some((value) => Number(value || 0) > 0);
    const baseFee =
      Number(breakdown.base_price || 0) > 0
        ? Number(breakdown.base_price || 0)
        : !hasBreakdownData && Number(shippingFee || 0) > 0
          ? Number(shippingFee || 0)
          : 0;
    const rows = [
      { label: "Phí vận chuyển", value: baseFee },
      { label: "Phụ phí loại hàng", value: Number(breakdown.goods_fee || 0) },
      { label: "Phụ phí khung giờ", value: Number(breakdown.time_fee || 0) },
      {
        label: "Phụ phí thời tiết",
        value: Number(breakdown.condition_fee || 0),
      },
      {
        label: "Điều chỉnh theo xe",
        value: Number(breakdown.vehicle_fee || 0),
      },
      { label: "Phí COD", value: Number(breakdown.cod_fee || 0) },
      {
        label: "Phí bảo hiểm",
        value: Number(breakdown.insurance_fee || 0),
      },
    ].filter((item) => item.value > 0);

    if (!rows.length && Number(shippingFee || 0) <= 0) {
      return `
        <div class="rv-row">
          <span class="rv-label">${escapeHtml("Chi tiết phí")}</span>
          <span class="rv-val">${escapeHtml("Chưa có dữ liệu")}</span>
        </div>
      `;
    }

    return rows
      .map(
        (item) => `
        <div class="rv-row">
          <span class="rv-label">${escapeHtml(item.label)}</span>
          <span class="rv-val">${formatCurrency(item.value)}</span>
        </div>`,
      )
      .join("");
  }

  function isImageExtension(extension) {
    return ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "heic"].includes(
      String(extension || "").toLowerCase(),
    );
  }

  function isVideoExtension(extension) {
    return ["mp4", "mov", "webm", "m4v", "avi", "mkv"].includes(
      String(extension || "").toLowerCase(),
    );
  }

  function renderOrderItemCards(items) {
    if (!items || !items.length) {
      return '<div class="customer-empty">Chưa có dữ liệu chi tiết mặt hàng.</div>';
    }

    return `<div class="customer-review-items">${items
      .map(
        (item, index) => `
      <article class="customer-review-item">
        <div class="customer-review-item-icon"><i class="fas fa-box"></i></div>
        <div class="customer-review-item-body">
          <strong>${escapeHtml(item.item_name || `Hàng hóa #${index + 1}`)}</strong>
          <span>
            Số lượng: <b>${formatNumber(item.quantity)}</b> ·
            Nặng: <b>${escapeHtml(item.weight)} kg</b> ·
            Khai giá: <b>${formatCurrency(item.declared_value)}</b>
          </span>
        </div>
        <div class="customer-review-item-meta">
          Kích thước<br />${escapeHtml(item.length)} x ${escapeHtml(item.width)} x ${escapeHtml(item.height)} cm
        </div>
      </article>`,
      )
      .join("")}</div>`;
  }

  function renderAttachmentPreview(items) {
    if (!items || !items.length) {
      return '<div class="customer-empty">Chưa có ảnh hoặc video đính kèm.</div>';
    }

    return `<div class="customer-review-media-grid">${items
      .map((item) => {
        const extension = String(item.extension || "").toLowerCase();
        const targetUrl = escapeHtml(item.view_url || item.url || "#");
        const previewUrl = escapeHtml(
          item.thumbnail_url || item.view_url || item.url || "#",
        );
        const name = escapeHtml(item.name || "Tệp đính kèm");

        if (isImageExtension(extension)) {
          return `
            <a class="customer-review-media-card" href="${targetUrl}" target="_blank" rel="noreferrer">
              <img class="customer-review-media-thumb" src="${previewUrl}" alt="${name}" />
              <div class="customer-review-media-meta">
                <strong>${name}</strong>
                <span>Ảnh đính kèm</span>
              </div>
            </a>`;
        }

        if (isVideoExtension(extension)) {
          return `
            <a class="customer-review-media-card" href="${targetUrl}" target="_blank" rel="noreferrer">
              <video class="customer-review-media-thumb" src="${previewUrl}" preload="metadata" controls></video>
              <div class="customer-review-media-meta">
                <strong>${name}</strong>
                <span>Video đính kèm</span>
              </div>
            </a>`;
        }

        return `
          <a class="customer-review-media-card" href="${targetUrl}" target="_blank" rel="noreferrer">
            <div class="customer-review-media-file">
              <i class="fas fa-file-lines"></i>
            </div>
            <div class="customer-review-media-meta">
              <strong>${name}</strong>
              <span>${escapeHtml(extension || "Tệp")}</span>
            </div>
          </a>`;
      })
      .join("")}</div>`;
  }

  function hasProviderInfo(provider) {
    return Boolean(
      provider?.shipper_id ||
      provider?.shipper_name ||
      provider?.fullname ||
      provider?.phone ||
      provider?.shipper_phone,
    );
  }

  function getProviderDisplayName(provider) {
    return (
      provider?.shipper_name || provider?.fullname || provider?.username || "--"
    );
  }

  function renderBookingReview(order, items, provider, logs) {
    const serviceMeta = order.service_meta || {};
    const attachments = Array.isArray(provider?.attachments)
      ? provider.attachments
      : [];
    const distanceLabel =
      Number(serviceMeta.distance_km || 0) > 0
        ? `${Number(serviceMeta.distance_km).toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} km`
        : serviceMeta.distance_label || "--";
    const pickupLabel = order.pickup_time
      ? formatDateTime(order.pickup_time)
      : serviceMeta.pickup_date || "--";

    return `
      <div class="customer-review-layout">
        <section class="customer-review-block">
          <h3><i class="fas fa-address-book"></i> Thông tin liên hệ</h3>
          <div class="rv-row"><span class="rv-label">Người gửi</span><span class="rv-val">${escapeHtml(order.sender_name || "--")} · ${escapeHtml(order.sender_phone || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Người nhận</span><span class="rv-val">${escapeHtml(order.receiver_name || "--")} · ${escapeHtml(order.receiver_phone || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Lấy hàng tại</span><span class="rv-val">${escapeHtml(order.pickup_address || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Giao hàng đến</span><span class="rv-val">${escapeHtml(order.delivery_address || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Khoảng cách</span><span class="rv-val">${distanceLabel}</span></div>
        </section>

        <section class="customer-review-block customer-review-block--wide">
          <h3><i class="fas fa-boxes-stacked"></i> Hàng hóa và đóng gói</h3>
          ${renderOrderItemCards(items)}
          <div class="rv-row"><span class="rv-label">Giá trị thu hộ (COD)</span><span class="rv-val">${order.cod_amount ? formatCurrency(order.cod_amount) : "Không có"}</span></div>
        </section>

        <section class="customer-review-block customer-review-block--wide">
          <h3><i class="fas fa-photo-film"></i> Ảnh/video khách đính kèm khi đặt đơn</h3>
          ${renderAttachmentPreview(attachments)}
        </section>

        <section class="customer-review-block customer-review-block--wide">
          <h3><i class="fas fa-note-sticky"></i> Ghi chú vận chuyển</h3>
          <div class="rv-row"><span class="rv-label">Ghi chú</span><span class="rv-val">${formatMultilineText(order.clean_note || "Không có")}</span></div>
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-calendar-check"></i> Lịch trình</h3>
          <div class="rv-row"><span class="rv-label">Tạo đơn lúc</span><span class="rv-val">${formatDateTime(order.created_at)}</span></div>
          <div class="rv-row"><span class="rv-label">Lấy hàng</span><span class="rv-val">${pickupLabel}</span></div>
          <div class="rv-row"><span class="rv-label">Thời gian giao dự kiến</span><span class="rv-val">${escapeHtml(serviceMeta.estimated_eta || "--")}</span></div>
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-receipt"></i> Chi phí</h3>
          ${renderFeeBreakdownRows(order.fee_breakdown || {}, order.shipping_fee)}
          <div class="rv-row"><span class="rv-label">Người trả cước</span><span class="rv-val">${escapeHtml(order.payer_label || "Người gửi")}</span></div>
          <div class="rv-row"><span class="rv-label">Thanh toán</span><span class="rv-val">${escapeHtml(order.payment_method_label || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Trạng thái thanh toán</span><span class="rv-val">${escapeHtml(order.payment_status_label || "--")}</span></div>
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-circle-info"></i> Theo dõi đơn</h3>
          <div class="rv-row"><span class="rv-label">Trạng thái hiện tại</span><span class="rv-val">${escapeHtml(order.status_label || order.status || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Mã đơn khách theo dõi</span><span class="rv-val">${escapeHtml(order.order_code || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Bằng chứng giao hàng</span><span class="rv-val">${order.pod_image ? "Đã có" : "Chưa có"}</span></div>
        </section>

        <section class="customer-review-block customer-review-block--wide">
          <h3><i class="fas fa-timeline"></i> Lịch sử xử lý</h3>
          <div class="customer-timeline">
            ${
              logs.length
                ? logs
                    .map(
                      (log) => `
                <article class="customer-timeline-item">
                  <strong>${escapeHtml(log.new_status_label)}</strong>
                  <span>${formatDateTime(log.created_at)}</span>
                  <p>${escapeHtml(log.note || `Cập nhật từ ${log.old_status_label} sang ${log.new_status_label}`)}</p>
                </article>`,
                    )
                    .join("")
                : '<div class="customer-empty">Chưa có lịch sử cập nhật trạng thái.</div>'
            }
          </div>
        </section>
      </div>`;
  }

  async function initDashboard() {
    renderLoading("Đang tải tổng quan khách hàng...");
    const params = new URLSearchParams(window.location.search);
    const recentStatus = params.get("recent_status") || "all";
    const data = await apiRequest("dashboard", {
      params: { recent_status: recentStatus },
    });

    const { content } = getPageRoot();
    const stats = data.stats || {};
    const recentOrders = Array.isArray(data.recent_orders)
      ? data.recent_orders
      : [];
    const totalOrders = Number(stats.total || 0);
    const shippingOrders = Number(stats.shipping || 0);
    const pendingOrders = Number(stats.pending || 0);
    const completedOrders = Number(stats.completed || 0);
    const activeOrders = pendingOrders + shippingOrders;
    const kpiCards = [
      {
        label: "Tổng đơn",
        value: formatNumber(totalOrders),
        hint: totalOrders ? "Toàn bộ đơn đã tạo" : "Chưa phát sinh đơn mới",
        className: "customer-kpi-card-total",
      },
      {
        label: "Cần theo dõi",
        value: formatNumber(activeOrders),
        hint: activeOrders
          ? "Đơn chờ xử lý hoặc đang giao"
          : "Không có đơn cần xử lý ngay",
        className:
          shippingOrders > 0
            ? "customer-kpi-card-shipping"
            : "customer-kpi-card-pending",
      },
      {
        label: "Đơn đã hoàn tất",
        value: formatNumber(completedOrders),
        hint: completedOrders ? "Đã giao thành công" : "Chưa có đơn hoàn tất",
        className: "customer-kpi-card-completed",
      },
    ];
    const heroState = shippingOrders
      ? `${formatNumber(shippingOrders)} đơn đang giao`
      : pendingOrders
        ? `${formatNumber(pendingOrders)} đơn chờ xử lý`
        : "Chưa có đơn cần theo dõi ngay";
    const recentOrdersPreview = recentOrders.slice(0, 3);
    const summaryText = activeOrders
      ? "Tập trung vào các đơn đang di chuyển hoặc còn chờ xác nhận để xử lý nhanh hơn."
      : totalOrders
        ? "Mọi đơn gần đây đang ở trạng thái ổn định. Bạn có thể mở lịch sử để xem lại chi tiết."
        : "Bạn chưa có đơn nào. Tạo đơn mới khi cần gửi hàng để bắt đầu theo dõi tại đây.";

    content.innerHTML = `
      <section class="customer-panel customer-panel-overview">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Tổng quan đơn hàng</p>
            <h2>Tóm tắt nhanh để theo dõi</h2>
            <p class="customer-panel-subtext">${escapeHtml(heroState)}. ${escapeHtml(summaryText)}</p>
          </div>
          <div class="customer-inline-actions">
            <span class="customer-panel-note">${activeOrders ? "Cần theo dõi" : "Ổn định"}</span>
            <a href="${routes.booking}" class="customer-btn customer-btn-primary" style="box-shadow: 0 4px 15px rgba(255, 122, 0, 0.3);">
              <i class="fas fa-plus"></i> Tạo Đơn Mới
            </a>
          </div>
        </div>
        <div class="customer-kpi-grid customer-kpi-grid-dashboard">
          ${kpiCards
            .map(
              (item) => `
            <article class="customer-kpi-card ${item.className || ""}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${item.value}</strong>
              <small>${escapeHtml(item.hint)}</small>
            </article>`,
            )
            .join("")}
          </div>
      </section>
      <section class="customer-panel customer-panel-orders customer-panel-orders-main">
          <div class="customer-panel-head customer-panel-head-dashboard">
            <div>
              <p class="customer-section-kicker">Đơn gần đây</p>
              <h2>Đơn gần nhất cần bạn theo dõi</h2>
              <p class="customer-panel-subtext">Giữ lại danh sách ngắn để bạn nhìn ra ngay đơn mới hoặc đơn vừa đổi trạng thái.</p>
            </div>
            
            <div class="customer-inline-actions customer-inline-actions-dashboard">
              <form action="${routes.orders}" method="GET" class="customer-quick-search">
                <input type="text" name="search" placeholder="Nhập mã đơn, SĐT..." required />
                <button type="submit" class="customer-btn customer-btn-primary customer-btn-sm" style="min-width: 44px; padding: 0;"><i class="fas fa-search"></i></button>
              </form>
              <a href="${routes.orders}" class="customer-btn customer-btn-ghost customer-btn-sm">Xem tất cả</a>
            </div>
          </div>
          <div class="customer-list customer-list-compact">
            ${
              recentOrdersPreview.length
                ? recentOrdersPreview
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
                      <p class="customer-order-route">Từ ${escapeHtml(order.pickup_address || "--")} đến ${escapeHtml(order.delivery_address || "--")}</p>
                    </div>
                    <div class="customer-order-side">
                      <div class="customer-order-price-block">
                        <span class="customer-order-price-label">Cước phí</span>
                        <strong class="customer-order-price">${formatCurrency(order.shipping_fee)}</strong>
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
                : '<div class="customer-empty">Chưa có đơn hàng nào trong bộ lọc này.</div>'
            }
          </div>
      </section>
    `;

    bindCancelButtons(content);
  }

  async function initOrders() {
    renderLoading("Đang tải lịch sử đơn hàng...");
    const params = new URLSearchParams(window.location.search);
    const requestParams = {
      search: params.get("search") || "",
      status: params.get("status") || "",
      date_from: params.get("date_from") || "",
      date_to: params.get("date_to") || "",
      page: params.get("page") || 1,
    };

    const data = await apiRequest("orders", { params: requestParams });
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
    if (filters.status)
      activeFilters.push(
        `Trạng thái: ${statusLabels[filters.status] || filters.status}`,
      );
    if (filters.date_from) activeFilters.push(`Từ ngày: ${filters.date_from}`);
    if (filters.date_to) activeFilters.push(`Đến ngày: ${filters.date_to}`);
    const currentPage = Number(pagination.page || 1);
    const totalPages = Number(pagination.total_pages || 1);
    const totalResults = Number(
      pagination.total_records || pagination.total || items.length || 0,
    );

    content.innerHTML = `
      <section class="customer-panel customer-orders-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Lịch sử đơn hàng</p>
            <h2>Tìm và lọc đơn</h2>
            <p class="customer-panel-subtext">Trang ${formatNumber(currentPage)}/${formatNumber(totalPages)} · ${formatNumber(totalResults)} đơn</p>
          </div>
        </div>

        <form id="customer-order-filter" class="customer-filter-form customer-filter-form-compact customer-filter-form-orders">
          <label class="customer-filter-field-search">
            <span>Tìm nhanh</span>
            <input type="text" name="search" value="${escapeHtml(filters.search || "")}" placeholder="Mã đơn, người nhận, SĐT" />
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
            <button type="submit" class="customer-btn customer-btn-primary">Lọc</button>
            <a href="${routes.orders}" class="customer-btn customer-btn-ghost">Đặt lại</a>
          </div>
        </form>

        <div class="customer-active-filters">
          ${
            activeFilters.length
              ? activeFilters
                  .map(
                    (item) =>
                      `<span class="customer-active-filter-text">${escapeHtml(item)}</span>`,
                  )
                  .join("")
              : '<span class="customer-active-filters-note">Đang hiển thị toàn bộ đơn.</span>'
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
                    <p class="customer-order-dest">${escapeHtml(order.pickup_address)} → ${escapeHtml(order.delivery_address)}</p>
                  </div>
                  <div class="customer-order-side">
                    <div class="customer-order-price-block">
                      <span class="customer-order-price-label">Cước phí</span>
                      <strong class="customer-order-price">${formatCurrency(order.shipping_fee)}</strong>
                    </div>
                    <div class="customer-order-actions customer-order-actions-compact">
                      ${renderCancelButton(order, true)}
                      <a class="customer-btn customer-btn-primary customer-btn-sm" href="${buildOrderDetailUrl(order)}">Xem chi tiết</a>
                    </div>
                  </div>
                </div>
                <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                  <span><b>Người nhận</b><span class="customer-order-meta-value">${escapeHtml(order.receiver_name || "Chưa cập nhật")}</span></span>
                  <span><b>COD</b><span class="customer-order-meta-value">${formatCurrency(order.cod_amount)}</span></span>
                  <span><b>Tạo</b><span class="customer-order-meta-value">${formatDateTime(order.created_at)}</span></span>
                </div>
              </article>`,
                  )
                  .join("")
              : '<div class="customer-empty">Không tìm thấy đơn hàng phù hợp.</div>'
          }
        </div>
        <div class="customer-pagination-wrap">
          ${buildPagination(currentPage, totalPages)}
        </div>
      </section>
    `;

    const filterForm = document.getElementById("customer-order-filter");
    if (filterForm) {
      filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(filterForm);
        const dateFrom = String(formData.get("date_from") || "").trim();
        const dateTo = String(formData.get("date_to") || "").trim();

        if (dateFrom && dateTo && dateFrom > dateTo) {
          showToast("Khoảng ngày lọc không hợp lệ.", "error");
          return;
        }

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

    bindCancelButtons(content);
  }

  async function initOrderDetail(sessionOverride = null) {
    renderLoading("Đang tải chi tiết đơn hàng...");
    const orderId = getDetailIdentifierFromUrl();

    if (!orderId) {
      throw new Error("Thiếu mã đơn hàng.");
    }

    const data = await getOrderDetailDataWithAccess(orderId, sessionOverride);
    const { content } = getPageRoot();
    const order = data.order || {};
    const provider = data.provider || {};
    const customer = data.customer || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const logs = Array.isArray(data.logs) ? data.logs : [];
    const providerDisplayName = hasProviderInfo(provider)
      ? getProviderDisplayName(provider)
      : "Chưa gán";
    const canSubmitFeedback =
      String(order.status || "").toLowerCase() === "completed";
    const feedbackSummary = order.rating
      ? `Đã đánh giá ${escapeHtml(order.rating)} sao${order.feedback ? ` · ${escapeHtml(order.feedback)}` : ""}`
      : "Chưa có phản hồi nào cho đơn này.";

    content.innerHTML = `
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Chi tiết đơn hàng</p>
            <h2>${escapeHtml(order.order_code || "--")}</h2>
          </div>
          <div class="customer-inline-actions">
            ${createStatusBadge(order.status, order.status_label)}
            ${renderCancelButton(order)}
            <a class="customer-btn customer-btn-primary" href="${routes.booking}">Tạo đơn mới</a>
            <a class="customer-btn customer-btn-ghost" href="${routes.orders}">Về lịch sử đơn</a>
          </div>
        </div>

        <div class="customer-detail-summary">
          <article><span>Gói dịch vụ</span><strong>${escapeHtml(order.service_label || "--")}</strong></article>
          <article><span>Tổng phí ship</span><strong>${formatCurrency(order.shipping_fee)}</strong></article>
          <article><span>Thu hộ COD</span><strong>${formatCurrency(order.cod_amount)}</strong></article>
          <article><span>Thanh toán</span><strong>${escapeHtml(order.payment_status_label || "--")}</strong></article>
          <article><span>Tạo đơn lúc</span><strong>${formatDateTime(order.created_at)}</strong></article>
          <article><span>Nhà cung cấp</span><strong>${escapeHtml(providerDisplayName)}</strong></article>
        </div>

        <div class="customer-tab-switcher" id="customer-tab-switcher">
          <button type="button" class="is-active" data-tab="booking">Thông tin đặt dịch vụ</button>
          <button type="button" data-tab="provider">Thông tin nhà cung cấp</button>
          <button type="button" data-tab="customer">Thông tin khách hàng</button>
        </div>

        <div class="customer-tab-panel is-active" data-panel="booking">
          ${renderBookingReview(order, items, provider, logs)}
        </div>

        <div class="customer-tab-panel" data-panel="provider">
          <div class="customer-detail-grid">
            <article class="customer-info-card">
              <h3>Thông tin nhà cung cấp</h3>
              ${
                hasProviderInfo(provider)
                  ? renderInfoList([
                      {
                        label: "Mã nhà cung cấp",
                        value:
                          provider.shipper_id || provider.provider_id || "--",
                      },
                      {
                        label: "Người phụ trách",
                        value: getProviderDisplayName(provider),
                      },
                      { label: "Tài khoản", value: provider.username || "--" },
                      {
                        label: "Số điện thoại",
                        value: provider.shipper_phone || provider.phone || "--",
                      },
                      { label: "Email", value: provider.email || "--" },
                      {
                        label: "Phương tiện",
                        value:
                          provider.shipper_vehicle ||
                          provider.vehicle_type ||
                          order.vehicle_type ||
                          "--",
                      },
                      {
                        label: "Khu vực phụ trách",
                        value:
                          provider.area_label ||
                          provider.region ||
                          provider.hub_label ||
                          provider.company_name ||
                          "--",
                      },
                      {
                        label: "Ghi chú từ shipper",
                        value:
                          order.shipper_note || "Chưa có ghi chú từ shipper.",
                      },
                    ])
                  : '<div class="customer-empty">Đơn hàng chưa được gán nhà cung cấp cụ thể.</div>'
              }
              ${order.pod_image ? `<div class="customer-media-preview"><img src="${escapeHtml(order.pod_image)}" alt="Bằng chứng giao hàng" /></div>` : ""}
            </article>

            <article class="customer-info-card">
              <h3>Tệp và bằng chứng</h3>
              <h4 class="customer-subheading">Tệp đính kèm của đơn hàng</h4>
              ${renderFiles(provider.attachments)}
              <h4 class="customer-subheading">Báo cáo quá trình làm việc</h4>
              ${renderAttachmentPreview(provider.shipper_reports)}
              <h4 class="customer-subheading">Media phản hồi đã gửi</h4>
              ${renderAttachmentPreview(provider.feedback_media)}
            </article>
          </div>

          <article class="customer-info-card">
            <h3>Phản hồi dịch vụ</h3>
            ${
              canSubmitFeedback
                ? `<form id="customer-feedback-form" class="customer-form-stack">
              <input type="hidden" name="order_id" value="${order.id}" />
              <div class="customer-form-grid">
                <label>
                  <span>Mức đánh giá</span>
                  <select name="rating" required>
                    <option value="">Chọn số sao</option>
                    ${[1, 2, 3, 4, 5]
                      .map(
                        (star) =>
                          `<option value="${star}" ${order.rating === star ? "selected" : ""}>${star} sao</option>`,
                      )
                      .join("")}
                  </select>
                </label>
                <label class="customer-form-full">
                  <span>Nội dung phản hồi</span>
                  <textarea name="feedback" rows="5" placeholder="Mô tả chất lượng phục vụ hoặc báo cáo vấn đề cho quản lý.">${escapeHtml(order.feedback || "")}</textarea>
                </label>
              </div>
              <div class="customer-media-actions">
                <label class="customer-btn customer-btn-ghost">
                  Chụp ảnh
                  <input type="file" id="feedback-capture-image" accept="image/*" capture="environment" hidden />
                </label>
                <label class="customer-btn customer-btn-ghost">
                  Quay video
                  <input type="file" id="feedback-capture-video" accept="video/*" capture="environment" hidden />
                </label>
                <label class="customer-btn customer-btn-ghost">
                  Tải ảnh/video
                  <input type="file" id="feedback-upload" accept="image/*,video/*" multiple hidden />
                </label>
              </div>
              <div class="customer-selected-files" id="customer-selected-files">Chưa chọn ảnh hoặc video phản hồi.</div>
              <div class="customer-inline-actions">
                <button class="customer-btn customer-btn-primary" type="submit">Gửi phản hồi</button>
              </div>
            </form>`
                : `<div class="customer-todo info">
              <p>Chỉ có thể gửi phản hồi khi đơn hàng đã hoàn tất.</p>
              <p class="customer-panel-subtext">${feedbackSummary}</p>
            </div>`
            }
          </article>
        </div>

        <div class="customer-tab-panel" data-panel="customer">
          <div class="customer-detail-grid">
            <article class="customer-info-card">
              <h3>Thông tin khách hàng</h3>
              ${renderInfoList([
                { label: "Họ tên", value: customer.fullname || "--" },
                { label: "Tài khoản", value: customer.username || "--" },
                { label: "Số điện thoại", value: customer.phone || "--" },
                { label: "Email", value: customer.email || "--" },
                { label: "Công ty", value: customer.company_name || "--" },
                { label: "Mã số thuế", value: customer.tax_code || "--" },
                {
                  label: "Địa chỉ công ty",
                  value: customer.company_address || "--",
                },
              ])}
            </article>
            <article class="customer-info-card">
              <h3>Thông tin hóa đơn / bổ sung</h3>
              ${renderInfoList([
                {
                  label: "Xuất hóa đơn",
                  value: customer.is_corporate ? "Có" : "Không",
                },
                {
                  label: "Tên đơn vị",
                  value: customer.invoice?.company_name || "--",
                },
                {
                  label: "Email nhận hóa đơn",
                  value: customer.invoice?.company_email || "--",
                },
                {
                  label: "Mã số thuế",
                  value: customer.invoice?.company_tax_code || "--",
                },
                {
                  label: "Địa chỉ",
                  value: customer.invoice?.company_address || "--",
                },
                {
                  label: "Tài khoản ngân hàng",
                  value: customer.invoice?.company_bank_info || "--",
                },
              ])}
            </article>
          </div>
        </div>
      </section>
    `;

    const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
    const tabPanels = Array.from(document.querySelectorAll("[data-panel]"));
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tab;
        tabButtons.forEach((item) =>
          item.classList.toggle("is-active", item === button),
        );
        tabPanels.forEach((panel) =>
          panel.classList.toggle("is-active", panel.dataset.panel === target),
        );
      });
    });

    const feedbackForm = document.getElementById("customer-feedback-form");
    if (feedbackForm) {
      const captureImage = document.getElementById("feedback-capture-image");
      const captureVideo = document.getElementById("feedback-capture-video");
      const uploadInput = document.getElementById("feedback-upload");
      const selectedFilesHost = document.getElementById("customer-selected-files");

      function refreshSelectedFiles() {
        if (!selectedFilesHost) return;
        const files = [];
        [captureImage, captureVideo, uploadInput].forEach((input) => {
          if (input && input.files) {
            Array.from(input.files).forEach((file) => files.push(file.name));
          }
        });
        selectedFilesHost.textContent = files.length
          ? `Đã chọn: ${files.join(", ")}`
          : "Chưa chọn ảnh hoặc video phản hồi.";
      }

      [captureImage, captureVideo, uploadInput].forEach((input) => {
        if (input) input.addEventListener("change", refreshSelectedFiles);
      });

      feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(feedbackForm);
        [captureImage, captureVideo, uploadInput].forEach((input) => {
          if (input && input.files) {
            Array.from(input.files).forEach((file) => formData.append("media_files[]", file));
          }
        });

        try {
          await apiRequest("submit-feedback", { method: "POST", body: formData });
          showToast("Đã gửi phản hồi thành công.", "success");
          window.location.reload();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }

    bindCancelButtons(content);
  }

  async function initProfile() {
    renderLoading("Đang tải hồ sơ cá nhân...");
    const data = await apiRequest("profile");
    const { content } = getPageRoot();
    const profile = data.profile || {};
    const stats = data.stats || {};

    const name = profile.ho_ten || profile.fullname || "Khách hàng";
    const phone = profile.so_dien_thoai || profile.phone || "Chưa cập nhật";
    const initial = getProfileInitial(name);
    const statusMeta = getProfileStatusMeta(profile);
    const createdAtLabel = profile.created_at ? formatDateTime(profile.created_at) : "Chưa có dữ liệu";
    const avatarSrc = resolveProfileMediaSource(profile.link_avatar || profile.avatar_name || profile.avatartenfile);
    const cccdFrontSrc = resolveProfileMediaSource(profile.link_cccd_truoc || profile.cccdmattruoctenfile);
    const cccdBackSrc = resolveProfileMediaSource(profile.link_cccd_sau || profile.cccdmatsautenfile);

    content.innerHTML = `
      <section class="customer-portal-profile customer-portal-profile-rich">
        <!-- HEADER HERO -->
        <div class="customer-profile-hero customer-profile-hero-rich">
          <div class="customer-profile-hero-main">
            <div class="customer-profile-avatar-wrapper customer-profile-avatar-wrapper-rich">
              ${avatarSrc ? `<img class="customer-profile-avatar-image" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(name)}" />` : `<div class="customer-profile-avatar-large">${initial}</div>`}
            </div>
            <div class="customer-profile-hero-info">
              <p class="customer-profile-eyebrow">Thành viên Giao Hàng Nhanh</p>
              <h2>${escapeHtml(name)}</h2>
              <div class="customer-profile-meta-list">
                <span><i class="fas fa-id-badge"></i> ${escapeHtml(profile.username || "Tài khoản khách")}</span>
                <span><i class="fas fa-clock"></i> Tham gia: ${escapeHtml(createdAtLabel)}</span>
              </div>
            </div>
          </div>
          <div class="customer-profile-hero-side">
            <span class="customer-profile-status-badge ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
            <p class="customer-profile-hero-note">${escapeHtml(statusMeta.note)}</p>
          </div>
        </div>

        <!-- 2. QUICK STATS SUMMARY -->
        <div class="customer-profile-summary">
          <article>
            <span>Tổng đơn hàng</span>
            <strong>${formatNumber(stats.total || 0)}</strong>
          </article>
          <article>
            <span>Đã hoàn tất</span>
            <strong>${formatNumber(stats.completed || 0)}</strong>
          </article>
          <article>
            <span>Tỷ lệ thành công</span>
            <strong>${stats.success_rate || (stats.total ? Math.round((stats.completed / stats.total) * 100) : 0)}%</strong>
          </article>
        </div>

        <div class="customer-profile-grid-container">
          <!-- LEFT COLUMN: MAIN CONTENT (Identity, Business, Media) -->
          <div class="customer-profile-col-main">
            <form id="customer-profile-form" enctype="multipart/form-data">
              <!-- 1. IDENTITY & CONTACT CARD -->
              <div class="customer-profile-card">
                <div class="customer-profile-section-title">
                  <i class="fas fa-address-card"></i>
                  <h3>Thông tin định danh & Liên hệ</h3>
                </div>
                
                <div class="customer-profile-form-grid" style="margin-top: 24px;">
                  <div class="customer-form-group">
                    <span>Họ và tên khách hàng</span>
                    <div class="customer-form-field">
                      <i class="fas fa-user"></i>
                      <input name="ho_ten" value="${escapeHtml(name)}" required />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Số điện thoại (Định danh)</span>
                    <div class="customer-form-field">
                      <i class="fas fa-phone-lock"></i>
                      <input name="so_dien_thoai" value="${escapeHtml(phone)}" readonly disabled />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Địa chỉ Email</span>
                    <div class="customer-form-field">
                      <i class="fas fa-envelope"></i>
                      <input name="email" type="email" value="${escapeHtml(profile.email || "")}" placeholder="name@example.com" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Địa chỉ liên hệ</span>
                    <div class="customer-form-field">
                      <i class="fas fa-map-location"></i>
                      <input name="dia_chi" value="${escapeHtml(profile.dia_chi || profile.address || "")}" placeholder="Số nhà, tên đường..." />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 2. BUSINESS INFO (COLLAPSIBLE) -->
              <div class="customer-profile-card customer-profile-accordion-item ${profile.ten_cong_ty ? "is-active" : ""}">
                <button type="button" class="customer-profile-accordion-header js-accordion-toggle">
                    <div class="customer-profile-section-title">
                        <i class="fas fa-building"></i>
                        <h3>Thông tin doanh nghiệp (Tùy chọn)</h3>
                    </div>
                    <i class="fas fa-chevron-down customer-profile-accordion-icon"></i>
                </button>
                
                <div class="customer-profile-accordion-body">
                    <div class="customer-profile-form-grid">
                      <div class="customer-form-group">
                        <span>Tên đơn vị / Công ty</span>
                        <div class="customer-form-field">
                          <i class="fas fa-building"></i>
                          <input name="ten_cong_ty" value="${escapeHtml(profile.ten_cong_ty || profile.company_name || "")}" placeholder="Dành cho xuất hóa đơn" />
                        </div>
                      </div>
                      <div class="customer-form-group">
                        <span>Mã số thuế</span>
                        <div class="customer-form-field">
                          <i class="fas fa-fingerprint"></i>
                          <input name="ma_so_thue" value="${escapeHtml(profile.ma_so_thue || profile.tax_code || "")}" placeholder="GST / Tax ID" />
                        </div>
                      </div>
                      <div class="customer-form-group" style="grid-column: span 2;">
                        <span>Địa chỉ xuất hóa đơn</span>
                        <div class="customer-form-field">
                          <i class="fas fa-receipt"></i>
                          <input name="dia_chi_cong_ty" value="${escapeHtml(profile.dia_chi_cong_ty || profile.company_address || "")}" placeholder="Địa chỉ chính thức của doanh nghiệp" />
                        </div>
                      </div>
                    </div>
                </div>
              </div>

              <!-- 3. VERIFICATION & MEDIA (COLLAPSIBLE) -->
              <div class="customer-profile-card customer-profile-accordion-item">
                <button type="button" class="customer-profile-accordion-header js-accordion-toggle">
                    <div class="customer-profile-section-title">
                        <i class="fas fa-shield-halved"></i>
                        <h3>Xác thực hồ sơ & Media</h3>
                    </div>
                    <i class="fas fa-chevron-down customer-profile-accordion-icon"></i>
                </button>
                
                <div class="customer-profile-accordion-body">
                    <div class="customer-profile-media-grid">
                       <article class="customer-profile-media-card">
                            <div class="customer-profile-media-head">
                              <strong>Avatar</strong>
                              <span>Định dạng: JPG, PNG</span>
                            </div>
                            <div class="customer-profile-media-preview">
                              <img id="customer-avatar-preview" src="${escapeHtml(avatarSrc || "")}" alt="Avatar" ${avatarSrc ? "" : "hidden"} />
                              <div id="customer-avatar-empty" class="customer-profile-media-empty" ${avatarSrc ? "hidden" : ""}>Chưa có ảnh đại diện</div>
                            </div>
                            <label class="customer-btn customer-btn-ghost customer-profile-upload-btn customer-btn-sm">
                              <input id="customer-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                              Thay đổi
                            </label>
                      </article>

                      <div class="customer-profile-form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
                          <article class="customer-profile-media-card">
                                <div class="customer-profile-media-head">
                                  <strong>CCCD Mặt trước</strong>
                                </div>
                                <div class="customer-profile-media-preview" style="min-height: 120px;">
                                  <img id="customer-cccd-front-preview" src="${escapeHtml(cccdFrontSrc || "")}" alt="CCCD Front" ${cccdFrontSrc ? "" : "hidden"} />
                                  <div id="customer-cccd-front-empty" class="customer-profile-media-empty" ${cccdFrontSrc ? "hidden" : ""}>Chưa tải lên</div>
                                </div>
                                <label class="customer-btn customer-btn-ghost customer-profile-upload-btn customer-btn-sm">
                                  <input id="customer-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                                  Tải lên
                                </label>
                          </article>

                          <article class="customer-profile-media-card">
                                <div class="customer-profile-media-head">
                                  <strong>CCCD Mặt sau</strong>
                                </div>
                                <div class="customer-profile-media-preview" style="min-height: 120px;">
                                  <img id="customer-cccd-back-preview" src="${escapeHtml(cccdBackSrc || "")}" alt="CCCD Back" ${cccdBackSrc ? "" : "hidden"} />
                                  <div id="customer-cccd-back-empty" class="customer-profile-media-empty" ${cccdBackSrc ? "hidden" : ""}>Chưa tải lên</div>
                                </div>
                                <label class="customer-btn customer-btn-ghost customer-profile-upload-btn customer-btn-sm">
                                  <input id="customer-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
                                  Tải lên
                                </label>
                          </article>
                      </div>
                    </div>
                </div>
              </div>

              <!-- SAVE ACTION CARD -->
              <div class="customer-profile-card">
                  <div style="margin-bottom: 20px;">
                      <h4 style="margin:0; color:#0c1e4b; font-size: 16px;">Cập nhật hồ sơ</h4>
                      <p style="margin:6px 0 0; font-size:13px; color: #64748b;">Đảm bảo mọi thông tin khách hàng là chính xác trước khi lưu.</p>
                  </div>
                  <button class="customer-btn customer-btn-primary" type="submit" id="customer-profile-submit-btn" style="width: auto; padding: 12px 32px;">
                    <i class="fas fa-cloud-arrow-up"></i> Lưu thay đổi
                  </button>
              </div>
            </form>
          </div>

          <!-- RIGHT COLUMN: SIDEBAR (Security & Activity) -->
          <div class="customer-profile-col-side">
            <!-- 5. SECURITY CARD -->
            <div class="customer-profile-card">
                <div class="customer-profile-section-title">
                  <i class="fas fa-lock"></i>
                  <h3>Bảo mật & Mật khẩu</h3>
                </div>
                <form id="customer-password-form" class="customer-form-stack" style="margin-top: 24px;">
                  <div class="customer-form-group">
                    <span>Mật khẩu hiện tại</span>
                    <div class="customer-form-field">
                      <i class="fas fa-key"></i>
                      <input name="mat_khau_hien_tai" type="password" required placeholder="••••••••" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Mật khẩu mới</span>
                    <div class="customer-form-field">
                      <i class="fas fa-lock"></i>
                      <input name="mat_khau_moi" type="password" minlength="8" required placeholder="Ít nhất 8 ký tự" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Xác nhận mật khẩu</span>
                    <div class="customer-form-field">
                      <i class="fas fa-check-double"></i>
                      <input name="xac_nhan_mat_khau_moi" type="password" minlength="8" required placeholder="Nhập lại mật khẩu mới" />
                    </div>
                  </div>
                  <button class="customer-btn customer-btn-ghost" type="submit" style="width: 100%; margin-top: 8px;">
                    Đổi mật khẩu
                  </button>
                </form>
            </div>

          </div>
        </div>
      </section>
    `;

    // Accordion Logic
    const accordionToggles = content.querySelectorAll(".js-accordion-toggle");
    accordionToggles.forEach(toggle => {
      toggle.addEventListener("click", () => {
        const item = toggle.closest(".customer-profile-accordion-item");
        item.classList.toggle("is-active");
      });
    });

    const profileForm = document.getElementById("customer-profile-form");
    if (profileForm) {
      bindProfileMediaPreview("customer-avatar-file", "customer-avatar-preview", "customer-avatar-empty");
      bindProfileMediaPreview("customer-cccd-front-file", "customer-cccd-front-preview", "customer-cccd-front-empty");
      bindProfileMediaPreview("customer-cccd-back-file", "customer-cccd-back-preview", "customer-cccd-back-empty");

      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = document.getElementById("customer-profile-submit-btn");
        try {
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
          }
          await apiRequest("update-profile", { method: "POST", body: new FormData(profileForm) });
          showToast("Đã cập nhật hồ sơ cá nhân thành công.", "success");
          window.setTimeout(() => window.location.reload(), 600);
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Lưu thay đổi';
          }
        }
      });
    }

    const passwordForm = document.getElementById("customer-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(passwordForm);
        if (formData.get("mat_khau_moi") !== formData.get("xac_nhan_mat_khau_moi")) {
          showToast("Mật khẩu xác nhận không khớp.", "error");
          return;
        }
        try {
          await apiRequest("change-password", { method: "POST", body: formData });
          showToast("Đã đổi mật khẩu thành công.", "success");
          passwordForm.reset();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }
  }

  async function init() {
    const page = document.body.dataset.customerPage;
    if (!page) return;

    if (page === "detail") {
      const session = await ensureUrlAccessSession();
      if (session && redirectNonCustomer(session, page)) return;
      syncPublicHeader(session || {});
      renderShell(session || {}, page);
      await initOrderDetail(session || null);
      return;
    }

    const sessionData = await getSessionData();
    if (redirectNonCustomer(sessionData.user, page)) return;
    syncPublicHeader(sessionData.user || {});
    renderShell(sessionData.user || {}, page);

    switch (page) {
      case "dashboard": await initDashboard(); break;
      case "orders": await initOrders(); break;
      case "detail": await initOrderDetail(); break;
      case "profile": await initProfile(); break;
      default: throw new Error("Trang không hợp lệ.");
    }
  }

  window.CustomerPortal = { init };
  document.addEventListener("DOMContentLoaded", () => {
    init().catch(renderError);
  });
})(window);
