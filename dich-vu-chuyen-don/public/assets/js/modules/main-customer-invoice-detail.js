(function (window, document) {
  if (window.__fastGoCustomerInvoiceDetailLoaded) return;
  window.__fastGoCustomerInvoiceDetailLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-invoice-detail") {
    return;
  }

  const root = document.getElementById("customer-invoice-detail-root");
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
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function"
      ? core.toProjectUrl(path)
      : path;
  }

  function getCurrentTargetUrl() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function redirectToLogin() {
    const loginUrl = new URL(
      getProjectUrl("dang-nhap.html"),
      window.location.href,
    );
    loginUrl.searchParams.set("vai-tro", "khach-hang");
    loginUrl.searchParams.set("redirect", getCurrentTargetUrl());
    window.location.href = loginUrl.toString();
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

  function formatDistance(value) {
    const distance = Number(value || 0);
    if (!Number.isFinite(distance) || distance <= 0) return "--";
    return `${distance.toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} km`;
  }

  function getQueryCode() {
    try {
      return String(
        new URLSearchParams(window.location.search).get("code") || "",
      ).trim();
    } catch (error) {
      console.error("Cannot resolve booking invoice code:", error);
      return "";
    }
  }

  function getSourceLabel(invoice) {
    if (invoice?.source === "krud") return "Dữ liệu KRUD";
    return "Dữ liệu hiện có";
  }

  function getWeatherLabel(value) {
    const weather = normalizeText(value).toLowerCase();
    if (!weather) return "Chờ đồng bộ";
    if (weather === "binh_thuong") return "Bình thường";
    if (weather === "troi_mua") return "Trời mưa";
    return value;
  }

  function getStatusTone(statusClass) {
    if (statusClass === "xac-nhan") return "completed";
    if (statusClass === "dang-xu-ly") return "shipping";
    if (statusClass === "da-huy" || statusClass === "huy") return "cancelled";
    return "pending";
  }

  function getProgressMeta(invoice) {
    const tone = getStatusTone(invoice?.status_class);
    if (tone === "completed") {
      return {
        percent: 100,
        label: "Đã xác nhận",
        note: "Đơn đã được xác nhận.",
        tone,
      };
    }
    if (tone === "shipping") {
      return {
        percent: 72,
        label: "Đang xử lý",
        note: "Đơn đang được xử lý.",
        tone,
      };
    }
    if (tone === "cancelled") {
      return {
        percent: 100,
        label: "Đã hủy",
        note: "Đơn đã bị hủy.",
        tone,
      };
    }
    return {
      percent: 24,
      label: "Mới tiếp nhận",
      note: "Đơn đang chờ điều phối.",
      tone,
    };
  }

  function renderStatusBadge(statusClass, label) {
    return `<span class="customer-status-badge status-${escapeHtml(
      getStatusTone(statusClass),
    )}">${escapeHtml(label || "Mới tiếp nhận")}</span>`;
  }

  function canCancelInvoice(invoice) {
    const tone = getStatusTone(invoice?.status_class);
    return tone !== "completed" && tone !== "cancelled";
  }

  function getFeedbackMeta(invoice) {
    const rawRow = invoice?.raw_row || {};
    const rating = Number(rawRow?.customer_rating || rawRow?.rating || 0);
    const feedback = normalizeText(rawRow?.customer_feedback || rawRow?.feedback || "");
    return {
      rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0,
      feedback,
    };
  }

  function getProviderNoteMeta(invoice) {
    const rawRow = invoice?.raw_row || {};
    return {
      note: normalizeText(rawRow?.provider_note || rawRow?.shipper_note || rawRow?.ghi_chu_nha_cung_cap || ""),
    };
  }

  function renderRatingStars(rating) {
    const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
    return `<div class="standalone-order-rating-stars" aria-label="Đánh giá ${safeRating} trên 5 sao">${[
      1, 2, 3, 4, 5,
    ]
      .map(
        (star) =>
          `<i class="fa-${star <= safeRating ? "solid" : "regular"} fa-star"></i>`,
      )
      .join("")}</div>`;
  }

  function renderInfoRow(label, value, options = {}) {
    const safeLabel = escapeHtml(label || "--");
    const safeValue = options.valueHtml
      ? value || "--"
      : escapeHtml(value || "--");
    const valueTag = options.valueTag || "strong";

    return `
      <div class="standalone-order-info-row">
        <span>${safeLabel}</span>
        <${valueTag} class="standalone-order-info-value">${safeValue}</${valueTag}>
      </div>
    `;
  }

  function renderHeroMetric(icon, label, value, hint) {
    return `
      <article class="standalone-order-hero-metric">
        <div class="standalone-order-hero-metric-icon">
          <i class="${escapeHtml(icon)}"></i>
        </div>
        <div class="standalone-order-hero-metric-copy">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value || "--")}</strong>
          <small>${escapeHtml(hint || "--")}</small>
        </div>
      </article>
    `;
  }

  function renderOverviewStat(icon, label, value, hint) {
    return `
      <article class="standalone-order-overview-stat">
        <div class="standalone-order-overview-stat-icon">
          <i class="${escapeHtml(icon)}"></i>
        </div>
        <div class="standalone-order-overview-stat-copy">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value || "--")}</strong>
          <small>${escapeHtml(hint || "--")}</small>
        </div>
      </article>
    `;
  }

  function renderChipList(items, emptyText) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
      return `<div class="standalone-order-note-panel"><p>${escapeHtml(emptyText)}</p></div>`;
    }

    return `
      <div class="standalone-order-item-meta">
        ${list
          .map(
            (item) =>
              `<span class="standalone-order-chip">${escapeHtml(item)}</span>`,
          )
          .join("")}
      </div>
    `;
  }

  function renderAttachmentGrid(title, items, icon, emptyText) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    return `
      <article class="standalone-order-subcard">
        <div class="standalone-order-subcard-head">
          <strong>${escapeHtml(title)}</strong>
          <span class="standalone-order-chip">${escapeHtml(String(list.length || 0))} tệp</span>
        </div>
        ${
          list.length
            ? `<div class="standalone-order-media-grid">
                ${list
                  .map(
                    (item, index) => `
                      <div class="standalone-order-media-item">
                        <div class="standalone-order-item-icon">
                          <i class="${escapeHtml(icon)}"></i>
                        </div>
                        <strong>${escapeHtml(`Tệp ${index + 1}`)}</strong>
                        <span>${escapeHtml(item)}</span>
                      </div>
                    `,
                  )
                  .join("")}
              </div>`
            : `<div class="standalone-order-note-panel"><p>${escapeHtml(emptyText)}</p></div>`
        }
      </article>
    `;
  }

  function renderAttachmentGallery(invoice) {
    const mediaItems = [
      ...((Array.isArray(invoice?.image_attachments) ? invoice.image_attachments : [])
        .filter(Boolean)
        .map((item, index) => ({
          type: "image",
          label: `Ảnh mặt bằng ${index + 1}`,
          value: item,
        }))),
      ...((Array.isArray(invoice?.video_attachments) ? invoice.video_attachments : [])
        .filter(Boolean)
        .map((item, index) => ({
          type: "video",
          label: `Video mặt bằng ${index + 1}`,
          value: item,
        }))),
    ];

    if (!mediaItems.length) {
      return '<div class="standalone-order-note-panel"><p>Chưa có tài liệu hiện trường nào được gửi kèm cho yêu cầu này.</p></div>';
    }

    return `
      <div class="standalone-order-media-grid">
        ${mediaItems
          .map(
            (item) => `
              <div class="standalone-order-media-item">
                <div class="standalone-order-item-icon">
                  <i class="${escapeHtml(
                    item.type === "video"
                      ? "fa-solid fa-video"
                      : "fa-solid fa-image",
                  )}"></i>
                </div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.value)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function getSurveyRequirementLabel(invoice) {
    const serviceDetails = Array.isArray(invoice?.service_details)
      ? invoice.service_details
      : [];
    return serviceDetails.some((item) =>
      normalizeText(item).toLowerCase().includes("khảo sát trước"),
    )
      ? "Cần khảo sát trước"
      : "Không cần khảo sát trước";
  }

  function getAttachmentCount(invoice) {
    const imageCount = Array.isArray(invoice?.image_attachments)
      ? invoice.image_attachments.filter(Boolean).length
      : 0;
    const videoCount = Array.isArray(invoice?.video_attachments)
      ? invoice.video_attachments.filter(Boolean).length
      : 0;
    return imageCount + videoCount;
  }

  function renderChecklistItems(items, emptyText) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
      return `<div class="standalone-order-note-panel"><p>${escapeHtml(emptyText)}</p></div>`;
    }

    return `
      <ul class="standalone-order-checklist">
        ${list
          .map(
            (item) => `
              <li>
                <i class="fa-solid fa-check"></i>
                <span>${escapeHtml(item)}</span>
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function renderChecklistCard(title, chip, description, items, emptyText) {
    return `
      <article class="standalone-order-subcard">
        <div class="standalone-order-subcard-head">
          <strong>${escapeHtml(title)}</strong>
          <span class="standalone-order-chip">${escapeHtml(chip)}</span>
        </div>
        <div class="standalone-order-note-panel">
          <p>${escapeHtml(description)}</p>
        </div>
        ${renderChecklistItems(items, emptyText)}
      </article>
    `;
  }

  function renderExecutionItems(invoice) {
    const items = [
      {
        icon: "fa-solid fa-truck-ramp-box",
        title: invoice?.service_label || "Gói dịch vụ chuyển dọn",
        type: "Phạm vi dịch vụ",
        meta: [
          `Loại xe: ${invoice?.vehicle_label || "--"}`,
          `Khoảng cách: ${formatDistance(invoice?.distance_km)}`,
          `Tạm tính: ${formatCurrency(invoice?.estimated_amount)}`,
        ],
        note:
          invoice?.summary ||
          "Hệ thống đang dùng tổ hợp dịch vụ, loại xe và cự ly hiện tại để giữ phương án triển khai ban đầu.",
      },
      {
        icon: "fa-solid fa-calendar-check",
        title: invoice?.schedule_label || "Lịch triển khai đang chờ xác nhận",
        type: "Lịch và điều phối",
        meta: [
          `Ngày: ${invoice?.schedule_date || "--"}`,
          `Khung giờ: ${invoice?.schedule_time || "--"}`,
          `Thời tiết: ${getWeatherLabel(invoice?.weather_label)}`,
        ],
        note:
          invoice?.status_text === "Đã xác nhận"
            ? "Lịch triển khai đã được điều phối khóa ở trạng thái hiện tại và sẵn sàng cho bước vận hành."
            : "Lịch dự kiến vẫn có thể được rà lại khi điều phối xác nhận khối lượng, điểm đỗ xe và điều kiện tiếp cận thực tế.",
      },
      {
        icon: "fa-solid fa-helmet-safety",
        title: invoice?.access_conditions?.length
          ? "Điều kiện tiếp cận đã ghi nhận"
          : "Chưa có điều kiện tiếp cận đặc biệt",
        type: "Hiện trường",
        meta: [
          `${Array.isArray(invoice?.access_conditions) ? invoice.access_conditions.length : 0} điều kiện`,
          getSurveyRequirementLabel(invoice),
          invoice?.company_name ? `Đơn vị: ${invoice.company_name}` : "Đơn vị: Khách cá nhân",
        ],
        note:
          Array.isArray(invoice?.access_conditions) && invoice.access_conditions.length
            ? invoice.access_conditions.join(". ")
            : "Khách hàng chưa đánh dấu thêm các trở ngại tiếp cận như đường cấm tải, cầu thang hẹp hay vị trí đỗ xe xa.",
      },
      {
        icon: "fa-solid fa-box-open",
        title: Array.isArray(invoice?.service_details) && invoice.service_details.length
          ? "Hạng mục phụ và yêu cầu đi kèm"
          : "Chưa có hạng mục phụ bổ sung",
        type: "Dịch vụ đi kèm",
        meta: [
          `${Array.isArray(invoice?.service_details) ? invoice.service_details.length : 0} hạng mục`,
          `Khảo sát: ${getSurveyRequirementLabel(invoice)}`,
          `Tệp gửi kèm: ${getAttachmentCount(invoice)}`,
        ],
        note:
          Array.isArray(invoice?.service_details) && invoice.service_details.length
            ? invoice.service_details.join(". ")
            : "Hiện chưa có dịch vụ cộng thêm như đóng gói, tháo lắp, bảo mật hồ sơ hay xử lý đồ cồng kềnh.",
      },
    ].filter(Boolean);

    if (!items.length) {
      return '<div class="standalone-order-note-panel"><p>Chưa có dữ liệu phạm vi triển khai để hiển thị.</p></div>';
    }

    return `
      <div class="standalone-order-items">
        ${items
          .map(
            (item, index) => `
              <article class="standalone-order-item">
                <div class="standalone-order-item-icon">
                  <i class="${escapeHtml(item.icon)}"></i>
                </div>
                <div class="standalone-order-item-body">
                  <div class="standalone-order-item-top">
                    <div class="standalone-order-item-heading">
                      <span class="standalone-order-item-seq">Hạng mục ${String(index + 1).padStart(2, "0")}</span>
                      <strong>${escapeHtml(item.title || "--")}</strong>
                      <div class="standalone-order-muted">${escapeHtml(item.type || "Triển khai")}</div>
                    </div>
                    <div class="standalone-order-item-meta">
                      ${(Array.isArray(item.meta) ? item.meta : [])
                        .filter(Boolean)
                        .map((meta) => `<span>${escapeHtml(meta)}</span>`)
                        .join("")}
                    </div>
                  </div>
                  <div class="standalone-order-item-note">
                    ${escapeHtml(item.note || "Chưa có mô tả bổ sung cho hạng mục này.")}
                  </div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderFeedbackBlock(invoice) {
    const feedbackMeta = getFeedbackMeta(invoice);
    const canSubmit = getStatusTone(invoice?.status_class) === "completed";

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Phản hồi khách hàng</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Tóm tắt phản hồi</strong>
              ${
                feedbackMeta.rating > 0
                  ? renderRatingStars(feedbackMeta.rating)
                  : '<span class="standalone-order-chip">Chưa có sao</span>'
              }
            </div>
            <p class="standalone-order-note-text">${escapeHtml(
              feedbackMeta.feedback || "Chưa có phản hồi từ khách hàng cho đơn hàng này.",
            )}</p>
            <div class="standalone-order-note-panel">
              <p>Phản hồi hình ảnh hoặc video sẽ hiển thị tại đây khi khách hàng gửi sau khi đơn hoàn tất.</p>
            </div>
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác phản hồi</strong>
              <span class="standalone-order-chip">Khách hàng</span>
            </div>
            <div class="standalone-order-note-panel">
              <p>${escapeHtml(
                canSubmit
                  ? "Luồng gửi phản hồi khách hàng sẽ được mở ở bước tiếp theo khi trang phản hồi hoàn thiện."
                  : "Chỉ có thể gửi phản hồi khi đơn hàng đã hoàn thành.",
              )}</p>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderProviderNoteBlock(invoice) {
    const providerMeta = getProviderNoteMeta(invoice);

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Ghi chú nhà cung cấp</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú hiện có</strong>
              <span class="standalone-order-chip">Chỉ xem</span>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(
              providerMeta.note || "Nhà cung cấp chưa cập nhật ghi chú xử lý cho đơn hàng này.",
            )}</p>
            <div class="standalone-order-note-panel">
              <p>Ảnh hoặc video báo cáo từ nhà cung cấp sẽ hiển thị tại đây khi luồng cập nhật hiện trường được nối vào trang chi tiết.</p>
            </div>
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác ghi chú</strong>
              <span class="standalone-order-chip">Bị khóa</span>
            </div>
            <div class="standalone-order-note-panel">
              <p>Khối này dành cho nhà cung cấp. Trên trang khách hàng chỉ hiển thị ở chế độ theo dõi.</p>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderCoordinationCard(invoice, profile) {
    const customerName =
      invoice?.contact_name || store.getDisplayName(profile) || "Khách hàng";
    const customerContact = [
      customerName,
      invoice?.contact_phone || profile?.phone || "--",
    ]
      .filter(Boolean)
      .join(" · ");

    return `
      <article class="standalone-order-provider-card standalone-order-provider-card--moving">
        <div class="standalone-order-provider-head">
          <div class="standalone-order-provider-avatar">CD</div>
          <div>
            <strong>Điều phối chuyển dọn</strong>
            <span>${escapeHtml(customerContact)}</span>
            <span>${escapeHtml(invoice?.schedule_label || "Đang chờ xác nhận khung triển khai")}</span>
          </div>
        </div>
        <div class="standalone-order-provider-pills">
          <span>Trạng thái: ${escapeHtml(invoice?.status_text || "Mới tiếp nhận")}</span>
          <span>Loại xe: ${escapeHtml(invoice?.vehicle_label || "--")}</span>
          <span>Mã hệ thống: ${escapeHtml(invoice?.remote_id || "--")}</span>
          <span>Nguồn dữ liệu: ${escapeHtml(getSourceLabel(invoice))}</span>
        </div>
      </article>
    `;
  }

  function getNextStepItems(invoice) {
    const statusTone = getStatusTone(invoice?.status_class);
    if (statusTone === "completed") {
      return [
        "Giữ liên lạc với đầu mối hiện tại để xác nhận lại mốc triển khai và các thay đổi cuối.",
        "Rà lại danh sách hạng mục phụ, vật tư đóng gói và điều kiện tiếp cận trước giờ thực hiện.",
        "Chuẩn bị sẵn các giấy tờ hoặc khu vực cần ưu tiên bàn giao khi đội triển khai đến nơi.",
      ];
    }

    if (statusTone === "shipping") {
      return [
        "Điều phối sẽ rà lại tuyến đường, điểm đỗ xe và phương án xe phù hợp với hiện trường.",
        "Khách hàng nên giữ điện thoại đầu mối sẵn sàng để xác nhận các phát sinh về giờ hoặc lối tiếp cận.",
        "Nếu có thay đổi về địa chỉ, khung giờ hoặc hạng mục phụ, nên cập nhật sớm để khóa lại phương án chính xác.",
      ];
    }

    if (statusTone === "cancelled") {
      return [
        "Yêu cầu này đang ở trạng thái đã hủy nên hệ thống không tiếp tục điều phối triển khai.",
        "Nếu vẫn cần sử dụng dịch vụ, khách hàng nên tạo yêu cầu mới để phát sinh mã theo dõi riêng.",
      ];
    }

    return [
      "Hệ thống đã lưu yêu cầu và đang chờ điều phối xác minh khối lượng, tuyến đường và điều kiện tiếp cận.",
      "Khách hàng nên rà lại ảnh hiện trường, điểm đỗ xe và ghi chú đặc biệt để tránh phát sinh khi gọi xác nhận.",
      "Sau khi điều phối chốt phương án xe và lịch, trang này sẽ phản ánh lại trạng thái và mốc triển khai mới nhất.",
    ];
  }

  function getPreparationChecklist(invoice) {
    const checklist = [
      "Giữ điện thoại đầu mối luôn khả dụng trước giờ điều phối gọi xác nhận.",
      "Chuẩn bị lối ra vào, thang máy hoặc vị trí đỗ xe để đội triển khai tiếp cận nhanh hơn.",
      "Tách riêng giấy tờ, tài sản giá trị cao và đồ dễ vỡ để điều phối nắm trước.",
    ];

    if (getSurveyRequirementLabel(invoice) === "Cần khảo sát trước") {
      checklist.push("Sắp xếp người phụ trách hiện trường để hỗ trợ buổi khảo sát trước khi chốt phương án.");
    } else {
      checklist.push("Nếu hiện trường thay đổi so với lúc tạo đơn, hãy cập nhật sớm để hệ thống khóa lại phương án xe.");
    }

    if (Array.isArray(invoice?.service_details) && invoice.service_details.length) {
      checklist.push("Đối chiếu lại các hạng mục phụ đã chọn để tránh thiếu vật tư hoặc nhân sự khi triển khai.");
    }

    return checklist;
  }

  function renderFormRows(rows) {
    const list = Array.isArray(rows)
      ? rows.filter((item) => item && item.value)
      : [];
    if (!list.length) {
      return `
        <article class="standalone-order-subcard">
          <div class="standalone-order-subcard-head">
            <strong>Biểu mẫu gốc đã lưu</strong>
            <span class="standalone-order-chip">Chưa có dữ liệu</span>
          </div>
          <div class="standalone-order-note-panel">
            <p>Chưa có dữ liệu biểu mẫu gốc để đối chiếu.</p>
          </div>
        </article>
      `;
    }

    const midpoint = Math.ceil(list.length / 2);
    const groups = [list.slice(0, midpoint), list.slice(midpoint)].filter(
      (group) => group.length,
    );

    return `
      <div class="standalone-order-side-stack standalone-order-review-layout">
        ${groups
          .map(
            (group, index) => `
              <article class="standalone-order-subcard">
                <div class="standalone-order-subcard-head">
                  <strong>${escapeHtml(index === 0 ? "Biểu mẫu gốc đã lưu" : "Thông tin biểu mẫu bổ sung")}</strong>
                  <span class="standalone-order-chip">${escapeHtml(String(group.length))} trường</span>
                </div>
                <div class="standalone-order-info-list">
                  ${group
                    .map((item) =>
                      renderInfoRow(
                        item.label || item.key || "--",
                        item.value || "--",
                      ),
                    )
                    .join("")}
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderPricingRows(invoice) {
    const breakdown = Array.isArray(invoice?.pricing_breakdown)
      ? invoice.pricing_breakdown.filter(Boolean)
      : [];

    if (!breakdown.length) {
      return [
        renderInfoRow(
          "Dịch vụ chuyển dọn",
          formatCurrency(invoice?.estimated_amount),
        ),
        renderInfoRow(
          "Khoảng cách tham chiếu",
          formatDistance(invoice?.distance_km),
        ),
        renderInfoRow("Loại xe", invoice?.vehicle_label || "--"),
        renderInfoRow(
          "Tổng tạm tính",
          formatCurrency(invoice?.estimated_amount),
          {
            valueHtml: true,
            valueTag: "div",
          },
        ),
      ].join("");
    }

    const rows = breakdown.map((item, index) =>
      renderInfoRow(
        item.label || `Hạng mục ${index + 1}`,
        item.amount || formatCurrency(item.amount_value || 0),
      ),
    );

    const hasTotal = breakdown.some((item) => item.is_total);
    if (!hasTotal) {
      rows.push(
        renderInfoRow(
          "Tổng tạm tính",
          formatCurrency(invoice?.estimated_amount),
          {
            valueHtml: true,
            valueTag: "div",
          },
        ),
      );
    }

    return rows.join("");
  }

  function buildTimeline(invoice) {
    const entries = [
      {
        time: invoice?.created_at,
        title: "Yêu cầu đã ghi nhận",
        note: "Biểu mẫu đặt lịch đã được lưu và gắn với hồ sơ khách hàng hiện tại.",
      },
    ];

    if (invoice?.schedule_label) {
      entries.push({
        time: invoice.schedule_label,
        title: "Khung triển khai dự kiến",
        note: `Lịch dự kiến hiện đang giữ theo mốc ${invoice.schedule_label}.`,
      });
    }

    if (invoice?.status_class === "xac-nhan") {
      entries.push({
        time: "Đã xác nhận",
        title: "Phương án đã xác nhận",
        note: "Điều phối đã chốt lịch, loại xe và phạm vi công việc cho yêu cầu này.",
      });
    } else if (invoice?.status_class === "dang-xu-ly") {
      entries.push({
        time: "Đang xử lý",
        title: "Điều phối đang rà soát",
        note: "Hệ thống đang rà tuyến đường, điều kiện tiếp cận và phương án xe phù hợp.",
      });
    } else {
      entries.push({
        time: "Mới tiếp nhận",
        title: "Chờ điều phối gọi lại",
        note: "Đội vận hành sẽ xác nhận thêm khối lượng và các phát sinh thực tế trước khi chốt phương án.",
      });
    }

    return entries;
  }

  function renderTimeline(entries) {
    const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if (!list.length) {
      return '<div class="standalone-order-note-panel"><p>Chưa có nhật ký xử lý cho yêu cầu này.</p></div>';
    }

    return `
      <div class="standalone-order-timeline">
        ${list
          .map(
            (item, index) => `
              <article class="standalone-order-timeline-item">
                <div class="standalone-order-timeline-dot ${index === list.length - 1 ? "is-active" : ""}"></div>
                <div class="standalone-order-timeline-content">
                  <small>${escapeHtml(item.time ? (formatDateTime(item.time) !== "--" ? formatDateTime(item.time) : item.time) : "--")}</small>
                  <strong>${escapeHtml(item.title || "--")}</strong>
                  <p>${escapeHtml(item.note || "Không có ghi chú bổ sung.")}</p>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderEmptyState(message) {
    root.innerHTML = `
      <div class="standalone-order-empty">
        <div>
          <i class="fa-solid fa-file-invoice-dollar"></i>
          <h2>Không tìm thấy hóa đơn phù hợp</h2>
          <p>${escapeHtml(
            message ||
              "Mã yêu cầu không hợp lệ, không thuộc tài khoản hiện tại hoặc dữ liệu đặt lịch chưa có trong nguồn đang dùng.",
          )}</p>
          <div class="standalone-order-inline-actions" style="justify-content:center; margin-top:18px;">
            <a class="customer-btn customer-btn-primary" href="${escapeHtml(
              getProjectUrl("khach-hang/lich-su-yeu-cau.html"),
            )}">Quay lại lịch sử</a>
            <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
              getProjectUrl("dat-lich.html"),
            )}">Tạo yêu cầu mới</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderInvoice(data) {
    const role = store.getSavedRole();
    if (!role || role !== "khach-hang") {
      redirectToLogin();
      return;
    }

    if (!data?.profile) {
      store.clearAuthSession?.();
      redirectToLogin();
      return;
    }

    const invoice = data?.invoice || null;
    const profile = data.profile;
    if (!invoice) {
      renderEmptyState();
      return;
    }

    const progressMeta = getProgressMeta(invoice);
    const timeline = buildTimeline(invoice);
    const mainLogo = escapeHtml(
      getProjectUrl("public/assets/images/logo-dich-vu-quanh-ta.png"),
    );
    const brandLogo = escapeHtml(
      getProjectUrl("public/assets/images/favicon.png"),
    );

    root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <div class="standalone-order-topbar">
            <div class="standalone-order-topbar-logo">
              <img src="${mainLogo}" alt="Logo Dịch Vụ Quanh Ta" />
            </div>
            <div class="standalone-order-topbar-center">
              <h2 class="standalone-order-topbar-title">Chi tiết đơn hàng</h2>
              <div class="standalone-order-topbar-meta">
                <span><i class="fa-solid fa-file-invoice-dollar"></i> ${escapeHtml(invoice.code || "--")}</span>
                <span><i class="fa-solid fa-truck-fast"></i> ${escapeHtml(invoice.status_text || "Mới tiếp nhận")}</span>
                <span><i class="fa-solid fa-clock"></i> ${escapeHtml(formatDateTime(invoice.created_at))}</span>
              </div>
            </div>
            <div class="standalone-order-topbar-logo">
              <img src="${brandLogo}" alt="Logo Dịch vụ Chuyển Dọn" />
            </div>
          </div>

          <header class="standalone-order-card-header">
            <div class="standalone-order-header-main-content">
              <div class="standalone-order-hero-top-row">
                <div class="standalone-order-card-title">
                  <p class="standalone-order-card-kicker">Mã yêu cầu nội bộ</p>
                  <h1>${escapeHtml(invoice.code || "Chi tiết đơn hàng")}</h1>
                  <p class="standalone-order-card-subtitle">${escapeHtml(invoice.service_label || "Dịch vụ Chuyển Dọn")}</p>
                </div>

                <div class="standalone-order-hero-side-progress">
                  <div class="standalone-order-progress-ring status-${escapeHtml(
                    progressMeta.tone,
                  )}" style="--progress:${escapeHtml(String(progressMeta.percent))}%;">
                    <div class="standalone-order-progress-ring-core">
                      <strong>${escapeHtml(String(progressMeta.percent))}%</strong>
                      <span>Tiến độ</span>
                    </div>
                  </div>
                  <div class="standalone-order-progress-info">
                    <span class="standalone-order-progress-label">${escapeHtml(progressMeta.label)}</span>
                    <p>${escapeHtml(progressMeta.note)}</p>
                  </div>
                </div>
              </div>

              <div class="standalone-order-hero-metrics">
                ${renderHeroMetric(
                  "fa-solid fa-wallet",
                  "Tổng tạm tính",
                  formatCurrency(invoice.estimated_amount),
                  invoice.vehicle_label || "Chưa chốt loại xe",
                )}
                ${renderHeroMetric(
                  "fa-solid fa-calendar-check",
                  "Lịch triển khai",
                  invoice.schedule_label || "Chờ xác nhận",
                  invoice.schedule_time || "Khung giờ triển khai",
                )}
                ${renderHeroMetric(
                  "fa-solid fa-location-dot",
                  "Lộ trình",
                  invoice.to_address || "Chưa có điểm đến",
                  invoice.from_address || "Chưa có điểm đi",
                )}
              </div>
            </div>

            <div class="standalone-order-header-footer-row">
              <div class="standalone-order-header-status-badge">
                ${renderStatusBadge(invoice.status_class, invoice.status_text)}
              </div>
              <div class="standalone-order-actions-group">
                ${
                  canCancelInvoice(invoice)
                    ? '<button type="button" class="customer-btn customer-btn-danger" data-invoice-cancel>Hủy đơn</button>'
                    : ""
                }
                <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                  getProjectUrl("khach-hang/lich-su-yeu-cau.html"),
                )}">Về lịch sử đơn</a>
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Tổng quan</p>
                <h2>Tổng quan đơn hàng và tạm tính</h2>
                <p>Khối này giữ những dữ liệu cần rà nhanh trước khi chốt phương án triển khai chuyển dọn.</p>
              </div>
              <div class="standalone-order-overview-stats">
                ${renderOverviewStat(
                  "fa-solid fa-location-dot",
                  "Điểm đi",
                  invoice.from_address || "--",
                  invoice.contact_name || store.getDisplayName(profile),
                )}
                ${renderOverviewStat(
                  "fa-solid fa-flag-checkered",
                  "Điểm đến",
                  invoice.to_address || "--",
                  invoice.schedule_label || "Chưa chốt lịch",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-wallet",
                  "Tạm tính",
                  formatCurrency(invoice.estimated_amount),
                  invoice.vehicle_label || "Chưa chốt loại xe",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-clock-rotate-left",
                  "Cập nhật hiện tại",
                  invoice.status_text || "--",
                  progressMeta.note,
                )}
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel standalone-order-panel-overview">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Thông tin điều phối</strong>
                      <p>Đối chiếu mã yêu cầu, tuyến triển khai, thời gian và dữ liệu vận hành lõi của đơn.</p>
                    </div>
                    <span class="standalone-order-chip">Lộ trình</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Mã yêu cầu", invoice.code || "--")}
                    ${renderInfoRow("Mã hệ thống", invoice.remote_id || "--")}
                    ${renderInfoRow("Gói dịch vụ", invoice.service_label || "--")}
                    ${renderInfoRow("Điểm đi", invoice.from_address || "--")}
                    ${renderInfoRow("Điểm đến", invoice.to_address || "--")}
                    ${renderInfoRow("Ngày thực hiện", invoice.schedule_date || "--")}
                    ${renderInfoRow("Khung giờ", invoice.schedule_time || "--")}
                    ${renderInfoRow("Khoảng cách", formatDistance(invoice.distance_km))}
                  </div>
                </div>
                <div class="standalone-order-panel standalone-order-panel-fees" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Tóm tắt tạm tính</strong>
                      <p>Hiển thị mức phí tham chiếu hiện tại, các hạng mục cộng thêm và số liệu dùng để đối chiếu lại với điều phối.</p>
                    </div>
                    <span class="standalone-order-chip">Tài chính</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderPricingRows(invoice)}
                  </div>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Liên hệ</p>
                <h2>Liên hệ, lộ trình và lưu ý triển khai</h2>
                <p>Nhóm thông tin này tương ứng với vùng người gửi, người nhận và ghi chú ở các dịch vụ khác.</p>
              </div>
              <div class="standalone-order-contact-grid">
                <article class="standalone-order-contact-card">
                  <div class="standalone-order-contact-card-head">
                    <div class="standalone-order-contact-card-title">
                      <span class="standalone-order-contact-card-icon">
                        <i class="fa-solid fa-location-dot"></i>
                      </span>
                      <div>
                        <strong>Lộ trình và phương án triển khai</strong>
                        <p>Đối chiếu tuyến đi, tuyến đến, loại xe và mốc triển khai mà điều phối đang dùng.</p>
                      </div>
                    </div>
                    <span class="standalone-order-chip">${escapeHtml(invoice.service_label || "Chuyển dọn")}</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Điểm đi", invoice.from_address || "--")}
                    ${renderInfoRow("Điểm đến", invoice.to_address || "--")}
                    ${renderInfoRow("Loại xe", invoice.vehicle_label || "--")}
                    ${renderInfoRow("Lịch triển khai", invoice.schedule_label || "--")}
                    ${renderInfoRow("Thời tiết", getWeatherLabel(invoice.weather_label))}
                  </div>
                </article>

                <article class="standalone-order-contact-card">
                  <div class="standalone-order-contact-card-head">
                    <div class="standalone-order-contact-card-title">
                      <span class="standalone-order-contact-card-icon">
                        <i class="fa-solid fa-address-card"></i>
                      </span>
                      <div>
                        <strong>Thông tin liên hệ</strong>
                        <p>Đây là đầu mối điều phối sẽ dùng khi xác nhận lại khối lượng, giờ triển khai và phát sinh thực tế.</p>
                      </div>
                    </div>
                    <span class="standalone-order-chip">${escapeHtml(invoice.status_text || "Mới tiếp nhận")}</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Khách hàng", invoice.contact_name || store.getDisplayName(profile))}
                    ${renderInfoRow("Số điện thoại", invoice.contact_phone || profile.phone || "--")}
                    ${renderInfoRow("Email", invoice.customer_email || profile.email || "--")}
                    ${renderInfoRow("Đơn vị", invoice.company_name || "--")}
                  </div>
                </article>

                <div class="standalone-order-contact-note">
                  <article class="standalone-order-contact-note-card">
                    <div class="standalone-order-contact-card-head">
                      <div class="standalone-order-contact-card-title">
                        <span class="standalone-order-contact-card-icon standalone-order-contact-card-icon-note">
                          <i class="fa-solid fa-triangle-exclamation"></i>
                        </span>
                        <div>
                          <strong>Lưu ý từ khách hàng</strong>
                          <p>Gom ghi chú, điều kiện hiện trường và những điểm cần lưu ý trước khi đội triển khai đến nơi.</p>
                        </div>
                      </div>
                      <span class="standalone-order-chip">Lưu ý</span>
                    </div>
                    <div class="standalone-order-note-panel standalone-order-contact-note-panel">
                      <p>${escapeHtml(invoice.note || invoice.meta || "Chưa có ghi chú bổ sung.")}</p>
                    </div>
                    <div class="standalone-order-side-stack standalone-order-review-layout">
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Điều kiện tiếp cận</strong>
                          <span class="standalone-order-chip">${escapeHtml(String((invoice.access_conditions || []).length))} mục</span>
                        </div>
                        ${renderChipList(
                          invoice.access_conditions,
                          "Chưa có điều kiện tiếp cận đặc biệt được ghi nhận.",
                        )}
                      </article>
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Chi tiết dịch vụ</strong>
                          <span class="standalone-order-chip">${escapeHtml(String((invoice.service_details || []).length))} mục</span>
                        </div>
                        ${renderChipList(
                          invoice.service_details,
                          "Chưa có hạng mục phụ nào được chọn thêm.",
                        )}
                      </article>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Phạm vi</p>
                <h2>Khối lượng công việc và phạm vi triển khai</h2>
                <p>Khối này đóng vai trò tương đương phần kiện hàng của giao hàng, nhưng được diễn giải theo nghiệp vụ chuyển dọn.</p>
              </div>
              <div class="standalone-order-overview-stats standalone-order-overview-stats-compact">
                ${renderOverviewStat(
                  "fa-solid fa-layer-group",
                  "Hạng mục phụ",
                  String((invoice.service_details || []).length),
                  "Số lựa chọn cộng thêm hiện đang gắn với yêu cầu",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-helmet-safety",
                  "Tiếp cận",
                  String((invoice.access_conditions || []).length),
                  "Số điều kiện hiện trường đã được khách hàng đánh dấu",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-paperclip",
                  "Tệp gửi kèm",
                  String(getAttachmentCount(invoice)),
                  "Ảnh và video hiện trường mà khách đã gửi kèm",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-clipboard-list",
                  "Khảo sát",
                  getSurveyRequirementLabel(invoice),
                  "Cờ khảo sát trước dùng để điều phối khóa phương án triển khai",
                )}
              </div>
              ${renderExecutionItems(invoice)}
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Điều phối</p>
                <h2>Điều phối, trạng thái xử lý và tài liệu hiện trường</h2>
                <p>Giữ đúng nhịp vùng thứ tư như bên giao hàng: thẻ điều phối ở trái, timeline và media ở phải.</p>
              </div>
              <div class="standalone-order-provider-shell">
                ${renderCoordinationCard(invoice, profile)}
                <div class="standalone-order-provider-grid">
                  <article class="standalone-order-timeline-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Timeline trạng thái</strong>
                        <p>Theo dõi các mốc đã ghi nhận từ lúc tạo đơn đến khi điều phối chốt phương án triển khai.</p>
                      </div>
                      <span class="standalone-order-chip">Theo dõi</span>
                    </div>
                    ${renderTimeline(timeline)}
                  </article>
                  <article class="standalone-order-media-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Tài liệu hiện trường</strong>
                        <p>Giữ vai trò tương đương vùng POD của giao hàng, nhưng dùng cho ảnh và video mặt bằng khách đã gửi.</p>
                      </div>
                      <span class="standalone-order-chip">Media</span>
                    </div>
                    ${renderAttachmentGallery(invoice)}
                  </article>
                </div>
              </div>
            </section>

            ${renderFeedbackBlock(invoice)}
            ${renderProviderNoteBlock(invoice)}
          </div>
        </section>
      </div>
    `;

    root
      .querySelector("[data-invoice-cancel]")
      ?.addEventListener("click", async function () {
        if (!window.confirm("Bạn có chắc muốn hủy yêu cầu này không?")) {
          return;
        }

        try {
          const result = await store.cancelBooking?.(invoice.code || "");
          renderInvoice(result || null);
        } catch (error) {
          window.alert(
            error?.message || "Không thể hủy yêu cầu ở thời điểm hiện tại.",
          );
        }
      });
  }

  (async function bootstrapInvoiceDetail() {
    const code = getQueryCode();
    if (!code) {
      renderEmptyState("Thiếu mã yêu cầu để tải chi tiết hóa đơn.");
      return;
    }

    try {
      const result = await store.fetchBookingInvoiceDetail?.(code);
      renderInvoice(result || null);
    } catch (error) {
      console.error("Cannot load booking invoice detail:", error);
      renderEmptyState("Không thể tải dữ liệu hóa đơn từ nguồn hiện tại.");
    }
  })();
})(window, document);
