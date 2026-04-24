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
      getFeePayerLabel,
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
      const className = normalizeText(options.className || "");
      const valueClassName = normalizeText(options.valueClassName || "");
      return `
      <div class="standalone-order-info-row ${escapeHtml(className)}">
        <span>${safeLabel}</span>
        <${valueTag} class="standalone-order-info-value ${escapeHtml(valueClassName)}">${safeValue}</${valueTag}>
      </div>
    `;
    }

    function renderFeeSummaryRows(order) {
      const breakdown = order?.fee_breakdown || {};
      const totalFee = Number(breakdown.total_fee || order?.shipping_fee || 0);
      const withLabel = (baseLabel, extraLabel) =>
        normalizeText(extraLabel)
          ? `${baseLabel} (${normalizeText(extraLabel)})`
          : baseLabel;
      const hasBreakdownData = [
        breakdown.base_price,
        breakdown.goods_fee,
        breakdown.time_fee,
        breakdown.condition_fee,
        breakdown.vehicle_fee,
        breakdown.cod_fee,
        breakdown.insurance_fee,
      ].some((value) => Number(value || 0) > 0);
      const baseFee =
        Number(breakdown.base_price || 0) > 0
          ? Number(breakdown.base_price || 0)
          : !hasBreakdownData && totalFee > 0
            ? totalFee
            : 0;
      const rows = [
        {
          label: "Phí vận chuyển",
          value: baseFee,
        },
        {
          label: "Phụ phí loại hàng",
          value: Number(breakdown.goods_fee || 0),
        },
        {
          label: withLabel("Phụ phí khung giờ", breakdown.time_surcharge_label),
          value: Number(breakdown.time_fee || 0),
        },
        {
          label: withLabel(
            "Phụ phí thời tiết",
            breakdown.condition_surcharge_label,
          ),
          value: Number(breakdown.condition_fee || 0),
        },
        {
          label: "Điều chỉnh theo xe",
          value: Number(breakdown.vehicle_fee || 0),
        },
        {
          label: "Phí COD",
          value: Number(breakdown.cod_fee || 0),
        },
        {
          label: "Phí bảo hiểm",
          value: Number(breakdown.insurance_fee || 0),
        },
      ].filter((row) => row.value > 0);

      if (!rows.length && totalFee <= 0) {
        return renderInfoRow("Chi tiết phí", "Chưa có dữ liệu");
      }

      return rows
        .map((row) => renderInfoRow(row.label, formatCurrency(row.value)))
        .join("");
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
          label: "Đã hoàn thành",
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
          percent: 74,
          tone: "shipping",
          label: "Đang giao",
          note: "Shipper đang thực hiện lộ trình giao hàng và cập nhật minh chứng thực tế.",
        };
      }

      if (milestones.acceptedAt) {
        return {
          percent: 46,
          tone: "accepted",
          label: "Đã nhận đơn",
          note: `Đơn đã được shipper tiếp nhận lúc ${formatDateTime(
            milestones.acceptedAt,
          )}.`,
        };
      }

      return {
        percent: 24,
        tone: "pending",
        label: "Mới tiếp nhận",
        note: "Hệ thống đã ghi nhận đơn và đang chờ điều phối nhà cung cấp phù hợp.",
      };
    }

    function renderHeroStat(label, value, note, options = {}) {
      const className = normalizeText(options.className || "");
      const safeValue = options.valueHtml
        ? value || "--"
        : escapeHtml(value || "--");
      const safeNote = options.noteHtml
        ? note || "--"
        : escapeHtml(note || "--");
      const valueTag = options.valueTag || "strong";

      return `
      <article class="standalone-order-hero-stat ${escapeHtml(className)}">
        <span class="standalone-order-hero-stat-label">${escapeHtml(label || "--")}</span>
        <${valueTag} class="standalone-order-hero-stat-value">${safeValue}</${valueTag}>
        <small class="standalone-order-hero-stat-note">${safeNote}</small>
      </article>
    `;
    }

    function renderHeroScheduleCard(pickupSlotLabel, estimatedDelivery) {
      return `
      <article class="standalone-order-hero-support-card standalone-order-hero-support-card-schedule">
        <div class="standalone-order-hero-support-card-head">
          <span class="standalone-order-hero-support-icon">
            <i class="fa-solid fa-calendar-check"></i>
          </span>
          <div>
            <span class="standalone-order-hero-support-label">Khung lấy hàng</span>
            <strong>${escapeHtml(pickupSlotLabel || "Chờ xác nhận khung giờ")}</strong>
          </div>
        </div>
        <p class="standalone-order-hero-support-note">${escapeHtml(
          estimatedDelivery || "Thời gian giao sẽ được cập nhật khi có shipper nhận đơn.",
        )}</p>
      </article>
    `;
    }

    function renderHeroRouteCard(order) {
      return `
      <article class="standalone-order-hero-support-card standalone-order-hero-support-card-route">
        <div class="standalone-order-hero-support-card-head">
          <span class="standalone-order-hero-support-icon">
            <i class="fa-solid fa-route"></i>
          </span>
          <div>
            <span class="standalone-order-hero-support-label">Lộ trình</span>
            <strong>Tuyến giao nhận</strong>
          </div>
        </div>
        <div class="standalone-order-hero-route-list">
          <div class="standalone-order-hero-route-item">
            <span class="standalone-order-hero-route-icon">
              <i class="fa-solid fa-location-dot"></i>
            </span>
            <div class="standalone-order-hero-route-copy">
              <small>Gửi</small>
              <strong>${escapeHtml(order?.pickup_address || "--")}</strong>
            </div>
          </div>
          <div class="standalone-order-hero-route-item">
            <span class="standalone-order-hero-route-icon">
              <i class="fa-solid fa-flag-checkered"></i>
            </span>
            <div class="standalone-order-hero-route-copy">
              <small>Nhận</small>
              <strong>${escapeHtml(order?.delivery_address || "--")}</strong>
            </div>
          </div>
        </div>
      </article>
    `;
    }

    function renderOverviewStat(icon, label, value) {
      return `
      <article class="standalone-order-overview-stat">
        <div class="standalone-order-overview-stat-icon">
          <i class="${escapeHtml(icon)}"></i>
        </div>
        <div class="standalone-order-overview-stat-copy">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value || "--")}</strong>
        </div>
      </article>
    `;
    }

    function resolveAvatarUrl(value) {
      const raw = normalizeText(value || "");
      if (!raw) return "";
      const driveMatch = raw.match(/\/file\/d\/([^/?#]+)/i) ||
        raw.match(/[?&]id=([^&#]+)/i);
      const fileId = driveMatch ? driveMatch[1] : raw;
      if (/^[A-Za-z0-9_-]{20,}$/.test(fileId) && !/[./\\:]/.test(fileId)) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400`;
      }
      return raw;
    }

    function renderContactCard(icon, title, chip, rows, options = {}) {
      const phone = normalizeText(options.phone || "");
      const address = normalizeText(options.address || "");
      const toneClass = options.tone === "receiver" ? " is-receiver" : " is-sender";
      return `
      <article class="standalone-order-contact-card standalone-order-contact-person-card${toneClass}">
        <div class="standalone-order-contact-card-head">
          <div class="standalone-order-contact-card-title">
            <span class="standalone-order-contact-card-icon">
              <i class="${escapeHtml(icon)}"></i>
            </span>
            <div>
              <strong>${escapeHtml(title)}</strong>
            </div>
          </div>
          ${
            phone
              ? `<a class="standalone-order-contact-call" href="tel:${escapeHtml(phone)}" aria-label="Gọi ${escapeHtml(title)}"><i class="fa-solid fa-phone"></i></a>`
              : ""
          }
        </div>
        <div class="standalone-order-info-list standalone-order-contact-person-list">
          ${rows.join("")}
          <div class="standalone-order-contact-address-row">
            <i class="fa-solid fa-location-dot"></i>
            <div>
              <span>Địa chỉ</span>
              <strong>${escapeHtml(address || "--")}</strong>
            </div>
          </div>
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
                  <span><b>Số kiện</b><strong>${escapeHtml(item.so_luong || 1)}</strong></span>
                  <span><b>Cân nặng (kg/kiện)</b><strong>${formatWeight(item.can_nang)}</strong></span>
                  <span class="standalone-order-item-meta-declared"><b>Khai giá dòng</b><strong>${formatCurrency(item.gia_tri_khai_bao)}</strong></span>
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

    function renderAttachmentGallery(items, emptyMessage, options = {}) {
      const mediaItems = Array.isArray(items) ? items : [];
      if (!mediaItems.length && options.hideEmpty) return "";
      if (!mediaItems.length) {
        return `<div class="standalone-order-muted">${escapeHtml(emptyMessage)}</div>`;
      }
      const removable = options.removable === true;
      const removeName = options.removeName || "remove_feedback_media_indexes[]";
      const removeButtonLabel = options.removeButtonLabel || "Xóa media phản hồi";
      const removedLabel = options.removedLabel || "Sẽ xóa khi lưu";

      return `<div class="standalone-order-media-grid">${mediaItems
        .map((item, index) => {
          const mediaIndex = Number.isInteger(item.__mediaIndex)
            ? item.__mediaIndex
            : index;
          const extension = String(item.extension || "").toLowerCase();
          const rawTargetUrl = normalizeText(
            item.view_url || item.viewUrl || item.url || item.download_url || "",
          );
          const rawPreviewUrl = normalizeText(
            item.thumbnail_url ||
              item.thumbnailUrl ||
              item.view_url ||
              item.viewUrl ||
              item.url ||
              "",
          );
          const url = escapeHtml(rawTargetUrl || "#");
          const previewUrl = escapeHtml(rawPreviewUrl || rawTargetUrl || "#");
          const canPreview = hasPreviewableUrl(rawPreviewUrl || rawTargetUrl);
          let content = "";
          if (isImageExtension(extension) && canPreview) {
            content = `
              <img src="${previewUrl}" alt="Ảnh" />
            `;
          } else if (isVideoExtension(extension) && canPreview) {
            content = `
              <video src="${previewUrl}" controls preload="metadata"></video>
            `;
          } else {
            content = `
              <div class="standalone-order-item-icon">
                <i class="fa-solid fa-file-lines"></i>
              </div>
            `;
          }
          if (!removable) {
            return `
            <a class="standalone-order-media-item" href="${url}" target="_blank" rel="noreferrer">
              ${content}
            </a>
          `;
          }
          return `
            <div class="standalone-order-media-item standalone-order-media-item-removable" data-removable-media-index="${mediaIndex}" data-removed-label="${escapeHtml(removedLabel)}">
              <a class="standalone-order-media-preview-link" href="${url}" target="_blank" rel="noreferrer">
                ${content}
              </a>
              <button type="button" class="standalone-order-media-remove" data-remove-media aria-label="${escapeHtml(removeButtonLabel)}" title="${escapeHtml(removeButtonLabel)}">
                <i class="fa-solid fa-xmark"></i>
              </button>
              <input type="hidden" name="${escapeHtml(removeName)}" value="${mediaIndex}" disabled />
            </div>
          `;
        })
        .join("")}</div>`;
    }

    function groupMediaByKind(items) {
      return (Array.isArray(items) ? items : []).reduce(
        (groups, item, index) => {
          const mediaItem = { ...item, __mediaIndex: index };
          const extension = String(item?.extension || "").toLowerCase();
          if (isImageExtension(extension)) {
            groups.images.push(mediaItem);
          } else if (isVideoExtension(extension)) {
            groups.videos.push(mediaItem);
          } else {
            groups.other.push(mediaItem);
          }
          return groups;
        },
        { images: [], videos: [], other: [] },
      );
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
      const feedbackMediaGroups = groupMediaByKind(feedbackMedia);

      return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Phản hồi khách hàng</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout standalone-order-review-layout-inline">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>${canSubmit ? "Đánh giá dịch vụ" : "Phản hồi khách hàng"}</strong>
              ${Number(order.rating || 0) > 0 ? renderRatingStars(order.rating) : ""}
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
                      <div class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <label class="standalone-order-upload-picker">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                          <strong>Chụp hoặc gửi ảnh phản hồi</strong>
                          <input type="file" name="feedback_media_image" accept="image/*" capture="environment" multiple hidden />
                          <span id="standalone-feedback-image-files" class="standalone-order-upload-meta">Chưa chọn ảnh</span>
                        </label>
                        ${renderAttachmentGallery(feedbackMediaGroups.images, "", { removable: true, hideEmpty: true })}
                      </div>
                      <div class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <label class="standalone-order-upload-picker">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                          <strong>Gửi video phản hồi</strong>
                          <input type="file" name="feedback_media_video" accept="video/*" capture="environment" multiple hidden />
                          <span id="standalone-feedback-video-files" class="standalone-order-upload-meta">Chưa chọn video</span>
                        </label>
                        ${renderAttachmentGallery(feedbackMediaGroups.videos, "", { removable: true, hideEmpty: true })}
                      </div>
                    </div>
                    ${renderAttachmentGallery(feedbackMediaGroups.other, "", { removable: true, hideEmpty: true })}
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu phản hồi</button>
                    </div>
                  </form>`
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(order.feedback || (hasFeedback ? "" : "Chưa đánh giá"))}</p>
                    ${renderAttachmentGallery(feedbackMedia, "Chưa có ảnh/video phản hồi.")}
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
      const reportMediaGroups = groupMediaByKind(reports);

      return `
      <section class="standalone-order-block">
        <div class="standalone-order-block-header">
          <h2>Ghi chú NCC</h2>
        </div>
        <div class="standalone-order-side-stack standalone-order-review-layout">
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Ghi chú</strong>
            </div>
            <p class="standalone-order-note-text">${escapeHtml(order.shipper_note || "Chưa có ghi chú")}</p>
            ${canSubmit ? "" : renderAttachmentGallery(reports, "Chưa có ảnh/video.")}
          </article>
          <article class="standalone-order-subcard">
            <div class="standalone-order-subcard-head">
              <strong>Cập nhật</strong>
            </div>
            ${
              canSubmit
                ? `<form id="standalone-shipper-note-form" class="standalone-order-form">
                    <label class="standalone-order-field">
                      <span>Ghi chú xử lý</span>
                      <textarea name="shipper_note" rows="5" placeholder="Cập nhật tiến độ, vấn đề hiện trường hoặc lưu ý khi giao hàng.">${escapeHtml(order.shipper_note || "")}</textarea>
                    </label>
                    <div class="standalone-order-upload-grid">
                      <div class="standalone-order-upload-zone standalone-order-upload-zone-image">
                        <label class="standalone-order-upload-picker">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-camera"></i></span>
                          <strong>Chụp hoặc gửi ảnh báo cáo</strong>
                          <input type="file" name="shipper_media_image" accept="image/*" capture="environment" multiple hidden />
                          <span id="standalone-shipper-image-files" class="standalone-order-upload-meta">Chưa chọn ảnh</span>
                        </label>
                        ${renderAttachmentGallery(reportMediaGroups.images, "", { removable: true, removeName: "remove_shipper_report_indexes[]", removeButtonLabel: "Xóa media báo cáo", removedLabel: "Sẽ xóa khi lưu", hideEmpty: true })}
                      </div>
                      <div class="standalone-order-upload-zone standalone-order-upload-zone-video">
                        <label class="standalone-order-upload-picker">
                          <span class="standalone-order-upload-icon"><i class="fa-solid fa-video"></i></span>
                          <strong>Gửi video báo cáo</strong>
                          <input type="file" name="shipper_media_video" accept="video/*" capture="environment" multiple hidden />
                          <span id="standalone-shipper-video-files" class="standalone-order-upload-meta">Chưa chọn video</span>
                        </label>
                        ${renderAttachmentGallery(reportMediaGroups.videos, "", { removable: true, removeName: "remove_shipper_report_indexes[]", removeButtonLabel: "Xóa media báo cáo", removedLabel: "Sẽ xóa khi lưu", hideEmpty: true })}
                      </div>
                    </div>
                    ${renderAttachmentGallery(reportMediaGroups.other, "", { removable: true, removeName: "remove_shipper_report_indexes[]", removeButtonLabel: "Xóa media báo cáo", removedLabel: "Sẽ xóa khi lưu", hideEmpty: true })}
                    <div class="standalone-order-inline-actions">
                      <button class="customer-btn customer-btn-primary" type="submit">Lưu ghi chú NCC</button>
                    </div>
                  </form>`
                : `<div class="standalone-order-note-panel">
                    <p>${escapeHtml(
                      viewer === "shipper"
                        ? "Chỉ có thể thêm ghi chú sau khi đơn đã được nhận."
                        : hasShipperNoteContent(detail)
                          ? "Chỉ xem"
                          : "Chưa có ghi chú",
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
      const serviceMeta =
        order.service_meta && typeof order.service_meta === "object"
          ? order.service_meta
          : {};
      const distanceValue = Number(
        order.khoang_cach_km ||
          serviceMeta.distance_km ||
          order?.fee_breakdown?.khoang_cach_km ||
          0,
      );
      const distanceLabel =
        distanceValue > 0
          ? `${distanceValue.toLocaleString("vi-VN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })} km`
          : pickFirstText(order.distance_label, serviceMeta.distance_label) ||
            "--";
      const providerAvatar = pickFirstText(
        provider.avatar,
        provider.photo,
        provider.link_avatar,
        provider.avatar_link,
        provider.shipper_avatar,
        provider.ncc_avatar,
        viewer === "shipper" ? session?.link_avatar : "",
        viewer === "shipper" ? session?.avatar_link : "",
        viewer === "shipper" ? session?.avatar : "",
      );
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
      const progressMeta = getHeroProgressMeta(order);
      const totalFeeLabel = formatCurrency(
        order?.fee_breakdown?.total_fee || order.shipping_fee,
      );
      const serviceLabel =
        order.ten_dich_vu || order.service_label || order.service_name || "--";
      const feePayerLabel =
        order.payer_label ||
        (typeof getFeePayerLabel === "function"
          ? getFeePayerLabel(order.fee_payer || "gui")
          : "Người gửi");
      const milestones = getMilestones(order);
      const isCancelled = Boolean(
        milestones.cancelledAt ||
          ["cancelled", "canceled"].includes(
            String(order.status || "").trim().toLowerCase(),
          ),
      );
      const isCompleted = Boolean(
        milestones.completedAt ||
          ["completed", "delivered", "success"].includes(
            String(order.status || "").trim().toLowerCase(),
          ),
      );
      const isTerminal = isCancelled || isCompleted;
      const cancelledTimeLabel = isCancelled
        ? formatDateTime(
            milestones.cancelledAt || order.cancelled_at || order.updated_at,
          )
        : "";
      const completedTimeLabel = isCompleted
        ? formatDateTime(milestones.completedAt || order.completed_at || order.updated_at)
        : "";
      const pickupSlotLabel =
        pickFirstText(
          order.pickup_slot_label,
          order.ten_khung_gio_lay_hang,
          order.khung_gio_lay_hang,
          order.pickup_slot,
          serviceMeta.pickup_slot_label,
        ) || "--";
      const estimatedDelivery =
        pickFirstText(
          order.estimated_delivery,
          order.du_kien_giao_hang,
          order.estimated_eta,
          serviceMeta.estimated_eta,
        ) || "--";
      const vehicleLabel =
        pickFirstText(
          order.vehicle_label,
          order.ten_phuong_tien,
          order.vehicle_type,
          order.phuong_tien,
          serviceMeta.vehicle_label,
        ) || "--";
      const itemsSummary = getItemsSummary(detail.items || []);
      const senderName = order.sender_name || customer.fullname || "--";
      const senderPhone = order.sender_phone || customer.phone || "--";
      const receiverName = order.receiver_name || "--";
      const receiverPhone = order.receiver_phone || "--";
      const providerMetaLine = `
      <p class="standalone-order-note-text">${escapeHtml(providerPhone || "Chưa cập nhật")} · ${escapeHtml(providerAddress)}</p>
    `;
      const statusBadge = renderStatusBadge(progressMeta.tone, progressMeta.label);

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
              <div class="standalone-order-hero-frame-grid">
                <div class="standalone-order-hero-frame standalone-order-hero-frame-main">
                  <div class="standalone-order-card-title">
                    <p class="standalone-order-card-kicker">Chi tiết đơn hàng</p>
                    <h1>${escapeHtml(serviceLabel)}</h1>
                    <p class="standalone-order-card-subtitle standalone-order-reference">${escapeHtml(order.order_code || "--")}</p>
                  </div>

                  <div class="standalone-order-hero-summary-grid standalone-order-hero-fee-distance-row">
                    ${renderHeroStat(
                      "Tổng phí",
                      totalFeeLabel,
                      "Tổng tiền đơn",
                      { className: "standalone-order-hero-stat--amount" },
                    )}
                    ${renderHeroStat(
                      "Khoảng cách",
                      distanceLabel,
                      "Tuyến giao nhận",
                      { className: "standalone-order-hero-stat--distance" },
                    )}
                  </div>
                </div>

                <div class="standalone-order-hero-frame standalone-order-hero-frame-side standalone-order-hero-status-frame">
                  <div class="standalone-order-hero-progress-card">
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
                        <p class="standalone-order-progress-label">Trạng thái đơn hàng</p>
                        <div class="standalone-order-progress-status-row">${statusBadge}</div>
                        ${
                          cancelledTimeLabel
                            ? `<time>Hủy lúc ${escapeHtml(cancelledTimeLabel)}</time>`
                            : ""
                        }
                        ${
                          completedTimeLabel
                            ? `<time>Hoàn thành lúc ${escapeHtml(completedTimeLabel)}</time>`
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="standalone-order-hero-support-grid ${isTerminal ? "standalone-order-hero-support-grid--route-only" : ""}">
                ${isTerminal ? "" : renderHeroScheduleCard(pickupSlotLabel, estimatedDelivery)}
                <div class="standalone-order-hero-route-stack">
                  <div class="standalone-order-actions-group standalone-order-hero-actions-group standalone-order-route-actions-group">
                    ${buildActionButtons(detail, viewer)}
                  </div>
                  ${renderHeroRouteCard(order)}
                </div>
              </div>
            </div>
          </header>

          <div class="standalone-order-grid">
            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Tổng quan đơn hàng</h2>
              </div>
              <div class="standalone-order-summary-grid">
                <div class="standalone-order-panel standalone-order-panel-overview">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Thông tin điều phối</strong>
                    </div>
                    <span class="standalone-order-chip">Điều phối</span>
                  </div>
                  <div class="standalone-order-info-list">
                  ${renderInfoRow("Thanh toán", order.payment_method_label || "--")}
                  ${renderInfoRow("Người trả cước", feePayerLabel)}
                  ${renderInfoRow("Trạng thái thanh toán", order.payment_status_label || "Chưa hoàn tất")}
                  ${renderInfoRow("Phương tiện", vehicleLabel)}
                  </div>
                </div>
                <div class="standalone-order-panel standalone-order-panel-fees" id="order-summary-fees">
                  <div class="standalone-order-panel-head">
                    <div>
                      <strong>Chi tiết phí</strong>
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
                <h2>Người gửi và người nhận</h2>
              </div>
              <div class="standalone-order-contact-grid">
                ${renderContactCard(
                  "fa-solid fa-box",
                  "Người gửi",
                  "",
                  [
                    renderInfoRow("Tên", senderName),
                  ],
                  {
                    phone: senderPhone,
                    address: order.pickup_address,
                    tone: "sender",
                  },
                )}
                ${renderContactCard(
                  "fa-solid fa-hand-holding-heart",
                  "Người nhận",
                  "",
                  [
                    renderInfoRow("Tên", receiverName),
                  ],
                  {
                    phone: receiverPhone,
                    address: order.delivery_address,
                    tone: "receiver",
                  },
                )}
                <div class="standalone-order-contact-note">
                  <article class="standalone-order-contact-note-card">
                    <div class="standalone-order-contact-card-head">
                      <div class="standalone-order-contact-card-title">
                        <span class="standalone-order-contact-card-icon standalone-order-contact-card-icon-note">
                          <i class="fa-solid fa-photo-film"></i>
                        </span>
                        <div>
                          <strong>Ảnh/video khi đặt đơn</strong>
                        </div>
                      </div>
                    </div>
                    <div class="standalone-order-note-panel standalone-order-contact-note-panel">
                      ${renderAttachmentGallery(
                        provider.attachments,
                        "Chưa có ảnh hoặc video khi đặt đơn.",
                      )}
                    </div>
                  </article>
                  <article class="standalone-order-contact-note-card">
                    <div class="standalone-order-contact-card-head">
                      <div class="standalone-order-contact-card-title">
                        <span class="standalone-order-contact-card-icon standalone-order-contact-card-icon-note">
                          <i class="fa-solid fa-note-sticky"></i>
                        </span>
                        <div>
                          <strong>Ghi chú</strong>
                        </div>
                      </div>
                    </div>
                    <div class="standalone-order-note-panel standalone-order-contact-note-panel">
                      <p>${escapeHtml(order.clean_note || "Không có")}</p>
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
                  "fa-solid fa-layer-group",
                  "Số kiện",
                  String(itemsSummary.quantity || 0),
                )}
                ${renderOverviewStat(
                  "fa-solid fa-weight-hanging",
                  "Tổng cân nặng",
                  formatWeight(itemsSummary.weight),
                )}
                ${renderOverviewStat(
                  "fa-solid fa-file-invoice-dollar",
                  "Giá trị khai báo",
                  formatCurrency(itemsSummary.declared || 0),
                )}
              </div>
              ${renderItems(detail.items || [])}
            </section>

            <section class="standalone-order-block">
              <div class="standalone-order-block-header">
                <h2>Nhà cung cấp và tiến độ giao hàng</h2>
              </div>
              <div class="standalone-order-provider-shell">
                <article class="standalone-order-provider-card">
                  <div class="standalone-order-provider-head">
                    <div class="standalone-order-provider-avatar">
                      ${
                        providerAvatar
                          ? `<img src="${escapeHtml(resolveAvatarUrl(providerAvatar))}" alt="${escapeHtml(providerName)}" />`
                          : escapeHtml(providerName.charAt(0) || "N")
                      }
                    </div>
                    <div>
                      <strong>${escapeHtml(providerName)}</strong>
                      ${providerMetaLine}
                    </div>
                  </div>
                </article>
                <div class="standalone-order-provider-grid">
                  <article class="standalone-order-timeline-card">
                    <div class="standalone-order-panel-head">
                      <div>
                        <strong>Timeline trạng thái</strong>
                      </div>
                    </div>
                    ${buildTimeline(detail)}
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
