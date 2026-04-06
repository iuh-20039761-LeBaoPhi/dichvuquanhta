(function (window, document) {
  if (window.__giaoHangNhanhStandaloneOrderDetailLoaded) return;
  window.__giaoHangNhanhStandaloneOrderDetailLoaded = true;

  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const core = window.GiaoHangNhanhCore || {};
  const storageKey = "ghn-customer-orders";
  const trackingHistoryKey = "trackingHistory";
  const krudOrdersTable = "giaohangnhanh_dat_lich";

  let currentDetail = null;
  let currentViewer = "public";
  let currentSession = null;

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
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

  const normalizeText =
    typeof core.normalizeText === "function"
      ? (value) => core.normalizeText(value)
      : (value) =>
          String(value || "")
            .replace(/\s+/g, " ")
            .trim();

  function normalizeMultilineText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .trim();
  }

  const formatCurrency =
    typeof core.formatCurrency === "function"
      ? (value) => core.formatCurrency(value)
      : (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

  const getPaymentMethodLabel =
    typeof core.getPaymentMethodLabel === "function"
      ? (value, fallback = "") => core.getPaymentMethodLabel(value, fallback)
      : (value, fallback = "") => fallback || value || "--";

  const getPaymentStatusLabel =
    typeof core.getPaymentStatusLabel === "function"
      ? (value, fallback = "") => core.getPaymentStatusLabel(value, fallback)
      : (value, fallback = "") => fallback || value || "Chưa hoàn tất";

  function formatOrderDateCode(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  function isSystemOrderCode(value) {
    return /^GHN-\d{8}-\d{7}$/i.test(String(value || "").trim());
  }

  function formatSystemOrderCode(orderId, createdAt = new Date()) {
    const numericId = Number(orderId);
    if (!Number.isFinite(numericId) || numericId <= 0) return String(orderId);
    const dateCode = formatOrderDateCode(createdAt);
    return `GHN-${dateCode}-${String(Math.trunc(Math.abs(numericId))).padStart(7, "0")}`;
  }

  function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

  const showToast =
    core && typeof core.showToast === "function"
      ? (message, type = "info") => core.showToast(message, type)
      : (message) => window.alert(message);

  function getRoot() {
    return document.getElementById("standalone-order-detail-root");
  }

  function getTrackingHistory() {
    const list = readJson(trackingHistoryKey, []);
    return Array.isArray(list) ? list : [];
  }

  function getSession() {
    if (!localAuth || typeof localAuth.getSession !== "function") return null;
    const session = localAuth.getSession();
    return session && typeof session === "object" ? session : null;
  }

  async function ensureUrlAuth() {
    const session = getSession();
    if (session) return session;

    if (!localAuth || typeof localAuth.login !== "function") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const username = normalizeText(params.get("username") || "");
    const password = String(params.get("password") || "");
    if (!username || !password) return null;

    try {
      const result = await localAuth.login({
        loginIdentifier: username,
        password,
      });
      if (result && result.status === "success") {
        return result.user || getSession();
      }
    } catch (error) {
      console.error("URL auth failed:", error);
    }

    return getSession();
  }

  function getMilestones(order) {
    return {
      cancelledAt: normalizeText(
        order.ngayhuy ||
          order.cancelled_at ||
          order.cancel_time ||
          order.cancelledAt,
      ),
      acceptedAt: normalizeText(
        order.thoidiemnhandon ||
          order.ngaynhan ||
          order.accepted_at ||
          order.acceptedAt,
      ),
      startedAt: normalizeText(
        order.ngaybatdauthucte || order.started_at || order.startedAt,
      ),
      completedAt: normalizeText(
        order.ngayhoanthanhthucte || order.completed_at || order.completedAt,
      ),
    };
  }

  function deriveStatusKey(order) {
    const milestones = getMilestones(order);
    if (milestones.cancelledAt) return "cancelled";
    if (milestones.completedAt) return "completed";
    if (milestones.startedAt) return "shipping";

    const normalizedStatus = String(order.status || "")
      .trim()
      .toLowerCase();
    if (["cancelled", "canceled"].includes(normalizedStatus))
      return "cancelled";
    if (["completed", "delivered", "success"].includes(normalizedStatus))
      return "completed";
    if (["shipping", "in_transit"].includes(normalizedStatus))
      return "shipping";
    return "pending";
  }

  function getStatusLabel(order) {
    const milestones = getMilestones(order);
    if (milestones.cancelledAt) return "Đã hủy";
    if (milestones.completedAt) return "Hoàn thành";
    if (milestones.startedAt) return "Đang giao";
    if (milestones.acceptedAt) return "Đã nhận đơn";
    const normalizedStatus = String(order.status || "")
      .trim()
      .toLowerCase();
    if (["cancelled", "canceled"].includes(normalizedStatus)) return "Đã hủy";
    if (["completed", "delivered", "success"].includes(normalizedStatus))
      return "Hoàn thành";
    if (["shipping", "in_transit"].includes(normalizedStatus))
      return "Đang giao";
    return "Chưa xử lý";
  }

  const getStatusBadge =
    typeof core.createStatusBadge === "function"
      ? (status, label) => core.createStatusBadge(status, label)
      : (status, label) =>
          `<span class="customer-status-badge status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;

  function normalizeBreakdown(rawBreakdown, shippingFee) {
    const breakdown = rawBreakdown || {};
    return {
      base_price: Number(
        breakdown.base_price ??
          breakdown.tong_gia_van_chuyen ??
          breakdown.basePrice ??
          0,
      ),
      goods_fee: Number(
        breakdown.goods_fee ??
          breakdown.phu_phi_loai_hang ??
          breakdown.goodsFee ??
          0,
      ),
      time_fee: Number(
        breakdown.time_fee ??
          breakdown.phu_phi_khung_gio ??
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
      insurance_fee: Number(
        breakdown.insurance_fee ?? breakdown.insuranceFee ?? 0,
      ),
      cod_fee: Number(breakdown.cod_fee ?? breakdown.codFee ?? 0),
      total_fee: Number(
        breakdown.total_fee ?? breakdown.totalFee ?? shippingFee ?? 0,
      ),
    };
  }

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        ten_hang: item.ten_hang || item.item_name || "",
        loai_hang: item.loai_hang || item.item_type || "",
        so_luong: Number(item.so_luong ?? item.quantity ?? 1),
        can_nang: Number(item.can_nang ?? item.weight ?? 0),
        gia_tri_khai_bao: Number(
          item.gia_tri_khai_bao ?? item.declared_value ?? 0,
        ),
        ghi_chu_dong_goi:
          item.ghi_chu_dong_goi || item.packing_note || item.note || "",
      }));
  }

  function pickFirstText(...values) {
    for (const value of values) {
      const normalized = normalizeText(value);
      if (normalized) return normalized;
    }
    return "";
  }

  function getProviderSnapshotFromSession(session, existingProvider) {
    const provider =
      existingProvider && typeof existingProvider === "object"
        ? { ...existingProvider }
        : {};
    if (!session) return provider;

    return {
      ...provider,
      shipper_id:
        provider.shipper_id ||
        provider.provider_id ||
        session.id ||
        session.username ||
        "",
      provider_id:
        provider.provider_id ||
        provider.shipper_id ||
        session.id ||
        session.username ||
        "",
      shipper_name:
        provider.shipper_name ||
        provider.fullname ||
        session.fullname ||
        session.ho_ten ||
        session.username ||
        "",
      fullname:
        provider.fullname ||
        provider.shipper_name ||
        session.fullname ||
        session.ho_ten ||
        "",
      shipper_phone:
        provider.shipper_phone ||
        provider.phone ||
        session.phone ||
        session.so_dien_thoai ||
        "",
      phone:
        provider.phone ||
        provider.shipper_phone ||
        session.phone ||
        session.so_dien_thoai ||
        "",
      email: provider.email || session.email || "",
      shipper_address: pickFirstText(
        provider.shipper_address,
        provider.address,
        provider.dia_chi,
        provider.company_address,
        provider.full_address,
        session.shipper_address,
        session.address,
        session.dia_chi,
        session.company_address,
      ),
      address: pickFirstText(
        provider.address,
        provider.shipper_address,
        provider.dia_chi,
        provider.company_address,
        provider.full_address,
        session.address,
        session.shipper_address,
        session.dia_chi,
        session.company_address,
      ),
      shipper_vehicle:
        provider.shipper_vehicle ||
        provider.vehicle_type ||
        session.vehicle_type ||
        session.shipper_vehicle ||
        "Xe máy",
      vehicle_type:
        provider.vehicle_type ||
        provider.shipper_vehicle ||
        session.vehicle_type ||
        session.shipper_vehicle ||
        "Xe máy",
      bien_so:
        provider.bien_so ||
        provider.license_plate ||
        session.bien_so ||
        session.license_plate ||
        "",
    };
  }

  function normalizeDetail(detail) {
    const order =
      detail?.order && typeof detail.order === "object"
        ? { ...detail.order }
        : {};
    const provider =
      detail?.provider && typeof detail.provider === "object"
        ? { ...detail.provider }
        : {};
    const customer =
      detail?.customer && typeof detail.customer === "object"
        ? { ...detail.customer }
        : {};
    const items = normalizeItems(detail?.items || []);
    const logs = Array.isArray(detail?.logs) ? detail.logs : [];
    const feedbackMedia = Array.isArray(provider.feedback_media)
      ? provider.feedback_media
      : [];
    const shipperReports = Array.isArray(provider.shipper_reports)
      ? provider.shipper_reports
      : [];

    order.id = normalizeText(order.id || detail?.krud_id || "");
    order.krud_id = normalizeText(
      order.krud_id || detail?.krud_id || order.id || "",
    );

    // Ensure order_code is in proper GHN format
    if (!isSystemOrderCode(order.order_code)) {
      order.order_code = formatSystemOrderCode(order.id, order.created_at);
    }

    order.created_at = order.created_at || new Date().toISOString();
    order.cancel_reason = normalizeText(
      order.cancel_reason || order.ly_do_huy || "",
    );
    order.shipping_fee = Number(order.shipping_fee || order.total_fee || 0);
    order.cod_amount = Number(order.cod_amount || order.cod_value || 0);

    // Chuẩn hóa nhãn thanh toán
    order.payment_method_label = getPaymentMethodLabel(
      order.payment_method ||
        order.phuong_thuc_thanh_toan ||
        order.payment_method_label,
      order.payment_method_label,
    );

    order.rating = Number(order.rating || order.danh_gia_so_sao || 0);
    order.feedback = normalizeMultilineText(
      order.feedback || order.phan_hoi || "",
    );
    order.shipper_note = normalizeMultilineText(
      order.shipper_note || order.ghi_chu_shipper || "",
    );
    order.fee_breakdown = normalizeBreakdown(
      order.fee_breakdown || order.pricing_breakdown || {},
      order.shipping_fee,
    );
    order.pricing_breakdown = order.fee_breakdown;
    order.status = deriveStatusKey(order);
    order.status_label = getStatusLabel(order);
    order.payment_status_label = getPaymentStatusLabel(
      order.payment_status ||
        order.trang_thai_thanh_toan ||
        order.payment_status_label,
      order.status === "completed" ? "Đã hoàn tất" : "Chưa hoàn tất",
    );

    return {
      order,
      provider: {
        ...provider,
        feedback_media: feedbackMedia,
        shipper_reports: shipperReports,
      },
      customer,
      items,
      logs,
      source: detail?.source || "local",
    };
  }

  function getAllLocalDetails() {
    return (readJson(storageKey, []) || []).map(normalizeDetail);
  }

  function findLocalDetail(identifier) {
    const normalizedIdentifier = normalizeText(identifier).toUpperCase();
    const target = getAllLocalDetails().find((detail) => {
      const orderCode = normalizeText(detail.order.order_code).toUpperCase();
      const orderId = normalizeText(detail.order.id).toUpperCase();
      return (
        orderCode === normalizedIdentifier || orderId === normalizedIdentifier
      );
    });

    return target || null;
  }

  function persistLocalDetail(detail) {
    const normalized = normalizeDetail(detail);
    const orderKey = normalizeText(
      normalized.order.order_code || normalized.order.id,
    ).toUpperCase();
    const current = readJson(storageKey, []);
    const list = Array.isArray(current) ? current : [];
    const next = list.filter((item) => {
      const itemOrder = item?.order || {};
      const itemKey = normalizeText(
        itemOrder.order_code || itemOrder.id || "",
      ).toUpperCase();
      return itemKey !== orderKey;
    });
    next.unshift(normalized);
    writeJson(storageKey, next);
    return normalized;
  }

  const getKrudListFn =
    typeof core.getKrudListFn === "function"
      ? () => core.getKrudListFn()
      : () => {
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
        };

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

  const extractRows =
    typeof core.extractRows === "function"
      ? (payload, depth = 0) => core.extractRows(payload, depth)
      : function extractRowsFallback(payload, depth = 0) {
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
            const nested = extractRowsFallback(value, depth + 1);
            if (nested.length) return nested;
          }

          return [];
        };

  async function findKrudRecord(identifier) {
    const listFn = getKrudListFn();
    if (!listFn) return null;

    const response = await listFn({
      table: krudOrdersTable,
      page: 1,
      limit: 500,
    });

    const normalizedIdentifier = normalizeText(identifier).toUpperCase();
    const rows = extractRows(response);
    const record = rows.find((row) => {
      const code = normalizeText(
        row.ma_don_hang_noi_bo || row.ma_don_hang || row.order_code || row.id,
      ).toUpperCase();
      const rowId = normalizeText(row.id).toUpperCase();
      return code === normalizedIdentifier || rowId === normalizedIdentifier;
    });

    return record || null;
  }

  function buildDetailFromKrudRecord(record) {
    const shippingFee = Number(
      record.tong_cuoc ??
        record.shipping_fee ??
        record.total_fee ??
        record.phi_van_chuyen ??
        0,
    );
    const items = normalizeItems(
      parseJsonSafe(
        record.mat_hang_json || record.items_json || record.items || [],
        [],
      ),
    );
    const breakdown = normalizeBreakdown(
      parseJsonSafe(
        record.chi_tiet_gia_cuoc_json ||
          record.chi_tiet_gia_json ||
          record.pricing_breakdown ||
          {},
        {},
      ),
      shippingFee,
    );

    return normalizeDetail({
      source: "krud",
      order: {
        id: record.id || record.ma_don_hang_noi_bo || record.ma_don_hang || "",
        krud_id: record.id || "",
        order_code:
          record.ma_don_hang_noi_bo ||
          record.ma_don_hang ||
          record.order_code ||
          record.id ||
          "",
        created_at: record.created_at || record.created_date || "",
        sender_name: record.ho_ten_nguoi_gui || record.nguoi_gui_ho_ten || "",
        sender_phone:
          record.so_dien_thoai_nguoi_gui ||
          record.nguoi_gui_so_dien_thoai ||
          "",
        receiver_name:
          record.ho_ten_nguoi_nhan || record.nguoi_nhan_ho_ten || "",
        receiver_phone:
          record.so_dien_thoai_nguoi_nhan ||
          record.nguoi_nhan_so_dien_thoai ||
          "",
        pickup_address: record.dia_chi_lay_hang || "",
        delivery_address: record.dia_chi_giao_hang || "",
        service_name: record.ten_dich_vu || record.service_label || "",
        service_label: record.ten_dich_vu || record.service_label || "",
        vehicle_type:
          record.ten_phuong_tien ||
          record.vehicle_type ||
          record.phuong_tien ||
          "",
        khoang_cach_km: Number(
          record.khoang_cach_km || record.distance_km || 0,
        ),
        shipping_fee: shippingFee,
        cod_amount: Number(
          record.gia_tri_thu_ho_cod ||
            record.cod_amount ||
            record.cod_value ||
            0,
        ),
        payment_method_label:
          record.payment_method_label ||
          record.phuong_thuc_thanh_toan ||
          "Tiền mặt",
        payment_method:
          record.payment_method || record.phuong_thuc_thanh_toan || "",
        payment_status_label: getPaymentStatusLabel(
          record.payment_status_label || record.trang_thai_thanh_toan,
          "Chưa hoàn tất",
        ),
        clean_note: record.ghi_chu || record.clean_note || "",
        cancel_reason: record.ly_do_huy || record.cancel_reason || "",
        rating: Number(record.danh_gia_so_sao || record.rating || 0),
        feedback: record.phan_hoi || record.feedback || "",
        shipper_note: record.ghi_chu_shipper || record.shipper_note || "",
        fee_breakdown: breakdown,
        pod_image: record.pod_image || record.anh_xac_nhan_giao_hang || "",
        ngayhuy: record.ngayhuy || "",
        thoidiemnhandon: record.thoidiemnhandon || record.ngaynhan || "",
        ngaynhan: record.ngaynhan || record.thoidiemnhandon || "",
        ngaybatdauthucte: record.ngaybatdauthucte || "",
        ngayhoanthanhthucte: record.ngayhoanthanhthucte || "",
        status: record.trang_thai || record.status || "pending",
      },
      provider: {
        shipper_id: record.ncc_id || record.shipper_id || "",
        shipper_name: record.nha_cung_cap_ho_ten || record.shipper_name || "",
        shipper_phone:
          record.nha_cung_cap_so_dien_thoai || record.shipper_phone || "",
        email: record.ncc_email || "",
        shipper_address: pickFirstText(
          record.ncc_dia_chi,
          record.shipper_address,
          record.dia_chi_nha_cung_cap,
          record.address,
          record.company_address,
          record.area_label,
          record.region,
          record.hub_label,
          record.company_name,
        ),
        address: pickFirstText(
          record.address,
          record.shipper_address,
          record.ncc_dia_chi,
          record.dia_chi_nha_cung_cap,
          record.company_address,
        ),
        vehicle_type: record.shipper_vehicle || record.vehicle_type || "",
        shipper_vehicle: record.shipper_vehicle || record.vehicle_type || "",
        bien_so: record.bien_so || "",
        shipper_reports: parseJsonSafe(
          record.shipper_reports_json || record.shipper_reports || [],
          [],
        ),
        feedback_media: parseJsonSafe(
          record.feedback_media_json || record.feedback_media || [],
          [],
        ),
      },
      customer: {
        fullname: record.ho_ten_nguoi_gui || record.nguoi_gui_ho_ten || "",
        phone:
          record.so_dien_thoai_nguoi_gui ||
          record.nguoi_gui_so_dien_thoai ||
          "",
      },
      items,
      logs: [
        {
          created_at: record.created_at || "",
          old_status_label: "Khởi tạo",
          new_status_label: "Đơn hàng",
          note:
            normalizeText(record.ghi_chu_quan_tri || record.admin_note) ||
            "Đơn hàng được tải trực tiếp từ dữ liệu hệ thống.",
        },
      ],
    });
  }

  async function findKrudDetail(identifier) {
    const record = await findKrudRecord(identifier);
    return record ? buildDetailFromKrudRecord(record) : null;
  }

  function getCurrentIdentifier() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("madonhang") || params.get("code") || params.get("id") || ""
    );
  }

  function getViewer(session) {
    const params = new URLSearchParams(window.location.search);
    if (session && session.role === "shipper") return "shipper";
    if (session && session.role === "admin") return "admin";
    if (session) return "customer";
    return (
      normalizeText(params.get("viewer") || "public").toLowerCase() || "public"
    );
  }

  function canCancel(order, viewer) {
    const milestones = getMilestones(order);
    return (
      viewer === "customer" &&
      !milestones.cancelledAt &&
      !milestones.acceptedAt &&
      !milestones.completedAt
    );
  }

  function getShipperAction(order, viewer) {
    if (viewer !== "shipper") return "";
    const milestones = getMilestones(order);
    const status = deriveStatusKey(order);
    if (status === "cancelled" || status === "completed") return "";
    if (status === "shipping") return "complete";
    if (!milestones.acceptedAt) return "accept";
    if (!milestones.startedAt) return "start";
    if (!milestones.completedAt) return "complete";
    return "";
  }

  function buildActionButtons(detail, viewer) {
    const order = detail.order || {};
    const buttons = [];

    if (canCancel(order, viewer)) {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-danger" data-order-action="cancel">Hủy đơn</button>',
      );
    }

    const shipperAction = getShipperAction(order, viewer);
    if (shipperAction === "accept") {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-primary" data-order-action="accept">Nhận đơn</button>',
      );
    }
    if (shipperAction === "start") {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-primary" data-order-action="start">Bắt đầu</button>',
      );
    }
    if (shipperAction === "complete") {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-primary" data-order-action="complete">Hoàn thành</button>',
      );
    }

    if (viewer === "customer") {
      buttons.push(
        '<a href="public/khach-hang/lich-su-don-hang.html" class="customer-btn customer-btn-ghost">Về lịch sử đơn</a>',
      );
    } else if (viewer === "shipper") {
      buttons.push(
        '<a href="public/nha-cung-cap/don-hang.html" class="customer-btn customer-btn-ghost">Về danh sách đơn</a>',
      );
    } else {
      buttons.push(
        '<a href="tra-don-hang.html" class="customer-btn customer-btn-ghost">Tra đơn khác</a>',
      );
    }

    return buttons.join("");
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

  function getMediaExtension(item) {
    const direct = normalizeText(item?.extension || "").toLowerCase();
    if (direct) return direct;

    const url = normalizeText(item?.url || "");
    if (!url) return "";
    const cleanUrl = url.split("?")[0].split("#")[0];
    const parts = cleanUrl.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function getOrderMediaUploadUrl() {
    return new URL(
      "admin-giaohang/api/order_media_upload.php",
      window.location.href,
    ).toString();
  }

  async function uploadOrderMedia(orderRef, files, mediaType) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return [];

    const normalizedOrderRef = normalizeText(orderRef || "");
    if (!normalizedOrderRef) {
      throw new Error("Không tìm thấy mã đơn để tải media lên máy chủ.");
    }

    const formData = new FormData();
    formData.append("order_code", normalizedOrderRef);
    formData.append("media_type", normalizeText(mediaType || "general"));
    list.forEach((file) => {
      formData.append("media_files[]", file, file.name || "media");
    });

    const response = await fetch(getOrderMediaUploadUrl(), {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.message || "Không thể tải media lên máy chủ lúc này.",
      );
    }

    return (Array.isArray(payload.items) ? payload.items : []).map((item) => ({
      id: normalizeText(item.id || ""),
      name: normalizeText(item.name || "Tệp đính kèm"),
      extension: getMediaExtension(item),
      url: normalizeText(item.url || ""),
      created_at: normalizeText(item.created_at || new Date().toISOString()),
    }));
  }

  function syncPodFromShipperReports(detail) {
    const normalized = normalizeDetail(detail);
    const order = { ...(normalized.order || {}) };
    if (
      deriveStatusKey(order) !== "completed" ||
      normalizeText(order.pod_image)
    ) {
      return normalized;
    }

    const reports = Array.isArray(normalized.provider?.shipper_reports)
      ? normalized.provider.shipper_reports
      : [];
    const podCandidate = reports.find((item) => {
      const extension = getMediaExtension(item);
      return isImageExtension(extension) && hasPreviewableUrl(item?.url || "");
    });

    if (!podCandidate) return normalized;

    order.pod_image = normalizeText(podCandidate.url || "");
    return {
      ...normalized,
      order,
    };
  }

  function getMediaItems(detail) {
    const order = detail.order || {};
    const items = [];

    if (normalizeText(order.pod_image)) {
      const url = normalizeText(order.pod_image);
      items.push({
        url,
        name: "Bằng chứng giao hàng",
        extension: url.split(".").pop() || "jpg",
      });
    }

    return items;
  }

  function renderMedia(detail) {
    const items = getMediaItems(detail);
    if (!items.length) {
      return '<div class="standalone-order-muted">Chưa có ảnh POD cho đơn hàng này.</div>';
    }

    return `<div class="standalone-order-media-grid">${items
      .map((item) => {
        const url = escapeHtml(item.url);
        const name = escapeHtml(item.name);
        const extension = String(item.extension || "").toLowerCase();

        if (isImageExtension(extension)) {
          return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <img src="${url}" alt="${name}" />
              <strong>${name}</strong>
              <span>Ảnh đính kèm</span>
            </a>
          `;
        }

        if (isVideoExtension(extension)) {
          return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <video src="${url}" controls preload="metadata"></video>
              <strong>${name}</strong>
              <span>Video đính kèm</span>
            </a>
          `;
        }

        return `
          <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
            <div class="standalone-order-item-icon">
              <i class="fa-solid fa-file-lines"></i>
            </div>
            <strong>${name}</strong>
            <span>Tệp đính kèm</span>
          </a>
        `;
      })
      .join("")}</div>`;
  }

  function hasPreviewableUrl(url) {
    const normalized = normalizeText(url);
    return Boolean(normalized && normalized !== "#");
  }

  const orderDetailActionsFactory = window.GiaoHangNhanhOrderDetailActions;
  if (typeof orderDetailActionsFactory !== "function") {
    throw new Error("Không tìm thấy action handler cho trang chi tiết đơn hàng.");
  }

  const orderDetailRendererFactory = window.GiaoHangNhanhOrderDetailRender;
  if (typeof orderDetailRendererFactory !== "function") {
    throw new Error("Không tìm thấy renderer cho trang chi tiết đơn hàng.");
  }

  let render = null;
  let renderState = null;
  const orderDetailActions = orderDetailActionsFactory({
    normalizeMultilineText,
    normalizeDetail,
    uploadOrderMedia,
    showToast,
    buildShipperSnapshot,
    persistDetail,
    getCurrentDetail: () => currentDetail,
    setCurrentDetail: (detail) => {
      currentDetail = detail;
    },
    getCurrentViewer: () => currentViewer,
    getCurrentSession: () => currentSession,
    rerender: () => {
      if (typeof render === "function") {
        render(currentDetail, currentViewer, currentSession);
      }
    },
  });
  ({ render, renderState } = orderDetailRendererFactory({
    getRoot,
    escapeHtml,
    formatCurrency,
    formatDateTime,
    normalizeText,
    normalizeMultilineText,
    getMilestones,
    deriveStatusKey,
    buildActionButtons,
    pickFirstText,
    isImageExtension,
    isVideoExtension,
    hasPreviewableUrl,
    bindFeedbackForm: orderDetailActions.bindFeedbackForm,
    bindShipperNoteForm: orderDetailActions.bindShipperNoteForm,
    handleActionClick,
  }));

  function appendLog(detail, payload) {
    const nextDetail = normalizeDetail(detail);
    nextDetail.logs = [
      {
        old_status_label:
          payload.oldStatusLabel || nextDetail.order.status_label,
        new_status_label:
          payload.newStatusLabel || nextDetail.order.status_label,
        created_at: payload.createdAt,
        note: payload.note,
      },
      ...(Array.isArray(nextDetail.logs) ? nextDetail.logs : []),
    ];
    return nextDetail;
  }

  function buildShipperSnapshot(detail) {
    const provider =
      detail?.provider && typeof detail.provider === "object"
        ? { ...detail.provider }
        : {};

    if (!currentSession || currentSession.role !== "shipper") {
      return provider;
    }

    return getProviderSnapshotFromSession(currentSession, provider);
  }

  function sanitizeMediaItemsForPersist(items) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const rawUrl = normalizeText(item.url || "");
        return {
          id: normalizeText(item.id || ""),
          name: normalizeText(item.name || "Tệp đính kèm"),
          extension: normalizeText(item.extension || ""),
          url:
            rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")
              ? ""
              : rawUrl,
          created_at: normalizeText(item.created_at || ""),
        };
      });
  }

  function buildKrudUpdatePayload(detail, recordId) {
    const normalized = normalizeDetail(detail);
    const order = normalized.order || {};
    const provider = buildShipperSnapshot(normalized);
    const status = deriveStatusKey(order);
    const feedbackMedia = sanitizeMediaItemsForPersist(
      normalized.provider?.feedback_media,
    );
    const shipperReports = sanitizeMediaItemsForPersist(
      normalized.provider?.shipper_reports,
    );
    const payload = {
      id: recordId,
      ma_don_hang_noi_bo: order.order_code || order.id || "",
      ma_don_hang: order.order_code || order.id || "",
      order_code: order.order_code || order.id || "",
      trang_thai: status,
      status,
      updated_at: new Date().toISOString(),
      ngayhuy: order.ngayhuy || "",
      ly_do_huy: order.cancel_reason || "",
      thoidiemnhandon: order.thoidiemnhandon || order.ngaynhan || "",
      ngaynhan: order.ngaynhan || order.thoidiemnhandon || "",
      ngaybatdauthucte: order.ngaybatdauthucte || "",
      ngayhoanthanhthucte: order.ngayhoanthanhthucte || "",
      ghi_chu_shipper: order.shipper_note || "",
      shipper_note: order.shipper_note || "",
      pod_image: order.pod_image || "",
      anh_xac_nhan_giao_hang: order.pod_image || "",
      danh_gia_so_sao: order.rating || "",
      rating: order.rating || "",
      phan_hoi: order.feedback || "",
      feedback: order.feedback || "",
      feedback_media_json: JSON.stringify(feedbackMedia),
      shipper_reports_json: JSON.stringify(shipperReports),
      ncc_id: provider.shipper_id || provider.provider_id || "",
      shipper_id: provider.shipper_id || provider.provider_id || "",
      nha_cung_cap_ho_ten: provider.shipper_name || provider.fullname || "",
      shipper_name: provider.shipper_name || provider.fullname || "",
      nha_cung_cap_so_dien_thoai:
        provider.shipper_phone || provider.phone || "",
      shipper_phone: provider.shipper_phone || provider.phone || "",
      ncc_email: provider.email || "",
      shipper_vehicle: provider.shipper_vehicle || provider.vehicle_type || "",
      vehicle_type: provider.vehicle_type || provider.shipper_vehicle || "",
      bien_so: provider.bien_so || provider.license_plate || "",
    };

    if (status === "completed") {
      payload.trang_thai_thanh_toan = "paid";
    }

    return payload;
  }

  async function resolveKrudRecordId(detail) {
    const existingId = normalizeText(detail?.order?.krud_id || "");
    if (existingId) return existingId;

    const candidates = [detail?.order?.order_code, detail?.order?.id]
      .map((value) => normalizeText(value))
      .filter(Boolean);

    for (const candidate of candidates) {
      const record = await findKrudRecord(candidate);
      const recordId = normalizeText(record?.id || "");
      if (recordId) return recordId;
    }

    return "";
  }

  async function persistDetail(detail) {
    const normalized = syncPodFromShipperReports(detail);
    const recordId = await resolveKrudRecordId(normalized);
    const updateFn = getKrudUpdateFn();

    if (!recordId || !updateFn) {
      return persistLocalDetail(normalized);
    }

    await updateFn(
      krudOrdersTable,
      buildKrudUpdatePayload(normalized, recordId),
      recordId,
    );

    const refreshed = await findKrudDetail(recordId).catch(() => null);
    const merged = normalizeDetail(
      refreshed
        ? {
            ...refreshed,
            provider: {
              ...(refreshed.provider || {}),
              feedback_media:
                Array.isArray(normalized.provider?.feedback_media) &&
                normalized.provider.feedback_media.length
                  ? normalized.provider.feedback_media
                  : refreshed.provider?.feedback_media,
              shipper_reports:
                Array.isArray(normalized.provider?.shipper_reports) &&
                normalized.provider.shipper_reports.length
                  ? normalized.provider.shipper_reports
                  : refreshed.provider?.shipper_reports,
            },
            logs: Array.isArray(normalized.logs)
              ? normalized.logs
              : refreshed.logs,
          }
        : {
            ...normalized,
            source: "krud",
            krud_id: recordId,
            order: {
              ...normalized.order,
              krud_id: recordId,
            },
          },
    );

    return persistLocalDetail(merged);
  }

  async function handleActionClick(event) {
    const action = event.currentTarget.dataset.orderAction;
    if (!action || !currentDetail) return;

    try {
      const now = new Date().toISOString();
      const nextDetail = normalizeDetail(currentDetail);
      const nextOrder = { ...(nextDetail.order || {}) };
      const oldStatusLabel =
        nextOrder.status_label || getStatusLabel(nextOrder);

      if (action === "cancel") {
        const reason = window.prompt(
          `Nhập lý do hủy đơn ${nextOrder.order_code || ""}:`,
          "Khách hàng chủ động hủy đơn.",
        );
        if (reason === null) return;
        nextOrder.ngayhuy = now;
        nextOrder.status = "cancelled";
        nextOrder.status_label = "Đã hủy";
        nextOrder.cancel_reason =
          normalizeText(reason) || "Khách hàng chủ động hủy đơn.";
        nextDetail.order = nextOrder;
        currentDetail = await persistDetail(
          appendLog(nextDetail, {
            createdAt: now,
            oldStatusLabel,
            newStatusLabel: "Đã hủy",
            note: nextOrder.cancel_reason,
          }),
        );
        showToast("Đã hủy đơn hàng.", "success");
        render(currentDetail, currentViewer, currentSession);
        return;
      }

      if (action === "accept") {
        if (!window.confirm("Xác nhận nhận đơn này?")) return;
        nextOrder.thoidiemnhandon = nextOrder.thoidiemnhandon || now;
        nextOrder.ngaynhan = nextOrder.ngaynhan || now;
        nextOrder.status = "pending";
        nextOrder.status_label = "Đã nhận đơn";
        nextDetail.provider = getProviderSnapshotFromSession(
          currentSession,
          nextDetail.provider,
        );
        nextDetail.order = nextOrder;
        currentDetail = await persistDetail(
          appendLog(nextDetail, {
            createdAt: now,
            oldStatusLabel,
            newStatusLabel: "Đã nhận đơn",
            note: "Nhà cung cấp đã nhận đơn và hệ thống đã chụp snapshot thông tin NCC.",
          }),
        );
        showToast("Đã nhận đơn thành công.", "success");
        render(currentDetail, currentViewer, currentSession);
        return;
      }

      if (action === "start") {
        if (!window.confirm("Xác nhận bắt đầu thực hiện đơn này?")) return;
        nextOrder.ngaybatdauthucte = nextOrder.ngaybatdauthucte || now;
        nextOrder.status = "shipping";
        nextOrder.status_label = "Đang giao";
        nextDetail.provider = getProviderSnapshotFromSession(
          currentSession,
          nextDetail.provider,
        );
        nextDetail.order = nextOrder;
        currentDetail = await persistDetail(
          appendLog(nextDetail, {
            createdAt: now,
            oldStatusLabel,
            newStatusLabel: "Đang giao",
            note: "Nhà cung cấp đã xác nhận bắt đầu thực hiện đơn hàng.",
          }),
        );
        showToast("Đã cập nhật mốc bắt đầu thực tế.", "success");
        render(currentDetail, currentViewer, currentSession);
        return;
      }

      if (action === "complete") {
        if (!window.confirm("Xác nhận hoàn thành đơn này?")) return;
        nextOrder.ngayhoanthanhthucte = nextOrder.ngayhoanthanhthucte || now;
        nextOrder.status = "completed";
        nextOrder.status_label = "Hoàn thành";
        nextOrder.payment_status_label = "Đã hoàn tất";
        nextDetail.provider = getProviderSnapshotFromSession(
          currentSession,
          nextDetail.provider,
        );
        nextDetail.order = nextOrder;
        currentDetail = await persistDetail(
          appendLog(nextDetail, {
            createdAt: now,
            oldStatusLabel,
            newStatusLabel: "Hoàn thành",
            note: "Nhà cung cấp đã chốt hoàn thành đơn hàng.",
          }),
        );
        showToast("Đã cập nhật mốc hoàn thành thực tế.", "success");
        render(currentDetail, currentViewer, currentSession);
      }
    } catch (error) {
      console.error("Cannot persist order action:", error);
      showToast(
        error?.message || "Không thể cập nhật hành động đơn hàng lúc này.",
        "error",
      );
    }
  }

  async function loadDetail(identifier) {
    const krudDetail = await findKrudDetail(identifier);
    if (krudDetail) return krudDetail;
    const localDetail = findLocalDetail(identifier);
    if (localDetail) return localDetail;
    throw new Error("Không tìm thấy đơn hàng phù hợp.");
  }

  async function init() {
    const identifier = normalizeText(getCurrentIdentifier());
    if (!identifier) {
      renderState("Thiếu mã đơn hàng để hiển thị chi tiết.", "error");
      return;
    }

    renderState("Đang tải chi tiết đơn hàng...");
    currentSession = await ensureUrlAuth();
    currentViewer = getViewer(currentSession);

    try {
      currentDetail = await loadDetail(identifier);
      render(currentDetail, currentViewer, currentSession);
    } catch (error) {
      console.error(error);
      renderState(error.message || "Không thể tải chi tiết đơn hàng.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, document);
