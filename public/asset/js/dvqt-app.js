(function (global) {
    'use strict';

    /**
     * DVQT APP HELPER
     * Tóm gọn các thao tác nghiệp vụ chính (Đăng nhập, Đăng ký, Đặt lịch, Xem đơn)
     * Dùng chung cho toàn bộ hệ thống Dịch Vụ Quanh Ta.
     * Dựa trên nền tảng thư viện dvqt-krud.js
     * 
     * PHIÊN BẢN MỚI: Tất cả người dùng nằm trong bảng duy nhất "nguoidung".
     * Không phân chia customer/provider. Cột id_dichvu quyết định vai trò.
     */

    /**
     * Tự động xác định BASE PATH của dự án
     */
    const getBaseUrl = () => {
        let base = '/Test';
        try {
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const src = scripts[i].src;
                if (src.includes('/public/asset/js/dvqt-app.js')) {
                    const url = new URL(src);
                    const path = url.pathname;
                    const idx = path.indexOf('/public/asset/js/dvqt-app.js');
                    if (idx !== -1) {
                        base = path.substring(0, idx);
                        if (base === '') base = '';
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('[DVQTApp] Không thể tự động xác định Base URL, dùng mặc định /Test');
        }
        return base.replace(/\/$/, '');
    };

    const ROOT_URL = getBaseUrl();

    const API_CONFIG = {
        TABLE_USER: 'nguoidung',
        TABLE_ORDER: '',
        API_BASE: ROOT_URL + '/public/api/'
    };

    /**
     * Các hàm tiện ích dùng nội bộ
     */
    const Utils = {
        /** Chuẩn hóa số điện thoại (chỉ giữ lại số) */
        normalizePhone: (p) => String(p || '').replace(/\D/g, ''),

        /** Tiện ích Cookie */
        setCookie: (name, value, days = 7) => {
            const d = new Date();
            d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
        },
        getCookie: (name) => {
            const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        },

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
            return window.location.origin + ROOT_URL + '/public/api/' + suffix;
        }
    };

    const DVQTCore = {
        /**
         * Xử lý ĐĂNG NHẬP (Đơn giản hoá)
         * Chỉ cần SĐT + Mật khẩu → gọi krudList bảng nguoidung → so khớp → lưu localStorage.
         * @param {string} phone - Số điện thoại
         * @param {string} password - Mật khẩu
         * @returns {Promise<Object>} Thông tin profile người dùng
         */
        login: async (phone, password) => {
            const krudHelper = Utils.getKrudHelper();
            await krudHelper.ensureNguoidungTable();

            // 1. Lấy danh sách từ bảng nguoidung
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER);
            console.log(`[DVQTApp] Data from table "${API_CONFIG.TABLE_USER}":`, rows);

            // 2. Tìm user theo SĐT
            const user = rows.find(r => {
                const dbPhone = Utils.normalizePhone(r.sodienthoai || r.phone);
                return dbPhone === Utils.normalizePhone(phone);
            });

            if (!user) throw new Error('Tài khoản không tồn tại trên hệ thống');

            // 3. So khớp mật khẩu (đơn giản, plain text)
            const stored = String(user.matkhau || user.password || user.mat_khau || '');
            if (stored !== password) throw new Error('Mật khẩu không chính xác');

            // 4. Chuẩn bị thông tin profile
            const profile = {
                id: user.id,
                name: user.hovaten || user.name || 'Người dùng',
                phone: user.sodienthoai || user.phone || phone,
                email: user.email || '',
                address: user.diachi || user.dia_chi || user.address || '',
                id_dichvu: user.id_dichvu || 0,
                company: user.tencua_hang || user.company || '',
                danh_muc_thuc_hien: user.danh_muc_thuc_hien || '',
                avatartenfile: user.avatartenfile || '',
                cccdmattruoctenfile: user.cccdmattruoctenfile || '',
                cccdmatsautenfile: user.cccdmatsautenfile || ''
            };

            // 5. Lưu vào Cookie & LocalStorage
            Utils.setCookie('dvqt_u', phone);
            Utils.setCookie('dvqt_p', password);

            localStorage.setItem('dvqt_logged_in', 'true');
            localStorage.setItem('dvqt_user_id', profile.id);
            localStorage.setItem('dvqt_user_profile', JSON.stringify(profile));

            return profile;
        },

        /**
         * Kiểm tra trạng thái & Tự động đăng nhập
         * Thứ tự ưu tiên: URL params (u/p) > Cookies (dvqt_u/p) > LocalStorage
         * @returns {Promise<Object>} Trạng thái đăng nhập
         */
        checkSession: async () => {
            const params = new URLSearchParams(window.location.search);
            let u = params.get('u') || params.get('username');
            let p = params.get('p') || params.get('pass');

            if (!u || !p) {
                u = Utils.getCookie('dvqt_u');
                p = Utils.getCookie('dvqt_p');
            }

            if (u && p) {
                try {
                    // Thử đăng nhập tự động bằng credential tìm thấy
                    const profile = await DVQTCore.login(u, p);
                    return { logged_in: true, ...profile, profile };
                } catch (e) {
                    console.warn('[DVQTApp] Auto-login failed:', e.message);
                }
            }

            // Fallback về localStorage cũ
            const loggedIn = localStorage.getItem('dvqt_logged_in') === 'true';
            if (!loggedIn) return { logged_in: false };

            try {
                const profile = JSON.parse(localStorage.getItem('dvqt_user_profile') || '{}');
                return {
                    logged_in: true,
                    user_id: profile.id || localStorage.getItem('dvqt_user_id'),
                    name: profile.name || '',
                    phone: profile.phone || '',
                    id_dichvu: profile.id_dichvu || 0,
                    profile: profile
                };
            } catch (e) {
                return { logged_in: false };
            }
        },

        /**
         * Xử lý ĐĂNG KÝ tài khoản mới
         * @param {Object} data - Dữ liệu đăng ký (bao gồm id_dichvu)
         */
        register: async (data) => {
            const krudHelper = Utils.getKrudHelper();
            await krudHelper.ensureNguoidungTable();
            const payload = {
                ...data,
                created_date: Utils.nowSql(),
                trangthai: 'active'
            };
            return krudHelper.insertRow(API_CONFIG.TABLE_USER, payload);
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
         * Lấy danh sách Nhà cung cấp từ bảng nguoidung theo id_dichvu
         * @param {number} idDichvu - ID dịch vụ (1-11)
         * @returns {Promise<Array>}
         */
        getProviders: async (idDichvu) => {
            const krudHelper = Utils.getKrudHelper();
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER);
            return rows.filter(r => {
                const ids = String(r.id_dichvu || '0').split(',');
                return ids.includes(String(idDichvu));
            });
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

            return krudHelper.updateRow(table, id, data);
        },

        /**
         * Xử lý ĐĂNG XUẤT
         * @returns {boolean}
         */
        /**
         * Auth Guard: Chốt chặn bảo mật đơn giản
         * Kiểm tra nếu chưa đăng nhập thì đuổi về trang login.
         * Nếu tự động đăng nhập thành công từ URL/Cookie thì đẩy vào trang cá nhân.
         */
        initAuthGuard: async () => {
            const session = await DVQTCore.checkSession();
            const isLoginPage = window.location.pathname.includes('dang-nhap.html');

            if (session.logged_in) {
                // Nếu đang ở trang login mà đã login rồi -> bay vào trang cá nhân
                if (isLoginPage) {
                    const target = session.id_dichvu && session.id_dichvu !== '0' 
                        ? 'tho-nha/pages/provider/trang-ca-nhan.html' 
                        : 'app.html'; // Hoặc trang cá nhân khách hàng
                    window.location.href = ROOT_URL + '/' + target;
                }
            } else {
                // Nếu chưa login mà không phải trang login -> đuổi về login
                if (!isLoginPage && !window.location.pathname.includes('dang-ky.html')) {
                    window.location.href = ROOT_URL + '/public/dang-nhap.html';
                }
            }
            return session;
        },

        logout: () => {
            Utils.setCookie('dvqt_u', '', -1);
            Utils.setCookie('dvqt_p', '', -1);
            localStorage.removeItem('dvqt_logged_in');
            localStorage.removeItem('dvqt_user_id');
            localStorage.removeItem('dvqt_user_profile');
            // Xóa luôn các key cũ nếu còn sót
            localStorage.removeItem('customer_logged_in');
            localStorage.removeItem('customer_id');
            localStorage.removeItem('dvqt_customer_profile');
            localStorage.removeItem('provider_logged_in');
            localStorage.removeItem('provider_id');
            localStorage.removeItem('dvqt_provider_profile');
            localStorage.removeItem('admin_logged_in');
            localStorage.removeItem('admin_username');
            return true;
        },

        // Tiện ích export
        getApiPath: (suffix) => Utils.getApiPath(suffix),
        ROOT_URL: ROOT_URL,
        TABLE_USER: API_CONFIG.TABLE_USER
    };

    // Export đối tượng global duy nhất
    global.DVQTApp = DVQTCore;
})(window);
