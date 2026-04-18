// Tách phần upload/preview media để form chính chỉ giữ orchestration.
function revokePreviewUrl(preview) {
    const currentUrl = preview?.dataset?.objectUrl;
    if (currentUrl) {
      window.URL.revokeObjectURL(currentUrl);
      delete preview.dataset.objectUrl;
    }
  }

  function revokePreviewUrlsIn(container) {
    container?.querySelectorAll("[data-object-url]").forEach((node) => {
      const url = node.getAttribute("data-object-url");
      if (url) {
        window.URL.revokeObjectURL(url);
        node.removeAttribute("data-object-url");
      }
    });
  }

  // Gom toàn bộ file từ nhiều input để dùng chung cho preview hoặc màn xác nhận.
  function collectFileItemsFromInputs(scope, selector) {
    const items = [];
    scope.querySelectorAll(selector).forEach((input) => {
      Array.from(input.files || []).forEach((file) => {
        items.push({
          file,
          kind: file.type.startsWith("video/") ? "video" : "image",
        });
      });
    });
    return items;
  }

  // Render lưới media thống nhất cho cả preview tại chỗ và preview ở bước xác nhận.
  function renderMediaPreviewGrid(core, grid, items, options = {}) {
    if (!grid) return;

    const {
      videoControls = true,
      mutedVideo = false,
      cardClassName = "the-media-xac-nhan-dat-lich",
      maxItems = 0,
      compactLabel = false,
    } = options;

    revokePreviewUrlsIn(grid);
    grid.innerHTML = "";

    if (!Array.isArray(items) || !items.length) {
      grid.hidden = true;
      return;
    }

    const visibleItems = maxItems > 0 ? items.slice(0, maxItems) : items;
    const remainingCount = maxItems > 0 ? Math.max(items.length - maxItems, 0) : 0;

    grid.hidden = false;
    const cardsHtml = visibleItems
      .map(({ file, kind }, index) => {
        const objectUrl = window.URL.createObjectURL(file);
        const escapedName = core.escapeHtml(file.name);
        const labelText = compactLabel
          ? `${kind === "video" ? "Video" : "Ảnh"} ${index + 1}`
          : escapedName;
        const media =
          kind === "video"
            ? `<video ${videoControls ? "controls " : ""}${mutedVideo ? "muted playsinline " : ""}preload="metadata" src="${objectUrl}" data-object-url="${objectUrl}"></video>`
            : `<img src="${objectUrl}" alt="${escapedName}" data-object-url="${objectUrl}" />`;

        return `
          <article class="${cardClassName}">
            ${media}
            <div class="meta-media-xac-nhan-dat-lich">
              <strong title="${escapedName}">${labelText}</strong>
              <span>${kind === "video" ? "Video" : "Ảnh"} đính kèm ${index + 1}</span>
            </div>
          </article>
        `;
      })
      .join("");

    const overflowCardHtml = remainingCount
      ? `
          <article class="${cardClassName} the-media-xac-nhan-dat-lich--more">
            <div class="the-media-xac-nhan-dat-lich__them">+${remainingCount}</div>
            <div class="meta-media-xac-nhan-dat-lich">
              <strong>${remainingCount} tệp còn lại</strong>
              <span>Đã chọn thêm ngoài preview</span>
            </div>
          </article>
        `
      : "";

    grid.innerHTML = `${cardsHtml}${overflowCardHtml}`;
  }

  // Cập nhật preview file ngay tại khu upload sau mỗi lần người dùng chọn lại tệp.
  function updateFilePreview(core, scope, input) {
    const previewGridId = input.getAttribute("data-xem-truoc-luoi");
    const previewEmptyId = input.getAttribute("data-xem-truoc-trang-thai");
    const previewGrid = previewGridId
      ? scope.querySelector(`#${previewGridId}`)
      : null;
    const previewEmpty = previewEmptyId
      ? scope.querySelector(`#${previewEmptyId}`)
      : null;

    if (previewGrid) {
      const items = Array.from(input.files || []).map((file) => ({
        file,
        kind: file.type.startsWith("video/") ? "video" : "image",
      }));
      renderMediaPreviewGrid(core, previewGrid, items, {
        videoControls: false,
        mutedVideo: true,
        cardClassName:
          "the-media-xac-nhan-dat-lich the-media-xac-nhan-dat-lich--upload",
      });

      if (previewEmpty) previewEmpty.hidden = items.length > 0;
      previewGrid.hidden = !items.length;
      return;
    }

    const previewId = input.getAttribute("data-xem-truoc-tep");
    const preview = previewId ? scope.querySelector(`#${previewId}`) : null;
    if (!preview) return;

    revokePreviewUrl(preview);

    const file = input.files && input.files[0];
    if (!file) {
      if (preview.tagName === "VIDEO") {
        preview.pause();
        preview.removeAttribute("src");
        preview.load();
      } else {
        preview.removeAttribute("src");
      }
      preview.hidden = true;
      return;
    }

    const objectUrl = window.URL.createObjectURL(file);
    preview.dataset.objectUrl = objectUrl;
    preview.src = objectUrl;
    preview.hidden = false;

    if (preview.tagName === "VIDEO") {
      preview.load();
    }
  }

  // Tạo lại danh sách media ở bước xác nhận từ các file người dùng đã tải lên.
  function renderBookingMediaReview(core, scope) {
    const emptyState = scope.querySelector("[data-media-dat-lich-rong]");
    const grid = scope.querySelector("[data-media-dat-lich-luoi]");
    const section = scope.querySelector("[data-booking-confirm-section='media']");
    const title = scope.querySelector("[data-media-dat-lich-tieu-de]");
    if (!emptyState || !grid) return;

    const items = collectFileItemsFromInputs(
      scope,
      "#tep-anh-dat-lich, #tep-video-dat-lich",
    );

    if (!items.length) {
      emptyState.hidden = false;
      grid.hidden = true;
      if (section) section.hidden = true;
      if (title) title.textContent = "Media đính kèm";
      revokePreviewUrlsIn(grid);
      grid.innerHTML = "";
      return;
    }

    emptyState.hidden = true;
    if (section) section.hidden = false;
    if (title) title.textContent = `Media đính kèm (${items.length} tệp)`;
    renderMediaPreviewGrid(core, grid, items, {
      videoControls: true,
      mutedVideo: false,
      cardClassName: "the-media-xac-nhan-dat-lich",
      maxItems: 4,
      compactLabel: true,
    });
  }

  // Gắn listener cho toàn bộ file input và tự đồng bộ text + preview.
  function initFileInputs(core, scope) {
    scope
      .querySelectorAll("input[type='file'][data-dich-ten-tep]")
      .forEach((input) => {
        const targetId = input.getAttribute("data-dich-ten-tep");
        const output = targetId ? scope.querySelector(`#${targetId}`) : null;
        const emptyText =
          input.getAttribute("data-van-ban-rong") || "Chưa có tệp nào được chọn";
        if (!output) return;

        input.addEventListener("change", function () {
          const total = input.files ? input.files.length : 0;
          if (!total) {
            output.textContent = emptyText;
            updateFilePreview(core, scope, input);
            return;
          }

          if (total === 1) {
            output.textContent = input.files[0].name;
            updateFilePreview(core, scope, input);
            return;
          }

          output.textContent = `${total} tệp đã được chọn`;
          updateFilePreview(core, scope, input);
        });
      });
  }

const formMediaModule = {
  collectFileItemsFromInputs,
  initFileInputs,
  renderBookingMediaReview,
};

export {
  collectFileItemsFromInputs,
  initFileInputs,
  renderBookingMediaReview,
  formMediaModule,
};
export default formMediaModule;
