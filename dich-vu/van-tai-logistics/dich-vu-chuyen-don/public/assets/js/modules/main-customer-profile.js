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
    const cccdFrontUrl = resolveMediaUrl(identity.link_cccd_truoc || identity.cccdmattruoctenfile);
    const cccdBackUrl = resolveMediaUrl(identity.link_cccd_sau || identity.cccdmatsautenfile);
    const businessAddress = identity.dia_chi_doanh_nghiep || identity.diachidonvi || "";

    const statusMeta = getStatusMeta(identity);
    const initial = getProfileInitial(displayName);

    root.innerHTML = `
      <div class="customer-portal-shell customer-portal-shell--simple">
        <section class="customer-portal-profile customer-portal-profile-rich moving-profile-rich">
          <div class="moving-profile-hero">
            <div class="moving-profile-hero-main">
              <div class="moving-profile-avatar">
                ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="Avatar" />` : `<span>${escapeHtml(initial)}</span>`}
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
              <small><i class="fas fa-clock"></i> Cập nhật: ${escapeHtml(formatDateTime(identity.updated_at || identity.created_at))}</small>
            </div>
          </div>

          <div class="moving-profile-summary">
            <article><span>Tổng yêu cầu</span><strong>${escapeHtml(stats.total || 0)}</strong></article>
            <article><span>Hoàn tất</span><strong>${escapeHtml(stats.confirmed_count || stats.completed_count || 0)}</strong></article>
            <article><span>Tỷ lệ</span><strong>${stats.total ? Math.round(((stats.confirmed_count || stats.completed_count || 0) / stats.total) * 100) : 0}%</strong></article>
          </div>

          <div class="moving-profile-grid-container">
            <div class="moving-profile-col-main">
              <form id="customer-profile-form" class="customer-form-stack" enctype="multipart/form-data">
                <div class="customer-profile-card">
                  <div class="moving-profile-section-title">
                    <i class="fas fa-address-card"></i>
                    <h3>Thông tin định danh & Liên hệ</h3>
                  </div>
                  <div id="customer-profile-feedback" style="margin-top: 16px;"></div>
                  
                  <div class="customer-form-row" style="margin-top: 20px;">
                    <label class="customer-form-group">
                      <span>Họ và tên</span>
                      <div class="customer-form-field">
                        <i class="fas fa-user"></i>
                        <input name="hovaten" type="text" value="${escapeHtml(displayName)}" required />
                      </div>
                    </label>
                    <label class="customer-form-group">
                      <span>Email liên hệ</span>
                      <div class="customer-form-field">
                        <i class="fas fa-envelope"></i>
                        <input name="email" type="email" value="${escapeHtml(email)}" />
                      </div>
                    </label>
                  </div>
                  <div class="customer-form-row">
                    <label class="customer-form-group">
                      <span>Số điện thoại tài khoản</span>
                      <div class="customer-form-field">
                        <i class="fas fa-phone"></i>
                        <input name="sodienthoai" type="tel" value="${escapeHtml(phone)}" readonly disabled />
                      </div>
                    </label>
                    <label class="customer-form-group">
                      <span>Địa chỉ chính</span>
                      <div class="customer-form-field">
                        <i class="fas fa-location-dot"></i>
                        <input name="diachi" type="text" value="${escapeHtml(address)}" placeholder="Số nhà, đường..." />
                      </div>
                    </label>
                  </div>
                </div>

                <div class="moving-profile-accordion" style="margin-top: 24px;">
                  <div class="moving-profile-accordion-item js-accordion-item">
                    <button type="button" class="moving-profile-accordion-header js-accordion-toggle">
                      <div class="moving-profile-accordion-title">
                        <i class="fas fa-briefcase"></i>
                        <strong>Thông tin doanh nghiệp</strong>
                      </div>
                      <i class="fas fa-chevron-down moving-profile-accordion-icon"></i>
                    </button>
                    <div class="moving-profile-accordion-body">
                      <div class="customer-form-row">
                        <label class="customer-form-group">
                          <span>Tên công ty</span>
                          <div class="customer-form-field">
                            <i class="fas fa-building"></i>
                            <input name="ten_cong_ty" value="${escapeHtml(companyName)}" />
                          </div>
                        </label>
                        <label class="customer-form-group">
                          <span>Mã số thuế</span>
                          <div class="customer-form-field">
                            <i class="fas fa-receipt"></i>
                            <input name="ma_so_thue" value="${escapeHtml(taxCode)}" />
                          </div>
                        </label>
                      </div>
                      <label class="customer-form-group">
                        <span>Địa chỉ doanh nghiệp</span>
                        <div class="customer-form-field">
                          <i class="fas fa-map-location"></i>
                          <input name="dia_chi_doanh_nghiep" value="${escapeHtml(businessAddress)}" />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div class="moving-profile-accordion-item js-accordion-item" style="margin-top: 16px;">
                    <button type="button" class="moving-profile-accordion-header js-accordion-toggle">
                      <div class="moving-profile-accordion-title">
                        <i class="fas fa-images"></i>
                        <strong>Xác thực hồ sơ & Media</strong>
                      </div>
                      <i class="fas fa-chevron-down moving-profile-accordion-icon"></i>
                    </button>
                    <div class="moving-profile-accordion-body">
                      <div class="moving-profile-media-grid">
                        <article class="moving-profile-media-card">
                          <div class="moving-profile-media-head"><strong>Ảnh đại diện</strong></div>
                          <div class="moving-profile-media-preview">
                            <img id="customer-avatar-preview" src="${escapeHtml(avatarUrl || "")}" alt="Avatar" ${avatarUrl ? "" : "hidden"} />
                            <div id="customer-avatar-empty" class="moving-media-empty" ${avatarUrl ? "hidden" : ""}>Trống</div>
                          </div>
                          <label class="customer-btn customer-btn-ghost customer-btn-wide" style="margin-top: 10px; height: 36px;">
                            <input id="customer-avatar-file" name="avatar_file" type="file" accept="image/*" hidden />
                            <i class="fas fa-camera"></i> Chọn ảnh
                          </label>
                        </article>
                        <article class="moving-profile-media-card">
                          <div class="moving-profile-media-head"><strong>CCCD mặt trước</strong></div>
                          <div class="moving-profile-media-preview">
                            <img id="customer-cccd-front-preview" src="${escapeHtml(cccdFrontUrl || "")}" alt="CCCD Front" ${cccdFrontUrl ? "" : "hidden"} />
                            <div id="customer-cccd-front-empty" class="moving-media-empty" ${cccdFrontUrl ? "hidden" : ""}>Trống</div>
                          </div>
                          <label class="customer-btn customer-btn-ghost customer-btn-wide" style="margin-top: 10px; height: 36px;">
                            <input id="customer-cccd-front-file" name="cccd_front_file" type="file" accept="image/*" hidden />
                            <i class="fas fa-id-card"></i> Chọn ảnh
                          </label>
                        </article>
                        <article class="moving-profile-media-card">
                          <div class="moving-profile-media-head"><strong>CCCD mặt sau</strong></div>
                          <div class="moving-profile-media-preview">
                            <img id="customer-cccd-back-preview" src="${escapeHtml(cccdBackUrl || "")}" alt="CCCD Back" ${cccdBackUrl ? "" : "hidden"} />
                            <div id="customer-cccd-back-empty" class="moving-media-empty" ${cccdBackUrl ? "hidden" : ""}>Trống</div>
                          </div>
                          <label class="customer-btn customer-btn-ghost customer-btn-wide" style="margin-top: 10px; height: 36px;">
                            <input id="customer-cccd-back-file" name="cccd_back_file" type="file" accept="image/*" hidden />
                            <i class="fas fa-id-card-clip"></i> Chọn ảnh
                          </label>
                        </article>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="customer-profile-card moving-profile-save-card" style="margin-top: 24px; text-align: center;">
                  <button class="customer-btn customer-btn-primary" type="submit" id="customer-profile-submit-btn" style="min-width: 220px;">
                    <i class="fas fa-floppy-disk"></i> Lưu tất cả thay đổi
                  </button>
                </div>
              </form>
            </div>

            <div class="moving-profile-col-side">
              <div class="customer-profile-card">
                <div class="moving-profile-section-title">
                  <i class="fas fa-shield-halved"></i>
                  <h3>Bảo mật</h3>
                </div>
                <div id="customer-password-feedback" style="margin-top: 16px;"></div>
                <form id="customer-password-form" class="customer-form-stack" style="margin-top: 20px;">
                  <div class="customer-form-group">
                    <span>Mật khẩu hiện tại</span>
                    <div class="customer-form-field">
                      <i class="fas fa-key"></i>
                      <input name="current_password" type="password" required />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Mật khẩu mới</span>
                    <div class="customer-form-field">
                      <i class="fas fa-lock"></i>
                      <input name="new_password" type="password" minlength="8" required />
                    </div>
                  </div>
                  <div class="customer-form-group">
                    <span>Xác nhận mật khẩu</span>
                    <div class="customer-form-field">
                      <i class="fas fa-circle-check"></i>
                      <input name="confirm_password" type="password" minlength="8" required />
                    </div>
                  </div>
                  <button class="customer-btn customer-btn-ghost customer-btn-wide" type="submit" style="margin-top: 12px;">
                    <i class="fas fa-sync"></i> Đổi mật khẩu
                  </button>
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
    bindMediaPreview("customer-cccd-front-file", "customer-cccd-front-preview", "customer-cccd-front-empty");
    bindMediaPreview("customer-cccd-back-file", "customer-cccd-back-preview", "customer-cccd-back-empty");

    bindAccordionToggle(root);

    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const submitButton = root.querySelector("#customer-profile-submit-btn");

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';
        }
        if (store.updateProfile) {
          const profile = await store.updateProfile({
            hovaten: String(formData.get("hovaten") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            sodienthoai: phone,
            diachi: String(formData.get("diachi") || "").trim(),
            ten_cong_ty: String(formData.get("ten_cong_ty") || "").trim(),
            ma_so_thue: String(formData.get("ma_so_thue") || "").trim(),
            dia_chi_doanh_nghiep: String(formData.get("dia_chi_doanh_nghiep") || "").trim(),
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
          submitButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Cập nhật hồ sơ';
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

  function bindAccordionToggle(container) {
    const toggles = container.querySelectorAll(".js-accordion-toggle");
    toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".js-accordion-item");
        if (!item) return;
        const isActive = item.classList.contains("is-active");
        if (isActive) {
          item.classList.remove("is-active");
        } else {
          item.classList.add("is-active");
        }
      });
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
