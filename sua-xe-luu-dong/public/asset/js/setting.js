document.addEventListener("DOMContentLoaded", function () {
  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        const navCollapse = document.getElementById("navbarNav");
        if (navCollapse && navCollapse.classList.contains("show")) {
          const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
          if (bsCollapse) {
            bsCollapse.hide();
          }
        }
      }
    });
  });

  // Luồng submit booking được xử lý trong public/asset/js/data.js
});
