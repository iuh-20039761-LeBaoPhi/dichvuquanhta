(function (window, document) {
  if (window.__ghnAdminUsersManageInitDone) return;
  window.__ghnAdminUsersManageInitDone = true;

  // Trang này chỉ xem danh sách `nguoidung` và khóa/mở khóa tài khoản.
  const USER_TABLE = "nguoidung";
  const config = window.GHNAdminUsersConfig || {};
  const localAuth = window.GiaoHangNhanhLocalAuth || null;

  const refs = {
    tbody: document.getElementById("users-table-body"),
    summary: document.getElementById("users-summary"),
    pagination: document.getElementById("users-pagination"),
    filterForm: document.getElementById("users-filter-form"),
    resetBtn: document.getElementById("users-reset-btn"),
    toast: document.getElementById("users-toast"),
    statTotal: document.getElementById("users-stat-total"),
    statCustomers: document.getElementById("users-stat-customers"),
    statShippers: document.getElementById("users-stat-shippers"),
    statLockedUsers: document.getElementById("users-stat-locked-users"),
  };

  let allUsersCache = [];
  let lastParams = null;

  function getFilterField(name) {
    return refs.filterForm.elements.namedItem(name);
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeLower(value) {
    return normalizeText(value).toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString("vi-VN");
  }

  function showToast(message, type = "success") {
    if (!refs.toast) return;
    refs.toast.textContent = message;
    refs.toast.className = `users-toast is-${type}`;
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      refs.toast.className = "users-toast";
    }, type === "error" ? 5200 : 3200);
  }

  function getUpdateFn() {
    if (typeof window.crud === "function") {
      return (tableName, data, id) => window.crud("update", tableName, data, id);
    }
    if (typeof window.krud === "function") {
      return (tableName, data, id) => window.krud("update", tableName, data, id);
    }
    return null;
  }

  function buildSyntheticAdminUser() {
    return {
      id: Number(config.currentAdminId || 0),
      username: config.currentAdminUsername || "admin01",
      fullname: config.currentAdminName || "Admin",
      phone: config.currentAdminPhone || "",
      email: config.currentAdminEmail || "",
      role: "admin",
      vehicle_type: "",
      created_at: "",
      is_locked: false,
      status_label: "Hoạt động",
      source: "session",
    };
  }

  async function listUsersFromKrud() {
    const adminUser = buildSyntheticAdminUser();
    if (!localAuth || typeof localAuth.listAllKrudUsers !== "function") {
      return [adminUser];
    }

    const users = await localAuth.listAllKrudUsers();
    return [adminUser, ...users];
  }

  function getParamsFromLocation() {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get("search") || "",
      role: params.get("role") || "",
      status: params.get("status") || "",
      page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    };
  }

  function syncForm(params) {
    getFilterField("search").value = params.search;
    getFilterField("role").value = params.role;
    getFilterField("status").value = params.status;
  }

  function updateUrl(params) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(params.page || 1));
    if (params.search) url.searchParams.set("search", params.search);
    else url.searchParams.delete("search");
    if (params.role) url.searchParams.set("role", params.role);
    else url.searchParams.delete("role");
    if (params.status) url.searchParams.set("status", params.status);
    else url.searchParams.delete("status");
    window.history.replaceState({}, "", url.toString());
  }

  function isLocked(user) {
    return Number(user?.is_locked || 0) === 1 || user?.is_locked === true;
  }

  function canToggleLock(user) {
    if (!user) return false;
    if (user.source === "session") return false;
    return user.role !== "admin";
  }

  function findUserById(userId) {
    const normalizedId = normalizeText(userId);
    return allUsersCache.find((user) => normalizeText(user.id) === normalizedId) || null;
  }

  function getRoleBadge(user) {
    const role = user.role || "";
    const roleMap = {
      admin: { label: "Admin", className: "is-admin" },
      customer: { label: "Khách hàng", className: "is-customer" },
      shipper: { label: "Nhà cung cấp", className: "is-shipper" },
    };
    const meta = roleMap[role] || { label: role, className: "is-customer" };
    return `<span class="role-badge-inline ${meta.className}">${escapeHtml(meta.label)}</span>`;
  }

  function getStatusBadge(user) {
    if (isLocked(user)) {
      return '<span class="users-status-pill is-locked">Đã khóa</span>';
    }
    return '<span class="users-status-pill is-active">Hoạt động</span>';
  }

  function updateStats(users) {
    const list = Array.isArray(users) ? users : [];
    const total = list.length;
    const customers = list.filter((user) => user.role === "customer").length;
    const shippers = list.filter((user) => user.role === "shipper").length;
    const lockedUsers = list.filter(isLocked).length;

    refs.statTotal.textContent = total.toLocaleString("vi-VN");
    refs.statCustomers.textContent = customers.toLocaleString("vi-VN");
    refs.statShippers.textContent = shippers.toLocaleString("vi-VN");
    refs.statLockedUsers.textContent = lockedUsers.toLocaleString("vi-VN");
  }

  function renderUsers(users) {
    if (!Array.isArray(users) || !users.length) {
      refs.tbody.innerHTML = '<tr><td colspan="7" class="users-empty">Không tìm thấy người dùng nào.</td></tr>';
      return;
    }

    refs.tbody.innerHTML = users.map((user) => {
      const mutable = canToggleLock(user);
      const locked = isLocked(user);
      const avatar = escapeHtml((user.username || user.fullname || "U").charAt(0).toUpperCase());
      const userId = escapeHtml(user.id);
      const userRole = escapeHtml(user.role || "");
      const actionButtons = mutable
        ? locked
          ? `<button type="button" class="btn-sm btn-view-site-pill" data-user-action="unlock" data-user-id="${userId}" data-user-role="${userRole}" title="Mở khóa" style="color:#2e7d32; background:rgba(46,125,50,0.1);"><i class="fa-solid fa-lock-open"></i></button>`
          : `<button type="button" class="btn-sm btn-view-site-pill" data-user-action="lock" data-user-id="${userId}" data-user-role="${userRole}" title="Khóa" style="color:#d9534f; background:rgba(217,83,79,0.1);"><i class="fa-solid fa-lock"></i></button>`
        : "";

      return `
        <tr data-user-row="${userId}" data-user-role="${userRole}">
          <td data-label="ID"><span style="font-weight:700; color:#64748b;">#${Number(user.id || 0).toLocaleString("vi-VN")}</span></td>
          <td data-label="Tài khoản">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="users-avatar">${avatar}</div>
              <strong>${escapeHtml(user.username)}</strong>
            </div>
          </td>
          <td data-label="Thông tin liên hệ">
            <div style="line-height:1.4;">
              <div style="font-weight:600;">${escapeHtml(user.fullname)}</div>
              <div style="font-size:12px; color:#64748b;">
                <i class="fa-regular fa-envelope" style="width:14px;"></i> ${escapeHtml(user.email)}<br>
                <i class="fa-solid fa-phone" style="width:14px;"></i> ${escapeHtml(user.phone)}
                ${user.vehicle_type ? `<br><i class="fa-solid fa-motorcycle" style="width:14px;"></i> ${escapeHtml(user.vehicle_type)}` : ""}
              </div>
            </div>
          </td>
          <td data-label="Vai trò">${getRoleBadge(user)}</td>
          <td data-label="Trạng thái">${getStatusBadge(user)}</td>
          <td data-label="Ngày tham gia"><span style="color:#64748b; font-size:13px;">${formatDate(user.created_at)}</span></td>
          <td data-label="Hành động" style="text-align:right;">
            <div class="users-inline-actions">${actionButtons}</div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderPagination(meta, currentParams) {
    refs.pagination.innerHTML = "";
    const totalPages = Number(meta.total_pages || 0);
    if (totalPages <= 1) {
      refs.pagination.hidden = true;
      return;
    }

    refs.pagination.hidden = false;
    const currentPage = Number(meta.page || 1);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    function createButton(label, page, active, disabled) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `users-page-btn${active ? " is-active" : ""}`;
      button.textContent = label;
      button.disabled = !!disabled || active;
      if (!button.disabled) {
        button.addEventListener("click", () => loadUsers({ ...currentParams, page }));
      }
      return button;
    }

    refs.pagination.appendChild(createButton("‹", Math.max(1, currentPage - 1), false, currentPage === 1));
    for (let page = start; page <= end; page += 1) {
      refs.pagination.appendChild(createButton(String(page), page, page === currentPage, false));
    }
    refs.pagination.appendChild(createButton("›", Math.min(totalPages, currentPage + 1), false, currentPage === totalPages));
  }

  async function toggleLock(action, userId) {
    const user = findUserById(userId);
    if (!canToggleLock(user)) {
      showToast("Admin chỉ được khóa hoặc mở khóa tài khoản người dùng/nhà cung cấp.", "error");
      return;
    }

    const updateFn = getUpdateFn();
    if (!updateFn) {
      showToast("Không tìm thấy hàm KRUD update.", "error");
      return;
    }

    let reason = "";
    if (action === "lock") {
      const promptValue = window.prompt("Nhập lý do khóa tài khoản này:", "Vi phạm quy định");
      if (promptValue === null) return;
      reason = promptValue.trim() || "Vi phạm quy định";
    } else if (action === "unlock") {
      if (!window.confirm("Mở khóa tài khoản này?")) return;
    } else {
      showToast("Hành động không hợp lệ.", "error");
      return;
    }

    try {
      const locked = action === "lock";
      await updateFn(USER_TABLE, {
        id: userId,
        trangthai: locked ? "locked" : "active",
        is_locked: locked ? 1 : 0,
        bi_khoa: locked ? 1 : 0,
        lock_reason: locked ? reason : "",
        ly_do_khoa: locked ? reason : "",
        updated_at: new Date().toISOString(),
      }, userId);

      showToast(locked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.", "success");
      await loadUsers(lastParams || getParamsFromLocation());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái tài khoản.", "error");
    }
  }

  async function loadUsers(params) {
    lastParams = { ...params };
    syncForm(params);
    updateUrl(params);
    refs.summary.textContent = "Đang tải dữ liệu người dùng từ KRUD...";
    refs.tbody.innerHTML = '<tr><td colspan="7" class="users-loading">Đang tải danh sách người dùng...</td></tr>';
    refs.pagination.hidden = true;

    try {
      allUsersCache = await listUsersFromKrud();
      const search = normalizeLower(params.search || "");
      const filteredUsers = allUsersCache.filter((user) => {
        if (params.role && user.role !== params.role) return false;
        if (params.status === "locked" && !isLocked(user)) return false;
        if (params.status === "active" && isLocked(user)) return false;
        if (!search) return true;

        const haystack = [
          user.username,
          user.fullname,
          user.email,
          user.phone,
          user.vehicle_type,
        ].map((value) => normalizeLower(value)).join(" ");
        return haystack.includes(search);
      });
      const page = Math.max(1, Number(params.page || 1));
      const limit = 10;
      const totalRecords = filteredUsers.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * limit;
      const users = filteredUsers.slice(start, start + limit);

      renderUsers(users);
      renderPagination({ page: safePage, total_pages: totalPages }, { ...params, page: safePage });
      updateStats(filteredUsers);
      refs.summary.textContent = `Hiển thị ${users.length} người dùng trên tổng ${totalRecords.toLocaleString("vi-VN")} bản ghi. Trang ${safePage}/${totalPages}.`;
    } catch (error) {
      refs.summary.textContent = "Không tải được dữ liệu.";
      refs.tbody.innerHTML = `<tr><td colspan="7" class="users-empty">${escapeHtml(error instanceof Error ? error.message : "Không thể tải dữ liệu người dùng.")}</td></tr>`;
      refs.pagination.hidden = true;
      updateStats([]);
    }
  }

  if (!refs.tbody || !refs.filterForm) {
    console.error("Thiếu DOM bắt buộc cho trang quản lý người dùng.");
    return;
  }

  refs.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadUsers({
      search: getFilterField("search").value.trim(),
      role: getFilterField("role").value,
      status: getFilterField("status").value,
      page: 1,
    });
  });

  refs.resetBtn.addEventListener("click", () => {
    loadUsers({ search: "", role: "", status: "", page: 1 });
  });

  refs.tbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-action]");
    if (!button) return;
    toggleLock(button.dataset.userAction, button.dataset.userId);
  });

  loadUsers(getParamsFromLocation());
})(window, document);
