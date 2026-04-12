/**
 * Profile Management Logic
 * Handles user info updates, service selection, and account deletion
 */

(async function () {
    const krud = window.DVQTKrud;
    const app = window.DVQTApp;
    let currentUser = null;

    // 1. SERVICES CONFIGURATION (Synced with registration.js)
    const SERVICES = [
        { id: '1',  name: 'Mẹ & Bé',        icon: 'baby',           color: '#ec4899' },
        { id: '2',  name: 'Người bệnh',     icon: 'hospital-user',  color: '#ef4444' },
        { id: '3',  name: 'Người già',      icon: 'person-cane',    color: '#f97316' },
        { id: '4',  name: 'Làm vườn',        icon: 'leaf',           color: '#22c55e' },
        { id: '5',  name: 'Vệ sinh',        icon: 'broom',          color: '#14b8a6' },
        { id: '6',  name: 'Lái xe hộ',      icon: 'car',            color: '#3b82f6' },
        { id: '7',  name: 'Giao hàng',      icon: 'truck-fast',     color: '#6366f1' },
        { id: '8',  name: 'Sửa xe',         icon: 'motorcycle',     color: '#8b5cf6' },
        { id: '9',  name: 'Thợ nhà',        icon: 'tools',          color: '#11998e' },
        { id: '10', name: 'Thuê xe',        icon: 'key',            color: '#0ea5e9' },
        { id: '11', name: 'Giặt ủi',        icon: 'tshirt',         color: '#f43f5e' }
    ];

    // 2. INITIALIZATION
    async function init() {
        try {
            const session = await app.checkSession();
            if (!session || !session.logged_in) {
                window.location.href = 'dang-nhap.html?service=profile';
                return;
            }

            // Fetch live data from DB to ensure it's up to date
            const users = await krud.listTable('nguoidung', { limit: 1000 });
            currentUser = users.find(u => String(u.id) === String(session.id));

            if (!currentUser) throw new Error('Không tìm thấy tài khoản trong hệ thống.');

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
        document.getElementById('topAvatar').textContent = initial;

        // Sidebar if any (not used in current HTML but good for consistency)
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

        // Fill coordinates
        if (currentUser.maplat && currentUser.maplng) {
            document.getElementById('reg_lat').value = currentUser.maplat;
            document.getElementById('reg_lng').value = currentUser.maplng;
        }
    }

    function renderServiceTab() {
        const container = document.getElementById('serviceGrid');
        if (!container) return;
        const currentIds = String(currentUser.id_dichvu || '').split(',').filter(s => s.trim()).map(s => s.trim());
        
        container.innerHTML = SERVICES.map(svc => {
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

    // 4. LOGIC FUNCTIONS
    window._bdTravelFromCoords = function(lat, lng) {
        const latEl = document.getElementById('reg_lat');
        const lngEl = document.getElementById('reg_lng');
        if (latEl) latEl.value = lat;
        if (lngEl) lngEl.value = lng;
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

    function setupEvents() {
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
                maplng: document.getElementById('reg_lng').value || ''
            };

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
                    window.location.href = '../index.html';
                }
            };
        }

        // Save Services
        document.getElementById('btnSaveServices').onclick = async function () {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang xử lý...';

            const selectedIds = Array.from(document.querySelectorAll('.service-card.selected'))
                .map(el => el.dataset.id);
            
            const payload = {
                id_dichvu: selectedIds.join(',')
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
