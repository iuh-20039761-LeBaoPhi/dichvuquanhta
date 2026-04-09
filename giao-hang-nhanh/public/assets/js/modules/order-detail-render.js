(function (window) {
  if (window.GiaoHangNhanhOrderDetailRender) return;

  function createOrderDetailRenderer(deps) {
    const {
      assetPaths,
      getRoot,
      escapeHtml,
      formatCurrency,
      formatDateTime,
      normalizeText,
      normalizeMultilineText,
      getMilestones,
      deriveStatusKey,
      getStatusBadge,
      buildActionButtons,
      pickFirstText,
      isImageExtension,
      isVideoExtension,
      hasPreviewableUrl,
      bindFeedbackForm,
      bindShipperNoteForm,
      handleActionClick,
    } = deps || {};
    const orderAssetPaths = {
      mainLogo:
        assetPaths?.mainLogo ||
        "public/assets/images/logo-dich-vu-quanh-ta.png",
      brandLogo: assetPaths?.brandLogo || "public/assets/images/favicon.png",
    };
    const renderStatusBadge =
      typeof getStatusBadge === "function"
        ? getStatusBadge
        : (status, label) =>
            `<span class="customer-status-badge status-${escapeHtml(status || "")}">${escapeHtml(label || status || "--")}</span>`;
    function renderInfoRow(label, value, options = {}) {
      const safeLabel = options.labelHtml ? label || "--" : escapeHtml(label);
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

    function renderFeeSummaryRows(order) {
      const breakdown = order?.fee_breakdown || {};
      const rows = [
        renderInfoRow("Phí vận chuyển", formatCurrency(breakdown.base_price)),
      ];

      [
        ["Phụ phí loại hàng", breakdown.goods_fee],
        ["Phụ phí khung giờ", breakdown.time_fee],
        ["Phụ phí thời tiết", breakdown.condition_fee],
        ["Điều chỉnh theo xe", breakdown.vehicle_fee],
        ["Phí COD", breakdown.cod_fee],
        ["Phí bảo hiểm", breakdown.insurance_fee],
      ].forEach(([label, value]) => {
        if (Number(value || 0) <= 0) return;
        rows.push(renderInfoRow(label, formatCurrency(value)));
      });

      return rows.join("");
    }

    function getHeroProgressMeta(order) {
      const milestones = getMilestones(order);
      const normalizedStatus = String(order?.status || "")
        .trim()
        .toLowerCase();

      if (
        milestones.cancelledAt ||
        ["cancelled", "canceled"].includes(normalizedStatus)
      ) {
        return {
          percent: 100,
          tone: "cancelled",
          label: "Đã hủy",
          note: order?.cancel_reason
            ? `Lý do hủy: ${order.cancel_reason}`
            : "Đơn hàng đã bị hủy và không tiếp tục điều phối giao nhận.",
        };
      }

      if (
        milestones.completedAt ||
        ["completed", "delivered", "success"].includes(normalizedStatus)
      ) {
        return {
          percent: 100,
          tone: "completed",
          label: "Hoàn thành",
          note: `Đơn hàng đã hoàn tất vào ${formatDateTime(
            milestones.completedAt || order?.created_at,
          )}.`,
        };
      }

      if (
        milestones.startedAt ||
        ["shipping", "in_transit"].includes(normalizedStatus)
      ) {
        return {
          percent: 75,
          tone: "shipping",
          label: "Đang giao",
          note: "Shipper đang thực hiện lộ trình giao hàng và cập nhật minh chứng thực tế.",
        };
      }

      if (milestones.acceptedAt) {
        return {
          percent: 40,
          tone: "shipping",
          label: "Đã nhận đơn",
          note: `Đơn đã được shipper tiếp nhận lúc ${formatDateTime(
            milestones.acceptedAt,
          )}.`,
        };
      }

      return {
        percent: 15,
        tone: "pending",
        label: "Chờ xử lý",
        note: "Hệ thống đã ghi nhận đơn và đang chờ điều phối nhà cung cấp phù hợp.",
      };
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

    function renderHeroRouteCard(order) {
      return `
      <article class="standalone-order-hero-metric standalone-order-hero-metric-route">
        <div class="standalone-order-hero-metric-copy">
          <span>Lộ trình giao nhận</span>
          <div class="standalone-order-hero-route-list">
            <div class="standalone-order-hero-route-item">
              <span class="standalone-order-hero-route-icon">
                <i class="fa-solid fa-location-dot"></i>
              </span>
              <div class="standalone-order-hero-route-copy">
                <small>Điểm lấy hàng</small>
                <strong>${escapeHtml(order?.pickup_address || "--")}</strong>
              </div>
            </div>
            <div class="standalone-order-hero-route-item">
              <span class="standalone-order-hero-route-icon">
                <i class="fa-solid fa-flag-checkered"></i>
              </span>
              <div class="standalone-order-hero-route-copy">
                <small>Điểm giao hàng</small>
                <strong>${escapeHtml(order?.delivery_address || "--")}</strong>
              </div>
            </div>
          </div>
          <small>${escapeHtml(order?.service_label || order?.service_name || "Giao hàng nhanh")}</small>
        </div>
      </article>
    `;
    }

    function getLatestOrderEvent(order) {
      const milestones = getMilestones(order);
      if (milestones.cancelledAt) {
        return {
          label: "Hủy đơn",
          time: formatDateTime(milestones.cancelledAt),
        };
      }

      if (milestones.completedAt) {
        return {
          label: "Hoàn thành",
          time: formatDateTime(milestones.completedAt),
        };
      }

      if (milestones.startedAt) {
        return {
          label: "Bắt đầu giao",
          time: formatDateTime(milestones.startedAt),
        };
      }

      if (milestones.acceptedAt) {
        return {
          label: "Nhận đơn",
          time: formatDateTime(milestones.acceptedAt),
        };
      }

      return {
        label: "Tạo đơn",
        time: formatDateTime(order?.created_at),
      };
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

    function renderContactCard(icon, title, chip, rows) {
      return `
      <article class="standalone-order-contact-card">
        <div class="standalone-order-contact-card-head">
          <div class="standalone-order-contact-card-title">
            <span class="standalone-order-contact-card-icon">
              <i class="${escapeHtml(icon)}"></i>
            </span>
            <div>
              <strong>${escapeHtml(title)}</strong>
              <p>Đối chiếu thông tin liên hệ và địa chỉ phục vụ cho điều phối giao nhận.</p>
            </div>
          </div>
          <span class="standalone-order-chip">${escapeHtml(chip)}</span>
        </div>
        <div class="standalone-order-info-list">
          ${rows.join("")}
        </div>
      </article>
    `;
    }

    function formatWeight(value) {
      const weight = Number(value || 0);
      if (!Number.isFinite(weight) || weight <= 0) return "--";
      return `${weight.toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} kg`;
    }

    function getItemsSummary(items) {
      const list = Array.isArray(items) ? items : [];
      return list.reduce(
        (summary, item) => ({
          count: summary.count + 1,
          quantity: summary.quantity + Number(item?.so_luong || 0),
          weight: summary.weight + Number(item?.can_nang || 0),
          declared: summary.declared + Number(item?.gia_tri_khai_bao || 0),
        }),
        { count: 0, quantity: 0, weight: 0, declared: 0 },
      );
    }

    function getTimelineEntries(detail) {
      const order = detail.order || {};
      const milestones = getMilestones(order);
      const timeline = [];
      const pushItem = (time, title, note) => {
        if (!normalizeText(time)) return;
        timeline.push({
          time,
          title,
          note,
        });
      };

      pushItem(
        order.created_at,
        "Đơn được tạo",
        "Hệ thống đã ghi nhận đơn hàng.",
      );
      pushItem(
        milestones.acceptedAt,
        "Đã có nhà cung cấp nhận đơn",
        "Thông tin NCC và thời điểm nhận đơn đã được cập nhật.",
      );
      pushItem(
        milestones.startedAt,
        "Bắt đầu thực hiện",
        "Nhà cung cấp đã xác nhận bắt đầu giao đơn thực tế.",
      );
      pushItem(
        milestones.completedAt,
        "Hoàn thành đơn hàng",
        "Đơn hàng đã được chốt hoàn tất.",
      );
      pushItem(
        milestones.cancelledAt,
        "Đơn hàng bị hủy",
        order.cancel_reason || "Khách hàng đã hủy đơn.",
      );

      (Array.isArray(detail.logs) ? detail.logs : []).forEach((log) => {
        timeline.push({
          time: log.created_at || "",
          title: log.new_status_label || "Cập nhật đơn hàng",
          note:
            log.note ||
            `Cập nhật từ ${log.old_status_label || "--"} sang ${log.new_status_label || "--"}`,
        });
      });

      const unique = [];
      const seen = new Set();
      timeline
        .filter((item) => normalizeText(item.time) || normalizeText(item.title))
        .sort((left, right) => {
          const leftTime = new Date(left.time || 0).getTime();
          const rightTime = new Date(right.time || 0).getTime();
          return leftTime - rightTime;
        })
        .forEach((item) => {
          const signature = `${item.time}|${item.title}|${item.note}`;
          if (seen.has(signature)) return;
          seen.add(signature);
          unique.push(item);
        });

      return unique;
    }

    function getProviderAddress(provider, session) {
      return (
        pickFirstText(
          provider?.shipper_address,
          provider?.address,
          provider?.dia_chi,
          provider?.company_address,
          provider?.full_address,
          provider?.area_label,
          provider?.region,
          provider?.hub_label,
          provider?.company_name,
          session?.shipper_address,
          session?.address,
          session?.dia_chi,
          session?.company_address,
        ) || "Chưa cập nhật"
      );
    }

    function renderItems(items) {
      if (!items.length) {
        return '<div class="standalone-order-muted">Chưa có danh sách hàng hóa chi tiết.</div>';
      }

      return `<div class="standalone-order-items">${items
        .map(
          (item, index) => `
          <article class="standalone-order-item">
            <div class="standalone-order-item-icon">
              <i class="fa-solid fa-box"></i>
            </div>
            <div class="standalone-order-item-body">
              <div class="standalone-order-item-top">
                <div class="standalone-order-item-heading">
                  <span class="standalone-order-item-seq">Kiện ${String(index + 1).padStart(2, "0")}</span>
                  <strong>${escapeHtml(item.ten_hang || `Hàng hóa #${index + 1}`)}</strong>
                  <div class="standalone-order-muted">${escapeHtml(item.loai_hang || "Hàng hóa tổng hợp")}</div>
                </div>
                <div class="standalone-order-item-meta">
                  <span>SL: ${escapeHtml(item.so_luong)}</span>
                  <span>${formatWeight(item.can_nang)}</span>
                  <span>${formatCurrency(item.gia_tri_khai_bao)}</span>
                </div>
              </div>
              <div class="standalone-order-item-note">
                ${escapeHtml(item.ghi_chu_dong_goi || "Không có ghi chú đóng gói riêng cho mặt hàng này.")}
              </div>
            </div>
          </article>`,
        )
        .join("")}</div>`;
    }

    function buildTimeline(detail) {
      const unique = getTimelineEntries(detail);
      if (!unique.length) {
        return '<div class="standalone-order-muted">Chưa có nhật ký xử lý cho đơn hàng này.</div>';
      }

      return `<div class="standalone-order-timeline">${unique
        .map(
          (item, index) => `
          <article class="standalone-order-timeline-item">
            <div class="standalone-order-timeline-dot ${index === unique.length - 1 ? "is-active" : ""}"></div>
            <div class="standalone-order-timeline-content">
              <small>${formatDateTime(item.time)}</small>
              <strong>${escapeHtml(item.title || "--")}</strong>
              <p>${escapeHtml(item.note || "Không có ghi chú bổ sung.")}</p>
            </div>
          </article>`,
        )
        .join("")}</div>`;
    }

    function getMediaItems(detail) {
      const order = detail.order || {};
      const items = [];

      if (normalizeText(order.pod_image)) {
        const url = normalizeText(order.pod_image);
        items.push({
          url,
          name: "Bằng chứng giao hàng",
          extension: url.split(".").pop() || "jpg",
        });
      }

      return items;
    }

    function renderMedia(detail) {
      const items = getMediaItems(detail);
      if (!items.length) {
        return '<div class="standalone-order-muted">Chưa có ảnh POD cho đơn hàng này.</div>';
      }

      return `<div class="standalone-order-media-grid">${items
        .map((item) => {
          const url = escapeHtml(item.url);
          const name = escapeHtml(item.name);
          const extension = String(item.extension || "").toLowerCase();

          if (isImageExtension(extension)) {
            return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <img src="${url}" alt="${name}" />
              <strong>${name}</strong>
              <span>Ảnh đính kèm</span>
            </a>
          `;
          }

          if (isVideoExtension(extension)) {
            return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <video src="${url}" controls preload="metadata"></video>
              <strong>${name}</strong>
              <span>Video đính kèm</span>
            </a>
          `;
          }

          return `
          <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
            <div class="standalone-order-item-icon">
              <i class="fa-solid fa-file-lines"></i>
            </div>
            <strong>${name}</strong>
            <span>Tệp đính kèm</span>
          </a>
        `;
        })
        .join("")}</div>`;
    }

    function renderAttachmentGallery(items, emptyMessage) {
      const mediaItems = Array.isArray(items) ? items : [];
      if (!mediaItems.length) {
        return `<div class="standalone-order-muted">${escapeHtml(emptyMessage)}</div>`;
      }

      return `<div class="standalone-order-media-grid">${mediaItems
        .map((item) => {
          const extension = String(item.extension || "").toLowerCase();
          const rawUrl = normalizeText(item.url || "");
          const url = escapeHtml(rawUrl || "#");
          const name = escapeHtml(item.name || "Tệp đính kèm");
          const canPreview = hasPreviewableUrl(rawUrl);

          if (isImageExtension(extension) && canPreview) {
            return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <img src="${url}" alt="${name}" />
              <strong>${name}</strong>
              <span>Ảnh đính kèm</span>
            </a>
          `;
          }

          if (isVideoExtension(extension) && canPreview) {
            return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              <video src="${url}" controls preload="metadata"></video>
              <strong>${name}</strong>
              <span>Video đính kèm</span>
            </a>
          `;
          }

          return `
          <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
            <div class="standalone-order-item-icon">
              <i class="fa-solid fa-file-lines"></i>
            </div>
            <strong>${name}</strong>
            <span>${escapeHtml(extension || "Tệp đính kèm")}</span>
          </a>
        `;
        })
        .join("")}</div>`;
    }

    function hasFeedbackContent(detail) {
      const order = detail?.order || {};
      const provider = detail?.provider || {};
      return Boolean(
        Number(order.rating || 0) > 0 ||
        normalizeMultilineText(order.feedback || "") ||
        (Array.isArray(provider.feedback_media) &&
          provider.feedback_media.length),
      );
    }

    function hasShipperNoteContent(detail) {
      const order = detail?.order || {};
      const provider = detail?.provider || {};
      return Boolean(
        normalizeMultilineText(order.shipper_note || "") ||
        (Array.isArray(provider.shipper_reports) &&
          provider.shipper_reports.length),
      );
    }

    function shouldShowFeedbackBlock(detail, viewer) {
      if (viewer === "public") return false;
      return viewer === "customer" || hasFeedbackContent(detail);
    }

    function canSubmitFeedback(detail, viewer) {
      const status = deriveStatusKey(detail?.order || {});
      return viewer === "customer" && status === "completed";
    }

    function shouldShowShipperNoteBlock(detail, viewer) {
      return viewer !== "public";
    }

    function canSubmitShipperNote(detail, viewer) {
      const milestones = getMilestones(detail?.order || {});
      return (
        viewer === "shipper" &&
        !milestones.cancelledAt &&
        Boolean(
          milestones.acceptedAt ||
          milestones.startedAt ||
          milestones.completedAt,
        )
      );
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

    function renderFeedbackBlock(detail, viewer) {
      if (!shouldShowFeedbackBlock(detail, viewer)) return "";

      const order = detail.order || {};
      const provider = detail.provider || {};
      const canSubmit = canSubmitFeedback(detail, viewer);
      const hasFeedback = hasFeedbackContent(detail);
      const feedbackMedia = Array.isArray(provider.feedback_media)
        ? provider.feedback_media
        : [];

      return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Phản hồi khách hàng</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Tóm tắt phản hồi</strong>
              ${Number(order.rating || 0) > 0 ? renderRatingStars(order.rating) : '<span class="standalone-order-chip">Chưa có sao</span>'}
            </div>
            <p class="standalone-order-note-text">${escapeHtml(order.feedback || (canSubmit ? "Khách hàng có thể nhập phản hồi và đính kèm hình ảnh/video thực tế." : "Chưa có phản hồi từ khách hàng."))}</p>
            ${renderAttachmentGallery(feedbackMedia, "Chưa có media phản hồi từ khách hàng.")}
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác phản hồi</strong>
              <span class="standalone-order-chip">${escapeHtml(viewer === "customer" ? "Khách hàng" : "Chỉ xem")}</span>
            </div>
            ${
              canSubmit
                ? `<form id="standalone-feedback-form" class="standalone-order-form">
                    <label class="standalone-order-field">
                      <span>Đánh giá dịch vụ</span>
                      <select name="rating" required>
                        <option value="">Chọn số sao</option>
                        ${[1, 2, 3, 4, 5]
                          .map(
                            (star) =>
                              `<option value="${star}" ${Number(order.rating || 0) === star ? "selected" : ""}>${star} sao</option>`,
                          )
                          .join("")}
                      </select>
                    </label>
                    <label class="standalone-order-field">
                      <span>Nội dung phản hồi</span>
                      <textarea name="feedback" rows="5" placeholder="Mô tả chất lượng phục vụ hoặc vấn đề phát sinh.">${escapeHtml(order.feedback || "")}</textarea>
                    </label>
                    <div class="standalone-order-upload-grid">
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                        <strong>Chụp hoặc gửi ảnh phản hồi</strong>
                        <span class="standalone-order-upload-copy">Dùng để gửi ảnh thực tế, hiện trạng đơn hàng và chất lượng phục vụ.</span>
                        <input type="file" name="feedback_media_image" accept="image/*" capture="environment" multiple hidden />
                        <span id="standalone-feedback-image-files" class="standalone-order-upload-meta">Chưa chọn ảnh phản hồi.</span>
                      </label>
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                        <strong>Gửi video phản hồi</strong>
                        <span class="standalone-order-upload-copy">Dùng để quay rõ quá trình giao hàng hoặc vấn đề phát sinh thực tế.</span>
                        <input type="file" name="feedback_media_video" accept="video/*" capture="environment" multiple hidden />
                        <span id="standalone-feedback-video-files" class="standalone-order-upload-meta">Chưa chọn video phản hồi.</span>
                      </label>
                    </div>
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu phản hồi</button>
                    </div>
                  </form>`
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(
                      viewer === "customer"
                        ? "Chỉ có thể gửi phản hồi khi đơn hàng đã hoàn thành."
                        : hasFeedback
                          ? "Phản hồi của khách đang ở chế độ chỉ xem."
                          : "Chưa có phản hồi khách hàng cho đơn này.",
                    )}</p>
                  </div>`
            }
          </article>
        </div>
      </section>
    `;
    }

    function renderShipperNoteBlock(detail, viewer) {
      if (!shouldShowShipperNoteBlock(detail, viewer)) return "";

      const order = detail.order || {};
      const provider = detail.provider || {};
      const canSubmit = canSubmitShipperNote(detail, viewer);
      const reports = Array.isArray(provider.shipper_reports)
        ? provider.shipper_reports
        : [];

      return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Ghi chú nhà cung cấp</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú hiện có</strong>
              <span class="standalone-order-chip">${escapeHtml(viewer === "shipper" ? "Có thể cập nhật" : "Chỉ xem")}</span>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(order.shipper_note || "Nhà cung cấp chưa cập nhật ghi chú xử lý cho đơn hàng này.")}</p>
            ${renderAttachmentGallery(reports, "Chưa có media báo cáo từ nhà cung cấp.")}
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Thao tác ghi chú</strong>
              <span class="standalone-order-chip">${escapeHtml(viewer === "shipper" ? "Nhà cung cấp" : "Bị khóa")}</span>
            </div>
            ${
              canSubmit
                ? `<form id="standalone-shipper-note-form" class="standalone-order-form">
                    <label class="standalone-order-field">
                      <span>Ghi chú xử lý</span>
                      <textarea name="shipper_note" rows="5" placeholder="Cập nhật tiến độ, vấn đề hiện trường hoặc lưu ý khi giao hàng.">${escapeHtml(order.shipper_note || "")}</textarea>
                    </label>
                    <div class="standalone-order-upload-grid">
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                        <strong>Chụp hoặc gửi ảnh báo cáo</strong>
                        <span class="standalone-order-upload-copy">Dùng để gửi ảnh hiện trường, tình trạng đơn hàng và xác nhận giao.</span>
                        <input type="file" name="shipper_media_image" accept="image/*" capture="environment" multiple hidden />
                        <span id="standalone-shipper-image-files" class="standalone-order-upload-meta">Chưa chọn ảnh báo cáo.</span>
                      </label>
                      <label class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                        <strong>Gửi video báo cáo</strong>
                        <span class="standalone-order-upload-copy">Dùng để quay rõ hiện trạng giao hàng hoặc vấn đề phát sinh thực tế.</span>
                        <input type="file" name="shipper_media_video" accept="video/*" capture="environment" multiple hidden />
                        <span id="standalone-shipper-video-files" class="standalone-order-upload-meta">Chưa chọn video báo cáo.</span>
                      </label>
                    </div>
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu ghi chú NCC</button>
                    </div>
                  </form>`
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(
                      viewer === "shipper"
                        ? "Chỉ có thể thêm ghi chú sau khi đơn đã được nhận."
                        : hasShipperNoteContent(detail)
                          ? "Ghi chú của nhà cung cấp đang ở chế độ chỉ xem."
                          : "Chưa có ghi chú nào từ nhà cung cấp.",
                    )}</p>
                  </div>`
            }
          </article>
        </div>
      </section>
    `;
    }

    function render(detail, viewer, session) {
      const root = getRoot();
      if (!root) return;

      const order = detail.order || {};
      const customer = detail.customer || {};
      const provider = detail.provider || {};
      const distanceLabel =
        Number(order.khoang_cach_km || 0) > 0
          ? `${Number(order.khoang_cach_km).toLocaleString("vi-VN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })} km`
          : "--";
      const providerName =
        provider.shipper_name ||
        provider.fullname ||
        (viewer === "shipper" && session
          ? session.fullname || session.username || ""
          : "") ||
        "Chưa có nhà cung cấp nhận đơn";
      const providerPhone =
        provider.shipper_phone || provider.phone || "Chưa cập nhật";
      const providerAddress = getProviderAddress(provider, session);
      const providerVehicle =
        provider.shipper_vehicle || provider.vehicle_type || "Chưa cập nhật";
      const providerPlate = provider.bien_so || provider.license_plate || "";
      const progressMeta = getHeroProgressMeta(order);
      const totalFeeLabel = formatCurrency(
        order?.fee_breakdown?.total_fee || order.shipping_fee,
      );
      const serviceLabel = order.service_label || order.service_name || "--";
      const latestEvent = getLatestOrderEvent(order);
      const itemsSummary = getItemsSummary(detail.items || []);
      const senderName = order.sender_name || customer.fullname || "--";
      const senderPhone = order.sender_phone || customer.phone || "--";
      const receiverName = order.receiver_name || "--";
      const receiverPhone = order.receiver_phone || "--";
      const providerMetaLine = `
      <span>${escapeHtml(providerPhone || "Chưa cập nhật")}</span>
      <span>${escapeHtml(providerAddress)}</span>
    `;

      root.innerHTML = `
      <div class="standalone-order-layout">
        <section class="standalone-order-unified-card">
          <div class="standalone-order-topbar">
            <div class="standalone-order-topbar-logo">
              <img src="${escapeHtml(orderAssetPaths.mainLogo)}" alt="Dịch Vụ Quanh Ta" />
            </div>
            
            <div class="standalone-order-topbar-center">
              <h2 class="standalone-order-topbar-title">Chi tiết đơn hàng</h2>
              <div class="standalone-order-topbar-meta">
                <span><i class="fa-solid fa-user-shield"></i> ${escapeHtml(viewer === "shipper" ? "Nhà cung cấp" : viewer === "customer" ? "Khách hàng" : "Xem trực tiếp")}</span>
                <span><i class="fa-solid fa-clock"></i> Tạo lúc ${formatDateTime(order.created_at)}</span>
              </div>
            </div>

            <div class="standalone-order-topbar-logo">
              <img class="standalone-order-brand-logo-service" src="${escapeHtml(orderAssetPaths.brandLogo)}" alt="Logo Giao Hàng Nhanh" />
            </div>
          </div>

          <header class="standalone-order-card-header">
            <div class="standalone-order-header-main-content">
              <div class="standalone-order-hero-top-row">
                <div class="standalone-order-card-title">
                  <p class="standalone-order-card-kicker">Mã đơn hàng nội bộ</p>
                  <h1>${escapeHtml(order.order_code || "--")}</h1>
                  <p class="standalone-order-card-subtitle">${escapeHtml(serviceLabel)}</p>
                </div>
                
                <div class="standalone-order-hero-side-stack">
                  <div class="standalone-order-actions-group standalone-order-hero-actions-group">
                    ${buildActionButtons(detail, viewer)}
                  </div>
                  <div class="standalone-order-hero-side-progress">
                    <div class="standalone-order-progress-ring status-${escapeHtml(progressMeta.tone)}"
                      style="--progress:${Math.max(0, Math.min(progressMeta.percent, 100))}%;"
                    >
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
                  "Tổng phí",
                  totalFeeLabel,
                  "Cước phí & phụ phí",
                  { className: "standalone-order-hero-metric-primary" },
                )}
                ${renderHeroMetric(
                  "fa-solid fa-clock",
                  "Tạo lúc",
                  formatDateTime(order.created_at),
                  distanceLabel,
                )}
                ${renderHeroMetric(
                  "fa-solid fa-signal",
                  "Trạng thái đơn",
                  renderStatusBadge(order.status, order.status_label),
                  progressMeta.note,
                  {
                    className: "standalone-order-hero-metric-status",
                    valueHtml: true,
                  },
                )}
                ${renderHeroRouteCard(order)}
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Tổng quan đơn hàng và cước phí</h2>
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel standalone-order-panel-overview">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Thông tin điều phối</strong>
                      <p>Giữ lại những dữ liệu lõi để rà nhanh mà không lặp lại địa chỉ ở nhiều khu vực.</p>
                    </div>
                    <span class="standalone-order-chip">Điều phối</span>
                  </div>
                  <div class="standalone-order-info-list">
                  ${renderInfoRow("Mã đơn hàng", order.order_code || "--")}
                  ${renderInfoRow("Gói dịch vụ", order.service_label || order.service_name || "--")}
                  ${renderInfoRow("Tạo lúc", formatDateTime(order.created_at))}
                  ${renderInfoRow("Tổng quãng đường", distanceLabel)}
                  ${renderInfoRow("Thanh toán", order.payment_method_label || "--")}
                  ${renderInfoRow("Trạng thái thanh toán", order.payment_status_label || "Chưa hoàn tất")}
                  ${renderInfoRow("Cập nhật gần nhất", `${latestEvent.label} · ${latestEvent.time}`)}
                  </div>
                </div>
                <div class="standalone-order-panel standalone-order-panel-fees" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Chi tiết cước phí</strong>
                      <p>Chỉ giữ các khoản cấu thành để tránh lặp lại tổng phí đã ưu tiên ở phần đầu trang.</p>
                    </div>
                    <span class="standalone-order-chip">Tài chính</span>
                  </div>
                  <div class="standalone-order-info-list">
                  ${renderFeeSummaryRows(order)}
                  </div>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Người gửi, người nhận và ghi chú vận chuyển</h2>
              </div>
              <div class="standalone-order-contact-grid">
                ${renderContactCard(
                  "fa-solid fa-box",
                  "Người gửi",
                  "Lấy hàng",
                  [
                    renderInfoRow("Họ tên", senderName),
                    renderInfoRow("Số điện thoại", senderPhone),
                    renderInfoRow("Vai trò", "Đầu mối giao hàng"),
                  ],
                )}
                ${renderContactCard(
                  "fa-solid fa-hand-holding-heart",
                  "Người nhận",
                  "Giao hàng",
                  [
                    renderInfoRow("Họ tên", receiverName),
                    renderInfoRow("Số điện thoại", receiverPhone),
                    renderInfoRow("Vai trò", "Điểm nhận cuối"),
                  ],
                )}
                <div class="standalone-order-contact-note">
                  <article class="standalone-order-contact-note-card">
                    <div class="standalone-order-contact-card-head">
                      <div class="standalone-order-contact-card-title">
                        <span class="standalone-order-contact-card-icon standalone-order-contact-card-icon-note">
                          <i class="fa-solid fa-note-sticky"></i>
                        </span>
                        <div>
                          <strong>Ghi chú vận chuyển</strong>
                          <p>Lưu ý thêm từ khách hàng hoặc hệ thống để shipper và điều phối viên theo dõi khi xử lý đơn.</p>
                        </div>
                      </div>
                      <span class="standalone-order-chip">Lưu ý</span>
                    </div>
                    <div class="standalone-order-note-panel standalone-order-contact-note-panel">
                      <p>${escapeHtml(order.clean_note || "Không có ghi chú vận chuyển cho đơn hàng này.")}</p>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Kiện hàng và yêu cầu đóng gói</h2>
              </div>
              <div class="standalone-order-overview-stats standalone-order-overview-stats-compact">
                ${renderOverviewStat(
                  "fa-solid fa-boxes-stacked",
                  "Số kiện",
                  String(itemsSummary.count || 0),
                  itemsSummary.count
                    ? "Tổng số dòng hàng hóa trong đơn"
                    : "Chưa có danh sách kiện hàng chi tiết",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-layer-group",
                  "Tổng số lượng",
                  String(itemsSummary.quantity || 0),
                  "Số lượng cộng dồn từ toàn bộ kiện hàng",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-weight-hanging",
                  "Tổng cân nặng",
                  formatWeight(itemsSummary.weight),
                  "Dùng để đối chiếu khi bàn giao và chọn phương tiện",
                )}
                ${renderOverviewStat(
                  "fa-solid fa-file-invoice-dollar",
                  "Giá trị khai báo",
                  formatCurrency(itemsSummary.declared || 0),
                  "Tổng giá trị khai báo hiện có trong đơn",
                )}
              </div>
              ${renderItems(detail.items || [])}
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Shipper, trạng thái xử lý và POD</h2>
              </div>
              <div class="standalone-order-provider-shell">
                <article class="standalone-order-provider-card">
                  <div class="standalone-order-provider-head">
                    <div class="standalone-order-provider-avatar">
                      ${
                        normalizeText(provider.avatar || provider.photo || "")
                          ? `<img src="${escapeHtml(provider.avatar || provider.photo)}" alt="${escapeHtml(providerName)}" />`
                          : escapeHtml(providerName.charAt(0) || "N")
                      }
                    </div>
                    <div>
                      <strong>${escapeHtml(providerName)}</strong>
                      ${providerMetaLine}
                    </div>
                  </div>
                  <div class="standalone-order-provider-pills">
                    <span>Loại xe: ${escapeHtml(providerVehicle)}</span>
                    <span>Biển số: ${escapeHtml(providerPlate || "Chưa cập nhật")}</span>
                    <span>Nhận đơn: ${formatDateTime(getMilestones(order).acceptedAt)}</span>
                  </div>
                </article>
                <div class="standalone-order-provider-grid">
                  <article class="standalone-order-timeline-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Timeline trạng thái</strong>
                        <p>Lịch sử trạng thái được suy ra từ các mốc thời gian và nhật ký thao tác hiện có.</p>
                      </div>
                      <span class="standalone-order-chip">Theo dõi</span>
                    </div>
                    ${buildTimeline(detail)}
                  </article>

                  <article class="standalone-order-media-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Media bằng chứng giao hàng</strong>
                        <p>Hiển thị ảnh POD gắn với đơn hàng sau khi giao thành công.</p>
                      </div>
                      <span class="standalone-order-chip">POD</span>
                    </div>
                    ${renderMedia(detail)}
                  </article>
                </div>
              </div>
            </section>

            ${renderFeedbackBlock(detail, viewer)}
            ${renderShipperNoteBlock(detail, viewer)}
          </div>
        </section>
      </div>
    `;

      root.querySelectorAll("[data-order-action]").forEach((button) => {
        button.addEventListener("click", handleActionClick);
      });

      bindFeedbackForm(root);
      bindShipperNoteForm(root);
    }

    function renderState(message, type = "loading") {
      const root = getRoot();
      if (!root) return;

      const className =
        type === "error"
          ? "standalone-order-error"
          : type === "empty"
            ? "standalone-order-empty"
            : "standalone-order-loader";

      root.innerHTML = `<div class="${className}"><span>${escapeHtml(message)}</span></div>`;
    }

    return {
      render,
      renderState,
    };
  }

  window.GiaoHangNhanhOrderDetailRender = createOrderDetailRenderer;
})(window);
