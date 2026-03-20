(function () {
  var DEFAULT_LOGIN_MODAL_SRC = 'login.html';
  var modalPromise = null;

  function findTrigger(target) {
    return target.closest('[data-login-modal]');
  }

  async function ensureLoginModal(src) {
    var modal = document.getElementById('loginModal');
    if (modal) {
      if (typeof window.initLoginModal === 'function') {
        window.initLoginModal(modal);
      }
      return modal;
    }

    if (!modalPromise) {
      modalPromise = fetch(src)
        .then(function (res) {
          return res.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var fetchedModal = doc.getElementById('loginModal');
          if (!fetchedModal) throw new Error('Khong tim thay #loginModal');
          document.body.appendChild(fetchedModal);
          return fetchedModal;
        });
    }

    modal = await modalPromise;
    if (typeof window.initLoginModal === 'function') {
      window.initLoginModal(modal);
    }

    return modal;
  }

  document.addEventListener('click', async function (e) {
    var trigger = findTrigger(e.target);
    if (!trigger) return;

    e.preventDefault();

    var src = trigger.getAttribute('data-login-modal-src') || DEFAULT_LOGIN_MODAL_SRC;

    try {
      var modal = await ensureLoginModal(src);
      var modalInstance = bootstrap.Modal.getOrCreateInstance(modal);
      modalInstance.show();
    } catch (error) {
      window.location.href = src;
    }
  });
})();
