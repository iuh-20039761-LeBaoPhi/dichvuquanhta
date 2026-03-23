(function (window, document) {
  if (window.__fastGoSharedLayoutLoaded) return;
  window.__fastGoSharedLayoutLoaded = true;

  const currentPath = window.location.pathname.toLowerCase();
  const inPublicDir = currentPath.includes("/public/");
  const currentPage = currentPath.split("/").pop() || "index.html";
  // Xác định đường dẫn gốc của dự án một cách linh hoạt.
  // Nếu trang hiện tại nằm trong /public/, đường dẫn gốc sẽ là '../'.
  // Nếu không, nó đang ở thư mục gốc của dự án, đường dẫn là './'.
  const rootPath = inPublicDir ? "../" : "./";
  const includesBase = `${rootPath}includes/`;
  const servicePageKeyByFile = {
    "chuyen-nha.html": "moving-house",
    "chuyen-kho-bai.html": "moving-warehouse",
    "chuyen-van-phong.html": "moving-office",
    "cam-nang.html": "news",
    "cam-nang-chi-tiet.html": "news",
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
    // Chỉ các trang dịch vụ chi tiết mới có mục #bao-gia.
    // Các trang khác sẽ link về mục dịch vụ ở trang chủ.
    const hasPricingSection = [
      "chuyen-nha.html",
      "chuyen-kho-bai.html",
      "chuyen-van-phong.html",
    ].includes(currentPage);
    const pricingLink = hasPricingSection ? "#bao-gia" : `${rootPath}index.html#services`;

    // Xác định tiền tố đường dẫn tương đối để trỏ đến các dịch vụ khác (nằm ngoài project này)
    // LƯU Ý: Logic này có thể không chính xác nếu cấu trúc thư mục thay đổi.
    const externalServicePrefix = inPublicDir ? '../../' : '../';

    // Dịch vụ luôn trỏ về id="bao-gia" của trang hiện tại nếu đang ở các trang dịch vụ
    const isServicePage = ["chuyen-nha.html", "chuyen-kho-bai.html", "chuyen-van-phong.html"].includes(currentPage);
    const servicesLink = isServicePage ? "#bao-gia" : `${rootPath}index.html#services`;

    // Sử dụng rootPath để tạo các đường dẫn chính xác, bất kể dự án được đặt ở đâu.
    return {
      mainSite: `${externalServicePrefix}index.html`,
      brand: `${rootPath}index.html`,
      mainLogo: `${rootPath}public/assets/images/logo-dich-vu-quanh-ta.png`,
      home: `${rootPath}index.html#hero`,
      about: `${rootPath}index.html#hero`, // Giả sử 'about' trỏ về mục hero ở trang chủ
      services: servicesLink,
      pricing: pricingLink,
      contact: `${rootPath}index.html#contact`,
      booking: `${rootPath}index.html#contact`,
      policy: `${rootPath}public/chinh-sach-va-dieu-khoan.html`,
      "moving-house": `${rootPath}public/chuyen-nha.html`,
      "moving-warehouse": `${rootPath}public/chuyen-kho-bai.html`,
      "moving-office": `${rootPath}public/chuyen-van-phong.html`,
      "news": `${rootPath}public/cam-nang.html`,
      "brandLogo": `${rootPath}public/assets/images/favicon.png`,

      // Các link đến dịch vụ khác trong footer
      "svc-giao-hang-nhanh": `${externalServicePrefix}giao-hang-nhanh/dich-vu-giao-hang.html`,
      "svc-dich-vu-chuyen-don": `${rootPath}index.html`,
      "svc-lau-don-ve-sinh": `${externalServicePrefix}dich-vu-don-ve-sinh/demo/services.html`,
      "svc-cham-soc-me-be": `${externalServicePrefix}cham-soc-me-va-be/dich-vu-cham-soc-me-be.html`,
      "svc-cham-soc-vuon": `${externalServicePrefix}cham-soc-vuon-nha/dichvu.html`,
      "svc-giat-ui": `${externalServicePrefix}giat-ui-nhanh/dich-vu.html`,
      "svc-tho-nha": `${externalServicePrefix}tho-nha/pages/public/dich-vu.html`,
      "svc-cham-soc-nguoi-gia": `${externalServicePrefix}cham-soc-nguoi-gia/dich-vu-cham-soc-nguoi-gia.html`,
      "svc-cham-soc-nguoi-benh": `${externalServicePrefix}cham-soc-nguoi-benh/dich-vu-cham-soc-nguoi-benh.html`,
      "svc-thue-xe": `${externalServicePrefix}thue-xe/views/pages/public/dich-vu.html`,
      "svc-sua-xe": `${externalServicePrefix}sua-xe-luu-dong/dich-vu.html`,
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

  // INJECT BOOKING MODAL
  const modalContainer = document.createElement('div');
  modalContainer.id = 'booking-modal-placeholder';
  document.body.appendChild(modalContainer);
  injectPartial('booking-modal-placeholder', 'booking-modal.html');

  // INJECT SURVEY MODAL
  const surveyModalContainer = document.createElement('div');
  surveyModalContainer.id = 'survey-modal-placeholder';
  document.body.appendChild(surveyModalContainer);
  injectPartial('survey-modal-placeholder', 'survey-modal.html');

  // TRIGGER MODALS VIA DATA-ATTRIBUTE
  document.addEventListener('click', function(e) {
    // Booking Modal
    const bookingTrigger = e.target.closest('[data-open-booking]');
    if (bookingTrigger && typeof window.openBookingModal === 'function') {
      e.preventDefault();
      const serviceType = bookingTrigger.getAttribute('data-open-booking');
      window.openBookingModal(serviceType);
    }
    
    // Survey Modal
    const surveyTrigger = e.target.closest('[data-open-survey]');
    if (surveyTrigger && typeof window.openSurveyModal === 'function') {
      e.preventDefault();
      const serviceType = surveyTrigger.getAttribute('data-open-survey');
      window.openSurveyModal(serviceType);
    }
  });

  window.addEventListener("hashchange", function () {
    if (headerHost) applyActiveNav(headerHost);
  });
})(window, document);
