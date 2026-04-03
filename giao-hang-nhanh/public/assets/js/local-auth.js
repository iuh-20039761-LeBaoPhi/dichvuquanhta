(function (window) {
  if (window.GiaoHangNhanhLocalAuth) return;

  const storageKeys = {
    users: "ghn-auth-users",
    session: "ghn-auth-session",
  };

  const krudTables = {
    customer: "giaohangnhanh_customers",
    shipper: "giaohangnhanh_shippers",
  };
  const allowPendingShipperLogin = false;

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot parse local auth payload:", error);
      return fallback;
    }
  }

  function readJson(key, fallback) {
    try {
      return safeParse(window.localStorage.getItem(key), fallback);
    } catch (error) {
      console.error("Cannot read local auth payload:", error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Cannot persist local auth payload:", error);
      return false;
    }
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function getUsers() {
    const users = readJson(storageKeys.users, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    return writeJson(storageKeys.users, Array.isArray(users) ? users : []);
  }

  function saveSession(user) {
    const session = {
      id: user.id,
      remote_id: user.remote_id || user.id,
      role: user.role,
      fullname: user.fullname,
      ho_ten: user.ho_ten || user.fullname,
      email: user.email,
      phone: user.phone,
      so_dien_thoai: user.so_dien_thoai || user.phone,
      username: user.username,
      is_approved: user.is_approved,
      is_locked: user.is_locked,
      vehicle_type: user.vehicle_type || user.shipper_vehicle || "",
      shipper_vehicle: user.shipper_vehicle || user.vehicle_type || "",
      bien_so: user.bien_so || user.license_plate || "",
      license_plate: user.license_plate || user.bien_so || "",
      address:
        user.address ||
        user.shipper_address ||
        user.dia_chi ||
        user.company_address ||
        "",
      shipper_address:
        user.shipper_address ||
        user.address ||
        user.dia_chi ||
        user.company_address ||
        "",
      dia_chi:
        user.dia_chi ||
        user.address ||
        user.shipper_address ||
        user.company_address ||
        "",
      company_address:
        user.company_address ||
        user.address ||
        user.shipper_address ||
        user.dia_chi ||
        "",
    };
    writeJson(storageKeys.session, session);
    document.dispatchEvent(
      new CustomEvent("ghn:auth-changed", {
        detail: {
          session,
        },
      }),
    );
    return session;
  }

  function getSession() {
    const session = readJson(storageKeys.session, null);
    return session && typeof session === "object" ? session : null;
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(storageKeys.session);
      document.dispatchEvent(
        new CustomEvent("ghn:auth-changed", {
          detail: {
            session: null,
          },
        }),
      );
    } catch (error) {
      console.error("Cannot clear local auth session:", error);
    }
  }

  function getDashboardPath(role) {
    return role === "shipper"
      ? "public/nha-cung-cap/dashboard.html"
      : "public/khach-hang/dashboard.html";
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
          limit: payload.limit || 50,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 50,
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

    return String(
      result.id ||
        result.insertId ||
        result.insert_id ||
        result.record_id ||
        result.data?.id ||
        result.data?.insertId ||
        result.data?.record_id ||
        result.result?.id ||
        result.result?.insertId ||
        "",
    ).trim();
  }

  function normalizeKrudUserRecord(row, fallbackRole) {
    const role = String(
      row.role || row.vai_tro || row.user_role || fallbackRole || "customer",
    )
      .trim()
      .toLowerCase();

    return {
      ...row,
      id: String(row.id || row.user_id || row.ma_tai_khoan_noi_bo || "").trim(),
      remote_id: String(row.id || row.user_id || "").trim(),
      username: normalizeText(
        row.username || row.ten_dang_nhap || row.phone || row.so_dien_thoai,
      ),
      email: normalizeText(row.email).toLowerCase(),
      phone: normalizePhone(row.phone || row.so_dien_thoai),
      so_dien_thoai: normalizePhone(row.so_dien_thoai || row.phone),
      fullname: normalizeText(row.fullname || row.ho_ten),
      ho_ten: normalizeText(row.ho_ten || row.fullname),
      address: normalizeText(
        row.address ||
          row.shipper_address ||
          row.dia_chi ||
          row.company_address,
      ),
      shipper_address: normalizeText(
        row.shipper_address ||
          row.address ||
          row.dia_chi ||
          row.company_address,
      ),
      dia_chi: normalizeText(
        row.dia_chi ||
          row.address ||
          row.shipper_address ||
          row.company_address,
      ),
      company_address: normalizeText(
        row.company_address ||
          row.address ||
          row.shipper_address ||
          row.dia_chi,
      ),
      password: String(row.password || row.mat_khau || ""),
      mat_khau: String(row.mat_khau || row.password || ""),
      role,
      vai_tro: role,
      is_locked: Number(row.is_locked || row.bi_khoa || 0),
      lock_reason: normalizeText(row.lock_reason || row.ly_do_khoa),
      is_approved:
        role === "shipper"
          ? Number(row.is_approved ?? row.da_phe_duyet ?? 0)
          : Number(row.is_approved ?? row.da_phe_duyet ?? 1),
      so_cccd: normalizeText(row.so_cccd),
      shipper_terms_accepted: Number(
        row.shipper_terms_accepted || row.shipper_dong_y_dieu_khoan || 0,
      ),
      created_at: row.created_at || "",
      updated_at: row.updated_at || "",
    };
  }

  function buildUserRecord(payload) {
    const now = new Date().toISOString();
    const role = String(payload.role || "customer").trim().toLowerCase();
    const phone = normalizePhone(payload.phone);
    const fullname = normalizeText(payload.fullname);
    const username = normalizeText(payload.username || phone);
    const files = payload.files && typeof payload.files === "object" ? payload.files : {};

    return {
      id: `GHN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username,
      email: normalizeText(payload.email).toLowerCase(),
      phone,
      so_dien_thoai: phone,
      fullname,
      ho_ten: fullname,
      address: normalizeText(
        payload.address ||
          payload.shipper_address ||
          payload.dia_chi ||
          payload.company_address,
      ),
      shipper_address: normalizeText(
        payload.shipper_address ||
          payload.address ||
          payload.dia_chi ||
          payload.company_address,
      ),
      dia_chi: normalizeText(
        payload.dia_chi ||
          payload.address ||
          payload.shipper_address ||
          payload.company_address,
      ),
      company_address: normalizeText(
        payload.company_address ||
          payload.address ||
          payload.shipper_address ||
          payload.dia_chi,
      ),
      password: String(payload.password || ""),
      mat_khau: String(payload.password || ""),
      role,
      vai_tro: role,
      is_locked: 0,
      lock_reason: "",
      is_approved: role === "shipper" ? 0 : 1,
      da_phe_duyet: role === "shipper" ? 0 : 1,
      so_cccd: normalizeText(payload.cccd),
      shipper_terms_accepted: payload.shipper_terms_accepted ? 1 : 0,
      uploads: {
        cccd_front_name: normalizeText(files.cccd_front_name),
        cccd_back_name: normalizeText(files.cccd_back_name),
        avatar_name: normalizeText(files.avatar_name),
      },
      cccd_front_name: normalizeText(files.cccd_front_name),
      cccd_back_name: normalizeText(files.cccd_back_name),
      avatar_name: normalizeText(files.avatar_name),
      created_at: now,
      updated_at: now,
    };
  }

  function buildKrudUserInsertPayload(user) {
    return {
      ma_tai_khoan_noi_bo: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      so_dien_thoai: user.so_dien_thoai,
      fullname: user.fullname,
      ho_ten: user.ho_ten,
      password: user.password,
      mat_khau: user.mat_khau,
      role: user.role,
      vai_tro: user.vai_tro,
      is_locked: user.is_locked,
      lock_reason: user.lock_reason,
      is_approved: user.is_approved,
      da_phe_duyet: user.da_phe_duyet,
      so_cccd: user.so_cccd,
      shipper_terms_accepted: user.shipper_terms_accepted,
      cccd_front_name: user.cccd_front_name,
      cccd_back_name: user.cccd_back_name,
      avatar_name: user.avatar_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async function listKrudUsersByRole(role) {
    const table = role === "shipper" ? krudTables.shipper : krudTables.customer;
    const listFn = getKrudListFn();

    if (!listFn) {
      throw new Error("Không tìm thấy hàm KRUD list.");
    }

    const response = await listFn({
      table,
      sort: { id: "desc" },
      page: 1,
      limit: 200,
    });

    return extractRows(response).map((row) => normalizeKrudUserRecord(row, role));
  }

  async function listAllKrudUsers() {
    const [customers, shippers] = await Promise.all([
      listKrudUsersByRole("customer").catch(() => []),
      listKrudUsersByRole("shipper").catch(() => []),
    ]);

    return [...customers, ...shippers];
  }

  async function listPendingShippers() {
    const users = await listKrudUsersByRole("shipper");
    return users.filter((user) => Number(user.is_approved) !== 1);
  }

  async function approveShipper(userId) {
    const normalizedId = String(userId || "").trim();
    if (!normalizedId) {
      throw new Error("Thiếu mã shipper để duyệt.");
    }

    const updateFn = getKrudUpdateFn();
    if (!updateFn) {
      throw new Error("Không tìm thấy hàm KRUD update.");
    }

    const pendingUsers = await listPendingShippers();
    const targetUser = pendingUsers.find(
      (user) => String(user.id || "") === normalizedId,
    );

    if (!targetUser) {
      throw new Error("Không tìm thấy shipper đang chờ duyệt.");
    }

    await updateFn(
      krudTables.shipper,
      {
        is_approved: 1,
        da_phe_duyet: 1,
        updated_at: new Date().toISOString(),
      },
      normalizedId,
    );

    return {
      status: "success",
      message: `Đã duyệt tài khoản shipper #${normalizedId}.`,
      user: {
        ...targetUser,
        is_approved: 1,
        da_phe_duyet: 1,
      },
    };
  }

  function inferKrudTableByRole(role) {
    return String(role || "").trim().toLowerCase() === "shipper"
      ? krudTables.shipper
      : krudTables.customer;
  }

  async function updateKrudUser(userId, role, patch = {}) {
    const normalizedId = String(userId || "").trim();
    if (!normalizedId) {
      throw new Error("Thiếu mã người dùng để cập nhật.");
    }

    const updateFn = getKrudUpdateFn();
    if (!updateFn) {
      throw new Error("Không tìm thấy hàm KRUD update.");
    }

    await updateFn(
      inferKrudTableByRole(role),
      {
        ...patch,
        updated_at: new Date().toISOString(),
      },
      normalizedId,
    );

    return { status: "success", message: "Đã cập nhật người dùng." };
  }

  async function deleteKrudUser(userId, role) {
    const normalizedId = String(userId || "").trim();
    if (!normalizedId) {
      throw new Error("Thiếu mã người dùng để xóa.");
    }

    const deleteFn = getKrudDeleteFn();
    if (!deleteFn) {
      throw new Error("Không tìm thấy hàm KRUD delete.");
    }

    await deleteFn(inferKrudTableByRole(role), normalizedId);
    return { status: "success", message: "Đã xóa người dùng." };
  }

  async function registerWithKrud(payload) {
    const insertFn = getKrudInsertFn();
    if (!insertFn) {
      throw new Error("Không tìm thấy hàm KRUD insert.");
    }

    const users = await listAllKrudUsers();
    const nextUser = buildUserRecord(payload);
    const duplicate = users.find((user) => {
      return (
        String(user.username || "").trim().toLowerCase() ===
          nextUser.username.toLowerCase() ||
        String(user.email || "").trim().toLowerCase() === nextUser.email ||
        normalizePhone(user.phone) === nextUser.phone
      );
    });

    if (duplicate) {
      return {
        status: "error",
        message: "Tên đăng nhập, Email hoặc Số điện thoại đã được sử dụng.",
      };
    }

    const table =
      nextUser.role === "shipper" ? krudTables.shipper : krudTables.customer;
    const result = await insertFn(table, buildKrudUserInsertPayload(nextUser));
    const remoteId = extractInsertId(result);
    if (remoteId) {
      nextUser.remote_id = remoteId;
      nextUser.id = remoteId;
    }

    if (nextUser.role === "shipper") {
      return {
        status: "success",
        message:
          "Đăng ký thành công. Tài khoản shipper của bạn đang chờ quản trị viên duyệt.",
        requires_approval: true,
        user: nextUser,
      };
    }

    saveSession(nextUser);

    return {
      status: "success",
      message: "Đăng ký thành công!",
      requires_approval: false,
      user: nextUser,
    };
  }

  function registerLocal(payload) {
    const users = getUsers();
    const nextUser = buildUserRecord(payload);
    const duplicate = users.find((user) => {
      return (
        String(user.username || "").trim().toLowerCase() ===
          nextUser.username.toLowerCase() ||
        String(user.email || "").trim().toLowerCase() === nextUser.email ||
        normalizePhone(user.phone) === nextUser.phone
      );
    });

    if (duplicate) {
      return {
        status: "error",
        message: "Tên đăng nhập, Email hoặc Số điện thoại đã được sử dụng.",
      };
    }

    saveUsers([nextUser, ...users]);

    if (nextUser.role === "shipper") {
      return {
        status: "success",
        message:
          "Đăng ký thành công. Tài khoản shipper của bạn đang chờ quản trị viên duyệt.",
        requires_approval: true,
        user: nextUser,
      };
    }

    saveSession(nextUser);

    return {
      status: "success",
      message: "Đăng ký thành công!",
      requires_approval: false,
      user: nextUser,
    };
  }

  async function register(payload) {
    try {
      if (getKrudInsertFn() && getKrudListFn()) {
        return await registerWithKrud(payload);
      }
    } catch (error) {
      console.error("KRUD register failed, fallback to local:", error);
    }

    return registerLocal(payload);
  }

  async function loginWithKrud(payload) {
    const loginIdentifier = normalizeText(payload.loginIdentifier);
    const password = String(payload.password || "");
    const users = await listAllKrudUsers();
    const user = users.find((item) => {
      return (
        normalizePhone(item.phone) === normalizePhone(loginIdentifier) ||
        String(item.username || "")
          .trim()
          .toLowerCase() === loginIdentifier.toLowerCase()
      );
    });

    if (!user) {
      return {
        status: "error",
        message: "Số điện thoại không tồn tại.",
      };
    }

    if (Number(user.is_locked) === 1) {
      const reason = String(user.lock_reason || "").trim() || "Vi phạm chính sách";
      return {
        status: "error",
        message: `Tài khoản bị khóa. Lý do: ${reason}`,
      };
    }

    if (
      user.role === "shipper" &&
      Number(user.is_approved) !== 1 &&
      !allowPendingShipperLogin
    ) {
      return {
        status: "error",
        message: "Tài khoản shipper của bạn đang chờ quản trị viên duyệt.",
      };
    }

    if (String(user.password || "") !== password) {
      return {
        status: "error",
        message: "Mật khẩu không chính xác.",
      };
    }

    saveSession(user);

    return {
      status: "success",
      message: "Đăng nhập thành công!",
      user,
    };
  }

  function loginLocal(payload) {
    const loginIdentifier = normalizeText(payload.loginIdentifier);
    const password = String(payload.password || "");
    const users = getUsers();
    const user = users.find((item) => {
      return (
        normalizePhone(item.phone) === normalizePhone(loginIdentifier) ||
        String(item.username || "")
          .trim()
          .toLowerCase() === loginIdentifier.toLowerCase()
      );
    });

    if (!user) {
      return {
        status: "error",
        message: "Số điện thoại không tồn tại.",
      };
    }

    if (Number(user.is_locked) === 1) {
      const reason = String(user.lock_reason || "").trim() || "Vi phạm chính sách";
      return {
        status: "error",
        message: `Tài khoản bị khóa. Lý do: ${reason}`,
      };
    }

    if (
      user.role === "shipper" &&
      Number(user.is_approved) !== 1 &&
      !allowPendingShipperLogin
    ) {
      return {
        status: "error",
        message: "Tài khoản shipper của bạn đang chờ quản trị viên duyệt.",
      };
    }

    if (String(user.password || "") !== password) {
      return {
        status: "error",
        message: "Mật khẩu không chính xác.",
      };
    }

    saveSession(user);

    return {
      status: "success",
      message: "Đăng nhập thành công!",
      user,
    };
  }

  async function login(payload) {
    try {
      if (getKrudListFn()) {
        return await loginWithKrud(payload);
      }
    } catch (error) {
      console.error("KRUD login failed, fallback to local:", error);
    }

    return loginLocal(payload);
  }

  window.GiaoHangNhanhLocalAuth = {
    storageKeys,
    krudTables,
    normalizeText,
    normalizePhone,
    getUsers,
    getSession,
    clearSession,
    getDashboardPath,
    listAllKrudUsers,
    listPendingShippers,
    approveShipper,
    updateKrudUser,
    deleteKrudUser,
    register,
    login,
  };
})(window);
