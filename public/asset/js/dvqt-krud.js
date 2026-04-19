/**
 * DVQT KRUD HELPER (Bản rút gọn - Tối ưu cho Browser)
 */
window.DVQTKrud = (function () {
    'use strict';

    const SCRIPT_URL = 'https://api.dvqt.vn/js/krud.js';

    // Đảm bảo krud.js (gốc) đã được nạp
    async function _ensure() {
        if (typeof window.krud === 'function' && typeof window.krudList === 'function') return;
        
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', () => reject(new Error('Lỗi nạp KRUD core')), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = SCRIPT_URL;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Không thể nạp KRUD core'));
            document.head.appendChild(script);
        });
    }

    // Tiện ích lấy dữ liệu
    const _getData = (res) => {
        if (res.error || res.success === false) throw new Error(res.error || res.message || 'Lỗi hệ thống');
        return res.data || res.rows || res.list || res || [];
    };

    return {
        // Lấy danh sách
        listTable: async (tableName, options = {}) => {
            await _ensure();
            const res = await window.krudList({ table: tableName, ...options });
            return _getData(res);
        },

        // Thêm/Sửa/Xóa
        runAction: async (action, tableName, data = {}, id = null) => {
            await _ensure();
            const res = await window.krud(action, tableName, data, id);
            if (res.error || res.success === false) throw new Error(res.error || res.message || 'Thao tác thất bại');
            return res;
        },

        // Kiểm tra và tạo bảng nếu chưa có
        ensureTable: async (tableName, fields) => {
            await _ensure();
            let tableExists = false;
            try {
                const res = await window.krudList({ table: tableName, limit: 1 });
                if (res && !res.error) {
                    tableExists = true;
                } else if (res && res.error && (res.error.includes('1146') || res.error.includes('42S02') || res.error.includes('not found'))) {
                    // Lỗi thiếu bảng, cần tạo
                    tableExists = false;
                } else {
                    // Lỗi khác không liên quan đến thiếu bảng
                    return res;
                }
            } catch (e) {
                tableExists = false;
            }

            if (!tableExists) {
                console.log(`[DVQTKrud] Bảng ${tableName} không tồn tại, đang khởi tạo...`);
                return await window.krud('create', tableName, fields);
            }
        },

        // Chuyên biệt cho bảng nguoidung
        ensureNguoidungTable: async () => {
            const fields = {
                hovaten: 'text',
                sodienthoai: 'text',
                email: 'text',
                diachi: 'text',
                matkhau: 'text',
                maplat: 'text',
                maplng: 'text',
                created_date: 'datetime',
                link_avatar: 'text',
                link_cccd_truoc: 'text',
                link_cccd_sau: 'text',
                id_dichvu: 'text',
                trangthai: 'text',
                motadichvu: 'text'
            };
            return window.DVQTKrud.ensureTable('nguoidung', fields);
        },

        // Chuyên biệt cho bảng datlich_thonha
        ensureDatlichThonhaTable: async () => {
            const fields = {
                tenkhachhang: 'text',
                sdtkhachhang: 'text',
                diachikhachhang: 'text',
                emailkhachhang: 'text',
                id_danhmuc: 'int',
                id_dichvu: 'int',
                tendichvu: 'text',
                thuonghieu: 'text',
                ghichu: 'text',
                giadichvu: 'int',
                phidichuyen: 'int',
                quangduongkm: 'float',
                trangthaidichuyen: 'text',
                phikhaosat: 'int',
                tongtien: 'int',
                ngaydat: 'datetime',
                link_hinhanh_khachhang: 'text', // ID Drive ảnh lúc đặt đơn
                
                // Thông tin NCC nhận đơn
                id_nhacungcap: 'int',
                tenncc: 'text',
                sdtncc: 'text',
                diachincc: 'text',
                ngaynhan: 'datetime',

                // Quá trình thực hiện
                ngaybatdauthucte: 'datetime',
                ngaythuchienthucte: 'datetime',
                ngayhoanthanhthucte: 'datetime',
                ngayhuy: 'datetime',

                // Tài chính thực tế
                chiphithucte: 'int',
                sotientrogia: 'int',
                khachthanhtoan: 'int',

                // Đánh giá & Phản hồi
                danhgiakhachhang: 'text',       // Nội dung text khách đánh giá
                hinhanhminhchung_kh: 'text',    // ID Drive ảnh khách gửi
                danhgiancc: 'text',             // Nội dung text thợ báo cáo
                hinhanhminhchung_ncc: 'text'    // ID Drive ảnh thợ gửi
            };
            return window.DVQTKrud.ensureTable('datlich_thonha', fields);
        },

        // Các hàm viết tắt
        insertRow: (table, data) => window.DVQTKrud.runAction('insert', table, data),
        updateRow: (table, id, data) => window.DVQTKrud.runAction('update', table, data, id),
        deleteRow: (table, id) => window.DVQTKrud.runAction('delete', table, {}, id)
    };
})();
