/**
 * Order Service - Trung tâm lấy và lọc đơn hàng Thợ Nhà.
 * 
 * LUỒNG LỌC ĐƠN:
 * - Customer: Lấy SĐT từ cookie dvqt_u → so khớp cột sdtkhachhang trong datlich_thonha
 * - Provider (id_dichvu=9): Lấy user ID từ session → lọc đơn đã nhận (id_nhacungcap = userId)
 *   + đơn chưa ai nhận (id_nhacungcap rỗng/0)
 * - Admin: Toàn bộ đơn
 */
const ThoNhaOrderService = (() => {
    'use strict';

    /**
     * Đọc cookie theo tên
     */
    function getCookie(name) {
        var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? v[2] : '';
    }

    /**
     * Chuẩn hóa SĐT: chỉ giữ 9 số cuối để so sánh chính xác
     */
    function normalizePhone(p) {
        return String(p || '').replace(/\D/g, '').slice(-9);
    }

    /**
     * Lấy toàn bộ đơn hàng từ bảng datlich_thonha
     */
    async function fetchAllOrders() {
        if (!window.DVQTKrud) return [];
        try {
            const rows = await window.DVQTKrud.listTable('datlich_thonha', { limit: 2000 });
            return Array.isArray(rows) ? rows : [];
        } catch (e) {
            console.error('[OrderService] Fetch failed:', e);
            return [];
        }
    }

    /**
     * Hàm chính: Tải, Lọc và Chuẩn hóa đơn hàng theo vai trò.
     * @param {string} role - 'customer' | 'provider' | 'admin'
     * @param {Object} profile - Hồ sơ người dùng { id, phone, ... }
     */
    async function getOrders(role, profile) {
        const cookiePhone = getCookie('dvqt_u');
        console.log(`[OrderService] Role: ${role}, Cookie dvqt_u: ${cookiePhone}`);

        const allRows = await fetchAllOrders();
        let filtered = [];

        const utils = window.ThoNhaOrderViewUtils;
        if (!utils) return allRows;

        if (role === 'admin') {
            // Admin: xem tất cả
            filtered = allRows;

        } else if (role === 'customer') {
            // Customer: lọc theo SĐT trong cookie dvqt_u = sdtkhachhang trong bảng
            const searchPhone = normalizePhone(cookiePhone || (profile && profile.phone));
            if (!searchPhone) {
                console.warn('[OrderService] Không tìm thấy SĐT từ cookie dvqt_u');
                return [];
            }

            filtered = allRows.filter(r => {
                const dbPhone = normalizePhone(r.sdtkhachhang || r.sodienthoai);
                return dbPhone && dbPhone === searchPhone;
            });

        } else if (role === 'provider') {
            // Provider: lọc đơn đã nhận (trùng ID) + đơn chưa ai nhận phù hợp danh mục
            const userId = profile && profile.id ? String(profile.id) : '';
            if (!userId) {
                console.warn('[OrderService] Không có user ID cho provider');
                return [];
            }

            // Tải danh mục để xem mình được làm những gì
            let myCategoryIds = [];
            try {
                const cats = await window.DVQTKrud.listTable('danhmuc_thonha');
                myCategoryIds = cats
                    .filter(c => String(c.id_nguoidung || '').split(',').map(s => s.trim()).includes(userId))
                    .map(c => String(c.id));
            } catch (e) {
                console.error('[OrderService] Load categories failed:', e);
            }

            filtered = allRows.filter(r => {
                const owner = String(r.id_nhacungcap || '').trim();
                const isMine = owner === userId;
                const isUnassigned = !owner || owner === '0' || owner === 'null';

                if (isMine) return true; // Đã nhận thì luôn hiện
                if (isUnassigned) {
                    // Đơn mới: chỉ hiện nếu danh mục đơn hàng nằm trong danh sách đăng ký của mình
                    const orderCatId = String(r.id_danhmuc || '');
                    return myCategoryIds.includes(orderCatId);
                }
                return false;
            });
        }

        console.log(`[OrderService] Tìm thấy ${filtered.length} đơn hàng.`);

        // Tải toàn bộ danh mục để lấy tên (nếu chưa nạp ở trên)
        let categoryMap = {};
        let userAvatarMap = { id: {}, phone: {} };

        try {
            // 1. Map danh mục
            const allCats = (role === 'provider' && typeof cats !== 'undefined') ? cats : await window.DVQTKrud.listTable('danhmuc_thonha');
            allCats.forEach(c => {
                categoryMap[String(c.id)] = c.ten_danhmuc;
            });

            // 2. Map người dùng để lấy Avatar (Ncc và Khách hàng)
            const allUsers = await window.DVQTKrud.listTable('nguoidung', { limit: 2000 });
            allUsers.forEach(u => {
                const avatar = u.link_avatar || u.avatar || u.avatartenfile || '';
                if (!avatar) return;
                
                if (u.id) userAvatarMap.id[String(u.id)] = avatar;
                const p = normalizePhone(u.sodienthoai || u.phone);
                if (p) userAvatarMap.phone[p] = avatar;
            });
        } catch (e) {
            console.error('[OrderService] Load metadata for mapping failed:', e);
        }

        // Chuẩn hóa dữ liệu thô thành đối tượng UI
        return filtered.map((row, index) => {
            const order = utils.mapApiOrderBase(row, index, { 
                includeRaw: true,
                categoryMap: categoryMap 
            });

            // Nhúng Avatar khách hàng (Theo SĐT)
            const cPhone = normalizePhone(row.sdtkhachhang || row.sodienthoai);
            if (cPhone && userAvatarMap.phone[cPhone]) {
                order.customer.avatar = userAvatarMap.phone[cPhone];
            }

            // Nhúng Avatar Nhà cung cấp (Theo ID)
            const pId = String(row.id_nhacungcap || '').trim();
            if (pId && pId !== '0' && userAvatarMap.id[pId]) {
                order.provider.avatar = userAvatarMap.id[pId];
            }

            return order;
        });
    }

    return { getOrders };
})();

window.ThoNhaOrderService = ThoNhaOrderService;

