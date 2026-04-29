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

    if (!form || !bookingModalEl || !confirmModalEl) return;
    if (form.dataset.confirmFlowBound === "true") return;
    form.dataset.confirmFlowBound = "true";

    const isEmbeddedMode = Boolean(bookingModalEl.closest("#modalContainer"));
    let pendingStandaloneAction = null;
    let shouldReturnToBookingAfterConfirmHidden = false;

    // Dọn dẹp các thành phần modal khi chạy ở chế độ standalone
    function cleanupStandaloneModalArtifacts() {
      if (isEmbeddedMode) return;

      document
        .querySelectorAll(".modal-backdrop")
        .forEach((backdrop) => backdrop.remove());

      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    }

    // Hiển thị bước đặt lịch
    function showBookingStep() {
      if (isEmbeddedMode) {
        bootstrap.Modal.getOrCreateInstance(bookingModalEl).show();
        return;
      }

      cleanupStandaloneModalArtifacts();
      bookingModalEl.style.display = "block";
      bookingModalEl.setAttribute("aria-hidden", "false");
    }

    // Ẩn bước đặt lịch
    function hideBookingStep() {
      if (isEmbeddedMode) {
        bootstrap.Modal.getOrCreateInstance(bookingModalEl).hide();
        return;
      }

      bookingModalEl.style.display = "none";
      bookingModalEl.setAttribute("aria-hidden", "true");
    }

    // Chuẩn hóa giá trị hiển thị
    function normalizeValue(value) {
      if (value == null) return "-";
      const text = String(value).trim();
      return text || "-";
    }

    // Định dạng thời gian đặt lịch để xem trước
    function formatBookingTimeForPreview(rawValue) {
      const text = String(rawValue || "").trim();
      if (!text) return "";

      // Input datetime-local trả về yyyy-mm-ddTHH:MM; hiển thị theo định dạng vi-VN.
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
        const date = new Date(text);
        if (Number.isFinite(date.getTime())) {
          return date.toLocaleString("vi-VN");
        }
      }

      const parsed = new Date(text);
      if (Number.isFinite(parsed.getTime())) {
        return parsed.toLocaleString("vi-VN");
      }

      return text;
    }

    // Xóa nội dung truyền thông xác nhận
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

    // Tạo thành phần hiển thị truyền thông xác nhận
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

    // Hiển thị danh sách file xác nhận
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

    // Hiển thị tất cả truyền thông xác nhận
    function renderConfirmMedia() {
      clearConfirmMedia();
      renderConfirmFileList(confirmImages, imageInput?.files, "image");
      renderConfirmFileList(confirmVideos, videoInput?.files, "video");
    }

    // Thu thập dữ liệu đặt lịch từ form
    function collectBookingData() {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const serviceSelect = document.getElementById("dichvuquantam");
      const transportOptionSelect = document.getElementById("hinhthucnhangiao");
      const kgInput = document.getElementById("khoiluong");
      const kgBox = document.getElementById("khoiluongbox");

      const serviceText =
        serviceSelect?.options[serviceSelect.selectedIndex]?.text;
      const transportOptionText =
        transportOptionSelect?.options[transportOptionSelect.selectedIndex]
          ?.text;

      const isKgVisible = kgBox && getComputedStyle(kgBox).display !== "none";

      const selectedWorkItems = Array.from(
        form.querySelectorAll('input[name="congviec"]:checked'),
      ).map((el) => el.value);
      const selectedChemicals = Array.from(
        form.querySelectorAll('input[name="hoachathotro"]:checked'),
      ).map((el) => el.value);

      let quantity = "";
      if (isKgVisible && kgInput?.value) quantity = `${kgInput.value} kg`;

      data.service_name =
        serviceText && serviceText !== "Chọn dịch vụ" ? serviceText : "";
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
      data.lat_kh = String(
        document.getElementById("diachi")?.dataset.lat || "",
      ).trim();
      data.lng_kh = String(
        document.getElementById("diachi")?.dataset.lng || "",
      ).trim();
      data.message = data.ghichu || "";
      data.service = data.dichvu || "";
      data.transport_option = data.hinhthucnhangiao || "";

      const rawBookingTime = String(data.thoigiandatdichvu || "").trim();
      const bookingTimeDisplay = formatBookingTimeForPreview(rawBookingTime);
      data.ngaydat = rawBookingTime;
      data.booking_time = rawBookingTime;
      data.anh_id = String(data.anh_id || "").trim();
      data.video_id = String(data.video_id || "").trim();

      return {
        data,
        preview: {
          name: data.name,
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

    // Hiển thị dữ liệu lên modal xác nhận
    function renderConfirmModal(preview) {
      const fields = {
        confirmName: preview.name,
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
        // Chỉ tự động điền khi người dùng để trống.
        utils.fillBookingTimeNow(false);
      }

      const isLoggedIn = await isUserLoggedInForBooking();
      form.dataset.isLoggedIn = isLoggedIn ? "true" : "false";

      // Bỏ qua chặn đăng nhập để hỗ trợ Auto-Registration (Book First, Register Later)
      // if (!isLoggedIn && !hasStandaloneAuthorizedAccess()) {
      //   hideBookingStep();
      //   window.location.href = "dang-nhap.html";
      //   return;
      // }

      const { preview } = collectBookingData();
      renderConfirmModal(preview);
      renderConfirmMedia();

      hideBookingStep();
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).show();
    });

    // Ẩn modal xác nhận và chờ quay lại bước trước hoặc hoàn tất
    function hideConfirmAndQueueReturn(action) {
      shouldReturnToBookingAfterConfirmHidden = action === "show-booking";
      pendingStandaloneAction = isEmbeddedMode ? null : action;
      bootstrap.Modal.getOrCreateInstance(confirmModalEl).hide();
    }

    function backToBooking() {
      hideConfirmAndQueueReturn("show-booking");
    }

    // Kiểm tra người dùng đã đăng nhập chưa
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

        const rows =
          (result && result.data) || (Array.isArray(result) ? result : []);
        const user = rows.length ? rows[0] : null;

        if (!user) return false;

        const idDichvu = String(user.id_dichvu || "").trim();
        const serviceIds = idDichvu.split(",").map((s) => s.trim());

        // Cho phép cả tài khoản nhà cung cấp đặt dịch vụ
        // if (serviceIds.indexOf("11") !== -1) {
        //   if (typeof utils.showToast === "function") {
        //     utils.showToast(
        //       "Tài khoản nhà cung cấp không được phép đặt dịch vụ.",
        //       "error",
        //     );
        //   }
        //   return false;
        // }

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

    // Kiểm tra quyền truy cập chế độ standalone
    function hasStandaloneAuthorizedAccess() {
      if (!document.body.classList.contains("booking-standalone")) {
        return false;
      }

      const accessState = window.BookingAccessState;
      return Boolean(accessState && accessState.isAuthenticated === true);
    }

    function shouldRedirectToOrderListAfterSubmit() {
      return true;
    }

    // Chuyển đổi định dạng tiền tệ sang số
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

    // Xây dựng dữ liệu gửi lên Google Sheet
    function buildBookingSheetPayload(formData) {
      return {
        sheet_type: "Giặt ủi nhanh",
        "Tên khách": formData.name || "",
        "Số điện thoại": formData.phone || "",
        "Địa chỉ": formData.address || "",
        lat_kh: formData.lat_kh || "",
        lng_kh: formData.lng_kh || "",
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
        "Ngày đặt": formData.booking_time || "",
        "Ghi chú": formData.message || "",
        "Trạng thái thanh toán": "Unpaid",
        anh_id: formData.anh_id || "",
        video_id: formData.video_id || "",
      };
    }

    // Lưu dữ liệu vào Google Sheet
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

    // Lưu dữ liệu vào CSDL qua KRUD API
    function saveToKrudApi(data) {
      if (!config.BOOKING_KRUD_TABLE) {
        return Promise.reject(new Error("Thiếu cấu hình BOOKING_KRUD_TABLE."));
      }
      console.log("Đang lưu vào KRUD API với dữ liệu:", data);
      const dbPayload = {
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
        ngaydat: data.booking_time || "",
        diachi: data.address || "",
        lat_kh: data.lat_kh || "",
        lng_kh: data.lng_kh || "",
        ghichu: data.message || "",
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

    function orderCode(id) {
      var numeric = Number(id);
      if (!Number.isFinite(numeric) || numeric <= 0) return "-";
      return String(Math.floor(numeric)).padStart(7, "0");
    }

    function getUploadTimestamp() {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, "0");
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const y = now.getFullYear();
      const h = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      return `${d}${m}${y}_${h}${min}${s}_${ms}`;
    }

    // Xử lý khi nhấn nút xác nhận cuối cùng
    async function handleConfirmSubmit() {
      const originalText = confirmBtn.textContent;

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Đang gửi...";

      try {
        const { data } = collectBookingData();

        // Tự động tìm hoặc tạo tài khoản nếu khách chưa đăng nhập
        const isAlreadyLoggedIn = form.dataset.isLoggedIn === "true";
        if (!isAlreadyLoggedIn && window.BookingAuthHelper) {
          console.log(
            "[BookingFlow] Khách chưa đăng nhập, đang kiểm tra/tạo tài khoản...",
          );
          const accountRes = await window.BookingAuthHelper.ensureAccount(
            data.name,
            data.phone,
          );

          if (accountRes && accountRes.isNew === false) {
            console.log("[BookingFlow] Sử dụng tài khoản hiện có cho booking.");
          } else {
            console.log("[BookingFlow] Đã tạo tài khoản mới cho booking.");
          }
        } else {
          console.log(
            "[BookingFlow] Khách đã đăng nhập, bỏ qua bước tạo tài khoản.",
          );
        }

        // --- BƯỚC 1: LƯU DB TRƯỚC ĐỂ LẤY ID ĐƠN HÀNG ---
        confirmBtn.textContent = "Đang khởi tạo đơn hàng...";
        const dbRes = await saveToKrudApi(data);
        const bookingId = dbRes.id || (dbRes.data && dbRes.data.id);
        if (!bookingId) {
          throw new Error("Không lấy được mã đơn hàng sau khi lưu.");
        }
        const orderCodeText = orderCode(bookingId);

        // --- BƯỚC 2: XỬ LÝ UPLOAD MEDIA LÊN GG DRIVE VỚI TÊN CHỨA ID ---
        let imageIdsString = "";
        let videoIdsString = "";

        try {
          const imageFiles = imageInput?.files ? Array.from(imageInput.files) : [];
          const videoFiles = videoInput?.files ? Array.from(videoInput.files) : [];

          if (imageFiles.length > 0 || videoFiles.length > 0) {
            confirmBtn.textContent = "Đang tải ảnh/video...";

            const uploadFileNode = async (file) => {
              const formData = new FormData();
              formData.append("upload", "1");
              formData.append("file", file);
              formData.append("folderKey", "31");
              const fileName = orderCodeText + "_giatui_" + getUploadTimestamp() + "_" + file.name;
              formData.append("name", fileName);

              const res = await fetch("../../../public/upload_to_drive.php", {
                method: "POST",
                body: formData,
              });
              const result = await res.json();
              if (result && result.fileId) {
                return result.fileId;
              }
              throw new Error(`Upload ${file.name} thất bại.`);
            };

            const uploadedAnhIds = [];
            for (const file of imageFiles) {
              try {
                const fid = await uploadFileNode(file);
                uploadedAnhIds.push(fid);
              } catch (err) {
                console.error("[DriveUpload] Lỗi ảnh:", err);
              }
            }

            const uploadedVideoIds = [];
            for (const file of videoFiles) {
              try {
                const fid = await uploadFileNode(file);
                uploadedVideoIds.push(fid);
              } catch (err) {
                console.error("[DriveUpload] Lỗi video:", err);
              }
            }

            imageIdsString = uploadedAnhIds.join(",");
            videoIdsString = uploadedVideoIds.join(",");

            // Cập nhật lại ID media vào DB
            if (imageIdsString || videoIdsString) {
              await krud("update", config.BOOKING_KRUD_TABLE, {
                anh_id: imageIdsString,
                video_id: videoIdsString
              }, bookingId);
            }
          }
        } catch (driveErr) {
          console.error("Lỗi lưu media lên Google Drive:", driveErr);
        }

        // --- BƯỚC 3: ĐƯA DỮ LIỆU VÀO GOOGLE SHEET VỚI ĐẦY ĐỦ THÔNG TIN ---
        confirmBtn.textContent = "Đang hoàn tất...";
        data.anh_id = imageIdsString;
        data.video_id = videoIdsString;

        try {
          await saveToGoogleSheet(data);
          console.log("Lưu Google Sheet thành công.");
        } catch (sheetErr) {
          console.error("Lỗi lưu Google Sheet:", sheetErr);
        }

        hideConfirmAndQueueReturn("submit-success");
        hideBookingStep();

        if (typeof utils.showToast === "function") {
          utils.showToast(
            "Đặt dịch vụ thành công! Chúng tôi sẽ liên hệ sớm.",
            "success",
          );
        }

        if (shouldRedirectToOrderListAfterSubmit()) {
          setTimeout(function () {
            window.location.href = "nguoidung/danh-sach-don-hang.html";
          }, 900);
        }

        form.reset();
        clearConfirmMedia();

        if (!isEmbeddedMode) {
          pendingStandaloneAction = "show-booking";
        }
      } catch (err) {
        const msg = String(err && err.message ? err.message : "");
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

        const failMessage =
          err.message || "Không thể gửi dữ liệu. Vui lòng thử lại.";
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
