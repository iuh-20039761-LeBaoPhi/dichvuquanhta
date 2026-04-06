
(function() {
    'use strict';

    /**
     * Xác thực phiên đăng nhập của đối tác (Route Guard).
     * Kiểm tra trạng thái logged_in và vai trò provider từ server.
     */
    async function verifySession() {
        const session = await DVQTApp.checkSession();
        if (!session || !session.logged_in || (session.role !== 'provider' && session.role !== 'admin')) {
            window.location.href = 'dang-nhap.html';
        }
    }

    document.addEventListener('DOMContentLoaded', async function() {
        // Đợi xác thực xong mới thực hiện các bước khác
        await verifySession();

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
                if(loadedPages[id]) loadedPages[id].style.display = 'none';
            });

            if (loadedPages[pageId]) {
                loadedPages[pageId].style.display = 'block';
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.innerHTML = '<div style="text-align:center; padding:50px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Đang tải dữ liệu...</div>';
            if (contentArea) contentArea.appendChild(wrapper);

            fetch(`partials/${pageId}.html`)
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
                    script.src = '../../assets/js/provider/order-management.js?v=' + Date.now();
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

        // ── BIẾN TOÀN CỤC CHO MAP PICKER (PROVIDER PROFILE) ──
        let nccLat = null;
        let nccLng = null;
        window._bdTravelFromCoords = function(lat, lng) {
            nccLat = lat;
            nccLng = lng;
            console.log('Provider Profile GPS Captured:', lat, lng);
        };

        /**
         * Hiển thị thông tin tài khoản thợ/đối tác lên giao diện hồ sơ.
         */
        function bindAccountInfo() {
            const profile = window.ThoNhaOrderStore ? window.ThoNhaOrderStore.getProviderProfile() : null;
            if (!profile) return;

            // Nạp thông tin văn bản
            const n = document.getElementById('accName');
            const p = document.getElementById('accPhone');
            const c = document.getElementById('accCompany');
            const a = document.getElementById('accAddress'); // Địa chỉ đã được thêm vào HTML

            if(n) n.value = profile.name || '';
            if(p) p.value = profile.phone || '';
            if(c) c.value = profile.company || '';
            if(a) a.value = profile.address || '';

            // Nạp tọa độ hiện có (nếu có)
            nccLat = profile.maplat || null;
            nccLng = profile.maplng || null;

            // Nạp thông tin hình ảnh (xem trước)
            const images = [
                { id: 'avatar', url: profile.avatar },
                { id: 'front',  url: profile.cccd_front },
                { id: 'back',   url: profile.cccd_back }
            ];

            images.forEach(img => {
                const prev = document.getElementById('acc-prev-' + img.id);
                const ph = document.getElementById('acc-ph-' + img.id);
                if (img.url && prev && ph) {
                    prev.src = '../../uploads/providers/' + img.url;
                    prev.style.display = 'block';
                    ph.style.display = 'none';
                    prev.onerror = function() { this.src = '../../assets/images/placeholder-image.png'; };
                }
            });

            // --- KÍCH HOẠT CHỌN ẢNH (Vì script trong partial không tự chạy) ---
            document.querySelectorAll('.profile-upload-zone').forEach(zone => {
                zone.onclick = function() {
                    const input = this.querySelector('input[type="file"]');
                    if(input) input.click();
                };
            });

            // Đưa hàm preview lên toàn cục để onchange của HTML gọi được
            window.previewProfileImg = function(input, zoneId, prevId) {
                if (!input.files || !input.files[0]) return;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const prev = document.getElementById(prevId);
                    const ph = document.getElementById('acc-ph-' + zoneId.split('-').pop());
                    if(prev) {
                        prev.src = e.target.result;
                        prev.style.display = 'block';
                    }
                    if(ph) ph.style.display = 'none';
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

            const res = await fetch('../../api/public/upload.php', {
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
            const profile = window.ThoNhaOrderStore.getProviderProfile();
            
            const newName = document.getElementById('accName').value.trim();
            const newCompany = document.getElementById('accCompany').value.trim();
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
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang tải dữ liệu...';
            msg.innerHTML = '';

            try {
                const krud = window.DVQTKrud;
                if (!krud) throw new Error('Hệ thống chưa nạp thư viện cập nhật.');

                // Lấy bản ghi thợ hiện tại từ database
                const rows = await krud.listTable('nhacungcap_thonha');
                const currentRecord = rows.find(r => String(r.id) === String(profile.id));
                
                if (!currentRecord) throw new Error('Không tìm thấy bản ghi nhà cung cấp.');

                if (newPass) {
                    const storedPass = String(currentRecord.matkhau || '');
                    if (storedPass !== oldPass) {
                        throw new Error('Mật khẩu cũ không chính xác.');
                    }
                }

                const updateData = {
                    hovaten: newName,
                    tencua_hang: newCompany,
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

                for (const f of fileFields) {
                    const input = document.getElementById(f.id);
                    if (input && input.files && input.files[0]) {
                        const file = input.files[0];
                        const ext = file.name.split('.').pop();
                        const targetName = `${f.prefix}_${profile.phone}.${ext}`;
                        
                        // Bước quan trọng: Tải ảnh thật lên thư mục uploads
                        msg.innerHTML = `<span class="text-info small">Đang nạp ${f.prefix}...</span>`;
                        await uploadFile(file, targetName, 'providers');

                        // Cập nhật metadata vào database
                        updateData[f.key + 'tenfile'] = targetName;
                        updateData[f.key + 'kich_thuoc'] = file.size;
                        updateData[f.key + 'mime'] = file.type;
                    }
                }
                // ---------------------------
                
                await krud.updateRow('nhacungcap_thonha', profile.id, updateData);

                // --- ĐỒNG BỘ SESSION PHP (Rất quan trọng để hiển thị ảnh mới ngay lập tức) ---
                msg.innerHTML = '<span class="text-info small">Đang đồng bộ dữ liệu phiên...</span>';
                try {
                    await fetch('../../../public/api/auth/login-session.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            role:  'provider',
                            id:    profile.id,
                            name:  newName,
                            phone: profile.phone,
                            extra: {
                                company: newCompany,
                                address: newAddress,
                                danh_muc: currentRecord.danh_muc_thuc_hien,
                                maplat:  nccLat || currentRecord.maplat,
                                maplng:  nccLng || currentRecord.maplng,
                                avatartenfile:       updateData.avatartenfile || currentRecord.avatartenfile,
                                cccdmattruoctenfile: updateData.cccdmattruoctenfile || currentRecord.cccdmattruoctenfile,
                                cccdmatsautenfile:   updateData.cccdmatsautenfile || currentRecord.cccdmatsautenfile
                            }
                        })
                    });
                    // Refresh session cache lokal
                    if (window.DVQTApp) await window.DVQTApp.checkSession(true);
                } catch (e) {
                    console.warn('Lỗi đồng bộ session:', e);
                }
                // -----------------------------------------------------------------------------
                
                // Clear trường pass
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
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const pageId = this.getAttribute('data-page');
                if (pageId) loadPage(pageId);
            });
        });

        loadPage('quan-ly-don');
    });

    /**
     * Xử lý đăng xuất đối tác.
     */
    window.logoutProvider = function() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
            if (window.DVQTApp && window.DVQTApp.logout) {
                window.DVQTApp.logout().then(() => {
                    window.location.href = 'dang-nhap.html';
                });
            } else {
                localStorage.clear();
                window.location.href = 'dang-nhap.html';
            }
        }
    };
})();
