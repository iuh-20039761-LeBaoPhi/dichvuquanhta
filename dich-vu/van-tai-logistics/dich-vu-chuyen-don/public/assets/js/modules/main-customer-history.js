import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const customerHistoryModule = (function (window, document) {
  if (window.__fastGoCustomerHistoryLoaded) return window.__fastGoCustomerHistoryModule || null;
  window.__fastGoCustomerHistoryLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-history") {
    return;
  }

  const root = document.getElementById("customer-history-root");
  if (!root || !store) return;
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

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function" ? core.toProjectUrl(path) : path;
  }

  function getOrderDetailUrl(orderIdentifier) {
    return typeof core.buildOrderDetailUrl === "function"
      ? core.buildOrderDetailUrl("khach-hang/chi-tiet-hoa-don-chuyendon.html", orderIdentifier)
      : getProjectUrl(
          `khach-hang/chi-tiet-hoa-don-chuyendon.html?madonhang=${encodeURIComponent(
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

  function getStatusMeta(item) {
    return store.getBookingDisplayStatus?.(item) || {
      status_class: item?.status_class || "moi",
      status_text: item?.status_text || "Mới tiếp nhận",
      badge_class: "pending",
    };
  }

  function normalizeStatusFilterValue(value) {
    const normalized = String(value || "").trim();
    if (normalized === "xac-nhan") return "da-hoan-thanh";
    if (normalized === "dang-xu-ly") return "da-nhan";
    return normalized || "all";
  }

  function getRouteSummary(item) {
    const fromAddress = String(item?.from_address || "").trim();
    const toAddress = String(item?.to_address || "").trim();
    if (fromAddress || toAddress) {
      return `${fromAddress || "--"} → ${toAddress || "--"}`;
    }
    return String(item?.summary || item?.meta || "Chưa có mô tả chi tiết.").trim();
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
    const date = new Date(item?.created_at || "");
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

  function renderHistory(data) {
    if (!data?.profile) {
      store.clearAuthSession?.();
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const items = Array.isArray(data?.history) ? data.history : [];
    const params = new URLSearchParams(window.location.search);
    const initialKeyword = String(params.get("search") || "").trim();
    const initialStatus = normalizeStatusFilterValue(params.get("status") || "all");
    const initialFromDate = String(params.get("fromDate") || "").trim();
    const initialToDate = String(params.get("toDate") || "").trim();
    let currentTab = "all";
    let currentPage = normalizePageNumber(params.get("page"), 1);

    function deriveTabKey(item) {
      const statusValue = normalizeStatusFilterValue(
        getStatusMeta(item)?.status_class || "all",
      );
      if (statusValue === "moi") return "pending";
      if (statusValue === "da-nhan") return "accepted";
      if (statusValue === "dang-trien-khai") return "shipping";
      if (statusValue === "da-hoan-thanh") return "done";
      if (statusValue === "da-huy") return "cancel";
      return "all";
    }

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
                  <i class="fas fa-truck-moving fa-lg"></i>
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
                <h5 class="fw-bold mb-1">Đơn hàng của tôi</h5>
                <p class="text-muted small mb-0">Theo dõi toàn bộ lịch sử chuyển dọn</p>
              </div>
              <div class="d-flex flex-column flex-sm-row gap-2">
                <div class="input-group mv-orders-search">
                  <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted small"></i></span>
                  <input type="text" class="form-control bg-light border-0 small mv-orders-search-input" id="orderSearchInput" value="${escapeHtml(initialKeyword)}" placeholder="Mã đơn, dịch vụ, địa chỉ..." />
                </div>
              </div>
            </div>

            <div class="mv-orders-inline-filters">
              <label class="mv-orders-inline-filter" for="customer-history-from-date">
                <span>Từ ngày</span>
                <input type="date" id="customer-history-from-date" value="${escapeHtml(initialFromDate)}" />
              </label>
              <label class="mv-orders-inline-filter" for="customer-history-to-date">
                <span>Đến ngày</span>
                <input type="date" id="customer-history-to-date" value="${escapeHtml(initialToDate)}" />
              </label>
              <button class="btn btn-light mv-orders-secondary-btn" type="button" id="customer-history-reset">Đặt lại</button>
            </div>

            <div class="mv-orders-tabs-wrap">
              <ul class="nav nav-pills nav-fill bg-light p-1 flex-column flex-md-row gap-1 w-100 mv-orders-tabs">
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "all" ? "active" : ""}" href="#" id="tabAll" data-tab="all">Tất cả <span class="badge bg-secondary ms-1" id="countAll">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "pending" ? "active" : ""}" href="#" id="tabPending" data-tab="pending">Mới tiếp nhận <span class="badge bg-warning text-dark ms-1" id="countPending">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "accepted" ? "active" : ""}" href="#" id="tabAccepted" data-tab="accepted">Đã nhận đơn <span class="badge bg-info ms-1" id="countAccepted">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "shipping" ? "active" : ""}" href="#" id="tabShipping" data-tab="shipping">Đang triển khai <span class="badge bg-primary ms-1" id="countShipping">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "done" ? "active" : ""}" href="#" id="tabDone" data-tab="done">Hoàn thành <span class="badge bg-success ms-1" id="countDone">0</span></a></li>
                <li class="nav-item"><a class="nav-link fw-bold ${currentTab === "cancel" ? "active" : ""}" href="#" id="tabCancel" data-tab="cancel">Đã hủy <span class="badge bg-danger ms-1" id="countCancel">0</span></a></li>
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
                    <th class="mv-orders-col-time">Lịch thực hiện</th>
                    <th class="mv-orders-col-fee">Tạm tính</th>
                    <th class="mv-orders-col-status">Trạng thái</th>
                    <th class="pe-4 text-end mv-orders-col-actions">Hành động</th>
                  </tr>
                </thead>
                <tbody id="customer-history-table-body"></tbody>
              </table>
            </div>

            <div id="customer-history-mobile-list" class="d-block d-md-none p-2 mv-orders-mobile-list"></div>

            <div id="customer-history-empty" class="text-center py-5 d-none mv-orders-empty">
              <i class="fas fa-box-open fa-4x text-light mb-4 d-block"></i>
              <h6 class="fw-bold">Chưa có đơn hàng nào!</h6>
              <p class="text-muted small">Bạn chưa tạo đơn chuyển dọn nào trên hệ thống.</p>
              <a href="${escapeHtml(getProjectUrl("dat-lich-chuyendon.html"))}" class="btn btn-primary rounded-pill px-4 mt-2 fw-bold shadow-sm">Đặt đơn ngay</a>
            </div>

            <div class="mv-orders-pagination" id="customer-history-pagination-wrap" hidden>
              <p class="mv-orders-pagination-summary" id="customer-history-pagination-summary"></p>
              <div class="mv-orders-pagination-controls" id="customer-history-pagination"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const keywordInput = root.querySelector("#orderSearchInput");
    const tableBodyNode = root.querySelector("#customer-history-table-body");
    const mobileListNode = root.querySelector("#customer-history-mobile-list");
    const emptyNode = root.querySelector("#customer-history-empty");
    const paginationWrapNode = root.querySelector("#customer-history-pagination-wrap");
    const paginationSummaryNode = root.querySelector("#customer-history-pagination-summary");
    const paginationNode = root.querySelector("#customer-history-pagination");
    const fromDateInput = root.querySelector("#customer-history-from-date");
    const toDateInput = root.querySelector("#customer-history-to-date");
    const resetButton = root.querySelector("#customer-history-reset");

    function syncFilterUrl() {
      const url = new URL(window.location.href);
      const nextKeyword = String(keywordInput?.value || "").trim();
      const nextFromDate = String(fromDateInput?.value || "").trim();
      const nextToDate = String(toDateInput?.value || "").trim();
      let nextStatus = "all";

      if (currentTab === "pending") nextStatus = "moi";
      if (currentTab === "accepted") nextStatus = "da-nhan";
      if (currentTab === "shipping") nextStatus = "dang-trien-khai";
      if (currentTab === "done") nextStatus = "da-hoan-thanh";
      if (currentTab === "cancel") nextStatus = "da-huy";

      if (nextKeyword) {
        url.searchParams.set("search", nextKeyword);
      } else {
        url.searchParams.delete("search");
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
      const keyword = String(keywordInput?.value || "").trim().toLowerCase();
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
        if (currentTab !== "all" && deriveTabKey(item) !== currentTab) return false;

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

      root.querySelectorAll(".mv-orders-tabs .nav-link").forEach((link) => {
        link.classList.toggle(
          "active",
          String(link.getAttribute("data-tab") || "") === currentTab,
        );
      });

      if (!filtered.length) {
        tableBodyNode.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Không có đơn phù hợp.</td></tr>`;
        mobileListNode.innerHTML = `<div class="text-center text-muted p-4 small">Không có đơn phù hợp.</div>`;
        emptyNode.classList.remove("d-none");
        paginationWrapNode.hidden = true;
        paginationNode.innerHTML = "";
        paginationSummaryNode.textContent = "";
        return;
      }
      emptyNode.classList.add("d-none");

      tableBodyNode.innerHTML = paginatedItems
        .map(
          (item) => {
            const statusMeta = getStatusMeta(item);
            return `
            <tr>
              <td class="ps-4">
                <div class="fw-bold text-dark small">${escapeHtml(item.code || "--")}</div>
                <div class="small text-muted">${escapeHtml(item.service_label || item.title || "--")}</div>
              </td>
              <td>
                <div class="small text-truncate mv-orders-address-line" title="${escapeHtml(item.from_address || "--")}">${escapeHtml(item.from_address || "--")}</div>
                <div class="small text-muted text-truncate mv-orders-address-destination" title="${escapeHtml(item.to_address || "--")}"><i class="fas fa-arrow-down fa-xs me-1"></i>${escapeHtml(item.to_address || "--")}</div>
              </td>
              <td><div class="small text-dark">${escapeHtml(item.schedule_label || "--")}</div></td>
              <td class="fw-bold text-primary">${escapeHtml(formatCurrency(item.estimated_amount))}</td>
              <td><span class="badge bg-opacity-10 px-3 py-2 rounded-pill status-${escapeHtml(statusMeta.badge_class)}">${escapeHtml(statusMeta.status_text)}</span></td>
              <td class="pe-4 text-end">
                <a class="btn btn-sm btn-light border rounded-2 shadow-sm" href="${escapeHtml(getOrderDetailUrl(item.remote_id || item.code || ""))}">Chi tiết</a>
              </td>
            </tr>
          `;
          },
        )
        .join("");

      mobileListNode.innerHTML = paginatedItems
        .map((item) => {
          const statusMeta = getStatusMeta(item);
          return `
            <div class="card mv-orders-mobile-card mb-2">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="fw-bold small text-dark">${escapeHtml(item.code || "--")}</div>
                    <div class="small text-muted">${escapeHtml(item.service_label || item.title || "--")}</div>
                  </div>
                  <span class="badge bg-opacity-10 px-2 py-1 rounded-pill mv-orders-mobile-badge status-${escapeHtml(statusMeta.badge_class)}">${escapeHtml(statusMeta.status_text)}</span>
                </div>
                <div class="small mb-2 pt-2 border-top">
                  <div class="d-flex justify-content-between gap-2 mb-1"><span class="text-muted">Lộ trình</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(getRouteSummary(item))}</strong></div>
                  <div class="d-flex justify-content-between gap-2 mb-1"><span class="text-muted">Lịch</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(item.schedule_label || "--")}</strong></div>
                  <div class="d-flex justify-content-between gap-2 mb-1"><span class="text-muted">Khảo sát</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(item.survey_first ? "Có" : "Không")}</strong></div>
                  <div class="d-flex justify-content-between gap-2 text-primary"><span>Tạm tính</span><strong class="text-end mv-orders-mobile-value">${escapeHtml(formatCurrency(item.estimated_amount))}</strong></div>
                </div>
                <a class="btn btn-sm btn-light border w-100 fw-bold" href="${escapeHtml(getOrderDetailUrl(item.remote_id || item.code || ""))}"><i class="fas fa-eye me-2 text-primary"></i>Xem chi tiết</a>
              </div>
            </div>
          `;
        })
        .join("");

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

    [fromDateInput, toDateInput].forEach((input) => {
      input?.addEventListener("change", function () {
        currentPage = 1;
        syncFilterUrl();
        renderList();
      });
    });

    root.querySelector(".mv-orders-tabs")?.addEventListener("click", function (event) {
      const tab = event.target.closest("[data-tab]");
      if (!tab) return;
      event.preventDefault();
      currentTab = String(tab.getAttribute("data-tab") || "all").trim() || "all";
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    resetButton?.addEventListener("click", function () {
      if (keywordInput) keywordInput.value = "";
      if (fromDateInput) fromDateInput.value = "";
      if (toDateInput) toDateInput.value = "";
      currentTab = "all";
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

  (async function bootstrapHistory() {
    try {
      const result = await store.fetchHistory?.();
      renderHistory(result || null);
    } catch (error) {
      console.error("Cannot load customer history store:", error);
      renderHistory(null);
    }
  })();
  const moduleApi = {};
  window.__fastGoCustomerHistoryModule = moduleApi;
  return moduleApi;
})(window, document);

export default customerHistoryModule;
