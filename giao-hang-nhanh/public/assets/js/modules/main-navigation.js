(function (window, document) {
  if (window.GiaoHangNhanhNavigation) return;

  const initializedRoots = new WeakSet();
  let globalEventsBound = false;

  function getCore() {
    return window.GiaoHangNhanhCore || {};
  }

  function getLocalSession() {
    if (window.GiaoHangNhanhLocalAuth?.getSession) {
      return window.GiaoHangNhanhLocalAuth.getSession();
    }
    return null;
  }

  function buildLocalNotifications() {
    const session = getLocalSession();
    if (!session) return [];

    if (session.role === "shipper") {
      return [
        {
          title: "Chế độ local",
          body: "Thông báo realtime từ hệ thống cũ đã được tắt. Bạn vẫn có thể xem và cập nhật đơn trong portal nhà cung cấp.",
        },
      ];
    }

    return [
      {
        title: "Chế độ local",
        body: "Thông báo realtime từ hệ thống cũ đã được tắt. Dữ liệu trong portal đang dùng local/mock để tiếp tục kiểm thử giao diện.",
      },
    ];
  }

  function renderLocalNotifications(root) {
    if (!root) return;
    const notifications = buildLocalNotifications();
    if (!notifications.length) return;

    root.innerHTML = notifications
      .map(
        (item) => `
          <article class="notification-item">
            <strong>${item.title}</strong>
            <p>${item.body}</p>
          </article>
        `,
      )
      .join("");
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
          if (dropdownBody && dropdownBody.querySelector(".empty-state")) {
            renderLocalNotifications(dropdownBody);
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
