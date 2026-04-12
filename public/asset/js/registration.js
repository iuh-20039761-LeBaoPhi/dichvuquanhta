/**
 * registration.js – Đăng ký tài khoản dùng chung cho Dịch Vụ Quanh Ta.
 * Lưu tất cả vào 1 bảng duy nhất: nguoidung
 * Cột id_dichvu: 0 = Khách hàng, "1,2,3..." = Chuỗi ID dịch vụ cách nhau bởi dấu phẩy.
 */
'use strict';

/* ================================================================
   CẤU HÌNH DỊCH VỤ – id_dichvu tương ứng từ 1 đến 11
   ================================================================ */
const REG_SERVICES = [
    { id: 1,  key: 'mevabe',        name: 'Chăm sóc mẹ và bé',   icon: 'fas fa-baby',          color: '#ec4899' },
    { id: 2,  key: 'nguoibenh',     name: 'Chăm sóc người bệnh',  icon: 'fas fa-hospital-user', color: '#ef4444' },
    { id: 3,  key: 'nguoigia',      name: 'Chăm sóc người già',    icon: 'fas fa-person-cane',   color: '#f97316' },
    { id: 4,  key: 'vuonnha',       name: 'Làm vườn',              icon: 'fas fa-leaf',          color: '#22c55e' },
    { id: 5,  key: 'donvesinh',     name: 'Dọn vệ sinh',           icon: 'fas fa-broom',         color: '#14b8a6' },
    { id: 6,  key: 'laixeho',       name: 'Lái xe hộ',             icon: 'fas fa-car',           color: '#3b82f6' },
    { id: 7,  key: 'giaohangnhanh', name: 'Giao hàng nhanh',       icon: 'fas fa-truck-fast',    color: '#6366f1' },
    { id: 8,  key: 'suaxe',         name: 'Sửa xe',                icon: 'fas fa-motorcycle',    color: '#8b5cf6' },
    { id: 9,  key: 'thonha',        name: 'Thợ nhà',               icon: 'fas fa-tools',         color: '#11998e' },
    { id: 10, key: 'thuexe',        name: 'Thuê xe',               icon: 'fas fa-key',           color: '#0ea5e9' },
    { id: 11, key: 'giatuinhanh',   name: 'Giặt ủi nhanh',        icon: 'fas fa-tshirt',        color: '#f43f5e' },
];

let _selectedServiceIds = new Set(); // Chứa các ID dịch vụ đã chọn

/* ================================================================
   TOGGLE SERVICES PANEL
   ================================================================ */
function toggleServices() {
    const btn = document.getElementById('svcToggleBtn');
    const panel = document.getElementById('svcCollapse');
    const isOpen = panel.classList.contains('open');

    if (isOpen) {
        panel.classList.remove('open');
        btn.classList.remove('open');
    } else {
        panel.classList.add('open');
        btn.classList.add('open');
    }
}

/* ================================================================
   RENDER SERVICE GRID – Cho phép chọn nhiều dịch vụ
   ================================================================ */
function renderServiceGrid() {
    const grid = document.getElementById('svcGrid');
    grid.innerHTML = '';

    REG_SERVICES.forEach(svc => {
        const label = document.createElement('label');
        label.className = 'svc-check';
        label.innerHTML = `
            <input type="checkbox" name="reg_service" value="${svc.id}" data-key="${svc.key}">
            <span class="svc-icon" style="background:${svc.color};">
                <i class="${svc.icon}"></i>
            </span>
            <span class="svc-label">${svc.name}</span>
            <span class="svc-checkmark"><i class="fas fa-check"></i></span>
        `;

        const cb = label.querySelector('input[type="checkbox"]');
        cb.addEventListener('change', () => {
            if (cb.checked) {
                label.classList.add('checked');
                _selectedServiceIds.add(svc.id);
            } else {
                label.classList.remove('checked');
                _selectedServiceIds.delete(svc.id);
            }
            _updateServiceCount();
        });

        grid.appendChild(label);
    });
}

function _updateServiceCount() {
    const badge = document.getElementById('svcBadge');
    const countEl = document.getElementById('svcSelectedCount');
    const n = _selectedServiceIds.size;

    if (n === 0) {
        badge.textContent = '';
        badge.classList.remove('provider');
        if (countEl) countEl.innerHTML = '';
    } else {
        badge.textContent = `${n} dịch vụ`;
        badge.classList.add('provider');
        if (countEl) {
            const names = Array.from(_selectedServiceIds).map(id => {
                const s = REG_SERVICES.find(r => r.id === id);
                return s ? s.name : id;
            });
            countEl.innerHTML = `<i class="fas fa-check-circle me-1" style="color:var(--auth-primary);"></i> Đã chọn: ${names.join(', ')}`;
        }
    }
}

