(function (window) {
  if (window.ShipperPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const routes = {
    login: "../../dang-nhap.html",
    dashboard: "dashboard.html",
    orders: "don-hang.html",
    detail: "chi-tiet-don-hang.html",
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

  function getFeePayerLabel(feePayer) {
    return String(feePayer || "").toLowerCase() === "nhan"
      ? "Người nhận"
      : "Người gửi";
  }

  function normalizeMockBreakdown(rawBreakdown, shippingFee) {
    const breakdown = rawBreakdown || {};
    return {
      base_price: Number(breakdown.base_price ?? breakdown.basePrice ?? 0),
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
    nextOrder.payment_status_label =
      nextOrder.payment_status_label ||
      (nextOrder.status === "completed" ? "Đã hoàn tất" : "Chưa hoàn tất");
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

    if (action === "order-detail") {
      const orderId = String(options.params?.id || "")
        .trim()
        .toUpperCase();
      const detail = allDetails.find((item) => {
        const itemId = String(
          item?.order?.id || item?.order?.order_code || "",
        )
          .trim()
          .toUpperCase();
        return itemId === orderId;
      });

      if (!detail) {
        throw new Error("Không tìm thấy đơn hàng phù hợp.");
      }

      const currentDetail = normalizeLocalOrderDetail(detail, session);
      return {
        status: "success",
        order: currentDetail.order || {},
        provider: {
          ...(currentDetail.provider || {}),
          stats,
        },
        customer: currentDetail.customer || {},
        items: Array.isArray(currentDetail.items) ? currentDetail.items : [],
        logs: Array.isArray(currentDetail.logs) ? currentDetail.logs : [],
      };
    }

    if (action === "update-order") {
      const formData = options.body;
      const orderId = String(formData?.get("order_id") || "")
        .trim()
        .toUpperCase();
      const currentDetail = allDetails.find((item) => {
        const itemId = String(
          item?.order?.id || item?.order?.order_code || "",
        )
          .trim()
          .toUpperCase();
        return itemId === orderId;
      });

      if (!currentDetail) {
        throw new Error("Không tìm thấy đơn để cập nhật.");
      }

      const nextDetail = normalizeLocalOrderDetail(currentDetail, session);
      const nextStatus = String(formData?.get("status") || "pending")
        .trim()
        .toLowerCase();
      const shipperNote = String(formData?.get("shipper_note") || "").trim();
      const cancelReason = String(formData?.get("cancel_reason") || "").trim();
      const uploadedFiles = Array.from(
        formData?.getAll("media_files[]") || [],
      ).filter(
        (file) =>
          file &&
          typeof file === "object" &&
          typeof file.name === "string" &&
          file.name,
      );

      const reportItems = uploadedFiles.map((file, index) => {
        const name = String(file.name || `media-${index + 1}`);
        const extension = name.includes(".")
          ? name.split(".").pop().toLowerCase()
          : "";
        return {
          id: `${Date.now()}_${index}`,
          name,
          extension,
          url: "",
          created_at: new Date().toISOString(),
        };
      });

      const oldStatus = nextDetail.order.status;
      const oldStatusLabel =
        nextDetail.order.status_label || getStatusLabel(oldStatus);
      const released = nextStatus === "decline";

      nextDetail.order.shipper_note = shipperNote;
      nextDetail.order.cancel_reason = cancelReason;
      nextDetail.provider = {
        ...buildProviderFromSession(session),
        ...(nextDetail.provider || {}),
      };
      nextDetail.provider.shipper_reports = [
        ...(Array.isArray(nextDetail.provider.shipper_reports)
          ? nextDetail.provider.shipper_reports
          : []),
        ...reportItems,
      ];

      if (released) {
        nextDetail.order.status = "pending";
        nextDetail.order.status_label = "Chờ xử lý";
      } else {
        nextDetail.order.status = nextStatus;
        nextDetail.order.status_label = getStatusLabel(nextStatus);
      }

      nextDetail.order.payment_status_label =
        nextDetail.order.status === "completed"
          ? "Đã hoàn tất"
          : "Chưa hoàn tất";

      nextDetail.logs = [
        {
          old_status_label: oldStatusLabel,
          new_status_label: released
            ? "Trả đơn về điều phối"
            : nextDetail.order.status_label,
          created_at: new Date().toISOString(),
          note:
            shipperNote ||
            cancelReason ||
            (released
              ? "Nhà cung cấp từ chối nhận đơn và trả đơn về điều phối."
              : `Nhà cung cấp cập nhật trạng thái sang ${nextDetail.order.status_label}.`),
        },
        ...(Array.isArray(nextDetail.logs) ? nextDetail.logs : []),
      ];

      persistOrderDetail(nextDetail, session);

      return {
        status: "success",
        message: released
          ? "Đã trả đơn về điều phối nội bộ."
          : "Đã cập nhật đơn hàng.",
        released,
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
            <section class="customer-side-card">
              <h2>Thông tin tài khoản</h2>
              <dl class="customer-side-meta">
                <div><dt>Tài khoản</dt><dd>${escapeHtml(user.username || "--")}</dd></div>
                <div><dt>Họ tên</dt><dd>${escapeHtml(user.fullname || "--")}</dd></div>
                <div><dt>Số điện thoại</dt><dd>${escapeHtml(user.phone || "--")}</dd></div>
                <div><dt>Phương tiện</dt><dd>${escapeHtml(user.vehicle_type || "--")}</dd></div>
              </dl>
            </section>
          </aside>
          <main class="customer-portal-main" id="shipper-page-content"></main>
        </div>
      </div>
    `;
    bindLogoutActions(shell);
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

  function getAvailableStatusOptions(currentStatus) {
    const normalized = String(currentStatus || "").toLowerCase();
    const map = {
      pending: [
        { value: "pending", label: "Giữ nguyên chờ xử lý" },
        { value: "shipping", label: "Đang giao" },
        { value: "cancelled", label: "Hủy đơn" },
        { value: "decline", label: "Từ chối / trả đơn" },
      ],
      shipping: [
        { value: "shipping", label: "Đang giao" },
        { value: "completed", label: "Hoàn tất" },
        { value: "cancelled", label: "Hủy đơn" },
      ],
      completed: [{ value: "completed", label: "Hoàn tất" }],
      cancelled: [{ value: "cancelled", label: "Đã hủy" }],
    };

    return map[normalized] || [{ value: normalized || "pending", label: "Giữ nguyên trạng thái" }];
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

  function renderFiles(items) {
    if (!items || !items.length) {
      return '<div class="customer-empty">Chưa có tệp nào được đính kèm.</div>';
    }

    return `<div class="customer-file-grid">${items
      .map(
        (item) => `
      <a class="customer-file-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
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
        const rawUrl = String(item.url || "").trim();
        const url = escapeHtml(rawUrl || "#");
        const name = escapeHtml(item.name || "Tệp đính kèm");
        const canPreview = Boolean(rawUrl);

        if (isImageExtension(extension) && canPreview) {
          return `
            <a class="customer-review-media-card" href="${url}" target="_blank" rel="noreferrer">
              <img class="customer-review-media-thumb" src="${url}" alt="${name}" />
              <div class="customer-review-media-meta">
                <strong>${name}</strong>
                <span>Ảnh đính kèm</span>
              </div>
            </a>`;
        }

        if (isVideoExtension(extension) && canPreview) {
          return `
            <a class="customer-review-media-card" href="${url}" target="_blank" rel="noreferrer">
              <video class="customer-review-media-thumb" src="${url}" preload="metadata" controls></video>
              <div class="customer-review-media-meta">
                <strong>${name}</strong>
                <span>Video đính kèm</span>
              </div>
            </a>`;
        }

        return `
          <a class="customer-review-media-card" href="${url}" target="_blank" rel="noreferrer">
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

  function renderMediaGallery(items, emptyMessage) {
    if (!items || !items.length) {
      return `<div class="customer-empty">${escapeHtml(
        emptyMessage || "Chưa có ảnh hoặc video.",
      )}</div>`;
    }

    return renderAttachmentPreview(items);
  }

  function renderBookingReview(order, items, attachments, logs) {
    const serviceMeta = order.service_meta || {};
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
          <div class="rv-row"><span class="rv-label">Ghi chú vận chuyển</span><span class="rv-val">${formatMultilineText(order.clean_note || "Không có")}</span></div>
        </section>

        <section class="customer-review-block customer-review-block--wide">
          <h3><i class="fas fa-photo-film"></i> Media đính kèm</h3>
          ${renderAttachmentPreview(attachments)}
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-calendar-check"></i> Lịch trình</h3>
          <div class="rv-row"><span class="rv-label">Tạo đơn lúc</span><span class="rv-val">${formatDateTime(order.created_at)}</span></div>
          <div class="rv-row"><span class="rv-label">Lấy hàng</span><span class="rv-val">${pickupLabel}</span></div>
          <div class="rv-row"><span class="rv-label">Thời gian giao dự kiến</span><span class="rv-val">${escapeHtml(serviceMeta.estimated_eta || "--")}</span></div>
          <div class="rv-row"><span class="rv-label">Phương tiện</span><span class="rv-val">${escapeHtml(order.vehicle_type || serviceMeta.vehicle_label || "--")}</span></div>
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
                    <a class="customer-btn customer-btn-primary customer-btn-sm" href="${routes.detail}?id=${order.id}">Xem chi tiết</a>
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
                  <a class="customer-btn customer-btn-primary customer-btn-sm" href="${routes.detail}?id=${order.id}">Xem chi tiết</a>
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

  async function initOrderDetail() {
    renderLoading("Đang tải chi tiết đơn nhà cung cấp...");
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("id");

    if (!orderId) {
      throw new Error("Thiếu id đơn hàng.");
    }

    const data = await apiRequest("order-detail", { params: { id: orderId } });
    const { content } = getPageRoot();
    const order = data.order || {};
    const provider = data.provider || {};
    const customer = data.customer || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const logs = Array.isArray(data.logs) ? data.logs : [];

    content.innerHTML = `
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Chi tiết đơn của nhà cung cấp</p>
            <h2>${escapeHtml(order.order_code || "--")}</h2>
          </div>
          <div class="customer-inline-actions">
            ${createStatusBadge(order.status, order.status_label)}
            <a class="customer-btn customer-btn-ghost" href="${routes.orders}">Về danh sách đơn</a>
          </div>
        </div>

        <div class="customer-detail-summary">
          <article><span>Người gửi</span><strong>${escapeHtml(order.sender_name || "--")}</strong></article>
          <article><span>Người nhận</span><strong>${escapeHtml(order.receiver_name || "--")}</strong></article>
          <article><span>Phương tiện</span><strong>${escapeHtml(order.vehicle_type || order.vehicle_label || "--")}</strong></article>
          <article><span>COD</span><strong>${formatCurrency(order.cod_amount)}</strong></article>
        </div>

        <div class="customer-tab-switcher" id="shipper-tab-switcher">
          <button type="button" class="is-active" data-tab="booking">Thông tin đặt dịch vụ</button>
          <button type="button" data-tab="customer">Thông tin khách hàng</button>
          <button type="button" data-tab="provider">Thông tin của chính nhà cung cấp</button>
        </div>

        <div class="customer-tab-panel is-active" data-panel="booking">
          ${renderBookingReview(order, items, provider.attachments, logs)}
        </div>

        <div class="customer-tab-panel" data-panel="customer">
          <div class="customer-detail-grid">
            <article class="customer-info-card">
              <h3>Thông tin khách hàng</h3>
              ${renderInfoList([
                { label: "Họ tên", value: customer.fullname || order.sender_name || "--" },
                { label: "Tài khoản", value: customer.username || "--" },
                { label: "Số điện thoại", value: customer.phone || order.sender_phone || "--" },
                { label: "Email", value: customer.email || "--" },
                { label: "Công ty", value: customer.company_name || "--" },
                { label: "Mã số thuế", value: customer.tax_code || "--" },
                { label: "Địa chỉ công ty", value: customer.company_address || "--" },
              ])}
            </article>
            <article class="customer-info-card">
              <h3>Thông tin hóa đơn và phản hồi</h3>
              ${renderInfoList([
                { label: "Tên đơn vị", value: customer.invoice?.company_name || "--" },
                { label: "Email nhận hóa đơn", value: customer.invoice?.company_email || "--" },
                { label: "Mã số thuế", value: customer.invoice?.company_tax_code || "--" },
                { label: "Địa chỉ hóa đơn", value: customer.invoice?.company_address || "--" },
                { label: "Ngân hàng", value: customer.invoice?.company_bank_info || "--" },
                { label: "Khách đánh giá", value: order.rating ? `${order.rating}/5 sao` : "Chưa có" },
                { label: "Nội dung phản hồi", value: order.feedback || "Chưa có phản hồi từ khách" },
              ])}
            </article>
          </div>
        </div>

        <div class="customer-tab-panel" data-panel="provider">
          <div class="customer-detail-grid">
            <article class="customer-info-card">
              <h3>Thông tin của chính nhà cung cấp</h3>
              ${renderInfoList([
                { label: "Họ tên", value: provider.fullname || "--" },
                { label: "Tài khoản", value: provider.username || "--" },
                { label: "Số điện thoại", value: provider.phone || "--" },
                { label: "Email", value: provider.email || "--" },
                { label: "Phương tiện", value: provider.vehicle_type || order.vehicle_type || "--" },
              ])}
              ${
                order.pod_image
                  ? `<div class="customer-media-preview"><img src="${escapeHtml(order.pod_image)}" alt="Bang chung giao hang ${escapeHtml(order.order_code || "")}" /></div>`
                  : ""
              }
            </article>
            <article class="customer-info-card">
              <h3>Hiệu suất và báo cáo đã gửi</h3>
              ${renderInfoList([
                { label: "Tổng đơn được giao", value: formatNumber(provider.stats?.total || 0) },
                { label: "Hoàn tất", value: formatNumber(provider.stats?.completed || 0) },
                { label: "Đang giao", value: formatNumber(provider.stats?.shipping || 0) },
                { label: "Tỷ lệ hoàn tất", value: `${provider.stats?.success_rate || 0}%` },
              ])}
              <h4 class="customer-subheading">Ảnh và video báo cáo</h4>
              ${renderMediaGallery(provider.shipper_reports, "Chưa có ảnh hoặc video báo cáo nào.")}
            </article>
          </div>

          <article class="customer-info-card">
            <h3>Cập nhật tiến độ và báo cáo công việc</h3>
            <form id="shipper-order-form" class="customer-form-stack">
              <input type="hidden" name="order_id" value="${order.id}" />
              <div class="customer-form-grid">
                <label>
                  <span>Trạng thái mới</span>
                  <select name="status" required>
                    ${getAvailableStatusOptions(order.status)
                      .map(
                        (option) =>
                          `<option value="${escapeHtml(option.value)}" ${order.status === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
                      )
                      .join("")}
                  </select>
                </label>
                <label class="customer-form-full">
                  <span>Ghi chú nhà cung cấp</span>
                  <textarea name="shipper_note" rows="4" placeholder="Mô tả tiến độ, tình trạng giao nhận hoặc vấn đề cần báo cáo.">${escapeHtml(order.shipper_note || "")}</textarea>
                </label>
                <label class="customer-form-full">
                  <span>Lý do hủy đơn</span>
                  <textarea name="cancel_reason" rows="3" placeholder="Chỉ nhập khi chọn trạng thái hủy đơn.">${escapeHtml(order.cancel_reason || "")}</textarea>
                </label>
              </div>
              <div class="customer-media-actions">
                <label class="customer-btn customer-btn-ghost">
                  Chụp ảnh
                  <input type="file" id="shipper-capture-image" accept="image/*" capture="environment" hidden />
                </label>
                <label class="customer-btn customer-btn-ghost">
                  Quay video
                  <input type="file" id="shipper-capture-video" accept="video/*" capture="environment" hidden />
                </label>
                <label class="customer-btn customer-btn-ghost">
                  Tải ảnh/video
                  <input type="file" id="shipper-upload" accept="image/*,video/*" multiple hidden />
                </label>
              </div>
              <div class="customer-selected-files" id="shipper-selected-files">Chưa chọn tệp báo cáo nào.</div>
              <div class="customer-hint-box">
                Ảnh và video nhà cung cấp tải lên sẽ được lưu để quản lý theo dõi và để khách hàng xem lại quá trình làm việc thực tế.
              </div>
              <div class="customer-inline-actions">
                <button class="customer-btn customer-btn-primary" type="submit">Lưu cập nhật đơn</button>
              </div>
            </form>
          </article>
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

    const captureImage = document.getElementById("shipper-capture-image");
    const captureVideo = document.getElementById("shipper-capture-video");
    const uploadInput = document.getElementById("shipper-upload");
    const selectedFilesHost = document.getElementById("shipper-selected-files");
    const updateForm = document.getElementById("shipper-order-form");

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
        : "Chưa chọn tệp báo cáo nào.";
    }

    [captureImage, captureVideo, uploadInput].forEach((input) => {
      if (input) input.addEventListener("change", refreshSelectedFiles);
    });

    if (updateForm) {
      updateForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(updateForm);
        [captureImage, captureVideo, uploadInput].forEach((input) => {
          if (input && input.files) {
            Array.from(input.files).forEach((file) =>
              formData.append("media_files[]", file),
            );
          }
        });

        try {
          const result = await apiRequest("update-order", {
            method: "POST",
            body: formData,
          });
          showToast(result.message || "Đã cập nhật đơn hàng.", "success");
          if (result.released) {
            window.location.href = routes.orders;
            return;
          }
          window.location.reload();
        } catch (error) {
          showToast(error.message, "error");
        }
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

    const sessionData = await apiRequest("session");
    syncPublicHeader(sessionData.user || {});
    renderShell(sessionData.user || {}, page);

    switch (page) {
      case "dashboard":
        await initDashboard();
        break;
      case "orders":
        await initOrders();
        break;
      case "detail":
        await initOrderDetail();
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
