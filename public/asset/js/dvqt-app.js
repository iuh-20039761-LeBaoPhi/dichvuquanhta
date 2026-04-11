(function (global) {
    'use strict';

    /**
     * DVQT APP HELPER
     * Tóm gọn các thao tác nghiệp vụ chính (Đăng nhập, Đăng ký, Đặt lịch, Xem đơn)
     * Dùng chung cho toàn bộ hệ thống Dịch Vụ Quanh Ta.
     */

    /**
     * Tự động xác định BASE PATH của dự án một cách linh hoạt (Generic)
     * Dựa trên vị trí của chính file script này trong cây thư mục.
     */
    const getBaseUrl = () => {
        try {
            const scripts = document.getElementsByTagName('script');
            const targetFile = '/public/asset/js/dvqt-app.js';
            
            for (let i = scripts.length - 1; i >= 0; i--) {
                const src = scripts[i].src;
                if (src.toLowerCase().includes(targetFile)) {
                    // Sử dụng URL object để parse chính xác pathname
                    const url = new URL(src, window.location.origin);
                    const path = url.pathname;
                    const idx = path.toLowerCase().indexOf(targetFile);
                    
                    if (idx !== -1) {
                        const base = path.substring(0, idx);
                        // Trả về chuỗi rỗng nếu là root, hoặc "/foldername"
                        return base === '/' ? '' : base.replace(/\/$/, '');
                    }
                }
            }
        } catch (e) {
            console.warn('[DVQTApp] Error auto-detecting base URL:', e);
        }
        
        // Fallback cuối cùng: thử đoán từ window.location
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] && !pathParts[1].includes('.')) {
             return '/' + pathParts[1];
        }
        return '';
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
            // Đặt path=/ để dùng chung trên toàn bộ domain
            document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
        },
        getCookie: (name) => {
            const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : null;
        },

        /** Lấy thời gian hiện tại theo định dạng SQL (YYYY-MM-DD HH:mm:ss) */
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
         * Xử lý ĐĂNG NHẬP
         */
        login: async (phone, password) => {
            const krudHelper = Utils.getKrudHelper();
            await krudHelper.ensureNguoidungTable();

            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER);
            const user = rows.find(r => {
                const dbPhone = Utils.normalizePhone(r.sodienthoai || r.phone);
                return dbPhone === Utils.normalizePhone(phone);
            });

            if (!user) throw new Error('Tài khoản không tồn tại trên hệ thống');

            const stored = String(user.matkhau || user.password || user.mat_khau || '');
            if (stored !== password) throw new Error('Mật khẩu không chính xác');

            const idDichvu = String(user.id_dichvu || '0');
            const role = (idDichvu === '0' || idDichvu === '') ? 'customer' : 'provider';

            const profile = {
                id: user.id,
                name: user.hovaten || user.name || 'Người dùng',
                phone: user.sodienthoai || user.phone || phone,
                email: user.email || '',
                address: user.diachi || user.dia_chi || user.address || '',
                id_dichvu: idDichvu,
                role: role,
                avatartenfile: user.avatartenfile || '',
                cccdmattruoctenfile: user.cccdmattruoctenfile || '',
                cccdmatsautenfile: user.cccdmatsautenfile || ''
            };

            Utils.setCookie('dvqt_u', phone);
            Utils.setCookie('dvqt_p', password);

            return profile;
        },

        /**
         * Kiểm tra trạng thái & Tự động đăng nhập
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
                    const profile = await DVQTCore.login(u, p);
                    return { logged_in: true, ...profile, profile };
                } catch (e) {
                    console.warn('[DVQTApp] Auto-login failed:', e.message);
                }
            }
            return { logged_in: false };
        },

        /**
         * Kiểm tra số điện thoại tồn tại
         */
        isAccountExists: async (phone) => {
            const krudHelper = Utils.getKrudHelper();
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER);
            const phoneNorm = Utils.normalizePhone(phone);
            return rows.some(r => Utils.normalizePhone(r.sodienthoai || r.phone) === phoneNorm);
        },

        /**
         * ĐĂNG KÝ
         */
        register: async (data) => {
            const krudHelper = Utils.getKrudHelper();
            await krudHelper.ensureNguoidungTable();
            const exists = await DVQTCore.isAccountExists(data.sodienthoai || data.phone);
            if (exists) throw new Error('Số điện thoại này đã được đăng ký.');

            const payload = { ...data, created_date: Utils.nowSql(), trangthai: 'active' };
            return krudHelper.insertRow(API_CONFIG.TABLE_USER, payload);
        },

        /**
         * Đặt lịch
         */
        createOrder: async (orderData, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            const table = orderTable || API_CONFIG.TABLE_ORDER;
            const payload = { ...orderData, ngaytao: Utils.nowSql() };
            return krudHelper.insertRow(table, payload);
        },

        getOrders: async (filters = {}, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            return krudHelper.listTable(orderTable, filters);
        },

        getProviders: async (idDichvu) => {
            const krudHelper = Utils.getKrudHelper();
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER);
            return rows.filter(r => String(r.id_dichvu || '0').split(',').includes(String(idDichvu)));
        },

        updateOrder: async (id, data, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            return krudHelper.updateRow(orderTable, id, data);
        },

        checkAccess: async (roleGroup, phone) => {
            try {
                const krudHelper = Utils.getKrudHelper();
                const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER);
                const user = rows.find(r => Utils.normalizePhone(r.sodienthoai || r.phone) === Utils.normalizePhone(phone));
                if (!user) return false;
                
                const ROLE_MAP = { 'nhacungcap_thuexe': '10', 'nhacungcap_thonha': '9' };
                const targetId = ROLE_MAP[roleGroup] || roleGroup;
                return String(user.id_dichvu || '0').split(',').includes(String(targetId));
            } catch (e) { return false; }
        },

        logout: () => {
            Utils.setCookie('dvqt_u', '', -1);
            Utils.setCookie('dvqt_p', '', -1);
            localStorage.clear(); 
            return true;
        },

        getCookie: (name) => Utils.getCookie(name),
        setCookie: (name, value, days) => Utils.setCookie(name, value, days),
        getApiPath: (suffix) => Utils.getApiPath(suffix),
        ROOT_URL: ROOT_URL,
        TABLE_USER: API_CONFIG.TABLE_USER
    };

    global.DVQTApp = DVQTCore;
})(window);
