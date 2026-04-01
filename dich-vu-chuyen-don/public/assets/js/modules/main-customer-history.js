(function (window, document) {
  if (window.__fastGoCustomerHistoryLoaded) return;
  window.__fastGoCustomerHistoryLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
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

  function buildDetailUrl(code) {
    return getProjectUrl(`khach-hang/chi-tiet-yeu-cau.html?code=${encodeURIComponent(code || "")}`);
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Chờ báo giá chốt";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDateTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "--";
    }
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderHistory(data) {
    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const identity = data?.profile || store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const items = Array.isArray(data?.history) ? data.history : store.getHistoryItems();
    const stats = store.getDashboardStats(items);

    root.innerHTML = `
      <div class="luoi-lich-su-khach-hang">
        <div class="noi-dung-lich-su-khach-hang">
          <section class="the-lich-su-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Lịch sử đơn chuyển dọn</h3>
                <p>Danh sách này gom toàn bộ yêu cầu khảo sát và đặt lịch đã lưu cho tài khoản hiện tại.</p>
              </div>
            </div>
            <div class="tong-quan-lich-su">
              <div class="chi-so-lich-su">
                <span>Tổng yêu cầu</span>
                <strong>${escapeHtml(String(stats.total))}</strong>
              </div>
              <div class="chi-so-lich-su">
                <span>Đang mở</span>
                <strong>${escapeHtml(String(stats.open_count))}</strong>
              </div>
              <div class="chi-so-lich-su">
                <span>Khảo sát đã gửi</span>
                <strong>${escapeHtml(String(stats.survey_count))}</strong>
              </div>
            </div>
          </section>

          <section class="the-lich-su-khach-hang the-loc-lich-su">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Lọc và tìm nhanh</h3>
                <p>Tìm theo mã đơn, tên dịch vụ, địa chỉ hoặc trạng thái đang hiển thị.</p>
              </div>
            </div>
            <div class="luoi-loc-lich-su">
              <div class="nhom-truong">
                <label class="nhan-truong" for="bo-loc-tu-khoa-lich-su">Từ khóa</label>
                <input class="truong-nhap" id="bo-loc-tu-khoa-lich-su" type="search" placeholder="Ví dụ: chuyển nhà, Quận 7, DL-240328-07" />
              </div>
              <div class="nhom-truong">
                <label class="nhan-truong" for="bo-loc-loai-lich-su">Loại yêu cầu</label>
                <select class="truong-nhap" id="bo-loc-loai-lich-su">
                  <option value="all">Tất cả</option>
                  <option value="dat-lich">Đặt lịch</option>
                  <option value="khao-sat">Khảo sát</option>
                </select>
              </div>
              <div class="nhom-truong">
                <label class="nhan-truong" for="bo-loc-trang-thai-lich-su">Trạng thái</label>
                <select class="truong-nhap" id="bo-loc-trang-thai-lich-su">
                  <option value="all">Tất cả</option>
                  <option value="moi">Mới tiếp nhận</option>
                  <option value="xac-nhan">Đã xác nhận</option>
                  <option value="dang-xu-ly">Đang xử lý</option>
                </select>
              </div>
            </div>
          </section>

          <section class="the-lich-su-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Danh sách yêu cầu</h3>
                <p id="customer-history-result-text">Đang tải dữ liệu lịch sử...</p>
              </div>
            </div>
            <div class="danh-sach-don-khach-hang" id="customer-history-list"></div>
          </section>
        </div>

        <aside class="canh-lich-su-khach-hang">
          <section class="the-lich-su-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Tài khoản đang xem</h3>
                <p>Lịch sử hiện đang hiển thị theo tài khoản của ${escapeHtml(displayName)}.</p>
              </div>
            </div>
            <div class="the-hoso-dashboard">
              <h4>Tên hiển thị</h4>
              <p>${escapeHtml(displayName)}</p>
            </div>
            <div class="the-hoso-dashboard">
              <h4>Email</h4>
              <p>${escapeHtml(String(identity.email || "").trim() || "Chưa có dữ liệu email")}</p>
            </div>
            <div class="the-hoso-dashboard">
              <h4>Số điện thoại</h4>
              <p>${escapeHtml(String(identity.phone || "").trim() || "Chưa có dữ liệu số điện thoại")}</p>
            </div>
          </section>

          <section class="the-lich-su-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Lối tắt</h3>
              </div>
            </div>
            <div class="the-don-khach-hang__hanh-dong">
              <a class="nut-hanh-dong nut-sang" href="${escapeHtml(getProjectUrl("khach-hang/dashboard.html"))}">Về dashboard</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl("khach-hang/ho-so.html"))}">Hồ sơ khách hàng</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">Tạo đơn mới</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl("khao-sat.html"))}">Gửi khảo sát</a>
            </div>
          </section>

          <section class="the-lich-su-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Gợi ý bước kế tiếp</h3>
              </div>
            </div>
            <ol class="danh-sach-meo-lich-su">
              <li>Dùng bộ lọc để rà nhanh những yêu cầu đang mở hoặc đã xác nhận.</li>
              <li>Mở chi tiết từng yêu cầu để kiểm tra lại lịch hẹn, đầu mối liên hệ và ghi chú.</li>
              <li>Nếu cần tạo yêu cầu mới, bạn có thể đi lại từ biểu mẫu đặt lịch hoặc khảo sát.</li>
            </ol>
          </section>
        </aside>
      </div>
    `;

    const keywordInput = root.querySelector("#bo-loc-tu-khoa-lich-su");
    const typeSelect = root.querySelector("#bo-loc-loai-lich-su");
    const statusSelect = root.querySelector("#bo-loc-trang-thai-lich-su");
    const listNode = root.querySelector("#customer-history-list");
    const resultNode = root.querySelector("#customer-history-result-text");

    function renderList() {
      const keyword = String(keywordInput?.value || "").trim().toLowerCase();
      const type = String(typeSelect?.value || "all").trim();
      const status = String(statusSelect?.value || "all").trim();

      const filtered = items.filter((item) => {
        if (type !== "all" && item.type !== type) return false;
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
        ? `Hiển thị ${filtered.length} yêu cầu gần nhất theo bộ lọc hiện tại.`
        : "Không tìm thấy yêu cầu nào khớp với điều kiện lọc.";

      if (!filtered.length) {
        listNode.innerHTML = `
          <div class="trang-thai-rong-lich-su">
            <i class="fa-solid fa-folder-open"></i>
            <h3>Chưa có kết quả phù hợp</h3>
            <p>Thử đổi từ khóa, trạng thái hoặc tạo thêm một yêu cầu mới từ biểu mẫu khảo sát/đặt lịch.</p>
          </div>
        `;
        return;
      }

      listNode.innerHTML = filtered
        .map(
          (item) => `
            <article class="the-don-khach-hang">
              <div class="the-don-khach-hang__dau">
                <div>
                  <div class="nhan-loai-don">
                    <i class="fa-solid ${item.type === "khao-sat" ? "fa-clipboard-list" : "fa-calendar-check"}"></i>
                    ${escapeHtml(item.type_label)}
                  </div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.code)} • Tạo lúc ${escapeHtml(formatDateTime(item.created_at))}</p>
                </div>
                <span class="nhan-trang-thai-dashboard nhan-trang-thai-dashboard--${escapeHtml(item.status_class)}">
                  ${escapeHtml(item.status_text)}
                </span>
              </div>
              <p class="the-don-khach-hang__mo-ta">${escapeHtml(item.summary)}</p>
              <div class="the-don-khach-hang__meta">
                <span><strong>Dịch vụ:</strong> ${escapeHtml(item.service_label || "--")}</span>
                <span><strong>Lịch dự kiến:</strong> ${escapeHtml(item.schedule_label || "--")}</span>
                <span><strong>Điểm đi:</strong> ${escapeHtml(item.from_address || "--")}</span>
                <span><strong>Điểm đến:</strong> ${escapeHtml(item.to_address || "Chưa có")}</span>
              </div>
              <div class="the-don-khach-hang__chan">
                <small>${escapeHtml(item.meta || "Chưa có ghi chú thêm.")}</small>
                <div class="the-don-khach-hang__hanh-dong">
                  <span class="the-don-khach-hang__gia">${escapeHtml(formatCurrency(item.estimated_amount))}</span>
                  <a class="nut-hanh-dong nut-sang" href="${escapeHtml(buildDetailUrl(item.code))}">Xem chi tiết</a>
                  <a class="nut-phu" href="${escapeHtml(getProjectUrl(item.type === "khao-sat" ? "khao-sat.html" : "dat-lich.html"))}">Tạo lại từ mẫu này</a>
                </div>
              </div>
            </article>
          `,
        )
        .join("");
    }

    [keywordInput, typeSelect, statusSelect].forEach((node) => {
      node?.addEventListener("input", renderList);
      node?.addEventListener("change", renderList);
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
})(window, document);
