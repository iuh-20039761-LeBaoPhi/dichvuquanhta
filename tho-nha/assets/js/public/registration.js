/**
 * registration.js – Logic xử lý đăng ký tài khoản dùng chung cho Dịch Vụ Quanh Ta.
 * 
 * Chức năng:
 * - Multi-step form navigation (3 bước)
 * - Validate đầy đủ (SĐT, email, mật khẩu, trùng tài khoản)
 * - Upload ảnh (Avatar, CCCD mặt trước/sau) qua krud-helper
 * - Chọn dịch vụ → xác định role (khách hàng / nhà cung cấp)
 * - Lưu vào các bảng tương ứng qua DVQTKrud
 */
'use strict';

/* ================================================================
   CẤU HÌNH DỊCH VỤ
   Thêm/bớt dịch vụ tại đây – hệ thống tự render giao diện.
   ================================================================ */
const REG_SERVICES = [
    { key: 'mevabe',       name: 'Chăm sóc mẹ và bé',   table: 'nhacungcap_mevabe',       icon: 'fas fa-baby',         color: '#ec4899' },
    { key: 'nguoibenh',    name: 'Chăm sóc người bệnh',  table: 'nhacungcap_nguoibenh',    icon: 'fas fa-hospital-user', color: '#ef4444' },
    { key: 'nguoigia',     name: 'Chăm sóc người già',    table: 'nhacungcap_nguoigia',     icon: 'fas fa-person-cane',   color: '#f97316' },
    { key: 'vuonnha',      name: 'Làm vườn',              table: 'nhacungcap_vuonnha',      icon: 'fas fa-leaf',          color: '#22c55e' },
    { key: 'donvesinh',    name: 'Dọn vệ sinh',           table: 'nhacungcap_donvesinh',    icon: 'fas fa-broom',         color: '#14b8a6' },
    { key: 'laixeho',      name: 'Lái xe hộ',             table: 'nhacungcap_laixeho',      icon: 'fas fa-car',           color: '#3b82f6' },
    { key: 'giaohangnhanh',name: 'Giao hàng nhanh',       table: 'nhacungcap_giaohangnhanh',icon: 'fas fa-truck-fast',    color: '#6366f1' },
    { key: 'suaxe',        name: 'Sửa xe',                table: 'nhacungcap_suaxe',        icon: 'fas fa-motorcycle',    color: '#8b5cf6' },
    { key: 'thonha',       name: 'Thợ nhà',               table: 'nhacungcap_thonha',       icon: 'fas fa-tools',         color: '#11998e' },
    { key: 'thuexe',       name: 'Thuê xe',               table: 'nhacungcap_thuexe',       icon: 'fas fa-key',           color: '#0ea5e9' },
];

/* ================================================================
   STATE
   ================================================================ */
let _regCoords = { lat: null, lng: null };
let _selectedServices = new Set();

/* ================================================================
   STEPPER NAVIGATION
   ================================================================ */
