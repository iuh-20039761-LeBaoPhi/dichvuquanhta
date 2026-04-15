import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const customerDashboardModule = (function (window, document) {
  if (window.__fastGoCustomerDashboardLoaded) return window.__fastGoCustomerDashboardModule || null;
  window.__fastGoCustomerDashboardLoaded = true;

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

  function getOrderDetailUrl(orderIdentifier) {
    return typeof core.buildOrderDetailUrl === "function"
      ? core.buildOrderDetailUrl("khach-hang/chi-tiet-hoa-don.html", orderIdentifier)
      : getProjectUrl(
          `khach-hang/chi-tiet-hoa-don.html?madonhang=${encodeURIComponent(
            orderIdentifier || "",
          )}`,
        );
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

  function getRouteSummary(request) {
    const fromAddress = String(request?.from_address || "").trim();
    const toAddress = String(request?.to_address || "").trim();
    if (fromAddress || toAddress) {
      return `Từ ${fromAddress || "--"} đến ${toAddress || "--"}`;
    }
    return String(request?.summary || request?.meta || "Đang chờ cập nhật thêm từ hệ thống.").trim();
  }

  function renderDashboard(data) {
    if (!data?.profile) {
      store.clearAuthSession?.();
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const identity = data.profile;
    const displayName = store.getDisplayName(identity);
    const requests = Array.isArray(data?.recent_requests)
      ? data.recent_requests
      : [];
    const stats = data?.stats || store.getDashboardStats([]);
    const totalRequests = Number(stats.total || 0);
    const openRequests = Number(stats.open_count || 0);
    const confirmedRequests = Number(stats.confirmed_count || 0);
    const previewRequests = requests.slice(0, 3);
    const activeRequests = openRequests + confirmedRequests;
    const summaryText = activeRequests
      ? "Tập trung vào các đơn đang mở hoặc đã xác nhận để xử lý lịch, khảo sát và phương án xe nhanh hơn."
      : totalRequests
        ? "Mọi đơn gần đây đang ở trạng thái ổn định. Bạn có thể mở danh sách đơn hàng để xem lại chi tiết."
        : "Bạn chưa có yêu cầu nào trong tài khoản này. Tạo yêu cầu mới để bắt đầu theo dõi ngay tại đây.";
    const heroState = openRequests
      ? `${openRequests} yêu cầu đang mở`
      : confirmedRequests
        ? `${confirmedRequests} yêu cầu đã xác nhận`
        : "Chưa có đơn cần theo dõi ngay";
    const kpiCards = [
      {
        label: "Tổng yêu cầu",
        value: String(totalRequests),
        hint: totalRequests ? "Toàn bộ đơn đã tạo" : "Chưa phát sinh yêu cầu",
        className: "customer-kpi-card-total",
      },
      {
        label: "Đang mở",
        value: String(openRequests),
        hint: openRequests ? "Cần theo dõi hoặc khảo sát" : "Không có đơn đang mở",
        className: "customer-kpi-card-pending",
      },
      {
        label: "Đã xác nhận",
        value: String(confirmedRequests),
        hint: confirmedRequests ? "Đã chốt lịch hoặc phương án" : "Chưa có đơn xác nhận",
        className: "customer-kpi-card-completed",
      },
    ];

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-panel customer-panel-overview">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Tổng quan đơn hàng</p>
              <h2>Tóm tắt nhanh để theo dõi</h2>
              <p class="customer-panel-subtext">${escapeHtml(heroState)}. ${escapeHtml(summaryText)}</p>
            </div>
            <div class="customer-inline-actions">
              <span class="customer-panel-note">${activeRequests ? "Cần theo dõi" : "Ổn định"}</span>
              <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">
                <i class="fas fa-plus"></i> Tạo yêu cầu mới
              </a>
            </div>
          </div>
          <div class="customer-kpi-grid customer-kpi-grid-dashboard">
            ${kpiCards
              .map(
                (item) => `
                  <article class="customer-kpi-card ${item.className}">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${escapeHtml(item.value)}</strong>
                    <small>${escapeHtml(item.hint)}</small>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="customer-panel customer-panel-orders customer-panel-orders-main">
          <div class="customer-panel-head customer-panel-head-dashboard">
            <div>
              <p class="customer-section-kicker">Đơn hàng gần đây</p>
              <h2>Đơn gần nhất cần bạn theo dõi</h2>
              <p class="customer-panel-subtext">Giữ lại danh sách ngắn để bạn nhìn ra ngay đơn mới hoặc đơn vừa đổi trạng thái.</p>
            </div>
            <div class="customer-inline-actions customer-inline-actions-dashboard">
              <form action="${escapeHtml(getProjectUrl("khach-hang/danh-sach-don-hang.html"))}" method="GET" class="customer-quick-search">
                <input type="text" name="search" placeholder="Nhập mã đơn, dịch vụ..." required />
                <button type="submit" class="customer-btn customer-btn-primary customer-btn-sm"><i class="fas fa-search"></i></button>
              </form>
              <a class="customer-btn customer-btn-ghost customer-btn-sm" href="${escapeHtml(getProjectUrl("khach-hang/danh-sach-don-hang.html"))}">
                Xem tất cả
              </a>
            </div>
          </div>
          <div class="customer-list customer-list-compact">
            ${
              previewRequests.length
                ? previewRequests
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
                          <p class="customer-order-route">${escapeHtml(getRouteSummary(request))}</p>
                          <div class="customer-order-meta customer-order-meta-compact">
                            <span><b>Dịch vụ</b>${escapeHtml(request.service_label || "--")}</span>
                            <span><b>Tạm tính</b>${escapeHtml(formatCurrency(request.estimated_amount))}</span>
                            <span><b>Thời gian</b>${escapeHtml(formatDateTime(request.created_at || request.schedule_date || ""))}</span>
                          </div>
                          <div class="customer-order-actions customer-order-actions-compact">
                            ${
                              request.type === "dat-lich"
                                ? `<a class="customer-btn customer-btn-primary customer-btn-sm" href="${escapeHtml(
                                    getOrderDetailUrl(request.remote_id || request.code || ""),
                                  )}">Xem chi tiết</a>`
                                : `<a class="customer-btn customer-btn-primary customer-btn-sm" href="${escapeHtml(
                                    getProjectUrl("khach-hang/danh-sach-don-hang.html"),
                                  )}">Mở đơn hàng</a>`
                            }
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
      </div>
    `;
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
  const moduleApi = {};
  window.__fastGoCustomerDashboardModule = moduleApi;
  return moduleApi;
})(window, document);

export default customerDashboardModule;
