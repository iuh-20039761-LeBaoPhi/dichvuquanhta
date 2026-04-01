(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});
  const config = app.config || {};
  const utils = app.utils || {};

  function initBookingConfirmFlow() {
    const form = document.getElementById("formdatdichvu");
    const bookingModalEl = document.getElementById("bookingModal");
    const confirmModalEl = document.getElementById("bookingConfirmModal");
    const imageInput = document.getElementById("tailenhinhanh");
    const videoInput = document.getElementById("tailenvideo");
    const confirmImages = document.getElementById("confirmImages");
    const confirmVideos = document.getElementById("confirmVideos");
    const confirmMediaUrls = [];
    const ORDER_CODE_PREFIX = "SXLD";
    const ORDER_CODE_STORE_KEY = "sua_xe_luu_dong_order_codes";
    const ORDER_CODE_TTL_MS = 24 * 60 * 60 * 1000;
    let currentOrderCode = "";

    function normalizeStoredOrderCodes(payload) {
      const now = Date.now();

      if (!Array.isArray(payload)) return [];

      const normalized = payload
        .map((item) => {
          if (typeof item === "string") {
            return { code: item, createdAt: now };
          }

          if (item && typeof item.code === "string") {
            const createdAt = Number(item.createdAt || 0);
            return {
              code: item.code,
              createdAt:
                Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now,
            };
          }

          return null;
        })
        .filter(Boolean)
        .filter((item) => now - item.createdAt < ORDER_CODE_TTL_MS);

      const deduped = new Map();
      normalized.forEach((item) => {
        deduped.set(item.code, item);
      });

      return Array.from(deduped.values());
    }

    function readStoredOrderCodeEntries() {
      try {
        const raw = localStorage.getItem(ORDER_CODE_STORE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const cleaned = normalizeStoredOrderCodes(parsed);
        localStorage.setItem(ORDER_CODE_STORE_KEY, JSON.stringify(cleaned));
        return cleaned;
      } catch (_err) {
        return [];
      }
    }

    function getStoredOrderCodes() {
      return readStoredOrderCodeEntries().map((item) => item.code);
    }

    function saveOrderCode(orderCode) {
      if (!orderCode) return;

      const existingEntries = readStoredOrderCodeEntries();
      if (existingEntries.some((item) => item.code === orderCode)) return;

      existingEntries.push({
        code: orderCode,
        createdAt: Date.now(),
      });

      const trimmed = existingEntries.slice(-3000);
      try {
        localStorage.setItem(ORDER_CODE_STORE_KEY, JSON.stringify(trimmed));
      } catch (_err) {
        // Ignore localStorage failure (private mode / quota exceeded).
      }
    }

    function createRandomOrderCode() {
      const numberPart = String(Math.floor(Math.random() * 10000)).padStart(
        4,
        "0",
      );
      return `${ORDER_CODE_PREFIX}${numberPart}`;
    }

    function generateUniqueOrderCode() {
      const existingCodes = new Set(getStoredOrderCodes());

      for (let i = 0; i < 200; i += 1) {
        const candidate = createRandomOrderCode();
        if (!existingCodes.has(candidate)) {
          saveOrderCode(candidate);
          return candidate;
        }
      }

      const fallback = `${ORDER_CODE_PREFIX}${Date.now().toString().slice(-4)}`;
      saveOrderCode(fallback);
      return fallback;
    }

    if (!form || !bookingModalEl || !confirmModalEl) return;
    if (form.dataset.confirmFlowBound === "true") return;
    form.dataset.confirmFlowBound = "true";

    const serviceSelect = document.getElementById("loaidichvu");
    const vehicleType = document.getElementById("loaixe");
    const brandSelect = document.getElementById("hangxe");
    const itemSelect = document.getElementById("mauxe");
    const customItemInput = document.getElementById("mauxekhac");
    const addressInput = document.getElementById("diachi");

    const priceInput = document.getElementById("giadichvu");
    const surveyInput = document.getElementById("phikhaosat");
    const transportInput = document.getElementById("phidichuyen");
    const totalInput = document.getElementById("tongchiphi");

    const datetimeInput = form.querySelector('input[type="datetime-local"]');
    const noteInput = form.querySelector("textarea");
    const isEmbeddedMode = Boolean(bookingModalEl.closest("#modalContainer"));

    function showBookingStep() {
      if (isEmbeddedMode) {
        bootstrap.Modal.getOrCreateInstance(bookingModalEl).show();
        return;
      }

      bookingModalEl.style.display = "block";
      bookingModalEl.classList.add("show");
      bookingModalEl.setAttribute("aria-hidden", "false");
    }

    function hideBookingStep() {
      if (isEmbeddedMode) {
        bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();
        return;
      }

      bookingModalEl.style.display = "none";
      bookingModalEl.classList.remove("show");
      bookingModalEl.setAttribute("aria-hidden", "true");
    }

    function normalizeValue(value) {
      if (value == null) return "-";
      const text = String(value).trim();
      return text || "-";
    }

    function clearConfirmMedia() {
      confirmMediaUrls.forEach((url) => URL.revokeObjectURL(url));
      confirmMediaUrls.length = 0;

      if (confirmImages) {
        confirmImages.innerHTML = '<span class="confirm-media-empty">-</span>';
      }
      if (confirmVideos) {
        confirmVideos.innerHTML = '<span class="confirm-media-empty">-</span>';
      }
    }

    function createConfirmMediaItem(fileName, previewNode) {
      const item = document.createElement("div");
      item.className = "confirm-media-item";

      const nameEl = document.createElement("div");
      nameEl.className = "confirm-media-name";
      nameEl.title = fileName;
      nameEl.textContent = fileName;

      item.appendChild(previewNode);
      item.appendChild(nameEl);
      return item;
    }

    function renderConfirmFileList(container, files, type) {
      if (!container) return;

      container.innerHTML = "";
      const list = Array.from(files || []);

      if (!list.length) {
        container.innerHTML = '<span class="confirm-media-empty">-</span>';
        return;
      }

      list.forEach((file) => {
        const url = URL.createObjectURL(file);
        confirmMediaUrls.push(url);

        let previewNode;
        if (type === "image") {
          previewNode = document.createElement("img");
          previewNode.alt = file.name || "Ảnh";
        } else {
          previewNode = document.createElement("video");
          previewNode.controls = true;
          previewNode.preload = "metadata";
        }

        previewNode.className = "confirm-media-thumb";
        previewNode.src = url;
        container.appendChild(
          createConfirmMediaItem(file.name || type, previewNode),
        );
      });
    }

    function renderConfirmMedia() {
      clearConfirmMedia();
      renderConfirmFileList(confirmImages, imageInput?.files, "image");
      renderConfirmFileList(confirmVideos, videoInput?.files, "video");
    }

    function selectedText(select) {
      if (!select) return "";
      const option = select.options[select.selectedIndex];
      if (!option) return "";
      const value = String(option.value || "").trim();
      if (!value) return "";
      return option.textContent || "";
    }

    function selectedItemText() {
      const selectedValue = String(itemSelect?.value || "").trim();
      if (!selectedValue) return "";

      if (selectedValue === "__other__") {
        return String(customItemInput?.value || "").trim();
      }

      return selectedText(itemSelect);
    }

    function moneyOnlyText(value) {
      const text = String(value || "").trim();
      if (!text) return "";

      return text.split("(")[0].trim();
    }

    function renderSummary() {
      if (!currentOrderCode) {
        currentOrderCode = generateUniqueOrderCode();
      }

      form.dataset.orderCode = currentOrderCode;

      const summary = {
        confirmName: document.getElementById("hotenkhachhang")?.value,
        confirmPhone: document.getElementById("sodienthoaikhachhang")?.value,
        confirmOrderCode: currentOrderCode,
        confirmService: selectedText(serviceSelect),
        confirmVehicleType: selectedText(vehicleType),
        confirmBrand: selectedText(brandSelect),
        confirmItem: selectedItemText(),
        confirmDatetime: datetimeInput?.value,
        confirmAddress: addressInput?.value,
        confirmPrice: priceInput?.value,
        confirmSurvey: surveyInput?.value,
        confirmTransport: moneyOnlyText(transportInput?.value),
        confirmTotal: totalInput?.value,
        confirmNote: noteInput?.value,
      };

      Object.entries(summary).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = normalizeValue(value);
      });
    }

    function collectBookingData() {
      if (!currentOrderCode) {
        currentOrderCode = generateUniqueOrderCode();
      }

      const transportFee = moneyOnlyText(transportInput?.value);
      const payload = {
        service_group: "sua-xe-luu-dong",
        name: document.getElementById("hotenkhachhang")?.value || "",
        phone: document.getElementById("sodienthoaikhachhang")?.value || "",
        order_code: currentOrderCode,
        service_name: selectedText(serviceSelect),
        vehicle_type: selectedText(vehicleType),
        brand: selectedText(brandSelect),
        item: selectedItemText(),
        booking_time: datetimeInput?.value || "",
        address: addressInput?.value || "",
        price: priceInput?.value || "",
        survey_fee: surveyInput?.value || "",
        transport_fee: transportFee,
        ship: transportFee,
        total: totalInput?.value || "",
        message: noteInput?.value || "",
      };

      return payload;
    }

    function parseJsonSafe(raw) {
      try {
        return raw ? JSON.parse(raw) : null;
      } catch (_err) {
        return null;
      }
    }

    function handleConfirmSubmit() {
      const payload = collectBookingData();
      const originalText = confirmBtn.textContent;

      if (!config.BOOKING_GOOGLE_SHEET_API) {
        console.error("Chưa cấu hình BOOKING_GOOGLE_SHEET_API để lưu dữ liệu.");
        utils.showToast?.(
          "Chưa cấu hình hệ thống lưu dữ liệu đặt lịch.",
          "error",
        );
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Đang gửi...";

      fetch(config.BOOKING_GOOGLE_SHEET_API, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          return response.text().then((raw) => {
            const result = parseJsonSafe(raw);
            if (!response.ok || !result || result.success !== true) {
              const serverMessage =
                (result && result.error) || raw || "Gửi dữ liệu thất bại";
              throw new Error(`HTTP ${response.status}: ${serverMessage}`);
            }
          });
        })
        .then(() => {
          bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
          hideBookingStep();

          utils.showToast?.(
            `Đặt dịch vụ thành công! Mã đơn hàng của bạn: ${payload.order_code}`,
            "success",
          );

          form.reset();
          clearConfirmMedia();
          currentOrderCode = "";
          delete form.dataset.orderCode;

          if (!isEmbeddedMode) {
            showBookingStep();
          }
        })
        .catch((err) => {
          console.error("Lỗi gửi dữ liệu sửa xe:", err);
          console.error("Không thể lưu dữ liệu đặt lịch. Vui lòng thử lại.");
          utils.showToast?.(
            "Không thể lưu dữ liệu đặt lịch. Vui lòng thử lại.",
            "error",
          );
        })
        .finally(() => {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        });
    }

    function backToBookingModal() {
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
      showBookingStep();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      renderSummary();
      renderConfirmMedia();

      hideBookingStep();
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
    });

    const backBtn = document.getElementById("confirmBackBtn");
    const closeBtn = document.getElementById("confirmCloseBtn");
    const confirmBtn = document.getElementById("confirmSubmitBtn");

    if (backBtn) {
      backBtn.addEventListener("click", backToBookingModal);
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", backToBookingModal);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", handleConfirmSubmit);
    }

    if (!confirmModalEl.dataset.mediaCleanupBound) {
      confirmModalEl.dataset.mediaCleanupBound = "true";
      confirmModalEl.addEventListener("hidden.bs.modal", function () {
        clearConfirmMedia();
      });
    }
  }

  app.confirm = app.confirm || {};
  app.confirm.initBookingConfirmFlow = initBookingConfirmFlow;
})(window);
