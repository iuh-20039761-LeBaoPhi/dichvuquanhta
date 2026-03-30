(function (window, document) {
  if (window.__fastGoCustomerDashboardLoaded) return;
  window.__fastGoCustomerDashboardLoaded = true;

  const core = window.FastGoCore || {};
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-dashboard") {
    return;
  }

  const root = document.getElementById("customer-dashboard-root");
  if (!root) return;

  const storageKeyRole = "fastgo-auth-role";
  const storageKeyIdentity = "fastgo-auth-identity";

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

  function readIdentity() {
    try {
      const raw = window.localStorage.getItem(storageKeyIdentity);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error("Cannot parse saved identity:", error);
      return {};
    }
  }

  function getSavedRole() {
    try {
      return String(window.localStorage.getItem(storageKeyRole) || "").trim();
    } catch (error) {
      console.error("Cannot access saved role:", error);
      return "";
    }
  }

  function buildSampleRequests() {
    return [
      {
        code: "KS-240330-01",
        title: "Khảo sát chuyển căn hộ 2 phòng ngủ",
        statusClass: "moi",
        statusText: "Mới tiếp nhận",
        summary: "Đầu việc đã gửi, điều phối sẽ gọi lại để chốt lịch khảo sát trong khung giờ bạn chọn.",
        meta: "Ưu tiên khảo sát tại Quận 7, cuối tuần này",
      },
      {
        code: "DL-240328-07",
        title: "Đặt lịch chuyển nhà trọn gói",
        statusClass: "xac-nhan",
        statusText: "Đã xác nhận",
        summary: "Lịch chuyển dọn đã được xác nhận, chờ đội vận hành khóa phương án xe và nhân sự.",
        meta: "Dự kiến triển khai lúc 08:00, cần bọc kính và đồ điện tử",
      },
      {
        code: "DL-240325-03",
        title: "Yêu cầu chuyển văn phòng mini",
        statusClass: "dang-xu-ly",
        statusText: "Đang xử lý",
        summary: "Điều phối đang rà phương án bốc xếp và lộ trình phù hợp để gửi lại báo giá chốt.",
        meta: "Có 1 tủ hồ sơ lớn và 6 bộ bàn ghế cần tháo lắp",
      },
    ];
  }

  function getDisplayName(identity) {
    return (
      String(identity.fullName || identity.full_name || "").trim() ||
      String(identity.email || "").trim() ||
      "khách hàng"
    );
  }

  function renderDashboard() {
    const role = getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const identity = readIdentity();
    const displayName = getDisplayName(identity);
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const requests = buildSampleRequests();

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
                  Dashboard này đang là lớp giao diện đầu tiên cho khu khách hàng của Dịch vụ Chuyển Dọn.
                  Bạn có thể đi tiếp sang khảo sát, đặt lịch và xem nhanh tiến độ xử lý các yêu cầu gần nhất.
                </p>
                <div class="dashboard-khach-hang-hanh-dong">
                  <a class="nut-hanh-dong nut-sang" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">Tạo yêu cầu đặt lịch</a>
                  <a class="nut-hanh-dong nut-vien" href="${escapeHtml(getProjectUrl("khao-sat.html"))}">Gửi yêu cầu khảo sát</a>
                </div>
              </div>
              <div class="dashboard-khach-hang-thong-tin">
                <div class="dashboard-chi-so">
                  <span>Yêu cầu đang mở</span>
                  <strong>03</strong>
                </div>
                <div class="dashboard-chi-so">
                  <span>Lịch đã xác nhận</span>
                  <strong>01</strong>
                </div>
                <div class="dashboard-chi-so">
                  <span>Điểm cần chốt</span>
                  <strong>02</strong>
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
              <a class="the-link-nhanh" href="${escapeHtml(getProjectUrl("dang-nhap.html?vai-tro=khach-hang&redirect=dat-lich.html"))}">
                <i class="fa-solid fa-link"></i>
                <strong>Điều hướng có mục tiêu</strong>
                <span>Giữ sẵn đường dẫn đăng nhập kèm tham số redirect để nối các bước đặt lịch sau này.</span>
              </a>
            </div>
          </section>

          <section class="the-dashboard-khach-hang dashboard-khach-hang-rong">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Yêu cầu gần đây</h3>
                <p>Hiện là dữ liệu mẫu để chốt UI. Khi nối backend, khối này sẽ chuyển sang danh sách yêu cầu thật của khách.</p>
              </div>
            </div>
            <div class="danh-sach-yeu-cau">
              ${requests
                .map(
                  (request) => `
                    <article class="trang-thai-yeu-cau">
                      <div class="trang-thai-yeu-cau__dau">
                        <div>
                          <strong>${escapeHtml(request.title)}</strong>
                          <span>${escapeHtml(request.code)}</span>
                        </div>
                        <span class="nhan-trang-thai-dashboard nhan-trang-thai-dashboard--${escapeHtml(request.statusClass)}">
                          ${escapeHtml(request.statusText)}
                        </span>
                      </div>
                      <span>${escapeHtml(request.summary)}</span>
                      <small>${escapeHtml(request.meta)}</small>
                    </article>
                  `,
                )
                .join("")}
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
              <li>Khóa mẫu dữ liệu yêu cầu khảo sát và lịch chuyển dọn.</li>
              <li>Dựng trang lịch sử yêu cầu để nối từ dashboard.</li>
              <li>Tạo trang chi tiết yêu cầu để theo dõi tiến độ thật.</li>
            </ol>
          </section>

          <section class="the-dashboard-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Phiên làm việc</h3>
                <p>Chỉ là phiên UI cục bộ trong trình duyệt ở giai đoạn này.</p>
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
        try {
          window.localStorage.removeItem(storageKeyIdentity);
          window.localStorage.removeItem(storageKeyRole);
        } catch (error) {
          console.error("Cannot clear local session:", error);
        }
      });
    }
  }

  renderDashboard();
})(window, document);
