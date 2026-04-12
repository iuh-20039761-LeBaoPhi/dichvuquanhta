/**
 * DVQT Booking Helper
 * Logic dùng chung cho các module của Dịch Vụ Quanh Ta:
 * - Tự động tạo tài khoản khi đặt lịch khách (Book First, Register Later)
 * - Tự động đăng nhập sau khi tạo tài khoản
 * - Kiểm tra sự tồn tại của số điện thoại
 */

window.DVQTBookingHelper = (function() {
    
    /**
     * Tự động tạo tài khoản hoặc tìm tài khoản hiện có theo SĐT.
     * @param {string} name - Tên khách hàng
     * @param {string} phone - Số điện thoại
     * @param {string} roleId - ID phân quyền (mặc định '0' cho khách hàng)
     * @returns {Promise<Object>} - Thông tin kết quả {isNew, accountExists, userId}
     */
    async function autoCreateOrFindAccount(name, phone, roleId = '0') {
        const krud = window.DVQTKrud;
        if (!krud) throw new Error('Thư viện DVQTKrud chưa được nạp.');

        const pNorm = String(phone).replace(/\D/g, '');
        
        // Kiểm tra SĐT đã tồn tại chưa
        console.log(`[DVQT-Booking] Checking phone: ${pNorm}`);
        const rows = await krud.listTable('nguoidung', { limit: 5000 });
        const existing = (rows || []).find(r => {
            const dbPhone = String(r.sodienthoai || r.phone || '').replace(/\D/g, '');
            return dbPhone === pNorm;
        });

        if (existing) {
            console.log('[DVQT-Booking] Account exists. ID:', existing.id);
            return { isNew: false, accountExists: true, userId: existing.id };
        }

        // Tạo tài khoản mới nếu chưa có
        console.log('[DVQT-Booking] Creating new account for:', name);
        const now = new Date();
        const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const pad = n => String(n).padStart(2, '0');
        const created = `${vn.getFullYear()}-${pad(vn.getMonth()+1)}-${pad(vn.getDate())} ${pad(vn.getHours())}:${pad(vn.getMinutes())}:${pad(vn.getSeconds())}`;

        const userData = {
            hovaten: name,
            sodienthoai: phone,
            matkhau: phone, // Mật khẩu mặc định là SĐT
            id_dichvu: roleId,
            created_date: created,
            trangthai: 'active'
        };

        const result = await krud.insertRow('nguoidung', userData);
        const newId = result?.data?.id || result?.id || null;
        
        return { isNew: true, accountExists: false, userId: newId };
    }

    /**
     * Hiển thị thông báo Swal sau khi đặt thành công
     * @param {Object} result - Kết quả từ autoCreateOrFindAccount
     * @param {string} phone - SĐT khách
     * @param {string} orderCode - Mã đơn hàng
     * @param {string} redirectUrl - Trang chuyển hướng sau khi đóng
     */
    async function showSuccessAlert(result, phone, orderCode, redirectUrl) {
        if (result.isNew) {
            // TÀI KHOẢN MỚI -> Đăng nhập tự động
            if (window.DVQTApp && window.DVQTApp.login) {
                try { await window.DVQTApp.login(phone, phone); } catch(_e) {}
            }
            
            return Swal.fire({
                title: '<span style="color:#0ea5e9">Đặt lịch thành công!</span>',
                html: `<div style="text-align:left; line-height:1.8;">
                    <p><i class="fas fa-check-circle text-success me-1"></i> Mã đơn: <strong>#${orderCode || 'Đang xử lý'}</strong></p>
                    <p><i class="fas fa-user-plus text-primary me-1"></i> Tài khoản đã được tạo tự động:</p>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin:8px 0;">
                        <p style="margin:4px 0;"><strong>SĐT:</strong> ${phone}</p>
                        <p style="margin:4px 0;"><strong>Mật khẩu:</strong> ${phone} <small class="text-muted">(mặc định = SĐT)</small></p>
                    </div>
                    <p class="text-primary small"><i class="fas fa-info-circle me-1"></i>Hệ thống đã tự động đăng nhập cho bạn.</p>
                </div>`,
                icon: 'success',
                confirmButtonText: 'Xem lịch của tôi',
                confirmButtonColor: '#0ea5e9',
                allowOutsideClick: false
            }).then(() => {
                if (redirectUrl) window.location.href = redirectUrl;
            });

        } else if (result.accountExists) {
            // Đã có tài khoản -> Thông báo đăng nhập
            const ROOT = (window.DVQTApp && window.DVQTApp.ROOT_URL) ? window.DVQTApp.ROOT_URL : '';
            const loginUrl = ROOT + '/public/dang-nhap.html';
            
            return Swal.fire({
                title: '<span style="color:#0ea5e9">Đặt lịch thành công!</span>',
                html: `<div style="text-align:left; line-height:1.8;">
                    <p><i class="fas fa-check-circle text-success me-1"></i> Mã đơn: <strong>#${orderCode || 'Đang xử lý'}</strong></p>
                    <p><i class="fas fa-info-circle text-warning me-1"></i> SĐT <strong>${phone}</strong> đã có tài khoản.</p>
                    <p class="small text-muted">Vui lòng <a href="${loginUrl}">đăng nhập</a> để quản lý đơn hàng.</p>
                </div>`,
                icon: 'success',
                confirmButtonText: 'Đóng',
                confirmButtonColor: '#0ea5e9'
            });
        } else {
            // Trường hợp đã đăng nhập sẵn
            return Swal.fire('Thành công!', `Đơn hàng #${orderCode} đã được nhận.`, 'success')
                .then(() => {
                    if (redirectUrl) window.location.href = redirectUrl;
                });
        }
    }

    return {
        autoCreateOrFindAccount,
        showSuccessAlert
    };
})();
