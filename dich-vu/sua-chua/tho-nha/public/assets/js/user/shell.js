(function () {
    'use strict';

    let _currentSession = null;
    let loadedPages = {};
    const contentArea = document.getElementById('pageContent');

    /**
     * Xác thực phiên đăng nhập (Route Guard).
     */
    async function verifySession() {
        const urlParams = new URLSearchParams(window.location.search);
        const sdt = urlParams.get('sdt');
        const pass = urlParams.get('pass');
        const orderId = urlParams.get('id');

        if (sdt && pass) {
            try { await DVQTApp.login(sdt, pass); } catch (e) { console.error('Auto login failed:', e); }
        }

        const session = await DVQTApp.checkSession();
        if (!session || !session.logged_in) {
            const root = (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) ? window.DVQTApp.ROOT_URL : (window.location.pathname.split('/tho-nha/')[0]);
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = root + '/public/dang-nhap.html?service=thonha&redirect=' + currentUrl;
            return null;
        }

        _currentSession = session;
        window._dvqt_session_cache = session;
        if (orderId) window._pendingOrderId = orderId;
        return session;
    }

    /**
     * Phân quyền hiển thị tính năng dựa trên id_dichvu=9.
     */
    function applyRoleVisibility(session) {
        if (!session) return;
        const ids = String(session.id_dichvu || '0').split(',');
        const isProvider = ids.includes('9') || (session.profile && session.profile.role === 'admin');
        const providerSection = document.getElementById('providerSection');
        if (providerSection) {
            providerSection.style.display = isProvider ? 'block' : 'none';
        }
    }

    window.initSidebarLogic = function() {
        const navLinks = document.querySelectorAll('#sidebarNav .nav-link[data-page]');
        if (navLinks.length === 0) return;

        navLinks.forEach(link => {
            link.onclick = function(e) {
                e.preventDefault();
                const pageId = this.getAttribute('data-page');
                if (pageId) loadPage(pageId);
                
                const sidebar = document.querySelector('.sidebar-shell');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar && window.innerWidth <= 1100) {
                    sidebar.classList.remove('show');
                    overlay.classList.remove('show');
                }
            };
        });

        // Load default page
        const defaultPage = (window._pendingOrderId) ? 'don-hang' : 'don-hang';
        loadPage(defaultPage);
        applyRoleVisibility(_currentSession);
    };

    function loadPage(pageId) {
        if (!contentArea) return;

        // Xóa placeholder "Đang khởi tạo ứng dụng" ở lần load đầu tiên
        const placeholder = contentArea.querySelector('div[style*="padding:100px"]');
        if (placeholder) placeholder.remove();

        // Bảo vệ trang dành riêng cho Nhà cung cấp
        if (pageId === 'don-nhan' || pageId === 'dich-vu-dang-ky') {
            const ids = String(_currentSession.id_dichvu || '0').split(',');
            if (!ids.includes('9')) {
                Swal.fire('Quyền truy cập', 'Bạn cần đăng ký dịch vụ để nhận đơn.', 'info');
                loadPage('don-hang');
                return;
            }
        }

        const navLinks = document.querySelectorAll('#sidebarNav .nav-link[data-page]');
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
        if (activeLink) activeLink.classList.add('active');

        const titles = { 'don-hang': 'Đơn hàng của tôi', 'don-nhan': 'Việc đang nhận', 'tai-khoan': 'Hồ sơ cá nhân', 'dich-vu-dang-ky': 'Dịch vụ đăng ký' };
        const titleEl = document.getElementById('pageTitleDisplay');
        if (titleEl) titleEl.textContent = titles[pageId] || 'Trang cá nhân';

        Object.keys(loadedPages).forEach(id => loadedPages[id].style.display = 'none');

        // Force reload: Xóa bản cũ nếu có để tải lại hoàn toàn
        if (loadedPages[pageId]) {
            loadedPages[pageId].remove();
            delete loadedPages[pageId];
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = '<div style="text-align:center; padding:50px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Đang tải dữ liệu...</div>';
        contentArea.appendChild(wrapper);

        fetch(`${pageId}.html`)
            .then(res => res.text())
            .then(html => {
                wrapper.innerHTML = html;
                loadedPages[pageId] = wrapper;
                setTimeout(() => initScripts(pageId, wrapper), 50);
            })
            .catch(() => {
                wrapper.innerHTML = `<div style="text-align:center; padding:50px; color:#dc2626;">Lỗi tải dữ liệu.</div>`;
            });
    }

    function initScripts(pageId, wrapper) {
        if (pageId === 'don-hang') {
            if (typeof window.initCustomerOrders === 'function') {
                window.initCustomerOrders();
            } else {
                const script = document.createElement('script');
                script.src = '../public/assets/js/customer/order-management.js?v=' + Date.now();
                script.onload = () => { window.initCustomerOrders(); };
                document.body.appendChild(script);
            }
        } else if (pageId === 'don-nhan') {
            if (typeof window.initProviderOrders === 'function') {
                window.initProviderOrders();
            } else {
                const script = document.createElement('script');
                script.src = '../public/assets/js/provider/order-management.js?v=' + Date.now();
                script.onload = () => { window.initProviderOrders(); };
                document.body.appendChild(script);
            }
        } else if (pageId === 'dich-vu-dang-ky') {
            if (typeof window.initCategoryManager === 'function') {
                window.initCategoryManager();
            } else {
                const script = document.createElement('script');
                script.src = '../public/assets/js/provider/category-manager.js?v=' + Date.now();
                script.onload = () => { window.initCategoryManager(); };
                document.body.appendChild(script);
            }
        } else if (pageId === 'tai-khoan') {
            bindAccountInfo();
        }
    }

    function renderTopBar() {
        const profile = _currentSession;
        if (!profile) return;
        const nameEl = document.getElementById('accNameHead');
        if (nameEl) nameEl.textContent = profile.name || profile.hovaten || 'Người dùng';
        const avatarEl = document.getElementById('accAvatarHead');
        if (avatarEl) {
            const avatarLink = profile.link_avatar || profile.avatar || profile.avatartenfile || '';
            if (avatarLink) {
                const root = (window.DVQTApp && window.DVQTApp.ROOT_URL) || '';
                const finalUrl = avatarLink.startsWith('http') ? avatarLink : (avatarLink.includes('/') ? root + '/public/uploads/users/' + avatarLink : `https://lh3.googleusercontent.com/u/0/d/${avatarLink}`);
                avatarEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.parentElement.textContent='${(profile.name || 'U').charAt(0).toUpperCase()}'">`;
            } else {
                avatarEl.textContent = (profile.name || 'U').charAt(0).toUpperCase();
            }
        }
    }

    function bindAccountInfo() {
        const profile = _currentSession;
        if (!profile) return;
        
        const ids = String(profile.id_dichvu || '0').split(',');
        const isProvider = ids.includes('9');

        const providerPart = document.getElementById('providerSpecificProfile');
        if (providerPart) providerPart.style.display = isProvider ? 'block' : 'none';

        const n = document.getElementById('accName');
        const p = document.getElementById('accPhone');
        const a = document.getElementById('accAddress');
        
        if (n) n.value = profile.name || profile.hovaten || '';
        if (p) p.textContent = profile.phone || profile.sodienthoai || 'Chưa cập nhật';
        if (a) a.value = profile.address || (profile.profile ? profile.profile.address : '');

        if (isProvider) {
            const images = [
                { id: 'avatar', url: profile.avatartenfile },
                { id: 'front', url: profile.cccdmattruoctenfile },
                { id: 'back', url: profile.cccdmatsautenfile }
            ];
            images.forEach(img => {
                const prev = document.getElementById('acc-prev-' + img.id);
                const ph = document.getElementById('acc-ph-' + img.id);
                if (img.url && prev && ph) {
                    prev.src = '../../../../public/uploads/providers/' + img.url;
                    prev.style.display = 'block'; ph.style.display = 'none';
                    prev.onerror = function() { this.src = '../public/assets/images/tho-nha-logo-thuong-hieu-cropped.jpg'; };
                }
            });

            document.querySelectorAll('.profile-upload-zone').forEach(zone => {
                zone.onclick = function() {
                    const input = this.querySelector('input[type="file"]');
                    if (input) input.click();
                };
            });
        }

        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) saveBtn.onclick = handleSaveProfile;
        renderTopBar();
    }

    async function handleSaveProfile() {
        const btn = document.getElementById('saveProfileBtn');
        const msg = document.getElementById('saveMsg');
        const profile = _currentSession;

        const newName = document.getElementById('accName').value.trim();
        const newAddress = document.getElementById('accAddress').value.trim();
        const newPass = document.getElementById('newPass').value;
        const oldPass = document.getElementById('oldPass').value;
        const confirmPass = document.getElementById('confirmNewPass').value;

        if (newPass && !oldPass) {
            msg.innerHTML = '<span class="text-danger small">Vui lòng nhập mật khẩu cũ để đổi mật khẩu.</span>';
            return;
        }
        if (newPass && newPass !== confirmPass) {
            msg.innerHTML = '<span class="text-danger small">Xác nhận mật khẩu không khớp.</span>';
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';

        try {
            const updateData = { hovaten: newName, diachi: newAddress };
            if (newPass) {
                const rows = await DVQTKrud.listTable('nguoidung');
                const record = rows.find(r => String(r.id) === String(profile.id));
                if (record.matkhau !== oldPass) throw new Error('Mật khẩu cũ không đúng.');
                updateData.matkhau = newPass;
            }

            const ids = String(profile.id_dichvu || '0').split(',');
            if (ids.includes('9')) {
                const fileFields = [
                    { id: 'acc-avatar', key: 'avatar', prefix: 'avatar' },
                    { id: 'acc-cccd-front', key: 'cccdmattruoc', prefix: 'cccd_front' },
                    { id: 'acc-cccd-back', key: 'cccdmatsau', prefix: 'cccd_back' }
                ];
                for (const f of fileFields) {
                    const input = document.getElementById(f.id);
                    if (input && input.files && input.files[0]) {
                        const file = input.files[0];
                        const ext = file.name.split('.').pop();
                        const targetName = `${f.prefix}_${profile.phone || profile.sodienthoai}.${ext}`;
                        await DVQTApp.uploadFile(file, targetName, 'providers'); 
                        updateData[f.key + 'tenfile'] = targetName;
                    }
                }
            }

            await DVQTKrud.updateRow('nguoidung', profile.id, updateData);
            msg.innerHTML = '<span class="text-success small">Đã cập nhật hồ sơ thành công!</span>';
            _currentSession = await DVQTApp.checkSession();
            renderTopBar();
        } catch (err) {
            msg.innerHTML = '<span class="text-danger small">Lỗi: ' + (err.message || 'Không thể lưu') + '</span>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Lưu hồ sơ';
        }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        const session = await verifySession();
        if (session) {
            renderTopBar();
            if (document.getElementById('sidebarNav')) {
                window.initSidebarLogic();
            }
        }
    });

    window.logoutUser = function () {
        Swal.fire({
            title: 'Đăng xuất?',
            text: 'Bạn có chắc muốn thoát không?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Đăng xuất',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                if (window.DVQTApp) window.DVQTApp.logout();
                else localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    };

    window.previewProfileImg = function (input, zoneId, prevId) {
        if (!input.files || !input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const prev = document.getElementById(prevId);
            const ph = document.getElementById('acc-ph-' + zoneId.split('-').pop());
            if (prev) { prev.src = e.target.result; prev.style.display = 'block'; }
            if (ph) ph.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    };

})();
