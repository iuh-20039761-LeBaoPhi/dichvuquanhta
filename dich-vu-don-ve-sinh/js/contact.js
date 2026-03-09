document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", e => {
        e.preventDefault();

        const name = document.getElementById("contactName").value.trim();
        const phone = document.getElementById("contactPhone").value.trim();
        const email = document.getElementById("contactEmail").value.trim();
        const message = document.getElementById("contactMessage").value.trim();

        if (!name || !phone || !message) {
            alert("Vui lòng nhập đầy đủ họ tên, số điện thoại và nội dung!");
            return;
        }

        if (!validatePhone(phone)) {
            alert("Số điện thoại không hợp lệ!");
            return;
        }

        if (email && !validateEmail(email)) {
            alert("Email không hợp lệ!");
            return;
        }

        // GIẢ LẬP GỬI THÀNH CÔNG
        alert("🎉 Gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm.");

        form.reset();
    });

    /* ===== VALIDATE ===== */
    function validatePhone(phone) {
        return /^0\d{9}$/.test(phone);
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});
