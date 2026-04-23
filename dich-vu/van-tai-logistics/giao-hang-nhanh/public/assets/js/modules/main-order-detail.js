(function (window, document) {
  if (window.__giaoHangNhanhStandaloneOrderDetailLoaded) return;
  window.__giaoHangNhanhStandaloneOrderDetailLoaded = true;

  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const core = window.GiaoHangNhanhCore || {};
  const storageKey = "ghn-customer-orders";
  const trackingHistoryKey = "trackingHistory";
  const krudOrdersTable = "giaohangnhanh_dat_lich";
  const AUTO_CANCEL_REASON =
    "Đơn đã quá khung giờ lấy hàng mà chưa có shipper nhận.";
  const SERVICE_AUTO_CANCEL_FALLBACK_MINUTES = {
    instant: 15,
    express: 30,
    fast: 60,
    standard: 120,
  };
  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const currentPathLower = currentPath.toLowerCase();
  const projectMarker = "/giao-hang-nhanh/";
  const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
  const projectBase =
    projectMarkerIndex !== -1
      ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
      : "./";
  const assetPaths = {
    favicon: `${projectBase}public/assets/images/favicon.ico`,
    mainLogo: `${projectBase}public/assets/images/logo-dich-vu-quanh-ta.png`,
    brandLogo: `${projectBase}public/assets/images/favicon.png`,
  };
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

  function applyFavicon() {
    let faviconLink = document.querySelector("link[rel='icon']");
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = "image/x-icon";
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = assetPaths.favicon;
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

  const getFeePayerLabel =
    typeof core.getFeePayerLabel === "function"
      ? (value) => core.getFeePayerLabel(value)
      : (value) =>
          normalizeText(value).toLowerCase() === "nhan"
            ? "Người nhận"
            : "Người gửi";

  const getServiceLabel =
    typeof core.getServiceLabel === "function"
      ? (value, fallback = "") => core.getServiceLabel(value, fallback)
      : (value, fallback = "") => fallback || value || "--";

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

  function parseSystemOrderIdentifier(value) {
    const match = String(value || "")
      .trim()
      .toUpperCase()
      .match(/^GHN-(\d{8})-(\d{7})$/);
    if (!match) return null;
    const numericId = Number(match[2]);
    if (!Number.isFinite(numericId) || numericId <= 0) return null;
    return {
      dateCode: match[1],
      numericId,
    };
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

  function openCancelOrderDialog(orderCode) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "background:rgba(15,23,42,.52)",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:20px",
        "z-index:9999",
      ].join(";");

      const card = document.createElement("div");
      card.style.cssText = [
        "width:min(100%,560px)",
        "background:#fff",
        "border-radius:24px",
        "box-shadow:0 32px 80px rgba(15,23,42,.24)",
        "padding:24px",
        "display:flex",
        "flex-direction:column",
        "gap:16px",
      ].join(";");
      card.innerHTML = `
        <div>
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Xác nhận hủy đơn</p>
          <h2 style="margin:0 0 8px;font-size:28px;line-height:1.2;color:#0f172a;">Hủy đơn ${escapeHtml(orderCode || "")}</h2>
          <p style="margin:0;color:#64748b;">Đơn sau khi hủy sẽ không thể tiếp tục xử lý. Vui lòng xác nhận lại trước khi lưu thay đổi.</p>
        </div>
        <label style="display:flex;flex-direction:column;gap:8px;">
          <span style="font-weight:600;color:#0f172a;">Lý do hủy đơn</span>
          <textarea rows="4" placeholder="Nhập lý do hủy nếu cần..." style="width:100%;border:1px solid #cbd5e1;border-radius:16px;padding:14px 16px;font:inherit;resize:vertical;min-height:112px;">Khách hàng chủ động hủy đơn.</textarea>
        </label>
        <div style="display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;">
          <button type="button" data-action="cancel" class="customer-btn customer-btn-ghost">Quay lại</button>
          <button type="button" data-action="confirm" class="customer-btn customer-btn-danger">Xác nhận hủy</button>
        </div>
      `;

      const textarea = card.querySelector("textarea");
      const cleanup = (value) => {
        overlay.remove();
        resolve(value);
      };

      card.querySelector('[data-action="cancel"]')?.addEventListener("click", () => {
        cleanup(null);
      });
      card.querySelector('[data-action="confirm"]')?.addEventListener("click", () => {
        cleanup(String(textarea?.value || "").trim());
      });
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          cleanup(null);
        }
      });
      window.addEventListener(
        "keydown",
        function handleEscape(event) {
          if (event.key !== "Escape") return;
          window.removeEventListener("keydown", handleEscape);
          cleanup(null);
        },
        { once: true },
      );

      overlay.appendChild(card);
      document.body.appendChild(overlay);
      textarea?.focus();
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    });
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

  const URL_ACCESS_QUERY_KEYS = Object.freeze([
    "username",
    "sodienthoai",
    "password",
    "pass",
  ]);

  async function ensureUrlAuth() {
    if (localAuth && typeof localAuth.loginFromUrl === "function") {
      const urlSession = await localAuth.loginFromUrl();
      if (urlSession) return urlSession;
    }

    return getSession();
  }

  function getAccessCredentials(sessionOverride = null) {
    const params = new URLSearchParams(window.location.search);
    const urlLoginIdentifier = normalizeText(params.get("sodienthoai") || "");
    const urlPassword = String(params.get("password") || "");
    if (urlLoginIdentifier && urlPassword) {
      return {
        loginIdentifier: urlLoginIdentifier,
        password: urlPassword,
      };
    }

    const session = sessionOverride || getSession();
    const loginIdentifier = normalizeText(
      session?.phone || session?.so_dien_thoai || session?.username || "",
    );
    const password = String(session?.password || session?.mat_khau || "");
    if (!loginIdentifier || !password) return null;
    return {
      loginIdentifier,
      password,
    };
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
    const breakdown = parseJsonSafe(rawBreakdown, {}) || {};
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
      insurance_fee: Number(
        breakdown.insurance_fee ??
          breakdown.phi_bao_hiem ??
          breakdown.insuranceFee ??
          0,
      ),
      cod_fee: Number(
        breakdown.cod_fee ?? breakdown.phi_cod ?? breakdown.codFee ?? 0,
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
      don_gia_km: Number(breakdown.don_gia_km ?? 0),
      he_so_xe: Number(breakdown.he_so_xe ?? 1),
      phi_toi_thieu: Number(breakdown.phi_toi_thieu ?? 0),
      ten_loai_xe_tinh_gia: String(
        breakdown.ten_loai_xe_tinh_gia ?? breakdown.vehiclePricingLabel ?? "",
      ),
      time_surcharge_label: String(
        breakdown.time_surcharge_label ??
          breakdown.ten_khung_gio ??
          breakdown.timeSurchargeLabel ??
          "",
      ),
      condition_surcharge_label: String(
        breakdown.condition_surcharge_label ??
          breakdown.ten_dieu_kien_thoi_tiet ??
          breakdown.conditionSurchargeLabel ??
          "",
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
      avatar: pickFirstText(
        provider.avatar,
        provider.photo,
        provider.link_avatar,
        provider.avatar_link,
        provider.shipper_avatar,
        provider.ncc_avatar,
        session.link_avatar,
        session.avatar_link,
        session.avatar,
      ),
      photo: pickFirstText(
        provider.photo,
        provider.avatar,
        provider.link_avatar,
        provider.avatar_link,
        provider.shipper_avatar,
        provider.ncc_avatar,
        session.link_avatar,
        session.avatar_link,
        session.avatar,
      ),
      link_avatar: pickFirstText(
        provider.link_avatar,
        provider.avatar_link,
        provider.avatar,
        provider.photo,
        provider.shipper_avatar,
        provider.ncc_avatar,
        session.link_avatar,
        session.avatar_link,
        session.avatar,
      ),
      avatar_link: pickFirstText(
        provider.avatar_link,
        provider.link_avatar,
        provider.avatar,
        provider.photo,
        provider.shipper_avatar,
        provider.ncc_avatar,
        session.avatar_link,
        session.link_avatar,
        session.avatar,
      ),
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
    const attachments = Array.isArray(provider.attachments)
      ? provider.attachments
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
    const rawBreakdown = parseJsonSafe(
      order.chi_tiet_gia_cuoc_json,
      order.chi_tiet_gia_cuoc || order.fee_breakdown || order.pricing_breakdown || {},
    );
    order.shipping_fee = Number(
      order.shipping_fee ||
        order.tong_cuoc ||
        order.total_fee ||
        order.phi_van_chuyen ||
        0,
    );
    order.khoang_cach_km = Number(
      order.khoang_cach_km ||
        order.distance_km ||
        order.distanceKm ||
        order.service_meta?.distance_km ||
        rawBreakdown.khoang_cach_km ||
        0,
    );
    order.cod_amount = Number(
      order.cod_amount || order.gia_tri_thu_ho_cod || order.cod_value || 0,
    );

    // Chuẩn hóa nhãn thanh toán
    order.payment_method_label = getPaymentMethodLabel(
      order.payment_method ||
        order.phuong_thuc_thanh_toan ||
        order.payment_method_label,
      order.payment_method_label,
    );
    order.fee_payer = order.nguoi_tra_cuoc || order.fee_payer || "gui";
    order.payer_label = order.payer_label || getFeePayerLabel(order.fee_payer);
    order.estimated_delivery =
      order.estimated_delivery ||
      order.du_kien_giao_hang ||
      order.estimated_eta ||
      order.thoi_gian_giao_hang_du_kien ||
      order.service_meta?.estimated_eta ||
      "";
    order.pickup_slot_label =
      order.pickup_slot_label ||
      order.ten_khung_gio_lay_hang ||
      order.khung_gio_lay_hang ||
      order.pickup_slot ||
      order.service_meta?.pickup_slot_label ||
      "";
    order.vehicle_label =
      order.vehicle_label ||
      order.ten_phuong_tien ||
      order.vehicle_type ||
      order.phuong_tien ||
      order.service_meta?.vehicle_label ||
      "";
    const explicitServiceLabel = normalizeText(
      order.ten_dich_vu ||
        order.service_name ||
        order.service_label ||
        order.service_meta?.service_name ||
        order.service_meta?.service_label ||
        "",
    );
    order.service_label =
      explicitServiceLabel ||
      getServiceLabel(
        order.service_type || order.loai_dich_vu || order.dich_vu || "",
        order.service_label,
      );
    order.service_name = order.service_label;

    order.rating = Number(order.rating || order.danh_gia_so_sao || 0);
    order.feedback = normalizeMultilineText(
      order.feedback || order.phan_hoi || "",
    );
    order.shipper_note = normalizeMultilineText(
      order.shipper_note || order.ghi_chu_shipper || "",
    );
    order.clean_note = normalizeMultilineText(
      order.clean_note || order.ghi_chu || order.ghi_chu_tai_xe || "",
    );
    order.fee_breakdown = normalizeBreakdown(
      rawBreakdown,
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
        avatar: pickFirstText(
          provider.avatar,
          provider.photo,
          provider.link_avatar,
          provider.avatar_link,
          provider.shipper_avatar,
          provider.ncc_avatar,
        ),
        photo: pickFirstText(
          provider.photo,
          provider.avatar,
          provider.link_avatar,
          provider.avatar_link,
          provider.shipper_avatar,
          provider.ncc_avatar,
        ),
        link_avatar: pickFirstText(
          provider.link_avatar,
          provider.avatar_link,
          provider.avatar,
          provider.photo,
          provider.shipper_avatar,
          provider.ncc_avatar,
        ),
        avatar_link: pickFirstText(
          provider.avatar_link,
          provider.link_avatar,
          provider.avatar,
          provider.photo,
          provider.shipper_avatar,
          provider.ncc_avatar,
        ),
        attachments,
        feedback_media: feedbackMedia,
        shipper_reports: shipperReports,
      },
      customer: {
        ...customer,
      },
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
            return (payload) => {
              const options = {
                ...payload,
                p: payload.page || payload.p || 1,
                limit: payload.limit || 100,
              };
              delete options.table;
              delete options.page;
              return window.crud("list", payload.table, options);
            };
          }

          if (typeof window.krud === "function") {
            return (payload) => {
              const options = {
                ...payload,
                p: payload.page || payload.p || 1,
                limit: payload.limit || 100,
              };
              delete options.table;
              delete options.page;
              return window.krud("list", payload.table, options);
            };
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
    const pickupDate = normalizeText(order.ngay_lay_hang || "");
    const explicitDeadline = buildLocalDateTimeMs(
      pickupDate,
      normalizeText(order.gio_ket_thuc_lay_hang || ""),
    );
    if (explicitDeadline) return explicitDeadline;

    const slotTokens = extractTimeTokens(
      order.ten_khung_gio_lay_hang || order.khung_gio_lay_hang || "",
    );
    const slotDeadline = buildLocalDateTimeMs(
      pickupDate,
      slotTokens[slotTokens.length - 1] || "",
    );
    if (slotDeadline) return slotDeadline;

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

  async function autoCancelKrudRecordIfNeeded(record) {
    const rawRecord = record && typeof record === "object" ? { ...record } : null;
    const updateFn = getKrudUpdateFn();
    if (!rawRecord || !updateFn || !normalizeText(rawRecord.id || "")) return rawRecord;
    if (!shouldAutoCancelPendingOrder(rawRecord, Date.now())) return rawRecord;

    const cancelledAt = new Date().toISOString();
    try {
      await updateFn(
        krudOrdersTable,
        {
          id: rawRecord.id,
          trang_thai: "cancelled",
          status: "cancelled",
          ngayhuy: cancelledAt,
          ly_do_huy: normalizeText(rawRecord.ly_do_huy || rawRecord.cancel_reason || "") || AUTO_CANCEL_REASON,
          updated_at: cancelledAt,
        },
        rawRecord.id,
      );
      rawRecord.trang_thai = "cancelled";
      rawRecord.status = "cancelled";
      rawRecord.ngayhuy = cancelledAt;
      rawRecord.ly_do_huy =
        normalizeText(rawRecord.ly_do_huy || rawRecord.cancel_reason || "") ||
        AUTO_CANCEL_REASON;
    } catch (error) {
      console.error("Cannot auto cancel overdue GHN detail record:", error);
    }

    return rawRecord;
  }

  function matchKrudRecordByIdentifier(rows, identifier) {
    const normalizedIdentifier = normalizeText(identifier).toUpperCase();
    const parsedSystemIdentifier = parseSystemOrderIdentifier(normalizedIdentifier);
    const list = Array.isArray(rows) ? rows : [];
    return (
      list.find((row) => {
        const generatedSystemCode = formatSystemOrderCode(
          row.id || row.ma_don_hang_noi_bo || row.ma_don_hang || row.order_code,
          row.created_at || row.created_date || new Date(),
        )
          .trim()
          .toUpperCase();
        const candidates = [
          row.ma_don_hang_noi_bo,
          row.ma_don_hang,
          row.order_code,
          row.id,
          generatedSystemCode,
        ]
          .map((value) => normalizeText(value).toUpperCase())
          .filter(Boolean);
        return (
          candidates.includes(normalizedIdentifier) ||
          (parsedSystemIdentifier &&
            Number(row.id || 0) === parsedSystemIdentifier.numericId)
        );
      }) || null
    );
  }

  async function findKrudRecord(identifier) {
    const listFn = getKrudListFn();
    if (!listFn) return null;

    const normalizedIdentifier = normalizeText(identifier);
    const parsedSystemIdentifier = parseSystemOrderIdentifier(normalizedIdentifier);
    if (!normalizedIdentifier) return null;
    const exactFilters = [
      { field: "ma_don_hang_noi_bo", operator: "=", value: normalizedIdentifier },
      { field: "ma_don_hang", operator: "=", value: normalizedIdentifier },
      { field: "order_code", operator: "=", value: normalizedIdentifier },
    ];
    if (parsedSystemIdentifier) {
      exactFilters.unshift({
        field: "id",
        operator: "=",
        value: parsedSystemIdentifier.numericId,
      });
    }
    if (/^\d+$/.test(normalizedIdentifier)) {
      exactFilters.unshift({
        field: "id",
        operator: "=",
        value: Number(normalizedIdentifier),
      });
    }

    for (const where of exactFilters) {
      try {
        const response = await listFn({
          table: krudOrdersTable,
          where: [where],
          page: 1,
          limit: 20,
        });
        const directMatch = matchKrudRecordByIdentifier(
          extractRows(response),
          normalizedIdentifier,
        );
        if (directMatch) return directMatch;
      } catch (error) {
        // Fallback to paginated scan below when the KRUD client does not support where.
      }
    }

    const pageSize = 500;
    for (let page = 1; page <= 5; page += 1) {
      const response = await listFn({
        table: krudOrdersTable,
        sort: { id: "desc" },
        page,
        limit: pageSize,
      });
      const rows = extractRows(response);
      const record = matchKrudRecordByIdentifier(rows, normalizedIdentifier);
      if (record) return record;
      if (rows.length < pageSize) break;
    }

    const response = await listFn({
      table: krudOrdersTable,
      page: 1,
      limit: 500,
    });
    const rows = extractRows(response);
    const record = rows.find((row) => {
      const code = normalizeText(
        row.ma_don_hang_noi_bo || row.ma_don_hang || row.order_code || row.id,
      ).toUpperCase();
      const generatedSystemCode = normalizeText(
        formatSystemOrderCode(
          row.id || row.ma_don_hang_noi_bo || row.ma_don_hang || row.order_code,
          row.created_at || row.created_date || new Date(),
        ),
      ).toUpperCase();
      const rowId = normalizeText(row.id).toUpperCase();
      return (
        code === normalizedIdentifier.toUpperCase() ||
        generatedSystemCode === normalizedIdentifier.toUpperCase() ||
        (parsedSystemIdentifier &&
          Number(row.id || 0) === parsedSystemIdentifier.numericId) ||
        rowId === normalizedIdentifier.toUpperCase()
      );
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
        record.mat_hang_json ||
          record.mat_hang ||
          record.items_json ||
          record.items ||
          [],
        [],
      ),
    );
    const breakdown = normalizeBreakdown(
      parseJsonSafe(
        record.chi_tiet_gia_cuoc_json ||
          record.chi_tiet_gia_cuoc ||
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
        ngay_lay_hang: record.ngay_lay_hang || "",
        khung_gio_lay_hang: record.khung_gio_lay_hang || "",
        ten_khung_gio_lay_hang: record.ten_khung_gio_lay_hang || "",
        gio_bat_dau_lay_hang: record.gio_bat_dau_lay_hang || "",
        gio_ket_thuc_lay_hang: record.gio_ket_thuc_lay_hang || "",
        estimated_delivery:
          record.du_kien_giao_hang ||
          record.estimated_delivery ||
          record.estimated_eta ||
          record.thoi_gian_giao_hang_du_kien ||
          "",
        du_kien_giao_hang:
          record.du_kien_giao_hang ||
          record.estimated_delivery ||
          record.estimated_eta ||
          record.thoi_gian_giao_hang_du_kien ||
          "",
        service_name:
          record.ten_dich_vu ||
          record.service_name ||
          record.service_label ||
          "",
        service_label:
          record.ten_dich_vu ||
          record.service_name ||
          record.service_label ||
          "",
        ten_phuong_tien:
          record.ten_phuong_tien ||
          record.vehicle_label ||
          record.phuong_tien ||
          record.vehicle_type ||
          "",
        vehicle_type:
          record.ten_phuong_tien ||
          record.vehicle_label ||
          record.phuong_tien ||
          record.vehicle_type ||
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
        nguoi_tra_cuoc: record.nguoi_tra_cuoc || record.fee_payer || "gui",
        fee_payer: record.fee_payer || record.nguoi_tra_cuoc || "gui",
        payment_status_label: getPaymentStatusLabel(
          record.payment_status_label || record.trang_thai_thanh_toan,
          "Chưa hoàn tất",
        ),
        clean_note:
          record.ghi_chu || record.ghi_chu_tai_xe || record.clean_note || "",
        cancel_reason: record.ly_do_huy || record.cancel_reason || "",
        rating: Number(record.danh_gia_so_sao || record.rating || 0),
        feedback: record.phan_hoi || record.feedback || "",
        shipper_note: record.ghi_chu_shipper || record.shipper_note || "",
        chi_tiet_gia_cuoc: record.chi_tiet_gia_cuoc || {},
        chi_tiet_gia_cuoc_json:
          record.chi_tiet_gia_cuoc_json ||
          (record.chi_tiet_gia_cuoc
            ? JSON.stringify(record.chi_tiet_gia_cuoc)
            : ""),
        pricing_breakdown: record.pricing_breakdown || {},
        fee_breakdown: breakdown,
        service_meta: {
          distance_km: Number(
            record.khoang_cach_km || breakdown.khoang_cach_km || 0,
          ),
          pickup_slot_label:
            record.ten_khung_gio_lay_hang || record.khung_gio_lay_hang || "",
          estimated_eta:
            record.du_kien_giao_hang ||
            record.estimated_delivery ||
            record.estimated_eta ||
            record.thoi_gian_giao_hang_du_kien ||
            "",
          vehicle_label:
            record.ten_phuong_tien ||
            record.vehicle_label ||
            record.phuong_tien ||
            record.vehicle_type ||
            "",
        },
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
        avatar: pickFirstText(
          record.ncc_avatar,
          record.shipper_avatar,
          record.nha_cung_cap_avatar,
          record.avatar_ncc,
          record.link_avatar_ncc,
          record.avatar,
        ),
        photo: pickFirstText(
          record.ncc_avatar,
          record.shipper_avatar,
          record.nha_cung_cap_avatar,
          record.avatar_ncc,
          record.link_avatar_ncc,
          record.avatar,
        ),
        link_avatar: pickFirstText(
          record.link_avatar_ncc,
          record.ncc_avatar,
          record.shipper_avatar,
          record.nha_cung_cap_avatar,
          record.avatar_ncc,
          record.avatar,
        ),
        avatar_link: pickFirstText(
          record.link_avatar_ncc,
          record.ncc_avatar,
          record.shipper_avatar,
          record.nha_cung_cap_avatar,
          record.avatar_ncc,
          record.avatar,
        ),
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
    const refreshedRecord = await autoCancelKrudRecordIfNeeded(record);
    return refreshedRecord ? buildDetailFromKrudRecord(refreshedRecord) : null;
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

  function syncDisplayUrl(identifier, viewer) {
    if (!identifier || !window.history || typeof window.history.replaceState !== "function") {
      return;
    }

    let targetUrl = null;
    if (viewer === "customer") {
      targetUrl = new URL(
        `${projectBase}public/khach-hang/chi-tiet-don-hang-giaohang.html`,
        window.location.href,
      );
    } else if (viewer === "shipper") {
      targetUrl = new URL(
        `${projectBase}public/nha-cung-cap/chi-tiet-don-hang-giaohang.html`,
        window.location.href,
      );
    } else {
      targetUrl = new URL("chi-tiet-don-hang-giaohang.html", window.location.href);
    }

    targetUrl.searchParams.set("madonhang", identifier);
    targetUrl.searchParams.delete("viewer");
    targetUrl.searchParams.delete("code");
    targetUrl.searchParams.delete("id");
    const access = getAccessCredentials();
    URL_ACCESS_QUERY_KEYS.forEach((key) => {
      targetUrl.searchParams.delete(key);
    });
    if (access?.loginIdentifier && access?.password) {
      targetUrl.searchParams.set("sodienthoai", access.loginIdentifier);
      targetUrl.searchParams.set("password", access.password);
    }

    const nextUrl = targetUrl.toString();
    if (nextUrl !== window.location.href) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }

  function canCancel(order, viewer) {
    const milestones = getMilestones(order);
    return (
      viewer === "customer" &&
      !milestones.cancelledAt &&
      !milestones.acceptedAt &&
      !milestones.completedAt &&
      !shouldAutoCancelPendingOrder(order)
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

  function buildBackListUrl(viewer) {
    let targetUrl = null;
    if (viewer === "customer") {
      targetUrl = new URL(
        `${projectBase}public/khach-hang/danh-sach-don-hang-giaohang.html`,
        window.location.href,
      );
    } else if (viewer === "shipper") {
      targetUrl = new URL(
        `${projectBase}public/nha-cung-cap/don-hang-giaohang.html`,
        window.location.href,
      );
    } else {
      targetUrl = new URL("tra-don-hang-giaohang.html", window.location.href);
    }

    const access = getAccessCredentials();
    URL_ACCESS_QUERY_KEYS.forEach((key) => {
      targetUrl.searchParams.delete(key);
    });
    if (access?.loginIdentifier && access?.password) {
      targetUrl.searchParams.set("sodienthoai", access.loginIdentifier);
      targetUrl.searchParams.set("password", access.password);
    }

    return targetUrl.toString();
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

    const backLabel =
      viewer === "customer"
        ? "Về danh sách đơn"
        : viewer === "shipper"
          ? "Về danh sách đơn"
          : "Về tra đơn hàng";
    buttons.push(
      `<a class="customer-btn customer-btn-ghost" href="${escapeHtml(
        buildBackListUrl(viewer),
      )}">${backLabel}</a>`,
    );

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

    const uploadOptions =
      mediaType === "feedback" ? { proxyFile: "upload_feedback_media.php" } : {};

    return (await core.uploadFilesToDrive(list, uploadOptions)).map((item) => ({
      id: normalizeText(item.id || item.fileId || ""),
      name: normalizeText(item.name || "Tệp đính kèm"),
      extension: getMediaExtension(item),
      url: normalizeText(item.url || item.download_url || ""),
      view_url: normalizeText(item.view_url || ""),
      download_url: normalizeText(item.download_url || ""),
      thumbnail_url: normalizeText(item.thumbnail_url || ""),
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
    assetPaths,
    getRoot,
    escapeHtml,
    formatCurrency,
    formatDateTime,
    normalizeText,
    normalizeMultilineText,
    getMilestones,
    deriveStatusKey,
    getStatusBadge,
    getFeePayerLabel,
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
          download_url: normalizeText(item.download_url || ""),
          view_url: normalizeText(item.view_url || ""),
          thumbnail_url: normalizeText(item.thumbnail_url || ""),
          created_at: normalizeText(item.created_at || ""),
        };
      });
  }

  function buildKrudUpdatePayload(detail, recordId) {
    const normalized = normalizeDetail(detail);
    const order = normalized.order || {};
    const provider = buildShipperSnapshot(normalized);
    const status = deriveStatusKey(order);
    const attachments = sanitizeMediaItemsForPersist(
      normalized.provider?.attachments,
    );
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
      tong_cuoc: Number(order.shipping_fee || order.fee_breakdown?.total_fee || 0),
      shipping_fee: Number(order.shipping_fee || order.fee_breakdown?.total_fee || 0),
      total_fee: Number(order.shipping_fee || order.fee_breakdown?.total_fee || 0),
      phi_van_chuyen: Number(order.fee_breakdown?.base_price || 0),
      khoang_cach_km: Number(order.khoang_cach_km || 0),
      distance_km: Number(order.khoang_cach_km || 0),
      chi_tiet_gia_cuoc_json: JSON.stringify(
        order.fee_breakdown || order.pricing_breakdown || {},
      ),
      pricing_breakdown: JSON.stringify(
        order.fee_breakdown || order.pricing_breakdown || {},
      ),
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
      attachments: JSON.stringify(attachments),
      attachments_json: JSON.stringify(attachments),
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
      ncc_avatar:
        provider.avatar ||
        provider.photo ||
        provider.link_avatar ||
        provider.avatar_link ||
        "",
      shipper_avatar:
        provider.avatar ||
        provider.photo ||
        provider.link_avatar ||
        provider.avatar_link ||
        "",
      nguoi_tra_cuoc: order.fee_payer || order.nguoi_tra_cuoc || "",
      fee_payer: order.fee_payer || order.nguoi_tra_cuoc || "",
      du_kien_giao_hang: order.estimated_delivery || "",
      estimated_delivery: order.estimated_delivery || "",
      ten_khung_gio_lay_hang: order.pickup_slot_label || "",
      ten_phuong_tien: order.vehicle_label || order.vehicle_type || "",
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
              attachments:
                Array.isArray(normalized.provider?.attachments) &&
                normalized.provider.attachments.length
                  ? normalized.provider.attachments
                  : refreshed.provider?.attachments,
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
        const reason = await openCancelOrderDialog(
          nextOrder.order_code || nextOrder.id || "",
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
    const localDetail = findLocalDetail(identifier);
    const krudDetail = await findKrudDetail(identifier).catch(() => null);

    if (krudDetail && localDetail) {
      const normalizedKrud = normalizeDetail(krudDetail);
      const normalizedLocal = normalizeDetail(localDetail);
      const krudBreakdown = normalizedKrud.order?.fee_breakdown || {};
      const localBreakdown = normalizedLocal.order?.fee_breakdown || {};
      const mergedBreakdown =
        Number(krudBreakdown.base_price || 0) > 0 ||
        Number(krudBreakdown.goods_fee || 0) > 0 ||
        Number(krudBreakdown.time_fee || 0) > 0 ||
        Number(krudBreakdown.condition_fee || 0) > 0 ||
        Number(krudBreakdown.vehicle_fee || 0) > 0 ||
        Number(krudBreakdown.cod_fee || 0) > 0 ||
        Number(krudBreakdown.insurance_fee || 0) > 0
          ? krudBreakdown
          : localBreakdown;

      return normalizeDetail({
        ...normalizedLocal,
        ...normalizedKrud,
        order: {
          ...(normalizedLocal.order || {}),
          ...(normalizedKrud.order || {}),
          shipping_fee: Number(
            normalizedKrud.order?.shipping_fee ||
              normalizedLocal.order?.shipping_fee ||
              0,
          ),
          khoang_cach_km: Number(
            normalizedKrud.order?.khoang_cach_km ||
              normalizedLocal.order?.khoang_cach_km ||
              0,
          ),
          fee_payer:
            normalizedKrud.order?.fee_payer ||
            normalizedKrud.order?.nguoi_tra_cuoc ||
            normalizedLocal.order?.fee_payer ||
            normalizedLocal.order?.nguoi_tra_cuoc ||
            "gui",
          nguoi_tra_cuoc:
            normalizedKrud.order?.nguoi_tra_cuoc ||
            normalizedKrud.order?.fee_payer ||
            normalizedLocal.order?.nguoi_tra_cuoc ||
            normalizedLocal.order?.fee_payer ||
            "gui",
          estimated_delivery:
            normalizedKrud.order?.estimated_delivery ||
            normalizedKrud.order?.du_kien_giao_hang ||
            normalizedKrud.order?.estimated_eta ||
            normalizedKrud.order?.thoi_gian_giao_hang_du_kien ||
            normalizedLocal.order?.estimated_delivery ||
            normalizedLocal.order?.du_kien_giao_hang ||
            normalizedLocal.order?.estimated_eta ||
            normalizedLocal.order?.thoi_gian_giao_hang_du_kien ||
            "",
          du_kien_giao_hang:
            normalizedKrud.order?.du_kien_giao_hang ||
            normalizedKrud.order?.estimated_delivery ||
            normalizedKrud.order?.estimated_eta ||
            normalizedKrud.order?.thoi_gian_giao_hang_du_kien ||
            normalizedLocal.order?.du_kien_giao_hang ||
            normalizedLocal.order?.estimated_delivery ||
            normalizedLocal.order?.estimated_eta ||
            normalizedLocal.order?.thoi_gian_giao_hang_du_kien ||
            "",
          pickup_slot_label:
            normalizedKrud.order?.pickup_slot_label ||
            normalizedKrud.order?.ten_khung_gio_lay_hang ||
            normalizedKrud.order?.khung_gio_lay_hang ||
            normalizedLocal.order?.pickup_slot_label ||
            normalizedLocal.order?.ten_khung_gio_lay_hang ||
            normalizedLocal.order?.khung_gio_lay_hang ||
            "",
          ten_khung_gio_lay_hang:
            normalizedKrud.order?.ten_khung_gio_lay_hang ||
            normalizedKrud.order?.pickup_slot_label ||
            normalizedKrud.order?.khung_gio_lay_hang ||
            normalizedLocal.order?.ten_khung_gio_lay_hang ||
            normalizedLocal.order?.pickup_slot_label ||
            normalizedLocal.order?.khung_gio_lay_hang ||
            "",
          vehicle_label:
            normalizedKrud.order?.vehicle_label ||
            normalizedKrud.order?.ten_phuong_tien ||
            normalizedKrud.order?.vehicle_type ||
            normalizedKrud.order?.phuong_tien ||
            normalizedLocal.order?.vehicle_label ||
            normalizedLocal.order?.ten_phuong_tien ||
            normalizedLocal.order?.vehicle_type ||
            normalizedLocal.order?.phuong_tien ||
            "",
          ten_phuong_tien:
            normalizedKrud.order?.ten_phuong_tien ||
            normalizedKrud.order?.vehicle_label ||
            normalizedKrud.order?.vehicle_type ||
            normalizedKrud.order?.phuong_tien ||
            normalizedLocal.order?.ten_phuong_tien ||
            normalizedLocal.order?.vehicle_label ||
            normalizedLocal.order?.vehicle_type ||
            normalizedLocal.order?.phuong_tien ||
            "",
          fee_breakdown: mergedBreakdown,
          pricing_breakdown: mergedBreakdown,
        },
        provider: {
          ...(normalizedLocal.provider || {}),
          ...(normalizedKrud.provider || {}),
        },
        customer: {
          ...(normalizedLocal.customer || {}),
          ...(normalizedKrud.customer || {}),
        },
        items:
          Array.isArray(normalizedKrud.items) && normalizedKrud.items.length
            ? normalizedKrud.items
            : normalizedLocal.items,
        logs:
          Array.isArray(normalizedKrud.logs) && normalizedKrud.logs.length
            ? normalizedKrud.logs
            : normalizedLocal.logs,
      });
    }

    if (krudDetail) return krudDetail;
    if (localDetail) return localDetail;
    throw new Error("Không tìm thấy đơn hàng phù hợp.");
  }

  async function init() {
    const identifier = normalizeText(getCurrentIdentifier());
    applyFavicon();
    if (!identifier) {
      renderState("Thiếu mã đơn hàng để hiển thị chi tiết.", "error");
      return;
    }

    renderState("Đang tải chi tiết đơn hàng...");
    currentSession = await ensureUrlAuth();
    currentViewer = getViewer(currentSession);
    syncDisplayUrl(identifier, currentViewer);

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
