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

            // Lấy tối đa 1000 bản ghi để lọc (Tránh limit mặc định là 10)
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER, { limit: 1000 });
            const user = rows.find(r => {
                const dbPhone = Utils.normalizePhone(r.sodienthoai || r.phone);
                return dbPhone === Utils.normalizePhone(phone);
            });

            if (!user) throw new Error('Tài khoản không tồn tại trên hệ thống');

            const stored = String(user.matkhau || user.password || user.mat_khau || '');
            if (stored !== password) throw new Error('Mật khẩu không chính xác');

            // Kiểm tra trạng thái tài khoản: 0 = Hoạt động, 1 = Khóa
            if (String(user.trangthai) === '1') {
                throw new Error('Tài khoản của bạn đang bị khóa. Vui lòng liên hệ Admin để được hỗ trợ.');
            }

            const idDichvu = String(user.id_dichvu || '0');
            const role = 'user'; // Không phân biệt KH/NCC, tính năng thêm dựa vào id_dichvu

            const profile = {
                id: user.id,
                name: user.hovaten || user.name || 'Người dùng',
                phone: user.sodienthoai || user.phone || phone,
                email: user.email || '',
                address: user.diachi || user.dia_chi || user.address || '',
                id_dichvu: idDichvu,
                role: role,
                link_avatar: user.link_avatar || '',
                link_cccd_truoc: user.link_cccd_truoc || '',
                link_cccd_sau: user.link_cccd_sau || ''
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
            let u = params.get('sdt') || params.get('u') || params.get('username') || params.get('sodienthoai');
            let p = params.get('password') || params.get('p') || params.get('pass');

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
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER, { limit: 1000 });
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

            // Quy ước mới: 0 = Hoạt động, 1 = Khóa
            const payload = { ...data, created_date: Utils.nowSql(), trangthai: '0' };
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
            const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER, { limit: 1000 });
            return rows.filter(r => String(r.id_dichvu || '0').split(',').includes(String(idDichvu)));
        },

        updateOrder: async (id, data, orderTable) => {
            const krudHelper = Utils.getKrudHelper();
            return krudHelper.updateRow(orderTable, id, data);
        },

        checkAccess: async (roleGroup, phone) => {
            try {
                const krudHelper = Utils.getKrudHelper();
                const rows = await krudHelper.listTable(API_CONFIG.TABLE_USER, { limit: 1000 });
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
        /**
         * Chuẩn hóa tên file: Không dấu, không khoảng trắng, không ký tự lạ
         */
        sanitizeName: (str) => {
            if (!str) return 'file';
            let s = str.toLowerCase();
            s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Xóa dấu tiếng Việt
            s = s.replace(/[đĐ]/g, "d");
            s = s.replace(/[^a-z0-9.]/g, "-"); // Thay ký tự lạ bằng dấu -
            s = s.replace(/-+/g, "-"); // Xóa nhiều dấu - liên tiếp
            s = s.replace(/^-+|-+$/g, ""); // Xóa dấu - ở đầu/cuối
            return s;
        },

        /**
         * Tải file lên Google Drive thông qua Proxy PHP
         * @param {File} fileObj - Đối tượng File lấy từ input[type=file]
         * @param {Object} [options] - Tùy chọn bổ sung
         * @param {number|string} [options.folderKey] - Mã thư mục Drive
         * @param {string} [options.customName] - Tên gợi nhớ (ví dụ: "Sửa máy lạnh")
         * @returns {Promise<Object>} - { success: true, url: '...', fileId: '...' }
         */
        uploadFile: async (fileObj, options) => {
            if (!fileObj) throw new Error('Không có file để tải lên');

            const opts = options || {};
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const ts = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${d.getMilliseconds()}`;
            
            // Lấy phần mở rộng (đuôi file)
            const ext = fileObj.name.split('.').pop().toLowerCase();
            
            // Xử lý tên file cuối cùng: Nếu có customName thì dùng luôn, không tự chèn thêm timestamp nữa
            let finalName = "";
            if (opts.customName) {
                finalName = DVQTCore.sanitizeName(opts.customName) + '.' + ext;
            } else {
                let baseName = fileObj.name.substring(0, fileObj.name.lastIndexOf('.'));
                finalName = DVQTCore.sanitizeName(baseName) + '-' + ts + '.' + ext;
            }

            const formData = new FormData();
            formData.append('file', fileObj);
            formData.append('name', finalName);
            if (opts.folderKey) {
                formData.append('folderKey', opts.folderKey);
            }

            const uploadPath = window.location.origin + ROOT_URL + '/public/upload_to_drive.php';

            try {
                const response = await fetch(uploadPath, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Lỗi phản hồi từ server upload (' + response.status + ')');
                return await response.json();
            } catch (e) {
                console.error('[DVQTApp] Upload failed:', e);
                throw new Error('Không thể tải file lên Drive: ' + e.message);
            }
        },

        /**
         * Chuyển đổi File ID thành Link hiển thị trực tiếp
         * @param {string} fileId - ID file từ Google Drive
         * @returns {string} - URL hiển thị ảnh
         */
        getDriveUrl: (fileId) => {
            if (!fileId) return '';
            const id = String(fileId).trim();
            if (id.startsWith('http')) return id;
            // Định dạng đồng bộ với server PHP và hỗ trợ tốt cho đa tài khoản
            return `https://lh3.googleusercontent.com/u/0/d/${id}`;
        },

        ROOT_URL: ROOT_URL,
        TABLE_USER: API_CONFIG.TABLE_USER
    };

    global.DVQTApp = DVQTCore;
})(window);
