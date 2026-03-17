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

        const guestEl = document.getElementById('auth-guest');
        const userEl  = document.getElementById('auth-user');

        fetch('api/check-session.php')
            .then(r => r.json())
            .then(function (data) {
                loadingEl.style.display = 'none';

                if (data.logged_in) {
                    if (userEl) userEl.style.display = '';

                    var nameEl   = document.getElementById('auth-name');
                    var avatarEl = document.getElementById('auth-avatar');
                    if (nameEl)   nameEl.textContent   = data.name || '';
                    if (avatarEl) avatarEl.textContent  = (data.name || 'U').charAt(0).toUpperCase();

                    var dashMap = {
                        customer: 'customer-dashboard.html',
                        provider: 'provider-dashboard.html',
                        admin:    'admin.html'
                    };
                    var logoutMap = {
                        customer: 'api/customer/logout.php',
                        provider: 'api/provider/logout.php',
                        admin:    'api/admin/logout.php'
                    };
                    var loginMap = {
                        customer: 'customer-login.html',
                        provider: 'provider-login.html',
                        admin:    'login.html'
                    };

                    var dashLink = document.getElementById('auth-dashboard-link');
                    if (dashLink) dashLink.href = dashMap[data.role] || 'customer-dashboard.html';

                    var logoutLink = document.getElementById('auth-logout-link');
                    if (logoutLink) {
                        logoutLink.addEventListener('click', function (e) {
                            e.preventDefault();
                            fetch(logoutMap[data.role] || 'api/customer/logout.php')
                                .then(function () {
                                    window.location.href = loginMap[data.role] || 'customer-login.html';
                                });
                        });
                    }
                } else {
                    if (guestEl) guestEl.style.display = '';
                }
            })
            .catch(function () {
                loadingEl.style.display = 'none';
                if (guestEl) guestEl.style.display = '';
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
