(function (window, document) {
  var SESSION_ENDPOINT = "public/session-user.php";

  function requestSession(action, body) {
    var method = action === "get" ? "GET" : "POST";
    var options = {
      method: method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "POST" && body) {
      options.body = JSON.stringify(body);
    }

    return fetch(SESSION_ENDPOINT + "?action=" + action, options).then(
      function (response) {
        return response.json().then(function (result) {
          if (!response.ok) {
            throw new Error(
              (result && result.message) || "Session request failed",
            );
          }
          return result;
        });
      },
    );
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

  function detectAccountTypeByPhone(phone) {
    if (!phone || typeof window.krudList !== "function") {
      return Promise.resolve("customer");
    }

    return Promise.resolve(
      window.krudList({
        table: "nhacungcap_suaxe",
        where: [{ field: "sodienthoai", operator: "=", value: phone }],
        limit: 1,
      }),
    )
      .then(function (result) {
        var rows = [];
        if (Array.isArray(result)) rows = result;
        else if (result && Array.isArray(result.data)) rows = result.data;
        else if (result && Array.isArray(result.items)) rows = result.items;
        else if (result && Array.isArray(result.rows)) rows = result.rows;
        else if (result && Array.isArray(result.result)) rows = result.result;

        return rows.length ? "provider" : "customer";
      })
      .catch(function () {
        return "customer";
      });
  }

  function resolveAccountType(user) {
    var fromSession = normalizeAccountType(
      user && (user.account_type || user.user_role || user.role),
    );
    if (fromSession) {
      return Promise.resolve(fromSession);
    }

    var phone = user && user.user_tel ? String(user.user_tel).trim() : "";
    return detectAccountTypeByPhone(phone);
  }

  function applyAccountMenuByType(nodes, accountType) {
    var isProvider = accountType === "provider";
    setMenuItemVisibility(nodes.orderLinks, !isProvider);
    setMenuItemVisibility(nodes.dashboardLinks, isProvider);
  }

  function applyAuthState(authenticated, user) {
    var nodes = getNavNodes();
    if (!nodes.loginLinks.length && !nodes.userMenus.length) return;

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

        requestSession("logout")
          .then(function () {
            applyAuthState(false, null);
            window.location.reload();
          })
          .catch(function () {
            window.location.reload();
          });
      });
    });
  }

  requestSession("get")
    .then(function (result) {
      var hasUser = Boolean(result && result.hasUser);
      var user = result && result.user ? result.user : null;

      return applyAuthState(hasUser, user);
    })
    .then(function () {
      bindLogout(getNavNodes().logoutLinks);
    })
    .catch(function () {
      applyAuthState(false, null);
      bindLogout(getNavNodes().logoutLinks);
    });
})(window, document);
