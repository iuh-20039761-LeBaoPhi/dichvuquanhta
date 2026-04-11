(function (window, document) {
  var USER_TABLE = "nguoidung";
  var PROVIDER_SERVICE_ID = "11";
  var LOGIN_PAGE = "../public/dang-nhap.html";
  var STANDALONE_BOOKING_PAGE = "dat-dich-vu.html";
  var bookingAccessState = window.BookingAccessState || {
    isAuthenticated: false,
    source: "none",
  };

  window.BookingAccessState = bookingAccessState;

  function normalizePhone(value) {
    var phone = String(value || "")
      .replace(/\s+/g, "")
      .trim();

    if (phone.indexOf("+84") === 0) return "0" + phone.slice(3);
    if (phone.indexOf("84") === 0 && phone.length >= 11)
      return "0" + phone.slice(2);

    return phone;
  }

  function parseUrlCredentials() {
    var params = new URLSearchParams(window.location.search || "");
    return {
      phone: String(params.get("sodienthoai") || "").trim(),
      password: String(params.get("password") || "").trim(),
    };
  }

  function buildStandaloneUrl(phone, password) {
    var target = new URL(STANDALONE_BOOKING_PAGE, window.location.href);
    if (phone) target.searchParams.set("sodienthoai", phone);
    if (password) target.searchParams.set("password", password);
    return target.pathname + target.search;
  }

  function extractRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
  }

  function queryByWhere(table, where) {
    if (typeof window.krudList !== "function") {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      window.krudList({
        table: table,
        where: where,
        page: 1,
        limit: 1,
      }),
    )
      .then(function (result) {
        var rows = extractRows(result);
        return rows.length ? rows[0] : null;
      })
      .catch(function () {
        return null;
      });
  }

  function authenticateByUrlCredentials(phone, password) {
    var normalizedPhone = normalizePhone(phone);
    var phoneFields = ["sodienthoai", "user_tel", "phone"];
    var passwordFields = ["matkhau", "password", "user_password"];

    function tryPair(indexPhone, indexPassword) {
      if (indexPhone >= phoneFields.length) {
        return Promise.resolve(null);
      }

      if (indexPassword >= passwordFields.length) {
        return tryPair(indexPhone + 1, 0);
      }

      return queryByWhere(USER_TABLE, [
        {
          field: phoneFields[indexPhone],
          operator: "=",
          value: normalizedPhone,
        },
        {
          field: passwordFields[indexPassword],
          operator: "=",
          value: password,
        },
      ]).then(function (row) {
        if (row) return row;
        return tryPair(indexPhone, indexPassword + 1);
      });
    }

    return tryPair(0, 0);
  }

  function containsServiceId(idDichVu, targetId) {
    var target = String(targetId || "").trim();
    if (!target) return false;

    return (
      String(idDichVu || "")
        .split(",")
        .map(function (value) {
          return value.trim();
        })
        .indexOf(target) !== -1
    );
  }

  function isProviderAccount(user) {
    return containsServiceId(user && user.id_dichvu, PROVIDER_SERVICE_ID);
  }

  function toBookingUser(user) {
    if (!user || typeof user !== "object") return null;

    return {
      name: String(user.user_name || user.hovaten || user.ten || "").trim(),
      phone: normalizePhone(user.user_tel || user.sodienthoai || user.phone),
      address: String(user.diachi || user.address || "").trim(),
    };
  }

  function fillBookingFormUser(user) {
    var mapped = toBookingUser(user);
    if (!mapped) return;

    var nameInput = document.getElementById("hotenkhachhang");
    var phoneInput = document.getElementById("sodienthoaikhachhang");
    var addressInput = document.getElementById("diachi");

    if (nameInput && mapped.name) {
      nameInput.value = mapped.name;
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (phoneInput && mapped.phone) {
      phoneInput.value = mapped.phone;
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (addressInput && mapped.address) {
      addressInput.value = mapped.address;
      addressInput.dispatchEvent(new Event("input", { bubbles: true }));
      addressInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function setBookingInteractionDisabled(disabled) {
    var form = document.getElementById("formdatdichvu");
    if (form) {
      var controls = form.querySelectorAll("input, select, textarea, button");
      controls.forEach(function (node) {
        if (node.id === "confirmBackBtn" || node.id === "confirmCloseBtn") {
          return;
        }

        if (disabled) {
          node.setAttribute("disabled", "disabled");
        } else {
          node.removeAttribute("disabled");
        }
      });
    }

    var confirmBtn = document.getElementById("confirmSubmitBtn");
    if (confirmBtn) {
      if (disabled) confirmBtn.setAttribute("disabled", "disabled");
      else confirmBtn.removeAttribute("disabled");
    }
  }

  function showStandaloneAccessError(message) {
    var shell = document.querySelector(".booking-shell") || document.body;
    var existing = document.getElementById("bookingAccessError");
    if (existing) {
      existing.textContent = message;
      return;
    }

    var alert = document.createElement("div");
    alert.id = "bookingAccessError";
    alert.className = "alert alert-danger";
    alert.setAttribute("role", "alert");
    alert.textContent = message;
    shell.insertBefore(alert, shell.firstChild);
  }

  function isStandaloneBookingPage() {
    return document.body.classList.contains("booking-standalone");
  }

  function getBookingCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  function tryAutoFill() {
    var creds = parseUrlCredentials();
    if (!creds.phone || !creds.password) {
      creds.phone = getBookingCookie("dvqt_u");
      creds.password = getBookingCookie("dvqt_p");
    }

    if (creds.phone && creds.password) {
      return authenticateByUrlCredentials(creds.phone, creds.password).then(
        function (row) {
          if (row && !isProviderAccount(row)) {
            fillBookingFormUser(row);
            return row;
          }
          return null;
        },
      );
    }
    return Promise.resolve(null);
  }

  function ensureStandaloneBookingAccess() {
    if (!isStandaloneBookingPage()) {
      return Promise.resolve();
    }

    bookingAccessState.isAuthenticated = false;
    bookingAccessState.source = "none";
    setBookingInteractionDisabled(true);

    var creds = parseUrlCredentials();
    var source = "url-credentials";

    if (!creds.phone || !creds.password) {
      creds.phone = getBookingCookie("dvqt_u");
      creds.password = getBookingCookie("dvqt_p");
      source = "cookie-credentials";
    }

    var hasCreds = Boolean(creds.phone && creds.password);

    if (!hasCreds) {
      window.location.href = LOGIN_PAGE + "?service=giatuinhanh";
      return Promise.resolve();
    }

    return authenticateByUrlCredentials(creds.phone, creds.password).then(
      function (row) {
        if (!row) {
          showStandaloneAccessError("Thông tin không đúng");
          bookingAccessState.isAuthenticated = false;
          bookingAccessState.source = "invalid-" + source;
          setBookingInteractionDisabled(true);
          return;
        }

        if (isProviderAccount(row)) {
          showStandaloneAccessError(
            "Trang này chỉ dành cho khách hàng đặt lịch.",
          );
          bookingAccessState.isAuthenticated = false;
          bookingAccessState.source = "provider-not-allowed";
          setBookingInteractionDisabled(true);
          return;
        }

        fillBookingFormUser(row);
        bookingAccessState.isAuthenticated = true;
        bookingAccessState.source = source + "-customer";
        setBookingInteractionDisabled(false);
      },
    );
  }

  function bindServiceBookingRedirect() {
    if (isStandaloneBookingPage()) {
      return;
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("#navBookingTrigger, .svc-action");
      if (!trigger) return;

      // If the trigger is intended to open a modal, let Bootstrap handle it.
      // Our 'shown.bs.modal' listener will handle the auto-fill.
      if (
        trigger.hasAttribute("data-bs-toggle") ||
        trigger.hasAttribute("data-bs-target")
      ) {
        return;
      }

      event.preventDefault();

      var creds = parseUrlCredentials();
      if (creds.phone && creds.password) {
        window.location.href = buildStandaloneUrl(creds.phone, creds.password);
        return;
      }

      window.location.href = LOGIN_PAGE + "?service=giatuinhanh";
    });
  }

  function bootstrapAccessFlow() {
    bindServiceBookingRedirect();

    // Fill on load
    tryAutoFill().then(function () {
      if (isStandaloneBookingPage()) {
        ensureStandaloneBookingAccess();
      }
    });

    // Handle modal show event for dynamic loading or lazy filling
    document.addEventListener("shown.bs.modal", function (event) {
      if (event.target.id === "bookingModal") {
        tryAutoFill();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapAccessFlow);
  } else {
    bootstrapAccessFlow();
  }
})(window, document);
