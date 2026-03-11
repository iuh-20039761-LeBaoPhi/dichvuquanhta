lucide.createIcons();

const navbar = document.getElementById("mainNavbar");
const logoIcon = document.querySelector(".logo-icon");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

document.querySelectorAll(".service-card").forEach((card) => {
  card.addEventListener("mouseenter", () => {});
});

document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll("#navbarNav .nav-link");
  const navbarCollapse = document.getElementById("navbarNav");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
        toggle: false,
      });
      bsCollapse.hide();
    });
  });
});

const sel = document.getElementById("serviceSelect");
const inp = document.getElementById("serviceInput");

function updateInput() {
  const vals = Array.from(sel.selectedOptions)
    .map((o) => o.text)
    .join(", ");
  inp.value = vals;
}

if (sel && inp) {
  // show dropdown when input clicked
  inp.addEventListener("click", () => {
    sel.style.display = "block";
    sel.focus();
  });

  // allow clicking options to toggle without ctrl
  sel.addEventListener("mousedown", function (e) {
    e.preventDefault();
    const opt = e.target;
    if (opt.tagName.toLowerCase() === "option") {
      opt.selected = !opt.selected;
      updateInput();
    }
  });

  sel.addEventListener("change", updateInput);

  sel.addEventListener("blur", () => {
    setTimeout(() => {
      sel.style.display = "none";
    }, 150);
  });

  document.addEventListener("click", (e) => {
    if (!inp.contains(e.target) && !sel.contains(e.target)) {
      sel.style.display = "none";
    }
  });
}
