import core from "./core/app-core.js";

(function (window, document) {
  if (window.__fastGoLandingInitDone) return;
  window.__fastGoLandingInitDone = true;
  if (!core) return;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function initFaqAccordion() {
    document.querySelectorAll(".faq-question").forEach((q) => {
      q.addEventListener("click", () => {
        const ans = q.nextElementSibling;
        const isVisible = ans.style.display === "block";
        document
          .querySelectorAll(".faq-answer")
          .forEach((a) => (a.style.display = "none"));
        ans.style.display = isVisible ? "none" : "block";
      });
    });
  }

  function initHeroAnimation() {
    window.addEventListener("load", () => {
      const animatedElements = document.querySelectorAll(
        ".animate-top, .animate-bottom, .animate-right",
      );

      animatedElements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add("animate-show");
        }, index * 150);
      });
    });
  }

  function initTestimonials() {
    if (!document.querySelector(".testimonial-slider")) return;
    if (typeof window.Swiper !== "function") return;

    new Swiper(".testimonial-slider", {
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      slidesPerView: 1,
      spaceBetween: 30,
      breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
    });
  }

  function initBackToTop() {
    const backToTopButton = document.getElementById("back-to-top-btn");
    if (!backToTopButton) return;

    function scrollFunction() {
      if (
        document.body.scrollTop > 200 ||
        document.documentElement.scrollTop > 200
      ) {
        backToTopButton.classList.add("show");
      } else {
        backToTopButton.classList.remove("show");
      }
    }

    window.addEventListener("scroll", scrollFunction);
    scrollFunction();

    backToTopButton.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  onReady(initFaqAccordion);
  onReady(initTestimonials);
  onReady(initBackToTop);
  initHeroAnimation();
})(window, document);
