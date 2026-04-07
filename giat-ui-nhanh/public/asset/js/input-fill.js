(function (window, document) {
  var CUSTOMER_TABLE = "khachhang";
  var LOGIN_PAGE = "dang-nhap.html";
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

  function getSessionUser() {
    return fetch("public/session-user.php?action=get", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (result) {
            if (!response.ok || !result || result.hasUser !== true) {
              return null;
            }

            var user =
              result.user && typeof result.user === "object"
                ? result.user
                : null;
            return user;
          });
      })
      .catch(function () {
        return null;
      });
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

      return queryByWhere(CUSTOMER_TABLE, [
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

  function toBookingUser(user) {
    if (!user || typeof user !== "object") return null;

    return {
      name: String(user.user_name || user.hovaten || user.ten || "").trim(),
      phone: normalizePhone(user.user_tel || user.sodienthoai || user.phone),
    };
  }

  function fillBookingFormUser(user) {
    var mapped = toBookingUser(user);
    if (!mapped) return;

    var nameInput = document.getElementById("hotenkhachhang");
    var phoneInput = document.getElementById("sodienthoaikhachhang");

    if (nameInput && mapped.name) {
      nameInput.value = mapped.name;
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (phoneInput && mapped.phone) {
      phoneInput.value = mapped.phone;
      phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
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

  function ensureStandaloneBookingAccess() {
    if (!isStandaloneBookingPage()) {
      return Promise.resolve();
    }

    bookingAccessState.isAuthenticated = false;
    bookingAccessState.source = "none";
    setBookingInteractionDisabled(true);

    return getSessionUser().then(function (sessionUser) {
      if (sessionUser) {
        fillBookingFormUser(sessionUser);
        bookingAccessState.isAuthenticated = true;
        bookingAccessState.source = "session";
        setBookingInteractionDisabled(false);
        return;
      }

      var creds = parseUrlCredentials();
      var hasUrlCreds = Boolean(creds.phone && creds.password);

      if (!hasUrlCreds) {
        window.location.href = LOGIN_PAGE;
        return;
      }

      return authenticateByUrlCredentials(creds.phone, creds.password).then(
        function (row) {
          if (!row) {
            showStandaloneAccessError("Thông tin không đúng");
            bookingAccessState.isAuthenticated = false;
            bookingAccessState.source = "invalid-url-credentials";
            setBookingInteractionDisabled(true);
            return;
          }

          fillBookingFormUser(row);
          bookingAccessState.isAuthenticated = true;
          bookingAccessState.source = "url-credentials";
          setBookingInteractionDisabled(false);
        },
      );
    });
  }

  function bindServiceBookingRedirect() {
    if (isStandaloneBookingPage()) {
      return;
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("#navBookingTrigger, .svc-action");
      if (!trigger) return;

      event.preventDefault();

      getSessionUser().then(function (sessionUser) {
        if (sessionUser) {
          window.location.href = STANDALONE_BOOKING_PAGE;
          return;
        }

        var creds = parseUrlCredentials();
        if (creds.phone && creds.password) {
          window.location.href = buildStandaloneUrl(
            creds.phone,
            creds.password,
          );
          return;
        }

        window.location.href = LOGIN_PAGE;
      });
    });
  }

  function bootstrapAccessFlow() {
    bindServiceBookingRedirect();
    ensureStandaloneBookingAccess();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapAccessFlow);
  } else {
    bootstrapAccessFlow();
  }
})(window, document);
