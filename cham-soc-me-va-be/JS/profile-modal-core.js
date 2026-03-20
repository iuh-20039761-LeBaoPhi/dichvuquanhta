(function () {
  function getProjectBase() {
    var script = document.currentScript;
    if (!script || !script.src) return window.location.origin + '/';

    var url = new URL(script.src, window.location.href);
    return url.href.replace(/JS\/profile-modal-core\.js(?:\?.*)?$/, '');
  }

  var projectBase = getProjectBase();

  function apiUrl(path) {
    return new URL('api/' + path, projectBase).href;
  }

  function assetUrl(path) {
    return new URL(path.replace(/^\/+/, ''), projectBase).href;
  }

  function bindPreview(inputId, previewId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (event) {
        var preview = document.getElementById(previewId);
        if (!preview) return;
        preview.src = event.target.result;
        preview.classList.remove('d-none');
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  async function loadProfile(root) {
    try {
      var response = await fetch(apiUrl('get_profile.php'));
      var data = await response.json();

      if (!data.success) {
        if (data.message === 'Unauthorized') {
          window.location.href = new URL('login.html', projectBase).href;
        }
        return;
      }

      var user = data.user || {};

      root.querySelector('#name').value = user.ten || '';
      root.querySelector('#phone').value = user.dien_thoai || '';
      root.querySelector('#email').value = user.email || '';
      root.querySelector('#address').value = user.dia_chi || '';
      root.querySelector('#username').value = user.ten_dang_nhap || '';

      if (user.anh_dai_dien) {
        var currentAvatar = root.querySelector('#currentAvatarContainer');
        currentAvatar.innerHTML =
          '<p class="small text-muted mb-1">Ảnh hiện tại:</p>' +
          '<img src="' + assetUrl(user.anh_dai_dien) + '" class="img-fluid rounded border" style="max-width:150px;">';
      }

      if (user.anh_cccd) {
        var currentCccd = root.querySelector('#currentCccdContainer');
        currentCccd.innerHTML =
          '<p class="small text-muted mb-1">Ảnh hiện tại:</p>' +
          '<img src="' + assetUrl(user.anh_cccd) + '" class="img-fluid rounded border" style="max-width:150px;">';
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  function bindSubmit(root) {
    var profileForm = root.querySelector('#profileForm');
    if (!profileForm || profileForm.dataset.bound === '1') return;

    profileForm.dataset.bound = '1';
    profileForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var formData = new FormData(e.target);
      var alertContainer = root.querySelector('#alertContainer');
      alertContainer.innerHTML = '';

      try {
        var response = await fetch(apiUrl('update_profile.php'), {
          method: 'POST',
          body: formData
        });

        var data = await response.json();

        if (data.success) {
          alertContainer.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i>' + data.message + '</div>';
          setTimeout(function () {
            window.location.reload();
          }, 1200);
        } else {
          alertContainer.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>' + data.message + '</div>';
        }
      } catch (error) {
        alertContainer.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Lỗi kết nối. Vui lòng thử lại.</div>';
      }
    });
  }

  window.initProfileModal = function (scope) {
    var root = scope || document;

    bindPreview('avatar', 'avatarPreview');
    bindPreview('cccd_image', 'cccdPreview');
    bindSubmit(root);
    loadProfile(root);
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.initProfileModal(document);

    var path = window.location.pathname.toLowerCase();
    var isProfilePage = path.endsWith('/khach_hang/profile.html') || path.endsWith('khach_hang/profile.html') || path.endsWith('/profile.html') || path.endsWith('profile.html');
    if (!isProfilePage || typeof bootstrap === 'undefined') return;

    var profileModalEl = document.getElementById('profileModal');
    if (!profileModalEl) return;

    var profileModal = bootstrap.Modal.getOrCreateInstance(profileModalEl);
    profileModal.show();
  });
})();
