(function (window, document) {
  if (window.GiaoHangNhanhNavigation) return;

  const initializedRoots = new WeakSet();
  let globalEventsBound = false;

  function getCore() {
    return window.GiaoHangNhanhCore || {};
  }

  function closeAllDropdowns(root = document) {
    root.querySelectorAll(".has-submenu").forEach((item) => {
      item.classList.remove("open");
    });

    root
      .querySelectorAll(".profile-dropdown-wrapper, .notification-wrapper")
      .forEach((item) => {
        item.classList.remove("open");
      });

    root.querySelectorAll(".header-dropdown, .profile-menu").forEach((menu) => {
      menu.classList.remove("open");
    });
  }

  function closeMobileMenu(root = document) {
    const hamburgerBtn = root.querySelector("#hamburger-btn");
    const navMenu = root.querySelector("#nav-menu");
    if (!hamburgerBtn || !navMenu) return;

    hamburgerBtn.classList.remove("active");
    navMenu.classList.remove("active");
  }

  function bindRoot(root = document) {
    if (!root || initializedRoots.has(root)) return;
    initializedRoots.add(root);

    const hamburgerBtn = root.querySelector("#hamburger-btn");
    const navMenu = root.querySelector("#nav-menu");

    if (hamburgerBtn && navMenu && hamburgerBtn.dataset.navBound !== "1") {
      hamburgerBtn.dataset.navBound = "1";
      hamburgerBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        hamburgerBtn.classList.toggle("active");
        navMenu.classList.toggle("active");
      });
    }

    root.querySelectorAll(".submenu-toggle, .has-submenu > a").forEach((toggle) => {
      if (toggle.dataset.navBound === "1") return;
      toggle.dataset.navBound = "1";

      toggle.addEventListener("click", function (event) {
        const isMobile = window.innerWidth <= 1024;
        const parentLi = this.closest(".has-submenu");
        if (!parentLi) return;

        if (isMobile || this.getAttribute("href") === "#") {
          event.preventDefault();
          event.stopPropagation();

          const isOpen = parentLi.classList.contains("open");
          if (!isOpen) closeAllDropdowns(root);
          parentLi.classList.toggle("open");
        }
      });
    });

    const profileToggle = root.querySelector("#profile-toggle");
    const profileWrapper = root.querySelector(".profile-dropdown-wrapper");
    const profileMenu = root.querySelector(".profile-menu");

    if (
      profileToggle &&
      profileMenu &&
      profileWrapper &&
      profileToggle.dataset.navBound !== "1"
    ) {
      profileToggle.dataset.navBound = "1";
      profileToggle.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = profileWrapper.classList.contains("open");
        closeAllDropdowns(root);
        if (!isOpen) {
          profileWrapper.classList.add("open");
          profileMenu.classList.add("open");
        }
      });
    }

    const adminNotifyBell = root.querySelector("#admin-notification-bell");
    const adminNotifyWrapper = root.querySelector(".notification-wrapper");
    const adminNotifyDropdown = root.querySelector("#admin-notification-dropdown");

    if (
      adminNotifyBell &&
      adminNotifyDropdown &&
      adminNotifyWrapper &&
      adminNotifyBell.dataset.navBound !== "1"
    ) {
      adminNotifyBell.dataset.navBound = "1";
      adminNotifyBell.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = adminNotifyWrapper.classList.contains("open");
        closeAllDropdowns(root);

        if (!isOpen) {
          adminNotifyWrapper.classList.add("open");
          adminNotifyDropdown.classList.add("open");

          const dropdownBody = adminNotifyDropdown.querySelector(".dropdown-body");
          const core = getCore();
          if (
            dropdownBody &&
            dropdownBody.querySelector(".empty-state") &&
            typeof core.toApiUrl === "function"
          ) {
            fetch(core.toApiUrl("get_notifications_ajax.php"))
              .then((response) => response.text())
              .then((html) => {
                if (html.trim()) dropdownBody.innerHTML = html;
              })
              .catch(() => {});
          }
        }
      });
    }
  }

  function bindGlobalEvents() {
    if (globalEventsBound) return;
    globalEventsBound = true;

    document.addEventListener("click", function (event) {
      if (
        !event.target.closest(".has-submenu") &&
        !event.target.closest(".profile-dropdown-wrapper") &&
        !event.target.closest(".notification-wrapper")
      ) {
        closeAllDropdowns(document);
      }

      const hamburgerBtn = document.querySelector("#hamburger-btn");
      const navMenu = document.querySelector("#nav-menu");
      if (
        hamburgerBtn &&
        navMenu &&
        !navMenu.contains(event.target) &&
        !hamburgerBtn.contains(event.target)
      ) {
        closeMobileMenu(document);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        closeMobileMenu(document);
      }
    });
  }

  function init(root = document) {
    bindRoot(root);
    bindGlobalEvents();
  }

  window.GiaoHangNhanhNavigation = {
    init,
    closeAllDropdowns,
    closeMobileMenu,
  };

  document.addEventListener("ghn:layout-ready", function (event) {
    init(event.detail?.headerHost || document);
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        init(document);
      },
      { once: true },
    );
  } else {
    init(document);
  }
})(window, document);
