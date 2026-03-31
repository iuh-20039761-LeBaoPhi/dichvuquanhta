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
    "dashboard.html": "account",
    "lich-su-yeu-cau.html": "account",
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

  const PROMO_POPUP_ALLOWED_PAGES = new Set([
    "",
    "index.html",
    "dich-vu-chuyen-don.html",
    "bang-gia-chuyen-don.html",
    "dat-lich.html",
    "khao-sat.html",
    "chuyen-nha.html",
    "chuyen-kho-bai.html",
    "chuyen-van-phong.html",
  ]);
  const PROMO_POPUP_STORAGE_KEY = "moving_promo_popup_seen_date_v1";

  function getVietnamDateToken() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch (error) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  function canUseLocalStorage() {
    try {
      const probeKey = "__moving_promo_popup_probe__";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function shouldShowPromoPopup() {
    if (!PROMO_POPUP_ALLOWED_PAGES.has(currentPage)) return false;
    if (!canUseLocalStorage()) return true;
    return (
      window.localStorage.getItem(PROMO_POPUP_STORAGE_KEY) !==
      getVietnamDateToken()
    );
  }

  function markPromoPopupSeen() {
    if (!canUseLocalStorage()) return;
    try {
      window.localStorage.setItem(
        PROMO_POPUP_STORAGE_KEY,
        getVietnamDateToken(),
      );
    } catch (error) {
      console.warn("Không thể lưu trạng thái popup quảng cáo:", error);
    }
  }

  function ensurePromoPopup(linkMap) {
    const existing = document.getElementById("promo-popup-overlay");
    if (existing) return existing;

    const overlay = document.createElement("div");
    overlay.id = "promo-popup-overlay";
    overlay.className = "promo-popup-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "promo-popup-title");
    overlay.innerHTML = `
      <div class="promo-popup-card">
        <button type="button" class="promo-popup-close" aria-label="Đóng thông báo">&times;</button>
        <div class="promo-popup-body">
          <div class="promo-popup-copy">
            <span class="promo-popup-kicker">
              <i class="fas fa-box-open"></i>
              Ưu đãi chuyển dọn trong ngày
            </span>
            <h2 class="promo-popup-title" id="promo-popup-title">
              Chuyển dọn <strong>trọn gói</strong> gọn nhẹ trong ngày
            </h2>
            <p class="promo-popup-desc">
              Khảo sát miễn phí, báo giá rõ ràng, đội ngũ chuyên nghiệp bọc lót cẩn thận.
            </p>
            <div class="promo-popup-highlights">
              <div class="promo-popup-chip">
                <strong>Khảo sát miễn phí</strong>
                <span>Ước tính khối lượng và báo giá trọn gói trước khi chuyển.</span>
              </div>
              <div class="promo-popup-chip">
                <strong>Cam kết an toàn</strong>
                <span>Hợp đồng rõ ràng, đền bù nếu có hư hại do vận chuyển.</span>
              </div>
            </div>
            <div class="promo-popup-actions">
              <a href="${linkMap.pricing}" class="promo-popup-btn promo-popup-btn--primary" data-promo-link="pricing">
                <i class="fas fa-tags"></i>
                Nhận báo giá
              </a>
              <a href="${linkMap.survey}" class="promo-popup-btn promo-popup-btn--secondary" data-promo-link="survey">
                <i class="fas fa-calendar-check"></i>
                Đặt lịch khảo sát
              </a>
            </div>
            <div class="promo-popup-note">
              Thông báo chỉ hiển thị một lần trong ngày để tránh làm phiền bạn.
            </div>
          </div>
          <div class="promo-popup-visual" aria-hidden="true">
            <span class="promo-popup-live">Moving Care</span>
            <div class="promo-popup-map">
              <span class="promo-popup-pin promo-popup-pin--start">
                <i class="fas fa-house"></i>
              </span>
              <span class="promo-popup-pin promo-popup-pin--end">
                <i class="fas fa-truck-moving"></i>
              </span>
            </div>
            <h3>Chuyển dọn gọn trong ngày</h3>
            <p>
              Đội xe và nhân lực sẵn sàng theo lịch của bạn.
            </p>
          </div>
        </div>
      </div>
    `;

    const closeBtn = overlay.querySelector(".promo-popup-close");
    const dismiss = () => {
      overlay.remove();
      document.body.classList.remove("promo-popup-open");
      document.removeEventListener("keydown", handleEscClose);
    };
    const handleEscClose = (event) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    closeBtn?.addEventListener("click", dismiss);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) dismiss();
    });
    overlay.querySelectorAll("[data-promo-link]").forEach((link) => {
      link.addEventListener("click", () => {
        dismiss();
      });
    });

    document.body.appendChild(overlay);
    document.body.classList.add("promo-popup-open");
    document.addEventListener("keydown", handleEscClose);
    return overlay;
  }

  function maybeShowPromoPopup(linkMap) {
    if (!shouldShowPromoPopup()) return;
    markPromoPopupSeen();
    window.setTimeout(() => {
      ensurePromoPopup(linkMap);
    }, 650);
  }

  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap();

  if (headerHost) applyLinks(headerHost, linkMap);
  if (headerHost) applyActiveNav(headerHost);
  if (footerHost) applyLinks(footerHost, linkMap);
  maybeShowPromoPopup(linkMap);

  window.addEventListener("hashchange", function () {
    if (headerHost) applyActiveNav(headerHost);
  });
})(window, document);
