(function (window, document) {
  if (window.__giaoHangNhanhSharedLayoutLoaded) return;
  window.__giaoHangNhanhSharedLayoutLoaded = true;

  const currentPath = window.location.pathname.toLowerCase();
  const inPublicDir = currentPath.includes("/public/");
  const currentPage = currentPath.split("/").pop() || "index.html";
  const includesBase = inPublicDir ? "../includes/" : "includes/";
  const rootPath = inPublicDir ? "../" : "./";

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

    if (inPublicDir) {
      html = html.replace(/(src=['"])(?:\.\/)?public\//g, "$1");
    }

    host.innerHTML = html;
    return host;
  }

  function buildLinkMap() {
    const pricingLink = `${rootPath}public/tra-cuu-gia.html`;
    const trackingLink = `${rootPath}public/tra-don-hang.html`;
    const externalServicePrefix = inPublicDir ? '../../' : '../';

    return {
      mainSite: `${externalServicePrefix}index.html`,
      brand: `${rootPath}index.html`,
      mainLogo: `${externalServicePrefix}public/asset/image/logo.png`,
      brandLogo: `${rootPath}public/assets/images/favicon.png`,

      home: `${rootPath}index.html#hero`,
      about: `${rootPath}index.html#hero`,
      services: `${rootPath}index.html#services`,
      pricing: pricingLink,
      contact: `${rootPath}index.html#contact`,
      booking: `${rootPath}public/dat-lich-giao-hang-nhanh.html`,
      tracking: trackingLink,
      guide: `${rootPath}public/huong-dan-dat-hang.html`,
      login: `${rootPath}public/login.html`,
      register: `${rootPath}public/register.html`,
      "shipping-policy": `${rootPath}public/chinh-sach-van-chuyen.html`,
      privacy: `${rootPath}public/chinh-sach-bao-mat.html`,
      terms: `${rootPath}public/dieu-khoan-su-dung.html`,
      articles: `${rootPath}public/bai-viet.html`,

      "svc-giao-hang-nhanh": `${externalServicePrefix}giao-hang-nhanh/`,
      "svc-dich-vu-chuyen-don": `${externalServicePrefix}dich-vu-chuyen-don/`,
      "svc-lau-don-ve-sinh": `${externalServicePrefix}dich-vu-don-ve-sinh/demo/`,
      "svc-cham-soc-me-be": `${externalServicePrefix}cham-soc-me-va-be/`,
      "svc-cham-soc-vuon": `${externalServicePrefix}cham-soc-vuon-nha/`,
      "svc-giat-ui": `${externalServicePrefix}giat-ui-nhanh/`,
      "svc-tho-nha": `${externalServicePrefix}tho-nha/`,
      "svc-cham-soc-nguoi-gia": `${externalServicePrefix}cham-soc-nguoi-gia/`,
      "svc-cham-soc-nguoi-benh": `${externalServicePrefix}cham-soc-nguoi-benh/`,
      "svc-thue-xe": `${externalServicePrefix}thue-xe/`,
      "svc-sua-xe": `${externalServicePrefix}sua-xe-luu-dong/`,
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
    const faviconPath = inPublicDir
      ? "assets/images/favicon.ico"
      : "public/assets/images/favicon.ico";

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
