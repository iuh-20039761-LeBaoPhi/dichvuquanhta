/**
 * File: js/header.js
 * Xử lý logic Header cho dự án Chăm Sóc Vườn
 */

// --- PHẦN BỔ SUNG: KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP KHI TẢI TRANG ---
document.addEventListener("DOMContentLoaded", function() {
    const loginBtn = document.getElementById("loginBtn");
    const loginMenu = document.getElementById("loginMenu");
    
    // Lấy tên người dùng đã lưu từ localStorage
    const currentUser = localStorage.getItem('currentUser');

    if (currentUser && loginBtn && loginMenu) {
        // 1. Đổi chữ "Đăng nhập" thành "Xin chào, [Tên]"
        loginBtn.innerHTML = `👤 Xin chào, ${currentUser}`;
        
        // 2. Cập nhật lại các lựa chọn trong Menu Dropdown sau khi đã đăng nhập
        loginMenu.innerHTML = `
            <a href="thongtin.html">Thông tin cá nhân</a>
            <a href="lichsu.html">Lịch sử đặt lịch</a>
            <a href="#" id="logoutBtn" style="color: #e74c3c; border-top: 1px solid #eee;">Đăng xuất</a>
        `;

        // 3. Xử lý sự kiện Đăng xuất
        document.getElementById("logoutBtn").addEventListener("click", function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');
            window.location.reload(); // Tải lại trang để về trạng thái chưa đăng nhập
        });
    }
});

// --- GIỮ NGUYÊN VÀ CẬP NHẬT LOGIC CLICK CỦA BẠN ---
document.addEventListener("click", function (e) {
    const loginBtn = document.getElementById("loginBtn");
    const loginMenu = document.getElementById("loginMenu");
    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const overlay = document.getElementById("overlay");

    // 1. XỬ LÝ NHẤN NÚT ĐĂNG NHẬP (HOẶC NÚT XIN CHÀO)
    if (e.target.closest("#loginBtn")) {
        e.preventDefault();
        e.stopPropagation();
        if (loginMenu) loginMenu.classList.toggle("active");
        console.log("Menu tài khoản toggle thành công");
    }

    // 2. XỬ LÝ MENU MOBILE
    if (e.target.closest("#menuBtn")) {
        if (mobileMenu && overlay) {
            mobileMenu.classList.add("active");
            overlay.classList.add("active");
        }
    }

    // 3. NHẤN VÀO OVERLAY ĐỂ ĐÓNG MỌI THỨ
    if (e.target.closest("#overlay")) {
        if (mobileMenu) mobileMenu.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
        if (loginMenu) loginMenu.classList.remove("active");
    }

    // 4. CLICK RA NGOÀI VÙNG DROPDOWN ĐỂ TỰ ĐÓNG
    if (loginMenu && !loginMenu.contains(e.target) && !e.target.closest("#loginBtn")) {
        loginMenu.classList.remove("active");
    }
});

// Hiệu ứng co dãn Header khi cuộn trang (Giữ nguyên)
window.addEventListener("scroll", function() {
    const header = document.querySelector(".site-header");
    if (header) {
        if (window.scrollY > 50) {
            header.style.padding = "8px 0";
            header.style.boxShadow = "0 5px 20px rgba(0,0,0,0.1)";
        } else {
            header.style.padding = "14px 0";
            header.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
        }
    }
});