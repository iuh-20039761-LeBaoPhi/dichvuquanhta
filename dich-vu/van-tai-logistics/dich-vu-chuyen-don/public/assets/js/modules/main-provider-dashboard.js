import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";
import {
  formatBookingScheduleLabel,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
} from "./main-booking-shared.js";
import { createProviderAutoRefreshController } from "./main-provider-refresh.js";
import { extractRows, getKrudListFn } from "./api/krud-client.js";

const providerDashboardModule = (function (window, document) {
  if (window.__fastGoProviderDashboardLoaded) {
    return window.__fastGoProviderDashboardModule || null;
  }
  window.__fastGoProviderDashboardLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-dashboard") {
    return;
  }

  const root = document.getElementById("provider-dashboard-root");
  if (!root || !store) return;
  let refreshController = null;

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

  function getOrderDetailUrl(orderIdentifier) {
    return typeof core.buildOrderDetailUrl === "function"
      ? core.buildOrderDetailUrl("nha-cung-cap/chi-tiet-don-hang-chuyendon.html", orderIdentifier)
      : getProjectUrl(
          `nha-cung-cap/chi-tiet-don-hang-chuyendon.html?madonhang=${encodeURIComponent(
            orderIdentifier || "",
          )}`,
        );
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

  function formatDateLabel(dateValue, timeValue) {
    return formatBookingScheduleLabel(dateValue, timeValue) || "--";
  }

  function getStatusMeta(source) {
    return store.getBookingDisplayStatus?.(source) || {
      status_text: "Mới tiếp nhận",
      badge_class: "pending",
      status_class: "moi",
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
      id: normalizeText(row?.id || row?.remote_id || ""),
      code: store.resolveBookingRowCode?.(row) || normalizeText(row?.id || row?.remote_id || ""),
      serviceLabel: getBookingServiceLabel(
        row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn",
      ),
      statusClass: status.badge_class,
      statusValue: status.status_class,
      statusText: status.status_text,
      route:
        fromAddress && toAddress
          ? `${fromAddress} → ${toAddress}`
          : fromAddress || toAddress || "Chưa đủ địa chỉ",
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

  async function fetchDashboardBookings() {
    let listFn = getKrudListFn();
    if (!listFn && typeof store.fetchProfile === "function") {
      await store.fetchProfile();
      listFn = getKrudListFn();
    }
    if (!listFn) return [];

    try {
      await store.autoCancelExpiredBookings?.();
      const providerActor = store.getCurrentProviderActor?.();
      const limit = 200;
      const maxPages = 10;
      const rows = [];

      for (let page = 1; page <= maxPages; page += 1) {
        const response = await Promise.resolve(
          listFn({
            table: store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich",
            page,
            limit,
            sort: {
              created_at: "desc",
            },
          }),
        );

        const pageRows = extractRows(response);
        if (!pageRows.length) break;

        rows.push(
          ...pageRows.filter(
            (row) =>
              store.canProviderAccessBookingRow?.(row, providerActor) &&
              !store.isRowOwnedByProviderActor?.(row, providerActor),
          ),
        );
        if (pageRows.length < limit) break;
      }

      return rows.map(normalizeBookingRow);
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
    const auth = core.getOrderDetailAccessCredentials?.() || core.getUrlAuthCredentials?.() || {
      username: "",
      password: "",
    };
    await store.autoAuthFromUrlCredentials?.(auth);

    let profile = null;
    try {
      profile = await store.fetchProfile?.();
    } catch (error) {
      console.error("Cannot verify provider profile for dashboard:", error);
    }
    if (!profile) {
      store.clearAuthSession?.();
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const canUseProviderPortal =
      store.hasProviderCapability?.(profile || store.readIdentity?.()) || false;
    if (!canUseProviderPortal) {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const identity = profile;
    const displayName = store.getDisplayName(identity);
    const allRequests = await fetchDashboardBookings();
    const previewRequests = allRequests.slice(0, 3);
    const pendingCount = allRequests.filter(
      (item) => item.statusValue === "moi",
    ).length;
    const acceptedCount = allRequests.filter(
      (item) => item.statusValue === "da-nhan",
    ).length;
    const shippingCount = allRequests.filter(
      (item) => item.statusValue === "dang-trien-khai",
    ).length;
    const completedCount = allRequests.filter(
      (item) => item.statusValue === "da-hoan-thanh",
    ).length;
    const summaryText = pendingCount
      ? "Ưu tiên bám các đơn đã giao cho bạn nhưng còn mới tiếp nhận để chốt hướng triển khai."
      : acceptedCount || shippingCount
        ? "Các đơn khách hàng đã giao cho bạn đang được tiếp nhận hoặc triển khai. Tiếp tục bám tiến độ và cập nhật ghi chú."
        : allRequests.length
          ? "Danh sách đơn đã giao cho bạn hiện ổn định. Có thể mở danh sách để rà lại các đơn đã hoàn thành hoặc đã hủy."
          : "Chưa có đơn nào được khách hàng giao cho tài khoản này.";

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-panel customer-panel-overview provider-dashboard-overview">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Tổng quan nhận đơn</p>
              <h2>Xin chào, ${escapeHtml(displayName)}</h2>
              <p class="customer-panel-subtext">${escapeHtml(summaryText)}</p>
            </div>
            <div class="customer-inline-actions">
              <span class="customer-panel-note">Nhà cung cấp</span>
            </div>
          </div>
          <div class="customer-kpi-grid customer-kpi-grid-dashboard">
            <article class="customer-kpi-card customer-kpi-card-total">
              <span>Mới tiếp nhận</span>
              <strong>${escapeHtml(String(pendingCount))}</strong>
              <small>${escapeHtml(
                pendingCount ? "Cần quyết định nhận đơn" : "Không có đơn chờ mới",
              )}</small>
            </article>
            <article class="customer-kpi-card customer-kpi-card-pending">
              <span>Đã nhận / triển khai</span>
              <strong>${escapeHtml(String(acceptedCount + shippingCount))}</strong>
              <small>${escapeHtml(
                acceptedCount + shippingCount ? "Đơn đã có đầu mối hoặc đang làm việc" : "Chưa có đơn đang triển khai",
              )}</small>
            </article>
            <article class="customer-kpi-card customer-kpi-card-completed">
              <span>Đã hoàn thành</span>
              <strong>${escapeHtml(String(completedCount))}</strong>
              <small>${escapeHtml(
                completedCount ? "Đơn đã hoàn tất" : "Chưa có đơn hoàn thành",
              )}</small>
            </article>
          </div>
        </section>

        <section class="customer-panel customer-panel-orders customer-panel-orders-main">
          <div class="customer-panel-head customer-panel-head-dashboard">
            <div>
              <p class="customer-section-kicker">Đơn gần đây</p>
              <h2>3 đơn khách hàng đã giao cho tôi</h2>
              <p class="customer-panel-subtext">Giữ một danh sách ngắn để NCC nhìn ra ngay đơn vừa được giao và bám tiến độ xử lý.</p>
            </div>
            <div class="customer-inline-actions customer-inline-actions-dashboard">
              <form action="${escapeHtml(
                getProjectUrl("nha-cung-cap/danh-sach-don-hang-chuyendon.html"),
              )}" method="GET" class="customer-quick-search">
                <input type="text" name="search" placeholder="Mã đơn, dịch vụ, khách..." required />
                <button type="submit" class="customer-btn customer-btn-primary customer-btn-sm">
                  <i class="fas fa-search"></i>
                </button>
              </form>
              <a class="customer-btn customer-btn-ghost customer-btn-sm" href="${escapeHtml(
                getProjectUrl("nha-cung-cap/danh-sach-don-hang-chuyendon.html"),
              )}">
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
                              <p class="customer-order-recipient">${escapeHtml(
                                request.serviceLabel || "Yêu cầu chuyển dọn",
                              )}</p>
                              <div class="customer-order-heading-meta">
                                <p class="customer-order-code">${escapeHtml(request.code || "--")}</p>
                                ${renderStatusBadge(request.statusClass, request.statusText)}
                              </div>
                              <p class="customer-order-route">${escapeHtml(
                                request.route || "Chưa có lộ trình",
                              )}</p>
                            </div>
                            <div class="customer-order-side">
                              <div class="customer-order-price-block">
                                <span class="customer-order-price-label">Tạm tính</span>
                                <strong class="customer-order-price">${escapeHtml(
                                  formatCurrency(request.estimatedAmount),
                                )}</strong>
                              </div>
                              <div class="customer-order-actions customer-order-actions-compact">
                                <a class="customer-btn customer-btn-primary customer-btn-sm" href="${escapeHtml(
                                  getOrderDetailUrl(request.id || request.code || ""),
                                )}">Xem chi tiết</a>
                              </div>
                            </div>
                          </div>
                          <div class="customer-order-meta customer-order-meta-compact">
                            <span><b>Khách hàng</b><span class="customer-order-meta-value">${escapeHtml(request.contactName || "--")}</span></span>
                            <span><b>Lịch</b><span class="customer-order-meta-value">${escapeHtml(request.scheduleLabel || "--")}</span></span>
                            <span><b>Khảo sát</b><span class="customer-order-meta-value">${escapeHtml(
                              request.surveyFirst ? "Có" : "Không",
                            )}</span></span>
                          </div>
                        </article>
                      `,
                    )
                    .join("")
                : `
                  <div class="customer-empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Chưa có đơn nào được khách hàng giao cho tài khoản này.</p>
                  </div>
                `
            }
          </div>
        </section>
      </div>
    `;
  }

  renderProviderDashboard().catch((error) => {
    console.error("Cannot render provider dashboard:", error);
    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <div class="customer-empty-state">
          <i class="fas fa-circle-exclamation"></i>
          <p>Không thể tải dashboard nhà cung cấp ở thời điểm hiện tại.</p>
        </div>
      </div>
    `;
  });
  refreshController = createProviderAutoRefreshController(window, {
    intervalMs: 60 * 1000,
    onTick: async () => {
      await renderProviderDashboard();
    },
  });
  refreshController.start();
  window.addEventListener("beforeunload", function () {
    refreshController?.stop?.();
  });

  const moduleApi = {};
  window.__fastGoProviderDashboardModule = moduleApi;
  return moduleApi;
})(window, document);

export default providerDashboardModule;
