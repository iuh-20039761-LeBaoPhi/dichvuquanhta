(function (window) {
  if (window.CustomerPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const localAuth = window.GiaoHangNhanhLocalAuth || null;
  const routes = {
    login: "../../dang-nhap.html",
    booking: "../../dat-lich-giao-hang-nhanh.html",
    dashboard: "dashboard.html",
    orders: "lich-su-don-hang.html",
    detail: "chi-tiet-don-hang.html",
    profile: "ho-so.html",
    logout: "../../dang-nhap.html",
  };
  const storageKeys = {
    orders: "ghn-customer-orders",
    addresses: "ghn-customer-addresses",
  };

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
    return "Chờ xử lý";
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
        ? nextDetail.provider
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

  async function getAllOrderDetails() {
    const localDetails = (readJson(storageKeys.orders, []) || []).map(
      normalizeLocalOrderDetail,
    );
    return localDetails.sort((left, right) => {
      const leftTime = new Date(left?.order?.created_at || 0).getTime();
      const rightTime = new Date(right?.order?.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }

  function persistOrderDetail(detail) {
    const nextDetail = normalizeLocalOrderDetail(detail);
    const current = (readJson(storageKeys.orders, []) || []).map(
      normalizeLocalOrderDetail,
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
        company_name: nextUser.company_name || "",
        tax_code: nextUser.tax_code || "",
        company_address: nextUser.company_address || "",
      }),
    );
    return nextUser;
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

  function buildLoginRedirect() {
    const target = `${window.location.pathname}${window.location.search}`;
    return `${routes.login}?redirect=${encodeURIComponent(target)}`;
  }

  async function requestLocalData(action, options = {}) {
    const session = getCurrentSessionUser();

    if (!session) {
      window.location.href = buildLoginRedirect();
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    const allDetails = await getAllOrderDetails();
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
      const currentDetail =
        allDetails.find((item) => {
          const itemId = String(
            item?.order?.id || item?.order?.order_code || "",
          )
            .trim()
            .toUpperCase();
          return itemId === orderId;
        }) || null;
      if (!currentDetail) {
        throw new Error("Không tìm thấy đơn hàng cần hủy.");
      }
      const nextDetail = normalizeLocalOrderDetail(currentDetail);
      nextDetail.order.status = "cancelled";
      nextDetail.order.status_label = "Đã hủy";
      nextDetail.logs = [
        {
          old_status_label:
            currentDetail.order.status_label ||
            getStatusLabel(currentDetail.order.status),
          new_status_label: "Đã hủy",
          created_at: new Date().toISOString(),
          note: reason || "Khách hàng chủ động hủy đơn.",
        },
        ...(Array.isArray(currentDetail.logs) ? currentDetail.logs : []),
      ];
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
      const currentDetail =
        allDetails.find((item) => {
          const itemId = String(
            item?.order?.id || item?.order?.order_code || "",
          )
            .trim()
            .toUpperCase();
          return itemId === orderId;
        }) || null;
      if (!currentDetail) {
        throw new Error("Không tìm thấy đơn hàng để gửi phản hồi.");
      }
      const mediaFiles = formData?.getAll("media_files[]") || [];
      const feedbackMedia = mediaFiles.map((file, index) => ({
        name: file?.name || `feedback-${index + 1}`,
        extension:
          String(file?.name || "")
            .split(".")
            .pop() || "file",
        url: "#",
      }));
      const nextDetail = normalizeLocalOrderDetail(currentDetail);
      nextDetail.order.rating = rating;
      nextDetail.order.feedback = feedback;
      nextDetail.provider.feedback_media = feedbackMedia;
      persistOrderDetail(nextDetail);
      return { status: "success" };
    }

    if (action === "profile") {
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
          ...session,
          ho_ten: session.fullname || "",
          so_dien_thoai: session.phone || "",
          ten_cong_ty: session.company_name || "",
          ma_so_thue: session.tax_code || "",
          dia_chi_cong_ty: session.company_address || "",
        },
        stats,
        saved_addresses: getSavedAddresses(session.id),
      };
    }

    if (action === "update-profile") {
      const formData = options.body;
      const updatedUser = updateAuthStorage((currentUser) => ({
        ...currentUser,
        fullname: String(
          formData?.get("ho_ten") || currentUser.fullname || "",
        ).trim(),
        phone: String(
          formData?.get("so_dien_thoai") || currentUser.phone || "",
        ).trim(),
        company_name: String(
          formData?.get("ten_cong_ty") || currentUser.company_name || "",
        ).trim(),
        tax_code: String(
          formData?.get("ma_so_thue") || currentUser.tax_code || "",
        ).trim(),
        company_address: String(
          formData?.get("dia_chi_cong_ty") || currentUser.company_address || "",
        ).trim(),
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
        dashboard: "../nha-cung-cap/dashboard.html",
        orders: "../nha-cung-cap/don-hang.html",
        profile: "../nha-cung-cap/ho-so.html",
      };
      const target = targetByPage[page] || "../nha-cung-cap/dashboard.html";
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

    if (loginItem) {
      loginItem.innerHTML = `<a href="${routes.dashboard}">Xin chào, ${firstName}</a>`;
    }

    if (registerItem) {
      registerItem.innerHTML = `<a href="${routes.profile}" class="btn-primary nav-auth-cta">Tài khoản</a>`;
    }
  }

  function bindLogoutActions(root = document) {
    root.querySelectorAll("[data-local-logout]").forEach((link) => {
      if (link.dataset.logoutBound === "1") return;
      link.dataset.logoutBound = "1";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        if (localAuth && typeof localAuth.clearSession === "function") {
          localAuth.clearSession();
        }
        window.location.href = buildLoginRedirect();
      });
    });
  }

  function renderShell(user, activePage) {
    const { shell } = getPageRoot();
    if (!shell) return;

    const activeClass = (page) => (page === activePage ? "is-active" : "");
    const firstName = getFirstName(user) || "Khách hàng";

    shell.innerHTML = `
      <div class="customer-portal-shell">
        <section class="customer-portal-topbar">
          <div>
            <p class="customer-portal-eyebrow">Khu vực khách hàng</p>
            <h1 class="customer-portal-title">Xin chào, ${escapeHtml(firstName)}</h1>
            <p class="customer-portal-subtitle">
              Quản lý lịch sử đơn hàng và cập nhật hồ sơ cá nhân
              ngay trên giao diện website.
            </p>
          </div>
          <div class="customer-portal-top-actions">
            <a href="${routes.booking}" class="customer-btn customer-btn-primary">Tạo đơn mới</a>
            <a href="${routes.logout}" class="customer-btn customer-btn-ghost" data-local-logout="1">Đăng xuất</a>
          </div>
        </section>
        <div class="customer-portal-layout">
          <aside class="customer-portal-sidebar">
            <section class="customer-side-card">
              <h2>Menu cá nhân</h2>
              <nav class="customer-side-nav">
                <a class="${activeClass("dashboard")}" href="${routes.dashboard}">Tổng quan</a>
                <a class="${activeClass("orders")}" href="${routes.orders}">Lịch sử đơn hàng</a>
                <a class="${activeClass("profile")}" href="${routes.profile}">Hồ sơ cá nhân</a>
              </nav>
            </section>
          </aside>
          <main class="customer-portal-main" id="customer-page-content"></main>
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

  function isOrderCancelable(order) {
    if (!order) return false;
    if (typeof order.can_cancel === "boolean") return order.can_cancel;
    return String(order.status || "").toLowerCase() === "pending";
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

    const createLink = (page, label, active = false) => {
      const url = new URL(window.location.href);
      url.searchParams.set("page", page);
      return `<a href="${escapeHtml(url.search)}" class="customer-page-btn ${active ? "is-active" : ""}">${escapeHtml(label)}</a>`;
    };

    if (currentPage > 1) buttons.push(createLink(currentPage - 1, "Trước"));
    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(createLink(page, String(page), currentPage === page));
    }
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

  function renderFeeBreakdownRows(breakdown, shippingFee) {
    const rows = [
      { label: "Phí vận chuyển", value: breakdown.base_price || 0 },
      { label: "Phụ phí loại hàng", value: breakdown.goods_fee || 0 },
      { label: "Phụ phí khung giờ", value: breakdown.time_fee || 0 },
      { label: "Phụ phí thời tiết", value: breakdown.condition_fee || 0 },
      { label: "Điều chỉnh theo xe", value: breakdown.vehicle_fee || 0 },
      { label: "Phí COD", value: breakdown.cod_fee || 0 },
      { label: "Phí bảo hiểm", value: breakdown.insurance_fee || 0 },
    ].filter((item, index) => (index < 5 ? true : Number(item.value || 0) > 0));

    if (!rows.length) {
      rows.push({
        label: "Tổng phí vận chuyển",
        value: shippingFee || 0,
      });
    }

    return `
      ${rows
        .map(
          (item) => `
        <div class="rv-row">
          <span class="rv-label">${escapeHtml(item.label)}</span>
          <span class="rv-val">${formatCurrency(item.value)}</span>
        </div>`,
        )
        .join("")}
      <div class="rv-total-row">
        <span>Tổng cước</span>
        <strong>${formatCurrency(
          breakdown.total_fee > 0 ? breakdown.total_fee : shippingFee || 0,
        )}</strong>
      </div>
    `;
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
        const url = escapeHtml(item.url || "#");
        const name = escapeHtml(item.name || "Tệp đính kèm");

        if (isImageExtension(extension)) {
          return `
            <a class="customer-review-media-card" href="${url}" target="_blank" rel="noreferrer">
              <img class="customer-review-media-thumb" src="${url}" alt="${name}" />
              <div class="customer-review-media-meta">
                <strong>${name}</strong>
                <span>Ảnh đính kèm</span>
              </div>
            </a>`;
        }

        if (isVideoExtension(extension)) {
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
    const recentStatusLabels = {
      all: "Tất cả",
      pending: "Chờ xử lý",
      shipping: "Đang giao",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
    };
    const totalOrders = Number(stats.total || 0);
    const activeOrders =
      Number(stats.pending || 0) + Number(stats.shipping || 0);
    const kpiCards = [
      {
        label: "Tổng đơn",
        value: formatNumber(totalOrders),
        hint: totalOrders ? "Toàn bộ đơn đã tạo" : "Chưa phát sinh đơn mới",
      },
      {
        label: "Đang giao",
        value: formatNumber(stats.shipping || 0),
        hint: Number(stats.shipping || 0)
          ? "Đơn đang luân chuyển"
          : "Không có đơn đang giao",
      },
      {
        label: "Chờ xử lý",
        value: formatNumber(stats.pending || 0),
        hint: Number(stats.pending || 0)
          ? "Cần theo dõi sớm"
          : "Hiện không có đơn chờ",
      },
    ];
    const heroState = Number(stats.shipping || 0)
      ? `${formatNumber(stats.shipping || 0)} đơn đang giao`
      : Number(stats.pending || 0)
        ? `${formatNumber(stats.pending || 0)} đơn chờ xử lý`
        : "Chưa có đơn cần theo dõi ngay";
    const recentOrdersPreview = recentOrders.slice(0, 3);

    content.innerHTML = `
      <section class="customer-dashboard-hero">
        <div class="customer-dashboard-hero-copy">
          <p class="customer-section-kicker">Bảng điều khiển khách hàng</p>
          <h2>Theo dõi đơn hàng của bạn trong một màn hình</h2>
          <p class="customer-dashboard-hero-state">${escapeHtml(heroState)}</p>
          <p class="customer-dashboard-hero-text">Mở nhanh lịch sử đơn, kiểm tra tiến độ gần nhất và đi tiếp tới thao tác cần làm ngay.</p>
        </div>
        <div class="customer-dashboard-hero-actions">
          <a href="${routes.booking}" class="customer-btn customer-btn-primary">Tạo đơn mới</a>
          <a href="${routes.orders}" class="customer-btn customer-btn-ghost">Lịch sử đơn</a>
        </div>
      </section>
      <section class="customer-dashboard-stats">
        <div class="customer-kpi-grid customer-kpi-grid-dashboard">
          ${kpiCards
            .map(
              (item) => `
            <article class="customer-kpi-card">
              <span>${escapeHtml(item.label)}</span>
              <strong>${item.value}</strong>
              <small>${escapeHtml(item.hint)}</small>
            </article>`,
            )
            .join("")}
        </div>
      </section>
      <section class="customer-panel customer-panel-orders customer-panel-orders-main">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Đơn gần đây</p>
              <h2>3 đơn gần nhất cần bạn theo dõi</h2>
              <p class="customer-panel-subtext">Tập trung vào các đơn vừa tạo hoặc đang thay đổi trạng thái.</p>
            </div>
            <a href="${routes.orders}" class="customer-btn customer-btn-ghost customer-btn-sm">Xem tất cả</a>
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
                      <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                      <p class="customer-order-recipient">Người nhận: ${escapeHtml(order.receiver_name || "Chưa cập nhật")}</p>
                    </div>
                    ${createStatusBadge(order.status, order.status_label)}
                  </div>
                  <p class="customer-order-route">Từ ${escapeHtml(order.pickup_address || "--")} đến ${escapeHtml(order.delivery_address || "--")}</p>
                  <div class="customer-order-meta customer-order-meta-compact">
                    <span><b>Dịch vụ</b>${escapeHtml(order.service_label || "--")}</span>
                    <span><b>Cước phí</b>${formatCurrency(order.shipping_fee)}</span>
                    <span><b>Thời gian</b>${formatDateTime(order.created_at)}</span>
                  </div>
                  <div class="customer-order-actions customer-order-actions-compact">
                    ${renderCancelButton(order, true)}
                    <a class="customer-btn customer-btn-primary customer-btn-sm" href="${routes.detail}?id=${order.id}">Xem chi tiết</a>
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
            <h2>Tra cứu và xem lại đơn theo trạng thái</h2>
            <p class="customer-panel-subtext">Trang ${formatNumber(currentPage)} / ${formatNumber(totalPages)} · ${formatNumber(totalResults)} đơn phù hợp với bộ lọc hiện tại.</p>
          </div>
          <span class="customer-panel-note">Quản lý tập trung</span>
        </div>

        <form id="customer-order-filter" class="customer-filter-form customer-filter-form-compact">
          <label>
            <span>Tìm mã đơn / người nhận</span>
            <input type="text" name="search" value="${escapeHtml(filters.search || "")}" placeholder="ORD..., tên người nhận, số điện thoại" />
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
                  .map(
                    (item) =>
                      `<span class="customer-chip customer-chip-muted">${escapeHtml(item)}</span>`,
                  )
                  .join("")
              : '<span class="customer-active-filters-note">Đang hiển thị toàn bộ đơn hàng của bạn.</span>'
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
                  <span><b>Dịch vụ</b>${escapeHtml(order.service_label || "--")}</span>
                  <span><b>Phí ship</b>${formatCurrency(order.shipping_fee)}</span>
                  <span><b>COD</b>${formatCurrency(order.cod_amount)}</span>
                  <span><b>Tạo lúc</b>${formatDateTime(order.created_at)}</span>
                </div>
                <div class="customer-order-actions customer-order-actions-compact">
                  ${renderCancelButton(order, true)}
                  <a class="customer-btn customer-btn-primary customer-btn-sm" href="${routes.detail}?id=${order.id}">Xem chi tiết</a>
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

  async function initOrderDetail() {
    renderLoading("Đang tải chi tiết đơn hàng...");
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("id");

    if (!orderId) {
      throw new Error("Thiếu id đơn hàng.");
    }

    const data = await getOrderDetailData(orderId);
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
              ${renderFiles(provider.feedback_media)}
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
      const selectedFilesHost = document.getElementById(
        "customer-selected-files",
      );

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
            Array.from(input.files).forEach((file) =>
              formData.append("media_files[]", file),
            );
          }
        });

        try {
          await apiRequest("submit-feedback", {
            method: "POST",
            body: formData,
          });
          showToast("Đã gửi phản hồi và media thành công.", "success");
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

    content.innerHTML = `
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Hồ sơ cá nhân</p>
            <h2>Cập nhật thông tin cá nhân</h2>
          </div>
          <a href="${routes.orders}" class="customer-btn customer-btn-ghost">Xem lịch sử đơn</a>
        </div>
        <div class="customer-detail-grid">
          <article class="customer-info-card">
            <h3>Thông tin liên hệ</h3>
            <form id="customer-profile-form" class="customer-form-stack">
              <label><span>Họ và tên</span><input name="ho_ten" value="${escapeHtml(profile.ho_ten || profile.fullname || "")}" required /></label>
              <label><span>Số điện thoại</span><input name="so_dien_thoai" value="${escapeHtml(profile.so_dien_thoai || profile.phone || "")}" required /></label>
              <button class="customer-btn customer-btn-primary" type="submit">Lưu thông tin</button>
            </form>
          </article>
          <article class="customer-info-card">
            <h3>Đổi mật khẩu</h3>
            <form id="customer-password-form" class="customer-form-stack">
              <label><span>Mật khẩu hiện tại</span><input name="mat_khau_hien_tai" type="password" autocomplete="current-password" required /></label>
              <label><span>Mật khẩu mới</span><input name="mat_khau_moi" type="password" minlength="8" autocomplete="new-password" required /></label>
              <label><span>Xác nhận mật khẩu mới</span><input name="xac_nhan_mat_khau_moi" type="password" minlength="8" autocomplete="new-password" required /></label>
              <small class="customer-form-helper">Mật khẩu mới cần ít nhất 8 ký tự và khác mật khẩu hiện tại.</small>
              <button class="customer-btn customer-btn-primary" type="submit">Cập nhật mật khẩu</button>
            </form>
          </article>
        </div>
      </section>
    `;

    const profileForm = document.getElementById("customer-profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await apiRequest("update-profile", {
            method: "POST",
            body: new FormData(profileForm),
          });
          showToast("Đã cập nhật hồ sơ cá nhân.", "success");
          window.setTimeout(() => {
            window.location.reload();
          }, 600);
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }

    const passwordForm = document.getElementById("customer-password-form");
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
    const page = document.body.dataset.customerPage;
    if (!page) return;

    const sessionData = await getSessionData();
    if (redirectNonCustomer(sessionData.user, page)) {
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
      case "detail":
        await initOrderDetail();
        break;
      case "profile":
        await initProfile();
        break;
      default:
        throw new Error("Trang khách hàng không hợp lệ.");
    }
  }

  window.CustomerPortal = { init };
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      renderError(error);
    });
  });
})(window);
