(function (window, document) {
  function bindLogout(aside, config) {
    if (!aside) return;

    var logoutNode = aside.querySelector("[data-logout]");
    if (!logoutNode || logoutNode.dataset.logoutBound === "true") return;

    logoutNode.dataset.logoutBound = "true";
    logoutNode.addEventListener("click", function (event) {
      event.preventDefault();
      if (typeof window.adminLogout === "function") {
        try {
          window.adminLogout(config);
        } catch (e) {
          window.adminLogout();
        }
      } else {
        window.location.href =
          config.logoutHref || "../../../../public/admin-login.html";
      }
    });
  }

  // Default logout handler for customers/suppliers: remove dvqt cookies
  if (typeof window.adminLogout !== "function") {
    window.adminLogout = function (config) {
      function del(name) {
        var path = "/";
        var expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
        var host = location.hostname;
        var variants = ["", "domain=" + host, "domain=." + host];
        variants.forEach(function (domainAttr) {
          var domainPart = domainAttr ? "; " + domainAttr : "";
          document.cookie =
            name + "=; " + expires + "; path=" + path + domainPart + ";";
          document.cookie =
            name + "=; Max-Age=0; path=" + path + domainPart + ";";
        });
      }

      var params = new URLSearchParams(window.location.search);
      var role = params.get("role") || document.body.getAttribute("data-role");

      if (role === "admin" || !role) {
        del("admin_e");
        del("admin_p");
      } else {
        del("dvqt_u");
        del("dvqt_p");
      }

      var href =
        (config && config.logoutHref) ||
        (document.querySelector("[data-logout]") &&
          document.querySelector("[data-logout]").getAttribute("href")) ||
        "../../../../public/admin-login.html";
      window.location.href = href;
    };
  }

  function applyAsideConfig(aside, config) {
    if (!aside) return;

    var logoNode = aside.querySelector("[data-logo]");
    if (logoNode && config.logoSrc) {
      logoNode.setAttribute("src", config.logoSrc);
    }

    var logoutNode = aside.querySelector("[data-logout]");
    if (logoutNode && config.logoutHref) {
      logoutNode.setAttribute("href", config.logoutHref);
    }
  }

  function fixLinks(aside, prefix) {
    if (!aside || !prefix) return;
    var navItems = aside.querySelectorAll(".sidebar-nav .nav-item");
    navItems.forEach(function (item) {
      var href = item.getAttribute("href");
      if (
        href &&
        href !== "#" &&
        href.indexOf("http") !== 0 &&
        href.indexOf("/") !== 0
      ) {
        item.setAttribute("href", prefix + href);
      }
    });
  }

  function markActiveNav(aside) {
    if (!aside) return;

    var currentPath = window.location.pathname.split("/").pop().toLowerCase();
    var activePath = currentPath;
    if (currentPath === "chi-tiet-don-hang.html") {
      var params = new URLSearchParams(window.location.search);
      var role = params.get("role");
      if (role === "provider") {
        activePath = "danh-sach-don-nhan.html";
      } else {
        activePath = "danh-sach-don-hang.html";
      }
    }
    var navItems = aside.querySelectorAll(".sidebar-nav .nav-item");

    navItems.forEach(function (item) {
      item.classList.remove("active");

      var href = String(item.getAttribute("href") || "")
        .trim()
        .toLowerCase();
      if (!href || href === "#") return;

      // Match filename or full path
      if (href === activePath || href.endsWith("/" + activePath)) {
        item.classList.add("active");
      }
    });
  }

  function loadAside() {
    var mount = document.getElementById("asideMount");
    if (!mount) return;

    var asideSrc = mount.getAttribute("data-aside-src");
    if (!asideSrc) return;

    var config = {
      logoSrc: mount.getAttribute("data-logo-src") || "",
      logoutHref: mount.getAttribute("data-logout-href") || "#",
      linkPrefix: mount.getAttribute("data-link-prefix") || "",
    };

    // Save config globally so other scripts can access it after mount is replaced
    window._asideConfig = config;

    fetch(asideSrc, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Cannot load aside partial: " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        mount.outerHTML = html;

        var aside = document.getElementById("sidebar");
        applyAsideConfig(aside, config);
        fixLinks(aside, config.linkPrefix);
        bindLogout(aside, config);
        markActiveNav(aside);
      })
      .catch(function (error) {
        console.error("Load aside failed:", error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAside);
  } else {
    loadAside();
  }
})(window, document);
