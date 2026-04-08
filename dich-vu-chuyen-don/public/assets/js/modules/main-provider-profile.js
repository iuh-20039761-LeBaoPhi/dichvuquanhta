(function (window, document) {
  if (window.__fastGoProviderProfileLoaded) return;
  window.__fastGoProviderProfileLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
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

  function getProjectUrl(path) {
    return typeof core.toProjectUrl === "function" ? core.toProjectUrl(path) : path;
  }

  function getInitial(name) {
    return String(name || "").trim().charAt(0).toUpperCase() || "N";
  }

  function renderProfile(data) {
    const role = store.getSavedRole();
    if (role && role !== "nha-cung-cap") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=nha-cung-cap");
      return;
    }

    const identity = data?.profile || store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const contactPerson = String(identity.contact_person || identity.contactPerson || "").trim();
    const initial = getInitial(displayName);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-portal-profile">
          <div class="customer-profile-hero">
            <div class="customer-profile-avatar-wrapper">
              <div class="customer-profile-avatar-large">${escapeHtml(initial)}</div>
            </div>
            <div class="customer-profile-hero-info">
              <p class="customer-section-kicker">Hồ sơ nhà cung cấp</p>
              <h2>${escapeHtml(displayName)}</h2>
              <p><i class="fas fa-envelope"></i> ${escapeHtml(email || "Chưa có email")}</p>
              <p><i class="fas fa-phone"></i> ${escapeHtml(phone || "Chưa có số điện thoại")}</p>
            </div>
          </div>

          <div class="customer-profile-summary">
            <article>
              <span>Tên đơn vị / đội nhóm</span>
              <strong>${escapeHtml(displayName)}</strong>
            </article>
            <article>
              <span>Người phụ trách</span>
              <strong>${escapeHtml(contactPerson || displayName || "Chưa có dữ liệu")}</strong>
            </article>
            <article>
              <span>Email vận hành</span>
              <strong>${escapeHtml(email || "Chưa có dữ liệu")}</strong>
            </article>
            <article>
              <span>Số điện thoại</span>
              <strong>${escapeHtml(phone || "Chưa có dữ liệu")}</strong>
            </article>
          </div>

          <div class="customer-profile-sections">
            <div class="customer-profile-card">
              <div class="customer-profile-card-head">
                <i class="fas fa-user-pen"></i>
                <h3>Thông tin cơ bản</h3>
              </div>
              <div id="provider-profile-feedback"></div>
              <form id="provider-profile-form" class="customer-form-stack">
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Tên đơn vị / đội nhóm</span>
                    <div class="customer-form-field">
                      <input name="full_name" type="text" value="${escapeHtml(displayName)}" required />
                      <i class="fas fa-building"></i>
                    </div>
                  </label>
                  <label class="customer-form-group">
                    <span>Email vận hành</span>
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
                      <input name="phone" type="tel" value="${escapeHtml(phone)}" required />
                      <i class="fas fa-phone"></i>
                    </div>
                  </label>
                  <label class="customer-form-group">
                    <span>Người phụ trách</span>
                    <div class="customer-form-field">
                      <input name="contact_person" type="text" value="${escapeHtml(contactPerson)}" placeholder="Tên đầu mối vận hành" />
                      <i class="fas fa-id-badge"></i>
                    </div>
                  </label>
                </div>
                <div class="customer-inline-actions">
                  <button class="customer-btn customer-btn-primary" type="submit">Lưu thông tin</button>
                  <a class="customer-btn customer-btn-ghost" href="${escapeHtml(getProjectUrl("nha-cung-cap/dashboard.html"))}">Về dashboard</a>
                </div>
              </form>
            </div>

            <div class="customer-profile-card customer-password-card">
              <div class="customer-profile-card-head">
                <i class="fas fa-lock"></i>
                <h3>Đổi mật khẩu</h3>
              </div>
              <div id="provider-password-feedback"></div>
              <form id="provider-password-form" class="customer-form-stack">
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Mật khẩu hiện tại</span>
                    <div class="customer-form-field">
                      <input name="current_password" type="password" required />
                      <i class="fas fa-key"></i>
                    </div>
                  </label>
                  <label class="customer-form-group">
                    <span>Mật khẩu mới</span>
                    <div class="customer-form-field">
                      <input name="new_password" type="password" required />
                      <i class="fas fa-lock-open"></i>
                    </div>
                  </label>
                </div>
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Xác nhận mật khẩu mới</span>
                    <div class="customer-form-field">
                      <input name="confirm_password" type="password" required />
                      <i class="fas fa-shield-halved"></i>
                    </div>
                  </label>
                </div>
                <div class="customer-inline-actions">
                  <button class="customer-btn customer-btn-ghost" type="submit">Cập nhật mật khẩu</button>
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
      const fullName = String(formData.get("full_name") || "").trim();
      const nextEmail = String(formData.get("email") || "").trim();
      const nextPhone = String(formData.get("phone") || "").trim();
      const nextContact = String(formData.get("contact_person") || "").trim();

      if (!fullName || !nextEmail || !nextPhone) {
        showFeedback(
          profileFeedback,
          "error",
          "Vui lòng nhập đầy đủ tên đơn vị, email và số điện thoại.",
        );
        return;
      }

      try {
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            full_name: fullName,
            email: nextEmail,
            phone: nextPhone,
            contact_person: nextContact,
          });
          showFeedback(profileFeedback, "success", "Đã cập nhật hồ sơ nhà cung cấp.");
          window.setTimeout(() => renderProfile({ profile }), 300);
          return;
        }
      } catch (error) {
        console.error("Cannot update provider profile store:", error);
        showFeedback(profileFeedback, "error", error.message || "Không thể cập nhật hồ sơ nhà cung cấp.");
        return;
      }

      store.saveIdentity({
        ...store.readIdentity(),
        fullName,
        full_name: fullName,
        email: nextEmail,
        phone: nextPhone,
        contact_person: nextContact,
        contactPerson: nextContact,
      });

      showFeedback(profileFeedback, "success", "Đã cập nhật thông tin hồ sơ trong phiên hiện tại.");
      window.setTimeout(() => renderProfile(null), 300);
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

      passwordForm.reset();
      showFeedback(passwordFeedback, "success", "Đã ghi nhận yêu cầu đổi mật khẩu ở mức giao diện.");
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
})(window, document);
