/**
 * users-manage.js
 * Provider and shared user management for moving admin.
 */
const userManager = (function () {
  const state = {
    allUsers: [],
    filteredUsers: [],
    filters: {
      search: "",
      role: "",
      status: "",
      verification: "",
    },
    userIdToDelete: null,
  };

  function normalizeText(value) {
    return window.adminApi?.normalizeText
      ? window.adminApi.normalizeText(value)
      : String(value || "")
          .replace(/\s+/g, " ")
          .trim();
  }

  function normalizeLowerText(value) {
    return normalizeText(value).toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function splitServiceIds(value) {
    return window.adminApi?.splitServiceIds
      ? window.adminApi.splitServiceIds(value)
      : [];
  }

  function formatDate(value) {
    const raw = normalizeText(value);
    if (!raw) {
      return "--";
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getUserInitial(name) {
    return (normalizeText(name).charAt(0) || "U").toUpperCase();
  }

  function resolveStatus(value) {
    const normalized = normalizeLowerText(value);
    if (
      ["locked", "inactive", "blocked", "disabled", "1"].includes(normalized)
    ) {
      return "1";
    }
    if (["pending", "waiting", "2"].includes(normalized)) {
      return "pending";
    }
    return "0";
  }

  function getStatusMeta(value) {
    const status = resolveStatus(value);
    if (status === "1") {
      return { key: "1", label: "Đang khóa", className: "is-locked" };
    }
    if (status === "pending") {
      return { key: "pending", label: "Chờ duyệt", className: "is-pending" };
    }
    return { key: "0", label: "Đang hoạt động", className: "is-active" };
  }

  function getRoleLabel(role) {
    const map = {
      admin: "Quản trị viên",
      provider: "Nhà cung cấp",
      customer: "Khách hàng",
    };
    return map[role] || role || "Khách hàng";
  }

  function getRoleColor(role) {
    const map = {
      admin: "#ef4444",
      provider: "#f97316",
      customer: "#3b82f6",
    };
    return map[role] || "#64748b";
  }

  function hasVerificationComplete(user) {
    return !!(
      normalizeText(user?.link_avatar) &&
      normalizeText(user?.link_cccd_truoc) &&
      normalizeText(user?.link_cccd_sau)
    );
  }

  function normalizeUserRecord(row) {
    const movingRole = window.adminApi?.resolveMovingRole
      ? window.adminApi.resolveMovingRole(row)
      : "customer";
    const status = resolveStatus(row?.trangthai);
    const serviceIds = splitServiceIds(row?.id_dichvu || "0");
    const normalizedUser = {
      ...row,
      moving_role: movingRole,
      hovaten: normalizeText(row?.hovaten || row?.name || ""),
      sodienthoai: normalizeText(row?.sodienthoai || row?.phone || ""),
      email: normalizeText(row?.email || ""),
      diachi: normalizeText(row?.diachi || row?.dia_chi || ""),
      ten_cong_ty: normalizeText(row?.ten_cong_ty || row?.company_name || ""),
      ma_so_thue: normalizeText(row?.ma_so_thue || row?.tax_code || ""),
      dia_chi_doanh_nghiep: normalizeText(
        row?.dia_chi_doanh_nghiep || row?.diachidonvi || "",
      ),
      loai_phuong_tien: normalizeText(
        row?.loai_phuong_tien || row?.vehicle_type || "",
      ),
      note_admin: normalizeText(row?.note_admin || ""),
      link_avatar: normalizeText(row?.link_avatar || row?.avatar_link || ""),
      link_cccd_truoc: normalizeText(
        row?.link_cccd_truoc || row?.cccd_front_link || "",
      ),
      link_cccd_sau: normalizeText(
        row?.link_cccd_sau || row?.cccd_back_link || "",
      ),
      created_date: normalizeText(row?.created_date || row?.created_at || ""),
      updated_at: normalizeText(row?.updated_at || ""),
      resolved_status: status,
      status_meta: getStatusMeta(status),
      service_ids: serviceIds,
    };

    normalizedUser.verification_complete =
      hasVerificationComplete(normalizedUser);
    return normalizedUser;
  }

  function renderSkeleton(container, count) {
    let html = "";
    for (let index = 0; index < count; index += 1) {
      html += `
                <tr>
                    <td><div class="skeleton" style="width: 140px;"></div></td>
                    <td><div class="skeleton" style="width: 160px;"></div></td>
                    <td><div class="skeleton" style="width: 120px;"></div></td>
                    <td><div class="skeleton" style="width: 90px;"></div></td>
                    <td><div class="skeleton" style="width: 140px;"></div></td>
                </tr>
            `;
    }
    container.innerHTML = html;
  }

  function updateStats() {
    const total = state.allUsers.length;
    const providers = state.allUsers.filter(
      (user) => user.moving_role === "provider",
    ).length;
    const pending = state.allUsers.filter(
      (user) =>
        user.resolved_status === "pending" ||
        (user.moving_role === "provider" && !user.verification_complete),
    ).length;
    const locked = state.allUsers.filter(
      (user) => user.resolved_status === "1",
    ).length;

    document.getElementById("statsUsersTotal").textContent = String(total);
    document.getElementById("statsUsersProviders").textContent =
      String(providers);
    document.getElementById("statsUsersPending").textContent = String(pending);
    document.getElementById("statsUsersLocked").textContent = String(locked);
  }

  function renderFilterChips() {
    const container = document.getElementById("filterChips");
    if (!container) {
      return;
    }

    const chips = [];
    if (state.filters.search) {
      chips.push({ key: "search", label: `Tìm: ${state.filters.search}` });
    }
    if (state.filters.role) {
      chips.push({
        key: "role",
        label: `Vai trò: ${getRoleLabel(state.filters.role)}`,
      });
    }
    if (state.filters.status) {
      chips.push({
        key: "status",
        label: `Trạng thái: ${getStatusMeta(state.filters.status).label}`,
      });
    }
    if (state.filters.verification) {
      chips.push({
        key: "verification",
        label: `Xác minh: ${state.filters.verification === "complete" ? "Đủ avatar + CCCD" : "Thiếu hồ sơ"}`,
      });
    }

    container.innerHTML = chips
      .map(
        (chip) =>
          `<div class="chip">${escapeHtml(chip.label)} <i class="fas fa-times close" onclick="userManager.clearFilter('${escapeHtml(chip.key)}')"></i></div>`,
      )
      .join("");
  }

  function applyFilters() {
    const keyword = normalizeLowerText(state.filters.search);
    state.filteredUsers = state.allUsers.filter((user) => {
      if (keyword) {
        const haystack = [
          user.hovaten,
          user.sodienthoai,
          user.email,
          user.ten_cong_ty,
          user.loai_phuong_tien,
          user.diachi,
          user.note_admin,
        ]
          .map((value) => normalizeLowerText(value))
          .join(" ");
        if (!haystack.includes(keyword)) {
          return false;
        }
      }

      if (state.filters.role && user.moving_role !== state.filters.role) {
        return false;
      }
      if (
        state.filters.status &&
        user.resolved_status !== state.filters.status
      ) {
        return false;
      }
      if (
        state.filters.verification === "complete" &&
        !user.verification_complete
      ) {
        return false;
      }
      if (
        state.filters.verification === "missing" &&
        user.verification_complete
      ) {
        return false;
      }

      return true;
    });

    renderTable();
    renderFilterChips();
  }

  function renderTable() {
    const tbody = document.getElementById("userListBody");
    if (!state.filteredUsers.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--slate-light);">Không có tài khoản phù hợp bộ lọc hiện tại.</td></tr>';
      return;
    }

    tbody.innerHTML = state.filteredUsers
      .map((user) => {
        const verificationChips = [
          user.link_avatar
            ? '<span class="verification-chip is-ok"><i class="fas fa-image"></i>Avatar</span>'
            : '<span class="verification-chip is-missing"><i class="fas fa-image"></i>Thiếu avatar</span>',
          user.link_cccd_truoc
            ? '<span class="verification-chip is-ok"><i class="fas fa-id-card"></i>CCCD trước</span>'
            : '<span class="verification-chip is-missing"><i class="fas fa-id-card"></i>Thiếu CCCD trước</span>',
          user.link_cccd_sau
            ? '<span class="verification-chip is-ok"><i class="fas fa-id-card-clip"></i>CCCD sau</span>'
            : '<span class="verification-chip is-missing"><i class="fas fa-id-card-clip"></i>Thiếu CCCD sau</span>',
        ].join("");

        const avatarContent = user.link_avatar
          ? `<img src="${escapeHtml(user.link_avatar)}" alt="${escapeHtml(user.hovaten)}">`
          : escapeHtml(getUserInitial(user.hovaten));

        return `
                <tr>
                    <td data-label="Người dùng">
                        <div class="identity-stack">
                            <div class="identity-avatar">${avatarContent}</div>
                            <div>
                                <div style="font-weight:800;">${escapeHtml(user.hovaten || "--")}</div>
                                <div style="font-size:12px; color:var(--slate-light);">ID: ${escapeHtml(user.id || "--")}</div>
                                ${user.ten_cong_ty ? `<div style="font-size:12px; color:var(--slate-light); margin-top:4px;">${escapeHtml(user.ten_cong_ty)}</div>` : ""}
                            </div>
                        </div>
                    </td>
                    <td data-label="Liên hệ">
                        <div style="font-weight:700;">${escapeHtml(user.sodienthoai || "--")}</div>
                        <div style="font-size:13px; color:var(--slate-light); margin-top:6px;">${escapeHtml(user.email || "Không có email")}</div>
                        <div style="font-size:12px; color:var(--slate-light); margin-top:6px;">${escapeHtml(user.diachi || "Chưa cập nhật địa chỉ")}</div>
                    </td>
                    <td data-label="Vai trò & hồ sơ">
                        <span class="badge" style="background:${escapeHtml(getRoleColor(user.moving_role))}; color:#fff;">${escapeHtml(getRoleLabel(user.moving_role))}</span>
                        <div style="margin-top:8px; font-size:13px; font-weight:700;">${escapeHtml(user.loai_phuong_tien || "Chưa khai báo phương tiện")}</div>
                        <div class="verification-stack">${verificationChips}</div>
                    </td>
                    <td data-label="Trạng thái">
                        <span class="status-inline ${escapeHtml(user.status_meta.className)}">${escapeHtml(user.status_meta.label)}</span>
                        <div style="font-size:12px; color:var(--slate-light); margin-top:8px;">Tạo: ${escapeHtml(formatDate(user.created_date))}</div>
                    </td>
                    <td data-label="Thao tác">
                        <div class="user-actions">
                            <button type="button" class="btn btn-outline" onclick="userManager.showUserModal('${escapeHtml(user.id)}')" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  function syncPreviewLinks() {
    const mappings = [
      ["link_avatar", "avatarPreviewLink", "Avatar"],
      ["link_cccd_truoc", "cccdFrontPreviewLink", "CCCD mặt trước"],
      ["link_cccd_sau", "cccdBackPreviewLink", "CCCD mặt sau"],
    ];

    mappings.forEach(([inputId, anchorId, fallback]) => {
      const input = document.getElementById(inputId);
      const anchor = document.getElementById(anchorId);
      if (!input || !anchor) {
        return;
      }
      const href = normalizeText(input.value);
      if (href) {
        anchor.href = href;
        anchor.textContent = href;
      } else {
        anchor.href = "#";
        anchor.textContent = `Chưa có ${fallback.toLowerCase()}`;
      }
    });
  }

  function setFormValues(user = null) {
    const form = document.getElementById("userForm");
    form.reset();
    document.getElementById("userId").value = user?.id || "";
    document.getElementById("modalTitle").textContent = user
      ? `Cập nhật ${user.hovaten || user.sodienthoai || user.id}`
      : "Tạo tài khoản mới";
    document
      .getElementById("passwordField")
      .querySelector("label").textContent = user
      ? "Mật khẩu mới (để trống nếu giữ nguyên)"
      : "Mật khẩu";

    const fields = {
      hovaten: user?.hovaten || "",
      sodienthoai: user?.sodienthoai || "",
      email: user?.email || "",
      vaitro: user?.moving_role || "customer",
      diachi: user?.diachi || "",
      trangthai: user?.resolved_status || "0",
      ten_cong_ty: user?.ten_cong_ty || "",
      ma_so_thue: user?.ma_so_thue || "",
      dia_chi_doanh_nghiep: user?.dia_chi_doanh_nghiep || "",
      loai_phuong_tien: user?.loai_phuong_tien || "",
      note_admin: user?.note_admin || "",
      link_avatar: user?.link_avatar || "",
      link_cccd_truoc: user?.link_cccd_truoc || "",
      link_cccd_sau: user?.link_cccd_sau || "",
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value;
        element.disabled = true;
      }
    });

    const matkhau = document.getElementById("matkhau");
    if (matkhau) matkhau.disabled = true;
    const noteAdmin = document.getElementById("note_admin");
    if (noteAdmin) noteAdmin.disabled = true;

    syncPreviewLinks();
  }

  function showUserModal(id = "") {
    const user =
      state.allUsers.find((item) => String(item.id) === String(id)) || null;
    setFormValues(user);
    document.getElementById("userModal").style.display = "flex";
  }

  function closeModal() {
    document.getElementById("userModal").style.display = "none";
  }

  function getServiceIdForRole(role, existingUser = null) {
    const existingIds = splitServiceIds(existingUser?.id_dichvu || "").filter(
      (serviceId) => serviceId !== "0",
    );
    const movingServiceId = window.adminApi?.MOVING_SERVICE_ID || "12";

    if (role === "provider") {
      if (!existingIds.includes(movingServiceId)) {
        existingIds.push(movingServiceId);
      }
      return existingIds.join(",") || movingServiceId;
    }

    const remainingIds = existingIds.filter(
      (serviceId) => serviceId !== movingServiceId,
    );
    return remainingIds.join(",") || "0";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const id = document.getElementById("userId").value;
    const saveButton = document.getElementById("btnSave");
    const password = document.getElementById("matkhau").value;
    const existingUser =
      state.allUsers.find((item) => String(item.id) === String(id)) || null;

    const payload = {
      hovaten: normalizeText(document.getElementById("hovaten").value),
      sodienthoai: normalizeText(document.getElementById("sodienthoai").value),
      email: normalizeText(document.getElementById("email").value),
      diachi: normalizeText(document.getElementById("diachi").value),
      vaitro: normalizeText(document.getElementById("vaitro").value),
      trangthai: normalizeText(document.getElementById("trangthai").value),
      ten_cong_ty: normalizeText(document.getElementById("ten_cong_ty").value),
      ma_so_thue: normalizeText(document.getElementById("ma_so_thue").value),
      dia_chi_doanh_nghiep: normalizeText(
        document.getElementById("dia_chi_doanh_nghiep").value,
      ),
      loai_phuong_tien: normalizeText(
        document.getElementById("loai_phuong_tien").value,
      ),
      note_admin: normalizeText(document.getElementById("note_admin").value),
      link_avatar: normalizeText(document.getElementById("link_avatar").value),
      link_cccd_truoc: normalizeText(
        document.getElementById("link_cccd_truoc").value,
      ),
      link_cccd_sau: normalizeText(
        document.getElementById("link_cccd_sau").value,
      ),
      updated_at: new Date().toISOString(),
    };

    payload.id_dichvu = getServiceIdForRole(payload.vaitro, existingUser);
    if (password) {
      payload.matkhau = password;
    }

    if (!payload.hovaten || !payload.sodienthoai) {
      showToast("Tên và số điện thoại là bắt buộc.", "danger");
      return;
    }

    if (!id && !password) {
      showToast("Tài khoản mới phải có mật khẩu.", "danger");
      return;
    }

    const originalHtml = saveButton.innerHTML;
    try {
      saveButton.disabled = true;
      saveButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i>Đang lưu...';
      if (id) {
        await window.adminApi.update(window.adminApi.USERS_TABLE, payload, id);
        showToast("Đã cập nhật tài khoản.");
      } else {
        payload.created_date = new Date().toISOString();
        await window.adminApi.insert(window.adminApi.USERS_TABLE, payload);
        showToast("Đã tạo tài khoản mới.");
      }
      closeModal();
      await fetchUsers();
    } catch (error) {
      showToast(error?.message || "Không thể lưu tài khoản.", "danger");
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = originalHtml;
    }
  }

  function applyQuickStatus(status) {
    const select = document.getElementById("trangthai");
    if (select) {
      select.value = status;
    }
  }

  async function quickUpdateStatus(id, status) {
    try {
      await window.adminApi.update(
        window.adminApi.USERS_TABLE,
        {
          trangthai: status,
          updated_at: new Date().toISOString(),
        },
        id,
      );
      showToast(
        status === "0"
          ? "Đã duyệt tài khoản hoạt động."
          : status === "1"
            ? "Đã khóa tài khoản."
            : "Đã cập nhật trạng thái.",
      );
      await fetchUsers();
    } catch (error) {
      showToast(
        error?.message || "Không thể cập nhật trạng thái tài khoản.",
        "danger",
      );
    }
  }

  function handleSearch(value) {
    state.filters.search = normalizeText(value);
    applyFilters();
  }

  function handleFilterChange() {
    state.filters.role = document.getElementById("roleFilter").value;
    state.filters.status = document.getElementById("statusFilter").value;
    state.filters.verification =
      document.getElementById("verificationFilter").value;
    applyFilters();
  }

  function clearFilter(key) {
    state.filters[key] = "";
    if (key === "search") {
      document.getElementById("userSearchInput").value = "";
    }
    if (key === "role") {
      document.getElementById("roleFilter").value = "";
    }
    if (key === "status") {
      document.getElementById("statusFilter").value = "";
    }
    if (key === "verification") {
      document.getElementById("verificationFilter").value = "";
    }
    applyFilters();
  }

  function handleDelete(id) {
    state.userIdToDelete = id;
    const modal = document.getElementById("confirmDeleteUserModal");
    const confirmButton = document.getElementById("confirmDeleteUserBtn");
    confirmButton.onclick = async function () {
      confirmButton.disabled = true;
      confirmButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i>Đang xóa...';
      try {
        await window.adminApi.delete(
          window.adminApi.USERS_TABLE,
          state.userIdToDelete,
        );
        showToast("Đã xóa tài khoản.");
        closeDeleteModal();
        await fetchUsers();
      } catch (error) {
        showToast(error?.message || "Không thể xóa tài khoản.", "danger");
      } finally {
        confirmButton.disabled = false;
        confirmButton.innerHTML =
          '<i class="fas fa-trash-alt"></i>Xóa vĩnh viễn';
      }
    };
    modal.style.display = "flex";
  }

  function closeDeleteModal() {
    state.userIdToDelete = null;
    document.getElementById("confirmDeleteUserModal").style.display = "none";
  }

  async function fetchUsers() {
    const tbody = document.getElementById("userListBody");
    renderSkeleton(tbody, 5);

    try {
      await window.adminApi.ensureNguoidungTable();
      const users = await window.adminApi.listAll(window.adminApi.USERS_TABLE, {
        sort: { id: "desc" },
        limit: 200,
        maxPages: 12,
      });

      state.allUsers = users.map(normalizeUserRecord);
      updateStats();
      applyFilters();
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--danger);">${escapeHtml(error?.message || "Không thể tải dữ liệu người dùng.")}</td></tr>`;
      showToast(
        error?.message || "Không thể tải dữ liệu người dùng.",
        "danger",
      );
    }
  }

  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) {
      return;
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const color = type === "danger" ? "var(--danger)" : "var(--success)";
    const icon =
      type === "danger" ? "fa-circle-exclamation" : "fa-circle-check";
    toast.style.borderLeft = `4px solid ${color}`;
    toast.innerHTML = `<i class="fas ${icon}" style="color:${color};"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["link_avatar", "link_cccd_truoc", "link_cccd_sau"].forEach((fieldId) => {
      const input = document.getElementById(fieldId);
      if (input) {
        input.addEventListener("input", syncPreviewLinks);
      }
    });
    fetchUsers();
  });

  return {
    fetchUsers,
    handleSearch,
    handleFilterChange,
    clearFilter,
    showUserModal,
    closeModal,
    handleSubmit,
    applyQuickStatus,
    quickUpdateStatus,
    handleDelete,
    closeDeleteModal,
  };
})();
