function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLowerText(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isCancelledBookingStatus(rawStatus) {
  return ["cancelled", "canceled", "huy", "da_huy", "huy_bo"].includes(
    normalizeLowerText(rawStatus),
  );
}

function isConfirmedBookingStatus(rawStatus) {
  return [
    "da_xac_nhan",
    "xac_nhan",
    "confirmed",
    "completed",
    "success",
  ].includes(normalizeLowerText(rawStatus));
}

function isProcessingBookingStatus(rawStatus) {
  return [
    "dang_xu_ly",
    "processing",
    "in_progress",
    "accepted",
    "shipping",
  ].includes(normalizeLowerText(rawStatus));
}

function resolveProviderOwnership(rawRow) {
  return {
    id: normalizeText(
      rawRow?.provider_id ||
        rawRow?.accepted_by_id ||
        rawRow?.provider_owner_id ||
        "",
    ),
    phone: normalizePhone(
      rawRow?.provider_phone ||
        rawRow?.accepted_by_phone ||
        rawRow?.provider_owner_phone ||
        "",
    ),
    name: normalizeText(
      rawRow?.provider_name ||
        rawRow?.accepted_by_name ||
        rawRow?.provider_owner_name ||
        "",
    ),
  };
}

function isOwnedByProvider(rawRow, actor) {
  const owner = resolveProviderOwnership(rawRow);
  const actorId = normalizeText(actor?.id || "");
  const actorPhone = normalizePhone(actor?.phone || "");
  const hasOwner = !!(owner.id || owner.phone);
  const matchesOwner =
    (owner.id && actorId && owner.id === actorId) ||
    (owner.phone && actorPhone && owner.phone === actorPhone);

  return {
    hasOwner,
    matchesOwner,
    owner,
  };
}

function validateCustomerCancelBooking(rawRow, options = {}) {
  const status = rawRow?.trang_thai || rawRow?.status || "";
  const scheduleStartMs = Number(options?.scheduleStartMs || 0);
  const nowMs = Number(options?.nowMs || Date.now());

  if (isCancelledBookingStatus(status)) {
    throw new Error("Yêu cầu này đã ở trạng thái hủy.");
  }

  if (isConfirmedBookingStatus(status)) {
    throw new Error(
      "Yêu cầu đã được xác nhận nên không thể hủy trực tiếp từ phía khách hàng.",
    );
  }

  if (isProcessingBookingStatus(status)) {
    throw new Error(
      "Yêu cầu đã có nhà cung cấp nhận hoặc đang xử lý nên không thể hủy từ phía khách hàng.",
    );
  }

  if (
    normalizeText(rawRow?.accepted_at || "") ||
    normalizeText(rawRow?.started_at || "") ||
    normalizeText(rawRow?.completed_at || "")
  ) {
    throw new Error(
      "Yêu cầu đã có nhà cung cấp nhận hoặc đã vào xử lý nên không thể hủy.",
    );
  }

  if (scheduleStartMs && nowMs >= scheduleStartMs) {
    throw new Error(
      "Yêu cầu đã tới giờ thực hiện nên không thể hủy trực tiếp từ phía khách hàng.",
    );
  }
}

function validateCustomerFeedbackBooking(rawRow) {
  const status = rawRow?.trang_thai || rawRow?.status || "";
  if (!["da_xac_nhan", "xac_nhan", "completed", "confirmed"].includes(normalizeLowerText(status))) {
    throw new Error("Chỉ có thể gửi đánh giá sau khi đơn hàng đã hoàn thành.");
  }
}

function validateProviderBookingAction(rawRow, action, options = {}) {
  const status = rawRow?.trang_thai || rawRow?.status || "";
  const actionName = normalizeLowerText(action);
  const actor =
    options?.actor && typeof options.actor === "object" ? options.actor : {};
  const ownership = isOwnedByProvider(rawRow, actor);

  if (isCancelledBookingStatus(status)) {
    throw new Error("Yêu cầu này đã bị hủy.");
  }

  if (actionName === "note") {
    if (ownership.hasOwner && !ownership.matchesOwner) {
      throw new Error("Yêu cầu này đang do nhà cung cấp khác phụ trách.");
    }
    if (
      !normalizeText(rawRow?.accepted_at || "") &&
      !normalizeText(rawRow?.started_at || "") &&
      !normalizeText(rawRow?.completed_at || "")
    ) {
      throw new Error("Cần nhận đơn trước khi cập nhật báo cáo.");
    }
    return;
  }

  if (actionName === "accept") {
    if (ownership.hasOwner && !ownership.matchesOwner) {
      throw new Error("Yêu cầu này đã được nhà cung cấp khác nhận.");
    }
    if (
      normalizeText(rawRow?.accepted_at || "") ||
      normalizeText(rawRow?.started_at || "") ||
      normalizeText(rawRow?.completed_at || "") ||
      isProcessingBookingStatus(status) ||
      isConfirmedBookingStatus(status)
    ) {
      throw new Error("Yêu cầu này không còn ở trạng thái có thể nhận đơn.");
    }
    return;
  }

  if (actionName === "start") {
    if (ownership.hasOwner && !ownership.matchesOwner) {
      throw new Error("Yêu cầu này đang do nhà cung cấp khác phụ trách.");
    }
    if (isConfirmedBookingStatus(status) || normalizeText(rawRow?.completed_at || "")) {
      throw new Error("Yêu cầu này đã hoàn thành.");
    }
    if (!normalizeText(rawRow?.accepted_at || "")) {
      throw new Error("Cần nhận đơn trước khi bắt đầu.");
    }
    return;
  }

  if (actionName === "complete") {
    if (ownership.hasOwner && !ownership.matchesOwner) {
      throw new Error("Yêu cầu này đang do nhà cung cấp khác phụ trách.");
    }
    if (isConfirmedBookingStatus(status) || normalizeText(rawRow?.completed_at || "")) {
      throw new Error("Yêu cầu này đã hoàn thành.");
    }
    if (!normalizeText(rawRow?.started_at || "")) {
      throw new Error("Cần bắt đầu xử lý trước khi hoàn thành.");
    }
  }
}

const bookingActionsModule = {
  isCancelledBookingStatus,
  isConfirmedBookingStatus,
  isProcessingBookingStatus,
  validateCustomerCancelBooking,
  validateCustomerFeedbackBooking,
  validateProviderBookingAction,
};

export {
  isCancelledBookingStatus,
  isConfirmedBookingStatus,
  isProcessingBookingStatus,
  validateCustomerCancelBooking,
  validateCustomerFeedbackBooking,
  validateProviderBookingAction,
};

export default bookingActionsModule;
