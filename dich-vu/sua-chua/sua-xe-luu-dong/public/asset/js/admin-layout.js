(function (window, document) {
  function bindLogout(aside, config) {
    if (!aside) return;

    var logoutNode = aside.querySelector("[data-logout]");
    if (!logoutNode || logoutNode.dataset.logoutBound === "true") return;

    logoutNode.dataset.logoutBound = "true";
    logoutNode.addEventListener("click", function (event) {
      event.preventDefault();
      if (typeof window.adminLogout === "function") {
        window.adminLogout(config);
      } else {
        window.location.href =
          config.logoutHref || "../../../../public/admin-login.html";
      }
    });
  }

  // Improved logout handler with role awareness
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
      (window._asideConfig && window._asideConfig.logoutHref) ||
      "../../../../public/admin-login.html";
    window.location.href = href;
  };

  function fixLinks(aside, prefix) {
    if (!aside || !prefix) return;
    var links = aside.querySelectorAll("a[href]");
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      if (
        !href ||
        href === "#" ||
        href.indexOf("http") === 0 ||
        href.indexOf("/") === 0 ||
        href.indexOf("mailto:") === 0 ||
        href.indexOf("tel:") === 0
      ) {
        return;
      }
      a.setAttribute("href", prefix + href);
    });
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

  function markActiveNav(aside) {
    if (!aside) return;

    var currentPath = window.location.pathname.split("/").pop().toLowerCase();
    var activePath = currentPath;
    if (currentPath === "chi-tiet-don-hang.html") {
      activePath = "danh-sach-don-hang.html";
    }
    var navItems = aside.querySelectorAll(".sidebar-nav .nav-item");

    navItems.forEach(function (item) {
      item.classList.remove("active");

      var href = String(item.getAttribute("href") || "")
        .trim()
        .toLowerCase();
      if (!href || href === "#") return;

      if (href === activePath) {
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
