import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const providerVehiclesModule = (function (window, document) {
  if (window.__fastGoProviderVehiclesLoaded) {
    return window.__fastGoProviderVehiclesModule || null;
  }
  window.__fastGoProviderVehiclesLoaded = true;

  const body = document.body;
  if (!body || body.getAttribute("data-page") !== "provider-vehicles") {
    return;
  }

  const root = document.getElementById("provider-vehicles-root");
  if (!root || !store) return;

  function escapeHtml(value) {
    if (typeof core.escapeHtml === "function") {
      return core.escapeHtml(String(value ?? ""));
    }
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getProfileInitial(name) {
    return (
      String(name || "")
        .trim()
        .charAt(0)
        .toUpperCase() || "N"
    );
  }

  function resolveMediaUrl(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (typeof core.getDriveResolvedUrls === "function") {
      const urls = core.getDriveResolvedUrls(normalized);
      return urls.thumbnailUrl || urls.url || "";
    }
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (typeof core.toProjectUrl === "function") {
      return core.toProjectUrl(normalized.replace(/^\/+/, ""));
    }
    return normalized;
  }

  function getStatusMeta(profile) {
    const status = String(profile?.trangthai || "active").trim().toLowerCase();
    if (["pending", "waiting"].includes(status)) {
      return {
        label: "Chờ xác minh",
        className: "is-pending",
        note: "Hồ sơ nhà cung cấp đang chờ xác minh để nhận thêm đơn mới.",
      };
    }
    if (["locked", "inactive", "blocked", "disabled"].includes(status)) {
      return {
        label: "Đang khóa",
        className: "is-locked",
        note: "Tài khoản đang bị khóa trên hệ thống.",
      };
    }
    return {
      label: "Sẵn sàng nhận đơn",
      className: "is-active",
      note: "Danh sách xe đang được dùng để chọn phương tiện phù hợp khi nhận đơn.",
    };
  }

  function getVehicleLabel(value) {
    if (typeof store.getProviderVehicleLabel === "function") {
      return store.getProviderVehicleLabel(value);
    }
    return String(value || "").trim() || "Chưa cập nhật";
  }

  function getVehicleRecordKey(value) {
    if (typeof store.getProviderVehicleRecordKey === "function") {
      return store.getProviderVehicleRecordKey(value);
    }
    if (value && typeof value === "object") {
      return String(value.id || value.local_id || "").trim();
    }
    return String(value || "").trim();
  }

  function buildVehicleSelectOptions(catalog, selectedValue) {
    const selectedKey =
      typeof store.normalizeVehicleKey === "function"
        ? store.normalizeVehicleKey(selectedValue)
        : String(selectedValue || "").trim().toLowerCase();
    return (Array.isArray(catalog) ? catalog : [])
      .map((item) => {
        const key = String(item?.key || "").trim();
        const label = String(item?.label || "").trim();
        if (!key || !label) return "";
        return `<option value="${escapeHtml(key)}" ${
          key === selectedKey ? "selected" : ""
        }>${escapeHtml(label)}</option>`;
      })
      .filter(Boolean)
      .join("");
  }

  function renderProviderVehicleCards(vehicles) {
    const list = Array.isArray(vehicles) ? vehicles : [];
    if (!list.length) {
      return `
        <div class="customer-empty">
          Chưa có xe nào cho NCC này. Hãy thêm ít nhất 1 xe để kiểm soát phương tiện xử lý đơn.
        </div>
      `;
    }

    return list
      .map((vehicle) => {
        const isActive = vehicle.trang_thai === "hoat_dong";
        const vehicleTitle = vehicle.ten_hien_thi || getVehicleLabel(vehicle.loai_xe);
        const vehicleKey = getVehicleRecordKey(vehicle);
        return `
          <article class="customer-profile-card vehicle-management-card">
            <div class="vehicle-management-card-head">
              <div>
                <p class="vehicle-management-card-label">${escapeHtml(getVehicleLabel(vehicle.loai_xe))}</p>
                <h3 class="vehicle-management-card-plate">${escapeHtml(vehicle.bien_so || "Chưa có biển số")}</h3>
              </div>
              <div class="customer-active-filters vehicle-management-card-badges">
                ${
                  Number(vehicle.la_mac_dinh || 0) === 1
                    ? '<span class="customer-chip customer-chip-muted">Mặc định</span>'
                    : ""
                }
                <span class="customer-chip customer-chip-muted">${escapeHtml(isActive ? "Hoạt động" : "Tạm ngưng")}</span>
              </div>
            </div>
            <div class="customer-profile-fact-list vehicle-management-facts">
              <div><span>Tên gợi nhớ</span><strong>${escapeHtml(vehicleTitle)}</strong></div>
              <div><span>Loại xe</span><strong>${escapeHtml(getVehicleLabel(vehicle.loai_xe))}</strong></div>
              <div><span>Trạng thái</span><strong>${escapeHtml(isActive ? "Hoạt động" : "Tạm ngưng")}</strong></div>
              <div><span>Ghi chú</span><strong>${escapeHtml(vehicle.ghi_chu || "--")}</strong></div>
            </div>
            <div class="customer-inline-actions vehicle-management-actions">
              <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-vehicle-action="edit" data-vehicle-id="${escapeHtml(vehicleKey)}">
                Sửa
              </button>
              <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-vehicle-action="default" data-vehicle-id="${escapeHtml(vehicleKey)}">
                Đặt mặc định
              </button>
              <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-vehicle-action="toggle-status" data-vehicle-id="${escapeHtml(vehicleKey)}" data-next-status="${escapeHtml(isActive ? "tam_ngung" : "hoat_dong")}">
                ${isActive ? "Tạm ngưng" : "Kích hoạt"}
              </button>
              <button type="button" class="customer-btn customer-btn-danger customer-btn-sm" data-vehicle-action="delete" data-vehicle-id="${escapeHtml(vehicleKey)}">
                Xóa
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderPage(data) {
    if (!data?.profile) {
      store.clearAuthSession?.();
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const profile = data.profile;
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    const vehicleCatalog = Array.isArray(data.vehicleCatalog) ? data.vehicleCatalog : [];
    const primaryVehicle =
      data.primaryVehicle ||
      (typeof store.pickPrimaryProviderVehicle === "function"
        ? store.pickPrimaryProviderVehicle(vehicles)
        : vehicles[0] || null);
    const displayName = store.getDisplayName(profile);
    const phone = String(profile.sodienthoai || "").trim();
    const avatarUrl = resolveMediaUrl(profile.link_avatar);
    const statusMeta = getStatusMeta(profile);
    const initial = getProfileInitial(displayName);
    const activeVehicles = vehicles.filter((item) => item?.trang_thai === "hoat_dong").length;
    const pausedVehicles = Math.max(vehicles.length - activeVehicles, 0);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-portal-profile customer-portal-profile-rich">
          <div class="customer-profile-hero">
            <div class="customer-profile-hero-main">
              <div class="customer-profile-avatar-wrapper customer-profile-avatar-wrapper-rich">
                ${
                  avatarUrl
                    ? `<img class="customer-profile-avatar-image" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" />`
                    : `<div class="customer-profile-avatar-large">${escapeHtml(initial)}</div>`
                }
              </div>
              <div class="customer-profile-hero-info">
                <p class="customer-profile-eyebrow">Quản lý xe xử lý đơn</p>
                <h2>${escapeHtml(displayName)}</h2>
              </div>
            </div>
            <div class="customer-profile-hero-actions">
              <span class="customer-profile-status-badge ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
              <p class="customer-profile-hero-note">${escapeHtml(statusMeta.note)}</p>
            </div>
          </div>

          <div class="vehicle-management-summary">
            <article class="vehicle-management-metric">
              <span>Tổng số xe</span>
              <strong>${escapeHtml(String(vehicles.length))}</strong>
            </article>
            <article class="vehicle-management-metric">
              <span>Xe hoạt động</span>
              <strong>${escapeHtml(String(activeVehicles))}</strong>
            </article>
            <article class="vehicle-management-metric">
              <span>Xe tạm ngưng</span>
              <strong>${escapeHtml(String(pausedVehicles))}</strong>
            </article>
            <article class="vehicle-management-metric">
              <span>Xe mặc định</span>
              <strong>${primaryVehicle ? "1" : "0"}</strong>
            </article>
          </div>

          <div class="vehicle-management-grid">
            <div class="vehicle-management-form-column">
              <article class="customer-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-truck-fast"></i>
                  <h3>Quản lý xe xử lý đơn</h3>
                </div>
                <p class="customer-panel-subtext">
                  Thêm các xe bạn dùng để xử lý đơn chuyển dọn. Xe mặc định sẽ được ưu tiên khi nhận đơn.
                </p>
                <div id="provider-vehicle-form" class="customer-form-stack">
                  <input type="hidden" name="vehicle_id" value="" />
                  <div class="customer-profile-form-grid">
                    <div class="customer-form-group">
                      <span>Tên gợi nhớ</span>
                      <div class="customer-form-field">
                        <i class="fas fa-tag"></i>
                        <input name="ten_hien_thi" required placeholder="Ví dụ: Xe tải chính, Xe dự phòng..." />
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Biển số xe</span>
                      <div class="customer-form-field">
                        <i class="fas fa-id-card"></i>
                        <input name="bien_so" required placeholder="Ví dụ: 51H-123.45" />
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Loại xe</span>
                      <div class="customer-form-field">
                        <i class="fas fa-truck"></i>
                        <select name="loai_xe" required>
                          ${buildVehicleSelectOptions(vehicleCatalog, primaryVehicle?.loai_xe || profile.loai_phuong_tien || profile.vehicle_type || "")}
                        </select>
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Trạng thái</span>
                      <div class="customer-form-field">
                        <i class="fas fa-signal"></i>
                        <select name="trang_thai">
                          <option value="hoat_dong">Hoạt động</option>
                          <option value="tam_ngung">Tạm ngưng</option>
                        </select>
                      </div>
                    </div>
                    <div class="customer-form-group customer-form-group-wide">
                      <span>Ghi chú</span>
                      <div class="customer-form-field">
                        <i class="fas fa-note-sticky"></i>
                        <input name="ghi_chu" placeholder="Tùy chọn: xe đường dài, xe nội thành, ca đêm..." />
                      </div>
                    </div>
                  </div>
                  <label class="customer-vehicle-form-default-toggle">
                    <input type="checkbox" name="la_mac_dinh" value="1" ${vehicles.length ? "" : "checked"} />
                    Đặt làm xe mặc định
                  </label>
                  <div class="customer-inline-actions">
                    <button class="customer-btn customer-btn-primary" type="button" id="provider-vehicle-submit-btn">
                      <i class="fas fa-plus"></i> Thêm xe
                    </button>
                    <button class="customer-btn customer-btn-ghost" type="button" id="provider-vehicle-cancel-btn" hidden>
                      Hủy sửa
                    </button>
                  </div>
                </div>
                <p class="customer-form-helper customer-form-helper-compact">
                  <i class="fas fa-circle-info"></i> Bấm <strong>Sửa</strong> ở danh sách bên phải để nạp lại dữ liệu vào biểu mẫu này.
                </p>
              </article>
            </div>
            <div class="vehicle-management-list-column">
              <article class="customer-profile-card vehicle-management-list-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-list-check"></i>
                  <h3>Danh sách xe đã khai báo</h3>
                </div>
                <div class="vehicle-management-toolbar">
                  <label class="vehicle-management-search">
                    <i class="fas fa-search"></i>
                    <input id="provider-vehicle-search" type="search" placeholder="Tìm theo biển số hoặc tên gợi nhớ" />
                  </label>
                  <label class="vehicle-management-filter">
                    <span>Lọc</span>
                    <select id="provider-vehicle-status-filter">
                      <option value="all">Tất cả</option>
                      <option value="hoat_dong">Hoạt động</option>
                      <option value="tam_ngung">Tạm ngưng</option>
                      <option value="default">Xe mặc định</option>
                    </select>
                  </label>
                </div>
                <div class="vehicle-management-list-meta">
                  <strong id="provider-vehicle-list-count">${escapeHtml(String(vehicles.length))} xe</strong>
                </div>
                <div class="vehicle-management-list-shell">
                  <div id="provider-vehicle-list" class="customer-form-stack vehicle-management-list">
                    ${renderProviderVehicleCards(vehicles)}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    `;

    const vehicleForm = root.querySelector("#provider-vehicle-form");
    const vehicleList = root.querySelector("#provider-vehicle-list");
    if (!vehicleForm || !vehicleList) return;

    const vehicleIndex = new Map(vehicles.map((item) => [getVehicleRecordKey(item), item]));
    const vehicleIdInput = vehicleForm.querySelector('input[name="vehicle_id"]');
    const vehicleNameInput = vehicleForm.querySelector('input[name="ten_hien_thi"]');
    const vehiclePlateInput = vehicleForm.querySelector('input[name="bien_so"]');
    const vehicleTypeSelect = vehicleForm.querySelector('select[name="loai_xe"]');
    const vehicleStatusSelect = vehicleForm.querySelector('select[name="trang_thai"]');
    const vehicleNoteInput = vehicleForm.querySelector('input[name="ghi_chu"]');
    const vehicleDefaultInput = vehicleForm.querySelector('input[name="la_mac_dinh"]');
    const vehicleSubmitButton = root.querySelector("#provider-vehicle-submit-btn");
    const vehicleCancelButton = root.querySelector("#provider-vehicle-cancel-btn");
    const vehicleSearchInput = root.querySelector("#provider-vehicle-search");
    const vehicleStatusFilter = root.querySelector("#provider-vehicle-status-filter");
    const vehicleCountNode = root.querySelector("#provider-vehicle-list-count");

    const applyVehicleFilters = () => {
      const searchText = String(vehicleSearchInput?.value || "").trim().toLowerCase();
      const statusFilter = String(vehicleStatusFilter?.value || "all").trim();
      const filteredVehicles = vehicles.filter((vehicle) => {
        const matchSearch =
          !searchText ||
          [
            vehicle.ten_hien_thi,
            vehicle.bien_so,
            vehicle.ghi_chu,
            getVehicleLabel(vehicle.loai_xe),
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchText);
        let matchStatus = true;
        if (statusFilter === "hoat_dong" || statusFilter === "tam_ngung") {
          matchStatus = String(vehicle.trang_thai || "") === statusFilter;
        } else if (statusFilter === "default") {
          matchStatus = Number(vehicle.la_mac_dinh || 0) === 1;
        }
        return matchSearch && matchStatus;
      });
      if (vehicleCountNode) {
        vehicleCountNode.textContent =
          filteredVehicles.length === vehicles.length
            ? `${vehicles.length} xe`
            : `${filteredVehicles.length}/${vehicles.length} xe`;
      }
      vehicleList.innerHTML = renderProviderVehicleCards(filteredVehicles);
    };

    const resetVehicleForm = () => {
      if (vehicleIdInput) vehicleIdInput.value = "";
      if (vehicleNameInput) vehicleNameInput.value = "";
      if (vehiclePlateInput) vehiclePlateInput.value = "";
      if (vehicleTypeSelect) {
        vehicleTypeSelect.value =
          primaryVehicle?.loai_xe ||
          profile.loai_phuong_tien ||
          profile.vehicle_type ||
          vehicleCatalog[0]?.key ||
          "";
      }
      if (vehicleStatusSelect) vehicleStatusSelect.value = "hoat_dong";
      if (vehicleNoteInput) vehicleNoteInput.value = "";
      if (vehicleDefaultInput) vehicleDefaultInput.checked = vehicles.length === 0;
      if (vehicleSubmitButton) {
        vehicleSubmitButton.disabled = false;
        vehicleSubmitButton.innerHTML = '<i class="fas fa-plus"></i> Thêm xe';
      }
      if (vehicleCancelButton) vehicleCancelButton.hidden = true;
    };

    const reloadPage = async () => {
      const dashboard = await store.fetchDashboard?.();
      const nextProfile = dashboard?.profile || null;
      const nextVehicles =
        nextProfile && typeof store.listProviderVehicles === "function"
          ? store.listProviderVehicles(nextProfile.id)
          : [];
      const nextCatalog =
        typeof store.listProviderVehicleCatalog === "function"
          ? await store.listProviderVehicleCatalog()
          : vehicleCatalog;
      renderPage({
        profile: nextProfile,
        stats: dashboard?.stats || {},
        vehicles: nextVehicles,
        primaryVehicle:
          typeof store.pickPrimaryProviderVehicle === "function"
            ? store.pickPrimaryProviderVehicle(nextVehicles)
            : nextVehicles[0] || null,
        vehicleCatalog: nextCatalog,
      });
    };

    resetVehicleForm();
    applyVehicleFilters();
    vehicleSearchInput?.addEventListener("input", applyVehicleFilters);
    vehicleStatusFilter?.addEventListener("change", applyVehicleFilters);

    vehicleSubmitButton?.addEventListener("click", async function () {
      if (
        (vehicleNameInput && typeof vehicleNameInput.reportValidity === "function" && !vehicleNameInput.reportValidity()) ||
        (vehiclePlateInput && typeof vehiclePlateInput.reportValidity === "function" && !vehiclePlateInput.reportValidity()) ||
        (vehicleTypeSelect && typeof vehicleTypeSelect.reportValidity === "function" && !vehicleTypeSelect.reportValidity())
      ) {
        return;
      }

      const payload = {
        ten_hien_thi: String(vehicleNameInput?.value || "").trim(),
        bien_so: String(vehiclePlateInput?.value || "").trim(),
        loai_xe: String(vehicleTypeSelect?.value || "").trim(),
        trang_thai: String(vehicleStatusSelect?.value || "hoat_dong").trim(),
        la_mac_dinh: vehicleDefaultInput?.checked ? "1" : "",
        ghi_chu: String(vehicleNoteInput?.value || "").trim(),
      };

      try {
        if (vehicleSubmitButton) {
          vehicleSubmitButton.disabled = true;
          vehicleSubmitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu xe';
        }
        if (vehicleIdInput?.value) {
          await store.updateProviderVehicle?.(vehicleIdInput.value, profile.id, payload);
        } else {
          await store.createProviderVehicle?.(profile.id, payload);
        }
        core.notify?.(
          vehicleIdInput?.value ? "Đã cập nhật xe." : "Đã thêm xe mới.",
          "success",
        );
        await reloadPage();
      } catch (error) {
        console.error("Cannot save moving provider vehicle:", error);
        core.notify?.(error?.message || "Không thể lưu xe lúc này.", "error");
        if (vehicleSubmitButton) {
          vehicleSubmitButton.disabled = false;
          vehicleSubmitButton.innerHTML = vehicleIdInput?.value
            ? '<i class="fas fa-save"></i> Cập nhật xe'
            : '<i class="fas fa-plus"></i> Thêm xe';
        }
      }
    });

    vehicleCancelButton?.addEventListener("click", resetVehicleForm);

    vehicleList.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-vehicle-action]");
      if (!button) return;
      const vehicleId = String(button.getAttribute("data-vehicle-id") || "");
      const actionName = String(button.getAttribute("data-vehicle-action") || "");
      const vehicle = vehicleIndex.get(vehicleId);
      if (!vehicle) {
        core.notify?.("Không tìm thấy xe để xử lý.", "error");
        return;
      }

      if (actionName === "edit") {
        if (vehicleIdInput) vehicleIdInput.value = getVehicleRecordKey(vehicle);
        if (vehicleNameInput) vehicleNameInput.value = vehicle.ten_hien_thi || "";
        if (vehiclePlateInput) vehiclePlateInput.value = vehicle.bien_so || "";
        if (vehicleTypeSelect) vehicleTypeSelect.value = vehicle.loai_xe || "";
        if (vehicleStatusSelect) vehicleStatusSelect.value = vehicle.trang_thai || "hoat_dong";
        if (vehicleNoteInput) vehicleNoteInput.value = vehicle.ghi_chu || "";
        if (vehicleDefaultInput) vehicleDefaultInput.checked = Number(vehicle.la_mac_dinh || 0) === 1;
        if (vehicleSubmitButton) {
          vehicleSubmitButton.innerHTML = '<i class="fas fa-save"></i> Cập nhật xe';
        }
        if (vehicleCancelButton) vehicleCancelButton.hidden = false;
        vehicleNameInput?.focus();
        return;
      }

      try {
        if (actionName === "delete") {
          const confirmed = window.confirm(`Xóa xe "${vehicle.ten_hien_thi}" khỏi danh sách xử lý đơn?`);
          if (!confirmed) return;
          await store.deleteProviderVehicle?.(getVehicleRecordKey(vehicle), profile.id);
          core.notify?.("Đã xóa xe.", "success");
          await reloadPage();
          return;
        }
        if (actionName === "default") {
          await store.updateProviderVehicle?.(getVehicleRecordKey(vehicle), profile.id, {
            la_mac_dinh: 1,
          });
          core.notify?.("Đã đặt xe mặc định.", "success");
          await reloadPage();
          return;
        }
        if (actionName === "toggle-status") {
          await store.updateProviderVehicle?.(getVehicleRecordKey(vehicle), profile.id, {
            trang_thai: button.getAttribute("data-next-status") || "hoat_dong",
          });
          core.notify?.("Đã cập nhật trạng thái xe.", "success");
          await reloadPage();
        }
      } catch (error) {
        console.error("Cannot update moving provider vehicle action:", error);
        core.notify?.(error?.message || "Không thể xử lý xe lúc này.", "error");
      }
    });
  }

  (async function bootstrapProviderVehicles() {
    try {
      const dashboard = await store.fetchDashboard?.();
      const profile = dashboard?.profile || null;
      const vehicles =
        profile && typeof store.listProviderVehicles === "function"
          ? store.listProviderVehicles(profile.id)
          : [];
      const vehicleCatalog =
        typeof store.listProviderVehicleCatalog === "function"
          ? await store.listProviderVehicleCatalog()
          : [];
      renderPage({
        profile,
        vehicles,
        primaryVehicle:
          typeof store.pickPrimaryProviderVehicle === "function"
            ? store.pickPrimaryProviderVehicle(vehicles)
            : vehicles[0] || null,
        vehicleCatalog,
      });
    } catch (error) {
      console.error("Cannot load provider vehicles store:", error);
      renderPage(null);
    }
  })();

  const moduleApi = {};
  window.__fastGoProviderVehiclesModule = moduleApi;
  return moduleApi;
})(window, document);

export default providerVehiclesModule;
