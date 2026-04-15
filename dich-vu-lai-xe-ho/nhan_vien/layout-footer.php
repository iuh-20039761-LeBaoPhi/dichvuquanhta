<?php
// Nếu là AJAX request (từ SPA), không hiển thị layout footer
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    return;
}
?>
            </main>
        </section>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        /**
         * HÀM XỬ LÝ SPA CHO TÀI XẾ
         * Điều hướng nội dung mà không tải lại toàn bộ trang
         */
        async function navigateTo(url, element = null, updateHistory = true, keepShellURL = false) {
            const contentArea = document.getElementById('main-content');
            const pageTitle = document.getElementById('page-title');

            if (!contentArea) return;

            contentArea.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p class="mt-2">Đang tải...</p></div>';

            try {
                if (updateHistory) {
                    window.history.pushState({ url: url }, '', url);
                }

                // Gửi header X-Requested-With để server biết là AJAX
                const response = await fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                
                if (!response.ok) throw new Error('Trang không tồn tại');
                const html = await response.text();

                const range = document.createRange();
                range.selectNode(contentArea);
                const fragment = range.createContextualFragment(html);
                contentArea.innerHTML = '';
                contentArea.appendChild(fragment);

                // Cập nhật giao diện Menu Active
                if (element) {
                    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
                    element.classList.add('active');
                    if (pageTitle) pageTitle.innerText = element.innerText.trim();
                } else {
                    const matchedEl = document.querySelector(`[data-page="${url.split('?')[0]}"]`);
                    if (matchedEl) {
                        document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
                        matchedEl.classList.add('active');
                        if (pageTitle) pageTitle.innerText = matchedEl.innerText.trim();
                    }
                }

                // Gọi sự kiện sau khi tải trang để khởi tạo các component
                document.dispatchEvent(new CustomEvent('page:loaded', { detail: { url: url } }));
            } catch (err) {
                contentArea.innerHTML = `<div class="alert alert-danger m-3">Lỗi tải trang: ${err.message}</div>`;
            }
        }

        // Click menu
        document.querySelectorAll('[data-page]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                navigateTo(page, this, true);
                const sidebar = document.querySelector('.nv-admin-sidebar');
                if (sidebar) sidebar.classList.remove('menu-open');
            });
        });

        // Mobile menu toggle
        document.getElementById('mobileMenuToggle')?.addEventListener('click', function () {
            const sidebar = document.querySelector('.nv-admin-sidebar');
            if (sidebar) sidebar.classList.toggle('menu-open');
        });

        // Xử lý form GET trong main-content (SPA friendly)
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (form.closest('#main-content') && form.method.toLowerCase() === 'get') {
                e.preventDefault();
                const formData = new FormData(form);
                const params = new URLSearchParams(formData).toString();
                const action = form.getAttribute('action') || window.location.pathname.split('/').pop();
                navigateTo(action + (params ? '?' + params : ''));
            }
        });

        // Click link trong main-content (SPA friendly)
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a');
            if (!link || e.defaultPrevented) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript:')) return;

            // Chỉ xử lý link trong main-content
            if (link.closest('#main-content')) {
                e.preventDefault();
                navigateTo(href);
            }
        });

        // Xử lý nút back/forward của trình duyệt
        window.onpopstate = function (event) {
            if (event.state && event.state.url) {
                navigateTo(event.state.url, null, false);
            } else if (window.location.pathname !== '/') {
                // Fallback: reload page khi không có state
                window.location.reload();
            }
        };

        // Khởi tạo khi trang load xong
        document.addEventListener('DOMContentLoaded', function() {
            // Active menu dựa trên URL hiện tại
            const currentPath = window.location.pathname.split('/').pop();
            const activeLink = document.querySelector(`[data-page="${currentPath}"]`);
            if (activeLink) {
                document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
                activeLink.classList.add('active');
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) pageTitle.innerText = activeLink.innerText.trim();
            }
        });
    </script>
</body>
</html>