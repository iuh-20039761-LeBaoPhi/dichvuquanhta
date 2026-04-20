/**
 * Order Service - Trung tâm xử lý lọc đơn hàng toàn hệ thống Thợ Nhà.
 * Hợp nhất logic lọc cho Admin, Nhà cung cấp (NCC) và Khách hàng.
 */
const ThoNhaOrderService = (() => {
    'use strict';

    /**
     * Lấy toàn bộ đơn hàng từ database thông qua ThoNhaKrud.
     * @returns {Promise<Array>} Danh sách đơn hàng thô.
     */
    async function fetchRawOrders() {
        if (!window.DVQTKrud) return [];
        try {
            // Lấy toàn bộ đơn hàng Milestone từ bảng datlich_thonha
            const rows = await window.DVQTKrud.listTable('datlich_thonha');
            return Array.isArray(rows) ? rows : [];
        } catch (e) {
            console.error('[OrderService] Fetch failed:', e);
            return [];
        }
    }

    /**
     * Lọc đơn dành cho Admin - Hiển thị toàn bộ.
     */
    function filterForAdmin(rows) {
        return rows;
    }

    /**
     * Lọc đơn dành cho Nhà cung cấp - Theo đơn đã nhận hoặc đơn đúng danh mục nghề nghiệp.
     * @param {Array} rows - Danh sách đơn thô
     * @param {Object} profile - Hồ sơ thợ { id, categories }
     */
    function filterForProvider(rows, profile) {
        if (!profile || !profile.id) return [];
        const providerId = String(profile.id);
        const cats = String(profile.categories || '').split(',').map(s => s.trim()).filter(Boolean);

        return rows.filter(r => {
            const rowOwner = String(r.id_nhacungcap || '').trim();
            // Điều kiện 1: Đơn đã nhận (Trùng ID thợ)
            if (rowOwner === providerId) return true;
            // Điều kiện 2: Đơn chưa có người nhận (không kiểm tra danh mục nữa)
            return !rowOwner;
        });
    }

    /**
     * Lọc đơn dành cho Khách hàng - Theo số điện thoại đã đặt đơn.
     * @param {Array} rows - Danh sách đơn thô
     * @param {Object} profile - Thông tin khách { phone }
     */
    function filterForCustomer(rows, profile) {
        if (!profile || !profile.phone) return [];
        const phone = String(profile.phone).trim();
        
        return rows.filter(r => {
            // Lọc theo cột Milestone định danh khách hàng mới sdtkhachhang
            return String(r.sdtkhachhang || '').trim() === phone;
        });
    }

    /**
     * Chuẩn hóa số điện thoại để so sánh (Lấy 9 số cuối)
     */
    function normalizePhone(p) {
        return String(p || '').replace(/\D/g, '').slice(-9);
    }
    
    /**
     * Hàm chính: Tải, Lọc và Chuẩn hóa đơn hàng theo vai trò.
     */
    async function getOrders(role, profile) {
        console.log(`[OrderService] Role: ${role}, Phone: ${profile ? profile.phone : 'N/A'}`);
        const rows = await fetchRawOrders();
        
        let filtered = [];
        const utils = window.ThoNhaOrderViewUtils;
        if (!utils) return rows; 

        // Ưu tiên dùng role từ profile nếu có, tránh sai lệch từ shell
        const activeRole = profile && profile.role ? profile.role : role;

        switch (activeRole) {
            case 'admin':    
                filtered = rows; 
                break;
            case 'provider': 
                if (!profile || !profile.id) break;
                const pId = String(profile.id);
                filtered = rows.filter(r => {
                    const owner = String(r.id_nhacungcap || '').trim();
                    // Hiển thị đơn mình đã nhận HOẶC đơn chưa ai nhận (cho phép thầu)
                    return owner === pId || !owner;
                });
                break;
            case 'customer': 
                if (!profile || !profile.phone) break;
                const searchPhone = normalizePhone(profile.phone);
                
                filtered = rows.filter(r => {
                    const dbPhone = normalizePhone(r.sdtkhachhang || r.sodienthoai);
                    return dbPhone && dbPhone === searchPhone;
                });
                break;
        }

        console.log(`[OrderService] Done. Found ${filtered.length} matching orders.`);

        // CHUẨN HÓA: Biến dữ liệu thô thành đối tượng chuẩn UI Milestone
        return filtered.map((row, index) => {
            return utils.mapApiOrderBase(row, index, { includeRaw: true });
        });
    }

    return { getOrders };
})();

// Xuất ra window để các script khác có thể truy cập
window.ThoNhaOrderService = ThoNhaOrderService;
