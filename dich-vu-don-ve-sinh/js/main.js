document.addEventListener("DOMContentLoaded", () => {
    /* ===== LẤY ELEMENT ===== */
    const form = document.getElementById("bookingForm");
    const modal = document.getElementById("successModal");
    const closeBtn = document.querySelector(".close-btn");
    const closeModalBtn = document.getElementById("closeModalBtn");

    const serviceCards = document.querySelectorAll(".service-card");
    const serviceInput = document.getElementById("service");

    if (!form) return;

    /* ===== CHỌN DỊCH VỤ ===== */
    serviceCards.forEach(card => {
        card.addEventListener("click", () => {
            serviceCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            // LẤY ĐÚNG data-value
            serviceInput.value = card.dataset.value;
        });
    });

    /* ===== SUBMIT FORM ===== */
    form.addEventListener("submit", e => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const service = serviceInput.value;

    if (!name || !phone || !service) {
        alert("Vui lòng nhập đầy đủ thông tin và chọn dịch vụ!");
        return;
    }

    if (!validatePhone(phone)) {
        alert("Số điện thoại không hợp lệ!");
        return;
    }

    const formData = new FormData(form);

    fetch("booking_process.php", {
        method: "POST",
        body: formData
    })
    .then(res => res.text())
    .then(data => {
        console.log("PHP response:", data); // debug

        if (data.trim() === "OK") {
            openModal();
form.reset();

// CHỈ reset service nếu có service-card để chọn
if (document.querySelectorAll(".service-card").length > 1) {
    resetService();
}

        } else {
            alert("Lỗi hệ thống: " + data);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Không gửi được yêu cầu!");
    });
});



    /* ===== MODAL ===== */
    function openModal() {
        modal.style.display = "block";
    }

    function closeModal() {
        modal.style.display = "none";
    }

    closeBtn.addEventListener("click", closeModal);
    closeModalBtn.addEventListener("click", closeModal);

    window.addEventListener("click", e => {
        if (e.target === modal) closeModal();
    });

    /* ===== HÀM PHỤ ===== */
    function resetService() {
        serviceCards.forEach(c => c.classList.remove("active"));
        serviceInput.value = "";
    }

    function validatePhone(phone) {
        // Chuẩn VN: 10 số, bắt đầu 0
        const regex = /^0\d{9}$/;
        return regex.test(phone);
    }
});
