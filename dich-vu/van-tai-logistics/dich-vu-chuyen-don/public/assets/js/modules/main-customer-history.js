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

    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const items = Array.isArray(data?.history) ? data.history : [];
    const params = new URLSearchParams(window.location.search);
    const initialKeyword = String(params.get("search") || "").trim();
    const initialStatus = normalizeStatusFilterValue(params.get("status") || "all");
    let currentPage = normalizePageNumber(params.get("page"), 1);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-panel customer-orders-panel">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Danh sách đơn hàng</p>
              <h2>Tìm và lọc đơn</h2>
              <p class="customer-panel-subtext">${escapeHtml(String(items.length))} đơn trong tài khoản hiện tại</p>
            </div>
          </div>

          <form class="customer-filter-form customer-filter-form-compact customer-filter-form-orders" id="customer-history-filter-form">
            <label class="customer-filter-field-search">
              <span>Tìm nhanh</span>
              <input id="bo-loc-tu-khoa-lich-su" type="search" value="${escapeHtml(initialKeyword)}" placeholder="Mã đơn, dịch vụ, địa chỉ..." />
            </label>
            <label class="customer-filter-field-status">
              <span>Trạng thái</span>
              <select id="bo-loc-trang-thai-lich-su">
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
              <button class="customer-btn customer-btn-ghost customer-btn-sm" type="button" id="customer-history-reset">Đặt lại</button>
            </div>
          </form>

          <div class="customer-active-filters" id="customer-history-active-filters">
            <span class="customer-active-filters-note">Đang hiển thị toàn bộ đơn hàng.</span>
          </div>

          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Danh sách</p>
              <h2>Đơn đang hiển thị</h2>
              <p class="customer-panel-subtext" id="customer-history-result-text">Đang tải dữ liệu đơn hàng...</p>
            </div>
            <div class="customer-inline-actions">
            </div>
          </div>

          <div class="customer-list customer-list-history" id="customer-history-list"></div>
          <div class="customer-pagination-wrap" id="customer-history-pagination-wrap" hidden>
            <p class="customer-pagination-summary" id="customer-history-pagination-summary"></p>
            <div class="customer-pagination" id="customer-history-pagination"></div>
          </div>
        </section>
      </div>
    `;

    const filterForm = root.querySelector("#customer-history-filter-form");
    const keywordInput = root.querySelector("#bo-loc-tu-khoa-lich-su");
    const statusSelect = root.querySelector("#bo-loc-trang-thai-lich-su");
    const resetButton = root.querySelector("#customer-history-reset");
    const listNode = root.querySelector("#customer-history-list");
    const resultNode = root.querySelector("#customer-history-result-text");
    const activeFiltersNode = root.querySelector("#customer-history-active-filters");
    const paginationWrapNode = root.querySelector("#customer-history-pagination-wrap");
    const paginationSummaryNode = root.querySelector("#customer-history-pagination-summary");
    const paginationNode = root.querySelector("#customer-history-pagination");

    function syncFilterUrl() {
      const url = new URL(window.location.href);
      const nextKeyword = String(keywordInput?.value || "").trim();
      const nextStatus = String(statusSelect?.value || "all").trim();

      if (nextKeyword) {
        url.searchParams.set("search", nextKeyword);
      } else {
        url.searchParams.delete("search");
      }

      if (nextStatus !== "all") {
        url.searchParams.set("status", nextStatus);
      } else {
        url.searchParams.delete("status");
      }

      url.searchParams.delete("survey");
      if (currentPage > 1) {
        url.searchParams.set("page", String(currentPage));
      } else {
        url.searchParams.delete("page");
      }
      window.history.replaceState({}, "", url.toString());
    }

    function renderList() {
      const keyword = String(keywordInput?.value || "").trim().toLowerCase();
      const status = normalizeStatusFilterValue(statusSelect?.value || "all");

      const filtered = items.filter((item) => {
        const statusMeta = getStatusMeta(item);
        if (status !== "all" && statusMeta.status_class !== status) return false;

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

      resultNode.textContent = totalItems
        ? `Hiển thị ${startLabel}-${endLabel} trên ${totalItems} đơn hàng. Trang ${currentPage}/${totalPages}.`
        : "Không tìm thấy đơn hàng nào khớp với điều kiện lọc.";

      const activeFilters = [];
      if (keyword) {
        activeFilters.push({
          key: "keyword",
          label: `Từ khóa: ${keywordInput.value.trim()}`,
        });
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
        : '<span class="customer-active-filters-note">Đang hiển thị toàn bộ đơn hàng.</span>';

      if (!filtered.length) {
        listNode.innerHTML = `
          <div class="customer-empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Không có kết quả phù hợp. Thử đổi từ khóa hoặc mở rộng bộ lọc.</p>
          </div>
        `;
        paginationWrapNode.hidden = true;
        paginationNode.innerHTML = "";
        paginationSummaryNode.textContent = "";
        return;
      }

      listNode.innerHTML = paginatedItems
        .map(
          (item) => {
            const statusMeta = getStatusMeta(item);
            return `
            <article class="customer-order-card customer-order-card-history">
              <div class="customer-order-topline">
                <div class="customer-order-heading">
                  <p class="customer-order-recipient">${escapeHtml(item.service_label || item.title || "--")}</p>
                  <div class="customer-order-heading-meta">
                    <p class="customer-order-code">${escapeHtml(item.code || "--")}</p>
                    <span class="customer-status-badge status-${escapeHtml(
                      statusMeta.badge_class,
                    )}">${escapeHtml(statusMeta.status_text)}</span>
                  </div>
                  <p class="customer-order-dest">${escapeHtml(getRouteSummary(item))}</p>
                </div>
                <div class="customer-order-side">
                  <div class="customer-order-price-block">
                    <span class="customer-order-price-label">Tạm tính</span>
                    <strong class="customer-order-price">${escapeHtml(formatCurrency(item.estimated_amount))}</strong>
                  </div>
                  <div class="customer-order-actions customer-order-actions-compact">
                    ${
                      item.type === "dat-lich"
                        ? `<a class="customer-btn customer-btn-primary" href="${escapeHtml(
                            getOrderDetailUrl(item.remote_id || item.code || ""),
                          )}">Xem chi tiết</a>`
                        : `<a class="customer-btn customer-btn-primary" href="${escapeHtml(
                            getProjectUrl("khach-hang/danh-sach-don-hang.html"),
                          )}">Mở đơn hàng</a>`
                    }
                  </div>
                </div>
              </div>
              <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                <span><b>Khảo sát</b><span class="customer-order-meta-value">${escapeHtml(item.survey_first ? "Có" : "Không")}</span></span>
                <span><b>Tạo</b><span class="customer-order-meta-value">${escapeHtml(formatDateTime(item.created_at || ""))}</span></span>
              </div>
            </article>
          `;
          },
        )
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

    filterForm?.addEventListener("submit", function (event) {
      event.preventDefault();
      currentPage = 1;
      syncFilterUrl();
      renderList();
    });

    resetButton?.addEventListener("click", function () {
      if (keywordInput) keywordInput.value = "";
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
