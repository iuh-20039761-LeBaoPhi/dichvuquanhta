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

  function parseDateFilterMs(value, mode = "start") {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const suffix = mode === "end" ? "T23:59:59" : "T00:00:00";
    const date = new Date(`${raw}${suffix}`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  function getItemCreatedMs(item) {
    const date = new Date(item?.createdAt || "");
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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
    const fromDateInput = root.querySelector("#provider-job-from-date");
    const toDateInput = root.querySelector("#provider-job-to-date");
    if (!keywordInput && !surveySelect && !statusSelect && !fromDateInput && !toDateInput) return;

    const url = new URL(window.location.href);
    const nextKeyword = String(keywordInput?.value || "").trim();
    const nextSurvey = String(surveySelect?.value || "all").trim();
    const nextStatus = String(statusSelect?.value || "all").trim();
    const nextFromDate = String(fromDateInput?.value || "").trim();
    const nextToDate = String(toDateInput?.value || "").trim();

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

    if (nextFromDate) {
      url.searchParams.set("fromDate", nextFromDate);
    } else {
      url.searchParams.delete("fromDate");
    }

    if (nextToDate) {
      url.searchParams.set("toDate", nextToDate);
    } else {
      url.searchParams.delete("toDate");
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
              store.isRowAssignedToProvider?.(row, providerActor) &&
              !store.isRowOwnedByProviderActor?.(row, providerActor),
          ),
        );
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

  function deriveTabKey(item) {
    const statusValue = normalizeStatusFilterValue(item?.statusValue || "all");
    if (statusValue === "moi") return "pending";
    if (statusValue === "da-nhan") return "accepted";
    if (statusValue === "dang-trien-khai") return "shipping";
    if (statusValue === "da-hoan-thanh") return "done";
    if (statusValue === "da-huy") return "cancel";
    return "all";
  }

  function renderJobs(data) {
    const role = store.getSavedRole();
    const canUseProviderPortal =
      store.hasProviderCapability?.(store.readIdentity?.()) || false;
    if (!canUseProviderPortal) {
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
    const initialFromDate = String(params.get("fromDate") || "").trim();
    const initialToDate = String(params.get("toDate") || "").trim();
    let currentPage = normalizePageNumber(params.get("page"), 1);
    let currentTab = "all";

    if (initialStatus === "moi") currentTab = "pending";
    if (initialStatus === "da-nhan") currentTab = "accepted";
    if (initialStatus === "dang-trien-khai") currentTab = "shipping";
    if (initialStatus === "da-hoan-thanh") currentTab = "done";
    if (initialStatus === "da-huy") currentTab = "cancel";

    root.innerHTML = `
      <div class="mv-orders-shell">
        <div class="mb-4 mv-orders-stats mv-orders-stats--6">
          <div class="mv-orders-stat-cell">
            <div class="card border-0 shadow-sm p-3 p-md-4 h-100 mv-orders-stat-card">
              <div class="d-flex align-items-center gap-3">
                <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary mv-orders-stat-icon">
                  <i class="fas fa-file-invoice fa-lg"></i>
                </div>
                <div class="overflow-hidden">
                  <div class="h4 fw-bold mb-0" id="stat-total">0</div>
                  <div class="text-muted small fw-semibold text-nowrap">
                    <span class="mv-orders-stat-label-full">Tổng đơn</span>
                    <span class="mv-orders-stat-label-short">Tổng</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mv-orders-stat-cell">
            <div class="card border-0 shadow-sm p-3 p-md-4 h-100 mv-orders-stat-card">
              <div class="d-flex align-items-center gap-3">
                <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning mv-orders-stat-icon">
                  <i class="fas fa-spinner fa-lg"></i>
                </div>
                <div class="overflow-hidden">
                  <div class="h4 fw-bold mb-0" id="stat-pending">0</div>
                  <div class="text-muted small fw-semibold text-nowrap">
                    <span class="mv-orders-stat-label-full">Mới tiếp nhận</span>
                    <span class="mv-orders-stat-label-short">Mới</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mv-orders-stat-cell">
            <div class="card border-0 shadow-sm p-3 p-md-4 h-100 mv-orders-stat-card">
              <div class="d-flex align-items-center gap-3">
                <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info mv-orders-stat-icon">
                  <i class="fas fa-handshake fa-lg"></i>
                </div>
                <div class="overflow-hidden">
                  <div class="h4 fw-bold mb-0" id="stat-accepted">0</div>
                  <div class="text-muted small fw-semibold text-nowrap">
                    <span class="mv-orders-stat-label-full">Đã nhận đơn</span>
                    <span class="mv-orders-stat-label-short">Nhận</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mv-orders-stat-cell">
            <div class="card border-0 shadow-sm p-3 p-md-4 h-100 mv-orders-stat-card">
              <div class="d-flex align-items-center gap-3">
                <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary mv-orders-stat-icon">
                  <i class="fas fa-truck-loading fa-lg"></i>
                </div>
                <div class="overflow-hidden">
                  <div class="h4 fw-bold mb-0" id="stat-shipping">0</div>
                  <div class="text-muted small fw-semibold text-nowrap">
                    <span class="mv-orders-stat-label-full">Đang triển khai</span>
                    <span class="mv-orders-stat-label-short">Triển</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mv-orders-stat-cell">
            <div class="card border-0 shadow-sm p-3 p-md-4 h-100 mv-orders-stat-card">
              <div class="d-flex align-items-center gap-3">
                <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success mv-orders-stat-icon">
                  <i class="fas fa-check-double fa-lg"></i>
                </div>
                <div class="overflow-hidden">
                  <div class="h4 fw-bold mb-0" id="stat-success">0</div>
                  <div class="text-muted small fw-semibold text-nowrap">
                    <span class="mv-orders-stat-label-full">Hoàn thành</span>
                    <span class="mv-orders-stat-label-short">Xong</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mv-orders-stat-cell">
            <div class="card border-0 shadow-sm p-3 p-md-4 h-100 mv-orders-stat-card">
              <div class="d-flex align-items-center gap-3">
                <div class="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger mv-orders-stat-icon">
                  <i class="fas fa-ban fa-lg"></i>
                </div>
                <div class="overflow-hidden">
                  <div class="h4 fw-bold mb-0" id="stat-fail">0</div>
                  <div class="text-muted small fw-semibold text-nowrap">
                    <span class="mv-orders-stat-label-full">Đã hủy</span>
                    <span class="mv-orders-stat-label-short">Hủy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm mv-orders-main-card">
          <div class="card-header bg-white py-3 border-0">
            <div class="mv-orders-toolbar">
              <div>
                <h5 class="fw-bold mb-1">Đơn hàng của khách</h5>
                <p class="text-muted small mb-0">Theo dõi và xử lý các đơn chuyển dọn đã giao cho bạn</p>
              </div>
              <div class="d-flex flex-column flex-sm-row gap-2">
                <div class="input-group mv-orders-search">
                  <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted small"></i></span>
                  <input type="text" class="form-control bg-light border-0 small mv-orders-search-input" id="provider-job-keyword" value="${escapeHtml(
                    initialKeyword,
                  )}" placeholder="Mã đơn, dịch vụ, khách, địa chỉ..." />
                </div>
              </div>
            </div>

            <div class="mv-orders-inline-filters">
              <label class="mv-orders-inline-filter" for="provider-job-from-date">
                <span>Từ ngày</span>
                <input type="date" id="provider-job-from-date" value="${escapeHtml(initialFromDate)}" />
              </label>
              <label class="mv-orders-inline-filter" for="provider-job-to-date">
                <span>Đến ngày</span>
                <input type="date" id="provider-job-to-date" value="${escapeHtml(initialToDate)}" />
              </label>
              <label class="mv-orders-inline-filter" for="provider-job-survey-filter">
                <span>Khảo sát trước</span>
                <select id="provider-job-survey-filter">
                  <option value="all" ${initialSurvey === "all" ? "selected" : ""}>Tất cả</option>
                  <option value="co-khao-sat" ${initialSurvey === "co-khao-sat" ? "selected" : ""}>Có</option>
                  <option value="khong-khao-sat" ${initialSurvey === "khong-khao-sat" ? "selected" : ""}>Không</option>
                </select>
              </label>
              <button class="btn btn-light mv-orders-secondary-btn" type="button" id="provider-jobs-reset">Đặt lại</button>
            </div>

            <div class="mv-orders-tabs-wrap">
              <ul class="nav nav-pills nav-fill bg-light p-1 flex-column flex-md-row gap-1 w-100 mv-orders-tabs">
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "all" ? "active" : ""}" href="#" data-tab="all">Tất cả <span class="badge bg-secondary ms-1" id="countAll">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "pending" ? "active" : ""}" href="#" data-tab="pending">Mới tiếp nhận <span class="badge bg-warning text-dark ms-1" id="countPending">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "accepted" ? "active" : ""}" href="#" data-tab="accepted">Đã nhận đơn <span class="badge bg-info ms-1" id="countAccepted">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "shipping" ? "active" : ""}" href="#" data-tab="shipping">Đang triển khai <span class="badge bg-primary ms-1" id="countShipping">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "done" ? "active" : ""}" href="#" data-tab="done">Hoàn thành <span class="badge bg-success ms-1" id="countDone">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "cancel" ? "active" : ""}" href="#" data-tab="cancel">Đã hủy <span class="badge bg-danger ms-1" id="countCancel">0</span></a></li>
              </ul>
            </div>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive d-none d-md-block mv-orders-table-wrap">
              <table class="table align-middle mb-0 mv-orders-table">
                <thead class="bg-light text-muted small text-uppercase">
                  <tr>
                    <th class="ps-4 mv-orders-col-code">Mã đơn / Dịch vụ</th>
                    <th class="mv-orders-col-route">Địa chỉ đi → đến</th>
                    <th class="mv-orders-col-customer">Lịch / Khách hàng</th>
                    <th class="mv-orders-col-fee">Tạm tính</th>
                    <th class="mv-orders-col-status">Trạng thái</th>
                    <th class="pe-4 text-end mv-orders-col-actions">Hành động</th>
                  </tr>
                </thead>
                <tbody id="provider-job-table-body"></tbody>
              </table>
            </div>

            <div id="provider-job-mobile-list" class="d-block d-md-none p-2 mv-orders-mobile-list"></div>

            <div id="provider-jobs-empty" class="text-center py-5 d-none mv-orders-empty">
              <i class="fas fa-folder-open fa-4x text-light mb-4 d-block"></i>
              <h6 class="fw-bold">Không có đơn hàng phù hợp</h6>
              <p class="text-muted small mb-3">Thử đổi từ khóa, tab trạng thái hoặc bộ lọc khảo sát trước.</p>
              <button class="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" type="button" id="provider-jobs-empty-reset">Đặt lại bộ lọc</button>
            </div>

            <div class="mv-orders-pagination" id="provider-jobs-pagination-wrap" hidden>
              <p class="mv-orders-pagination-summary" id="provider-jobs-pagination-summary"></p>
              <div class="mv-orders-pagination-controls" id="provider-jobs-pagination"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const keywordInput = root.querySelector("#provider-job-keyword");
    const surveySelect = root.querySelector("#provider-job-survey-filter");
    const fromDateInput = root.querySelector("#provider-job-from-date");
    const toDateInput = root.querySelector("#provider-job-to-date");
    const resetButton = root.querySelector("#provider-jobs-reset");
    const tableBodyNode = root.querySelector("#provider-job-table-body");
    const mobileListNode = root.querySelector("#provider-job-mobile-list");
    const emptyNode = root.querySelector("#provider-jobs-empty");
    const paginationWrapNode = root.querySelector("#provider-jobs-pagination-wrap");
    const paginationSummaryNode = root.querySelector("#provider-jobs-pagination-summary");
    const paginationNode = root.querySelector("#provider-jobs-pagination");

    function syncFilterUrl() {
      const url = new URL(window.location.href);
      const nextKeyword = String(keywordInput?.value || "").trim();
      const nextSurvey = String(surveySelect?.value || "all").trim();
      const nextFromDate = String(fromDateInput?.value || "").trim();
      const nextToDate = String(toDateInput?.value || "").trim();

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

      if (nextFromDate) {
        url.searchParams.set("fromDate", nextFromDate);
      } else {
        url.searchParams.delete("fromDate");
      }

      if (nextToDate) {
        url.searchParams.set("toDate", nextToDate);
      } else {
        url.searchParams.delete("toDate");
      }

      if (currentTab === "pending") {
        url.searchParams.set("status", "moi");
      } else if (currentTab === "accepted") {
        url.searchParams.set("status", "da-nhan");
      } else if (currentTab === "shipping") {
        url.searchParams.set("status", "dang-trien-khai");
      } else if (currentTab === "done") {
        url.searchParams.set("status", "da-hoan-thanh");
      } else if (currentTab === "cancel") {
        url.searchParams.set("status", "da-huy");
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
      const fromTime = parseDateFilterMs(fromDateInput?.value || "", "start");
      const toTime = parseDateFilterMs(toDateInput?.value || "", "end");

      const itemsByDate = items.filter((item) => {
        if (fromTime == null && toTime == null) return true;
        const createdMs = getItemCreatedMs(item);
        if (!createdMs) return false;
        if (fromTime != null && createdMs < fromTime) return false;
        if (toTime != null && createdMs > toTime) return false;
        return true;
      });

      const filtered = itemsByDate.filter((item) => {
        if (survey === "co-khao-sat" && !item.surveyFirst) return false;
        if (survey === "khong-khao-sat" && item.surveyFirst) return false;
        if (currentTab !== "all" && deriveTabKey(item) !== currentTab) return false;

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

      root.querySelector("#stat-total").textContent = String(itemsByDate.length);
      root.querySelector("#stat-pending").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "pending").length,
      );
      root.querySelector("#stat-accepted").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "accepted").length,
      );
      root.querySelector("#stat-shipping").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "shipping").length,
      );
      root.querySelector("#stat-success").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "done").length,
      );
      root.querySelector("#stat-fail").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "cancel").length,
      );
      root.querySelector("#countAll").textContent = String(itemsByDate.length);
      root.querySelector("#countPending").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "pending").length,
      );
      root.querySelector("#countAccepted").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "accepted").length,
      );
      root.querySelector("#countShipping").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "shipping").length,
      );
      root.querySelector("#countDone").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "done").length,
      );
      root.querySelector("#countCancel").textContent = String(
        itemsByDate.filter((item) => deriveTabKey(item) === "cancel").length,
      );
      root.querySelectorAll(".mv-orders-tabs .nav-link").forEach((tabNode) => {
        tabNode.classList.toggle(
          "active",
          String(tabNode.getAttribute("data-tab") || "") === currentTab,
        );
      });

      if (!filtered.length) {
        if (tableBodyNode) {
          tableBodyNode.innerHTML = `
            <tr>
              <td colspan="6" class="text-center py-5 text-muted">Không có đơn hàng phù hợp với bộ lọc hiện tại.</td>
            </tr>
          `;
        }
        if (mobileListNode) {
          mobileListNode.innerHTML = `
            <div class="text-center py-4 text-muted small">Không có đơn hàng phù hợp với bộ lọc hiện tại.</div>
          `;
        }
        emptyNode?.classList.remove("d-none");
        paginationWrapNode.hidden = true;
        paginationNode.innerHTML = "";
        paginationSummaryNode.textContent = "";
        return;
      }

      emptyNode?.classList.add("d-none");

      if (tableBodyNode) {
        tableBodyNode.innerHTML = paginatedItems
          .map(
            (item) => `
              <tr>
                <td class="ps-4">
                  <div class="fw-bold">${escapeHtml(item.code || "--")}</div>
                  <div class="small text-muted mt-1">${escapeHtml(item.serviceLabel || "Yêu cầu chuyển dọn")}</div>
                </td>
                <td>
                  <div class="small">${escapeHtml(getRouteSummary(item))}</div>
                </td>
                <td>
                  <div class="small fw-semibold">${escapeHtml(item.scheduleLabel || "--")}</div>
                  <div class="small text-muted mt-1">${escapeHtml(item.contactName || "--")}</div>
                  <div class="small text-muted">${escapeHtml(item.contactPhone || "--")}</div>
                  <div class="small text-muted">${escapeHtml(item.surveyFirst ? "Khảo sát trước: Có" : "Khảo sát trước: Không")}</div>
                </td>
                <td class="fw-bold text-primary">${escapeHtml(formatCurrency(item.estimatedAmount))}</td>
                <td><span class="badge bg-opacity-10 px-3 py-2 rounded-pill status-${escapeHtml(item.statusClass)}">${escapeHtml(item.statusText || "Mới tiếp nhận")}</span></td>
                <td class="pe-4 text-end">
                  <a class="btn btn-sm btn-light border rounded-2 shadow-sm" href="${escapeHtml(
                    getOrderDetailUrl(item.id || item.code || ""),
                  )}">Chi tiết</a>
                </td>
              </tr>
            `,
          )
          .join("");
      }

      if (mobileListNode) {
        mobileListNode.innerHTML = paginatedItems
          .map(
            (item) => `
              <div class="card border-0 shadow-sm mb-3 mv-orders-mobile-card">
                <div class="card-body">
                  <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
                    <div>
                      <div class="fw-bold">${escapeHtml(item.code || "--")}</div>
                      <div class="small text-muted mt-1">${escapeHtml(item.serviceLabel || "Yêu cầu chuyển dọn")}</div>
                    </div>
                    <span class="badge bg-opacity-10 px-2 py-1 rounded-pill mv-orders-mobile-badge status-${escapeHtml(item.statusClass)}">${escapeHtml(item.statusText || "Mới tiếp nhận")}</span>
                  </div>
                  <div class="small text-muted mb-2">${escapeHtml(getRouteSummary(item))}</div>
                  <div class="d-grid gap-2 small">
                    <div class="d-flex justify-content-between gap-2"><span class="text-muted">Lịch</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(item.scheduleLabel || "--")}</strong></div>
                    <div class="d-flex justify-content-between gap-2"><span class="text-muted">Khách hàng</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(item.contactName || "--")}</strong></div>
                    <div class="d-flex justify-content-between gap-2"><span class="text-muted">Số điện thoại</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(item.contactPhone || "--")}</strong></div>
                    <div class="d-flex justify-content-between gap-2"><span class="text-muted">Khảo sát</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(item.surveyFirst ? "Có" : "Không")}</strong></div>
                    <div class="d-flex justify-content-between gap-2 text-primary"><span>Tạm tính</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(formatCurrency(item.estimatedAmount))}</strong></div>
                  </div>
                  <a class="btn btn-sm btn-light border w-100 fw-bold mt-3" href="${escapeHtml(
                    getOrderDetailUrl(item.id || item.code || ""),
                  )}"><i class="fas fa-eye me-2 text-primary"></i>Xem chi tiết</a>
                </div>
              </div>
            `,
          )
          .join("");
      }

      if (totalPages <= 1) {
        paginationWrapNode.hidden = true;
        paginationNode.innerHTML = "";
        paginationSummaryNode.textContent = "";
        return;
      }

      paginationWrapNode.hidden = false;
      paginationSummaryNode.textContent = `Trang ${currentPage}/${totalPages} • ${totalItems} đơn hàng`;
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

    keywordInput?.addEventListener("input", function () {
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    surveySelect?.addEventListener("change", function () {
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    [fromDateInput, toDateInput].forEach((input) => {
      input?.addEventListener("change", function () {
        currentPage = 1;
        syncFilterUrl();
        renderList();
      });
    });

    resetButton?.addEventListener("click", function () {
      if (keywordInput) keywordInput.value = "";
      if (fromDateInput) fromDateInput.value = "";
      if (toDateInput) toDateInput.value = "";
      if (surveySelect) surveySelect.value = "all";
      currentTab = "all";
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    root.querySelector("#provider-jobs-empty-reset")?.addEventListener("click", function () {
      if (keywordInput) keywordInput.value = "";
      if (fromDateInput) fromDateInput.value = "";
      if (toDateInput) toDateInput.value = "";
      if (surveySelect) surveySelect.value = "all";
      currentTab = "all";
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    root.querySelector(".mv-orders-tabs")?.addEventListener("click", function (event) {
      const tabLink = event.target.closest("[data-tab]");
      if (!tabLink) return;
      event.preventDefault();
      const nextTab = String(tabLink.getAttribute("data-tab") || "").trim() || "all";
      if (nextTab === currentTab) return;
      currentTab = nextTab;
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

    root.querySelector(".mv-orders-inline-filters")?.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      if (event.target !== keywordInput) return;
      event.preventDefault();
      currentPage = 1;
      syncFilterUrl();
      renderList();
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

    const canUseProviderPortal =
      store.hasProviderCapability?.(profile || store.readIdentity?.()) || false;
    if (!canUseProviderPortal) {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
          <div class="customer-empty-state">
            <i class="fas fa-spinner fa-spin"></i>
          <p>Đang tải danh sách đơn khách hàng đặt cho tôi...</p>
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