/* ================================================================
   UPLOAD HANDLERS
   ================================================================ */
const regUpload = {
    init() {
        document.getElementById('avatarInput').addEventListener('change', function () {
            if (!this.files[0]) return;
            document.getElementById('avatarZone').classList.add('has-file');
            document.getElementById('avatarPreview').src = URL.createObjectURL(this.files[0]);
        });
        document.getElementById('cccdFrontInput').addEventListener('change', function () {
            if (!this.files[0]) return;
            document.getElementById('cccdFrontZone').classList.add('has-file');
            document.getElementById('cccdFrontPreview').src = URL.createObjectURL(this.files[0]);
        });
        document.getElementById('cccdBackInput').addEventListener('change', function () {
            if (!this.files[0]) return;
            document.getElementById('cccdBackZone').classList.add('has-file');
            document.getElementById('cccdBackPreview').src = URL.createObjectURL(this.files[0]);
        });
    },
    removeCccd(side) {
        const p = side === 'front' ? 'cccdFront' : 'cccdBack';
        document.getElementById(p + 'Preview').src = '';
        document.getElementById(p + 'Zone').classList.remove('has-file');
        document.getElementById(p + 'Input').value = '';
    }
};

/* ================================================================
   PASSWORD UTILITIES
   ================================================================ */
function initPasswordUtils() {
    const pwd = document.getElementById('reg_password');
    const confirm = document.getElementById('reg_confirm');
    const fill = document.getElementById('strengthFill');

    document.getElementById('togglePwd').addEventListener('click', () => {
        const icon = document.getElementById('eyeIcon');
        if (pwd.type === 'password') { pwd.type = 'text'; icon.className = 'fas fa-eye-slash'; }
        else { pwd.type = 'password'; icon.className = 'fas fa-eye'; }
    });

    pwd.addEventListener('input', () => {
        const v = pwd.value;
        let s = 0;
        const rules = { len: v.length >= 6, upper: /[A-Z]/.test(v), num: /\d/.test(v) };
        Object.entries(rules).forEach(([k, ok]) => {
            const el = document.querySelector(`.pwd-rule[data-rule="${k}"]`);
            if (el) el.classList.toggle('pass', ok);
            if (ok) s++;
        });
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
        fill.style.width = (s / 3) * 100 + '%';
        fill.style.background = colors[s] || colors[0];
    });

    confirm.addEventListener('input', () => {
        const el = document.getElementById('confirmMatch');
        if (!confirm.value) { el.innerHTML = ''; return; }
        el.innerHTML = confirm.value === pwd.value
            ? '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Khớp</span>'
            : '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Chưa khớp</span>';
    });
}

/* ================================================================
   MAP HOOK – Lưu tọa độ khi chọn vị trí
   ================================================================ */
function initMapHook() {
    window._bdTravelFromCoords = function(lat, lng) {
        document.getElementById('reg_lat').value = lat;
        document.getElementById('reg_lng').value = lng;
        const info = document.getElementById('coordInfo');
        if (info) {
            info.style.display = 'flex';
            document.getElementById('coordLat').textContent = `Lat: ${Number(lat).toFixed(6)}`;
            document.getElementById('coordLng').textContent = `Lng: ${Number(lng).toFixed(6)}`;
        }
    };
}

/* ================================================================
   VALIDATE
   ================================================================ */
function _validate() {
    const name = document.getElementById('reg_name').value.trim();
    const phone = document.getElementById('reg_phone').value.replace(/\s+/g, '');
    const email = document.getElementById('reg_email').value.trim();
    const addr = document.getElementById('diachi').value.trim();
    const pwd = document.getElementById('reg_password').value;
    const confirm = document.getElementById('reg_confirm').value;

    if (!name) return 'Vui lòng nhập họ và tên.';
    if (!phone) return 'Vui lòng nhập số điện thoại.';
    if (!/^(0|\+84)[0-9]{9}$/.test(phone)) return 'SĐT không hợp lệ (VD: 0901234567).';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ.';
    if (!addr) return 'Vui lòng nhập địa chỉ.';
    if (!pwd) return 'Vui lòng nhập mật khẩu.';
    if (pwd.length < 6) return 'Mật khẩu phải ít nhất 6 ký tự.';
    if (pwd !== confirm) return 'Mật khẩu xác nhận không khớp.';
    return null;
}

