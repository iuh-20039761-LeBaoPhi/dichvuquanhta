(function (window, document) {
  if (window.__fastGoCustomerDashboardLoaded) return;
  window.__fastGoCustomerDashboardLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
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

  function buildDetailUrl(code) {
    return getProjectUrl(`khach-hang/chi-tiet-yeu-cau.html?code=${encodeURIComponent(code || "")}`);
  }

  function renderDashboard(data) {
    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const identity = data?.profile || store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const requests = Array.isArray(data?.recent_requests)
      ? data.recent_requests
      : store.getHistoryItems().slice(0, 3);
    const stats = data?.stats || store.getDashboardStats(Array.isArray(data?.recent_requests) ? data.recent_requests : []);

    root.innerHTML = `
      <div class="luoi-dashboard-khach-hang">
        <div class="dashboard-khach-hang-noi-dung">
          <section class="the-dashboard-khach-hang the-dashboard-khach-hang--hero">
            <span class="dashboard-khach-hang-nhan">
              <i class="fa-solid fa-house-circle-check"></i>
              Khu vực khách hàng
            </span>
            <div class="dashboard-khach-hang-dau">
              <div>
                <h2>Chào ${escapeHtml(displayName)}, đây là nơi theo dõi toàn bộ yêu cầu chuyển dọn của bạn.</h2>
                <p class="dashboard-khach-hang-mo-ta">
                  Bạn có thể đi tiếp sang khảo sát, đặt lịch và xem nhanh tiến độ xử lý các yêu cầu gần nhất
                  từ cùng nguồn dữ liệu của khu khách hàng.
                </p>
                <div class="dashboard-khach-hang-hanh-dong">
                  <a class="nut-hanh-dong nut-sang" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">Tạo yêu cầu đặt lịch</a>
                  <a class="nut-hanh-dong nut-vien" href="${escapeHtml(getProjectUrl("khao-sat.html"))}">Gửi yêu cầu khảo sát</a>
                </div>
              </div>
              <div class="dashboard-khach-hang-thong-tin">
                <div class="dashboard-chi-so">
                  <span>Yêu cầu đang mở</span>
                  <strong>${escapeHtml(String(stats.open_count))}</strong>
                </div>
                <div class="dashboard-chi-so">
                  <span>Lịch đã xác nhận</span>
                  <strong>${escapeHtml(String(stats.confirmed_count))}</strong>
                </div>
                <div class="dashboard-chi-so">
                  <span>Khảo sát đã gửi</span>
                  <strong>${escapeHtml(String(stats.survey_count))}</strong>
                </div>
              </div>
            </div>
          </section>

          <section class="the-dashboard-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Lối tắt nên dùng trước</h3>
                <p>Ba hướng đi ngắn nhất để khách hàng không bị mất mạch sau khi đăng nhập.</p>
              </div>
            </div>
            <div class="dashboard-khach-hang-grid-nhanh">
              <a class="the-link-nhanh" href="${escapeHtml(getProjectUrl("khao-sat.html"))}">
                <i class="fa-solid fa-clipboard-list"></i>
                <strong>Khởi tạo yêu cầu khảo sát</strong>
                <span>Phù hợp khi chưa chắc khối lượng đồ hoặc cần điều phối gọi lại để chốt phương án.</span>
              </a>
              <a class="the-link-nhanh" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">
                <i class="fa-solid fa-calendar-check"></i>
                <strong>Đặt lịch chuyển dọn ngay</strong>
                <span>Đi thẳng vào biểu mẫu đặt lịch nếu đã đủ thông tin về tuyến đường, thời gian và hạng mục.</span>
              </a>
              <a class="the-link-nhanh" href="${escapeHtml(getProjectUrl("cam-nang.html"))}">
                <i class="fa-solid fa-book-open-reader"></i>
                <strong>Xem cẩm nang chuẩn bị</strong>
                <span>Đọc checklist đóng gói, phân loại đồ và mẹo giảm phát sinh trước ngày chuyển.</span>
              </a>
              <a class="the-link-nhanh" href="${escapeHtml(getProjectUrl("khach-hang/ho-so.html"))}">
                <i class="fa-solid fa-user-gear"></i>
                <strong>Quản lý hồ sơ</strong>
                <span>Cập nhật đầu mối liên hệ và kiểm tra thông tin đang dùng trong portal khách hàng.</span>
              </a>
              <a class="the-link-nhanh" href="${escapeHtml(getProjectUrl("khach-hang/lich-su-yeu-cau.html"))}">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <strong>Vào lịch sử đơn</strong>
                <span>Xem lại các lần đã gửi khảo sát hoặc đặt lịch để giữ đúng mạch xử lý với điều phối.</span>
              </a>
            </div>
          </section>

          <section class="the-dashboard-khach-hang dashboard-khach-hang-rong">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Yêu cầu gần đây</h3>
                <p>Khối này đọc cùng nguồn dữ liệu với trang lịch sử đơn để khách hàng nhìn được nhịp xử lý gần nhất.</p>
              </div>
            </div>
            <div class="danh-sach-yeu-cau">
              ${requests.length
                ? requests
                .map(
                  (request) => `
                    <article class="trang-thai-yeu-cau">
                      <div class="trang-thai-yeu-cau__dau">
                        <div>
                          <strong>${escapeHtml(request.title)}</strong>
                          <span>${escapeHtml(request.code)}</span>
                        </div>
                        <span class="nhan-trang-thai-dashboard nhan-trang-thai-dashboard--${escapeHtml(request.status_class)}">
                          ${escapeHtml(request.status_text)}
                        </span>
                      </div>
                      <span>${escapeHtml(request.summary || "")}</span>
                      <small>${escapeHtml(request.meta || "")}</small>
                      <div class="the-don-khach-hang__hanh-dong">
                        <a class="nut-phu" href="${escapeHtml(buildDetailUrl(request.code))}">Xem chi tiết</a>
                      </div>
                    </article>
                  `,
                )
                .join("")
                : `
                  <article class="trang-thai-yeu-cau">
                    <div class="trang-thai-yeu-cau__dau">
                      <div>
                        <strong>Chưa có yêu cầu nào</strong>
                        <span>Bắt đầu từ biểu mẫu đầu tiên</span>
                      </div>
                    </div>
                    <span>Lịch sử xử lý sẽ xuất hiện tại đây ngay khi bạn gửi khảo sát hoặc đặt lịch.</span>
                  </article>
                `}
            </div>
          </section>
        </div>

        <aside class="dashboard-khach-hang-canh">
          <section class="the-dashboard-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Hồ sơ đang dùng</h3>
                <p>Thông tin lấy từ dữ liệu đã lưu sau bước đăng nhập hoặc đăng ký.</p>
              </div>
            </div>
            <div class="luoi-lien-he-dashboard">
              <div class="the-hoso-dashboard">
                <h4>Tên hiển thị</h4>
                <p>${escapeHtml(displayName)}</p>
              </div>
              <div class="the-hoso-dashboard">
                <h4>Email</h4>
                <p>${escapeHtml(email || "Chưa có dữ liệu email")}</p>
              </div>
              <div class="the-hoso-dashboard">
                <h4>Số điện thoại</h4>
                <p>${escapeHtml(phone || "Chưa có dữ liệu số điện thoại")}</p>
              </div>
            </div>
          </section>

          <section class="the-dashboard-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Bước nên làm tiếp</h3>
              </div>
            </div>
            <ol class="danh-sach-buoc-tiep">
              <li>Gửi khảo sát hoặc đặt lịch mới để hệ thống lưu thêm yêu cầu vào lịch sử của bạn.</li>
              <li>Kiểm tra lại thông tin liên hệ trong hồ sơ trước khi chốt đơn đầu tiên.</li>
              <li>Theo dõi lịch sử đơn để giữ đúng mạch xử lý với điều phối.</li>
            </ol>
          </section>

          <section class="the-dashboard-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Phiên làm việc</h3>
                <p>Phiên này đang đồng bộ với tài khoản khách hàng hiện tại.</p>
              </div>
            </div>
            <a class="nut-phu" href="${escapeHtml(getProjectUrl("dang-nhap.html?vai-tro=khach-hang"))}" data-dashboard-logout>Đăng xuất giao diện</a>
          </section>
        </aside>
      </div>
    `;

    const logoutLink = root.querySelector("[data-dashboard-logout]");
    if (logoutLink) {
      logoutLink.addEventListener("click", function () {
        store.clearAuthSession();
      });
    }
  }

  (async function bootstrapDashboard() {
    try {
      const result = await store.fetchDashboardFromApi?.();
      renderDashboard(result || null);
    } catch (error) {
      console.error("Cannot load customer dashboard API:", error);
      renderDashboard(null);
    }
  })();
})(window, document);
