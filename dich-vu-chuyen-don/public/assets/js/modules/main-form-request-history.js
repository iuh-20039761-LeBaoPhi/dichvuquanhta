(function (window) {
  if (window.FastGoFormRequestHistory) return;

  // Tách riêng phần tạo payload và lưu lịch sử request để form chính đỡ phình.
  function formatDateLabel(dateValue, timeValue) {
    const rawDate = String(dateValue || "").trim();
    if (!rawDate) return "";
    const date = new Date(rawDate);
    const dateText = Number.isNaN(date.getTime())
      ? rawDate
      : date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
    const timeText = String(timeValue || "").trim();
    return timeText ? `${dateText} • ${timeText}` : dateText;
  }

  function getServiceLabelFromSelect(select) {
    if (!select) return "";
    const option = select.options[select.selectedIndex];
    return String(option?.textContent || "").trim();
  }

  // Đọc dữ liệu hiện tại trong form và chuẩn hóa về một payload thống nhất.
  function buildPayload({ scope, formType, portalStore }) {
    const now = new Date();
    const identity = portalStore?.readIdentity?.() || {};

    if (formType === "khao-sat") {
      const serviceLabel = getServiceLabelFromSelect(
        scope.querySelector("#loai-dich-vu-khao-sat"),
      );
      const address = String(
        scope.querySelector("#dia-chi-khao-sat")?.value || "",
      ).trim();
      const companyName = String(
        scope.querySelector("#ten-don-vi-khao-sat")?.value || "",
      ).trim();
      const dateValue = String(
        scope.querySelector("#ngay-khao-sat")?.value || "",
      ).trim();
      const timeValue = String(
        scope.querySelector("#khung-gio-khao-sat")?.value || "",
      ).trim();

      return {
        code: `KS-${Date.now()}`,
        type: "khao-sat",
        type_label: "Khảo sát",
        title: `Khảo sát ${serviceLabel || "chuyển dọn"}`,
        service_label: serviceLabel || "Khảo sát chuyển dọn",
        status_class: "moi",
        status_text: "Mới tiếp nhận",
        summary:
          "Biểu mẫu khảo sát vừa được ghi nhận trong bản demo và sẵn sàng cho bước điều phối tiếp theo.",
        meta: companyName
          ? `Đơn vị/đầu mối: ${companyName}`
          : "Chờ điều phối xác nhận khối lượng và điều kiện tiếp cận.",
        from_address: address,
        to_address: "",
        created_at: now.toISOString(),
        schedule_label: formatDateLabel(dateValue, timeValue),
        estimated_amount: 0,
        contact_name:
          companyName ||
          String(identity.fullName || identity.full_name || "").trim(),
        contact_phone:
          String(scope.querySelector("#so-dien-thoai-khao-sat")?.value || "").trim() ||
          String(identity.phone || "").trim(),
        note: String(scope.querySelector("#ghi-chu-khao-sat")?.value || "").trim(),
        source: "local",
      };
    }

    const serviceLabel = getServiceLabelFromSelect(
      scope.querySelector("#loai-dich-vu-dat-lich"),
    );
    const fromAddress = String(
      scope.querySelector("#dia-chi-di-dat-lich")?.value || "",
    ).trim();
    const toAddress = String(
      scope.querySelector("#dia-chi-den-dat-lich")?.value || "",
    ).trim();
    const dateValue = String(
      scope.querySelector("#ngay-thuc-hien-dat-lich")?.value || "",
    ).trim();
    const timeValue = String(
      scope.querySelector("#khung-gio-dat-lich")?.value || "",
    ).trim();
    const totalText = String(
      scope.querySelector("[data-tong-gia-chot-dat-lich]")?.textContent || "",
    ).replace(/[^\d]/g, "");
    const contactName = String(
      scope.querySelector("#ho-ten-dat-lich")?.value || "",
    ).trim();
    const companyName = String(
      scope.querySelector("#ten-cong-ty-dat-lich")?.value || "",
    ).trim();
    const vehicleLabel = getServiceLabelFromSelect(
      scope.querySelector("#loai-xe-dat-lich"),
    );

    return {
      code: `DL-${Date.now()}`,
      type: "dat-lich",
      type_label: "Đặt lịch",
      title: `Đặt lịch ${serviceLabel || "chuyển dọn"}`,
      service_label: serviceLabel || "Đặt lịch chuyển dọn",
      status_class: "moi",
      status_text: "Mới tiếp nhận",
      summary:
        "Biểu mẫu đặt lịch vừa được ghi nhận trong bản demo và đang chờ bước điều phối xác nhận.",
      meta: vehicleLabel
        ? `Phương án xe đã chọn: ${vehicleLabel}`
        : "Chờ điều phối khóa phương án xe và nhân sự.",
      from_address: fromAddress,
      to_address: toAddress,
      created_at: now.toISOString(),
      schedule_label: formatDateLabel(dateValue, timeValue),
      estimated_amount: Number(totalText || 0),
      contact_name:
        contactName ||
        companyName ||
        String(identity.fullName || identity.full_name || "").trim(),
      contact_phone:
        String(scope.querySelector("#so-dien-thoai-dat-lich")?.value || "").trim() ||
        String(identity.phone || "").trim(),
      note: String(scope.querySelector("#ghi-chu-dat-lich")?.value || "").trim(),
      source: "local",
    };
  }

  // Ưu tiên lưu qua API, nếu lỗi thì fallback về store local.
  async function persistPayload(payload, portalStore) {
    if (!payload || !portalStore) return;

    if (portalStore.saveRequestToApi) {
      try {
        await portalStore.saveRequestToApi(payload);
        return;
      } catch (error) {
        console.error("Cannot save request to customer portal API:", error);
      }
    }

    if (portalStore.saveHistoryItem) {
      portalStore.saveHistoryItem(payload);
    }
  }

  window.FastGoFormRequestHistory = {
    buildPayload,
    persistPayload,
  };
})(window);
