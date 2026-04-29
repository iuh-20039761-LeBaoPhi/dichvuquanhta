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

        const path = window.location.pathname;
        if (path.includes('/nguoidung/') || path.includes('/admin_thonha/')) {
            return '../';
        }
        return './';
    }

    function buildPathMaps(basePrefix) {
        var base = ensureTrailingSlash(basePrefix);
        return {
            dashMap: {
                user:  base + 'nguoidung/trang-ca-nhan.html',
                admin: base + 'admin_thonha/quan-tri.html'
            },
            loginMap: {
                user:  base + '../../../public/dang-nhap.html?service=thonha',
                admin: base + 'admin_thonha/quan-tri.html'
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

        const getRoot = () => {
            if (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) return window.DVQTApp.ROOT_URL;
            const path = window.location.pathname;
            const lowerPath = path.toLowerCase();
            const idx = lowerPath.indexOf('/dich-vu/sua-chua/tho-nha/');
            if (idx !== -1) return path.substring(0, idx);
            const parts = path.split('/');
            if (parts[1] && !parts[1].includes('.') && parts[1] !== 'index.php') return '/' + parts[1];
            return '';
        };

        var paths = buildPathMaps(getBasePrefix());

        function setLoadingOff() {
            loadingEl.style.display = 'none';
            if (loadingMobile) loadingMobile.style.display = 'none';
        }

        function applyGuestUi() {
            const ROOT = getRoot();

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

        function bindDashboard(linkEl) {
            if (!linkEl) return;
            linkEl.href = paths.dashMap.user;
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
                        const ROOT = getRoot();
                        
                        window.location.href = ROOT + '/public/dang-nhap.html?service=thonha';
                    }
                });
            };
        }

        function applyLoggedInUi(authData) {
            var name = String(authData && authData.name || 'Người dùng');
            var initial = name.charAt(0).toUpperCase();

            if (guestEl) guestEl.style.display = 'none';
            if (mobileGuest) mobileGuest.style.display = 'none';

            if (userEl) userEl.style.display = '';
            const nameEl = document.getElementById('auth-name');
            const avatarEl = document.getElementById('auth-avatar');
            if (nameEl) nameEl.textContent = name;
            
            if (avatarEl) {
                const avatarLink = authData.link_avatar || authData.avatar || authData.avatartenfile || '';
                
                if (avatarLink) {
                    if (avatarLink.startsWith('http') || avatarLink.includes('/')) {
                        const resolveAvatar = (link) => {
                            if (link.startsWith('http')) return link;
                            return (getRoot() + '/public/uploads/users/' + link);
                        };
                        const finalUrl = resolveAvatar(avatarLink);
                        const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzk0YTNiOCI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==";
                        avatarEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.onerror=null; this.src='${defaultAvatar}';">`;
                    } else {
                        // Ảnh Drive (ID)
                        avatarEl.innerHTML = `
                             <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:50%;">
                                <iframe src="https://drive.google.com/file/d/${avatarLink}/preview" 
                                        frameborder="0" scrolling="no"
                                        style="width: 300%; height: 300%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;"></iframe>
                            </div>`;
                    }
                } else {
                    avatarEl.textContent = initial;
                }
            }

            // Đồng bộ cho Mobile Avatar nếu có
            const mobileAvatarInner = document.getElementById('mobile-auth-avatar-inner');
            if (mobileAvatarInner) {
                const avatarLink = authData.link_avatar || authData.avatar || authData.avatartenfile || '';
                if (avatarLink) {
                    if (avatarLink.startsWith('http') || avatarLink.includes('/')) {
                        const finalUrl = avatarLink.startsWith('http') ? avatarLink : (getRoot() + '/public/uploads/users/' + avatarLink);
                        mobileAvatarInner.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    } else {
                        mobileAvatarInner.innerHTML = `
                             <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:50%;">
                                <iframe src="https://drive.google.com/file/d/${avatarLink}/preview" 
                                        frameborder="0" scrolling="no"
                                        style="width: 300%; height: 300%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;"></iframe>
                            </div>`;
                    }
                } else {
                    mobileAvatarInner.textContent = initial;
                }
            }

            // Không phân biệt role nữa — mọi người dùng vào cùng 1 trang
            const dashLink = document.getElementById('auth-dashboard-link');
            bindDashboard(dashLink);

            const logoutLink = document.getElementById('auth-logout-link');
            bindLogout(logoutLink);

            if (avatarMobile) avatarMobile.style.display = '';
            if (mobileUser) mobileUser.style.display = '';
            
            const mobileNameEl = document.getElementById('mobile-auth-name');
            if (mobileNameEl) mobileNameEl.textContent = name;

            const mobileDashLink = document.getElementById('mobile-auth-dashboard-link');
            bindDashboard(mobileDashLink);

            const mobileLogout = document.getElementById('mobile-auth-logout-link');
            bindLogout(mobileLogout);
        }

        if (window.DVQTApp && window.DVQTApp.checkSession) {
            window.DVQTApp.checkSession().then(function (data) {
                setLoadingOff();
                if (data && data.logged_in) {
                    // Truyền toàn bộ data (bao gồm link_avatar, avatar, avatartenfile) vào UI
                    applyLoggedInUi(data);
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
