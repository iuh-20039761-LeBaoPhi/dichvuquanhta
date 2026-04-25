/**
 * admin-order-detail-master.js
 * 
 * BẢN SAO CHÍNH THỨC CỦA provider-order-detail.js
 * - Đã gỡ bỏ Logic Redirect đăng nhập.
 * - Giữ nguyên 100% Logic Render và CSS Classes của hệ thống gốc.
 * - Đảm bảo thông tin đầy đủ nhất (Pricing, Media, Timeline, Feedback).
 */

import core from "../../../../public/assets/js/modules/core/app-core.js";
import store from "../../../../public/assets/js/modules/main-customer-portal-store.js";
import {
  buildBookingLifecyclePatch,
  formatBookingDateOnly,
  formatBookingScheduleLabel,
  getRenderableBookingPricingRows,
  getBookingScheduleTimeLabel,
  getBookingServiceLabel,
  getBookingVehicleLabel,
  getBookingWeatherLabel,
  normalizeBookingPricingBreakdown,
  updateBookingRow,
} from "../../../../public/assets/js/modules/main-booking-shared.js";
import { validateProviderBookingAction } from "../../../../public/assets/js/modules/main-booking-actions.js";
import {
  extractRows,
  getKrudListFn,
} from "../../../../public/assets/js/modules/api/krud-client.js";
import { createProviderAutoRefreshController } from "../../../../public/assets/js/modules/main-provider-refresh.js";

