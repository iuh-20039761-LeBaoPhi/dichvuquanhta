(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/user-nav-menu\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();

  var isInSiteNavigation = false;

  function apiUrl(path) {
    return new URL('api/' + path, projectBase).href;
  }

  function markInSiteNavigation(target) {
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!link) return;

    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;
    if (href.indexOf('javascript:') === 0) return;
    if (link.target && String(link.target).toLowerCase() === '_blank') return;

    try {
      var targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      isInSiteNavigation = true;
    } catch (e) {
      // Ignore malformed links.
    }
  }

  function markInSiteNavigationProgrammatically() {
    isInSiteNavigation = true;
  }

  window.__markInSiteNavigation = markInSiteNavigationProgrammatically;

  function autoLogoutOnClose() {
    var hasUser = false;
    try {
      hasUser = !!localStorage.getItem('currentUser');
    } catch (e) {
      hasUser = false;
    }
    if (!hasUser || isInSiteNavigation) return;

    try {
      localStorage.removeItem('currentUser');
    } catch (e) {
      // Ignore storage errors.
    }

    var logoutUrl = apiUrl('logout.php');
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(logoutUrl, new Blob([], { type: 'application/x-www-form-urlencoded;charset=UTF-8' }));
      } else {
        fetch(logoutUrl, { method: 'GET', keepalive: true });
      }
    } catch (e) {
      // Ignore unload errors.
    }
  }

  function assetUrl(path) {
    if (!path) return new URL('assets/logomvb.png', projectBase).href;
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(String(path).replace(/^\/+/, ''), projectBase).href;
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function setMenuLinksByRole(user) {
    var profileLink = getEl('navProfileLink');
    var invoiceLink = getEl('navInvoiceLink');
    var role = user && user.vai_tro ? String(user.vai_tro).toLowerCase() : '';

    // Both customer and employee use the same profile modal/page.
    if (profileLink) {
      profileLink.setAttribute('href', 'khach_hang/profile.html');
      profileLink.setAttribute('data-profile-modal-src', 'khach_hang/profile.html');
    }

    if (invoiceLink) {
      var invoicePath = role === 'nhan_vien'
        ? 'nhan_vien/danh-sach-hoa-don.html'
        : 'khach_hang/danh-sach-hoa-don.html';
      invoiceLink.setAttribute('href', invoicePath);
    }
  }

  var hasSyncedSession = false;

  function setLoggedOut() {
    var loginNavItem = getEl('loginNavItem');
    var userMenuContainer = getEl('userMenuContainer');

    if (loginNavItem) loginNavItem.classList.remove('d-none');
    if (userMenuContainer) userMenuContainer.classList.add('d-none');

    setMenuLinksByRole(null);
  }

  function setLoggedIn(user) {
    var loginNavItem = getEl('loginNavItem');
    var userMenuContainer = getEl('userMenuContainer');
    var navAvatar = getEl('navAvatar');
    var navUserName = getEl('navUserName');

    if (!userMenuContainer) return;

    if (loginNavItem) loginNavItem.classList.add('d-none');
    userMenuContainer.classList.remove('d-none');

    if (navUserName) {
      navUserName.textContent = user && user.ten ? user.ten : 'Tài khoản';
    }

    if (navAvatar) {
      var avatar = user && user.anh_dai_dien ? user.anh_dai_dien : 'assets/logomvb.png';
      navAvatar.src = assetUrl(avatar);
    }

    setMenuLinksByRole(user);
  }

  async function syncFromSession() {
    try {
      var response = await fetch(apiUrl('get_profile.php'));
      var data = await response.json();

      if (data.success && data.user) {
        try {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        } catch (e) {
          // Ignore storage errors.
        }
        setLoggedIn(data.user);
      } else {
        setLoggedOut();
      }
    } catch (e) {
      setLoggedOut();
    }
  }

  function initNavState() {
    var hasNavTargets = !!(getEl('loginNavItem') || getEl('userMenuContainer'));
    if (!hasNavTargets) return;

    var cachedUser = null;
    try {
      cachedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (e) {
      cachedUser = null;
    }

    if (cachedUser) {
      setLoggedIn(cachedUser);
    } else {
      setLoggedOut();
    }

    if (!hasSyncedSession) {
      hasSyncedSession = true;
      syncFromSession();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavState();
  });

  // Mark normal in-site link navigation so close-tab logout does not run.
  document.addEventListener('click', function (event) {
    markInSiteNavigation(event.target);
  }, true);

  // Auto logout when the user closes/leaves the page.
  window.addEventListener('beforeunload', autoLogoutOnClose);
  window.addEventListener('pagehide', autoLogoutOnClose);

  document.addEventListener('siteLayout:ready', function () {
    initNavState();
  });

  window.addEventListener('auth:login-success', function (event) {
    var user = event && event.detail ? event.detail.user : null;
    if (user) {
      setLoggedIn(user);
    } else {
      syncFromSession();
    }
  });
})();
