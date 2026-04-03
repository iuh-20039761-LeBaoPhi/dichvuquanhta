(function (window) {
  if (window.ShipperPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const routes = {
    home: "../../index.html",
    login: "../../dang-nhap.html",
    dashboard: "dashboard.html",
    orders: "don-hang.html",
    detail: "../../chi-tiet-don-hang.html",
    profile: "ho-so.html",
    logout: "../../dang-nhap.html",
  };
  const storageKeys = {
    orders: "ghn-customer-orders",
  };

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
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
    });
  }

  function formatDateOnly(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function showToast(message, type) {
    if (core.showToast) {
      core.showToast(message, type);
      return;
    }
    window.alert(message);
  }

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
          breakdown.basePrice ??
          0,
      ),
      overweight_fee: Number(
        breakdown.overweight_fee ?? breakdown.overweightFee ?? 0,
      ),
      volume_fee: Number(breakdown.volume_fee ?? breakdown.volumeFee ?? 0),
      goods_fee: Number(breakdown.goods_fee ?? breakdown.goodsFee ?? 0),
      time_fee: Number(breakdown.time_fee ?? breakdown.timeFee ?? 0),
      condition_fee: Number(
        breakdown.condition_fee ?? breakdown.conditionFee ?? 0,
      ),
      vehicle_fee: Number(breakdown.vehicle_fee ?? breakdown.vehicleFee ?? 0),
      cod_fee: Number(breakdown.cod_fee ?? breakdown.codFee ?? 0),
      insurance_fee: Number(
        breakdown.insurance_fee ?? breakdown.insuranceFee ?? 0,
      ),
      service_fee: Number(breakdown.service_fee ?? breakdown.serviceFee ?? 0),
      total_fee: Number(
        breakdown.total_fee ?? breakdown.totalFee ?? shippingFee ?? 0,
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
    nextOrder.order_code = nextOrder.order_code || nextOrder.id || "";
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

  async function getAllOrderDetails(session) {
    const listFn = getKrudListFn();
    if (session && listFn) {
      try {
        const response = await listFn({
          table: "giaohangnhanh_dat_lich",
          page: 1,
          limit: 500,
        });
        const rows = extractRows(response);
        const sessionId = normalizeText(session.id || "");
        const sessionUsername = normalizeText(session.username || "").toLowerCase();
        const krudDetails = rows
          .filter((row) => {
            const shipperId = normalizeText(row.ncc_id || row.shipper_id || "");
            const shipperName = normalizeText(
              row.nha_cung_cap_ho_ten || row.shipper_name || "",
            ).toLowerCase();
            return (
              (sessionId && shipperId === sessionId) ||
              (sessionUsername && shipperName.includes(sessionUsername))
            );
          })
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
    window.localStorage.setItem(
      sessionKey,
      JSON.stringify({
        id: nextUser.id,
        role: nextUser.role,
        fullname: nextUser.fullname,
        email: nextUser.email,
        phone: nextUser.phone,
        username: nextUser.username,
        is_approved: nextUser.is_approved,
        is_locked: nextUser.is_locked,
        vehicle_type: nextUser.vehicle_type || nextUser.loai_phuong_tien || "",
        so_cccd: nextUser.so_cccd || "",
      }),
    );
    return nextUser;
  }

  function buildLoginRedirect() {
    const target = `${window.location.pathname}${window.location.search}`;
    return `${routes.login}?redirect=${encodeURIComponent(target)}`;
  }

  async function requestLocalData(action, options = {}) {
    const session = getCurrentSessionUser();

    if (!session || session.role !== "shipper") {
      window.location.href = buildLoginRedirect();
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
      return {
        status: "success",
        profile: {
          ...session,
          ho_ten: session.fullname || session.ho_ten || "",
          so_dien_thoai: session.phone || session.so_dien_thoai || "",
          loai_phuong_tien:
            session.vehicle_type || session.loai_phuong_tien || "",
          created_at: session.created_at || new Date().toISOString(),
        },
        stats,
      };
    }

    if (action === "update-profile") {
      const formData = options.body;
      const fullname = String(formData?.get("ho_ten") || "").trim();
      const phone = String(formData?.get("so_dien_thoai") || "").trim();
      const vehicleType = String(
        formData?.get("loai_phuong_tien") || "",
      ).trim();

      if (!fullname || !phone) {
        throw new Error("Vui lòng nhập đầy đủ họ tên và số điện thoại.");
      }

      const updatedUser = updateAuthStorage((currentUser) => ({
        ...currentUser,
        fullname,
        ho_ten: fullname,
        phone,
        so_dien_thoai: phone,
        vehicle_type: vehicleType,
        loai_phuong_tien: vehicleType,
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

  async function apiRequest(action, options = {}) {
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

    if (loginItem) {
      loginItem.innerHTML = `<a href="${routes.dashboard}">Xin chào, ${firstName}</a>`;
    }

    if (registerItem) {
      registerItem.innerHTML = `<a href="${routes.profile}" class="btn-primary nav-auth-cta">Tài khoản</a>`;
    }
  }

  function bindLogoutActions(root = document) {
    root.querySelectorAll("[data-local-logout]").forEach((button) => {
      if (button.dataset.logoutBound === "1") return;
      button.dataset.logoutBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (localAuth && typeof localAuth.clearSession === "function") {
          localAuth.clearSession();
        } else {
          window.localStorage.removeItem("ghn-auth-session");
        }
        window.location.href = routes.login;
      });
    });
  }

  function renderShell(user, activePage) {
    const { shell } = getPageRoot();
    if (!shell) return;

    const activeClass = (page) => (page === activePage ? "is-active" : "");
    const firstName = getFirstName(user) || "Nhà cung cấp";

    shell.innerHTML = `
      <div class="customer-portal-shell">
        <section class="customer-portal-topbar">
          <div>
            <p class="customer-portal-eyebrow">Khu vực nhà cung cấp</p>
            <h1 class="customer-portal-title">Xin chào, ${escapeHtml(firstName)}</h1>
            <p class="customer-portal-subtitle">
              Theo dõi đơn được phân công, cập nhật tiến độ và gửi ảnh hoặc video
              báo cáo trực tiếp ngay trên giao diện website.
            </p>
          </div>
          <div class="customer-portal-top-actions">
            <a href="${routes.logout}" class="customer-btn customer-btn-ghost" data-local-logout="1">Đăng xuất</a>
          </div>
        </section>
        <div class="customer-portal-layout">
          <aside class="customer-portal-sidebar">
            <section class="customer-side-card">
              <h2>Menu nhà cung cấp</h2>
              <nav class="customer-side-nav">
                <a class="${activeClass("dashboard")}" href="${routes.dashboard}">Tổng quan</a>
                <a class="${activeClass("orders")}" href="${routes.orders}">Đơn hàng của tôi</a>
                <a class="${activeClass("profile")}" href="${routes.profile}">Hồ sơ cá nhân</a>
              </nav>
            </section>
          </aside>
          <main class="customer-portal-main" id="shipper-page-content"></main>
        </div>
      </div>
    `;
    bindLogoutActions(shell);
  }

  function redirectNonShipper(session, page) {
    const role = String(session?.role || "")
      .trim()
      .toLowerCase();
    if (!role || role === "shipper") return false;

    if (role === "customer") {
      const targetByPage = {
        dashboard: "../khach-hang/dashboard.html",
        orders: "../khach-hang/lich-su-don-hang.html",
        profile: "../khach-hang/ho-so.html",
      };
      const target = targetByPage[page] || "../khach-hang/dashboard.html";
      window.location.replace(target);
      return true;
    }

    if (localAuth && typeof localAuth.getDashboardPath === "function") {
      window.location.replace(`../../${localAuth.getDashboardPath(role)}`);
      return true;
    }

    return false;
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

  function createStatusBadge(status, label) {
    return `<span class="customer-status-badge status-${escapeHtml(status || "")}">${escapeHtml(label || status || "--")}</span>`;
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
    renderLoading("Đang tải tổng quan nhà cung cấp...");
    const params = new URLSearchParams(window.location.search);
    const recentStatus = params.get("recent_status") || "active";
    const data = await apiRequest("dashboard", {
      params: { recent_status: recentStatus },
    });

    const { content } = getPageRoot();
    const stats = data.stats || {};
    const recentOrders = Array.isArray(data.recent_orders) ? data.recent_orders : [];
    const recentStatusLabels = {
      active: "Đang xử lý",
      all: "Tất cả",
      pending: "Chờ xử lý",
      shipping: "Đang giao",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
    };
    const totalOrders = Number(stats.total || 0);
    const activeOrders = Number(stats.pending || 0) + Number(stats.shipping || 0);
    const kpiCards = [
      {
        tone: "total",
        label: "Tổng đơn",
        value: formatNumber(totalOrders),
        hint: totalOrders ? "Toàn bộ đơn đã được phân công" : "Chưa có đơn nào được giao",
      },
      {
        tone: "pending",
        label: "Chờ xử lý",
        value: formatNumber(stats.pending || 0),
        hint: Number(stats.pending || 0) ? "Cần nhận và xử lý sớm" : "Hiện không có đơn chờ",
      },
      {
        tone: "shipping",
        label: "Đang giao",
        value: formatNumber(stats.shipping || 0),
        hint: Number(stats.shipping || 0) ? "Đang cần cập nhật tiến độ" : "Không có đơn đang giao",
      },
      {
        tone: "completed",
        label: "Hoàn tất",
        value: formatNumber(stats.completed || 0),
        hint: Number(stats.completed || 0) ? "Đã giao thành công" : "Chưa có đơn hoàn tất",
      },
      {
        tone: "unpaid",
        label: "Doanh thu",
        value: formatCurrency(stats.revenue || 0),
        hint: Number(stats.today_completed || 0)
          ? `${formatNumber(stats.today_completed || 0)} đơn hoàn tất hôm nay`
          : "Chưa có đơn hoàn tất hôm nay",
      },
    ];
    const dashboardHighlights = [
      `${formatNumber(activeOrders)} đơn đang cần theo dõi`,
      `${formatNumber(stats.today_completed || 0)} đơn hoàn tất hôm nay`,
      recentStatus === "all"
        ? "Đang xem tất cả đơn gần đây"
        : `Đang lọc: ${recentStatusLabels[recentStatus] || recentStatus}`,
    ];

    content.innerHTML = `
      <section class="customer-dashboard-hero">
        <div class="customer-dashboard-hero-copy">
          <p class="customer-section-kicker">Bảng điều phối nhà cung cấp</p>
          <h2>Đơn được phân công và tiến độ giao nhận</h2>
          <p class="customer-dashboard-hero-text">Theo dõi nhanh đơn đang xử lý, mở danh sách công việc và cập nhật tiến độ giao hàng mà không phải đi qua nhiều khối thông tin nặng.</p>
        </div>
        <div class="customer-dashboard-hero-actions">
          <a href="${routes.orders}" class="customer-btn customer-btn-primary">Mở danh sách đơn</a>
          <a href="${routes.profile}" class="customer-btn customer-btn-ghost">Cập nhật hồ sơ</a>
        </div>
        <div class="customer-dashboard-highlight-list">
          ${dashboardHighlights
            .map((item) => `<span class="customer-dashboard-highlight">${escapeHtml(item)}</span>`)
            .join("")}
        </div>
      </section>
      <section class="customer-panel customer-panel-overview">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Chỉ số nhanh</p>
            <h2>Nhìn một màn là biết khối lượng công việc</h2>
          </div>
          <span class="customer-panel-note">Cập nhật theo bộ lọc hiện tại</span>
        </div>
        <div class="customer-kpi-grid">
          ${kpiCards
            .map(
              (item) => `
            <article class="customer-kpi-card customer-kpi-card-${item.tone}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${item.value}</strong>
              <small>${escapeHtml(item.hint)}</small>
            </article>`,
            )
            .join("")}
        </div>
      </section>
      <section class="customer-grid-two customer-grid-dashboard">
        <article class="customer-panel customer-panel-orders">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Đơn được giao gần đây</p>
              <h2>Theo dõi các đơn mới nhất</h2>
              <p class="customer-panel-subtext">Ưu tiên các đơn đang giao hoặc vừa được phân công cho bạn.</p>
            </div>
            <a href="${routes.orders}" class="customer-btn customer-btn-ghost customer-btn-sm">Xem tất cả</a>
          </div>
          <div class="customer-chip-group customer-chip-group-dashboard">
              ${["active", "all", "pending", "shipping", "completed", "cancelled"]
                .map(
                  (item) =>
                    `<a class="customer-chip ${recentStatus === item ? "is-active" : ""}" href="?recent_status=${encodeURIComponent(item)}">${escapeHtml(
                      recentStatusLabels[item] || item,
                    )}</a>`,
                )
                .join("")}
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
                      <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                      <p class="customer-order-recipient">${escapeHtml(order.receiver_name || "Người nhận chưa cập nhật")}</p>
                    </div>
                    ${createStatusBadge(order.status, order.status_label)}
                  </div>
                  <p class="customer-order-dest">${escapeHtml(order.pickup_address)} → ${escapeHtml(order.delivery_address)}</p>
                  <div class="customer-order-meta customer-order-meta-compact">
                    <span><b>Người gửi</b>${escapeHtml(order.sender_name || "--")}</span>
                    <span><b>Thời gian</b>${formatDateTime(order.created_at)}</span>
                  </div>
                  <div class="customer-order-actions customer-order-actions-compact">
                    <a class="customer-btn customer-btn-primary customer-btn-sm" href="${routes.detail}?madonhang=${encodeURIComponent(order.order_code || order.id)}&viewer=shipper">Xem chi tiết</a>
                  </div>
                </article>`,
                    )
                    .join("")
                : '<div class="customer-empty">Chưa có đơn nào trong bộ lọc này.</div>'
            }
          </div>
        </article>
        <aside class="customer-quicklinks-strip">
          <a href="${routes.orders}" class="customer-quicklink-item">
            <p class="customer-section-kicker">Danh sách đơn</p>
            <strong>Mở toàn bộ đơn được phân công</strong>
            <span class="customer-mobile-hidden">Tra cứu tập trung, lọc theo trạng thái và mở chi tiết xử lý ở một nơi duy nhất.</span>
          </a>
          <a href="${routes.orders}?status=shipping" class="customer-quicklink-item">
            <p class="customer-section-kicker">Đơn đang giao</p>
            <strong>Cập nhật tiến độ các đơn active</strong>
            <span class="customer-mobile-hidden">Ưu tiên gửi ảnh hoặc video báo cáo cho các đơn đang trong quá trình giao nhận.</span>
          </a>
          <a href="${routes.profile}" class="customer-quicklink-item">
            <p class="customer-section-kicker">Hồ sơ</p>
            <strong>Chỉnh thông tin tài khoản và phương tiện</strong>
            <span class="customer-mobile-hidden">Cập nhật nhanh họ tên, số điện thoại và loại phương tiện đang sử dụng.</span>
          </a>
        </aside>
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

        <form id="shipper-order-filter" class="customer-filter-form customer-filter-form-compact">
          <label>
            <span>Tìm đơn / người gửi / người nhận</span>
            <input type="text" name="search" value="${escapeHtml(filters.search || "")}" placeholder="ORD..., tên người gửi, người nhận" />
          </label>
          <label>
            <span>Trạng thái</span>
            <select name="status">
              <option value="">Tất cả</option>
              <option value="pending" ${filters.status === "pending" ? "selected" : ""}>Chờ xử lý</option>
              <option value="shipping" ${filters.status === "shipping" ? "selected" : ""}>Đang giao</option>
              <option value="completed" ${filters.status === "completed" ? "selected" : ""}>Hoàn tất</option>
              <option value="cancelled" ${filters.status === "cancelled" ? "selected" : ""}>Đã hủy</option>
            </select>
          </label>
          <label>
            <span>Từ ngày</span>
            <input type="date" name="date_from" value="${escapeHtml(filters.date_from || "")}" />
          </label>
          <label>
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
                    <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                    <p class="customer-order-dest">Từ ${escapeHtml(order.pickup_address)} đến ${escapeHtml(order.delivery_address)}</p>
                  </div>
                  ${createStatusBadge(order.status, order.status_label)}
                </div>
                <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                  <span><b>Người gửi</b>${escapeHtml(order.sender_name || "--")}</span>
                  <span><b>Người nhận</b>${escapeHtml(order.receiver_name || "--")} · ${escapeHtml(order.receiver_phone || "--")}</span>
                  <span><b>COD</b>${formatCurrency(order.cod_amount)}</span>
                  <span><b>Tạo lúc</b>${formatDateTime(order.created_at)}</span>
                </div>
                <div class="customer-order-actions customer-order-actions-compact">
                  <a class="customer-btn customer-btn-primary customer-btn-sm" href="${routes.detail}?madonhang=${encodeURIComponent(order.order_code || order.id)}&viewer=shipper">Xem chi tiết</a>
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
    const data = await apiRequest("profile");
    const { content } = getPageRoot();
    const profile = data.profile || {};
    const stats = data.stats || {};
    const activeOrders = Number(stats.pending || 0) + Number(stats.shipping || 0);
    const profileHighlights = [
      `${formatNumber(activeOrders)} đơn đang cần theo dõi`,
      `${stats.success_rate || 0}% tỷ lệ hoàn tất`,
      `${formatCurrency(stats.revenue || 0)} doanh thu giao thành công`,
    ];

    content.innerHTML = `
      <section class="customer-dashboard-hero">
        <div class="customer-dashboard-hero-copy">
          <p class="customer-section-kicker">Hồ sơ nhà cung cấp</p>
          <h2>Cập nhật thông tin và theo dõi hiệu suất</h2>
          <p class="customer-dashboard-hero-text">Giữ gọn thông tin tài khoản, phương tiện đang dùng và các chỉ số giao hàng quan trọng trên cùng một màn hình.</p>
        </div>
        <div class="customer-dashboard-hero-actions">
          <a href="${routes.orders}" class="customer-btn customer-btn-primary">Xem đơn hàng</a>
          <a href="${routes.dashboard}" class="customer-btn customer-btn-ghost">Về tổng quan</a>
        </div>
        <div class="customer-dashboard-highlight-list">
          ${profileHighlights
            .map((item) => `<span class="customer-dashboard-highlight">${escapeHtml(item)}</span>`)
            .join("")}
        </div>
      </section>
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Tổng quan tài khoản</p>
            <h2>Thông tin chính và hiệu suất giao hàng</h2>
          </div>
          <span class="customer-panel-note">Có thể cập nhật trực tiếp</span>
        </div>
        <div class="customer-detail-summary">
          <article><span>Tổng đơn</span><strong>${formatNumber(stats.total || 0)}</strong></article>
          <article><span>Đơn active</span><strong>${formatNumber(activeOrders)}</strong></article>
          <article><span>Hoàn tất</span><strong>${formatNumber(stats.completed || 0)}</strong></article>
          <article><span>Tỷ lệ hoàn tất</span><strong>${stats.success_rate || 0}%</strong></article>
        </div>
        <div class="customer-detail-grid">
          <article class="customer-info-card">
            <h3>Thông tin tài khoản</h3>
            ${renderInfoList([
              { label: "Tên đăng nhập", value: profile.username || "--" },
              { label: "Email", value: profile.email || "--" },
              { label: "Họ và tên", value: profile.fullname || "--" },
              { label: "Số điện thoại", value: profile.phone || "--" },
              { label: "Phương tiện", value: profile.vehicle_type || "--" },
              { label: "Ngày tham gia", value: formatDateOnly(profile.created_at) },
            ])}
          </article>
          <article class="customer-info-card">
            <h3>Chỉnh sửa nhanh</h3>
            <form id="shipper-profile-form" class="customer-form-stack">
              <label><span>Tên đăng nhập</span><input value="${escapeHtml(profile.username || "")}" disabled /></label>
              <label><span>Email</span><input value="${escapeHtml(profile.email || "")}" disabled /></label>
              <label><span>Họ và tên</span><input name="ho_ten" value="${escapeHtml(profile.ho_ten || profile.fullname || "")}" required /></label>
              <label><span>Số điện thoại</span><input name="so_dien_thoai" value="${escapeHtml(profile.so_dien_thoai || profile.phone || "")}" required /></label>
              <label><span>Phương tiện</span><input name="loai_phuong_tien" value="${escapeHtml(profile.loai_phuong_tien || profile.vehicle_type || "")}" placeholder="Ví dụ: Xe máy, xe tải nhỏ..." /></label>
              <label><span>Ngày tham gia</span><input value="${escapeHtml(formatDateOnly(profile.created_at))}" disabled /></label>
              <button class="customer-btn customer-btn-primary" type="submit">Lưu thông tin</button>
            </form>
          </article>
          <article class="customer-info-card">
            <h3>Đổi mật khẩu</h3>
            <form id="shipper-password-form" class="customer-form-stack">
              <label><span>Mật khẩu hiện tại</span><input name="mat_khau_hien_tai" type="password" autocomplete="current-password" required /></label>
              <label><span>Mật khẩu mới</span><input name="mat_khau_moi" type="password" minlength="8" autocomplete="new-password" required /></label>
              <label><span>Xác nhận mật khẩu mới</span><input name="xac_nhan_mat_khau_moi" type="password" minlength="8" autocomplete="new-password" required /></label>
              <small class="customer-form-helper">Mật khẩu mới cần ít nhất 8 ký tự và khác mật khẩu hiện tại.</small>
              <button class="customer-btn customer-btn-primary" type="submit">Cập nhật mật khẩu</button>
            </form>
          </article>
          <article class="customer-info-card">
            <h3>Hiệu suất vận hành</h3>
            ${renderInfoList([
              { label: "Tổng đơn được phân công", value: formatNumber(stats.total || 0) },
              { label: "Chờ xử lý", value: formatNumber(stats.pending || 0) },
              { label: "Đang giao", value: formatNumber(stats.shipping || 0) },
              { label: "Hoàn tất", value: formatNumber(stats.completed || 0) },
              { label: "Đơn hủy", value: formatNumber(stats.cancelled || 0) },
              { label: "Doanh thu giao thành công", value: formatCurrency(stats.revenue || 0) },
              { label: "Hoàn tất hôm nay", value: formatNumber(stats.today_completed || 0) },
            ])}
            <div class="customer-hint-box">
              Chỉ số được tính từ các đơn đã được phân công cho tài khoản hiện tại.
            </div>
          </article>
        </div>
      </section>
    `;

    const profileForm = document.getElementById("shipper-profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await apiRequest("update-profile", {
            method: "POST",
            body: new FormData(profileForm),
          });
          showToast("Đã cập nhật hồ sơ nhà cung cấp.", "success");
        } catch (error) {
          showToast(error.message, "error");
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
          await apiRequest("change-password", {
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

    const sessionData = await apiRequest("session");
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
