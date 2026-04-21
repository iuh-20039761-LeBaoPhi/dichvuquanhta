
(function () {
    'use strict';

    let _currentSession = null;

    /**
     * Xác thực phiên đăng nhập của đối tác (Route Guard).
     * Kiểm tra trạng thái logged_in và vai trò provider từ server.
     */
    async function verifySession() {
        const session = await DVQTApp.checkSession();
        if (!session || !session.logged_in) {
            const path = window.location.pathname;
            const idx = path.indexOf('/dich-vu/sua-chua/tho-nha/');
            const root = (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) ? window.DVQTApp.ROOT_URL : (idx !== -1 ? path.substring(0, idx) : path.split('/tho-nha/')[0]);
            if (!root && path.includes('/dichvuquanhta/')) {
                const parts = path.split('/');
                const dvqtIdx = parts.indexOf('dichvuquanhta');
                if (dvqtIdx !== -1) root = '/' + parts.slice(1, dvqtIdx + 1).join('/');
            }
            window.location.href = root + '/public/dang-nhap.html?service=thonha';
            return;
        }

        _currentSession = session;
        window._dvqt_session_cache = session;

        const ids = String(session.id_dichvu || '0').split(',');
        const isThoNhaProvider = ids.includes('9') || (session.profile && session.profile.role === 'admin');

        if (!isThoNhaProvider) {
            // Nếu không phải thợ nhà thì chuyển sang trang Khách hàng
            window.location.href = '../khachhang/trang-ca-nhan.html';
        }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        // Đợi xác thực xong mới thực hiện các bước khác
        await verifySession();
        renderTopBar();

        const navBtns = document.querySelectorAll('#sidebarNav .nav-link[data-page]');
        const contentArea = document.getElementById('pageContent');
        let loadedPages = {};

        /**
         * Tải nội dung trang (partial) dựa trên ID trang.
         * @param {string} pageId - ID trang cần tải.
         */
        function loadPage(pageId) {
            navBtns.forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.querySelector(`.nav-link[data-page="${pageId}"]`);
            if (activeBtn) activeBtn.classList.add('active');

            if (Object.keys(loadedPages).length === 0) {
                if (contentArea) contentArea.innerHTML = '';
            }

            Object.keys(loadedPages).forEach(id => {
                if (loadedPages[id]) loadedPages[id].style.display = 'none';
            });

            if (loadedPages[pageId]) {
                loadedPages[pageId].style.display = 'block';
                return;
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
                    setTimeout(() => {
                        initScripts(pageId, wrapper);
                    }, 50);
                })
                .catch(err => {
                    wrapper.innerHTML = `<div style="text-align:center; padding:50px; color:#dc2626;">Lỗi tải dữ liệu. Vui lòng thử lại.</div>`;
                });
        }

        /**
         * Khởi tạo các đoạn mã JS khi một trang được tải vào vùng nội dung.
         * @param {string} pageId - ID trang.
         * @param {HTMLElement} wrapper - Container của trang.
         */
        function initScripts(pageId, wrapper) {
            if (pageId === 'quan-ly-don') {
                if (typeof window.initProviderOrders === 'function') {
                    window.initProviderOrders();
                } else {
                    console.log('Đang tải file xử lý công việc linh động...');
                    const script = document.createElement('script');
                    script.src = '../public/assets/js/provider/order-management.js?v=' + Date.now();
                    script.onload = () => {
                        window.initProviderOrders();
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

            const nameEl = document.getElementById('adminUsernameDisplay');
            if (nameEl) nameEl.textContent = profile.name || profile.hovaten || 'Đối tác';

            const avatarEl = document.getElementById('userAvatar');
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
                        // Google Drive ID format - Bypass Iframe CSP restrictions
                        finalUrl = `https://lh3.googleusercontent.com/u/0/d/${avatarLink}`;
                    }

                    avatarEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.parentElement.textContent='${(profile.name || 'D').charAt(0).toUpperCase()}'">`;
                } else {
                    avatarEl.textContent = (profile.name || 'D').charAt(0).toUpperCase();
                }
            }
        }

        // ── BIẾN TOÀN CỤC CHO MAP PICKER (PROVIDER PROFILE) ──
        let nccLat = null;
        let nccLng = null;
        window._bdTravelFromCoords = function (lat, lng) {
            nccLat = lat;
            nccLng = lng;
            console.log('Provider Profile GPS Captured:', lat, lng);
        };

        /**
         * Hiển thị thông tin tài khoản thợ/đối tác lên giao diện hồ sơ.
         */
        function bindAccountInfo() {
            const profile = _currentSession.profile || _currentSession;
            if (!profile) return;

            // Nạp thông tin văn bản
            const n = document.getElementById('accName');
            const p = document.getElementById('accPhone');
            const a = document.getElementById('accAddress');

            if (n) n.value = profile.name || profile.hovaten || '';
            if (p) p.value = profile.phone || profile.sodienthoai || '';
            if (a) a.value = profile.address || profile.diachi || '';

            // Nạp tọa độ hiện có
            nccLat = profile.maplat || null;
            nccLng = profile.maplng || null;

            // Nạp thông tin hình ảnh
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
                    prev.style.display = 'block';
                    ph.style.display = 'none';
                    prev.onerror = function () { this.src = '../public/assets/images/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg'; };
                }
            });

            renderTopBar();

            // --- KÍCH HOẠT CHỌN ẢNH (Vì script trong partial không tự chạy) ---
            document.querySelectorAll('.profile-upload-zone').forEach(zone => {
                zone.onclick = function () {
                    const input = this.querySelector('input[type="file"]');
                    if (input) input.click();
                };
            });

            // Đưa hàm preview lên toàn cục để onchange của HTML gọi được
            window.previewProfileImg = function (input, zoneId, prevId) {
                if (!input.files || !input.files[0]) return;
                const reader = new FileReader();
                reader.onload = function (e) {
                    const prev = document.getElementById(prevId);
                    const ph = document.getElementById('acc-ph-' + zoneId.split('-').pop());
                    if (prev) {
                        prev.src = e.target.result;
                        prev.style.display = 'block';
                    }
                    if (ph) ph.style.display = 'none';
                };
                reader.readAsDataURL(input.files[0]);
            };

            // Ràng buộc nút lưu
            const saveBtn = document.getElementById('saveProfileBtn');
            if (saveBtn) {
                saveBtn.onclick = handleSaveProfile;
            }
        }

        /**
         * Helper: Tải tệp vật lý lên server
         */
        async function uploadFile(file, newName, folder = 'providers') {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', newName); // Tên đích
            formData.append('folder', folder);

            const res = await fetch('../../../../public/api/public/upload.php', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (!result.success) {
                throw new Error(result.message || 'Lỗi tải tệp lên server');
            }
            return result;
        }

        /**
         * Xử lý lưu thông tin hồ sơ mới
         */
        async function handleSaveProfile() {
            const btn = document.getElementById('saveProfileBtn');
            const msg = document.getElementById('saveMsg');
            const profile = _currentSession.profile || _currentSession;

            const newName = document.getElementById('accName').value.trim();
            const newAddress = document.getElementById('accAddress').value.trim();
            const oldPass = document.getElementById('oldPass').value;
            const newPass = document.getElementById('newPass').value;
            const confirmPass = document.getElementById('confirmNewPass').value;

            if (newPass && !oldPass) {
                msg.innerHTML = '<span class="text-danger small">Vui lòng nhập mật khẩu cũ để đổi mật khẩu mới.</span>';
                return;
            }

            if (newPass && newPass !== confirmPass) {
                msg.innerHTML = '<span class="text-danger small">Mật khẩu xác nhận không khớp.</span>';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
            msg.innerHTML = '';

            try {
                const krud = window.DVQTKrud;
                if (!krud) throw new Error('Hệ thống chưa nạp thư viện cập nhật.');

                // Lấy bản ghi thợ hiện tại từ database bảng nguoidung
                const rows = await krud.listTable('nguoidung');
                const pId = profile.id || profile.user_id;
                const currentRecord = rows.find(r => String(r.id) === String(pId));

                if (!currentRecord) throw new Error('Không tìm thấy bản ghi người dùng.');

                if (newPass) {
                    const storedPass = String(currentRecord.matkhau || '');
                    if (storedPass !== oldPass) throw new Error('Mật khẩu cũ không chính xác.');
                }

                const updateData = {
                    hovaten: newName,
                    diachi: newAddress,
                    maplat: nccLat,
                    maplng: nccLng
                };

                if (newPass) updateData.matkhau = newPass;

                // --- XỬ LÝ TẢI ẢNH VẬT LÝ ---
                const fileFields = [
                    { id: 'acc-avatar', key: 'avatar', prefix: 'avatar' },
                    { id: 'acc-cccd-front', key: 'cccdmattruoc', prefix: 'cccd_front' },
                    { id: 'acc-cccd-back', key: 'cccdmatsau', prefix: 'cccd_back' }
                ];

                const phoneVal = profile.phone || profile.sodienthoai;
                for (const f of fileFields) {
                    const input = document.getElementById(f.id);
                    if (input && input.files && input.files[0]) {
                        const file = input.files[0];
                        const ext = file.name.split('.').pop();
                        const targetName = `${f.prefix}_${phoneVal}.${ext}`;

                        msg.innerHTML = `<span class="text-info small">Đang nạp ${f.prefix}...</span>`;
                        await uploadFile(file, targetName, 'providers');

                        updateData[f.key + 'tenfile'] = targetName;
                    }
                }

                await krud.updateRow('nguoidung', pId, updateData);

                await krud.updateRow('nguoidung', pId, updateData);

                msg.innerHTML = '<span class="text-success small">Hồ sơ đã được cập nhật thành công!</span>';

                // Làm mới cache phiên (lấy lại dữ liệu mới từ DB qua Cookie)
                if (window.DVQTApp) {
                    _currentSession = await window.DVQTApp.checkSession();
                }

                // Xóa trường pass mờ sau khi đổi
                if (document.getElementById('oldPass')) document.getElementById('oldPass').value = '';
                if (document.getElementById('newPass')) document.getElementById('newPass').value = '';
                if (document.getElementById('confirmNewPass')) document.getElementById('confirmNewPass').value = '';

            } catch (err) {
                msg.innerHTML = '<span class="text-danger small">Lỗi: ' + (err.message || 'Không thể lưu hồ sơ') + '</span>';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Lưu thay đổi hồ sơ';
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
     * Xử lý đăng xuất đối tác: Sử dụng SweetAlert2 và đồng bộ hệ thống.
     */
    window.logoutProvider = function () {
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
                // Chuyển hướng ngay lập tức
                const root = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : (window.location.pathname.includes('/tho-nha/') ? window.location.pathname.split('/tho-nha/')[0] : '');
                window.location.href = root + '/tho-nha/index.html';
            }
        });
    };
})();
