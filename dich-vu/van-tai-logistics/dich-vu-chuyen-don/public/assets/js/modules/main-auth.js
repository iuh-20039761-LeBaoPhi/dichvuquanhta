import {
  extractRows,
  getKrudInsertFn,
  getKrudListFn,
} from "./api/krud-client.js";
import {
  saveStoredIdentity,
  writeStoredRole,
} from "./store/auth-session-store.js";

const authModule = (function (window, document) {
  if (window.__fastGoAuthInitDone) return null;
  window.__fastGoAuthInitDone = true;

  const dvqtUserTable = "nguoidung";
  const movingServiceId = "12";
  const vnPhonePattern = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function splitServiceIds(value) {
    return String(value || "")
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function hasMovingServiceId(value) {
    return splitServiceIds(value).includes(movingServiceId);
  }

  function resolveMovingAuthRole(user) {
    const serviceIds = splitServiceIds(user?.id_dichvu || "0");
    if (hasMovingServiceId(user?.id_dichvu)) return "nha-cung-cap";

    const hasExplicitOtherService = serviceIds.some(
      (serviceId) => serviceId && serviceId !== "0",
    );
    if (hasExplicitOtherService) return "khach-hang";

    const role = normalizeText(user?.role || user?.vaitro || "").toLowerCase();
    return ["nha-cung-cap", "doi-tac", "provider"].includes(role)
      ? "nha-cung-cap"
      : "khach-hang";
  }

  async function checkUserExistsOnKrud(phone) {
    const listFn = getKrudListFn();
    if (!listFn) return null;

    try {
      const response = await listFn({
        table: dvqtUserTable,
        limit: 1000,
      });
      const rows = extractRows(response);
      const normalizedQueryPhone = normalizePhone(phone);

      return (
        rows.find((row) => {
          const rowPhone = normalizePhone(row.sodienthoai || "");
          return rowPhone && rowPhone === normalizedQueryPhone;
        }) || null
      );
    } catch (error) {
      console.error("Cannot check user existence on KRUD:", error);
      return null;
    }
  }

  async function insertBookingUserToKrud(payload) {
    const insertFn = getKrudInsertFn();
    if (!insertFn) return null;

    return insertFn(dvqtUserTable, {
      id_dichvu: "0",
      hovaten: normalizeText(payload.hovaten || ""),
      sodienthoai: normalizePhone(payload.sodienthoai || ""),
    });
  }

  async function ensureCustomerAccountForBooking(payload) {
    const hoVaTen = normalizeText(payload?.hovaten || "");
    const phone = normalizePhone(payload?.sodienthoai || "");

    if (!hoVaTen || !phone || !vnPhonePattern.test(phone)) {
      throw new Error("Thông tin liên hệ không hợp lệ để tạo tài khoản.");
    }

    const existingUser = await checkUserExistsOnKrud(phone);

    if (existingUser) {
      saveStoredIdentity({
        id: String(existingUser.id || "").trim(),
        hovaten: normalizeText(existingUser.hovaten || ""),
        sodienthoai: normalizePhone(existingUser.sodienthoai || ""),
        email: normalizeText(existingUser.email || "").toLowerCase(),
        id_dichvu: String(existingUser.id_dichvu || "0").trim() || "0",
        trangthai: normalizeText(existingUser.trangthai || "active"),
      });
      writeStoredRole(
        resolveMovingAuthRole(existingUser),
      );
      return {
        status: "existing",
        created: false,
        user: existingUser,
      };
    }

    try {
      await insertBookingUserToKrud({ hovaten: hoVaTen, sodienthoai: phone });
      const verifiedUser = await checkUserExistsOnKrud(phone);

      if (verifiedUser) {
        saveStoredIdentity({
          id: String(verifiedUser.id || "").trim(),
          hovaten: normalizeText(verifiedUser.hovaten || ""),
          sodienthoai: normalizePhone(verifiedUser.sodienthoai || ""),
          email: normalizeText(verifiedUser.email || "").toLowerCase(),
          id_dichvu: "0",
          trangthai: normalizeText(verifiedUser.trangthai || "active"),
        });
        writeStoredRole("khach-hang");

        return {
          status: "created",
          created: true,
          user: verifiedUser,
        };
      }
    } catch (error) {
      console.error("Auto-account creation failed:", error);
    }

    throw new Error("Không thể tạo tài khoản tự động. Vui lòng thử lại.");
  }

  return {
    ensureCustomerAccountForBooking,
    normalizePhone,
  };
})(window, document);

export const ensureCustomerAccountForBooking = authModule.ensureCustomerAccountForBooking;
export const normalizePhone = authModule.normalizePhone;
export default authModule;
