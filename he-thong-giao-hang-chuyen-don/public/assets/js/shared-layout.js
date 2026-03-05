(function (window, document) {
  if (window.__fastGoSharedLayoutLoaded) return;
  window.__fastGoSharedLayoutLoaded = true;

  const inPublicDir = window.location.pathname.toLowerCase().includes("/public/");
  const includesBase = inPublicDir ? "../includes/" : "includes/";

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
    if (inPublicDir) {
      return {
        brand: "../../index.html",
        home: "../index.html#hero",
        about: "../index.html#hero",
        services: "../index.html#services",
        pricing: "../index.html#pricing",
        tracking: "../index.html#home-tracking",
        contact: "../index.html#contact",
        booking: "../index.html#contact",
        guide: "huong-dan-dat-hang.html",
        login: "login.php",
        register: "register.php",
        "moving-house": "chuyen-nha.html",
        "moving-warehouse": "chuyen-kho-bai.html",
        "moving-office": "chuyen-van-phong.html",
        "shipping-policy": "chinh-sach-van-chuyen.html",
        privacy: "chinh-sach-bao-mat.html",
        terms: "dieu-khoan-su-dung.html",
      };
    }

    return {
      brand: "../index.html",
      home: "#hero",
      about: "#hero",
      services: "#services",
      pricing: "#pricing",
      tracking: "#home-tracking",
      contact: "#contact",
      booking: "#contact",
      guide: "public/huong-dan-dat-hang.html",
      login: "public/login.php",
      register: "public/register.php",
      "moving-house": "public/chuyen-nha.html",
      "moving-warehouse": "public/chuyen-kho-bai.html",
      "moving-office": "public/chuyen-van-phong.html",
      "shipping-policy": "public/chinh-sach-van-chuyen.html",
      privacy: "public/chinh-sach-bao-mat.html",
      terms: "public/dieu-khoan-su-dung.html",
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

  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap();

  if (headerHost) applyLinks(headerHost, linkMap);
  if (footerHost) applyLinks(footerHost, linkMap);
})(window, document);


