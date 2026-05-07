import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const providerProfileModule = (function (window, document) {
  if (window.__fastGoProviderProfileLoaded) {
    return window.__fastGoProviderProfileModule || null;
  }
  window.__fastGoProviderProfileLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "provider-profile") {
    return;
  }

  const root = document.getElementById("provider-profile-root");
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

  function formatNumber(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toLocaleString("vi-VN") : "0";
  }

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function" ? core.toProjectUrl(path) : path;
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
    const status = String(profile?.trangthai || "active")
      .trim()
      .toLowerCase();
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
      note: "Hồ sơ đang hoạt động bình thường trong khu nhà cung cấp chuyển dọn.",
    };
  }

  function renderProvidedServicesCard(profile) {
    const labels = Array.isArray(store.getProvidedServiceLabels?.(profile))
      ? store.getProvidedServiceLabels(profile)
      : [];

    return `
      <article class="customer-profile-card">
        <div class="customer-profile-card-head">
          <i class="fas fa-briefcase"></i>
          <h3>Dịch vụ có thể cung cấp</h3>
        </div>
        <div class="customer-profile-fact-list">
          <div>
            <span>Dịch vụ đang bật</span>
            <strong>${escapeHtml(labels.join(", ") || "Chưa đăng ký dịch vụ cung cấp")}</strong>
          </div>
        </div>
      </article>
    `;
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
        : String(selectedValue || "")
            .trim()
            .toLowerCase();
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
        return `
          <article class="customer-profile-card">
            <div class="customer-profile-card-head">
              <i class="fas fa-truck-fast"></i>
              <h3>${escapeHtml(vehicle.ten_hien_thi || getVehicleLabel(vehicle.loai_xe))}</h3>
            </div>
            <div class="customer-active-filters">
              <span class="customer-chip customer-chip-muted">${escapeHtml(getVehicleLabel(vehicle.loai_xe))}</span>
              <span class="customer-chip customer-chip-muted">${escapeHtml(vehicle.bien_so || "Chưa có biển số")}</span>
              <span class="customer-chip customer-chip-muted">${escapeHtml(isActive ? "Hoạt động" : "Tạm ngưng")}</span>
              ${
                Number(vehicle.la_mac_dinh || 0) === 1
                  ? '<span class="customer-chip customer-chip-muted">Mặc định</span>'
                  : ""
              }
            </div>
            <div class="customer-profile-fact-list">
              <div><span>Biển số</span><strong>${escapeHtml(vehicle.bien_so || "--")}</strong></div>
              <div><span>Loại xe</span><strong>${escapeHtml(getVehicleLabel(vehicle.loai_xe))}</strong></div>
              <div><span>Trạng thái</span><strong>${escapeHtml(isActive ? "Hoạt động" : "Tạm ngưng")}</strong></div>
              <div><span>Ghi chú</span><strong>${escapeHtml(vehicle.ghi_chu || "--")}</strong></div>
            </div>
            <div class="customer-inline-actions">
              <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-vehicle-action="edit" data-vehicle-id="${escapeHtml(getVehicleRecordKey(vehicle))}">
                Sửa
              </button>
              <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-vehicle-action="default" data-vehicle-id="${escapeHtml(getVehicleRecordKey(vehicle))}">
                Đặt mặc định
              </button>
              <button type="button" class="customer-btn customer-btn-ghost customer-btn-sm" data-vehicle-action="toggle-status" data-vehicle-id="${escapeHtml(getVehicleRecordKey(vehicle))}" data-next-status="${escapeHtml(isActive ? "tam_ngung" : "hoat_dong")}">
                ${isActive ? "Tạm ngưng" : "Kích hoạt"}
              </button>
              <button type="button" class="customer-btn customer-btn-danger customer-btn-sm" data-vehicle-action="delete" data-vehicle-id="${escapeHtml(getVehicleRecordKey(vehicle))}">
                Xóa
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindMediaPreview(inputId, previewId, emptyId) {
    const input = root.querySelector(`#${inputId}`);
    const preview = root.querySelector(`#${previewId}`);
    const emptyState = root.querySelector(`#${emptyId}`);
    if (!input || !preview) return;

    const showEmptyState = () => {
      preview.hidden = true;
      if (emptyState) emptyState.hidden = false;
    };

    preview.addEventListener("error", showEmptyState);

    if (
      preview.complete &&
      preview.getAttribute("src") &&
      !preview.naturalWidth
    ) {
      showEmptyState();
    }

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
      if (emptyState) emptyState.hidden = true;
    });
  }

  function showFeedback(target, type, message) {
    if (!target) return;
    const stateClass =
      type === "error" ? "is-error" : type === "warning" ? "is-warning" : "";
    target.innerHTML = `
      <div class="customer-state-card ${stateClass}">
        <p class="customer-panel-subtext">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderProfile(data) {
    if (!data?.profile) {
      store.clearAuthSession?.();
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const canUseProviderPortal =
      store.hasProviderCapability?.(data.profile || store.readIdentity?.()) ||
      false;
    if (!canUseProviderPortal) {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const identity = data.profile;
    const stats = data.stats || {};
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    const primaryVehicle =
      data.primaryVehicle ||
      (typeof store.pickPrimaryProviderVehicle === "function"
        ? store.pickPrimaryProviderVehicle(vehicles)
        : vehicles[0] || null);
    const vehicleCatalog = Array.isArray(data.vehicleCatalog)
      ? data.vehicleCatalog
      : [];
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.sodienthoai || "").trim();
    const email = String(identity.email || "").trim();
    const address = String(identity.diachi || identity.dia_chi || "").trim();
    const companyName = String(
      identity.ten_cong_ty || identity.company_name || "",
    ).trim();
    const taxCode = String(
      identity.ma_so_thue || identity.tax_code || "",
    ).trim();
    const businessAddress = String(
      identity.dia_chi_doanh_nghiep || identity.diachidonvi || "",
    ).trim();
    const vehicleType = String(
      primaryVehicle?.loai_xe ||
        identity.loai_phuong_tien ||
        identity.vehicle_type ||
        "",
    ).trim();
    const defaultVehicleText = primaryVehicle?.ten_hien_thi || "Chưa cấu hình";
    const activeVehicles = vehicles.filter(
      (item) => item?.trang_thai === "hoat_dong",
    ).length;
    const pausedVehicles = Math.max(vehicles.length - activeVehicles, 0);
    const avatarUrl = resolveMediaUrl(identity.link_avatar);
    const cccdFrontUrl = resolveMediaUrl(identity.link_cccd_truoc);
    const cccdBackUrl = resolveMediaUrl(identity.link_cccd_sau);
    const createdAtLabel = formatDateTime(
      identity.created_at || identity.updated_at || "",
    );
    const statusMeta = getStatusMeta(identity);
    const initial = getProfileInitial(displayName);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-portal-profile customer-portal-profile-rich">
          <div class="customer-profile-hero customer-profile-hero-rich">
            <div class="customer-profile-hero-main">
              <div class="customer-profile-avatar-wrapper customer-profile-avatar-wrapper-rich">
                ${
                  avatarUrl
                    ? `<img class="customer-profile-avatar-image" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" />`
                    : `<div class="customer-profile-avatar-large">${escapeHtml(initial)}</div>`
                }
                <label class="customer-profile-avatar-action" for="provider-avatar-file" aria-label="Thay đổi ảnh đại diện">
                  <i class="fas fa-camera"></i>
                </label>
              </div>
              <div class="customer-profile-hero-info">
                <p class="customer-profile-eyebrow">Hồ sơ cá nhân</p>
                <h2>${escapeHtml(displayName)}</h2>
                <div class="customer-profile-meta-list">
                  <span><i class="fas fa-clock"></i> Đồng bộ: ${escapeHtml(createdAtLabel)}</span>
                </div>
              </div>
            </div>
            <div class="customer-profile-hero-actions">
              <span class="customer-profile-status-badge ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
              <p class="customer-profile-hero-note">${escapeHtml(statusMeta.note)}</p>
              <button class="customer-btn customer-btn-primary" type="submit" form="provider-profile-form" id="provider-profile-submit-btn">
                <i class="fas fa-save"></i> Lưu thay đổi
              </button>
            </div>
          </div>

          <div class="customer-profile-dashboard-grid">
            <div class="customer-profile-main-column">
              <form id="provider-profile-form" class="customer-profile-form" enctype="multipart/form-data">
                <article class="customer-profile-card">
                  <div class="customer-profile-card-head">
                    <i class="fas fa-id-card"></i>
                    <h3>Thông tin hành nghề</h3>
                  </div>
                  <div id="provider-profile-feedback"></div>
                  <input type="hidden" name="loai_phuong_tien" value="${escapeHtml(vehicleType)}" />
                  <div class="customer-profile-form-grid">
                    <div class="customer-form-group">
                      <span>Họ và tên</span>
                      <div class="customer-form-field">
                        <i class="fas fa-user"></i>
                        <input name="hovaten" value="${escapeHtml(displayName)}" required />
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Số điện thoại tài khoản</span>
                      <div class="customer-form-field">
                        <i class="fas fa-phone"></i>
                        <input name="sodienthoai" value="${escapeHtml(phone)}" readonly disabled aria-readonly="true" />
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Email</span>
                      <div class="customer-form-field">
                        <i class="fas fa-envelope"></i>
                        <input name="email" type="email" value="${escapeHtml(email)}" placeholder="provider@example.com" />
                      </div>
                    </div>
                    <div class="customer-form-group customer-form-group-wide">
                      <span>Địa chỉ / Khu vực hoạt động</span>
                      <div class="customer-form-field">
                        <i class="fas fa-location-dot"></i>
                        <input name="diachi" value="${escapeHtml(address)}" placeholder="Khu vực hoạt động, địa chỉ liên hệ..." />
                      </div>
                    </div>
                  </div>
                  <p class="customer-form-helper customer-form-helper-compact">
                    <i class="fas fa-circle-info"></i> Số điện thoại là định danh tài khoản nhà cung cấp, hiện không thể chỉnh sửa tại đây.
                  </p>
                </article>

                <article class="customer-profile-card">
                  <div class="customer-profile-card-head">
                    <i class="fas fa-fingerprint"></i>
                    <h3>Xác minh hồ sơ</h3>
                  </div>
                  <div class="customer-profile-media-grid customer-profile-media-grid-identity">
                    <article class="customer-profile-media-card customer-profile-media-card-avatar">
                      <div class="customer-profile-media-head">
                        <strong>Ảnh đại diện</strong>
                        <span>Nhận diện</span>
                      </div>
                      <div class="customer-profile-media-preview customer-profile-media-preview-avatar">
                        <img id="provider-avatar-preview" src="${escapeHtml(avatarUrl || "")}" alt="Ảnh đại diện" ${avatarUrl ? "" : "hidden"} />
                        <div id="provider-avatar-empty" class="customer-profile-media-empty" ${avatarUrl ? "hidden" : ""}>Chưa có ảnh đại diện</div>
                      </div>
                      <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                        <input id="provider-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                        <i class="fas fa-camera"></i> Chọn ảnh
                      </label>
                    </article>

                    <article class="customer-profile-media-card">
                      <div class="customer-profile-media-head">
                        <strong>CCCD mặt trước</strong>
                        <span>Xác minh</span>
                      </div>
                      <div class="customer-profile-media-preview">
                        <img id="provider-cccd-front-preview" src="${escapeHtml(cccdFrontUrl || "")}" alt="CCCD mặt trước" ${cccdFrontUrl ? "" : "hidden"} />
                        <div id="provider-cccd-front-empty" class="customer-profile-media-empty" ${cccdFrontUrl ? "hidden" : ""}>
                          <i class="fas fa-cloud-arrow-up"></i>
                          <span>Tải lên mặt trước</span>
                        </div>
                      </div>
                      <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                        <input id="provider-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                        <i class="fas fa-id-card"></i> Chọn ảnh
                      </label>
                    </article>

                    <article class="customer-profile-media-card">
                      <div class="customer-profile-media-head">
                        <strong>CCCD mặt sau</strong>
                        <span>Xác minh</span>
                      </div>
                      <div class="customer-profile-media-preview">
                        <img id="provider-cccd-back-preview" src="${escapeHtml(cccdBackUrl || "")}" alt="CCCD mặt sau" ${cccdBackUrl ? "" : "hidden"} />
                        <div id="provider-cccd-back-empty" class="customer-profile-media-empty" ${cccdBackUrl ? "hidden" : ""}>
                          <i class="fas fa-cloud-arrow-up"></i>
                          <span>Tải lên mặt sau</span>
                        </div>
                      </div>
                      <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                        <input id="provider-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
                        <i class="fas fa-id-card-clip"></i> Chọn ảnh
                      </label>
                    </article>
                  </div>
                </article>

              </form>
                <article class="customer-profile-card">
                  <div class="customer-profile-card-head">
                    <i class="fas fa-truck-fast"></i>
                    <h3>Quản lý xe xử lý đơn</h3>
                  </div>
                  <p class="customer-panel-subtext">
                    Danh sách xe xử lý đơn đã được tách sang trang riêng để bạn dễ quản lý, chỉnh trạng thái và chọn xe mặc định.
                  </p>
                  <div class="customer-inline-actions">
                    <a class="customer-btn customer-btn-primary" href="${escapeHtml(getProjectUrl("nha-cung-cap/quan-ly-xe-chuyendon.html"))}">
                      <i class="fas fa-truck-fast"></i> Mở trang quản lý xe
                    </a>
                  </div>
                </article>
            </div>

            <aside class="customer-profile-side-column">
              <article class="customer-profile-card customer-profile-stats-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-chart-line"></i>
                  <h3>Thống kê vận hành</h3>
                </div>
                <div class="customer-profile-stat-list">
                  <div><span>Tổng yêu cầu</span><strong>${escapeHtml(formatNumber(stats.total || 0))}</strong></div>
                  <div><span>Đang xử lý</span><strong>${escapeHtml(formatNumber(stats.active_count || stats.open_count || 0))}</strong></div>
                  <div><span>Hoàn tất</span><strong>${escapeHtml(formatNumber(stats.confirmed_count || stats.completed_count || 0))}</strong></div>
                </div>
              </article>

              <article class="customer-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-route"></i>
                  <h3>Tình trạng xe</h3>
                </div>
              <div class="customer-profile-fact-list">
                  <div><span>Xe mặc định</span><strong>${escapeHtml(defaultVehicleText)}</strong></div>
                  <div><span>Tổng số xe</span><strong>${escapeHtml(String(vehicles.length))}</strong></div>
                  <div><span>Xe hoạt động</span><strong>${escapeHtml(String(activeVehicles))}</strong></div>
                  <div><span>Xe tạm ngưng</span><strong>${escapeHtml(String(pausedVehicles))}</strong></div>
                </div>
              </article>

              ${renderProvidedServicesCard(identity)}

              <article class="customer-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-building"></i>
                  <h3>Thông tin doanh nghiệp</h3>
                </div>
                <div class="customer-form-stack">
                  <div class="customer-form-group">
                    <span>Tên doanh nghiệp</span>
                    <div class="customer-form-field">
                      <i class="fas fa-building"></i>
                      <input form="provider-profile-form" name="ten_cong_ty" value="${escapeHtml(companyName)}" placeholder="Tên doanh nghiệp hoặc công ty" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Mã số thuế</span>
                    <div class="customer-form-field">
                      <i class="fas fa-receipt"></i>
                      <input form="provider-profile-form" name="ma_so_thue" value="${escapeHtml(taxCode)}" placeholder="Mã số thuế" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Địa chỉ doanh nghiệp</span>
                    <div class="customer-form-field">
                      <i class="fas fa-map-location-dot"></i>
                      <input form="provider-profile-form" name="dia_chi_doanh_nghiep" value="${escapeHtml(businessAddress)}" placeholder="Địa chỉ doanh nghiệp hoặc kho bãi" />
                    </div>
                  </div>
                </div>
              </article>

              <article class="customer-profile-card customer-profile-security-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-shield-halved"></i>
                  <h3>Bảo mật</h3>
                </div>
                <div id="provider-password-feedback"></div>
                <form id="provider-password-form" class="customer-form-stack">
                  <div class="customer-form-group">
                    <span>Mật khẩu hiện tại</span>
                    <div class="customer-form-field">
                      <i class="fas fa-key"></i>
                      <input name="current_password" type="password" autocomplete="current-password" required placeholder="••••••••" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Mật khẩu mới</span>
                    <div class="customer-form-field">
                      <i class="fas fa-lock"></i>
                      <input name="new_password" type="password" minlength="8" autocomplete="new-password" required placeholder="Nhập mật khẩu mới" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Xác nhận mật khẩu</span>
                    <div class="customer-form-field">
                      <i class="fas fa-lock-open"></i>
                      <input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required placeholder="Cùng mật khẩu mới" />
                    </div>
                  </div>
                  <p class="customer-form-helper"><i class="fas fa-circle-info"></i> Mật khẩu mới cần ít nhất 8 ký tự.</p>
                  <button class="customer-btn customer-btn-ghost customer-profile-full-btn" type="submit">
                    Cập nhật mật khẩu
                  </button>
                </form>
              </article>
            </aside>
          </div>
        </section>
      </div>
    `;

    const profileForm = root.querySelector("#provider-profile-form");
    const profileFeedback = root.querySelector("#provider-profile-feedback");
    const vehicleForm = root.querySelector("#provider-vehicle-form");
    const vehicleList = root.querySelector("#provider-vehicle-list");
    const passwordForm = root.querySelector("#provider-password-form");
    const passwordFeedback = root.querySelector("#provider-password-feedback");

    bindMediaPreview(
      "provider-avatar-file",
      "provider-avatar-preview",
      "provider-avatar-empty",
    );
    bindMediaPreview(
      "provider-cccd-front-file",
      "provider-cccd-front-preview",
      "provider-cccd-front-empty",
    );
    bindMediaPreview(
      "provider-cccd-back-file",
      "provider-cccd-back-preview",
      "provider-cccd-back-empty",
    );

    const reloadProfileView = async () => {
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
      renderProfile({
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

    if (vehicleForm && vehicleList) {
      const vehicleIndex = new Map(
        vehicles.map((item) => [getVehicleRecordKey(item), item]),
      );
      const vehicleIdInput = vehicleForm.querySelector(
        'input[name="vehicle_id"]',
      );
      const vehicleNameInput = vehicleForm.querySelector(
        'input[name="ten_hien_thi"]',
      );
      const vehiclePlateInput = vehicleForm.querySelector(
        'input[name="bien_so"]',
      );
      const vehicleTypeSelect = vehicleForm.querySelector(
        'select[name="loai_xe"]',
      );
      const vehicleStatusSelect = vehicleForm.querySelector(
        'select[name="trang_thai"]',
      );
      const vehicleNoteInput = vehicleForm.querySelector(
        'input[name="ghi_chu"]',
      );
      const vehicleDefaultInput = vehicleForm.querySelector(
        'input[name="la_mac_dinh"]',
      );
      const vehicleSubmitButton = root.querySelector(
        "#provider-vehicle-submit-btn",
      );
      const vehicleCancelButton = root.querySelector(
        "#provider-vehicle-cancel-btn",
      );

      const resetVehicleForm = () => {
        if (vehicleIdInput) vehicleIdInput.value = "";
        if (vehicleNameInput) vehicleNameInput.value = "";
        if (vehiclePlateInput) vehiclePlateInput.value = "";
        if (vehicleTypeSelect) {
          vehicleTypeSelect.value =
            primaryVehicle?.loai_xe ||
            vehicleType ||
            vehicleCatalog[0]?.key ||
            "";
        }
        if (vehicleStatusSelect) {
          vehicleStatusSelect.value = "hoat_dong";
        }
        if (vehicleNoteInput) vehicleNoteInput.value = "";
        if (vehicleDefaultInput) {
          vehicleDefaultInput.checked = vehicles.length === 0;
        }
        if (vehicleSubmitButton) {
          vehicleSubmitButton.innerHTML = '<i class="fas fa-plus"></i> Thêm xe';
          vehicleSubmitButton.disabled = false;
        }
        if (vehicleCancelButton) {
          vehicleCancelButton.hidden = true;
        }
      };

      resetVehicleForm();

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
            vehicleSubmitButton.innerHTML =
              '<i class="fas fa-spinner fa-spin"></i> Đang lưu xe';
          }

          if (vehicleIdInput?.value) {
            await store.updateProviderVehicle?.(
              vehicleIdInput.value,
              identity.id,
              payload,
            );
          } else {
            await store.createProviderVehicle?.(identity.id, payload);
          }

          core.notify?.(
            vehicleIdInput?.value ? "Đã cập nhật xe." : "Đã thêm xe mới.",
            "success",
          );
          await reloadProfileView();
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
        const actionName = String(
          button.getAttribute("data-vehicle-action") || "",
        );
        const vehicle = vehicleIndex.get(vehicleId);
        if (!vehicle) {
          core.notify?.("Không tìm thấy xe để xử lý.", "error");
          return;
        }

        if (actionName === "edit") {
          if (vehicleIdInput) vehicleIdInput.value = getVehicleRecordKey(vehicle);
          if (vehicleNameInput)
            vehicleNameInput.value = vehicle.ten_hien_thi || "";
          if (vehiclePlateInput)
            vehiclePlateInput.value = vehicle.bien_so || "";
          if (vehicleTypeSelect)
            vehicleTypeSelect.value = vehicle.loai_xe || "";
          if (vehicleStatusSelect)
            vehicleStatusSelect.value = vehicle.trang_thai || "hoat_dong";
          if (vehicleNoteInput) vehicleNoteInput.value = vehicle.ghi_chu || "";
          if (vehicleDefaultInput) {
            vehicleDefaultInput.checked =
              Number(vehicle.la_mac_dinh || 0) === 1;
          }
          if (vehicleSubmitButton) {
            vehicleSubmitButton.innerHTML =
              '<i class="fas fa-save"></i> Cập nhật xe';
          }
          if (vehicleCancelButton) {
            vehicleCancelButton.hidden = false;
          }
          vehicleNameInput?.focus();
          return;
        }

        try {
          if (actionName === "delete") {
            const confirmed = window.confirm(
              `Xóa xe "${vehicle.ten_hien_thi}" khỏi danh sách xử lý đơn?`,
            );
            if (!confirmed) return;
            await store.deleteProviderVehicle?.(getVehicleRecordKey(vehicle), identity.id);
            core.notify?.("Đã xóa xe.", "success");
            await reloadProfileView();
            return;
          }

          if (actionName === "default") {
            await store.updateProviderVehicle?.(getVehicleRecordKey(vehicle), identity.id, {
              la_mac_dinh: 1,
            });
            core.notify?.("Đã đặt xe mặc định.", "success");
            await reloadProfileView();
            return;
          }

          if (actionName === "toggle-status") {
            await store.updateProviderVehicle?.(getVehicleRecordKey(vehicle), identity.id, {
              trang_thai:
                button.getAttribute("data-next-status") || "hoat_dong",
            });
            core.notify?.("Đã cập nhật trạng thái xe.", "success");
            await reloadProfileView();
          }
        } catch (error) {
          console.error("Cannot update moving provider vehicle action:", error);
          core.notify?.(
            error?.message || "Không thể xử lý xe lúc này.",
            "error",
          );
        }
      });
    }

    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const hoVaTen = String(formData.get("hovaten") || "").trim();
      const nextEmail = String(formData.get("email") || "").trim();
      const nextPhone = phone;
      const submitButton = root.querySelector("#provider-profile-submit-btn");

      if (!hoVaTen || !nextPhone) {
        showFeedback(
          profileFeedback,
          "error",
          "Vui lòng nhập đầy đủ tên hiển thị và số điện thoại tài khoản.",
        );
        return;
      }

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Đang lưu hồ sơ';
        }
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            hovaten: hoVaTen,
            email: nextEmail,
            sodienthoai: nextPhone,
            diachi: String(formData.get("diachi") || "").trim(),
            ten_cong_ty: String(formData.get("ten_cong_ty") || "").trim(),
            ma_so_thue: String(formData.get("ma_so_thue") || "").trim(),
            dia_chi_doanh_nghiep: String(
              formData.get("dia_chi_doanh_nghiep") || "",
            ).trim(),
            loai_phuong_tien: String(
              formData.get("loai_phuong_tien") || "",
            ).trim(),
            avatar_file: formData.get("avatar_file"),
            cccd_front_file: formData.get("cccd_front_file"),
            cccd_back_file: formData.get("cccd_back_file"),
          });
          const warning = String(profile?.warning || "").trim();
          showFeedback(
            profileFeedback,
            warning ? "warning" : "success",
            warning || "Đã cập nhật hồ sơ nhà cung cấp.",
          );
          window.setTimeout(
            () => renderProfile({ profile, stats }),
            warning ? 1600 : 300,
          );
          return;
        }
      } catch (error) {
        console.error("Cannot update provider profile store:", error);
        showFeedback(
          profileFeedback,
          "error",
          error.message || "Không thể cập nhật hồ sơ nhà cung cấp.",
        );
        return;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
        }
      }

      showFeedback(
        profileFeedback,
        "error",
        "Không thể cập nhật hồ sơ nhà cung cấp.",
      );
    });

    passwordForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(passwordForm);
      const currentPassword = String(
        formData.get("current_password") || "",
      ).trim();
      const newPassword = String(formData.get("new_password") || "").trim();
      const confirmPassword = String(
        formData.get("confirm_password") || "",
      ).trim();

      if (!currentPassword || !newPassword || !confirmPassword) {
        showFeedback(
          passwordFeedback,
          "error",
          "Vui lòng nhập đủ ba trường mật khẩu.",
        );
        return;
      }

      if (newPassword.length < 8) {
        showFeedback(
          passwordFeedback,
          "error",
          "Mật khẩu mới cần ít nhất 8 ký tự.",
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        showFeedback(passwordFeedback, "error", "Mật khẩu xác nhận chưa khớp.");
        return;
      }

      try {
        if (store.changePassword) {
          await store.changePassword({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          });
          passwordForm.reset();
          showFeedback(passwordFeedback, "success", "Đổi mật khẩu thành công.");
          return;
        }
      } catch (error) {
        console.error("Cannot change provider password store:", error);
        showFeedback(
          passwordFeedback,
          "error",
          error.message || "Không thể đổi mật khẩu.",
        );
        return;
      }

      showFeedback(passwordFeedback, "error", "Không thể đổi mật khẩu.");
    });
  }

  (async function bootstrapProfile() {
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
      renderProfile({
        profile,
        stats: dashboard?.stats || {},
        vehicles,
        primaryVehicle:
          typeof store.pickPrimaryProviderVehicle === "function"
            ? store.pickPrimaryProviderVehicle(vehicles)
            : vehicles[0] || null,
        vehicleCatalog,
      });
    } catch (error) {
      console.error("Cannot load provider profile store:", error);
      renderProfile(null);
    }
  })();

  const moduleApi = {};
  window.__fastGoProviderProfileModule = moduleApi;
  return moduleApi;
})(window, document);

export default providerProfileModule;
