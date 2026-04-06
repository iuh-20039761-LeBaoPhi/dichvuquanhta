(function (global) {
    'use strict';

    /**
     * DVQT APP HELPER
     * Tóm gọn các thao tác nghiệp vụ chính (Đăng nhập, Đăng ký, Đặt lịch, Xem đơn)
     * Dùng chung cho toàn bộ hệ thống Dịch Vụ Quanh Ta.
     * Dựa trên nền tảng thư viện dvqt-krud.js
     */

    const API_CONFIG = {
        TABLE_CUSTOMER: 'khachhang',
        TABLE_PROVIDER: '', // Cần được truyền vào từ dịch vụ con
        TABLE_ORDER: '',
        API_BASE: '/Test/public/api/' // Sử dụng đường dẫn tuyệt đối từ web root
    };

    /**
     * Các hàm tiện ích dùng nội bộ
     */
    const Utils = {
        /** Chuẩn hóa số điện thoại (chỉ giữ lại số) */
        normalizePhone: (p) => String(p || '').replace(/\D/g, ''),

        /** Lấy thời gian hiện tại theo định dạng SQL (YYYY-MM-DD HH:mm:ss) theo múi giờ VN */
        nowSql: () => {
            const d = new Date();
            const vnNow = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
            const pad = (n) => String(n).padStart(2, '0');
            return `${vnNow.getFullYear()}-${pad(vnNow.getMonth() + 1)}-${pad(vnNow.getDate())} ${pad(vnNow.getHours())}:${pad(vnNow.getMinutes())}:${pad(vnNow.getSeconds())}`;
        },

        /** Lấy đối tượng KrudHelper (chỉ dùng DVQTKrud) */
        getKrudHelper: () => {
            const helper = global.DVQTKrud || window.DVQTKrud;
            if (!helper) throw new Error('Thư viện DVQTKrud chưa được nạp. Vui lòng kiểm tra file dvqt-krud.js');
            return helper;
        },

        /** Sinh đường dẫn API linh hoạt */
        getApiPath: (suffix) => {
            // Nếu đang chạy local trên XAMPP với folder /Test/
            const base = window.location.origin + '/Test/public/api/';
            return base + suffix;
        }
    };

    const DVQTCore = {
        /**
         * Xử lý ĐĂNG NHẬP (Dùng chung cho cả Khách hàng và Nhà cung cấp)
         * @param {string} role - 'customer' hoặc 'provider'
         * @param {string} phone - Số điện thoại
         * @param {string} password - Mật khẩu
         * @param {string} providerTable - Tên bảng NCC nếu role là provider
         * @returns {Promise<Object>} Thông tin profile người dùng
         */
        login: async (role, phone, password, providerTable) => {
            const table = (role === 'customer') ? API_CONFIG.TABLE_CUSTOMER : (providerTable || role);
            if (!table) throw new Error('Tên bảng xác thực không được để trống.');

            const krudHelper = Utils.getKrudHelper();

            // 1. Tìm tài khoản
            const rows = await krudHelper.listTable(table);
            console.log(`[DVQTApp] Data from table "${table}":`, rows);
            
            const user = rows.find(r => {
                const input = phone.toLowerCase().trim();
                if (role === 'admin') {
                    // Admin: Cho phép dùng Email hoặc SĐT
                    const dbEmail = (r.email || r.username || '').toLowerCase().trim();
                    const dbPhone = Utils.normalizePhone(r.sodienthoai || r.phone);
                    return dbEmail === input || dbPhone === Utils.normalizePhone(input);
                } else {
                    // Khách hàng & NCC: Chỉ dùng SĐT
                    const dbPhone = Utils.normalizePhone(r.sodienthoai || r.phone);
                    return dbPhone === Utils.normalizePhone(input);
                }
            });

            if (!user) throw new Error('Tài khoản không tồn tại trên hệ thống');

            // 2. Kiểm tra mật khẩu
            const stored = String(user.matkhau || user.password || user.mat_khau || '');
            const isMatch = stored.startsWith('sha256$') ? (stored === 'sha256$' + password) : (stored === password);
            if (!isMatch) throw new Error('Mật khẩu không chính xác');

            // 3. Kiểm tra trạng thái tài khoản (chỉ với provider)
            if (role === 'provider') {
                const status = String(user.trangthai || '').toLowerCase();
                if (status === 'pending') throw new Error('Tài khoản đang chờ duyệt.');
                if (status === 'locked' || status === 'banned') throw new Error('Tài khoản đã bị khóa.');
            }

            // 4. Chuẩn bị thông tin profile
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

            // 5. Đồng bộ Session lên Server (PHP)
            const sessionRes = await fetch(Utils.getApiPath('auth/login-session.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: role,
                    id: profile.id,
                    name: profile.name,
                    phone: profile.phone,
                    extra: {
                        address: profile.address,
                        company: profile.company
                    }
                })
            });
            const sData = await sessionRes.json();
            if (!sData.success) {
                throw new Error(sData.message || 'Lỗi hệ thống khi tạo phiên làm việc');
            }

            // 6. Cập nhật cache local
            global._dvqt_session_cache = null;

            // 7. Lưu vào LocalStorage (Dùng cho cả DVQT và dự án con)
            if (role === 'customer') {
                localStorage.setItem('customer_logged_in', 'true');
                localStorage.setItem('customer_id', profile.id);
                localStorage.setItem('dvqt_customer_profile', JSON.stringify(profile));
            } else if (role === 'provider') {
                localStorage.setItem('provider_logged_in', 'true');
                localStorage.setItem('provider_id', profile.id);
                localStorage.setItem('dvqt_provider_profile', JSON.stringify(profile));
            } else if (role === 'admin') {
                localStorage.setItem('admin_logged_in', 'true');
                localStorage.setItem('admin_username', profile.name);
            }

            return profile;
        },

        /**
         * Kiểm tra trạng thái đăng nhập (Gọi API Server)
         * @param {boolean} forceRefresh - Nếu true sẽ bỏ qua cache và gọi lại Server
         * @returns {Promise<Object>} Trạng thái session (logged_in, role, user_id, ...)
         */
        checkSession: async (forceRefresh = false) => {
            if (!forceRefresh && global._dvqt_session_cache && global._dvqt_session_cache.logged_in) {
                return global._dvqt_session_cache;
            }

            const checkPath = Utils.getApiPath('public/check-session.php');
            try {
                const res = await fetch(checkPath, { cache: 'no-store' });
                const data = await res.json();

                if (data && data.logged_in) {
                    global._dvqt_session_cache = data;
                } else {
                    global._dvqt_session_cache = null;
                }
                return data;
            } catch (e) {
                console.warn('Không thể kiểm tra phiên đăng nhập:', e);
                global._dvqt_session_cache = null;
            }
            return { logged_in: false };
        },

        /**
         * Xử lý ĐĂNG KÝ tài khoản mới
         * @param {string} role - 'customer' hoặc 'provider'
         * @param {Object} data - Dữ liệu đăng ký
         * @param {string} providerTable - Tên bảng NCC nếu role là provider
         */
        register: async (role, data, providerTable) => {
            const table = role === 'customer' ? API_CONFIG.TABLE_CUSTOMER : (providerTable || API_CONFIG.TABLE_PROVIDER);
            if (!table) throw new Error('Tên bảng người cung cấp không được để trống.');

            const krudHelper = Utils.getKrudHelper();

            const payload = {
                ...data,
                created_date: Utils.nowSql(),
                trangthai: (role === 'customer' ? 'active' : 'pending')
            };
            return krudHelper.insertRow(table, payload);
        },

        /**
         * Tạo ĐƠN HÀNG mới (Đặt lịch)
         * @param {Object} orderData - Dữ liệu đơn hàng
         * @param {string} orderTable - Bảng đơn hàng của dịch vụ con (Bắt buộc)
         */
        createOrder: async (orderData, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            const table = orderTable || API_CONFIG.TABLE_ORDER;
            if (!table) throw new Error('Tên bảng đơn hàng không được để trống.');

            const payload = {
                ...orderData,
                ngaytao: Utils.nowSql()
            };
            return krudHelper.insertRow(table, payload);
        },

        /**
         * Lấy danh sách ĐƠN HÀNG theo bộ lọc
         * @param {Object} filters - Bộ lọc
         * @param {string} orderTable - Bảng đơn hàng của dịch vụ con (Bắt buộc)
         */
        getOrders: async (filters = {}, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            const table = orderTable || API_CONFIG.TABLE_ORDER;
            if (!table) throw new Error('Tên bảng truy vấn đơn hàng không được để trống.');

            return krudHelper.listTable(table, filters);
        },

        /**
         * Lấy danh sách Nhà cung cấp (NCC)
         * @param {string} providerTable - Tên bảng NCC của dịch vụ con (VD: nhacungcap_thonha)
         * @returns {Promise<Array>}
         */
        getProviders: async (providerTable) => {
            const krudHelper = Utils.getKrudHelper();
            if (!providerTable) throw new Error('Tên bảng nhà cung cấp không được để trống.');
            return krudHelper.listTable(providerTable);
        },

        /**
         * Kiểm tra quyền truy cập của NCC vào một dịch vụ cụ thể
         * @param {string} tableName - Bảng NCC của dịch vụ con (VD: nhacungcap_mevabe)
         * @param {string} phone - Số điện thoại NCC cần kiểm tra
         * @returns {Promise<boolean>}
         */
        checkAccess: async (tableName, phone) => {
            const krudHelper = Utils.getKrudHelper();
            const rows = await krudHelper.listTable(tableName);
            const provider = rows.find(r => Utils.normalizePhone(r.sodienthoai) === Utils.normalizePhone(phone));
            return !!provider;
        },

        /**
         * Cập nhật trạng thái hoặc dữ liệu ĐƠN HÀNG
         * @param {number|string} id - ID đơn hàng
         * @param {Object} data - Dữ liệu cập nhật
         * @param {string} orderTable - Bảng đơn hàng của dịch vụ con (Bắt buộc)
         */
        updateOrder: async (id, data, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            const table = orderTable || API_CONFIG.TABLE_ORDER;
            if (!table) throw new Error('Tên bảng đơn hàng cần cập nhật không được để trống.');

            return krudHelper.insertRow(table, data, id);
        },

        /**
         * Xử lý ĐĂNG XUẤT chính thức
         * @returns {Promise<boolean>}
         */
        logout: async () => {
            try {
                const logoutPath = Utils.getApiPath('auth/logout.php');
                const res = await fetch(logoutPath);
                const data = await res.json();

                if (data.success) {
                    // Xóa cache và localStorage
                    global._dvqt_session_cache = null;
                    localStorage.removeItem('customer_logged_in');
                    localStorage.removeItem('customer_id');
                    localStorage.removeItem('dvqt_customer_profile');
                    localStorage.removeItem('provider_logged_in');
                    localStorage.removeItem('provider_id');
                    localStorage.removeItem('dvqt_provider_profile');
                    return true;
                }
            } catch (e) {
                console.warn('Lỗi khi thực hiện đăng xuất:', e);
            }
            return false;
        },

        // Tiện ích export helpers nếu cần (như getApiPath)
        getApiPath: (suffix) => Utils.getApiPath(suffix)
    };

    // Export đối tượng global duy nhất
    global.DVQTApp = DVQTCore;
})(window);
