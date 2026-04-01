(function (window, document) {
  if (window.__fastGoCustomerDetailLoaded) return;
  window.__fastGoCustomerDetailLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-detail") {
    return;
  }

  const root = document.getElementById("customer-detail-root");
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

  function getQueryCode() {
    try {
      return String(new URLSearchParams(window.location.search).get("code") || "").trim();
    } catch (error) {
      console.error("Cannot read detail code:", error);
      return "";
    }
  }

  function buildTimeline(item) {
    const createdAt = formatDateTime(item.created_at);
    const common = [
      {
        title: "Yêu cầu đã ghi nhận",
        note: `${item.type_label} đã được lưu trong hệ thống demo.`,
        time: createdAt,
        active: true,
      },
    ];

    if (item.status_class === "moi") {
      common.push({
        title: "Chờ điều phối gọi lại",
        note: "Điều phối viên sẽ xác nhận lại khối lượng, điều kiện tiếp cận và khung giờ triển khai.",
        time: item.schedule_label || "Đang chờ chốt lịch",
        active: true,
      });
      common.push({
        title: "Chuẩn bị chốt phương án",
        note: "Bước này sẽ có báo giá, nhân sự và xe khi phase dữ liệu chính thức được nối.",
        time: "Bước tiếp theo",
        active: false,
      });
      return common;
    }

    if (item.status_class === "xac-nhan") {
      common.push({
        title: "Phương án đã xác nhận",
        note: "Lịch, xe và hạng mục hỗ trợ đã được khóa cho yêu cầu này.",
        time: item.schedule_label || "Đã xác nhận",
        active: true,
      });
      common.push({
        title: "Sẵn sàng triển khai",
        note: "Đội vận hành sẽ bám theo khung giờ đã chốt.",
        time: "Chuẩn bị thực hiện",
        active: false,
      });
      return common;
    }

    common.push({
      title: "Đang rà phương án triển khai",
      note: "Điều phối đang kiểm tra tải trọng, tuyến đường và tổ đội phù hợp.",
      time: item.schedule_label || "Đang xử lý",
      active: true,
    });
    common.push({
      title: "Chờ xác nhận cuối",
      note: "Khi hoàn tất bước này, yêu cầu sẽ chuyển sang trạng thái xác nhận.",
      time: "Đang cập nhật",
      active: false,
    });
    return common;
  }

  function renderEmptyState() {
    root.innerHTML = `
      <div class="trang-thai-rong-chi-tiet">
        <i class="fa-solid fa-circle-exclamation"></i>
        <h3>Không tìm thấy yêu cầu</h3>
        <p>Yêu cầu bạn đang mở không tồn tại trong lịch sử hiện tại hoặc đường dẫn chưa có mã hợp lệ.</p>
        <div style="margin-top: 18px;">
          <a class="nut-hanh-dong nut-sang" href="${escapeHtml(getProjectUrl("khach-hang/lich-su-yeu-cau.html"))}">Quay lại lịch sử đơn</a>
        </div>
      </div>
    `;
  }

  function renderDetail(data) {
    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const code = getQueryCode();
    const item = data?.request || (store.getHistoryItemByCode ? store.getHistoryItemByCode(code) : null);

    if (!item) {
      renderEmptyState();
      return;
    }

    const timeline = buildTimeline(item);
    const identity = data?.profile || store.readIdentity();

    root.innerHTML = `
      <div class="luoi-chi-tiet-khach-hang">
        <div class="noi-dung-chi-tiet-khach-hang">
          <section class="the-chi-tiet-khach-hang the-chi-tiet-khach-hang--hero">
            <div class="cum-nhan-chi-tiet">
              <span class="nhan-loai-don">
                <i class="fa-solid ${item.type === "khao-sat" ? "fa-clipboard-list" : "fa-calendar-check"}"></i>
                ${escapeHtml(item.type_label)}
              </span>
              <span class="nhan-trang-thai-dashboard nhan-trang-thai-dashboard--${escapeHtml(item.status_class)}">
                ${escapeHtml(item.status_text)}
              </span>
            </div>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary || "Đây là bản tổng hợp chi tiết của yêu cầu chuyển dọn trong khu khách hàng.")}</p>
          </section>

          <section class="the-chi-tiet-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Tổng quan yêu cầu</h3>
                <p>Nhóm thông tin cốt lõi để khách hàng và điều phối cùng nhìn một ngữ cảnh xử lý.</p>
              </div>
            </div>
            <div class="luoi-tong-quan-chi-tiet">
              <div class="muc-thong-tin-chi-tiet">
                <span>Mã yêu cầu</span>
                <strong>${escapeHtml(item.code)}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Dịch vụ</span>
                <strong>${escapeHtml(item.service_label || "--")}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Thời điểm tạo</span>
                <strong>${escapeHtml(formatDateTime(item.created_at))}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Khung thời gian dự kiến</span>
                <strong>${escapeHtml(item.schedule_label || "Chờ xác nhận")}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Chi phí tạm tính</span>
                <strong>${escapeHtml(formatCurrency(item.estimated_amount))}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Nguồn dữ liệu</span>
                <strong>${escapeHtml(item.source === "sample" ? "Mẫu hệ thống" : "Biểu mẫu bạn vừa gửi")}</strong>
              </div>
            </div>
          </section>

          <section class="the-chi-tiet-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Thông tin điều phối</h3>
                <p>Các trường này là nền cho bước đồng bộ dữ liệu chính thức và chi tiết đơn sau này.</p>
              </div>
            </div>
            <div class="luoi-thong-tin-chi-tiet">
              <div class="muc-thong-tin-chi-tiet">
                <span>Điểm đi / khảo sát</span>
                <strong>${escapeHtml(item.from_address || "Chưa có dữ liệu")}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Điểm đến</span>
                <strong>${escapeHtml(item.to_address || "Chưa có dữ liệu")}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Người liên hệ</span>
                <strong>${escapeHtml(item.contact_name || store.getDisplayName(identity))}</strong>
              </div>
              <div class="muc-thong-tin-chi-tiet">
                <span>Số điện thoại</span>
                <strong>${escapeHtml(item.contact_phone || identity.phone || "Chưa có dữ liệu")}</strong>
              </div>
            </div>
            <div class="muc-thong-tin-chi-tiet" style="margin-top:16px;">
              <span>Ghi chú</span>
              <p>${escapeHtml(item.note || item.meta || "Chưa có ghi chú bổ sung.")}</p>
            </div>
          </section>

          <section class="the-chi-tiet-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Tiến độ xử lý</h3>
                <p>Mạch này được dựng theo trạng thái hiện tại của yêu cầu để khách hàng dễ bám tiến độ xử lý.</p>
              </div>
            </div>
            <div class="thanh-tien-trinh-chi-tiet">
              ${timeline
                .map(
                  (step) => `
                    <div class="moc-tien-trinh ${step.active ? "is-active" : ""}">
                      <strong>${escapeHtml(step.title)}</strong>
                      <p>${escapeHtml(step.note)}</p>
                      <small>${escapeHtml(step.time)}</small>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </section>
        </div>

        <aside class="canh-chi-tiet-khach-hang">
          <section class="the-chi-tiet-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Hành động nhanh</h3>
              </div>
            </div>
            <div class="the-don-khach-hang__hanh-dong">
              <a class="nut-hanh-dong nut-sang" href="${escapeHtml(getProjectUrl("khach-hang/lich-su-yeu-cau.html"))}">Quay lại lịch sử</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl("khach-hang/ho-so.html"))}">Mở hồ sơ khách hàng</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl("dat-lich.html"))}">Tạo yêu cầu mới</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl(item.type === "khao-sat" ? "khao-sat.html" : "dat-lich.html"))}">Tạo lại theo mẫu này</a>
            </div>
          </section>

          <section class="the-chi-tiet-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Thông tin đối chiếu</h3>
              </div>
            </div>
            <div class="muc-thong-tin-chi-tiet">
              <span>Meta xử lý</span>
              <p>${escapeHtml(item.meta || "Chưa có meta bổ sung.")}</p>
            </div>
          </section>

          <section class="the-chi-tiet-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Gợi ý hoàn thiện tiếp</h3>
              </div>
            </div>
            <ol class="danh-sach-meo-lich-su">
              <li>Kiểm tra lại thông tin liên hệ và ghi chú nếu điều phối cần gọi xác nhận.</li>
              <li>Quay về lịch sử đơn để so sánh với các yêu cầu khác đang mở.</li>
              <li>Tạo một yêu cầu mới nếu cần khảo sát hoặc đặt lịch cho tuyến khác.</li>
            </ol>
          </section>
        </aside>
      </div>
    `;
  }

  (async function bootstrapDetail() {
    const code = getQueryCode();

    if (!code) {
      renderEmptyState();
      return;
    }

    try {
      const result = await store.fetchDetail?.(code);
      renderDetail(result || null);
    } catch (error) {
      console.error("Cannot load customer detail store:", error);
      renderDetail(null);
    }
  })();
})(window, document);
