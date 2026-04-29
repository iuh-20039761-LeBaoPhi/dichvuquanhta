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

document.querySelectorAll(".service-item").forEach((card) => {
  card.addEventListener("mouseenter", () => {});
});

document.addEventListener("DOMContentLoaded", function () {
  const navbarCollapse = document.getElementById("navbarNav");
  const closeMenuLinks = document.querySelectorAll(
    "#navbarNav .nav-link:not(.dropdown-toggle), #navbarNav .dropdown-item:not(.dropdown-toggle)"
  );

  closeMenuLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (!navbarCollapse || !navbarCollapse.classList.contains("show")) {
        return;
      }
      const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
      bsCollapse.hide();
    });
  });

  if (navbarCollapse) {
    navbarCollapse.addEventListener("show.bs.collapse", function () {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    });
    navbarCollapse.addEventListener("hide.bs.collapse", function () {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    });
  }
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
