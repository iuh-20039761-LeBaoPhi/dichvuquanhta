/**
 * File: header.js
 * Chức năng: Tự động load header.html và gán sự kiện cho Menu/Login
 */

function initHeaderEvents() {
    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const overlay = document.getElementById("overlay");
    const loginBtn = document.getElementById("loginBtn");
    const loginMenu = document.getElementById("loginMenu");

    // Xử lý Menu Mobile (3 gạch)
    if (menuBtn && mobileMenu && overlay) {
        menuBtn.onclick = function(e) {
            e.stopPropagation();
            const isOpen = mobileMenu.classList.toggle("show");
            overlay.classList.toggle("show");
            menuBtn.classList.toggle("active"); // Biến 3 gạch thành X
            document.body.style.overflow = isOpen ? "hidden" : "";
        };

        overlay.onclick = function() {
            mobileMenu.classList.remove("show");
            overlay.classList.remove("show");
            menuBtn.classList.remove("active");
            document.body.style.overflow = "";
        };
    }

    // Xử lý Dropdown Đăng nhập
    if (loginBtn && loginMenu) {
        loginBtn.onclick = function(e) {
            e.stopPropagation();
            loginMenu.classList.toggle("show");
        };

        // Click ra ngoài thì đóng dropdown
        document.addEventListener("click", function(e) {
            if (!loginMenu.contains(e.target) && e.target !== loginBtn) {
                loginMenu.classList.remove("show");
            }
        });
    }
}

// Hàm tự động nạp HTML
function loadHeaderContent() {
    const placeholder = document.getElementById("header-placeholder");
    if (!placeholder) return;

    // Load file header.html (đảm bảo đường dẫn này đúng từ gốc website)
    fetch('/header.html') 
        .then(response => {
            if (!response.ok) throw new Error("Không thể tải file header.html");
            return response.text();
        })
        .then(html => {
            placeholder.innerHTML = html;
            // Sau khi chèn HTML xong mới chạy sự kiện
            initHeaderEvents();
        })
        .catch(err => console.error("Lỗi Header:", err));
}

// Chạy khi trang sẵn sàng
document.addEventListener("DOMContentLoaded", loadHeaderContent);