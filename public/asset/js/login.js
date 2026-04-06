/**
 * login.js – Logic đăng nhập dùng chung cho Dịch Vụ Quanh Ta.
 * Hỗ trợ 2 role: customer / provider, chuyển đổi bằng tab.
 */
'use strict';

let _currentRole = 'customer';

/* ============================
   ROLE SWITCHER
   ============================ */
function switchRole(role) {
    _currentRole = role;
    document.querySelectorAll('.role-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.role === role);
    });
    document.getElementById('providerNotice').classList.toggle('show', role === 'provider');
    document.getElementById('msg').innerHTML = '';
}

/* ============================
   CHECK SESSION – Tự redirect nếu đã login
   ============================ */
async function checkAlreadyLoggedIn() {
    try {
        const session = await DVQTApp.checkSession();
        if (session && session.logged_in) {
            // Lấy service từ URL để biết cần quay về đâu
            const urlParams = new URLSearchParams(window.location.search);
            const service = urlParams.get('service');
            const root = (typeof DVQTApp !== 'undefined' && DVQTApp.ROOT_URL !== undefined) ? DVQTApp.ROOT_URL : '/Test';

            // Nếu không có service cụ thể, về trang chủ tổng
            if (!service || service === 'dvqt') {
                window.location.href = root + '/index.html';
                return;
            }

            // Danh sách đích đến (Đồng bộ với logic login bên dưới)
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

            const serviceDashboards = {
                'thonha': root + '/tho-nha/pages/provider/trang-ca-nhan.html',
                'thuexe': root + '/thue-xe/views/pages/provider/bang-dieu-khien.html',
                'giatuinhanh': root + '/giat-ui-nhanh/nha-cung-cap.html'
            };

            let target = '';
            if (session.role === 'customer') {
                target = serviceHomes[service] || (root + '/index.html');
            } else {
                target = serviceDashboards[service] || serviceHomes[service] || (root + '/index.html');
            }

            window.location.href = target;
        }
    } catch (e) { }
}

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
   LOGIN
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
        // Lấy tham số dịch vụ trên URL (ví dụ: ?service=thonha)
        const urlParams = new URLSearchParams(window.location.search);
        let service = urlParams.get('service');
        if (service) service = service.trim().toLowerCase();

        console.log('Current Login Context:', { service, role: _currentRole }); // Hỗ trợ debug cho user
        const providerTableMap = {
            'thonha': 'nhacungcap_thonha',
            'mevabe': 'nhacungcap_mevabe',
            'nguoibenh': 'nhacungcap_nguoibenh',
            'nguoigia': 'nhacungcap_nguoigia',
            'donvesinh': 'nhacungcap_donvesinh',
            'vuonnha': 'nhacungcap_vuonnha',
            'giatuinhanh': 'nhacungcap_giatuinhanh',
            'thuexe': 'nhacungcap_thuexe',
            'suaxe': 'nhacungcap_suaxe',
            'giaohangnhanh': 'nhacungcap_giaohangnhanh',
            'chuyendon': 'nhacungcap_chuyendon',
            'laixeho': 'nhacungcap_laixeho'
        };
        // Tự động nhận diện bảng nếu không có trong map (nhacungcap_...)
        const pTable = providerTableMap[service] || (service ? ('nhacungcap_' + service.replace(/-/g, '_')) : 'nhacungcap_thonha');

        await DVQTApp.login(_currentRole, phone, password, pTable);

        document.querySelector('.auth-card').classList.add('login-success');
        msg.innerHTML = '<span class="text-success small"><i class="fas fa-check-circle me-1"></i>Đăng nhập thành công!</span>';

        // 1. Phân loại đích đến dựa trên service và role
        let target = '';
        const root = (typeof DVQTApp !== 'undefined' && DVQTApp.ROOT_URL !== undefined) ? DVQTApp.ROOT_URL : '/Test';

        if (!service || service === 'dvqt') {
            target = root + '/index.html';
        } else {
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
            const serviceDashboards = {
                'thonha': root + '/tho-nha/pages/provider/trang-ca-nhan.html',
                'thuexe': root + '/thue-xe/views/pages/provider/bang-dieu-khien.html',
                'giatuinhanh': root + '/giat-ui-nhanh/nha-cung-cap.html',
                'mevabe': root + '/cham-soc-me-va-be/index.html', // Cập nhật sau nếu có dash riêng
                'nguoibenh': root + '/cham-soc-nguoi-benh/index.html',
                'nguoigia': root + '/cham-soc-nguoi-gia/index.html'
            };

            if (_currentRole === 'customer') {
                target = serviceHomes[service] || (root + '/index.html');
            } else {
                target = serviceDashboards[service] || serviceHomes[service] || (root + '/index.html');
            }
        }

        const redirectUrl = urlParams.get('redirect');

        setTimeout(() => {
            // Ưu tiên redirectUrl nếu có, nếu không thì theo target đã tính toán
            window.location.href = redirectUrl ? decodeURIComponent(redirectUrl) : target;
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
document.addEventListener('DOMContentLoaded', () => {
    checkAlreadyLoggedIn();
    initTogglePassword();

    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('login_phone').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('login_password').focus();
    });
    document.getElementById('login_password').addEventListener('keydown', e => {
        if (e.key === 'Enter') login();
    });
});
