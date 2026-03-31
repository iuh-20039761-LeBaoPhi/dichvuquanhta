(function (window) {
  if (window.CustomerPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const apiUrl = "../../khach-hang-giaohang/api/customer_portal.php";
  const mockDataUrl = "../assets/data/mock-tracking-orders.json";
  const routes = {
    login: "../../dang-nhap.html",
    dashboard: "dashboard.html",
    orders: "lich-su-don-hang.html",
    detail: "chi-tiet-don-hang.html",
    profile: "ho-so.html",
    logout:
      typeof core.toApiUrl === "function"
        ? core.toApiUrl("logout.php")
        : "../logout.php",
  };

  let mockDatasetPromise = null;

  function isMockMode() {
    return new URLSearchParams(window.location.search).get("mock") === "1";
  }

  async function loadMockDataset() {
    if (!mockDatasetPromise) {
      const mockUrl = new URL(mockDataUrl, window.location.href);
      mockDatasetPromise = fetch(mockUrl.toString(), {
        credentials: "same-origin",
      }).then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          throw new Error("Không đọc được dữ liệu mock để test chi tiết đơn.");
        }
        return data;
      });
    }

    return mockDatasetPromise;
  }

  function findMockOrderRecord(dataset, orderId) {
    const items = Array.isArray(dataset?.tracking_orders)
      ? dataset.tracking_orders
      : [];
    const normalizedOrderId = String(orderId || "").trim().toUpperCase();

    return (
      items.find((item) => {
        const trackingCode = String(item?.tracking?.order_code || "")
          .trim()
          .toUpperCase();
        const detailId = String(
          item?.order?.id ||
            item?.order?.order_code ||
            item?.detail?.order?.id ||
            item?.detail?.order?.order_code ||
            "",
        )
          .trim()
          .toUpperCase();

        return (
          normalizedOrderId &&
          (normalizedOrderId === trackingCode || normalizedOrderId === detailId)
        );
      }) || null
    );
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
      so_luong_lon: "bulk",
      quoc_te_tiet_kiem: "intl_economy",
      quoc_te_hoa_toc: "intl_express",
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

  function normalizeMockOrderDetail(record, dataset) {
    const rawOrder = record?.order || record?.detail?.order || {};
    const tracking = record?.tracking || {};
    const rawProvider = record?.provider || record?.detail?.provider || {};
    const items = normalizeMockItems(record?.items || record?.detail?.items || []);
    const shippingFee = Number(
      rawOrder.shipping_fee ?? rawOrder.total_fee ?? tracking.shipping_fee ?? 0,
    );
    const status =
      rawOrder.status || tracking.status || tracking.status_raw || "pending";
    const serviceMeta = rawOrder.service_meta || {};
    const order = {
      ...rawOrder,
      id: rawOrder.id || rawOrder.order_code || tracking.order_code || "",
      order_code: rawOrder.order_code || tracking.order_code || rawOrder.id || "",
      status,
      status_label:
        rawOrder.status_label ||
        tracking.status_label ||
        tracking.status_text ||
        getStatusLabel(status),
      service_label: getServiceLabel(
        rawOrder.service_type,
        rawOrder.service_label || rawOrder.service_name,
      ),
      shipping_fee: shippingFee,
      cod_amount: Number(
        rawOrder.cod_amount ?? rawOrder.cod_value ?? tracking.cod_amount ?? 0,
      ),
      payment_method: rawOrder.payment_method || "",
      payment_method_label:
        rawOrder.payment_method_label ||
        serviceMeta.payment_method_label ||
        getPaymentMethodLabel(rawOrder.payment_method),
      payer_label:
        rawOrder.payer_label ||
        serviceMeta.payer_label ||
        getFeePayerLabel(rawOrder.fee_payer),
      clean_note: rawOrder.clean_note || rawOrder.notes || "",
      vehicle_type:
        rawOrder.vehicle_type || rawOrder.vehicle_label || serviceMeta.vehicle_label || "",
      created_at: rawOrder.created_at || tracking.created_at || "",
      fee_breakdown: normalizeMockBreakdown(
        rawOrder.pricing_breakdown || rawOrder.fee_breakdown,
        shippingFee,
      ),
      service_meta: {
        ...serviceMeta,
        service_name: getServiceLabel(
          rawOrder.service_type,
          serviceMeta.service_name || rawOrder.service_name || rawOrder.service_label,
        ),
        estimated_eta:
          serviceMeta.estimated_eta || rawOrder.estimated_delivery || "",
        pickup_date: serviceMeta.pickup_date || rawOrder.pickup_date || "",
        pickup_slot: serviceMeta.pickup_slot || rawOrder.pickup_slot || "",
        pickup_slot_label:
          serviceMeta.pickup_slot_label || rawOrder.pickup_slot_label || "--",
        delivery_date: serviceMeta.delivery_date || rawOrder.delivery_date || "",
        delivery_slot_label:
          serviceMeta.delivery_slot_label ||
          rawOrder.delivery_slot_label ||
          "--",
        vehicle_label:
          serviceMeta.vehicle_label ||
          rawOrder.vehicle_label ||
          rawOrder.vehicle_type ||
          "--",
        service_condition_label:
          serviceMeta.service_condition_label ||
          rawOrder.service_condition_label ||
          "",
        payer_label:
          serviceMeta.payer_label || getFeePayerLabel(rawOrder.fee_payer),
        payment_method_label:
          serviceMeta.payment_method_label ||
          getPaymentMethodLabel(rawOrder.payment_method),
        distance_km: Number(
          serviceMeta.distance_km ?? rawOrder.khoang_cach_km ?? 0,
        ),
      },
    };

    return {
      status: "success",
      order,
      provider: {
        ...rawProvider,
        shipper_vehicle:
          rawProvider.shipper_vehicle ||
          rawProvider.vehicle_type ||
          order.vehicle_type ||
          "",
        attachments: Array.isArray(rawProvider.attachments)
          ? rawProvider.attachments
          : [],
        shipper_reports: Array.isArray(rawProvider.shipper_reports)
          ? rawProvider.shipper_reports
          : [],
        feedback_media: Array.isArray(rawProvider.feedback_media)
          ? rawProvider.feedback_media
          : [],
      },
      customer:
        record?.customer ||
        record?.detail?.customer ||
        dataset?.session?.user || {
          fullname: order.sender_name || "",
          phone: order.sender_phone || "",
          email: "",
        },
      items,
      logs: Array.isArray(record?.logs)
        ? record.logs
        : Array.isArray(record?.detail?.logs)
          ? record.detail.logs
          : [],
    };
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

  function buildLoginRedirect() {
    const target = `${window.location.pathname}${window.location.search}`;
    return `${routes.login}?redirect=${encodeURIComponent(target)}`;
  }

  async function apiRequest(action, options = {}) {
    const method = options.method || "GET";
    const url = new URL(apiUrl, window.location.href);
    url.searchParams.set("action", action);

    if (method === "GET" && options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      credentials: "same-origin",
      body: method === "GET" ? undefined : options.body,
    });

    const data = await response.json().catch(() => ({
      status: "error",
      message: "Phản hồi máy chủ không hợp lệ.",
    }));

    if (response.status === 401) {
      window.location.href = buildLoginRedirect();
      throw new Error(data.message || "Phiên đăng nhập đã hết hạn.");
    }

    if (!response.ok || data.status !== "success") {
      throw new Error(data.message || "Có lỗi xảy ra khi tải dữ liệu.");
    }

    return data;
  }

  async function getSessionData() {
    if (!isMockMode()) {
      return apiRequest("session");
    }

    const dataset = await loadMockDataset();
    return {
      status: "success",
      user: dataset?.session?.user || {
        username: "mock_customer",
        fullname: "Khách hàng test",
        phone: "0900000000",
        email: "mock@example.com",
      },
    };
  }

  async function getOrderDetailData(orderId) {
    if (!isMockMode()) {
      return apiRequest("order-detail", { params: { id: orderId } });
    }

    const dataset = await loadMockDataset();
    const record = findMockOrderRecord(dataset, orderId);

    if (!record) {
      throw new Error("Không tìm thấy dữ liệu mock cho chi tiết đơn hàng.");
    }

    return normalizeMockOrderDetail(record, dataset);
  }

  function getPageRoot() {
    return {
      shell: document.getElementById("customer-shell"),
      content: document.getElementById("customer-page-content"),
    };
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
            <a href="${routes.logout}" class="customer-btn customer-btn-ghost">Đăng xuất</a>
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
            <section class="customer-side-card">
              <h2>Thông tin tài khoản</h2>
              <dl class="customer-side-meta">
                <div><dt>Tài khoản</dt><dd>${escapeHtml(user.username || "--")}</dd></div>
                <div><dt>Họ tên</dt><dd>${escapeHtml(user.fullname || "--")}</dd></div>
                <div><dt>Số điện thoại</dt><dd>${escapeHtml(user.phone || "--")}</dd></div>
                <div><dt>Email</dt><dd>${escapeHtml(user.email || "--")}</dd></div>
              </dl>
            </section>
          </aside>
          <main class="customer-portal-main" id="customer-page-content"></main>
        </div>
      </div>
    `;
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
    const confirmCancel = window.confirm(
      `Bạn có chắc muốn hủy đơn ${orderCode || `#${orderId}`} không?`,
    );
    if (!confirmCancel) return false;

    const reason =
      window.prompt(
        "Nhập lý do hủy đơn (có thể để trống nếu không cần):",
        "Khách hàng chủ động hủy đơn.",
      ) || "";

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

  function renderFeeBreakdownRows(breakdown, shippingFee) {
    const rows = [
      { label: "Phí vận chuyển", value: breakdown.base_price || 0 },
      { label: "Phí trọng lượng vượt mức", value: breakdown.overweight_fee || 0 },
      { label: "Phí thể tích", value: breakdown.volume_fee || 0 },
      { label: "Phụ phí loại hàng", value: breakdown.goods_fee || 0 },
      { label: "Phí khung giờ", value: breakdown.time_fee || 0 },
      { label: "Phụ phí điều kiện thực tế", value: breakdown.condition_fee || 0 },
      { label: "Phí phương tiện", value: breakdown.vehicle_fee || 0 },
      { label: "Phí COD", value: breakdown.cod_fee || 0 },
      { label: "Phí bảo hiểm", value: breakdown.insurance_fee || 0 },
    ].filter((item) => Number(item.value || 0) > 0);

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
      provider?.shipper_name ||
      provider?.fullname ||
      provider?.username ||
      "--"
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

  function renderServiceMeta(order) {
    const meta = order.service_meta || {};
    const normalizedServiceType = normalizeServiceType(order.service_type);
    return renderInfoList([
      { label: "Gói dịch vụ", value: meta.service_name || order.service_label || "--" },
      { label: "ETA dự kiến", value: meta.estimated_eta || "--" },
      { label: "Ngày lấy hàng", value: meta.pickup_date || formatDateOnly(order.pickup_time) },
      { label: "Khung giờ lấy hàng", value: meta.pickup_slot_label || "--" },
      { label: "Ngày nhận mong muốn", value: meta.delivery_date || "--" },
      { label: "Khung giờ nhận mong muốn", value: meta.delivery_slot_label || "--" },
      { label: "Phương tiện tính giá", value: meta.vehicle_label || order.vehicle_type || "--" },
      { label: "Phương tiện gợi ý", value: meta.vehicle_suggestion || "--" },
      {
        label: "Điều kiện tính giá khi đặt lịch",
        value:
          meta.service_condition_label ||
          (normalizedServiceType === "instant" ? "Bình thường" : "Không áp dụng"),
      },
      { label: "Khoảng cách tuyến", value: meta.distance_label || "--" },
      { label: "Người trả cước", value: meta.payer_label || order.payer_label || "--" },
      { label: "Phương thức thanh toán", value: meta.payment_method_label || order.payment_method_label || "--" },
    ]);
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
    const recentOrders = Array.isArray(data.recent_orders) ? data.recent_orders : [];
    const recentStatusLabels = {
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
        hint: totalOrders ? "Toàn bộ đơn đã tạo" : "Chưa phát sinh đơn mới",
      },
      {
        tone: "pending",
        label: "Chờ xử lý",
        value: formatNumber(stats.pending || 0),
        hint: Number(stats.pending || 0) ? "Cần theo dõi sớm" : "Hiện không có đơn chờ",
      },
      {
        tone: "shipping",
        label: "Đang giao",
        value: formatNumber(stats.shipping || 0),
        hint: Number(stats.shipping || 0) ? "Đơn đang luân chuyển" : "Không có đơn đang giao",
      },
      {
        tone: "completed",
        label: "Hoàn tất",
        value: formatNumber(stats.completed || 0),
        hint: Number(stats.completed || 0) ? "Đã giao thành công" : "Chưa có đơn hoàn tất",
      },
      {
        tone: "unpaid",
        label: "Chưa thanh toán",
        value: formatNumber(stats.unpaid || 0),
        hint: Number(stats.unpaid || 0) ? "Nên kiểm tra thu hộ/COD" : "Không có khoản chờ",
      },
    ];
    const dashboardHighlights = [
      `${formatNumber(activeOrders)} đơn đang cần theo dõi`,
      `${formatNumber(stats.unpaid || 0)} đơn cần đối soát`,
      recentStatus === "all"
        ? "Đang xem tất cả đơn gần đây"
        : `Đang lọc: ${recentStatusLabels[recentStatus] || recentStatus}`,
    ];

    content.innerHTML = `
      <section class="customer-dashboard-hero">
        <div class="customer-dashboard-hero-copy">
          <p class="customer-section-kicker">Bảng điều khiển khách hàng</p>
          <h2>Tổng quan đơn hàng và thao tác nhanh</h2>
          <p class="customer-dashboard-hero-text">Theo dõi nhanh trạng thái đơn, mở lịch sử đơn và đi thẳng tới hồ sơ cá nhân mà không phải cuộn qua nhiều màn hình.</p>
        </div>
        <div class="customer-dashboard-hero-actions">
          <a href="${routes.orders}" class="customer-btn customer-btn-primary">Xem lịch sử đơn</a>
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
            <h2>Nhìn một màn là nắm được tình trạng đơn</h2>
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
              <p class="customer-section-kicker">Đơn gần đây</p>
              <h2>Theo dõi các đơn mới nhất</h2>
              <p class="customer-panel-subtext">Ưu tiên các đơn vừa tạo hoặc đang cần bạn chú ý.</p>
            </div>
            <a href="${routes.orders}" class="customer-btn customer-btn-ghost customer-btn-sm">Xem tất cả</a>
          </div>
          <div class="customer-chip-group customer-chip-group-dashboard">
              ${["all", "pending", "shipping", "completed", "cancelled"]
                .map(
                  (item) =>
                    `<a class="customer-chip ${recentStatus === item ? "is-active" : ""}" href="?recent_status=${encodeURIComponent(item)}">${escapeHtml(
                      recentStatusLabels[item] || item,
                    )}</a>`,
                )
                .join("")}
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
                  <p class="customer-order-dest">${escapeHtml(order.delivery_address || "--")}</p>
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
        </article>
        <aside class="customer-quicklinks-strip">
          <a href="${routes.orders}" class="customer-quicklink-item">
            <p class="customer-section-kicker">Lịch sử đơn</p>
            <strong>Mở danh sách đơn hàng</strong>
            <span class="customer-mobile-hidden">Tra cứu đầy đủ, lọc và dùng phân trang ở một nơi duy nhất.</span>
          </a>
          <a href="${routes.profile}" class="customer-quicklink-item">
            <p class="customer-section-kicker">Hồ sơ cá nhân</p>
            <strong>Cập nhật thông tin tài khoản</strong>
            <span class="customer-mobile-hidden">Chỉnh sửa nhanh họ tên, số điện thoại, công ty và địa chỉ liên hệ.</span>
          </a>
        </aside>
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
    if (filters.status) activeFilters.push(`Trạng thái: ${statusLabels[filters.status] || filters.status}`);
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
                  .map((item) => `<span class="customer-chip customer-chip-muted">${escapeHtml(item)}</span>`)
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
    const providerDisplayName = hasProviderInfo(provider) ? getProviderDisplayName(provider) : "Chưa gán";

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
                      { label: "Mã nhà cung cấp", value: provider.shipper_id || provider.provider_id || "--" },
                      { label: "Người phụ trách", value: getProviderDisplayName(provider) },
                      { label: "Tài khoản", value: provider.username || "--" },
                      { label: "Số điện thoại", value: provider.shipper_phone || provider.phone || "--" },
                      { label: "Email", value: provider.email || "--" },
                      { label: "Phương tiện", value: provider.shipper_vehicle || provider.vehicle_type || order.vehicle_type || "--" },
                      { label: "Khu vực phụ trách", value: provider.area_label || provider.region || provider.hub_label || provider.company_name || "--" },
                      { label: "Ghi chú từ shipper", value: order.shipper_note || "Chưa có ghi chú từ shipper." },
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
            <form id="customer-feedback-form" class="customer-form-stack">
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
            </form>
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
                { label: "Địa chỉ công ty", value: customer.company_address || "--" },
              ])}
            </article>
            <article class="customer-info-card">
              <h3>Thông tin hóa đơn / bổ sung</h3>
              ${renderInfoList([
                { label: "Xuất hóa đơn", value: customer.is_corporate ? "Có" : "Không" },
                { label: "Tên đơn vị", value: customer.invoice?.company_name || "--" },
                { label: "Email nhận hóa đơn", value: customer.invoice?.company_email || "--" },
                { label: "Mã số thuế", value: customer.invoice?.company_tax_code || "--" },
                { label: "Địa chỉ", value: customer.invoice?.company_address || "--" },
                { label: "Tài khoản ngân hàng", value: customer.invoice?.company_bank_info || "--" },
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

    const captureImage = document.getElementById("feedback-capture-image");
    const captureVideo = document.getElementById("feedback-capture-video");
    const uploadInput = document.getElementById("feedback-upload");
    const selectedFilesHost = document.getElementById("customer-selected-files");
    const feedbackForm = document.getElementById("customer-feedback-form");

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

    if (feedbackForm) {
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
    const stats = data.stats || {};
    const savedAddresses = Array.isArray(data.saved_addresses)
      ? data.saved_addresses
      : [];
    const savedAddressMap = new Map(
      savedAddresses.map((item) => [String(item.id), item]),
    );

    const savedAddressCards = savedAddresses.length
      ? savedAddresses
          .map(
            (item) => `
              <article class="customer-address-card">
                <div class="customer-address-card-head">
                  <div>
                    <strong>${escapeHtml(item.name || "Địa chỉ đã lưu")}</strong>
                    <span>${escapeHtml(item.phone || "--")}</span>
                  </div>
                  <div class="customer-address-card-actions">
                    <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-address-edit="${item.id}">Sửa</button>
                    <button type="button" class="customer-btn customer-btn-danger customer-btn-sm" data-address-delete="${item.id}">Xóa</button>
                  </div>
                </div>
                <p>${escapeHtml(item.address || "--")}</p>
                <small>Lưu lúc ${formatDateTime(item.created_at)}</small>
              </article>
            `,
          )
          .join("")
      : '<div class="customer-empty">Chưa có địa chỉ nào được lưu. Địa chỉ mới nhất sẽ được tự điền khi bạn đặt đơn.</div>';

    content.innerHTML = `
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Hồ sơ cá nhân</p>
            <h2>Cập nhật thông tin ngay trên giao diện khách hàng</h2>
          </div>
          <a href="${routes.orders}" class="customer-btn customer-btn-ghost">Xem lịch sử đơn</a>
        </div>
        <div class="customer-detail-summary">
          <article><span>Tổng đơn</span><strong>${formatNumber(stats.total || 0)}</strong></article>
          <article><span>Chờ xử lý</span><strong>${formatNumber(stats.pending || 0)}</strong></article>
          <article><span>Đang giao</span><strong>${formatNumber(stats.shipping || 0)}</strong></article>
          <article><span>Hoàn tất</span><strong>${formatNumber(stats.completed || 0)}</strong></article>
        </div>
        <div class="customer-detail-grid">
          <article class="customer-info-card">
            <h3>Chỉnh sửa thông tin</h3>
            <form id="customer-profile-form" class="customer-form-stack">
              <label><span>Tên đăng nhập</span><input value="${escapeHtml(profile.username || "")}" disabled /></label>
              <label><span>Email</span><input value="${escapeHtml(profile.email || "")}" disabled /></label>
              <label><span>Họ và tên</span><input name="ho_ten" value="${escapeHtml(profile.ho_ten || profile.fullname || "")}" required /></label>
              <label><span>Số điện thoại</span><input name="so_dien_thoai" value="${escapeHtml(profile.so_dien_thoai || profile.phone || "")}" required /></label>
              <label><span>Tên công ty</span><input name="ten_cong_ty" value="${escapeHtml(profile.ten_cong_ty || profile.company_name || "")}" /></label>
              <label><span>Mã số thuế</span><input name="ma_so_thue" value="${escapeHtml(profile.ma_so_thue || profile.tax_code || "")}" /></label>
              <label><span>Địa chỉ công ty</span><textarea name="dia_chi_cong_ty" rows="4">${escapeHtml(profile.dia_chi_cong_ty || profile.company_address || "")}</textarea></label>
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
        <article class="customer-info-card customer-detail-grid--stack">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Sổ địa chỉ</p>
              <h3>Quản lý địa chỉ đã lưu</h3>
              <p class="customer-panel-subtext">Địa chỉ mới nhất sẽ được ưu tiên gợi ý lại khi bạn tạo đơn giao hàng mới.</p>
            </div>
            <span class="customer-panel-note">${formatNumber(savedAddresses.length)} địa chỉ</span>
          </div>
          <div class="customer-address-layout">
            <div class="customer-address-list">
              ${savedAddressCards}
            </div>
            <form id="customer-address-form" class="customer-form-stack customer-address-form">
              <input type="hidden" name="dia_chi_id" id="customer-address-id" value="" />
              <h3 id="customer-address-form-title">Thêm địa chỉ mới</h3>
              <label><span>Tên gợi nhớ</span><input name="ten_goi_nho" id="customer-address-name" placeholder="Ví dụ: Kho chính, Văn phòng..." required /></label>
              <label><span>Số điện thoại</span><input name="so_dien_thoai" id="customer-address-phone" inputmode="numeric" placeholder="Nhập số điện thoại liên hệ" required /></label>
              <label><span>Địa chỉ</span><textarea name="dia_chi" id="customer-address-value" rows="4" placeholder="Nhập địa chỉ lấy hàng thường dùng" required></textarea></label>
              <div class="customer-inline-actions">
                <button class="customer-btn customer-btn-primary" type="submit" id="customer-address-submit">Lưu địa chỉ</button>
                <button class="customer-btn customer-btn-ghost" type="button" id="customer-address-reset">Tạo mới</button>
              </div>
            </form>
          </div>
        </article>
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
        const confirmPassword = String(formData.get("xac_nhan_mat_khau_moi") || "");

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

    const addressForm = document.getElementById("customer-address-form");
    const addressIdInput = document.getElementById("customer-address-id");
    const addressNameInput = document.getElementById("customer-address-name");
    const addressPhoneInput = document.getElementById("customer-address-phone");
    const addressValueInput = document.getElementById("customer-address-value");
    const addressFormTitle = document.getElementById("customer-address-form-title");
    const addressSubmit = document.getElementById("customer-address-submit");
    const addressReset = document.getElementById("customer-address-reset");

    const resetAddressForm = () => {
      if (addressForm) addressForm.reset();
      if (addressIdInput) addressIdInput.value = "";
      if (addressFormTitle) addressFormTitle.textContent = "Thêm địa chỉ mới";
      if (addressSubmit) addressSubmit.textContent = "Lưu địa chỉ";
    };

    if (addressReset) {
      addressReset.addEventListener("click", resetAddressForm);
    }

    if (addressForm) {
      addressForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await apiRequest("save-address", {
            method: "POST",
            body: new FormData(addressForm),
          });
          showToast("Đã lưu địa chỉ thành công.", "success");
          window.setTimeout(() => {
            window.location.reload();
          }, 600);
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }

    content.querySelectorAll("[data-address-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = savedAddressMap.get(String(button.dataset.addressEdit || ""));
        if (!item) return;
        if (addressIdInput) addressIdInput.value = item.id;
        if (addressNameInput) addressNameInput.value = item.ten_goi_nho || item.name || "";
        if (addressPhoneInput) addressPhoneInput.value = item.so_dien_thoai || item.phone || "";
        if (addressValueInput) addressValueInput.value = item.dia_chi || item.address || "";
        if (addressFormTitle) addressFormTitle.textContent = "Cập nhật địa chỉ";
        if (addressSubmit) addressSubmit.textContent = "Cập nhật địa chỉ";
        addressForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    content.querySelectorAll("[data-address-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const addressId = String(button.dataset.addressDelete || "");
        const item = savedAddressMap.get(addressId);
        if (!item) return;
        const confirmed = window.confirm(
          `Xóa địa chỉ "${item.name || "Địa chỉ đã lưu"}"?`,
        );
        if (!confirmed) return;

        const formData = new FormData();
        formData.append("dia_chi_id", addressId);

        try {
          await apiRequest("delete-address", {
            method: "POST",
            body: formData,
          });
          showToast("Đã xóa địa chỉ đã lưu.", "success");
          window.setTimeout(() => {
            window.location.reload();
          }, 600);
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  }

  async function init() {
    const page = document.body.dataset.customerPage;
    if (!page) return;

    const sessionData = await getSessionData();
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
