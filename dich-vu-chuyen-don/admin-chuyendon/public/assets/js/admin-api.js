/**
 * Admin API Helper for Admin Chuyển Dọn
 * Độc lập hoàn toàn, tự nạp KRUD từ CDN.
 */
(function(window) {
    const KRUD_URL = 'https://api.dvqt.vn/js/krud.js';

    // Đảm bảo krud.js được nạp
    async function _ensureKrud() {
        if (typeof window.krud === 'function' && typeof window.krudList === 'function') return true;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = KRUD_URL;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Không thể tải thư viện KRUD từ server.'));
            document.head.appendChild(script);
        });
    }

    const adminApi = {
        /**
         * Lấy danh sách từ bảng
         */
        list: async (tableName, options = {}) => {
            await _ensureKrud();
            const res = await window.krudList({ table: tableName, ...options });
            return (res && res.data) ? res.data : [];
        },

        /**
         * Lấy 1 bản ghi theo ID
         */
        get: async (tableName, id) => {
            await _ensureKrud();
            const res = await window.krudList({ table: tableName, id: id });
            return (res && res.data && res.data.length > 0) ? res.data[0] : null;
        },

        /**
         * Thêm bản ghi mới
         */
        insert: async (tableName, data) => {
            await _ensureKrud();
            return await window.krud('insert', tableName, data);
        },

        /**
         * Cập nhật bản ghi
         */
        update: async (tableName, data, id) => {
            await _ensureKrud();
            return await window.krud('update', tableName, data, id);
        },

        /**
         * Xóa bản ghi
         */
        delete: async (tableName, id) => {
            await _ensureKrud();
            return await window.krud('delete', tableName, { id });
        },

        /**
         * Đảm bảo bảng nguoidung có sẵn
         */
        ensureNguoidungTable: async () => {
            await _ensureKrud();
            return await window.krud('ensure', 'nguoidung', [
                { name: 'hovaten', type: 'text' },
                { name: 'sodienthoai', type: 'text' },
                { name: 'email', type: 'text' },
                { name: 'diachi', type: 'text' },
                { name: 'matkhau', type: 'text' },
                { name: 'vaitro', type: 'text' }, // admin, provider, customer
                { name: 'id_dichvu', type: 'text' },
                { name: 'trangthai', type: 'text' },
                { name: 'created_date', type: 'text' }
            ]);
        },

        /**
         * Đảm bảo bảng đơn hàng chuyển dọn có sẵn
         */
        ensureOrdersTable: async () => {
            await _ensureKrud();
            return await window.krud('ensure', 'dich_vu_chuyen_don_dat_lich', [
                { name: 'ma_yeu_cau_noi_bo', type: 'text' },
                { name: 'ho_ten', type: 'text' },
                { name: 'so_dien_thoai', type: 'text' },
                { name: 'customer_email', type: 'text' },
                { name: 'loai_dich_vu', type: 'text' },
                { name: 'dia_chi_di', type: 'text' },
                { name: 'dia_chi_den', type: 'text' },
                { name: 'ngay_thuc_hien', type: 'text' },
                { name: 'khung_gio_thuc_hien', type: 'text' },
                { name: 'loai_xe', type: 'text' },
                { name: 'thoi_tiet_du_kien', type: 'text' },
                { name: 'dieu_kien_tiep_can', type: 'text' },
                { name: 'chi_tiet_dich_vu', type: 'text' },
                { name: 'khoang_cach_km', type: 'number' },
                { name: 'tong_tam_tinh', type: 'number' },
                { name: 'tong_tien', type: 'number' },
                { name: 'trang_thai', type: 'text' },
                { name: 'ghi_chu', type: 'text' },
                { name: 'anh_dinh_kem', type: 'text' },
                { name: 'video_dinh_kem', type: 'text' },
                { name: 'provider_id', type: 'text' },
                { name: 'accepted_at', type: 'text' },
                { name: 'started_at', type: 'text' },
                { name: 'completed_at', type: 'text' },
                { name: 'cancelled_at', type: 'text' },
                { name: 'created_at', type: 'text' },
                { name: 'updated_at', type: 'text' }
            ]);
        },

        /**
         * Đảm bảo bảng giá chuyển dọn có sẵn
         */
        ensureMovingPricingTables: async () => {
            await _ensureKrud();

            await window.krud('ensure', 'bang_gia_chuyen_don_xe', [
                { name: 'id_dich_vu', type: 'text' },
                { name: 'slug_xe', type: 'text' },
                { name: 'ten_xe', type: 'text' },
                { name: 'gia_mo_cua', type: 'number' },
                { name: 'don_gia_km_6_15', type: 'number' },
                { name: 'don_gia_km_16_30', type: 'number' },
                { name: 'don_gia_km_31_tro_len', type: 'number' },
                { name: 'gia_moi_km_form', type: 'number' },
                { name: 'gia_moi_km_duong_dai_form', type: 'number' },
                { name: 'phi_toi_thieu_form', type: 'number' }
            ]);

            return await window.krud('ensure', 'bang_gia_chuyen_don_muc', [
                { name: 'id_dich_vu', type: 'text' },
                { name: 'nhom', type: 'text' },
                { name: 'slug_muc', type: 'text' },
                { name: 'ten_muc', type: 'text' },
                { name: 'don_gia', type: 'number' }
            ]);
        },

        listMovingPricingVehicles: async (idDichVu = '') => {
            const rows = await adminApi.list('bang_gia_chuyen_don_xe', { limit: 1000 });
            if (!idDichVu) return rows;
            return rows.filter((row) => String(row?.id_dich_vu || '').trim() === String(idDichVu || '').trim());
        },

        listMovingPricingItems: async (idDichVu = '') => {
            const rows = await adminApi.list('bang_gia_chuyen_don_muc', { limit: 1000 });
            if (!idDichVu) return rows;
            return rows.filter((row) => String(row?.id_dich_vu || '').trim() === String(idDichVu || '').trim());
        },

        getMovingPricingVehicleKey: (row) => {
            const serviceId = String(row?.id_dich_vu || '').trim();
            const slug = String(row?.slug_xe || '').trim();
            return serviceId && slug ? `${serviceId}::${slug}` : '';
        },

        getMovingPricingItemKey: (row) => {
            const serviceId = String(row?.id_dich_vu || '').trim();
            const groupKey = String(row?.nhom || '').trim();
            const slug = String(row?.slug_muc || '').trim();
            return serviceId && groupKey && slug ? `${serviceId}::${groupKey}::${slug}` : '';
        },

        saveMovingPricingVehicle: async (row, currentRow = null) => {
            if (currentRow?.id) {
                return adminApi.update('bang_gia_chuyen_don_xe', { ...row, id: currentRow.id }, currentRow.id);
            }
            return adminApi.insert('bang_gia_chuyen_don_xe', row);
        },

        saveMovingPricingItem: async (row, currentRow = null) => {
            if (currentRow?.id) {
                return adminApi.update('bang_gia_chuyen_don_muc', { ...row, id: currentRow.id }, currentRow.id);
            }
            return adminApi.insert('bang_gia_chuyen_don_muc', row);
        },

        deleteMovingPricingVehicle: async (id) => {
            return adminApi.delete('bang_gia_chuyen_don_xe', id);
        },

        deleteMovingPricingItem: async (id) => {
            return adminApi.delete('bang_gia_chuyen_don_muc', id);
        }
    };

    window.adminApi = adminApi;
})(window);
