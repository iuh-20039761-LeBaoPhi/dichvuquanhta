(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/user-nav-menu\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();

  function apiUrl(path) {
    return new URL('api/' + path, projectBase).href;
  }

  function assetUrl(path) {
    if (!path) return new URL('assets/logomvb.png', projectBase).href;
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(String(path).replace(/^\/+/, ''), projectBase).href;
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function setLoggedOut() {
    var loginNavItem = getEl('loginNavItem');
    var userMenuContainer = getEl('userMenuContainer');

    if (loginNavItem) loginNavItem.classList.remove('d-none');
    if (userMenuContainer) userMenuContainer.classList.add('d-none');
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

  document.addEventListener('DOMContentLoaded', function () {
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

    syncFromSession();
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
