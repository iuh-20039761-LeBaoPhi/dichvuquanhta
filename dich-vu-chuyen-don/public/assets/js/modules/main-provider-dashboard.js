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
      ? core.buildOrderDetailUrl("nha-cung-cap/chi-tiet-don-hang.html", orderIdentifier)
      : getProjectUrl(
          `nha-cung-cap/chi-tiet-don-hang.html?madonhang=${encodeURIComponent(
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

  function getStatusMeta(row) {
    const rawStatus = normalizeLowerText(row?.trang_thai || row?.status || "");

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
      id: normalizeText(row?.id || row?.remote_id || ""),
      code: store.resolveBookingRowCode?.(row) || normalizeText(row?.id || row?.remote_id || ""),
      serviceLabel: getBookingServiceLabel(
        row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn",
      ),
      statusClass: status.className,
      statusText: status.label,
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

  async function fetchRecentBookings() {
    let listFn = getKrudListFn();
    if (!listFn && typeof store.fetchProfile === "function") {
      await store.fetchProfile();
      listFn = getKrudListFn();
    }
    if (!listFn) return [];

    try {
      await store.autoCancelExpiredBookings?.();
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

    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const identity = profile;
    const displayName = store.getDisplayName(identity);
    const recentRequests = await fetchRecentBookings();
    const previewRequests = recentRequests.slice(0, 3);
    const pendingCount = recentRequests.filter(
      (item) => item.statusClass === "pending",
    ).length;
    const processingCount = recentRequests.filter(
      (item) => item.statusClass === "shipping",
    ).length;
    const confirmedCount = recentRequests.filter(
      (item) => item.statusClass === "completed",
    ).length;
    const summaryText = pendingCount
      ? "Ưu tiên rà các yêu cầu mới tiếp nhận để quyết định nhận đơn, khảo sát trước và phương án triển khai."
      : processingCount
        ? "Các đơn mới đã được nhận. Tiếp tục bám tiến độ triển khai và ghi chú điều phối cho khách hàng."
        : recentRequests.length
          ? "Nhịp xử lý hiện khá ổn định. Có thể mở danh sách đơn hàng để kiểm tra lại các đơn đã xác nhận hoặc đã hủy."
          : "Chưa có yêu cầu nào trong danh sách đơn hàng gần đây của nhà cung cấp.";

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-panel customer-panel-overview provider-dashboard-overview">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Tổng quan công việc</p>
              <h2>Xin chào, ${escapeHtml(displayName)}</h2>
              <p class="customer-panel-subtext">${escapeHtml(summaryText)}</p>
            </div>
            <div class="customer-inline-actions">
              <span class="customer-panel-note">Nhà cung cấp</span>
              <a class="customer-btn customer-btn-primary" href="${escapeHtml(
                getProjectUrl("nha-cung-cap/danh-sach-don-hang.html"),
              )}">
                <i class="fas fa-box"></i> Mở danh sách đơn hàng
              </a>
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
              <span>Đang xử lý</span>
              <strong>${escapeHtml(String(processingCount))}</strong>
              <small>${escapeHtml(
                processingCount ? "Đã có đầu mối nhận việc" : "Chưa có đơn đang xử lý",
              )}</small>
            </article>
            <article class="customer-kpi-card customer-kpi-card-completed">
              <span>Đã xác nhận</span>
              <strong>${escapeHtml(String(confirmedCount))}</strong>
              <small>${escapeHtml(
                confirmedCount ? "Đơn đã chốt/hoàn tất" : "Chưa có đơn xác nhận",
              )}</small>
            </article>
          </div>
        </section>

        <section class="customer-panel customer-panel-orders customer-panel-orders-main">
          <div class="customer-panel-head customer-panel-head-dashboard">
            <div>
              <p class="customer-section-kicker">Đơn hàng gần đây</p>
              <h2>3 yêu cầu cần nhìn trước</h2>
              <p class="customer-panel-subtext">Giữ một danh sách ngắn để đội vận hành vào việc nhanh hơn, đúng nhịp của khu khách hàng.</p>
            </div>
            <div class="customer-inline-actions customer-inline-actions-dashboard">
              <form action="${escapeHtml(
                getProjectUrl("nha-cung-cap/danh-sach-don-hang.html"),
              )}" method="GET" class="customer-quick-search">
                <input type="text" name="search" placeholder="Mã đơn, dịch vụ, khách..." required />
                <button type="submit" class="customer-btn customer-btn-primary customer-btn-sm">
                  <i class="fas fa-search"></i>
                </button>
              </form>
              <a class="customer-btn customer-btn-ghost customer-btn-sm" href="${escapeHtml(
                getProjectUrl("nha-cung-cap/danh-sach-don-hang.html"),
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
                              <p class="customer-order-code">${escapeHtml(request.code || "--")}</p>
                              <p class="customer-order-recipient">${escapeHtml(
                                request.serviceLabel || "Yêu cầu chuyển dọn",
                              )}</p>
                            </div>
                            ${renderStatusBadge(request.statusClass, request.statusText)}
                          </div>
                          <p class="customer-order-route">${escapeHtml(
                            request.route || "Chưa có lộ trình",
                          )}</p>
                          <div class="customer-order-meta customer-order-meta-compact">
                            <span><b>Khách hàng</b>${escapeHtml(request.contactName || "--")}</span>
                            <span><b>Lịch</b>${escapeHtml(request.scheduleLabel || "--")}</span>
                            <span><b>Khảo sát</b>${escapeHtml(
                              request.surveyFirst ? "Có" : "Không",
                            )}</span>
                            <span><b>Tạm tính</b>${escapeHtml(
                              formatCurrency(request.estimatedAmount),
                            )}</span>
                          </div>
                          <div class="customer-order-actions customer-order-actions-compact">
                            <a class="customer-btn customer-btn-primary customer-btn-sm" href="${escapeHtml(
                              getOrderDetailUrl(request.id || request.code || ""),
                            )}">Xem chi tiết</a>
                          </div>
                        </article>
                      `,
                    )
                    .join("")
                : `
                  <div class="customer-empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Chưa có yêu cầu nào trong bảng đặt lịch để hiển thị ở khu nhà cung cấp.</p>
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
