(function (window, document) {
  if (window.__fastGoSharedLayoutLoaded) return;
  window.__fastGoSharedLayoutLoaded = true;

  const storageKeys = {
    role: "fastgo-auth-role",
    identity: "fastgo-auth-identity",
  };
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
    "chuyen-nha.html": "services",
    "chuyen-kho-bai.html": "services",
    "chuyen-van-phong.html": "services",
    "cam-nang.html": "news",
    "cam-nang-chi-tiet.html": "news",
    "khao-sat.html": "booking",
    "dat-lich.html": "booking",
    "dang-nhap.html": "account",
    "dang-ky.html": "account",
    "dashboard.html": "account",
    "lich-su-yeu-cau.html": "account",
    "danh-sach-viec.html": "account",
    "ho-so.html": "account",
  };

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Cannot parse auth payload:", error);
      return fallback;
    }
  }

  function readIdentity() {
    try {
      const identity = safeParse(window.localStorage.getItem(storageKeys.identity), {});
      return identity && typeof identity === "object" ? identity : {};
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
      identity?.contact_person ||
      identity?.contactPerson ||
      identity?.fullName ||
      identity?.full_name ||
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

  function injectPartial(hostId, fileName) {
    const host = document.getElementById(hostId);
    if (!host) return null;

    const html = loadPartial(`${includesBase}${fileName}`);
    if (!html) return null;

    host.innerHTML = html;
    return host;
  }

  function buildLinkMap() {
    const servicesLink = `${projectBase}dich-vu-chuyen-don.html`;

    return {
      mainSite: `${parentBase}index.html`,
      brand: `${projectBase}index.html`,
      mainLogo: `${publicBase}assets/images/logo-dich-vu-quanh-ta.png`,
      home: `${projectBase}index.html#hero`,
      about: `${projectBase}index.html#hero`,
      services: servicesLink,
      pricing: `${projectBase}bang-gia-chuyen-don.html`,
      contact: `${projectBase}index.html#contact`,
      survey: `${projectBase}dat-lich.html`,
      booking: `${projectBase}dat-lich.html`,
      account: `${projectBase}dang-nhap.html?vai-tro=khach-hang`,
      login: `${projectBase}dang-nhap.html`,
      register: `${projectBase}dang-ky.html`,
      "login-customer": `${projectBase}dang-nhap.html?vai-tro=khach-hang`,
      "register-customer": `${projectBase}dang-ky.html?vai-tro=khach-hang`,
      "login-provider": `${projectBase}dang-nhap.html?vai-tro=nha-cung-cap`,
      "register-provider": `${projectBase}dang-ky.html?vai-tro=nha-cung-cap`,
      policy: `${projectBase}chinh-sach-va-dieu-khoan.html`,
      "moving-house": `${servicesLink}#chuyen-nha`,
      "moving-warehouse": `${servicesLink}#chuyen-kho-bai`,
      "moving-office": `${servicesLink}#chuyen-van-phong`,
      news: `${projectBase}cam-nang.html`,
      brandLogo: `${publicBase}assets/images/favicon.png`,

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

  function resolveAccountLinks(role) {
    if (role === "nha-cung-cap") {
      return {
        dashboard: `${projectBase}nha-cung-cap/dashboard.html`,
        orders: `${projectBase}nha-cung-cap/danh-sach-viec.html`,
        profile: `${projectBase}nha-cung-cap/ho-so.html`,
        secondary: `${projectBase}bang-gia-chuyen-don.html`,
        secondaryLabel: "Bảng giá minh bạch",
      };
    }

    return {
      dashboard: `${projectBase}khach-hang/dashboard.html`,
      orders: `${projectBase}khach-hang/lich-su-yeu-cau.html`,
      profile: `${projectBase}khach-hang/ho-so.html`,
    };
  }

  function performLogout() {
    try {
      window.localStorage.removeItem(storageKeys.identity);
      window.localStorage.removeItem(storageKeys.role);
    } catch (error) {
      console.error("Cannot clear auth session:", error);
    }
    window.location.href = `${projectBase}dang-nhap.html`;
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

    const role = getSavedRole();
    const identity = readIdentity();
    if (!role || !identity || !Object.keys(identity).length) {
      loginItem.className = "";
      loginItem.hidden = false;
      loginItem.innerHTML =
        '<a data-layout-link="login" href="dang-nhap.html">Đăng nhập</a>';
      registerItem.hidden = false;
      registerItem.innerHTML =
        '<a data-layout-link="register" href="dang-ky.html" class="btn-primary nav-auth-cta">Đăng ký</a>';
      applyLinks(root, linkMap);
      return;
    }

    const firstName = escapeHtml(getDisplayName(identity, role));
    const summary = escapeHtml(
        String(identity.phone || "").trim() ||
        String(identity.email || "").trim() ||
        (role === "nha-cung-cap" ? "Khu vực nhà cung cấp" : "Khu vực khách hàng"),
    );
    const links = resolveAccountLinks(role);

    loginItem.hidden = false;
    loginItem.className = "dropdown has-submenu customer-nav-dropdown";
    loginItem.innerHTML =
      role === "nha-cung-cap"
        ? `
          <a data-layout-link="account" href="${links.dashboard}">Xin chào, ${firstName}</a>
          <ul class="dropdown-menu customer-nav-dropdown-menu" style="text-align: left;">
            <li class="customer-nav-dropdown-summary">
              <div class="customer-nav-dropdown-avatar">${firstName.charAt(0)}</div>
              <div class="customer-nav-dropdown-user">
                <strong>${firstName}</strong>
                <span>${summary}</span>
              </div>
            </li>
            <li><a href="${links.dashboard}"><i class="fas fa-chart-line"></i> Dashboard nhà cung cấp</a></li>
            <li><a href="${links.orders}"><i class="fas fa-briefcase"></i> Danh sách việc</a></li>
            <li><a href="${links.profile}"><i class="fas fa-user"></i> Hồ sơ nhà cung cấp</a></li>
            <li><a href="${links.secondary}"><i class="fas fa-file-invoice-dollar"></i> ${escapeHtml(
              links.secondaryLabel,
            )}</a></li>
            <li class="customer-nav-logout-wrapper"><a href="${projectBase}dang-nhap.html" class="customer-nav-logout" data-local-logout="1"><i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất</a></li>
          </ul>
        `
        : `
          <a data-layout-link="account" href="${links.dashboard}">Xin chào, ${firstName}</a>
          <ul class="dropdown-menu customer-nav-dropdown-menu" style="text-align: left;">
            <li class="customer-nav-dropdown-summary">
              <div class="customer-nav-dropdown-avatar">${firstName.charAt(0)}</div>
              <div class="customer-nav-dropdown-user">
                <strong>${firstName}</strong>
                <span>${summary}</span>
              </div>
            </li>
            <li><a href="${links.dashboard}"><i class="fas fa-chart-line"></i> Tổng quan</a></li>
            <li><a href="${links.orders}"><i class="fas fa-box"></i> Lịch sử yêu cầu</a></li>
            <li><a href="${links.profile}"><i class="fas fa-user"></i> Hồ sơ cá nhân</a></li>
            <li class="customer-nav-logout-wrapper"><a href="${projectBase}dang-nhap.html" class="customer-nav-logout" data-local-logout="1"><i class="fas fa-arrow-right-from-bracket"></i> Đăng xuất</a></li>
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

  const headerHost = injectPartial("site-header", "header.html");
  const footerHost = injectPartial("site-footer", "footer.html");
  const linkMap = buildLinkMap();

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
    if (![storageKeys.role, storageKeys.identity].includes(event.key || "")) return;
    syncAuthNav(headerHost);
    applyActiveNav(headerHost);
  });
})(window, document);
