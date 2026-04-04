(function (window, document) {
  var form = document.getElementById("providerLoginForm");
  if (!form) return;

  var inputPhone = document.getElementById("providerPhone");
  var inputPassword = document.getElementById("providerPassword");
  var errorPhone = document.getElementById("providerPhoneError");
  var errorPassword = document.getElementById("providerPasswordError");
  var btnTogglePassword = document.getElementById("toggleProviderPassword");
  var btnSubmit = document.getElementById("providerSubmitBtn");
  var loginStatus = document.getElementById("providerLoginStatus");

  var LOGIN_TABLE = "nhacungcap_giatuinhanh";
  var SESSION_ENDPOINT = "public/session-user.php";

  function isPhoneVN(value) {
    return /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/.test(value);
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

  function setFieldError(inputNode, errorNode, message) {
    if (!inputNode || !errorNode) return;

    errorNode.textContent = message || "";
    inputNode.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validatePhone() {
    var value = String(
      inputPhone && inputPhone.value ? inputPhone.value : "",
    ).trim();
    setFieldError(inputPhone, errorPhone, "");

    if (!value) {
      setFieldError(inputPhone, errorPhone, "Vui lòng nhập số điện thoại.");
      return false;
    }

    if (!isPhoneVN(value)) {
      setFieldError(
        inputPhone,
        errorPhone,
        "Định dạng số điện thoại chưa hợp lệ.",
      );
      return false;
    }

    return true;
  }

  function validatePassword() {
    var value = String(
      inputPassword && inputPassword.value ? inputPassword.value : "",
    );
    setFieldError(inputPassword, errorPassword, "");

    if (!value.trim()) {
      setFieldError(inputPassword, errorPassword, "Vui lòng nhập mật khẩu.");
      return false;
    }

    if (value.length < 6) {
      setFieldError(
        inputPassword,
        errorPassword,
        "Mật khẩu cần tối thiểu 6 ký tự.",
      );
      return false;
    }

    return true;
  }

  function setStatus(message, isError) {
    if (!loginStatus) return;

    loginStatus.textContent = message;
    loginStatus.classList.remove("d-none", "alert-success", "alert-danger");
    loginStatus.classList.add(isError ? "alert-danger" : "alert-success");
  }

  function extractFirstRecord(result) {
    if (Array.isArray(result)) return result[0] || null;

    var keys = ["data", "items", "rows", "result"];
    for (var i = 0; i < keys.length; i += 1) {
      var value = result && result[keys[i]];
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }
    }

    return null;
  }

  function getSupplierStatus(row) {
    var status = String((row && (row.trangthai || row.status)) || "")
      .trim()
      .toLowerCase();

    if (
      status === "active" ||
      status === "approved" ||
      status === "duyet" ||
      status === "đã duyệt" ||
      status === "da duyet"
    ) {
      return "active";
    }

    if (
      status === "blocked" ||
      status === "block" ||
      status === "locked" ||
      status === "khoa" ||
      status === "khóa"
    ) {
      return "blocked";
    }

    if (
      status === "pending" ||
      status === "cho duyet" ||
      status === "chờ duyệt" ||
      status === "chua duyet" ||
      status === "chưa duyệt"
    ) {
      return "pending";
    }

    return "pending";
  }

  function mapSessionUser(row) {
    return {
      ...row,
      id: row.id || row.idnhacungcap || row.provider_id || "",
      user_name: row.user_name || row.hovaten || row.ten || "Nhà cung cấp",
      user_tel: row.user_tel || row.sodienthoai || row.phone || "",
      user_email: row.user_email || row.email || "",
      account_type: "provider",
    };
  }

  async function findSupplier(phone, password) {
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
            value: normalizePhone(phone),
          },
          {
            field: "matkhau",
            operator: "=",
            value: password,
          },
        ],
        limit: 1,
      }),
    );

    return extractFirstRecord(response);
  }

  async function setSession(user) {
    var response = await fetch(SESSION_ENDPOINT + "?action=set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ user: user }),
    });

    var result = await response.json().catch(function () {
      return null;
    });

    if (!response.ok || !result || result.success !== true) {
      throw new Error(
        (result && result.message) || "Không thể tạo phiên đăng nhập.",
      );
    }
  }

  if (btnTogglePassword) {
    btnTogglePassword.addEventListener("click", function () {
      var hidden = inputPassword.type === "password";
      inputPassword.type = hidden ? "text" : "password";
      btnTogglePassword.textContent = hidden ? "Ẩn" : "Hiện";
      btnTogglePassword.setAttribute(
        "aria-label",
        hidden ? "Ẩn mật khẩu" : "Hiện mật khẩu",
      );
      btnTogglePassword.setAttribute("aria-pressed", hidden ? "true" : "false");
    });
  }

  if (inputPhone) {
    inputPhone.addEventListener("blur", validatePhone);
  }

  if (inputPassword) {
    inputPassword.addEventListener("blur", validatePassword);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (loginStatus) {
      loginStatus.classList.add("d-none");
    }

    var validPhone = validatePhone();
    var validPassword = validatePassword();
    if (!validPhone || !validPassword) {
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span><span class="btn-text">Đang xử lý...</span>';
    }

    try {
      var account = await findSupplier(inputPhone.value, inputPassword.value);
      if (!account) {
        setStatus("Sai số điện thoại hoặc mật khẩu.", true);
        return;
      }

      var supplierStatus = getSupplierStatus(account);

      if (supplierStatus === "blocked") {
        setStatus("Tài khoản nhà cung cấp đang bị khóa.", true);
        return;
      }

      if (supplierStatus === "pending") {
        setStatus("Tài khoản chưa được duyệt.", true);
        return;
      }

      if (supplierStatus !== "active") {
        setStatus(
          "Không thể đăng nhập với trạng thái tài khoản hiện tại.",
          true,
        );
        return;
      }

      var sessionUser = mapSessionUser(account);
      if (!sessionUser.user_tel) {
        throw new Error("Dữ liệu tài khoản không hợp lệ.");
      }

      await setSession(sessionUser);
      setStatus("Đăng nhập thành công! Đang chuyển trang...", false);

      setTimeout(function () {
        window.location.href = "nha-cung-cap.html";
      }, 600);
    } catch (error) {
      setStatus(
        error && error.message
          ? error.message
          : "Đăng nhập thất bại. Vui lòng thử lại.",
        true,
      );
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span class="btn-text">Đăng nhập</span>';
      }
    }
  });
})(window, document);
