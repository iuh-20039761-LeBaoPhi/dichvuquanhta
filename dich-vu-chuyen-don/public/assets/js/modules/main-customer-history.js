(function (window, document) {
  if (window.__fastGoCustomerHistoryLoaded) return;
  window.__fastGoCustomerHistoryLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-history") {
    return;
  }

  const root = document.getElementById("customer-history-root");
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

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function" ? core.toProjectUrl(path) : path;
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return "Chờ báo giá chốt";
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

  function getStatusBadgeClass(statusClass) {
    if (statusClass === "xac-nhan") return "completed";
    if (statusClass === "dang-xu-ly") return "shipping";
    if (statusClass === "da-huy" || statusClass === "huy") return "cancelled";
    return "pending";
  }

  function renderHistory(data) {
    if (!data?.profile) {
      store.clearAuthSession?.();
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const identity = data.profile;
    const displayName = store.getDisplayName(identity);
    const items = Array.isArray(data?.history) ? data.history : [];
    const stats = store.getDashboardStats(items);

    root.innerHTML = `
      <div class="customer-portal-shell">
        <section class="customer-panel customer-panel-overview">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Lịch sử yêu cầu</p>
              <h2>Theo dõi toàn bộ yêu cầu chuyển dọn đã tạo</h2>
              <p class="customer-panel-subtext">Danh sách này chỉ giữ một luồng đặt lịch; nhu cầu khảo sát trước được theo dõi như một thuộc tính của đơn.</p>
            </div>
            <p class="customer-panel-note">Tài khoản đang xem: ${escapeHtml(displayName)}</p>
          </div>
          <div class="customer-kpi-grid">
            <article class="customer-kpi-card">
              <span>Tổng yêu cầu</span>
              <strong>${escapeHtml(String(stats.total || 0))}</strong>
            </article>
            <article class="customer-kpi-card">
              <span>Đang mở</span>
              <strong>${escapeHtml(String(stats.open_count || 0))}</strong>
            </article>
            <article class="customer-kpi-card">
              <span>Đã xác nhận</span>
              <strong>${escapeHtml(String(stats.confirmed_count || 0))}</strong>
            </article>
            <article class="customer-kpi-card">
              <span>Cần khảo sát trước</span>
              <strong>${escapeHtml(String(stats.survey_count || 0))}</strong>
            </article>
          </div>
        </section>

        <div class="customer-grid-two customer-grid-dashboard">
          <div class="customer-portal-main">
            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Bộ lọc</p>
                  <h2>Lọc và tìm nhanh</h2>
                </div>
              </div>
              <div class="customer-filter-form">
                <label>
                  Từ khóa
                  <input id="bo-loc-tu-khoa-lich-su" type="search" placeholder="Mã đơn, dịch vụ, địa chỉ..." />
                </label>
                <label>
                  Khảo sát trước
                  <select id="bo-loc-loai-lich-su">
                    <option value="all">Tất cả</option>
                    <option value="co-khao-sat">Có</option>
                    <option value="khong-khao-sat">Không</option>
                  </select>
                </label>
                <label>
                  Trạng thái
                  <select id="bo-loc-trang-thai-lich-su">
                    <option value="all">Tất cả</option>
                    <option value="moi">Mới tiếp nhận</option>
                    <option value="xac-nhan">Đã xác nhận</option>
                    <option value="dang-xu-ly">Đang xử lý</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Danh sách</p>
                  <h2>Yêu cầu đang hiển thị</h2>
                  <p class="customer-panel-subtext" id="customer-history-result-text">Đang tải dữ liệu lịch sử...</p>
                </div>
              </div>
              <div class="customer-list customer-list-history" id="customer-history-list"></div>
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
                  <span>Tên hiển thị</span>
                  <strong>${escapeHtml(displayName)}</strong>
                </article>
                <article>
                  <span>Email</span>
                  <strong>${escapeHtml(String(identity.email || "").trim() || "Chưa có dữ liệu")}</strong>
                </article>
                <article>
                  <span>Số điện thoại</span>
                  <strong>${escapeHtml(String(identity.phone || "").trim() || "Chưa có dữ liệu")}</strong>
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
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("khach-hang/dashboard.html"))}">
                  <strong>Về dashboard</strong>
                  <span>Quay lại màn tổng quan chính của khu khách hàng.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("khach-hang/ho-so.html"))}">
                  <strong>Hồ sơ khách hàng</strong>
                  <span>Rà lại thông tin liên hệ trước khi tạo đơn tiếp theo.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">
                  <strong>Tạo đơn mới</strong>
                  <span>Đi thẳng vào form đặt lịch nếu đã đủ dữ liệu.</span>
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    `;

    const keywordInput = root.querySelector("#bo-loc-tu-khoa-lich-su");
    const typeSelect = root.querySelector("#bo-loc-loai-lich-su");
    const statusSelect = root.querySelector("#bo-loc-trang-thai-lich-su");
    const listNode = root.querySelector("#customer-history-list");
    const resultNode = root.querySelector("#customer-history-result-text");

    function renderList() {
      const keyword = String(keywordInput?.value || "").trim().toLowerCase();
      const type = String(typeSelect?.value || "all").trim();
      const status = String(statusSelect?.value || "all").trim();

      const filtered = items.filter((item) => {
        if (type === "co-khao-sat" && !item.survey_first) return false;
        if (type === "khong-khao-sat" && item.survey_first) return false;
        if (status !== "all" && item.status_class !== status) return false;

        if (!keyword) return true;
        const haystack = [
          item.code,
          item.title,
          item.service_label,
          item.summary,
          item.meta,
          item.from_address,
          item.to_address,
          item.status_text,
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
            <p>Không có kết quả phù hợp. Thử đổi từ khóa hoặc mở rộng bộ lọc.</p>
            <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">Tạo yêu cầu mới</a>
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
                  <p class="customer-order-recipient">${escapeHtml(item.title || "Yêu cầu chuyển dọn")}</p>
                  <p class="customer-order-dest">${escapeHtml(item.summary || item.meta || "Chưa có mô tả chi tiết.")}</p>
                </div>
                <span class="customer-status-badge status-${escapeHtml(
                  getStatusBadgeClass(item.status_class),
                )}">${escapeHtml(item.status_text || "Mới tiếp nhận")}</span>
              </div>
              <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                <span><b>Loại</b>${escapeHtml(item.type_label || "--")}</span>
                <span><b>Khảo sát trước</b>${escapeHtml(item.survey_first ? "Có" : "Không")}</span>
                <span><b>Dịch vụ</b>${escapeHtml(item.service_label || "--")}</span>
                <span><b>Tạo lúc</b>${escapeHtml(formatDateTime(item.created_at))}</span>
                <span><b>Lịch</b>${escapeHtml(item.schedule_label || "--")}</span>
                <span><b>Điểm đi</b>${escapeHtml(item.from_address || "--")}</span>
                <span><b>Tạm tính</b>${escapeHtml(formatCurrency(item.estimated_amount))}</span>
              </div>
              <div class="customer-order-actions customer-order-actions-compact">
                ${
                  item.type === "dat-lich"
                    ? `<a class="customer-btn customer-btn-primary" href="${escapeHtml(
                        getProjectUrl(
                          `khach-hang/chi-tiet-hoa-don.html?code=${encodeURIComponent(
                            item.code || "",
                          )}`,
                        ),
                      )}">Xem chi tiết</a>`
                    : ""
                }
                <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                  getProjectUrl("dat-lich.html"),
                )}">Tạo lại</a>
              </div>
            </article>
          `,
        )
        .join("");
    }

    [keywordInput, typeSelect, statusSelect].forEach((node) => {
      node?.addEventListener("input", renderList);
      node?.addEventListener("change", renderList);
    });

    renderList();
  }

  (async function bootstrapHistory() {
    try {
      const result = await store.fetchHistory?.();
      renderHistory(result || null);
    } catch (error) {
      console.error("Cannot load customer history store:", error);
      renderHistory(null);
    }
  })();
})(window, document);
