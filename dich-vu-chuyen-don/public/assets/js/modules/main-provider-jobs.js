import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";
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

  function getOrderDetailUrl(orderCode) {
    return typeof core.buildOrderDetailUrl === "function"
      ? core.buildOrderDetailUrl("nha-cung-cap/chi-tiet-don-hang.html", orderCode)
      : getProjectUrl(
          `nha-cung-cap/chi-tiet-don-hang.html?madonhang=${encodeURIComponent(
            orderCode || "",
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
    const rawDate = normalizeText(dateValue);
    if (!rawDate) return "--";

    const date = new Date(rawDate);
    const dateText = Number.isNaN(date.getTime())
      ? rawDate
      : date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
    const timeText = normalizeText(timeValue);
    return timeText ? `${dateText} • ${timeText}` : dateText;
  }

  function getStatusMeta(row) {
    const rawStatus = normalizeLowerText(row?.status || row?.trang_thai || "");

    if (["da_xac_nhan", "xac_nhan", "confirmed", "accepted", "da_chot_lich"].includes(rawStatus)) {
      return {
        className: "completed",
        value: "xac-nhan",
        label: "Đã xác nhận",
      };
    }

    if (["dang_xu_ly", "processing", "in_progress", "dang_dieu_phoi", "dang_trien_khai"].includes(rawStatus)) {
      return {
        className: "shipping",
        value: "dang-xu-ly",
        label: "Đang xử lý",
      };
    }

    if (["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(rawStatus)) {
      return {
        className: "cancelled",
        value: "da-huy",
        label: "Đã hủy",
      };
    }

    return {
      className: "pending",
      value: "moi",
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
      code: normalizeText(
        row?.ma_yeu_cau_noi_bo || row?.ma_don_hang_noi_bo || row?.order_code || row?.id || "",
      ),
      serviceLabel: normalizeText(row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn"),
      statusClass: status.className,
      statusValue: status.value,
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
      const response = await Promise.resolve(
        listFn({
          table: store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich",
          page: 1,
          limit: 100,
          sort: {
            created_at: "desc",
          },
        }),
      );

      return extractRows(response).map(normalizeBookingRow);
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
    const initialStatus = String(params.get("status") || "all").trim();

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-panel customer-orders-panel provider-jobs-panel">
          <div class="customer-panel-head">
            <div>
              <p class="customer-section-kicker">Danh sách việc</p>
              <h2>Tìm và lọc yêu cầu chuyển dọn</h2>
              <p class="customer-panel-subtext">${escapeHtml(
                String(items.length),
              )} yêu cầu trong bảng việc hiện tại</p>
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
                <option value="dang-xu-ly" ${initialStatus === "dang-xu-ly" ? "selected" : ""}>Đang xử lý</option>
                <option value="xac-nhan" ${initialStatus === "xac-nhan" ? "selected" : ""}>Đã xác nhận</option>
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
              <h2>Việc đang hiển thị</h2>
              <p class="customer-panel-subtext" id="provider-job-result-text">Đang tải dữ liệu yêu cầu...</p>
            </div>
          </div>

          <div class="customer-list customer-list-history" id="provider-job-list"></div>
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

      window.history.replaceState({}, "", url.toString());
    }

    function renderList() {
      const keyword = normalizeLowerText(keywordInput?.value || "");
      const survey = String(surveySelect?.value || "all").trim();
      const status = String(statusSelect?.value || "all").trim();

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

      resultNode.textContent = filtered.length
        ? `Hiển thị ${filtered.length} yêu cầu theo bộ lọc hiện tại.`
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
      if (status === "dang-xu-ly") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đang xử lý" });
      }
      if (status === "xac-nhan") {
        activeFilters.push({ key: "status", label: "Trạng thái: Đã xác nhận" });
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
            syncFilterUrl();
            renderList();
          });
        return;
      }

      listNode.innerHTML = filtered
        .map(
          (item) => `
            <article class="customer-order-card customer-order-card-history">
              <div class="customer-order-topline">
                <div class="customer-order-heading">
                  <p class="customer-order-code">${escapeHtml(item.code || "--")}</p>
                  <p class="customer-order-recipient">${escapeHtml(item.serviceLabel || "Yêu cầu chuyển dọn")}</p>
                  <p class="customer-order-dest">${escapeHtml(getRouteSummary(item))}</p>
                </div>
                <span class="customer-status-badge status-${escapeHtml(
                  item.statusClass,
                )}">${escapeHtml(item.statusText || "Mới tiếp nhận")}</span>
              </div>
              <div class="customer-order-meta customer-order-meta-compact customer-order-meta-history">
                <span><b>Khách hàng</b>${escapeHtml(item.contactName || "--")}</span>
                <span><b>Số điện thoại</b>${escapeHtml(item.contactPhone || "--")}</span>
                <span><b>Khảo sát</b>${escapeHtml(item.surveyFirst ? "Có" : "Không")}</span>
                <span><b>Lịch</b>${escapeHtml(item.scheduleLabel || "--")}</span>
                <span><b>Tạo lúc</b>${escapeHtml(formatDateTime(item.createdAt))}</span>
                <span><b>Tạm tính</b>${escapeHtml(formatCurrency(item.estimatedAmount))}</span>
              </div>
              <div class="customer-order-actions customer-order-actions-compact">
                <a class="customer-btn customer-btn-primary" href="${escapeHtml(
                  getOrderDetailUrl(item.code || ""),
                )}">Xem chi tiết</a>
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
      if (surveySelect) surveySelect.value = "all";
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

      if (filterKey === "survey" && surveySelect) {
        surveySelect.value = "all";
      }

      if (filterKey === "status" && statusSelect) {
        statusSelect.value = "all";
      }

      syncFilterUrl();
      renderList();
    });

    renderList();
  }

  (async function bootstrapJobs() {
    const auth = core.getUrlAuthCredentials?.() || {
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
          <p>Đang tải danh sách việc nhà cung cấp...</p>
        </div>
      </div>
    `;

    try {
      const items = await fetchBookings();
      renderJobs({ items, profile });
    } catch (error) {
      console.error("Cannot render provider jobs:", error);
      root.innerHTML = `
        <div class="customer-portal-shell customer-portal-shell--simple">
          <div class="customer-empty-state">
            <i class="fas fa-circle-exclamation"></i>
            <p>Không thể tải danh sách việc ở thời điểm hiện tại.</p>
          </div>
        </div>
      `;
    }
  })();

  const moduleApi = {};
  window.__fastGoProviderJobsModule = moduleApi;
  return moduleApi;
})(window, document);

export default providerJobsModule;
