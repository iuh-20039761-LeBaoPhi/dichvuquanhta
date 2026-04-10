/**
 * THUÊ XE - ADMIN CORE LOGIC
 * Xử lý mọi nghiệp vụ quản trị hệ thống
 */
window.ThueXeAdmin = (function () {
    'use strict';

    const TABLES = {
        CARS: 'xethue',
        ORDERS: 'datlich_thuexe',
        USERS: 'nguoidung'
    };

    return {
        // 1. NGHIỆP VỤ QUẢN LÝ XE
        approveCar: async function (id) {
            return this.updateStatus(TABLES.CARS, id, 'approved', 'Duyệt hiển thị xe thành công!');
        },

        rejectCar: async function (id) {
            const { value: reason, isConfirmed } = await Swal.fire({
                title: 'Từ chối duyệt xe',
                input: 'textarea',
                inputLabel: 'Lý do từ chối (Gửi NCC)',
                inputPlaceholder: 'Nhập lý do ví dụ: Ảnh mờ, thiếu thông tin pháp lý...',
                showCancelButton: true
            });

            if (isConfirmed && reason) {
                return this.updateStatus(TABLES.CARS, id, 'rejected', 'Đã từ chối duyệt xe.', { ghi_chu_admin: reason });
            }
        },

        // 2. NGHIỆP VỤ QUẢN LÝ ĐƠN HÀNG
        cancelOrder: async function (id) {
            const { isConfirmed } = await Swal.fire({
                title: 'Hủy đơn hàng này?',
                text: 'Hành động này sẽ hủy yêu cầu thuê ngay lập tức.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444'
            });

            if (isConfirmed) {
                const now = new Date().toLocaleString('vi-VN');
                return this.updateStatus(TABLES.ORDERS, id, 'cancelled', 'Đã hủy đơn hàng thành công.', {
                    ngayhuy: now + ' (Hủy bởi Admin)'
                });
            }
        },

        // 3. NGHIỆP VỤ QUẢN LÝ NGƯỜI DÙNG
        toggleUserStatus: async function (id, isBanned) {
            const nextStatus = isBanned ? 'active' : 'banned';
            return this.updateStatus(TABLES.USERS, id, nextStatus, 'Đã cập nhật trạng thái tài khoản.');
        },

        // 4. HÀM ĐIỀU HƯỚNG / CHI TIẾT
        editUserAdmin: function(id) {
            Swal.fire({
                title: 'Chi tiết thành viên',
                text: 'Hệ thống quản lý chi tiết thành viên mã #' + id + ' đang được cập nhật.',
                icon: 'info'
            });
        },

        editNccAdmin: function(id) {
            Swal.fire({
                title: 'Chi tiết đối tác',
                text: 'Mã hồ sơ NCC: #' + id + '. Tính năng chỉnh sửa chuyên sâu đang được phát triển.',
                icon: 'info'
            });
        },

        // 5. HÀM CẬP NHẬT CHUNG
        updateStatus: async function (table, id, status, successMsg, extraData = {}) {
            try {
                const payload = { trangthai: status, ...extraData };
                await DVQTKrud.updateRow(table, id, payload);
                Swal.fire({
                    title: 'Thành công',
                    text: successMsg,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                return true;
            } catch (e) {
                Swal.fire('Lỗi hệ thống', e.message, 'error');
                return false;
            }
        },

        // 5. ĐỊNH DẠNG DỮ LIỆU
        formatCurrency: (amount) => {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
        },

        formatDateTime: (str) => {
            if (!str) return '---';
            const d = new Date(str);
            return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
    };
})();
