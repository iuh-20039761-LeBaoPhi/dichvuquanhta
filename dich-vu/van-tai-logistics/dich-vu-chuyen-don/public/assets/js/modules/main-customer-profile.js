import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const customerProfileModule = (function (window, document) {
  if (window.__fastGoCustomerProfileLoaded) {
    return window.__fastGoCustomerProfileModule || null;
  }
  window.__fastGoCustomerProfileLoaded = true;

  const body = document.body;

  if (!body || body.getAttribute("data-page") !== "customer-profile") {
    return;
  }

  const root = document.getElementById("customer-profile-root");
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

  function getDisplayName(profile) {
    return store.getDisplayName(profile);
  }

  function getProfileInitial(name) {
    return String(name || "").trim().charAt(0).toUpperCase() || "K";
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
        note: "Hồ sơ đang chờ hệ thống kiểm tra và đồng bộ.",
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
      label: "Sẵn sàng đặt lịch",
      className: "is-active",
      note: "Thông tin này sẽ được dùng cho các đơn chuyển dọn tiếp theo.",
    };
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

    if (preview.complete && preview.getAttribute("src") && !preview.naturalWidth) {
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

    const identity = data.profile;
    const stats = data.stats || {};
    const displayName = getDisplayName(identity);
    const phone = String(identity.sodienthoai || "").trim();
    const email = String(identity.email || "").trim();
    const address = String(identity.diachi || identity.dia_chi || "").trim();
    const avatarUrl = resolveMediaUrl(identity.link_avatar);
    const cccdFrontUrl = resolveMediaUrl(identity.link_cccd_truoc);
    const cccdBackUrl = resolveMediaUrl(identity.link_cccd_sau);
    const createdAtLabel = formatDateTime(identity.created_at || identity.updated_at || "");
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
                <label class="customer-profile-avatar-action" for="customer-avatar-file" aria-label="Thay đổi ảnh đại diện">
                  <i class="fas fa-camera"></i>
                </label>
              </div>
              <div class="customer-profile-hero-info">
                <p class="customer-profile-eyebrow">Hồ sơ cá nhân</p>
                <h2>${escapeHtml(displayName)}</h2>
                <div class="customer-profile-meta-list">
                  <span><i class="fas fa-id-badge"></i> ${escapeHtml(phone || "Tài khoản khách")}</span>
                  <span><i class="fas fa-clock"></i> Tham gia: ${escapeHtml(createdAtLabel)}</span>
                </div>
              </div>
            </div>
            <div class="customer-profile-hero-actions">
              <span class="customer-profile-status-badge ${escapeHtml(statusMeta.className)}">${escapeHtml(statusMeta.label)}</span>
              <p class="customer-profile-hero-note">${escapeHtml(statusMeta.note)}</p>
              <button class="customer-btn customer-btn-primary" type="submit" form="customer-profile-form" id="customer-profile-submit-btn">
                <i class="fas fa-save"></i> Lưu thay đổi
              </button>
            </div>
          </div>

          <div class="customer-profile-dashboard-grid">
            <div class="customer-profile-main-column">
              <form id="customer-profile-form" class="customer-profile-form" enctype="multipart/form-data">
                <article class="customer-profile-card">
                  <div class="customer-profile-card-head">
                    <i class="fas fa-user-circle"></i>
                    <h3>Thông tin cá nhân</h3>
                  </div>
                  <div id="customer-profile-feedback"></div>
                  <div class="customer-profile-form-grid">
                    <div class="customer-form-group">
                      <span>Họ và tên</span>
                      <div class="customer-form-field">
                        <i class="fas fa-user"></i>
                        <input name="hovaten" value="${escapeHtml(displayName)}" required />
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Số điện thoại</span>
                      <div class="customer-form-field">
                        <i class="fas fa-phone"></i>
                        <input name="sodienthoai" value="${escapeHtml(phone)}" readonly disabled />
                      </div>
                    </div>
                    <div class="customer-form-group">
                      <span>Email</span>
                      <div class="customer-form-field">
                        <i class="fas fa-envelope"></i>
                        <input name="email" type="email" value="${escapeHtml(email)}" placeholder="name@example.com" />
                      </div>
                    </div>
                    <div class="customer-form-group customer-form-group-wide">
                      <span>Địa chỉ liên hệ</span>
                      <div class="customer-form-field">
                        <i class="fas fa-location-dot"></i>
                        <input name="diachi" value="${escapeHtml(address)}" placeholder="Số nhà, tên đường..." />
                      </div>
                    </div>
                  </div>
                </article>

                <article class="customer-profile-card">
                  <div class="customer-profile-card-head">
                    <i class="fas fa-fingerprint"></i>
                    <h3>Xác thực căn cước công dân</h3>
                  </div>
                  <div class="customer-profile-media-grid customer-profile-media-grid-identity">
                    <article class="customer-profile-media-card customer-profile-media-card-avatar">
                      <div class="customer-profile-media-head">
                        <strong>Ảnh đại diện</strong>
                        <span>JPG, PNG</span>
                      </div>
                      <div class="customer-profile-media-preview customer-profile-media-preview-avatar">
                        <img id="customer-avatar-preview" src="${escapeHtml(avatarUrl || "")}" alt="Ảnh đại diện" ${avatarUrl ? "" : "hidden"} />
                        <div id="customer-avatar-empty" class="customer-profile-media-empty" ${avatarUrl ? "hidden" : ""}>Chưa có ảnh đại diện</div>
                      </div>
                      <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                        <input id="customer-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                        <i class="fas fa-camera"></i> Thay đổi ảnh
                      </label>
                    </article>

                    <article class="customer-profile-media-card">
                      <div class="customer-profile-media-head">
                        <strong>CCCD mặt trước</strong>
                        <span>Xác minh</span>
                      </div>
                      <div class="customer-profile-media-preview">
                        <img id="customer-cccd-front-preview" src="${escapeHtml(cccdFrontUrl || "")}" alt="CCCD mặt trước" ${cccdFrontUrl ? "" : "hidden"} />
                        <div id="customer-cccd-front-empty" class="customer-profile-media-empty" ${cccdFrontUrl ? "hidden" : ""}>
                          <i class="fas fa-cloud-arrow-up"></i>
                          <span>Tải lên mặt trước</span>
                        </div>
                      </div>
                      <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                        <input id="customer-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                        <i class="fas fa-id-card"></i> Chọn ảnh
                      </label>
                    </article>

                    <article class="customer-profile-media-card">
                      <div class="customer-profile-media-head">
                        <strong>CCCD mặt sau</strong>
                        <span>Xác minh</span>
                      </div>
                      <div class="customer-profile-media-preview">
                        <img id="customer-cccd-back-preview" src="${escapeHtml(cccdBackUrl || "")}" alt="CCCD mặt sau" ${cccdBackUrl ? "" : "hidden"} />
                        <div id="customer-cccd-back-empty" class="customer-profile-media-empty" ${cccdBackUrl ? "hidden" : ""}>
                          <i class="fas fa-cloud-arrow-up"></i>
                          <span>Tải lên mặt sau</span>
                        </div>
                      </div>
                      <label class="customer-btn customer-btn-ghost customer-profile-upload-btn">
                        <input id="customer-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
                        <i class="fas fa-id-card-clip"></i> Chọn ảnh
                      </label>
                    </article>
                  </div>
                </article>
              </form>
            </div>

            <aside class="customer-profile-side-column">
              <article class="customer-profile-card customer-profile-stats-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-chart-line"></i>
                  <h3>Thống kê vận hành</h3>
                </div>
                <div class="customer-profile-stat-list">
                  <div><span>Tổng yêu cầu</span><strong>${escapeHtml(formatNumber(stats.total || 0))}</strong></div>
                  <div><span>Hoàn tất</span><strong>${escapeHtml(formatNumber(stats.confirmed_count || stats.completed_count || 0))}</strong></div>
                  <div><span>Tỷ lệ thành công</span><strong>${escapeHtml(String(stats.total ? Math.round((((stats.confirmed_count || stats.completed_count || 0) * 100) / stats.total)) : 0))}%</strong></div>
                </div>
              </article>

              <article class="customer-profile-card customer-profile-security-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-shield-halved"></i>
                  <h3>Bảo mật</h3>
                </div>
                <div id="customer-password-feedback"></div>
                <form id="customer-password-form" class="customer-form-stack">
                  <div class="customer-form-group">
                    <span>Mật khẩu hiện tại</span>
                    <div class="customer-form-field">
                      <i class="fas fa-key"></i>
                      <input name="current_password" type="password" required placeholder="••••••••" autocomplete="current-password" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Mật khẩu mới</span>
                    <div class="customer-form-field">
                      <i class="fas fa-lock"></i>
                      <input name="new_password" type="password" minlength="8" required placeholder="Ít nhất 8 ký tự" autocomplete="new-password" />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Xác nhận mật khẩu</span>
                    <div class="customer-form-field">
                      <i class="fas fa-check-double"></i>
                      <input name="confirm_password" type="password" minlength="8" required placeholder="Nhập lại mật khẩu mới" autocomplete="new-password" />
                    </div>
                  </div>
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

    const profileForm = root.querySelector("#customer-profile-form");
    const profileFeedback = root.querySelector("#customer-profile-feedback");
    const passwordForm = root.querySelector("#customer-password-form");
    const passwordFeedback = root.querySelector("#customer-password-feedback");

    bindMediaPreview("customer-avatar-file", "customer-avatar-preview", "customer-avatar-empty");
    bindMediaPreview("customer-cccd-front-file", "customer-cccd-front-preview", "customer-cccd-front-empty");
    bindMediaPreview("customer-cccd-back-file", "customer-cccd-back-preview", "customer-cccd-back-empty");

    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const submitButton = root.querySelector("#customer-profile-submit-btn");

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        }
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            hovaten: String(formData.get("hovaten") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            sodienthoai: phone,
            diachi: String(formData.get("diachi") || "").trim(),
            avatar_file: formData.get("avatar_file"),
            cccd_front_file: formData.get("cccd_front_file"),
            cccd_back_file: formData.get("cccd_back_file"),
          });
          const warning = String(profile?.warning || "").trim();
          showFeedback(
            profileFeedback,
            warning ? "warning" : "success",
            warning || "Hồ sơ đã được cập nhật thành công.",
          );
          window.setTimeout(() => renderProfile({ profile, stats }), warning ? 1600 : 600);
        }
      } catch (error) {
        showFeedback(profileFeedback, "error", error.message || "Lỗi cập nhật hồ sơ.");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
        }
      }
    });

    passwordForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(passwordForm);
      const currentPassword = String(formData.get("current_password") || "").trim();
      const newPassword = String(formData.get("new_password") || "").trim();
      const confirmPassword = String(formData.get("confirm_password") || "").trim();

      if (newPassword !== confirmPassword) {
        showFeedback(passwordFeedback, "error", "Mật khẩu xác nhận không khớp.");
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
        }
      } catch (error) {
        showFeedback(passwordFeedback, "error", error.message || "Lỗi đổi mật khẩu.");
      }
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
      console.error("Cannot load customer profile store:", error);
      renderProfile(null);
    }
  })();

  const moduleApi = {};
  window.__fastGoCustomerProfileModule = moduleApi;
  return moduleApi;
})(window, document);

export default customerProfileModule;
