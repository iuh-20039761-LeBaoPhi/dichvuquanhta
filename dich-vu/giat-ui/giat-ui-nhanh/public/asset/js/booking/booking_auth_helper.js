/**
 * Trình hỗ trợ xác thực đặt lịch cho Giặt Ủi Nhanh
 * Xử lý việc tự động tạo tài khoản và quản lý thông tin đăng nhập trong quá trình đặt lịch.
 */
window.BookingAuthHelper = (function() {
    
    /**
     * Thiết lập một cookie
     */
    function setCookie(name, value, days = 7) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "; expires=" + date.toUTCString();
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    /**
     * Lấy giá trị của một cookie
     */
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /**
     * Tự động tạo tài khoản hoặc tìm tài khoản hiện có dựa trên số điện thoại.
     * Được ánh xạ từ logic của dvqt-booking-helper.js.
     */
    async function ensureAccount(name, phone) {
        const krud = window.krud;
        const krudList = window.krudList;
        
        if (typeof krud !== 'function' || typeof krudList !== 'function') {
            throw new Error('Thư viện KRUD chưa được nạp.');
        }

        const normalizedPhone = String(phone).replace(/\D/g, '');
        
        // Tìm kiếm người dùng hiện tại theo số điện thoại
        const result = await krudList({
            table: 'nguoidung',
            where: [
                { field: 'sodienthoai', operator: '=', value: normalizedPhone }
            ],
            limit: 1
        });

        const rows = (result && result.data) || (Array.isArray(result) ? result : []);
        let user = rows.length ? rows[0] : null;

        if (user) {
            console.log('[BookingAuth] Tài khoản đã tồn tại cho số điện thoại:', normalizedPhone);

            // Kiểm tra nếu là nhà cung cấp (id_dichvu chứa '11')
            const idDichvu = String(user.id_dichvu || "").trim();
            const serviceIds = idDichvu.split(",").map((s) => s.trim());
            if (serviceIds.includes("11")) {
                throw new Error("Tài khoản nhà cung cấp không được phép đặt lịch dịch vụ này.");
            }
            
            // Tự động ghi nhớ phiên đăng nhập nếu chưa có
            if (!getCookie('dvqt_u')) {
                setCookie('dvqt_u', normalizedPhone);
                setCookie('dvqt_p', user.matkhau || normalizedPhone);
            }
            
            return { isNew: false, userId: user.id, name: user.hovaten };
        }

        // Tạo tài khoản mới
        console.log('[BookingAuth] Đang tạo tài khoản mới cho:', name);
        const now = new Date();
        const vnDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const pad = n => String(n).padStart(2, '0');
        const createdAt = `${vnDate.getFullYear()}-${pad(vnDate.getMonth()+1)}-${pad(vnDate.getDate())} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;

        const userData = {
            hovaten: name,
            sodienthoai: normalizedPhone,
            matkhau: normalizedPhone, // Mật khẩu mặc định là số điện thoại
            id_dichvu: '0', // Quyền mặc định là khách hàng
            created_date: createdAt,
            trangthai: 'active'
        };

        const insertRes = await krud('insert', 'nguoidung', userData);
        if (!insertRes || insertRes.success === false) {
            throw new Error('Không thể tạo tài khoản mới.');
        }

        const newId = insertRes.data?.id || insertRes.id;
        
        // Lưu thông tin vào cookie
        setCookie('dvqt_u', normalizedPhone);
        setCookie('dvqt_p', normalizedPhone);

        return { isNew: true, userId: newId };
    }

    return {
        ensureAccount,
        setCookie,
        getCookie
    };
})();
