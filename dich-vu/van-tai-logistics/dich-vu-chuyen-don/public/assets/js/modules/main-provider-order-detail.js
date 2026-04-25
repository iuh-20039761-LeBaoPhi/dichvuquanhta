import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";
import {
  buildBookingLifecyclePatch,
  ensureBookingVehicleLabelMapLoaded,
  formatBookingDateOnly,
  formatBookingScheduleLabel,
  getRenderableBookingPricingRows,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
  getBookingVehicleLabel,
  normalizeBookingPricingBreakdown,
  updateBookingRow,
} from "./main-booking-shared.js";
import { validateProviderBookingAction } from "./main-booking-actions.js";
import {
  extractRows,
  getKrudListFn,
} from "./api/krud-client.js";
import { createProviderAutoRefreshController } from "./main-provider-refresh.js";

const providerOrderDetailModule = (function (window, document) {
  if (window.__fastGoProviderOrderDetailLoaded) return window.__fastGoProviderOrderDetailModule || null;
  window.__fastGoProviderOrderDetailLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-order-detail") {
    return;
  }

  const root = document.getElementById("provider-order-detail-root");
  if (!root || !store) return;
  let refreshController = null;
  let currentProfile = null;
  let currentDetailSignature = "";

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

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function splitPipeValues(value) {
    return String(value || "")
      .split("|")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function joinPipeValues(values) {
    return (Array.isArray(values) ? values : [])
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join(" | ");
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
    const resolved = resolveAttachmentUrls(value);
    return resolved.viewUrl || resolved.url;
  }

  function getAttachmentPreviewUrl(value, type) {
    const resolved = resolveAttachmentUrls(value);
    if (!resolved.url) return "";
    if (type === "image") {
      return resolved.thumbnailUrl || resolved.url;
    }
    return resolved.url;
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

  function parseNumber(value) {
    if (value == null || value === "") return 0;
    const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
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

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function"
      ? core.toProjectUrl(path)
      : path;
  }

  function redirectToMatchingDetail(role, orderCode) {
    const normalizedRole = normalizeText(role).toLowerCase();
    const targetOrderCode =
      normalizeText(orderCode) || normalizeText(core.getOrderIdentifierFromUrl?.() || "");
    if (!targetOrderCode) {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const targetPath =
      normalizedRole === "khach-hang"
        ? "chi-tiet-hoa-don-chuyendon.html"
        : "nha-cung-cap/chi-tiet-don-hang-chuyendon.html";
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

    window.location.href = core.getSharedLoginUrl({
      redirect: core.getCurrentRelativeUrl(),
    });
  }

  function resolveBookingRowCode(row) {
    return store.resolveBookingRowCode?.(row) || normalizeText(row?.id || row?.remote_id || "");
  }

  function getCurrentProviderActor() {
    return (
      store.getCurrentProviderActor?.(currentProfile) || {
        id: "",
        loginIdentifier: "",
        phone: "",
        name: "",
      }
    );
  }

  function resolveProviderOwnership(row) {
    return {
      id: normalizeText(row?.provider_id || ""),
      phone: "",
      name: "",
    };
  }

  function getProviderOwnershipMeta(row) {
    const owner = resolveProviderOwnership(row);
    const actor = getCurrentProviderActor();
    const hasOwner = !!owner.id;
    const isOwnedByCurrentProvider = !!(
      owner.id &&
      actor.id &&
      owner.id === actor.id
    );

    return {
      owner,
      hasOwner,
      isOwnedByCurrentProvider,
      isLockedByOtherProvider: hasOwner && !isOwnedByCurrentProvider,
    };
  }

  function getDetailRenderSignature(detail) {
    try {
      return JSON.stringify(detail?.order || {});
    } catch (error) {
      return `${detail?.order?.id || ""}:${detail?.order?.updated_at || ""}`;
    }
  }

  function getMilestones(detail) {
    const order = detail?.order || {};
    return {
      acceptedAt: normalizeText(order.accepted_at || order.acceptedAt || ""),
      startedAt: normalizeText(order.started_at || order.startedAt || ""),
      completedAt: normalizeText(order.completed_at || order.completedAt || ""),
      cancelledAt: normalizeText(order.cancelled_at || order.cancelledAt || ""),
    };
  }

  function isExpiredPendingDetail(detail) {
    return !!store.isExpiredPendingBookingRow?.(detail?.rawRow || {}, Date.now());
  }

  function deriveStatusKey(detail) {
    return store.getBookingDisplayStatus?.(detail?.rawRow || detail?.order || {}).key || "pending";
  }

  function getStatusBadge(statusKey) {
    if (statusKey === "cancelled") {
      return { className: "cancelled", label: "Đã hủy" };
    }
    if (statusKey === "completed") {
      return { className: "completed", label: "Đã hoàn thành" };
    }
    if (statusKey === "shipping") {
      return { className: "shipping", label: "Đang triển khai" };
    }
    if (statusKey === "accepted") {
      return { className: "accepted", label: "Đã nhận đơn" };
    }
    return { className: "pending", label: "Mới tiếp nhận" };
  }

  function getProgressMeta(detail) {
    const statusKey = deriveStatusKey(detail);
    const expiredPending = isExpiredPendingDetail(detail);
    if (statusKey === "cancelled") {
      return {
        percent: 100,
        tone: "cancelled",
        label: "Đã hủy",
        note: expiredPending
          ? "Đơn đã quá thời gian chờ nhận và được hệ thống tự hủy."
          : "",
      };
    }
    if (statusKey === "completed") {
      return {
        percent: 100,
        tone: "completed",
        label: "Đã hoàn thành",
        note: "Đơn hàng đã hoàn thành.",
      };
    }
    if (statusKey === "shipping") {
      return {
        percent: 74,
        tone: "shipping",
        label: "Đang triển khai",
        note: "Đơn đang được triển khai.",
      };
    }
    if (statusKey === "accepted") {
      return {
        percent: 46,
        tone: "accepted",
        label: "Đã nhận đơn",
        note: "Nhà cung cấp đã nhận đơn.",
      };
    }
    return {
      percent: 24,
      tone: "pending",
      label: "Mới tiếp nhận",
      note: "Đơn đang chờ nhà cung cấp nhận xử lý.",
    };
  }

  function renderStatusBadge(statusKey) {
    const badge = getStatusBadge(statusKey);
    return `<span class="customer-status-badge status-${escapeHtml(
      badge.className,
    )}">${escapeHtml(badge.label)}</span>`;
  }

  function renderInfoRow(label, value, options = {}) {
    const safeLabel = escapeHtml(label || "--");
    const safeValue = options.valueHtml ? value || "--" : escapeHtml(value || "--");
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

  function buildScheduleSummary(order) {
    const dateLabel =
      formatBookingDateOnly(order?.schedule_date || "") ||
      normalizeText(order?.schedule_label);
    const timeLabel = getBookingScheduleTimeLabel(order?.schedule_time || "");
    if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`;
    return dateLabel || timeLabel || "Chưa chốt lịch";
  }

  function getCustomerOwnershipMeta(row) {
    return (
      store.resolveCustomerBookingOwnership?.(row) || {
        id: "",
        loginIdentifier: "",
        phone: normalizePhone(row?.so_dien_thoai || row?.phone || ""),
      }
    );
  }

  function renderHeroRouteCard(order) {
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
              <strong>${escapeHtml(order?.from_address || "--")}</strong>
            </div>
          </div>
          <div class="standalone-order-hero-route-item">
            <span class="standalone-order-hero-route-icon">
              <i class="fa-solid fa-flag-checkered"></i>
            </span>
            <div class="standalone-order-hero-route-copy">
              <small>Điểm đến</small>
              <strong>${escapeHtml(order?.to_address || "--")}</strong>
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
          .map((item) => `<span class="standalone-order-chip">${escapeHtml(item)}</span>`)
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

  function renderPricingRows(order) {
    const rows = getRenderableBookingPricingRows(order?.pricing_breakdown, {
      excludeLabelPatterns: [/loai xe|xe tai|binh thuong/i],
    })
      .map((item, index) =>
        renderInfoRow(
          item.label || `Hạng mục ${index + 1}`,
          item.amount || formatCurrency(item.amount_value || 0),
        ),
      );

    if (!rows.length) {
      return renderInfoRow("Chi tiết phí", "Chưa có bảng tạm tính chi tiết");
    }

    return rows.join("");
  }

  function renderAttachmentGallery(imageItems, videoItems, options = {}) {
    const imageLabelPrefix = options?.imageLabelPrefix || "Ảnh hiện trường";
    const videoLabelPrefix = options?.videoLabelPrefix || "Video hiện trường";
    const emptyMessage =
      options?.emptyMessage ||
      "Chưa có tài liệu hiện trường nào được gửi kèm cho đơn hàng này.";
    const mediaItems = [
      ...(Array.isArray(imageItems) ? imageItems : []).map((item, index) => ({
        type: "image",
        label: `${imageLabelPrefix} ${index + 1}`,
        value: item,
      })),
      ...(Array.isArray(videoItems) ? videoItems : []).map((item, index) => ({
        type: "video",
        label: `${videoLabelPrefix} ${index + 1}`,
        value: item,
      })),
    ].filter((item) => normalizeText(item.value));

    if (!mediaItems.length) {
      return `<div class="standalone-order-note-panel"><p>${escapeHtml(
        emptyMessage,
      )}</p></div>`;
    }

    return `
      <div class="standalone-order-media-grid">
        ${mediaItems
          .map((item) => {
            const attachmentValue = normalizeText(item.value);
            const attachmentHref = getAttachmentHref(attachmentValue);
            const previewUrl = getAttachmentPreviewUrl(
              attachmentValue,
              item.type,
            );
            const attachmentName =
              getAttachmentFileName(attachmentValue) || attachmentValue;
            const mediaPreview =
              item.type === "image" && previewUrl
                ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(item.label)}" />`
                : item.type === "video" && previewUrl
                  ? `<video src="${escapeHtml(previewUrl)}" controls preload="metadata"></video>`
                  : `<div class="standalone-order-item-icon">
                      <i class="${escapeHtml(item.type === "video" ? "fa-solid fa-video" : "fa-solid fa-image")}"></i>
                    </div>`;

            return `
              <a class="standalone-order-media-item" href="${escapeHtml(
                attachmentHref || "#",
              )}" target="_blank" rel="noreferrer">
                ${mediaPreview}
              </a>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function getShipperAction(detail) {
    const status = deriveStatusKey(detail);
    const milestones = getMilestones(detail);
    if (status === "cancelled" || status === "completed") return "";
    if (!milestones.acceptedAt) return "accept";
    if (!milestones.startedAt) return "start";
    if (!milestones.completedAt) return "complete";
    return "";
  }

  function buildActionButtons(detail) {
    const action = getShipperAction(detail);
    const isLockedByOtherProvider = detail?.order?.is_locked_by_other_provider === true;
    const isSelfOwnedBooking = detail?.order?.is_self_owned_booking === true;
    const buttons = [];

    if (action && isLockedByOtherProvider) {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-ghost" disabled aria-disabled="true">Đơn đã có NCC khác nhận</button>',
      );
    } else if (action === "accept" && isSelfOwnedBooking) {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-ghost" disabled aria-disabled="true">Không thể nhận đơn do chính mình đặt</button>',
      );
    } else if (action === "accept") {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-primary" data-order-action="accept">Nhận đơn</button>',
      );
    }
    if (action === "start") {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-primary" data-order-action="start">Bắt đầu</button>',
      );
    }
    if (action === "complete") {
      buttons.push(
        '<button type="button" class="customer-btn customer-btn-primary" data-order-action="complete">Hoàn thành</button>',
      );
    }

    buttons.push(
      `<a href="${escapeHtml(getProjectUrl("nha-cung-cap/danh-sach-don-hang-chuyendon.html"))}" class="customer-btn customer-btn-ghost">Về đơn khách hàng đặt cho tôi</a>`,
    );

    return buttons.join("");
  }

  function renderError(message) {
    root.innerHTML = `
      <div class="standalone-order-error">
        <div>
          <i class="fa-solid fa-circle-exclamation"></i>
          <p>${escapeHtml(message)}</p>
        </div>
      </div>
    `;
  }

  function isEditingProviderDetail() {
    const activeElement = document.activeElement;
    if (!activeElement || !root.contains(activeElement)) return false;
    if (activeElement.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
  }

  function normalizeDetail(row) {
    const code = resolveBookingRowCode(row);
    const statusKey = deriveStatusKey({ order: row });
    const statusMeta = getStatusBadge(statusKey);
    const pricingBreakdown = normalizeBookingPricingBreakdown(
      row?.pricing_breakdown_json,
    );
    const ownership = getProviderOwnershipMeta(row);
    const customerOwnership = getCustomerOwnershipMeta(row);
    return {
      order: {
        id: normalizeText(row?.id || ""),
        code,
        status: normalizeText(row?.trang_thai || row?.status || ""),
        trang_thai: normalizeText(row?.trang_thai || row?.status || ""),
        status_label: statusMeta.label,
        service_label: getBookingServiceLabel(
          row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn",
        ),
        created_at: normalizeText(row?.created_at || row?.created_date || ""),
        updated_at: normalizeText(row?.updated_at || ""),
        accepted_at: normalizeText(row?.accepted_at || ""),
        started_at: normalizeText(row?.started_at || ""),
        completed_at: normalizeText(row?.completed_at || ""),
        cancelled_at: normalizeText(row?.cancelled_at || ""),
        customer_name: normalizeText(row?.ho_ten || ""),
        customer_phone: normalizeText(row?.so_dien_thoai || ""),
        customer_email: normalizeText(row?.customer_email || ""),
        customer_id: customerOwnership.id,
        customer_login_identifier: customerOwnership.loginIdentifier,
        company_name: normalizeText(row?.ten_cong_ty || ""),
        from_address: normalizeText(row?.dia_chi_di || ""),
        to_address: normalizeText(row?.dia_chi_den || ""),
        schedule_date: formatBookingDateOnly(row?.ngay_thuc_hien || ""),
        schedule_time: getBookingScheduleTimeLabel(
          row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien || "",
        ),
        schedule_label: formatBookingScheduleLabel(
          row?.ngay_thuc_hien || "",
          row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien || "",
        ),
        vehicle_label: getBookingVehicleLabel(
          row?.loai_xe || row?.ten_loai_xe || "",
        ),
        distance_km: parseNumber(row?.khoang_cach_km || 0),
        estimated_amount: parseNumber(row?.tong_tam_tinh || 0),
        pricing_breakdown: pricingBreakdown,
        note: normalizeText(row?.ghi_chu || ""),
        summary: normalizeText(row?.ghi_chu || ""),
        access_conditions: splitPipeValues(row?.dieu_kien_tiep_can),
        service_details: splitPipeValues(row?.chi_tiet_dich_vu),
        booking_image_attachments: splitPipeValues(row?.anh_dinh_kem),
        booking_video_attachments: splitPipeValues(row?.video_dinh_kem),
        image_attachments: splitPipeValues(row?.anh_dinh_kem),
        video_attachments: splitPipeValues(row?.video_dinh_kem),
        customer_feedback_image_attachments: splitPipeValues(
          row?.customer_feedback_anh_dinh_kem ||
            row?.customer_feedback_image_attachments,
        ),
        customer_feedback_video_attachments: splitPipeValues(
          row?.customer_feedback_video_dinh_kem ||
            row?.customer_feedback_video_attachments,
        ),
        provider_report_image_attachments: splitPipeValues(
          row?.provider_report_anh_dinh_kem ||
            row?.provider_note_anh_dinh_kem ||
            row?.provider_report_image_attachments,
        ),
        provider_report_video_attachments: splitPipeValues(
          row?.provider_report_video_dinh_kem ||
            row?.provider_note_video_dinh_kem ||
            row?.provider_report_video_attachments,
        ),
        provider_note: normalizeText(row?.provider_note || ""),
        customer_feedback: normalizeText(row?.customer_feedback || ""),
        customer_rating: parseNumber(row?.customer_rating || 0),
        provider_owner_id: ownership.owner.id,
        provider_owner_phone: "",
        provider_owner_name: "",
        is_owned_by_current_provider: ownership.isOwnedByCurrentProvider,
        is_locked_by_other_provider: ownership.isLockedByOtherProvider,
        is_self_owned_booking: !!store.isRowOwnedByProviderActor?.(
          row,
          getCurrentProviderActor(),
        ),
      },
      rawRow: row,
    };
  }

  async function fetchBookingRowByCode(code, options = {}) {
    await ensureBookingVehicleLabelMapLoaded();
    if (!options?.skipAutoSweep) {
      await store.autoCancelExpiredBookings?.({
        force: options?.forceAutoSweep === true,
      });
    }

    let listFn = getKrudListFn();
    if (!listFn && typeof store.fetchProfile === "function") {
      await store.fetchProfile();
      listFn = getKrudListFn();
    }
    if (!listFn) throw new Error("Không tìm thấy API KRUD để tải chi tiết đơn hàng.");

    const normalizedCode = normalizeLowerText(code);
    const limit = 200;

    for (let page = 1; page <= 10; page += 1) {
      const response = await Promise.resolve(
        listFn({
          table: store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich",
          page,
          limit,
          sort: { created_at: "desc" },
        }),
      );

      const rows = extractRows(response);
      if (!rows.length) break;

      const matched = rows.find((row) => {
        if (!store.matchesBookingCode?.(row, normalizedCode)) return false;
        const ownership = getProviderOwnershipMeta(row);
        return !ownership.isLockedByOtherProvider;
      });

      if (matched) return matched;
      if (rows.length < limit) break;
    }

    return null;
  }

  async function updateBookingAction(detail, action, payload = {}) {
    const order = detail?.order || {};
    if (!order.id) {
      throw new Error("Không tìm thấy id đơn hàng để cập nhật.");
    }

    const actor = getCurrentProviderActor();
    validateProviderBookingAction(order, action, { actor });

    if (["accept", "start", "complete"].includes(action)) {
      await store.autoCancelExpiredBookings?.({ force: true });
      const refreshedRow = await fetchBookingRowByCode(
        resolveBookingRowCode(order),
        { skipAutoSweep: true },
      );
      const latestStatus = normalizeLowerText(
        refreshedRow?.trang_thai || refreshedRow?.status || "",
      );

      if (
        !refreshedRow ||
        ["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(
          latestStatus,
        )
      ) {
        throw new Error(
          "Yêu cầu này đã quá thời gian chờ và được hệ thống tự hủy.",
        );
      }

      validateProviderBookingAction(refreshedRow, action, { actor });
    }

    await updateBookingRow(
      order.id,
      buildBookingLifecyclePatch(order, action, payload, { actor }),
      {
        table: store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich",
      },
    );
  }

  async function saveProviderNote(detail, note, payload = {}) {
    await updateBookingAction(detail, "note", {
      provider_note: normalizeText(note || ""),
      ...payload,
    });
  }

  function renderTimeline(detail) {
    const order = detail?.order || {};
    const milestones = getMilestones(detail);
    const entries = [
      {
        time: order.created_at,
        title: "Yêu cầu đã ghi nhận",
        note: "Hệ thống đã lưu biểu mẫu chuyển dọn và đưa vào danh sách đơn hàng của nhà cung cấp.",
      },
    ];

    if (milestones.acceptedAt) {
      entries.push({
        time: milestones.acceptedAt,
        title: "Nhà cung cấp đã nhận đơn",
        note: "Đơn đã được nhận xử lý từ phía nhà cung cấp.",
      });
    }
    if (milestones.startedAt) {
      entries.push({
        time: milestones.startedAt,
        title: "Bắt đầu triển khai",
        note: "Đội vận hành đã bắt đầu xử lý yêu cầu ngoài hiện trường.",
      });
    }
    if (milestones.completedAt) {
      entries.push({
        time: milestones.completedAt,
        title: "Hoàn thành đơn hàng",
        note: "Nhà cung cấp đã xác nhận hoàn tất toàn bộ công việc cho đơn này.",
      });
    }
    if (milestones.cancelledAt || deriveStatusKey(detail) === "cancelled") {
      entries.push({
        time: milestones.cancelledAt || order.updated_at || order.created_at,
        title: "Yêu cầu bị hủy",
        note: "Đơn hàng đã được đánh dấu hủy trên hệ thống.",
      });
    }

    return `
      <div class="standalone-order-timeline">
        ${entries
          .map(
            (item, index) => `
              <article class="standalone-order-timeline-item">
                <div class="standalone-order-timeline-dot ${index === entries.length - 1 ? "is-active" : ""}"></div>
                <div class="standalone-order-timeline-content">
                  <small>${escapeHtml(formatDateTime(item.time))}</small>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.note)}</p>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderFeedbackBlock(detail) {
    const feedback = normalizeText(detail?.order?.customer_feedback || "");
    const rating = Number(detail?.order?.customer_rating || 0);
    const safeRating = Number.isFinite(rating)
      ? Math.min(5, Math.max(0, Math.round(rating)))
      : 0;
    const feedbackImageAttachments = Array.isArray(
      detail?.order?.customer_feedback_image_attachments,
    )
      ? detail.order.customer_feedback_image_attachments
      : [];
    const feedbackVideoAttachments = Array.isArray(
      detail?.order?.customer_feedback_video_attachments,
    )
      ? detail.order.customer_feedback_video_attachments
      : [];

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <p class="standalone-order-block-kicker">Phản hồi</p>
          <h2>Phản hồi khách hàng</h2>
        </div>
        <article class="standalone-order-subcard">
          <div class="standalone-order-subcard-head">
            <strong>Phản hồi khách hàng</strong>
            ${safeRating > 0 ? `<span class="standalone-order-chip">${escapeHtml(`${safeRating}/5 sao`)}</span>` : ""}
          </div>
          <div class="standalone-order-note-panel">
            <p>
              <span class="standalone-order-rating-stars" aria-label="${escapeHtml(
                `${safeRating}/5 sao`,
              )}">
                ${Array.from({ length: 5 }, (_, index) =>
                  `<i class="${escapeHtml(
                    index < safeRating
                      ? "fa-solid fa-star"
                      : "fa-regular fa-star",
                  )}"></i>`,
                ).join("")}
              </span>
            </p>
          </div>
          <p class="standalone-order-note-text">${escapeHtml(
            feedback || "Chưa đánh giá",
          )}</p>
          ${renderAttachmentGallery(
            feedbackImageAttachments,
            feedbackVideoAttachments,
            {
              imageLabelPrefix: "Ảnh phản hồi",
              videoLabelPrefix: "Video phản hồi",
              emptyMessage: "Chưa có ảnh/video phản hồi.",
            },
          )}
        </article>
      </section>
    `;
  }

  function renderProviderNoteBlock(detail) {
    const note = normalizeText(detail?.order?.provider_note || "");
    const providerReportImageAttachments = Array.isArray(
      detail?.order?.provider_report_image_attachments,
    )
      ? detail.order.provider_report_image_attachments
      : [];
    const providerReportVideoAttachments = Array.isArray(
      detail?.order?.provider_report_video_attachments,
    )
      ? detail.order.provider_report_video_attachments
      : [];
    const milestones = getMilestones(detail);
    const canEditNote =
      !!(milestones.acceptedAt || milestones.startedAt || milestones.completedAt) &&
      !milestones.cancelledAt;
    const helperText = canEditNote
      ? "Cập nhật tiến độ, vấn đề hiện trường hoặc lưu ý cần khách hàng theo dõi."
      : milestones.cancelledAt
        ? "Đơn đã hủy nên không thể cập nhật thêm."
        : "Chỉ có thể thêm ghi chú sau khi đơn đã được nhận.";

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <p class="standalone-order-block-kicker">Báo cáo</p>
          <h2>Ghi chú NCC</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú</strong>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(note || "Chưa có ghi chú")}</p>
            ${canEditNote ? "" : renderAttachmentGallery(
              providerReportImageAttachments,
              providerReportVideoAttachments,
              {
                imageLabelPrefix: "Ảnh báo cáo",
                videoLabelPrefix: "Video báo cáo",
                emptyMessage: "Chưa có ảnh/video.",
              },
            )}
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Cập nhật</strong>
            </div>
            ${
              canEditNote
                ? `
                  <form class="standalone-order-form" data-provider-note-form>
                    <label class="standalone-order-field">
                      <span>Ghi chú xử lý</span>
                      <textarea name="provider_note" rows="5" placeholder="${escapeHtml(helperText)}">${escapeHtml(note)}</textarea>
                    </label>
                    <div class="standalone-order-upload-grid">
                      <div class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <label class="standalone-order-upload-picker">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                          <strong>Chụp hoặc gửi ảnh báo cáo</strong>
                          <input type="file" name="provider_note_image" accept="image/*" multiple hidden />
                          <span class="standalone-order-upload-meta" data-provider-image-summary>Chưa chọn ảnh</span>
                        </label>
                        ${renderEditableAttachmentGallery(
                          providerReportImageAttachments,
                          "image",
                          {
                            removeName: "remove_provider_report_image_indexes[]",
                            removeButtonLabel: "Xóa ảnh báo cáo",
                            removedLabel: "Sẽ xóa khi lưu",
                            hideEmpty: true,
                            labelPrefix: "Ảnh báo cáo",
                          },
                        )}
                      </div>
                      <div class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <label class="standalone-order-upload-picker">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                          <strong>Gửi video báo cáo</strong>
                          <input type="file" name="provider_note_video" accept="video/*" multiple hidden />
                          <span class="standalone-order-upload-meta" data-provider-video-summary>Chưa chọn video</span>
                        </label>
                        ${renderEditableAttachmentGallery(
                          providerReportVideoAttachments,
                          "video",
                          {
                            removeName: "remove_provider_report_video_indexes[]",
                            removeButtonLabel: "Xóa video báo cáo",
                            removedLabel: "Sẽ xóa khi lưu",
                            hideEmpty: true,
                            labelPrefix: "Video báo cáo",
                          },
                        )}
                      </div>
                    </div>
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu ghi chú NCC</button>
                    </div>
                  </form>
                `
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(
                      note ? "Chỉ xem" : helperText,
                    )}</p>
                  </div>`
            }
          </article>
        </div>
      </section>
    `;
  }

  function render(detail) {
    const order = detail?.order || {};
    const progressMeta = getProgressMeta(detail);
    const statusKey = deriveStatusKey(detail);
    const statusBadge = renderStatusBadge(statusKey);
    const milestones = getMilestones(detail);
    const isCancelled = statusKey === "cancelled";
    const isCompleted = statusKey === "completed";
    const cancelledTimeLabel = formatDateTime(
      milestones.cancelledAt || order.cancelled_at || order.updated_at || "",
    );
    const completedTimeLabel = formatDateTime(
      milestones.completedAt || order.completed_at || "",
    );
    const scheduleSummary = buildScheduleSummary(order);
    currentDetailSignature = getDetailRenderSignature(detail);

    root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <div class="standalone-order-topbar">
            <div class="standalone-order-topbar-logo">
              <img src="${escapeHtml(getProjectUrl("public/assets/images/logo-dich-vu-quanh-ta.png"))}" alt="Logo Dịch Vụ Quanh Ta" />
            </div>
            <div class="standalone-order-topbar-center">
              <h2 class="standalone-order-topbar-title">Chi tiết đơn hàng</h2>
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
                    <h1>${escapeHtml(order.service_label || "Dịch vụ Chuyển Dọn")}</h1>
                    <p class="standalone-order-card-subtitle standalone-order-reference">${escapeHtml(order.code || "--")}</p>
                  </div>
                  <div class="standalone-order-hero-summary-grid standalone-order-hero-fee-distance-row">
                    ${renderHeroStat(
                      "Tạm tính",
                      formatCurrency(order.estimated_amount),
                      "Mức tạm tính hiện tại",
                      { className: "standalone-order-hero-stat--amount" },
                    )}
                    ${renderHeroStat(
                      "Khoảng cách",
                      formatDistance(order.distance_km),
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
                        <time>Thực hiện: ${escapeHtml(scheduleSummary)}</time>
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

              <div class="standalone-order-hero-support-grid standalone-order-hero-support-grid--route-only">
                <div class="standalone-order-hero-route-stack">
                  <div class="standalone-order-actions-group standalone-order-hero-actions-group standalone-order-route-actions-group">
                    ${buildActionButtons(detail)}
                  </div>
                  ${renderHeroRouteCard(order)}
                </div>
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Thông tin đơn hàng</h2>
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel standalone-order-panel-overview">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Chi tiết đơn</strong>
                      <p>Những thông tin cần rà nhanh khi xử lý đơn.</p>
                    </div>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Khảo sát", order.service_details.some((item) => normalizeLowerText(item).includes("khảo sát trước")) ? "Cần khảo sát trước" : "Không cần khảo sát trước")}
                    ${renderInfoRow("Loại xe", order.vehicle_label || "Chưa chốt loại xe")}
                  </div>
                </div>
                <div class="standalone-order-panel standalone-order-panel-fees" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Chi tiết tạm tính</strong>
                      <p>Các khoản phí đang cấu thành mức tạm tính của đơn hàng.</p>
                    </div>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderPricingRows(order)}
                  </div>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Khách hàng và lưu ý</h2>
              </div>
              <div class="standalone-order-contact-grid">
                <article class="standalone-order-contact-card">
                  <div class="standalone-order-contact-card-head">
                    <div class="standalone-order-contact-card-title">
                      <span class="standalone-order-contact-card-icon">
                        <i class="fa-solid fa-address-card"></i>
                      </span>
                      <div>
                        <strong>Thông tin khách hàng</strong>
                        <p>Đầu mối liên hệ của đơn hàng.</p>
                      </div>
                    </div>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Khách hàng", order.customer_name || "--")}
                    ${renderInfoRow("Số điện thoại", order.customer_phone || "--")}
                    ${renderInfoRow("Email", order.customer_email || "--")}
                    ${renderInfoRow("Đơn vị", order.company_name || "--")}
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
                          <strong>Lưu ý của khách hàng</strong>
                          <p>Thông tin cần lưu ý trước khi thực hiện.</p>
                        </div>
                      </div>
                    </div>
                    <div class="standalone-order-side-stack standalone-order-review-layout">
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Điều kiện tiếp cận</strong>
                        </div>
                        ${renderChipList(order.access_conditions, "Chưa có điều kiện tiếp cận đặc biệt được ghi nhận.")}
                      </article>
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Hạng mục đã chọn</strong>
                        </div>
                        ${renderChipList(
                          getRenderableServiceDetails(order.service_details),
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
                <h2>Tiến độ và tài liệu</h2>
              </div>
              <div class="standalone-order-summary-grid">
                <article class="standalone-order-timeline-card">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Tiến độ xử lý</strong>
                      <p>Các mốc chính từ lúc nhận đến khi hoàn tất.</p>
                    </div>
                  </div>
                  ${renderTimeline(detail)}
                </article>
                <article class="standalone-order-media-card" id="provider-order-attachments">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Ảnh/video khách đính kèm khi đặt đơn</strong>
                      <p>Media được gửi từ form đặt lịch ban đầu của đơn hàng.</p>
                    </div>
                  </div>
                  ${renderAttachmentGallery(
                    order.booking_image_attachments,
                    order.booking_video_attachments,
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

            ${renderFeedbackBlock(detail)}
            ${renderProviderNoteBlock(detail)}
          </div>
        </section>
      </div>
    `;

    root.querySelectorAll("[data-order-action]").forEach((button) => {
      button.addEventListener("click", async function () {
        const action = button.getAttribute("data-order-action");
        if (!action) return;

        try {
          await updateBookingAction(detail, action);
          const nextRow = await fetchBookingRowByCode(order.code || "");
          if (!nextRow) {
            throw new Error("Không thể tải lại đơn hàng sau khi cập nhật trạng thái.");
          }
          render(normalizeDetail(nextRow));
        } catch (error) {
          console.error("Cannot update provider booking action:", error);
          core.notify(error?.message || "Không thể cập nhật trạng thái đơn hàng lúc này.", "error");
        }
      });
    });

    root.querySelector("[data-provider-note-form]")?.addEventListener("submit", async function (event) {
      event.preventDefault();

      try {
        const form = event.currentTarget;
        const submitButton =
          form.querySelector('button[type="submit"]') || null;
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Đang lưu...";
        }

        const formData = new FormData(form);
        const removedImageIndexes = formData
          .getAll("remove_provider_report_image_indexes[]")
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0);
        const removedVideoIndexes = formData
          .getAll("remove_provider_report_video_indexes[]")
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0);
        const imageFiles = collectFiles(
          form.querySelector('input[name="provider_note_image"]'),
        );
        const videoFiles = collectFiles(
          form.querySelector('input[name="provider_note_video"]'),
        );
        let mediaWarning = "";
        let uploadedImageLinks = [];
        let uploadedVideoLinks = [];
        if (imageFiles.length) {
          try {
            uploadedImageLinks = (await core.uploadFilesToDrive(imageFiles, {
              proxyFile: "nha-cung-cap/upload.php",
              uploadKind: "order_media",
            }))
              .map((item) =>
                normalizeText(item?.url || item?.download_url || ""),
              )
              .filter(Boolean);
          } catch (error) {
            console.error("Cannot upload provider report images:", error);
            mediaWarning =
              "Ảnh báo cáo chưa được tải lên Google Drive; ghi chú vẫn được lưu.";
          }
        }
        if (videoFiles.length) {
          try {
            uploadedVideoLinks = (await core.uploadFilesToDrive(videoFiles, {
              proxyFile: "nha-cung-cap/upload.php",
              uploadKind: "order_media",
            }))
              .map((item) =>
                normalizeText(item?.url || item?.download_url || ""),
              )
              .filter(Boolean);
          } catch (error) {
            console.error("Cannot upload provider report videos:", error);
            mediaWarning = [
              mediaWarning,
              "Video báo cáo chưa được tải lên Google Drive; ghi chú vẫn được lưu.",
            ].filter(Boolean).join(" ");
          }
        }
        const baseImageAttachments = filterAttachmentValuesByIndexes(
          detail?.order?.provider_report_image_attachments,
          removedImageIndexes,
        );
        const baseVideoAttachments = filterAttachmentValuesByIndexes(
          detail?.order?.provider_report_video_attachments,
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

        try {
          await saveProviderNote(detail, formData.get("provider_note") || "", {
            provider_report_anh_dinh_kem: joinPipeValues(mergedImageAttachments),
            provider_report_video_dinh_kem: joinPipeValues(
              mergedVideoAttachments,
            ),
          });
        } catch (krudError) {
          console.error("Cannot save provider note to KRUD:", krudError);
          throw new Error(
            uploadedImageLinks.length || uploadedVideoLinks.length
              ? "Ảnh/video có thể đã tải lên Google Drive, nhưng ghi chú chưa được lưu vào hệ thống."
              : krudError?.message ||
                  "Không thể lưu ghi chú nhà cung cấp vào hệ thống lúc này.",
          );
        }
        const nextRow = await fetchBookingRowByCode(order.code || "");
        if (!nextRow) {
          throw new Error("Không thể tải lại đơn hàng sau khi lưu ghi chú.");
        }
        render(normalizeDetail(nextRow));
        core.notify(
          mediaWarning || "Đã lưu báo cáo nhà cung cấp.",
          mediaWarning ? "warning" : "success",
        );
      } catch (error) {
        console.error("Cannot save provider note:", error);
        core.notify(error?.message || "Không thể lưu ghi chú nhà cung cấp lúc này.", "error");
      } finally {
        const form = event.currentTarget;
        const submitButton =
          form.querySelector('button[type="submit"]') || null;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Lưu ghi chú NCC";
        }
      }
    });

    const providerNoteForm = root.querySelector("[data-provider-note-form]");
    if (providerNoteForm) {
      bindFileSummary(
        providerNoteForm.querySelector('input[name="provider_note_image"]'),
        providerNoteForm.querySelector("[data-provider-image-summary]"),
        "Chưa chọn ảnh",
      );
      bindFileSummary(
        providerNoteForm.querySelector('input[name="provider_note_video"]'),
        providerNoteForm.querySelector("[data-provider-video-summary]"),
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
  }

  (async function bootstrapProviderOrderDetail() {
    const auth = core.getOrderDetailAccessCredentials?.() || core.getUrlAuthCredentials?.() || {
      username: "",
      password: "",
    };
    await store.autoAuthFromUrlCredentials?.(auth);

    let profile = null;
    try {
      profile = await store.fetchProfile?.();
    } catch (error) {
      console.error("Cannot verify provider profile for detail:", error);
    }
    if (!profile) {
      store.clearAuthSession?.();
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }
    currentProfile = profile;

    const canUseProviderPortal =
      store.hasProviderCapability?.(profile || store.readIdentity?.()) || false;
    if (!canUseProviderPortal) {
      redirectToMatchingDetail(
        store.getSavedRole(),
        core.getOrderIdentifierFromUrl?.() || "",
      );
      return;
    }

    const orderCode = core.getOrderIdentifierFromUrl?.() || "";
    if (!orderCode) {
      renderError("Thiếu mã yêu cầu để hiển thị chi tiết đơn hàng.");
      return;
    }

    core.syncOrderDetailUrl?.({
      orderCode,
      path: window.location.pathname,
      username: auth.username,
      password: auth.password,
    });

    try {
      const row = await fetchBookingRowByCode(orderCode, {
        forceAutoSweep: true,
      });
      if (!row) {
        renderError("Không tìm thấy yêu cầu phù hợp trong bảng đặt lịch chuyển dọn.");
        return;
      }

      const resolvedOrderId = normalizeText(row?.id || row?.remote_id || "");
      if (resolvedOrderId) {
        core.syncOrderDetailUrl?.({
          orderCode: resolvedOrderId,
          path: window.location.pathname,
          username: auth.username,
          password: auth.password,
        });
      }

      render(normalizeDetail(row));
      refreshController = createProviderAutoRefreshController(window, {
        intervalMs: 60 * 1000,
        shouldPause: isEditingProviderDetail,
        onTick: async () => {
          const nextRow = await fetchBookingRowByCode(orderCode, {
            forceAutoSweep: true,
          });
          if (nextRow) {
            const nextDetail = normalizeDetail(nextRow);
            if (getDetailRenderSignature(nextDetail) !== currentDetailSignature) {
              render(nextDetail);
            }
          }
        },
      });
      refreshController.start();
    } catch (error) {
      console.error("Cannot load provider order detail:", error);
      renderError(error?.message || "Không thể tải chi tiết đơn hàng.");
    }
  })();
  window.addEventListener("beforeunload", function () {
    refreshController?.stop?.();
  });
  const moduleApi = {};
  window.__fastGoProviderOrderDetailModule = moduleApi;
  return moduleApi;
})(window, document);

export default providerOrderDetailModule;


