fetch('../../partials/dau-trang.html')
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
    // Desktop elements
    const loadingEl  = document.getElementById('auth-loading');
    const guestEl    = document.getElementById('auth-guest');
    const userEl     = document.getElementById('auth-user');

    // Mobile elements
    const loadingMobile  = document.getElementById('auth-loading-mobile');
    const avatarMobile   = document.getElementById('auth-avatar-mobile');
    const mobileGuest    = document.getElementById('mobile-auth-guest');
    const mobileUser     = document.getElementById('mobile-auth-user');

    fetch('../../api/public/check-session.php')
        .then(r => r.json())
        .then(data => {
            // Ẩn loading
            if (loadingEl)     loadingEl.style.display     = 'none';
            if (loadingMobile) loadingMobile.style.display = 'none';

            const dashMap = {
                customer: '../../pages/customer/trang-ca-nhan.html',
                provider: '../../pages/provider/trang-ca-nhan.html',
                admin:    '../../pages/admin/quan-tri.html'
            };
            const logoutMap = {
                customer: '../../api/customer/auth/logout.php',
                provider: '../../api/provider/auth/logout.php',
                admin:    '../../api/admin/auth/logout.php'
            };
            const loginMap = {
                customer: '../../pages/customer/dang-nhap.html',
                provider: '../../pages/provider/dang-nhap.html',
                admin:    '../../pages/admin/dang-nhap.html'
            };

            if (data.logged_in) {
                const initial = (data.name || 'U').charAt(0).toUpperCase();

                // ── Desktop ──
                if (userEl) userEl.style.display = '';
                const nameEl   = document.getElementById('auth-name');
                const avatarEl = document.getElementById('auth-avatar');
                if (nameEl)   nameEl.textContent   = data.name;
                if (avatarEl) avatarEl.textContent  = initial;

                const dashLink = document.getElementById('auth-dashboard-link');
                if (dashLink) dashLink.href = dashMap[data.role] || dashMap.customer;

                const logoutLink = document.getElementById('auth-logout-link');
                if (logoutLink) {
                    logoutLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        fetch(logoutMap[data.role] || logoutMap.customer)
                            .then(() => { window.location.href = loginMap[data.role] || loginMap.customer; });
                    });
                }

                // ── Mobile topbar avatar ──
                if (avatarMobile) {
                    avatarMobile.textContent = initial;
                    avatarMobile.style.display = '';
                }

                // ── Mobile nav user ──
                if (mobileUser) mobileUser.style.display = '';
                const mobileAvatarInner = document.getElementById('mobile-auth-avatar-inner');
                const mobileNameEl      = document.getElementById('mobile-auth-name');
                if (mobileAvatarInner) mobileAvatarInner.textContent = initial;
                if (mobileNameEl)      mobileNameEl.textContent      = data.name;

                const mobileDashLink = document.getElementById('mobile-auth-dashboard-link');
                if (mobileDashLink) mobileDashLink.href = dashMap[data.role] || dashMap.customer;

                const mobileLogout = document.getElementById('mobile-auth-logout-link');
                if (mobileLogout) {
                    mobileLogout.addEventListener('click', function(e) {
                        e.preventDefault();
                        fetch(logoutMap[data.role] || logoutMap.customer)
                            .then(() => { window.location.href = loginMap[data.role] || loginMap.customer; });
                    });
                }

            } else {
                // ── Desktop guest ──
                if (guestEl) guestEl.style.display = '';

                // ── Mobile guest ──
                if (mobileGuest) mobileGuest.style.display = '';
            }
        })
        .catch(() => {
            if (loadingEl)     loadingEl.style.display     = 'none';
            if (loadingMobile) loadingMobile.style.display = 'none';
            if (guestEl)       guestEl.style.display       = '';
            if (mobileGuest)   mobileGuest.style.display   = '';
        });
}
