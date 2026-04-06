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
            checkSessionUrl: base + 'api/public/check-session.php',
            dashMap: {
                customer: base + 'pages/customer/trang-ca-nhan.html',
                provider: base + 'pages/provider/trang-ca-nhan.html',
                admin: base + 'pages/admin/quan-tri.html'
            },
            logoutMap: {
                customer: base + '../public/api/auth/logout.php',
                provider: base + '../public/api/auth/logout.php',
                admin: base + 'api/admin/auth/logout.php'
            },
            loginMap: {
                customer: base + '../public/dang-nhap.html?service=thonha',
                provider: base + '../public/dang-nhap.html?service=thonha',
                admin: base + 'pages/admin/dang-nhap.html'
            }
        };
    }

    function clearLocalAuth() {
        [
            'customer_logged_in', 'customer_name', 'thonha_customer_profile_v1',
            'provider_logged_in', 'provider_name', 'provider_company', 'thonha_provider_profile_v1',
            'admin_logged_in', 'admin_username'
        ].forEach(function (k) { localStorage.removeItem(k); });
    }

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

        var paths = buildPathMaps(getBasePrefix());

        function setLoadingOff() {
            loadingEl.style.display = 'none';
            if (loadingMobile) loadingMobile.style.display = 'none';
        }

        function applyGuestUi() {
            if (guestEl) guestEl.style.display = '';
            if (userEl) userEl.style.display = 'none';
            if (mobileGuest) mobileGuest.style.display = '';
            if (mobileUser) mobileUser.style.display = 'none';
            if (avatarMobile) avatarMobile.style.display = 'none';
        }

        function bindDashboard(linkEl, role, phone, serviceTable) {
            if (!linkEl) return;
            const dashUrl = paths.dashMap[role] || paths.dashMap.customer;
            
            linkEl.onclick = async function(e) {
                if (role === 'provider' && serviceTable) {
                    e.preventDefault();
                    try {
                        const hasAccess = await window.DVQTApp.checkAccess(serviceTable, phone);
                        if (hasAccess) {
                            window.location.href = dashUrl;
                        } else {
                            alert("Tài khoản của bạn chưa đăng ký làm nhà cung cấp của dịch vụ này!");
                        }
                    } catch (err) {
                        console.error('Access check failed:', err);
                        window.location.href = dashUrl; // Fallback
                    }
                } else {
                    // Mặc định cho customer hoặc role khác
                    linkEl.href = dashUrl;
                }
            };
        }

        function bindLogout(linkEl, role) {
            if (!linkEl) return;
            linkEl.onclick = async function (e) {
                e.preventDefault();
                clearLocalAuth();

                if (window.DVQTApp && window.DVQTApp.logout) {
                    await window.DVQTApp.logout();
                } else {
                    var logoutUrl = paths.logoutMap[role] || paths.logoutMap.customer;
                    await fetch(logoutUrl).catch(() => null);
                }

                window.location.href = paths.loginMap[role] || paths.loginMap.customer;
            };
        }

        function applyLoggedInUi(authData) {
            var role = String(authData && authData.role || 'customer');
            var name = String(authData && authData.name || 'User');
            var phone = authData.phone || '';
            
            // Đồng bộ ngược lại LocalStorage cho các thư viện cũ
            localStorage.setItem(role + '_logged_in', 'true');
            localStorage.setItem(role + '_name', name);
            if (phone) {
                if (role === 'customer') {
                   localStorage.setItem('thonha_customer_profile_v1', JSON.stringify({
                       name: name, phone: phone, address: authData.address || ''
                   }));
                }
            }
            
            var initial = name.charAt(0).toUpperCase();

            if (guestEl) guestEl.style.display = 'none';
            if (mobileGuest) mobileGuest.style.display = 'none';

            if (userEl) userEl.style.display = '';
            const nameEl   = document.getElementById('auth-name');
            const avatarEl = document.getElementById('auth-avatar');
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) avatarEl.textContent = initial;

            // Đăng ký bảng NCC cho Thợ Nhà
            const serviceTable = 'nhacungcap_thonha';

            const dashLink = document.getElementById('auth-dashboard-link');
            bindDashboard(dashLink, role, phone, serviceTable);

            const logoutLink = document.getElementById('auth-logout-link');
            bindLogout(logoutLink, role);

            if (avatarMobile) {
                avatarMobile.textContent = initial;
                avatarMobile.style.display = '';
            }

            if (mobileUser) mobileUser.style.display = '';
            const mobileAvatarInner = document.getElementById('mobile-auth-avatar-inner');
            const mobileNameEl      = document.getElementById('mobile-auth-name');
            if (mobileAvatarInner) mobileAvatarInner.textContent = initial;
            if (mobileNameEl) mobileNameEl.textContent = name;

            const mobileDashLink = document.getElementById('mobile-auth-dashboard-link');
            bindDashboard(mobileDashLink, role, phone, serviceTable);

            const mobileLogout = document.getElementById('mobile-auth-logout-link');
            bindLogout(mobileLogout, role);
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
            // Fallback for legacy
            fetch(paths.checkSessionUrl, { cache: 'no-store' })
                .then(r => r.json())
                .then(function (data) {
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
                })
                .catch(function () {
                    setLoadingOff();
                    applyGuestUi();
                });
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
