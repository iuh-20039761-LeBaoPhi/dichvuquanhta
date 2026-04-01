(function (window, document) {
  if (window.__fastGoAuthInitDone) return;
  window.__fastGoAuthInitDone = true;

  const core = window.FastGoCore || {};
  const storageKeyRole = "fastgo-auth-role";
  const storageKeyIdentity = "fastgo-auth-identity";
  const storageKeyUsers = "fastgo-auth-users";
  const authTableByRole = {
    "khach-hang": "dich_vu_chuyen_don_customers",
    "doi-tac": "dich_vu_chuyen_don_partners",
  };
  const validRoles = new Set(["khach-hang", "doi-tac"]);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const vnPhonePattern = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;
  const passwordRulePattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,32}$/;

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot parse auth payload:", error);
      return fallback;
    }
  }

  function readUsers() {
    try {
      const users = safeParse(window.localStorage.getItem(storageKeyUsers), []);
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error("Cannot read auth users:", error);
      return [];
    }
  }

  function writeUsers(users) {
    try {
      window.localStorage.setItem(storageKeyUsers, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error("Cannot persist auth users:", error);
      return false;
    }
  }

  function getAuthTable(role) {
    return authTableByRole[String(role || "").trim().toLowerCase()] || "";
  }

  function getListFn() {
    if (typeof window.krudList === "function") {
      return (payload) => window.krudList(payload);
    }

    if (typeof window.crud === "function") {
      return (payload) =>
        window.crud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 300,
        });
    }

    if (typeof window.krud === "function") {
      return (payload) =>
        window.krud("list", payload.table, {
          p: payload.page || 1,
          limit: payload.limit || 300,
        });
    }

    return null;
  }

  function getInsertFn() {
    if (typeof window.crud === "function") {
      return (tableName, data) => window.crud("insert", tableName, data);
    }

    if (typeof window.krud === "function") {
      return (tableName, data) => window.krud("insert", tableName, data);
    }

    return null;
  }

  function extractRows(payload, depth) {
    const level = Number(depth || 0);
    if (level > 4 || payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    const candidateKeys = ["data", "items", "rows", "list", "result", "payload"];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      const nested = extractRows(value, level + 1);
      if (nested.length) return nested;
    }

    return [];
  }

  function getUserKey(role, email) {
    return `${String(role || "").trim().toLowerCase()}::${String(email || "").trim().toLowerCase()}`;
  }

  function normalizeUserRecord(payload) {
    const role = String(payload?.role || "khach-hang").trim().toLowerCase();
    const email = String(payload?.email || "").trim().toLowerCase();
    const fullName = String(payload?.full_name || payload?.fullName || "").trim();
    const contactPerson = String(payload?.contact_person || payload?.contactPerson || "").trim();
    const phone = normalizePhone(payload?.phone || "");

    return {
      key: getUserKey(role, email),
      id: String(payload?.id || payload?.remote_id || "").trim(),
      role,
      email,
      full_name: fullName,
      fullName,
      contact_person: contactPerson,
      contactPerson,
      phone,
      password: String(payload?.password || ""),
      created_at: String(payload?.created_at || new Date().toISOString()).trim(),
      updated_at: new Date().toISOString(),
    };
  }

  function normalizeKrudUserRecord(role, row) {
    return normalizeUserRecord({
      id: row?.id || "",
      role,
      email: row?.email || "",
      full_name: row?.full_name || row?.fullName || row?.ho_ten || row?.ten_don_vi || "",
      contact_person:
        row?.contact_person ||
        row?.contactPerson ||
        row?.nguoi_phu_trach ||
        row?.nguoi_lien_he ||
        "",
      phone: row?.phone || row?.so_dien_thoai || "",
      password: row?.password || row?.mat_khau || "",
      created_at: row?.created_at || row?.created_date || "",
    });
  }

  async function listUsersFromKrud(role) {
    const listFn = getListFn();
    const tableName = getAuthTable(role);
    if (!listFn || !tableName) return [];

    const response = await listFn({
      table: tableName,
      sort: { id: "desc" },
      page: 1,
      limit: 300,
    });

    return extractRows(response).map((row) => normalizeKrudUserRecord(role, row));
  }

  async function insertUserToKrud(payload) {
    const insertFn = getInsertFn();
    const tableName = getAuthTable(payload?.role);
    if (!insertFn || !tableName) return null;

    const extraFields = payload?.extra_fields && typeof payload.extra_fields === "object"
      ? payload.extra_fields
      : {};

    return insertFn(tableName, {
      role: String(payload?.role || "").trim().toLowerCase(),
      email: String(payload?.email || "").trim().toLowerCase(),
      full_name: String(payload?.full_name || payload?.fullName || "").trim(),
      contact_person: String(payload?.contact_person || payload?.contactPerson || "").trim(),
      phone: normalizePhone(payload?.phone || ""),
      password: String(payload?.password || ""),
      created_at: new Date().toISOString(),
      ...extraFields,
    });
  }

  function saveIdentityToStorage(payload) {
    try {
      window.localStorage.setItem(
        storageKeyIdentity,
        JSON.stringify({
          role: String(payload?.role || "").trim(),
          email: String(payload?.email || "").trim(),
          phone: normalizePhone(payload?.phone || ""),
          fullName: String(payload?.full_name || payload?.fullName || "").trim(),
          full_name: String(payload?.full_name || payload?.fullName || "").trim(),
          contact_person: String(payload?.contact_person || payload?.contactPerson || "").trim(),
          contactPerson: String(payload?.contact_person || payload?.contactPerson || "").trim(),
        }),
      );
    } catch (error) {
      console.error("Cannot persist auth identity:", error);
    }
  }

  async function requestAuth(mode, payload) {
    const role = String(payload?.role || "khach-hang").trim().toLowerCase();
    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");
    let users = [];

    try {
      users = await listUsersFromKrud(role);
    } catch (error) {
      console.error("Cannot read auth users from KRUD:", error);
      users = [];
    }

    if (!users.length) {
      users = readUsers();
    }

    const userKey = getUserKey(role, email);
    const existingUser = users.find((user) => user.key === userKey);

    if (mode === "register") {
      if (existingUser) {
        throw new Error("Email này đã được dùng cho vai trò đã chọn.");
      }

      const nextUser = normalizeUserRecord(payload);
      let krudInsertSucceeded = false;

      try {
        const krudResult = await insertUserToKrud(payload);
        const remoteId = String(
          krudResult?.id ||
            krudResult?.insertId ||
            krudResult?.insert_id ||
            krudResult?.data?.id ||
            "",
        ).trim();
        if (remoteId) nextUser.id = remoteId;
        krudInsertSucceeded = true;
      } catch (error) {
        console.error("Cannot insert auth user to KRUD:", error);
      }

      writeUsers([nextUser, ...users]);
      saveIdentityToStorage(nextUser);

      return {
        status: "success",
        message: krudInsertSucceeded
          ? "Đăng ký thành công và đã lưu lên KRUD."
          : "Đăng ký thành công trong chế độ lưu trữ cục bộ.",
        user: nextUser,
      };
    }

    if (!existingUser || existingUser.password !== password) {
      throw new Error("Email, mật khẩu hoặc vai trò chưa đúng.");
    }

    const nextUser = normalizeUserRecord({
      ...existingUser,
      updated_at: new Date().toISOString(),
    });
    const nextUsers = users.map((user) => (user.key === userKey ? nextUser : user));
    writeUsers(nextUsers);
    saveIdentityToStorage(nextUser);

    return {
      status: "success",
      message: "Đăng nhập thành công trong chế độ lưu trữ cục bộ.",
      user: nextUser,
    };
  }

  function showFieldError(input, message) {
    if (typeof core.showFieldError === "function") {
      core.showFieldError(input, message);
      return;
    }

    if (!input) return;
    input.classList.add("input-error");
    let errorSpan = input.parentNode.querySelector(".field-error-msg");
    if (!errorSpan) {
      errorSpan = document.createElement("span");
      errorSpan.className = "field-error-msg";
      input.parentNode.appendChild(errorSpan);
    }
    errorSpan.innerText = message;
  }

  function clearFieldError(input) {
    if (typeof core.clearFieldError === "function") {
      core.clearFieldError(input);
      return;
    }

    if (!input) return;
    input.classList.remove("input-error");
    const errorSpan = input.parentNode.querySelector(".field-error-msg");
    if (errorSpan) errorSpan.remove();
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function setFeedback(feedback, message, state) {
    if (!feedback) return;
    feedback.hidden = false;
    feedback.dataset.authFeedbackState = state || "info";
    feedback.innerHTML = message;
  }

  function clearFeedback(feedback) {
    if (!feedback) return;
    feedback.hidden = true;
    feedback.innerHTML = "";
    delete feedback.dataset.authFeedbackState;
  }

  function clearFormErrors(form) {
    form.querySelectorAll(".input-error").forEach((element) => {
      element.classList.remove("input-error");
    });

    form.querySelectorAll(".field-error-msg").forEach((element) => {
      element.remove();
    });
  }

  function validateRequired(input, message, getValue) {
    const value = typeof getValue === "function" ? getValue() : normalizeText(input.value);
    if (!value) {
      showFieldError(input, message);
      return false;
    }
    return true;
  }

  function validateEmailField(input, requiredMessage) {
    const value = normalizeText(input.value);
    if (!validateRequired(input, requiredMessage || "Nhập email để tiếp tục.", () => value)) {
      return false;
    }

    if (!emailPattern.test(value)) {
      showFieldError(input, "Email chưa đúng định dạng.");
      return false;
    }
    return true;
  }

  function validatePhoneField(input, options) {
    const config = options || {};
    const value = normalizePhone(input.value);

    if (!value) {
      if (config.required) {
        showFieldError(input, config.requiredMessage || "Nhập số điện thoại để tiếp tục.");
        return false;
      }
      return true;
    }

    if (!vnPhonePattern.test(value)) {
      showFieldError(input, config.invalidMessage || "Số điện thoại chưa đúng định dạng Việt Nam.");
      return false;
    }
    return true;
  }

  function validateNameField(input, label, min, max) {
    const value = normalizeText(input.value);
    if (!validateRequired(input, `Nhập ${label.toLowerCase()}.`, () => value)) {
      return false;
    }

    if (value.length < min || value.length > max) {
      showFieldError(input, `${label} cần từ ${min} đến ${max} ký tự.`);
      return false;
    }
    return true;
  }

  function validateOptionalTextField(input, label, min, max) {
    const value = normalizeText(input.value);
    if (!value) return true;

    if (value.length < min || value.length > max) {
      showFieldError(input, `${label} cần từ ${min} đến ${max} ký tự nếu có nhập.`);
      return false;
    }
    return true;
  }

  function validateRequiredTextField(input, label, min, max) {
    const value = normalizeText(input.value);
    if (!validateRequired(input, `Nhập ${label.toLowerCase()}.`, () => value)) {
      return false;
    }

    if (value.length < min || value.length > max) {
      showFieldError(input, `${label} cần từ ${min} đến ${max} ký tự.`);
      return false;
    }
    return true;
  }

  function validatePasswordField(input, mode) {
    const value = String(input.value || "");
    if (!validateRequired(input, "Nhập mật khẩu.", () => value.trim())) {
      return false;
    }

    if (mode === "register" && !passwordRulePattern.test(value)) {
      showFieldError(
        input,
        "Mật khẩu cần 8-32 ký tự, gồm chữ hoa, chữ thường và số, không có khoảng trắng.",
      );
      return false;
    }

    if (mode === "login" && value.length < 6) {
      showFieldError(input, "Mật khẩu cần ít nhất 6 ký tự.");
      return false;
    }
    return true;
  }

  function validateConfirmPasswordField(passwordInput, confirmInput) {
    const password = String(passwordInput.value || "");
    const confirmPassword = String(confirmInput.value || "");

    if (!validateRequired(confirmInput, "Nhập lại mật khẩu.", () => confirmPassword.trim())) {
      return false;
    }

    if (password !== confirmPassword) {
      showFieldError(confirmInput, "Mật khẩu xác nhận chưa khớp.");
      return false;
    }
    return true;
  }

  function validateCheckboxField(input, message) {
    if (input.checked) return true;
    showFieldError(input, message);
    return false;
  }

  function getField(form, name) {
    return form.querySelector(`[name="${name}"]`);
  }

  function validateForm(form, role, mode) {
    const invalidFields = [];

    function pushIfInvalid(input, validator) {
      if (!input) return;
      clearFieldError(input);
      if (!validator(input)) invalidFields.push(input);
    }

    const emailInput = getField(form, "email");
    const phoneInput = getField(form, "phone");
    const passwordInput = getField(form, "password");
    const confirmPasswordInput = getField(form, "password_confirm");
    const fullNameInput = getField(form, "full_name");
    const contactPersonInput = getField(form, "contact_person");
    const noteInput = getField(form, "note");
    const agreeTermsInput = getField(form, "agree_terms");

    pushIfInvalid(emailInput, (input) => validateEmailField(input));

    if (mode === "login") {
      pushIfInvalid(passwordInput, (input) => validatePasswordField(input, "login"));
    }

    if (mode === "register") {
      if (role === "khach-hang") {
        pushIfInvalid(fullNameInput, (input) => validateNameField(input, "Họ và tên", 2, 80));
        pushIfInvalid(phoneInput, (input) =>
          validatePhoneField(input, {
            required: true,
            requiredMessage: "Nhập số điện thoại để đăng ký.",
          }),
        );
      } else {
        pushIfInvalid(fullNameInput, (input) => validateNameField(input, "Tên đơn vị / đội nhóm", 2, 100));
        pushIfInvalid(contactPersonInput, (input) => validateNameField(input, "Người phụ trách", 2, 80));
        pushIfInvalid(phoneInput, (input) =>
          validatePhoneField(input, {
            required: true,
            requiredMessage: "Nhập số điện thoại đầu mối.",
          }),
        );
      }

      pushIfInvalid(passwordInput, (input) => validatePasswordField(input, "register"));
      pushIfInvalid(confirmPasswordInput, () =>
        validateConfirmPasswordField(passwordInput, confirmPasswordInput),
      );
      pushIfInvalid(agreeTermsInput, (input) =>
        validateCheckboxField(input, "Bạn cần đồng ý điều khoản trước khi tiếp tục."),
      );
    }

    return invalidFields;
  }

  function getRoleFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawRole = String(params.get("vai-tro") || "").trim().toLowerCase();
      if (validRoles.has(rawRole)) return rawRole;
      if (rawRole === "nha-cung-cap" || rawRole === "provider") return "doi-tac";
    } catch (error) {
      console.error("Cannot resolve auth role:", error);
    }
    return "";
  }

  function getPreferredRole() {
    const urlRole = getRoleFromUrl();
    if (urlRole) return urlRole;

    try {
      const savedRole = window.localStorage.getItem(storageKeyRole);
      if (savedRole && validRoles.has(savedRole)) return savedRole;
    } catch (error) {
      console.error("Cannot access localStorage:", error);
    }

    return "khach-hang";
  }

  function syncRole(role) {
    document.querySelectorAll("[data-auth-role-link]").forEach((link) => {
      const linkRole = link.getAttribute("data-auth-role-link");
      link.classList.toggle("is-active", linkRole === role);
    });

    document.querySelectorAll("[data-auth-role-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-auth-role-panel") !== role;
    });

    document.querySelectorAll("[data-auth-role-note]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-auth-role-note") !== role;
    });

    document.querySelectorAll("[data-auth-cross-link]").forEach((link) => {
      const mode = link.getAttribute("data-auth-cross-link");
      if (!mode) return;
      link.href = `${mode}.html?vai-tro=${role}`;
    });

    try {
      window.localStorage.setItem(storageKeyRole, role);
    } catch (error) {
      console.error("Cannot persist auth role:", error);
    }
  }

  function bindPasswordToggles() {
    document.querySelectorAll("[data-auth-password-toggle]").forEach((button) => {
      button.addEventListener("click", function () {
        const inputId = this.getAttribute("data-auth-password-toggle");
        const input = inputId ? document.getElementById(inputId) : null;
        if (!input) return;

        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        this.textContent = reveal ? "Ẩn" : "Hiện";
      });
    });
  }

  function bindUploadNamePreview() {
    document.querySelectorAll(".tep-tai-anh").forEach((input) => {
      if (!input || !input.id) return;
      const nameLabel = document.querySelector(`[data-ten-tep="${input.id}"]`);
      if (!nameLabel) return;
      const defaultText = nameLabel.textContent || "Chưa chọn tệp";
      const updateName = () => {
        if (input.files && input.files.length > 0) {
          nameLabel.textContent = input.files[0].name;
        } else {
          nameLabel.textContent = defaultText;
        }
      };
      input.addEventListener("change", updateName);
      updateName();
    });
  }

  function hydrateSavedIdentity() {
    let savedIdentity = {};

    try {
      savedIdentity = JSON.parse(window.localStorage.getItem(storageKeyIdentity) || "{}");
    } catch (error) {
      savedIdentity = {};
    }

    if (!savedIdentity || typeof savedIdentity !== "object") return;

    document.querySelectorAll("[data-auth-autofill]").forEach((input) => {
      const field = input.getAttribute("data-auth-autofill");
      const value = savedIdentity[field];
      if (typeof value === "string" && value && !input.value) {
        input.value = value;
      }
    });
  }

  function bindForms() {
    document.querySelectorAll("[data-auth-form]").forEach((form) => {
      form.noValidate = true;

      const feedback = form.querySelector("[data-auth-feedback]");
      const submitButton = form.querySelector('button[type="submit"]');

      function setSubmitting(isSubmitting, mode) {
        if (!submitButton) return;

        if (!submitButton.dataset.defaultLabel) {
          submitButton.dataset.defaultLabel = submitButton.textContent || "";
        }

        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting
          ? mode === "register"
            ? "Đang tạo tài khoản..."
            : "Đang đăng nhập..."
          : submitButton.dataset.defaultLabel;
      }

      function getRequestedRedirect() {
        try {
          const params = new URLSearchParams(window.location.search);
          const redirect = String(params.get("redirect") || "").trim();
          if (!redirect) return "";
          return typeof core.toProjectUrl === "function" ? core.toProjectUrl(redirect) : redirect;
        } catch (error) {
          console.error("Cannot resolve requested redirect:", error);
          return "";
        }
      }

      function getDefaultRedirect(role) {
        const fallback =
          role === "doi-tac" ? "index.html" : "khach-hang/dashboard.html";
        return typeof core.toProjectUrl === "function" ? core.toProjectUrl(fallback) : fallback;
      }

      function resolveRedirectUrl(result, role) {
        const requestedRedirect = getRequestedRedirect();
        if (requestedRedirect) return requestedRedirect;

        const serverRedirect = String(result?.redirect_url || "").trim();
        if (serverRedirect) {
          return typeof core.toProjectUrl === "function"
            ? core.toProjectUrl(serverRedirect)
            : serverRedirect;
        }

        return getDefaultRedirect(role);
      }

      function handleFieldInteraction(event) {
        const target = event.target;
        if (!target || !target.name) return;
        clearFieldError(target);
        clearFeedback(feedback);
      }

      form.addEventListener("input", handleFieldInteraction);
      form.addEventListener("change", handleFieldInteraction);

      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const role = form.getAttribute("data-auth-role") || "khach-hang";
        const mode = form.getAttribute("data-auth-mode") || "login";
        const formData = new FormData(form);
        clearFeedback(feedback);
        clearFormErrors(form);

        const invalidFields = validateForm(form, role, mode);
        if (invalidFields.length) {
          setFeedback(
            feedback,
            "Biểu mẫu còn trường chưa hợp lệ. Kiểm tra lại các ô đang được đánh dấu đỏ.",
            "error",
          );
          const firstInvalidField = invalidFields[0];
          if (firstInvalidField && typeof firstInvalidField.focus === "function") {
            firstInvalidField.focus();
          }
          return;
        }

        const payload = {
          role,
          email: String(formData.get("email") || "").trim(),
          full_name: String(formData.get("full_name") || "").trim(),
          contact_person: String(formData.get("contact_person") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          password: String(formData.get("password") || ""),
          password_confirm: String(formData.get("password_confirm") || ""),
          extra_fields: Array.from(form.elements).reduce((accumulator, element) => {
            const field = element;
            if (!field || !field.name) return accumulator;

            if (field instanceof HTMLInputElement && field.type === "file") {
              const files = Array.from(field.files || []).map((file) => file.name).filter(Boolean);
              if (files.length) {
                accumulator[field.name.replace(/\[\]$/, "_files")] = files.join(" | ");
              }
              return accumulator;
            }

            if (field instanceof HTMLInputElement && field.type === "checkbox") {
              if (!field.checked) return accumulator;
              const current = String(accumulator[field.name] || "").trim();
              accumulator[field.name] = current ? `${current} | ${field.value || "1"}` : field.value || "1";
              return accumulator;
            }

            const value = String(formData.get(field.name) || "").trim();
            if (value) {
              accumulator[field.name] = value;
            }
            return accumulator;
          }, {}),
        };

        setSubmitting(true, mode);

        try {
          const result = await requestAuth(mode, payload);
          const user = result.user || {};
          saveIdentityToStorage({
            role,
            email: user.email || payload.email,
            phone: user.phone || payload.phone,
            full_name: user.full_name || payload.full_name,
            contact_person: user.contact_person || payload.contact_person,
          });

          const redirectUrl = resolveRedirectUrl(result, role);
          setFeedback(
            feedback,
            `${result.message || "Xử lý tài khoản thành công."}${redirectUrl ? " Đang chuyển trang..." : ""}`,
            "success",
          );

          if (redirectUrl) {
            window.setTimeout(() => {
              window.location.href = redirectUrl;
            }, 900);
          }
        } catch (error) {
          setFeedback(
            feedback,
            error?.message || "Không thể xử lý tài khoản trong chế độ lưu trữ cục bộ.",
            "error",
          );
        } finally {
          setSubmitting(false, mode);
        }
      });
    });
  }

  const role = getPreferredRole();
  syncRole(role);
  bindPasswordToggles();
  bindUploadNamePreview();
  hydrateSavedIdentity();
  bindForms();
})(window, document);
