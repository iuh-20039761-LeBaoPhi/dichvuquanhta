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

  function getRouteSummary(item) {
    const fromAddress = String(item?.from_address || "").trim();
    const toAddress = String(item?.to_address || "").trim();
    if (fromAddress || toAddress) {
      return `${fromAddress || "--"} → ${toAddress || "--"}`;
    }
    return String(item?.summary || item?.meta || "Chưa có mô tả chi tiết.").trim();
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
    const initialStatus = String(params.get("status") || "all").trim();

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
                <option value="xac-nhan" ${initialStatus === "xac-nhan" ? "selected" : ""}>Đã xác nhận</option>
                <option value="dang-xu-ly" ${initialStatus === "dang-xu-ly" ? "selected" : ""}>Đang xử lý</option>
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
              <a class="customer-btn customer-btn-primary customer-btn-sm" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">Tạo yêu cầu mới</a>
            </div>
          </div>

          <div class="customer-list customer-list-history" id="customer-history-list"></div>
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
      window.history.replaceState({}, "", url.toString());
    }

    function renderList() {
      const keyword = String(keywordInput?.value || "").trim().toLowerCase();
      const status = String(statusSelect?.value || "all").trim();

      const filtered = items.filter((item) => {
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
        ? `Hiển thị ${filtered.length} đơn hàng theo bộ lọc hiện tại.`
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
      if (status === "xac-nhan") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đã xác nhận" });
      }
      if (status === "dang-xu-ly") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đang xử lý" });
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
                  <p class="customer-order-dest">${escapeHtml(getRouteSummary(item))}</p>
                </div>
                <span class="customer-status-badge status-${escapeHtml(
                  getStatusBadgeClass(item.status_class),
                )}">${escapeHtml(item.status_text || "Mới tiếp nhận")}</span>
              </div>
              <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                <span><b>Dịch vụ</b>${escapeHtml(item.service_label || "--")}</span>
                <span><b>Khảo sát</b>${escapeHtml(item.survey_first ? "Có" : "Không")}</span>
                <span><b>Tạo</b>${escapeHtml(formatDateTime(item.created_at || ""))}</span>
                <span><b>Tạm tính</b>${escapeHtml(formatCurrency(item.estimated_amount))}</span>
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
            </article>
          `,
        )
        .join("");
    }

    filterForm?.addEventListener("submit", function (event) {
      event.preventDefault();
      syncFilterUrl();
      renderList();
    });

    resetButton?.addEventListener("click", function () {
      if (keywordInput) keywordInput.value = "";
      if (statusSelect) statusSelect.value = "all";
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

      syncFilterUrl();
      renderList();
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