const regNav = {
    current: 1,

    goPage(n) {
        // Validate trước khi tiến
        if (n > this.current && !this._validatePage(this.current)) return;

        // Ẩn trang hiện tại
        document.getElementById(`regPage${this.current}`).classList.remove('active');
        // Hiện trang mới
        document.getElementById(`regPage${n}`).classList.add('active');

        // Cập nhật stepper
        document.querySelectorAll('.reg-step').forEach(el => {
            const s = Number(el.dataset.step);
            el.classList.remove('active', 'done');
            if (s < n) el.classList.add('done');
            if (s === n) el.classList.add('active');
        });

        this.current = n;
        // Scroll lên đầu card
        document.querySelector('.auth-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _validatePage(page) {
        const msg = document.getElementById('msg');
        msg.innerHTML = '';

        if (page === 1) {
            const name = document.getElementById('reg_name').value.trim();
            const phone = document.getElementById('reg_phone').value.replace(/\s+/g, '');
            const addr = document.getElementById('diachi').value.trim();
            const pwd = document.getElementById('reg_password').value;
            const confirm = document.getElementById('reg_confirm').value;
            const email = document.getElementById('reg_email').value.trim();

            if (!name) return this._err('Vui lòng nhập họ và tên.');
            if (!phone) return this._err('Vui lòng nhập số điện thoại.');
            if (!/^(0|\+84)[0-9]{9}$/.test(phone)) return this._err('SĐT không hợp lệ (VD: 0901234567).');
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this._err('Email không hợp lệ.');
            if (!addr) return this._err('Vui lòng nhập địa chỉ.');
            if (!pwd) return this._err('Vui lòng nhập mật khẩu.');
            if (pwd.length < 6) return this._err('Mật khẩu phải có ít nhất 6 ký tự.');
            if (pwd !== confirm) return this._err('Mật khẩu xác nhận không khớp.');
            return true;
        }

        // Page 2 & 3: không bắt buộc, cho qua
        return true;
    },

    _err(text) {
        const msg = document.getElementById('msg');
        msg.innerHTML = `<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>${text}</span>`;
        return false;
    }
};

/* ================================================================
   UPLOAD HANDLERS
   ================================================================ */
const regUpload = {
    init() {
        // Avatar
        document.getElementById('avatarInput').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const zone = document.getElementById('avatarZone');
            const preview = document.getElementById('avatarPreview');
            preview.src = URL.createObjectURL(file);
            zone.classList.add('has-file');
        });

        // CCCD Front
        document.getElementById('cccdFrontInput').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const zone = document.getElementById('cccdFrontZone');
            const preview = document.getElementById('cccdFrontPreview');
            preview.src = URL.createObjectURL(file);
            zone.classList.add('has-file');
        });

        // CCCD Back
        document.getElementById('cccdBackInput').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const zone = document.getElementById('cccdBackZone');
            const preview = document.getElementById('cccdBackPreview');
            preview.src = URL.createObjectURL(file);
            zone.classList.add('has-file');
        });
    },

    removeCccd(side) {
        const prefix = side === 'front' ? 'cccdFront' : 'cccdBack';
        const zone = document.getElementById(prefix + 'Zone');
        const preview = document.getElementById(prefix + 'Preview');
        const input = document.getElementById(prefix + 'Input');
        preview.src = '';
        zone.classList.remove('has-file');
        input.value = '';
    }
};

/* ================================================================
   SERVICE GRID RENDER
   ================================================================ */
