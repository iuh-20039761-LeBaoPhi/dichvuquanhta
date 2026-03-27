(function (window, document) {
  if (window.__fastGoSharedLayoutLoaded) return;
  window.__fastGoSharedLayoutLoaded = true;

  const currentPath = String(window.location.pathname || "").replace(/\\/g, "/");
  const currentPathLower = currentPath.toLowerCase();
  const inPublicDir = currentPathLower.includes("/public/");
  const currentPage = currentPathLower.split("/").pop() || "index.html";
  const projectMarker = "/dich-vu-chuyen-don/";
  const projectMarkerIndex = currentPathLower.lastIndexOf(projectMarker);
  const projectBase =
    projectMarkerIndex !== -1
      ? currentPath.slice(0, projectMarkerIndex + projectMarker.length)
      : "./";
  const parentBase = projectBase.replace(/dich-vu-chuyen-don\/?$/i, "");
  const publicBase = `${projectBase}public/`;
  const includesBase = `${projectBase}includes/`;
  const servicePageKeyByFile = {
    "dich-vu-chuyen-don.html": "services",
    "bang-gia-chuyen-don.html": "pricing",
    "chuyen-nha.html": "moving-house",
    "chuyen-kho-bai.html": "moving-warehouse",
    "chuyen-van-phong.html": "moving-office",
    "cam-nang.html": "news",
    "cam-nang-chi-tiet.html": "news",
    "khao-sat.html": "survey",
    "dat-lich.html": "booking",
    "dang-nhap.html": "account",
    "dang-ky.html": "account",
  };

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
    const hasPricingSection = [
      "chuyen-nha.html",
      "chuyen-kho-bai.html",
      "chuyen-van-phong.html",
    ].includes(currentPage);
    const pricingLink = hasPricingSection
      ? "#pricing-reference"
      : `${projectBase}bang-gia-chuyen-don.html`;
    const servicesLink = `${projectBase}dich-vu-chuyen-don.html`;

    return {
      mainSite: `${parentBase}index.html`,
      brand: `${projectBase}index.html`,
      mainLogo: `${publicBase}assets/images/logo-dich-vu-quanh-ta.png`,
      home: `${projectBase}index.html#hero`,
      about: `${projectBase}index.html#hero`,
      services: servicesLink,
      pricing: pricingLink,
      contact: `${projectBase}index.html#contact`,
      survey: `${projectBase}khao-sat.html`,
      booking: `${projectBase}dat-lich.html`,
      account: `${projectBase}dang-nhap.html?vai-tro=khach-hang`,
      login: `${projectBase}dang-nhap.html`,
      register: `${projectBase}dang-ky.html`,
      "login-customer": `${projectBase}dang-nhap.html?vai-tro=khach-hang`,
      "register-customer": `${projectBase}dang-ky.html?vai-tro=khach-hang`,
      "login-provider": `${projectBase}dang-nhap.html?vai-tro=doi-tac`,
      "register-provider": `${projectBase}dang-ky.html?vai-tro=doi-tac`,
      policy: `${projectBase}chinh-sach-va-dieu-khoan.html`,
      "moving-house": `${publicBase}trang/dich-vu/chuyen-nha.html`,
      "moving-warehouse": `${publicBase}trang/dich-vu/chuyen-kho-bai.html`,
      "moving-office": `${publicBase}trang/dich-vu/chuyen-van-phong.html`,
      "news": `${projectBase}cam-nang.html`,
      "brandLogo": `${publicBase}assets/images/favicon.png`,

      "svc-giao-hang-nhanh": `${parentBase}giao-hang-nhanh/dich-vu-giao-hang.html`,
      "svc-dich-vu-chuyen-don": `${projectBase}dich-vu-chuyen-don.html`,
      "svc-lau-don-ve-sinh": `${parentBase}dich-vu-don-ve-sinh/demo/services.html`,
      "svc-cham-soc-me-be": `${parentBase}cham-soc-me-va-be/dich-vu-cham-soc-me-be.html`,
      "svc-cham-soc-vuon": `${parentBase}cham-soc-vuon-nha/dichvu.html`,
      "svc-giat-ui": `${parentBase}giat-ui-nhanh/dich-vu.html`,
      "svc-tho-nha": `${parentBase}tho-nha/pages/public/dich-vu.html`,
      "svc-cham-soc-nguoi-gia": `${parentBase}cham-soc-nguoi-gia/dich-vu-cham-soc-nguoi-gia.html`,
      "svc-cham-soc-nguoi-benh": `${parentBase}cham-soc-nguoi-benh/dich-vu-cham-soc-nguoi-benh.html`,
      "svc-thue-xe": `${parentBase}thue-xe/views/pages/public/dich-vu.html`,
      "svc-sua-xe": `${parentBase}sua-xe-luu-dong/dich-vu.html`,
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
  }

  function resolveActiveLinkKey() {
    if (servicePageKeyByFile[currentPage]) {
      return servicePageKeyByFile[currentPage];
    }

    const onRootIndexPage =
      !inPublicDir && (currentPage === "index.html" || currentPage === "");
    if (!onRootIndexPage) return "";

    const hash = window.location.hash.toLowerCase();
    if (
      hash === "#pricing-reference" ||
      hash === "#pricing" ||
      hash === "#bao-gia"
    ) return "pricing";
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
