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
          config.logoutHref || "../../public/admin-login.html";
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
      del("dvqt_u");
      del("dvqt_p");
      var href =
        (config && config.logoutHref) ||
        (document.querySelector("[data-logout]") &&
          document.querySelector("[data-logout]").getAttribute("href")) ||
        "../../public/admin-login.html";
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
      logoutApi: mount.getAttribute("data-logout-api") || "",
    };

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
