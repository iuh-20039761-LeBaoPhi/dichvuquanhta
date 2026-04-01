(function (window, document) {
  var SESSION_ENDPOINT = "public/session-user.php";
  var LOGIN_TABLE = "khachhang";

  var form = document.getElementById("loginForm");
  if (!form) return;

  var identityInput = document.getElementById("identity");
  var passwordInput = document.getElementById("password");
  var identityError = document.getElementById("identityError");
  var passwordError = document.getElementById("passwordError");
  var togglePasswordBtn = document.getElementById("togglePassword");
  var submitBtn = document.getElementById("submitBtn");
  var loginStatus = document.getElementById("loginStatus");

  function isPhoneVN(value) {
    return /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/.test(value);
  }

  function validateIdentity() {
    var value = String(identityInput.value || "").trim();
    identityError.textContent = "";
    identityInput.setAttribute("aria-invalid", "false");

    if (!value) {
      identityError.textContent = "Vui lòng nhập số điện thoại.";
      identityInput.setAttribute("aria-invalid", "true");
      return false;
    }

    if (!isPhoneVN(value)) {
      identityError.textContent =
        "Định dạng chưa đúng. Hãy nhập số điện thoại hợp lệ.";
      identityInput.setAttribute("aria-invalid", "true");
      return false;
    }

    return true;
  }

  function validatePassword() {
    var value = String(passwordInput.value || "");
    passwordError.textContent = "";
    passwordInput.setAttribute("aria-invalid", "false");

    if (!value.trim()) {
      passwordError.textContent = "Vui lòng nhập mật khẩu.";
      passwordInput.setAttribute("aria-invalid", "true");
      return false;
    }

    if (value.length < 6) {
      passwordError.textContent = "Mật khẩu cần tối thiểu 6 ký tự.";
      passwordInput.setAttribute("aria-invalid", "true");
      return false;
    }

    return true;
  }

  function setStatus(message, variant) {
    if (!loginStatus) return;

    loginStatus.textContent = message;
    loginStatus.classList.remove("d-none", "alert-success", "alert-danger");
    loginStatus.classList.add(
      "alert",
      variant === "error" ? "alert-danger" : "alert-success",
    );
  }

  function normalizePhone(value) {
    var phone = String(value || "")
      .replace(/\s+/g, "")
      .trim();
    if (phone.indexOf("+84") === 0) return "0" + phone.slice(3);
    if (phone.indexOf("84") === 0 && phone.length >= 11)
      return "0" + phone.slice(2);
    return phone;
  }

  function extractFirstRecord(result) {
    if (Array.isArray(result)) return result[0] || null;

    var keys = ["data", "items", "rows", "result"];
    for (var i = 0; i < keys.length; i += 1) {
      var value = result && result[keys[i]];
      if (Array.isArray(value) && value.length) return value[0];
    }

    return null;
  }

  function mapSessionUser(row) {
    if (!row || typeof row !== "object") return null;

    return {
      id: row.id || row.makhachhang || row.user_id || "",
      user_name: row.user_name || row.hovaten || row.ten || "",
      user_tel: row.user_tel || row.sodienthoai || row.phone || "",
      user_email: row.user_email || row.email || "",
    };
  }

  async function findValidUser(identity, password) {
    if (typeof window.krudList !== "function") {
      throw new Error("KRUD chưa sẵn sàng. Vui lòng tải lại trang.");
    }

    var response = await Promise.resolve(
      window.krudList({
        table: LOGIN_TABLE,
        where: [
          {
            field: "sodienthoai",
            operator: "=",
            value: normalizePhone(identity),
          },
          { field: "matkhau", operator: "=", value: password },
        ],
        limit: 1,
      }),
    );

    return extractFirstRecord(response);
  }

  async function setSessionUser(user) {
    var response = await fetch(SESSION_ENDPOINT + "?action=set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ user: user }),
    });

    var result = await response.json();
    if (!response.ok || !result || result.success !== true) {
      throw new Error(
        (result && result.message) || "Không thể lưu phiên đăng nhập.",
      );
    }

    return result;
  }

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", function () {
      var isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePasswordBtn.textContent = isHidden ? "Ẩn" : "Hiện";
      togglePasswordBtn.setAttribute(
        "aria-label",
        isHidden ? "Ẩn mật khẩu" : "Hiện mật khẩu",
      );
      togglePasswordBtn.setAttribute(
        "aria-pressed",
        isHidden ? "true" : "false",
      );
    });
  }

  if (identityInput) identityInput.addEventListener("blur", validateIdentity);
  if (passwordInput) passwordInput.addEventListener("blur", validatePassword);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginStatus.classList.add("d-none");

    var isIdentityValid = validateIdentity();
    var isPasswordValid = validatePassword();
    if (!isIdentityValid || !isPasswordValid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span><span class="btn-text">Đang xử lý...</span>';

    try {
      var row = await findValidUser(identityInput.value, passwordInput.value);
      if (!row) {
        setStatus("Sai số điện thoại hoặc mật khẩu.", "error");
        return;
      }

      var sessionUser = mapSessionUser(row);
      if (!sessionUser || !sessionUser.user_tel) {
        throw new Error("Dữ liệu tài khoản không hợp lệ.");
      }

      await setSessionUser(sessionUser);
      setStatus("Đăng nhập thành công! Đang chuyển trang...", "success");

      setTimeout(function () {
        window.location.href = "index.html";
      }, 500);
    } catch (error) {
      setStatus(
        error && error.message ? error.message : "Đăng nhập thất bại.",
        "error",
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-text">Đăng nhập</span>';
    }
  });
})(window, document);
