(function (window, document) {
  if (window.__ghnAdminUsersManageInitDone) return;
  window.__ghnAdminUsersManageInitDone = true;

  // Trang này quản lý bảng dùng chung `nguoidung`; tài khoản admin chung chỉ hiển thị từ PHP session.
  const USER_TABLE = "nguoidung";
  const GHN_SERVICE_ID = "7";
  const CUSTOMER_SERVICE_ID = "0";
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
    createBtn: document.getElementById("users-open-create"),
    modal: document.getElementById("users-editor-modal"),
    modalTitle: document.getElementById("users-editor-title"),
    editorForm: document.getElementById("users-editor-form"),
    editorSubmit: document.getElementById("users-editor-submit"),
    passwordInput: document.getElementById("user-password"),
    passwordHelp: document.getElementById("user-password-help"),
    roleInput: document.getElementById("user-role"),
  };

  let allUsersCache = [];
  let lastParams = null;

  function getFilterField(name) {
    return refs.filterForm.elements.namedItem(name);
  }

  function getEditorField(name) {
    return refs.editorForm.elements.namedItem(name);
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeLower(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function normalizeEmail(value) {
    return normalizeLower(value);
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

  function getInsertFn() {
    if (typeof window.crud === "function") {
      return (tableName, data) => window.crud("insert", tableName, data);
    }
    if (typeof window.krud === "function") {
      return (tableName, data) => window.krud("insert", tableName, data);
    }
    return null;
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

  function getDeleteFn() {
    if (typeof window.crud === "function") {
      return (tableName, id) => window.crud("delete", tableName, { id });
    }
    if (typeof window.krud === "function") {
      return (tableName, id) => window.krud("delete", tableName, { id });
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
      address: "",
      created_at: "",
      is_locked: false,
      lock_reason: "",
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
      page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    };
  }

  function syncForm(params) {
    getFilterField("search").value = params.search;
    getFilterField("role").value = params.role;
  }

  function updateUrl(params) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(params.page || 1));
    if (params.search) url.searchParams.set("search", params.search);
    else url.searchParams.delete("search");
    if (params.role) url.searchParams.set("role", params.role);
    else url.searchParams.delete("role");
    window.history.replaceState({}, "", url.toString());
  }

  function getRoleBadge(user) {
    const role = user.role || "";
    const roleMap = {
      admin: { label: "Admin", className: "is-admin" },
      customer: { label: "Khách hàng", className: "is-customer" },
      shipper: { label: "Shipper", className: "is-shipper" },
    };
    const meta = roleMap[role] || { label: role, className: "is-customer" };
    return `<span class="role-badge-inline ${meta.className}">${escapeHtml(meta.label)}</span>`;
  }

  function getStatusBadge(user) {
    if (Number(user.is_locked || 0) === 1 || user.is_locked === true) {
      return '<span class="users-status-pill is-locked">Đã khóa</span>';
    }
    return '<span class="users-status-pill is-active">Hoạt động</span>';
  }

  function updateStats(users) {
    const list = Array.isArray(users) ? users : [];
    const total = list.length;
    const customers = list.filter((user) => user.role === "customer").length;
    const shippers = list.filter((user) => user.role === "shipper").length;
    const lockedUsers = list.filter((user) => Number(user.is_locked || 0) === 1 || user.is_locked === true).length;

    refs.statTotal.textContent = total.toLocaleString("vi-VN");
    refs.statCustomers.textContent = customers.toLocaleString("vi-VN");
    refs.statShippers.textContent = shippers.toLocaleString("vi-VN");
    refs.statLockedUsers.textContent = lockedUsers.toLocaleString("vi-VN");
  }

  function findUserById(userId) {
    const normalizedId = normalizeText(userId);
    return allUsersCache.find((user) => normalizeText(user.id) === normalizedId) || null;
  }

  function canMutateUser(user) {
    if (!user) return false;
    if (user.source === "session") return false;
    return user.role !== "admin";
  }

  function renderUsers(users) {
    if (!Array.isArray(users) || !users.length) {
      refs.tbody.innerHTML = '<tr><td colspan="7" class="users-empty">Không tìm thấy người dùng nào.</td></tr>';
      return;
    }

    refs.tbody.innerHTML = users.map((user) => {
      const mutable = canMutateUser(user);
      const avatar = escapeHtml((user.username || user.fullname || "U").charAt(0).toUpperCase());
      const actionButtons = [];
      const userId = escapeHtml(user.id);
      const userRole = escapeHtml(user.role || "");

      if (mutable) {
        actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="edit" data-user-id="${userId}" data-user-role="${userRole}" title="Sửa" style="color:#0a2a66; background:rgba(10,42,102,0.08);"><i class="fa-solid fa-pen"></i></button>`);
        if (Number(user.is_locked || 0) === 1 || user.is_locked === true) {
          actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="unlock" data-user-id="${userId}" data-user-role="${userRole}" title="Mở khóa" style="color:#2e7d32; background:rgba(46,125,50,0.1);"><i class="fa-solid fa-lock-open"></i></button>`);
        } else {
          actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="lock" data-user-id="${userId}" data-user-role="${userRole}" title="Khóa" style="color:#d9534f; background:rgba(217,83,79,0.1);"><i class="fa-solid fa-lock"></i></button>`);
        }
        actionButtons.push(`<button type="button" class="btn-sm btn-view-site-pill" data-user-action="delete" data-user-id="${userId}" data-user-role="${userRole}" title="Xóa" style="color:#1a1a1a; background:rgba(0,0,0,0.05);"><i class="fa-solid fa-trash-can"></i></button>`);
      }

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
            <div class="users-inline-actions">${actionButtons.join("")}</div>
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

  function setEditorSubmitting(isSubmitting) {
    if (!refs.editorSubmit) return;
    refs.editorSubmit.disabled = isSubmitting;
    refs.editorSubmit.innerHTML = isSubmitting
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...'
      : '<i class="fa-solid fa-floppy-disk"></i> Lưu người dùng';
  }

  function updateShipperFields() {
    const role = refs.roleInput.value;
    document.querySelectorAll("[data-shipper-field]").forEach((field) => {
      field.style.display = role === "shipper" ? "" : "none";
    });
  }

  function openEditor(mode, user = null) {
    refs.editorForm.reset();
    getEditorField("mode").value = mode;
    getEditorField("user_id").value = user ? normalizeText(user.id) : "";
    refs.modalTitle.textContent = mode === "edit" ? "Sửa người dùng" : "Thêm người dùng";
    refs.passwordInput.required = mode === "create";
    refs.passwordHelp.textContent = mode === "create"
      ? "Tạo mới bắt buộc nhập mật khẩu."
      : "Để trống nếu không đổi mật khẩu.";

    if (user) {
      getEditorField("fullname").value = user.fullname || "";
      getEditorField("phone").value = user.phone || "";
      getEditorField("email").value = user.email || "";
      getEditorField("role").value = user.role === "shipper" ? "shipper" : "customer";
      getEditorField("address").value = user.address || user.dia_chi || user.company_address || "";
      getEditorField("vehicle_type").value = user.vehicle_type || "";
      getEditorField("status").value = Number(user.is_locked || 0) === 1 || user.is_locked === true
        ? "locked"
        : "active";
    } else {
      getEditorField("role").value = "customer";
      getEditorField("status").value = "active";
    }

    updateShipperFields();
    refs.modal.hidden = false;
    getEditorField("fullname").focus();
  }

  function closeEditor() {
    refs.modal.hidden = true;
    setEditorSubmitting(false);
  }

  function readEditorPayload() {
    const formData = new FormData(refs.editorForm);
    const mode = normalizeText(formData.get("mode") || "create");
    const userId = normalizeText(formData.get("user_id"));
    const fullname = normalizeText(formData.get("fullname"));
    const phone = normalizePhone(formData.get("phone"));
    const email = normalizeEmail(formData.get("email"));
    const role = normalizeText(formData.get("role"));
    const address = normalizeText(formData.get("address"));
    const vehicleType = normalizeText(formData.get("vehicle_type"));
    const status = normalizeText(formData.get("status")) === "locked" ? "locked" : "active";
    const password = String(formData.get("password") || "").trim();

    if (!fullname) throw new Error("Họ tên không được để trống.");
    if (!phone) throw new Error("Số điện thoại không được để trống.");
    if (!["customer", "shipper"].includes(role)) {
      throw new Error("Vai trò chỉ được là khách hàng hoặc shipper.");
    }
    if (mode === "create" && !password) {
      throw new Error("Tạo mới bắt buộc nhập mật khẩu.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email không đúng định dạng.");
    }

    const duplicate = allUsersCache.find((user) => {
      if (user.source === "session") return false;
      if (mode === "edit" && normalizeText(user.id) === userId) return false;
      const samePhone = phone && normalizePhone(user.phone || user.so_dien_thoai || "") === phone;
      const sameEmail = email && normalizeEmail(user.email || "") === email;
      return samePhone || sameEmail;
    });
    if (duplicate) {
      throw new Error("Email hoặc số điện thoại đã được sử dụng.");
    }

    const now = new Date().toISOString();
    const payload = {
      hovaten: fullname,
      sodienthoai: phone,
      email,
      diachi: address,
      id_dichvu: role === "shipper" ? GHN_SERVICE_ID : CUSTOMER_SERVICE_ID,
      trangthai: status,
      is_locked: status === "locked" ? 1 : 0,
      bi_khoa: status === "locked" ? 1 : 0,
      lock_reason: status === "locked" ? "Khóa bởi admin" : "",
      ly_do_khoa: status === "locked" ? "Khóa bởi admin" : "",
      loai_phuong_tien: role === "shipper" ? vehicleType : "",
      updated_at: now,
    };

    if (mode === "create") {
      payload.matkhau = password;
      payload.created_at = now;
    } else if (password) {
      payload.matkhau = password;
    }

    return { mode, userId, role, payload };
  }

  async function saveEditor(event) {
    event.preventDefault();
    const insertFn = getInsertFn();
    const updateFn = getUpdateFn();

    try {
      const { mode, userId, payload } = readEditorPayload();
      setEditorSubmitting(true);

      if (mode === "create") {
        if (!insertFn) throw new Error("Không tìm thấy hàm KRUD insert.");
        await insertFn(USER_TABLE, payload);
        showToast("Đã thêm người dùng.", "success");
      } else {
        if (!userId) throw new Error("Thiếu ID người dùng để cập nhật.");
        if (!updateFn) throw new Error("Không tìm thấy hàm KRUD update.");
        await updateFn(USER_TABLE, { ...payload, id: userId }, userId);
        showToast("Đã cập nhật người dùng.", "success");
      }

      closeEditor();
      await loadUsers(lastParams || getParamsFromLocation());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không lưu được người dùng.", "error");
      setEditorSubmitting(false);
    }
  }

  async function sendAction(action, userId) {
    const user = findUserById(userId);
    if (!canMutateUser(user)) {
      showToast("Không thể thao tác trên tài khoản admin phiên hiện tại.", "error");
      return;
    }

    if (action === "edit") {
      openEditor("edit", user);
      return;
    }

    const updateFn = getUpdateFn();
    const deleteFn = getDeleteFn();
    let reason = "";
    if (action === "lock") {
      const promptValue = window.prompt("Nhập lý do khóa tài khoản này:", "Vi phạm quy định");
      if (promptValue === null) return;
      reason = promptValue.trim() || "Vi phạm quy định";
    }

    const confirmMessages = {
      unlock: "Mở khóa tài khoản này?",
      delete: "Xóa tài khoản này?",
    };

    if (confirmMessages[action] && !window.confirm(confirmMessages[action])) {
      return;
    }

    try {
      if (action === "lock") {
        if (!updateFn) throw new Error("Không tìm thấy hàm KRUD update.");
        await updateFn(USER_TABLE, {
          id: userId,
          trangthai: "locked",
          is_locked: 1,
          bi_khoa: 1,
          lock_reason: reason,
          ly_do_khoa: reason,
          updated_at: new Date().toISOString(),
        }, userId);
        showToast("Đã khóa tài khoản.", "success");
      } else if (action === "unlock") {
        if (!updateFn) throw new Error("Không tìm thấy hàm KRUD update.");
        await updateFn(USER_TABLE, {
          id: userId,
          trangthai: "active",
          is_locked: 0,
          bi_khoa: 0,
          lock_reason: "",
          ly_do_khoa: "",
          updated_at: new Date().toISOString(),
        }, userId);
        showToast("Đã mở khóa tài khoản.", "success");
      } else if (action === "delete") {
        if (!deleteFn) throw new Error("Không tìm thấy hàm KRUD delete.");
        await deleteFn(USER_TABLE, userId);
        showToast("Đã xóa người dùng.", "success");
      } else {
        throw new Error("Hành động không hợp lệ.");
      }

      await loadUsers(lastParams || getParamsFromLocation());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật người dùng.", "error");
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
        if (!search) return true;

        const haystack = [
          user.username,
          user.fullname,
          user.email,
          user.phone,
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

  if (!refs.tbody || !refs.filterForm || !refs.modal || !refs.editorForm) {
    console.error("Thiếu DOM bắt buộc cho trang quản lý người dùng.");
    return;
  }

  refs.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadUsers({
      search: getFilterField("search").value.trim(),
      role: getFilterField("role").value,
      page: 1,
    });
  });

  refs.resetBtn.addEventListener("click", () => {
    loadUsers({ search: "", role: "", page: 1 });
  });

  refs.createBtn.addEventListener("click", () => openEditor("create"));
  refs.editorForm.addEventListener("submit", saveEditor);
  refs.roleInput.addEventListener("change", updateShipperFields);
  refs.modal.querySelectorAll("[data-users-modal-close]").forEach((button) => {
    button.addEventListener("click", closeEditor);
  });
  refs.modal.addEventListener("click", (event) => {
    if (event.target === refs.modal) closeEditor();
  });

  refs.tbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-action]");
    if (!button) return;
    sendAction(button.dataset.userAction, button.dataset.userId);
  });

  loadUsers(getParamsFromLocation());
})(window, document);
