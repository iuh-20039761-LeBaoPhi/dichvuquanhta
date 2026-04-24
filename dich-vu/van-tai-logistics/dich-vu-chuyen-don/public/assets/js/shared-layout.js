(function (window, document) {
  if (window.__fastGoSharedLayoutLoaded) return;
  window.__fastGoSharedLayoutLoaded = true;
  const authChangeEventName = "fastgo:auth-changed";

  const storageKeys = {
    role: "fastgo-auth-role",
    identity: "fastgo-auth-identity",
    access: "fastgo-auth-access",
  };
  const urlAuthQueryKeys = Object.freeze([
    "username",
    "sodienthoai",
    "password",
    "pass",
  ]);
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
  const parentBase = projectBase.replace(
    /(?:dich-vu\/van-tai-logistics\/)?dich-vu-chuyen-don\/?$/i,
    "",
  );
  const publicBase = `${projectBase}public/`;
  const includesBase = `${projectBase}includes/`;
  const sharedAuthService = "chuyendon";
  const servicePageKeyByFile = {
    "dich-vu-chuyen-don.html": "services",
    "bang-gia-chuyen-don.html": "pricing",
    "huong-dan-su-dung-dich-vu-chuyen-don.html": "guide",
    "chuyen-nha.html": "services",
    "chuyen-kho-bai.html": "services",
    "chuyen-van-phong.html": "services",
    "cam-nang-chuyendon.html": "news",
    "cam-nang-chi-tiet-chuyendon.html": "news",
    "dat-lich-chuyendon.html": "booking",
    "dashboard-chuyendon.html": "account",
    "danh-sach-don-hang-chuyendon.html": "account",
    "ho-so-chuyendon.html": "account",
  };

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
        href: `${parentBase}dich-vu/van-tai-logistics/giao-hang-nhanh/dich-vu-giao-hang.html`,
      },
      {
        key: "svc-dich-vu-chuyen-don",
        label: "Dịch Vụ Chuyển Dọn",
        group: "van-tai-logistics",
        href: `${projectBase}dich-vu-chuyen-don.html`,
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

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot parse auth payload:", error);
      return fallback;
    }
  }

  function normalizeIdentity(payload) {
    if (!payload || typeof payload !== "object") return {};

    return {
      id: String(payload.id || "").trim(),
      role: String(payload.role || "").trim().toLowerCase(),
      hovaten: String(payload.hovaten || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      sodienthoai: String(payload.sodienthoai || "").trim(),
      id_dichvu: String(payload.id_dichvu || "0").trim() || "0",
      trangthai: String(payload.trangthai || "active").trim(),
    };
  }

  function splitServiceIds(value) {
    return String(value || "")
      .split(",")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  function hasMovingServiceId(value) {
    return splitServiceIds(value).includes("12");
  }

  function isProviderRole(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return ["nha-cung-cap", "doi-tac", "provider"].includes(normalized);
  }

  function hasProviderCapability(identity) {
    if (identity && typeof identity === "object") {
      return (
        hasMovingServiceId(identity.id_dichvu || "0") ||
        isProviderRole(identity.role || identity.vaitro || "") ||
        isProviderRole(getSavedRole())
      );
    }

    return hasMovingServiceId(identity) || isProviderRole(identity);
  }

  function readIdentity() {
    try {
      return normalizeIdentity(
        safeParse(window.localStorage.getItem(storageKeys.identity), {}),
      );
    } catch (error) {
      console.error("Cannot read auth identity:", error);
      return {};
    }
  }

  function getSavedRole() {
    try {
      return String(window.localStorage.getItem(storageKeys.role) || "").trim().toLowerCase();
    } catch (error) {
      console.error("Cannot read auth role:", error);
      return "";
    }
  }

  function getDisplayName(identity, role) {
    const value =
      identity?.hovaten ||
      identity?.email ||
      (role === "nha-cung-cap" ? "Nhà cung cấp" : "Khách hàng");
    return String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-1)[0] || (role === "nha-cung-cap" ? "Nhà cung cấp" : "Khách hàng");
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

  function buildSharedAuthUrl(pageName, params = {}) {
    const url = new URL(`${parentBase}public/${pageName}`, window.location.href);
    url.searchParams.set("service", sharedAuthService);
    url.searchParams.set("redirect", `${projectBase}index.html`);

    Object.entries(params || {}).forEach(([key, value]) => {
      const normalizedValue = String(value ?? "").trim();
      if (!key || !normalizedValue) return;
      url.searchParams.set(key, normalizedValue);
    });

    return url.toString();
  }

  function injectPartial(hostId, fileName) {
    const host = document.getElementById(hostId);
    if (!host) return null;

    const html = loadPartial(`${includesBase}${fileName}`);
    if (!html) return null;

    host.innerHTML = html;
    return host;
  }

  function buildLinkMap(serviceDirectory) {
    const servicesLink = `${projectBase}dich-vu-chuyen-don.html`;
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
      mainLogo: `${publicBase}assets/images/logo-dich-vu-quanh-ta.png`,
      home: toDirectoryUrl(projectBase),
      about: toDirectoryUrl(projectBase),
      services: servicesLink,
      pricing: `${projectBase}bang-gia-chuyen-don.html`,
      guide: `${projectBase}huong-dan-su-dung-dich-vu-chuyen-don.html`,
      contact: `${toDirectoryUrl(projectBase)}#contact`,
      survey: `${projectBase}dat-lich-chuyendon.html`,
      booking: `${projectBase}dat-lich-chuyendon.html`,
      account: buildSharedAuthUrl("dang-nhap.html"),
      login: buildSharedAuthUrl("dang-nhap.html"),
      register: buildSharedAuthUrl("dang-ky.html"),
      "login-customer": buildSharedAuthUrl("dang-nhap.html"),
      "register-customer": buildSharedAuthUrl("dang-ky.html"),
      "login-provider": buildSharedAuthUrl("dang-nhap.html"),
      "register-provider": buildSharedAuthUrl("dang-ky.html"),
      policy: `${projectBase}chinh-sach-va-dieu-khoan-chuyendon.html`,
      "moving-house": `${servicesLink}#chuyen-nha`,
      "moving-warehouse": `${servicesLink}#chuyen-kho-bai`,
      "moving-office": `${servicesLink}#chuyen-van-phong`,
      news: `${projectBase}cam-nang-chuyendon.html`,
      brandLogo: `${publicBase}assets/images/favicon.png`,
      ...serviceLinks,
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

  function resolveAccountLinks(identity) {
    function readAccessCookie(name) {
      const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = String(document.cookie || "").match(
        new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
      );
      return match ? decodeURIComponent(match[1] || "") : "";
    }

    let storedAccess = {};
    try {
      storedAccess = safeParse(window.localStorage.getItem(storageKeys.access), {});
    } catch (error) {
      storedAccess = {};
    }

    const currentUrl = new URL(window.location.href);
    const urlLoginIdentifier = String(
      currentUrl.searchParams.get("sodienthoai") || "",
    ).trim();
    const urlPassword = String(currentUrl.searchParams.get("password") || "").trim();
    const loginIdentifier =
      urlLoginIdentifier ||
      String(storedAccess?.loginIdentifier || storedAccess?.username || "").trim() ||
      readAccessCookie("dvqt_u").trim();
    const password =
      urlPassword ||
      String(storedAccess?.password || "").trim() ||
      readAccessCookie("dvqt_p").trim();

    function withAuthParams(url) {
      try {
        const nextUrl = new URL(url, window.location.href);
        urlAuthQueryKeys.forEach((key) => {
          nextUrl.searchParams.delete(key);
        });
        if (loginIdentifier && password) {
          nextUrl.searchParams.set("sodienthoai", loginIdentifier);
          nextUrl.searchParams.set("password", password);
        }
        return nextUrl.toString();
      } catch (error) {
        return url;
      }
    }

    return {
      canReceiveOrders: hasProviderCapability(identity),
      customer: {
        dashboard: withAuthParams(`${projectBase}khach-hang/dashboard-chuyendon.html`),
        orders: withAuthParams(`${projectBase}khach-hang/danh-sach-don-hang-chuyendon.html`),
        profile: withAuthParams(`${projectBase}khach-hang/ho-so-chuyendon.html`),
      },
      provider: {
        dashboard: withAuthParams(`${projectBase}nha-cung-cap/dashboard-chuyendon.html`),
        orders: withAuthParams(`${projectBase}nha-cung-cap/danh-sach-don-hang-chuyendon.html`),
        profile: withAuthParams(`${projectBase}nha-cung-cap/ho-so-chuyendon.html`),
      },
    };
  }

  function performLogout() {
    try {
      document.cookie =
        "dvqt_u=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie =
        "dvqt_p=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      window.localStorage.removeItem(storageKeys.identity);
      window.localStorage.removeItem(storageKeys.role);
      window.localStorage.removeItem(storageKeys.access);
    } catch (error) {
      console.error("Cannot clear auth session:", error);
    }

    // Xóa thông tin đăng nhập khỏi URL hiện tại để tránh auto-login lại.
    try {
      const cleanUrl = new URL(window.location.href);
      urlAuthQueryKeys.forEach((key) => {
        cleanUrl.searchParams.delete(key);
      });
      window.history.replaceState(null, "", cleanUrl.toString());
    } catch (e) { /* skip */ }

    window.location.href = buildSharedAuthUrl("dang-nhap.html");
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

  function syncAuthNav(root) {
    if (!root) return;

    const loginItem = root.querySelector("#nav-login-item");
    const registerItem = root.querySelector("#nav-register-item");
    if (!loginItem || !registerItem) return;
    const loginUrl = buildSharedAuthUrl("dang-nhap.html");
    const registerUrl = buildSharedAuthUrl("dang-ky.html");

    const role = getSavedRole();
    const identity = readIdentity();
    if (!role || !identity || !Object.keys(identity).length) {
      loginItem.className = "";
      loginItem.hidden = false;
      loginItem.innerHTML =
        `<a data-layout-link="login" href="${loginUrl}">Đăng nhập</a>`;
      registerItem.hidden = false;
      registerItem.innerHTML =
        `<a data-layout-link="register" href="${registerUrl}" class="btn-primary nav-auth-cta">Đăng ký</a>`;
      applyLinks(root, linkMap);
      return;
    }

    const firstName = escapeHtml(getDisplayName(identity, role));
    const summary = escapeHtml(
        String(identity.sodienthoai || "").trim() ||
        String(identity.email || "").trim() ||
        (hasProviderCapability(identity)
          ? "Tài khoản đặt đơn và nhận đơn"
          : "Khu vực khách hàng"),
    );
    const links = resolveAccountLinks(identity);

    loginItem.hidden = false;
    loginItem.className = "dropdown has-submenu customer-nav-dropdown";
    loginItem.innerHTML =
      `
        <a data-layout-link="account" href="#" aria-haspopup="true" aria-expanded="false">Xin chào, ${firstName}</a>
        <ul class="dropdown-menu customer-nav-dropdown-menu" style="text-align: left;">
          <li class="customer-nav-dropdown-summary">
            <div class="customer-nav-dropdown-avatar">${firstName.charAt(0)}</div>
            <div class="customer-nav-dropdown-user">
              <strong>${firstName}</strong>
              <span>${summary}</span>
            </div>
          </li>
          <li><a href="${links.customer.dashboard}"><i class="fas fa-chart-line"></i> Tổng quan đặt đơn</a></li>
          <li><a href="${links.customer.orders}"><i class="fas fa-box"></i> Đơn hàng tôi đã đặt</a></li>
          ${
            links.canReceiveOrders
              ? ""
              : `<li><a href="${links.customer.profile}"><i class="fas fa-user"></i> Hồ sơ khách hàng</a></li>`
          }
          ${
            links.canReceiveOrders
              ? `
                <li><a href="${links.provider.dashboard}"><i class="fas fa-truck-ramp-box"></i> Tổng quan nhận đơn</a></li>
                <li><a href="${links.provider.orders}"><i class="fas fa-clipboard-list"></i> Đơn hàng khách hàng đặt cho tôi</a></li>
                <li><a href="${links.provider.profile}"><i class="fas fa-id-card"></i> Hồ sơ nhà cung cấp</a></li>
              `
              : ""
          }
          <li class="customer-nav-logout-wrapper"><a href="${buildSharedAuthUrl("dang-nhap.html")}" class="customer-nav-logout" data-local-logout="1"><i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất</a></li>
        </ul>
      `;

    registerItem.hidden = true;
    registerItem.innerHTML = "";
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const serviceDirectory = Object.freeze(buildServiceDirectory().map((service) => ({
    ...service,
  })));
  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap(serviceDirectory);

  window.FastGoLayout = Object.freeze({
    getLinkMap() {
      return { ...linkMap };
    },
    getServiceDirectory() {
      return serviceDirectory.map((service) => ({ ...service }));
    },
  });

  if (headerHost) applyLinks(headerHost, linkMap);
  if (headerHost) syncAuthNav(headerHost);
  if (headerHost) applyActiveNav(headerHost);
  if (headerHost) bindLogoutActions(headerHost);
  if (footerHost) applyLinks(footerHost, linkMap);

  window.addEventListener("hashchange", function () {
    if (headerHost) applyActiveNav(headerHost);
  });

  window.addEventListener("storage", function (event) {
    if (!headerHost) return;
    if (![storageKeys.role, storageKeys.identity, storageKeys.access].includes(event.key || "")) return;
    syncAuthNav(headerHost);
    applyActiveNav(headerHost);
  });

  window.addEventListener(authChangeEventName, function () {
    if (!headerHost) return;
    syncAuthNav(headerHost);
    applyActiveNav(headerHost);
  });
})(window, document);
