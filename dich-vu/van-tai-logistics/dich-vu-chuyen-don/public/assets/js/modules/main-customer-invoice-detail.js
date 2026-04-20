import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";
import { validateCustomerCancelBooking } from "./main-booking-actions.js";
import {
  formatBookingDateOnly,
  getRenderableBookingPricingRows,
  getBookingScheduleTimeLabel,
} from "./main-booking-shared.js";

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
  const DEFAULT_CANCEL_REASON =
    "Khách hàng chủ động hủy yêu cầu chuyển dọn.";
  let cancelConfirmState = createInitialCancelConfirmState();

  function createInitialCancelConfirmState() {
    return {
      open: false,
      reason: DEFAULT_CANCEL_REASON,
      submitting: false,
    };
  }

  function resetCancelConfirmState() {
    cancelConfirmState = createInitialCancelConfirmState();
  }

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

  function getStatusMeta(invoice) {
    return store.getBookingDisplayStatus?.(invoice?.raw_row || invoice) || {
      key: "pending",
      status_class: "moi",
      status_text: "Mới tiếp nhận",
      badge_class: "pending",
    };
  }

  function extractTimeTokens(value) {
    return Array.from(
      String(value || "").matchAll(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g),
    ).map((match) => {
      const hour = Number(match[1] || 0);
      const minute = Number(match[2] || 0);
      const second = Number(match[3] || 0);
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
    });
  }

  function buildLocalDateTimeMs(dateValue, timeValue) {
    const dateText = normalizeText(dateValue).slice(0, 10);
    const timeText = normalizeText(timeValue);
    if (!dateText || !timeText) return 0;
    const timestamp = new Date(`${dateText}T${timeText}`).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function resolveInvoiceScheduleStartMs(invoice) {
    const rawRow =
      invoice?.raw_row && typeof invoice.raw_row === "object" ? invoice.raw_row : {};
    const scheduleDate = normalizeText(
      rawRow?.ngay_thuc_hien || invoice?.schedule_date || "",
    );
    if (!scheduleDate) return 0;

    const slotTokens = extractTimeTokens(
      rawRow?.ten_khung_gio_thuc_hien ||
        rawRow?.khung_gio_thuc_hien ||
        invoice?.schedule_time ||
        "",
    );
    if (slotTokens.length) {
      return buildLocalDateTimeMs(scheduleDate, slotTokens[0]);
    }

    return buildLocalDateTimeMs(scheduleDate, "00:00:00");
  }

  function isExpiredPendingInvoice(invoice) {
    const statusMeta = getStatusMeta(invoice);
    if (statusMeta.key !== "pending") return false;

    if (
      normalizeText(
        invoice?.accepted_at ||
          invoice?.started_at ||
          invoice?.completed_at ||
          invoice?.cancelled_at ||
          "",
      )
    ) {
      return false;
    }

    const scheduleStartMs = resolveInvoiceScheduleStartMs(invoice);
    return !!(scheduleStartMs && Date.now() >= scheduleStartMs);
  }

  function getInvoiceDisplayStatus(invoice) {
    if (isExpiredPendingInvoice(invoice)) {
      return {
        tone: "cancelled",
        label: "Đã hủy",
        note: "Đơn đã quá thời gian thực hiện và được hệ thống tự hủy.",
      };
    }

    const statusMeta = getStatusMeta(invoice);
    if (statusMeta.key === "completed") {
      return {
        tone: "completed",
        label: "Đã hoàn thành",
        note: "Đơn hàng đã hoàn tất và được ghi nhận hoàn thành.",
      };
    }
    if (statusMeta.key === "shipping") {
      return {
        tone: "shipping",
        label: "Đang triển khai",
        note: "Nhà cung cấp đang triển khai công việc cho đơn hàng này.",
      };
    }
    if (statusMeta.key === "accepted") {
      return {
        tone: "accepted",
        label: "Đã nhận đơn",
        note: "Nhà cung cấp đã nhận đơn và đang chuẩn bị triển khai.",
      };
    }
    if (statusMeta.key === "cancelled") {
      return {
        tone: "cancelled",
        label: "Đã hủy",
        note: "Đơn đã bị hủy.",
      };
    }
    return {
      tone: "pending",
      label: "Mới tiếp nhận",
      note: "Đơn đang chờ nhà cung cấp nhận xử lý.",
    };
  }

  function getProgressMeta(invoice) {
    const status = getInvoiceDisplayStatus(invoice);
    if (status.tone === "completed") {
      return { percent: 100, ...status };
    }
    if (status.tone === "accepted") {
      return { percent: 46, ...status };
    }
    if (status.tone === "shipping") {
      return { percent: 74, ...status };
    }
    if (status.tone === "cancelled") {
      return { percent: 100, ...status };
    }
    return { percent: 24, ...status };
  }

  function renderStatusBadge(invoice) {
    const status = getInvoiceDisplayStatus(invoice);
    return `<span class="customer-status-badge status-${escapeHtml(
      status.tone,
    )}">${escapeHtml(status.label)}</span>`;
  }

  function canCancelInvoice(invoice) {
    const rawRow =
      invoice?.raw_row && typeof invoice.raw_row === "object"
        ? invoice.raw_row
        : null;
    if (!rawRow) {
      return false;
    }

    try {
      validateCustomerCancelBooking(rawRow, {
        scheduleStartMs: resolveInvoiceScheduleStartMs(invoice),
        nowMs: Date.now(),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function getInvoiceReference(invoice, trigger) {
    const source =
      trigger && typeof trigger.getAttribute === "function" ? trigger : null;

    return {
      id:
        source?.getAttribute("data-order-id") ||
        normalizeText(invoice?.remote_id || ""),
      code:
        source?.getAttribute("data-order-code") ||
        normalizeText(invoice?.code || ""),
    };
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

  function renderHeroStat(label, value, note, options = {}) {
    const className = normalizeText(options.className || "");
    const safeValue = options.valueHtml ? value || "--" : escapeHtml(value || "--");
    const safeNote = options.noteHtml ? note || "--" : escapeHtml(note || "--");
    const valueTag = options.valueTag || "strong";

    return `
      <article class="standalone-order-hero-stat ${escapeHtml(className)}">
        <span class="standalone-order-hero-stat-label">${escapeHtml(label || "--")}</span>
        <${valueTag} class="standalone-order-hero-stat-value">${safeValue}</${valueTag}>
        <small class="standalone-order-hero-stat-note">${safeNote}</small>
      </article>
    `;
  }

  function renderCancelConfirmBlock(invoice) {
    if (!cancelConfirmState.open || !canCancelInvoice(invoice)) {
      return "";
    }

    const orderCode = normalizeText(invoice?.code || "chưa có mã");

    return `
      <section class="standalone-order-cancel-confirm" data-cancel-confirm-block>
        <div class="standalone-order-cancel-confirm-copy">
          <p class="standalone-order-cancel-confirm-kicker">Xác nhận hủy yêu cầu</p>
          <h2 class="standalone-order-cancel-confirm-title">Hủy đơn ${escapeHtml(orderCode)}</h2>
          <p class="standalone-order-cancel-confirm-text">
            Bạn đang chuẩn bị hủy yêu cầu chuyển dọn này. Hành động này không thể hoàn tác sau khi xác nhận.
          </p>
        </div>
        <form class="standalone-order-cancel-confirm-form" data-cancel-confirm-form>
          <label class="standalone-order-cancel-confirm-field">
            <span>Lý do hủy</span>
            <textarea
              name="cancel_reason"
              class="standalone-order-cancel-confirm-textarea"
              data-cancel-confirm-reason
              rows="4"
              placeholder="Nhập lý do hủy đơn"
            >${escapeHtml(cancelConfirmState.reason || DEFAULT_CANCEL_REASON)}</textarea>
          </label>
          <div class="standalone-order-cancel-confirm-actions">
            <button type="button" class="customer-btn customer-btn-ghost" data-cancel-confirm-close>
              Quay lại
            </button>
            <button
              type="submit"
              class="customer-btn customer-btn-danger"
              data-cancel-confirm-submit
              data-order-id="${escapeHtml(invoice.remote_id || "")}"
              data-order-code="${escapeHtml(invoice.code || "")}"
              ${cancelConfirmState.submitting ? "disabled" : ""}
            >
              ${cancelConfirmState.submitting ? "Đang hủy..." : "Xác nhận hủy"}
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function renderHeroScheduleCard(invoice) {
    return `
      <article class="standalone-order-hero-support-card standalone-order-hero-support-card-schedule">
        <div class="standalone-order-hero-support-card-head">
          <span class="standalone-order-hero-support-icon">
            <i class="fa-solid fa-calendar-check"></i>
          </span>
          <div>
            <span class="standalone-order-hero-support-label">Ngày thực hiện</span>
            <strong>${escapeHtml(
              formatBookingDateOnly(invoice?.schedule_date) ||
                invoice?.schedule_label ||
                "Chờ xác nhận",
            )}</strong>
          </div>
        </div>
        <p class="standalone-order-hero-support-note">${escapeHtml(
          getBookingScheduleTimeLabel(invoice?.schedule_time) ||
            "Khung giờ triển khai",
        )}</p>
      </article>
    `;
  }

  function renderHeroRouteCard(invoice) {
    return `
      <article class="standalone-order-hero-support-card standalone-order-hero-support-card-route">
        <div class="standalone-order-hero-support-card-head">
          <span class="standalone-order-hero-support-icon">
            <i class="fa-solid fa-route"></i>
          </span>
          <div>
            <span class="standalone-order-hero-support-label">Lộ trình thực hiện</span>
            <strong>Tuyến đường dự kiến</strong>
          </div>
        </div>
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

    const driveFileId =
      typeof core.getDriveFileIdFromUrl === "function"
        ? core.getDriveFileIdFromUrl(normalized)
        : "";
    if (driveFileId) {
      return `Google Drive • ${driveFileId}`;
    }

    const sanitized = normalized.split("?")[0].split("#")[0];
    const segments = sanitized.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] || normalized;
  }

  function resolveAttachmentUrls(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return {
        fileId: "",
        url: "",
        viewUrl: "",
        thumbnailUrl: "",
      };
    }

    if (typeof core.getDriveResolvedUrls === "function") {
      const resolved = core.getDriveResolvedUrls(normalized);
      return {
        fileId: normalizeText(resolved?.fileId || ""),
        url: normalizeText(resolved?.downloadUrl || resolved?.url || normalized),
        viewUrl: normalizeText(resolved?.viewUrl || resolved?.url || normalized),
        thumbnailUrl: normalizeText(
          resolved?.thumbnailUrl || resolved?.url || normalized,
        ),
      };
    }

    return {
      fileId: "",
      url: normalized,
      viewUrl: normalized,
      thumbnailUrl: normalized,
    };
  }

  function getAttachmentHref(value) {
    const normalized = normalizeText(value);
    if (!normalized) return "";

    const resolved = resolveAttachmentUrls(normalized);
    if (resolved.viewUrl) {
      return resolved.viewUrl;
    }

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

  function getAttachmentPreviewUrl(value, type) {
    const resolved = resolveAttachmentUrls(value);
    if (!resolved.url) return "";

    if (type === "image") {
      return resolved.thumbnailUrl || resolved.url;
    }

    return resolved.url;
  }

  function bindFileSummary(input, output, emptyText) {
    if (!input || !output) return;

    const refresh = () => {
      const files = Array.from(input.files || []);
      output.textContent = files.length
        ? `Đã chọn: ${files.map((file) => file.name).join(", ")}`
        : emptyText;
    };

    input.addEventListener("change", refresh);
    refresh();
  }

  function collectFiles(...inputs) {
    return inputs.flatMap((input) =>
      Array.from(input?.files || []).filter((file) => file instanceof File),
    );
  }

  function mergeAttachmentValues(existingValues, nextValues) {
    const merged = [];
    const seen = new Set();

    [...(Array.isArray(existingValues) ? existingValues : []), ...(Array.isArray(nextValues) ? nextValues : [])]
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .forEach((item) => {
        if (seen.has(item)) return;
        seen.add(item);
        merged.push(item);
      });

    return merged;
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

  function renderAttachmentGallery(imageItems, videoItems, options = {}) {
    const imageLabelPrefix = options?.imageLabelPrefix || "Ảnh hiện trường";
    const videoLabelPrefix = options?.videoLabelPrefix || "Video hiện trường";
    const emptyMessage =
      options?.emptyMessage ||
      "Chưa có tài liệu hiện trường nào được gửi kèm cho yêu cầu này.";
    const mediaItems = [
      ...((Array.isArray(imageItems) ? imageItems : [])
        .filter(Boolean)
        .map((item, index) => ({
          type: "image",
          label: `${imageLabelPrefix} ${index + 1}`,
          value: item,
        }))),
      ...((Array.isArray(videoItems) ? videoItems : [])
        .filter(Boolean)
        .map((item, index) => ({
          type: "video",
          label: `${videoLabelPrefix} ${index + 1}`,
          value: item,
        }))),
    ];

    if (!mediaItems.length) {
      return `<div class="standalone-order-note-panel"><p>${escapeHtml(
        emptyMessage,
      )}</p></div>`;
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
              const previewUrl = getAttachmentPreviewUrl(
                attachmentValue,
                item.type,
              );
              const mediaPreview =
                item.type === "image" && previewUrl
                  ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(item.label)}" />`
                  : item.type === "video" && previewUrl
                    ? `<video src="${escapeHtml(previewUrl)}" controls preload="metadata"></video>`
                    : `<div class="standalone-order-item-icon">
                        <i class="${escapeHtml(
                          item.type === "video"
                            ? "fa-solid fa-video"
                            : "fa-solid fa-image",
                        )}"></i>
                      </div>`;

              return `
              <div class="standalone-order-media-item">
                ${mediaPreview}
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

  function getAttachmentCount(imageItems, videoItems) {
    const imageCount = Array.isArray(imageItems)
      ? imageItems.filter(Boolean).length
      : 0;
    const videoCount = Array.isArray(videoItems)
      ? videoItems.filter(Boolean).length
      : 0;
    return imageCount + videoCount;
  }

  function renderPricingRows(invoice) {
    const fallbackRows = [renderInfoRow("Chi tiết phí", "Chưa có bảng tạm tính chi tiết")];
    const breakdown = getRenderableBookingPricingRows(invoice?.pricing_breakdown, {
      excludeLabelPatterns: [/loai xe|xe tai|binh thuong/i],
    });

    if (!breakdown.length) {
      return fallbackRows.join("");
    }

    const rows = breakdown.map((item, index) =>
        renderInfoRow(
          item.label || `Hạng mục ${index + 1}`,
          item.amount || formatCurrency(item.amount_value || 0),
        ),
      );

    if (!rows.length) {
      return fallbackRows.join("");
    }

    return rows.join("");
  }

  function buildTimeline(invoice) {
    const isExpiredPending = isExpiredPendingInvoice(invoice);
    const statusMeta = getStatusMeta(invoice);
    const entries = [
      {
        time: invoice?.created_at,
        title: "Yêu cầu đã ghi nhận",
        note: "Biểu mẫu đặt lịch đã được lưu và gắn với hồ sơ khách hàng hiện tại.",
      },
    ];

    if (isExpiredPending) {
      entries.push({
        time: invoice.schedule_label || invoice.schedule_date || "Quá thời gian thực hiện",
        title: "Yêu cầu tự hủy",
        note: "Đơn đã quá thời gian thực hiện nhưng chưa được xử lý nên hệ thống tự động hủy.",
      });
      return entries;
    }

    if (normalizeText(invoice?.accepted_at || "")) {
      entries.push({
        time: invoice.accepted_at,
        title: "Nhà cung cấp đã nhận đơn",
        note: "Đơn hàng đã có đơn vị phụ trách tiếp nhận và chuẩn bị triển khai.",
      });
    }

    if (normalizeText(invoice?.started_at || "")) {
      entries.push({
        time: invoice.started_at,
        title: "Bắt đầu triển khai",
        note: "Đội thực hiện đã bắt đầu công việc tại hiện trường.",
      });
    }

    if (normalizeText(invoice?.completed_at || "")) {
      entries.push({
        time: invoice.completed_at,
        title: "Hoàn thành đơn hàng",
        note: "Đơn hàng đã được cập nhật hoàn tất trên hệ thống.",
      });
    }

    if (
      normalizeText(invoice?.cancelled_at || "") ||
      statusMeta.key === "cancelled"
    ) {
      entries.push({
        time: invoice?.cancelled_at || invoice?.updated_at || invoice?.created_at,
        title: "Yêu cầu bị hủy",
        note: "Đơn hàng đã được đánh dấu hủy trên hệ thống.",
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

  function renderRatingInput(rating) {
    const safeRating = Number.isFinite(Number(rating))
      ? Math.min(5, Math.max(0, Math.round(Number(rating))))
      : 0;

    return `
      <div class="standalone-order-rating-input" data-rating-input>
        <input type="hidden" name="customer_rating" value="${escapeHtml(
          String(safeRating),
        )}" />
        <div class="standalone-order-rating-input-buttons" role="radiogroup" aria-label="Mức đánh giá">
          ${Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            const isActive = value <= safeRating;
            return `
              <button
                type="button"
                class="standalone-order-rating-button${isActive ? " is-active" : ""}"
                data-rating-value="${escapeHtml(String(value))}"
                role="radio"
                aria-checked="${isActive ? "true" : "false"}"
                aria-label="${escapeHtml(`${value} sao`)}"
              >
                <i class="${escapeHtml(
                  isActive ? "fa-solid fa-star" : "fa-regular fa-star",
                )}"></i>
              </button>
            `;
          }).join("")}
        </div>
        <small class="standalone-order-rating-caption" data-rating-caption>${escapeHtml(
          safeRating ? `${safeRating}/5 sao` : "Chưa chấm sao",
        )}</small>
      </div>
    `;
  }

  function renderProviderReportBlock(invoice) {
    const providerNote = normalizeText(invoice?.provider_note || "");
    const providerReportImageAttachments = Array.isArray(
      invoice?.provider_report_image_attachments,
    )
      ? invoice.provider_report_image_attachments
      : [];
    const providerReportVideoAttachments = Array.isArray(
      invoice?.provider_report_video_attachments,
    )
      ? invoice.provider_report_video_attachments
      : [];

    return `
      <details class="standalone-order-fold">
        <summary class="standalone-order-fold-summary">
          <span>Báo cáo từ đơn vị thực hiện</span>
          <small>${escapeHtml(providerNote ? "Đã cập nhật" : "Chưa có cập nhật mới")}</small>
        </summary>
        <section class="standalone-order-block standalone-order-block-fold">
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
            ${renderAttachmentGallery(
              providerReportImageAttachments,
              providerReportVideoAttachments,
              {
                imageLabelPrefix: "Ảnh báo cáo",
                videoLabelPrefix: "Video báo cáo",
                emptyMessage:
                  "Chưa có ảnh hoặc video báo cáo từ nhà cung cấp.",
              },
            )}
          </article>
        </section>
      </details>
    `;
  }

  function renderProviderContactCard(invoice) {
    return `
      <article class="standalone-order-contact-card standalone-order-provider-contact-card">
        <div class="standalone-order-contact-card-head">
          <div class="standalone-order-contact-card-title">
            <span class="standalone-order-contact-card-icon">
              <i class="fa-solid fa-truck-ramp-box"></i>
            </span>
            <div>
              <strong>Nhà cung cấp phụ trách</strong>
              <p>Thông tin đơn vị hiện đang nhận và xử lý đơn hàng này.</p>
            </div>
          </div>
          <span class="standalone-order-chip">Nhà cung cấp</span>
        </div>
        <div class="standalone-order-info-list">
          ${renderInfoRow("Đơn vị", invoice.provider_name || "Chưa có đơn vị phụ trách")}
          ${renderInfoRow("Số điện thoại", invoice.provider_phone || "Chưa cập nhật")}
          ${renderInfoRow("Địa chỉ", invoice.provider_address || "Chưa cập nhật")}
        </div>
      </article>
    `;
  }

  function renderCustomerFeedbackBlock(invoice) {
    const feedback = normalizeText(invoice?.customer_feedback || "");
    const rating = Number(invoice?.customer_rating || 0);
    const safeRating = Number.isFinite(rating)
      ? Math.min(5, Math.max(0, Math.round(rating)))
      : 0;
    const canSubmit = getStatusMeta(invoice).key === "completed";
    const feedbackImageAttachments = Array.isArray(
      invoice?.customer_feedback_image_attachments,
    )
      ? invoice.customer_feedback_image_attachments
      : [];
    const feedbackVideoAttachments = Array.isArray(
      invoice?.customer_feedback_video_attachments,
    )
      ? invoice.customer_feedback_video_attachments
      : [];

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
              ${renderAttachmentGallery(
                feedbackImageAttachments,
                feedbackVideoAttachments,
                {
                  imageLabelPrefix: "Ảnh phản hồi",
                  videoLabelPrefix: "Video phản hồi",
                  emptyMessage:
                    "Chưa có ảnh hoặc video phản hồi từ khách hàng.",
                },
              )}
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
                        ${renderRatingInput(safeRating)}
                      </label>
                      <label class="standalone-order-field">
                        <span>Đánh giá hoặc báo cáo thêm</span>
                        <textarea name="customer_feedback" rows="5" placeholder="Chia sẻ trải nghiệm, góp ý hoặc báo cáo phát sinh của đơn hàng này.">${escapeHtml(feedback)}</textarea>
                      </label>
                      <div class="standalone-order-upload-grid">
                        <label class="standalone-order-upload-zone standalone-order-upload-zone-image">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                          <strong>Gửi ảnh hiện trường</strong>
                          <span class="standalone-order-upload-copy">Ảnh đánh giá sẽ được lưu riêng trong phần media phản hồi khách hàng.</span>
                          <input type="file" name="customer_feedback_image" accept="image/*" multiple hidden />
                          <span class="standalone-order-upload-meta" data-feedback-image-summary>Chưa chọn ảnh đánh giá.</span>
                        </label>
                        <label class="standalone-order-upload-zone standalone-order-upload-zone-video">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                          <strong>Gửi video hiện trường</strong>
                          <span class="standalone-order-upload-copy">Video đánh giá sẽ được lưu riêng trong phần media phản hồi khách hàng.</span>
                          <input type="file" name="customer_feedback_video" accept="video/*" multiple hidden />
                          <span class="standalone-order-upload-meta" data-feedback-video-summary>Chưa chọn video đánh giá.</span>
                        </label>
                      </div>
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
              getProjectUrl("khach-hang/danh-sach-don-hang.html"),
            )}">Quay lại danh sách đơn hàng</a>
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
    const canCancel = canCancelInvoice(invoice);
    if (!canCancel && cancelConfirmState.open) {
      resetCancelConfirmState();
    }

    const progressMeta = getProgressMeta(invoice);
    const timeline = buildTimeline(invoice);
    const statusBadge = renderStatusBadge(invoice);
    root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <div class="standalone-order-topbar">
            <div class="standalone-order-topbar-logo">
              <img src="${escapeHtml(getProjectUrl("public/assets/images/logo-dich-vu-quanh-ta.png"))}" alt="Logo Dịch Vụ Quanh Ta" />
            </div>
            <div class="standalone-order-topbar-center">
              <h2 class="standalone-order-topbar-title">Chi tiết đơn hàng</h2>
              <div class="standalone-order-topbar-meta">
                <span><i class="fa-solid fa-user"></i> Khách hàng</span>
                <span><i class="fa-solid fa-clock"></i> Tạo lúc ${escapeHtml(formatDateTime(invoice.created_at || ""))}</span>
              </div>
            </div>
            <div class="standalone-order-topbar-logo">
              <img src="${escapeHtml(getProjectUrl("public/assets/images/favicon.png"))}" alt="Logo Dịch vụ Chuyển Dọn" />
            </div>
          </div>

          <header class="standalone-order-card-header">
            <div class="standalone-order-header-main-content">
              <div class="standalone-order-hero-frame-grid">
                <div class="standalone-order-hero-frame standalone-order-hero-frame-main">
                  <div class="standalone-order-card-title">
                    <p class="standalone-order-card-kicker">Chi tiết đơn hàng</p>
                    <h1>${escapeHtml(invoice.service_label || "Dịch vụ Chuyển Dọn")}</h1>
                    <p class="standalone-order-card-subtitle standalone-order-reference">${escapeHtml(invoice.code || "Chi tiết đơn hàng")}</p>
                  </div>
                  <div class="standalone-order-hero-summary-grid">
                    ${renderHeroStat(
                      "Tạm tính",
                      formatCurrency(invoice.estimated_amount),
                      "Mức giá tham khảo hiện tại",
                      { className: "standalone-order-hero-stat--amount" },
                    )}
                    ${renderHeroStat(
                      "Khoảng cách",
                      formatDistance(invoice.distance_km),
                      "Quãng đường dự kiến",
                    )}
                    ${renderHeroStat(
                      "Trạng thái đơn",
                      statusBadge,
                      progressMeta.note,
                      {
                        className: "standalone-order-hero-stat--status",
                        valueHtml: true,
                        noteHtml: false,
                        valueTag: "div",
                      },
                    )}
                  </div>
                </div>

                <div class="standalone-order-hero-frame standalone-order-hero-frame-side">
                  <div class="standalone-order-hero-progress-card">
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
                  <div class="standalone-order-actions-group standalone-order-hero-actions-group">
                    ${
                      canCancel
                        ? `<button type="button" class="customer-btn customer-btn-danger" data-invoice-cancel data-order-id="${escapeHtml(
                            invoice.remote_id || "",
                          )}" data-order-code="${escapeHtml(invoice.code || "")}">Hủy đơn</button>`
                        : ""
                    }
                    <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                      getProjectUrl("khach-hang/danh-sach-don-hang.html"),
                    )}">Về lịch sử đơn</a>
                  </div>
                  ${renderCancelConfirmBlock(invoice)}
                </div>
              </div>

              <div class="standalone-order-hero-support-grid">
                ${renderHeroScheduleCard(invoice)}
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
                    ${renderInfoRow("Khảo sát", getSurveyRequirementLabel(invoice))}
                    ${renderInfoRow("Loại xe", invoice.vehicle_label || "Chưa chốt loại xe")}
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

                ${renderProviderContactCard(invoice)}

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
                          <strong>Hạng mục đã chọn</strong>
                        </div>
                        ${renderChipList(
                          invoice.service_details,
                          "Chưa có hạng mục nào được chọn thêm.",
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
                      <strong>Ảnh/video khách đính kèm khi đặt đơn</strong>
                      <p>Media được gửi từ form đặt lịch ban đầu của đơn hàng.</p>
                    </div>
                    <span class="standalone-order-chip">Tệp đính kèm</span>
                  </div>
                  ${renderAttachmentGallery(
                    invoice?.booking_image_attachments,
                    invoice?.booking_video_attachments,
                    {
                      imageLabelPrefix: "Ảnh đặt đơn",
                      videoLabelPrefix: "Video đặt đơn",
                      emptyMessage:
                        "Chưa có ảnh hoặc video nào được đính kèm khi tạo đơn.",
                    },
                  )}
                </article>
              </div>
            </section>

            ${renderProviderReportBlock(invoice)}
            ${renderCustomerFeedbackBlock(invoice)}
          </div>
        </section>
      </div>
    `;

    root
      .querySelector("[data-invoice-cancel]")
      ?.addEventListener("click", function () {
        if (cancelConfirmState.submitting) {
          return;
        }

        cancelConfirmState.open = true;
        if (!normalizeText(cancelConfirmState.reason)) {
          cancelConfirmState.reason = DEFAULT_CANCEL_REASON;
        }
        renderInvoice(data);
      });

    root
      .querySelector("[data-cancel-confirm-close]")
      ?.addEventListener("click", function () {
        resetCancelConfirmState();
        renderInvoice(data);
      });

    root
      .querySelector("[data-cancel-confirm-reason]")
      ?.addEventListener("input", function (event) {
        cancelConfirmState.reason = event.currentTarget?.value || "";
      });

    root
      .querySelector("[data-cancel-confirm-form]")
      ?.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (cancelConfirmState.submitting) {
          return;
        }

        const form = event.currentTarget;
        const submitButton =
          form.querySelector("[data-cancel-confirm-submit]") || null;
        const formData = new FormData(form);
        cancelConfirmState.reason =
          String(formData.get("cancel_reason") || "").trim() ||
          DEFAULT_CANCEL_REASON;
        cancelConfirmState.submitting = true;
        renderInvoice(data);

        try {
          const invoiceReference = getInvoiceReference(invoice, submitButton);
          const result = await store.cancelBooking?.(invoiceReference);
          resetCancelConfirmState();
          renderInvoice(result || null);
        } catch (error) {
          cancelConfirmState.submitting = false;
          renderInvoice(data);
          core.notify(
            error?.message || "Không thể hủy yêu cầu ở thời điểm hiện tại.",
            "error",
          );
        }
      });

    root
      .querySelector("[data-customer-feedback-form]")
      ?.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
          const form = event.currentTarget;
          const submitButton =
            form.querySelector('button[type="submit"]') || null;
          const defaultLabel =
            String(submitButton?.textContent || "").trim() || "Lưu đánh giá";
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Đang lưu...";
          }

          const formData = new FormData(form);
          const imageFiles = collectFiles(
            form.querySelector('input[name="customer_feedback_image"]'),
          );
          const videoFiles = collectFiles(
            form.querySelector('input[name="customer_feedback_video"]'),
          );
          const uploadedImageLinks = imageFiles.length
            ? (await core.uploadFilesToDrive(imageFiles)).map((item) =>
                normalizeText(item?.url || item?.download_url || ""),
              )
            : [];
          const uploadedVideoLinks = videoFiles.length
            ? (await core.uploadFilesToDrive(videoFiles)).map((item) =>
                normalizeText(item?.url || item?.download_url || ""),
              )
            : [];
          const mergedImageAttachments = mergeAttachmentValues(
            invoice?.customer_feedback_image_attachments,
            uploadedImageLinks,
          );
          const mergedVideoAttachments = mergeAttachmentValues(
            invoice?.customer_feedback_video_attachments,
            uploadedVideoLinks,
          );
          const result = await store.saveBookingFeedback?.({
            id: invoice.remote_id || "",
            code: invoice.code || "",
          }, {
            customer_rating: formData.get("customer_rating") || 0,
            customer_feedback: formData.get("customer_feedback") || "",
            customer_feedback_image_attachments: mergedImageAttachments,
            customer_feedback_video_attachments: mergedVideoAttachments,
          });
          renderInvoice(result || null);
          core.notify("Đã lưu đánh giá khách hàng.", "success");
        } catch (error) {
          core.notify(error?.message || "Không thể lưu đánh giá ở thời điểm hiện tại.", "error");
        } finally {
          const form = event.currentTarget;
          const submitButton =
            form.querySelector('button[type="submit"]') || null;
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Lưu đánh giá";
          }
        }
      });

    const feedbackForm = root.querySelector("[data-customer-feedback-form]");
    if (feedbackForm) {
      bindFileSummary(
        feedbackForm.querySelector('input[name="customer_feedback_image"]'),
        feedbackForm.querySelector("[data-feedback-image-summary]"),
        "Chưa chọn ảnh đánh giá.",
      );
      bindFileSummary(
        feedbackForm.querySelector('input[name="customer_feedback_video"]'),
        feedbackForm.querySelector("[data-feedback-video-summary]"),
        "Chưa chọn video đánh giá.",
      );
    }

    root.querySelectorAll("[data-rating-input]").forEach((ratingRoot) => {
      const hiddenInput = ratingRoot.querySelector('input[name="customer_rating"]');
      const captionNode = ratingRoot.querySelector("[data-rating-caption]");
      const buttons = Array.from(
        ratingRoot.querySelectorAll("[data-rating-value]"),
      );

      function applyRating(nextValue) {
        const numericValue = Number(nextValue || 0);
        const safeValue = Number.isFinite(numericValue)
          ? Math.min(5, Math.max(0, Math.round(numericValue)))
          : 0;

        if (hiddenInput) {
          hiddenInput.value = String(safeValue);
        }
        if (captionNode) {
          captionNode.textContent = safeValue
            ? `${safeValue}/5 sao`
            : "Chưa chấm sao";
        }

        buttons.forEach((button, index) => {
          const isActive = index < safeValue;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-checked", isActive ? "true" : "false");
          const icon = button.querySelector("i");
          if (icon) {
            icon.className = isActive
              ? "fa-solid fa-star"
              : "fa-regular fa-star";
          }
        });
      }

      buttons.forEach((button) => {
        button.addEventListener("click", function () {
          applyRating(button.getAttribute("data-rating-value") || "0");
        });
      });
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
      const resolvedOrderId = String(
        result?.invoice?.remote_id ||
          result?.invoice?.raw_row?.id ||
          result?.request?.remote_id ||
          "",
      ).trim();
      if (resolvedOrderId) {
        core.syncOrderDetailUrl?.({
          orderCode: resolvedOrderId,
          path: window.location.pathname,
          username: auth.username,
          password: auth.password,
        });
      }
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


