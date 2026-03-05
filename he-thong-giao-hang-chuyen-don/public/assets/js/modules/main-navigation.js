(function (window, document) {
  if (window.__fastGoNavInitDone) return;
  window.__fastGoNavInitDone = true;

  const core = window.FastGoCore;
  if (!core) return;

  const hamburgerBtn = document.getElementById("hamburger-btn");
  const navMenu = document.getElementById("nav-menu");

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      hamburgerBtn.classList.toggle("active");
      navMenu.classList.toggle("active");
    });
  }

  document
    .querySelectorAll(".submenu-toggle, .has-submenu > a")
    .forEach((toggle) => {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const parentLi = this.closest(".has-submenu");
        if (!parentLi) return;

        const wasOpen = parentLi.classList.contains("open");
        document.querySelectorAll(".has-submenu").forEach((item) => {
          if (item !== parentLi) {
            item.classList.remove("open");
          }
        });

        if (wasOpen) {
          parentLi.classList.remove("open");
        } else {
          parentLi.classList.add("open");
        }
      });
    });

  document.querySelectorAll(".dropdown > a").forEach((link) => {
    link.addEventListener("click", function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();

        const dropdownMenu = this.nextElementSibling;
        if (!dropdownMenu) return;

        document.querySelectorAll(".dropdown-menu").forEach((menu) => {
          if (menu !== dropdownMenu) {
            menu.classList.remove("active");
            menu.style.display = "none";
          }
        });

        if (dropdownMenu.style.display === "block") {
          dropdownMenu.style.display = "none";
          dropdownMenu.classList.remove("active");
        } else {
          dropdownMenu.style.display = "block";
          dropdownMenu.classList.add("active");
        }
      }
    });
  });

  document
    .querySelectorAll(".nav-menu > li > a:not(.submenu-toggle)")
    .forEach((link) => {
      link.addEventListener("click", function () {
        if (
          window.innerWidth <= 768 &&
          !this.parentElement.classList.contains("dropdown")
        ) {
          if (hamburgerBtn) hamburgerBtn.classList.remove("active");
          if (navMenu) navMenu.classList.remove("active");

          document.querySelectorAll(".dropdown-menu").forEach((menu) => {
            menu.classList.remove("active");
            menu.style.display = "none";
          });
        }
      });
    });

  document.querySelectorAll(".submenu a").forEach((link) => {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 768) {
        if (hamburgerBtn) hamburgerBtn.classList.remove("active");
        if (navMenu) navMenu.classList.remove("active");

        document.querySelectorAll(".has-submenu").forEach((item) => {
          item.classList.remove("open");
        });
      }
    });
  });

  document.addEventListener("click", function (e) {
    const isInsideMenu = navMenu && navMenu.contains(e.target);
    const isInsideHamburger = hamburgerBtn && hamburgerBtn.contains(e.target);

    if (!isInsideMenu && !isInsideHamburger) {
      if (hamburgerBtn) hamburgerBtn.classList.remove("active");
      if (navMenu) navMenu.classList.remove("active");

      document.querySelectorAll(".has-submenu").forEach((item) => {
        item.classList.remove("open");
      });

      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        menu.classList.remove("active");
        menu.style.display = "none";
      });
    }
  });

  const notificationBell = document.getElementById("notification-bell");
  const notificationDropdown = document.getElementById("notification-dropdown");
  const notificationList = document.getElementById("notification-list");

  if (notificationBell && notificationDropdown && notificationList) {
    notificationBell.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (notificationDropdown.style.display === "block") {
        notificationDropdown.style.display = "none";
      } else {
        notificationDropdown.style.display = "block";

        fetch(core.toApiUrl("get_notifications_ajax.php"))
          .then((res) => res.text())
          .then((html) => {
            notificationList.innerHTML = html;
          })
          .catch(() => {
            notificationList.innerHTML =
              '<div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Không thể tải thông báo</div>';
          });
      }
    });

    document.addEventListener("click", function (e) {
      if (
        !notificationBell.contains(e.target) &&
        !notificationDropdown.contains(e.target)
      ) {
        notificationDropdown.style.display = "none";
      }
    });
  }
})(window, document);
