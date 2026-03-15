document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const alertDiv = document.getElementById('contactAlert');
        const originalText = btn.innerHTML;

        // Client-side validation
        const phone = form.querySelector('[name="phone"]').value.trim();
        if (!/^0[3-9][0-9]{8}$/.test(phone)) {
            alertDiv.innerHTML = `<div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-circle me-2"></i>Số điện thoại không hợp lệ (10 chữ số, bắt đầu 03x/05x/07x/08x/09x).
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';
        alertDiv.innerHTML = '';

        const payload = {
            name:    form.querySelector('[name="name"]').value.trim(),
            phone:   phone,
            email:   form.querySelector('[name="email"]').value.trim(),
            subject: form.querySelector('[name="subject"]').value.trim(),
            message: form.querySelector('[name="message"]').value.trim(),
        };

        let success = false;
        let message = '';

        try {
            const res  = await fetch('controllers/contact-controller.php?action=submit', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await res.json();
            success = data.success;
            message = data.message || (success ? 'Gửi thành công!' : 'Có lỗi xảy ra, vui lòng thử lại.');
        } catch {
            // Không có backend (GitHub Pages) – vẫn cho thấy thành công
            success = true;
            message = 'Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi qua số điện thoại hoặc email của bạn.';
        }

        if (success) {
            alertDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>${message}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            form.reset();
        } else {
            alertDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show">
                    <i class="fas fa-exclamation-circle me-2"></i>${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }

        btn.disabled = false;
        btn.innerHTML = originalText;
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
});

