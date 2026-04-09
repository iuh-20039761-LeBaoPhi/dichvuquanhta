(function (window, document) {
  if (window.GiaoHangNhanhLocalAuth) return;

  const storageKeys = {
    users: "ghn-auth-users",
    session: "ghn-auth-session",
  };
  const dvqtUserTable = "nguoidung";
  const ghnServiceId = "7";
  const authChangeEventName = "ghn:auth-changed";
  const customerPhonePattern = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;
  const krudScriptUrl = "https://api.dvqt.vn/js/krud.js";
  let krudReadyPromise = null;

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot parse auth payload:", error);
      return fallback;
    }
  }

  function readJson(key, fallback) {
    if (!key) return fallback;
    try {
      return safeParse(window.localStorage.getItem(key), fallback);
    } catch (error) {
      console.error("Cannot read auth payload:", error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (!key) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Cannot persist auth payload:", error);
      return false;
    }
  }

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

  function normalizeEmail(value) {
    return normalizeLowerText(value);
  }

  function readCookie(name) {
    const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(document.cookie || "").match(
      new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1] || "") : "";
  }

  function clearCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  function notifyAuthChanged(session) {
    document.dispatchEvent(
      new CustomEvent(authChangeEventName, {
        detail: {
          session: session || null,
        },
      }),
    );
  }

  function getUsers() {
    const users = readJson(storageKeys.users, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    return writeJson(storageKeys.users, Array.isArray(users) ? users : []);
  }

  function upsertStoredUser(user) {
    if (!user || typeof user !== "object") return [];
    const users = getUsers();
    const userId = normalizeText(user.id || user.remote_id || "");
    const nextUsers = users.filter(
      (item) => normalizeText(item.id || item.remote_id || "") !== userId,
    );
    nextUsers.unshift(user);
    saveUsers(nextUsers);
    return nextUsers;
  }

  function splitServiceIds(value) {
    return String(value || "")
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  function hasGhnProviderRole(row) {
    return splitServiceIds(row?.id_dichvu).includes(ghnServiceId);
  }

  function isCustomerAccount(row) {
    const serviceIds = splitServiceIds(row?.id_dichvu);
    return serviceIds.length === 0 || (serviceIds.length === 1 && serviceIds[0] === "0");
  }

  function isRelevantGhnUser(row) {
    return isCustomerAccount(row) || hasGhnProviderRole(row);
  }

  function resolveUserRole(row) {
    return hasGhnProviderRole(row) ? "shipper" : "customer";
  }

  function resolveLockState(row) {
    if (Number(row?.is_locked || row?.bi_khoa || 0) === 1) return true;
    const status = normalizeLowerText(row?.trangthai || row?.trang_thai || "");
    return ["locked", "lock", "inactive", "blocked", "disabled"].includes(status);
  }

  function mapSharedUserRecord(row) {
    if (!row || typeof row !== "object") return null;

    const id = normalizeText(row.id || row.user_id || row.ma_tai_khoan_noi_bo || "");
    const phone = normalizePhone(row.sodienthoai || row.so_dien_thoai || row.phone || "");
    const email = normalizeEmail(row.email || "");
    const fullname = normalizeText(
      row.hovaten || row.ho_ten || row.fullname || row.name || "",
    );
    const role = resolveUserRole(row);
    const password = String(
      row.matkhau || row.mat_khau || row.password || "",
    ).trim();
    const address = normalizeText(
      row.diachi || row.dia_chi || row.address || row.company_address || row.shipper_address || "",
    );
    const vehicleType = normalizeText(
      row.loai_phuong_tien || row.vehicle_type || row.shipper_vehicle || "",
    );
    const companyName = normalizeText(row.ten_cong_ty || row.company_name || "");
    const taxCode = normalizeText(row.ma_so_thue || row.tax_code || "");
    const username = normalizeText(
      row.username ||
        row.ten_dang_nhap ||
        phone ||
        email ||
        fullname,
    );
    const lockReason = normalizeText(row.lock_reason || row.ly_do_khoa || "");
    const isLocked = resolveLockState(row);
    const trangthai = normalizeText(
      row.trangthai || row.trang_thai || (isLocked ? "locked" : "active"),
    ) || (isLocked ? "locked" : "active");

    return {
      ...row,
      id,
      remote_id: id,
      username,
      email,
      phone,
      so_dien_thoai: phone,
      fullname,
      ho_ten: fullname,
      password,
      mat_khau: password,
      role,
      vai_tro: role,
      is_locked: isLocked ? 1 : 0,
      bi_khoa: isLocked ? 1 : 0,
      lock_reason: lockReason,
      ly_do_khoa: lockReason,
      is_approved: 1,
      da_phe_duyet: 1,
      id_dichvu: normalizeText(row.id_dichvu || "0") || "0",
      trangthai,
      vehicle_type: vehicleType,
      loai_phuong_tien: vehicleType,
      shipper_vehicle: vehicleType,
      address,
      dia_chi: address,
      shipper_address: address,
      company_address: normalizeText(row.company_address || address),
      company_name: companyName,
      ten_cong_ty: companyName,
      tax_code: taxCode,
      ma_so_thue: taxCode,
      so_cccd: normalizeText(row.so_cccd || row.cccd || ""),
      avatar_name: normalizeText(row.avatartenfile || row.avatar_name || ""),
      cccd_front_name: normalizeText(
        row.cccdmattruoctenfile || row.cccd_front_name || "",
      ),
      cccd_back_name: normalizeText(
        row.cccdmatsautenfile || row.cccd_back_name || "",
      ),
      created_at: normalizeText(row.created_at || row.created_date || ""),
      updated_at: normalizeText(row.updated_at || ""),
    };
  }

  function saveSession(user) {
    const session = mapSharedUserRecord(user);
    if (!session) return null;

    writeJson(storageKeys.session, session);
    upsertStoredUser(session);
    notifyAuthChanged(session);
    return session;
  }

  function getSession() {
    const session = readJson(storageKeys.session, null);
    return session && typeof session === "object" ? session : null;
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(storageKeys.session);
      notifyAuthChanged(null);
    } catch (error) {
      console.error("Cannot clear auth session:", error);
    }
  }

  function logout(redirectUrl = "") {
    clearSession();

    if (window.DVQTApp && typeof window.DVQTApp.logout === "function") {
      window.DVQTApp.logout();
    } else {
      clearCookie("dvqt_u");
      clearCookie("dvqt_p");
    }

    const target = normalizeText(redirectUrl);
    if (target) {
      window.location.href = target;
    }
  }

  function getDashboardPath(role) {
    return normalizeLowerText(role) === "shipper"
      ? "public/nha-cung-cap/dashboard.html"
      : "public/khach-hang/dashboard.html";
  }

  function ensureKrudReady() {
    if (
      typeof window.krudList === "function" ||
      typeof window.crud === "function" ||
      typeof window.krud === "function"
    ) {
      return Promise.resolve(true);
    }

    if (krudReadyPromise) return krudReadyPromise;

    krudReadyPromise = new Promise((resolve, reject) => {
      const existingScript = Array.from(document.scripts || []).find(
        (script) => String(script.src || "").includes("/js/krud.js"),
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không tải được KRUD client.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = krudScriptUrl;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Không tải được KRUD client."));
      document.head.appendChild(script);
    }).catch((error) => {
      krudReadyPromise = null;
      throw error;
    });

    return krudReadyPromise;
  }

  function getKrudInsertFn() {
    if (typeof window.crud === "function") {
      return (tableName, data) => window.crud("insert", tableName, data);
    }

    if (typeof window.krud === "function") {
      return (tableName, data) => window.krud("insert", tableName, data);
    }

    return null;
  }

  function getKrudUpdateFn() {
    if (typeof window.crud === "function") {
      return (tableName, data, id) => window.crud("update", tableName, data, id);
    }

    if (typeof window.krud === "function") {
      return (tableName, data, id) => window.krud("update", tableName, data, id);
    }

    return null;
  }

  function getKrudDeleteFn() {
    if (typeof window.crud === "function") {
      return (tableName, id) => window.crud("delete", tableName, { id });
    }

    if (typeof window.krud === "function") {
      return (tableName, id) => window.krud("delete", tableName, { id });
    }

    return null;
  }

  function getKrudListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 100,
        });
    }

    return null;
  }

  function extractRows(payload, depth = 0) {
    if (depth > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, depth + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function extractInsertId(result) {
    if (result == null) return "";
    if (typeof result === "string" || typeof result === "number") {
      return String(result).trim();
    }
    if (typeof result !== "object") return "";

    return normalizeText(
      result.id ||
        result.insertId ||
        result.insert_id ||
        result.record_id ||
        result.data?.id ||
        result.data?.insertId ||
        result.result?.id ||
        result.result?.insertId ||
        "",
    );
  }

  async function listSharedUsers() {
    await ensureKrudReady();
    const listFn = getKrudListFn();
    if (!listFn) {
      throw new Error("Không tìm thấy hàm KRUD list.");
    }

    const rows = [];
    const limit = 200;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page += 1) {
      const response = await Promise.resolve(
        listFn({
          table: dvqtUserTable,
          page,
          limit,
          sort: {
            id: "desc",
          },
        }),
      );
      const batch = extractRows(response);
      if (!batch.length) break;
      rows.push(...batch);
      if (batch.length < limit) break;
    }

    return rows;
  }

  async function listAllKrudUsers() {
    const users = (await listSharedUsers())
      .filter(isRelevantGhnUser)
      .map(mapSharedUserRecord)
      .filter(Boolean);
    saveUsers(users);
    return users;
  }

  async function findSharedUserByMatcher(matcher) {
    const users = await listAllKrudUsers();
    return users.find((user) => matcher(user)) || null;
  }

  function normalizeLoginIdentifier(value) {
    const text = normalizeText(value);
    if (!text) return "";
    const phone = normalizePhone(text);
    return phone || normalizeLowerText(text);
  }

  async function bootstrapSession() {
    const existingSession = getSession();
    if (existingSession) return existingSession;

    const cookiePhone = normalizePhone(readCookie("dvqt_u"));
    if (!cookiePhone) return null;

    try {
      const matchedUser = await findSharedUserByMatcher(
        (user) => normalizePhone(user.phone || user.so_dien_thoai || "") === cookiePhone,
      );
      return matchedUser ? saveSession(matchedUser) : null;
    } catch (error) {
      console.error("Cannot bootstrap GHN auth session:", error);
      return null;
    }
  }

  async function ensureCustomerAccountForBooking(payload) {
    const fullname = normalizeText(
      payload?.fullname ||
        payload?.ho_ten ||
        payload?.hovaten ||
        payload?.nguoi_gui_ho_ten ||
        "",
    );
    const phone = normalizePhone(
      payload?.phone ||
        payload?.so_dien_thoai ||
        payload?.sodienthoai ||
        payload?.nguoi_gui_so_dien_thoai ||
        "",
    );

    if (!fullname || !phone || !customerPhonePattern.test(phone)) {
      throw new Error(
        "Thông tin người gửi không hợp lệ để tạo hoặc xác minh tài khoản.",
      );
    }

    const currentSession =
      getSession() || (await Promise.resolve(bootstrapSession()).catch(() => null));
    const sessionPhone = normalizePhone(
      currentSession?.phone || currentSession?.so_dien_thoai || "",
    );

    if (sessionPhone && sessionPhone === phone) {
      return {
        status: "existing",
        created: false,
        auto_logged_in: false,
        user: saveSession({
          ...currentSession,
          fullname:
            normalizeText(currentSession?.fullname || currentSession?.ho_ten || "") ||
            fullname,
          ho_ten:
            normalizeText(currentSession?.fullname || currentSession?.ho_ten || "") ||
            fullname,
          phone,
          so_dien_thoai: phone,
        }),
      };
    }

    const existingUser = await findSharedUserByMatcher(
      (user) => normalizePhone(user.phone || user.so_dien_thoai || "") === phone,
    );

    if (existingUser) {
      if (Number(existingUser.is_locked) === 1) {
        throw new Error(
          normalizeText(existingUser.lock_reason || existingUser.ly_do_khoa || "") ||
            "Tài khoản đang bị khóa.",
        );
      }

      return {
        status: "existing",
        created: false,
        auto_logged_in: true,
        user: saveSession({
          ...existingUser,
          fullname:
            normalizeText(existingUser.fullname || existingUser.ho_ten || "") ||
            fullname,
          ho_ten:
            normalizeText(existingUser.fullname || existingUser.ho_ten || "") ||
            fullname,
          phone,
          so_dien_thoai: phone,
        }),
      };
    }

    const insertFn = getKrudInsertFn();
    if (!insertFn) {
      throw new Error("Không tìm thấy hàm KRUD insert.");
    }

    const createdAt = new Date().toISOString();
    const insertPayload = {
      hovaten: fullname,
      sodienthoai: phone,
      id_dichvu: "0",
      trangthai: "active",
      created_at: createdAt,
      updated_at: createdAt,
    };

    const result = await insertFn(dvqtUserTable, insertPayload);
    const insertedId = extractInsertId(result);
    const createdUser =
      (await findSharedUserByMatcher(
        (user) =>
          (insertedId && normalizeText(user.id) === insertedId) ||
          normalizePhone(user.phone || user.so_dien_thoai || "") === phone,
      )) ||
      mapSharedUserRecord({
        ...insertPayload,
        id: insertedId,
      });

    return {
      status: "created",
      created: true,
      auto_logged_in: true,
      user: saveSession(createdUser),
    };
  }

  async function register(payload) {
    const insertFn = getKrudInsertFn();
    if (!insertFn) {
      throw new Error("Không tìm thấy hàm KRUD insert.");
    }

    const role = normalizeLowerText(payload?.role || "customer");
    const fullname = normalizeText(payload?.fullname || payload?.ho_ten || "");
    const email = normalizeEmail(payload?.email || "");
    const phone = normalizePhone(payload?.phone || payload?.so_dien_thoai || "");
    const password = String(payload?.password || payload?.mat_khau || "").trim();

    if (!fullname || !phone || !password) {
      throw new Error("Thiếu thông tin để tạo tài khoản.");
    }

    const users = await listAllKrudUsers();
    const duplicate = users.find((user) => {
      return (
        (phone && normalizePhone(user.phone || user.so_dien_thoai || "") === phone) ||
        (email && normalizeEmail(user.email || "") === email)
      );
    });

    if (duplicate) {
      return {
        status: "error",
        message: "Email hoặc số điện thoại đã được sử dụng.",
      };
    }

    const createdAt = new Date().toISOString();
    const vehicleType = normalizeText(
      payload?.vehicle_type || payload?.loai_phuong_tien || "",
    );
    const companyAddress = normalizeText(
      payload?.company_address || payload?.dia_chi || payload?.address || "",
    );
    const insertPayload = {
      hovaten: fullname,
      sodienthoai: phone,
      email,
      matkhau: password,
      diachi: companyAddress,
      id_dichvu: role === "shipper" ? ghnServiceId : "0",
      trangthai: "active",
      loai_phuong_tien: vehicleType,
      so_cccd: normalizeText(payload?.cccd || payload?.so_cccd || ""),
      avatartenfile: normalizeText(payload?.files?.avatar_name || ""),
      cccdmattruoctenfile: normalizeText(payload?.files?.cccd_front_name || ""),
      cccdmatsautenfile: normalizeText(payload?.files?.cccd_back_name || ""),
      created_at: createdAt,
      updated_at: createdAt,
    };

    const result = await insertFn(dvqtUserTable, insertPayload);
    const insertedId = extractInsertId(result);
    const createdUser =
      (await findSharedUserByMatcher(
        (user) =>
          (insertedId && normalizeText(user.id) === insertedId) ||
          normalizePhone(user.phone || user.so_dien_thoai || "") === phone,
      )) ||
      mapSharedUserRecord({
        ...insertPayload,
        id: insertedId,
      });

    if (createdUser) {
      upsertStoredUser(createdUser);
    }

    if (role === "customer" && createdUser) {
      saveSession(createdUser);
    }

    return {
      status: "success",
      message: "Đăng ký thành công.",
      requires_approval: false,
      user: createdUser,
    };
  }

  async function login(payload) {
    const loginIdentifier = normalizeLoginIdentifier(payload?.loginIdentifier || "");
    const password = String(payload?.password || "").trim();

    if (!loginIdentifier || !password) {
      return {
        status: "error",
        message: "Vui lòng nhập thông tin đăng nhập.",
      };
    }

    const user = await findSharedUserByMatcher((item) => {
      const userPhone = normalizePhone(item.phone || item.so_dien_thoai || "");
      const userEmail = normalizeEmail(item.email || "");
      const userUsername = normalizeLowerText(item.username || "");
      const matchedIdentifier =
        (userPhone && userPhone === loginIdentifier) ||
        (userEmail && userEmail === loginIdentifier) ||
        (userUsername && userUsername === loginIdentifier);
      return matchedIdentifier;
    });

    if (!user) {
      return {
        status: "error",
        message: "Tài khoản không tồn tại trên hệ thống.",
      };
    }

    if (Number(user.is_locked) === 1) {
      const reason = normalizeText(user.lock_reason || user.ly_do_khoa || "") || "Tài khoản đang bị khóa.";
      return {
        status: "error",
        message: reason,
      };
    }

    if (String(user.password || user.mat_khau || "") !== password) {
      return {
        status: "error",
        message: "Mật khẩu không chính xác.",
      };
    }

    if (window.DVQTApp?.setCookie) {
      window.DVQTApp.setCookie("dvqt_u", user.phone || loginIdentifier, 7);
      window.DVQTApp.setCookie("dvqt_p", password, 7);
    } else {
      document.cookie = `dvqt_u=${encodeURIComponent(user.phone || loginIdentifier)}; path=/`;
      document.cookie = `dvqt_p=${encodeURIComponent(password)}; path=/`;
    }

    saveSession({
      ...user,
      password,
      mat_khau: password,
    });

    return {
      status: "success",
      message: "Đăng nhập thành công!",
      user: getSession(),
    };
  }

  async function updateKrudUser(userId, role, patch = {}) {
    const normalizedId = normalizeText(userId);
    if (!normalizedId) {
      throw new Error("Thiếu mã người dùng để cập nhật.");
    }

    const updateFn = getKrudUpdateFn();
    if (!updateFn) {
      throw new Error("Không tìm thấy hàm KRUD update.");
    }

    const normalizedPatch = patch && typeof patch === "object" ? patch : {};
    const nextStatus = Object.prototype.hasOwnProperty.call(normalizedPatch, "trangthai")
      ? normalizeText(normalizedPatch.trangthai || "")
      : Object.prototype.hasOwnProperty.call(normalizedPatch, "is_locked") ||
          Object.prototype.hasOwnProperty.call(normalizedPatch, "bi_khoa")
        ? Number(normalizedPatch.is_locked || normalizedPatch.bi_khoa || 0) === 1
          ? "locked"
          : "active"
        : "";

    const payload = {
      id: normalizedId,
      updated_at: new Date().toISOString(),
    };

    const mappings = {
      hovaten: normalizedPatch.hovaten ?? normalizedPatch.ho_ten ?? normalizedPatch.fullname,
      email: normalizedPatch.email,
      sodienthoai: normalizedPatch.sodienthoai ?? normalizedPatch.so_dien_thoai ?? normalizedPatch.phone,
      diachi:
        normalizedPatch.diachi ??
        normalizedPatch.dia_chi ??
        normalizedPatch.address ??
        normalizedPatch.company_address ??
        normalizedPatch.shipper_address,
      loai_phuong_tien:
        normalizedPatch.loai_phuong_tien ??
        normalizedPatch.vehicle_type ??
        normalizedPatch.shipper_vehicle,
      ten_cong_ty: normalizedPatch.ten_cong_ty ?? normalizedPatch.company_name,
      ma_so_thue: normalizedPatch.ma_so_thue ?? normalizedPatch.tax_code,
      matkhau: normalizedPatch.matkhau ?? normalizedPatch.mat_khau ?? normalizedPatch.password,
    };

    Object.entries(mappings).forEach(([field, value]) => {
      if (typeof value === "undefined") return;
      if (field === "email") {
        payload[field] = normalizeEmail(value);
        return;
      }
      if (field === "sodienthoai") {
        payload[field] = normalizePhone(value);
        return;
      }
      payload[field] = typeof value === "string" ? normalizeText(value) : value;
    });

    if (nextStatus) {
      payload.trangthai = nextStatus;
    }

    if (
      Object.prototype.hasOwnProperty.call(normalizedPatch, "is_locked") ||
      Object.prototype.hasOwnProperty.call(normalizedPatch, "bi_khoa")
    ) {
      const isLocked = Number(normalizedPatch.is_locked || normalizedPatch.bi_khoa || 0) === 1;
      payload.is_locked = isLocked ? 1 : 0;
      payload.bi_khoa = isLocked ? 1 : 0;
    }

    if (
      Object.prototype.hasOwnProperty.call(normalizedPatch, "lock_reason") ||
      Object.prototype.hasOwnProperty.call(normalizedPatch, "ly_do_khoa")
    ) {
      const lockReason = normalizeText(
        normalizedPatch.lock_reason || normalizedPatch.ly_do_khoa || "",
      );
      payload.lock_reason = lockReason;
      payload.ly_do_khoa = lockReason;
    }

    await updateFn(dvqtUserTable, payload, normalizedId);

    const session = getSession();
    if (session && normalizeText(session.id) === normalizedId) {
      saveSession({
        ...session,
        ...mapSharedUserRecord({
          ...session,
          ...payload,
          id: normalizedId,
          id_dichvu:
            session.id_dichvu ||
            (normalizeLowerText(role) === "shipper" ? ghnServiceId : "0"),
        }),
      });
    }

    const users = getUsers();
    const index = users.findIndex((item) => normalizeText(item.id) === normalizedId);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        ...mapSharedUserRecord({
          ...users[index],
          ...payload,
          id: normalizedId,
        }),
      };
      saveUsers(users);
    }

    return { status: "success", message: "Đã cập nhật người dùng." };
  }

  async function deleteKrudUser(userId) {
    const normalizedId = normalizeText(userId);
    if (!normalizedId) {
      throw new Error("Thiếu mã người dùng để xóa.");
    }

    const deleteFn = getKrudDeleteFn();
    if (!deleteFn) {
      throw new Error("Không tìm thấy hàm KRUD delete.");
    }

    await deleteFn(dvqtUserTable, normalizedId);

    const session = getSession();
    if (session && normalizeText(session.id) === normalizedId) {
      clearSession();
    }

    saveUsers(
      getUsers().filter((item) => normalizeText(item.id) !== normalizedId),
    );

    return { status: "success", message: "Đã xóa người dùng." };
  }

  window.GiaoHangNhanhLocalAuth = {
    storageKeys,
    krudTables: {
      customer: dvqtUserTable,
      shipper: dvqtUserTable,
    },
    normalizeText,
    normalizePhone,
    getUsers,
    getSession,
    saveSession,
    clearSession,
    logout,
    getDashboardPath,
    listAllKrudUsers,
    updateKrudUser,
    deleteKrudUser,
    register,
    login,
    bootstrapSession,
    ensureCustomerAccountForBooking,
    authChangeEventName,
  };

  Promise.resolve()
    .then(bootstrapSession)
    .catch((error) => {
      console.error("Cannot initialize GHN shared auth:", error);
    });
})(window, document);
