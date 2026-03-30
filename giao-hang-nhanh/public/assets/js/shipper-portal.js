(function (window) {
  if (window.ShipperPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const apiUrl = "../../nha-cung-cap/api/shipper_portal.php";
  const routes = {
    login: "../../dang-nhap.html",
    dashboard: "dashboard.html",
    orders: "don-hang.html",
    detail: "chi-tiet-don-hang.html",
    profile: "ho-so.html",
    logout:
      typeof core.toApiUrl === "function"
        ? core.toApiUrl("logout.php")
        : "../logout.php",
  };

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
            <a href="${routes.logout}" class="customer-btn customer-btn-ghost">Đăng xuất</a>
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
      <div class="customer-review-section">
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
          <div class="rv-row"><span class="rv-label">Gói dịch vụ</span><span class="rv-val">${escapeHtml(order.service_label || "--")}</span></div>
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
                    <span><b>Dịch vụ</b>${escapeHtml(order.service_label || "--")}</span>
                    <span><b>Cước phí</b>${formatCurrency(order.shipping_fee)}</span>
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
                  <span><b>Phí ship</b>${formatCurrency(order.shipping_fee)}</span>
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
          <article><span>Gói dịch vụ</span><strong>${escapeHtml(order.service_label || "--")}</strong></article>
          <article><span>Phí vận chuyển</span><strong>${formatCurrency(order.shipping_fee)}</strong></article>
          <article><span>COD</span><strong>${formatCurrency(order.cod_amount)}</strong></article>
          <article><span>Thanh toán</span><strong>${escapeHtml(order.payment_status_label || "--")}</strong></article>
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
