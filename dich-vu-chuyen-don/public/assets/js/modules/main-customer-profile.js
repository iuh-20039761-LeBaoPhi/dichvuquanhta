import core from "./core/app-core.js";
import store from "./main-customer-portal-store.js";

const customerProfileModule = (function (window, document) {
  if (window.__fastGoCustomerProfileLoaded) return window.__fastGoCustomerProfileModule || null;
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

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function" ? core.toProjectUrl(path) : path;
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
    if (role && role !== "khach-hang") {
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
                <i class="fas fa-user-gear"></i>
                <div>
                  <h3>Thông tin tài khoản</h3>
                  <p class="customer-profile-card-note">Cập nhật thông tin liên hệ dùng cho các đơn chuyển dọn tiếp theo.</p>
                </div>
              </div>
              <div id="customer-profile-feedback"></div>
              <form id="customer-profile-form" class="customer-form-stack">
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Họ và tên</span>
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
                    <span>Số điện thoại</span>
                    <div class="customer-form-field">
                      <input name="sodienthoai" type="tel" value="${escapeHtml(phone)}" readonly disabled aria-readonly="true" />
                      <i class="fas fa-phone"></i>
                    </div>
                  </label>
                </div>
                <p class="customer-form-helper customer-form-helper-compact">
                  <i class="fas fa-circle-info"></i> Số điện thoại là định danh tài khoản, hiện không thể chỉnh sửa tại đây.
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
                  <p class="customer-profile-card-note">Đổi mật khẩu đăng nhập cho khu khách hàng.</p>
                </div>
              </div>
              <div id="customer-password-feedback"></div>
              <form id="customer-password-form" class="customer-form-stack">
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

    const profileForm = root.querySelector("#customer-profile-form");
    const profileFeedback = root.querySelector("#customer-profile-feedback");
    const passwordForm = root.querySelector("#customer-password-form");
    const passwordFeedback = root.querySelector("#customer-password-feedback");

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
        showFeedback(profileFeedback, "error", "Vui lòng nhập đầy đủ họ tên, email và số điện thoại.");
        return;
      }

      try {
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            hovaten: hoVaTen,
            email: nextEmail,
            sodienthoai: nextPhone,
          });
          showFeedback(profileFeedback, "success", "Đã cập nhật hồ sơ khách hàng.");
          window.setTimeout(() => renderProfile({ profile }), 300);
          return;
        }
      } catch (error) {
        console.error("Cannot update customer profile store:", error);
        showFeedback(profileFeedback, "error", error.message || "Không thể cập nhật hồ sơ khách hàng.");
        return;
      }

      showFeedback(profileFeedback, "error", "Không thể cập nhật hồ sơ khách hàng.");
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
        console.error("Cannot change customer password store:", error);
        showFeedback(passwordFeedback, "error", error.message || "Không thể đổi mật khẩu.");
        return;
      }

      passwordForm.reset();
      showFeedback(passwordFeedback, "success", "Đã ghi nhận yêu cầu đổi mật khẩu ở mức giao diện.");
    });
  }

  (async function bootstrapProfile() {
    try {
      const profile = await store.fetchProfile?.();
      renderProfile({ profile });
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
