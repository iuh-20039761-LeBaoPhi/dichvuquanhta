<?php
// Nếu là AJAX request (từ SPA), không hiển thị layout footer
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    return;
}
?>
        </main>
    </div><!-- /.dh-main -->
</div><!-- /.dh-wrap -->

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
    /* ── Sidebar mobile ── */
    function dhOpenSidebar() {
        document.getElementById('dhSidebar').classList.add('open');
        document.getElementById('dhOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function dhCloseSidebar() {
        document.getElementById('dhSidebar').classList.remove('open');
        document.getElementById('dhOverlay').classList.remove('active');
        document.body.style.overflow = '';
    }
    window.addEventListener('resize', function () {
        if (window.innerWidth >= 992) dhCloseSidebar();
    });

    /* ── SPA Navigation (giữ nguyên logic cũ) ── */
    async function navigateTo(url, element = null, updateHistory = true) {
        const contentArea = document.getElementById('main-content');
        const pageTitleEl = document.querySelector('.dh-page-title');

        contentArea.innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--g400);"></div></div>';

        try {
            if (updateHistory) {
                window.history.pushState({ url: url }, '', url);
            }

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

            // Cập nhật menu active
            if (element) {
                document.querySelectorAll('.dh-nav-link').forEach(el => el.classList.remove('active'));
                element.classList.add('active');
                if (pageTitleEl) pageTitleEl.innerHTML =
                    '<i class="bi bi-receipt" style="font-size:.9rem;margin-right:6px;opacity:.65;"></i>' +
                    element.querySelector('span')?.textContent?.trim();
            } else {
                const matchedEl = document.querySelector(`[data-page="${url.split('?')[0]}"]`);
                if (matchedEl) {
                    document.querySelectorAll('.dh-nav-link').forEach(el => el.classList.remove('active'));
                    matchedEl.classList.add('active');
                }
            }
        } catch (err) {
            contentArea.innerHTML = `<div class="alert alert-danger m-3">Lỗi tải trang: ${err.message}</div>`;
        }
    }

    // Click menu
    document.querySelectorAll('[data-page]').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo(this.getAttribute('data-page'), this, true);
            dhCloseSidebar();
        });
    });

    // Xử lý form GET trong main-content
    document.addEventListener('submit', function (e) {
        const form = e.target;
        if (form.closest('#main-content') && form.method.toLowerCase() === 'get') {
            e.preventDefault();
            const params = new URLSearchParams(new FormData(form)).toString();
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
