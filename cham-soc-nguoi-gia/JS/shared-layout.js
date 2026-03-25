(function () {
  function loadPartial(containerId, partialPath) {
    var container = document.getElementById(containerId);
    if (!container) return Promise.resolve(false);

    return fetch(partialPath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Khong the tai partial: ' + partialPath);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        return true;
      })
      .catch(function (error) {
        console.error(error);
        return false;
      });
  }

  function applyActiveNav() {
    var navKey = (document.body && document.body.getAttribute('data-nav-active')) || '';
    if (!navKey) return;

    var activeLink = document.querySelector('[data-nav-key="' + navKey + '"]');
    if (!activeLink) return;

    activeLink.classList.add('active');
    activeLink.style.color = '#2e7d32';

    var activeStyle = (document.body && document.body.getAttribute('data-nav-active-style')) || 'large';
    if (activeStyle === 'large') {
      activeLink.style.fontSize = 'larger';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
      loadPartial('site-header', 'html/shared-header.html'),
      loadPartial('site-footer', 'html/shared-footer.html')
    ]).then(function () {
      applyActiveNav();
      document.dispatchEvent(new CustomEvent('siteLayout:ready'));
    });
  });
})();
