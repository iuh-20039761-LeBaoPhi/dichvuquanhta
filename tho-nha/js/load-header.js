fetch('header.html')
    .then(res => res.text())
    .then(html => {
        document.getElementById('header').innerHTML = html;

        // xử lý anchor sau khi header load xong
        document.querySelectorAll('#header a[href^="#"]').forEach(link => {
            link.addEventListener('click', function (e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        initAuthNav();
    });

function initAuthNav() {
    const loadingEl  = document.getElementById('auth-loading');
    const guestEl    = document.getElementById('auth-guest');
    const userEl     = document.getElementById('auth-user');

    fetch('api/check-session.php')
        .then(r => r.json())
        .then(data => {
            if (loadingEl) loadingEl.style.display = 'none';

            if (data.logged_in) {
                if (userEl) userEl.style.display = '';
                const nameEl   = document.getElementById('auth-name');
                const avatarEl = document.getElementById('auth-avatar');
                if (nameEl)   nameEl.textContent   = data.name;
                if (avatarEl) avatarEl.textContent  = (data.name || 'U').charAt(0).toUpperCase();

                // Dashboard link theo role
                const dashMap = {
                    customer: 'customer-dashboard.html',
                    provider: 'provider-dashboard.html',
                    admin:    'admin.html'
                };
                const logoutMap = {
                    customer: 'api/customer/logout.php',
                    provider: 'api/provider/logout.php',
                    admin:    'api/admin/logout.php'
                };
                const loginMap = {
                    customer: 'customer-login.html',
                    provider: 'provider-login.html',
                    admin:    'login.html'
                };

                const dashLink = document.getElementById('auth-dashboard-link');
                if (dashLink) dashLink.href = dashMap[data.role] || 'customer-dashboard.html';

                const logoutLink = document.getElementById('auth-logout-link');
                if (logoutLink) {
                    logoutLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        fetch(logoutMap[data.role] || 'api/customer/logout.php')
                            .then(() => { window.location.href = loginMap[data.role] || 'customer-login.html'; });
                    });
                }
            } else {
                if (guestEl) guestEl.style.display = '';
            }
        })
        .catch(() => {
            if (loadingEl) loadingEl.style.display = 'none';
            if (guestEl)   guestEl.style.display   = '';
        });
}
