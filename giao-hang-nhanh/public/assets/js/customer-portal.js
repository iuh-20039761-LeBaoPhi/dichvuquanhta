(function (window) {
  if (window.CustomerPortal) return;

  const core = window.GiaoHangNhanhCore || {};
  const apiUrl = "../../khach-hang-giaohang/api/customer_portal.php";
  const routes = {
    login: "../../dang-nhap.html",
    dashboard: "dashboard.html",
    orders: "lich-su-don-hang.html",
    detail: "chi-tiet-don-hang.html",
    profile: "ho-so.html",
    createOrder: "../../dat-lich-giao-hang-nhanh.html",
    pricing: "../../tra-cuu-gia.html",
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
              Quản lý đơn hàng, cập nhật hồ sơ và phản hồi chất lượng dịch vụ
              ngay trên giao diện website.
            </p>
          </div>
          <div class="customer-portal-top-actions">
            <a href="${routes.createOrder}" class="customer-btn customer-btn-primary">Tạo đơn mới</a>
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
      { label: "Cước cơ bản", value: breakdown.base_price || 0 },
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
    const deliveryDeadline =
      serviceMeta.delivery_date || serviceMeta.delivery_slot_label
        ? `${escapeHtml(serviceMeta.delivery_date || "--")} | ${escapeHtml(
            serviceMeta.delivery_slot_label || "--",
          )}`
        : "--";

    return `
      <div class="customer-review-layout">
        <section class="customer-review-block">
          <h3><i class="fas fa-address-book"></i> Thông tin liên hệ</h3>
          <div class="customer-review-section">
            <div class="rv-row"><span class="rv-label">Người gửi</span><span class="rv-val">${escapeHtml(order.sender_name || "--")} · ${escapeHtml(order.sender_phone || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Người nhận</span><span class="rv-val">${escapeHtml(order.receiver_name || "--")} · ${escapeHtml(order.receiver_phone || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Lấy hàng tại</span><span class="rv-val">${escapeHtml(order.pickup_address || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Giao hàng đến</span><span class="rv-val">${escapeHtml(order.delivery_address || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Khoảng cách</span><span class="rv-val">${distanceLabel}</span></div>
          </div>
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-boxes-stacked"></i> Hàng hóa và đóng gói</h3>
          ${renderOrderItemCards(items)}
          <div class="customer-review-section">
            <div class="rv-row"><span class="rv-label">Giá trị thu hộ (COD)</span><span class="rv-val">${order.cod_amount ? formatCurrency(order.cod_amount) : "Không có"}</span></div>
            <div class="rv-row"><span class="rv-label">Ghi chú vận chuyển</span><span class="rv-val">${formatMultilineText(order.clean_note || "Không có")}</span></div>
          </div>
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-photo-film"></i> Media đính kèm</h3>
          ${renderAttachmentPreview(attachments)}
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-calendar-check"></i> Lịch trình</h3>
          <div class="customer-review-section">
            <div class="rv-row"><span class="rv-label">Lấy hàng</span><span class="rv-val">${pickupLabel}</span></div>
            <div class="rv-row"><span class="rv-label">Khung giờ lấy hàng</span><span class="rv-val">${escapeHtml(serviceMeta.pickup_slot_label || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Mốc nhận mong muốn</span><span class="rv-val">${deliveryDeadline}</span></div>
            <div class="rv-row"><span class="rv-label">Thời gian giao dự kiến</span><span class="rv-val">${escapeHtml(serviceMeta.estimated_eta || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Gói dịch vụ</span><span class="rv-val">${escapeHtml(order.service_label || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Phương tiện tính giá</span><span class="rv-val">${escapeHtml(serviceMeta.vehicle_label || order.vehicle_type || "--")}</span></div>
          </div>
        </section>

        <section class="customer-review-block">
          <h3><i class="fas fa-receipt"></i> Chi phí</h3>
          ${renderFeeBreakdownRows(order.fee_breakdown || {}, order.shipping_fee)}
          <div class="customer-review-section">
            <div class="rv-row"><span class="rv-label">Người trả cước</span><span class="rv-val">${escapeHtml(order.payer_label || "Người gửi")}</span></div>
            <div class="rv-row"><span class="rv-label">Thanh toán</span><span class="rv-val">${escapeHtml(order.payment_method_label || "--")}</span></div>
            <div class="rv-row"><span class="rv-label">Trạng thái thanh toán</span><span class="rv-val">${escapeHtml(order.payment_status_label || "--")}</span></div>
          </div>
        </section>

        <section class="customer-review-block">
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
          (order.service_type === "instant" ? "Bình thường" : "Không áp dụng"),
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
    const todoItems = Array.isArray(data.todo_items) ? data.todo_items : [];
    const recentStatusLabels = {
      all: "Tất cả",
      pending: "Chờ xử lý",
      shipping: "Đang giao",
      completed: "Hoàn tất",
      cancelled: "Đã hủy",
    };

    content.innerHTML = `
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Bảng điều khiển khách hàng</p>
            <h2>Tổng quan đơn hàng và thao tác nhanh</h2>
          </div>
          <a href="${routes.orders}" class="customer-btn customer-btn-ghost">Mở lịch sử đơn</a>
        </div>
        <div class="customer-kpi-grid">
          <article class="customer-kpi-card"><span>Tổng đơn</span><strong>${formatNumber(stats.total || 0)}</strong></article>
          <article class="customer-kpi-card"><span>Chờ xử lý</span><strong>${formatNumber(stats.pending || 0)}</strong></article>
          <article class="customer-kpi-card"><span>Đang giao</span><strong>${formatNumber(stats.shipping || 0)}</strong></article>
          <article class="customer-kpi-card"><span>Hoàn tất</span><strong>${formatNumber(stats.completed || 0)}</strong></article>
          <article class="customer-kpi-card"><span>Chưa thanh toán</span><strong>${formatNumber(stats.unpaid || 0)}</strong></article>
          <article class="customer-kpi-card"><span>Thông báo mới</span><strong>${formatNumber(stats.unread_notifications || 0)}</strong></article>
        </div>
      </section>
      <section class="customer-grid-two customer-grid-dashboard">
        <article class="customer-panel">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Đơn gần đây</p>
              <h2>Theo dõi các đơn mới nhất</h2>
            </div>
            <div class="customer-chip-group">
              ${["all", "pending", "shipping", "completed", "cancelled"]
                .map(
                  (item) =>
                    `<a class="customer-chip ${recentStatus === item ? "is-active" : ""}" href="?recent_status=${encodeURIComponent(item)}">${escapeHtml(
                      recentStatusLabels[item] || item,
                    )}</a>`,
                )
                .join("")}
            </div>
          </div>
          <div class="customer-list">
            ${
              recentOrders.length
                ? recentOrders
                    .map(
                      (order) => `
                <article class="customer-order-card">
                  <div class="customer-order-main">
                    <div>
                      <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                      <p class="customer-order-dest">${escapeHtml(order.receiver_name)} · ${escapeHtml(order.delivery_address)}</p>
                    </div>
                    ${createStatusBadge(order.status, order.status_label)}
                  </div>
                  <div class="customer-order-meta">
                    <span>${escapeHtml(order.service_label)}</span>
                    <span>${formatCurrency(order.shipping_fee)}</span>
                    <span>${formatDateTime(order.created_at)}</span>
                  </div>
                  <div class="customer-order-actions">
                    <a class="customer-btn customer-btn-primary" href="${routes.detail}?id=${order.id}">Chi tiết đơn</a>
                    <a class="customer-btn customer-btn-ghost" href="${routes.createOrder}?reorder_id=${order.id}">Đặt lại</a>
                  </div>
                </article>`,
                    )
                    .join("")
                : '<div class="customer-empty">Chưa có đơn hàng nào trong bộ lọc này.</div>'
            }
          </div>
        </article>
        <aside class="customer-panel">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Menu quản lý cá nhân</p>
              <h2>Việc cần làm</h2>
            </div>
          </div>
          <div class="customer-todo-list">
            ${todoItems
              .map(
                (item) => `
              <article class="customer-todo ${escapeHtml(item.type)}">
                <p>${escapeHtml(item.message)}</p>
                <a href="${escapeHtml(item.href)}">${escapeHtml(item.cta)}</a>
              </article>`,
              )
              .join("")}
          </div>
        </aside>
      </section>
    `;
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

    content.innerHTML = `
      <section class="customer-panel">
        <div class="customer-panel-head">
          <div>
            <p class="customer-section-kicker">Lịch sử đơn hàng</p>
            <h2>Tra cứu và lọc đơn theo trạng thái</h2>
          </div>
          <a href="${routes.createOrder}" class="customer-btn customer-btn-primary">Tạo đơn mới</a>
        </div>

        <form id="customer-order-filter" class="customer-filter-form">
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

        <div class="customer-list">
          ${
            items.length
              ? items
                  .map(
                    (order) => `
              <article class="customer-order-card">
                <div class="customer-order-main">
                  <div>
                    <p class="customer-order-code">${escapeHtml(order.order_code)}</p>
                    <p class="customer-order-dest">Từ ${escapeHtml(order.pickup_address)} đến ${escapeHtml(order.delivery_address)}</p>
                  </div>
                  ${createStatusBadge(order.status, order.status_label)}
                </div>
                <div class="customer-order-meta">
                  <span>Dịch vụ: ${escapeHtml(order.service_label)}</span>
                  <span>Phí ship: ${formatCurrency(order.shipping_fee)}</span>
                  <span>COD: ${formatCurrency(order.cod_amount)}</span>
                  <span>Tạo lúc: ${formatDateTime(order.created_at)}</span>
                </div>
                <div class="customer-order-actions">
                  <a class="customer-btn customer-btn-primary" href="${routes.detail}?id=${order.id}">Chi tiết đơn</a>
                  <a class="customer-btn customer-btn-ghost" href="${routes.createOrder}?reorder_id=${order.id}">Đặt lại</a>
                </div>
              </article>`,
                  )
                  .join("")
              : '<div class="customer-empty">Không tìm thấy đơn hàng phù hợp.</div>'
          }
        </div>
        ${buildPagination(pagination.page || 1, pagination.total_pages || 1)}
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
  }

  async function initOrderDetail() {
    renderLoading("Đang tải chi tiết đơn hàng...");
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
            <p class="customer-section-kicker">Chi tiết đơn hàng</p>
            <h2>${escapeHtml(order.order_code || "--")}</h2>
          </div>
          <div class="customer-inline-actions">
            ${createStatusBadge(order.status, order.status_label)}
            <a class="customer-btn customer-btn-ghost" href="${routes.orders}">Về lịch sử đơn</a>
            <a class="customer-btn customer-btn-primary" target="_blank" href="${escapeHtml(order.print_invoice_url)}">In hóa đơn</a>
          </div>
        </div>

        <div class="customer-detail-summary">
          <article><span>Gói dịch vụ</span><strong>${escapeHtml(order.service_label || "--")}</strong></article>
          <article><span>Tổng phí ship</span><strong>${formatCurrency(order.shipping_fee)}</strong></article>
          <article><span>Thu hộ COD</span><strong>${formatCurrency(order.cod_amount)}</strong></article>
          <article><span>Thanh toán</span><strong>${escapeHtml(order.payment_status_label || "--")}</strong></article>
        </div>

        <div class="customer-tab-switcher" id="customer-tab-switcher">
          <button type="button" class="is-active" data-tab="booking">Thông tin đặt dịch vụ</button>
          <button type="button" data-tab="provider">Thông tin nhà cung cấp</button>
          <button type="button" data-tab="customer">Thông tin khách hàng</button>
        </div>

        <div class="customer-tab-panel is-active" data-panel="booking">
          ${renderBookingReview(order, items, provider.attachments, logs)}
        </div>

        <div class="customer-tab-panel" data-panel="provider">
          <div class="customer-detail-grid">
            <article class="customer-info-card">
              <h3>Thông tin nhà cung cấp</h3>
              ${
                provider.shipper_id
                  ? renderInfoList([
                      { label: "Shipper phụ trách", value: provider.shipper_name || "--" },
                      { label: "Số điện thoại", value: provider.shipper_phone || "--" },
                      { label: "Phương tiện", value: provider.shipper_vehicle || order.vehicle_type || "--" },
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
              <h4 class="customer-subheading">Media phản hồi đã gửi</h4>
              ${renderFiles(provider.feedback_media)}
            </article>
          </div>

          <article class="customer-info-card">
            <h3>Đánh giá và phản hồi chất lượng dịch vụ</h3>
            <form id="customer-feedback-form" class="customer-feedback-form">
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
                  <textarea name="feedback" rows="5" placeholder="Đánh giá trải nghiệm giao hàng, tốc độ, thái độ phục vụ và chất lượng xử lý.">${escapeHtml(order.feedback || "")}</textarea>
                </label>
              </div>
              <div class="customer-media-actions">
                <label class="customer-btn customer-btn-ghost">
                  Chụp ảnh
                  <input type="file" id="feedback-capture-image" accept="image/*" capture="environment" hidden />
                </label>
                <label class="customer-btn customer-btn-ghost">
                  Quay video
                  <input type="file" id="feedback-capture-video" accept="video/*" capture hidden />
                </label>
                <label class="customer-btn customer-btn-ghost">
                  Tải tệp lên
                  <input type="file" id="feedback-upload" accept="image/*,video/*" multiple hidden />
                </label>
              </div>
              <div class="customer-selected-files" id="customer-selected-files">Chưa chọn tệp media nào.</div>
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
      const files = [];
      [captureImage, captureVideo, uploadInput].forEach((input) => {
        if (input && input.files) {
          Array.from(input.files).forEach((file) => files.push(file.name));
        }
      });

      selectedFilesHost.textContent = files.length
        ? `Đã chọn: ${files.join(", ")}`
        : "Chưa chọn tệp media nào.";
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
          showToast("Đã gửi đánh giá và media phản hồi.", "success");
          window.location.reload();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }
  }

  async function initProfile() {
    renderLoading("Đang tải hồ sơ cá nhân...");
    const data = await apiRequest("profile");
    const { content } = getPageRoot();
    const profile = data.profile || {};
    const stats = data.stats || {};

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
          <article><span>Đang giao</span><strong>${formatNumber(stats.shipping || 0)}</strong></article>
          <article><span>Thông báo mới</span><strong>${formatNumber(stats.unread_notifications || 0)}</strong></article>
          <article><span>Địa chỉ đã lưu</span><strong>${formatNumber(stats.saved_addresses || 0)}</strong></article>
        </div>
        <div class="customer-detail-grid">
          <article class="customer-info-card">
            <h3>Chỉnh sửa thông tin</h3>
            <form id="customer-profile-form" class="customer-form-stack">
              <label><span>Tên đăng nhập</span><input value="${escapeHtml(profile.username || "")}" disabled /></label>
              <label><span>Email</span><input value="${escapeHtml(profile.email || "")}" disabled /></label>
              <label><span>Họ và tên</span><input name="fullname" value="${escapeHtml(profile.fullname || "")}" required /></label>
              <label><span>Số điện thoại</span><input name="phone" value="${escapeHtml(profile.phone || "")}" required /></label>
              <label><span>Tên công ty</span><input name="company_name" value="${escapeHtml(profile.company_name || "")}" /></label>
              <label><span>Mã số thuế</span><input name="tax_code" value="${escapeHtml(profile.tax_code || "")}" /></label>
              <label><span>Địa chỉ công ty</span><textarea name="company_address" rows="4">${escapeHtml(profile.company_address || "")}</textarea></label>
              <button class="customer-btn customer-btn-primary" type="submit">Lưu thông tin</button>
            </form>
          </article>
          <article class="customer-info-card">
            <h3>Đổi mật khẩu</h3>
            <form id="customer-password-form" class="customer-form-stack">
              <label><span>Mật khẩu cũ</span><input type="password" name="old_pass" required /></label>
              <label><span>Mật khẩu mới</span><input type="password" name="new_pass" required /></label>
              <label><span>Nhập lại mật khẩu mới</span><input type="password" name="confirm_pass" required /></label>
              <button class="customer-btn customer-btn-primary" type="submit">Cập nhật mật khẩu</button>
            </form>
            <div class="customer-hint-box">
              Mật khẩu mới cần có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số
              và ký tự đặc biệt.
            </div>
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
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }

    const passwordForm = document.getElementById("customer-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await apiRequest("change-password", {
            method: "POST",
            body: new FormData(passwordForm),
          });
          passwordForm.reset();
          showToast("Đã đổi mật khẩu thành công.", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }
  }

  async function init() {
    const page = document.body.dataset.customerPage;
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