const adminOrderMasterModule = (function (window, document) {
  const root = document.getElementById("provider-order-detail-root");
  if (!root) return;

  let refreshController = null;
  let currentDetailSignature = "";

  // --- RENDERING HELPERS (100% GỐC) ---
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function normalizeText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function normalizeLowerText(value) { return normalizeText(value).toLowerCase(); }
  function normalizePhone(value) { return String(value || "").replace(/[^\d+]/g, ""); }
  function splitPipeValues(value) { return String(value || "").split("|").map((item) => normalizeText(item)).filter(Boolean); }
  function parseNumber(value) {
    if (value == null || value === "") return 0;
    const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return "Chờ báo giá chốt";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  }

  function formatDateTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatDistance(value) {
    const distance = Number(value || 0);
    if (!Number.isFinite(distance) || distance <= 0) return "--";
    return `${distance.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} km`;
  }

  function getMilestones(detail) {
    const order = detail?.order || {};
    return {
      acceptedAt: normalizeText(order.accepted_at || ""),
      startedAt: normalizeText(order.started_at || ""),
      completedAt: normalizeText(order.completed_at || ""),
      cancelledAt: normalizeText(order.cancelled_at || ""),
    };
  }

  function deriveStatusKey(detail) {
    const order = detail?.order || {};
    const milestones = getMilestones(detail);
    const status = normalizeLowerText(order.trang_thai || "");
    if (milestones.cancelledAt || ["cancelled", "huy", "da_huy"].includes(status)) return "cancelled";
    if (milestones.completedAt || ["completed", "hoan_tat", "success", "da_xac_nhan", "xac_nhan", "confirmed"].includes(status)) return "completed";
    if (milestones.startedAt) return "shipping";
    if (milestones.acceptedAt) return "accepted";
    return "pending";
  }

  function getStatusBadge(statusKey) {
    const map = {
      cancelled: { className: "cancelled", label: "Đã hủy" },
      completed: { className: "completed", label: "Hoàn thành" },
      shipping: { className: "shipping", label: "Đang triển khai" },
      accepted: { className: "shipping", label: "Đã nhận đơn" },
      pending: { className: "pending", label: "Mới tiếp nhận" }
    };
    return map[statusKey] || map.pending;
  }

  function getProgressMeta(detail) {
    const statusKey = deriveStatusKey(detail);
    if (statusKey === "cancelled") return { percent: 100, tone: "cancelled", label: "Đã hủy", note: "Đơn đã bị hủy." };
    if (statusKey === "completed") return { percent: 100, tone: "completed", label: "Hoàn thành", note: "Đơn đã hoàn thành." };
    if (statusKey === "shipping") return { percent: 74, tone: "shipping", label: "Đang triển khai", note: "Đơn đang được triển khai." };
    if (statusKey === "accepted") return { percent: 42, tone: "shipping", label: "Đã nhận đơn", note: "Nhà cung cấp đã nhận đơn." };
    return { percent: 16, tone: "pending", label: "Chờ nhận đơn", note: "Đơn đang chờ nhận." };
  }

  function renderStatusBadge(statusKey) {
    const badge = getStatusBadge(statusKey);
    return `<span class="customer-status-badge status-${badge.className}">${badge.label}</span>`;
  }

  function renderInfoRow(label, value, options = {}) {
    const safeValue = options.valueHtml ? (value || "--") : escapeHtml(value || "--");
    return `<div class="standalone-order-info-row"><span>${escapeHtml(label)}</span><strong class="standalone-order-info-value">${safeValue}</strong></div>`;
  }

  function renderHeroMetric(icon, label, value, hint, options = {}) {
    const safeValue = options.valueHtml ? (value || "--") : escapeHtml(value || "--");
    return `
      <article class="standalone-order-hero-metric ${options.className || ""}">
        <div class="standalone-order-hero-metric-icon"><i class="${icon}"></i></div>
        <div class="standalone-order-hero-metric-copy"><span>${escapeHtml(label)}</span><strong>${safeValue}</strong><small>${escapeHtml(hint || "")}</small></div>
      </article>
    `;
  }

  function renderHeroRouteCard(order) {
    return `
      <article class="standalone-order-hero-metric standalone-order-hero-metric-route">
        <div class="standalone-order-hero-metric-copy">
          <span>Lộ trình thực hiện</span>
          <div class="standalone-order-hero-route-list">
            <div class="standalone-order-hero-route-item">
              <span class="standalone-order-hero-route-icon"><i class="fa-solid fa-location-dot"></i></span>
              <div class="standalone-order-hero-route-copy"><small>Điểm đi</small><strong>${escapeHtml(order.from_address || "--")}</strong></div>
            </div>
            <div class="standalone-order-hero-route-item">
              <span class="standalone-order-hero-route-icon"><i class="fa-solid fa-flag-checkered"></i></span>
              <div class="standalone-order-hero-route-copy"><small>Điểm đến</small><strong>${escapeHtml(order.to_address || "--")}</strong></div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderChipList(items, emptyText) {
    if (!items.length) return `<div class="standalone-order-note-panel"><p>${emptyText}</p></div>`;
    return `<div class="standalone-order-item-meta">${items.map(i => `<span class="standalone-order-chip">${escapeHtml(i)}</span>`).join("")}</div>`;
  }

  function renderPricingRows(order) {
    const rows = getRenderableBookingPricingRows(order.pricing_breakdown);
    if (!rows.length) return renderInfoRow("Chi tiết phí", "Chưa có bảng giá chi tiết");
    return rows.map(r => renderInfoRow(r.label, r.amount || formatCurrency(r.amount_value))).join("");
  }

  function renderAttachmentGallery(order) {
    const media = [
      ...order.image_attachments.map(v => ({ type: "image", val: v, icon: "fa-image" })),
      ...order.video_attachments.map(v => ({ type: "video", val: v, icon: "fa-video" }))
    ];
    if (!media.length) return '<div class="standalone-order-note-panel"><p>Không có tài liệu gửi kèm.</p></div>';
    return `<div class="standalone-order-media-grid">${media.map(m => `
      <div class="standalone-order-media-item">
        <div class="standalone-order-item-icon"><i class="fa-solid ${m.icon}"></i></div>
        <strong>Tệp đính kèm</strong>
      </div>
    `).join("")}</div>`;
  }

  function renderMediaGallery(items, emptyText) {
    const media = Array.isArray(items) ? items.filter((item) => String(item?.val || "").trim()) : [];
    if (!media.length) return `<div class="standalone-order-note-panel"><p>${escapeHtml(emptyText)}</p></div>`;
    return `<div class="standalone-order-media-grid">${media.map((item) => `
      <div class="standalone-order-media-item">
        <div class="standalone-order-item-icon"><i class="fa-solid ${escapeHtml(item.icon)}"></i></div>
        <strong>${escapeHtml(item.label)}</strong>
      </div>
    `).join("")}</div>`;
  }

  function renderTimeline(detail) {
    const order = detail.order;
    const m = getMilestones(detail);
    const steps = [{ time: order.created_at, title: "Yêu cầu khởi tạo", note: "Đã ghi nhận yêu cầu vào hệ thống." }];
    if (m.acceptedAt) steps.push({ time: m.acceptedAt, title: "Đã nhận đơn", note: "Nhà cung cấp đã tiếp nhận xử lý." });
    if (m.startedAt) steps.push({ time: m.startedAt, title: "Đang triển khai", note: "Bắt đầu làm việc tại hiện trường." });
    if (m.completedAt) steps.push({ time: m.completedAt, title: "Hoàn thành", note: "Yêu cầu đã được xác nhận hoàn tất." });
    if (m.cancelledAt) steps.push({ time: m.cancelledAt, title: "Đã hủy", note: "Yêu cầu đã bị hủy bỏ." });

    return `<div class="standalone-order-timeline">${steps.map((s, i) => `
      <article class="standalone-order-timeline-item">
        <div class="standalone-order-timeline-dot ${i === steps.length - 1 ? "is-active" : ""}"></div>
        <div class="standalone-order-timeline-content"><small>${formatDateTime(s.time)}</small><strong>${s.title}</strong><p>${s.note}</p></div>
      </article>`).join("")}</div>`;
  }

  function renderFeedbackBlock(detail) {
    const order = detail.order;
    const rating = Math.round(order.customer_rating || 0);
    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header"><p class="standalone-order-block-kicker">Đánh giá</p><h2>Phản hồi khách hàng</h2></div>
        <div class="standalone-order-side-stack standalone-order-review-layout standalone-order-review-layout-inline">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head"><strong>Xếp hạng</strong><span class="standalone-order-chip">${rating}/5 sao</span></div>
            <div class="standalone-order-note-panel"><p>${Array.from({length:5}, (_,i) => `<i class="${i < rating ? 'fa-solid' : 'fa-regular'} fa-star admin-detail-star"></i>`).join("")}</p></div>
            <p class="standalone-order-note-text">${escapeHtml(order.customer_feedback || "Chưa có phản hồi từ khách.")}</p>
            ${renderMediaGallery([
              ...order.customer_feedback_image_attachments.map((val, index) => ({ icon: "fa-image", label: `Ảnh phản hồi ${index + 1}`, val })),
              ...order.customer_feedback_video_attachments.map((val, index) => ({ icon: "fa-video", label: `Video phản hồi ${index + 1}`, val }))
            ], "Chưa có ảnh/video phản hồi.")}
          </article>
        </div>
      </section>
    `;
  }

  function renderProviderReportBlock(detail) {
    const order = detail.order;
    const hasReport = Boolean(
      normalizeText(order.provider_note || "") ||
      order.provider_report_image_attachments.length ||
      order.provider_report_video_attachments.length
    );

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header"><p class="standalone-order-block-kicker">Báo cáo</p><h2>Báo cáo nhà cung cấp</h2></div>
        <div class="standalone-order-side-stack standalone-order-review-layout standalone-order-review-layout-inline">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head"><strong>Báo cáo nhà cung cấp</strong><span class="standalone-order-chip">${hasReport ? "Đã gửi" : "Chưa có"}</span></div>
            <p class="standalone-order-note-text">${escapeHtml(order.provider_note || "Chưa có báo cáo từ nhà cung cấp.")}</p>
            ${renderMediaGallery([
              ...order.provider_report_image_attachments.map((val, index) => ({ icon: "fa-image", label: `Ảnh báo cáo ${index + 1}`, val })),
              ...order.provider_report_video_attachments.map((val, index) => ({ icon: "fa-video", label: `Video báo cáo ${index + 1}`, val }))
            ], "Chưa có ảnh/video báo cáo.")}
          </article>
        </div>
      </section>
    `;
  }

  function applyProgressRing(scope, selector = ".standalone-order-progress-ring[data-progress]") {
    (scope || document).querySelectorAll(selector).forEach((node) => {
      const value = Number(node.getAttribute("data-progress") || 0);
      node.style.setProperty("--progress", `${value}%`);
    });
  }

  function render(detail) {
    const order = detail.order;
    const prog = getProgressMeta(detail);
    currentDetailSignature = JSON.stringify(order);

    root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <div class="standalone-order-topbar admin-standalone-topbar">
            <div class="standalone-order-topbar-center">
              <h2 class="standalone-order-topbar-title">Chi tiết yêu cầu hệ thống</h2>
            </div>
          </div>

          <header class="standalone-order-card-header">
            <div class="standalone-order-header-main-content">
              <div class="standalone-order-hero-top-row">
                <div class="standalone-order-card-title">
                  <p class="standalone-order-card-kicker">Mã quản lý</p>
                  <h1>${order.code}</h1>
                  <p class="standalone-order-card-subtitle">${order.service_label}</p>
                </div>
                <div class="standalone-order-hero-side-progress">
                    <div class="standalone-order-progress-ring status-${prog.tone}" data-progress="${prog.percent}">
                      <div class="standalone-order-progress-ring-core"><strong>${prog.percent}%</strong><span>Tiến độ</span></div>
                    </div>
                </div>
              </div>

              <div class="standalone-order-hero-metrics">
                ${renderHeroMetric("fa-solid fa-wallet", "Dự chi", formatCurrency(order.estimated_amount), order.vehicle_label, { className: "standalone-order-hero-metric-primary" })}
                ${renderHeroMetric("fa-solid fa-calendar-check", "Lịch thực hiện", order.schedule_label, order.schedule_time)}
                ${renderHeroMetric("fa-solid fa-signal", "Trạng thái", renderStatusBadge(deriveStatusKey(detail)), prog.note, { valueHtml: true })}
                ${renderHeroRouteCard(order)}
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
               <div class="standalone-order-block-header"><h2>Dữ liệu vận hành</h2></div>
               <div class="standalone-order-summary-grid">
                  <div class="standalone-order-panel">
                    <div class="standalone-order-panel-head"><strong>Thông tin chung</strong></div>
                    <div class="standalone-order-info-list">${renderInfoRow("Ngày tạo", formatDateTime(order.created_at))}${renderInfoRow("Khoảng cách", formatDistance(order.distance_km))}</div>
                  </div>
                  <div class="standalone-order-panel">
                    <div class="standalone-order-panel-head"><strong>Chi phí chi tiết</strong></div>
                    <div class="standalone-order-info-list">${renderPricingRows(order)}</div>
                  </div>
               </div>
            </section>

            <section class="standalone-order-block">
               <div class="standalone-order-block-header"><h2>Nhân sự & Điểm đến</h2></div>
               <div class="standalone-order-contact-grid">
                  <div class="standalone-order-contact-card">
                    <div class="standalone-order-panel-head"><strong>Khách hàng</strong></div>
                    <div class="standalone-order-info-list">
                      ${renderInfoRow("Người liên hệ", order.customer_name)}
                      ${renderInfoRow("Số điện thoại", order.customer_phone)}
                      ${renderInfoRow("Email", order.customer_email)}
                      ${renderInfoRow("Công ty", order.company_name)}
                      ${renderInfoRow("Nhà cung cấp", order.provider_owner_name)}
                    </div>
                  </div>
                  <div class="standalone-order-contact-note">
                    <div class="standalone-order-panel-head"><strong>Lưu ý & Dịch vụ kèm</strong></div>
                    <div class="standalone-order-note-panel"><p>${escapeHtml(order.note || "Không có ghi chú.")}</p></div>
                    <div class="standalone-order-side-stack">
                        <div><small>Điều kiện tiếp cận:</small>${renderChipList(order.access_conditions, "Trống")}</div>
                        <div class="admin-detail-chip-group"><small>Hạng mục chi tiết:</small>${renderChipList(order.service_details, "Trống")}</div>
                    </div>
                  </div>
               </div>
            </section>

            <section class="standalone-order-block">
               <div class="standalone-order-block-header"><h2>Gallery & Timeline</h2></div>
               <div class="standalone-order-summary-grid">
                  <div class="standalone-order-panel"><strong>Tiến độ mốc</strong>${renderTimeline(detail)}</div>
                  <div class="standalone-order-panel"><strong>Hiện trường</strong>${renderAttachmentGallery(order)}</div>
               </div>
            </section>
            
            ${renderFeedbackBlock(detail)}
            ${renderProviderReportBlock(detail)}
          </div>
        </section>
      </div>
    `;
    applyProgressRing(root);
  }

  function normalizeDetail(row) {
    const pricing = normalizeBookingPricingBreakdown(row.pricing_breakdown_json);
    return {
      order: {
        id: row.id,
        code: store.resolveBookingRowCode?.(row) || "CDL-" + row.id,
        trang_thai: normalizeLowerText(row.trang_thai || ""),
        service_label: getBookingServiceLabel(row.loai_dich_vu),
        created_at: row.created_at,
        accepted_at: row.accepted_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        cancelled_at: row.cancelled_at,
        customer_name: row.ho_ten,
        customer_phone: row.so_dien_thoai,
        customer_email: row.customer_email,
        company_name: row.ten_cong_ty,
        from_address: row.dia_chi_di,
        to_address: row.dia_chi_den,
        schedule_label: formatBookingScheduleLabel(row.ngay_thuc_hien, row.khung_gio_thuc_hien),
        schedule_time: getBookingScheduleTimeLabel(row.khung_gio_thuc_hien),
        vehicle_label: getBookingVehicleLabel(row.loai_xe),
        distance_km: parseNumber(row.khoang_cach_km),
        estimated_amount: parseNumber(row.tong_tam_tinh),
        pricing_breakdown: pricing,
        note: row.ghi_chu,
        access_conditions: splitPipeValues(row.dieu_kien_tiep_can),
        service_details: splitPipeValues(row.chi_tiet_dich_vu),
        image_attachments: splitPipeValues(row.anh_dinh_kem),
        video_attachments: splitPipeValues(row.video_dinh_kem),
        provider_owner_name: row.provider_name || row.provider_owner_name || "Chưa có",
        customer_feedback: row.customer_feedback,
        customer_rating: row.customer_rating,
        customer_feedback_image_attachments: splitPipeValues(row.customer_feedback_anh_dinh_kem || row.customer_feedback_image_attachments),
        customer_feedback_video_attachments: splitPipeValues(row.customer_feedback_video_dinh_kem || row.customer_feedback_video_attachments),
        provider_note: row.provider_note,
        provider_report_image_attachments: splitPipeValues(row.provider_report_anh_dinh_kem || row.provider_note_anh_dinh_kem || row.provider_report_image_attachments),
        provider_report_video_attachments: splitPipeValues(row.provider_report_video_dinh_kem || row.provider_note_video_dinh_kem || row.provider_report_video_attachments)
      }
    };
  }

  async function fetchRow(id) {
    const listFn = getKrudListFn();
    let matched = null;

    for (let page = 1; page <= 20; page += 1) {
      const response = await listFn({
        table: "dich_vu_chuyen_don_dat_lich",
        page,
        limit: 100,
        sort: { id: "desc" }
      });
      const rows = extractRows(response);
      matched = rows.find(r => String(r.id) === String(id)) || null;
      if (matched || rows.length < 100) {
        break;
      }
    }

    if (!matched) return null;

    const providerId = String(matched.provider_id || "").trim();
    if (!providerId) return matched;

    const userResponse = await listFn({
      table: "nguoidung",
      page: 1,
      limit: 1,
      where: { id: providerId }
    });
    const providerRow = extractRows(userResponse)[0] || null;

    if (!providerRow) return matched;

    return {
      ...matched,
      provider_name: providerRow.hovaten || providerRow.name || matched.provider_name || "",
      provider_phone: providerRow.sodienthoai || providerRow.phone || matched.provider_phone || "",
      provider_address: providerRow.diachi || providerRow.address || matched.provider_address || ""
    };
  }

  // --- BOOTSTRAP (SKIP AUTH) ---
  (async function() {
    const id = core.getCurrentSearchParams().get("madonhang") || core.getCurrentSearchParams().get("id");
    if (!id) {
      root.innerHTML = "Thiếu mã đơn hàng.";
      return;
    }

    try {
      const row = await fetchRow(id);
      if (!row) {
          root.innerHTML = "Không tìm thấy đơn hàng #" + id;
          return;
      }
      render(normalizeDetail(row));
    } catch (e) {
      console.error(e);
      root.innerHTML = "Lỗi nạp dữ liệu: " + e.message;
    }
  })();

})(window, document);
