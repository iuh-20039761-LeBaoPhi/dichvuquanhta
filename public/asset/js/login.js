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
            const redirects = {
                customer: '../tho-nha/pages/customer/trang-ca-nhan.html',
                provider: '../tho-nha/pages/provider/trang-ca-nhan.html',
            };
            window.location.href = redirects[session.role] || '../index.html';
        }
    } catch (e) {}
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
            'donvesinh': 'nhacungcap_donvesinh',
            'thuexe': 'nhacungcap_thuexe',
            'giatuinhanh': 'nhacungcap_giatuinhanh'
        };
        // Mặc định kiểm tra bảng thuexe hoặc thonha nếu không rõ dịch vụ
        const pTable = providerTableMap[service] || 'nhacungcap_thonha';

        await DVQTApp.login(_currentRole, phone, password, pTable);

        document.querySelector('.auth-card').classList.add('login-success');
        msg.innerHTML = '<span class="text-success small"><i class="fas fa-check-circle me-1"></i>Đăng nhập thành công!</span>';

        // 1. Phân loại đích đến dựa trên service và role
        let target = '';

        if (!service || service === 'dvqt') {
            // Đăng nhập từ trang chủ DVQT -> Quay về trang chủ DVQT
            target = '/Test/index.html';
        } else {
            // Đăng nhập từ dự án con (thonha, thuexe, ...)
            const serviceHomes = {
                'thonha': '/Test/tho-nha/index.html',
                'thuexe': '/Test/thue-xe/index.html',
                'giatuinhanh': '/Test/giat-ui-nhanh/index.html'
            };
            const serviceDashboards = {
                'thonha': '/Test/tho-nha/pages/provider/trang-ca-nhan.html',
                'thuexe': '/Test/thue-xe/views/pages/provider/bang-dieu-khien.html',
                'giatuinhanh': '/Test/giat-ui-nhanh/nha-cung-cap.html'
            };

            if (_currentRole === 'customer') {
                target = serviceHomes[service] || '/Test/index.html';
            } else {
                target = serviceDashboards[service] || '/Test/index.html';
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
