(function (window) {
  if (window.FastGoCustomerPortalStore) return;

  const storageKeys = {
    role: "fastgo-auth-role",
    identity: "fastgo-auth-identity",
    history: "fastgo-customer-history",
    users: "fastgo-auth-users",
  };

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot parse local payload:", error);
      return fallback;
    }
  }

  function readJson(key, fallback) {
    try {
      return safeParse(window.localStorage.getItem(key), fallback);
    } catch (error) {
      console.error("Cannot read local payload:", error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Cannot write local payload:", error);
      return false;
    }
  }

  function getSavedUsers() {
    const users = readJson(storageKeys.users, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    return writeJson(storageKeys.users, Array.isArray(users) ? users : []);
  }

  function getUserKey(role, email) {
    return `${String(role || "").trim().toLowerCase()}::${String(email || "").trim().toLowerCase()}`;
  }

  function getCurrentUserKey() {
    const identity = readIdentity();
    return getUserKey(getSavedRole(), identity.email || "");
  }

  function updateStoredUser(mutator, options = {}) {
    const currentKey = String(options.currentKey || getCurrentUserKey()).trim();
    if (!currentKey || currentKey === "::") return null;

    const users = getSavedUsers();
    const currentUser = users.find((user) => user.key === currentKey);
    if (!currentUser) return null;

    const nextUser = mutator && typeof mutator === "function" ? mutator(currentUser) : currentUser;
    if (!nextUser || typeof nextUser !== "object") return null;

    const normalizedUser = {
      ...currentUser,
      ...nextUser,
      key: getUserKey(nextUser.role || currentUser.role, nextUser.email || currentUser.email),
      updated_at: new Date().toISOString(),
    };
    saveUsers(users.map((user) => (user.key === currentKey ? normalizedUser : user)));
    return normalizedUser;
  }

  function buildSampleItems() {
    return [
      {
        code: "DL-240328-07",
        type: "dat-lich",
        type_label: "Đặt lịch",
        title: "Đặt lịch chuyển nhà trọn gói",
        service_label: "Chuyển nhà",
        status_class: "xac-nhan",
        status_text: "Đã xác nhận",
        summary: "Lịch chuyển dọn đã được xác nhận, chờ đội vận hành khóa phương án xe và nhân sự.",
        meta: "Dự kiến triển khai lúc 08:00, cần bọc kính và đồ điện tử",
        from_address: "Sunrise City, Quận 7, TP.HCM",
        to_address: "Vinhomes Grand Park, TP. Thủ Đức",
        created_at: "2026-03-28T09:30:00+07:00",
        schedule_label: "31/03/2026 • 08:00 - 10:00",
        estimated_amount: 4200000,
        source: "sample",
      },
      {
        code: "KS-240330-01",
        type: "khao-sat",
        type_label: "Khảo sát",
        title: "Khảo sát chuyển căn hộ 2 phòng ngủ",
        service_label: "Chuyển nhà",
        status_class: "moi",
        status_text: "Mới tiếp nhận",
        summary: "Đầu việc đã gửi, điều phối sẽ gọi lại để chốt lịch khảo sát trong khung giờ bạn chọn.",
        meta: "Ưu tiên khảo sát tại Quận 7, cuối tuần này",
        from_address: "Sunrise City, Quận 7, TP.HCM",
        to_address: "",
        created_at: "2026-03-30T14:15:00+07:00",
        schedule_label: "02/04/2026 • 09:00 - 11:00",
        estimated_amount: 0,
        source: "sample",
      },
      {
        code: "DL-240325-03",
        type: "dat-lich",
        type_label: "Đặt lịch",
        title: "Yêu cầu chuyển văn phòng mini",
        service_label: "Chuyển văn phòng",
        status_class: "dang-xu-ly",
        status_text: "Đang xử lý",
        summary: "Điều phối đang rà phương án bốc xếp và lộ trình phù hợp để gửi lại báo giá chốt.",
        meta: "Có 1 tủ hồ sơ lớn và 6 bộ bàn ghế cần tháo lắp",
        from_address: "Tân Bình, TP.HCM",
        to_address: "Quận 3, TP.HCM",
        created_at: "2026-03-25T16:40:00+07:00",
        schedule_label: "30/03/2026 • 13:30 - 16:30",
        estimated_amount: 6800000,
        source: "sample",
      },
    ];
  }

  function normalizeHistoryItem(item) {
    const statusMap = {
      moi: "moi",
      xac_nhan: "xac-nhan",
      "xac-nhan": "xac-nhan",
      dang_xu_ly: "dang-xu-ly",
      "dang-xu-ly": "dang-xu-ly",
    };
    const normalizedStatusClass =
      statusMap[String(item?.status_class || "").trim()] || "moi";

    return {
      code: String(item?.code || "").trim(),
      type: String(item?.type || "dat-lich").trim(),
      type_label: String(item?.type_label || (item?.type === "khao-sat" ? "Khảo sát" : "Đặt lịch")).trim(),
      title: String(item?.title || "").trim(),
      service_label: String(item?.service_label || "").trim(),
      status_class: normalizedStatusClass,
      status_text: String(item?.status_text || "Mới tiếp nhận").trim(),
      summary: String(item?.summary || "").trim(),
      meta: String(item?.meta || "").trim(),
      from_address: String(item?.from_address || "").trim(),
      to_address: String(item?.to_address || "").trim(),
      created_at: String(item?.created_at || new Date().toISOString()).trim(),
      schedule_label: String(item?.schedule_label || "").trim(),
      estimated_amount: Number(item?.estimated_amount || 0),
      contact_name: String(item?.contact_name || "").trim(),
      contact_phone: String(item?.contact_phone || "").trim(),
      note: String(item?.note || "").trim(),
      source: String(item?.source || "local").trim(),
    };
  }

  function sortByCreatedAt(items) {
    return items.sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }

  function getStoredHistoryItems() {
    const items = readJson(storageKeys.history, []);
    return Array.isArray(items) ? items.map(normalizeHistoryItem) : [];
  }

  function getHistoryItems() {
    const combined = [...getStoredHistoryItems(), ...buildSampleItems()].map(normalizeHistoryItem);
    const unique = new Map();
    combined.forEach((item) => {
      if (!item.code) return;
      if (!unique.has(item.code)) {
        unique.set(item.code, item);
      }
    });
    return sortByCreatedAt(Array.from(unique.values()));
  }

  function getHistoryItemByCode(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return null;
    return (
      getHistoryItems().find((item) => String(item.code || "").trim().toUpperCase() === normalizedCode) || null
    );
  }

  function saveHistoryItem(item) {
    const nextItem = normalizeHistoryItem(item);
    const items = getStoredHistoryItems().filter((entry) => entry.code !== nextItem.code);
    items.unshift(nextItem);
    writeJson(storageKeys.history, items);
    return nextItem;
  }

  function readIdentity() {
    const identity = readJson(storageKeys.identity, {});
    return identity && typeof identity === "object" ? identity : {};
  }

  function saveIdentity(payload) {
    const current = readIdentity();
    const nextIdentity = {
      ...current,
      ...(payload && typeof payload === "object" ? payload : {}),
    };
    writeJson(storageKeys.identity, nextIdentity);
    return nextIdentity;
  }

  function syncIdentityFromProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return readIdentity();
    }

    return saveIdentity({
      fullName: String(profile.full_name || profile.fullName || "").trim(),
      full_name: String(profile.full_name || profile.fullName || "").trim(),
      contact_person: String(profile.contact_person || profile.contactPerson || "").trim(),
      contactPerson: String(profile.contact_person || profile.contactPerson || "").trim(),
      email: String(profile.email || "").trim(),
      phone: String(profile.phone || "").trim(),
      status: String(profile.status || "").trim(),
    });
  }

  function getSavedRole() {
    try {
      return String(window.localStorage.getItem(storageKeys.role) || "").trim();
    } catch (error) {
      console.error("Cannot access saved role:", error);
      return "";
    }
  }

  function getDisplayName(identity) {
    return (
      String(identity?.fullName || identity?.full_name || "").trim() ||
      String(identity?.email || "").trim() ||
      "khách hàng"
    );
  }

  function getDashboardStats(items) {
    const list = Array.isArray(items) ? items : getHistoryItems();
    const openCount = list.filter((item) => ["moi", "dang-xu-ly"].includes(item.status_class)).length;
    const confirmedCount = list.filter((item) => item.status_class === "xac-nhan").length;
    const surveyCount = list.filter((item) => item.type === "khao-sat").length;
    return {
      total: list.length,
      open_count: openCount,
      confirmed_count: confirmedCount,
      survey_count: surveyCount,
    };
  }

  function clearAuthSession() {
    try {
      window.localStorage.removeItem(storageKeys.identity);
      window.localStorage.removeItem(storageKeys.role);
    } catch (error) {
      console.error("Cannot clear local session:", error);
    }
  }

  async function fetchProfile() {
    const profile = syncIdentityFromProfile(readIdentity());
    return profile || null;
  }

  async function fetchDashboard() {
    const profile = syncIdentityFromProfile(readIdentity());
    const items = getHistoryItems();
    return {
      profile,
      stats: getDashboardStats(items),
      recent_requests: items.slice(0, 3),
    };
  }

  async function fetchHistory() {
    const profile = syncIdentityFromProfile(readIdentity());
    return {
      profile,
      history: getHistoryItems(),
    };
  }

  async function fetchDetail(code) {
    const profile = syncIdentityFromProfile(readIdentity());
    return {
      profile,
      request: code ? getHistoryItemByCode(code) : null,
    };
  }

  async function saveRequest(payload) {
    if (!payload || typeof payload !== "object") return null;
    return saveHistoryItem(payload);
  }

  async function updateProfile(payload) {
    const currentIdentity = readIdentity();
    const currentKey = getUserKey(getSavedRole(), currentIdentity.email || "");
    const nextProfile = syncIdentityFromProfile({
      ...currentIdentity,
      ...(payload && typeof payload === "object" ? payload : {}),
    });

    updateStoredUser((currentUser) => ({
      ...currentUser,
      full_name: String(nextProfile.full_name || currentUser.full_name || "").trim(),
      fullName: String(nextProfile.fullName || nextProfile.full_name || currentUser.fullName || "").trim(),
      contact_person: String(nextProfile.contact_person || currentUser.contact_person || "").trim(),
      contactPerson: String(nextProfile.contactPerson || nextProfile.contact_person || currentUser.contactPerson || "").trim(),
      email: String(nextProfile.email || currentUser.email || "").trim().toLowerCase(),
      phone: String(nextProfile.phone || currentUser.phone || "").trim(),
      role: String(getSavedRole() || currentUser.role || "khach-hang").trim(),
    }), { currentKey });

    return nextProfile;
  }

  async function changePassword(payload) {
    const currentPassword = String(payload?.current_password || "");
    const newPassword = String(payload?.new_password || "");
    const confirmPassword = String(payload?.confirm_password || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error("Vui lòng nhập đủ ba trường mật khẩu.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận chưa khớp.");
    }

    const updatedUser = updateStoredUser((currentUser) => {
      if (String(currentUser.password || "") !== currentPassword) {
        throw new Error("Mật khẩu hiện tại chưa đúng.");
      }

      return {
        ...currentUser,
        password: newPassword,
      };
    });

    if (!updatedUser) {
      throw new Error("Không tìm thấy tài khoản hiện tại để cập nhật mật khẩu.");
    }

    return { status: "success" };
  }

  window.FastGoCustomerPortalStore = {
    storageKeys,
    buildSampleItems,
    getStoredHistoryItems,
    getHistoryItems,
    getHistoryItemByCode,
    saveHistoryItem,
    readIdentity,
    saveIdentity,
    syncIdentityFromProfile,
    getSavedRole,
    getDisplayName,
    getDashboardStats,
    fetchProfile,
    fetchDashboard,
    fetchHistory,
    fetchDetail,
    saveRequest,
    updateProfile,
    changePassword,
    clearAuthSession,
  };
})(window);
