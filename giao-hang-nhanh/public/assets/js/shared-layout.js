(function (window, document) {
  if (window.__giaoHangNhanhSharedLayoutLoaded) return;
  window.__giaoHangNhanhSharedLayoutLoaded = true;

  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const currentPathLower = currentPath.toLowerCase();
  const inPublicDir = currentPathLower.includes("/public/");
  const currentPage = currentPathLower.split("/").pop() || "index.html";
  const projectMarker = "/giao-hang-nhanh/";
  const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
  const projectBase = projectMarkerIndex !== -1
    ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
    : "./";
  const parentBase = projectBase.replace(/giao-hang-nhanh\/?$/i, "");
  const includesBase = `${projectBase}includes/`;

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

    let html = loadPartial(`${includesBase}${fileName}`);
    if (!html) return null;

    host.innerHTML = html;
    return host;
  }

  function buildLinkMap() {
    return {
      mainSite: `${parentBase}index.html`,
      brand: `${projectBase}index.html`,
      mainLogo: `${parentBase}public/asset/image/logo.png`,
      brandLogo: `${projectBase}public/assets/images/favicon.png`,

      home: `${projectBase}index.html#hero`,
      about: `${projectBase}index.html#hero`,
      services: `${projectBase}index.html#services`,
      pricing: `${projectBase}tra-cuu-gia.html`,
      contact: `${projectBase}index.html#contact`,
      booking: `${projectBase}dat-lich-giao-hang-nhanh.html`,
      tracking: `${projectBase}tra-don-hang.html`,
      guide: `${projectBase}huong-dan-dat-hang.html`,
      login: `${projectBase}dang-nhap.html`,
      register: `${projectBase}dang-ky.html`,
      "shipping-policy": `${projectBase}chinh-sach-van-chuyen.html`,
      privacy: `${projectBase}chinh-sach-bao-mat.html`,
      terms: `${projectBase}dieu-khoan-su-dung.html`,
      articles: `${projectBase}bai-viet.html`,

      "svc-giao-hang-nhanh": `${parentBase}giao-hang-nhanh/`,
      "svc-dich-vu-chuyen-don": `${parentBase}dich-vu-chuyen-don/`,
      "svc-lau-don-ve-sinh": `${parentBase}dich-vu-don-ve-sinh/demo/`,
      "svc-cham-soc-me-be": `${parentBase}cham-soc-me-va-be/`,
      "svc-cham-soc-vuon": `${parentBase}cham-soc-vuon-nha/`,
      "svc-giat-ui": `${parentBase}giat-ui-nhanh/`,
      "svc-tho-nha": `${parentBase}tho-nha/`,
      "svc-cham-soc-nguoi-gia": `${parentBase}cham-soc-nguoi-gia/`,
      "svc-cham-soc-nguoi-benh": `${parentBase}cham-soc-nguoi-benh/`,
      "svc-thue-xe": `${parentBase}thue-xe/`,
      "svc-sua-xe": `${parentBase}sua-xe-luu-dong/`,
    };
  }

  function applyLinks(root, linkMap) {
    root.querySelectorAll("[data-layout-link]").forEach((element) => {
      const key = element.getAttribute("data-layout-link");
      if (key && linkMap[key]) {
        if (element.tagName.toLowerCase() === "img") {
          element.setAttribute("src", linkMap[key]);
        } else {
          element.setAttribute("href", linkMap[key]);
        }
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
    if (currentPage === "huong-dan-dat-hang.html") return "guide";
    if (currentPage === "tra-cuu-gia.html") return "pricing";
    if (currentPage === "tra-don-hang.html") return "tracking";
    if (currentPage === "dat-lich-giao-hang-nhanh.html") return "booking";

    const onRootIndexPage =
      !inPublicDir && (currentPage === "index.html" || currentPage === "");
    if (!onRootIndexPage) return "";

    const hash = window.location.hash.toLowerCase();
    if (hash === "#services") return "services";
    if (hash === "#contact") return "contact";
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

  function applyFavicon() {
    const faviconPath = `${projectBase}public/assets/images/favicon.ico`;

    let faviconLink = document.querySelector("link[rel='icon']");
    if (faviconLink) {
      faviconLink.href = faviconPath;
    } else {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = "image/x-icon";
      faviconLink.href = faviconPath;
      document.head.appendChild(faviconLink);
    }
  }

  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap();

  if (headerHost) applyLinks(headerHost, linkMap);
  if (headerHost) applyActiveNav(headerHost);
  if (footerHost) applyLinks(footerHost, linkMap);
  applyFavicon();

  window.addEventListener("hashchange", function () {
    if (headerHost) applyActiveNav(headerHost);
  });
})(window, document);
