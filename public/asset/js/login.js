/**
 * login.js – Logic đăng nhập dùng chung cho Dịch Vụ Quanh Ta.
 * Đơn giản: Lấy SĐT + Mật khẩu → gọi krudList bảng nguoidung → so khớp → lưu localStorage.
 * Không phân chia role, không gọi PHP session.
 */
'use strict';

/* ============================
   TOGGLE PASSWORD
   ============================ */
function initTogglePassword() {
    document.getElementById('togglePwd').addEventListener('click', () => {
        const input = document.getElementById('login_password');
        const icon = document.getElementById('eyeIcon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });
}

/* ============================
   LOGIN – Đơn giản hoá
   ============================ */
async function login() {
    const msg = document.getElementById('msg');
    const btn = document.getElementById('loginBtn');
    const phone = document.getElementById('login_phone').value.trim();
    const password = document.getElementById('login_password').value;

    if (!phone || !password) {
        msg.innerHTML = '<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>Vui lòng nhập đủ SĐT và mật khẩu</span>';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đăng nhập...';
    msg.innerHTML = '';

    try {
        if (!window.DVQTApp) throw new Error('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.');

        // 1. Gọi hàm login tập trung của DVQTApp (Hàm này tự động lưu Cookie)
        const profile = await window.DVQTApp.login(phone, password);

        // 2. Hiển thị thành công
        document.querySelector('.auth-card').classList.add('login-success');
        msg.innerHTML = '<span class="text-success small"><i class="fas fa-check-circle me-1"></i>Đăng nhập thành công!</span>';

        // 3. Điều hướng
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        const service = urlParams.get('service');
        const getRoot = () => {
            if (window.DVQTApp && window.DVQTApp.ROOT_URL !== undefined) return window.DVQTApp.ROOT_URL;
            const path = window.location.pathname;
            const idx = path.toLowerCase().indexOf('/public/');
            if (idx !== -1) return path.substring(0, idx);
            const parts = path.split('/');
            if (parts[1] && !parts[1].includes('.') && parts[1] !== 'index.php') return '/' + parts[1];
            return '';
        };
        const root = getRoot();
        let target = root + '/index.html';

        if (redirectUrl) {
            target = decodeURIComponent(redirectUrl);
        } else if (service) {
            const serviceHomes = {
                'thonha': root + '/tho-nha/index.html',
                'thuexe': root + '/thue-xe/index.html',
                'giatuinhanh': root + '/giat-ui-nhanh/index.html',
                'mevabe': root + '/cham-soc-me-va-be/index.html',
                'nguoibenh': root + '/cham-soc-nguoi-benh/index.html',
                'nguoigia': root + '/cham-soc-nguoi-gia/index.html',
                'donvesinh': root + '/dich-vu-don-ve-sinh/index.html',
                'vuonnha': root + '/cham-soc-vuon-nha/index.html',
                'giaohangnhanh': root + '/giao-hang-nhanh/index.html',
                'suaxe': root + '/sua-xe-luu-dong/index.html',
                'chuyendon': root + '/dich-vu-chuyen-don/index.html',
                'laixeho': root + '/dich-vu-lai-xe-ho/index.html'
            };
            target = serviceHomes[service] || target;
        }

        setTimeout(() => {
            window.location.href = target;
        }, 800);

    } catch (err) {
        msg.innerHTML = '<span class="text-danger small"><i class="fas fa-exclamation-circle me-1"></i>' + (err.message || 'Đăng nhập thất bại') + '</span>';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Đăng nhập';
    }
}

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đã đăng nhập chưa từ Cookie (thông qua DVQTApp)
    if (window.DVQTApp) {
        const session = await window.DVQTApp.checkSession();
        if (session && session.logged_in) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
            const service = urlParams.get('service');
            const root = getRoot();
            let target = root + '/index.html';
            if (redirectUrl) {
                target = decodeURIComponent(redirectUrl);
            } else if (service) {
                const serviceHomes = {
                    'thonha': root + '/tho-nha/index.html',
                    'thuexe': root + '/thue-xe/index.html',
                    'giatuinhanh': root + '/giat-ui-nhanh/index.html',
                    'mevabe': root + '/cham-soc-me-va-be/index.html',
                    'nguoibenh': root + '/cham-soc-nguoi-benh/index.html',
                    'nguoigia': root + '/cham-soc-nguoi-gia/index.html',
                    'donvesinh': root + '/dich-vu-don-ve-sinh/index.html',
                    'vuonnha': root + '/cham-soc-vuon-nha/index.html',
                    'giaohangnhanh': root + '/giao-hang-nhanh/index.html',
                    'suaxe': root + '/sua-xe-luu-dong/index.html',
                    'chuyendon': root + '/dich-vu-chuyen-don/index.html',
                    'laixeho': root + '/dich-vu-lai-xe-ho/index.html'
                };
                target = serviceHomes[service] || target;
            }
            window.location.href = target;
            return;
        }
    }

    initTogglePassword();
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('login_phone').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('login_password').focus();
    });
    document.getElementById('login_password').addEventListener('keydown', e => {
        if (e.key === 'Enter') login();
    });
});
