(function (window, document) {
  if (window.__fastGoSharedLayoutLoaded) return;
  window.__fastGoSharedLayoutLoaded = true;

  const currentPath = window.location.pathname.toLowerCase();
  const inPublicDir = currentPath.includes("/public/");
  const currentPage = currentPath.split("/").pop() || "index.html";
  const includesBase = inPublicDir ? "../includes/" : "includes/";
  const servicePageKeyByFile = {
    "chuyen-nha.html": "moving-house",
    "chuyen-kho-bai.html": "moving-warehouse",
    "chuyen-van-phong.html": "moving-office",
    "tin-tuc.html": "news",
    "chi-tiet-tin-tuc.html": "news",
  };

  function isServiceLandingPage(fileName) {
    return Object.prototype.hasOwnProperty.call(servicePageKeyByFile, fileName);
  }

  function loadPartial(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText.trim()) {
        return xhr.responseText;
      }
      console.error("Cannot load layout partial:", url, xhr.status);
    } catch (err) {
      console.error("Cannot load layout partial:", url, err);
    }
    return "";
  }

  function injectPartial(hostId, fileName) {
    const host = document.getElementById(hostId);
    if (!host) return null;

    const html = loadPartial(`${includesBase}${fileName}`);
    if (!html) return null;

    host.innerHTML = html;
    return host;
  }

  function buildLinkMap() {
    const pricingLink = isServiceLandingPage(currentPage)
      ? "#bao-gia"
      : inPublicDir
        ? "../index.html#bao-gia"
        : "#bao-gia";

    if (inPublicDir) {
      return {
        brand: "../index.html",
        home: "../index.html#hero",
        about: "../index.html#hero",
        services: "../index.html#services",
        pricing: pricingLink,
        contact: "../index.html#contact",
        booking: "../index.html#contact",
        policy: "../policy.html",
        "moving-house": "chuyen-nha.html",
        "moving-warehouse": "chuyen-kho-bai.html",
        "moving-office": "chuyen-van-phong.html",
        "news": "tin-tuc.html",
      };
    }

    return {
      brand: "index.html",
      home: "#hero",
      about: "#hero",
      services: "#services",
      pricing: pricingLink,
      contact: "#contact",
      booking: "#contact",
      policy: "policy.html",
      "moving-house": "public/chuyen-nha.html",
      "moving-warehouse": "public/chuyen-kho-bai.html",
      "moving-office": "public/chuyen-van-phong.html",
      "news": "public/tin-tuc.html",
    };
  }

  function applyLinks(root, linkMap) {
    root.querySelectorAll("[data-layout-link]").forEach((element) => {
      const key = element.getAttribute("data-layout-link");
      if (key && linkMap[key]) {
        element.setAttribute("href", linkMap[key]);
      }
    });

    const bookingLink = root.querySelector('[data-layout-link="booking"]');
    if (bookingLink) {
      bookingLink.addEventListener("click", function (event) {
        if (typeof window.openBookingModal === "function") {
          event.preventDefault();
          window.openBookingModal();
        }
      });
    }
  }

  function resolveActiveLinkKey() {
    if (servicePageKeyByFile[currentPage]) {
      return servicePageKeyByFile[currentPage];
    }

    const onRootIndexPage =
      !inPublicDir && (currentPage === "index.html" || currentPage === "");
    if (!onRootIndexPage) return "";

    const hash = window.location.hash.toLowerCase();
    if (hash === "#services") return "services";
    if (hash === "#bao-gia") return "pricing";
    if (hash === "#contact") return "booking";
    return "home";
  }

  function applyActiveNav(root) {
    if (!root) return;

    root.querySelectorAll("#nav-menu li.active").forEach((item) => {
      item.classList.remove("active");
    });

    const activeKey = resolveActiveLinkKey();
    if (!activeKey) return;

    const activeLink = root.querySelector(`[data-layout-link="${activeKey}"]`);
    if (!activeLink) return;

    const activeItem = activeLink.closest("li");
    if (activeItem) {
      activeItem.classList.add("active");
    }

    const dropdownParent = activeLink.closest(".dropdown");
    if (dropdownParent) {
      dropdownParent.classList.add("active");
    }
  }

  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap();

  if (headerHost) applyLinks(headerHost, linkMap);
  if (headerHost) applyActiveNav(headerHost);
  if (footerHost) applyLinks(footerHost, linkMap);

  window.addEventListener("hashchange", function () {
    if (headerHost) applyActiveNav(headerHost);
  });
})(window, document);
