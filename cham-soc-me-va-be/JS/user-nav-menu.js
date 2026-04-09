(function () {
  /**
   * CẤU HÌNH & TRẠNG THÁI
   */
  const getProjectBase = () => {
    const script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';
    const url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/user-nav-menu\.js(?:\?.*)?$/, '');
  };

  const projectBase = getProjectBase();
  let idleLogoutTimer = null;
  const idleLogoutMs = 30 * 60 * 1000;
  let hasSyncedSession = false;

  /**
   * TIỆN ÍCH URL & DOM
   */
  const authUrl = (action) => {
    const query = action ? ('?action=' + encodeURIComponent(action)) : '';
    return new URL('session_auth.php' + query, projectBase).href;
  };

  const assetUrl = (path) => {
    if (!path) return new URL('assets/logomvb.png', projectBase).href;
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(String(path).replace(/^\/+/, ''), projectBase).href;
  };

  const getEl = (id) => document.getElementById(id);

  /**
   * XỬ LÝ AUTH STORAGE
   */
  function clearClientAuthStorage() {
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('customer_logged_in');
      localStorage.removeItem('customer_name');
      localStorage.removeItem('profile');
    } catch (e) { }
  }

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
    } catch (e) { }
  }

  function normalizeStoredUser(rawUser) {
    if (!rawUser || typeof rawUser !== 'object') return null;
    return {
      ten: rawUser.ten || rawUser.hovaten || rawUser.ho_ten || rawUser.name || rawUser.customer_name || 'Tài khoản',
      vai_tro: rawUser.vai_tro || rawUser.role || 'nhan_vien',
      anh_dai_dien: rawUser.anh_dai_dien || rawUser.avatar || rawUser.image || '',
      sodienthoai: rawUser.sodienthoai || rawUser.so_dien_thoai || rawUser.phone || '',
      dia_chi: rawUser.dia_chi || rawUser.address || ''
    };
  }

  function getUserFromStorage() {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentUser) return normalizeStoredUser(currentUser);

      const profile = JSON.parse(localStorage.getItem('profile') || 'null');
      const customerName = localStorage.getItem('customer_name') || '';
      const customerLoggedIn = localStorage.getItem('customer_logged_in') === 'true';

      if (profile || customerLoggedIn || customerName) {
        return normalizeStoredUser({
          ten: (profile && (profile.name || profile.ten)) || customerName,
          sodienthoai: profile && profile.phone ? profile.phone : '',
          dia_chi: profile && profile.address ? profile.address : '',
          vai_tro: 'nhan_vien'
        });
      }
    } catch (e) { }
    return null;
  }

  /**
   * XỬ LÝ SESSION SERVER
   */
  async function clearServerSession(action) {
    const payload = JSON.stringify({ action: action || 'logout' });
    const target = authUrl(action || 'logout');
    try {
      if (navigator.sendBeacon) {
        if (navigator.sendBeacon(target, new Blob([payload], { type: 'application/json' }))) return;
      }
    } catch (e) { }
    fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: payload
    }).catch(() => { });
  }

  async function getUserFromServerSession() {
    try {
      const response = await fetch(authUrl('current'), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (response.status === 401) return { status: 'unauthorized', user: null };
      const data = await response.json();
      if (!response.ok || !data || !data.success || !data.user) return { status: 'error', user: null };
      return { status: 'ok', user: normalizeStoredUser(data.user) };
    } catch (e) {
      return { status: 'error', user: null };
    }
  }

  /**
   * CẬP NHẬT GIAO DIỆN
   */
  function setLoggedOut() {
    const loginNavItem = getEl('loginNavItem');
    const userMenuContainer = getEl('userMenuContainer');
    if (loginNavItem) loginNavItem.classList.remove('d-none');
    if (userMenuContainer) userMenuContainer.classList.add('d-none');
    if (idleLogoutTimer) {
      clearTimeout(idleLogoutTimer);
      idleLogoutTimer = null;
    }
  }

  function setLoggedIn(user) {
    const loginNavItem = getEl('loginNavItem');
    const userMenuContainer = getEl('userMenuContainer');
    const navAvatar = getEl('navAvatar');
    const navUserName = getEl('navUserName');

    if (!userMenuContainer) return;
    if (loginNavItem) loginNavItem.classList.add('d-none');
    userMenuContainer.classList.remove('d-none');

    if (navUserName) navUserName.textContent = user && user.ten ? user.ten : 'Tài khoản';
    if (navAvatar) {
      const avatar = user && user.anh_dai_dien ? user.anh_dai_dien : 'assets/logomvb.png';
      navAvatar.src = assetUrl(avatar);
    }
    resetIdleLogoutTimer();
  }

  function resetIdleLogoutTimer() {
    if (idleLogoutTimer) clearTimeout(idleLogoutTimer);
    idleLogoutTimer = setTimeout(() => {
      clearClientAuthStorage();
      clearServerSession('logout');
      setLoggedOut();
    }, idleLogoutMs);
  }

  /**
   * KHỞI TẠO & ĐIỀU PHỐI
   */
  async function syncFromSession() {
    // 1. Đồng bộ session từ cookie qua session_user.php
    try {
      const res = await fetch(new URL('session_user.php', projectBase).href, { credentials: 'same-origin' });
      // Thử parse JSON nhưng không crash nếu thất bại
      try { await res.json(); } catch (e) { }
    } catch (e) { }

    // 2. Kiểm tra trạng thái session chính thức
    const sessionResult = await getUserFromServerSession();
    if (sessionResult.status === 'ok' && sessionResult.user) {
      cacheUser(sessionResult.user);
      setLoggedIn(sessionResult.user);
    } else if (sessionResult.status === 'unauthorized') {
      clearClientAuthStorage();
      setLoggedOut();
    }
  }

  function initNavState() {
    const cachedUser = getUserFromStorage();
    if (cachedUser) setLoggedIn(cachedUser);
    else setLoggedOut();

    if (!hasSyncedSession) {
      hasSyncedSession = true;
      syncFromSession();
    }
  }

  // Khởi chạy khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavState);
  } else {
    initNavState();
  }

  // Logout listener
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (/\/logout\.php$/i.test(href) || /logout\.php(?:[?#].*)?$/i.test(href)) {
      clearClientAuthStorage();
      clearServerSession('logout');
    }
  }, true);

  // Ready event từ layout builder
  document.addEventListener('siteLayout:ready', initNavState);

  // Idle handling
  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(name => {
    document.addEventListener(name, () => {
      let hasUser = false;
      try {
        hasUser = !!(localStorage.getItem('currentUser') || localStorage.getItem('customer_logged_in'));
      } catch (e) { }
      if (hasUser) resetIdleLogoutTimer();
    }, { passive: true });
  });

  // Login success event
  window.addEventListener('auth:login-success', (event) => {
    const user = event?.detail?.user;
    if (user) {
      cacheUser(user);
      setLoggedIn(user);
    } else {
      syncFromSession();
    }
  });
})();