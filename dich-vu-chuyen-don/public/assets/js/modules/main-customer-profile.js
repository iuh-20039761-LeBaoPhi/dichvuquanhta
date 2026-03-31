(function (window, document) {
  if (window.__fastGoCustomerProfileLoaded) return;
  window.__fastGoCustomerProfileLoaded = true;

  const core = window.FastGoCore || {};
  const store = window.FastGoCustomerPortalStore || null;
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
    const role = store.getSavedRole();
    if (role && role !== "khach-hang") {
      window.location.href = getProjectUrl("dang-nhap.html?vai-tro=khach-hang");
      return;
    }

    const identity = data?.profile || store.readIdentity();
    const displayName = store.getDisplayName(identity);
    const phone = String(identity.phone || "").trim();
    const email = String(identity.email || "").trim();
    const contactPerson = String(identity.contact_person || identity.contactPerson || "").trim();

    root.innerHTML = `
      <div class="luoi-ho-so-khach-hang">
        <div class="noi-dung-ho-so-khach-hang">
          <section class="the-ho-so-khach-hang the-ho-so-khach-hang--hero">
            <span class="dashboard-khach-hang-nhan">
              <i class="fa-solid fa-id-card"></i>
              Hồ sơ khách hàng
            </span>
            <h2>Quản lý thông tin liên hệ và phiên đăng nhập hiện tại</h2>
            <p>
              Trang này dùng chung dữ liệu hồ sơ với dashboard, lịch sử và chi tiết yêu cầu để khách hàng
              chỉnh một nơi và phản chiếu lại trên toàn portal.
            </p>
          </section>

          <section class="the-ho-so-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Thông tin cơ bản</h3>
                <p>Sửa trực tiếp các thông tin liên hệ đang dùng cho tài khoản khách hàng này.</p>
              </div>
            </div>
            <div id="customer-profile-feedback"></div>
            <form id="customer-profile-form">
              <div class="luoi-thong-tin-ho-so">
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-profile-full-name">Họ và tên</label>
                  <input class="truong-nhap" id="customer-profile-full-name" name="full_name" type="text" value="${escapeHtml(displayName)}" required />
                </div>
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-profile-email">Email</label>
                  <input class="truong-nhap" id="customer-profile-email" name="email" type="email" value="${escapeHtml(email)}" required />
                </div>
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-profile-phone">Số điện thoại</label>
                  <input class="truong-nhap" id="customer-profile-phone" name="phone" type="tel" value="${escapeHtml(phone)}" required />
                </div>
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-profile-contact">Đầu mối liên hệ thêm</label>
                  <input class="truong-nhap" id="customer-profile-contact" name="contact_person" type="text" value="${escapeHtml(contactPerson)}" placeholder="Nếu có người phụ trách thêm" />
                </div>
              </div>
              <div style="margin-top: 20px; display:flex; gap:12px; flex-wrap:wrap;">
                <button class="nut-hanh-dong nut-sang" type="submit">Lưu thông tin</button>
                <a class="nut-phu" href="${escapeHtml(getProjectUrl("khach-hang/dashboard.html"))}">Về dashboard</a>
              </div>
            </form>
          </section>

          <section class="the-ho-so-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Đổi mật khẩu</h3>
                <p>Đổi mật khẩu trực tiếp cho tài khoản hiện tại.</p>
              </div>
            </div>
            <div id="customer-password-feedback"></div>
            <form id="customer-password-form">
              <div class="luoi-bao-mat-ho-so">
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-password-current">Mật khẩu hiện tại</label>
                  <input class="truong-nhap" id="customer-password-current" name="current_password" type="password" required />
                </div>
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-password-new">Mật khẩu mới</label>
                  <input class="truong-nhap" id="customer-password-new" name="new_password" type="password" required />
                </div>
                <div class="nhom-truong">
                  <label class="nhan-truong" for="customer-password-confirm">Xác nhận mật khẩu mới</label>
                  <input class="truong-nhap" id="customer-password-confirm" name="confirm_password" type="password" required />
                </div>
              </div>
              <div style="margin-top: 20px;">
                <button class="nut-phu" type="submit">Cập nhật mật khẩu mô phỏng</button>
              </div>
            </form>
          </section>
        </div>

        <aside class="canh-ho-so-khach-hang">
          <section class="the-ho-so-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Tóm tắt tài khoản</h3>
                <p>Thông tin này được đồng bộ từ hồ sơ khách hàng hiện tại.</p>
              </div>
            </div>
            <div class="tom-tat-ho-so">
              <div class="the-hoso-dashboard">
                <h4>Tên hiển thị</h4>
                <strong>${escapeHtml(displayName)}</strong>
              </div>
              <div class="the-hoso-dashboard">
                <h4>Email</h4>
                <strong>${escapeHtml(email || "Chưa có dữ liệu")}</strong>
              </div>
              <div class="the-hoso-dashboard">
                <h4>Số điện thoại</h4>
                <strong>${escapeHtml(phone || "Chưa có dữ liệu")}</strong>
              </div>
            </div>
          </section>

          <section class="the-ho-so-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Lối tắt portal</h3>
              </div>
            </div>
            <div class="the-don-khach-hang__hanh-dong">
              <a class="nut-hanh-dong nut-sang" href="${escapeHtml(getProjectUrl("khach-hang/dashboard.html"))}">Dashboard</a>
              <a class="nut-phu" href="${escapeHtml(getProjectUrl("khach-hang/lich-su-yeu-cau.html"))}">Lịch sử đơn</a>
            </div>
          </section>

          <section class="the-ho-so-khach-hang">
            <div class="dashboard-khach-hang-tieu-de">
              <div>
                <h3>Gợi ý cho phase API</h3>
              </div>
            </div>
            <ol class="danh-sach-meo-lich-su">
              <li>Cập nhật hồ sơ trước khi gửi đơn mới để điều phối có đúng đầu mối liên hệ.</li>
              <li>Sau khi đổi mật khẩu, dùng lại thông tin mới cho các lần đăng nhập tiếp theo.</li>
              <li>Quay về dashboard để kiểm tra lại tên hiển thị và thông tin đã được đồng bộ.</li>
            </ol>
          </section>
        </aside>
      </div>
    `;

    const profileForm = root.querySelector("#customer-profile-form");
    const profileFeedback = root.querySelector("#customer-profile-feedback");
    const passwordForm = root.querySelector("#customer-password-form");
    const passwordFeedback = root.querySelector("#customer-password-feedback");

    function showFeedback(target, type, message) {
      if (!target) return;
      target.innerHTML = `<div class="thong-bao-ho-so is-${type}">${escapeHtml(message)}</div>`;
    }

    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const fullName = String(formData.get("full_name") || "").trim();
      const nextEmail = String(formData.get("email") || "").trim();
      const nextPhone = String(formData.get("phone") || "").trim();
      const nextContact = String(formData.get("contact_person") || "").trim();

      if (!fullName || !nextEmail || !nextPhone) {
        showFeedback(profileFeedback, "error", "Vui lòng nhập đầy đủ họ tên, email và số điện thoại.");
        return;
      }

      try {
        if (store.updateProfileOnApi) {
          const profile = await store.updateProfileOnApi({
            full_name: fullName,
            email: nextEmail,
            phone: nextPhone,
            contact_person: nextContact,
          });
          showFeedback(profileFeedback, "success", "Đã cập nhật hồ sơ khách hàng.");
          window.setTimeout(() => renderProfile({ profile }), 300);
          return;
        }
      } catch (error) {
        console.error("Cannot update customer profile API:", error);
        showFeedback(profileFeedback, "error", error.message || "Không thể cập nhật hồ sơ khách hàng.");
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
        showFeedback(passwordFeedback, "error", "Mật khẩu mới cần ít nhất 8 ký tự trong bản mô phỏng này.");
        return;
      }

      if (newPassword !== confirmPassword) {
        showFeedback(passwordFeedback, "error", "Mật khẩu xác nhận chưa khớp.");
        return;
      }

      try {
        if (store.changePasswordOnApi) {
          await store.changePasswordOnApi({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          });
          passwordForm.reset();
          showFeedback(passwordFeedback, "success", "Đổi mật khẩu thành công.");
          return;
        }
      } catch (error) {
        console.error("Cannot change customer password API:", error);
        showFeedback(passwordFeedback, "error", error.message || "Không thể đổi mật khẩu.");
        return;
      }

      passwordForm.reset();
      showFeedback(passwordFeedback, "success", "Đã ghi nhận yêu cầu đổi mật khẩu ở mức giao diện.");
    });
  }

  (async function bootstrapProfile() {
    try {
      const profile = await store.fetchProfileFromApi?.();
      renderProfile({ profile });
    } catch (error) {
      console.error("Cannot load customer profile API:", error);
      renderProfile(null);
    }
  })();
})(window, document);
