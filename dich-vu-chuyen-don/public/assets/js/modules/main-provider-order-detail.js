(function (window, document) {
  if (window.__fastGoProviderOrderDetailLoaded) return;
  window.__fastGoProviderOrderDetailLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-order-detail") {
    return;
  }

  const root = document.getElementById("provider-order-detail-root");
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
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeLowerText(value) {
    return normalizeText(value).toLowerCase();
  }

  function splitPipeValues(value) {
    return String(value || "")
      .split("|")
      .map((item) => normalizeText(item))
      .filter(Boolean);
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

  function getQueryCode() {
    try {
      return String(
        new URLSearchParams(window.location.search).get("code") || "",
      ).trim();
    } catch (error) {
      console.error("Cannot resolve provider booking code:", error);
      return "";
    }
  }

  function formatRequestDateCode(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function formatSystemRequestCode(recordId, createdAt) {
    const numericId = Number(recordId);
    if (!Number.isFinite(numericId) || numericId <= 0) return "";
    const dateCode = formatRequestDateCode(createdAt || new Date());
    if (!dateCode) return "";
    return `CDL-${dateCode}-${String(Math.trunc(Math.abs(numericId))).padStart(7, "0")}`;
  }

  function resolveBookingRowCode(row) {
    const explicitCode = normalizeText(
      row?.ma_yeu_cau_noi_bo || row?.ma_don_hang_noi_bo || row?.order_code || "",
    );
    if (explicitCode) return explicitCode;

    const fallbackSystemCode = formatSystemRequestCode(
      row?.id || row?.remote_id || "",
      row?.created_at || row?.created_date || "",
    );
    if (fallbackSystemCode) return fallbackSystemCode;

    return normalizeText(row?.id || row?.remote_id || "");
  }

  function getKrudListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 300,
          where: payload.where,
          sort: payload.sort,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 300,
          where: payload.where,
          sort: payload.sort,
        });
    }

    return null;
  }

  function getKrudUpdateFn() {
    if (typeof window.crud === "function") {
      return (tableName, data) => window.crud("update", tableName, data);
    }

    if (typeof window.krud === "function") {
      return (tableName, data) => window.krud("update", tableName, data);
    }

    return null;
  }

  function extractRows(payload, depth) {
    const level = Number(depth || 0);
    if (level > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, level + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function getWeatherLabel(value) {
    const weather = normalizeText(value).toLowerCase();
    if (!weather) return "Chờ đồng bộ";
    if (weather === "binh_thuong") return "Bình thường";
    if (weather === "troi_mua") return "Trời mưa";
    return value;
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

  function deriveStatusKey(detail) {
    const order = detail?.order || {};
    const milestones = getMilestones(detail);
    const normalizedStatus = normalizeLowerText(order.status || order.trang_thai || "");

    if (
      milestones.cancelledAt ||
      ["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(normalizedStatus)
    ) {
      return "cancelled";
    }
    if (
      milestones.completedAt ||
      ["completed", "delivered", "success", "da_xac_nhan", "xac_nhan", "confirmed"].includes(
        normalizedStatus,
      )
    ) {
      return "completed";
    }
    if (milestones.startedAt) return "shipping";
    if (milestones.acceptedAt) return "accepted";
    return "pending";
  }

  function getStatusBadge(statusKey) {
    if (statusKey === "cancelled") {
      return { className: "cancelled", label: "Đã hủy" };
    }
    if (statusKey === "completed") {
      return { className: "completed", label: "Hoàn thành" };
    }
    if (statusKey === "shipping") {
      return { className: "shipping", label: "Đang triển khai" };
    }
    if (statusKey === "accepted") {
      return { className: "shipping", label: "Đã nhận đơn" };
    }
    return { className: "pending", label: "Mới tiếp nhận" };
  }

  function getProgressMeta(detail) {
    const statusKey = deriveStatusKey(detail);
    if (statusKey === "cancelled") {
      return {
        percent: 100,
        tone: "cancelled",
        label: "Đã hủy",
        note: "Đơn đã bị hủy.",
      };
    }
    if (statusKey === "completed") {
      return {
        percent: 100,
        tone: "completed",
        label: "Hoàn thành",
        note: "Đơn đã hoàn thành.",
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
        percent: 42,
        tone: "shipping",
        label: "Đã nhận đơn",
        note: "Nhà cung cấp đã nhận đơn.",
      };
    }
    return {
      percent: 16,
      tone: "pending",
      label: "Chờ nhận đơn",
      note: "Đơn đang chờ nhận.",
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
          .map((item) => `<span class="standalone-order-chip">${escapeHtml(item)}</span>`)
          .join("")}
      </div>
    `;
  }

  function renderAttachmentGallery(detail) {
    const order = detail?.order || {};
    const mediaItems = [
      ...(Array.isArray(order.image_attachments) ? order.image_attachments : []).map((item, index) => ({
        type: "image",
        label: `Ảnh mặt bằng ${index + 1}`,
        value: item,
      })),
      ...(Array.isArray(order.video_attachments) ? order.video_attachments : []).map((item, index) => ({
        type: "video",
        label: `Video mặt bằng ${index + 1}`,
        value: item,
      })),
    ].filter((item) => normalizeText(item.value));

    if (!mediaItems.length) {
      return '<div class="standalone-order-note-panel"><p>Chưa có tài liệu hiện trường nào được gửi kèm cho đơn hàng này.</p></div>';
    }

    return `
      <div class="standalone-order-media-grid">
        ${mediaItems
          .map(
            (item) => `
              <div class="standalone-order-media-item">
                <div class="standalone-order-item-icon">
                  <i class="${escapeHtml(item.type === "video" ? "fa-solid fa-video" : "fa-solid fa-image")}"></i>
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
    const buttons = [];

    if (action === "accept") {
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
      `<a href="${escapeHtml(getProjectUrl("nha-cung-cap/danh-sach-viec.html"))}" class="customer-btn customer-btn-ghost">Về danh sách đơn</a>`,
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

  function normalizeDetail(row) {
    const code = resolveBookingRowCode(row);
    const statusKey = deriveStatusKey({ order: row });
    const statusMeta = getStatusBadge(statusKey);
    return {
      order: {
        id: normalizeText(row?.id || ""),
        code,
        status: normalizeText(row?.status || row?.trang_thai || ""),
        status_label: statusMeta.label,
        service_label: normalizeText(row?.ten_dich_vu || row?.loai_dich_vu || "Chuyển dọn"),
        created_at: normalizeText(row?.created_at || row?.created_date || ""),
        updated_at: normalizeText(row?.updated_at || ""),
        accepted_at: normalizeText(row?.accepted_at || ""),
        started_at: normalizeText(row?.started_at || ""),
        completed_at: normalizeText(row?.completed_at || ""),
        customer_name: normalizeText(row?.ho_ten || ""),
        customer_phone: normalizeText(row?.so_dien_thoai || ""),
        customer_email: normalizeText(row?.customer_email || ""),
        company_name: normalizeText(row?.ten_cong_ty || ""),
        from_address: normalizeText(row?.dia_chi_di || ""),
        to_address: normalizeText(row?.dia_chi_den || ""),
        schedule_date: normalizeText(row?.ngay_thuc_hien || ""),
        schedule_time: normalizeText(row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien || ""),
        schedule_label: normalizeText(
          [row?.ngay_thuc_hien, row?.ten_khung_gio_thuc_hien || row?.khung_gio_thuc_hien]
            .filter(Boolean)
            .join(" • "),
        ),
        weather_label: normalizeText(row?.thoi_tiet_du_kien || ""),
        vehicle_label: normalizeText(row?.ten_loai_xe || row?.loai_xe || ""),
        distance_km: parseNumber(row?.khoang_cach_km || 0),
        estimated_amount: parseNumber(row?.tong_tam_tinh || 0),
        note: normalizeText(row?.ghi_chu || ""),
        summary: normalizeText(row?.ghi_chu || ""),
        access_conditions: splitPipeValues(row?.dieu_kien_tiep_can),
        service_details: splitPipeValues(row?.chi_tiet_dich_vu),
        image_attachments: splitPipeValues(row?.anh_dinh_kem),
        video_attachments: splitPipeValues(row?.video_dinh_kem),
        provider_note: normalizeText(row?.provider_note || ""),
        customer_feedback: normalizeText(row?.customer_feedback || ""),
        customer_rating: parseNumber(row?.customer_rating || 0),
      },
      rawRow: row,
    };
  }

  async function fetchBookingRowByCode(code) {
    const listFn = getKrudListFn();
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

      const matched = rows.find(
        (row) => normalizeLowerText(resolveBookingRowCode(row)) === normalizedCode,
      );

      if (matched) return matched;
      if (rows.length < limit) break;
    }

    return null;
  }

  async function updateBookingAction(detail, action, payload = {}) {
    const updateFn = getKrudUpdateFn();
    const order = detail?.order || {};
    if (!updateFn || !order.id) {
      throw new Error("Không tìm thấy API KRUD để cập nhật đơn hàng.");
    }

    const now = new Date().toISOString();
    const basePayload = {
      id: order.id,
      updated_at: now,
      ...payload,
    };

    if (action === "accept") {
      basePayload.status = "dang_xu_ly";
      basePayload.trang_thai = "dang_xu_ly";
      basePayload.accepted_at = now;
    } else if (action === "start") {
      basePayload.status = "dang_xu_ly";
      basePayload.trang_thai = "dang_xu_ly";
      basePayload.started_at = now;
      if (!order.accepted_at) {
        basePayload.accepted_at = now;
      }
    } else if (action === "complete") {
      basePayload.status = "da_xac_nhan";
      basePayload.trang_thai = "da_xac_nhan";
      basePayload.completed_at = now;
      if (!order.accepted_at) {
        basePayload.accepted_at = now;
      }
      if (!order.started_at) {
        basePayload.started_at = now;
      }
    }

    await Promise.resolve(
      updateFn(store.bookingCrudTableName || "dich_vu_chuyen_don_dat_lich", basePayload),
    );
  }

  async function saveProviderNote(detail, note) {
    await updateBookingAction(detail, "note", {
      provider_note: normalizeText(note || ""),
    });
  }

  function renderExecutionItems(detail) {
    const order = detail?.order || {};
    const items = [
      {
        icon: "fa-solid fa-truck-ramp-box",
        title: order.service_label || "Gói dịch vụ chuyển dọn",
        type: "Phạm vi dịch vụ",
        meta: [
          `Loại xe: ${order.vehicle_label || "--"}`,
          `Khoảng cách: ${formatDistance(order.distance_km)}`,
          `Tạm tính: ${formatCurrency(order.estimated_amount)}`,
        ],
        note:
          order.summary ||
          "Đơn đang giữ tổ hợp dịch vụ, loại xe và cự ly tham chiếu làm phương án xử lý hiện tại.",
      },
      {
        icon: "fa-solid fa-calendar-check",
        title: order.schedule_label || "Lịch triển khai đang chờ xác nhận",
        type: "Lịch và điều phối",
        meta: [
          `Ngày: ${order.schedule_date || "--"}`,
          `Khung giờ: ${order.schedule_time || "--"}`,
          `Thời tiết: ${getWeatherLabel(order.weather_label)}`,
        ],
        note:
          "Nhà cung cấp có thể dùng mốc này để đối chiếu khi nhận đơn và cập nhật tiến độ triển khai thực tế.",
      },
      {
        icon: "fa-solid fa-helmet-safety",
        title: order.access_conditions.length
          ? "Điều kiện tiếp cận đã ghi nhận"
          : "Chưa có điều kiện tiếp cận đặc biệt",
        type: "Hiện trường",
        meta: [
          `${order.access_conditions.length} điều kiện`,
          `${order.service_details.length} hạng mục phụ`,
          order.company_name ? `Đơn vị: ${order.company_name}` : "Đơn vị: Khách cá nhân",
        ],
        note:
          order.access_conditions.length
            ? order.access_conditions.join(". ")
            : "Khách hàng chưa đánh dấu thêm các trở ngại tiếp cận trên biểu mẫu.",
      },
    ];

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
                      <strong>${escapeHtml(item.title)}</strong>
                      <div class="standalone-order-muted">${escapeHtml(item.type)}</div>
                    </div>
                    <div class="standalone-order-item-meta">
                      ${(Array.isArray(item.meta) ? item.meta : [])
                        .map((meta) => `<span>${escapeHtml(meta)}</span>`)
                        .join("")}
                    </div>
                  </div>
                  <div class="standalone-order-item-note">${escapeHtml(item.note)}</div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderCoordinationCard(detail) {
    const identity = store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const phone = normalizeText(identity.phone || "");
    const email = normalizeText(identity.email || "");
    const order = detail?.order || {};

    return `
      <article class="standalone-order-provider-card standalone-order-provider-card--moving">
        <div class="standalone-order-provider-head">
          <div class="standalone-order-provider-avatar">NCC</div>
          <div>
            <strong>${escapeHtml(displayName || "Nhà cung cấp")}</strong>
            <span>${escapeHtml(phone || "Chưa có số điện thoại")}</span>
            <span>${escapeHtml(email || "Chưa có email vận hành")}</span>
          </div>
        </div>
        <div class="standalone-order-provider-pills">
          <span>Trạng thái: ${escapeHtml(getStatusBadge(deriveStatusKey(detail)).label)}</span>
          <span>Loại xe: ${escapeHtml(order.vehicle_label || "--")}</span>
          <span>Lịch: ${escapeHtml(order.schedule_label || "--")}</span>
        </div>
      </article>
    `;
  }

  function renderTimeline(detail) {
    const order = detail?.order || {};
    const milestones = getMilestones(detail);
    const entries = [
      {
        time: order.created_at,
        title: "Yêu cầu đã ghi nhận",
        note: "Hệ thống đã lưu biểu mẫu chuyển dọn và đưa vào danh sách việc của nhà cung cấp.",
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

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Phản hồi khách hàng</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Tóm tắt phản hồi</strong>
              <span class="standalone-order-chip">${escapeHtml(rating > 0 ? `${rating}/5 sao` : "Chưa có sao")}</span>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(
              feedback || "Chưa có phản hồi từ khách hàng cho đơn hàng này.",
            )}</p>
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Trạng thái phản hồi</strong>
              <span class="standalone-order-chip">Chỉ xem</span>
            </div>
            <div class="standalone-order-note-panel">
              <p>Nhà cung cấp chỉ theo dõi phản hồi khách hàng tại đây. Luồng cập nhật phản hồi nằm ở phía khách hàng.</p>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderProviderNoteBlock(detail) {
    const note = normalizeText(detail?.order?.provider_note || "");

    return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Ghi chú nhà cung cấp</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú hiện có</strong>
              <span class="standalone-order-chip">${escapeHtml(note ? "Đã cập nhật" : "Chưa có ghi chú")}</span>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(
              note || "Nhà cung cấp chưa cập nhật ghi chú xử lý cho đơn hàng này.",
            )}</p>
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác ghi chú</strong>
              <span class="standalone-order-chip">Nhà cung cấp</span>
            </div>
            <form class="standalone-order-form" data-provider-note-form>
              <label class="standalone-order-field">
                <span>Ghi chú xử lý</span>
                <textarea name="provider_note" rows="5" placeholder="Cập nhật tiến độ, hiện trạng hoặc lưu ý vận hành.">${escapeHtml(note)}</textarea>
              </label>
              <div class="standalone-order-inline-actions">
                <button class="customer-btn customer-btn-primary" type="submit">Lưu ghi chú NCC</button>
              </div>
            </form>
          </article>
        </div>
      </section>
    `;
  }

  function render(detail) {
    const order = detail?.order || {};
    const progressMeta = getProgressMeta(detail);

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
                <span><i class="fa-solid fa-file-invoice-dollar"></i> ${escapeHtml(order.code || "--")}</span>
                <span><i class="fa-solid fa-user-shield"></i> Nhà cung cấp</span>
                <span><i class="fa-solid fa-clock"></i> ${escapeHtml(formatDateTime(order.created_at))}</span>
              </div>
            </div>
            <div class="standalone-order-topbar-logo">
              <img src="${escapeHtml(getProjectUrl("public/assets/images/favicon.png"))}" alt="Logo Dịch vụ Chuyển Dọn" />
            </div>
          </div>

          <header class="standalone-order-card-header">
            <div class="standalone-order-header-main-content">
              <div class="standalone-order-hero-top-row">
                <div class="standalone-order-card-title">
                  <p class="standalone-order-card-kicker">Mã yêu cầu nội bộ</p>
                  <h1>${escapeHtml(order.code || "--")}</h1>
                  <p class="standalone-order-card-subtitle">${escapeHtml(order.service_label || "Dịch vụ Chuyển Dọn")}</p>
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
                  formatCurrency(order.estimated_amount),
                  order.vehicle_label || "Chưa chốt loại xe",
                )}
                ${renderHeroMetric(
                  "fa-solid fa-calendar-check",
                  "Lịch triển khai",
                  order.schedule_label || "Chưa chốt lịch",
                  order.schedule_time || "Khung giờ triển khai",
                )}
                ${renderHeroMetric(
                  "fa-solid fa-location-dot",
                  "Điểm đến",
                  order.to_address || "Chưa có điểm đến",
                  order.from_address || "Chưa có điểm đi",
                )}
              </div>
            </div>

            <div class="standalone-order-header-footer-row">
              <div class="standalone-order-header-status-badge">
                ${renderStatusBadge(deriveStatusKey(detail))}
              </div>
              <div class="standalone-order-actions-group">
                ${buildActionButtons(detail)}
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Tổng quan đơn hàng và tạm tính</h2>
              </div>
              <div class="standalone-order-overview-stats">
                ${renderOverviewStat("fa-solid fa-location-dot", "Điểm đi", order.from_address || "--", order.customer_name || "Khách hàng")}
                ${renderOverviewStat("fa-solid fa-flag-checkered", "Điểm đến", order.to_address || "--", order.schedule_label || "Chưa chốt lịch")}
                ${renderOverviewStat("fa-solid fa-wallet", "Tạm tính", formatCurrency(order.estimated_amount), order.vehicle_label || "Chưa chốt loại xe")}
                ${renderOverviewStat("fa-solid fa-clock-rotate-left", "Trạng thái", getStatusBadge(deriveStatusKey(detail)).label, progressMeta.note)}
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel standalone-order-panel-overview">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Thông tin điều phối</strong>
                      <p>Đối chiếu mã yêu cầu, tuyến triển khai, thời gian và dữ liệu lõi của đơn hàng.</p>
                    </div>
                    <span class="standalone-order-chip">Lộ trình</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Mã yêu cầu", order.code || "--")}
                    ${renderInfoRow("Mã hệ thống", order.id || "--")}
                    ${renderInfoRow("Gói dịch vụ", order.service_label || "--")}
                    ${renderInfoRow("Điểm đi", order.from_address || "--")}
                    ${renderInfoRow("Điểm đến", order.to_address || "--")}
                    ${renderInfoRow("Ngày thực hiện", order.schedule_date || "--")}
                    ${renderInfoRow("Khung giờ", order.schedule_time || "--")}
                    ${renderInfoRow("Khoảng cách", formatDistance(order.distance_km))}
                  </div>
                </div>
                <div class="standalone-order-panel standalone-order-panel-fees" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Tóm tắt tạm tính</strong>
                      <p>Hiển thị mức phí tham chiếu hiện tại và các thông số tài chính để nhà cung cấp đối chiếu nhanh.</p>
                    </div>
                    <span class="standalone-order-chip">Tài chính</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Dịch vụ chuyển dọn", formatCurrency(order.estimated_amount))}
                    ${renderInfoRow("Khoảng cách tham chiếu", formatDistance(order.distance_km))}
                    ${renderInfoRow("Loại xe", order.vehicle_label || "--")}
                    ${renderInfoRow("Tổng tạm tính", formatCurrency(order.estimated_amount), { valueHtml: true, valueTag: "div" })}
                  </div>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Khách hàng, lộ trình và lưu ý triển khai</h2>
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
                        <p>Đầu mối liên hệ hiện đang gắn với đơn hàng để nhà cung cấp xác nhận lại khi cần.</p>
                      </div>
                    </div>
                    <span class="standalone-order-chip">Khách hàng</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Khách hàng", order.customer_name || "--")}
                    ${renderInfoRow("Số điện thoại", order.customer_phone || "--")}
                    ${renderInfoRow("Email", order.customer_email || "--")}
                    ${renderInfoRow("Đơn vị", order.company_name || "--")}
                  </div>
                </article>
                <article class="standalone-order-contact-card">
                  <div class="standalone-order-contact-card-head">
                    <div class="standalone-order-contact-card-title">
                      <span class="standalone-order-contact-card-icon">
                        <i class="fa-solid fa-location-dot"></i>
                      </span>
                      <div>
                        <strong>Lộ trình và phương án triển khai</strong>
                        <p>Đối chiếu tuyến đường, loại xe, khung giờ và thời tiết tham chiếu đang lưu trên hệ thống.</p>
                      </div>
                    </div>
                    <span class="standalone-order-chip">${escapeHtml(order.service_label || "Chuyển dọn")}</span>
                  </div>
                  <div class="standalone-order-info-list">
                    ${renderInfoRow("Điểm đi", order.from_address || "--")}
                    ${renderInfoRow("Điểm đến", order.to_address || "--")}
                    ${renderInfoRow("Loại xe", order.vehicle_label || "--")}
                    ${renderInfoRow("Lịch triển khai", order.schedule_label || "--")}
                    ${renderInfoRow("Thời tiết", getWeatherLabel(order.weather_label))}
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
                          <p>Gom ghi chú, điều kiện hiện trường và những điểm cần lưu ý trước khi triển khai thực tế.</p>
                        </div>
                      </div>
                      <span class="standalone-order-chip">Lưu ý</span>
                    </div>
                    <div class="standalone-order-note-panel standalone-order-contact-note-panel">
                      <p>${escapeHtml(order.note || "Chưa có ghi chú bổ sung.")}</p>
                    </div>
                    <div class="standalone-order-side-stack standalone-order-review-layout">
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Điều kiện tiếp cận</strong>
                          <span class="standalone-order-chip">${escapeHtml(String(order.access_conditions.length))} mục</span>
                        </div>
                        ${renderChipList(order.access_conditions, "Chưa có điều kiện tiếp cận đặc biệt được ghi nhận.")}
                      </article>
                      <article class="standalone-order-subcard">
                        <div class="standalone-order-subcard-head">
                          <strong>Chi tiết dịch vụ</strong>
                          <span class="standalone-order-chip">${escapeHtml(String(order.service_details.length))} mục</span>
                        </div>
                        ${renderChipList(order.service_details, "Chưa có hạng mục phụ nào được chọn thêm.")}
                      </article>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Khối lượng công việc và phạm vi triển khai</h2>
              </div>
              <div class="standalone-order-overview-stats standalone-order-overview-stats-compact">
                ${renderOverviewStat("fa-solid fa-layer-group", "Hạng mục phụ", String(order.service_details.length), "Số lựa chọn cộng thêm hiện đang gắn với yêu cầu")}
                ${renderOverviewStat("fa-solid fa-helmet-safety", "Tiếp cận", String(order.access_conditions.length), "Số điều kiện hiện trường đã được khách hàng đánh dấu")}
                ${renderOverviewStat("fa-solid fa-paperclip", "Tệp gửi kèm", String(order.image_attachments.length + order.video_attachments.length), "Ảnh và video mặt bằng hiện đang gắn với đơn hàng")}
                ${renderOverviewStat("fa-solid fa-clipboard-list", "Khảo sát", order.service_details.some((item) => normalizeLowerText(item).includes("khảo sát trước")) ? "Cần khảo sát trước" : "Không cần khảo sát trước", "Cờ khảo sát hỗ trợ nhà cung cấp chốt phương án thực địa")}
              </div>
              ${renderExecutionItems(detail)}
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Nhà cung cấp, trạng thái xử lý và tài liệu hiện trường</h2>
              </div>
              <div class="standalone-order-provider-shell">
                ${renderCoordinationCard(detail)}
                <div class="standalone-order-provider-grid">
                  <article class="standalone-order-timeline-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Timeline trạng thái</strong>
                        <p>Theo dõi các mốc nhận đơn, bắt đầu triển khai và hoàn thành xử lý.</p>
                      </div>
                      <span class="standalone-order-chip">Theo dõi</span>
                    </div>
                    ${renderTimeline(detail)}
                  </article>
                  <article class="standalone-order-media-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Tài liệu hiện trường</strong>
                        <p>Ảnh và video khách gửi trước khi nhà cung cấp nhận xử lý đơn hàng.</p>
                      </div>
                      <span class="standalone-order-chip">Media</span>
                    </div>
                    ${renderAttachmentGallery(detail)}
                  </article>
                </div>
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
          window.alert(error?.message || "Không thể cập nhật trạng thái đơn hàng lúc này.");
        }
      });
    });

    root.querySelector("[data-provider-note-form]")?.addEventListener("submit", async function (event) {
      event.preventDefault();

      try {
        const formData = new FormData(event.currentTarget);
        await saveProviderNote(detail, formData.get("provider_note") || "");
        const nextRow = await fetchBookingRowByCode(order.code || "");
        if (!nextRow) {
          throw new Error("Không thể tải lại đơn hàng sau khi lưu ghi chú.");
        }
        render(normalizeDetail(nextRow));
      } catch (error) {
        console.error("Cannot save provider note:", error);
        window.alert(error?.message || "Không thể lưu ghi chú nhà cung cấp lúc này.");
      }
    });
  }

  (async function bootstrapProviderOrderDetail() {
    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=nha-cung-cap");
      return;
    }

    const code = getQueryCode();
    if (!code) {
      renderError("Thiếu mã yêu cầu để hiển thị chi tiết đơn hàng.");
      return;
    }

    try {
      const row = await fetchBookingRowByCode(code);
      if (!row) {
        renderError("Không tìm thấy yêu cầu phù hợp trong bảng đặt lịch chuyển dọn.");
        return;
      }

      render(normalizeDetail(row));
    } catch (error) {
      console.error("Cannot load provider order detail:", error);
      renderError(error?.message || "Không thể tải chi tiết đơn hàng.");
    }
  })();
})(window, document);
