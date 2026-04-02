(function (global) {
    'use strict';

    /**
     * THO-NHA APP HELPER
     * Tóm gọn các thao tác nghiệp vụ chính (Đăng nhập, Đăng ký, Đặt lịch, Xem đơn)
     * Dựa trên nền tảng thư viện krud.js
     */

    const API_CONFIG = {
        TABLE_CUSTOMER: 'khachhang',
        TABLE_PROVIDER: 'nhacungcap_thonha',
        TABLE_ORDER: 'datlich_thonha',
        AUTH_PHP: '../../api/customer/auth/login.php'
    };

    /**
     * Helper nội bộ
     */
    const Utils = {
        normalizePhone: (p) => String(p || '').replace(/\D/g, ''),
        nowSql: () => {
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        },
        getKrudHelper: () => {
             const helper = global.ThoNhaKrud || window.ThoNhaKrud;
             if (!helper) throw new Error('Thu vien ThoNhaKrud chua duoc nap. Vui long kiem tra file krud-helper.js');
             return helper;
        }
    };

    const ThoNha = {
        /**
         * Xử lý ĐĂNG NHẬP (Chung cho Khách/Thợ)
         */
        login: async (role, phone, password) => {
            const table = role === 'customer' ? API_CONFIG.TABLE_CUSTOMER : API_CONFIG.TABLE_PROVIDER;
            const krudHelper = Utils.getKrudHelper();
            
            // Tìm user qua SĐT
            const rows = await krudHelper.listTable(table);
            const user = rows.find(r => Utils.normalizePhone(r.sodienthoai || r.phone) === Utils.normalizePhone(phone));

            if (!user) throw new Error('Số điện thoại không tồn tại');
            
            // So khớp mật khẩu
            const stored = String(user.matkhau || user.password || '');
            const isMatch = stored.startsWith('sha256$') ? (stored === 'sha256$' + password) : (stored === password);
            if (!isMatch) throw new Error('Mật khẩu không chính xác');

            // --- KIỂM TRA TRẠNG THÁI TÀI KHOẢN ---
            const status = String(user.trangthai || '').toLowerCase();
            if (role === 'provider' && status === 'pending') {
                throw new Error('Tài khoản của bạn đang chờ Admin xét duyệt. Thường trong vòng 24h.');
            }
            if (status === 'locked' || status === 'banned') {
                throw new Error('Tài khoản của bạn đã bị khóa hoặc tạm dừng. Vui lòng liên hệ Admin.');
            }
            // -------------------------------------

            // Lưu và đồng bộ PHP Session
            const profile = {
                id: user.id,
                name: user.hovaten || user.name || 'Người dùng',
                phone: user.sodienthoai || user.phone || phone,
                company: user.tencua_hang || user.company || '',
                danh_muc_thuc_hien: user.danh_muc_thuc_hien || '',
                address: user.diachi || user.dia_chi || user.address || '',
                avatartenfile: user.avatartenfile || '',
                cccdmattruoctenfile: user.cccdmattruoctenfile || '',
                cccdmatsautenfile: user.cccdmatsautenfile || ''
            };
            
            // Đồng bộ PHP Session - CHỈ LƯU TẠI SERVER
            let authPath = (role === 'customer') ? '../../api/customer/auth/login.php' : '../../api/provider/auth/login.php';
            if (window.location.pathname.indexOf('pages/') === -1) {
                authPath = authPath.replace('../../', './');
            }
            
            const res = await fetch(authPath, { method: 'POST', body: JSON.stringify(profile) });
            const resultData = await res.json();
            if (!resultData.success) {
                throw new Error(resultData.message || 'Lỗi server khi tạo session');
            }
            
            // Xóa cache session cũ để các lệnh check sau đó phải gọi lại server
            global._thonha_session_cache = null;

            // Bridge to legacy LocalStorage for booking flow
            if (role === 'customer') {
                localStorage.setItem('customer_logged_in', 'true');
                localStorage.setItem('customer_id', profile.id);
                localStorage.setItem('customer_name', profile.name);
                localStorage.setItem('thonha_customer_profile_v1', JSON.stringify({
                    name: profile.name,
                    phone: profile.phone,
                    address: profile.address
                }));
            } else if (role === 'provider') {
                localStorage.setItem('provider_logged_in', 'true');
                localStorage.setItem('provider_id', profile.id);
                localStorage.setItem('provider_name', profile.name);
                localStorage.setItem('thonha_provider_profile_v1', JSON.stringify(profile));
            }

            return profile;
        },

        /**
         * Kiểm tra Session từ PHP (Thay thế LocalStorage)
         */
        checkSession: async (forceRefresh = false) => {
            if (!forceRefresh && global._thonha_session_cache && global._thonha_session_cache.logged_in) {
                return global._thonha_session_cache;
            }

            let checkPath = (window.location.pathname.indexOf('pages/') !== -1) ? '../../api/public/check-session.php' : './api/public/check-session.php';
            try {
                const res = await fetch(checkPath, { cache: 'no-store' });
                const data = await res.json();
                
                // Chỉ cache nếu logged_in = true, nếu false thì luôn cho check lại vì họ có thể login tab khác
                if (data && data.logged_in) {
                    global._thonha_session_cache = data;
                } else {
                    global._thonha_session_cache = null;
                }
                return data;
            } catch (e) {
                console.warn('Session check failed:', e);
                global._thonha_session_cache = null;
            }
            return { logged_in: false };
        },

        /**
         * Xử lý ĐĂNG KÝ
         */
        register: async (role, data) => {
            const table = role === 'customer' ? API_CONFIG.TABLE_CUSTOMER : API_CONFIG.TABLE_PROVIDER;
            const krudHelper = Utils.getKrudHelper();
            
            const payload = {
                ...data,
                created_date: Utils.nowSql(),
                trangthai: (role === 'customer' ? 'active' : 'pending')
            };
            return krudHelper.insertRow(table, payload);
        },

        /**
         * Xử lý ĐẶT LỊCH (Booking)
         */
        createOrder: async (orderData) => {
            const krudHelper = Utils.getKrudHelper();
            const payload = {
                ...orderData,
                trangthai: 'new',
                ngaytao: Utils.nowSql()
            };
            return krudHelper.insertRow(API_CONFIG.TABLE_ORDER, payload);
        },

        /**
         * Lấy danh sách ĐƠN HÀNG
         */
        getOrders: async (filters = {}) => {
            const krudHelper = Utils.getKrudHelper();
            return krudHelper.listTable(API_CONFIG.TABLE_ORDER, filters);
        },

        /**
         * Lấy danh sách NHÀ CUNG CẤP
         */
        getProviders: async () => {
            const krudHelper = Utils.getKrudHelper();
            return krudHelper.listTable(API_CONFIG.TABLE_PROVIDER);
        },

        /**
         * CẬP NHẬT ĐƠN HÀNG
         */
        updateOrder: async (id, data) => {
            const krudHelper = Utils.getKrudHelper();
            return krudHelper.updateRow(API_CONFIG.TABLE_ORDER, id, data);
        }
    };

    global.ThoNhaApp = ThoNha;
})(window);
