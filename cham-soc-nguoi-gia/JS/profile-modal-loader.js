(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/profile-modal-loader\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();
  var modalPromise = null;
  var coreScriptPromise = null;

  function findTrigger(target) {
    return target.closest('[data-profile-modal]');
  }

  function ensureCoreScript() {
    if (typeof window.initProfileModal === 'function') {
      return Promise.resolve();
    }

    if (coreScriptPromise) return coreScriptPromise;

    coreScriptPromise = new Promise(function (resolve, reject) {
      var src = new URL('JS/profile-modal-core.js', projectBase).href;
      if (document.querySelector('script[src="' + src + '"]')) {
        setTimeout(resolve, 0);
        return;
      }

      var script = document.createElement('script');
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Khong tai duoc profile-modal-core.js')); };
      document.body.appendChild(script);
    });

    return coreScriptPromise;
  }

  async function ensureProfileModal(src) {
    await ensureCoreScript();

    var modal = document.getElementById('profileModal');
    if (modal) {
      if (typeof window.initProfileModal === 'function') {
        window.initProfileModal(modal);
      }
      return modal;
    }

    if (!modalPromise) {
      var absoluteSrc = new URL(src, projectBase).href;
      modalPromise = fetch(absoluteSrc)
        .then(function (res) { return res.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var fetchedModal = doc.getElementById('profileModal');
          if (!fetchedModal) throw new Error('Khong tim thay #profileModal');
          document.body.appendChild(fetchedModal);
          return fetchedModal;
        });
    }

    modal = await modalPromise;

    if (typeof window.initProfileModal === 'function') {
      window.initProfileModal(modal);
    }

    return modal;
  }

  document.addEventListener('click', async function (e) {
    var trigger = findTrigger(e.target);
    if (!trigger) return;

    e.preventDefault();

    var src = trigger.getAttribute('data-profile-modal-src') || 'khach_hang/profile.html';

    try {
      var modal = await ensureProfileModal(src);
      var modalInstance = bootstrap.Modal.getOrCreateInstance(modal);
      modalInstance.show();
    } catch (error) {
      window.location.href = new URL(src, projectBase).href;
    }
  });
})();
