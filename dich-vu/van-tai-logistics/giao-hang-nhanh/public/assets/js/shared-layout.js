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
  const parentBase = projectBase.replace(
    /(?:dich-vu\/van-tai-logistics\/)?giao-hang-nhanh\/?$/i,
    "",
  );
  const includesBase = `${projectBase}includes/`;
  const authSessionKey = "ghn-auth-session";
  const localAuthScriptPath = `${projectBase}public/assets/js/local-auth.js`;
  let authBootstrapPromise = null;

  function toDirectoryUrl(path) {
    const value = String(path || "/").trim();
    if (!value) return "/";
    if (value.endsWith("/")) return value;
    return `${value}/`;
  }

  function buildServiceDirectory() {
    return [
      {
        key: "svc-giao-hang-nhanh",
        label: "Giao Hàng Nhanh",
        group: "van-tai-logistics",
        href: `${projectBase}dich-vu-giao-hang.html`,
      },
      {
        key: "svc-dich-vu-chuyen-don",
        label: "Dịch Vụ Chuyển Dọn",
        group: "van-tai-logistics",
        href: `${parentBase}dich-vu/van-tai-logistics/dich-vu-chuyen-don/dich-vu-chuyen-don.html`,
      },
      {
        key: "svc-thue-xe",
        label: "Thuê Xe",
        group: "van-tai-logistics",
        href: `${parentBase}dich-vu/van-tai-logistics/thue-xe/dich-vu.html`,
      },
      {
        key: "svc-lai-xe-ho",
        label: "Dịch vụ lái xe hộ",
        group: "van-tai-logistics",
        href: `${parentBase}dich-vu/van-tai-logistics/dich-vu-lai-xe-ho/dich-vu.html`,
      },
      {
        key: "svc-cham-soc-nguoi-benh",
        label: "Chăm Sóc Người Bệnh",
        group: "cham-soc",
        href: `${parentBase}dich-vu/cham-soc/nguoi-benh/dich-vu.html`,
      },
      {
        key: "svc-cham-soc-me-be",
        label: "Chăm Sóc Mẹ & Bé",
        group: "cham-soc",
        href: `${parentBase}dich-vu/cham-soc/me-va-be/dich-vu.html`,
      },
      {
        key: "svc-cham-soc-nguoi-gia",
        label: "Chăm Sóc Người Già",
        group: "cham-soc",
        href: `${parentBase}dich-vu/cham-soc/nguoi-gia/dich-vu.html`,
      },
      {
        key: "svc-lau-don-ve-sinh",
        label: "Dịch vụ Vệ Sinh",
        group: "ve-sinh",
        href: `${parentBase}dich-vu/ve-sinh/tap-vu-lau-don-ve-sinh/dich-vu.html`,
      },
      {
        key: "svc-cham-soc-vuon",
        label: "Chăm Sóc Vườn Nhà",
        group: "ve-sinh",
        href: `${parentBase}dich-vu/san-vuon-cay-canh-vuon-ray/cham-soc-vuon-nha/dich-vu.html`,
      },
      {
        key: "svc-giat-ui",
        label: "Giặt Ủi Nhanh",
        group: "ve-sinh",
        href: `${parentBase}dich-vu/giat-ui/giat-ui-nhanh/dich-vu.html`,
      },
      {
        key: "svc-tho-nha",
        label: "Thợ Nhà",
        group: "sua-chua",
        href: `${parentBase}dich-vu/sua-chua/tho-nha/dich-vu.html`,
      },
      {
        key: "svc-sua-xe",
        label: "Sửa xe lưu động",
        group: "sua-chua",
        href: `${parentBase}dich-vu/sua-chua/sua-xe-luu-dong/dich-vu.html`,
      },
    ];
  }

  function buildSharedAuthUrl(pageName, options = {}) {
    const target = new URL(`${parentBase}public/${pageName}`, window.location.origin);
    target.searchParams.set("service", "giaohangnhanh");
    target.searchParams.set("redirect", `${projectBase}index.html`);
    if (options.redirect) {
      target.searchParams.set("redirect", String(options.redirect));
    }
    return target.toString();
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

    host.innerHTML = html;
    return host;
  }

  function buildLinkMap(serviceDirectory) {
    const serviceLinks = (Array.isArray(serviceDirectory) ? serviceDirectory : []).reduce(
      (accumulator, service) => {
        if (!service?.key || !service?.href) return accumulator;
        accumulator[service.key] = service.href;
        return accumulator;
      },
      {},
    );

    return {
      mainSite: toDirectoryUrl(parentBase),
      brand: toDirectoryUrl(projectBase),
      mainLogo: `${projectBase}public/assets/images/logo-dich-vu-quanh-ta.png`,
      brandLogo: `${projectBase}public/assets/images/favicon.png`,

      home: toDirectoryUrl(projectBase),
      about: toDirectoryUrl(projectBase),
      services: `${projectBase}dich-vu-giao-hang.html`,
      pricing: `${projectBase}tra-cuu-gia-giaohang.html`,
      contact: `${toDirectoryUrl(projectBase)}#contact`,
      booking: `${projectBase}dat-lich-giao-hang-nhanh.html`,
      tracking: `${projectBase}tra-don-hang-giaohang.html`,
      guide: `${projectBase}huong-dan-su-dung-dich-vu-giao-hang-nhanh.html`,
      login: buildSharedAuthUrl("dang-nhap.html"),
      register: buildSharedAuthUrl("dang-ky.html"),
      "shipping-policy": `${projectBase}chinh-sach-van-chuyen.html`,
      privacy: `${projectBase}chinh-sach-bao-mat.html`,
      terms: `${projectBase}dieu-khoan-su-dung.html`,
      articles: `${projectBase}cam-nang.html`,
      ...serviceLinks,
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

  function readCookie(name) {
    const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(document.cookie || "").match(
      new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
    );
    return match ? decodeURIComponent(match[1] || "") : "";
  }

  function mapDvqtSessionToGhnUser(session) {
    if (!session || typeof session !== "object") return null;

    return {
      id: String(session.id || session.user_id || "").trim(),
      hovaten: String(
        session.hovaten ||
          session.ho_ten ||
          session.fullname ||
          session.name ||
          "",
      ).trim(),
      sodienthoai: String(
        session.sodienthoai ||
          session.so_dien_thoai ||
          session.phone ||
          "",
      ).trim(),
      email: String(session.email || "").trim(),
      diachi: String(session.diachi || session.dia_chi || session.address || "").trim(),
      id_dichvu: String(session.id_dichvu || "0").trim() || "0",
      trangthai: String(session.trangthai || session.trang_thai || "active").trim() || "active",
    };
  }

  function hasProviderCapability(session) {
    if (window.GiaoHangNhanhLocalAuth?.hasGhnProviderRole) {
      return window.GiaoHangNhanhLocalAuth.hasGhnProviderRole(session);
    }

    return String(session?.id_dichvu || "")
      .split(",")
      .map((item) => item.trim())
      .includes("7");
  }

  function ensureLocalAuthLoaded() {
    if (window.GiaoHangNhanhLocalAuth) {
      return Promise.resolve(window.GiaoHangNhanhLocalAuth);
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = localAuthScriptPath;
      script.async = true;
      script.onload = () => {
        if (window.GiaoHangNhanhLocalAuth) {
          resolve(window.GiaoHangNhanhLocalAuth);
          return;
        }
        reject(new Error("Local auth script loaded but auth service is unavailable."));
      };
      script.onerror = () => reject(new Error("Cannot load GHN local auth script."));
      document.head.appendChild(script);
    });
  }

  function ensureAuthBootstrap() {
    if (authBootstrapPromise) return authBootstrapPromise;

    authBootstrapPromise = ensureLocalAuthLoaded()
      .then((auth) => {
        if (!auth) return null;

        if (typeof auth.bootstrapSession === "function") {
          return Promise.resolve(auth.bootstrapSession()).then((session) => {
            if (session) return session;

            const cookieUser = readCookie("dvqt_u");
            const cookiePassword = readCookie("dvqt_p");
            if (!cookieUser || !cookiePassword || typeof auth.login !== "function") {
              return null;
            }

            return Promise.resolve(
              auth.login({
                loginIdentifier: cookieUser,
                password: cookiePassword,
              }),
            ).then((result) => (result?.status === "success" ? result.user || null : null));
          });
        }

        if (
          window.DVQTApp &&
          typeof window.DVQTApp.checkSession === "function" &&
          typeof auth.saveSession === "function"
        ) {
          return Promise.resolve(window.DVQTApp.checkSession())
            .then((session) => {
              if (!session || !session.logged_in) return null;
              const mappedUser = mapDvqtSessionToGhnUser(session.profile || session);
              return mappedUser ? auth.saveSession(mappedUser) : null;
            })
            .catch(() => null);
        }

        return null;
      })
      .catch((error) => {
        console.warn("Cannot bootstrap GHN auth session from shared layout:", error);
        return null;
      });

    return authBootstrapPromise;
  }

  function resolveAccountLinks(session) {
    const linkGroups = {
      customer: {
        dashboard: `${projectBase}public/khach-hang/dashboard-giaohang.html`,
        orders: `${projectBase}public/khach-hang/danh-sach-don-hang-giaohang.html`,
        profile: `${projectBase}public/khach-hang/ho-so-giaohang.html`,
      },
      provider: {
        dashboard: `${projectBase}public/nha-cung-cap/dashboard-giaohang.html`,
        orders: `${projectBase}public/nha-cung-cap/don-hang-giaohang.html`,
        profile: `${projectBase}public/nha-cung-cap/ho-so-giaohang.html`,
      },
    };

    if (
      window.GiaoHangNhanhCore &&
      typeof window.GiaoHangNhanhCore.appendAuthParamsToUrl === "function"
    ) {
      Object.values(linkGroups).forEach((group) => {
        group.dashboard = window.GiaoHangNhanhCore.appendAuthParamsToUrl(
          group.dashboard,
          session,
        );
        group.orders = window.GiaoHangNhanhCore.appendAuthParamsToUrl(
          group.orders,
          session,
        );
        group.profile = window.GiaoHangNhanhCore.appendAuthParamsToUrl(
          group.profile,
          session,
        );
      });
    }

    return {
      ...linkGroups,
      canReceiveOrders: hasProviderCapability(session),
      summaryLabel: hasProviderCapability(session)
        ? "Tài khoản đặt đơn và nhận đơn"
        : "Khu vực khách hàng",
    };
  }

  function buildAccountMenuItems(accountLinks) {
    const items = [
      {
        href: accountLinks.customer.dashboard,
        icon: "fas fa-chart-line",
        label: "Tổng quan đặt đơn",
      },
      {
        href: accountLinks.customer.orders,
        icon: "fas fa-box",
        label: "Đơn hàng của tôi",
      },
    ];

    if (!accountLinks.canReceiveOrders) {
      items.push({
        href: accountLinks.customer.profile,
        icon: "fas fa-user",
        label: "Hồ sơ cá nhân",
      });
    }

    if (accountLinks.canReceiveOrders) {
      items.push(
        {
          href: accountLinks.provider.dashboard,
          icon: "fas fa-truck-ramp-box",
          label: "Tổng quan nhận đơn",
        },
        {
          href: accountLinks.provider.orders,
          icon: "fas fa-clipboard-list",
          label: "Đơn hàng của khách",
        },
        {
          href: accountLinks.provider.profile,
          icon: "fas fa-id-card",
          label: "Hồ sơ cá nhân",
        },
      );
    }

    return items;
  }

  function syncAuthNav(root) {
    if (!root) return;

    const loginItem = root.querySelector("#nav-login-item");
    const registerItem = root.querySelector("#nav-register-item");
    if (!loginItem || !registerItem) return;

    const session = readLocalSession();
    if (!session) {
      loginItem.innerHTML =
        `<a data-layout-link="login" href="${buildSharedAuthUrl("dang-nhap.html")}">Đăng nhập</a>`;
      registerItem.innerHTML =
        `<a data-layout-link="register" href="${buildSharedAuthUrl("dang-ky.html")}" class="btn-primary nav-auth-cta">Đăng ký</a>`;
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
      String(session.phone || session.so_dien_thoai || "").trim() ||
        String(session.email || "").trim() ||
        accountLinks.summaryLabel,
    );
    const menuItems = buildAccountMenuItems(accountLinks)
      .map(
        (item) =>
          `<li><a href="${item.href}"><i class="${item.icon}"></i> ${item.label}</a></li>`,
      )
      .join("");

    loginItem.className = "dropdown has-submenu customer-nav-dropdown";
    loginItem.innerHTML = `
      <a href="#" data-account-dropdown-trigger="1" aria-haspopup="true" aria-expanded="false">Xin chào, ${firstName}</a>
      <ul class="dropdown-menu customer-nav-dropdown-menu" style="text-align: left;">
        <li class="customer-nav-dropdown-summary">
          <div class="customer-nav-dropdown-avatar">${firstName.charAt(0)}</div>
          <div class="customer-nav-dropdown-user">
            <strong>${firstName}</strong>
            <span>${accountSummary}</span>
          </div>
        </li>
        ${menuItems}
        <li class="customer-nav-logout-wrapper"><a href="${buildSharedAuthUrl("dang-nhap.html")}" class="customer-nav-logout" data-local-logout="1"><i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất</a></li>
      </ul>
    `;
    registerItem.innerHTML = "";
    registerItem.hidden = true;
  }

  function performLogout() {
    if (
      window.GiaoHangNhanhLocalAuth &&
      typeof window.GiaoHangNhanhLocalAuth.logout === "function"
    ) {
      window.GiaoHangNhanhLocalAuth.logout(buildSharedAuthUrl("dang-nhap.html"));
    } else {
      window.localStorage.removeItem(authSessionKey);
      document.dispatchEvent(
        new CustomEvent("ghn:auth-changed", {
          detail: {
            session: null,
          },
        }),
      );
      window.location.href = buildSharedAuthUrl("dang-nhap.html");
    }
  }

  function bindLogoutActions(root) {
    if (!root || root.dataset.logoutDelegated === "1") return;

    root.dataset.logoutDelegated = "1";
    root.addEventListener("click", function (event) {
      const link = event.target.closest("[data-local-logout]");
      if (!link || !root.contains(link)) return;

      event.preventDefault();
      performLogout();
    });
  }

  function bindAccountDropdownActions(root) {
    if (!root || root.dataset.accountDropdownDelegated === "1") return;

    root.dataset.accountDropdownDelegated = "1";

    const closeAllDropdowns = () => {
      root.querySelectorAll(".customer-nav-dropdown.open").forEach((dropdown) => {
        dropdown.classList.remove("open");
        const trigger = dropdown.querySelector("[data-account-dropdown-trigger]");
        if (trigger) {
          trigger.setAttribute("aria-expanded", "false");
        }
      });
    };

    root.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-account-dropdown-trigger]");
      if (trigger && root.contains(trigger)) {
        event.preventDefault();
        const dropdown = trigger.closest(".customer-nav-dropdown");
        if (!dropdown) return;

        const willOpen = !dropdown.classList.contains("open");
        closeAllDropdowns();
        dropdown.classList.toggle("open", willOpen);
        trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
        return;
      }

      if (!event.target.closest(".customer-nav-dropdown")) {
        closeAllDropdowns();
      }
    });

    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) {
        closeAllDropdowns();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeAllDropdowns();
      }
    });
  }

  function applyLinks(root, linkMap) {
    root.querySelectorAll("[data-layout-link]").forEach((element) => {
      const key = element.getAttribute("data-layout-link");
      if (key && linkMap[key]) {
        if (element.tagName.toLowerCase() === "img") {
          element.setAttribute("src", linkMap[key]);
        } else {
          element.setAttribute("href", linkMap[key]);
          if (key.startsWith("svc-")) {
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
          } else {
            element.setAttribute("target", "_self");
            element.removeAttribute("rel");
          }
        }
      }
    });
  }

  function resolveActiveLinkKey() {
    if (currentPage === "huong-dan-su-dung-dich-vu-giao-hang-nhanh.html") {
      return "guide";
    }
    if (currentPage === "tra-cuu-gia-giaohang.html") return "pricing";
    if (currentPage === "tra-don-hang-giaohang.html") return "tracking";
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
    "tra-cuu-gia-giaohang.html",
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

  const serviceDirectory = Object.freeze(buildServiceDirectory().map((service) => ({
    ...service,
  })));
  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap(serviceDirectory);

  window.GiaoHangNhanhLayout = Object.freeze({
    getLinkMap() {
      return { ...linkMap };
    },
    getServiceDirectory() {
      return serviceDirectory.map((service) => ({ ...service }));
    },
  });

  if (headerHost) applyLinks(headerHost, linkMap);
  if (headerHost) applyActiveNav(headerHost);
  if (headerHost) syncAuthNav(headerHost);
  if (headerHost) bindLogoutActions(headerHost);
  if (headerHost) bindAccountDropdownActions(headerHost);
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
  ensureAuthBootstrap().finally(() => {
    if (headerHost) {
      syncAuthNav(headerHost);
    }
  });

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