function renderServiceGrid() {
    const grid = document.getElementById('svcGrid');
    grid.innerHTML = '';

    REG_SERVICES.forEach(svc => {
        const label = document.createElement('label');
        label.className = 'svc-check';
        label.innerHTML = `
            <input type="checkbox" value="${svc.key}" data-table="${svc.table}">
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
                _selectedServices.add(svc.key);
            } else {
                label.classList.remove('checked');
                _selectedServices.delete(svc.key);
            }
            _updateServiceCount();
        });

        grid.appendChild(label);
    });
}

function _updateServiceCount() {
    const el = document.getElementById('svcSelectedCount');
    const n = _selectedServices.size;
    if (n === 0) {
        el.innerHTML = `<i class="fas fa-info-circle me-1"></i> Chưa chọn dịch vụ nào – Đăng ký là <strong>Khách hàng</strong>`;
    } else {
        el.innerHTML = `<i class="fas fa-briefcase me-1" style="color:var(--auth-primary);"></i> Đã chọn <strong>${n}</strong> dịch vụ – Đăng ký là <strong style="color:var(--auth-primary);">Nhà cung cấp</strong>`;
    }
}

/* ================================================================
   PASSWORD UTILITIES
   ================================================================ */
function initPasswordUtils() {
    const pwdInput = document.getElementById('reg_password');
    const confirmInput = document.getElementById('reg_confirm');
    const strengthFill = document.getElementById('strengthFill');
    const toggleBtn = document.getElementById('togglePwd');

    // Toggle show/hide
    toggleBtn.addEventListener('click', () => {
        const icon = document.getElementById('eyeIcon');
        if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            pwdInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });

    // Strength indicator
    pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        let score = 0;
        const rules = {
            len: val.length >= 6,
            upper: /[A-Z]/.test(val),
            num: /\d/.test(val),
        };

        Object.entries(rules).forEach(([key, pass]) => {
            const el = document.querySelector(`.pwd-rule[data-rule="${key}"]`);
            if (el) el.classList.toggle('pass', pass);
            if (pass) score++;
        });

        const pct = (score / 3) * 100;
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
        strengthFill.style.width = pct + '%';
        strengthFill.style.background = colors[score] || colors[0];
    });

    // Confirm match
    confirmInput.addEventListener('input', () => {
        const el = document.getElementById('confirmMatch');
        if (!confirmInput.value) { el.innerHTML = ''; return; }
        if (confirmInput.value === pwdInput.value) {
            el.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Mật khẩu khớp</span>';
        } else {
            el.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Chưa khớp</span>';
        }
    });
}

/* ================================================================
   MAP / COORDINATES HOOK
   ================================================================ */
function initMapHook() {
    // Hook vào map-picker: khi chọn vị trí, lưu tọa độ ngầm
    const origPick = window.mapPicker?.pick;
    if (!origPick) return;

    // Lắng nghe khi vị trí được chọn thông qua _bdTravelFromCoords
    window._bdTravelFromCoords = function(lat, lng) {
        _regCoords.lat = lat;
        _regCoords.lng = lng;
        document.getElementById('reg_lat').value = lat;
        document.getElementById('reg_lng').value = lng;

        // Hiện tọa độ nhỏ
        const info = document.getElementById('coordInfo');
        if (info) {
            info.style.display = 'flex';
            document.getElementById('coordLat').textContent = `Lat: ${Number(lat).toFixed(6)}`;
            document.getElementById('coordLng').textContent = `Lng: ${Number(lng).toFixed(6)}`;
        }
    };
}

/* ================================================================
   UPLOAD FILE TO KRUD (Base64)
   ================================================================ */
async function uploadFileToKrud(file, table, columnName, rowId) {
    if (!file) return null;
    // Convert to base64
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            // For now, store filename metadata. Actual file upload depends on server capability.
            resolve(file.name);
        };
        reader.readAsDataURL(file);
    });
}

/* ================================================================
   SUBMIT ĐĂNG KÝ
   ================================================================ */
async function regSubmit() {
    const msg = document.getElementById('msg');
    const btn = document.getElementById('btnSubmit');
    msg.innerHTML = '';

    // Thu thập dữ liệu
    const name = document.getElementById('reg_name').value.trim();
    const phone = document.getElementById('reg_phone').value.replace(/\s+/g, '');
    const email = document.getElementById('reg_email').value.trim();
    const addr = document.getElementById('diachi').value.trim();
    const pwd = document.getElementById('reg_password').value;
    const lat = document.getElementById('reg_lat').value || '';
    const lng = document.getElementById('reg_lng').value || '';

    // File inputs
    const avatarFile = document.getElementById('avatarInput').files[0] || null;
    const cccdFront = document.getElementById('cccdFrontInput').files[0] || null;
    const cccdBack = document.getElementById('cccdBackInput').files[0] || null;

    // Kiểm tra lần cuối
    if (!name || !phone || !pwd || !addr) {
        msg.innerHTML = '<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>Thiếu thông tin bắt buộc. Vui lòng quay lại kiểm tra.</span>';
        return;
    }

    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';

    try {
        const krud = window.DVQTKrud;
        if (!krud) throw new Error('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.');

        // Kiểm tra SĐT đã tồn tại?
        const existingCustomers = await krud.listTable('khachhang');
        const phoneNorm = phone.replace(/\D/g, '');
        const dup = existingCustomers.find(r => {
            const p = String(r.sodienthoai || r.phone || '').replace(/\D/g, '');
            return p === phoneNorm;
        });
        if (dup) throw new Error('Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng SĐT khác.');

        // Timestamp
        const now = new Date();
        const vnNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        const pad = n => String(n).padStart(2, '0');
        const created = `${vnNow.getFullYear()}-${pad(vnNow.getMonth()+1)}-${pad(vnNow.getDate())} ${pad(vnNow.getHours())}:${pad(vnNow.getMinutes())}:${pad(vnNow.getSeconds())}`;

        // Dữ liệu cơ bản
        const baseData = {
            hovaten: name,
            sodienthoai: phone,
            email: email,
            diachi: addr,
            matkhau: pwd,
            maplat: lat,
            maplng: lng,
            created_date: created,
            avatartenfile: avatarFile ? avatarFile.name : '',
            cccdmattruoctenfile: cccdFront ? cccdFront.name : '',
            cccdmatsautenfile: cccdBack ? cccdBack.name : '',
        };

        const isProvider = _selectedServices.size > 0;

        if (!isProvider) {
            // === KHÁCH HÀNG ===
            const customerData = { ...baseData, trangthai: 'active' };
            await krud.insertRow('khachhang', customerData);

            // Tự động đăng nhập cho khách hàng
            try {
                await DVQTApp.login('customer', phone, pwd, 'khachhang');
            } catch(e) {
                console.warn('Auto-login failed:', e);
            }

            msg.innerHTML = '<span class="text-success small"><i class="fas fa-check-circle me-1"></i>Đăng ký khách hàng thành công! Đang chuyển hướng...</span>';
            setTimeout(() => window.location.href = '../../index.html', 1200);

        } else {
            // === NHÀ CUNG CẤP ===
            const selectedKeys = Array.from(_selectedServices);
            const selectedNames = selectedKeys.map(k => {
                const s = REG_SERVICES.find(r => r.key === k);
                return s ? s.name : k;
            });

            // Danh mục thực hiện (lưu tên dịch vụ, phân cách bởi dấu phẩy)
            const providerData = {
                ...baseData,
                trangthai: 'pending',
                danh_muc_thuc_hien: selectedNames.join(', '),
                loai_hinh_kinh_doanh: selectedKeys.join(','),
            };

            // Lưu vào từng bảng dịch vụ tương ứng
            const insertPromises = [];
            for (const key of selectedKeys) {
                const svc = REG_SERVICES.find(r => r.key === key);
                if (svc) {
                    insertPromises.push(
                        krud.insertRow(svc.table, { ...providerData }).catch(e => {
                            console.warn(`Insert ${svc.table} failed:`, e);
                        })
                    );
                }
            }
            await Promise.all(insertPromises);

            msg.innerHTML = `
                <div class="info-box" style="margin-top:16px; text-align:center;">
                    <i class="fas fa-check-circle" style="color:var(--auth-success); font-size:1.5rem; display:block; margin-bottom:8px;"></i>
                    <strong>Đăng ký nhà cung cấp thành công!</strong><br>
                    <span style="font-size:0.82rem;">Tài khoản đang chờ Admin xét duyệt (thường trong 24h).<br>
                    Bạn đã đăng ký ${selectedNames.length} dịch vụ: <strong>${selectedNames.join(', ')}</strong></span>
                </div>
            `;

            // Ẩn form, chỉ hiện thông báo
            document.getElementById('regPage3').querySelector('.reg-nav').style.display = 'none';
            document.querySelector('.reg-stepper').style.display = 'none';
        }

    } catch (err) {
        console.error('Registration error:', err);
        msg.innerHTML = `<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>${err.message || 'Đăng ký thất bại. Vui lòng thử lại.'}</span>`;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Hoàn tất đăng ký';
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
});
