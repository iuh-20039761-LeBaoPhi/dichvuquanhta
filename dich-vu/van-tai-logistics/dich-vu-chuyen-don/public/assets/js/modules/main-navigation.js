import core from "./core/app-core.js";

(function (window, document) {
  if (window.__fastGoNavInitDone) return;
  window.__fastGoNavInitDone = true;
  if (!core) return;

  const hamburgerBtn = document.getElementById("hamburger-btn");
  const navMenu = document.getElementById("nav-menu");
  const setMobileMenuState = (isOpen = false) => {
    if (!hamburgerBtn || !navMenu) return;

    hamburgerBtn.classList.toggle("active", !!isOpen);
    navMenu.classList.toggle("active", !!isOpen);
    hamburgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };
  const closeAllDropdowns = () => {
    document.querySelectorAll(".dropdown").forEach((dropdown) => {
      dropdown.classList.remove("open");
      const trigger = dropdown.querySelector(":scope > a");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });

    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("active");
      menu.style.display = "";
    });
  };

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.setAttribute("aria-expanded", "false");
    hamburgerBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const willOpen = !navMenu.classList.contains("active");
      setMobileMenuState(willOpen);
    });
  }

  document
    .querySelectorAll(".submenu-toggle, .has-submenu > a")
    .forEach((toggle) => {
      toggle.addEventListener("click", function (e) {
        const parentLi = this.closest(".has-submenu");
        if (!parentLi) return;
        if (parentLi.classList.contains("dropdown")) return;

        e.preventDefault();
        e.stopPropagation();

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
      e.preventDefault();
      e.stopPropagation();

      const parent = this.closest(".dropdown");
      const dropdownMenu = this.nextElementSibling;
      if (!parent || !dropdownMenu) return;

      const isOpen = parent.classList.contains("open");
      closeAllDropdowns();

      if (!isOpen) {
        parent.classList.add("open");
        this.setAttribute("aria-expanded", "true");
        dropdownMenu.classList.add("active");
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
          setMobileMenuState(false);

          document.querySelectorAll(".dropdown-menu").forEach((menu) => {
            menu.classList.remove("active");
            menu.style.display = "none";
          });
        }
      });
    });

  document.querySelectorAll(".dropdown-menu a").forEach((link) => {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 768) {
        setMobileMenuState(false);

        closeAllDropdowns();
      }
    });
  });

  document.querySelectorAll(".submenu a").forEach((link) => {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 768) {
        setMobileMenuState(false);

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
      setMobileMenuState(false);

      document.querySelectorAll(".has-submenu").forEach((item) => {
        item.classList.remove("open");
      });
      closeAllDropdowns();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMobileMenuState(false);
      closeAllDropdowns();
    }
  });
})(window, document);
