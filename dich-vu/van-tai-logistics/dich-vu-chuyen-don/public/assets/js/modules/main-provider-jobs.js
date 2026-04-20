import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";
import {
  formatBookingScheduleLabel,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
} from "./main-booking-shared.js";
import { createProviderAutoRefreshController } from "./main-provider-refresh.js";
import { extractRows, getKrudListFn } from "./api/krud-client.js";

const providerJobsModule = (function (window, document) {
  if (window.__fastGoProviderJobsLoaded) {
    return window.__fastGoProviderJobsModule || null;
  }
  window.__fastGoProviderJobsLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-jobs") {
    return;
  }

  const root = document.getElementById("provider-jobs-root");
  if (!root || !store) return;
  let refreshController = null;
  const ITEMS_PER_PAGE = 10;

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
    return formatBookingScheduleLabel(dateValue, timeValue) || "--";
  }

  function normalizePageNumber(value, fallback = 1) {
    const page = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(page) && page > 0 ? page : fallback;
  }

  function buildPaginationModel(currentPage, totalPages) {
    if (totalPages <= 1) return [];

    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    const normalizedPages = Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((left, right) => left - right);

    const model = [];
    normalizedPages.forEach((page, index) => {
      if (index > 0 && page - normalizedPages[index - 1] > 1) {
        model.push("ellipsis");
      }
      model.push(page);
    });

    return model;
  }

  function persistCurrentFiltersToUrl() {
    const keywordInput = root.querySelector("#provider-job-keyword");
    const surveySelect = root.querySelector("#provider-job-survey-filter");
    const statusSelect = root.querySelector("#provider-job-status-filter");
    if (!keywordInput && !surveySelect && !statusSelect) return;

    const url = new URL(window.location.href);
    const nextKeyword = String(keywordInput?.value || "").trim();
    const nextSurvey = String(surveySelect?.value || "all").trim();
    const nextStatus = String(statusSelect?.value || "all").trim();

    if (nextKeyword) {
      url.searchParams.set("search", nextKeyword);
    } else {
      url.searchParams.delete("search");
    }

    if (nextSurvey !== "all") {
      url.searchParams.set("survey", nextSurvey);
    } else {
      url.searchParams.delete("survey");
    }

    if (nextStatus !== "all") {
      url.searchParams.set("status", nextStatus);
    } else {
      url.searchParams.delete("status");
    }

    const nextPage = normalizePageNumber(root.getAttribute("data-current-page"), 1);
    if (nextPage > 1) {
      url.searchParams.set("page", String(nextPage));
    } else {
      url.searchParams.delete("page");
    }

    window.history.replaceState({}, "", url.toString());
  }

  function getStatusMeta(source) {
    return store.getBookingDisplayStatus?.(source) || {
      status_class: "moi",
      status_text: "Mới tiếp nhận",
      badge_class: "pending",
    };
  }

  function normalizeStatusFilterValue(value) {
    const normalized = String(value || "").trim();
    if (normalized === "dang-xu-ly") return "da-nhan";
    if (normalized === "xac-nhan") return "da-hoan-thanh";
    return normalized || "all";
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
      contactPhone: normalizeText(row?.so_dien_thoai || row?.phone || ""),
      surveyFirst: hasSurveyFirst(row),
    };
  }

  async function fetchBookings() {
    let listFn = getKrudListFn();
    if (!listFn && typeof store.fetchProfile === "function") {
      await store.fetchProfile();
      listFn = getKrudListFn();
    }
    if (!listFn) return [];

    try {
      await store.autoCancelExpiredBookings?.();
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

        rows.push(...pageRows);
        if (pageRows.length < limit) break;
      }

      return rows.map(normalizeBookingRow);
    } catch (error) {
      console.error("Cannot load provider jobs:", error);
      return [];
    }
  }

  function getRouteSummary(item) {
    return String(item?.route || "Chưa có lộ trình").trim();
  }

  function renderJobs(data) {
    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    const params = new URLSearchParams(window.location.search);
    const initialKeyword = String(params.get("search") || "").trim();
    const initialSurvey = String(params.get("survey") || "all").trim();
    const initialStatus = normalizeStatusFilterValue(params.get("status") || "all");
    let currentPage = normalizePageNumber(params.get("page"), 1);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-panel customer-orders-panel provider-jobs-panel">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Danh sách đơn hàng</p>
              <h2>Tìm và lọc yêu cầu chuyển dọn</h2>
              <p class="customer-panel-subtext">${escapeHtml(
                String(items.length),
              )} đơn hàng trong danh sách hiện tại</p>
            </div>
          </div>

          <form class="customer-filter-form customer-filter-form-compact customer-filter-form-orders provider-filter-form-jobs" id="provider-jobs-filter-form">
            <label class="provider-filter-field-search">
              <span>Tìm nhanh</span>
              <input id="provider-job-keyword" type="search" value="${escapeHtml(
                initialKeyword,
              )}" placeholder="Mã đơn, dịch vụ, khách, địa chỉ..." />
            </label>
            <label class="provider-filter-field-survey">
              <span>Khảo sát trước</span>
              <select id="provider-job-survey-filter">
                <option value="all" ${initialSurvey === "all" ? "selected" : ""}>Tất cả</option>
                <option value="co-khao-sat" ${initialSurvey === "co-khao-sat" ? "selected" : ""}>Có</option>
                <option value="khong-khao-sat" ${initialSurvey === "khong-khao-sat" ? "selected" : ""}>Không</option>
              </select>
            </label>
            <label class="provider-filter-field-status">
              <span>Trạng thái</span>
              <select id="provider-job-status-filter">
                <option value="all" ${initialStatus === "all" ? "selected" : ""}>Tất cả</option>
                <option value="moi" ${initialStatus === "moi" ? "selected" : ""}>Mới tiếp nhận</option>
                <option value="da-nhan" ${initialStatus === "da-nhan" ? "selected" : ""}>Đã nhận đơn</option>
                <option value="dang-trien-khai" ${initialStatus === "dang-trien-khai" ? "selected" : ""}>Đang triển khai</option>
                <option value="da-hoan-thanh" ${initialStatus === "da-hoan-thanh" ? "selected" : ""}>Đã hoàn thành</option>
                <option value="da-huy" ${initialStatus === "da-huy" ? "selected" : ""}>Đã hủy</option>
              </select>
            </label>
            <div class="customer-inline-actions customer-filter-actions">
              <button class="customer-btn customer-btn-primary" type="submit">Lọc</button>
              <button class="customer-btn customer-btn-ghost customer-btn-sm" type="button" id="provider-jobs-reset">Đặt lại</button>
            </div>
          </form>

          <div class="customer-active-filters" id="provider-jobs-active-filters">
            <span class="customer-active-filters-note">Đang hiển thị toàn bộ yêu cầu.</span>
          </div>

          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Danh sách</p>
              <h2>Đơn hàng đang hiển thị</h2>
              <p class="customer-panel-subtext" id="provider-job-result-text">Đang tải dữ liệu yêu cầu...</p>
            </div>
          </div>

          <div class="customer-list customer-list-history" id="provider-job-list"></div>
          <div class="customer-pagination-wrap" id="provider-jobs-pagination-wrap" hidden>
            <p class="customer-pagination-summary" id="provider-jobs-pagination-summary"></p>
            <div class="customer-pagination" id="provider-jobs-pagination"></div>
          </div>
        </section>
      </div>
    `;

    const filterForm = root.querySelector("#provider-jobs-filter-form");
    const keywordInput = root.querySelector("#provider-job-keyword");
    const surveySelect = root.querySelector("#provider-job-survey-filter");
    const statusSelect = root.querySelector("#provider-job-status-filter");
    const resetButton = root.querySelector("#provider-jobs-reset");
    const listNode = root.querySelector("#provider-job-list");
    const resultNode = root.querySelector("#provider-job-result-text");
    const activeFiltersNode = root.querySelector("#provider-jobs-active-filters");
    const paginationWrapNode = root.querySelector("#provider-jobs-pagination-wrap");
    const paginationSummaryNode = root.querySelector("#provider-jobs-pagination-summary");
    const paginationNode = root.querySelector("#provider-jobs-pagination");

    function syncFilterUrl() {
      const url = new URL(window.location.href);
      const nextKeyword = String(keywordInput?.value || "").trim();
      const nextSurvey = String(surveySelect?.value || "all").trim();
      const nextStatus = String(statusSelect?.value || "all").trim();

      if (nextKeyword) {
        url.searchParams.set("search", nextKeyword);
      } else {
        url.searchParams.delete("search");
      }

      if (nextSurvey !== "all") {
        url.searchParams.set("survey", nextSurvey);
      } else {
        url.searchParams.delete("survey");
      }

      if (nextStatus !== "all") {
        url.searchParams.set("status", nextStatus);
      } else {
        url.searchParams.delete("status");
      }

      if (currentPage > 1) {
        url.searchParams.set("page", String(currentPage));
      } else {
        url.searchParams.delete("page");
      }

      window.history.replaceState({}, "", url.toString());
    }

    function renderList() {
      const keyword = normalizeLowerText(keywordInput?.value || "");
      const survey = String(surveySelect?.value || "all").trim();
      const status = normalizeStatusFilterValue(statusSelect?.value || "all");

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
          item.statusText,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(keyword);
      });

      const totalItems = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
      const normalizedPage = Math.min(currentPage, totalPages);
      if (normalizedPage !== currentPage) {
        currentPage = normalizedPage;
        syncFilterUrl();
      }
      root.setAttribute("data-current-page", String(currentPage));

      const startIndex = totalItems ? (currentPage - 1) * ITEMS_PER_PAGE : 0;
      const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      const startLabel = totalItems ? startIndex + 1 : 0;
      const endLabel = totalItems ? startIndex + paginatedItems.length : 0;

      resultNode.textContent = totalItems
        ? `Hiển thị ${startLabel}-${endLabel} trên ${totalItems} yêu cầu. Trang ${currentPage}/${totalPages}.`
        : "Không tìm thấy yêu cầu nào khớp với điều kiện lọc.";

      const activeFilters = [];
      if (keyword) {
        activeFilters.push({
          key: "keyword",
          label: `Từ khóa: ${keywordInput.value.trim()}`,
        });
      }
      if (survey === "co-khao-sat") {
        activeFilters.push({ key: "survey", label: "Khảo sát trước: Có" });
      }
      if (survey === "khong-khao-sat") {
        activeFilters.push({ key: "survey", label: "Khảo sát trước: Không" });
      }
      if (status === "moi") {
        activeFilters.push({ key: "status", label: "Trạng thái: Mới tiếp nhận" });
      }
      if (status === "da-nhan") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đã nhận đơn" });
      }
      if (status === "dang-trien-khai") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đang triển khai" });
      }
      if (status === "da-hoan-thanh") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đã hoàn thành" });
      }
      if (status === "da-huy") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đã hủy" });
      }

      activeFiltersNode.innerHTML = activeFilters.length
        ? activeFilters
            .map(
              (item) =>
                `<button type="button" class="customer-active-filter-text" data-remove-filter="${escapeHtml(
                  item.key,
                )}" aria-label="${escapeHtml(`Bỏ ${item.label}`)}">
                  <span>${escapeHtml(item.label)}</span>
                  <i class="fas fa-xmark" aria-hidden="true"></i>
                </button>`,
            )
            .join("")
        : '<span class="customer-active-filters-note">Đang hiển thị toàn bộ yêu cầu.</span>';

      if (!filtered.length) {
        listNode.innerHTML = `
          <div class="customer-empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Không có yêu cầu phù hợp với bộ lọc hiện tại.</p>
            <button class="customer-btn customer-btn-primary" type="button" id="provider-jobs-empty-reset">Đặt lại bộ lọc</button>
          </div>
        `;
        root
          .querySelector("#provider-jobs-empty-reset")
          ?.addEventListener("click", function () {
            if (keywordInput) keywordInput.value = "";
            if (surveySelect) surveySelect.value = "all";
            if (statusSelect) statusSelect.value = "all";
            currentPage = 1;
            syncFilterUrl();
            renderList();
          });
        paginationWrapNode.hidden = true;
        paginationNode.innerHTML = "";
        paginationSummaryNode.textContent = "";
        return;
      }

      listNode.innerHTML = paginatedItems
        .map(
          (item) => `
            <article class="customer-order-card customer-order-card-history">
              <div class="customer-order-topline">
                <div class="customer-order-heading">
                  <p class="customer-order-recipient">${escapeHtml(item.serviceLabel || "Yêu cầu chuyển dọn")}</p>
                  <div class="customer-order-heading-meta">
                    <p class="customer-order-code">${escapeHtml(item.code || "--")}</p>
                    <span class="customer-status-badge status-${escapeHtml(
                      item.statusClass,
                    )}">${escapeHtml(item.statusText || "Mới tiếp nhận")}</span>
                  </div>
                  <p class="customer-order-dest">${escapeHtml(getRouteSummary(item))}</p>
                </div>
                <div class="customer-order-side">
                  <div class="customer-order-price-block">
                    <span class="customer-order-price-label">Tạm tính</span>
                    <strong class="customer-order-price">${escapeHtml(formatCurrency(item.estimatedAmount))}</strong>
                  </div>
                  <div class="customer-order-actions customer-order-actions-compact">
                    <a class="customer-btn customer-btn-primary" href="${escapeHtml(
                      getOrderDetailUrl(item.id || item.code || ""),
                    )}">Xem chi tiết</a>
                  </div>
                </div>
              </div>
              <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                <span><b>Khách hàng</b><span class="customer-order-meta-value">${escapeHtml(item.contactName || "--")}</span></span>
                <span><b>Số điện thoại</b><span class="customer-order-meta-value">${escapeHtml(item.contactPhone || "--")}</span></span>
                <span><b>Khảo sát</b><span class="customer-order-meta-value">${escapeHtml(item.surveyFirst ? "Có" : "Không")}</span></span>
                <span><b>Lịch</b><span class="customer-order-meta-value">${escapeHtml(item.scheduleLabel || "--")}</span></span>
                <span><b>Tạo lúc</b><span class="customer-order-meta-value">${escapeHtml(formatDateTime(item.createdAt))}</span></span>
              </div>
            </article>
          `,
        )
        .join("");

      if (totalPages <= 1) {
        paginationWrapNode.hidden = true;
        paginationNode.innerHTML = "";
        paginationSummaryNode.textContent = "";
        return;
      }

      paginationWrapNode.hidden = false;
      paginationSummaryNode.textContent = `Trang ${currentPage}/${totalPages} • ${totalItems} yêu cầu`;
      const paginationModel = buildPaginationModel(currentPage, totalPages);
      paginationNode.innerHTML = `
        ${
          currentPage > 1
            ? `<button type="button" class="customer-page-btn" data-page-action="prev">Trước</button>`
            : ""
        }
        ${paginationModel
          .map((entry) =>
            entry === "ellipsis"
              ? '<span class="customer-page-ellipsis" aria-hidden="true">…</span>'
              : `<button type="button" class="customer-page-btn ${
                  entry === currentPage ? "is-active" : ""
                }" data-page="${entry}" ${
                  entry === currentPage ? 'aria-current="page"' : ""
                }>${entry}</button>`,
          )
          .join("")}
        ${
          currentPage < totalPages
            ? `<button type="button" class="customer-page-btn" data-page-action="next">Sau</button>`
            : ""
        }
      `;
    }

    filterForm?.addEventListener("submit", function (event) {
      event.preventDefault();
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    resetButton?.addEventListener("click", function () {
      if (keywordInput) keywordInput.value = "";
      if (surveySelect) surveySelect.value = "all";
      if (statusSelect) statusSelect.value = "all";
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    activeFiltersNode?.addEventListener("click", function (event) {
      const button = event.target.closest("[data-remove-filter]");
      if (!button) return;

      const filterKey = String(
        button.getAttribute("data-remove-filter") || "",
      ).trim();

      if (filterKey === "keyword" && keywordInput) {
        keywordInput.value = "";
      }

      if (filterKey === "survey" && surveySelect) {
        surveySelect.value = "all";
      }

      if (filterKey === "status" && statusSelect) {
        statusSelect.value = "all";
      }

      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    paginationNode?.addEventListener("click", function (event) {
      const button = event.target.closest("[data-page], [data-page-action]");
      if (!button) return;

      const action = String(button.getAttribute("data-page-action") || "").trim();
      if (action === "prev") {
        currentPage = Math.max(1, currentPage - 1);
      } else if (action === "next") {
        currentPage += 1;
      } else {
        currentPage = normalizePageNumber(button.getAttribute("data-page"), 1);
      }

      syncFilterUrl();
      renderList();
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    renderList();
  }

  function isEditingProviderFilters() {
    const activeElement = document.activeElement;
    return (
      !!activeElement &&
      root.contains(activeElement) &&
      ["INPUT", "SELECT", "TEXTAREA"].includes(activeElement.tagName)
    );
  }

  (async function bootstrapJobs() {
    const auth = core.getOrderDetailAccessCredentials?.() || core.getUrlAuthCredentials?.() || {
      username: "",
      password: "",
    };
    await store.autoAuthFromUrlCredentials?.(auth);

    let profile = null;
    try {
      profile = await store.fetchProfile?.();
    } catch (error) {
      console.error("Cannot verify provider profile for jobs:", error);
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

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
          <div class="customer-empty-state">
            <i class="fas fa-spinner fa-spin"></i>
          <p>Đang tải danh sách đơn hàng nhà cung cấp...</p>
        </div>
      </div>
    `;

    try {
      const items = await fetchBookings();
      renderJobs({ items, profile });
      refreshController = createProviderAutoRefreshController(window, {
        intervalMs: 60 * 1000,
        shouldPause: isEditingProviderFilters,
        onTick: async () => {
          persistCurrentFiltersToUrl();
          const nextItems = await fetchBookings();
          renderJobs({ items: nextItems, profile });
        },
      });
      refreshController.start();
    } catch (error) {
      console.error("Cannot render provider jobs:", error);
      root.innerHTML = `
        <div class="customer-portal-shell customer-portal-shell--simple">
          <div class="customer-empty-state">
            <i class="fas fa-circle-exclamation"></i>
            <p>Không thể tải danh sách đơn hàng ở thời điểm hiện tại.</p>
          </div>
        </div>
      `;
    }
  })();
  window.addEventListener("beforeunload", function () {
    refreshController?.stop?.();
  });

  const moduleApi = {};
  window.__fastGoProviderJobsModule = moduleApi;
  return moduleApi;
})(window, document);

export default providerJobsModule;
