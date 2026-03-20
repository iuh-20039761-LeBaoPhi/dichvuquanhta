(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/login-modal-core\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();

  function apiUrl(path) {
    return new URL('api/' + path, projectBase).href;
  }

  function pageUrl(path) {
    return new URL(String(path || '').replace(/^\/+/, ''), projectBase).href;
  }

  function bindLoginForm(scope) {
    var root = scope || document;
    var loginForm = root.querySelector('#loginForm');
    if (!loginForm || loginForm.dataset.bound === '1') return;

    loginForm.dataset.bound = '1';
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var username = root.querySelector('#username').value;
      var password = root.querySelector('#password').value;
      var alertContainer = root.querySelector('#alertContainer');
      alertContainer.innerHTML = '';

      try {
        var response = await fetch(apiUrl('login.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: username, password: password })
        });

        var data = await response.json();

        if (data.success) {
          if (data.user) {
            try {
              localStorage.setItem('currentUser', JSON.stringify(data.user));
            } catch (e) {
              // Ignore storage errors.
            }
          }

          alertContainer.innerHTML = '<div class="alert alert-success">' + data.message + '</div>';

          window.dispatchEvent(new CustomEvent('auth:login-success', {
            detail: {
              user: data.user || null,
              response: data
            }
          }));

          var modalEl = loginForm.closest('.modal');
          if (modalEl && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getOrCreateInstance(modalEl).hide();
          }

          var role = data && data.user ? data.user.vai_tro : '';
          var redirectTarget = role === 'admin' && data.redirect ? data.redirect : 'index.html';
          var redirectUrl = pageUrl(redirectTarget);

          setTimeout(function () {
            window.location.href = redirectUrl;
          }, 500);
        } else {
          alertContainer.innerHTML = '<div class="alert alert-danger">' + data.message + '</div>';
        }
      } catch (error) {
        alertContainer.innerHTML = '<div class="alert alert-danger">Loi ket noi. Vui long thu lai.</div>';
      }
    });
  }

  window.initLoginModal = bindLoginForm;

  document.addEventListener('DOMContentLoaded', function () {
    window.initLoginModal(document);

    var path = window.location.pathname.toLowerCase();
    var isLoginPage = path.endsWith('/login.html') || path.endsWith('login.html');
    if (!isLoginPage) return;

    var loginModalEl = document.getElementById('loginModal');
    if (!loginModalEl || typeof bootstrap === 'undefined') return;

    var loginModal = bootstrap.Modal.getOrCreateInstance(loginModalEl);
    loginModal.show();
  });
})();
