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
         * HÀM XỬ LÝ SPA
         */
        async function navigateTo(url, element = null, updateHistory = true, keepShellURL = false) {
            const contentArea = document.getElementById('main-content');
            const pageTitle = document.getElementById('page-title');

            contentArea.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-danger"></div></div>';

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
                    pageTitle.innerText = element.innerText.trim();
                } else {
                    const matchedEl = document.querySelector(`[data-page="${url.split('?')[0]}"]`);
                    if (matchedEl) {
                        document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
                        matchedEl.classList.add('active');
                        pageTitle.innerText = matchedEl.innerText.trim();
                    }
                }
            } catch (err) {
                contentArea.innerHTML = `<div class="alert alert-danger">Lỗi tải trang: ${err.message}</div>`;
            }
        }

        // Click menu
        document.querySelectorAll('[data-page]').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                navigateTo(page, this, true); // Chạy trực tiếp qua page URL
                document.querySelector('.nv-admin-sidebar').classList.remove('menu-open');
            });
        });

        document.getElementById('mobileMenuToggle')?.addEventListener('click', function () {
            document.querySelector('.nv-admin-sidebar').classList.toggle('menu-open');
        });

        // Xử lý form GET trong main-content
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

        // Click link trong main-content
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a');
            if (!link || e.defaultPrevented) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript:')) return;

            if (link.closest('#main-content')) {
                e.preventDefault();
                navigateTo(href);
            }
        });

        window.onpopstate = function (event) {
            if (event.state && event.state.url) {
                navigateTo(event.state.url, null, false);
            }
        };
    </script>
</body>
</html>
