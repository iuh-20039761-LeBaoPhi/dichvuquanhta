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
  const authSessionKey = "ghn-auth-session";

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
      mainLogo: `${projectBase}public/assets/images/logo-dich-vu-quanh-ta.png`,
      brandLogo: `${projectBase}public/assets/images/favicon.png`,

      home: `${projectBase}index.html`,
      about: `${projectBase}index.html`,
      services: `${projectBase}dich-vu-giao-hang.html`,
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
      articles: `${projectBase}cam-nang.html`,

      "svc-giao-hang-nhanh": `${projectBase}dich-vu-giao-hang.html`,
      "svc-dich-vu-chuyen-don": `${parentBase}dich-vu-chuyen-don/dich-vu-chuyen-don.html`,
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

  function escapeHtml(text) {
    if (window.GiaoHangNhanhCore?.escapeHtml) {
      return window.GiaoHangNhanhCore.escapeHtml(text);
    }
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function readLocalSession() {
    try {
      const raw = window.localStorage.getItem(authSessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function resolveAccountLinks(session) {
    const role = String(session?.role || "").trim().toLowerCase();
    if (role === "shipper") {
      return {
        dashboard: `${projectBase}public/nha-cung-cap/dashboard.html`,
        profile: `${projectBase}public/nha-cung-cap/ho-so.html`,
      };
    }

    return {
      dashboard: `${projectBase}public/khach-hang/dashboard.html`,
      profile: `${projectBase}public/khach-hang/ho-so.html`,
    };
  }

  function syncAuthNav(root) {
    if (!root) return;

    const loginItem = root.querySelector("#nav-login-item");
    const registerItem = root.querySelector("#nav-register-item");
    if (!loginItem || !registerItem) return;

    const session = readLocalSession();
    if (!session) {
      loginItem.innerHTML =
        '<a data-layout-link="login" href="dang-nhap.html">Đăng nhập</a>';
      registerItem.innerHTML =
        '<a data-layout-link="register" href="dang-ky.html" class="btn-primary nav-auth-cta">Đăng ký</a>';
      applyLinks(root, linkMap);
      return;
    }

    const accountLinks = resolveAccountLinks(session);
    const firstName = escapeHtml(
      String(session.fullname || session.ho_ten || session.username || "Tài khoản")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(-1)[0] || "Tài khoản",
    );
    const accountSummary = escapeHtml(
      String(session.phone || "").trim() || String(session.email || "").trim() || "Khu vực cá nhân"
    );

    loginItem.className = "dropdown has-submenu customer-nav-dropdown";
    loginItem.innerHTML = `
      <a href="${accountLinks.dashboard}">Xin chào, ${firstName}</a>
      <ul class="dropdown-menu customer-nav-dropdown-menu" style="text-align: left;">
        <li class="customer-nav-dropdown-summary">
          <div class="customer-nav-dropdown-avatar">${firstName.charAt(0)}</div>
          <div class="customer-nav-dropdown-user">
            <strong>${firstName}</strong>
            <span>${accountSummary}</span>
          </div>
        </li>
        <li><a href="${accountLinks.dashboard}"><i class="fas fa-chart-line"></i> Tổng quan</a></li>
        <li><a href="${projectBase}public/khach-hang/lich-su-don-hang.html"><i class="fas fa-box"></i> Lịch sử đơn hàng</a></li>
        <li><a href="${accountLinks.profile}"><i class="fas fa-user"></i> Hồ sơ cá nhân</a></li>
        <li class="customer-nav-logout-wrapper"><a href="${projectBase}dang-nhap.html" class="customer-nav-logout" data-local-logout="1"><i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất</a></li>
      </ul>
    `;
    registerItem.innerHTML = "";
    registerItem.hidden = true;
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

  const PROMO_POPUP_ALLOWED_PAGES = new Set([
    "",
    "index.html",
    "dich-vu-giao-hang.html",
    "tra-cuu-gia.html",
  ]);
  const PROMO_POPUP_STORAGE_KEY = "ghn_delivery_promo_popup_seen_date_v1";

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
      const probeKey = "__ghn_promo_popup_probe__";
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
              <i class="fas fa-bolt"></i>
              Ưu đãi nổi bật trong ngày
            </span>
            <h2 class="promo-popup-title" id="promo-popup-title">
              Giao hàng tiết kiệm <strong>đến 30%</strong> so với đơn vị giao hàng công nghệ
            </h2>
            <p class="promo-popup-desc">
              Theo dõi lộ trình giao nhận rõ ràng, cập nhật trạng thái đơn ngay trên website.
            </p>
            <div class="promo-popup-highlights">
              <div class="promo-popup-chip">
                <strong>Giá minh bạch</strong>
                <span>Cước phí rõ ràng, dễ đối chiếu cho nhu cầu giao nội thành.</span>
              </div>
              <div class="promo-popup-chip">
                <strong>Cập nhật nhanh</strong>
                <span>Nắm tình trạng đơn liên tục để chủ động nhận và giao hàng.</span>
              </div>
            </div>
            <div class="promo-popup-actions">
              <a href="${linkMap.pricing}" class="promo-popup-btn promo-popup-btn--primary" data-promo-link="pricing">
                <i class="fas fa-tags"></i>
                Tra giá ngay
              </a>
              <a href="${linkMap.booking}" class="promo-popup-btn promo-popup-btn--secondary" data-promo-link="booking">
                <i class="fas fa-truck-fast"></i>
                Đặt đơn nhanh
              </a>
            </div>
            <div class="promo-popup-note">
              Thông báo này chỉ hiển thị một lần trong ngày để tránh làm phiền bạn.
            </div>
          </div>
          <div class="promo-popup-visual" aria-hidden="true">
            <span class="promo-popup-live">Realtime Tracking</span>
            <div class="promo-popup-map">
              <span class="promo-popup-pin promo-popup-pin--start">
                <i class="fas fa-box"></i>
              </span>
              <span class="promo-popup-pin promo-popup-pin--end">
                <i class="fas fa-location-dot"></i>
              </span>
            </div>
            <h3>Nhìn thấy hành trình đơn hàng</h3>
            <p>
              Theo dõi từ lúc lấy hàng đến khi giao xong ngay trên bản đồ.
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
  if (headerHost) syncAuthNav(headerHost);
  if (footerHost) applyLinks(footerHost, linkMap);
  document.dispatchEvent(
    new CustomEvent("ghn:layout-ready", {
      detail: {
        headerHost,
        footerHost,
      },
    }),
  );
  applyFavicon();
  maybeShowPromoPopup(linkMap);

  window.addEventListener("hashchange", function () {
    if (headerHost) applyActiveNav(headerHost);
  });

  window.addEventListener("storage", function (event) {
    if (event.key === authSessionKey && headerHost) {
      syncAuthNav(headerHost);
    }
  });

  document.addEventListener("ghn:auth-changed", function () {
    if (headerHost) {
      syncAuthNav(headerHost);
    }
  });
})(window, document);
