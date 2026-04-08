(function (window, document) {
  if (window.__fastGoCustomerDashboardLoaded) return;
  window.__fastGoCustomerDashboardLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-dashboard") {
    return;
  }

  const root = document.getElementById("customer-dashboard-root");
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

  function getStatusBadgeClass(statusClass) {
    if (statusClass === "xac-nhan") return "completed";
    if (statusClass === "dang-xu-ly") return "shipping";
    if (statusClass === "da-huy" || statusClass === "huy") return "cancelled";
    return "pending";
  }

  function renderDashboard(data) {
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
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const requests = Array.isArray(data?.recent_requests)
      ? data.recent_requests
      : [];
    const stats = data?.stats || store.getDashboardStats([]);

    root.innerHTML = `
      <div class="customer-portal-shell">
        <section class="customer-panel customer-dashboard-hero">
          <div class="customer-dashboard-hero-copy">
            <p class="customer-section-kicker">Portal khách hàng</p>
            <h2>Chào ${escapeHtml(displayName)}, toàn bộ yêu cầu chuyển dọn của bạn đang được gom về đây.</h2>
            <p class="customer-dashboard-hero-text">
              Giao diện đã chuyển sang cùng ngôn ngữ với portal bên giao hàng để khách hàng nhìn lịch sử,
              đặt lịch và quản lý hồ sơ trong một khung quen thuộc hơn.
            </p>
            <div class="customer-dashboard-hero-actions">
              <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">
                <i class="fas fa-calendar-check"></i>
                Đặt lịch chuyển dọn
              </a>
              <a class="customer-btn customer-btn-ghost" href="${escapeHtml(getProjectUrl("lich-su-yeu-cau.html"))}">
                <i class="fas fa-clock-rotate-left"></i>
                Xem lịch sử yêu cầu
              </a>
            </div>
          </div>
          <div class="customer-dashboard-hero-summary">
            <p class="customer-dashboard-hero-state">
              <i class="fas fa-circle-check"></i>&nbsp; Đồng bộ theo tài khoản hiện tại
            </p>
            <div class="customer-dashboard-highlight-list">
              <article class="customer-dashboard-highlight">
                <span>Yêu cầu đang mở</span>
                <strong>${escapeHtml(String(stats.open_count || 0))}</strong>
              </article>
              <article class="customer-dashboard-highlight">
                <span>Lịch đã xác nhận</span>
                  <strong>${escapeHtml(String(stats.confirmed_count || 0))}</strong>
                </article>
                <article class="customer-dashboard-highlight">
                <span>Cần khảo sát trước</span>
                <strong>${escapeHtml(String(stats.survey_count || 0))}</strong>
              </article>
            </div>
          </div>
        </section>

        <div class="customer-grid-two customer-grid-dashboard">
          <div class="customer-portal-main">
            <section class="customer-panel customer-panel-orders">
              <div class="customer-panel-head customer-panel-head-dashboard">
                <div>
                  <p class="customer-section-kicker">Yêu cầu gần đây</p>
                  <h2>Nhịp xử lý mới nhất</h2>
                  <p class="customer-panel-subtext">Danh sách này đọc cùng nguồn dữ liệu với lịch sử yêu cầu và chi tiết hóa đơn.</p>
                </div>
                <div class="customer-inline-actions">
                  <a class="customer-btn customer-btn-ghost customer-btn-sm" href="${escapeHtml(getProjectUrl("khach-hang/lich-su-yeu-cau.html"))}">
                    Xem toàn bộ lịch sử
                  </a>
                </div>
              </div>
              <div class="customer-list customer-list-compact">
                ${
                  requests.length
                    ? requests
                        .map(
                          (request) => `
                            <article class="customer-order-card customer-order-card-compact">
                              <div class="customer-order-topline">
                                <div class="customer-order-heading">
                                  <p class="customer-order-code">${escapeHtml(request.code || "--")}</p>
                                  <p class="customer-order-recipient">${escapeHtml(request.title || "Yêu cầu chuyển dọn")}</p>
                                </div>
                                <span class="customer-status-badge status-${escapeHtml(
                                  getStatusBadgeClass(request.status_class),
                                )}">${escapeHtml(request.status_text || "Mới tiếp nhận")}</span>
                              </div>
                              <p class="customer-order-route">${escapeHtml(request.summary || "Đang chờ cập nhật thêm từ hệ thống.")}</p>
                              <div class="customer-order-meta customer-order-meta-compact">
                                <span><b>Dịch vụ</b>${escapeHtml(request.service_label || "--")}</span>
                                <span><b>Lịch dự kiến</b>${escapeHtml(request.schedule_label || "--")}</span>
                                <span><b>Tạm tính</b>${escapeHtml(formatCurrency(request.estimated_amount))}</span>
                              </div>
                              <div class="customer-order-actions customer-order-actions-compact">
                                ${
                                  request.type === "dat-lich"
                                    ? `<a class="customer-btn customer-btn-primary" href="${escapeHtml(
                                        getProjectUrl(
                                          `khach-hang/chi-tiet-hoa-don.html?code=${encodeURIComponent(
                                            request.code || "",
                                          )}`,
                                        ),
                                      )}">Xem chi tiết</a>`
                                    : ""
                                }
                                <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                                  getProjectUrl(
                                    "dat-lich.html",
                                  ),
                                )}">Tạo lại</a>
                              </div>
                            </article>
                          `,
                        )
                        .join("")
                    : `
                      <div class="customer-empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Chưa có yêu cầu nào trong tài khoản này. Bạn có thể bắt đầu trực tiếp từ form đặt lịch.</p>
                        <a class="customer-btn customer-btn-primary" href="${escapeHtml(
                          getProjectUrl("dat-lich.html"),
                        )}">Tạo yêu cầu đầu tiên</a>
                      </div>
                    `
                }
              </div>
            </section>

            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Lối tắt</p>
                  <h2>Các đường đi nên dùng trước</h2>
                </div>
              </div>
              <div class="customer-quicklinks-strip">
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("cam-nang.html"))}">
                  <strong>Cẩm nang chuẩn bị</strong>
                  <span>Đọc checklist đóng gói, phân loại đồ và mẹo giảm phát sinh trước ngày chuyển.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("khach-hang/ho-so.html"))}">
                  <strong>Quản lý hồ sơ</strong>
                  <span>Cập nhật đầu mối liên hệ, email và số điện thoại đang dùng trong portal.</span>
                </a>
                <a class="customer-quicklink-item" href="${escapeHtml(getProjectUrl("khach-hang/lich-su-yeu-cau.html"))}">
                  <strong>Rà lại lịch sử</strong>
                  <span>Đối chiếu các đơn đã tạo và xem đơn nào có yêu cầu khảo sát trước.</span>
                </a>
              </div>
            </section>
          </div>

          <aside class="customer-portal-sidebar">
            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Tài khoản</p>
                  <h2>Hồ sơ đang dùng</h2>
                </div>
              </div>
              <div class="customer-profile-summary">
                <article>
                  <span>Tên hiển thị</span>
                  <strong>${escapeHtml(displayName)}</strong>
                </article>
                <article>
                  <span>Email</span>
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
                  <p class="customer-section-kicker">Nhắc việc</p>
                  <h2>Bước nên làm tiếp</h2>
                </div>
              </div>
              <div class="customer-list">
                <article class="customer-todo info">
                  <p>Kiểm tra lại hồ sơ liên hệ trước khi tạo đơn tiếp theo để điều phối có đúng đầu mối.</p>
                </article>
                <article class="customer-todo warning">
                  <p>Nếu đơn đang mở chưa có breakdown phí, hãy tạo mới theo luồng hiện tại để hóa đơn lưu đầy đủ hơn.</p>
                </article>
                <article class="customer-todo success">
                  <p>Các đơn đặt lịch mới giờ đã mở được chi tiết hóa đơn với breakdown giá ngay trong khu khách hàng.</p>
                </article>
              </div>
            </section>

            <section class="customer-panel">
              <div class="customer-panel-head">
                <div>
                  <p class="customer-section-kicker">Phiên làm việc</p>
                  <h2>Kết thúc phiên</h2>
                </div>
              </div>
              <div class="customer-inline-actions">
                <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                  getProjectUrl("dang-nhap.html?vai-tro=khach-hang"),
                )}" data-dashboard-logout>Đăng xuất</a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    `;

    root.querySelector("[data-dashboard-logout]")?.addEventListener("click", function (event) {
      event.preventDefault();
      store.clearAuthSession();
      window.location.href = getProjectUrl("dang-nhap.html");
    });
  }

  (async function bootstrapDashboard() {
    try {
      const result = await store.fetchDashboard?.();
      renderDashboard(result || null);
    } catch (error) {
      console.error("Cannot load customer dashboard store:", error);
      renderDashboard(null);
    }
  })();
})(window, document);
