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

  function getProfileInitial(name) {
    return String(name || "").trim().charAt(0).toUpperCase() || "N";
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
      note: "Hồ sơ đang hoạt động bình thường trong khu nhà cung cấp chuyển dọn.",
    };
  }

  function bindMediaPreview(inputId, previewId, emptyId) {
    const input = root.querySelector(`#${inputId}`);
    const preview = root.querySelector(`#${previewId}`);
    const emptyState = root.querySelector(`#${emptyId}`);
    if (!input || !preview) return;

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
    target.innerHTML = `
      <div class="customer-state-card ${type === "error" ? "is-error" : ""}">
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

    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = core.getSharedLoginUrl({
        redirect: core.getCurrentRelativeUrl(),
      });
      return;
    }

    const identity = data.profile;
    const stats = data.stats || {};
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.sodienthoai || "").trim();
    const email = String(identity.email || "").trim();
    const address = String(identity.diachi || identity.dia_chi || "").trim();
    const vehicleType = String(identity.loai_phuong_tien || identity.vehicle_type || "").trim();
    const avatarUrl = resolveMediaUrl(identity.link_avatar || identity.avatartenfile);
    const cccdFrontUrl = resolveMediaUrl(
      identity.link_cccd_truoc || identity.cccdmattruoctenfile,
    );
    const cccdBackUrl = resolveMediaUrl(
      identity.link_cccd_sau || identity.cccdmatsautenfile,
    );
    const statusMeta = getStatusMeta(identity);
    const initial = getProfileInitial(displayName);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-portal-profile customer-portal-profile-rich moving-profile-rich">
          <div class="moving-profile-hero">
            <div class="moving-profile-hero-main">
              <div class="moving-profile-avatar">
                ${
                  avatarUrl
                    ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" />`
                    : `<span>${escapeHtml(initial)}</span>`
                }
              </div>
              <div class="moving-profile-hero-copy">
                <p class="moving-profile-eyebrow">Hồ sơ nhà cung cấp chuyển dọn</p>
                <h2>${escapeHtml(displayName)}</h2>
                <div class="moving-profile-meta">
                  <span><i class="fas fa-phone"></i> ${escapeHtml(phone || "Chưa cập nhật")}</span>
                  <span><i class="fas fa-truck-ramp-box"></i> ${escapeHtml(vehicleType || "Chưa cập nhật phương tiện")}</span>
                </div>
              </div>
            </div>
            <div class="moving-profile-status-card">
              <span class="moving-profile-status-badge ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
              <p>${escapeHtml(statusMeta.note)}</p>
              <small><i class="fas fa-clock"></i> Cập nhật gần nhất: ${escapeHtml(formatDateTime(identity.updated_at || identity.created_at || ""))}</small>
            </div>
          </div>

          <div class="moving-profile-summary">
            <article><span>Tổng yêu cầu</span><strong>${escapeHtml(String(stats.total || 0))}</strong></article>
            <article><span>Đang xử lý</span><strong>${escapeHtml(String(stats.active_count || stats.open_count || 0))}</strong></article>
            <article><span>Hoàn tất</span><strong>${escapeHtml(String(stats.confirmed_count || stats.completed_count || 0))}</strong></article>
          </div>

          <div class="customer-profile-sections moving-profile-layout">
            <form id="provider-profile-form" class="customer-form-stack moving-profile-main" enctype="multipart/form-data">
              <div class="customer-profile-card moving-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-id-card"></i>
                  <div>
                    <h3>Thông tin hành nghề</h3>
                    <p class="customer-profile-card-note">Dữ liệu đồng bộ trực tiếp từ tài khoản nhà cung cấp trong bảng nguoidung.</p>
                  </div>
                </div>
                <div id="provider-profile-feedback"></div>
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Tên hiển thị</span>
                    <div class="customer-form-field">
                      <input name="hovaten" type="text" value="${escapeHtml(displayName)}" required />
                      <i class="fas fa-user"></i>
                    </div>
                  </label>
                  <label class="customer-form-group">
                    <span>Email</span>
                    <div class="customer-form-field">
                      <input name="email" type="email" value="${escapeHtml(email)}" />
                      <i class="fas fa-envelope"></i>
                    </div>
                  </label>
                </div>
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Số điện thoại tài khoản</span>
                    <div class="customer-form-field">
                      <input name="sodienthoai" type="tel" value="${escapeHtml(phone)}" readonly disabled aria-readonly="true" />
                      <i class="fas fa-phone"></i>
                    </div>
                  </label>
                  <label class="customer-form-group">
                    <span>Địa chỉ liên hệ</span>
                    <div class="customer-form-field">
                      <input name="diachi" type="text" value="${escapeHtml(address)}" placeholder="Khu vực hoạt động hoặc địa chỉ kho bãi..." />
                      <i class="fas fa-location-dot"></i>
                    </div>
                  </label>
                </div>
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Loại phương tiện</span>
                    <div class="customer-form-field">
                      <input name="loai_phuong_tien" type="text" value="${escapeHtml(vehicleType)}" placeholder="Ví dụ: Xe tải nhỏ, xe bán tải..." />
                      <i class="fas fa-truck-ramp-box"></i>
                    </div>
                  </label>
                </div>
                <p class="customer-form-helper customer-form-helper-compact">
                  <i class="fas fa-circle-info"></i> Số điện thoại là định danh tài khoản nhà cung cấp, hiện không chỉnh sửa tại đây.
                </p>
                <div class="customer-inline-actions">
                  <button class="customer-btn customer-btn-primary" type="submit" id="provider-profile-submit-btn">
                    <i class="fas fa-floppy-disk"></i> Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>

            <div class="moving-profile-side">
              <div class="customer-profile-card moving-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-shield-check"></i>
                  <div>
                    <h3>Xác minh hồ sơ</h3>
                    <p class="customer-profile-card-note">Ảnh đại diện và CCCD giúp đội điều phối xác thực nhanh hơn.</p>
                  </div>
                </div>
                <div class="moving-media-grid">
                  <article class="moving-media-card">
                    <div class="moving-media-head"><strong>Ảnh đại diện</strong><span>Nhận diện</span></div>
                    <div class="moving-media-preview">
                      <img id="provider-avatar-preview" src="${escapeHtml(avatarUrl || "")}" alt="Ảnh đại diện" ${avatarUrl ? "" : "hidden"} />
                      <div id="provider-avatar-empty" class="moving-media-empty" ${avatarUrl ? "hidden" : ""}>Chưa có ảnh đại diện</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost moving-upload-btn">
                      <input id="provider-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-camera"></i> Chọn ảnh
                    </label>
                  </article>

                  <article class="moving-media-card">
                    <div class="moving-media-head"><strong>CCCD mặt trước</strong><span>Xác minh</span></div>
                    <div class="moving-media-preview">
                      <img id="provider-cccd-front-preview" src="${escapeHtml(cccdFrontUrl || "")}" alt="CCCD mặt trước" ${cccdFrontUrl ? "" : "hidden"} />
                      <div id="provider-cccd-front-empty" class="moving-media-empty" ${cccdFrontUrl ? "hidden" : ""}>Chưa có CCCD mặt trước</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost moving-upload-btn">
                      <input id="provider-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-id-card"></i> Chọn ảnh
                    </label>
                  </article>

                  <article class="moving-media-card">
                    <div class="moving-media-head"><strong>CCCD mặt sau</strong><span>Xác minh</span></div>
                    <div class="moving-media-preview">
                      <img id="provider-cccd-back-preview" src="${escapeHtml(cccdBackUrl || "")}" alt="CCCD mặt sau" ${cccdBackUrl ? "" : "hidden"} />
                      <div id="provider-cccd-back-empty" class="moving-media-empty" ${cccdBackUrl ? "hidden" : ""}>Chưa có CCCD mặt sau</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost moving-upload-btn">
                      <input id="provider-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-id-card-clip"></i> Chọn ảnh
                    </label>
                  </article>
                </div>
              </div>

              <div class="customer-profile-card customer-password-card moving-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-shield-halved"></i>
                  <div>
                    <h3>Bảo mật tài khoản</h3>
                    <p class="customer-profile-card-note">Đổi mật khẩu đăng nhập cho khu nhà cung cấp chuyển dọn.</p>
                  </div>
                </div>
                <div id="provider-password-feedback"></div>
                <form id="provider-password-form" class="customer-form-stack">
                  <label class="customer-form-group">
                    <span>Mật khẩu hiện tại</span>
                    <div class="customer-form-field">
                      <input name="current_password" type="password" autocomplete="current-password" required />
                      <i class="fas fa-key"></i>
                    </div>
                  </label>
                  <div class="customer-form-row">
                    <label class="customer-form-group">
                      <span>Mật khẩu mới</span>
                      <div class="customer-form-field">
                        <input name="new_password" type="password" autocomplete="new-password" required />
                        <i class="fas fa-lock"></i>
                      </div>
                    </label>
                    <label class="customer-form-group">
                      <span>Xác nhận mật khẩu mới</span>
                      <div class="customer-form-field">
                        <input name="confirm_password" type="password" autocomplete="new-password" required />
                        <i class="fas fa-lock-open"></i>
                      </div>
                    </label>
                  </div>
                  <p class="customer-form-helper customer-form-helper-compact">
                    <i class="fas fa-circle-info"></i> Mật khẩu mới cần ít nhất 8 ký tự.
                  </p>
                  <div class="customer-inline-actions">
                    <button class="customer-btn customer-btn-primary" type="submit">Cập nhật mật khẩu</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    const profileForm = root.querySelector("#provider-profile-form");
    const profileFeedback = root.querySelector("#provider-profile-feedback");
    const passwordForm = root.querySelector("#provider-password-form");
    const passwordFeedback = root.querySelector("#provider-password-feedback");

    bindMediaPreview("provider-avatar-file", "provider-avatar-preview", "provider-avatar-empty");
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
          submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu hồ sơ';
        }
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            hovaten: hoVaTen,
            email: nextEmail,
            sodienthoai: nextPhone,
            diachi: String(formData.get("diachi") || "").trim(),
            loai_phuong_tien: String(formData.get("loai_phuong_tien") || "").trim(),
            avatar_file: formData.get("avatar_file"),
            cccd_front_file: formData.get("cccd_front_file"),
            cccd_back_file: formData.get("cccd_back_file"),
          });
          showFeedback(profileFeedback, "success", "Đã cập nhật hồ sơ nhà cung cấp.");
          window.setTimeout(() => renderProfile({ profile, stats }), 300);
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
          submitButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Lưu thay đổi';
        }
      }

      showFeedback(profileFeedback, "error", "Không thể cập nhật hồ sơ nhà cung cấp.");
    });

    passwordForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(passwordForm);
      const currentPassword = String(formData.get("current_password") || "").trim();
      const newPassword = String(formData.get("new_password") || "").trim();
      const confirmPassword = String(formData.get("confirm_password") || "").trim();

      if (!currentPassword || !newPassword || !confirmPassword) {
        showFeedback(passwordFeedback, "error", "Vui lòng nhập đủ ba trường mật khẩu.");
        return;
      }

      if (newPassword.length < 8) {
        showFeedback(passwordFeedback, "error", "Mật khẩu mới cần ít nhất 8 ký tự.");
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
        showFeedback(passwordFeedback, "error", error.message || "Không thể đổi mật khẩu.");
        return;
      }

      showFeedback(passwordFeedback, "error", "Không thể đổi mật khẩu.");
    });
  }

  (async function bootstrapProfile() {
    try {
      const dashboard = await store.fetchDashboard?.();
      renderProfile({
        profile: dashboard?.profile || null,
        stats: dashboard?.stats || {},
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
