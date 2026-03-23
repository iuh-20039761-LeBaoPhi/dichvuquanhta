// Navigation
const navbar = document.getElementById("navbar");
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
const navLinks = document.querySelectorAll(".nav-link");
const scrollToTopBtn = document.getElementById("scrollToTop");

// Navbar scroll effect
window.addEventListener("scroll", function () {
  if (navbar) {
    if (window.pageYOffset > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  // Scroll to top button
  if (scrollToTopBtn) {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  }

  // if (window.pageYOffset > 300) {
  //   backToHomeBtn.classList.add("visible");
  // } else {
  //   backToHomeBtn.classList.remove("visible");
  // }
});

// Mobile menu toggle
if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", function () {
    menuToggle.classList.toggle("active");
    navMenu.classList.toggle("active");
  });
}

// Close menu when clicking on a link
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function () {
    if (menuToggle && navMenu) {
      menuToggle.classList.remove("active");
      navMenu.classList.remove("active");
    }
  });
});

// Scroll to Top Button
if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// const backToHomeBtn = document.getElementById("backToHome");

// backToHomeBtn.addEventListener("click", function () {
//   window.location.href = "../index.html";
// });
// Smooth Scroll for Links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      const navbarHeight = 80;
      const targetPosition = target.offsetTop - navbarHeight;
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    }
  });
});

// Show hero image on desktop
if (window.innerWidth >= 1024) {
  const heroImage = document.querySelector(".hero-image");
  if (heroImage) {
    heroImage.style.display = "block";
  }
}

// Animation on Scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver(function (entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe all cards
document
  .querySelectorAll(".service-card, .process-step, .pricing-card")
  .forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "all 0.6s ease";
    observer.observe(el);
  });

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});
