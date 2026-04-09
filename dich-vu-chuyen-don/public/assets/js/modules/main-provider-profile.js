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
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.sodienthoai || "").trim();
    const email = String(identity.email || "").trim();

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-portal-profile">
          <div class="customer-profile-sections">
            <div class="customer-profile-card">
              <div class="customer-profile-card-head">
                <i class="fas fa-id-card"></i>
                <div>
                  <h3>Thông tin tài khoản</h3>
                  <p class="customer-profile-card-note">Dữ liệu đang đồng bộ trực tiếp từ tài khoản nhà cung cấp trong bảng nguoidung.</p>
                </div>
              </div>
              <div id="provider-profile-feedback"></div>
              <form id="provider-profile-form" class="customer-form-stack">
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
                      <input name="email" type="email" value="${escapeHtml(email)}" required />
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
                </div>
                <p class="customer-form-helper customer-form-helper-compact">
                  <i class="fas fa-circle-info"></i> Số điện thoại là định danh tài khoản nhà cung cấp, hiện không chỉnh sửa tại đây.
                </p>
                <div class="customer-inline-actions">
                  <button class="customer-btn customer-btn-primary" type="submit">
                    <i class="fas fa-floppy-disk"></i> Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>

            <div class="customer-profile-card customer-password-card">
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
        </section>
      </div>
    `;

    const profileForm = root.querySelector("#provider-profile-form");
    const profileFeedback = root.querySelector("#provider-profile-feedback");
    const passwordForm = root.querySelector("#provider-password-form");
    const passwordFeedback = root.querySelector("#provider-password-feedback");

    function showFeedback(target, type, message) {
      if (!target) return;
      target.innerHTML = `
        <div class="customer-state-card ${type === "error" ? "is-error" : ""}">
          <p class="customer-panel-subtext">${escapeHtml(message)}</p>
        </div>
      `;
    }

    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const hoVaTen = String(formData.get("hovaten") || "").trim();
      const nextEmail = String(formData.get("email") || "").trim();
      const nextPhone = phone;

      if (!hoVaTen || !nextEmail || !nextPhone) {
        showFeedback(
          profileFeedback,
          "error",
          "Vui lòng nhập đầy đủ tên hiển thị, email và số điện thoại tài khoản.",
        );
        return;
      }

      try {
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            hovaten: hoVaTen,
            email: nextEmail,
            sodienthoai: nextPhone,
          });
          showFeedback(profileFeedback, "success", "Đã cập nhật hồ sơ nhà cung cấp.");
          window.setTimeout(() => renderProfile({ profile }), 300);
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
      const profile = await store.fetchProfile?.();
      renderProfile({ profile });
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
