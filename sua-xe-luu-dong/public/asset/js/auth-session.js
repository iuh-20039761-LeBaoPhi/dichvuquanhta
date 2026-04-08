(function (window, document) {
  var LOGIN_TABLE = "nguoidung";
  var PROVIDER_SERVICE_ID = "8";

  function normalizePhone(value) {
    var phone = String(value || "")
      .replace(/\s+/g, "")
      .trim();

    if (phone.indexOf("+84") === 0) return "0" + phone.slice(3);
    if (phone.indexOf("84") === 0 && phone.length >= 11)
      return "0" + phone.slice(2);

    return phone;
  }

  function getCookie(name) {
    var cookieName = String(name || "").trim();
    if (!cookieName) return "";

    var cookiePrefix = cookieName + "=";
    var entries = (document.cookie || "").split(";");

    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i].trim();
      if (entry.indexOf(cookiePrefix) !== 0) continue;

      var rawValue = entry.slice(cookiePrefix.length);
      try {
        return decodeURIComponent(rawValue);
      } catch (_error) {
        return rawValue;
      }
    }

    return "";
  }

  function clearCookie(name) {
    document.cookie =
      String(name) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  }

  function extractRows(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && Array.isArray(result.items)) return result.items;
    if (result && Array.isArray(result.rows)) return result.rows;
    if (result && Array.isArray(result.result)) return result.result;
    return [];
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

  function mapAuthenticatedUser(row, phoneFallback) {
    if (!row || typeof row !== "object") return null;

    return {
      id: row.id || row.user_id || row.makhachhang || "",
      user_name: row.user_name || row.hovaten || row.ten || "",
      user_tel: normalizePhone(
        row.user_tel || row.sodienthoai || row.phone || phoneFallback,
      ),
      user_email: row.user_email || row.email || "",
      id_dichvu: String(row.id_dichvu || "").trim(),
    };
  }

  function querySingleUser(where) {
    if (typeof window.krudList !== "function") {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      window.krudList({
        table: LOGIN_TABLE,
        where: where,
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

  function findUserByCredentials(phone, password) {
    var normalizedPhone = normalizePhone(phone);
    var phoneFields = ["sodienthoai", "user_tel", "phone", "sdt"];
    var passwordFields = ["matkhau", "password", "user_password", "mat_khau"];

    function tryPair(indexPhone, indexPassword) {
      if (indexPhone >= phoneFields.length) {
        return Promise.resolve(null);
      }

      if (indexPassword >= passwordFields.length) {
        return tryPair(indexPhone + 1, 0);
      }

      return querySingleUser([
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

  function getUserFromCookie() {
    var phone = normalizePhone(getCookie("dvqt_u"));
    var password = String(getCookie("dvqt_p") || "").trim();

    if (!phone || !password || typeof window.krudList !== "function") {
      return Promise.resolve(null);
    }

    return findUserByCredentials(phone, password)
      .then(function (row) {
        if (!row) return null;
        return mapAuthenticatedUser(row, phone);
      })
      .catch(function () {
        return null;
      });
  }

  function getNavNodes() {
    return {
      loginLinks: Array.from(
        document.querySelectorAll(".nav-menu a.login-btn"),
      ),
      userMenus: Array.from(document.querySelectorAll(".nav-menu .auth-menu")),
      logoutLinks: Array.from(
        document.querySelectorAll(".nav-menu .auth-logout-btn"),
      ),
      orderLinks: Array.from(
        document.querySelectorAll(
          '.nav-menu .auth-user-dropdown a[href*="khachhang/danh-sach-hoa-don.html"]',
        ),
      ),
      dashboardLinks: Array.from(
        document.querySelectorAll(
          '.nav-menu .auth-user-dropdown a[href*="nhacungcap/danh-sach-hoa-don.html"]',
        ),
      ),
    };
  }

  function setElementAndParentLiVisibility(element, visible, displayValue) {
    if (!element) return;

    element.style.display = visible ? displayValue : "none";

    var parentLi = element.closest("li");
    if (parentLi) {
      parentLi.style.display = visible ? "" : "none";
    }
  }

  function setLoginVisibility(loginLinks, visible) {
    loginLinks.forEach(function (link) {
      setElementAndParentLiVisibility(link, visible, "inline-flex");
    });
  }

  function setUserMenuState(userMenus, authenticated, user) {
    userMenus.forEach(function (menu) {
      setElementAndParentLiVisibility(menu, Boolean(authenticated), "block");
      menu.classList.toggle("is-authenticated", Boolean(authenticated));

      if (!authenticated) {
        menu.removeAttribute("open");
      }

      var trigger = menu.querySelector(".auth-user-trigger");
      if (trigger) {
        var name = user && user.user_name ? String(user.user_name) : "";
        trigger.setAttribute(
          "aria-label",
          name ? "Tài khoản: " + name : "Mở menu tài khoản",
        );
      }
    });
  }

  function setMenuItemVisibility(elements, visible) {
    elements.forEach(function (element) {
      if (!element) return;
      element.style.display = visible ? "flex" : "none";
    });
  }

  function normalizeAccountType(value) {
    var type = String(value || "")
      .trim()
      .toLowerCase();

    if (
      type === "provider" ||
      type === "supplier" ||
      type === "ncc" ||
      type === "nhacungcap" ||
      type === "nha-cung-cap"
    ) {
      return "provider";
    }

    if (
      type === "customer" ||
      type === "client" ||
      type === "khachhang" ||
      type === "khach-hang"
    ) {
      return "customer";
    }

    return "";
  }

  function resolveAccountType(user) {
    if (containsServiceId(user && user.id_dichvu, PROVIDER_SERVICE_ID)) {
      return Promise.resolve("provider");
    }

    var fromSession = normalizeAccountType(
      user && (user.account_type || user.user_role || user.role),
    );
    if (fromSession) {
      return Promise.resolve(fromSession);
    }

    return Promise.resolve("customer");
  }

  function applyAccountMenuByType(nodes, accountType) {
    var isProvider = accountType === "provider";
    setMenuItemVisibility(nodes.orderLinks, !isProvider);
    setMenuItemVisibility(nodes.dashboardLinks, isProvider);
  }

  function applyAuthState(authenticated, user) {
    var nodes = getNavNodes();
    if (!nodes.loginLinks.length && !nodes.userMenus.length) {
      return Promise.resolve();
    }

    setLoginVisibility(nodes.loginLinks, !authenticated);
    setUserMenuState(nodes.userMenus, authenticated, user || null);

    if (!authenticated) {
      setMenuItemVisibility(nodes.orderLinks, true);
      setMenuItemVisibility(nodes.dashboardLinks, false);
      return Promise.resolve();
    }

    return resolveAccountType(user).then(function (accountType) {
      applyAccountMenuByType(nodes, accountType);
    });
  }

  function bindLogout(logoutLinks) {
    logoutLinks.forEach(function (logoutLink) {
      if (logoutLink.dataset.authLogoutBound === "true") return;
      logoutLink.dataset.authLogoutBound = "true";

      logoutLink.addEventListener("click", function (event) {
        event.preventDefault();

        clearCookie("dvqt_u");
        clearCookie("dvqt_p");
        applyAuthState(false, null);
        window.location.reload();
      });
    });
  }

  getUserFromCookie()
    .then(function (user) {
      var hasUser = Boolean(user && user.user_tel);
      return applyAuthState(hasUser, user || null);
    })
    .then(function () {
      bindLogout(getNavNodes().logoutLinks);
    })
    .catch(function () {
      applyAuthState(false, null);
      bindLogout(getNavNodes().logoutLinks);
    });
})(window, document);
