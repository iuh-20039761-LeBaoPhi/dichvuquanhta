(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/user-nav-menu\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();
  var idleLogoutTimer = null;
  var idleLogoutMs = 30 * 60 * 1000;

  function authUrl(action) {
    var query = action ? ('?action=' + encodeURIComponent(action)) : '';
    return new URL('session_auth.php' + query, projectBase).href;
  }

  // Backward-compatible hook for old code paths.
  window.__markInSiteNavigation = function () {};

  function clearClientAuthStorage() {
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('customer_logged_in');
      localStorage.removeItem('customer_name');
      localStorage.removeItem('profile');
    } catch (e) {
      // Ignore storage errors.
    }
  }

  // Gui lenh xoa session server khong chan dong trinh duyet.
  function clearServerSession(action) {
    var payload = JSON.stringify({ action: action || 'logout' });

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(authUrl(action || 'logout'), blob);
        return;
      }
    } catch (e) {
      // Fallback to fetch below.
    }

    fetch(authUrl(action || 'logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      keepalive: true,
      body: payload
    }).catch(function () {
      // Ignore logout transport errors.
    });
  }

  function resetIdleLogoutTimer() {
    if (idleLogoutTimer) {
      clearTimeout(idleLogoutTimer);
    }
    idleLogoutTimer = setTimeout(function () {
      clearClientAuthStorage();
      clearServerSession('logout');
      setLoggedOut();
    }, idleLogoutMs);
  }

  function isLogoutLink(target) {
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!link) return false;

    var href = link.getAttribute('href') || '';
    if (!href) return false;

    try {
      var targetUrl = new URL(href, window.location.href);
      return /\/logout\.php$/i.test(targetUrl.pathname);
    } catch (e) {
      return /logout\.php(?:[?#].*)?$/i.test(href);
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
        ? 'nhan_vien/danh-sach-hoa-don.php'
        : 'khach_hang/danh-sach-hoa-don.php';
      invoiceLink.setAttribute('href', invoicePath);
    }
  }

  var hasSyncedSession = false;

  function cacheUser(user) {
    if (!user) return;
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('customer_logged_in', 'true');
      localStorage.setItem('customer_name', user.ten || '');
      localStorage.setItem('profile', JSON.stringify({
        name: user.ten || '',
        phone: user.sodienthoai || '',
        address: user.dia_chi || ''
      }));
    } catch (e) {
      // Ignore storage errors.
    }
  }

  function setLoggedOut() {
    var loginNavItem = getEl('loginNavItem');
    var userMenuContainer = getEl('userMenuContainer');

    if (loginNavItem) loginNavItem.classList.remove('d-none');
    if (userMenuContainer) userMenuContainer.classList.add('d-none');

    if (idleLogoutTimer) {
      clearTimeout(idleLogoutTimer);
      idleLogoutTimer = null;
    }

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
    resetIdleLogoutTimer();
  }

  function normalizeStoredUser(rawUser) {
    if (!rawUser || typeof rawUser !== 'object') return null;

    return {
      ten: rawUser.ten || rawUser.hovaten || rawUser.ho_ten || rawUser.name || rawUser.customer_name || 'Tài khoản',
      vai_tro: rawUser.vai_tro || rawUser.role || 'khach_hang',
      anh_dai_dien: rawUser.anh_dai_dien || rawUser.avatar || rawUser.image || '',
      sodienthoai: rawUser.sodienthoai || rawUser.so_dien_thoai || rawUser.phone || '',
      dia_chi: rawUser.dia_chi || rawUser.address || ''
    };
  }

  function getUserFromStorage() {
    var currentUser = null;
    var profile = null;
    var customerName = '';
    var customerLoggedIn = false;

    try {
      currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (e) {
      currentUser = null;
    }

    try {
      profile = JSON.parse(localStorage.getItem('profile') || 'null');
    } catch (e) {
      profile = null;
    }

    try {
      customerName = localStorage.getItem('customer_name') || '';
      customerLoggedIn = localStorage.getItem('customer_logged_in') === 'true';
    } catch (e) {
      customerName = '';
      customerLoggedIn = false;
    }

    if (currentUser) {
      return normalizeStoredUser(currentUser);
    }

    if (profile || customerLoggedIn || customerName) {
      return normalizeStoredUser({
        ten: (profile && (profile.name || profile.ten)) || customerName,
        sodienthoai: profile && profile.phone ? profile.phone : '',
        dia_chi: profile && profile.address ? profile.address : '',
        vai_tro: 'khach_hang'
      });
    }

    return null;
  }

  async function getUserFromServerSession() {
    try {
      var response = await fetch(authUrl('current'), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (response.status === 401) {
        return { status: 'unauthorized', user: null };
      }

      var data = await response.json();
      if (!response.ok || !data || !data.success || !data.user) {
        return { status: 'error', user: null };
      }
      return { status: 'ok', user: normalizeStoredUser(data.user) };
    } catch (e) {
      return { status: 'error', user: null };
    }
  }

  async function syncFromSession() {
    var localUser = getUserFromStorage();
    if (localUser) {
      setLoggedIn(localUser);
    } else {
      setLoggedOut();
    }

    var sessionResult = await getUserFromServerSession();
    if (sessionResult.status === 'ok' && sessionResult.user) {
      cacheUser(sessionResult.user);
      setLoggedIn(sessionResult.user);
      return;
    }

    if (sessionResult.status === 'unauthorized') {
      clearClientAuthStorage();
      setLoggedOut();
      return;
    }

    if (!localUser) {
      setLoggedOut();
    }
  }

  function initNavState() {
    var hasNavTargets = !!(getEl('loginNavItem') || getEl('userMenuContainer'));
    if (!hasNavTargets) return;

    var cachedUser = getUserFromStorage();
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

  // Chi xu ly logout khi nguoi dung bam link dang xuat.
  document.addEventListener('click', function (event) {
    if (isLogoutLink(event.target)) {
      clearClientAuthStorage();
      clearServerSession('logout');
    }
  }, true);

  document.addEventListener('siteLayout:ready', function () {
    initNavState();
  });

  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(function (eventName) {
    document.addEventListener(eventName, function () {
      var hasUser = false;
      try {
        hasUser = !!(localStorage.getItem('currentUser') || localStorage.getItem('customer_logged_in'));
      } catch (e) {
        hasUser = false;
      }
      if (hasUser) {
        resetIdleLogoutTimer();
      }
    }, { passive: true });
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
