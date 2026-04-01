
(function () {
    'use strict';

    /**
     * Xác thực phiên đăng nhập của khách hàng (Route Guard).
     * Kiểm tra cả LocalStorage và Server Session (PHP).
     */
    function verifySession() {
        var isLocalValid = localStorage.getItem('customer_logged_in') === 'true' || localStorage.getItem('thonha_customer_profile_v1');
        if (!isLocalValid) {
            window.location.href = 'dang-nhap.html';
            return;
        }
        
        fetch('../../api/public/check-session.php', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (!data.logged_in || data.role !== 'customer') {
                    var keys = [
                        'customer_logged_in', 'customer_name', 'thonha_customer_profile_v1', 'tho_nha_customer_profile'
                    ];
                    keys.forEach(k => localStorage.removeItem(k));
                    window.location.href = 'dang-nhap.html';
                }
            }).catch(() => {});
    }
    verifySession();

    document.addEventListener('DOMContentLoaded', function () {
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
                contentArea.innerHTML = '';
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
            contentArea.appendChild(wrapper);

            fetch(`partials/${pageId}.html`)
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
                    script.src = '../../assets/js/customer/order-management.js?v=' + Date.now();
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

        /**
         * Đổ dữ liệu tài khoản từ Store vào các thành phần HTML của trang Tài khoản.
         */
        function bindAccountInfo() {
            const profile = window.ThoNhaOrderStore ? window.ThoNhaOrderStore.getCustomerProfile() : null;
            if (profile) {
                const n = document.getElementById('accName');
                const p = document.getElementById('accPhone');
                const a = document.getElementById('accAddress');
                if (n) n.textContent = profile.name || 'Khách hàng';
                if (p) p.textContent = profile.phone || 'Chưa cập nhật';
                if (a) a.textContent = profile.address || 'Chưa cập nhật';
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
     * Xử lý đăng xuất khách hàng: Xóa LocalStorage và xóa Session PHP.
     */
    window.logoutCustomer = function () {
        if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
            var keys = [
                'customer_logged_in', 'customer_name', 'thonha_customer_profile_v1', 'tho_nha_customer_profile',
                'provider_logged_in', 'provider_name', 'provider_company', 'thonha_provider_profile_v1', 'tho_nha_provider_profile',
                'admin_logged_in', 'admin_username'
            ];
            keys.forEach(function(k) { localStorage.removeItem(k); });
            fetch('../../api/customer/auth/logout.php', { method: 'POST' }).then(() => {
                window.location.href = '../public/dich-vu.html';
            }).catch(() => {
                window.location.href = '../public/dich-vu.html';
            });
        }
    };
})();
