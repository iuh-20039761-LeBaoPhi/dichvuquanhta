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
    if (role && role !== "khach-hang") {
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
    const companyName = String(identity.ten_cong_ty || identity.company_name || "").trim();
    const taxCode = String(identity.ma_so_thue || identity.tax_code || "").trim();
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
                <p class="moving-profile-eyebrow">Hồ sơ khách hàng chuyển dọn</p>
                <h2>${escapeHtml(displayName)}</h2>
                <div class="moving-profile-meta">
                  <span><i class="fas fa-phone"></i> ${escapeHtml(phone || "Chưa cập nhật")}</span>
                  <span><i class="fas fa-envelope"></i> ${escapeHtml(email || "Chưa cập nhật")}</span>
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
            <form id="customer-profile-form" class="customer-form-stack moving-profile-main" enctype="multipart/form-data">
              <div class="customer-profile-card moving-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-user-gear"></i>
                  <div>
                    <h3>Thông tin liên hệ</h3>
                    <p class="customer-profile-card-note">Cập nhật thông tin dùng cho các đơn chuyển dọn tiếp theo.</p>
                  </div>
                </div>
                <div id="customer-profile-feedback"></div>
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
                      <input name="diachi" type="text" value="${escapeHtml(address)}" placeholder="Số nhà, đường, phường/xã..." />
                      <i class="fas fa-location-dot"></i>
                    </div>
                  </label>
                </div>
                <div class="customer-form-row">
                  <label class="customer-form-group">
                    <span>Tên công ty</span>
                    <div class="customer-form-field">
                      <input name="ten_cong_ty" type="text" value="${escapeHtml(companyName)}" placeholder="Tên công ty / hộ kinh doanh" />
                      <i class="fas fa-building"></i>
                    </div>
                  </label>
                  <label class="customer-form-group">
                    <span>Mã số thuế</span>
                    <div class="customer-form-field">
                      <input name="ma_so_thue" type="text" value="${escapeHtml(taxCode)}" placeholder="Nhập mã số thuế" />
                      <i class="fas fa-receipt"></i>
                    </div>
                  </label>
                </div>
                <p class="customer-form-helper customer-form-helper-compact">
                  <i class="fas fa-circle-info"></i> Số điện thoại là định danh tài khoản, hiện không thể chỉnh sửa tại đây.
                </p>
                <div class="customer-inline-actions">
                  <button class="customer-btn customer-btn-primary" type="submit" id="customer-profile-submit-btn">
                    <i class="fas fa-floppy-disk"></i> Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>

            <div class="moving-profile-side">
              <div class="customer-profile-card moving-profile-card">
                <div class="customer-profile-card-head">
                  <i class="fas fa-images"></i>
                  <div>
                    <h3>Ảnh đại diện và CCCD</h3>
                    <p class="customer-profile-card-note">Tương thích cả dữ liệu cũ và dữ liệu upload mới từ bảng nguoidung.</p>
                  </div>
                </div>
                <div class="moving-media-grid">
                  <article class="moving-media-card">
                    <div class="moving-media-head"><strong>Ảnh đại diện</strong><span>Hồ sơ</span></div>
                    <div class="moving-media-preview">
                      <img id="customer-avatar-preview" src="${escapeHtml(avatarUrl || "")}" alt="Ảnh đại diện" ${avatarUrl ? "" : "hidden"} />
                      <div id="customer-avatar-empty" class="moving-media-empty" ${avatarUrl ? "hidden" : ""}>Chưa có ảnh đại diện</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost moving-upload-btn">
                      <input id="customer-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-camera"></i> Chọn ảnh
                    </label>
                  </article>

                  <article class="moving-media-card">
                    <div class="moving-media-head"><strong>CCCD mặt trước</strong><span>Xác minh</span></div>
                    <div class="moving-media-preview">
                      <img id="customer-cccd-front-preview" src="${escapeHtml(cccdFrontUrl || "")}" alt="CCCD mặt trước" ${cccdFrontUrl ? "" : "hidden"} />
                      <div id="customer-cccd-front-empty" class="moving-media-empty" ${cccdFrontUrl ? "hidden" : ""}>Chưa có CCCD mặt trước</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost moving-upload-btn">
                      <input id="customer-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                      <i class="fas fa-id-card"></i> Chọn ảnh
                    </label>
                  </article>

                  <article class="moving-media-card">
                    <div class="moving-media-head"><strong>CCCD mặt sau</strong><span>Xác minh</span></div>
                    <div class="moving-media-preview">
                      <img id="customer-cccd-back-preview" src="${escapeHtml(cccdBackUrl || "")}" alt="CCCD mặt sau" ${cccdBackUrl ? "" : "hidden"} />
                      <div id="customer-cccd-back-empty" class="moving-media-empty" ${cccdBackUrl ? "hidden" : ""}>Chưa có CCCD mặt sau</div>
                    </div>
                    <label class="customer-btn customer-btn-ghost moving-upload-btn">
                      <input id="customer-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
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
                    <p class="customer-profile-card-note">Đổi mật khẩu đăng nhập cho khu khách hàng chuyển dọn.</p>
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
          </div>
        </section>
      </div>
    `;

    const profileForm = root.querySelector("#customer-profile-form");
    const profileFeedback = root.querySelector("#customer-profile-feedback");
    const passwordForm = root.querySelector("#customer-password-form");
    const passwordFeedback = root.querySelector("#customer-password-feedback");

    bindMediaPreview("customer-avatar-file", "customer-avatar-preview", "customer-avatar-empty");
    bindMediaPreview(
      "customer-cccd-front-file",
      "customer-cccd-front-preview",
      "customer-cccd-front-empty",
    );
    bindMediaPreview(
      "customer-cccd-back-file",
      "customer-cccd-back-preview",
      "customer-cccd-back-empty",
    );

    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const hoVaTen = String(formData.get("hovaten") || "").trim();
      const nextEmail = String(formData.get("email") || "").trim();
      const nextPhone = phone;
      const submitButton = root.querySelector("#customer-profile-submit-btn");

      if (!hoVaTen || !nextPhone) {
        showFeedback(profileFeedback, "error", "Vui lòng nhập đầy đủ họ tên và số điện thoại.");
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
            ten_cong_ty: String(formData.get("ten_cong_ty") || "").trim(),
            ma_so_thue: String(formData.get("ma_so_thue") || "").trim(),
            avatar_file: formData.get("avatar_file"),
            cccd_front_file: formData.get("cccd_front_file"),
            cccd_back_file: formData.get("cccd_back_file"),
          });
          showFeedback(profileFeedback, "success", "Đã cập nhật hồ sơ khách hàng.");
          window.setTimeout(() => renderProfile({ profile, stats }), 300);
          return;
        }
      } catch (error) {
        console.error("Cannot update customer profile store:", error);
        showFeedback(profileFeedback, "error", error.message || "Không thể cập nhật hồ sơ khách hàng.");
        return;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Lưu thay đổi';
        }
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
      console.error("Cannot load customer profile store:", error);
      renderProfile(null);
    }
  })();

  const moduleApi = {};
  window.__fastGoCustomerProfileModule = moduleApi;
  return moduleApi;
})(window, document);

export default customerProfileModule;
