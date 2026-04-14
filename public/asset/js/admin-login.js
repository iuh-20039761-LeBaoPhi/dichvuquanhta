document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('formAdminLogin');
    const btnLogin = document.getElementById('btnLogin');
    const status = document.getElementById('loginStatus');

    // Chuyển hướng nếu đã đăng nhập từ trước
    const cookies = document.cookie.split(';');
    const emailCookie = cookies.find(c => c.trim().startsWith('admin_e='));
    const passCookie = cookies.find(c => c.trim().startsWith('admin_p='));
    if (emailCookie && passCookie) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('txtEmail').value.trim();
        const matkhau = document.getElementById('txtPassword').value.trim();

        if(!email || !matkhau) return alert('Vui lòng nhập đầy đủ email và mật khẩu');
        
        btnLogin.disabled = true;
        btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...';
        status.innerHTML = '';

        try {
            // Đảm bảo bảng admin tồn tại (Tự fix nếu chưa có bảng admin)
            let listData = [];
            try {
                listData = await DVQTKrud.listTable('admin', { limit: 100 });
            } catch(krudErr) {
                // Nếu bảng chưa tồn tại
                console.log("Bảng admin có thể chưa tồn tại, thử tạo mới bằng data mồi.");
            }
            
            // Xử lý tạo tự động nếu chưa có tài khoản admin nào (Dev Feature)
            if (!listData || listData.length === 0) {
                try {
                    await DVQTKrud.insertRow('admin', { email: 'admin@dvqt.vn', matkhau: '123456' });
                    status.innerHTML = '<span class="text-primary"><i class="fas fa-info-circle"></i> Chưa có Admin gốc. Đã tạo mồi:<br><b>admin@dvqt.vn</b> | Pass: <b>123456</b><br>Vui lòng đăng nhập lại.</span>';
                    btnLogin.disabled = false;
                    btnLogin.innerHTML = 'ĐĂNG NHẬP';
                    return;
                } catch(err2) {
                    throw new Error("Không thể khởi tạo CSDL: " + (err2.message || ''));
                }
            }

            // Tìm user
            const user = listData.find(x => x.email === email && x.matkhau === matkhau);
            if (user) {
                // Đăng nhập thành công, lưu 2 cookie 7 ngày
                document.cookie = `admin_e=${encodeURIComponent(user.email)}; path=/; max-age=${7*24*60*60}`;
                document.cookie = `admin_p=${encodeURIComponent(user.matkhau)}; path=/; max-age=${7*24*60*60}`;
                
                status.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Đăng nhập thành công! Đang chuyển hướng...</span>';
                setTimeout(() => window.location.href = 'admin-dashboard.html', 1000);
            } else {
                status.innerHTML = '<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Sai thông tin đăng nhập!</span>';
                btnLogin.disabled = false;
                btnLogin.innerHTML = 'ĐĂNG NHẬP';
            }
            
        } catch (err) {
            status.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle"></i> Lỗi kết nối CSDL: ${err.message}</span>`;
            btnLogin.disabled = false;
            btnLogin.innerHTML = 'ĐĂNG NHẬP';
        }
    });

});
