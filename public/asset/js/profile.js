/**
 * Profile Management Logic
 * Handles user info updates, service selection, and account deletion
 */

(async function () {
    const krud = window.DVQTKrud;
    const app = window.DVQTApp;
    let currentUser = null;
    let DYNAMIC_SERVICES = [];

    // Helper to map icons and colors based on service name
    function getSvcMeta(name) {
        const n = name.toLowerCase();
        if (n.includes('mẹ') || n.includes('bé')) return { icon: 'baby', color: '#ec4899' };
        if (n.includes('bệnh')) return { icon: 'hospital-user', color: '#ef4444' };
        if (n.includes('già')) return { icon: 'person-cane', color: '#f97316' };
        if (n.includes('vườn')) return { icon: 'leaf', color: '#22c55e' };
        if (n.includes('chuyển dọn')) return { icon: 'truck-loading', color: '#1b4332' }; 
        if (n.includes('vệ sinh') || n.includes('dọn')) return { icon: 'broom', color: '#14b8a6' };
        if (n.includes('lái xe')) return { icon: 'car', color: '#3b82f6' };
        if (n.includes('giao hàng')) return { icon: 'truck-fast', color: '#6366f1' };
        if (n.includes('sửa xe')) return { icon: 'motorcycle', color: '#8b5cf6' };
        if (n.includes('thợ')) return { icon: 'tools', color: '#11998e' };
        if (n.includes('thuê xe')) return { icon: 'key', color: '#0ea5e9' };
        if (n.includes('giặt')) return { icon: 'tshirt', color: '#f43f5e' };
        return { icon: 'concierge-bell', color: '#6b7280' };
    }

    // 2. INITIALIZATION
    async function init() {
        try {
            const session = await app.checkSession();
            if (!session || !session.logged_in) {
                const currentUrl = encodeURIComponent(window.location.href);
                window.location.href = `dang-nhap.html?service=profile&redirect=${currentUrl}`;
                return;
            }

            // Fetch live data from DB to ensure it's up to date
            const users = await krud.listTable('nguoidung', { limit: 1000 });
            currentUser = users.find(u => String(u.id) === String(session.id));

            if (!currentUser) throw new Error('Không tìm thấy tài khoản trong hệ thống.');

            // Fetch dynamic services from DB
            const svcData = await krud.listTable('dichvucungcap', { limit: 100 });
            
            // Homepage Sort Order Weights (priority mapping)
            const getWeight = (name) => {
                const n = name.toLowerCase();
                if (n.includes('mẹ') || n.includes('bé')) return 1;
                if (n.includes('già')) return 2;
                if (n.includes('bệnh')) return 3;
                if (n.includes('vệ sinh') || n.includes('dọn')) return 4;
                if (n.includes('vườn')) return 5;
                if (n.includes('giặt')) return 6;
                if (n.includes('giao hàng')) return 7;
                if (n.includes('chuyển dọn')) return 8;
                if (n.includes('thuê xe')) return 9;
                if (n.includes('lái xe')) return 10;
                if (n.includes('sửa xe')) return 11;
                if (n.includes('thợ')) return 12;
                return 99; // Default for others
            };

            DYNAMIC_SERVICES = (svcData || []).map(s => {
                const meta = getSvcMeta(s.dichvu);
                return {
                    id: String(s.id),
                    name: s.dichvu,
                    icon: meta.icon,
                    color: meta.color,
                    weight: getWeight(s.dichvu)
                };
            }).sort((a, b) => a.weight - b.weight);

            renderProfileHeader();
            renderInfoTab();
            renderServiceTab();
            setupEvents();

        } catch (err) {
            console.error('Profile Init Error:', err);
            Swal.fire('Lỗi', 'Không thể nạp thông tin cá nhân. Vui lòng thử lại.', 'error');
        }
    }

    // 3. RENDERING FUNCTIONS
    function renderProfileHeader() {
        const name = currentUser.hovaten || 'Thành viên';
        const initial = name.charAt(0).toUpperCase();

        // Top Bar
        document.getElementById('topName').textContent = name;
        
        const topAvatar = document.getElementById('topAvatar');
        const avatarLink = currentUser.link_avatar;
        if (avatarLink) {
            if (avatarLink.startsWith('http')) {
                topAvatar.innerHTML = `<img src="${avatarLink}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                // Trường hợp ID Drive: Dùng iframe preview để vượt qua chính sách localhost
                // Tăng scale và ẩn overflow để giấu các thanh công cụ của Drive preview
                topAvatar.innerHTML = `
                    <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:50%;">
                        <iframe src="https://drive.google.com/file/d/${avatarLink}/preview" 
                                frameborder="0" scrolling="no"
                                style="width: 300%; height: 300%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;"></iframe>
                    </div>`;
            }
        } else {
            topAvatar.textContent = initial;
            topAvatar.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
            topAvatar.style.color = '#fff';
            topAvatar.style.display = 'flex';
            topAvatar.style.alignItems = 'center';
            topAvatar.style.justifyContent = 'center';
            topAvatar.style.fontWeight = 'bold';
        }

        // Sidebar if any
        const sidebarName = document.getElementById('sidebarName');
        if (sidebarName) sidebarName.textContent = name;
    }

    function renderInfoTab() {
        const form = document.getElementById('formInfo');
        if (!form) return;
        form.hovaten.value = currentUser.hovaten || '';
        form.sodienthoai.value = currentUser.sodienthoai || '';
        form.email.value = currentUser.email || '';
        form.diachi.value = currentUser.diachi || '';
        
        // Load Current Address
        if (form.diachihientai) form.diachihientai.value = currentUser.diachihientai || '';
        if (document.getElementById('lat_hientai')) {
            const lat = currentUser.lat_hientai || '';
            const lng = currentUser.lng_hientai || '';
            document.getElementById('lat_hientai').value = lat;
            document.getElementById('lng_hientai').value = lng;
            if (document.getElementById('display_coords') && lat && lng) {
                document.getElementById('display_coords').value = `${lat}, ${lng}`;
            }
        }

        // Show existing images
        const avatarLink = currentUser.link_avatar;
        const cccdTruocLink = currentUser.link_cccd_truoc;
        const cccdSauLink = currentUser.link_cccd_sau;

        const renderDriveOrImg = (containerId, imgId, fileId) => {
            const container = document.getElementById(containerId);
            const imgEl = document.getElementById(imgId);
            if (!container || !imgEl) return;

            if (fileId && !fileId.startsWith('http')) {
                // Sử dụng phương pháp iframe preview phóng đại để giấu thanh công cụ
                container.innerHTML = `
                    <div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:inherit;">
                        <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                                frameborder="0" scrolling="no"
                                style="width: 180%; height: 180%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;"></iframe>
                        <a href="https://drive.google.com/file/d/${fileId}/view" target="_blank" class="cccd-overlay-link" style="display:block;"></a>
                    </div>
                `;
            } else if (fileId && fileId.startsWith('http')) {
                imgEl.src = fileId;
                imgEl.style.display = 'block';
                container.innerHTML = '';
                container.appendChild(imgEl);
            }
        };

        if (avatarLink) {
             renderDriveOrImg('avatarPreviewContainer', 'avatarImage', avatarLink);
        }
        
        if (cccdTruocLink) {
            renderDriveOrImg('previewTruocContainer', 'previewTruoc', cccdTruocLink);
            document.getElementById('previewTruocContainer').style.display = 'block';
        }

        if (cccdSauLink) {
            renderDriveOrImg('previewSauContainer', 'previewSau', cccdSauLink);
            document.getElementById('previewSauContainer').style.display = 'block';
        }

        // Fill coordinates
        if (currentUser.maplat && currentUser.maplng) {
            const lat = currentUser.maplat;
            const lng = currentUser.maplng;
            document.getElementById('reg_lat').value = lat;
            document.getElementById('reg_lng').value = lng;
            if (document.getElementById('display_reg_coords')) {
                document.getElementById('display_reg_coords').value = `${lat}, ${lng}`;
            }
        }

        // Initialize Work Status Toggle
        const toggle = document.getElementById('hoatdongToggle');
        const statusText = document.getElementById('statusText');
        if (toggle) {
            const isOnline = String(currentUser.hoatdong) === '1';
            toggle.checked = isOnline;
            if (statusText) {
                statusText.textContent = isOnline ? 'Online' : 'Offline';
            }
        }

        // Initialize Auto Accept Toggle (Only for Providers)
        const isProvider = String(currentUser.id_dichvu || '0') !== '0';
        const autoWrapper = document.getElementById('autoAcceptWrapper');
        const autoDivider = document.getElementById('autoAcceptDivider');
        if (isProvider && autoWrapper) {
            autoWrapper.style.display = 'block';
            if (autoDivider) autoDivider.style.display = 'block';
            const autoToggle = document.getElementById('autoAcceptToggle');
            const autoText = document.getElementById('autoAcceptText');
            if (autoToggle) {
                const isOnline = String(currentUser.hoatdong) === '1';
                const isAuto = String(currentUser.tudongnhandon) === '1' && isOnline; // Chỉ bật nếu online
                
                autoToggle.checked = isAuto;
                
                if (autoText) {
                    autoText.textContent = isAuto ? 'Tự nhận đơn: Bật' : 'Tự nhận đơn: Tắt';
                }
            }
        }
    }
    
    /**
     * Lấy vị trí GPS hiện tại và Reverse Geocode thành địa chỉ (openstreetmap)
     */
    window.getCurrentLocation = function() {
        const btn = document.querySelector('.btn-gps-live');
        const addrInput = document.getElementById('diachihientai');
        const latInput = document.getElementById('lat_hientai');
        const lngInput = document.getElementById('lng_hientai');

        if (!navigator.geolocation) {
            return Swal.fire('Lỗi', 'Trình duyệt không hỗ trợ định vị.', 'error');
        }

        const oldText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác vị...';

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            latInput.value = lat;
            lngInput.value = lng;
            
            // Cập nhật ô hiển thị gộp để copy 1 lần
            if (document.getElementById('display_coords')) {
                document.getElementById('display_coords').value = `${lat}, ${lng}`;
            }

            try {
                // Reverse Geocode dùng Nominatim
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                const data = await res.json();
                if (data && data.display_name) {
                    addrInput.value = data.display_name;
                    Swal.fire({
                        title: 'Đã xác định vị trí',
                        text: 'Địa chỉ hiện tại đã được cập nhật tự động.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            } catch (err) {
                console.warn('Geocode error:', err);
                Swal.fire('Thành công', 'Đã lấy được tọa độ, nhưng không thể dịch thành địa chỉ.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = oldText;
            }
        }, (err) => {
            console.error('GPS error:', err);
            btn.disabled = false;
            btn.innerHTML = oldText;
            Swal.fire('Lỗi', 'Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập vị trí.', 'error');
        }, { enableHighAccuracy: true });
    };

    function renderServiceTab() {
        const container = document.getElementById('serviceGrid');
        if (!container) return;
        const currentIds = String(currentUser.id_dichvu || '').split(',').filter(s => s.trim()).map(s => s.trim());
        
        container.innerHTML = DYNAMIC_SERVICES.map(svc => {
            const isSelected = currentIds.includes(svc.id);
            return `
                <div class="service-item ${isSelected ? 'selected' : ''}" data-id="${svc.id}" onclick="toggleService(this)">
                    <div class="check"><i class="fas fa-check-circle"></i></div>
                    <div class="icon"><i class="fas fa-${svc.icon}"></i></div>
                    <div class="fw-bold">${svc.name}</div>
                    <div class="small text-muted">${isSelected ? 'Đang phục vụ' : 'Chưa nhận'}</div>
                </div>`;
        }).join('');
    }

    /**
     * Sao chép tọa độ vào bộ nhớ tạm
     */
    window.handleCopyCoords = function(btn) {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input || !input.value) return;

        navigator.clipboard.writeText(input.value).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-success"></i>';
            
            // Hiện Toast thông báo
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'Đã sao chép tọa độ'
            });

            setTimeout(() => {
                btn.innerHTML = originalHtml;
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
            Swal.fire('Lỗi', 'Không thể sao chép. Vui lòng chọn và copy thủ công.', 'error');
        });
    };

    // 4. LOGIC FUNCTIONS
    window._bdTravelFromCoords = function(lat, lng) {
        const latEl = document.getElementById('reg_lat');
        const lngEl = document.getElementById('reg_lng');
        if (latEl) latEl.value = lat;
        if (lngEl) lngEl.value = lng;
        if (document.getElementById('display_reg_coords')) {
            document.getElementById('display_reg_coords').value = `${lat}, ${lng}`;
        }
    };

    window.toggleService = function (el) {
        el.classList.toggle('selected');
        const status = el.querySelector('.small');
        if (el.classList.contains('selected')) {
            status.textContent = 'Đang phục vụ';
        } else {
            status.textContent = 'Chưa nhận';
        }
    };

    function setupImagePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview) return;

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    function setupEvents() {
        // Gắn sự kiện copy (Event Delegation)
        document.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.btn-copy-coords');
            if (copyBtn) {
                e.preventDefault();
                handleCopyCoords(copyBtn);
            }
        });

        // Toggle Hoạt động
        const toggle = document.getElementById('hoatdongToggle');
        if (toggle) {
            toggle.addEventListener('change', async function() {
                const isOnline = this.checked;
                const statusValue = isOnline ? '1' : '0';
                const statusText = document.getElementById('statusText');
                
                // Cập nhật text ngay lập tức cho mượt
                if (statusText) {
                    statusText.textContent = isOnline ? 'Online' : 'Offline';
                }

                try {
                    await krud.updateRow('nguoidung', currentUser.id, { hoatdong: statusValue });
                    // Cập nhật biến local để không bị sync ngược khi render lại
                    currentUser.hoatdong = statusValue;

                    // Xử lý ràng buộc Tự nhận đơn
                    const autoToggle = document.getElementById('autoAcceptToggle');
                    const autoText = document.getElementById('autoAcceptText');
                    if (autoToggle) {
                        // autoToggle.disabled = !isOnline; // Remove disabled so we can click and show alert
                        if (!isOnline && autoToggle.checked) {
                            autoToggle.checked = false;
                            await krud.updateRow('nguoidung', currentUser.id, { tudongnhandon: '0' });
                            currentUser.tudongnhandon = '0';
                            if (autoText) {
                                autoText.textContent = 'Tự nhận đơn: Tắt';
                            }
                        } else if (isOnline && autoText) {
                            autoText.textContent = 'Tự nhận đơn: Tắt';
                        }
                    }
                } catch (err) {
                    console.error('Lỗi cập nhật trạng thái:', err);
                    Swal.fire('Lỗi', 'Không thể cập nhật trạng thái hoạt động.', 'error');
                    // Reset lại toggle nếu lỗi
                    this.checked = !isOnline;
                    if (statusText) {
                        statusText.textContent = !isOnline ? 'Online' : 'Offline';
                    }
                }
            });
        }

        // Toggle Tự động nhận đơn
        const autoToggle = document.getElementById('autoAcceptToggle');
        if (autoToggle) {
            autoToggle.addEventListener('change', async function() {
                // Kiểm tra ràng buộc Online
                const isOnline = String(currentUser.hoatdong) === '1';
                if (!isOnline) {
                    this.checked = false;
                    Swal.fire({
                        title: 'Thông báo',
                        text: 'Vui lòng chuyển trạng thái sang "Đang hoạt động" (Online) trước khi bật chế độ tự nhận đơn.',
                        icon: 'info',
                        confirmButtonText: 'Đã hiểu'
                    });
                    return;
                }

                const isAuto = this.checked;
                const statusValue = isAuto ? '1' : '0';
                const autoText = document.getElementById('autoAcceptText');

                if (autoText) {
                    autoText.textContent = isAuto ? 'Tự nhận đơn: Bật' : 'Tự nhận đơn: Tắt';
                }

                try {
                    await krud.updateRow('nguoidung', currentUser.id, { tudongnhandon: statusValue });
                    currentUser.tudongnhandon = statusValue;
                } catch (err) {
                    console.error('Lỗi cập nhật tự nhận đơn:', err);
                    Swal.fire('Lỗi', 'Không thể cập nhật cấu hình tự nhận đơn.', 'error');
                    this.checked = !isAuto;
                    if (autoText) {
                        autoText.textContent = !isAuto ? 'Tự nhận đơn: Bật' : 'Tự nhận đơn: Tắt';
                    }
                }
            });
        }

        // Click vào khung để bật toggle
        document.querySelectorAll('.status-item').forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function(e) {
                // Nếu click vào chính INPUT hoặc LABEL có thuộc tính "for"
                // thì để trình duyệt tự xử lý (tránh bị double click gây mất tác dụng)
                if (e.target.closest('input') || e.target.closest('label')) return;
                
                const input = this.querySelector('input[type="checkbox"]');
                if (input) {
                    input.click(); // Kích hoạt sự kiện change của input
                }
            });
        });

        // Setup Image Previews
        setupImagePreview('avatarUpload', 'avatarImage');
        setupImagePreview('cccdTruoc', 'previewTruoc');
        setupImagePreview('cccdSau', 'previewSau');
        // Save Personal Info
        document.getElementById('formInfo').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSaveInfo');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang lưu...';

            const payload = {
                hovaten: e.target.hovaten.value,
                email: e.target.email.value,
                diachi: e.target.diachi.value,
                maplat: document.getElementById('reg_lat').value || '',
                maplng: document.getElementById('reg_lng').value || '',
                diachihientai: e.target.diachihientai ? e.target.diachihientai.value : (currentUser.diachihientai || ''),
                lat_hientai: document.getElementById('lat_hientai') ? document.getElementById('lat_hientai').value : (currentUser.lat_hientai || ''),
                lng_hientai: document.getElementById('lng_hientai') ? document.getElementById('lng_hientai').value : (currentUser.lng_hientai || '')
            };

            // Image Upload Handling
            try {
                const avatarFile = document.getElementById('avatarUpload').files[0];
                const cccdTruocFile = document.getElementById('cccdTruoc').files[0];
                const cccdSauFile = document.getElementById('cccdSau').files[0];

                if (avatarFile) {
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang tải lên ảnh đại diện...';
                    const up = await app.uploadFile(avatarFile);
                    if (up.success) payload.link_avatar = up.fileId;
                }

                if (cccdTruocFile) {
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang tải lên CCCD (mặt trước)...';
                    const up = await app.uploadFile(cccdTruocFile);
                    if (up.success) payload.link_cccd_truoc = up.fileId;
                }

                if (cccdSauFile) {
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang tải lên CCCD (mặt sau)...';
                    const up = await app.uploadFile(cccdSauFile);
                    if (up.success) payload.link_cccd_sau = up.fileId;
                }
            } catch (uploadErr) {
                console.warn('Image upload failed but continuing with info update:', uploadErr);
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang lưu thông tin cá nhân...';
            const res = await krud.updateRow('nguoidung', currentUser.id, payload);
            if (res) {
                Swal.fire('Thành công', 'Thông tin cá nhân đã được cập nhật.', 'success').then(() => {
                    location.reload();
                });
            } else {
                Swal.fire('Lỗi', 'Không thể cập nhật thông tin.', 'error');
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-1"></i> Lưu thay đổi';
        };

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = async function() {
                const confirm = await Swal.fire({
                    title: 'Đăng xuất?',
                    text: 'Bạn có chắc chắn muốn thoát khỏi hệ thống?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Đồng ý',
                    cancelButtonText: 'Để sau'
                });
                
                if (confirm.isConfirmed) {
                    await app.logout();
                    
                    const urlParams = new URLSearchParams(window.location.search);
                    const service = urlParams.get('service');
                    let target = '../index.html';
                    
                    if (service === 'thonha') {
                        target = '../dich-vu/sua-chua/tho-nha/index.html';
                    } else if (service === 'thuexe') {
                        target = '../dich-vu/van-tai-logistics/thue-xe/index.html';
                    }
                    
                    window.location.href = target;
                }
            };
        }

        // Save Services
        document.getElementById('btnSaveServices').onclick = async function () {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang xử lý...';

            // Lấy tất cả các item có class 'selected' nằm trong #serviceGrid
            const grid = document.getElementById('serviceGrid');
            const selectedItems = grid ? grid.querySelectorAll('.service-item.selected') : [];
            
            const selectedIds = Array.from(selectedItems)
                .map(el => el.getAttribute('data-id'))
                .filter(id => id); // Loại bỏ các giá trị null/undefined nếu có
            
            // Nếu không chọn dịch vụ nào, mặc định là '0' (Khách hàng)
            const idDichvuStr = selectedIds.length > 0 
                ? selectedIds.sort((a,b) => Number(a) - Number(b)).join(',') 
                : '0';
            
            const payload = {
                id_dichvu: idDichvuStr
            };

            const res = await krud.updateRow('nguoidung', currentUser.id, payload);
            if (res) {
                Swal.fire({
                    title: 'Đã cập nhật!',
                    text: 'Danh sách dịch vụ cung cấp của bạn đã thay đổi.',
                    icon: 'success'
                }).then(() => location.reload());
            } else {
                Swal.fire('Lỗi', 'Không thể cập nhật dịch vụ.', 'error');
            }
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-check-circle me-1"></i> Cập nhật dịch vụ';
        };

        // Delete Account
        document.getElementById('btnDeleteAccount').onclick = async function () {
            const { value: confirmPhone } = await Swal.fire({
                title: 'Xác nhận xóa tài khoản',
                html: `<div class="text-start">Hành động này <b>không thể hoàn tác</b>. Vui lòng nhập số điện thoại <b>${currentUser.sodienthoai}</b> để xác nhận xóa.</div>`,
                input: 'text',
                inputPlaceholder: 'Nhập SĐT của bạn...',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Xóa vĩnh viễn',
                cancelButtonText: 'Hủy nút',
                inputValidator: (value) => {
                    if (value !== currentUser.sodienthoai) {
                        return 'Số điện thoại không khớp!';
                    }
                }
            });

            if (confirmPhone) {
                Swal.fire({
                    title: 'Đang xóa...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const res = await krud.deleteRow('nguoidung', currentUser.id);
                    if (res) {
                        await app.logout();
                        await Swal.fire('Đã xóa', 'Tài khoản của bạn đã được xóa hoàn toàn.', 'success');
                        window.location.href = '../index.html';
                    } else {
                        throw new Error('Xóa thất bại');
                    }
                } catch (err) {
                    Swal.fire('Lỗi', 'Không thể xóa tài khoản lúc này. Vui lòng liên hệ Admin.', 'error');
                }
            }
        };
    }

    window.triggerChangePass = function() {
        Swal.fire({
            title: 'Đổi mật khẩu',
            html: `
                <input type="password" id="oldPass" class="swal2-input" placeholder="Mật khẩu cũ">
                <input type="password" id="newPass" class="swal2-input" placeholder="Mật khẩu mới">
                <input type="password" id="confirmPass" class="swal2-input" placeholder="Xác nhận mật khẩu mới">
            `,
            confirmButtonText: 'Cập nhật',
            focusConfirm: false,
            preConfirm: () => {
                const old = document.getElementById('oldPass').value;
                const n = document.getElementById('newPass').value;
                const c = document.getElementById('confirmPass').value;

                if (!old || !n || !c) return Swal.showValidationMessage('Vui lòng nhập đầy đủ!');
                if (old !== currentUser.matkhau) return Swal.showValidationMessage('Mật khẩu cũ không đúng!');
                if (n !== c) return Swal.showValidationMessage('Mật khẩu mới không khớp!');
                if (n.length < 6) return Swal.showValidationMessage('Mật khẩu mới ít nhất 6 ký tự!');
                return { newPass: n };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await krud.updateRow('nguoidung', currentUser.id, { matkhau: result.value.newPass });
                if (res) Swal.fire('Thành công', 'Mật khẩu đã được thay đổi!', 'success');
            }
        });
    };

    init();
})();
