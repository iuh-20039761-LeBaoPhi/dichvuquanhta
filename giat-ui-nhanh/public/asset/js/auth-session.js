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

  function applyAuthState(authenticated, user) {
    var nodes = getNavNodes();
    if (!nodes.loginLinks.length && !nodes.userMenus.length) return;

    setLoginVisibility(nodes.loginLinks, !authenticated);
    setUserMenuState(nodes.userMenus, authenticated, user || null);
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

      applyAuthState(hasUser, user);
      bindLogout(getNavNodes().logoutLinks);
    })
    .catch(function () {
      applyAuthState(false, null);
      bindLogout(getNavNodes().logoutLinks);
    });
})(window, document);
