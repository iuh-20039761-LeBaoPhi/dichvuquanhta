document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const alertDiv = document.getElementById('contactAlert');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';

        // Simulate sending (no backend yet)
        await new Promise(r => setTimeout(r, 800));

        alertDiv.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show">
                <i class="fas fa-check-circle me-2"></i>
                <strong>Gửi thành công!</strong> Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        form.reset();
        btn.disabled = false;
        btn.innerHTML = originalText;

        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
});
