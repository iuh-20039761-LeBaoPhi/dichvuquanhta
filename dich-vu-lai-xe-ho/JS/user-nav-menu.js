/**
 * Xử lý menu đăng nhập/đăng xuất
 */
(function() {
    function updateUserMenu() {
        const currentUser = localStorage.getItem('currentUser');
        const loginNavItem = document.getElementById('loginNavItem');
        const userMenuContainer = document.getElementById('userMenuContainer');
        const navUserName = document.getElementById('navUserName');

        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                if (loginNavItem) loginNavItem.classList.add('d-none');
                if (userMenuContainer) userMenuContainer.classList.remove('d-none');
                if (navUserName && user.ten) navUserName.textContent = user.ten;
            } catch (e) {
                console.error('Lỗi parse user:', e);
            }
        } else {
            if (loginNavItem) loginNavItem.classList.remove('d-none');
            if (userMenuContainer) userMenuContainer.classList.add('d-none');
        }
    }

    // Xử lý đăng xuất
    function setupLogout() {
        const logoutBtn = document.querySelector('#userMenuContainer .dropdown-item.text-danger');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('currentUser');
                localStorage.removeItem('customer_logged_in');
                localStorage.removeItem('customer_name');
                window.location.href = 'index.html';
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        updateUserMenu();
        setupLogout();
    });

    // Lắng nghe sự kiện đăng nhập thành công
    window.addEventListener('auth:login-success', function() {
        updateUserMenu();
    });
})();