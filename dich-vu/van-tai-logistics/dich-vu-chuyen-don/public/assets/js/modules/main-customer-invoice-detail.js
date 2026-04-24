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
  let cancelReasonDraft = DEFAULT_CANCEL_REASON;

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

  function redirectToMatchingDetail(role, orderCode) {
    const normalizedRole = normalizeText(role).toLowerCase();
    const targetOrderCode =
      normalizeText(orderCode) || normalizeText(core.getOrderIdentifierFromUrl?.() || "");
    if (!targetOrderCode) {
      redirectToLogin();
      return;
    }

    const targetPath =
      normalizedRole === "nha-cung-cap"
        ? "nha-cung-cap/chi-tiet-don-hang-chuyendon.html"
        : "chi-tiet-hoa-don-chuyendon.html";
    const auth = core.getOrderDetailAccessCredentials?.() ||
      core.getUrlAuthCredentials?.() || {
        loginIdentifier: "",
        username: "",
        password: "",
      };
    const targetUrl =
      typeof core.buildOrderDetailUrl === "function"
        ? core.buildOrderDetailUrl(targetPath, targetOrderCode, auth)
        : getProjectUrl(targetPath);

    if (targetUrl && targetUrl !== window.location.href) {
      window.location.replace(targetUrl);
      return;
    }

    redirectToLogin();
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
        note: "",
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

  function openCancelConfirmDialog(invoice) {
    const orderCode = normalizeText(invoice?.code || "chưa có mã");

    return new Promise((resolve) => {
      if (
        typeof window.HTMLDialogElement === "undefined" ||
        typeof document.createElement("dialog").showModal !== "function"
      ) {
        const confirmed = window.confirm(
          `Bạn có chắc muốn hủy đơn ${orderCode} không?`,
        );
        if (!confirmed) {
          resolve(null);
          return;
        }

        const reason = window.prompt(
          "Nhập lý do hủy đơn (có thể để trống nếu không cần):",
          cancelReasonDraft || DEFAULT_CANCEL_REASON,
        );
        if (reason === null) {
          resolve(null);
          return;
        }

        cancelReasonDraft = String(reason || "").trim() || DEFAULT_CANCEL_REASON;
        resolve(cancelReasonDraft);
        return;
      }

      const dialog = document.createElement("dialog");
      dialog.className = "customer-dialog standalone-order-cancel-dialog";
      dialog.innerHTML = `
        <form method="dialog" class="customer-dialog-card standalone-order-cancel-dialog-card">
          <div class="customer-dialog-copy standalone-order-cancel-dialog-copy">
            <p class="customer-section-kicker">Xác nhận hủy yêu cầu</p>
            <h2>Hủy đơn ${escapeHtml(orderCode)}</h2>
            <p class="customer-panel-subtext">Bạn đang chuẩn bị hủy yêu cầu chuyển dọn này. Hành động này không thể hoàn tác sau khi xác nhận.</p>
          </div>
          <label class="customer-form-stack standalone-order-cancel-dialog-field">
            <span>Lý do hủy</span>
            <textarea name="cancel_reason" rows="4" class="standalone-order-cancel-confirm-textarea" placeholder="Nhập lý do hủy nếu cần...">${escapeHtml(
              cancelReasonDraft || DEFAULT_CANCEL_REASON,
            )}</textarea>
          </label>
          <div class="customer-inline-actions customer-dialog-actions">
            <button type="button" class="customer-btn customer-btn-ghost" data-dialog-close>Quay lại</button>
            <button type="submit" class="customer-btn customer-btn-danger" value="confirm">Xác nhận hủy</button>
          </div>
        </form>
      `;

      const cleanup = () => {
        if (dialog.isConnected) {
          dialog.remove();
        }
      };

      dialog.addEventListener("close", () => {
        if (dialog.returnValue === "confirm") {
          const reasonField = dialog.querySelector("[name='cancel_reason']");
          cancelReasonDraft =
            String(reasonField?.value || "").trim() || DEFAULT_CANCEL_REASON;
          resolve(cancelReasonDraft);
        } else {
          resolve(null);
        }
        cleanup();
      });

      dialog
        .querySelector("[data-dialog-close]")
        ?.addEventListener("click", () => {
          dialog.close("cancel");
        });

      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  function renderHeroScheduleCard(invoice) {
    return `
      <article class="standalone-order-hero-support-card standalone-order-hero-support-card-schedule">
        <div class="standalone-order-hero-support-card-head">
          <span class="standalone-order-hero-support-icon">
            <i class="fa-solid fa-calendar-check"></i>
          </span>
          <div>
            <span class="standalone-order-hero-support-label">Thời gian thực hiện</span>
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

  function getRenderableServiceDetails(items) {
    const list = Array.isArray(items) ? items : [];
    return list.filter((item) => {
      const normalized = normalizeText(item).toLowerCase();
      if (!normalized) return false;
      return !(
        /phương án xe|phuong an xe|loại xe|loai xe|xe tải|xe tai/.test(normalized) ||
        /khảo sát trước|khao sat truoc/.test(normalized)
      );
    });
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

  function filterAttachmentValuesByIndexes(values, removedIndexes) {
    const list = Array.isArray(values) ? values : [];
    const removed = new Set(
      (Array.isArray(removedIndexes) ? removedIndexes : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0),
    );

    return list.filter((_, index) => !removed.has(index));
  }

  function renderEditableAttachmentGallery(items, type, options = {}) {
    const list = (Array.isArray(items) ? items : [])
      .map((value, index) => ({
        value: normalizeText(value),
        index,
      }))
      .filter((item) => item.value);

    if (!list.length && options.hideEmpty) return "";
    if (!list.length) {
      return `<div class="standalone-order-note-panel"><p>${escapeHtml(
        options.emptyMessage || "Chưa có ảnh/video.",
      )}</p></div>`;
    }

    const removeName = options.removeName || "remove_attachment_indexes[]";
    const removeButtonLabel = options.removeButtonLabel || "Xóa media";
    const removedLabel = options.removedLabel || "Sẽ xóa khi lưu";
    const labelPrefix = options.labelPrefix || (type === "video" ? "Video" : "Ảnh");

    return `
      <div class="standalone-order-media-grid">
        ${list
          .map((item) => {
            const attachmentHref = getAttachmentHref(item.value);
            const previewUrl = getAttachmentPreviewUrl(item.value, type);
            const attachmentName = getAttachmentFileName(item.value) || item.value;
            const mediaPreview =
              type === "image" && previewUrl
                ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(`${labelPrefix} ${item.index + 1}`)}" />`
                : type === "video" && previewUrl
                  ? `<video src="${escapeHtml(previewUrl)}" controls preload="metadata"></video>`
                  : `<div class="standalone-order-item-icon">
                      <i class="${escapeHtml(type === "video" ? "fa-solid fa-video" : "fa-solid fa-image")}"></i>
                    </div>`;

            return `
              <div class="standalone-order-media-item standalone-order-media-item-removable" data-removed-label="${escapeHtml(removedLabel)}">
                <a class="standalone-order-media-preview-link" href="${escapeHtml(
                  attachmentHref || "#",
                )}" target="_blank" rel="noreferrer">
                  ${mediaPreview}
                </a>
                <button type="button" class="standalone-order-media-remove" data-remove-media aria-label="${escapeHtml(removeButtonLabel)}" title="${escapeHtml(removeButtonLabel)}">
                  <i class="fa-solid fa-xmark"></i>
                </button>
                <input type="hidden" name="${escapeHtml(removeName)}" value="${escapeHtml(String(item.index))}" disabled />
              </div>
            `;
          })
          .join("")}
      </div>
    `;
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
          <span>Ghi chú NCC</span>
          <small>${escapeHtml(providerNote ? "Đã cập nhật" : "Chưa có ghi chú")}</small>
        </summary>
        <section class="standalone-order-block standalone-order-block-fold">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú</strong>
              ${providerNote ? `<span class="standalone-order-chip">${escapeHtml("Đã cập nhật")}</span>` : ""}
            </div>
            <p class="standalone-order-note-text">${escapeHtml(
              providerNote || "Chưa có ghi chú",
            )}</p>
            ${renderAttachmentGallery(
              providerReportImageAttachments,
              providerReportVideoAttachments,
              {
                imageLabelPrefix: "Ảnh báo cáo",
                videoLabelPrefix: "Video báo cáo",
                emptyMessage: "Chưa có ảnh/video.",
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
    const hasFeedbackContent =
      safeRating > 0 ||
      !!feedback ||
      feedbackImageAttachments.length > 0 ||
      feedbackVideoAttachments.length > 0;

    return `
      <details class="standalone-order-fold">
        <summary class="standalone-order-fold-summary">
          <span>Phản hồi khách hàng</span>
          <small>${escapeHtml(
            safeRating > 0 ? `${safeRating}/5 sao` : canSubmit ? "Sẵn sàng" : "Chưa mở",
          )}</small>
        </summary>
        <section class="standalone-order-block standalone-order-block-fold">
          <div class="standalone-order-side-stack standalone-order-review-layout standalone-order-review-layout-inline">
            <article class="standalone-order-subcard">
              <div class="standalone-order-subcard-head">
                <strong>${escapeHtml(canSubmit ? "Đánh giá dịch vụ" : "Phản hồi khách hàng")}</strong>
                ${safeRating > 0 ? renderRatingStars(safeRating) : ""}
              </div>
              ${
                canSubmit
                  ? `
                    <form class="standalone-order-form" data-customer-feedback-form>
                      <label class="standalone-order-field">
                        <span>Đánh giá dịch vụ</span>
                        ${renderRatingInput(safeRating)}
                      </label>
                      <label class="standalone-order-field">
                        <span>Nội dung phản hồi</span>
                        <textarea name="customer_feedback" rows="5" placeholder="Mô tả chất lượng phục vụ hoặc vấn đề phát sinh.">${escapeHtml(feedback)}</textarea>
                      </label>
                      <div class="standalone-order-upload-grid">
                        <div class="standalone-order-upload-zone standalone-order-upload-zone-image">
                          <label class="standalone-order-upload-picker">
                            <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                            <strong>Chụp hoặc gửi ảnh phản hồi</strong>
                            <input type="file" name="customer_feedback_image" accept="image/*" multiple hidden />
                            <span class="standalone-order-upload-meta" data-feedback-image-summary>Chưa chọn ảnh</span>
                          </label>
                          ${renderEditableAttachmentGallery(
                            feedbackImageAttachments,
                            "image",
                            {
                              removeName: "remove_feedback_image_indexes[]",
                              removeButtonLabel: "Xóa ảnh phản hồi",
                              removedLabel: "Sẽ xóa khi lưu",
                              hideEmpty: true,
                              labelPrefix: "Ảnh phản hồi",
                            },
                          )}
                        </div>
                        <div class="standalone-order-upload-zone standalone-order-upload-zone-video">
                          <label class="standalone-order-upload-picker">
                            <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                            <strong>Gửi video phản hồi</strong>
                            <input type="file" name="customer_feedback_video" accept="video/*" multiple hidden />
                            <span class="standalone-order-upload-meta" data-feedback-video-summary>Chưa chọn video</span>
                          </label>
                          ${renderEditableAttachmentGallery(
                            feedbackVideoAttachments,
                            "video",
                            {
                              removeName: "remove_feedback_video_indexes[]",
                              removeButtonLabel: "Xóa video phản hồi",
                              removedLabel: "Sẽ xóa khi lưu",
                              hideEmpty: true,
                              labelPrefix: "Video phản hồi",
                            },
                          )}
                        </div>
                      </div>
                      <div class="standalone-order-inline-actions">
                        <button class="customer-btn customer-btn-primary" type="submit">Lưu phản hồi</button>
                      </div>
                    </form>
                  `
                  : `<div class="standalone-order-note-panel">
                      <p>${escapeHtml(feedback || (hasFeedbackContent ? "" : "Chưa đánh giá"))}</p>
                      ${renderAttachmentGallery(
                        feedbackImageAttachments,
                        feedbackVideoAttachments,
                        {
                          imageLabelPrefix: "Ảnh phản hồi",
                          videoLabelPrefix: "Video phản hồi",
                          emptyMessage: "Chưa có ảnh/video phản hồi.",
                        },
                      )}
                    </div>`
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
              getProjectUrl("khach-hang/danh-sach-don-hang-chuyendon.html"),
            )}">Quay lại danh sách đơn hàng</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderInvoice(data) {
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

    const progressMeta = getProgressMeta(invoice);
    const timeline = buildTimeline(invoice);
    const statusBadge = renderStatusBadge(invoice);
    const isCancelled = progressMeta.tone === "cancelled";
    const isCompleted = progressMeta.tone === "completed";
    const isTerminal = isCancelled || isCompleted;
    const cancelledTimeLabel = formatDateTime(
      invoice?.cancelled_at || invoice?.updated_at || invoice?.created_at || "",
    );
    const completedTimeLabel = formatDateTime(invoice?.completed_at || "");
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
                  <div class="standalone-order-hero-summary-grid standalone-order-hero-fee-distance-row">
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
                      { className: "standalone-order-hero-stat--distance" },
                    )}
                  </div>
                </div>

                <div class="standalone-order-hero-frame standalone-order-hero-frame-side standalone-order-hero-status-frame">
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
                        <p class="standalone-order-progress-label">Trạng thái đơn hàng</p>
                        <div class="standalone-order-progress-status-row">${statusBadge}</div>
                        ${
                          isCancelled
                            ? `<time>Hủy lúc ${escapeHtml(cancelledTimeLabel)}</time>`
                            : isCompleted
                              ? `<time>Hoàn thành lúc ${escapeHtml(completedTimeLabel)}</time>`
                              : ""
                        }
                        ${normalizeText(progressMeta.note) ? `<p>${escapeHtml(progressMeta.note)}</p>` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="standalone-order-hero-support-grid ${isTerminal ? "standalone-order-hero-support-grid--route-only" : ""}">
                ${isTerminal ? "" : renderHeroScheduleCard(invoice)}
                <div class="standalone-order-hero-route-stack">
                  <div class="standalone-order-actions-group standalone-order-hero-actions-group standalone-order-route-actions-group">
                    ${
                      canCancel
                        ? `<button type="button" class="customer-btn customer-btn-danger" data-invoice-cancel data-order-id="${escapeHtml(
                            invoice.remote_id || "",
                          )}" data-order-code="${escapeHtml(invoice.code || "")}">Hủy đơn</button>`
                        : ""
                    }
                    <a class="customer-btn customer-btn-ghost" href="${escapeHtml(
                      getProjectUrl("khach-hang/danh-sach-don-hang-chuyendon.html"),
                    )}">Về lịch sử đơn</a>
                  </div>
                  ${renderHeroRouteCard(invoice)}
                </div>
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
                          getRenderableServiceDetails(invoice.service_details),
                          "Không có hạng mục bổ sung ngoài thông tin chính.",
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
                  </div>
                  ${renderTimeline(timeline)}
                </article>
                <article class="standalone-order-media-card" id="customer-invoice-attachments">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Ảnh/video khách đính kèm khi đặt đơn</strong>
                      <p>Media được gửi từ form đặt lịch ban đầu của đơn hàng.</p>
                    </div>
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
      ?.addEventListener("click", async function (event) {
        const trigger = event.currentTarget;
        if (trigger.disabled) {
          return;
        }

        const reason = await openCancelConfirmDialog(invoice);
        if (reason === null) {
          return;
        }

        try {
          trigger.disabled = true;
          trigger.textContent = "Đang hủy...";
          const invoiceReference = getInvoiceReference(invoice, trigger);
          const result = await store.cancelBooking?.(invoiceReference, {
            cancel_reason: reason,
          });
          renderInvoice(result || null);
          core.notify?.("Đã hủy yêu cầu chuyển dọn.", "success");
        } catch (error) {
          trigger.disabled = false;
          trigger.textContent = "Hủy đơn";
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
          const removedImageIndexes = formData
            .getAll("remove_feedback_image_indexes[]")
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0);
          const removedVideoIndexes = formData
            .getAll("remove_feedback_video_indexes[]")
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0);
          const imageFiles = collectFiles(
            form.querySelector('input[name="customer_feedback_image"]'),
          );
          const videoFiles = collectFiles(
            form.querySelector('input[name="customer_feedback_video"]'),
          );
          let mediaWarning = "";
          let uploadedImageLinks = [];
          let uploadedVideoLinks = [];
          if (imageFiles.length) {
            try {
              uploadedImageLinks = (await core.uploadFilesToDrive(imageFiles, {
                proxyFile: "khach-hang/upload.php",
                uploadKind: "order_media",
              }))
                .map((item) =>
                  normalizeText(item?.url || item?.download_url || ""),
                )
                .filter(Boolean);
            } catch (error) {
              console.error("Cannot upload customer feedback images:", error);
              mediaWarning =
                "Ảnh đánh giá chưa được tải lên Google Drive; nội dung đánh giá vẫn được lưu.";
            }
          }
          if (videoFiles.length) {
            try {
              uploadedVideoLinks = (await core.uploadFilesToDrive(videoFiles, {
                proxyFile: "khach-hang/upload.php",
                uploadKind: "order_media",
              }))
                .map((item) =>
                  normalizeText(item?.url || item?.download_url || ""),
                )
                .filter(Boolean);
            } catch (error) {
              console.error("Cannot upload customer feedback videos:", error);
              mediaWarning = [
                mediaWarning,
                "Video đánh giá chưa được tải lên Google Drive; nội dung đánh giá vẫn được lưu.",
              ].filter(Boolean).join(" ");
            }
          }
          const baseImageAttachments = filterAttachmentValuesByIndexes(
            invoice?.customer_feedback_image_attachments,
            removedImageIndexes,
          );
          const baseVideoAttachments = filterAttachmentValuesByIndexes(
            invoice?.customer_feedback_video_attachments,
            removedVideoIndexes,
          );
          const mergedImageAttachments = mergeAttachmentValues(
            baseImageAttachments,
            uploadedImageLinks,
          );
          const mergedVideoAttachments = mergeAttachmentValues(
            baseVideoAttachments,
            uploadedVideoLinks,
          );
          let result = null;
          try {
            result = await store.saveBookingFeedback?.({
              id: invoice.remote_id || "",
              code: invoice.code || "",
            }, {
              customer_rating: formData.get("customer_rating") || 0,
              customer_feedback: formData.get("customer_feedback") || "",
              customer_feedback_image_attachments: mergedImageAttachments,
              customer_feedback_video_attachments: mergedVideoAttachments,
            });
          } catch (krudError) {
            console.error("Cannot save customer feedback to KRUD:", krudError);
            throw new Error(
              uploadedImageLinks.length || uploadedVideoLinks.length
                ? "Ảnh/video có thể đã tải lên Google Drive, nhưng đánh giá chưa được lưu vào hệ thống."
                : krudError?.message ||
                    "Không thể lưu đánh giá vào hệ thống lúc này.",
            );
          }
          renderInvoice(result || null);
          core.notify(
            mediaWarning || "Đã lưu đánh giá khách hàng.",
            mediaWarning ? "warning" : "success",
          );
        } catch (error) {
          core.notify(error?.message || "Không thể lưu đánh giá ở thời điểm hiện tại.", "error");
        } finally {
          const form = event.currentTarget;
          const submitButton =
            form.querySelector('button[type="submit"]') || null;
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Lưu phản hồi";
          }
        }
      });

    const feedbackForm = root.querySelector("[data-customer-feedback-form]");
    if (feedbackForm) {
      bindFileSummary(
        feedbackForm.querySelector('input[name="customer_feedback_image"]'),
        feedbackForm.querySelector("[data-feedback-image-summary]"),
        "Chưa chọn ảnh",
      );
      bindFileSummary(
        feedbackForm.querySelector('input[name="customer_feedback_video"]'),
        feedbackForm.querySelector("[data-feedback-video-summary]"),
        "Chưa chọn video",
      );
    }

    root.querySelectorAll("[data-remove-media]").forEach((button) => {
      button.addEventListener("click", function () {
        const card = button.closest(".standalone-order-media-item-removable");
        const hiddenInput = card?.querySelector('input[type="hidden"]');
        if (!card || !hiddenInput) return;
        const willRemove = !card.classList.contains("is-removed");
        card.classList.toggle("is-removed", willRemove);
        hiddenInput.disabled = !willRemove;
      });
    });

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


