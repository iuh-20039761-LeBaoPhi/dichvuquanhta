(function (window, document) {
  if (window.__fastGoProviderDashboardLoaded) return;
  window.__fastGoProviderDashboardLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-dashboard") {
    return;
  }

  const root = document.getElementById("provider-dashboard-root");
  if (!root || !store) return;

  function escapeHtml(value) {
    if (typeof core.escapeHtml === "function") {
      return core.escapeHtml(String(value ?? ""));
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeLowerText(value) {
    return normalizeText(value).toLowerCase();
  }

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function" ? core.toProjectUrl(path) : path;
  }

  function formatCurrency(value) {
    if (typeof core.formatCurrencyVnd === "function") {
      return core.formatCurrencyVnd(value || 0);
    }

    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return "Chờ chốt";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDateTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateLabel(dateValue, timeValue) {
    const rawDate = normalizeText(dateValue);
    if (!rawDate) return "--";

    const date = new Date(rawDate);
    const dateText = Number.isNaN(date.getTime())
      ? rawDate
      : date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
    const timeText = normalizeText(timeValue);
    return timeText ? `${dateText} • ${timeText}` : dateText;
  }

  function getKrudListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 50,
          where: payload.where,
          sort: payload.sort,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 50,
          where: payload.where,
          sort: payload.sort,
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

  function getStatusMeta(row) {
    const rawStatus = normalizeLowerText(row?.status || row?.trang_thai || "");

    if (["da_xac_nhan", "xac_nhan", "confirmed", "accepted", "da_chot_lich"].includes(rawStatus)) {
      return {
        className: "completed",
        label: "Đã xác nhận",
      };
    }

    if (["dang_xu_ly", "processing", "in_progress", "dang_dieu_phoi", "dang_trien_khai"].includes(rawStatus)) {
      return {
        className: "shipping",
        label: "Đang xử lý",
      };
    }

    if (["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(rawStatus)) {
      return {
        className: "cancelled",
        label: "Đã hủy",
      };
    }

    return {
      className: "pending",
      label: "Mới tiếp nhận",
    };
  }

  function hasSurveyFirst(row) {
    const detailText = normalizeLowerText(row?.chi_tiet_dich_vu || "");
    if (detailText.includes("cần khảo sát trước")) {
      return true;
    }

    try {
      const payload = JSON.parse(String(row?.du_lieu_form_json || "{}"));
      return String(payload?.can_khao_sat_truoc || "").trim() === "1";
    } catch (error) {
      return false;
    }
  }

  function normalizeBookingRow(row) {
    const status = getStatusMeta(row);
    const fromAddress = normalizeText(row?.dia_chi_di || "");
    const toAddress = normalizeText(row?.dia_chi_den || "");
    return {
      code: normalizeText(row?.ma_yeu_cau_noi_bo || row?.ma_don_hang_noi_bo || row?.order_code || row?.id || ""),
      serviceLabel: normalizeText(row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn"),
      statusClass: status.className,
      statusText: status.label,
      route: fromAddress && toAddress ? `${fromAddress} → ${toAddress}` : fromAddress || toAddress || "Chưa đủ địa chỉ",
      createdAt: normalizeText(row?.created_at || row?.created_date || ""),
      scheduleLabel: formatDateLabel(
        row?.ngay_thuc_hien,
        row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien,
      ),
      estimatedAmount: Number(row?.tong_tam_tinh || 0),
      contactName: normalizeText(row?.ho_ten || ""),
      surveyFirst: hasSurveyFirst(row),
    };
  }

  async function fetchRecentBookings() {
    const listFn = getKrudListFn();
    if (!listFn) return [];

    try {
      const response = await Promise.resolve(
        listFn({
          table: store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich",
          page: 1,
          limit: 12,
          sort: {
            created_at: "desc",
          },
        }),
      );

      return extractRows(response).map(normalizeBookingRow);
    } catch (error) {
      console.error("Cannot load provider dashboard bookings:", error);
      return [];
    }
  }

  function renderStatusBadge(statusClass, label) {
    return `<span class="customer-status-badge status-${escapeHtml(
      statusClass || "pending",
    )}">${escapeHtml(label || "Mới tiếp nhận")}</span>`;
  }

  async function renderProviderDashboard() {
    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=nha-cung-cap");
      return;
    }

    const identity = store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const contact = String(identity.contact_person || identity.contactPerson || "").trim();

    root.innerHTML = `
      <div class="customer-portal-shell">
        <div class="customer-empty-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Đang tải tổng quan nhà cung cấp...</p>
        </div>
      </div>
    `;

    const recentRequests = await fetchRecentBookings();
    const activeCount = recentRequests.filter((item) =>
      ["pending", "shipping"].includes(item.statusClass),
    ).length;
    const confirmedCount = recentRequests.filter(
      (item) => item.statusClass === "completed",
    ).length;
    const surveyCount = recentRequests.filter((item) => item.surveyFirst).length;

    root.innerHTML = `
      <div class="customer-portal-shell">
        <section class="customer-panel customer-panel-overview">
          <div class="customer-panel-head customer-panel-head-dashboard">
            <div>
              <p class="customer-section-kicker">Khu vực nhà cung cấp</p>
              <h2>Tổng quan công việc chuyển dọn</h2>
              <p class="customer-panel-subtext">Dashboard này giữ nhịp gọn giống bên giao hàng: nhìn nhanh số việc mở, yêu cầu mới và các lối tắt cần dùng.</p>
            </div>
            <div class="customer-inline-actions customer-inline-actions-dashboard">
              <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("nha-cung-cap/danh-sach-viec.html"))}">Mở danh sách việc</a>
            </div>
          </div>
          <div class="customer-kpi-grid customer-kpi-grid-dashboard">
            <article class="customer-kpi-card customer-kpi-card-total">
              <span>Tổng yêu cầu gần đây</span>
              <strong>${escapeHtml(String(recentRequests.length))}</strong>
            </article>
            <article class="customer-kpi-card ${activeCount > 0 ? "customer-kpi-card-shipping" : "customer-kpi-card-pending"}">
              <span>Cần xử lý</span>
              <strong>${escapeHtml(String(activeCount))}</strong>
            </article>
            <article class="customer-kpi-card customer-kpi-card-revenue">
              <span>Đã xác nhận</span>
              <strong>${escapeHtml(String(confirmedCount))}</strong>
            </article>
            <article class="customer-kpi-card">
              <span>Có khảo sát trước</span>
              <strong>${escapeHtml(String(surveyCount))}</strong>
            </article>
          </div>
        </section>

        <div class="customer-grid-two customer-grid-dashboard">
          <div class="customer-portal-main">
            <section class="customer-panel customer-panel-orders">
              <div class="customer-panel-head customer-panel-head-dashboard">
                <div>
                  <p class="customer-section-kicker">Yêu cầu mới</p>
                  <h2>Danh sách việc cần nhìn trước</h2>
                  <p class="customer-panel-subtext">3 yêu cầu mới nhất từ bảng đặt lịch để nhà cung cấp nắm nhịp xử lý chung.</p>
                </div>
                <div class="customer-inline-actions customer-inline-actions-dashboard">
                  <a class="customer-btn customer-btn-ghost customer-btn-sm" href="${escapeHtml(getProjectUrl("nha-cung-cap/danh-sach-viec.html"))}">Xem toàn bộ</a>
                </div>
              </div>
              <div class="customer-list customer-list-compact">
                ${
                  recentRequests.length
                    ? recentRequests
                        .slice(0, 3)
                        .map(
                          (request) => `
                            <article class="customer-order-card customer-order-card-compact">
                              <div class="customer-order-topline">
                                <div class="customer-order-heading">
                                  <p class="customer-order-code">${escapeHtml(request.code || "--")}</p>
                                  <p class="customer-order-recipient">${escapeHtml(request.serviceLabel || "Yêu cầu chuyển dọn")}</p>
                                </div>
                                ${renderStatusBadge(request.statusClass, request.statusText)}
                              </div>
                              <p class="customer-order-route">${escapeHtml(request.route || "Chưa có lộ trình")}</p>
                              <div class="customer-order-meta customer-order-meta-compact">
                                <span><b>Người liên hệ</b>${escapeHtml(request.contactName || "--")}</span>
                                <span><b>Lịch</b>${escapeHtml(request.scheduleLabel || "--")}</span>
                                <span><b>Khảo sát trước</b>${escapeHtml(request.surveyFirst ? "Có" : "Không")}</span>
                                <span><b>Tạm tính</b>${escapeHtml(formatCurrency(request.estimatedAmount))}</span>
                              </div>
                              <div class="customer-order-actions customer-order-actions-compact">
                                <a class="customer-btn customer-btn-primary" href="${escapeHtml(
                                  getProjectUrl(
                                    `nha-cung-cap/chi-tiet-don-hang.html?code=${encodeURIComponent(request.code || "")}`,
                                  ),
                                )}">Xem chi tiết</a>
                              </div>
                            </article>
                          `,
                        )
                        .join("")
                    : `
                      <div class="customer-empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Chưa có yêu cầu nào trong bảng đặt lịch để hiển thị ở dashboard nhà cung cấp.</p>
                      </div>
                    `
                }
              </div>
            </section>
          </div>

          <aside class="customer-portal-sidebar">
            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Tài khoản</p>
                  <h2>Thông tin phiên hiện tại</h2>
                </div>
              </div>
              <div class="customer-profile-summary">
                <article>
                  <span>Tên hiển thị</span>
                  <strong>${escapeHtml(displayName)}</strong>
                </article>
                <article>
                  <span>Người phụ trách</span>
                  <strong>${escapeHtml(contact || displayName)}</strong>
                </article>
                <article>
                  <span>Email vận hành</span>
                  <strong>${escapeHtml(email || "--")}</strong>
                </article>
                <article>
                  <span>Số điện thoại</span>
                  <strong>${escapeHtml(phone || "--")}</strong>
                </article>
              </div>
            </section>

            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Lối tắt</p>
                  <h2>Đi nhanh</h2>
                </div>
              </div>
              <div class="customer-quicklinks-strip">
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("nha-cung-cap/danh-sach-viec.html"))}">
                  <strong>Danh sách việc</strong>
                  <span>Xem toàn bộ yêu cầu đặt lịch và lọc nhanh theo trạng thái xử lý.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("nha-cung-cap/ho-so.html"))}">
                  <strong>Hồ sơ nhà cung cấp</strong>
                  <span>Cập nhật đầu mối liên hệ và thông tin tài khoản vận hành.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("bang-gia-chuyen-don.html"))}">
                  <strong>Bảng giá</strong>
                  <span>Rà lại cấu trúc giá và các phụ phí của dịch vụ chuyển dọn.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("cam-nang.html"))}">
                  <strong>Cẩm nang</strong>
                  <span>Xem lại phần nội dung truyền thông và hướng dẫn cho khách hàng.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("dang-nhap.html"))}" data-provider-logout>
                  <strong>Đăng xuất</strong>
                  <span>Kết thúc phiên hiện tại và quay về màn đăng nhập chung.</span>
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    `;

    root.querySelector("[data-provider-logout]")?.addEventListener("click", function (event) {
      event.preventDefault();
      store.clearAuthSession();
      window.location.href = getProjectUrl("dang-nhap.html");
    });
  }

  renderProviderDashboard().catch((error) => {
    console.error("Cannot render provider dashboard:", error);
    root.innerHTML = `
      <div class="customer-portal-shell">
        <div class="customer-empty-state">
          <i class="fas fa-circle-exclamation"></i>
          <p>Không thể tải dashboard nhà cung cấp ở thời điểm hiện tại.</p>
        </div>
      </div>
    `;
  });
})(window, document);
