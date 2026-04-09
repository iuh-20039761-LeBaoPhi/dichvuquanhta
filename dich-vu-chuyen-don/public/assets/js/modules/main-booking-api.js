import { getKrudInsertFn, getKrudUpdateFn } from "./api/krud-client.js";

class FastGoBookingApiClient {
  constructor(options) {
    const settings = options && typeof options === "object" ? options : {};
    this.bookingTableName =
      String(settings.bookingTableName || "").trim() ||
      "dich_vu_chuyen_don_dat_lich";
  }

  formatRequestDateCode(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  formatSystemRequestCode(recordId, createdAt) {
    const numericId = Number(recordId);
    if (!Number.isFinite(numericId) || numericId <= 0) return "";
    return `CDL-${this.formatRequestDateCode(createdAt || new Date())}-${String(
      Math.trunc(Math.abs(numericId)),
    ).padStart(7, "0")}`;
  }

  getInsertFn() {
    return getKrudInsertFn();
  }

  getUpdateFn() {
    return getKrudUpdateFn();
  }

  extractRemoteId(result) {
    return String(
      result?.id ||
        result?.insertId ||
        result?.insert_id ||
        result?.data?.id ||
        "",
    ).trim();
  }

  async createBooking(payload) {
    const insertFn = this.getInsertFn();
    if (!insertFn) {
      throw new Error("Không tìm thấy API KRUD để tạo yêu cầu đặt lịch.");
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Payload đặt lịch không hợp lệ.");
    }

    const createdAt = String(
      payload.created_at || new Date().toISOString(),
    ).trim();
    const nextPayload = {
      ...payload,
      created_at: createdAt,
    };

    const result = await Promise.resolve(
      insertFn(this.bookingTableName, nextPayload),
    );
    const remoteId = this.extractRemoteId(result);
    const systemRequestCode =
      this.formatSystemRequestCode(remoteId, createdAt) || remoteId;

    nextPayload.ma_yeu_cau_noi_bo = systemRequestCode;

    if (remoteId) {
      const updateFn = this.getUpdateFn();
      if (updateFn) {
        try {
          await Promise.resolve(
            updateFn(this.bookingTableName, {
              id: remoteId,
              ma_yeu_cau_noi_bo: systemRequestCode,
              updated_at: createdAt,
            }),
          );
        } catch (error) {
          console.warn(
            "Không thể ghi ngược mã yêu cầu theo ID vào KRUD:",
            error,
          );
        }
      }
    }

    return {
      payload: nextPayload,
      remoteId,
      requestCode: systemRequestCode,
      result,
    };
  }

  async syncGoogleSheet(sheetPayload) {
    if (typeof window.saveToGoogleSheet !== "function") {
      throw new Error("driveUtil.js chưa được nạp.");
    }

    const result = await Promise.resolve(
      window.saveToGoogleSheet(sheetPayload),
    );
    const isSuccess =
      result && (result.status === "success" || result.success === true);

    if (!isSuccess) {
      throw new Error(
        (result && (result.error || result.message)) ||
          "Gửi dữ liệu Google Sheet thất bại.",
      );
    }

    return {
      result,
      payload: sheetPayload,
    };
  }
}

const bookingApi = new FastGoBookingApiClient();

export { FastGoBookingApiClient, bookingApi };
export default bookingApi;
