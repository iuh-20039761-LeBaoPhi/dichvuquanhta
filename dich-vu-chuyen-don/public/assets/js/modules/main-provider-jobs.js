(function (window, document) {
  if (window.__fastGoProviderJobsLoaded) return;
  window.__fastGoProviderJobsLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-jobs") {
    return;
  }

  const root = document.getElementById("provider-jobs-root");
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
          limit: payload.limit || 100,
          where: payload.where,
          sort: payload.sort,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
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
        value: "xac-nhan",
        label: "Đã xác nhận",
      };
    }

    if (["dang_xu_ly", "processing", "in_progress", "dang_dieu_phoi", "dang_trien_khai"].includes(rawStatus)) {
      return {
        className: "shipping",
        value: "dang-xu-ly",
        label: "Đang xử lý",
      };
    }

    if (["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(rawStatus)) {
      return {
        className: "cancelled",
        value: "da-huy",
        label: "Đã hủy",
      };
    }

    return {
      className: "pending",
      value: "moi",
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
    const contactName = normalizeText(row?.ho_ten || row?.contact_name || "");
    const contactPhone = normalizeText(row?.so_dien_thoai || row?.phone || "");
    const companyName = normalizeText(row?.ten_cong_ty || "");

    return {
      code: normalizeText(row?.ma_yeu_cau_noi_bo || row?.ma_don_hang_noi_bo || row?.order_code || row?.id || ""),
      serviceLabel: normalizeText(row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn"),
      statusClass: status.className,
      statusValue: status.value,
      statusText: status.label,
      route: fromAddress && toAddress ? `${fromAddress} → ${toAddress}` : fromAddress || toAddress || "Chưa đủ địa chỉ",
      createdAt: normalizeText(row?.created_at || row?.created_date || ""),
      scheduleLabel: formatDateLabel(
        row?.ngay_thuc_hien,
        row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien,
      ),
      estimatedAmount: Number(row?.tong_tam_tinh || 0),
      contactName,
      contactPhone,
      companyName,
      surveyFirst: hasSurveyFirst(row),
    };
  }

  async function fetchBookings() {
    const listFn = getKrudListFn();
    if (!listFn) return [];

    try {
      const response = await Promise.resolve(
        listFn({
          table: store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich",
          page: 1,
          limit: 100,
          sort: {
            created_at: "desc",
          },
        }),
      );

      return extractRows(response).map(normalizeBookingRow);
    } catch (error) {
      console.error("Cannot load provider jobs:", error);
      return [];
    }
  }

  function renderStatusBadge(statusClass, label) {
    return `<span class="customer-status-badge status-${escapeHtml(
      statusClass || "pending",
    )}">${escapeHtml(label || "Mới tiếp nhận")}</span>`;
  }

  function renderJobs(data) {
    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=nha-cung-cap");
      return;
    }

    const identity = store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const items = Array.isArray(data?.items) ? data.items : [];
    const totalCount = items.length;
    const activeCount = items.filter((item) => ["pending", "shipping"].includes(item.statusClass)).length;
    const confirmedCount = items.filter((item) => item.statusClass === "completed").length;
    const surveyCount = items.filter((item) => item.surveyFirst).length;

    root.innerHTML = `
      <div class="customer-portal-shell">
        <section class="customer-panel customer-panel-overview">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Danh sách việc</p>
              <h2>Theo dõi yêu cầu chuyển dọn theo nhịp xử lý</h2>
              <p class="customer-panel-subtext">Trang này gom toàn bộ yêu cầu đặt lịch mới nhất để nhà cung cấp lọc nhanh theo trạng thái và nhu cầu khảo sát trước.</p>
            </div>
            <p class="customer-panel-note">Tài khoản đang xem: ${escapeHtml(displayName)}</p>
          </div>
          <div class="customer-kpi-grid">
            <article class="customer-kpi-card">
              <span>Tổng yêu cầu</span>
              <strong>${escapeHtml(String(totalCount))}</strong>
            </article>
            <article class="customer-kpi-card">
              <span>Cần xử lý</span>
              <strong>${escapeHtml(String(activeCount))}</strong>
            </article>
            <article class="customer-kpi-card">
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
            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Bộ lọc</p>
                  <h2>Lọc và tìm việc</h2>
                </div>
              </div>
              <div class="customer-filter-form">
                <label>
                  Từ khóa
                  <input id="provider-job-keyword" type="search" placeholder="Mã việc, dịch vụ, tên khách, địa chỉ..." />
                </label>
                <label>
                  Khảo sát trước
                  <select id="provider-job-survey-filter">
                    <option value="all">Tất cả</option>
                    <option value="co-khao-sat">Có</option>
                    <option value="khong-khao-sat">Không</option>
                  </select>
                </label>
                <label>
                  Trạng thái
                  <select id="provider-job-status-filter">
                    <option value="all">Tất cả</option>
                    <option value="moi">Mới tiếp nhận</option>
                    <option value="xac-nhan">Đã xác nhận</option>
                    <option value="dang-xu-ly">Đang xử lý</option>
                    <option value="da-huy">Đã hủy</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Danh sách</p>
                  <h2>Việc đang hiển thị</h2>
                  <p class="customer-panel-subtext" id="provider-job-result-text">Đang tải dữ liệu yêu cầu...</p>
                </div>
              </div>
              <div class="customer-list customer-list-history" id="provider-job-list"></div>
            </section>
          </div>

          <aside class="customer-portal-sidebar">
            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Tài khoản</p>
                  <h2>Thông tin đang dùng</h2>
                </div>
              </div>
              <div class="customer-profile-summary">
                <article>
                  <span>Tên đơn vị / đội nhóm</span>
                  <strong>${escapeHtml(displayName)}</strong>
                </article>
                <article>
                  <span>Email vận hành</span>
                  <strong>${escapeHtml(email || "Chưa có dữ liệu")}</strong>
                </article>
                <article>
                  <span>Số điện thoại</span>
                  <strong>${escapeHtml(phone || "Chưa có dữ liệu")}</strong>
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
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("nha-cung-cap/dashboard.html"))}">
                  <strong>Dashboard nhà cung cấp</strong>
                  <span>Quay lại màn tổng quan với KPI và 3 việc mới nhất.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("nha-cung-cap/ho-so.html"))}">
                  <strong>Hồ sơ nhà cung cấp</strong>
                  <span>Cập nhật thông tin liên hệ và mật khẩu của tài khoản vận hành.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("bang-gia-chuyen-don.html"))}">
                  <strong>Bảng giá minh bạch</strong>
                  <span>Rà lại giá dịch vụ và các phụ phí đang áp dụng.</span>
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    `;

    const keywordInput = root.querySelector("#provider-job-keyword");
    const surveySelect = root.querySelector("#provider-job-survey-filter");
    const statusSelect = root.querySelector("#provider-job-status-filter");
    const listNode = root.querySelector("#provider-job-list");
    const resultNode = root.querySelector("#provider-job-result-text");

    function renderList() {
      const keyword = normalizeLowerText(keywordInput?.value || "");
      const survey = String(surveySelect?.value || "all").trim();
      const status = String(statusSelect?.value || "all").trim();

      const filtered = items.filter((item) => {
        if (survey === "co-khao-sat" && !item.surveyFirst) return false;
        if (survey === "khong-khao-sat" && item.surveyFirst) return false;
        if (status !== "all" && item.statusValue !== status) return false;

        if (!keyword) return true;
        const haystack = [
          item.code,
          item.serviceLabel,
          item.route,
          item.contactName,
          item.contactPhone,
          item.companyName,
          item.statusText,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });

      resultNode.textContent = filtered.length
        ? `Hiển thị ${filtered.length} yêu cầu theo bộ lọc hiện tại.`
        : "Không tìm thấy yêu cầu nào khớp với điều kiện lọc.";

      if (!filtered.length) {
        listNode.innerHTML = `
          <div class="customer-empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Không có yêu cầu phù hợp với bộ lọc hiện tại.</p>
            <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("nha-cung-cap/dashboard.html"))}">Về dashboard</a>
          </div>
        `;
        return;
      }

      listNode.innerHTML = filtered
        .map(
          (item) => `
            <article class="customer-order-card customer-order-card-history">
              <div class="customer-order-topline">
                <div class="customer-order-heading">
                  <p class="customer-order-code">${escapeHtml(item.code || "--")}</p>
                  <p class="customer-order-recipient">${escapeHtml(item.serviceLabel || "Yêu cầu chuyển dọn")}</p>
                  <p class="customer-order-dest">${escapeHtml(item.route || "Chưa có lộ trình")}</p>
                </div>
                ${renderStatusBadge(item.statusClass, item.statusText)}
              </div>
              <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                <span><b>Người liên hệ</b>${escapeHtml(item.contactName || "--")}</span>
                <span><b>Số điện thoại</b>${escapeHtml(item.contactPhone || "--")}</span>
                <span><b>Đơn vị</b>${escapeHtml(item.companyName || "--")}</span>
                <span><b>Khảo sát trước</b>${escapeHtml(item.surveyFirst ? "Có" : "Không")}</span>
                <span><b>Lịch</b>${escapeHtml(item.scheduleLabel || "--")}</span>
                <span><b>Tạo lúc</b>${escapeHtml(formatDateTime(item.createdAt))}</span>
                <span><b>Tạm tính</b>${escapeHtml(formatCurrency(item.estimatedAmount))}</span>
              </div>
              <div class="customer-order-actions customer-order-actions-compact">
                <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                  getProjectUrl(
                    `nha-cung-cap/chi-tiet-don-hang.html?code=${encodeURIComponent(item.code || "")}`,
                  ),
                )}">Xem chi tiết</a>
                <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("bang-gia-chuyen-don.html"))}">Rà giá</a>
              </div>
            </article>
          `,
        )
        .join("");
    }

    [keywordInput, surveySelect, statusSelect].forEach((node) => {
      node?.addEventListener("input", renderList);
      node?.addEventListener("change", renderList);
    });

    renderList();
  }

  (async function bootstrapJobs() {
    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=nha-cung-cap");
      return;
    }

    root.innerHTML = `
      <div class="customer-portal-shell">
        <div class="customer-empty-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Đang tải danh sách việc nhà cung cấp...</p>
        </div>
      </div>
    `;

    try {
      const items = await fetchBookings();
      renderJobs({ items });
    } catch (error) {
      console.error("Cannot render provider jobs:", error);
      root.innerHTML = `
        <div class="customer-portal-shell">
          <div class="customer-empty-state">
            <i class="fas fa-circle-exclamation"></i>
            <p>Không thể tải danh sách việc ở thời điểm hiện tại.</p>
          </div>
        </div>
      `;
    }
  })();
})(window, document);
