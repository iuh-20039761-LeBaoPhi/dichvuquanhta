/**
 * shell.js – Hệ thống điều chuyển nội dung (Shell) cho Dashboard Thuê Xe.
 * Đồng bộ kiến trúc với dự án Thợ Nhà.
 */
(function() {
    'use strict';

    let _currentSession = null;
    // Tự động nhận diện ROOT từ URL hiện tại nếu không có DVQTApp.ROOT_URL
    const _getAutoRoot = () => {
        const path = window.location.pathname;
        const parts = path.split('/');
        // Giả định ROOT là phần tử thứ 1 (ví dụ /Test/thue-xe/... thì parts[1] là Test)
        return parts[1] ? '/' + parts[1] : '';
    };
    const ROOT = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : _getAutoRoot();

    /**
     * Xác thực phiên đăng nhập (Route Guard).
     * @param {string} requiredRole - Vai trò bắt buộc (customer/provider).
     */
    async function verifySession(requiredRole) {
        const session = await DVQTApp.checkSession();
        if (!session || !session.logged_in) {
            window.location.href = ROOT + '/public/dang-nhap.html?service=thuexe';
            return;
        }

        // Xác định vai trò THỰC TẾ đối với mảng Thuê Xe (Effective Role)
        const serviceIds = String(session.id_dichvu || '0').split(',');
        const isCarProvider = serviceIds.includes('10') || session.role === 'admin';
        const effectiveRole = isCarProvider ? 'provider' : 'customer';

        // Nếu trang hiện tại không khớp với vai trò thực tế, tiến hành điều chuyển
        if (requiredRole && effectiveRole !== requiredRole) {
            const target = effectiveRole === 'provider' ? 'provider/trang-ca-nhan.html' : 'customer/trang-ca-nhan.html';
            window.location.href = ROOT + '/thue-xe/views/pages/' + target;
            return;
        }

        _currentSession = session;
        window._dvqt_session_cache = session;
        return session;
    }

    /**
     * Tải nội dung partial.
     */
    function loadPage(pageId, navSelector, contentSelector, partialPath) {
        const navBtns = document.querySelectorAll(navSelector);
        const contentArea = document.getElementById(contentSelector);
        const partialDir = partialPath || 'partials/';

        navBtns.forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(navBtns).find(btn => btn.getAttribute('data-page') === pageId);
        if (activeBtn) activeBtn.classList.add('active');

        if (contentArea) {
            contentArea.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-3"></i><br>Đang tải dữ liệu...</div>';
            
            const url = `${partialDir}${pageId}.html?v=${Date.now()}`;
            console.log('Shell Loading:', url);

            fetch(url)
                .then(r => {
                    if(!r.ok) throw new Error(`HTTP Error ${r.status}: ${r.statusText}`);
                    return r.text();
                })
                .then(html => {
                    contentArea.innerHTML = html;
                    initPartialScripts(pageId, contentArea);
                })
                .catch((err) => {
                    console.error('Shell Load Error:', err);
                    contentArea.innerHTML = `
                        <div class="alert alert-danger mx-3 my-4">
                            <h6 class="fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Không thể tải nội dung</h6>
                            <p class="small mb-0">Trang: <code>${pageId}</code></p>
                            <p class="small mb-2">Đường dẫn: <code>${url}</code></p>
                            <hr>
                            <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">Thử lại</button>
                        </div>`;
                });
        }
    }

    /**
     * Khởi tạo script cho từng trang.
     */
    function initPartialScripts(pageId, container) {
        // 1. ÉP EXECUTE SCRIPTS (Cực kỳ quan trọng khi dùng innerHTML)
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // 2. Cập nhật tiêu đề trang
        const titleEl = document.getElementById('pageTitleDisplay');
        const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
        if (titleEl && activeBtn) {
            titleEl.textContent = activeBtn.textContent.trim();
        }

        // 3. Logic đặc thù cho từng trang
        if (pageId === 'tai-khoan') {
            bindAccountInfo();
        }
        
        // Kích hoạt lại các tooltip của Bootstrap
        if (window.bootstrap && window.bootstrap.Tooltip) {
            const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltips.forEach(t => new bootstrap.Tooltip(t));
        }
    }

    /**
     * Bind thông tin tài khoản (Dùng chung cho cả KH và NCC).
     */
    function bindAccountInfo() {
        const profile = _currentSession.profile || _currentSession;
        if (!profile) return;

        const fields = {
            'accName': profile.name || profile.hovaten,
            'accPhone': profile.phone || profile.sodienthoai,
            'accAddress': profile.address || profile.diachi,
            'accEmail': profile.email
        };

        for (let id in fields) {
            const el = document.getElementById(id);
            if (el) el.value = fields[id] || '';
        }

        // Avatar
        const avatarPrev = document.getElementById('acc-prev-avatar');
        if (avatarPrev && profile.avatartenfile) {
            avatarPrev.src = ROOT + '/public/uploads/users/' + profile.avatartenfile;
            avatarPrev.style.display = 'block';
            const ph = document.getElementById('acc-ph-avatar');
            if (ph) ph.style.display = 'none';
        }

        // Handle Logout
        const logoutBtn = document.getElementById('shellLogoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = handleLogout;
        }

        // Handle Save
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.onclick = handleSaveProfile;
        }
    }

    async function handleSaveProfile() {
        const btn = document.getElementById('saveProfileBtn');
        const msg = document.getElementById('saveMsg');
        if (!btn || !msg) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';

        try {
            const hovaten = document.getElementById('accName').value.trim();
            const diachi = document.getElementById('accAddress').value.trim();
            
            await DVQTKrud.updateRow('nguoidung', _currentSession.id, { hovaten, diachi });
            
            msg.innerHTML = '<span class="text-success small">Cập nhật thành công!</span>';
            // Refresh session
            _currentSession = await DVQTApp.checkSession();
        } catch (e) {
            msg.innerHTML = '<span class="text-danger small">Lỗi: ' + e.message + '</span>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
        }
    }

    async function handleLogout(e) {
        if(e) e.preventDefault();
        const confirm = await Swal.fire({
            title: 'Đăng xuất?',
            text: 'Bạn có chắc chắn muốn thoát?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Đăng xuất',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444'
        });

        if (confirm.isConfirmed) {
            await DVQTApp.logout();
            window.location.href = ROOT + '/index.html';
        }
    }

    // Export to global
    window.ThueXeShell = {
        init: async function(requiredRole, defaultPage) {
            const session = await verifySession(requiredRole);
            if (!session) return;

            // Bind topbar info — session may use 'name' or 'hovaten'
            const displayName = session.name || session.hovaten || session.username || 'Người dùng';
            const nameEl = document.getElementById('adminUsernameDisplay');
            if (nameEl) nameEl.textContent = displayName;
            const avatarEl = document.getElementById('userAvatar');
            if (avatarEl) avatarEl.textContent = (displayName || 'U').charAt(0).toUpperCase();

            // Display name on profile page header
            const profileNameEl = document.getElementById('displayProfileName');
            if (profileNameEl) profileNameEl.textContent = displayName;

            // Bind logout immediately (not just in tai-khoan tab)
            const logoutBtn = document.getElementById('shellLogoutBtn');
            if (logoutBtn) logoutBtn.onclick = handleLogout;

            // Setup nav
            const navSelector = '.nav-link[data-page]';
            document.querySelectorAll(navSelector).forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    loadPage(this.getAttribute('data-page'), navSelector, 'pageContent');
                });
            });

            loadPage(defaultPage || 'dashboard', navSelector, 'pageContent');
        },
        logout: handleLogout
    };

})();
