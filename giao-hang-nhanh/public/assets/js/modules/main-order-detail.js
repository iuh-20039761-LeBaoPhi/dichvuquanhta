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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeMultilineText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .trim();
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  }

  function getPaymentMethodLabel(value, fallback = "") {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return normalizeText(fallback) || "--";
    if (["tien_mat", "cash"].includes(normalized)) return "Tiền mặt";
    if (["chuyen_khoan", "bank", "bank_transfer", "transfer"].includes(normalized)) {
      return "Chuyển khoản";
    }
    return fallback || value;
  }

  function getPaymentStatusLabel(value, fallback = "") {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return normalizeText(fallback) || "Chưa hoàn tất";
    if (["paid", "completed", "done"].includes(normalized)) {
      return "Đã hoàn tất";
    }
    if (["unpaid", "pending", "processing"].includes(normalized)) {
      return "Chưa hoàn tất";
    }
    return fallback || value;
  }

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

  function showToast(message, type = "info") {
    if (core && typeof core.showToast === "function") {
      core.showToast(message, type);
      return;
    }
    window.alert(message);
  }

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

  function getStatusBadge(status, label) {
    return `<span class="customer-status-badge status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
  }

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
        payment_status_label:
          getPaymentStatusLabel(
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

  function renderInfoRow(label, value, options = {}) {
    const safeLabel = options.labelHtml ? label || "--" : escapeHtml(label);
    const safeValue = options.valueHtml ? value || "--" : escapeHtml(value || "--");
    const valueTag = options.valueTag || "strong";
    return `
      <div class="standalone-order-info-row">
        <span>${safeLabel}</span>
        <${valueTag} class="standalone-order-info-value">${safeValue}</${valueTag}>
      </div>
    `;
  }

  function renderFeeSummaryRows(order) {
    const breakdown = order?.fee_breakdown || {};
    const rows = [
      renderInfoRow("Phí vận chuyển", formatCurrency(breakdown.base_price)),
    ];

    [
      ["Phụ phí loại hàng", breakdown.goods_fee],
      ["Phụ phí khung giờ", breakdown.time_fee],
      ["Phụ phí thời tiết", breakdown.condition_fee],
      ["Điều chỉnh theo xe", breakdown.vehicle_fee],
      ["Phí COD", breakdown.cod_fee],
      ["Phí bảo hiểm", breakdown.insurance_fee],
    ].forEach(([label, value]) => {
      if (Number(value || 0) <= 0) return;
      rows.push(renderInfoRow(label, formatCurrency(value)));
    });

    rows.push(
      renderInfoRow(
        "Tổng cộng",
        formatCurrency(breakdown.total_fee || order.shipping_fee),
        {
          valueHtml: true,
          valueTag: "div",
        },
      ),
    );
    rows.push(renderInfoRow("Thanh toán", order.payment_method_label));
    rows.push(
      renderInfoRow(
        "Trạng thái thanh toán",
        order.payment_status_label || "Chưa hoàn tất",
      ),
    );

    return rows.join("");
  }

  function getProviderAddress(provider, session) {
    return (
      pickFirstText(
        provider?.shipper_address,
        provider?.address,
        provider?.dia_chi,
        provider?.company_address,
        provider?.full_address,
        provider?.area_label,
        provider?.region,
        provider?.hub_label,
        provider?.company_name,
        session?.shipper_address,
        session?.address,
        session?.dia_chi,
        session?.company_address,
      ) || "Chưa cập nhật"
    );
  }

  function renderItems(items) {
    if (!items.length) {
      return '<div class="standalone-order-muted">Chưa có danh sách hàng hóa chi tiết.</div>';
    }

    return `<div class="standalone-order-items">${items
      .map(
        (item, index) => `
          <article class="standalone-order-item">
            <div class="standalone-order-item-icon">
              <i class="fa-solid fa-box"></i>
            </div>
            <div class="standalone-order-item-body">
              <div class="standalone-order-item-top">
                <div>
                  <strong>${escapeHtml(item.ten_hang || `Hàng hóa #${index + 1}`)}</strong>
                  <div class="standalone-order-muted">${escapeHtml(item.loai_hang || "Hàng hóa tổng hợp")}</div>
                </div>
                <div class="standalone-order-item-meta">
                  <span>SL: ${escapeHtml(item.so_luong)}</span>
                  <span>${escapeHtml(item.can_nang)} kg</span>
                  <span>${formatCurrency(item.gia_tri_khai_bao)}</span>
                </div>
              </div>
              <div class="standalone-order-item-note">
                ${escapeHtml(item.ghi_chu_dong_goi || "Không có ghi chú đóng gói riêng cho mặt hàng này.")}
              </div>
            </div>
          </article>`,
      )
      .join("")}</div>`;
  }

  function buildTimeline(detail) {
    const order = detail.order || {};
    const milestones = getMilestones(order);
    const timeline = [];
    const pushItem = (time, title, note) => {
      if (!normalizeText(time)) return;
      timeline.push({
        time,
        title,
        note,
      });
    };

    pushItem(
      order.created_at,
      "Đơn được tạo",
      "Hệ thống đã ghi nhận đơn hàng.",
    );
    pushItem(
      milestones.acceptedAt,
      "Đã có nhà cung cấp nhận đơn",
      "Thông tin NCC và thời điểm nhận đơn đã được cập nhật.",
    );
    pushItem(
      milestones.startedAt,
      "Bắt đầu thực hiện",
      "Nhà cung cấp đã xác nhận bắt đầu giao đơn thực tế.",
    );
    pushItem(
      milestones.completedAt,
      "Hoàn thành đơn hàng",
      "Đơn hàng đã được chốt hoàn tất.",
    );
    pushItem(
      milestones.cancelledAt,
      "Đơn hàng bị hủy",
      order.cancel_reason || "Khách hàng đã hủy đơn.",
    );

    (Array.isArray(detail.logs) ? detail.logs : []).forEach((log) => {
      timeline.push({
        time: log.created_at || "",
        title: log.new_status_label || "Cập nhật đơn hàng",
        note:
          log.note ||
          `Cập nhật từ ${log.old_status_label || "--"} sang ${log.new_status_label || "--"}`,
      });
    });

    const unique = [];
    const seen = new Set();
    timeline
      .filter((item) => normalizeText(item.time) || normalizeText(item.title))
      .sort((left, right) => {
        const leftTime = new Date(left.time || 0).getTime();
        const rightTime = new Date(right.time || 0).getTime();
        return leftTime - rightTime;
      })
      .forEach((item) => {
        const signature = `${item.time}|${item.title}|${item.note}`;
        if (seen.has(signature)) return;
        seen.add(signature);
        unique.push(item);
      });

    if (!unique.length) {
      return '<div class="standalone-order-muted">Chưa có nhật ký xử lý cho đơn hàng này.</div>';
    }

    return `<div class="standalone-order-timeline">${unique
      .map(
        (item, index) => `
          <article class="standalone-order-timeline-item">
            <div class="standalone-order-timeline-dot ${index === unique.length - 1 ? "is-active" : ""}"></div>
            <div class="standalone-order-timeline-content">
              <small>${formatDateTime(item.time)}</small>
              <strong>${escapeHtml(item.title || "--")}</strong>
              <p>${escapeHtml(item.note || "Không có ghi chú bổ sung.")}</p>
            </div>
          </article>`,
      )
      .join("")}</div>`;
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

  function renderAttachmentGallery(items, emptyMessage) {
    const mediaItems = Array.isArray(items) ? items : [];
    if (!mediaItems.length) {
      return `<div class="standalone-order-muted">${escapeHtml(emptyMessage)}</div>`;
    }

    return `<div class="standalone-order-media-grid">${mediaItems
      .map((item) => {
        const extension = String(item.extension || "").toLowerCase();
        const rawUrl = normalizeText(item.url || "");
        const url = escapeHtml(rawUrl || "#");
        const name = escapeHtml(item.name || "Tệp đính kèm");
        const canPreview = hasPreviewableUrl(rawUrl);

        if (isImageExtension(extension) && canPreview) {
          return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <img src="${url}" alt="${name}" />
              <strong>${name}</strong>
              <span>Ảnh đính kèm</span>
            </a>
          `;
        }

        if (isVideoExtension(extension) && canPreview) {
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
            <span>${escapeHtml(extension || "Tệp đính kèm")}</span>
          </a>
        `;
      })
      .join("")}</div>`;
  }

  function hasFeedbackContent(detail) {
    const order = detail?.order || {};
    const provider = detail?.provider || {};
    return Boolean(
      Number(order.rating || 0) > 0 ||
      normalizeMultilineText(order.feedback || "") ||
      (Array.isArray(provider.feedback_media) &&
        provider.feedback_media.length),
    );
  }

  function hasShipperNoteContent(detail) {
    const order = detail?.order || {};
    const provider = detail?.provider || {};
    return Boolean(
      normalizeMultilineText(order.shipper_note || "") ||
      (Array.isArray(provider.shipper_reports) &&
        provider.shipper_reports.length),
    );
  }

  function shouldShowFeedbackBlock(detail, viewer) {
    if (viewer === "public") return false;
    return viewer === "customer" || hasFeedbackContent(detail);
  }

  function canSubmitFeedback(detail, viewer) {
    const status = deriveStatusKey(detail?.order || {});
    return viewer === "customer" && status === "completed";
  }

  function shouldShowShipperNoteBlock(detail, viewer) {
    return viewer !== "public";
  }

  function canSubmitShipperNote(detail, viewer) {
    const milestones = getMilestones(detail?.order || {});
    return (
      viewer === "shipper" &&
      !milestones.cancelledAt &&
      Boolean(
        milestones.acceptedAt || milestones.startedAt || milestones.completedAt,
      )
    );
  }

  function renderRatingStars(rating) {
    const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
    return `<div class="standalone-order-rating-stars" aria-label="Đánh giá ${safeRating} trên 5 sao">${[
      1, 2, 3, 4, 5,
    ]
      .map(
        (star) =>
          `<i class="fa-${star <= safeRating ? "solid" : "regular"} fa-star"></i>`,
      )
      .join("")}</div>`;
  }

  function renderFeedbackBlock(detail, viewer) {
    if (!shouldShowFeedbackBlock(detail, viewer)) return "";

    const order = detail.order || {};
    const provider = detail.provider || {};
    const canSubmit = canSubmitFeedback(detail, viewer);
    const hasFeedback = hasFeedbackContent(detail);
    const feedbackMedia = Array.isArray(provider.feedback_media)
      ? provider.feedback_media
      : [];

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <p class="standalone-order-block-kicker">Vùng 5</p>
          <h2>Phản hồi khách hàng</h2>
          <p>Khối phản hồi gồm nội dung đánh giá và hình ảnh hoặc video thực tế từ khách hàng.</p>
        </div>
        <div class="standalone-order-side-stack">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Tóm tắt phản hồi</strong>
              ${Number(order.rating || 0) > 0 ? renderRatingStars(order.rating) : '<span class="standalone-order-chip">Chưa có sao</span>'}
            </div>
            <p class="standalone-order-note-text">${escapeHtml(order.feedback || (canSubmit ? "Khách hàng có thể nhập phản hồi và đính kèm hình ảnh/video thực tế." : "Chưa có phản hồi từ khách hàng."))}</p>
            ${renderAttachmentGallery(feedbackMedia, "Chưa có media phản hồi từ khách hàng.")}
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác phản hồi</strong>
              <span class="standalone-order-chip">${escapeHtml(viewer === "customer" ? "Khách hàng" : "Chỉ xem")}</span>
            </div>
            ${
              canSubmit
                ? `<form id="standalone-feedback-form" class="standalone-order-form">
                    <label class="standalone-order-field">
                      <span>Đánh giá dịch vụ</span>
                      <select name="rating" required>
                        <option value="">Chọn số sao</option>
                        ${[1, 2, 3, 4, 5]
                          .map(
                            (star) =>
                              `<option value="${star}" ${Number(order.rating || 0) === star ? "selected" : ""}>${star} sao</option>`,
                          )
                          .join("")}
                      </select>
                    </label>
                    <label class="standalone-order-field">
                      <span>Nội dung phản hồi</span>
                      <textarea name="feedback" rows="5" placeholder="Mô tả chất lượng phục vụ hoặc vấn đề phát sinh.">${escapeHtml(order.feedback || "")}</textarea>
                    </label>
                    <div class="standalone-order-upload-grid">
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                        <strong>Chụp hoặc gửi ảnh phản hồi</strong>
                        <span class="standalone-order-upload-copy">Dùng để gửi ảnh thực tế, hiện trạng đơn hàng và chất lượng phục vụ.</span>
                        <input type="file" name="feedback_media_image" accept="image/*" capture="environment" multiple hidden />
                        <span id="standalone-feedback-image-files" class="standalone-order-upload-meta">Chưa chọn ảnh phản hồi.</span>
                      </label>
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                        <strong>Gửi video phản hồi</strong>
                        <span class="standalone-order-upload-copy">Dùng để quay rõ quá trình giao hàng hoặc vấn đề phát sinh thực tế.</span>
                        <input type="file" name="feedback_media_video" accept="video/*" capture="environment" multiple hidden />
                        <span id="standalone-feedback-video-files" class="standalone-order-upload-meta">Chưa chọn video phản hồi.</span>
                      </label>
                    </div>
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu phản hồi</button>
                    </div>
                  </form>`
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(
                      viewer === "customer"
                        ? "Chỉ có thể gửi phản hồi khi đơn hàng đã hoàn thành."
                        : hasFeedback
                          ? "Phản hồi của khách đang ở chế độ chỉ xem."
                          : "Chưa có phản hồi khách hàng cho đơn này.",
                    )}</p>
                  </div>`
            }
          </article>
        </div>
      </section>
    `;
  }

  function renderShipperNoteBlock(detail, viewer) {
    if (!shouldShowShipperNoteBlock(detail, viewer)) return "";

    const order = detail.order || {};
    const provider = detail.provider || {};
    const canSubmit = canSubmitShipperNote(detail, viewer);
    const reports = Array.isArray(provider.shipper_reports)
      ? provider.shipper_reports
      : [];

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <p class="standalone-order-block-kicker">Vùng 6</p>
          <h2>Ghi chú nhà cung cấp</h2>
          <p>Khối cập nhật hiện trường của nhà cung cấp gồm ghi chú xử lý và hình ảnh hoặc video báo cáo.</p>
        </div>
        <div class="standalone-order-side-stack">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú hiện có</strong>
              <span class="standalone-order-chip">${escapeHtml(viewer === "shipper" ? "Có thể cập nhật" : "Chỉ xem")}</span>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(order.shipper_note || "Nhà cung cấp chưa cập nhật ghi chú xử lý cho đơn hàng này.")}</p>
            ${renderAttachmentGallery(reports, "Chưa có media báo cáo từ nhà cung cấp.")}
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác ghi chú</strong>
              <span class="standalone-order-chip">${escapeHtml(viewer === "shipper" ? "Nhà cung cấp" : "Bị khóa")}</span>
            </div>
            ${
              canSubmit
                ? `<form id="standalone-shipper-note-form" class="standalone-order-form">
                    <label class="standalone-order-field">
                      <span>Ghi chú xử lý</span>
                      <textarea name="shipper_note" rows="5" placeholder="Cập nhật tiến độ, vấn đề hiện trường hoặc lưu ý khi giao hàng.">${escapeHtml(order.shipper_note || "")}</textarea>
                    </label>
                    <div class="standalone-order-upload-grid">
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                        <strong>Chụp hoặc gửi ảnh báo cáo</strong>
                        <span class="standalone-order-upload-copy">Dùng để gửi ảnh hiện trường, tình trạng đơn hàng và xác nhận giao.</span>
                        <input type="file" name="shipper_media_image" accept="image/*" capture="environment" multiple hidden />
                        <span id="standalone-shipper-image-files" class="standalone-order-upload-meta">Chưa chọn ảnh báo cáo.</span>
                      </label>
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                        <strong>Gửi video báo cáo</strong>
                        <span class="standalone-order-upload-copy">Dùng để quay rõ hiện trạng giao hàng hoặc vấn đề phát sinh thực tế.</span>
                        <input type="file" name="shipper_media_video" accept="video/*" capture="environment" multiple hidden />
                        <span id="standalone-shipper-video-files" class="standalone-order-upload-meta">Chưa chọn video báo cáo.</span>
                      </label>
                    </div>
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu ghi chú NCC</button>
                    </div>
                  </form>`
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(
                      viewer === "shipper"
                        ? "Chỉ có thể thêm ghi chú sau khi đơn đã được nhận."
                        : hasShipperNoteContent(detail)
                          ? "Ghi chú của nhà cung cấp đang ở chế độ chỉ xem."
                          : "Chưa có ghi chú nào từ nhà cung cấp.",
                    )}</p>
                  </div>`
            }
          </article>
        </div>
      </section>
    `;
  }

  function render(detail, viewer, session) {
    const root = getRoot();
    if (!root) return;

    const order = detail.order || {};
    const customer = detail.customer || {};
    const provider = detail.provider || {};
    const distanceLabel =
      Number(order.khoang_cach_km || 0) > 0
        ? `${Number(order.khoang_cach_km).toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} km`
        : "--";
    const providerName =
      provider.shipper_name ||
      provider.fullname ||
      (viewer === "shipper" && session
        ? session.fullname || session.username || ""
        : "") ||
      "Chưa có nhà cung cấp nhận đơn";
    const providerPhone =
      provider.shipper_phone || provider.phone || "Chưa cập nhật";
    const providerAddress = getProviderAddress(provider, session);
    const providerVehicle =
      provider.shipper_vehicle || provider.vehicle_type || "Chưa cập nhật";
    const providerPlate = provider.bien_so || provider.license_plate || "";
    const providerMetaLine = `
      <span>${escapeHtml(providerPhone || "Chưa cập nhật")}</span>
      <span>${escapeHtml(providerAddress)}</span>
    `;

    root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <header class="standalone-order-card-header">
            <div class="standalone-order-card-header-main">
              <div class="standalone-order-brand">
                <img class="standalone-order-brand-logo" src="public/assets/images/logo-dich-vu-quanh-ta.png" alt="Dịch Vụ Quanh Ta" />
                <div class="standalone-order-card-title">
                  <p class="standalone-order-card-kicker">Chi tiết đơn hàng</p>
                  <h1>${escapeHtml(order.order_code || "--")}</h1>
                </div>
                <img class="standalone-order-brand-logo standalone-order-brand-logo-service" src="public/assets/images/favicon.png" alt="Logo Giao Hàng Nhanh" />
              </div>
              <div class="standalone-order-header-meta">
                <div class="standalone-order-viewer">
                  <i class="fa-solid fa-user-shield"></i>
                  <span>${escapeHtml(viewer === "shipper" ? "Nhà cung cấp" : viewer === "customer" ? "Khách hàng" : "Xem trực tiếp")}</span>
                </div>
                ${getStatusBadge(order.status, order.status_label)}
              </div>
            </div>
            <div class="standalone-order-card-toolbar">
              <div class="standalone-order-card-meta">
                <div class="standalone-order-meta-pill">
                  <i class="fa-solid fa-clock"></i>
                  <span>Tạo lúc ${formatDateTime(order.created_at)}</span>
                </div>
                <div class="standalone-order-meta-pill">
                  <i class="fa-solid fa-wave-square"></i>
                  <span>Trạng thái thực tế: ${escapeHtml(order.status_label)}</span>
                </div>
              </div>
              <div class="standalone-order-actions-group">
                ${buildActionButtons(detail, viewer)}
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Vùng 1</p>
                <h2>Nội dung công việc</h2>
                <p>Khối tổng quan đơn hàng được chia 2 cột gồm thông tin lộ trình và chi phí tổng quan.</p>
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel">
                  <div class="standalone-order-panel-head">
                    <strong>Thông tin đơn hàng</strong>
                  </div>
                  <div class="standalone-order-info-list">
                  ${renderInfoRow("Mã đơn hàng", order.order_code || "--")}
                  ${renderInfoRow("Gói dịch vụ", order.service_label || order.service_name || "--")}
                  ${renderInfoRow("Điểm lấy hàng", order.pickup_address || "--")}
                  ${renderInfoRow("Điểm giao hàng", order.delivery_address || "--")}
                  ${renderInfoRow("Tổng quãng đường", distanceLabel)}
                  </div>
                </div>
                <div class="standalone-order-panel" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <strong>Chi phí tổng quan</strong>
                  </div>
                  <div class="standalone-order-info-list">
                  ${renderFeeSummaryRows(order)}
                  </div>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Vùng 2</p>
                <h2>Thông tin khách hàng</h2>
                <p>Người gửi và người nhận được đặt chung trong một card để đối chiếu nhanh khi xử lý đơn.</p>
              </div>
              <div class="standalone-order-panel">
                <div class="standalone-order-contact-grid">
                  <div class="standalone-order-info-list">
                    <div class="standalone-order-subsection-title">Người gửi</div>
                    ${renderInfoRow("Người gửi", order.sender_name || customer.fullname || "--")}
                    ${renderInfoRow("Số điện thoại", order.sender_phone || customer.phone || "--")}
                  </div>
                  <div class="standalone-order-info-list">
                    <div class="standalone-order-subsection-title">Người nhận</div>
                    ${renderInfoRow("Người nhận", order.receiver_name || "--")}
                    ${renderInfoRow("Số điện thoại", order.receiver_phone || "--")}
                  </div>
                  <div class="standalone-order-contact-note">
                    <div class="standalone-order-subsection-title">Ghi chú vận chuyển</div>
                    <div class="standalone-order-note-panel">
                      <p>${escapeHtml(order.clean_note || "Không có ghi chú")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Vùng 3</p>
                <h2>Nội dung hàng hóa</h2>
                <p>Danh sách mặt hàng và lưu ý đóng gói được trình bày theo từng item card riêng biệt.</p>
              </div>
              ${renderItems(detail.items || [])}
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Vùng 4</p>
                <h2>Thông tin nhà cung cấp và trạng thái</h2>
                <p>Khối này gom thông tin shipper, timeline trạng thái và media POD trong cùng một vùng thông tin.</p>
              </div>
              <div class="standalone-order-provider-grid">
                <article class="standalone-order-provider-card">
                  <div class="standalone-order-provider-head">
                    <div class="standalone-order-provider-avatar">
                      ${
                        normalizeText(provider.avatar || provider.photo || "")
                          ? `<img src="${escapeHtml(provider.avatar || provider.photo)}" alt="${escapeHtml(providerName)}" />`
                          : escapeHtml(providerName.charAt(0) || "N")
                      }
                    </div>
                    <div>
                      <strong>${escapeHtml(providerName)}</strong>
                      ${providerMetaLine}
                    </div>
                  </div>
                  <div class="standalone-order-provider-pills">
                    <span>Loại xe: ${escapeHtml(providerVehicle)}</span>
                    <span>Biển số: ${escapeHtml(providerPlate || "Chưa cập nhật")}</span>
                    <span>Nhận đơn: ${formatDateTime(getMilestones(order).acceptedAt)}</span>
                  </div>
                </article>

                <article class="standalone-order-timeline-card">
                  <div class="standalone-order-panel-head">
                    <strong>Timeline trạng thái</strong>
                    <p>Lịch sử trạng thái được suy ra từ các mốc thời gian và nhật ký thao tác hiện có.</p>
                  </div>
                  ${buildTimeline(detail)}
                </article>

                <article class="standalone-order-media-card">
                  <div class="standalone-order-panel-head">
                    <strong>Media bằng chứng giao hàng</strong>
                    <p>Hiển thị ảnh POD gắn với đơn hàng sau khi giao thành công.</p>
                  </div>
                  ${renderMedia(detail)}
                </article>
              </div>
            </section>

            ${renderFeedbackBlock(detail, viewer)}
            ${renderShipperNoteBlock(detail, viewer)}
          </div>
        </section>
      </div>
    `;

    root.querySelectorAll("[data-order-action]").forEach((button) => {
      button.addEventListener("click", handleActionClick);
    });

    bindFeedbackForm(root);
    bindShipperNoteForm(root);
  }

  function bindFileSummary(input, host, emptyMessage) {
    if (!input || !host) return;

    const refresh = () => {
      const files = input.files ? Array.from(input.files) : [];
      host.textContent = files.length
        ? `Đã chọn: ${files.map((file) => file.name).join(", ")}`
        : emptyMessage;
    };

    input.addEventListener("change", refresh);
    refresh();
  }

  function collectFiles(...inputs) {
    return inputs.flatMap((input) =>
      input?.files ? Array.from(input.files) : [],
    );
  }

  function bindFeedbackForm(root) {
    const form = root.querySelector("#standalone-feedback-form");
    if (!form) return;

    const imageInput = form.querySelector('input[name="feedback_media_image"]');
    const videoInput = form.querySelector('input[name="feedback_media_video"]');
    const imageSummary = root.querySelector("#standalone-feedback-image-files");
    const videoSummary = root.querySelector("#standalone-feedback-video-files");
    bindFileSummary(imageInput, imageSummary, "Chưa chọn ảnh phản hồi.");
    bindFileSummary(videoInput, videoSummary, "Chưa chọn video phản hồi.");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const formData = new FormData(form);
        const rating = Number(formData.get("rating") || 0);
        const feedback = normalizeMultilineText(formData.get("feedback") || "");
        const files = collectFiles(imageInput, videoInput);
        const nextDetail = normalizeDetail(currentDetail);
        const orderRef =
          nextDetail.order?.order_code || nextDetail.order?.id || "";
        const nextFeedbackMedia = files.length
          ? await uploadOrderMedia(orderRef, files, "feedback")
          : Array.isArray(nextDetail.provider?.feedback_media)
            ? nextDetail.provider.feedback_media
            : [];

        nextDetail.order.rating = rating;
        nextDetail.order.feedback = feedback;
        nextDetail.provider = {
          ...(nextDetail.provider || {}),
          feedback_media: nextFeedbackMedia,
        };

        currentDetail = await persistDetail(nextDetail);
        showToast("Đã lưu phản hồi khách hàng.", "success");
        render(currentDetail, currentViewer, currentSession);
      } catch (error) {
        console.error("Cannot save feedback:", error);
        showToast(
          error?.message || "Không thể lưu phản hồi khách hàng lúc này.",
          "error",
        );
      }
    });
  }

  function bindShipperNoteForm(root) {
    const form = root.querySelector("#standalone-shipper-note-form");
    if (!form) return;

    const imageInput = form.querySelector('input[name="shipper_media_image"]');
    const videoInput = form.querySelector('input[name="shipper_media_video"]');
    const imageSummary = root.querySelector("#standalone-shipper-image-files");
    const videoSummary = root.querySelector("#standalone-shipper-video-files");
    bindFileSummary(imageInput, imageSummary, "Chưa chọn ảnh báo cáo.");
    bindFileSummary(videoInput, videoSummary, "Chưa chọn video báo cáo.");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const formData = new FormData(form);
        const shipperNote = normalizeMultilineText(
          formData.get("shipper_note") || "",
        );
        const files = collectFiles(imageInput, videoInput);
        const nextDetail = normalizeDetail(currentDetail);
        const orderRef =
          nextDetail.order?.order_code || nextDetail.order?.id || "";
        const existingReports = Array.isArray(
          nextDetail.provider?.shipper_reports,
        )
          ? nextDetail.provider.shipper_reports
          : [];
        const uploadedReports = files.length
          ? await uploadOrderMedia(orderRef, files, "shipper")
          : [];

        nextDetail.order.shipper_note = shipperNote;
        nextDetail.provider = {
          ...(nextDetail.provider || {}),
          ...buildShipperSnapshot(nextDetail),
          shipper_reports: files.length
            ? [...existingReports, ...uploadedReports]
            : existingReports,
        };

        currentDetail = await persistDetail(nextDetail);
        showToast("Đã lưu ghi chú nhà cung cấp.", "success");
        render(currentDetail, currentViewer, currentSession);
      } catch (error) {
        console.error("Cannot save shipper note:", error);
        showToast(
          error?.message || "Không thể lưu ghi chú nhà cung cấp lúc này.",
          "error",
        );
      }
    });
  }

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

  function renderState(message, type = "loading") {
    const root = getRoot();
    if (!root) return;

    const className =
      type === "error"
        ? "standalone-order-error"
        : type === "empty"
          ? "standalone-order-empty"
          : "standalone-order-loader";

    root.innerHTML = `<div class="${className}"><span>${escapeHtml(message)}</span></div>`;
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
