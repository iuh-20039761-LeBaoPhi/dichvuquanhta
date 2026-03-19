/**
 * auth-nav.js — Tự động khởi tạo nút đăng nhập trên navbar
 * Dùng MutationObserver để phát hiện khi header.html được inject vào DOM
 */
(function () {
    'use strict';

    function initAuthNav() {
        const loadingEl = document.getElementById('auth-loading');
        if (!loadingEl || loadingEl.dataset.init) return; // Chặn double-init
        loadingEl.dataset.init = '1';

        const guestEl      = document.getElementById('auth-guest');
        const userEl       = document.getElementById('auth-user');
        const loadingMobile = document.getElementById('auth-loading-mobile');
        const avatarMobile  = document.getElementById('auth-avatar-mobile');
        const mobileGuest   = document.getElementById('mobile-auth-guest');
        const mobileUser    = document.getElementById('mobile-auth-user');

        fetch('../../api/public/check-session.php')
            .then(r => r.json())
            .then(function (data) {
                loadingEl.style.display = 'none';
                if (loadingMobile) loadingMobile.style.display = 'none';

                var dashMap = {
                    customer: '../../pages/customer/trang-ca-nhan.html',
                    provider: '../../pages/provider/trang-ca-nhan.html',
                    admin:    '../../pages/admin/quan-tri.html'
                };
                var logoutMap = {
                    customer: '../../api/customer/auth/logout.php',
                    provider: '../../api/provider/auth/logout.php',
                    admin:    '../../api/admin/auth/logout.php'
                };
                var loginMap = {
                    customer: '../../pages/customer/dang-nhap.html',
                    provider: '../../pages/provider/dang-nhap.html',
                    admin:    '../../pages/admin/dang-nhap.html'
                };

                if (data.logged_in) {
                    var initial = (data.name || 'U').charAt(0).toUpperCase();

                    // ── Desktop ──
                    if (userEl) userEl.style.display = '';
                    var nameEl   = document.getElementById('auth-name');
                    var avatarEl = document.getElementById('auth-avatar');
                    if (nameEl)   nameEl.textContent  = data.name || '';
                    if (avatarEl) avatarEl.textContent = initial;

                    var dashLink = document.getElementById('auth-dashboard-link');
                    if (dashLink) dashLink.href = dashMap[data.role] || dashMap.customer;

                    var logoutLink = document.getElementById('auth-logout-link');
                    if (logoutLink) {
                        logoutLink.addEventListener('click', function (e) {
                            e.preventDefault();
                            fetch(logoutMap[data.role] || logoutMap.customer)
                                .then(function () {
                                    window.location.href = loginMap[data.role] || loginMap.customer;
                                });
                        });
                    }

                    // ── Mobile topbar avatar ──
                    if (avatarMobile) {
                        avatarMobile.textContent = initial;
                        avatarMobile.style.display = '';
                    }

                    // ── Mobile nav user ──
                    if (mobileUser) mobileUser.style.display = '';
                    var mobileAvatarInner = document.getElementById('mobile-auth-avatar-inner');
                    var mobileNameEl      = document.getElementById('mobile-auth-name');
                    if (mobileAvatarInner) mobileAvatarInner.textContent = initial;
                    if (mobileNameEl)      mobileNameEl.textContent      = data.name || '';

                    var mobileDashLink = document.getElementById('mobile-auth-dashboard-link');
                    if (mobileDashLink) mobileDashLink.href = dashMap[data.role] || dashMap.customer;

                    var mobileLogout = document.getElementById('mobile-auth-logout-link');
                    if (mobileLogout) {
                        mobileLogout.addEventListener('click', function (e) {
                            e.preventDefault();
                            fetch(logoutMap[data.role] || logoutMap.customer)
                                .then(function () {
                                    window.location.href = loginMap[data.role] || loginMap.customer;
                                });
                        });
                    }

                } else {
                    if (guestEl)    guestEl.style.display    = '';
                    if (mobileGuest) mobileGuest.style.display = '';
                }
            })
            .catch(function () {
                loadingEl.style.display = 'none';
                if (loadingMobile) loadingMobile.style.display = 'none';
                if (guestEl)       guestEl.style.display       = '';
                if (mobileGuest)   mobileGuest.style.display   = '';
            });
    }

    // Chạy ngay nếu header đã có sẵn, hoặc dùng MutationObserver đợi header inject
    function tryInit() {
        if (document.getElementById('auth-loading')) {
            initAuthNav();
        } else {
            var obs = new MutationObserver(function () {
                if (document.getElementById('auth-loading')) {
                    obs.disconnect();
                    initAuthNav();
                }
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
