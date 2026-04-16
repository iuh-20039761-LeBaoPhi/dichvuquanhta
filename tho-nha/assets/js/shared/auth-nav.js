/**
 * auth-nav.js — Tự động khởi tạo nút đăng nhập trên navbar
 * Dùng MutationObserver để phát hiện khi header.html được inject vào DOM
 */
(function () {
    'use strict';

    function safeParse(raw, fallback) {
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (_err) {
            return fallback;
        }
    }

    function ensureTrailingSlash(prefix) {
        var p = String(prefix || './').trim();
        if (!p) return './';
        return p.endsWith('/') ? p : (p + '/');
    }

    function getBasePrefix() {
        if (typeof window.BD_BASE === 'string' && window.BD_BASE.trim()) {
            return ensureTrailingSlash(window.BD_BASE);
        }

        var path = String(window.location.pathname || '');
        if (path.indexOf('/pages/public/') !== -1) return '../../';
        if (path.indexOf('/partials/') !== -1) return '../';
        return './';
    }

    function buildPathMaps(basePrefix) {
        var base = ensureTrailingSlash(basePrefix);
        return {
            dashMap: {
                customer: base + 'pages/customer/trang-ca-nhan.html',
                provider: base + 'pages/provider/trang-ca-nhan.html',
                admin: base + 'pages/admin/quan-tri.html'
            },
            loginMap: {
                customer: base + '../public/dang-nhap.html?service=thonha',
                provider: base + '../public/dang-nhap.html?service=thonha',
                admin: base + 'pages/admin/dang-nhap.html'
            }
        };
    }

    function clearLocalAuth() {
        if (window.DVQTApp && window.DVQTApp.logout) {
            window.DVQTApp.logout();
        } else {
            localStorage.clear();
        }
    }

    function initAuthNav() {
        const loadingEl = document.getElementById('auth-loading');
        if (!loadingEl || loadingEl.dataset.init) return; // Chặn double-init
        loadingEl.dataset.init = '1';

        const guestEl = document.getElementById('auth-guest');
        const userEl = document.getElementById('auth-user');
        const loadingMobile = document.getElementById('auth-loading-mobile');
        const avatarMobile = document.getElementById('auth-avatar-mobile');
        const mobileGuest = document.getElementById('mobile-auth-guest');
        const mobileUser = document.getElementById('mobile-auth-user');

        var paths = buildPathMaps(getBasePrefix());

        function setLoadingOff() {
            loadingEl.style.display = 'none';
            if (loadingMobile) loadingMobile.style.display = 'none';
        }

        function applyGuestUi() {
            const ROOT = (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) 
                ? window.DVQTApp.ROOT_URL 
                : (window.location.pathname.indexOf('/tho-nha/') !== -1 
                    ? window.location.pathname.substring(0, window.location.pathname.indexOf('/tho-nha/')) 
                    : (window.location.pathname.split('/')[1] && !window.location.pathname.split('/')[1].includes('.') && window.location.pathname.split('/')[1] !== 'index.php' ? '/' + window.location.pathname.split('/')[1] : ''));

            const loginHrefs = [document.getElementById('auth-login-link'), document.getElementById('mobile-auth-login-link')];
            const regHrefs   = [document.getElementById('auth-register-link'), document.getElementById('mobile-auth-register-link')];

            loginHrefs.forEach(el => { if(el) el.href = ROOT + '/public/dang-nhap.html?service=thonha'; });
            regHrefs.forEach(el => { if(el) el.href = ROOT + '/public/dang-ky.html?service=thonha'; });

            if (guestEl) guestEl.style.display = '';
            if (userEl) userEl.style.display = 'none';
            if (mobileGuest) mobileGuest.style.display = '';
            if (mobileUser) mobileUser.style.display = 'none';
            if (avatarMobile) avatarMobile.style.display = 'none';
        }

        function bindDashboard(linkEl, role) {
            if (!linkEl) return;
            const dashUrl = paths.dashMap[role] || paths.dashMap.customer;
            linkEl.href = dashUrl;
        }

        function bindLogout(linkEl) {
            if (!linkEl) return;
            linkEl.onclick = function (e) {
                e.preventDefault();

                // Hiện popup xác nhận đăng xuất tinh tế
                Swal.fire({
                    title: '<span style="color:#ef4444">Đăng xuất?</span>',
                    text: 'Bạn có chắc chắn muốn thoát khỏi phiên làm việc này không?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Đăng xuất ngay',
                    cancelButtonText: 'Để sau',
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#94a3b8',
                    borderRadius: '12px'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // 1. Thực hiện đăng xuất (Xoá Cookie/LocalStorage) qua DVQTApp
                        if (window.DVQTApp && window.DVQTApp.logout) {
                            window.DVQTApp.logout();
                        } else {
                            localStorage.clear();
                            document.cookie = "dvqt_u=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            document.cookie = "dvqt_p=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        }

                        // 2. Chuyển hướng ngay lập tức về trang đăng nhập chung
                        const ROOT = (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) 
                            ? window.DVQTApp.ROOT_URL 
                            : (window.location.pathname.indexOf('/tho-nha/') !== -1 
                                ? window.location.pathname.substring(0, window.location.pathname.indexOf('/tho-nha/')) 
                                : (window.location.pathname.split('/')[1] && !window.location.pathname.split('/')[1].includes('.') && window.location.pathname.split('/')[1] !== 'index.php' ? '/' + window.location.pathname.split('/')[1] : ''));
                        
                        window.location.href = ROOT + '/public/dang-nhap.html?service=thonha';
                    }
                });
            };
        }

        function applyLoggedInUi(authData) {
            var role = String(authData && authData.role || 'customer');
            var name = String(authData && authData.name || 'User');
            var phone = authData.phone || '';

            var initial = name.charAt(0).toUpperCase();

            if (guestEl) guestEl.style.display = 'none';
            if (mobileGuest) mobileGuest.style.display = 'none';

            if (userEl) userEl.style.display = '';
            const nameEl = document.getElementById('auth-name');
            const avatarEl = document.getElementById('auth-avatar');
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) avatarEl.textContent = initial;

            const dashLink = document.getElementById('auth-dashboard-link');
            bindDashboard(dashLink, role);

            const logoutLink = document.getElementById('auth-logout-link');
            bindLogout(logoutLink);

            if (avatarMobile) {
                avatarMobile.textContent = initial;
                avatarMobile.style.display = '';
            }

            if (mobileUser) mobileUser.style.display = '';
            const mobileAvatarInner = document.getElementById('mobile-auth-avatar-inner');
            const mobileNameEl = document.getElementById('mobile-auth-name');
            if (mobileAvatarInner) mobileAvatarInner.textContent = initial;
            if (mobileNameEl) mobileNameEl.textContent = name;

            const mobileDashLink = document.getElementById('mobile-auth-dashboard-link');
            bindDashboard(mobileDashLink, role);

            const mobileLogout = document.getElementById('mobile-auth-logout-link');
            bindLogout(mobileLogout);
        }

        if (window.DVQTApp && window.DVQTApp.checkSession) {
            window.DVQTApp.checkSession().then(function (data) {
                setLoadingOff();
                if (data && data.logged_in) {
                    applyLoggedInUi({
                        role: data.role || 'customer',
                        name: data.name || 'User',
                        phone: data.phone || '',
                        address: (data.meta && data.meta.address) ? data.meta.address : ''
                    });
                } else {
                    applyGuestUi();
                }
            }).catch(function () {
                setLoadingOff();
                applyGuestUi();
            });
        } else {
            setLoadingOff();
            applyGuestUi();
        }
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
