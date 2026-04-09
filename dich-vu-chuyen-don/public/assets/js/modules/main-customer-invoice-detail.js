import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const customerInvoiceDetailModule = (function (window, document) {
  if (window.__fastGoCustomerInvoiceDetailLoaded) return window.__fastGoCustomerInvoiceDetailModule || null;
  window.__fastGoCustomerInvoiceDetailLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-invoice-detail") {
    return;
  }

  const root = document.getElementById("customer-invoice-detail-root");
  if (!root || !store) return;
  let inlineFeedbackTimer = 0;

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
    window.location.href = core.getSharedLoginUrl({
      redirect: getCurrentTargetUrl(),
    });
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

  function renderHeroMetric(icon, label, value, hint, options = {}) {
    const safeValue = options.valueHtml ? value || "--" : escapeHtml(value || "--");
    const safeHint = options.hintHtml ? hint || "--" : escapeHtml(hint || "--");
    const className = normalizeText(options.className || "");

    return `
      <article class="standalone-order-hero-metric ${escapeHtml(className)}">
        <div class="standalone-order-hero-metric-icon">
          <i class="${escapeHtml(icon)}"></i>
        </div>
        <div class="standalone-order-hero-metric-copy">
          <span>${escapeHtml(label)}</span>
          <strong>${safeValue}</strong>
          <small>${safeHint}</small>
        </div>
      </article>
    `;
  }

  function renderHeroRouteCard(invoice) {
    return `
      <article class="standalone-order-hero-metric standalone-order-hero-metric-route">
        <div class="standalone-order-hero-metric-copy">
          <span>Lộ trình thực hiện</span>
          <div class="standalone-order-hero-route-list">
            <div class="standalone-order-hero-route-item">
              <span class="standalone-order-hero-route-icon">
                <i class="fa-solid fa-location-dot"></i>
              </span>
              <div class="standalone-order-hero-route-copy">
                <small>Điểm đi</small>
                <strong>${escapeHtml(invoice?.from_address || "--")}</strong>
              </div>
            </div>
            <div class="standalone-order-hero-route-item">
              <span class="standalone-order-hero-route-icon">
                <i class="fa-solid fa-flag-checkered"></i>
              </span>
              <div class="standalone-order-hero-route-copy">
                <small>Điểm đến</small>
                <strong>${escapeHtml(invoice?.to_address || "--")}</strong>
              </div>
            </div>
          </div>
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

  function getAttachmentFileName(value) {
    const normalized = normalizeText(value);
    if (!normalized) return "";

    const sanitized = normalized.split("?")[0].split("#")[0];
    const segments = sanitized.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] || normalized;
  }

  function getAttachmentHref(value) {
    const normalized = normalizeText(value);
    if (!normalized) return "";

    if (/^(https?:)?\/\//i.test(normalized)) {
      return normalized;
    }

    if (
      normalized.startsWith("/") ||
      normalized.startsWith("./") ||
      normalized.startsWith("../")
    ) {
      return normalized;
    }

    return "";
  }

  async function copyText(value) {
    const normalized = String(value || "");
    if (!normalized) {
      throw new Error("Không có dữ liệu để sao chép.");
    }

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalized);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = normalized;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error("Trình duyệt hiện tại không hỗ trợ sao chép.");
    }
  }

  function showInlineFeedback(message, type = "success") {
    const feedbackNode = root.querySelector("#customer-invoice-feedback");
    if (!feedbackNode) return;

    feedbackNode.hidden = false;
    feedbackNode.className = `standalone-order-inline-feedback ${
      type === "error" ? "is-error" : "is-success"
    }`;
    feedbackNode.textContent = message;

    if (inlineFeedbackTimer) {
      window.clearTimeout(inlineFeedbackTimer);
    }

    inlineFeedbackTimer = window.setTimeout(() => {
      feedbackNode.hidden = true;
      feedbackNode.textContent = "";
    }, 2600);
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
            (item) => {
              const attachmentValue = normalizeText(item.value);
              const attachmentName =
                getAttachmentFileName(attachmentValue) || attachmentValue;
              const attachmentHref = getAttachmentHref(attachmentValue);

              return `
              <div class="standalone-order-media-item">
                <div class="standalone-order-item-icon">
                  <i class="${escapeHtml(
                    item.type === "video"
                      ? "fa-solid fa-video"
                      : "fa-solid fa-image",
                  )}"></i>
                </div>
                <strong>${escapeHtml(item.label)}</strong>
                <span class="standalone-order-media-value" title="${escapeHtml(
                  attachmentValue,
                )}">${escapeHtml(attachmentName)}</span>
                <div class="standalone-order-media-actions">
                  ${
                    attachmentHref
                      ? `<a class="customer-btn customer-btn-ghost customer-btn-sm" href="${escapeHtml(
                          attachmentHref,
                        )}" target="_blank" rel="noopener noreferrer">Mở tệp</a>`
                      : ""
                  }
                  <button type="button" class="customer-btn customer-btn-primary customer-btn-sm" data-copy-attachment="${escapeHtml(
                    attachmentValue,
                  )}">Sao chép</button>
                </div>
              </div>
            `;
            },
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

  function renderPricingRows(invoice) {
    const breakdown = Array.isArray(invoice?.pricing_breakdown)
      ? invoice.pricing_breakdown.filter(Boolean)
      : [];

    const getSortRank = (item) => {
      if (item?.is_total) return 999;

      const label = normalizeText(item?.label || "").toLowerCase();
      if (!label) return 80;
      if (/dich vu|goi|co ban|van chuyen/.test(label)) return 10;
      if (/khoang cach|so km|quang duong/.test(label)) return 20;
      if (/loai xe|xe tai|xe/.test(label)) return 30;
      if (/mua|thoi tiet/.test(label)) return 40;
      if (/cuoi tuan|thu bay|chu nhat/.test(label)) return 50;
      return 60;
    };

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
        renderInfoRow("Thời tiết", getWeatherLabel(invoice?.weather_label)),
      ].join("");
    }

    const rows = breakdown
      .map((item, index) => ({ ...item, index }))
      .sort((left, right) => {
        const rankDiff = getSortRank(left) - getSortRank(right);
        return rankDiff !== 0 ? rankDiff : left.index - right.index;
      })
      .filter((item) => !item.is_total)
      .map((item, index) =>
        renderInfoRow(
          item.label || `Hạng mục ${index + 1}`,
          item.amount || formatCurrency(item.amount_value || 0),
        ),
      );

    if (!rows.length) {
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
        renderInfoRow("Thời tiết", getWeatherLabel(invoice?.weather_label)),
      ].join("");
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

  function renderRatingStars(rating) {
    const safeRating = Number.isFinite(Number(rating))
      ? Math.min(5, Math.max(0, Math.round(Number(rating))))
      : 0;

    return `
      <span class="standalone-order-rating-stars" aria-label="${escapeHtml(
        `${safeRating}/5 sao`,
      )}">
        ${Array.from({ length: 5 }, (_, index) =>
          `<i class="${escapeHtml(
            index < safeRating ? "fa-solid fa-star" : "fa-regular fa-star",
          )}"></i>`,
        ).join("")}
      </span>
    `;
  }

  function renderProviderReportBlock(invoice) {
    const providerNote = normalizeText(invoice?.provider_note || "");

    return `
      <details class="standalone-order-fold">
        <summary class="standalone-order-fold-summary">
          <span>Báo cáo từ đơn vị thực hiện</span>
          <small>${escapeHtml(providerNote ? "Đã cập nhật" : "Chưa có cập nhật mới")}</small>
        </summary>
        <section class="standalone-order-block standalone-order-block-fold">
          <div class="standalone-order-side-stack standalone-order-review-layout">
            <article class="standalone-order-subcard">
              <div class="standalone-order-subcard-head">
                <strong>Nội dung báo cáo</strong>
                <span class="standalone-order-chip">${escapeHtml(
                  providerNote ? "Đã cập nhật" : "Chờ cập nhật",
                )}</span>
              </div>
              <p class="standalone-order-note-text">${escapeHtml(
                providerNote ||
                  "Đơn vị thực hiện chưa gửi báo cáo mới cho đơn hàng này.",
              )}</p>
            </article>
            <article class="standalone-order-subcard">
              <div class="standalone-order-subcard-head">
                <strong>Tài liệu đi kèm</strong>
                <span class="standalone-order-chip">${escapeHtml(
                  `${getAttachmentCount(invoice)} tệp`,
                )}</span>
              </div>
              <div class="standalone-order-note-panel">
                <p>
                  Ảnh và video đang có trên đơn sẽ được hiển thị tại mục
                  "Tài liệu hiện trường" để bạn tiện đối chiếu khi theo dõi báo
                  cáo.
                </p>
              </div>
              ${
                getAttachmentCount(invoice)
                  ? '<div class="standalone-order-inline-actions"><a class="customer-btn customer-btn-ghost customer-btn-sm" href="#customer-invoice-attachments">Xem tài liệu hiện trường</a></div>'
                  : ""
              }
            </article>
          </div>
        </section>
      </details>
    `;
  }

  function renderCustomerFeedbackBlock(invoice) {
    const feedback = normalizeText(invoice?.customer_feedback || "");
    const rating = Number(invoice?.customer_rating || 0);
    const safeRating = Number.isFinite(rating)
      ? Math.min(5, Math.max(0, Math.round(rating)))
      : 0;
    const canSubmit = getStatusTone(invoice?.status_class) === "completed";

    return `
      <details class="standalone-order-fold">
        <summary class="standalone-order-fold-summary">
          <span>Đánh giá và báo cáo của bạn</span>
          <small>${escapeHtml(
            safeRating > 0 ? `${safeRating}/5 sao` : canSubmit ? "Sẵn sàng để đánh giá" : "Chưa mở đánh giá",
          )}</small>
        </summary>
        <section class="standalone-order-block standalone-order-block-fold">
          <div class="standalone-order-side-stack standalone-order-review-layout">
            <article class="standalone-order-subcard">
              <div class="standalone-order-subcard-head">
                <strong>Phản hồi hiện tại</strong>
                <span class="standalone-order-chip">${escapeHtml(
                  safeRating > 0 ? `${safeRating}/5 sao` : "Chưa đánh giá",
                )}</span>
              </div>
              <div class="standalone-order-note-panel">
                <p>${renderRatingStars(safeRating)}</p>
              </div>
              <p class="standalone-order-note-text">${escapeHtml(
                feedback ||
                  "Bạn có thể để lại đánh giá chất lượng phục vụ hoặc báo cáo thêm vấn đề phát sinh tại đây.",
              )}</p>
            </article>
            <article class="standalone-order-subcard">
              <div class="standalone-order-subcard-head">
                <strong>Cập nhật phản hồi</strong>
                <span class="standalone-order-chip">${escapeHtml(
                  canSubmit ? "Khách hàng" : "Chưa mở",
                )}</span>
              </div>
              ${
                canSubmit
                  ? `
                    <form class="standalone-order-form" data-customer-feedback-form>
                      <label class="standalone-order-field">
                        <span>Mức đánh giá</span>
                        <select name="customer_rating">
                          <option value="0"${safeRating === 0 ? " selected" : ""}>Chưa chấm sao</option>
                          <option value="5"${safeRating === 5 ? " selected" : ""}>5 sao</option>
                          <option value="4"${safeRating === 4 ? " selected" : ""}>4 sao</option>
                          <option value="3"${safeRating === 3 ? " selected" : ""}>3 sao</option>
                          <option value="2"${safeRating === 2 ? " selected" : ""}>2 sao</option>
                          <option value="1"${safeRating === 1 ? " selected" : ""}>1 sao</option>
                        </select>
                      </label>
                      <label class="standalone-order-field">
                        <span>Đánh giá hoặc báo cáo thêm</span>
                        <textarea name="customer_feedback" rows="5" placeholder="Chia sẻ trải nghiệm, góp ý hoặc báo cáo phát sinh của đơn hàng này.">${escapeHtml(feedback)}</textarea>
                      </label>
                      <div class="standalone-order-inline-actions">
                        <button class="customer-btn customer-btn-primary" type="submit">Lưu đánh giá</button>
                      </div>
                    </form>
                  `
                  : `
                    <div class="standalone-order-note-panel">
                      <p>
                        Mục này sẽ mở sau khi đơn hàng đã hoàn thành. Trước thời điểm đó,
                        bạn chỉ theo dõi tiến độ và báo cáo từ đơn vị thực hiện.
                      </p>
                    </div>
                  `
              }
            </article>
          </div>
        </section>
      </details>
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
            )}">Quay lại danh sách đơn hàng</a>
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
    root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <header class="standalone-order-card-header">
            <div class="standalone-order-header-main-content">
              <div class="standalone-order-hero-top-row">
                <div class="standalone-order-card-title">
                  <p class="standalone-order-card-kicker">Chi tiết đơn hàng</p>
                  <h1>${escapeHtml(invoice.code || "Chi tiết đơn hàng")}</h1>
                  <p class="standalone-order-card-subtitle">${escapeHtml(invoice.service_label || "Dịch vụ Chuyển Dọn")}</p>
                  <div class="standalone-order-inline-meta">
                    <span><i class="fa-solid fa-clock"></i>${escapeHtml(formatDateTime(invoice.created_at))}</span>
                    <span><i class="fa-solid fa-box"></i>${escapeHtml(getSurveyRequirementLabel(invoice))}</span>
                    <span><i class="fa-solid fa-truck-front"></i>${escapeHtml(invoice.vehicle_label || "Chưa chốt loại xe")}</span>
                  </div>
                </div>

                <div class="standalone-order-hero-side-stack">
                  <div class="standalone-order-actions-group standalone-order-hero-actions-group">
                    ${
                      canCancelInvoice(invoice)
                        ? '<button type="button" class="customer-btn customer-btn-danger" data-invoice-cancel>Hủy đơn</button>'
                        : ""
                    }
                    <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                      getProjectUrl("khach-hang/lich-su-yeu-cau.html"),
                    )}">Về danh sách đơn hàng</a>
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
              </div>

              <div class="standalone-order-hero-metrics">
                ${renderHeroMetric(
                  "fa-solid fa-wallet",
                  "Tổng tạm tính",
                  formatCurrency(invoice.estimated_amount),
                  invoice.vehicle_label || "Chưa chốt loại xe",
                  { className: "standalone-order-hero-metric-primary" },
                )}
                ${renderHeroMetric(
                  "fa-solid fa-calendar-check",
                  "Ngày thực hiện",
                  invoice.schedule_date || invoice.schedule_label || "Chờ xác nhận",
                  invoice.schedule_time || "Khung giờ triển khai",
                )}
                ${renderHeroMetric(
                  "fa-solid fa-signal",
                  "Trạng thái đơn",
                  renderStatusBadge(invoice.status_class, invoice.status_text),
                  progressMeta.note,
                  {
                    className: "standalone-order-hero-metric-status",
                    valueHtml: true,
                  },
                )}
                ${renderHeroRouteCard(invoice)}
              </div>
            </div>
          </header>

          <div id="customer-invoice-feedback" class="standalone-order-inline-feedback" hidden></div>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <p class="standalone-order-block-kicker">Thông tin chính</p>
                <h2>Thông tin đơn hàng</h2>
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel standalone-order-panel-overview">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Chi tiết đơn</strong>
                      <p>Những thông tin cần kiểm tra nhanh trước khi thực hiện.</p>
                    </div>
                    <span class="standalone-order-chip">Đơn hàng</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Mã yêu cầu", invoice.code || "--")}
                    ${renderInfoRow("Ngày tạo", formatDateTime(invoice.created_at))}
                    ${renderInfoRow("Khoảng cách", formatDistance(invoice.distance_km))}
                    ${renderInfoRow("Khảo sát", getSurveyRequirementLabel(invoice))}
                    ${renderInfoRow("Tệp gửi kèm", String(getAttachmentCount(invoice)))}
                  </div>
                </div>
                <div class="standalone-order-panel standalone-order-panel-fees" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Chi tiết tạm tính</strong>
                      <p>Các khoản đang dùng để tính mức giá tham khảo hiện tại.</p>
                    </div>
                    <span class="standalone-order-chip">Tạm tính</span>
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
                <h2>Liên hệ và lưu ý</h2>
              </div>
              <div class="standalone-order-contact-grid">
                <article class="standalone-order-contact-card">
                  <div class="standalone-order-contact-card-head">
                    <div class="standalone-order-contact-card-title">
                      <span class="standalone-order-contact-card-icon">
                        <i class="fa-solid fa-address-card"></i>
                      </span>
                      <div>
                        <strong>Thông tin liên hệ</strong>
                        <p>Đầu mối hệ thống sẽ liên hệ khi cần xác nhận thêm.</p>
                      </div>
                    </div>
                    <span class="standalone-order-chip">Liên hệ</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Khách hàng", invoice.contact_name || store.getDisplayName(profile))}
                    ${renderInfoRow("Số điện thoại", invoice.contact_phone || profile.sodienthoai || "--")}
                    ${renderInfoRow("Email", invoice.customer_email || profile.email || "--")}
                    ${renderInfoRow("Đơn vị", invoice.company_name || "--")}
                  </div>
                </article>

                <article class="standalone-order-contact-card">
                  <div class="standalone-order-contact-card-head">
                    <div class="standalone-order-contact-card-title">
                      <span class="standalone-order-contact-card-icon">
                        <i class="fa-solid fa-truck-ramp-box"></i>
                      </span>
                      <div>
                        <strong>Chi tiết thực hiện</strong>
                        <p>Thông tin đang dùng để chuẩn bị phương án phục vụ.</p>
                      </div>
                    </div>
                    <span class="standalone-order-chip">${escapeHtml(invoice.service_label || "Chuyển dọn")}</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Khung giờ", invoice.schedule_time || "--")}
                    ${renderInfoRow("Thời tiết", getWeatherLabel(invoice.weather_label))}
                    ${renderInfoRow("Loại xe", invoice.vehicle_label || "--")}
                    ${renderInfoRow("Điều kiện tiếp cận", String((invoice.access_conditions || []).length))}
                    ${renderInfoRow("Dịch vụ đi kèm", String((invoice.service_details || []).length))}
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
                          <strong>Lưu ý của bạn</strong>
                          <p>Những ghi chú đã gửi kèm theo đơn hàng.</p>
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
                        </div>
                        ${renderChipList(
                          invoice.access_conditions,
                          "Chưa có điều kiện tiếp cận đặc biệt được ghi nhận.",
                        )}
                      </article>
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Dịch vụ đi kèm</strong>
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
                <p class="standalone-order-block-kicker">Theo dõi</p>
                <h2>Tiến độ và tài liệu hiện trường</h2>
              </div>
              <div class="standalone-order-summary-grid">
                <article class="standalone-order-timeline-card">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Tiến độ xử lý</strong>
                      <p>Các mốc chính của đơn hàng từ lúc tạo đến khi hoàn tất.</p>
                    </div>
                    <span class="standalone-order-chip">Tiến độ</span>
                  </div>
                  ${renderTimeline(timeline)}
                </article>
                <article class="standalone-order-media-card" id="customer-invoice-attachments">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Tài liệu hiện trường</strong>
                      <p>Ảnh và video bạn đã gửi kèm khi tạo đơn.</p>
                    </div>
                    <span class="standalone-order-chip">Tệp đính kèm</span>
                  </div>
                  ${renderAttachmentGallery(invoice)}
                </article>
              </div>
            </section>

            ${renderProviderReportBlock(invoice)}
            ${renderCustomerFeedbackBlock(invoice)}
          </div>

          <div class="standalone-order-mobile-bar" aria-label="Thao tác nhanh">
            <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
              getProjectUrl("khach-hang/lich-su-yeu-cau.html"),
            )}">Danh sách đơn hàng</a>
            ${
              canCancelInvoice(invoice)
                ? '<button type="button" class="customer-btn customer-btn-primary" data-invoice-cancel-mobile>Hủy đơn</button>'
                : `<a class="customer-btn customer-btn-primary" href="${escapeHtml(
                    getProjectUrl("dat-lich.html"),
                  )}">Tạo yêu cầu mới</a>`
            }
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

    root
      .querySelector("[data-invoice-cancel-mobile]")
      ?.addEventListener("click", async function () {
        root.querySelector("[data-invoice-cancel]")?.click();
      });

    root
      .querySelector("[data-customer-feedback-form]")
      ?.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
          const formData = new FormData(event.currentTarget);
          const result = await store.saveBookingFeedback?.(invoice.code || "", {
            customer_rating: formData.get("customer_rating") || 0,
            customer_feedback: formData.get("customer_feedback") || "",
          });
          renderInvoice(result || null);
        } catch (error) {
          window.alert(
            error?.message || "Không thể lưu đánh giá ở thời điểm hiện tại.",
          );
        }
      });

    root.querySelectorAll("[data-copy-attachment]").forEach((button) => {
      button.addEventListener("click", async function () {
        const attachmentValue =
          button.getAttribute("data-copy-attachment") || "";

        try {
          await copyText(attachmentValue);
          showInlineFeedback("Đã sao chép thông tin tệp đính kèm.");
        } catch (error) {
          showInlineFeedback(
            error?.message || "Không thể sao chép thông tin tệp hiện tại.",
            "error",
          );
        }
      });
    });
  }

  (async function bootstrapInvoiceDetail() {
    const auth = core.getOrderDetailAccessCredentials?.() || core.getUrlAuthCredentials?.() || {
      username: "",
      password: "",
    };
    await store.autoAuthFromUrlCredentials?.(auth);

    const orderCode = core.getOrderIdentifierFromUrl?.() || "";
    if (!orderCode) {
      renderEmptyState("Thiếu mã yêu cầu để tải chi tiết hóa đơn.");
      return;
    }

    core.syncOrderDetailUrl?.({
      orderCode,
      path: window.location.pathname,
      username: auth.username,
      password: auth.password,
    });

    try {
      const result = await store.fetchBookingInvoiceDetail?.(orderCode);
      renderInvoice(result || null);
    } catch (error) {
      console.error("Cannot load booking invoice detail:", error);
      renderEmptyState("Không thể tải dữ liệu hóa đơn từ nguồn hiện tại.");
    }
  })();
  const moduleApi = {};
  window.__fastGoCustomerInvoiceDetailModule = moduleApi;
  return moduleApi;
})(window, document);

export default customerInvoiceDetailModule;


