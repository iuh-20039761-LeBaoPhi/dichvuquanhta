(function (window, document) {
  if (window.__giaoHangNhanhSharedLayoutLoaded) return;
  window.__giaoHangNhanhSharedLayoutLoaded = true;

  const currentPath = window.location.pathname.toLowerCase();
  const inPublicDir = currentPath.includes("/public/");
  const currentPage = currentPath.split("/").pop() || "index.html";
  const includesBase = inPublicDir ? "../includes/" : "includes/";
  const servicePageKeyByFile = {
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

    let html = loadPartial(`${includesBase}${fileName}`);
    if (!html) return null;

    // FIX: Tự động điều chỉnh đường dẫn ảnh (src) nếu đang ở trong thư mục public/
    // Chuyển "./public/assets/..." thành "assets/..."
    if (inPublicDir) {
      html = html.replace(/(src=['"])(?:\.\/)?public\//g, "$1");
    }

    host.innerHTML = html;
    return host;
  }

  function buildServiceLinkMap(basePrefix) {
    const services = {
      "giao-hang-nhanh": "giao-hang-nhanh/",
      "chuyen-don": "dich-vu-chuyen-don/",
      "lau-don": "vesinhcare/demo/",
      "me-be": "csmvb/",
      "vuon-ray": "web-cham-soc-vuon-nha/",
      "giat-ui": "giat-ui-nhanh/",
      "tho-nha": "tho-nha/",
      "nguoi-gia": "csng/",
      "benh-nhan": "csbn/",
      "thue-xe": "thue-xe/",
      "sua-xe": "sua-xe-luu-dong/",
    };
    const serviceLinks = {};
    for (const key in services) {
      serviceLinks[`service-${key}`] = `${basePrefix}${services[key]}`;
    }
    return serviceLinks;
  }

  function buildLinkMap() {
    const pricingLink = isServiceLandingPage(currentPage)
      ? "#bao-gia"
      : inPublicDir
        ? "../index.html#quick-quote"
        : "#quick-quote";

    const serviceLinkPrefix = inPublicDir ? "../../" : "../";
    const serviceLinks = buildServiceLinkMap(serviceLinkPrefix);

    if (inPublicDir) {
      const mainLinks = {
        brand: "../index.html",
        home: "../index.html#hero",
        about: "../index.html#hero",
        services: "../index.html#services",
        "delivery-services": "../index.html",
        pricing: pricingLink,
        news: "tin-tuc.html",
        tracking: "../index.html#home-tracking",
        contact: "../index.html#contact",
        booking: "../index.html#contact",
        guide: "huong-dan-dat-hang.html",
        login: "login.php",
        register: "register.php",
        "shipping-policy": "chinh-sach-van-chuyen.html",
        privacy: "chinh-sach-bao-mat.html",
        terms: "dieu-khoan-su-dung.html",
      };
      return { ...mainLinks, ...serviceLinks };
    }

    const rootLinks = {
      brand: "index.html",
      home: "#hero",
      about: "#hero",
      services: "#services",
      "delivery-services": "index.html",
      news: "public/tin-tuc.html",
      pricing: pricingLink,
      tracking: "#home-tracking",
      contact: "#contact",
      booking: "#contact",
      guide: "public/huong-dan-dat-hang.html",
      login: "public/login.php",
      register: "public/register.php",
      "shipping-policy": "public/chinh-sach-van-chuyen.html",
      privacy: "public/chinh-sach-bao-mat.html",
      terms: "public/dieu-khoan-su-dung.html",
    };
    return { ...rootLinks, ...serviceLinks };
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

    if (currentPage === "huong-dan-dat-hang.html") return "guide";

    const onRootIndexPage =
      !inPublicDir && (currentPage === "index.html" || currentPage === "");
    if (!onRootIndexPage) return "";

    const hash = window.location.hash.toLowerCase();
    if (hash === "#services") return "services";
    if (hash === "#quick-quote") return "pricing";
    if (hash === "#home-tracking") return "tracking";
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
