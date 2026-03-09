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
      // Close mobile menu
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

// Form submission
document.getElementById("bookingForm").addEventListener("submit", function (e) {
  e.preventDefault();
  alert(
    "Cảm ơn bạn đã đặt dịch vụ! Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.",
  );
  this.reset();
});
