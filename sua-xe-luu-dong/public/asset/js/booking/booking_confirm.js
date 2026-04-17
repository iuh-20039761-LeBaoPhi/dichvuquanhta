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

    if (!form || !bookingModalEl || !confirmModalEl) return;
    if (form.dataset.confirmFlowBound === "true") return;
    form.dataset.confirmFlowBound = "true";

    const serviceSelect = document.getElementById("loaidichvu");
    const vehicleType = document.getElementById("loaixe");
    const brandSelect = document.getElementById("hangxe");
    const customBrandInput = document.getElementById("hangxekhac");
    const itemSelect = document.getElementById("mauxe");
    const customItemInput = document.getElementById("mauxekhac");
    const addressInput = document.getElementById("diachi");


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

    function selectedBrandText() {
      const selectedValue = String(brandSelect?.value || "").trim();
      if (!selectedValue) return "";

      if (selectedValue === "__other__") {
        return String(customBrandInput?.value || "").trim();
      }

      return selectedText(brandSelect);
    }

    function moneyOnlyText(value) {
      const text = String(value || "").trim();
      if (!text) return "";

      return text.split("(")[0].trim();
    }

    function renderSummary() {
      const yeucaugapCheckbox = document.getElementById("yeucaugap");
      const isGhep = yeucaugapCheckbox ? yeucaugapCheckbox.checked : false;

      const summary = {
        confirmName: document.getElementById("hotenkhachhang")?.value,
        confirmPhone: document.getElementById("sodienthoaikhachhang")?.value,
        confirmService: selectedText(serviceSelect),
        confirmVehicleType: selectedText(vehicleType),
        confirmBrand: selectedBrandText(),
        confirmItem: selectedItemText(),
        confirmDatetime: datetimeInput?.value,
        confirmUrgent: isGhep ? "Có (trong 1h)" : "Không",
        confirmAddress: addressInput?.value,

        confirmSurvey: surveyInput?.value,
        confirmTransport: moneyOnlyText(transportInput?.value),
        confirmTotal: totalInput?.value,
        confirmNote: noteInput?.value,
      };

      Object.entries(summary).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = normalizeValue(value);
      });

      const confirmUrgentEl = document.getElementById("confirmUrgent");
      if (confirmUrgentEl) {
          if (isGhep) {
              confirmUrgentEl.classList.add("text-danger", "fw-bold");
          } else {
              confirmUrgentEl.classList.remove("text-danger");
          }
      }
    }

    function collectBookingData() {
      const transportFee = moneyOnlyText(transportInput?.value);
      const yeucaugapCheckbox = document.getElementById("yeucaugap");
      const isGhep = yeucaugapCheckbox ? yeucaugapCheckbox.checked : false;

      const payload = {
        name: document.getElementById("hotenkhachhang")?.value || "",
        phone: document.getElementById("sodienthoaikhachhang")?.value || "",
        service_name: selectedText(serviceSelect),
        vehicle_type: selectedText(vehicleType),
        brand: selectedBrandText(),
        item: selectedItemText(),
        booking_time: datetimeInput?.value || "",
        address: addressInput?.value || "",
        lat_kh: (addressInput?.dataset.lat || "").trim(),
        lng_kh: (addressInput?.dataset.lng || "").trim(),
        yeucaugap: isGhep ? "Có" : "Không",

        survey_fee: surveyInput?.value || "",
        transport_fee: transportFee,
        ship: transportFee,
        total: totalInput?.value || "",
        message: noteInput?.value || "",
        anh_id: "",
        video_id: "",
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
    

    function saveToKrudApi(data) {
      if (!config.BOOKING_KRUD_TABLE) {
        return Promise.reject(new Error("Thiếu cấu hình BOOKING_KRUD_TABLE."));
      }
      const dbPayload = {
        hovaten: data.name || "",
        sodienthoai: data.phone || "",
        dichvu: data.service_name || "",
        loaixe: data.vehicle_type || "",
        hangxe: data.brand || "",
        mauxe: data.item || "",
        phikhaosat: normalizeMoneyToNumber(data.survey_fee),
        tiendichuyen: normalizeMoneyToNumber(data.transport_fee),
        tongtien: normalizeMoneyToNumber(data.total),
        ngaydat: data.booking_time || "",
        diachi: data.address || "",
        lat_kh: data.lat_kh || "",
        lng_kh: data.lng_kh || "",
        ghichu: data.message || "",
        yeucaugap: data.yeucaugap || "Không",
        trangthaithanhtoan: "Unpaid",
        anh_id: data.anh_id || "",
        video_id: data.video_id || "",
      };

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

    function buildBookingSheetPayload(formData) {
      return {
        sheet_type: "Sửa xe lưu động",
        "Tên khách": formData.name || "",
        "Số điện thoại": formData.phone || "",
        "Địa chỉ": formData.address || "",
        lat_kh: formData.lat_kh || "",
        lng_kh: formData.lng_kh || "",
        "Yêu cầu gấp": formData.yeucaugap || "Không",
        "Dịch vụ": formData.service_name || "",
        "Loại xe": formData.vehicle_type || "",
        "Hãng xe": formData.brand || "",
        "Mẫu xe": formData.item || "",
        "Ngày đặt": formData.booking_time || "",
        "Phí khảo sát": normalizeMoneyToNumber(formData.survey_fee),
        "Tiền di chuyển": normalizeMoneyToNumber(formData.transport_fee),
        "Tổng tiền": normalizeMoneyToNumber(formData.total),
        "Ghi chú": formData.message || "",
        "Trạng thái thanh toán": "Unpaid",
        "Ảnh ID": formData.anh_id || "",
        "Video ID": formData.video_id || "",
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
              "Gửi dữ liệu Google Sheet thất bại";
            throw new Error(serverMessage);
          }

          return result;
        },
      );
    }

    async function handleConfirmSubmit() {
      const originalText = confirmBtn.textContent;

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Đang chuẩn bị...";

      try {
        // --- BƯỚC 1: UPLOAD ẢNH & VIDEO LÊN GOOGLE DRIVE ---
        const uploadOne = async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("name", file.name);
          try {
            const resp = await fetch("upload.php", {
              method: "POST",
              body: fd,
            });
            const res = await resp.json();
            return res.success ? res.fileId : null;
          } catch (e) {
            console.error("Lỗi upload file:", file.name, e);
            return null;
          }
        };

        const imageFiles = imageInput?.files ? Array.from(imageInput.files) : [];
        const videoFiles = videoInput?.files ? Array.from(videoInput.files) : [];

        if (imageFiles.length > 0 || videoFiles.length > 0) {
          confirmBtn.textContent = "Đang tải ảnh/video...";
        }

        const [imageIds, videoIds] = await Promise.all([
          Promise.all(imageFiles.map(uploadOne)),
          Promise.all(videoFiles.map(uploadOne)),
        ]);

        const payload = collectBookingData();
        payload.anh_id = imageIds.filter((id) => id).join(",");
        payload.video_id = videoIds.filter((id) => id).join(",");

        // --- BƯỚC 2: TIẾP TỤC CÁC TÁC VỤ LƯU DỮ LIỆU ---
        confirmBtn.textContent = "Đang gửi...";

        const tasks = [];

        // Tự động tìm hoặc tạo tài khoản nếu khách chưa đăng nhập
        const isAlreadyLoggedIn = form.dataset.isLoggedIn === "true";
        if (!isAlreadyLoggedIn && window.BookingAuthHelper) {
          console.log("[BookingFlow] Khách chưa đăng nhập, đang kiểm tra/tạo tài khoản...");
          tasks.push(
            window.BookingAuthHelper.ensureAccount(payload.name, payload.phone),
          );
        } else if (isAlreadyLoggedIn) {
          console.log("[BookingFlow] Khách đã đăng nhập, bỏ qua bước tạo tài khoản.");
        }

        // Save to Google Sheet
        tasks.push(saveToGoogleSheet(payload));

        // Save to KRUD API
        tasks.push(saveToKrudApi(payload));

        await Promise.all(tasks);

        bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
        hideBookingStep();

        utils.showToast?.(
          "Đặt dịch vụ thành công! Chúng tôi sẽ liên hệ sớm.",
          "success",
        );

        form.reset();
        clearConfirmMedia();

        setTimeout(function () {
          window.location.href = "khachhang/danh-sach-don-hang.html";
        }, 1200);
      } catch (err) {
        console.error("Lỗi gửi dữ liệu sửa xe:", err);
        utils.showToast?.(
          err.message || "Không thể lưu dữ liệu đặt lịch. Vui lòng thử lại.",
          "error",
        );
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      }
    }

    function backToBookingModal() {
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
      showBookingStep();
    }

    async function isUserLoggedInForBooking() {
      const params = new URLSearchParams(window.location.search || "");
      const urlU = params.get("sodienthoai");
      const urlP = params.get("password");

      const u = urlU || utils.getCookie("dvqt_u");
      const p = urlP || utils.getCookie("dvqt_p");

      if (!u || !p) return false;

      try {
        if (typeof window.krudList !== "function") {
          console.error("krud.js chưa được nạp.");
          return false;
        }

        const result = await window.krudList({
          table: "nguoidung",
          where: [
            { field: "sodienthoai", operator: "=", value: u },
            { field: "matkhau", operator: "=", value: p },
          ],
          limit: 1,
        });

        const rows = (result && result.data) || (Array.isArray(result) ? result : []);
        const user = rows.length ? rows[0] : null;

        if (!user) return false;

        // Nếu là nhà cung cấp (id_dichvu chứa '8') thì không cho đặt
        const idDichvu = String(user.id_dichvu || "").trim();
        const serviceIds = idDichvu.split(",").map((s) => s.trim());

        if (serviceIds.indexOf("8") !== -1) {
          if (typeof utils.showToast === "function") {
            utils.showToast(
              "Tài khoản nhà cung cấp không được phép đặt dịch vụ.",
              "error",
            );
          }
          return false;
        }

        // Nếu đăng nhập bằng URL, lưu vào cookie để duy trì phiên
        if (urlU && urlP) {
          document.cookie = `dvqt_u=${urlU}; path=/; max-age=604800`;
          document.cookie = `dvqt_p=${urlP}; path=/; max-age=604800`;
        }

        return true;
      } catch (err) {
        console.error("Lỗi kiểm tra đăng nhập:", err);
        return false;
      }
    }

    function hasStandaloneAuthorizedAccess() {
      if (!document.body.classList.contains("booking-standalone")) {
        return false;
      }

      const accessState = window.BookingAccessState;
      return Boolean(accessState && accessState.isAuthenticated === true);
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (typeof utils.fillBookingTimeNow === "function") {
        utils.fillBookingTimeNow(false);
      }

      const isLoggedIn = await isUserLoggedInForBooking();
      form.dataset.isLoggedIn = isLoggedIn ? "true" : "false";
      // Bỏ qua chặn đăng nhập để hỗ trợ Auto-Registration (Book First, Register Later)
      // if (!isLoggedIn && !hasStandaloneAuthorizedAccess()) {
      //   if (typeof utils.showToast === "function") {
      //     utils.showToast("Vui lòng đăng nhập để tiếp tục đặt dịch vụ.", "error");
      //   }
      //   setTimeout(() => {
      //     window.location.href = "../public/dang-nhap.html?service=suaxe";
      //   }, 1200);
      //   return;
      // }

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
