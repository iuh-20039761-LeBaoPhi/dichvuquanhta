(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/shared-layout\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();

  function normalizeUrl(value) {
    if (!value) return value;
    if (value.charAt(0) === '#') return value;
    if (/^(?:[a-z]+:|\/\/)/i.test(value)) return value;
    return new URL(String(value).replace(/^\/+/, ''), projectBase).href;
  }

  function normalizePartialUrls(container) {
    if (!container) return;

    var hrefNodes = container.querySelectorAll('[href]');
    hrefNodes.forEach(function (node) {
      var href = node.getAttribute('href');
      if (!href || /^javascript:/i.test(href)) return;
      node.setAttribute('href', normalizeUrl(href));
    });

    var srcNodes = container.querySelectorAll('[src]');
    srcNodes.forEach(function (node) {
      var src = node.getAttribute('src');
      if (!src) return;
      node.setAttribute('src', normalizeUrl(src));
    });

    ['data-login-modal-src', 'data-profile-modal-src', 'data-lookup-modal-src'].forEach(function (attr) {
      var modalSrcNodes = container.querySelectorAll('[' + attr + ']');
      modalSrcNodes.forEach(function (node) {
        var raw = node.getAttribute(attr);
        if (!raw) return;
        node.setAttribute(attr, normalizeUrl(raw));
      });
    });
  }

  function loadPartial(containerId, partialPath) {
    var container = document.getElementById(containerId);
    if (!container) return Promise.resolve(false);

    var partialUrl = normalizeUrl(partialPath);

    return fetch(partialUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Khong the tai partial: ' + partialPath);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        normalizePartialUrls(container);
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
  function setupMobileMenu() {
    var navMenu = document.getElementById('navMenu');
    var toggler = document.querySelector('.navbar-toggler');
    if (!navMenu || !toggler) return;

    // Ngăn chặn sự kiện click lan truyền ra ngoài toggler (fix lỗi iPhone tự đóng menu)
    toggler.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    // Đóng menu khi click vào các link (trên mobile)
    var navLinks = navMenu.querySelectorAll('.nav-link:not(.dropdown-toggle)');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.getComputedStyle(toggler).display !== 'none') {
          if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
            var bsCollapse = bootstrap.Collapse.getInstance(navMenu) || new bootstrap.Collapse(navMenu, { toggle: false });
            bsCollapse.hide();
          } else {
            navMenu.classList.remove('show');
          }
        }
      });
    });

    // Đóng menu khi click ra ngoài vùng menu (Safari/iPhone fix)
    document.addEventListener('click', function (e) {
      var isClickInsideMenu = navMenu.contains(e.target);
      var isClickOnToggler = toggler.contains(e.target);

      if (!isClickInsideMenu && !isClickOnToggler && navMenu.classList.contains('show')) {
        if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
          var bsCollapse = bootstrap.Collapse.getInstance(navMenu);
          if (bsCollapse) bsCollapse.hide();
          else navMenu.classList.remove('show');
        } else {
          navMenu.classList.remove('show');
        }
      }
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
      loadPartial('site-header', 'html/shared-header.html'),
      loadPartial('site-footer', 'html/shared-footer.html')
    ]).then(function () {
      applyActiveNav();
      // Khởi tạo menu mobile sau khi đã load xong header
      setupMobileMenu();
      document.dispatchEvent(new CustomEvent('siteLayout:ready'));
    });
  });
})();