/* ================================================================
   SUBMIT – Lưu tất cả vào bảng nguoidung
   ================================================================ */
async function regSubmit() {
    const msg = document.getElementById('msg');
    const btn = document.getElementById('btnSubmit');
    msg.innerHTML = '';

    const err = _validate();
    if (err) {
        msg.innerHTML = `<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>${err}</span>`;
        return;
    }

    const name = document.getElementById('reg_name').value.trim();
    const phone = document.getElementById('reg_phone').value.replace(/\s+/g, '');
    const email = document.getElementById('reg_email').value.trim();
    const addr = document.getElementById('diachi').value.trim();
    const pwd = document.getElementById('reg_password').value;
    const lat = document.getElementById('reg_lat').value || '';
    const lng = document.getElementById('reg_lng').value || '';
    const avatarFile = document.getElementById('avatarInput').files[0] || null;
    const cccdFront = document.getElementById('cccdFrontInput').files[0] || null;
    const cccdBack = document.getElementById('cccdBackInput').files[0] || null;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';

    try {
        const krud = window.DVQTKrud;
        if (!krud) throw new Error('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.');

        // Đảm bảo bảng nguoidung tồn tại
        await krud.ensureNguoidungTable();

        // Kiểm tra trùng SĐT trong bảng nguoidung (Mở rộng limit lên 1000)
        const existing = await krud.listTable('nguoidung', { limit: 1000 });
        const pNorm = phone.replace(/\D/g, '');
        if (existing.find(r => String(r.sodienthoai || r.phone || '').replace(/\D/g, '') === pNorm)) {
            throw new Error('SĐT đã được đăng ký. Vui lòng đăng nhập hoặc dùng SĐT khác.');
        }

        // Timestamp VN
        const now = new Date();
        const vn = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        const p = n => String(n).padStart(2, '0');
        const created = `${vn.getFullYear()}-${p(vn.getMonth()+1)}-${p(vn.getDate())} ${p(vn.getHours())}:${p(vn.getMinutes())}:${p(vn.getSeconds())}`;

        // Chuỗi id_dichvu (ví dụ: "1,2,3" hoặc "0")
        const idDichvuStr = _selectedServiceIds.size > 0 
            ? Array.from(_selectedServiceIds).sort((a,b) => a-b).join(',') 
            : '0';

        // Lưu vào bảng nguoidung với id_dichvu
        const userData = {
            hovaten: name,
            sodienthoai: phone,
            email,
            diachi: addr,
            matkhau: pwd,
            maplat: lat,
            maplng: lng,
            created_date: created,
            avatartenfile: avatarFile ? avatarFile.name : '',
            cccdmattruoctenfile: cccdFront ? cccdFront.name : '',
            cccdmatsautenfile: cccdBack ? cccdBack.name : '',
            id_dichvu: idDichvuStr, 
            trangthai: 'active'
        };

        await krud.insertRow('nguoidung', userData);

        const isProvider = idDichvuStr !== '0';
        if (!isProvider) {
            msg.innerHTML = '<span class="text-success small"><i class="fas fa-check-circle me-1"></i>Đăng ký thành công! Đang chuyển hướng về trang đăng nhập...</span>';
            const urlParams = new URLSearchParams(window.location.search);
            const service = urlParams.get('service') || 'dvqt';
            const target = 'dang-nhap.html?service=' + service;
            setTimeout(() => window.location.href = target, 1500);
        } else {
            msg.innerHTML = `
                <div class="info-box" style="margin-top:12px; text-align:center;">
                    <i class="fas fa-check-circle" style="color:var(--auth-success); font-size:1.4rem; display:block; margin-bottom:6px;"></i>
                    <strong>Đăng ký nhà cung cấp thành công!</strong><br>
                    <span style="font-size:0.82rem;">Tài khoản của bạn đã sẵn sàng.<br>
                    Dịch vụ: <strong>${Array.from(_selectedServiceIds).map(id => REG_SERVICES.find(r => r.id === id)?.name).join(', ')}</strong></span>
                </div>`;
            
            const urlParams = new URLSearchParams(window.location.search);
            const service = urlParams.get('service') || 'dvqt';
            const target = 'dang-nhap.html?service=' + service;
            setTimeout(() => window.location.href = target, 2500);
        }
    } catch (e) {
        console.error('Registration error:', e);
        msg.innerHTML = `<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>${e.message || 'Đăng ký thất bại.'}</span>`;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Tạo tài khoản';
    }
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    renderServiceGrid();
    regUpload.init();
    initPasswordUtils();
    initMapHook();
    _updateServiceCount(); // Để mặc định là Khách hàng
});
