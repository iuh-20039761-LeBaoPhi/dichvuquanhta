
(function () {
    'use strict';

    let _currentSession = null;

    /**
     * Xác thực phiên đăng nhập của khách hàng (Route Guard).
     * Kiểm tra cả LocalStorage và Server Session (PHP).
     */
    /**
     * Xác thực phiên đăng nhập của khách hàng (Route Guard).
     * Hỗ trợ giải mã tham số URL (id, sdt, pass) để tự động đăng nhập và xem đơn hàng.
     */
    async function verifySession() {
        const urlParams = new URLSearchParams(window.location.search);
        const sdt = urlParams.get('sdt');
        const pass = urlParams.get('pass');
        const orderId = urlParams.get('id');

        // Nếu có truyền sdt và pass trên URL, thực hiện đăng nhập tự động (Deep Link)
        if (sdt && pass) {
            console.log('Phát hiện thông tin đăng nhập tự động...');
            try {
                await DVQTApp.login(sdt, pass); // Giả định API login hỗ trợ (sdt, pass)
            } catch (e) {
                console.error('Đăng nhập tự động thất bại:', e);
            }
        }

        const session = await DVQTApp.checkSession();
        if (!session || !session.logged_in) {
            const path = window.location.pathname;
            const idx = path.indexOf('/dich-vu/sua-chua/tho-nha/');
            const root = (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) ? window.DVQTApp.ROOT_URL : (idx !== -1 ? path.substring(0, idx) : path.split('/tho-nha/')[0]);
            if (!root && path.includes('/dichvuquanhta/')) {
                // Fallback cho local server
                const parts = path.split('/');
                const dvqtIdx = parts.indexOf('dichvuquanhta');
                if (dvqtIdx !== -1) root = '/' + parts.slice(1, dvqtIdx + 1).join('/');
            }
            // Nếu không có session, chuyển về trang logout hoặc login
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = root + '/public/dang-nhap.html?service=thonha&redirect=' + currentUrl;
            return;
        }

        _currentSession = session;
        window._dvqt_session_cache = session;

        // Lưu orderId vào global để các trang con (quan-ly-don) có thể tự mở
        if (orderId) {
            window._pendingOrderId = orderId;
        }

        const ids = String(session.id_dichvu || '0').split(',');
        const isThoNhaProvider = ids.includes('9') || (session.profile && session.profile.role === 'admin');

        if (isThoNhaProvider) {
            window.location.href = '../nhacungcap/trang-ca-nhan.html';
        }
    }
    document.addEventListener('DOMContentLoaded', async function () {
        // Chờ xác thực xong mới cho phép load trang con
        await verifySession();
        renderTopBar();

        const navBtns = document.querySelectorAll('#sidebarNav .nav-link[data-page]');
        const contentArea = document.getElementById('pageContent');
        let loadedPages = {};

        /**
         * Tải nội dung trang (partial) dựa trên ID.
         * @param {string} pageId - ID của trang (file name trong thư mục partials).
         */
        function loadPage(pageId) {
            navBtns.forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.querySelector(`.nav-link[data-page="${pageId}"]`);
            if (activeBtn) activeBtn.classList.add('active');

            // Xóa rác tĩnh của file HTML cũ nếu browser lưu cache
            if (Object.keys(loadedPages).length === 0) {
                if (contentArea) contentArea.innerHTML = '';
            }

            // Hide all pages
            Object.keys(loadedPages).forEach(id => {
                if (loadedPages[id]) loadedPages[id].style.display = 'none';
            });

            if (loadedPages[pageId]) {
                loadedPages[pageId].style.display = 'block';
                return; // already initialized
            }

            const wrapper = document.createElement('div');
            wrapper.innerHTML = '<div style="text-align:center; padding:50px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Đang tải dữ liệu...</div>';
            if (contentArea) contentArea.appendChild(wrapper);

            fetch(`${pageId}.html`)
                .then(res => {
                    if (!res.ok) throw new Error('Network error');
                    return res.text();
                })
                .then(html => {
                    wrapper.innerHTML = html;
                    loadedPages[pageId] = wrapper;
                    // Add script tag if exists in html, but here we run explicitly
                    setTimeout(() => {
                        initScripts(pageId, wrapper);
                    }, 50);
                })
                .catch(err => {
                    wrapper.innerHTML = `<div style="text-align:center; padding:50px; color:#dc2626;">Lỗi tải dữ liệu. Vui lòng thử lại.</div>`;
                });
        }

        /**
         * Khởi tạo các kịch bản JS đặc thù cho từng trang sau khi tải HTML.
         * @param {string} pageId - ID của trang.
         * @param {HTMLElement} wrapper - Container chứa nội dung trang.
         */
        function initScripts(pageId, wrapper) {
            if (pageId === 'quan-ly-don') {
                if (typeof window.initCustomerOrders === 'function') {
                    window.initCustomerOrders();
                } else {
                    console.log('Đang tải file xử lý đơn linh động...');
                    const script = document.createElement('script');
                    script.src = '../public/assets/js/customer/order-management.js?v=' + Date.now();
                    script.onload = () => {
                        window.initCustomerOrders();
                    };
                    document.body.appendChild(script);
                }
            }
            if (pageId === 'tai-khoan') {
                bindAccountInfo();
            }
        }

        function renderTopBar() {
            const profile = _currentSession;
            if (!profile) return;

            const nameEl = document.getElementById('accNameHead');
            if (nameEl) nameEl.textContent = profile.name || profile.hovaten || 'Khách hàng';

            const avatarEl = document.getElementById('accAvatarHead');
            if (avatarEl) {
                const avatarLink = profile.link_avatar || profile.avatar || profile.avatartenfile || '';
                if (avatarLink) {
                    const root = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : (window.location.pathname.includes('/tho-nha/') ? window.location.pathname.split('/tho-nha/')[0] : '');
                    let finalUrl = '';

                    if (avatarLink.startsWith('http')) {
                        finalUrl = avatarLink;
                    } else if (avatarLink.includes('/')) {
                        finalUrl = root + '/public/uploads/users/' + avatarLink;
                    } else {
                        // Google Drive ID format - Use direct image link instead of Iframe to avoid CSP issues
                        finalUrl = `https://lh3.googleusercontent.com/u/0/d/${avatarLink}`;
                    }
                    
                    avatarEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.parentElement.textContent='${(profile.name || 'K').charAt(0).toUpperCase()}'">`;
                } else {
                    avatarEl.textContent = (profile.name || 'K').charAt(0).toUpperCase();
                }
            }
        }

        /**
         * Đổ dữ liệu tài khoản từ Store vào các thành phần HTML của trang Tài khoản.
         */
        function bindAccountInfo() {
            const profile = _currentSession;
            if (profile) {
                const n = document.getElementById('accName');
                const p = document.getElementById('accPhone');
                const a = document.getElementById('accAddress');

                if (n) n.textContent = profile.name || profile.hovaten || 'Khách hàng';
                if (p) p.textContent = profile.phone || profile.sodienthoai || 'Chưa cập nhật';
                if (a) a.textContent = profile.address || (profile.profile ? profile.profile.address : 'Chưa cập nhật');
                
                renderTopBar();
            }
        }

        navBtns.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const pageId = this.getAttribute('data-page');
                if (pageId) loadPage(pageId);
            });
        });

        loadPage('quan-ly-don');
    });

    /**
     * Xử lý đăng xuất khách hàng: Sử dụng SweetAlert2 và đồng bộ với hệ thống.
     */
    window.logoutCustomer = function () {
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
                if (window.DVQTApp && window.DVQTApp.logout) {
                    window.DVQTApp.logout();
                } else {
                    localStorage.clear();
                }
                // Chuyển hướng về trang chủ dịch vụ
                window.location.href = '../index.html';
            }
        });
    };
})();
