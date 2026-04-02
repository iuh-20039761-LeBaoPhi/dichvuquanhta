(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});
  const config = app.config || {};
  const utils = app.utils || {};

  function initBookingConfirmFlow() {
    const form = document.querySelector(".contactForm");
    const bookingModalEl = document.getElementById("bookingModal");
    const confirmModalEl = document.getElementById("bookingConfirmModal");
    const imageInput = document.getElementById("tailenhinhanh");
    const videoInput = document.getElementById("tailenvideo");
    const confirmImages = document.getElementById("confirmImages");
    const confirmVideos = document.getElementById("confirmVideos");
    const confirmMediaUrls = [];
    const ORDER_CODE_PREFIX = "GUN";
    let currentOrderCode = "";

    function createRandomOrderCode() {
      const numberPart = String(Math.floor(Math.random() * 1000000)).padStart(
        6,
        "0",
      );
      return `${ORDER_CODE_PREFIX}${numberPart}`;
    }

    async function isOrderCodeExistsOnKrud(orderCode) {
      if (!config.BOOKING_KRUD_TABLE) {
        throw new Error("Thiếu cấu hình BOOKING_KRUD_TABLE.");
      }
      // Truy vấn KRUD API để đảm bảo mã đơn chưa tồn tại trước khi sử dụng.
      const result = await Promise.resolve(
        krudList({
          table: config.BOOKING_KRUD_TABLE,
          where: [{ field: "madonhang", operator: "=", value: orderCode }],
          limit: 1,
        }),
      );

      if (Array.isArray(result)) return result.length > 0;
      if (Array.isArray(result?.data)) return result.data.length > 0;
      if (Array.isArray(result?.items)) return result.items.length > 0;
      if (Array.isArray(result?.rows)) return result.rows.length > 0;
      if (Array.isArray(result?.result)) return result.result.length > 0;

      const total = Number(result?.total || result?.count || result?.records);
      return Number.isFinite(total) && total > 0;
    }

    async function generateUniqueOrderCode() {
      for (let i = 0; i < 50; i += 1) {
        const candidate = createRandomOrderCode();
        const exists = await isOrderCodeExistsOnKrud(candidate);
        if (!exists) return candidate;
      }

      throw new Error(
        "Không thể tạo mã đơn duy nhất sau 50 lần thử. Vui lòng thử lại.",
      );
    }

    if (!form || !bookingModalEl || !confirmModalEl) return;
    if (form.dataset.confirmFlowBound === "true") return;
    form.dataset.confirmFlowBound = "true";

    const isEmbeddedMode = Boolean(bookingModalEl.closest("#modalContainer"));
    let pendingStandaloneAction = null;
    let shouldReturnToBookingAfterConfirmHidden = false;

    function cleanupStandaloneModalArtifacts() {
      if (isEmbeddedMode) return;

      document
        .querySelectorAll(".modal-backdrop")
        .forEach((backdrop) => backdrop.remove());

      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    }

    function showBookingStep() {
      if (isEmbeddedMode) {
        bootstrap.Modal.getOrCreateInstance(bookingModalEl).show();
        return;
      }

      cleanupStandaloneModalArtifacts();
      bookingModalEl.style.display = "block";
      bookingModalEl.setAttribute("aria-hidden", "false");
    }

    function hideBookingStep() {
      if (isEmbeddedMode) {
        bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();
        return;
      }

      bookingModalEl.style.display = "none";
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

    function collectBookingData() {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const serviceSelect = document.getElementById("dichvuquantam");
      const transportOptionSelect = document.getElementById("hinhthucnhangiao");
      const kgInput = document.getElementById("khoiluong");
      const pairInput = document.getElementById("pair");
      const kgBox = document.getElementById("khoiluongbox");
      const pairBox = document.getElementById("pairBox");

      const serviceText =
        serviceSelect?.options[serviceSelect.selectedIndex]?.text;
      const transportOptionText =
        transportOptionSelect?.options[transportOptionSelect.selectedIndex]
          ?.text;

      const isKgVisible = kgBox && getComputedStyle(kgBox).display !== "none";
      const isPairVisible =
        pairBox && getComputedStyle(pairBox).display !== "none";

      const selectedWorkItems = Array.from(
        form.querySelectorAll('input[name="congviec"]:checked'),
      ).map((el) => el.value);
      const selectedChemicals = Array.from(
        form.querySelectorAll('input[name="hoachathotro"]:checked'),
      ).map((el) => el.value);

      let quantity = "";
      if (isKgVisible && kgInput?.value) quantity = `${kgInput.value} kg`;
      if (isPairVisible && pairInput?.value)
        quantity = `${pairInput.value} đôi`;

      data.service_name =
        serviceText && serviceText !== "Chọn dịch vụ" ? serviceText : "";
      data.order_code = currentOrderCode || "";
      data.sub_service =
        transportOptionText &&
        transportOptionText !== "Chọn hình thức nhận / giao"
          ? transportOptionText
          : "";
      data.quantity = quantity;
      data.price = document.getElementById("giadichvu")?.value || "";
      data.ship = document.getElementById("tiendichuyen")?.value || "";

      const shippingSurchargeEl = document.getElementById("phuphigiaonhan");
      const parseIntegerLike =
        typeof utils.parseIntegerLike === "function"
          ? utils.parseIntegerLike
          : () => 0;

      const rawShippingSurcharge = parseIntegerLike(
        shippingSurchargeEl?.dataset.rawValue ||
          shippingSurchargeEl?.value ||
          "0",
      );

      data.shipping_surcharge = rawShippingSurcharge.toLocaleString("vi-VN");
      data.total = document.getElementById("tongtien")?.value || "";
      data.work_items = selectedWorkItems.join(", ");
      data.support_chemicals = selectedChemicals.join(", ");

      data.name = data.hoten || "";
      data.phone = data.sodienthoai || "";
      data.address = data.diachi || "";
      data.message = data.ghichu || "";
      data.service = data.dichvu || "";
      data.transport_option = data.hinhthucnhangiao || "";

      const rawBookingTime = String(data.thoigiandatdichvu || "").trim();
      const bookingTimeDisplay = rawBookingTime
        ? new Date(rawBookingTime).toLocaleString("vi-VN")
        : "";
      data.booking_time = rawBookingTime;

      return {
        data,
        preview: {
          name: data.name,
          orderCode: data.order_code,
          phone: data.phone,
          address: data.address,
          bookingTime: bookingTimeDisplay,
          service: data.service_name,
          subService: data.sub_service,
          quantity: data.quantity,
          price: data.price,
          ship: data.ship,
          shippingSurcharge: rawShippingSurcharge.toLocaleString("vi-VN"),
          total: data.total,
          workItems: data.work_items,
          chemicals: data.support_chemicals,
          message: data.message,
        },
      };
    }

    function renderConfirmModal(preview) {
      const fields = {
        confirmName: preview.name,
        confirmOrderCode: preview.orderCode,
        confirmPhone: preview.phone,
        confirmAddress: preview.address,
        confirmBookingTime: preview.bookingTime,
        confirmService: preview.service,
        confirmSubService: preview.subService,
        confirmQuantity: preview.quantity,
        confirmPrice: preview.price,
        confirmShip: preview.ship,
        confirmShippingSurcharge: preview.shippingSurcharge,
        confirmTotal: preview.total,
        confirmWorkItems: preview.workItems,
        confirmChemicals: preview.chemicals,
        confirmMessage: preview.message,
      };

      Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = normalizeValue(value);
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (typeof utils.fillBookingTimeNow === "function") {
        utils.fillBookingTimeNow(true);
      }

      try {
        await ensureCurrentOrderCode();
      } catch (_err) {
        return;
      }

      const { preview } = collectBookingData();
      renderConfirmModal(preview);
      renderConfirmMedia();

      hideBookingStep();
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
    });

    function hideConfirmAndQueueReturn(action) {
      shouldReturnToBookingAfterConfirmHidden = action === "show-booking";
      pendingStandaloneAction = isEmbeddedMode ? null : action;
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
    }

    function backToBooking() {
      hideConfirmAndQueueReturn("show-booking");
    }

    async function ensureCurrentOrderCode() {
      if (currentOrderCode) return currentOrderCode;

      try {
        currentOrderCode = await generateUniqueOrderCode();
        return currentOrderCode;
      } catch (err) {
        console.error("Lỗi tạo mã đơn:", err);
        if (typeof utils.showToast === "function") {
          utils.showToast(
            "Không thể tạo mã đơn lúc này. Vui lòng thử lại sau.",
            "error",
          );
        }

        const wrappedError = new Error(
          "ORDER_CODE_GENERATION_FAILED: Không thể tạo mã đơn.",
        );
        wrappedError.cause = err;
        throw wrappedError;
      }
    }

    function normalizeMoneyToNumber(value) {
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.round(value);
      }

      const raw = String(value == null ? "" : value).trim();
      if (!raw) return 0;

      const sign = raw.includes("-") ? -1 : 1;
      const digits = raw.replace(/\D/g, "");
      if (!digits) return 0;

      return sign * Number(digits);
    }

    function buildBookingSheetPayload(formData) {
      return {
        sheet_type: "Giặt ủi nhanh",
        created_at: "",
        "Mã đơn": formData.order_code || "",
        "Tên khách": formData.name || "",
        "Số điện thoại": formData.phone || "",
        "Địa chỉ": formData.address || "",
        "Dịch vụ": formData.service_name || formData.service || "",
        "Hình thức nhận/giao": formData.sub_service || "",
        "Số lượng": formData.quantity || "",
        "Giá dịch vụ": normalizeMoneyToNumber(formData.price),
        "Tiền di chuyển": normalizeMoneyToNumber(formData.ship),
        "Phụ phí giao/nhận": normalizeMoneyToNumber(
          formData.shipping_surcharge,
        ),
        "Tổng tiền": normalizeMoneyToNumber(formData.total),
        "Công việc": formData.work_items || "",
        "Hóa chất hỗ trợ": formData.support_chemicals || "",
        "Thời gian đặt": formData.booking_time || "",
        "Ghi chú": formData.message || "",
        "Trang thái đơn": "Pending",
        "Trạng thái thanh toán": "Unpaid",
      };
    }

    function saveToGoogleSheet(data) {
      if (typeof window.saveToGoogleSheet !== "function") {
        return Promise.reject(new Error("driveUtil.js chưa được nạp."));
      }

      const sheetPayload = buildBookingSheetPayload(data);

      return Promise.resolve(window.saveToGoogleSheet(sheetPayload)).then(
        (result) => {
          const isSuccess =
            result && (result.status === "success" || result.success === true);

          if (!isSuccess) {
            const serverMessage =
              (result && (result.error || result.message)) ||
              "Gửi dữ liệu thất bại";
            throw new Error(serverMessage);
          }

          return result;
        },
      );
    }

    function saveToKrudApi(data) {
      if (!config.BOOKING_KRUD_TABLE) {
        return Promise.reject(new Error("Thiếu cấu hình BOOKING_KRUD_TABLE."));
      }
      console.log("Saving to KRUD API with data:", data, "and config:", config);
      const dbPayload = {
        madonhang: data.order_code || "",
        hovaten: data.name || "",
        sodienthoai: data.phone || "",
        dichvu: data.service_name || "",
        hinhthucnhangiao: data.sub_service || "",
        soluong: data.quantity || "",
        giadichvu: normalizeMoneyToNumber(data.price) || "",
        tiendichuyen: normalizeMoneyToNumber(data.ship) || "",
        phuphigiaonhan: normalizeMoneyToNumber(data.shipping_surcharge) || "",
        tongtien: normalizeMoneyToNumber(data.total) || "",
        danhsachcongviec: data.work_items || "",
        danhsachhoachat: data.support_chemicals || "",
        thoigiandatdichvu: data.booking_time || "",
        diachi: data.address || "",
        ghichu: data.message || "",
        trangthaidon: "Pending",
        trangthaithanhtoan: "Unpaid",
      };
      console.log("Constructed KRUD payload:", dbPayload);
      return Promise.resolve(
        krud("insert", config.BOOKING_KRUD_TABLE, dbPayload),
      ).then((res) => {
        if (!res || res.success === false || res.error) {
          const errorMessage =
            (res && (res.message || res.error)) ||
            "Không thể lưu dữ liệu vào CSDL.";
          throw new Error(`KRUD API: ${errorMessage}`);
        }

        return res;
      });
    }

    async function handleConfirmSubmit() {
      const originalText = confirmBtn.textContent;

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Đang gửi...";

      try {
        await ensureCurrentOrderCode();
        const { data } = collectBookingData();

        await Promise.all([saveToGoogleSheet(data), saveToKrudApi(data)]);

        hideConfirmAndQueueReturn("submit-success");
        hideBookingStep();

        if (typeof utils.showToast === "function") {
          utils.showToast(
            "Đặt dịch vụ thành công! Chúng tôi sẽ liên hệ sớm.",
            "success",
          );
        }

        form.reset();
        clearConfirmMedia();
        currentOrderCode = "";

        if (!isEmbeddedMode) {
          pendingStandaloneAction = "show-booking";
        }
      } catch (err) {
        const msg = String(err && err.message ? err.message : "");
        if (msg.includes("ORDER_CODE_GENERATION_FAILED")) {
          return;
        }

        console.error("Lỗi gửi dữ liệu đặt lịch:", err);
        if (msg.includes("401")) {
          const permissionMessage =
            "API Google Sheet chưa được cấp quyền public (401). Vui lòng Deploy Web App với quyền Anyone và chạy bằng tài khoản chủ sở hữu script.";
          console.error(permissionMessage);
          if (typeof utils.showToast === "function") {
            utils.showToast(permissionMessage, "error");
          }
          return;
        }

        const failMessage = "Không thể gửi dữ liệu. Vui lòng thử lại.";
        console.error(failMessage);
        if (typeof utils.showToast === "function") {
          utils.showToast(failMessage, "error");
        }
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      }
    }

    const backBtn = document.getElementById("confirmBackBtn");
    const closeBtn = document.getElementById("confirmCloseBtn");
    const confirmBtn = document.getElementById("confirmSubmitBtn");

    if (backBtn) {
      backBtn.addEventListener("click", backToBooking);
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        shouldReturnToBookingAfterConfirmHidden = true;

        if (!isEmbeddedMode) {
          pendingStandaloneAction = "show-booking";
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", handleConfirmSubmit);
    }

    if (!confirmModalEl.dataset.mediaCleanupBound) {
      confirmModalEl.dataset.mediaCleanupBound = "true";
      confirmModalEl.addEventListener("hidden.bs.modal", function () {
        clearConfirmMedia();

        if (isEmbeddedMode) {
          if (shouldReturnToBookingAfterConfirmHidden) {
            shouldReturnToBookingAfterConfirmHidden = false;
            showBookingStep();
          }
          return;
        }

        cleanupStandaloneModalArtifacts();

        if (pendingStandaloneAction === "show-booking") {
          pendingStandaloneAction = null;
          shouldReturnToBookingAfterConfirmHidden = false;
          showBookingStep();
          return;
        }

        pendingStandaloneAction = null;
        shouldReturnToBookingAfterConfirmHidden = false;
      });
    }
  }

  app.confirm = app.confirm || {};
  app.confirm.initBookingConfirmFlow = initBookingConfirmFlow;
})(window);
